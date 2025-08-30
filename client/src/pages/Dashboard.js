import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Users,
  Car,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle
} from 'lucide-react';
import api from '../services/api';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentSchedules, setRecentSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Carregar estatísticas
      const statsResponse = await api.get('/api/schedule/stats/overview', {
        params: {
          start_date: format(new Date().setDate(1), 'yyyy-MM-dd'), // Primeiro dia do mês
          end_date: format(new Date(), 'yyyy-MM-dd') // Hoje
        }
      });
      
      // Carregar agendamentos recentes
      const schedulesResponse = await api.get('/api/schedule', {
        params: {
          start_date: format(new Date(), 'yyyy-MM-dd'),
          end_date: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd') // Próximos 7 dias
        }
      });
      
      setStats(statsResponse.data);
      setRecentSchedules(schedulesResponse.data.schedules.slice(0, 5)); // Últimos 5 agendamentos
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
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
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Visão geral do sistema - {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-8 w-8 text-primary-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Agendamentos do Mês
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.totalSchedules || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-8 w-8 text-success-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Faturamento do Mês
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    R$ {stats?.totalRevenue?.toFixed(2) || '0,00'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-8 w-8 text-success-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Concluídos Hoje
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.schedulesByStatus?.find(s => s.status === 'completed')?.count || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-warning-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pendentes Hoje
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.schedulesByStatus?.find(s => s.status === 'scheduled')?.count || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos e estatísticas detalhadas */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Agendamentos por status */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Agendamentos por Status
            </h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {stats?.schedulesByStatus?.map((item) => (
                <div key={item.status} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                      {getStatusText(item.status)}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Agendamentos por dia da semana */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Agendamentos por Dia da Semana
            </h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {stats?.schedulesByDay?.map((item) => (
                <div key={item.day_name} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {item.day_name}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Agendamentos recentes */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Próximos Agendamentos
          </h3>
        </div>
        <div className="card-body">
          {recentSchedules.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum agendamento</h3>
              <p className="mt-1 text-sm text-gray-500">
                Não há agendamentos para os próximos dias.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden">
              <table className="table">
                <thead className="table-header">
                  <tr>
                    <th className="table-header-cell">Data/Hora</th>
                    <th className="table-header-cell">Cliente</th>
                    <th className="table-header-cell">Veículo</th>
                    <th className="table-header-cell">Serviço</th>
                    <th className="table-header-cell">Status</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {recentSchedules.map((schedule) => (
                    <tr key={schedule.id} className="table-row">
                      <td className="table-cell">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {format(new Date(schedule.scheduled_date), 'dd/MM/yyyy')}
                          </div>
                          <div className="text-sm text-gray-500">
                            {schedule.scheduled_time}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {schedule.client_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {schedule.client_phone}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {schedule.license_plate}
                          </div>
                          <div className="text-sm text-gray-500">
                            {schedule.brand} {schedule.model}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {schedule.service_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            R$ {parseFloat(schedule.price).toFixed(2)}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(schedule.status)}`}>
                          {getStatusText(schedule.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

