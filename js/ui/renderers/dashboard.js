/**
 * Dashboard renderers (KPIs, charts aggregation, recent transactions)
 */
import { elements } from '../elements.js';
import { escapeHTML, formatCurrency, getCurrencySymbol } from '../../utils.js';
// --- AÑADIR ESTA LÍNEA ---
// --- AÑADIR ESTA LÍNEA ---

// --- FIN LÍNEA AÑADIDA ---

// --- FIN LÍNEA AÑADIDA ---


export function updateInicioKPIs(state) {
    const { transactions, accounts } = state;
    if(!transactions || !accounts || accounts.length === 0) {
        console.warn("updateInicioKPIs: Faltan datos (transactions o accounts)");
        ['kpi-monthly-income', 'kpi-monthly-expense', 'kpi-monthly-profit', 'kpi-total-balance'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = formatCurrency(0, 'EUR');
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
            const tDate = new Date(t.date + 'T00:00:00');
            const account = accounts.find(acc => acc.id === t.accountId);
            return account && account.currency === currency && t.date && !isNaN(tDate.getTime()) && tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
        })
        .forEach(t => {
            if (t.type === 'Ingreso') monthlyIncome += t.amount;
            else if (t.type === 'Egreso') monthlyExpense += (t.amount + (t.iva || 0));
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


export function renderAnnualFlowChart(state, charts) {
    const { transactions, accounts } = state;
    const annualCtx = document.getElementById('annualFlowChart')?.getContext('2d');
    // --- AÑADIR ESTA LÍNEA ---

    // --- FIN LÍNEA AÑADIDA ---

    if (!annualCtx || !transactions || !accounts || accounts.length === 0) {
        // --- CAMBIO AQUÍ ---
        if (charts && charts.annualFlowChart) { try { charts.annualFlowChart.destroy(); } catch(e){} charts.annualFlowChart = null; }
        if (annualCtx) { annualCtx.clearRect(0,0,annualCtx.canvas.width, annualCtx.canvas.height); annualCtx.fillStyle='#6b7280'; annualCtx.textAlign='center'; annualCtx.fillText('No hay datos para mostrar.', annualCtx.canvas.width/2, annualCtx.canvas.height/2); }
        return;
    }

    // --- CAMBIO AQUÍ ---
    if (charts && charts.annualFlowChart) charts.annualFlowChart.destroy();

    const currencySelect = document.getElementById('inicio-chart-currency');
    if (!currencySelect) return;
    const selectedCurrency = currencySelect.value;

    const months = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    const currentYear = new Date().getFullYear();
    const incomeData = Array(12).fill(0);
    const expenseData = Array(12).fill(0);

    transactions.filter(t => {
        const account = accounts.find(acc => acc.id === t.accountId);
        const tDate = new Date(t.date + 'T00:00:00');
        return account && account.currency === selectedCurrency && t.date && !isNaN(tDate.getTime()) && tDate.getFullYear() === currentYear;
    }).forEach(t => {
        const date = new Date(t.date + 'T00:00:00');
        if (!isNaN(date.getTime())) {
            const month = date.getMonth();
            if (month >=0 && month <=11) {
                if (t.type === 'Ingreso') incomeData[month] += t.amount;
                else if (t.type === 'Egreso') expenseData[month] += (t.amount + (t.iva || 0));
            }
        }
    });

    const incomeGradient = annualCtx.createLinearGradient(0,0,0,320); incomeGradient.addColorStop(0,'rgba(59,130,246,0.5)'); incomeGradient.addColorStop(1,'rgba(59,130,246,0)');
    const expenseGradient = annualCtx.createLinearGradient(0,0,0,320); expenseGradient.addColorStop(0,'rgba(239,68,68,0.5)'); expenseGradient.addColorStop(1,'rgba(239,68,68,0)');

    // --- CAMBIO AQUÍ (NO window.) ---
    charts.annualFlowChart = new Chart(annualCtx, { // Quitamos window.
        type: 'line',
        data: { labels: months, datasets: [ { label: `Ingresos (${getCurrencySymbol(selectedCurrency)})`, data: incomeData, borderColor: 'rgba(59,130,246,1)', backgroundColor: incomeGradient, fill:true, tension:0.4 }, { label: `Egresos (${getCurrencySymbol(selectedCurrency)})`, data: expenseData, borderColor: 'rgba(239,68,68,1)', backgroundColor: expenseGradient, fill:true, tension:0.4 } ] },
        options: { responsive:true, maintainAspectRatio:false, scales:{ y:{ beginAtZero:true } }, plugins:{ legend:{ position:'bottom' } } }
    });
}


export function renderExpenseDistributionChart(state, charts) {
    const { transactions, accounts } = state;
    const ctx = document.getElementById('expenseDistributionChart')?.getContext('2d');
    // --- AÑADIR ESTA LÍNEA ---

    // --- FIN LÍNEA AÑADIDA ---

    if (!ctx || !transactions || !accounts || accounts.length === 0) {
        // --- CAMBIO AQUÍ ---
        if (charts && charts.expenseDistributionChart) { try { charts.expenseDistributionChart.destroy(); } catch(e){} charts.expenseDistributionChart = null; }
        if (ctx) { ctx.clearRect(0,0,ctx.canvas.width, ctx.canvas.height); ctx.fillStyle = '#6b7280'; ctx.textAlign='center'; ctx.fillText('No hay datos para mostrar.', ctx.canvas.width/2, ctx.canvas.height/2); }
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
        const tDate = new Date(t.date + 'T00:00:00');
        return t.type === 'Egreso' && account && account.currency === currency && t.date && !isNaN(tDate.getTime()) && tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
    }).reduce((acc, t) => { const category = t.category || 'Sin Categoría'; acc[category] = (acc[category] || 0) + (t.amount + (t.iva || 0)); return acc; }, {});

    const labels = Object.keys(expenseByCategory);
    const data = Object.values(expenseByCategory);

    // --- CAMBIO AQUÍ ---
    if (charts && charts.expenseDistributionChart) charts.expenseDistributionChart.destroy();

    if (labels.length === 0) {
        ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
        ctx.fillStyle = '#6b7280'; ctx.textAlign='center'; ctx.fillText(`No hay gastos en ${currency} este mes.`, ctx.canvas.width/2, ctx.canvas.height/2);
        return;
    }

    // --- CAMBIO AQUÍ (NO window.) ---
    charts.expenseDistributionChart = new Chart(ctx, { // Quitamos window.
        type: 'doughnut',
        data: { labels: labels, datasets: [{ data: data, backgroundColor: window.CHART_COLORS || [], borderColor: '#0a0a0a', borderWidth:5, borderRadius:10 }] },
        options: { responsive:true, maintainAspectRatio:false, cutout: '70%', plugins:{ legend:{ position:'bottom', labels:{ color:'#e0e0e0', boxWidth:12, padding:15 } } } }
    });
}


export function renderRecentTransactions(state) {
    const { transactions, accounts } = state;
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
    }).filter(Boolean);

    container.innerHTML = `<table class="w-full text-left"><tbody>${rowsHtmlArray.join('')}</tbody></table>`;
}


