import { 
    updateDocInCollection, 
    addDocToCollection, 
    deleteDocFromCollection 
} from '../api.js';

/**
 * Guarda un cliente nuevo o actualiza uno existente.
 * @param {object} clientData - Los datos del cliente.
 * @param {string|null} clientId - El ID del cliente si se está editando.
 */
export async function saveClient(clientData, clientId) {
    if (clientId) {
        await updateDocInCollection('clients', clientId, clientData); 
    } else {
        await addDocToCollection('clients', clientData); 
    }
}

/**
 * Elimina un cliente de la base de datos.
 * @param {string} clientId - El ID del cliente a eliminar.
 */
export async function deleteClient(clientId) {
    await deleteDocFromCollection('clients', clientId); 
}
