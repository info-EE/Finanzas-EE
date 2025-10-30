import * as actions from './actions.js';
import * as api from './api.js';
import {
    elements,
    switchPage,
    populateCategories,
    updateCurrencySymbol,
    updateTransferFormUI,
    showInvoiceViewer,
    hideInvoiceViewer,
    printInvoice,
    downloadInvoiceAsPDF,
    populateClientSelectForInvoice,
    showConfirmationModal,
    showAlertModal,
    resetTransactionForm,
    exportReportAsXLSX,
    exportReportAsPDF,
    showPaymentDetailsModal,
    hidePaymentDetailsModal,
    showReceiptViewer,
    renderAll,
    openSidebar,
    closeSidebar,
    populateNextInvoiceNumber,
    resizeCharts
} from './ui/index.js';
import { getState } from './store.js';
import { ESSENTIAL_INCOME_CATEGORIES, ESSENTIAL_EXPENSE_CATEGORIES, ESSENTIAL_OPERATION_TYPES, ESSENTIAL_TAX_ID_TYPES } from './config.js';
import { escapeHTML } from './utils.js';

// --- Importaciones de Módulos (Fase 1) ---
import { withSpinner } from './handlers/helpers.js';
import { bindAuthEvents, bindUserManagementEvents } from './handlers/auth.js';

// --- Importaciones de Módulos (Fase 2) ---
import { bindCashflowEvents } from './handlers/cashflow.js';

// --- Importaciones de Módulos (Fase 3) ---
import { bindDocumentEvents } from './handlers/documents.js';


// --- Funciones Manejadoras (Handlers) ---
// (Las funciones de Auth y User Management se han movido a js/handlers/auth.js)
// (Las funciones de Cashflow se han movido a js/handlers/cashflow.js)
// (Las funciones de Documentos/Facturas se han movido a js/handlers/documents.js)

function handleAddAccount(e) {
    e.preventDefault();
// ... (existing code) ...
    const form = e.target;
    const name = form.querySelector('#new-account-name').value.trim();
// ... (existing code) ...
    const balance = parseFloat(form.querySelector('#new-account-balance').value);
    const { logoCatalog } = getState();
// ... (existing code) ...
    const logoKey = elements.newAccountLogoSelect.value;
    const logoHtml = logoCatalog[logoKey];

    if (!name) {
// ... (existing code) ...
        showAlertModal('Campo Requerido', 'El nombre de la cuenta no puede estar vacío.');
        return;
// ... (existing code) ...
    }
    if (isNaN(balance)) {
        showAlertModal('Valor Inválido', 'El saldo inicial debe ser un número.');
// ... (existing code) ...
        return;
    }

    const { accounts } = getState();
// ... (existing code) ...
    if (accounts.some(acc => acc.name.toLowerCase() === name.toLowerCase())) {
        showAlertModal('Error', 'Ya existe una cuenta con ese nombre.');
// ... (existing code) ...
        return;
    }

    const accountData = {
// ... (existing code) ...
        name: name,
        currency: form.querySelector('#new-account-currency').value,
// ... (existing code) ...
        balance: balance || 0,
        logoHtml: logoHtml,
// ... (existing code) ...
    };

    withSpinner(() => {
// ... (existing code) ...
        actions.addAccount(accountData);
        form.reset();
// ... (existing code) ...
    })();
}

function handleSettingsAccountsListClick(e) {
// ... (existing code) ...
    const deleteBtn = e.target.closest('.delete-account-btn');
    if (deleteBtn) {
// ... (existing code) ...
        const accountId = deleteBtn.dataset.id;
        const accountName = deleteBtn.dataset.name;
// ... (existing code) ...
        showConfirmationModal('Eliminar Cuenta', `¿Seguro que quieres eliminar la cuenta "${escapeHTML(accountName)}"? Esta acción no se puede deshacer y puede causar inconsistencias si hay transacciones asociadas.`, withSpinner(() => {
            actions.deleteAccount(accountId);
// ... (existing code) ...
        }));
    }
}

