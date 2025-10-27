/**
 * Chart helpers (Chart.js) centralization
 */
import { getState } from '../store.js';
import { escapeHTML, formatCurrency } from '../utils.js';
import { CHART_COLORS } from '../config.js';

export const charts = {
    accountsBalanceChartEUR: null,
    accountsBalanceChartUSD: null,
    annualFlowChart: null,
    expenseDistributionChart: null,
    clientsChart: null,
};

export function renderSingleCurrencyChart(currency, totalBalance, canvasId, legendId, containerId) {
    const { accounts } = getState();
    const container = document.getElementById(containerId);
    if (!container) return;

    const accountsForChart = accounts.filter(a => a.currency === currency && a.balance > 0);
    
    if (accountsForChart.length === 0) {
        container.classList.add('hidden');
        if (charts[canvasId]) {
            charts[canvasId].destroy();
            charts[canvasId] = null;
        }
        return;
    }
    container.classList.remove('hidden');
    
    const legendContainer = document.getElementById(legendId);
    const chartCtx = document.getElementById(canvasId)?.getContext('2d');
    if (!legendContainer || !chartCtx) return;
    
    if (charts[canvasId]) charts[canvasId].destroy();

    const backgroundColors = accountsForChart.map((_, index) => CHART_COLORS[index % CHART_COLORS.length]);
    
    legendContainer.innerHTML = accountsForChart.map((account, index) => {
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

    charts[canvasId] = new Chart(chartCtx, { 
        type: 'doughnut', 
        data: { 
            labels: accountsForChart.map(a => a.name), 
            datasets: [{ 
                data: accountsForChart.map(a => a.balance), 
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

export function resizeCharts() {
    Object.values(charts).forEach(chart => {
        if (chart && typeof chart.resize === 'function') {
            try { chart.resize(); } catch (e) { console.warn('Error resizing chart', e); }
        }
    });
}
