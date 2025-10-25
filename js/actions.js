// Importaciones de Fase 1
import { getState, setState } from './store.js';
import { 
    addDocToCollection, 
    updateDocInCollection,
    deleteDocFromCollection,
    saveSettings,
    getAllUsers, 
    updateUserStatus, 
    updateUserPermissions,
    // --- NUEVA IMPORTACIÓN DE FASE 2 ---
    incrementAccountBalance 
} from './api.js';

// --- Lógica Interna de Actualización de Balances (ELIMINADA EN FASE 2) ---
// Las funciones applyTransactionToBalances y revertTransactionFromBalances
// han sido eliminadas. La lógica ahora se maneja con incrementAccountBalance.


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
        await saveSettings(newSettings); // (Modificado en Fase 1)
        await loadAndSetAllUsers(); // Refrescamos la lista de usuarios en la UI
        return { success: true };
    }
    return { success: true, message: 'El usuario ya estaba bloqueado.' };
}

// --- MODIFICADO EN FASE 2 ---
export async function saveTransaction(transactionData, transactionId) {
    const { accounts, transactions } = getState();
    
    // 1. Encontrar la cuenta (documento) correspondiente al nombre
    const newAccount = accounts.find(acc => acc.name === transactionData.account);
    if (!newAccount) {
        console.error("No se encontró la cuenta:", transactionData.account);
        return;
    }
    
    // 2. Calcular el monto a aplicar (positivo para ingreso, negativo para egreso)
    const amountToApply = transactionData.type === 'Ingreso'
        ? transactionData.amount
        : -(transactionData.amount + (transactionData.iva || 0));

    if (transactionId) {
        // --- Lógica para EDITAR ---
        const oldTransaction = transactions.find(t => t.id === transactionId);
        if (!oldTransaction) return;

        const oldAccount = accounts.find(acc => acc.name === oldTransaction.account);
        if (!oldAccount) return;

        // 1. Calcular el monto a revertir
        const amountToRevert = oldTransaction.type === 'Ingreso'
            ? -oldTransaction.amount
            : (oldTransaction.amount + (oldTransaction.iva || 0));

        // 2. Actualizar el documento de la transacción
        const updatedTransactionData = { ...transactionData, accountId: newAccount.id };
        await updateDocInCollection('transactions', transactionId, updatedTransactionData);

        // 3. Actualizar saldos
        if (oldAccount.id === newAccount.id) {
            // La cuenta es la misma, solo calculamos la diferencia neta
            const netChange = amountToApply + amountToRevert;
            if (netChange !== 0) { // Solo actualiza si hay un cambio neto
                await incrementAccountBalance(newAccount.id, netChange);
            }
        } else {
            // La cuenta cambió, revertimos en la antigua y aplicamos en la nueva
            await incrementAccountBalance(oldAccount.id, amountToRevert);
            await incrementAccountBalance(newAccount.id, amountToApply);
        }

    } else {
        // --- Lógica para AÑADIR ---
        const newTransaction = { 
            ...transactionData, 
            isInitialBalance: false, 
            accountId: newAccount.id // Guardamos el ID de la cuenta para referencia
        };
        
        // 1. Añadir el documento de la transacción
        // Usamos addDocToCollection que ahora devuelve el doc con ID
        const addedTransaction = await addDocToCollection('transactions', newTransaction); 
        
        // 2. Actualizar el saldo de la cuenta
        await incrementAccountBalance(newAccount.id, amountToApply);
    }
}

// --- MODIFICADO EN FASE 2 ---
export async function deleteTransaction(transactionId) {
    const { transactions, accounts } = getState();
    const transactionToDelete = transactions.find(t => t.id === transactionId);
    if (!transactionToDelete) return;

    // Usamos accountId si existe, si no, buscamos por nombre (para compatibilidad temporal)
    const accountId = transactionToDelete.accountId || accounts.find(acc => acc.name === transactionToDelete.account)?.id; 
    
    if (!accountId) {
        console.error("No se pudo encontrar el ID de la cuenta para la transacción a eliminar:", transactionToDelete);
        return;
    }

    // 1. Calcular el monto a revertir
    const amountToRevert = transactionToDelete.type === 'Ingreso'
        ? -transactionToDelete.amount
        : (transactionToDelete.amount + (transactionToDelete.iva || 0));

    // 2. Eliminar el documento de la transacción
    await deleteDocFromCollection('transactions', transactionId);
    
    // 3. Actualizar el saldo de la cuenta (revirtiendo)
    await incrementAccountBalance(accountId, amountToRevert);
}

