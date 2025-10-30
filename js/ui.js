import { getState } from './store.js';
import { escapeHTML, formatCurrency, getCurrencySymbol } from './utils.js';
import { CHART_COLORS, ESSENTIAL_TAX_ID_TYPES } from './config.js';

// --- (FASE 1) Importar los controles ---
import { populateCategories, updateCurrencySymbol, populateSelects } from './ui/controls.js';
// --- (FASE 2) Importar los modales ---
import { showAlertModal, populateNextInvoiceNumber } from './ui/modals.js';
// --- (FASE 3) Importar los helpers ---
import { closeSidebar } from './ui/helpers.js';

// Re-export chart helpers from the new ui module (migrated)
export { charts, renderSingleCurrencyChart, resizeCharts };
import { charts, renderSingleCurrencyChart, resizeCharts } from './ui/charts.js';

// Centralizar selectores del DOM desde js/ui/elements.js
import { elements } from './ui/elements.js';
// Renderers
import { renderTransactions as renderTransactionsRenderer, createTransactionRow as createTransactionRowRenderer } from './ui/renderers/transactions.js';
// import { renderAccountsTab as renderAccountsTabRenderer } from './ui/renderers/accounts.js';
// import { renderDocuments as renderDocumentsRenderer } from './ui/renderers/documents.js';
// import { renderClients as renderClientsRenderer } from './ui/renderers/clients.js';
// import { renderInvestments as renderInvestmentsRenderer } from './ui/renderers/investments.js';
// import { renderInicioDashboard as renderInicioDashboardRenderer } from './ui/renderers/dashboard.js';

// --- Funciones Creadoras de Elementos ---

function createTransactionRow(t) {
    return createTransactionRowRenderer(t, getState());
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
    const { permissions, accounts } = getState(); // Necesitamos accounts
    // Añadir chequeos robustos
    if (!permissions || !accounts || accounts.length === 0 || !allAssets) {
         console.warn(`createInvestmentRow: Faltan datos (permisos, cuentas o activos) para transacción ${t.id}`);
         // Devolver fila indicando el problema
         return `
         <tr class="border-b border-gray-800 text-red-400">
             <td class="py-3 px-3">${t.date}</td>
             <td class="py-2 px-3 italic">Datos incompletos</td>
             <td class="py-2 px-3 italic">Cuenta no encontrada (ID: ${t.accountId})</td>
             <td class="py-2 px-3 text-right">-</td>
             <td class="py-2 px-3 text-center"></td>
         </tr>`;
    }

    const asset = allAssets.find(a => a.id === t.investmentAssetId);
    const assetName = asset ? asset.name : 'Activo Desconocido';

    // Buscar cuenta por accountId
    const account = accounts.find(acc => acc.id === t.accountId);
    // Usar valores por defecto si la cuenta no se encuentra
    const accountName = account ? account.name : `Cuenta Borrada (ID: ${t.accountId})`;
    const currency = account ? account.currency : 'EUR'; // Fallback a EUR

    const actionsHtml = permissions.manage_investments ? `
        <button class="delete-investment-btn p-2 text-red-400 hover:text-red-300" data-id="${t.id}" title="Eliminar Inversión">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>` : '';

    return `
        <tr class="border-b border-gray-800 hover:bg-gray-800/50">
            <td class="py-3 px-3">${t.date}</td>
            <td class="py-2 px-3">${escapeHTML(assetName)}</td>
            <td class="py-2 px-3">${escapeHTML(accountName)}</td>
            <td class="py-2 px-3 text-right">${formatCurrency(t.amount, currency)}</td>
            <td class="py-2 px-3 text-center">${actionsHtml}</td>
        </tr>`;
}

// --- Funciones de Renderizado Principales ---

function renderTransactions() {
    return renderTransactionsRenderer(getState());
}

function renderAccountsTab() {
    const { accounts } = getState();
    const accountsGrid = document.getElementById('accounts-grid');
    console.log('[renderAccountsTab] Rendering with accounts:', accounts); // Log para depuración
    if (!accountsGrid) return;
    accountsGrid.innerHTML = accounts.map(createAccountCard).join('');
    // Se mueve a renderAll()
}

