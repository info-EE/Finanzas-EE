import { getState } from './store.js';
import { escapeHTML, formatCurrency, getCurrencySymbol } from './utils.js';
import { CHART_COLORS } from './config.js';

// --- Almacenamiento de Referencias a Elementos del DOM y Gráficos ---

export const elements = {
    sidebar: document.getElementById('sidebar'),
    mainContent: document.getElementById('main-content'),
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
    settingsAccountsList: document.getElementById('settings-accounts-list'),
    incomeCategoriesList: document.getElementById('income-categories-list'),
    expenseCategoriesList: document.getElementById('expense-categories-list'),
    operationTypesList: document.getElementById('operation-types-list'),
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
};

const charts = {
    accountsBalanceChartEUR: null,
    accountsBalanceChartUSD: null,
    annualFlowChart: null,
};


// --- Funciones Creadoras de Elementos ---

function createTransactionRow(t) {
    const row = document.createElement('tr');
    row.className = 'border-b border-gray-800 hover:bg-gray-800/50 transition-colors';
    const amountColor = t.type === 'Ingreso' ? 'text-green-400' : 'text-red-400';
    const sign = t.type === 'Ingreso' ? '+' : '-';
    row.innerHTML = `
        <td class="py-3 px-3">${t.date}</td>
        <td class="py-3 px-3">${escapeHTML(t.description)}</td>
        <td class="py-3 px-3">${escapeHTML(t.account)}</td>
        <td class="py-3 px-3">${escapeHTML(t.category)}</td>
        <td class="py-3 px-3">${escapeHTML(t.part)}</td>
        <td class="py-3 px-3 text-right font-medium ${amountColor}">${sign} ${formatCurrency(t.amount, t.currency)}</td>
        <td class="py-3 px-3">
            <div class="flex items-center justify-center gap-2">
                <button class="edit-btn p-2 text-blue-400 hover:text-blue-300" data-id="${t.id}" title="Editar">
                    <i data-lucide="edit" class="w-4 h-4"></i>
                </button>
                <button class="delete-btn p-2 text-red-400 hover:text-red-300" data-id="${t.id}" title="Eliminar">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        </td>`;
    return row;
}

function createAccountCard(account) {
    const card = document.createElement('div');
    card.className = 'card p-6 rounded-xl flex flex-col';
    card.innerHTML = `
        <div class="flex justify-between items-start mb-2">
            <h3 class="font-semibold text-lg">${escapeHTML(account.name)}</h3>
            <div>${account.logoHtml || '<i data-lucide="wallet" class="text-gray-500"></i>'}</div>
        </div>
        <div class="mt-auto">
            <p class="text-gray-400 text-sm">Saldo Actual</p>
            <p class="text-4xl font-bold kpi-value mt-2">${formatCurrency(account.balance, account.currency)}</p>
        </div>`;
    return card;
}

function createDocumentRow(doc, type) {
    const row = document.createElement('tr');
    row.className = "border-b border-gray-800 hover:bg-gray-800/50";
    const statusClass = doc.status === 'Cobrada' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300';
    
    let actionsHtml = `
        <button class="delete-doc-btn p-2 text-red-400 hover:text-red-300" data-id="${doc.id}" title="Eliminar">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>`;

    if (type === 'Factura') {
        actionsHtml = `
        <button class="view-invoice-btn p-2 text-blue-400 hover:text-blue-300" data-id="${doc.id}" title="Ver Factura">
            <i data-lucide="eye" class="w-4 h-4"></i>
        </button>` + actionsHtml;
        
        if (doc.status === 'Cobrada') {
            actionsHtml = `
            <button class="generate-receipt-btn p-2 text-green-400 hover:text-green-300" data-id="${doc.id}" title="Generar Recibo">
                <i data-lucide="receipt" class="w-4 h-4"></i>
            </button>` + actionsHtml;
        }
    }

    row.innerHTML = `
        <td class="py-3 px-3">${doc.date}</td>
        <td class="py-2 px-3">${escapeHTML(doc.number)}</td>
        <td class="py-2 px-3">${escapeHTML(doc.client)}</td>
        <td class="py-2 px-3 text-right">${formatCurrency(doc.amount, doc.currency)}</td>
        <td class="py-2 px-3 text-center">
            <button class="status-btn text-xs font-semibold px-2 py-1 rounded-full ${statusClass}" data-id="${doc.id}">${doc.status}</button>
        </td>
        <td class="py-2 px-3">
            <div class="flex items-center justify-center gap-2">${actionsHtml}</div>
        </td>`;
    return row;
}

