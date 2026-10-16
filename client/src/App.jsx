import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Toast from './components/Toast';
import ApiKeyModal from './components/ApiKeyModal';

import DashboardView from './pages/DashboardView';
import SpacesView from './pages/SpacesView';
import AssetsView from './pages/AssetsView';
import IncidentsView from './pages/IncidentsView';
import RulesTesterView from './pages/RulesTesterView';
import DataManagerView from './pages/DataManagerView';
import AuditView from './pages/AuditView';

import api from './services/api';

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [aiStatus, setAiStatus] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('campuslands_theme') || 'dark');
  const [runtimeApiKey, setRuntimeApiKey] = useState(localStorage.getItem('campuslands_ai_key') || '');

  // Shortcuts
  const [preselectedSpaceId, setPreselectedSpaceId] = useState(null);
  const [preselectedAssetId, setPreselectedAssetId] = useState(null);

  // Sync theme attribute to <html> tag
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('campuslands_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const showToast = ({ type = 'info', title = '', message = '', code = null }) => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    setToasts((prev) => [...prev, { id, type, title, message, code }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  };

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const loadInitialData = async () => {
    try {
      const [statsData, aiData] = await Promise.all([
        api.getStats().catch(() => null),
        api.getAiStatus().catch(() => null)
      ]);
      if (statsData) setStats(statsData);
      if (aiData) setAiStatus(aiData);
    } catch (err) {
      console.error('Error cargando datos iniciales:', err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleSaveRuntimeKey = (key) => {
    setRuntimeApiKey(key);
    localStorage.setItem('campuslands_ai_key', key);
    if (key.trim()) {
      setAiStatus((prev) => ({
        ...prev,
        isAvailable: true,
        provider: key.startsWith('AIza') ? 'Google Gemini (En Vivo)' : 'OpenAI (En Vivo)',
        model: key.startsWith('AIza') ? 'gemini-1.5-flash' : 'gpt-4o-mini'
      }));
      showToast({
        type: 'success',
        title: 'Clave API Configurada',
        message: 'El modelo de IA ahora responderá en vivo a todas las solicitudes de triaje.'
      });
    }
  };

  return (
    <div className="app-container">
      {/* Fixed Sidebar */}
      <Sidebar
        currentView={currentView}
        onNavigate={setCurrentView}
        stats={stats}
      />

      {/* Main Dynamic View Area */}
      <div className="main-content">
        <Topbar
          currentView={currentView}
          aiStatus={aiStatus}
          onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
          onOpenRulesTester={() => setCurrentView('rules')}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        <main className="page-body">
          {currentView === 'dashboard' && (
            <DashboardView
              stats={stats}
              onNavigate={setCurrentView}
              onOpenNewReservation={() => {
                setPreselectedSpaceId('SP-001');
                setCurrentView('spaces');
              }}
              onOpenNewLoan={() => {
                setPreselectedAssetId('EQ-101');
                setCurrentView('assets');
              }}
              onOpenNewIncident={() => {
                setCurrentView('incidents');
              }}
            />
          )}

          {currentView === 'spaces' && (
            <SpacesView
              onShowToast={showToast}
              preselectedSpaceId={preselectedSpaceId}
              onClearPreselected={() => setPreselectedSpaceId(null)}
            />
          )}

          {currentView === 'assets' && (
            <AssetsView
              onShowToast={showToast}
              preselectedAssetId={preselectedAssetId}
              onClearPreselected={() => setPreselectedAssetId(null)}
            />
          )}

          {currentView === 'incidents' && (
            <IncidentsView
              onShowToast={showToast}
              runtimeApiKey={runtimeApiKey}
              onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
            />
          )}

          {currentView === 'rules' && (
            <RulesTesterView
              onShowToast={showToast}
            />
          )}

          {currentView === 'data' && (
            <DataManagerView
              stats={stats}
              onRefreshStats={loadInitialData}
              onShowToast={showToast}
            />
          )}

          {currentView === 'audit' && (
            <AuditView
              onShowToast={showToast}
            />
          )}
        </main>
      </div>

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        aiStatus={aiStatus}
        currentRuntimeKey={runtimeApiKey}
        onSaveKey={handleSaveRuntimeKey}
      />

      {/* Notifications Toast */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
