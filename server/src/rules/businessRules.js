/**
 * REGLAS DE NEGOCIO OBLIGATORIAS - CAMPUSLANDS
 * Validación centralizada con códigos de error estandarizados y mensajes claros.
 */

export const RULE_CODES = {
  // Regla 1
  CAPACITY_EXCEEDED: 'RULE_1_CAPACITY_EXCEEDED',
  // Regla 2
  SCHEDULE_CONFLICT: 'RULE_2_SCHEDULE_CONFLICT',
  INVALID_TIME_INTERVAL: 'RULE_2_INVALID_TIME_INTERVAL',
  // Regla 3
  SPACE_NOT_AVAILABLE: 'RULE_3_SPACE_NOT_AVAILABLE',
  // Regla 4
  ASSET_NOT_AVAILABLE: 'RULE_4_ASSET_NOT_AVAILABLE',
  ASSET_ALREADY_LOANED: 'RULE_4_ASSET_ALREADY_LOANED',
  // Regla 5
  OPERATION_INTEGRITY_VIOLATION: 'RULE_5_OPERATION_INTEGRITY_VIOLATION',
  // Regla 6
  INCIDENT_INTEGRITY_VIOLATION: 'RULE_6_INCIDENT_INTEGRITY_VIOLATION',
  INCIDENT_MISSING_SOLUTION: 'RULE_6_INCIDENT_MISSING_SOLUTION',
  INCIDENT_INVALID_TRANSITION: 'RULE_6_INCIDENT_INVALID_TRANSITION'
};

/**
 * REGLA 1: Aforo
 * No permitir asignar un espacio cuya capacidad sea inferior al número de personas.
 */
export function validateCapacity(space, attendeesCount) {
  const count = parseInt(attendeesCount, 10);
  if (isNaN(count) || count <= 0) {
    return {
      isValid: false,
      code: 'INVALID_ATTENDEES_COUNT',
      message: 'El número de personas debe ser un entero positivo mayor a cero.'
    };
  }

  if (count > space.capacity) {
    return {
      isValid: false,
      code: RULE_CODES.CAPACITY_EXCEEDED,
      message: `Aforo excedido: El espacio '${space.name}' tiene capacidad máxima de ${space.capacity} personas, pero se solicitaron ${count}.`
    };
  }

  return { isValid: true };
}

/**
 * REGLA 2: Conflictos de horario
 * Impedir reservas simultáneas del mismo espacio cuando sus intervalos se superpongan.
 */
export function validateScheduleOverlap(existingReservations, newDate, newStart, newEnd, excludeReservationId = null) {
  // Validación sintáctica del intervalo
  if (newStart >= newEnd) {
    return {
      isValid: false,
      code: RULE_CODES.INVALID_TIME_INTERVAL,
      message: `Intervalo inválido: La hora de inicio (${newStart}) debe ser anterior a la hora de fin (${newEnd}).`
    };
  }

  for (const res of existingReservations) {
    if (excludeReservationId && res.id === excludeReservationId) continue;
    if (res.status === 'CANCELADA') continue;
    if (res.date !== newDate) continue;

    // Superposición: startA < endB && endA > startB
    const overlaps = newStart < res.end_time && newEnd > res.start_time;
    if (overlaps) {
      return {
        isValid: false,
        code: RULE_CODES.SCHEDULE_CONFLICT,
        conflictingReservation: res,
        message: `Conflicto de horario: Ya existe la reserva '${res.title}' (${res.responsible_name}) de ${res.start_time} a ${res.end_time} para la fecha ${newDate}.`
      };
    }
  }

  return { isValid: true };
}

/**
 * REGLA 3: Estado del espacio
 * Bloquear asignaciones de aulas o cubículos inhabilitados o en mantenimiento.
 */
export function validateSpaceOperationalStatus(space) {
  if (!space) {
    return {
      isValid: false,
      code: 'SPACE_NOT_FOUND',
      message: 'El espacio solicitado no existe en el sistema.'
    };
  }

  const blockedStatuses = ['INHABILITADO', 'EN_MANTENIMIENTO'];
  if (blockedStatuses.includes(space.status)) {
    return {
      isValid: false,
      code: RULE_CODES.SPACE_NOT_AVAILABLE,
      message: `Espacio no operable: '${space.name}' se encuentra actualmente en estado '${space.status}'. No admite nuevas reservas hasta ser habilitado.`
    };
  }

  return { isValid: true };
}

/**
 * REGLA 4: Disponibilidad de equipos
 * Impedir préstamos de equipos dañados, inhabilitados o que ya estén prestados.
 */
