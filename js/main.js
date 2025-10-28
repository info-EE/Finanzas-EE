// --- App Initialization ---
// Importa las funciones necesarias de Firebase v9
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// === INICIO: Importaciones locales COMENTADAS ===
// import { subscribe, initState, setState, getState, getDefaultState } from './store.js';
// import { bindAuthEventListeners, bindEventListeners } from './handlers.js';
// import { renderAll, switchPage, showApp, hideApp, updateConnectionStatus } from './ui.js';
// import * as api from './api.js';
// import * as actions from './actions.js';
// === FIN: Importaciones locales COMENTADAS ===

console.log("--- main.js loaded (Imports Commented Test v2) ---"); // Mensaje de prueba principal

// --- Configuración de Firebase ---
const firebaseConfig = {
    apiKey: "AIzaSyDFCyXACTjzwSrjyaLyzc3hqSB0s5zLUJY", // Reemplaza con tu API Key
    authDomain: "europa-envios-gestor.firebaseapp.com",
    projectId: "europa-envios-gestor",
    storageBucket: "europa-envios-gestor.appspot.com",
    messagingSenderId: "135669072477",
    appId: "1:135669072477:web:59d6b6c1af1b496c0983b4",
    measurementId: "G-KZPBK200QS"
};

// --- Función para crear iconos iniciales (COMENTADA POR AHORA) ---
/*
function createInitialIcons() {
    return new Promise((resolve, reject) => {
        // Añadimos una pequeña demora para asegurar que Lucide esté listo
        setTimeout(() => {
            if (typeof lucide !== 'undefined' && lucide.createIcons) {
                try {
                    lucide.createIcons({
                        nodes: document.querySelectorAll('i[data-lucide]') // Asegúrate que esto selecciona todos los iconos iniciales
                    });
                    console.log("Lucide icons created on DOMContentLoaded (with delay).");
                    resolve();
                } catch (error) {
                    console.error("Error creating Lucide icons on DOMContentLoaded (with delay):", error);
                    reject(error);
                }
            } else {
                const errorMsg = "Lucide library not available on DOMContentLoaded (with delay).";
                console.error(errorMsg);
                reject(new Error(errorMsg));
            }
        }, 50); // 50ms de demora
    });
}
*/

// --- Función principal async (Simplificada) ---
async function main() {
    console.log("--- main() function started (Imports Commented Test v2) ---"); // Segundo mensaje de prueba
    let app, auth, db;

    // 1. Inicializar Firebase (Mínimo necesario)
    try {
        console.log("Initializing Firebase...");
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        // api.initFirebaseServices(app, auth, db); // Comentado porque api.js está comentado
        console.log("Firebase initialized successfully.");
        // Mostrar mensaje visual simple para confirmar ejecución
        document.body.innerHTML = `<div style="color: white; padding: 20px; font-family: sans-serif;">Prueba de carga JS: Firebase OK. Importaciones locales comentadas. Revisa la consola.</div>`;
    } catch (error) {
        console.error("!!! CRITICAL ERROR initializing Firebase:", error);
        document.body.innerHTML = `<div style="color: red; padding: 20px; font-family: sans-serif;">Error Crítico al inicializar Firebase. Revisa la consola.</div>`;
        return;
    }

    // === INICIO: Código dependiente de importaciones COMENTADO ===
    /*
    // 2. Configurar Chart.js y el Store
    try {
        console.log("Configuring Chart.js and subscribing to store...");
        Chart.defaults.font.family = "'Inter', sans-serif";
        Chart.defaults.color = '#e0e0e0';
        subscribe(renderAll);
        console.log("Chart.js configured and subscribed successfully.");
    } catch (error) {
        console.error("!!! ERROR configuring Chart.js or subscribing:", error);
    }

    // 3. Crear iconos y vincular eventos de autenticación
    try {
        console.log("Creating initial icons and binding auth listeners...");
        // await createInitialIcons(); // Comentado
        // bindAuthEventListeners(); // Comentado
        console.log("Skipped: Initial icons and auth listeners binding.");
    } catch (error) {
        console.error("!!! ERROR during skipped icon/listener binding:", error);
    }

    // 4. Configurar el Manejador de Autenticación (Simplificado solo para log)
    try {
        console.log("Setting up simple onAuthStateChanged listener...");
        const authInstance = getAuth(app); // Obtener instancia directamente
        onAuthStateChanged(authInstance, (user) => {
             console.log("onAuthStateChanged triggered. User:", user ? user.email : 'null');
             // No modificar el body aquí para no borrar el mensaje de "Firebase OK"
             if (user) {
                 console.log(`Usuario autenticado detectado: ${user.email}`);
             } else {
                 console.log("No hay usuario autenticado.");
             }
        });
        console.log("Simple onAuthStateChanged listener attached.");
    } catch (error) {
        console.error("!!! ERROR setting up simple onAuthStateChanged listener:", error);
    }

    // 5. Valores por defecto para fechas (COMENTADO)
    // try {
    //     console.log("Setting default dates...");
    //     const today = new Date().toISOString().slice(0, 10);
    //     ['transaction-date', 'transfer-date', 'proforma-date', 'factura-fecha', 'report-date', 'investment-date', 'payment-date'].forEach(id => {
    //         const el = document.getElementById(id);
    //         if (el) el.value = today;
    //     });
    //     const currentMonth = new Date().toISOString().slice(0, 7);
    //     ['report-month', 'iva-month'].forEach(id => {
    //         const monthInput = document.getElementById(id);
    //         if (monthInput) monthInput.value = currentMonth;
    //     });
    //      const currentYear = new Date().getFullYear();
    //      ['report-year', 'report-year-sociedades'].forEach(id => {
    //         const yearInput = document.getElementById(id);
    //         if (yearInput && yearInput.tagName === 'INPUT') yearInput.value = currentYear;
    //         if (yearInput && yearInput.tagName === 'SELECT') {
    //              let yearOptions = '';
    //              for (let i = 0; i < 5; i++) {
    //                  const year = currentYear - i;
    //                  yearOptions += `<option value="${year}" ${year === currentYear ? 'selected' : ''}>${year}</option>`;
    //              }
    //              yearInput.innerHTML = yearOptions;
    //         }
    //     });
    //     console.log("Default dates set successfully.");
    // } catch (error) {
    //     console.error("!!! ERROR setting default dates:", error);
    // }
    */
    // === FIN: Código dependiente de importaciones COMENTADO ===

    console.log("--- main() function finished (Imports Commented Test v2) ---"); // Log final de prueba
}

// 6. Esperar a que el DOM esté listo para ejecutar main
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded event fired.");
    main().catch(error => {
        console.error("!!! UNHANDLED ERROR in main() execution:", error);
        // Mostrar error en pantalla si main falla catastróficamente
        document.body.innerHTML = `<div style="color: red; padding: 20px; font-family: sans-serif;">Error Crítico durante la ejecución de main(). Revisa la consola.<pre>${error.stack || error}</pre></div>`;
    });
});

