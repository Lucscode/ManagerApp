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
