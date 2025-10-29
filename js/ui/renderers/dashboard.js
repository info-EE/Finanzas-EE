/**
 * Dashboard renderers (KPIs, charts aggregation, recent transactions)
 */
import { elements } from '../elements.js';
import { escapeHTML, formatCurrency, getCurrencySymbol } from '../../utils.js';
// Los imports vacíos se pueden eliminar si no se usan
// import { ... } from './charts.js'; // Asumiendo que las funciones de chart se llaman desde ui.js todavía

export function updateInicioKPIs(state) {
    // --- DEBUG: Log al inicio de la función ---
    console.log('[updateInicioKPIs] *** INTENTANDO EJECUTAR updateInicioKPIs ***');

    const { transactions, accounts } = state;

    // --- DEBUG: Log antes de la comprobación de datos ---
    console.log(`[updateInicioKPIs] Verificando datos: transactions existe=${!!transactions}, accounts existe=${!!accounts}, accounts.length=${accounts ? accounts.length : 'N/A'}`);

    // Comprobación más explícita
    if (!transactions || !Array.isArray(transactions) || transactions.length === 0 ||
        !accounts || !Array.isArray(accounts) || accounts.length === 0) {
        console.warn("[updateInicioKPIs] SALIENDO TEMPRANO: Faltan datos o están vacíos (transactions o accounts).");
        // Asegurarse de poner a 0 si salimos temprano
        ['kpi-monthly-income', 'kpi-monthly-expense', 'kpi-monthly-profit', 'kpi-total-balance'].forEach(id => {
            const el = document.getElementById(id);
            // El Saldo Total SÍ se calcula aquí basado en las cuentas existentes, incluso si no hay transacciones este mes.
            if (id === 'kpi-total-balance' && accounts && accounts.length > 0) {
                 const currencySelectForTotal = document.getElementById('inicio-chart-currency');
                 const currencyForTotal = currencySelectForTotal ? currencySelectForTotal.value : 'EUR';
                 const totalBalanceForKPI = accounts.filter(a => a.currency === currencyForTotal).reduce((sum, a) => sum + a.balance, 0);
                 if (el) el.textContent = formatCurrency(totalBalanceForKPI, currencyForTotal);
            } else if (el) {
                 // Los otros KPIs sí dependen de las transacciones del mes
                 el.textContent = formatCurrency(0, 'EUR'); // O usar la moneda seleccionada si se prefiere
            }
        });
        return; // Salir de la función
    }

    // --- DEBUG: Si pasa la comprobación ---
    console.log('[updateInicioKPIs] Datos encontrados. Continuando cálculo...');

    const currencySelect = document.getElementById('inicio-chart-currency');
    if (!currencySelect) {
        console.error("[updateInicioKPIs] Error: No se encontró el selector de moneda 'inicio-chart-currency'.");
        return;
    }
    const currency = currencySelect.value;
    console.log(`[updateInicioKPIs] Moneda seleccionada: ${currency}`);

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    console.log(`[updateInicioKPIs] Mes actual (0-11): ${currentMonth}, Año actual: ${currentYear}`);

    let monthlyIncome = 0;
    let monthlyExpense = 0;

    console.log('[updateInicioKPIs] Filtrando transacciones...');
    const filteredTransactions = transactions.filter(t => {
        // console.log(`[updateInicioKPIs] Evaluando transacción:`, t); // Puedes descomentar este si necesitas detalle extremo

        if (!t.date) return false;
        const tDate = new Date(t.date + 'T00:00:00');
        if (isNaN(tDate.getTime())) return false;

        const account = accounts.find(acc => acc.id === t.accountId);
        if (!account) return false;

        const isCorrectCurrency = account.currency === currency;
        const transactionMonth = tDate.getMonth();
        const transactionYear = tDate.getFullYear();
        const isCurrentMonth = transactionMonth === currentMonth;
        const isCurrentYear = transactionYear === currentYear;

        // console.log(`[updateInicioKPIs] -> Fecha Tx: ${t.date} (${transactionMonth}/${transactionYear}) | Moneda Cuenta: ${account.currency}`); // Descomentar si es necesario
        // console.log(`[updateInicioKPIs] -> ¿Moneda Correcta?: ${isCorrectCurrency} | ¿Mes Correcto?: ${isCurrentMonth} | ¿Año Correcto?: ${isCurrentYear}`); // Descomentar si es necesario

        const shouldInclude = isCorrectCurrency && isCurrentMonth && isCurrentYear;
        // console.log(`[updateInicioKPIs] -> ¿Incluir?: ${shouldInclude}`); // Descomentar si es necesario
        return shouldInclude;
    });

    console.log('[updateInicioKPIs] Transacciones que pasaron el filtro:', filteredTransactions);

    filteredTransactions.forEach(t => {
            const amount = t.amount || 0;
            const iva = t.iva || 0;
            if (t.type === 'Ingreso') {
                monthlyIncome += amount;
                // console.log(`[updateInicioKPIs] -> Sumando Ingreso: ${amount}. Total Ingresos ahora: ${monthlyIncome}`); // Descomentar si es necesario
            } else if (t.type === 'Egreso') {
                monthlyExpense += (amount + iva);
                // console.log(`[updateInicioKPIs] -> Sumando Egreso: ${amount} + IVA ${iva}. Total Egresos ahora: ${monthlyExpense}`); // Descomentar si es necesario
            }
        });

    const monthlyProfit = monthlyIncome - monthlyExpense;
    const totalBalance = accounts.filter(a => a.currency === currency).reduce((sum, a) => sum + a.balance, 0);

    console.log(`[updateInicioKPIs] Cálculo final: Ingresos=${monthlyIncome}, Egresos=${monthlyExpense}, Beneficio=${monthlyProfit}, Saldo Total=${totalBalance}`);

    // Actualizar DOM
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
    // El kpiTotalBalanceEl se actualiza incluso si salimos temprano, basado solo en accounts.
    const kpiTotalBalanceEl = document.getElementById('kpi-total-balance');
     if (kpiTotalBalanceEl) kpiTotalBalanceEl.textContent = formatCurrency(totalBalance, currency);


     console.log('[updateInicioKPIs] Fin del cálculo y actualización del DOM.');
}

