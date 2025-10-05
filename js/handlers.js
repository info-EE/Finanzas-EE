import * as actions from './actions.js';
import { elements, switchPage, populateCategories, updateCurrencySymbol, updateTransferFormUI, showInvoiceViewer, hideInvoiceViewer, printInvoice, downloadInvoiceAsPDF, populateClientSelectForInvoice, showConfirmationModal, showAlertModal, resetTransactionForm, exportReportAsXLSX, exportReportAsPDF, showPaymentDetailsModal, hidePaymentDetailsModal, showReceiptViewer, showSpinner, hideSpinner } from './ui.js';
import { getState } from './store.js';
import { ESSENTIAL_INCOME_CATEGORIES, ESSENTIAL_EXPENSE_CATEGORIES, ESSENTIAL_OPERATION_TYPES } from './config.js';
import { escapeHTML } from './utils.js';

// --- Helper for showing spinner during actions ---
function withSpinner(action, delay = 300) {
    return (...args) => {
        showSpinner();
        setTimeout(() => {
            try {
                action(...args);
            } catch (e) {
                console.error("Error during action:", e);
                showAlertModal('Error', 'Ocurrió un error inesperado durante la operación.');
            } finally {
                hideSpinner();
            }
        }, delay);
    };
}


// --- Funciones Manejadoras (Handlers) ---

function handleTransactionFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const id = form.querySelector('#transaction-id').value;
    const accountName = form.querySelector('#transaction-account').value;
    const { accounts } = getState();
    const account = accounts.find(acc => acc.name === accountName);

    if (!account) {
        showAlertModal('Error', 'Debe seleccionar una cuenta válida.');
        return;
    }

    const transactionData = {
        date: form.querySelector('#transaction-date').value,
        description: form.querySelector('#transaction-description').value,
        type: form.querySelector('#transaction-type').value,
        part: form.querySelector('#transaction-part').value,
        account: accountName,
        category: form.querySelector('#transaction-category').value,
        amount: parseFloat(form.querySelector('#transaction-amount').value),
        iva: parseFloat(form.querySelector('#transaction-iva').value) || 0,
        currency: account.currency
    };

    const saveAction = () => {
        actions.saveTransaction(transactionData, id);
        resetTransactionForm();
    };
    
    withSpinner(saveAction)();
}

function handleTransactionsTableClick(e) {
    const editBtn = e.target.closest('.edit-btn');
    const deleteBtn = e.target.closest('.delete-btn');

    if (editBtn) {
        const id = editBtn.dataset.id;
        const { transactions } = getState();
        const transaction = transactions.find(t => t.id === id);
        if (transaction) {
            const form = elements.transactionForm;
            form.querySelector('#transaction-id').value = transaction.id;
            form.querySelector('#transaction-date').value = transaction.date;
            form.querySelector('#transaction-description').value = transaction.description;
            form.querySelector('#transaction-type').value = transaction.type;
            populateCategories();
            form.querySelector('#transaction-category').value = transaction.category;
            form.querySelector('#transaction-part').value = transaction.part;
            form.querySelector('#transaction-account').value = transaction.account;
            form.querySelector('#transaction-amount').value = transaction.amount;
            form.querySelector('#transaction-iva').value = transaction.iva || '';
            updateCurrencySymbol();
            
            form.querySelector('#form-submit-button-text').textContent = 'Actualizar';
            form.querySelector('#form-cancel-button').classList.remove('hidden');
            form.querySelector('#form-title').textContent = 'Editar Movimiento';
            form.scrollIntoView({ behavior: 'smooth' });
        }
    }

    if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        showConfirmationModal('Eliminar Movimiento', '¿Estás seguro de que quieres eliminar este movimiento?', withSpinner(() => {
            actions.deleteTransaction(id);
        }));
    }
}

function handleAddAccount(e) {
    e.preventDefault();
    const form = e.target;
    const name = form.querySelector('#new-account-name').value;
    const { accounts } = getState();

    if (accounts.some(acc => acc.name.toLowerCase() === name.toLowerCase())) {
        showAlertModal('Error', 'Ya existe una cuenta con ese nombre.');
        return;
    }
    
    const accountData = {
        name: name,
        currency: form.querySelector('#new-account-currency').value,
        balance: parseFloat(form.querySelector('#new-account-balance').value) || 0,
        logoHtml: form.querySelector('#new-account-logo').value,
    };
    
    withSpinner(() => {
        actions.addAccount(accountData);
        form.reset();
    })();
}

