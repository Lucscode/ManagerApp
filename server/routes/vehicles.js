const express = require('express');
const { query, run, get } = require('../database/init');
const { authenticateToken, requireEmployee } = require('../middleware/auth');

const router = express.Router();

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);
router.use(requireEmployee);

// Listar todos os veículos
router.get('/', async (req, res) => {
  try {
    const { search, client_id, active } = req.query;
    
    let sql = `
      SELECT v.*, c.name as client_name, c.phone as client_phone 
      FROM vehicles v 
      JOIN clients c ON v.client_id = c.id 
      WHERE 1=1
    `;
    const params = [];
    
    // Filtro por busca
    if (search) {
      sql += ' AND (v.license_plate LIKE ? OR v.model LIKE ? OR v.brand LIKE ? OR c.name LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    // Filtro por cliente
    if (client_id) {
      sql += ' AND v.client_id = ?';
      params.push(client_id);
    }
    
    // Filtro por status ativo
    if (active !== undefined) {
      sql += ' AND v.active = ?';
      params.push(active === 'true' ? 1 : 0);
    }
    
    sql += ' ORDER BY v.created_at DESC';
    
    const vehicles = await query(sql, params);
    
    res.json({
      vehicles,
      total: vehicles.length
    });
  } catch (error) {
    console.error('Erro ao listar veículos:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao listar veículos'
    });
  }
});

// Buscar veículo por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const vehicle = await get(`
      SELECT v.*, c.name as client_name, c.phone as client_phone, c.email as client_email
      FROM vehicles v 
      JOIN clients c ON v.client_id = c.id 
      WHERE v.id = ?
    `, [id]);
    
    if (!vehicle) {
      return res.status(404).json({
        error: 'Veículo não encontrado',
        message: 'Veículo não encontrado'
      });
    }
    
    res.json({ vehicle });
  } catch (error) {
    console.error('Erro ao buscar veículo:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao buscar veículo'
    });
  }
});

// Criar novo veículo
router.post('/', async (req, res) => {
  try {
    const { client_id, license_plate, model, brand, color, year } = req.body;
    
    if (!client_id || !license_plate || !model || !brand || !color) {
      return res.status(400).json({
        error: 'Dados incompletos',
        message: 'Cliente, placa, modelo, marca e cor são obrigatórios'
      });
    }
    
    // Verificar se cliente existe e está ativo
    const client = await get('SELECT id, name FROM clients WHERE id = ? AND active = 1', [client_id]);
    if (!client) {
      return res.status(400).json({
        error: 'Cliente inválido',
        message: 'Cliente não encontrado ou inativo'
      });
    }
    
    // Verificar se já existe veículo com mesma placa
    const existingVehicle = await get('SELECT id FROM vehicles WHERE license_plate = ?', [license_plate]);
    if (existingVehicle) {
      return res.status(400).json({
        error: 'Placa já cadastrada',
        message: 'Já existe um veículo cadastrado com esta placa'
      });
    }
    
    const result = await run(
      'INSERT INTO vehicles (client_id, license_plate, model, brand, color, year) VALUES (?, ?, ?, ?, ?, ?)',
      [client_id, license_plate.toUpperCase(), model, brand, color, year || null]
    );
    
    const newVehicle = await get(`
      SELECT v.*, c.name as client_name 
      FROM vehicles v 
      JOIN clients c ON v.client_id = c.id 
      WHERE v.id = ?
    `, [result.id]);
    
    res.status(201).json({
      message: 'Veículo criado com sucesso',
      vehicle: newVehicle
    });
  } catch (error) {
    console.error('Erro ao criar veículo:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao criar veículo'
    });
  }
});

// Atualizar veículo
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { client_id, license_plate, model, brand, color, year, active } = req.body;
    
    // Verificar se veículo existe
    const existingVehicle = await get('SELECT id FROM vehicles WHERE id = ?', [id]);
    if (!existingVehicle) {
      return res.status(404).json({
        error: 'Veículo não encontrado',
        message: 'Veículo não encontrado'
      });
    }
    
    // Verificar se cliente existe (se foi alterado)
    if (client_id) {
      const client = await get('SELECT id FROM clients WHERE id = ? AND active = 1', [client_id]);
      if (!client) {
        return res.status(400).json({
          error: 'Cliente inválido',
          message: 'Cliente não encontrado ou inativo'
        });
      }
    }
    
    // Verificar se placa já existe (se foi alterada)
    if (license_plate) {
      const plateExists = await get('SELECT id FROM vehicles WHERE license_plate = ? AND id != ?', [license_plate.toUpperCase(), id]);
      if (plateExists) {
        return res.status(400).json({
          error: 'Placa já cadastrada',
          message: 'Já existe outro veículo cadastrado com esta placa'
        });
      }
    }
    
    // Construir query de atualização
    const updates = [];
    const params = [];
    
    if (client_id) {
      updates.push('client_id = ?');
      params.push(client_id);
    }
    if (license_plate) {
      updates.push('license_plate = ?');
      params.push(license_plate.toUpperCase());
    }
    if (model) {
      updates.push('model = ?');
      params.push(model);
    }
    if (brand) {
      updates.push('brand = ?');
      params.push(brand);
    }
    if (color) {
      updates.push('color = ?');
      params.push(color);
    }
    if (year !== undefined) {
      updates.push('year = ?');
      params.push(year);
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
      `UPDATE vehicles SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    
    const updatedVehicle = await get(`
      SELECT v.*, c.name as client_name 
      FROM vehicles v 
      JOIN clients c ON v.client_id = c.id 
      WHERE v.id = ?
    `, [id]);
    
    res.json({
      message: 'Veículo atualizado com sucesso',
      vehicle: updatedVehicle
    });
  } catch (error) {
    console.error('Erro ao atualizar veículo:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao atualizar veículo'
    });
  }
});

// Deletar veículo (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se veículo existe
    const existingVehicle = await get('SELECT id FROM vehicles WHERE id = ?', [id]);
    if (!existingVehicle) {
      return res.status(404).json({
        error: 'Veículo não encontrado',
        message: 'Veículo não encontrado'
      });
    }
    
    // Verificar se veículo tem agendamentos futuros
    const futureSchedules = await get(
      `SELECT COUNT(*) as count FROM schedules s 
       JOIN vehicles v ON s.vehicle_id = v.id 
       WHERE v.id = ? AND s.scheduled_date >= DATE('now') 
       AND s.status IN ('scheduled', 'in_progress')`,
      [id]
    );
    
    if (futureSchedules.count > 0) {
      return res.status(400).json({
        error: 'Veículo com agendamentos futuros',
        message: 'Não é possível excluir veículo que possui agendamentos futuros'
      });
    }
    
    // Soft delete - marcar como inativo
    await run(
      'UPDATE vehicles SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
    
    res.json({
      message: 'Veículo excluído com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir veículo:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao excluir veículo'
    });
  }
});

// Buscar veículos por cliente
router.get('/client/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    
    // Verificar se cliente existe
    const client = await get('SELECT * FROM clients WHERE id = ?', [clientId]);
    if (!client) {
      return res.status(404).json({
        error: 'Cliente não encontrado',
        message: 'Cliente não encontrado'
      });
    }
    
    const vehicles = await query(
      'SELECT * FROM vehicles WHERE client_id = ? ORDER BY created_at DESC',
      [clientId]
    );
    
    res.json({
      client,
      vehicles
    });
  } catch (error) {
    console.error('Erro ao buscar veículos do cliente:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao buscar veículos do cliente'
    });
  }
});

module.exports = router;

