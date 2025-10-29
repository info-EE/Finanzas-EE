/**
 * Dashboard renderers (KPIs, charts aggregation, recent transactions)
 */
import { elements } from '../elements.js';
import { escapeHTML, formatCurrency, getCurrencySymbol } from '../../utils.js';
import { getState } from '../../store.js';
import { CHART_COLORS } from '../../config.js';

// Calcula y actualiza los KPIs del dashboard en el DOM
export function updateInicioKPIs() {
    const currentState = getState();
    const { transactions, accounts } = currentState;

    // Obtener elementos del DOM una sola vez
    const kpiIncomeEl = document.getElementById('kpi-monthly-income');
    const kpiExpenseEl = document.getElementById('kpi-monthly-expense');
    const kpiProfitEl = document.getElementById('kpi-monthly-profit');
    const kpiTotalBalanceEl = document.getElementById('kpi-total-balance');
    const currencySelect = document.getElementById('inicio-chart-currency');

    if (!kpiIncomeEl || !kpiExpenseEl || !kpiProfitEl || !kpiTotalBalanceEl || !currencySelect) {
        console.error("[updateInicioKPIs] Error crítico: Faltan elementos KPI o selector de moneda en el DOM.");
        return;
    }

    const currency = currencySelect.value;
    let monthlyIncome = 0;
    let monthlyExpense = 0;
    let monthlyProfit = 0;
    let totalBalance = 0;

    if (accounts && Array.isArray(accounts) && accounts.length > 0) {
        totalBalance = accounts.filter(a => a.currency === currency).reduce((sum, a) => sum + a.balance, 0);
    }

    if (transactions && Array.isArray(transactions) && transactions.length > 0 &&
        accounts && Array.isArray(accounts) && accounts.length > 0)
    {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        // console.log(`[updateInicioKPIs] Filtrando para Mes=${currentMonth}, Año=${currentYear}, Moneda=${currency}`); // Log Opcional

        transactions
            .filter(t => {
                // --- LOG GENERAL DENTRO DEL FILTRO ---
                console.log(`[Filter Eval] Tx ID: ${t.id || 'N/A'}, Fecha Str: ${t.date}, Acc ID: ${t.accountId}`);
                // --- FIN LOG GENERAL ---

                if (!t.date || typeof t.date !== 'string') return false;
                const tDate = new Date(t.date + 'T00:00:00'); // Interpretar fecha como LOCAL
                if (isNaN(tDate.getTime())) return false;

                const account = accounts.find(acc => acc.id === t.accountId);
                if (!account) return false;

                const isCorrectCurrency = account.currency === currency;
                const transactionMonth = tDate.getMonth();
                const transactionYear = tDate.getFullYear();
                const isCurrentMonth = transactionMonth === currentMonth;
                const isCurrentYear = transactionYear === currentYear;

                const shouldInclude = isCorrectCurrency && isCurrentMonth && isCurrentYear;

                // Log del resultado de la evaluación para esta transacción
                // console.log(`[Filter Result] Tx ID: ${t.id || 'N/A'} -> Include? ${shouldInclude} (Curr: ${isCorrectCurrency}, Month: ${isCurrentMonth}, Year: ${isCurrentYear})`); // Log Opcional detallado

                return shouldInclude;
            })
            .forEach(t => { // Este forEach solo se ejecuta si el filter devuelve algo
                const amount = t.amount || 0;
                const iva = t.iva || 0;
                if (t.type === 'Ingreso') {
                    monthlyIncome += amount;
                } else if (t.type === 'Egreso') {
                    monthlyExpense += (amount + iva);
                }
            });

        monthlyProfit = monthlyIncome - monthlyExpense;
    } else {
         // Asegurar que monthlyProfit es 0 si no hay datos para calcular
         monthlyProfit = 0;
    }

    // Actualizar DOM
    kpiIncomeEl.textContent = formatCurrency(monthlyIncome, currency);
    kpiExpenseEl.textContent = formatCurrency(monthlyExpense, currency);
    kpiProfitEl.textContent = formatCurrency(monthlyProfit, currency);
    kpiProfitEl.classList.remove('text-green-400', 'text-red-400');
    kpiProfitEl.classList.add(monthlyProfit >= 0 ? 'text-green-400' : 'text-red-400');
    kpiTotalBalanceEl.textContent = formatCurrency(totalBalance, currency);
}


