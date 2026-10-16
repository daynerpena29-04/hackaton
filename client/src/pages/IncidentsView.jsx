import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Plus,
  Search,
  Sparkles,
  CheckCircle2,
  Clock,
  Check,
  Cpu,
  User,
  MapPin,
  ArrowRight,
  ShieldAlert,
  Edit,
  ExternalLink
} from 'lucide-react';
import api from '../services/api';
import Badge from '../components/Badge';
import Modal from '../components/Modal';

export default function IncidentsView({ onShowToast, runtimeApiKey, onOpenApiKeyModal }) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Modals & Active selections
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [isAiReviewModalOpen, setIsAiReviewModalOpen] = useState(false);
  const [isManualTriageModalOpen, setIsManualTriageModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [aiAnalysisResult, setAiAnalysisResult] = useState(null);
  const [analyzingId, setAnalyzingId] = useState(null);

  // Form states
  const [newForm, setNewForm] = useState({
    title: '',
    description: '',
    location_or_space_id: 'SP-001',
    category: 'INFRAESTRUCTURA',
    priority: 'MEDIA',
    responsible_area: 'SOPORTE_TI',
    reported_by: ''
  });

  const [resolveForm, setResolveForm] = useState({
    solution_notes: '',
    targetStatus: 'RESUELTA'
  });

  const [triageForm, setTriageForm] = useState({
    suggested_category: 'INFRAESTRUCTURA',
    suggested_priority: 'MEDIA',
    suggested_area: 'SOPORTE_TI',
    suggested_solution: ''
  });

  const loadIncidents = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;

      const data = await api.getIncidents(params);
      setIncidents(data);
    } catch (err) {
      onShowToast({ type: 'error', title: 'Error al consultar incidencias', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, [statusFilter, priorityFilter]);

  const handleCreateIncident = async (e) => {
    e.preventDefault();
    try {
      const created = await api.createIncident(newForm);
      onShowToast({
        type: 'success',
        title: 'Incidencia Registrada',
        message: `Caso '${created.title}' creado exitosamente. Puede ejecutar el Triaje IA a continuación.`
      });
      setIsNewModalOpen(false);
      loadIncidents();
    } catch (err) {
      onShowToast({ type: 'error', title: 'Error al registrar incidencia', message: err.message });
    }
  };

  const handleRunAiTriage = async (incident) => {
    setSelectedIncident(incident);
    setAnalyzingId(incident.id);

    try {
      const res = await api.runAiTriage(incident.id, runtimeApiKey);

      if (res.success && res.recommendation) {
        setAiAnalysisResult(res);
        setTriageForm({
          suggested_category: res.recommendation.suggested_category,
          suggested_priority: res.recommendation.suggested_priority,
          suggested_area: res.recommendation.suggested_area,
          suggested_solution: res.recommendation.suggested_solution
        });
        setIsAiReviewModalOpen(true);
        onShowToast({
          type: 'success',
          title: 'Triaje IA Completado',
          message: `Analizado con ${res.provider} (${res.model}). Revise y confirme antes de aplicar.`
        });
        loadIncidents();
      } else {
        // Fallback manual transparente
        onShowToast({
          type: 'error',
          title: 'IA no disponible',
          message: res.error || 'Configure su API key en el panel superior o use el Triaje Manual.'
        });
        setTriageForm({
          suggested_category: incident.category || 'INFRAESTRUCTURA',
          suggested_priority: incident.priority || 'MEDIA',
          suggested_area: incident.responsible_area || 'SOPORTE_TI',
          suggested_solution: ''
        });
        setIsManualTriageModalOpen(true);
      }
    } catch (err) {
      onShowToast({
        type: 'error',
        title: 'Error de IA',
        message: `${err.message}. Abriendo modo de triaje manual transparente.`
      });
      setIsManualTriageModalOpen(true);
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleApplyAiTriage = async () => {
    try {
      const rec = {
        ...aiAnalysisResult?.recommendation,
        ...triageForm
      };
      await api.applyAiTriage(selectedIncident.id, rec);
      onShowToast({
        type: 'success',
        title: 'Triaje Confirmado & Aplicado',
        message: `Incidencia '${selectedIncident.id}' clasificada como ${rec.suggested_priority} y asignada a ${rec.suggested_area}.`
      });
      setIsAiReviewModalOpen(false);
      setIsManualTriageModalOpen(false);
      loadIncidents();
    } catch (err) {
      onShowToast({ type: 'error', title: 'Error al aplicar triaje', message: err.message });
    }
  };

  const handleOpenResolveModal = (incident, targetStatus) => {
    setSelectedIncident(incident);
    setResolveForm({
      solution_notes: incident.solution_notes || '',
      targetStatus
    });
    setIsResolveModalOpen(true);
  };

  const handleConfirmResolve = async (e) => {
    e.preventDefault();
    try {
      await api.updateIncident(selectedIncident.id, {
        status: resolveForm.targetStatus,
        solution_notes: resolveForm.solution_notes
      });
      onShowToast({
        type: 'success',
        title: `Incidencia ${resolveForm.targetStatus === 'CERRADA' ? 'Cerrada' : 'Resuelta'}`,
        message: `Estado actualizado exitosamente con notas técnicas de solución (Regla 6 cumplida).`
      });
      setIsResolveModalOpen(false);
      loadIncidents();
    } catch (err) {
      onShowToast({
        type: 'error',
        title: 'Bloqueo Regla 6 (Integridad)',
        message: err.message,
        code: err.code
      });
    }
  };

  const handleSetInProgress = async (incident) => {
    try {
      await api.updateIncident(incident.id, { status: 'EN_PROCESO' });
      onShowToast({
        type: 'info',
        title: 'Incidencia en Proceso',
        message: `Caso '${incident.id}' puesto en atención técnica.`
      });
      loadIncidents();
    } catch (err) {
      onShowToast({ type: 'error', title: 'Error en transición', message: err.message, code: err.code });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Incidencias & Triaje con IA</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Detección inteligente de prioridades, enrutamiento a áreas técnicas y control estricto de cierre
          </p>
        </div>

        <button
          onClick={() => {
            setNewForm({
              title: '',
              description: '',
              location_or_space_id: 'SP-001',
              category: 'INFRAESTRUCTURA',
              priority: 'MEDIA',
              responsible_area: 'SOPORTE_TI',
              reported_by: ''
            });
            setIsNewModalOpen(true);
          }}
          className="btn btn-primary btn-sm"
        >
          <Plus size={16} /> Reportar Incidencia
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ width: '100%', paddingLeft: '2.25rem' }}
            placeholder="Buscar por título, descripción, informante..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadIncidents()}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Todos los Estados</option>
            <option value="ABIERTA">Abiertas</option>
            <option value="EN_PROCESO">En Proceso</option>
            <option value="RESUELTA">Resueltas</option>
            <option value="CERRADA">Cerradas</option>
          </select>

          <select
            className="form-select"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="">Todas las Prioridades</option>
            <option value="CRITICA">Crítica (Riesgo Inmediato)</option>
            <option value="ALTA">Alta</option>
            <option value="MEDIA">Media</option>
            <option value="BAJA">Baja</option>
          </select>

          {(search || statusFilter || priorityFilter) && (
            <button
              onClick={() => { setSearch(''); setStatusFilter(''); setPriorityFilter(''); }}
              className="btn btn-secondary btn-sm"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* List / Cards of Incidents */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Cargando incidencias operativas...
        </div>
      ) : incidents.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <CheckCircle2 size={40} style={{ color: 'var(--emerald)', margin: '0 auto 1rem' }} />
          <h4 style={{ fontWeight: 700 }}>No hay incidencias que coincidan</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>El campus está operando con normalidad.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {incidents.map((inc) => {
            const isCritical = inc.priority === 'CRITICA';
            const isAnalyzing = analyzingId === inc.id;
            const aiData = inc.ai_classification;

            return (
              <div
                key={inc.id}
                className="card"
                style={{
                  borderLeft: `4px solid ${isCritical ? 'var(--rose)' : (inc.priority === 'ALTA' ? 'var(--amber)' : 'var(--border-subtle)')}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.875rem'
                }}
              >
                {/* Header Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--primary)', fontSize: '0.875rem' }}>
                      {inc.id}
                    </span>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {inc.title}
                    </h3>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <Badge type={inc.priority} label={`Prioridad ${inc.priority}`} />
                    <Badge type={inc.status} />
                    {inc.ai_status === 'APLICADO' && (
                      <span className="badge badge-purple" title="Clasificado y sugerido por IA">
                        <Sparkles size={11} /> Triaje IA
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {inc.description}
                </p>

                {/* AI Recommendation Highlight Box (if analyzed or applied) */}
                {aiData && (
                  <div className="ai-recommendation-box" style={{ marginTop: '0.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: 700, color: '#c084fc' }}>
                        <Sparkles size={14} /> Recomendación Generada por IA ({aiData.model_used || 'Gemini'})
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Confianza: {Math.round((aiData.confidence || 0.9) * 100)}%
                      </span>
                    </div>

                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                      <strong>Solución Propuesta:</strong> {aiData.suggested_solution}
                    </div>

                    {aiData.action_plan_steps && Array.isArray(aiData.action_plan_steps) && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.35rem' }}>
                        {aiData.action_plan_steps.map((step, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '0.4rem' }}>
                            <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{idx + 1}.</span>
                            <span>{step}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Solution Notes (if resolved or closed) */}
                {inc.solution_notes && (
                  <div style={{ padding: '0.625rem 0.875rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-elevated)', border: '1px solid var(--emerald-border)', fontSize: '0.8125rem' }}>
                    <div style={{ fontWeight: 700, color: '#34d399', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <CheckCircle2 size={15} /> Solución Técnica Aplicada:
                    </div>
                    <div style={{ color: 'var(--text-secondary)' }}>{inc.solution_notes}</div>
                  </div>
                )}

                {/* Meta details footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <User size={13} /> {inc.reported_by}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <MapPin size={13} /> {inc.location_or_space_id || 'Campus'}
                    </span>
                    <span>Área: <strong>{inc.responsible_area}</strong></span>
                    <span>Categoría: <strong>{inc.category}</strong></span>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {/* Run AI Triage Button */}
                    <button
                      onClick={() => handleRunAiTriage(inc)}
                      disabled={isAnalyzing}
                      className="btn btn-ai btn-sm"
                      title="Analizar con modelo de Inteligencia Artificial"
                    >
                      <Sparkles size={13} />
                      {isAnalyzing ? 'Analizando...' : (aiData ? 'Re-analizar IA' : 'Triaje con IA')}
                    </button>

                    {/* State Transitions according to Rule 6 */}
                    {inc.status === 'ABIERTA' && (
                      <button
                        onClick={() => handleSetInProgress(inc)}
                        className="btn btn-secondary btn-sm"
                      >
                        Iniciar Atención
                      </button>
                    )}

                    {inc.status === 'EN_PROCESO' && (
                      <button
                        onClick={() => handleOpenResolveModal(inc, 'RESUELTA')}
                        className="btn btn-success btn-sm"
                      >
                        <Check size={14} /> Resolver Incidencia
                      </button>
                    )}

                    {inc.status === 'RESUELTA' && (
                      <button
                        onClick={() => handleOpenResolveModal(inc, 'CERRADA')}
                        className="btn btn-secondary btn-sm"
                        style={{ border: '1px solid var(--border-subtle)' }}
                      >
                        Cerrar Definitivamente
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Reportar Nueva Incidencia */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="Reportar Nueva Incidencia Operativa"
        maxWidth="550px"
      >
        <form onSubmit={handleCreateIncident}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Título Breve *</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="Ej. Aire acondicionado apagado en Aula Apollo"
                value={newForm.title}
                onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Descripción Detallada del Problema *</label>
              <textarea
                className="form-textarea"
                rows="3"
                required
                placeholder="Explica qué ocurre, cuántos campers se ven afectados, si hay olores extraños o mensajes de error..."
                value={newForm.description}
                onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Ubicación / Espacio</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej. SP-001 (Aula Artemis)"
                  value={newForm.location_or_space_id}
                  onChange={(e) => setNewForm({ ...newForm, location_or_space_id: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Reportado por *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="Tu nombre y rol (Camper / Trainer)"
                  value={newForm.reported_by}
                  onChange={(e) => setNewForm({ ...newForm, reported_by: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Categoría Preliminar</label>
                <select
                  className="form-select"
                  value={newForm.category}
                  onChange={(e) => setNewForm({ ...newForm, category: e.target.value })}
                >
                  <option value="INFRAESTRUCTURA">Infraestructura</option>
                  <option value="EQUIPOS">Equipos</option>
                  <option value="CONECTIVIDAD">Conectividad</option>
                  <option value="CLIMATIZACION">Climatización</option>
                  <option value="ELECTRICA">Eléctrica</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Prioridad Inicial</label>
                <select
                  className="form-select"
                  value={newForm.priority}
                  onChange={(e) => setNewForm({ ...newForm, priority: e.target.value })}
                >
                  <option value="BAJA">Baja</option>
                  <option value="MEDIA">Media</option>
                  <option value="ALTA">Alta</option>
                  <option value="CRITICA">Crítica</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Área Destino</label>
                <select
                  className="form-select"
                  value={newForm.responsible_area}
                  onChange={(e) => setNewForm({ ...newForm, responsible_area: e.target.value })}
                >
                  <option value="SOPORTE_TI">Soporte TI</option>
                  <option value="MANTENIMIENTO_FISICO">Mantenimiento</option>
                  <option value="SERVICIOS_GENERALES">Serv. Generales</option>
                  <option value="COORDINACION_ACADEMICA">Coordinación</option>
                </select>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={() => setIsNewModalOpen(false)} className="btn btn-secondary btn-sm">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              Registrar Incidencia
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Revisión de Triaje IA (Human in the loop) */}
      <Modal
        isOpen={isAiReviewModalOpen}
        onClose={() => setIsAiReviewModalOpen(false)}
        title="Revisión de Triaje Inteligente por IA"
        maxWidth="600px"
      >
        <div className="modal-body">
          <div style={{ padding: '0.875rem', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(236, 72, 153, 0.1))', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <div style={{ fontWeight: 700, color: '#c084fc', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}>
                <Cpu size={16} /> {aiAnalysisResult?.provider} ({aiAnalysisResult?.model})
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Nivel de Certeza: {Math.round((aiAnalysisResult?.recommendation?.confidence || 0.9) * 100)}%
              </span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              {aiAnalysisResult?.recommendation?.explanation}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Categoría Sugerida</label>
              <select
                className="form-select"
                value={triageForm.suggested_category}
                onChange={(e) => setTriageForm({ ...triageForm, suggested_category: e.target.value })}
              >
                <option value="INFRAESTRUCTURA">INFRAESTRUCTURA</option>
                <option value="EQUIPOS">EQUIPOS</option>
                <option value="CONECTIVIDAD">CONECTIVIDAD</option>
                <option value="CLIMATIZACION">CLIMATIZACION</option>
                <option value="ELECTRICA">ELECTRICA</option>
                <option value="OTRO">OTRO</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Prioridad Sugerida</label>
              <select
                className="form-select"
                value={triageForm.suggested_priority}
                onChange={(e) => setTriageForm({ ...triageForm, suggested_priority: e.target.value })}
              >
                <option value="CRITICA">CRÍTICA (Bloqueante)</option>
                <option value="ALTA">ALTA</option>
                <option value="MEDIA">MEDIA</option>
                <option value="BAJA">BAJA</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Área Responsable</label>
              <select
                className="form-select"
                value={triageForm.suggested_area}
                onChange={(e) => setTriageForm({ ...triageForm, suggested_area: e.target.value })}
              >
                <option value="SOPORTE_TI">SOPORTE_TI</option>
                <option value="MANTENIMIENTO_FISICO">MANTENIMIENTO_FISICO</option>
                <option value="SERVICIOS_GENERALES">SERVICIOS_GENERALES</option>
                <option value="COORDINACION_ACADEMICA">COORDINACION</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Ruta de Atención / Procedimiento Técnico Sugerido</label>
            <textarea
              className="form-textarea"
              rows="3"
              value={triageForm.suggested_solution}
              onChange={(e) => setTriageForm({ ...triageForm, suggested_solution: e.target.value })}
            />
          </div>

          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <strong>Human-in-the-loop:</strong> Puede editar cualquiera de los campos anteriores antes de confirmar. La IA asiste y recomienda, pero el operador confirma la decisión operativa.
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" onClick={() => setIsAiReviewModalOpen(false)} className="btn btn-secondary btn-sm">
            Descartar
          </button>
          <button type="button" onClick={handleApplyAiTriage} className="btn btn-ai btn-sm">
            <Check size={14} /> Confirmar y Aplicar al Flujo
          </button>
        </div>
      </Modal>

      {/* MODAL: Triaje Manual Transparente (Fallback si la IA no está disponible) */}
      <Modal
        isOpen={isManualTriageModalOpen}
        onClose={() => setIsManualTriageModalOpen(false)}
        title="Triaje Manual Transparente (Procedimiento de Contingencia)"
        maxWidth="550px"
      >
        <div className="modal-body">
          <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--amber-bg)', border: '1px solid var(--amber-border)', color: '#fbbf24', fontSize: '0.8125rem' }}>
            <strong>Modo Manual Activo:</strong> La API de IA no se encuentra configurada o no respondió. Puede continuar la clasificación manual sin interrumpir la operación del campus.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Prioridad Determinada *</label>
              <select
                className="form-select"
                value={triageForm.suggested_priority}
                onChange={(e) => setTriageForm({ ...triageForm, suggested_priority: e.target.value })}
              >
                <option value="CRITICA">CRÍTICA (Impacta a todo un salón/riesgo eléctrico)</option>
                <option value="ALTA">ALTA</option>
                <option value="MEDIA">MEDIA</option>
                <option value="BAJA">BAJA</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Área Responsable *</label>
              <select
                className="form-select"
                value={triageForm.suggested_area}
                onChange={(e) => setTriageForm({ ...triageForm, suggested_area: e.target.value })}
              >
                <option value="SOPORTE_TI">Soporte TI</option>
                <option value="MANTENIMIENTO_FISICO">Mantenimiento Físico</option>
                <option value="SERVICIOS_GENERALES">Servicios Generales</option>
                <option value="COORDINACION_ACADEMICA">Coordinación Académica</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Categoría *</label>
            <select
              className="form-select"
              value={triageForm.suggested_category}
              onChange={(e) => setTriageForm({ ...triageForm, suggested_category: e.target.value })}
            >
              <option value="INFRAESTRUCTURA">INFRAESTRUCTURA</option>
              <option value="EQUIPOS">EQUIPOS</option>
              <option value="CONECTIVIDAD">CONECTIVIDAD</option>
              <option value="CLIMATIZACION">CLIMATIZACION</option>
              <option value="ELECTRICA">ELECTRICA</option>
              <option value="OTRO">OTRO</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Plan o Procedimiento de Acción Inicial</label>
            <textarea
              className="form-textarea"
              rows="2"
              placeholder="Instrucciones para el técnico..."
              value={triageForm.suggested_solution}
              onChange={(e) => setTriageForm({ ...triageForm, suggested_solution: e.target.value })}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" onClick={() => setIsManualTriageModalOpen(false)} className="btn btn-secondary btn-sm">
            Cancelar
          </button>
          <button type="button" onClick={handleApplyAiTriage} className="btn btn-primary btn-sm">
            Guardar Clasificación Manual
          </button>
        </div>
      </Modal>

      {/* MODAL: Resolver / Cerrar Incidencia (Cumplimiento Regla 6) */}
      <Modal
        isOpen={isResolveModalOpen}
        onClose={() => setIsResolveModalOpen(false)}
        title={`${resolveForm.targetStatus === 'CERRADA' ? 'Cierre Definitivo' : 'Resolución'} de Incidencia: ${selectedIncident?.id || ''}`}
        maxWidth="500px"
      >
        <form onSubmit={handleConfirmResolve}>
          <div className="modal-body">
            {/* Rule 6 Requirement Note */}
            <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', fontSize: '0.8125rem' }}>
              <strong>Regla 6 (Integridad):</strong> Para marcar la incidencia como <code>{resolveForm.targetStatus}</code> es mandatorio documentar la solución técnica aplicada (mínimo 5 caracteres).
            </div>

            <div className="form-group">
              <label className="form-label">Detalle de la Solución Técnica Aplicada *</label>
              <textarea
                className="form-textarea"
                rows="4"
                required
                placeholder="Describe el arreglo efectuado, repuestos cambiados, pruebas realizadas o confirmación con el usuario..."
                value={resolveForm.solution_notes}
                onChange={(e) => setResolveForm({ ...resolveForm, solution_notes: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={() => setIsResolveModalOpen(false)} className="btn btn-secondary btn-sm">
              Cancelar
            </button>
            <button type="submit" className="btn btn-success btn-sm">
              <Check size={14} /> Confirmar {resolveForm.targetStatus}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
