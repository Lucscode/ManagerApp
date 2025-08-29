const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'manager_app.db');
const db = new sqlite3.Database(dbPath);

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
    // Inserir usuário administrador padrão
    const adminPassword = bcrypt.hashSync('admin123', 10);
    db.run(`
      INSERT OR IGNORE INTO users (name, email, password, role) 
      VALUES (?, ?, ?, ?)
    `, ['Administrador', 'admin@managerapp.com', adminPassword, 'admin']);

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

    // Inserir configurações padrão
    const settings = [
      ['business_hours_start', '08:00', 'Horário de início do expediente'],
      ['business_hours_end', '18:00', 'Horário de fim do expediente'],
      ['max_concurrent_appointments', '3', 'Máximo de agendamentos simultâneos'],
      ['appointment_interval', '30', 'Intervalo entre agendamentos (minutos)'],
      ['timezone', 'America/Sao_Paulo', 'Fuso horário do estabelecimento']
    ];

    settings.forEach(([key, value, description]) => {
      db.run(`
        INSERT OR IGNORE INTO settings (key, value, description) 
        VALUES (?, ?, ?)
      `, [key, value, description]);
    });

    resolve();
  });
}

// Função para executar queries
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Função para executar uma única query
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

// Função para obter uma única linha
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

