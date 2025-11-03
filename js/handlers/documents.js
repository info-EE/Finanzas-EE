import * as actions from '../actions.js';
import { elements } from '../ui/elements.js'; // <-- CORREGIDO
import {
    switchPage,
    renderAll,
    exportReportAsXLSX, // <-- AÑADIDO (Paso 3)
    exportReportAsPDF   // <-- AÑADIDO (Paso 3)
} from '../ui/index.js'; // <-- ESTA ES LA LÍNEA CORREGIDA (era ../ui.js)
import {
    populateNextInvoiceNumber
} from '../ui/controls.js'; // Funciones de controles
import {
    showInvoiceViewer,
    hideInvoiceViewer,
    printInvoice,
    downloadInvoiceAsPDF,
    showReceiptViewer
} from '../ui/viewers.js'; // Funciones de visualizadores
import {
    hidePaymentDetailsModal,
    showPaymentDetailsModal,
    showAlertModal,
    showConfirmationModal
} from '../ui/modals.js'; // Funciones de modales
// --- AÑADIDO (Paso 3) ---
import { getState, setState } from '../store.js'; 
import { escapeHTML } from '../utils.js';
import { withSpinner } from './helpers.js';

// --- Funciones Manejadoras (Handlers) ---

// --- INICIO DE MODIFICACIÓN: Añadir reseteo de formulario ---
/**
 * Limpia el formulario de proformas y restaura los textos.
 */
function resetProformaForm() {
    const form = elements.proformaForm;
    if (!form) return;

    form.reset();
    
    const idInput = form.querySelector('#proforma-id');
    if (idInput) idInput.value = '';

    const title = document.getElementById('proforma-form-title');
    if (title) title.textContent = 'Agregar Nueva Proforma';

    const submitText = document.getElementById('proforma-form-submit-text');
    if (submitText) submitText.textContent = 'Agregar Proforma';

    const cancelBtn = document.getElementById('proforma-form-cancel-btn');
    if (cancelBtn) cancelBtn.classList.add('hidden');
    
    // Set default date again after reset
    const dateInput = form.querySelector(`#proforma-date`);
    if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
}
// --- FIN DE MODIFICACIÓN ---


function handleDocumentSubmit(e, type) {
    e.preventDefault();
    const form = e.target;

    // --- INICIO DE MODIFICACIÓN: Obtener ID para editar ---
    // Busca el ID del formulario (ej. #proforma-id)
    const id = form.querySelector(`#${type.toLowerCase()}-id`)?.value;
    // --- FIN DE MODIFICACIÓN ---
    
    const amount = parseFloat(form.querySelector(`#${type.toLowerCase()}-amount`).value);
    const number = form.querySelector(`#${type.toLowerCase()}-number`).value.trim();

    if (!number) {
        showAlertModal('Campo Requerido', `El número de ${type.toLowerCase()} no puede estar vacío.`);
        return;
    }
    if (isNaN(amount) || amount <= 0) {
        showAlertModal('Valor Inválido', 'El monto debe ser un número positivo.');
        return;
    }

    const docData = {
        type: type,
        date: form.querySelector(`#${type.toLowerCase()}-date`).value,
        number: number,
        client: form.querySelector(`#${type.toLowerCase()}-client`).value,
        amount: amount,
        currency: form.querySelector(`#${type.toLowerCase()}-currency`).value,
        status: 'Adeudada', // Al crear o editar, se resetea a 'Adeudada' (lógica simple)
        // Si quisiéramos mantener el estado al editar, necesitaríamos un campo de estado en el form
    };

    // --- INICIO DE MODIFICACIÓN: Lógica de Guardar o Actualizar ---
    withSpinner(() => {
        if (id) {
            // Es una edición
            actions.updateDocument(id, docData);
        } else {
            // Es uno nuevo
            actions.addDocument(docData);
        }
        resetProformaForm(); // Usar la nueva función de reseteo
    })();
    // --- FIN DE MODIFICACIÓN ---
}


