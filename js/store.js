import { loadData, saveData } from './api.js';
import { ESSENTIAL_INCOME_CATEGORIES, ESSENTIAL_EXPENSE_CATEGORIES, ESSENTIAL_OPERATION_TYPES, ESSENTIAL_TAX_ID_TYPES } from './config.js';

// --- Catálogo de Logos ---
const LOGO_CATALOG = {
    caixa: `<svg viewBox="0 0 80 60" class="w-6 h-6"><path d="M48.4,0L22.8,27.3c-0.3,0.3-0.3,0.8,0,1.1L48.4,56c1,1.1,2.8,0.4,2.8-1.1V36.8c0-1,0.8-1.7,1.7-1.7h11.2c8.8,0,15.9-7.1,15.9-15.9S83.1,2.3,74.3,2.3H64c-1,0-1.7-0.8-1.7-1.7V1.1C62.3,0.1,49.1-0.7,48.4,0z" fill="#0073B7"></path><circle cx="23.3" cy="28" r="5.5" fill="#FFC107"></circle><circle cx="23.3" cy="44.6" r="6.8" fill="#E6532B"></circle></svg>`,
    wise: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" class="w-6 h-6"><path fill="#a3e635" d="M50.9 64H64L33 20.6L24 34.3l15.1 21.7-10.8-16L18.3 56 33 34.3 43 20.6 11.7 64h13.2L4 39.1l2.8 3.8-6.4 7.6L33 26.3 0 64h12.9L33 36l17.9 28z"></path></svg>`,
    spain_flag: `<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzIDIiPjxwYXRoIGZpbGw9IiNDNjBCMUUiIGQ9Ik0wIDBoM3YySDB6Ii8+PHBhdGggZmlsbD0iI0ZGQzQwMCIgZD0iTTAgLjVoM3YxSDB6Ii8+PC9zdmc+" alt="Bandera de España" class="w-6 h-6 rounded-sm border border-gray-600">`,
    eu_flag: `<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA5MDAgNjAwIj48cGF0aCBmaWxsPSIjMDAzMzk5IiBkPSJNMCAwaDkwMHY2MDBIMHoiLz48ZyBmaWxsPSIjRkZDQzAwIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0NTAgMzAwKSI+PGNpcmNsZSByPSIzMCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCAtMjAwKSIvPjxjaXJjbGUgcj0iMzAiIHRyYW5zZm9ybT0icm90YXRlKDMwKSB0cmFuc2xhdGUoMCAtMjAwKSIvPjxjaXJjbGUgcj0iMzAiIHRyYW5zZm9ybT0icm90YXRlKDkwKSB0cmFuc2xhdGUoMCAtMjAwKSIvPjxjaXJjbGUgcj0iMzAiIHRyYW5zZm9ybT0icm90YXRlKDEyMCkgdHJhbnNsYXRlKDAsIC0yMDApIi8+PGNpcmNsZSByPSIzMCIgdHJhbnNmb3JtPSJyb3RhdGUoMTUwKSB0cmFuc2xhdGUoMCAtMjAwKSIvPjxjaXJjbGUgcj0iMzAiIHRyYW5zZm9ybT0icm90YXRlKDE4MCkgdHJhbnNsYXRlKDAsIC0yMDApIi8+PGNpcmNsZSByPSIzMCIgdHJhbnNmb3JtPSJyb3RhdGUoMjEwKSB0cmFuc2xhdGUoMCAtMjAwKSIvPjxjaXJjbGUgcj0iMzAiIHRyYW5zZm9ybT0icm90YXRlKDI0MCkgdHJhbnNsYXRlKDAsIC0yMDApIi8+PGNpcmNsZSByPSIzMCIgdHJhbnNmb3JtPSJyb3RhdGUoMjcwKSB0cmFuc2xhdGUoMCAtMjAwKSIvPjxjaXJjbGUgcj0iMzAiIHRyYW5zZm9ybT0icm90YXRlKDMwMCkgdHJhbnNsYXRlKDAsIC0yMDApIi8+PGNpcmNsZSByPSIzMCIgdHJhbnNmb3JtPSJyb3RhdGUoMzMwKSB0cmFuc2xhdGUoMCAtMjAwKSIvPjwvZz48L3N2Zz4=" alt="Bandera de la Unión Europea" class="w-6 h-6 rounded-sm border border-gray-600">`,
    argentina_flag: `<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA5IDYiPjxyZWN0IGZpbGw9IiM3NEFDREYiIHdpZHRoPSI5IiBoZWlnaHQ9IjMiLz48cmVjdCB5PSIzIiBmaWxsPSIjNzRBQ0RGIiB3aWR0aD0iOSIgaGVpZHRoPSIzIi8+PHJlY3QgeT0iMiIgZmlsbD0iI0ZGRiIgd2lkdGg9IjkiIGhlaWdodD0iMiIvPjwvc3ZnPg==" alt="Bandera de Argentina" class="w-6 h-6 rounded-sm border border-gray-600">`,
    paraguay_flag: `<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMSA2Ij48cGF0aCBmaWxsPSIjRDUyQjFFIiBkPSJNMCAwaDExdjJIMHoiLz48cGF0aCBmaWxsPSIjRkZGIiBkPSJNMCAyaDExdjJIMHoiLz48cGF0aCBmaWxsPSIjMDAzOEE4IiBkPSJNMCA0aDExdjJIMHoiLz48L3N2Zz4=" alt="Bandera de Paraguay" class="w-6 h-6 rounded-sm border border-gray-600">`,
    default: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6 text-gray-500"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>`
};