function renderBalanceLegendAndChart() {
    const { accounts } = getState();
    const totalsContainer = document.getElementById('balance-totals');
    
    // CORRECCIÓN PROBLEMA 3: Añadir chequeo de !accounts
    if (!totalsContainer || !accounts || accounts.length === 0) {
        console.warn("renderBalanceLegendAndChart: Faltan datos (totalsContainer o accounts)");
        if (totalsContainer) totalsContainer.innerHTML = ''; // Limpiar si existe
        // Destruir gráficos si existen
        if (charts.accountsBalanceChartEUR) { charts.accountsBalanceChartEUR.destroy(); charts.accountsBalanceChartEUR = null; }
        if (charts.accountsBalanceChartUSD) { charts.accountsBalanceChartUSD.destroy(); charts.accountsBalanceChartUSD = null; }
        // Ocultar contenedores
        document.getElementById('eur-chart-container')?.classList.add('hidden');
        document.getElementById('usd-chart-container')?.classList.add('hidden');
        return;
    }
    
    console.log('[renderBalanceLegendAndChart] Rendering with accounts:', accounts); // Log para depuración

    const totalEUR = accounts.filter(a => a.currency === 'EUR').reduce((sum, a) => sum + a.balance, 0);
    const totalUSD = accounts.filter(a => a.currency === 'USD').reduce((sum, a) => sum + a.balance, 0);
    totalsContainer.innerHTML = `
        <div><p class="text-gray-400 text-sm">Saldo Total en Euros</p><p class="text-2xl font-bold text-white">${formatCurrency(totalEUR, 'EUR')}</p></div>
        <div><p class="text-gray-400 text-sm">Saldo Total en Dólares</p><p class="text-2xl font-bold text-white">${formatCurrency(totalUSD, 'USD')}</p></div>`;
    
    renderSingleCurrencyChart('EUR', totalEUR, 'accountsBalanceChartEUR', 'balance-legend-eur', 'eur-chart-container');
    renderSingleCurrencyChart('USD', totalUSD, 'accountsBalanceChartUSD', 'balance-legend-usd', 'usd-chart-container');
}

