import { formatCurrency, escapeHTML } from './utils.js';
import { 
    CHART_COLOR_PALETTE,
    ESSENTIAL_INCOME_CATEGORIES, 
    ESSENTIAL_EXPENSE_CATEGORIES,
    ESSENTIAL_OPERATION_TYPES
} from './config.js';

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

// --- Component Creation Functions ---

/**
 * Creates a table row element for a single transaction.
 * @param {object} t - The transaction object.
 * @returns {HTMLTableRowElement} The created table row element.
 */
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

/**
 * Creates a card element for a single account.
 * @param {object} account - The account object.
 * @returns {HTMLDivElement} The created card element.
 */
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
        </div>
    `;
    return card;
}

/**
 * Creates a table row element for a single document (proforma or invoice).
 * @param {object} doc - The document object.
 * @returns {HTMLTableRowElement} The created table row element.
 */
function createDocumentRow(doc) {
    const row = document.createElement('tr');
    row.className = "border-b border-gray-800 hover:bg-gray-800/50";
    
    const statusClass = doc.status === 'Cobrada' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300';
    const isProforma = doc.type === 'Proforma';

    const actionsHtml = isProforma ? `
        <button class="delete-doc-btn p-2 text-red-400 hover:text-red-300" data-id="${doc.id}" title="Eliminar">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
    ` : `
        <button class="view-invoice-btn p-2 text-blue-400 hover:text-blue-300" data-id="${doc.id}" title="Ver Factura">
            <i data-lucide="eye" class="w-4 h-4"></i>
        </button>
        <button class="delete-doc-btn p-2 text-red-400 hover:text-red-300" data-id="${doc.id}" title="Eliminar">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
    `;

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
                ${actionsHtml}
            </div>
        </td>`;
    return row;
}

// --- Main UI Rendering Functions ---

export function switchPage(pageId, app) {
    elements.pages.forEach(page => page.classList.toggle('hidden', page.id !== `page-${pageId}`));
    elements.navLinks.forEach(link => link.classList.toggle('active', link.id === `nav-${pageId}`));
    
    if (pageId === 'cuentas') setTimeout(() => renderBalanceLegendAndChart(app), 0);
    if (pageId === 'inicio') setTimeout(() => renderInicioCharts(app), 50);
    if (pageId === 'facturacion') {
        app.switchFacturacionTab('crear');
        renderAeatSettings(app.state);
        if (elements.facturaItemsContainer.childElementCount === 0) {
            app.addFacturaItem();
        }
        app.handleOperationTypeChange();
    }
}

export function updateAll(app) {
    renderTransactions(app.state);
    renderAccountsTab(app.state);
    renderBalanceLegendAndChart(app);
    updateInicioKPIs(app.state);
    renderInicioCharts(app);
    populateSelects(app.state);
    populateClientSelectForInvoice(app.state);
    renderSettings(app.state);
    renderDocuments(app.state);
    renderFacturas(app.state);
    renderInvestments(app.state);
    renderClients(app.state);
    updateModuleVisibility();
    renderArchives(app.state);
    app.saveData();
}

export function renderTransactions(state) {
    const tbody = elements.transactionsTableBody;
    tbody.innerHTML = ''; 

    let operationalTransactions = state.transactions.filter(t => t.category !== 'Inversión' && !t.isInitialBalance);
    
    const searchTerm = document.getElementById('cashflow-search').value.toLowerCase();
    if (searchTerm) {
        operationalTransactions = operationalTransactions.filter(t => 
            t.description.toLowerCase().includes(searchTerm) ||
            t.account.toLowerCase().includes(searchTerm) ||
            t.category.toLowerCase().includes(searchTerm)
        );
    }
    
    if(operationalTransactions.length === 0){
        const row = tbody.insertRow();
        row.innerHTML = `<td colspan="7" class="text-center py-4 text-gray-500">No hay movimientos que coincidan con la búsqueda.</td>`;
    } else {
        const sortedTransactions = operationalTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        const rows = sortedTransactions.map(createTransactionRow);
        tbody.append(...rows);
    }
    lucide.createIcons();
}