function handleSettingsAccountsListClick(e) {
    const deleteBtn = e.target.closest('.delete-account-btn');
    if (deleteBtn) {
        const accountName = deleteBtn.dataset.name;
        showConfirmationModal('Eliminar Cuenta', `¿Seguro que quieres eliminar la cuenta "${escapeHTML(accountName)}"? Se eliminarán todas sus transacciones.`, withSpinner(() => {
            actions.deleteAccount(accountName);
        }));
    }
}

function handleUpdateBalance(e) {
    e.preventDefault();
    const form = e.target;
    const accountName = form.querySelector('#update-account-select').value;
    const newBalance = parseFloat(form.querySelector('#new-balance-amount').value);

    withSpinner(() => {
        actions.updateBalance(accountName, newBalance);
        showAlertModal('Éxito', `Se ha creado un ajuste de saldo para la cuenta ${escapeHTML(accountName)}.`);
        form.reset();
    })();
}

function handleTransferFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const fromAccountName = form.querySelector('#transfer-from').value;
    const toAccountName = form.querySelector('#transfer-to').value;
    
    if (fromAccountName === toAccountName) {
        showAlertModal('Error', 'La cuenta de origen y destino no pueden ser la misma.');
        return;
    }

    const { accounts } = getState();
    const fromAccount = accounts.find(a => a.name === fromAccountName);
    const amount = parseFloat(form.querySelector('#transfer-amount').value);
    let receivedAmount = amount;
    
    if (fromAccount.currency !== accounts.find(a=>a.name === toAccountName).currency) {
        receivedAmount = parseFloat(form.querySelector('#transfer-extra-field').value);
        if (!receivedAmount || receivedAmount <= 0) {
            showAlertModal('Error', 'Debes especificar el monto a recibir para transferencias entre monedas diferentes.');
            return;
        }
    }

    const transferData = {
        date: form.querySelector('#transfer-date').value,
        fromAccountName,
        toAccountName,
        amount: amount,
        feeSource: parseFloat(form.querySelector('#transfer-fee-source').value) || 0,
        receivedAmount: receivedAmount,
    };

    withSpinner(() => {
        actions.addTransfer(transferData);
        form.reset();
    })();
}

function handleAddCategory(e, type) {
    e.preventDefault();
    const form = e.target;
    const inputId = type === 'income' ? 'new-income-category' : (type === 'expense' ? 'new-expense-category' : 'new-operation-type');
    const input = form.querySelector(`#${inputId}`);
    const categoryName = input.value.trim();

    if (categoryName) {
        withSpinner(() => {
            actions.addCategory(categoryName, type);
            input.value = '';
        }, 150)(); // Shorter delay for quick actions
    }
}

function handleDeleteCategory(e, type, essentialCategories) {
    const deleteBtn = e.target.closest('.delete-category-btn');
    if (deleteBtn) {
        const categoryName = deleteBtn.dataset.name;
        
        if (essentialCategories.includes(categoryName)) {
            showAlertModal('Error', 'No se puede eliminar una categoría esencial del sistema.');
            return;
        }

        showConfirmationModal('Eliminar Categoría', `¿Seguro que quieres eliminar la categoría "${escapeHTML(categoryName)}"?`, withSpinner(() => {
            actions.deleteCategory(categoryName, type);
        }, 150));
    }
}

function handleClientFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const id = form.querySelector('#client-id').value;
    
    const clientData = {
        name: form.querySelector('#client-name').value,
        taxIdType: form.querySelector('#client-tax-id-type').value,
        taxId: form.querySelector('#client-tax-id').value,
        address: form.querySelector('#client-address').value,
        phoneLandlinePrefix: form.querySelector('#client-phone-landline-prefix').value,
        phoneLandline: form.querySelector('#client-phone-landline').value,
        phoneMobilePrefix: form.querySelector('#client-phone-mobile-prefix').value,
        phoneMobile: form.querySelector('#client-phone-mobile').value,
        email: form.querySelector('#client-email').value,
        industry: form.querySelector('#client-industry').value,
    };

    const saveAction = () => {
        actions.saveClient(clientData, id);
        form.reset();
        form.querySelector('#client-id').value = '';
        document.getElementById('client-form-title').textContent = 'Agregar Nuevo Cliente';
        document.getElementById('client-form-submit-text').textContent = 'Guardar Cliente';
        document.getElementById('client-form-cancel-btn').classList.add('hidden');
    };

    withSpinner(saveAction)();
}

