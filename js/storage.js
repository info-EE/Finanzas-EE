import { STORAGE_KEY } from './config.js';

/**
 * Carga el estado de la aplicación desde localStorage.
 * Si no hay datos guardados, devuelve null.
 * @returns {object | null} El estado guardado o null.
 */
export function loadStateFromStorage() {
    try {
        const serializedState = localStorage.getItem(STORAGE_KEY);
        if (serializedState === null) {
            return null; // No hay estado guardado
        }
        return JSON.parse(serializedState);
    } catch (error) {
        console.error("Error al cargar datos desde localStorage:", error);
        // En caso de error (ej. datos corruptos), no devolver nada para que se use el estado por defecto.
        return null;
    }
}

/**
 * Guarda el estado de la aplicación en localStorage.
 * @param {object} state - El estado completo de la aplicación a guardar.
 */
export function saveStateToStorage(state) {
    try {
        // Excluimos datos volátiles que no necesitamos persistir
        const stateToSave = { ...state, activeReport: { type: null, data: [] } };
        const serializedState = JSON.stringify(stateToSave);
        localStorage.setItem(STORAGE_KEY, serializedState);
    } catch (error) {
        console.error("Error al guardar datos en localStorage:", error);
    }
}

