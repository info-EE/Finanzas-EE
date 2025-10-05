// La clave de almacenamiento ahora vive aquí, junto a la lógica que la usa.
const STORAGE_KEY = 'financeDashboardData';

/**
 * Carga el estado de la aplicación desde el almacenamiento local (localStorage).
 * @returns {object | null} El estado guardado o null si no existe o hay un error.
 */
export function loadData() {
    try {
        const serializedState = localStorage.getItem(STORAGE_KEY);
        if (serializedState === null) {
            return null; // No hay estado guardado
        }
        return JSON.parse(serializedState);
    } catch (error) {
        console.error("Error al cargar datos desde localStorage:", error);
        return null;
    }
}

/**
 * Guarda el estado completo de la aplicación en el almacenamiento local (localStorage).
 * @param {object} state - El estado completo de la aplicación a guardar.
 */
export function saveData(state) {
    try {
        // Excluimos datos volátiles que no necesitamos persistir
        const stateToSave = { ...state, activeReport: { type: null, data: [] } };
        const serializedState = JSON.stringify(stateToSave);
        localStorage.setItem(STORAGE_KEY, serializedState);
    } catch (error) {
        console.error("Error al guardar datos en localStorage:", error);
    }
}
