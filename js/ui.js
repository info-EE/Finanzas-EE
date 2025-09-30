// js/ui.js
import { formatCurrency, escapeHTML } from './utils.js';

export const elements = {
    sidebar: document.getElementById('sidebar'),
    mainContent: document.getElementById('main-content'),
    navLinks: document.querySelectorAll('.nav-link'),
    pages: document.querySelectorAll('.page-content'),
    transactionForm: document.getElementById('transaction-form'),
    transferForm: document.getElementById('transfer-form'),
    proformaForm: document.getElementById('proforma-form'),
    addAccountForm: document.getElementById('add-account-form'),
    updateBalanceForm: document.getElementById('update-balance-form'),
    reportForm: document.getElementById('report-form'),
    addIncomeCategoryForm: document.getElementById('add-income-category-form'),
    addExpenseCategoryForm: document.getElementById('add-expense-category-form'),
    addOperationTypeForm: document.getElementById('add-operation-type-form'),
    fiscalParamsForm: document.getElementById('fiscal-params-form'),
    aeatConfigForm: document.getElementById('aeat-config-form'),
    nuevaFacturaForm: document.getElementById('nueva-factura-form'),
    transactionsTableBody: document.getElementById('transactions-table-body'),
    proformasTableBody: document.getElementById('proformas-table-body'),
    facturasTableBody: document.getElementById('facturas-table-body'),
    settingsAccountsList: document.getElementById('settings-accounts-list'),
    incomeCategoriesList: document.getElementById('income-categories-list'),
    expenseCategoriesList: document.getElementById('expense-categories-list'),
    operationTypesList: document.getElementById('operation-types-list'),
    facturaOperationType: document.getElementById('factura-operation-type'),
    facturaCurrency: document.getElementById('factura-currency'),
    facturaIvaLabel: document.getElementById('factura-iva-label'),
    facturaAddItemBtn: document.getElementById('factura-add-item-btn'),
    facturaItemsContainer: document.getElementById('factura-items-container'),
    facturasSearch: document.getElementById('facturas-search'),
    pageProformas: document.getElementById('page-proformas'),
    closeInvoiceViewerBtn: document.getElementById('close-invoice-viewer-btn'),
    printInvoiceBtn: document.getElementById('print-invoice-btn'),
    pdfInvoiceBtn: document.getElementById('pdf-invoice-btn'),
    aeatToggleContainer: document.getElementById('aeat-toggle-container'),
    defaultFiltersContainer: document.getElementById('default-filters-container'),
    sociedadesFiltersContainer: document.getElementById('sociedades-filters-container'),
};

export function switchPage(pageId, app) {
    elements.pages.forEach(page => page.classList.toggle('hidden', page.id !== `page-${pageId}`));
    elements.navLinks.forEach(link => link.classList.toggle('active', link.id === `nav-${pageId}`));

    if (pageId === 'inicio') {
        setTimeout(() => renderInicioCharts(app), 50);
    }
}

export function updateAll(app) {
    renderTransactions(app.state);
    renderAccountsTab(app.state);
    renderBalanceLegendAndChart(app);
    updateInicioKPIs(app.state);
    renderInicioCharts(app);
    populateSelects(app.state);
    renderSettings(app);
    renderDocuments(app.state);
    renderFacturas(app.state);
    renderInvestments(app.state);
    renderArchives(app.state);
    app.saveData();
}

