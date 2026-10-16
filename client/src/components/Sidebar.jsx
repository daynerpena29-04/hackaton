import React from 'react';
import {
  LayoutDashboard,
  Building2,
  Laptop,
  AlertTriangle,
  ShieldCheck,
  Database,
  History,
  Sparkles
} from 'lucide-react';

export default function Sidebar({ currentView, onNavigate, stats }) {
  const navItems = [
    { id: 'dashboard', label: 'Panel Principal', icon: LayoutDashboard },
    { id: 'spaces', label: '1. Espacios & Reservas', icon: Building2, count: stats?.spaces?.total },
    { id: 'assets', label: '2. Recursos & Préstamos', icon: Laptop, count: stats?.assets?.total },
    { id: 'incidents', label: '3. Incidencias & IA', icon: AlertTriangle, count: stats?.incidents?.open, alert: Boolean(stats?.incidents?.critical > 0) },
    { id: 'rules', label: 'Reglas de Negocio en Vivo', icon: ShieldCheck, badge: '6 Reglas' },
    { id: 'data', label: 'Datos Oficiales', icon: Database },
    { id: 'audit', label: 'Auditoría & Trazabilidad', icon: History }
  ];

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          boxShadow: '0 4px 12px var(--primary-glow)'
        }}>
          <Sparkles size={20} />
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.02em', background: 'linear-gradient(90deg, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            CAMPUSLANDS
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>
            GESTIÓN OPERATIVA
          </div>
        </div>
      </div>

      {/* Nav List */}
      <nav style={{ flex: 1, padding: '1.25rem 0.875rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: isActive ? 'linear-gradient(90deg, rgba(99, 102, 241, 0.15), rgba(6, 182, 212, 0.08))' : 'transparent',
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.875rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all var(--transition-fast)',
                borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent'
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = 'transparent';
              }}
            >
              <Icon size={18} style={{ color: isActive ? 'var(--primary)' : 'inherit', flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{item.label}</span>

              {item.badge && (
                <span style={{
                  fontSize: '0.65rem',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '9999px',
                  background: 'linear-gradient(135deg, var(--primary), var(--cyan))',
                  color: '#fff',
                  fontWeight: 700
                }}>
                  {item.badge}
                </span>
              )}

              {item.count !== undefined && !item.badge && (
                <span style={{
                  fontSize: '0.7rem',
                  padding: '0.1rem 0.45rem',
                  borderRadius: '9999px',
                  background: item.alert ? 'var(--rose-bg)' : 'var(--bg-surface-elevated)',
                  color: item.alert ? '#fb7185' : 'var(--text-muted)',
                  fontWeight: 600,
                  border: item.alert ? '1px solid var(--rose-border)' : '1px solid var(--border-subtle)'
                }}>
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>CAMPUS ONLINE</span>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--emerald)', boxShadow: '0 0 8px var(--emerald)' }}></span>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          Hackatón Campuslands 2026
        </div>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
          5 Horas • SQLite • IA Triaje Real
        </div>
      </div>
    </aside>
  );
}
