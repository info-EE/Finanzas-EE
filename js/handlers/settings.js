import * as actions from '../actions.js';
import * as api from '../api.js'; // Necesario para handleAeatConfigSave (aunque la acción esté en actions.js)
import {
    elements,
    showConfirmationModal,
    showAlertModal
} from '../ui/index.js';
import { getState } from '../store.js';
import { ESSENTIAL_INCOME_CATEGORIES, ESSENTIAL_EXPENSE_CATEGORIES, ESSENTIAL_OPERATION_TYPES, ESSENTIAL_TAX_ID_TYPES } from '../config.js';
import { escapeHTML } from '../utils.js';
import { withSpinner } from './helpers.js';

// --- Funciones Manejadoras (Handlers) ---

function handleAddAccount(e) {
    e.preventDefault();
    const form = e.target;
    const name = form.querySelector('#new-account-name').value.trim();
    const balance = parseFloat(form.querySelector('#new-account-balance').value);
    const { logoCatalog } = getState();
    const logoKey = elements.newAccountLogoSelect.value;
    const logoHtml = logoCatalog[logoKey];

    if (!name) {
        showAlertModal('Campo Requerido', 'El nombre de la cuenta no puede estar vacío.');
        return;
    }
    if (isNaN(balance)) {
        showAlertModal('Valor Inválido', 'El saldo inicial debe ser un número.');
        return;
    }

    const { accounts } = getState();
    if (accounts.some(acc => acc.name.toLowerCase() === name.toLowerCase())) {
        showAlertModal('Error', 'Ya existe una cuenta con ese nombre.');
        return;
    }

    const accountData = {
        name: name,
        currency: form.querySelector('#new-account-currency').value,
        balance: balance || 0,
        logoHtml: logoHtml,
    };

    withSpinner(() => {
        actions.addAccount(accountData);
        form.reset();
    })();
}

function handleSettingsAccountsListClick(e) {
    const deleteBtn = e.target.closest('.delete-account-btn');
    if (deleteBtn) {
        const accountId = deleteBtn.dataset.id;
        const accountName = deleteBtn.dataset.name;
        showConfirmationModal('Eliminar Cuenta', `¿Seguro que quieres eliminar la cuenta "${escapeHTML(accountName)}"? Esta acción no se puede deshacer y puede causar inconsistencias si hay transacciones asociadas.`, withSpinner(() => {
            actions.deleteAccount(accountId);
        }));
    }
}

function handleUpdateBalance(e) {
    e.preventDefault();
    const form = e.target;
    const accountName = form.querySelector('#update-account-select').value;
    const newBalance = parseFloat(form.querySelector('#new-balance-amount').value);

    if (isNaN(newBalance)) {
        showAlertModal('Valor Inválido', 'El nuevo saldo debe ser un número.');
        return;
    }

    withSpinner(() => {
        actions.updateBalance(accountName, newBalance);
        showAlertModal('Éxito', `Se ha creado un ajuste de saldo para la cuenta ${escapeHTML(accountName)}.`);
        form.reset();
    })();
}

