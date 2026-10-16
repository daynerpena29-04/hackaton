import db from '../db/database.js';
import {
  validateCapacity,
  validateScheduleOverlap,
  validateSpaceOperationalStatus
} from '../rules/businessRules.js';
import { logAudit } from './auditService.js';

export function listSpaces(filters = {}) {
  let query = 'SELECT * FROM spaces WHERE 1=1';
  const params = [];

  if (filters.type) {
    query += ' AND type = ?';
    params.push(filters.type);
  }
  if (filters.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters.search) {
    query += ' AND (name LIKE ? OR location LIKE ? OR equipment_summary LIKE ?)';
    const term = `%${filters.search}%`;
    params.push(term, term, term);
  }

  query += ' ORDER BY name ASC';
  return db.prepare(query).all(...params);
}

export function getSpaceById(id) {
  return db.prepare('SELECT * FROM spaces WHERE id = ?').get(id);
}

export function createSpace(data) {
  const { id, name, type, capacity, status = 'DISPONIBLE', location, equipment_summary } = data;
  
  if (!id || !name || !type || !capacity) {
    throw new Error('Campos obligatorios faltantes: id, name, type, capacity son requeridos.');
  }

  const existing = getSpaceById(id);
  if (existing) {
    throw new Error(`El código de espacio '${id}' ya se encuentra registrado.`);
  }

  const stmt = db.prepare(`
    INSERT INTO spaces (id, name, type, capacity, status, location, equipment_summary)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, name, type, capacity, status, location || null, equipment_summary || null);
  logAudit('ESPACIO', id, 'CREAR', { name, type, capacity, status });
  return getSpaceById(id);
}

export function updateSpace(id, data) {
  const space = getSpaceById(id);
  if (!space) {
    throw new Error(`Espacio con id '${id}' no encontrado.`);
  }

  const updatedName = data.name ?? space.name;
  const updatedType = data.type ?? space.type;
  const updatedCapacity = data.capacity ?? space.capacity;
  const updatedStatus = data.status ?? space.status;
  const updatedLocation = data.location ?? space.location;
  const updatedEquipment = data.equipment_summary ?? space.equipment_summary;

  const stmt = db.prepare(`
    UPDATE spaces
    SET name = ?, type = ?, capacity = ?, status = ?, location = ?, equipment_summary = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  stmt.run(updatedName, updatedType, updatedCapacity, updatedStatus, updatedLocation, updatedEquipment, id);
  logAudit('ESPACIO', id, 'MODIFICAR', { from: space, to: data });
  return getSpaceById(id);
}

export function listReservations(filters = {}) {
  let query = `
    SELECT r.*, s.name as space_name, s.capacity as space_capacity, s.location as space_location
    FROM reservations r
    JOIN spaces s ON r.space_id = s.id
    WHERE 1=1
  `;
  const params = [];

  if (filters.space_id) {
    query += ' AND r.space_id = ?';
    params.push(filters.space_id);
  }
  if (filters.date) {
    query += ' AND r.date = ?';
    params.push(filters.date);
  }
  if (filters.status) {
    query += ' AND r.status = ?';
    params.push(filters.status);
  }

  query += ' ORDER BY r.date DESC, r.start_time ASC';
  return db.prepare(query).all(...params);
}

export function createReservation(reservationData) {
  const {
    id = `RSV-${Date.now().toString().slice(-6)}`,
    space_id,
    title,
    responsible_name,
    responsible_email,
    date,
    start_time,
    end_time,
    attendees_count,
    purpose
  } = reservationData;

  if (!space_id || !title || !responsible_name || !date || !start_time || !end_time || !attendees_count) {
    const err = new Error('Todos los campos de la reserva son obligatorios (espacio, título, responsable, fecha, horas, aforo).');
    err.statusCode = 400;
    throw err;
  }

  const space = getSpaceById(space_id);
  if (!space) {
    const err = new Error(`Espacio con id '${space_id}' no encontrado.`);
    err.statusCode = 404;
    throw err;
  }

  // REGLA 3: Estado del espacio
  const rule3 = validateSpaceOperationalStatus(space);
  if (!rule3.isValid) {
    const err = new Error(rule3.message);
    err.code = rule3.code;
    err.statusCode = 400;
    throw err;
  }

  // REGLA 1: Aforo
  const rule1 = validateCapacity(space, attendees_count);
  if (!rule1.isValid) {
    const err = new Error(rule1.message);
    err.code = rule1.code;
    err.statusCode = 400;
    throw err;
  }

  // REGLA 2: Conflictos de horario
  const existingReservations = db.prepare(`
    SELECT * FROM reservations
    WHERE space_id = ? AND date = ? AND status != 'CANCELADA'
  `).all(space_id, date);

  const rule2 = validateScheduleOverlap(existingReservations, date, start_time, end_time);
  if (!rule2.isValid) {
    const err = new Error(rule2.message);
    err.code = rule2.code;
    err.conflictingReservation = rule2.conflictingReservation;
    err.statusCode = 409;
    throw err;
  }

  // Inserción transaccional
  const stmt = db.prepare(`
    INSERT INTO reservations (id, space_id, title, responsible_name, responsible_email, date, start_time, end_time, attendees_count, purpose, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMADA')
  `);

  stmt.run(id, space_id, title, responsible_name, responsible_email || null, date, start_time, end_time, attendees_count, purpose || null);
  logAudit('RESERVA', id, 'CREAR', { space_id, title, date, start_time, end_time, attendees_count });

  return db.prepare('SELECT * FROM reservations WHERE id = ?').get(id);
}

export function cancelReservation(id, reason = '') {
  const res = db.prepare('SELECT * FROM reservations WHERE id = ?').get(id);
  if (!res) {
    const err = new Error(`Reserva '${id}' no encontrada.`);
    err.statusCode = 404;
    throw err;
  }

  if (res.status === 'CANCELADA') {
    const err = new Error(`La reserva '${id}' ya se encuentra cancelada.`);
    err.statusCode = 400;
    throw err;
  }

  db.prepare(`UPDATE reservations SET status = 'CANCELADA' WHERE id = ?`).run(id);
  logAudit('RESERVA', id, 'CANCELAR', { reason });
  return db.prepare('SELECT * FROM reservations WHERE id = ?').get(id);
}
