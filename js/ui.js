import { getState } from './store.js';
import { escapeHTML, formatCurrency, getCurrencySymbol } from './utils.js';
import { CHART_COLORS, ESSENTIAL_TAX_ID_TYPES } from './config.js';
import { getAuthInstance } from './api.js';


// --- Almacenamiento de Referencias a Elementos del DOM y Gráficos ---

export const elements = {
    // Vistas principales
    authContainer: document.getElementById('auth-container'),
    sidebar: document.getElementById('sidebar'),
    mainContent: document.getElementById('main-content'),
    sidebarOverlay: document.getElementById('sidebar-overlay'),
    sidebarOpenBtn: document.getElementById('sidebar-open-btn'),
    sidebarCloseBtn: document.getElementById('sidebar-close-btn'),
    sidebarToggleDesktopBtn: document.getElementById('sidebar-toggle-desktop'),


    // Formularios de autenticación
    loginView: document.getElementById('login-view'),
    registerView: document.getElementById('register-view'),
    loginForm: document.getElementById('login-form'),
    registerForm: document.getElementById('register-form'),
    showRegisterViewBtn: document.getElementById('show-register-view'),
    showLoginViewBtn: document.getElementById('show-login-view'),
    authError: document.getElementById('auth-error'),
    logoutBtn: document.getElementById('logout-btn'),

    navLinks: document.querySelectorAll('.nav-link'),
    pages: document.querySelectorAll('.page-content'),
    transactionForm: document.getElementById('transaction-form'),
    transactionsTableBody: document.getElementById('transactions-table-body'),
    transferForm: document.getElementById('transfer-form'),
    proformaForm: document.getElementById('proforma-form'),
    addAccountForm: document.getElementById('add-account-form'),
    updateBalanceForm: document.getElementById('update-balance-form'),
    reportForm: document.getElementById('report-form'),
    reportDisplayArea: document.getElementById('report-display-area'),
    addIncomeCategoryForm: document.getElementById('add-income-category-form'),
    addExpenseCategoryForm: document.getElementById('add-expense-category-form'),
    addOperationTypeForm: document.getElementById('add-operation-type-form'),
    addTaxIdTypeForm: document.getElementById('add-tax-id-type-form'),
    settingsAccountsList: document.getElementById('settings-accounts-list'),
    incomeCategoriesList: document.getElementById('income-categories-list'),
    expenseCategoriesList: document.getElementById('expense-categories-list'),
    operationTypesList: document.getElementById('operation-types-list'),
    taxIdTypesList: document.getElementById('tax-id-types-list'),
    proformasTableBody: document.getElementById('proformas-table-body'),
    aeatSettingsCard: document.getElementById('aeat-settings-card'),
    aeatToggleContainer: document.getElementById('aeat-toggle-container'),
    aeatConfigForm: document.getElementById('aeat-config-form'),
    nuevaFacturaForm: document.getElementById('nueva-factura-form'),
    facturaItemsContainer: document.getElementById('factura-items-container'),
    facturaAddItemBtn: document.getElementById('factura-add-item-btn'),
    facturaApiResponse: document.getElementById('factura-api-response'),
    facturaOperationType: document.getElementById('factura-operation-type'),
    facturaSelectCliente: document.getElementById('factura-select-cliente'),
    facturasTableBody: document.getElementById('facturas-table-body'),
    defaultFiltersContainer: document.getElementById('default-filters-container'),
    sociedadesFiltersContainer: document.getElementById('sociedades-filters-container'),
    fiscalParamsForm: document.getElementById('fiscal-params-form'),
    invoiceViewerModal: document.getElementById('invoice-viewer-modal'),
    invoiceContentArea: document.getElementById('invoice-content-area'),
    closeInvoiceViewerBtn: document.getElementById('close-invoice-viewer-btn'),
    printInvoiceBtn: document.getElementById('print-invoice-btn'),
    pdfInvoiceBtn: document.getElementById('pdf-invoice-btn'),
    addClientForm: document.getElementById('add-client-form'),
    clientsTableBody: document.getElementById('clients-table-body'),
    investmentsTableBody: document.getElementById('investments-table-body'),
    paymentDetailsModal: document.getElementById('payment-details-modal'),
    paymentDetailsForm: document.getElementById('payment-details-form'),
    paymentDetailsCancelBtn: document.getElementById('payment-details-cancel-btn'),
    transactionIvaContainer: document.getElementById('transaction-iva-container'),
    ivaMonthInput: document.getElementById('iva-month'),
    ivaGenerateReportBtn: document.getElementById('iva-generate-report-btn'),
    ivaReportDisplay: document.getElementById('iva-report-display'),
    loadingOverlay: document.getElementById('loading-overlay'),
    addInvestmentForm: document.getElementById('add-investment-form'),
    addInvestmentAssetForm: document.getElementById('add-investment-asset-form'),
    investmentAssetsList: document.getElementById('investment-assets-list'),
    connectionStatus: document.getElementById('connection-status'),
    statusIcon: document.getElementById('status-icon'),
    statusText: document.getElementById('status-text'),
    newAccountLogoSelect: document.getElementById('new-account-logo-select'),
    
    // Elementos de gestión de usuarios y permisos (Modal)
    userManagementCard: document.getElementById('user-management-card'),
    usersList: document.getElementById('users-list'),
    permissionsModal: document.getElementById('permissions-modal'),
    permissionsModalEmail: document.getElementById('permissions-modal-email'),
    permissionsList: document.getElementById('permissions-list'),
    permissionsModalSaveBtn: document.getElementById('permissions-modal-save-btn'),
    permissionsModalCancelBtn: document.getElementById('permissions-modal-cancel-btn'),
};

const charts = {
    accountsBalanceChartEUR: null,
    accountsBalanceChartUSD: null,
    annualFlowChart: null,
    expenseDistributionChart: null,
    clientsChart: null,
};

// --- Funciones de UI para Autenticación ---

export function showAuthError(message) {
    if (elements.authError) elements.authError.textContent = message;
}

export function clearAuthError() {
    if (elements.authError) elements.authError.textContent = '';
}

export function showLoginView() {
    if (elements.loginView && elements.registerView) {
        elements.loginView.classList.remove('hidden');
        elements.registerView.classList.add('hidden');
        clearAuthError();
    }
}

export function showRegisterView() {
    if (elements.loginView && elements.registerView) {
        elements.loginView.classList.add('hidden');
        elements.registerView.classList.remove('hidden');
        clearAuthError();
    }
}

export function showApp() {
    if (elements.authContainer && elements.sidebar && elements.mainContent) {
        elements.authContainer.classList.add('hidden');
        elements.sidebar.classList.remove('hidden');
        elements.sidebar.classList.add('flex');
        elements.mainContent.classList.remove('hidden');
    }
}

export function hideApp() {
    if (elements.authContainer && elements.sidebar && elements.mainContent) {
        elements.authContainer.classList.remove('hidden');
        elements.sidebar.classList.add('hidden');
        elements.sidebar.classList.remove('flex');
        elements.mainContent.classList.add('hidden');
        showLoginView();
    }
}

// Funciones para mostrar/ocultar el modal de permisos
export function showPermissionsModal() {
    if (elements.permissionsModal) {
        elements.permissionsModal.classList.remove('hidden');
        elements.permissionsModal.classList.add('flex');
    }
}

export function hidePermissionsModal() {
    if (elements.permissionsModal) {
        elements.permissionsModal.classList.add('hidden');
        elements.permissionsModal.classList.remove('flex');
    }
}

// --- Funciones Creadoras de Elementos ---

function createTransactionRow(t) {
    const { permissions } = getState();
    const amountColor = t.type === 'Ingreso' ? 'text-green-400' : 'text-red-400';
    const sign = t.type === 'Ingreso' ? '+' : '-';

    // Decide si mostrar los botones de acción basado en el permiso 'manage_cashflow'.
    const actionsHtml = permissions.manage_cashflow ? `
        <div class="flex items-center justify-center gap-2">
            <button class="edit-btn p-2 text-blue-400 hover:text-blue-300" data-id="${t.id}" title="Editar">
                <i data-lucide="edit" class="w-4 h-4"></i>
            </button>
            <button class="delete-btn p-2 text-red-400 hover:text-red-300" data-id="${t.id}" title="Eliminar">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
        </div>` : '';

    return `
        <tr class="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
            <td class="py-3 px-3">${t.date}</td>
            <td class="py-3 px-3">${escapeHTML(t.description)}</td>
            <td class="py-3 px-3">${escapeHTML(t.account)}</td>
            <td class="py-3 px-3">${escapeHTML(t.category)}</td>
            <td class="py-3 px-3">${escapeHTML(t.part)}</td>
            <td class="py-3 px-3 text-right text-gray-400">${t.iva > 0 ? formatCurrency(t.iva, t.currency) : '-'}</td>
            <td class="py-3 px-3 text-right font-medium ${amountColor}">${sign} ${formatCurrency(t.amount, t.currency)}</td>
            <td class="py-3 px-3">${actionsHtml}</td>
        </tr>`;
}