function handleDocumentsTableClick(e) {
    const statusBtn = e.target.closest('.status-btn');
    const deleteBtn = e.target.closest('.delete-doc-btn');
    const viewBtn = e.target.closest('.view-invoice-btn');
    const receiptBtn = e.target.closest('.generate-receipt-btn');

    // --- INICIO DE MODIFICACIÓN: Añadir handler de editar ---
    const editBtn = e.target.closest('.edit-doc-btn');

    if (editBtn) {
        const id = editBtn.dataset.id;
        const { documents } = getState();
        const doc = documents.find(d => d.id === id);

        // Solo actuar si encontramos el documento y es una Proforma
        if (doc && doc.type === 'Proforma') { 
            const form = elements.proformaForm;
            if (!form) return;

            // Llenar el formulario
            form.querySelector('#proforma-id').value = doc.id;
            form.querySelector('#proforma-date').value = doc.date;
            form.querySelector('#proforma-number').value = doc.number;
            form.querySelector('#proforma-client').value = doc.client;
            form.querySelector('#proforma-amount').value = doc.amount;
            form.querySelector('#proforma-currency').value = doc.currency;

            // Actualizar UI del formulario
            const title = document.getElementById('proforma-form-title');
            if (title) title.textContent = 'Editar Proforma';

            const submitText = document.getElementById('proforma-form-submit-text');
            if (submitText) submitText.textContent = 'Actualizar';

            const cancelBtn = document.getElementById('proforma-form-cancel-btn');
            if (cancelBtn) cancelBtn.classList.remove('hidden');

            form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
    // --- FIN DE MODIFICACIÓN ---

    if (statusBtn) {
        withSpinner(() => actions.toggleDocumentStatus(statusBtn.dataset.id), 150)();
    }
    if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        showConfirmationModal('Eliminar Documento', '¿Seguro que quieres eliminar este documento?', async () => {
            await withSpinner(() => actions.deleteDocument(id))();
        });
    }
    if (viewBtn) {
        // --- CORRECCIÓN: Usar getState() para pasar el estado al visualizador ---
        showInvoiceViewer(viewBtn.dataset.id, getState());
    }
    if (receiptBtn) {
        showPaymentDetailsModal(receiptBtn.dataset.id);
    }
}


// --- AÑADIDO (Paso 3): Handler para la descarga de Proformas ---
function handleProformaDownloadClick(e) {
    const downloadBtn = e.target.closest('#proforma-download-btn');
    if (downloadBtn) {
        document.getElementById('proforma-download-options').classList.toggle('show');
        return; // Detener aquí, solo mostramos el menú
    }

    const formatBtn = e.target.closest('.download-option');
    if (formatBtn) {
        const format = formatBtn.dataset.format;
        
        // 1. Obtener datos filtrados (lógica idéntica a renderDocuments)
        const { documents } = getState();
        let filteredDocs = documents.filter(doc => doc.type === 'Proforma');

        const searchTerm = document.getElementById('proformas-search')?.value.toLowerCase() || '';
        const dateFromInput = document.getElementById('proforma-date-from');
        const dateToInput = document.getElementById('proforma-date-to');
        let dateFrom = null;
        let dateTo = null;

        if (dateFromInput && dateFromInput.value) {
            dateFrom = new Date(dateFromInput.value + 'T00:00:00Z');
        }
        if (dateToInput && dateToInput.value) {
            dateTo = new Date(dateToInput.value + 'T23:59:59Z');
        }

        if (searchTerm) {
            filteredDocs = filteredDocs.filter(doc => 
                (doc.number && doc.number.toLowerCase().includes(searchTerm)) ||
                (doc.client && doc.client.toLowerCase().includes(searchTerm))
            );
        }
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
        
        if (filteredDocs.length === 0) {
            showAlertModal('Sin Datos', 'No hay proformas que coincidan con los filtros actuales para exportar.');
            return;
        }

        // 2. Preparar datos para el reporte
        const columns = ["Fecha", "N° Proforma", "Cliente", "Monto", "Moneda", "Estado"];
        const data = filteredDocs
            .sort((a, b) => new Date(b.date) - new Date(a.date)) // Asegurar orden
            .map(doc => [
                doc.date,
                doc.number,
                doc.client,
                doc.amount,
                doc.currency,
                doc.status
            ]);
        
        // 3. Guardar en el estado para que los helpers de exportación funcionen
        setState({ activeReport: { type: 'Proformas', data, title: 'Listado_Proformas', columns } });

        // 4. Llamar a los helpers de exportación
        if (format === 'xlsx') {
            exportReportAsXLSX();
        } else if (format === 'pdf') {
            exportReportAsPDF();
        }
        
        // Ocultar dropdown
        document.getElementById('proforma-download-options').classList.remove('show');
    }
}
// --- FIN DE FUNCIÓN AÑADIDA ---


function handleClientSelectionForInvoice(e) {
    const clientId = e.target.value;
    const form = elements.nuevaFacturaForm;
    const nameInput = form.querySelector('#factura-cliente');
    const nifInput = form.querySelector('#factura-nif');
    const addressInput = form.querySelector('#factura-cliente-direccion');
    const phoneInput = form.querySelector('#factura-cliente-telefono');

    if (clientId) {
        const { clients } = getState();
        const client = clients.find(c => c.id === clientId);
        if (client) {
            nameInput.value = client.name;
            nifInput.value = client.taxId;
            addressInput.value = client.address;
            phoneInput.value = `${client.phoneMobilePrefix} ${client.phoneMobile}`;
        }
    } else {
        [nameInput, nifInput, addressInput, phoneInput].forEach(input => {
            if (input) input.value = ''; // Check if input exists before setting value
        });
    }
}

function handleGenerateInvoice(e) {
    e.preventDefault();
    const form = e.target;

    const items = [];
    let parsingError = false;
    form.querySelectorAll('.factura-item').forEach(itemEl => {
        if (parsingError) return;

        const description = itemEl.querySelector('.item-description').value;
        const quantityRaw = itemEl.querySelector('.item-quantity').value;
        const priceRaw = itemEl.querySelector('.item-price').value;

        const quantity = parseFloat(quantityRaw.replace(',', '.'));
        const price = parseFloat(priceRaw.replace(',', '.'));

        if (description && !isNaN(quantity) && quantity > 0 && !isNaN(price) && price >= 0) {
            items.push({ description, quantity, price });
        } else if (description || quantityRaw || priceRaw) {
            showAlertModal('Valor Inválido', `Por favor, revise la línea con descripción "${description}". La cantidad y el precio deben ser números válidos.`);
            parsingError = true;
        }
    });

    if (parsingError) return;

    if (items.length === 0) {
        showAlertModal('Factura Vacía', 'Debes añadir al menos un concepto válido a la factura.');
        return;
    }

    if (!form.querySelector('#factura-cliente').value.trim()) {
        showAlertModal('Campo Requerido', 'El nombre del cliente es obligatorio.');
        return;
    }

    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const operationType = form.querySelector('#factura-operation-type').value;
    const ivaRate = operationType.toLowerCase().includes('exportación') ? 0 : 0.21;
    const iva = subtotal * ivaRate;
    const total = subtotal + iva;

    const newInvoice = {
        type: 'Factura',
        date: form.querySelector('#factura-fecha').value,
        number: form.querySelector('#factura-numero').value,
        client: form.querySelector('#factura-cliente').value,
        nif: form.querySelector('#factura-nif').value,
        address: form.querySelector('#factura-cliente-direccion').value,
        phone: form.querySelector('#factura-cliente-telefono').value,
        amount: total,
        currency: form.querySelector('#factura-currency').value,
        status: 'Adeudada',
        operationType,
        items,
        subtotal,
        iva,
        total,
        ivaRate
    };

    withSpinner(() => {
        actions.addDocument(newInvoice);

        form.reset();
        // Restore default date
        const dateInput = form.querySelector('#factura-fecha');
        if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
        elements.facturaItemsContainer.innerHTML = '';
        // Add one empty item line back
        const addItemButton = document.getElementById('factura-add-item-btn');
        if (addItemButton) addItemButton.click();
        // Update totals display
        updateInvoiceTotals();

        showAlertModal('Éxito', `La factura Nº ${escapeHTML(newInvoice.number)} ha sido creada.`);
        switchPage('facturacion', 'listado');
    })();
}


function handlePaymentDetailsSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const invoiceId = form.querySelector('#payment-details-invoice-id').value;

    const paymentData = {
        method: form.querySelector('#payment-method').value,
        date: form.querySelector('#payment-date').value,
        reference: form.querySelector('#payment-reference').value,
    };

    withSpinner(async () => { // Marcar como async para usar await
        const updatedInvoice = await actions.savePaymentDetails(invoiceId, paymentData); // Usar await
        if (updatedInvoice) {
            hidePaymentDetailsModal();
            showReceiptViewer(updatedInvoice);
        } else {
            showAlertModal('Error', 'No se pudo encontrar la factura para guardar los detalles del pago.');
        }
    })();
}

