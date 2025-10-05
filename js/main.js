import { subscribe, initState } from './store.js';
import { bindEventListeners } from './handlers.js';
import { renderAll, switchPage } from './ui.js';

// --- App Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    // 0. Configuración global para los gráficos
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = '#e0e0e0';
    
    // 1. Inicializa el estado de la aplicación (carga desde localStorage o usa el default)
    initState();

    // 2. Vincula todos los event listeners a los elementos del DOM
    bindEventListeners();

    // 3. Se suscribe a los cambios del estado.
    // Cada vez que el estado cambie (setState), la función renderAll se ejecutará.
    subscribe(renderAll);

    // 4. Establece la página inicial y realiza el primer renderizado completo
    switchPage('inicio');

    // 5. Establece valores por defecto en campos de fecha y mes
    const today = new Date().toISOString().slice(0, 10);
    ['transaction-date', 'transfer-date', 'proforma-date', 'factura-fecha', 'report-date'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = today;
    });
    
    const currentMonth = new Date().toISOString().slice(0, 7);
    ['report-month', 'iva-month'].forEach(id => {
        const monthInput = document.getElementById(id);
        if(monthInput) monthInput.value = currentMonth;
    });
});
