import { escapeHTML, formatCurrency } from './utils.js';
import { CHART_COLORS } from './config.js';

// --- Element Cache ---
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
    pageProformas: document.getElementById('page-proformas'),
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
};

export const charts = {
    accountsBalanceChartEUR: null,
    accountsBalanceChartUSD: null,
    annualFlowChart: null,
};


// --- Navigation ---

export function switchPage(pageId) {
    elements.pages.forEach(page => page.classList.toggle('hidden', page.id !== `page-${pageId}`));
    elements.navLinks.forEach(link => link.classList.toggle('active', link.id === `nav-${pageId}`));
    
    // Lazy rendering for charts
    if (pageId === 'cuentas') setTimeout(() => renderBalanceLegendAndChart(window.App.store.getState()), 0);
    if (pageId === 'inicio') setTimeout(() => renderInicioCharts(window.App.store.getState(), charts), 50);
}


// --- DOM Element Creators ---

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

function createDocumentRow(doc) {
    const row = document.createElement('tr');
    row.className = "border-b border-gray-800 hover:bg-gray-800/50";
    const statusClass = doc.status === 'Cobrada' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300';
    const isFactura = doc.type === 'Factura';

    row.innerHTML = `
        <td class="py-3 px-3">${doc.date}</td>
        <td class="py-2 px-3">${escapeHTML(doc.number)}</td>
        <td class="py-2 px-3">${escapeHTML(doc.client)}</td>
        <td class="py-2 px-3 text-right">${formatCurrency(doc.amount, doc.currency)}</td>
        <td class="py-2 px-3 text-center">
            <button class="status-btn text-xs font-semibold px-2 py-1 rounded-full ${statusClass}" data-id="${doc.id}">${doc.status}</button>
        </td>
        <td class="py-2 px-3">
            <div class="flex items-center justify-center gap-2">
                ${isFactura ? `
                <button class="view-invoice-btn p-2 text-blue-400 hover:text-blue-300" data-id="${doc.id}" title="Ver Factura">
                    <i data-lucide="eye" class="w-4 h-4"></i>
                </button>` : ''}
                <button class="delete-doc-btn p-2 text-red-400 hover:text-red-300" data-id="${doc.id}" title="Eliminar">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        </td>`;
    return row;
}

// --- Main Render Functions ---

function renderTransactions(state) {
    const tbody = elements.transactionsTableBody;
    tbody.innerHTML = '';
    const operationalTransactions = state.transactions.filter(t => t.category !== 'Inversión' && !t.isInitialBalance);
    if (operationalTransactions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-gray-500">No hay movimientos.</td></tr>`;
        return;
    }
    const fragment = document.createDocumentFragment();
    operationalTransactions
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .forEach(t => fragment.appendChild(createTransactionRow(t)));
    tbody.appendChild(fragment);
    lucide.createIcons();
}

function renderAccountsTab(state) {
    const grid = document.getElementById('accounts-grid');
    grid.innerHTML = '';
    const fragment = document.createDocumentFragment();
    state.accounts.forEach(account => fragment.appendChild(createAccountCard(account)));
    grid.appendChild(fragment);
    lucide.createIcons();
}

function renderClients(state) {
    const tbody = elements.clientsTableBody;
    tbody.innerHTML = '';
    if (state.clients.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-gray-500">No hay clientes registrados.</td></tr>`;
        return;
    }
    const fragment = document.createDocumentFragment();
    state.clients.forEach(client => fragment.appendChild(createClientRow(client)));
    tbody.appendChild(fragment);
    lucide.createIcons();
}

function renderDocuments(state, type, tbody, searchTerm) {
    tbody.innerHTML = '';
    const documents = state.documents.filter(d => d.type === type && (
        d.number.toLowerCase().includes(searchTerm) ||
        d.client.toLowerCase().includes(searchTerm)
    ));

    if (documents.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-gray-500">No hay ${type.toLowerCase()}s que coincidan.</td></tr>`;
        return;
    }
    const fragment = document.createDocumentFragment();
    documents
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .forEach(doc => fragment.appendChild(createDocumentRow(doc)));
    tbody.appendChild(fragment);
    lucide.createIcons();
}

