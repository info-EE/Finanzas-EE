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
        } catch (error)
        {
            console.error("Error al fusionar datos guardados. Usando estado por defecto.", error);
            // Si hay un error, inicializamos con el estado por defecto para asegurar que la app funcione
            store.setState(getDefaultState());
        }
    } else {
        // Si no hay datos guardados, inicializa con el estado por defecto
        store.setState(getDefaultState());
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
        balance: 0, // El balance inicial se gestiona con una transacción
        logoHtml: logo.trim()
    };

    store.setState(state => ({
        accounts: [...state.accounts, newAccount]
    }));

    if (balance !== 0) {
        addOrUpdateTransaction({
            date: new Date().toISOString().slice(0, 10),
            description: 'Saldo Inicial',
            type: 'Ingreso', // Se maneja como ingreso para simplificar
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

export function createBalanceAdjustment(accountName, newBalance) {
    const state = store.getState();
    const account = state.accounts.find(acc => acc.name === accountName);
    if (!account) return;

    const currentBalance = account.balance;
    const difference = newBalance - currentBalance;

    if (difference !== 0) {
        addOrUpdateTransaction({
            date: new Date().toISOString().slice(0, 10),
            description: 'Ajuste de saldo manual',
            type: difference > 0 ? 'Ingreso' : 'Egreso',
            part: 'A',
            account: accountName,
            category: 'Ajuste de Saldo',
            amount: Math.abs(difference),
            currency: account.currency,
            isInitialBalance: false
        });
    }
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
        if (!state[stateKey].find(c => c.toLowerCase() === categoryName.toLowerCase())) {
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

// --- Client Actions ---

export function addOrUpdateClient(clientData) {
    if (clientData.id) {
        store.setState(state => ({
            clients: state.clients.map(c => c.id === clientData.id ? { ...c, ...clientData } : c)
        }));
    } else {
        store.setState(state => ({
            clients: [...state.clients, { ...clientData, id: crypto.randomUUID() }]
        }));
    }
}

export function deleteClient(clientId) {
    store.setState(state => ({
        clients: state.clients.filter(c => c.id !== clientId)
    }));
}

// --- Document Actions (Proformas, Invoices) ---

export function addDocument(docData) {
    store.setState(state => ({
        documents: [...state.documents, { ...docData, id: crypto.randomUUID() }]
    }));
}

export function deleteDocument(docId) {
    store.setState(state => ({
        documents: state.documents.filter(d => d.id !== docId)
    }));
}

export function toggleDocumentStatus(docId) {
    store.setState(state => ({
        documents: state.documents.map(d => {
            if (d.id === docId) {
                return { ...d, status: d.status === 'Adeudada' ? 'Cobrada' : 'Adeudada' };
            }
            return d;
        })
    }));
}

// --- Settings Actions ---

export function updateAeatConfig(config) {
    store.setState(state => ({
        settings: { ...state.settings, aeatConfig: config }
    }));
}

export function updateFiscalParams(params) {
    store.setState(state => ({
        settings: { ...state.settings, fiscalParameters: params }
    }));
}

export function toggleAeatModule() {
    store.setState(state => ({
        settings: { ...state.settings, aeatModuleActive: !state.settings.aeatModuleActive }
    }));
}

// --- Complex Actions ---

export function createTransfer(transferData) {
    const { date, fromAccount, toAccount, amount, feeSource, extraField } = transferData;
    let transactionsToAdd = [];

    // Egreso de la cuenta origen
    transactionsToAdd.push({
        id: crypto.randomUUID(), date,
        description: `Transferencia a ${toAccount.name}`,
        type: 'Egreso', part: 'A', account: fromAccount.name,
        category: 'Transferencia', amount: amount, currency: fromAccount.currency,
        isInitialBalance: false
    });

    // Ingreso en la cuenta destino
    let receivedAmount = amount;
    if (fromAccount.currency !== toAccount.currency) {
        if (extraField <= 0) {
           console.error('Monto a recibir requerido para transferencias multidivisa.');
           // Devolvemos una alerta o manejo de error a la UI
           return { error: 'Monto a recibir requerido para transferencias multidivisa.' };
        }
        receivedAmount = extraField;
    }
    transactionsToAdd.push({
        id: crypto.randomUUID(), date,
        description: `Transferencia desde ${fromAccount.name}`,
        type: 'Ingreso', part: 'A', account: toAccount.name,
        category: 'Transferencia', amount: receivedAmount, currency: toAccount.currency,
        isInitialBalance: false
    });

    // Comisiones
    if (feeSource > 0) {
        transactionsToAdd.push({
            id: crypto.randomUUID(), date,
            description: `Comisión por transferencia a ${toAccount.name}`,
            type: 'Egreso', part: 'A', account: fromAccount.name,
            category: 'Comisiones', amount: feeSource, currency: fromAccount.currency,
            isInitialBalance: false
        });
    }
    if (fromAccount.currency === toAccount.currency && extraField > 0) {
        transactionsToAdd.push({
            id: crypto.randomUUID(), date,
            description: `Comisión por transferencia desde ${fromAccount.name}`,
            type: 'Egreso', part: 'A', account: toAccount.name,
            category: 'Comisiones', amount: extraField, currency: toAccount.currency,
            isInitialBalance: false
        });
    }

    store.setState(state => ({
        transactions: [...state.transactions, ...transactionsToAdd]
    }));
    recalculateAllBalances();
    return { success: true };
}

export function performAnnualClosing(startDate, endDate) {
    const year = new Date(endDate).getFullYear();
    const start = new Date(startDate);
    const end = new Date(endDate);

    store.setState(state => {
        const transactionsToKeep = [];
        const transactionsToArchive = [];
        state.transactions.forEach(t => {
            const tDate = new Date(t.date);
            if (tDate >= start && tDate <= end) {
                transactionsToArchive.push(t);
            } else {
                transactionsToKeep.push(t);
            }
        });

        const documentsToKeep = [];
        const documentsToArchive = [];
        state.documents.forEach(d => {
            const dDate = new Date(d.date);
            if (dDate >= start && dDate <= end) {
                documentsToArchive.push(d);
            } else {
                documentsToKeep.push(d);
            }
        });

        const newArchivedData = { ...state.archivedData };
        if (!newArchivedData[year]) {
            newArchivedData[year] = { transactions: [], documents: [] };
        }
        newArchivedData[year].transactions.push(...transactionsToArchive);
        newArchivedData[year].documents.push(...documentsToArchive);
        
        return {
            transactions: transactionsToKeep,
            documents: documentsToKeep,
            archivedData: newArchivedData
        };
    });
}

