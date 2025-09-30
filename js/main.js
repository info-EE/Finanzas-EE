import {
    elements,
    charts,
    switchPage,
    updateAll,
    renderTransactions,
    renderAccountsTab,
    renderBalanceLegendAndChart,
    updateInicioKPIs,
    renderInicioCharts,
    populateSelects,
    renderSettings,
    renderDocuments,
    renderFacturas,
    showInvoiceViewer,
    hideInvoiceViewer,
    printInvoice,
    downloadInvoiceAsPDF,
    updateModuleVisibility,
    renderArchives,
    renderInvestments,
    renderFiscalParams,
    populateCategories,
    updateCurrencySymbol,
    updateTransferFormUI,
    populateReportAccounts,
    renderAeatSettings
} from './ui.js';

import {
    getDefaultState,
    loadData,
    saveData,
    recalculateAllBalances,
    addFacturaItem,
    updateFacturaSummary,
    switchFacturacionTab
} from './state.js';

import {
    bindEventListeners,
    handleTransactionFormSubmit,
    handleTransactionsTableClick,
    handleTransferFormSubmit,
    handleProformaSubmit,
    handleProformasTableClick,
    handleAddAccount,
    handleSettingsListClick,
    handleUpdateBalance,
    handleAddCategory,
    handleDeleteCategory,
    handleReportGeneration,
    handleCloseYear,
    handleGenerateInvoice,
    handleOperationTypeChange, // Asegúrate de que esta función esté en handlers.js
    handleFacturasTableClick,
    handleAeatConfigSave,
    handleFiscalParamsSave
} from './handlers.js';

