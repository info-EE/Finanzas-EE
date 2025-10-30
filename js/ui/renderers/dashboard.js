/**
 * Dashboard renderers (KPIs, charts aggregation, recent transactions)
 */
import { elements } from '../elements.js';
import { escapeHTML, formatCurrency, getCurrencySymbol } from '../../utils.js';
import { getState } from '../../store.js';
import { CHART_COLORS } from '../../config.js';
// Importar los charts para poder destruirlos y crearlos
import { charts } from '../charts.js';

/**
 * Calcula los ingresos y egresos totales para un mes/año/moneda específicos.
 * @param {Array} transactions - Array de todas las transacciones.
 * @param {Array} accounts - Array de todas las cuentas.
 * @param {string} currency - La moneda a filtrar ('EUR' o 'USD').
 * @param {number} month - El mes a filtrar (0-11).
 * @param {number} year - El año a filtrar.
 * @returns {object} - Un objeto { income: number, expense: number }.
 */
function calculateMonthlyTotals(transactions, accounts, currency, month, year) {
    // console.log(`[calculateMonthlyTotals] Iniciando cálculo para Mes=${month}, Año=${year}, Moneda=${currency}`);
    let monthlyIncome = 0;
    let monthlyExpense = 0;

    if (!transactions || !accounts) {
        console.warn("[calculateMonthlyTotals] Datos de transacciones o cuentas no proporcionados.");
        return { income: 0, expense: 0 };
    }

    transactions
        .filter(t => {
            if (!t.date || typeof t.date !== 'string') return false;
            // *** SOLUCIÓN PROBLEMA 1 (ZONA HORARIA) ***
            const tDate = new Date(t.date + 'T00:00:00'); // Interpretar como local
            if (isNaN(tDate.getTime())) return false;

            const account = accounts.find(acc => acc.id === t.accountId);
            if (!account) return false;

            const isCorrectCurrency = account.currency === currency;
            const transactionMonth = tDate.getMonth(); // Mes local
            const transactionYear = tDate.getFullYear(); // Año local
            const isCorrectMonth = transactionMonth === month; // Comparar con el mes pasado como argumento
            const isCorrectYear = transactionYear === year;   // Comparar con el año pasado como argumento

            return isCorrectCurrency && isCorrectMonth && isCorrectYear;
        })
        .forEach(t => {
            // Asegurarse que amount es un número antes de sumar
            const amount = typeof t.amount === 'number' ? t.amount : 0;
            const iva = typeof t.iva === 'number' ? t.iva : 0;
            if (t.type === 'Ingreso') {
                monthlyIncome += amount;
            } else if (t.type === 'Egreso') {
                monthlyExpense += (amount + iva);
            }
        });

    // console.log(`[calculateMonthlyTotals] Cálculo finalizado: Ingresos=${monthlyIncome}, Egresos=${monthlyExpense}`);
    return { income: monthlyIncome, expense: monthlyExpense };
}

