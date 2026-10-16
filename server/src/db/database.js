import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DATABASE_FILE || path.join(dataDir, 'campuslands.db');

export const db = new Database(dbPath);

// Enable foreign keys & WAL mode for performance & integrity
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS spaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      capacity INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'DISPONIBLE',
      location TEXT,
      equipment_summary TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY,
      space_id TEXT NOT NULL,
      title TEXT NOT NULL,
      responsible_name TEXT NOT NULL,
      responsible_email TEXT,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      attendees_count INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'CONFIRMADA',
      purpose TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      serial_number TEXT UNIQUE,
      status TEXT NOT NULL DEFAULT 'DISPONIBLE',
      condition_notes TEXT,
      assigned_location TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS loans (
      id TEXT PRIMARY KEY,
      asset_id TEXT NOT NULL,
      borrower_name TEXT NOT NULL,
      borrower_role TEXT NOT NULL,
      borrower_id_card TEXT NOT NULL,
      loan_date TEXT NOT NULL,
      expected_return_date TEXT NOT NULL,
      return_date TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVO',
      initial_condition TEXT,
      return_condition TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      location_or_space_id TEXT,
      category TEXT NOT NULL,
      priority TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ABIERTA',
      responsible_area TEXT NOT NULL,
      reported_by TEXT NOT NULL,
      ai_classification TEXT,
      ai_status TEXT NOT NULL DEFAULT 'PENDIENTE',
      solution_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME,
      closed_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      actor TEXT NOT NULL DEFAULT 'OPERADOR',
      details TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_reservations_space_date ON reservations(space_id, date, status);
    CREATE INDEX IF NOT EXISTS idx_loans_asset_status ON loans(asset_id, status);
    CREATE INDEX IF NOT EXISTS idx_incidents_status_priority ON incidents(status, priority);
  `);

  // Check if spaces is empty, if so, seed from default JSON
  const countSpaces = db.prepare('SELECT COUNT(*) as count FROM spaces').get();
  if (countSpaces.count === 0) {
    seedFromDefault();
  }
}

export function seedFromDefault() {
  const defaultPath = path.join(dataDir, 'default_campuslands_data.json');
  if (!fs.existsSync(defaultPath)) return;

  const raw = fs.readFileSync(defaultPath, 'utf-8');
  const data = JSON.parse(raw);

  const insertSpace = db.prepare(`
    INSERT OR REPLACE INTO spaces (id, name, type, capacity, status, location, equipment_summary)
    VALUES (@id, @name, @type, @capacity, @status, @location, @equipment_summary)
  `);

  const insertAsset = db.prepare(`
    INSERT OR REPLACE INTO assets (id, name, category, serial_number, status, condition_notes, assigned_location)
    VALUES (@id, @name, @category, @serial_number, @status, @condition_notes, @assigned_location)
  `);

  const insertReservation = db.prepare(`
    INSERT OR REPLACE INTO reservations (id, space_id, title, responsible_name, responsible_email, date, start_time, end_time, attendees_count, purpose, status)
    VALUES (@id, @space_id, @title, @responsible_name, @responsible_email, @date, @start_time, @end_time, @attendees_count, @purpose, @status)
  `);

  const insertLoan = db.prepare(`
    INSERT OR REPLACE INTO loans (id, asset_id, borrower_name, borrower_role, borrower_id_card, loan_date, expected_return_date, return_date, status, initial_condition, return_condition, notes)
    VALUES (@id, @asset_id, @borrower_name, @borrower_role, @borrower_id_card, @loan_date, @expected_return_date, @return_date, @status, @initial_condition, @return_condition, @notes)
  `);

  const insertIncident = db.prepare(`
    INSERT OR REPLACE INTO incidents (id, title, description, location_or_space_id, category, priority, status, responsible_area, reported_by, ai_classification, ai_status, solution_notes)
    VALUES (@id, @title, @description, @location_or_space_id, @category, @priority, @status, @responsible_area, @reported_by, @ai_classification, @ai_status, @solution_notes)
  `);

  const seedTransaction = db.transaction(() => {
    if (data.spaces) for (const s of data.spaces) insertSpace.run(s);
    if (data.assets) for (const a of data.assets) insertAsset.run(a);
    if (data.reservations) for (const r of data.reservations) insertReservation.run(r);
    if (data.loans) for (const l of data.loans) insertLoan.run(l);
    if (data.incidents) for (const i of data.incidents) insertIncident.run(i);

    db.prepare(`
      INSERT INTO audit_logs (entity_type, entity_id, action, actor, details)
      VALUES ('SISTEMA', 'INIT', 'CARGA_INICIAL', 'SISTEMA', 'Carga de datos oficiales de Campuslands realizada exitosamente')
    `).run();
  });

  seedTransaction();
}

export default db;