// --- MODIFICADO EN FASE 2 ---
export async function addAccount(accountData) {
    // El saldo inicial se establece directamente en el documento de la cuenta.
    const newAccount = {
        // ID se genera en addDocToCollection ahora
        name: accountData.name,
        currency: accountData.currency,
        symbol: accountData.currency === 'EUR' ? '€' : '$',
        balance: accountData.balance || 0, // Asegura que balance sea un número
        logoHtml: accountData.logoHtml
    };
    
    // Ya no creamos una transacción de "Saldo Inicial".
    // El balance se guarda al crear la cuenta.
    await addDocToCollection('accounts', newAccount);
}

// --- MODIFICADO EN FASE 2 ---
export async function deleteAccount(accountId) {
    const { accounts, transactions } = getState(); // Necesitamos transactions para la verificación
    
    const accountToDelete = accounts.find(acc => acc.id === accountId);
    if (!accountToDelete) return;

    // Si el saldo no es CERO EXACTO, no la eliminamos.
    // Comparamos con un margen pequeño por posibles errores de punto flotante.
    if (Math.abs(accountToDelete.balance) > 0.001) { 
        alert("No se puede eliminar una cuenta con saldo diferente de cero. Realice un ajuste a 0 primero.");
        return; 
    }
    
    // Comprobar si hay transacciones asociadas a esta cuenta (usando accountId si existe)
    const hasTransactions = transactions.some(t => t.accountId === accountId || t.account === accountToDelete.name);
    if (hasTransactions) {
         alert("No se puede eliminar una cuenta que tiene transacciones asociadas. Esta acción se ha bloqueado por seguridad.");
         return;
    }

    // Si saldo es 0 y no hay transacciones, se elimina.
    await deleteDocFromCollection('accounts', accountId);
}

// --- MODIFICADO EN FASE 2 ---
export async function updateBalance(accountName, newBalance) {
    const { accounts } = getState();
    const account = accounts.find(acc => acc.name === accountName);
    if (!account) return;

    // Obtenemos el saldo actual directamente del estado (que está sincronizado)
    const currentBalance = account.balance; 
    const difference = newBalance - currentBalance;

    if (Math.abs(difference) > 0.001) { // Solo si la diferencia es significativa
        // 1. Crear la transacción de ajuste para mantener un registro.
        const adjustmentTransaction = {
            date: new Date().toISOString().slice(0, 10),
            description: 'Ajuste de saldo manual',
            type: difference > 0 ? 'Ingreso' : 'Egreso',
            part: 'A',
            account: accountName, // Mantenemos el nombre aquí por ahora
            category: 'Ajuste de Saldo',
            amount: Math.abs(difference),
            currency: account.currency,
            isInitialBalance: false,
            accountId: account.id // Guardamos el ID
        };
        
        // 2. Añadir la transacción de ajuste
        await addDocToCollection('transactions', adjustmentTransaction);

        // 3. Actualizar el saldo de la cuenta con la diferencia usando increment
        await incrementAccountBalance(account.id, difference);
    } else {
        console.log("La diferencia de saldo es demasiado pequeña, no se realiza ajuste.");
    }
}

