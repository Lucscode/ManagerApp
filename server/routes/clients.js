const express = require('express');
const { query, run, get } = require('../database/init');
const { authenticateToken, requireEmployee } = require('../middleware/auth');

const router = express.Router();

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);
router.use(requireEmployee);

// Listar todos os clientes
router.get('/', async (req, res) => {
  try {
    const { search, active } = req.query;
    
    let sql = 'SELECT * FROM clients WHERE 1=1';
    const params = [];
    
    // Filtro por busca
    if (search) {
      sql += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    // Filtro por status ativo
    if (active !== undefined) {
      sql += ' AND active = ?';
      params.push(active === 'true' ? 1 : 0);
    }
    
    sql += ' ORDER BY name';
    
    const clients = await query(sql, params);
    
    res.json({
      clients,
      total: clients.length
    });
  } catch (error) {
    console.error('Erro ao listar clientes:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao listar clientes'
    });
  }
});

// Buscar cliente por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const client = await get('SELECT * FROM clients WHERE id = ?', [id]);
    
    if (!client) {
      return res.status(404).json({
        error: 'Cliente não encontrado',
        message: 'Cliente não encontrado'
      });
    }
    
    res.json({ client });
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao buscar cliente'
    });
  }
});

// Criar novo cliente
router.post('/', async (req, res) => {
  try {
    const { name, phone, email, notes } = req.body;
    
    if (!name) {
      return res.status(400).json({
        error: 'Nome obrigatório',
        message: 'Nome do cliente é obrigatório'
      });
    }
    
    // Verificar se já existe cliente com mesmo email (se fornecido)
    if (email) {
      const existingClient = await get('SELECT id FROM clients WHERE email = ?', [email]);
      if (existingClient) {
        return res.status(400).json({
          error: 'Email já cadastrado',
          message: 'Já existe um cliente cadastrado com este email'
        });
      }
    }
    
    const result = await run(
      'INSERT INTO clients (name, phone, email, notes) VALUES (?, ?, ?, ?)',
      [name, phone || null, email || null, notes || null]
    );
    
    const newClient = await get('SELECT * FROM clients WHERE id = ?', [result.id]);
    
    res.status(201).json({
      message: 'Cliente criado com sucesso',
      client: newClient
    });
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao criar cliente'
    });
  }
});

// Atualizar cliente
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, notes, active } = req.body;
    
    // Verificar se cliente existe
    const existingClient = await get('SELECT id FROM clients WHERE id = ?', [id]);
    if (!existingClient) {
      return res.status(404).json({
        error: 'Cliente não encontrado',
        message: 'Cliente não encontrado'
      });
    }
    
    // Verificar se email já existe (se foi alterado)
    if (email) {
      const emailExists = await get('SELECT id FROM clients WHERE email = ? AND id != ?', [email, id]);
      if (emailExists) {
        return res.status(400).json({
          error: 'Email já cadastrado',
          message: 'Já existe outro cliente cadastrado com este email'
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
    if (phone !== undefined) {
      updates.push('phone = ?');
      params.push(phone);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      params.push(email);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
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
      `UPDATE clients SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    
    const updatedClient = await get('SELECT * FROM clients WHERE id = ?', [id]);
    
    res.json({
      message: 'Cliente atualizado com sucesso',
      client: updatedClient
    });
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao atualizar cliente'
    });
  }
});

// Deletar cliente (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se cliente existe
    const existingClient = await get('SELECT id FROM clients WHERE id = ?', [id]);
    if (!existingClient) {
      return res.status(404).json({
        error: 'Cliente não encontrado',
        message: 'Cliente não encontrado'
      });
    }
    
    // Verificar se cliente tem veículos ativos
    const activeVehicles = await get(
      'SELECT COUNT(*) as count FROM vehicles WHERE client_id = ? AND active = 1',
      [id]
    );
    
    if (activeVehicles.count > 0) {
      return res.status(400).json({
        error: 'Cliente com veículos ativos',
        message: 'Não é possível excluir cliente que possui veículos ativos'
      });
    }
    
    // Verificar se cliente tem agendamentos futuros
    const futureSchedules = await get(
      `SELECT COUNT(*) as count FROM schedules s 
       JOIN clients c ON s.client_id = c.id 
       WHERE c.id = ? AND s.scheduled_date >= DATE('now') 
       AND s.status IN ('scheduled', 'in_progress')`,
      [id]
    );
    
    if (futureSchedules.count > 0) {
      return res.status(400).json({
        error: 'Cliente com agendamentos futuros',
        message: 'Não é possível excluir cliente que possui agendamentos futuros'
      });
    }
    
    // Soft delete - marcar como inativo
    await run(
      'UPDATE clients SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
    
    res.json({
      message: 'Cliente excluído com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir cliente:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao excluir cliente'
    });
  }
});

// Buscar clientes com veículos
router.get('/:id/vehicles', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se cliente existe
    const client = await get('SELECT * FROM clients WHERE id = ?', [id]);
    if (!client) {
      return res.status(404).json({
        error: 'Cliente não encontrado',
        message: 'Cliente não encontrado'
      });
    }
    
    const vehicles = await query(
      'SELECT * FROM vehicles WHERE client_id = ? ORDER BY created_at DESC',
      [id]
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

