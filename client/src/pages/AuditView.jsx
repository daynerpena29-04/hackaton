import React, { useState, useEffect } from 'react';
import { History, Search, Filter, ShieldCheck, RefreshCw } from 'lucide-react';
import api from '../services/api';

export default function AuditView({ onShowToast }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await api.getAuditLogs(100);
      setLogs(data);
    } catch (err) {
      onShowToast({ type: 'error', title: 'Error al cargar auditoría', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (filterType && log.entity_type !== filterType) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        log.entity_id.toLowerCase().includes(s) ||
        log.action.toLowerCase().includes(s) ||
        (log.details && log.details.toLowerCase().includes(s))
      );
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Historial de Auditoría & Trazabilidad</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Registro inmutable de todas las transacciones, préstamos, devoluciones y cambios de estado en Campuslands
          </p>
        </div>

        <button onClick={loadLogs} className="btn btn-secondary btn-sm">
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      {/* Filter and Search */}
      <div className="card" style={{ padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ width: '100%', paddingLeft: '2.25rem' }}
            placeholder="Buscar por ID, acción o detalles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="form-select"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">Todas las Entidades</option>
          <option value="ESPACIO">Espacios</option>
          <option value="RESERVA">Reservas</option>
          <option value="EQUIPO">Equipos</option>
          <option value="PRESTAMO">Préstamos</option>
          <option value="INCIDENCIA">Incidencias</option>
          <option value="IMPORTACION">Importación</option>
        </select>
      </div>

      {/* Audit Table */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Cargando registros de auditoría...
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <History size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
          <h4 style={{ fontWeight: 700 }}>No hay eventos registrados</h4>
        </div>
      ) : (
        <div className="table-container">
          <table className="table-modern">
            <thead>
              <tr>
                <th>ID</th>
                <th>Fecha y Hora</th>
                <th>Entidad</th>
                <th>Identificador</th>
                <th>Operación</th>
                <th>Actor</th>
                <th>Detalles de la Operación</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>#{log.id}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{log.timestamp}</td>
                  <td>
                    <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--primary)' }}>
                      {log.entity_type}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{log.entity_id}</td>
                  <td>
                    <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', fontWeight: 600 }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{log.actor}</td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: '350px', wordBreak: 'break-word', fontFamily: 'monospace' }}>
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
