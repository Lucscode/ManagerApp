const express = require('express');
const moment = require('moment-timezone');
const { query, run, get } = require('../database/init');
const { authenticateToken, requireEmployee } = require('../middleware/auth');

const router = express.Router();

// Configurar timezone para Brasília
moment.tz.setDefault('America/Sao_Paulo');

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);
router.use(requireEmployee);

// Listar agendamentos com filtros
router.get('/', async (req, res) => {
  try {
    const { 
      start_date, 
      end_date, 
      client_id, 
      vehicle_id, 
      service_id, 
      status,
      view = 'week' // day, week, month
    } = req.query;
    
    let sql = `
      SELECT s.*, 
             c.name as client_name, c.phone as client_phone,
             v.license_plate, v.model, v.brand, v.color,
             sv.name as service_name, sv.price, sv.duration_minutes,
             vt.name as vehicle_type_name,
             COALESCE(u.name, 'Portal') as created_by_name
      FROM schedules s 
      JOIN clients c ON s.client_id = c.id 
      JOIN vehicles v ON s.vehicle_id = v.id 
      JOIN services sv ON s.service_id = sv.id 
      JOIN vehicle_types vt ON sv.vehicle_type_id = vt.id
      LEFT JOIN users u ON s.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    
    // Filtro por período
    if (start_date) {
      sql += ' AND s.scheduled_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND s.scheduled_date <= ?';
      params.push(end_date);
    }
    
    // Filtro por cliente
    if (client_id) {
      sql += ' AND s.client_id = ?';
      params.push(client_id);
    }
    
    // Filtro por veículo
    if (vehicle_id) {
      sql += ' AND s.vehicle_id = ?';
      params.push(vehicle_id);
    }
    
    // Filtro por serviço
    if (service_id) {
      sql += ' AND s.service_id = ?';
      params.push(service_id);
    }
    
    // Filtro por status
    if (status) {
      sql += ' AND s.status = ?';
      params.push(status);
    }
    
    sql += ' ORDER BY s.scheduled_date, s.scheduled_time';
    
    const schedules = await query(sql, params);
    
    res.json({
      schedules,
      total: schedules.length
    });
  } catch (error) {
    console.error('Erro ao listar agendamentos:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao listar agendamentos'
    });
  }
});

// Buscar agendamento por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const schedule = await get(`
      SELECT s.*, 
             c.name as client_name, c.phone as client_phone, c.email as client_email,
             v.license_plate, v.model, v.brand, v.color,
             sv.name as service_name, sv.price, sv.duration_minutes,
             vt.name as vehicle_type_name,
             COALESCE(u.name, 'Portal') as created_by_name
      FROM schedules s 
      JOIN clients c ON s.client_id = c.id 
      JOIN vehicles v ON s.vehicle_id = v.id 
      JOIN services sv ON s.service_id = sv.id 
      JOIN vehicle_types vt ON sv.vehicle_type_id = vt.id
      LEFT JOIN users u ON s.created_by = u.id
      WHERE s.id = ?
    `, [id]);
    
    if (!schedule) {
      return res.status(404).json({
        error: 'Agendamento não encontrado',
        message: 'Agendamento não encontrado'
      });
    }
    
    res.json({ schedule });
  } catch (error) {
    console.error('Erro ao buscar agendamento:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao buscar agendamento'
    });
  }
});

// Criar novo agendamento
router.post('/', async (req, res) => {
  try {
    const { 
      client_id, 
      vehicle_id, 
      service_id, 
      scheduled_date, 
      scheduled_time, 
      notes 
    } = req.body;
    
    if (!client_id || !vehicle_id || !service_id || !scheduled_date || !scheduled_time) {
      return res.status(400).json({
        error: 'Dados incompletos',
        message: 'Cliente, veículo, serviço, data e horário são obrigatórios'
      });
    }
    
    // Verificar se cliente existe e está ativo
    const client = await get('SELECT id FROM clients WHERE id = ? AND active = 1', [client_id]);
    if (!client) {
      return res.status(400).json({
        error: 'Cliente inválido',
        message: 'Cliente não encontrado ou inativo'
      });
    }
    
    // Verificar se veículo existe e está ativo
    const vehicle = await get('SELECT id FROM vehicles WHERE id = ? AND active = 1', [vehicle_id]);
    if (!vehicle) {
      return res.status(400).json({
        error: 'Veículo inválido',
        message: 'Veículo não encontrado ou inativo'
      });
    }
    
    // Verificar se veículo pertence ao cliente
    const vehicleBelongsToClient = await get(
      'SELECT id FROM vehicles WHERE id = ? AND client_id = ?', 
      [vehicle_id, client_id]
    );
    if (!vehicleBelongsToClient) {
      return res.status(400).json({
        error: 'Veículo não pertence ao cliente',
        message: 'O veículo selecionado não pertence ao cliente informado'
      });
    }
    
    // Verificar se serviço existe e está ativo
    const service = await get('SELECT id, duration_minutes FROM services WHERE id = ? AND active = 1', [service_id]);
    if (!service) {
      return res.status(400).json({
        error: 'Serviço inválido',
        message: 'Serviço não encontrado ou inativo'
      });
    }
    
    // Validar data e horário
    const scheduledDateTime = moment.tz(`${scheduled_date} ${scheduled_time}`, 'America/Sao_Paulo');
    const now = moment.tz('America/Sao_Paulo');
    
    if (scheduledDateTime.isBefore(now)) {
      return res.status(400).json({
        error: 'Data/horário inválido',
        message: 'Não é possível agendar para uma data/horário passado'
      });
    }
    
    // Verificar se é dia útil (segunda a sexta)
    const dayOfWeek = scheduledDateTime.day();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return res.status(400).json({
        error: 'Data inválida',
        message: 'Agendamentos só podem ser feitos em dias úteis (segunda a sexta)'
      });
    }
    
    // Verificar se horário está dentro do expediente (8h às 18h)
    const hour = scheduledDateTime.hour();
    if (hour < 8 || hour >= 18) {
      return res.status(400).json({
        error: 'Horário inválido',
        message: 'Agendamentos só podem ser feitos entre 8h e 18h'
      });
    }
    
    // Verificar conflitos de horário
    const endTime = scheduledDateTime.clone().add(service.duration_minutes, 'minutes');
    const conflicts = await query(`
      SELECT COUNT(*) as count FROM schedules 
      WHERE scheduled_date = ? 
      AND status IN ('scheduled', 'in_progress')
      AND (
        (scheduled_time <= ? AND datetime(scheduled_date || ' ' || scheduled_time, '+' || 
         (SELECT duration_minutes FROM services WHERE id = ?) || ' minutes') > ?)
        OR
        (scheduled_time < ? AND datetime(scheduled_date || ' ' || scheduled_time, '+' || 
         (SELECT duration_minutes FROM services WHERE id = ?) || ' minutes') >= ?)
      )
    `, [scheduled_date, scheduled_time, service_id, scheduled_time, endTime.format('HH:mm'), service_id, endTime.format('HH:mm')]);
    
    if (conflicts[0].count > 0) {
      return res.status(400).json({
        error: 'Conflito de horário',
        message: 'Já existe um agendamento neste horário'
      });
    }
    
    const result = await run(
      'INSERT INTO schedules (client_id, vehicle_id, service_id, scheduled_date, scheduled_time, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [client_id, vehicle_id, service_id, scheduled_date, scheduled_time, notes || null, req.user.id]
    );
    
    const newSchedule = await get(`
      SELECT s.*, 
             c.name as client_name, c.phone as client_phone,
             v.license_plate, v.model, v.brand, v.color,
             sv.name as service_name, sv.price, sv.duration_minutes,
             vt.name as vehicle_type_name,
             u.name as created_by_name
      FROM schedules s 
      JOIN clients c ON s.client_id = c.id 
      JOIN vehicles v ON s.vehicle_id = v.id 
      JOIN services sv ON s.service_id = sv.id 
      JOIN vehicle_types vt ON sv.vehicle_type_id = vt.id
      JOIN users u ON s.created_by = u.id
      WHERE s.id = ?
    `, [result.id]);
    
    res.status(201).json({
      message: 'Agendamento criado com sucesso',
      schedule: newSchedule
    });
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao criar agendamento'
    });
  }
});

// Atualizar agendamento
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      client_id, 
      vehicle_id, 
      service_id, 
      scheduled_date, 
      scheduled_time, 
      status, 
      notes 
    } = req.body;
    
    // Verificar se agendamento existe
    const existingSchedule = await get('SELECT id, status FROM schedules WHERE id = ?', [id]);
    if (!existingSchedule) {
      return res.status(404).json({
        error: 'Agendamento não encontrado',
        message: 'Agendamento não encontrado'
      });
    }
    
    // Construir query de atualização
    const updates = [];
    const params = [];
    
    if (client_id) {
      // Verificar se cliente existe
      const client = await get('SELECT id FROM clients WHERE id = ? AND active = 1', [client_id]);
      if (!client) {
        return res.status(400).json({
          error: 'Cliente inválido',
          message: 'Cliente não encontrado ou inativo'
        });
      }
      updates.push('client_id = ?');
      params.push(client_id);
    }
    
    if (vehicle_id) {
      // Verificar se veículo existe
      const vehicle = await get('SELECT id FROM vehicles WHERE id = ? AND active = 1', [vehicle_id]);
      if (!vehicle) {
        return res.status(400).json({
          error: 'Veículo inválido',
          message: 'Veículo não encontrado ou inativo'
        });
      }
      updates.push('vehicle_id = ?');
      params.push(vehicle_id);
    }
    
    if (service_id) {
      // Verificar se serviço existe
      const service = await get('SELECT id FROM services WHERE id = ? AND active = 1', [service_id]);
      if (!service) {
        return res.status(400).json({
          error: 'Serviço inválido',
          message: 'Serviço não encontrado ou inativo'
        });
      }
      updates.push('service_id = ?');
      params.push(service_id);
    }
    
    if (scheduled_date && scheduled_time) {
      // Validar data e horário
      const scheduledDateTime = moment.tz(`${scheduled_date} ${scheduled_time}`, 'America/Sao_Paulo');
      const now = moment.tz('America/Sao_Paulo');
      
      if (scheduledDateTime.isBefore(now)) {
        return res.status(400).json({
          error: 'Data/horário inválido',
          message: 'Não é possível agendar para uma data/horário passado'
        });
      }
      
      // Verificar se é dia útil
      const dayOfWeek = scheduledDateTime.day();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        return res.status(400).json({
          error: 'Data inválida',
          message: 'Agendamentos só podem ser feitos em dias úteis (segunda a sexta)'
        });
      }
      
      // Verificar se horário está dentro do expediente
      const hour = scheduledDateTime.hour();
      if (hour < 8 || hour >= 18) {
        return res.status(400).json({
          error: 'Horário inválido',
          message: 'Agendamentos só podem ser feitos entre 8h e 18h'
        });
      }
      
      updates.push('scheduled_date = ?');
      updates.push('scheduled_time = ?');
      params.push(scheduled_date, scheduled_time);
    }
    
    if (status && ['scheduled', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      updates.push('status = ?');
      params.push(status);
    }
    
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
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
      `UPDATE schedules SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    
    const updatedSchedule = await get(`
      SELECT s.*, 
             c.name as client_name, c.phone as client_phone,
             v.license_plate, v.model, v.brand, v.color,
             sv.name as service_name, sv.price, sv.duration_minutes,
             vt.name as vehicle_type_name,
             u.name as created_by_name
      FROM schedules s 
      JOIN clients c ON s.client_id = c.id 
      JOIN vehicles v ON s.vehicle_id = v.id 
      JOIN services sv ON s.service_id = sv.id 
      JOIN vehicle_types vt ON sv.vehicle_type_id = vt.id
      JOIN users u ON s.created_by = u.id
      WHERE s.id = ?
    `, [id]);
    
    res.json({
      message: 'Agendamento atualizado com sucesso',
      schedule: updatedSchedule
    });
  } catch (error) {
    console.error('Erro ao atualizar agendamento:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao atualizar agendamento'
    });
  }
});