export function renderTransactions(state) {
    const tbody = elements.transactionsTableBody;
    tbody.innerHTML = '';
    const searchTerm = document.getElementById('cashflow-search').value.toLowerCase();
    const transactions = state.transactions.filter(t => 
        t.description.toLowerCase().includes(searchTerm) ||
        t.account.toLowerCase().includes(searchTerm) ||
        t.category.toLowerCase().includes(searchTerm)
    );

    if (transactions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-gray-500">No hay movimientos.</td></tr>`;
        return;
    }

    transactions.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(t => {
        const row = tbody.insertRow();
        const amountColor = t.type === 'Ingreso' ? 'text-green-400' : 'text-red-400';
        const sign = t.type === 'Ingreso' ? '+' : '-';
        row.innerHTML = `
            <td class="py-3 px-3">${t.date}</td>
            <td class="py-3 px-3">${escapeHTML(t.description)}</td>
            <td class="py-3 px-3">${escapeHTML(t.account)}</td>
            <td class="py-3 px-3">${escapeHTML(t.category)}</td>
            <td class="py-3 px-3">${escapeHTML(t.part)}</td>
            <td class="py-3 px-3 text-right font-medium ${amountColor}">${sign} ${formatCurrency(t.amount, t.currency)}</td>
            <td class="py-3 px-3"><div class="flex items-center justify-center gap-2">
                <button class="edit-btn p-2 text-blue-400 hover:text-blue-300" data-id="${t.id}" title="Editar"><i data-lucide="edit" class="w-4 h-4"></i></button>
                <button class="delete-btn p-2 text-red-400 hover:text-red-300" data-id="${t.id}" title="Eliminar"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div></td>`;
    });
    lucide.createIcons();
}

export function renderFacturas(state) {
    const tbody = elements.facturasTableBody;
    if (!tbody) return;
    const searchTerm = elements.facturasSearch.value.toLowerCase();
    const facturas = state.documents.filter(doc => doc.type === 'Factura' && (doc.number.toLowerCase().includes(searchTerm) || doc.client.toLowerCase().includes(searchTerm)));

    tbody.innerHTML = '';
    if (facturas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-gray-500">No se encontraron facturas.</td></tr>`;
        return;
    }

    facturas.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(f => {
        const row = tbody.insertRow();
        const statusClass = f.status === 'Pagada' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300';
        row.innerHTML = `
            <td class="py-2 px-3">${escapeHTML(f.number)}</td>
            <td class="py-2 px-3">${escapeHTML(f.client)}</td>
            <td class="py-2 px-3">${f.date}</td>
            <td class="py-2 px-3 text-right">${formatCurrency(f.total, f.currency)}</td>
            <td class="py-2 px-3 text-center"><button class="status-btn text-xs font-semibold px-2 py-1 rounded-full ${statusClass}" data-id="${f.id}">${f.status}</button></td>
            <td class="py-2 px-3"><div class="flex items-center justify-center gap-2">
                <button class="view-invoice-btn p-2 text-blue-400 hover:text-blue-300" data-id="${f.id}" title="Ver Factura"><i data-lucide="eye" class="w-4 h-4"></i></button>
                <button class="delete-doc-btn p-2 text-red-400 hover:text-red-300" data-id="${f.id}" title="Eliminar Factura"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div></td>`;
    });
    lucide.createIcons();
}

export function renderInicioCharts(app) {
    const ctx = document.getElementById('annualFlowChart')?.getContext('2d');
    if (!ctx) return;
    if (app.charts.annualFlowChart) {
        app.charts.annualFlowChart.destroy();
    }
    const currency = document.getElementById('inicio-chart-currency').value;
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const incomeData = Array(12).fill(0);
    const expenseData = Array(12).fill(0);

    app.state.transactions.filter(t => t.currency === currency).forEach(t => {
        const month = new Date(t.date).getMonth();
        if (t.type === 'Ingreso') incomeData[month] += t.amount;
        else expenseData[month] += t.amount;
    });

    app.charts.annualFlowChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [
                { label: `Ingresos`, data: incomeData, borderColor: 'rgba(59, 130, 246, 1)', tension: 0.4 },
                { label: `Egresos`, data: expenseData, borderColor: 'rgba(239, 68, 68, 1)', tension: 0.4 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}
// Agrega aquí el resto de funciones de UI que tenías en tu archivo original.
// Por ejemplo: renderAccountsTab, renderBalanceLegendAndChart, updateInicioKPIs,
// populateSelects, renderSettings, renderDocuments, renderInvestments, etc.