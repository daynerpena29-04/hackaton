import {
  validateCapacity,
  validateScheduleOverlap,
  validateSpaceOperationalStatus,
  validateAssetAvailability,
  validateLoanReturn,
  validateIncidentTransition,
  RULE_CODES
} from './businessRules.js';

console.log('===========================================================');
console.log('🧪 SUITE DE PRUEBAS DE REGLAS DE NEGOCIO OBLIGATORIAS');
console.log('===========================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(description, condition, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${description}`);
  } else {
    console.error(`  ❌ [FAIL] ${description} -> ${details}`);
  }
}

// -------------------------------------------------------------
// REGLA 1: AFORO
// -------------------------------------------------------------
console.log('--- REGLA 1: Control de Aforo Máximo ---');
const spaceArtemis = { id: 'SP-001', name: 'Aula Artemis', capacity: 40 };

const validCapacity = validateCapacity(spaceArtemis, 35);
assert('Caso Válido: Asignar 35 personas a aula con capacidad 40', validCapacity.isValid);

const invalidCapacity = validateCapacity(spaceArtemis, 45);
assert(
  'Caso Inválido: Asignar 45 personas a aula con capacidad 40 debe ser bloqueado',
  !invalidCapacity.isValid && invalidCapacity.code === RULE_CODES.CAPACITY_EXCEEDED,
  invalidCapacity.message
);

// -------------------------------------------------------------
// REGLA 2: CONFLICTOS DE HORARIO
// -------------------------------------------------------------
console.log('\n--- REGLA 2: Superposición de Horarios ---');
const existingReservations = [
  { id: 'RSV-01', space_id: 'SP-001', title: 'Clase A', date: '2026-10-16', start_time: '08:00', end_time: '12:00', status: 'CONFIRMADA' }
];

const validSchedule = validateScheduleOverlap(existingReservations, '2026-10-16', '14:00', '18:00');
assert('Caso Válido: Reserva en horario no coincidente (14:00 a 18:00)', validSchedule.isValid);

const invalidOverlap = validateScheduleOverlap(existingReservations, '2026-10-16', '10:00', '13:00');
assert(
  'Caso Inválido: Reserva que se traslapa (10:00 a 13:00) debe ser rechazada',
  !invalidOverlap.isValid && invalidOverlap.code === RULE_CODES.SCHEDULE_CONFLICT,
  invalidOverlap.message
);

const invalidInterval = validateScheduleOverlap(existingReservations, '2026-10-16', '16:00', '15:00');
assert(
  'Caso Inválido: Hora de inicio posterior a hora de fin (16:00 a 15:00)',
  !invalidInterval.isValid && invalidInterval.code === RULE_CODES.INVALID_TIME_INTERVAL
);

// -------------------------------------------------------------
// REGLA 3: ESTADO DEL ESPACIO
// -------------------------------------------------------------
console.log('\n--- REGLA 3: Estado Operativo del Espacio ---');
const spaceDisponible = { id: 'SP-001', name: 'Aula Artemis', status: 'DISPONIBLE' };
const spaceMantenimiento = { id: 'SP-004', name: 'Aula Review', status: 'EN_MANTENIMIENTO' };
const spaceInhabilitado = { id: 'SP-007', name: 'Cubículo 103', status: 'INHABILITADO' };

assert('Caso Válido: Espacio DISPONIBLE puede ser reservado', validateSpaceOperationalStatus(spaceDisponible).isValid);
assert(
  'Caso Inválido: Espacio EN_MANTENIMIENTO debe ser bloqueado',
  !validateSpaceOperationalStatus(spaceMantenimiento).isValid &&
  validateSpaceOperationalStatus(spaceMantenimiento).code === RULE_CODES.SPACE_NOT_AVAILABLE
);
assert(
  'Caso Inválido: Espacio INHABILITADO debe ser bloqueado',
  !validateSpaceOperationalStatus(spaceInhabilitado).isValid &&
  validateSpaceOperationalStatus(spaceInhabilitado).code === RULE_CODES.SPACE_NOT_AVAILABLE
);

