/**
 * Renderers and helpers for reports
 */
import { elements } from '../elements.js';
import { formatCurrency } from '../../utils.js';

export function renderReport(state) {
    const { activeReport, accounts } = state;
    if (!elements.reportDisplayArea || !accounts || accounts.length === 0) {
        console.warn("renderReport: Falta el área de display o no hay cuentas cargadas.");
        if(elements.reportDisplayArea) elements.reportDisplayArea.innerHTML = `<div class="text-center text-gray-500 flex flex-col items-center justify-center h-full"><i data-lucide="alert-circle" class="w-16 h-16 mb-4 text-yellow-500"></i><h3 class="font-semibold text-lg">Error al cargar</h3><p class="text-sm">No se pueden mostrar reportes sin datos de cuentas.</p></div>`;
        if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
        return;
    }
    if (!activeReport || !activeReport.type || !activeReport.data || activeReport.data.length === 0) {
        elements.reportDisplayArea.innerHTML = `<div class="text-center text-gray-500 flex flex-col items-center justify-center h-full"><i data-lucide="file-search-2" class="w-16 h-16 mb-4"></i><h3 class="font-semibold text-lg">No hay datos para el reporte</h3><p class="text-sm">Pruebe con otros filtros o añada datos.</p></div>`;
        if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
        return;
    }

    const { type, title, columns, data } = activeReport;

    // Guardar: validar shapes
    if (!Array.isArray(columns) || columns.length === 0 || !Array.isArray(data)) {
        elements.reportDisplayArea.innerHTML = `<div class="text-center text-gray-500 flex flex-col items-center justify-center h-full"><i data-lucide="alert-circle" class="w-16 h-16 mb-4 text-yellow-500"></i><h3 class="font-semibold text-lg">Reporte inválido</h3><p class="text-sm">Los datos del reporte no tienen el formato esperado.</p></div>`;
        if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
        return;
    }

    let footerHtml = '';
    if (type === 'movimientos') {
        const totals = {};
        const typeIndex = columns.indexOf("Tipo");
        const amountIndex = columns.indexOf("Monto");
        const currencyIndex = columns.indexOf("Moneda");

        if (typeIndex !== -1 && amountIndex !== -1 && currencyIndex !== -1) {
            data.forEach(row => {
                const rowType = row[typeIndex];
                const amount = Number(row[amountIndex]);
                if (isNaN(amount)) { console.warn(`renderReport (footer): Monto inválido encontrado: ${row[amountIndex]}`); return; }
                const currency = row[currencyIndex] || 'EUR';
                if (!totals[currency]) totals[currency] = 0;
                totals[currency] += (rowType === 'Ingreso' ? amount : -amount);
            });
        }

        const totalsContent = Object.keys(totals).map(currency => {
            const total = totals[currency];
            const colorClass = total >= 0 ? 'text-green-400' : 'text-red-400';
            return `<div class="font-bold ${colorClass}">${formatCurrency(total, currency)}</div>`;
        }).join('');

        if (Object.keys(totals).length > 0) {
            const leftColspan = Math.max(1, columns.length - 2);
            footerHtml = `<tfoot><tr class="border-t-2 border-gray-600"><td colspan="${leftColspan}" class="py-3 px-3 text-right font-semibold">TOTAL NETO:</td><td class="py-3 px-3 text-right" colspan="2">${totalsContent}</td></tr></tfoot>`;
        }
    }

    let tableHtml = `<table class="w-full text-left"><thead><tr class="border-b border-gray-700">`;
    columns.forEach(col => tableHtml += `<th class="py-2 px-3 text-sm font-semibold text-gray-400">${String(col ?? '')}</th>`);
    tableHtml += `</tr></thead><tbody>`;

    data.forEach(row => {
        tableHtml += `<tr class="border-b border-gray-800">`;
        row.forEach((cell, index) => {
            if (!columns || index >= columns.length) {
                console.warn(`renderReport: Índice de columna (${index}) fuera de rango.`);
                tableHtml += `<td class="py-2 px-3 text-sm text-red-500">Error</td>`;
                return;
            }
            const columnName = columns[index];
            const columnNameStr = typeof columnName === 'string' ? columnName : String(columnName ?? '');
            const isNumeric = typeof cell === 'number' || (typeof cell === 'string' && cell.trim() !== '' && !isNaN(parseFloat(cell)));
            const isAmountColumn = ["Monto", "Importe", "Importe (€)", "Pago a cuenta estimado", "Resultado Contable Acumulado", "Total Ingresos Computables", "Total Gastos Deducibles"].some(h => columnNameStr.startsWith(h));
            let cellContent = cell;

            if (isAmountColumn && (typeof cell === 'number' || (typeof cell === 'string' && cell.trim() !== '' && !isNaN(parseFloat(cell))))) {
                 const amount = typeof cell === 'number' ? cell : parseFloat(cell);
                 const currencyColumnIndex = columns.indexOf("Moneda");
                 const currency = (type === 'sociedades' ? 'EUR' : (currencyColumnIndex !== -1 ? row[currencyColumnIndex] : 'EUR')) ?? 'EUR';
                 cellContent = formatCurrency(amount, currency);
                 const typeColumnIndex = columns.indexOf("Tipo");
                 if (type === 'movimientos' && columnNameStr === "Monto" && typeColumnIndex !== -1 && row[typeColumnIndex] === 'Egreso') {
                    cellContent = `- ${cellContent}`;
                 }
            } else {
                 cellContent = String(cell ?? '');
                 // escape lightly to avoid XSS
                 cellContent = cellContent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            }

            tableHtml += `<td class="py-2 px-3 text-sm ${isNumeric || isAmountColumn ? 'text-right' : ''}">${cellContent}</td>`;
        });
        tableHtml += `</tr>`;
    });
    tableHtml += `</tbody>${footerHtml}</table>`;

    elements.reportDisplayArea.innerHTML = `
        <div class="flex justify-between items-start mb-4">
            <h3 class="font-semibold text-lg">${title}</h3>
            <div class="dropdown">
                <button id="report-download-btn" class="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                    <i data-lucide="download" class="w-4 h-4"></i> Descargar
                </button>
                <div id="report-download-options" class="dropdown-content" style="display:none">
                    <button class="download-option" data-format="pdf">Exportar como PDF</button>
                    <button class="download-option" data-format="xlsx">Exportar como Excel</button>
                </div>
            </div>
        </div>
        <div class="overflow-x-auto">${tableHtml}</div>`;

    // Renderizar íconos si está disponible lucide
    if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();

    // Handlers mínimos para botón de descarga
    const downloadBtn = document.getElementById('report-download-btn');
    const downloadOptions = document.getElementById('report-download-options');
    if (downloadBtn && downloadOptions) {
        downloadBtn.addEventListener('click', (e) => {
            e.preventDefault();
            downloadOptions.style.display = downloadOptions.style.display === 'none' ? 'block' : 'none';
        });
        const opts = downloadOptions.querySelectorAll('.download-option');
        opts.forEach(opt => opt.addEventListener('click', (e) => {
            const format = e.currentTarget.dataset.format;
            // Cerrar el menú
            downloadOptions.style.display = 'none';
            try {
                if (format === 'pdf') {
                    exportReportAsPDF(state);
                } else if (format === 'xlsx') {
                    exportReportAsXLSX(state);
                }
            } catch (err) {
                console.warn('Error al exportar reporte:', err);
            }
        }));
    }
}

export function exportReportAsXLSX(state) {
    // Placeholder: implement using global XLSX if needed
    console.warn('exportReportAsXLSX: not implemented');
}

export function exportReportAsPDF(state) {
    // Placeholder: implement using global jsPDF if needed
    console.warn('exportReportAsPDF: not implemented');
}