export function validateAssetAvailability(asset, activeLoansForAsset = []) {
  if (!asset) {
    return {
      isValid: false,
      code: 'ASSET_NOT_FOUND',
      message: 'El equipo o recurso no fue encontrado en el catálogo de Campuslands.'
    };
  }

  if (asset.status === 'PRESTADO' || activeLoansForAsset.length > 0) {
    return {
      isValid: false,
      code: RULE_CODES.ASSET_ALREADY_LOANED,
      message: `Equipo no disponible: '${asset.name}' (S/N: ${asset.serial_number}) ya se encuentra prestado actualmente.`
    };
  }

  const unloanableStatuses = ['DANADO', 'INHABILITADO', 'EN_MANTENIMIENTO'];
  if (unloanableStatuses.includes(asset.status)) {
    return {
      isValid: false,
      code: RULE_CODES.ASSET_NOT_AVAILABLE,
      message: `Bloqueo de seguridad: No se puede prestar el equipo '${asset.name}' porque está en estado '${asset.status}'. Notas: ${asset.condition_notes || 'Sin observaciones'}`
    };
  }

  return { isValid: true };
}

/**
 * REGLA 5: Integridad de operaciones
 * Registrar préstamos, devoluciones, reservas y cambios de estado sin generar contradicciones.
 */
export function validateLoanReturn(loan, asset) {
  if (!loan) {
    return {
      isValid: false,
      code: RULE_CODES.OPERATION_INTEGRITY_VIOLATION,
      message: 'El registro de préstamo no existe.'
    };
  }

  if (loan.status === 'DEVUELTO') {
    return {
      isValid: false,
      code: RULE_CODES.OPERATION_INTEGRITY_VIOLATION,
      message: `Operación redundante: El préstamo '${loan.id}' ya fue registrado como devuelto el ${loan.return_date}.`
    };
  }

  return { isValid: true };
}

/**
 * REGLA 6: Integridad de incidencias
 * Validar estados permitidos y evitar cerrar o reasignar incidencias con información incompatible.
 */
export const ALLOWED_INCIDENT_STATUSES = ['ABIERTA', 'EN_PROCESO', 'RESUELTA', 'CERRADA'];
export const VALID_INCIDENT_TRANSITIONS = {
  ABIERTA: ['EN_PROCESO', 'RESUELTA', 'ABIERTA'],
  EN_PROCESO: ['RESUELTA', 'ABIERTA', 'EN_PROCESO'],
  RESUELTA: ['CERRADA', 'EN_PROCESO', 'RESUELTA'],
  CERRADA: [] // Estado terminal
};

export function validateIncidentTransition(currentIncident, newStatus, solutionNotes = null) {
  if (!currentIncident) {
    return {
      isValid: false,
      code: 'INCIDENT_NOT_FOUND',
      message: 'La incidencia especificada no existe.'
    };
  }

  if (!ALLOWED_INCIDENT_STATUSES.includes(newStatus)) {
    return {
      isValid: false,
      code: RULE_CODES.INCIDENT_INTEGRITY_VIOLATION,
      message: `Estado '${newStatus}' no reconocido. Estados válidos: ${ALLOWED_INCIDENT_STATUSES.join(', ')}.`
    };
  }

  // Si ya estaba cerrada y quieren cambiarla
  if (currentIncident.status === 'CERRADA' && newStatus !== 'CERRADA') {
    return {
      isValid: false,
      code: RULE_CODES.INCIDENT_INVALID_TRANSITION,
      message: `Transición inválida: La incidencia '${currentIncident.id}' ya está CERRADA y no puede modificarse.`
    };
  }

  const allowedNext = VALID_INCIDENT_TRANSITIONS[currentIncident.status] || [];
  if (currentIncident.status !== newStatus && !allowedNext.includes(newStatus)) {
    return {
      isValid: false,
      code: RULE_CODES.INCIDENT_INVALID_TRANSITION,
      message: `Flujo no permitido: No se puede cambiar de '${currentIncident.status}' a '${newStatus}'. Flujo permitido: ${allowedNext.join(', ')}.`
    };
  }

  // Obligatoriedad de solución al resolver o cerrar
  if ((newStatus === 'RESUELTA' || newStatus === 'CERRADA')) {
    const effectiveSolution = solutionNotes || currentIncident.solution_notes;
    if (!effectiveSolution || effectiveSolution.trim().length < 5) {
      return {
        isValid: false,
        code: RULE_CODES.INCIDENT_MISSING_SOLUTION,
        message: `Requisito de cierre: Para marcar la incidencia como '${newStatus}' es obligatorio detallar la solución técnica aplicada (mínimo 5 caracteres).`
      };
    }
  }

  return { isValid: true };
}
