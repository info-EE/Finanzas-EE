/**
 * @file Servicio de Almacenamiento (Capa de Persistencia)
 * Este módulo tiene la única responsabilidad de leer y escribir el estado de la aplicación
 * en el medio de persistencia (actualmente, localStorage).
 * Al abstraer esta lógica, podemos cambiar a IndexedDB o una API externa en el futuro
 * modificando únicamente este archivo.
 */

import { STORAGE_KEY } from './config.js';

export const storageService = {
  /**
   * Guarda el estado completo de la aplicación en localStorage.
   * @param {object} state - El objeto de estado de la aplicación.
   */
  saveState(state) {
    try {
      // Excluimos datos volátiles como el reporte activo antes de guardar.
      const stateToSave = { ...state, activeReport: { type: null, data: [] } };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
      console.error("Error al guardar el estado en localStorage:", error);
    }
  },

  /**
   * Carga el estado de la aplicación desde localStorage.
   * @returns {object | null} El objeto de estado parseado o null si no hay datos.
   */
  loadState() {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      return savedData ? JSON.parse(savedData) : null;
    } catch (error) {
      console.error("Error al cargar el estado desde localStorage:", error);
      return null;
    }
  }
};