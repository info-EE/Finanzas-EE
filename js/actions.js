import { getState, setState } from './store.js';

// --- Lógica Interna de Recálculo ---

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

export function savePaymentDetails(invoiceId, paymentData) {
    const { documents } = getState();
    let updatedInvoice = null;
    const updatedDocuments = documents.map(doc => {
        if (doc.id === invoiceId) {
            updatedInvoice = { ...doc, paymentDetails: paymentData };
            return updatedInvoice;
        }
        return doc;
    });

    if (updatedInvoice) {
        setState({ documents: updatedDocuments });
    }
    
    return updatedInvoice;
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
    let data = [], title = '', columns = [];

    // --- Lógica de cálculo de fechas ---
    let startDate, endDate;
    if (filters.type !== 'sociedades') {
        switch (filters.period) {
            case 'daily':
                startDate = new Date(filters.date);
                endDate = new Date(filters.date);
                startDate.setUTCHours(0, 0, 0, 0);
                endDate.setUTCHours(23, 59, 59, 999);
                break;
            case 'weekly':
                const [yearW, weekW] = filters.week.split('-W');
                const simple = new Date(Date.UTC(yearW, 0, 1 + (weekW - 1) * 7));
                const dow = simple.getUTCDay();
                const ISOweekStart = simple;
                if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getUTCDay() + 1);
                else ISOweekStart.setDate(simple.getDate() + 8 - simple.getUTCDay());
                startDate = new Date(ISOweekStart);
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 6);
                endDate.setUTCHours(23, 59, 59, 999);
                break;
            case 'monthly':
                const [yearM, monthM] = filters.month.split('-');
                startDate = new Date(Date.UTC(yearM, monthM - 1, 1));
                endDate = new Date(Date.UTC(yearM, monthM, 0, 23, 59, 59, 999));
                break;
            case 'annual':
                startDate = new Date(Date.UTC(filters.year, 0, 1));
                endDate = new Date(Date.UTC(filters.year, 11, 31, 23, 59, 59, 999));
                break;
        }
    }

    // --- Lógica específica por tipo de reporte ---
    if (filters.type === 'movimientos') {
        title = `Reporte de Movimientos`;
        columns = ["Fecha", "Descripción", "Cuenta", "Categoría", "Tipo", "Monto", "Moneda", "Parte"];
        data = transactions
            .filter(t => {
                const tDate = new Date(t.date);
                const inDateRange = tDate >= startDate && tDate <= endDate;
                const accountMatch = filters.account === 'all' || t.account === filters.account;
                const partMatch = filters.part === 'all' || t.part === filters.part;
                return inDateRange && accountMatch && partMatch;
            })
            .map(item => [item.date, item.description, item.account, item.category, item.type, item.amount, item.currency, item.part]);

    } else if (filters.type === 'documentos') {
        title = `Reporte de Documentos`;
        columns = ["Fecha", "Número", "Cliente", "Monto", "Moneda", "Estado", "Tipo"];
        data = documents
            .filter(d => {
                const dDate = new Date(d.date);
                return dDate >= startDate && dDate <= endDate;
            })
            .map(item => [item.date, item.number, item.client, item.amount, item.currency, item.status, item.type]);
    
    } else if (filters.type === 'inversiones') {
        title = `Reporte de Inversiones`;
        columns = ["Fecha", "Descripción", "Cuenta Origen", "Monto", "Moneda"];
        data = transactions
            .filter(t => {
                const tDate = new Date(t.date);
                return tDate >= startDate && tDate <= endDate && t.category === 'Inversión';
            })
            .map(item => [item.date, item.description, item.account, item.amount, item.currency]);

    } else if (filters.type === 'sociedades') {
        const year = parseInt(filters.year, 10);
        switch (filters.period) {
            case '1P': startDate = new Date(Date.UTC(year, 0, 1)); endDate = new Date(Date.UTC(year, 2, 31, 23, 59, 59, 999)); break;
            case '2P': startDate = new Date(Date.UTC(year, 0, 1)); endDate = new Date(Date.UTC(year, 8, 30, 23, 59, 59, 999)); break;
            case '3P': startDate = new Date(Date.UTC(year, 0, 1)); endDate = new Date(Date.UTC(year, 10, 30, 23, 59, 59, 999)); break;
        }
        const fiscalAccounts = ['CAIXA Bank', 'Banco WISE'];
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
