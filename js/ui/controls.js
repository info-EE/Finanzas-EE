/**
 * Controls: populate selects, update currency symbols, transfer UI
 * Funciones migradas desde js/ui.js como parte de la Fase 1 de refactorización.
 */
import { elements } from './elements.js';
import { getState } from '../store.js';
import { escapeHTML, getCurrencySymbol } from '../utils.js';

// --- INICIO DE FUNCIÓN MOVIDA DESDE UI.JS ---
/**
 * Rellena el campo de número de factura con el siguiente número disponible.
 * Lógica: NNNN. El NNNN es consecutivo y no se reinicia con el año.
 */
export function populateNextInvoiceNumber() {
    const { settings } = getState();
    const dateInput = document.getElementById('factura-fecha');
    const numberInput = document.getElementById('factura-numero');
    
    if (!dateInput || !numberInput || !settings || !settings.invoiceCounter) {
        console.warn("No se puede popular el número de factura, falta config o elementos.");
        // --- CORRECCIÓN 3: Quitar el prefijo del año ---
        if(numberInput) numberInput.value = "1"; // Fallback
        return;
    }

    const docDate = new Date(dateInput.value + 'T00:00:00Z'); // Usar UTC
    if (isNaN(docDate.getTime())) {
         // --- CORRECCIÓN 3: Quitar el prefijo del año ---
         if(numberInput) numberInput.value = "ERROR"; // Fallback
        return;
    }
    
    // --- CORRECCIÓN 3: 'currentYear' ya no se usa para el número ---
    // const currentYear = docDate.getUTCFullYear();

    // Ignorar 'lastInvoiceYear', usar siempre el siguiente número consecutivo
    const { nextInvoiceNumber } = settings.invoiceCounter;
    const numberToUse = nextInvoiceNumber || 1; // Usar el siguiente

    // --- CORRECCIÓN 3: Quitar el prefijo del año ---
    numberInput.value = String(numberToUse);
}
// --- FIN DE FUNCIÓN MOVIDA ---


// --- Funciones de Control (Migradas de ui.js) ---

function toggleIvaField() {
    const type = elements.transactionForm?.querySelector('#transaction-type').value;
    if (type === 'Egreso') {
        elements.transactionIvaContainer?.classList.remove('hidden');
    } else {
        elements.transactionIvaContainer?.classList.add('hidden');
    }
}

function populateLogoSelect() {
    const { logoCatalog } = getState();
    const select = elements.newAccountLogoSelect;
    if (!select || !logoCatalog) return;

    select.innerHTML = '';

    for (const key in logoCatalog) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = (key.charAt(0).toUpperCase() + key.slice(1)).replace(/_/g, ' ');
        select.appendChild(option);
    }
}

function populateCategories() {
    const { incomeCategories, expenseCategories } = getState();
    if (!incomeCategories || !expenseCategories || !elements.transactionForm) return;
    const type = elements.transactionForm.querySelector('#transaction-type').value;
    const categories = type === 'Ingreso' ? incomeCategories : expenseCategories;
    const categorySelect = elements.transactionForm.querySelector('#transaction-category');
    if (categorySelect) {
        categorySelect.innerHTML = categories.map(cat => `<option value="${escapeHTML(cat)}">${escapeHTML(cat)}</option>`).join('');
    }
    toggleIvaField();
}

function populateOperationTypesSelect() {
    const { invoiceOperationTypes } = getState();
    if(elements.facturaOperationType) {
        elements.facturaOperationType.innerHTML = invoiceOperationTypes.map(type => `<option value="${escapeHTML(type)}">${escapeHTML(type)}</option>`).join('');
    }
}

function populateTaxIdTypeSelect() {
    const { taxIdTypes } = getState();
    const select = document.getElementById('client-tax-id-type');
    if(select) {
        select.innerHTML = taxIdTypes.map(type => `<option value="${escapeHTML(type)}">${escapeHTML(type)}</option>`).join('');
    }
}

function populateReportAccounts() {
    const { accounts } = getState();
    const select = document.getElementById('report-account');
    if(select) {
        select.innerHTML = '<option value="all">Todas las Cuentas</option>';
        select.innerHTML += accounts.map(acc => `<option value="${escapeHTML(acc.name)}">${escapeHTML(acc.name)}</option>`).join('');
    }
    const yearSelect = document.getElementById('report-year-sociedades');
    if(yearSelect) {
        const currentYear = new Date().getFullYear();
        let yearOptions = '';
        for (let i = 0; i < 5; i++) {
            yearOptions += `<option value="${currentYear - i}">${currentYear - i}</option>`;
        }
        yearSelect.innerHTML = yearOptions;
    }
}

