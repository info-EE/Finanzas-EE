import { getState } from '../store.js';
import { 
    addDocToCollection, 
    updateDocInCollection,
    deleteDocFromCollection,
    saveSettings 
} from '../api.js';

export async function addDocument(docData) { // Lógica del contador revisada
    const { settings } = getState();
    
    let updatedSettings = { ...settings }; // Copiar settings para modificar
    let settingsChanged = false;

    // Actualizar contador SOLO si es factura y el contador existe
    if (docData.type === 'Factura' && updatedSettings.invoiceCounter) { 
        const currentCounter = updatedSettings.invoiceCounter;
        const docDate = docData.date ? new Date(docData.date + 'T00:00:00Z') : new Date(); // Usar UTC
        const currentYear = docDate.getUTCFullYear();
        
        // Inicializar si falta algún valor
        let nextNumber = currentCounter.nextInvoiceNumber || 1; 
        let lastYear = currentCounter.lastInvoiceYear || currentYear -1; // Asumir año anterior si no existe

        if (currentYear > lastYear) {
            nextNumber = 1; // Reiniciar contador para el nuevo año
            lastYear = currentYear;
            settingsChanged = true;
        } else if (currentYear === lastYear) {
             // Asignar el número actual antes de incrementar para el próximo
             docData.number = `${currentYear}-${String(nextNumber).padStart(4, '0')}`;
             nextNumber++; // Incrementar para la siguiente factura
             settingsChanged = true;
        } else {
            // Fecha anterior al último año registrado, no se actualiza contador
            // Se usa el número que viene en docData (si lo hay) o se genera uno temporal
             if (!docData.number) {
                docData.number = `${currentYear}-MANUAL`; // Indicar que requiere revisión
             }
             console.warn(`Factura (${docData.number}) con fecha (${docData.date}) anterior al último año registrado (${lastYear}). El contador no se actualizará.`);
        }

        if (settingsChanged) {
            updatedSettings.invoiceCounter = {
                nextInvoiceNumber: nextNumber,
                lastInvoiceYear: lastYear
            };
            await saveSettings(updatedSettings); 
        }
    } else if (docData.type === 'Factura' && !updatedSettings.invoiceCounter) {
        // Si no hay contador, inicializarlo y asignar número 1
        console.warn("Inicializando contador de facturas...");
        const docDate = docData.date ? new Date(docData.date + 'T00:00:00Z') : new Date();
        const currentYear = docDate.getUTCFullYear();
        docData.number = `${currentYear}-0001`;
        updatedSettings.invoiceCounter = {
            nextInvoiceNumber: 2,
            lastInvoiceYear: currentYear
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
    const { documents } = getState();
    const doc = documents.find(d => d.id === docId);
    if (doc) {
        const newStatus = doc.status === 'Adeudada' ? 'Cobrada' : 'Adeudada';
        await updateDocInCollection('documents', docId, { status: newStatus }); 
    }
}

export async function deleteDocument(docId) { 
    await deleteDocFromCollection('documents', docId); 
}

export async function savePaymentDetails(invoiceId, paymentData) { 
    const { documents } = getState();
    const invoice = documents.find(doc => doc.id === invoiceId);
    if (!invoice) return null;
    await updateDocInCollection('documents', invoiceId, { paymentDetails: paymentData }); 
    const updatedInvoiceFromState = getState().documents.find(doc => doc.id === invoiceId); 
    return updatedInvoiceFromState || { ...invoice, paymentDetails: paymentData }; 
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
