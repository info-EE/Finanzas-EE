import { getState } from '../store.js';
import { 
    addDocToCollection, 
    updateDocInCollection,
    deleteDocFromCollection,
    incrementAccountBalance 
} from '../api.js';

// --- Acciones de Transacciones, Cuentas, Transferencias ---

export async function saveTransaction(transactionData, transactionId) {
    const { accounts, transactions } = getState();
    
    // 1. Encontrar la cuenta por NOMBRE (como viene del formulario)
    const account = accounts.find(acc => acc.name === transactionData.account);
    if (!account) {
        console.error("Acción saveTransaction: No se encontró la cuenta:", transactionData.account);
        // Podríamos lanzar un error aquí para notificar a la UI
        return; 
    }
    const accountId = account.id; // Obtenemos el ID real

    // 2. Preparamos los datos a guardar (SIN el nombre de la cuenta)
    // Convertimos montos a números por seguridad
    const amount = Number(transactionData.amount) || 0;
    const iva = Number(transactionData.iva) || 0;
    const dataToSave = {
        date: transactionData.date,
        description: transactionData.description,
        type: transactionData.type,
        part: transactionData.part,
        category: transactionData.category,
        amount: amount,
        iva: iva,
        currency: account.currency, // Usamos la moneda de la cuenta encontrada
        accountId: accountId, // Guardamos SOLO el ID
        isInitialBalance: false,
        // Añadimos investmentAssetId si existe en transactionData (para inversiones)
        ...(transactionData.investmentAssetId && { investmentAssetId: transactionData.investmentAssetId })
    };

    // 3. Calcular el monto a aplicar al saldo
    const amountToApply = dataToSave.type === 'Ingreso' ? amount : -(amount + iva);

    if (transactionId) {
        // --- Lógica para EDITAR ---
        const oldTransaction = transactions.find(t => t.id === transactionId);
        if (!oldTransaction) {
            console.error("Acción saveTransaction (Editar): Transacción antigua no encontrada:", transactionId);
            return;
        }

        // Obtener ID de la cuenta antigua (puede que no exista si se eliminó, aunque deleteAccount lo previene)
        const oldAccountId = oldTransaction.accountId || accounts.find(acc => acc.name === oldTransaction.account)?.id;
        if (!oldAccountId) {
            console.error("Acción saveTransaction (Editar): ID de cuenta antigua no encontrado para:", oldTransaction);
            // Considerar qué hacer aquí, por ahora no actualizamos saldo antiguo
            await updateDocInCollection('transactions', transactionId, dataToSave);
            await incrementAccountBalance(accountId, amountToApply); // Solo aplicar el nuevo
            return;
        }

        // 1. Calcular el monto a revertir de la transacción ANTIGUA
        const oldAmount = Number(oldTransaction.amount) || 0;
        const oldIva = Number(oldTransaction.iva) || 0;
        const amountToRevert = oldTransaction.type === 'Ingreso' ? -oldAmount : (oldAmount + oldIva);

        // 2. Actualizar el documento de la transacción
        await updateDocInCollection('transactions', transactionId, dataToSave);

        // 3. Actualizar saldos
        if (oldAccountId === accountId) {
            // Misma cuenta, calcular diferencia neta
            const netChange = amountToApply + amountToRevert;
            if (Math.abs(netChange) > 0.001) { // Actualizar solo si hay cambio significativo
                await incrementAccountBalance(accountId, netChange);
            }
        } else {
            // Cuenta diferente, revertir en antigua y aplicar en nueva
            await incrementAccountBalance(oldAccountId, amountToRevert);
            await incrementAccountBalance(accountId, amountToApply);
        }

    } else {
        // --- Lógica para AÑADIR ---
        // 1. Añadir el documento (usará el dataToSave sin el nombre 'account')
        const addedTransaction = await addDocToCollection('transactions', dataToSave); 
        
        // 2. Actualizar el saldo
        await incrementAccountBalance(accountId, amountToApply);
    }
}

export async function deleteTransaction(transactionId) {
    const { transactions, accounts } = getState();
    const transactionToDelete = transactions.find(t => t.id === transactionId);
    if (!transactionToDelete) return;

    // Obtener ID de cuenta
    const accountId = transactionToDelete.accountId || accounts.find(acc => acc.name === transactionToDelete.account)?.id; 
    if (!accountId) {
        console.error("Acción deleteTransaction: ID de cuenta no encontrado para:", transactionToDelete);
        // Si no encontramos la cuenta, solo borramos la transacción para evitar errores
        await deleteDocFromCollection('transactions', transactionId);
        return;
    }

    // 1. Calcular monto a revertir
    const amount = Number(transactionToDelete.amount) || 0;
    const iva = Number(transactionToDelete.iva) || 0;
    const amountToRevert = transactionToDelete.type === 'Ingreso' ? -amount : (amount + iva);

    // 2. Eliminar transacción
    await deleteDocFromCollection('transactions', transactionId);
    
    // 3. Actualizar saldo (revirtiendo)
    await incrementAccountBalance(accountId, amountToRevert);
}