function handleAddCategory(e, type) {
    e.preventDefault();
    const form = e.target;
    const inputId = type === 'income' ? 'new-income-category' : (type === 'expense' ? 'new-expense-category' : (type === 'operationType' ? 'new-operation-type' : 'new-tax-id-type'));
    const input = form.querySelector(`#${inputId}`);
    const categoryName = input.value.trim();

    if (categoryName) {
        const { incomeCategories, expenseCategories, invoiceOperationTypes, taxIdTypes } = getState();
        const list = type === 'income' ? incomeCategories : (type === 'expense' ? expenseCategories : (type === 'operationType' ? invoiceOperationTypes : taxIdTypes));
        if (list.some(cat => cat.toLowerCase() === categoryName.toLowerCase())) {
            showAlertModal('Categoría Duplicada', `La categoría "${escapeHTML(categoryName)}" ya existe.`);
            return;
        }

        withSpinner(() => {
            actions.addCategory(categoryName, type);
            input.value = '';
        }, 150)();
    } else {
        showAlertModal('Campo Requerido', 'El nombre de la categoría no puede estar vacío.');
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

function handleCloseYear() {
    const startDate = document.getElementById('cierre-start-date').value;
    const endDate = document.getElementById('cierre-end-date').value;

    if (!startDate || !endDate) {
        showAlertModal('Error', 'Debes seleccionar una fecha de inicio y de cierre.');
        return;
    }
    if (new Date(startDate) >= new Date(endDate)) {
        showAlertModal('Error', 'La fecha de inicio debe ser anterior a la fecha de cierre.');
        return;
    }
    const year = new Date(endDate).getFullYear();
    showConfirmationModal('Confirmar Cierre Anual', `Estás a punto de archivar todos los datos del ${startDate} al ${endDate} bajo el año ${year}. Esta acción no se puede deshacer. ¿Continuar?`, withSpinner(() => {
        actions.closeYear(startDate, endDate);
        showAlertModal('Éxito', `Se ha completado el cierre para el año ${year}.`);
    }, 1000));
}

// Movida desde documents.js
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

// Nueva función para guardar parámetros fiscales (según plan)
function handleFiscalParamsSave(e) {
    e.preventDefault();
    const form = e.target;
    const rate = form.querySelector('#corporate-tax-rate').value;
    withSpinner(() => {
        // La acción 'saveFiscalParams' ya existe en actions.js
        actions.saveFiscalParams({ corporateTaxRate: rate });
        showAlertModal('Éxito', 'La tasa impositiva ha sido guardada.');
    })();
}


// --- Función "Binder" ---

export function bindSettingsEvents() {
    console.log("Binding Settings Events...");
    
    // Gestión de Cuentas
    if (elements.addAccountForm) elements.addAccountForm.addEventListener('submit', handleAddAccount);
    if (elements.settingsAccountsList) {
        // Limpiar listeners antiguos clonando
        const newList = elements.settingsAccountsList.cloneNode(false);
        elements.settingsAccountsList.parentNode.replaceChild(newList, elements.settingsAccountsList);
        elements.settingsAccountsList = newList;
        elements.settingsAccountsList.addEventListener('click', handleSettingsAccountsListClick);
    }
    if (elements.updateBalanceForm) elements.updateBalanceForm.addEventListener('submit', handleUpdateBalance);
    
    // Gestión de Categorías
    if (elements.addIncomeCategoryForm) elements.addIncomeCategoryForm.addEventListener('submit', (e) => handleAddCategory(e, 'income'));
    if (elements.addExpenseCategoryForm) elements.addExpenseCategoryForm.addEventListener('submit', (e) => handleAddCategory(e, 'expense'));
    if (elements.addOperationTypeForm) elements.addOperationTypeForm.addEventListener('submit', (e) => handleAddCategory(e, 'operationType'));
    if (elements.addTaxIdTypeForm) elements.addTaxIdTypeForm.addEventListener('submit', (e) => handleAddCategory(e, 'taxIdType'));
    
    // Limpiar y re-asignar listeners de listas de categorías
    const categoryLists = [
        { el: elements.incomeCategoriesList, type: 'income', essential: ESSENTIAL_INCOME_CATEGORIES },
        { el: elements.expenseCategoriesList, type: 'expense', essential: ESSENTIAL_EXPENSE_CATEGORIES },
        { el: elements.operationTypesList, type: 'operationType', essential: ESSENTIAL_OPERATION_TYPES },
        { el: elements.taxIdTypesList, type: 'taxIdType', essential: ESSENTIAL_TAX_ID_TYPES }
    ];

    categoryLists.forEach(list => {
        if (list.el) {
            const newListEl = list.el.cloneNode(false);
            list.el.parentNode.replaceChild(newListEl, list.el);
            list.el = newListEl; // Actualizar la referencia
            newListEl.addEventListener('click', (e) => handleDeleteCategory(e, list.type, list.essential));
        }
    });
    // Actualizar referencias en el objeto elements (importante)
    elements.incomeCategoriesList = document.getElementById('income-categories-list');
    elements.expenseCategoriesList = document.getElementById('expense-categories-list');
    elements.operationTypesList = document.getElementById('operation-types-list');
    elements.taxIdTypesList = document.getElementById('tax-id-types-list');
    
    // Cierre Anual
    const closeYearBtn = document.getElementById('close-year-btn');
    if (closeYearBtn) closeYearBtn.addEventListener('click', handleCloseYear);

    // Configuración AEAT (movido de documents.js)
    if (elements.aeatConfigForm) elements.aeatConfigForm.addEventListener('submit', handleAeatConfigSave);

    // Parámetros Fiscales (nuevo)
    if (elements.fiscalParamsForm) elements.fiscalParamsForm.addEventListener('submit', handleFiscalParamsSave);
}