// --- Estado Inicial por Defecto ---
function getDefaultState() {
    return {
        logoCatalog: LOGO_CATALOG,
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
        taxIdTypes: [...ESSENTIAL_TAX_ID_TYPES],
        archivedData: {},
        activeReport: { type: null, data: [], title: '', columns: [] },
        activeIvaReport: null,
        settings: {
            // IMPORTANTE: Añade aquí los IDs de los usuarios que serán administradores.
            adminUids: ['REEMPLAZA_CON_TU_UID_DE_ADMIN'], 
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
        },
        allUsers: [] // Se inicializa vacío, se llenará para los administradores.
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

export function resetState() {
    state = {};
    notify();
}

export async function initState() {
    const defaultState = getDefaultState();
    try {
        const loadedStateResult = await loadData();

        if (loadedStateResult.exists) {
            const remoteData = loadedStateResult.data || {};
            
            // Construimos el estado final de forma segura
            const finalState = { ...defaultState, ...remoteData };
            
            // Fusión profunda y segura para el objeto 'settings', evitando que sea nulo o indefinido
            finalState.settings = { 
                ...defaultState.settings, 
                ...(remoteData.settings && typeof remoteData.settings === 'object' ? remoteData.settings : {}) 
            };
            
            // Nos aseguramos de que las categorías esenciales siempre estén presentes
            finalState.incomeCategories = [...new Set([...defaultState.incomeCategories, ...(remoteData.incomeCategories || [])])];
            finalState.expenseCategories = [...new Set([...defaultState.expenseCategories, ...(remoteData.expenseCategories || [])])];
            finalState.invoiceOperationTypes = [...new Set([...defaultState.invoiceOperationTypes, ...(remoteData.invoiceOperationTypes || [])])];
            finalState.taxIdTypes = [...new Set([...defaultState.taxIdTypes, ...(remoteData.taxIdTypes || [])])];
            
            state = finalState;

        } else {
            // Si no existen datos, es un usuario nuevo. Creamos y guardamos el estado inicial.
            console.log("No se encontró estado remoto, inicializando con estado por defecto.");
            state = defaultState;
            await saveData(state);
        }
    } catch (error) {
        // Si ocurre un error al cargar, NO guardamos nada para evitar sobrescribir.
        // Usamos el estado por defecto localmente para que la app no se rompa.
        console.error("Falló la inicialización del estado por un error de carga:", error);
        state = defaultState;
    }
    
    notify();
}

