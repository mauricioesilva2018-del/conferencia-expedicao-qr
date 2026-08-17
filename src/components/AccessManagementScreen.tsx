import React, { useState, useEffect, useRef } from 'react';
import { Usuario, UserRole, ActiveScreen } from '../types';
import { 
  getStoredUsers, 
  createSimpleAccess, 
  deleteStoredUser, 
  changeUserPassword 
} from '../utils/auth';
import { 
  Users, 
  UserPlus, 
  KeyRound, 
  ShieldCheck, 
  User, 
  Trash2, 
  Check, 
  Copy, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  AlertCircle, 
  Sparkles, 
  Search, 
  Lock,
  RotateCcw,
  CheckCircle2
} from 'lucide-react';

interface AccessManagementScreenProps {
  currentUser: Usuario | null;
  onNavigate: (screen: ActiveScreen) => void;
}

export const AccessManagementScreen: React.FC<AccessManagementScreenProps> = ({
  currentUser,
  onNavigate,
}) => {
  // Form fields: Just Name and Password!
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [role, setRole] = useState<UserRole>('OPERADOR');
  const [showPassword, setShowPassword] = useState(false);

  // States for feedback and lists
  const [usersList, setUsersList] = useState<Usuario[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [lastCreatedUser, setLastCreatedUser] = useState<{ nome: string; username: string; senha: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Quick Change Password Modal / State
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newQuickPassword, setNewQuickPassword] = useState('');
  const [showQuickPass, setShowQuickPass] = useState(false);

  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    const list = getStoredUsers();
    setUsersList(list);
  };

  const handleCreateAccess = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMsg(null);
    setLastCreatedUser(null);

    if (!nome.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Por favor, digite o nome do operador ou usuário.' });
      nameInputRef.current?.focus();
      return;
    }

    if (!senha.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Por favor, digite uma senha de acesso.' });
      return;
    }

    const res = createSimpleAccess(nome, senha, role);

    if (res.success && res.user) {
      setLastCreatedUser({
        nome: res.user.nomeCompleto,
        username: res.user.username,
        senha: senha.trim(),
      });

      setFeedbackMsg({
        type: 'success',
        text: `✅ Acesso para "${res.user.nomeCompleto}" criado com sucesso!`,
      });

      // Clear form and reload list
      setNome('');
      setSenha('');
      setRole('OPERADOR');
      loadUsers();

      // Refocus name input for fast consecutive registrations
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    } else {
      setFeedbackMsg({
        type: 'error',
        text: res.error || 'Não foi possível criar o acesso. Verifique os dados.',
      });
    }
  };

  const handleDelete = (userToDelete: Usuario) => {
    if (userToDelete.username === 'administrador') {
      alert('O usuário Administrador principal não pode ser excluído.');
      return;
    }

    if (confirm(`Tem certeza que deseja excluir o acesso de "${userToDelete.nomeCompleto}"?`)) {
      const res = deleteStoredUser(userToDelete.id);
      if (res.success) {
        setFeedbackMsg({ type: 'success', text: `Acesso de "${userToDelete.nomeCompleto}" removido.` });
        loadUsers();
      } else {
        setFeedbackMsg({ type: 'error', text: res.error || 'Erro ao excluir usuário.' });
      }
    }
  };

  const handleSaveQuickPassword = (userId: string) => {
    if (!newQuickPassword.trim() || newQuickPassword.trim().length < 3) {
      alert('A nova senha deve ter no mínimo 3 caracteres.');
      return;
    }

    const res = changeUserPassword(userId, '', newQuickPassword.trim(), true);
    if (res.success) {
      setFeedbackMsg({ type: 'success', text: 'Senha atualizada com sucesso!' });
      setEditingUserId(null);
      setNewQuickPassword('');
      loadUsers();
    } else {
      alert(res.error || 'Erro ao alterar a senha.');
    }
  };

  const handleCopyCredentials = (user: Usuario, explicitPassword?: string) => {
    const textToCopy = `Acesso Sistema Conferência:\nNome/Usuário: ${user.nomeCompleto} (${user.username})\nSenha: ${explicitPassword || 'Definida pelo administrador'}\nPerfil: ${user.role}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(user.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filteredUsers = usersList.filter(u => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      u.nomeCompleto.toLowerCase().includes(term) ||
      u.username.toLowerCase().includes(term) ||
      u.role.toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5 pb-16">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 text-white p-4 sm:p-5 rounded-3xl shadow-lg border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Gerenciador de Acessos
            </h1>
            <p className="text-xs text-slate-400">
              Crie logins para operadores e administradores com apenas <strong>Nome e Senha</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-mono font-bold">
            {usersList.length} Acesso(s) Ativo(s)
          </span>
        </div>
      </div>

      {/* Alert Messages */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-2xl text-xs sm:text-sm font-medium flex items-center gap-3 shadow-md animate-in fade-in ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <Check className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="flex-1">{feedbackMsg.text}</span>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-white/80 hover:text-white p-1"
          >
            &times;
          </button>
        </div>
      )}

      {/* SUCCESS BANNER OF CREATED USER */}
      {lastCreatedUser && (
        <div className="bg-emerald-50 border-2 border-emerald-500 rounded-3xl p-5 shadow-md space-y-3 animate-in zoom-in-95">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-950 font-black text-sm sm:text-base">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              <span>NOVO ACESSO PRONTO PARA USO!</span>
            </div>
            <button
              onClick={() => {
                const text = `Acesso Sistema:\nUsuário/Nome: ${lastCreatedUser.nome}\nLogin: ${lastCreatedUser.username}\nSenha: ${lastCreatedUser.senha}`;
                navigator.clipboard.writeText(text);
                alert('Dados de acesso copiados para a área de transferência!');
              }}
              className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow"
            >
              <Copy className="w-3.5 h-3.5" />
              Copiar Acesso
            </button>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-emerald-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block">Nome / Usuário:</span>
              <strong className="text-slate-900 text-sm">{lastCreatedUser.nome}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Identificador de Login:</span>
              <strong className="font-mono text-emerald-700 text-sm font-black">{lastCreatedUser.username}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Senha:</span>
              <strong className="font-mono text-slate-900 text-sm font-black bg-slate-100 px-2 py-0.5 rounded">
                {lastCreatedUser.senha}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CARD: CRIAR NOVO ACESSO COM NOME E SENHA */}
      <div className="bg-white border-2 border-slate-300 focus-within:border-emerald-500 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              Criar Novo Acesso
            </h2>
            <p className="text-xs text-slate-500">
              Basta preencher o <strong>Nome</strong> e a <strong>Senha</strong> do operador
            </p>
          </div>
        </div>

        <form onSubmit={handleCreateAccess} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. CAMPO NOME */}
            <div className="space-y-1.5">
              <label 
                htmlFor="input-novo-acesso-nome"
                className="block text-xs font-black uppercase tracking-wider text-slate-800"
              >
                1. Nome do Operador / Usuário <span className="text-emerald-600">*</span>
              </label>
              <div className="relative">
                <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  ref={nameInputRef}
                  id="input-novo-acesso-nome"
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Ex: Mauricio, João Silva, Conferente 1"
                  required
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 focus:bg-white border-2 border-slate-200 focus:border-emerald-600 rounded-2xl text-slate-900 font-bold text-sm sm:text-base focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all shadow-inner"
                />
              </div>
            </div>

            {/* 2. CAMPO SENHA */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label 
                  htmlFor="input-novo-acesso-senha"
                  className="block text-xs font-black uppercase tracking-wider text-slate-800"
                >
                  2. Senha <span className="text-emerald-600">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setSenha('123456')}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                >
                  Usar padrão "123456"
                </button>
              </div>

              <div className="relative">
                <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="input-novo-acesso-senha"
                  type={showPassword ? 'text' : 'password'}
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  placeholder="Digite a senha"
                  required
                  className="w-full pl-11 pr-12 py-3.5 bg-slate-50 focus:bg-white border-2 border-slate-200 focus:border-emerald-600 rounded-2xl text-slate-900 font-mono font-bold text-sm sm:text-base focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                  title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          {/* PERFIL SIMPLES */}
          <div className="space-y-1.5 pt-1">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
              Tipo de Perfil de Acesso:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('OPERADOR')}
                className={`py-3 px-4 rounded-2xl border-2 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                  role === 'OPERADOR'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <User className="w-4 h-4 text-emerald-600" />
                <span>👤 OPERADOR (Padrão)</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('ADMINISTRADOR')}
                className={`py-3 px-4 rounded-2xl border-2 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                  role === 'ADMINISTRADOR'
                    ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>🛡️ ADMINISTRADOR</span>
              </button>
            </div>
          </div>

          {/* BOTÃO GRANDE DE CRIAÇÃO */}
          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black py-4 px-6 rounded-2xl shadow-lg flex items-center justify-center gap-2.5 text-base sm:text-lg transition-transform active:scale-[0.99] cursor-pointer mt-2"
            id="btn-criar-novo-acesso"
          >
            <UserPlus className="w-6 h-6" />
            <span>➕ CRIAR ACESSO AGORA</span>
          </button>
        </form>
      </div>

      {/* LISTA DE ACESSOS CADASTRADOS */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-700" />
            <h3 className="font-black text-slate-900 text-base">
              Acessos Cadastrados no Sistema ({filteredUsers.length})
            </h3>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome ou usuário..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
            />
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center text-slate-400 border border-slate-200 space-y-2">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="font-bold text-slate-700">Nenhum acesso encontrado</div>
            <p className="text-xs text-slate-500">
              Utilize o formulário acima para cadastrar novos operadores com nome e senha.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map(user => {
              const isAdmin = user.role === 'ADMINISTRADOR';
              const isDefaultAdmin = user.username === 'administrador';
              const isEditingThis = editingUserId === user.id;

              return (
                <div
                  key={user.id}
                  className="bg-white border-2 border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start sm:items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 font-black ${
                          isAdmin
                            ? 'bg-slate-900 text-emerald-400'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isAdmin ? <ShieldCheck className="w-6 h-6" /> : <User className="w-6 h-6" />}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-black text-slate-900 text-base sm:text-lg">
                            {user.nomeCompleto}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              isAdmin
                                ? 'bg-slate-900 text-emerald-400'
                                : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            }`}
                          >
                            {user.role}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                          <span>
                            Login: <strong className="font-mono text-slate-800 font-bold">{user.username}</strong>
                          </span>
                          <span>&bull;</span>
                          <span>
                            Cadastrado em: {new Date(user.criadoEm).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleCopyCredentials(user)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 px-3 rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors"
                        title="Copiar dados de acesso"
                      >
                        {copiedId === user.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700">Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (isEditingThis) {
                            setEditingUserId(null);
                            setNewQuickPassword('');
                          } else {
                            setEditingUserId(user.id);
                            setNewQuickPassword('');
                          }
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 px-3 rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors"
                        title="Alterar senha deste usuário"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{isEditingThis ? 'Cancelar' : 'Nova Senha'}</span>
                      </button>

                      {!isDefaultAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDelete(user)}
                          className="bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold py-2 px-3 rounded-xl border border-red-200 flex items-center gap-1.5 transition-colors"
                          title="Excluir este acesso"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* QUICK PASSWORD CHANGE DRAWER */}
                  {isEditingThis && (
                    <div className="bg-slate-50 border-2 border-emerald-500/40 rounded-2xl p-3.5 space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-800 uppercase">
                          Definir Nova Senha para "{user.nomeCompleto}":
                        </span>
                        <button
                          type="button"
                          onClick={() => setNewQuickPassword('123456')}
                          className="text-[11px] font-bold text-emerald-700 underline"
                        >
                          Definir "123456"
                        </button>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-1">
                          <input
                            type={showQuickPass ? 'text' : 'password'}
                            value={newQuickPassword}
                            onChange={e => setNewQuickPassword(e.target.value)}
                            placeholder="Digite a nova senha..."
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowQuickPass(!showQuickPass)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                          >
                            {showQuickPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSaveQuickPassword(user.id)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow flex items-center justify-center gap-1.5"
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          Salvar Senha
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
