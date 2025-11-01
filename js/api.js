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
    deleteDoc,  // (de Fase 1)
    writeBatch, // (de Fase 1)
    query,      // (de Fase 1)
    increment   // <-- AÑADIDO EN FASE 2
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- ELIMINADO: Ya no importamos ui.js para romper la dependencia circular ---
// import { updateConnectionStatus, showAuthError } from './ui.js';

// Variables para almacenar las instancias de los servicios de Firebase
let app;
let auth;
let db;
let currentUserId = null;
let dataListeners = []; // (de Fase 1)

// --- INICIO DE MODIFICACIÓN: Ruta de datos compartida ---
// Esta es la ruta principal donde se guardarán TODOS los datos (cuentas, transacciones, etc.)
// Es compartida por todos los usuarios.
let sharedDataPath; 
// --- FIN DE MODIFICACIÓN ---

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
    
    // --- INICIO DE MODIFICACIÓN: Definir la ruta de datos compartida ---
    // Todos los datos de la empresa vivirán bajo este documento
    sharedDataPath = doc(db, 'datos_empresa', 'main');
    // --- FIN DE MODIFICACIÓN ---
}

// Funciones para que otros módulos puedan acceder a las instancias si es necesario
export function getAuthInstance() {
    return auth;
}

export function setCurrentUser(uid) {
    currentUserId = uid;
    if (!uid) {
        // Limpiar todos los listeners al cerrar sesión
        clearAllListeners();
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
        case 'auth/registration-pending': // Error customizado
             return 'Registro exitoso. Tu cuenta está pendiente de aprobación por un administrador.';
        default:
            return 'Ha ocurrido un error. Inténtalo de nuevo más tarde.';
    }
}

// --- INICIO DE MODIFICACIÓN: Las funciones de usuarios (permisos) siguen siendo privadas ---
// Estas funciones NO cambian, ya que la gestión de usuarios sí es por usuario (colección 'usuarios')
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
    // Esta función no necesita 'currentUserId' porque un admin escucha a 'usuarios'
    // if (!currentUserId) return; // (Quitamos esta línea por si acaso)

    const usersCollection = collection(db, 'usuarios');
    const q = query(usersCollection); // (de Fase 1)

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const userList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        onUsersUpdate(userList);
    }, (error) => {
        console.error("Error escuchando cambios en usuarios:", error);
    });
    dataListeners.push(unsubscribe); // (de Fase 1)
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
// --- FIN DE SECCIÓN DE USUARIOS (SIN CAMBIOS) ---


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
        // --- ELIMINADO: showAuthError(translateAuthError(error.code)); ---
        // El error será "lanzado" para que lo maneje handlers.js
        throw error;
    }
}

export async function loginUser(email, password) {
    try {
        // --- AÑADIR ESTA LÍNEA ---
        console.log('Dentro de api.loginUser, llamando a signInWithEmailAndPassword...');
        // --- FIN LÍNEA AÑADIDA ---
        await signInWithEmailAndPassword(auth, email, password);
        // --- AÑADIR ESTA LÍNEA ---
        console.log('signInWithEmailAndPassword ¡EXITOSO!');
        // --- FIN LÍNEA AÑADIDA ---
     // } <<-- ESTA ES LA LLAVE QUE SE ELIMINÓ
     } catch (error) {
        // --- AÑADIR ESTA LÍNEA ---
        console.error('Error DENTRO de api.loginUser (signInWithEmailAndPassword falló):', error);
        // --- FIN LÍNEA AÑADIDA ---
        console.error("Error en el inicio de sesión:", error.code);
        // --- ELIMINADO: showAuthError(translateAuthError(error.code)); ---
        // El error será "lanzado" para que lo maneje handlers.js
        throw error;
    }
}

export async function logoutUser() {
    try {
        await signOut(auth);
        clearAllListeners(); // (de Fase 1)
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
    }
}


// --- Funciones de Base de Datos (Modificadas en Fase 1) ---
// --- INICIO DE MODIFICACIÓN: Todas las rutas de datos ahora usan 'sharedDataPath' ---

/**
 * Carga todos los documentos de una colección compartida.
 * @param {string} collectionName - El nombre de la colección (ej. 'accounts').
 * @returns {Promise<Array>} Una promesa que se resuelve con un array de documentos.
 */
