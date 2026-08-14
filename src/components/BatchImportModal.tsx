import React, { useState, useRef } from 'react';
import { LoteItem, ImportValidationResult, Expedicao } from '../types';
import { validateAndParseLots } from '../utils/importer';
import { INITIAL_RAW_LOTS_DATA } from '../data/initialLots';
import { 
  FileSpreadsheet, 
  Upload, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Copy, 
  ArrowRight,
  Database,
  Trash2
} from 'lucide-react';

interface BatchImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (lotes: LoteItem[], mode: 'replace' | 'append') => void;
}

export const BatchImportModal: React.FC<BatchImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const [tab, setTab] = useState<'file' | 'text'>('file');
  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState('');
  const [validationResult, setValidationResult] = useState<ImportValidationResult | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        const result = validateAndParseLots(text);
        setValidationResult(result);
      };
      reader.readAsText(file, 'ISO-8859-1'); // Handles PT-BR accents properly
    } else {
      // Excel (.xlsx, .xls)
      reader.onload = (evt) => {
        const buffer = evt.target?.result as ArrayBuffer;
        const result = validateAndParseLots(buffer);
        setValidationResult(result);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleProcessText = () => {
    if (!rawText.trim()) return;
    const result = validateAndParseLots(rawText);
    setValidationResult(result);
  };

  const handleLoadSample344Lots = () => {
    setRawText(INITIAL_RAW_LOTS_DATA);
    const result = validateAndParseLots(INITIAL_RAW_LOTS_DATA);
    setValidationResult(result);
    setTab('text');
  };

  const handleConfirmImport = () => {
    if (!validationResult || validationResult.lotesValidos.length === 0) return;
    onImportComplete(validationResult.lotesValidos, importMode);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
            <div>
              <h3 className="text-base sm:text-lg font-black leading-tight">
                Importação de Lotes de Sementes
              </h3>
              <p className="text-xs text-slate-400">
                Aceita arquivos Excel (.xlsx, .xls), CSV ou texto copiado
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="p-4 bg-slate-100 border-b border-slate-200 flex gap-2">
          <button
            onClick={() => setTab('file')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
              tab === 'file'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            Arquivo Excel / CSV
          </button>

          <button
            onClick={() => setTab('text')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
              tab === 'text'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            Colar Texto / Tabela
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {tab === 'file' ? (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/50 rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all space-y-3"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <span className="font-bold text-slate-800 text-sm block">
                    {fileName ? fileName : 'Clique ou arraste a planilha aqui'}
                  </span>
                  <span className="text-xs text-slate-500">
                    Formatos suportados: .xlsx, .xls, .csv, .txt
                  </span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv, .txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleLoadSample344Lots}
                  className="text-xs text-emerald-700 hover:text-emerald-800 font-bold underline"
                >
                  Carregar base completa fornecida (344 lotes padrão)
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  Cole os dados no formato: Lote | Peneira | Categoria | Peso
                </label>
                <button
                  type="button"
                  onClick={handleLoadSample344Lots}
                  className="text-xs text-emerald-700 font-bold hover:underline"
                >
                  Colar 344 lotes padrão
                </button>
              </div>

              <textarea
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                placeholder="1MG1260001 | 5,75 mm | S1 | 843&#10;2MG1260002 | 6,75 mm | S1 | 1057"
                rows={6}
                className="w-full font-mono text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />

              <button
                type="button"
                onClick={handleProcessText}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs"
              >
                Processar e Validar Dados
              </button>
            </div>
          )}

          {/* Validation Diagnostics Output Box (As requested in prompt) */}
          {validationResult && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Resultado da Validação de Importação
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="bg-emerald-100/70 text-emerald-900 p-2.5 rounded-xl font-bold border border-emerald-300">
                  <span className="block text-[10px] text-emerald-700 uppercase">Lotes Válidos</span>
                  <span className="text-lg font-mono font-black">{validationResult.totalImportados}</span>
                </div>

                <div className={`p-2.5 rounded-xl font-bold border ${validationResult.erros.length > 0 ? 'bg-red-100 text-red-900 border-red-300' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                  <span className="block text-[10px] uppercase">Lotes com Erro</span>
                  <span className="text-lg font-mono font-black">{validationResult.erros.length}</span>
                </div>

                <div className={`p-2.5 rounded-xl font-bold border ${validationResult.duplicados.length > 0 ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                  <span className="block text-[10px] uppercase">Duplicados</span>
                  <span className="text-lg font-mono font-black">{validationResult.duplicados.length}</span>
                </div>

                <div className="bg-slate-800 text-white p-2.5 rounded-xl font-bold border border-slate-700">
                  <span className="block text-[10px] text-slate-400 uppercase">Peso Total</span>
                  <span className="text-base font-mono font-black">{validationResult.totalPeso.toLocaleString('pt-BR')} kg</span>
                </div>
              </div>

              {/* Duplicate warnings */}
              {validationResult.duplicados.length > 0 && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Lotes duplicados identificados na planilha:
                  </div>
                  <div className="font-mono text-[11px] max-h-20 overflow-y-auto">
                    {validationResult.duplicados.map(d => `${d.lote} (${d.ocorrencias}x)`).join(', ')}
                  </div>
                </div>
              )}

              {/* Error lines */}
              {validationResult.erros.length > 0 && (
                <div className="bg-red-50 border border-red-300 rounded-xl p-3 text-xs text-red-900 space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    Erros de formatação encontrados ({validationResult.erros.length}):
                  </div>
                  <div className="max-h-24 overflow-y-auto space-y-1 font-mono text-[11px]">
                    {validationResult.erros.map((err, i) => (
                      <div key={i}>Linha {err.linha}: {err.motivo}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Import Mode: Replace or Append */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-200 text-xs">
                <span className="font-bold text-slate-700">Modo de aplicação:</span>
                <div className="flex gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                    />
                    <span>Substituir lista</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                    />
                    <span>Adicionar à lista</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-200"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!validationResult || validationResult.lotesValidos.length === 0}
            onClick={handleConfirmImport}
            className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs shadow"
            id="btn-confirmar-importacao-lotes"
          >
            IMPORTAR {validationResult?.totalImportados || 0} LOTES
          </button>
        </div>
      </div>
    </div>
  );
};