// --- El resto de funciones (renderAnnualFlowChart, etc.) se mantienen igual ---

export function renderAnnualFlowChart(state, charts) {
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
    const currentYear = new Date().getFullYear();
    const incomeData = Array(12).fill(0);
    const expenseData = Array(12).fill(0);

    transactions.filter(t => {
        const account = accounts.find(acc => acc.id === t.accountId);
        if (!t.date || !account || typeof t.date !== 'string') return false;
        const tDate = new Date(t.date + 'T00:00:00');
        return account.currency === selectedCurrency && !isNaN(tDate.getTime()) && tDate.getFullYear() === currentYear;
    }).forEach(t => {
        const date = new Date(t.date + 'T00:00:00');
        if (!isNaN(date.getTime())) {
            const month = date.getMonth();
            if (month >=0 && month <=11) {
                const amount = t.amount || 0;
                const iva = t.iva || 0;
                if (t.type === 'Ingreso') incomeData[month] += amount;
                else if (t.type === 'Egreso') expenseData[month] += (amount + iva);
            }
        }
    });

    const incomeGradient = annualCtx.createLinearGradient(0,0,0,320); incomeGradient.addColorStop(0,'rgba(59,130,246,0.5)'); incomeGradient.addColorStop(1,'rgba(59,130,246,0)');
    const expenseGradient = annualCtx.createLinearGradient(0,0,0,320); expenseGradient.addColorStop(0,'rgba(239,68,68,0.5)'); expenseGradient.addColorStop(1,'rgba(239,68,68,0)');

    if(charts) {
        charts.annualFlowChart = new Chart(annualCtx, {
            type: 'line',
            data: { labels: months, datasets: [ { label: `Ingresos (${getCurrencySymbol(selectedCurrency)})`, data: incomeData, borderColor: 'rgba(59,130,246,1)', backgroundColor: incomeGradient, fill:true, tension:0.4 }, { label: `Egresos (${getCurrencySymbol(selectedCurrency)})`, data: expenseData, borderColor: 'rgba(239,68,68,1)', backgroundColor: expenseGradient, fill:true, tension:0.4 } ] },
            options: { responsive:true, maintainAspectRatio:false, scales:{ y:{ beginAtZero:true } }, plugins:{ legend:{ position:'bottom' } } }
        });
    } else {
        console.error("[renderAnnualFlowChart] El objeto 'charts' no fue pasado correctamente.");
    }
}


export function renderExpenseDistributionChart(state, charts) {
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

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const expenseByCategory = transactions.filter(t => {
        const account = accounts.find(acc => acc.id === t.accountId);
        if(!t.date || !account || typeof t.date !== 'string') return false;
        const tDate = new Date(t.date + 'T00:00:00');
        return t.type === 'Egreso' && account.currency === currency && !isNaN(tDate.getTime()) && tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
    }).reduce((acc, t) => {
        const category = t.category || 'Sin Categoría';
        const amount = t.amount || 0;
        const iva = t.iva || 0;
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

    if (charts) {
        charts.expenseDistributionChart = new Chart(ctx, {
            type: 'doughnut',
            data: { labels: labels, datasets: [{ data: data, backgroundColor: chartColors, borderColor: '#0a0a0a', borderWidth:5, borderRadius:10 }] },
            options: { responsive:true, maintainAspectRatio:false, cutout: '70%', plugins:{ legend:{ position:'bottom', labels:{ color:'#e0e0e0', boxWidth:12, padding:15 } } } }
        });
    } else {
         console.error("[renderExpenseDistributionChart] El objeto 'charts' no fue pasado correctamente.");
    }
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
        const amount = t.amount || 0;
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
            <span class="font-semibold">${formatCurrency(doc.amount || 0, doc.currency)}</span>
        </div>
    `).join('');
}

export function renderInicioDashboard(state, charts) {
    updateInicioKPIs();
    renderAnnualFlowChart(state, charts);
    renderExpenseDistributionChart(state, charts);
    renderPendingInvoices();
    renderRecentTransactions();
}

