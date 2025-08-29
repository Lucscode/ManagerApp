const jwt = require('jsonwebtoken');
const { get } = require('../database/init');

const JWT_SECRET = process.env.JWT_SECRET || 'manager-app-secret-key';

// Middleware para verificar token JWT
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      error: 'Token de acesso não fornecido',
      message: 'É necessário fazer login para acessar este recurso'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Buscar usuário no banco para verificar se ainda está ativo
    const user = await get('SELECT id, name, email, role, active FROM users WHERE id = ?', [decoded.userId]);
    
    if (!user || !user.active) {
      return res.status(401).json({ 
        error: 'Usuário inválido',
        message: 'Usuário não encontrado ou inativo'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expirado',
        message: 'Sua sessão expirou. Faça login novamente.'
      });
    }
    
    return res.status(403).json({ 
      error: 'Token inválido',
      message: 'Token de acesso inválido'
    });
  }
};

// Middleware para verificar se o usuário é administrador
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Acesso negado',
      message: 'Apenas administradores podem acessar este recurso'
    });
  }
  next();
};

// Middleware para verificar se o usuário é administrador ou funcionário
const requireEmployee = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'employee') {
    return res.status(403).json({ 
      error: 'Acesso negado',
      message: 'Apenas funcionários podem acessar este recurso'
    });
  }
  next();
};

// Função para gerar token JWT
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '24h' });
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireEmployee,
  generateToken
};

