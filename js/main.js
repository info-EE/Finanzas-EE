// --- App Initialization ---
// Importa las funciones necesarias de Firebase v9
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

import { subscribe, initState, setState } from './store.js';
import { bindEventListeners } from './handlers.js';
import { renderAll, switchPage, showApp, hideApp, updateConnectionStatus, showAuthError } from './ui.js';
import * as api from './api.js';

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
        // Si Firebase falla, muestra un mensaje de error y detiene la app
        document.body.innerHTML = `<div style="color: white; text-align: center; padding: 50px; font-family: sans-serif;">
            <h1 style="font-size: 24px; margin-bottom: 20px;">Error Crítico de Conexión</h1>
            <p>No se pudo conectar con los servicios de la base de datos. Por favor, intente refrescar la página.</p>
        </div>`;
        return; // Detiene la ejecución si Firebase no se inicializa
    }

    // 3. Configuración de la App (igual que antes)
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = '#e0e0e0';
    
    bindEventListeners();
    subscribe(renderAll);

    // 4. Manejador de Autenticación
    onAuthStateChanged(api.getAuthInstance(), async (user) => {
        if (user) {
            let userProfile = await api.getUserProfile(user.uid);

            if (!userProfile) {
                // Si el perfil no existe, es un usuario antiguo. Lo creamos como activo.
                console.log(`Creando perfil para usuario existente: ${user.uid}`);
                await api.createUserProfile(user.uid, user.email, 'activo');
                userProfile = { status: 'activo' }; // Asumimos que ahora es activo.
            }

            if (userProfile.status === 'activo') {
                // El usuario está aprobado, carga la aplicación.
                api.setCurrentUser(user.uid);
                showApp();
                await initState();
                api.listenForDataChanges((newData) => {
                    setState(newData);
                });
                switchPage('inicio');
            } else {
                // El usuario no está aprobado.
                showAuthError('Tu cuenta está pendiente de aprobación por un administrador.');
                await api.logoutUser();
            }
        } else {
            // El usuario no está conectado.
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

// Envuelve la ejecución en un listener que espera a que el DOM esté completamente cargado.
document.addEventListener('DOMContentLoaded', main);
