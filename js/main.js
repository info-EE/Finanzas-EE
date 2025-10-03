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
    renderAeatSettings,
    renderVATSummary // <--- AGREGADO: Nueva función de renderizado de IVA
} from './ui.js';

import {
    getDefaultState,
    loadData,
    saveData,
    recalculateAllBalances,
    addFacturaItem,
    updateFacturaSummary,
    switchFacturacionTab,
    calculateVATSummary // <--- AGREGADO: Nueva función de cálculo de IVA
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
    handleOperationTypeChange, 
    handleFacturasTableClick,
    handleAeatConfigSave,
    handleFiscalParamsSave,
    handleAddClient,
    handleClientsTableClick,
    handleClientSelectionForInvoice
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
            this.setDateDefaults();
            this.updateDateInputForReports();
            this.toggleReportFilters();
        },

        // Métodos principales de la App
        saveData() {
            saveData(this.state);
        },
        
        loadData() {
            loadData(this);
        },

        getDefaultState,

        setDefaultState() {
            this.state = getDefaultState();
            this.saveData();
            this.updateAll();
        },

        updateAll() {
            renderTransactions(this.state);
            renderAccountsTab(this.state);
            renderVATSummary(this.state); // <--- NUEVA LLAMADA
            renderBalanceLegendAndChart(this.state);
            updateInicioKPIs(this.state);
            renderInicioCharts(this.state, this.charts);
            populateSelects(this.state);
            populateClientSelectForInvoice(this.state);
            renderSettings(this.state);
            renderDocuments(this.state);
            renderFacturas(this.state);
            renderInvestments(this.state);
            renderClients(this.state);
            updateModuleVisibility();
            renderArchives(this.state);
            this.saveData();
        },

        switchPage(pageId) {
            switchPage(pageId, this);
        },

        showAlertModal(title, message) {
            elements.alertModalTitle.textContent = title;
            elements.alertModalMessage.textContent = message;
            elements.alertModal.classList.remove('hidden');
        },

        // --- HANDLERS CENTRALIZADOS DE LA APP ---
        
        handleTransactionFormSubmit(e) {
            handleTransactionFormSubmit(e, this);
        },

        handleTransactionsTableClick(e) {
            handleTransactionsTableClick(e, this);
        },

        handleTransferFormSubmit(e) {
            handleTransferFormSubmit(e, this);
        },

        handleAddAccount(e) {
            handleAddAccount(e, this);
        },

        handleSettingsListClick(e) {
            handleSettingsListClick(e, this);
        },

        handleUpdateBalance(e) {
            handleUpdateBalance(e, this);
        },

        handleAddCategory(e, type) {
            handleAddCategory(e, type, this);
        },

        handleDeleteCategory(e, type) {
            handleDeleteCategory(e, type, this);
        },

        handleProformaSubmit(e) {
            handleProformaSubmit(e, this);
        },

        handleProformasTableClick(e) {
            handleProformasTableClick(e, this);
        },

        handleReportGeneration(e) {
            handleReportGeneration(e, this);
        },

        handleCloseYear() {
            handleCloseYear(this);
        },

        handleGenerateInvoice(e) {
            handleGenerateInvoice(e, this);
        },

        handleOperationTypeChange() {
            handleOperationTypeChange(this.state);
        },

        handleFacturasTableClick(e) {
            handleFacturasTableClick(e, this);
        },
        
        // Función de utilidad para manejar la edición y eliminación de clientes
        handleClientSelectionForInvoice(e) {
            handleClientSelectionForInvoice(e, this);
        },

        // --- NUEVA FUNCIÓN PARA GESTIONAR FACTURAS DE TERCEROS (IVA SOPORTADO) ---
        handleThirdPartyInvoiceSubmit(e) {
            e.preventDefault();
            const form = this.elements.thirdPartyInvoiceForm;

            const baseAmount = parseFloat(form.baseAmount.value);
            const vatRate = parseFloat(form.vatRate.value) / 100; // Convertir 21 a 0.21
            const accountName = form.account.value;

            if (isNaN(baseAmount) || baseAmount <= 0 || isNaN(vatRate) || !accountName) {
                this.showAlertModal('Error', 'Por favor, introduce una Base Imponible válida, un tipo de IVA y selecciona una Cuenta.');
                return;
            }

            const vatAmount = baseAmount * vatRate;
            const totalAmount = baseAmount + vatAmount;
            const account = this.state.accounts.find(a => a.name === accountName);

            if (!account) {
                this.showAlertModal('Error', 'La cuenta seleccionada no existe.');
                return;
            }

            const newTransaction = {
                id: crypto.randomUUID(),
                date: form.date.value || new Date().toISOString().split('T')[0],
                type: 'Egreso',
                category: form.category.value || 'Gasto Fiscal', 
                description: this.escapeHTML(form.description.value) || 'Factura de Tercero',
                account: accountName,
                currency: account.currency,
                amount: totalAmount,
                
                // CAMPOS CLAVE PARA EL DESGLOSE FISCAL
                isVATInvoice: true, 
                baseAmount: baseAmount,
                vatAmount: vatAmount
            };

            this.state.transactions.push(newTransaction);
            form.reset();
            this.recalculateAllBalances();
            this.saveData();
            this.updateAll();
            this.showAlertModal('Éxito', `Gasto con IVA registrado. Total: ${this.formatCurrency(totalAmount, account.currency)} (Base: ${this.formatCurrency(baseAmount, account.currency)}, IVA: ${this.formatCurrency(vatAmount, account.currency)})`);
        },
        // --- FIN DE FUNCIÓN PARA GESTIONAR FACTURAS DE TERCEROS ---
        
        // Facturación
        addFacturaItem() {
            addFacturaItem(this);
        },

        updateFacturaSummary() {
            updateFacturaSummary(this);
        },

        switchFacturacionTab(tabId) {
            switchFacturacionTab(tabId, this);
        },

        // --- FUNCIONES DE UTILDAD DE DATOS ---
        
        toggleDocumentStatus(docId) {
            const doc = this.state.documents.find(d => d.id === docId);
            if (doc) {
                doc.status = doc.status === 'Pendiente' ? 'Pagada' : 'Pendiente';
                this.saveData();
                this.renderDocuments();
                this.renderFacturas();
            }
        },

        deleteDocument(docId) {
            this.state.documents = this.state.documents.filter(d => d.id !== docId);
            this.saveData();
            this.renderDocuments();
            this.renderFacturas();
        },

        // Configuración
        toggleAeatModule() {
            this.state.settings.aeatModuleActive = !this.state.settings.aeatModuleActive;
            renderAeatSettings(this.state);
            this.saveData();
        },

        // Clientes
        handleAddClient(e) {
            handleAddClient(e, this);
        },

        handleClientsTableClick(e) {
            handleClientsTableClick(e, this);
        },

        // Reportes
        setDateDefaults() {
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('report-start-date').value = today;
            document.getElementById('report-end-date').value = today;
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
            const form = elements.reportForm;
            const period = form.querySelector('#report-period').value;
            const startDate = form.querySelector('#report-start-date').value;
            const endDate = form.querySelector('#report-end-date').value;
            const accountFilter = form.querySelector('#report-account').value;
            const typeFilter = form.querySelector('#report-type-filter').value;
            const categoryFilter = form.querySelector('#report-category-filter').value;

            let filteredTransactions = this.state.transactions.filter(t => !t.isInitialBalance && t.type !== 'Transferencia');
            
            // Filtrar por fechas
            filteredTransactions = filteredTransactions.filter(t => new Date(t.date) >= new Date(startDate) && new Date(t.date) <= new Date(endDate));

            // Filtrar por cuenta
            if (accountFilter !== 'all') {
                filteredTransactions = filteredTransactions.filter(t => t.account === accountFilter);
            }

            // Filtrar por tipo
            if (typeFilter !== 'all') {
                filteredTransactions = filteredTransactions.filter(t => t.type === typeFilter);
            }

            // Filtrar por categoría
            if (categoryFilter !== 'all') {
                filteredTransactions = filteredTransactions.filter(t => t.category === categoryFilter);
            }

            const columns = [
                { header: 'Fecha', dataKey: 'date' },
                { header: 'Tipo', dataKey: 'type' },
                { header: 'Descripción', dataKey: 'description' },
                { header: 'Categoría', dataKey: 'category' },
                { header: 'Cuenta', dataKey: 'account' },
                { header: 'Monto', dataKey: 'amount', currencyKey: 'currency' },
            ];

            return { data: filteredTransactions, title: `Reporte de Movimientos (${startDate} a ${endDate})`, columns: columns };
        },

        generateSociedadesReport() {
            // Lógica para el reporte de Sociedades (pendiente de implementar en detalle)
            const income = this.state.transactions.filter(t => t.type === 'Ingreso' && t.category !== 'Inversión').reduce((sum, t) => sum + t.amount, 0);
            const expenses = this.state.transactions.filter(t => t.type === 'Egreso' && t.category !== 'Inversión').reduce((sum, t) => sum + t.amount, 0);
            const taxBase = income - expenses;
            const taxRate = this.state.settings.fiscalParameters.corporateTaxRate / 100;
            const corporateTax = taxBase * taxRate;

            const data = [
                { concept: 'Ingresos Operativos', amount: income, currency: 'EUR' },
                { concept: 'Gastos Operativos', amount: expenses, currency: 'EUR' },
                { concept: 'Base Imponible (Est.)', amount: taxBase, currency: 'EUR' },
                { concept: `Impuesto de Sociedades (${this.state.settings.fiscalParameters.corporateTaxRate}%)`, amount: corporateTax, currency: 'EUR' },
            ];

            const columns = [
                { header: 'Concepto', dataKey: 'concept' },
                { header: 'Monto', dataKey: 'amount', currencyKey: 'currency' },
            ];

            return { data: data, title: `Reporte Fiscal de Sociedades`, columns: columns };
        },

        renderReport(title, columns, data) {
            elements.reportDisplayArea.innerHTML = '';
            
            const table = document.createElement('table');
            table.className = 'w-full table-auto text-left text-gray-400';
            
            const thead = table.createTHead();
            const headerRow = thead.insertRow();
            columns.forEach(col => {
                const th = document.createElement('th');
                th.textContent = col.header;
                th.className = 'py-2 px-4 border-b border-gray-700 font-semibold text-yellow-300';
                headerRow.appendChild(th);
            });

            const tbody = table.createTBody();
            data.forEach(item => {
                const row = tbody.insertRow();
                columns.forEach(col => {
                    const cell = row.insertCell();
                    const value = item[col.dataKey];

                    if (col.currencyKey) {
                        cell.textContent = this.formatCurrency(value, item[col.currencyKey] || 'EUR');
                        cell.className = 'py-2 px-4 whitespace-nowrap text-right';
                    } else {
                        cell.textContent = value;
                        cell.className = 'py-2 px-4';
                    }
                });
            });

            elements.reportDisplayArea.innerHTML = `<h3 class="text-xl font-bold mb-4 text-white">${title}</h3>`;
            elements.reportDisplayArea.appendChild(table);
        },

        viewSelectedArchive() {
            const select = document.getElementById('archive-select');
            const archiveId = select.value;
            if (archiveId && this.state.archivedData[archiveId]) {
                const archiveData = this.state.archivedData[archiveId];
                this.renderReport(`Archivo Histórico ${archiveId}`, archiveData.columns, archiveData.data);
            } else {
                this.showAlertModal('Error', 'No se encontró el archivo histórico.');
            }
        }
    };

    // Agregar funciones de utilidad de utils.js al App object para fácil acceso
    App.escapeHTML = escapeHTML;
    App.formatCurrency = formatCurrency;
    App.getCurrencySymbol = getCurrencySymbol;
    App.recalculateAllBalances = () => recalculateAllBalances(App.state);
    App.renderVATSummary = () => renderVATSummary(App.state); // Enlazar la función de UI

    App.init();
});