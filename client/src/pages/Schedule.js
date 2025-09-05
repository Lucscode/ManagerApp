import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Plus, Clock, User, Car, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import api from '../services/api';
import toast from 'react-hot-toast';

const Schedule = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  // Quando vazio, significa "sem filtro de data" (listar todos)
  const [selectedDate, setSelectedDate] = useState('');

  const loadSchedules = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedDate) {
        params.start_date = selectedDate;
        params.end_date = selectedDate;
      }
      const response = await api.get('/api/schedule', { params });
      setSchedules(response.data.schedules);
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
      toast.error('Erro ao carregar agendamentos');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'paid':
        return 'bg-green-200 text-green-900';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'scheduled':
        return 'Agendado';
      case 'in_progress':
        return 'Em Andamento';
      case 'completed':
        return 'Concluído';
      case 'paid':
        return 'Pago';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const action = async (id, kind) => {
    try {
      if (kind === 'pay') {
        const method = window.prompt('Método de pagamento (pix/cartao/dinheiro):', 'pix');
        if (!method) return;
        const amountStr = window.prompt('Valor pago (ex.: 25.00):');
        if (!amountStr) return;
        const amount = Number(amountStr.replace(',', '.'));
        await api.post(`/api/schedule/${id}/pay`, { method, amount });
        toast.success('Pagamento confirmado');
      } else {
        await api.post(`/api/schedule/${id}/${kind}`);
        const msg = {
          start: 'Serviço iniciado',
          complete: 'Serviço concluído',
          cancel: 'Agendamento cancelado'
        }[kind];
        if (msg) toast.success(msg);
      }
      loadSchedules();
    } catch (err) {
      const msg = err.response?.data?.error || 'Erro na ação';
      toast.error(msg);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agendamentos</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gerencie os agendamentos do lava-rápido
          </p>
        </div>
        <button className="btn-primary">
          <Plus className="h-4 w-4 mr-2" />
          Novo Agendamento
        </button>
      </div>

      {/* Filtros */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="label">Data (opcional)</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="input"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={loadSchedules} className="btn-outline w-full">Filtrar</button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => { setSelectedDate(''); setTimeout(loadSchedules, 0); }}
                title="Limpar filtro de data"
              >
                Limpar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de agendamentos */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            {selectedDate
              ? <>Agendamentos - {format(new Date(selectedDate), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}</>
              : 'Agendamentos - Todos'}
          </h3>
        </div>
        <div className="card-body">
          {schedules.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum agendamento</h3>
              <p className="mt-1 text-sm text-gray-500">
                {selectedDate ? 'Não há agendamentos para esta data.' : 'Não há agendamentos cadastrados.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {schedules.map((schedule) => (
                <div key={schedule.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="h-4 w-4 mr-1" />
                        {schedule.scheduled_time} ({schedule.scheduled_date})
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <User className="h-4 w-4 mr-1" />
                        {schedule.client_name}
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Car className="h-4 w-4 mr-1" />
                        {schedule.license_plate}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-sm text-gray-900">
                        {schedule.service_name} - R$ {parseFloat(schedule.price).toFixed(2)}
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(schedule.status)}`}>
                        {getStatusText(schedule.status)}
                      </span>
                      {schedule.payment_status && (
                        <span className="badge badge-info text-xs">
                          {schedule.payment_status}{schedule.payment_method ? ` • ${schedule.payment_method}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  {schedule.notes && (
                    <div className="mt-2 text-sm text-gray-600">
                      <strong>Observações:</strong> {schedule.notes}
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {schedule.status === 'scheduled' && (
                      <>
                        <button className="btn-secondary" onClick={() => action(schedule.id, 'start')}>Iniciar</button>
                        <button className="btn-outline" onClick={() => action(schedule.id, 'cancel')}>Cancelar</button>
                      </>
                    )}
                    {schedule.status === 'in_progress' && (
                      <>
                        <button className="btn-success" onClick={() => action(schedule.id, 'complete')}>Concluir</button>
                        <button className="btn-outline" onClick={() => action(schedule.id, 'cancel')}>Cancelar</button>
                      </>
                    )}
                    {schedule.status === 'completed' && (
                      <>
                        <button className="btn-primary" onClick={() => action(schedule.id, 'pay')}>Confirmar Pagamento</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Schedule;