function createAccountCard(account) {
    return `
        <div class="card p-6 rounded-xl flex flex-col">
            <div class="flex justify-between items-start mb-2">
                <h3 class="font-semibold text-lg">${escapeHTML(account.name)}</h3>
                <div>${account.logoHtml || '<i data-lucide="wallet" class="text-gray-500"></i>'}</div>
            </div>
            <div class="mt-auto">
                <p class="text-gray-400 text-sm">Saldo Actual</p>
                <p class="text-4xl font-bold kpi-value mt-2">${formatCurrency(account.balance, account.currency)}</p>
            </div>
        </div>`;
}

function createDocumentRow(doc, type) {
    const { permissions } = getState();
    const statusClass = doc.status === 'Cobrada' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300';
    
    let actionsHtml = '';

    // El botón de ver factura siempre es visible si se puede ver la sección.
    if (type === 'Factura') {
        actionsHtml += `
        <button class="view-invoice-btn p-2 text-blue-400 hover:text-blue-300" data-id="${doc.id}" title="Ver Factura">
            <i data-lucide="eye" class="w-4 h-4"></i>
        </button>`;
    }

    // Botón de generar recibo (si está cobrada)
    if (type === 'Factura' && doc.status === 'Cobrada') {
        actionsHtml += `
        <button class="generate-receipt-btn p-2 text-green-400 hover:text-green-300" data-id="${doc.id}" title="Generar Recibo">
            <i data-lucide="receipt" class="w-4 h-4"></i>
        </button>`;
    }
    
    // Botón de eliminar, depende del permiso.
    const canManage = (type === 'Factura' && permissions.manage_invoices) || (type === 'Proforma' && permissions.manage_proformas);
    if (canManage) {
        actionsHtml += `
        <button class="delete-doc-btn p-2 text-red-400 hover:text-red-300" data-id="${doc.id}" title="Eliminar">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>`;
    }

    // El estado es un botón o un span, dependiendo del permiso.
    const statusElement = permissions.change_document_status
        ? `<button class="status-btn text-xs font-semibold px-2 py-1 rounded-full ${statusClass}" data-id="${doc.id}">${doc.status}</button>`
        : `<span class="text-xs font-semibold px-2 py-1 rounded-full ${statusClass}">${doc.status}</span>`;

    return `
        <tr class="border-b border-gray-800 hover:bg-gray-800/50">
            <td class="py-3 px-3">${doc.date}</td>
            <td class="py-2 px-3">${escapeHTML(doc.number)}</td>
            <td class="py-2 px-3">${escapeHTML(doc.client)}</td>
            <td class="py-2 px-3 text-right">${formatCurrency(doc.amount, doc.currency)}</td>
            <td class="py-2 px-3 text-center">${statusElement}</td>
            <td class="py-2 px-3">
                <div class="flex items-center justify-center gap-2">${actionsHtml}</div>
            </td>
        </tr>`;
}

function createClientRow(client) {
    const { permissions } = getState();

    const actionsHtml = permissions.manage_clients ? `
        <div class="flex items-center justify-center gap-2">
            <button class="edit-client-btn p-2 text-blue-400 hover:text-blue-300" data-id="${client.id}" title="Editar">
                <i data-lucide="edit" class="w-4 h-4"></i>
            </button>
            <button class="delete-client-btn p-2 text-red-400 hover:text-red-300" data-id="${client.id}" title="Eliminar">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
        </div>` : '';
    
    return `
        <tr class="border-b border-gray-800 hover:bg-gray-800/50">
            <td class="py-3 px-3">${escapeHTML(client.name)}</td>
            <td class="py-3 px-3">${escapeHTML(client.taxIdType)} ${escapeHTML(client.taxId)}</td>
            <td class="py-3 px-3">${escapeHTML(client.email)}</td>
            <td class="py-3 px-3">${escapeHTML(client.phoneMobilePrefix)}${escapeHTML(client.phoneMobile)}</td>
            <td class="py-3 px-3">${actionsHtml}</td>
        </tr>`;
}

function createInvestmentRow(t, allAssets) {
    const { permissions } = getState();
    const asset = allAssets.find(a => a.id === t.investmentAssetId);
    const assetName = asset ? asset.name : 'Activo Desconocido';

    const actionsHtml = permissions.manage_investments ? `
        <button class="delete-investment-btn p-2 text-red-400 hover:text-red-300" data-id="${t.id}" title="Eliminar Inversión">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>` : '';

    return `
        <tr class="border-b border-gray-800 hover:bg-gray-800/50">
            <td class="py-3 px-3">${t.date}</td>
            <td class="py-2 px-3">${escapeHTML(assetName)}</td>
            <td class="py-2 px-3">${escapeHTML(t.account)}</td>
            <td class="py-2 px-3 text-right">${formatCurrency(t.amount, t.currency)}</td>
            <td class="py-2 px-3 text-center">${actionsHtml}</td>
        </tr>`;
}

// --- Funciones de Renderizado Principales ---

function renderTransactions() {
    const { transactions } = getState();
    const tbody = elements.transactionsTableBody;
    if (!tbody) return;

    let filteredTransactions = transactions.filter(t => t.category !== 'Inversión' && !t.isInitialBalance);
    const searchInput = document.getElementById('cashflow-search');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

    if (searchTerm) {
        filteredTransactions = filteredTransactions.filter(t => 
            t.description.toLowerCase().includes(searchTerm) ||
            t.account.toLowerCase().includes(searchTerm) ||
            t.category.toLowerCase().includes(searchTerm)
        );
    }
    
    if (filteredTransactions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-gray-500">No hay movimientos.</td></tr>`;
    } else {
        const rowsHtml = filteredTransactions
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map(createTransactionRow)
            .join('');
        tbody.innerHTML = rowsHtml;
    }
}

function renderAccountsTab() {
    const { accounts } = getState();
    const accountsGrid = document.getElementById('accounts-grid');
    if (!accountsGrid) return;
    accountsGrid.innerHTML = accounts.map(createAccountCard).join('');
}

function renderBalanceLegendAndChart() {
    const { accounts } = getState();
    const totalsContainer = document.getElementById('balance-totals');
    if (!totalsContainer) return;

    const totalEUR = accounts.filter(a => a.currency === 'EUR').reduce((sum, a) => sum + a.balance, 0);
    const totalUSD = accounts.filter(a => a.currency === 'USD').reduce((sum, a) => sum + a.balance, 0);
    totalsContainer.innerHTML = `
        <div><p class="text-gray-400 text-sm">Saldo Total en Euros</p><p class="text-2xl font-bold text-white">${formatCurrency(totalEUR, 'EUR')}</p></div>
        <div><p class="text-gray-400 text-sm">Saldo Total en Dólares</p><p class="text-2xl font-bold text-white">${formatCurrency(totalUSD, 'USD')}</p></div>`;
    
    renderSingleCurrencyChart('EUR', totalEUR, 'accountsBalanceChartEUR', 'balance-legend-eur', 'eur-chart-container');
    renderSingleCurrencyChart('USD', totalUSD, 'accountsBalanceChartUSD', 'balance-legend-usd', 'usd-chart-container');
}

function renderSingleCurrencyChart(currency, totalBalance, canvasId, legendId, containerId) {
    const { accounts } = getState();
    const container = document.getElementById(containerId);
    if (!container) return;

    const accountsForChart = accounts.filter(a => a.currency === currency && a.balance > 0);
    
    if (accountsForChart.length === 0) {
        container.classList.add('hidden');
        if (charts[canvasId]) {
            charts[canvasId].destroy();
            charts[canvasId] = null;
        }
        return;
    }
    container.classList.remove('hidden');
    
    const legendContainer = document.getElementById(legendId);
    const chartCtx = document.getElementById(canvasId)?.getContext('2d');
    if (!legendContainer || !chartCtx) return;
    
    if (charts[canvasId]) charts[canvasId].destroy();

    const backgroundColors = accountsForChart.map((_, index) => CHART_COLORS[index % CHART_COLORS.length]);
    
    legendContainer.innerHTML = accountsForChart.map((account, index) => {
        const percentage = totalBalance > 0 ? ((account.balance / totalBalance) * 100).toFixed(1) : 0;
        return `
            <div class="flex items-center justify-between py-2 text-sm border-b border-gray-800 last:border-b-0">
                <div class="flex items-center gap-3">
                    <span class="w-3 h-3 rounded-full" style="background-color: ${backgroundColors[index]};"></span>
                    <span>${escapeHTML(account.name)}</span>
                </div>
                <div class="text-right">
                    <span class="font-semibold">${percentage}%</span>
                    <span class="text-xs text-gray-400 block">${formatCurrency(account.balance, account.currency)}</span>
                </div>
            </div>`;
    }).join('');

    charts[canvasId] = new Chart(chartCtx, { 
        type: 'doughnut', 
        data: { 
            labels: accountsForChart.map(a => a.name), 
            datasets: [{ 
                data: accountsForChart.map(a => a.balance), 
                backgroundColor: backgroundColors,
                borderColor: '#0a0a0a', borderWidth: 5, borderRadius: 10,
            }] 
        }, 
        options: { 
            responsive: true, maintainAspectRatio: false, cutout: '65%',
            plugins: { legend: { display: false } }
        } 
    });
}

