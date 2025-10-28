// --- App Initialization ---
// Importa las funciones necesarias de Firebase v9
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

import { subscribe, initState, setState, getState, getDefaultState } from './store.js';
import { bindAuthEventListeners, bindEventListeners } from './handlers.js';
import { renderAll, switchPage, showApp, hideApp, updateConnectionStatus } from './ui/index.js';
import * as api from './api.js';
import * as actions from './actions.js';

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

// --- Función para crear iconos iniciales ---
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


// --- Función principal async ---
async function main() {
    let db;
    let isAppInitialized = false; // Flag para controlar la inicialización
    const defaultState = getDefaultState();
    const defaultAdminsByUid = defaultState.settings.adminUids || [];
    const defaultAdminsByEmail = defaultState.settings.adminEmails || [];

    // 1. Inicializar Firebase
    try {
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        db = getFirestore(app);
        api.initFirebaseServices(app, auth, db); // Pasar instancias a api.js
        updateConnectionStatus('success', 'Conectado'); // <-- AÑADIDO
    } catch (error) {
        console.error("Error CRÍTICO al inicializar Firebase:", error);
        updateConnectionStatus('error', 'Error de Conexión'); // <-- AÑADIDO
        // Mostrar mensaje de error crítico al usuario
        document.body.innerHTML = `<div style="color: white; text-align: center; padding: 50px; font-family: sans-serif;"><h1>Error Crítico de Conexión</h1><p>No se pudo conectar con los servicios de la base de datos. Por favor, intente refrescar la página.</p></div>`;
        return; // Detener ejecución si Firebase falla
    }

    // 2. Configurar Chart.js y el Store
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = '#e0e0e0';
    subscribe(renderAll); // Suscribirse a cambios de estado para re-renderizar

    // 3. Crear iconos y vincular eventos de autenticación
    try {
        await createInitialIcons();
        bindAuthEventListeners(); // Vincula solo los listeners de login/registro
    } catch (error) {
        console.error("No se pudieron crear los iconos iniciales o vincular los eventos de autenticación:", error);
        // Continuar aunque fallen los iconos puede ser aceptable, pero loguear el error
    }

    // 4. Configurar el Manejador de Autenticación
    onAuthStateChanged(api.getAuthInstance(), async (user) => {
        if (user) {
            updateConnectionStatus('loading', 'Autenticando...'); // <-- AÑADIDO
            api.setCurrentUser(user.uid); // Establecer UID globalmente en api.js
            setState({ currentUser: { uid: user.uid, email: user.email } }); // <-- AÑADIDO: Guardar usuario en el estado

            // Determinar si es administrador (por UID o Email predefinido)
            const isAdminByUid = defaultAdminsByUid.includes(user.uid);
            const isAdminByEmail = defaultAdminsByEmail.includes(user.email);
            const isAdmin = isAdminByUid || isAdminByEmail;

            // Obtener perfil de usuario de Firestore
            let userProfile = await api.getUserProfile(user.uid);

            // Si no existe perfil o falta el email, crearlo
            if (!userProfile || !userProfile.email) {
                console.log("Creando perfil de usuario...");
                // Crear perfil con estado 'pendiente' a menos que sea admin por defecto
                await api.createUserProfile(user.uid, user.email, isAdmin ? 'activo' : 'pendiente');
                userProfile = await api.getUserProfile(user.uid); // Recargar perfil
                console.log("Perfil creado:", userProfile);
            }

            // Verificar si el usuario puede acceder
            let canAccess = false;
            if (isAdmin) {
                console.log("Usuario administrador por defecto detectado (UID o Email).");
                canAccess = true;
                // Corregir estado si es admin pero está pendiente
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
                // Solo inicializar la app completamente la primera vez que se accede
                if (!isAppInitialized) {
                    await initState(); // Carga los datos iniciales y permisos (una vez)

                    showApp(); // Mostrar interfaz principal
                    bindEventListeners(); // Vincula el resto de los eventos

                    // Verificar si el usuario tiene permisos de administrador (después de initState)
                    const finalPermissions = getState().permissions;
                    const hasAdminPermissions = finalPermissions && finalPermissions.manage_users;

                    // Cargar lista de usuarios si es admin
                    if (hasAdminPermissions) {
                        await actions.loadAndSetAllUsers(); // Carga inicial
                        // Escuchar cambios en la lista de usuarios
                        api.listenForAllUsersChanges((allUsers) => {
                             // Filtrar usuarios bloqueados antes de actualizar el estado
                             const { settings } = getState();
                             const blockedUserIds = (settings && settings.blockedUserIds) || [];
                             const filteredUsers = allUsers.filter(u => u.email && !blockedUserIds.includes(u.id));
                             setState({ allUsers: filteredUsers });
                        });
                    } else {
                         // Si no es admin, asegurar que la lista esté vacía
                         setState({ allUsers: [] });
                    }


                    // Configurar listeners de datos (solo la primera vez)
                    api.listenForCollectionChanges('accounts', (updatedAccounts) => {
                        setState({ accounts: updatedAccounts });
                         // Notificar manualmente si setState no lo hace automáticamente
                         // (depende de la implementación de setState/subscribe)
                         renderAll();
                    });
                    api.listenForCollectionChanges('transactions', (updatedTransactions) => {
                        setState({ transactions: updatedTransactions });
                         renderAll();
                    });
                    api.listenForCollectionChanges('documents', (updatedDocuments) => {
                        setState({ documents: updatedDocuments });
                         renderAll();
                    });
                    api.listenForCollectionChanges('clients', (updatedClients) => {
                        setState({ clients: updatedClients });
                         renderAll();
                    });
                     api.listenForCollectionChanges('investmentAssets', (updatedAssets) => {
                        setState({ investmentAssets: updatedAssets });
                         renderAll();
                    });
                    // Listener para settings con fusión inteligente
                    api.listenForSettingsChanges((updatedSettings) => {
                        const currentState = getState();
                        // Crear un objeto base con los settings por defecto
                        const defaultStateSettings = getDefaultState().settings;
                        // Mezclar: estado actual < settings por defecto < settings actualizados
                        const mergedSettings = {
                            ...defaultStateSettings, // Base
                            ...currentState.settings, // Actuales (por si acaso)
                            ...updatedSettings       // Remotos
                        };

                        // Asegurar que las categorías esenciales y admin UIDs/Emails no se sobrescriban
                        mergedSettings.adminUids = defaultStateSettings.adminUids;
                        mergedSettings.adminEmails = defaultStateSettings.adminEmails;
                        // Asegurar que blockedUserIds sea un array
                        mergedSettings.blockedUserIds = updatedSettings?.blockedUserIds || currentState.settings.blockedUserIds || [];

                        // Fusionar categorías usando Set para evitar duplicados
                        const mergeCategories = (defaultCats, updatedCats) => [...new Set([...defaultCats, ...(updatedCats || [])])];
                        mergedSettings.incomeCategories = mergeCategories(defaultState.incomeCategories, updatedSettings?.incomeCategories);
                        mergedSettings.expenseCategories = mergeCategories(defaultState.expenseCategories, updatedSettings?.expenseCategories);
                        mergedSettings.invoiceOperationTypes = mergeCategories(defaultState.invoiceOperationTypes, updatedSettings?.invoiceOperationTypes);
                        mergedSettings.taxIdTypes = mergeCategories(defaultState.taxIdTypes, updatedSettings?.taxIdTypes);

                        setState({ settings: mergedSettings });
                        renderAll(); // Re-renderizar después de actualizar settings
                    });

                    switchPage('inicio'); // Ir a la página inicial
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
            hideApp(); // Ocultar interfaz principal, mostrar login
            isAppInitialized = false; // Resetear al cerrar sesión
            updateConnectionStatus('success', 'Desconectado'); // <-- AÑADIDO
        }
    });


    // 5. Valores por defecto para fechas (esto se puede ejecutar siempre)
    const today = new Date().toISOString().slice(0, 10);
    ['transaction-date', 'transfer-date', 'proforma-date', 'factura-fecha', 'report-date', 'investment-date', 'payment-date'].forEach(id => { // Añadido payment-date
        const el = document.getElementById(id);
        if (el) el.value = today;
    });
    // Valor por defecto para mes actual
    const currentMonth = new Date().toISOString().slice(0, 7);
    ['report-month', 'iva-month'].forEach(id => {
        const monthInput = document.getElementById(id);
        if (monthInput) monthInput.value = currentMonth;
    });
    // Valor por defecto para año actual
    const currentYear = new Date().getFullYear();
    ['report-year', 'report-year-sociedades'].forEach(id => { // Añadido report-year-sociedades
        const yearInput = document.getElementById(id);
        if (yearInput && yearInput.tagName === 'INPUT') yearInput.value = currentYear;
        // Para selects, asegurarse que el año actual esté entre las opciones
        if (yearInput && yearInput.tagName === 'SELECT') {
             let yearOptions = '';
             for (let i = 0; i < 5; i++) {
                 const year = currentYear - i;
                 yearOptions += `<option value="${year}" ${year === currentYear ? 'selected' : ''}>${year}</option>`;
             }
             yearInput.innerHTML = yearOptions;
        }
    });
}

// 6. Esperar a que el DOM esté listo para ejecutar main
document.addEventListener('DOMContentLoaded', main);

