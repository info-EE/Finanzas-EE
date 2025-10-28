// --- App Initialization ---
// Importa las funciones necesarias de Firebase v9
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// === Importaciones locales (Descomentando Store, API y UI) ===
import { subscribe, initState, setState, getState, getDefaultState } from './store.js';
// import { bindAuthEventListeners, bindEventListeners } from './handlers.js'; // Sigue comentado
import { renderAll, switchPage, showApp, hideApp, updateConnectionStatus } from './ui.js'; // <-- DESCOMENTADO
import * as api from './api.js';
// import * as actions from './actions.js'; // Sigue comentado
// === FIN: Importaciones locales ===

console.log("--- main.js loaded (Testing Store, API & UI) ---");

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

// --- Función principal async (Restaurando partes de UI) ---
async function main() {
    console.log("--- main() function started (Testing Store, API & UI) ---");
    let app, auth, db;
    let isAppInitialized = false;
    const defaultState = getDefaultState();
    const defaultAdminsByUid = defaultState.settings.adminUids || [];
    const defaultAdminsByEmail = defaultState.settings.adminEmails || [];

    // 1. Inicializar Firebase
    try {
        console.log("Initializing Firebase...");
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        api.initFirebaseServices(app, auth, db);
        console.log("Firebase initialized successfully.");
        updateConnectionStatus('success', 'Conectado'); // <-- DESCOMENTADO
    } catch (error) {
        console.error("!!! CRITICAL ERROR initializing Firebase:", error);
        // Intentar mostrar error usando UI si está disponible
        try { updateConnectionStatus('error', 'Error Conexión'); } catch (_) {}
        document.body.innerHTML = `<div style="color: red; padding: 20px;">Error Crítico al inicializar Firebase.</div>`;
        return;
    }

    // 2. Configurar Chart.js y el Store (Restaurado)
    try {
        console.log("Configuring Chart.js and subscribing to store...");
        Chart.defaults.font.family = "'Inter', sans-serif";
        Chart.defaults.color = '#e0e0e0';
        subscribe(renderAll); // <-- DESCOMENTADO (Ahora usa renderAll de ui.js)
        console.log("Chart.js configured and subscribed successfully.");
    } catch (error) {
        console.error("!!! ERROR configuring Chart.js or subscribing:", error);
    }

    // 3. Crear iconos y vincular eventos de autenticación (Sigue COMENTADO)
    // try { ... }

    // 4. Configurar el Manejador de Autenticación (Restaurando show/hide App)
    try {
        console.log("Setting up onAuthStateChanged listener...");
        const authInstance = api.getAuthInstance();
        onAuthStateChanged(authInstance, async (user) => {
             console.log("onAuthStateChanged triggered. User:", user ? user.email : 'null');
             if (user) {
                 updateConnectionStatus('loading', 'Autenticando...'); // <-- DESCOMENTADO
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
                        await initState();
                        console.log("initState() completed.");
                        showApp(); // <-- DESCOMENTADO
                        // bindEventListeners(); // Sigue comentado
                        // ... listeners de datos siguen comentados ...
                        // switchPage('inicio'); // Sigue comentado (renderAll debería manejar la vista inicial)
                        isAppInitialized = true;
                        updateConnectionStatus('success', 'Sincronizado'); // <-- DESCOMENTADO
                        console.log("App shown and initialized."); // Log de confirmación
                    } else {
                         console.log("App already initialized.");
                         updateConnectionStatus('success', 'Sincronizado'); // <-- DESCOMENTADO
                    }
                 } else {
                     console.log("Acceso denegado, deslogueando...");
                     // showAuthError('Acceso denegado o pendiente de aprobación.'); // Sigue comentado (depende de handlers)
                     await api.logoutUser(); // hideApp se llamará al cambiar user a null
                 }
             } else {
                 api.setCurrentUser(null);
                 setState({ currentUser: null });
                 hideApp(); // <-- DESCOMENTADO
                 isAppInitialized = false;
                 updateConnectionStatus('success', 'Desconectado'); // <-- DESCOMENTADO
                 console.log("User logged out or not logged in. Auth UI shown.");
             }
        });
        console.log("onAuthStateChanged listener attached.");
    } catch (error) {
        console.error("!!! ERROR setting up onAuthStateChanged listener:", error);
    }

    // 5. Valores por defecto para fechas (Sigue COMENTADO)
    // try { ... }

    console.log("--- main() function finished (Testing Store, API & UI) ---");
}

// 6. Esperar a que el DOM esté listo para ejecutar main
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded event fired.");
    main().catch(error => {
        console.error("!!! UNHANDLED ERROR in main() execution:", error);
        document.body.innerHTML = `<div style="color: red; padding: 20px;">Error Crítico.<pre>${error.stack || error}</pre></div>`;
    });
});