// ... (resto de las funciones renderAnnualFlowChart, renderExpenseDistributionChart, etc., sin cambios)


export function renderAnnualFlowChart(state, charts) {
    const { transactions, accounts } = state;
    const annualCtx = document.getElementById('annualFlowChart')?.getContext('2d');

    if (!annualCtx || !transactions || !accounts || accounts.length === 0) {
        if (charts && charts.annualFlowChart) { try { charts.annualFlowChart.destroy(); } catch(e){} charts.annualFlowChart = null; }
        if (annualCtx) { annualCtx.clearRect(0,0,annualCtx.canvas.width, annualCtx.canvas.height); annualCtx.fillStyle='#6b7280'; annualCtx.textAlign='center'; annualCtx.fillText('No hay datos para mostrar.', annualCtx.canvas.width/2, annualCtx.canvas.height/2); }
        return;
    }

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
        if (!t.date || !account) return false; // Ignorar si falta fecha o cuenta
        const tDate = new Date(t.date + 'T00:00:00'); // Interpretar fecha como local
        return account.currency === selectedCurrency && !isNaN(tDate.getTime()) && tDate.getFullYear() === currentYear;
    }).forEach(t => {
        const date = new Date(t.date + 'T00:00:00'); // Interpretar fecha como local
        // Asegurarse que getTime no es NaN antes de llamar a getMonth
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

    // Asegurarse que 'charts' existe antes de asignarle una propiedad
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
    const { transactions, accounts } = state;
    const ctx = document.getElementById('expenseDistributionChart')?.getContext('2d');

    if (!ctx || !transactions || !accounts || accounts.length === 0) {
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
        if(!t.date || !account) return false;
        const tDate = new Date(t.date + 'T00:00:00'); // Interpretar fecha como local
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

    if (charts && charts.expenseDistributionChart) charts.expenseDistributionChart.destroy();

    if (labels.length === 0) {
        ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
        ctx.fillStyle = '#6b7280'; ctx.textAlign='center'; ctx.fillText(`No hay gastos en ${currency} este mes.`, ctx.canvas.width/2, ctx.canvas.height/2);
        return;
    }

    // Usar CHART_COLORS importado si está disponible
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
        const amount = t.amount || 0; // Asegurar que amount es número
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
    }).filter(Boolean); // Filtrar resultados potencialmente nulos

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
            <span class="font-semibold">${formatCurrency(doc.amount || 0, doc.currency)}</span> {/* Asegurar amount */}
        </div>
    `).join('');
}

// Nota: renderInicioDashboard ahora necesita el objeto charts como segundo argumento
export function renderInicioDashboard(state, charts) {
    updateInicioKPIs(state);
    renderAnnualFlowChart(state, charts); // Pasar charts
    renderExpenseDistributionChart(state, charts); // Pasar charts
    // renderMainBalances() es llamado por renderAccountsTab que se llama desde renderAll
    renderPendingInvoices(state);
    renderRecentTransactions(state);
}