// Deletar agendamento
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se agendamento existe
    const existingSchedule = await get('SELECT id, status, scheduled_date FROM schedules WHERE id = ?', [id]);
    if (!existingSchedule) {
      return res.status(404).json({
        error: 'Agendamento não encontrado',
        message: 'Agendamento não encontrado'
      });
    }
    
    // Verificar se agendamento já foi realizado
    if (existingSchedule.status === 'completed') {
      return res.status(400).json({
        error: 'Agendamento já realizado',
        message: 'Não é possível excluir um agendamento já realizado'
      });
    }
    
    // Verificar se agendamento é de hoje ou futuro
    const scheduledDate = moment.tz(existingSchedule.scheduled_date, 'America/Sao_Paulo');
    const now = moment.tz('America/Sao_Paulo');
    
    if (scheduledDate.isBefore(now, 'day')) {
      return res.status(400).json({
        error: 'Agendamento passado',
        message: 'Não é possível excluir agendamentos de datas passadas'
      });
    }
    
    await run('DELETE FROM schedules WHERE id = ?', [id]);
    
    res.json({
      message: 'Agendamento excluído com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir agendamento:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao excluir agendamento'
    });
  }
});

// Buscar horários disponíveis para uma data
router.get('/available-times/:date', async (req, res) => {
  try {
    const { date } = req.params;
    
    // Validar formato da data
    if (!moment(date, 'YYYY-MM-DD', true).isValid()) {
      return res.status(400).json({
        error: 'Data inválida',
        message: 'Formato de data inválido. Use YYYY-MM-DD'
      });
    }
    
    const scheduledDate = moment.tz(date, 'America/Sao_Paulo');
    const now = moment.tz('America/Sao_Paulo');
    
    // Verificar se é data passada
    if (scheduledDate.isBefore(now, 'day')) {
      return res.status(400).json({
        error: 'Data passada',
        message: 'Não é possível verificar disponibilidade para datas passadas'
      });
    }
    
    // Verificar se é dia útil
    const dayOfWeek = scheduledDate.day();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return res.json({
        date,
        available: false,
        message: 'Não há atendimento aos finais de semana'
      });
    }
    
    // Gerar horários disponíveis (8h às 18h, intervalos de 30 minutos)
    const availableTimes = [];
    const startHour = 8;
    const endHour = 18;
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = moment.tz(date, 'America/Sao_Paulo').hour(hour).minute(minute);
        
        // Se for hoje, verificar se o horário já passou
        if (scheduledDate.isSame(now, 'day') && time.isBefore(now)) {
          continue;
        }
        
        const timeStr = time.format('HH:mm');
        availableTimes.push(timeStr);
      }
    }
    
    // Buscar agendamentos existentes para esta data
    const existingSchedules = await query(`
      SELECT s.scheduled_time, sv.duration_minutes
      FROM schedules s 
      JOIN services sv ON s.service_id = sv.id 
      WHERE s.scheduled_date = ? AND s.status IN ('scheduled', 'in_progress')
      ORDER BY s.scheduled_time
    `, [date]);
    
    // Marcar horários ocupados
    const occupiedTimes = new Set();
    existingSchedules.forEach(schedule => {
      const startTime = moment.tz(`${date} ${schedule.scheduled_time}`, 'America/Sao_Paulo');
      const endTime = startTime.clone().add(schedule.duration_minutes, 'minutes');
      
      let currentTime = startTime.clone();
      while (currentTime.isBefore(endTime)) {
        occupiedTimes.add(currentTime.format('HH:mm'));
        currentTime.add(30, 'minutes');
      }
    });
    
    // Filtrar horários disponíveis
    const finalAvailableTimes = availableTimes.filter(time => !occupiedTimes.has(time));
    
    res.json({
      date,
      available: finalAvailableTimes.length > 0,
      availableTimes: finalAvailableTimes,
      occupiedTimes: Array.from(occupiedTimes).sort(),
      totalSlots: availableTimes.length,
      occupiedSlots: occupiedTimes.size,
      availableSlots: finalAvailableTimes.length
    });
  } catch (error) {
    console.error('Erro ao buscar horários disponíveis:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao buscar horários disponíveis'
    });
  }
});

