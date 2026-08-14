import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import jsQR from 'jsqr';
import { Expedicao } from '../types';
import { decodeQRToExpedition } from '../utils/compression';
import { playSuccessSound, playErrorSound, triggerHaptic } from '../utils/audio';
import { 
  Camera, 
  X, 
  Upload, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  RefreshCw,
  Flashlight
} from 'lucide-react';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExpeditionScanned: (exp: Expedicao) => void;
  soundEnabled: boolean;
  hapticEnabled: boolean;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onExpeditionScanned,
  soundEnabled,
  hapticEnabled,
}) => {
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoElementId = 'qr-reader-container';

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    setErrorMsg('');
    startScanner();

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const startScanner = async () => {
    try {
      setIsScanning(true);
      setErrorMsg('');

      // Wait a tick for DOM element
      await new Promise(r => setTimeout(r, 150));

      const html5QrCode = new Html5Qrcode(videoElementId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' }, // Back camera on mobile
        {
          fps: 15,
          qrbox: { width: 280, height: 280 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleSuccessfulScan(decodedText);
        },
        (errorMessage) => {
          // Frame decode error (benign while scanning)
        }
      );
    } catch (err: any) {
      console.warn('Camera start error:', err);
      setCameraPermissionGranted(false);
      setErrorMsg(
        'Não foi possível acessar a câmera. Você pode escolher uma imagem/foto do QR Code ou autorizar a permissão de câmera nas configurações do navegador.'
      );
      setIsScanning(false);
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
        console.warn('Error stopping scanner:', e);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleSuccessfulScan = (rawPayload: string) => {
    try {
      const decodedExp = decodeQRToExpedition(rawPayload);
      playSuccessSound(soundEnabled);
      triggerHaptic('success', hapticEnabled);
      stopScanner();
      onExpeditionScanned(decodedExp);
      onClose();
    } catch (err: any) {
      playErrorSound(soundEnabled);
      triggerHaptic('error', hapticEnabled);
      setErrorMsg(err.message || 'QR Code inválido ou não reconhecido como expedição.');
    }
  };

  // Fallback: Read QR Code from image file via jsQR / Html5Qrcode
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const image = new Image();
        image.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = image.width;
          canvas.height = image.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.drawImage(image, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);

          if (code && code.data) {
            handleSuccessfulScan(code.data);
          } else {
            // Try html5-qrcode scanFile
            if (scannerRef.current) {
              scannerRef.current.scanFile(file, true)
                .then(decodedText => handleSuccessfulScan(decodedText))
                .catch(() => setErrorMsg('Nenhum QR Code legível foi detectado na imagem selecionada.'));
            } else {
              setErrorMsg('Nenhum QR Code legível foi detectado na imagem selecionada.');
            }
          }
        };
        image.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setErrorMsg(`Erro ao ler imagem: ${err.message || err}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-sm sm:text-base">
            <Camera className="w-5 h-5 text-emerald-400" />
            <span>Escanear QR Code da Expedição</span>
          </div>
          <button
            onClick={() => { stopScanner(); onClose(); }}
            className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder Section */}
        <div className="p-4 flex-1 flex flex-col items-center justify-center space-y-4">
          <div className="relative w-full max-w-[300px] aspect-square rounded-2xl overflow-hidden bg-black border-2 border-emerald-500 shadow-inner flex items-center justify-center">
            <div id={videoElementId} className="w-full h-full" />
            
            {/* Viewfinder Target Graphic Overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-48 h-48 border-2 border-emerald-400/80 rounded-xl relative animate-pulse">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-400 -mt-1 -ml-1 rounded-tl" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-400 -mt-1 -mr-1 rounded-tr" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-400 -mb-1 -ml-1 rounded-bl" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-400 -mb-1 -mr-1 rounded-br" />
              </div>
            </div>
          </div>

          {/* Feedback error */}
          {errorMsg && (
            <div className="w-full bg-red-950/80 border border-red-500/50 rounded-xl p-3 text-red-200 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <p className="text-xs text-slate-400 text-center font-medium">
            Posicione o QR Code impresso ou da tela dentro do enquadramento. A decodificação e carga ocorrem de forma 100% offline.
          </p>
        </div>

        {/* Footer Actions: File fallback */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
            id="btn-upload-foto-qr"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            Carregar Foto / Arquivo
          </button>

          <button
            type="button"
            onClick={() => { stopScanner(); startScanner(); }}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
            title="Reiniciar Câmera"
          >
            <RefreshCw className="w-4 h-4 text-emerald-400" />
          </button>
        </div>
      </div>
    </div>
  );
};