export async function loadCollection(collectionName) {
    if (!currentUserId) return []; // Aún requiere un usuario logueado para intentar
    // --- ELIMINADO: updateConnectionStatus('loading', `Cargando ${collectionName}...`); ---
    try {
        // MODIFICADO: Usa la ruta compartida, no la del usuario
        const colRef = collection(sharedDataPath, collectionName);
        const snapshot = await getDocs(colRef);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`Datos de '${collectionName}' cargados:`, data.length);
        // --- ELIMINADO: updateConnectionStatus('success', 'Sincronizado'); ---
        return data;
    } catch (error) {
        console.error(`Error al cargar la colección ${collectionName}:`, error);
        // --- ELIMINADO: updateConnectionStatus('error', 'Error de carga'); ---
        return [];
    }
}

/**
 * Carga el documento de configuración compartido.
 * @returns {Promise<Object|null>} Una promesa que se resuelve con el objeto de settings o null.
 */
export async function loadSettings() {
    if (!currentUserId) return null;
    // --- ELIMINADO: updateConnectionStatus('loading', 'Cargando configuración...'); ---
    try {
        // MODIFICADO: Usa la ruta compartida, no la del usuario
        const settingsDocRef = doc(sharedDataPath, 'settings', 'appSettings');
        const docSnap = await getDoc(settingsDocRef);
        if (docSnap.exists()) {
            console.log("Configuración cargada.");
            // --- ELIMINADO: updateConnectionStatus('success', 'Sincronizado'); ---
            return docSnap.data();
        } else {
            console.log("No se encontró documento de configuración.");
            // --- ELIMINADO: updateConnectionStatus('success', 'Listo'); ---
            return null; // No existe
        }
    } catch (error) {
        console.error("Error al cargar la configuración:", error);
        // --- ELIMINADO: updateConnectionStatus('error', 'Error de carga'); ---
        return null;
    }
}

/**
 * Añade un nuevo documento a una colección compartida.
 * @param {string} collectionName - El nombre de la colección.
 * @param {Object} data - El objeto de datos a añadir.
 * @returns {Promise<string>} El ID del nuevo documento.
 */
export async function addDocToCollection(collectionName, data) {
    if (!currentUserId) throw new Error("Usuario no autenticado.");
    // --- ELIMINADO: updateConnectionStatus('loading', 'Guardando...'); ---
    try {
        // MODIFICADO: Usa la ruta compartida
        const newDocRef = doc(collection(sharedDataPath, collectionName));
        const dataWithId = { ...data, id: newDocRef.id };

        await setDoc(newDocRef, dataWithId); // Usamos setDoc con el ID pre-generado

        console.log(`Documento añadido a '${collectionName}' con ID: ${newDocRef.id}`);
        // --- ELIMINADO: setTimeout(() => updateConnectionStatus('success', 'Guardado'), 1000); ---
        return dataWithId; // Devolvemos los datos con el ID
    } catch (error) {
        console.error(`Error al añadir documento a ${collectionName}:`, error);
        // --- ELIMINADO: updateConnectionStatus('error', 'Error al guardar'); ---
        throw error;
    }
}

/**
 * Actualiza un documento existente en una colección compartida.
 * @param {string} collectionName - El nombre de la colección.
 * @param {string} docId - El ID del documento a actualizar.
 * @param {Object} updates - Un objeto con los campos a actualizar.
 */
export async function updateDocInCollection(collectionName, docId, updates) {
    if (!currentUserId) throw new Error("Usuario no autenticado.");
    // --- ELIMINADO: updateConnectionStatus('loading', 'Actualizando...'); ---
    try {
        // MODIFICADO: Usa la ruta compartida
        const docRef = doc(sharedDataPath, collectionName, docId);
        await updateDoc(docRef, updates);
        console.log(`Documento '${docId}' en '${collectionName}' actualizado.`);
        // --- ELIMINADO: setTimeout(() => updateConnectionStatus('success', 'Actualizado'), 1000); ---
    } catch (error) {
        console.error(`Error al actualizar documento en ${collectionName}:`, error);
        // --- ELIMINADO: updateConnectionStatus('error', 'Error al actualizar'); ---
        throw error;
    }
}

/**
 * Elimina un documento de una colección compartida.
 * @param {string} collectionName - El nombre de la colección.
 * @param {string} docId - El ID del documento a eliminar.
 */
export async function deleteDocFromCollection(collectionName, docId) {
    if (!currentUserId) throw new Error("Usuario no autenticado.");
    // --- ELIMINADO: updateConnectionStatus('loading', 'Eliminando...'); ---
    try {
        // MODIFICADO: Usa la ruta compartida
        const docRef = doc(sharedDataPath, collectionName, docId);
        await deleteDoc(docRef);
        console.log(`Documento '${docId}' eliminado de '${collectionName}'.`);
        // --- ELIMINADO: setTimeout(() => updateConnectionStatus('success', 'Eliminado'), 1000); ---
    } catch (error) {
        console.error(`Error al eliminar documento de ${collectionName}:`, error);
        // --- ELIMINADO: updateConnectionStatus('error', 'Error al eliminar'); ---
        throw error;
    }
}

