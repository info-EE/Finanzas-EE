// --- Conexión con Firebase Firestore ---

// Obtenemos una referencia a la base de datos de Firestore.
// La inicialización de Firebase se hace en index.html
const db = firebase.firestore();

// Usaremos un único documento para guardar todo el estado de la aplicación.
// Le damos un nombre único a la colección para que no entre en conflicto con otros sistemas.
const dataDocRef = db.collection('finanzas-ee-data').doc('mainState');


/**
 * Carga el estado de la aplicación desde Firebase Firestore.
 * @returns {Promise<object | null>} Una promesa que se resuelve con el estado guardado o null si no existe.
 */
export async function loadData() {
    try {
        const doc = await dataDocRef.get();
        if (doc.exists) {
            console.log("Datos cargados desde Firebase.");
            return doc.data();
        } else {
            console.log("No se encontró ningún documento en Firebase, se usará el estado por defecto.");
            return null; // No hay estado guardado en la nube.
        }
    } catch (error) {
        console.error("Error al cargar datos desde Firebase:", error);
        // Devolvemos null para que la app pueda iniciar con el estado por defecto.
        return null;
    }
}

/**
 * Guarda el estado completo de la aplicación en Firebase Firestore.
 * @param {object} state - El estado completo de la aplicación a guardar.
 * @returns {Promise<void>}
 */
export async function saveData(state) {
    try {
        // Excluimos datos volátiles que no necesitamos persistir.
        const stateToSave = { ...state, activeReport: { type: null, data: [] } };
        
        // Usamos set con { merge: true } para crear el documento si no existe
        // o para actualizarlo si ya existe, sin sobrescribir campos no incluidos.
        await dataDocRef.set(stateToSave, { merge: true });
        console.log("Datos guardados en Firebase.");

    } catch (error) {
        console.error("Error al guardar datos en Firebase:", error);
    }
}

/**
 * Escucha los cambios en los datos de Firebase en tiempo real.
 * Cada vez que los datos cambian en la nube, esta función se ejecutará.
 * @param {function} onDataChange - El callback que se ejecutará con los nuevos datos.
 */
export function listenForDataChanges(onDataChange) {
    dataDocRef.onSnapshot((doc) => {
        if (doc.exists) {
            console.log("Se detectó un cambio en Firebase. Actualizando estado local.");
            onDataChange(doc.data());
        }
    }, (error) => {
        console.error("Error en el listener de Firebase:", error);
    });
}