import { escapeHTML, formatCurrency, getCurrencySymbol } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    const App = {
        state: null,
        elements: elements,
        charts: charts,

        init() {
            this.state = getDefaultState();
            lucide.createIcons();
            loadData(this);
            bindEventListeners(this);
            recalculateAllBalances(this.state);
            updateAll(this);
            switchPage('inicio', this);
            this.renderFacturas();
            this.setDateDefaults();
            this.updateDateInputForReports();
            this.toggleReportFilters();
        },

        // Métodos principales de la App
        saveData() { saveData(this.state); },
        loadData() { loadData(this); },
        getDefaultState,
        setDefaultState() { this.state = getDefaultState(); },
        switchPage(pageId) { switchPage(pageId, this); },
        updateAll() { updateAll(this); },
        recalculateAllBalances() { recalculateAllBalances(this.state); },
        
        // UI Rendering
        renderTransactions() { renderTransactions(this.state); },
        renderAccountsTab() { renderAccountsTab(this.state); },
        renderBalanceLegendAndChart() { renderBalanceLegendAndChart(this); },
        updateInicioKPIs() { updateInicioKPIs(this.state); },
        renderInicioCharts() { renderInicioCharts(this); },
        populateSelects() { populateSelects(this.state); },
        renderSettings() { renderSettings(this); },
        renderDocuments() { renderDocuments(this.state); },
        renderFacturas() { renderFacturas(this.state); },
        renderInvestments() { renderInvestments(this.state); },
        updateModuleVisibility() { updateModuleVisibility(this.state); },
        renderArchives() { renderArchives(this.state); },
        renderAeatConfig() { renderAeatSettings(this.state); },
        renderFiscalParams() { renderFiscalParams(this.state); },

        // UI Helpers
        populateCategories() { populateCategories(this.state); },
        updateCurrencySymbol() { updateCurrencySymbol(this.state); },
        updateTransferFormUI() { updateTransferFormUI(this.state); },
        populateReportAccounts() { populateReportAccounts(this.state); },

        // Handlers
        handleTransactionFormSubmit(e) { handleTransactionFormSubmit(e, this); },
        handleTransactionsTableClick(e) { handleTransactionsTableClick(e, this); },
        handleTransferFormSubmit(e) { handleTransferFormSubmit(e, this); },
        handleProformaSubmit(e) { handleProformaSubmit(e, this); },
        handleProformasTableClick(e) { handleProformasTableClick(e, this); },
        handleAddAccount(e) { handleAddAccount(e, this); },
        handleSettingsListClick(e) { handleSettingsListClick(e, this); },
        handleUpdateBalance(e) { handleUpdateBalance(e, this); },
        handleAddCategory(e, type) { handleAddCategory(e, type, this); },
        handleDeleteCategory(e, type) { handleDeleteCategory(e, type, this); },
        handleReportGeneration(e) { handleReportGeneration(e, this); },
        handleCloseYear() { handleCloseYear(this); },
        handleGenerateInvoice(e) { handleGenerateInvoice(e, this); },
        
        // --- FUNCIÓN CORREGIDA ---
        handleOperationTypeChange() {
            handleOperationTypeChange(this); // Llama a la función importada desde handlers.js
            this.updateFacturaSummary();     // Llama a la función que recalcula los totales
        },
        
        handleFacturasTableClick(e) { handleFacturasTableClick(e, this); },
        handleAeatConfigSave(e) { handleAeatConfigSave(e, this); },
        handleFiscalParamsSave(e) { handleFiscalParamsSave(e, this); },

        // Facturación
        addFacturaItem() { addFacturaItem(this); },
        updateFacturaSummary() { updateFacturaSummary(this); },
        switchFacturacionTab(tabId) { switchFacturacionTab(tabId, this); },
        
        // Documentos
        toggleDocumentStatus(docId) {
            const doc = this.state.documents.find(d => d.id === docId);
            if (doc) {
                doc.status = doc.status === 'Adeudada' ? 'Cobrada' : 'Adeudada';
                this.updateAll();
            }
        },
        deleteDocument(docId) {
            this.showConfirmationModal(
                'Eliminar Documento',
                '¿Seguro que quieres eliminar este documento?',
                () => {
                    this.state.documents = this.state.documents.filter(d => d.id !== docId);
                    this.updateAll();
                }
            );
        },
        showInvoiceViewer(invoiceId) { showInvoiceViewer(invoiceId, this.state); },
        hideInvoiceViewer() { hideInvoiceViewer(); },
        printInvoice() { printInvoice(); },
        downloadInvoiceAsPDF() { downloadInvoiceAsPDF(); },

        // Modals
        showConfirmationModal(title, message, onConfirm) {
            document.getElementById('modal-title').textContent = title;
            document.getElementById('modal-message').textContent = message;
            const confirmBtn = document.getElementById('modal-confirm-btn');
            const cancelBtn = document.getElementById('modal-cancel-btn');
            const modal = document.getElementById('confirmation-modal');
            
            const confirmHandler = () => {
                onConfirm();
                modal.classList.add('hidden');
                confirmBtn.removeEventListener('click', confirmHandler);
            };
            
            confirmBtn.onclick = confirmHandler;
            cancelBtn.onclick = () => modal.classList.add('hidden');
            
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        },

        showAlertModal(title, message) {
            document.getElementById('alert-modal-title').textContent = title;
            document.getElementById('alert-modal-message').textContent = message;
            const okBtn = document.getElementById('alert-modal-ok-btn');
            const modal = document.getElementById('alert-modal');
            
            okBtn.onclick = () => modal.classList.add('hidden');
            
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        },

        // Date and Report Helpers
        setDateDefaults() {
            const today = new Date().toISOString().slice(0, 10);
            ['transaction-date', 'transfer-date', 'proforma-date', 'factura-fecha', 'report-date'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = today;
            });
            const currentMonth = new Date().toISOString().slice(0, 7);
            const monthInput = document.getElementById('report-month');
            if(monthInput) monthInput.value = currentMonth;
        },

        updateDateInputForReports() {
            const period = document.getElementById('report-period').value;
            ['daily', 'weekly', 'monthly', 'annual'].forEach(p => {
                const container = document.getElementById(`date-input-${p}`);
                if(container) container.classList.toggle('hidden', p !== period);
            });
        },

        toggleReportFilters() {
            const reportType = document.getElementById('report-type').value;
            const isSociedades = reportType === 'sociedades';
            this.elements.defaultFiltersContainer.classList.toggle('hidden', isSociedades);
            this.elements.sociedadesFiltersContainer.classList.toggle('hidden', !isSociedades);
        },

        // Report Generation
        generateMovimientosReport() {
            // ... (lógica de generación de reporte de movimientos)
            return { data: [], title: '', columns: [] };
        },

        generateSociedadesReport() {
            // ... (lógica de generación de reporte de sociedades)
            return { data: [], title: '', columns: [] };
        },

        renderReport(title, columns, data) {
            // ... (lógica de renderizado de reporte)
        },

        viewSelectedArchive() {
            // ... (lógica para ver archivos)
        },

        toggleAeatModule() {
            this.state.settings.aeatModuleActive = !this.state.settings.aeatModuleActive;
            this.renderAeatSettings();
            this.saveData();
        }
    };

    App.init();
});