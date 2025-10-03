import * as actions from './actions.js';
import { elements, switchPage, populateCategories, updateCurrencySymbol, updateTransferFormUI, showInvoiceViewer, hideInvoiceViewer, printInvoice, downloadInvoiceAsPDF, populateClientSelectForInvoice, showConfirmationModal, showAlertModal, resetTransactionForm } from './ui.js';
import { getState } from './store.js';
import { ESSENTIAL_INCOME_CATEGORIES, ESSENTIAL_EXPENSE_CATEGORIES, ESSENTIAL_OPERATION_TYPES } from './config.js';
import { escapeHTML } from './utils.js';

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
        currency: account.currency,
        isInitialBalance: false,
    };

    actions.saveTransaction(transactionData, id);
    resetTransactionForm();
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
            populateCategories(); // Actualiza las categorías según el tipo
            form.querySelector('#transaction-category').value = transaction.category;
            form.querySelector('#transaction-part').value = transaction.part;
            form.querySelector('#transaction-account').value = transaction.account;
            form.querySelector('#transaction-amount').value = transaction.amount;
            updateCurrencySymbol();
            
            form.querySelector('#form-submit-button-text').textContent = 'Actualizar';
            form.querySelector('#form-cancel-button').classList.remove('hidden');
            form.querySelector('#form-title').textContent = 'Editar Movimiento';
            form.scrollIntoView({ behavior: 'smooth' });
        }
    }

    if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        showConfirmationModal('Eliminar Movimiento', '¿Estás seguro de que quieres eliminar este movimiento?', () => {
            actions.deleteTransaction(id);
        });
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
    
    actions.addAccount(accountData);
    form.reset();
}

function handleSettingsAccountsListClick(e) {
    const deleteBtn = e.target.closest('.delete-account-btn');
    if (deleteBtn) {
        const accountName = deleteBtn.dataset.name;
        showConfirmationModal('Eliminar Cuenta', `¿Seguro que quieres eliminar la cuenta "${escapeHTML(accountName)}"? Se eliminarán todas sus transacciones.`, () => {
            actions.deleteAccount(accountName);
        });
    }
}

function handleUpdateBalance(e) {
    e.preventDefault();
    const form = e.target;
    const accountName = form.querySelector('#update-account-select').value;
    const newBalance = parseFloat(form.querySelector('#new-balance-amount').value);

    actions.updateBalance(accountName, newBalance);
    showAlertModal('Éxito', `Se ha creado un ajuste de saldo para la cuenta ${escapeHTML(accountName)}.`);
    form.reset();
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
    const toAccount = accounts.find(a => a.name === toAccountName);

    let receivedAmount = parseFloat(form.querySelector('#transfer-amount').value);
    
    // Si las monedas son diferentes, el monto recibido es el del campo extra.
    if (fromAccount.currency !== toAccount.currency) {
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
        amount: parseFloat(form.querySelector('#transfer-amount').value),
        feeSource: parseFloat(form.querySelector('#transfer-fee-source').value) || 0,
        receivedAmount: receivedAmount,
    };

    actions.addTransfer(transferData);
    form.reset();
}

function handleAddCategory(e, type) {
    e.preventDefault();
    const form = e.target;
    const inputId = type === 'income' ? 'new-income-category' : (type === 'expense' ? 'new-expense-category' : 'new-operation-type');
    const input = form.querySelector(`#${inputId}`);
    const categoryName = input.value.trim();

    if (categoryName) {
        actions.addCategory(categoryName, type);
        input.value = '';
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

        showConfirmationModal('Eliminar Categoría', `¿Seguro que quieres eliminar la categoría "${escapeHTML(categoryName)}"?`, () => {
            actions.deleteCategory(categoryName, type);
        });
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

    actions.saveClient(clientData, id);
    
    form.reset();
    form.querySelector('#client-id').value = '';
    document.getElementById('client-form-title').textContent = 'Agregar Nuevo Cliente';
    document.getElementById('client-form-submit-text').textContent = 'Guardar Cliente';
    document.getElementById('client-form-cancel-btn').classList.add('hidden');
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
        showConfirmationModal('Eliminar Cliente', '¿Estás seguro de que quieres eliminar este cliente?', () => {
            actions.deleteClient(id);
        });
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
    actions.addDocument(docData);
    form.reset();
}

function handleDocumentsTableClick(e) {
    const statusBtn = e.target.closest('.status-btn');
    const deleteBtn = e.target.closest('.delete-doc-btn');
    const viewBtn = e.target.closest('.view-invoice-btn');

    if (statusBtn) {
        actions.toggleDocumentStatus(statusBtn.dataset.id);
    }
    if (deleteBtn) {
        showConfirmationModal('Eliminar Documento', '¿Seguro que quieres eliminar este documento?', () => {
            actions.deleteDocument(deleteBtn.dataset.id);
        });
    }
    if (viewBtn) {
        showInvoiceViewer(viewBtn.dataset.id);
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
        items.push({
            description: itemEl.querySelector('.item-description').value,
            quantity: parseFloat(itemEl.querySelector('.item-quantity').value),
            price: parseFloat(itemEl.querySelector('.item-price').value)
        });
    });

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
        total
    };
    
    actions.addDocument(newInvoice);
    
    form.reset();
    elements.facturaItemsContainer.innerHTML = '';
    // Re-añadir un item inicial
    const itemDiv = document.createElement('div');
    itemDiv.className = 'grid grid-cols-12 gap-2 items-center factura-item';
    itemDiv.innerHTML = `
        <div class="col-span-6"><input type="text" class="form-input item-description" required></div>
        <div class="col-span-2"><input type="number" value="1" class="form-input item-quantity" required></div>
        <div class="col-span-3"><input type="number" class="form-input item-price" required></div>
        <div class="col-span-1"></div>`;
    elements.facturaItemsContainer.appendChild(itemDiv);

    showAlertModal('Éxito', `La factura Nº ${escapeHTML(newInvoice.number)} ha sido creada.`);
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
    actions.saveAeatConfig(aeatConfig);
    showAlertModal('Éxito', 'La configuración de AEAT ha sido guardada.');
}

