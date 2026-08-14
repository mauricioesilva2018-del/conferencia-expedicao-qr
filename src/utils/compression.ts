import { deflateSync, inflateSync, strToU8, strFromU8 } from 'fflate';
import { Expedicao, LoteItem } from '../types';

export const QR_PREFIX = 'EXPQR1:';
export const LOT_QR_PREFIX = 'LOTEQR1:';
export const MAX_SAFE_QR_BYTES = 2500; // Safe capacity for QR Code Version 40 (binary mode)

// Convert uint8Array to base64 safely
function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert base64 to uint8Array safely
function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export interface CompressionStats {
  originalBytes: number;
  compressedBytes: number;
  ratioPercent: number;
  isSafeSize: boolean;
  estimatedQrVersion: number;
}

/**
 * Encodes an expedition into a compressed base64 string prefixed with EXPQR1:
 * Including Nº do lote, Peneira, Categoria, Peso, Cultura, Cultivar
 */
export function encodeExpeditionToQR(expedicao: Expedicao): { payload: string; stats: CompressionStats } {
  // Ultra-compact structure
  const compactObject = {
    v: 2,
    id: expedicao.id,
    n: expedicao.numero,
    d: expedicao.data,
    c: expedicao.clienteDestino,
    pl: expedicao.caminhao,
    m: expedicao.motorista,
    r: expedicao.responsavel,
    st: expedicao.status,
    fe: expedicao.finalizadaEm || '',
    fp: expedicao.finalizadaPor || '',
    l: expedicao.lotes.map(item => [
      item.lote,
      item.peneira,
      item.categoria,
      item.peso,
      item.conferido ? 1 : 0,
      item.conferidoEm || '',
      item.conferidoPor || '',
      item.cultura || '',
      item.cultivar || ''
    ])
  };

  const jsonString = JSON.stringify(compactObject);
  const originalBytes = strToU8(jsonString);
  
  // Deflate with highest compression level (9)
  const compressed = deflateSync(originalBytes, { level: 9 });
  const base64 = uint8ToBase64(compressed);
  const payload = `${QR_PREFIX}${base64}`;

  const originalSize = originalBytes.length;
  const compressedSize = payload.length;
  const ratioPercent = Math.round((1 - compressedSize / originalSize) * 100);
  const isSafeSize = compressedSize <= MAX_SAFE_QR_BYTES;

  // Approximate QR Version estimation (from 1 to 40)
  let estimatedQrVersion = Math.min(40, Math.max(1, Math.ceil(compressedSize / 65)));

  const stats: CompressionStats = {
    originalBytes: originalSize,
    compressedBytes: compressedSize,
    ratioPercent: ratioPercent > 0 ? ratioPercent : 0,
    isSafeSize,
    estimatedQrVersion,
  };

  return { payload, stats };
}

/**
 * Encodes an individual Lot into a compact QR payload
 * Contains: Nº do lote, Peneira, Categoria, Peso, Cultura, Cultivar
 */
export function encodeSingleLotToQR(lot: LoteItem): string {
  const compactLot = {
    l: lot.lote,
    p: lot.peneira || '',
    c: lot.categoria || '',
    w: lot.peso || 0,
    cu: lot.cultura || '',
    cv: lot.cultivar || ''
  };
  const jsonString = JSON.stringify(compactLot);
  const originalBytes = strToU8(jsonString);
  const compressed = deflateSync(originalBytes, { level: 9 });
  return `${LOT_QR_PREFIX}${uint8ToBase64(compressed)}`;
}

export type ScannedResult = 
  | { type: 'expedition'; expedition: Expedicao }
  | { type: 'lot'; lot: LoteItem }
  | { type: 'raw_code'; code: string };

/**
 * Decodes any scanned QR code / Barcode payload
 */
