import React, { useState } from 'react';
import { Usuario } from '../types';
import { loginUser } from '../utils/auth';
import { 
  Lock, 
  User, 
  Boxes, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  ArrowRight, 
  WifiOff, 
  AlertCircle,
  CheckCircle2,
  KeyRound
} from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: Usuario) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    setTimeout(() => {
      const res = loginUser(username, password);
      setIsLoading(false);

      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setErrorMsg(res.error || 'Credenciais inválidas. Verifique usuário e senha.');
      }
    }, 200);
  };

  const handleFillDemoAdmin = () => {
    setUsername('administrador');
    setPassword('123456');
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Subtle Gradient Accents */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-emerald-700/10 rounded-full blur-3xl pointer-events-none" />

      {/* Offline & Preview Ready Badge */}
      <div className="mb-6 flex items-center gap-2 bg-slate-900 border border-slate-800 text-emerald-400 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-inner">
        <WifiOff className="w-3.5 h-3.5" />
        <span>Ambiente Preview &middot; 100% Offline e Seguro</span>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6 relative z-10">
        {/* Branding & Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-emerald-600 text-white rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-emerald-900/30">
            <Boxes className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight pt-1">
            Conferência Expedição QR
          </h1>
          <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto">
            Sistema de controle de sementes, geração de QR Code compactado e conferência de carga.
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="bg-red-950/80 border border-red-500/50 rounded-2xl p-3.5 text-xs text-red-200 flex items-start gap-2.5 animate-in fade-in zoom-in-95">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Usuário Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Usuário
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Ex: administrador"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
                className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl text-sm font-medium text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                id="input-login-username"
              />
            </div>
          </div>

          {/* Senha Input (Masked) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Senha
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••"
                required
                className="w-full pl-10 pr-11 py-3 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl text-sm font-medium text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono"
                id="input-login-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Botão Entrar */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black py-3.5 px-4 rounded-xl text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition-all active:scale-[0.99] disabled:opacity-50 mt-2"
            id="btn-login-submit"
          >
            <span>{isLoading ? 'Autenticando...' : 'Entrar no Sistema'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Testing Credentials helper for AI Studio Preview */}
        <div className="pt-2 border-t border-slate-800">
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400 font-medium">
              <span className="flex items-center gap-1.5 text-slate-300 font-bold">
                <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                Acesso Inicial de Teste:
              </span>
              <button
                type="button"
                onClick={handleFillDemoAdmin}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold underline"
                id="btn-fill-demo-credentials"
              >
                Preencher dados
              </button>
            </div>
            <div className="text-[11px] text-slate-400 space-y-0.5 font-mono">
              <div>Usuário: <span className="text-slate-200 font-bold">administrador</span></div>
              <div>Senha: <span className="text-slate-400 tracking-widest font-black">••••••</span> <span className="text-slate-500 font-sans">(padrão: 123456)</span></div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Autenticação local segura &middot; Perfil Administrador</span>
        </div>
      </div>
    </div>
  );
};
