import React, { useState, useRef, useEffect } from 'react';
import { AppSettings, ActiveScreen, Usuario, UserRole } from '../types';
import { 
  getStoredUsers, 
  changeUserPassword, 
  createNewUser, 
  deleteStoredUser 
} from '../utils/auth';
import { 
  Settings, 
  User, 
  Volume2, 
  VolumeX, 
  Vibrate, 
  Download, 
  Upload, 
  RotateCcw, 
  ShieldCheck, 
  Check, 
  Save, 
  AlertCircle,
  Database,
  Smartphone,
  Lock,
  KeyRound,
  UserPlus,
  Users,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react';

interface SettingsScreenProps {
  settings: AppSettings;
  currentUser: Usuario | null;
  onSaveSettings: (settings: AppSettings) => void;
  onExportBackup: () => void;
  onImportBackup: (jsonStr: string) => { success: boolean; count: number; error?: string };
  onResetToDefaultLots: () => void;
  onNavigate: (screen: ActiveScreen) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  currentUser,
  onSaveSettings,
  onExportBackup,
  onImportBackup,
  onResetToDefaultLots,
  onNavigate,
}) => {
  const [form, setForm] = useState<AppSettings>(settings);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [backupMsg, setBackupMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  // User Management State (Admin only)
  const [usersList, setUsersList] = useState<Usuario[]>([]);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('OPERADOR');
  const [userAdminMsg, setUserAdminMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isAdmin = currentUser?.role === 'ADMINISTRADOR';

  useEffect(() => {
    if (isAdmin) {
      setUsersList(getStoredUsers());
    }
  }, [isAdmin]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(form);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handlePasswordChangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (!currentUser) return;

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'A nova senha e a confirmação não coincidem.' });
      return;
    }

    const res = changeUserPassword(currentUser.id, currentPassword, newPassword, false);
    if (res.success) {
      setPasswordMsg({ type: 'success', text: 'Senha alterada com sucesso!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordMsg(null), 4000);
    } else {
      setPasswordMsg({ type: 'error', text: res.error || 'Erro ao alterar senha.' });
    }
  };

  const handleCreateUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUserAdminMsg(null);

    const res = createNewUser(newUserUsername, newUserName, newUserPassword, newUserRole);
    if (res.success) {
      setUserAdminMsg({ type: 'success', text: `Usuário "${newUserUsername}" criado com sucesso!` });
      setNewUserName('');
      setNewUserUsername('');
      setNewUserPassword('');
      setNewUserRole('OPERADOR');
      setIsAddUserOpen(false);
      setUsersList(getStoredUsers());
      setTimeout(() => setUserAdminMsg(null), 3500);
    } else {
      setUserAdminMsg({ type: 'error', text: res.error || 'Erro ao criar usuário.' });
    }
  };

  const handleDeleteUser = (userId: string, username: string) => {
    if (confirm(`Deseja realmente excluir o usuário "${username}"?`)) {
      const res = deleteStoredUser(userId);
      if (res.success) {
        setUserAdminMsg({ type: 'success', text: `Usuário "${username}" excluído.` });
        setUsersList(getStoredUsers());
      } else {
        setUserAdminMsg({ type: 'error', text: res.error || 'Erro ao excluir usuário.' });
      }
    }
  };

  const handleBackupFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      const res = onImportBackup(content);
      if (res.success) {
        setBackupMsg({ type: 'success', text: `Backup restaurado com sucesso! (${res.count} expedições carregadas).` });
      } else {
        setBackupMsg({ type: 'error', text: res.error || 'Erro ao importar backup.' });
      }
    };
    reader.readAsText(file);
  };

  const handleResetConfirm = () => {
    if (confirm('Deseja recarregar a base inicial com os 344 lotes padrão fornecidos? (Substitui os dados atuais).')) {
      onResetToDefaultLots();
      setBackupMsg({ type: 'success', text: 'Base de dados resetada com sucesso para os 344 lotes padrão!' });
    }
  };

  return (
    <div className="p-3 sm:p-6 max-w-2xl mx-auto space-y-5 pb-16">
      {/* User Info Banner */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-600/30 border border-emerald-500/40 text-emerald-400 flex items-center justify-center flex-shrink-0">
            <User className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white leading-tight">
                {currentUser?.nomeCompleto || currentUser?.username || 'Usuário'}
              </h2>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                isAdmin ? 'bg-emerald-500 text-slate-950' : 'bg-blue-500 text-white'
              }`}>
                {currentUser?.role || 'OPERADOR'}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              @{currentUser?.username || 'admin'} &middot; Acesso autorizado
            </p>
          </div>
        </div>
      </div>

      {/* Alterar Senha Card */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-emerald-600" />
            Segurança & Alteração de Senha
          </h3>
          <button
            type="button"
            onClick={() => setShowPasswordFields(!showPasswordFields)}
            className="text-xs text-emerald-700 hover:text-emerald-800 font-bold"
          >
            {showPasswordFields ? 'Ocultar campos' : 'Alterar minha senha'}
          </button>
        </div>

        {passwordMsg && (
          <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
            passwordMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-red-50 text-red-800 border-red-300'
          }`}>
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            <span>{passwordMsg.text}</span>
          </div>
        )}

        {showPasswordFields && (
          <form onSubmit={handlePasswordChangeSubmit} className="space-y-3 pt-1 animate-in fade-in duration-150">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                SENHA ATUAL
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
                placeholder="••••••"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm font-mono focus:ring-2 focus:ring-emerald-500"
                id="input-change-pwd-current"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  NOVA SENHA
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  placeholder="Mínimo 4 dígitos"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm font-mono focus:ring-2 focus:ring-emerald-500"
                  id="input-change-pwd-new"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  CONFIRMAR NOVA SENHA
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Repita a nova senha"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm font-mono focus:ring-2 focus:ring-emerald-500"
                  id="input-change-pwd-confirm"
                />
              </div>
            </div>

            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow"
              id="btn-salvar-nova-senha"
            >
              <Save className="w-3.5 h-3.5" />
              Salvar Nova Senha
            </button>
          </form>
        )}
      </div>

      {/* Operator & Feedback Form */}
      <form onSubmit={handleSave} className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
          <User className="w-4 h-4 text-emerald-600" />
          Operador e Preferências de Conferência
        </h3>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            NOME DO OPERADOR PADRÃO (ARMAZÉM)
          </label>
          <input
            type="text"
            value={form.operadorPadrao}
            onChange={e => setForm({ ...form, operadorPadrao: e.target.value })}
            placeholder="Ex: Maurício Silva / Conferente 1"
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
            id="input-settings-operador"
          />
          <span className="text-[11px] text-slate-500 mt-1 block">
            Este nome será gravado automaticamente ao conferir cada lote.
          </span>
        </div>

        {/* Toggles */}
        <div className="space-y-3 pt-2">
          {/* Som Ativado */}
          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">Sons e Bips de Alerta</span>
                <span className="text-[11px] text-slate-500">Sons sintetizados offline para acerto e erro</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={form.somAtivado}
              onChange={e => setForm({ ...form, somAtivado: e.target.checked })}
              className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500"
            />
          </label>

          {/* Vibração Háptica */}
          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">Vibração Háptica no Celular</span>
                <span className="text-[11px] text-slate-500">Vibra ao confirmar leitura e alerta de lote incorreto</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={form.vibracaoAtivada}
              onChange={e => setForm({ ...form, vibracaoAtivada: e.target.checked })}
              className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500"
            />
          </label>

          {/* Auto conferir */}
          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-800">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">Auto-Conferir ao Encontrar Lote</span>
                <span className="text-[11px] text-slate-500">Marca conferido imediatamente após digitação/scan exato</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={form.autoConferirAoDigitar}
              onChange={e => setForm({ ...form, autoConferirAoDigitar: e.target.checked })}
              className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500"
            />
          </label>
        </div>

        {/* Save button */}
        <div className="pt-2">
          <button
            type="submit"
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow"
            id="btn-salvar-settings"
          >
            {savedSuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
            {savedSuccess ? 'Configurações Salvas!' : 'Salvar Preferências'}
          </button>
        </div>
      </form>

      {/* ADMIN ONLY: User Management */}
      {isAdmin && (
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                Gerenciamento de Acessos & Senhas
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Crie acessos para operadores informando apenas <strong>Nome e Senha</strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigate('usuarios')}
                className="text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow"
                id="btn-abrir-modulo-acessos"
              >
                <KeyRound className="w-3.5 h-3.5" />
                Abrir Módulo de Acessos
              </button>
            </div>
          </div>

          {userAdminMsg && (
            <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
              userAdminMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-red-50 text-red-800 border-red-300'
            }`}>
              <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              <span>{userAdminMsg.text}</span>
            </div>
          )}

          {isAddUserOpen && (
            <form onSubmit={handleCreateUserSubmit} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="text-xs font-bold text-slate-900 uppercase">Cadastrar Novo Usuário</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    value={newUserName}
                    onChange={e => setNewUserName(e.target.value)}
                    required
                    placeholder="Ex: Carlos Oliveira"
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Nome de Usuário (login)</label>
                  <input
                    type="text"
                    value={newUserUsername}
                    onChange={e => setNewUserUsername(e.target.value)}
                    required
                    placeholder="Ex: operador1"
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Senha Inicial</label>
                  <input
                    type="password"
                    value={newUserPassword}
                    onChange={e => setNewUserPassword(e.target.value)}
                    required
                    placeholder="••••••"
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Perfil de Acesso</label>
                  <select
                    value={newUserRole}
                    onChange={e => setNewUserRole(e.target.value as UserRole)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold"
                  >
                    <option value="OPERADOR">OPERADOR (Conferência & Leitura)</option>
                    <option value="ADMINISTRADOR">ADMINISTRADOR (Acesso Total)</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-2 px-3 rounded-lg shadow"
                id="btn-cadastrar-usuario-confirm"
              >
                Cadastrar Usuário
              </button>
            </form>
          )}

          {/* List of Users */}
          <div className="space-y-2">
            {usersList.map(u => (
              <div
                key={u.id}
                className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span>{u.nomeCompleto}</span>
                    <span className="text-slate-400 font-mono text-[11px]">(@{u.username})</span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-black ${
                      u.role === 'ADMINISTRADOR' ? 'bg-emerald-200 text-emerald-950' : 'bg-blue-100 text-blue-900'
                    }`}>
                      {u.role}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Criado em: {new Date(u.criadoEm).toLocaleDateString('pt-BR')}
                  </div>
                </div>

                {u.username !== 'administrador' && (
                  <button
                    type="button"
                    onClick={() => handleDeleteUser(u.id, u.username)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                    title="Excluir usuário"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Backup and Data Management */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
          <Database className="w-4 h-4 text-purple-600" />
          Backup e Portabilidade Offline
        </h3>

        {backupMsg && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
              backupMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-red-50 text-red-800 border-red-300'
            }`}
          >
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            <span>{backupMsg.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Exportar Backup */}
          <button
            type="button"
            onClick={onExportBackup}
            className="p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl text-left flex items-center gap-3 transition-colors"
            id="btn-exportar-backup-json"
          >
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block">Exportar Backup JSON</span>
              <span className="text-[11px] text-slate-500">Salvar cópia de todas as expedições</span>
            </div>
          </button>

          {/* Importar Backup */}
          <button
            type="button"
            disabled={!isAdmin}
            onClick={() => fileInputRef.current?.click()}
            className={`p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-left flex items-center gap-3 transition-colors ${
              isAdmin ? 'hover:bg-slate-100 cursor-pointer' : 'opacity-50 cursor-not-allowed'
            }`}
            id="btn-importar-backup-json"
          >
            <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block">Restaurar Backup JSON</span>
              <span className="text-[11px] text-slate-500">Carregar arquivo de backup salvo</span>
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleBackupFileSelect}
            className="hidden"
          />
        </div>

        {/* Reset Database Button */}
        {isAdmin && (
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleResetConfirm}
              className="w-full text-xs font-bold text-slate-700 hover:text-emerald-800 bg-slate-100 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
              id="btn-restaurar-base-344-lotes"
            >
              <RotateCcw className="w-4 h-4 text-emerald-600" />
              Restaurar Base Padrão com os 344 Lotes Fornecidos
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
