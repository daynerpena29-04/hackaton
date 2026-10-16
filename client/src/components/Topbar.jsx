import React from 'react';
import { Cpu, Key, Moon, Sun, ShieldCheck } from 'lucide-react';

export default function Topbar({ currentView, aiStatus, onOpenApiKeyModal, onOpenRulesTester, theme, onToggleTheme }) {
  const titles = {
    dashboard: 'Panel de Control Operativo',
    spaces: 'Módulo 1: Gestión de Espacios y Aforo',
    assets: 'Módulo 2: Recursos Tecnológicos y Préstamos',
    incidents: 'Módulo 3: Incidencias y Triaje con Inteligencia Artificial',
    rules: 'Validación en Vivo de Reglas de Negocio (Sustentación)',
    data: 'Centro de Datos Oficiales de Campuslands',
    audit: 'Historial de Auditoría y Trazabilidad de Operaciones'
  };

  return (
    <header className="topbar">
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          {titles[currentView] || 'Gestión Operativa'}
        </h2>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Campuslands • Sistema Central en Tiempo Real
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Live Rules Quick Action */}
        <button
          onClick={onOpenRulesTester}
          className="btn btn-secondary btn-sm"
          title="Verificación en vivo de las 6 reglas obligatorias"
        >
          <ShieldCheck size={16} style={{ color: 'var(--cyan)' }} />
          <span>Probar Reglas</span>
        </button>

        {/* AI Status Badge & Config */}
        <button
          onClick={onOpenApiKeyModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 0.75rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid',
            borderColor: aiStatus?.isAvailable ? 'rgba(139, 92, 246, 0.4)' : 'var(--border-subtle)',
            background: aiStatus?.isAvailable ? 'rgba(139, 92, 246, 0.12)' : 'var(--bg-surface-elevated)',
            color: aiStatus?.isAvailable ? '#c084fc' : 'var(--text-secondary)',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all var(--transition-fast)'
          }}
          title="Configurar credenciales de Inteligencia Artificial (Gemini / OpenAI)"
        >
          <Cpu size={15} style={{ color: aiStatus?.isAvailable ? '#a855f7' : 'var(--text-muted)' }} />
          <span>IA: {aiStatus?.provider || 'Modo Manual'}</span>
          <Key size={13} style={{ opacity: 0.6 }} />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="btn btn-secondary btn-sm"
          style={{ padding: '0.4rem', borderRadius: '50%' }}
          title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>
    </header>
  );
}
