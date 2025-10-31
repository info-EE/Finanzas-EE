import { getState } from '../store.js';
import { 
    addDocToCollection, 
    updateDocInCollection,
    deleteDocFromCollection,
    saveSettings 
} from '../api.js';
// --- MODIFICACIÓN: Importar deleteTransaction ---
import { deleteTransaction } from './cashflow.js';

export async function addDocument(docData) { // Lógica del contador revisada
    const { settings } = getState();
    
    let updatedSettings = { ...settings }; // Copiar settings para modificar
    let settingsChanged = false;

    // Actualizar contador SOLO si es factura y el contador existe
    if (docData.type === 'Factura' && updatedSettings.invoiceCounter) { 
        const currentCounter = updatedSettings.invoiceCounter;
        
        // --- INICIO DE CORRECCIÓN 3: Quitar el prefijo del año ---
        let nextNumber = currentCounter.nextInvoiceNumber || 1; 
        
        // Asignar SOLO el número consecutivo
        docData.number = String(nextNumber);
        
        // Incrementar el contador para la *próxima* factura
        nextNumber++; 
        settingsChanged = true;
        
        if (settingsChanged) {
            updatedSettings.invoiceCounter = {
                ...currentCounter, // Preservar otras claves (si las hubiera)
                nextInvoiceNumber: nextNumber
            };
            await saveSettings(updatedSettings); 
        }
        // --- FIN DE CORRECCIÓN 3 ---

    } else if (docData.type === 'Factura' && !updatedSettings.invoiceCounter) {
        // Si no hay contador, inicializarlo
        console.warn("Inicializando contador de facturas...");
        // --- CORRECCIÓN 3: Quitar el prefijo del año ---
        docData.number = "1"; // Empezar en 1
        updatedSettings.invoiceCounter = {
            nextInvoiceNumber: 2
        };
         await saveSettings(updatedSettings); 
    }

    // Asegurar montos como números antes de guardar
    docData.amount = Number(docData.amount) || 0;
    docData.subtotal = Number(docData.subtotal) || 0;
    docData.iva = Number(docData.iva) || 0;
    docData.total = Number(docData.total) || 0;
    if (docData.items && Array.isArray(docData.items)) {
        docData.items = docData.items.map(item => ({
            ...item,
            quantity: Number(item.quantity) || 0,
            price: Number(item.price) || 0,
        }));
    }

    // Guardar el documento
    await addDocToCollection('documents', docData); 
}

export async function toggleDocumentStatus(docId) { 
    // --- MODIFICACIÓN: Cargar documents y transactions ---
    const { documents, transactions } = getState();
    const doc = documents.find(d => d.id === docId);
    if (doc) {
        const newStatus = doc.status === 'Adeudada' ? 'Cobrada' : 'Adeudada';
        
        // --- INICIO DE NUEVA LÓGICA ---
        if (newStatus === 'Adeudada') {
            // Se está revirtiendo una factura "Cobrada" a "Adeudada"
            // Buscar y eliminar la transacción de ingreso vinculada.
            
            // 1. Buscar la transacción vinculada en el estado
            // Usamos el ID de la factura (docId) o el ID guardado en la factura (doc.linkedTransactionId)
            const linkedTx = transactions.find(t => t.linkedInvoiceId === docId || t.id === doc.linkedTransactionId);
            
            if (linkedTx) {
                console.log(`Factura ${doc.number} marcada como Adeudada. Eliminando transacción vinculada ${linkedTx.id}`);
                // 2. Llamar a deleteTransaction (esto ya revierte el saldo)
                await deleteTransaction(linkedTx.id);
                
                // 3. Actualizar la factura para quitar el ID de la transacción y el estado
                await updateDocInCollection('documents', docId, { 
                    status: newStatus,
                    paymentDetails: null, // Borrar detalles de pago
                    linkedTransactionId: null // Borrar ID de transacción
                });
                
            } else {
                // No se encontró tx vinculada, solo cambiar el estado
                console.log(`Factura ${doc.number} marcada como Adeudada. No se encontró transacción vinculada.`);
                await updateDocInCollection('documents', docId, { status: newStatus });
            }
            
        } else {
            // Cambiando de 'Adeudada' a 'Cobrada'.
            // NO hacemos nada aquí. La lógica de CREAR la transacción
            // se manejará en el modal "Detalles del Pago" (handler).
            // Aquí solo actualizamos el estado (esto es por si se hace click manual sin pasar por el modal).
            await updateDocInCollection('documents', docId, { status: newStatus }); 
        }
        // --- FIN DE NUEVA LÓGICA ---
    }
}


export async function deleteDocument(docId) { 
    // --- MODIFICACIÓN: Si se borra una factura, borrar también el ingreso asociado ---
    const { documents, transactions } = getState();
    const doc = documents.find(d => d.id === docId);

    if (doc && (doc.status === 'Cobrada' || doc.linkedTransactionId)) {
        // Si la factura estaba cobrada, buscar y borrar el ingreso
        const linkedTx = transactions.find(t => t.linkedInvoiceId === docId || t.id === doc.linkedTransactionId);
        if (linkedTx) {
            console.log(`Eliminando factura ${doc.number}. Eliminando también la transacción vinculada ${linkedTx.id}`);
            await deleteTransaction(linkedTx.id);
        }
    }
    // Borrar el documento de factura
    await deleteDocFromCollection('documents', docId); 
    // --- FIN MODIFICACIÓN ---
}

export async function savePaymentDetails(invoiceId, paymentData, linkedTransactionId) { 
    const { documents } = getState();
    const invoice = documents.find(doc => doc.id === invoiceId);
    if (!invoice) return null;

    // --- MODIFICACIÓN: Añadir el linkedTransactionId y forzar estado 'Cobrada' ---
    const updates = {
        paymentDetails: paymentData,
        status: 'Cobrada', // Asegurarse de que esté marcada como Cobrada
        ...(linkedTransactionId && { linkedTransactionId: linkedTransactionId })
    };
    
    await updateDocInCollection('documents', invoiceId, updates); 
    // --- FIN MODIFICACIÓN ---

    const updatedInvoiceFromState = getState().documents.find(doc => doc.id === invoiceId); 
    // Simular la actualización localmente para el retorno inmediato
    return updatedInvoiceFromState || { ...invoice, ...updates }; 
}


export async function saveAeatConfig(aeatConfig) { 
    const { settings } = getState();
    const updatedSettings = { ...settings, aeatConfig };
    await saveSettings(updatedSettings); 
}

export async function toggleAeatModule() { 
    const { settings } = getState();
    const updatedSettings = { ...settings, aeatModuleActive: !settings.aeatModuleActive };
    await saveSettings(updatedSettings); 
}

export async function saveFiscalParams(fiscalParams) { 
    const { settings } = getState();
    // Validar que el rate es un número antes de guardar
    const rate = Number(fiscalParams.corporateTaxRate);
    if (!isNaN(rate) && rate >= 0 && rate <= 100) {
        const updatedSettings = { ...settings, fiscalParameters: { corporateTaxRate: rate } };
        await saveSettings(updatedSettings); 
    } else {
        console.error("saveFiscalParams: Tasa impositiva inválida:", fiscalParams.corporateTaxRate);
        // Podríamos lanzar un error aquí
    }
}