// Calcula y actualiza los KPIs del dashboard en el DOM
export function updateInicioKPIs() {
    const currentState = getState();
    const { transactions, accounts } = currentState;

    const kpiIncomeEl = document.getElementById('kpi-monthly-income');
    const kpiExpenseEl = document.getElementById('kpi-monthly-expense');
    const kpiProfitEl = document.getElementById('kpi-monthly-profit');
    const kpiTotalBalanceEl = document.getElementById('kpi-total-balance');
    const currencySelect = document.getElementById('inicio-chart-currency');

    if (!kpiIncomeEl || !kpiExpenseEl || !kpiProfitEl || !kpiTotalBalanceEl || !currencySelect) {
        console.error("[updateInicioKPIs] Error crítico: Faltan elementos KPI o selector de moneda en el DOM.");
        return;
    }
    
    // Añadir chequeos más robustos
    if(!transactions || !accounts || accounts.length === 0) {
        console.warn("updateInicioKPIs: Faltan datos (transactions o accounts)");
        // Poner KPIs a 0
        const currency = currencySelect.value;
        kpiIncomeEl.textContent = formatCurrency(0, currency);
        kpiExpenseEl.textContent = formatCurrency(0, currency);
        kpiProfitEl.textContent = formatCurrency(0, currency);
        kpiTotalBalanceEl.textContent = formatCurrency(0, currency);
        kpiProfitEl.classList.remove('text-red-400');
        kpiProfitEl.classList.add('text-green-400'); // Default to green if 0
        return;
    }

    const currency = currencySelect.value;
    let monthlyProfit = 0;
    let totalBalance = 0;

    // Calcular Saldo Total (siempre que haya cuentas)
    totalBalance = accounts.filter(a => a.currency === currency).reduce((sum, a) => sum + a.balance, 0);

    // Calcular Ingresos/Egresos usando la función aislada
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // console.log('[updateInicioKPIs] Llamando a calculateMonthlyTotals...');
    const totals = calculateMonthlyTotals(transactions, accounts, currency, currentMonth, currentYear);
    // console.log('[updateInicioKPIs] Resultado de calculateMonthlyTotals:', totals);

    const monthlyIncome = totals.income;
    const monthlyExpense = totals.expense;
    monthlyProfit = monthlyIncome - monthlyExpense;

    // Actualizar DOM
    // console.log(`[updateInicioKPIs] Actualizando DOM con: Ingresos=${monthlyIncome}, Egresos=${monthlyExpense}, Beneficio=${monthlyProfit}, Saldo=${totalBalance}`);
    kpiIncomeEl.textContent = formatCurrency(monthlyIncome, currency);
    kpiExpenseEl.textContent = formatCurrency(monthlyExpense, currency);
    kpiProfitEl.textContent = formatCurrency(monthlyProfit, currency);
    kpiProfitEl.classList.remove('text-green-400', 'text-red-400');
    kpiProfitEl.classList.add(monthlyProfit >= 0 ? 'text-green-400' : 'text-red-400');
    kpiTotalBalanceEl.textContent = formatCurrency(totalBalance, currency);
}


export function renderAnnualFlowChart() {
    const currentState = getState();
    const { transactions, accounts } = currentState;
    const annualCtx = document.getElementById('annualFlowChart')?.getContext('2d');

    if (charts && charts.annualFlowChart) {
        try { charts.annualFlowChart.destroy(); } catch(e){}
        charts.annualFlowChart = null;
    }

    if (!annualCtx || !transactions || !accounts || accounts.length === 0) {
        if (annualCtx) {
             annualCtx.clearRect(0,0,annualCtx.canvas.width, annualCtx.canvas.height);
             annualCtx.fillStyle='#6b7280'; annualCtx.textAlign='center';
             annualCtx.fillText('No hay datos para mostrar.', annualCtx.canvas.width/2, annualCtx.canvas.height/2);
        }
        return;
    }

    const currencySelect = document.getElementById('inicio-chart-currency');
    if (!currencySelect) return;
    const selectedCurrency = currencySelect.value;

    const months = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    const currentYear = new Date().getFullYear(); // Año local
    const incomeData = Array(12).fill(0);
    const expenseData = Array(12).fill(0);

    transactions.filter(t => {
        const account = accounts.find(acc => acc.id === t.accountId);
        if (!t.date || !account || typeof t.date !== 'string') return false;
        const tDate = new Date(t.date + 'T00:00:00'); // Interpretar fecha como local
        // Asegurarse que tDate es válida antes de llamar a getFullYear
        return account.currency === selectedCurrency && !isNaN(tDate.getTime()) && tDate.getFullYear() === currentYear; // Usar local
    }).forEach(t => {
        const date = new Date(t.date + 'T00:00:00'); // Interpretar fecha como local
        if (!isNaN(date.getTime())) {
            const month = date.getMonth(); // Usar local
            if (month >=0 && month <=11) {
                // Asegurar que amount e iva son números
                const amount = typeof t.amount === 'number' ? t.amount : 0;
                const iva = typeof t.iva === 'number' ? t.iva : 0;
                if (t.type === 'Ingreso') incomeData[month] += amount;
                else if (t.type === 'Egreso') expenseData[month] += (amount + iva);
            }
        }
    });


    const incomeGradient = annualCtx.createLinearGradient(0,0,0,320); incomeGradient.addColorStop(0,'rgba(59,130,246,0.5)'); incomeGradient.addColorStop(1,'rgba(59,130,246,0)');
    const expenseGradient = annualCtx.createLinearGradient(0,0,0,320); expenseGradient.addColorStop(0,'rgba(239,68,68,0.5)'); expenseGradient.addColorStop(1,'rgba(239,68,68,0)');

    charts.annualFlowChart = new Chart(annualCtx, {
        type: 'line',
        data: { labels: months, datasets: [ { label: `Ingresos (${getCurrencySymbol(selectedCurrency)})`, data: incomeData, borderColor: 'rgba(59,130,246,1)', backgroundColor: incomeGradient, fill:true, tension:0.4 }, { label: `Egresos (${getCurrencySymbol(selectedCurrency)})`, data: expenseData, borderColor: 'rgba(239,68,68,1)', backgroundColor: expenseGradient, fill:true, tension:0.4 } ] },
        options: { responsive:true, maintainAspectRatio:false, scales:{ y:{ beginAtZero:true } }, plugins:{ legend:{ position:'bottom' } } }
    });
}


