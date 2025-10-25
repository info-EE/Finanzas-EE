import { getState, setState } from './store.js';
// --- INICIO REFACTOR (FASE 1) ---
// Importamos las nuevas funciones de api.js y quitamos saveData
import { 
    getAllUsers, 
    updateUserStatus, 
    updateUserPermissions,
    addDocToCollection,
    updateDocInCollection,
    deleteDocFromCollection,
    saveSettings
} from './api.js';
// --- FIN REFACTOR (FASE 1) ---


// --- Lógica Interna de Actualización de Balances (REFACTORIZADA) ---

/**
 * Calcula el nuevo saldo de una cuenta después de aplicar o revertir una transacción.
 * @param {number} currentBalance - El saldo actual de la cuenta.
 * @param {Object} transaction - La transacción a aplicar/revertir.
 * @param {'apply' | 'revert'} actionType - Si se debe aplicar o revertir la transacción.
 * @returns {number} El nuevo saldo calculado.
 */
function getNewBalance(currentBalance, transaction, actionType = 'apply') {
    // Las transacciones de saldo inicial no deben afectar los cálculos incrementales.
    if (transaction.isInitialBalance) {
        return currentBalance;
    }

    let newBalance = currentBalance;
    const amount = transaction.amount || 0;
    const iva = transaction.iva || 0;
    const sign = (actionType === 'apply') ? 1 : -1;

    if (transaction.type === 'Ingreso') {
        newBalance += (amount * sign);
    } else { // Egreso
        newBalance -= ((amount + iva) * sign);
    }
    
    // Redondear a 2 decimales para evitar problemas con punto flotante
    return Math.round(newBalance * 100) / 100;
}


// --- Acciones Públicas (modifican el estado y lo guardan) ---

// Esta función se mantiene por si se necesita en el futuro, pero no se usará para la activación.
const getPermissionsForLevel = (level) => {
    const allFalse = {
        view_dashboard: false, view_accounts: false, view_cashflow: false, manage_cashflow: false,
        execute_transfers: false, view_documents: false, manage_invoices: false, manage_proformas: false,
        change_document_status: false, view_clients: false, manage_clients: false, view_reports: false,
        view_iva_control: false, view_archives: false, view_investments: false, manage_investments: false,
        manage_accounts: false, manage_categories: false, execute_balance_adjustment: false,
        execute_year_close: false, manage_fiscal_settings: false, manage_users: false,
    };
    return allFalse; 
};

/**
 * Actualiza el ESTADO de un usuario a 'activo' o 'pendiente'.
 * Ya no aplica plantillas de permisos para dar control granular al admin.
 * @param {string} userId - El ID del usuario a modificar.
 * @param {string} level - Define si el estado será 'activo' o 'pendiente'.
 */
export async function updateUserAccessAction(userId, level) {
    const newStatus = (level === 'basico' || level === 'completo') ? 'activo' : 'pendiente';
    
    const updates = {
        status: newStatus
    };

    // Si se desactiva un usuario ('pendiente'), se le quitan todos los permisos por seguridad.
    if (newStatus === 'pendiente') {
        updates.permisos = getPermissionsForLevel('pendiente');
    }

    const success = await updateUserPermissions(userId, updates);
    
    if (success) {
        await loadAndSetAllUsers();
    }
    return success;
}

export async function loadAndSetAllUsers() {
    const rawUsers = await getAllUsers();
    const { settings } = getState();
    const blockedUserIds = (settings && settings.blockedUserIds) || [];
    
    // Filtramos los usuarios bloqueados y los que no tienen email (perfiles vacíos/reseteados)
    const filteredUsers = rawUsers.filter(user => user.email && !blockedUserIds.includes(user.id));

    setState({ allUsers: filteredUsers });
}

export async function toggleUserStatusAction(userId, currentStatus) {
    const newStatus = currentStatus === 'activo' ? 'pendiente' : 'activo';
    const success = await updateUserStatus(userId, newStatus);
    if (success) {
        await loadAndSetAllUsers();
    }
    return success;
}