function handleAeatConfigSave(e) {
    e.preventDefault();
    const form = e.target;
    const aeatConfig = {
        certPath: form.querySelector('#aeat-cert-path').value,
        certPass: form.querySelector('#aeat-cert-pass').value,
        endpoint: form.querySelector('#aeat-endpoint').value,
        apiKey: form.querySelector('#aeat-api-key').value,
    };
    withSpinner(() => {
        actions.saveAeatConfig(aeatConfig);
        showAlertModal('Éxito', 'La configuración de AEAT ha sido guardada.');
    })();
}

// --- MANEJADORES DE MODAL AÑADIDOS ---
function handlePrintInvoice() {
    printInvoice();
}

function handleDownloadPDF() {
    downloadInvoiceAsPDF();
}

function handleCloseInvoiceViewer() {
    hideInvoiceViewer();
}
// --- FIN DE MANEJADORES AÑADIDOS ---


// --- Invoice Item Calculation ---
function updateInvoiceTotals() {
    const itemsContainer = elements.facturaItemsContainer;
    if (!itemsContainer) return;

    let subtotal = 0;
    itemsContainer.querySelectorAll('.factura-item').forEach(itemEl => {
        const quantity = parseFloat(itemEl.querySelector('.item-quantity').value.replace(',', '.')) || 0;
        const price = parseFloat(itemEl.querySelector('.item-price').value.replace(',', '.')) || 0;
        subtotal += quantity * price;
    });

    const operationTypeEl = document.getElementById('factura-operation-type');
    const operationType = operationTypeEl ? operationTypeEl.value : ''; // Valor por defecto
    const ivaRate = operationType.toLowerCase().includes('exportación') ? 0 : 0.21;
    const iva = subtotal * ivaRate;
    const total = subtotal + iva;
    const currencyEl = document.getElementById('factura-currency');
    const currency = currencyEl ? currencyEl.value : 'EUR'; // Valor por defecto
    const symbol = currency === 'EUR' ? '€' : '$';

    const subtotalEl = document.getElementById('factura-subtotal');
    if (subtotalEl) subtotalEl.textContent = `${subtotal.toFixed(2)} ${symbol}`;
    
    const ivaLabelEl = document.getElementById('factura-iva-label');
    if (ivaLabelEl) ivaLabelEl.textContent = `IVA (${(ivaRate * 100).toFixed(0)}%):`;
    
    const ivaEl = document.getElementById('factura-iva');
    if (ivaEl) ivaEl.textContent = `${iva.toFixed(2)} ${symbol}`;
    
    const totalEl = document.getElementById('factura-total');
    if (totalEl) totalEl.textContent = `${total.toFixed(2)} ${symbol}`;
}


