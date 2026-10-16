import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import db from '../db/database.js';
import { logAudit } from './auditService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, '../../data');
const backupsDir = path.join(dataDir, 'backups');

if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

/**
 * Crea una copia de seguridad en JSON antes de cualquier importación destructiva
 */
export function createDataBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `backup_campuslands_${timestamp}.json`;
  const backupFilePath = path.join(backupsDir, backupFileName);

  const spaces = db.prepare('SELECT * FROM spaces').all();
  const assets = db.prepare('SELECT * FROM assets').all();
  const reservations = db.prepare('SELECT * FROM reservations').all();
  const loans = db.prepare('SELECT * FROM loans').all();
  const incidents = db.prepare('SELECT * FROM incidents').all();

  const backupData = {
    createdAt: new Date().toISOString(),
    spaces,
    assets,
    reservations,
    loans,
    incidents
  };

  fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf-8');
  return backupFileName;
}

/**
 * Importa datos desde un archivo JSON (puede ser un bundle completo o un array específico)
 */
export function importFromJson(jsonString, entityType = 'auto', updateStrategy = 'UPDATE') {
  const backupFile = createDataBackup();
  let data;

  try {
    data = JSON.parse(jsonString);
  } catch (err) {
    throw new Error(`El archivo no tiene formato JSON válido: ${err.message}`);
  }

  const report = {
    backupFile,
    results: {}
  };

  if (Array.isArray(data)) {
    // Es un array de una entidad específica
    if (entityType === 'auto') {
      entityType = detectEntityType(data[0]);
    }
    report.results[entityType] = processEntityArray(entityType, data, updateStrategy);
  } else if (typeof data === 'object') {
    // Es un objeto bundle (e.g. { spaces: [...], assets: [...], incidents: [...] })
    const entities = ['spaces', 'assets', 'reservations', 'loans', 'incidents'];
    for (const ent of entities) {
      if (Array.isArray(data[ent])) {
        report.results[ent] = processEntityArray(ent, data[ent], updateStrategy);
      }
    }
  }

  logAudit('IMPORTACION', 'JSON', 'CARGAR_DATOS', { backup: backupFile, report });
  return report;
}

/**
 * Importa datos desde un archivo CSV con cabeceras
 */
