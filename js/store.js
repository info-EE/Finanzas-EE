import { loadData, saveData } from './api.js';
import { ESSENTIAL_INCOME_CATEGORIES, ESSENTIAL_EXPENSE_CATEGORIES, ESSENTIAL_OPERATION_TYPES } from './config.js';

// --- Estado Inicial por Defecto ---
function getDefaultState() {
    return {
        accounts: [],
        transactions: [],
        documents: [],
        clients: [],
        investmentAssets: [
            { id: crypto.randomUUID(), name: 'Bitcoin', category: 'Criptomoneda' },
            { id: crypto.randomUUID(), name: 'Acciones Apple (AAPL)', category: 'Acción' },
        ],
        incomeCategories: [...ESSENTIAL_INCOME_CATEGORIES],
        expenseCategories: [...ESSENTIAL_EXPENSE_CATEGORIES],
        invoiceOperationTypes: [...ESSENTIAL_OPERATION_TYPES],
        archivedData: {},
        activeReport: { type: null, data: [], title: '', columns: [] },
        activeIvaReport: null,
        settings: {
            aeatModuleActive: false,
            aeatConfig: {
                certPath: '',
                certPass: '',
                endpoint: 'https://www2.agenciatributaria.gob.es/ws/VERIFACTU...',
                apiKey: ''
            },
            fiscalParameters: {
                corporateTaxRate: 17
            }
        }
    };
}


// --- Lógica del Store ---
let state = {};
const listeners = [];

export function subscribe(listener) {
    listeners.push(listener);
}

function notify() {
    for (const listener of listeners) {
        listener();
    }
}

export function getState() {
    return JSON.parse(JSON.stringify(state));
}

export function setState(newState) {
    state = { ...state, ...newState };
    notify();
}

/**
 * Resetea el estado a un objeto vacío y notifica a la UI.
 * Se usa al cerrar sesión para limpiar los datos del usuario anterior.
 */
export function resetState() {
    state = {};
    notify();
}

export async function initState() {
    const defaultState = getDefaultState();
    const loadedState = await loadData();

    // Si no hay datos en la nube (usuario nuevo), usamos el estado por defecto
    if (!loadedState) {
        state = defaultState;
        await saveData(state); // Guardamos el estado inicial para el nuevo usuario
    } else {
         // Si hay datos, los fusionamos con el estado por defecto para asegurar consistencia
        state = { ...defaultState, ...loadedState };
        state.incomeCategories = [...new Set([...defaultState.incomeCategories, ...(loadedState?.incomeCategories || [])])];
        state.expenseCategories = [...new Set([...defaultState.expenseCategories, ...(loadedState?.expenseCategories || [])])];
        state.invoiceOperationTypes = [...new Set([...defaultState.invoiceOperationTypes, ...(loadedState?.invoiceOperationTypes || [])])];
    }
    
    notify();
}
