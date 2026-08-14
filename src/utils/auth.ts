import { Usuario, UserRole } from '../types';

const AUTH_STORAGE_KEYS = {
  USERS: 'conferencia_users_v1',
  SESSION: 'conferencia_auth_session_v1',
};

// Initial default administrator user as requested
export const DEFAULT_ADMIN_USER: Usuario = {
  id: 'usr-admin-initial',
  username: 'administrador',
  nomeCompleto: 'Administrador',
  senha: '123456',
  role: 'ADMINISTRADOR',
  criadoEm: '2025-01-01T00:00:00.000Z',
};

export function getStoredUsers(): Usuario[] {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEYS.USERS);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) {
        return list;
      }
    }
  } catch (e) {
    console.error('Erro ao ler usuários:', e);
  }

  // If no users exist, initialize with default administrator
  const initialUsers: Usuario[] = [DEFAULT_ADMIN_USER];
  saveStoredUsers(initialUsers);
  return initialUsers;
}

export function saveStoredUsers(users: Usuario[]): void {
  try {
    localStorage.setItem(AUTH_STORAGE_KEYS.USERS, JSON.stringify(users));
  } catch (e) {
    console.error('Erro ao salvar usuários:', e);
  }
}

export function getCurrentUser(): Usuario | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEYS.SESSION);
    if (raw) {
      const user = JSON.parse(raw);
      // Validate that user still exists in database
      const users = getStoredUsers();
      const current = users.find(u => u.id === user.id || u.username.toLowerCase() === user.username.toLowerCase());
      if (current) {
        // Return without exposed password in runtime session
        const { senha, ...safeUser } = current;
        return safeUser as Usuario;
      }
    }
  } catch (e) {
    console.error('Erro ao ler sessão do usuário:', e);
  }
  return null;
}

export function loginUser(usernameInput: string, passwordInput: string): { success: boolean; user?: Usuario; error?: string } {
  const cleanUsername = usernameInput.trim().toLowerCase();
  const cleanPassword = passwordInput.trim();

  if (!cleanUsername || !cleanPassword) {
    return { success: false, error: 'Informe usuário e senha para acessar.' };
  }

  const users = getStoredUsers();
  const matched = users.find(u => u.username.toLowerCase() === cleanUsername);

  if (!matched) {
    return { success: false, error: 'Usuário não encontrado.' };
  }

  if (matched.senha !== cleanPassword) {
    return { success: false, error: 'Senha incorreta.' };
  }

  // Update last access
  matched.ultimoAcesso = new Date().toISOString();
  saveStoredUsers(users);

  // Save session
  const { senha, ...safeUser } = matched;
  try {
    localStorage.setItem(AUTH_STORAGE_KEYS.SESSION, JSON.stringify(safeUser));
  } catch (e) {
    console.error('Erro ao salvar sessão:', e);
  }

  return { success: true, user: safeUser as Usuario };
}

export function logoutUser(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEYS.SESSION);
  } catch (e) {
    console.error('Erro ao efetuar logout:', e);
  }
}

export function changeUserPassword(
  userId: string, 
  currentPasswordInput: string, 
  newPasswordInput: string,
  isAdminOverride: boolean = false
): { success: boolean; error?: string } {
  const cleanNew = newPasswordInput.trim();
  if (cleanNew.length < 4) {
    return { success: false, error: 'A nova senha deve ter no mínimo 4 caracteres.' };
  }

  const users = getStoredUsers();
  const userIndex = users.findIndex(u => u.id === userId);

  if (userIndex === -1) {
    return { success: false, error: 'Usuário não encontrado.' };
  }

  const user = users[userIndex];

  if (!isAdminOverride) {
    if (user.senha !== currentPasswordInput.trim()) {
      return { success: false, error: 'Senha atual incorreta.' };
    }
  }

  user.senha = cleanNew;
  users[userIndex] = user;
  saveStoredUsers(users);

  return { success: true };
}

export function createNewUser(
  username: string, 
  nomeCompleto: string, 
  senha: string, 
  role: UserRole
): { success: boolean; user?: Usuario; error?: string } {
  const cleanUsername = username.trim().toLowerCase();
  const cleanNome = nomeCompleto.trim();
  const cleanSenha = senha.trim();

  if (!cleanUsername || cleanUsername.length < 3) {
    return { success: false, error: 'O nome de usuário deve ter no mínimo 3 caracteres.' };
  }

  if (!cleanNome) {
    return { success: false, error: 'Informe o nome completo do operador/usuário.' };
  }

  if (cleanSenha.length < 4) {
    return { success: false, error: 'A senha deve ter no mínimo 4 caracteres.' };
  }

  const users = getStoredUsers();
  if (users.some(u => u.username.toLowerCase() === cleanUsername)) {
    return { success: false, error: 'Este nome de usuário já está em uso.' };
  }

  const newUser: Usuario = {
    id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    username: cleanUsername,
    nomeCompleto: cleanNome,
    senha: cleanSenha,
    role,
    criadoEm: new Date().toISOString(),
  };

  users.push(newUser);
  saveStoredUsers(users);

  const { senha: _, ...safeUser } = newUser;
  return { success: true, user: safeUser as Usuario };
}

export function deleteStoredUser(userId: string): { success: boolean; error?: string } {
  const users = getStoredUsers();
  const userToDelete = users.find(u => u.id === userId);

  if (!userToDelete) {
    return { success: false, error: 'Usuário não encontrado.' };
  }

  if (userToDelete.username === 'administrador') {
    return { success: false, error: 'Não é permitido excluir o usuário administrador principal.' };
  }

  const remaining = users.filter(u => u.id !== userId);
  saveStoredUsers(remaining);
  return { success: true };
}