function handleFiscalParamsSave(e) {
    e.preventDefault();
    const form = e.target;
    const rate = parseFloat(form.querySelector('#corporate-tax-rate').value);
    if (!isNaN(rate) && rate >= 0 && rate <= 100) {
        actions.saveFiscalParams({ corporateTaxRate: rate });
        showAlertModal('Éxito', 'Los parámetros fiscales han sido actualizados.');
    } else {
        showAlertModal('Error', 'Por favor, introduce un valor válido para el tipo impositivo (0-100).');
    }
}


// --- Vinculación de Eventos (Event Binding) ---

export function bindEventListeners() {
    // Navegación y Sidebar
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

    // Cash Flow
    elements.transactionForm.addEventListener('submit', handleTransactionFormSubmit);
    elements.transactionsTableBody.addEventListener('click', handleTransactionsTableClick);
    elements.transactionForm.querySelector('#transaction-type').addEventListener('change', populateCategories);
    elements.transactionForm.querySelector('#transaction-account').addEventListener('change', updateCurrencySymbol);
    elements.transactionForm.querySelector('#form-cancel-button').addEventListener('click', resetTransactionForm);
    document.getElementById('cashflow-search').addEventListener('input', () => switchPage('cashflow')); // Re-render on search

    // Transferencias
    elements.transferForm.addEventListener('submit', handleTransferFormSubmit);
    ['transfer-from', 'transfer-to'].forEach(id => {
        document.getElementById(id).addEventListener('change', updateTransferFormUI);
    });

    // Proformas
    elements.proformaForm.addEventListener('submit', (e) => handleDocumentSubmit(e, 'Proforma'));
    elements.proformasTableBody.addEventListener('click', handleDocumentsTableClick);
    document.getElementById('proformas-search').addEventListener('input', () => switchPage('proformas')); // Re-render

    // Ajustes
    elements.addAccountForm.addEventListener('submit', handleAddAccount);
    elements.settingsAccountsList.addEventListener('click', handleSettingsAccountsListClick);
    elements.updateBalanceForm.addEventListener('submit', handleUpdateBalance);
    elements.addIncomeCategoryForm.addEventListener('submit', (e) => handleAddCategory(e, 'income'));
    elements.addExpenseCategoryForm.addEventListener('submit', (e) => handleAddCategory(e, 'expense'));
    elements.addOperationTypeForm.addEventListener('submit', (e) => handleAddCategory(e, 'operationType'));
    elements.incomeCategoriesList.addEventListener('click', (e) => handleDeleteCategory(e, 'income', ESSENTIAL_INCOME_CATEGORIES));
    elements.expenseCategoriesList.addEventListener('click', (e) => handleDeleteCategory(e, 'expense', ESSENTIAL_EXPENSE_CATEGORIES));
    elements.operationTypesList.addEventListener('click', (e) => handleDeleteCategory(e, 'operationType', ESSENTIAL_OPERATION_TYPES));
    
    // Clientes
    elements.addClientForm.addEventListener('submit', handleClientFormSubmit);
    elements.clientsTableBody.addEventListener('click', handleClientsTableClick);
    elements.addClientForm.querySelector('#client-form-cancel-btn').addEventListener('click', () => {
        elements.addClientForm.reset();
        document.getElementById('client-form-title').textContent = 'Agregar Nuevo Cliente';
        document.getElementById('client-form-submit-text').textContent = 'Guardar Cliente';
        document.getElementById('client-form-cancel-btn').classList.add('hidden');
    });

    // Facturación
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
            actions.toggleAeatModule();
        }
    });
    elements.fiscalParamsForm.addEventListener('submit', handleFiscalParamsSave);

    // Visor de Factura
    elements.closeInvoiceViewerBtn.addEventListener('click', hideInvoiceViewer);
    elements.printInvoiceBtn.addEventListener('click', printInvoice);
    elements.pdfInvoiceBtn.addEventListener('click', downloadInvoiceAsPDF);
}

