/**
 * Renderers for Accounts UI
 */
import { elements } from '../elements.js';
import { formatCurrency, escapeHTML } from '../../utils.js';
import { renderSingleCurrencyChart, charts } from '../charts.js'; // Importar charts
import { getState } from '../../store.js'; // Importar getState

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

export function renderAccountsTab() {
    const { accounts } = getState(); // Usar getState
    const accountsGrid = document.getElementById('accounts-grid');
    if (!accountsGrid) return;
    
    // Asegurarse de que accounts existe
    if (!accounts || accounts.length === 0) {
        accountsGrid.innerHTML = '<p class="text-gray-500 col-span-1 sm:col-span-2 lg:col-span-3 text-center">No hay cuentas configuradas.</p>';
        return;
    }
    
    accountsGrid.innerHTML = accounts.map(createAccountCard).join('');
}

// --- renderMainBalances FUE ELIMINADO DE AQUÍ ---
// --- Está correctamente en dashboard.js ---

export function renderBalanceLegendAndChart() {
    const { accounts } = getState(); // Usar getState
    const totalsContainer = document.getElementById('balance-totals');
    
    if (!totalsContainer || !accounts || accounts.length === 0) {
        if (totalsContainer) totalsContainer.innerHTML = '';
        // Destruir gráficos si existen
        if (charts.accountsBalanceChartEUR) { charts.accountsBalanceChartEUR.destroy(); charts.accountsBalanceChartEUR = null; }
        if (charts.accountsBalanceChartUSD) { charts.accountsBalanceChartUSD.destroy(); charts.accountsBalanceChartUSD = null; }
        document.getElementById('eur-chart-container')?.classList.add('hidden');
        document.getElementById('usd-chart-container')?.classList.add('hidden');
        return;
    }

    const totalEUR = accounts.filter(a => a.currency === 'EUR').reduce((sum, a) => sum + a.balance, 0);
    const totalUSD = accounts.filter(a => a.currency === 'USD').reduce((sum, a) => sum + a.balance, 0);
    totalsContainer.innerHTML = `
        <div><p class="text-gray-400 text-sm">Saldo Total en Euros</p><p class="text-2xl font-bold text-white">${formatCurrency(totalEUR, 'EUR')}</p></div>
        <div><p class="text-gray-400 text-sm">Saldo Total en Dólares</p><p class="text-2xl font-bold text-white">${formatCurrency(totalUSD, 'USD')}</p></div>`;

    renderSingleCurrencyChart('EUR', totalEUR, 'accountsBalanceChartEUR', 'balance-legend-eur', 'eur-chart-container');
    renderSingleCurrencyChart('USD', totalUSD, 'accountsBalanceChartUSD', 'balance-legend-usd', 'usd-chart-container');
}
