import db from '../db/database.js';
import { validateIncidentTransition } from '../rules/businessRules.js';
import { logAudit } from './auditService.js';

export function listIncidents(filters = {}) {
  let query = 'SELECT * FROM incidents WHERE 1=1';
  const params = [];

  if (filters.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters.priority) {
    query += ' AND priority = ?';
    params.push(filters.priority);
  }
  if (filters.category) {
    query += ' AND category = ?';
    params.push(filters.category);
  }
  if (filters.area) {
    query += ' AND responsible_area = ?';
    params.push(filters.area);
  }
  if (filters.search) {
    query += ' AND (title LIKE ? OR description LIKE ? OR location_or_space_id LIKE ? OR reported_by LIKE ?)';
    const term = `%${filters.search}%`;
    params.push(term, term, term, term);
  }

  // Priority sorting: CRITICA -> ALTA -> MEDIA -> BAJA
  query += `
    ORDER BY
      CASE priority
        WHEN 'CRITICA' THEN 1
        WHEN 'ALTA' THEN 2
        WHEN 'MEDIA' THEN 3
        WHEN 'BAJA' THEN 4
        ELSE 5
      END ASC,
      created_at DESC
  `;

  const rows = db.prepare(query).all(...params);
  return rows.map(r => {
    let parsedAi = null;
    if (r.ai_classification) {
      try {
        parsedAi = JSON.parse(r.ai_classification);
      } catch (e) {
        parsedAi = r.ai_classification;
      }
    }
    return { ...r, ai_classification: parsedAi };
  });
}

export function getIncidentById(id) {
  const row = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id);
  if (!row) return null;
  let parsedAi = null;
  if (row.ai_classification) {
    try {
      parsedAi = JSON.parse(row.ai_classification);
    } catch (e) {
      parsedAi = row.ai_classification;
    }
  }
  return { ...row, ai_classification: parsedAi };
}

export function createIncident(data) {
  const {
    id = `INC-${Date.now().toString().slice(-5)}`,
    title,
    description,
    location_or_space_id,
    category = 'INFRAESTRUCTURA',
    priority = 'MEDIA',
    responsible_area = 'SOPORTE_TI',
    reported_by,
    ai_classification = null,
    ai_status = 'PENDIENTE'
  } = data;

  if (!title || !description || !reported_by) {
    const err = new Error('Título, descripción y nombre del informante son obligatorios.');
    err.statusCode = 400;
    throw err;
  }

  const stmt = db.prepare(`
    INSERT INTO incidents (id, title, description, location_or_space_id, category, priority, status, responsible_area, reported_by, ai_classification, ai_status)
    VALUES (?, ?, ?, ?, ?, ?, 'ABIERTA', ?, ?, ?, ?)
  `);

  const aiStr = ai_classification ? (typeof ai_classification === 'object' ? JSON.stringify(ai_classification) : ai_classification) : null;
  stmt.run(id, title, description, location_or_space_id || null, category, priority, responsible_area, reported_by, aiStr, ai_status);

  logAudit('INCIDENCIA', id, 'CREAR', { title, category, priority, responsible_area, reported_by });
  return getIncidentById(id);
}

/**
 * REGLA 6: Integridad de incidencias en transiciones de estado
 */
export function updateIncident(id, data) {
  const incident = getIncidentById(id);
  if (!incident) {
    const err = new Error(`Incidencia con id '${id}' no encontrada.`);
    err.statusCode = 404;
    throw err;
  }

  const newStatus = data.status ?? incident.status;
  const newSolution = data.solution_notes ?? incident.solution_notes;

  // Si hay cambio de estado, validar la regla 6
  if (newStatus !== incident.status) {
    const rule6 = validateIncidentTransition(incident, newStatus, newSolution);
    if (!rule6.isValid) {
      const err = new Error(rule6.message);
      err.code = rule6.code;
      err.statusCode = 400;
      throw err;
    }
  }

  const updatedTitle = data.title ?? incident.title;
  const updatedDesc = data.description ?? incident.description;
  const updatedLoc = data.location_or_space_id ?? incident.location_or_space_id;
  const updatedCategory = data.category ?? incident.category;
  const updatedPriority = data.priority ?? incident.priority;
  const updatedArea = data.responsible_area ?? incident.responsible_area;
  const updatedAiStatus = data.ai_status ?? incident.ai_status;

  let resolvedAt = incident.resolved_at;
  let closedAt = incident.closed_at;
  const nowIso = new Date().toISOString().replace('T', ' ').substring(0, 19);

  if (newStatus === 'RESUELTA' && !resolvedAt) {
    resolvedAt = nowIso;
  }
  if (newStatus === 'CERRADA' && !closedAt) {
    closedAt = nowIso;
    if (!resolvedAt) resolvedAt = nowIso;
  }

  const stmt = db.prepare(`
    UPDATE incidents
    SET title = ?, description = ?, location_or_space_id = ?, category = ?, priority = ?, status = ?,
        responsible_area = ?, solution_notes = ?, ai_status = ?, updated_at = CURRENT_TIMESTAMP,
        resolved_at = ?, closed_at = ?
    WHERE id = ?
  `);

  stmt.run(
    updatedTitle,
    updatedDesc,
    updatedLoc,
    updatedCategory,
    updatedPriority,
    newStatus,
    updatedArea,
    newSolution,
    updatedAiStatus,
    resolvedAt,
    closedAt,
    id
  );

  logAudit('INCIDENCIA', id, 'MODIFICAR', {
    status_change: { from: incident.status, to: newStatus },
    category: updatedCategory,
    priority: updatedPriority,
    area: updatedArea,
    solution: newSolution
  });

  return getIncidentById(id);
}

/**
 * Aplicación de triaje IA confirmado por el operador humano
 */
export function applyAiTriage(id, recommendation) {
  const incident = getIncidentById(id);
  if (!incident) {
    const err = new Error(`Incidencia '${id}' no encontrada.`);
    err.statusCode = 404;
    throw err;
  }

  const {
    suggested_category,
    suggested_priority,
    suggested_area,
    suggested_solution
  } = recommendation;

  const aiStr = JSON.stringify(recommendation);

  db.prepare(`
    UPDATE incidents
    SET category = COALESCE(?, category),
        priority = COALESCE(?, priority),
        responsible_area = COALESCE(?, responsible_area),
        ai_classification = ?,
        ai_status = 'APLICADO',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(suggested_category, suggested_priority, suggested_area, aiStr, id);

  logAudit('INCIDENCIA', id, 'TRIAJE_IA_APLICADO', {
    recommended: recommendation,
    previous: { category: incident.category, priority: incident.priority, area: incident.responsible_area }
  });

  return getIncidentById(id);
}
