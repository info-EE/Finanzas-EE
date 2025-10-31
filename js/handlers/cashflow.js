import * as actions from '../actions.js';
import {
    elements,
    switchPage,
    populateCategories,
    updateCurrencySymbol,
    updateTransferFormUI,
    showConfirmationModal,
    showAlertModal,
    resetTransactionForm,
    renderAll
} from '../ui/index.js';
import { getState } from '../store.js';
import { withSpinner } from './helpers.js';

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

    const amount = parseFloat(form.querySelector('#transaction-amount').value);
    const description = form.querySelector('#transaction-description').value.trim();

    if (!description) {
        showAlertModal('Campo Requerido', 'La descripción no puede estar vacía.');
        return;
    }
    if (isNaN(amount) || amount <= 0) {
        showAlertModal('Valor Inválido', 'El monto debe ser un número positivo.');
        return;
    }

    const transactionData = {
        date: form.querySelector('#transaction-date').value,
        description: description,
        type: form.querySelector('#transaction-type').value,
        part: form.querySelector('#transaction-part').value,
        account: accountName,
        category: form.querySelector('#transaction-category').value,
        amount: amount,
        iva: parseFloat(form.querySelector('#transaction-iva').value) || 0,
        currency: account.currency
    };

    withSpinner(() => {
        actions.saveTransaction(transactionData, id);
        resetTransactionForm();
    })();
}

function handleTransactionsTableClick(e) {
    const editBtn = e.target.closest('.edit-btn');
    const deleteBtn = e.target.closest('.delete-btn');

    if (editBtn) {
        const id = editBtn.dataset.id;
        const { transactions, accounts } = getState(); // Necesitamos accounts
        if (!transactions || !accounts) return; // Chequeo extra

        const transaction = transactions.find(t => t.id === id);
        if (transaction) {
            const form = elements.transactionForm;
            if (!form) return; // Chequeo si el formulario existe

            // Buscar la cuenta por accountId para obtener el nombre
            const account = accounts.find(acc => acc.id === transaction.accountId);
            const accountName = account ? account.name : ''; // Obtener nombre si se encontró

            form.querySelector('#transaction-id').value = transaction.id;
            form.querySelector('#transaction-date').value = transaction.date;
            form.querySelector('#transaction-description').value = transaction.description;
            form.querySelector('#transaction-type').value = transaction.type;
            populateCategories(); // Update categories based on type first
            form.querySelector('#transaction-category').value = transaction.category;
            form.querySelector('#transaction-part').value = transaction.part;
            form.querySelector('#transaction-account').value = accountName; // Usar el nombre encontrado
            form.querySelector('#transaction-amount').value = transaction.amount;
            form.querySelector('#transaction-iva').value = transaction.iva || '';
            updateCurrencySymbol(); // Update symbol based on selected account

            // --- INICIO DE CORRECCIÓN (Punto 3) ---
            // El título del formulario (H3) NO está dentro del <form>, sino fuera.
            // Debemos buscarlo desde 'document' en lugar de 'form'.
            const formTitle = document.getElementById('form-title');
            if (formTitle) {
                formTitle.textContent = 'Editar Movimiento';
            }
            
            // Los botones SÍ están dentro del form, por lo que 'form.querySelector' es correcto aquí.
            const submitText = form.querySelector('#form-submit-button-text');
            if (submitText) {
                submitText.textContent = 'Actualizar';
            }
            
            const cancelBtn = form.querySelector('#form-cancel-button');
            if (cancelBtn) {
                cancelBtn.classList.remove('hidden');
            }
            // --- FIN DE CORRECCIÓN ---

            form.scrollIntoView({ behavior: 'smooth' });
        }
    }

    if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        showConfirmationModal('Eliminar Movimiento', '¿Estás seguro de que quieres eliminar este movimiento?', withSpinner(() => {
            // Pasar ID de transacción y ID de cuenta para la acción de borrado
            const { transactions } = getState();
            const transactionToDelete = transactions.find(t => t.id === id);
            if (transactionToDelete) {
                // CORRECCIÓN: La función deleteTransaction ahora solo necesita el ID de la transacción.
                actions.deleteTransaction(id);
            }
        }));
    }
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

    const amount = parseFloat(form.querySelector('#transfer-amount').value);
    if (isNaN(amount) || amount <= 0) {
        showAlertModal('Valor Inválido', 'El monto a enviar debe ser un número positivo.');
        return;
    }

    const { accounts } = getState();
    const fromAccount = accounts.find(a => a.name === fromAccountName);
    const toAccount = accounts.find(a => a.name === toAccountName);
    let receivedAmount = amount; // Default: same amount

    // Check if currencies are different
    if (fromAccount && toAccount && fromAccount.currency !== toAccount.currency) {
        const receivedAmountInput = form.querySelector('#transfer-extra-field').value;
        if (!receivedAmountInput) {
            showAlertModal('Error', 'Debes especificar el monto a recibir para transferencias entre monedas diferentes.');
            return;
        }
        receivedAmount = parseFloat(receivedAmountInput);
        if (isNaN(receivedAmount) || receivedAmount <= 0) {
            showAlertModal('Error', 'El monto a recibir debe ser un número positivo válido.');
            return;
        }
    }


    const transferData = {
        date: form.querySelector('#transfer-date').value,
        fromAccountName,
        toAccountName,
        amount: amount,
        feeSource: parseFloat(form.querySelector('#transfer-fee-source').value) || 0,
        // Use receivedAmount calculated above
        receivedAmount: receivedAmount,
    };

    withSpinner(() => {
        actions.addTransfer(transferData);
        form.reset();
        // Set default date again after reset
        const dateInput = form.querySelector('#transfer-date');
        if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
        updateTransferFormUI();
    })();
}


