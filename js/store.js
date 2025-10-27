import {
    loadCollection,
    loadSettings,
    saveSettings,
    getAuthInstance,
    getUserProfile
} from './api.js';
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

export function getDefaultState() {
    return {
        logoCatalog: LOGO_CATALOG,
        accounts: [],
        transactions: [],
        documents: [],
        clients: [],
        investmentAssets: [],
        incomeCategories: [...ESSENTIAL_INCOME_CATEGORIES],
        expenseCategories: [...ESSENTIAL_EXPENSE_CATEGORIES],
        invoiceOperationTypes: [...ESSENTIAL_OPERATION_TYPES],
        taxIdTypes: [...ESSENTIAL_TAX_ID_TYPES],
        archivedData: {},
        activeReport: { type: null, data: [], title: '', columns: [] },
        activeIvaReport: null,
        settings: {
            adminUids: ['gjsYFFm1QmfpdGodTBXFExrQiRz1'],
            adminEmails: ['info@europaenvios.com'],
            blockedUserIds: [],
            invoiceCounter: {
                nextInvoiceNumber: 1,
                lastInvoiceYear: new Date().getFullYear() -1
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
        permissions: {},
        currentUser: null
    };
}


let state = {};
const listeners = [];

export function subscribe(listener) {
    listeners.push(listener);
}

function notify() {
    console.log('[Store] Notifying listeners...'); // Log para depuración
    for (const listener of listeners) {
        listener();
    }
}

export function getState() {
    return JSON.parse(JSON.stringify(state));
}

export function setState(newState) {
    console.log('[Store] Updating state with:', newState); // Log para depuración
    state = { ...state, ...newState };
    // CORRECCIÓN PROBLEMA 3: Asegurarse de notificar DESPUÉS de actualizar el estado
    // notify(); // <--- Quitar de aquí
}

export function resetState() {
    state = {};
    notify();
}

export async function initState() {
    console.log('[Store] Initializing state...'); // Log para depuración
    const defaultState = getDefaultState();
    const auth = getAuthInstance();
    const currentUser = auth.currentUser;

    let finalState = getDefaultState();
    finalState.permissions = {};

    try {
        if (currentUser) {
            console.log(`[Store] User ${currentUser.email} authenticated. Loading profile...`);
            const userProfile = await getUserProfile(currentUser.uid);
            console.log('[Store] User profile loaded:', userProfile);

            if (defaultState.settings.adminUids.includes(currentUser.uid) || defaultState.settings.adminEmails.includes(currentUser.email)) {
                console.warn("[Store] Admin user detected. Granting all permissions.");
                finalState.permissions = getAdminPermissions();
            } else if (userProfile && userProfile.status === 'activo') {
                const hasDefinedPermissions = userProfile.permisos && Object.keys(userProfile.permisos).length > 0 && Object.values(userProfile.permisos).some(p => p === true);
                if (hasDefinedPermissions) {
                    console.log("[Store] Active user with specific permissions found.");
                    finalState.permissions = { ...getReadOnlyPermissions(), ...userProfile.permisos };
                } else {
                    console.log(`[Store] Active user without specific permissions. Assigning default read-only permissions.`);
                    finalState.permissions = getReadOnlyPermissions();
                }
            } else {
                 console.log(`[Store] User not admin, not active, or profile missing. No permissions assigned.`);
            }

            const canReadData = Object.values(finalState.permissions).some(p => p === true);
            console.log(`[Store] User can read data: ${canReadData}`);

            if (canReadData) {
                console.log("[Store] Loading settings...");
                const loadedSettings = await loadSettings();
                console.log("[Store] Settings loaded:", loadedSettings);

                console.log("[Store] Loading collections...");
                const [loadedAccounts, loadedTransactions, loadedDocuments, loadedClients, loadedInvestmentAssets] = await Promise.all([
                    loadCollection('accounts'),
                    loadCollection('transactions'),
                    loadCollection('documents'),
                    loadCollection('clients'),
                    loadCollection('investmentAssets')
                ]);
                // Logs para depuración Problema 3
                console.log("[Store] Accounts loaded:", loadedAccounts);
                console.log("[Store] Transactions loaded:", loadedTransactions);
                console.log("[Store] Documents loaded:", loadedDocuments);
                console.log("[Store] Clients loaded:", loadedClients);
                console.log("[Store] Investment Assets loaded:", loadedInvestmentAssets);


                if (loadedSettings) {
                    finalState.settings = {
                        ...defaultState.settings,
                        ...loadedSettings,
                        adminUids: defaultState.settings.adminUids,
                        adminEmails: defaultState.settings.adminEmails,
                        blockedUserIds: loadedSettings.blockedUserIds || defaultState.settings.blockedUserIds,
                    };
                    finalState.incomeCategories = [...new Set([...defaultState.incomeCategories, ...(loadedSettings.incomeCategories || [])])];
                    finalState.expenseCategories = [...new Set([...defaultState.expenseCategories, ...(loadedSettings.expenseCategories || [])])];
                    finalState.invoiceOperationTypes = [...new Set([...defaultState.invoiceOperationTypes, ...(loadedSettings.invoiceOperationTypes || [])])];
                    finalState.taxIdTypes = [...new Set([...defaultState.taxIdTypes, ...(loadedSettings.taxIdTypes || [])])];
                    console.log("[Store] Merged settings with loaded data.");
                } else {
                    console.log("[Store] No remote settings found, saving default settings...");
                    await saveSettings(defaultState.settings);
                    finalState.incomeCategories = defaultState.incomeCategories;
                    finalState.expenseCategories = defaultState.expenseCategories;
                    finalState.invoiceOperationTypes = defaultState.invoiceOperationTypes;
                    finalState.taxIdTypes = defaultState.taxIdTypes;
                }

                finalState.accounts = loadedAccounts;
                finalState.transactions = loadedTransactions;
                finalState.documents = loadedDocuments;
                finalState.clients = loadedClients;
                finalState.investmentAssets = loadedInvestmentAssets.length > 0 ? loadedInvestmentAssets : defaultState.investmentAssets;
                 console.log("[Store] Collections assigned to final state.");

            } else {
                console.log("[Store] User lacks permissions to read data. State will remain mostly default.");
            }
        } else {
             console.log("[Store] No authenticated user. Using default state.");
        }

        finalState.currentUser = currentUser ? { uid: currentUser.uid, email: currentUser.email } : null;
        console.log("[Store] Final state before setting:", finalState);

        // Actualiza el estado global UNA VEZ al final
        state = finalState;

        // CORRECCIÓN PROBLEMA 3: Notificar DESPUÉS de que TODO el estado esté listo
        notify();
        console.log("[Store] State initialization complete and listeners notified.");


    } catch (error) {
        console.error("[Store] State initialization failed due to loading error:", error);
        state = getDefaultState();
        state.permissions = {};
        // Notificar incluso en caso de error para que la UI se actualice (aunque sea a un estado vacío)
        notify();
    }

    // Ya no es necesario notificar aquí, se hace al final del try o en catch
    // notify();
}
