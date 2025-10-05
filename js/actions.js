import { getState, setState } from './store.js';

// --- Lógica Interna de Actualización Incremental de Balances ---

/**
 * Aplica el efecto de una transacción a los saldos de las cuentas.
 * @param {Array} accounts - El array actual de cuentas.
 * @param {Object} transaction - La transacción a aplicar.
 * @returns {Array} Un nuevo array de cuentas con los saldos actualizados.
 */
function applyTransactionToBalances(accounts, transaction) {
    // Las transacciones de saldo inicial no deben afectar los cálculos incrementales.
    if (transaction.isInitialBalance) {
        return accounts;
    }

    const accountIndex = accounts.findIndex(acc => acc.name === transaction.account);
    if (accountIndex === -1) {
        return accounts; // No se encontró la cuenta, no se hace nada.
    }

    const updatedAccounts = [...accounts];
    const accountToUpdate = { ...updatedAccounts[accountIndex] };

    if (transaction.type === 'Ingreso') {
        accountToUpdate.balance += transaction.amount;
    } else { // Egreso
        accountToUpdate.balance -= (transaction.amount + (transaction.iva || 0));
    }

    updatedAccounts[accountIndex] = accountToUpdate;
    return updatedAccounts;
}

/**
 * Revierte el efecto de una transacción de los saldos de las cuentas.
 * @param {Array} accounts - El array actual de cuentas.
 * @param {Object} transaction - La transacción a revertir.
 * @returns {Array} Un nuevo array de cuentas con los saldos actualizados.
 */
function revertTransactionFromBalances(accounts, transaction) {
    // Las transacciones de saldo inicial no deben afectar los cálculos incrementales.
    if (transaction.isInitialBalance) {
        return accounts;
    }
    
    const accountIndex = accounts.findIndex(acc => acc.name === transaction.account);
    if (accountIndex === -1) {
        return accounts;
    }

    const updatedAccounts = [...accounts];
    const accountToUpdate = { ...updatedAccounts[accountIndex] };

    if (transaction.type === 'Ingreso') {
        accountToUpdate.balance -= transaction.amount;
    } else { // Egreso
        accountToUpdate.balance += (transaction.amount + (transaction.iva || 0));
    }

    updatedAccounts[accountIndex] = accountToUpdate;
    return updatedAccounts;
}


// --- Acciones Públicas (modifican el estado) ---

export function saveTransaction(transactionData, transactionId) {
    let { transactions, accounts } = getState();
    let updatedTransactions = [...transactions];

    if (transactionId) {
        // --- Lógica para EDITAR una transacción existente ---
        const transactionIndex = updatedTransactions.findIndex(t => t.id === transactionId);
        if (transactionIndex !== -1) {
            const oldTransaction = updatedTransactions[transactionIndex];
            
            // 1. Revertir el saldo de la transacción antigua.
            accounts = revertTransactionFromBalances(accounts, oldTransaction);
            
            // 2. Crear la nueva transacción y actualizar el array.
            const updatedTransaction = { ...oldTransaction, ...transactionData };
            updatedTransactions[transactionIndex] = updatedTransaction;
            
            // 3. Aplicar el saldo de la nueva transacción.
            accounts = applyTransactionToBalances(accounts, updatedTransaction);
        }
    } else {
        // --- Lógica para AÑADIR una nueva transacción ---
        const newTransaction = { ...transactionData, id: crypto.randomUUID(), isInitialBalance: false };
        updatedTransactions.push(newTransaction);
        
        // Aplicar el efecto de la nueva transacción al saldo de la cuenta correspondiente.
        accounts = applyTransactionToBalances(accounts, newTransaction);
    }
    
    setState({ transactions: updatedTransactions, accounts });
}

export function deleteTransaction(transactionId) {
    let { transactions, accounts } = getState();
    const transactionToDelete = transactions.find(t => t.id === transactionId);

    if (transactionToDelete) {
        // Revertir el efecto de la transacción en el saldo antes de eliminarla.
        const updatedAccounts = revertTransactionFromBalances(accounts, transactionToDelete);
        const updatedTransactions = transactions.filter(t => t.id !== transactionId);
        setState({ transactions: updatedTransactions, accounts: updatedAccounts });
    }
}

export function addAccount(accountData) {
    const { accounts, transactions } = getState();
    
    const newAccount = {
        id: crypto.randomUUID(),
        name: accountData.name,
        currency: accountData.currency,
        symbol: accountData.currency === 'EUR' ? '€' : '$',
        balance: accountData.balance, // El saldo inicial se establece directamente.
        logoHtml: accountData.logoHtml
    };

    let updatedTransactions = [...transactions];
    // La transacción de "Saldo Inicial" es solo un registro, no se usa para cálculos incrementales.
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
            isInitialBalance: true // Marcar como saldo inicial para que sea ignorada en los cálculos.
        });
    }

    const updatedAccounts = [...accounts, newAccount];
    // No se necesita recalcular todo, solo se añade la nueva cuenta.
    setState({ accounts: updatedAccounts, transactions: updatedTransactions });
}

