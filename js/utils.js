// js/utils.js

export function formatCurrency(n, cur) {
    const fmt = cur === 'EUR' ? { style: 'currency', currency: 'EUR' } : { style: 'currency', currency: 'USD' };
    return new Intl.NumberFormat('es-ES', fmt).format(Number(n) || 0);
}

export function escapeHTML(str) {
    if (typeof str !== 'string') return str;
    const p = document.createElement('p');
    p.appendChild(document.createTextNode(str));
    return p.innerHTML;
}

export function getCurrencySymbol(currency) {
    return currency === 'EUR' ? '€' : '$';
}