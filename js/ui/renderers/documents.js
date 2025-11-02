/**
 * Renderers for Documents (Proformas, Facturas)
 * Este archivo se encarga de "dibujar" las tablas de documentos.
 */
import { elements } from '../elements.js';
import { getState } from '../../store.js';
import { escapeHTML, formatCurrency } from '../../utils.js';

/**
 * Crea el HTML para una sola fila de documento (Factura o Proforma).
 * @param {object} doc - El objeto del documento.
 * @param {object} state - El estado global (para permisos).
 * @returns {string} El HTML de la fila.
 */
function createDocumentRow(doc, state) {
    const { permissions } = state;
    const { id, type, date, number, client, amount, currency, status } = doc;

    let statusClass, statusText, statusIcon;
    
    if (status === 'Cobrada') {
        statusClass = 'bg-green-600/20 text-green-300';
        statusText = 'Cobrada';
        statusIcon = 'check-circle';
    } else {
        statusClass = 'bg-yellow-600/20 text-yellow-300';
        statusText = 'Adeudada';
        statusIcon = 'clock';
    }

    const actionsHtml = [];
    
    // Botón de ver (para Facturas)
    if (type === 'Factura' && permissions.view_documents) {
         actionsHtml.push(`
            <button class="view-invoice-btn p-2 text-blue-400 hover:text-blue-300" data-id="${id}" title="Ver Factura">
                <i data-lucide="eye" class="w-4 h-4"></i>
            </button>
         `);
    }

    // Botón de estado (si tiene permiso de cambiar)
    if (permissions.change_document_status) {
        actionsHtml.push(`
            <button class="status-btn p-2 rounded-lg ${statusClass} hover:opacity-80 flex items-center gap-1 text-xs" data-id="${id}" title="Cambiar Estado">
                <i data-lucide="${statusIcon}" class="w-3 h-3"></i> ${statusText}
            </button>
        `);
    } else {
         actionsHtml.push(`
            <span class="p-2 rounded-lg ${statusClass} flex items-center gap-1 text-xs cursor-default">
                <i data-lucide="${statusIcon}" class="w-3 h-3"></i> ${statusText}
            </span>
         `);
    }

    // Botón de recibo (para Facturas Cobradas)
    if (type === 'Factura' && status === 'Cobrada' && permissions.view_documents) {
         actionsHtml.push(`
            <button class="generate-receipt-btn p-2 text-cyan-400 hover:text-cyan-300" data-id="${id}" title="Generar Recibo">
                <i data-lucide="receipt" class="w-4 h-4"></i>
            </button>
         `);
    }

    // --- INICIO DE MODIFICACIÓN: Añadir botón de Editar ---
    const canEdit = (type === 'Factura' && permissions.manage_invoices) || (type === 'Proforma' && permissions.manage_proformas);
    if (canEdit) {
         actionsHtml.push(`
            <button class="edit-doc-btn p-2 text-blue-400 hover:text-blue-300" data-id="${id}" title="Editar">
                <i data-lucide="edit" class="w-4 h-4"></i>
            </button>
         `);
    }
    // --- FIN DE MODIFICACIÓN ---

    // Botón de eliminar
    const canDelete = (type === 'Factura' && permissions.manage_invoices) || (type === 'Proforma' && permissions.manage_proformas);
    if (canDelete) {
         actionsHtml.push(`
            <button class="delete-doc-btn p-2 text-red-400 hover:text-red-300" data-id="${id}" title="Eliminar">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
         `);
    }

    // Determinar la columna de acciones
    let actionsColspan = 1;
    let statusColspan = 1;
    // Si no hay permisos de "change_document_status", el estado se muestra en la columna de acciones
    if (!permissions.change_document_status) {
        statusColspan = 0; // Ocultar la columna de estado
        actionsColspan = 2; // La columna de acciones ocupa más espacio
    }

    // Nombres de columna diferentes para Factura vs Proforma
    const numberColName = (type === 'Factura') ? "N° Factura" : "N° Proforma";
    const statusColHtml = (statusColspan > 0) ? `<th class="py-2 px-3 text-center">Estado</th>` : '';

    return `
        <tr class="border-b border-gray-800 hover:bg-gray-800/50">
            <td class="py-3 px-3">${date}</td>
            <td class="py-3 px-3">${escapeHTML(number)}</td>
            <td class="py-3 px-3">${escapeHTML(client)}</td>
            <td class="py-3 px-3 text-right">${formatCurrency(amount, currency)}</td>
            ${(statusColspan > 0) ? `<td class="py-3 px-3 text-center">${actionsHtml.shift()}</td>` : ''}
            <td class="py-3 px-3" colspan="${actionsColspan}">
                <div class="flex items-center justify-center gap-2">
                    ${actionsHtml.join('')}
                </div>
            </td>
        </tr>
    `;
}

/**
 * Renderiza la tabla de documentos (Facturas o Proformas).
 * @param {string} type - 'Factura' o 'Proforma'.
 * @param {HTMLElement} tbody - El elemento <tbody> de la tabla.
 * @param {string} searchInputId - El ID del input de búsqueda.
 */
export function renderDocuments(type, tbody, searchInputId) {
    const state = getState();
    const { documents, permissions } = state;
    
    if (!tbody || !documents || !permissions) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-gray-500">Cargando datos...</td></tr>`;
        return;
    }

    // Actualizar encabezados de tabla (para Proforma vs Factura)
    const thead = tbody.previousElementSibling;
    if (thead) {
        const numberCol = thead.querySelector('th:nth-child(2)');
        if (numberCol) numberCol.textContent = (type === 'Factura') ? "N° Factura" : "N° Proforma";
        
        const statusCol = thead.querySelector('th:nth-child(5)');
        if (statusCol) {
            statusCol.classList.toggle('hidden', !permissions.change_document_status);
        }
        const actionsCol = thead.querySelector('th:nth-child(6)');
         if (actionsCol) {
            actionsCol.setAttribute('colspan', permissions.change_document_status ? '1' : '2');
         }
    }


    let filteredDocs = documents.filter(doc => doc.type === type);
    
    const searchInput = document.getElementById(searchInputId);
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

    if (searchTerm) {
        filteredDocs = filteredDocs.filter(doc => 
            (doc.number && doc.number.toLowerCase().includes(searchTerm)) ||
            (doc.client && doc.client.toLowerCase().includes(searchTerm))
        );
    }

    if (filteredDocs.length === 0) {
        const message = searchTerm ? "No hay documentos que coincidan con la búsqueda." : `No hay ${type.toLowerCase()}s registradas.`;
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-gray-500">${message}</td></tr>`;
    } else {
        tbody.innerHTML = filteredDocs
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map(doc => createDocumentRow(doc, state))
            .join('');
    }
}