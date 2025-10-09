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
        // 1. Inicializa Firebase y obtén las instancias de los servicios
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        db = getFirestore(app);
        
        // 2. Pasa estas instancias a tu módulo de API para que las use
        api.initFirebaseServices(app, auth, db);
        updateConnectionStatus('success', 'Conectado');

    } catch (error) {
        console.error("Error CRÍTICO al inicializar Firebase:", error);
        updateConnectionStatus('error', 'Error de Conexión');
        document.body.innerHTML = `<div style="color: white; text-align: center; padding: 50px; font-family: sans-serif;">
            <h1 style="font-size: 24px; margin-bottom: 20px;">Error Crítico de Conexión</h1>
            <p>No se pudo conectar con los servicios de la base de datos. Por favor, intente refrescar la página.</p>
        </div>`;
        return;
    }

    // 3. Configuración de la App
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = '#e0e0e0';
    
    bindEventListeners();
    subscribe(renderAll);

    // 4. Manejador de Autenticación
    onAuthStateChanged(api.getAuthInstance(), async (user) => {
        if (user) {
            let userProfile = await api.getUserProfile(user.uid);

            if (!userProfile) {
                // Si el perfil no existe, es un usuario antiguo (como el admin). Se lo creamos.
                await api.createUserProfile(user.uid, user.email, 'activo');
                userProfile = await api.getUserProfile(user.uid); // Volvemos a leerlo
            }

            if (userProfile && userProfile.status === 'activo') {
                api.setCurrentUser(user.uid);
                showApp();
                await initState();

                const { settings } = getState();
                // Comprobación de seguridad robusta para adminUids
                const isAdmin = settings && Array.isArray(settings.adminUids) && settings.adminUids.includes(user.uid);
                if (isAdmin) {
                    await actions.loadAndSetAllUsers();
                }

                api.listenForDataChanges((newData) => {
                    // Al recibir datos de Firebase, nos aseguramos de que el estado local
                    // no pierda propiedades esenciales (como 'settings') si no vienen en la actualización.
                    const currentState = getState();
                    const remoteData = newData || {};

                    // Creamos el nuevo estado, asegurando que settings no sea sobreescrito por null o undefined
                    const finalState = { ...currentState, ...remoteData };
                    finalState.settings = { 
                        ...(currentState.settings || {}), 
                        ...(remoteData.settings && typeof remoteData.settings === 'object' ? remoteData.settings : {}) 
                    };
                    
                    setState(finalState);
                });
                switchPage('inicio');
            } else {
                showAuthError('Tu cuenta está pendiente de aprobación por un administrador.');
                await api.logoutUser();
            }
        } else {
            api.setCurrentUser(null);
            hideApp();
        }
    });

    // 5. Valores por defecto para fechas
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

