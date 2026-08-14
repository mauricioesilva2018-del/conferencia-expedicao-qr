import React, { useState } from 'react';
import { Expedicao, LoteItem, ActiveScreen } from '../types';
import { detectSequenceGaps, SequenceGapReport } from '../utils/importer';
import { 
  QrCode, 
  Plus, 
  Trash2, 
  Edit2, 
  Search, 
  AlertTriangle, 
  Check, 
  FileSpreadsheet, 
  Boxes, 
  Save, 
  X,
  Truck,
  User,
  Calendar,
  Layers,
  Weight
} from 'lucide-react';

interface ExpeditionFormProps {
  initialExpedition?: Expedicao | null;
  onSaveAndGenerateQR: (exp: Expedicao) => void;
  onNavigate: (screen: ActiveScreen) => void;
  onOpenImporter: () => void;
  defaultOperator: string;
}

export const ExpeditionForm: React.FC<ExpeditionFormProps> = ({
  initialExpedition,
  onSaveAndGenerateQR,
  onNavigate,
  onOpenImporter,
  defaultOperator,
}) => {
  const [numero, setNumero] = useState(initialExpedition?.numero || `EXP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
  const [data, setData] = useState(initialExpedition?.data || new Date().toISOString().split('T')[0]);
  const [clienteDestino, setClienteDestino] = useState(initialExpedition?.clienteDestino || '');
  const [caminhao, setCaminhao] = useState(initialExpedition?.caminhao || '');
  const [motorista, setMotorista] = useState(initialExpedition?.motorista || '');
  const [responsavel, setResponsavel] = useState(initialExpedition?.responsavel || defaultOperator || '');
  const [lotes, setLotes] = useState<LoteItem[]>(initialExpedition?.lotes || []);

  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // New/Edit Lot Modal State
  const [isLotModalOpen, setIsLotModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [selectedLots, setSelectedLots] = useState<Set<string>>(new Set());
  const [lotForm, setLotForm] = useState({
    lote: '',
    cultura: 'Soja',
    cultivar: '',
    peneira: '5,75 mm',
    categoria: 'S1',
    peso: '840',
  });
  const [formError, setFormError] = useState('');

  // Gap analysis
  const [showGaps, setShowGaps] = useState(false);
  const sequenceGaps: SequenceGapReport[] = React.useMemo(() => {
    return detectSequenceGaps(lotes);
  }, [lotes]);

  const totalGapsCount = sequenceGaps.reduce((sum, g) => sum + g.gaps.reduce((s, item) => s + item.count, 0), 0);

  // Totals
  const totalPeso = lotes.reduce((acc, item) => acc + (Number(item.peso) || 0), 0);
  const totalLotes = lotes.length;

  // Filtered lots
  const filteredLotes = lotes.filter(item => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.lote.toLowerCase().includes(term) ||
      (item.cultura && item.cultura.toLowerCase().includes(term)) ||
      (item.cultivar && item.cultivar.toLowerCase().includes(term)) ||
      item.peneira.toLowerCase().includes(term) ||
      item.categoria.toLowerCase().includes(term)
    );
  });

  const totalPages = Math.ceil(filteredLotes.length / pageSize) || 1;
  const paginatedLotes = filteredLotes.slice((page - 1) * pageSize, page * pageSize);

  const handleOpenAddLot = () => {
    setEditingIndex(null);
    // Suggest next lot number based on last item
    let nextLote = '';
    if (lotes.length > 0) {
      const last = lotes[lotes.length - 1].lote;
      const match = last.match(/^(.*?)(\d+)$/);
      if (match) {
        const nextNum = parseInt(match[2], 10) + 1;
        nextLote = `${match[1]}${String(nextNum).padStart(match[2].length, '0')}`;
      }
    }
    setLotForm({
      lote: nextLote,
      cultura: lotes.length > 0 ? (lotes[lotes.length - 1].cultura || 'Soja') : 'Soja',
      cultivar: lotes.length > 0 ? (lotes[lotes.length - 1].cultivar || '') : '',
      peneira: lotes.length > 0 ? lotes[lotes.length - 1].peneira : '5,75 mm',
      categoria: lotes.length > 0 ? lotes[lotes.length - 1].categoria : 'S1',
      peso: lotes.length > 0 ? String(lotes[lotes.length - 1].peso) : '840',
    });
    setFormError('');
    setIsLotModalOpen(true);
  };

  const handleOpenEditLot = (indexInFiltered: number) => {
    const actualItem = filteredLotes[indexInFiltered];
    const actualIndex = lotes.findIndex(l => l === actualItem);
    if (actualIndex >= 0) {
      setEditingIndex(actualIndex);
      setLotForm({
        lote: actualItem.lote,
        cultura: actualItem.cultura || 'Soja',
        cultivar: actualItem.cultivar || '',
        peneira: actualItem.peneira,
        categoria: actualItem.categoria,
        peso: String(actualItem.peso),
      });
      setFormError('');
      setIsLotModalOpen(true);
    }
  };

  const handleSaveLot = (e: React.FormEvent) => {
    e.preventDefault();
    const loteClean = lotForm.lote.trim().toUpperCase();
    const culturaClean = lotForm.cultura.trim();
    const cultivarClean = lotForm.cultivar.trim();
    const peneiraClean = lotForm.peneira.trim();
    const categoriaClean = lotForm.categoria.trim();
    const pesoNum = parseFloat(lotForm.peso.replace(',', '.'));

    if (!loteClean) {
      setFormError('Informe o número do lote.');
      return;
    }
    if (isNaN(pesoNum) || pesoNum <= 0) {
      setFormError('Informe um peso válido em kg maior que zero.');
      return;
    }

    // Check duplicate
    const duplicateIndex = lotes.findIndex((l, idx) => l.lote === loteClean && idx !== editingIndex);
    if (duplicateIndex >= 0) {
      if (!confirm(`O lote ${loteClean} já existe na lista. Deseja adicionar mesmo assim?`)) {
        return;
      }
    }

    const newLotItem: LoteItem = {
      lote: loteClean,
      cultura: culturaClean || 'Soja',
      cultivar: cultivarClean || undefined,
      peneira: peneiraClean || '5,75 mm',
      categoria: categoriaClean || 'S1',
      peso: pesoNum,
      conferido: editingIndex !== null ? lotes[editingIndex].conferido : false,
      conferidoEm: editingIndex !== null ? lotes[editingIndex].conferidoEm : undefined,
      conferidoPor: editingIndex !== null ? lotes[editingIndex].conferidoPor : undefined,
    };

    if (editingIndex !== null) {
      const updated = [...lotes];
      updated[editingIndex] = newLotItem;
      setLotes(updated);
    } else {
      setLotes([...lotes, newLotItem]);
    }

    setIsLotModalOpen(false);
  };

  const handleDeleteLot = (itemToDelete: LoteItem) => {
    if (confirm(`Deseja realmente remover o lote ${itemToDelete.lote}?`)) {
      setLotes(lotes.filter(l => l !== itemToDelete));
    }
  };

  const handleClearAllLots = () => {
    if (confirm('Tem certeza que deseja limpar TODOS os lotes cadastrados desta expedição?')) {
      setLotes([]);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedLots.size === filteredLotes.length && filteredLotes.length > 0) {
      setSelectedLots(new Set());
    } else {
      setSelectedLots(new Set(filteredLotes.map(l => l.lote)));
    }
  };

  const handleToggleSelectLot = (loteCode: string) => {
    const next = new Set(selectedLots);
    if (next.has(loteCode)) {
      next.delete(loteCode);
    } else {
      next.add(loteCode);
    }
    setSelectedLots(next);
  };

  const handleDeleteSelected = () => {
    if (selectedLots.size === 0) return;
    if (confirm(`Deseja realmente excluir os ${selectedLots.size} lotes selecionados?`)) {
      setLotes(lotes.filter(l => !selectedLots.has(l.lote)));
      setSelectedLots(new Set());
    }
  };

  const handleSubmitExpedition = (e: React.FormEvent) => {
    e.preventDefault();

    if (!numero.trim()) {
      alert('Por favor, informe o número da expedição.');
      return;
    }

    if (lotes.length === 0) {
      alert('A expedição precisa conter ao menos 1 lote cadastrado.');
      return;
    }

    const expedicaoToSave: Expedicao = {
      id: initialExpedition?.id || `exp-${Date.now()}`,
      numero: numero.trim(),
      data: data || new Date().toISOString().split('T')[0],
      clienteDestino: clienteDestino.trim() || 'Cliente Não Informado',
      caminhao: caminhao.trim() || 'Caminhão Não Informado',
      motorista: motorista.trim() || 'Motorista Não Informado',
      responsavel: responsavel.trim() || defaultOperator || 'Operador',
      status: initialExpedition?.status || 'pendente',
      criadoEm: initialExpedition?.criadoEm || new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
      lotes: lotes,
    };

    onSaveAndGenerateQR(expedicaoToSave);
  };

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto space-y-5 pb-16">
      <form onSubmit={handleSubmitExpedition} className="space-y-5">
        {/* Basic Info Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Truck className="w-5 h-5 text-emerald-600" />
              Dados da Expedição
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              Tela 1 de 3
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {/* Numero da Expedição */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                NÚMERO DA EXPEDIÇÃO *
              </label>
              <input
                type="text"
                value={numero}
                onChange={e => setNumero(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-bold text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                placeholder="Ex: 001 ou EXP-2026-001"
                id="input-expedicao-numero"
              />
            </div>

            {/* Data */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                DATA DA EXPEDIÇÃO *
              </label>
              <input
                type="date"
                value={data}
                onChange={e => setData(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                id="input-expedicao-data"
              />
            </div>

            {/* Cliente / Destino */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                CLIENTE / DESTINO
              </label>
              <input
                type="text"
                value={clienteDestino}
                onChange={e => setClienteDestino(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                placeholder="Ex: Fazenda Santa Maria - GO"
                id="input-expedicao-destino"
              />
            </div>

            {/* Caminhão */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                CAMINHÃO / PLACA
              </label>
              <input
                type="text"
                value={caminhao}
                onChange={e => setCaminhao(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                placeholder="Ex: BRA-2E19 / Scania R450"
                id="input-expedicao-caminhao"
              />
            </div>

            {/* Motorista */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                MOTORISTA
              </label>
              <input
                type="text"
                value={motorista}
                onChange={e => setMotorista(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                placeholder="Ex: Carlos Eduardo Silveira"
                id="input-expedicao-motorista"
              />
            </div>

            {/* Responsável */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                RESPONSÁVEL PELA CONFERÊNCIA
              </label>
              <input
                type="text"
                value={responsavel}
                onChange={e => setResponsavel(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                placeholder="Ex: Maurício Silva"
                id="input-expedicao-responsavel"
              />
            </div>
          </div>
        </div>

        {/* Lotes Header & Stats */}
        <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base sm:text-lg font-black text-white">
                  Lotes Cadastrados na Expedição
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Todos os lotes abaixo serão embutidos no QR Code único
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onOpenImporter}
                className="bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/40 text-xs font-bold py-2 px-3 rounded-xl flex items-center gap-1.5 transition-colors"
                id="btn-form-importar-lotes"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                Importar Excel/CSV
              </button>

              <button
                type="button"
                onClick={handleOpenAddLot}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black py-2 px-3 rounded-xl flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
                id="btn-form-adicionar-lote"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                Adicionar Lote
              </button>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-800 text-center">
            <div className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700">
              <span className="text-[11px] font-bold text-slate-400 block uppercase">Total de Lotes</span>
              <span className="text-xl font-black text-emerald-400 font-mono">{totalLotes}</span>
            </div>

            <div className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700">
              <span className="text-[11px] font-bold text-slate-400 block uppercase">Peso Total</span>
              <span className="text-xl font-black text-white font-mono">{totalPeso.toLocaleString('pt-BR')} <span className="text-xs text-slate-400">kg</span></span>
            </div>

            <div className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700">
              <span className="text-[11px] font-bold text-slate-400 block uppercase">Peneiras</span>
              <span className="text-sm font-bold text-slate-200 mt-1 block">
                {Array.from(new Set(lotes.map(l => l.peneira))).length} tipos
              </span>
            </div>

            <div className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700">
              <span className="text-[11px] font-bold text-slate-400 block uppercase">Categorias</span>
              <span className="text-sm font-bold text-slate-200 mt-1 block">
                {Array.from(new Set(lotes.map(l => l.categoria))).join(', ') || 'N/A'}
              </span>
            </div>
          </div>

          {/* Gap Detector Alert (if sequence gaps exist) */}
          {totalGapsCount > 0 && (
            <div className="bg-amber-950/70 border border-amber-500/40 rounded-xl p-3 text-xs text-amber-200 flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-300">Aviso de Sequência: </span>
                  Identificados {totalGapsCount} números faltantes nas faixas numéricas de lotes.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGaps(!showGaps)}
                className="text-[11px] bg-amber-900/80 hover:bg-amber-900 text-amber-100 font-bold px-2 py-1 rounded border border-amber-600/40 flex-shrink-0"
              >
                {showGaps ? 'Ocultar' : 'Ver Detalhes'}
              </button>
            </div>
          )}

          {showGaps && totalGapsCount > 0 && (
            <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 text-xs space-y-2">
              <div className="font-bold text-slate-300">Relatório de Lacunas na Sequência Numérica:</div>
              {sequenceGaps.map(sg => (
                <div key={sg.prefix} className="text-slate-400 space-y-1">
                  <div className="font-semibold text-emerald-400">
                    Série {sg.prefix} ({sg.totalPresentes} presentes de {sg.totalEsperados} esperados):
                  </div>
                  {sg.gaps.map((gap, i) => (
                    <div key={i} className="pl-3 text-[11px] text-amber-300/90 font-mono">
                      • Faltam {gap.count} lotes entre {gap.de} e {gap.ate}: {gap.amostras.join(', ')}
                    </div>
                  ))}
                </div>
              ))}
              <div className="text-[11px] text-slate-500 italic mt-1">
                * Conforme regra, os lotes faltantes NÃO foram criados automaticamente. Os dados originais foram 100% preservados.
              </div>
            </div>
          )}
        </div>

        {/* Lotes Table & Filter */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row gap-2 justify-between items-center">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
                placeholder="Filtrar por lote, cultura, peneira..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 w-full sm:w-auto justify-between sm:justify-end">
              {selectedLots.size > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  className="text-red-600 hover:text-red-700 font-bold text-xs px-2.5 py-1 rounded bg-red-50 border border-red-200 flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir ({selectedLots.size})
                </button>
              )}
              <span>{filteredLotes.length} lotes listados</span>
              {lotes.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllLots}
                  className="text-red-600 hover:text-red-700 font-semibold text-xs px-2 py-1 rounded hover:bg-red-50"
                >
                  Limpar Todos
                </button>
              )}
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto max-h-[440px] overflow-y-auto">
            {paginatedLotes.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                Nenhum lote encontrado. Clique em <strong>Adicionar Lote</strong> ou <strong>Importar Excel/CSV</strong>.
              </div>
            ) : (
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 w-8">
                      <input
                        type="checkbox"
                        checked={selectedLots.size === filteredLotes.length && filteredLotes.length > 0}
                        onChange={handleToggleSelectAll}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        title="Selecionar Todos"
                      />
                    </th>
                    <th className="py-2.5 px-2">#</th>
                    <th className="py-2.5 px-3">Lote</th>
                    <th className="py-2.5 px-3">Cultura / Cultivar</th>
                    <th className="py-2.5 px-3">Peneira</th>
                    <th className="py-2.5 px-3">Categoria</th>
                    <th className="py-2.5 px-3 text-right">Peso (kg)</th>
                    <th className="py-2.5 px-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedLotes.map((item, idx) => {
                    const globalIndex = (page - 1) * pageSize + idx;
                    const isSelected = selectedLots.has(item.lote);
                    return (
                      <tr
                        key={`${item.lote}-${globalIndex}`}
                        className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-emerald-50/50' : ''}`}
                      >
                        <td className="py-2 px-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectLot(item.lote)}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="py-2 px-2 text-slate-400 font-mono text-[11px]">
                          {globalIndex + 1}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900 font-mono">
                          {item.lote}
                        </td>
                        <td className="py-2 px-3 text-slate-700">
                          <div className="font-semibold text-slate-900">{item.cultura || 'Soja'}</div>
                          {item.cultivar && (
                            <div className="text-[11px] text-slate-500 font-mono">{item.cultivar}</div>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-600 font-medium">
                          {item.peneira}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-700">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px]">
                            {item.categoria}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {item.peso.toLocaleString('pt-BR')} kg
                        </td>
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditLot(globalIndex)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
                              title="Editar Lote"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Editar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteLot(item)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors"
                              title="Excluir Lote"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Excluir</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Página {page} de {totalPages}
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-2.5 py-1 rounded bg-white border border-slate-300 disabled:opacity-40 font-medium"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-2.5 py-1 rounded bg-white border border-slate-300 disabled:opacity-40 font-medium"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Big Bottom Action Button: GERAR QR CODE DA EXPEDIÇÃO */}
        <div className="pt-2">
          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-base sm:text-lg py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 active:scale-[0.99]"
            id="btn-gerar-qr-expedicao"
          >
            <QrCode className="w-6 h-6" />
            GERAR QR CODE DA EXPEDIÇÃO ({totalLotes} LOTES)
          </button>
        </div>
      </form>

      {/* Modal Add / Edit Lot */}
      {isLotModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                {editingIndex !== null ? <Edit2 className="w-5 h-5 text-emerald-600" /> : <Plus className="w-5 h-5 text-emerald-600" />}
                {editingIndex !== null ? 'Editar Lote' : 'Adicionar Novo Lote'}
              </h3>
              <button
                onClick={() => setIsLotModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs font-semibold border border-red-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveLot} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  NÚMERO DO LOTE *
                </label>
                <input
                  type="text"
                  value={lotForm.lote}
                  onChange={e => setLotForm({ ...lotForm, lote: e.target.value })}
                  required
                  placeholder="Ex: 1MG1260001"
                  className="w-full font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 uppercase"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    CULTURA
                  </label>
                  <input
                    type="text"
                    list="culturas-list"
                    value={lotForm.cultura}
                    onChange={e => setLotForm({ ...lotForm, cultura: e.target.value })}
                    placeholder="Ex: Soja, Milho..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                  <datalist id="culturas-list">
                    <option value="Soja" />
                    <option value="Milho" />
                    <option value="Algodão" />
                    <option value="Feijão" />
                    <option value="Trigo" />
                    <option value="Sorgo" />
                    <option value="Girassol" />
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    CULTIVAR / HÍBRIDO
                  </label>
                  <input
                    type="text"
                    value={lotForm.cultivar}
                    onChange={e => setLotForm({ ...lotForm, cultivar: e.target.value })}
                    placeholder="Ex: DM 66I68, SYN 1561"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    PENEIRA
                  </label>
                  <input
                    type="text"
                    value={lotForm.peneira}
                    onChange={e => setLotForm({ ...lotForm, peneira: e.target.value })}
                    placeholder="Ex: 5,75 mm"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    CATEGORIA
                  </label>
                  <input
                    type="text"
                    value={lotForm.categoria}
                    onChange={e => setLotForm({ ...lotForm, categoria: e.target.value })}
                    placeholder="Ex: S1, S2, C1, C2, Básica"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  PESO EM KG *
                </label>
                <input
                  type="number"
                  step="any"
                  value={lotForm.peso}
                  onChange={e => setLotForm({ ...lotForm, peso: e.target.value })}
                  required
                  placeholder="Ex: 843"
                  className="w-full font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLotModalOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow"
                >
                  {editingIndex !== null ? 'Salvar Alterações' : 'Adicionar Lote'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
