import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Search, Edit, Trash2, Car } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const Vehicles = () => {
  const [vehicles, setVehicles] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

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
    loadData();
  }, [debouncedSearchTerm]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [vehiclesResponse, clientsResponse] = await Promise.all([
        api.get('/api/vehicles', { params: { search: debouncedSearchTerm || undefined } }),
        api.get('/api/clients', { params: { active: true } })
      ]);
      setVehicles(vehiclesResponse.data.vehicles);
      setClients(clientsResponse.data.clients);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      if (editingVehicle) {
        await api.put(`/api/vehicles/${editingVehicle.id}`, data);
        toast.success('Veículo atualizado com sucesso!');
      } else {
        await api.post('/api/vehicles', data);
        toast.success('Veículo criado com sucesso!');
      }
      
      setShowModal(false);
      setEditingVehicle(null);
      reset();
      loadData();
    } catch (error) {
      console.error('Erro ao salvar veículo:', error);
      toast.error('Erro ao salvar veículo');
    }
  };

  const handleEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    reset({
      client_id: vehicle.client_id,
      license_plate: vehicle.license_plate,
      model: vehicle.model,
      brand: vehicle.brand,
      color: vehicle.color,
      year: vehicle.year || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (vehicle) => {
    if (window.confirm(`Tem certeza que deseja excluir o veículo "${vehicle.license_plate}"?`)) {
      try {
        await api.delete(`/api/vehicles/${vehicle.id}`);
        toast.success('Veículo excluído com sucesso!');
        loadData();
      } catch (error) {
        console.error('Erro ao excluir veículo:', error);
        toast.error('Erro ao excluir veículo');
      }
    }
  };

  const openNewVehicleModal = () => {
    setEditingVehicle(null);
    reset();
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingVehicle(null);
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
          <h1 className="text-2xl font-bold text-gray-900">Veículos</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gerencie os veículos dos clientes
          </p>
        </div>
        <button
          onClick={openNewVehicleModal}
          className="btn-primary"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Veículo
        </button>
      </div>

      {/* Filtros */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Placa, modelo, marca ou cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={loadData}
                className="btn-outline w-full"
              >
                Filtrar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de veículos */}
      <div className="card">
        <div className="card-body">
          {vehicles.length === 0 ? (
            <div className="text-center py-8">
              <Car className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum veículo encontrado</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Tente ajustar os filtros de busca.' : 'Comece criando um novo veículo.'}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden">
              <table className="table">
                <thead className="table-header">
                  <tr>
                    <th className="table-header-cell">Placa</th>
                    <th className="table-header-cell">Veículo</th>
                    <th className="table-header-cell">Cliente</th>
                    <th className="table-header-cell">Status</th>
                    <th className="table-header-cell">Ações</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {vehicles.map((vehicle) => (
                    <tr key={vehicle.id} className="table-row">
                      <td className="table-cell">
                        <div className="text-sm font-medium text-gray-900">
                          {vehicle.license_plate}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {vehicle.brand} {vehicle.model}
                          </div>
                          <div className="text-sm text-gray-500">
                            {vehicle.color} {vehicle.year && `(${vehicle.year})`}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="text-sm text-gray-900">
                          {vehicle.client_name}
                        </div>
                        {vehicle.client_phone && (
                          <div className="text-sm text-gray-500">
                            {vehicle.client_phone}
                          </div>
                        )}
                      </td>
                      <td className="table-cell">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          vehicle.active ? 'bg-success-100 text-success-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {vehicle.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(vehicle)}
                            className="text-primary-600 hover:text-primary-900"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(vehicle)}
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

      {/* Modal de veículo */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingVehicle ? 'Editar Veículo' : 'Novo Veículo'}
              </h3>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="label">Cliente *</label>
                  <select
                    {...register('client_id', { required: 'Cliente é obrigatório' })}
                    className={errors.client_id ? 'input-error' : 'input'}
                  >
                    <option value="">Selecione um cliente</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                  {errors.client_id && (
                    <p className="mt-1 text-sm text-danger-600">{errors.client_id.message}</p>
                  )}
                </div>

                <div>
                  <label className="label">Placa *</label>
                  <input
                    type="text"
                    {...register('license_plate', { required: 'Placa é obrigatória' })}
                    className={errors.license_plate ? 'input-error' : 'input'}
                    placeholder="ABC-1234"
                  />
                  {errors.license_plate && (
                    <p className="mt-1 text-sm text-danger-600">{errors.license_plate.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Marca *</label>
                    <input
                      type="text"
                      {...register('brand', { required: 'Marca é obrigatória' })}
                      className={errors.brand ? 'input-error' : 'input'}
                      placeholder="Toyota"
                    />
                    {errors.brand && (
                      <p className="mt-1 text-sm text-danger-600">{errors.brand.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="label">Modelo *</label>
                    <input
                      type="text"
                      {...register('model', { required: 'Modelo é obrigatório' })}
                      className={errors.model ? 'input-error' : 'input'}
                      placeholder="Corolla"
                    />
                    {errors.model && (
                      <p className="mt-1 text-sm text-danger-600">{errors.model.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Cor *</label>
                    <input
                      type="text"
                      {...register('color', { required: 'Cor é obrigatória' })}
                      className={errors.color ? 'input-error' : 'input'}
                      placeholder="Branco"
                    />
                    {errors.color && (
                      <p className="mt-1 text-sm text-danger-600">{errors.color.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="label">Ano</label>
                    <input
                      type="number"
                      {...register('year')}
                      className="input"
                      placeholder="2020"
                      min="1900"
                      max={new Date().getFullYear() + 1}
                    />
                  </div>
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
                    {editingVehicle ? 'Atualizar' : 'Criar'}
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

export default Vehicles;