// Estatísticas de agendamentos
router.get('/stats/overview', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let dateFilter = '';
    const params = [];
    
    if (start_date && end_date) {
      dateFilter = 'WHERE scheduled_date BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }
    
    // Total de agendamentos
    const totalSchedules = await get(
      `SELECT COUNT(*) as total FROM schedules ${dateFilter}`,
      params
    );
    
    // Agendamentos por status
    const schedulesByStatus = await query(
      `SELECT status, COUNT(*) as count FROM schedules ${dateFilter} GROUP BY status`,
      params
    );
    
    // Agendamentos por dia da semana
    const schedulesByDay = await query(
      `SELECT 
         CASE 
           WHEN strftime('%w', scheduled_date) = '1' THEN 'Segunda'
           WHEN strftime('%w', scheduled_date) = '2' THEN 'Terça'
           WHEN strftime('%w', scheduled_date) = '3' THEN 'Quarta'
           WHEN strftime('%w', scheduled_date) = '4' THEN 'Quinta'
           WHEN strftime('%w', scheduled_date) = '5' THEN 'Sexta'
           ELSE 'Outro'
         END as day_name,
         COUNT(*) as count
       FROM schedules ${dateFilter}
       GROUP BY strftime('%w', scheduled_date)
       ORDER BY strftime('%w', scheduled_date)`,
      params
    );
    
    // Faturamento total
    const totalRevenue = await get(
      `SELECT SUM(sv.price) as total FROM schedules s 
       JOIN services sv ON s.service_id = sv.id 
       ${dateFilter.replace('WHERE', 'WHERE s.')}`,
      params
    );
    
    res.json({
      totalSchedules: totalSchedules.total,
      schedulesByStatus,
      schedulesByDay,
      totalRevenue: totalRevenue.total || 0,
      period: { start_date, end_date }
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao buscar estatísticas'
    });
  }
});