function updateInicioKPIs() {
    const { transactions, accounts } = getState();
    if(!transactions || !accounts) return;

    const currencySelect = document.getElementById('inicio-chart-currency');
    if (!currencySelect) return;
    const currency = currencySelect.value;
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let monthlyIncome = 0;
    let monthlyExpense = 0;

    transactions
        .filter(t => {
            const tDate = new Date(t.date);
            return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear && t.currency === currency;
        })
        .forEach(t => {
            if (t.type === 'Ingreso') {
                monthlyIncome += t.amount;
            } else if (t.type === 'Egreso') {
                monthlyExpense += t.amount;
            }
        });

    const monthlyProfit = monthlyIncome - monthlyExpense;
    const totalBalance = accounts.filter(a => a.currency === currency).reduce((sum, a) => sum + a.balance, 0);

    const kpiIncomeEl = document.getElementById('kpi-monthly-income');
    if (kpiIncomeEl) kpiIncomeEl.textContent = formatCurrency(monthlyIncome, currency);

    const kpiExpenseEl = document.getElementById('kpi-monthly-expense');
    if (kpiExpenseEl) kpiExpenseEl.textContent = formatCurrency(monthlyExpense, currency);
    
    const kpiProfitEl = document.getElementById('kpi-monthly-profit');
    if (kpiProfitEl) {
        kpiProfitEl.textContent = formatCurrency(monthlyProfit, currency);
        kpiProfitEl.classList.remove('text-green-400', 'text-red-400');
        kpiProfitEl.classList.add(monthlyProfit >= 0 ? 'text-green-400' : 'text-red-400');
    }

    const kpiTotalBalanceEl = document.getElementById('kpi-total-balance');
    if (kpiTotalBalanceEl) kpiTotalBalanceEl.textContent = formatCurrency(totalBalance, currency);
}

function renderAnnualFlowChart() {
    const { transactions } = getState();
    const annualCtx = document.getElementById('annualFlowChart')?.getContext('2d');
    if (!annualCtx || !transactions) return;

    if (charts.annualFlowChart) charts.annualFlowChart.destroy();
    
    const currencySelect = document.getElementById('inicio-chart-currency');
    if (!currencySelect) return;
    const selectedCurrency = currencySelect.value;

    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const currentYear = new Date().getFullYear();
    const incomeData = Array(12).fill(0);
    const expenseData = Array(12).fill(0);

    transactions
        .filter(t => new Date(t.date).getFullYear() === currentYear && t.currency === selectedCurrency)
        .forEach(t => {
            const month = new Date(t.date).getMonth();
            if (t.type === 'Ingreso') incomeData[month] += t.amount;
            else if (t.type === 'Egreso') expenseData[month] += t.amount;
        });
    
    const incomeGradient = annualCtx.createLinearGradient(0, 0, 0, 320);
    incomeGradient.addColorStop(0, 'rgba(59, 130, 246, 0.5)');
    incomeGradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
    const expenseGradient = annualCtx.createLinearGradient(0, 0, 0, 320);
    expenseGradient.addColorStop(0, 'rgba(239, 68, 68, 0.5)');
    expenseGradient.addColorStop(1, 'rgba(239, 68, 68, 0)');

    charts.annualFlowChart = new Chart(annualCtx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [
                { label: `Ingresos (${getCurrencySymbol(selectedCurrency)})`, data: incomeData, borderColor: 'rgba(59, 130, 246, 1)', backgroundColor: incomeGradient, fill: true, tension: 0.4 },
                { label: `Egresos (${getCurrencySymbol(selectedCurrency)})`, data: expenseData, borderColor: 'rgba(239, 68, 68, 1)', backgroundColor: expenseGradient, fill: true, tension: 0.4 }
            ]
        },
        options: { 
            responsive: true, maintainAspectRatio: false, 
            scales: { y: { beginAtZero: true } },
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

function renderExpenseDistributionChart() {
    const { transactions } = getState();
    const ctx = document.getElementById('expenseDistributionChart')?.getContext('2d');
    if (!ctx || !transactions) return;

    const currencySelect = document.getElementById('inicio-chart-currency');
    if (!currencySelect) return;
    const currency = currencySelect.value;
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const expenseByCategory = transactions
        .filter(t => {
            const tDate = new Date(t.date);
            return t.type === 'Egreso' && tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear && t.currency === currency;
        })
        .reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + t.amount;
            return acc;
        }, {});

    const labels = Object.keys(expenseByCategory);
    const data = Object.values(expenseByCategory);

    if (charts.expenseDistributionChart) charts.expenseDistributionChart.destroy();
    
    if (labels.length === 0) {
        return;
    }

    charts.expenseDistributionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: CHART_COLORS,
                borderColor: '#0a0a0a',
                borderWidth: 5,
                borderRadius: 10,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#e0e0e0',
                        boxWidth: 12,
                        padding: 15,
                    }
                }
            }
        }
    });
}

function renderRecentTransactions() {
    const { transactions } = getState();
    const container = document.getElementById('recent-transactions-container');
    if (!container || !transactions) return;

    const recent = transactions
        .filter(t => !t.isInitialBalance)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);

    if (recent.length === 0) {
        container.innerHTML = `<p class="text-center text-gray-500 py-4">No hay movimientos recientes.</p>`;
        return;
    }

    container.innerHTML = `
        <table class="w-full text-left">
            <tbody>
                ${recent.map(t => {
                    const isIncome = t.type === 'Ingreso';
                    return `
                        <tr class="border-b border-gray-800 last:border-b-0">
                            <td class="py-3 px-3">
                                <p class="font-medium">${escapeHTML(t.description)}</p>
                                <p class="text-xs text-gray-400">${t.date} - ${escapeHTML(t.account)}</p>
                            </td>
                            <td class="py-3 px-3 text-right font-semibold ${isIncome ? 'text-green-400' : 'text-red-400'}">
                                ${isIncome ? '+' : '-'} ${formatCurrency(t.amount, t.currency)}
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>`;
}

function renderMainBalances() {
    const { accounts } = getState();
    const container = document.getElementById('main-balances-container');
    if (!container || !accounts) return;

    const sortedAccounts = [...accounts].sort((a, b) => b.balance - a.balance).slice(0, 4);

    if (sortedAccounts.length === 0) {
        container.innerHTML = `<p class="text-center text-gray-500">No hay cuentas configuradas.</p>`;
        return;
    }

    container.innerHTML = sortedAccounts.map(acc => `
        <div class="flex justify-between items-center text-sm">
            <div class="flex items-center gap-3">
                ${acc.logoHtml || '<i data-lucide="wallet"></i>'}
                <span>${escapeHTML(acc.name)}</span>
            </div>
            <span class="font-semibold">${formatCurrency(acc.balance, acc.currency)}</span>
        </div>
    `).join('');
    lucide.createIcons();
}

function renderPendingInvoices() {
    const { documents } = getState();
    const container = document.getElementById('pending-invoices-container');
    if (!container || !documents) return;

    const pending = documents.filter(doc => doc.type === 'Factura' && doc.status === 'Adeudada');

    if (pending.length === 0) {
        container.innerHTML = `<div class="text-center text-gray-500 py-4">
            <i data-lucide="check-circle-2" class="w-8 h-8 mx-auto mb-2 text-green-500"></i>
            <p>¡Todo al día!</p>
        </div>`;
        lucide.createIcons();
        return;
    }

    container.innerHTML = pending.slice(0, 3).map(doc => `
        <div class="flex justify-between items-center text-sm border-b border-gray-800 last:border-b-0 py-2">
            <div>
                <p class="font-medium">${escapeHTML(doc.number)}</p>
                <p class="text-xs text-gray-400">${escapeHTML(doc.client)}</p>
            </div>
            <span class="font-semibold">${formatCurrency(doc.amount, doc.currency)}</span>
        </div>
    `).join('');
}


function renderDocuments(type, tableBody, searchInputId) {
    const { documents, permissions } = getState();
    const searchInput = document.getElementById(searchInputId);
    if (!tableBody || !searchInput || !permissions) return;

    if (type === 'Proforma' && elements.proformaForm && elements.proformaForm.parentElement) {
        elements.proformaForm.parentElement.classList.toggle('hidden', !permissions.manage_proformas);
    }
    const createInvoiceTab = document.getElementById('facturacion-tab-crear');
    if (type === 'Factura' && createInvoiceTab) {
        createInvoiceTab.classList.toggle('hidden', !permissions.manage_invoices);
        
        if (!permissions.manage_invoices && createInvoiceTab.classList.contains('active')) {
             document.getElementById('facturacion-tab-listado')?.click();
        }
    }

    const filteredDocs = documents.filter(d => d.type === type);
    const searchTerm = searchInput.value.toLowerCase();
    let displayDocs = filteredDocs;
    
    if (searchTerm) {
        displayDocs = filteredDocs.filter(d =>
            d.number.toLowerCase().includes(searchTerm) ||
            d.client.toLowerCase().includes(searchTerm)
        );
    }

    tableBody.innerHTML = '';
    if (displayDocs.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-gray-500">No hay ${type.toLowerCase()}s.</td></tr>`;
    } else {
        const rowsHtml = displayDocs.sort((a, b) => new Date(b.date) - new Date(a.date))
                   .map(doc => createDocumentRow(doc, type))
                   .join('');
        tableBody.innerHTML = rowsHtml;
    }
}

