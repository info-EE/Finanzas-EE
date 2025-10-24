import { loadData, saveData, getAuthInstance, getUserProfile } from './api.js';
import { ESSENTIAL_INCOME_CATEGORIES, ESSENTIAL_EXPENSE_CATEGORIES, ESSENTIAL_OPERATION_TYPES, ESSENTIAL_TAX_ID_TYPES } from './config.js';

// --- Catálogo de Logos ---
const LOGO_CATALOG = {
    caixa: `<svg viewBox="0 0 80 60" class="w-6 h-6"><path d="M48.4,0L22.8,27.3c-0.3,0.3-0.3,0.8,0,1.1L48.4,56c1,1.1,2.8,0.4,2.8-1.1V36.8c0-1,0.8-1.7,1.7-1.7h11.2c8.8,0,15.9-7.1,15.9-15.9S83.1,2.3,74.3,2.3H64c-1,0-1.7-0.8-1.7-1.7V1.1C62.3,0.1,49.1-0.7,48.4,0z" fill="#0073B7"></path><circle cx="23.3" cy="28" r="5.5" fill="#FFC107"></circle><circle cx="23.3" cy="44.6" r="6.8" fill="#E6532B"></circle></svg>`,
    wise: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" class="w-6 h-6"><path fill="#a3e635" d="M50.9 64H64L33 20.6L24 34.3l15.1 21.7-10.8-16L18.3 56 33 34.3 43 20.6 11.7 64h13.2L4 39.1l2.8 3.8-6.4 7.6L33 26.3 0 64h12.9L33 36l17.9 28z"></path></svg>`,
    spain_flag: `<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzIDIiPjxwYXRoIGZpbGw9IiNDNjBCMUUiIGQ9Ik0wIDBoM3YySDB6Ii8+PHBhdGggZmlsbD0iI0ZGQzQwMCIgZD0iTTAgLjVoM3YxSDB6Ii8+PC9zdmc+" alt="Bandera de España" class="w-6 h-6 rounded-sm border border-gray-600">`,
    eu_flag: `<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA5MDAgNjAwIj48cGF0aCBmaWxsPSIjMDAzMzk5IiBkPSJNMCAwaDkwMHY2MDBIMHoiLz48ZyBmaWxsPSIjRkZDQzAwIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0NTAgMzAwKSI+PGNpcmNsZSByPSIzMCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCAtMjAwKSIvPjxjaXJjbGUgcj0iMzAiIHRyYW5zZm9ybT0icm90YXRlKDMwKSB0cmFuc2xhdGUoMCAtMjAwKSIvPjxjaXJjbGUgcj0iMzAiIHRyYW5zZm9ybT0icm90YXRlKDYwKSB0cmFuc2xhdGUoMCAtMjAwKSIvPjxjaXJjbGUgcj0iMzAiIHRyYW5zZm9ybT0icm90YXRlKDkwKSB0cmFuc2xhdGUoMCAtMjAwKSIvPjxjaXJjbGUgcj0iMzAiIHRyYW5zZm9ybT0icm90YXRlKDEyMCkgdHJhbnNsYXRlKDAsIC0yMDApIi8+PGNpcmNsZSByPSIzMCIgdHJhbnNmb3JtPSJyb3RhdGUoMTUwKSB0cmFuc2xhdGUoMCAtMjAwKSIvPjxjaXJjbGUgcj0iMzAiIHRyYW5zZm9ybT0icm90YXRlKDE4MCkgdHJhbnNsYXRlKDAsIC0yMDApIi8+PGNpcmNsZSByPSIzMCIgdHJhbnNmb3JtPSJyb3RhdGUoMjEwKSB0cmFuc2xhdGUoMCAtMjAwKSIvPjxjaXJjbGUgcj0iMzAiIHRyYW5zZm9ybT0icm90YXRlKDI0MCkgdHJhbnNsYXRlKDAsIC0yMDApIi8+PGNpcmNsZSByPSIzMCIgdHJhbnNmb3JtPSJyb3RhdGUoMjcwKSB0cmFuc2xhdGUoMCAtMjAwKSIvPjxjaXJjbGUgcj0iMzAiIHRyYW5zZm9ybT0icm90YXRlKDMwMCkgdHJhbnNsYXRlKDAsIC0yMDApIi8+PGNpcmNsZSByPSIzMCIgdHJhbnNmb3JtPSJyb3RhdGUoMzMwKSB0cmFuc2xhdGUoMCAtMjAwKSIvPjwvZz48L3N2Zz4=" alt="Bandera de la Unión Europea" class="w-6 h-6 rounded-sm border border-gray-600">`,
    argentina_flag: `<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA5IDYiPjxyZWN0IGZpbGw9IiM3NEFDREYiIHdpZHRoPSI5IiBoZWlnaHQ9IjMiLz48cmVjdCB5PSIzIiBmaWxsPSIjNzRBQ0RGIiB3aWR0aD0iOSIgaGVpZHRoPSIzIi8+PHJlY3QgeT0iMiIgZmlsbD0iI0ZGRiIgd2lkdGg9IjkiIGhlaWdodD0iMiIvPjwvc3ZnPg==" alt="Bandera de Argentina" class="w-6 h-6 rounded-sm border border-gray-600">`,
    paraguay_flag: `<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMSA2Ij48cGF0aCBmaWxsPSIjRDUyQjFFIiBkPSJNMCAwaDExdjJIMHoiLz48cGF0aCBmaWxsPSIjRkZGIiBkPSJNMCAyaDExdjJIMHoiLz48cGF0aCBmaWxsPSIjMDAzOEE4IiBkPSJNMCA0aDExdjJIMHoiLz48L3N2Zz4=" alt="Bandera de Paraguay" class="w-6 h-6 rounded-sm border border-gray-600">`,
    default: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6 text-gray-500"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>`
};

