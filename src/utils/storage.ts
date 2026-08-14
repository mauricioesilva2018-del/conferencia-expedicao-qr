import { Expedicao, AppSettings } from '../types';
import { DEFAULT_INITIAL_EXPEDITION } from '../data/initialLots';

const STORAGE_KEYS = {
  EXPEDITIONS: 'conferencia_expedicoes_v1',
  ACTIVE_ID: 'conferencia_active_exp_id_v1',
  SETTINGS: 'conferencia_settings_v1',
};

export const DEFAULT_SETTINGS: AppSettings = {
  operadorPadrao: 'Operador Armazém 1',
  somAtivado: true,
  vibracaoAtivada: true,
  autoConferirAoDigitar: false,
  confirmarDesfazer: true,
};

export function getSavedSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Error loading settings:', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving settings:', e);
  }
}

export function getAllExpeditions(): Expedicao[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EXPEDITIONS);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) {
        return list;
      }
    }
  } catch (e) {
    console.error('Error reading expeditions from localStorage:', e);
  }

  // Initialize with the default initial 344-lot expedition if first time
  const initialList: Expedicao[] = [DEFAULT_INITIAL_EXPEDITION];
  saveAllExpeditions(initialList);
  return initialList;
}

export function saveAllExpeditions(expeditions: Expedicao[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.EXPEDITIONS, JSON.stringify(expeditions));
  } catch (e) {
    console.error('Error saving expeditions to localStorage:', e);
  }
}

export function getExpeditionById(id: string): Expedicao | null {
  const all = getAllExpeditions();
  return all.find(e => e.id === id) || null;
}

export function saveOrUpdateExpedition(exp: Expedicao): void {
  const all = getAllExpeditions();
  const index = all.findIndex(e => e.id === exp.id);
  const updatedExp = {
    ...exp,
    atualizadoEm: new Date().toISOString(),
  };

  if (index >= 0) {
    all[index] = updatedExp;
  } else {
    all.unshift(updatedExp);
  }

  saveAllExpeditions(all);
}

export function deleteExpedition(id: string): void {
  const all = getAllExpeditions().filter(e => e.id !== id);
  saveAllExpeditions(all);
  const activeId = getActiveExpeditionId();
  if (activeId === id) {
    setActiveExpeditionId(all.length > 0 ? all[0].id : null);
  }
}

export function getActiveExpeditionId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_ID);
  } catch {
    return null;
  }
}

export function setActiveExpeditionId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_ID, id);
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_ID);
    }
  } catch (e) {
    console.error('Error setting active expedition id:', e);
  }
}

export function exportFullBackupJSON(): string {
  const all = getAllExpeditions();
  const settings = getSavedSettings();
  return JSON.stringify({
    versao: '1.0',
    dataExportacao: new Date().toISOString(),
    expedicoes: all,
    configuracoes: settings,
  }, null, 2);
}

export function importFullBackupJSON(jsonStr: string): { success: boolean; count: number; error?: string } {
  try {
    const data = JSON.parse(jsonStr);
    if (!data.expedicoes || !Array.isArray(data.expedicoes)) {
      return { success: false, count: 0, error: 'Formato de arquivo inválido: lista de expedições ausente.' };
    }

    const current = getAllExpeditions();
    const existingIds = new Set(current.map(c => c.id));
    let addedCount = 0;

    for (const exp of data.expedicoes) {
      if (exp.id && exp.numero && Array.isArray(exp.lotes)) {
        if (!existingIds.has(exp.id)) {
          current.push(exp);
          addedCount++;
        } else {
          const idx = current.findIndex(c => c.id === exp.id);
          current[idx] = exp;
          addedCount++;
        }
      }
    }

    saveAllExpeditions(current);
    if (data.configuracoes) {
      saveSettings(data.configuracoes);
    }

    return { success: true, count: addedCount };
  } catch (err: any) {
    return { success: false, count: 0, error: err.message || 'JSON inválido' };
  }
}

export function resetToInitialDatabase(): void {
  saveAllExpeditions([DEFAULT_INITIAL_EXPEDITION]);
  setActiveExpeditionId(DEFAULT_INITIAL_EXPEDITION.id);
}
