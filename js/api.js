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
    updateDoc,
    addDoc,
    deleteDoc,
    query
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// Restauramos la importación de ui.js para recuperar los avisos
import { updateConnectionStatus, showAuthError } from './ui.js';

// Variables para almacenar las instancias de los servicios de Firebase
let app;
let auth;
let db;
let currentUserId = null;

// --- INICIO DE LA REFACTORIZACIÓN (FASE 1) ---
// Objeto para mantener un registro de los listeners 'onSnapshot' activos.
// Esto nos permite cancelarlos al cerrar sesión.
let activeListeners = {}; 
// --- FIN DE LA REFACTORIZACIÓN ---


/**
 * Devuelve un objeto con todos los permisos del sistema establecidos en 'false'.
 * @returns {Object} El objeto de permisos por defecto.
 */
function getDefaultPermissions() {
    return {
        view_dashboard: false,
        view_accounts: false,
        view_cashflow: false,
        manage_cashflow: false,
        execute_transfers: false,
        view_documents: false,
        manage_invoices: false,
        manage_proformas: false,
        change_document_status: false,
        view_clients: false,
        manage_clients: false,
        view_reports: false,
        view_iva_control: false,
        view_archives: false,
        view_investments: false,
        manage_investments: false,
        manage_accounts: false,
        manage_categories: false,
        execute_balance_adjustment: false,
        execute_year_close: false,
        manage_fiscal_settings: false,
        manage_users: false,
    };
}


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

// --- REFACTORIZADO (FASE 1) ---
/**
 * Cancela todos los listeners de onSnapshot activos.
 * Se llama al cerrar sesión para prevenir fugas de memoria.
 */
function clearAllListeners() {
    console.log("Limpiando listeners activos...");
    for (const key in activeListeners) {
        if (typeof activeListeners[key] === 'function') {
            activeListeners[key](); // Llama a la función de 'unsubscribe'
        }
    }
    activeListeners = {}; // Resetea el objeto
}

// --- REFACTORIZADO (FASE 1) ---
export function setCurrentUser(uid) {
    currentUserId = uid;
    if (!uid) {
        // Limpiar todo al cerrar sesión o si no hay usuario
        clearAllListeners();
        // dataDocRef ya no se usa, no es necesario limpiarlo.
    }
    // Ya no establecemos 'dataDocRef'. Las referencias se construirán dinámicamente.
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
        case 'auth/registration-pending': // Error customizado
             return 'Registro exitoso. Tu cuenta está pendiente de aprobación por un administrador.';
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
        const existingProfile = await getUserProfile(uid);
        if (existingProfile && existingProfile.email) { // Check if profile is not empty
            console.log("El perfil del usuario ya existe y no está vacío. No se creará uno nuevo.");
            return;
        }
        const defaultPermissions = getDefaultPermissions();
        
        await setDoc(userDocRef, { 
            email, 
            status,
            permisos: defaultPermissions
        }, { merge: true });

    } catch (error) {
        console.error("Error al crear el perfil del usuario:", error);
    }
}

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

