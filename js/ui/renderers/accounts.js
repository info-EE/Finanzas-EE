/**
 * Renderers for Accounts UI
 */
import { elements } from '../elements.js';
import { formatCurrency, escapeHTML } from '../../utils.js';
import { renderSingleCurrencyChart } from '../charts.js';

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

export function renderAccountsTab(state) {
    const { accounts } = state;
    const accountsGrid = document.getElementById('accounts-grid');
    if (!accountsGrid) return;
    accountsGrid.innerHTML = accounts.map(createAccountCard).join('');
}

export function renderMainBalances(state) {
    const { accounts } = state;
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

export function renderBalanceLegendAndChart(state) {
    const { accounts } = state;
    const totalsContainer = document.getElementById('balance-totals');
    if (!totalsContainer || !accounts || accounts.length === 0) {
        if (totalsContainer) totalsContainer.innerHTML = '';
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
