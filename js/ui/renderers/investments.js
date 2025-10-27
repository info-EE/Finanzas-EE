/**
 * Renderers for Investments
 */
import { elements } from '../elements.js';
import { escapeHTML, formatCurrency } from '../../utils.js';

export function createInvestmentRow(t, allAssets = [], state = {}) {
    const { permissions, accounts } = state;
    if (!permissions || !accounts || accounts.length === 0 || !allAssets) {
        console.warn(`createInvestmentRow: Faltan datos (permisos, cuentas o activos) para transacción ${t.id}`);
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
    const account = accounts.find(acc => acc.id === t.accountId);
    const accountName = account ? account.name : `Cuenta Borrada (ID: ${t.accountId})`;
    const currency = account ? account.currency : 'EUR';

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

export function renderInvestments(state) {
    const { transactions, investmentAssets, permissions, accounts } = state;
    const tbody = elements.investmentsTableBody;
    if (!tbody || !permissions || !accounts || accounts.length === 0 || !investmentAssets || !transactions) {
         console.warn("renderInvestments: Faltan datos.");
         if(tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-gray-500">Cargando datos o no hay cuentas/activos...</td></tr>`;
         const addInvestmentFormCard = elements.addInvestmentForm?.parentElement;
         if (addInvestmentFormCard && (!permissions || !permissions.manage_investments)) {
             addInvestmentFormCard.classList.add('hidden');
         }
         return;
    }

    const addInvestmentFormCard = elements.addInvestmentForm?.parentElement;
    if (addInvestmentFormCard) {
        addInvestmentFormCard.classList.toggle('hidden', !permissions.manage_investments);
    }

    const investmentsData = transactions.filter(t => t.category === 'Inversión');

    const totals = investmentsData.reduce((acc, t) => {
        const account = accounts.find(a => a.id === t.accountId);
        if (account) {
            acc[account.currency] = (acc[account.currency] || 0) + t.amount;
        } else {
             console.warn(`renderInvestments: No se encontró cuenta con ID ${t.accountId} para transacción ${t.id}`);
        }
        return acc;
    }, {});

    const totalEurEl = document.getElementById('total-invested-eur');
    if (totalEurEl) totalEurEl.textContent = formatCurrency(totals['EUR'] || 0, 'EUR');
    const totalUsdEl = document.getElementById('total-invested-usd');
    if (totalUsdEl) totalUsdEl.textContent = formatCurrency(totals['USD'] || 0, 'USD');

    if (investmentsData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-gray-500">No hay movimientos de inversión.</td></tr>`;
    } else {
        const rowsHtmlArray = investmentsData
                       .sort((a, b) => new Date(b.date) - new Date(a.date))
                       .map(t => createInvestmentRow(t, investmentAssets, state))
                       .filter(row => row !== '');
        tbody.innerHTML = rowsHtmlArray.join('');
    }
}

export function renderInvestmentAssetsList(state) {
    const { investmentAssets } = state;
    const listEl = elements.investmentAssetsList;
    if (!listEl) return;
    listEl.innerHTML = '';
    if (!investmentAssets || investmentAssets.length === 0) {
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
    // TODO