function updateInicioKPIs() {
    const { transactions, accounts } = getState();
    // Añadir chequeos más robustos
    if(!transactions || !accounts || accounts.length === 0) {
        console.warn("updateInicioKPIs: Faltan datos (transactions o accounts)");
        // Poner KPIs a 0 o 'N/A' si faltan datos
        ['kpi-monthly-income', 'kpi-monthly-expense', 'kpi-monthly-profit', 'kpi-total-balance'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = formatCurrency(0, 'EUR'); // Mostrar 0.00 € en lugar de N/A
        });
        return;
    }

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
            // *** SOLUCIÓN PROBLEMA 1 (ZONA HORARIA) ***
            const tDate = new Date(t.date + 'T00:00:00'); // Interpretar como local
            // Necesitamos buscar la moneda de la cuenta a través del ID
            const account = accounts.find(acc => acc.id === t.accountId);
            // Comprobar que la cuenta existe y coincide la moneda y el período, y la fecha es válida
            return account && account.currency === currency &&
                   t.date && !isNaN(tDate.getTime()) && // Chequeo fecha válida
                   tDate.getMonth() === currentMonth &&
                   tDate.getFullYear() === currentYear;
        })
        .forEach(t => {
            if (t.type === 'Ingreso') {
                monthlyIncome += t.amount;
            } else if (t.type === 'Egreso') {
                monthlyExpense += (t.amount + (t.iva || 0)); // Sumar IVA a los gastos
            }
        });

    const monthlyProfit = monthlyIncome - monthlyExpense;
    // Calcular saldo total solo de cuentas existentes en la moneda seleccionada
    const totalBalance = accounts
        .filter(a => a.currency === currency)
        .reduce((sum, a) => sum + a.balance, 0);

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
    const { transactions, accounts } = getState(); // Necesitamos accounts
    const annualCtx = document.getElementById('annualFlowChart')?.getContext('2d');
    // Añadir chequeos robustos
    if (!annualCtx || !transactions || !accounts || accounts.length === 0) {
        console.warn("renderAnnualFlowChart: Faltan datos (context, transactions o accounts)");
        // Opcional: limpiar gráfico si existía
        if (charts.annualFlowChart) {
            charts.annualFlowChart.destroy();
            charts.annualFlowChart = null;
        }
        // Opcional: mostrar mensaje en el canvas
        if (annualCtx) {
             annualCtx.clearRect(0, 0, annualCtx.canvas.width, annualCtx.canvas.height);
             annualCtx.fillStyle = '#6b7280'; annualCtx.textAlign = 'center';
             annualCtx.fillText("No hay datos para mostrar.", annualCtx.canvas.width / 2, annualCtx.canvas.height / 2);
        }
        return;
    }

    if (charts.annualFlowChart) charts.annualFlowChart.destroy();

    const currencySelect = document.getElementById('inicio-chart-currency');
    if (!currencySelect) return;
    const selectedCurrency = currencySelect.value;

    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const currentYear = new Date().getFullYear();
    const incomeData = Array(12).fill(0);
    const expenseData = Array(12).fill(0);

    transactions
        .filter(t => {
            // Filtrar por año y moneda usando el accountId
            const account = accounts.find(acc => acc.id === t.accountId);
            // *** SOLUCIÓN PROBLEMA 1 (ZONA HORARIA) ***
            const tDate = new Date(t.date + 'T00:00:00'); // Interpretar como local
            // Asegurarse que la cuenta existe y la fecha es válida
            return account && account.currency === selectedCurrency &&
                   t.date && !isNaN(tDate.getTime()) && 
                   tDate.getFullYear() === currentYear;
        })
        .forEach(t => {
            // *** SOLUCIÓN PROBLEMA 1 (ZONA HORARIA) ***
            const date = new Date(t.date + 'T00:00:00'); // Interpretar como local
            // Comprobar si la fecha es válida antes de getMonth()
            if (!isNaN(date.getTime())) {
                const month = date.getMonth();
                 // Asegurarse de que el mes está en el rango 0-11
                if (month >= 0 && month <= 11) {
                    if (t.type === 'Ingreso') {
                        incomeData[month] += t.amount;
                    } else if (t.type === 'Egreso') {
                        expenseData[month] += (t.amount + (t.iva || 0)); // Incluir IVA
                    }
                } else {
                    console.warn(`renderAnnualFlowChart: Mes inválido (${month}) encontrado en transacción ${t.id}: ${t.date}`);
                }
            } else {
                 console.warn(`renderAnnualFlowChart: Fecha inválida encontrada en transacción ${t.id}: ${t.date}`);
            }
        });

    // Configuración del gráfico (sin cambios)
    const incomeGradient = annualCtx.createLinearGradient(0, 0, 0, 320); incomeGradient.addColorStop(0, 'rgba(59, 130, 246, 0.5)'); incomeGradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
    const expenseGradient = annualCtx.createLinearGradient(0, 0, 0, 320); expenseGradient.addColorStop(0, 'rgba(239, 68, 68, 0.5)'); expenseGradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
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
    const { transactions, accounts } = getState(); // Necesitamos accounts
    const ctx = document.getElementById('expenseDistributionChart')?.getContext('2d');
    // Añadir chequeos robustos
    if (!ctx || !transactions || !accounts || accounts.length === 0) {
        console.warn("renderExpenseDistributionChart: Faltan datos (context, transactions o accounts)");
        if (charts.expenseDistributionChart) { // Limpiar gráfico si existe
            charts.expenseDistributionChart.destroy();
            charts.expenseDistributionChart = null;
        }
        if (ctx) { // Mostrar mensaje en canvas si no hay datos
             ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
             ctx.fillStyle = '#6b7280'; ctx.textAlign = 'center';
             ctx.fillText("No hay datos para mostrar.", ctx.canvas.width / 2, ctx.canvas.height / 2);
        }
        return;
    }

    const currencySelect = document.getElementById('inicio-chart-currency');
    if (!currencySelect) return;
    const currency = currencySelect.value;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const expenseByCategory = transactions
        .filter(t => {
            // Filtrar por tipo, moneda (usando accountId), mes y año
            const account = accounts.find(acc => acc.id === t.accountId);
            // *** SOLUCIÓN PROBLEMA 1 (ZONA HORARIA) ***
            const tDate = new Date(t.date + 'T00:00:00'); // Interpretar como local
            // Asegurarse que la cuenta existe y la fecha es válida
            return t.type === 'Egreso' && account && account.currency === currency &&
                   t.date && !isNaN(tDate.getTime()) && // Comprobar fecha válida
                   tDate.getMonth() === currentMonth &&
                   tDate.getFullYear() === currentYear;
        })
        .reduce((acc, t) => {
            // Asegurarse de que t.category existe
            const category = t.category || 'Sin Categoría';
            acc[category] = (acc[category] || 0) + (t.amount + (t.iva || 0)); // Incluir IVA
            return acc;
        }, {});

    const labels = Object.keys(expenseByCategory);
    const data = Object.values(expenseByCategory);

    if (charts.expenseDistributionChart) charts.expenseDistributionChart.destroy();

    // Si no hay datos, limpiar y salir (importante para evitar errores)
    if (labels.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); // Limpiar canvas
        ctx.fillStyle = '#6b7280'; ctx.textAlign = 'center'; // Mostrar mensaje
        ctx.fillText(`No hay gastos en ${currency} este mes.`, ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }

    // Configuración del gráfico (sin cambios)
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
    const { transactions, accounts } = getState(); // Necesitamos accounts
    const container = document.getElementById('recent-transactions-container');
    // Añadir chequeos robustos
    if (!container || !transactions || !accounts || accounts.length === 0) {
        if(container) container.innerHTML = `<p class="text-center text-gray-500 py-4">Cargando o no hay datos...</p>`;
        return;
    }

    const recent = transactions
        .filter(t => !t.isInitialBalance) // Excluir saldos iniciales
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);

    if (recent.length === 0) {
        container.innerHTML = `<p class="text-center text-gray-500 py-4">No hay movimientos recientes.</p>`;
        return;
    }

    // Usar map y filter para evitar errores si no se encuentra la cuenta
    const rowsHtmlArray = recent.map(t => {
        const isIncome = t.type === 'Ingreso';
        // Buscar nombre y moneda de la cuenta por accountId
        const account = accounts.find(acc => acc.id === t.accountId);
        // Si no se encuentra la cuenta, usar placeholders seguros
        const accountName = account ? account.name : `Cuenta Borrada (ID: ${t.accountId})`;
        const currency = account ? account.currency : 'EUR'; // Fallback a EUR
        return `
            <tr class="border-b border-gray-800 last:border-b-0">
                <td class="py-3 px-3">
                    <p class="font-medium">${escapeHTML(t.description)}</p>
                    <p class="text-xs text-gray-400">${t.date} - ${escapeHTML(accountName)}</p>
                </td>
                <td class="py-3 px-3 text-right font-semibold ${isIncome ? 'text-green-400' : 'text-red-400'}">
                    ${isIncome ? '+' : '-'} ${formatCurrency(t.amount, currency)}
                </td>
            </tr>
        `;
    }).filter(row => row !== null); // Filtrar resultados nulos si hubo error en map

    container.innerHTML = `
        <table class="w-full text-left">
            <tbody>
                ${rowsHtmlArray.join('')}
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
    const { transactions, investmentAssets, permissions, accounts } = getState(); // Necesitamos accounts
    const tbody = elements.investmentsTableBody;
    // Añadir chequeo de accounts y investmentAssets
    if (!tbody || !permissions || !accounts || accounts.length === 0 || !investmentAssets || !transactions) {
         console.warn("renderInvestments: Faltan datos.");
         if(tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-gray-500">Cargando datos o no hay cuentas/activos...</td></tr>`;
         // Ocultar formulario si no hay permisos
         const addInvestmentFormCard = elements.addInvestmentForm?.parentElement;
         if (addInvestmentFormCard && (!permissions || !permissions.manage_investments)) {
             addInvestmentFormCard.classList.add('hidden');
         }
         return;
    }

    // Ocultar formulario si no hay permiso
    const addInvestmentFormCard = elements.addInvestmentForm?.parentElement;
    if (addInvestmentFormCard) {
        addInvestmentFormCard.classList.toggle('hidden', !permissions.manage_investments);
    }

    const investmentsData = transactions.filter(t => t.category === 'Inversión');

    // Calcular totales por moneda usando accountId
    const totals = investmentsData.reduce((acc, t) => {
        // Buscar cuenta por ID
        const account = accounts.find(a => a.id === t.accountId);
        if (account) { // Asegurarse que la cuenta existe
            acc[account.currency] = (acc[account.currency] || 0) + t.amount;
        } else {
             console.warn(`renderInvestments: No se encontró cuenta con ID ${t.accountId} para transacción ${t.id}`);
        }
        return acc;
    }, {});

    // Mostrar totales
    const totalEurEl = document.getElementById('total-invested-eur');
    if (totalEurEl) totalEurEl.textContent = formatCurrency(totals['EUR'] || 0, 'EUR');
    const totalUsdEl = document.getElementById('total-invested-usd');
    if (totalUsdEl) totalUsdEl.textContent = formatCurrency(totals['USD'] || 0, 'USD');

    // Renderizar tabla
    if (investmentsData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-gray-500">No hay movimientos de inversión.</td></tr>`;
    } else {
        // Usar map y filter para manejar cuentas no encontradas
        const rowsHtmlArray = investmentsData
                       .sort((a, b) => new Date(b.date) - new Date(a.date))
                       .map(t => createInvestmentRow(t, investmentAssets)) // Ya usa accountId y maneja cuenta no encontrada
                       .filter(row => row !== ''); // Filtrar filas potencialmente vacías
        tbody.innerHTML = rowsHtmlArray.join('');
    }
    // Crear iconos para los botones de acción (si aplica)
    // Se mueve a renderAll()
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
    const { allUsers, permissions, currentUser } = getState();
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
                <button class="delete-account-btn p-1 text-red-400 hover:text-red-300" data-id="${acc.id}" data-name="${escapeHTML(acc.name)}"><i data-lucide="trash-2" class="w-4 h-4"></i></button>`;
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
    const { activeReport, accounts } = getState(); // Necesitamos accounts por si acaso (aunque los datos ya vienen preparados)
    // Añadir chequeos robustos
    if (!elements.reportDisplayArea || !accounts || accounts.length === 0) {
        console.warn("renderReport: Falta el área de display o no hay cuentas cargadas.");
        if(elements.reportDisplayArea) elements.reportDisplayArea.innerHTML = `<div class="text-center text-gray-500 flex flex-col items-center justify-center h-full"><i data-lucide="alert-circle" class="w-16 h-16 mb-4 text-yellow-500"></i><h3 class="font-semibold text-lg">Error al cargar</h3><p class="text-sm">No se pueden mostrar reportes sin datos de cuentas.</p></div>`;
        if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons(); // Crear icono de alerta
        return;
    }
    if (!activeReport || !activeReport.type || !activeReport.data || activeReport.data.length === 0) {
        elements.reportDisplayArea.innerHTML = `<div class="text-center text-gray-500 flex flex-col items-center justify-center h-full"><i data-lucide="file-search-2" class="w-16 h-16 mb-4"></i><h3 class="font-semibold text-lg">No hay datos para el reporte</h3><p class="text-sm">Pruebe con otros filtros o añada datos.</p></div>`;
        if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons(); // Crear icono
        return;
    }

    const { type, title, columns, data } = activeReport;

    // Lógica del footer para 'movimientos' (verificar uso de moneda)
    let footerHtml = '';
    if (type === 'movimientos') {
        const totals = {};
        const typeIndex = columns.indexOf("Tipo");
        const amountIndex = columns.indexOf("Monto");
        // Asegurarse de que la columna "Moneda" existe
        const currencyIndex = columns.indexOf("Moneda");

        if (typeIndex !== -1 && amountIndex !== -1 && currencyIndex !== -1) {
            data.forEach(row => {
                const type = row[typeIndex];
                 // Asegurarse de que el monto es numérico, si no, tratar como 0
                const amount = Number(row[amountIndex]);
                if (isNaN(amount)) {
                    console.warn(`renderReport (footer): Monto inválido encontrado: ${row[amountIndex]}`);
                    return; // Saltar esta fila si el monto no es válido
                }

                // Usar la moneda que viene en los datos del reporte
                const currency = row[currencyIndex];
                if (!totals[currency]) totals[currency] = 0;
                totals[currency] += (type === 'Ingreso' ? amount : -amount); // Simplificado
            });
        }

        const totalsContent = Object.keys(totals).map(currency => {
            const total = totals[currency];
            const colorClass = total >= 0 ? 'text-green-400' : 'text-red-400';
            return `<div class="font-bold ${colorClass}">${formatCurrency(total, currency)}</div>`;
        }).join('');

        if (Object.keys(totals).length > 0) {
            footerHtml = `<tfoot><tr class="border-t-2 border-gray-600"><td colspan="${columns.length - 2}" class="py-3 px-3 text-right font-semibold">TOTAL NETO:</td><td class="py-3 px-3 text-right" colspan="2">${totalsContent}</td></tr></tfoot>`;
        }
    }

    // Crear encabezado de tabla
    let tableHtml = `<table class="w-full text-left"><thead><tr class="border-b border-gray-700">`;
    columns.forEach(col => tableHtml += `<th class="py-2 px-3 text-sm font-semibold text-gray-400">${col}</th>`);
    tableHtml += `</tr></thead><tbody>`;

    // Crear filas de tabla (usar nombre de cuenta ya preparado en actions.js)
    data.forEach(row => {
        tableHtml += `<tr class="border-b border-gray-800">`;
        row.forEach((cell, index) => {
             // Asegurarse de que 'columns' y 'index' son válidos antes de usarlos
            if (!columns || index >= columns.length) {
                console.warn(`renderReport: Índice de columna (${index}) fuera de rango.`);
                tableHtml += `<td class="py-2 px-3 text-sm text-red-500">Error</td>`; // Indicar error en la celda
                return; // Saltar esta celda
            }
            const columnName = columns[index]; // Nombre de la columna actual
            const isNumeric = typeof cell === 'number' || (typeof cell === 'string' && cell.trim() !== '' && !isNaN(parseFloat(cell)));
            // Detectar columnas de monto (ampliado)
            const isAmountColumn = ["Monto", "Importe", "Importe (€)", "Pago a cuenta estimado", "Resultado Contable Acumulado", "Total Ingresos Computables", "Total Gastos Deducibles"].some(h => columnName.startsWith(h));
            let cellContent = cell;

            if (isAmountColumn && (typeof cell === 'number' || (typeof cell === 'string' && cell.trim() !== '' && !isNaN(parseFloat(cell))))) {
                 const amount = typeof cell === 'number' ? cell : parseFloat(cell);
                 // Usar la moneda que viene en los datos del reporte (si existe la columna)
                 const currencyColumnIndex = columns.indexOf("Moneda");
                 // Usar ?? para fallback seguro a 'EUR' si no hay moneda o es null/undefined
                 const currency = (type === 'sociedades' ? 'EUR' : (currencyColumnIndex !== -1 ? row[currencyColumnIndex] : 'EUR')) ?? 'EUR';
                 cellContent = formatCurrency(amount, currency);
                 // Añadir signo negativo para egresos en reporte de movimientos
                 const typeColumnIndex = columns.indexOf("Tipo");
                 if (type === 'movimientos' && columnName === "Monto" && typeColumnIndex !== -1 && row[typeColumnIndex] === 'Egreso') {
                    cellContent = `- ${cellContent}`;
                 }
            } else {
                 // Convertir undefined/null a cadena vacía antes de escapar
                 cellContent = escapeHTML(String(cell ?? ''));
            }

            tableHtml += `<td class="py-2 px-3 text-sm ${isNumeric || isAmountColumn ? 'text-right' : ''}">${cellContent}</td>`;
        });
        tableHtml += `</tr>`;
    });
    tableHtml += `</tbody>${footerHtml}</table>`;

    // Renderizar área de reporte con botón de descarga
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
    // Crear icono del botón de descarga
    // Se mueve a renderAll()
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
}

// --- (FASE 3) Funciones de Utilidad y Ayuda para la UI ---
// --- MOVIDAS a js/ui/helpers.js ---
// export function openSidebar() { ... }
// export function closeSidebar() { ... }
// export function exportReportAsXLSX() { ... }
// export function exportReportAsPDF() { ... }
// export function updateConnectionStatus(status, message) { ... }
// --- FIN (FASE 3) ---


function renderInicioDashboard() {
    updateInicioKPIs();
    renderAnnualFlowChart();
    renderExpenseDistributionChart();
    renderMainBalances();
    renderPendingInvoices();
    renderRecentTransactions();
}

export function switchPage(pageId, subpageId = null) {
    const { permissions } = getState();
    if (!permissions) { // CORRECCIÓN PROBLEMA 2 (de la sesión anterior): Salir si los permisos aún no se han cargado
        console.warn("[switchPage] Permissions not loaded yet.");
        return; 
    }

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
    } else {
        // Si no está en el mapa, es una página desconocida o sin protección
        console.warn(`[switchPage] No permission defined for pageId: ${pageId}. Denying access.`);
        hasPermission = false; // Denegar por defecto
    }

    // Si no tiene permiso, redirige a inicio y muestra un aviso.
    if (!hasPermission) {
        showAlertModal('Acceso Denegado', 'No tienes permiso para acceder a esta sección.');
        pageId = 'inicio'; // Forzamos la redirección a la página de inicio.
    }

    // Oculta todas las páginas y muestra solo la activa
    elements.pages.forEach(page => page.classList.toggle('hidden', page.id !== `page-${pageId}`));
    
    // CORRECCIÓN PROBLEMA 2 (de la sesión anterior): Actualiza el link activo en la navegación
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    const activeLink = document.getElementById(`nav-${pageId}`);
    if (activeLink) {
        activeLink.classList.add('active');
    } else {
        console.warn(`[switchPage] Could not find nav link with ID: nav-${pageId}`);
    }

    
    // Manejo de sub-páginas (como en facturación)
    if (pageId === 'facturacion') {
        if (!subpageId) {
            const activeTab = document.querySelector('.tab-button-inner.active');
            subpageId = activeTab ? activeTab.id.replace('facturacion-tab-', '') : 'crear';
            // Asegurarse de que el subpageId sea uno válido
            if (!['crear', 'listado', 'config'].includes(subpageId)) {
                subpageId = 'crear'; 
            }
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
        closeSidebar(); // (FASE 3) Esta función ahora se importa desde helpers.js
    }

    // Llama a la función principal de renderizado UNA SOLA VEZ después de cambiar la página.
    // Esto asegura que solo se renderice el contenido de la página visible.
    renderAll();
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
    // CORRECCIÓN PROBLEMA 3 (de la sesión anterior): Asegurar que el estado y las cuentas estén cargados
    if (!state || !state.accounts) {
        console.warn("[renderAll] Estado o cuentas no disponibles aún. Esperando...");
        return;
    }

    console.log("[renderAll] Starting render cycle with state:", state); // Log para depuración

    updateNavLinksVisibility();
    updateActionElementsVisibility(); // Se llama aquí para centralizar la lógica de visibilidad.

    const visiblePage = Array.from(elements.pages).find(p => !p.classList.contains('hidden'));
    if (visiblePage) {
        const pageId = visiblePage.id.replace('page-', '');
        console.log(`[renderAll] Rendering page: ${pageId}`); // Log para depuración
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
                { // Usar bloque para limitar el alcance de createInvoiceTab
                    const createInvoiceTab = document.getElementById('facturacion-content-crear');
                    if (createInvoiceTab && !createInvoiceTab.classList.contains('hidden')) {
                        // (FASE 2) Esta función ahora se importa desde modals.js
                        populateNextInvoiceNumber();
                    }
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
            default:
                 console.warn("[renderAll] Unknown page id:", pageId);
        }
    } else {
        console.warn("[renderAll] No visible page found to render.");
    }
    
    // (FASE 1) Esta función ahora se importa desde controls.js
    populateSelects();

    // CORRECCIÓN PROBLEMA 2 (de la sesión anterior): Mover la creación de iconos aquí
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        try {
            // Re-crear iconos solo en el contenido principal, que es lo que cambia
            const iconsToCreate = elements.mainContent.querySelectorAll('i[data-lucide]');
            if (iconsToCreate.length > 0) {
                // console.log(`[renderAll] Recreating ${iconsToCreate.length} Lucide icons.`); // Log opcional, puede ser ruidoso
                lucide.createIcons({ nodes: iconsToCreate });
            }
        } catch(error) {
            console.error("Error recreating Lucide icons in renderAll:", error);
        }
    }
}