export function deleteAccount(accountName) {
    const { accounts, transactions } = getState();
    const updatedAccounts = accounts.filter(acc => acc.name !== accountName);
    // Al eliminar la cuenta, también se eliminan sus transacciones asociadas.
    const updatedTransactions = transactions.filter(t => t.account !== accountName);
    setState({ accounts: updatedAccounts, transactions: updatedTransactions });
}

export function updateBalance(accountName, newBalance) {
    const { accounts, transactions } = getState();
    const accountIndex = accounts.findIndex(acc => acc.name === accountName);
    if (accountIndex === -1) return;

    const account = accounts[accountIndex];
    const currentBalance = account.balance;
    const difference = newBalance - currentBalance;

    if (difference !== 0) {
        // 1. Crear la transacción de ajuste para mantener un registro.
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

        // 2. Actualizar el saldo de la cuenta directamente.
        const updatedAccounts = [...accounts];
        updatedAccounts[accountIndex] = { ...account, balance: newBalance };
        
        setState({ transactions: updatedTransactions, accounts: updatedAccounts });
    }
}

export function addTransfer(transferData) {
    const { date, fromAccountName, toAccountName, amount, feeSource, receivedAmount } = transferData;
    let { accounts, transactions } = getState();
    
    const fromAccount = accounts.find(a => a.name === fromAccountName);
    const toAccount = accounts.find(a => a.name === toAccountName);
    
    let newTransactions = [];

    // 1. Crear las transacciones de la transferencia.
    newTransactions.push({
        id: crypto.randomUUID(), date,
        description: `Transferencia a ${toAccountName}`,
        type: 'Egreso', part: 'A', account: fromAccountName,
        category: 'Transferencia', amount: amount, currency: fromAccount.currency, iva: 0
    });

    newTransactions.push({
        id: crypto.randomUUID(), date,
        description: `Transferencia desde ${fromAccountName}`,
        type: 'Ingreso', part: 'A', account: toAccountName,
        category: 'Transferencia', amount: receivedAmount, currency: toAccount.currency, iva: 0
    });
    
    if (feeSource > 0) {
        newTransactions.push({
            id: crypto.randomUUID(), date,
            description: `Comisión por transferencia a ${toAccountName}`,
            type: 'Egreso', part: 'A', account: fromAccountName,
            category: 'Comisiones', amount: feeSource, currency: fromAccount.currency, iva: 0
        });
    }

    // 2. Actualizar los saldos de las cuentas de forma incremental.
    let updatedAccounts = [...accounts];
    const fromAccountIndex = updatedAccounts.findIndex(a => a.name === fromAccountName);
    const toAccountIndex = updatedAccounts.findIndex(a => a.name === toAccountName);

    if (fromAccountIndex !== -1) {
        const totalDebit = amount + feeSource;
        updatedAccounts[fromAccountIndex] = { ...updatedAccounts[fromAccountIndex], balance: updatedAccounts[fromAccountIndex].balance - totalDebit };
    }
    if (toAccountIndex !== -1) {
         updatedAccounts[toAccountIndex] = { ...updatedAccounts[toAccountIndex], balance: updatedAccounts[toAccountIndex].balance + receivedAmount };
    }

    const updatedTransactions = [...transactions, ...newTransactions];
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
                startDate = new Date(filters.date + 'T00:00:00Z');
                endDate = new Date(filters.date + 'T23:59:59Z');
                break;
            case 'weekly':
                const [yearW, weekW] = filters.week.split('-W');
                const simple = new Date(Date.UTC(yearW, 0, 1 + (weekW - 1) * 7));
                const dow = simple.getUTCDay();
                const ISOweekStart = simple;
                if (dow <= 4) ISOweekStart.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1);
                else ISOweekStart.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay());
                startDate = new Date(ISOweekStart);
                endDate = new Date(startDate);
                endDate.setUTCDate(startDate.getUTCDate() + 6);
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
                const tDate = new Date(t.date + 'T00:00:00Z');
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
                const dDate = new Date(d.date + 'T00:00:00Z');
                return dDate >= startDate && dDate <= endDate;
            })
            .map(item => [item.date, item.number, item.client, item.amount, item.currency, item.status, item.type]);
    
    } else if (filters.type === 'inversiones') {
        title = `Reporte de Inversiones`;
        columns = ["Fecha", "Descripción", "Cuenta Origen", "Monto", "Moneda"];
        data = transactions
            .filter(t => {
                const tDate = new Date(t.date + 'T00:00:00Z');
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
            const tDate = new Date(t.date + 'T00:00:00Z');
            return tDate >= startDate && tDate <= endDate && t.part === 'A' && fiscalAccounts.includes(t.account) && t.currency === 'EUR';
        });

        let totalIngresos = 0, totalEgresos = 0;
        filteredTransactions.forEach(t => {
            if (t.type === 'Ingreso') totalIngresos += t.amount;
            else totalEgresos += t.amount + (t.iva || 0);
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

export function generateIvaReport(month) {
    const { transactions, documents } = getState();
    const [year, monthNum] = month.split('-').map(Number);

    const ivaSoportado = transactions.filter(t => {
        const tDate = new Date(t.date);
        return t.type === 'Egreso' && t.iva > 0 &&
               tDate.getFullYear() === year &&
               tDate.getMonth() + 1 === monthNum;
    });

    const ivaRepercutido = documents.filter(doc => {
        const dDate = new Date(doc.date);
        return doc.type === 'Factura' && doc.iva > 0 &&
               dDate.getFullYear() === year &&
               dDate.getMonth() + 1 === monthNum;
    });

    const totalSoportado = ivaSoportado.reduce((sum, t) => sum + t.iva, 0);
    const totalRepercutido = ivaRepercutido.reduce((sum, d) => sum + d.iva, 0);

    const ivaReport = {
        month: month,
        soportado: {
            total: totalSoportado,
            items: ivaSoportado.map(t => ({
                date: t.date,
                description: t.description,
                base: t.amount,
                iva: t.iva,
                currency: t.currency
            }))
        },
        repercutido: {
            total: totalRepercutido,
            items: ivaRepercutido.map(d => ({
                date: d.date,
                number: d.number,
                client: d.client,
                base: d.subtotal,
                iva: d.iva,
                currency: d.currency
            }))
        },
        resultado: totalRepercutido - totalSoportado
    };

    setState({ activeIvaReport: ivaReport });
}


export function closeYear(startDate, endDate) {
    const { transactions, documents, archivedData } = getState();
    const year = new Date(endDate).getFullYear();

    const start = new Date(startDate);
    const end = new Date(endDate);

    const transactionsToArchive = transactions.filter(t => {
        const tDate = new Date(t.date + 'T00:00:00Z');
        return tDate >= start && tDate <= end;
    });
    const documentsToArchive = documents.filter(d => {
        const dDate = new Date(d.date + 'T00:00:00Z');
        return dDate >= start && dDate <= end;
    });

    const newArchivedData = { ...archivedData };
    if (!newArchivedData[year]) {
        newArchivedData[year] = { transactions: [], documents: [] };
    }
    newArchivedData[year].transactions.push(...transactionsToArchive);
    newArchivedData[year].documents.push(...documentsToArchive);

    const remainingTransactions = transactions.filter(t => {
        const tDate = new Date(t.date + 'T00:00:00Z');
        return tDate < start || tDate > end;
    });
    const remainingDocuments = documents.filter(d => {
        const dDate = new Date(d.date + 'T00:00:00Z');
        return dDate < start || dDate > end;
    });

    setState({
        transactions: remainingTransactions,
        documents: remainingDocuments,
        archivedData: newArchivedData
    });
}

// --- Investment Actions ---

export function addInvestmentAsset(assetData) {
    const { investmentAssets } = getState();
    const newAsset = { ...assetData, id: crypto.randomUUID() };
    setState({ investmentAssets: [...investmentAssets, newAsset] });
}

export function deleteInvestmentAsset(assetId) {
    const { investmentAssets } = getState();
    const updatedAssets = investmentAssets.filter(asset => asset.id !== assetId);
    setState({ investmentAssets: updatedAssets });
}

export function addInvestment(investmentData) {
    const { accounts } = getState();
    const account = accounts.find(acc => acc.name === investmentData.account);

    if (!account) return;

    const transactionData = {
        date: investmentData.date,
        description: `Inversión en ${investmentData.assetName}: ${investmentData.description}`,
        type: 'Egreso',
        part: 'A', // Las inversiones generalmente son parte 'A'
        account: investmentData.account,
        category: 'Inversión',
        amount: investmentData.amount,
        iva: 0,
        currency: account.currency,
        // Guardamos una referencia al ID del activo para un futuro seguimiento
        investmentAssetId: investmentData.assetId 
    };

    saveTransaction(transactionData);
}
