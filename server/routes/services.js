const express = require('express');
const { query, run, get } = require('../database/init');
const { authenticateToken, requireEmployee } = require('../middleware/auth');

const router = express.Router();

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);
router.use(requireEmployee);

// ===== ROTAS PARA TIPOS DE VEÍCULO =====

// Listar tipos de veículo
router.get('/vehicle-types', async (req, res) => {
  try {
    const vehicleTypes = await query('SELECT * FROM vehicle_types ORDER BY name');
    res.json({ vehicleTypes });
  } catch (error) {
    console.error('Erro ao listar tipos de veículo:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao listar tipos de veículo'
    });
  }
});

// Criar tipo de veículo
router.post('/vehicle-types', async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({
        error: 'Nome obrigatório',
        message: 'Nome do tipo de veículo é obrigatório'
      });
    }
    
    // Verificar se já existe tipo com mesmo nome
    const existingType = await get('SELECT id FROM vehicle_types WHERE name = ?', [name]);
    if (existingType) {
      return res.status(400).json({
        error: 'Nome já cadastrado',
        message: 'Já existe um tipo de veículo com este nome'
      });
    }
    
    const result = await run(
      'INSERT INTO vehicle_types (name, description) VALUES (?, ?)',
      [name, description || null]
    );
    
    const newType = await get('SELECT * FROM vehicle_types WHERE id = ?', [result.id]);
    
    res.status(201).json({
      message: 'Tipo de veículo criado com sucesso',
      vehicleType: newType
    });
  } catch (error) {
    console.error('Erro ao criar tipo de veículo:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao criar tipo de veículo'
    });
  }
});

// Atualizar tipo de veículo
router.put('/vehicle-types/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, active } = req.body;
    
    // Verificar se tipo existe
    const existingType = await get('SELECT id FROM vehicle_types WHERE id = ?', [id]);
    if (!existingType) {
      return res.status(404).json({
        error: 'Tipo de veículo não encontrado',
        message: 'Tipo de veículo não encontrado'
      });
    }
    
    // Verificar se nome já existe (se foi alterado)
    if (name) {
      const nameExists = await get('SELECT id FROM vehicle_types WHERE name = ? AND id != ?', [name, id]);
      if (nameExists) {
        return res.status(400).json({
          error: 'Nome já cadastrado',
          message: 'Já existe outro tipo de veículo com este nome'
        });
      }
    }
    
    // Construir query de atualização
    const updates = [];
    const params = [];
    
    if (name) {
      updates.push('name = ?');
      params.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (typeof active === 'boolean') {
      updates.push('active = ?');
      params.push(active ? 1 : 0);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        error: 'Dados inválidos',
        message: 'Nenhum dado válido para atualização'
      });
    }
    
    params.push(id);
    
    await run(
      `UPDATE vehicle_types SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    
    const updatedType = await get('SELECT * FROM vehicle_types WHERE id = ?', [id]);
    
    res.json({
      message: 'Tipo de veículo atualizado com sucesso',
      vehicleType: updatedType
    });
  } catch (error) {
    console.error('Erro ao atualizar tipo de veículo:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao atualizar tipo de veículo'
    });
  }
});

// ===== ROTAS PARA SERVIÇOS =====

// Listar todos os serviços
router.get('/', async (req, res) => {
  try {
    const { vehicle_type_id, active } = req.query;
    
    let sql = `
      SELECT s.*, vt.name as vehicle_type_name 
      FROM services s 
      JOIN vehicle_types vt ON s.vehicle_type_id = vt.id 
      WHERE 1=1
    `;
    const params = [];
    
    // Filtro por tipo de veículo
    if (vehicle_type_id) {
      sql += ' AND s.vehicle_type_id = ?';
      params.push(vehicle_type_id);
    }
    
    // Filtro por status ativo
    if (active !== undefined) {
      sql += ' AND s.active = ?';
      params.push(active === 'true' ? 1 : 0);
    }
    
    sql += ' ORDER BY vt.name, s.name, s.price';
    
    const services = await query(sql, params);
    
    res.json({
      services,
      total: services.length
    });
  } catch (error) {
    console.error('Erro ao listar serviços:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao listar serviços'
    });
  }
});

// Buscar serviço por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const service = await get(`
      SELECT s.*, vt.name as vehicle_type_name 
      FROM services s 
      JOIN vehicle_types vt ON s.vehicle_type_id = vt.id 
      WHERE s.id = ?
    `, [id]);
    
    if (!service) {
      return res.status(404).json({
        error: 'Serviço não encontrado',
        message: 'Serviço não encontrado'
      });
    }
    
    res.json({ service });
  } catch (error) {
    console.error('Erro ao buscar serviço:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao buscar serviço'
    });
  }
});

// Criar novo serviço
router.post('/', async (req, res) => {
  try {
    const { name, description, vehicle_type_id, price, duration_minutes } = req.body;
    
    if (!name || !vehicle_type_id || !price) {
      return res.status(400).json({
        error: 'Dados incompletos',
        message: 'Nome, tipo de veículo e preço são obrigatórios'
      });
    }
    
    if (price <= 0) {
      return res.status(400).json({
        error: 'Preço inválido',
        message: 'Preço deve ser maior que zero'
      });
    }
    
    // Verificar se tipo de veículo existe
    const vehicleType = await get('SELECT id FROM vehicle_types WHERE id = ? AND active = 1', [vehicle_type_id]);
    if (!vehicleType) {
      return res.status(400).json({
        error: 'Tipo de veículo inválido',
        message: 'Tipo de veículo não encontrado ou inativo'
      });
    }
    
    // Verificar se já existe serviço com mesmo nome para o mesmo tipo de veículo
    const existingService = await get(
      'SELECT id FROM services WHERE name = ? AND vehicle_type_id = ?',
      [name, vehicle_type_id]
    );
    if (existingService) {
      return res.status(400).json({
        error: 'Serviço já cadastrado',
        message: 'Já existe um serviço com este nome para este tipo de veículo'
      });
    }
    
    const result = await run(
      'INSERT INTO services (name, description, vehicle_type_id, price, duration_minutes) VALUES (?, ?, ?, ?, ?)',
      [name, description || null, vehicle_type_id, price, duration_minutes || 30]
    );
    
    const newService = await get(`
      SELECT s.*, vt.name as vehicle_type_name 
      FROM services s 
      JOIN vehicle_types vt ON s.vehicle_type_id = vt.id 
      WHERE s.id = ?
    `, [result.id]);
    
    res.status(201).json({
      message: 'Serviço criado com sucesso',
      service: newService
    });
  } catch (error) {
    console.error('Erro ao criar serviço:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao criar serviço'
    });
  }
});

// Atualizar serviço
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, vehicle_type_id, price, duration_minutes, active } = req.body;
    
    // Verificar se serviço existe
    const existingService = await get('SELECT id FROM services WHERE id = ?', [id]);
    if (!existingService) {
      return res.status(404).json({
        error: 'Serviço não encontrado',
        message: 'Serviço não encontrado'
      });
    }
    
    // Verificar se tipo de veículo existe (se foi alterado)
    if (vehicle_type_id) {
      const vehicleType = await get('SELECT id FROM vehicle_types WHERE id = ? AND active = 1', [vehicle_type_id]);
      if (!vehicleType) {
        return res.status(400).json({
          error: 'Tipo de veículo inválido',
          message: 'Tipo de veículo não encontrado ou inativo'
        });
      }
    }
    
    // Verificar se já existe serviço com mesmo nome para o mesmo tipo de veículo (se foi alterado)
    if (name && vehicle_type_id) {
      const serviceExists = await get(
        'SELECT id FROM services WHERE name = ? AND vehicle_type_id = ? AND id != ?',
        [name, vehicle_type_id, id]
      );
      if (serviceExists) {
        return res.status(400).json({
          error: 'Serviço já cadastrado',
          message: 'Já existe outro serviço com este nome para este tipo de veículo'
        });
      }
    }
    
    // Construir query de atualização
    const updates = [];
    const params = [];
    
    if (name) {
      updates.push('name = ?');
      params.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (vehicle_type_id) {
      updates.push('vehicle_type_id = ?');
      params.push(vehicle_type_id);
    }
    if (price !== undefined) {
      if (price <= 0) {
        return res.status(400).json({
          error: 'Preço inválido',
          message: 'Preço deve ser maior que zero'
        });
      }
      updates.push('price = ?');
      params.push(price);
    }
    if (duration_minutes !== undefined) {
      updates.push('duration_minutes = ?');
      params.push(duration_minutes);
    }
    if (typeof active === 'boolean') {
      updates.push('active = ?');
      params.push(active ? 1 : 0);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        error: 'Dados inválidos',
        message: 'Nenhum dado válido para atualização'
      });
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);
    
    await run(
      `UPDATE services SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    
    const updatedService = await get(`
      SELECT s.*, vt.name as vehicle_type_name 
      FROM services s 
      JOIN vehicle_types vt ON s.vehicle_type_id = vt.id 
      WHERE s.id = ?
    `, [id]);
    
    res.json({
      message: 'Serviço atualizado com sucesso',
      service: updatedService
    });
  } catch (error) {
    console.error('Erro ao atualizar serviço:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao atualizar serviço'
    });
  }
});