// --- REFACTORIZADO (FASE 1) ---
// Ahora usa saveSettings en lugar de saveData/setState
export async function blockUserAction(userId) {
    const { settings } = getState();
    const adminUids = (settings && settings.adminUids) || [];
    
    if (adminUids.includes(userId)) {
        return { success: false, message: 'No se puede eliminar a un administrador.' };
    }

    const blockedUserIds = (settings && settings.blockedUserIds) || [];
    if (!blockedUserIds.includes(userId)) {
        const newSettings = {
            ...settings,
            blockedUserIds: [...blockedUserIds, userId]
        };
        // setState({ settings: newSettings }); // No es necesario, el listener lo hará
        await saveSettings(newSettings); // Guardamos la nueva configuración en Firestore
        await loadAndSetAllUsers(); // Refrescamos la lista de usuarios en la UI
        return { success: true };
    }
    return { success: true, message: 'El usuario ya estaba bloqueado.' };
}

// --- REFACTORIZADO (FASE 1) ---
// Lógica de guardado completamente nueva.
// Ahora actualiza la transacción y el saldo de la(s) cuenta(s) afectada(s) en Firestore.
export async function saveTransaction(transactionData, transactionId) {
    let { accounts, transactions } = getState();
    
    // Prepara los datos de la transacción (sin ID, Firestore lo genera)
    const newTransactionData = { 
        ...transactionData, 
        isInitialBalance: false 
    };

    if (transactionId) {
        // --- Lógica para EDITAR una transacción existente ---
        const oldTransaction = transactions.find(t => t.id === transactionId);
        if (!oldTransaction) {
            console.error("No se encontró la transacción antigua para editar.");
            return;
        }

        const oldAccount = accounts.find(acc => acc.name === oldTransaction.account);
        const newAccount = accounts.find(acc => acc.name === newTransactionData.account);

        if (!newAccount) {
            console.error("No se encontró la nueva cuenta para editar.");
            return;
        }

        if (oldAccount && oldAccount.id === newAccount.id) {
            // El usuario modificó la transacción, pero la cuenta es la misma
            const balanceReverted = getNewBalance(newAccount.balance, oldTransaction, 'revert');
            const newBalance = getNewBalance(balanceReverted, newTransactionData, 'apply');
            
            await updateDocInCollection('accounts', newAccount.id, { balance: newBalance });
        } else if (oldAccount) {
            // El usuario cambió la cuenta de la transacción
            // 1. Revertir el saldo de la cuenta antigua
            const oldAccountBalance = getNewBalance(oldAccount.balance, oldTransaction, 'revert');
            await updateDocInCollection('accounts', oldAccount.id, { balance: oldAccountBalance });
            
            // 2. Aplicar el saldo a la cuenta nueva
            const newAccountBalance = getNewBalance(newAccount.balance, newTransactionData, 'apply');
            await updateDocInCollection('accounts', newAccount.id, { balance: newAccountBalance });
        }
        
        // 3. Finalmente, actualizar la transacción en sí
        await updateDocInCollection('transactions', transactionId, newTransactionData);

    } else {
        // --- Lógica para AÑADIR una nueva transacción ---
        const account = accounts.find(acc => acc.name === newTransactionData.account);
        if (!account) {
            console.error("No se encontró la cuenta para añadir la transacción.");
            return;
        }
        
        // 1. Calcular el nuevo saldo
        const newBalance = getNewBalance(account.balance, newTransactionData, 'apply');
        
        // 2. Actualizar el saldo de la cuenta
        await updateDocInCollection('accounts', account.id, { balance: newBalance });
        
        // 3. Añadir la nueva transacción
        await addDocToCollection('transactions', newTransactionData);
    }
    
    // Ya no se llama a setState ni a saveData. El listener de onSnapshot se encargará.
}

