import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { updateConnectionStatus, showAuthError } from './ui.js';

let app;
let db;
let auth;
let currentUserId = null;
let dataDocRef = null;
let unsubscribeFromData = null; // Para detener el listener al cerrar sesión

try {
    app = initializeApp({});
    db = getFirestore(app);
    auth = getAuth(app);
} catch (error) {
    console.error("Error al inicializar Firebase:", error);
    updateConnectionStatus('error', 'Error de Firebase');
}

// --- Funciones de Autenticación ---

export function onAuthChange(callback) {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUserId = user.uid;
            // La referencia al documento ahora depende del ID del usuario
            dataDocRef = doc(db, 'usuarios', currentUserId, 'estado', 'mainState');
        } else {
            currentUserId = null;
            dataDocRef = null;
            // Si hay un listener activo, lo detenemos
            if (unsubscribeFromData) {
                unsubscribeFromData();
                unsubscribeFromData = null;
            }
        }
        callback(user);
    });
}

export async function registerUser(email, password) {
    try {
        await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
        console.error("Error en el registro:", error.code);
        showAuthError("Error al registrar: " + error.message);
    }
}

export async function loginUser(email, password) {
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        console.error("Error en el inicio de sesión:", error.code);
        showAuthError("Email o contraseña incorrectos.");
    }
}

export async function logoutUser() {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
    }
}


// --- Funciones de Base de Datos (Modificadas para un usuario específico) ---

export async function loadData() {
    if (!currentUserId || !dataDocRef) {
        updateConnectionStatus('error', 'No autenticado');
        return null;
    }
    updateConnectionStatus('loading', 'Cargando datos...');
    try {
        const docSnap = await getDoc(dataDocRef);
        if (docSnap.exists()) {
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
        await setDoc(dataDocRef, stateToSave, { merge: true });
        console.log("Datos guardados en Firebase.");
        setTimeout(() => updateConnectionStatus('success', 'Guardado'), 1000);
    } catch (error) {
        console.error("Error al guardar datos en Firebase:", error);
        updateConnectionStatus('error', 'Error al guardar');
    }
}

export function listenForDataChanges(onDataChange) {
    if (unsubscribeFromData) {
        unsubscribeFromData(); // Detiene el listener anterior si existe
    }
    if (!currentUserId || !dataDocRef) return;
    
    unsubscribeFromData = onSnapshot(dataDocRef, (doc) => {
        if (doc.exists()) {
            console.log("Se detectó un cambio en Firebase. Actualizando estado local.");
            updateConnectionStatus('success', 'Sincronizado');
            onDataChange(doc.data());
        }
    }, (error) => {
        console.error("Error en el listener de Firebase:", error);
        updateConnectionStatus('error', 'Desconectado');
    });
}

