const express = require('express');
const { query } = require('../database/init');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Todos os relatórios requerem autenticação; alguns somente admin
router.use(authenticateToken);

// GET /api/reports/revenue?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/revenue', requireAdmin, async (req, res) => {
  try {
    const { from, to } = req.query;
    const params = [];
    let where = '';
    if (from && to) {
      where = 'WHERE scheduled_date BETWEEN ? AND ?';
      params.push(from, to);
    } else if (from) {
      where = 'WHERE scheduled_date >= ?';
      params.push(from);
    } else if (to) {
      where = 'WHERE scheduled_date <= ?';
      params.push(to);
    }

    const rows = await query(`
      SELECT scheduled_date AS date,
             SUM(s.price) AS revenue,
             COUNT(sc.id) AS total_services
      FROM schedules sc
      JOIN services s ON s.id = sc.service_id
      ${where}
      GROUP BY scheduled_date
      ORDER BY scheduled_date ASC
    `, params);

    const totals = rows.reduce((acc, r) => {
      acc.revenue += r.revenue || 0;
      acc.total_services += r.total_services || 0;
      return acc;
    }, { revenue: 0, total_services: 0 });

    res.json({ rows, totals });
  } catch (error) {
    console.error('Erro em /reports/revenue:', error);
    res.status(500).json({ error: 'Erro ao obter faturamento' });
  }
});

// GET /api/reports/top-services?from&to&limit=5
router.get('/top-services', requireAdmin, async (req, res) => {
  try {
    const { from, to, limit = 5 } = req.query;
    const params = [];
    let where = '';
    if (from && to) {
      where = 'WHERE sc.scheduled_date BETWEEN ? AND ?';
      params.push(from, to);
    } else if (from) {
      where = 'WHERE sc.scheduled_date >= ?';
      params.push(from);
    } else if (to) {
      where = 'WHERE sc.scheduled_date <= ?';
      params.push(to);
    }

    const rows = await query(`
      SELECT s.name,
             COUNT(sc.id) AS qty,
             SUM(s.price) AS revenue
      FROM schedules sc
      JOIN services s ON s.id = sc.service_id
      ${where}
      GROUP BY s.name
      ORDER BY revenue DESC, qty DESC
      LIMIT ${Number(limit) || 5}
    `, params);

    res.json({ rows });
  } catch (error) {
    console.error('Erro em /reports/top-services:', error);
    res.status(500).json({ error: 'Erro ao obter top serviços' });
  }
});

// GET /api/reports/vehicle-history/:vehicleId
router.get('/vehicle-history/:vehicleId', requireAdmin, async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const rows = await query(`
      SELECT sc.id, sc.scheduled_date, sc.scheduled_time, sc.status,
             s.name AS service_name, s.price,
             c.name AS client_name, v.license_plate, v.brand, v.model
      FROM schedules sc
      JOIN services s ON s.id = sc.service_id
      JOIN clients c ON c.id = sc.client_id
      JOIN vehicles v ON v.id = sc.vehicle_id
      WHERE sc.vehicle_id = ?
      ORDER BY sc.scheduled_date DESC, sc.scheduled_time DESC
    `, [vehicleId]);

    res.json({ rows });
  } catch (error) {
    console.error('Erro em /reports/vehicle-history:', error);
    res.status(500).json({ error: 'Erro ao obter histórico do veículo' });
  }
});

// GET /api/reports/schedules?from&to&clientId&employeeId&status
router.get('/schedules', requireAdmin, async (req, res) => {
  try {
    const { from, to, clientId, employeeId, status } = req.query;
    const params = [];
    const filters = [];
    if (from) { filters.push('sc.scheduled_date >= ?'); params.push(from); }
    if (to) { filters.push('sc.scheduled_date <= ?'); params.push(to); }
    if (clientId) { filters.push('sc.client_id = ?'); params.push(clientId); }
    if (employeeId) { filters.push('sc.created_by = ?'); params.push(employeeId); }
    if (status) { filters.push('sc.status = ?'); params.push(status); }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const rows = await query(`
      SELECT sc.id, sc.scheduled_date, sc.scheduled_time, sc.status,
             c.name AS client_name,
             v.license_plate, v.brand, v.model,
             s.name AS service_name, s.price,
             u.name AS created_by
      FROM schedules sc
      JOIN clients c ON c.id = sc.client_id
      JOIN vehicles v ON v.id = sc.vehicle_id
      JOIN services s ON s.id = sc.service_id
      JOIN users u ON u.id = sc.created_by
      ${where}
      ORDER BY sc.scheduled_date DESC, sc.scheduled_time DESC
    `, params);

    res.json({ rows });
  } catch (error) {
    console.error('Erro em /reports/schedules:', error);
    res.status(500).json({ error: 'Erro ao obter agendamentos' });
  }
});

module.exports = router;