function renderClients() {
    const { clients, permissions } = getState();
    const tbody = elements.clientsTableBody;
    if (!tbody || !permissions) return;

    if (elements.addClientForm && elements.addClientForm.parentElement) {
        elements.addClientForm.parentElement.parentElement.classList.toggle('hidden', !permissions.manage_clients);
    }

    tbody.innerHTML = '';
    if (clients.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-gray-500">No hay clientes registrados.</td></tr>`;
        return;
    }
    
    tbody.innerHTML = clients.map(createClientRow).join('');
}

function renderClientsChart() {
    const { documents } = getState();
    const ctx = document.getElementById('clientsChart')?.getContext('2d');
    if (!ctx || !documents) return;

    if (charts.clientsChart) charts.clientsChart.destroy();

    const currencySelect = document.getElementById('clients-chart-currency');
    if (!currencySelect) return;
    const selectedCurrency = currencySelect.value;

    const invoices = documents.filter(doc => doc.type === 'Factura' && doc.currency === selectedCurrency);

    const salesByClient = invoices.reduce((acc, invoice) => {
        const clientName = invoice.client;
        acc[clientName] = (acc[clientName] || 0) + invoice.amount;
        return acc;
    }, {});

    const sortedClients = Object.entries(salesByClient)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);

    const labels = sortedClients.map(([name]) => name);
    const data = sortedClients.map(([, amount]) => amount);

    if (labels.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.save();
        ctx.textAlign = 'center';
        ctx.fillStyle = '#6b7280';
        ctx.font = "16px 'Inter', sans-serif";
        ctx.fillText(`No hay datos de facturación en ${selectedCurrency}.`, ctx.canvas.width / 2, ctx.canvas.height / 2);
        ctx.restore();
        return;
    }

    charts.clientsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total Facturado',
                data: data,
                backgroundColor: CHART_COLORS,
                borderColor: '#1e3a8a',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: `Monto en ${selectedCurrency}`
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

function renderInvestments() {
    const { transactions, investmentAssets, permissions } = getState();
    const tbody = elements.investmentsTableBody;
    if (!tbody || !permissions) return;
    
    if(elements.addInvestmentForm && elements.addInvestmentForm.parentElement) {
        elements.addInvestmentForm.parentElement.classList.toggle('hidden', !permissions.manage_investments);
    }

    const investmentsData = transactions.filter(t => t.category === 'Inversión');
    
    const totalInvestedEUR = investmentsData.filter(t => t.currency === 'EUR').reduce((sum, t) => sum + t.amount, 0);
    const totalInvestedUSD = investmentsData.filter(t => t.currency === 'USD').reduce((sum, t) => sum + t.amount, 0);
    
    const totalEurEl = document.getElementById('total-invested-eur');
    if (totalEurEl) totalEurEl.textContent = formatCurrency(totalInvestedEUR, 'EUR');

    const totalUsdEl = document.getElementById('total-invested-usd');
    if (totalUsdEl) totalUsdEl.textContent = formatCurrency(totalInvestedUSD, 'USD');

    if (investmentsData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-gray-500">No hay movimientos de inversión.</td></tr>`;
    } else {
        const rowsHtml = investmentsData.sort((a, b) => new Date(b.date) - new Date(a.date))
                       .map(t => createInvestmentRow(t, investmentAssets))
                       .join('');
        tbody.innerHTML = rowsHtml;
    }
}

function renderInvestmentAssetsList() {
    const { investmentAssets } = getState();
    const listEl = elements.investmentAssetsList;
    if (!listEl) return;
    listEl.innerHTML = '';
    if (investmentAssets.length === 0) {
        listEl.innerHTML = `<p class="text-sm text-gray-500 text-center">No hay activos definidos.</p>`;
        return;
    }
    investmentAssets.forEach(asset => {
        const div = document.createElement('div');
        div.className = "flex items-center justify-between bg-gray-800/50 p-2 rounded text-sm";
        div.innerHTML = `
            <div>
                <span class="font-semibold">${escapeHTML(asset.name)}</span>
                <span class="text-gray-400 text-xs">(${escapeHTML(asset.category)})</span>
            </div>
            <button class="delete-investment-asset-btn p-1 text-red-400 hover:text-red-300" data-id="${asset.id}">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>`;
        listEl.appendChild(div);
    });
}

function renderUserManagement() {
    const { allUsers, permissions } = getState();
    const auth = getAuthInstance();
    const currentUser = auth.currentUser;

    if (!permissions.manage_users) {
        elements.userManagementCard.classList.add('hidden');
        return;
    }

    elements.userManagementCard.classList.remove('hidden');
    
    const header = elements.userManagementCard.querySelector('h3');
    if (header && !header.querySelector('#refresh-users-btn')) {
        header.classList.add('flex', 'justify-between', 'items-center');
        header.innerHTML = `
            <span>Gestión de Usuarios</span>
            <button id="refresh-users-btn" class="p-2 text-blue-400 hover:bg-gray-700 rounded-full" title="Actualizar Lista">
                <i data-lucide="refresh-cw" class="w-4 h-4"></i>
            </button>
        `;
    }
    
    const listEl = elements.usersList;
    if (!listEl) return;

    const otherUsers = allUsers.filter(user => user.id !== currentUser.uid);

    if (otherUsers.length === 0) {
        listEl.innerHTML = `<p class="text-sm text-gray-500 text-center">No hay otros usuarios registrados.</p>`;
        return;
    }

    listEl.innerHTML = otherUsers.map(user => {
        const status = user.status || 'pendiente';
        let statusColor, statusText, actionsHtml;
        let baseActions = `
            <button class="delete-user-btn p-2 rounded-lg bg-red-600/20 hover:bg-red-600/40 text-red-300" data-id="${user.id}" title="Eliminar Usuario">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
        `;

        if (status === 'activo') {
            statusColor = 'text-green-400';
            statusText = 'Activo';
            actionsHtml = `
                <button class="manage-permissions-btn p-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-300" data-id="${user.id}" title="Gestionar Permisos">
                    <i data-lucide="shield-check" class="w-4 h-4"></i>
                </button>
                <button class="deactivate-btn p-2 rounded-lg bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-300" data-id="${user.id}" title="Desactivar">
                    <i data-lucide="user-x" class="w-4 h-4"></i>
                </button>
                ${baseActions}
            `;
        } else { // pendiente
            statusColor = 'text-yellow-400';
            statusText = 'Pendiente';
            actionsHtml = `
                <button class="activate-basic-btn p-2 rounded-lg bg-green-600/20 hover:bg-green-600/40 text-green-300 text-xs flex items-center gap-1" data-id="${user.id}" title="Activar Acceso Básico">
                    <i data-lucide="user-check" class="w-3 h-3"></i> Básico
                </button>
                <button class="activate-full-btn p-2 rounded-lg bg-green-600/20 hover:bg-green-600/40 text-green-300 text-xs flex items-center gap-1" data-id="${user.id}" title="Activar Acceso Completo">
                    <i data-lucide="user-check" class="w-3 h-3"></i> Completo
                </button>
                ${baseActions}
            `;
        }

        return `
            <div class="flex items-center justify-between bg-gray-800/50 p-3 rounded text-sm">
                <div>
                    <p class="font-semibold">${escapeHTML(user.email)}</p>
                    <p class="text-xs ${statusColor} capitalize">${escapeHTML(statusText)}</p>
                </div>
                <div class="flex items-center gap-2">
                    ${actionsHtml}
                </div>
            </div>
        `;
    }).join('');
}