function handleUpdateBalance(e) {
// ... (existing code) ...
    e.preventDefault();
    const form = e.target;
// ... (existing code) ...
    const accountName = form.querySelector('#update-account-select').value;
    const newBalance = parseFloat(form.querySelector('#new-balance-amount').value);

// ... (existing code) ...
    if (isNaN(newBalance)) {
        showAlertModal('Valor Inválido', 'El nuevo saldo debe ser un número.');
// ... (existing code) ...
        return;
    }

    withSpinner(() => {
// ... (existing code) ...
        actions.updateBalance(accountName, newBalance);
        showAlertModal('Éxito', `Se ha creado un ajuste de saldo para la cuenta ${escapeHTML(accountName)}.`);
// ... (existing code) ...
        form.reset();
    })();
}

function handleAddCategory(e, type) {
// ... (existing code) ...
    e.preventDefault();
    const form = e.target;
// ... (existing code) ...
    const inputId = type === 'income' ? 'new-income-category' : (type === 'expense' ? 'new-expense-category' : (type === 'operationType' ? 'new-operation-type' : 'new-tax-id-type'));
    const input = form.querySelector(`#${inputId}`);
// ... (existing code) ...
    const categoryName = input.value.trim();

    if (categoryName) {
// ... (existing code) ...
        const { incomeCategories, expenseCategories, invoiceOperationTypes, taxIdTypes } = getState();
        const list = type === 'income' ? incomeCategories : (type === 'expense' ? expenseCategories : (type === 'operationType' ? invoiceOperationTypes : taxIdTypes));
// ... (existing code) ...
        if (list.some(cat => cat.toLowerCase() === categoryName.toLowerCase())) {
            showAlertModal('Categoría Duplicada', `La categoría "${escapeHTML(categoryName)}" ya existe.`);
// ... (existing code) ...
            return;
        }

        withSpinner(() => {
// ... (existing code) ...
            actions.addCategory(categoryName, type);
            input.value = '';
// ... (existing code) ...
        }, 150)();
    } else {
        showAlertModal('Campo Requerido', 'El nombre de la categoría no puede estar vacío.');
// ... (existing code) ...
    }
}

function handleDeleteCategory(e, type, essentialCategories) {
// ... (existing code) ...
    const deleteBtn = e.target.closest('.delete-category-btn');
    if (deleteBtn) {
// ... (existing code) ...
        const categoryName = deleteBtn.dataset.name;

        if (essentialCategories.includes(categoryName)) {
// ... (existing code) ...
            showAlertModal('Error', 'No se puede eliminar una categoría esencial del sistema.');
            return;
// ... (existing code) ...
        }

        showConfirmationModal('Eliminar Categoría', `¿Seguro que quieres eliminar la categoría "${escapeHTML(categoryName)}"?`, withSpinner(() => {
// ... (existing code) ...
            actions.deleteCategory(categoryName, type);
        }, 150));
    }
}

function handleClientFormSubmit(e) {
// ... (existing code) ...
    e.preventDefault();
    const form = e.target;
// ... (existing code) ...
    const id = form.querySelector('#client-id').value;
    const name = form.querySelector('#client-name').value.trim();
// ... (existing code) ...
    const email = form.querySelector('#client-email').value.trim();

    if (!name) {
// ... (existing code) ...
        showAlertModal('Campo Requerido', 'El nombre del cliente no puede estar vacío.');
        return;
// ... (existing code) ...
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
// ... (existing code) ...
        showAlertModal('Formato Inválido', 'Por favor, introduce una dirección de email válida.');
        return;
// ... (existing code) ...
    }

    const clientData = {
// ... (existing code) ...
        name: name,
        taxIdType: form.querySelector('#client-tax-id-type').value,
// ... (existing code) ...
        taxId: form.querySelector('#client-tax-id').value,
        address: form.querySelector('#client-address').value,
// ... (existing code) ...
        phoneLandlinePrefix: form.querySelector('#client-phone-landline-prefix').value,
        phoneLandline: form.querySelector('#client-phone-landline').value,
// ... (existing code) ...
        phoneMobilePrefix: form.querySelector('#client-phone-mobile-prefix').value,
        phoneMobile: form.querySelector('#client-phone-mobile').value,
// ... (existing code) ...
        email: email,
        industry: form.querySelector('#client-industry').value,
// ... (existing code) ...
    };

    withSpinner(() => {
// ... (existing code) ...
        actions.saveClient(clientData, id);
        form.reset();
// ... (existing code) ...
        form.querySelector('#client-id').value = '';
        document.getElementById('client-form-title').textContent = 'Agregar Nuevo Cliente';
// ... (existing code) ...
        document.getElementById('client-form-submit-text').textContent = 'Guardar Cliente';
        document.getElementById('client-form-cancel-btn').classList.add('hidden');
// ... (existing code) ...
    })();
}

