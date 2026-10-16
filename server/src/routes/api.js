import { Router } from 'express';
import multer from 'multer';
import db from '../db/database.js';
import * as spaceService from '../services/spaceService.js';
import * as assetService from '../services/assetService.js';
import * as incidentService from '../services/incidentService.js';
import * as aiService from '../services/aiService.js';
import * as importService from '../services/importService.js';
import { getAuditLogs } from '../services/auditService.js';
import {
  validateCapacity,
  validateScheduleOverlap,
  validateSpaceOperationalStatus,
  validateAssetAvailability,
  validateLoanReturn,
  validateIncidentTransition,
  RULE_CODES
} from '../rules/businessRules.js';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

// ==========================================
// 1. STATS & DASHBOARD
// ==========================================
router.get('/stats', (req, res, next) => {
  try {
    const totalSpaces = db.prepare('SELECT COUNT(*) as c FROM spaces').get().c;
    const availableSpaces = db.prepare("SELECT COUNT(*) as c FROM spaces WHERE status = 'DISPONIBLE'").get().c;
    const maintenanceSpaces = db.prepare("SELECT COUNT(*) as c FROM spaces WHERE status IN ('EN_MANTENIMIENTO', 'INHABILITADO')").get().c;

    const totalAssets = db.prepare('SELECT COUNT(*) as c FROM assets').get().c;
    const availableAssets = db.prepare("SELECT COUNT(*) as c FROM assets WHERE status = 'DISPONIBLE'").get().c;
    const loanedAssets = db.prepare("SELECT COUNT(*) as c FROM assets WHERE status = 'PRESTADO'").get().c;
    const issueAssets = db.prepare("SELECT COUNT(*) as c FROM assets WHERE status IN ('DANADO', 'EN_MANTENIMIENTO', 'INHABILITADO')").get().c;

    const totalIncidents = db.prepare('SELECT COUNT(*) as c FROM incidents').get().c;
    const openIncidents = db.prepare("SELECT COUNT(*) as c FROM incidents WHERE status = 'ABIERTA'").get().c;
    const inProgressIncidents = db.prepare("SELECT COUNT(*) as c FROM incidents WHERE status = 'EN_PROCESO'").get().c;
    const criticalIncidents = db.prepare("SELECT COUNT(*) as c FROM incidents WHERE priority = 'CRITICA' AND status != 'CERRADA'").get().c;

    const activeReservations = db.prepare("SELECT COUNT(*) as c FROM reservations WHERE status = 'CONFIRMADA'").get().c;
    const recentActivity = getAuditLogs(8);

    res.json({
      spaces: { total: totalSpaces, available: availableSpaces, maintenance: maintenanceSpaces },
      assets: { total: totalAssets, available: availableAssets, loaned: loanedAssets, issues: issueAssets },
      incidents: { total: totalIncidents, open: openIncidents, inProgress: inProgressIncidents, critical: criticalIncidents },
      activeReservations,
      recentActivity
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 2. ESPACIOS & RESERVAS (MÓDULO 1)
// ==========================================
router.get('/spaces', (req, res, next) => {
  try {
    const spaces = spaceService.listSpaces(req.query);
    res.json(spaces);
  } catch (err) {
    next(err);
  }
});

router.get('/spaces/:id', (req, res, next) => {
  try {
    const space = spaceService.getSpaceById(req.params.id);
    if (!space) return res.status(404).json({ error: 'Espacio no encontrado' });
    const reservations = spaceService.listReservations({ space_id: req.params.id });
    res.json({ ...space, reservations });
  } catch (err) {
    next(err);
  }
});

router.post('/spaces', (req, res, next) => {
  try {
    const created = spaceService.createSpace(req.body);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

router.put('/spaces/:id', (req, res, next) => {
  try {
    const updated = spaceService.updateSpace(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.get('/reservations', (req, res, next) => {
  try {
    const reservations = spaceService.listReservations(req.query);
    res.json(reservations);
  } catch (err) {
    next(err);
  }
});

router.post('/spaces/:id/reservations', (req, res, next) => {
  try {
    const payload = { ...req.body, space_id: req.params.id };
    const reservation = spaceService.createReservation(payload);
    res.status(201).json(reservation);
  } catch (err) {
    next(err);
  }
});

router.put('/reservations/:id/cancel', (req, res, next) => {
  try {
    const cancelled = spaceService.cancelReservation(req.params.id, req.body.reason);
    res.json(cancelled);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 3. RECURSOS TECNOLÓGICOS & PRÉSTAMOS (MÓDULO 2)
// ==========================================
router.get('/assets', (req, res, next) => {
  try {
    const assets = assetService.listAssets(req.query);
    res.json(assets);
  } catch (err) {
    next(err);
  }
});

router.get('/assets/:id', (req, res, next) => {
  try {
    const asset = assetService.getAssetById(req.params.id);
    if (!asset) return res.status(404).json({ error: 'Equipo no encontrado' });
    const loans = assetService.listLoans({ asset_id: req.params.id });
    res.json({ ...asset, loans });
  } catch (err) {
    next(err);
  }
});

router.post('/assets', (req, res, next) => {
  try {
    const created = assetService.createAsset(req.body);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

router.put('/assets/:id', (req, res, next) => {
  try {
    const updated = assetService.updateAsset(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.get('/loans', (req, res, next) => {
  try {
    const loans = assetService.listLoans(req.query);
    res.json(loans);
  } catch (err) {
    next(err);
  }
});

router.post('/assets/:id/loan', (req, res, next) => {
  try {
    const loan = assetService.loanAsset(req.params.id, req.body);
    res.status(201).json(loan);
  } catch (err) {
    next(err);
  }
});

router.post('/loans/:id/return', (req, res, next) => {
  try {
    const returned = assetService.returnAsset(req.params.id, req.body);
    res.json(returned);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 4. INCIDENCIAS & TRIAJE IA (MÓDULO 3)
// ==========================================
router.get('/incidents', (req, res, next) => {
  try {
    const incidents = incidentService.listIncidents(req.query);
    res.json(incidents);
  } catch (err) {
    next(err);
  }
});

router.get('/incidents/:id', (req, res, next) => {
  try {
    const incident = incidentService.getIncidentById(req.params.id);
    if (!incident) return res.status(404).json({ error: 'Incidencia no encontrada' });
    res.json(incident);
  } catch (err) {
    next(err);
  }
});

router.post('/incidents', (req, res, next) => {
  try {
    const created = incidentService.createIncident(req.body);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

router.put('/incidents/:id', (req, res, next) => {
  try {
    const updated = incidentService.updateIncident(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.post('/incidents/:id/ai-triage', async (req, res, next) => {
  try {
    const incident = incidentService.getIncidentById(req.params.id);
    if (!incident) return res.status(404).json({ error: 'Incidencia no encontrada' });

    const runtimeKey = req.body.apiKey || null;
    const result = await aiService.analyzeIncidentWithAI(incident, runtimeKey);

    if (result.success && result.recommendation) {
      // Guardar el análisis en la incidencia con estado 'ANALIZADO' para revisión humana
      db.prepare(`
        UPDATE incidents
        SET ai_classification = ?, ai_status = 'ANALIZADO', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(JSON.stringify(result.recommendation), req.params.id);
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/incidents/:id/apply-ai', (req, res, next) => {
  try {
    const updated = incidentService.applyAiTriage(req.params.id, req.body.recommendation);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 5. INTELIGENCIA ARTIFICIAL GENERAL
// ==========================================
router.get('/ai/status', (req, res) => {
  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '');
  const openaiConfigured = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== '');
  res.json({
    isAvailable: geminiConfigured || openaiConfigured,
    provider: geminiConfigured ? 'Google Gemini' : (openaiConfigured ? 'OpenAI' : 'Ninguno (Modo Manual Activo)'),
    model: geminiConfigured ? 'gemini-1.5-flash' : (openaiConfigured ? 'gpt-4o-mini' : 'Modo Manual'),
    manualFallbackAvailable: true
  });
});

router.post('/ai/analyze', async (req, res, next) => {
  try {
    const runtimeKey = req.body.apiKey || null;
    const result = await aiService.analyzeIncidentWithAI(req.body, runtimeKey);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 6. DATOS OFICIALES (IMPORT/EXPORT/RESTORE)
// ==========================================
router.post('/data/import/json', (req, res, next) => {
  try {
    let payload = req.body;
    let jsonString;
    if (typeof payload === 'string') {
      jsonString = payload;
    } else {
      jsonString = JSON.stringify(payload);
    }
    const report = importService.importFromJson(jsonString, req.query.entity || 'auto', req.query.strategy || 'UPDATE');
    res.json(report);
  } catch (err) {
    next(err);
  }
});

router.post('/data/import/csv', upload.single('file'), (req, res, next) => {
  try {
    const entityType = req.body.entityType || req.query.entityType || 'spaces';
    let csvContent = '';

    if (req.file) {
      csvContent = req.file.buffer.toString('utf-8');
    } else if (req.body.csvText) {
      csvContent = req.body.csvText;
    } else {
      return res.status(400).json({ error: 'Debe adjuntar un archivo CSV o proporcionar el texto CSV en el campo csvText.' });
    }

    const report = importService.importFromCsv(csvContent, entityType, req.body.strategy || 'UPDATE');
    res.json(report);
  } catch (err) {
    next(err);
  }
});

router.get('/data/export/json', (req, res) => {
  const spaces = db.prepare('SELECT * FROM spaces').all();
  const assets = db.prepare('SELECT * FROM assets').all();
  const reservations = db.prepare('SELECT * FROM reservations').all();
  const loans = db.prepare('SELECT * FROM loans').all();
  const incidents = db.prepare('SELECT * FROM incidents').all();

  const exportBundle = {
    exportedAt: new Date().toISOString(),
    system: 'Sistema Central de Gestión Operativa del Campus - Campuslands',
    data: { spaces, assets, reservations, loans, incidents }
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="campuslands_backup.json"');
  res.send(JSON.stringify(exportBundle, null, 2));
});

router.post('/data/restore-official', (req, res, next) => {
  try {
    const result = importService.restoreOfficialDefaults();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 7. AUDITORÍA Y TRAZABILIDAD
// ==========================================
router.get('/audit', (req, res, next) => {
  try {
    const logs = getAuditLogs(parseInt(req.query.limit, 10) || 100);
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 8. PROBADOR EN VIVO DE REGLAS DE NEGOCIO (PARA JURADOS)
// ==========================================
router.post('/rules/test-live', (req, res) => {
  const { ruleNumber } = req.body;
  const results = [];

  const spaceArtemis = { id: 'SP-001', name: 'Aula Artemis', capacity: 40, status: 'DISPONIBLE' };
  const spaceMantenimiento = { id: 'SP-004', name: 'Aula Review', capacity: 25, status: 'EN_MANTENIMIENTO' };
  const assetPrestado = { id: 'EQ-102', name: 'Laptop HP 450 (EQ-102)', status: 'PRESTADO', serial_number: 'HP-02' };
  const assetDanado = { id: 'EQ-104', name: 'Laptop Dell Vostro (EQ-104)', status: 'DANADO', serial_number: 'DL-01' };

  if (!ruleNumber || ruleNumber === 1) {
    const valid = validateCapacity(spaceArtemis, 35);
    const invalid = validateCapacity(spaceArtemis, 55);
    results.push({
      rule: 'Regla 1: Aforo',
      validCase: { input: 'Aula Artemis (Cap: 40) con 35 personas', passed: valid.isValid, message: valid.isValid ? 'Aprobado: Aforo dentro del límite' : valid.message },
      invalidCase: { input: 'Aula Artemis (Cap: 40) con 55 personas', blocked: !invalid.isValid, code: invalid.code, message: invalid.message }
    });
  }

  if (!ruleNumber || ruleNumber === 2) {
    const existing = [{ id: 'RSV-01', space_id: 'SP-001', title: 'Clase Node', date: '2026-10-16', start_time: '08:00', end_time: '12:00', status: 'CONFIRMADA', responsible_name: 'Trainer Andrés' }];
    const valid = validateScheduleOverlap(existing, '2026-10-16', '14:00', '18:00');
    const invalid = validateScheduleOverlap(existing, '2026-10-16', '10:00', '13:00');
    results.push({
      rule: 'Regla 2: Conflictos de Horario',
      validCase: { input: 'Reserva 14:00 a 18:00', passed: valid.isValid, message: 'Aprobado: Horario libre' },
      invalidCase: { input: 'Reserva 10:00 a 13:00 (se cruza con 08:00-12:00)', blocked: !invalid.isValid, code: invalid.code, message: invalid.message }
    });
  }

  if (!ruleNumber || ruleNumber === 3) {
    const valid = validateSpaceOperationalStatus(spaceArtemis);
    const invalid = validateSpaceOperationalStatus(spaceMantenimiento);
    results.push({
      rule: 'Regla 3: Estado del Espacio',
      validCase: { input: 'Espacio DISPONIBLE (Aula Artemis)', passed: valid.isValid, message: 'Aprobado: Espacio operativo' },
      invalidCase: { input: 'Espacio EN_MANTENIMIENTO (Aula Review)', blocked: !invalid.isValid, code: invalid.code, message: invalid.message }
    });
  }

  if (!ruleNumber || ruleNumber === 4) {
    const valid = validateAssetAvailability({ id: 'EQ-101', name: 'Laptop HP 450', status: 'DISPONIBLE' });
    const invalid1 = validateAssetAvailability(assetPrestado);
    const invalid2 = validateAssetAvailability(assetDanado);
    results.push({
      rule: 'Regla 4: Disponibilidad de Equipos',
      validCase: { input: 'Equipo DISPONIBLE', passed: valid.isValid, message: 'Aprobado para préstamo' },
      invalidCase: { input: 'Equipo ya PRESTADO / DAÑADO', blocked: !invalid1.isValid && !invalid2.isValid, code: invalid1.code, message: invalid1.message }
    });
  }

  if (!ruleNumber || ruleNumber === 5) {
    const validLoan = { id: 'LN-01', asset_id: 'EQ-102', status: 'ACTIVO' };
    const invalidLoan = { id: 'LN-02', asset_id: 'EQ-101', status: 'DEVUELTO', return_date: '2026-10-15' };
    const valid = validateLoanReturn(validLoan);
    const invalid = validateLoanReturn(invalidLoan);
    results.push({
      rule: 'Regla 5: Integridad de Operaciones',
      validCase: { input: 'Devolver préstamo ACTIVO', passed: valid.isValid, message: 'Aprobado: Transacción completada y auditada' },
      invalidCase: { input: 'Re-devolver préstamo ya DEVUELTO', blocked: !invalid.isValid, code: invalid.code, message: invalid.message }
    });
  }

  if (!ruleNumber || ruleNumber === 6) {
    const incAbierta = { id: 'INC-01', status: 'ABIERTA' };
    const incCerrada = { id: 'INC-04', status: 'CERRADA' };
    const valid = validateIncidentTransition(incAbierta, 'EN_PROCESO');
    const invalidNoSolution = validateIncidentTransition(incAbierta, 'RESUELTA', '');
    const invalidClosed = validateIncidentTransition(incCerrada, 'EN_PROCESO');
    results.push({
      rule: 'Regla 6: Integridad de Incidencias',
      validCase: { input: 'ABIERTA -> EN_PROCESO', passed: valid.isValid, message: 'Transición válida' },
      invalidCase: { input: 'Cerrar sin solución / Modificar CERRADA', blocked: !invalidNoSolution.isValid && !invalidClosed.isValid, code: invalidNoSolution.code, message: invalidNoSolution.message }
    });
  }

  res.json({ results });
});

export default router;
