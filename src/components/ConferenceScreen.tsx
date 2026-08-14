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
  Calendar
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
  const [searchFeedback, setSearchFeedback] = useState<{
    status: 'idle' | 'lote_conferido' | 'lote_ja_conferido' | 'lote_nao_encontrado';
    loteItem?: LoteItem;
    message?: string;
    divergenceCode?: string;
  }>({ status: 'idle' });

  // Filter state: 'todos' | 'pendentes' | 'conferidos' | 'divergencias'
  const [filterMode, setFilterMode] = useState<'todos' | 'pendentes' | 'conferidos' | 'divergencias'>('pendentes');
  const [searchTerm, setSearchTerm] = useState('');

  // Finalization Modal State
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  const [isFinalizedBanner, setIsFinalizedBanner] = useState(expedition?.status === 'finalizada');

  // Input ref for quick focus
  const searchInputRef = useRef<HTMLInputElement | null>(null);

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

  // Evaluate scanned or typed code
  const handleProcessCode = (rawVal: string) => {
    const clean = rawVal.trim().toUpperCase();
    if (!clean) {
      setSearchFeedback({ status: 'idle' });
      return;
    }

    if (!expedition) return;

    // Use unified decoder in case input is JSON or Pipe Delimited or plain lot code
    const decoded = decodeScannedCode(rawVal);
    let targetLotCode = clean;
    let decodedLotExtra: Partial<LoteItem> = {};

    if (decoded.type === 'lot') {
      targetLotCode = decoded.lot.lote.toUpperCase();
      decodedLotExtra = decoded.lot;
    } else if (decoded.type === 'raw_code') {
      targetLotCode = decoded.code.toUpperCase();
    }

    // Search exact match in expedition
    const matched = expedition.lotes.find(l => l.lote.toUpperCase() === targetLotCode);

    if (matched) {
      if (matched.conferido) {
        // LOTE JÁ CONFERIDO
        setSearchFeedback({
          status: 'lote_ja_conferido',
          loteItem: matched,
          message: `Lote ${matched.lote} já foi conferido em ${matched.conferidoEm ? new Date(matched.conferidoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''} por ${matched.conferidoPor || 'Operador'}.`,
        });
        playWarningSound(settings.somAtivado);
        triggerHaptic('warning', settings.vibracaoAtivada);
      } else {
        // LOTE CONFERIDO -> Auto execute conference registration
        executeCheckLot(matched.lote, decodedLotExtra);
      }
    } else {
      // LOTE NÃO ENCONTRADO / NÃO PERTENCE A ESTA EXPEDIÇÃO
      const newDivergence: DivergenciaItem = {
        id: `div-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        loteLido: targetLotCode,
        dataHora: new Date().toISOString(),
        operador: operatorName || 'Operador Armazém',
        motivo: 'Lote não pertence a esta expedição',
        cultura: decodedLotExtra.cultura,
        cultivar: decodedLotExtra.cultivar,
        peneira: decodedLotExtra.peneira,
        categoria: decodedLotExtra.categoria,
        peso: decodedLotExtra.peso,
      };

      const updatedDivergencias = [newDivergence, ...(expedition.divergencias || [])];
      const updatedExpedition: Expedicao = {
        ...expedition,
        divergencias: updatedDivergencias,
        atualizadoEm: new Date().toISOString(),
      };
      onUpdateExpedition(updatedExpedition);

      setSearchFeedback({
        status: 'lote_nao_encontrado',
        divergenceCode: targetLotCode,
        message: `⚠️ LOTE NÃO PERTENCE A ESTA EXPEDIÇÃO!`,
      });
      playErrorSound(settings.somAtivado);
      triggerHaptic('error', settings.vibracaoAtivada);
    }
  };

  const executeCheckLot = (loteCode: string, extra?: Partial<LoteItem>) => {
    if (!expedition) return;

    const checkTimestamp = new Date().toISOString();
    const currentOperator = operatorName || 'Operador Armazém';

    let checkedItem: LoteItem | undefined;

    const updatedLotes = expedition.lotes.map(l => {
      if (l.lote.toUpperCase() === loteCode.toUpperCase()) {
        checkedItem = {
          ...l,
          cultura: l.cultura || extra?.cultura,
          cultivar: l.cultivar || extra?.cultivar,
          peneira: l.peneira || extra?.peneira || '',
          categoria: l.categoria || extra?.categoria || '',
          peso: l.peso || extra?.peso || 0,
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

    // Show immediate lot data feedback: LOTE CONFERIDO
    setLotInput('');
    setSearchFeedback({
      status: 'lote_conferido',
      loteItem: checkedItem,
      message: `Lote ${loteCode} conferido com sucesso!`,
    });

    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

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
    setSearchFeedback({ status: 'idle' });
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

  // Filtered displayed lots
  const displayedLotes = lotes.filter(item => {
    if (filterMode === 'pendentes' && item.conferido) return false;
    if (filterMode === 'conferidos' && !item.conferido) return false;
    if (filterMode === 'divergencias') return false; // Handled separately

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        item.lote.toLowerCase().includes(term) ||
        item.peneira.toLowerCase().includes(term) ||
        item.categoria.toLowerCase().includes(term) ||
        (item.cultura && item.cultura.toLowerCase().includes(term)) ||
        (item.cultivar && item.cultivar.toLowerCase().includes(term))
      );
    }
    return true;
  });

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

  return (
    <div className="p-3 sm:p-5 max-w-3xl mx-auto space-y-3.5 pb-24">
      {/* Big QR Scanner Button (As explicitly requested) */}
      <button
        onClick={onOpenBatchCamera}
        className="w-full bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-black py-3.5 px-4 rounded-2xl shadow-md border-2 border-emerald-500/50 flex items-center justify-center gap-3 text-sm sm:text-base tracking-wide transition-all active:scale-[0.99]"
        id="btn-conferencia-ler-qr-top"
      >
        <span className="text-xl">📷</span>
        <span>LER QR CODE / CÓDIGO DE BARRAS</span>
      </button>

      {/* CONTROLE DE EXPEDIÇÃO DASHBOARD CARD */}
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

          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-slate-800 px-2 py-1 rounded-lg">
            <User className="w-3.5 h-3.5" />
            <span className="truncate max-w-[110px]">{operatorName || 'Operador'}</span>
          </div>
        </div>

        {/* 5-Metric Expedition Control Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {/* 1. Total de Lotes */}
          <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">
              Total de Lotes
            </span>
            <div className="text-xl font-black font-mono text-white mt-0.5">
              {totalLotes}
            </div>
            <span className="text-[10px] text-slate-400 block font-mono">
              {totalPeso.toLocaleString('pt-BR')} kg
            </span>
          </div>

          {/* 2. Conferidos */}
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

          {/* 3. Pendentes */}
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

          {/* 4. Divergências */}
          <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] font-bold text-red-400 block uppercase">
              Divergências
            </span>
            <div className="text-xl font-black font-mono text-red-400 mt-0.5">
              {totalDivergencias}
            </div>
            <span className="text-[10px] text-red-300 block font-mono">
              {totalDivergencias > 0 ? 'Não cadastrados' : 'Nenhuma'}
            </span>
          </div>
        </div>

        {/* Percentual de Conclusão */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between items-center text-xs font-bold font-mono">
            <span className="text-slate-300">Conclusão da Carga:</span>
            <span className="text-emerald-400 text-sm font-black">{percentConferido}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-300 shadow-sm"
              style={{ width: `${percentConferido}%` }}
            />
          </div>
        </div>

        {/* 100% Banner when complete */}
        {is100Percent && !isFinalizedBanner && (
          <div className="bg-emerald-500 text-slate-950 p-3 rounded-xl font-black text-center text-sm sm:text-base flex items-center justify-center gap-2 animate-pulse shadow-md">
            <span>🟢</span>
            <span>EXPEDIÇÃO 100% CONFERIDA! PRONTA PARA FINALIZAR</span>
          </div>
        )}

        {isFinalizedBanner && (
          <div className="bg-emerald-600 text-white p-3.5 rounded-xl font-black text-center text-sm sm:text-base flex items-center justify-between gap-2 shadow-md">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-200" />
              <span>🟢 EXPEDIÇÃO LIBERADA PARA CARREGAMENTO</span>
            </div>
            <button
              onClick={() => onPrintReleaseTerms(expedition)}
              className="bg-slate-950 hover:bg-slate-900 text-emerald-300 text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 font-bold border border-emerald-400/40"
              id="btn-imprimir-termo-liberacao"
            >
              <Printer className="w-3.5 h-3.5" />
              Termo
            </button>
          </div>
        )}
      </div>

      {/* SEARCH / BARCODE SCANNER BOX */}
      <div className="bg-white border-2 border-slate-300 focus-within:border-emerald-500 rounded-2xl p-3 sm:p-4 shadow-sm space-y-3">
        <label className="block text-xs sm:text-sm font-black text-slate-800 uppercase tracking-tight">
          🔍 Digite ou escaneie o número do lote
        </label>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              ref={searchInputRef}
              type="text"
              value={lotInput}
              onChange={e => setLotInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && lotInput.trim()) {
                  handleProcessCode(lotInput);
                }
              }}
              placeholder="Ex: 1MG1260001"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              className="w-full bg-slate-100 focus:bg-white border-2 border-slate-300 focus:border-emerald-500 rounded-xl px-3.5 py-3 text-slate-900 font-mono font-black text-base sm:text-lg uppercase tracking-wider focus:outline-none transition-all"
              id="input-pesquisa-lote"
            />
            {lotInput && (
              <button
                type="button"
                onClick={() => { setLotInput(''); setSearchFeedback({ status: 'idle' }); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              if (lotInput.trim()) {
                handleProcessCode(lotInput);
              } else {
                onOpenBatchCamera();
              }
            }}
            className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold px-4 py-3 rounded-xl flex items-center justify-center gap-1.5 shadow transition-transform active:scale-95 flex-shrink-0"
            title="Escanear com a câmera ou confirmar código digitado"
            id="btn-escanear-lote-camera"
          >
            <Camera className="w-5 h-5" />
            <span className="text-xs font-black">{lotInput.trim() ? 'VALIDAR' : 'CÂMERA'}</span>
          </button>
        </div>

        {/* Real-time Validation Feedback Box: Exact Requested Requirement 4 & 6 */}
        {searchFeedback.status === 'lote_conferido' && searchFeedback.loteItem && (
          <div className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-600 text-white flex items-center gap-1.5 shadow-sm">
                <Check className="w-4 h-4 stroke-[3]" />
                LOTE CONFERIDO
              </span>
              <span className="font-mono text-xs text-emerald-800 font-bold">
                {new Date(searchFeedback.loteItem.conferidoEm || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>

            {/* Complete Data of the Lot */}
            <div className="bg-white rounded-xl p-3 border border-emerald-200 shadow-inner space-y-2 text-xs text-slate-800">
              <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                <span className="text-slate-500 font-semibold">Nº do Lote:</span>
                <span className="font-mono font-black text-slate-900 text-base">{searchFeedback.loteItem.lote}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>Peneira: <strong className="text-slate-900 font-mono">{searchFeedback.loteItem.peneira || 'N/D'}</strong></div>
                <div>Categoria: <strong className="text-slate-900">{searchFeedback.loteItem.categoria || 'N/D'}</strong></div>
                <div>Peso: <strong className="text-slate-900 font-mono">{searchFeedback.loteItem.peso} kg</strong></div>
                <div>Cultura: <strong className="text-slate-900">{searchFeedback.loteItem.cultura || 'N/D'}</strong></div>
              </div>
              {searchFeedback.loteItem.cultivar && (
                <div className="border-t border-slate-100 pt-1">
                  Cultivar / Híbrido: <strong className="text-slate-900">{searchFeedback.loteItem.cultivar}</strong>
                </div>
              )}
              <div className="text-[11px] text-emerald-700 font-semibold pt-1 border-t border-slate-100 flex items-center justify-between">
                <span>Operador: <strong>{searchFeedback.loteItem.conferidoPor || operatorName}</strong></span>
                <span>Status: <strong className="text-emerald-700">CONFERIDO</strong></span>
              </div>
            </div>
          </div>
        )}

        {searchFeedback.status === 'lote_ja_conferido' && searchFeedback.loteItem && (
          <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-4 space-y-3 animate-in fade-in duration-150 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500 text-slate-950 flex items-center gap-1.5 shadow-sm">
                <AlertTriangle className="w-4 h-4" />
                LOTE JÁ CONFERIDO
              </span>
              <span className="font-mono font-black text-slate-900 text-base">
                {searchFeedback.loteItem.lote}
              </span>
            </div>

            <div className="bg-white rounded-xl p-3 border border-amber-200 text-xs text-slate-800 space-y-1.5">
              <p className="text-amber-900 font-medium">
                {searchFeedback.message}
              </p>
              <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                <span>Peneira: <strong>{searchFeedback.loteItem.peneira}</strong></span>
                <span>Peso: <strong>{searchFeedback.loteItem.peso} kg</strong></span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleUncheckLot(searchFeedback.loteItem!.lote)}
              className="text-xs bg-white hover:bg-amber-100 text-amber-900 font-bold py-2 px-3 rounded-xl border border-amber-300 flex items-center justify-center gap-1.5 w-full"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Desfazer conferência (marcar como pendente)
            </button>
          </div>
        )}

        {searchFeedback.status === 'lote_nao_encontrado' && (
          <div className="bg-red-600 text-white rounded-2xl p-4 space-y-2.5 shadow-lg animate-bounce duration-300">
            <div className="flex items-center gap-2 font-black text-sm sm:text-base">
              <AlertOctagon className="w-6 h-6 flex-shrink-0" />
              <span>⚠️ LOTE NÃO PERTENCE A ESTA EXPEDIÇÃO</span>
            </div>
            <div className="bg-red-700/80 rounded-xl p-3 text-xs space-y-1 text-red-50">
              <div>Código lido: <strong className="font-mono text-white text-sm">"{searchFeedback.divergenceCode || lotInput}"</strong></div>
              <div>Status: <strong className="text-red-200">LOTE NÃO ENCONTRADO NA CARGA</strong></div>
              <p className="text-[11px] text-red-200 pt-1">
                Registrado automaticamente na lista de divergências da expedição #{expedition.numero}.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* FILTER TABS & SEARCH */}
      <div className="space-y-2">
        <div className="flex bg-slate-200 p-1 rounded-xl text-xs font-bold gap-1 overflow-x-auto">
          <button
            onClick={() => setFilterMode('pendentes')}
            className={`py-2 px-3 rounded-lg text-center transition-all whitespace-nowrap ${
              filterMode === 'pendentes'
                ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            🟡 Pendentes ({totalPendentes})
          </button>

          <button
            onClick={() => setFilterMode('conferidos')}
            className={`py-2 px-3 rounded-lg text-center transition-all whitespace-nowrap ${
              filterMode === 'conferidos'
                ? 'bg-emerald-600 text-white font-black shadow-sm'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            🟢 Conferidos ({totalConferidos})
          </button>

          <button
            onClick={() => setFilterMode('divergencias')}
            className={`py-2 px-3 rounded-lg text-center transition-all whitespace-nowrap ${
              filterMode === 'divergencias'
                ? 'bg-red-600 text-white font-black shadow-sm'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            🔴 Divergências ({totalDivergencias})
          </button>

          <button
            onClick={() => setFilterMode('todos')}
            className={`py-2 px-3 rounded-lg text-center transition-all whitespace-nowrap ${
              filterMode === 'todos'
                ? 'bg-slate-900 text-white font-black shadow-sm'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            Todos ({totalLotes})
          </button>
        </div>

        {filterMode !== 'divergencias' && (
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Filtrar por lote, peneira, cultura, cultivar..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800"
            />
          </div>
        )}
      </div>

      {/* DIVERGÊNCIAS VIEW */}
      {filterMode === 'divergencias' && (
        <div className="space-y-2">
          {divergencias.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-slate-400 border border-slate-200">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
              <div className="font-bold text-slate-800">Nenhuma divergência registrada</div>
              <p className="text-xs text-slate-500">Todos os códigos lidos até o momento pertencem à carga desta expedição.</p>
            </div>
          ) : (
            <div className="space-y-2">
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

              {divergencias.map((divItem) => (
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
          )}
        </div>
      )}

      {/* LOTS LIST: Hand-friendly Cards for Mobile Operation */}
      {filterMode !== 'divergencias' && (
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {displayedLotes.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-slate-400 border border-slate-200">
              {filterMode === 'pendentes' && totalPendentes === 0 ? (
                <div className="space-y-1">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <div className="font-bold text-slate-800">Nenhum lote pendente!</div>
                  <div className="text-xs">Todos os {totalLotes} lotes já foram conferidos com sucesso.</div>
                </div>
              ) : (
                <div>Nenhum lote encontrado com os filtros atuais.</div>
              )}
            </div>
          ) : (
            displayedLotes.map((item, idx) => {
              const isChecked = Boolean(item.conferido);
              return (
                <div
                  key={`${item.lote}-${idx}`}
                  className={`border-2 rounded-2xl p-3 sm:p-3.5 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm ${
                    isChecked
                      ? 'bg-emerald-50/70 border-emerald-400/80 text-emerald-950'
                      : 'bg-white border-slate-200 hover:border-slate-400 text-slate-900'
                  }`}
                >
                  {/* Lote Info Section */}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-base sm:text-lg tracking-tight">
                        {item.lote}
                      </span>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                          isChecked
                            ? 'bg-emerald-200 text-emerald-900'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}
                      >
                        {isChecked ? '🟢 CONFERIDO' : '🟡 PENDENTE'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      <span className="bg-slate-100 px-2 py-0.5 rounded font-medium">
                        Peneira: <strong className="text-slate-900">{item.peneira}</strong>
                      </span>
                      <span className="bg-slate-100 px-2 py-0.5 rounded font-medium">
                        Cat: <strong className="text-slate-900">{item.categoria}</strong>
                      </span>
                      <span className="bg-slate-100 px-2 py-0.5 rounded font-mono font-bold text-slate-900">
                        {item.peso.toLocaleString('pt-BR')} kg
                      </span>
                      {item.cultura && (
                        <span className="bg-slate-100 px-2 py-0.5 rounded font-medium text-slate-800">
                          {item.cultura}
                        </span>
                      )}
                      {item.cultivar && (
                        <span className="bg-slate-100 px-2 py-0.5 rounded font-medium text-slate-800">
                          {item.cultivar}
                        </span>
                      )}
                    </div>

                    {isChecked && item.conferidoEm && (
                      <div className="text-[11px] text-emerald-700 flex items-center gap-1 font-medium pt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>
                          Conferido às {new Date(item.conferidoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} por {item.conferidoPor || 'Operador'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Big Action Button for One-Hand Operation */}
                  <div className="w-full sm:w-auto flex-shrink-0">
                    {isChecked ? (
                      <button
                        type="button"
                        onClick={() => handleUncheckLot(item.lote)}
                        className="w-full sm:w-auto bg-white hover:bg-red-50 text-slate-700 hover:text-red-700 font-bold text-xs py-2.5 px-4 rounded-xl border border-slate-300 flex items-center justify-center gap-1.5 transition-colors"
                        id={`btn-desfazer-${item.lote}`}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Desfazer
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => executeCheckLot(item.lote)}
                        className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-sm py-3 px-6 rounded-xl shadow-md flex items-center justify-center gap-2 transition-transform active:scale-95"
                        id={`btn-conferir-${item.lote}`}
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        CONFERIR
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
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
