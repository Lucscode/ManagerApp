const express = require('express');
const bcrypt = require('bcryptjs');
const { query, run, get } = require('../database/init');
const { authenticateToken, requireAdmin, generateToken } = require('../middleware/auth');

const router = express.Router();

// Rota de login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Dados incompletos',
        message: 'Email e senha são obrigatórios'
      });
    }

    // Buscar usuário pelo email
    const user = await get(
      'SELECT id, name, email, password, role, active FROM users WHERE email = ?',
      [email]
    );

    if (!user || !user.active) {
      return res.status(401).json({
        error: 'Credenciais inválidas',
        message: 'Email ou senha incorretos'
      });
    }

    // Verificar senha
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Credenciais inválidas',
        message: 'Email ou senha incorretos'
      });
    }

    // Gerar token JWT
    const token = generateToken(user.id);

    // Retornar dados do usuário (sem senha) e token
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      message: 'Login realizado com sucesso',
      user: userWithoutPassword,
      token
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao processar login'
    });
  }
});

// Rota para obter dados do usuário logado
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const { password: _, ...userWithoutPassword } = req.user;
    res.json({
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao buscar dados do usuário'
    });
  }
});

// Rota para listar usuários (apenas admin)
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await query(
      'SELECT id, name, email, role, active, created_at, updated_at FROM users ORDER BY name'
    );
    
    res.json({
      users
    });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao listar usuários'
    });
  }
});

// Rota para criar usuário (apenas admin)
router.post('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        error: 'Dados incompletos',
        message: 'Nome, email, senha e função são obrigatórios'
      });
    }

    if (!['admin', 'employee'].includes(role)) {
      return res.status(400).json({
        error: 'Função inválida',
        message: 'Função deve ser "admin" ou "employee"'
      });
    }

    // Verificar se email já existe
    const existingUser = await get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({
        error: 'Email já cadastrado',
        message: 'Este email já está sendo usado por outro usuário'
      });
    }

    // Criptografar senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Inserir usuário
    const result = await run(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, role]
    );

    // Buscar usuário criado
    const newUser = await get(
      'SELECT id, name, email, role, active, created_at FROM users WHERE id = ?',
      [result.id]
    );

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      user: newUser
    });

  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao criar usuário'
    });
  }
});

// Rota para atualizar usuário (apenas admin)
router.put('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, active } = req.body;

    // Verificar se usuário existe
    const existingUser = await get('SELECT id FROM users WHERE id = ?', [id]);
    if (!existingUser) {
      return res.status(404).json({
        error: 'Usuário não encontrado',
        message: 'Usuário não encontrado'
      });
    }

    // Verificar se email já existe (se foi alterado)
    if (email) {
      const emailExists = await get('SELECT id FROM users WHERE email = ? AND id != ?', [email, id]);
      if (emailExists) {
        return res.status(400).json({
          error: 'Email já cadastrado',
          message: 'Este email já está sendo usado por outro usuário'
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
    if (email) {
      updates.push('email = ?');
      params.push(email);
    }
    if (role && ['admin', 'employee'].includes(role)) {
      updates.push('role = ?');
      params.push(role);
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
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Buscar usuário atualizado
    const updatedUser = await get(
      'SELECT id, name, email, role, active, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );

    res.json({
      message: 'Usuário atualizado com sucesso',
      user: updatedUser
    });

  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao atualizar usuário'
    });
  }
});

// Rota para alterar senha
router.put('/users/:id/password', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        error: 'Senha inválida',
        message: 'Senha deve ter pelo menos 6 caracteres'
      });
    }

    // Verificar se usuário existe
    const existingUser = await get('SELECT id FROM users WHERE id = ?', [id]);
    if (!existingUser) {
      return res.status(404).json({
        error: 'Usuário não encontrado',
        message: 'Usuário não encontrado'
      });
    }

    // Criptografar nova senha
    const hashedPassword = await bcrypt.hash(password, 10);

    await run(
      'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedPassword, id]
    );

    res.json({
      message: 'Senha alterada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao alterar senha'
    });
  }
});

module.exports = router;

