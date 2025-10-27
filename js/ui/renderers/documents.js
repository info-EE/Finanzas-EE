/**
 * Renderers and helpers for Documents / Invoices / Proformas
 */
import { elements } from '../elements.js';
import { escapeHTML, formatCurrency } from '../../utils.js';
import { getState } from '../../store.js';

export function createDocumentRow(doc, type, state) {
    const { permissions } = state || getState();
    const statusClass = doc.status === 'Cobrada' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300';
    let actionsHtml = '';

    if (type === 'Factura') {
        actionsHtml += `
        <button class="view-invoice-btn p-2 text-blue-400 hover:text-blue-300" data-id="${doc.id}" title="Ver Factura">
            <i data-lucide="eye" class="w-4 h-4"></i>
        </button>`;
    }

    if (type === 'Factura' && doc.status === 'Cobrada') {
        actionsHtml += `
        <button class="generate-receipt-btn p-2 text-green-400 hover:text-green-300" data-id="${doc.id}" title="Generar Recibo">
            <i data-lucide="receipt" class="w-4 h-4"></i>
        </button>`;
    }

    const canManage = (type === 'Factura' && permissions.manage_invoices) || (type === 'Proforma' && permissions.manage_proformas);
    if (canManage) {
        actionsHtml += `
        <button class="delete-doc-btn p-2 text-red-400 hover:text-red-300" data-id="${doc.id}" title="Eliminar">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>`;
    }

    const statusElement = permissions.change_document_status
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

export function renderDocuments(type, tableBody, searchInputId, state) {
    const { documents, permissions } = state || getState();
    const searchInput = document.getElementById(searchInputId);
    if (!tableBody || !searchInput || !permissions) return;

    if (type === 'Proforma' && elements.proformaForm && elements.proformaForm.parentElement) {
        elements.proformaForm.parentElement.classList.toggle('hidden', !permissions.manage_proformas);
    }
    const createInvoiceTab = document.getElementById('facturacion-tab-crear');
    if (type === 'Factura' && createInvoiceTab) {
        createInvoiceTab.classList.toggle('hidden', !permissions.manage_invoices);
        if (!permissions.manage_invoices && createInvoiceTab.classList.contains('active')) {
             document.getElementById('facturacion-tab-listado')?.click();
        }
    }

    const filteredDocs = (documents || []).filter(d => d.type === type);
    const searchTerm = searchInput.value.toLowerCase();
    let displayDocs = filteredDocs;
    if (searchTerm) {
        displayDocs = filteredDocs.filter(d =>
            d.number.toLowerCase().includes(searchTerm) ||
            d.client.toLowerCase().includes(searchTerm)
        );
    }

    tableBody.innerHTML = '';
    if (displayDocs.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-gray-500">No hay ${type.toLowerCase()}s.</td></tr>`;
    } else {
        const rowsHtml = displayDocs.sort((a, b) => new Date(b.date) - new Date(a.date))
                   .map(doc => createDocumentRow(doc, type, state))
                   .join('');
        tableBody.innerHTML = rowsHtml;
    }
}

export function renderDocuments(type, tableBody, searchInputId, state) {
    // TODO: move implementation from ui.js
}

export function renderFacturas(state) {
    // TODO: move implementation from ui.js
}

export function createDocumentRow(doc, type, permissions = {}) {
    // TODO
    return `<!-- document row ${escapeHTML(doc.id || '')} -->`;
}
