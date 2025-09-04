const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { get, query, run } = require('../database/init');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'manager-app-secret-key';

function generatePortalToken(customerId) {
  return jwt.sign({ customerId, aud: 'portal' }, JWT_SECRET, { expiresIn: '24h' });
}

async function authenticatePortal(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token ausente' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.aud !== 'portal') throw new Error('aud inválida');
    const account = await get(
      'SELECT ca.id, ca.client_id, c.name, c.email, c.phone FROM customer_accounts ca JOIN clients c ON c.id = ca.client_id WHERE ca.id = ?',
      [decoded.customerId]
    );
    if (!account) return res.status(401).json({ error: 'Conta inválida' });
    req.customer = account;
    next();
  } catch (e) {
    return res.status(403).json({ error: 'Token inválido' });
  }
}

// Registro
router.post('/auth/register', async (req, res) => {
  try {
    const { name, phone, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Dados obrigatórios ausentes' });
    }

    // Cria client se não existir
    const existingClient = await get('SELECT id FROM clients WHERE email = ?', [email]);
    let clientId = existingClient?.id;
    if (!clientId) {
      const clientRes = await run('INSERT INTO clients (name, email, phone, active) VALUES (?, ?, ?, 1)', [name, email, phone || null]);
      clientId = clientRes.id;
    }

    // Cria conta do portal
    const hash = bcrypt.hashSync(password, 10);
    await run('INSERT INTO customer_accounts (client_id, email, password, active) VALUES (?, ?, ?, 1)', [clientId, email, hash]);

    return res.json({ message: 'Conta criada com sucesso' });
  } catch (error) {
    if (String(error.message || '').includes('UNIQUE')) {
      return res.status(409).json({ error: 'Email já cadastrado' });
    }
    console.error('Erro register portal:', error);
    return res.status(500).json({ error: 'Erro ao registrar' });
  }
});

// Login
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios' });

    const account = await get('SELECT * FROM customer_accounts WHERE email = ? AND active = 1', [email]);
    if (!account) return res.status(401).json({ error: 'Credenciais inválidas' });

    const valid = await bcrypt.compare(password, account.password);
    if (!valid) return res.status(401).json({ error: 'Credenciais inválidas' });

    const token = generatePortalToken(account.id);
    return res.json({ token });
  } catch (error) {
    console.error('Erro login portal:', error);
    return res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

// Me
router.get('/me', authenticatePortal, async (req, res) => {
  return res.json({ customer: req.customer });
});

// Histórico de serviços do cliente logado
router.get('/history', authenticatePortal, async (req, res) => {
  try {
    const rows = await query(`
      SELECT sc.id, sc.scheduled_date, sc.scheduled_time, sc.status,
             s.name AS service_name, s.price,
             v.license_plate, v.brand, v.model
      FROM schedules sc
      JOIN services s ON s.id = sc.service_id
      JOIN vehicles v ON v.id = sc.vehicle_id
      WHERE sc.client_id = ?
      ORDER BY sc.scheduled_date DESC, sc.scheduled_time DESC
    `, [req.customer.client_id]);

    res.json({ history: rows });
  } catch (error) {
    console.error('Erro history portal:', error);
    res.status(500).json({ error: 'Erro ao obter histórico' });
  }
});

// Reagendamento (esqueleto com validações mínimas)
router.post('/reschedule/:scheduleId', authenticatePortal, async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { new_date, new_time } = req.body;
    if (!new_date || !new_time) return res.status(400).json({ error: 'Nova data e hora são obrigatórias' });

    // Verifica se o agendamento pertence ao cliente
    const sched = await get('SELECT id, client_id, status FROM schedules WHERE id = ?', [scheduleId]);
    if (!sched || sched.client_id !== req.customer.client_id) return res.status(404).json({ error: 'Agendamento não encontrado' });
    if (sched.status !== 'scheduled') return res.status(400).json({ error: 'Somente agendamentos em status Agendado podem ser alterados' });

    // Regras simples (pode-se adicionar verificação de conflito)
    await run('UPDATE schedules SET scheduled_date = ?, scheduled_time = ? WHERE id = ?', [new_date, new_time, scheduleId]);

    res.json({ message: 'Agendamento reagendado com sucesso' });
  } catch (error) {
    console.error('Erro reschedule portal:', error);
    res.status(500).json({ error: 'Erro ao reagendar' });
  }
});

module.exports = router;
