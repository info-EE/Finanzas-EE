import { getState } from '../store.js';
import { saveSettings } from '../api.js';

/**
 * Añade una nueva categoría (ingreso, egreso, tipo de operación, etc.) a la configuración.
 * @param {string} categoryName - El nombre de la categoría a añadir.
 * @param {'income' | 'expense' | 'operationType' | 'taxIdType'} type - El tipo de categoría.
 */
export async function addCategory(categoryName, type) { 
    const state = getState();
    let updatedList;
    let key;

    // Asegurarse de que categoryName es un string y no está vacío
    if (typeof categoryName !== 'string' || !categoryName.trim()) {
        console.warn("addCategory: Nombre de categoría inválido.");
        return;
    }
    const trimmedName = categoryName.trim();


    if (type === 'income') key = 'incomeCategories';
    else if (type === 'expense') key = 'expenseCategories';
    else if (type === 'operationType') key = 'invoiceOperationTypes';
    else if (type === 'taxIdType') key = 'taxIdTypes';
    else return;

    // --- INICIO DE CORRECCIÓN (Problema 2) ---
    // 1. Usar la lista COMPLETA (state[key]) solo para verificar duplicados
    // state[key] contiene las categorías esenciales + las guardadas
    const currentCategoriesLower = state[key].map(c => c.toLowerCase());
    if (currentCategoriesLower.includes(trimmedName.toLowerCase())) {
        console.log(`addCategory: La categoría "${trimmedName}" ya existe.`);
        return; // Ya existe, no hacer nada
    }

    // 2. Obtener la lista PERSONALIZADA (desde state.settings) para guardarla
    const { settings } = getState();
    // Esta es la lista que está guardada en Firebase (solo las personalizadas)
    const currentSavedList = settings[key] || [];

    // 3. Crear la lista actualizada basada en la lista guardada, no en la lista completa
    updatedList = [...currentSavedList, trimmedName]; 
    
    // 4. Guardar la nueva lista de categorías personalizadas
    const updatedSettings = { ...settings, [key]: updatedList };
    await saveSettings(updatedSettings); 
    // --- FIN DE CORRECCIÓN ---
}

/**
 * Elimina una categoría de la configuración.
 * @param {string} categoryName - El nombre de la categoría a eliminar.
 * @param {'income' | 'expense' | 'operationType' | 'taxIdType'} type - El tipo de categoría.
 */
export async function deleteCategory(categoryName, type) { 
    const state = getState();
    let updatedList;
    let key;

    if (typeof categoryName !== 'string' || !categoryName.trim()) {
        console.warn("deleteCategory: Nombre de categoría inválido.");
        return;
    }
    const trimmedName = categoryName.trim();

    if (type === 'income') key = 'incomeCategories';
    else if (type === 'expense') key = 'expenseCategories';
    else if (type === 'operationType') key = 'invoiceOperationTypes';
    else if (type === 'taxIdType') key = 'taxIdTypes';
    else return;

    // 1. Comprobar si la lista COMPLETA (state[key]) contiene la categoría
    const categoryExists = state[key].some(cat => cat.toLowerCase() === trimmedName.toLowerCase());

    // Solo guardar si la categoría realmente existe
    if (categoryExists) {
        const { settings } = getState();
        
        // --- INICIO DE CORRECCIÓN (Problema 2 - Lógica de borrado) ---
        // Debemos filtrar la lista de settings (personalizadas), no la lista completa (state[key])
        const currentSavedList = settings[key] || [];
        const updatedSavedList = currentSavedList.filter(cat => cat.toLowerCase() !== trimmedName.toLowerCase());
        
        // Comprobar si la lista realmente cambió (podría ser una esencial)
        if (currentSavedList.length === updatedSavedList.length) {
             console.log(`deleteCategory: "${trimmedName}" es una categoría esencial o no se encontró en la lista guardada.`);
             // (No se puede borrar una esencial, así que no hacemos nada)
             return;
        }

        const updatedSettings = { ...settings, [key]: updatedSavedList };
        await saveSettings(updatedSettings); 
        // --- FIN DE CORRECCIÓN ---
    } else {
         console.log(`deleteCategory: No se encontró la categoría "${trimmedName}" para eliminar.`);
    }
}

