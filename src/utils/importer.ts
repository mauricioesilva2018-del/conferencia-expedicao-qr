import * as XLSX from 'xlsx';
import { LoteItem, ImportValidationResult } from '../types';

/**
 * Parses raw text or array buffer into validated LoteItem list with diagnostics
 */
export function validateAndParseLots(
  data: string | ArrayBuffer, 
  options: { preventDuplicates?: boolean } = { preventDuplicates: true }
): ImportValidationResult {
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
        cols = trimmed.split(';').map(c => c.trim().replace(/^["']|["']$/g, ''));
      } else if (trimmed.includes('\t')) {
        cols = trimmed.split('\t').map(c => c.trim().replace(/^["']|["']$/g, ''));
      } else if (trimmed.includes(',')) {
        // Simple comma split
        cols = trimmed.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
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
  const seenLotCodes = new Set<string>();

  // Check if first row is a header row and map column indices
  let colIndexMap = {
    lote: -1,
    peneira: -1,
    categoria: -1,
    peso: -1,
    germinacao: -1,
    vigor: -1,
    cultura: -1,
    cultivar: -1,
    safra: -1,
    observacao: -1,
  };

  const normalizeHeader = (str: string) =>
    str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  const parsePercentValue = (valStr: string | undefined): number | string | undefined => {
    if (!valStr) return undefined;
    const clean = valStr.trim();
    if (!clean) return undefined;
    
    // Check if it has % or is numeric
    const numOnly = clean.replace('%', '').replace(',', '.').trim();
    const num = parseFloat(numOnly);
    if (!isNaN(num)) {
      // If Excel percentage like 0.85 -> 85
      if (num > 0 && num <= 1 && clean.includes('.')) {
        return Math.round(num * 100);
      }
      return num;
    }
    return clean;
  };

  let startIndex = 0;
  if (rawRows.length > 0) {
    const firstRow = rawRows[0].map(normalizeHeader);
    
    // Check if first row looks like a header
    const hasHeaderKeywords = firstRow.some(c => 
      c.includes('lote') || c.includes('batch') || c.includes('peneira') || 
      c.includes('categoria') || c.includes('cat') || c.includes('peso') || c.includes('kg') || 
      c.includes('etiqueta') || c.includes('bb') || c.includes('cultura') || 
      c.includes('cultivar') || c.includes('variedade') || c.includes('item') || 
      c.includes('vigor') || c.includes('germ')
    );

    if (hasHeaderKeywords) {
      startIndex = 1;
      firstRow.forEach((colName, idx) => {
        if (colName.includes('lote') || colName === 'batch' || colName === 'codigo' || colName === 'cod' || colName === 'identificacao' || colName.includes('num')) {
          colIndexMap.lote = idx;
        } else if (colName.includes('peneira') || colName.includes('screen') || colName === 'tam' || colName.includes('calibre') || colName.includes('diametro')) {
          colIndexMap.peneira = idx;
        } else if (colName.includes('cat') || colName.includes('classe') || colName.includes('produzida')) {
          colIndexMap.categoria = idx;
        } else if (colName.includes('peso') || colName.includes('kg') || colName.includes('qtd') || colName.includes('quant') || colName.includes('etiqueta') || colName.includes('bb')) {
          colIndexMap.peso = idx;
        } else if (colName.includes('germ') || colName.includes('g%') || colName === 'tg' || colName.includes('t.g')) {
          colIndexMap.germinacao = idx;
        } else if (colName.includes('vigor') || colName.includes('vig') || colName.includes('v%') || colName.includes('tz') || colName.includes('tetrazolio')) {
          colIndexMap.vigor = idx;
        } else if (colName.includes('cultura') || colName.includes('especie') || colName === 'crop') {
          colIndexMap.cultura = idx;
        } else if (colName.includes('cultivar') || colName.includes('variedade') || colName.includes('var') || colName.includes('material') || colName.includes('hibrido') || colName.includes('cult')) {
          colIndexMap.cultivar = idx;
        } else if (colName.includes('safra') || colName.includes('colheita') || colName.includes('ano')) {
          colIndexMap.safra = idx;
        } else if (colName.includes('obs') || colName.includes('nota') || colName.includes('detalhe')) {
          colIndexMap.observacao = idx;
        }
      });
    }
  }

  for (let i = startIndex; i < rawRows.length; i++) {
    const cols = rawRows[i];
    const rowIndex = i + 1;

    let lote = '';
    let peneira = '5,75 mm';
    let categoria = 'S1';
    let rawPeso = '';
    let germinacao: number | string | undefined = undefined;
    let vigor: number | string | undefined = undefined;
    let cultura: string | undefined = 'Soja';
    let cultivar: string | undefined = undefined;
    let safra: string | undefined = undefined;
    let observacao: string | undefined = undefined;

    // Use smart mapping if headers were found
    if (colIndexMap.lote >= 0) {
      lote = cols[colIndexMap.lote]?.trim().toUpperCase() || '';
      if (colIndexMap.peneira >= 0 && cols[colIndexMap.peneira]) peneira = cols[colIndexMap.peneira].trim();
      if (colIndexMap.categoria >= 0 && cols[colIndexMap.categoria]) categoria = cols[colIndexMap.categoria].trim();
      if (colIndexMap.peso >= 0 && cols[colIndexMap.peso]) rawPeso = cols[colIndexMap.peso].trim();
      if (colIndexMap.germinacao >= 0 && cols[colIndexMap.germinacao]) germinacao = parsePercentValue(cols[colIndexMap.germinacao]);
      if (colIndexMap.vigor >= 0 && cols[colIndexMap.vigor]) vigor = parsePercentValue(cols[colIndexMap.vigor]);
      if (colIndexMap.cultura >= 0 && cols[colIndexMap.cultura]) cultura = cols[colIndexMap.cultura].trim();
      if (colIndexMap.cultivar >= 0 && cols[colIndexMap.cultivar]) cultivar = cols[colIndexMap.cultivar].trim();
      if (colIndexMap.safra >= 0 && cols[colIndexMap.safra]) safra = cols[colIndexMap.safra].trim();
      if (colIndexMap.observacao >= 0 && cols[colIndexMap.observacao]) observacao = cols[colIndexMap.observacao].trim();
    } else {
      // Positional fallback
      if (cols.length < 2) {
        erros.push({
          linha: rowIndex,
          texto: cols.join(' | '),
          motivo: `Colunas insuficientes (${cols.length}). Esperado no mínimo: Lote e Peso (ou Lote | Peneira | Categoria | Peso | Germinação | Vigor).`,
        });
        continue;
      }

      // Check if 4+ columns
      if (cols.length >= 6) {
        lote = cols[0].trim().toUpperCase();
        peneira = cols[1].trim() || '5,75 mm';
        categoria = cols[2].trim() || 'S1';
        rawPeso = cols[3].trim();
        germinacao = parsePercentValue(cols[4]);
        vigor = parsePercentValue(cols[5]);
        cultura = cols[6] ? cols[6].trim() : 'Soja';
        cultivar = cols[7] ? cols[7].trim() : undefined;
      } else if (cols.length >= 4) {
        lote = cols[0].trim().toUpperCase();
        peneira = cols[1].trim() || '5,75 mm';
        categoria = cols[2].trim() || 'S1';
        rawPeso = cols[3].trim();
        cultura = cols[4] ? cols[4].trim() : 'Soja';
        cultivar = cols[5] ? cols[5].trim() : undefined;
      } else if (cols.length === 2) {
        // Simple [Lote, Peso]
        lote = cols[0].trim().toUpperCase();
        rawPeso = cols[1].trim();
      } else if (cols.length === 3) {
        // [Lote, Peneira, Peso]
        lote = cols[0].trim().toUpperCase();
        peneira = cols[1].trim() || '5,75 mm';
        rawPeso = cols[2].trim();
      }
    }

    if (!lote) {
      erros.push({
        linha: rowIndex,
        texto: cols.join(' | '),
        motivo: 'Número do lote não informado ou vazio.',
      });
      continue;
    }

    const cleanPesoStr = rawPeso.replace(/[^\d.,]/g, '').replace(',', '.');
    const peso = parseFloat(cleanPesoStr);

    if (isNaN(peso) || peso <= 0) {
      erros.push({
        linha: rowIndex,
        texto: cols.join(' | '),
        motivo: `Peso inválido ou zerado: "${rawPeso}".`,
      });
      continue;
    }

    // Register count for duplicate diagnostics
    const curCount = loteCountMap.get(lote) || 0;
    loteCountMap.set(lote, curCount + 1);

    // If duplicate prevention is on and we already added this lote, skip adding duplicate
    if (options.preventDuplicates && seenLotCodes.has(lote)) {
      // It's recorded in duplicados map
      continue;
    }

    seenLotCodes.add(lote);

    lotesValidos.push({
      lote,
      peneira: peneira || '5,75 mm',
      categoria: categoria || 'S1',
      peso,
      germinacao,
      vigor,
      cultura: cultura || 'Soja',
      cultivar: cultivar || undefined,
      safra: safra || undefined,
      observacao: observacao || undefined,
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
