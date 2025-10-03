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
    const initialBalances = new Map();
    accounts.forEach(acc => {
        const initialTransaction = transactions.find(t => t.isInitialBalance && t.account === acc.name);
        initialBalances.set(acc.name, initialTransaction ? initialTransaction.amount : 0);
    });

    const updatedAccounts = JSON.parse(JSON.stringify(accounts));

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

export function saveTransaction(transactionData, transactionId) {
    const { transactions, accounts } = getState();
    let updatedTransactions = [...transactions];

    if (transactionId) {
        const index = updatedTransactions.findIndex(t => t.id === transactionId);
        if (index !== -1) {
            updatedTransactions[index] = { ...updatedTransactions[index], ...transactionData };
        }
    } else {
        updatedTransactions.push({ ...transactionData, id: crypto.randomUUID(), isInitialBalance: false });
    }
    
    const updatedAccounts = recalculateAllBalances(accounts, updatedTransactions);
    setState({ transactions: updatedTransactions, accounts: updatedAccounts });
}

export function deleteTransaction(transactionId) {
    const { transactions, accounts } = getState();
    const updatedTransactions = transactions.filter(t => t.id !== transactionId);
    const updatedAccounts = recalculateAllBalances(accounts, updatedTransactions);
    setState({ transactions: updatedTransactions, accounts: updatedAccounts });
}

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

    let updatedTransactions = [...transactions];
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

    const updatedAccounts = recalculateAllBalances([...accounts, newAccount], updatedTransactions);
    setState({ accounts: updatedAccounts, transactions: updatedTransactions });
}

export function deleteAccount(accountName) {
    const { accounts, transactions } = getState();
    const updatedAccounts = accounts.filter(acc => acc.name !== accountName);
    const updatedTransactions = transactions.filter(t => t.account !== accountName);
    setState({ accounts: updatedAccounts, transactions: updatedTransactions });
}

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

export function addTransfer(transferData) {
    const { date, fromAccountName, toAccountName, amount, feeSource, receivedAmount } = transferData;
    const { accounts, transactions } = getState();
    
    const fromAccount = accounts.find(a => a.name === fromAccountName);
    const toAccount = accounts.find(a => a.name === toAccountName);
    
    let newTransactions = [];

    newTransactions.push({
        id: crypto.randomUUID(), date,
        description: `Transferencia a ${toAccountName}`,
        type: 'Egreso', part: 'A', account: fromAccountName,
        category: 'Transferencia', amount: amount, currency: fromAccount.currency
    });

    newTransactions.push({
        id: crypto.randomUUID(), date,
        description: `Transferencia desde ${fromAccountName}`,
        type: 'Ingreso', part: 'A', account: toAccountName,
        category: 'Transferencia', amount: receivedAmount, currency: toAccount.currency
    });
    
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

export function deleteClient(clientId) {
    const { clients } = getState();
    const updatedClients = clients.filter(c => c.id !== clientId);
    setState({ clients: updatedClients });
}

export function addDocument(docData) {
    const { documents } = getState();
    const newDocument = { ...docData, id: crypto.randomUUID() };
    setState({ documents: [...documents, newDocument] });
}

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

export function deleteDocument(docId) {
    const { documents } = getState();
    const updatedDocuments = documents.filter(doc => doc.id !== docId);
    setState({ documents: updatedDocuments });
}

export function saveAeatConfig(aeatConfig) {
    const { settings } = getState();
    const updatedSettings = { ...settings, aeatConfig };
    setState({ settings: updatedSettings });
}

export function toggleAeatModule() {
    const { settings } = getState();
    const updatedSettings = { ...settings, aeatModuleActive: !settings.aeatModuleActive };
    setState({ settings: updatedSettings });
}

export function saveFiscalParams(fiscalParams) {
    const { settings } = getState();
    const updatedSettings = { ...settings, fiscalParameters: fiscalParams };
    setState({ settings: updatedSettings });
}

export function generateReport(filters) {
    const { transactions, documents, settings } = getState();
    let data, title, columns;

    if (filters.type === 'sociedades') {
        // Lógica para reporte de sociedades
        let startDate, endDate;
        const year = parseInt(filters.year, 10);
        switch (filters.period) {
            case '1P': startDate = new Date(Date.UTC(year, 0, 1)); endDate = new Date(Date.UTC(year, 2, 31, 23, 59, 59, 999)); break;
            case '2P': startDate = new Date(Date.UTC(year, 0, 1)); endDate = new Date(Date.UTC(year, 8, 30, 23, 59, 59, 999)); break;
            case '3P': startDate = new Date(Date.UTC(year, 0, 1)); endDate = new Date(Date.UTC(year, 10, 30, 23, 59, 59, 999)); break;
        }
        const fiscalAccounts = ['CAIXA Bank', 'Banco WISE']; // Ejemplo
        const filteredTransactions = transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate >= startDate && tDate <= endDate && t.part === 'A' && fiscalAccounts.includes(t.account) && t.currency === 'EUR';
        });

        let totalIngresos = 0, totalEgresos = 0;
        filteredTransactions.forEach(t => {
            if (t.type === 'Ingreso') totalIngresos += t.amount;
            else totalEgresos += t.amount;
        });

        const resultadoContable = totalIngresos - totalEgresos;
        const taxRate = settings.fiscalParameters.corporateTaxRate;
        const pagoACuenta = resultadoContable > 0 ? resultadoContable * (taxRate / 100) : 0;
        
        title = `Estimación Imp. Sociedades - ${filters.period} ${year}`;
        columns = ["Concepto", "Importe"];
        data = [
            ["Total Ingresos Computables", totalIngresos],
            ["Total Gastos Deducibles", totalEgresos],
            ["Resultado Contable Acumulado", resultadoContable],
            [`Pago a cuenta estimado (${taxRate}%)`, pagoACuenta]
        ];

    } else {
        // Lógica para otros reportes
        let startDate, endDate;
        // ... (cálculo de fechas como lo tenías)
        title = `Reporte de ${filters.type}`;
        data = []; // Lógica de filtrado para otros reportes
    }
    
    setState({ activeReport: { type: filters.type, data, title, columns } });
}


export function closeYear(startDate, endDate) {
    const { transactions, documents, archivedData } = getState();
    const year = new Date(endDate).getFullYear();

    const start = new Date(startDate);
    const end = new Date(endDate);

    const transactionsToArchive = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate >= start && tDate <= end;
    });
    const documentsToArchive = documents.filter(d => {
        const dDate = new Date(d.date);
        return dDate >= start && dDate <= end;
    });

    const newArchivedData = { ...archivedData };
    if (!newArchivedData[year]) {
        newArchivedData[year] = { transactions: [], documents: [] };
    }
    newArchivedData[year].transactions.push(...transactionsToArchive);
    newArchivedData[year].documents.push(...documentsToArchive);

    const remainingTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate < start || tDate > end;
    });
    const remainingDocuments = documents.filter(d => {
        const dDate = new Date(d.date);
        return dDate < start || dDate > end;
    });

    setState({
        transactions: remainingTransactions,
        documents: remainingDocuments,
        archivedData: newArchivedData
    });
}