export function renderExpenseDistributionChart() {
    const currentState = getState();
    const { transactions, accounts } = currentState;
    const ctx = document.getElementById('expenseDistributionChart')?.getContext('2d');

    if (charts && charts.expenseDistributionChart) {
        try { charts.expenseDistributionChart.destroy(); } catch(e){}
        charts.expenseDistributionChart = null;
    }

    if (!ctx || !transactions || !accounts || accounts.length === 0) {
        if (ctx) {
            ctx.clearRect(0,0,ctx.canvas.width, ctx.canvas.height);
            ctx.fillStyle = '#6b7280'; ctx.textAlign='center';
            ctx.fillText('No hay datos para mostrar.', ctx.canvas.width/2, ctx.canvas.height/2);
        }
        return;
    }

    const currencySelect = document.getElementById('inicio-chart-currency');
    if (!currencySelect) return;
    const currency = currencySelect.value;

    const now = new Date(); // Fecha local
    const currentMonth = now.getMonth(); // Mes local
    const currentYear = now.getFullYear(); // Año local

    const expenseByCategory = transactions.filter(t => {
        const account = accounts.find(acc => acc.id === t.accountId);
        if(!t.date || !account || typeof t.date !== 'string') return false;
        const tDate = new Date(t.date + 'T00:00:00'); // Interpretar fecha como local
        // Asegurarse que tDate es válida antes de llamar a getMonth/getFullYear
        return t.type === 'Egreso' && account.currency === currency && !isNaN(tDate.getTime()) && tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear; // Usar local
    }).reduce((acc, t) => {
        const category = t.category || 'Sin Categoría';
        // Asegurar que amount e iva son números
        const amount = typeof t.amount === 'number' ? t.amount : 0;
        const iva = typeof t.iva === 'number' ? t.iva : 0;
        acc[category] = (acc[category] || 0) + (amount + iva);
        return acc;
     }, {});


    const labels = Object.keys(expenseByCategory);
    const data = Object.values(expenseByCategory);

    if (labels.length === 0) {
        ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
        ctx.fillStyle = '#6b7280'; ctx.textAlign='center'; ctx.fillText(`No hay gastos en ${currency} este mes.`, ctx.canvas.width/2, ctx.canvas.height/2);
        return;
    }

    const chartColors = typeof CHART_COLORS !== 'undefined' ? CHART_COLORS : ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];

    charts.expenseDistributionChart = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: labels, datasets: [{ data: data, backgroundColor: chartColors, borderColor: '#0a0a0a', borderWidth:5, borderRadius:10 }] },
        options: { responsive:true, maintainAspectRatio:false, cutout: '70%', plugins:{ legend:{ position:'bottom', labels:{ color:'#e0e0e0', boxWidth:12, padding:15 } } } }
    });
}


