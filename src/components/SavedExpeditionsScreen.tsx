import React, { useState } from 'react';
import { Expedicao, ActiveScreen } from '../types';
import { 
  FolderArchive, 
  PlusCircle, 
  CheckCircle2, 
  QrCode, 
  Edit3, 
  Trash2, 
  Search, 
  Truck, 
  Calendar, 
  Layers, 
  Check, 
  Clock, 
  ArrowRight,
  ShieldCheck,
  Filter,
  Tag
} from 'lucide-react';

interface SavedExpeditionsScreenProps {
  expeditions: Expedicao[];
  activeExpeditionId: string | null;
  onSelectForConference: (exp: Expedicao) => void;
  onViewQRCode: (exp: Expedicao) => void;
  onEditExpedition: (exp: Expedicao) => void;
  onDeleteExpedition: (id: string) => void;
  onNavigate: (screen: ActiveScreen) => void;
}

export const SavedExpeditionsScreen: React.FC<SavedExpeditionsScreenProps> = ({
  expeditions,
  activeExpeditionId,
  onSelectForConference,
  onViewQRCode,
  onEditExpedition,
  onDeleteExpedition,
  onNavigate,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pendente' | 'em_conferencia' | 'finalizada'>('todos');

  const filtered = expeditions.filter(exp => {
    const totalLotes = exp.lotes.length;
    const conferidosCount = exp.lotes.filter(l => l.conferido).length;
    const isFinished = exp.status === 'finalizada' || (totalLotes > 0 && conferidosCount === totalLotes);

    // Status filter
    if (statusFilter === 'finalizada' && !isFinished) return false;
    if (statusFilter === 'em_conferencia' && (isFinished || conferidosCount === 0)) return false;
    if (statusFilter === 'pendente' && (conferidosCount > 0 || isFinished)) return false;

    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase().trim();

    // Check main expedition fields
    const matchMain = (
      exp.numero.toLowerCase().includes(term) ||
      exp.clienteDestino.toLowerCase().includes(term) ||
      exp.caminhao.toLowerCase().includes(term) ||
      exp.motorista.toLowerCase().includes(term)
    );

    // Check if any lot inside matches the search term
    const matchLot = exp.lotes.some(l => 
      l.lote.toLowerCase().includes(term) ||
      (l.cultura && l.cultura.toLowerCase().includes(term)) ||
      (l.cultivar && l.cultivar.toLowerCase().includes(term))
    );

    return matchMain || matchLot;
  });

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto space-y-4 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
            <FolderArchive className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 leading-tight">
              Consulta e Histórico de Expedições
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Pesquise por número do lote, status, destino ou placa ({expeditions.length} registro(s))
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('nova_expedicao')}
          className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow transition-transform active:scale-95"
          id="btn-salvas-nova-expedicao"
        >
          <PlusCircle className="w-4 h-4" />
          NOVA EXPEDIÇÃO
        </button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por número do lote (ex: 1MG...), expedição, placa..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 shadow-sm"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1 text-xs font-bold overflow-x-auto">
          <button
            type="button"
            onClick={() => setStatusFilter('todos')}
            className={`py-1.5 px-3 rounded-lg text-center transition-all whitespace-nowrap ${
              statusFilter === 'todos'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todos ({expeditions.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('pendente')}
            className={`py-1.5 px-3 rounded-lg text-center transition-all whitespace-nowrap ${
              statusFilter === 'pendente'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pendentes
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('em_conferencia')}
            className={`py-1.5 px-3 rounded-lg text-center transition-all whitespace-nowrap ${
              statusFilter === 'em_conferencia'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Em Conferência
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('finalizada')}
            className={`py-1.5 px-3 rounded-lg text-center transition-all whitespace-nowrap ${
              statusFilter === 'finalizada'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🟢 Liberadas (100%)
          </button>
        </div>
      </div>

      {/* Expeditions List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-slate-400 border border-slate-200 space-y-2">
            <FolderArchive className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="font-bold text-slate-700 text-sm">Nenhuma expedição encontrada</div>
            <p className="text-xs text-slate-400">Verifique os termos de busca ou filtros aplicados.</p>
          </div>
        ) : (
          filtered.map(exp => {
            const totalLotes = exp.lotes.length;
            const conferidosCount = exp.lotes.filter(l => l.conferido).length;
            const totalPeso = exp.lotes.reduce((acc, l) => acc + (Number(l.peso) || 0), 0);
            const percent = totalLotes > 0 ? Math.round((conferidosCount / totalLotes) * 100) : 0;
            const isActive = activeExpeditionId === exp.id;
            const isFinished = exp.status === 'finalizada' || (totalLotes > 0 && conferidosCount === totalLotes);

            // Matching lots if search term is active
            const matchingLots = searchTerm.trim()
              ? exp.lotes.filter(l => 
                  l.lote.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
                  (l.cultivar && l.cultivar.toLowerCase().includes(searchTerm.toLowerCase().trim()))
                )
              : [];

            return (
              <div
                key={exp.id}
                className={`bg-white border-2 rounded-2xl p-4 sm:p-5 shadow-sm transition-all space-y-3.5 ${
                  isActive
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-slate-900 text-base sm:text-lg">
                      #{exp.numero}
                    </span>
                    {isActive && (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-300">
                        EM CONFERÊNCIA ATIVA
                      </span>
                    )}
                    {isFinished ? (
                      <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                        🟢 LIBERADA (100%)
                      </span>
                    ) : percent > 0 ? (
                      <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full">
                        🟡 {percent}% CONFERIDO
                      </span>
                    ) : (
                      <span className="bg-slate-100 text-slate-700 text-[10px] font-black px-2 py-0.5 rounded-full">
                        PENDENTE
                      </span>
                    )}
                  </div>

                  <span className="text-xs text-slate-500 font-mono font-semibold">
                    {exp.data}
                  </span>
                </div>

                {/* Details */}
                <div className="text-xs text-slate-700 space-y-1">
                  <div className="font-bold text-sm text-slate-900 line-clamp-1">
                    {exp.clienteDestino || 'Destino não informado'}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-500">
                    <span>Caminhão: <strong className="text-slate-800">{exp.caminhao || 'N/D'}</strong></span>
                    <span>Motorista: <strong className="text-slate-800">{exp.motorista || 'N/D'}</strong></span>
                    <span>Responsável: <strong className="text-slate-800">{exp.responsavel || 'N/D'}</strong></span>
                  </div>
                </div>

                {/* Highlight Matched Lot if searched */}
                {matchingLots.length > 0 && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 space-y-1">
                    <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      Lote(s) encontrado(s) nesta expedição:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {matchingLots.slice(0, 5).map(ml => (
                        <span
                          key={ml.lote}
                          className={`text-xs px-2 py-0.5 rounded-md font-mono font-bold flex items-center gap-1 ${
                            ml.conferido
                              ? 'bg-emerald-200 text-emerald-950 border border-emerald-300'
                              : 'bg-amber-100 text-amber-950 border border-amber-300'
                          }`}
                        >
                          {ml.conferido ? '✓' : '○'} {ml.lote} ({ml.peso}kg {ml.cultura || ''}) — {ml.conferido ? 'Conferido' : 'Pendente'}
                        </span>
                      ))}
                      {matchingLots.length > 5 && (
                        <span className="text-xs text-emerald-700 self-center">
                          +{matchingLots.length - 5} outros
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Progress Bar & Stats */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-1.5">
                    <span>Lotes: <strong className="text-emerald-700 font-mono">{conferidosCount}</strong> / {totalLotes}</span>
                    <span>Peso: <strong className="font-mono text-slate-900">{totalPeso.toLocaleString('pt-BR')} kg</strong></span>
                    <span className="text-emerald-700 font-mono">{percent}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-2.5 rounded-full transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onViewQRCode(exp)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs py-2 px-3 rounded-xl flex items-center gap-1.5 transition-colors"
                      title="Ver QR Code"
                    >
                      <QrCode className="w-4 h-4 text-emerald-600" />
                      <span>QR Code</span>
                    </button>

                    <button
                      onClick={() => onEditExpedition(exp)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs py-2 px-3 rounded-xl flex items-center gap-1.5 transition-colors"
                      title="Editar Dados da Expedição"
                    >
                      <Edit3 className="w-4 h-4 text-slate-600" />
                      <span>Editar</span>
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`Deseja realmente excluir a expedição #${exp.numero}?`)) {
                          onDeleteExpedition(exp.id);
                        }
                      }}
                      className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-xl transition-colors"
                      title="Excluir Expedição"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => onSelectForConference(exp)}
                    className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-xs py-2.5 px-4 rounded-xl flex items-center gap-1.5 shadow transition-transform active:scale-95 ml-auto"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isFinished ? 'Ver Conferência' : 'Conferir Lotes'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

