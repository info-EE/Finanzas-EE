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
    let isAppInitialized = false; // Guardián de inicialización

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
    
    subscribe(renderAll);

    // Manejador de Autenticación
    onAuthStateChanged(api.getAuthInstance(), async (user) => {
        if (user) {
            if (isAppInitialized) return; // Si ya está inicializado, no hacer nada más.

            let userProfile = await api.getUserProfile(user.uid);

            if (!userProfile || !userProfile.email) {
                await api.createUserProfile(user.uid, user.email, 'pendiente');
                userProfile = await api.getUserProfile(user.uid);
            }

            if (userProfile && userProfile.status === 'activo') {
                api.setCurrentUser(user.uid);
                await initState(); // Espera a que los datos iniciales se carguen.
                
                showApp();
                bindEventListeners(); // Vincula los eventos DESPUÉS de cargar los datos.

                if (getState().settings.adminUids.includes(user.uid)) {
                    await actions.loadAndSetAllUsers();
                }

                // Listener de datos con lógica de merge mejorada para proteger el estado.
                api.listenForDataChanges((newData) => {
                    const currentState = getState();
                    
                    const updatedState = { ...currentState, ...newData };

                    // MUY IMPORTANTE: Realizar un merge profundo para settings para evitar que
                    // una actualización parcial desde Firebase borre la configuración existente.
                    if (newData.settings) {
                        // Si vienen nuevos settings, los fusionamos con los existentes.
                        updatedState.settings = { ...currentState.settings, ...newData.settings };
                    } else {
                        // Si no vienen settings en la actualización, conservamos los que ya teníamos.
                        updatedState.settings = currentState.settings;
                    }

                    // `allUsers` y `permissions` se gestionan localmente en la sesión del usuario,
                    // por lo que no deben ser sobrescritos por el listener de datos compartidos.
                    updatedState.allUsers = currentState.allUsers;
                    updatedState.permissions = currentState.permissions;

                    setState(updatedState);
                });
                
                switchPage('inicio');
                isAppInitialized = true; // Marca la app como inicializada.

            } else {
                showAuthError('Tu cuenta está pendiente de aprobación por un administrador.');
                api.logoutUser();
            }
        } else {
            api.setCurrentUser(null);
            hideApp();
            isAppInitialized = false; // Resetea el guardián al cerrar sesión.
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
