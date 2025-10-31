import * as actions from '../actions.js';
import { elements } from '../ui/elements.js'; // <-- CORREGIDO
import {
    switchPage,
    renderAll
} from '../ui.js'; // Funciones principales de UI
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
        const id = statusBtn.dataset.id;
        // --- MODIFICACIÓN: Lógica de confirmación para 'Adeudada' ---
        const { documents } = getState();
        const doc = documents.find(d => d.id === id);
        
        if (doc && doc.status === 'Cobrada') {
            // Si está "Cobrada" y se quiere pasar a "Adeudada"
            showConfirmationModal(
                'Revertir Cobro', 
                `¿Estás seguro de que quieres marcar esta factura como "Adeudada"? Esto buscará y eliminará el ingreso asociado en el Flujo de Caja.`,
                () => {
                    withSpinner(() => actions.toggleDocumentStatus(id), 150)();
                }
            );
        } else if (doc && doc.status === 'Adeudada') {
            // Si está "Adeudada" y se quiere pasar a "Cobrada"
            // Forzar el modal de pago.
            showPaymentDetailsModal(id);
            // No llamamos a toggleDocumentStatus directamente, el modal lo hará.
        }
        // --- FIN MODIFICACIÓN ---
    }
    if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        showConfirmationModal('Eliminar Documento', '¿Seguro que quieres eliminar este documento? Si estaba cobrado, también se eliminará el ingreso asociado.', async () => {
            await withSpinner(() => actions.deleteDocument(id))();
        });
    }
    if (viewBtn) {
        // --- CORRECCIÓN: Usar getState() para pasar el estado al visualizador ---
        showInvoiceViewer(viewBtn.dataset.id, getState());
    }
    if (receiptBtn) {
        // Si la factura ya está cobrada, igual mostramos el modal
        // para permitir *modificar* el pago.
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
        amount: total, // 'amount' y 'total' son iguales
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


// --- MODIFICACIÓN: Esta es la función principal del plan ---
async function handlePaymentDetailsSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const invoiceId = form.querySelector('#payment-details-invoice-id').value;

    // 1. Obtener datos del modal (incluyendo la nueva cuenta)
    const paymentData = {
        method: form.querySelector('#payment-method').value,
        date: form.querySelector('#payment-date').value,
        reference: form.querySelector('#payment-reference').value,
    };
    // Este es el 'select' que añadimos en index.html y elements.js
    const paymentAccountName = document.getElementById('payment-account').value;

    // 2. Validar la cuenta
    if (!paymentAccountName) {
        showAlertModal('Error', 'Debe seleccionar una cuenta de ingreso válida.');
        return;
    }

    // 3. Obtener los datos de la factura (la necesitamos para el monto y número)
    const { documents, transactions } = getState();
    const invoice = documents.find(doc => doc.id === invoiceId);
    if (!invoice) {
        showAlertModal('Error', 'No se pudo encontrar la factura (ID: ' + invoiceId + ').');
        return;
    }
    
    // 4. (Lógica de Modificación) Verificar si ya existe un ingreso vinculado
    // Esto permite al usuario "volver a generar" el recibo para cambiar la cuenta o fecha,
    // y en lugar de crear un duplicado, actualiza el ingreso original.
    const existingTx = transactions.find(t => t.linkedInvoiceId === invoiceId || t.id === invoice.linkedTransactionId);

    // Iniciar spinner
    withSpinner(async () => {
        let newOrUpdatedTransactionId = null;
        
        // 5. Preparar los datos de la transacción de INGRESO
        const transactionData = {
            date: paymentData.date,
            description: `Cobro Factura ${invoice.number || ''}`,
            type: 'Ingreso',
            part: 'A', // Asumimos 'A' para ingresos de facturas
            account: paymentAccountName, // El nombre de la cuenta del modal
            category: 'Ventas', // Categoría por defecto para cobros
            amount: invoice.total, // Usamos el TOTAL de la factura
            iva: 0, // El IVA ya está incluido en el 'total' de la factura. El ingreso es por el total.
            linkedInvoiceId: invoiceId // El vínculo clave
        };
        
        if (existingTx) {
            // --- Lógica de ACTUALIZACIÓN (si se equivocó) ---
            console.log(`Actualizando transacción existente ${existingTx.id} para factura ${invoiceId}`);
            // saveTransaction (con ID) se encarga de revertir saldos viejos y aplicar nuevos
            await actions.saveTransaction(transactionData, existingTx.id);
            newOrUpdatedTransactionId = existingTx.id;
            
        } else {
            // --- Lógica de CREACIÓN (normal) ---
            console.log(`Creando nueva transacción para factura ${invoiceId}`);
            // 6. Guardar la transacción (nos devuelve la tx con su ID)
            const newTransaction = await actions.saveTransaction(transactionData, null); // null para nuevo
            
            if (!newTransaction || !newTransaction.id) {
                showAlertModal('Error Crítico', 'No se pudo crear el ingreso en el Cash Flow. El recibo no fue generado.');
                throw new Error("Fallo al crear la transacción vinculada.");
            }
            newOrUpdatedTransactionId = newTransaction.id;
        }

        // 7. Guardar los detalles del pago y el ID de la transacción en la Factura
        // (La acción 'savePaymentDetails' ya la modificamos para que acepte el ID)
        const updatedInvoice = await actions.savePaymentDetails(invoiceId, paymentData, newOrUpdatedTransactionId);
        
        // 8. Mostrar el recibo
        if (updatedInvoice) {
            hidePaymentDetailsModal();
            showReceiptViewer(updatedInvoice);
        } else {
            showAlertModal('Error', 'Se creó el ingreso, pero no se pudo actualizar la factura.');
        }
        
    })(); // Fin de withSpinner
}
// --- FIN DE MODIFICACIÓN ---


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
    
    // --- MODIFICACIÓN: Asegurarse de que el listener del formulario de pago esté asignado ---
    // Modal de Detalles de Pago
    if (elements.paymentDetailsForm) {
        // Re-clonar el formulario para limpiar listeners antiguos y evitar duplicados
        const newForm = elements.paymentDetailsForm.cloneNode(true);
        elements.paymentDetailsForm.parentNode.replaceChild(newForm, elements.paymentDetailsForm);
        elements.paymentDetailsForm = newForm;
        // Asignar el nuevo manejador
        elements.paymentDetailsForm.addEventListener('submit', handlePaymentDetailsSubmit); 
        
        // Volver a asignar el botón de cancelar al nuevo formulario
        const newCancelBtn = newForm.querySelector('#payment-details-cancel-btn');
        if (newCancelBtn) {
            newCancelBtn.addEventListener('click', hidePaymentDetailsModal);
            elements.paymentDetailsCancelBtn = newCancelBtn; // Actualizar referencia global
        }
    }
    // --- FIN MODIFICACIÓN ---

    // --- LISTENERS DE MODAL AÑADIDOS ---
    if (elements.closeInvoiceViewerBtn) elements.closeInvoiceViewerBtn.addEventListener('click', handleCloseInvoiceViewer);
    if (elements.printInvoiceBtn) elements.printInvoiceBtn.addEventListener('click', handlePrintInvoice);
    if (elements.pdfInvoiceBtn) elements.pdfInvoiceBtn.addEventListener('click', handleDownloadPDF);
    // --- FIN DE LISTENERS AÑADIDOS ---
}
