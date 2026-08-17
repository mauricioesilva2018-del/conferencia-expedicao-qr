import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Expedicao, LoteItem, DivergenciaItem, AppSettings, ActiveScreen } from '../types';
import { 
  playSuccessSound, 
  playErrorSound, 
  playWarningSound, 
  playFanfareSound, 
  triggerHaptic 
} from '../utils/audio';
import { decodeScannedCode } from '../utils/compression';
import { 
  QrCode, 
  Search, 
  Camera, 
  CheckCircle2, 
  Clock, 
  AlertOctagon, 
  Check, 
  RotateCcw, 
  Truck, 
  FileCheck2, 
  ShieldCheck, 
  User, 
  ArrowLeft, 
  Layers, 
  Filter, 
  Volume2, 
  VolumeX,
  X,
  Printer,
  AlertTriangle,
  Tag,
  Sprout,
  Calendar,
  Sparkles,
  ClipboardList,
  CheckCheck
} from 'lucide-react';

interface ConferenceScreenProps {
  expedition: Expedicao | null;
  settings: AppSettings;
  operatorName: string;
  onUpdateExpedition: (exp: Expedicao) => void;
  onOpenQRScanner: () => void;
  onOpenBatchCamera: () => void;
  onNavigate: (screen: ActiveScreen) => void;
  onPrintReleaseTerms: (exp: Expedicao) => void;
}

