import React from 'react';
import { Expedicao, ActiveScreen } from '../types';
import { 
  PlusCircle, 
  QrCode, 
  CheckCircle2, 
  FolderArchive, 
  FileSpreadsheet, 
  Settings, 
  Truck, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  Boxes, 
  Clock,
  KeyRound,
  Users,
  UserPlus
} from 'lucide-react';

interface HomeScreenProps {
  onNavigate: (screen: ActiveScreen) => void;
  activeExpedition: Expedicao | null;
  totalSavedExpeditions: number;
  onOpenQRScanner: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigate,
  activeExpedition,
  totalSavedExpeditions,
  onOpenQRScanner,
}) => {
  const conferidosCount = activeExpedition 
    ? activeExpedition.lotes.filter(l => l.conferido).length 
    : 0;
  const totalLotes = activeExpedition ? activeExpedition.lotes.length : 0;
  const percentConferido = totalLotes > 0 ? Math.round((conferidosCount / totalLotes) * 100) : 0;
  const totalPeso = activeExpedition 
    ? activeExpedition.lotes.reduce((acc, l) => acc + (l.peso || 0), 0)
    : 0;

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-4 pb-12">
      {/* Active Conference Quick Card */}
      {activeExpedition && (
        <div className="bg-gradient-to-r from-emerald-900 to-slate-900 border-2 border-emerald-500 rounded-2xl p-4 text-white shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500 text-slate-950 flex items-center gap-1">
                <Truck className="w-3.5 h-3.5" />
                EXPEDIÇÃO EM ANDAMENTO
              </span>
              <span className="text-sm font-bold text-emerald-300">
                #{activeExpedition.numero}
              </span>
            </div>
            <span className="text-xs text-slate-300 font-mono">
              {activeExpedition.data}
            </span>
          </div>

          <h2 className="text-lg font-bold text-white line-clamp-1">
            {activeExpedition.clienteDestino || 'Destino não informado'}
          </h2>

          {/* Mini Stats Progress */}
          <div className="mt-3 bg-slate-950/60 rounded-xl p-3 border border-emerald-500/20">
            <div className="flex justify-between items-center text-xs font-bold mb-1.5">
              <span className="text-slate-300">
                Progresso: <span className="text-emerald-400 font-black">{conferidosCount}</span> / {totalLotes} lotes
              </span>
              <span className="text-emerald-300 font-mono text-sm">{percentConferido}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
              <div
                className="bg-emerald-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${percentConferido}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 mt-2 font-mono">
              <span>Peso Total: {totalPeso.toLocaleString('pt-BR')} kg</span>
              <span>Motorista: {activeExpedition.motorista || 'N/D'}</span>
            </div>
          </div>

          {/* Quick Action Button */}
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => onNavigate('conferencia')}
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm shadow-md transition-transform active:scale-[0.98]"
              id="btn-home-continue-conference"
            >
              <CheckCircle2 className="w-5 h-5 text-slate-950" />
              CONTINUAR CONFERÊNCIA
              <ArrowRight className="w-4 h-4 ml-auto" />
            </button>
            <button
              onClick={() => onNavigate('qr_code')}
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold p-3 rounded-xl border border-slate-700 flex items-center justify-center"
              title="Ver QR Code desta expedição"
              id="btn-home-view-qr"
            >
              <QrCode className="w-5 h-5 text-emerald-400" />
            </button>
          </div>
        </div>
      )}

      {/* Main Big Action Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
        {/* NOVA EXPEDIÇÃO */}
        <button
          onClick={() => onNavigate('nova_expedicao')}
          className="bg-white hover:bg-slate-50 active:bg-slate-100 border-2 border-slate-200 hover:border-emerald-500 rounded-2xl p-5 text-left shadow-sm hover:shadow-md transition-all flex flex-col justify-between group min-h-[135px]"
          id="btn-home-nova-expedicao"
        >
          <div className="flex items-start justify-between w-full">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <PlusCircle className="w-7 h-7" />
            </div>
            <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              CRIAR
            </span>
          </div>
          <div className="mt-3">
            <div className="text-base font-black text-slate-900 tracking-tight">
              NOVA EXPEDIÇÃO
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Cadastrar carga, lotes e gerar QR Code único
            </div>
          </div>
        </button>

        {/* LER QR CODE */}
        <button
          onClick={onOpenQRScanner}
          className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-2xl p-5 text-left shadow-md hover:shadow-lg transition-all flex flex-col justify-between group min-h-[135px]"
          id="btn-home-ler-qr"
        >
          <div className="flex items-start justify-between w-full">
            <div className="w-12 h-12 rounded-xl bg-white/20 text-white flex items-center justify-center group-hover:scale-105 transition-transform">
              <QrCode className="w-7 h-7" />
            </div>
            <span className="text-xs font-black text-emerald-950 bg-emerald-200 px-2 py-0.5 rounded-full uppercase">
              CÂMERA 📷
            </span>
          </div>
          <div className="mt-3">
            <div className="text-base font-black text-white tracking-tight flex items-center gap-1.5">
              LER QR CODE
            </div>
            <div className="text-xs text-emerald-100 font-medium">
              Escanear QR da expedição e carregar no celular
            </div>
          </div>
        </button>

        {/* GERENCIAR LISTA DE LOTES (LIMPAR / IMPORTAR / EXPORTAR) */}
        <button
          onClick={() => onNavigate('gerenciar_lotes')}
          className="bg-white hover:bg-slate-50 active:bg-slate-100 border-2 border-emerald-500 rounded-2xl p-5 text-left shadow-sm hover:shadow-md transition-all flex flex-col justify-between group min-h-[135px] relative overflow-hidden"
          id="btn-home-gerenciar-lotes"
        >
          <div className="flex items-start justify-between w-full">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Boxes className="w-7 h-7" />
            </div>
            <span className="text-xs font-black text-emerald-800 bg-emerald-100/80 border border-emerald-300 px-2 py-0.5 rounded-full uppercase">
              {totalLotes} LOTES
            </span>
          </div>
          <div className="mt-3">
            <div className="text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
              GERENCIAR LISTA DE LOTES
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Limpar Lista • Importar Excel/CSV • Exportar Excel
            </div>
          </div>
        </button>

        {/* CRIAR ACESSOS (NOME E SENHA) */}
        <button
          onClick={() => onNavigate('usuarios')}
          className="bg-white hover:bg-slate-50 active:bg-slate-100 border-2 border-slate-200 hover:border-emerald-500 rounded-2xl p-5 text-left shadow-sm transition-all flex flex-col justify-between group min-h-[135px]"
          id="btn-home-criar-acessos"
        >
          <div className="flex items-start justify-between w-full">
            <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <KeyRound className="w-7 h-7" />
            </div>
            <span className="text-xs font-black text-purple-800 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
              SENHAS
            </span>
          </div>
          <div className="mt-3">
            <div className="text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
              CRIAR ACESSOS
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Cadastrar operadores com apenas Nome e Senha
            </div>
          </div>
        </button>

        {/* EXPEDIÇÕES SALVAS */}
        <button
          onClick={() => onNavigate('historico')}
          className="bg-white hover:bg-slate-50 active:bg-slate-100 border-2 border-slate-200 hover:border-slate-400 rounded-2xl p-5 text-left shadow-sm transition-all flex flex-col justify-between group min-h-[135px]"
          id="btn-home-expedicoes-salvas"
        >
          <div className="flex items-start justify-between w-full">
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <FolderArchive className="w-7 h-7" />
            </div>
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full font-mono">
              {totalSavedExpeditions} salvas
            </span>
          </div>
          <div className="mt-3">
            <div className="text-base font-black text-slate-900 tracking-tight">
              EXPEDIÇÕES SALVAS
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Histórico local, status e reabertura
            </div>
          </div>
        </button>
      </div>

      {/* Settings Bar */}
      <button
        onClick={() => onNavigate('configuracoes')}
        className="w-full bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border border-slate-300 rounded-xl p-3.5 flex items-center justify-between text-slate-700 transition-colors"
        id="btn-home-configuracoes"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-200 text-slate-700">
            <Settings className="w-5 h-5" />
          </div>
          <div className="text-left">
            <div className="text-sm font-bold text-slate-900">Configurações & Backup</div>
            <div className="text-xs text-slate-500">Operador, alertas de som, vibração e exportação</div>
          </div>
        </div>
        <ArrowRight className="w-5 h-5 text-slate-400" />
      </button>

      {/* Info Pill */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 flex items-center gap-2.5">
        <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
        <div>
          <span className="font-bold text-slate-800">Operação Segura no Armazém: </span>
          O QR Code único contém toda a carga comprimida. Funciona sem sinal de internet ou Wi-Fi.
        </div>
      </div>
    </div>
  );
};
