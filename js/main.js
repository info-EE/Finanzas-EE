// --- App Initialization ---
// Importa las funciones necesarias de Firebase v9
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// === Importaciones locales (Descomentando Store y API) ===
import { subscribe, initState, setState, getState, getDefaultState } from './store.js'; // <-- DESCOMENTADO
// import { bindAuthEventListeners, bindEventListeners } from './handlers.js'; // Sigue comentado
// import { renderAll, switchPage, showApp, hideApp, updateConnectionStatus } from './ui.js'; // Sigue comentado
import * as api from './api.js'; // <-- DESCOMENTADO
// import * as actions from './actions.js'; // Sigue comentado
// === FIN: Importaciones locales ===

console.log("--- main.js loaded (Testing Store & API) ---");

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

// --- Función para crear iconos iniciales (Sigue COMENTADA) ---
/* ... */

// --- Función principal async (Parcialmente restaurada) ---
async function main() {
    console.log("--- main() function started (Testing Store & API) ---");
    let app, auth, db;
    let isAppInitialized = false; // Flag para controlar la inicialización
    const defaultState = getDefaultState(); // Necesario para initState
    const defaultAdminsByUid = defaultState.settings.adminUids || [];
    const defaultAdminsByEmail = defaultState.settings.adminEmails || [];

    // 1. Inicializar Firebase
    try {
        console.log("Initializing Firebase...");
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        api.initFirebaseServices(app, auth, db); // <-- DESCOMENTADO
        console.log("Firebase initialized successfully.");
        // updateConnectionStatus('success', 'Conectado'); // Comentado (depende de ui.js)
    } catch (error) {
        console.error("!!! CRITICAL ERROR initializing Firebase:", error);
        document.body.innerHTML = `<div style="color: red; padding: 20px;">Error Crítico al inicializar Firebase.</div>`;
        return;
    }

    // 2. Configurar Chart.js y el Store (Parcialmente restaurado)
    try {
        console.log("Configuring Chart.js (defaults only) and subscribing to store...");
        Chart.defaults.font.family = "'Inter', sans-serif"; // Configuración global
        Chart.defaults.color = '#e0e0e0';
        // subscribe(renderAll); // Comentado (depende de ui.js)
        console.log("Chart.js configured (defaults). Subscription skipped.");
    } catch (error) {
        console.error("!!! ERROR configuring Chart.js defaults:", error);
    }

    // 3. Crear iconos y vincular eventos de autenticación (Sigue COMENTADO)
    // try { ... }

    // 4. Configurar el Manejador de Autenticación (Restaurado)
    try {
        console.log("Setting up onAuthStateChanged listener...");
        const authInstance = api.getAuthInstance(); // Usar la instancia de api.js
        onAuthStateChanged(authInstance, async (user) => {
             console.log("onAuthStateChanged triggered. User:", user ? user.email : 'null');
             if (user) {
                 // updateConnectionStatus('loading', 'Autenticando...'); // Comentado
                 api.setCurrentUser(user.uid);
                 setState({ currentUser: { uid: user.uid, email: user.email } });

                 const isAdminByUid = defaultAdminsByUid.includes(user.uid);
                 const isAdminByEmail = defaultAdminsByEmail.includes(user.email);
                 const isAdmin = isAdminByUid || isAdminByEmail;
                 let userProfile = await api.getUserProfile(user.uid);

                 if (!userProfile || !userProfile.email) {
                    console.log("Creando perfil de usuario...");
                    await api.createUserProfile(user.uid, user.email, isAdmin ? 'activo' : 'pendiente');
                    userProfile = await api.getUserProfile(user.uid);
                 }

                 let canAccess = isAdmin || (userProfile && userProfile.status === 'activo');
                 if (isAdmin && userProfile && userProfile.status !== 'activo') {
                    console.log("Corrigiendo estado del admin...");
                    await api.updateUserPermissions(user.uid, { status: 'activo' });
                    userProfile = await api.getUserProfile(user.uid);
                 }

                 if (canAccess) {
                    if (!isAppInitialized) {
                        console.log("User can access. Calling initState()...");
                        await initState(); // <-- LLAMADA A INITSTATE RESTAURADA
                        console.log("initState() completed.");
                        // showApp(); // Comentado
                        // bindEventListeners(); // Comentado
                        // ... listeners de datos comentados ...
                        // switchPage('inicio'); // Comentado
                        isAppInitialized = true;
                        // updateConnectionStatus('success', 'Sincronizado'); // Comentado
                        document.body.innerHTML = `<div style="color: white; padding: 20px;">Autenticado y estado inicializado (initState OK). UI/Listeners comentados. Revisa la consola.</div>`;
                    } else {
                         console.log("App already initialized.");
                         // updateConnectionStatus('success', 'Sincronizado'); // Comentado
                    }
                 } else {
                     console.log("Acceso denegado, deslogueando...");
                     // showAuthError('Acceso denegado o pendiente de aprobación.'); // Comentado
                     await api.logoutUser();
                 }
             } else {
                 api.setCurrentUser(null);
                 setState({ currentUser: null });
                 // hideApp(); // Comentado
                 isAppInitialized = false;
                 // updateConnectionStatus('success', 'Desconectado'); // Comentado
                 document.body.innerHTML = `<div style="color: white; padding: 20px;">No autenticado. UI comentada. Revisa la consola para errores.</div>`; // Mostrar mensaje si no está logueado
                 console.log("User logged out or not logged in.");
             }
        });
        console.log("onAuthStateChanged listener attached.");
    } catch (error) {
        console.error("!!! ERROR setting up onAuthStateChanged listener:", error);
    }

    // 5. Valores por defecto para fechas (Sigue COMENTADO)
    // try { ... }

    console.log("--- main() function finished (Testing Store & API) ---");
}

// 6. Esperar a que el DOM esté listo para ejecutar main
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded event fired.");
    main().catch(error => {
        console.error("!!! UNHANDLED ERROR in main() execution:", error);
        document.body.innerHTML = `<div style="color: red; padding: 20px;">Error Crítico durante la ejecución de main(). Revisa la consola.<pre>${error.stack || error}</pre></div>`;
    });
});