export function listenForAllUsersChanges(onUsersUpdate) {
    // --- REFACTORIZADO (FASE 1) ---
    // Aseguramos que el listener se guarde y se pueda limpiar
    if (activeListeners.users) {
        activeListeners.users();
    }
    const usersCollection = collection(db, 'usuarios');
    activeListeners.users = onSnapshot(usersCollection, (snapshot) => {
        const userList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        onUsersUpdate(userList);
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

/**
 * Actualiza los campos de un usuario en la base de datos.
 * @param {string} uid - El ID del usuario.
 * @param {object} updates - Un objeto con los campos a actualizar (ej: { permisos: {...}, status: 'activo' }).
 * @returns {boolean} - True si la operación fue exitosa, false en caso contrario.
 */
export async function updateUserPermissions(uid, updates) {
    if (!uid) return false;
    try {
        const userDocRef = doc(db, 'usuarios', uid);
        await updateDoc(userDocRef, updates);
        return true;
    } catch (error) {
        console.error("Error al actualizar el perfil del usuario:", error);
        return false;
    }
}

export async function registerUser(email, password) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await createUserProfile(user.uid, user.email, 'pendiente');
        // Lanzamos un error especial que el handler (manejador) puede interpretar si es necesario.
        const e = new Error('Registro exitoso. Tu cuenta está pendiente de aprobación por un administrador.');
        e.code = 'auth/registration-pending';
        throw e;
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

export async function logoutUser() {
    try {
        // --- REFACTORIZADO (FASE 1) ---
        // Limpiamos todos los listeners al cerrar sesión.
        clearAllListeners();
        await signOut(auth);
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
    }
}


// ---
// --- INICIO DE LA REFACTORIZACIÓN DE DATOS (FASE 1) ---
// ---

// --- Funciones Helper de Referencia ---

/**
 * Obtiene la referencia a una subcolección del usuario actual.
 * @param {string} collectionName - El nombre de la colección (ej. 'transactions', 'accounts').
 * @returns {CollectionReference}
 */
function getCollectionRef(collectionName) {
    if (!currentUserId) throw new Error("Usuario no autenticado.");
    return collection(db, 'usuarios', currentUserId, collectionName);
}

/**
 * Obtiene la referencia a un documento específico en una subcolección del usuario.
 * @param {string} collectionName - El nombre de la colección.
 * @param {string} docId - El ID del documento.
 * @returns {DocumentReference}
 */
function getDocRef(collectionName, docId) {
    if (!currentUserId) throw new Error("Usuario no autenticado.");
    return doc(db, 'usuarios', currentUserId, collectionName, docId);
}

/**
 * Obtiene la referencia al documento de configuración del usuario.
 * Usamos un ID fijo 'userSettings' para que siempre sea el mismo documento.
 * @returns {DocumentReference}
 */
function getSettingsDocRef() {
    if (!currentUserId) throw new Error("Usuario no autenticado.");
    // Guardamos settings como un documento separado en una colección 'settings'
    // para mantenerlo separado del documento de perfil del usuario.
    return doc(db, 'usuarios', currentUserId, 'settings', 'userSettings');
}

// --- Funciones de Carga de Datos (Reemplazan a loadData) ---

/**
 * Carga todos los documentos de una subcolección una sola vez.
 * @param {string} collectionName - La colección a cargar (ej. 'accounts').
 * @returns {Promise<Array>} - Un array con los datos de los documentos, incluyendo su ID.
 */
export async function loadCollection(collectionName) {
    if (!currentUserId) return [];
    updateConnectionStatus('loading', `Cargando ${collectionName}...`);
    try {
        const q = query(getCollectionRef(collectionName));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateConnectionStatus('success', `${collectionName} cargados`);
        return data;
    } catch (error) {
        console.error(`Error al cargar la colección ${collectionName}:`, error);
        updateConnectionStatus('error', `Error cargando ${collectionName}`);
        return [];
    }
}

/**
 * Carga el documento de configuración del usuario una sola vez.
 * @returns {Promise<Object|null>} - El objeto de configuración o null si no existe.
 */
export async function loadSettings() {
    if (!currentUserId) return null;
    updateConnectionStatus('loading', 'Cargando configuración...');
    try {
        const docSnap = await getDoc(getSettingsDocRef());
        if (docSnap.exists()) {
            updateConnectionStatus('success', 'Configuración cargada');
            return docSnap.data();
        } else {
            updateConnectionStatus('success', 'Configuración no encontrada');
            return null;
        }
    } catch (error) {
        console.error("Error al cargar la configuración:", error);
        updateConnectionStatus('error', 'Error en configuración');
        return null;
    }
}

// --- Funciones de Escritura de Datos (Reemplazan a saveData) ---

/**
 * Añade un nuevo documento a una subcolección del usuario.
 * @param {string} collectionName - La colección (ej. 'transactions').
 * @param {Object} data - El objeto de datos a añadir.
 * @returns {Promise<DocumentReference>} - La referencia al nuevo documento.
 */
export async function addDocToCollection(collectionName, data) {
    if (!currentUserId) throw new Error("Usuario no autenticado.");
    updateConnectionStatus('loading', 'Guardando...');
    try {
        const docRef = await addDoc(getCollectionRef(collectionName), data);
        updateConnectionStatus('success', 'Guardado');
        return docRef;
    } catch (error) {
        console.error(`Error al añadir documento a ${collectionName}:`, error);
        updateConnectionStatus('error', 'Error al guardar');
        throw error;
    }
}

/**
 * Actualiza un documento existente en una subcolección del usuario.
 * @param {string} collectionName - La colección (ej. 'accounts').
 * @param {string} docId - El ID del documento a actualizar.
 * @param {Object} data - El objeto con los campos a actualizar.
 */
export async function updateDocInCollection(collectionName, docId, data) {
    if (!currentUserId) throw new Error("Usuario no autenticado.");
    updateConnectionStatus('loading', 'Actualizando...');
    try {
        await updateDoc(getDocRef(collectionName, docId), data);
        updateConnectionStatus('success', 'Actualizado');
    } catch (error) {
        console.error(`Error al actualizar documento en ${collectionName}:`, error);
        updateConnectionStatus('error', 'Error al actualizar');
        throw error;
    }
}

/**
 * Elimina un documento de una subcolección del usuario.
 * @param {string} collectionName - La colección (ej. 'transactions').
 * @param {string} docId - El ID del documento a eliminar.
 */
export async function deleteDocFromCollection(collectionName, docId) {
    if (!currentUserId) throw new Error("Usuario no autenticado.");
    updateConnectionStatus('loading', 'Eliminando...');
    try {
        await deleteDoc(getDocRef(collectionName, docId));
        updateConnectionStatus('success', 'Eliminado');
    } catch (error) {
        console.error(`Error al eliminar documento de ${collectionName}:`, error);
        updateConnectionStatus('error', 'Error al eliminar');
        throw error;
    }
}

/**
 * Guarda el documento de configuración del usuario.
 * @param {Object} settingsData - El objeto de configuración a guardar.
 */
export async function saveSettings(settingsData) {
    if (!currentUserId) throw new Error("Usuario no autenticado.");
    updateConnectionStatus('loading', 'Guardando configuración...');
    try {
        // Usamos setDoc con merge:true para crear o sobrescribir parcialmente.
        await setDoc(getSettingsDocRef(), settingsData, { merge: true });
        updateConnectionStatus('success', 'Configuración guardada');
    } catch (error) {
        console.error("Error al guardar la configuración:", error);
        updateConnectionStatus('error', 'Error al guardar config.');
        throw error;
    }
}


// --- Funciones de Sincronización en Tiempo Real (Reemplazan a listenForDataChanges) ---

/**
 * Escucha cambios en tiempo real en una subcolección del usuario.
 * @param {string} collectionName - La colección a escuchar (ej. 'transactions').
 * @param {Function} onUpdate - Callback que se ejecuta con los nuevos datos (un array).
 */
export function listenForCollectionChanges(collectionName, onUpdate) {
    if (!currentUserId) return;
    
    // Cancela cualquier listener anterior para esta misma colección
    if (activeListeners[collectionName]) {
        activeListeners[collectionName]();
    }

    updateConnectionStatus('loading', `Sincronizando ${collectionName}...`);
    
    const q = query(getCollectionRef(collectionName));
    
    activeListeners[collectionName] = onSnapshot(q, (querySnapshot) => {
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        onUpdate(data); // Llama al callback (en store.js) con los datos actualizados
        updateConnectionStatus('success', 'Sincronizado');
    }, (error) => {
        console.error(`Error en listener de ${collectionName}:`, error);
        updateConnectionStatus('error', 'Desconectado');
    });
}

/**
 * Escucha cambios en tiempo real en el documento de configuración.
 * @param {Function} onUpdate - Callback que se ejecuta con los nuevos datos (un objeto).
 */
export function listenForSettingsChanges(onUpdate) {
    if (!currentUserId) return;

    if (activeListeners.settings) {
        activeListeners.settings();
    }

    updateConnectionStatus('loading', 'Sincronizando configuración...');

    activeListeners.settings = onSnapshot(getSettingsDocRef(), (docSnap) => {
        if (docSnap.exists()) {
            onUpdate(docSnap.data());
        } else {
            onUpdate(null); // El documento no existe
        }
        updateConnectionStatus('success', 'Sincronizado');
    }, (error) => {
        console.error("Error en listener de settings:", error);
        updateConnectionStatus('error', 'Desconectado');
    });
}

// ---
// --- FIN DE LA REFACTORIZACIÓN DE DATOS (FASE 1) ---
// ---