function getAdminPermissions() {
    return {
        view_dashboard: true, view_accounts: true, view_cashflow: true, manage_cashflow: true,
        execute_transfers: true, view_documents: true, manage_invoices: true, manage_proformas: true,
        change_document_status: true, view_clients: true, manage_clients: true, view_reports: true,
        view_iva_control: true, view_archives: true, view_investments: true, manage_investments: true,
        manage_accounts: true, manage_categories: true, execute_balance_adjustment: true,
        execute_year_close: true, manage_fiscal_settings: true, manage_users: true,
    };
}

function getReadOnlyPermissions() {
    return {
        view_dashboard: true, view_accounts: true, view_cashflow: true, manage_cashflow: false,
        execute_transfers: false, view_documents: true, manage_invoices: false, manage_proformas: false,
        change_document_status: false, view_clients: true, manage_clients: false, view_reports: true,
        view_iva_control: true, view_archives: true, view_investments: true, manage_investments: false,
        manage_accounts: false, manage_categories: false, execute_balance_adjustment: false,
        execute_year_close: false, manage_fiscal_settings: false, manage_users: false,
    };
}

// --- INICIO DE LA CORRECCIÓN ---
// Añadimos 'export' aquí para que main.js pueda importar esta función.
export function getDefaultState() {
// --- FIN DE LA CORRECCIÓN ---
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
            adminUids: ['gjsYFFm1QmfpdGodTBXFExrQiRz1'], 
            blockedUserIds: [],
            invoiceCounter: {
                nextInvoiceNumber: 93,
                lastInvoiceYear: new Date().getFullYear()
            },
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
        allUsers: [],
        permissions: {}
    };
}


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
    const auth = getAuthInstance();
    const currentUser = auth.currentUser;

    let finalState = defaultState;
    finalState.permissions = {};

    try {
        if (currentUser) {
            // PASO 1: Cargar el perfil del usuario ANTES que nada.
            const userProfile = await getUserProfile(currentUser.uid);

            // PASO 2: Determinar los permisos basados en el perfil.
            if (defaultState.settings.adminUids.includes(currentUser.uid)) {
                console.warn("Usuario administrador detectado. Concediendo todos los permisos.");
                finalState.permissions = getAdminPermissions();
            } else if (userProfile && userProfile.status === 'activo') {
                const hasDefinedPermissions = userProfile.permisos && Object.values(userProfile.permisos).some(p => p === true);
                if (hasDefinedPermissions) {
                    finalState.permissions = userProfile.permisos;
                } else {
                    console.log(`Asignando permisos de solo lectura por defecto.`);
                    finalState.permissions = getReadOnlyPermissions();
                }
            }
            
            // PASO 3: Si el usuario tiene algún permiso (es decir, está activo), cargar los datos compartidos.
            const canReadData = Object.values(finalState.permissions).some(p => p === true);

            if (canReadData) {
                const loadedStateResult = await loadData();
                if (loadedStateResult.exists) {
                    const remoteData = loadedStateResult.data || {};
                    const permissionsBackup = finalState.permissions; // Guardar permisos calculados
                    
                    finalState = { ...defaultState, ...remoteData };
                    finalState.permissions = permissionsBackup; // Restaurar permisos
                    
                    finalState.settings = { ...defaultState.settings, ...(remoteData.settings || {}) };
                    finalState.incomeCategories = [...new Set([...defaultState.incomeCategories, ...(remoteData.incomeCategories || [])])];
                    finalState.expenseCategories = [...new Set([...defaultState.expenseCategories, ...(remoteData.expenseCategories || [])])];
                    finalState.invoiceOperationTypes = [...new Set([...defaultState.invoiceOperationTypes, ...(remoteData.invoiceOperationTypes || [])])];
                    finalState.taxIdTypes = [...new Set([...defaultState.taxIdTypes, ...(remoteData.taxIdTypes || [])])];
                } else {
                    console.log("No se encontró estado remoto, se usará el estado por defecto.");
                    await saveData(finalState);
                }
            }
        }
        
        state = finalState;

    } catch (error) {
        console.error("Falló la inicialización del estado por un error de carga:", error);
        state = defaultState;
        state.permissions = {}; 
    }
    
    notify();
}