function renderSettings() {
    const { accounts, incomeCategories, expenseCategories, invoiceOperationTypes, taxIdTypes, settings, permissions } = getState();
    if (!permissions) return;

    // Mapeo de permisos a los elementos de las tarjetas de ajustes.
    const settingsCards = {
        manage_users: elements.userManagementCard,
        manage_fiscal_settings: elements.aeatSettingsCard,
        manage_fiscal_settings_2: elements.fiscalParamsForm?.parentElement?.parentElement,
        manage_accounts: elements.addAccountForm?.parentElement,
        manage_categories: elements.addIncomeCategoryForm?.parentElement?.parentElement?.parentElement,
        manage_categories_2: elements.addOperationTypeForm?.parentElement,
        manage_categories_3: elements.addTaxIdTypeForm?.parentElement,
        execute_balance_adjustment: elements.updateBalanceForm?.parentElement,
        manage_investments: elements.addInvestmentAssetForm?.parentElement,
        execute_year_close: document.getElementById('close-year-btn')?.parentElement
    };

    // Recorre y oculta/muestra cada tarjeta.
    for (const key in settingsCards) {
        // Usa una clave de permiso real del mapa de permisos.
        const permissionKey = key.replace(/_\d+$/, ''); // Elimina sufijos numéricos
        const element = settingsCards[key];
        if (element) {
            element.classList.toggle('hidden', !permissions[permissionKey]);
        }
    }
    
    // Si la tarjeta está visible, renderiza su contenido.
    if (permissions.manage_accounts && elements.settingsAccountsList) {
        elements.settingsAccountsList.innerHTML = '';
        accounts.forEach(acc => {
            const div = document.createElement('div');
            div.className = "flex items-center justify-between bg-gray-800/50 p-2 rounded";
            div.innerHTML = `
                <div class="flex items-center gap-2 text-sm">${acc.logoHtml || ''}<span>${escapeHTML(acc.name)}</span></div>
                <button class="delete-account-btn p-1 text-red-400 hover:text-red-300" data-name="${escapeHTML(acc.name)}"><i data-lucide="trash-2" class="w-4 h-4"></i></button>`;
            elements.settingsAccountsList.appendChild(div);
        });
    }

    const renderCategoryList = (listEl, categories, essentialCategories) => {
        if (!listEl) return;
        listEl.innerHTML = '';
        categories.forEach(cat => {
            const div = document.createElement('div');
            div.className = "flex items-center justify-between bg-gray-800/50 p-2 rounded text-sm";
            const isEssential = essentialCategories.includes(cat);
            const deleteButtonHtml = isEssential 
                ? `<span class="p-1 text-gray-600 cursor-not-allowed" title="Categoría esencial"><i data-lucide="lock" class="w-4 h-4"></i></span>`
                : `<button class="delete-category-btn p-1 text-red-400 hover:text-red-300" data-name="${escapeHTML(cat)}"><i data-lucide="trash-2" class="w-4 h-4"></i></button>`;
            div.innerHTML = `<span>${escapeHTML(cat)}</span> ${deleteButtonHtml}`;
            listEl.appendChild(div);
        });
    };

    if (permissions.manage_categories) {
        renderCategoryList(elements.incomeCategoriesList, incomeCategories, []);
        renderCategoryList(elements.expenseCategoriesList, expenseCategories, []);
        renderCategoryList(elements.operationTypesList, invoiceOperationTypes, []);
        renderCategoryList(elements.taxIdTypesList, taxIdTypes, ESSENTIAL_TAX_ID_TYPES);
    }

    if (permissions.manage_investments) {
        renderInvestmentAssetsList();
    }
    
    if (permissions.manage_users) {
        renderUserManagement();
    }
    
    if (permissions.manage_fiscal_settings && elements.aeatToggleContainer && settings) {
        const isActive = settings.aeatModuleActive;
        elements.aeatToggleContainer.innerHTML = isActive
            ? `<button class="aeat-toggle-btn bg-blue-600 text-white font-bold py-2 px-3 rounded-lg"><i data-lucide="check-circle" class="w-4 h-4"></i> Activado</button>`
            : `<button class="aeat-toggle-btn border border-blue-800 text-blue-400 font-bold py-2 px-3 rounded-lg">Activar</button>`;
    }
    
    const taxRateInput = elements.fiscalParamsForm?.querySelector('#corporate-tax-rate');
    if (permissions.manage_fiscal_settings && taxRateInput && settings && settings.fiscalParameters) {
        taxRateInput.value = settings.fiscalParameters.corporateTaxRate;
    }
}

function renderReport() {
    const { activeReport } = getState();
    if (!elements.reportDisplayArea) return;
    if (!activeReport || !activeReport.type || activeReport.data.length === 0) {
        elements.reportDisplayArea.innerHTML = `<div class="text-center text-gray-500 flex flex-col items-center justify-center h-full"><i data-lucide="file-search-2" class="w-16 h-16 mb-4"></i><h3 class="font-semibold text-lg">No hay datos para el reporte</h3><p class="text-sm">Pruebe con otros filtros o añada datos.</p></div>`;
        lucide.createIcons();
        return;
    }

    const { type, title, columns, data } = activeReport;

    let footerHtml = '';
    if (type === 'movimientos') {
        const totals = {};
        const typeIndex = columns.indexOf("Tipo");
        const amountIndex = columns.indexOf("Monto");
        const currencyIndex = columns.indexOf("Moneda");

        if (typeIndex !== -1 && amountIndex !== -1 && currencyIndex !== -1) {
            data.forEach(row => {
                const type = row[typeIndex];
                const amount = row[amountIndex];
                const currency = row[currencyIndex];
                
                if (!totals[currency]) {
                    totals[currency] = 0;
                }
                
                if (type === 'Ingreso') {
                    totals[currency] += amount;
                } else {
                    totals[currency] -= amount;
                }
            });
        }
        
        const totalsContent = Object.keys(totals).map(currency => {
            const total = totals[currency];
            const colorClass = total >= 0 ? 'text-green-400' : 'text-red-400';
            return `<div class="font-bold ${colorClass}">${formatCurrency(total, currency)}</div>`;
        }).join('');

        if (Object.keys(totals).length > 0) {
            footerHtml = `
                <tfoot>
                    <tr class="border-t-2 border-gray-600">
                        <td colspan="${columns.length - 2}" class="py-3 px-3 text-right font-semibold">TOTAL NETO:</td>
                        <td class="py-3 px-3 text-right" colspan="2">${totalsContent}</td>
                    </tr>
                </tfoot>`;
        }
    }

    let tableHtml = `<table class="w-full text-left"><thead><tr class="border-b border-gray-700">`;
    columns.forEach(col => tableHtml += `<th class="py-2 px-3 text-sm font-semibold text-gray-400">${col}</th>`);
    tableHtml += `</tr></thead><tbody>`;

    data.forEach(row => {
        tableHtml += `<tr class="border-b border-gray-800">`;
        row.forEach((cell, index) => {
            const isNumeric = typeof cell === 'number';
            const isAmount = columns[index].toLowerCase() === 'monto' || columns[index].toLowerCase() === 'importe';
            const currency = isAmount ? (row[6] || 'EUR') : undefined;
            
            let cellContent = isAmount ? formatCurrency(cell, currency) : escapeHTML(String(cell));
            if(columns[index] === "Monto" && row[4] === 'Egreso') {
                cellContent = `- ${cellContent}`;
            }

            tableHtml += `<td class="py-2 px-3 text-sm ${isNumeric ? 'text-right' : ''}">${cellContent}</td>`;
        });
        tableHtml += `</tr>`;
    });
    tableHtml += `</tbody>${footerHtml}</table>`;

    elements.reportDisplayArea.innerHTML = `
        <div class="flex justify-between items-start mb-4">
            <h3 class="font-semibold text-lg">${title}</h3>
            <div class="dropdown">
                <button id="report-download-btn" class="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                    <i data-lucide="download" class="w-4 h-4"></i> Descargar
                </button>
                <div id="report-download-options" class="dropdown-content">
                    <button class="download-option" data-format="pdf">Exportar como PDF</button>
                    <button class="download-option" data-format="xlsx">Exportar como Excel</button>
                </div>
            </div>
        </div>
        <div class="overflow-x-auto">${tableHtml}</div>`;
    lucide.createIcons();
}


