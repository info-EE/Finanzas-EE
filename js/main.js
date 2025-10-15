// --- App Initialization ---
// Importa las funciones necesarias de Firebase v9
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

import { subscribe, initState, setState, getState } from './store.js';
import { bindEventListeners } from './handlers.js';
import { renderAll, switchPage, showApp, hideApp, updateConnectionStatus, showAuthError } from './ui.js';
import * as api from './api.js';
import * as actions from './actions.js';

// --- Configuración de Firebase ---
const firebaseConfig = {
    apiKey: "AIzaSyDFCyXACTjzwSrjyaLyzc3hqSB0s5zLUJY",
    authDomain: "europa-envios-gestor.firebaseapp.com",
    projectId: "europa-envios-gestor",
    storageBucket: "europa-envios-gestor.appspot.com",
    messagingSenderId: "135669072477",
    appId: "1:135669072477:web:59d6b6c1af1b496c0983b4",
    measurementId: "G-KZPBK200QS"
};

// Función principal que se ejecuta al cargar la página
function main() {
    let db;
    try {
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        db = getFirestore(app);
        api.initFirebaseServices(app, auth, db);
        updateConnectionStatus('success', 'Conectado');
    } catch (error) {
        console.error("Error CRÍTICO al inicializar Firebase:", error);
        updateConnectionStatus('error', 'Error de Conexión');
        document.body.innerHTML = `<div style="color: white; text-align: center; padding: 50px; font-family: sans-serif;"><h1>Error Crítico de Conexión</h1><p>No se pudo conectar con los servicios de la base de datos. Por favor, intente refrescar la página.</p></div>`;
        return;
    }

    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = '#e0e0e0';
    bindEventListeners();
    subscribe(renderAll);

    // Manejador de Autenticación
    onAuthStateChanged(api.getAuthInstance(), async (user) => {
        if (user) {
            let userProfile = await api.getUserProfile(user.uid);

            if (!userProfile) {
                await api.createUserProfile(user.uid, user.email, 'pendiente');
                userProfile = await api.getUserProfile(user.uid);
            }

            if (userProfile && userProfile.status === 'activo') {
                api.setCurrentUser(user.uid);
                showApp();
                await initState();

                // --- INICIO DE LA SOLUCIÓN DEFINITIVA ---
                // Si el usuario es un administrador, cargamos la lista inicial de usuarios
                // y LUEGO activamos un listener para ver los cambios en tiempo real.
                if (getState().settings.adminUids.includes(user.uid)) {
                    await actions.loadAndSetAllUsers(); // Carga la lista inicial
                    
                    // Activa la "transmisión de video en vivo" para la lista de usuarios
                    api.listenForAllUsersChanges((allUsers) => {
                        console.log("Actualización de usuarios en tiempo real recibida.");
                        setState({ allUsers }); // Actualiza el estado con la nueva lista
                    });
                }
                // --- FIN DE LA SOLUCIÓN DEFINITIVA ---

                api.listenForDataChanges((newData) => {
                    setState(newData);
                });
                switchPage('inicio');
            } else {
                showAuthError('Tu cuenta está pendiente de aprobación por un administrador.');
            }
        } else {
            api.setCurrentUser(null);
            hideApp();
        }
    });

    // Valores por defecto para fechas
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
}

document.addEventListener('DOMContentLoaded', main);