// --- Función "Binder" ---

/**
 * Asigna los eventos de las secciones Proformas y Facturación.
 */
export function bindDocumentEvents() {
    console.log("Binding Document Events...");

    // Proformas
    if (elements.proformaForm) elements.proformaForm.addEventListener('submit', (e) => handleDocumentSubmit(e, 'Proforma'));
    
    // --- INICIO DE MODIFICACIÓN: Añadir listener al botón de cancelar ---
    const proformaCancelBtn = document.getElementById('proforma-form-cancel-btn');
    if (proformaCancelBtn) {
        proformaCancelBtn.addEventListener('click', resetProformaForm);
    }
    // --- FIN DE MODIFICACIÓN ---
    
    // --- INICIO DE MODIFICACIÓN (PASOS 2/3) ---
    // Limpiar y re-bindear listeners de la tarjeta de listado de Proformas
    const proformaListCard = document.getElementById('proformas-table-body')?.closest('.card');
    if (proformaListCard) {
        // Clonar la tarjeta entera para limpiar TODOS los listeners (search, table, download)
        const newCard = proformaListCard.cloneNode(true);
        proformaListCard.parentNode.replaceChild(newCard, proformaListCard);
        
        // Re-asignar el tbody de elements al nuevo tbody clonado
        elements.proformasTableBody = newCard.querySelector('#proformas-table-body');
        
        // 1. Re-bind listener de la tabla
        if (elements.proformasTableBody) {
            elements.proformasTableBody.addEventListener('click', handleDocumentsTableClick);
        }
        
        // 2. Bind listener de descarga a la tarjeta
        newCard.addEventListener('click', handleProformaDownloadClick);
        
        // 3. Bind listener de búsqueda
        const proformasSearch = newCard.querySelector('#proformas-search');
        if (proformasSearch) proformasSearch.addEventListener('input', () => renderAll());

        // 4. Bind listeners de filtros de fecha
        const proformaDateFrom = newCard.querySelector('#proforma-date-from');
        if (proformaDateFrom) proformaDateFrom.addEventListener('input', () => renderAll());
        
        const proformaDateTo = newCard.querySelector('#proforma-date-to');
        if (proformaDateTo) proformaDateTo.addEventListener('input', () => renderAll());

    } else if (elements.proformasTableBody) {
            // Fallback si no se encuentra la tarjeta (lógica antigua)
            const newTbody = elements.proformasTableBody.cloneNode(false);
            elements.proformasTableBody.parentNode.replaceChild(newTbody, elements.proformasTableBody);
            elements.proformasTableBody = newTbody;
            elements.proformasTableBody.addEventListener('click', handleDocumentsTableClick);
            
            // Bindear búsqueda (lógica antigua)
            const proformasSearch = document.getElementById('proformas-search');
            if (proformasSearch) proformasSearch.addEventListener('input', () => renderAll());
    }
    // --- FIN DE MODIFICACIÓN ---
    
    // Invoicing Section (Tabs)
    const crearTab = document.getElementById('facturacion-tab-crear');
    if (crearTab) crearTab.addEventListener('click', () => {
        switchPage('facturacion', 'crear');
        populateNextInvoiceNumber();
    });
    const listadoTab = document.getElementById('facturacion-tab-listado');
    if (listadoTab) listadoTab.addEventListener('click', () => switchPage('facturacion', 'listado'));
    const configTab = document.getElementById('facturacion-tab-config');
    if (configTab) configTab.addEventListener('click', () => switchPage('facturacion', 'config'));

    // Invoicing Section (Form)
    if (elements.facturaAddItemBtn) elements.facturaAddItemBtn.addEventListener('click', () => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'grid grid-cols-12 gap-2 items-center factura-item';
        itemDiv.innerHTML = `
            <div class="col-span-6"><input type="text" class="form-input item-description" placeholder="Descripción" required></div>
            <div class="col-span-2"><input type="text" inputmode="decimal" value="1" class="form-input item-quantity text-right" required></div>
            <div class="col-span-3"><input type="text" inputmode="decimal" placeholder="0.00" class="form-input item-price text-right" required></div>
            <div class="col-span-1 flex justify-center"><button type="button" class="remove-item-btn p-2 text-red-400 hover:text-red-300"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div>`;
        elements.facturaItemsContainer.appendChild(itemDiv);
        
        const newIcon = itemDiv.querySelector('i[data-lucide]');
        if (newIcon && typeof lucide !== 'undefined') {
            lucide.createIcons({ nodes: [newIcon] });
        }
         // Add listeners to new quantity/price inputs
         itemDiv.querySelector('.item-quantity').addEventListener('input', updateInvoiceTotals);
         itemDiv.querySelector('.item-price').addEventListener('input', updateInvoiceTotals);
         updateInvoiceTotals(); // Recalculate totals
    });

    if (elements.facturaItemsContainer) {
        // Limpiar listeners antiguos clonando
        const newContainer = elements.facturaItemsContainer.cloneNode(false);
        // Volver a añadir los items existentes (si los hubiera, aunque el reset los borra)
        elements.facturaItemsContainer.querySelectorAll('.factura-item').forEach(item => newContainer.appendChild(item.cloneNode(true)));
        elements.facturaItemsContainer.parentNode.replaceChild(newContainer, elements.facturaItemsContainer);
        elements.facturaItemsContainer = newContainer;
        
        // Asignar listener de delegado para remover items
        elements.facturaItemsContainer.addEventListener('click', (e) => {
            const removeBtn = e.target.closest('.remove-item-btn');
            if (removeBtn) {
                removeBtn.closest('.factura-item').remove();
                updateInvoiceTotals(); // Recalculate after removing
            }
        });
        
        // Asignar listeners delegados para inputs (más eficiente)
        elements.facturaItemsContainer.addEventListener('input', (e) => {
            if (e.target.classList.contains('item-quantity') || e.target.classList.contains('item-price')) {
                updateInvoiceTotals();
            }
        });
    }

    // Listeners de cálculo de totales
    const facturaCurrencySelect = document.getElementById('factura-currency');
    if (facturaCurrencySelect) facturaCurrencySelect.addEventListener('change', updateInvoiceTotals);
    const facturaOperationTypeSelect = document.getElementById('factura-operation-type');
    if(facturaOperationTypeSelect) facturaOperationTypeSelect.addEventListener('change', updateInvoiceTotals);

    // Formulario principal de Factura
    if (elements.facturaSelectCliente) elements.facturaSelectCliente.addEventListener('change', handleClientSelectionForInvoice);
    if (elements.nuevaFacturaForm) elements.nuevaFacturaForm.addEventListener('submit', handleGenerateInvoice);
    const facturaFecha = document.getElementById('factura-fecha');
    if (facturaFecha) facturaFecha.addEventListener('change', populateNextInvoiceNumber);
    
    // Tabla de listado de facturas
    if (elements.facturasTableBody) {
        // Limpiar listeners antiguos clonando
        const newTbody = elements.facturasTableBody.cloneNode(false);
        elements.facturasTableBody.parentNode.replaceChild(newTbody, elements.facturasTableBody);
        elements.facturasTableBody = newTbody;
        elements.facturasTableBody.addEventListener('click', handleDocumentsTableClick);
    }

    const facturasSearch = document.getElementById('facturas-search');
    if (facturasSearch) {
        // Limpiar listener antiguo
        const newSearch = facturasSearch.cloneNode(true);
        facturasSearch.parentNode.replaceChild(newSearch, facturasSearch);
        newSearch.addEventListener('input', () => renderAll());
    }
    
    // Configuración AEAT
    if (elements.aeatConfigForm) elements.aeatConfigForm.addEventListener('submit', handleAeatConfigSave);
    
    // Modal de Detalles de Pago
    if (elements.paymentDetailsForm) elements.paymentDetailsForm.addEventListener('submit', handlePaymentDetailsSubmit);
    if (elements.paymentDetailsCancelBtn) elements.paymentDetailsCancelBtn.addEventListener('click', hidePaymentDetailsModal);

    // --- LISTENERS DE MODAL AÑADIDOS ---
    if (elements.closeInvoiceViewerBtn) elements.closeInvoiceViewerBtn.addEventListener('click', handleCloseInvoiceViewer);
    if (elements.printInvoiceBtn) elements.printInvoiceBtn.addEventListener('click', handlePrintInvoice);
    if (elements.pdfInvoiceBtn) elements.pdfInvoiceBtn.addEventListener('click', handleDownloadPDF);
    // --- FIN DE LISTENERS AÑADIDOS ---
}

