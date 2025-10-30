/**
 * Renderers and helpers for reports
 */
import { elements } from '../elements.js';
import { formatCurrency, escapeHTML } from '../../utils.js';
import { getState } from '../../store.js'; // Importar getState
// Las funciones exportReportAsXLSX y exportReportAsPDF se movieron a helpers.js

export function renderReport() {
    const { activeReport, accounts } = getState(); // Necesitamos accounts por si acaso
    if (!elements.reportDisplayArea || !accounts || accounts.length === 0) {
        console.warn("renderReport: Falta el área de display o no hay cuentas cargadas.");
        if(elements.reportDisplayArea) elements.reportDisplayArea.innerHTML = `<div class="text-center text-gray-500 flex flex-col items-center justify-center h-full"><i data-lucide="alert-circle" class="w-16 h-16 mb-4 text-yellow-500"></i><h3 class="font-semibold text-lg">Error al cargar</h3><p class="text-sm">No se pueden mostrar reportes sin datos de cuentas.</p></div>`;
        if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons(); // Crear icono de alerta
        return;
    }
    if (!activeReport || !activeReport.type || !activeReport.data || activeReport.data.length === 0) {
        elements.reportDisplayArea.innerHTML = `<div class="text-center text-gray-500 flex flex-col items-center justify-center h-full"><i data-lucide="file-search-2" class="w-16 h-16 mb-4"></i><h3 class="font-semibold text-lg">No hay datos para el reporte</h3><p class="text-sm">Pruebe con otros filtros o añada datos.</p></div>`;
        if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons(); // Crear icono
        return;
    }

    const { type, title, columns, data } = activeReport;

    // Lógica del footer para 'movimientos'
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
                if (isNaN(amount)) {
                    console.warn(`renderReport (footer): Monto inválido encontrado: ${row[amountIndex]}`);
                    return; 
                }
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

    // Crear encabezado de tabla
    let tableHtml = `<table class="w-full text-left"><thead><tr class="border-b border-gray-700">`;
    columns.forEach(col => tableHtml += `<th class="py-2 px-3 text-sm font-semibold text-gray-400">${String(col ?? '')}</th>`);
    tableHtml += `</tr></thead><tbody>`;

    // Crear filas de tabla
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

    // Renderizar área de reporte con botón de descarga
    elements.reportDisplayArea.innerHTML = `
        <div class="flex justify-between items-start mb-4">
            <h3 class="font-semibold text-lg">${escapeHTML(title)}</h3>
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
    
    // Los handlers para el botón de descarga se asignan en handlers.js
    // Los iconos se crean en renderAll()
}

export function renderIvaReport() {
    const { activeIvaReport } = getState();
    const displayArea = elements.ivaReportDisplay;
    if (!displayArea) return;

    if (!activeIvaReport) {
        displayArea.innerHTML = `
            <div class="text-center text-gray-500 py-10">
                <i data-lucide="info" class="w-12 h-12 mx-auto mb-4"></i>
                <p>Seleccione un mes y genere el reporte para ver los resultados.</p>
            </div>`;
        return;
    }

    const { soportado, repercutido, resultado } = activeIvaReport;

    const createTableRows = (items) => {
        if (items.length === 0) {
            return `<tr><td colspan="4" class="text-center py-3 text-gray-500">No hay datos para este período.</td></tr>`;
        }
        return items.map(item => `
            <tr class="border-b border-gray-800">
                <td class="py-2 px-3 text-sm">${item.date}</td>
                <td class="py-2 px-3 text-sm">${escapeHTML(item.description || `${item.number} - ${item.client}`)}</td>
                <td class="py-2 px-3 text-sm text-right">${formatCurrency(item.base, item.currency)}</td>
                <td class="py-2 px-3 text-sm text-right font-semibold">${formatCurrency(item.iva, item.currency)}</td>
            </tr>
        `).join('');
    };

    displayArea.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div class="card p-4 rounded-xl text-center">
                <p class="text-sm text-gray-400">IVA Soportado (Gastos)</p>
                <p class="text-2xl font-bold text-red-400 mt-1">${formatCurrency(soportado.total, 'EUR')}</p>
            </div>
            <div class="card p-4 rounded-xl text-center">
                <p class="text-sm text-gray-400">IVA Repercutido (Ingresos)</p>
                <p class="text-2xl font-bold text-green-400 mt-1">${formatCurrency(repercutido.total, 'EUR')}</p>
            </div>
            <div class="card p-4 rounded-xl text-center ${resultado >= 0 ? 'bg-green-900/30' : 'bg-red-900/30'}">
                <p class="text-sm ${resultado >= 0 ? 'text-green-300' : 'text-red-300'}">Resultado del Período</p>
                <p class="text-2xl font-bold ${resultado >= 0 ? 'text-green-300' : 'text-red-300'} mt-1">${formatCurrency(Math.abs(resultado), 'EUR')}</p>
                <p class="text-xs ${resultado >= 0 ? 'text-green-400' : 'text-red-400'}">${resultado >= 0 ? 'IVA a Pagar' : 'IVA a Favor'}</p>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="card p-4 rounded-xl">
                <h4 class="font-semibold mb-3 text-lg">Detalle de IVA Soportado</h4>
                <div class="overflow-y-auto max-h-80">
                    <table class="w-full text-left">
                        <thead>
                            <tr class="text-gray-400 border-b border-gray-700">
                                <th class="py-2 px-3 text-xs">Fecha</th>
                                <th class="py-2 px-3 text-xs">Concepto</th>
                                <th class="py-2 px-3 text-xs text-right">Base</th>
                                <th class="py-2 px-3 text-xs text-right">IVA</th>
                            </tr>
                        </thead>
                        <tbody>${createTableRows(soportado.items)}</tbody>
                    </table>
                </div>
            </div>
            <div class="card p-4 rounded-xl">
                <h4 class="font-semibold mb-3 text-lg">Detalle de IVA Repercutido</h4>
                 <div class="overflow-y-auto max-h-80">
                    <table class="w-full text-left">
                        <thead>
                             <tr class="text-gray-400 border-b border-gray-700">
                                <th class="py-2 px-3 text-xs">Fecha</th>
                                <th class="py-2 px-3 text-xs">Factura / Cliente</th>
                                <th class="py-2 px-3 text-xs text-right">Base</th>
                                <th class="py-2 px-3 text-xs text-right">IVA</th>
                            </tr>
                        </thead>
                        <tbody>${createTableRows(repercutido.items)}</tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}
