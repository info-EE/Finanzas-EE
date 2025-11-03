/**
 * Renderers for Documents (Proformas, Facturas)
 * Este archivo se encarga de "dibujar" las tablas de documentos.
 */
import { elements } from '../elements.js';
import { getState } from '../../store.js';
import { escapeHTML, formatCurrency } from '../../utils.js';

// --- INICIO DE MODIFICACIÓN: Helper para extraer el número de la proforma ---
/**
 * Extrae la parte numérica de un string de proforma (ej. "M-2025-0053" -> 53)
 * @param {string} numberStr - El string del número de proforma.
 * @returns {number} El número extraído, o 0 si no se puede parsear.
 */
function extractProformaNumber(numberStr) {
    if (typeof numberStr !== 'string') return 0;
    const parts = numberStr.split('-');
    if (parts.length > 0) {
        // Toma la última parte del string (ej. "0053")
        const lastPart = parts[parts.length - 1];
        // Lo convierte a un número (ej. 53)
        const num = parseInt(lastPart, 10);
        return isNaN(num) ? 0 : num;
    }
    return 0;
}
// --- FIN DE MODIFICACIÓN ---

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
            <!-- INICIO PASO 5: Añadir padding pr-4 al monto -->
            <td class="py-3 px-3 text-right pr-4">${formatCurrency(amount, currency)}</td>
            <!-- FIN PASO 5 -->
            
            <!-- INICIO PASO 5: Centrar estado -->
            ${(statusColspan > 0) ? `<td class="py-3 px-3 flex items-center justify-center">${actionsHtml.shift()}</td>` : ''}
            <!-- FIN PASO 5 -->

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
    
    // --- INICIO PASO 2: Leer filtros de fecha ---
    const searchInput = document.getElementById(searchInputId);
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
    const dateFromInput = document.getElementById('proforma-date-from');
    const dateToInput = document.getElementById('proforma-date-to');
    let dateFrom = null;
    let dateTo = null;

    // Solo aplicar filtros de fecha si estamos en la pestaña de proformas
    if (searchInputId === 'proformas-search') {
        if (dateFromInput && dateFromInput.value) {
            dateFrom = new Date(dateFromInput.value + 'T00:00:00Z');
        }
        if (dateToInput && dateToInput.value) {
            // Ir al final del día
            dateTo = new Date(dateToInput.value + 'T23:59:59Z');
        }
    }
    // --- FIN PASO 2 ---

    if (searchTerm) {
        filteredDocs = filteredDocs.filter(doc => 
            (doc.number && doc.number.toLowerCase().includes(searchTerm)) ||
            (doc.client && doc.client.toLowerCase().includes(searchTerm))
        );
    }
    
    // --- INICIO PASO 2: Aplicar filtros de fecha ---
    if (dateFrom) {
         filteredDocs = filteredDocs.filter(doc => {
            const docDate = new Date(doc.date + 'T00:00:00Z');
            return !isNaN(docDate.getTime()) && docDate >= dateFrom;
         });
    }
    if (dateTo) {
        filteredDocs = filteredDocs.filter(doc => {
            const docDate = new Date(doc.date + 'T00:00:00Z');
            return !isNaN(docDate.getTime()) && docDate <= dateTo;
        });
    }
    // --- FIN PASO 2 ---


    if (filteredDocs.length === 0) {
        const message = searchTerm ? "No hay documentos que coincidan con la búsqueda." : `No hay ${type.toLowerCase()}s registradas.`;
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-gray-500">${message}</td></tr>`;
    } else {
        tbody.innerHTML = filteredDocs
            // --- INICIO DE MODIFICACIÓN (Paso 4): Lógica de ordenación por Fecha y Número ---
            .sort((a, b) => {
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);

                // 1. Primero, ordenar por fecha (descendente)
                const dateDiff = dateB - dateA;
                if (dateDiff !== 0) {
                    return dateDiff;
                }

                // 2. Si las fechas son iguales, ordenar por número de proforma (descendente)
                const numA = extractProformaNumber(a.number);
                const numB = extractProformaNumber(b.number);
                return numB - numA; // El número más alto primero
            })
            // --- FIN DE MODIFICACIÓN ---
            .map(doc => createDocumentRow(doc, state))
            .join('');
    }
}