function handleClientsTableClick(e) {
// ... (existing code) ...
    const editBtn = e.target.closest('.edit-client-btn');
    const deleteBtn = e.target.closest('.delete-client-btn');

    if (editBtn) {
// ... (existing code) ...
        const id = editBtn.dataset.id;
        const { clients } = getState();
// ... (existing code) ...
        const client = clients.find(c => c.id === id);
        if (client) {
// ... (existing code) ...
            const form = elements.addClientForm;
            form.querySelector('#client-id').value = client.id;
// ... (existing code) ...
            form.querySelector('#client-name').value = client.name;
            form.querySelector('#client-tax-id-type').value = client.taxIdType;
// ... (existing code) ...
            form.querySelector('#client-tax-id').value = client.taxId;
            form.querySelector('#client-address').value = client.address;
// ... (existing code) ...
            form.querySelector('#client-phone-landline-prefix').value = client.phoneLandlinePrefix;
            form.querySelector('#client-phone-landline').value = client.phoneLandline;
// ... (existing code) ...
            form.querySelector('#client-phone-mobile-prefix').value = client.phoneMobilePrefix;
            form.querySelector('#client-phone-mobile').value = client.phoneMobile;
// ... (existing code) ...
            form.querySelector('#client-email').value = client.email;
            form.querySelector('#client-industry').value = client.industry;

// ... (existing code) ...
            document.getElementById('client-form-title').textContent = 'Editar Cliente';
            document.getElementById('client-form-submit-text').textContent = 'Actualizar Cliente';
// ... (existing code) ...
            document.getElementById('client-form-cancel-btn').classList.remove('hidden');
            form.scrollIntoView({ behavior: 'smooth' });
// ... (existing code) ...
        }
    }

    if (deleteBtn) {
// ... (existing code) ...
        const id = deleteBtn.dataset.id;
        showConfirmationModal('Eliminar Cliente', '¿Estás seguro de que quieres eliminar este cliente?', withSpinner(() => {
// ... (existing code) ...
            actions.deleteClient(id);
        }));
    }
}

function handleFiscalParamsSave(e) {
// ... (existing code) ...
    e.preventDefault();
    const form = e.target;
// ... (existing code) ...
    const rate = parseFloat(form.querySelector('#corporate-tax-rate').value);
    if (!isNaN(rate) && rate >= 0 && rate <= 100) {
// ... (existing code) ...
        withSpinner(() => {
            actions.saveFiscalParams({ corporateTaxRate: rate });
// ... (existing code) ...
            showAlertModal('Éxito', 'Los parámetros fiscales han sido actualizados.');
        })();
    } else {
// ... (existing code) ...
        showAlertModal('Error', 'Por favor, introduce un valor válido para el tipo impositivo (0-100).');
    }
}

function handleReportGeneration(e) {
// ... (existing code) ...
    e.preventDefault();
    const form = e.target;
// ... (existing code) ...
    const type = form.querySelector('#report-type').value;
    let filters = { type };

    if (type === 'sociedades') {
// ... (existing code) ...
        filters.year = form.querySelector('#report-year-sociedades').value;
        filters.period = form.querySelector('#report-periodo-sociedades').value;
// ... (existing code) ...
    } else {
        filters.period = form.querySelector('#report-period').value;
// ... (existing code) ...
        filters.account = form.querySelector('#report-account').value;
        filters.part = form.querySelector('#report-part').value;
// ... (existing code) ...
        switch (filters.period) {
            case 'daily': filters.date = form.querySelector('#report-date').value; break;
// ... (existing code) ...
            case 'weekly': filters.week = form.querySelector('#report-week').value; break;
            case 'monthly': filters.month = form.querySelector('#report-month').value; break;
// ... (existing code) ...
            case 'annual': filters.year = form.querySelector('#report-year').value; break;
        }
         // Validate date inputs for non-sociedades reports
// ... (existing code) ...
         if (!filters.date && !filters.week && !filters.month && !filters.year) {
            showAlertModal('Filtro Requerido', 'Por favor, selecciona un período válido (fecha, semana, mes o año).');
// ... (existing code) ...
            return;
        }
    }
    withSpinner(() => actions.generateReport(filters), 500)();
}