// --- MODIFICADO EN FASE 2 ---
export async function addTransfer(transferData) {
    const { date, fromAccountName, toAccountName, amount, feeSource, receivedAmount } = transferData;
    const { accounts } = getState();
    
    const fromAccount = accounts.find(a => a.name === fromAccountName);
    const toAccount = accounts.find(a => a.name === toAccountName);
    
    if (!fromAccount || !toAccount) {
        console.error("Cuenta de origen o destino no encontrada.");
        return;
    }

    // 1. Crear las transacciones (ahora incluyen accountId)
    const egresoTransData = {
        date,
        description: `Transferencia a ${toAccountName}`,
        type: 'Egreso', part: 'A', account: fromAccountName, // Mantenemos nombre por ahora
        category: 'Transferencia', amount: amount, currency: fromAccount.currency, iva: 0,
        accountId: fromAccount.id 
    };

    const ingresoTransData = {
        date,
        description: `Transferencia desde ${fromAccountName}`,
        type: 'Ingreso', part: 'A', account: toAccountName, // Mantenemos nombre por ahora
        category: 'Transferencia', amount: receivedAmount, currency: toAccount.currency, iva: 0,
        accountId: toAccount.id
    };
    
    // 2. Usamos Promise.all para ejecutar todo en paralelo
    const promises = [
        addDocToCollection('transactions', egresoTransData),
        addDocToCollection('transactions', ingresoTransData),
        incrementAccountBalance(fromAccount.id, -amount), // Restar monto enviado
        incrementAccountBalance(toAccount.id, receivedAmount) // Sumar monto recibido
    ];

    // 3. Manejar la comisión (si existe)
    if (feeSource > 0) {
        const feeTransData = {
            date,
            description: `Comisión por transferencia a ${toAccountName}`,
            type: 'Egreso', part: 'A', account: fromAccountName, // Mantenemos nombre
            category: 'Comisiones', amount: feeSource, currency: fromAccount.currency, iva: 0,
            accountId: fromAccount.id 
        };
        promises.push(addDocToCollection('transactions', feeTransData));
        promises.push(incrementAccountBalance(fromAccount.id, -feeSource)); // Restar comisión
    }

    // Esperar a que todas las operaciones de la base de datos terminen
    await Promise.all(promises);
}

// --- Acciones de Categorías, Clientes, Documentos (Sin cambios en Fase 2) ---

export async function addCategory(categoryName, type) { // Modificado para ser async
    const state = getState();
    let updatedList;
    let key;

    if (type === 'income') {
        key = 'incomeCategories';
        updatedList = [...new Set([...state.incomeCategories, categoryName])]; // Evita duplicados
    } else if (type === 'expense') {
        key = 'expenseCategories';
        updatedList = [...new Set([...state.expenseCategories, categoryName])]; // Evita duplicados
    } else if (type === 'operationType') {
        key = 'invoiceOperationTypes';
        updatedList = [...new Set([...state.invoiceOperationTypes, categoryName])]; // Evita duplicados
    } else if (type === 'taxIdType') {
        key = 'taxIdTypes';
        updatedList = [...new Set([...state.taxIdTypes, categoryName])]; // Evita duplicados
    } else {
        return;
    }
    
    // Las categorías se guardan en el documento 'settings'
    const { settings } = getState();
    // Solo guardar si la lista realmente cambió
    if (state[key].length !== updatedList.length) {
        const updatedSettings = { ...settings, [key]: updatedList };
        await saveSettings(updatedSettings); // (de Fase 1, ahora async)
    }
}

export async function deleteCategory(categoryName, type) { // Modificado para ser async
    const state = getState();
    let updatedList;
    let key;

    if (type === 'income') {
        key = 'incomeCategories';
        updatedList = state.incomeCategories.filter(cat => cat !== categoryName);
    } else if (type === 'expense') {
        key = 'expenseCategories';
        updatedList = state.expenseCategories.filter(cat => cat !== categoryName);
    } else if (type === 'operationType') {
        key = 'invoiceOperationTypes';
        updatedList = state.invoiceOperationTypes.filter(cat => cat !== categoryName);
    } else if (type === 'taxIdType') {
        key = 'taxIdTypes';
        updatedList = state.taxIdTypes.filter(cat => cat !== categoryName);
    } else {
        return;
    }
    
    const { settings } = getState();
    // Solo guardar si la lista realmente cambió
    if (state[key].length !== updatedList.length) {
        const updatedSettings = { ...settings, [key]: updatedList };
        await saveSettings(updatedSettings); // (de Fase 1, ahora async)
    }
}

export async function saveClient(clientData, clientId) {
    if (clientId) {
        await updateDocInCollection('clients', clientId, clientData); // (de Fase 1)
    } else {
        await addDocToCollection('clients', clientData); // (de Fase 1)
    }
}

export async function deleteClient(clientId) {
    await deleteDocFromCollection('clients', clientId); // (de Fase 1)
}

