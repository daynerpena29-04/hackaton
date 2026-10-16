import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Play,
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';
import api from '../services/api';

export default function RulesTesterView({ onShowToast }) {
  const [testingRule, setTestingRule] = useState(null);
  const [testResults, setTestResults] = useState(null);
  const [isRunningAll, setIsRunningAll] = useState(false);

  const rulesMetadata = [
    {
      num: 1,
      title: 'Regla 1: Control de Aforo Máximo',
      summary: 'No permitir asignar un espacio cuya capacidad sea inferior al número de personas.',
      description: 'El backend evalúa matemáticamente `asistentes <= capacidad`. Si se solicitan 55 personas para un aula de 40, bloquea la reserva con HTTP 400 y código RULE_1_CAPACITY_EXCEEDED.'
    },
    {
      num: 2,
      title: 'Regla 2: Superposición de Horarios',
      summary: 'Impedir reservas simultáneas del mismo espacio cuando sus intervalos se superpongan.',
      description: 'Detección de traslape temporal mediante cálculo de intersección de intervalos `(startA < endB && endA > startB)` sobre la misma fecha y espacio. Retorna HTTP 409 y código RULE_2_SCHEDULE_CONFLICT.'
    },
    {
      num: 3,
      title: 'Regla 3: Estado Operativo del Espacio',
      summary: 'Bloquear asignaciones de aulas o cubículos inhabilitados o en mantenimiento.',
      description: 'Aulas o cubículos con estado EN_MANTENIMIENTO o INHABILITADO rechazan de inmediato cualquier intento de reserva con HTTP 400 y código RULE_3_SPACE_NOT_AVAILABLE.'
    },
    {
      num: 4,
      title: 'Regla 4: Disponibilidad de Equipos',
      summary: 'Impedir préstamos de equipos dañados, inhabilitados o que ya estén prestados.',
      description: 'Verificación de catálogo y préstamos activos concurrentes. Equipos en estado DAÑADO, EN_MANTENIMIENTO o PRESTADO bloquean la salida con HTTP 400 y código RULE_4_ASSET_NOT_AVAILABLE / ASSET_ALREADY_LOANED.'
    },
    {
      num: 5,
      title: 'Regla 5: Integridad de Operaciones',
      summary: 'Registrar préstamos, devoluciones, reservas y cambios sin contradicciones ni duplicidades.',
      description: 'Transacciones atómicas en SQLite con registro en audit_logs. Impide devoluciones duplicadas de préstamos ya cerrados con código RULE_5_OPERATION_INTEGRITY_VIOLATION.'
    },
    {
      num: 6,
      title: 'Regla 6: Integridad de Incidencias',
      summary: 'Validar estados permitidos y exigir solución técnica para resolver o cerrar.',
      description: 'Control de máquina de estados (ABIERTA -> EN_PROCESO -> RESUELTA -> CERRADA). No permite cerrar casos sin notas de solución técnica ni modificar incidencias ya CERRADAS con código RULE_6_INCIDENT_MISSING_SOLUTION / INVALID_TRANSITION.'
    }
  ];

  const handleTestRule = async (ruleNum = null) => {
    if (ruleNum) {
      setTestingRule(ruleNum);
    } else {
      setIsRunningAll(true);
    }

    try {
      const data = await api.testRulesLive(ruleNum);
      if (ruleNum) {
        // Merge single rule result
        setTestResults((prev) => {
          const current = prev ? [...prev] : [];
          const updated = current.filter((r) => !r.rule.includes(`Regla ${ruleNum}`));
          return [...updated, ...data.results];
        });
      } else {
        setTestResults(data.results);
      }
      onShowToast({
        type: 'success',
        title: 'Prueba Ejecutada con Éxito',
        message: `Regla ${ruleNum ? ruleNum : 'completa (1 al 6)'} verificada en vivo contra el backend.`
      });
    } catch (err) {
      onShowToast({ type: 'error', title: 'Error en la prueba', message: err.message });
    } finally {
      setTestingRule(null);
      setIsRunningAll(false);
    }
  };

  const getResultForRule = (num) => {
    if (!testResults) return null;
    return testResults.find((r) => r.rule.includes(`Regla ${num}`));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.2rem 0.6rem', borderRadius: '9999px', background: 'rgba(6, 182, 212, 0.15)', color: 'var(--cyan)', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.4rem' }}>
            <ShieldCheck size={14} /> MÓDULO DE SUSTENTACIÓN Y DEFENSA ANTE JURADOS
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Probador en Vivo de Reglas de Negocio</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Demostración determinista de las 6 reglas obligatorias de Campuslands con casos válidos e inválidos
          </p>
        </div>

        <button
          onClick={() => handleTestRule(null)}
          disabled={isRunningAll}
          className="btn btn-primary"
          style={{ boxShadow: '0 4px 16px var(--primary-glow)' }}
        >
          <Play size={16} />
          {isRunningAll ? 'Ejecutando Pruebas...' : 'Ejecutar Todas las Reglas en Vivo'}
        </button>
      </div>

      {/* Rules Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem' }}>
        {rulesMetadata.map((rule) => {
          const result = getResultForRule(rule.num);
          const isCurrentlyTesting = testingRule === rule.num;

          return (
            <div key={rule.num} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: result ? '1px solid var(--border-highlight)' : '1px solid var(--border-subtle)' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {rule.title}
                  </h3>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    {rule.summary}
                  </div>
                </div>

                <button
                  onClick={() => handleTestRule(rule.num)}
                  disabled={isCurrentlyTesting || isRunningAll}
                  className="btn btn-secondary btn-sm"
                  style={{ border: '1px solid var(--primary)', color: 'var(--primary)' }}
                >
                  <Play size={13} /> {isCurrentlyTesting ? 'Probando...' : 'Probar'}
                </button>
              </div>

              {/* Technical Rule Logic Explanation */}
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5, background: 'var(--bg-surface-elevated)', padding: '0.625rem 0.75rem', borderRadius: 'var(--radius-md)' }}>
                <strong>Lógica backend:</strong> {rule.description}
              </p>

              {/* Live Test Results Output */}
              {result && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.25rem' }}>
                  {/* Valid Case */}
                  <div style={{
                    padding: '0.625rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--emerald-bg)',
                    border: '1px solid var(--emerald-border)',
                    fontSize: '0.78rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.5rem'
                  }}>
                    <CheckCircle size={16} style={{ color: 'var(--emerald)', flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <div style={{ fontWeight: 700, color: '#34d399' }}>Caso Válido (Debe Aprobar):</div>
                      <div style={{ color: 'var(--text-primary)' }}>{result.validCase?.input}</div>
                      <div style={{ color: '#34d399', fontSize: '0.72rem', marginTop: '0.15rem' }}>
                        Resultado: {result.validCase?.message}
                      </div>
                    </div>
                  </div>

                  {/* Invalid Case */}
                  <div style={{
                    padding: '0.625rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--rose-bg)',
                    border: '1px solid var(--rose-border)',
                    fontSize: '0.78rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.5rem'
                  }}>
                    <XCircle size={16} style={{ color: 'var(--rose)', flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <div style={{ fontWeight: 700, color: '#fb7185' }}>Caso Inválido (Debe Bloquear):</div>
                      <div style={{ color: 'var(--text-primary)' }}>{result.invalidCase?.input}</div>
                      <div style={{ color: '#fb7185', fontSize: '0.72rem', marginTop: '0.15rem' }}>
                        Código Bloqueado: <strong>{result.invalidCase?.code}</strong>
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>
                        Mensaje: {result.invalidCase?.message}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