function handleIvaReportGeneration() {
// ... (existing code) ...
    const month = elements.ivaMonthInput.value;
    if (month) {
// ... (existing code) ...
        withSpinner(() => actions.generateIvaReport(month), 500)();
    } else {
        showAlertModal('Falta Información', 'Por favor, seleccione un mes para generar el reporte de IVA.');
// ... (existing code) ...
    }
}

function handleCloseYear() {
// ... (existing code) ...
    const startDate = document.getElementById('cierre-start-date').value;
    const endDate = document.getElementById('cierre-end-date').value;

    if (!startDate || !endDate) {
// ... (existing code) ...
        showAlertModal('Error', 'Debes seleccionar una fecha de inicio y de cierre.');
        return;
    }
    if (new Date(startDate) >= new Date(endDate)) {
// ... (existing code) ...
        showAlertModal('Error', 'La fecha de inicio debe ser anterior a la fecha de cierre.');
        return;
    }
    const year = new Date(endDate).getFullYear();
// ... (existing code) ...
    showConfirmationModal('Confirmar Cierre Anual', `Estás a punto de archivar todos los datos del ${startDate} al ${endDate} bajo el año ${year}. Esta acción no se puede deshacer. ¿Continuar?`, withSpinner(() => {
        actions.closeYear(startDate, endDate);
// ... (existing code) ...
        showAlertModal('Éxito', `Se ha completado el cierre para el año ${year}.`);
    }, 1000));
}


function handleReportFilterChange() {
// ... (existing code) ...
    const reportType = document.getElementById('report-type').value;
    const period = document.getElementById('report-period').value;

    const isSociedades = reportType === 'sociedades';
// ... (existing code) ...
    elements.defaultFiltersContainer.classList.toggle('hidden', isSociedades);
    elements.sociedadesFiltersContainer.classList.toggle('hidden', !isSociedades);

    // Only show relevant date input based on period for default filters
// ... (existing code) ...
    if (!isSociedades) {
        ['daily', 'weekly', 'monthly', 'annual'].forEach(p => {
// ... (existing code) ...
            const el = document.getElementById(`date-input-${p}`);
            if (el) el.classList.toggle('hidden', p !== period);
// ... (existing code) ...
        });
        // Ensure default year is set for annual report
        if (period === 'annual') {
// ... (existing code) ...
             const yearInput = document.getElementById('report-year');
             if (yearInput && !yearInput.value) {
// ... (existing code) ...
                 yearInput.value = new Date().getFullYear();
             }
        }
    }
}

function handleReportDownloadClick(e) {
// ... (existing code) ...
    const downloadBtn = e.target.closest('#report-download-btn');
    if (downloadBtn) {
// ... (existing code) ...
        document.getElementById('report-download-options').classList.toggle('show');
        return;
// ... (existing code) ...
    }

    const formatBtn = e.target.closest('.download-option');
// ... (existing code) ...
    if (formatBtn) {
        const format = formatBtn.dataset.format;
// ... (existing code) ...
        if (format === 'xlsx') {
            exportReportAsXLSX();
// ... (existing code) ...
        } else if (format === 'pdf') {
            exportReportAsPDF();
// ... (existing code) ...
        }
        document.getElementById('report-download-options').classList.remove('show');
    }
}

// Close dropdown if clicked outside
document.addEventListener('click', function(event) {
// ... (existing code) ...
    if (!event.target.closest('.dropdown')) {
        const dropdowns = document.getElementsByClassName("dropdown-content");
// ... (existing code) ...
        for (let i = 0; i < dropdowns.length; i++) {
            const openDropdown = dropdowns[i];
// ... (existing code) ...
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
// ... (existing code) ...
            }
        }
    }
});