/**
 * Guarda el documento de configuración compartido.
 * @param {Object} settings - El objeto de configuración a guardar.
 */
export async function saveSettings(settings) {
    if (!currentUserId) throw new Error("Usuario no autenticado.");
    // --- ELIMINADO: updateConnectionStatus('loading', 'Guardando config...'); ---
    try {
        // MODIFICADO: Usa la ruta compartida
        const settingsDocRef = doc(sharedDataPath, 'settings', 'appSettings');
        await setDoc(settingsDocRef, settings, { merge: true });
        console.log("Configuración guardada.");
        // --- ELIMINADO: setTimeout(() => updateConnectionStatus('success', 'Guardado'), 1000); ---
    } catch (error) {
        console.error("Error al guardar la configuración:", error);
        // --- ELIMINADO: updateConnectionStatus('error', 'Error al guardar'); ---
        throw error;
    }
}

// --- NUEVA FUNCIÓN AÑADIDA EN FASE 2 ---
/**
 * Incrementa o decrementa el saldo de una cuenta de forma atómica.
 * @param {string} accountId - El ID del documento de la cuenta.
 * @param {number} amount - El monto a sumar (positivo) o restar (negativo).
 */
export async function incrementAccountBalance(accountId, amount) {
    if (!currentUserId || !accountId) {
        console.error("Usuario no autenticado o ID de cuenta no proporcionado.");
        return;
    }
    if (amount === 0) return; // No hacer nada si el monto es 0

    // MODIFICADO: Usa la ruta compartida
    const accountDocRef = doc(sharedDataPath, 'accounts', accountId);

    try {
        // Usamos 'increment' para una actualización atómica.
        await updateDoc(accountDocRef, {
            balance: increment(amount)
        });
        console.log(`Saldo de la cuenta ${accountId} actualizado en ${amount}`);
    } catch (error) {
        console.error("Error al actualizar el saldo de la cuenta:", error);
    }
}
// --- FIN DE NUEVA FUNCIÓN FASE 2 ---

/**
 * Escucha cambios en tiempo real en una colección compartida.
 * @param {string} collectionName - El nombre de la colección.
 * @param {Function} onUpdate - Callback que se ejecuta con los datos actualizados.
 */
export function listenForCollectionChanges(collectionName, onUpdate) {
    if (!currentUserId) return;

    // MODIFICADO: Usa la ruta compartida
    const colRef = collection(sharedDataPath, collectionName);
    const q = query(colRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`Actualización en tiempo real para '${collectionName}':`, data.length);
        // --- ELIMINADO: updateConnectionStatus('success', 'Sincronizado'); ---
        onUpdate(data);
    }, (error) => {
        console.error(`Error en listener de ${collectionName}:`, error);
        // --- ELIMINADO: updateConnectionStatus('error', 'Desconectado'); ---
    });

    dataListeners.push(unsubscribe); // Guardar para limpiar después
}

/**
 * Escucha cambios en tiempo real en el documento de configuración compartido.
 * @param {Function} onUpdate - Callback que se ejecuta con los datos actualizados.
 */
export function listenForSettingsChanges(onUpdate) {
    if (!currentUserId) return;

    // MODIFICADO: Usa la ruta compartida
    const settingsDocRef = doc(sharedDataPath, 'settings', 'appSettings');

    const unsubscribe = onSnapshot(settingsDocRef, (docSnap) => {
        if (docSnap.exists()) {
            console.log("Actualización en tiempo real para 'settings'.");
            // --- ELIMINADO: updateConnectionStatus('success', 'Sincronizado'); ---
            onUpdate(docSnap.data());
        }
    }, (error) => {
        console.error("Error en listener de settings:", error);
        // --- ELIMINADO: updateConnectionStatus('error', 'Desconectado'); ---
    });

    dataListeners.push(unsubscribe); // Guardar para limpiar después
}

/**
 * Detiene todos los listeners de Firestore activos.
 */
export function clearAllListeners() {
    console.log(`Limpiando ${dataListeners.length} listeners...`);
    dataListeners.forEach(unsubscribe => unsubscribe());
    dataListeners = [];
}
// --- FIN DE MODIFICACIÓN: Rutas de datos ---
