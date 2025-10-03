import { getState, setState } from './store.js';

// --- Lógica Interna de Recálculo ---

/**
 * Recalcula el saldo de todas las cuentas basándose en las transacciones.
 * Esta es una función pura: no modifica el estado directamente, solo devuelve los datos calculados.
 * @param {Array} accounts - El array de cuentas actual.
 * @param {Array} transactions - El array de transacciones actual.
 * @returns {Array} Un nuevo array de cuentas con los saldos actualizados.
 */
function recalculateAllBalances(accounts, transactions) {
    // Creamos un mapa para almacenar los saldos iniciales de cada cuenta.
    const initialBalances = new Map();
    accounts.forEach(acc => {
        const initialTransaction = transactions.find(t => t.isInitialBalance && t.account === acc.name);
        initialBalances.set(acc.name, initialTransaction ? initialTransaction.amount : 0);
    });

    // Creamos una copia profunda de las cuentas para no mutar el estado original.
    const updatedAccounts = JSON.parse(JSON.stringify(accounts));

    // Calculamos el saldo final para cada cuenta.
    updatedAccounts.forEach(account => {
        let currentBalance = initialBalances.get(account.name) || 0;
        transactions
            .filter(t => t.account === account.name && !t.isInitialBalance)
            .forEach(t => {
                currentBalance += (t.type === 'Ingreso' ? t.amount : -t.amount);
            });
        account.balance = currentBalance;
    });

    return updatedAccounts;
}


// --- Acciones Públicas (modifican el estado) ---

/**
 * Añade o actualiza una transacción y recalcula los saldos.
 * @param {object} transactionData - Los datos de la transacción.
 * @param {string|null} transactionId - El ID de la transacción a editar, o null si es nueva.
 */
export function saveTransaction(transactionData, transactionId) {
    const { transactions, accounts } = getState();
    let updatedTransactions = [...transactions];

    if (transactionId) {
        // Editar transacción existente
        const index = updatedTransactions.findIndex(t => t.id === transactionId);
        if (index !== -1) {
            updatedTransactions[index] = { ...updatedTransactions[index], ...transactionData };
        }
    } else {
        // Añadir nueva transacción
        updatedTransactions.push({ ...transactionData, id: crypto.randomUUID() });
    }
    
    const updatedAccounts = recalculateAllBalances(accounts, updatedTransactions);
    setState({ transactions: updatedTransactions, accounts: updatedAccounts });
}

/**
 * Elimina una transacción y recalcula los saldos.
 * @param {string} transactionId - El ID de la transacción a eliminar.
 */
export function deleteTransaction(transactionId) {
    const { transactions, accounts } = getState();
    const updatedTransactions = transactions.filter(t => t.id !== transactionId);
    const updatedAccounts = recalculateAllBalances(accounts, updatedTransactions);
    setState({ transactions: updatedTransactions, accounts: updatedAccounts });
}

/**
 * Añade una nueva cuenta con su saldo inicial.
 * @param {object} accountData - Datos de la nueva cuenta (name, currency, balance, logoHtml).
 */
export function addAccount(accountData) {
    const { accounts, transactions } = getState();
    
    const newAccount = {
        id: crypto.randomUUID(),
        name: accountData.name,
        currency: accountData.currency,
        symbol: accountData.currency === 'EUR' ? '€' : '$',
        balance: accountData.balance,
        logoHtml: accountData.logoHtml
    };

    const updatedAccounts = [...accounts, newAccount];
    let updatedTransactions = [...transactions];

    // Si hay saldo inicial, se crea una transacción especial para registrarlo.
    if (accountData.balance !== 0) {
        updatedTransactions.push({
            id: crypto.randomUUID(),
            date: new Date().toISOString().slice(0, 10),
            description: 'Saldo Inicial',
            type: 'Ingreso',
            part: 'A',
            account: accountData.name,
            category: 'Ajuste de Saldo',
            amount: accountData.balance,
            currency: accountData.currency,
            isInitialBalance: true
        });
    }

    // No es necesario recalcular, ya que el saldo ya está establecido.
    setState({ accounts: updatedAccounts, transactions: updatedTransactions });
}