function renderProformas(state) {
    const searchTerm = elements.pageProformas.querySelector('#proformas-search').value.toLowerCase();
    renderDocuments(state, 'Proforma', elements.proformasTableBody, searchTerm);
}

function renderFacturas(state) {
    const searchTerm = document.getElementById('facturas-search').value.toLowerCase();
    renderDocuments(state, 'Factura', elements.facturasTableBody, searchTerm);
}

// --- Chart Rendering ---

function renderBalanceLegendAndChart(state) {
    const totalsContainer = document.getElementById('balance-totals');
    const { accounts } = state;
    const totalEUR = accounts.filter(a => a.currency === 'EUR').reduce((sum, a) => sum + a.balance, 0);
    const totalUSD = accounts.filter(a => a.currency === 'USD').reduce((sum, a) => sum + a.balance, 0);
    totalsContainer.innerHTML = `
        <div><p class="text-gray-400 text-sm">Saldo Total en Euros</p><p class="text-2xl font-bold text-white">${formatCurrency(totalEUR, 'EUR')}</p></div>
        <div><p class="text-gray-400 text-sm">Saldo Total en Dólares</p><p class="text-2xl font-bold text-white">${formatCurrency(totalUSD, 'USD')}</p></div>
    `;
    renderSingleCurrencyChart(state, 'EUR', totalEUR, 'accountsBalanceChartEUR', 'balance-legend-eur', 'eur-chart-container');
    renderSingleCurrencyChart(state, 'USD', totalUSD, 'accountsBalanceChartUSD', 'balance-legend-usd', 'usd-chart-container');
}