// Iniciar serviço
router.post('/:id/start', async (req, res) => {
  try {
    const { id } = req.params;
    const sched = await get('SELECT id, status FROM schedules WHERE id = ?', [id]);
    if (!sched) return res.status(404).json({ error: 'Agendamento não encontrado' });
    if (sched.status !== 'scheduled') return res.status(400).json({ error: 'Somente agendamentos "scheduled" podem iniciar' });

    await run('UPDATE schedules SET status = "in_progress", in_progress_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    res.json({ message: 'Serviço iniciado' });
  } catch (error) {
    console.error('start schedule:', error);
    res.status(500).json({ error: 'Erro ao iniciar' });
  }
});

// Concluir serviço
router.post('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const sched = await get('SELECT id, status FROM schedules WHERE id = ?', [id]);
    if (!sched) return res.status(404).json({ error: 'Agendamento não encontrado' });
    if (sched.status !== 'in_progress') return res.status(400).json({ error: 'Somente serviços em andamento podem concluir' });

    await run('UPDATE schedules SET status = "completed", completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    res.json({ message: 'Serviço concluído' });
  } catch (error) {
    console.error('complete schedule:', error);
    res.status(500).json({ error: 'Erro ao concluir' });
  }
});

// Cancelar serviço
router.post('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const sched = await get('SELECT id, status FROM schedules WHERE id = ?', [id]);
    if (!sched) return res.status(404).json({ error: 'Agendamento não encontrado' });
    if (['completed','paid','cancelled'].includes(sched.status)) return res.status(400).json({ error: 'Não é possível cancelar' });

    await run('UPDATE schedules SET status = "cancelled", updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    res.json({ message: 'Agendamento cancelado' });
  } catch (error) {
    console.error('cancel schedule:', error);
    res.status(500).json({ error: 'Erro ao cancelar' });
  }
});

// Confirmar pagamento
router.post('/:id/pay', async (req, res) => {
  try {
    const { id } = req.params;
    const { method, amount } = req.body;
    if (!method) return res.status(400).json({ error: 'Informe o método de pagamento' });

    const sched = await get('SELECT id, status, service_id FROM schedules WHERE id = ?', [id]);
    if (!sched) return res.status(404).json({ error: 'Agendamento não encontrado' });
    if (!['completed','in_progress'].includes(sched.status)) return res.status(400).json({ error: 'Pagamento permitido após conclusão' });

    let finalAmount = amount;
    if (finalAmount === undefined || finalAmount === null || finalAmount === '') {
      const sv = await get('SELECT price FROM services WHERE id = ?', [sched.service_id]);
      finalAmount = sv?.price ?? 0;
    }

    await run('UPDATE schedules SET status = "paid", payment_status = "paid", payment_method = ?, amount_paid = ?, paid_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [method, finalAmount, id]);
    res.json({ message: 'Pagamento confirmado' });
  } catch (error) {
    console.error('pay schedule:', error);
    res.status(500).json({ error: 'Erro ao confirmar pagamento' });
  }
});

module.exports = router;

