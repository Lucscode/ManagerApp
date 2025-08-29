# 🚀 Guia de Instalação Rápida - ManagerApp

## 📋 Pré-requisitos

- Node.js 16+ instalado
- npm ou yarn

## ⚡ Instalação em 5 Passos

### 1. Clone e entre no projeto
```bash
git clone <url-do-repositorio>
cd ManagerApp
```

### 2. Instale todas as dependências
```bash
npm run install-all
```

### 3. Configure o ambiente
```bash
cd server
cp env.example .env
```

### 4. Execute o projeto
```bash
npm run dev
```

### 5. Acesse a aplicação
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5000

## 🔐 Credenciais de Acesso

Após a primeira execução, use:
- **Email**: admin@managerapp.com
- **Senha**: admin123

## 🛠️ Comandos Úteis

### Executar tudo de uma vez
```bash
npm run dev
```

### Executar separadamente

**Backend:**
```bash
cd server
npm run dev
```

**Frontend:**
```bash
cd client
npm start
```

### Build para produção
```bash
npm run build
```

## 📁 Estrutura do Projeto

```
ManagerApp/
├── server/          # Backend Node.js
├── client/          # Frontend React
├── package.json     # Scripts principais
└── README.md        # Documentação completa
```

## 🔧 Solução de Problemas

### Erro de porta em uso
- Backend: Altere `PORT=5000` no arquivo `.env`
- Frontend: Altere `"proxy"` no `client/package.json`

### Erro de dependências
```bash
rm -rf node_modules package-lock.json
npm install
```

### Banco de dados corrompido
```bash
cd server
rm database/manager_app.db
npm run dev
```

## 📞 Suporte

Em caso de problemas, consulte o `README.md` completo ou entre em contato com a equipe de desenvolvimento.

---

**✅ Sistema pronto para uso!**

