import { updateConnectionStatus, showAuthError } from './ui.js';

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

let app;
let db;
let auth;
let currentUserId = null;
let dataDocRef = null;
let unsubscribeFromData = null;

// Esta función se llamará desde main.js DESPUÉS de que la página haya cargado
export function initFirebase() {
    try {
        // Ahora usamos el objeto global 'firebase' que se carga en index.html
        app = firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        auth = firebase.auth();
        return true; // Devolvemos true si la inicialización fue exitosa
    } catch (error) {
        console.error("Error al inicializar Firebase:", error);
        updateConnectionStatus('error', 'Error de Firebase');
        return false; // Devolvemos false si hubo un error
    }
}

// --- Funciones de Autenticación ---

export function onAuthChange(callback) {
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUserId = user.uid;
            // La sintaxis para referenciar un documento cambia con la versión 'compat'
            dataDocRef = db.collection('usuarios').doc(currentUserId).collection('estado').doc('mainState');
        } else {
            currentUserId = null;
            dataDocRef = null;
            if (unsubscribeFromData) {
                unsubscribeFromData();
                unsubscribeFromData = null;
            }
        }
        callback(user);
    });
}

function translateAuthError(errorCode) {
    switch (errorCode) {
        case 'auth/email-already-in-use':
            return 'Este correo electrónico ya está registrado.';
        case 'auth/invalid-email':
            return 'El formato del correo electrónico no es válido.';
        case 'auth/weak-password':
            return 'La contraseña debe tener al menos 6 caracteres.';
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
            return 'El correo o la contraseña son incorrectos.';
        default:
            return 'Ha ocurrido un error. Inténtalo de nuevo más tarde.';
    }
}

export async function registerUser(email, password) {
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        const userDocRef = db.collection('users').doc(user.uid);
        await userDocRef.set({
            email: user.email,
            status: 'pendiente'
        });

        showAuthError('Registro exitoso. Tu cuenta está pendiente de aprobación por un administrador.');
        
        await auth.signOut();

    } catch (error) {
        console.error("Error en el registro:", error.code);
        showAuthError(translateAuthError(error.code));
    }
}

export async function loginUser(email, password) {
    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        console.error("Error en el inicio de sesión:", error.code);
        showAuthError(translateAuthError(error.code));
    }
}

export async function logoutUser() {
    try {
        await auth.signOut();
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
    }
}


// --- Funciones de Base de Datos ---

export async function loadData() {
    if (!currentUserId || !dataDocRef) {
        updateConnectionStatus('error', 'No autenticado');
        return null;
    }
    updateConnectionStatus('loading', 'Cargando datos...');
    try {
        const docSnap = await dataDocRef.get();
        if (docSnap.exists) {
            console.log("Datos cargados desde Firebase.");
            updateConnectionStatus('success', 'Datos cargados');
            return docSnap.data();
        } else {
            console.log("No se encontró ningún documento, se usará el estado por defecto.");
            updateConnectionStatus('success', 'Listo');
            return null;
        }
    } catch (error) {
        console.error("Error al cargar datos desde Firebase:", error);
        updateConnectionStatus('error', 'Error de carga');
        return null;
    }
}

export async function saveData(state) {
    if (!currentUserId || !dataDocRef) {
        updateConnectionStatus('error', 'No autenticado');
        return;
    }
    updateConnectionStatus('loading', 'Guardando...');
    try {
        const stateToSave = { ...state, activeReport: { type: null, data: [] }, activeIvaReport: null };
        await dataDocRef.set(stateToSave, { merge: true });
        console.log("Datos guardados en Firebase.");
        setTimeout(() => updateConnectionStatus('success', 'Guardado'), 1000);
    } catch (error) {
        console.error("Error al guardar datos en Firebase:", error);
        updateConnectionStatus('error', 'Error al guardar');
    }
}

export function listenForDataChanges(onDataChange) {
    if (unsubscribeFromData) {
        unsubscribeFromData();
    }
    if (!currentUserId || !dataDocRef) return;
    
    unsubscribeFromData = dataDocRef.onSnapshot((doc) => {
        if (doc.exists) {
            console.log("Se detectó un cambio en Firebase. Actualizando estado local.");
            updateConnectionStatus('success', 'Sincronizado');
            onDataChange(doc.data());
        }
    }, (error) => {
        console.error("Error en el listener de Firebase:", error);
        updateConnectionStatus('error', 'Desconectado');
    });
}