export function renderAccountsTab(state) {
    const accountsGrid = document.getElementById('accounts-grid');
    accountsGrid.innerHTML = '';
    const cards = state.accounts.map(createAccountCard);
    accountsGrid.append(...cards);
    lucide.createIcons();
}

export function renderBalanceLegendAndChart(app) {
    const state = app.state;
    const totalsContainer = document.getElementById('balance-totals');
    const accounts = state.accounts;
    
    const totalEUR = accounts.filter(a => a.currency === 'EUR').reduce((sum, a) => sum + a.balance, 0);
    const totalUSD = accounts.filter(a => a.currency === 'USD').reduce((sum, a) => sum + a.balance, 0);
    totalsContainer.innerHTML = `
        <div><p class="text-gray-400 text-sm">Saldo Total en Euros</p><p class="text-2xl font-bold text-white">${formatCurrency(totalEUR, 'EUR')}</p></div>
        <div><p class="text-gray-400 text-sm">Saldo Total en Dólares</p><p class="text-2xl font-bold text-white">${formatCurrency(totalUSD, 'USD')}</p></div>
    `;
    renderSingleCurrencyChart(app, 'EUR', totalEUR);
    renderSingleCurrencyChart(app, 'USD', totalUSD);
}

export function renderSingleCurrencyChart(app, currency, totalBalance) {
    const state = app.state;
    const canvasId = currency === 'EUR' ? 'accountsBalanceChartEUR' : 'accountsBalanceChartUSD';
    const legendId = currency === 'EUR' ? 'balance-legend-eur' : 'balance-legend-usd';
    const containerId = currency === 'EUR' ? 'eur-chart-container' : 'usd-chart-container';

    const container = document.getElementById(containerId);
    const accounts = state.accounts.filter(a => a.currency === currency && a.balance > 0);
    
    if (accounts.length === 0) {
        container.classList.add('hidden');
        return;
    }
    container.classList.remove('hidden');

    const legendContainer = document.getElementById(legendId);
    const chartCtx = document.getElementById(canvasId)?.getContext('2d');
    if (!legendContainer || !chartCtx) return;
    
    if (app.charts[canvasId]) {
        app.charts[canvasId].destroy();
    }

    const backgroundColors = accounts.map((_, index) => CHART_COLOR_PALETTE[index % CHART_COLOR_PALETTE.length][0]);
    
    legendContainer.innerHTML = accounts.map((account, index) => {
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

    app.charts[canvasId] = new Chart(chartCtx, { 
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

export function updateInicioKPIs(state) {
    const totalEUR = state.accounts.filter(a => a.currency === 'EUR').reduce((s, a) => s + a.balance, 0);
    const totalUSD = state.accounts.filter(a => a.currency === 'USD').reduce((s, a) => s + a.balance, 0);
    document.getElementById('total-eur').textContent = formatCurrency(totalEUR, 'EUR');
    document.getElementById('total-usd').textContent = formatCurrency(totalUSD, 'USD');
}

export function renderInicioCharts(app) {
    const state = app.state;
    const annualCtx = document.getElementById('annualFlowChart')?.getContext('2d');
    if (!annualCtx) return;

    if (app.charts.annualFlowChart) app.charts.annualFlowChart.destroy();
    
    const selectedCurrency = document.getElementById('inicio-chart-currency').value;
    const currencySymbol = selectedCurrency === 'EUR' ? '€' : '$';
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const currentYear = new Date().getFullYear();
    const incomeData = Array(12).fill(0);
    const expenseData = Array(12).fill(0);

    state.transactions
        .filter(t => t.currency === selectedCurrency)
        .forEach(t => {
            const tDate = new Date(t.date);
            if (tDate.getFullYear() === currentYear) {
                const month = tDate.getMonth();
                if (t.type === 'Ingreso') incomeData[month] += t.amount;
                else if (t.type === 'Egreso') expenseData[month] += t.amount;
            }
        });
    const incomeGradient = annualCtx.createLinearGradient(0, 0, 0, 320);
    incomeGradient.addColorStop(0, 'rgba(59, 130, 246, 0.5)');
    incomeGradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
    const expenseGradient = annualCtx.createLinearGradient(0, 0, 0, 320);
    expenseGradient.addColorStop(0, 'rgba(239, 68, 68, 0.5)');
    expenseGradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
    app.charts.annualFlowChart = new Chart(annualCtx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [
                { label: `Ingresos (${currencySymbol})`, data: incomeData, borderColor: 'rgba(59, 130, 246, 1)', backgroundColor: incomeGradient, fill: true, tension: 0.4 },
                { label: `Egresos (${currencySymbol})`, data: expenseData, borderColor: 'rgba(239, 68, 68, 1)', backgroundColor: expenseGradient, fill: true, tension: 0.4 }
            ]
        },
        options: { 
            responsive: true, maintainAspectRatio: false, 
            scales: { 
                y: { 
                    beginAtZero: true,
                    ticks: { callback: value => currencySymbol + value.toLocaleString(selectedCurrency === 'EUR' ? 'de-DE' : 'en-US') }
                } 
            },
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

// ... (El resto de las funciones de UI, como populateSelects, renderSettings, etc., se refactorizarán de manera similar)
// --- El código restante de ui.js se mantiene igual por ahora, para un refactor progresivo ---

export function populateSelects(state) {
    const accounts = state.accounts;
    const optionsHtml = accounts.map(acc => `<option value="${escapeHTML(acc.name)}">${escapeHTML(acc.name)}</option>`).join('');
    
    const selects = ['transaction-account', 'transfer-from', 'transfer-to', 'update-account-select'];
    selects.forEach(id => {
        const select = document.getElementById(id);
        if (select) select.innerHTML = optionsHtml;
    });
    populateCategories(state);
    populateOperationTypesSelect(state);
    updateCurrencySymbol(state);
    updateTransferFormUI(state);
    populateReportAccounts(state);
}

export function populateCategories(state) {
    const typeSelect = document.getElementById('transaction-type');
    const categorySelect = document.getElementById('transaction-category');
    const currentType = typeSelect.value;
    const categories = currentType === 'Ingreso' ? state.incomeCategories : state.expenseCategories;
    categorySelect.innerHTML = categories.map(cat => `<option value="${escapeHTML(cat)}">${escapeHTML(cat)}</option>`).join('');
}

export function populateClientSelectForInvoice(state) {
    const select = elements.facturaSelectCliente;
    if (!select) return;
    const selectedValue = select.value;
    while (select.options.length > 1) {
        select.remove(1);
    }
    state.clients.forEach(client => {
        const option = document.createElement('option');
        option.value = client.id;
        option.textContent = client.name;
        select.appendChild(option);
    });
    select.value = selectedValue;
}

export function renderClients(state) {
    const tbody = elements.clientsTableBody;
    if (!tbody) return;
    tbody.innerHTML = '';
    const fragment = document.createDocumentFragment();

    if (state.clients.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-gray-500">No hay clientes registrados.</td></tr>`;
        return;
    }

    state.clients.forEach(client => {
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
            </td>
        `;
        fragment.appendChild(row);
    });
    tbody.appendChild(fragment);
    lucide.createIcons();
}

export function populateOperationTypesSelect(state) {
    const operationTypeSelect = elements.facturaOperationType;
    const types = state.invoiceOperationTypes;
    operationTypeSelect.innerHTML = types.map(type => `<option value="${escapeHTML(type)}">${escapeHTML(type)}</option>`).join('');
}

export function updateCurrencySymbol(state) {
    const accountSelect = document.getElementById('transaction-account');
    if (!accountSelect.value) return;
    const account = state.accounts.find(acc => acc.name === accountSelect.value);
    if (account) {
        document.getElementById('amount-currency-symbol').textContent = account.symbol;
    }
}

export function updateTransferFormUI(state) {
    if(!document.getElementById('transfer-from').value) return;
    const fromAccount = state.accounts.find(a => a.name === document.getElementById('transfer-from').value);
    const toAccount = state.accounts.find(a => a.name === document.getElementById('transfer-to').value);
    if (!fromAccount || !toAccount) return;

    document.getElementById('transfer-amount-currency-symbol').textContent = fromAccount.symbol;
    document.getElementById('transfer-fee-source-currency-symbol').textContent = fromAccount.symbol;
    document.getElementById('transfer-extra-currency-symbol').textContent = toAccount.symbol;

    const extraFieldLabel = document.getElementById('transfer-extra-label');
    const extraFieldInput = document.getElementById('transfer-extra-field');

    if (fromAccount.currency !== toAccount.currency) {
        extraFieldLabel.textContent = `Monto a Recibir (${toAccount.symbol})`;
        extraFieldInput.placeholder = "950.00";
        extraFieldInput.required = true;
    } else {
        extraFieldLabel.textContent = "Comisión Destino (Opcional)";
        extraFieldInput.placeholder = "1.00";
        extraFieldInput.required = false;
    }
}

export function populateReportAccounts(state) {
    const reportAccountSelect = document.getElementById('report-account');
    reportAccountSelect.innerHTML = '<option value="all">Todas las Cuentas</option>';
    reportAccountSelect.innerHTML += state.accounts.map(acc => `<option value="${escapeHTML(acc.name)}">${escapeHTML(acc.name)}</option>`).join('');
}

export function renderSettings(state) {
    const accountsList = elements.settingsAccountsList;
    const incomeList = elements.incomeCategoriesList;
    const expenseList = elements.expenseCategoriesList;
    const operationTypesList = elements.operationTypesList;

    const createSettingItem = (item, isAccount = false) => {
        const div = document.createElement('div');
        div.className = "flex items-center justify-between bg-gray-800/50 p-2 rounded";
        const logoHtml = isAccount ? (item.logoHtml || '') : '';
        const name = isAccount ? item.name : item;
        div.innerHTML = `
            <div class="flex items-center gap-2 text-sm">${logoHtml}<span>${escapeHTML(name)}</span></div>
            <button class="${isAccount ? 'delete-account-btn' : 'delete-category-btn'} p-1 text-red-400 hover:text-red-300" data-name="${escapeHTML(name)}"><i data-lucide="trash-2" class="w-4 h-4"></i></button>`;
        return div;
    };
    
    const createEssentialSettingItem = (item) => {
        const div = document.createElement('div');
        div.className = "flex items-center justify-between bg-gray-800/50 p-2 rounded text-sm";
        div.innerHTML = `<span>${escapeHTML(item)}</span><span class="p-1 text-gray-600 cursor-not-allowed" title="Categoría esencial no se puede eliminar"><i data-lucide="lock" class="w-4 h-4"></i></span>`;
        return div;
    };

    accountsList.innerHTML = '';
    accountsList.append(...state.accounts.map(acc => createSettingItem(acc, true)));

    const renderCategoryList = (listElement, categories, essentialCategories) => {
        listElement.innerHTML = '';
        const items = categories.map(cat => 
            essentialCategories.includes(cat) 
                ? createEssentialSettingItem(cat) 
                : createSettingItem(cat)
        );
        listElement.append(...items);
    };
    
    renderCategoryList(incomeList, state.incomeCategories, ESSENTIAL_INCOME_CATEGORIES);
    renderCategoryList(expenseList, state.expenseCategories, ESSENTIAL_EXPENSE_CATEGORIES);
    renderCategoryList(operationTypesList, state.invoiceOperationTypes, ESSENTIAL_OPERATION_TYPES);
    
    renderAeatSettings(state);
    renderFiscalParams(state);

    lucide.createIcons();
}

export function renderAeatSettings(state) {
    const facturacionModule = state.modules.find(m => m.id === 'facturacion');
    if (!elements.aeatSettingsCard) return;
    elements.aeatSettingsCard.classList.toggle('hidden', !facturacionModule || !facturacionModule.active);

    const container = elements.aeatToggleContainer;
    const isActive = state.settings.aeatModuleActive;
    const buttonHtml = isActive
        ? `<button class="aeat-toggle-btn bg-blue-600 text-white font-bold py-2 px-3 rounded-lg shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-colors text-xs flex items-center justify-center gap-1"><i data-lucide="check-circle" class="w-4 h-4"></i> Activado</button>`
        : `<button class="aeat-toggle-btn border border-blue-800 text-blue-400 font-bold py-2 px-3 rounded-lg hover:bg-blue-800/20 hover:text-blue-300 transition-colors text-xs">Activar</button>`;
    container.innerHTML = buttonHtml;
    lucide.createIcons();
}

export function renderDocuments(state) {
    const proformasTbody = elements.proformasTableBody;
    const proformasData = state.documents.filter(d => d.type === 'Proforma');
    const proformaSearchTerm = elements.pageProformas.querySelector('#proformas-search').value.toLowerCase();
    
    let filteredProformas = proformasData;
    if (proformaSearchTerm) {
        filteredProformas = proformasData.filter(d =>
            d.number.toLowerCase().includes(proformaSearchTerm) ||
            d.client.toLowerCase().includes(proformaSearchTerm)
        );
    }

    proformasTbody.innerHTML = '';
    if (filteredProformas.length === 0) {
        proformasTbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-gray-500">No hay proformas que coincidan.</td></tr>`;
    } else {
        const rows = filteredProformas.sort((a, b) => new Date(b.date) - new Date(a.date)).map(createDocumentRow);
        proformasTbody.append(...rows);
    }
    lucide.createIcons();
}

export function renderFacturas(state) {
    const facturasTbody = elements.facturasTableBody;
    const facturasData = state.documents.filter(d => d.type === 'Factura');
    const facturaSearchTerm = document.getElementById('facturas-search').value.toLowerCase();
    
    let filteredFacturas = facturasData;
    if (facturaSearchTerm) {
        filteredFacturas = facturasData.filter(d =>
            d.number.toLowerCase().includes(facturaSearchTerm) ||
            d.client.toLowerCase().includes(facturaSearchTerm)
        );
    }

    facturasTbody.innerHTML = '';
    if (filteredFacturas.length === 0) {
        facturasTbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-gray-500">No hay facturas que coincidan.</td></tr>`;
    } else {
        const rows = filteredFacturas.sort((a, b) => new Date(b.date) - new Date(a.date)).map(createDocumentRow);
        facturasTbody.append(...rows);
    }
    lucide.createIcons();
}

export function showInvoiceViewer(invoiceId, state) {
    // Esta función es muy compleja para refactorizar a creación de DOM en este paso.
    // Se mantiene con innerHTML por ahora para mantener la simplicidad del cambio actual.
    const invoice = state.documents.find(doc => doc.id === invoiceId);
    if (!invoice) return;

    const ivaRate = invoice.operationType.toLowerCase().includes('exportación') ? 0 : 0.21;
    const isExport = ivaRate === 0;

    let itemsHtml = invoice.items.map(item => `
        <tr class="border-b border-gray-700">
            <td class="py-2 px-4">${escapeHTML(item.description)}</td>
            <td class="py-2 px-4 text-right">${item.quantity.toFixed(2)}</td>
            <td class="py-2 px-4 text-right">${formatCurrency(item.price, invoice.currency)}</td>
            <td class="py-2 px-4 text-right">${formatCurrency(item.quantity * item.price, invoice.currency)}</td>
        </tr>
    `).join('');

    const invoiceHtml = `
    <div id="invoice-printable-area" class="p-8 bg-gray-900 text-white">
        <header class="flex justify-between items-start mb-10">
            <div class="w-1/2">
                <h2 class="text-2xl font-bold text-white mb-2">Europa Envíos</h2>
                <p class="font-semibold text-blue-300">LAMAQUINALOGISTICA, SOCIEDAD LIMITADA</p>
                <p class="text-gray-400 text-sm">
                    CALLE ESTEBAN SALAZAR CHAPELA, NUM 20, PUERTA 87, NAVE 87<br>
                    29004 MÁLAGA (ESPAÑA)<br>
                    NIF: 856340656<br>
                    Tel: (34) 633 74 08 31
                </p>
            </div>
            <div class="w-1/2 text-right">
                <h1 class="text-4xl font-bold text-white uppercase tracking-wider">Factura</h1>
                <div class="mt-2">
                    <span class="text-gray-400">N.º de factura:</span>
                    <span class="text-white font-semibold">${escapeHTML(invoice.number)}</span>
                </div>
                <div>
                    <span class="text-gray-400">Fecha:</span>
                    <span class="text-white font-semibold">${invoice.date}</span>
                </div>
            </div>
        </header>
        <div class="mb-10 p-4 border border-gray-700 rounded-lg bg-gray-800/50">
            <h3 class="font-semibold text-gray-300 mb-2">Facturar a:</h3>
            <p class="font-bold text-white">${escapeHTML(invoice.client)}</p>
            <p class="text-gray-400 text-sm whitespace-pre-line">
                ${escapeHTML(invoice.address) || ''}
                NIF/RUC: ${escapeHTML(invoice.nif) || ''}
                ${invoice.phone ? `Tel: ${escapeHTML(invoice.phone)}` : ''}
            </p>
        </div>
        <table class="w-full text-left mb-10">
            <thead>
                <tr class="bg-gray-800 text-gray-300">
                    <th class="py-2 px-4 rounded-l-lg">Descripción</th>
                    <th class="py-2 px-4 text-right">Cantidad</th>
                    <th class="py-2 px-4 text-right">Precio Unit.</th>
                    <th class="py-2 px-4 text-right rounded-r-lg">Total</th>
                </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
        </table>
        <div class="flex justify-between items-start">
            <div class="w-1/2 text-sm text-gray-400">
                <div class="mb-4">
                    <h4 class="font-semibold text-gray-300 mb-1">Forma de Pago:</h4>
                    <p>Transferencia Bancaria</p>
                </div>
                ${isExport ? `<div><h4 class="font-semibold text-gray-300 mb-1">Notas:</h4><p>Operación no sujeta a IVA por regla de localización: Ley 37/1992</p></div>` : ''}
            </div>
            <div class="w-1/2 max-w-xs space-y-2">
                <div class="flex justify-between"><span class="text-gray-400">Subtotal:</span><span class="text-white font-semibold">${formatCurrency(invoice.subtotal, invoice.currency)}</span></div>
                <div class="flex justify-between"><span class="text-gray-400">IVA (${(ivaRate * 100).toFixed(0)}%):</span><span class="text-white font-semibold">${formatCurrency(invoice.iva, invoice.currency)}</span></div>
                <div class="flex justify-between font-bold text-2xl border-t border-gray-600 pt-2 mt-2"><span class="text-white">TOTAL:</span><span class="text-blue-400">${formatCurrency(invoice.total, invoice.currency)}</span></div>
            </div>
        </div>
    </div>`;

    elements.invoiceContentArea.innerHTML = invoiceHtml;
    elements.invoiceViewerModal.classList.remove('hidden');
    elements.invoiceViewerModal.classList.add('flex');
    lucide.createIcons();
}

export function hideInvoiceViewer() {
    elements.invoiceViewerModal.classList.add('hidden');
    elements.invoiceViewerModal.classList.remove('flex');
    elements.invoiceContentArea.innerHTML = '';
}

export function printInvoice() {
    const printContent = elements.invoiceContentArea.innerHTML;
    const printWindow = window.open('', '', 'height=800,width=800');
    printWindow.document.write('<html><head><title>Factura</title>');
    printWindow.document.write('<link rel="stylesheet" href="style.css">');
    printWindow.document.write('<style>body { background-color: #111827; color: #d1d5db; } .card { background-color: #1f2937; } @media print { body { background-color: white; color: black; -webkit-print-color-adjust: exact; } .text-white, .text-gray-300, .text-gray-400, .text-blue-300, .text-blue-400 { color: black !important; } .bg-gray-800, .bg-gray-800\\/50, .bg-gray-900 { background-color: #f3f4f6 !important; } .border-gray-700 { border-color: #d1d5db !important; } .font-bold { font-weight: bold !important; } }</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(printContent);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 250);
}

export function downloadInvoiceAsPDF() {
    const { jsPDF } = window.jspdf;
    const invoiceElement = document.getElementById('invoice-printable-area');
    const originalBg = invoiceElement.style.backgroundColor;
    invoiceElement.style.backgroundColor = 'white';

    const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
    doc.html(invoiceElement, {
        callback: function (doc) {
            invoiceElement.style.backgroundColor = originalBg;
            doc.save('factura.pdf');
        },
        x: 0, y: 0, width: 595, windowWidth: 650
    });
}

export function updateModuleVisibility() { /* No longer needed */ }

export function renderArchives(state) {
    const yearSelect = document.getElementById('archive-year-select');
    const displayArea = document.getElementById('archive-display-area');
    const archiveYears = Object.keys(state.archivedData);

    if (archiveYears.length === 0) {
        yearSelect.innerHTML = '<option>No hay archivos</option>';
        displayArea.innerHTML = `<div class="text-center text-gray-500 py-10"><i data-lucide="archive" class="w-16 h-16 mx-auto mb-4"></i><p>Aún no se ha realizado ningún cierre anual.</p></div>`;
        lucide.createIcons();
    }
}

export function renderInvestments(state) {
    const investmentsTbody = document.getElementById('investments-table-body');
    const investmentsData = state.transactions.filter(t => t.category === 'Inversión');

    const totalInvestedEUR = investmentsData.filter(t => t.currency === 'EUR').reduce((sum, t) => sum + t.amount, 0);
    const totalInvestedUSD = investmentsData.filter(t => t.currency === 'USD').reduce((sum, t) => sum + t.amount, 0);

    document.getElementById('total-invested-eur').textContent = formatCurrency(totalInvestedEUR, 'EUR');
    document.getElementById('total-invested-usd').textContent = formatCurrency(totalInvestedUSD, 'USD');

    investmentsTbody.innerHTML = '';
    if (investmentsData.length === 0) {
        investmentsTbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-gray-500">No hay movimientos de inversión.</td></tr>`;
    } else {
        const fragment = document.createDocumentFragment();
        investmentsData.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(t => {
            const row = document.createElement('tr');
            row.className = "border-b border-gray-800 hover:bg-gray-800/50";
            row.innerHTML = `
                <td class="py-3 px-3">${t.date}</td>
                <td class="py-2 px-3">${escapeHTML(t.description)}</td>
                <td class="py-2 px-3">${escapeHTML(t.account)}</td>
                <td class="py-2 px-3 text-right">${formatCurrency(t.amount, t.currency)}</td>
            `;
            fragment.appendChild(row);
        });
        investmentsTbody.appendChild(fragment);
    }
}

export function renderFiscalParams(state) {
    const rateInput = document.getElementById('corporate-tax-rate');
    if (rateInput) {
        rateInput.value = state.settings.fiscalParameters.corporateTaxRate;
    }
}

