/**
 * Renderers and helpers for Documents / Invoices / Proformas
 */
import { elements } from '../elements.js';
import { escapeHTML, formatCurrency } from '../../utils.js';

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