function handleAddInvestmentAsset(e) {
// ... (existing code) ...
    e.preventDefault();
    const form = e.target;
// ... (existing code) ...
    const name = form.querySelector('#new-investment-asset-name').value.trim();

    if (!name) {
// ... (existing code) ...
        showAlertModal('Campo Requerido', 'El nombre del activo no puede estar vacío.');
        return;
// ... (existing code) ...
    }

    const assetData = {
// ... (existing code) ...
        name: name,
        category: form.querySelector('#new-investment-asset-category').value,
// ... (existing code) ...
    };
    withSpinner(() => {
// ... (existing code) ...
        actions.addInvestmentAsset(assetData);
        form.reset();
// ... (existing code) ...
    }, 150)();
}

function handleInvestmentAssetListClick(e) {
// ... (existing code) ...
    const deleteBtn = e.target.closest('.delete-investment-asset-btn');
    if (deleteBtn) {
// ... (existing code) ...
        const assetId = deleteBtn.dataset.id;
        showConfirmationModal('Eliminar Activo', '¿Estás seguro de que quieres eliminar este tipo de activo?', withSpinner(() => {
// ... (existing code) ...
            actions.deleteInvestmentAsset(assetId);
        }, 150));
    }
}

function handleAddInvestment(e) {
// ... (existing code) ...
    e.preventDefault();
    const form = e.target;
// ... (existing code) ...
    const { investmentAssets } = getState();
    const assetId = form.querySelector('#investment-asset').value;
// ... (existing code) ...
    const asset = investmentAssets.find(a => a.id === assetId);
    const amount = parseFloat(form.querySelector('#investment-amount').value);

    if (!asset) {
// ... (existing code) ...
        showAlertModal('Error', 'Por favor, selecciona un activo de inversión válido. Puedes definirlos en Ajustes.');
        return;
// ... (existing code) ...
    }
    if (isNaN(amount) || amount <= 0) {
// ... (existing code) ...
        showAlertModal('Valor Inválido', 'El monto invertido debe ser un número positivo.');
        return;
// ... (existing code) ...
    }

    const investmentData = {
// ... (existing code) ...
        date: form.querySelector('#investment-date').value,
        account: form.querySelector('#investment-account').value,
// ... (existing code) ...
        amount: amount,
        description: form.querySelector('#investment-description').value,
// ... (existing code) ...
        assetId: asset.id,
        assetName: asset.name,
// ... (existing code) ...
    };
    withSpinner(() => {
// ... (existing code) ...
        actions.addInvestment(investmentData);
        form.reset();
// ... (existing code) ...
        // Restore default date
        const dateInput = form.querySelector('#investment-date');
// ... (existing code) ...
        if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
    })();
}


function handleInvestmentsTableClick(e) {
// ... (existing code) ...
    const deleteBtn = e.target.closest('.delete-investment-btn');
    if (deleteBtn) {
// ... (existing code) ...
        const transactionId = deleteBtn.dataset.id;
        showConfirmationModal('Eliminar Inversión', 'Esto eliminará el registro de la inversión y devolverá el monto a la cuenta de origen. ¿Continuar?', withSpinner(() => {
// ... (existing code) ...
            actions.deleteTransaction(transactionId);
        }));
    }
}

// --- Vinculación de Eventos de Autenticación (se llama al cargar la página) ---
export function bindAuthEventListeners() {
// ... (existing code) ...
    // Fase 1: Llama al "binder" de autenticación
    bindAuthEvents();
}


