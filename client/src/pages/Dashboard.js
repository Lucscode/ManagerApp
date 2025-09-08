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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from 'recharts';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentSchedules, setRecentSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  // Novos estados para relatórios
  const [revenueData, setRevenueData] = useState([]);
  const [topServicesData, setTopServicesData] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Datas padrão: mês atual
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const from = format(startOfMonth, 'yyyy-MM-dd');
      const to = format(new Date(), 'yyyy-MM-dd');

      // Estatísticas do dia (sem filtros, o backend usa o dia atual)
      const statsResponse = await api.get('/api/schedule/stats/overview');

      // Carregar agendamentos recentes
      const schedulesResponse = await api.get('/api/schedule', {
        params: {
          start_date: format(new Date(), 'yyyy-MM-dd'),
          end_date: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
        }
      });

      // Carregar relatórios (faturamento e top serviços do mês)
      const [revenueResp, topServicesResp] = await Promise.all([
        api.get('/api/reports/revenue', { params: { from, to } }),
        api.get('/api/reports/top-services', { params: { from, to, limit: 5 } })
      ]);

      const revenueRows = (revenueResp.data?.rows || []).map(r => ({
        date: r.date,
        revenue: Number(r.revenue || 0),
        total_services: Number(r.total_services || 0)
      }));

      const topServicesRows = (topServicesResp.data?.rows || []).map(r => ({
        name: r.name,
        revenue: Number(r.revenue || 0),
        qty: Number(r.qty || 0)
      }));

      setStats(statsResponse.data);
      setRecentSchedules(schedulesResponse.data.schedules.slice(0, 5));
      setRevenueData(revenueRows);
      setTopServicesData(topServicesRows);
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

  const todayCount = stats?.todayCount ?? 0;
  const todayRevenue = Number(stats?.todayRevenue ?? 0);
  const todayCompleted = stats?.todayCompleted ?? 0;
  const todayPending = stats?.todayPending ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Visão do dia - {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* Cards do dia */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card"><div className="card-body">
          <div className="text-sm text-gray-500">Agendamentos do Dia</div>
          <div className="text-2xl font-semibold text-gray-900">{todayCount}</div>
        </div></div>
        <div className="card"><div className="card-body">
          <div className="text-sm text-gray-500">Faturamento do Dia</div>
          <div className="text-2xl font-semibold text-gray-900">R$ {todayRevenue.toFixed(2)}</div>
        </div></div>
        <div className="card"><div className="card-body">
          <div className="text-sm text-gray-500">Concluídos Hoje</div>
          <div className="text-2xl font-semibold text-gray-900">{todayCompleted}</div>
        </div></div>
        <div className="card"><div className="card-body">
          <div className="text-sm text-gray-500">Pendentes Hoje</div>
          <div className="text-2xl font-semibold text-gray-900">{todayPending}</div>
        </div></div>
      </div>

      {/* Gráficos (mês) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <DollarSign className="h-5 w-5 mr-2 text-primary-600" /> Faturamento (mês)
            </h2>
          </div>
          <div className="card-body">
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={revenueData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="revenue" name="Faturamento" fill="#2563eb" />
                  <Bar dataKey="total_services" name="Qtde Serviços" fill="#16a34a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-primary-600" /> Serviços mais vendidos (mês)
            </h2>
          </div>
          <div className="card-body">
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={topServicesData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="qty" name="Quantidade" fill="#16a34a" />
                  <Bar dataKey="revenue" name="Faturamento" fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Agendamentos recentes (já existente) */}
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

