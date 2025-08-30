import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Search, Edit, Trash2, Eye, Phone, Mail, Users } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  // Debounce para o termo de busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms de delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    loadClients();
  }, [debouncedSearchTerm, filterActive]);

  const loadClients = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/clients', {
        params: {
          search: debouncedSearchTerm || undefined,
          active: filterActive
        }
      });
      setClients(response.data.clients);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      if (editingClient) {
        await api.put(`/api/clients/${editingClient.id}`, data);
        toast.success('Cliente atualizado com sucesso!');
      } else {
        await api.post('/api/clients', data);
        toast.success('Cliente criado com sucesso!');
      }
      
      setShowModal(false);
      setEditingClient(null);
      reset();
      loadClients();
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      toast.error('Erro ao salvar cliente');
    }
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    reset({
      name: client.name,
      phone: client.phone || '',
      email: client.email || '',
      notes: client.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (client) => {
    if (window.confirm(`Tem certeza que deseja excluir o cliente "${client.name}"?`)) {
      try {
        await api.delete(`/api/clients/${client.id}`);
        toast.success('Cliente excluído com sucesso!');
        loadClients();
      } catch (error) {
        console.error('Erro ao excluir cliente:', error);
        toast.error('Erro ao excluir cliente');
      }
    }
  };

  const openNewClientModal = () => {
    setEditingClient(null);
    reset();
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingClient(null);
    reset();
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
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gerencie os clientes do lava-rápido
          </p>
        </div>
        <button
          onClick={openNewClientModal}
          className="btn-primary"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Cliente
        </button>
      </div>

      {/* Filtros */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Nome, telefone ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>
            <div>
              <label className="label">Status</label>
              <select
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value === 'true')}
                className="input"
              >
                <option value="true">Ativos</option>
                <option value="false">Inativos</option>
                <option value="">Todos</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={loadClients}
                className="btn-outline w-full"
              >
                Filtrar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de clientes */}
      <div className="card">
        <div className="card-body">
          {clients.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum cliente encontrado</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Tente ajustar os filtros de busca.' : 'Comece criando um novo cliente.'}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden">
              <table className="table">
                <thead className="table-header">
                  <tr>
                    <th className="table-header-cell">Nome</th>
                    <th className="table-header-cell">Contato</th>
                    <th className="table-header-cell">Observações</th>
                    <th className="table-header-cell">Status</th>
                    <th className="table-header-cell">Ações</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {clients.map((client) => (
                    <tr key={client.id} className="table-row">
                      <td className="table-cell">
                        <div className="text-sm font-medium text-gray-900">
                          {client.name}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="space-y-1">
                          {client.phone && (
                            <div className="flex items-center text-sm text-gray-500">
                              <Phone className="h-4 w-4 mr-1" />
                              {client.phone}
                            </div>
                          )}
                          {client.email && (
                            <div className="flex items-center text-sm text-gray-500">
                              <Mail className="h-4 w-4 mr-1" />
                              {client.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {client.notes || '-'}
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          client.active ? 'bg-success-100 text-success-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {client.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(client)}
                            className="text-primary-600 hover:text-primary-900"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(client)}
                            className="text-danger-600 hover:text-danger-900"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal de cliente */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
              </h3>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="label">Nome *</label>
                  <input
                    type="text"
                    {...register('name', { required: 'Nome é obrigatório' })}
                    className={errors.name ? 'input-error' : 'input'}
                    placeholder="Nome completo"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-danger-600">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="label">Telefone</label>
                  <input
                    type="tel"
                    {...register('phone')}
                    className="input"
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    {...register('email', {
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Email inválido'
                      }
                    })}
                    className={errors.email ? 'input-error' : 'input'}
                    placeholder="email@exemplo.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-danger-600">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="label">Observações</label>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    className="input"
                    placeholder="Observações sobre o cliente..."
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="btn-outline"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                  >
                    {editingClient ? 'Atualizar' : 'Criar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;