export async function addDocument(docData) {
    const { settings } = getState();
    
    let updatedSettings = settings;
    let settingsChanged = false; // Flag para saber si guardar settings

    // Si es una factura, actualizamos el contador.
    if (docData.type === 'Factura' && settings.invoiceCounter) { // Asegurarse que invoiceCounter existe
        const currentCounter = settings.invoiceCounter;
        // Usar la fecha del documento o la actual si no está definida
        const docDate = docData.date ? new Date(docData.date) : new Date();
        const currentYear = docDate.getFullYear();
        let nextNumber = currentCounter.nextInvoiceNumber;
        let nextYear = currentCounter.lastInvoiceYear;

        if (currentYear > currentCounter.lastInvoiceYear) {
            nextNumber = 2; // El 1 se acaba de usar para esta factura
            nextYear = currentYear;
            settingsChanged = true;
        } else if (currentYear === currentCounter.lastInvoiceYear) {
            nextNumber = currentCounter.nextInvoiceNumber + 1;
            settingsChanged = true;
        } else {
            // No actualizamos el contador si la fecha es anterior al último año registrado
             console.warn(`Intentando añadir factura (${docData.number}) con fecha (${docData.date}) anterior al último año registrado (${currentCounter.lastInvoiceYear}). El contador no se actualizará.`);
        }

        if(settingsChanged) {
            updatedSettings = {
                ...settings,
                invoiceCounter: {
                    nextInvoiceNumber: nextNumber,
                    lastInvoiceYear: nextYear
                }
            };
            // Guardar los settings actualizados SOLO si cambiaron
            await saveSettings(updatedSettings); // (de Fase 1)
        }
    } else if (docData.type === 'Factura' && !settings.invoiceCounter) {
        console.error("Error: Intentando añadir factura pero 'invoiceCounter' no está definido en settings.");
        // Podríamos inicializarlo aquí si fuese necesario
    }

    // Guardar el documento independientemente del contador
    await addDocToCollection('documents', docData); // (de Fase 1)
}


export async function toggleDocumentStatus(docId) {
    const { documents } = getState();
    const doc = documents.find(d => d.id === docId);
    if (doc) {
        const newStatus = doc.status === 'Adeudada' ? 'Cobrada' : 'Adeudada';
        await updateDocInCollection('documents', docId, { status: newStatus }); // (de Fase 1)
    }
}

export async function deleteDocument(docId) {
    await deleteDocFromCollection('documents', docId); // (de Fase 1)
}

export async function savePaymentDetails(invoiceId, paymentData) {
    const { documents } = getState();
    const invoice = documents.find(doc => doc.id === invoiceId);
    if (!invoice) return null;

    // Actualizamos en Firestore primero
    await updateDocInCollection('documents', invoiceId, { paymentDetails: paymentData }); // (de Fase 1)

    // Devolvemos la factura actualizada localmente para el visor de recibos
    // (obtenemos la versión más reciente del estado que ya se actualizó por el listener)
    const updatedInvoiceFromState = getState().documents.find(doc => doc.id === invoiceId); 
    return updatedInvoiceFromState || { ...invoice, paymentDetails: paymentData }; // Fallback por si el listener tarda
}


export async function saveAeatConfig(aeatConfig) {
    const { settings } = getState();
    const updatedSettings = { ...settings, aeatConfig };
    await saveSettings(updatedSettings); // (de Fase 1)
}

export async function toggleAeatModule() {
    const { settings } = getState();
    const updatedSettings = { ...settings, aeatModuleActive: !settings.aeatModuleActive };
    await saveSettings(updatedSettings); // (de Fase 1)
}

export async function saveFiscalParams(fiscalParams) {
    const { settings } = getState();
    const updatedSettings = { ...settings, fiscalParameters: fiscalParams };
    await saveSettings(updatedSettings); // (de Fase 1)
}

// --- Acciones de Reportes, Archivos (Sin cambios en Fase 2) ---

