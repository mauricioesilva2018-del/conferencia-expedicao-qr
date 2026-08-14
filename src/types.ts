export interface LoteItem {
  lote: string;
  peneira: string;
  categoria: string;
  peso: number;
  cultura?: string;
  cultivar?: string;
  conferido?: boolean;
  conferidoEm?: string; // ISO String
  conferidoPor?: string;
}

export interface DivergenciaItem {
  id: string;
  loteLido: string;
  dataHora: string; // ISO String
  operador: string;
  motivo: string;
  cultura?: string;
  cultivar?: string;
  peneira?: string;
  categoria?: string;
  peso?: number;
}

export interface Expedicao {
  id: string;
  numero: string;
  data: string; // YYYY-MM-DD
  clienteDestino: string;
  caminhao: string;
  motorista: string;
  responsavel: string;
  status: 'pendente' | 'em_conferencia' | 'finalizada';
  criadoEm: string;
  atualizadoEm: string;
  finalizadaEm?: string;
  finalizadaPor?: string;
  lotes: LoteItem[];
  divergencias?: DivergenciaItem[];
}

export interface ImportValidationResult {
  lotesValidos: LoteItem[];
  erros: { linha: number; texto: string; motivo: string }[];
  duplicados: { lote: string; ocorrencias: number }[];
  totalPeso: number;
  totalImportados: number;
}

export interface AppSettings {
  operadorPadrao: string;
  somAtivado: boolean;
  vibracaoAtivada: boolean;
  autoConferirAoDigitar: boolean;
  confirmarDesfazer: boolean;
}

export type UserRole = 'ADMINISTRADOR' | 'OPERADOR';

export interface Usuario {
  id: string;
  username: string;
  nomeCompleto: string;
  senha?: string;
  role: UserRole;
  criadoEm: string;
  ultimoAcesso?: string;
}

export type ActiveScreen = 
  | 'home' 
  | 'nova_expedicao' 
  | 'editar_expedicao' 
  | 'qr_code' 
  | 'conferencia' 
  | 'historico' 
  | 'importar' 
  | 'configuracoes'
  | 'usuarios';