export const ConferenceScreen: React.FC<ConferenceScreenProps> = ({
  expedition,
  settings,
  operatorName,
  onUpdateExpedition,
  onOpenQRScanner,
  onOpenBatchCamera,
  onNavigate,
  onPrintReleaseTerms,
}) => {
  // Input search state
  const [lotInput, setLotInput] = useState('');
  
  // Active Consultation State
  const [consultResult, setConsultResult] = useState<{
    status: 'idle' | 'found_pending' | 'already_checked' | 'not_found' | 'success_registered';
    loteItem?: LoteItem;
    searchedCode?: string;
    message?: string;
  }>({ status: 'idle' });

  // Tab View Mode: 'conferir' (Main Flow) | 'realizadas' (Conferências Realizadas) | 'pendentes' | 'divergencias'
  const [activeTab, setActiveTab] = useState<'conferir' | 'realizadas' | 'pendentes' | 'divergencias'>('conferir');
  const [searchTableTerm, setSearchTableTerm] = useState('');

  // Finalization Modal State
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  const [isFinalizedBanner, setIsFinalizedBanner] = useState(expedition?.status === 'finalizada');

  // Input ref for auto-focus
  const lotInputRef = useRef<HTMLInputElement | null>(null);

  // Stats calculation
  const lotes = expedition?.lotes || [];
  const divergencias = expedition?.divergencias || [];
  const totalLotes = lotes.length;
  const conferidos = lotes.filter(l => l.conferido);
  const totalConferidos = conferidos.length;
  const totalPendentes = totalLotes - totalConferidos;
  const totalDivergencias = divergencias.length;

  const totalPeso = lotes.reduce((acc, l) => acc + (Number(l.peso) || 0), 0);
  const pesoConferido = conferidos.reduce((acc, l) => acc + (Number(l.peso) || 0), 0);
  const percentConferido = totalLotes > 0 ? Math.round((totalConferidos / totalLotes) * 100) : 0;
  const is100Percent = totalLotes > 0 && totalConferidos === totalLotes;

  // Auto-focus input on mount or tab change
  useEffect(() => {
    if (activeTab === 'conferir') {
      setTimeout(() => {
        lotInputRef.current?.focus();
      }, 100);
    }
  }, [activeTab]);

  // Trigger celebration on 100% complete
  useEffect(() => {
    if (is100Percent && expedition?.status !== 'finalizada') {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
      playFanfareSound(settings.somAtivado);
      triggerHaptic('success', settings.vibracaoAtivada);
    }
  }, [is100Percent]);

  // Handle consultation of a lot
  const handleConsultLot = (rawVal?: string) => {
    const codeToSearch = (rawVal !== undefined ? rawVal : lotInput).trim().toUpperCase();
    
    if (!codeToSearch) {
      setConsultResult({ status: 'idle' });
      lotInputRef.current?.focus();
      return;
    }

    if (!expedition) return;

    // Decode in case it was scanned or typed with formatting
    const decoded = decodeScannedCode(codeToSearch);
    let targetLotCode = codeToSearch;

    if (decoded.type === 'lot') {
      targetLotCode = decoded.lot.lote.toUpperCase();
    } else if (decoded.type === 'raw_code') {
      targetLotCode = decoded.code.toUpperCase();
    }

    // Search in registered expedition lots database
    const matched = expedition.lotes.find(l => l.lote.toUpperCase() === targetLotCode);

    if (matched) {
      if (matched.conferido) {
        // 11. LOTE JÁ CONFERIDO
        setConsultResult({
          status: 'already_checked',
          loteItem: matched,
          searchedCode: targetLotCode,
          message: `Lote ${matched.lote} já foi conferido anteriormente.`,
        });
        playWarningSound(settings.somAtivado);
        triggerHaptic('warning', settings.vibracaoAtivada);
      } else {
        // 4. LOTE EXISTE E ESTÁ PENDENTE -> Exibir dados para conferência física
        setConsultResult({
          status: 'found_pending',
          loteItem: matched,
          searchedCode: targetLotCode,
        });
        playSuccessSound(settings.somAtivado);
        triggerHaptic('success', settings.vibracaoAtivada);
      }
    } else {
      // 12. LOTE NÃO EXISTE NA BASE DE DADOS DA EXPEDIÇÃO
      const newDivergence: DivergenciaItem = {
        id: `div-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        loteLido: targetLotCode,
        dataHora: new Date().toISOString(),
        operador: operatorName || 'Operador Armazém',
        motivo: 'Lote não encontrado na carga',
      };

      const updatedDivergencias = [newDivergence, ...(expedition.divergencias || [])];
      const updatedExpedition: Expedicao = {
        ...expedition,
        divergencias: updatedDivergencias,
        atualizadoEm: new Date().toISOString(),
      };
      onUpdateExpedition(updatedExpedition);

      setConsultResult({
        status: 'not_found',
        searchedCode: targetLotCode,
        message: 'Verifique o número digitado.',
      });
      playErrorSound(settings.somAtivado);
      triggerHaptic('error', settings.vibracaoAtivada);
    }
  };

  // 9. When operator clicks "✅ CONFERIDO"
  const handleConfirmConference = () => {
    if (!expedition || !consultResult.loteItem) return;

    const targetLot = consultResult.loteItem.lote.toUpperCase();
    const checkTimestamp = new Date().toISOString();
    const currentOperator = operatorName || 'Operador Armazém';

    let checkedItem: LoteItem | undefined;

    const updatedLotes = expedition.lotes.map(l => {
      if (l.lote.toUpperCase() === targetLot) {
        checkedItem = {
          ...l,
          conferido: true,
          conferidoEm: checkTimestamp,
          conferidoPor: currentOperator,
        };
        return checkedItem;
      }
      return l;
    });

    const updatedExpedition: Expedicao = {
      ...expedition,
      status: 'em_conferencia',
      lotes: updatedLotes,
      atualizadoEm: new Date().toISOString(),
    };

    onUpdateExpedition(updatedExpedition);
    playSuccessSound(settings.somAtivado);
    triggerHaptic('success', settings.vibracaoAtivada);

    // 10. Mostrar "✅ LOTE CONFERIDO COM SUCESSO" e limpar o campo para o próximo lote
    setLotInput('');
    setConsultResult({
      status: 'success_registered',
      loteItem: checkedItem,
      searchedCode: targetLot,
      message: `Lote ${targetLot} conferido com sucesso!`,
    });

    // Automatically focus back on input for next lot
    setTimeout(() => {
      lotInputRef.current?.focus();
    }, 150);
  };

  // Undo conference
  const handleUncheckLot = (loteCode: string) => {
    if (!expedition) return;
    if (settings.confirmarDesfazer) {
      if (!confirm(`Deseja desfazer a conferência do lote ${loteCode}?`)) {
        return;
      }
    }

    const updatedLotes = expedition.lotes.map(l => {
      if (l.lote.toUpperCase() === loteCode.toUpperCase()) {
        return {
          ...l,
          conferido: false,
          conferidoEm: undefined,
          conferidoPor: undefined,
        };
      }
      return l;
    });

    const updatedExpedition: Expedicao = {
      ...expedition,
      status: 'em_conferencia',
      lotes: updatedLotes,
      atualizadoEm: new Date().toISOString(),
    };

    onUpdateExpedition(updatedExpedition);
    playWarningSound(settings.somAtivado);
    
    // Reset consultation state
    setConsultResult({ status: 'idle' });
    setLotInput('');
    lotInputRef.current?.focus();
  };

  const handleClearDivergencias = () => {
    if (!expedition) return;
    if (confirm('Deseja limpar o registro de divergências desta expedição?')) {
      const updatedExpedition: Expedicao = {
        ...expedition,
        divergencias: [],
        atualizadoEm: new Date().toISOString(),
      };
      onUpdateExpedition(updatedExpedition);
    }
  };

  const handleFinalizeConference = () => {
    if (!expedition || !is100Percent) return;

    const finalizedExp: Expedicao = {
      ...expedition,
      status: 'finalizada',
      finalizadaEm: new Date().toISOString(),
      finalizadaPor: operatorName || 'Operador Armazém',
      atualizadoEm: new Date().toISOString(),
    };

    onUpdateExpedition(finalizedExp);
    setIsFinalizeModalOpen(false);
    setIsFinalizedBanner(true);
    playFanfareSound(settings.somAtivado);
    triggerHaptic('success', settings.vibracaoAtivada);
    confetti({
      particleCount: 150,
      spread: 90,
      origin: { y: 0.5 },
    });
  };

  if (!expedition) {
    return (
      <div className="p-4 sm:p-6 max-w-xl mx-auto space-y-6 text-center">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-2xl mx-auto flex items-center justify-center">
            <QrCode className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Nenhuma Expedição Carregada
          </h2>
          <p className="text-sm text-slate-500">
            Escaneie o QR Code único da expedição com o celular para carregar os lotes e iniciar a conferência offline.
          </p>

          <button
            onClick={onOpenQRScanner}
            className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black py-4 px-6 rounded-2xl shadow-lg flex items-center justify-center gap-3 text-base"
            id="btn-conferencia-ler-qr-vazio"
          >
            <Camera className="w-6 h-6" />
            LER QR CODE DA EXPEDIÇÃO
          </button>
        </div>
      </div>
    );
  }

  // Filtered lists for tabs
  const realizedList = lotes
    .filter(l => l.conferido)
    .filter(item => {
      if (!searchTableTerm) return true;
      const term = searchTableTerm.toLowerCase();
      return (
        item.lote.toLowerCase().includes(term) ||
        item.peneira.toLowerCase().includes(term) ||
        item.categoria.toLowerCase().includes(term) ||
        (item.conferidoPor && item.conferidoPor.toLowerCase().includes(term))
      );
    });

  const pendingList = lotes
    .filter(l => !l.conferido)
    .filter(item => {
      if (!searchTableTerm) return true;
      const term = searchTableTerm.toLowerCase();
      return (
        item.lote.toLowerCase().includes(term) ||
        item.peneira.toLowerCase().includes(term) ||
        item.categoria.toLowerCase().includes(term)
      );
    });

  return (
    <div className="p-3 sm:p-5 max-w-3xl mx-auto space-y-3.5 pb-24">
      {/* EXPEDITION SUMMARY DASHBOARD */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs font-mono">
              EXPEDIÇÃO #{expedition.numero}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {expedition.data}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
            <User className="w-3.5 h-3.5" />
            <span className="truncate max-w-[120px]">{operatorName || 'Operador'}</span>
          </div>
        </div>

        {/* 4-Metric Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">
              Total Lotes
            </span>
            <div className="text-xl font-black font-mono text-white mt-0.5">
              {totalLotes}
            </div>
            <span className="text-[10px] text-slate-400 block font-mono">
              {totalPeso.toLocaleString('pt-BR')} kg
            </span>
          </div>

          <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] font-bold text-emerald-400 block uppercase">
              Conferidos
            </span>
            <div className="text-xl font-black font-mono text-emerald-400 mt-0.5">
              {totalConferidos}
            </div>
            <span className="text-[10px] text-emerald-300 block font-mono">
              {pesoConferido.toLocaleString('pt-BR')} kg
            </span>
          </div>

          <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] font-bold text-amber-400 block uppercase">
              Pendentes
            </span>
            <div className="text-xl font-black font-mono text-amber-400 mt-0.5">
              {totalPendentes}
            </div>
            <span className="text-[10px] text-amber-300 block font-mono">
              {(totalPeso - pesoConferido).toLocaleString('pt-BR')} kg
            </span>
          </div>

          <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] font-bold text-red-400 block uppercase">
              Divergências
            </span>
            <div className="text-xl font-black font-mono text-red-400 mt-0.5">
              {totalDivergencias}
            </div>
            <span className="text-[10px] text-red-300 block font-mono">
              {totalDivergencias > 0 ? 'Não cadastrados' : '0 erros'}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1 pt-1">
          <div className="flex justify-between items-center text-xs font-bold font-mono">
            <span className="text-slate-300">Progresso da Carga:</span>
            <span className="text-emerald-400 text-sm font-black">{percentConferido}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-300 shadow-sm"
              style={{ width: `${percentConferido}%` }}
            />
          </div>
        </div>

        {/* 100% Completed Banner */}
        {is100Percent && !isFinalizedBanner && (
          <div className="bg-emerald-500 text-slate-950 p-3 rounded-xl font-black text-center text-sm sm:text-base flex items-center justify-center gap-2 shadow-md animate-pulse">
            <span>🟢</span>
            <span>EXPEDIÇÃO 100% CONFERIDA! PRONTA PARA FINALIZAR</span>
          </div>
        )}

        {isFinalizedBanner && (
          <div className="bg-emerald-600 text-white p-3 rounded-xl font-black text-center text-xs sm:text-sm flex items-center justify-between gap-2 shadow-md">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-200" />
              <span>EXPEDIÇÃO FINALIZADA E LIBERADA</span>
            </div>
            <button
              onClick={() => onPrintReleaseTerms(expedition)}
              className="bg-slate-950 hover:bg-slate-900 text-emerald-300 text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 font-bold border border-emerald-400/40"
              id="btn-imprimir-termo-liberacao"
            >
              <Printer className="w-3.5 h-3.5" />
              Termo
            </button>
          </div>
        )}
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex bg-slate-200 p-1 rounded-2xl text-xs font-bold gap-1 overflow-x-auto shadow-inner">
        <button
          onClick={() => { setActiveTab('conferir'); setSearchTableTerm(''); }}
          className={`flex-1 py-2.5 px-3 rounded-xl text-center transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${
            activeTab === 'conferir'
              ? 'bg-slate-900 text-white font-black shadow-md'
              : 'text-slate-700 hover:text-slate-900'
          }`}
          id="tab-conferir-lote"
        >
          <Search className="w-3.5 h-3.5 text-emerald-400" />
          <span>Digitar Lote</span>
        </button>

        <button
          onClick={() => { setActiveTab('realizadas'); setSearchTableTerm(''); }}
          className={`flex-1 py-2.5 px-3 rounded-xl text-center transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${
            activeTab === 'realizadas'
              ? 'bg-emerald-600 text-white font-black shadow-md'
              : 'text-slate-700 hover:text-slate-900'
          }`}
          id="tab-conferencias-realizadas"
        >
          <CheckCheck className="w-3.5 h-3.5" />
          <span>Conferências Realizadas ({totalConferidos})</span>
        </button>

        <button
          onClick={() => { setActiveTab('pendentes'); setSearchTableTerm(''); }}
          className={`py-2.5 px-3 rounded-xl text-center transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${
            activeTab === 'pendentes'
              ? 'bg-amber-500 text-slate-950 font-black shadow-md'
              : 'text-slate-700 hover:text-slate-900'
          }`}
          id="tab-lotes-pendentes"
        >
          <span>Pendentes ({totalPendentes})</span>
        </button>

        {totalDivergencias > 0 && (
          <button
            onClick={() => { setActiveTab('divergencias'); setSearchTableTerm(''); }}
            className={`py-2.5 px-3 rounded-xl text-center transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${
              activeTab === 'divergencias'
                ? 'bg-red-600 text-white font-black shadow-md'
                : 'text-red-700 hover:text-red-900'
            }`}
            id="tab-divergencias"
          >
            <span>Divergências ({totalDivergencias})</span>
          </button>
        )}
      </div>

      {/* ======================================================== */}
      {/* TAB 1: MAIN CONFERÊNCIA POR DIGITAÇÃO DO NÚMERO DO LOTE */}
      {/* ======================================================== */}
      {activeTab === 'conferir' && (
        <div className="space-y-3.5">
          {/* Main Large Input Card: Optimized for Android & Fast Warehouse Entry */}
          <div className="bg-white border-2 border-slate-300 focus-within:border-emerald-500 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3 transition-all">
            {/* 1. Large Label: "Digite o número do lote" */}
            <label 
              htmlFor="input-numero-lote"
              className="block text-sm sm:text-base font-black text-slate-900 uppercase tracking-tight"
            >
              Digite o número do lote
            </label>

            {/* 2. Big Input Field with Example: 1MG1260001 */}
            <div className="relative">
              <input
                ref={lotInputRef}
                id="input-numero-lote"
                type="text"
                value={lotInput}
                onChange={e => {
                  setLotInput(e.target.value);
                  if (consultResult.status !== 'idle') {
                    // Reset alert as operator types a new number
                    setConsultResult({ status: 'idle' });
                  }
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleConsultLot();
                  }
                }}
                placeholder="Ex: 1MG1260001"
                autoCapitalize="characters"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                className="w-full bg-slate-50 focus:bg-white border-2 border-slate-300 focus:border-emerald-600 rounded-2xl px-4 py-4 text-slate-950 font-mono font-black text-xl sm:text-2xl uppercase tracking-wider focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all shadow-inner"
              />

              {lotInput && (
                <button
                  type="button"
                  onClick={() => {
                    setLotInput('');
                    setConsultResult({ status: 'idle' });
                    lotInputRef.current?.focus();
                  }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-800 active:scale-95"
                  title="Limpar campo"
                >
                  <X className="w-6 h-6" />
                </button>
              )}
            </div>

            {/* 3. Big Action Buttons: "CONSULTAR LOTE" & "CÂMERA" */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => handleConsultLot()}
                disabled={!lotInput.trim()}
                className="sm:col-span-2 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 disabled:bg-slate-300 disabled:text-slate-500 text-white font-black py-4 px-5 rounded-2xl shadow-md flex items-center justify-center gap-2.5 text-base sm:text-lg transition-transform active:scale-[0.99] cursor-pointer disabled:cursor-not-allowed"
                id="btn-consultar-lote"
              >
                <Search className="w-5 h-5 text-emerald-400" />
                <span>CONSULTAR LOTE</span>
              </button>

              <button
                type="button"
                onClick={onOpenBatchCamera}
                className="bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-bold py-4 px-4 rounded-2xl border-2 border-slate-200 flex items-center justify-center gap-2 text-sm sm:text-base transition-colors"
                title="Escanear código de barras com a câmera"
                id="btn-abrir-camera-conferencia"
              >
                <Camera className="w-5 h-5 text-emerald-600" />
                <span>CÂMERA</span>
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 4 & 5 & 6 & 7 & 8: SE O LOTE EXISTIR E ESTIVER PENDENTE */}
          {/* ======================================================== */}
          {consultResult.status === 'found_pending' && consultResult.loteItem && (
            <div className="bg-white border-3 border-emerald-500 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
              {/* Badge: Lote Encontrado */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  LOTE LOCALIZADO NA EXPEDIÇÃO #{expedition.numero}
                </span>
                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  STATUS: PENDENTE
                </span>
              </div>

              {/* 5. Número do Lote em Grande Destaque */}
              <div className="text-center py-2 bg-slate-900 text-white rounded-2xl p-4 shadow-inner">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-1">
                  NÚMERO DO LOTE
                </span>
                <div className="font-mono font-black text-2xl sm:text-4xl text-emerald-400 tracking-wider">
                  {consultResult.loteItem.lote}
                </div>
              </div>

              {/* 4. Complete Lot Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs text-slate-800">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 block uppercase">Peso</span>
                  <strong className="text-base font-black text-slate-900 font-mono">
                    {consultResult.loteItem.peso.toLocaleString('pt-BR')} kg
                  </strong>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 block uppercase">Peneira</span>
                  <strong className="text-base font-black text-slate-900 font-mono">
                    {consultResult.loteItem.peneira || 'N/D'}
                  </strong>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 block uppercase">Categoria</span>
                  <strong className="text-base font-black text-slate-900">
                    {consultResult.loteItem.categoria || 'N/D'}
                  </strong>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 block uppercase">Cultura / Híbrido</span>
                  <strong className="text-sm font-black text-slate-900 truncate block">
                    {consultResult.loteItem.cultivar || consultResult.loteItem.cultura || 'Padrão'}
                  </strong>
                </div>
              </div>

              {/* 6. Message: "CONFIRA FISICAMENTE OS DADOS DA ETIQUETA" */}
              <div className="bg-amber-500/15 border-2 border-amber-500 rounded-2xl p-3.5 text-center flex items-center justify-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <span className="font-black text-xs sm:text-sm text-amber-950 uppercase tracking-wide">
                  CONFIRA FISICAMENTE OS DADOS DA ETIQUETA
                </span>
              </div>

              {/* 7 & 8. Big "✅ CONFERIDO" Button */}
              <button
                type="button"
                onClick={handleConfirmConference}
                className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black py-4 sm:py-5 px-6 rounded-2xl shadow-xl flex items-center justify-center gap-3 text-lg sm:text-xl transition-all active:scale-[0.98] ring-4 ring-emerald-500/30"
                id="btn-confirmar-lote-conferido"
              >
                <Check className="w-7 h-7 stroke-[3.5]" />
                <span>CONFERIDO</span>
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* 10. SUCESSO: "✅ LOTE CONFERIDO COM SUCESSO" */}
          {/* ======================================================== */}
          {consultResult.status === 'success_registered' && consultResult.loteItem && (
            <div className="bg-emerald-600 text-white rounded-3xl p-5 shadow-xl space-y-3 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white text-emerald-600 flex items-center justify-center flex-shrink-0 font-black shadow">
                  <Check className="w-6 h-6 stroke-[3.5]" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg tracking-tight">
                    ✅ LOTE CONFERIDO COM SUCESSO
                  </h3>
                  <p className="text-xs text-emerald-100">
                    Registrado na base de dados. Digite o próximo lote acima.
                  </p>
                </div>
              </div>

              <div className="bg-emerald-700/80 rounded-2xl p-3 text-xs space-y-1.5 text-emerald-50 font-medium">
                <div className="flex justify-between border-b border-emerald-600/60 pb-1 font-mono">
                  <span>Lote:</span>
                  <strong className="text-white font-black text-sm">{consultResult.loteItem.lote}</strong>
                </div>
                <div className="flex justify-between border-b border-emerald-600/60 pb-1">
                  <span>Data e Hora:</span>
                  <strong className="text-white">
                    {consultResult.loteItem.conferidoEm ? new Date(consultResult.loteItem.conferidoEm).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR')}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Operador:</span>
                  <strong className="text-white">{consultResult.loteItem.conferidoPor || operatorName}</strong>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 11. AVISO: "⚠️ LOTE JÁ CONFERIDO" */}
          {/* ======================================================== */}
          {consultResult.status === 'already_checked' && consultResult.loteItem && (
            <div className="bg-amber-50 border-3 border-amber-400 rounded-3xl p-4 sm:p-5 shadow-lg space-y-3.5 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-amber-900">
                <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
                <h3 className="font-black text-base sm:text-lg">
                  ⚠️ LOTE JÁ CONFERIDO
                </h3>
              </div>

              {/* Destaque do Lote */}
              <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-sm space-y-2 text-xs text-slate-800">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <span className="text-slate-500 font-bold uppercase">Número do Lote:</span>
                  <span className="font-mono font-black text-slate-900 text-lg">{consultResult.loteItem.lote}</span>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Data e Hora da Conferência:</span>
                    <strong className="font-mono text-slate-900 font-bold">
                      {consultResult.loteItem.conferidoEm
                        ? new Date(consultResult.loteItem.conferidoEm).toLocaleString('pt-BR')
                        : 'Previamente registrado'}
                    </strong>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Operador Responsável:</span>
                    <strong className="text-slate-900">
                      {consultResult.loteItem.conferidoPor || 'Operador'}
                    </strong>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Peso / Peneira / Categoria:</span>
                    <strong className="text-slate-900 font-mono">
                      {consultResult.loteItem.peso} kg &middot; {consultResult.loteItem.peneira} &middot; {consultResult.loteItem.categoria}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Desfazer Botão */}
              <button
                type="button"
                onClick={() => handleUncheckLot(consultResult.loteItem!.lote)}
                className="w-full bg-white hover:bg-amber-100 active:bg-amber-200 text-amber-950 font-bold py-3 px-4 rounded-xl border-2 border-amber-300 flex items-center justify-center gap-2 text-xs transition-colors"
                id="btn-desfazer-conferencia-aviso"
              >
                <RotateCcw className="w-4 h-4" />
                Desfazer conferência deste lote (marcar como pendente)
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* 12. ERRO: "❌ LOTE NÃO ENCONTRADO" */}
          {/* ======================================================== */}
          {consultResult.status === 'not_found' && (
            <div className="bg-red-600 text-white rounded-3xl p-5 shadow-xl space-y-3 animate-in shake duration-300">
              <div className="flex items-center gap-3">
                <AlertOctagon className="w-7 h-7 flex-shrink-0" />
                <div>
                  <h3 className="font-black text-base sm:text-lg tracking-tight">
                    ❌ LOTE NÃO ENCONTRADO
                  </h3>
                  <p className="text-xs text-red-100 font-bold">
                    Verifique o número digitado.
                  </p>
                </div>
              </div>

              <div className="bg-red-700/80 rounded-2xl p-3.5 text-xs space-y-1 text-red-50">
                <div>Código pesquisado: <strong className="font-mono text-white text-sm font-black">"{consultResult.searchedCode || lotInput}"</strong></div>
                <p className="text-[11px] text-red-200 pt-1">
                  Este lote não consta na lista da expedição #{expedition.numero}. Registrado na aba de divergências para auditoria.
                </p>
              </div>
            </div>
          )}

          {/* Quick Help for Operator */}
          {consultResult.status === 'idle' && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 flex items-center gap-3">
              <ClipboardList className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>
                Digite o número gravado no saco/bag e clique em <strong>CONSULTAR LOTE</strong> para conferir os dados da etiqueta física.
              </span>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: SEÇÃO "CONFERÊNCIAS REALIZADAS" (Requirement 16) */}
      {/* ======================================================== */}
      {activeTab === 'realizadas' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative flex-1 mr-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTableTerm}
                onChange={e => setSearchTableTerm(e.target.value)}
                placeholder="Filtrar por lote, peneira ou operador..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200 whitespace-nowrap">
              {realizedList.length} Conferido(s)
            </span>
          </div>

          {realizedList.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center text-slate-400 border border-slate-200 space-y-2">
              <Clock className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="font-bold text-slate-700">Nenhuma conferência realizada ainda</div>
              <p className="text-xs text-slate-500">
                Vá para a aba "Digitar Lote" para iniciar as verificações da carga.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {realizedList.map((item, idx) => {
                const confDate = item.conferidoEm ? new Date(item.conferidoEm) : null;
                return (
                  <div
                    key={`${item.lote}-${idx}`}
                    className="bg-white border-2 border-emerald-200 rounded-2xl p-3.5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-base sm:text-lg text-slate-900">
                          {item.lote}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 flex items-center gap-1">
                          <Check className="w-3 h-3 stroke-[3]" />
                          CONFERIDO
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                        <span className="bg-slate-100 px-2 py-0.5 rounded font-mono font-bold text-slate-800">
                          {item.peso.toLocaleString('pt-BR')} kg
                        </span>
                        <span className="bg-slate-100 px-2 py-0.5 rounded">
                          Peneira: <strong className="text-slate-800">{item.peneira}</strong>
                        </span>
                        <span className="bg-slate-100 px-2 py-0.5 rounded">
                          Cat: <strong className="text-slate-800">{item.categoria}</strong>
                        </span>
                      </div>

                      {confDate && (
                        <div className="text-[11px] text-emerald-800 flex flex-wrap items-center gap-x-3 gap-y-0.5 pt-0.5 font-medium">
                          <span>📅 Data: <strong>{confDate.toLocaleDateString('pt-BR')}</strong></span>
                          <span>⏰ Hora: <strong>{confDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</strong></span>
                          <span>👤 Operador: <strong>{item.conferidoPor || operatorName}</strong></span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUncheckLot(item.lote)}
                      className="bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-700 font-bold text-xs py-2 px-3 rounded-xl border border-slate-200 hover:border-red-200 flex items-center justify-center gap-1 transition-colors self-end sm:self-center"
                      title="Desfazer conferência deste lote"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Desfazer
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: LOTES PENDENTES */}
      {/* ======================================================== */}
      {activeTab === 'pendentes' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative flex-1 mr-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTableTerm}
                onChange={e => setSearchTableTerm(e.target.value)}
                placeholder="Filtrar pendentes..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-2 rounded-xl border border-amber-200 whitespace-nowrap">
              {pendingList.length} Pendente(s)
            </span>
          </div>

          {pendingList.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center text-slate-400 border border-slate-200 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <div className="font-bold text-slate-800">Nenhum lote pendente!</div>
              <p className="text-xs text-slate-500">
                Todos os {totalLotes} lotes da expedição foram conferidos.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {pendingList.map((item, idx) => (
                <div
                  key={`${item.lote}-${idx}`}
                  className="bg-white border-2 border-slate-200 rounded-2xl p-3.5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-base sm:text-lg text-slate-900">
                        {item.lote}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                        PENDENTE
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      <span className="bg-slate-100 px-2 py-0.5 rounded font-mono font-bold text-slate-800">
                        {item.peso.toLocaleString('pt-BR')} kg
                      </span>
                      <span className="bg-slate-100 px-2 py-0.5 rounded">
                        Peneira: <strong className="text-slate-800">{item.peneira}</strong>
                      </span>
                      <span className="bg-slate-100 px-2 py-0.5 rounded">
                        Cat: <strong className="text-slate-800">{item.categoria}</strong>
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setLotInput(item.lote);
                      setActiveTab('conferir');
                      handleConsultLot(item.lote);
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 self-end sm:self-center shadow"
                  >
                    <Search className="w-3.5 h-3.5 text-emerald-400" />
                    Conferir Este
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: DIVERGÊNCIAS */}
      {/* ======================================================== */}
      {activeTab === 'divergencias' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-bold text-red-700">
              {divergencias.length} tentativa(s) de lote inválido:
            </span>
            <button
              type="button"
              onClick={handleClearDivergencias}
              className="text-xs text-slate-500 hover:text-red-700 underline"
            >
              Limpar divergências
            </button>
          </div>

          <div className="space-y-2">
            {divergencias.map(divItem => (
              <div
                key={divItem.id}
                className="bg-red-50 border-2 border-red-300 rounded-2xl p-3.5 space-y-1.5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-red-950 text-base">
                      {divItem.loteLido}
                    </span>
                    <span className="text-[10px] font-black bg-red-200 text-red-900 px-2 py-0.5 rounded-full">
                      NÃO PERTENCE À CARGA
                    </span>
                  </div>
                  <span className="text-xs text-red-700 font-mono">
                    {new Date(divItem.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="text-xs text-slate-600 flex flex-wrap gap-x-3 gap-y-0.5">
                  <span>Operador: <strong>{divItem.operador}</strong></span>
                  <span>Data: <strong>{new Date(divItem.dataHora).toLocaleDateString('pt-BR')}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FINALIZATION BUTTON (Prominently anchored at bottom) */}
      <div className="pt-3 sticky bottom-3 z-30">
        <button
          type="button"
          disabled={!is100Percent}
          onClick={() => setIsFinalizeModalOpen(true)}
          className={`w-full font-black text-base sm:text-lg py-4 px-6 rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-all ${
            is100Percent
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer active:scale-[0.99] ring-4 ring-emerald-500/30'
              : 'bg-slate-300 text-slate-500 cursor-not-allowed'
          }`}
          id="btn-finalizar-conferencia"
        >
          <FileCheck2 className="w-6 h-6" />
          {is100Percent
            ? 'FINALIZAR CONFERÊNCIA (100%)'
            : `FINALIZAR CONFERÊNCIA (${totalPendentes} PENDENTES)`}
        </button>
      </div>

      {/* Confirmation Modal Before Finalizing */}
      {isFinalizeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="text-center space-y-1">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full mx-auto flex items-center justify-center">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900">
                Confirmar Liberação de Carga
              </h3>
              <p className="text-xs text-slate-500">
                Todos os lotes foram verificados. Revise o resumo antes de finalizar:
              </p>
            </div>

            {/* Final Summary List */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs space-y-2 font-medium">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Expedição:</span>
                <span className="font-bold text-slate-900 font-mono">#{expedition.numero}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Total de lotes:</span>
                <span className="font-bold text-slate-900 font-mono">{totalLotes}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Lotes conferidos:</span>
                <span className="font-bold text-emerald-700 font-mono">{totalConferidos}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Lotes pendentes:</span>
                <span className="font-bold text-slate-900 font-mono">{totalPendentes}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Divergências registradas:</span>
                <span className="font-bold text-red-600 font-mono">{totalDivergencias}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Peso total:</span>
                <span className="font-bold text-slate-900 font-mono">{totalPeso.toLocaleString('pt-BR')} kg</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Peso conferido:</span>
                <span className="font-bold text-emerald-700 font-mono">{pesoConferido.toLocaleString('pt-BR')} kg</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Data e hora:</span>
                <span className="font-bold text-slate-900">{new Date().toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Operador:</span>
                <span className="font-bold text-slate-900">{operatorName || 'Operador'}</span>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsFinalizeModalOpen(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleFinalizeConference}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg"
                id="btn-confirmar-finalizacao-modal"
              >
                CONFIRMAR E LIBERAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
