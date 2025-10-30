import { getState } from '../store.js';
import { 
    addDocToCollection, 
    deleteDocFromCollection
} from '../api.js';
// Importamos saveTransaction directamente desde cashflow.js para evitar un bucle de importación
import { saveTransaction } from './cashflow.js';

/**
 * Añade un nuevo activo de inversión (ej. Bitcoin, Ethereum) a la configuración.
 * @param {object} assetData - Datos del activo (name, category).
 */
export async function addInvestmentAsset(assetData) {
    if (!assetData || !assetData.name || !assetData.category) {
        console.error("addInvestmentAsset: Faltan datos del activo.");
        return;
    }
    await addDocToCollection('investmentAssets', assetData);
}

/**
 * Elimina un activo de inversión de la configuración.
 * @param {string} assetId - ID del activo a eliminar.
 */
export async function deleteInvestmentAsset(assetId) {
    if (!assetId) {
        console.error("deleteInvestmentAsset: Falta el ID del activo.");
        return;
    }
    // NOTA: No estamos comprobando si el activo está en uso.
    // Considerar añadir esa lógica en el futuro.
    await deleteDocFromCollection('investmentAssets', assetId);
}

/**
 * Añade un movimiento de inversión.
 * Esto es un contenedor que llama a 'saveTransaction' con la categoría correcta.
 * @param {object} investmentData - Datos de la inversión desde el handler.
 */
export async function addInvestment(investmentData) {
    const { accounts } = getState();
    const account = accounts.find(acc => acc.name === investmentData.account);
    
    if (!account) {
        console.error("addInvestment: No se encontró la cuenta:", investmentData.account);
        return;
    }

    // Preparamos la transacción para saveTransaction
    const transactionData = {
        date: investmentData.date,
        description: investmentData.description || `Inversión en ${investmentData.assetName}`,
        type: 'Egreso', // Invertir siempre es un egreso de una cuenta
        part: 'A', // Asumimos 'A' para inversiones, o podríamos hacerlo seleccionable
        account: investmentData.account, // Nombre de la cuenta
        category: 'Inversión', // Categoría esencial
        amount: Number(investmentData.amount) || 0,
        iva: 0,
        currency: account.currency,
        investmentAssetId: investmentData.assetId // ID del activo (ej. Bitcoin)
    };

    // Usamos saveTransaction (de cashflow.js) para guardar el egreso
    // y actualizar el saldo de la cuenta, todo en una función.
    await saveTransaction(transactionData, null); // null_para_id_indica_que_es_nuevo
}