export function renderRecentTransactions() {
    const currentState = getState();
    const { transactions, accounts } = currentState;
    const container = document.getElementById('recent-transactions-container');
    if (!container || !transactions || !accounts || accounts.length === 0) {
        if(container) container.innerHTML = `<p class="text-center text-gray-500 py-4">Cargando o no hay datos...</p>`;
        return;
    }

    const recent = transactions.filter(t => !t.isInitialBalance).sort((a,b)=> new Date(b.date)-new Date(a.date)).slice(0,5);
    if (recent.length === 0) { container.innerHTML = `<p class="text-center text-gray-500 py-4">No hay movimientos recientes.</p>`; return; }

    const rowsHtmlArray = recent.map(t => {
        const isIncome = t.type === 'Ingreso';
        const account = accounts.find(acc => acc.id === t.accountId);
        const accountName = account ? account.name : `Cuenta Borrada (ID: ${t.accountId})`;
        const currency = account ? account.currency : 'EUR';
        const amount = typeof t.amount === 'number' ? t.amount : 0; // Asegurar número
        return `
            <tr class="border-b border-gray-800 last:border-b-0">
                <td class="py-3 px-3">
                    <p class="font-medium">${escapeHTML(t.description)}</p>
                    <p class="text-xs text-gray-400">${t.date} - ${escapeHTML(accountName)}</p>
                </td>
                <td class="py-3 px-3 text-right font-semibold ${isIncome ? 'text-green-400' : 'text-red-400'}">
                    ${isIncome ? '+' : '-'} ${formatCurrency(amount, currency)}
                </td>
            </tr>
        `;
    }).filter(Boolean);

    container.innerHTML = `<table class="w-full text-left"><tbody>${rowsHtmlArray.join('')}</tbody></table>`;
}

export function renderMainBalances() {
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


export function renderPendingInvoices() {
    const currentState = getState();
    const { documents } = currentState;
    const container = document.getElementById('pending-invoices-container');
    if (!container || !documents) return;

    const pending = documents.filter(doc => doc.type === 'Factura' && doc.status === 'Adeudada');
    if (pending.length === 0) {
        container.innerHTML = `<div class="text-center text-gray-500 py-4"><i data-lucide="check-circle-2" class="w-8 h-8 mx-auto mb-2 text-green-500"></i><p>¡Todo al día!</p></div>`;
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
             const icon = container.querySelector('i[data-lucide]');
             if(icon) lucide.createIcons({nodes: [icon]});
        }
        return;
    }


    container.innerHTML = pending.slice(0,3).map(doc => `
        <div class="flex justify-between items-center text-sm border-b border-gray-800 last:border-b-0 py-2">
            <div>
                <p class="font-medium">${escapeHTML(doc.number)}</p>
                <p class="text-xs text-gray-400">${escapeHTML(doc.client)}</p>
            </div>
            <span class="font-semibold">${formatCurrency(typeof doc.amount === 'number' ? doc.amount : 0, doc.currency)}</span> {/* Asegurar número */}
        </div>
    `).join('');
}

// Recibe 'charts' para pasarlo a las funciones de gráficos
export function renderInicioDashboard() {
    updateInicioKPIs(); // Usa getState()
    renderAnnualFlowChart();
    renderExpenseDistributionChart();
    renderMainBalances(); // Usa getState()
    renderPendingInvoices(); // Usa getState()
    renderRecentTransactions(); // Usa getState()
}
