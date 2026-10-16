import React from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type || 'info'}`}>
          {t.type === 'success' && <CheckCircle size={20} className="text-emerald-400" style={{ color: 'var(--emerald)', flexShrink: 0 }} />}
          {t.type === 'error' && <AlertCircle size={20} className="text-rose-400" style={{ color: 'var(--rose)', flexShrink: 0 }} />}
          {t.type === 'info' && <Info size={20} className="text-indigo-400" style={{ color: 'var(--primary)', flexShrink: 0 }} />}
          
          <div style={{ flex: 1, minWidth: 0 }}>
            {t.title && <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.2rem' }}>{t.title}</div>}
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', wordBreak: 'break-word' }}>
              {t.message}
            </div>
            {t.code && (
              <div style={{ marginTop: '0.35rem', display: 'inline-block', fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', fontFamily: 'monospace' }}>
                Código: {t.code}
              </div>
            )}
          </div>

          <button
            onClick={() => onDismiss(t.id)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
