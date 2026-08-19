import React, { useState, useEffect } from 'react';
import { 
  Expedicao, 
  LoteItem, 
  ActiveScreen, 
  AppSettings,
  Usuario 
} from './types';
import { 
  getAllExpeditions, 
  saveAllExpeditions, 
  saveOrUpdateExpedition, 
  deleteExpedition, 
  getActiveExpeditionId, 
  setActiveExpeditionId, 
  getSavedSettings, 
  saveSettings, 
  exportFullBackupJSON, 
  importFullBackupJSON, 
  resetToInitialDatabase 
} from './utils/storage';
import { getCurrentUser, logoutUser } from './utils/auth';
import { DEFAULT_INITIAL_EXPEDITION } from './data/initialLots';

// Components
import { LoginScreen } from './components/LoginScreen';
import { Header } from './components/Header';
import { HomeScreen } from './components/HomeScreen';
import { ExpeditionForm } from './components/ExpeditionForm';
import { QRCodeScreen } from './components/QRCodeScreen';
import { ConferenceScreen } from './components/ConferenceScreen';
import { SavedExpeditionsScreen } from './components/SavedExpeditionsScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { AccessManagementScreen } from './components/AccessManagementScreen';
import { LotManagementScreen } from './components/LotManagementScreen';
import { QRScannerModal } from './components/QRScannerModal';
import { BatchBarcodeScannerModal } from './components/BatchBarcodeScannerModal';
import { BatchImportModal } from './components/BatchImportModal';
import { PrintReportModal } from './components/PrintReportModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<Usuario | null>(getCurrentUser());
  const [currentScreen, setCurrentScreen] = useState<ActiveScreen>('home');
  const [expeditions, setExpeditions] = useState<Expedicao[]>([]);
  const [activeExpeditionId, setActiveExpId] = useState<string | null>(null);
  const [settings, setAppSettings] = useState<AppSettings>(getSavedSettings());
  const [isOnline, setIsOnline] = useState<boolean>(true);

  // Modals
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isBatchCameraOpen, setIsBatchCameraOpen] = useState(false);
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [printData, setPrintData] = useState<{ expedition: Expedicao; type: 'qr_manifest' | 'release_term' } | null>(null);

  // Load initial data
  useEffect(() => {
    const list = getAllExpeditions();
    setExpeditions(list);
    const activeId = getActiveExpeditionId() || (list.length > 0 ? list[0].id : null);
    setActiveExpId(activeId);

    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const activeExpedition = expeditions.find(e => e.id === activeExpeditionId) || (expeditions.length > 0 ? expeditions[0] : null);

  const activeOperatorName = currentUser?.nomeCompleto || currentUser?.username || settings.operadorPadrao;

  // Navigation handlers
  const handleNavigate = (screen: ActiveScreen) => {
    setCurrentScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = (user: Usuario) => {
    setCurrentUser(user);
    setCurrentScreen('home');
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
  };

  const handleSaveExpedition = (exp: Expedicao) => {
    saveOrUpdateExpedition(exp);
    const updatedList = getAllExpeditions();
    setExpeditions(updatedList);
    setActiveExpId(exp.id);
    setActiveExpeditionId(exp.id);
    setCurrentScreen('qr_code');
  };

  const handleUpdateExpedition = (exp: Expedicao) => {
    saveOrUpdateExpedition(exp);
    const updatedList = getAllExpeditions();
    setExpeditions(updatedList);
  };

  const handleDeleteExpedition = (id: string) => {
    deleteExpedition(id);
    const updatedList = getAllExpeditions();
    setExpeditions(updatedList);
    const newActiveId = getActiveExpeditionId();
    setActiveExpId(newActiveId);
  };

  // QR Code Scanned from camera: decode, save locally, show lotes, go to conference
  const handleExpeditionScanned = (scannedExp: Expedicao) => {
    saveOrUpdateExpedition(scannedExp);
    const updatedList = getAllExpeditions();
    setExpeditions(updatedList);
    setActiveExpId(scannedExp.id);
    setActiveExpeditionId(scannedExp.id);
    setCurrentScreen('conferencia');
  };

  // Bag barcode scanned during loading
  const handleLoteBarcodeDetected = (loteCode: string) => {
    if (!activeExpedition) return;
    const clean = loteCode.trim().toUpperCase();
    const matched = activeExpedition.lotes.find(l => l.lote.toUpperCase() === clean);

    if (matched) {
      const updatedLotes = activeExpedition.lotes.map(l => {
        if (l.lote.toUpperCase() === clean) {
          return {
            ...l,
            conferido: true,
            conferidoEm: new Date().toISOString(),
            conferidoPor: activeOperatorName,
          };
        }
        return l;
      });

      const updatedExp: Expedicao = {
        ...activeExpedition,
        status: 'em_conferencia',
        lotes: updatedLotes,
        atualizadoEm: new Date().toISOString(),
      };
      handleUpdateExpedition(updatedExp);
    }
  };

  // Import lots from Excel/CSV/Text
  const handleImportLotsComplete = (importedLots: LoteItem[], mode: 'replace' | 'append') => {
    if (currentScreen === 'nova_expedicao' || currentScreen === 'editar_expedicao') {
      // Handled inside form
    } else {
      // Update active expedition or create a new one
      if (activeExpedition && mode === 'append') {
        const updatedLotes = [...activeExpedition.lotes, ...importedLots];
        const updatedExp = { ...activeExpedition, lotes: updatedLotes, atualizadoEm: new Date().toISOString() };
        handleUpdateExpedition(updatedExp);
      } else if (activeExpedition && mode === 'replace') {
        const updatedExp = { ...activeExpedition, lotes: importedLots, atualizadoEm: new Date().toISOString() };
        handleUpdateExpedition(updatedExp);
      } else {
        const newExp: Expedicao = {
          id: `exp-${Date.now()}`,
          numero: `00${expeditions.length + 1}`,
          data: new Date().toISOString().split('T')[0],
          clienteDestino: 'Fazenda Importada',
          caminhao: 'A Definir',
          motorista: 'A Definir',
          responsavel: activeOperatorName,
          status: 'pendente',
          criadoEm: new Date().toISOString(),
          atualizadoEm: new Date().toISOString(),
          lotes: importedLots,
        };
        handleSaveExpedition(newExp);
      }
    }
  };

  const handleSaveSettings = (newSettings: AppSettings) => {
    saveSettings(newSettings);
    setAppSettings(newSettings);
  };

  const handleExportBackup = () => {
    const jsonStr = exportFullBackupJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_Conferencia_Expedicao_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (jsonStr: string) => {
    const res = importFullBackupJSON(jsonStr);
    if (res.success) {
      const list = getAllExpeditions();
      setExpeditions(list);
      setAppSettings(getSavedSettings());
    }
    return res;
  };

  const handleResetToDefaultLots = () => {
    resetToInitialDatabase();
    const list = getAllExpeditions();
    setExpeditions(list);
    setActiveExpId(DEFAULT_INITIAL_EXPEDITION.id);
  };

  // If user is not authenticated, show Login Screen immediately
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-white">
      {/* Header */}
      <Header
        currentScreen={currentScreen}
        onNavigate={handleNavigate}
        operatorName={activeOperatorName}
        activeExpeditionNumber={activeExpedition?.numero}
        isOnline={isOnline}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Screen Container */}
      <main className="flex-1 w-full max-w-4xl mx-auto">
        {currentScreen === 'home' && (
          <HomeScreen
            onNavigate={handleNavigate}
            activeExpedition={activeExpedition}
            totalSavedExpeditions={expeditions.length}
            onOpenQRScanner={() => setIsQRScannerOpen(true)}
          />
        )}

        {currentScreen === 'nova_expedicao' && (
          <ExpeditionForm
            initialExpedition={null}
            onSaveAndGenerateQR={handleSaveExpedition}
            onNavigate={handleNavigate}
            onOpenImporter={() => setIsImporterOpen(true)}
            defaultOperator={activeOperatorName}
          />
        )}

        {currentScreen === 'editar_expedicao' && (
          <ExpeditionForm
            initialExpedition={activeExpedition}
            onSaveAndGenerateQR={handleSaveExpedition}
            onNavigate={handleNavigate}
            onOpenImporter={() => setIsImporterOpen(true)}
            defaultOperator={activeOperatorName}
          />
        )}

        {currentScreen === 'qr_code' && activeExpedition && (
          <QRCodeScreen
            expedition={activeExpedition}
            onNavigate={handleNavigate}
            onStartConference={(exp) => {
              setActiveExpId(exp.id);
              setActiveExpeditionId(exp.id);
              handleNavigate('conferencia');
            }}
            onPrintExpedition={(exp) => setPrintData({ expedition: exp, type: 'qr_manifest' })}
          />
        )}

        {currentScreen === 'conferencia' && (
          <ConferenceScreen
            expedition={activeExpedition}
            settings={settings}
            operatorName={activeOperatorName}
            onUpdateExpedition={handleUpdateExpedition}
            onOpenQRScanner={() => setIsQRScannerOpen(true)}
            onOpenBatchCamera={() => setIsBatchCameraOpen(true)}
            onNavigate={handleNavigate}
            onPrintReleaseTerms={(exp) => setPrintData({ expedition: exp, type: 'release_term' })}
          />
        )}

        {currentScreen === 'historico' && (
          <SavedExpeditionsScreen
            expeditions={expeditions}
            activeExpeditionId={activeExpeditionId}
            onSelectForConference={(exp) => {
              setActiveExpId(exp.id);
              setActiveExpeditionId(exp.id);
              handleNavigate('conferencia');
            }}
            onViewQRCode={(exp) => {
              setActiveExpId(exp.id);
              setActiveExpeditionId(exp.id);
              handleNavigate('qr_code');
            }}
            onEditExpedition={(exp) => {
              setActiveExpId(exp.id);
              setActiveExpeditionId(exp.id);
              handleNavigate('editar_expedicao');
            }}
            onDeleteExpedition={handleDeleteExpedition}
            onNavigate={handleNavigate}
          />
        )}

        {(currentScreen === 'gerenciar_lotes' || currentScreen === 'importar') && (
          <LotManagementScreen
            expedition={activeExpedition}
            onUpdateExpedition={handleUpdateExpedition}
            onNavigate={handleNavigate}
          />
        )}

        {currentScreen === 'configuracoes' && (
          <SettingsScreen
            settings={settings}
            currentUser={currentUser}
            onSaveSettings={handleSaveSettings}
            onExportBackup={handleExportBackup}
            onImportBackup={handleImportBackup}
            onResetToDefaultLots={handleResetToDefaultLots}
            onNavigate={handleNavigate}
          />
        )}

        {currentScreen === 'usuarios' && (
          <AccessManagementScreen
            currentUser={currentUser}
            onNavigate={handleNavigate}
          />
        )}
      </main>

      {/* Global Modals */}
      <QRScannerModal
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        onExpeditionScanned={handleExpeditionScanned}
        soundEnabled={settings.somAtivado}
        hapticEnabled={settings.vibracaoAtivada}
      />

      <BatchBarcodeScannerModal
        isOpen={isBatchCameraOpen}
        onClose={() => setIsBatchCameraOpen(false)}
        expedition={activeExpedition}
        operatorName={activeOperatorName}
        soundEnabled={settings.somAtivado}
        hapticEnabled={settings.vibracaoAtivada}
        onUpdateExpedition={handleUpdateExpedition}
      />

      <BatchImportModal
        isOpen={isImporterOpen || currentScreen === 'importar'}
        onClose={() => {
          setIsImporterOpen(false);
          if (currentScreen === 'importar') {
            setCurrentScreen('home');
          }
        }}
        onImportComplete={handleImportLotsComplete}
      />

      {printData && (
        <PrintReportModal
          expedition={printData.expedition}
          type={printData.type}
          onClose={() => setPrintData(null)}
        />
      )}
    </div>
  );
}
