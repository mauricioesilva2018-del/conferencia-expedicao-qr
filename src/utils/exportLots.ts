import * as XLSX from 'xlsx';
import { LoteItem, Expedicao } from '../types';

/**
 * Exports lots list to a formatted Excel (.xlsx) spreadsheet.
 * Compatible with Desktop and Mobile browsers.
 */
export function exportLotsToExcel(
  lotes: LoteItem[], 
  expeditionInfo?: Expedicao | { numero?: string; clienteDestino?: string } | null,
  fileNamePrefix: string = 'Lista_Lotes_Expedicao'
): boolean {
  try {
    if (!lotes || lotes.length === 0) {
      alert('Não há lotes na lista para exportar.');
      return false;
    }

    const rows = lotes.map((item, index) => ({
      'Item': index + 1,
      'Lote': item.lote,
      'Cultura': item.cultura || 'Soja',
      'Cultivar / Variedade': item.variedade || item.cultivar || '',
      'Peneira': item.peneira || '5,75 mm',
      'Categoria': item.categoria || 'S1',
      'Germinação (%)': item.germinacao !== undefined && item.germinacao !== '' ? (typeof item.germinacao === 'number' ? `${item.germinacao}%` : `${item.germinacao}`) : '',
      'Vigor (%)': item.vigor !== undefined && item.vigor !== '' ? (typeof item.vigor === 'number' ? `${item.vigor}%` : `${item.vigor}`) : '',
      'Safra': item.safra || '',
      'Peso (kg)': item.peso,
      'Status': item.conferido ? 'CONFERIDO' : 'PENDENTE',
      'Data/Hora Conferência': item.conferidoEm ? new Date(item.conferidoEm).toLocaleString('pt-BR') : '',
      'Conferido Por': item.conferidoPor || '',
      'Observações': item.observacao || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 6 },  // Item
      { wch: 20 }, // Lote
      { wch: 14 }, // Cultura
      { wch: 22 }, // Cultivar / Variedade
      { wch: 14 }, // Peneira
      { wch: 14 }, // Categoria
      { wch: 16 }, // Germinação (%)
      { wch: 14 }, // Vigor (%)
      { wch: 12 }, // Safra
      { wch: 14 }, // Peso
      { wch: 16 }, // Status
      { wch: 22 }, // Data/Hora
      { wch: 22 }, // Conferido Por
      { wch: 24 }, // Observações
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Lotes');

    const expNum = expeditionInfo?.numero ? `_${expeditionInfo.numero}` : '';
    const dateStr = new Date().toISOString().split('T')[0];
    const fullFileName = `${fileNamePrefix}${expNum}_${dateStr}.xlsx`;

    XLSX.writeFile(workbook, fullFileName);
    return true;
  } catch (err) {
    console.error('Erro ao exportar planilha Excel:', err);
    alert('Erro ao gerar o arquivo Excel para download.');
    return false;
  }
}

/**
 * Fallback CSV export
 */
export function exportLotsToCSV(
  lotes: LoteItem[],
  fileNamePrefix: string = 'Lista_Lotes_Expedicao'
): boolean {
  try {
    if (!lotes || lotes.length === 0) {
      alert('Não há lotes na lista para exportar.');
      return false;
    }

    const headers = ['Item', 'Lote', 'Cultura', 'Cultivar_Variedade', 'Peneira', 'Categoria', 'Germinacao_Pct', 'Vigor_Pct', 'Safra', 'Peso_kg', 'Status', 'Data_Conferencia', 'Operador', 'Observacoes'];
    const lines = [headers.join(';')];

    lotes.forEach((item, index) => {
      lines.push([
        index + 1,
        `"${item.lote}"`,
        `"${item.cultura || 'Soja'}"`,
        `"${item.variedade || item.cultivar || ''}"`,
        `"${item.peneira || ''}"`,
        `"${item.categoria || ''}"`,
        `"${item.germinacao ?? ''}"`,
        `"${item.vigor ?? ''}"`,
        `"${item.safra || ''}"`,
        item.peso,
        item.conferido ? 'CONFERIDO' : 'PENDENTE',
        item.conferidoEm ? `"${new Date(item.conferidoEm).toLocaleString('pt-BR')}"` : '""',
        item.conferidoPor ? `"${item.conferidoPor}"` : '""',
        `"${item.observacao || ''}"`,
      ].join(';'));
    });

    const csvContent = '\uFEFF' + lines.join('\r\n'); // Add BOM for Excel UTF-8
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    a.download = `${fileNamePrefix}_${dateStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error('Erro ao exportar CSV:', err);
    return false;
  }
}
