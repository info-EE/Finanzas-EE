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

// --- Importaciones de Módulos (Fase 1-4) ---
import { withSpinner } from './handlers/helpers.js';
import { bindAuthEvents, bindUserManagementEvents } from './handlers/auth.js';
import { bindCashflowEvents } from './handlers/cashflow.js';
import { bindDocumentEvents } from './handlers/documents.js';
import { bindClientEvents } from './handlers/clients.js';
import { bindInvestmentEvents } from './handlers/investments.js';


// --- Funciones Manejadoras (Handlers) ---
// (Las funciones de Auth, Cashflow, Documents, Clients, Investments se han movido)

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
         // Validate date inputs for non-sociedades reports
         if (!filters.date && !filters.week && !filters.month && !filters.year) {
            showAlertModal('Filtro Requerido', 'Por favor, selecciona un período válido (fecha, semana, mes o año).');
            return;
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


function handleReportFilterChange() {
    const reportType = document.getElementById('report-type').value;
    const period = document.getElementById('report-period').value;

    const isSociedades = reportType === 'sociedades';
    elements.defaultFiltersContainer.classList.toggle('hidden', isSociedades);
    elements.sociedadesFiltersContainer.classList.toggle('hidden', !isSociedades);

    // Only show relevant date input based on period for default filters
    if (!isSociedades) {
        ['daily', 'weekly', 'monthly', 'annual'].forEach(p => {
            const el = document.getElementById(`date-input-${p}`);
            if (el) el.classList.toggle('hidden', p !== period);
        });
        // Ensure default year is set for annual report
        if (period === 'annual') {
             const yearInput = document.getElementById('report-year');
             if (yearInput && !yearInput.value) {
                 yearInput.value = new Date().getFullYear();
             }
        }
    }
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

// Close dropdown if clicked outside
document.addEventListener('click', function(event) {
    if (!event.target.closest('.dropdown')) {
        const dropdowns = document.getElementsByClassName("dropdown-content");
        for (let i = 0; i < dropdowns.length; i++) {
            const openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
    }
});


// --- Vinculación de Eventos de Autenticación (se llama al cargar la página) ---
export function bindAuthEventListeners() {
    // Llama al "binder" de autenticación
    bindAuthEvents();
}


// --- Vinculación de Eventos de la Aplicación (se llama DESPUÉS de iniciar sesión) ---
export function bindEventListeners() {

    // Llama a los "binders" modulares
    bindUserManagementEvents(); // (Fase 1)
    bindCashflowEvents();       // (Fase 2)
    bindDocumentEvents();       // (Fase 3)
    bindClientEvents();         // (Fase 4)
    bindInvestmentEvents();     // (Fase 4)
    // (Fase 5: binders de Reportes y Ajustes irán aquí)

    // --- Eventos Globales y Restantes (Fase 5) ---

    // Mobile navigation
    if (elements.sidebarOpenBtn) elements.sidebarOpenBtn.addEventListener('click', openSidebar);
    if (elements.sidebarCloseBtn) elements.sidebarCloseBtn.addEventListener('click', closeSidebar);
    if (elements.sidebarOverlay) elements.sidebarOverlay.addEventListener('click', closeSidebar);

    // Desktop navigation toggle
    if (elements.sidebarToggleDesktopBtn) {
        elements.sidebarToggleDesktopBtn.addEventListener('click', () => {
            const isCollapsed = elements.sidebar.classList.contains('w-20');

            if (isCollapsed) {
                elements.sidebar.classList.remove('w-20');
                elements.sidebar.classList.add('w-64');
                elements.mainContent.classList.remove('md:ml-20');
                elements.mainContent.classList.add('md:ml-64');
            } else {
                elements.sidebar.classList.remove('w-64');
                elements.sidebar.classList.add('w-20');
                elements.mainContent.classList.remove('md:ml-64');
                elements.mainContent.classList.add('md:ml-20');
            }

            document.querySelectorAll('.nav-text').forEach(text => {
                text.classList.toggle('hidden');
            });

            // Trigger chart resize after animation
            setTimeout(() => {
                resizeCharts();
            }, 350);
        });
    }

    // Main navigation links
    elements.navLinks.forEach(link => {
        link.replaceWith(link.cloneNode(true));
    });
    document.querySelectorAll('.nav-link').forEach(link => {
         if (link.id !== 'logout-btn') {
             link.addEventListener('click', (e) => {
                 e.preventDefault();
                 const pageId = link.id.replace('nav-', '');
                 switchPage(pageId);
             });
         }
    });
     const logoutBtn = document.getElementById('logout-btn');
     if(logoutBtn) logoutBtn.addEventListener('click', () => withSpinner(api.logoutUser)()); // Simplificado


    // --- Event Listeners for App Sections (Fase 5: Reports & Settings) ---

    // Reports Section
    if (elements.reportForm) {
        elements.reportForm.addEventListener('submit', handleReportGeneration);
        const reportTypeSelect = document.getElementById('report-type');
        if (reportTypeSelect) reportTypeSelect.addEventListener('change', handleReportFilterChange);
        const reportPeriodSelect = document.getElementById('report-period');
        if (reportPeriodSelect) reportPeriodSelect.addEventListener('change', handleReportFilterChange);
    }
    if (elements.reportDisplayArea) {
        // Limpiar listeners antiguos clonando
        const newDisplayArea = elements.reportDisplayArea.cloneNode(true); // Clonar con hijos
        elements.reportDisplayArea.parentNode.replaceChild(newDisplayArea, elements.reportDisplayArea);
        elements.reportDisplayArea = newDisplayArea;
        elements.reportDisplayArea.addEventListener('click', handleReportDownloadClick);
    }

    // Year Close
    const closeYearBtn = document.getElementById('close-year-btn');
    if (closeYearBtn) closeYearBtn.addEventListener('click', handleCloseYear);

    // IVA Section
    if (elements.ivaGenerateReportBtn) elements.ivaGenerateReportBtn.addEventListener('click', handleIvaReportGeneration);


    // Settings
    if (elements.addAccountForm) elements.addAccountForm.addEventListener('submit', handleAddAccount);
    if (elements.settingsAccountsList) {
        // Limpiar listeners antiguos clonando
        const newList = elements.settingsAccountsList.cloneNode(false);
        elements.settingsAccountsList.parentNode.replaceChild(newList, elements.settingsAccountsList);
        elements.settingsAccountsList = newList;
        elements.settingsAccountsList.addEventListener('click', handleSettingsAccountsListClick);
    }
    if (elements.updateBalanceForm) elements.updateBalanceForm.addEventListener('submit', handleUpdateBalance);
    
    // Listeners de Categorías
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
            list.el = newListEl; // Actualizar la referencia en elements (aunque no sea global, es bueno hacerlo)
            newListEl.addEventListener('click', (e) => handleDeleteCategory(e, list.type, list.essential));
        }
    });
    // Actualizar referencias en el objeto elements (importante)
    elements.incomeCategoriesList = document.getElementById('income-categories-list');
    elements.expenseCategoriesList = document.getElementById('expense-categories-list');
    elements.operationTypesList = document.getElementById('operation-types-list');
    elements.taxIdTypesList = document.getElementById('tax-id-types-list');

}

