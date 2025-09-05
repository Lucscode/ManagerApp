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

// ===== Auth =====
router.post('/auth/register', async (req, res) => {
  try {
    const { name, phone, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Dados obrigatórios ausentes' });
    }

    const existingClient = await get('SELECT id FROM clients WHERE email = ?', [email]);
    let clientId = existingClient?.id;
    if (!clientId) {
      const clientRes = await run('INSERT INTO clients (name, email, phone, active) VALUES (?, ?, ?, 1)', [name, email, phone || null]);
      clientId = clientRes.id;
    }

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

// ===== Perfil =====
router.get('/me', authenticatePortal, async (req, res) => {
  return res.json({ customer: req.customer });
});

// ===== Veículos do cliente =====
router.get('/vehicles', authenticatePortal, async (req, res) => {
  try {
    const vehicles = await query(
      'SELECT * FROM vehicles WHERE client_id = ? AND active = 1 ORDER BY license_plate',
      [req.customer.client_id]
    );
    res.json({ vehicles });
  } catch (error) {
    console.error('Erro portal vehicles:', error);
    res.status(500).json({ error: 'Erro ao listar veículos' });
  }
});

router.post('/vehicles', authenticatePortal, async (req, res) => {
  try {
    const { license_plate, model, brand, color, year, type_text, size } = req.body;
    if (!license_plate || !model || !brand || !color) {
      return res.status(400).json({ error: 'Dados do veículo incompletos' });
    }
    if (size && !['Pequeno','Médio','Grande'].includes(size)) {
      return res.status(400).json({ error: 'Tamanho inválido' });
    }
    const result = await run(
      'INSERT INTO vehicles (client_id, license_plate, model, brand, color, year, type_text, size, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)',
      [req.customer.client_id, license_plate.trim().toUpperCase(), model, brand, color, year || null, type_text || null, size || null]
    );
    const vehicle = await get('SELECT * FROM vehicles WHERE id = ?', [result.id]);
    res.status(201).json({ vehicle });
  } catch (error) {
    console.error('Erro portal create vehicle:', error);
    res.status(500).json({ error: 'Erro ao cadastrar veículo' });
  }
});

// ===== Serviços =====
router.get('/services', authenticatePortal, async (req, res) => {
  try {
    const { vehicle_id, size } = req.query;
    let targetSize = size;

    if (vehicle_id) {
      const v = await get('SELECT size FROM vehicles WHERE id = ? AND client_id = ?', [vehicle_id, req.customer.client_id]);
      if (v && v.size) targetSize = v.size;
    }

    if (targetSize && !['Pequeno','Médio','Grande'].includes(targetSize)) {
      return res.status(400).json({ error: 'Tamanho inválido' });
    }

    let rows;
    if (targetSize) {
      // Filtra serviços pelo tipo de veículo correspondente ao tamanho
      rows = await query(`
        SELECT s.id, s.name, s.price, s.vehicle_type_id
        FROM services s
        JOIN vehicle_types vt ON vt.id = s.vehicle_type_id
        WHERE s.active = 1 AND vt.name = ?
        ORDER BY s.name
      `, [targetSize]);
    } else {
      rows = await query('SELECT id, name, price, vehicle_type_id FROM services WHERE active = 1 ORDER BY name');
    }

    res.json({ services: rows });
  } catch (error) {
    console.error('Erro portal services:', error);
    res.status(500).json({ error: 'Erro ao listar serviços' });
  }
});

// ===== Histórico =====
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

// ===== Novo agendamento =====
router.post('/schedule', authenticatePortal, async (req, res) => {
  try {
    const { vehicle_id, service_id, date, time, notes, payment_method } = req.body;
    if (!vehicle_id || !service_id || !date || !time) {
      return res.status(400).json({ error: 'Dados do agendamento incompletos' });
    }

    // Verifica vínculo do veículo com o cliente
    const vehicle = await get('SELECT id FROM vehicles WHERE id = ? AND client_id = ? AND active = 1', [vehicle_id, req.customer.client_id]);
    if (!vehicle) return res.status(400).json({ error: 'Veículo inválido' });

    // Verifica serviço ativo
    const service = await get('SELECT id, duration_minutes, price FROM services WHERE id = ? AND active = 1', [service_id]);
    if (!service) return res.status(400).json({ error: 'Serviço inválido' });

    // Valida data futura
    const now = new Date();
    const target = new Date(`${date}T${time}:00`);
    if (!(target instanceof Date) || isNaN(target.getTime()) || target < now) {
      return res.status(400).json({ error: 'Data/hora inválidas' });
    }

    // Verifica disponibilidade (respeita max_concurrent_appointments)
    const settings = await get("SELECT value FROM settings WHERE key = 'max_concurrent_appointments'");
    const capacity = Number(settings?.value || 3);
    const countRow = await get(
      `SELECT COUNT(*) as cnt FROM schedules 
       WHERE scheduled_date = ? AND scheduled_time = ? 
       AND status IN ('scheduled','in_progress')`,
      [date, time]
    );
    if (Number(countRow.cnt) >= capacity) {
      return res.status(409).json({ error: 'Horário indisponível' });
    }

    // Pagamento: registra intenção
    let payStatus = null;
    let payMethod = null;
    if (payment_method) {
      const allowed = ['pix','cartao','dinheiro'];
      const m = String(payment_method).toLowerCase();
      if (!allowed.includes(m)) return res.status(400).json({ error: 'Método de pagamento inválido' });
      payMethod = m;
      payStatus = m === 'dinheiro' ? 'unpaid' : 'pending';
    }

    const result = await run(
      'INSERT INTO schedules (client_id, vehicle_id, service_id, scheduled_date, scheduled_time, status, notes, created_by, payment_status, payment_method) VALUES (?, ?, ?, ?, ?, "scheduled", ?, ?, ?, ?)',
      [req.customer.client_id, vehicle_id, service_id, date, time, notes || null, req.customer.client_id, payStatus, payMethod]
    );

    res.status(201).json({ message: 'Agendamento criado com sucesso', id: result.id });
  } catch (error) {
    console.error('Erro portal schedule:', error);
    res.status(500).json({ error: 'Erro ao criar agendamento' });
  }
});

// ===== Reagendamento =====
router.post('/reschedule/:scheduleId', authenticatePortal, async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { new_date, new_time } = req.body;
    if (!new_date || !new_time) return res.status(400).json({ error: 'Nova data e hora são obrigatórias' });

    const sched = await get('SELECT id, client_id, status FROM schedules WHERE id = ?', [scheduleId]);
    if (!sched || sched.client_id !== req.customer.client_id) return res.status(404).json({ error: 'Agendamento não encontrado' });
    if (sched.status !== 'scheduled') return res.status(400).json({ error: 'Somente agendamentos em status Agendado podem ser alterados' });

    const settings = await get("SELECT value FROM settings WHERE key = 'max_concurrent_appointments'");
    const capacity = Number(settings?.value || 3);
    const countRow = await get(
      `SELECT COUNT(*) as cnt FROM schedules 
       WHERE scheduled_date = ? AND scheduled_time = ? 
       AND status IN ('scheduled','in_progress') AND id != ?`,
      [new_date, new_time, scheduleId]
    );
    if (Number(countRow.cnt) >= capacity) {
      return res.status(409).json({ error: 'Horário indisponível' });
    }

    await run('UPDATE schedules SET scheduled_date = ?, scheduled_time = ? WHERE id = ?', [new_date, new_time, scheduleId]);
    res.json({ message: 'Agendamento reagendado com sucesso' });
  } catch (error) {
    console.error('Erro reschedule portal:', error);
    res.status(500).json({ error: 'Erro ao reagendar' });
  }
});

// ===== Horários sugeridos =====
router.get('/suggested-slots', authenticatePortal, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().slice(0,10);

    // Configurações
    const startRow = await get("SELECT value FROM settings WHERE key = 'business_hours_start'");
    const endRow = await get("SELECT value FROM settings WHERE key = 'business_hours_end'");
    const intervalRow = await get("SELECT value FROM settings WHERE key = 'appointment_interval'");
    const capacityRow = await get("SELECT value FROM settings WHERE key = 'max_concurrent_appointments'");

    const start = (startRow?.value || '08:00');
    const end = (endRow?.value || '18:00');
    const interval = Number(intervalRow?.value || 30);
    const capacity = Number(capacityRow?.value || 3);

    // Gera slots
    const toMinutes = t => {
      const [hh, mm] = t.split(':').map(Number);
      return hh * 60 + mm;
    };
    const pad2 = n => String(n).padStart(2, '0');
    const toTime = m => `${pad2(Math.floor(m/60))}:${pad2(m%60)}`;

    const slots = [];
    for (let m = toMinutes(start); m < toMinutes(end); m += interval) {
      slots.push(toTime(m));
    }

    // Filtra por capacidade atual
    const available = [];
    for (const time of slots) {
      const row = await get(
        `SELECT COUNT(*) AS cnt FROM schedules 
         WHERE scheduled_date = ? AND scheduled_time = ? 
         AND status IN ('scheduled','in_progress')`,
        [targetDate, time]
      );
      if (Number(row.cnt) < capacity) available.push(time);
    }

    res.json({ date: targetDate, slots: available });
  } catch (error) {
    console.error('Erro suggested-slots portal:', error);
    res.status(500).json({ error: 'Erro ao listar horários' });
  }
});

// ===== Último agendamento (para repetir) =====
router.get('/last-schedule', authenticatePortal, async (req, res) => {
  try {
    const row = await get(
      `SELECT sc.id, sc.client_id, sc.vehicle_id, sc.service_id, sc.scheduled_date, sc.scheduled_time
       FROM schedules sc
       WHERE sc.client_id = ?
       ORDER BY sc.created_at DESC LIMIT 1`,
      [req.customer.client_id]
    );
    res.json({ last: row || null });
  } catch (error) {
    console.error('Erro last-schedule portal:', error);
    res.status(500).json({ error: 'Erro ao buscar último agendamento' });
  }
});

module.exports = router;