function renderSingleCurrencyChart(state, currency, totalBalance, canvasId, legendId, containerId) {
    const container = document.getElementById(containerId);
    const legend = document.getElementById(legendId);
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    const accounts = state.accounts.filter(a => a.currency === currency && a.balance > 0);

    if (!container || !legend || !ctx || accounts.length === 0) {
        if (container) container.classList.add('hidden');
        return;
    }
    container.classList.remove('hidden');

    if (charts[canvasId]) charts[canvasId].destroy();

    const backgroundColors = accounts.map((_, index) => CHART_COLORS[index % CHART_COLORS.length]);
    
    legend.innerHTML = accounts.map((account, index) => `
        <div class="flex items-center justify-between py-2 text-sm border-b border-gray-800 last:border-b-0">
            <div class="flex items-center gap-3">
                <span class="w-3 h-3 rounded-full" style="background-color: ${backgroundColors[index]};"></span>
                <span>${escapeHTML(account.name)}</span>
            </div>
            <div class="text-right">
                <span class="font-semibold">${totalBalance > 0 ? ((account.balance / totalBalance) * 100).toFixed(1) : 0}%</span>
                <span class="text-xs text-gray-400 block">${formatCurrency(account.balance, account.currency)}</span>
            </div>
        </div>`).join('');

    charts[canvasId] = new Chart(ctx, { 
        type: 'doughnut', 
        data: { 
            labels: accounts.map(a => a.name), 
            datasets: [{ 
                data: accounts.map(a => a.balance), 
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

function renderInicioCharts(state, charts) {
    const annualCtx = document.getElementById('annualFlowChart')?.getContext('2d');
    if (!annualCtx) return;
    if (charts.annualFlowChart) charts.annualFlowChart.destroy();
    
    // El resto de la lógica del gráfico de inicio...
}

// --- Settings & Form Population ---

function populateSelect(element, options) {
    if (!element) return;
    element.innerHTML = options.map(o => `<option value="${escapeHTML(o.value)}">${escapeHTML(o.text)}</option>`).join('');
}

function populateAllSelects(state) {
    const accountOptions = state.accounts.map(acc => ({ value: acc.name, text: acc.name }));
    populateSelect(document.getElementById('transaction-account'), accountOptions);
    populateSelect(document.getElementById('transfer-from'), accountOptions);
    populateSelect(document.getElementById('transfer-to'), accountOptions);
    populateSelect(document.getElementById('update-account-select'), accountOptions);
    populateSelect(document.getElementById('report-account'), [{value: 'all', text: 'Todas las Cuentas'}, ...accountOptions]);
    populateSelect(elements.facturaSelectCliente, [{value: '', text: '-- Entrada Manual --'}, ...state.clients.map(c => ({value: c.id, text: c.name}))]);
    populateSelect(elements.facturaOperationType, state.invoiceOperationTypes.map(o => ({value: o, text: o})));
    populateCategories(state);
}

function populateCategories(state) {
    const type = document.getElementById('transaction-type').value;
    const categories = type === 'Ingreso' ? state.incomeCategories : state.expenseCategories;
    populateSelect(document.getElementById('transaction-category'), categories.map(c => ({value: c, text: c})));
}

function renderSettings(state) {
    const renderList = (container, items, isEssentialCheck = () => false) => {
        container.innerHTML = '';
        const fragment = document.createDocumentFragment();
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = "flex items-center justify-between bg-gray-800/50 p-2 rounded text-sm";
            const name = typeof item === 'object' ? item.name : item;
            const isEssential = isEssentialCheck(name);
            const deleteButton = isEssential
                ? `<span class="p-1 text-gray-600 cursor-not-allowed" title="Elemento esencial no se puede eliminar"><i data-lucide="lock" class="w-4 h-4"></i></span>`
                : `<button class="delete-category-btn p-1 text-red-400 hover:text-red-300" data-name="${escapeHTML(name)}"><i data-lucide="trash-2" class="w-4 h-4"></i></button>`;
            
            const logo = item.logoHtml ? `<div class="flex items-center gap-2 text-sm">${item.logoHtml}<span>${escapeHTML(name)}</span></div>` : `<span>${escapeHTML(name)}</span>`;
            
            div.innerHTML = `${logo} ${deleteButton}`;
            fragment.appendChild(div);
        });
        container.appendChild(fragment);
    };

    renderList(elements.settingsAccountsList, state.accounts, (name) => false); // Las cuentas no son "esenciales" en el mismo sentido
    renderList(elements.incomeCategoriesList, state.incomeCategories, (name) => state.essentialIncomeCategories?.includes(name));
    renderList(elements.expenseCategoriesList, state.expenseCategories, (name) => state.essentialExpenseCategories?.includes(name));
    renderList(elements.operationTypesList, state.invoiceOperationTypes, (name) => state.essentialOperationTypes?.includes(name));

    lucide.createIcons();
}

function updateInicioKPIs(state) {
    const totalEUR = state.accounts.filter(a => a.currency === 'EUR').reduce((s, a) => s + a.balance, 0);
    const totalUSD = state.accounts.filter(a => a.currency === 'USD').reduce((s, a) => s + a.balance, 0);
    document.getElementById('total-eur').textContent = formatCurrency(totalEUR, 'EUR');
    document.getElementById('total-usd').textContent = formatCurrency(totalUSD, 'USD');
}


// --- THE RENDER ALL FUNCTION ---
/**
 * La función principal que se llama cada vez que cambia el estado.
 * Se encarga de llamar a todas las demás funciones de renderizado.
 * **Esta es la función que debe ser exportada.**
 */
export function renderAll(state, charts) {
    // Renderizado de listas y tablas
    renderTransactions(state);
    renderAccountsTab(state);
    renderClients(state);
    renderProformas(state);
    renderFacturas(state);
    renderSettings(state);

    // Renderizado de KPIs y Gráficos
    updateInicioKPIs(state);
    renderBalanceLegendAndChart(state); 
    renderInicioCharts(state, charts); 

    // Actualización de formularios
    populateAllSelects(state);

    lucide.createIcons(); // Vuelve a inicializar los iconos
}