function createClientRow(client) {
    const row = document.createElement('tr');
    row.className = 'border-b border-gray-800 hover:bg-gray-800/50';
    row.innerHTML = `
        <td class="py-3 px-3">${escapeHTML(client.name)}</td>
        <td class="py-3 px-3">${escapeHTML(client.taxIdType)} ${escapeHTML(client.taxId)}</td>
        <td class="py-3 px-3">${escapeHTML(client.email)}</td>
        <td class="py-3 px-3">${escapeHTML(client.phoneMobilePrefix)}${escapeHTML(client.phoneMobile)}</td>
        <td class="py-3 px-3">
            <div class="flex items-center justify-center gap-2">
                <button class="edit-client-btn p-2 text-blue-400 hover:text-blue-300" data-id="${client.id}" title="Editar">
                    <i data-lucide="edit" class="w-4 h-4"></i>
                </button>
                <button class="delete-client-btn p-2 text-red-400 hover:text-red-300" data-id="${client.id}" title="Eliminar">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        </td>`;
    return row;
}

function createInvestmentRow(t) {
    const row = document.createElement('tr');
    row.className = "border-b border-gray-800 hover:bg-gray-800/50";
    row.innerHTML = `
        <td class="py-3 px-3">${t.date}</td>
        <td class="py-2 px-3">${escapeHTML(t.description)}</td>
        <td class="py-2 px-3">${escapeHTML(t.account)}</td>
        <td class="py-2 px-3 text-right">${formatCurrency(t.amount, t.currency)}</td>`;
    return row;
}

// --- Funciones de Renderizado Principales ---

function renderTransactions() {
    const { transactions } = getState();
    const tbody = elements.transactionsTableBody;
    tbody.innerHTML = '';
    const fragment = document.createDocumentFragment();
    
    let filteredTransactions = transactions.filter(t => t.category !== 'Inversión' && !t.isInitialBalance);
    const searchTerm = document.getElementById('cashflow-search').value.toLowerCase();
    if (searchTerm) {
        filteredTransactions = filteredTransactions.filter(t => 
            t.description.toLowerCase().includes(searchTerm) ||
            t.account.toLowerCase().includes(searchTerm) ||
            t.category.toLowerCase().includes(searchTerm)
        );
    }
    
    if (filteredTransactions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-gray-500">No hay movimientos.</td></tr>`;
    } else {
        filteredTransactions
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .forEach(t => fragment.appendChild(createTransactionRow(t)));
        tbody.appendChild(fragment);
    }
}

function renderAccountsTab() {
    const { accounts } = getState();
    const accountsGrid = document.getElementById('accounts-grid');
    accountsGrid.innerHTML = '';
    const fragment = document.createDocumentFragment();
    accounts.forEach(account => fragment.appendChild(createAccountCard(account)));
    accountsGrid.appendChild(fragment);
}

function renderBalanceLegendAndChart() {
    const { accounts } = getState();
    const totalsContainer = document.getElementById('balance-totals');
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
    const { accounts } = getState();
    const totalEUR = accounts.filter(a => a.currency === 'EUR').reduce((s, a) => s + a.balance, 0);
    const totalUSD = accounts.filter(a => a.currency === 'USD').reduce((s, a) => s + a.balance, 0);
    document.getElementById('total-eur').textContent = formatCurrency(totalEUR, 'EUR');
    document.getElementById('total-usd').textContent = formatCurrency(totalUSD, 'USD');
}