export function renderPendingInvoices(state) {
    const { documents } = state;
    const container = document.getElementById('pending-invoices-container');
    if (!container || !documents) return;

    const pending = documents.filter(doc => doc.type === 'Factura' && doc.status === 'Adeudada');
    if (pending.length === 0) {
        container.innerHTML = `<div class="text-center text-gray-500 py-4"><i data-lucide="check-circle-2" class="w-8 h-8 mx-auto mb-2 text-green-500"></i><p>¡Todo al día!</p></div>`;
        return;
    }

    container.innerHTML = pending.slice(0,3).map(doc => `
        <div class="flex justify-between items-center text-sm border-b border-gray-800 last:border-b-0 py-2">
            <div>
                <p class="font-medium">${escapeHTML(doc.number)}</p>
                <p class="text-xs text-gray-400">${escapeHTML(doc.client)}</p>
            </div>
            <span class="font-semibold">${formatCurrency(doc.amount, doc.currency)}</span>
        </div>
    `).join('');
}


export function renderInicioDashboard(state, charts) {
    updateInicioKPIs(state);
    renderAnnualFlowChart(state);
    renderExpenseDistributionChart(state);
    // renderMainBalances is provided by accounts renderer
    renderPendingInvoices(state);
    renderRecentTransactions(state);
}
