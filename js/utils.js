export function escapeHTML(str) {
    const p = document.createElement('p');
    p.appendChild(document.createTextNode(str));
    return p.innerHTML;
}

export function formatCurrency(amount, currency = 'USD') {
    const symbol = currency === 'EUR' ? '€' : '$';
    const locale = currency === 'EUR' ? 'de-DE' : 'en-US';
    return `${symbol}${amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function getCurrencySymbol(currency) {
    return currency === 'EUR' ? '€' : '$';
}
