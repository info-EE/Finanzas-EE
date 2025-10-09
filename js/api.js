// Importa solo las funciones que necesitas de la SDK de Firebase v9
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { 
    doc, 
    getDoc, 
    setDoc, 
    onSnapshot,
    collection,
    getDocs,
    updateDoc
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

import { updateConnectionStatus, showAuthError } from './ui.js';

// Variables para almacenar las instancias de los servicios de Firebase
let app;
let auth;
let db;
let currentUserId = null;
let dataDocRef = null;
let unsubscribeFromData = null;
let unsubscribeFromUsers = null; // Listener para la lista de usuarios

// Esta función recibe las instancias desde main.js
export function initFirebaseServices(firebaseApp, firebaseAuth, firestoreDb) {
    app = firebaseApp;
    auth = firebaseAuth;
    db = firestoreDb;
}

// Funciones para que otros módulos puedan acceder a las instancias si es necesario
export function getAuthInstance() {
    return auth;
}

export function setCurrentUser(uid) {
    currentUserId = uid;
    if (uid) {
        // La ruta principal para los datos de la aplicación del usuario.
        dataDocRef = doc(db, 'usuarios', uid, 'estado', 'mainState');
    } else {
        // Limpiar todo al cerrar sesión o si no hay usuario
        dataDocRef = null;
        if (unsubscribeFromData) {
            unsubscribeFromData();
            unsubscribeFromData = null;
        }
        if (unsubscribeFromUsers) {
            unsubscribeFromUsers();
            unsubscribeFromUsers = null;
        }
    }
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

export async function getUserProfile(uid) {
    if (!uid) return null;
    try {
        const userDocRef = doc(db, 'usuarios', uid);
        const docSnap = await getDoc(userDocRef);
        return docSnap.exists() ? docSnap.data() : null;
    } catch (error) {
        console.error("Error al obtener el perfil del usuario:", error);
        return null;
    }
}

export async function createUserProfile(uid, email, status) {
    try {
        const userDocRef = doc(db, 'usuarios', uid);
        await setDoc(userDocRef, { email, status }, { merge: true });
    } catch (error) {
        console.error("Error al crear el perfil del usuario:", error);
    }
}

// Esta función se mantiene para un solo uso si fuera necesario, pero no la usaremos para la vista principal
export async function getAllUsers() {
    try {
        const usersCollection = collection(db, 'usuarios');
        const userSnapshot = await getDocs(usersCollection);
        const userList = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return userList;
    } catch (error) {
        console.error("Error obteniendo todos los usuarios:", error);
        return [];
    }
}

// --- NUEVA FUNCIÓN ---
// Escucha cambios en la colección de usuarios en tiempo real
export function listenForAllUsersChanges(onUsersUpdate) {
    if (unsubscribeFromUsers) {
        unsubscribeFromUsers(); // Detiene el listener anterior si existe
    }
    const usersCollection = collection(db, 'usuarios');
    unsubscribeFromUsers = onSnapshot(usersCollection, (snapshot) => {
        const userList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        onUsersUpdate(userList); // Llama a la función callback con la lista actualizada
    }, (error) => {
        console.error("Error escuchando cambios en usuarios:", error);
    });
}


export async function updateUserStatus(uid, newStatus) {
    try {
        const userDocRef = doc(db, 'usuarios', uid);
        await updateDoc(userDocRef, {
            status: newStatus
        });
        return true;
    } catch (error) {
        console.error("Error actualizando el estado del usuario:", error);
        return false;
    }
}


export async function registerUser(email, password) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await createUserProfile(user.uid, user.email, 'pendiente');
        showAuthError('Registro exitoso. Tu cuenta está pendiente de aprobación por un administrador.');
        await signOut(auth);
    } catch (error) {
        console.error("Error en el registro:", error.code);
        showAuthError(translateAuthError(error.code));
    }
}

export async function loginUser(email, password) {
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        console.error("Error en el inicio de sesión:", error.code);
        showAuthError(translateAuthError(error.code));
    }
}

// --- FUNCIÓN ACTUALIZADA ---
// Ahora nos aseguramos de detener todos los listeners al cerrar sesión
export async function logoutUser() {
    try {
        if (unsubscribeFromData) {
            unsubscribeFromData();
            unsubscribeFromData = null;
        }
        if (unsubscribeFromUsers) {
            unsubscribeFromUsers();
            unsubscribeFromUsers = null;
        }
        await signOut(auth);
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
    }
}


// --- Funciones de Base de Datos ---

export async function loadData() {
    if (!currentUserId || !dataDocRef) {
        updateConnectionStatus('error', 'No autenticado');
        throw new Error("User not authenticated for data loading.");
    }
    updateConnectionStatus('loading', 'Cargando datos...');
    try {
        const docSnap = await getDoc(dataDocRef);
        if (docSnap.exists()) {
            console.log("Datos cargados desde Firebase.");
            updateConnectionStatus('success', 'Datos cargados');
            return { data: docSnap.data(), exists: true };
        } else {
            console.log("No se encontró ningún documento, se usará el estado por defecto.");
            updateConnectionStatus('success', 'Listo para inicializar');
            return { data: null, exists: false };
        }
    } catch (error) {
        console.error("Error al cargar datos desde Firebase:", error);
        updateConnectionStatus('error', 'Error de carga');
        throw error;
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
        unsubscribeFromData();
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
