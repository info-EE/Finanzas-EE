document.addEventListener('DOMContentLoaded', () => {

    const App = {
        state: {
            accounts: [],
            transactions: [],
            documents: [],
            incomeCategories: [],
            expenseCategories: [],
            invoiceOperationTypes: [],
            modules: [],
            archivedData: {},
            activeReport: { type: null, data: [] },
            settings: {
                aeatModuleActive: false,
                aeatConfig: {
                    certPath: '',
                    certPass: '',
                    endpoint: '',
                    apiKey: ''
                },
                fiscalParameters: {
                    corporateTaxRate: 17
                }
            }
        },
        
        elements: {
            sidebar: document.getElementById('sidebar'),
            mainContent: document.getElementById('main-content'),
            navLinks: document.querySelectorAll('.nav-link'),
            pages: document.querySelectorAll('.page-content'),
            transactionForm: document.getElementById('transaction-form'),
            transactionsTableBody: document.getElementById('transactions-table-body'),
            transferForm: document.getElementById('transfer-form'),
            proformaForm: document.getElementById('proforma-form'),
            addAccountForm: document.getElementById('add-account-form'),
            updateBalanceForm: document.getElementById('update-balance-form'),
            reportForm: document.getElementById('report-form'),
            reportDisplayArea: document.getElementById('report-display-area'),
            addIncomeCategoryForm: document.getElementById('add-income-category-form'),
            addExpenseCategoryForm: document.getElementById('add-expense-category-form'),
            addOperationTypeForm: document.getElementById('add-operation-type-form'),
            settingsAccountsList: document.getElementById('settings-accounts-list'),
            incomeCategoriesList: document.getElementById('income-categories-list'),
            expenseCategoriesList: document.getElementById('expense-categories-list'),
            operationTypesList: document.getElementById('operation-types-list'),
            modulesList: document.getElementById('modules-list'),
            proformasTableBody: document.getElementById('proformas-table-body'),
            pageProformas: document.getElementById('page-proformas'),
            aeatSettingsCard: document.getElementById('aeat-settings-card'),
            aeatToggleContainer: document.getElementById('aeat-toggle-container'),
            aeatConfigForm: document.getElementById('aeat-config-form'), 
            nuevaFacturaForm: document.getElementById('nueva-factura-form'),
            facturaItemsContainer: document.getElementById('factura-items-container'),
            facturaAddItemBtn: document.getElementById('factura-add-item-btn'),
            facturaApiResponse: document.getElementById('factura-api-response'),
            facturaOperationType: document.getElementById('factura-operation-type'),
            defaultFiltersContainer: document.getElementById('default-filters-container'),
            sociedadesFiltersContainer: document.getElementById('sociedades-filters-container'),
            fiscalParamsForm: document.getElementById('fiscal-params-form')
        },

        charts: {
            accountsBalanceChartEUR: null,
            accountsBalanceChartUSD: null,
            annualFlowChart: null,
        },

        init() {
            lucide.createIcons();
            this.loadData();
            this.bindEventListeners();
            this.recalculateAllBalances();
            this.updateAll();
            this.switchPage('inicio');
            this.setDateDefaults();
            this.updateDateInputForReports();
            this.toggleReportFilters();
        },

        saveData() {
            try {
                const stateToSave = { ...this.state, activeReport: { type: null, data: [] } };
                localStorage.setItem('financeDashboardData', JSON.stringify(stateToSave));
            } catch (error) {
                console.error("Error al guardar datos en localStorage:", error);
            }
        },

        loadData() {
            const savedData = localStorage.getItem('financeDashboardData');
            if (savedData) {
                try {
                    const parsedData = JSON.parse(savedData);
                    const defaultState = this.getDefaultState();
                    const newState = { ...defaultState };

                    ['accounts', 'transactions', 'documents', 'incomeCategories', 'expenseCategories', 'invoiceOperationTypes'].forEach(key => {
                        if (Array.isArray(parsedData[key])) {
                            newState[key] = parsedData[key];
                        }
                    });

                    ['archivedData'].forEach(key => {
                        if (typeof parsedData[key] === 'object' && parsedData[key] !== null && !Array.isArray(parsedData[key])) {
                            newState[key] = parsedData[key];
                        }
                    });
                    
                    const savedModules = new Map((parsedData.modules || []).map(m => [m.id, m]));
                    newState.modules = defaultState.modules.map(defaultModule => ({
                        ...defaultModule,
                        active: savedModules.has(defaultModule.id) ? savedModules.get(defaultModule.id).active : defaultModule.active
                    }));

                    const loadedSettings = parsedData.settings || {};
                    newState.settings = {
                        ...defaultState.settings,
                        aeatModuleActive: typeof loadedSettings.aeatModuleActive === 'boolean' ? loadedSettings.aeatModuleActive : defaultState.settings.aeatModuleActive,
                        aeatConfig: {
                            ...defaultState.settings.aeatConfig,
                            ...(typeof loadedSettings.aeatConfig === 'object' && loadedSettings.aeatConfig !== null ? loadedSettings.aeatConfig : {})
                        },
                        fiscalParameters: {
                            ...defaultState.settings.fiscalParameters,
                            ...(typeof loadedSettings.fiscalParameters === 'object' && loadedSettings.fiscalParameters !== null ? loadedSettings.fiscalParameters : {})
                        }
                    };
                    
                    this.state = newState;
                } catch(error) {
                    console.error("Error al cargar datos, se restaurará al estado por defecto.", error);
                    this.setDefaultState();
                }
            } else {
                this.setDefaultState();
            }
        },

        getDefaultState() {
            return {
                accounts: [
                    { id: crypto.randomUUID(), name: 'CAIXA Bank', currency: 'EUR', symbol: '€', balance: 0.00, logoHtml: `<svg viewBox="0 0 80 60" class="w-6 h-6"><path d="M48.4,0L22.8,27.3c-0.3,0.3-0.3,0.8,0,1.1L48.4,56c1,1.1,2.8,0.4,2.8-1.1V36.8c0-1,0.8-1.7,1.7-1.7h11.2c8.8,0,15.9-7.1,15.9-15.9S83.1,2.3,74.3,2.3H64c-1,0-1.7-0.8-1.7-1.7V1.1C62.3,0.1,49.1-0.7,48.4,0z" fill="#0073B7"></path><circle cx="23.3" cy="28" r="5.5" fill="#FFC107"></circle><circle cx="23.3" cy="44.6" r="6.8" fill="#E6532B"></circle></svg>` },
                    { id: crypto.randomUUID(), name: 'Banco WISE', currency: 'USD', symbol: '$', balance: 0.00, logoHtml: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" class="w-6 h-6"><path fill="#a3e635" d="M50.9 64H64L33 20.6L24 34.3l15.1 21.7-10.8-16L18.3 56 33 34.3 43 20.6 11.7 64h13.2L4 39.1l2.8 3.8-6.4 7.6L33 26.3 0 64h12.9L33 36l17.9 28z"></path></svg>` }
                ],
                transactions: [],
                documents: [],
                incomeCategories: ['Ventas', 'Servicios', 'Otros Ingresos', 'Transferencia', 'Ajuste de Saldo'],
                expenseCategories: ['Operaciones', 'Marketing', 'Salarios', 'Software', 'Impuestos', 'Otros Gastos', 'Inversión', 'Transferencia', 'Comisiones', 'Ajuste de Saldo'],
                invoiceOperationTypes: ['Nacional / Intracomunitaria (UE)', 'Exportación (Fuera de la UE)'],
                modules: [
                    { id: 'facturacion', name: 'Facturación', description: 'Gestiona facturas y proformas.', active: false, navId: 'nav-facturacion', pageId: 'page-facturacion', icon: 'file-text' },
                    { id: 'usuarios', name: 'Gestión de Usuarios', description: 'Invita a usuarios con permisos.', active: false, navId: 'nav-usuarios', pageId: 'page-usuarios', icon: 'users' },
                    { id: 'inversiones', name: 'Inversiones', description: 'Seguimiento de fondos de inversión.', active: false, navId: 'nav-inversiones', pageId: 'page-inversiones', icon: 'trending-up' }
                ],
                archivedData: {},
                activeReport: { type: null, data: [] },
                settings: {
                    aeatModuleActive: false,
                    aeatConfig: {
                        certPath: '',
                        certPass: '',
                        endpoint: 'https://www2.agenciatributaria.gob.es/ws/VERIFACTU...',
                        apiKey: ''
                    },
                    fiscalParameters: {
                        corporateTaxRate: 17
                    }
                }
            };
        },
        
        setDefaultState() {
            this.state = this.getDefaultState();
        },

        switchPage(pageId) {
            this.elements.pages.forEach(page => page.classList.toggle('hidden', page.id !== `page-${pageId}`));
            this.elements.navLinks.forEach(link => link.classList.toggle('active', link.id === `nav-${pageId}`));
            
            // Lógica de renderizado específica de la página
        },

        updateAll() {
            this.renderTransactions();
            this.populateSelects();
            this.saveData();
        },
        
        renderTransactions() {
            // Lógica para renderizar transacciones
        },

        populateSelects() {
            // Lógica para poblar selects
        },
        
        bindEventListeners() {
            document.getElementById('sidebar-toggle').addEventListener('click', () => this.toggleSidebar());
            this.elements.navLinks.forEach(link => link.addEventListener('click', e => {
                e.preventDefault();
                this.switchPage(link.id.split('-')[1]);
            }));

            // El resto de los event listeners...
        },

        toggleSidebar() {
            this.elements.sidebar.classList.toggle('w-64');
            this.elements.sidebar.classList.toggle('w-20');
            this.elements.mainContent.classList.toggle('ml-64');
            this.elements.mainContent.classList.toggle('ml-20');
            document.querySelectorAll('.nav-text').forEach(el => el.classList.toggle('hidden'));
        },
        
        // El resto de TODAS las funciones del objeto App...
    };

    App.init();
});