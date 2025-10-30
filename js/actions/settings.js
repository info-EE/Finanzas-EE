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

    // Usar Set para evitar duplicados fácilmente (insensible a mayúsculas/minúsculas para la comprobación)
    const currentCategoriesLower = state[key].map(c => c.toLowerCase());
    if (currentCategoriesLower.includes(trimmedName.toLowerCase())) {
        console.log(`addCategory: La categoría "${trimmedName}" ya existe.`);
        return; // Ya existe, no hacer nada
    }

    updatedList = [...state[key], trimmedName]; // Añadir el nombre 'trimeado'
    
    const { settings } = getState();
    const updatedSettings = { ...settings, [key]: updatedList };
    await saveSettings(updatedSettings); 
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

    // Filtrar insensible a mayúsculas/minúsculas
    updatedList = state[key].filter(cat => cat.toLowerCase() !== trimmedName.toLowerCase());

    // Solo guardar si la lista realmente cambió
    if (state[key].length !== updatedList.length) {
        const { settings } = getState();
        const updatedSettings = { ...settings, [key]: updatedList };
        await saveSettings(updatedSettings); 
    } else {
         console.log(`deleteCategory: No se encontró la categoría "${trimmedName}" para eliminar.`);
    }
}
