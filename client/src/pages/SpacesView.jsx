import React, { useState, useEffect } from 'react';
import {
  Building2,
  Calendar,
  Plus,
  Search,
  Filter,
  Users,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Edit,
  Eye
} from 'lucide-react';
import api from '../services/api';
import Badge from '../components/Badge';
import Modal from '../components/Modal';

export default function SpacesView({ onShowToast, preselectedSpaceId, onClearPreselected }) {
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  const [isSpaceModalOpen, setIsSpaceModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState(null);

  // Form states
  const [reservationForm, setReservationForm] = useState({
    space_id: '',
    title: '',
    responsible_name: '',
    responsible_email: '',
    date: new Date().toISOString().substring(0, 10),
    start_time: '08:00',
    end_time: '12:00',
    attendees_count: 20,
    purpose: ''
  });

  const [spaceForm, setSpaceForm] = useState({
    id: '',
    name: '',
    type: 'AULA',
    capacity: 30,
    status: 'DISPONIBLE',
    location: '',
    equipment_summary: ''
  });

  const loadSpaces = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (typeFilter) params.type = typeFilter;
      if (statusFilter) params.status = statusFilter;
      const data = await api.getSpaces(params);
      setSpaces(data);
    } catch (err) {
      onShowToast({ type: 'error', title: 'Error al cargar espacios', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSpaces();
  }, [typeFilter, statusFilter]);

  useEffect(() => {
    if (preselectedSpaceId && spaces.length > 0) {
      const sp = spaces.find((s) => s.id === preselectedSpaceId);
      if (sp) {
        handleOpenReserveModal(sp);
        if (onClearPreselected) onClearPreselected();
      }
    }
  }, [preselectedSpaceId, spaces]);

  const handleOpenReserveModal = (space) => {
    setSelectedSpace(space);
    setReservationForm({
      space_id: space.id,
      title: '',
      responsible_name: '',
      responsible_email: '',
      date: new Date().toISOString().substring(0, 10),
      start_time: '08:00',
      end_time: '12:00',
      attendees_count: Math.min(space.capacity, 25),
      purpose: ''
    });
    setIsReserveModalOpen(true);
  };

  const handleCreateReservation = async (e) => {
    e.preventDefault();
    try {
      await api.createReservation(reservationForm.space_id, reservationForm);
      onShowToast({
        type: 'success',
        title: 'Reserva Confirmada',
        message: `Espacio '${selectedSpace?.name}' reservado exitosamente para el ${reservationForm.date} (${reservationForm.start_time} - ${reservationForm.end_time}).`
      });
      setIsReserveModalOpen(false);
      loadSpaces();
    } catch (err) {
      onShowToast({
        type: 'error',
        title: 'Regla de Negocio Bloqueada',
        message: err.message,
        code: err.code
      });
    }
  };

  const handleOpenNewSpaceModal = () => {
    setSpaceForm({
      id: `SP-0${spaces.length + 1}`,
      name: '',
      type: 'AULA',
      capacity: 35,
      status: 'DISPONIBLE',
      location: 'Piso 1 - Edificio Central',
      equipment_summary: ''
    });
    setSelectedSpace(null);
    setIsSpaceModalOpen(true);
  };

  const handleOpenEditSpaceModal = (space) => {
    setSelectedSpace(space);
    setSpaceForm({ ...space });
    setIsSpaceModalOpen(true);
  };

  const handleSaveSpace = async (e) => {
    e.preventDefault();
    try {
      if (selectedSpace) {
        await api.updateSpace(selectedSpace.id, spaceForm);
        onShowToast({ type: 'success', title: 'Espacio Actualizado', message: `El espacio '${spaceForm.name}' fue modificado.` });
      } else {
        await api.createSpace(spaceForm);
        onShowToast({ type: 'success', title: 'Espacio Registrado', message: `Nuevo espacio '${spaceForm.name}' creado.` });
      }
      setIsSpaceModalOpen(false);
      loadSpaces();
    } catch (err) {
      onShowToast({ type: 'error', title: 'Error al guardar espacio', message: err.message });
    }
  };

  const handleViewSpaceDetails = async (space) => {
    try {
      const full = await api.getSpace(space.id);
      setSelectedSpace(full);
      setIsDetailsModalOpen(true);
    } catch (err) {
      onShowToast({ type: 'error', title: 'Error al consultar espacio', message: err.message });
    }
  };

  const handleCancelReservation = async (reservationId) => {
    if (!window.confirm('¿Confirma que desea cancelar esta reserva?')) return;
    try {
      await api.cancelReservation(reservationId, 'Cancelado por el operador');
      onShowToast({ type: 'info', title: 'Reserva Cancelada', message: `La reserva '${reservationId}' fue cancelada.` });
      if (selectedSpace) {
        handleViewSpaceDetails(selectedSpace);
      }
      loadSpaces();
    } catch (err) {
      onShowToast({ type: 'error', title: 'Error al cancelar reserva', message: err.message });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Gestión de Espacios y Aulas</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Supervisión de aforos, disponibilidad operativa y reservas sin cruces de horarios
          </p>
        </div>

        <button onClick={handleOpenNewSpaceModal} className="btn btn-primary btn-sm">
          <Plus size={16} /> Registrar Espacio
        </button>
      </div>

      {/* Filter and Search Controls */}
      <div className="card" style={{ padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ width: '100%', paddingLeft: '2.25rem' }}
            placeholder="Buscar por nombre, ubicación o equipamiento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadSpaces()}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <select
            className="form-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">Todos los Tipos</option>
            <option value="AULA">Aulas</option>
            <option value="CUBICULO">Cubículos</option>
            <option value="LABORATORIO">Laboratorios</option>
            <option value="ESPACIO_COMUN">Espacios Comunes</option>
          </select>

          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Todos los Estados</option>
            <option value="DISPONIBLE">Disponibles</option>
            <option value="EN_MANTENIMIENTO">En Mantenimiento</option>
            <option value="INHABILITADO">Inhabilitados</option>
          </select>

          {(search || typeFilter || statusFilter) && (
            <button
              onClick={() => { setSearch(''); setTypeFilter(''); setStatusFilter(''); }}
              className="btn btn-secondary btn-sm"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Spaces Table / Cards Grid */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Cargando espacios de Campuslands...
        </div>
      ) : spaces.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <Building2 size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
          <h4 style={{ fontWeight: 700 }}>No se encontraron espacios</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Ajusta los filtros o crea un nuevo espacio.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table-modern">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre del Espacio</th>
                <th>Tipo</th>
                <th>Aforo Máx.</th>
                <th>Estado</th>
                <th>Ubicación</th>
                <th>Equipamiento</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {spaces.map((sp) => {
                const isOperable = sp.status === 'DISPONIBLE';
                return (
                  <tr key={sp.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                      {sp.id}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{sp.name}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {sp.type}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}>
                        <Users size={15} style={{ color: 'var(--cyan)' }} />
                        <span>{sp.capacity} personas</span>
                      </div>
                    </td>
                    <td>
                      <Badge type={sp.status} />
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                      {sp.location || 'Campus Principal'}
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {sp.equipment_summary || 'Equipamiento estándar'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <button
                          onClick={() => handleViewSpaceDetails(sp)}
                          className="btn btn-secondary btn-sm"
                          title="Ver agenda y reservas"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => handleOpenEditSpaceModal(sp)}
                          className="btn btn-secondary btn-sm"
                          title="Editar aforo o estado"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleOpenReserveModal(sp)}
                          disabled={!isOperable}
                          className={`btn btn-sm ${isOperable ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ opacity: isOperable ? 1 : 0.5, cursor: isOperable ? 'pointer' : 'not-allowed' }}
                          title={isOperable ? 'Crear reserva' : `Bloqueado por estado '${sp.status}'`}
                        >
                          <Calendar size={14} /> Reservar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL 1: Crear Reserva con validación en vivo de aforo y estado */}
      <Modal
        isOpen={isReserveModalOpen}
        onClose={() => setIsReserveModalOpen(false)}
        title={`Reservar Espacio: ${selectedSpace?.name || ''}`}
        maxWidth="550px"
      >
        <form onSubmit={handleCreateReservation}>
          <div className="modal-body">
            {/* Space Operational Banner */}
            {selectedSpace?.status !== 'DISPONIBLE' && (
              <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--rose-bg)', border: '1px solid var(--rose-border)', color: '#fb7185', fontSize: '0.8125rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <AlertCircle size={18} />
                <span>
                  <strong>Regla 3:</strong> Este espacio está en estado <code>{selectedSpace?.status}</code>. La reserva será rechazada por el backend.
                </span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Capacidad Máxima</span>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{selectedSpace?.capacity} Asistentes</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Estado Actual</span>
                <div><Badge type={selectedSpace?.status} /></div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Título o Actividad *</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="Ej. Clase Magistral Node.js Grupo M2"
                value={reservationForm.title}
                onChange={(e) => setReservationForm({ ...reservationForm, title: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Responsable *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="Trainer / Líder de Grupo"
                  value={reservationForm.responsible_name}
                  onChange={(e) => setReservationForm({ ...reservationForm, responsible_name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Responsable</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="trainer@campuslands.com"
                  value={reservationForm.responsible_email}
                  onChange={(e) => setReservationForm({ ...reservationForm, responsible_email: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Fecha *</label>
                <input
                  type="date"
                  required
                  className="form-input"
                  value={reservationForm.date}
                  onChange={(e) => setReservationForm({ ...reservationForm, date: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Hora Inicio *</label>
                <input
                  type="time"
                  required
                  className="form-input"
                  value={reservationForm.start_time}
                  onChange={(e) => setReservationForm({ ...reservationForm, start_time: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Hora Fin *</label>
                <input
                  type="time"
                  required
                  className="form-input"
                  value={reservationForm.end_time}
                  onChange={(e) => setReservationForm({ ...reservationForm, end_time: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Número de Asistentes * (Aforo máximo del aula: {selectedSpace?.capacity})
              </label>
              <input
                type="number"
                required
                min="1"
                className="form-input"
                value={reservationForm.attendees_count}
                onChange={(e) => setReservationForm({ ...reservationForm, attendees_count: parseInt(e.target.value, 10) || 0 })}
              />
              {selectedSpace && reservationForm.attendees_count > selectedSpace.capacity && (
                <div style={{ marginTop: '0.35rem', color: '#fb7185', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <AlertCircle size={14} />
                  <span><strong>Alerta Regla 1:</strong> Asistentes ({reservationForm.attendees_count}) superan el aforo ({selectedSpace.capacity}). El backend bloqueará la solicitud.</span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Propósito / Observaciones</label>
              <textarea
                className="form-textarea"
                rows="2"
                placeholder="Objetivo académico o evento..."
                value={reservationForm.purpose}
                onChange={(e) => setReservationForm({ ...reservationForm, purpose: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={() => setIsReserveModalOpen(false)} className="btn btn-secondary btn-sm">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              Confirmar Reserva
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Crear / Editar Espacio */}
      <Modal
        isOpen={isSpaceModalOpen}
        onClose={() => setIsSpaceModalOpen(false)}
        title={selectedSpace ? `Editar Espacio: ${selectedSpace.name}` : 'Registrar Nuevo Espacio'}
        maxWidth="500px"
      >
        <form onSubmit={handleSaveSpace}>
          <div className="modal-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Código ID *</label>
                <input
                  type="text"
                  required
                  disabled={Boolean(selectedSpace)}
                  className="form-input"
                  value={spaceForm.id}
                  onChange={(e) => setSpaceForm({ ...spaceForm, id: e.target.value.toUpperCase() })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nombre del Espacio *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="Ej. Aula Artemis"
                  value={spaceForm.name}
                  onChange={(e) => setSpaceForm({ ...spaceForm, name: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Tipo de Espacio *</label>
                <select
                  className="form-select"
                  value={spaceForm.type}
                  onChange={(e) => setSpaceForm({ ...spaceForm, type: e.target.value })}
                >
                  <option value="AULA">Aula de Clase</option>
                  <option value="CUBICULO">Cubículo de Trabajo</option>
                  <option value="LABORATORIO">Laboratorio</option>
                  <option value="ESPACIO_COMUN">Espacio Común</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Aforo Máximo *</label>
                <input
                  type="number"
                  required
                  min="1"
                  className="form-input"
                  value={spaceForm.capacity}
                  onChange={(e) => setSpaceForm({ ...spaceForm, capacity: parseInt(e.target.value, 10) || 1 })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Estado Operativo *</label>
              <select
                className="form-select"
                value={spaceForm.status}
                onChange={(e) => setSpaceForm({ ...spaceForm, status: e.target.value })}
              >
                <option value="DISPONIBLE">DISPONIBLE (Operativo)</option>
                <option value="EN_MANTENIMIENTO">EN_MANTENIMIENTO (Bloquea Reservas)</option>
                <option value="INHABILITADO">INHABILITADO (Bloquea Reservas)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Ubicación en Campus</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej. Piso 2 - Ala Norte"
                value={spaceForm.location}
                onChange={(e) => setSpaceForm({ ...spaceForm, location: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Resumen de Equipamiento</label>
              <textarea
                className="form-textarea"
                rows="2"
                placeholder="PCs, pantallas interactivas, AC, etc."
                value={spaceForm.equipment_summary}
                onChange={(e) => setSpaceForm({ ...spaceForm, equipment_summary: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={() => setIsSpaceModalOpen(false)} className="btn btn-secondary btn-sm">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              {selectedSpace ? 'Guardar Cambios' : 'Crear Espacio'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: Detalles y Agenda de Reservas del Espacio */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title={`Detalles & Reservas: ${selectedSpace?.name || ''}`}
        maxWidth="650px"
      >
        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', padding: '1rem', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tipo & Código</div>
              <div style={{ fontWeight: 700 }}>{selectedSpace?.type} ({selectedSpace?.id})</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Aforo</div>
              <div style={{ fontWeight: 700, color: 'var(--cyan)' }}>{selectedSpace?.capacity} personas</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Estado</div>
              <div><Badge type={selectedSpace?.status} /></div>
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Agenda de Reservas Programadas</h4>
            {(!selectedSpace?.reservations || selectedSpace.reservations.length === 0) ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
                No hay reservas registradas para este espacio.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {selectedSpace.reservations.map((res) => (
                  <div key={res.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{res.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Fecha: <strong>{res.date}</strong> | Horario: <strong>{res.start_time} - {res.end_time}</strong> ({res.attendees_count} asistentes)
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Responsable: {res.responsible_name}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Badge type={res.status} />
                      {res.status === 'CONFIRMADA' && (
                        <button
                          onClick={() => handleCancelReservation(res.id)}
                          className="btn btn-danger btn-sm"
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" onClick={() => setIsDetailsModalOpen(false)} className="btn btn-secondary btn-sm">
            Cerrar
          </button>
        </div>
      </Modal>
    </div>
  );
}