export async function addAccount(accountData) {
    const newAccount = {
        name: accountData.name,
        currency: accountData.currency,
        symbol: accountData.currency === 'EUR' ? '€' : '$',
        balance: Number(accountData.balance) || 0, // Asegurar número
        logoHtml: accountData.logoHtml
    };
    await addDocToCollection('accounts', newAccount);
}

export async function deleteAccount(accountId) {
    const { accounts, transactions } = getState(); 
    const accountToDelete = accounts.find(acc => acc.id === accountId);
    if (!accountToDelete) return;

    if (Math.abs(accountToDelete.balance) > 0.001) { 
        alert("No se puede eliminar una cuenta con saldo diferente de cero. Realice un ajuste a 0 primero.");
        return; 
    }
    
    // Comprobar transacciones por accountId
    const hasTransactions = transactions.some(t => t.accountId === accountId); 
    if (hasTransactions) {
         alert("No se puede eliminar una cuenta que tiene transacciones asociadas. Esta acción se ha bloqueado por seguridad.");
         return;
    }

    await deleteDocFromCollection('accounts', accountId);
}

export async function updateBalance(accountName, newBalanceInput) {
    const { accounts } = getState();
    const account = accounts.find(acc => acc.name === accountName);
    if (!account) return;

    const newBalance = Number(newBalanceInput); // Asegurar número
    if (isNaN(newBalance)) {
        console.error("updateBalance: newBalance no es un número válido:", newBalanceInput);
        return;
    }

    const currentBalance = account.balance; 
    const difference = newBalance - currentBalance;

    if (Math.abs(difference) > 0.001) { 
        const adjustmentTransaction = {
            date: new Date().toISOString().slice(0, 10),
            description: 'Ajuste de saldo manual',
            type: difference > 0 ? 'Ingreso' : 'Egreso',
            part: 'A',
            // account: accountName, // Ya no guardamos el nombre
            category: 'Ajuste de Saldo',
            amount: Math.abs(difference),
            currency: account.currency,
            isInitialBalance: false,
            accountId: account.id // Guardamos ID
        };
        
        await addDocToCollection('transactions', adjustmentTransaction);
        await incrementAccountBalance(account.id, difference);
    } else {
        console.log("updateBalance: La diferencia de saldo es demasiado pequeña, no se realiza ajuste.");
    }
}

export async function addTransfer(transferData) {
    const { date, fromAccountName, toAccountName, amount: amountInput, feeSource: feeSourceInput, receivedAmount: receivedAmountInput } = transferData;
    const { accounts } = getState();
    
    const fromAccount = accounts.find(a => a.name === fromAccountName);
    const toAccount = accounts.find(a => a.name === toAccountName);
    
    if (!fromAccount || !toAccount) {
        console.error("addTransfer: Cuenta de origen o destino no encontrada.");
        return;
    }

    // Asegurar que los montos son números
    const amount = Number(amountInput) || 0;
    const feeSource = Number(feeSourceInput) || 0;
    const receivedAmount = Number(receivedAmountInput) || 0; // Este debería ser > 0 si las monedas son distintas

    if (amount <= 0) {
        console.error("addTransfer: El monto a enviar debe ser positivo.");
        return;
    }
     if (fromAccount.currency !== toAccount.currency && receivedAmount <= 0) {
        console.error("addTransfer: El monto a recibir debe ser positivo para transferencias multimoneda.");
        return;
    }


    const egresoTransData = {
        date,
        description: `Transferencia a ${toAccountName}`,
        type: 'Egreso', part: 'A', 
        // account: fromAccountName, // Ya no se guarda
        category: 'Transferencia', amount: amount, currency: fromAccount.currency, iva: 0,
        accountId: fromAccount.id 
    };

    const ingresoTransData = {
        date,
        description: `Transferencia desde ${fromAccountName}`,
        type: 'Ingreso', part: 'A', 
        // account: toAccountName, // Ya no se guarda
        category: 'Transferencia', amount: receivedAmount, currency: toAccount.currency, iva: 0,
        accountId: toAccount.id
    };
    
    const promises = [
        addDocToCollection('transactions', egresoTransData),
        addDocToCollection('transactions', ingresoTransData),
        incrementAccountBalance(fromAccount.id, -amount), 
        incrementAccountBalance(toAccount.id, receivedAmount) 
    ];

    if (feeSource > 0) {
        const feeTransData = {
            date,
            description: `Comisión por transferencia a ${toAccountName}`,
            type: 'Egreso', part: 'A', 
            // account: fromAccountName, // Ya no se guarda
            category: 'Comisiones', amount: feeSource, currency: fromAccount.currency, iva: 0,
            accountId: fromAccount.id 
        };
        promises.push(addDocToCollection('transactions', feeTransData));
        promises.push(incrementAccountBalance(fromAccount.id, -feeSource)); 
    }

    await Promise.all(promises);
}
