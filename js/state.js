import { elements } from './ui.js';
import { escapeHTML } from './utils.js';

export function getDefaultState() {
    return {
        accounts: [
            { id: crypto.randomUUID(), name: 'CAIXA Bank', currency: 'EUR', symbol: '€', balance: 0.00, logoHtml: `<svg viewBox="0 0 80 60" class="w-6 h-6"><path d="M48.4,0L22.8,27.3c-0.3,0.3-0.3,0.8,0,1.1L48.4,56c1,1.1,2.8,0.4,2.8-1.1V36.8c0-1,0.8-1.7,1.7-1.7h11.2c8.8,0,15.9-7.1,15.9-15.9S83.1,2.3,74.3,2.3H64c-1,0-1.7-0.8-1.7-1.7V1.1C62.3,0.1,49.1-0.7,48.4,0z" fill="#0073B7"></path><circle cx="23.3" cy="28" r="5.5" fill="#FFC107"></circle><circle cx="23.3" cy="44.6" r="6.8" fill="#E6532B"></circle></svg>` },
            { id: crypto.randomUUID(), name: 'Banco WISE', currency: 'USD', symbol: '$', balance: 0.00, logoHtml: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" class="w-6 h-6"><path fill="#a3e635" d="M50.9 64H64L33 20.6L24 34.3l15.1 21.7-10.8-16L18.3 56 33 34.3 43 20.6 11.7 64h13.2L4 39.1l2.8 3.8-6.4 7.6L33 26.3 0 64h12.9L33 36l17.9 28z"></path></svg>` },
            { id: crypto.randomUUID(), name: 'Caja Chica', currency: 'EUR', symbol: '€', balance: 0.00, logoHtml: `<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzIDIiPjxwYXRoIGZpbGw9IiNDNjBCMUUiIGQ9Ik0wIDBoM3YySDB6Ii8+PHBhdGggZmlsbD0iI0ZGQzQwMCIgZD0iTTAgLjVoM3YxSDB6Ii8+PC9zdmc+" alt="Bandera de España" class="w-6 h-6 rounded-sm border border-gray-600">` },
            { id: crypto.randomUUID(), name: 'Caja Eu', currency: 'USD', symbol: '$', balance: 0.00, logoHtml: `<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA5MDAgNjAwIj48cGF0aCBmaWxsPSIjMDAzMzk5IiBkPSJNMCAwaDkwMHY2MDBIMHoiLz48ZyBmaWxsPSIjRkZDQzAwIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0NTAgMzAwKSI+PGNpcmNsZSByPSIzMCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCAtMjAwKSIvPjxjaXJjbGUgcj0iMzAiIHRyYW5zZm9ybT0icm90YXRlKDMwKSB0cmFuc2xhdGUoMCAtMjAwKSIvPjxjaXJjbGUgcj0iMzAiIHRyYW5zZm9ybT0icm90YXRlKDkwKSB0cmFuc2xhdGUoMCAtMjAwKSIvPjxjaXJjbGUgcj0iMzAiIHRyYW5zZm9ybT0icm90YXRlKDEyMCkgdHJhbnNsYXRlKDAsIC0yMDApIi8+PGNpcmNsZSByPSIzMCIgdHJhbnNmb3JtPSJyb3RhdGUoMTUwKSB0cmFuc2xhdGUoMCAtMjAwKSIvPjxjaXJjbGUgcj0iMzAiIHRyYW5zZm9ybT0icm90YXRlKDE4MCkgdHJhbnNsYXRlKDAsIC0yMDApIi8+PGnpcmNsZSByPSIzMCIgdHJhbnNmb3JtPSJyb3RhdGUoMjEwKSB0cmFuc2xhdGUoMCAtMjAwKSIvPjxjaXJjbGUgcj0iMzAiIHRyYW5zZm9ybT0icm90YXRlKDI0MCkgdHJhbnNsYXRlKDAsIC0yMDApIi8+PGNpcmNsZSByPSIzMCIgdHJhbnNmb3JtPSJyb3RhdGUoMjcwKSB0cmFuc2xhdGUoMCAtMjAwKSIvPjxjaXJjbGUgcj0iMzAiIHRyYW5zZm9ybT0icm90YXRlKDMwMCkgdHJhbnNsYXRlKDAsIC0yMDApIi8+PGNpcmNsZSByPSIzMCIgdHJhbnNmb3JtPSJyb3RhdGUoMzMwKSB0cmFuc2xhdGUoMCAtMjAwKSIvPjwvZz48L3N2Zz4=" alt="Bandera de la Unión Europea" class="w-6 h-6 rounded-sm border border-gray-600">` },
            { id: crypto.randomUUID(), name: 'Caja Arg.', currency: 'USD', symbol: '$', balance: 0.00, logoHtml: `<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA5IDYiPjxyZWN0IGZpbGw9IiM3NEFDREYiIHdpZHRoPSI5IiBoZWlnaHQ9IjMiLz48cmVjdCB5PSIzIiBmaWxsPSIjNzRBQ0RGIiB3aWR0aD0iOSIgaGVpZHRoPSIzIi8+PHJlY3QgeT0iMiIgZmlsbD0iI0ZGRiIgd2lkdGg9IjkiIGhlaWdodD0iMiIvPjwvc3ZnPg==" alt="Bandera de Argentina" class="w-6 h-6 rounded-sm border border-gray-600">` },
            { id: crypto.randomUUID(), name: 'Caja Py', currency: 'USD', symbol: '$', balance: 0.00, logoHtml: `<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMSA2Ij48cGF0aCBmaWxsPSIjRDUyQjFFIiBkPSJNMCAwaDExdjJIMHoiLz48cGF0aCBmaWxsPSIjRkZGIiBkPSJNMCAyaDExdjJIMHoiLz48cGF0aCBmaWxsPSIjMDAzOEE4IiBkPSJNMCA0aDExdjJIMHoiLz48L3N2Zz4=" alt="Bandera de Paraguay" class="w-6 h-6 rounded-sm border border-gray-600">` }
        ],
        transactions: [],
        documents: [],
        clients: [], // <-- NUEVO
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
            fiscalParameters: {
                corporateTaxRate: 17
            }
        }
    };
}