// --- REFACTORIZADO (FASE 1) ---
// Lógica de eliminado completamente nueva.
export async function deleteTransaction(transactionId) {
    let { transactions, accounts } = getState();
    const transactionToDelete = transactions.find(t => t.id === transactionId);

    if (transactionToDelete) {
        const account = accounts.find(acc => acc.name === transactionToDelete.account);
        
        if (account) {
            // 1. Revertir el saldo de la cuenta afectada
            const newBalance = getNewBalance(account.balance, transactionToDelete, 'revert');
            await updateDocInCollection('accounts', account.id, { balance: newBalance });
        }
        
        // 2. Eliminar la transacción
        await deleteDocFromCollection('transactions', transactionId);
    }
}

// --- REFACTORIZADO (FASE 1) ---
export async function addAccount(accountData) {
    // El ID lo genera Firestore
    const newAccount = {
        name: accountData.name,
        currency: accountData.currency,
        balance: accountData.balance, // El saldo inicial se establece directamente.
        logoHtml: accountData.logoHtml
    };

    // 1. Añadir la nueva cuenta
    await addDocToCollection('accounts', newAccount);

    // 2. Si hay saldo inicial, crear la transacción de "Saldo Inicial"
    if (accountData.balance !== 0) {
        const initialTx = {
            // id: crypto.randomUUID(), // No es necesario
            date: new Date().toISOString().slice(0, 10),
            description: 'Saldo Inicial',
            type: 'Ingreso',
            part: 'A',
            account: accountData.name,
            category: 'Ajuste de Saldo',
            amount: accountData.balance,
            currency: accountData.currency,
            isInitialBalance: true // Marcar como saldo inicial.
        };
        await addDocToCollection('transactions', initialTx);
    }
}

// --- REFACTORIZADO (FASE 1) ---
export async function deleteAccount(accountId) {
    // Por ahora, solo eliminamos la cuenta.
    // Eliminar transacciones asociadas es una operación compleja (batch delete)
    // que es mejor implementar con cuidado más adelante.
    await deleteDocFromCollection('accounts', accountId);
    
    // Advertencia: Esto dejará transacciones "huérfanas" que apuntan a una cuenta
    // que ya no existe. El UI deberá manejar esto.
}