function populateClientSelectForInvoice() {
    const { clients } = getState();
    const select = elements.facturaSelectCliente;
    if (!select || !clients) return;
    const selectedValue = select.value;
    while (select.options.length > 1) select.remove(1);
    clients.forEach(client => {
        const option = document.createElement('option');
        option.value = client.id;
        option.textContent = client.name;
        select.appendChild(option);
    });
    select.value = selectedValue;
}

function populateInvestmentAssetSelect() {
    const { investmentAssets } = getState();
    const select = document.getElementById('investment-asset');
    if (select) {
        if(investmentAssets && investmentAssets.length > 0){
             select.innerHTML = investmentAssets.map(asset => `<option value="${asset.id}">${escapeHTML(asset.name)}</option>`).join('');
        } else {
            select.innerHTML = `<option value="">No hay activos definidos</option>`;
        }
    }
}

function populateSelects() {
    const { accounts } = getState();
    if (!accounts) return;
    const optionsHtml = accounts.map(acc => `<option value="${escapeHTML(acc.name)}">${escapeHTML(acc.name)}</option>`).join('');
    ['transaction-account', 'transfer-from', 'transfer-to', 'update-account-select', 'investment-account'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.innerHTML = optionsHtml;
    });
    populateCategories();
    populateOperationTypesSelect();
    populateTaxIdTypeSelect();
    populateReportAccounts();
    populateClientSelectForInvoice();
    populateInvestmentAssetSelect();
    populateLogoSelect();
}

function updateCurrencySymbol() {
    const { accounts } = getState();
    if (!elements.transactionForm) return;
    const accountName = elements.transactionForm.querySelector('#transaction-account').value;
    const account = accounts.find(acc => acc.name === accountName);
    if (account) {
        const amountSymbol = document.getElementById('amount-currency-symbol');
        if (amountSymbol) amountSymbol.textContent = getCurrencySymbol(account.currency);
        const ivaSymbol = document.getElementById('iva-currency-symbol');
        if (ivaSymbol) ivaSymbol.textContent = getCurrencySymbol(account.currency);
    }
}

function updateTransferFormUI() {
    const { accounts } = getState();
    const fromSelect = document.getElementById('transfer-from');
    const toSelect = document.getElementById('transfer-to');
    if (!fromSelect || !toSelect) return;

    const fromAccount = accounts.find(a => a.name === fromSelect.value);
    const toAccount = accounts.find(a => a.name === toSelect.value);
    if (!fromAccount || !toAccount) return;

    const amountSymbol = document.getElementById('transfer-amount-currency-symbol');
    if(amountSymbol) amountSymbol.textContent = getCurrencySymbol(fromAccount.currency);

    const feeSourceSymbol = document.getElementById('transfer-fee-source-currency-symbol');
    if(feeSourceSymbol) feeSourceSymbol.textContent = getCurrencySymbol(fromAccount.currency);

    const extraSymbol = document.getElementById('transfer-extra-currency-symbol');
    if(extraSymbol) extraSymbol.textContent = getCurrencySymbol(toAccount.currency);

    const extraLabel = document.getElementById('transfer-extra-label');
    const extraField = document.getElementById('transfer-extra-field');

    if (extraLabel && extraField) {
        if (fromAccount.currency !== toAccount.currency) {
            extraLabel.textContent = `Monto a Recibir (${getCurrencySymbol(toAccount.currency)})`;
            extraField.required = true;
        } else {
            extraLabel.textContent = "Comisión Destino (Opcional)";
            extraField.required = false;
        }
    }
}

function resetTransactionForm() {
    if (!elements.transactionForm) return;
    elements.transactionForm.reset();

    const idInput = elements.transactionForm.querySelector('#transaction-id');
    if (idInput) idInput.value = '';

    const ivaInput = elements.transactionForm.querySelector('#transaction-iva');
    if (ivaInput) ivaInput.value = '';

    const formTitle = elements.transactionForm.querySelector('#form-title');
    if(formTitle) formTitle.textContent = 'Agregar Nuevo Movimiento';

    const submitText = elements.transactionForm.querySelector('#form-submit-button-text');
    if(submitText) submitText.textContent = 'Guardar';

    const cancelBtn = elements.transactionForm.querySelector('#form-cancel-button');
    if (cancelBtn) cancelBtn.classList.add('hidden');

    const dateInput = document.getElementById('transaction-date');
    if(dateInput) dateInput.value = new Date().toISOString().slice(0, 10);

    populateCategories();
    updateCurrencySymbol();
}

export {
    populateSelects,
    populateCategories,
    populateOperationTypesSelect,
    populateTaxIdTypeSelect,
    populateReportAccounts,
    populateClientSelectForInvoice,
    populateInvestmentAssetSelect,
    populateLogoSelect,
    updateCurrencySymbol,
    updateTransferFormUI,
    resetTransactionForm,
    toggleIvaField
    // populateNextInvoiceNumber NO ES NECESARIO AQUÍ porque ya se exportó con "export function"
};

