// js/state.js

export function getDefaultState() {
    return {
        accounts: [
            { id: self.crypto.randomUUID(), name: 'CAIXA Bank', currency: 'EUR', symbol: '€', balance: 0.00, logoHtml: `<svg viewBox="0 0 80 60" class="w-6 h-6"><path d="M48.4,0L22.8,27.3c-0.3,0.3-0.3,0.8,0,1.1L48.4,56c1,1.1,2.8,0.4,2.8-1.1V36.8c0-1,0.8-1.7,1.7-1.7h11.2c8.8,0,15.9-7.1,15.9-15.9S83.1,2.3,74.3,2.3H64c-1,0-1.7-0.8-1.7-1.7V1.1C62.3,0.1,49.1-0.7,48.4,0z" fill="#0073B7"></path><circle cx="23.3" cy="28" r="5.5" fill="#FFC107"></circle><circle cx="23.3" cy="44.6" r="6.8" fill="#E6532B"></circle></svg>` },
            { id: self.crypto.randomUUID(), name: 'Banco WISE', currency: 'USD', symbol: '$', balance: 0.00, logoHtml: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" class="w-6 h-6"><path fill="#a3e635" d="M50.9 64H64L33 20.6L24 34.3l15.1 21.7-10.8-16L18.3 56 33 34.3 43 20.6 11.7 64h13.2L4 39.1l2.8 3.8-6.4 7.6L33 26.3 0 64h12.9L33 36l17.9 28z"></path></svg>` }
        ],
        transactions: [],
        documents: [],
        incomeCategories: ['Ventas', 'Servicios', 'Otros Ingresos', 'Transferencia', 'Ajuste de Saldo'],
        expenseCategories: ['Operaciones', 'Marketing', 'Salarios', 'Software', 'Impuestos', 'Otros Gastos', 'Inversión', 'Transferencia', 'Comisiones', 'Ajuste de Saldo'],
        invoiceOperationTypes: ['Nacional / Intracomunitaria (UE)', 'Exportación (Fuera de la UE)'],
        archivedData: {},
        activeReport: null,
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
            app.state = { ...getDefaultState(), ...parsedData };
        } catch (error) {
            console.error("Error al cargar datos, restaurando estado por defecto.", error);
            app.state = getDefaultState();
        }
    } else {
        app.state = getDefaultState();
    }
}

export function saveData(state) {
    try {
        const stateToSave = { ...state, activeReport: null };
        localStorage.setItem('financeDashboardData', JSON.stringify(stateToSave));
    } catch (error) {
        console.error("Error al guardar datos en localStorage:", error);
    }
}

export function recalculateAllBalances(state) {
    state.accounts.forEach(account => {
        const balance = state.transactions
            .filter(t => t.account === account.name)
            .reduce((sum, t) => sum + (t.type === 'Ingreso' ? t.amount : -t.amount), 0);
        account.balance = balance;
    });
}

export function addFacturaItem(app) {
    const itemHtml = `
        <div class="grid grid-cols-12 gap-2 factura-item-row items-center">
            <div class="col-span-6">
                <input type="text" class="form-input factura-item-concept" placeholder="Descripción del servicio" required>
            </div>
            <div class="col-span-2">
                <input type="number" class="form-input factura-item-quantity" value="1" min="1" step="1" required>
            </div>
            <div class="col-span-3">
                <input type="number" class="form-input factura-item-price" placeholder="0.00" min="0" step="0.01" required>
            </div>
            <div class="col-span-1 text-right">
                <button type="button" class="factura-remove-item-btn p-2 text-red-400 hover:text-red-300">
                    <i data-lucide="x-circle" class="w-5 h-5"></i>
                </button>
            </div>
        </div>`;
    app.elements.facturaItemsContainer.insertAdjacentHTML('beforeend', itemHtml);
    lucide.createIcons();
}

export function updateFacturaSummary(app) {
    let subtotal = 0;
    const currency = app.elements.facturaCurrency.value;
    const operationType = app.elements.facturaOperationType.value;

    app.elements.facturaItemsContainer.querySelectorAll('.factura-item-row').forEach(row => {
        const quantity = parseFloat(row.querySelector('.factura-item-quantity').value) || 0;
        const price = parseFloat(row.querySelector('.factura-item-price').value) || 0;
        subtotal += quantity * price;
    });

    const isExport = operationType.includes('Exportación');
    const ivaRate = isExport ? 0 : 0.21;
    const iva = subtotal * ivaRate;
    const total = subtotal + iva;

    document.getElementById('factura-subtotal').textContent = formatCurrency(subtotal, currency);
    document.getElementById('factura-iva').textContent = formatCurrency(iva, currency);
    document.getElementById('factura-total').textContent = formatCurrency(total, currency);
}

export function switchFacturacionTab(tabId) {
    const tabs = ['crear', 'listado', 'config'];
    tabs.forEach(id => {
        document.getElementById(`facturacion-tab-${id}`).classList.toggle('active', id === tabId);
        document.getElementById(`facturacion-content-${id}`).classList.toggle('hidden', id !== tabId);
    });
}