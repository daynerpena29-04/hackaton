import db from '../db/database.js';

export function logAudit(entityType, entityId, action, details, actor = 'OPERADOR') {
  try {
    const detailStr = typeof details === 'object' ? JSON.stringify(details) : String(details);
    const stmt = db.prepare(`
      INSERT INTO audit_logs (entity_type, entity_id, action, actor, details)
      VALUES (?, ?, ?, ?, ?)
    `);
    const info = stmt.run(entityType, entityId, action, actor, detailStr);
    return info.lastInsertRowid;
  } catch (err) {
    console.error('Error al registrar auditoría:', err.message);
    return null;
  }
}

export function getAuditLogs(limit = 100) {
  return db.prepare(`
    SELECT * FROM audit_logs
    ORDER BY id DESC
    LIMIT ?
  `).all(limit);
}
