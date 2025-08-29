import React, { useState, useEffect } from 'react';
import { Settings, Plus, Edit, Trash2 } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const Services = () => {
  const [services, setServices] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [servicesResponse, typesResponse] = await Promise.all([
        api.get('/api/services'),
        api.get('/api/services/vehicle-types')
      ]);
      setServices(servicesResponse.data.services);
      setVehicleTypes(typesResponse.data.vehicleTypes);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
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
          <h1 className="text-2xl font-bold text-gray-900">Serviços</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gerencie os serviços oferecidos pelo lava-rápido
          </p>
        </div>
        <button className="btn-primary">
          <Plus className="h-4 w-4 mr-2" />
          Novo Serviço
        </button>
      </div>

      {/* Tipos de Veículo */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Tipos de Veículo
          </h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {vehicleTypes.map((type) => (
              <div key={type.id} className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-900">{type.name}</h4>
                <p className="text-sm text-gray-500 mt-1">{type.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lista de Serviços */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Serviços Disponíveis
          </h3>
        </div>
        <div className="card-body">
          {services.length === 0 ? (
            <div className="text-center py-8">
              <Settings className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum serviço encontrado</h3>
              <p className="mt-1 text-sm text-gray-500">
                Comece criando um novo serviço.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden">
              <table className="table">
                <thead className="table-header">
                  <tr>
                    <th className="table-header-cell">Serviço</th>
                    <th className="table-header-cell">Tipo de Veículo</th>
                    <th className="table-header-cell">Preço</th>
                    <th className="table-header-cell">Duração</th>
                    <th className="table-header-cell">Status</th>
                    <th className="table-header-cell">Ações</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {services.map((service) => (
                    <tr key={service.id} className="table-row">
                      <td className="table-cell">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {service.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {service.description}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                          {service.vehicle_type_name}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="text-sm font-medium text-gray-900">
                          R$ {parseFloat(service.price).toFixed(2)}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="text-sm text-gray-900">
                          {service.duration_minutes} min
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          service.active ? 'bg-success-100 text-success-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {service.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex space-x-2">
                          <button className="text-primary-600 hover:text-primary-900" title="Editar">
                            <Edit className="h-4 w-4" />
                          </button>
                          <button className="text-danger-600 hover:text-danger-900" title="Excluir">
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
    </div>
  );
};

export default Services;