/**
 * Elimina una cuenta y todas sus transacciones asociadas.
 * @param {string} accountName - El nombre de la cuenta a eliminar.
 */
export function deleteAccount(accountName) {
    const { accounts, transactions } = getState();
    const updatedAccounts = accounts.filter(acc => acc.name !== accountName);
    const updatedTransactions = transactions.filter(t => t.account !== accountName);
    // No es necesario recalcular, ya que las transacciones también se eliminan.
    setState({ accounts: updatedAccounts, transactions: updatedTransactions });
}

/**
 * Crea una transacción de ajuste para conciliar el saldo de una cuenta.
 * @param {string} accountName - El nombre de la cuenta a ajustar.
 * @param {number} newBalance - El nuevo saldo real de la cuenta.
 */
export function updateBalance(accountName, newBalance) {
    const { accounts, transactions } = getState();
    const account = accounts.find(acc => acc.name === accountName);
    if (!account) return;

    const currentBalance = account.balance;
    const difference = newBalance - currentBalance;

    if (difference !== 0) {
        const adjustmentTransaction = {
            id: crypto.randomUUID(),
            date: new Date().toISOString().slice(0, 10),
            description: 'Ajuste de saldo manual',
            type: difference > 0 ? 'Ingreso' : 'Egreso',
            part: 'A',
            account: accountName,
            category: 'Ajuste de Saldo',
            amount: Math.abs(difference),
            currency: account.currency,
            isInitialBalance: false
        };
        const updatedTransactions = [...transactions, adjustmentTransaction];
        const updatedAccounts = recalculateAllBalances(accounts, updatedTransactions);
        setState({ transactions: updatedTransactions, accounts: updatedAccounts });
    }
}


/**
 * Realiza una transferencia entre dos cuentas, generando las transacciones correspondientes.
 * @param {object} transferData - Datos de la transferencia.
 */
export function addTransfer(transferData) {
    const { date, fromAccountName, toAccountName, amount, feeSource, receivedAmount } = transferData;
    const { accounts, transactions } = getState();
    
    const fromAccount = accounts.find(a => a.name === fromAccountName);
    const toAccount = accounts.find(a => a.name === toAccountName);
    
    let newTransactions = [];

    // 1. Egreso de la cuenta origen
    newTransactions.push({
        id: crypto.randomUUID(), date,
        description: `Transferencia a ${toAccountName}`,
        type: 'Egreso', part: 'A', account: fromAccountName,
        category: 'Transferencia', amount: amount, currency: fromAccount.currency
    });

    // 2. Ingreso en la cuenta destino
    newTransactions.push({
        id: crypto.randomUUID(), date,
        description: `Transferencia desde ${fromAccountName}`,
        type: 'Ingreso', part: 'A', account: toAccountName,
        category: 'Transferencia', amount: receivedAmount, currency: toAccount.currency
    });
    
    // 3. Comisión en origen (si existe)
    if (feeSource > 0) {
        newTransactions.push({
            id: crypto.randomUUID(), date,
            description: `Comisión por transferencia a ${toAccountName}`,
            type: 'Egreso', part: 'A', account: fromAccountName,
            category: 'Comisiones', amount: feeSource, currency: fromAccount.currency
        });
    }

    const updatedTransactions = [...transactions, ...newTransactions];
    const updatedAccounts = recalculateAllBalances(accounts, updatedTransactions);
    setState({ transactions: updatedTransactions, accounts: updatedAccounts });
}

/**
 * Añade una nueva categoría a la lista correspondiente.
 * @param {string} categoryName - El nombre de la nueva categoría.
 * @param {'income' | 'expense' | 'operationType'} type - El tipo de categoría.
 */
