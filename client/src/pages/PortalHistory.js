import React, { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const PortalHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('portal_token');
        if (!token) {
          toast.error('Faça login no portal');
          window.location.href = '/portal/login';
          return;
        }
        const resp = await api.get('/api/portal/history', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setHistory(resp.data.history || []);
      } catch (err) {
        console.error(err);
        toast.error('Erro ao carregar histórico');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Meu Histórico</h1>
            <p className="text-sm text-gray-500">Veja seus serviços realizados e agendamentos.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/portal/new')}
              className="btn-primary"
            >
              Novo agendamento
            </button>
            <button
              onClick={() => { localStorage.removeItem('portal_token'); window.location.href = '/portal/login'; }}
              className="btn-outline"
            >
              Sair
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            {history.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Nenhum registro encontrado.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead className="table-header">
                    <tr>
                      <th className="table-header-cell">Data</th>
                      <th className="table-header-cell">Hora</th>
                      <th className="table-header-cell">Serviço</th>
                      <th className="table-header-cell">Veículo</th>
                      <th className="table-header-cell">Status</th>
                      <th className="table-header-cell">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="table-body">
                    {history.map(item => (
                      <tr key={item.id} className="table-row">
                        <td className="table-cell">{item.scheduled_date}</td>
                        <td className="table-cell">{item.scheduled_time}</td>
                        <td className="table-cell">{item.service_name} - R$ {Number(item.price).toFixed(2)}</td>
                        <td className="table-cell">{item.brand} {item.model} ({item.license_plate})</td>
                        <td className="table-cell">
                          <span className="badge badge-info">{item.status}</span>
                        </td>
                        <td className="table-cell">
                          {item.status === 'scheduled' ? (
                            <button className="btn-primary" onClick={() => navigate(`/portal/reschedule/${item.id}`)}>
                              Reagendar
                            </button>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
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
    </div>
  );
};

export default PortalHistory;
