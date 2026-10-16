import React, { useState, useEffect } from 'react';
import {
  Laptop,
  Plus,
  Search,
  ArrowRightLeft,
  RotateCcw,
  AlertCircle,
  Eye,
  Edit,
  UserCheck,
  CheckCircle2
} from 'lucide-react';
import api from '../services/api';
import Badge from '../components/Badge';
import Modal from '../components/Modal';

export default function AssetsView({ onShowToast, preselectedAssetId, onClearPreselected }) {
  const [assets, setAssets] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('assets'); // 'assets' | 'loans'

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [selectedLoan, setSelectedLoan] = useState(null);

  // Forms
  const [loanForm, setLoanForm] = useState({
    borrower_name: '',
    borrower_role: 'CAMPER',
    borrower_id_card: '',
    expected_return_date: new Date(Date.now() + 86400000 * 2).toISOString().substring(0, 10),
    notes: '',
    initial_condition: 'Equipo entregado en óptimas condiciones'
  });

  const [returnForm, setReturnForm] = useState({
    return_condition: 'Operativo y sin novedades',
    notes: '',
    new_asset_status: 'DISPONIBLE'
  });

  const [assetForm, setAssetForm] = useState({
    id: '',
    name: '',
    category: 'LAPTOP',
    serial_number: '',
    status: 'DISPONIBLE',
    condition_notes: '',
    assigned_location: 'Bodega TI Central'
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (categoryFilter) params.category = categoryFilter;
      if (statusFilter) params.status = statusFilter;

      const [assetsData, loansData] = await Promise.all([
        api.getAssets(params),
        api.getLoans()
      ]);
      setAssets(assetsData);
      setLoans(loansData);
    } catch (err) {
      onShowToast({ type: 'error', title: 'Error al cargar recursos', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [categoryFilter, statusFilter]);

  useEffect(() => {
    if (preselectedAssetId && assets.length > 0) {
      const asset = assets.find((a) => a.id === preselectedAssetId);
      if (asset) {
        handleOpenLoanModal(asset);
        if (onClearPreselected) onClearPreselected();
      }
    }
  }, [preselectedAssetId, assets]);

  const handleOpenLoanModal = (asset) => {
    setSelectedAsset(asset);
    setLoanForm({
      borrower_name: '',
      borrower_role: 'CAMPER',
      borrower_id_card: '',
      expected_return_date: new Date(Date.now() + 86400000 * 2).toISOString().substring(0, 10),
      notes: '',
      initial_condition: asset.condition_notes || 'Equipo entregado en óptimas condiciones'
    });
    setIsLoanModalOpen(true);
  };

  const handleConfirmLoan = async (e) => {
    e.preventDefault();
    try {
      await api.loanAsset(selectedAsset.id, loanForm);
      onShowToast({
        type: 'success',
        title: 'Préstamo Registrado con Éxito',
        message: `Equipo '${selectedAsset.name}' asignado a ${loanForm.borrower_name} (${loanForm.borrower_role}).`
      });
      setIsLoanModalOpen(false);
      loadData();
    } catch (err) {
      onShowToast({
        type: 'error',
        title: 'Bloqueo Regla 4 (Disponibilidad)',
        message: err.message,
        code: err.code
      });
    }
  };

  const handleOpenReturnModal = (loan) => {
    setSelectedLoan(loan);
    setReturnForm({
      return_condition: 'Equipo recibido en óptimas condiciones',
      notes: '',
      new_asset_status: 'DISPONIBLE'
    });
    setIsReturnModalOpen(true);
  };

  const handleConfirmReturn = async (e) => {
    e.preventDefault();
    try {
      await api.returnAsset(selectedLoan.id, returnForm);
      onShowToast({
        type: 'success',
        title: 'Devolución Registrada (Regla 5 OK)',
        message: `Préstamo de '${selectedLoan.asset_name}' cerrado. Estado actual: ${returnForm.new_asset_status}.`
      });
      setIsReturnModalOpen(false);
      loadData();
    } catch (err) {
      onShowToast({
        type: 'error',
        title: 'Error de Integridad Operativa',
        message: err.message,
        code: err.code
      });
    }
  };

  const handleOpenNewAssetModal = () => {
    setAssetForm({
      id: `EQ-${Date.now().toString().slice(-4)}`,
      name: '',
      category: 'LAPTOP',
      serial_number: '',
      status: 'DISPONIBLE',
      condition_notes: 'Equipo nuevo',
      assigned_location: 'Bodega TI Central'
    });
    setSelectedAsset(null);
    setIsAssetModalOpen(true);
  };

  const handleOpenEditAssetModal = (asset) => {
    setSelectedAsset(asset);
    setAssetForm({ ...asset });
    setIsAssetModalOpen(true);
  };

  const handleSaveAsset = async (e) => {
    e.preventDefault();
    try {
      if (selectedAsset) {
        await api.updateAsset(selectedAsset.id, assetForm);
        onShowToast({ type: 'success', title: 'Equipo Actualizado', message: `Recurso '${assetForm.name}' modificado.` });
      } else {
        await api.createAsset(assetForm);
        onShowToast({ type: 'success', title: 'Equipo Creado', message: `Nuevo equipo '${assetForm.name}' agregado al inventario.` });
      }
      setIsAssetModalOpen(false);
      loadData();
    } catch (err) {
      onShowToast({ type: 'error', title: 'Error al guardar equipo', message: err.message });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Recursos Tecnológicos & Préstamos</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Inventario TI de Campuslands, control de asignaciones, devoluciones y trazabilidad
          </p>
        </div>

        <button onClick={handleOpenNewAssetModal} className="btn btn-primary btn-sm">
          <Plus size={16} /> Registrar Equipo
        </button>
      </div>

      {/* View Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('assets')}
          className={`btn btn-sm ${activeTab === 'assets' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Laptop size={15} /> Inventario de Equipos ({assets.length})
        </button>
        <button
          onClick={() => setActiveTab('loans')}
          className={`btn btn-sm ${activeTab === 'loans' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <ArrowRightLeft size={15} /> Registro de Préstamos ({loans.length})
        </button>
      </div>

      {/* TAB 1: INVENTARIO DE EQUIPOS */}
      {activeTab === 'assets' && (
        <>
          {/* Search and Filters */}
          <div className="card" style={{ padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                style={{ width: '100%', paddingLeft: '2.25rem' }}
                placeholder="Buscar por equipo, serial o ubicación..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadData()}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <select
                className="form-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">Todas las Categorías</option>
                <option value="LAPTOP">Laptops</option>
                <option value="MONITOR">Monitores</option>
                <option value="PROYECTOR">Proyectores</option>
                <option value="AUDIO">Audio</option>
                <option value="RED">Redes</option>
                <option value="PERIFERICO">Periféricos</option>
              </select>

              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Todos los Estados</option>
                <option value="DISPONIBLE">Disponibles</option>
                <option value="PRESTADO">Prestados</option>
                <option value="DANADO">Dañados</option>
                <option value="EN_MANTENIMIENTO">En Mantenimiento</option>
                <option value="INHABILITADO">Inhabilitados</option>
              </select>

              {(search || categoryFilter || statusFilter) && (
                <button
                  onClick={() => { setSearch(''); setCategoryFilter(''); setStatusFilter(''); }}
                  className="btn btn-secondary btn-sm"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Cargando catálogo de equipos...
            </div>
          ) : assets.length === 0 ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
              <Laptop size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
              <h4 style={{ fontWeight: 700 }}>No se encontraron equipos</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Ajusta los filtros o registra nuevos recursos.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>Código ID</th>
                    <th>Nombre del Equipo</th>
                    <th>Categoría</th>
                    <th>Número de Serie</th>
                    <th>Estado</th>
                    <th>Ubicación</th>
                    <th>Observaciones</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((asset) => {
                    const isAvailable = asset.status === 'DISPONIBLE';
                    return (
                      <tr key={asset.id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                          {asset.id}
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{asset.name}</div>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                            {asset.category}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                          {asset.serial_number || 'N/A'}
                        </td>
                        <td>
                          <Badge type={asset.status} />
                        </td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                          {asset.assigned_location || 'Bodega Central'}
                        </td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {asset.condition_notes || 'Sin notas'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                            <button
                              onClick={() => handleOpenEditAssetModal(asset)}
                              className="btn btn-secondary btn-sm"
                              title="Editar detalles o estado del equipo"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleOpenLoanModal(asset)}
                              disabled={!isAvailable}
                              className={`btn btn-sm ${isAvailable ? 'btn-primary' : 'btn-secondary'}`}
                              style={{ opacity: isAvailable ? 1 : 0.45, cursor: isAvailable ? 'pointer' : 'not-allowed' }}
                              title={isAvailable ? 'Prestar a Camper / Trainer' : `Regla 4: Bloqueado por estado '${asset.status}'`}
                            >
                              <ArrowRightLeft size={14} /> Prestar
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
        </>
      )}

      {/* TAB 2: HISTORIAL DE PRÉSTAMOS */}
      {activeTab === 'loans' && (
        <div className="table-container">
          <table className="table-modern">
            <thead>
              <tr>
                <th>ID Préstamo</th>
                <th>Equipo</th>
                <th>Beneficiario</th>
                <th>Rol</th>
                <th>Documento</th>
                <th>Fecha Salida</th>
                <th>Retorno Estimado</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => (
                <tr key={loan.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                    {loan.id}
                  </td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{loan.asset_name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{loan.asset_id}</div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{loan.borrower_name}</td>
                  <td><Badge type={loan.borrower_role} /></td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{loan.borrower_id_card}</td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{loan.loan_date}</td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{loan.expected_return_date}</td>
                  <td><Badge type={loan.status} /></td>
                  <td style={{ textAlign: 'right' }}>
                    {loan.status === 'ACTIVO' ? (
                      <button
                        onClick={() => handleOpenReturnModal(loan)}
                        className="btn btn-secondary btn-sm"
                        style={{ border: '1px solid var(--emerald)', color: 'var(--emerald)' }}
                      >
                        <RotateCcw size={14} /> Recibir Devolución
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Devuelto el {loan.return_date?.substring(0, 10)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: Prestar Equipo (Validación Regla 4) */}
      <Modal
        isOpen={isLoanModalOpen}
        onClose={() => setIsLoanModalOpen(false)}
        title={`Registrar Préstamo: ${selectedAsset?.name || ''}`}
        maxWidth="520px"
      >
        <form onSubmit={handleConfirmLoan}>
          <div className="modal-body">
            {/* Rule 4 Warning if asset is damaged/maintenance/loaned */}
            {selectedAsset?.status !== 'DISPONIBLE' && (
              <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--rose-bg)', border: '1px solid var(--rose-border)', color: '#fb7185', fontSize: '0.8125rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <AlertCircle size={18} />
                <span>
                  <strong>Regla 4:</strong> Este equipo está en estado <code>{selectedAsset?.status}</code>. No puede prestarse.
                </span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID & Serie</span>
                <div style={{ fontWeight: 700 }}>{selectedAsset?.id} ({selectedAsset?.serial_number || 'S/N'})</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Disponibilidad</span>
                <div><Badge type={selectedAsset?.status} /></div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Nombre del Solicitante *</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="Nombre completo"
                value={loanForm.borrower_name}
                onChange={(e) => setLoanForm({ ...loanForm, borrower_name: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Rol en Campuslands *</label>
                <select
                  className="form-select"
                  value={loanForm.borrower_role}
                  onChange={(e) => setLoanForm({ ...loanForm, borrower_role: e.target.value })}
                >
                  <option value="CAMPER">Camper (Estudiante)</option>
                  <option value="TRAINER">Trainer (Docente)</option>
                  <option value="STAFF">Staff / Operaciones</option>
                  <option value="VISITANTE">Visitante</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Documento de Identidad *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="C.C. o T.I."
                  value={loanForm.borrower_id_card}
                  onChange={(e) => setLoanForm({ ...loanForm, borrower_id_card: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Fecha Estimada de Devolución *</label>
              <input
                type="date"
                required
                className="form-input"
                value={loanForm.expected_return_date}
                onChange={(e) => setLoanForm({ ...loanForm, expected_return_date: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Condición Inicial del Equipo</label>
              <input
                type="text"
                className="form-input"
                value={loanForm.initial_condition}
                onChange={(e) => setLoanForm({ ...loanForm, initial_condition: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Motivo o Notas del Préstamo</label>
              <textarea
                className="form-textarea"
                rows="2"
                placeholder="Ej. Taller de desarrollo móvil hackatón..."
                value={loanForm.notes}
                onChange={(e) => setLoanForm({ ...loanForm, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={() => setIsLoanModalOpen(false)} className="btn btn-secondary btn-sm">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              Confirmar Préstamo
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Devolver Equipo (Validación Regla 5) */}
      <Modal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        title={`Registrar Devolución: ${selectedLoan?.asset_name || ''}`}
        maxWidth="500px"
      >
        <form onSubmit={handleConfirmReturn}>
          <div className="modal-body">
            <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem' }}>
              <div><strong>Beneficiario:</strong> {selectedLoan?.borrower_name} ({selectedLoan?.borrower_role})</div>
              <div><strong>Fecha de Préstamo:</strong> {selectedLoan?.loan_date}</div>
              <div><strong>Condición de Entrega:</strong> {selectedLoan?.initial_condition}</div>
            </div>

            <div className="form-group">
              <label className="form-label">Estado Físico en la Recepción *</label>
              <select
                className="form-select"
                value={returnForm.new_asset_status}
                onChange={(e) => {
                  const status = e.target.value;
                  setReturnForm({
                    ...returnForm,
                    new_asset_status: status,
                    return_condition: status === 'DISPONIBLE' ? 'Equipo recibido en óptimas condiciones' : (status === 'DANADO' ? 'Equipo recibido con daños físicos' : 'Equipo requiere revisión técnica')
                  });
                }}
              >
                <option value="DISPONIBLE">DISPONIBLE (Equipo operativo, reingresa a bodega)</option>
                <option value="DANADO">DAÑADO (Equipo sufrió avería o rotura)</option>
                <option value="EN_MANTENIMIENTO">EN_MANTENIMIENTO (Pasa a taller de revisión)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Informe de Condición de Retorno *</label>
              <input
                type="text"
                required
                className="form-input"
                value={returnForm.return_condition}
                onChange={(e) => setReturnForm({ ...returnForm, return_condition: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Observaciones Adicionales</label>
              <textarea
                className="form-textarea"
                rows="2"
                placeholder="Detalle sobre accesorios, cargador, etc."
                value={returnForm.notes}
                onChange={(e) => setReturnForm({ ...returnForm, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={() => setIsReturnModalOpen(false)} className="btn btn-secondary btn-sm">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              Confirmar Recepción
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Crear / Editar Equipo */}
      <Modal
        isOpen={isAssetModalOpen}
        onClose={() => setIsAssetModalOpen(false)}
        title={selectedAsset ? `Editar Equipo: ${selectedAsset.name}` : 'Registrar Nuevo Equipo'}
        maxWidth="500px"
      >
        <form onSubmit={handleSaveAsset}>
          <div className="modal-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Código ID *</label>
                <input
                  type="text"
                  required
                  disabled={Boolean(selectedAsset)}
                  className="form-input"
                  value={assetForm.id}
                  onChange={(e) => setAssetForm({ ...assetForm, id: e.target.value.toUpperCase() })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nombre del Equipo *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="Ej. MacBook Pro M2"
                  value={assetForm.name}
                  onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Categoría *</label>
                <select
                  className="form-select"
                  value={assetForm.category}
                  onChange={(e) => setAssetForm({ ...assetForm, category: e.target.value })}
                >
                  <option value="LAPTOP">Laptop</option>
                  <option value="MONITOR">Monitor</option>
                  <option value="PROYECTOR">Proyector</option>
                  <option value="AUDIO">Audio</option>
                  <option value="RED">Redes</option>
                  <option value="PERIFERICO">Periférico</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Número de Serie</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Serial de fábrica"
                  value={assetForm.serial_number}
                  onChange={(e) => setAssetForm({ ...assetForm, serial_number: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Estado Actual *</label>
                <select
                  className="form-select"
                  value={assetForm.status}
                  onChange={(e) => setAssetForm({ ...assetForm, status: e.target.value })}
                >
                  <option value="DISPONIBLE">DISPONIBLE</option>
                  <option value="PRESTADO">PRESTADO</option>
                  <option value="EN_MANTENIMIENTO">EN_MANTENIMIENTO</option>
                  <option value="DANADO">DANADO</option>
                  <option value="INHABILITADO">INHABILITADO</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Ubicación Asignada</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Bodega TI Central"
                  value={assetForm.assigned_location}
                  onChange={(e) => setAssetForm({ ...assetForm, assigned_location: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Observaciones / Condición</label>
              <textarea
                className="form-textarea"
                rows="2"
                placeholder="Accesorios, rayones o novedades..."
                value={assetForm.condition_notes}
                onChange={(e) => setAssetForm({ ...assetForm, condition_notes: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={() => setIsAssetModalOpen(false)} className="btn btn-secondary btn-sm">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              {selectedAsset ? 'Guardar Cambios' : 'Registrar Equipo'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
