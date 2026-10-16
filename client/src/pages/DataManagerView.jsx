import React, { useState } from 'react';
import {
  Database,
  UploadCloud,
  Download,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  FileText,
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react';
import api from '../services/api';

export default function DataManagerView({ stats, onRefreshStats, onShowToast }) {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'samples' | 'backup'
  const [selectedEntity, setSelectedEntity] = useState('spaces');
  const [strategy, setStrategy] = useState('UPDATE');
  const [selectedFile, setSelectedFile] = useState(null);
  const [manualText, setManualText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [importReport, setImportReport] = useState(null);

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile && !manualText.trim()) {
      onShowToast({ type: 'error', title: 'Archivo faltante', message: 'Selecciona un archivo o pega el contenido en texto.' });
      return;
    }

    setIsProcessing(true);
    setImportReport(null);

    try {
      if (selectedFile && selectedFile.name.endsWith('.csv')) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('entityType', selectedEntity);
        formData.append('strategy', strategy);

        const res = await api.importCsv(formData);
        setImportReport(res.result);
        onShowToast({
          type: 'success',
          title: 'Importación CSV Completada',
          message: `${res.result.validRecords} registros válidos procesados. Copia de seguridad guardada como ${res.backupFile}.`
        });
      } else if (selectedFile && selectedFile.name.endsWith('.json')) {
        const text = await selectedFile.text();
        const res = await api.importJson(text, selectedEntity, strategy);
        setImportReport(res.results[selectedEntity] || Object.values(res.results)[0]);
        onShowToast({
          type: 'success',
          title: 'Importación JSON Exitosa',
          message: `Datos procesados. Respaldo creado en ${res.backupFile}.`
        });
      } else if (manualText.trim()) {
        // Try parsing JSON or send as CSV text
        if (manualText.trim().startsWith('{') || manualText.trim().startsWith('[')) {
          const res = await api.importJson(manualText, selectedEntity, strategy);
          setImportReport(res.results[selectedEntity] || Object.values(res.results)[0]);
          onShowToast({ type: 'success', title: 'Importación JSON Procesada', message: 'Datos procesados exitosamente.' });
        } else {
          const formData = new FormData();
          formData.append('csvText', manualText);
          formData.append('entityType', selectedEntity);
          formData.append('strategy', strategy);
          const res = await api.importCsv(formData);
          setImportReport(res.result);
          onShowToast({ type: 'success', title: 'Importación CSV Procesada', message: `${res.result.validRecords} registros válidos.` });
        }
      }
      onRefreshStats();
    } catch (err) {
      onShowToast({ type: 'error', title: 'Error al importar datos', message: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadBackup = () => {
    window.location.href = '/api/data/export/json';
  };

  const handleRestoreOfficial = async () => {
    if (!window.confirm('¿Confirma que desea restaurar los datos oficiales originales de Campuslands? Se creará una copia de seguridad automática.')) {
      return;
    }

    try {
      await api.restoreOfficialData();
      onShowToast({
        type: 'success',
        title: 'Datos Oficiales Restaurados',
        message: 'Aulas, equipos e incidencias de Campuslands han vuelto a su estado original base.'
      });
      onRefreshStats();
    } catch (err) {
      onShowToast({ type: 'error', title: 'Error al restaurar', message: err.message });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Centro de Datos Oficiales de Campuslands</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Carga de archivos oficiales (JSON / CSV), validación de esquemas, detección de inconsistencias y persistencia segura
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={handleDownloadBackup} className="btn btn-secondary btn-sm">
            <Download size={15} /> Exportar Backup JSON
          </button>
          <button onClick={handleRestoreOfficial} className="btn btn-secondary btn-sm" style={{ border: '1px solid var(--amber)', color: 'var(--amber)' }}>
            <RotateCcw size={15} /> Restaurar Oficiales Base
          </button>
        </div>
      </div>

      {/* Official Data Health Status */}
      <div className="card" style={{ background: 'var(--bg-surface-elevated)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', padding: '1.25rem' }}>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Espacios Oficiales</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {stats?.spaces?.total || 0} Registros
          </div>
        </div>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Equipos Oficiales</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {stats?.assets?.total || 0} Registros
          </div>
        </div>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Incidencias Oficiales</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {stats?.incidents?.total || 0} Registros
          </div>
        </div>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Reservas Activas</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {stats?.activeReservations || 0} Registros
          </div>
        </div>
      </div>

      {/* Main Import Interface */}
      <div className="card">
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Importador y Validador de Datos Oficiales
        </h3>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Soporta lectura de archivos entregados por la organización en formato <strong>JSON</strong> o <strong>CSV</strong>. Detecta automáticamente campos faltantes, identificadores duplicados y valores de estado no reconocidos.
        </p>

        <form onSubmit={handleFileUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Entidad Destino *</label>
              <select
                className="form-select"
                value={selectedEntity}
                onChange={(e) => setSelectedEntity(e.target.value)}
              >
                <option value="spaces">Espacios (Aulas, Cubículos, Labs)</option>
                <option value="assets">Recursos Tecnológicos (Laptops, Monitores, etc.)</option>
                <option value="incidents">Incidencias Operativas</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Estrategia Ante Registros Existentes *</label>
              <select
                className="form-select"
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
              >
                <option value="UPDATE">Actualizar datos del registro existente (Recomendado)</option>
                <option value="SKIP">Omitir si el ID ya existe en la base de datos</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Seleccionar Archivo Local (.csv o .json)</label>
            <input
              type="file"
              accept=".csv,.json"
              className="form-input"
              onChange={(e) => setSelectedFile(e.target.files[0])}
            />
          </div>

          <div className="form-group">
            <label className="form-label">O pegar contenido directo en texto (CSV con cabeceras o JSON)</label>
            <textarea
              className="form-textarea"
              rows="4"
              placeholder={`id,name,type,capacity,status,location\nSP-100,Laboratorio IA,LABORATORIO,25,DISPONIBLE,Piso 3`}
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={isProcessing}
              className="btn btn-primary"
            >
              <UploadCloud size={16} />
              {isProcessing ? 'Validando y Cargando...' : 'Cargar y Validar Archivo Oficial'}
            </button>
          </div>
        </form>
      </div>

      {/* Import Report Card */}
      {importReport && (
        <div className="card" style={{ border: '1px solid var(--border-highlight)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
            <ShieldCheck size={22} style={{ color: 'var(--cyan)' }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
              Reporte de Validación de la Carga
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ padding: '0.75rem', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Procesados en Total</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{importReport.totalProcessed}</div>
            </div>
            <div style={{ padding: '0.75rem', background: 'var(--emerald-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--emerald-border)' }}>
              <span style={{ fontSize: '0.75rem', color: '#34d399' }}>Registros Válidos</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34d399' }}>{importReport.validRecords}</div>
            </div>
            <div style={{ padding: '0.75rem', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Nuevos Insertados</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)' }}>{importReport.insertedCount}</div>
            </div>
            <div style={{ padding: '0.75rem', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Actualizados</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{importReport.updatedCount}</div>
            </div>
            <div style={{ padding: '0.75rem', background: importReport.errorsCount > 0 ? 'var(--rose-bg)' : 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', border: importReport.errorsCount > 0 ? '1px solid var(--rose-border)' : '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.75rem', color: importReport.errorsCount > 0 ? '#fb7185' : 'var(--text-muted)' }}>Registros con Error</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: importReport.errorsCount > 0 ? '#fb7185' : 'inherit' }}>
                {importReport.errorsCount}
              </div>
            </div>
          </div>

          {importReport.errors && importReport.errors.length > 0 && (
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fb7185', marginBottom: '0.5rem' }}>
                Detalle de Registros Inconsistentes Rechazados:
              </h4>
              <div className="table-container">
                <table className="table-modern">
                  <thead>
                    <tr>
                      <th>Fila</th>
                      <th>Identificador (ID)</th>
                      <th>Motivo del Rechazo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importReport.errors.map((err, idx) => (
                      <tr key={idx}>
                        <td style={{ fontFamily: 'monospace' }}>#{err.row}</td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{err.id}</td>
                        <td style={{ color: '#fb7185' }}>{err.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