function renderInicioCharts() {
    const { transactions } = getState();
    const annualCtx = document.getElementById('annualFlowChart')?.getContext('2d');
    if (!annualCtx) return;

    if (charts.annualFlowChart) charts.annualFlowChart.destroy();
    
    const selectedCurrency = document.getElementById('inicio-chart-currency').value;
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

function renderDocuments(type, tableBody, searchInputId) {
    const { documents } = getState();
    const filteredDocs = documents.filter(d => d.type === type);
    const searchTerm = document.getElementById(searchInputId).value.toLowerCase();
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
        const fragment = document.createDocumentFragment();
        displayDocs.sort((a, b) => new Date(b.date) - new Date(a.date))
                   .forEach(doc => fragment.appendChild(createDocumentRow(doc, type)));
        tableBody.appendChild(fragment);
    }
}

function renderClients() {
    const { clients } = getState();
    const tbody = elements.clientsTableBody;
    tbody.innerHTML = '';
    
    if (clients.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-gray-500">No hay clientes registrados.</td></tr>`;
        return;
    }

    const fragment = document.createDocumentFragment();
    clients.forEach(client => fragment.appendChild(createClientRow(client)));
    tbody.appendChild(fragment);
}

function renderInvestments() {
    const { transactions } = getState();
    const investmentsData = transactions.filter(t => t.category === 'Inversión');
    const tbody = elements.investmentsTableBody;
    tbody.innerHTML = '';
    
    const totalInvestedEUR = investmentsData.filter(t => t.currency === 'EUR').reduce((sum, t) => sum + t.amount, 0);
    const totalInvestedUSD = investmentsData.filter(t => t.currency === 'USD').reduce((sum, t) => sum + t.amount, 0);
    document.getElementById('total-invested-eur').textContent = formatCurrency(totalInvestedEUR, 'EUR');
    document.getElementById('total-invested-usd').textContent = formatCurrency(totalInvestedUSD, 'USD');

    if (investmentsData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-gray-500">No hay movimientos de inversión.</td></tr>`;
    } else {
        const fragment = document.createDocumentFragment();
        investmentsData.sort((a, b) => new Date(b.date) - new Date(a.date))
                       .forEach(t => fragment.appendChild(createInvestmentRow(t)));
        tbody.appendChild(fragment);
    }
}

function renderSettings() {
    const { accounts, incomeCategories, expenseCategories, invoiceOperationTypes, settings } = getState();
    
    elements.settingsAccountsList.innerHTML = '';
    accounts.forEach(acc => {
        const div = document.createElement('div');
        div.className = "flex items-center justify-between bg-gray-800/50 p-2 rounded";
        div.innerHTML = `
            <div class="flex items-center gap-2 text-sm">${acc.logoHtml || ''}<span>${escapeHTML(acc.name)}</span></div>
            <button class="delete-account-btn p-1 text-red-400 hover:text-red-300" data-name="${escapeHTML(acc.name)}"><i data-lucide="trash-2" class="w-4 h-4"></i></button>`;
        elements.settingsAccountsList.appendChild(div);
    });

    const renderCategoryList = (listEl, categories, essentialCategories) => {
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
    renderCategoryList(elements.incomeCategoriesList, incomeCategories, []);
    renderCategoryList(elements.expenseCategoriesList, expenseCategories, []);
    renderCategoryList(elements.operationTypesList, invoiceOperationTypes, []);

    const isActive = settings.aeatModuleActive;
    elements.aeatToggleContainer.innerHTML = isActive
        ? `<button class="aeat-toggle-btn bg-blue-600 text-white font-bold py-2 px-3 rounded-lg"><i data-lucide="check-circle" class="w-4 h-4"></i> Activado</button>`
        : `<button class="aeat-toggle-btn border border-blue-800 text-blue-400 font-bold py-2 px-3 rounded-lg">Activar</button>`;
    
    elements.fiscalParamsForm.querySelector('#corporate-tax-rate').value = settings.fiscalParameters.corporateTaxRate;
}

function renderReport() {
    const { activeReport } = getState();
    if (!activeReport || !activeReport.type || activeReport.data.length === 0) {
        elements.reportDisplayArea.innerHTML = `<div class="text-center text-gray-500 flex flex-col items-center justify-center h-full"><i data-lucide="file-search-2" class="w-16 h-16 mb-4"></i><h3 class="font-semibold text-lg">No hay datos para el reporte</h3><p class="text-sm">Pruebe con otros filtros o añada datos.</p></div>`;
        lucide.createIcons();
        return;
    }

    const { title, columns, data } = activeReport;
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
    tableHtml += `</tbody></table>`;

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

// --- Funciones de Utilidad y Ayuda para la UI ---

function toggleIvaField() {
    const type = elements.transactionForm.querySelector('#transaction-type').value;
    if (type === 'Egreso') {
        elements.transactionIvaContainer.classList.remove('hidden');
    } else {
        elements.transactionIvaContainer.classList.add('hidden');
    }
}

export function switchPage(pageId, subpageId = null) {
    elements.pages.forEach(page => page.classList.toggle('hidden', page.id !== `page-${pageId}`));
    elements.navLinks.forEach(link => link.classList.toggle('active', link.id === `nav-${pageId}`));
    
    if (pageId === 'cuentas') renderBalanceLegendAndChart();
    if (pageId === 'inicio') renderInicioCharts();
    if (pageId === 'facturacion' && subpageId) {
        document.querySelectorAll('.tab-button-inner').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`facturacion-tab-${subpageId}`).classList.add('active');
        ['crear', 'listado', 'config'].forEach(id => {
            document.getElementById(`facturacion-content-${id}`).classList.toggle('hidden', id !== subpageId);
        });
    }

    renderAll();
    lucide.createIcons();
}

export function populateSelects() {
    const { accounts } = getState();
    const optionsHtml = accounts.map(acc => `<option value="${escapeHTML(acc.name)}">${escapeHTML(acc.name)}</option>`).join('');
    ['transaction-account', 'transfer-from', 'transfer-to', 'update-account-select'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.innerHTML = optionsHtml;
    });
    populateCategories();
    populateOperationTypesSelect();
    populateReportAccounts();
    populateClientSelectForInvoice();
}

