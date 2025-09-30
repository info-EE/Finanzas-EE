import { getDefaultState } from './state.js';
import { escapeHTML, formatCurrency } from './utils.js';

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

export function switchPage(pageId, app) {
    elements.pages.forEach(page => page.classList.toggle('hidden', page.id !== `page-${pageId}`));
    elements.navLinks.forEach(link => link.classList.toggle('active', link.id === `nav-${pageId}`));
    
    if (pageId === 'cuentas') setTimeout(() => renderBalanceLegendAndChart(app.state), 0);
    if (pageId === 'inicio') setTimeout(() => renderInicioCharts(app.state, app.charts), 50);
    if (pageId === 'facturacion') {
        app.switchFacturacionTab('crear');
        renderAeatConfig(app.state);
        if (elements.facturaItemsContainer.childElementCount === 0) {
            app.addFacturaItem();
        }
        app.handleOperationTypeChange();
    }
}

export function updateAll(app) {
    renderTransactions(app.state);
    renderAccountsTab(app.state);
    renderBalanceLegendAndChart(app.state);
    updateInicioKPIs(app.state);
    renderInicioCharts(app.state, app.charts);
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


export function renderTransactions(state) {
    const tbody = elements.transactionsTableBody;
    const fragment = document.createDocumentFragment();
    let operationalTransactions = state.transactions.filter(t => t.category !== 'Inversión' && !t.isInitialBalance);
    
    const searchTerm = document.getElementById('cashflow-search').value.toLowerCase();
    if (searchTerm) {
        operationalTransactions = operationalTransactions.filter(t => 
            t.description.toLowerCase().includes(searchTerm) ||
            t.account.toLowerCase().includes(searchTerm) ||
            t.category.toLowerCase().includes(searchTerm)
        );
    }
    
    tbody.innerHTML = '';
    if(operationalTransactions.length === 0){
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="7" class="text-center py-4 text-gray-500">No hay movimientos que coincidan con la búsqueda.</td>`;
        fragment.appendChild(row);
    } else {
        operationalTransactions.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(t => {
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
            fragment.appendChild(row);
        });
    }
    tbody.appendChild(fragment);
    lucide.createIcons();
}

export function renderAccountsTab(state) {
    const accountsGrid = document.getElementById('accounts-grid');
    const fragment = document.createDocumentFragment();
    state.accounts.forEach(account => {
        const card = document.createElement('div');
        card.className = 'card p-6 rounded-xl flex flex-col';
        
        const headerDiv = document.createElement('div');
        headerDiv.className = 'flex justify-between items-start mb-2';
        
        const nameH3 = document.createElement('h3');
        nameH3.className = 'font-semibold text-lg';
        nameH3.textContent = account.name;
        
        const iconWrapper = document.createElement('div');
        iconWrapper.innerHTML = account.logoHtml ? account.logoHtml : `<i data-lucide="wallet" class="text-gray-500"></i>`;
        
        headerDiv.appendChild(nameH3);
        headerDiv.appendChild(iconWrapper);

        const bodyDiv = document.createElement('div');
        bodyDiv.className = 'mt-auto';
        
        const labelP = document.createElement('p');
        labelP.className = 'text-gray-400 text-sm';
        labelP.textContent = 'Saldo Actual';
        
        const balanceP = document.createElement('p');
        balanceP.className = 'text-4xl font-bold kpi-value mt-2';
        balanceP.textContent = formatCurrency(account.balance, account.currency);

        bodyDiv.appendChild(labelP);
        bodyDiv.appendChild(balanceP);

        card.appendChild(headerDiv);
        card.appendChild(bodyDiv);
        fragment.appendChild(card);
    });
    accountsGrid.innerHTML = '';
    accountsGrid.appendChild(fragment);
    lucide.createIcons();
}

export function renderBalanceLegendAndChart(state) {
    const totalsContainer = document.getElementById('balance-totals');
    const accounts = state.accounts;
    
    const totalEUR = accounts.filter(a => a.currency === 'EUR').reduce((sum, a) => sum + a.balance, 0);
    const totalUSD = accounts.filter(a => a.currency === 'USD').reduce((sum, a) => sum + a.balance, 0);
    totalsContainer.innerHTML = `
        <div><p class="text-gray-400 text-sm">Saldo Total en Euros</p><p class="text-2xl font-bold text-white">${formatCurrency(totalEUR, 'EUR')}</p></div>
        <div><p class="text-gray-400 text-sm">Saldo Total en Dólares</p><p class="text-2xl font-bold text-white">${formatCurrency(totalUSD, 'USD')}</p></div>
    `;
    renderSingleCurrencyChart(state, 'EUR', totalEUR, 'accountsBalanceChartEUR', 'balance-legend-eur', 'eur-chart-container');
    renderSingleCurrencyChart(state, 'USD', totalUSD, 'accountsBalanceChartUSD', 'balance-legend-usd', 'usd-chart-container');
}

export function renderSingleCurrencyChart(state, currency, totalBalance, canvasId, legendId, containerId) {
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
    
    const chartInstanceName = canvasId;
    if (charts[chartInstanceName]) {
        charts[chartInstanceName].destroy();
    }

    const colorPairs = [ ['#FFC3A0', '#FF7A85'], ['#D4A5A5', '#A5D4D4'], ['#CDB4DB', '#FFC8DD'], ['#A2D2FF', '#BDE0FE'], ['#FBC2EB', '#A6C1EE'], ['#FDDB6D', '#F1C40F'] ];
    const backgroundColors = [];
    
    accounts.forEach((account, index) => {
        backgroundColors.push(colorPairs[index % colorPairs.length][0]);
    });
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
    charts[chartInstanceName] = new Chart(chartCtx, { 
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

export function renderInicioCharts(state, charts) {
    const annualCtx = document.getElementById('annualFlowChart')?.getContext('2d');
    if (!annualCtx) return;

    if (charts.annualFlowChart) charts.annualFlowChart.destroy();
    
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
    charts.annualFlowChart = new Chart(annualCtx, {
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

    const accountFragment = document.createDocumentFragment();
    state.accounts.forEach(acc => {
        const div = document.createElement('div');
        div.className = "flex items-center justify-between bg-gray-800/50 p-2 rounded";
        div.innerHTML = `
            <div class="flex items-center gap-2 text-sm">${acc.logoHtml || ''}<span>${escapeHTML(acc.name)}</span></div>
            <button class="delete-account-btn p-1 text-red-400 hover:text-red-300" data-name="${escapeHTML(acc.name)}"><i data-lucide="trash-2" class="w-4 h-4"></i></button>`;
        accountFragment.appendChild(div);
    });
    accountsList.innerHTML = '';
    accountsList.appendChild(accountFragment);

    const renderCategoryList = (categories, essentialCategories) => {
        const fragment = document.createDocumentFragment();
        categories.forEach(cat => {
            const div = document.createElement('div');
            div.className = "flex items-center justify-between bg-gray-800/50 p-2 rounded text-sm";
            const isEssential = essentialCategories.includes(cat);
            const deleteButtonHtml = isEssential 
                ? `<span class="p-1 text-gray-600 cursor-not-allowed" title="Categoría esencial no se puede eliminar"><i data-lucide="lock" class="w-4 h-4"></i></span>`
                : `<button class="delete-category-btn p-1 text-red-400 hover:text-red-300" data-name="${escapeHTML(cat)}"><i data-lucide="trash-2" class="w-4 h-4"></i></button>`;
            div.innerHTML = `<span>${escapeHTML(cat)}</span> ${deleteButtonHtml}`;
            fragment.appendChild(div);
        });
        return fragment;
    };
    incomeList.innerHTML = '';
    incomeList.appendChild(renderCategoryList(state.incomeCategories, ['Transferencia', 'Comisiones', 'Ajuste de Saldo', 'Inversión', 'Otros Ingresos']));
    expenseList.innerHTML = '';
    expenseList.appendChild(renderCategoryList(state.expenseCategories, ['Transferencia', 'Comisiones', 'Ajuste de Saldo', 'Inversión', 'Otros Gastos']));

    operationTypesList.innerHTML = '';
    operationTypesList.appendChild(renderCategoryList(state.invoiceOperationTypes, ['Nacional / Intracomunitaria (UE)', 'Exportación (Fuera de la UE)']));

    
    renderAeatSettings(state);
    renderFiscalParams(state);

    lucide.createIcons();
}

export function renderAeatSettings(state) {
    const facturacionModule = state.modules.find(m => m.id === 'facturacion');
    elements.aeatSettingsCard.classList.toggle('hidden', !facturacionModule || !facturacionModule.active);

    const container = elements.aeatToggleContainer;
    const isActive = state.settings.aeatModuleActive;
    const buttonHtml = isActive
        ?
        `<button class="aeat-toggle-btn bg-blue-600 text-white font-bold py-2 px-3 rounded-lg shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-colors text-xs flex items-center justify-center gap-1">
                <i data-lucide="check-circle" class="w-4 h-4"></i> Activado
            </button>`
        : `<button class="aeat-toggle-btn border border-blue-800 text-blue-400 font-bold py-2 px-3 rounded-lg hover:bg-blue-800/20 hover:text-blue-300 transition-colors text-xs">
                Activar
            </button>`;
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
        const proformaFragment = document.createDocumentFragment();
        filteredProformas.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(p => {
            const row = document.createElement('tr');
            row.className = "border-b border-gray-800 hover:bg-gray-800/50";
            
            const statusClass = p.status === 'Cobrada' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300';
            row.innerHTML = `
                <td class="py-3 px-3">${p.date}</td>
                <td class="py-2 px-3">${escapeHTML(p.number)}</td>
                <td class="py-2 px-3">${escapeHTML(p.client)}</td>
                <td class="py-2 px-3 text-right">${formatCurrency(p.amount, p.currency)}</td>
                <td class="py-2 px-3 text-center">
                    <button class="status-btn text-xs font-semibold px-2 py-1 rounded-full ${statusClass}" data-id="${p.id}">${p.status}</button>
                </td>
                <td class="py-2 px-3">
                    <div class="flex items-center justify-center gap-2">
                    <button class="delete-doc-btn p-2 text-red-400 hover:text-red-300" data-id="${p.id}" title="Eliminar">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </td>`;
            proformaFragment.appendChild(row);
        });
        proformasTbody.appendChild(proformaFragment);
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
        const facturaFragment = document.createDocumentFragment();
        filteredFacturas.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(f => {
            const row = document.createElement('tr');
            row.className = "border-b border-gray-800 hover:bg-gray-800/50";
            
            const statusClass = f.status === 'Cobrada' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300';
            row.innerHTML = `
                <td class="py-3 px-3">${f.date}</td>
                <td class="py-2 px-3">${escapeHTML(f.number)}</td>
                <td class="py-2 px-3">${escapeHTML(f.client)}</td>
                <td class="py-2 px-3 text-right">${formatCurrency(f.amount, f.currency)}</td>
                <td class="py-2 px-3 text-center">
                    <button class="status-btn text-xs font-semibold px-2 py-1 rounded-full ${statusClass}" data-id="${f.id}">${f.status}</button>
                </td>
                <td class="py-2 px-3">
                    <div class="flex items-center justify-center gap-2">
                        <button class="view-invoice-btn p-2 text-blue-400 hover:text-blue-300" data-id="${f.id}" title="Ver Factura">
                            <i data-lucide="eye" class="w-4 h-4"></i>
                        </button>
                        <button class="delete-doc-btn p-2 text-red-400 hover:text-red-300" data-id="${f.id}" title="Eliminar">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </td>`;
            facturaFragment.appendChild(row);
        });
        facturasTbody.appendChild(facturaFragment);
    }
    lucide.createIcons();
}

export function showInvoiceViewer(invoiceId, state) {
    const invoice = state.documents.find(doc => doc.id === invoiceId);
    if (!invoice) {
        console.error('Factura no encontrada');
        return;
    }

    // El contenido visual principal se genera en printInvoice y downloadInvoiceAsPDF
    // Esta función ahora solo muestra el modal y un contenido base
    // El contenido real se genera al imprimir/descargar
    
    // Generamos una vista previa RÁPIDA con el tema oscuro,
    // la versión "formal" se genera al imprimir/descargar.
    const previewHtml = `
        <div id="invoice-printable-area" class="p-8 bg-gray-900 text-white">
            <div class="text-center">
                <h2 class="text-2xl font-bold mb-4">Previsualización de Factura</h2>
                <p class="text-gray-400">El diseño final se aplicará al imprimir o descargar como PDF.</p>
                <div class="mt-8 p-4 border border-gray-700 rounded-lg">
                    <p><strong>Cliente:</strong> ${escapeHTML(invoice.client)}</p>
                    <p><strong>Número:</strong> ${escapeHTML(invoice.number)}</p>
                    <p><strong>Total:</strong> ${formatCurrency(invoice.total, invoice.currency)}</p>
                </div>
            </div>
        </div>`;

    elements.invoiceContentArea.innerHTML = previewHtml;
    elements.invoiceViewerModal.classList.remove('hidden');
    elements.invoiceViewerModal.classList.add('flex');
}


export function hideInvoiceViewer() {
    elements.invoiceViewerModal.classList.add('hidden');
    elements.invoiceViewerModal.classList.remove('flex');
    elements.invoiceContentArea.innerHTML = '';
}

// --- FUNCIÓN MODIFICADA ---
export function printInvoice() {
    const invoiceId = elements.printInvoiceBtn.closest('.card').querySelector('.view-invoice-btn')?.dataset.id || document.querySelector('.view-invoice-btn[data-id]')?.dataset.id;
    const invoice = window.App.state.documents.find(doc => doc.id === invoiceId);
    if (!invoice) return;

    const logoBase64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIbGNtcwIQAABtbnRyUkdCIFhZWiAH4gADABQACQAOAB1hY3NwTVNGVAAAAABzYXdzY3RybAAAAAAAAAAAAAAAAAAAAAAA9tYAAQAAAADTLWhhbmSdkQA9QAAAAAAAABAAAAAAC1h0YWNoAAAAA2ZGVmIAAAAAAAAAAAAAAABjdXJ2AAAAAAAABAAAAAB0AAAA/4AAgAD/2AAwEDAAEAAQAAAAUACQABAAAAAQAAAAEAAAEyAAAABgAAAAcAAAASYwAAACAAAAAQAACvywAAAEwAAAAQAACvywAAvssAAM/LAAAAAwAAARwAAABkAAAAAAAAABZWAAEAAAABAAMABwAAAAEAAAEyAAAAFgABAAMAAAABAAEAAgAAAAEAAAEyAAAAFgABAAMAAAABAAUAAAARAAUAAAABAACgJgARAAUAAAABAACgLgARAAUAAAABAACgMgARAAUAAAABAACgOgARAAUAAAABAACgQgARAAUAAAABAACgSgARAAUAAAABAACgUgASAAUAAAABAAAAAAAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAF... ";
    
    // Generar el HTML de la factura usando el contenido de la ventana
    const printWindow = window.open('', '', 'height=800,width=800');
    const invoiceHTML = generatePrintableInvoiceHTML(invoice, logoBase64);
    
    printWindow.document.write(invoiceHTML);
    printWindow.document.close();
    
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 250);
}

// --- FUNCIÓN MODIFICADA ---
export function downloadInvoiceAsPDF() {
    const invoiceId = document.querySelector('.view-invoice-btn[data-id]')?.dataset.id || elements.printInvoiceBtn.closest('.card').querySelector('.view-invoice-btn')?.dataset.id;
    const invoice = window.App.state.documents.find(doc => doc.id === invoiceId);
    if (!invoice) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'pt',
        format: 'a4'
    });
    
    // Crear un div temporal y oculto para renderizar la versión clara
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    
    const logoBase64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIbGNtcwIQAABtbnRyUkdCIFhZWiAH4gADABQACQAOAB1hY3NwTVNGVAAAAABzYXdzY3RybAAAAAAAAAAAAAAAAAAAAAAA9tYAAQAAAADTLWhhbmSdkQA9QAAAAAAAABAAAAAAC1h0YWNoAAAAA2ZGVmIAAAAAAAAAAAAAAABjdXJ2AAAAAAAABAAAAAB0AAAA/4AAgAD/2AAwEDAAEAAQAAAAUACQABAAAAAQAAAAEAAAEyAAAABgAAAAcAAAASYwAAACAAAAAQAACvywAAAEwAAAAQAACvywAAvssAAM/LAAAAAwAAARwAAABkAAAAAAAAABZWAAEAAAABAAMABwAAAAEAAAEyAAAAFgABAAMAAAABAAEAAgAAAAEAAAEyAAAAFgABAAMAAAABAAUAAAARAAUAAAABAACgJgARAAUAAAABAACgLgARAAUAAAABAACgMgARAAUAAAABAACgOgARAAUAAAABAACgQgARAAUAAAABAACgSgARAAUAAAABAACgUgASAAUAAAABAAAAAAAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAF... ";
    
    // Obtener el HTML con los datos de la factura
    const invoiceHTML = generatePrintableInvoiceHTML(invoice, logoBase64);
    
    const printWindow = window.open('', '', 'height=800,width=800');
    printWindow.document.write(invoiceHTML);
    printWindow.document.close();
    
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500); // Se aumenta el timeout para dar tiempo a que las imágenes carguen
}


// --- FUNCIÓN MODIFICADA ---
export function downloadInvoiceAsPDF() {
    // Obtener la factura activa (se busca de una forma más robusta)
    const activeInvoiceBtn = document.querySelector('.view-invoice-btn[data-id]');
    if (!activeInvoiceBtn) {
        console.error("No se pudo encontrar la factura activa para generar el PDF.");
        return;
    }
    const invoiceId = activeInvoiceBtn.dataset.id;
    const invoice = window.App.state.documents.find(doc => doc.id === invoiceId);
    if (!invoice) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'pt',
        format: 'a4'
    });
    
    const logoBase64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIbGNtcwIQAABtbnRyUkdCIFhZWiAH4gADABQACQAOAB1hY3NwTVNGVAAAAABzYXdzY3RybAAAAAAAAAAAAAAAAAAAAAAA9tYAAQAAAADTLWhhbmSdkQA9QAAAAAAAABAAAAAAC1h0YWNoAAAAA2ZGVmIAAAAAAAAAAAAAAABjdXJ2AAAAAAAABAAAAAB0AAAA/4AAgAD/2AAwEDAAEAAQAAAAUACQABAAAAAQAAAAEAAAEyAAAABgAAAAcAAAASYwAAACAAAAAQAACvywAAAEwAAAAQAACvywAAvssAAM/LAAAAAwAAARwAAABkAAAAAAAAABZWAAEAAAABAAMABwAAAAEAAAEyAAAAFgABAAMAAAABAAEAAgAAAAEAAAEyAAAAFgABAAMAAAABAAUAAAARAAUAAAABAACgJgARAAUAAAABAACgLgARAAUAAAABAACgMgARAAUAAAABAACgOgARAAUAAAABAACgQgARAAUAAAABAACgSgARAAUAAAABAACgUgASAAUAAAABAAAAAAAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAAEAAAAFwAUABAAAAE... ";
    
    // Obtener el HTML con los datos de la factura
    const invoiceHTML = generatePrintableInvoiceHTML(invoice, logoBase64);
    
    // Crear un div temporal y oculto para renderizar la versión clara
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.innerHTML = invoiceHTML;
    document.body.appendChild(tempContainer);

    doc.html(tempContainer, {
        callback: function (doc) {
            document.body.removeChild(tempContainer); // Eliminar el div temporal
            doc.save(`Factura-${invoice.number}.pdf`);
        },
        x: 0,
        y: 0,
        width: 595, // Ancho de A4 en puntos
        windowWidth: 650 
    });
}


export function updateModuleVisibility() {
    // Esta función ya no es necesaria y puede ser eliminada o dejada en blanco.
}

export function renderArchives(state) {
    const yearSelect = document.getElementById('archive-year-select');
    const displayArea = document.getElementById('archive-display-area');
    const archiveYears = Object.keys(state.archivedData);

    if (archiveYears.length === 0) {
        yearSelect.innerHTML = '<option>No hay archivos</option>';
        displayArea.innerHTML = `<div class="text-center text-gray-500 py-10"><i data-lucide="archive" class="w-16 h-16 mx-auto mb-4"></i><p>Aún no se ha realizado ningún cierre anual.</p></div>`;
        lucide.createIcons();
        return;
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