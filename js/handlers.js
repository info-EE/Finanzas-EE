/**
 * @file Event Handlers
 * Este archivo conecta los eventos del DOM (clicks, submits, etc.) con las acciones
 * que modifican el estado. Su única responsabilidad es capturar la entrada del usuario
 * y llamar a la función de acción correspondiente.
 */
import { elements, switchPage } from './ui.js';
import { store } from './store.js';
import * as actions from './actions.js';
import { ESSENTIAL_EXPENSE_CATEGORIES, ESSENTIAL_INCOME_CATEGORIES, ESSENTIAL_OPERATION_TYPES } from './config.js';

// --- Helper Functions ---
function showConfirmation(title, message, onConfirm) {
    // Aquí iría la lógica para mostrar tu modal de confirmación
    // Por ahora, usamos el confirm nativo para simplificar
    if (window.confirm(`${title}\n${message}`)) {
        onConfirm();
    }
}

function showAlert(message) {
    // Aquí iría la lógica para mostrar tu modal de alerta
    // Por ahora, usamos el alert nativo
    window.alert(message);
}

// --- Event Handlers ---

function handleTransactionFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const id = form.querySelector('#transaction-id').value;
    const accountName = form.querySelector('#transaction-account').value;
    const account = store.getState().accounts.find(acc => acc.name === accountName);

    if (!account) {
        showAlert('Por favor, selecciona una cuenta válida.');
        return;
    }
    
    const transactionData = {
        id: id || null,
        date: form.querySelector('#transaction-date').value,
        description: form.querySelector('#transaction-description').value,
        type: form.querySelector('#transaction-type').value,
        part: form.querySelector('#transaction-part').value,
        account: accountName,
        category: form.querySelector('#transaction-category').value,
        amount: parseFloat(form.querySelector('#transaction-amount').value),
        currency: account.currency
    };

    actions.addOrUpdateTransaction(transactionData);
    form.reset();
    form.querySelector('#transaction-id').value = '';
    document.getElementById('form-submit-button-text').textContent = 'Guardar';
    document.getElementById('form-cancel-button').classList.add('hidden');
    document.getElementById('form-title').textContent = 'Agregar Nuevo Movimiento';
}

function handleTransactionsTableClick(e) {
    const editBtn = e.target.closest('.edit-btn');
    if (editBtn) {
        const id = editBtn.dataset.id;
        const transaction = store.getState().transactions.find(t => t.id === id);
        if (transaction) {
            const form = elements.transactionForm;
            form.querySelector('#transaction-id').value = transaction.id;
            form.querySelector('#transaction-date').value = transaction.date;
            form.querySelector('#transaction-description').value = transaction.description;
            form.querySelector('#transaction-type').value = transaction.type;
            form.querySelector('#transaction-type').dispatchEvent(new Event('change')); // Actualiza categorías
            form.querySelector('#transaction-part').value = transaction.part;
            form.querySelector('#transaction-account').value = transaction.account;
            form.querySelector('#transaction-category').value = transaction.category;
            form.querySelector('#transaction-amount').value = transaction.amount;

            document.getElementById('form-submit-button-text').textContent = 'Actualizar';
            document.getElementById('form-cancel-button').classList.remove('hidden');
            document.getElementById('form-title').textContent = 'Editar Movimiento';
            form.scrollIntoView({ behavior: 'smooth' });
        }
    }

    const deleteBtn = e.target.closest('.delete-btn');
    if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        showConfirmation('Eliminar Movimiento', '¿Estás seguro?', () => {
            actions.deleteTransaction(id);
        });
    }
}

function handleAddAccountFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const name = form.querySelector('#new-account-name').value;
    if (store.getState().accounts.some(acc => acc.name.toLowerCase() === name.toLowerCase())) {
        showAlert('Ya existe una cuenta con este nombre.');
        return;
    }
    actions.addAccount({
        name,
        currency: form.querySelector('#new-account-currency').value,
        balance: parseFloat(form.querySelector('#new-account-balance').value) || 0,
        logo: form.querySelector('#new-account-logo').value
    });
    form.reset();
}