export function addCategory(categoryName, type) {
    const state = getState();
    let updatedList;
    let key;

    if (type === 'income') {
        key = 'incomeCategories';
        updatedList = [...state.incomeCategories, categoryName];
    } else if (type === 'expense') {
        key = 'expenseCategories';
        updatedList = [...state.expenseCategories, categoryName];
    } else {
        key = 'invoiceOperationTypes';
        updatedList = [...state.invoiceOperationTypes, categoryName];
    }
    
    setState({ [key]: updatedList });
}

/**
 * Elimina una categoría de la lista correspondiente.
 * @param {string} categoryName - El nombre de la categoría a eliminar.
 * @param {'income' | 'expense' | 'operationType'} type - El tipo de categoría.
 */
export function deleteCategory(categoryName, type) {
    const state = getState();
    let updatedList;
    let key;

    if (type === 'income') {
        key = 'incomeCategories';
        updatedList = state.incomeCategories.filter(cat => cat !== categoryName);
    } else if (type === 'expense') {
        key = 'expenseCategories';
        updatedList = state.expenseCategories.filter(cat => cat !== categoryName);
    } else {
        key = 'invoiceOperationTypes';
        updatedList = state.invoiceOperationTypes.filter(cat => cat !== categoryName);
    }
    
    setState({ [key]: updatedList });
}

/**
 * Añade o actualiza un cliente.
 * @param {object} clientData - Los datos del cliente.
 * @param {string|null} clientId - El ID del cliente a editar, o null si es nuevo.
 */
export function saveClient(clientData, clientId) {
    const { clients } = getState();
    let updatedClients = [...clients];

    if (clientId) {
        const index = updatedClients.findIndex(c => c.id === clientId);
        if (index !== -1) {
            updatedClients[index] = { ...updatedClients[index], ...clientData };
        }
    } else {
        updatedClients.push({ ...clientData, id: crypto.randomUUID() });
    }
    
    setState({ clients: updatedClients });
}

/**
 * Elimina un cliente.
 * @param {string} clientId - El ID del cliente a eliminar.
 */
export function deleteClient(clientId) {
    const { clients } = getState();
    const updatedClients = clients.filter(c => c.id !== clientId);
    setState({ clients: updatedClients });
}

/**
 * Añade un nuevo documento (Proforma o Factura).
 * @param {object} docData - Los datos del documento.
 */
export function addDocument(docData) {
    const { documents } = getState();
    const newDocument = { ...docData, id: crypto.randomUUID() };
    setState({ documents: [...documents, newDocument] });
}

/**
 * Cambia el estado de un documento (ej. de 'Adeudada' a 'Cobrada').
 * @param {string} docId - El ID del documento.
 */
export function toggleDocumentStatus(docId) {
    const { documents } = getState();
    const updatedDocuments = documents.map(doc => {
        if (doc.id === docId) {
            return { ...doc, status: doc.status === 'Adeudada' ? 'Cobrada' : 'Adeudada' };
        }
        return doc;
    });
    setState({ documents: updatedDocuments });
}

/**
 * Elimina un documento.
 * @param {string} docId - El ID del documento.
 */
export function deleteDocument(docId) {
    const { documents } = getState();
    const updatedDocuments = documents.filter(doc => doc.id !== docId);
    setState({ documents: updatedDocuments });
}

/**
 * Guarda la configuración del módulo AEAT.
 * @param {object} aeatConfig - La nueva configuración.
 */
export function saveAeatConfig(aeatConfig) {
    const { settings } = getState();
    const updatedSettings = { ...settings, aeatConfig };
    setState({ settings: updatedSettings });
}

/**
 * Activa o desactiva el módulo AEAT.
 */
export function toggleAeatModule() {
    const { settings } = getState();
    const updatedSettings = { ...settings, aeatModuleActive: !settings.aeatModuleActive };
    setState({ settings: updatedSettings });
}

/**
 * Guarda los parámetros fiscales.
 * @param {object} fiscalParams - Los nuevos parámetros.
 */
export function saveFiscalParams(fiscalParams) {
    const { settings } = getState();
    const updatedSettings = { ...settings, fiscalParameters: fiscalParams };
    setState({ settings: updatedSettings });
}