export function loadData(app) {
    const savedData = localStorage.getItem('financeDashboardData');
    if (savedData) {
        try {
            const parsedData = JSON.parse(savedData);
            const defaultState = getDefaultState();
            const newState = { ...defaultState };

            ['accounts', 'transactions', 'documents', 'clients', 'incomeCategories', 'expenseCategories', 'invoiceOperationTypes'].forEach(key => { // <-- clients AÑADIDO
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
            app.state = newState;

        } catch(error) {
            console.error("Error crítico al cargar o fusionar datos. Se restaurará al estado por defecto.", error);
            app.setDefaultState();
        }
    } else {
        app.setDefaultState();
    }
}

export function saveData(state) {
    try {
        const stateToSave = { ...state, activeReport: { type: null, data: [] } };
        localStorage.setItem('financeDashboardData', JSON.stringify(stateToSave));
    } catch (error) {
        console.error("Error al guardar datos en localStorage:", error);
    }
}

export function recalculateAllBalances(state) {
    const initialBalances = new Map();
    state.accounts.forEach(acc => {
        const initialTransaction = state.transactions.find(t => t.isInitialBalance && t.account === acc.name);
        initialBalances.set(acc.name, initialTransaction ? initialTransaction.amount : 0);
    });
    state.accounts.forEach(account => {
        let currentBalance = initialBalances.get(account.name) || 0;
        state.transactions
            .filter(t => t.account === account.name && !t.isInitialBalance)
            .forEach(t => {
                currentBalance += (t.type === 'Ingreso' ? t.amount : -t.amount);
            });
        account.balance = currentBalance;
    });
}

export function addFacturaItem(app) {
    const itemId = crypto.randomUUID();
    const itemDiv = document.createElement('div');
    itemDiv.className = 'grid grid-cols-12 gap-2 items-center factura-item';
    itemDiv.dataset.id = itemId;

    itemDiv.innerHTML = `
        <div class="col-span-6">
            <input type="text" class="form-input item-description" placeholder="Descripción del producto o servicio" required>
        </div>
        <div class="col-span-2">
            <input type="number" class="form-input item-quantity" value="1" min="0" step="any" required>
        </div>
        <div class="col-span-3">
            <input type="number" class="form-input item-price" placeholder="Precio" min="0" step="any" required>
        </div>
        <div class="col-span-1 flex justify-center">
            <button type="button" class="remove-item-btn p-2 text-red-400 hover:text-red-300">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
        </div>
    `;

    elements.facturaItemsContainer.appendChild(itemDiv);
    lucide.createIcons();

    itemDiv.querySelector('.remove-item-btn').addEventListener('click', () => {
        itemDiv.remove();
        app.updateFacturaSummary();
    });

    ['.item-quantity', '.item-price'].forEach(selector => {
        itemDiv.querySelector(selector).addEventListener('input', () => app.updateFacturaSummary());
    });
}

export function updateFacturaSummary(app) {
    const currency = document.getElementById('factura-currency').value;
    const operationType = elements.facturaOperationType.value;
    const isExport = operationType.toLowerCase().includes('exportación');
    const ivaRate = isExport ? 0 : 0.21;

    let subtotal = 0;
    document.querySelectorAll('.factura-item').forEach(item => {
        const quantity = parseFloat(item.querySelector('.item-quantity').value) || 0;
        const price = parseFloat(item.querySelector('.item-price').value) || 0;
        subtotal += quantity * price;
    });

    const iva = subtotal * ivaRate;
    const total = subtotal + iva;

    document.getElementById('factura-subtotal').textContent = app.formatCurrency(subtotal, currency);
    document.getElementById('factura-iva-label').textContent = `IVA (${(ivaRate * 100).toFixed(0)}%):`;
    document.getElementById('factura-iva').textContent = app.formatCurrency(iva, currency);
    document.getElementById('factura-total').textContent = app.formatCurrency(total, currency);
}

export function switchFacturacionTab(tabId, app) {
    document.querySelectorAll('#facturacion-content-crear, #facturacion-content-listado, #facturacion-content-config').forEach(el => {
        el.classList.add('hidden');
    });
    document.getElementById(`facturacion-content-${tabId}`).classList.remove('hidden');

    document.querySelectorAll('.tab-button-inner').forEach(btn => {
        btn.classList.remove('active');
        btn.classList.add('border-transparent', 'text-gray-400', 'hover:text-gray-200', 'hover:border-gray-500');
    });
    const activeButton = document.getElementById(`facturacion-tab-${tabId}`);
    activeButton.classList.add('active');
    activeButton.classList.remove('border-transparent', 'text-gray-400', 'hover:text-gray-200', 'hover:border-gray-500');
    
    if (tabId === 'listado') {
        app.renderFacturas();
    }
}