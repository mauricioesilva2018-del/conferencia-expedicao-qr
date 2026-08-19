import React from 'react';
import { ActiveScreen, Usuario } from '../types';
import { 
  Boxes, 
  WifiOff, 
  User, 
  ArrowLeft, 
  Home, 
  QrCode, 
  CheckCircle2, 
  Settings, 
  FileSpreadsheet,
  History,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  Users
} from 'lucide-react';

interface HeaderProps {
  currentScreen: ActiveScreen;
  onNavigate: (screen: ActiveScreen) => void;
  operatorName: string;
  activeExpeditionNumber?: string;
  isOnline: boolean;
  currentUser: Usuario | null;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  onNavigate,
  operatorName,
  activeExpeditionNumber,
  isOnline,
  currentUser,
  onLogout,
}) => {
  const getScreenTitle = () => {
    switch (currentScreen) {
      case 'nova_expedicao': return 'Nova Expedição';
      case 'editar_expedicao': return 'Editar Expedição';
      case 'qr_code': return 'QR Code da Expedição';
      case 'conferencia': return 'Conferência de Carga';
      case 'gerenciar_lotes': return 'Gerenciamento da Lista de Lotes';
      case 'historico': return 'Expedições Salvas';
      case 'importar': return 'Importar Lotes';
      case 'configuracoes': return 'Configurações & Backup';
      case 'usuarios': return 'Gerenciar Acessos (Usuários)';
      default: return 'Conferência Expedição QR';
    }
  };

  const isAdmin = currentUser?.role === 'ADMINISTRADOR';

  return (
    <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-md border-b border-slate-800">
      {/* Top Banner Status */}
      <div className="bg-emerald-800 px-3 py-1 text-xs font-semibold flex items-center justify-between text-emerald-50">
        <div className="flex items-center gap-1.5">
          <WifiOff className="w-3.5 h-3.5 text-emerald-300" />
          <span>SISTEMA 100% OFFLINE</span>
        </div>
        <div className="flex items-center gap-2">
          {activeExpeditionNumber && (
            <button
              onClick={() => onNavigate('conferencia')}
              className="bg-emerald-950/80 hover:bg-emerald-950 px-2 py-0.5 rounded text-[11px] font-bold text-emerald-200 flex items-center gap-1 border border-emerald-500/30"
              title="Ir para conferência ativa"
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              Exp. #{activeExpeditionNumber}
            </button>
          )}

          {/* User & Role Badge */}
          <div className="flex items-center gap-1.5 text-[11px]">
            <span
              className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider ${
                isAdmin
                  ? 'bg-emerald-400 text-slate-950'
                  : 'bg-blue-400 text-slate-950'
              }`}
              title={`Perfil: ${currentUser?.role || 'OPERADOR'}`}
            >
              {isAdmin ? 'ADMIN' : 'OPERADOR'}
            </span>
            <div className="flex items-center gap-1 text-emerald-100 font-medium">
              <User className="w-3 h-3" />
              <span className="truncate max-w-[100px]">{currentUser?.nomeCompleto || currentUser?.username || operatorName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Bar */}
      <div className="px-3 sm:px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {currentScreen !== 'home' ? (
            <button
              onClick={() => onNavigate('home')}
              className="p-1.5 -ml-1 text-slate-300 hover:text-white hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors flex items-center gap-1 text-sm font-medium"
              id="btn-nav-back"
              title="Voltar ao Início"
            >
              <ArrowLeft className="w-5 h-5 text-emerald-400" />
              <span className="hidden sm:inline">Início</span>
            </button>
          ) : (
            <div className="p-1.5 bg-emerald-600 rounded-lg text-white shadow-sm">
              <Boxes className="w-5 h-5" />
            </div>
          )}

          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-white leading-tight flex items-center gap-2">
              {getScreenTitle()}
            </h1>
            {currentScreen === 'home' && (
              <p className="text-[11px] text-slate-400 font-medium">
                Controle de sementes e expedição via QR único
              </p>
            )}
          </div>
        </div>

        {/* Quick Nav Actions */}
        <div className="flex items-center gap-1">
          {currentScreen !== 'conferencia' && (
            <button
              onClick={() => onNavigate('conferencia')}
              className="p-2 text-slate-300 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
              title="Tela de Conferência"
              id="btn-header-conferencia"
            >
              <CheckCircle2 className="w-5 h-5" />
            </button>
          )}

          {currentScreen !== 'historico' && (
            <button
              onClick={() => onNavigate('historico')}
              className="p-2 text-slate-300 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
              title="Expedições Salvas"
              id="btn-header-historico"
            >
              <History className="w-5 h-5" />
            </button>
          )}

          {currentScreen !== 'usuarios' && (
            <button
              onClick={() => onNavigate('usuarios')}
              className="p-2 text-slate-300 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
              title="Criar e Gerenciar Acessos (Nome e Senha)"
              id="btn-header-usuarios"
            >
              <KeyRound className="w-5 h-5" />
            </button>
          )}

          {currentScreen !== 'configuracoes' && (
            <button
              onClick={() => onNavigate('configuracoes')}
              className="p-2 text-slate-300 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
              title="Configurações e Backup"
              id="btn-header-configuracoes"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}

          {/* Logout button */}
          <button
            onClick={onLogout}
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors ml-1"
            title="Sair do sistema"
            id="btn-header-logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
