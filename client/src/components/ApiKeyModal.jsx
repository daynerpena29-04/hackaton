import React, { useState } from 'react';
import Modal from './Modal';
import { Cpu, Check, AlertCircle, Sparkles, Key } from 'lucide-react';

export default function ApiKeyModal({ isOpen, onClose, aiStatus, onSaveKey, currentRuntimeKey }) {
  const [apiKey, setApiKey] = useState(currentRuntimeKey || '');
  const [testResult, setTestResult] = useState(null);
  const [isTesting, setIsTesting] = useState(false);

  const handleSave = () => {
    onSaveKey(apiKey);
    onClose();
  };

  const handleTestKey = async () => {
    if (!apiKey.trim()) {
      setTestResult({ success: false, message: 'Ingrese una clave antes de realizar la prueba.' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Prueba de Conexión en Vivo',
          description: 'Validación de conexión del modelo de Inteligencia Artificial para Campuslands.',
          apiKey: apiKey.trim()
        })
      });
      const data = await res.json();
      if (data.success && data.recommendation) {
        setTestResult({
          success: true,
          message: `Conexión exitosa con ${data.provider} (${data.model}). Modelo operativo!`
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'No se pudo conectar con el proveedor.'
        });
      }
    } catch (err) {
      setTestResult({ success: false, message: `Error de red: ${err.message}` });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configuración de Inteligencia Artificial">
      <div className="modal-body">
        {/* Status Alert */}
        <div style={{
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          background: aiStatus?.isAvailable ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
          border: '1px solid',
          borderColor: aiStatus?.isAvailable ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)',
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'flex-start'
        }}>
          <Cpu size={20} style={{ color: aiStatus?.isAvailable ? 'var(--emerald)' : 'var(--amber)', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.8125rem' }}>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
              Estado Actual: {aiStatus?.provider || 'Modo Manual'}
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>
              {aiStatus?.isAvailable
                ? `El sistema está conectado al modelo ${aiStatus?.model}. Las solicitudes serán analizadas en tiempo real.`
                : 'No se detectó API Key en .env. Puede ingresar una clave temporal para la sustentación o utilizar el procedimiento de triaje manual transparente.'}
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Key size={14} /> Clave API de Gemini o OpenAI (opcional para ejecución en vivo)
          </label>
          <input
            type="password"
            className="form-input"
            placeholder="AIzaSy... o sk-proj-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            También puede configurarla de forma permanente en el archivo <code>server/.env</code> como <code>GEMINI_API_KEY</code>.
          </span>
        </div>

        {/* Test Result Message */}
        {testResult && (
          <div style={{
            padding: '0.75rem',
            borderRadius: 'var(--radius-md)',
            background: testResult.success ? 'var(--emerald-bg)' : 'var(--rose-bg)',
            border: `1px solid ${testResult.success ? 'var(--emerald-border)' : 'var(--rose-border)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.8125rem',
            color: testResult.success ? '#34d399' : '#fb7185'
          }}>
            {testResult.success ? <Check size={16} /> : <AlertCircle size={16} />}
            <span>{testResult.message}</span>
          </div>
        )}
      </div>

      <div className="modal-footer">
        <button
          type="button"
          onClick={handleTestKey}
          disabled={isTesting || !apiKey.trim()}
          className="btn btn-secondary btn-sm"
        >
          <Sparkles size={14} />
          {isTesting ? 'Probando API...' : 'Probar Clave'}
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="btn btn-primary btn-sm"
        >
          Guardar y Activar
        </button>
      </div>
    </Modal>
  );
}