function handleClientsTableClick(e) {
    const editBtn = e.target.closest('.edit-client-btn');
    const deleteBtn = e.target.closest('.delete-client-btn');
    
    if (editBtn) {
        const id = editBtn.dataset.id;
        const { clients } = getState();
        const client = clients.find(c => c.id === id);
        if (client) {
            const form = elements.addClientForm;
            form.querySelector('#client-id').value = client.id;
            form.querySelector('#client-name').value = client.name;
            form.querySelector('#client-tax-id-type').value = client.taxIdType;
            form.querySelector('#client-tax-id').value = client.taxId;
            form.querySelector('#client-address').value = client.address;
            form.querySelector('#client-phone-landline-prefix').value = client.phoneLandlinePrefix;
            form.querySelector('#client-phone-landline').value = client.phoneLandline;
            form.querySelector('#client-phone-mobile-prefix').value = client.phoneMobilePrefix;
            form.querySelector('#client-phone-mobile').value = client.phoneMobile;
            form.querySelector('#client-email').value = client.email;
            form.querySelector('#client-industry').value = client.industry;
            
            document.getElementById('client-form-title').textContent = 'Editar Cliente';
            document.getElementById('client-form-submit-text').textContent = 'Actualizar Cliente';
            document.getElementById('client-form-cancel-btn').classList.remove('hidden');
            form.scrollIntoView({ behavior: 'smooth' });
        }
    }

    if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        showConfirmationModal('Eliminar Cliente', '¿Estás seguro de que quieres eliminar este cliente?', withSpinner(() => {
            actions.deleteClient(id);
        }));
    }
}

function handleDocumentSubmit(e, type) {
    e.preventDefault();
    const form = e.target;
    const docData = {
        type: type,
        date: form.querySelector(`#${type.toLowerCase()}-date`).value,
        number: form.querySelector(`#${type.toLowerCase()}-number`).value,
        client: form.querySelector(`#${type.toLowerCase()}-client`).value,
        amount: parseFloat(form.querySelector(`#${type.toLowerCase()}-amount`).value),
        currency: form.querySelector(`#${type.toLowerCase()}-currency`).value,
        status: 'Adeudada',
    };
    withSpinner(() => {
        actions.addDocument(docData);
        form.reset();
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
        showConfirmationModal('Eliminar Documento', '¿Seguro que quieres eliminar este documento?', withSpinner(() => {
            actions.deleteDocument(deleteBtn.dataset.id);
        }));
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
            input.value = '';
        });
    }
}

