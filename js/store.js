/**
 * @file Simple reactive state manager (Store).
 * Este módulo centraliza el estado de la aplicación y notifica a los "oyentes"
 * cada vez que el estado cambia.
 */

let state = {};
const listeners = new Set();

/**
 * Notifica a todos los oyentes suscritos que el estado ha cambiado.
 */
function notify() {
  // Pasamos una copia del estado para evitar mutaciones accidentales.
  listeners.forEach(listener => listener({ ...state }));
}

export const store = {
  /**
   * Suscribe una función para que se ejecute cada vez que el estado cambie.
   * @param {function} listener - La función que se llamará con el nuevo estado.
   * @returns {function} Una función para desuscribirse.
   */
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener); // Devuelve la función de desuscripción
  },

  /**
   * Obtiene una instantánea del estado actual.
   * @returns {object} El estado actual.
   */
  getState() {
    return state;
  },

  /**
   * Actualiza el estado. Puede recibir un objeto o una función.
   * @param {object | function} updater - Un objeto para fusionar con el estado actual,
   * o una función que recibe el estado anterior y devuelve el nuevo estado.
   */
  setState(updater) {
    const oldState = { ...state };
    const newState = typeof updater === 'function' ? updater(oldState) : updater;
    state = { ...oldState, ...newState };
    notify();
  },

  /**
   * Inicializa el estado por primera vez sin notificar a los oyentes.
   * @param {object} initialState - El estado inicial de la aplicación.
   */
  _initState(initialState) {
    state = initialState;
  }
};