// Deletar serviço (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se serviço existe
    const existingService = await get('SELECT id FROM services WHERE id = ?', [id]);
    if (!existingService) {
      return res.status(404).json({
        error: 'Serviço não encontrado',
        message: 'Serviço não encontrado'
      });
    }
    
    // Verificar se serviço tem agendamentos FUTUROS (considerando horário local)
    const futureSchedules = await get(
      `SELECT COUNT(*) as count FROM schedules s 
       WHERE s.service_id = ? 
         AND DATE(s.scheduled_date, 'localtime') >= DATE('now','localtime')
         AND s.status IN ('scheduled', 'in_progress')`,
      [id]
    );
    
    if (futureSchedules.count > 0) {
      return res.status(400).json({
        error: 'Serviço com agendamentos futuros',
        message: 'Não é possível excluir serviço que possui agendamentos futuros ativos'
      });
    }
    
    // Soft delete - marcar como inativo
    await run(
      'UPDATE services SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
    
    res.json({
      message: 'Serviço excluído com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir serviço:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao excluir serviço'
    });
  }
});

// Buscar serviços por tipo de veículo
router.get('/vehicle-type/:vehicleTypeId', async (req, res) => {
  try {
    const { vehicleTypeId } = req.params;
    
    // Verificar se tipo de veículo existe
    const vehicleType = await get('SELECT * FROM vehicle_types WHERE id = ?', [vehicleTypeId]);
    if (!vehicleType) {
      return res.status(404).json({
        error: 'Tipo de veículo não encontrado',
        message: 'Tipo de veículo não encontrado'
      });
    }
    
    const services = await query(
      'SELECT * FROM services WHERE vehicle_type_id = ? AND active = 1 ORDER BY name, price',
      [vehicleTypeId]
    );
    
    res.json({
      vehicleType,
      services
    });
  } catch (error) {
    console.error('Erro ao buscar serviços por tipo de veículo:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao buscar serviços por tipo de veículo'
    });
  }
});

module.exports = router;

