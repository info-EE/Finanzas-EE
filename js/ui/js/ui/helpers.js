import { getState } from '../store.js';
import { elements } from './elements.js';
import { showAlertModal } from './modals.js';

/**
 * Abre la barra lateral en móvil.
 */
export function openSidebar() {
    const sidebar = elements.sidebar;
    const overlay = elements.sidebarOverlay;
    if (sidebar && overlay) {
        sidebar.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
    }
}

/**
 * Cierra la barra lateral en móvil.
 */
export function closeSidebar() {
    const sidebar = elements.sidebar;
    const overlay = elements.sidebarOverlay;
    if (sidebar && overlay) {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
    }
}

/**
 * Exporta el reporte activo como un archivo XLSX.
 */
export function exportReportAsXLSX() {
    const { activeReport } = getState();
    if (!activeReport || !activeReport.data || activeReport.data.length === 0) {
        showAlertModal('Sin Datos', 'No hay datos para exportar.');
        return;
    }
    const worksheet = XLSX.utils.aoa_to_sheet([activeReport.columns, ...activeReport.data]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");
    XLSX.writeFile(workbook, `${activeReport.title.replace(/ /g, '_')}.xlsx`);
}

/**
 * Exporta el reporte activo como un archivo PDF.
 */
export function exportReportAsPDF() {
    const { activeReport } = getState();
    // Corrección: el estado es activeReport, no activeBreport
    if (!activeReport || !activeReport.data || activeReport.data.length === 0) { 
        showAlertModal('Sin Datos', 'No hay datos para exportar.');
        return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text(activeReport.title, 14, 16);
    doc.autoTable({
        head: [activeReport.columns],
        body: activeReport.data,
        startY: 20
    });
    doc.save(`${activeReport.title.replace(/ /g, '_')}.pdf`);
}

/**
 * Actualiza el indicador visual de estado de la conexión.
 * @param {'loading' | 'success' | 'error'} status 
 * @param {string} message 
 */
export function updateConnectionStatus(status, message) {
    const { connectionStatus, statusIcon, statusText } = elements;
    if (!connectionStatus || !statusIcon || !statusText) return;
    connectionStatus.classList.remove('opacity-0');

    statusText.textContent = message;

    switch (status) {
        case 'loading':
            statusIcon.innerHTML = `<div class="w-3 h-3 border-2 border-t-transparent border-yellow-400 rounded-full animate-spin"></div>`;
            statusText.classList.remove('text-green-400', 'text-red-400');
            statusText.classList.add('text-yellow-400');
            break;
        case 'success':
            statusIcon.innerHTML = `<div class="w-3 h-3 bg-green-500 rounded-full"></div>`;
            statusText.classList.remove('text-yellow-400', 'text-red-400');
            statusText.classList.add('text-green-400');
            break;
        case 'error':
            statusIcon.innerHTML = `<div class="w-3 h-3 bg-red-500 rounded-full"></div>`;
            statusText.classList.remove('text-yellow-400', 'text-green-400');
            statusText.classList.add('text-red-400');
            break;
    }
}
