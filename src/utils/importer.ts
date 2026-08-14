import * as XLSX from 'xlsx';
import { LoteItem, ImportValidationResult } from '../types';

/**
 * Parses raw text or array buffer into validated LoteItem list with diagnostics
 */
export function validateAndParseLots(data: string | ArrayBuffer): ImportValidationResult {
  const rawRows: string[][] = [];

  if (typeof data === 'string') {
    // CSV / TSV / pipe-delimited text
    const lines = data.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      let cols: string[] = [];
      if (trimmed.includes('|')) {
        cols = trimmed.split('|').map(c => c.trim());
      } else if (trimmed.includes(';')) {
        cols = trimmed.split(';').map(c => c.trim());
      } else if (trimmed.includes('\t')) {
        cols = trimmed.split('\t').map(c => c.trim());
      } else if (trimmed.includes(',')) {
        // Simple comma split (assuming no quoted inner commas)
        cols = trimmed.split(',').map(c => c.trim());
      } else {
        cols = trimmed.split(/\s{2,}/).map(c => c.trim());
      }
      rawRows.push(cols);
    }
  } else {
    // Excel workbook buffer (XLSX / XLS)
    try {
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const sheetData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      for (const row of sheetData) {
        if (Array.isArray(row) && row.some(cell => String(cell).trim() !== '')) {
          rawRows.push(row.map(c => String(c ?? '').trim()));
        }
      }
    } catch (err) {
      console.error('Error parsing excel binary:', err);
    }
  }

  const lotesValidos: LoteItem[] = [];
  const erros: { linha: number; texto: string; motivo: string }[] = [];
  const loteCountMap = new Map<string, number>();

  let rowIndex = 0;
  for (const cols of rawRows) {
    rowIndex++;
    // Check if header row (e.g. contains words like 'lote', 'peneira', 'categoria', 'peso')
    const firstColLower = cols[0]?.toLowerCase() || '';
    if (
      rowIndex === 1 &&
      (firstColLower.includes('lote') || firstColLower.includes('batch') || firstColLower.includes('item'))
    ) {
      continue; // Skip header
    }

    if (cols.length < 4) {
      erros.push({
        linha: rowIndex,
        texto: cols.join(' | '),
        motivo: `Colunas insuficientes (${cols.length}/4). Esperado: Lote | Peneira | Categoria | Peso.`,
      });
      continue;
    }

    const lote = cols[0].trim().toUpperCase();
    const peneira = cols[1].trim();
    const categoria = cols[2].trim();
    const rawPeso = cols[3].trim().replace(/[^\d.,]/g, '').replace(',', '.');
    const peso = parseFloat(rawPeso);
    const cultura = cols[4] ? cols[4].trim() : undefined;
    const cultivar = cols[5] ? cols[5].trim() : undefined;

    if (!lote) {
      erros.push({
        linha: rowIndex,
        texto: cols.join(' | '),
        motivo: 'Número do lote está vazio.',
      });
      continue;
    }

    if (isNaN(peso) || peso <= 0) {
      erros.push({
        linha: rowIndex,
        texto: cols.join(' | '),
        motivo: `Peso inválido ou zerado: "${cols[3]}".`,
      });
      continue;
    }

    // Register occurrence for duplicate checking
    const curCount = loteCountMap.get(lote) || 0;
    loteCountMap.set(lote, curCount + 1);

    lotesValidos.push({
      lote,
      peneira: peneira || '5,75 mm',
      categoria: categoria || 'S1',
      peso,
      cultura: cultura || 'Soja',
      cultivar: cultivar || undefined,
      conferido: false,
    });
  }

  const duplicados: { lote: string; ocorrencias: number }[] = [];
  loteCountMap.forEach((count, lote) => {
    if (count > 1) {
      duplicados.push({ lote, ocorrencias: count });
    }
  });

  const totalPeso = lotesValidos.reduce((sum, item) => sum + item.peso, 0);

  return {
    lotesValidos,
    erros,
    duplicados,
    totalPeso,
    totalImportados: lotesValidos.length,
  };
}

/**
 * Detects gaps in numeric sequences for batches sharing the same alphanumeric prefix
 * e.g., 1MG1260001 -> 1MG1260711
 */
export interface SequenceGapReport {
  prefix: string;
  minNum: number;
  maxNum: number;
  totalPresentes: number;
  totalEsperados: number;
  gaps: { de: number; ate: number; count: number; amostras: string[] }[];
}

export function detectSequenceGaps(lotes: LoteItem[]): SequenceGapReport[] {
  // Group by prefix (e.g., "1MG1260", "2MG1260", "1GO1260")
  const groups = new Map<string, { num: number; full: string; numDigits: number }[]>();

  for (const item of lotes) {
    const match = item.lote.trim().match(/^(.*?)(\d+)$/);
    if (match) {
      const prefix = match[1];
      const numStr = match[2];
      const num = parseInt(numStr, 10);
      if (!groups.has(prefix)) {
        groups.set(prefix, []);
      }
      groups.get(prefix)!.push({ num, full: item.lote, numDigits: numStr.length });
    }
  }

  const reports: SequenceGapReport[] = [];

  groups.forEach((items, prefix) => {
    if (items.length < 2) return;

    // Sort numbers
    const sortedNums = Array.from(new Set(items.map(i => i.num))).sort((a, b) => a - b);
    const minNum = sortedNums[0];
    const maxNum = sortedNums[sortedNums.length - 1];
    const numDigits = items[0].numDigits;

    const numSet = new Set(sortedNums);
    const gaps: { de: number; ate: number; count: number; amostras: string[] }[] = [];

    let currentGapStart: number | null = null;

    for (let n = minNum; n <= maxNum; n++) {
      if (!numSet.has(n)) {
        if (currentGapStart === null) {
          currentGapStart = n;
        }
      } else {
        if (currentGapStart !== null) {
          const gapEnd = n - 1;
          const count = gapEnd - currentGapStart + 1;
          const samples: string[] = [];
          for (let s = currentGapStart; s <= Math.min(gapEnd, currentGapStart + 3); s++) {
            samples.push(`${prefix}${String(s).padStart(numDigits, '0')}`);
          }
          if (count > 4) {
            samples.push('...');
          }
          gaps.push({
            de: currentGapStart,
            ate: gapEnd,
            count,
            amostras: samples,
          });
          currentGapStart = null;
        }
      }
    }

    if (currentGapStart !== null) {
      const gapEnd = maxNum - 1;
      const count = gapEnd - currentGapStart + 1;
      gaps.push({
        de: currentGapStart,
        ate: gapEnd,
        count,
        amostras: [`${prefix}${String(currentGapStart).padStart(numDigits, '0')}`],
      });
    }

    reports.push({
      prefix,
      minNum,
      maxNum,
      totalPresentes: items.length,
      totalEsperados: maxNum - minNum + 1,
      gaps,
    });
  });

  return reports;
}
