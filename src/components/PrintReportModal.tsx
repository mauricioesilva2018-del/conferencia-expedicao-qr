import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Expedicao } from '../types';
import { encodeExpeditionToQR } from '../utils/compression';
import { 
  Printer, 
  X, 
  Truck, 
  CheckCircle2, 
  ShieldCheck, 
  Calendar, 
  User 
} from 'lucide-react';

interface PrintReportModalProps {
  expedition: Expedicao;
  type: 'qr_manifest' | 'release_term';
  onClose: () => void;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  expedition,
  type,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const totalLotes = expedition.lotes.length;
  const conferidos = expedition.lotes.filter(l => l.conferido);
  const totalConferidos = conferidos.length;
  const totalPeso = expedition.lotes.reduce((acc, l) => acc + (Number(l.peso) || 0), 0);
  const pesoConferido = conferidos.reduce((acc, l) => acc + (Number(l.peso) || 0), 0);

  useEffect(() => {
    if (type === 'qr_manifest' && canvasRef.current) {
      try {
        const { payload } = encodeExpeditionToQR(expedition);
        QRCode.toCanvas(canvasRef.current, payload, {
          width: 320,
          margin: 1,
          errorCorrectionLevel: 'L',
        });
      } catch (e) {
        console.error('Print QR error:', e);
      }
    }
  }, [expedition, type]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[95vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Modal Top Nav (hidden on print) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm">
              {type === 'qr_manifest' ? 'Guia de Expedição & QR Code' : 'Termo de Liberação de Expedição'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black py-2 px-4 rounded-xl flex items-center gap-1.5 shadow"
            >
              <Printer className="w-4 h-4" />
              IMPRIMIR / SALVAR PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Sheet */}
        <div className="p-6 sm:p-8 space-y-6 text-slate-900 text-sm font-sans bg-white print:p-0">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
            <div>
              <div className="text-xl font-black tracking-tight text-slate-900 uppercase">
                CONFERÊNCIA EXPEDIÇÃO QR
              </div>
              <div className="text-xs text-slate-600 font-medium">
                Controle de Lotes de Sementes e Carregamento
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-base font-black text-slate-900">
                EXPEDIÇÃO #{expedition.numero}
              </div>
              <div className="text-xs text-slate-500 font-mono">
                Data: {expedition.data}
              </div>
            </div>
          </div>

          {/* Type 1: QR Manifest */}
          {type === 'qr_manifest' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-center gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <div className="bg-white p-2 border-2 border-slate-900 rounded-2xl shadow-sm">
                  <canvas ref={canvasRef} className="max-w-[240px] h-auto" />
                </div>
                <div className="space-y-2 text-xs flex-1">
                  <div className="text-sm font-black text-slate-900">
                    QR CODE ÚNICO DA CARGA
                  </div>
                  <p className="text-slate-600">
                    Este QR Code contém a lista integral compactada de <strong>{totalLotes} lotes</strong> da expedição #{expedition.numero}.
                  </p>
                  <div className="space-y-1 pt-1 font-medium">
                    <div><strong>Destino:</strong> {expedition.clienteDestino || 'N/D'}</div>
                    <div><strong>Caminhão:</strong> {expedition.caminhao || 'N/D'}</div>
                    <div><strong>Motorista:</strong> {expedition.motorista || 'N/D'}</div>
                    <div><strong>Responsável:</strong> {expedition.responsavel || 'N/D'}</div>
                    <div><strong>Peso Total:</strong> {totalPeso.toLocaleString('pt-BR')} kg</div>
                  </div>
                </div>
              </div>

              {/* Sample list overview */}
              <div className="space-y-2">
                <div className="font-black text-xs uppercase tracking-wider text-slate-700">
                  Resumo dos Lotes Cadastrados ({totalLotes} Itens)
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2">#</th>
                        <th className="p-2">Lote</th>
                        <th className="p-2">Cultura / Cultivar</th>
                        <th className="p-2">Peneira</th>
                        <th className="p-2">Cat.</th>
                        <th className="p-2 text-right">Peso (kg)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {expedition.lotes.slice(0, 15).map((l, i) => (
                        <tr key={i}>
                          <td className="p-2 text-slate-400 font-mono">{i + 1}</td>
                          <td className="p-2 font-bold font-mono">{l.lote}</td>
                          <td className="p-2">{l.cultura || ''} {l.cultivar ? `(${l.cultivar})` : ''}</td>
                          <td className="p-2">{l.peneira}</td>
                          <td className="p-2">{l.categoria}</td>
                          <td className="p-2 text-right font-mono">{l.peso} kg</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {totalLotes > 15 && (
                    <div className="p-2 bg-slate-50 text-center text-xs text-slate-500 font-medium italic border-t border-slate-200">
                      ... e mais {totalLotes - 15} lotes embutidos no QR Code acima.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Type 2: Release Term */}
          {type === 'release_term' && (
            <div className="space-y-6">
              <div className="bg-emerald-50 border-2 border-emerald-600 rounded-2xl p-4 text-center space-y-1">
                <div className="font-black text-emerald-900 text-base">
                  🟢 TERMO DE LIBERAÇÃO DE EXPEDIÇÃO & CARREGAMENTO
                </div>
                <p className="text-xs text-emerald-800 font-medium">
                  Certificamos que 100% dos lotes relacionados foram conferidos fisicamente e aprovados para carregamento.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                  <div><strong>Expedição:</strong> #{expedition.numero}</div>
                  <div><strong>Destino:</strong> {expedition.clienteDestino}</div>
                  <div><strong>Caminhão:</strong> {expedition.caminhao}</div>
                  <div><strong>Motorista:</strong> {expedition.motorista}</div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                  <div><strong>Total de Lotes:</strong> {totalLotes} lotes (100% conferidos)</div>
                  <div><strong>Peso Total:</strong> {totalPeso.toLocaleString('pt-BR')} kg</div>
                  <div><strong>Data de Liberação:</strong> {expedition.finalizadaEm ? new Date(expedition.finalizadaEm).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR')}</div>
                  <div><strong>Conferente:</strong> {expedition.finalizadaPor || expedition.responsavel}</div>
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-12 grid grid-cols-2 gap-8 text-center text-xs">
                <div className="border-t border-slate-400 pt-2">
                  <div className="font-bold">{expedition.finalizadaPor || expedition.responsavel || 'Conferente de Expedição'}</div>
                  <div className="text-slate-500">Responsável pela Conferência</div>
                </div>
                <div className="border-t border-slate-400 pt-2">
                  <div className="font-bold">{expedition.motorista || 'Motorista do Veículo'}</div>
                  <div className="text-slate-500">Motorista / Transportador</div>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-slate-200 pt-3 flex justify-between text-[10px] text-slate-400 font-mono">
            <span>Sistema Conferência Expedição QR - Operação 100% Offline</span>
            <span>Emitido em {new Date().toLocaleString('pt-BR')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
