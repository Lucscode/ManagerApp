import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

// Lista simples para autocomplete (pode ser expandida no futuro)
const COMMON_BRANDS = ['Chevrolet','Volkswagen','Fiat','Toyota','Hyundai','Ford','Honda','Renault','Jeep','BMW','Mercedes-Benz','Audi'];
const COMMON_MODELS = ['Celta','Gol','Onix','HB20','Corolla','Civic','Fox','Palio','Uno','Compass','Range Rover','Renegade','Ka','Polo'];

// Máscara e validação simples de placa (padrões antigos e Mercosul)
function normalizePlate(input) {
  if (!input) return '';
  let v = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (v.length <= 3) return v;
  // Inserir hífen depois de 3 caracteres para legibilidade
  return `${v.slice(0,3)}-${v.slice(3,7)}`.slice(0,8);
}

function isValidPlate(input) {
  if (!input) return false;
  const v = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  // AAA0000 (7) ou AAA0A00 (7) – validação simples de tamanho e início com letras
  return /^[A-Z]{3}[A-Z0-9]{4}$/.test(v);
}

const PortalNewSchedule = () => {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [services, setServices] = useState([]);
  const [vehicleId, setVehicleId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('dinheiro');
  const [suggested, setSuggested] = useState([]);

  // Campos para novo veículo (apenas essenciais como obrigatórios)
  const [newVeh, setNewVeh] = useState({
    license_plate: '',
    brand: '',
    model: '',
    color: '',
    year: '',
    size: ''
  });

  const token = localStorage.getItem('portal_token');

  const selectedVehicle = useMemo(() => vehicles.find(v => String(v.id) === String(vehicleId)), [vehicles, vehicleId]);

  const loadVehicles = async () => {
    const v = await api.get('/api/portal/vehicles', { headers: { Authorization: `Bearer ${token}` } });
    setVehicles(v.data.vehicles || []);
  };

  const loadServices = async (params = {}) => {
    const s = await api.get('/api/portal/services', { headers: { Authorization: `Bearer ${token}` }, params });
    setServices(s.data.services || []);
  };

  const loadSuggested = async (theDate) => {
    const r = await api.get('/api/portal/suggested-slots', {
      headers: { Authorization: `Bearer ${token}` },
      params: { date: theDate }
    });
    setSuggested(r.data.slots || []);
  };

  const loadLast = async () => {
    const r = await api.get('/api/portal/last-schedule', { headers: { Authorization: `Bearer ${token}` } });
    return r.data.last;
  };

  useEffect(() => {
    const init = async () => {
      try {
        if (!token) {
          toast.error('Faça login no portal');
          navigate('/portal/login');
          return;
        }
        await loadVehicles();
        const lastVehicleId = localStorage.getItem('portal_last_vehicle_id');
        if (lastVehicleId) setVehicleId(lastVehicleId);
        await loadServices(lastVehicleId ? { vehicle_id: lastVehicleId } : {});
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(Math.min(23, now.getHours() + 1)).padStart(2, '0');
        const d = `${yyyy}-${mm}-${dd}`;
        setDate(d);
        setTime(`${hh}:00`);
        await loadSuggested(d);
      } catch (err) {
        console.error(err);
        toast.error('Erro ao carregar dados');
      }
    };
    init();
  }, [navigate, token]);

  // Ao selecionar veículo, recarrega serviços filtrando por tamanho do veículo
  useEffect(() => {
    const fetchByVehicle = async () => {
      try {
        if (vehicleId) {
          await loadServices({ vehicle_id: vehicleId });
          setServiceId('');
          localStorage.setItem('portal_last_vehicle_id', String(vehicleId));
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchByVehicle();
  }, [vehicleId]);

  useEffect(() => {
    const refetch = async () => {
      if (date) await loadSuggested(date);
    };
    refetch();
  }, [date]);

  const handleCreateVehicle = async (e) => {
    e.preventDefault();
    try {
      // Validações amigáveis
      if (!newVeh.license_plate || !newVeh.brand || !newVeh.model) {
        toast.error('Informe placa, marca e modelo');
        return;
      }
      if (!isValidPlate(newVeh.license_plate)) {
        toast.error('Placa inválida');
        return;
      }
      if (!newVeh.size) {
        toast.error('Selecione o tamanho do veículo');
        return;
      }
      const payload = {
        ...newVeh,
        license_plate: newVeh.license_plate.toUpperCase().replace(/[^A-Z0-9]/g, '')
      };
      const resp = await api.post('/api/portal/vehicles', payload, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Veículo cadastrado!');
      await loadVehicles();
      setVehicleId(String(resp.data.vehicle.id));
    } catch (err) {
      const msg = err.response?.data?.error || 'Erro ao cadastrar veículo';
      toast.error(msg);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!vehicleId || !serviceId || !date || !time) {
      toast.error('Preencha todos os campos');
      return;
    }
    try {
      setLoading(true);
      await api.post('/api/portal/schedule', {
        vehicle_id: Number(vehicleId),
        service_id: Number(serviceId),
        date,
        time,
        payment_method: paymentMethod
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Agendamento criado!');
      navigate('/portal/history');
    } catch (err) {
      const msg = err.response?.data?.error || 'Erro ao criar agendamento';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-2xl card">
        <div className="card-header">
          <h1 className="text-xl font-semibold text-gray-900">Novo agendamento</h1>
          <p className="mt-1 text-sm text-gray-500">Selecione veículo, serviço e horário. Se necessário, cadastre um veículo abaixo.</p>
        </div>
        <div className="card-body space-y-6">
          {/* Ações rápidas */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              className="btn-outline"
              onClick={async () => {
                try {
                  const last = await loadLast();
                  if (!last) { toast('Sem agendamentos anteriores'); return; }
                  setVehicleId(String(last.vehicle_id));
                  await loadServices({ vehicle_id: last.vehicle_id });
                  setServiceId(String(last.service_id));
                  toast.success('Dados preenchidos com base no último agendamento');
                } catch {}
              }}
            >Repetir último agendamento</button>
            <div className="text-sm text-gray-500">Selecione um horário sugerido abaixo</div>
          </div>

          {/* Seleção de veículo e serviço */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Veículo</label>
              <select className="input" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
                <option value="">Selecione</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.brand} {v.model} ({v.license_plate}){v.size ? ` • ${v.size}` : ''}{v.type_text ? ` • ${v.type_text}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Serviço {selectedVehicle?.size ? `(para ${selectedVehicle.size})` : ''}</label>
              <select className="input" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                <option value="">Selecione</option>
                {services.map(s => (
                  <option key={s.id} value={s.id}>{s.name}{selectedVehicle?.size ? ` (${selectedVehicle.size})` : ''} - R$ {Number(s.price).toFixed(2)}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Data</label>
                <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
                {suggested.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {suggested.slice(0,8).map(t => (
                      <button key={t} type="button" className={`px-3 py-1 rounded border ${time===t ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-300'}`} onClick={() => setTime(t)}>
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="label">Hora</label>
                <input type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">Forma de pagamento</label>
              <div className="flex gap-2">
                {[
                  { key: 'pix', label: 'PIX', disabled: true },
                  { key: 'cartao', label: 'Cartão', disabled: true },
                  { key: 'dinheiro', label: 'Dinheiro', disabled: false },
                ].map(opt => (
                  <button
                    type="button"
                    key={opt.key}
                    disabled={opt.disabled}
                    title={opt.disabled ? 'Em manutenção' : ''}
                    onClick={() => { if (!opt.disabled) setPaymentMethod(opt.key); }}
                    className={`px-3 py-2 rounded border ${
                      paymentMethod===opt.key && !opt.disabled ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-300'
                    } ${opt.disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    {opt.label}
                    {opt.disabled && <span className="ml-2 text-xs">(em manutenção)</span>}
                  </button>
                ))}
              </div>
              <p className="text-xs text-warning-600 mt-1">
                PIX e Cartão estão em manutenção no momento. Utilize "Dinheiro" para concluir o agendamento.
              </p>
            </div>
            <div className="flex gap-3">
              <button type="button" className="btn-outline w-1/2" onClick={() => navigate('/portal/history')}>Cancelar</button>
              <button type="submit" className="btn-primary w-1/2" disabled={loading}>{loading ? 'Agendando...' : 'Agendar'}</button>
            </div>
          </form>

          {/* Cadastro rápido de veículo (essencial) */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Cadastrar veículo</h2>
            <form onSubmit={handleCreateVehicle} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Placa *</label>
                <input className="input" value={newVeh.license_plate} onChange={(e) => setNewVeh({ ...newVeh, license_plate: normalizePlate(e.target.value) })} placeholder="ABC-1D23 ou ABC-1234" />
              </div>
              <div>
                <label className="label">Marca *</label>
                <input list="brands" className="input" value={newVeh.brand} onChange={(e) => setNewVeh({ ...newVeh, brand: e.target.value })} placeholder="Ex.: Chevrolet" />
                <datalist id="brands">
                  {COMMON_BRANDS.map(b => (<option key={b} value={b} />))}
                </datalist>
              </div>
              <div>
                <label className="label">Modelo *</label>
                <input list="models" className="input" value={newVeh.model} onChange={(e) => setNewVeh({ ...newVeh, model: e.target.value })} placeholder="Ex.: Celta, Gol, Range Rover" />
                <datalist id="models">
                  {COMMON_MODELS.map(m => (<option key={m} value={m} />))}
                </datalist>
              </div>
              <div>
                <label className="label">Tamanho *</label>
                <div className="flex gap-2">
                  {['Pequeno','Médio','Grande'].map(sz => (
                    <button type="button" key={sz} className={`px-3 py-2 rounded border ${newVeh.size === sz ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-300'}`} onClick={() => setNewVeh({ ...newVeh, size: sz })}>
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Cor</label>
                <input className="input" value={newVeh.color} onChange={(e) => setNewVeh({ ...newVeh, color: e.target.value })} />
              </div>
              <div>
                <label className="label">Ano</label>
                <input className="input" type="number" value={newVeh.year} onChange={(e) => setNewVeh({ ...newVeh, year: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <button className="btn-secondary w-full" type="submit">Salvar veículo</button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PortalNewSchedule;