// --- Vinculación de Eventos de la Aplicación (se llama DESPUÉS de iniciar sesión) ---
export function bindEventListeners() {

    // (La lógica de Logout se movió a bindAuthEvents)

    // Mobile navigation
// ... (existing code) ...
    if (elements.sidebarOpenBtn) elements.sidebarOpenBtn.addEventListener('click', openSidebar);
    if (elements.sidebarCloseBtn) elements.sidebarCloseBtn.addEventListener('click', closeSidebar);
// ... (existing code) ...
    if (elements.sidebarOverlay) elements.sidebarOverlay.addEventListener('click', closeSidebar);

    // Desktop navigation toggle
// ... (existing code) ...
    if (elements.sidebarToggleDesktopBtn) {
        elements.sidebarToggleDesktopBtn.addEventListener('click', () => {
// ... (existing code) ...
            const isCollapsed = elements.sidebar.classList.contains('w-20');

            if (isCollapsed) {
// ... (existing code) ...
                elements.sidebar.classList.remove('w-20');
                elements.sidebar.classList.add('w-64');
// ... (existing code) ...
                elements.mainContent.classList.remove('md:ml-20');
                elements.mainContent.classList.add('md:ml-64');
// ... (existing code) ...
            } else {
                elements.sidebar.classList.remove('w-64');
// ... (existing code) ...
                elements.sidebar.classList.add('w-20');
                elements.mainContent.classList.remove('md:ml-64');
// ... (existing code) ...
                elements.mainContent.classList.add('md:ml-20');
            }

            document.querySelectorAll('.nav-text').forEach(text => {
// ... (existing code) ...
                text.classList.toggle('hidden');
            });

            // Trigger chart resize after animation
// ... (existing code) ...
            setTimeout(() => {
                // CORRECCIÓN PARA PROBLEMA 1: Llamar a la función exportada desde ui.js
// ... (existing code) ...
                resizeCharts();
            }, 350); // Slightly longer than the transition duration
// ... (existing code) ...
        });
    }

    // Main navigation links
// ... (existing code) ...
    elements.navLinks.forEach(link => {
        // Remove previous listeners to prevent duplicates if bindEventListeners is called multiple times
// ... (existing code) ...
        link.replaceWith(link.cloneNode(true));
    });
    // Re-select links and add listeners
// ... (existing code) ...
    document.querySelectorAll('.nav-link').forEach(link => {
         if (link.id !== 'logout-btn') { // Don't re-bind logout here
// ... (existing code) ...
             link.addEventListener('click', (e) => {
                 e.preventDefault();
// ... (existing code) ...
                 const pageId = link.id.replace('nav-', '');
                 switchPage(pageId);
// ... (existing code) ...
             });
         }
    });
    // Ensure logout still works (el listener de logout ahora se asigna en bindAuthEvents)
     // const logoutBtn = document.getElementById('logout-btn');
     // if(logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    
    // --- (Fase 1) Asignar eventos de Gestión de Usuarios ---
    bindUserManagementEvents();

    // --- (Fase 2) Asignar eventos de Cash Flow ---
    bindCashflowEvents();

    // --- (Fase 3) Asignar eventos de Documentos ---
    bindDocumentEvents();


    // --- Event Listeners for App Sections ---

    // Inicio Dashboard (los quick-add se movieron a bindCashflowEvents)
// ... (existing code) ...
    const inicioChartCurrency = document.getElementById('inicio-chart-currency');
    if (inicioChartCurrency) inicioChartCurrency.addEventListener('change', renderAll);

    // Clients Page Chart
// ... (existing code) ...
    const clientsChartCurrencySelector = document.getElementById('clients-chart-currency');
    if (clientsChartCurrencySelector) {
// ... (existing code) ...
        clientsChartCurrencySelector.addEventListener('change', renderAll);
    }

    // Cash Flow Section (movido a bindCashflowEvents)
// ... (existing code) ...
    // Transfers (movido a bindCashflowEvents)

    // Proformas (movido a bindDocumentEvents)

    // Settings
// ... (existing code) ...
    if (elements.addAccountForm) elements.addAccountForm.addEventListener('submit', handleAddAccount);
    if (elements.settingsAccountsList) elements.settingsAccountsList.addEventListener('click', handleSettingsAccountsListClick);
// ... (existing code) ...
    if (elements.updateBalanceForm) elements.updateBalanceForm.addEventListener('submit', handleUpdateBalance);
    if (elements.addIncomeCategoryForm) elements.addIncomeCategoryForm.addEventListener('submit', (e) => handleAddCategory(e, 'income'));
// ... (existing code) ...
    if (elements.addExpenseCategoryForm) elements.addExpenseCategoryForm.addEventListener('submit', (e) => handleAddCategory(e, 'expense'));
    if (elements.addOperationTypeForm) elements.addOperationTypeForm.addEventListener('submit', (e) => handleAddCategory(e, 'operationType'));
// ... (existing code) ...
    if (elements.addTaxIdTypeForm) elements.addTaxIdTypeForm.addEventListener('submit', (e) => handleAddCategory(e, 'taxIdType'));
    if (elements.incomeCategoriesList) elements.incomeCategoriesList.addEventListener('click', (e) => handleDeleteCategory(e, 'income', ESSENTIAL_INCOME_CATEGORIES));
// ... (existing code) ...
    if (elements.expenseCategoriesList) elements.expenseCategoriesList.addEventListener('click', (e) => handleDeleteCategory(e, 'expense', ESSENTIAL_EXPENSE_CATEGORIES));
    if (elements.operationTypesList) elements.operationTypesList.addEventListener('click', (e) => handleDeleteCategory(e, 'operationType', ESSENTIAL_OPERATION_TYPES));
// ... (existing code) ...
    if (elements.taxIdTypesList) elements.taxIdTypesList.addEventListener('click', (e) => handleDeleteCategory(e, 'taxIdType', ESSENTIAL_TAX_ID_TYPES));

    // Clients Section
// ... (existing code) ...
    if (elements.addClientForm) {
        elements.addClientForm.addEventListener('submit', handleClientFormSubmit);
// ... (existing code) ...
        const cancelBtn = elements.addClientForm.querySelector('#client-form-cancel-btn');
        if (cancelBtn) cancelBtn.addEventListener('click', () => {
// ... (existing code) ...
            elements.addClientForm.reset();
             // Ensure hidden ID is cleared
// ... (existing code) ...
            const clientIdInput = elements.addClientForm.querySelector('#client-id');
            if (clientIdInput) clientIdInput.value = '';
// ... (existing code) ...
            document.getElementById('client-form-title').textContent = 'Agregar Nuevo Cliente';
            document.getElementById('client-form-submit-text').textContent = 'Guardar Cliente';
// ... (existing code) ...
            cancelBtn.classList.add('hidden');
        });
    }
    if (elements.clientsTableBody) elements.clientsTableBody.addEventListener('click', handleClientsTableClick);

    // Invoicing Section (movido a bindDocumentEvents)

    // Invoice Viewer Modal (movido a bindDocumentEvents)

    // Reports Section
// ... (existing code) ...
    if (elements.reportForm) {
        elements.reportForm.addEventListener('submit', handleReportGeneration);
// ... (existing code) ...
        const reportTypeSelect = document.getElementById('report-type');
        if (reportTypeSelect) reportTypeSelect.addEventListener('change', handleReportFilterChange);
// ... (existing code) ...
        const reportPeriodSelect = document.getElementById('report-period');
        if (reportPeriodSelect) reportPeriodSelect.addEventListener('change', handleReportFilterChange);
// ... (existing code) ...
    }
    if (elements.reportDisplayArea) elements.reportDisplayArea.addEventListener('click', handleReportDownloadClick);

    // Year Close
// ... (existing code) ...
    const closeYearBtn = document.getElementById('close-year-btn');
    if (closeYearBtn) closeYearBtn.addEventListener('click', handleCloseYear);

    // Payment Details Modal (movido a bindDocumentEvents)

    // IVA Section
// ... (existing code) ...
    if (elements.ivaGenerateReportBtn) elements.ivaGenerateReportBtn.addEventListener('click', handleIvaReportGeneration);

    // Investments Section
// ... (existing code) ...
    if (elements.addInvestmentAssetForm) elements.addInvestmentAssetForm.addEventListener('submit', handleAddInvestmentAsset);
    if (elements.investmentAssetsList) elements.investmentAssetsList.addEventListener('click', handleInvestmentAssetListClick);
// ... (existing code) ...
    if (elements.addInvestmentForm) elements.addInvestmentForm.addEventListener('submit', handleAddInvestment);
    if (elements.investmentsTableBody) elements.investmentsTableBody.addEventListener('click', handleInvestmentsTableClick);

    // User Management (movido a bindUserManagementEvents)
// ... (existing code) ...
    // Permissions Modal (movido a bindUserManagementEvents)

}

