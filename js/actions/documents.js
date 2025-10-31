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