// --- REFACTORIZADO (FASE 1) ---
export async function updateBalance(accountName, newBalance) {
    const { accounts } = getState();
    const account = accounts.find(acc => acc.name === accountName);
    if (!account) return;

    const currentBalance = account.balance;
    const difference = newBalance - currentBalance;

    if (difference !== 0) {
        // 1. Crear la transacción de ajuste para mantener un registro.
        const adjustmentTransaction = {
            // id: crypto.randomUUID(), // No es necesario
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
        await addDocToCollection('transactions', adjustmentTransaction);

        // 2. Actualizar el saldo de la cuenta directamente.
        await updateDocInCollection('accounts', account.id, { balance: newBalance });
    }
}

// --- REFACTORIZADO (FASE 1) ---
export async function addTransfer(transferData) {
    const { date, fromAccountName, toAccountName, amount, feeSource, receivedAmount } = transferData;
    let { accounts } = getState();
    
    const fromAccount = accounts.find(a => a.name === fromAccountName);
    const toAccount = accounts.find(a => a.name === toAccountName);
    
    if (!fromAccount || !toAccount) {
        console.error("No se encontraron las cuentas para la transferencia");
        return;
    }

    // 1. Crear las transacciones de la transferencia.
    const txOut = {
        // id: crypto.randomUUID(), // No es necesario
        date,
        description: `Transferencia a ${toAccountName}`,
        type: 'Egreso', part: 'A', account: fromAccountName,
        category: 'Transferencia', amount: amount, currency: fromAccount.currency, iva: 0
    };
    await addDocToCollection('transactions', txOut);

    const txIn = {
        // id: crypto.randomUUID(), // No es necesario
        date,
        description: `Transferencia desde ${fromAccountName}`,
        type: 'Ingreso', part: 'A', account: toAccountName,
        category: 'Transferencia', amount: receivedAmount, currency: toAccount.currency, iva: 0
    };
    await addDocToCollection('transactions', txIn);
    
    if (feeSource > 0) {
        const txFee = {
            // id: crypto.randomUUID(), // No es necesario
            date,
            description: `Comisión por transferencia a ${toAccountName}`,
            type: 'Egreso', part: 'A', account: fromAccountName,
            category: 'Comisiones', amount: feeSource, currency: fromAccount.currency, iva: 0
        };
        await addDocToCollection('transactions', txFee);
    }

    // 2. Actualizar los saldos de las cuentas.
    const totalDebit = amount + feeSource;
    const newFromBalance = fromAccount.balance - totalDebit;
    const newToBalance = toAccount.balance + receivedAmount;

    await updateDocInCollection('accounts', fromAccount.id, { balance: newFromBalance });
    await updateDocInCollection('accounts', toAccount.id, { balance: newToBalance });
}

// --- REFACTORIZADO (FASE 1) ---
// Ahora guarda las categorías en el documento de Settings
export async function addCategory(categoryName, type) {
    const state = getState();
    const { settings } = state;
    let updatedList;
    let key;

    if (type === 'income') {
        key = 'incomeCategories';
        updatedList = [...(settings.incomeCategories || []), categoryName];
    } else if (type === 'expense') {
        key = 'expenseCategories';
        updatedList = [...(settings.expenseCategories || []), categoryName];
    } else if (type === 'operationType') {
        key = 'invoiceOperationTypes';
        updatedList = [...(settings.invoiceOperationTypes || []), categoryName];
    } else if (type === 'taxIdType') {
        key = 'taxIdTypes';
        updatedList = [...(settings.taxIdTypes || []), categoryName];
    } else {
        return;
    }
    
    await saveSettings({ [key]: updatedList });
}

// --- REFACTORIZADO (FASE 1) ---
export async function deleteCategory(categoryName, type) {
    const state = getState();
    const { settings } = state;
    let updatedList;
    let key;

    if (type === 'income') {
        key = 'incomeCategories';
        updatedList = (settings.incomeCategories || []).filter(cat => cat !== categoryName);
    } else if (type === 'expense') {
        key = 'expenseCategories';
        updatedList = (settings.expenseCategories || []).filter(cat => cat !== categoryName);
    } else if (type === 'operationType') {
        key = 'invoiceOperationTypes';
        updatedList = (settings.invoiceOperationTypes || []).filter(cat => cat !== categoryName);
    } else if (type === 'taxIdType') {
        key = 'taxIdTypes';
        updatedList = (settings.taxIdTypes || []).filter(cat => cat !== categoryName);
    } else {
        return;
    }
    
    await saveSettings({ [key]: updatedList });
}

// --- REFACTORIZADO (FASE 1) ---
export async function saveClient(clientData, clientId) {
    if (clientId) {
        await updateDocInCollection('clients', clientId, clientData);
    } else {
        // const newId = crypto.randomUUID(); // No es necesario
        await addDocToCollection('clients', clientData);
    }
}

// --- REFACTORIZADO (FASE 1) ---
export async function deleteClient(clientId) {
    await deleteDocFromCollection('clients', clientId);
}

// --- REFACTORIZADO (FASE 1) ---
export async function addDocument(docData) {
    const { settings } = getState();
    // const newDocument = { ...docData, id: crypto.randomUUID() }; // No es necesario
    const newDocument = { ...docData };

    await addDocToCollection('documents', newDocument);

    let updatedSettings = settings;

    // Si es una factura, actualizamos el contador.
    if (docData.type === 'Factura') {
        const currentCounter = settings.invoiceCounter;
        const currentYear = new Date(docData.date).getFullYear();
        let nextNumber;
        let nextYear;

        if (currentYear > currentCounter.lastInvoiceYear) {
            nextNumber = 2; // El 1 se acaba de usar para esta factura
            nextYear = currentYear;
        } else {
            nextNumber = currentCounter.nextInvoiceNumber + 1;
            nextYear = currentCounter.lastInvoiceYear;
        }

        updatedSettings = {
            ...settings,
            invoiceCounter: {
                nextInvoiceNumber: nextNumber,
                lastInvoiceYear: nextYear
            }
        };
        
        await saveSettings(updatedSettings);
    }
}

// --- REFACTORIZADO (FASE 1) ---
export async function toggleDocumentStatus(docId) {
    const { documents } = getState();
    const doc = documents.find(d => d.id === docId);
    if (doc) {
        const newStatus = doc.status === 'Adeudada' ? 'Cobrada' : 'Adeudada';
        await updateDocInCollection('documents', docId, { status: newStatus });
    }
}

// --- REFACTORIZADO (FASE 1) ---
export async function deleteDocument(docId) {
    await deleteDocFromCollection('documents', docId);
}

// --- REFACTORIZADO (FASE 1) ---
export async function savePaymentDetails(invoiceId, paymentData) {
    await updateDocInCollection('documents', invoiceId, { paymentDetails: paymentData });
    // Esta función ya no necesita devolver la factura, el handler se encargará.
}

// --- REFACTORIZADO (FASE 1) ---
export async function saveAeatConfig(aeatConfig) {
    const { settings } = getState();
    const updatedSettings = { ...settings, aeatConfig };
    await saveSettings(updatedSettings);
}

// --- REFACTORIZADO (FASE 1) ---
export async function toggleAeatModule() {
    const { settings } = getState();
    const updatedSettings = { ...settings, aeatModuleActive: !settings.aeatModuleActive };
    await saveSettings(updatedSettings);
}

// --- REFACTORIZADO (FASE 1) ---
export async function saveFiscalParams(fiscalParams) {
    const { settings } = getState();
    const updatedSettings = { ...settings, fiscalParameters: fiscalParams };
    await saveSettings(updatedSettings);
}

// --- SIN CAMBIOS ---
// Esta acción solo modifica el estado local (volátil), no guarda en DB.
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
    
    // Los reportes son datos volátiles, no necesitan guardarse.
    setState({ activeReport: { type: filters.type, data, title, columns } });
}