// --- Función "Binder" ---

/**
 * Asigna los eventos de la sección Cash Flow (Transacciones, Transferencias, Búsqueda, etc.).
 * Esta función se llamará desde `bindEventListeners` en `handlers.js`.
 */
export function bindCashflowEvents() {
    console.log("Binding Cashflow Events...");

    // Inicio Dashboard (Botones de Acceso Rápido)
    const quickAddIncome = document.getElementById('quick-add-income');
    if (quickAddIncome) quickAddIncome.addEventListener('click', () => {
        switchPage('cashflow');
        const transactionTypeSelect = document.getElementById('transaction-type');
        if (transactionTypeSelect) {
            transactionTypeSelect.value = 'Ingreso';
            populateCategories(); // Update categories based on the new type
        }
    });
    const quickAddExpense = document.getElementById('quick-add-expense');
    if (quickAddExpense) quickAddExpense.addEventListener('click', () => {
        switchPage('cashflow');
        const transactionTypeSelect = document.getElementById('transaction-type');
        if (transactionTypeSelect) {
            transactionTypeSelect.value = 'Egreso';
            populateCategories(); // Update categories based on the new type
        }
    });

    // Cash Flow Section (Formulario, Tabla, Búsqueda)
    if (elements.transactionForm) {
        elements.transactionForm.addEventListener('submit', handleTransactionFormSubmit);
        const transactionTypeSelect = elements.transactionForm.querySelector('#transaction-type');
        if (transactionTypeSelect) transactionTypeSelect.addEventListener('change', populateCategories);
        const transactionAccountSelect = elements.transactionForm.querySelector('#transaction-account');
        if (transactionAccountSelect) transactionAccountSelect.addEventListener('change', updateCurrencySymbol);
        const cancelBtn = elements.transactionForm.querySelector('#form-cancel-button');
        if (cancelBtn) cancelBtn.addEventListener('click', resetTransactionForm);
    }
    if (elements.transactionsTableBody) {
        // Limpiar listeners antiguos clonando
        const newTbody = elements.transactionsTableBody.cloneNode(false);
        elements.transactionsTableBody.parentNode.replaceChild(newTbody, elements.transactionsTableBody);
        elements.transactionsTableBody = newTbody; // Actualizar referencia
        elements.transactionsTableBody.addEventListener('click', handleTransactionsTableClick);
    }
    const cashflowSearch = document.getElementById('cashflow-search');
    if (cashflowSearch) cashflowSearch.addEventListener('input', () => renderAll());

    // Transfers
    if (elements.transferForm) {
        elements.transferForm.addEventListener('submit', handleTransferFormSubmit);
        ['transfer-from', 'transfer-to'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', updateTransferFormUI);
        });
    }
}
