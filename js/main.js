// --- App Initialization ---
// Importa las funciones necesarias de Firebase v9
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

import { subscribe, initState, setState, getState, getDefaultState } from './store.js';
import { bindAuthEventListeners, bindEventListeners } from './handlers.js';
import { renderAll, switchPage, showApp, hideApp, updateConnectionStatus } from './ui.js';
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

// --- Función para crear iconos iniciales ---
function createInitialIcons() {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (typeof lucide !== 'undefined' && lucide.createIcons) {
                try {
                    lucide.createIcons({
                        nodes: document.querySelectorAll('i[data-lucide]')
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
        }, 50);
    });
}

// --- Función principal async ---
async function main() {
    let db;
    let isAppInitialized = false;
    const defaultState = getDefaultState();
    const defaultAdminsByUid = defaultState.settings.adminUids || [];
    const defaultAdminsByEmail = defaultState.settings.adminEmails || [];

    // 1. Inicializar Firebase
    try {
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        db = getFirestore(app);
        api.initFirebaseServices(app, auth, db);
        updateConnectionStatus('success', 'Conectado'); // <-- AÑADIDO
    } catch (error) {
        console.error("Error CRÍTICO al inicializar Firebase:", error);
        updateConnectionStatus('error', 'Error de Conexión'); // <-- AÑADIDO
        document.body.innerHTML = `<div style="color: white; text-align: center; padding: 50px; font-family: sans-serif;"><h1>Error Crítico de Conexión</h1><p>No se pudo conectar con los servicios de la base de datos. Por favor, intente refrescar la página.</p></div>`;
        return;
    }

    // 2. Configurar Chart.js y el Store
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = '#e0e0e0';
    subscribe(renderAll);

    // 3. Crear iconos y vincular eventos de autenticación
    try {
        await createInitialIcons();
        bindAuthEventListeners();
    } catch (error) {
        console.error("No se pudieron crear los iconos iniciales o vincular los eventos de autenticación:", error);
    }

    // 4. Configurar el Manejador de Autenticación
    onAuthStateChanged(api.getAuthInstance(), async (user) => {
        if (user) {
            updateConnectionStatus('loading', 'Autenticando...'); // <-- AÑADIDO
            api.setCurrentUser(user.uid); // Mover aquí para tener el UID disponible
            setState({ currentUser: { uid: user.uid, email: user.email } }); // <-- AÑADIDO: Guardar usuario en el estado

            const isAdminByUid = defaultAdminsByUid.includes(user.uid);
            const isAdminByEmail = defaultAdminsByEmail.includes(user.email);
            const isAdmin = isAdminByUid || isAdminByEmail;

            let userProfile = await api.getUserProfile(user.uid);

            if (!userProfile || !userProfile.email) {
                console.log("Creando perfil de usuario...");
                await api.createUserProfile(user.uid, user.email, isAdmin ? 'activo' : 'pendiente');
                userProfile = await api.getUserProfile(user.uid);
                console.log("Perfil creado:", userProfile);
            }

            let canAccess = false;
            if (isAdmin) {
                console.log("Usuario administrador por defecto detectado (UID o Email).");
                canAccess = true;
                if (userProfile && userProfile.status !== 'activo') {
                    console.log("Corrigiendo estado del administrador por defecto a 'activo'...");
                    await api.updateUserPermissions(user.uid, { status: 'activo' });
                    userProfile = await api.getUserProfile(user.uid); // Recargar perfil actualizado
                }
            } else if (userProfile && userProfile.status === 'activo') {
                console.log("Usuario regular con estado 'activo' detectado.");
                canAccess = true;
            } else {
                console.log(`Acceso denegado. isAdmin: ${isAdmin}, userProfile status: ${userProfile ? userProfile.status : 'N/A'}`);
            }

            if (canAccess) {
                if (!isAppInitialized) {
                    await initState(); // Carga los datos iniciales y permisos (una vez)

                    showApp();
                    bindEventListeners(); // Vincula el resto de los eventos

                    const finalPermissions = getState().permissions;
                    const hasAdminPermissions = finalPermissions && finalPermissions.manage_users;

                    if (hasAdminPermissions) {
                        await actions.loadAndSetAllUsers(); // Carga inicial
                        api.listenForAllUsersChanges((allUsers) => { // Listener para usuarios
                             setState({ allUsers });
                        });
                    } else {
                         setState({ allUsers: [] });
                    }

                    // Configurar listeners de datos (solo la primera vez)
                    api.listenForCollectionChanges('accounts', (updatedAccounts) => {
                        setState({ accounts: updatedAccounts });
                    });
                    api.listenForCollectionChanges('transactions', (updatedTransactions) => {
                        setState({ transactions: updatedTransactions });
                    });
                    api.listenForCollectionChanges('documents', (updatedDocuments) => {
                        setState({ documents: updatedDocuments });
                    });
                    api.listenForCollectionChanges('clients', (updatedClients) => {
                        setState({ clients: updatedClients });
                    });
                    api.listenForCollectionChanges('investmentAssets', (updatedAssets) => {
                        setState({ investmentAssets: updatedAssets });
                    });
                    api.listenForSettingsChanges((updatedSettings) => {
                        const currentState = getState();
                        const mergedSettings = { ...currentState.settings, ...updatedSettings };

                        mergedSettings.incomeCategories = [...new Set([...defaultState.incomeCategories, ...(updatedSettings?.incomeCategories || [])])];
                        mergedSettings.expenseCategories = [...new Set([...defaultState.expenseCategories, ...(updatedSettings?.expenseCategories || [])])];
                        mergedSettings.invoiceOperationTypes = [...new Set([...defaultState.invoiceOperationTypes, ...(updatedSettings?.invoiceOperationTypes || [])])];
                        mergedSettings.taxIdTypes = [...new Set([...defaultState.taxIdTypes, ...(updatedSettings?.taxIdTypes || [])])];

                        setState({ settings: mergedSettings });
                    });

                    switchPage('inicio');
                    isAppInitialized = true; // Marcamos como inicializado
                    updateConnectionStatus('success', 'Sincronizado'); // <-- AÑADIDO
                } else {
                     // Si ya estaba inicializado (cambio de usuario?), recargar datos podría ser necesario
                     // Por ahora, solo actualizamos estado de conexión
                     updateConnectionStatus('success', 'Sincronizado'); // <-- AÑADIDO
                }

            } else {
                // Si no puede acceder, muestra el error apropiado (handlers.js se encarga de esto)
                // Y desloguea
                try {
                    await api.logoutUser();
                } catch (logoutError) {
                    console.error("Error al intentar desloguear usuario sin acceso:", logoutError);
                }
                // hideApp() se llamará automáticamente por onAuthStateChanged al cambiar a null
            }
        } else {
            // Usuario deslogueado
            api.setCurrentUser(null);
            setState({ currentUser: null }); // <-- AÑADIDO
            hideApp();
            isAppInitialized = false; // Resetear al cerrar sesión
            updateConnectionStatus('success', 'Desconectado'); // <-- AÑADIDO
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
        if (monthInput) monthInput.value = currentMonth;
    });
}

// 6. Esperar a que el DOM esté listo para ejecutar main
document.addEventListener('DOMContentLoaded', main);

