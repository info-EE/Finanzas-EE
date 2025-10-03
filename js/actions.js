/**
 * @file Actions & Business Logic
 * Este archivo contiene toda la lógica de negocio que modifica el estado.
 * Cada función aquí es una "acción" que describe un cambio en el estado de la aplicación.
 * Estas funciones son las únicas que deben llamar a `store.setState`.
 */

import { store } from './store.js';
import { getDefaultState } from './main.js'; // Lo importaremos desde main para evitar referencias circulares
import { storageService } from './storage.js';

// --- State Initialization ---

export function loadInitialData() {
    const savedData = storageService.loadState();
    if (savedData) {
        try {
            const defaultState = getDefaultState();
            const mergedState = { ...defaultState, ...savedData };

            // Asegurar que las propiedades principales sean arrays si existen en los datos guardados
            ['accounts', 'transactions', 'documents', 'clients', 'incomeCategories', 'expenseCategories', 'invoiceOperationTypes'].forEach(key => {
                if (Array.isArray(savedData[key])) {
                    mergedState[key] = savedData[key];
                }
            });

            // Lógica de migración para ajustes y módulos
            if (savedData.settings) {
                mergedState.settings = { ...defaultState.settings, ...savedData.settings };
            }
            if (savedData.modules) {
                 const savedModules = new Map(savedData.modules.map(m => [m.id, m]));
                 mergedState.modules = defaultState.modules.map(defaultModule => ({
                     ...defaultModule,
                     active: savedModules.has(defaultModule.id) ? savedModules.get(defaultModule.id).active : defaultModule.active
                 }));
            }
            
            store.setState(mergedState);
            recalculateAllBalances(); // Recalcular saldos después de cargar
        } catch (error) {
            console.error("Error al fusionar datos guardados. Usando estado por defecto.", error);
        }
    }
}

// --- Balance Calculation ---

export function recalculateAllBalances() {
    store.setState(state => {
        const accounts = JSON.parse(JSON.stringify(state.accounts)); // Copia profunda para evitar mutación
        const { transactions } = state;

        const initialBalances = new Map();
        accounts.forEach(acc => {
            const initialTx = transactions.find(t => t.isInitialBalance && t.account === acc.name);
            initialBalances.set(acc.name, initialTx ? initialTx.amount : 0);
        });

        accounts.forEach(account => {
            let currentBalance = initialBalances.get(account.name) || 0;
            transactions
                .filter(t => t.account === account.name && !t.isInitialBalance)
                .forEach(t => {
                    currentBalance += (t.type === 'Ingreso' ? t.amount : -t.amount);
                });
            account.balance = currentBalance;
        });
        return { accounts };
    });
}

// --- Transaction Actions ---

export function addOrUpdateTransaction(data) {
    if (data.id) { // Update existing
        store.setState(state => ({
            transactions: state.transactions.map(t => t.id === data.id ? { ...t, ...data } : t)
        }));
    } else { // Add new
        store.setState(state => ({
            transactions: [...state.transactions, { ...data, id: crypto.randomUUID() }]
        }));
    }
    recalculateAllBalances();
}

export function deleteTransaction(id) {
    store.setState(state => ({
        transactions: state.transactions.filter(t => t.id !== id)
    }));
    recalculateAllBalances();
}

// --- Account Actions ---

export function addAccount({ name, currency, balance, logo }) {
    const newAccount = {
        id: crypto.randomUUID(),
        name,
        currency,
        symbol: currency === 'EUR' ? '€' : '$',
        balance: balance,
        logoHtml: logo.trim()
    };

    store.setState(state => ({
        accounts: [...state.accounts, newAccount]
    }));

    if (balance !== 0) {
        addOrUpdateTransaction({
            date: new Date().toISOString().slice(0, 10),
            description: 'Saldo Inicial',
            type: 'Ingreso',
            part: 'A',
            account: name,
            category: 'Ajuste de Saldo',
            amount: balance,
            currency: currency,
            isInitialBalance: true
        });
    } else {
        recalculateAllBalances();
    }
}

export function deleteAccount(accountName) {
    store.setState(state => ({
        accounts: state.accounts.filter(acc => acc.name !== accountName),
        transactions: state.transactions.filter(t => t.account !== accountName)
    }));
    recalculateAllBalances();
}

// --- Category Actions ---

export function addCategory(type, categoryName) {
    const keyMap = {
        income: 'incomeCategories',
        expense: 'expenseCategories',
        operationType: 'invoiceOperationTypes'
    };
    const stateKey = keyMap[type];
    
    store.setState(state => {
        if (!state[stateKey].includes(categoryName)) {
            return { [stateKey]: [...state[stateKey], categoryName] };
        }
        return state; // No change if category already exists
    });
}

export function deleteCategory(type, categoryName) {
    const keyMap = {
        income: 'incomeCategories',
        expense: 'expenseCategories',
        operationType: 'invoiceOperationTypes'
    };
    const stateKey = keyMap[type];

    store.setState(state => ({
        [stateKey]: state[stateKey].filter(cat => cat !== categoryName)
    }));
}