function handleSettingsAccountsListClick(e) {
    const deleteBtn = e.target.closest('.delete-account-btn');
    if (deleteBtn) {
        const accountName = deleteBtn.dataset.name;
        showConfirmation('Eliminar Cuenta', `¿Seguro que quieres eliminar la cuenta "${accountName}"? Se eliminarán todas sus transacciones.`, () => {
            actions.deleteAccount(accountName);
        });
    }
}

function handleAddCategoryFormSubmit(e, type) {
    e.preventDefault();
    const input = e.target.querySelector('input');
    const categoryName = input.value.trim();
    if (categoryName) {
        actions.addCategory(type, categoryName);
        input.value = '';
    }
}

function handleCategoryDeleteClick(e, type) {
    const deleteBtn = e.target.closest('.delete-category-btn');
    if (deleteBtn) {
        const categoryName = deleteBtn.dataset.name;
        const essential = type === 'income' ? ESSENTIAL_INCOME_CATEGORIES : (type === 'expense' ? ESSENTIAL_EXPENSE_CATEGORIES : ESSENTIAL_OPERATION_TYPES);
        if (essential.includes(categoryName)) {
            showAlert('No se puede eliminar una categoría esencial.');
            return;
        }
        showConfirmation('Eliminar Categoría', `¿Seguro que quieres eliminar "${categoryName}"?`, () => {
            actions.deleteCategory(type, categoryName);
        });
    }
}

function handleClientFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const clientData = {
        id: form.querySelector('#client-id').value || null,
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
    actions.addOrUpdateClient(clientData);
    form.reset();
    form.querySelector('#client-id').value = '';
    document.getElementById('client-form-title').textContent = 'Agregar Nuevo Cliente';
    document.getElementById('client-form-submit-text').textContent = 'Guardar Cliente';
}

function handleClientsTableClick(e) {
    const editBtn = e.target.closest('.edit-client-btn');
    if (editBtn) {
        const id = editBtn.dataset.id;
        const client = store.getState().clients.find(c => c.id === id);
        if (client) {
            const form = elements.addClientForm;
            form.querySelector('#client-id').value = client.id;
            form.querySelector('#client-name').value = client.name;
            // ... rellenar todos los campos del formulario de cliente
            document.getElementById('client-form-title').textContent = 'Editar Cliente';
            document.getElementById('client-form-submit-text').textContent = 'Actualizar Cliente';
            form.scrollIntoView({ behavior: 'smooth' });
        }
    }
    const deleteBtn = e.target.closest('.delete-client-btn');
    if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        showConfirmation('Eliminar Cliente', '¿Estás seguro?', () => {
            actions.deleteClient(id);
        });
    }
}

function handleDocumentTableClick(e) {
    const statusBtn = e.target.closest('.status-btn');
    if (statusBtn) {
        actions.toggleDocumentStatus(statusBtn.dataset.id);
    }
    const deleteBtn = e.target.closest('.delete-doc-btn');
    if (deleteBtn) {
        showConfirmation('Eliminar Documento', '¿Estás seguro?', () => {
            actions.deleteDocument(deleteBtn.dataset.id);
        });
    }
}

function handleProformaSubmit(e) {
    e.preventDefault();
    const form = e.target;
    actions.addDocument({
        type: 'Proforma',
        date: form.querySelector('#proforma-date').value,
        number: form.querySelector('#proforma-number').value,
        client: form.querySelector('#proforma-client').value,
        amount: parseFloat(form.querySelector('#proforma-amount').value),
        currency: form.querySelector('#proforma-currency').value,
        status: 'Adeudada'
    });
    form.reset();
}

function handleTransferFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const fromAccountName = form.querySelector('#transfer-from').value;
    const toAccountName = form.querySelector('#transfer-to').value;

    if (fromAccountName === toAccountName) {
        showAlert('La cuenta de origen y destino no pueden ser la misma.');
        return;
    }
    const state = store.getState();
    const result = actions.createTransfer({
        date: form.querySelector('#transfer-date').value,
        fromAccount: state.accounts.find(a => a.name === fromAccountName),
        toAccount: state.accounts.find(a => a.name === toAccountName),
        amount: parseFloat(form.querySelector('#transfer-amount').value),
        feeSource: parseFloat(form.querySelector('#transfer-fee-source').value) || 0,
        extraField: parseFloat(form.querySelector('#transfer-extra-field').value) || 0,
    });
    if (result?.error) {
        showAlert(result.error);
    } else {
        form.reset();
    }
}

function handleUpdateBalanceSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const accountName = form.querySelector('#update-account-select').value;
    const newBalance = parseFloat(form.querySelector('#new-balance-amount').value);
    actions.createBalanceAdjustment(accountName, newBalance);
    form.reset();
    showAlert('Ajuste de saldo creado con éxito.');
}

function handleAnnualClosing() {
    const startDate = document.getElementById('cierre-start-date').value;
    const endDate = document.getElementById('cierre-end-date').value;
    if (!startDate || !endDate) {
        showAlert('Debes seleccionar una fecha de inicio y de cierre.');
        return;
    }
    const year = new Date(endDate).getFullYear();
    showConfirmation('Confirmar Cierre Anual', `Estás a punto de archivar todos los datos del ${startDate} al ${endDate} bajo el año ${year}. Esta acción no se puede deshacer. ¿Continuar?`, () => {
        actions.performAnnualClosing(startDate, endDate);
        showAlert(`Se ha completado el cierre para el año ${year}.`);
    });
}


// --- Main Binding Function ---
export function bindEventListeners() {
    elements.sidebar.addEventListener('click', (e) => {
        if (e.target.closest('#sidebar-toggle')) {
            elements.sidebar.classList.toggle('w-64');
            elements.sidebar.classList.toggle('w-20');
            elements.mainContent.classList.toggle('ml-64');
            elements.mainContent.classList.toggle('ml-20');
            document.querySelectorAll('.nav-text').forEach(text => text.classList.toggle('hidden'));
        }
    });
    elements.navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchPage(link.id.replace('nav-', ''));
        });
    });

    // Forms
    elements.transactionForm.addEventListener('submit', handleTransactionFormSubmit);
    elements.addAccountForm.addEventListener('submit', handleAddAccountFormSubmit);
    elements.addIncomeCategoryForm.addEventListener('submit', e => handleAddCategoryFormSubmit(e, 'income'));
    elements.addExpenseCategoryForm.addEventListener('submit', e => handleAddCategoryFormSubmit(e, 'expense'));
    elements.addOperationTypeForm.addEventListener('submit', e => handleAddCategoryFormSubmit(e, 'operationType'));
    elements.addClientForm.addEventListener('submit', handleClientFormSubmit);
    elements.proformaForm.addEventListener('submit', handleProformaSubmit);
    elements.transferForm.addEventListener('submit', handleTransferFormSubmit);
    elements.updateBalanceForm.addEventListener('submit', handleUpdateBalanceSubmit);

    // Table/List Clicks
    elements.transactionsTableBody.addEventListener('click', handleTransactionsTableClick);
    elements.settingsAccountsList.addEventListener('click', handleSettingsAccountsListClick);
    elements.incomeCategoriesList.addEventListener('click', e => handleCategoryDeleteClick(e, 'income'));
    elements.expenseCategoriesList.addEventListener('click', e => handleCategoryDeleteClick(e, 'expense'));
    elements.operationTypesList.addEventListener('click', e => handleCategoryDeleteClick(e, 'operationType'));
    elements.clientsTableBody.addEventListener('click', handleClientsTableClick);
    elements.proformasTableBody.addEventListener('click', handleDocumentTableClick);
    elements.facturasTableBody.addEventListener('click', handleDocumentTableClick);
    
    // Other Buttons & Inputs
    document.getElementById('close-year-btn').addEventListener('click', handleAnnualClosing);
    elements.aeatToggleContainer.addEventListener('click', () => actions.toggleAeatModule());

    // Cancel buttons
    document.getElementById('form-cancel-button').addEventListener('click', () => {
        elements.transactionForm.reset();
        document.getElementById('transaction-id').value = '';
        document.getElementById('form-submit-button-text').textContent = 'Guardar';
        document.getElementById('form-cancel-button').classList.add('hidden');
        document.getElementById('form-title').textContent = 'Agregar Nuevo Movimiento';
    });
}