export function populateCategories() {
    const { incomeCategories, expenseCategories } = getState();
    const type = elements.transactionForm.querySelector('#transaction-type').value;
    const categories = type === 'Ingreso' ? incomeCategories : expenseCategories;
    elements.transactionForm.querySelector('#transaction-category').innerHTML = categories.map(cat => `<option value="${escapeHTML(cat)}">${escapeHTML(cat)}</option>`).join('');
    toggleIvaField();
}

function populateOperationTypesSelect() {
    const { invoiceOperationTypes } = getState();
    if(elements.facturaOperationType) {
        elements.facturaOperationType.innerHTML = invoiceOperationTypes.map(type => `<option value="${escapeHTML(type)}">${escapeHTML(type)}</option>`).join('');
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
    if (!select) return;
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
    const accountName = elements.transactionForm.querySelector('#transaction-account').value;
    const account = accounts.find(acc => acc.name === accountName);
    if (account) {
        document.getElementById('amount-currency-symbol').textContent = getCurrencySymbol(account.currency);
        document.getElementById('iva-currency-symbol').textContent = getCurrencySymbol(account.currency);
    }
}

export function updateTransferFormUI() {
    const { accounts } = getState();
    const fromAccount = accounts.find(a => a.name === document.getElementById('transfer-from').value);
    const toAccount = accounts.find(a => a.name === document.getElementById('transfer-to').value);
    if (!fromAccount || !toAccount) return;

    document.getElementById('transfer-amount-currency-symbol').textContent = getCurrencySymbol(fromAccount.currency);
    document.getElementById('transfer-fee-source-currency-symbol').textContent = getCurrencySymbol(fromAccount.currency);
    document.getElementById('transfer-extra-currency-symbol').textContent = getCurrencySymbol(toAccount.currency);
    
    if (fromAccount.currency !== toAccount.currency) {
        document.getElementById('transfer-extra-label').textContent = `Monto a Recibir (${getCurrencySymbol(toAccount.currency)})`;
        document.getElementById('transfer-extra-field').required = true;
    } else {
        document.getElementById('transfer-extra-label').textContent = "Comisión Destino (Opcional)";
        document.getElementById('transfer-extra-field').required = false;
    }
}

export function resetTransactionForm() {
    elements.transactionForm.reset();
    elements.transactionForm.querySelector('#transaction-id').value = '';
    elements.transactionForm.querySelector('#transaction-iva').value = '';
    elements.transactionForm.querySelector('#form-title').textContent = 'Agregar Nuevo Movimiento';
    elements.transactionForm.querySelector('#form-submit-button-text').textContent = 'Guardar';
    elements.transactionForm.querySelector('#form-cancel-button').classList.add('hidden');
    document.getElementById('transaction-date').value = new Date().toISOString().slice(0, 10);
    populateCategories();
    updateCurrencySymbol();
}

export function showConfirmationModal(title, message, onConfirm) {
    const modal = document.getElementById('confirmation-modal');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;
    const confirmBtn = document.getElementById('modal-confirm-btn');
    
    const confirmHandler = () => {
        onConfirm();
        modal.classList.add('hidden');
        confirmBtn.removeEventListener('click', confirmHandler);
    };
    
    confirmBtn.onclick = confirmHandler;
    document.getElementById('modal-cancel-btn').onclick = () => modal.classList.add('hidden');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

export function showAlertModal(title, message) {
    const modal = document.getElementById('alert-modal');
    document.getElementById('alert-modal-title').textContent = title;
    document.getElementById('alert-modal-message').textContent = message;
    document.getElementById('alert-modal-ok-btn').onclick = () => modal.classList.add('hidden');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

export function showInvoiceViewer(invoiceId) {
    const { documents } = getState();
    const invoice = documents.find(doc => doc.id === invoiceId);
    if (!invoice) return;

    const itemsHtml = invoice.items.map(item => `
        <tr class="border-b border-gray-200">
            <td class="py-3 px-4">${escapeHTML(item.description)}</td>
            <td class="py-3 px-4 text-right">${item.quantity.toFixed(2)}</td>
            <td class="py-3 px-4 text-right">${formatCurrency(item.price, invoice.currency)}</td>
            <td class="py-3 px-4 text-right font-medium">${formatCurrency(item.quantity * item.price, invoice.currency)}</td>
        </tr>`).join('');

    elements.invoiceContentArea.innerHTML = `
    <div id="invoice-printable-area" style="padding: 40px;" class="bg-white text-gray-800 font-sans">
        <header class="flex justify-between items-start mb-12 pb-8 border-b">
            <div class="w-1/2">
                <div class="flex items-center gap-3 mb-4">
                    <svg class="h-10 w-10 text-blue-600" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
    if (!invoice || !invoice.paymentDetails) return;

    elements.invoiceContentArea.innerHTML = `
    <div id="invoice-printable-area" style="padding: 40px;" class="bg-white text-gray-800 font-sans">
        <header class="flex justify-between items-start mb-12 pb-8 border-b">
            <div class="w-1/2">
                <div class="flex items-center gap-3 mb-4">
                    <svg class="h-10 w-10 text-blue-600" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
    elements.paymentDetailsForm.reset();
    document.getElementById('payment-details-invoice-id').value = invoiceId;
    document.getElementById('payment-date').value = new Date().toISOString().slice(0, 10);
    elements.paymentDetailsModal.classList.remove('hidden');
    elements.paymentDetailsModal.classList.add('flex');
}

export function hidePaymentDetailsModal() {
    elements.paymentDetailsModal.classList.add('hidden');
    elements.paymentDetailsModal.classList.remove('flex');
}

export function printInvoice() {
    const printContent = document.getElementById('invoice-printable-area').innerHTML;
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
    
    // Hack para obtener el número de documento actual del título
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
        margin: [40, 0, 40, 0], // Se ajusta el margen para que el padding del HTML controle el espacio
        autoPaging: 'text',
        x: 0,
        y: 0,
        width: 595, // A4 width in points
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


// --- Función Agregadora de Renderizado ---
export function renderAll() {
    const state = getState();
    if (!state.accounts) return;

    updateInicioKPIs();
    renderTransactions();
    renderAccountsTab();
    renderDocuments('Proforma', elements.proformasTableBody, 'proformas-search');
    renderDocuments('Factura', elements.facturasTableBody, 'facturas-search');
    renderClients();
    renderInvestments();
    renderSettings();
    renderReport();
    populateSelects();

    lucide.createIcons();
}

