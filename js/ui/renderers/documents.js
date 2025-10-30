/**
 * Renderers and helpers for Documents / Invoices / Proformas
 */
import { elements } from '../elements.js';
import { escapeHTML, formatCurrency } from '../../utils.js';
import { getState } from '../../store.js';

export function createDocumentRow(doc, type, state) {
    const { permissions } = state || getState();
    // Asegurarse de que permissions existe, si no, usar un objeto vacío
    const safePermissions = permissions || {};

    const statusClass = doc.status === 'Cobrada' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300';
    let actionsHtml = '';

    if (type === 'Factura' && safePermissions.view_documents) { // Añadido chequeo de permiso
        actionsHtml += `
        <button class="view-invoice-btn p-2 text-blue-400 hover:text-blue-300" data-id="${doc.id}" title="Ver Factura">
            <i data-lucide="eye" class="w-4 h-4"></i>
        </button>`;
    }

    if (type === 'Factura' && doc.status === 'Cobrada' && safePermissions.manage_invoices) { // Añadido chequeo de permiso
        actionsHtml += `
        <button class="generate-receipt-btn p-2 text-green-400 hover:text-green-300" data-id="${doc.id}" title="Generar Recibo">
            <i data-lucide="receipt" class="w-4 h-4"></i>
        </button>`;
    }

    // Usar safePermissions para la comprobación
    const canManage = (type === 'Factura' && safePermissions.manage_invoices) || (type === 'Proforma' && safePermissions.manage_proformas);
    if (canManage) {
        actionsHtml += `
        <button class="delete-doc-btn p-2 text-red-400 hover:text-red-300" data-id="${doc.id}" title="Eliminar">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>`;
    }

    // Usar safePermissions para la comprobación
    const statusElement = safePermissions.change_document_status
        ? `<button class="status-btn text-xs font-semibold px-2 py-1 rounded-full ${statusClass}" data-id="${doc.id}">${doc.status}</button>`
        : `<span class="text-xs font-semibold px-2 py-1 rounded-full ${statusClass}">${doc.status}</span>`;

    return `
        <tr class="border-b border-gray-800 hover:bg-gray-800/50">
            <td class="py-3 px-3">${doc.date}</td>
            <td class="py-2 px-3">${escapeHTML(doc.number)}</td>
            <td class="py-2 px-3">${escapeHTML(doc.client)}</td>
            <td class="py-2 px-3 text-right">${formatCurrency(doc.amount, doc.currency)}</td>
            <td class="py-2 px-3 text-center">${statusElement}</td>
            <td class="py-2 px-3">
                <div class="flex items-center justify-center gap-2">${actionsHtml}</div>
            </td>
        </tr>`;
}

export function renderDocuments(type, tableBody, searchInputId) {
    const state = getState(); // Obtener el estado completo
    const { documents, permissions } = state;
    const searchInput = document.getElementById(searchInputId);
    
    // Asegurarse de que permissions existe
    if (!tableBody || !searchInput || !permissions) {
         console.warn(`renderDocuments (${type}): Faltan elementos (tableBody=${!!tableBody}, searchInput=${!!searchInput}, permissions=${!!permissions})`);
         if(tableBody) tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-gray-500">Cargando datos o error de permisos...</td></tr>`;
         // Ocultar formularios si no hay permisos
         if (type === 'Proforma' && elements.proformaForm && elements.proformaForm.parentElement) {
            elements.proformaForm.parentElement.classList.add('hidden');
         }
         const createInvoiceTab = document.getElementById('facturacion-tab-crear');
         if (type === 'Factura' && createInvoiceTab) {
            createInvoiceTab.classList.add('hidden');
         }
         return; // Salir si faltan elementos
    }

    // Ocultar/Mostrar formularios según permisos
    if (type === 'Proforma' && elements.proformaForm && elements.proformaForm.parentElement) {
        elements.proformaForm.parentElement.classList.toggle('hidden', !permissions.manage_proformas);
    }
    const createInvoiceTab = document.getElementById('facturacion-tab-crear');
    if (type === 'Factura' && createInvoiceTab) {
        createInvoiceTab.classList.toggle('hidden', !permissions.manage_invoices);
        // Si no tiene permiso y la pestaña activa es 'crear', cambiar a 'listado'
        if (!permissions.manage_invoices && document.getElementById('facturacion-tab-crear')?.classList.contains('active')) {
             const listadoTab = document.getElementById('facturacion-tab-listado');
             if (listadoTab) listadoTab.click(); // Simular clic para cambiar de pestaña
        }
    }

    // Filtrar documentos por tipo y búsqueda
    const filteredDocs = (documents || []).filter(d => d.type === type);
    const searchTerm = searchInput.value.toLowerCase();
    let displayDocs = filteredDocs;
    if (searchTerm) {
        displayDocs = filteredDocs.filter(d =>
            (d.number && d.number.toLowerCase().includes(searchTerm)) || // Verificar que number existe
            (d.client && d.client.toLowerCase().includes(searchTerm)) // Verificar que client existe
        );
    }

    // Renderizar tabla
    tableBody.innerHTML = '';
    if (displayDocs.length === 0) {
        const message = searchTerm ? `No hay ${type.toLowerCase()}s que coincidan.` : `No hay ${type.toLowerCase()}s registradas.`;
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-gray-500">${message}</td></tr>`;
    } else {
        // Ordenar y mapear, pasando el estado completo
        const rowsHtml = displayDocs
                   .sort((a, b) => new Date(b.date) - new Date(a.date))
                   .map(doc => createDocumentRow(doc, type, state)) // Pasar 'state'
                   .join('');
        tableBody.innerHTML = rowsHtml;
    }
}
