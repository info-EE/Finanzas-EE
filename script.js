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

        handleFacturasTableClick(e) {
            const target = e.target;
            const statusBtn = target.closest('.status-btn');
            const deleteBtn = target.closest('.delete-doc-btn');

            if (statusBtn) {
                const docId = statusBtn.dataset.id;
                this.toggleDocumentStatus(docId);
            } else if (deleteBtn) {
                const docId = deleteBtn.dataset.id;
                this.deleteDocument(docId);
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
                        if (dow <= 4) ISOweekStart.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1);
                        else ISOweekStart.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay());
                        startDate = new Date(ISOweekStart);
                        endDate = new Date(startDate);
                        endDate.setUTCDate(startDate.getUTCDate() + 6);
                        break;
                    case 'monthly':
                        const monthVal = document.getElementById('report-month').value;
                        const [yearM, monthM] = monthVal.split('-');
                        startDate = new Date(Date.UTC(yearM, monthM - 1, 1));
                        endDate = new Date(Date.UTC(yearM, monthM, 0, 23, 59, 59, 999));
                        break;
                    case 'annual':
                        const yearA = document.getElementById('report-year').value;
                        startDate = new Date(Date.UTC(yearA, 0, 1));
                        endDate = new Date(Date.UTC(yearA, 11, 31, 23, 59, 59, 999));
                        break;
                }
                
                this.state.activeReport.type = type;
                if (type === 'movimientos') {
                    const filteredTransactions = this.state.transactions.filter(t => {
                        const tDate = new Date(t.date);
                        const accountMatch = (account === 'all' || t.account === account);
                        const partMatch = (part === 'all' || t.part === part);
                        return tDate >= startDate && tDate <= endDate && accountMatch && partMatch && !t.isInitialBalance;
                    });
                    this.state.activeReport.data = filteredTransactions;
                    this.renderReport(filteredTransactions, period, startDate, account, part);
                } else if (type === 'documentos') {
                    const filteredDocs = this.state.documents.filter(d => {
                        const dDate = new Date(d.date);
                        return dDate >= startDate && dDate <= endDate;
                    });
                    this.state.activeReport.data = filteredDocs;
                    this.renderDocumentsReport(filteredDocs, period, startDate);
                } else if (type === 'inversiones') {
                    const filteredInvestments = this.state.transactions.filter(t => {
                        const tDate = new Date(t.date);
                        const partMatch = (part === 'all' || t.part === part);
                        return t.category === 'Inversión' && tDate >= startDate && tDate <= endDate && partMatch;
                    });
                    this.state.activeReport.data = filteredInvestments;
                    this.renderInvestmentsReport(filteredInvestments, period, startDate, part);
                }
            }
        },

        handleAddCategory(e, type) {
            e.preventDefault();
            const inputId = `new-${type === 'operationType' ? 'operation-type' : type}-category`;
            const input = document.getElementById(inputId);
            const newCategory = input.value.trim();
            let categoryList;
            if (type === 'income') categoryList = this.state.incomeCategories;
            else if (type === 'expense') categoryList = this.state.expenseCategories;
            else categoryList = this.state.invoiceOperationTypes;
            if (newCategory && !categoryList.includes(newCategory)) {
                categoryList.push(newCategory);
                this.updateAll();
            }
            input.value = '';
        },

        handleAddOperationType(e) {
            this.handleAddCategory(e, 'operationType');
        },

        handleTransactionsTableClick(e) {
            const editButton = e.target.closest('.edit-btn');
            if (editButton) {
                const id = editButton.dataset.id;
                const transaction = this.state.transactions.find(t => t.id == id);
                if (!transaction) return;

                document.getElementById('transaction-id').value = transaction.id;
                document.getElementById('transaction-date').value = transaction.date;
                document.getElementById('transaction-description').value = transaction.description;
                document.getElementById('transaction-type').value = transaction.type;
                this.populateCategories();
                document.getElementById('transaction-part').value = transaction.part;
                document.getElementById('transaction-account').value = transaction.account;
                this.updateCurrencySymbol();
                document.getElementById('transaction-category').value = transaction.category;
                document.getElementById('transaction-amount').value = transaction.amount;
                document.getElementById('form-title').textContent = 'Editar Movimiento';
                document.getElementById('form-submit-button-text').textContent = 'Actualizar';
                document.getElementById('form-cancel-button').classList.remove('hidden');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }

            const deleteButton = e.target.closest('.delete-btn');
            if (deleteButton) {
                this.showConfirmationModal(
                    'Eliminar Movimiento', '¿Estás seguro de que quieres eliminar este movimiento?',
                    () => {
                        const transactionId = deleteButton.dataset.id;
                        const transactionIndex = this.state.transactions.findIndex(t => t.id == transactionId);
                        if (transactionIndex > -1) {
                            const transactionToDelete = this.state.transactions[transactionIndex];
                            const account = this.state.accounts.find(acc => acc.name === transactionToDelete.account);
                            if (account) {
                                const amountToRevert = transactionToDelete.type === 'Ingreso' ? -transactionToDelete.amount : transactionToDelete.amount;
                                account.balance += amountToRevert;
                            }
                            this.state.transactions.splice(transactionIndex, 1);
                        }
                        this.updateAll();
                    }
                );
            }
        },

        handleSettingsAccountsListClick(e) {
            const deleteButton = e.target.closest('.delete-account-btn');
            if (deleteButton) {
                const accountName = deleteButton.dataset.name;
                this.showConfirmationModal(
                    'Eliminar Cuenta', `¿Seguro que quieres eliminar "${accountName}" y todos sus movimientos? Esta acción no se puede deshacer.`,
                    () => {
                        this.state.accounts = this.state.accounts.filter(acc => acc.name !== accountName);
                        this.state.transactions = this.state.transactions.filter(t => t.account !== accountName);
                        this.updateAll();
                    }
                );
            }
        },

        handleCategoryDeleteClick(e, type) {
            const deleteButton = e.target.closest('.delete-category-btn');
            if (deleteButton) {
                const categoryName = deleteButton.dataset.name;
                let title, message, onConfirm;

                if (type === 'operationType') {
                    title = 'Eliminar Tipo de Operación';
                    message = `¿Seguro que quieres eliminar el tipo "${categoryName}"?`;
                    onConfirm = () => {
                        this.state.invoiceOperationTypes = this.state.invoiceOperationTypes.filter(t => t !== categoryName);
                        this.updateAll();
                    };
                } else {
                    title = 'Eliminar Categoría';
                    message = `¿Seguro que quieres eliminar la categoría "${categoryName}"? Las transacciones existentes se moverán a la categoría "Otros".`;
                    onConfirm = () => {
                        const defaultCategory = type === 'income' ?
                        'Otros Ingresos' : 'Otros Gastos';
                        this.state.transactions.forEach(t => {
                            if (t.category === categoryName) t.category = defaultCategory;
                        });
                        if (type === 'income') this.state.incomeCategories = this.state.incomeCategories.filter(cat => cat !== categoryName);
                        else this.state.expenseCategories = this.state.expenseCategories.filter(cat => cat !== categoryName);
                        this.updateAll();
                    };
                }
                
                this.showConfirmationModal(title, message, onConfirm);
            }
        },

        handleModuleToggle(e) {
            // Esta función ya no es necesaria y puede ser eliminada.
        },

        handleProformasPageClick(e) {
            const statusBtn = e.target.closest('.status-btn');
            const deleteBtn = e.target.closest('.delete-doc-btn');

            if (statusBtn) {
                const docId = statusBtn.dataset.id;
                this.toggleDocumentStatus(docId);
            } else if (deleteBtn) {
                const docId = deleteBtn.dataset.id;
                this.deleteDocument(docId);
            }
        },

        handleCloseYear() {
            const startDateStr = document.getElementById('cierre-start-date').value;
            const endDateStr = document.getElementById('cierre-end-date').value;

            if (!startDateStr || !endDateStr) {
                this.showAlertModal('Datos Faltantes', 'Por favor, selecciona una fecha de inicio y de cierre.');
                return;
            }

            const startDate = new Date(startDateStr);
            const endDate = new Date(endDateStr);
            endDate.setUTCHours(23, 59, 59, 999);

            if (startDate >= endDate) {
                this.showAlertModal('Fechas Inválidas', 'La fecha de inicio debe ser anterior a la fecha de cierre.');
                return;
            }
            
            const closingYear = endDate.getUTCFullYear();
            this.showConfirmationModal(
                `Confirmar Cierre Anual ${closingYear}`,
                `Estás a punto de archivar todos los datos desde ${startDateStr} hasta ${endDateStr}. Los saldos se recalcularán para el nuevo período. ¿Estás seguro? Esta acción no se puede deshacer.`,
                () => {
                    const archiveKey = `${closingYear}-${startDateStr.substring(5)}-${endDateStr.substring(5)}`;
                    if (this.state.archivedData[archiveKey]) {
                        this.showAlertModal('Operación Duplicada', `El cierre para este período ya ha sido realizado. No se puede sobrescribir.`);
                        return;
                    }

                    const transactionsToArchive = this.state.transactions.filter(t => {
                        const tDate = new Date(t.date);
                        return tDate >= startDate && tDate <= endDate;
                    });

                    const documentsToArchive = this.state.documents.filter(d => {
                        const dDate = new Date(d.date);
                        return dDate >= startDate && dDate <= endDate;
                    });
                    
                    const newInitialBalances = new Map();
                    this.state.accounts.forEach(account => {
                        const balanceAtEndDate = this.calculateBalanceForAccount(account.name, endDate);
                        newInitialBalances.set(account.name, balanceAtEndDate);
                    });
                    this.state.archivedData[archiveKey] = {
                        startDate: startDateStr,
                        endDate: endDateStr,
                        transactions: transactionsToArchive,
                        documents: documentsToArchive
                    };
                    this.state.transactions = this.state.transactions.filter(t => !transactionsToArchive.includes(t));
                    
                    let nextDay = new Date(endDate);
                    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
                    const nextDayStr = nextDay.toISOString().split('T')[0];
                    newInitialBalances.forEach((balance, accountName) => {
                        const account = this.state.accounts.find(a => a.name === accountName);
                        if (account) {
                            this.state.transactions.push({
                                id: crypto.randomUUID(),
                                date: nextDayStr,
                                description: `Saldo de Cierre Período ${archiveKey}`,
                                type: 'Ingreso',
                                account: accountName,
                                category: 'Ajuste de Saldo',
                                currency: account.currency,
                                amount: balance,
                                part: 'A',
                                isInitialBalance: true
                            });
                        }
                    });
                    this.state.documents = this.state.documents.filter(d => !documentsToArchive.includes(d));

                    this.showAlertModal('Operación Exitosa', `Cierre del período ${archiveKey} completado con éxito.`);
                    
                    this.recalculateAllBalances(); 
                    this.updateAll();
                }
            );
        },

        handleViewArchive() {
            const yearSelect = document.getElementById('archive-year-select');
            const selectedYear = yearSelect.value;
            const displayArea = document.getElementById('archive-display-area');
            const archive = this.state.archivedData[selectedYear];
            if (!archive) {
                displayArea.innerHTML = `<div class="text-center text-gray-500 py-10"><p>No se encontraron datos para el período ${selectedYear}.</p></div>`;
                return;
            }

            const transactionsHtml = archive.transactions.length > 0
                ?
                archive.transactions.map(t => `
                    <tr class="border-b border-gray-800 text-sm">
                        <td class="py-2 px-3">${t.date}</td>
                        <td class="py-2 px-3">${this.escapeHTML(t.description)}</td>
                        <td class="py-2 px-3">${this.escapeHTML(t.account)}</td>
                        <td class="py-2 px-3 text-right ${t.type === 'Ingreso' ? 'text-green-400' : 'text-red-400'}">
                            ${this.formatCurrency(t.amount, t.currency)}
                        </td>
                    </tr>`).join('')
                : `<tr><td colspan="4" class="text-center py-4 text-gray-500">No hay movimientos.</td></tr>`;

             displayArea.innerHTML = `
                <div class="mb-6">
                    <h3 class="font-semibold text-lg">Resumen del Archivo ${selectedYear}</h3>
                    <p class="text-sm text-gray-400">Período: ${archive.startDate} a ${archive.endDate}</p>
                </div>
                <div class="overflow-y-auto" style="max-height: 50vh;">
                    <h4 class="font-semibold mb-2">Movimientos Archivados</h4>
                    <table class="w-full text-left">
                        <thead class="sticky top-0 bg-gray-900/50 backdrop-blur-sm">
                            <tr class="text-gray-400 border-b border-gray-700 text-sm">
                                <th class="py-2 px-3">Fecha</th>
                                <th class="py-2 px-3">Descripción</th>
                                <th class="py-2 px-3">Cuenta</th>
                                <th class="py-2 px-3 text-right">Monto</th>
                            </tr>
                        </thead>
                        <tbody>${transactionsHtml}</tbody>
                    </table>
                </div>`;
        },
        
        resetTransactionForm() {
            this.elements.transactionForm.reset();
            document.getElementById('transaction-id').value = '';
            document.getElementById('form-title').textContent = 'Agregar Nuevo Movimiento';
            document.getElementById('form-submit-button-text').textContent = 'Guardar';
            document.getElementById('form-cancel-button').classList.add('hidden');
            this.setDateDefaults();
            this.populateCategories();
            this.updateCurrencySymbol();
        },

        toggleSidebar() {
            this.elements.sidebar.classList.toggle('w-64');
            this.elements.sidebar.classList.toggle('w-20');
            this.elements.mainContent.classList.toggle('ml-64');
            this.elements.mainContent.classList.toggle('ml-20');
            document.querySelectorAll('.nav-text').forEach(el => el.classList.toggle('hidden'));
        },

        toggleReportFilters() {
            const reportType = document.getElementById('report-type').value;
            const defaultFilters = this.elements.defaultFiltersContainer;
            const sociedadesFilters = this.elements.sociedadesFiltersContainer;

            if (reportType === 'sociedades') {
                defaultFilters.classList.add('hidden');
                sociedadesFilters.classList.remove('hidden');
                this.populateSociedadesYearFilter();
            } else {
                defaultFilters.classList.remove('hidden');
                sociedadesFilters.classList.add('hidden');
                
                const accountContainer = document.getElementById('report-account-container');
                const partContainer = document.getElementById('report-part-container');
                if (reportType === 'documentos') {
                    accountContainer.style.display = 'none';
                    partContainer.style.display = 'none';
                } else {
                    partContainer.style.display = 'block';
                    if (reportType === 'movimientos') {
                        accountContainer.style.display = 'block';
                    } else { 
                        accountContainer.style.display = 'none';
                    }
                }
            }
        },
        
        switchFacturacionTab(tabId) {
            const tabs = ['crear', 'listado', 'config'];
            tabs.forEach(t => {
                document.getElementById(`facturacion-content-${t}`).classList.toggle('hidden', t !== tabId);
                document.getElementById(`facturacion-tab-${t}`).classList.toggle('active', t === tabId);
                document.getElementById(`facturacion-tab-${t}`).classList.toggle('border-transparent', t !== tabId);
                document.getElementById(`facturacion-tab-${t}`).classList.toggle('text-gray-400', t !== tabId);
            });
        
            if (tabId === 'listado') {
                this.renderFacturas();
            }
        },

        handleAeatModuleToggleClick(e) {
            if (e.target.closest('.aeat-toggle-btn')) {
                this.state.settings.aeatModuleActive = !this.state.settings.aeatModuleActive;
                this.updateAll();
            }
        },
        
        addFacturaItem(item = { concept: '', quantity: 1, price: 0 }) {
            const div = document.createElement('div');
            div.className = 'grid grid-cols-12 gap-2 factura-item-row items-center';
            div.innerHTML = `
                <div class="col-span-6">
                    <input type="text" class="form-input factura-item-concept" placeholder="Descripción del servicio" value="${this.escapeHTML(item.concept)}" required>
                </div>
                <div class="col-span-2">
                    <input type="number" class="form-input factura-item-quantity" placeholder="1" value="${item.quantity}" min="0" step="1" required>
                </div>
                <div class="col-span-3">
                    <input type="number" class="form-input factura-item-price" placeholder="100.00" value="${item.price}" min="0" step="0.01" required>
                </div>
                <div class="col-span-1 text-right">
                    <button type="button" class="factura-remove-item-btn p-2 text-red-400 hover:text-red-300">
                       <i data-lucide="x-circle" class="w-5 h-5"></i>
                   </button>
                </div>
            `;
            this.elements.facturaItemsContainer.appendChild(div);
            lucide.createIcons();
        },

        calculateFacturaTotals() {
            let subtotal = 0;
            const selectedCurrency = document.getElementById('factura-currency').value;
            const operationType = this.elements.facturaOperationType.value;

            document.querySelectorAll('.factura-item-row').forEach(row => {
                const quantity = parseFloat(row.querySelector('.factura-item-quantity').value) || 0;
                const price = parseFloat(row.querySelector('.factura-item-price').value) || 0;
                subtotal += quantity * price;
            });
            const iva = operationType === 'Exportación (Fuera de la UE)' ? 0 : subtotal * 0.21;
            const total = subtotal + iva;

            document.getElementById('factura-subtotal').textContent = this.formatCurrency(subtotal, selectedCurrency);
            document.getElementById('factura-iva').textContent = this.formatCurrency(iva, selectedCurrency);
            document.getElementById('factura-total').textContent = this.formatCurrency(total, selectedCurrency);
        },

        handleGenerateInvoice(e) {
            e.preventDefault();
            const selectedCurrency = document.getElementById('factura-currency').value;
            const operationType = this.elements.facturaOperationType.value;

            const newInvoice = {
                id: crypto.randomUUID(),
                type: 'Factura',
                date: document.getElementById('factura-fecha').value,
                number: document.getElementById('factura-numero').value,
                client: document.getElementById('factura-cliente').value,
                amount: parseFloat(document.getElementById('factura-total').textContent.replace(/[^0-9,-]+/g,"").replace(",", ".")),
                currency: selectedCurrency,
                status: 'Adeudada',
                operationType: operationType
            };
            if (this.state.settings.aeatModuleActive) {
                const items = [];
                document.querySelectorAll('.factura-item-row').forEach(row => {
                    items.push({
                        concept: row.querySelector('.factura-item-concept').value,
                        quantity: parseFloat(row.querySelector('.factura-item-quantity').value) || 0,
                        price: parseFloat(row.querySelector('.factura-item-price').value) || 0,
                    });
                });
                const invoiceData = {
                    client: {
                        name: document.getElementById('factura-cliente').value,
                        nif: document.getElementById('factura-nif').value,
                    },
                    number: document.getElementById('factura-numero').value,
                    date: document.getElementById('factura-fecha').value,
                    currency: selectedCurrency,
                    operationType: operationType,
                    items: items,
                    subtotal: parseFloat(document.getElementById('factura-subtotal').textContent.replace(/[^0-9,-]+/g,"").replace(",", ".")),
                    iva: parseFloat(document.getElementById('factura-iva').textContent.replace(/[^0-9,-]+/g,"").replace(",", ".")),
                    total: parseFloat(document.getElementById('factura-total').textContent.replace(/[^0-9,-]+/g,"").replace(",", ".")),
                };
                this.elements.facturaApiResponse.innerHTML = `
                    <div class="flex items-center text-blue-400">
                        <svg class="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Enviando al Backend para firmar y registrar en AEAT...</span>
                    </div>
                    <pre class="mt-4 text-xs p-3 rounded-md bg-black/30 overflow-x-auto">${this.escapeHTML(JSON.stringify(invoiceData, null, 2))}</pre>
                `;
                setTimeout(() => {
                    const success = Math.random() > 0.1;
                    if (success) {
                        this.state.documents.push(newInvoice);
                        this.updateAll();
                        this.elements.facturaApiResponse.innerHTML = `
                            <div class="p-4 bg-green-900/30 text-green-300 rounded-lg border border-green-500/30">
                                <h4 class="font-bold">Éxito (Vía Módulo AEAT)</h4>
                                <p class="text-sm mt-2">Factura registrada en AEAT y guardada localmente.</p>
                                <p class="text-sm mt-1 font-mono text-xs">ID Veri*factu: ${'VF-' + Date.now()}</p>
                            </div>
                        `;
                    } else {
                        this.elements.facturaApiResponse.innerHTML = `
                            <div class="p-4 bg-red-900/30 text-red-300 rounded-lg border border-red-500/30">
                                <h4 class="font-bold">Error</h4>
                                <p class="text-sm mt-2">No se pudo conectar con el servicio de la AEAT. La factura no ha sido guardada.</p>
                            </div>
                        `;
                    }
                }, 2500);
            } else {
                this.state.documents.push(newInvoice);
                this.updateAll();
                this.elements.facturaApiResponse.innerHTML = `
                    <div class="p-4 bg-gray-800/50 text-gray-300 rounded-lg border border-gray-700">
                        <h4 class="font-bold">Operación Local (Módulo AEAT Inactivo)</h4>
                        <p class="text-sm mt-2">La factura se ha guardado en el sistema localmente.</p>
                    </div>
                `;
            }
        },

        handleSaveFiscalParams(e) {
            e.preventDefault();
            const newRate = parseFloat(document.getElementById('corporate-tax-rate').value);
            if (isNaN(newRate) || newRate < 0 || newRate > 100) {
                this.showAlertModal('Valor Inválido', 'Por favor, introduce un porcentaje válido entre 0 y 100.');
                return;
            }

            this.state.settings.fiscalParameters.corporateTaxRate = newRate;
            this.saveData();
            
            const button = this.elements.fiscalParamsForm.querySelector('button[type="submit"]');
            const originalText = 'Guardar';
            button.innerHTML = `<i data-lucide="check" class="w-5 h-5"></i> Guardado`;
            button.classList.add('bg-green-600', 'hover:bg-green-700');
            button.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            lucide.createIcons();

            setTimeout(() => {
                button.innerHTML = originalText;
                button.classList.remove('bg-green-600', 'hover:bg-green-700');
                button.classList.add('bg-blue-600', 'hover:bg-blue-700');
            }, 2500);
        },

        handleSaveAeatConfig(e) {
            e.preventDefault();
            this.state.settings.aeatConfig = {
                certPath: document.getElementById('aeat-cert-path').value,
                certPass: document.getElementById('aeat-cert-pass').value,
                endpoint: document.getElementById('aeat-endpoint').value,
                apiKey: document.getElementById('aeat-api-key').value,
            };
            this.saveData();

            const button = this.elements.aeatConfigForm.querySelector('button[type="submit"]');
            const originalText = button.innerHTML;
            button.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i> Guardado!`;
            button.classList.add('bg-green-600', 'hover:bg-green-700');
            button.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            lucide.createIcons();
            setTimeout(() => {
                button.innerHTML = originalText;
                button.classList.remove('bg-green-600', 'hover:bg-green-700');
                button.classList.add('bg-blue-600', 'hover:bg-blue-700');
                lucide.createIcons();
            }, 2000);
        },

        renderFiscalParams() {
            const rateInput = document.getElementById('corporate-tax-rate');
            if (rateInput && this.state.settings.fiscalParameters) {
                rateInput.value = this.state.settings.fiscalParameters.corporateTaxRate;
            }
        },

        renderAeatConfig() {
            const config = this.state.settings.aeatConfig;
            if(config) {
                document.getElementById('aeat-cert-path').value = config.certPath || '';
                document.getElementById('aeat-cert-pass').value = config.certPass || '';
                document.getElementById('aeat-endpoint').value = config.endpoint || '';
                document.getElementById('aeat-api-key').value = config.apiKey || '';
            }
        },

        handleOperationTypeChange() {
            const operationType = this.elements.facturaOperationType.value;
            const currencySelect = document.getElementById('factura-currency');
            const ivaLabel = document.getElementById('factura-iva-label');

            if (operationType === 'Exportación (Fuera de la UE)') {
                currencySelect.value = 'USD';
                currencySelect.disabled = true;
                ivaLabel.textContent = 'IVA (0% - Exportación):';
            } else {
                currencySelect.disabled = false;
                ivaLabel.textContent = 'IVA (21%):';
            }
            this.calculateFacturaTotals();
        },

        formatCurrency(amount, currency) {
            const locale = currency === 'EUR' ?
            'de-DE' : 'en-US';
            return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
        },

        escapeHTML(str) {
            if (typeof str !== 'string') return str;
            const p = document.createElement('p');
            p.appendChild(document.createTextNode(str));
            return p.innerHTML;
        },

        showAlertModal(title, message) {
            const modal = document.getElementById('alert-modal');
            document.getElementById('alert-modal-title').textContent = title;
            document.getElementById('alert-modal-message').textContent = message;
            modal.classList.remove('hidden');
            modal.classList.add('flex');

            const okBtn = document.getElementById('alert-modal-ok-btn');
            const backdrop = document.getElementById('alert-modal-backdrop');
            const hide = () => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
                okBtn.removeEventListener('click', hide);
                backdrop.removeEventListener('click', hide);
            };
            
            okBtn.addEventListener('click', hide, { once: true });
            backdrop.addEventListener('click', hide, { once: true });
        },
        
        showConfirmationModal(title, message, onConfirm) {
            const modal = document.getElementById('confirmation-modal');
            document.getElementById('modal-title').textContent = title;
            document.getElementById('modal-message').textContent = message;
            modal.classList.remove('hidden');
            modal.classList.add('flex');

            const confirmBtn = document.getElementById('modal-confirm-btn');
            const cancelBtn = document.getElementById('modal-cancel-btn');
            const backdrop = document.getElementById('confirmation-modal-backdrop');
            const confirmHandler = () => { onConfirm(); hide(); };
            const hide = () => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
                confirmBtn.removeEventListener('click', confirmHandler);
                cancelBtn.removeEventListener('click', hide);
                backdrop.removeEventListener('click', hide);
            };
            
            confirmBtn.addEventListener('click', confirmHandler, { once: true });
            cancelBtn.addEventListener('click', hide, { once: true });
            backdrop.addEventListener('click', hide, { once: true });
        },
        
        setDateDefaults() {
            const today = new Date().toISOString().split('T')[0];
            ['transaction-date', 'transfer-date', 'proforma-date', 'cierre-start-date', 'cierre-end-date', 'factura-fecha'].forEach(id => {
                const el = document.getElementById(id);
                if(el) el.value = today;
            });
        },

        updateDateInputForReports() {
            const period = document.getElementById('report-period').value;
            const container = document.getElementById('date-input-container');
            const today = new Date();
            const todayISO = today.toISOString();
            let inputHtml = '';
            switch (period) {
                case 'daily': inputHtml = `<label for="report-date" class="block text-sm font-medium text-gray-400">Fecha</label><input type="date" id="report-date" class="form-input mt-1" value="${todayISO.split('T')[0]}">`;
                break;
                case 'weekly':
                    const week = `${today.getFullYear()}-W${this.getWeekNumber(today)}`;
                    inputHtml = `<label for="report-week" class="block text-sm font-medium text-gray-400">Semana</label><input type="week" id="report-week" class="form-input mt-1" value="${week}">`;
                    break;
                case 'monthly': inputHtml = `<label for="report-month" class="block text-sm font-medium text-gray-400">Mes</label><input type="month" id="report-month" class="form-input mt-1" value="${todayISO.substring(0, 7)}">`; break;
                case 'annual': 
                    const currentYear = today.getFullYear();
                    let yearOptions = ''; 
                    for (let i = 0; i < 5; i++) { yearOptions += `<option value="${currentYear - i}">${currentYear - i}</option>`;
                    } 
                    inputHtml = `<label for="report-year" class="block text-sm font-medium text-gray-400">Año</label><select id="report-year" class="form-input mt-1">${yearOptions}</select>`;
                    break;
            }
            container.innerHTML = inputHtml;
        },

        getWeekNumber(d) {
            d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
            d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
            var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
            return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        },
        
        calculateBalanceForAccount(accountName, upToDate) {
            const initialTransaction = this.state.transactions.find(t => t.isInitialBalance && t.account === accountName);
            let balance = initialTransaction ? initialTransaction.amount : 0;
            
            this.state.transactions
                .filter(t => t.account === accountName && !t.isInitialBalance && new Date(t.date) <= upToDate)
                .forEach(t => {
                    balance += (t.type === 'Ingreso' ? t.amount : -t.amount);
                });
            return balance;
        },

        // ✨ =================================================================
        // ✨ FUNCIONES DE REPORTE Y EXPORTACIÓN (CORREGIDAS Y COMPLETAS)
        // ✨ =================================================================
        
        renderReport(transactions, period, startDate, account, part) {
            const displayArea = this.elements.reportDisplayArea;
            const title = `Reporte de Movimientos`;
            const subtitle = `Período: ${startDate.toLocaleDateString('es-ES')} | Cuenta: ${account} | Parte: ${part}`;
            if (transactions.length === 0) {
                displayArea.innerHTML = `<div class="text-center text-gray-500 flex flex-col items-center justify-center h-full"><i data-lucide="folder-x" class="w-16 h-16 mb-4"></i><h3 class="font-semibold text-lg">No hay datos para este reporte</h3><p class="text-sm">No se encontraron movimientos con los filtros seleccionados.</p></div>`;
                lucide.createIcons();
                return;
            }

            let totalIngresosEUR = 0, totalEgresosEUR = 0;
            let totalIngresosUSD = 0, totalEgresosUSD = 0;

            transactions.forEach(t => {
                if (t.currency === 'EUR') {
                    if (t.type === 'Ingreso') totalIngresosEUR += t.amount; else totalEgresosEUR += t.amount;
                } else {
                    if (t.type === 'Ingreso') totalIngresosUSD += t.amount; else totalEgresosUSD += t.amount;
                }
            });
            const tableRows = transactions.map(t => `
                <tr class="border-b border-gray-800 text-sm">
                    <td class="py-2 px-3">${t.date}</td>
                    <td class="py-2 px-3">${this.escapeHTML(t.description)}</td>
                    <td class="py-2 px-3">${this.escapeHTML(t.category)}</td>
                    <td class="py-2 px-3 text-right ${t.type === 'Ingreso' ? 'text-green-400' : 'text-red-400'}">
                        ${t.type === 'Ingreso' ? '+' : '-'} ${this.formatCurrency(t.amount, t.currency)}
                    </td>
                </tr>
            `).join('');
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
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div class="bg-gray-800/50 p-3 rounded-lg"><p class="text-xs text-gray-400">Ingresos EUR</p><p class="font-bold text-green-400">${this.formatCurrency(totalIngresosEUR, 'EUR')}</p></div>
                    <div class="bg-gray-800/50 p-3 rounded-lg"><p class="text-xs text-gray-400">Egresos EUR</p><p class="font-bold text-red-400">${this.formatCurrency(totalEgresosEUR, 'EUR')}</p></div>
                    <div class="bg-gray-800/50 p-3 rounded-lg"><p class="text-xs text-gray-400">Ingresos USD</p><p class="font-bold text-green-400">${this.formatCurrency(totalIngresosUSD, 'USD')}</p></div>
                    <div class="bg-gray-800/50 p-3 rounded-lg"><p class="text-xs text-gray-400">Egresos USD</p><p class="font-bold text-red-400">${this.formatCurrency(totalEgresosUSD, 'USD')}</p></div>
                </div>
                <div class="overflow-y-auto" style="max-height: 50vh;">
                    <table class="w-full text-left">
                        <thead class="sticky top-0 bg-gray-900/50 backdrop-blur-sm">
                            <tr class="text-gray-400 border-b border-gray-700 text-sm">
                                <th class="py-2 px-3">Fecha</th>
                                <th class="py-2 px-3">Descripción</th>
                                <th class="py-2 px-3">Categoría</th>
                                <th class="py-2 px-3 text-right">Monto</th>
                            </tr>
                        </thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                </div>
            `;
            lucide.createIcons();
        },
        
        renderDocumentsReport(documents, period, startDate) {
            const displayArea = this.elements.reportDisplayArea;
            const title = `Reporte de Documentos`;
            const subtitle = `Período: ${startDate.toLocaleDateString('es-ES')}`;
            if (documents.length === 0) {
                displayArea.innerHTML = `<div class="text-center text-gray-500 flex flex-col items-center justify-center h-full"><i data-lucide="folder-x" class="w-16 h-16 mb-4"></i><h3 class="font-semibold text-lg">No hay datos para este reporte</h3><p class="text-sm">No se encontraron documentos con los filtros seleccionados.</p></div>`;
                lucide.createIcons();
                return;
            }
            
            const tableRows = documents.map(d => `
                <tr class="border-b border-gray-800 text-sm">
                    <td class="py-2 px-3">${d.date}</td>
                    <td class="py-2 px-3">${this.escapeHTML(d.number)}</td>
                    <td class="py-2 px-3">${this.escapeHTML(d.client)}</td>
                    <td class="py-2 px-3">${d.status}</td>
                    <td class="py-2 px-3 text-right">${this.formatCurrency(d.amount, d.currency)}</td>
                </tr>
            `).join('');
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
                <div class="overflow-y-auto" style="max-height: 50vh;">
                    <table class="w-full text-left">
                        <thead class="sticky top-0 bg-gray-900/50 backdrop-blur-sm"><tr class="text-gray-400 border-b border-gray-700 text-sm">
                            <th class="py-2 px-3">Fecha</th><th class="py-2 px-3">Número</th><th class="py-2 px-3">Cliente</th><th class="py-2 px-3">Estado</th><th class="py-2 px-3 text-right">Monto</th>
                        </tr></thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                </div>
            `;
            lucide.createIcons();
        },

        renderInvestmentsReport(investments, period, startDate, part) {
            const displayArea = this.elements.reportDisplayArea;
            const title = `Reporte de Inversiones`;
            const subtitle = `Período: ${startDate.toLocaleDateString('es-ES')} | Parte: ${part}`;
            if (investments.length === 0) {
                displayArea.innerHTML = `<div class="text-center text-gray-500 flex flex-col items-center justify-center h-full"><i data-lucide="folder-x" class="w-16 h-16 mb-4"></i><h3 class="font-semibold text-lg">No hay datos para este reporte</h3><p class="text-sm">No se encontraron inversiones con los filtros seleccionados.</p></div>`;
                lucide.createIcons();
                return;
            }

            const tableRows = investments.map(t => `
                <tr class="border-b border-gray-800 text-sm">
                    <td class="py-2 px-3">${t.date}</td>
                    <td class="py-2 px-3">${this.escapeHTML(t.description)}</td>
                    <td class="py-2 px-3">${this.escapeHTML(t.account)}</td>
                    <td class="py-2 px-3 text-right text-yellow-400">${this.formatCurrency(t.amount, t.currency)}</td>
                </tr>
            `).join('');
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
                <div class="overflow-y-auto" style="max-height: 50vh;">
                    <table class="w-full text-left">
                        <thead class="sticky top-0 bg-gray-900/50 backdrop-blur-sm"><tr class="text-gray-400 border-b border-gray-700 text-sm">
                            <th class="py-2 px-3">Fecha</th><th class="py-2 px-3">Descripción</th><th class="py-2 px-3">Cuenta</th><th class="py-2 px-3 text-right">Monto</th>
                        </tr></thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                </div>
            `;
            lucide.createIcons();
        },
        
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
                     <div class="flex justify-between items-center text-xl text-blue-300">
                        <span class="font-bold">Pago a cuenta estimado (${taxRate}%):</span>
                        <span class="font-bold">${this.formatCurrency(pagoACuenta, 'EUR')}</span>
                    </div>
                </div>
                <p class="text-xs text-gray-500 mt-4">* Este es un cálculo provisional para el modelo 202, basado en el resultado del período actual. No sustituye el asesoramiento fiscal profesional.</p>
            `;
            lucide.createIcons();
        },
    };

    App.init();

});