const BASE_URL = '/api';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body);
  }

  if (options.body instanceof FormData) {
    delete config.headers['Content-Type']; // Let browser set boundary
  }

  const response = await fetch(url, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || `Error HTTP ${response.status}`);
    error.status = response.status;
    error.code = data.code || 'UNKNOWN_ERROR';
    error.conflictingReservation = data.conflictingReservation;
    error.details = data.details;
    throw error;
  }

  return data;
}

export const api = {
  // Stats
  getStats: () => request('/stats'),

  // Espacios & Reservas
  getSpaces: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/spaces${q ? '?' + q : ''}`);
  },
  getSpace: (id) => request(`/spaces/${id}`),
  createSpace: (data) => request('/spaces', { method: 'POST', body: data }),
  updateSpace: (id, data) => request(`/spaces/${id}`, { method: 'PUT', body: data }),
  getReservations: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/reservations${q ? '?' + q : ''}`);
  },
  createReservation: (spaceId, data) => request(`/spaces/${spaceId}/reservations`, { method: 'POST', body: data }),
  cancelReservation: (id, reason) => request(`/reservations/${id}/cancel`, { method: 'PUT', body: { reason } }),

  // Recursos Tecnológicos & Préstamos
  getAssets: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/assets${q ? '?' + q : ''}`);
  },
  getAsset: (id) => request(`/assets/${id}`),
  createAsset: (data) => request('/assets', { method: 'POST', body: data }),
  updateAsset: (id, data) => request(`/assets/${id}`, { method: 'PUT', body: data }),
  getLoans: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/loans${q ? '?' + q : ''}`);
  },
  loanAsset: (assetId, data) => request(`/assets/${assetId}/loan`, { method: 'POST', body: data }),
  returnAsset: (loanId, data) => request(`/loans/${loanId}/return`, { method: 'POST', body: data }),

  // Incidencias & IA
  getIncidents: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/incidents${q ? '?' + q : ''}`);
  },
  getIncident: (id) => request(`/incidents/${id}`),
  createIncident: (data) => request('/incidents', { method: 'POST', body: data }),
  updateIncident: (id, data) => request(`/incidents/${id}`, { method: 'PUT', body: data }),
  runAiTriage: (incidentId, apiKey = null) => request(`/incidents/${incidentId}/ai-triage`, { method: 'POST', body: { apiKey } }),
  applyAiTriage: (incidentId, recommendation) => request(`/incidents/${incidentId}/apply-ai`, { method: 'POST', body: { recommendation } }),

  // IA Config & Freeform
  getAiStatus: () => request('/ai/status'),
  analyzeWithAi: (data, apiKey = null) => request('/ai/analyze', { method: 'POST', body: { ...data, apiKey } }),

  // Centro de Datos Oficiales
  importJson: (payload, entity = 'auto', strategy = 'UPDATE') => 
    request(`/data/import/json?entity=${entity}&strategy=${strategy}`, { method: 'POST', body: payload }),
  importCsv: (formData) => 
    request('/data/import/csv', { method: 'POST', body: formData }),
  restoreOfficialData: () => 
    request('/data/restore-official', { method: 'POST' }),

  // Auditoría
  getAuditLogs: (limit = 100) => request(`/audit?limit=${limit}`),

  // Probador de Reglas en Vivo
  testRulesLive: (ruleNumber = null) => request('/rules/test-live', { method: 'POST', body: { ruleNumber } })
};

export default api;
