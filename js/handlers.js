// js/handlers.js
import { elements, populateCategories, updateCurrencySymbol, updateTransferFormUI } from './ui.js';

export function bindEventListeners(app) {
    document.getElementById('sidebar-toggle').addEventListener('click', () => {
        elements.sidebar.classList.toggle('w-64');
        elements.sidebar.classList.toggle('w-20');
        elements.mainContent.classList.toggle('ml-64');
        elements.mainContent.classList.toggle('ml-20');
        document.querySelectorAll('.nav-text').forEach(text => text.classList.toggle('hidden'));
    });

    elements.navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = link.id.replace('nav-', '');
            app.switchPage(pageId);
        });
    });
    
    // Facturación
    document.getElementById('facturacion-tab-crear').addEventListener('click', () => app.switchFacturacionTab('crear'));
    document.getElementById('facturacion-tab-listado').addEventListener('click', () => app.switchFacturacionTab('listado'));
    document.getElementById('facturacion-tab-config').addEventListener('click', () => app.switchFacturacionTab('config'));
    elements.facturaOperationType.addEventListener('change', () => app.handleOperationTypeChange());
    elements.facturasTableBody.addEventListener('click', (e) => app.handleFacturasTableClick(e));
    elements.nuevaFacturaForm.addEventListener('submit', (e) => app.handleGenerateInvoice(e));
    elements.facturaAddItemBtn.addEventListener('click', () => app.addFacturaItem());
    elements.facturaItemsContainer.addEventListener('input', () => app.updateFacturaSummary());
}

export function handleOperationTypeChange(app) {
    const operationTypeSelect = document.getElementById('factura-operation-type');
    const currencySelect = document.getElementById('factura-currency');
    const ivaLabel = document.getElementById('factura-iva-label');

    if (!operationTypeSelect || !currencySelect) {
        console.error("Error crítico: No se encontraron los selectores de operación o moneda en el DOM.");
        return;
    }

    if (operationTypeSelect.value.includes('Exportación')) {
        currencySelect.value = 'USD';
        currencySelect.disabled = true;
        if (ivaLabel) ivaLabel.textContent = 'IVA (0% - Exportación):';
    } else {
        currencySelect.disabled = false;
        if (ivaLabel) ivaLabel.textContent = 'IVA (21%):';
    }
    
    app.updateFacturaSummary();
}

export function handleFacturasTableClick(e, app) {
    const viewBtn = e.target.closest('.view-invoice-btn');
    const statusBtn = e.target.closest('.status-btn');
    const deleteBtn = e.target.closest('.delete-doc-btn');

    if (viewBtn) {
        app.showInvoiceViewer(viewBtn.dataset.id);
    } else if (statusBtn) {
        const doc = app.state.documents.find(d => d.id === statusBtn.dataset.id);
        if (doc) {
            doc.status = doc.status === 'Adeudada' ? 'Pagada' : 'Adeudada';
            app.updateAll();
        }
    } else if (deleteBtn) {
        app.deleteDocument(deleteBtn.dataset.id);
    }
}

export function handleGenerateInvoice(e, app) {
    e.preventDefault();
    const form = e.target;
    const newInvoice = {
        id: self.crypto.randomUUID(),
        type: 'Factura',
        number: form.querySelector('#factura-numero').value,
        client: form.querySelector('#factura-cliente').value,
        date: form.querySelector('#factura-fecha').value,
        total: parseFloat(document.getElementById('factura-total').textContent.replace(/[^0-9,-]+/g, "").replace(",", ".")),
        currency: form.querySelector('#factura-currency').value,
        status: 'Adeudada',
    };
    app.state.documents.push(newInvoice);
    app.updateAll();
    form.reset();
    app.updateFacturaSummary();
    alert(`Factura "${newInvoice.number}" creada con éxito.`);
}

// Agrega aquí el resto de tus handlers que tenías en tu archivo original.
// Por ejemplo: handleTransactionFormSubmit, handleTransferFormSubmit, etc.