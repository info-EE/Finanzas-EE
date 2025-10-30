/**
 * Escapa caracteres HTML de una cadena para prevenir ataques XSS.
 * @param {string} str - La cadena a escapar.
 * @returns {string} La cadena segura para HTML.
 */
export function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    const p = document.createElement('p');
    p.textContent = str;
    return p.innerHTML;
}

/**
 * Formatea un número como una cadena de moneda con el símbolo correcto.
 * @param {number} amount - El monto a formatear.
 * @param {string} currency - La moneda (ej. 'EUR', 'USD').
 * @returns {string} La cadena formateada.
 */
export function formatCurrency(amount, currency = 'EUR') {
    const symbol = getCurrencySymbol(currency);
    const value = new Intl.NumberFormat(currency === 'EUR' ? 'de-DE' : 'en-US', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
    return `${value} ${symbol}`;
}

/**
 * Obtiene el símbolo para una moneda dada.
 * @param {string} currency - La moneda (ej. 'EUR', 'USD').
 * @returns {string} El símbolo de la moneda.
 */
export function getCurrencySymbol(currency) {
    switch (currency) {
        case 'USD':
            return '$';
        case 'EUR':
            return '€';
        default:
            return currency;
    }
}

// --- AÑADIDO: Nueva función para obtener nombre desde email ---
/**
 * Extrae el primer nombre de un email y lo capitaliza.
 * @param {string} email - El email del usuario.
 * @returns {string} El nombre capitalizado.
 */
export function capitalizeNameFromEmail(email) {
    if (!email) return 'Usuario';
    try {
        // 1. Obtener la parte antes del @
        const namePart = email.split('@')[0];
        // 2. Tomar solo la primera parte si hay un punto o guion
        const firstName = namePart.split(/[._-]/)[0];
        if (!firstName) return 'Usuario';
        // 3. Capitalizar
        return firstName.charAt(0).toUpperCase() + firstName.slice(1);
    } catch (e) {
        console.error("Error formatting email:", e);
        return 'Usuario';
    }
}
// --- FIN DE AÑADIDO ---
