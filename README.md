# ManagerApp - Sistema de Gerenciamento para Lava-Rápido

Sistema completo de gerenciamento para lava-rápido, desenvolvido com React (frontend) e Node.js (backend).

## Integração de Pagamentos - Mercado Pago (Guia)

> Este guia descreve como habilitar PIX (QR dinâmico com expiração) e Cartão de Crédito. Não armazene dados sensíveis no repositório.

### 1) Criar credenciais
- Acesse o painel do Mercado Pago → Suas Credenciais
- Copie:
  - Public Key (para o frontend)
  - Access Token (para o backend)

### 2) Configurar .env
No arquivo `server/.env` (copiar de `env.example`), preencha:
```
MP_PUBLIC_KEY=APP_USR-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MP_ACCESS_TOKEN=APP_USR-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MP_WEBHOOK_URL=https://sua-api.com/api/payments/webhook
MP_WEBHOOK_SECRET=um-segredo-forte-para-validacao
```

### 3) Endpoints previstos (a implementar quando credenciais disponíveis)
Backend (server):
- `POST /api/payments/pix/create`
  - body: `{ schedule_id }` ou `{ amount, description }`
  - resposta: `{ qr_base64, qr_data, expires_at }`
- `POST /api/payments/card/charge`
  - body: `{ schedule_id, card: { number, exp_month, exp_year, cvv, holder_name, doc_number } }`
  - resposta: `{ status: 'approved'|'rejected'|'in_process', id }`
- `POST /api/payments/webhook` (configurar no painel MP)
  - valida evento de pagamento; ao `approved`, marcar agendamento como `paid` (`amount_paid`, `paid_at`)

### 4) Fluxo no Portal do Cliente
- PIX: ao agendar e escolher PIX, exibir modal com QR Code `qr_base64` e contador de 10 minutos; botão “Verificar pagamento”.
- Cartão: exibir formulário seguro; enviar para `/card/charge`.
- Após pagamento aprovado, status do agendamento muda automaticamente para `Pago` no painel.

### 5) Segurança
- Usar `MP_WEBHOOK_SECRET` para validar chamadas do webhook.
- Não expor o `MP_ACCESS_TOKEN` no frontend.
- Habilitar HTTPS em produção.

### 6) Testes
- Use o modo sandbox do Mercado Pago para simular pagamentos.
- Faça um pagamento PIX e um de cartão; verifique a atualização automática do status.

## Deploy (resumo)
- Backend: NODE_ENV=production, JWT_SECRET forte, CLIENT_URL de produção, rate-limit habilitado.
- Frontend: build com `npm run build`, servido estático.
- Banco: migração/seed prontos; backup diário recomendado.

## 🚀 Funcionalidades

### ✅ Fase 1 - MVP Base Operacional Interna

#### 1. Autenticação e Usuários
- Sistema de login seguro para Administradores e Funcionários
- Controle de acesso baseado em roles (admin/employee)
- Gerenciamento de usuários (apenas administradores)

#### 2. Cadastros Essenciais (CRUD)
- **Clientes**: Nome, contato, observações
- **Veículos**: Placa, modelo, marca, cor (sempre associado a um cliente)
- **Serviços**: Tipos de lavagem com sistema de preços por porte de veículo

#### 3. Módulo de Agendamento Interno
- Calendário visual para uso exclusivo da equipe
- Funcionalidade para criar, editar e cancelar agendamentos manualmente
- Suporte para múltiplos agendamentos no mesmo horário (vagas/boxes)
- Verificação de disponibilidade de horários
- Controle de status dos agendamentos

## 🛠️ Tecnologias Utilizadas

### Backend
- **Node.js** com Express
- **SQLite** como banco de dados
- **JWT** para autenticação
- **bcryptjs** para criptografia de senhas
- **moment-timezone** para manipulação de datas (timezone Brasília)
- **Helmet** e **CORS** para segurança

### Frontend
- **React 18** com hooks
- **React Router** para navegação
- **Tailwind CSS** para estilização
- **React Hook Form** para formulários
- **Axios** para requisições HTTP
- **React Hot Toast** para notificações
- **Lucide React** para ícones
- **date-fns** para manipulação de datas

## 📋 Pré-requisitos

- Node.js 16+ 
- npm ou yarn
_______________________________________________________________________
✅ Debounce implementado nas buscas de Veículos e Clientes
✅ Conflito de nomes corrigido no componente Users
✅ Rate limiting desabilitado para desenvolvimento
✅ Dependências adicionadas (react-hook-form, react-hot-toast)
✅ Tratamento de erros melhorado no backend