function renderIvaReport() {
    const { activeIvaReport } = getState();
    const displayArea = elements.ivaReportDisplay;
    if (!displayArea) return;

    if (!activeIvaReport) {
        displayArea.innerHTML = `
            <div class="text-center text-gray-500 py-10">
                <i data-lucide="info" class="w-12 h-12 mx-auto mb-4"></i>
                <p>Seleccione un mes y genere el reporte para ver los resultados.</p>
            </div>`;
        lucide.createIcons();
        return;
    }

    const { soportado, repercutido, resultado } = activeIvaReport;

    const createTableRows = (items) => {
        if (items.length === 0) {
            return `<tr><td colspan="4" class="text-center py-3 text-gray-500">No hay datos para este período.</td></tr>`;
        }
        return items.map(item => `
            <tr class="border-b border-gray-800">
                <td class="py-2 px-3 text-sm">${item.date}</td>
                <td class="py-2 px-3 text-sm">${escapeHTML(item.description || `${item.number} - ${item.client}`)}</td>
                <td class="py-2 px-3 text-sm text-right">${formatCurrency(item.base, item.currency)}</td>
                <td class="py-2 px-3 text-sm text-right font-semibold">${formatCurrency(item.iva, item.currency)}</td>
            </tr>
        `).join('');
    };

    displayArea.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div class="card p-4 rounded-xl text-center">
                <p class="text-sm text-gray-400">IVA Soportado (Gastos)</p>
                <p class="text-2xl font-bold text-red-400 mt-1">${formatCurrency(soportado.total, 'EUR')}</p>
            </div>
            <div class="card p-4 rounded-xl text-center">
                <p class="text-sm text-gray-400">IVA Repercutido (Ingresos)</p>
                <p class="text-2xl font-bold text-green-400 mt-1">${formatCurrency(repercutido.total, 'EUR')}</p>
            </div>
            <div class="card p-4 rounded-xl text-center ${resultado >= 0 ? 'bg-green-900/30' : 'bg-red-900/30'}">
                <p class="text-sm ${resultado >= 0 ? 'text-green-300' : 'text-red-300'}">Resultado del Período</p>
                <p class="text-2xl font-bold ${resultado >= 0 ? 'text-green-300' : 'text-red-300'} mt-1">${formatCurrency(Math.abs(resultado), 'EUR')}</p>
                <p class="text-xs ${resultado >= 0 ? 'text-green-400' : 'text-red-400'}">${resultado >= 0 ? 'IVA a Pagar' : 'IVA a Favor'}</p>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="card p-4 rounded-xl">
                <h4 class="font-semibold mb-3 text-lg">Detalle de IVA Soportado</h4>
                <div class="overflow-y-auto max-h-80">
                    <table class="w-full text-left">
                        <thead>
                            <tr class="text-gray-400 border-b border-gray-700">
                                <th class="py-2 px-3 text-xs">Fecha</th>
                                <th class="py-2 px-3 text-xs">Concepto</th>
                                <th class="py-2 px-3 text-xs text-right">Base</th>
                                <th class="py-2 px-3 text-xs text-right">IVA</th>
                            </tr>
                        </thead>
                        <tbody>${createTableRows(soportado.items)}</tbody>
                    </table>
                </div>
            </div>
            <div class="card p-4 rounded-xl">
                <h4 class="font-semibold mb-3 text-lg">Detalle de IVA Repercutido</h4>
                 <div class="overflow-y-auto max-h-80">
                    <table class="w-full text-left">
                        <thead>
                             <tr class="text-gray-400 border-b border-gray-700">
                                <th class="py-2 px-3 text-xs">Fecha</th>
                                <th class="py-2 px-3 text-xs">Factura / Cliente</th>
                                <th class="py-2 px-3 text-xs text-right">Base</th>
                                <th class="py-2 px-3 text-xs text-right">IVA</th>
                            </tr>
                        </thead>
                        <tbody>${createTableRows(repercutido.items)}</tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    lucide.createIcons();
}

// --- Funciones de Utilidad y Ayuda para la UI ---

export function openSidebar() {
    const sidebar = elements.sidebar;
    const overlay = elements.sidebarOverlay;
    if (sidebar && overlay) {
        sidebar.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
    }
}

export function closeSidebar() {
    const sidebar = elements.sidebar;
    const overlay = elements.sidebarOverlay;
    if (sidebar && overlay) {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
    }
}

/**
 * Rellena el campo de número de factura con el siguiente número correlativo.
 * Esta función es ahora más robusta para prevenir que el campo quede vacío.
 */
export function populateNextInvoiceNumber() {
    const state = getState();
    const numberInput = document.getElementById('factura-numero');
    if (!numberInput) return; // Salir si el campo no existe en la página actual

    // Proporcionar valores por defecto si el contador no está listo en el estado.
    let nextNumber = 1;
    let lastInvoiceYear = new Date().getFullYear();

    if (state.settings && state.settings.invoiceCounter) {
        nextNumber = state.settings.invoiceCounter.nextInvoiceNumber;
        lastInvoiceYear = state.settings.invoiceCounter.lastInvoiceYear;
    } else {
        console.warn("El contador de facturas (invoiceCounter) no está disponible en el estado. Usando valores por defecto.");
    }

    const dateInput = document.getElementById('factura-fecha');
    const currentYear = dateInput.value ? new Date(dateInput.value).getFullYear() : new Date().getFullYear();

    let number;
    if (currentYear > lastInvoiceYear) {
        // Si el año de la factura es mayor, se reinicia el contador.
        number = 1;
    } else if (currentYear < lastInvoiceYear) {
        // Si se elige un año anterior, es complejo saber el correlativo correcto.
        // Por seguridad, se sugiere el 1 y el usuario puede ajustarlo manualmente si es necesario.
        number = 1;
        console.log(`Fecha anterior al último año registrado. Se sugiere el número 1 para el año ${currentYear}.`);
    } else {
        // Si es el mismo año, se usa el siguiente número disponible.
        number = nextNumber;
    }

    const formattedNumber = String(number).padStart(4, '0');
    const invoiceNumber = `${currentYear}-${formattedNumber}`;

    numberInput.value = invoiceNumber;
}


function renderInicioDashboard() {
    updateInicioKPIs();
    renderAnnualFlowChart();
    renderExpenseDistributionChart();
    renderMainBalances();
    renderPendingInvoices();
    renderRecentTransactions();
}

function toggleIvaField() {
    const type = elements.transactionForm?.querySelector('#transaction-type').value;
    if (type === 'Egreso') {
        elements.transactionIvaContainer?.classList.remove('hidden');
    } else {
        elements.transactionIvaContainer?.classList.add('hidden');
    }
}

export function switchPage(pageId, subpageId = null) {
    const { permissions } = getState();
    if (!permissions) return; // Salir si los permisos aún no se han cargado

    const viewPermissionMap = {
        'inicio': 'view_dashboard',
        'cashflow': 'view_cashflow',
        'iva': 'view_iva_control',
        'cuentas': 'view_accounts',
        'proformas': 'view_documents',
        'reportes': 'view_reports',
        'archivos': 'view_archives',
        'facturacion': 'view_documents',
        'inversiones': 'view_investments',
        'clientes': 'view_clients',
        'ajustes': ['manage_accounts', 'manage_categories', 'execute_balance_adjustment', 'execute_year_close', 'manage_fiscal_settings', 'manage_users'],
    };

    const requiredPermission = viewPermissionMap[pageId];
    let hasPermission = false;

    if (requiredPermission) {
        if (Array.isArray(requiredPermission)) {
            hasPermission = requiredPermission.some(p => permissions[p]);
        } else {
            hasPermission = permissions[requiredPermission];
        }
    }

    // Si no tiene permiso, redirige a inicio y muestra un aviso.
    if (!hasPermission) {
        showAlertModal('Acceso Denegado', 'No tienes permiso para acceder a esta sección.');
        pageId = 'inicio'; // Forzamos la redirección a la página de inicio.
    }

    // Oculta todas las páginas y muestra solo la activa
    elements.pages.forEach(page => page.classList.toggle('hidden', page.id !== `page-${pageId}`));
    
    // Actualiza el link activo en la navegación
    elements.navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.id === `nav-${pageId}`) {
            link.classList.add('active');
        }
    });
    
    // Manejo de sub-páginas (como en facturación)
    if (pageId === 'facturacion') {
        if (!subpageId) {
            const activeTab = document.querySelector('.tab-button-inner.active');
            subpageId = activeTab ? activeTab.id.replace('facturacion-tab-', '') : 'crear';
        }
        
        document.querySelectorAll('.tab-button-inner').forEach(btn => btn.classList.remove('active'));
        const tabButton = document.getElementById(`facturacion-tab-${subpageId}`);
        if(tabButton) tabButton.classList.add('active');
        
        ['crear', 'listado', 'config'].forEach(id => {
            const content = document.getElementById(`facturacion-content-${id}`);
            if (content) content.classList.toggle('hidden', id !== subpageId);
        });
    }

    // Cierra el menú lateral en móvil
    if (window.innerWidth < 768) {
        closeSidebar();
    }

    // Llama a la función principal de renderizado UNA SOLA VEZ después de cambiar la página.
    // Esto asegura que solo se renderice el contenido de la página visible.
    renderAll();
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

