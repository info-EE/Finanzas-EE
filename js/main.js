// --- App Initialization ---
// Importa las funciones necesarias de Firebase v9
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

import { subscribe, initState, setState, getState, getDefaultState } from './store.js'; // Importar getDefaultState
import { bindAuthEventListeners, bindEventListeners } from './handlers.js';
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

// --- NUEVO: Función para crear iconos iniciales que devuelve una Promesa ---
function createInitialIcons() {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (typeof lucide !== 'undefined' && lucide.createIcons) {
                try {
                    lucide.createIcons({
                        nodes: document.querySelectorAll('i[data-lucide]')
                    });
                    console.log("Lucide icons created on DOMContentLoaded (with delay).");
                    resolve(); // Resuelve la promesa indicando éxito
                } catch (error) {
                    console.error("Error creating Lucide icons on DOMContentLoaded (with delay):", error);
                    reject(error); // Rechaza la promesa en caso de error
                }
            } else {
                const errorMsg = "Lucide library not available on DOMContentLoaded (with delay).";
                console.error(errorMsg);
                reject(new Error(errorMsg)); // Rechaza si Lucide no está disponible
            }
        }, 50); // Mantenemos el retraso de 50ms
    });
}


// --- MODIFICADO: Función principal ahora es async para usar await ---
async function main() {
    let db;
    let isAppInitialized = false; // Guardián de inicialización
    const defaultState = getDefaultState(); // Obtener estado por defecto una vez
    const defaultAdminsByUid = defaultState.settings.adminUids || [];
    const defaultAdminsByEmail = defaultState.settings.adminEmails || []; // Usar emails del estado por defecto

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

    // 2. Configurar Chart.js y el Store
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = '#e0e0e0';
    subscribe(renderAll);

    // *** NUEVO: Esperar a que los iconos iniciales se creen ANTES de vincular eventos de autenticación ***
    try {
        await createInitialIcons(); // Espera a que la promesa se resuelva
        bindAuthEventListeners(); // Vincula los eventos de autenticación DESPUÉS de crear los iconos
    } catch (error) {
        console.error("No se pudieron crear los iconos iniciales o vincular los eventos de autenticación:", error);
        // Podrías mostrar un mensaje al usuario aquí si fallan los iconos
    }


    // 3. Configurar el Manejador de Autenticación
    onAuthStateChanged(api.getAuthInstance(), async (user) => {
        if (user) {
            // Comprobar si el UID o el EMAIL están en las listas de administradores por defecto
            const isAdminByUid = defaultAdminsByUid.includes(user.uid);
            const isAdminByEmail = defaultAdminsByEmail.includes(user.email);
            const isAdmin = isAdminByUid || isAdminByEmail; // Es admin si cumple CUALQUIERA

            if (isAppInitialized) {
                 return;
            }

            let userProfile = await api.getUserProfile(user.uid);

            if (!userProfile || !userProfile.email) {
                 console.log("Creando perfil de usuario...");
                 await api.createUserProfile(user.uid, user.email, isAdmin ? 'activo' : 'pendiente');
                 userProfile = await api.getUserProfile(user.uid);
                 console.log("Perfil creado:", userProfile);
            }

            // Lógica de Acceso
            let canAccess = false;
            if (isAdmin) {
                console.log("Usuario administrador por defecto detectado (UID o Email).");
                canAccess = true;
                if (userProfile && userProfile.status !== 'activo') {
                    console.log("Corrigiendo estado del administrador por defecto a 'activo'...");
                    await api.updateUserPermissions(user.uid, { status: 'activo' });
                    userProfile = await api.getUserProfile(user.uid);
                }
            } else if (userProfile && userProfile.status === 'activo') {
                 console.log("Usuario regular con estado 'activo' detectado.");
                 canAccess = true;
            } else {
                 console.log(`Acceso denegado. isAdmin: ${isAdmin}, userProfile status: ${userProfile ? userProfile.status : 'N/A'}`);
            }

            if (canAccess) {
                api.setCurrentUser(user.uid);
                await initState();

                showApp();
                // Vincula el resto de los eventos de la aplicación aquí
                bindEventListeners();

                const finalPermissions = getState().permissions;
                const hasAdminPermissions = finalPermissions && finalPermissions.manage_users;

                if (hasAdminPermissions) {
                    await actions.loadAndSetAllUsers();
                    api.listenForAllUsersChanges((allUsers) => {
                         setState({ allUsers });
                    });
                } else {
                     setState({ allUsers: [] });
                }

                api.listenForDataChanges((newData) => {
                    const currentState = getState();
                    const currentPermissions = currentState.permissions;
                    const canManageUsersNow = currentPermissions && currentPermissions.manage_users;
                    const updatedState = { ...currentState, ...newData };
                    if (newData.settings) {
                        updatedState.settings = { ...currentState.settings, ...newData.settings };
                    } else {
                        updatedState.settings = currentState.settings;
                    }
                    if (!canManageUsersNow) {
                       updatedState.allUsers = currentState.allUsers || [];
                    }
                    updatedState.permissions = currentState.permissions;
                    setState(updatedState);
                });

                switchPage('inicio');
                isAppInitialized = true;

            } else {
                if (userProfile && userProfile.status === 'pendiente') {
                    showAuthError('Tu cuenta está pendiente de aprobación por un administrador.');
                } else {
                    showAuthError('No tienes permiso para acceder a esta aplicación.');
                }
                api.logoutUser();
            }
        } else {
            api.setCurrentUser(null);
            hideApp();
            isAppInitialized = false;
        }
    });

    // 4. Valores por defecto para fechas
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

// --- ELIMINADO: Ya no necesitamos el listener separado para crear iconos ---