export function importFromCsv(csvString, entityType, updateStrategy = 'UPDATE') {
  const backupFile = createDataBackup();

  let records;
  try {
    records = parse(csvString, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
  } catch (err) {
    throw new Error(`Error de sintaxis al procesar CSV: ${err.message}`);
  }

  const result = processEntityArray(entityType, records, updateStrategy);

  logAudit('IMPORTACION', `CSV_${entityType.toUpperCase()}`, 'CARGAR_DATOS', {
    backup: backupFile,
    total: result.totalProcessed,
    inserted: result.insertedCount,
    updated: result.updatedCount,
    errors: result.errorsCount
  });

  return {
    backupFile,
    entityType,
    result
  };
}

/**
 * Procesa y valida cada fila según el tipo de entidad
 */
function processEntityArray(entityType, records, updateStrategy = 'UPDATE') {
  const seenIds = new Set();
  const validRecords = [];
  const errors = [];
  let duplicatesInFile = 0;

  records.forEach((row, index) => {
    const rowNumber = index + 1;
    const id = (row.id || '').toString().trim();

    if (!id) {
      errors.push({ row: rowNumber, id: 'DESCONOCIDO', reason: 'Falta el identificador obligatorio (id).' });
      return;
    }

    if (seenIds.has(id)) {
      duplicatesInFile++;
      errors.push({ row: rowNumber, id, reason: `ID '${id}' duplicado dentro del mismo archivo.` });
      return;
    }
    seenIds.add(id);

    // Validaciones específicas de entidad
    const validation = validateEntityFields(entityType, row);
    if (!validation.isValid) {
      errors.push({ row: rowNumber, id, reason: validation.reason });
      return;
    }

    validRecords.push(validation.normalized);
  });

  // Guardado en la base de datos de manera transaccional
  let insertedCount = 0;
  let updatedCount = 0;

  const importTx = db.transaction(() => {
    for (const record of validRecords) {
      const existing = db.prepare(`SELECT id FROM ${entityType} WHERE id = ?`).get(record.id);

      if (existing) {
        if (updateStrategy === 'UPDATE') {
          updateRecordInDb(entityType, record);
          updatedCount++;
        }
      } else {
        insertRecordInDb(entityType, record);
        insertedCount++;
      }
    }
  });

  importTx();

  return {
    totalProcessed: records.length,
    validRecords: validRecords.length,
    errorsCount: errors.length,
    duplicatesInFile,
    insertedCount,
    updatedCount,
    errors
  };
}

function validateEntityFields(entityType, row) {
  const norm = { ...row };

  if (entityType === 'spaces') {
    if (!norm.name) return { isValid: false, reason: 'El campo "name" es obligatorio para espacios.' };
    const cap = parseInt(norm.capacity, 10);
    if (isNaN(cap) || cap <= 0) return { isValid: false, reason: 'El campo "capacity" debe ser un número entero mayor a cero.' };
    norm.capacity = cap;

    const validStatuses = ['DISPONIBLE', 'EN_MANTENIMIENTO', 'INHABILITADO', 'OCUPADO'];
    norm.status = (norm.status || 'DISPONIBLE').toUpperCase();
    if (!validStatuses.includes(norm.status)) {
      return { isValid: false, reason: `Estado '${norm.status}' desconocido. Válidos: ${validStatuses.join(', ')}` };
    }
    norm.type = (norm.type || 'AULA').toUpperCase();
    return { isValid: true, normalized: norm };
  }

  if (entityType === 'assets') {
    if (!norm.name) return { isValid: false, reason: 'El campo "name" es obligatorio para recursos.' };
    norm.category = (norm.category || 'OTRO').toUpperCase();
    const validStatuses = ['DISPONIBLE', 'PRESTADO', 'EN_MANTENIMIENTO', 'DANADO', 'INHABILITADO'];
    norm.status = (norm.status || 'DISPONIBLE').toUpperCase();
    if (!validStatuses.includes(norm.status)) {
      return { isValid: false, reason: `Estado de equipo '${norm.status}' no válido.` };
    }
    return { isValid: true, normalized: norm };
  }

  if (entityType === 'incidents') {
    if (!norm.title || !norm.description) {
      return { isValid: false, reason: 'Los campos "title" y "description" son obligatorios para incidencias.' };
    }
    norm.category = (norm.category || 'INFRAESTRUCTURA').toUpperCase();
    norm.priority = (norm.priority || 'MEDIA').toUpperCase();
    norm.status = (norm.status || 'ABIERTA').toUpperCase();
    norm.responsible_area = (norm.responsible_area || 'SOPORTE_TI').toUpperCase();
    norm.reported_by = norm.reported_by || 'Operador Campuslands';
    return { isValid: true, normalized: norm };
  }

  return { isValid: true, normalized: norm };
}

function insertRecordInDb(entityType, rec) {
  if (entityType === 'spaces') {
    db.prepare(`
      INSERT INTO spaces (id, name, type, capacity, status, location, equipment_summary)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(rec.id, rec.name, rec.type, rec.capacity, rec.status, rec.location || null, rec.equipment_summary || null);
  } else if (entityType === 'assets') {
    db.prepare(`
      INSERT INTO assets (id, name, category, serial_number, status, condition_notes, assigned_location)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(rec.id, rec.name, rec.category, rec.serial_number || null, rec.status, rec.condition_notes || null, rec.assigned_location || null);
  } else if (entityType === 'incidents') {
    db.prepare(`
      INSERT INTO incidents (id, title, description, location_or_space_id, category, priority, status, responsible_area, reported_by, solution_notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(rec.id, rec.title, rec.description, rec.location_or_space_id || null, rec.category, rec.priority, rec.status, rec.responsible_area, rec.reported_by, rec.solution_notes || null);
  }
}

function updateRecordInDb(entityType, rec) {
  if (entityType === 'spaces') {
    db.prepare(`
      UPDATE spaces
      SET name = ?, type = ?, capacity = ?, status = ?, location = ?, equipment_summary = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(rec.name, rec.type, rec.capacity, rec.status, rec.location || null, rec.equipment_summary || null, rec.id);
  } else if (entityType === 'assets') {
    db.prepare(`
      UPDATE assets
      SET name = ?, category = ?, serial_number = ?, status = ?, condition_notes = ?, assigned_location = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(rec.name, rec.category, rec.serial_number || null, rec.status, rec.condition_notes || null, rec.assigned_location || null, rec.id);
  } else if (entityType === 'incidents') {
    db.prepare(`
      UPDATE incidents
      SET title = ?, description = ?, location_or_space_id = ?, category = ?, priority = ?, status = ?, responsible_area = ?, solution_notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(rec.title, rec.description, rec.location_or_space_id || null, rec.category, rec.priority, rec.status, rec.responsible_area, rec.solution_notes || null, rec.id);
  }
}

function detectEntityType(sampleRow) {
  if (!sampleRow) return 'spaces';
  if ('capacity' in sampleRow) return 'spaces';
  if ('serial_number' in sampleRow || 'assigned_location' in sampleRow) return 'assets';
  if ('reported_by' in sampleRow || 'responsible_area' in sampleRow) return 'incidents';
  if ('attendees_count' in sampleRow) return 'reservations';
  if ('borrower_id_card' in sampleRow) return 'loans';
  return 'spaces';
}

/**
 * Restaura la base de datos a los datos oficiales base entregados por Campuslands
 */
export function restoreOfficialDefaults() {
  createDataBackup();
  const defaultPath = path.join(dataDir, 'default_campuslands_data.json');
  if (!fs.existsSync(defaultPath)) {
    throw new Error('Archivo de datos oficiales default_campuslands_data.json no encontrado.');
  }

  const raw = fs.readFileSync(defaultPath, 'utf-8');
  db.exec(`
    DELETE FROM reservations;
    DELETE FROM loans;
    DELETE FROM incidents;
    DELETE FROM assets;
    DELETE FROM spaces;
  `);

  const data = JSON.parse(raw);
  const insertSpace = db.prepare(`
    INSERT INTO spaces (id, name, type, capacity, status, location, equipment_summary)
    VALUES (@id, @name, @type, @capacity, @status, @location, @equipment_summary)
  `);
  const insertAsset = db.prepare(`
    INSERT INTO assets (id, name, category, serial_number, status, condition_notes, assigned_location)
    VALUES (@id, @name, @category, @serial_number, @status, @condition_notes, @assigned_location)
  `);
  const insertReservation = db.prepare(`
    INSERT INTO reservations (id, space_id, title, responsible_name, responsible_email, date, start_time, end_time, attendees_count, purpose, status)
    VALUES (@id, @space_id, @title, @responsible_name, @responsible_email, @date, @start_time, @end_time, @attendees_count, @purpose, @status)
  `);
  const insertLoan = db.prepare(`
    INSERT INTO loans (id, asset_id, borrower_name, borrower_role, borrower_id_card, loan_date, expected_return_date, return_date, status, initial_condition, return_condition, notes)
    VALUES (@id, @asset_id, @borrower_name, @borrower_role, @borrower_id_card, @loan_date, @expected_return_date, @return_date, @status, @initial_condition, @return_condition, @notes)
  `);
  const insertIncident = db.prepare(`
    INSERT INTO incidents (id, title, description, location_or_space_id, category, priority, status, responsible_area, reported_by, ai_classification, ai_status, solution_notes)
    VALUES (@id, @title, @description, @location_or_space_id, @category, @priority, @status, @responsible_area, @reported_by, @ai_classification, @ai_status, @solution_notes)
  `);

  const resetTx = db.transaction(() => {
    if (data.spaces) for (const s of data.spaces) insertSpace.run(s);
    if (data.assets) for (const a of data.assets) insertAsset.run(a);
    if (data.reservations) for (const r of data.reservations) insertReservation.run(r);
    if (data.loans) for (const l of data.loans) insertLoan.run(l);
    if (data.incidents) for (const i of data.incidents) insertIncident.run(i);

    logAudit('SISTEMA', 'RESET', 'RESTAURAR_OFICIALES', 'Datos oficiales de Campuslands restablecidos con éxito.');
  });

  resetTx();
  return { message: 'Datos oficiales restaurados con éxito' };
}
