import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Expedicao, LoteItem, DivergenciaItem } from '../types';
import { decodeScannedCode } from '../utils/compression';
import { playSuccessSound, playErrorSound, playWarningSound, triggerHaptic } from '../utils/audio';
import { 
  Camera, 
  X, 
  AlertOctagon, 
  CheckCircle2, 
  Check, 
  RefreshCw,
  AlertTriangle,
  Zap,
  Tag
} from 'lucide-react';

interface BatchBarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  expedition: Expedicao | null;
  operatorName: string;
  soundEnabled: boolean;
  hapticEnabled: boolean;
  onUpdateExpedition: (exp: Expedicao) => void;
}

export const BatchBarcodeScannerModal: React.FC<BatchBarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  expedition,
  operatorName,
  soundEnabled,
  hapticEnabled,
  onUpdateExpedition,
}) => {
  const [lastScanResult, setLastScanResult] = useState<{
    status: 'lote_conferido' | 'lote_ja_conferido' | 'lote_nao_encontrado';
    code: string;
    item?: LoteItem;
    message?: string;
  } | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const videoElementId = 'batch-scanner-container';

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      setLastScanResult(null);
      return;
    }

    startScanner();

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const handleProcessScan = (rawText: string) => {
    if (!expedition || isProcessing) return;

    setIsProcessing(true);
    const clean = rawText.trim();
    const decoded = decodeScannedCode(clean);

    let targetLotCode = clean.toUpperCase();
    let decodedExtra: Partial<LoteItem> = {};

    if (decoded.type === 'lot') {
      targetLotCode = decoded.lot.lote.toUpperCase();
      decodedExtra = decoded.lot;
    } else if (decoded.type === 'raw_code') {
      targetLotCode = decoded.code.toUpperCase();
    }

    const matched = expedition.lotes.find(l => l.lote.toUpperCase() === targetLotCode);

    if (matched) {
      if (matched.conferido) {
        // LOTE JÁ CONFERIDO
        playWarningSound(soundEnabled);
        triggerHaptic('warning', hapticEnabled);
        setLastScanResult({
          status: 'lote_ja_conferido',
          code: targetLotCode,
          item: matched,
          message: `Lote ${matched.lote} já foi conferido anteriormente.`,
        });
      } else {
        // LOTE CONFERIDO -> Update immediately
        const now = new Date().toISOString();
        const currentOp = operatorName || 'Operador Armazém';

        let checkedItem: LoteItem | undefined;
        const updatedLotes = expedition.lotes.map(l => {
          if (l.lote.toUpperCase() === targetLotCode) {
            checkedItem = {
              ...l,
              cultura: l.cultura || decodedExtra.cultura,
              cultivar: l.cultivar || decodedExtra.cultivar,
              peneira: l.peneira || decodedExtra.peneira || '',
              categoria: l.categoria || decodedExtra.categoria || '',
              peso: l.peso || decodedExtra.peso || 0,
              conferido: true,
              conferidoEm: now,
              conferidoPor: currentOp,
            };
            return checkedItem;
          }
          return l;
        });

        const updatedExp: Expedicao = {
          ...expedition,
          status: 'em_conferencia',
          lotes: updatedLotes,
          atualizadoEm: now,
        };

        onUpdateExpedition(updatedExp);
        playSuccessSound(soundEnabled);
        triggerHaptic('success', hapticEnabled);

        setLastScanResult({
          status: 'lote_conferido',
          code: targetLotCode,
          item: checkedItem,
          message: `Lote ${targetLotCode} conferido com sucesso!`,
        });
      }
    } else {
      // LOTE NÃO PERTENCE A ESTA EXPEDIÇÃO / NÃO ENCONTRADO
      const newDivergence: DivergenciaItem = {
        id: `div-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        loteLido: targetLotCode,
        dataHora: new Date().toISOString(),
        operador: operatorName || 'Operador Armazém',
        motivo: 'Lote não pertence a esta expedição',
        cultura: decodedExtra.cultura,
        cultivar: decodedExtra.cultivar,
        peneira: decodedExtra.peneira,
        categoria: decodedExtra.categoria,
        peso: decodedExtra.peso,
      };

      const updatedExp: Expedicao = {
        ...expedition,
        divergencias: [newDivergence, ...(expedition.divergencias || [])],
        atualizadoEm: new Date().toISOString(),
      };

      onUpdateExpedition(updatedExp);
      playErrorSound(soundEnabled);
      triggerHaptic('error', hapticEnabled);

      setLastScanResult({
        status: 'lote_nao_encontrado',
        code: targetLotCode,
        message: '⚠️ LOTE NÃO PERTENCE A ESTA EXPEDIÇÃO',
      });
    }

    // Cooldown before scanning next item
    setTimeout(() => {
      setIsProcessing(false);
    }, 1500);
  };

  const startScanner = async () => {
    try {
      await new Promise(r => setTimeout(r, 150));

      const html5QrCode = new Html5Qrcode(videoElementId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.ITF,
        ],
        verbose: false,
      });
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 20,
          qrbox: { width: 280, height: 200 },
          aspectRatio: 1.33,
        },
        (decodedText) => {
          handleProcessScan(decodedText);
        },
        () => {}
      );
    } catch (err) {
      console.warn('Barcode camera error:', err);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (e) {
        console.warn('Error stopping barcode scanner:', e);
      }
      scannerRef.current = null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Camera className="w-5 h-5 text-emerald-400" />
            <span>Câmera de Leitura Rápida</span>
          </div>
          <button
            onClick={() => { stopScanner(); onClose(); }}
            className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex-1 flex flex-col items-center justify-center space-y-3 overflow-y-auto">
          <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-black border-2 border-emerald-500 shadow-inner flex items-center justify-center">
            <div id={videoElementId} className="w-full h-full" />
            
            {/* Viewfinder Target */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-64 h-32 border-2 border-emerald-400/90 rounded-xl relative flex items-center justify-center">
                <div className="w-full h-0.5 bg-red-500 shadow-sm animate-pulse" />
              </div>
            </div>
          </div>

          {/* Real-time Feedback directly inside camera view */}
          {lastScanResult && (
            <div className="w-full animate-in fade-in zoom-in-95 duration-150">
              {lastScanResult.status === 'lote_conferido' && lastScanResult.item && (
                <div className="bg-emerald-950 border-2 border-emerald-500 rounded-2xl p-3.5 text-white space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500 text-slate-950 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      LOTE CONFERIDO
                    </span>
                    <span className="font-mono font-black text-emerald-300 text-base">
                      {lastScanResult.item.lote}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-300 bg-slate-900/80 p-2 rounded-xl">
                    <div>Peneira: <strong className="text-white">{lastScanResult.item.peneira}</strong></div>
                    <div>Cat: <strong className="text-white">{lastScanResult.item.categoria}</strong></div>
                    <div>Peso: <strong className="text-white">{lastScanResult.item.peso} kg</strong></div>
                    <div>Cultura: <strong className="text-white">{lastScanResult.item.cultura || 'N/D'}</strong></div>
                  </div>
                  {lastScanResult.item.cultivar && (
                    <div className="text-[11px] text-emerald-200">
                      Cultivar: <strong>{lastScanResult.item.cultivar}</strong>
                    </div>
                  )}
                </div>
              )}

              {lastScanResult.status === 'lote_ja_conferido' && (
                <div className="bg-amber-950 border-2 border-amber-500 rounded-2xl p-3.5 text-white space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-400 text-slate-950 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      LOTE JÁ CONFERIDO
                    </span>
                    <span className="font-mono font-black text-amber-300 text-base">
                      {lastScanResult.code}
                    </span>
                  </div>
                  <p className="text-xs text-amber-200">{lastScanResult.message}</p>
                </div>
              )}

              {lastScanResult.status === 'lote_nao_encontrado' && (
                <div className="bg-red-950 border-2 border-red-500 rounded-2xl p-3.5 text-white space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-red-600 text-white flex items-center gap-1">
                      <AlertOctagon className="w-3.5 h-3.5" />
                      LOTE NÃO ENCONTRADO
                    </span>
                    <span className="font-mono font-black text-red-300 text-base">
                      {lastScanResult.code}
                    </span>
                  </div>
                  <p className="text-xs text-red-200 font-bold">⚠️ LOTE NÃO PERTENCE A ESTA EXPEDIÇÃO</p>
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-slate-400 text-center font-medium">
            Aponte a câmera para o QR Code ou Código de Barras do lote para conferência instantânea.
          </p>
        </div>

        <div className="p-4 bg-slate-950 border-t border-slate-800">
          <button
            type="button"
            onClick={() => { stopScanner(); onClose(); }}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 px-4 rounded-xl text-xs"
          >
            CONCLUIR LEITURA E VOLTAR À CONFERÊNCIA
          </button>
        </div>
      </div>
    </div>
  );
};
