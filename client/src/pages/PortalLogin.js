import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

const PortalLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Informe email e senha');
      return;
    }
    try {
      setLoading(true);
      const resp = await api.post('/api/portal/auth/login', { email, password });
      const { token } = resp.data;
      localStorage.setItem('portal_token', token);
      toast.success('Login realizado com sucesso!');
      navigate('/portal/history');
    } catch (err) {
      const msg = err.response?.data?.error || 'Erro ao fazer login';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md card">
        <div className="card-header">
          <h1 className="text-xl font-semibold text-gray-900">Portal do Cliente</h1>
          <p className="mt-1 text-sm text-gray-500">Acesse seu histórico e reagende com facilidade.</p>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Senha</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="text-center mt-4 text-sm">
            Não tem conta?{' '}
            <Link to="/portal/register" className="text-primary-600 hover:text-primary-700">Criar conta</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortalLogin;
