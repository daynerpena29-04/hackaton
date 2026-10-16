import React from 'react';
import {
  Building2,
  Laptop,
  AlertTriangle,
  Calendar,
  PlusCircle,
  ShieldCheck,
  History,
  ArrowRight,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import Badge from '../components/Badge';

export default function DashboardView({ stats, onNavigate, onOpenNewReservation, onOpenNewLoan, onOpenNewIncident }) {
  const spaces = stats?.spaces || { total: 0, available: 0, maintenance: 0 };
  const assets = stats?.assets || { total: 0, available: 0, loaned: 0, issues: 0 };
  const incidents = stats?.incidents || { total: 0, open: 0, inProgress: 0, critical: 0 };
  const reservationsCount = stats?.activeReservations || 0;
  const recentActivity = stats?.recentActivity || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Hero Welcome Banner */}
      <div style={{
        position: 'relative',
        borderRadius: 'var(--radius-xl)',
        padding: '2rem 2.5rem',
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(6, 182, 212, 0.1) 50%, rgba(15, 21, 36, 0.8) 100%)',
        border: '1px solid var(--border-highlight)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-md)'
      }}>
        <div style={{ maxWidth: '700px', position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.25rem 0.75rem', borderRadius: '9999px', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.875rem' }}>
            <Sparkles size={14} /> CAMPUS EN TIEMPO REAL
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.2, marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
            Sistema Central de Gestión Operativa
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            Centralización y control de espacios, recursos tecnológicos e incidencias con triaje asistido por IA y validación determinista de aforos, horarios e integridad operativa.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            <button onClick={onOpenNewReservation} className="btn btn-primary btn-sm">
              <Calendar size={15} /> Reservar Espacio
            </button>
            <button onClick={onOpenNewLoan} className="btn btn-secondary btn-sm">
              <Laptop size={15} /> Prestar Equipo
            </button>
            <button onClick={onOpenNewIncident} className="btn btn-ai btn-sm">
              <Sparkles size={15} /> Reportar con Triaje IA
            </button>
            <button onClick={() => onNavigate('rules')} className="btn btn-secondary btn-sm" style={{ border: '1px solid var(--cyan)' }}>
              <ShieldCheck size={15} style={{ color: 'var(--cyan)' }} /> Validar Reglas en Vivo
            </button>
          </div>
        </div>
      </div>

      {/* 4 Core KPI Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
        {/* Espacios */}
        <div className="stat-card" onClick={() => onNavigate('spaces')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Espacios de Campus</span>
            <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)' }}>
              <Building2 size={20} />
            </div>
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
            {spaces.available} <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>/ {spaces.total} Libres</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.78rem' }}>
            <Badge type="disponible" label={`${spaces.available} Disponibles`} />
            {spaces.maintenance > 0 && <Badge type="en_mantenimiento" label={`${spaces.maintenance} Inoperables`} />}
          </div>
        </div>

        {/* Recursos */}
        <div className="stat-card" onClick={() => onNavigate('assets')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Equipos e Inventario TI</span>
            <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', background: 'rgba(6, 182, 212, 0.1)', color: 'var(--cyan)' }}>
              <Laptop size={20} />
            </div>
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
            {assets.available} <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>/ {assets.total} Listos</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.78rem' }}>
            <Badge type="prestado" label={`${assets.loaned} Prestados`} />
            {assets.issues > 0 && <Badge type="danado" label={`${assets.issues} En Falla/Mant`} />}
          </div>
        </div>

        {/* Incidencias */}
        <div className="stat-card" onClick={() => onNavigate('incidents')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Incidencias Activas</span>
            <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', background: incidents.critical > 0 ? 'var(--rose-bg)' : 'rgba(245, 158, 11, 0.1)', color: incidents.critical > 0 ? 'var(--rose)' : 'var(--amber)' }}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
            {incidents.open + incidents.inProgress} <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Pendientes</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.78rem' }}>
            {incidents.critical > 0 ? (
              <Badge type="critica" label={`${incidents.critical} Críticas`} />
            ) : (
              <Badge type="optimo" label="Sin alertas críticas" />
            )}
            <span style={{ color: 'var(--text-muted)' }}>{incidents.inProgress} en curso</span>
          </div>
        </div>

        {/* Reservas Activas */}
        <div className="stat-card" onClick={() => onNavigate('spaces')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Reservas Confirmadas</span>
            <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--emerald)' }}>
              <Calendar size={20} />
            </div>
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
            {reservationsCount} <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Programadas</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.78rem' }}>
            <Badge type="confirmada" label="0 Conflictos de Horario" />
          </div>
        </div>
      </div>

      {/* Grid: Live Rules Checklist + Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem' }}>
        {/* Compliance Checklist Card */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Matriz de Reglas de Negocio</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Validaciones obligatorias integradas en el backend
              </p>
            </div>
            <button onClick={() => onNavigate('rules')} className="btn btn-secondary btn-sm">
              Probar en Vivo <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { rule: 'Regla 1: Control de Aforo', desc: 'Bloqueo si el número de asistentes supera la capacidad del aula.' },
              { rule: 'Regla 2: Superposición de Horarios', desc: 'Detección instantánea de traslapes en fechas y franjas horarias.' },
              { rule: 'Regla 3: Estado Operativo del Espacio', desc: 'Aulas en mantenimiento o inhabilitadas no admiten asignaciones.' },
              { rule: 'Regla 4: Disponibilidad de Equipos', desc: 'Impedir préstamos de equipos dañados, en reparación o ya prestados.' },
              { rule: 'Regla 5: Integridad de Operaciones', desc: 'Trazabilidad atómica y bloqueo de devoluciones redundantes.' },
              { rule: 'Regla 6: Integridad de Incidencias', desc: 'Flujo de estados válido y solución obligatoria para cierre.' }
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.625rem 0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)' }}>
                <CheckCircle2 size={18} style={{ color: 'var(--emerald)', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>{r.rule}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{r.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity Audit Log */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Actividad Operativa Reciente</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Trazabilidad inmutable de préstamos, reservas y cambios
              </p>
            </div>
            <button onClick={() => onNavigate('audit')} className="btn btn-secondary btn-sm">
              Ver Historial Completo
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {recentActivity.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                No hay actividad registrada aún.
              </div>
            ) : (
              recentActivity.map((log) => (
                <div key={log.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', fontSize: '0.8125rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <History size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                    <div>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>[{log.entity_type}] </span>
                      <span style={{ color: 'var(--text-secondary)' }}>{log.action} ({log.entity_id})</span>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    {log.timestamp}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