export function generateReport(filters) {
    const { transactions, documents, settings } = getState(); // Obtiene el estado actual
    let data = [], title = '', columns = [];

    // --- Lógica de cálculo de fechas (sin cambios) ---
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
            default: // Añadir default por si acaso
                console.error("Periodo de reporte no válido:", filters.period);
                return;
        }
    } else { // Para 'sociedades'
         const year = parseInt(filters.year, 10);
         switch (filters.period) {
            case '1P': startDate = new Date(Date.UTC(year, 0, 1)); endDate = new Date(Date.UTC(year, 2, 31, 23, 59, 59, 999)); break;
            case '2P': startDate = new Date(Date.UTC(year, 0, 1)); endDate = new Date(Date.UTC(year, 8, 30, 23, 59, 59, 999)); break;
            case '3P': startDate = new Date(Date.UTC(year, 0, 1)); endDate = new Date(Date.UTC(year, 10, 30, 23, 59, 59, 999)); break;
            default:
                 console.error("Periodo de sociedades no válido:", filters.period);
                 return;
         }
    }


    // --- Lógica específica por tipo de reporte (sin cambios funcionales) ---
    if (filters.type === 'movimientos') {
        title = `Reporte de Movimientos (${filters.period})`; // Añadir periodo al título
        columns = ["Fecha", "Descripción", "Cuenta", "Categoría", "Tipo", "Monto", "Moneda", "Parte"];
        data = transactions
            .filter(t => {
                // Parsear fecha asegurando UTC para evitar problemas de zona horaria
                const tDate = new Date(t.date + 'T00:00:00Z'); 
                const inDateRange = tDate >= startDate && tDate <= endDate;
                const accountMatch = filters.account === 'all' || t.account === filters.account;
                const partMatch = filters.part === 'all' || t.part === filters.part;
                return inDateRange && accountMatch && partMatch;
            })
            // Ordenar por fecha descendente ANTES de mapear
            .sort((a, b) => new Date(b.date + 'T00:00:00Z') - new Date(a.date + 'T00:00:00Z'))
            .map(item => [item.date, item.description, item.account, item.category, item.type, item.amount, item.currency, item.part]);

    } else if (filters.type === 'documentos') {
        title = `Reporte de Documentos (${filters.period})`; // Añadir periodo al título
        columns = ["Fecha", "Número", "Cliente", "Monto", "Moneda", "Estado", "Tipo"];
        data = documents
            .filter(d => {
                const dDate = new Date(d.date + 'T00:00:00Z');
                return dDate >= startDate && dDate <= endDate;
            })
            .sort((a, b) => new Date(b.date + 'T00:00:00Z') - new Date(a.date + 'T00:00:00Z'))
            .map(item => [item.date, item.number, item.client, item.amount, item.currency, item.status, item.type]);
    
    } else if (filters.type === 'inversiones') {
        title = `Reporte de Inversiones (${filters.period})`; // Añadir periodo al título
        columns = ["Fecha", "Descripción", "Cuenta Origen", "Monto", "Moneda"];
        data = transactions
            .filter(t => {
                const tDate = new Date(t.date + 'T00:00:00Z');
                // Asegurarse de que startDate y endDate estén definidos
                return startDate && endDate && tDate >= startDate && tDate <= endDate && t.category === 'Inversión';
            })
            .sort((a, b) => new Date(b.date + 'T00:00:00Z') - new Date(a.date + 'T00:00:00Z'))
            .map(item => [item.date, item.description, item.account, item.amount, item.currency]);

    } else if (filters.type === 'sociedades') {
        const year = parseInt(filters.year, 10);
        
        // La lógica de fechas ya está arriba
        
        const fiscalAccounts = ['CAIXA Bank', 'Banco WISE']; // Nombres exactos de las cuentas fiscales
        
        // Usar settings del estado actual
        const currentSettings = getState().settings; 
        const taxRate = currentSettings?.fiscalParameters?.corporateTaxRate ?? 17; // Usar valor de settings o 17% por defecto
        
        const filteredTransactions = transactions.filter(t => {
            const tDate = new Date(t.date + 'T00:00:00Z');
            // Asegurarse de que startDate y endDate estén definidos
            return startDate && endDate && tDate >= startDate && tDate <= endDate && 
                   t.part === 'A' && 
                   fiscalAccounts.includes(t.account) && // Filtrar por nombre de cuenta
                   t.currency === 'EUR'; // Solo EUR
        });

        let totalIngresos = 0, totalEgresos = 0;
        filteredTransactions.forEach(t => {
            // Asegurarse que amount e iva son números
            const amount = Number(t.amount) || 0;
            const iva = Number(t.iva) || 0;
            
            // Excluir transferencias e inversiones del cálculo base
            if (t.category !== 'Transferencia' && t.category !== 'Inversión' && t.category !== 'Ajuste de Saldo') {
                if (t.type === 'Ingreso') {
                    totalIngresos += amount;
                } else { // Egreso
                    totalEgresos += (amount + iva); // Sumar IVA a los gastos
                }
            }
        });

        const resultadoContable = totalIngresos - totalEgresos;
        const pagoACuenta = resultadoContable > 0 ? resultadoContable * (taxRate / 100) : 0;
        
        title = `Estimación Imp. Sociedades - ${filters.period} ${year}`;
        columns = ["Concepto", "Importe (€)"]; // Especificar moneda
        data = [
            ["Total Ingresos Computables (A)", totalIngresos.toFixed(2)],
            ["Total Gastos Deducibles (A)", totalEgresos.toFixed(2)],
            ["Resultado Contable Acumulado (A)", resultadoContable.toFixed(2)],
            [`Pago a cuenta estimado (${taxRate}%)`, pagoACuenta.toFixed(2)]
        ];
    } else {
        console.error("Tipo de reporte no reconocido:", filters.type);
        return; // Salir si el tipo no es válido
    }
    
    // Los reportes son datos volátiles, no necesitan guardarse en Firestore.
    // Solo actualizamos el estado local para la UI.
    setState({ activeReport: { type: filters.type, data, title, columns } });
}


