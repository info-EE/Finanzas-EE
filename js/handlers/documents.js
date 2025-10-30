import * as actions from '../actions.js';
import {
    elements,
    switchPage,
    // --- CORRECCIÓN ---
    // Esta importación debe venir de 'controls.js', no del índice
    // populateNextInvoiceNumber,
    // --- FIN CORRECCIÓN ---
    showInvoiceViewer,
    hidePaymentDetailsModal,
    showPaymentDetailsModal,
    showReceiptViewer,
    showAlertModal,
    showConfirmationModal,
    renderAll
} from '../ui/index.js';
// --- CORRECCIÓN ---
// Importar 'populateNextInvoiceNumber' desde su archivo correcto
import { populateNextInvoiceNumber } from '../ui/controls.js';
// --- FIN CORRECCIÓN ---
import { getState } from '../store.js';
import { escapeHTML } from '../utils.js';
import { withSpinner } from './helpers.js';

// --- Funciones Manejadoras (Handlers) ---

function handleDocumentSubmit(e, type) {
    e.preventDefault();
    const form = e.target;
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
        status: 'Adeudada',
    };
    withSpinner(() => {
        actions.addDocument(docData);
        form.reset();
        // Set default date again after reset
        const dateInput = form.querySelector(`#${type.toLowerCase()}-date`);
        if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
    })();
}


function handleDocumentsTableClick(e) {
    const statusBtn = e.target.closest('.status-btn');
    const deleteBtn = e.target.closest('.delete-doc-btn');
    const viewBtn = e.target.closest('.view-invoice-btn');
    const receiptBtn = e.target.closest('.generate-receipt-btn');

    if (statusBtn) {
        withSpinner(() => actions.toggleDocumentStatus(statusBtn.dataset.id), 150)();
    }
    if (deleteBtn) {
        // --- INICIO DE CORRECCIÓN ---
        // Se añade async/await para asegurar que withSpinner complete su ejecución
        // antes de que el modal intente hacer algo más.
        showConfirmationModal('Eliminar Documento', '¿Seguro que quieres eliminar este documento?', async () => {
            await withSpinner(async () => {
                actions.deleteDocument(deleteBtn.dataset.id);
            })();
        });
        // --- FIN DE CORRECCIÓN ---
    }
    if (viewBtn) {
        showInvoiceViewer(viewBtn.dataset.id);
    }
    if (receiptBtn) {
        showPaymentDetailsModal(receiptBtn.dataset.id);
    }
}


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
    
    // Re-bind proformasTableBody para evitar duplicados
    if (elements.proformasTableBody) {
        const newTbody = elements.proformasTableBody.cloneNode(false);
        elements.proformasTableBody.parentNode.replaceChild(newTbody, elements.proformasTableBody);
        elements.proformasTableBody = newTbody;
        elements.proformasTableBody.addEventListener('click', handleDocumentsTableClick);
    }
    
    const proformasSearch = document.getElementById('proformas-search');
    if (proformasSearch) proformasSearch.addEventListener('input', () => renderAll());

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
    if (facturasSearch) facturasSearch.addEventListener('input', () => renderAll());
    
    // Configuración AEAT
    if (elements.aeatConfigForm) elements.aeatConfigForm.addEventListener('submit', handleAeatConfigSave);
    
    // Modal de Detalles de Pago
    if (elements.paymentDetailsForm) elements.paymentDetailsForm.addEventListener('submit', handlePaymentDetailsSubmit);
    if (elements.paymentDetailsCancelBtn) elements.paymentDetailsCancelBtn.addEventListener('click', hidePaymentDetailsModal);
}

