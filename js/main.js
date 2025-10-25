// --- App Initialization ---
// Importa las funciones necesarias de Firebase v9
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

import { subscribe, initState, setState, getState, getDefaultState } from './store.js'; // Importar getDefaultState
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
    const defaultAdmins = getDefaultState().settings.adminUids || []; // Obtener admins por defecto

    // 1. Inicializar Firebase
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

    // --- CORRECCIÓN DE ICONOS MOVIDA AQUÍ ---
    // Llamar a lucide.createIcons() DESPUÉS de inicializar Firebase,
    // pero ANTES de configurar el listener de autenticación.
    try {
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
            console.log("Lucide icons created successfully from main.js (after Firebase init)");
        } else {
            console.error("Lucide library not available in main.js (after Firebase init)");
        }
    } catch (error) {
        console.error("Error creating Lucide icons from main.js (after Firebase init):", error);
    }
    // --- FIN DE LA CORRECCIÓN ---

    // 2. Configurar Chart.js y el Store
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = '#e0e0e0';
    subscribe(renderAll);

    // 3. Configurar el Manejador de Autenticación
    onAuthStateChanged(api.getAuthInstance(), async (user) => {
        if (user) {
            if (isAppInitialized) return; // Si ya está inicializado, no hacer nada más.

            const isAdmin = defaultAdmins.includes(user.uid);
            let userProfile = await api.getUserProfile(user.uid);

            if (!userProfile || !userProfile.email) {
                 console.log("Creando perfil de usuario...");
                 await api.createUserProfile(user.uid, user.email, isAdmin ? 'activo' : 'pendiente');
                 userProfile = await api.getUserProfile(user.uid); // Recargar perfil después de crearlo
                 console.log("Perfil creado:", userProfile);
            }

            // --- Lógica de Acceso Corregida ---
            let canAccess = false;
            if (isAdmin) {
                console.log("Usuario administrador detectado.");
                canAccess = true;
                // Si es admin y su perfil no está 'activo', corregirlo
                if (userProfile && userProfile.status !== 'activo') {
                    console.log("Corrigiendo estado del administrador a 'activo'...");
                    await api.updateUserPermissions(user.uid, { status: 'activo' });
                    userProfile = await api.getUserProfile(user.uid); // Recargar perfil actualizado
                }
            } else if (userProfile && userProfile.status === 'activo') {
                 console.log("Usuario regular con estado 'activo' detectado.");
                 canAccess = true;
            }
            // --- Fin de Lógica de Acceso Corregida ---

            if (canAccess) {
                api.setCurrentUser(user.uid);
                await initState(); // Espera a que los datos iniciales se carguen.
                
                showApp();
                bindEventListeners(); // Vincula los eventos DESPUÉS de cargar los datos.

                // Siempre cargar usuarios si el usuario actual es admin
                if (isAdmin) {
                    await actions.loadAndSetAllUsers();
                    // Escuchar cambios en la lista de usuarios solo si es admin
                    api.listenForAllUsersChanges((allUsers) => {
                         setState({ allUsers });
                    });
                } else {
                     setState({ allUsers: [] }); // Limpiar lista si no es admin
                }

                // Listener de datos compartidos (siempre activo para usuarios con acceso)
                api.listenForDataChanges((newData) => {
                    const currentState = getState();
                    const updatedState = { ...currentState, ...newData };

                    if (newData.settings) {
                        updatedState.settings = { ...currentState.settings, ...newData.settings };
                    } else {
                        updatedState.settings = currentState.settings;
                    }
                    
                    // Asegurarse de que `allUsers` no se sobrescriba si no es admin
                    if (!isAdmin) {
                       updatedState.allUsers = currentState.allUsers;
                    }
                    // `permissions` siempre se calcula al inicio, no se toma del listener
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

    // 4. Valores por defecto para fechas (esto puede ir al final)
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

// 5. Esperar a que el DOM esté listo para ejecutar main
document.addEventListener('DOMContentLoaded', main);

