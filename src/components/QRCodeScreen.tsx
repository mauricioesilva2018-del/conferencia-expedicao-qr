import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Expedicao, ActiveScreen } from '../types';
import { encodeExpeditionToQR, CompressionStats } from '../utils/compression';
import { 
  QrCode, 
  Maximize2, 
  Printer, 
  Download, 
  Share2, 
  CheckCircle2, 
  ArrowLeft, 
  Truck, 
  Calendar, 
  Weight, 
  Boxes, 
  ShieldCheck, 
  AlertTriangle,
  RefreshCw,
  X,
  FileCheck2,
  Copy,
  Check
} from 'lucide-react';

interface QRCodeScreenProps {
  expedition: Expedicao;
  onNavigate: (screen: ActiveScreen) => void;
  onStartConference: (exp: Expedicao) => void;
  onPrintExpedition: (exp: Expedicao) => void;
}

export const QRCodeScreen: React.FC<QRCodeScreenProps> = ({
  expedition,
  onNavigate,
  onStartConference,
  onPrintExpedition,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [qrPayload, setQrPayload] = useState<string>('');
  const [stats, setStats] = useState<CompressionStats | null>(null);
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const totalPeso = expedition.lotes.reduce((acc, l) => acc + (Number(l.peso) || 0), 0);
  const totalLotes = expedition.lotes.length;

  const generateQRCode = () => {
    setGenerating(true);
    try {
      const { payload, stats: compressionStats } = encodeExpeditionToQR(expedition);
      setQrPayload(payload);
      setStats(compressionStats);

      if (canvasRef.current) {
        QRCode.toCanvas(canvasRef.current, payload, {
          width: 360,
          margin: 2,
          errorCorrectionLevel: 'L',
          color: {
            dark: '#020617', // Slate 950
            light: '#ffffff',
          },
        }, (error) => {
          if (error) console.error('QR generation error:', error);
          setGenerating(false);
        });
      }
    } catch (err) {
      console.error('Error generating QR payload:', err);
      setGenerating(false);
    }
  };

  useEffect(() => {
    generateQRCode();
  }, [expedition]);

  const handleDownloadImage = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `QR_Expedicao_${expedition.numero}_${expedition.data}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const handleShare = async () => {
    if (navigator.share && canvasRef.current) {
      try {
        canvasRef.current.toBlob(async (blob) => {
          if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], 'qrcode.png', { type: 'image/png' })] })) {
            const file = new File([blob], `QR_Expedicao_${expedition.numero}.png`, { type: 'image/png' });
            await navigator.share({
              title: `QR Code Expedição #${expedition.numero}`,
              text: `Expedição #${expedition.numero} - ${expedition.clienteDestino} (${totalLotes} lotes, ${totalPeso.toLocaleString('pt-BR')} kg)`,
              files: [file],
            });
          } else {
            await navigator.share({
              title: `QR Code Expedição #${expedition.numero}`,
              text: `Código de Carga da Expedição #${expedition.numero}: ${qrPayload.substring(0, 100)}...`,
            });
          }
        });
      } catch (e) {
        console.warn('Share error or cancelled:', e);
      }
    } else {
      // Fallback copy payload
      navigator.clipboard.writeText(qrPayload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="p-3 sm:p-6 max-w-2xl mx-auto space-y-4 pb-16">
      {/* Top Header Card */}
      <div className="text-center space-y-1">
        <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full uppercase tracking-wider">
          TELA 2 — CÓDIGO ÚNICO DE CARGA
        </span>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          QR CODE DA EXPEDIÇÃO
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 font-medium">
          Contém a lista integral de {totalLotes} lotes comprimidos em um único código
        </p>
      </div>

      {/* QR Code Presentation Box */}
      <div className="bg-white border-2 border-slate-900 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col items-center justify-center relative">
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-inner flex items-center justify-center">
          <canvas ref={canvasRef} className="max-w-full h-auto rounded-lg shadow-sm" />
        </div>

        {/* Compression Badge */}
        {stats && (
          <div className="mt-4 w-full bg-slate-50 rounded-xl p-3 border border-slate-200 text-center space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Compressão Inteligente Deflate: {stats.ratioPercent}% menor</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono flex justify-center gap-3">
              <span>Original: {(stats.originalBytes / 1024).toFixed(1)} KB</span>
              <span>➔</span>
              <span className="text-emerald-700 font-bold">QR Payload: {(stats.compressedBytes / 1024).toFixed(1)} KB</span>
            </div>
            {!stats.isSafeSize && (
              <div className="mt-2 text-xs font-bold text-amber-800 bg-amber-100 p-2 rounded-lg flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0" />
                <span>Atenção: Volume de dados elevado. Recomendado imprimir ou abrir no modo zoom para leitura ideal.</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Details Box below QR Code (As explicitly requested in Tela 2) */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
          Resumo da Expedição Cadastrada
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
            <span className="text-[11px] text-slate-400 block">Número da Expedição:</span>
            <span className="font-black text-emerald-400 text-base font-mono">#{expedition.numero}</span>
          </div>

          <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
            <span className="text-[11px] text-slate-400 block">Quantidade de Lotes:</span>
            <span className="font-black text-white text-base font-mono">{totalLotes} lotes</span>
          </div>

          <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
            <span className="text-[11px] text-slate-400 block">Peso Total:</span>
            <span className="font-black text-white text-base font-mono">{totalPeso.toLocaleString('pt-BR')} kg</span>
          </div>

          <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
            <span className="text-[11px] text-slate-400 block">Data da Expedição:</span>
            <span className="font-semibold text-slate-200 font-mono">{expedition.data}</span>
          </div>
        </div>

        <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-xs space-y-1">
          <div className="text-slate-400">Destino: <span className="text-white font-bold">{expedition.clienteDestino || 'N/D'}</span></div>
          <div className="text-slate-400">Caminhão: <span className="text-white font-semibold">{expedition.caminhao || 'N/D'}</span></div>
          <div className="text-slate-400">Motorista: <span className="text-white font-semibold">{expedition.motorista || 'N/D'}</span></div>
        </div>
      </div>

      {/* 5 Requested Action Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {/* Gerar QR Code (Regerar) */}
        <button
          onClick={generateQRCode}
          className="bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-300 text-slate-800 font-bold py-3 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm"
          id="btn-regerar-qr"
        >
          <RefreshCw className={`w-4 h-4 text-emerald-600 ${generating ? 'animate-spin' : ''}`} />
          Gerar QR Code
        </button>

        {/* Aumentar QR Code */}
        <button
          onClick={() => setIsZoomModalOpen(true)}
          className="bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-300 text-slate-800 font-bold py-3 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm"
          id="btn-aumentar-qr"
        >
          <Maximize2 className="w-4 h-4 text-emerald-600" />
          Aumentar QR Code
        </button>

        {/* Imprimir */}
        <button
          onClick={() => onPrintExpedition(expedition)}
          className="bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-300 text-slate-800 font-bold py-3 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm"
          id="btn-imprimir-qr"
        >
          <Printer className="w-4 h-4 text-blue-600" />
          Imprimir
        </button>

        {/* Salvar Imagem */}
        <button
          onClick={handleDownloadImage}
          className="bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-300 text-slate-800 font-bold py-3 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm"
          id="btn-salvar-imagem-qr"
        >
          <Download className="w-4 h-4 text-purple-600" />
          Salvar Imagem
        </button>

        {/* Compartilhar */}
        <button
          onClick={handleShare}
          className="col-span-2 sm:col-span-2 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-300 text-slate-800 font-bold py-3 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm"
          id="btn-compartilhar-qr"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4 text-amber-600" />}
          {copied ? 'Código Copiado!' : 'Compartilhar'}
        </button>
      </div>

      {/* Main Bottom Primary CTA: Start Conference */}
      <div className="pt-2">
        <button
          onClick={() => onStartConference(expedition)}
          className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-base py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
          id="btn-iniciar-conferencia-deste-qr"
        >
          <CheckCircle2 className="w-6 h-6" />
          INICIAR CONFERÊNCIA NESTE CELULAR
        </button>
      </div>

      {/* Fullscreen Zoom Modal */}
      {isZoomModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 flex flex-col items-center relative shadow-2xl">
            <button
              onClick={() => setIsZoomModalOpen(false)}
              className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-center mb-4">
              <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-3 py-0.5 rounded-full">
                MODO SCAN DE ALTO BRILHO
              </span>
              <h3 className="text-xl font-black text-slate-900 mt-1">
                Expedição #{expedition.numero}
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {totalLotes} lotes | {totalPeso.toLocaleString('pt-BR')} kg
              </p>
            </div>

            {/* High-res canvas copy */}
            <div className="bg-white p-4 rounded-2xl border-4 border-slate-900 shadow-2xl flex items-center justify-center">
              <canvas
                ref={(zoomCanvas) => {
                  if (zoomCanvas && qrPayload) {
                    QRCode.toCanvas(zoomCanvas, qrPayload, {
                      width: 380,
                      margin: 1,
                      errorCorrectionLevel: 'L',
                    });
                  }
                }}
                className="max-w-full h-auto"
              />
            </div>

            <p className="text-xs text-slate-500 mt-4 text-center">
              Aponte a câmera do celular do conferente para escanear a carga integralmente.
            </p>

            <button
              onClick={() => setIsZoomModalOpen(false)}
              className="mt-4 w-full bg-slate-900 text-white font-bold py-3 rounded-xl text-sm"
            >
              Fechar Modo Zoom
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