export function generateIvaReport(month) {
    const { transactions, documents } = getState();
    const [year, monthNum] = month.split('-').map(Number);

    const ivaSoportado = transactions.filter(t => {
        const tDate = new Date(t.date + 'T00:00:00Z'); // Usar UTC para consistencia
        return t.type === 'Egreso' && t.iva > 0 &&
               tDate.getUTCFullYear() === year &&
               tDate.getUTCMonth() + 1 === monthNum;
    });

    const ivaRepercutido = documents.filter(doc => {
        const dDate = new Date(doc.date + 'T00:00:00Z'); // Usar UTC para consistencia
        return doc.type === 'Factura' && doc.iva > 0 &&
               dDate.getUTCFullYear() === year &&
               dDate.getUTCMonth() + 1 === monthNum;
    });

    // Asegurarse de sumar solo números válidos
    const totalSoportado = ivaSoportado.reduce((sum, t) => sum + (Number(t.iva) || 0), 0);
    const totalRepercutido = ivaRepercutido.reduce((sum, d) => sum + (Number(d.iva) || 0), 0);

    const ivaReport = {
        month: month,
        soportado: {
            total: totalSoportado,
            items: ivaSoportado.map(t => ({
                date: t.date,
                description: t.description,
                base: Number(t.amount) || 0,
                iva: Number(t.iva) || 0,
                currency: t.currency
            }))
        },
        repercutido: {
            total: totalRepercutido,
            items: ivaRepercutido.map(d => ({
                date: d.date,
                number: d.number,
                client: d.client,
                base: Number(d.subtotal) || 0,
                iva: Number(d.iva) || 0,
                currency: d.currency
            }))
        },
        resultado: totalRepercutido - totalSoportado
    };
    // El reporte de IVA es volátil, no necesita guardarse.
    setState({ activeIvaReport: ivaReport });
}

export async function closeYear(startDate, endDate) {
    // La implementación actual es compleja y riesgosa con Firestore.
    // Se necesita una estrategia diferente (ej. Firebase Functions) para archivar
    // datos de forma segura y eficiente sin exceder límites de documentos.
    console.warn("La función 'closeYear' (Cierre Anual) está desactivada. Requiere una reimplementación más robusta.");
    alert("La función de Cierre Anual está desactivada temporalmente.");
    // No se hace nada
}

// --- Investment Actions ---

export async function addInvestmentAsset(assetData) {
    await addDocToCollection('investmentAssets', assetData); // (de Fase 1)
}

export async function deleteInvestmentAsset(assetId) {
    await deleteDocFromCollection('investmentAssets', assetId); // (de Fase 1)
}

// --- MODIFICADO EN FASE 2 ---
export async function addInvestment(investmentData) {
    const { accounts } = getState();
    const account = accounts.find(acc => acc.name === investmentData.account);

    if (!account) {
        console.error("Cuenta no encontrada para la inversión:", investmentData.account);
        return;
    }

    const transactionData = {
        date: investmentData.date,
        description: `Inversión en ${investmentData.assetName || 'activo desconocido'}: ${investmentData.description || ''}`,
        type: 'Egreso',
        part: 'A', // Las inversiones generalmente son parte 'A'
        account: investmentData.account, // Mantenemos nombre por ahora
        category: 'Inversión',
        amount: Number(investmentData.amount) || 0, // Asegurar que es número
        iva: 0,
        currency: account.currency,
        investmentAssetId: investmentData.assetId,
        accountId: account.id // Añadido en Fase 2
    };

    // Usamos saveTransaction para que maneje la actualización del saldo
    await saveTransaction(transactionData);
}

