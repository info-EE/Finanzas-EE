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
            facturasTableBody: document.getElementById('facturas-table-body'),
            defaultFiltersContainer: document.getElementById('default-filters-container'),
            sociedadesFiltersContainer: document.getElementById('sociedades-filters-container'),
            fiscalParamsForm: document.getElementById('fiscal-params-form'),

            // Visor de Facturas
            invoiceViewerModal: document.getElementById('invoice-viewer-modal'),
            invoiceContentArea: document.getElementById('invoice-content-area'),
            closeInvoiceViewerBtn: document.getElementById('close-invoice-viewer-btn'),
            printInvoiceBtn: document.getElementById('print-invoice-btn'),
            pdfInvoiceBtn: document.getElementById('pdf-invoice-btn')
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

                    // Iniciar con un estado por defecto para garantizar que todas las claves existan.
                    const newState = { ...defaultState };

                    // 1. Fusionar de forma segura las propiedades que deben ser arrays.
                    ['accounts', 'transactions', 'documents', 'incomeCategories', 'expenseCategories', 'invoiceOperationTypes'].forEach(key => {
                        // Usar los datos guardados solo si son un array válido, si no, mantener el array por defecto.
                        if (Array.isArray(parsedData[key])) {
                            newState[key] = parsedData[key];
                        }
                    });
                    // 2. Fusionar de forma segura las propiedades que deben ser objetos.
                    ['archivedData'].forEach(key => {
                        if (typeof parsedData[key] === 'object' && parsedData[key] !== null && !Array.isArray(parsedData[key])) {
                            newState[key] = parsedData[key];
                        }
                    });
                    // 3. Lógica de migración específica para Módulos (conserva activaciones del usuario).
                    const savedModules = new Map((parsedData.modules || []).map(m => [m.id, m]));
                    newState.modules = defaultState.modules.map(defaultModule => ({
                        ...defaultModule,
                        active: savedModules.has(defaultModule.id) ? savedModules.get(defaultModule.id).active : defaultModule.active
                    }));

                    // 4. Lógica de migración específica y segura para Ajustes.
                    const loadedSettings = parsedData.settings || {};
                    newState.settings = {
                        ...defaultState.settings,
                        aeatModuleActive: typeof loadedSettings.aeatModuleActive === 'boolean' ?
                        loadedSettings.aeatModuleActive : defaultState.settings.aeatModuleActive,
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
                    console.error("Error crítico al cargar o fusionar datos. Se restaurará al estado por defecto.", error);
                    this.setDefaultState(); // Como último recurso, si todo falla, empezar de cero.
                }
            } else {
                this.setDefaultState();
            }
        },

        getDefaultState() {
            return {
                accounts: [
                    { id: crypto.randomUUID(), name: 'CAIXA Bank', currency: 'EUR', symbol: '€', balance: 0.00, logoHtml: `<svg viewBox="0 0 80 60" class="w-6 h-6"><path d="M48.4,0L22.8,27.3c-0.3,0.3-0.3,0.8,0,1.1L48.4,56c1,1.1,2.8,0.4,2.8-1.1V36.8c0-1,0.8-1.7,1.7-1.7h11.2c8.8,0,15.9-7.1,15.9-15.9S83.1,2.3,74.3,2.3H64c-1,0-1.7-0.8-1.7-1.7V1.1C62.3,0.1,49.1-0.7,48.4,0z" fill="#0073B7"></path><circle cx="23.3" cy="28" r="5.5" fill="#FFC107"></circle><circle cx="23.3" cy="44.6" r="6.8" fill="#E6532B"></circle></svg>` },
                    { id: crypto.randomUUID(), name: 'Banco WISE', currency: 'USD', symbol: '$', balance: 0.00, logoHtml: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" class="w-6 h-6"><path fill="#a3e635" d="M50.9 64H64L33 20.6L24 34.3l15.1 21.7-10.8-16L18.3 56 33 34.3 43 20.6 11.7 64h13.2L4 39.1l2.8 3.8-6.4 7.6L33 26.3 0 64h12.9L33 36l17.9 28z"></path></svg>` },
                    { id: crypto.randomUUID(), name: 'Caja Chica', currency: 'EUR', symbol: '€', balance: 0.00, logoHtml: `<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzIDIiPjxwYXRoIGZpbGw9IiNDNjBCMUUiIGQ9Ik0wIDBoM3YySDB6Ii8+PHBhdGggZmlsbD0iI0ZGQzQwMCIgZD0iTTAgLjVoM3YxSDB6Ii8+PC9zdmc+" alt="Bandera de España" class="w-6 h-6 rounded-sm border border-gray-600">` },
                    { id: crypto.randomUUID(), name: 'Caja Eu', currency: 'USD', symbol: '$', balance: 0.00, logoHtml: `<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA5MDAgNjAwIj48cGF0aCBmaWxsPSIjMDAzMzk5IiBkPSJNMCAwaDkwMHY2MDBIMHoiLz48ZyBmaWxsPSIjRkZDQzAwIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0NTAgMzAwKSI+PGNpcmNsZSByPSIzMCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCAtMjAwKSIvPjxjaXJjbGUgcj0iMzAiIHRyYW5zZm9ybT0icm90YXRlKDMwKSB0cmFuc2xhdGUoMCAtMjAwKSIvPjxjaXJjbGUgcj0iMzAiIHRyYW5zZm9ybT0icm90YXRlKDkwKSB0cmFuc2xhdGUoMCAtMjAwKSIvPjxjaXJjbGUgcj0iMzAiIHRyYW5zZm9ybT0icm90YXRlKDEyMCkgdHJhbnNsYXRlKDAsIC0yMDApIi8+PGNpcmNsZSByPSIzMCIgdHJhbnNmb3JtPSJyb3RhdGUoMTUwKSB0cmFuc2xhdGUoMCAtMjAwKSIvPjxjaXJjbGUgcj0iMzAiIHRyYW5zZm9ybT0icm90YXRlKDE4MCkgdHJhbnNsYXRlKDAsIC0yMDApIi8+PGNpcmNsZSByPSIzMCIgdHJhbnNmb3JtPSJyb3RhdGUoMjEwKSB0cmFuc2xhdGUoMCAtMjAwKSIvPjxjaXJjbGUgcj0iMzAiIHRyYW5zZm9ybT0icm90YXRlKDI0MCkgdHJhbnNsYXRlKDAsIC0yMDApIi8+PGNpcmNsZSByPSIzMCIgdHJhbnNmb3JtPSJyb3RhdGUoMjcwKSB0cmFuc2xhdGUoMCAtMjAwKSIvPjxjaXJjbGUgcj0iMzAiIHRyYW5zZm9ybT0icm90YXRlKDMwMCkgdHJhbnNsYXRlKDAsIC0yMDApIi8+PGNpcmNsZSByPSIzMCIgdHJhbnNmb3JtPSJyb3RhdGUoMzMwKSB0cmFuc2xhdGUoMCAtMjAwKSIvPjwvZz48L3N2Zz4=" alt="Bandera de la Unión Europea" class="w-6 h-6 rounded-sm border border-gray-600">` },
                    { id: crypto.randomUUID(), name: 'Caja Arg.', currency: 'USD', symbol: '$', balance: 0.00, logoHtml: `<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA5IDYiPjxyZWN0IGZpbGw9IiM3NEFDREYiIHdpZHRoPSI5IiBoZWlnaHQ9IjMiLz48cmVjdCB5PSIzIiBmaWxsPSIjNzRBQ0RGIiB3aWR0aD0iOSIgaGVpZHRoPSIzIi8+PHJlY3QgeT0iMiIgZmlsbD0iI0ZGRiIgd2lkdGg9IjkiIGhlaWdodD0iMiIvPjwvc3ZnPg==" alt="Bandera de Argentina" class="w-6 h-6 rounded-sm border border-gray-600">` },
                    { id: crypto.randomUUID(), name: 'Caja Py', currency: 'USD', symbol: '$', balance: 0.00, logoHtml: `<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMSA2Ij48cGF0aCBmaWxsPSIjRDUyQjFFIiBkPSJNMCAwaDExdjJIMHoiLz48cGF0aCBmaWxsPSIjRkZGIiBkPSJNMCAyaDExdjJIMHoiLz48cGF0aCBmaWxsPSIjMDAzOEE4IiBkPSJNMCA0aDExdjJIMHoiLz48L3N2Zz4=" alt="Bandera de Paraguay" class="w-6 h-6 rounded-sm border border-gray-600">` }
                ],
                transactions: [],
                documents: [],
                incomeCategories: ['Ventas', 'Servicios', 'Otros Ingresos', 'Transferencia', 'Ajuste de Saldo'],
                expenseCategories: ['Operaciones', 'Marketing', 'Salarios', 'Software', 'Impuestos', 'Otros Gastos', 'Inversión', 'Transferencia', 'Comisiones', 'Ajuste de Saldo'],
                invoiceOperationTypes: ['Nacional / Intracomunitaria (UE)', 'Exportación (Fuera de la UE)'],
                modules: [],
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
                    fiscalParameters: { // ✨ NUEVO
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
            
            if (pageId === 'cuentas') setTimeout(() => this.renderBalanceLegendAndChart(), 0);
            if (pageId === 'inicio') setTimeout(() => this.renderInicioCharts(), 50);
            if (pageId === 'facturacion') {
                this.switchFacturacionTab('crear'); // <-- Pestaña por defecto
                this.renderAeatConfig();
                if (this.elements.facturaItemsContainer.childElementCount === 0) {
                    this.addFacturaItem();
                }
                this.handleOperationTypeChange();
            }
        },

        updateAll() {
            this.renderTransactions();
            this.renderAccountsTab();
            this.renderBalanceLegendAndChart();
            this.updateInicioKPIs();
            this.renderInicioCharts();
            this.populateSelects();
            this.renderSettings();
            this.renderDocuments();
            this.renderFacturas();
            this.renderInvestments();
            this.updateModuleVisibility();
            this.renderArchives();
            this.saveData();
        },

        recalculateAllBalances() {
            const initialBalances = new Map();
            this.state.accounts.forEach(acc => {
                const initialTransaction = this.state.transactions.find(t => t.isInitialBalance && t.account === acc.name);
                initialBalances.set(acc.name, initialTransaction ? initialTransaction.amount : 0);
            });
            this.state.accounts.forEach(account => {
                let currentBalance = initialBalances.get(account.name) || 0;
                this.state.transactions
                    .filter(t => t.account === account.name && !t.isInitialBalance)
                    .forEach(t => {
                        currentBalance += (t.type === 'Ingreso' ? t.amount : -t.amount);
                    });
                account.balance = currentBalance;
            });
        },

        renderTransactions() {
            const tbody = this.elements.transactionsTableBody;
            const fragment = document.createDocumentFragment();
            let operationalTransactions = this.state.transactions.filter(t => t.category !== 'Inversión' && !t.isInitialBalance);
            
            const searchTerm = document.getElementById('cashflow-search').value.toLowerCase();
            if (searchTerm) {
                operationalTransactions = operationalTransactions.filter(t => 
                    t.description.toLowerCase().includes(searchTerm) ||
                    t.account.toLowerCase().includes(searchTerm) ||
                    t.category.toLowerCase().includes(searchTerm)
                );
            }
            
            tbody.innerHTML = '';
            if(operationalTransactions.length === 0){
                const row = document.createElement('tr');
                row.innerHTML = `<td colspan="7" class="text-center py-4 text-gray-500">No hay movimientos que coincidan con la búsqueda.</td>`;
                fragment.appendChild(row);
            } else {
                operationalTransactions.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(t => {
                    const row = document.createElement('tr');
                    row.className = 'border-b border-gray-800 hover:bg-gray-800/50 transition-colors';
                    const amountColor = t.type === 'Ingreso' ? 'text-green-400' : 'text-red-400';
                    const sign = t.type === 'Ingreso' ? '+' : '-';

                    row.innerHTML = `
                        <td class="py-3 px-3">${t.date}</td>
                        <td class="py-3 px-3">${this.escapeHTML(t.description)}</td>
                        <td class="py-3 px-3">${this.escapeHTML(t.account)}</td>
                        <td class="py-3 px-3">${this.escapeHTML(t.category)}</td>
                        <td class="py-3 px-3">${this.escapeHTML(t.part)}</td>
                        <td class="py-3 px-3 text-right font-medium ${amountColor}">${sign} ${this.formatCurrency(t.amount, t.currency)}</td>
                        <td class="py-3 px-3">
                            <div class="flex items-center justify-center gap-2">
                                <button class="edit-btn p-2 text-blue-400 hover:text-blue-300" data-id="${t.id}" title="Editar">
                                    <i data-lucide="edit" class="w-4 h-4"></i>
                                </button>
                                <button class="delete-btn p-2 text-red-400 hover:text-red-300" data-id="${t.id}" title="Eliminar">
                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                </button>
                            </div>
                        </td>`;
                    fragment.appendChild(row);
                });
            }
            tbody.appendChild(fragment);
            lucide.createIcons();
        },

        renderAccountsTab() {
            const accountsGrid = document.getElementById('accounts-grid');
            const fragment = document.createDocumentFragment();
            this.state.accounts.forEach(account => {
                const card = document.createElement('div');
                card.className = 'card p-6 rounded-xl flex flex-col';
                
                const headerDiv = document.createElement('div');
                headerDiv.className = 'flex justify-between items-start mb-2';
                
                const nameH3 = document.createElement('h3');
                nameH3.className = 'font-semibold text-lg';
                nameH3.textContent = account.name;
                
                const iconWrapper = document.createElement('div');
                iconWrapper.innerHTML = account.logoHtml ? account.logoHtml : `<i data-lucide="wallet" class="text-gray-500"></i>`;
                
                headerDiv.appendChild(nameH3);
                headerDiv.appendChild(iconWrapper);

                const bodyDiv = document.createElement('div');
                bodyDiv.className = 'mt-auto';
                
                const labelP = document.createElement('p');
                labelP.className = 'text-gray-400 text-sm';
                labelP.textContent = 'Saldo Actual';
                
                const balanceP = document.createElement('p');
                balanceP.className = 'text-4xl font-bold kpi-value mt-2';
                balanceP.textContent = this.formatCurrency(account.balance, account.currency);

                bodyDiv.appendChild(labelP);
                bodyDiv.appendChild(balanceP);

                card.appendChild(headerDiv);
                card.appendChild(bodyDiv);
                fragment.appendChild(card);
            });
            accountsGrid.innerHTML = '';
            accountsGrid.appendChild(fragment);
            lucide.createIcons();
        },

        renderBalanceLegendAndChart() {
            const totalsContainer = document.getElementById('balance-totals');
            const accounts = this.state.accounts;
            
            const totalEUR = accounts.filter(a => a.currency === 'EUR').reduce((sum, a) => sum + a.balance, 0);
            const totalUSD = accounts.filter(a => a.currency === 'USD').reduce((sum, a) => sum + a.balance, 0);
            totalsContainer.innerHTML = `
                <div><p class="text-gray-400 text-sm">Saldo Total en Euros</p><p class="text-2xl font-bold text-white">${this.formatCurrency(totalEUR, 'EUR')}</p></div>
                <div><p class="text-gray-400 text-sm">Saldo Total en Dólares</p><p class="text-2xl font-bold text-white">${this.formatCurrency(totalUSD, 'USD')}</p></div>
            `;
            this.renderSingleCurrencyChart('EUR', totalEUR, 'accountsBalanceChartEUR', 'balance-legend-eur', 'eur-chart-container');
            this.renderSingleCurrencyChart('USD', totalUSD, 'accountsBalanceChartUSD', 'balance-legend-usd', 'usd-chart-container');
        },

        renderSingleCurrencyChart(currency, totalBalance, canvasId, legendId, containerId) {
            const container = document.getElementById(containerId);
            const accounts = this.state.accounts.filter(a => a.currency === currency && a.balance > 0);
            if (accounts.length === 0) {
                container.classList.add('hidden');
                return;
            }
            container.classList.remove('hidden');
            const legendContainer = document.getElementById(legendId);
            const chartCtx = document.getElementById(canvasId)?.getContext('2d');
            if (!legendContainer || !chartCtx) return;
            
            const chartInstanceName = canvasId;
            if (this.charts[chartInstanceName]) {
                this.charts[chartInstanceName].destroy();
            }

            const colorPairs = [ ['#FFC3A0', '#FF7A85'], ['#D4A5A5', '#A5D4D4'], ['#CDB4DB', '#FFC8DD'], ['#A2D2FF', '#BDE0FE'], ['#FBC2EB', '#A6C1EE'], ['#FDDB6D', '#F1C40F'] ];
            const backgroundColors = [];
            
            accounts.forEach((account, index) => {
                backgroundColors.push(colorPairs[index % colorPairs.length][0]);
            });
            legendContainer.innerHTML = accounts.map((account, index) => {
                const percentage = totalBalance > 0 ? ((account.balance / totalBalance) * 100).toFixed(1) : 0;
                return `
                    <div class="flex items-center justify-between py-2 text-sm border-b border-gray-800 last:border-b-0">
                        <div class="flex items-center gap-3">
                            <span class="w-3 h-3 rounded-full" style="background-color: ${backgroundColors[index]};"></span>
                            <span>${this.escapeHTML(account.name)}</span>
                        </div>
                        <div class="text-right">
                            <span class="font-semibold">${percentage}%</span>
                            <span class="text-xs text-gray-400 block">${this.formatCurrency(account.balance, account.currency)}</span>
                        </div>
                    </div>`;
            }).join('');
            this.charts[chartInstanceName] = new Chart(chartCtx, { 
                type: 'doughnut', 
                data: { 
                    labels: accounts.map(a => a.name), 
                    datasets: [{ 
                        data: accounts.map(a => a.balance), 
                        backgroundColor: backgroundColors,
                        borderColor: '#0a0a0a', borderWidth: 5, borderRadius: 10,
                    }] 
                }, 
                options: { 
                    responsive: true, maintainAspectRatio: false, cutout: '65%',
                    plugins: { legend: { display: false } }
                } 
            });
        },

        updateInicioKPIs() {
            const totalEUR = this.state.accounts.filter(a => a.currency === 'EUR').reduce((s, a) => s + a.balance, 0);
            const totalUSD = this.state.accounts.filter(a => a.currency === 'USD').reduce((s, a) => s + a.balance, 0);
            document.getElementById('total-eur').textContent = this.formatCurrency(totalEUR, 'EUR');
            document.getElementById('total-usd').textContent = this.formatCurrency(totalUSD, 'USD');
        },
        
        renderInicioCharts() {
            const annualCtx = document.getElementById('annualFlowChart')?.getContext('2d');
            if (!annualCtx) return;

            if (this.charts.annualFlowChart) this.charts.annualFlowChart.destroy();
            
            const selectedCurrency = document.getElementById('inicio-chart-currency').value;
            const currencySymbol = selectedCurrency === 'EUR' ? '€' : '$';
            const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
            const currentYear = new Date().getFullYear();
            const incomeData = Array(12).fill(0);
            const expenseData = Array(12).fill(0);

            this.state.transactions
                .filter(t => t.currency === selectedCurrency)
                .forEach(t => {
                    const tDate = new Date(t.date);
                    if (tDate.getFullYear() === currentYear) {
                        const month = tDate.getMonth();
                        if (t.type === 'Ingreso') incomeData[month] += t.amount;
                        else if (t.type === 'Egreso') expenseData[month] += t.amount;
                    }
                });
            const incomeGradient = annualCtx.createLinearGradient(0, 0, 0, 320);
            incomeGradient.addColorStop(0, 'rgba(59, 130, 246, 0.5)');
            incomeGradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
            const expenseGradient = annualCtx.createLinearGradient(0, 0, 0, 320);
            expenseGradient.addColorStop(0, 'rgba(239, 68, 68, 0.5)');
            expenseGradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
            this.charts.annualFlowChart = new Chart(annualCtx, {
                type: 'line',
                data: {
                    labels: months,
                    datasets: [
                        { label: `Ingresos (${currencySymbol})`, data: incomeData, borderColor: 'rgba(59, 130, 246, 1)', backgroundColor: incomeGradient, fill: true, tension: 0.4 },
                        { label: `Egresos (${currencySymbol})`, data: expenseData, borderColor: 'rgba(239, 68, 68, 1)', backgroundColor: expenseGradient, fill: true, tension: 0.4 }
                    ]
                },
                options: { 
                    responsive: true, maintainAspectRatio: false, 
                    scales: { 
                        y: { 
                            beginAtZero: true,
                            ticks: { callback: value => currencySymbol + value.toLocaleString(selectedCurrency === 'EUR' ? 'de-DE' : 'en-US') }
                        } 
                    },
                    plugins: { legend: { position: 'bottom' } }
                }
            });
        },

        populateSelects() {
            const accounts = this.state.accounts;
            const optionsHtml = accounts.map(acc => `<option value="${this.escapeHTML(acc.name)}">${this.escapeHTML(acc.name)}</option>`).join('');
            
            const selects = ['transaction-account', 'transfer-from', 'transfer-to', 'update-account-select'];
            selects.forEach(id => {
                const select = document.getElementById(id);
                if (select) select.innerHTML = optionsHtml;
            });
            this.populateCategories();
            this.populateOperationTypesSelect();
            this.updateCurrencySymbol();
            this.updateTransferFormUI();
            this.populateReportAccounts();
        },

        populateCategories() {
            const typeSelect = document.getElementById('transaction-type');
            const categorySelect = document.getElementById('transaction-category');
            const currentType = typeSelect.value;
            const categories = currentType === 'Ingreso' ? this.state.incomeCategories : this.state.expenseCategories;
            categorySelect.innerHTML = categories.map(cat => `<option value="${this.escapeHTML(cat)}">${this.escapeHTML(cat)}</option>`).join('');
        },

        populateOperationTypesSelect() {
            const operationTypeSelect = this.elements.facturaOperationType;
            const types = this.state.invoiceOperationTypes;
            operationTypeSelect.innerHTML = types.map(type => `<option value="${this.escapeHTML(type)}">${this.escapeHTML(type)}</option>`).join('');
        },

        updateCurrencySymbol() {
            const accountSelect = document.getElementById('transaction-account');
            if (!accountSelect.value) return;
            const account = this.state.accounts.find(acc => acc.name === accountSelect.value);
            if (account) {
                document.getElementById('amount-currency-symbol').textContent = account.symbol;
            }
        },

        updateTransferFormUI() {
            if(!document.getElementById('transfer-from').value) return;
            const fromAccount = this.state.accounts.find(a => a.name === document.getElementById('transfer-from').value);
            const toAccount = this.state.accounts.find(a => a.name === document.getElementById('transfer-to').value);
            if (!fromAccount || !toAccount) return;

            document.getElementById('transfer-amount-currency-symbol').textContent = fromAccount.symbol;
            document.getElementById('transfer-fee-source-currency-symbol').textContent = fromAccount.symbol;
            document.getElementById('transfer-extra-currency-symbol').textContent = toAccount.symbol;

            const extraFieldLabel = document.getElementById('transfer-extra-label');
            const extraFieldInput = document.getElementById('transfer-extra-field');

            if (fromAccount.currency !== toAccount.currency) {
                extraFieldLabel.textContent = `Monto a Recibir (${toAccount.symbol})`;
                extraFieldInput.placeholder = "950.00";
                extraFieldInput.required = true;
            } else {
                extraFieldLabel.textContent = "Comisión Destino (Opcional)";
                extraFieldInput.placeholder = "1.00";
                extraFieldInput.required = false;
            }
        },

        populateReportAccounts() {
            const reportAccountSelect = document.getElementById('report-account');
            reportAccountSelect.innerHTML = '<option value="all">Todas las Cuentas</option>';
            reportAccountSelect.innerHTML += this.state.accounts.map(acc => `<option value="${this.escapeHTML(acc.name)}">${this.escapeHTML(acc.name)}</option>`).join('');
        },

        renderSettings() {
            const accountsList = this.elements.settingsAccountsList;
            const incomeList = this.elements.incomeCategoriesList;
            const expenseList = this.elements.expenseCategoriesList;
            
            const operationTypesList = this.elements.operationTypesList;

            const accountFragment = document.createDocumentFragment();
            this.state.accounts.forEach(acc => {
                const div = document.createElement('div');
                div.className = "flex items-center justify-between bg-gray-800/50 p-2 rounded";
                div.innerHTML = `
                    <div class="flex items-center gap-2 text-sm">${acc.logoHtml || ''}<span>${this.escapeHTML(acc.name)}</span></div>
                    <button class="delete-account-btn p-1 text-red-400 hover:text-red-300" data-name="${this.escapeHTML(acc.name)}"><i data-lucide="trash-2" class="w-4 h-4"></i></button>`;
                accountFragment.appendChild(div);
            });
            accountsList.innerHTML = '';
            accountsList.appendChild(accountFragment);

            const renderCategoryList = (categories, essentialCategories) => {
                const fragment = document.createDocumentFragment();
                categories.forEach(cat => {
                    const div = document.createElement('div');
                    div.className = "flex items-center justify-between bg-gray-800/50 p-2 rounded text-sm";
                    const isEssential = essentialCategories.includes(cat);
                    const deleteButtonHtml = isEssential 
                        ? `<span class="p-1 text-gray-600 cursor-not-allowed" title="Categoría esencial no se puede eliminar"><i data-lucide="lock" class="w-4 h-4"></i></span>`
                        : `<button class="delete-category-btn p-1 text-red-400 hover:text-red-300" data-name="${this.escapeHTML(cat)}"><i data-lucide="trash-2" class="w-4 h-4"></i></button>`;
                    div.innerHTML = `<span>${this.escapeHTML(cat)}</span> ${deleteButtonHtml}`;
                    fragment.appendChild(div);
                });
                return fragment;
            };
            incomeList.innerHTML = '';
            incomeList.appendChild(renderCategoryList(this.state.incomeCategories, ['Transferencia', 'Comisiones', 'Ajuste de Saldo', 'Inversión', 'Otros Ingresos']));
            expenseList.innerHTML = '';
            expenseList.appendChild(renderCategoryList(this.state.expenseCategories, ['Transferencia', 'Comisiones', 'Ajuste de Saldo', 'Inversión', 'Otros Gastos']));

            operationTypesList.innerHTML = '';
            operationTypesList.appendChild(renderCategoryList(this.state.invoiceOperationTypes, ['Nacional / Intracomunitaria (UE)', 'Exportación (Fuera de la UE)']));

            
            this.renderAeatSettings();
            this.renderFiscalParams();

            lucide.createIcons();
        },

        renderAeatSettings() {
            const facturacionModule = this.state.modules.find(m => m.id === 'facturacion');
            this.elements.aeatSettingsCard.classList.toggle('hidden', !facturacionModule || !facturacionModule.active);

            const container = this.elements.aeatToggleContainer;
            const isActive = this.state.settings.aeatModuleActive;
            const buttonHtml = isActive
                ?
                `<button class="aeat-toggle-btn bg-blue-600 text-white font-bold py-2 px-3 rounded-lg shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-colors text-xs flex items-center justify-center gap-1">
                        <i data-lucide="check-circle" class="w-4 h-4"></i> Activado
                    </button>`
                : `<button class="aeat-toggle-btn border border-blue-800 text-blue-400 font-bold py-2 px-3 rounded-lg hover:bg-blue-800/20 hover:text-blue-300 transition-colors text-xs">
                        Activar
                    </button>`;
            container.innerHTML = buttonHtml;
            lucide.createIcons();
        },

        renderDocuments() {
            const proformasTbody = this.elements.proformasTableBody;
            const proformasData = this.state.documents.filter(d => d.type === 'Proforma');
            const proformaSearchTerm = this.elements.pageProformas.querySelector('#proformas-search').value.toLowerCase();
            let filteredProformas = proformasData;
            if (proformaSearchTerm) {
                filteredProformas = proformasData.filter(d =>
                    d.number.toLowerCase().includes(proformaSearchTerm) ||
                    d.client.toLowerCase().includes(proformaSearchTerm)
                );
            }

            proformasTbody.innerHTML = '';
            if (filteredProformas.length === 0) {
                proformasTbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-gray-500">No hay proformas que coincidan.</td></tr>`;
            } else {
                const proformaFragment = document.createDocumentFragment();
                filteredProformas.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(p => {
                    const row = document.createElement('tr');
                    row.className = "border-b border-gray-800 hover:bg-gray-800/50";
                    
                    const statusClass = p.status === 'Cobrada' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300';
                    row.innerHTML = `
                        <td class="py-3 px-3">${p.date}</td>
                        <td class="py-2 px-3">${this.escapeHTML(p.number)}</td>
                        <td class="py-2 px-3">${this.escapeHTML(p.client)}</td>
                        <td class="py-2 px-3 text-right">${this.formatCurrency(p.amount, p.currency)}</td>
                        <td class="py-2 px-3 text-center">
                            <button class="status-btn text-xs font-semibold px-2 py-1 rounded-full ${statusClass}" data-id="${p.id}">${p.status}</button>
                        </td>
                        <td class="py-2 px-3">
                            <div class="flex items-center justify-center gap-2">
                            <button class="delete-doc-btn p-2 text-red-400 hover:text-red-300" data-id="${p.id}" title="Eliminar">
                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                </button>
                            </div>
                        </td>`;
                    proformaFragment.appendChild(row);
                });
                proformasTbody.appendChild(proformaFragment);
            }
            lucide.createIcons();
        },
        
        renderFacturas() {
            const facturasTbody = this.elements.facturasTableBody;
            const facturasData = this.state.documents.filter(d => d.type === 'Factura');
            const facturaSearchTerm = document.getElementById('facturas-search').value.toLowerCase();
            let filteredFacturas = facturasData;
        
            if (facturaSearchTerm) {
                filteredFacturas = facturasData.filter(d =>
                    d.number.toLowerCase().includes(facturaSearchTerm) ||
                    d.client.toLowerCase().includes(facturaSearchTerm)
                );
            }
        
            facturasTbody.innerHTML = '';
            if (filteredFacturas.length === 0) {
                facturasTbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-gray-500">No hay facturas que coincidan.</td></tr>`;
            } else {
                const facturaFragment = document.createDocumentFragment();
                filteredFacturas.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(f => {
                    const row = document.createElement('tr');
                    row.className = "border-b border-gray-800 hover:bg-gray-800/50";
                    
                    const statusClass = f.status === 'Cobrada' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300';
                    row.innerHTML = `
                        <td class="py-3 px-3">${f.date}</td>
                        <td class="py-2 px-3">${this.escapeHTML(f.number)}</td>
                        <td class="py-2 px-3">${this.escapeHTML(f.client)}</td>
                        <td class="py-2 px-3 text-right">${this.formatCurrency(f.amount, f.currency)}</td>
                        <td class="py-2 px-3 text-center">
                            <button class="status-btn text-xs font-semibold px-2 py-1 rounded-full ${statusClass}" data-id="${f.id}">${f.status}</button>
                        </td>
                        <td class="py-2 px-3">
                            <div class="flex items-center justify-center gap-2">
                                <button class="view-invoice-btn p-2 text-blue-400 hover:text-blue-300" data-id="${f.id}" title="Ver Factura">
                                    <i data-lucide="eye" class="w-4 h-4"></i>
                                </button>
                                <button class="delete-doc-btn p-2 text-red-400 hover:text-red-300" data-id="${f.id}" title="Eliminar">
                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                </button>
                            </div>
                        </td>`;
                    facturaFragment.appendChild(row);
                });
                facturasTbody.appendChild(facturaFragment);
            }
            lucide.createIcons();
        },

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

        showInvoiceViewer(invoiceId) {
            const invoice = this.state.documents.find(doc => doc.id === invoiceId);
            if (!invoice) {
                console.error('Factura no encontrada');
                return;
            }

            const currencySymbol = this.getCurrencySymbol(invoice.currency);
            const ivaRate = invoice.operationType.toLowerCase().includes('exportación') ? 0 : 0.21;

            let itemsHtml = '';
            invoice.items.forEach(item => {
                itemsHtml += `
                    <tr class="border-b border-gray-700">
                        <td class="py-2 px-4">${this.escapeHTML(item.description)}</td>
                        <td class="py-2 px-4 text-right">${item.quantity}</td>
                        <td class="py-2 px-4 text-right">${this.formatCurrency(item.price, invoice.currency)}</td>
                        <td class="py-2 px-4 text-right">${this.formatCurrency(item.quantity * item.price, invoice.currency)}</td>
                    </tr>
                `;
            });

            const invoiceHtml = `
                <div id="invoice-printable-area">
                    <header class="flex justify-between items-start mb-8 p-8">
                        <div>
                            <h1 class="text-3xl font-bold text-white">FACTURA</h1>
                            <p class="text-gray-400">Nº: ${this.escapeHTML(invoice.number)}</p>
                            <p class="text-gray-400">Fecha: ${invoice.date}</p>
                        </div>
                        <div class="text-right">
                            <h2 class="text-xl font-semibold text-blue-300">Tu Empresa/Nombre</h2>
                            <p class="text-gray-400">Tu Dirección</p>
                            <p class="text-gray-400">Tu NIF/CIF</p>
                        </div>
                    </header>
                    <div class="p-8">
                        <div class="mb-8">
                            <h3 class="font-semibold text-gray-300 mb-2">Facturar a:</h3>
                            <p>${this.escapeHTML(invoice.client)}</p>
                            <p>${this.escapeHTML(invoice.nif)}</p>
                        </div>
                        <table class="w-full text-left mb-8">
                            <thead>
                                <tr class="bg-gray-800 text-gray-300">
                                    <th class="py-2 px-4">Concepto</th>
                                    <th class="py-2 px-4 text-right">Cantidad</th>
                                    <th class="py-2 px-4 text-right">Precio Unit.</th>
                                    <th class="py-2 px-4 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsHtml}
                            </tbody>
                        </table>
                        <div class="flex justify-end">
                            <div class="w-full max-w-xs space-y-2">
                                <div class="flex justify-between">
                                    <span class="text-gray-400">Subtotal:</span>
                                    <span>${this.formatCurrency(invoice.subtotal, invoice.currency)}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-400">IVA (${(ivaRate * 100).toFixed(0)}%):</span>
                                    <span>${this.formatCurrency(invoice.iva, invoice.currency)}</span>
                                </div>
                                <div class="flex justify-between font-bold text-xl border-t border-gray-600 pt-2 mt-2">
                                    <span>TOTAL:</span>
                                    <span>${this.formatCurrency(invoice.total, invoice.currency)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            this.elements.invoiceContentArea.innerHTML = invoiceHtml;
            this.elements.invoiceViewerModal.classList.remove('hidden');
            this.elements.invoiceViewerModal.classList.add('flex');
            lucide.createIcons();
        },

        hideInvoiceViewer() {
            this.elements.invoiceViewerModal.classList.add('hidden');
            this.elements.invoiceViewerModal.classList.remove('flex');
            this.elements.invoiceContentArea.innerHTML = '';
        },

        printInvoice() {
            const printContent = this.elements.invoiceContentArea.innerHTML;
            const printWindow = window.open('', '', 'height=800,width=800');
            printWindow.document.write('<html><head><title>Factura</title>');
            // Aquí podrías enlazar un CSS específico para impresión
            printWindow.document.write('<link rel="stylesheet" href="style.css">');
            printWindow.document.write('<style>body { background-color: #111827; color: #d1d5db; } .card { background-color: #1f2937; } @media print { body { background-color: white; color: black; } .text-white { color: black !important; } .text-gray-300 { color: #4b5563 !important; } .text-gray-400 { color: #6b7280 !important; } .bg-gray-800 { background-color: #f3f4f6 !important; } .border-gray-700 { border-color: #d1d5db !important; } }</style>');
            printWindow.document.write('</head><body>');
            printWindow.document.write(printContent);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            setTimeout(() => { // Timeout para asegurar que el contenido se cargue
                printWindow.print();
                printWindow.close();
            }, 250);
        },

        downloadInvoiceAsPDF() {
            const { jsPDF } = window.jspdf;
            const invoiceElement = document.getElementById('invoice-printable-area');
            const doc = new jsPDF({
                orientation: 'p',
                unit: 'pt',
                format: 'a4'
            });

            doc.html(invoiceElement, {
                callback: function (doc) {
                    doc.save('factura.pdf');
                },
                x: 10,
                y: 10,
                width: 575, // A4 width in points is ~595, leave some margin
                windowWidth: invoiceElement.scrollWidth
            });
        },

        handleFacturasTableClick(e) {
            const target = e.target;
            const statusBtn = target.closest('.status-btn');
            const deleteBtn = target.closest('.delete-doc-btn');
            const viewBtn = target.closest('.view-invoice-btn');

            if (statusBtn) {
                const docId = statusBtn.dataset.id;
                this.toggleDocumentStatus(docId);
            } else if (deleteBtn) {
                const docId = deleteBtn.dataset.id;
                this.deleteDocument(docId);
            } else if (viewBtn) {
                const docId = viewBtn.dataset.id;
                this.showInvoiceViewer(docId);
            }
        },

        updateModuleVisibility() {
            // Esta función ya no es necesaria y puede ser eliminada o dejada en blanco.
            // Los enlaces de navegación ahora son siempre visibles.
        },

        renderArchives() {
            const yearSelect = document.getElementById('archive-year-select');
            const displayArea = document.getElementById('archive-display-area');
            const archiveYears = Object.keys(this.state.archivedData);

            if (archiveYears.length === 0) {
                yearSelect.innerHTML = '<option>No hay archivos</option>';
                displayArea.innerHTML = `<div class="text-center text-gray-500 py-10"><i data-lucide="archive" class="w-16 h-16 mx-auto mb-4"></i><p>Aún no se ha realizado ningún cierre anual.</p></div>`;
                lucide.createIcons();
                return;
            }

            yearSelect.innerHTML = archiveYears.map(year => `<option value="${year}">${year}</option>`).join('');
        },

        bindEventListeners() {
            document.getElementById('sidebar-toggle').addEventListener('click', () => this.toggleSidebar());
            this.elements.navLinks.forEach(link => link.addEventListener('click', e => { e.preventDefault(); this.switchPage(link.id.split('-')[1]); }));
            
            this.elements.transactionForm.addEventListener('submit', e => this.handleTransactionFormSubmit(e));
            this.elements.transferForm.addEventListener('submit', e => this.handleTransferFormSubmit(e));
            this.elements.proformaForm.addEventListener('submit', e => this.handleProformaFormSubmit(e));
            this.elements.addAccountForm.addEventListener('submit', e => this.handleAddAccount(e));
            this.elements.updateBalanceForm.addEventListener('submit', e => this.handleUpdateBalance(e));
            this.elements.reportForm.addEventListener('submit', e => this.handleReportGeneration(e));
            this.elements.addIncomeCategoryForm.addEventListener('submit', e => this.handleAddCategory(e, 'income'));
            this.elements.addExpenseCategoryForm.addEventListener('submit', e => this.handleAddCategory(e, 'expense'));
            this.elements.addOperationTypeForm.addEventListener('submit', e => this.handleAddOperationType(e));
            
            document.getElementById('form-cancel-button').addEventListener('click', () => this.resetTransactionForm());
            document.getElementById('close-year-btn').addEventListener('click', () => this.handleCloseYear());
            document.getElementById('view-archive-btn').addEventListener('click', () => this.handleViewArchive());

            document.getElementById('transaction-type').addEventListener('change', () => this.populateCategories());
            document.getElementById('transaction-account').addEventListener('change', () => this.updateCurrencySymbol());
            document.getElementById('transfer-from').addEventListener('change', () => this.updateTransferFormUI());
            document.getElementById('transfer-to').addEventListener('change', () => this.updateTransferFormUI());
            document.getElementById('report-period').addEventListener('change', () => this.updateDateInputForReports());
            document.getElementById('inicio-chart-currency').addEventListener('change', () => this.renderInicioCharts());
            document.getElementById('report-type').addEventListener('change', () => this.toggleReportFilters());

            this.elements.transactionsTableBody.addEventListener('click', e => this.handleTransactionsTableClick(e));
            this.elements.settingsAccountsList.addEventListener('click', e => this.handleSettingsAccountsListClick(e));
            this.elements.incomeCategoriesList.addEventListener('click', e => this.handleCategoryDeleteClick(e, 'income'));
            this.elements.expenseCategoriesList.addEventListener('click', e => this.handleCategoryDeleteClick(e, 'expense'));
            this.elements.operationTypesList.addEventListener('click', e => this.handleCategoryDeleteClick(e, 'operationType'));
            
            this.elements.aeatSettingsCard.addEventListener('click', e => this.handleAeatModuleToggleClick(e));
            this.elements.pageProformas.addEventListener('click', e => this.handleProformasPageClick(e));
            this.elements.reportDisplayArea.addEventListener('click', e => this.handleReportDownloadClick(e));
            document.getElementById('cashflow-search').addEventListener('input', () => this.renderTransactions());
            document.getElementById('proformas-search').addEventListener('input', () => this.renderDocuments());
            document.getElementById('facturas-search').addEventListener('input', () => this.renderFacturas());
            this.elements.facturasTableBody.addEventListener('click', e => this.handleFacturasTableClick(e));
            
            this.elements.aeatConfigForm.addEventListener('submit', e => this.handleSaveAeatConfig(e));
            this.elements.fiscalParamsForm.addEventListener('submit', e => this.handleSaveFiscalParams(e));
            document.getElementById('factura-currency').addEventListener('change', () => this.calculateFacturaTotals());
            document.getElementById('factura-operation-type').addEventListener('change', () => this.handleOperationTypeChange());
            this.elements.nuevaFacturaForm.addEventListener('submit', e => this.handleGenerateInvoice(e));
            this.elements.facturaAddItemBtn.addEventListener('click', () => this.addFacturaItem());
            this.elements.facturaItemsContainer.addEventListener('input', e => this.calculateFacturaTotals(e));
            this.elements.facturaItemsContainer.addEventListener('click', e => {
                if (e.target.closest('.factura-remove-item-btn')) {
                    e.target.closest('.factura-item-row').remove();
                    this.calculateFacturaTotals();
                }
            });
            document.getElementById('facturacion-tab-crear').addEventListener('click', () => this.switchFacturacionTab('crear'));
            document.getElementById('facturacion-tab-listado').addEventListener('click', () => this.switchFacturacionTab('listado'));
            document.getElementById('facturacion-tab-config').addEventListener('click', () => this.switchFacturacionTab('config'));

            // Listeners para el visor de facturas
            this.elements.closeInvoiceViewerBtn.addEventListener('click', () => this.hideInvoiceViewer());
            this.elements.printInvoiceBtn.addEventListener('click', () => this.printInvoice());
            this.elements.pdfInvoiceBtn.addEventListener('click', () => this.downloadInvoiceAsPDF());
            this.elements.invoiceViewerModal.addEventListener('click', (e) => {
                if (e.target === this.elements.invoiceViewerModal) {
                    this.hideInvoiceViewer();
                }
            });
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

                    // Iniciar con un estado por defecto para garantizar que todas las claves existan.
                    const newState = { ...defaultState };

                    // 1. Fusionar de forma segura las propiedades que deben ser arrays.
                    ['accounts', 'transactions', 'documents', 'incomeCategories', 'expenseCategories', 'invoiceOperationTypes'].forEach(key => {
                        // Usar los datos guardados solo si son un array válido, si no, mantener el array por defecto.
                        if (Array.isArray(parsedData[key])) {
                            newState[key] = parsedData[key];
                        }
                    });
                    // 2. Fusionar de forma segura las propiedades que deben ser objetos.
                    ['archivedData'].forEach(key => {
                        if (typeof parsedData[key] === 'object' && parsedData[key] !== null && !Array.isArray(parsedData[key])) {
                            newState[key] = parsedData[key];
                        }
                    });
                    // 3. Lógica de migración específica para Módulos (conserva activaciones del usuario).
                    const savedModules = new Map((parsedData.modules || []).map(m => [m.id, m]));
                    newState.modules = defaultState.modules.map(defaultModule => ({
                        ...defaultModule,
                        active: savedModules.has(defaultModule.id) ? savedModules.get(defaultModule.id).active : defaultModule.active
                    }));

                    // 4. Lógica de migración específica y segura para Ajustes.
                    const loadedSettings = parsedData.settings || {};
                    newState.settings = {
                        ...defaultState.settings,
                        aeatModuleActive: typeof loadedSettings.aeatModuleActive === 'boolean' ?
                        loadedSettings.aeatModuleActive : defaultState.settings.aeatModuleActive,
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
                    console.error("Error crítico al cargar o fusionar datos. Se restaurará al estado por defecto.", error);
                    this.setDefaultState(); // Como último recurso, si todo falla, empezar de cero.
                }
            } else {
                this.setDefaultState();
            }
        },

        getDefaultState() {
            return {
                accounts: [
                    { id: crypto.randomUUID(), name: 'CAIXA Bank', currency: 'EUR', symbol: '€', balance: 0.00, logoHtml: `<svg viewBox="0 0 80 60" class="w-6 h-6"><path d="M48.4,0L22.8,27.3c-0.3,0.3-0.3,0.8,0,1.1L48.4,56c1,1.1,2.8,0.4,2.8-1.1V36.8c0-1,0.8-1.7,1.7-1.7h11.2c8.8,0,15.9-7.1,15.9-15.9S83.1,2.3,74.3,2.3H64c-1,0-1.7-0.8-1.7-1.7V1.1C62.3,0.1,49.1-0.7,48.4,0z" fill="#0073B7"></path><circle cx="23.3" cy="28" r="5.5" fill="#FFC107"></circle><circle cx="23.3" cy="44.6" r="6.8" fill="#E6532B"></circle></svg>` },
                    { id: crypto.randomUUID(), name: 'Banco WISE', currency: 'USD', symbol: '$', balance: 0.00, logoHtml: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" class="w-6 h-6"><path fill="#a3e635" d="M50.9 64H64L33 20.6L24 34.3l15.1 21.7-10.8-16L18.3 56 33 34.3 43 20.6 11.7 64h13.2L4 39.1l2.8 3.8-6.4 7.6L33 26.3 0 64h12.9L33 36l17.9 28z"></path></svg>` },
                    { id: crypto.randomUUID(), name: 'Caja Chica', currency: 'EUR', symbol: '€', balance: 0.00, logoHtml: `<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzIDIiPjxwYXRoIGZpbGw9IiNDNjBCMUUiIGQ9Ik0wIDBoM3YySDB6Ii8+PHBhdGggZmlsbD0iI0ZGQzQwMCIgZD0iTTAgLjVoM3YxSDB6Ii8+PC9zdmc+" alt="Bandera de España" class="w-6 h-6 rounded-sm border border-gray-600">` },
                    { id: crypto.randomUUID(), name: 'Caja Eu', currency: 'USD', symbol: '$', balance: 0.00, logoHtml: `<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA5MDAgNjAwIj48cGF0aCBmaWxsPSIjMDAzMzk5IiBkPSJNMCAwaDkwMHY2MDBIMHoiLz48ZyBmaWxsPSIjRkZDQzAwIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0NTAgMzAwKSI+PGNpcmNsZSByPSIzMCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCAtMjAwKSIvPjxjaXJjbGUgcj0iMzAiIHRyYW5zZm9ybT0icm90YXRlKDMwKSB0cmFuc2xhdGUoMCAtMjAwKSIvPjxjaXJjbGUgcj0iMzAiIHRyYW5zZm9ybT0icm90YXRlKDkwKSB0cmFuc2xhdGUoMCAtMjAwKSIvPjxjaXJjbGUgcj0iMzAiIHRyYW5zZm9ybT0icm90YXRlKDEyMCkgdHJhbnNsYXRlKDAsIC0yMDApIi8+PGNpcmNsZSByPSIzMCIgdHJhbnNmb3JtPSJyb3RhdGUoMTUwKSB0cmFuc2xhdGUoMCAtMjAwKSIvPjxjaXJjbGUgcj0iMzAiIHRyYW5zZm9ybT0icm90YXRlKDE4MCkgdHJhbnNsYXRlKDAsIC0yMDApIi8+PGNpcmNsZSByPSIzMCIgdHJhbnNmb3JtPSJyb3RhdGUoMjEwKSB0cmFuc2xhdGUoMCAtMjAwKSIvPjxjaXJjbGUgcj0iMzAiIHRyYW5zZm9ybT0icm90YXRlKDI0MCkgdHJhbnNsYXRlKDAsIC0yMDApIi8+PGNpcmNsZSByPSIzMCIgdHJhbnNmb3JtPSJyb3RhdGUoMjcwKSB0cmFuc2xhdGUoMCAtMjAwKSIvPjxjaXJjbGUgcj0iMzAiIHRyYW5zZm9ybT0icm90YXRlKDMwMCkgdHJhbnNsYXRlKDAsIC0yMDApIi8+PGNpcmNsZSByPSIzMCIgdHJhbnNmb3JtPSJyb3RhdGUoMzMwKSB0cmFuc2xhdGUoMCAtMjAwKSIvPjwvZz48L3N2Zz4=" alt="Bandera de la Unión Europea" class="w-6 h-6 rounded-sm border border-gray-600">` },
                    { id: crypto.randomUUID(), name: 'Caja Arg.', currency: 'USD', symbol: '$', balance: 0.00, logoHtml: `<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA5IDYiPjxyZWN0IGZpbGw9IiM3NEFDREYiIHdpZHRoPSI5IiBoZWlnaHQ9IjMiLz48cmVjdCB5PSIzIiBmaWxsPSIjNzRBQ0RGIiB3aWR0aD0iOSIgaGVpZHRoPSIzIi8+PHJlY3QgeT0iMiIgZmlsbD0iI0ZGRiIgd2lkdGg9IjkiIGhlaWdodD0iMiIvPjwvc3ZnPg==" alt="Bandera de Argentina" class="w-6 h-6 rounded-sm border border-gray-600">` },
                    { id: crypto.randomUUID(), name: 'Caja Py', currency: 'USD', symbol: '$', balance: 0.00, logoHtml: `<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMSA2Ij48cGF0aCBmaWxsPSIjRDUyQjFFIiBkPSJNMCAwaDExdjJIMHoiLz48cGF0aCBmaWxsPSIjRkZGIiBkPSJNMCAyaDExdjJIMHoiLz48cGF0aCBmaWxsPSIjMDAzOEE4IiBkPSJNMCA0aDExdjJIMHoiLz48L3N2Zz4=" alt="Bandera de Paraguay" class="w-6 h-6 rounded-sm border border-gray-600">` }
                ],
                transactions: [],
                documents: [],
                incomeCategories: ['Ventas', 'Servicios', 'Otros Ingresos', 'Transferencia', 'Ajuste de Saldo'],
                expenseCategories: ['Operaciones', 'Marketing', 'Salarios', 'Software', 'Impuestos', 'Otros Gastos', 'Inversión', 'Transferencia', 'Comisiones', 'Ajuste de Saldo'],
                invoiceOperationTypes: ['Nacional / Intracomunitaria (UE)', 'Exportación (Fuera de la UE)'],
                modules: [],
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
                    fiscalParameters: { // ✨ NUEVO
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
            
            if (pageId === 'cuentas') setTimeout(() => this.renderBalanceLegendAndChart(), 0);
            if (pageId === 'inicio') setTimeout(() => this.renderInicioCharts(), 50);
            if (pageId === 'facturacion') {
                this.switchFacturacionTab('crear'); // <-- Pestaña por defecto
                this.renderAeatConfig();
                if (this.elements.facturaItemsContainer.childElementCount === 0) {
                    this.addFacturaItem();
                }
                this.handleOperationTypeChange();
            }
        },

        updateAll() {
            this.renderTransactions();
            this.renderAccountsTab();
            this.renderBalanceLegendAndChart();
            this.updateInicioKPIs();
            this.renderInicioCharts();
            this.populateSelects();
            this.renderSettings();
            this.renderDocuments();
            this.renderFacturas();
            this.renderInvestments();
            this.updateModuleVisibility();
            this.renderArchives();
            this.saveData();
        },

        recalculateAllBalances() {
            const initialBalances = new Map();
            this.state.accounts.forEach(acc => {
                const initialTransaction = this.state.transactions.find(t => t.isInitialBalance && t.account === acc.name);
                initialBalances.set(acc.name, initialTransaction ? initialTransaction.amount : 0);
            });
            this.state.accounts.forEach(account => {
                let currentBalance = initialBalances.get(account.name) || 0;
                this.state.transactions
                    .filter(t => t.account === account.name && !t.isInitialBalance)
                    .forEach(t => {
                        currentBalance += (t.type === 'Ingreso' ? t.amount : -t.amount);
                    });
                account.balance = currentBalance;
            });
        },

        renderTransactions() {
            const tbody = this.elements.transactionsTableBody;
            const fragment = document.createDocumentFragment();
            let operationalTransactions = this.state.transactions.filter(t => t.category !== 'Inversión' && !t.isInitialBalance);
            
            const searchTerm = document.getElementById('cashflow-search').value.toLowerCase();
            if (searchTerm) {
                operationalTransactions = operationalTransactions.filter(t => 
                    t.description.toLowerCase().includes(searchTerm) ||
                    t.account.toLowerCase().includes(searchTerm) ||
                    t.category.toLowerCase().includes(searchTerm)
                );
            }
            
            tbody.innerHTML = '';
            if(operationalTransactions.length === 0){
                const row = document.createElement('tr');
                row.innerHTML = `<td colspan="7" class="text-center py-4 text-gray-500">No hay movimientos que coincidan con la búsqueda.</td>`;
                fragment.appendChild(row);
            } else {
                operationalTransactions.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(t => {
                    const row = document.createElement('tr');
                    row.className = 'border-b border-gray-800 hover:bg-gray-800/50 transition-colors';
                    const amountColor = t.type === 'Ingreso' ? 'text-green-400' : 'text-red-400';
                    const sign = t.type === 'Ingreso' ? '+' : '-';

                    row.innerHTML = `
                        <td class="py-3 px-3">${t.date}</td>
                        <td class="py-3 px-3">${this.escapeHTML(t.description)}</td>
                        <td class="py-3 px-3">${this.escapeHTML(t.account)}</td>
                        <td class="py-3 px-3">${this.escapeHTML(t.category)}</td>
                        <td class="py-3 px-3">${this.escapeHTML(t.part)}</td>
                        <td class="py-3 px-3 text-right font-medium ${amountColor}">${sign} ${this.formatCurrency(t.amount, t.currency)}</td>
                        <td class="py-3 px-3">
                            <div class="flex items-center justify-center gap-2">
                                <button class="edit-btn p-2 text-blue-400 hover:text-blue-300" data-id="${t.id}" title="Editar">
                                    <i data-lucide="edit" class="w-4 h-4"></i>
                                </button>
                                <button class="delete-btn p-2 text-red-400 hover:text-red-300" data-id="${t.id}" title="Eliminar">
                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                </button>
                            </div>
                        </td>`;
                    fragment.appendChild(row);
                });
            }
            tbody.appendChild(fragment);
            lucide.createIcons();
        },

        renderAccountsTab() {
            const accountsGrid = document.getElementById('accounts-grid');
            const fragment = document.createDocumentFragment();
            this.state.accounts.forEach(account => {
                const card = document.createElement('div');
                card.className = 'card p-6 rounded-xl flex flex-col';
                
                const headerDiv = document.createElement('div');
                headerDiv.className = 'flex justify-between items-start mb-2';
                
                const nameH3 = document.createElement('h3');
                nameH3.className = 'font-semibold text-lg';
                nameH3.textContent = account.name;
                
                const iconWrapper = document.createElement('div');
                iconWrapper.innerHTML = account.logoHtml ? account.logoHtml : `<i data-lucide="wallet" class="text-gray-500"></i>`;
                
                headerDiv.appendChild(nameH3);
                headerDiv.appendChild(iconWrapper);

                const bodyDiv = document.createElement('div');
                bodyDiv.className = 'mt-auto';
                
                const labelP = document.createElement('p');
                labelP.className = 'text-gray-400 text-sm';
                labelP.textContent = 'Saldo Actual';
                
                const balanceP = document.createElement('p');
                balanceP.className = 'text-4xl font-bold kpi-value mt-2';
                balanceP.textContent = this.formatCurrency(account.balance, account.currency);

                bodyDiv.appendChild(labelP);
                bodyDiv.appendChild(balanceP);

                card.appendChild(headerDiv);
                card.appendChild(bodyDiv);
                fragment.appendChild(card);
            });
            accountsGrid.innerHTML = '';
            accountsGrid.appendChild(fragment);
            lucide.createIcons();
        },

        renderBalanceLegendAndChart() {
            const totalsContainer = document.getElementById('balance-totals');
            const accounts = this.state.accounts;
            
            const totalEUR = accounts.filter(a => a.currency === 'EUR').reduce((sum, a) => sum + a.balance, 0);
            const totalUSD = accounts.filter(a => a.currency === 'USD').reduce((sum, a) => sum + a.balance, 0);
            totalsContainer.innerHTML = `
                <div><p class="text-gray-400 text-sm">Saldo Total en Euros</p><p class="text-2xl font-bold text-white">${this.formatCurrency(totalEUR, 'EUR')}</p></div>
                <div><p class="text-gray-400 text-sm">Saldo Total en Dólares</p><p class="text-2xl font-bold text-white">${this.formatCurrency(totalUSD, 'USD')}</p></div>
            `;
            this.renderSingleCurrencyChart('EUR', totalEUR, 'accountsBalanceChartEUR', 'balance-legend-eur', 'eur-chart-container');
            this.renderSingleCurrencyChart('USD', totalUSD, 'accountsBalanceChartUSD', 'balance-legend-usd', 'usd-chart-container');
        },

        renderSingleCurrencyChart(currency, totalBalance, canvasId, legendId, containerId) {
            const container = document.getElementById(containerId);
            const accounts = this.state.accounts.filter(a => a.currency === currency && a.balance > 0);
            if (accounts.length === 0) {
                container.classList.add('hidden');
                return;
            }
            container.classList.remove('hidden');
            const legendContainer = document.getElementById(legendId);
            const chartCtx = document.getElementById(canvasId)?.getContext('2d');
            if (!legendContainer || !chartCtx) return;
            
            const chartInstanceName = canvasId;
            if (this.charts[chartInstanceName]) {
                this.charts[chartInstanceName].destroy();
            }

            const colorPairs = [ ['#FFC3A0', '#FF7A85'], ['#D4A5A5', '#A5D4D4'], ['#CDB4DB', '#FFC8DD'], ['#A2D2FF', '#BDE0FE'], ['#FBC2EB', '#A6C1EE'], ['#FDDB6D', '#F1C40F'] ];
            const backgroundColors = [];
            
            accounts.forEach((account, index) => {
                backgroundColors.push(colorPairs[index % colorPairs.length][0]);
            });
            legendContainer.innerHTML = accounts.map((account, index) => {
                const percentage = totalBalance > 0 ? ((account.balance / totalBalance) * 100).toFixed(1) : 0;
                return `
                    <div class="flex items-center justify-between py-2 text-sm border-b border-gray-800 last:border-b-0">
                        <div class="flex items-center gap-3">
                            <span class="w-3 h-3 rounded-full" style="background-color: ${backgroundColors[index]};"></span>
                            <span>${this.escapeHTML(account.name)}</span>
                        </div>
                        <div class="text-right">
                            <span class="font-semibold">${percentage}%</span>
                            <span class="text-xs text-gray-400 block">${this.formatCurrency(account.balance, account.currency)}</span>
                        </div>
                    </div>`;
            }).join('');
            this.charts[chartInstanceName] = new Chart(chartCtx, { 
                type: 'doughnut', 
                data: { 
                    labels: accounts.map(a => a.name), 
                    datasets: [{ 
                        data: accounts.map(a => a.balance), 
                        backgroundColor: backgroundColors,
                        borderColor: '#0a0a0a', borderWidth: 5, borderRadius: 10,
                    }] 
                }, 
                options: { 
                    responsive: true, maintainAspectRatio: false, cutout: '65%',
                    plugins: { legend: { display: false } }
                } 
            });
        },

        updateInicioKPIs() {
            const totalEUR = this.state.accounts.filter(a => a.currency === 'EUR').reduce((s, a) => s + a.balance, 0);
            const totalUSD = this.state.accounts.filter(a => a.currency === 'USD').reduce((s, a) => s + a.balance, 0);
            document.getElementById('total-eur').textContent = this.formatCurrency(totalEUR, 'EUR');
            document.getElementById('total-usd').textContent = this.formatCurrency(totalUSD, 'USD');
        },
        
        renderInicioCharts() {
            const annualCtx = document.getElementById('annualFlowChart')?.getContext('2d');
            if (!annualCtx) return;

            if (this.charts.annualFlowChart) this.charts.annualFlowChart.destroy();
            
            const selectedCurrency = document.getElementById('inicio-chart-currency').value;
            const currencySymbol = selectedCurrency === 'EUR' ? '€' : '$';
            const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
            const currentYear = new Date().getFullYear();
            const incomeData = Array(12).fill(0);
            const expenseData = Array(12).fill(0);

            this.state.transactions
                .filter(t => t.currency === selectedCurrency)
                .forEach(t => {
                    const tDate = new Date(t.date);
                    if (tDate.getFullYear() === currentYear) {
                        const month = tDate.getMonth();
                        if (t.type === 'Ingreso') incomeData[month] += t.amount;
                        else if (t.type === 'Egreso') expenseData[month] += t.amount;
                    }
                });
            const incomeGradient = annualCtx.createLinearGradient(0, 0, 0, 320);
            incomeGradient.addColorStop(0, 'rgba(59, 130, 246, 0.5)');
            incomeGradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
            const expenseGradient = annualCtx.createLinearGradient(0, 0, 0, 320);
            expenseGradient.addColorStop(0, 'rgba(239, 68, 68, 0.5)');
            expenseGradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
            this.charts.annualFlowChart = new Chart(annualCtx, {
                type: 'line',
                data: {
                    labels: months,
                    datasets: [
                        { label: `Ingresos (${currencySymbol})`, data: incomeData, borderColor: 'rgba(59, 130, 246, 1)', backgroundColor: incomeGradient, fill: true, tension: 0.4 },
                        { label: `Egresos (${currencySymbol})`, data: expenseData, borderColor: 'rgba(239, 68, 68, 1)', backgroundColor: expenseGradient, fill: true, tension: 0.4 }
                    ]
                },
                options: { 
                    responsive: true, maintainAspectRatio: false, 
                    scales: { 
                        y: { 
                            beginAtZero: true,
                            ticks: { callback: value => currencySymbol + value.toLocaleString(selectedCurrency === 'EUR' ? 'de-DE' : 'en-US') }
                        } 
                    },
                    plugins: { legend: { position: 'bottom' } }
                }
            });
        },

        populateSelects() {
            const accounts = this.state.accounts;
            const optionsHtml = accounts.map(acc => `<option value="${this.escapeHTML(acc.name)}">${this.escapeHTML(acc.name)}</option>`).join('');
            
            const selects = ['transaction-account', 'transfer-from', 'transfer-to', 'update-account-select'];
            selects.forEach(id => {
                const select = document.getElementById(id);
                if (select) select.innerHTML = optionsHtml;
            });
            this.populateCategories();
            this.populateOperationTypesSelect();
            this.updateCurrencySymbol();
            this.updateTransferFormUI();
            this.populateReportAccounts();
        },

        populateCategories() {
            const typeSelect = document.getElementById('transaction-type');
            const categorySelect = document.getElementById('transaction-category');
            const currentType = typeSelect.value;
            const categories = currentType === 'Ingreso' ? this.state.incomeCategories : this.state.expenseCategories;
            categorySelect.innerHTML = categories.map(cat => `<option value="${this.escapeHTML(cat)}">${this.escapeHTML(cat)}</option>`).join('');
        },

        populateOperationTypesSelect() {
            const operationTypeSelect = this.elements.facturaOperationType;
            const types = this.state.invoiceOperationTypes;
            operationTypeSelect.innerHTML = types.map(type => `<option value="${this.escapeHTML(type)}">${this.escapeHTML(type)}</option>`).join('');
        },

        updateCurrencySymbol() {
            const accountSelect = document.getElementById('transaction-account');
            if (!accountSelect.value) return;
            const account = this.state.accounts.find(acc => acc.name === accountSelect.value);
            if (account) {
                document.getElementById('amount-currency-symbol').textContent = account.symbol;
            }
        },

        updateTransferFormUI() {
            if(!document.getElementById('transfer-from').value) return;
            const fromAccount = this.state.accounts.find(a => a.name === document.getElementById('transfer-from').value);
            const toAccount = this.state.accounts.find(a => a.name === document.getElementById('transfer-to').value);
            if (!fromAccount || !toAccount) return;

            document.getElementById('transfer-amount-currency-symbol').textContent = fromAccount.symbol;
            document.getElementById('transfer-fee-source-currency-symbol').textContent = fromAccount.symbol;
            document.getElementById('transfer-extra-currency-symbol').textContent = toAccount.symbol;

            const extraFieldLabel = document.getElementById('transfer-extra-label');
            const extraFieldInput = document.getElementById('transfer-extra-field');

            if (fromAccount.currency !== toAccount.currency) {
                extraFieldLabel.textContent = `Monto a Recibir (${toAccount.symbol})`;
                extraFieldInput.placeholder = "950.00";
                extraFieldInput.required = true;
            } else {
                extraFieldLabel.textContent = "Comisión Destino (Opcional)";
                extraFieldInput.placeholder = "1.00";
                extraFieldInput.required = false;
            }
        },

        populateReportAccounts() {
            const reportAccountSelect = document.getElementById('report-account');
            reportAccountSelect.innerHTML = '<option value="all">Todas las Cuentas</option>';
            reportAccountSelect.innerHTML += this.state.accounts.map(acc => `<option value="${this.escapeHTML(acc.name)}">${this.escapeHTML(acc.name)}</option>`).join('');
        },

        renderSettings() {
            const accountsList = this.elements.settingsAccountsList;
            const incomeList = this.elements.incomeCategoriesList;
            const expenseList = this.elements.expenseCategoriesList;
            
            const operationTypesList = this.elements.operationTypesList;

            const accountFragment = document.createDocumentFragment();
            this.state.accounts.forEach(acc => {
                const div = document.createElement('div');
                div.className = "flex items-center justify-between bg-gray-800/50 p-2 rounded";
                div.innerHTML = `
                    <div class="flex items-center gap-2 text-sm">${acc.logoHtml || ''}<span>${this.escapeHTML(acc.name)}</span></div>
                    <button class="delete-account-btn p-1 text-red-400 hover:text-red-300" data-name="${this.escapeHTML(acc.name)}"><i data-lucide="trash-2" class="w-4 h-4"></i></button>`;
                accountFragment.appendChild(div);
            });
            accountsList.innerHTML = '';
            accountsList.appendChild(accountFragment);

            const renderCategoryList = (categories, essentialCategories) => {
                const fragment = document.createDocumentFragment();
                categories.forEach(cat => {
                    const div = document.createElement('div');
                    div.className = "flex items-center justify-between bg-gray-800/50 p-2 rounded text-sm";
                    const isEssential = essentialCategories.includes(cat);
                    const deleteButtonHtml = isEssential 
                        ? `<span class="p-1 text-gray-600 cursor-not-allowed" title="Categoría esencial no se puede eliminar"><i data-lucide="lock" class="w-4 h-4"></i></span>`
                        : `<button class="delete-category-btn p-1 text-red-400 hover:text-red-300" data-name="${this.escapeHTML(cat)}"><i data-lucide="trash-2" class="w-4 h-4"></i></button>`;
                    div.innerHTML = `<span>${this.escapeHTML(cat)}</span> ${deleteButtonHtml}`;
                    fragment.appendChild(div);
                });
                return fragment;
            };
            incomeList.innerHTML = '';
            incomeList.appendChild(renderCategoryList(this.state.incomeCategories, ['Transferencia', 'Comisiones', 'Ajuste de Saldo', 'Inversión', 'Otros Ingresos']));
            expenseList.innerHTML = '';
            expenseList.appendChild(renderCategoryList(this.state.expenseCategories, ['Transferencia', 'Comisiones', 'Ajuste de Saldo', 'Inversión', 'Otros Gastos']));

            operationTypesList.innerHTML = '';
            operationTypesList.appendChild(renderCategoryList(this.state.invoiceOperationTypes, ['Nacional / Intracomunitaria (UE)', 'Exportación (Fuera de la UE)']));

            
            this.renderAeatSettings();
            this.renderFiscalParams();

            lucide.createIcons();
        },

        renderAeatSettings() {
            const facturacionModule = this.state.modules.find(m => m.id === 'facturacion');
            this.elements.aeatSettingsCard.classList.toggle('hidden', !facturacionModule || !facturacionModule.active);

            const container = this.elements.aeatToggleContainer;
            const isActive = this.state.settings.aeatModuleActive;
            const buttonHtml = isActive
                ?
                `<button class="aeat-toggle-btn bg-blue-600 text-white font-bold py-2 px-3 rounded-lg shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-colors text-xs flex items-center justify-center gap-1">
                        <i data-lucide="check-circle" class="w-4 h-4"></i> Activado
                    </button>`
                : `<button class="aeat-toggle-btn border border-blue-800 text-blue-400 font-bold py-2 px-3 rounded-lg hover:bg-blue-800/20 hover:text-blue-300 transition-colors text-xs">
                        Activar
                    </button>`;
            container.innerHTML = buttonHtml;
            lucide.createIcons();
        },

        renderDocuments() {
            const proformasTbody = this.elements.proformasTableBody;
            const proformasData = this.state.documents.filter(d => d.type === 'Proforma');
            const proformaSearchTerm = this.elements.pageProformas.querySelector('#proformas-search').value.toLowerCase();
            let filteredProformas = proformasData;
            if (proformaSearchTerm) {
                filteredProformas = proformasData.filter(d =>
                    d.number.toLowerCase().includes(proformaSearchTerm) ||
                    d.client.toLowerCase().includes(proformaSearchTerm)
                );
            }

            proformasTbody.innerHTML = '';
            if (filteredProformas.length === 0) {
                proformasTbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-gray-500">No hay proformas que coincidan.</td></tr>`;
            } else {
                const proformaFragment = document.createDocumentFragment();
                filteredProformas.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(p => {
                    const row = document.createElement('tr');
                    row.className = "border-b border-gray-800 hover:bg-gray-800/50";
                    
                    const statusClass = p.status === 'Cobrada' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300';
                    row.innerHTML = `
                        <td class="py-3 px-3">${p.date}</td>
                        <td class="py-2 px-3">${this.escapeHTML(p.number)}</td>
                        <td class="py-2 px-3">${this.escapeHTML(p.client)}</td>
                        <td class="py-2 px-3 text-right">${this.formatCurrency(p.amount, p.currency)}</td>
                        <td class="py-2 px-3 text-center">
                            <button class="status-btn text-xs font-semibold px-2 py-1 rounded-full ${statusClass}" data-id="${p.id}">${p.status}</button>
                        </td>
                        <td class="py-2 px-3">
                            <div class="flex items-center justify-center gap-2">
                            <button class="delete-doc-btn p-2 text-red-400 hover:text-red-300" data-id="${p.id}" title="Eliminar">
                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                </button>
                            </div>
                        </td>`;
                    proformaFragment.appendChild(row);
                });
                proformasTbody.appendChild(proformaFragment);
            }
            lucide.createIcons();
        },
        
        renderFacturas() {
            const facturasTbody = this.elements.facturasTableBody;
            const facturasData = this.state.documents.filter(d => d.type === 'Factura');
            const facturaSearchTerm = document.getElementById('facturas-search').value.toLowerCase();
            let filteredFacturas = facturasData;
        
            if (facturaSearchTerm) {
                filteredFacturas = facturasData.filter(d =>
                    d.number.toLowerCase().includes(facturaSearchTerm) ||
                    d.client.toLowerCase().includes(facturaSearchTerm)
                );
            }
        
            facturasTbody.innerHTML = '';
            if (filteredFacturas.length === 0) {
                facturasTbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-gray-500">No hay facturas que coincidan.</td></tr>`;
            } else {
                const facturaFragment = document.createDocumentFragment();
                filteredFacturas.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(f => {
                    const row = document.createElement('tr');
                    row.className = "border-b border-gray-800 hover:bg-gray-800/50";
                    
                    const statusClass = f.status === 'Cobrada' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300';
                    row.innerHTML = `
                        <td class="py-3 px-3">${f.date}</td>
                        <td class="py-2 px-3">${this.escapeHTML(f.number)}</td>
                        <td class="py-2 px-3">${this.escapeHTML(f.client)}</td>
                        <td class="py-2 px-3 text-right">${this.formatCurrency(f.amount, f.currency)}</td>
                        <td class="py-2 px-3 text-center">
                            <button class="status-btn text-xs font-semibold px-2 py-1 rounded-full ${statusClass}" data-id="${f.id}">${f.status}</button>
                        </td>
                        <td class="py-2 px-3">
                            <div class="flex items-center justify-center gap-2">
                                <button class="view-invoice-btn p-2 text-blue-400 hover:text-blue-300" data-id="${f.id}" title="Ver Factura">
                                    <i data-lucide="eye" class="w-4 h-4"></i>
                                </button>
                                <button class="delete-doc-btn p-2 text-red-400 hover:text-red-300" data-id="${f.id}" title="Eliminar">
                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                </button>
                            </div>
                        </td>`;
                    facturaFragment.appendChild(row);
                });
                facturasTbody.appendChild(facturaFragment);
            }
            lucide.createIcons();
        },

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

        showInvoiceViewer(invoiceId) {
            const invoice = this.state.documents.find(doc => doc.id === invoiceId);
            if (!invoice) {
                console.error('Factura no encontrada');
                return;
            }

            const currencySymbol = this.getCurrencySymbol(invoice.currency);
            const ivaRate = invoice.operationType.toLowerCase().includes('exportación') ? 0 : 0.21;

            let itemsHtml = '';
            invoice.items.forEach(item => {
                itemsHtml += `
                    <tr class="border-b border-gray-700">
                        <td class="py-2 px-4">${this.escapeHTML(item.description)}</td>
                        <td class="py-2 px-4 text-right">${item.quantity}</td>
                        <td class="py-2 px-4 text-right">${this.formatCurrency(item.price, invoice.currency)}</td>
                        <td class="py-2 px-4 text-right">${this.formatCurrency(item.quantity * item.price, invoice.currency)}</td>
                    </tr>
                `;
            });

            const invoiceHtml = `
                <div id="invoice-printable-area">
                    <header class="flex justify-between items-start mb-8 p-8">
                        <div>
                            <h1 class="text-3xl font-bold text-white">FACTURA</h1>
                            <p class="text-gray-400">Nº: ${this.escapeHTML(invoice.number)}</p>
                            <p class="text-gray-400">Fecha: ${invoice.date}</p>
                        </div>
                        <div class="text-right">
                            <h2 class="text-xl font-semibold text-blue-300">Tu Empresa/Nombre</h2>
                            <p class="text-gray-400">Tu Dirección</p>
                            <p class="text-gray-400">Tu NIF/CIF</p>
                        </div>
                    </header>
                    <div class="p-8">
                        <div class="mb-8">
                            <h3 class="font-semibold text-gray-300 mb-2">Facturar a:</h3>
                            <p>${this.escapeHTML(invoice.client)}</p>
                            <p>${this.escapeHTML(invoice.nif)}</p>
                        </div>
                        <table class="w-full text-left mb-8">
                            <thead>
                                <tr class="bg-gray-800 text-gray-300">
                                    <th class="py-2 px-4">Concepto</th>
                                    <th class="py-2 px-4 text-right">Cantidad</th>
                                    <th class="py-2 px-4 text-right">Precio Unit.</th>
                                    <th class="py-2 px-4 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsHtml}
                            </tbody>
                        </table>
                        <div class="flex justify-end">
                            <div class="w-full max-w-xs space-y-2">
                                <div class="flex justify-between">
                                    <span class="text-gray-400">Subtotal:</span>
                                    <span>${this.formatCurrency(invoice.subtotal, invoice.currency)}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-400">IVA (${(ivaRate * 100).toFixed(0)}%):</span>
                                    <span>${this.formatCurrency(invoice.iva, invoice.currency)}</span>
                                </div>
                                <div class="flex justify-between font-bold text-xl border-t border-gray-600 pt-2 mt-2">
                                    <span>TOTAL:</span>
                                    <span>${this.formatCurrency(invoice.total, invoice.currency)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            this.elements.invoiceContentArea.innerHTML = invoiceHtml;
            this.elements.invoiceViewerModal.classList.remove('hidden');
            this.elements.invoiceViewerModal.classList.add('flex');
            lucide.createIcons();
        },

        hideInvoiceViewer() {
            this.elements.invoiceViewerModal.classList.add('hidden');
            this.elements.invoiceViewerModal.classList.remove('flex');
            this.elements.invoiceContentArea.innerHTML = '';
        },

        printInvoice() {
            const printContent = this.elements.invoiceContentArea.innerHTML;
            const printWindow = window.open('', '', 'height=800,width=800');
            printWindow.document.write('<html><head><title>Factura</title>');
            // Aquí podrías enlazar un CSS específico para impresión
            printWindow.document.write('<link rel="stylesheet" href="style.css">');
            printWindow.document.write('<style>body { background-color: #111827; color: #d1d5db; } .card { background-color: #1f2937; } @media print { body { background-color: white; color: black; } .text-white { color: black !important; } .text-gray-300 { color: #4b5563 !important; } .text-gray-400 { color: #6b7280 !important; } .bg-gray-800 { background-color: #f3f4f6 !important; } .border-gray-700 { border-color: #d1d5db !important; } }</style>');
            printWindow.document.write('</head><body>');
            printWindow.document.write(printContent);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            setTimeout(() => { // Timeout para asegurar que el contenido se cargue
                printWindow.print();
                printWindow.close();
            }, 250);
        },

        downloadInvoiceAsPDF() {
            const { jsPDF } = window.jspdf;
            const invoiceElement = document.getElementById('invoice-printable-area');
            const doc = new jsPDF({
                orientation: 'p',
                unit: 'pt',
                format: 'a4'
            });

            doc.html(invoiceElement, {
                callback: function (doc) {
                    doc.save('factura.pdf');
                },
                x: 10,
                y: 10,
                width: 575, // A4 width in points is ~595, leave some margin
                windowWidth: invoiceElement.scrollWidth
            });
        },

        handleFacturasTableClick(e) {
            const target = e.target;
            const statusBtn = target.closest('.status-btn');
            const deleteBtn = target.closest('.delete-doc-btn');
            const viewBtn = target.closest('.view-invoice-btn');

            if (statusBtn) {
                const docId = statusBtn.dataset.id;
                this.toggleDocumentStatus(docId);
            } else if (deleteBtn) {
                const docId = deleteBtn.dataset.id;
                this.deleteDocument(docId);
            } else if (viewBtn) {
                const docId = viewBtn.dataset.id;
                this.showInvoiceViewer(docId);
            }
        },

        updateModuleVisibility() {
            // Esta función ya no es necesaria y puede ser eliminada o dejada en blanco.
            // Los enlaces de navegación ahora son siempre visibles.
        },

        renderArchives() {
            const yearSelect = document.getElementById('archive-year-select');
            const displayArea = document.getElementById('archive-display-area');
            const archiveYears = Object.keys(this.state.archivedData);

            if (archiveYears.length === 0) {
                yearSelect.innerHTML = '<option>No hay archivos</option>';
                displayArea.innerHTML = `<div class="text-center text-gray-500 py-10"><i data-lucide="archive" class="w-16 h-16 mx-auto mb-4"></i><p>Aún no se ha realizado ningún cierre anual.</p></div>`;
                lucide.createIcons();
                return;
            }

            yearSelect.innerHTML = archiveYears.map(year => `<option value="${year}">${year}</option>`).join('');
        },

        bindEventListeners() {
            document.getElementById('sidebar-toggle').addEventListener('click', () => this.toggleSidebar());
            this.elements.navLinks.forEach(link => link.addEventListener('click', e => { e.preventDefault(); this.switchPage(link.id.split('-')[1]); }));
            
            this.elements.transactionForm.addEventListener('submit', e => this.handleTransactionFormSubmit(e));
            this.elements.transferForm.addEventListener('submit', e => this.handleTransferFormSubmit(e));
            this.elements.proformaForm.addEventListener('submit', e => this.handleProformaFormSubmit(e));
            this.elements.addAccountForm.addEventListener('submit', e => this.handleAddAccount(e));
            this.elements.updateBalanceForm.addEventListener('submit', e => this.handleUpdateBalance(e));
            this.elements.reportForm.addEventListener('submit', e => this.handleReportGeneration(e));
            this.elements.addIncomeCategoryForm.addEventListener('submit', e => this.handleAddCategory(e, 'income'));
            this.elements.addExpenseCategoryForm.addEventListener('submit', e => this.handleAddCategory(e, 'expense'));
            this.elements.addOperationTypeForm.addEventListener('submit', e => this.handleAddOperationType(e));
            
            document.getElementById('form-cancel-button').addEventListener('click', () => this.resetTransactionForm());
            document.getElementById('close-year-btn').addEventListener('click', () => this.handleCloseYear());
            document.getElementById('view-archive-btn').addEventListener('click', () => this.handleViewArchive());

            document.getElementById('transaction-type').addEventListener('change', () => this.populateCategories());
            document.getElementById('transaction-account').addEventListener('change', () => this.updateCurrencySymbol());
            document.getElementById('transfer-from').addEventListener('change', () => this.updateTransferFormUI());
            document.getElementById('transfer-to').addEventListener('change', () => this.updateTransferFormUI());
            document.getElementById('report-period').addEventListener('change', () => this.updateDateInputForReports());
            document.getElementById('inicio-chart-currency').addEventListener('change', () => this.renderInicioCharts());
            document.getElementById('report-type').addEventListener('change', () => this.toggleReportFilters());

            this.elements.transactionsTableBody.addEventListener('click', e => this.handleTransactionsTableClick(e));
            this.elements.settingsAccountsList.addEventListener('click', e => this.handleSettingsAccountsListClick(e));
            this.elements.incomeCategoriesList.addEventListener('click', e => this.handleCategoryDeleteClick(e, 'income'));
            this.elements.expenseCategoriesList.addEventListener('click', e => this.handleCategoryDeleteClick(e, 'expense'));
            this.elements.operationTypesList.addEventListener('click', e => this.handleCategoryDeleteClick(e, 'operationType'));
            
            this.elements.aeatSettingsCard.addEventListener('click', e => this.handleAeatModuleToggleClick(e));
            this.elements.pageProformas.addEventListener('click', e => this.handleProformasPageClick(e));
            this.elements.reportDisplayArea.addEventListener('click', e => this.handleReportDownloadClick(e));
            document.getElementById('cashflow-search').addEventListener('input', () => this.renderTransactions());
            document.getElementById('proformas-search').addEventListener('input', () => this.renderDocuments());
            document.getElementById('facturas-search').addEventListener('input', () => this.renderFacturas());
            this.elements.facturasTableBody.addEventListener('click', e => this.handleFacturasTableClick(e));
            
            this.elements.aeatConfigForm.addEventListener('submit', e => this.handleSaveAeatConfig(e));
            this.elements.fiscalParamsForm.addEventListener('submit', e => this.handleSaveFiscalParams(e));
            document.getElementById('factura-currency').addEventListener('change', () => this.calculateFacturaTotals());
            document.getElementById('factura-operation-type').addEventListener('change', () => this.handleOperationTypeChange());
            this.elements.nuevaFacturaForm.addEventListener('submit', e => this.handleGenerateInvoice(e));
            this.elements.facturaAddItemBtn.addEventListener('click', () => this.addFacturaItem());
            this.elements.facturaItemsContainer.addEventListener('input', e => this.calculateFacturaTotals(e));
            this.elements.facturaItemsContainer.addEventListener('click', e => {
                if (e.target.closest('.factura-remove-item-btn')) {
                    e.target.closest('.factura-item-row').remove();
                    this.calculateFacturaTotals();
                }
            });
            document.getElementById('facturacion-tab-crear').addEventListener('click', () => this.switchFacturacionTab('crear'));
            document.getElementById('facturacion-tab-listado').addEventListener('click', () => this.switchFacturacionTab('listado'));
            document.getElementById('facturacion-tab-config').addEventListener('click', () => this.switchFacturacionTab('config'));

            // Listeners para el visor de facturas
            this.elements.closeInvoiceViewerBtn.addEventListener('click', () => this.hideInvoiceViewer());
            this.elements.printInvoiceBtn.addEventListener('click', () => this.printInvoice());
            this.elements.pdfInvoiceBtn.addEventListener('click', () => this.downloadInvoiceAsPDF());
            this.elements.invoiceViewerModal.addEventListener('click', (e) => {
                if (e.target === this.elements.invoiceViewerModal) {
                    this.hideInvoiceViewer();
                }
            });
        },

        handleTransactionFormSubmit(e) {
            e.preventDefault();
            const id = document.getElementById('transaction-id').value;
            const accountName = document.getElementById('transaction-account').value;
            const account = this.state.accounts.find(acc => acc.name === accountName);
            const amount = parseFloat(document.getElementById('transaction-amount').value);
            if (isNaN(amount) || amount <= 0) {
                this.showAlertModal('Monto Inválido', 'Por favor, introduce un monto válido y mayor que cero.');
                return;
            }
            
            const transactionData = {
                date: document.getElementById('transaction-date').value,
                description: document.getElementById('transaction-description').value,
                type: document.getElementById('transaction-type').value,
                part: document.getElementById('transaction-part').value,
                account: accountName,
                category: document.getElementById('transaction-category').value,
                currency: account.currency,
                amount: amount,
            };
            if (id) {
                const index = this.state.transactions.findIndex(t => t.id == id);
                if (index !== -1) {
                    const oldTransaction = { ...this.state.transactions[index] };
                    const oldAccount = this.state.accounts.find(acc => acc.name === oldTransaction.account);
                    if (oldAccount) {
                        const amountToRevert = oldTransaction.type === 'Ingreso' ?
                        -oldTransaction.amount : oldTransaction.amount;
                        oldAccount.balance += amountToRevert;
                    }
                    const newAccount = this.state.accounts.find(acc => acc.name === transactionData.account);
                    if (newAccount) {
                        const amountToAdd = transactionData.type === 'Ingreso' ?
                        transactionData.amount : -transactionData.amount;
                        newAccount.balance += amountToAdd;
                    }
                    this.state.transactions[index] = { ...this.state.transactions[index], ...transactionData };
                }
            } else {
                transactionData.id = crypto.randomUUID();
                this.state.transactions.push(transactionData);
                if (account && !transactionData.isInitialBalance) {
                    const amountToAdd = transactionData.type === 'Ingreso' ?
                    transactionData.amount : -transactionData.amount;
                    account.balance += amountToAdd;
                }
            }
            
            this.resetTransactionForm();
            this.updateAll();
        },

        handleTransferFormSubmit(e) {
            e.preventDefault();
            const date = document.getElementById('transfer-date').value;
            const fromAccount = this.state.accounts.find(a => a.name === document.getElementById('transfer-from').value);
            const toAccount = this.state.accounts.find(a => a.name === document.getElementById('transfer-to').value);
            const amount = parseFloat(document.getElementById('transfer-amount').value);
            const feeSource = parseFloat(document.getElementById('transfer-fee-source').value) || 0;
            if (isNaN(amount) || amount <= 0) {
                this.showAlertModal('Monto Inválido', 'Por favor, introduce un monto a enviar válido y mayor que cero.');
                return;
            }
            if (isNaN(feeSource) || feeSource < 0) {
                this.showAlertModal('Dato Inválido', 'La comisión de origen debe ser un número válido.');
                return;
            }

            const egresoTrans = { id: crypto.randomUUID(), date, description: `Transferencia a ${toAccount.name}`, type: 'Egreso', account: fromAccount.name, category: 'Transferencia', currency: fromAccount.currency, amount, part: 'A' };
            this.state.transactions.push(egresoTrans);
            fromAccount.balance -= amount;

            if (feeSource > 0) {
                const feeTrans = { id: crypto.randomUUID(), date, description: `Comisión de transferencia`, type: 'Egreso', account: fromAccount.name, category: 'Comisiones', currency: fromAccount.currency, amount: feeSource, part: 'A' };
                this.state.transactions.push(feeTrans);
                fromAccount.balance -= feeSource;
            }

            if (fromAccount.currency !== toAccount.currency) {
                const amountReceived = parseFloat(document.getElementById('transfer-extra-field').value);
                if (isNaN(amountReceived) || amountReceived <= 0) {
                    this.showAlertModal('Monto Requerido', 'Debe especificar un monto recibido válido y mayor que cero para transferencias entre distintas monedas.');
                    return;
                }
                const ingresoTrans = { id: crypto.randomUUID(), date, description: `Transferencia de ${fromAccount.name}`, type: 'Ingreso', account: toAccount.name, category: 'Transferencia', currency: toAccount.currency, amount: amountReceived, part: 'A' };
                this.state.transactions.push(ingresoTrans);
                toAccount.balance += amountReceived;

            } else {
                const feeDestination = parseFloat(document.getElementById('transfer-extra-field').value) ||
                0;
                if (isNaN(feeDestination) || feeDestination < 0) {
                    this.showAlertModal('Dato Inválido', 'La comisión de destino debe ser un número válido.');
                    return;
                }
                const ingresoTrans = { id: crypto.randomUUID(), date, description: `Transferencia de ${fromAccount.name}`, type: 'Ingreso', account: toAccount.name, category: 'Transferencia', currency: toAccount.currency, amount, part: 'A' };
                this.state.transactions.push(ingresoTrans);
                toAccount.balance += amount;

                if (feeDestination > 0) {
                    const feeDestTrans = { id: crypto.randomUUID(), date, description: `Comisión de transferencia`, type: 'Egreso', account: toAccount.name, category: 'Comisiones', currency: toAccount.currency, amount: feeDestination, part: 'A' };
                    this.state.transactions.push(feeDestTrans);
                    toAccount.balance -= feeDestination;
                }
            }
            
            this.elements.transferForm.reset();
            this.setDateDefaults();
            this.updateAll();
        },

        handleProformaFormSubmit(e) {
            e.preventDefault();
            const amount = parseFloat(document.getElementById('proforma-amount').value);
            if (isNaN(amount) || amount <= 0) {
                this.showAlertModal('Monto Inválido', 'Por favor, introduce un monto válido y mayor que cero para el documento.');
                return;
            }

            this.state.documents.push({
                id: crypto.randomUUID(),
                type: 'Proforma',
                date: document.getElementById('proforma-date').value,
                number: document.getElementById('proforma-number').value,
                client: document.getElementById('proforma-client').value,
                amount: amount,
                currency: document.getElementById('proforma-currency').value,
                status: 'Adeudada'
            });
            this.elements.proformaForm.reset();
            this.setDateDefaults();
            this.updateAll();
        },

        handleAddAccount(e) {
            e.preventDefault();
            const name = document.getElementById('new-account-name').value;
            const balance = parseFloat(document.getElementById('new-account-balance').value);

            if (isNaN(balance)) {
                this.showAlertModal('Dato Inválido', 'Por favor, introduce un saldo inicial válido.');
                return;
            }

            if (this.state.accounts.some(acc => acc.name === name)) {
                this.showAlertModal('Cuenta Duplicada', 'Ya existe una cuenta con este nombre.');
                return;
            }
            
            const newAccount = {
                id: crypto.randomUUID(),
                name,
                currency: document.getElementById('new-account-currency').value,
                symbol: document.getElementById('new-account-currency').value === 'USD' ?
                '$' : '€',
                balance: balance,
                logoHtml: document.getElementById('new-account-logo').value
            };
            this.state.accounts.push(newAccount);
            
            if (balance !== 0) {
                 this.state.transactions.push({
                    id: crypto.randomUUID(),
                    date: new Date().toISOString().split('T')[0],
                    description: `Saldo Inicial para ${name}`,
                    type: balance > 0 ? 'Ingreso' : 'Egreso',
                    account: name,
                    category: 'Ajuste de Saldo',
                    currency: newAccount.currency,
                    amount: Math.abs(balance),
                    part: 'A',
                    isInitialBalance: true
                 });
            }

            this.elements.addAccountForm.reset();
            this.updateAll();
        },

        handleUpdateBalance(e) {
            e.preventDefault();
            const accountName = document.getElementById('update-account-select').value;
            const newBalance = parseFloat(document.getElementById('new-balance-amount').value);
            const account = this.state.accounts.find(acc => acc.name === accountName);
            if (isNaN(newBalance) || newBalance < 0) {
                this.showAlertModal('Dato Inválido', 'Por favor, introduce un nuevo saldo válido.');
                return;
            }

            if(account) {
                const currentBalance = account.balance;
                const difference = newBalance - currentBalance;
                
                if (difference !== 0) {
                    this.state.transactions.push({
                        id: crypto.randomUUID(),
                        date: new Date().toISOString().split('T')[0],
                        description: `Ajuste de Saldo`,
                        type: difference > 0 ? 'Ingreso' : 'Egreso',
                        account: accountName,
                        category: 'Ajuste de Saldo',
                        currency: account.currency,
                        amount: Math.abs(difference),
                        part: 'A'
                    });
                    account.balance += difference;
                }
            }
            this.elements.updateBalanceForm.reset();
            this.updateAll();
        },

        handleReportGeneration(e) {
            e.preventDefault();
            const type = document.getElementById('report-type').value;

            if (type === 'sociedades') {
                const year = document.getElementById('report-year-sociedades').value;
                const period = document.getElementById('report-periodo-sociedades').value;
                this.generateSociedadesReport(year, period);
            } else {
                const period = document.getElementById('report-period').value;
                const account = document.getElementById('report-account').value;
                const part = document.getElementById('report-part').value;

                let startDate, endDate;
                switch (period) {
                    case 'daily':
                        const dateVal = document.getElementById('report-date').value;
                        startDate = new Date(dateVal);
                        endDate = new Date(dateVal);
                        startDate.setUTCHours(0, 0, 0, 0);
                        endDate.setUTCHours(23, 59, 59, 999);
                        break;
                    case 'weekly':
                        const weekVal = document.getElementById('report-week').value;
                        if (!weekVal) return;
                        const [yearW, weekW] = weekVal.split('-W');
                        const simple = new Date(Date.UTC(yearW, 0, 1 + (weekW - 1) * 7));
                        const dow = simple.getUTCDay();
                        const ISOweekStart = simple;
        
        handleReportDownloadClick(e) {
            const downloadBtn = e.target.closest('#report-download-btn');
            if (downloadBtn) {
                document.getElementById('report-download-options').classList.toggle('show');
                return;
            }

            const formatBtn = e.target.closest('.dropdown-content button');
            if (formatBtn && formatBtn.dataset.format) {
                const format = formatBtn.dataset.format;
                const report = this.state.activeReport;
                if (!report || (Array.isArray(report.data) && report.data.length === 0) || (report.data.transactions && report.data.transactions.length === 0)) {
                    this.showAlertModal('Sin Datos', "No hay datos para exportar.");
                    return;
                }

                const title = `Reporte de ${report.type}`;
                const headersMap = {
                    movimientos: ["Fecha", "Descripción", "Cuenta", "Categoría", "Tipo", "Monto", "Moneda", "Parte"],
                    documentos: ["Fecha", "Número", "Cliente", "Monto", "Moneda", "Estado"],
                    inversiones: ["Fecha", "Descripción", "Cuenta Origen", "Monto", "Moneda"],
                    sociedades: ["Concepto", "Importe"]
                };
                const headers = headersMap[report.type];
                
                let data;
                if (report.type === 'sociedades') {
                    const { transactions } = report.data;
                    const taxRate = this.state.settings.fiscalParameters.corporateTaxRate;
                    let totalIngresos = 0, totalEgresos = 0;
                    transactions.forEach(t => {
                        if (t.type === 'Ingreso') totalIngresos += t.amount; else totalEgresos += t.amount;
                    });
                    const resultadoContable = totalIngresos - totalEgresos;
                    const pagoACuenta = resultadoContable > 0 ? resultadoContable * (taxRate / 100) : 0;
                    data = [
                        ["Total Ingresos Computables", this.formatCurrency(totalIngresos, 'EUR')],
                        ["Total Gastos Deducibles", this.formatCurrency(totalEgresos, 'EUR')],
                        ["Resultado Contable Acumulado", this.formatCurrency(resultadoContable, 'EUR')],
                        [`Pago a cuenta estimado (${taxRate}%)`, this.formatCurrency(pagoACuenta, 'EUR')]
                    ];
                } else {
                    data = report.data.map(item => {
                        if (report.type === 'movimientos') return [item.date, item.description, item.account, item.category, item.type, item.amount, item.currency, item.part];
                        if (report.type === 'documentos') return [item.date, item.number, item.client, item.amount, item.currency, item.status];
                        if (report.type === 'inversiones') return [item.date, item.description, item.account, item.amount, item.currency];
                        return [];
                    });
                }

                if (format === 'xlsx') this.exportToXLSX(headers, data, title);
                else if (format === 'pdf') this.exportToPDF(headers, data, title);
                
                document.getElementById('report-download-options').classList.remove('show');
            }
        },

        exportToXLSX(headers, data, fileName) {
            const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");
            XLSX.writeFile(workbook, `${fileName}.xlsx`);
        },

        exportToPDF(headers, data, title) {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            doc.text(title, 14, 16);
            doc.autoTable({
                head: [headers],
                body: data,
                startY: 20
            });

            doc.save(`${title}.pdf`);
        },

        // ✨ =================================================================
        // ✨ NUEVAS FUNCIONES PARA REPORTE IMP. SOCIEDADES
        // ✨ =================================================================
        populateSociedadesYearFilter() {
            const yearSelect = document.getElementById('report-year-sociedades');
            const currentYear = new Date().getFullYear();
            let yearOptions = '';
            for (let i = 0; i < 5; i++) {
                yearOptions += `<option value="${currentYear - i}">${currentYear - i}</option>`;
            }
            yearSelect.innerHTML = yearOptions;
        },

        generateSociedadesReport(year, period) {
            let startDate, endDate;
            let periodText = '';
            switch (period) {
                case '1P': // Hasta 31 de Marzo
                    startDate = new Date(Date.UTC(year, 0, 1));
                    endDate = new Date(Date.UTC(year, 2, 31, 23, 59, 59, 999));
                    periodText = `1P (01/01/${year} - 31/03/${year})`;
                    break;
                case '2P': // Hasta 30 de Septiembre
                    startDate = new Date(Date.UTC(year, 0, 1));
                    endDate = new Date(Date.UTC(year, 8, 30, 23, 59, 59, 999));
                    periodText = `2P (01/01/${year} - 30/09/${year})`;
                    break;
                case '3P': // Hasta 30 de Noviembre
                    startDate = new Date(Date.UTC(year, 0, 1));
                    endDate = new Date(Date.UTC(year, 10, 30, 23, 59, 59, 999));
                    periodText = `3P (01/01/${year} - 30/11/${year})`;
                    break;
            }

            const fiscalAccounts = ['CAIXA Bank', 'Banco WISE'];
            const filteredTransactions = this.state.transactions.filter(t => {
                const tDate = new Date(t.date);
                return tDate >= startDate && tDate <= endDate &&
                    t.part === 'A' &&
                    fiscalAccounts.includes(t.account) &&
                    t.currency === 'EUR';
            });
            this.state.activeReport = {
                type: 'sociedades',
                data: {
                    transactions: filteredTransactions,
                    year,
                    periodText,
                }
            };
            this.renderSociedadesReport();
        },

        renderSociedadesReport() {
            const displayArea = this.elements.reportDisplayArea;
            const { transactions, year, periodText } = this.state.activeReport.data;
            const title = `Estimación Impuesto Sociedades - Pago ${periodText.split(' ')[0]}`;
            const subtitle = `Período de Cálculo: ${periodText.split(' ')[1].substring(1)}`;

            let totalIngresos = 0;
            let totalEgresos = 0;
            transactions.forEach(t => {
                if (t.type === 'Ingreso') {
                    totalIngresos += t.amount;
                } else {
                    totalEgresos += t.amount;
                }
            });
            const resultadoContable = totalIngresos - totalEgresos;
            const taxRate = this.state.settings.fiscalParameters.corporateTaxRate;
            const pagoACuenta = resultadoContable > 0 ?
            resultadoContable * (taxRate / 100) : 0;

            displayArea.innerHTML = `
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="font-semibold text-lg">${title}</h3>
                        <p class="text-sm text-gray-400">${subtitle}</p>
                    </div>
                    <div class="dropdown">
                        <button id="report-download-btn" class="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-2">
                            <i data-lucide="download" class="w-4 h-4"></i> Descargar
                        </button>
                        <div id="report-download-options" class="dropdown-content">
                            <button data-format="pdf">Exportar como PDF</button>
                            <button data-format="xlsx">Exportar como Excel</button>
                        </div>
                    </div>
                </div>
                <div class="space-y-3 p-4 bg-gray-800/50 rounded-lg">
                     <div class="flex justify-between items-center text-sm">
                        <span class="text-gray-400">Total Ingresos Computables (Parte A):</span>
                        <span class="font-bold text-green-400">${this.formatCurrency(totalIngresos, 'EUR')}</span>
                    </div>
                     <div class="flex justify-between items-center text-sm">
                        <span class="text-gray-400">Total Gastos Deducibles (Parte A):</span>
                        <span class="font-bold text-red-400">${this.formatCurrency(totalEgresos, 'EUR')}</span>
                    </div>
                    <div class="flex justify-between items-center text-lg border-t border-gray-700 pt-3 mt-3">
                        <span class="font-semibold">Resultado Contable Acumulado:</span>
                        <span class="font-bold">${this.formatCurrency(resultadoContable, 'EUR')}</span>
                    </div>
                    <div class="flex justify-between items-center text-sm">
                        <span class="text-gray-400">Tasa de Impuesto Estimada (${taxRate}%):</span>
                        <span class="font-bold">${this.formatCurrency(taxRate, 'EUR')}</span>
                    </div>
                    <div class="flex justify-between items-center text-lg border-t border-gray-700 pt-3 mt-3">
                        <span class="font-semibold">Pago a Cuenta Estimado:</span>
                        <span class="font-bold text-red-400">${this.formatCurrency(pagoACuenta, 'EUR')}</span>
                    </div>
                </div>
            `;
            lucide.createIcons();
        },
    };

    App.init();
});