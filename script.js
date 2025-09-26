const STORAGE_KEY = 'financialDashboardState';
const PART_COLORS = {
    A: 'rgba(59, 130, 246, 0.8)', // Azul (Blue-600)
    B: 'rgba(251, 191, 36, 0.8)',  // Amarillo (Amber-500)
};

const App = {
    state: {
        accounts: [
            // Cuentas de ejemplo iniciales
            { id: 1, name: 'Banco Principal', currency: 'USD', initialBalance: 10000, logo: '<i data-lucide="banknote" class="w-6 h-6"></i>' },
            { id: 2, name: 'Caja Euro', currency: 'EUR', initialBalance: 5000, logo: '<i data-lucide="euro" class="w-6 h-6"></i>' },
        ],
        transactions: [
            // Se añadirán transacciones aquí. La transacción de saldo inicial se gestiona en calculateBalance.
        ],
        categories: {
            Ingreso: ['Ventas', 'Inversión', 'Préstamo', 'Otro Ingreso'],
            Egreso: ['Alquiler', 'Suscripciones', 'Marketing', 'Sueldos', 'Transferencia', 'Comisión'],
        },
        proformas: [],
        modules: {
            facturacion: false,
            usuarios: false,
            inversiones: false,
        },
        archive: [], // Para guardar estados cerrados de años anteriores
    },

    init() {
        this.loadState();
        this.setupEventListeners();
        this.renderAll();
        // Inicializa los iconos de Lucide
        lucide.createIcons();
    },

    loadState() {
        const storedState = localStorage.getItem(STORAGE_KEY);
        if (storedState) {
            const parsedState = JSON.parse(storedState);
            // Fusionar el estado cargado con las propiedades por defecto para asegurar que no falten campos
            this.state = {
                ...this.state,
                ...parsedState,
                categories: { ...this.state.categories, ...parsedState.categories },
                modules: { ...this.state.modules, ...parsedState.modules },
            };
        }
        // Asegurar que las cuentas iniciales estén marcadas como transacciones de saldo
        this.state.accounts.forEach(account => {
            const exists = this.state.transactions.some(t => t.isInitialBalance && t.account === account.name);
            if (!exists) {
                this.state.transactions.push({
                    id: Date.now() + Math.random(),
                    date: new Date().toISOString().split('T')[0],
                    description: `Saldo Inicial - ${account.name}`,
                    type: 'Ingreso',
                    part: 'A', // Parte A por defecto para saldos iniciales
                    account: account.name,
                    category: 'Saldo Inicial',
                    amount: account.initialBalance,
                    currency: account.currency,
                    isInitialBalance: true,
                });
            }
        });
        this.saveState();
    },

    saveState() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    },

    setupEventListeners() {
        // Navegación lateral
        document.getElementById('sidebar-toggle').addEventListener('click', () => this.toggleSidebar());
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => this.handleNavigation(e));
        });

        // Cash Flow
        document.getElementById('transaction-form').addEventListener('submit', (e) => this.handleTransactionSubmit(e));
        document.getElementById('form-cancel-button').addEventListener('click', () => this.resetTransactionForm());
        document.getElementById('cashflow-search').addEventListener('input', () => this.renderTransactions());
        document.getElementById('transfer-form').addEventListener('submit', (e) => this.handleTransferSubmit(e));
        document.getElementById('transaction-account').addEventListener('change', (e) => this.updateCurrencySymbol(e.target.value, 'amount-currency-symbol'));
        document.getElementById('transfer-from').addEventListener('change', (e) => {
            this.updateCurrencySymbol(e.target.value, 'transfer-amount-currency-symbol');
            this.updateCurrencySymbol(e.target.value, 'transfer-fee-source-currency-symbol');
            this.updateTransferToOptions(e.target.value);
        });

        // Inicio
        document.getElementById('inicio-chart-currency').addEventListener('change', (e) => this.renderAnnualFlowChart(e.target.value));

        // Proformas
        document.getElementById('proforma-form').addEventListener('submit', (e) => this.handleProformaSubmit(e));
        document.getElementById('proformas-search').addEventListener('input', () => this.renderProformas());

        // Reportes
        document.getElementById('report-type').addEventListener('change', () => this.updateReportFilters());
        document.getElementById('report-period').addEventListener('change', () => this.updateDateInput());
        document.getElementById('report-form').addEventListener('submit', (e) => this.handleReportGenerate(e));

        // Archivos
        document.getElementById('archive-year-select').addEventListener('change', (e) => this.handleArchiveYearChange(e));
        document.getElementById('view-archive-btn').addEventListener('click', () => this.renderArchiveData());

        // Ajustes
        document.getElementById('add-account-form').addEventListener('submit', (e) => this.handleAddAccount(e));
        document.getElementById('add-income-category-form').addEventListener('submit', (e) => this.handleAddCategory(e, 'Ingreso'));
        document.getElementById('add-expense-category-form').addEventListener('submit', (e) => this.handleAddCategory(e, 'Egreso'));
        document.getElementById('update-balance-form').addEventListener('submit', (e) => this.handleUpdateBalance(e));
        document.getElementById('close-year-btn').addEventListener('click', () => this.showConfirmationModal('Cierre Anual', 'Confirmar Cierre Anual', 'Esta acción archivará de forma permanente todos los datos del período seleccionado y solo mantendrá los saldos finales como iniciales para el nuevo período. ¡Esta acción no se puede deshacer!', () => this.closeYear()));

        // Facturación
        document.getElementById('facturacion-tab-crear').addEventListener('click', (e) => this.handleFacturacionTabClick(e, 'crear'));
        document.getElementById('facturacion-tab-config').addEventListener('click', (e) => this.handleFacturacionTabClick(e, 'config'));
        document.getElementById('factura-add-item-btn').addEventListener('click', () => this.addFacturaItemField());
        document.getElementById('nueva-factura-form').addEventListener('submit', (e) => this.handleGenerateInvoice(e));
    },

    // --- UTILITIES ---

    getCurrencySymbol(currency) {
        return currency === 'EUR' ? '€' : '$';
    },

    formatCurrency(amount, currency) {
        const symbol = this.getCurrencySymbol(currency);
        const code = currency === 'EUR' ? 'es-ES' : 'en-US';
        return new Intl.NumberFormat(code, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2
        }).format(amount).replace(currency, symbol).trim();
    },

    updateCurrencySymbol(accountName, elementId) {
        const account = this.state.accounts.find(acc => acc.name === accountName);
        if (account) {
            document.getElementById(elementId).textContent = this.getCurrencySymbol(account.currency);
        }
    },

    calculateBalance(accountName) {
        const upToDate = new Date();
        return this.calculateBalanceForAccount(accountName, upToDate);
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

    // --- RENDERING ---

    renderAll() {
        this.renderSidebar();
        this.renderAccountsGrid();
        this.renderAccountsSelects();
        this.renderCategoriesSelects();
        this.renderTransactions();
        this.renderProformas();
        this.renderKPITotals();
        this.renderBalanceCharts();
        this.renderAnnualFlowChart('EUR'); // Default
        this.renderSettingsAccountsList();
        this.renderSettingsCategories();
        this.renderModuleSettings();
        this.renderArchiveYears();
        this.updateDateInput(); // Renderiza el input de fecha inicial para reportes
    },

    renderSidebar() {
        // Muestra/Oculta módulos en el sidebar
        document.getElementById('nav-facturacion').classList.toggle('hidden', !this.state.modules.facturacion);
        document.getElementById('nav-usuarios').classList.toggle('hidden', !this.state.modules.usuarios);
        document.getElementById('nav-inversiones').classList.toggle('hidden', !this.state.modules.inversiones);
    },

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('main-content');
        const navTexts = document.querySelectorAll('.nav-text');
        const isExpanded = sidebar.classList.contains('w-64');

        if (isExpanded) {
            // Colapsar
            sidebar.classList.remove('w-64', 'bg-black');
            sidebar.classList.add('w-20', 'bg-black/50');
            mainContent.classList.remove('ml-64');
            mainContent.classList.add('ml-20');
            navTexts.forEach(el => el.classList.add('hidden'));
        } else {
            // Expandir
            sidebar.classList.remove('w-20', 'bg-black/50');
            sidebar.classList.add('w-64', 'bg-black');
            mainContent.classList.remove('ml-20');
            mainContent.classList.add('ml-64');
            // Usar setTimeout para que la animación de ancho termine antes de mostrar el texto
            setTimeout(() => {
                navTexts.forEach(el => el.classList.remove('hidden'));
            }, 150);
        }
    },

    handleNavigation(e) {
        e.preventDefault();
        const targetId = e.currentTarget.id.replace('nav-', 'page-');

        // 1. Activar enlace de navegación
        document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
        e.currentTarget.classList.add('active');

        // 2. Mostrar la pestaña de contenido
        document.querySelectorAll('.page-content').forEach(page => page.classList.add('hidden'));
        document.getElementById(targetId).classList.remove('hidden');

        // 3. Renderizar el contenido específico si es necesario
        if (targetId === 'page-cuentas') {
            this.renderAccountsGrid();
            this.renderBalanceCharts();
        } else if (targetId === 'page-cashflow') {
            this.renderAccountsSelects(); // Asegurar que los selects estén actualizados
            this.renderCategoriesSelects();
            this.renderTransactions();
        } else if (targetId === 'page-inicio') {
            this.renderKPITotals();
            this.renderAnnualFlowChart(document.getElementById('inicio-chart-currency').value);
        } else if (targetId === 'page-ajustes') {
            this.renderAllSettings();
        }
    },

    // --- KPI & DASHBOARD ---

    renderKPITotals() {
        let totalEUR = 0;
        let totalUSD = 0;

        this.state.accounts.forEach(account => {
            const balance = this.calculateBalance(account.name);
            if (account.currency === 'EUR') {
                totalEUR += balance;
            } else if (account.currency === 'USD') {
                totalUSD += balance;
            }
        });

        document.getElementById('total-eur').textContent = this.formatCurrency(totalEUR, 'EUR');
        document.getElementById('total-usd').textContent = this.formatCurrency(totalUSD, 'USD');
    },

    annualFlowChart: null,

    renderAnnualFlowChart(currency) {
        const ctx = document.getElementById('annualFlowChart').getContext('2d');
        const currentYear = new Date().getFullYear();
        const filteredTransactions = this.state.transactions.filter(t =>
            new Date(t.date).getFullYear() === currentYear &&
            this.state.accounts.find(acc => acc.name === t.account)?.currency === currency &&
            !t.isInitialBalance
        );

        const monthlyData = Array.from({ length: 12 }, () => ({ ingreso: 0, egreso: 0 }));
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        filteredTransactions.forEach(t => {
            const monthIndex = new Date(t.date).getMonth();
            if (t.type === 'Ingreso') {
                monthlyData[monthIndex].ingreso += t.amount;
            } else if (t.type === 'Egreso') {
                monthlyData[monthIndex].egreso += t.amount;
            }
        });

        const ingresos = monthlyData.map(m => m.ingreso);
        const egresos = monthlyData.map(m => m.egreso);

        if (this.annualFlowChart) {
            this.annualFlowChart.destroy();
        }

        this.annualFlowChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: monthNames,
                datasets: [
                    {
                        label: 'Ingresos',
                        data: ingresos,
                        backgroundColor: 'rgba(52, 211, 163, 0.7)', // Green-400
                        borderRadius: 4,
                    },
                    {
                        label: 'Egresos',
                        data: egresos,
                        backgroundColor: 'rgba(239, 68, 68, 0.7)', // Red-500
                        borderRadius: 4,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#e0e0e0' } },
                    y: { grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#e0e0e0' }, beginAtZero: true },
                },
                plugins: {
                    legend: { labels: { color: '#e0e0e0' } },
                    tooltip: { callbacks: { label: (context) => `${context.dataset.label}: ${this.formatCurrency(context.parsed.y, currency)}` } }
                }
            }
        });
    },

    // --- CUENTAS & BANCOS ---

    accountsBalanceChartEUR: null,
    accountsBalanceChartUSD: null,

    renderAccountsGrid() {
        const grid = document.getElementById('accounts-grid');
        grid.innerHTML = '';

        this.state.accounts.forEach(account => {
            const balance = this.calculateBalance(account.name);
            const card = document.createElement('div');
            card.className = 'card p-6 rounded-xl flex items-center gap-4';
            card.innerHTML = `
                <div class="p-3 rounded-full bg-blue-600/20 text-blue-400">
                    ${account.logo.replace(/class=".*?"/g, 'class="w-6 h-6"')}
                </div>
                <div>
                    <p class="text-gray-400 text-sm">${account.currency} Balance</p>
                    <h4 class="text-xl font-bold">${account.name}</h4>
                    <p class="text-2xl font-semibold kpi-value mt-1">${this.formatCurrency(balance, account.currency)}</p>
                </div>
            `;
            grid.appendChild(card);
            lucide.createIcons();
        });
    },

    renderBalanceCharts() {
        const totalContainer = document.getElementById('balance-totals');
        const accountsEUR = this.state.accounts.filter(a => a.currency === 'EUR');
        const accountsUSD = this.state.accounts.filter(a => a.currency === 'USD');

        // Render Totals Block
        let totalEUR = 0;
        accountsEUR.forEach(a => totalEUR += this.calculateBalance(a.name));
        let totalUSD = 0;
        accountsUSD.forEach(a => totalUSD += this.calculateBalance(a.name));

        totalContainer.innerHTML = `
            <div class="text-center">
                <p class="text-gray-400">Total Euros</p>
                <p class="text-3xl font-bold kpi-value">${this.formatCurrency(totalEUR, 'EUR')}</p>
            </div>
            <div class="text-center">
                <p class="text-gray-400">Total Dólares</p>
                <p class="text-3xl font-bold kpi-value">${this.formatCurrency(totalUSD, 'USD')}</p>
            </div>
        `;

        // Render EUR Chart
        this.renderBalanceDonutChart('accountsBalanceChartEUR', 'balance-legend-eur', accountsEUR, 'EUR');
        document.getElementById('eur-chart-container').classList.toggle('hidden', accountsEUR.length === 0);

        // Render USD Chart
        this.renderBalanceDonutChart('accountsBalanceChartUSD', 'balance-legend-usd', accountsUSD, 'USD');
        document.getElementById('usd-chart-container').classList.toggle('hidden', accountsUSD.length === 0);
    },

    renderBalanceDonutChart(canvasId, legendId, accounts, currency) {
        if (accounts.length === 0) return;

        const balances = accounts.map(a => this.calculateBalance(a.name));
        const names = accounts.map(a => a.name);
        const colors = accounts.map((_, i) => `hsl(${i * 60}, 70%, 50%)`); // Generación de colores

        const chartConfig = {
            type: 'doughnut',
            data: {
                labels: names,
                datasets: [{
                    data: balances,
                    backgroundColor: colors,
                    hoverOffset: 4,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.label}: ${this.formatCurrency(context.parsed, currency)}`
                        }
                    }
                }
            }
        };

        if (canvasId === 'accountsBalanceChartEUR') {
            if (this.accountsBalanceChartEUR) this.accountsBalanceChartEUR.destroy();
            this.accountsBalanceChartEUR = new Chart(document.getElementById(canvasId).getContext('2d'), chartConfig);
        } else if (canvasId === 'accountsBalanceChartUSD') {
            if (this.accountsBalanceChartUSD) this.accountsBalanceChartUSD.destroy();
            this.accountsBalanceChartUSD = new Chart(document.getElementById(canvasId).getContext('2d'), chartConfig);
        }

        // Generar Leyenda personalizada
        const legendContainer = document.getElementById(legendId);
        legendContainer.innerHTML = names.map((name, i) => `
            <div class="flex items-center justify-between text-sm py-1">
                <div class="flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full" style="background-color: ${colors[i]}"></span>
                    <span>${name}</span>
                </div>
                <span class="font-semibold">${this.formatCurrency(balances[i], currency)}</span>
            </div>
        `).join('');
    },

    // --- CASH FLOW (MOVIMIENTOS) ---

    renderAccountsSelects() {
        const selects = document.querySelectorAll('#transaction-account, #transfer-from, #transfer-to, #report-account, #update-account-select');
        selects.forEach(select => {
            const currentValue = select.value;
            select.innerHTML = '';
            // Añadir opción por defecto para reportes
            if (select.id === 'report-account') {
                const allOption = document.createElement('option');
                allOption.value = 'all';
                allOption.textContent = 'Todas las Cuentas';
                select.appendChild(allOption);
            }

            this.state.accounts.forEach(account => {
                const option = document.createElement('option');
                option.value = account.name;
                option.textContent = `${account.name} (${account.currency})`;
                select.appendChild(option);
            });

            // Intentar restaurar el valor o establecer uno por defecto
            if (select.id === 'transfer-from' || select.id === 'transfer-to' || select.id === 'update-account-select' || select.id === 'transaction-account') {
                if (currentValue && this.state.accounts.some(a => a.name === currentValue)) {
                    select.value = currentValue;
                } else if (this.state.accounts.length > 0) {
                    select.value = this.state.accounts[0].name;
                }
                if (select.id === 'transaction-account' && this.state.accounts.length > 0) {
                    this.updateCurrencySymbol(select.value, 'amount-currency-symbol');
                }
            }
        });

        // Asegurar que transfer-from y transfer-to no sean la misma cuenta
        if (document.getElementById('transfer-from')) {
            this.updateTransferToOptions(document.getElementById('transfer-from').value);
            this.updateCurrencySymbol(document.getElementById('transfer-from').value, 'transfer-amount-currency-symbol');
            this.updateCurrencySymbol(document.getElementById('transfer-from').value, 'transfer-fee-source-currency-symbol');
        }
    },

    updateTransferToOptions(fromAccountName) {
        const transferToSelect = document.getElementById('transfer-to');
        const currentValue = transferToSelect.value;
        transferToSelect.innerHTML = '';

        this.state.accounts.filter(a => a.name !== fromAccountName).forEach(account => {
            const option = document.createElement('option');
            option.value = account.name;
            option.textContent = `${account.name} (${account.currency})`;
            transferToSelect.appendChild(option);
        });

        // Intentar restaurar el valor
        if (currentValue && this.state.accounts.some(a => a.name === currentValue && a.name !== fromAccountName)) {
            transferToSelect.value = currentValue;
        } else if (transferToSelect.options.length > 0) {
            transferToSelect.value = transferToSelect.options[0].value;
        }

        // Si la cuenta de origen y destino tienen diferente moneda, se muestra un campo adicional
        const fromAccount = this.state.accounts.find(a => a.name === fromAccountName);
        const toAccount = this.state.accounts.find(a => a.name === transferToSelect.value);

        const extraField = document.getElementById('transfer-extra-field');
        const extraLabel = document.getElementById('transfer-extra-label');
        const extraCurrencySymbol = document.getElementById('transfer-extra-currency-symbol');

        if (fromAccount && toAccount && fromAccount.currency !== toAccount.currency) {
            extraField.classList.remove('hidden');
            extraLabel.textContent = `Monto Recibido (${toAccount.currency})`;
            extraCurrencySymbol.textContent = this.getCurrencySymbol(toAccount.currency);
            extraField.required = true;
            extraField.placeholder = "Monto recibido (conversión)";
        } else {
            extraField.classList.add('hidden');
            extraLabel.textContent = 'Comisión Destino (Opcional)';
            extraCurrencySymbol.textContent = fromAccount ? this.getCurrencySymbol(fromAccount.currency) : '$';
            extraField.required = false;
            extraField.placeholder = "1.00";
        }
    },

    renderCategoriesSelects() {
        const incomeCategories = this.state.categories.Ingreso;
        const expenseCategories = this.state.categories.Egreso;
        const select = document.getElementById('transaction-category');
        select.innerHTML = '';

        const currentType = document.getElementById('transaction-type').value;
        const categories = currentType === 'Ingreso' ? incomeCategories : expenseCategories;

        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            select.appendChild(option);
        });
    },

    renderTransactions() {
        const tbody = document.getElementById('transactions-table-body');
        const searchTerm = document.getElementById('cashflow-search').value.toLowerCase();
        tbody.innerHTML = '';

        const filteredTransactions = this.state.transactions
            .filter(t => !t.isInitialBalance)
            .filter(t => t.description.toLowerCase().includes(searchTerm) || t.account.toLowerCase().includes(searchTerm) || t.category.toLowerCase().includes(searchTerm))
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        filteredTransactions.forEach(t => {
            const account = this.state.accounts.find(a => a.name === t.account);
            const currency = account ? account.currency : 'USD';
            const amountFormatted = this.formatCurrency(t.amount, currency);
            const isTransfer = t.isTransfer || t.isTransferFee;
            const isAdjustment = t.isAdjustment;

            let descriptionText = t.description;
            if (t.isTransfer) {
                const transferPartner = t.transferPartnerAccount;
                descriptionText = `Transferencia a ${transferPartner}`;
            } else if (t.isTransferFee) {
                const transferPartner = t.transferPartnerAccount;
                descriptionText = `Comisión Transferencia a ${transferPartner}`;
            }

            const row = document.createElement('tr');
            row.className = 'border-b border-gray-800 hover:bg-black/20';
            row.innerHTML = `
                <td class="py-3 px-3">${t.date}</td>
                <td class="py-3 px-3">
                    ${descriptionText}
                    ${isTransfer ? `<span class="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-600/30 text-indigo-300">Transferencia</span>` : ''}
                    ${isAdjustment ? `<span class="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-600/30 text-green-300">Ajuste</span>` : ''}
                </td>
                <td class="py-3 px-3">${t.account}</td>
                <td class="py-3 px-3">${t.category}</td>
                <td class="py-3 px-3">
                    <span class="px-3 py-1 rounded-full text-xs font-medium" style="background-color: ${PART_COLORS[t.part].replace('0.8', '0.2')}; color: ${PART_COLORS[t.part].replace('0.8', '1')}">${t.part}</span>
                </td>
                <td class="py-3 px-3 text-right ${t.type === 'Ingreso' ? 'text-green-400' : 'text-red-400'}">
                    ${t.type === 'Ingreso' ? '+' : '-'}${amountFormatted}
                </td>
                <td class="py-3 px-3 text-center space-x-2">
                    <button class="text-blue-400 hover:text-blue-300" onclick="App.editTransaction('${t.id}')" title="Editar">
                        <i data-lucide="square-pen" class="w-5 h-5"></i>
                    </button>
                    ${!isTransfer && !isAdjustment ? `
                        <button class="text-red-400 hover:text-red-300" onclick="App.showConfirmationModal('Eliminar Movimiento', 'Confirmar Eliminación', '¿Estás seguro de que deseas eliminar este movimiento? Esta acción no se puede deshacer.', () => App.deleteTransaction('${t.id}'))" title="Eliminar">
                            <i data-lucide="trash-2" class="w-5 h-5"></i>
                        </button>
                    ` : `<i data-lucide="lock" class="w-5 h-5 text-gray-500" title="No se puede eliminar"></i>`}
                </td>
            `;
            tbody.appendChild(row);
        });
        lucide.createIcons();
    },

    handleTransactionSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const id = form['transaction-id'].value;
        const isEditing = !!id;

        const transaction = {
            id: isEditing ? id : Date.now() + Math.random(),
            date: form['transaction-date'].value,
            description: form['transaction-description'].value,
            type: form['transaction-type'].value,
            part: form['transaction-part'].value,
            account: form['transaction-account'].value,
            category: form['transaction-category'].value,
            amount: parseFloat(form['transaction-amount'].value),
            currency: this.state.accounts.find(a => a.name === form['transaction-account'].value).currency,
        };

        if (isEditing) {
            this.state.transactions = this.state.transactions.map(t => (t.id == id ? transaction : t));
        } else {
            this.state.transactions.push(transaction);
        }

        this.saveState();
        this.renderAll();
        this.resetTransactionForm();
    },

    editTransaction(id) {
        const transaction = this.state.transactions.find(t => t.id == id);
        if (!transaction) return;

        const form = document.getElementById('transaction-form');
        form['transaction-id'].value = transaction.id;
        form['transaction-date'].value = transaction.date;
        form['transaction-description'].value = transaction.description;
        form['transaction-type'].value = transaction.type;
        form['transaction-part'].value = transaction.part;
        form['transaction-account'].value = transaction.account;

        // Asegurar que las categorías se rendericen para el tipo correcto
        this.renderCategoriesSelects();
        form['transaction-category'].value = transaction.category;
        form['transaction-amount'].value = transaction.amount;

        document.getElementById('form-title').textContent = 'Editar Movimiento';
        document.getElementById('form-submit-button-text').textContent = 'Actualizar';
        document.getElementById('form-cancel-button').classList.remove('hidden');
    },

    resetTransactionForm() {
        document.getElementById('transaction-form').reset();
        document.getElementById('transaction-form')['transaction-id'].value = '';
        document.getElementById('form-title').textContent = 'Agregar Nuevo Movimiento';
        document.getElementById('form-submit-button-text').textContent = 'Guardar';
        document.getElementById('form-cancel-button').classList.add('hidden');
        this.renderCategoriesSelects(); // Vuelve a cargar las categorías por defecto
        if (this.state.accounts.length > 0) {
            document.getElementById('transaction-account').value = this.state.accounts[0].name;
            this.updateCurrencySymbol(this.state.accounts[0].name, 'amount-currency-symbol');
        }
    },

    deleteTransaction(id) {
        this.state.transactions = this.state.transactions.filter(t => t.id != id);
        this.saveState();
        this.renderAll();
    },

    // --- TRANSFERENCIAS ---

    handleTransferSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const date = form['transfer-date'].value;
        const fromAccountName = form['transfer-from'].value;
        const toAccountName = form['transfer-to'].value;
        const amount = parseFloat(form['transfer-amount'].value);
        const feeSource = parseFloat(form['transfer-fee-source'].value || 0);
        const receivedAmount = parseFloat(form['transfer-extra-field'].value || amount); // Usa el campo extra si está visible, sino usa el monto enviado.

        if (fromAccountName === toAccountName) {
            alert('Las cuentas de origen y destino no pueden ser la misma.');
            return;
        }

        const fromAccount = this.state.accounts.find(a => a.name === fromAccountName);
        const toAccount = this.state.accounts.find(a => a.name === toAccountName);

        // 1. Transacción de Egreso (Salida) de la cuenta Origen
        const outgoingId = Date.now() + Math.random();
        this.state.transactions.push({
            id: outgoingId,
            date: date,
            description: `Transferencia saliente a ${toAccountName}`,
            type: 'Egreso',
            part: 'B', // Las transferencias se marcan como parte B por convención.
            account: fromAccountName,
            category: 'Transferencia',
            amount: amount,
            currency: fromAccount.currency,
            isTransfer: true,
            transferPartnerAccount: toAccountName,
        });

        // 2. Transacción de Ingreso (Entrada) en la cuenta Destino
        const incomingId = Date.now() + Math.random();
        this.state.transactions.push({
            id: incomingId,
            date: date,
            description: `Transferencia entrante de ${fromAccountName}`,
            type: 'Ingreso',
            part: 'B',
            account: toAccountName,
            category: 'Transferencia',
            amount: receivedAmount, // Monto recibido (puede ser diferente si hay cambio de moneda)
            currency: toAccount.currency,
            isTransfer: true,
            transferPartnerAccount: fromAccountName,
        });

        // 3. Comisión de Origen (Egreso)
        if (feeSource > 0) {
            const feeSourceId = Date.now() + Math.random() + 0.1;
            this.state.transactions.push({
                id: feeSourceId,
                date: date,
                description: `Comisión por transferencia a ${toAccountName}`,
                type: 'Egreso',
                part: 'A',
                account: fromAccountName,
                category: 'Comisión',
                amount: feeSource,
                currency: fromAccount.currency,
                isTransferFee: true,
                transferPartnerAccount: toAccountName,
            });
        }

        this.saveState();
        this.renderAll();
        form.reset();
    },

    // --- PROFORMAS ---

    renderProformas() {
        const tbody = document.getElementById('proformas-table-body');
        const searchTerm = document.getElementById('proformas-search').value.toLowerCase();
        tbody.innerHTML = '';

        const filteredProformas = this.state.proformas
            .filter(p => p.number.toLowerCase().includes(searchTerm) || p.client.toLowerCase().includes(searchTerm))
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        filteredProformas.forEach(p => {
            let statusClass = '';
            let statusText = '';
            switch (p.status) {
                case 'Pendiente':
                    statusClass = 'bg-yellow-600/30 text-yellow-300';
                    statusText = 'Pendiente';
                    break;
                case 'Pagado':
                    statusClass = 'bg-green-600/30 text-green-300';
                    statusText = 'Pagado';
                    break;
                case 'Anulado':
                    statusClass = 'bg-red-600/30 text-red-300';
                    statusText = 'Anulado';
                    break;
            }

            const row = document.createElement('tr');
            row.className = 'border-b border-gray-800 hover:bg-black/20';
            row.innerHTML = `
                <td class="py-3 px-3">${p.date}</td>
                <td class="py-3 px-3">${p.number}</td>
                <td class="py-3 px-3">${p.client}</td>
                <td class="py-3 px-3 text-right font-semibold">${this.formatCurrency(p.amount, p.currency)}</td>
                <td class="py-3 px-3 text-center">
                    <span class="px-3 py-1 rounded-full text-xs font-medium ${statusClass}">${statusText}</span>
                </td>
                <td class="py-3 px-3 text-center space-x-2">
                    <div class="dropdown inline-block">
                        <button onclick="App.toggleDropdown(this)" class="text-gray-400 hover:text-white" title="Acciones">
                            <i data-lucide="more-vertical" class="w-5 h-5"></i>
                        </button>
                        <div id="dropdown-${p.id}" class="dropdown-content">
                            <button onclick="App.markProformaStatus('${p.id}', 'Pagado')">
                                <i data-lucide="check-circle" class="w-4 h-4 mr-2 inline-block"></i> Marcar como Pagada
                            </button>
                            <button onclick="App.markProformaStatus('${p.id}', 'Anulado')">
                                <i data-lucide="x-circle" class="w-4 h-4 mr-2 inline-block"></i> Anular
                            </button>
                            <button onclick="App.showConfirmationModal('Eliminar Proforma', 'Confirmar Eliminación', '¿Estás seguro de que deseas eliminar la proforma N° ${p.number}?', () => App.deleteProforma('${p.id}'))">
                                <i data-lucide="trash-2" class="w-4 h-4 mr-2 inline-block"></i> Eliminar
                            </button>
                        </div>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
        lucide.createIcons();
    },

    handleProformaSubmit(e) {
        e.preventDefault();
        const form = e.target;

        const proforma = {
            id: Date.now() + Math.random(),
            date: form['proforma-date'].value,
            number: form['proforma-number'].value,
            client: form['proforma-client'].value,
            amount: parseFloat(form['proforma-amount'].value),
            currency: form['proforma-currency'].value,
            status: 'Pendiente',
        };

        this.state.proformas.push(proforma);
        this.saveState();
        this.renderProformas();
        form.reset();
    },

    markProformaStatus(id, status) {
        const proforma = this.state.proformas.find(p => p.id == id);
        if (proforma) {
            proforma.status = status;
            this.saveState();
            this.renderProformas();
        }
    },

    deleteProforma(id) {
        this.state.proformas = this.state.proformas.filter(p => p.id != id);
        this.saveState();
        this.renderProformas();
    },

    toggleDropdown(button) {
        const dropdownId = button.nextElementSibling.id;
        document.querySelectorAll('.dropdown-content').forEach(dropdown => {
            if (dropdown.id !== dropdownId) {
                dropdown.classList.remove('show');
            }
        });
        document.getElementById(dropdownId).classList.toggle('show');
    },

    // Cerrar dropdown si se hace click fuera
    closeDropdowns: (event) => {
        if (!event.target.matches('.dropdown button')) {
            document.querySelectorAll('.dropdown-content').forEach(dropdown => {
                if (dropdown.classList.contains('show')) {
                    dropdown.classList.remove('show');
                }
            });
        }
    },

    // --- REPORTES ---

    updateReportFilters() {
        this.updateDateInput();
        // Lógica para mostrar/ocultar otros filtros según el tipo de reporte
    },

    updateDateInput() {
        const period = document.getElementById('report-period').value;
        const container = document.getElementById('date-input-container');
        let inputHtml = '';
        const currentYear = new Date().getFullYear();

        switch (period) {
            case 'daily':
                inputHtml = `<label for="report-date" class="block text-sm font-medium text-gray-400">Día Específico</label><input type="date" id="report-date" class="form-input mt-1" required>`;
                break;
            case 'weekly':
                const weekNumber = this.getWeekNumber(new Date());
                inputHtml = `<label for="report-week" class="block text-sm font-medium text-gray-400">Semana (del año)</label><input type="number" id="report-week" class="form-input mt-1" value="${weekNumber}" min="1" max="52" required>`;
                break;
            case 'monthly':
                const currentMonth = new Date().toISOString().substring(0, 7); // yyyy-MM
                inputHtml = `<label for="report-month" class="block text-sm font-medium text-gray-400">Mes Específico</label><input type="month" id="report-month" class="form-input mt-1" value="${currentMonth}" required>`;
                break;
            case 'annual':
                let yearOptions = '';
                for (let y = currentYear - 5; y <= currentYear; y++) {
                    yearOptions += `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`;
                }
                inputHtml = `<label for="report-year" class="block text-sm font-medium text-gray-400">Año</label><select id="report-year" class="form-input mt-1">${yearOptions}</select>`;
                break;
        }
        container.innerHTML = inputHtml;
    },

    getWeekNumber(d) {
        // Copia de la fecha para evitar mutación
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        // Establecer el jueves de la semana (por convención ISO)
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        // Obtener el inicio del año
        var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        // Calcular el número de semana
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    },

    handleReportGenerate(e) {
        e.preventDefault();
        const form = e.target;
        const type = form['report-type'].value;
        const period = form['report-period'].value;
        const account = form['report-account'].value;
        const part = form['report-part'].value;
        let dateValue;

        switch (period) {
            case 'daily': dateValue = form['report-date'].value; break;
            case 'weekly': dateValue = form['report-week'].value; break;
            case 'monthly': dateValue = form['report-month'].value; break;
            case 'annual': dateValue = form['report-year'].value; break;
        }

        // Simulación de generación de datos
        let reportData = [];
        let title = '';

        if (type === 'movimientos') {
            title = `Reporte de Movimientos - ${period}`;
            reportData = this.state.transactions.filter(t => !t.isInitialBalance);
            // Aplicar filtros de período, cuenta y parte aquí...
        } else if (type === 'documentos') {
            title = `Reporte de Documentos (Proformas/Facturas) - ${period}`;
            reportData = this.state.proformas;
            // Aplicar filtros...
        } else if (type === 'inversiones') {
            title = `Reporte de Inversiones - ${period}`;
            reportData = [{ name: 'Acción Ejemplo', type: 'Compra', amount: 100, date: '2024-01-01' }];
        }

        this.renderReportDisplay(title, reportData, type, period, account, part, dateValue);
    },

    renderReportDisplay(title, data, type, period, account, part, dateValue) {
        const displayArea = document.getElementById('report-display-area');
        let html = `<h3 class="text-2xl font-bold mb-4">${title}</h3>`;
        html += `<div class="mb-4 text-sm text-gray-400">Filtros: Cuenta: ${account}, Parte: ${part}, Período: ${period} (${dateValue})</div>`;
        html += `<div class="flex gap-2 mb-4">
                     <button id="download-excel" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">Descargar Excel</button>
                     <button id="download-pdf" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">Descargar PDF</button>
                 </div>`;

        // Generar tabla de ejemplo
        if (data.length > 0) {
            html += `<div class="overflow-x-auto h-80">
                         <table id="report-table" class="w-full text-left text-sm">
                             <thead>
                                 <tr class="text-gray-400 border-b border-gray-700">
                                     <th class="py-2 px-3">Fecha</th>
                                     ${type === 'movimientos' ? '<th class="py-2 px-3">Descripción</th><th class="py-2 px-3">Cuenta</th><th class="py-2 px-3">Tipo</th><th class="py-2 px-3 text-right">Monto</th>' : ''}
                                     ${type === 'documentos' ? '<th class="py-2 px-3">N° Documento</th><th class="py-2 px-3">Cliente</th><th class="py-2 px-3 text-right">Monto</th><th class="py-2 px-3">Estado</th>' : ''}
                                     ${type === 'inversiones' ? '<th class="py-2 px-3">Activo</th><th class="py-2 px-3">Tipo</th><th class="py-2 px-3 text-right">Monto</th>' : ''}
                                 </tr>
                             </thead>
                             <tbody>`;

            data.slice(0, 50).forEach(item => { // Limitar a 50 para el preview
                html += `<tr class="border-b border-gray-800">`;
                html += `<td class="py-2 px-3">${item.date}</td>`;

                if (type === 'movimientos') {
                    const account = this.state.accounts.find(a => a.name === item.account);
                    const currency = account ? account.currency : 'USD';
                    const amountFormatted = this.formatCurrency(item.amount, currency);
                    html += `<td class="py-2 px-3">${item.description}</td>`;
                    html += `<td class="py-2 px-3">${item.account}</td>`;
                    html += `<td class="py-2 px-3">${item.type}</td>`;
                    html += `<td class="py-2 px-3 text-right ${item.type === 'Ingreso' ? 'text-green-400' : 'text-red-400'}">${item.type === 'Ingreso' ? '+' : '-'}${amountFormatted}</td>`;
                } else if (type === 'documentos') {
                    html += `<td class="py-2 px-3">${item.number}</td>`;
                    html += `<td class="py-2 px-3">${item.client}</td>`;
                    html += `<td class="py-2 px-3 text-right">${this.formatCurrency(item.amount, item.currency)}</td>`;
                    html += `<td class="py-2 px-3">${item.status}</td>`;
                } else if (type === 'inversiones') {
                    html += `<td class="py-2 px-3">${item.name}</td>`;
                    html += `<td class="py-2 px-3">${item.type}</td>`;
                    html += `<td class="py-2 px-3 text-right">${this.formatCurrency(item.amount, 'USD')}</td>`;
                }

                html += `</tr>`;
            });

            html += `</tbody></table></div>`;
        } else {
            html += `<div class="text-center text-gray-500 py-10">No se encontraron datos para los filtros seleccionados.</div>`;
        }

        displayArea.innerHTML = html;

        // Añadir Event Listeners para la descarga
        document.getElementById('download-excel').addEventListener('click', () => this.downloadReport('excel', title));
        document.getElementById('download-pdf').addEventListener('click', () => this.downloadReport('pdf', title));
    },

    downloadReport(format, filename) {
        const table = document.getElementById('report-table');
        if (!table) {
            alert('No hay tabla de datos para descargar.');
            return;
        }

        if (format === 'excel') {
            const wb = XLSX.utils.table_to_book(table);
            XLSX.writeFile(wb, `${filename}.xlsx`);
        } else if (format === 'pdf') {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            doc.text(filename, 14, 15);
            doc.autoTable({
                html: '#report-table',
                startY: 25,
                headStyles: { fillColor: [30, 41, 59] }, // Slate-800
                styles: { fontSize: 8, cellPadding: 2, textColor: [30, 30, 30] } // Negro para impresión
            });
            doc.save(`${filename}.pdf`);
        }
    },

    // --- ARCHIVOS (CIERRE ANUAL) ---

    renderArchiveYears() {
        const select = document.getElementById('archive-year-select');
        select.innerHTML = '';

        const availableYears = new Set(this.state.archive.map(a => a.year));

        if (availableYears.size === 0) {
            select.innerHTML = '<option value="">No hay archivos</option>';
            document.getElementById('view-archive-btn').disabled = true;
            return;
        }

        [...availableYears].sort((a, b) => b - a).forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            select.appendChild(option);
        });

        document.getElementById('view-archive-btn').disabled = false;
    },

    handleArchiveYearChange(e) {
        const displayArea = document.getElementById('archive-display-area');
        if (e.target.value) {
            displayArea.innerHTML = `
                <div class="text-center text-gray-500 py-10">
                    <i data-lucide="folder-search" class="w-16 h-16 mx-auto mb-4"></i>
                    <p>Haga clic en **"Ver Archivo"** para cargar los datos de ${e.target.value}.</p>
                </div>
            `;
            lucide.createIcons();
        }
    },

    renderArchiveData() {
        const year = document.getElementById('archive-year-select').value;
        const displayArea = document.getElementById('archive-display-area');
        const archiveEntry = this.state.archive.find(a => a.year == year);

        if (!archiveEntry) {
            displayArea.innerHTML = `<div class="text-center text-red-500 py-10">Error: No se encontró el archivo para el año ${year}.</div>`;
            return;
        }

        // Renderizar un resumen del archivo
        const totalTransactions = archiveEntry.transactions.length;
        const totalProformas = archiveEntry.proformas.length;
        const totalFinalBalance = archiveEntry.finalBalances.reduce((sum, bal) => sum + bal.balance, 0);

        let balancesHtml = '<h4>Saldos Finales de Cuentas:</h4><ul>';
        archiveEntry.finalBalances.forEach(bal => {
            balancesHtml += `<li class="text-sm ml-4">${bal.account}: ${this.formatCurrency(bal.balance, bal.currency)}</li>`;
        });
        balancesHtml += '</ul>';

        displayArea.innerHTML = `
            <div class="card p-6 rounded-xl">
                <h3 class="font-bold text-xl mb-4 text-green-400">Archivo Anual ${year} - Resumen</h3>
                <p class="text-gray-300">Este archivo contiene los datos cerrados del período ${archiveEntry.startDate} al ${archiveEntry.endDate}.</p>
                
                <div class="grid grid-cols-3 gap-4 mt-6">
                    <div class="p-4 bg-gray-800 rounded-lg">
                        <p class="text-sm text-gray-400">Movimientos Archivados</p>
                        <p class="text-2xl font-bold">${totalTransactions}</p>
                    </div>
                    <div class="p-4 bg-gray-800 rounded-lg">
                        <p class="text-sm text-gray-400">Proformas Archivadas</p>
                        <p class="text-2xl font-bold">${totalProformas}</p>
                    </div>
                    <div class="p-4 bg-gray-800 rounded-lg">
                        <p class="text-sm text-gray-400">Balance Total Final</p>
                        <p class="text-2xl font-bold">${this.formatCurrency(totalFinalBalance, 'USD')}</p>
                    </div>
                </div>

                <div class="mt-6 p-4 bg-gray-800/50 rounded-lg">
                    ${balancesHtml}
                </div>

                <div class="mt-6 flex gap-2 justify-end">
                    <button id="download-archive-excel" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                        <i data-lucide="download" class="w-4 h-4 mr-2 inline-block"></i> Descargar Datos Archivo
                    </button>
                </div>
            </div>
        `;
        lucide.createIcons();

        document.getElementById('download-archive-excel').addEventListener('click', () => {
            // Simular descarga de un archivo grande.
            alert(`Simulando descarga de todos los datos de ${year} en formato Excel.`);
        });
    },

    closeYear() {
        const startDate = document.getElementById('cierre-start-date').value;
        const endDate = document.getElementById('cierre-end-date').value;
        const cierreYear = new Date(endDate).getFullYear();

        if (!startDate || !endDate || isNaN(cierreYear)) {
            alert('Por favor, ingrese un rango de fechas válido.');
            return;
        }

        // 1. Archivar datos antiguos
        const archivedTransactions = this.state.transactions.filter(t => new Date(t.date) <= new Date(endDate));
        const archivedProformas = this.state.proformas.filter(p => new Date(p.date) <= new Date(endDate));

        const archiveEntry = {
            year: cierreYear,
            startDate: startDate,
            endDate: endDate,
            transactions: archivedTransactions,
            proformas: archivedProformas,
            finalBalances: [],
        };

        // 2. Calcular saldos finales y crear nuevas transacciones de saldo inicial
        const newTransactions = [];
        const newAccounts = JSON.parse(JSON.stringify(this.state.accounts)); // Clonar cuentas

        newAccounts.forEach(account => {
            const finalBalance = this.calculateBalanceForAccount(account.name, new Date(endDate));

            archiveEntry.finalBalances.push({
                account: account.name,
                currency: account.currency,
                balance: finalBalance,
            });

            // Crear nueva transacción de saldo inicial (reemplaza la antigua)
            const newInitialTransaction = {
                id: Date.now() + Math.random() + new Date().getSeconds(),
                date: new Date(new Date(endDate).getTime() + 86400000).toISOString().split('T')[0], // Día siguiente al cierre
                description: `Saldo Inicial después del Cierre Anual ${cierreYear}`,
                type: 'Ingreso',
                part: 'A',
                account: account.name,
                category: 'Saldo Inicial',
                amount: finalBalance,
                currency: account.currency,
                isInitialBalance: true,
            };
            newTransactions.push(newInitialTransaction);
        });

        // 3. Limpiar estado
        this.state.transactions = this.state.transactions.filter(t => new Date(t.date) > new Date(endDate));
        this.state.transactions = this.state.transactions.filter(t => !t.isInitialBalance); // Eliminar antiguos saldos iniciales

        // 4. Agregar nuevos saldos iniciales
        this.state.transactions.push(...newTransactions);

        // 5. Vaciar proformas (asumiendo que las pendientes se vuelven a crear o se archivan)
        this.state.proformas = this.state.proformas.filter(p => new Date(p.date) > new Date(endDate));

        // 6. Agregar a archivo
        this.state.archive.push(archiveEntry);

        this.saveState();
        alert(`¡Cierre de Año ${cierreYear} realizado con éxito!`);
        this.renderAll();
        document.getElementById('cierre-start-date').value = '';
        document.getElementById('cierre-end-date').value = '';
    },

    // --- AJUSTES ---

    renderAllSettings() {
        this.renderSettingsAccountsList();
        this.renderSettingsCategories();
        this.renderAccountsSelects(); // Para el select de Actualizar Saldo
        this.renderModuleSettings();
        // Mostrar/Ocultar el panel de AEAT
        document.getElementById('aeat-settings-card').classList.toggle('hidden', !this.state.modules.facturacion);
    },

    renderSettingsAccountsList() {
        const list = document.getElementById('settings-accounts-list');
        list.innerHTML = '';

        this.state.accounts.forEach(account => {
            const balance = this.calculateBalance(account.name);
            const item = document.createElement('div');
            item.className = 'flex items-center justify-between p-2 bg-gray-800/50 rounded-lg border border-gray-700';
            item.innerHTML = `
                <div class="flex items-center gap-2">
                    <span class="text-blue-400">${account.logo.replace(/class=".*?"/g, 'class="w-4 h-4"')}</span>
                    <span class="font-medium">${account.name}</span>
                    <span class="text-xs text-gray-400">(${account.currency})</span>
                </div>
                <div class="flex items-center gap-3">
                    <span class="text-sm font-semibold">${this.formatCurrency(balance, account.currency)}</span>
                    <button onclick="App.showConfirmationModal('Eliminar Cuenta', 'Confirmar Eliminación', '¿Estás seguro de que deseas eliminar la cuenta ${account.name}? Se eliminarán todas sus transacciones relacionadas.', () => App.deleteAccount('${account.id}'))" class="text-red-400 hover:text-red-300">
                        <i data-lucide="x" class="w-4 h-4"></i>
                    </button>
                </div>
            `;
            list.appendChild(item);
            lucide.createIcons();
        });
    },

    handleAddAccount(e) {
        e.preventDefault();
        const form = e.target;
        const name = form['new-account-name'].value;
        const currency = form['new-account-currency'].value;
        const initialBalance = parseFloat(form['new-account-balance'].value);
        const logo = form['new-account-logo'].value || '<i data-lucide="landmark"></i>';

        const newAccount = {
            id: Date.now(),
            name,
            currency,
            initialBalance,
            logo,
        };

        this.state.accounts.push(newAccount);

        // Crear la transacción de saldo inicial para la nueva cuenta
        this.state.transactions.push({
            id: Date.now() + Math.random(),
            date: new Date().toISOString().split('T')[0],
            description: `Saldo Inicial - ${name}`,
            type: 'Ingreso',
            part: 'A',
            account: name,
            category: 'Saldo Inicial',
            amount: initialBalance,
            currency: currency,
            isInitialBalance: true,
        });

        this.saveState();
        this.renderAllSettings();
        this.renderAll();
        form.reset();
    },

    deleteAccount(id) {
        const accountToDelete = this.state.accounts.find(a => a.id == id);
        if (!accountToDelete) return;

        // Eliminar transacciones de la cuenta
        this.state.transactions = this.state.transactions.filter(t => t.account !== accountToDelete.name);

        // Eliminar la cuenta
        this.state.accounts = this.state.accounts.filter(a => a.id != id);

        this.saveState();
        this.renderAllSettings();
        this.renderAll();
    },

    renderSettingsCategories() {
        const incomeList = document.getElementById('income-categories-list');
        const expenseList = document.getElementById('expense-categories-list');
        incomeList.innerHTML = '';
        expenseList.innerHTML = '';

        this.state.categories.Ingreso.filter(c => c !== 'Saldo Inicial').forEach(category => {
            incomeList.innerHTML += this.createCategoryListItem(category, 'Ingreso');
        });

        this.state.categories.Egreso.filter(c => c !== 'Transferencia' && c !== 'Comisión').forEach(category => {
            expenseList.innerHTML += this.createCategoryListItem(category, 'Egreso');
        });

        lucide.createIcons();
    },

    createCategoryListItem(category, type) {
        return `
            <div class="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg border border-gray-700">
                <span class="text-sm">${category}</span>
                <button onclick="App.showConfirmationModal('Eliminar Categoría', 'Confirmar Eliminación', '¿Estás seguro de que deseas eliminar la categoría **${category}**?', () => App.deleteCategory('${category}', '${type}'))" class="text-red-400 hover:text-red-300">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
        `;
    },

    handleAddCategory(e, type) {
        e.preventDefault();
        const input = document.getElementById(`new-${type.toLowerCase()}-category`);
        const newCategory = input.value.trim();

        if (newCategory && !this.state.categories[type].includes(newCategory)) {
            this.state.categories[type].push(newCategory);
            this.saveState();
            this.renderSettingsCategories();
            this.renderCategoriesSelects();
            input.value = '';
        }
    },

    deleteCategory(category, type) {
        this.state.categories[type] = this.state.categories[type].filter(c => c !== category);
        this.saveState();
        this.renderSettingsCategories();
        this.renderCategoriesSelects();
    },

    handleUpdateBalance(e) {
        e.preventDefault();
        const form = e.target;
        const accountName = form['update-account-select'].value;
        const newBalance = parseFloat(form['new-balance-amount'].value);

        const currentBalance = this.calculateBalance(accountName);
        const difference = newBalance - currentBalance;

        if (difference === 0) {
            alert('El nuevo saldo es el mismo que el actual.');
            return;
        }

        const account = this.state.accounts.find(a => a.name === accountName);
        const transactionType = difference > 0 ? 'Ingreso' : 'Egreso';
        const amount = Math.abs(difference);

        const newAdjustment = {
            id: Date.now() + Math.random(),
            date: new Date().toISOString().split('T')[0],
            description: `Ajuste de Saldo - ${transactionType}`,
            type: transactionType,
            part: 'A',
            account: accountName,
            category: 'Ajuste de Saldo',
            amount: amount,
            currency: account.currency,
            isAdjustment: true,
        };

        this.state.transactions.push(newAdjustment);
        this.saveState();
        this.renderAll();
        form.reset();
        alert(`Ajuste de ${this.formatCurrency(amount, account.currency)} (${transactionType}) registrado con éxito.`);
    },

    renderModuleSettings() {
        const list = document.getElementById('modules-list');
        list.innerHTML = '';
        const availableModules = [
            { id: 'facturacion', name: 'Facturación Electrónica (AEAT)', description: 'Permite la gestión de facturas y la conexión a sistemas fiscales.' },
            { id: 'usuarios', name: 'Gestión de Usuarios', description: 'Añade la posibilidad de crear diferentes roles y permisos.' },
            { id: 'inversiones', name: 'Módulo de Inversiones', description: 'Seguimiento de portafolio de activos financieros.' }
        ];

        availableModules.forEach(mod => {
            const isActive = this.state.modules[mod.id];
            list.innerHTML += `
                <div class="card p-4 rounded-xl flex justify-between items-center">
                    <div>
                        <h4 class="font-semibold">${mod.name}</h4>
                        <p class="text-xs text-gray-400">${mod.description}</p>
                    </div>
                    <label class="flex items-center cursor-pointer">
                        <div class="relative">
                            <input type="checkbox" id="module-toggle-${mod.id}" class="sr-only" ${isActive ? 'checked' : ''} onchange="App.toggleModule('${mod.id}', this.checked)">
                            <div class="block bg-gray-600 w-11 h-6 rounded-full"></div>
                            <div class="toggle-bg absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-300"></div>
                        </div>
                    </label>
                </div>
            `;
        });
    },

    toggleModule(moduleId, isActive) {
        this.state.modules[moduleId] = isActive;
        this.saveState();
        this.renderSidebar();
        this.renderAllSettings(); // Para actualizar la visibilidad del panel AEAT
    },

    // --- MODAL Y CONFIRMACIÓN ---

    showConfirmationModal(title, buttonText, message, callback) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-message').innerHTML = message;
        document.getElementById('confirm-action-btn').textContent = buttonText;
        document.getElementById('confirmation-modal').classList.remove('hidden');

        const confirmBtn = document.getElementById('confirm-action-btn');
        const cancelBtn = document.getElementById('cancel-action-btn');

        // Limpiar listeners anteriores
        confirmBtn.replaceWith(confirmBtn.cloneNode(true));
        cancelBtn.replaceWith(cancelBtn.cloneNode(true));

        const newConfirmBtn = document.getElementById('confirm-action-btn');
        const newCancelBtn = document.getElementById('cancel-action-btn');

        const confirmHandler = () => {
            callback();
            document.getElementById('confirmation-modal').classList.add('hidden');
        };

        const cancelHandler = () => {
            document.getElementById('confirmation-modal').classList.add('hidden');
        };

        newConfirmBtn.addEventListener('click', confirmHandler);
        newCancelBtn.addEventListener('click', cancelHandler);
        document.getElementById('confirmation-modal-backdrop').addEventListener('click', cancelHandler);
    },

    // --- FACTURACIÓN ---

    handleFacturacionTabClick(e, tab) {
        e.preventDefault();
        document.querySelectorAll('.tab-button-inner').forEach(btn => {
            btn.classList.remove('active', 'border-blue-500', 'text-blue-500');
            btn.classList.add('border-transparent', 'text-gray-400', 'hover:text-gray-200', 'hover:border-gray-500');
        });
        e.currentTarget.classList.add('active');
        e.currentTarget.classList.remove('border-transparent', 'text-gray-400', 'hover:text-gray-200', 'hover:border-gray-500');
        e.currentTarget.classList.add('border-blue-500', 'text-blue-500');


        document.getElementById('facturacion-content-crear').classList.add('hidden');
        document.getElementById('facturacion-content-config').classList.add('hidden');

        if (tab === 'crear') {
            document.getElementById('facturacion-content-crear').classList.remove('hidden');
        } else if (tab === 'config') {
            document.getElementById('facturacion-content-config').classList.remove('hidden');
        }
    },

    addFacturaItemField() {
        const container = document.getElementById('factura-items-container');
        const itemIndex = container.children.length;

        const itemHtml = `
            <div id="factura-item-${itemIndex}" class="grid grid-cols-12 gap-2 p-2 bg-gray-900/50 rounded-lg">
                <input type="text" name="item-description" class="form-input col-span-5" placeholder="Descripción" required>
                <input type="number" name="item-quantity" class="form-input col-span-2" placeholder="Cant." min="1" step="1" value="1" oninput="App.updateInvoiceTotals()">
                <input type="number" name="item-unit-price" class="form-input col-span-3" placeholder="Precio Unit." min="0.01" step="0.01" value="100.00" oninput="App.updateInvoiceTotals()">
                <div class="col-span-2 flex items-center justify-end gap-1">
                    <span class="text-sm font-medium" id="item-total-${itemIndex}">0.00</span>
                    <button type="button" onclick="document.getElementById('factura-item-${itemIndex}').remove(); App.updateInvoiceTotals();" class="text-red-400 hover:text-red-300 p-1">
                         <i data-lucide="x" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', itemHtml);
        this.updateInvoiceTotals();
    },

    updateInvoiceTotals() {
        const container = document.getElementById('factura-items-container');
        const currency = document.getElementById('factura-currency').value;
        let subtotal = 0;
        const symbol = this.getCurrencySymbol(currency);

        container.querySelectorAll('[id^="factura-item-"]').forEach((itemElement, index) => {
            const quantity = parseFloat(itemElement.querySelector('[name="item-quantity"]').value) || 0;
            const price = parseFloat(itemElement.querySelector('[name="item-unit-price"]').value) || 0;
            const itemTotal = quantity * price;
            subtotal += itemTotal;
            document.getElementById(`item-total-${index}`).textContent = this.formatCurrency(itemTotal, currency);
        });

        const taxRate = 0.21; // 21% de IVA
        const tax = subtotal * taxRate;
        const total = subtotal + tax;

        document.getElementById('factura-subtotal').textContent = this.formatCurrency(subtotal, currency);
        document.getElementById('factura-tax').textContent = this.formatCurrency(tax, currency);
        document.getElementById('factura-total').textContent = this.formatCurrency(total, currency);
    },

    handleGenerateInvoice(e) {
        e.preventDefault();
        this.updateInvoiceTotals();

        const form = e.target;
        const invoiceData = {
            operationType: form['factura-operation-type'].value,
            client: form['factura-cliente'].value,
            nif: form['factura-nif'].value,
            number: form['factura-numero'].value,
            date: form['factura-fecha'].value,
            currency: form['factura-currency'].value,
            items: [],
            totals: {
                subtotal: parseFloat(document.getElementById('factura-subtotal').textContent.replace(this.getCurrencySymbol(form['factura-currency'].value), '').replace(/,/g, '')),
                tax: parseFloat(document.getElementById('factura-tax').textContent.replace(this.getCurrencySymbol(form['factura-currency'].value), '').replace(/,/g, '')),
                total: parseFloat(document.getElementById('factura-total').textContent.replace(this.getCurrencySymbol(form['factura-currency'].value), '').replace(/,/g, '')),
            },
        };

        const container = document.getElementById('factura-items-container');
        container.querySelectorAll('[id^="factura-item-"]').forEach(itemElement => {
            invoiceData.items.push({
                description: itemElement.querySelector('[name="item-description"]').value,
                quantity: parseFloat(itemElement.querySelector('[name="item-quantity"]').value),
                unitPrice: parseFloat(itemElement.querySelector('[name="item-unit-price"]').value),
            });
        });

        console.log('Datos de Factura a Generar (simulado):', invoiceData);

        // Lógica de simulación de generación y envío al backend (AEAT)
        if (this.state.modules.facturacion) {
            // Simular respuesta exitosa de AEAT
            const verificationCode = `VERI-${Math.random().toString(36).substring(2, 15).toUpperCase()}`;
            document.getElementById('aeat-status-message').textContent = 'Factura generada y enviada a la AEAT con éxito.';
            document.getElementById('aeat-verification-code').textContent = `Código de Verificación: ${verificationCode}`;
            document.getElementById('aeat-verification-code').classList.remove('hidden');
            document.getElementById('aeat-status-panel').classList.remove('border-yellow-500/50');
            document.getElementById('aeat-status-panel').classList.add('border-green-500/50');
            document.getElementById('aeat-status-panel').querySelector('i').className = 'w-6 h-6 text-green-500 flex-shrink-0';
        } else {
            document.getElementById('aeat-status-message').textContent = 'Factura generada localmente. El módulo AEAT no está activo, no se ha enviado el registro.';
            document.getElementById('aeat-verification-code').classList.add('hidden');
            document.getElementById('aeat-status-panel').classList.remove('border-yellow-500/50');
            document.getElementById('aeat-status-panel').classList.add('border-blue-500/50');
            document.getElementById('aeat-status-panel').querySelector('i').className = 'w-6 h-6 text-blue-500 flex-shrink-0';
        }

        document.getElementById('aeat-status-panel').classList.remove('hidden');

        alert(`Factura ${invoiceData.number} generada con éxito.`);
    },
};

// Inicialización de la aplicación
window.onload = function() {
    App.init();
    // Añadir listener de cierre de dropdown a la ventana
    window.addEventListener('click', App.closeDropdowns);
    // Inicializar el formulario de facturación
    App.addFacturaItemField(); // Añadir un concepto por defecto
    // Añadir listeners para actualizar totales de factura al cambiar moneda
    document.getElementById('factura-currency').addEventListener('change', () => App.updateInvoiceTotals());
};