function handleGenerateInvoice(e) {
    e.preventDefault();
    const form = e.target;
    
    const items = [];
    form.querySelectorAll('.factura-item').forEach(itemEl => {
        const description = itemEl.querySelector('.item-description').value;
        const quantity = parseFloat(itemEl.querySelector('.item-quantity').value);
        const price = parseFloat(itemEl.querySelector('.item-price').value);
        if (description && !isNaN(quantity) && !isNaN(price)) {
            items.push({ description, quantity, price });
        }
    });

    if (items.length === 0) {
        showAlertModal('Factura Vacía', 'Debes añadir al menos un concepto a la factura.');
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
        elements.facturaItemsContainer.innerHTML = '';
        document.getElementById('factura-add-item-btn').click();

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

    const generateAction = () => {
        const updatedInvoice = actions.savePaymentDetails(invoiceId, paymentData);
        if (updatedInvoice) {
            hidePaymentDetailsModal();
            showReceiptViewer(updatedInvoice);
        } else {
            showAlertModal('Error', 'No se pudo encontrar la factura para guardar los detalles del pago.');
        }
    };
    
    withSpinner(generateAction)();
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

function handleFiscalParamsSave(e) {
    e.preventDefault();
    const form = e.target;
    const rate = parseFloat(form.querySelector('#corporate-tax-rate').value);
    if (!isNaN(rate) && rate >= 0 && rate <= 100) {
        withSpinner(() => {
            actions.saveFiscalParams({ corporateTaxRate: rate });
            showAlertModal('Éxito', 'Los parámetros fiscales han sido actualizados.');
        })();
    } else {
        showAlertModal('Error', 'Por favor, introduce un valor válido para el tipo impositivo (0-100).');
    }
}

function handleReportGeneration(e) {
    e.preventDefault();
    const form = e.target;
    const type = form.querySelector('#report-type').value;
    let filters = { type };

    if (type === 'sociedades') {
        filters.year = form.querySelector('#report-year-sociedades').value;
        filters.period = form.querySelector('#report-periodo-sociedades').value;
    } else {
        filters.period = form.querySelector('#report-period').value;
        filters.account = form.querySelector('#report-account').value;
        filters.part = form.querySelector('#report-part').value;
        switch (filters.period) {
            case 'daily': filters.date = form.querySelector('#report-date').value; break;
            case 'weekly': filters.week = form.querySelector('#report-week').value; break;
            case 'monthly': filters.month = form.querySelector('#report-month').value; break;
            case 'annual': filters.year = form.querySelector('#report-year').value; break;
        }
    }
    withSpinner(() => actions.generateReport(filters), 500)();
}

function handleIvaReportGeneration() {
    const month = elements.ivaMonthInput.value;
    if (month) {
        withSpinner(() => actions.generateIvaReport(month), 500)();
    } else {
        showAlertModal('Falta Información', 'Por favor, seleccione un mes para generar el reporte de IVA.');
    }
}

function handleCloseYear() {
    const startDate = document.getElementById('cierre-start-date').value;
    const endDate = document.getElementById('cierre-end-date').value;

    if (!startDate || !endDate) {
        showAlertModal('Error', 'Debes seleccionar una fecha de inicio y de cierre.');
        return;
    }
    const year = new Date(endDate).getFullYear();
    showConfirmationModal('Confirmar Cierre Anual', `Estás a punto de archivar todos los datos del ${startDate} al ${endDate} bajo el año ${year}. Esta acción no se puede deshacer. ¿Continuar?`, withSpinner(() => {
        actions.closeYear(startDate, endDate);
        showAlertModal('Éxito', `Se ha completado el cierre para el año ${year}.`);
    }, 1000));
}

function handleReportFilterChange() {
    const reportType = document.getElementById('report-type').value;
    const period = document.getElementById('report-period').value;

    const isSociedades = reportType === 'sociedades';
    elements.defaultFiltersContainer.classList.toggle('hidden', isSociedades);
    elements.sociedadesFiltersContainer.classList.toggle('hidden', !isSociedades);

    ['daily', 'weekly', 'monthly', 'annual'].forEach(p => {
        const el = document.getElementById(`date-input-${p}`);
        if (el) el.classList.toggle('hidden', p !== period);
    });
}

function handleReportDownloadClick(e) {
    const downloadBtn = e.target.closest('#report-download-btn');
    if (downloadBtn) {
        document.getElementById('report-download-options').classList.toggle('show');
        return;
    }

    const formatBtn = e.target.closest('.download-option');
    if (formatBtn) {
        const format = formatBtn.dataset.format;
        if (format === 'xlsx') {
            exportReportAsXLSX();
        } else if (format === 'pdf') {
            exportReportAsPDF();
        }
        document.getElementById('report-download-options').classList.remove('show');
    }
}


// --- Vinculación de Eventos (Event Binding) ---

export function bindEventListeners() {
    elements.sidebar.querySelector('#sidebar-toggle').addEventListener('click', () => {
        elements.sidebar.classList.toggle('w-64');
        elements.sidebar.classList.toggle('w-20');
        elements.mainContent.classList.toggle('ml-64');
        elements.mainContent.classList.toggle('ml-20');
        document.querySelectorAll('.nav-text').forEach(text => text.classList.toggle('hidden'));
    });
    elements.navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = link.id.replace('nav-', '');
            switchPage(pageId);
        });
    });

    elements.transactionForm.addEventListener('submit', handleTransactionFormSubmit);
    elements.transactionsTableBody.addEventListener('click', handleTransactionsTableClick);
    elements.transactionForm.querySelector('#transaction-type').addEventListener('change', populateCategories);
    elements.transactionForm.querySelector('#transaction-account').addEventListener('change', updateCurrencySymbol);
    elements.transactionForm.querySelector('#form-cancel-button').addEventListener('click', resetTransactionForm);
    document.getElementById('cashflow-search').addEventListener('input', () => switchPage('cashflow'));

    elements.transferForm.addEventListener('submit', handleTransferFormSubmit);
    ['transfer-from', 'transfer-to'].forEach(id => {
        document.getElementById(id).addEventListener('change', updateTransferFormUI);
    });

    elements.proformaForm.addEventListener('submit', (e) => handleDocumentSubmit(e, 'Proforma'));
    elements.proformasTableBody.addEventListener('click', handleDocumentsTableClick);
    document.getElementById('proformas-search').addEventListener('input', () => switchPage('proformas'));

    elements.addAccountForm.addEventListener('submit', handleAddAccount);
    elements.settingsAccountsList.addEventListener('click', handleSettingsAccountsListClick);
    elements.updateBalanceForm.addEventListener('submit', handleUpdateBalance);
    elements.addIncomeCategoryForm.addEventListener('submit', (e) => handleAddCategory(e, 'income'));
    elements.addExpenseCategoryForm.addEventListener('submit', (e) => handleAddCategory(e, 'expense'));
    elements.addOperationTypeForm.addEventListener('submit', (e) => handleAddCategory(e, 'operationType'));
    elements.incomeCategoriesList.addEventListener('click', (e) => handleDeleteCategory(e, 'income', ESSENTIAL_INCOME_CATEGORIES));
    elements.expenseCategoriesList.addEventListener('click', (e) => handleDeleteCategory(e, 'expense', ESSENTIAL_EXPENSE_CATEGORIES));
    elements.operationTypesList.addEventListener('click', (e) => handleDeleteCategory(e, 'operationType', ESSENTIAL_OPERATION_TYPES));
    
    elements.addClientForm.addEventListener('submit', handleClientFormSubmit);
    elements.clientsTableBody.addEventListener('click', handleClientsTableClick);
    elements.addClientForm.querySelector('#client-form-cancel-btn').addEventListener('click', () => {
        elements.addClientForm.reset();
        document.getElementById('client-form-title').textContent = 'Agregar Nuevo Cliente';
        document.getElementById('client-form-submit-text').textContent = 'Guardar Cliente';
        document.getElementById('client-form-cancel-btn').classList.add('hidden');
    });

    document.getElementById('facturacion-tab-crear').addEventListener('click', () => switchPage('facturacion', 'crear'));
    document.getElementById('facturacion-tab-listado').addEventListener('click', () => switchPage('facturacion', 'listado'));
    document.getElementById('facturacion-tab-config').addEventListener('click', () => switchPage('facturacion', 'config'));
    elements.facturaAddItemBtn.addEventListener('click', () => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'grid grid-cols-12 gap-2 items-center factura-item';
        itemDiv.innerHTML = `
            <div class="col-span-6"><input type="text" class="form-input item-description" required></div>
            <div class="col-span-2"><input type="number" value="1" class="form-input item-quantity" required></div>
            <div class="col-span-3"><input type="number" class="form-input item-price" required></div>
            <div class="col-span-1 flex justify-center"><button type="button" class="remove-item-btn p-2 text-red-400 hover:text-red-300"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div>`;
        elements.facturaItemsContainer.appendChild(itemDiv);
        lucide.createIcons();
    });
    elements.facturaItemsContainer.addEventListener('click', (e) => {
        if (e.target.closest('.remove-item-btn')) {
            e.target.closest('.factura-item').remove();
        }
    });
    elements.facturaSelectCliente.addEventListener('change', handleClientSelectionForInvoice);
    elements.nuevaFacturaForm.addEventListener('submit', handleGenerateInvoice);
    elements.facturasTableBody.addEventListener('click', handleDocumentsTableClick);
    document.getElementById('facturas-search').addEventListener('input', () => switchPage('facturacion', 'listado'));
    elements.aeatConfigForm.addEventListener('submit', handleAeatConfigSave);
    elements.aeatToggleContainer.addEventListener('click', (e) => {
        if (e.target.closest('.aeat-toggle-btn')) {
            withSpinner(() => actions.toggleAeatModule(), 150)();
        }
    });
    elements.fiscalParamsForm.addEventListener('submit', handleFiscalParamsSave);

    elements.closeInvoiceViewerBtn.addEventListener('click', hideInvoiceViewer);
    elements.printInvoiceBtn.addEventListener('click', printInvoice);
    elements.pdfInvoiceBtn.addEventListener('click', downloadInvoiceAsPDF);

    elements.reportForm.addEventListener('submit', handleReportGeneration);
    document.getElementById('report-type').addEventListener('change', handleReportFilterChange);
    document.getElementById('report-period').addEventListener('change', handleReportFilterChange);
    elements.reportDisplayArea.addEventListener('click', handleReportDownloadClick);

    document.getElementById('close-year-btn').addEventListener('click', handleCloseYear);

    elements.paymentDetailsForm.addEventListener('submit', handlePaymentDetailsSubmit);
    elements.paymentDetailsCancelBtn.addEventListener('click', hidePaymentDetailsModal);

    elements.ivaGenerateReportBtn.addEventListener('click', handleIvaReportGeneration);
}