export function populateSelects() {
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

export function populateCategories() {
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

export function populateClientSelectForInvoice() {
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

export function updateCurrencySymbol() {
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

export function updateTransferFormUI() {
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

export function resetTransactionForm() {
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

export function showConfirmationModal(title, message, onConfirm) {
    const modal = document.getElementById('confirmation-modal');
    const titleEl = document.getElementById('modal-title');
    const messageEl = document.getElementById('modal-message');
    const confirmBtn = document.getElementById('modal-confirm-btn');
    const cancelBtn = document.getElementById('modal-cancel-btn');

    if (!modal || !titleEl || !messageEl || !confirmBtn || !cancelBtn) return;

    titleEl.textContent = title;
    messageEl.textContent = message;
    
    const confirmHandler = () => {
        onConfirm();
        modal.classList.add('hidden');
        confirmBtn.removeEventListener('click', confirmHandler);
    };
    
    confirmBtn.onclick = confirmHandler;
    cancelBtn.onclick = () => modal.classList.add('hidden');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

export function showAlertModal(title, message) {
    const modal = document.getElementById('alert-modal');
    const titleEl = document.getElementById('alert-modal-title');
    const messageEl = document.getElementById('alert-modal-message');
    const okBtn = document.getElementById('alert-modal-ok-btn');

    if (!modal || !titleEl || !messageEl || !okBtn) return;

    titleEl.textContent = title;
    messageEl.textContent = message;
    okBtn.onclick = () => modal.classList.add('hidden');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

export function showInvoiceViewer(invoiceId) {
    const { documents } = getState();
    const invoice = documents.find(doc => doc.id === invoiceId);
    if (!invoice || !elements.invoiceContentArea) return;

    const itemsHtml = invoice.items.map(item => `
        <tr class="border-b border-gray-200">
            <td class="py-3 px-4">${escapeHTML(item.description)}</td>
            <td class="py-3 px-4 text-right">${item.quantity.toFixed(3)}</td>
            <td class="py-3 px-4 text-right">${formatCurrency(item.price, invoice.currency)}</td>
            <td class="py-3 px-4 text-right font-medium">${formatCurrency(item.quantity * item.price, invoice.currency)}</td>
        </tr>`).join('');

    elements.invoiceContentArea.innerHTML = `
    <div id="invoice-printable-area" style="padding: 40px;" class="bg-white text-gray-800 font-sans">
        <header class="flex justify-between items-start mb-12 pb-8 border-b">
            <div class="w-1/2">
                <div class="flex items-center gap-3 mb-4">
                    <svg class="h-10 w-10 text-blue-600" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>
                    </svg>
                    <span class="text-2xl font-bold text-gray-800">Europa Envíos</span>
                </div>
                <p class="font-semibold">LAMAQUINALOGISTICA, SOCIEDAD LIMITADA</p>
                <p class="text-gray-600 text-sm">
                    CALLE ESTEBAN SALAZAR CHAPELA, NUM 20, PUERTA 87, NAVE 87<br>
                    29004 MÁLAGA (ESPAÑA)<br>
                    NIF: B56340656
                </p>
            </div>
            <div class="w-1/2 text-right">
                <h1 class="text-5xl font-bold text-gray-800 uppercase tracking-widest">Factura</h1>
                <div class="mt-4">
                    <span class="text-gray-500">Nº de factura:</span>
                    <strong class="text-gray-700">${escapeHTML(invoice.number)}</strong>
                </div>
                <div>
                    <span class="text-gray-500">Fecha:</span>
                    <strong class="text-gray-700">${invoice.date}</strong>
                </div>
            </div>
        </header>

        <div class="mb-12">
            <h3 class="font-semibold text-gray-500 text-sm mb-2 uppercase tracking-wide">Facturar a:</h3>
            <p class="font-bold text-lg text-gray-800">${escapeHTML(invoice.client)}</p>
            <p class="text-gray-600 whitespace-pre-line">${escapeHTML(invoice.address || '')}</p>
            <p class="text-gray-600">NIF/RUC: ${escapeHTML(invoice.nif) || ''}</p>
            ${invoice.phone ? `<p class="text-gray-600">Tel: ${escapeHTML(invoice.phone)}</p>` : ''}
        </div>

        <table class="w-full text-left mb-12">
            <thead>
                <tr class="bg-gray-700 text-white">
                    <th class="py-3 px-4 font-semibold uppercase text-sm rounded-l-lg">Descripción</th>
                    <th class="py-3 px-4 font-semibold uppercase text-sm text-right">Cantidad</th>
                    <th class="py-3 px-4 font-semibold uppercase text-sm text-right">Precio Unit.</th>
                    <th class="py-3 px-4 font-semibold uppercase text-sm text-right rounded-r-lg">Total</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>

        <div class="flex justify-between items-start">
             <div class="w-1/2 text-sm text-gray-600">
                ${invoice.operationType.toLowerCase().includes('exportación') ? `
                <h4 class="font-semibold text-gray-800 mb-2">Notas</h4>
                <p class="mb-4">Operación no sujeta a IVA por regla de localización: Ley 37/1992.</p>` : ''}
            </div>
            <div class="w-1/2 max-w-sm ml-auto space-y-3">
                <div class="flex justify-between">
                    <span class="text-gray-600">Subtotal:</span>
                    <span class="font-semibold text-gray-800">${formatCurrency(invoice.subtotal, invoice.currency)}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">IVA (${(invoice.ivaRate * 100).toFixed(0)}%):</span>
                    <span class="font-semibold text-gray-800">${formatCurrency(invoice.iva, invoice.currency)}</span>
                </div>
                <div class="flex justify-between font-bold text-2xl border-t-2 border-gray-700 pt-3 mt-3">
                    <span class="text-gray-800">TOTAL:</span>
                    <span class="text-blue-600">${formatCurrency(invoice.total, invoice.currency)}</span>
                </div>
            </div>
        </div>

        <footer class="text-center text-sm text-gray-500 mt-20 pt-4 border-t">
            <p>Gracias por su confianza.</p>
        </footer>
    </div>`;
    elements.invoiceViewerModal.classList.remove('hidden');
    elements.invoiceViewerModal.classList.add('flex');
}

export function showReceiptViewer(invoice) {
    if (!invoice || !invoice.paymentDetails || !elements.invoiceContentArea) return;

    elements.invoiceContentArea.innerHTML = `
    <div id="invoice-printable-area" style="padding: 40px;" class="bg-white text-gray-800 font-sans">
        <header class="flex justify-between items-start mb-12 pb-8 border-b">
            <div class="w-1/2">
                <div class="flex items-center gap-3 mb-4">
                    <svg class="h-10 w-10 text-blue-600" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>
                    </svg>
                    <span class="text-2xl font-bold text-gray-800">Europa Envíos</span>
                </div>
                <p class="font-semibold">LAMAQUINALOGISTICA, SOCIEDAD LIMITADA</p>
                <p class="text-gray-600 text-sm">
                    CALLE ESTEBAN SALAZAR CHAPELA, NUM 20, PUERTA 87, NAVE 87<br>
                    29004 MÁLAGA (ESPAÑA)<br>
                    NIF: B56340656
                </p>
            </div>
            <div class="w-1/2 text-right">
                <h1 class="text-5xl font-bold text-gray-800 uppercase tracking-widest">Recibo</h1>
                <div class="mt-4">
                    <span class="text-gray-500">Recibo para Factura Nº:</span>
                    <strong class="text-gray-700">${escapeHTML(invoice.number)}</strong>
                </div>
                <div>
                    <span class="text-gray-500">Fecha de Emisión:</span>
                    <strong class="text-gray-700">${new Date().toISOString().slice(0, 10)}</strong>
                </div>
            </div>
        </header>

        <div class="grid grid-cols-2 gap-12 mb-12">
            <div>
                <h3 class="font-semibold text-gray-500 text-sm mb-2 uppercase tracking-wide">Recibido de:</h3>
                <p class="font-bold text-lg text-gray-800">${escapeHTML(invoice.client)}</p>
                <p class="text-gray-600">NIF/RUC: ${escapeHTML(invoice.nif) || ''}</p>
            </div>
            <div class="text-right">
                 <h3 class="font-semibold text-gray-500 text-sm mb-2 uppercase tracking-wide">Detalles del Pago:</h3>
                 <p class="text-gray-700"><span class="font-semibold">Método:</span> ${escapeHTML(invoice.paymentDetails.method)}</p>
                 <p class="text-gray-700"><span class="font-semibold">Fecha:</span> ${invoice.paymentDetails.date}</p>
                 ${invoice.paymentDetails.reference ? `<p class="text-gray-700"><span class="font-semibold">Referencia:</span> ${escapeHTML(invoice.paymentDetails.reference)}</p>` : ''}
            </div>
        </div>

        <div class="mb-12">
            <p class="text-lg">Se ha recibido la cantidad de <strong class="text-xl">${formatCurrency(invoice.total, invoice.currency)}</strong> en concepto de pago de la factura <strong class="text-lg">${escapeHTML(invoice.number)}</strong>.</p>
        </div>

        <div class="flex justify-between items-end mt-24">
            <div class="w-1/2">
                <p class="text-center text-gray-600 border-t pt-2">Firma y Sello</p>
            </div>
            <div class="w-1/2 text-right">
                <div class="bg-green-100 text-green-800 inline-block p-4 rounded-lg">
                    <p class="text-2xl font-bold">PAGADO</p>
                </div>
            </div>
        </div>
    </div>`;
    elements.invoiceViewerModal.classList.remove('hidden');
    elements.invoiceViewerModal.classList.add('flex');
}

export function hideInvoiceViewer() {
    elements.invoiceViewerModal.classList.add('hidden');
}

export function showPaymentDetailsModal(invoiceId) {
    if (elements.paymentDetailsForm) {
        elements.paymentDetailsForm.reset();
        const idInput = document.getElementById('payment-details-invoice-id');
        if (idInput) idInput.value = invoiceId;
        const dateInput = document.getElementById('payment-date');
        if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
    }
    elements.paymentDetailsModal.classList.remove('hidden');
    elements.paymentDetailsModal.classList.add('flex');
}

export function hidePaymentDetailsModal() {
    elements.paymentDetailsModal.classList.add('hidden');
    elements.paymentDetailsModal.classList.remove('flex');
}

export function printInvoice() {
    const printContent = document.getElementById('invoice-printable-area')?.innerHTML;
    if (!printContent) return;
    const printWindow = window.open('', '', 'height=800,width=800');
    printWindow.document.write(`
        <html>
            <head>
                <title>Factura</title>
                <script src="https://cdn.tailwindcss.com"><\/script>
                <style>
                    @media print {
                        @page {
                            size: A4 portrait;
                            margin: 1.6cm;
                        }
                        body {
                            -webkit-print-color-adjust: exact;
                        }
                    }
                </style>
            </head>
            <body>
                ${printContent}
            </body>
        </html>
    `);
    printWindow.document.close();
    
    printWindow.onload = function() {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    };
}

export function downloadInvoiceAsPDF() {
    const { jsPDF } = window.jspdf;
    const invoiceElement = document.getElementById('invoice-printable-area');
    if (!invoiceElement) return;
    
    const titleElement = elements.invoiceViewerModal.querySelector('h1');
    const isReceipt = titleElement && titleElement.textContent.toLowerCase() === 'recibo';
    const docNumberElement = invoiceElement.querySelector('strong');
    const docNumberText = docNumberElement ? docNumberElement.textContent : 'documento';
    const docType = isReceipt ? 'Recibo' : 'Factura';

    const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
    
    doc.html(invoiceElement, {
        callback: (doc) => {
            doc.save(`${docType}-${docNumberText.replace(/[^a-z0-9]/gi, '_')}.pdf`);
        },
        margin: [40, 0, 40, 0], 
        autoPaging: 'text',
        x: 0,
        y: 0,
        width: 595,
        windowWidth: 700
    });
}

export function exportReportAsXLSX() {
    const { activeReport } = getState();
    if (!activeReport || activeReport.data.length === 0) {
        showAlertModal('Sin Datos', 'No hay datos para exportar.');
        return;
    };
    const worksheet = XLSX.utils.aoa_to_sheet([activeReport.columns, ...activeReport.data]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");
    XLSX.writeFile(workbook, `${activeReport.title.replace(/ /g, '_')}.xlsx`);
}

export function exportReportAsPDF() {
    const { activeReport } = getState();
    if (!activeReport || activeReport.data.length === 0) {
        showAlertModal('Sin Datos', 'No hay datos para exportar.');
        return;
    };
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text(activeReport.title, 14, 16);
    doc.autoTable({
        head: [activeReport.columns],
        body: activeReport.data,
        startY: 20
    });
    doc.save(`${activeReport.title.replace(/ /g, '_')}.pdf`);
}

export function showSpinner() {
    elements.loadingOverlay.classList.remove('hidden');
    elements.loadingOverlay.classList.add('flex');
}

export function hideSpinner() {
    elements.loadingOverlay.classList.add('hidden');
    elements.loadingOverlay.classList.remove('flex');
}

export function updateConnectionStatus(status, message) {
    const { connectionStatus, statusIcon, statusText } = elements;
    if (!connectionStatus || !statusIcon || !statusText) return;
    connectionStatus.classList.remove('opacity-0');

    statusText.textContent = message;

    switch (status) {
        case 'loading':
            statusIcon.innerHTML = `<div class="w-3 h-3 border-2 border-t-transparent border-yellow-400 rounded-full animate-spin"></div>`;
            statusText.classList.remove('text-green-400', 'text-red-400');
            statusText.classList.add('text-yellow-400');
            break;
        case 'success':
            statusIcon.innerHTML = `<div class="w-3 h-3 bg-green-500 rounded-full"></div>`;
            statusText.classList.remove('text-yellow-400', 'text-red-400');
            statusText.classList.add('text-green-400');
            break;
        case 'error':
            statusIcon.innerHTML = `<div class="w-3 h-3 bg-red-500 rounded-full"></div>`;
            statusText.classList.remove('text-yellow-400', 'text-green-400');
            statusText.classList.add('text-red-400');
            break;
    }
    lucide.createIcons();
}

/**
 * Muestra u oculta los enlaces de navegación según los permisos del usuario.
 */
function updateNavLinksVisibility() {
    const { permissions } = getState();
    if (!permissions) return;

    // Mapeo de ID de enlace de navegación al permiso requerido.
    const navPermissionMap = {
        'nav-inicio': 'view_dashboard',
        'nav-cashflow': 'view_cashflow',
        'nav-iva': 'view_iva_control',
        'nav-cuentas': 'view_accounts',
        'nav-proformas': 'view_documents',
        'nav-reportes': 'view_reports',
        'nav-archivos': 'view_archives',
        'nav-facturacion': 'view_documents',
        'nav-inversiones': 'view_investments',
        'nav-clientes': 'view_clients',
        // El acceso a Ajustes se concede si el usuario puede gestionar CUALQUIER cosa.
        'nav-ajustes': ['manage_accounts', 'manage_categories', 'execute_balance_adjustment', 'execute_year_close', 'manage_fiscal_settings', 'manage_users'],
    };

    elements.navLinks.forEach(link => {
        const requiredPermission = navPermissionMap[link.id];
        if (!requiredPermission) return;

        let hasPermission = false;
        // Si el permiso es un array, el usuario necesita tener al menos UNO de ellos.
        if (Array.isArray(requiredPermission)) {
            hasPermission = requiredPermission.some(p => permissions[p]);
        } else {
            hasPermission = permissions[requiredPermission];
        }

        // El botón de logout no es un enlace de navegación de página, así que lo ignoramos aquí.
        if (link.id !== 'logout-btn') {
            link.classList.toggle('hidden', !hasPermission);
        }
    });
}
/**
 * Muestra u oculta elementos de acción (formularios, botones) según los permisos.
 */
function updateActionElementsVisibility() {
    const { permissions } = getState();
    if (!permissions) return;

    // --- Página de Cash Flow ---
    if (elements.transactionForm && elements.transactionForm.parentElement) {
        elements.transactionForm.parentElement.classList.toggle('hidden', !permissions.manage_cashflow);
    }
    if (elements.transferForm && elements.transferForm.parentElement) {
        elements.transferForm.parentElement.classList.toggle('hidden', !permissions.execute_transfers);
    }

    // --- Página de Proformas ---
    if (elements.proformaForm && elements.proformaForm.parentElement) {
        elements.proformaForm.parentElement.classList.toggle('hidden', !permissions.manage_proformas);
    }
    
    // --- Página de Facturación ---
    const createInvoiceTab = document.getElementById('facturacion-tab-crear');
    if (createInvoiceTab) {
        createInvoiceTab.classList.toggle('hidden', !permissions.manage_invoices);
    }
}

// --- Función Agregadora de Renderizado ---
export function renderAll() {
    const state = getState();
    if (!state || !state.accounts) return;

    updateNavLinksVisibility();
    updateActionElementsVisibility(); // Se llama aquí para centralizar la lógica de visibilidad.

    const visiblePage = Array.from(elements.pages).find(p => !p.classList.contains('hidden'));
    if (visiblePage) {
        const pageId = visiblePage.id.replace('page-', '');
        switch (pageId) {
            case 'inicio':
                renderInicioDashboard();
                break;
            case 'cashflow':
                renderTransactions();
                break;
            case 'cuentas':
                renderAccountsTab();
                renderBalanceLegendAndChart();
                break;
            case 'proformas':
                renderDocuments('Proforma', elements.proformasTableBody, 'proformas-search');
                break;
            case 'facturacion':
                renderDocuments('Factura', elements.facturasTableBody, 'facturas-search');
                const createInvoiceTab = document.getElementById('facturacion-content-crear');
                if (createInvoiceTab && !createInvoiceTab.classList.contains('hidden')) {
                    populateNextInvoiceNumber();
                }
                break;
            case 'clientes':
                renderClients();
                renderClientsChart();
                break;
            case 'inversiones':
                renderInvestments();
                break;
            case 'ajustes':
                renderSettings();
                break;
            case 'reportes':
                renderReport();
                break;
            case 'iva':
                renderIvaReport();
                break;
        }
    }
    
    populateSelects();
    lucide.createIcons();
}