export function decodeScannedCode(payload: string): ScannedResult {
  const trimmed = payload.trim();
  if (!trimmed) {
    throw new Error('Código vazio.');
  }

  // 1. Expedition QR (EXPQR1:)
  if (trimmed.startsWith(QR_PREFIX)) {
    return {
      type: 'expedition',
      expedition: decodeQRToExpedition(trimmed)
    };
  }

  // 2. Single Lot QR (LOTEQR1:)
  if (trimmed.startsWith(LOT_QR_PREFIX)) {
    try {
      const base64Data = trimmed.substring(LOT_QR_PREFIX.length);
      const compressedBytes = base64ToUint8(base64Data);
      const decompressedBytes = inflateSync(compressedBytes);
      const jsonString = strFromU8(decompressedBytes);
      const obj = JSON.parse(jsonString);

      return {
        type: 'lot',
        lot: {
          lote: String(obj.l || '').trim().toUpperCase(),
          peneira: String(obj.p || '5,75 mm'),
          categoria: String(obj.c || 'S1'),
          peso: Number(obj.w || 0),
          cultura: obj.cu ? String(obj.cu) : undefined,
          cultivar: obj.cv ? String(obj.cv) : undefined,
        }
      };
    } catch (err: any) {
      console.warn('Failed to parse single lot QR:', err);
    }
  }

  // 3. JSON format check (Expedition or Lot)
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const obj = JSON.parse(trimmed);
      if (obj.lotes && Array.isArray(obj.lotes)) {
        return {
          type: 'expedition',
          expedition: decodeQRToExpedition(trimmed)
        };
      }
      if (obj.lote || obj.l) {
        return {
          type: 'lot',
          lot: {
            lote: String(obj.lote || obj.l || '').trim().toUpperCase(),
            peneira: String(obj.peneira || obj.p || '5,75 mm'),
            categoria: String(obj.categoria || obj.cat || obj.c || 'S1'),
            peso: Number(obj.peso || obj.w || 0),
            cultura: obj.cultura || obj.cu || undefined,
            cultivar: obj.cultivar || obj.cv || undefined,
          }
        };
      }
    } catch {
      // Continue to text parsing
    }
  }

  // 4. Pipe or semicolon delimited string e.g. Lote | Peneira | Categoria | Peso | Cultura | Cultivar
  if (trimmed.includes('|') || trimmed.includes(';')) {
    const delimiter = trimmed.includes('|') ? '|' : ';';
    const parts = trimmed.split(delimiter).map(s => s.trim());
    if (parts.length >= 4) {
      const lote = parts[0].toUpperCase();
      const peneira = parts[1];
      const categoria = parts[2];
      const peso = parseFloat(parts[3].replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
      const cultura = parts[4] || undefined;
      const cultivar = parts[5] || undefined;
      return {
        type: 'lot',
        lot: {
          lote,
          peneira,
          categoria,
          peso,
          cultura,
          cultivar
        }
      };
    }
  }

  // 5. Raw lote string / barcode
  return {
    type: 'raw_code',
    code: trimmed.toUpperCase()
  };
}

/**
 * Decodes a QR code payload back into an Expedicao object
 */
export function decodeQRToExpedition(payload: string): Expedicao {
  const trimmed = payload.trim();

  // 1. Compressed EXPQR1 format
  if (trimmed.startsWith(QR_PREFIX)) {
    try {
      const base64Data = trimmed.substring(QR_PREFIX.length);
      const compressedBytes = base64ToUint8(base64Data);
      const decompressedBytes = inflateSync(compressedBytes);
      const jsonString = strFromU8(decompressedBytes);
      const obj = JSON.parse(jsonString);

      const lotes: LoteItem[] = (obj.l || []).map((arr: any[]) => ({
        lote: String(arr[0] ?? '').trim().toUpperCase(),
        peneira: String(arr[1] ?? ''),
        categoria: String(arr[2] ?? ''),
        peso: Number(arr[3] ?? 0),
        conferido: Boolean(arr[4]),
        conferidoEm: arr[5] ? String(arr[5]) : undefined,
        conferidoPor: arr[6] ? String(arr[6]) : undefined,
        cultura: arr[7] ? String(arr[7]) : undefined,
        cultivar: arr[8] ? String(arr[8]) : undefined,
      }));

      return {
        id: obj.id || `exp-${Date.now()}`,
        numero: obj.n || '001',
        data: obj.d || new Date().toISOString().split('T')[0],
        clienteDestino: obj.c || '',
        caminhao: obj.pl || '',
        motorista: obj.m || '',
        responsavel: obj.r || '',
        status: obj.st || 'pendente',
        finalizadaEm: obj.fe || undefined,
        finalizadaPor: obj.fp || undefined,
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
        lotes,
      };
    } catch (err: any) {
      throw new Error(`Falha ao descompactar QR Code da expedição: ${err.message || err}`);
    }
  }

  // 2. Direct JSON fallback (if generated uncompressed or copied)
  try {
    const directObj = JSON.parse(trimmed);
    if (directObj.lotes && Array.isArray(directObj.lotes)) {
      return {
        id: directObj.id || `exp-${Date.now()}`,
        numero: directObj.numero || '001',
        data: directObj.data || new Date().toISOString().split('T')[0],
        clienteDestino: directObj.clienteDestino || '',
        caminhao: directObj.caminhao || '',
        motorista: directObj.motorista || '',
        responsavel: directObj.responsavel || '',
        status: directObj.status || 'pendente',
        finalizadaEm: directObj.finalizadaEm,
        finalizadaPor: directObj.finalizadaPor,
        criadoEm: directObj.criadoEm || new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
        lotes: directObj.lotes.map((l: any) => ({
          lote: String(l.lote || '').trim().toUpperCase(),
          peneira: String(l.peneira || ''),
          categoria: String(l.categoria || ''),
          peso: Number(l.peso || 0),
          conferido: Boolean(l.conferido),
          conferidoEm: l.conferidoEm,
          conferidoPor: l.conferidoPor,
          cultura: l.cultura || undefined,
          cultivar: l.cultivar || undefined,
        })),
        divergencias: directObj.divergencias || undefined,
      };
    }
  } catch {
    // Not plain json, continue to custom text
  }

  throw new Error('Formato de QR Code não reconhecido como expedição de sementes.');
}