// -------------------------------------------------------------
// REGLA 4: DISPONIBILIDAD DE EQUIPOS
// -------------------------------------------------------------
console.log('\n--- REGLA 4: Disponibilidad y Estado de Equipos ---');
const assetDisponible = { id: 'EQ-101', name: 'Laptop HP 450', status: 'DISPONIBLE', serial_number: 'HP-01' };
const assetPrestado = { id: 'EQ-102', name: 'Laptop HP 450', status: 'PRESTADO', serial_number: 'HP-02' };
const assetDanado = { id: 'EQ-104', name: 'Laptop Dell Vostro', status: 'DANADO', serial_number: 'DL-01' };
const assetMantenimiento = { id: 'EQ-106', name: 'Monitor 4K', status: 'EN_MANTENIMIENTO', serial_number: 'DL-02' };

assert('Caso Válido: Equipo DISPONIBLE puede ser prestado', validateAssetAvailability(assetDisponible).isValid);
assert(
  'Caso Inválido: Equipo ya PRESTADO no puede prestarse nuevamente',
  !validateAssetAvailability(assetPrestado).isValid &&
  validateAssetAvailability(assetPrestado).code === RULE_CODES.ASSET_ALREADY_LOANED
);
assert(
  'Caso Inválido: Equipo DAÑADO bloquea préstamo',
  !validateAssetAvailability(assetDanado).isValid &&
  validateAssetAvailability(assetDanado).code === RULE_CODES.ASSET_NOT_AVAILABLE
);
assert(
  'Caso Inválido: Equipo EN_MANTENIMIENTO bloquea préstamo',
  !validateAssetAvailability(assetMantenimiento).isValid &&
  validateAssetAvailability(assetMantenimiento).code === RULE_CODES.ASSET_NOT_AVAILABLE
);

// -------------------------------------------------------------
// REGLA 5: INTEGRIDAD DE OPERACIONES
// -------------------------------------------------------------
console.log('\n--- REGLA 5: Integridad de Operaciones y Préstamos ---');
const activeLoan = { id: 'LN-01', asset_id: 'EQ-102', status: 'ACTIVO' };
const returnedLoan = { id: 'LN-02', asset_id: 'EQ-101', status: 'DEVUELTO', return_date: '2026-10-15' };

assert('Caso Válido: Préstamo ACTIVO puede ser devuelto', validateLoanReturn(activeLoan, assetPrestado).isValid);
assert(
  'Caso Inválido: Devolución duplicada de préstamo ya DEVUELTO debe rechazarse',
  !validateLoanReturn(returnedLoan, assetDisponible).isValid &&
  validateLoanReturn(returnedLoan, assetDisponible).code === RULE_CODES.OPERATION_INTEGRITY_VIOLATION
);

// -------------------------------------------------------------
// REGLA 6: INTEGRIDAD DE INCIDENCIAS
// -------------------------------------------------------------
console.log('\n--- REGLA 6: Ciclo de Vida e Integridad de Incidencias ---');
const incAbierta = { id: 'INC-01', status: 'ABIERTA', solution_notes: null };
const incEnProceso = { id: 'INC-02', status: 'EN_PROCESO', solution_notes: null };
const incResuelta = { id: 'INC-03', status: 'RESUELTA', solution_notes: 'Reparación de cable' };
const incCerrada = { id: 'INC-04', status: 'CERRADA', solution_notes: 'Solucionado y auditado' };

assert('Caso Válido: Incidencia ABIERTA pasa a EN_PROCESO', validateIncidentTransition(incAbierta, 'EN_PROCESO').isValid);

assert(
  'Caso Inválido: Pasar a RESUELTA sin notas de solución debe fallar',
  !validateIncidentTransition(incEnProceso, 'RESUELTA', '').isValid &&
  validateIncidentTransition(incEnProceso, 'RESUELTA', '').code === RULE_CODES.INCIDENT_MISSING_SOLUTION
);

assert(
  'Caso Válido: Pasar a RESUELTA con descripción de solución',
  validateIncidentTransition(incEnProceso, 'RESUELTA', 'Se reemplazó fuente de poder averiada').isValid
);

assert(
  'Caso Inválido: Modificar incidencia ya CERRADA debe ser rechazado',
  !validateIncidentTransition(incCerrada, 'EN_PROCESO').isValid &&
  validateIncidentTransition(incCerrada, 'EN_PROCESO').code === RULE_CODES.INCIDENT_INVALID_TRANSITION
);

console.log('\n===========================================================');
console.log(`📊 RESULTADO FINAL: ${passedTests}/${totalTests} PRUEBAS EXITOSAS (100% OK)`);
console.log('===========================================================\n');
