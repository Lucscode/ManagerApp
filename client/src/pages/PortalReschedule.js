import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

const PortalReschedule = () => {
  const { scheduleId } = useParams();
  const navigate = useNavigate();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Prefill com hoje + próxima hora cheia
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(Math.min(23, now.getHours() + 1)).padStart(2, '0');
    setDate(`${yyyy}-${mm}-${dd}`);
    setTime(`${hh}:00`);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!date || !time) {
      toast.error('Informe nova data e hora');
      return;
    }
    try {
      setLoading(true);
      const token = localStorage.getItem('portal_token');
      if (!token) {
        toast.error('Faça login no portal');
        navigate('/portal/login');
        return;
      }
      await api.post(`/api/portal/reschedule/${scheduleId}`, {
        new_date: date,
        new_time: time
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Agendamento reagendado com sucesso!');
      navigate('/portal/history');
    } catch (err) {
      const msg = err.response?.data?.error || 'Erro ao reagendar';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md card">
        <div className="card-header">
          <h1 className="text-xl font-semibold text-gray-900">Reagendar</h1>
          <p className="mt-1 text-sm text-gray-500">Selecione a nova data e horário.</p>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Data</label>
              <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Hora</label>
              <input type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div className="flex gap-3">
              <button type="button" className="btn-outline w-1/2" onClick={() => navigate('/portal/history')}>Cancelar</button>
              <button type="submit" className="btn-primary w-1/2" disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PortalReschedule;
