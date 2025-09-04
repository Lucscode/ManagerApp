const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'manager_app.db');
const db = new sqlite3.Database(dbPath);

function runSilently(sql) {
  db.run(sql, (err) => {
    if (err) {
      // Ignora erros de criação quando a coluna já existe ou tabela existente
      if (process.env.NODE_ENV === 'development') {
        // console.debug('Ignorado:', err.message);
      }
    }
  });
}

async function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Tabela de usuários (Administradores e Funcionários)
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('admin', 'employee')),
          active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabela de clientes
      db.run(`
        CREATE TABLE IF NOT EXISTS clients (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          phone TEXT,
          email TEXT,
          notes TEXT,
          active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      // Adiciona coluna whatsapp_opt_in (se ainda não existir)
      runSilently(`ALTER TABLE clients ADD COLUMN whatsapp_opt_in BOOLEAN DEFAULT 0`);

      // Tabela de veículos
      db.run(`
        CREATE TABLE IF NOT EXISTS vehicles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          client_id INTEGER NOT NULL,
          license_plate TEXT NOT NULL,
          model TEXT NOT NULL,
          brand TEXT NOT NULL,
          color TEXT NOT NULL,
          year INTEGER,
          active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE
        )
      `);

      // Tabela de tipos de veículo (porte)
      db.run(`
        CREATE TABLE IF NOT EXISTS vehicle_types (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          active BOOLEAN DEFAULT 1
        )
      `);

      // Tabela de serviços
      db.run(`
        CREATE TABLE IF NOT EXISTS services (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          vehicle_type_id INTEGER NOT NULL,
          price DECIMAL(10,2) NOT NULL,
          duration_minutes INTEGER DEFAULT 30,
          active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (vehicle_type_id) REFERENCES vehicle_types (id)
        )
      `);

      // Tabela de agendamentos
      db.run(`
        CREATE TABLE IF NOT EXISTS schedules (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          client_id INTEGER NOT NULL,
          vehicle_id INTEGER NOT NULL,
          service_id INTEGER NOT NULL,
          scheduled_date DATE NOT NULL,
          scheduled_time TIME NOT NULL,
          status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
          notes TEXT,
          created_by INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (client_id) REFERENCES clients (id),
          FOREIGN KEY (vehicle_id) REFERENCES vehicles (id),
          FOREIGN KEY (service_id) REFERENCES services (id),
          FOREIGN KEY (created_by) REFERENCES users (id)
        )
      `);

      // Tabela de configurações do sistema
      db.run(`
        CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT UNIQUE NOT NULL,
          value TEXT NOT NULL,
          description TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabelas de BI e Fidelização
      db.run(`
        CREATE TABLE IF NOT EXISTS daily_metrics (
          date TEXT PRIMARY KEY,
          revenue REAL DEFAULT 0,
          total_services INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          client_id INTEGER NOT NULL,
          schedule_id INTEGER NOT NULL,
          channel TEXT NOT NULL,
          status TEXT NOT NULL,
          attempts INTEGER DEFAULT 0,
          sent_at DATETIME,
          error TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (client_id) REFERENCES clients (id),
          FOREIGN KEY (schedule_id) REFERENCES schedules (id)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS customer_accounts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          client_id INTEGER NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (client_id) REFERENCES clients (id)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS roles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS permissions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS role_permissions (
          role_id INTEGER NOT NULL,
          permission_id INTEGER NOT NULL,
          PRIMARY KEY (role_id, permission_id),
          FOREIGN KEY (role_id) REFERENCES roles (id),
          FOREIGN KEY (permission_id) REFERENCES permissions (id)
        )
      `);

      // Índices úteis
      runSilently(`CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules(scheduled_date)`);
      runSilently(`CREATE INDEX IF NOT EXISTS idx_services_name ON services(name)`);
      runSilently(`CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON vehicles(license_plate)`);

      // Inserir dados iniciais
      insertInitialData()
        .then(() => {
          console.log('✅ Dados iniciais inseridos com sucesso');
          resolve();
        })
        .catch(reject);
    });
  });
}

async function insertInitialData() {
  return new Promise((resolve, reject) => {
    // Inserir/atualizar usuário administrador padrão
    const adminEmail = 'lucasalexandredmpereira@gmail.com';
    const adminPassword = bcrypt.hashSync('Senh@123', 10);

    // Insere o admin com o email informado, caso ainda não exista
    db.run(`
      INSERT OR IGNORE INTO users (name, email, password, role) 
      VALUES (?, ?, ?, ?)
    `, ['Administrador', adminEmail, adminPassword, 'admin']);

    // Se já existir um usuário com esse email, apenas garante a senha atualizada
    db.run(`
      UPDATE users
      SET password = ?
      WHERE email = ? AND role = 'admin'
    `, [adminPassword, adminEmail]);

    // Inserir tipos de veículo
    const vehicleTypes = [
      ['Pequeno', 'Carros compactos, motos'],
      ['Médio', 'Sedans, SUVs pequenos'],
      ['Grande', 'SUVs grandes, vans, caminhões pequenos']
    ];

    vehicleTypes.forEach(([name, description]) => {
      db.run(`
        INSERT OR IGNORE INTO vehicle_types (name, description) 
        VALUES (?, ?)
      `, [name, description]);
    });

    // Inserir serviços padrão
    db.run(`
      INSERT OR IGNORE INTO services (name, description, vehicle_type_id, price, duration_minutes) 
      VALUES 
        ('Lavagem Simples', 'Lavagem externa básica', 1, 25.00, 30),
        ('Lavagem Simples', 'Lavagem externa básica', 2, 35.00, 45),
        ('Lavagem Simples', 'Lavagem externa básica', 3, 50.00, 60),
        ('Lavagem Completa', 'Lavagem externa e interna', 1, 40.00, 45),
        ('Lavagem Completa', 'Lavagem externa e interna', 2, 55.00, 60),
        ('Lavagem Completa', 'Lavagem externa e interna', 3, 75.00, 90)
    `);

    resolve();
  });
}

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

module.exports = {
  db,
  initializeDatabase,
  query,
  run,
  get
};

