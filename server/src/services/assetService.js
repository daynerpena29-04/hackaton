import db from '../db/database.js';
import {
  validateAssetAvailability,
  validateLoanReturn
} from '../rules/businessRules.js';
import { logAudit } from './auditService.js';

export function listAssets(filters = {}) {
  let query = 'SELECT * FROM assets WHERE 1=1';
  const params = [];

  if (filters.category) {
    query += ' AND category = ?';
    params.push(filters.category);
  }
  if (filters.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters.search) {
    query += ' AND (name LIKE ? OR serial_number LIKE ? OR assigned_location LIKE ?)';
    const term = `%${filters.search}%`;
    params.push(term, term, term);
  }

  query += ' ORDER BY name ASC';
  return db.prepare(query).all(...params);
}

export function getAssetById(id) {
  return db.prepare('SELECT * FROM assets WHERE id = ?').get(id);
}

export function createAsset(data) {
  const {
    id = `EQ-${Date.now().toString().slice(-5)}`,
    name,
    category,
    serial_number,
    status = 'DISPONIBLE',
    condition_notes,
    assigned_location
  } = data;

  if (!id || !name || !category) {
    const err = new Error('Campos obligatorios faltantes: id, name, category son requeridos.');
    err.statusCode = 400;
    throw err;
  }

  const existing = getAssetById(id);
  if (existing) {
    const err = new Error(`El código de equipo '${id}' ya existe.`);
    err.statusCode = 409;
    throw err;
  }

  const stmt = db.prepare(`
    INSERT INTO assets (id, name, category, serial_number, status, condition_notes, assigned_location)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, name, category, serial_number || null, status, condition_notes || null, assigned_location || null);
  logAudit('EQUIPO', id, 'CREAR', { name, category, status, serial_number });
  return getAssetById(id);
}

export function updateAsset(id, data) {
  const asset = getAssetById(id);
  if (!asset) {
    const err = new Error(`Equipo con id '${id}' no encontrado.`);
    err.statusCode = 404;
    throw err;
  }

  const updatedName = data.name ?? asset.name;
  const updatedCategory = data.category ?? asset.category;
  const updatedSerial = data.serial_number ?? asset.serial_number;
  const updatedStatus = data.status ?? asset.status;
  const updatedNotes = data.condition_notes ?? asset.condition_notes;
  const updatedLocation = data.assigned_location ?? asset.assigned_location;

  const stmt = db.prepare(`
    UPDATE assets
    SET name = ?, category = ?, serial_number = ?, status = ?, condition_notes = ?, assigned_location = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  stmt.run(updatedName, updatedCategory, updatedSerial, updatedStatus, updatedNotes, updatedLocation, id);
  logAudit('EQUIPO', id, 'MODIFICAR', { from: asset, to: data });
  return getAssetById(id);
}

export function listLoans(filters = {}) {
  let query = `
    SELECT l.*, a.name as asset_name, a.category as asset_category, a.serial_number as asset_serial
    FROM loans l
    JOIN assets a ON l.asset_id = a.id
    WHERE 1=1
  `;
  const params = [];

  if (filters.status) {
    query += ' AND l.status = ?';
    params.push(filters.status);
  }
  if (filters.asset_id) {
    query += ' AND l.asset_id = ?';
    params.push(filters.asset_id);
  }
  if (filters.borrower_role) {
    query += ' AND l.borrower_role = ?';
    params.push(filters.borrower_role);
  }

  query += ' ORDER BY l.created_at DESC';
  return db.prepare(query).all(...params);
}

/**
 * REGLA 4 & REGLA 5: Préstamo de equipo con validación de disponibilidad y trazabilidad
 */
export function loanAsset(assetId, loanData) {
  const {
    id = `LN-${Date.now().toString().slice(-6)}`,
    borrower_name,
    borrower_role = 'CAMPER',
    borrower_id_card,
    expected_return_date,
    notes = '',
    initial_condition
  } = loanData;

  if (!borrower_name || !borrower_id_card || !expected_return_date) {
    const err = new Error('Los datos del solicitante (nombre, documento) y fecha esperada de devolución son obligatorios.');
    err.statusCode = 400;
    throw err;
  }

  const asset = getAssetById(assetId);
  if (!asset) {
    const err = new Error(`Equipo con id '${assetId}' no encontrado.`);
    err.statusCode = 404;
    throw err;
  }

  // Verificar préstamos activos actuales
  const activeLoans = db.prepare(`SELECT * FROM loans WHERE asset_id = ? AND status = 'ACTIVO'`).all(assetId);

  // REGLA 4: Disponibilidad de equipos
  const rule4 = validateAssetAvailability(asset, activeLoans);
  if (!rule4.isValid) {
    const err = new Error(rule4.message);
    err.code = rule4.code;
    err.statusCode = 400;
    throw err;
  }

  // REGLA 5: Transacción atómica
  const loanTx = db.transaction(() => {
    const nowIso = new Date().toISOString().replace('T', ' ').substring(0, 16);

    db.prepare(`
      INSERT INTO loans (id, asset_id, borrower_name, borrower_role, borrower_id_card, loan_date, expected_return_date, status, initial_condition, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVO', ?, ?)
    `).run(id, assetId, borrower_name, borrower_role, borrower_id_card, nowIso, expected_return_date, initial_condition || asset.condition_notes || 'Buen estado', notes);

    db.prepare(`
      UPDATE assets
      SET status = 'PRESTADO', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(assetId);

    logAudit('PRESTAMO', id, 'CREAR_PRESTAMO', {
      asset_id: assetId,
      asset_name: asset.name,
      borrower: borrower_name,
      role: borrower_role,
      doc: borrower_id_card
    });
  });

  loanTx();
  return db.prepare('SELECT * FROM loans WHERE id = ?').get(id);
}

/**
 * REGLA 5: Devolución de equipo con verificación de integridad y actualización de estado
 */
export function returnAsset(loanId, returnData = {}) {
  const {
    return_condition = 'Operativo y sin novedades',
    notes = '',
    new_asset_status = 'DISPONIBLE'
  } = returnData;

  const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(loanId);
  if (!loan) {
    const err = new Error(`Préstamo con id '${loanId}' no encontrado.`);
    err.statusCode = 404;
    throw err;
  }

  const asset = getAssetById(loan.asset_id);

  // REGLA 5: Integridad de devolución
  const rule5 = validateLoanReturn(loan, asset);
  if (!rule5.isValid) {
    const err = new Error(rule5.message);
    err.code = rule5.code;
    err.statusCode = 400;
    throw err;
  }

  const returnTx = db.transaction(() => {
    const nowIso = new Date().toISOString().replace('T', ' ').substring(0, 16);

    db.prepare(`
      UPDATE loans
      SET status = 'DEVUELTO', return_date = ?, return_condition = ?, notes = CASE WHEN ? != '' THEN notes || ' | Devolución: ' || ? ELSE notes END
      WHERE id = ?
    `).run(nowIso, return_condition, notes, notes, loanId);

    db.prepare(`
      UPDATE assets
      SET status = ?, condition_notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(new_asset_status, return_condition, loan.asset_id);

    logAudit('PRESTAMO', loanId, 'DEVOLVER_EQUIPO', {
      asset_id: loan.asset_id,
      return_condition,
      new_asset_status
    });
  });

  returnTx();
  return db.prepare('SELECT * FROM loans WHERE id = ?').get(loanId);
}
