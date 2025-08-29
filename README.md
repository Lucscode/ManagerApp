# ManagerApp - Sistema de Gerenciamento para Lava-Rápido

Sistema completo de gerenciamento para lava-rápido, desenvolvido com React (frontend) e Node.js (backend), seguindo as especificações da Fase 1 do MVP.

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

## 🚀 Instalação e Configuração

### 1. Clone o repositório
```bash
git clone <url-do-repositorio>
cd ManagerApp
```

### 2. Instale as dependências
```bash
# Instalar dependências do projeto principal
npm install

# Instalar dependências do backend
cd server
npm install

# Instalar dependências do frontend
cd ../client
npm install

# Voltar para a raiz
cd ..
```

### 3. Configure as variáveis de ambiente

#### Backend (server/env.example → server/.env)
```bash
cd server
cp env.example .env
```

Edite o arquivo `.env`:
```env
# Configurações do Servidor
PORT=5000
NODE_ENV=development

# Configurações de Segurança
JWT_SECRET=sua-chave-secreta-muito-segura-aqui
CLIENT_URL=http://localhost:3000

# Configurações do Banco de Dados
DB_PATH=./database/manager_app.db

# Configurações de Timezone
TZ=America/Sao_Paulo
```

### 4. Execute o projeto

#### Opção 1: Executar tudo de uma vez
```bash
npm run dev
```

#### Opção 2: Executar separadamente

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd client
npm start
```

### 5. Acesse a aplicação

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

## 🔐 Credenciais Padrão

Após a primeira execução, o sistema criará automaticamente um usuário administrador:

- **Email**: admin@managerapp.com
- **Senha**: admin123

## 📊 Estrutura do Banco de Dados

O sistema utiliza SQLite com as seguintes tabelas:

- **users**: Usuários do sistema (admin/employee)
- **clients**: Cadastro de clientes
- **vehicles**: Veículos dos clientes
- **vehicle_types**: Tipos de veículo (Pequeno, Médio, Grande)
- **services**: Serviços oferecidos com preços por tipo de veículo
- **schedules**: Agendamentos
- **settings**: Configurações do sistema

## 🎯 Funcionalidades Detalhadas

### Dashboard
- Visão geral do sistema
- Estatísticas de agendamentos
- Faturamento mensal
- Próximos agendamentos

### Gestão de Clientes
- Cadastro completo de clientes
- Busca e filtros
- Histórico de veículos por cliente
- Soft delete (não exclui registros com relacionamentos)

### Gestão de Veículos
- Cadastro de veículos vinculados a clientes
- Validação de placa única
- Informações completas (marca, modelo, cor, ano)

### Gestão de Serviços
- Cadastro de tipos de veículo
- Configuração de preços por tipo
- Duração estimada dos serviços
- Controle de serviços ativos/inativos

### Agendamentos
- Calendário visual
- Verificação de disponibilidade
- Controle de conflitos de horário
- Status: Agendado, Em Andamento, Concluído, Cancelado
- Horário de funcionamento: 8h às 18h (segunda a sexta)

## 🔧 Configurações do Sistema

### Horário de Funcionamento
- **Início**: 08:00
- **Fim**: 18:00
- **Dias**: Segunda a sexta (não atende finais de semana)

### Timezone
- **Fuso horário**: America/Sao_Paulo (UTC-3)
- **Formato de exibição**: 24 horas

### Validações
- Agendamentos apenas em dias úteis
- Horários dentro do expediente
- Verificação de conflitos de horário
- Validação de relacionamentos (cliente-veículo)

## 📱 Responsividade

O sistema é totalmente responsivo e funciona em:
- Desktop
- Tablet
- Mobile

## 🔒 Segurança

- Autenticação JWT
- Senhas criptografadas com bcrypt
- Controle de acesso por roles
- Headers de segurança (Helmet)
- Rate limiting
- Validação de dados

## 🚀 Deploy

### Backend
```bash
cd server
npm run build
npm start
```

### Frontend
```bash
cd client
npm run build
```

## 📝 API Endpoints

### Autenticação
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Dados do usuário logado
- `GET /api/auth/users` - Listar usuários (admin)
- `POST /api/auth/users` - Criar usuário (admin)
- `PUT /api/auth/users/:id` - Atualizar usuário (admin)

### Clientes
- `GET /api/clients` - Listar clientes
- `GET /api/clients/:id` - Buscar cliente
- `POST /api/clients` - Criar cliente
- `PUT /api/clients/:id` - Atualizar cliente
- `DELETE /api/clients/:id` - Excluir cliente

### Veículos
- `GET /api/vehicles` - Listar veículos
- `GET /api/vehicles/:id` - Buscar veículo
- `POST /api/vehicles` - Criar veículo
- `PUT /api/vehicles/:id` - Atualizar veículo
- `DELETE /api/vehicles/:id` - Excluir veículo

### Serviços
- `GET /api/services` - Listar serviços
- `GET /api/services/vehicle-types` - Listar tipos de veículo
- `POST /api/services` - Criar serviço
- `PUT /api/services/:id` - Atualizar serviço
- `DELETE /api/services/:id` - Excluir serviço

### Agendamentos
- `GET /api/schedule` - Listar agendamentos
- `GET /api/schedule/:id` - Buscar agendamento
- `POST /api/schedule` - Criar agendamento
- `PUT /api/schedule/:id` - Atualizar agendamento
- `DELETE /api/schedule/:id` - Excluir agendamento
- `GET /api/schedule/available-times/:date` - Horários disponíveis
- `GET /api/schedule/stats/overview` - Estatísticas

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 🆘 Suporte

Para suporte, entre em contato através dos canais disponibilizados pela equipe de desenvolvimento.

---

**Desenvolvido com ❤️ para otimizar a gestão de lava-rápidos**

