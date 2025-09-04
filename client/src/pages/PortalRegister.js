import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

const PortalRegister = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error('Preencha nome, email e senha');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('As senhas não conferem');
      return;
    }
    try {
      setLoading(true);
      await api.post('/api/portal/auth/register', { name, email, phone: phone || null, password });
      toast.success('Conta criada! Faça login.');
      navigate('/portal/login');
    } catch (err) {
      const msg = err.response?.data?.error || 'Erro ao registrar';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md card">
        <div className="card-header">
          <h1 className="text-xl font-semibold text-gray-900">Criar conta</h1>
          <p className="mt-1 text-sm text-gray-500">Portal do Cliente</p>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Nome</label>
              <input type="text" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
            </div>
            <div>
              <label className="label">Telefone (opcional)</label>
              <input type="tel" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="11999999999" />
            </div>
            <div>
              <label className="label">Senha</label>
              <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div>
              <label className="label">Confirmar senha</label>
              <input type="password" className="input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Criando...' : 'Criar conta'}
            </button>
          </form>

          <div className="text-center mt-4 text-sm">
            Já tem conta?{' '}
            <Link to="/portal/login" className="text-primary-600 hover:text-primary-700">Entrar</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortalRegister;
