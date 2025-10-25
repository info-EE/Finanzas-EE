// --- App Initialization ---
// Importa las funciones necesarias de Firebase v9
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

import { subscribe, initState, setState, getState, getDefaultState } from './store.js'; // Importar getDefaultState
// *** CORRECCIÓN: Importar bindAuthEventListeners y mantener bindEventListeners ***
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

// Función principal que se ejecuta al cargar la página
function main() {
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

    // *** NUEVO: Vincular eventos de autenticación INMEDIATAMENTE ***
    bindAuthEventListeners();

    // 3. Configurar el Manejador de Autenticación
    onAuthStateChanged(api.getAuthInstance(), async (user) => {
        if (user) {
            // Comprobar si el UID o el EMAIL están en las listas de administradores por defecto
            const isAdminByUid = defaultAdminsByUid.includes(user.uid);
            const isAdminByEmail = defaultAdminsByEmail.includes(user.email);
            const isAdmin = isAdminByUid || isAdminByEmail; // Es admin si cumple CUALQUIERA

            if (isAppInitialized) {
                 // Si ya está inicializado y es el mismo usuario, no hacer nada más.
                 // Si cambia de usuario (muy raro sin logout), recargar podría ser una opción,
                 // pero por ahora, asumimos que el flujo normal es login -> logout.
                 // Podríamos añadir una comprobación api.getCurrentUserId() !== user.uid si fuera necesario.
                 return;
            }


            let userProfile = await api.getUserProfile(user.uid);

            if (!userProfile || !userProfile.email) {
                 console.log("Creando perfil de usuario...");
                 // Asegurarse de pasar el estado correcto ('activo' si es admin por defecto, 'pendiente' si no)
                 await api.createUserProfile(user.uid, user.email, isAdmin ? 'activo' : 'pendiente');
                 userProfile = await api.getUserProfile(user.uid); // Recargar perfil después de crearlo
                 console.log("Perfil creado:", userProfile);
            }

            // --- Lógica de Acceso Corregida (simplificada) ---
            let canAccess = false;
            if (isAdmin) {
                console.log("Usuario administrador por defecto detectado (UID o Email).");
                canAccess = true;
                // Si es admin por defecto y su perfil no está 'activo', corregirlo
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
            // --- Fin de Lógica de Acceso Corregida ---

            if (canAccess) {
                api.setCurrentUser(user.uid);
                await initState(); // Espera a que los datos iniciales se carguen.

                showApp();
                // *** CORRECCIÓN: Llamar a bindEventListeners DESPUÉS de mostrar la app y cargar datos ***
                bindEventListeners();

                // Siempre cargar usuarios si el usuario actual TIENE permisos de admin (no solo por defecto)
                const finalPermissions = getState().permissions; // Obtener permisos finales después de initState
                const hasAdminPermissions = finalPermissions && finalPermissions.manage_users;

                if (hasAdminPermissions) {
                    await actions.loadAndSetAllUsers();
                    // Escuchar cambios en la lista de usuarios solo si tiene permisos
                    api.listenForAllUsersChanges((allUsers) => {
                         setState({ allUsers });
                    });
                } else {
                     setState({ allUsers: [] }); // Limpiar lista si no tiene permisos
                }

                // Listener de datos compartidos (siempre activo para usuarios con acceso)
                api.listenForDataChanges((newData) => {
                    const currentState = getState();
                     // Volver a comprobar permisos por si acaso cambiaron remotamente
                    const currentPermissions = currentState.permissions;
                    const canManageUsersNow = currentPermissions && currentPermissions.manage_users;

                    const updatedState = { ...currentState, ...newData };

                    // Merge settings properly
                    if (newData.settings) {
                        updatedState.settings = { ...currentState.settings, ...newData.settings };
                    } else {
                        updatedState.settings = currentState.settings;
                    }

                    // Asegurarse de que `allUsers` no se sobrescriba si no puede gestionar usuarios
                    if (!canManageUsersNow) {
                       updatedState.allUsers = currentState.allUsers || []; // Ensure it's an array
                    }
                    // `permissions` siempre se calcula al inicio, no se toma del listener
                    updatedState.permissions = currentState.permissions;

                    setState(updatedState);
                });

                switchPage('inicio');
                isAppInitialized = true; // Marca la app como inicializada.

            } else {
                 // Mostrar mensaje solo si el perfil existe y está pendiente
                if (userProfile && userProfile.status === 'pendiente') {
                    showAuthError('Tu cuenta está pendiente de aprobación por un administrador.');
                } else {
                    // Mensaje genérico si no hay perfil o el estado es inesperado
                    showAuthError('No tienes permiso para acceder a esta aplicación.');
                }
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

// --- CORRECCIÓN: Ejecutar lucide.createIcons() con un pequeño retraso Y especificando los elementos ---
document.addEventListener('DOMContentLoaded', () => {
    // Añadir un pequeño retraso
    setTimeout(() => {
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            try {
                // *** INICIO DE LA MODIFICACIÓN ***
                // Especificamos que solo procese los elementos <i> con el atributo data-lucide
                lucide.createIcons({
                    nodes: document.querySelectorAll('i[data-lucide]')
                });
                // *** FIN DE LA MODIFICACIÓN ***
                console.log("Lucide icons created on DOMContentLoaded (with delay).");
            } catch (error) {
                console.error("Error creating Lucide icons on DOMContentLoaded (with delay):", error);
            }
        } else {
            console.error("Lucide library not available on DOMContentLoaded (with delay).");
        }
    }, 50); // 50 milisegundos de retraso
});