// --- SIN CAMBIOS ---
// Esta acción solo modifica el estado local (volátil), no guarda en DB.
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
    // El reporte de IVA es volátil, no necesita guardarse.
    setState({ activeIvaReport: ivaReport });
}

// --- REFACTORIZADO (FASE 1) ---
// Esta acción es compleja. Por ahora, la refactorizamos para que guarde
// el 'archivedData' en el documento de 'settings'.
// La eliminación de transacciones/documentos requerirá un batch write,
// que implementaremos más adelante. Por ahora, solo archivamos.
export async function closeYear(startDate, endDate) {
    const { transactions, documents, archivedData, settings } = getState();
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
    
    // Guardar los datos archivados en el documento de settings
    await saveSettings({ ...settings, archivedData: newArchivedData });

    // --- Lógica de Eliminación (TODO) ---
    // La eliminación de los datos originales debe hacerse con un batch write
    // para no sobrecargar las llamadas a la API.
    // Por ahora, advertimos que esto no está implementado.
    console.warn("Función 'closeYear': Los datos han sido archivados en settings, pero la eliminación de los registros originales aún no está implementada en esta refactorización.");

    /*
    // Lógica futura con batch writes:
    const txIdsToDelete = transactionsToArchive.map(t => t.id);
    const docIdsToDelete = documentsToArchive.map(d => d.id);
    await api.batchDelete('transactions', txIdsToDelete);
    await api.batchDelete('documents', docIdsToDelete);
    */

    // setState({
    //     transactions: remainingTransactions,
    //     documents: remainingDocuments,
    //     archivedData: newArchivedData
    // });
    // saveData(getState()); // Guardar el nuevo estado -- COMENTADO
}

// --- Investment Actions ---

// --- REFACTORIZADO (FASE 1) ---
export async function addInvestmentAsset(assetData) {
    // const newAsset = { ...assetData, id: crypto.randomUUID() }; // No es necesario
    await addDocToCollection('investmentAssets', assetData);
}

// --- REFACTORIZADO (FASE 1) ---
export async function deleteInvestmentAsset(assetId) {
    await deleteDocFromCollection('investmentAssets', assetId);
}

// --- REFACTORIZADO (FASE 1) ---
// saveTransaction ya es async, así que usamos await
export async function addInvestment(investmentData) {
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

    // Usamos await porque saveTransaction ahora es asíncrono
    await saveTransaction(transactionData);
}
