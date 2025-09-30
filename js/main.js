// js/main.js
import { getDefaultState, loadData, saveData, recalculateAllBalances, addFacturaItem, updateFacturaSummary, switchFacturacionTab } from './state.js';
import { elements, switchPage, updateAll } from './ui.js';
import { bindEventListeners, handleOperationTypeChange, handleFacturasTableClick, handleGenerateInvoice } from './handlers.js';

document.addEventListener('DOMContentLoaded', () => {
    const App = {
        state: null,
        elements: elements,
        charts: { annualFlowChart: null },
        
        init() {
            this.state = getDefaultState();
            lucide.createIcons();
            loadData(this);
            bindEventListeners(this);
            this.recalculateAllBalances();
            this.updateAll();
            this.switchPage('inicio');
        },
        
        // Métodos principales que delegan la lógica
        saveData() { saveData(this.state); },
        recalculateAllBalances() { recalculateAllBalances(this.state); },
        updateAll() { updateAll(this); },
        switchPage(pageId) { switchPage(pageId, this); },
        switchFacturacionTab(tabId) { switchFacturacionTab(tabId); },
        addFacturaItem() { addFacturaItem(this); },
        updateFacturaSummary() { updateFacturaSummary(this); },
        
        // Handlers
        handleOperationTypeChange() { handleOperationTypeChange(this); },
        handleFacturasTableClick(e) { handleFacturasTableClick(e, this); },
        handleGenerateInvoice(e) { handleGenerateInvoice(e, this); },

        // Lógica que aún vive en main.js (puedes moverla luego)
        showInvoiceViewer(id) { 
            const invoice = this.state.documents.find(doc => doc.id === id);
            if(invoice) {
                alert(`Mostrando Factura:\nNº: ${invoice.number}\nCliente: ${invoice.client}\nTotal: ${invoice.total} ${invoice.currency}`);
            }
        },
        deleteDocument(id) {
            if(confirm('¿Seguro que quieres eliminar este documento?')) {
                this.state.documents = this.state.documents.filter(d => d.id !== id);
                this.updateAll();
            }
        }
    };

    App.init();
    window.App = App; // Para depuración en consola
});