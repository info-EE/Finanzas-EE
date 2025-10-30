import { showSpinner, hideSpinner } from '../ui/index.js';

/**
 * Envuelve una función de acción asíncrona para mostrar un spinner global
 * durante su ejecución.
 * @param {Function} action - La función asíncrona a ejecutar.
 * @param {number} [delay=300] - Una demora mínima para asegurar que el spinner sea visible.
 * @returns {Function} Una nueva función que maneja el spinner.
 */
export function withSpinner(action, delay = 300) {
    return async (...args) => {
        showSpinner();
        try {
            // Agregamos una pequeña demora para que el spinner sea visible y dé feedback.
            await new Promise(resolve => setTimeout(resolve, delay));
            return await action(...args); // Devolvemos el resultado de la acción
        } catch (e) {
            console.error("Error during action:", e);
            throw e; // Re-lanzar el error para que el handler original lo atrape
        } finally {
            hideSpinner();
        }
    };
}
