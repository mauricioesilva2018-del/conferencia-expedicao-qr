import React, { useState, useRef } from 'react';
import { Expedicao, LoteItem, ActiveScreen, ImportValidationResult } from '../types';
import { validateAndParseLots } from '../utils/importer';
import { exportLotsToExcel, exportLotsToCSV } from '../utils/exportLots';
import { 
  Boxes, 
  Trash2, 
  UploadCloud, 
  FileSpreadsheet, 
  Download, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Plus, 
  ArrowLeft, 
  FileCheck2, 
  QrCode, 
  Truck,
  RefreshCw,
  X,
  Check,
  Filter
} from 'lucide-react';

interface LotManagementScreenProps {
  expedition: Expedicao | null;
  onUpdateExpedition: (exp: Expedicao) => void;
  onNavigate: (screen: ActiveScreen) => void;
}

export const LotManagementScreen: React.FC<LotManagementScreenProps> = ({
  expedition,
  onUpdateExpedition,
  onNavigate,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'conferidos' | 'pendentes'>('todos');
  
  // File input ref for Excel/CSV import
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Clear confirmation modal state
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  // Import modal / diagnostics state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [validationResult, setValidationResult] = useState<ImportValidationResult | null>(null);
  const [importNotice, setImportNotice] = useState<string | null>(null);

  // Manual Add / Edit Lot modal
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingLotIndex, setEditingLotIndex] = useState<number | null>(null);
  const [lotFormData, setLotFormData] = useState({
    lote: '',
    cultura: 'Soja',
    cultivar: '',
    variedade: '',
    peneira: '5,75 mm',
    categoria: 'S1',
    peso: '840',
    germinacao: '',
    vigor: '',
    safra: '',
    observacao: '',
  });
  const [formError, setFormError] = useState('');

  const lotes = expedition?.lotes || [];
  const totalLotes = lotes.length;
  const conferidos = lotes.filter(l => l.conferido);
  const totalConferidos = conferidos.length;
  const totalPendentes = totalLotes - totalConferidos;
  const totalPeso = lotes.reduce((acc, l) => acc + (Number(l.peso) || 0), 0);

  // Filtered lots for search and status
  const filteredLotes = lotes.filter(item => {
    if (filterStatus === 'conferidos' && !item.conferido) return false;
    if (filterStatus === 'pendentes' && item.conferido) return false;

    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.lote.toLowerCase().includes(term) ||
      (item.cultura && item.cultura.toLowerCase().includes(term)) ||
      (item.cultivar && item.cultivar.toLowerCase().includes(term)) ||
      item.peneira.toLowerCase().includes(term) ||
      item.categoria.toLowerCase().includes(term) ||
      String(item.peso).includes(term)
    );
  });

  // ------------------------------------------
  // 1. "LIMPAR LISTA" Functionality
  // ------------------------------------------
  const handleTriggerClearList = () => {
    if (totalLotes === 0) {
      alert('A lista de lotes já está vazia.');
      return;
    }
    setIsClearModalOpen(true);
  };

  const handleConfirmClearList = () => {
    if (!expedition) return;

    const updatedExp: Expedicao = {
      ...expedition,
      lotes: [],
      divergencias: [], // Reset associated conference divergences if any
      status: 'pendente',
      atualizadoEm: new Date().toISOString(),
    };

    onUpdateExpedition(updatedExp);
    setIsClearModalOpen(false);
    setImportNotice('Lista de lotes apagada com sucesso.');
    setTimeout(() => setImportNotice(null), 4000);
  };

  // ------------------------------------------
  // 2. "IMPORTAR NOVA LISTA" Functionality
  // ------------------------------------------
  const handleOpenFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    try {
      const isBinary = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
      if (isBinary) {
        const buffer = await file.arrayBuffer();
        const result = validateAndParseLots(buffer, { preventDuplicates: true });
        setValidationResult(result);
        setIsImportModalOpen(true);
      } else {
        const text = await file.text();
        const result = validateAndParseLots(text, { preventDuplicates: true });
        setValidationResult(result);
        setIsImportModalOpen(true);
      }
    } catch (err) {
      console.error('Erro ao ler arquivo:', err);
      alert('Erro ao ler arquivo. Verifique se o formato é Excel (.xlsx) ou CSV válido.');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleConfirmReplaceImport = () => {
    if (!validationResult || validationResult.lotesValidos.length === 0 || !expedition) {
      alert('Nenhum lote válido para importar.');
      return;
    }

    const updatedExp: Expedicao = {
      ...expedition,
      lotes: validationResult.lotesValidos,
      divergencias: [],
      status: 'pendente',
      atualizadoEm: new Date().toISOString(),
    };

    onUpdateExpedition(updatedExp);
    setIsImportModalOpen(false);
    const count = validationResult.lotesValidos.length;
    setImportNotice(`Nova lista importada com sucesso! ${count} lotes cadastrados e prontos para conferência.`);
    setValidationResult(null);
    setTimeout(() => setImportNotice(null), 5000);
  };

  // ------------------------------------------
  // 3. "EXPORTAR LISTA" Functionality
  // ------------------------------------------
  const handleExportList = () => {
    if (totalLotes === 0) {
      alert('Não há lotes para exportar.');
      return;
    }
    const success = exportLotsToExcel(lotes, expedition, 'Lista_Lotes_Expedicao');
    if (success) {
      setImportNotice('Planilha Excel baixada com sucesso.');
      setTimeout(() => setImportNotice(null), 3000);
    }
  };

  // ------------------------------------------
  // Manual Add / Edit Lot
  // ------------------------------------------
  const handleOpenAddModal = () => {
    setEditingLotIndex(null);
    let nextLote = '';
    if (lotes.length > 0) {
      const last = lotes[lotes.length - 1].lote;
      const match = last.match(/^(.*?)(\d+)$/);
      if (match) {
        const nextNum = parseInt(match[2], 10) + 1;
        nextLote = `${match[1]}${String(nextNum).padStart(match[2].length, '0')}`;
      }
    }
    setLotFormData({
      lote: nextLote,
      cultura: lotes.length > 0 ? (lotes[lotes.length - 1].cultura || 'Soja') : 'Soja',
      cultivar: lotes.length > 0 ? (lotes[lotes.length - 1].cultivar || '') : '',
      variedade: lotes.length > 0 ? (lotes[lotes.length - 1].variedade || '') : '',
      peneira: lotes.length > 0 ? lotes[lotes.length - 1].peneira : '5,75 mm',
      categoria: lotes.length > 0 ? lotes[lotes.length - 1].categoria : 'S1',
      peso: lotes.length > 0 ? String(lotes[lotes.length - 1].peso) : '840',
      germinacao: '',
      vigor: '',
      safra: lotes.length > 0 ? (lotes[lotes.length - 1].safra || '') : '',
      observacao: '',
    });
    setFormError('');
    setIsAddEditModalOpen(true);
  };

  const handleOpenEditModal = (loteItem: LoteItem) => {
    const idx = lotes.findIndex(l => l === loteItem);
    if (idx < 0) return;
    setEditingLotIndex(idx);
    setLotFormData({
      lote: loteItem.lote,
      cultura: loteItem.cultura || 'Soja',
      cultivar: loteItem.cultivar || '',
      variedade: loteItem.variedade || '',
      peneira: loteItem.peneira,
      categoria: loteItem.categoria,
      peso: String(loteItem.peso),
      germinacao: loteItem.germinacao !== undefined ? String(loteItem.germinacao) : '',
      vigor: loteItem.vigor !== undefined ? String(loteItem.vigor) : '',
      safra: loteItem.safra || '',
      observacao: loteItem.observacao || '',
    });
    setFormError('');
    setIsAddEditModalOpen(true);
  };

  const handleSaveManualLot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expedition) return;

    const loteClean = lotFormData.lote.trim().toUpperCase();
    const pesoNum = parseFloat(lotFormData.peso.replace(',', '.'));

    if (!loteClean) {
      setFormError('Informe o código do lote.');
      return;
    }
    if (isNaN(pesoNum) || pesoNum <= 0) {
      setFormError('Informe um peso válido maior que zero.');
      return;
    }

    // Duplicate check
    const dupIdx = lotes.findIndex((l, i) => l.lote === loteClean && i !== editingLotIndex);
    if (dupIdx >= 0) {
      setFormError(`O lote ${loteClean} já existe na lista.`);
      return;
    }

    const germinacaoNum = lotFormData.germinacao.trim() ? parseFloat(lotFormData.germinacao.replace('%', '').replace(',', '.')) : undefined;
    const vigorNum = lotFormData.vigor.trim() ? parseFloat(lotFormData.vigor.replace('%', '').replace(',', '.')) : undefined;

    const newLot: LoteItem = {
      lote: loteClean,
      cultura: lotFormData.cultura.trim() || 'Soja',
      cultivar: lotFormData.cultivar.trim() || undefined,
      variedade: lotFormData.variedade.trim() || undefined,
      peneira: lotFormData.peneira.trim() || '5,75 mm',
      categoria: lotFormData.categoria.trim() || 'S1',
      peso: pesoNum,
      germinacao: germinacaoNum !== undefined && !isNaN(germinacaoNum) ? germinacaoNum : (lotFormData.germinacao.trim() || undefined),
      vigor: vigorNum !== undefined && !isNaN(vigorNum) ? vigorNum : (lotFormData.vigor.trim() || undefined),
      safra: lotFormData.safra.trim() || undefined,
      observacao: lotFormData.observacao.trim() || undefined,
      conferido: editingLotIndex !== null ? lotes[editingLotIndex].conferido : false,
      conferidoEm: editingLotIndex !== null ? lotes[editingLotIndex].conferidoEm : undefined,
      conferidoPor: editingLotIndex !== null ? lotes[editingLotIndex].conferidoPor : undefined,
    };

    let updatedList = [...lotes];
    if (editingLotIndex !== null) {
      updatedList[editingLotIndex] = newLot;
    } else {
      updatedList.push(newLot);
    }

    onUpdateExpedition({
      ...expedition,
      lotes: updatedList,
      atualizadoEm: new Date().toISOString(),
    });

    setIsAddEditModalOpen(false);
  };

  const handleDeleteSingleLot = (loteToDelete: LoteItem) => {
    if (!expedition) return;
    if (confirm(`Remover o lote ${loteToDelete.lote} da lista?`)) {
      onUpdateExpedition({
        ...expedition,
        lotes: lotes.filter(l => l !== loteToDelete),
        atualizadoEm: new Date().toISOString(),
      });
    }
  };

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto space-y-4 pb-16">
      {/* Hidden File Input for mobile and desktop */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx, .xls, .csv, .txt"
        onChange={handleFileChange}
        className="hidden"
        id="file-input-lotes-gerenciador"
      />

      {/* Header with Navigation and Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('home')}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
            title="Voltar ao Início"
            id="btn-voltar-home-lotes"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Boxes className="w-5 h-5 text-emerald-600" />
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Gerenciamento da Lista de Lotes
              </h1>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Expedição #{expedition?.numero || '001'} • {expedition?.clienteDestino || 'UBS Barro Branco - MG'}
            </p>
          </div>
        </div>

        {/* Quick Nav to Conference / QR */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('conferencia')}
            className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all"
            id="btn-gerenciador-ir-conferencia"
          >
            <CheckCircle2 className="w-4 h-4" />
            Conferir Lotes
          </button>
          <button
            onClick={() => onNavigate('qr_code')}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl"
            title="Ver QR Code da Expedição"
            id="btn-gerenciador-ver-qr"
          >
            <QrCode className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {importNotice && (
        <div className="bg-emerald-50 border-2 border-emerald-500 rounded-xl p-3.5 text-xs text-emerald-950 font-bold flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{importNotice}</span>
          </div>
          <button onClick={() => setImportNotice(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3 PRIMARY ACTION BUTTONS (MANDATED BY USER) */}
      <div className="bg-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-md space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Ações Principais da Lista
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* 1. LIMPAR LISTA */}
          <button
            onClick={handleTriggerClearList}
            className="bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-black py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm shadow-md transition-all active:scale-[0.98] border border-red-400/30 group"
            id="btn-gerenciador-limpar-lista"
          >
            <Trash2 className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
            LIMPAR LISTA
          </button>

          {/* 2. IMPORTAR NOVA LISTA */}
          <button
            onClick={handleOpenFilePicker}
            disabled={isProcessingFile}
            className="bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm shadow-md transition-all active:scale-[0.98] border border-emerald-300 group"
            id="btn-gerenciador-importar-lista"
          >
            <UploadCloud className="w-5 h-5 text-slate-950 group-hover:scale-110 transition-transform" />
            {isProcessingFile ? 'PROCESSANDO...' : 'IMPORTAR NOVA LISTA'}
          </button>

          {/* 3. EXPORTAR LISTA */}
          <button
            onClick={handleExportList}
            disabled={totalLotes === 0}
            className="bg-slate-800 hover:bg-slate-700 active:bg-slate-600 disabled:opacity-50 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm border border-slate-700 shadow-sm transition-all group"
            id="btn-gerenciador-exportar-lista"
          >
            <Download className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
            EXPORTAR LISTA
          </button>
        </div>

        <div className="text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800">
          <span>• A importação aceita arquivos <strong>.xlsx (Excel)</strong> ou <strong>.csv</strong>.</span>
          <span>• A limpeza apaga apenas a lista de lotes, preservando dados do sistema.</span>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm text-center">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">Total de Lotes</span>
          <span className="text-xl font-black text-slate-900 font-mono">{totalLotes}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm text-center">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">Peso Total</span>
          <span className="text-lg font-black text-emerald-600 font-mono">
            {totalPeso.toLocaleString('pt-BR')} <span className="text-xs text-slate-500">kg</span>
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm text-center">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">Conferidos</span>
          <span className="text-xl font-black text-emerald-600 font-mono">{totalConferidos}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm text-center">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">Pendentes</span>
          <span className="text-xl font-black text-amber-600 font-mono">{totalPendentes}</span>
        </div>
      </div>

      {/* Lots Table & Search/Filter Section */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm space-y-3 p-4">
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Consultar lote, cultura, peneira, categoria..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-medium"
              id="input-busca-gerenciador-lotes"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Status Filter buttons */}
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
              <button
                onClick={() => setFilterStatus('todos')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${filterStatus === 'todos' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'}`}
              >
                Todos ({totalLotes})
              </button>
              <button
                onClick={() => setFilterStatus('pendentes')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${filterStatus === 'pendentes' ? 'bg-amber-500 text-white shadow-sm' : 'hover:text-slate-900'}`}
              >
                Pendentes ({totalPendentes})
              </button>
              <button
                onClick={() => setFilterStatus('conferidos')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${filterStatus === 'conferidos' ? 'bg-emerald-600 text-white shadow-sm' : 'hover:text-slate-900'}`}
              >
                Conferidos ({totalConferidos})
              </button>
            </div>

            {/* Add manual lot button */}
            <button
              onClick={handleOpenAddModal}
              className="bg-slate-900 hover:bg-slate-800 text-white p-2 rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm flex-shrink-0"
              title="Adicionar lote individual"
              id="btn-adicionar-lote-manual"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Adicionar</span>
            </button>
          </div>
        </div>

        {/* Table / List Container */}
        <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-[500px] overflow-y-auto">
          {filteredLotes.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <Boxes className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-600">
                {totalLotes === 0 
                  ? 'Nenhum lote cadastrado no momento.' 
                  : 'Nenhum lote corresponde ao filtro informado.'}
              </p>
              <p className="text-xs text-slate-400">
                {totalLotes === 0 
                  ? 'Clique em "IMPORTAR NOVA LISTA" para carregar uma planilha Excel (.xlsx) ou CSV.' 
                  : 'Tente limpar a busca para ver todos os lotes.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Lote</th>
                  <th className="py-2.5 px-3">Cultura / Variedade</th>
                  <th className="py-2.5 px-3">Peneira / Cat</th>
                  <th className="py-2.5 px-3 text-center">🌱 Germinação</th>
                  <th className="py-2.5 px-3 text-center">⚡ Vigor</th>
                  <th className="py-2.5 px-3 text-right">Peso (kg)</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLotes.map((item, idx) => (
                  <tr key={`${item.lote}-${idx}`} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-mono font-black text-slate-900 text-xs sm:text-sm bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {item.lote}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      <span className="font-semibold">{item.variedade || item.cultivar || item.cultura || 'Soja'}</span>
                      {item.safra && <span className="text-slate-400 block text-[10px]">Safra: {item.safra}</span>}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-medium">
                      <span>{item.peneira}</span>
                      <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {item.categoria}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {item.germinacao !== undefined && item.germinacao !== '' ? (
                        <span className="font-mono font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[11px]">
                          {typeof item.germinacao === 'number' ? `${item.germinacao}%` : item.germinacao}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {item.vigor !== undefined && item.vigor !== '' ? (
                        <span className="font-mono font-black text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md text-[11px]">
                          {typeof item.vigor === 'number' ? `${item.vigor}%` : item.vigor}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {item.peso.toLocaleString('pt-BR')} kg
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {item.conferido ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          CONFERIDO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                          <Clock className="w-3 h-3 text-amber-600" />
                          PENDENTE
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-200"
                          title="Editar Lote"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSingleLot(item)}
                          className="p-1 text-red-500 hover:text-red-700 rounded hover:bg-red-50"
                          title="Excluir Lote"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* -------------------------------------------------------------- */}
      {/* MODAL 1: CONFIRM CLEAR LIST (MANDATED TEXT IN USER PROMPT)      */}
      {/* -------------------------------------------------------------- */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scale-up">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-black text-slate-900">
                Confirmar Limpeza de Lotes
              </h3>
              <p className="text-sm font-semibold text-slate-700 bg-red-50 p-3 rounded-xl border border-red-200">
                Tem certeza que deseja apagar todos os lotes? Esta ação não poderá ser desfeita.
              </p>
              <p className="text-xs text-slate-500">
                Serão apagados os <strong>{totalLotes} lotes</strong> desta expedição. Usuários cadastrados, configurações e o restante do sistema permanecerão intactos.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsClearModalOpen(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100"
                id="btn-cancelar-limpar-lotes"
              >
                CANCELAR
              </button>
              <button
                type="button"
                onClick={handleConfirmClearList}
                className="flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-black text-xs shadow-md"
                id="btn-confirmar-limpar-lotes"
              >
                SIM, APAGAR LOTES
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------- */}
      {/* MODAL 2: IMPORT PREVIEW & DIAGNOSTICS MODAL                    */}
      {/* -------------------------------------------------------------- */}
      {isImportModalOpen && validationResult && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 animate-scale-up">
            {/* Header */}
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-black">Validação da Nova Lista</h3>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-950 font-medium">
                Esta ação irá <strong>substituir a lista anterior</strong> pela nova lista importada.
              </div>

              {/* Stats Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="bg-emerald-100 text-emerald-900 p-2.5 rounded-xl font-bold border border-emerald-300">
                  <span className="block text-[10px] uppercase text-emerald-700">Lotes Válidos</span>
                  <span className="text-xl font-black font-mono">{validationResult.totalImportados}</span>
                </div>

                <div className={`p-2.5 rounded-xl font-bold border ${validationResult.erros.length > 0 ? 'bg-red-100 text-red-900 border-red-300' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                  <span className="block text-[10px] uppercase">Erros</span>
                  <span className="text-xl font-black font-mono">{validationResult.erros.length}</span>
                </div>

                <div className={`p-2.5 rounded-xl font-bold border ${validationResult.duplicados.length > 0 ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                  <span className="block text-[10px] uppercase">Duplicados</span>
                  <span className="text-xl font-black font-mono">{validationResult.duplicados.length}</span>
                </div>

                <div className="bg-slate-800 text-white p-2.5 rounded-xl font-bold border border-slate-700">
                  <span className="block text-[10px] text-slate-400 uppercase">Peso Total</span>
                  <span className="text-sm font-black font-mono mt-1 block">
                    {validationResult.totalPeso.toLocaleString('pt-BR')} kg
                  </span>
                </div>
              </div>

              {/* Duplicate Prevention Notice */}
              {validationResult.duplicados.length > 0 && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-amber-950 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Lotes duplicados na planilha ({validationResult.duplicados.length}):
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Para evitar duplicidade, o sistema considerou apenas a primeira ocorrência de cada lote único.
                  </p>
                  <div className="font-mono text-[11px] max-h-16 overflow-y-auto bg-white/70 p-1.5 rounded border border-amber-200">
                    {validationResult.duplicados.map(d => `${d.lote} (${d.ocorrencias}x)`).join(', ')}
                  </div>
                </div>
              )}

              {/* Error Rows Report */}
              {validationResult.erros.length > 0 && (
                <div className="bg-red-50 border border-red-300 rounded-xl p-3 text-red-950 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-red-900">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    Linhas com erro de validação ({validationResult.erros.length}):
                  </div>
                  <div className="max-h-24 overflow-y-auto space-y-1 font-mono text-[11px] bg-white/70 p-1.5 rounded border border-red-200">
                    {validationResult.erros.map((err, i) => (
                      <div key={i}>• Linha {err.linha}: {err.motivo}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview of first 5 imported lots */}
              {validationResult.lotesValidos.length > 0 && (
                <div className="space-y-1.5">
                  <div className="font-bold text-slate-700">Prévia dos Primeiros Lotes:</div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-[11px]">
                      <thead className="bg-slate-200 text-slate-700 font-bold">
                        <tr>
                          <th className="py-1 px-2">Lote</th>
                          <th className="py-1 px-2">Peneira</th>
                          <th className="py-1 px-2">Categoria</th>
                          <th className="py-1 px-2 text-right">Peso (kg)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {validationResult.lotesValidos.slice(0, 5).map((l, idx) => (
                          <tr key={idx}>
                            <td className="py-1 px-2 font-mono font-bold">{l.lote}</td>
                            <td className="py-1 px-2">{l.peneira}</td>
                            <td className="py-1 px-2">{l.categoria}</td>
                            <td className="py-1 px-2 text-right font-mono">{l.peso}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex gap-2">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-200"
              >
                CANCELAR
              </button>
              <button
                type="button"
                disabled={validationResult.lotesValidos.length === 0}
                onClick={handleConfirmReplaceImport}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-xs shadow-md disabled:opacity-50"
                id="btn-confirmar-substituicao-lotes"
              >
                SUBSTITUIR POR {validationResult.totalImportados} LOTES
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------- */}
      {/* MODAL 3: MANUAL ADD / EDIT LOT MODAL                           */}
      {/* -------------------------------------------------------------- */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">
                {editingLotIndex !== null ? 'Editar Lote' : 'Adicionar Novo Lote'}
              </h3>
              <button onClick={() => setIsAddEditModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 text-xs text-red-700 font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveManualLot} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">NÚMERO DO LOTE *</label>
                <input
                  type="text"
                  value={lotFormData.lote}
                  onChange={e => setLotFormData({ ...lotFormData, lote: e.target.value })}
                  placeholder="Ex: 1MG1260001"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">CULTURA</label>
                  <input
                    type="text"
                    value={lotFormData.cultura}
                    onChange={e => setLotFormData({ ...lotFormData, cultura: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">CULTIVAR</label>
                  <input
                    type="text"
                    value={lotFormData.cultivar}
                    onChange={e => setLotFormData({ ...lotFormData, cultivar: e.target.value })}
                    placeholder="Ex: BMX Desafio"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">PENEIRA</label>
                  <input
                    type="text"
                    value={lotFormData.peneira}
                    onChange={e => setLotFormData({ ...lotFormData, peneira: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">CATEGORIA</label>
                  <input
                    type="text"
                    value={lotFormData.categoria}
                    onChange={e => setLotFormData({ ...lotFormData, categoria: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">PESO (KG) *</label>
                  <input
                    type="text"
                    value={lotFormData.peso}
                    onChange={e => setLotFormData({ ...lotFormData, peso: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Qualidade e Safra */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-bold text-emerald-800 mb-1">🌱 GERM. (%)</label>
                  <input
                    type="text"
                    value={lotFormData.germinacao}
                    onChange={e => setLotFormData({ ...lotFormData, germinacao: e.target.value })}
                    placeholder="Ex: 92"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-blue-800 mb-1">⚡ VIGOR (%)</label>
                  <input
                    type="text"
                    value={lotFormData.vigor}
                    onChange={e => setLotFormData({ ...lotFormData, vigor: e.target.value })}
                    placeholder="Ex: 88"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">SAFRA</label>
                  <input
                    type="text"
                    value={lotFormData.safra}
                    onChange={e => setLotFormData({ ...lotFormData, safra: e.target.value })}
                    placeholder="Ex: 24/25"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 text-xs"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  className="flex-1 py-2.5 px-3 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md"
                >
                  Salvar Lote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
