import { subscribe, initState, setState } from './store.js';
import { bindEventListeners } from './handlers.js';
import { renderAll, switchPage, showApp, hideApp } from './ui.js';
import { onAuthChange, listenForDataChanges, initFirebase } from './api.js';

// --- App Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    // 0. Primero, inicializamos Firebase
    const firebaseReady = initFirebase();

    // Si Firebase no se pudo inicializar, detenemos la app y mostramos un error.
    if (!firebaseReady) {
        document.body.innerHTML = `<div style="color: white; text-align: center; padding: 50px; font-family: sans-serif;">
            <h1 style="font-size: 24px; margin-bottom: 20px;">Error Crítico</h1>
            <p>No se pudo conectar con los servicios de la base de datos. Por favor, intente refrescar la página.</p>
        </div>`;
        return;
    }
    
    // 1. Configuración global para los gráficos
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = '#e0e0e0';
    
    // 2. Vincula todos los event listeners una sola vez al cargar la página
    bindEventListeners();

    // 3. Se suscribe a los cambios del estado local para redibujar la UI.
    subscribe(renderAll);

    // 4. El manejador de autenticación central
    onAuthChange(async (user) => {
        if (user) {
            // Si el usuario está autenticado:
            // a. Muestra la aplicación principal
            showApp();
            // b. Inicializa el estado (cargará los datos del usuario o creará unos nuevos)
            await initState();
            // c. Escucha cambios en los datos de este usuario en tiempo real
            listenForDataChanges((newData) => {
                setState(newData);
            });
            // d. Muestra la página de inicio
            switchPage('inicio');
        } else {
            // Si no hay usuario, muestra la pantalla de autenticación
            hideApp();
        }
    });

    // 5. Establece valores por defecto en campos de fecha y mes (esto puede quedar aquí)
    const today = new Date().toISOString().slice(0, 10);
    ['transaction-date', 'transfer-date', 'proforma-date', 'factura-fecha', 'report-date', 'investment-date'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = today;
    });
    
    const currentMonth = new Date().toISOString().slice(0, 7);
    ['report-month', 'iva-month'].forEach(id => {
        const monthInput = document.getElementById(id);
        if(monthInput) monthInput.value = currentMonth;
    });
});

