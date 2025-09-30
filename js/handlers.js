import { elements, updateAll, populateCategories, updateCurrencySymbol, updateTransferFormUI, showInvoiceViewer, hideInvoiceViewer, printInvoice, downloadInvoiceAsPDF } from './ui.js';
import { escapeHTML } from './utils.js';

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

    elements.transactionForm.addEventListener('submit', (e) => app.handleTransactionFormSubmit(e));
    elements.transactionsTableBody.addEventListener('click', (e) => app.handleTransactionsTableClick(e));
    document.getElementById('transaction-type').addEventListener('change', () => populateCategories(app.state));
    document.getElementById('transaction-account').addEventListener('change', () => updateCurrencySymbol(app.state));
    document.getElementById('cashflow-search').addEventListener('input', () => app.renderTransactions());

    elements.transferForm.addEventListener('submit', (e) => app.handleTransferFormSubmit(e));
    ['transfer-from', 'transfer-to'].forEach(id => {
        document.getElementById(id).addEventListener('change', () => updateTransferFormUI(app.state));
    });

    elements.proformaForm.addEventListener('submit', (e) => app.handleProformaSubmit(e));
    elements.proformasTableBody.addEventListener('click', (e) => app.handleProformasTableClick(e));
    elements.pageProformas.querySelector('#proformas-search').addEventListener('input', () => app.renderDocuments());

    elements.addAccountForm.addEventListener('submit', (e) => app.handleAddAccount(e));
    elements.settingsAccountsList.addEventListener('click', (e) => app.handleSettingsListClick(e));
    elements.updateBalanceForm.addEventListener('submit', (e) => app.handleUpdateBalance(e));

    elements.addIncomeCategoryForm.addEventListener('submit', (e) => app.handleAddCategory(e, 'income'));
    elements.addExpenseCategoryForm.addEventListener('submit', (e) => app.handleAddCategory(e, 'expense'));
    elements.incomeCategoriesList.addEventListener('click', (e) => app.handleDeleteCategory(e, 'income'));
    elements.expenseCategoriesList.addEventListener('click', (e) => app.handleDeleteCategory(e, 'expense'));

    elements.addOperationTypeForm.addEventListener('submit', (e) => app.handleAddCategory(e, 'operationType'));
    elements.operationTypesList.addEventListener('click', (e) => app.handleDeleteCategory(e, 'operationType'));

    document.getElementById('inicio-chart-currency').addEventListener('change', () => app.renderInicioCharts());

    elements.reportForm.addEventListener('submit', (e) => app.handleReportGeneration(e));
    document.getElementById('report-period').addEventListener('change', () => app.updateDateInputForReports());
    document.getElementById('report-type').addEventListener('change', () => app.toggleReportFilters());

    document.getElementById('close-year-btn').addEventListener('click', () => app.handleCloseYear());
    document.getElementById('view-archive-btn').addEventListener('click', () => app.viewSelectedArchive());

    if (elements.aeatToggleContainer) {
        elements.aeatToggleContainer.addEventListener('click', (e) => {
            if (e.target.closest('.aeat-toggle-btn')) {
                app.toggleAeatModule();
            }
        });
    }

    if (elements.aeatConfigForm) {
        elements.aeatConfigForm.addEventListener('submit', (e) => app.handleAeatConfigSave(e));
    }

    document.getElementById('facturacion-tab-crear').addEventListener('click', () => app.switchFacturacionTab('crear'));
    document.getElementById('facturacion-tab-listado').addEventListener('click', () => app.switchFacturacionTab('listado'));
    document.getElementById('facturacion-tab-config').addEventListener('click', () => app.switchFacturacionTab('config'));

    elements.facturaAddItemBtn.addEventListener('click', () => app.addFacturaItem());
    elements.nuevaFacturaForm.addEventListener('submit', (e) => app.handleGenerateInvoice(e));
    elements.facturaOperationType.addEventListener('change', () => app.handleOperationTypeChange());
    document.getElementById('factura-currency').addEventListener('change', () => app.updateFacturaSummary());
    document.getElementById('facturas-search').addEventListener('input', () => app.renderFacturas());
    elements.facturasTableBody.addEventListener('click', (e) => app.handleFacturasTableClick(e));

    elements.closeInvoiceViewerBtn.addEventListener('click', () => hideInvoiceViewer());
    elements.printInvoiceBtn.addEventListener('click', () => printInvoice());
    elements.pdfInvoiceBtn.addEventListener('click', () => downloadInvoiceAsPDF());

    elements.fiscalParamsForm.addEventListener('submit', (e) => app.handleFiscalParamsSave(e));
}

export function handleTransactionFormSubmit(e, app) {
    e.preventDefault();
    const id = document.getElementById('transaction-id').value;
    const date = document.getElementById('transaction-date').value;
    const description = document.getElementById('transaction-description').value;
    const type = document.getElementById('transaction-type').value;
    const part = document.getElementById('transaction-part').value;
    const accountName = document.getElementById('transaction-account').value;
    const category = document.getElementById('transaction-category').value;
    const amount = parseFloat(document.getElementById('transaction-amount').value);

    const account = app.state.accounts.find(acc => acc.name === accountName);
    if (!account) return;

    if (id) {
        const transaction = app.state.transactions.find(t => t.id === id);
        if (transaction) {
            Object.assign(transaction, { date, description, type, part, account: accountName, category, amount, currency: account.currency });
        }
    } else {
        app.state.transactions.push({
            id: crypto.randomUUID(),
            date, description, type, part,
            account: accountName,
            category, amount,
            currency: account.currency,
            isInitialBalance: false
        });
    }
    app.recalculateAllBalances();
    updateAll(app);
    e.target.reset();
    document.getElementById('transaction-id').value = '';
    document.getElementById('form-submit-button-text').textContent = 'Guardar';
    document.getElementById('form-cancel-button').classList.add('hidden');
    document.getElementById('form-title').textContent = 'Agregar Nuevo Movimiento';
    populateCategories(app.state);
}

export function handleTransactionsTableClick(e, app) {
    const target = e.target;
    const editBtn = target.closest('.edit-btn');
    const deleteBtn = target.closest('.delete-btn');

    if (editBtn) {
        const id = editBtn.dataset.id;
        const transaction = app.state.transactions.find(t => t.id === id);
        if (transaction) {
            document.getElementById('transaction-id').value = transaction.id;
            document.getElementById('transaction-date').value = transaction.date;
            document.getElementById('transaction-description').value = transaction.description;
            document.getElementById('transaction-type').value = transaction.type;
            populateCategories(app.state);
            document.getElementById('transaction-part').value = transaction.part;
            document.getElementById('transaction-account').value = transaction.account;
            document.getElementById('transaction-category').value = transaction.category;
            document.getElementById('transaction-amount').value = transaction.amount;
            updateCurrencySymbol(app.state);
            document.getElementById('form-submit-button-text').textContent = 'Actualizar';
            document.getElementById('form-cancel-button').classList.remove('hidden');
            document.getElementById('form-title').textContent = 'Editar Movimiento';
            window.scrollTo(0, 0);
        }
    }

    if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        app.showConfirmationModal('Eliminar Movimiento', '¿Estás seguro de que quieres eliminar este movimiento?', () => {
            app.state.transactions = app.state.transactions.filter(t => t.id !== id);
            app.recalculateAllBalances();
            updateAll(app);
        });
    }
}

export function handleTransferFormSubmit(e, app) {
    e.preventDefault();
    const date = document.getElementById('transfer-date').value;
    const fromAccountName = document.getElementById('transfer-from').value;
    const toAccountName = document.getElementById('transfer-to').value;
    const amount = parseFloat(document.getElementById('transfer-amount').value);
    const feeSource = parseFloat(document.getElementById('transfer-fee-source').value) || 0;
    const extraField = parseFloat(document.getElementById('transfer-extra-field').value) || 0;

    const fromAccount = app.state.accounts.find(a => a.name === fromAccountName);
    const toAccount = app.state.accounts.find(a => a.name === toAccountName);

    if (fromAccountName === toAccountName) {
        app.showAlertModal('Error', 'La cuenta de origen y destino no pueden ser la misma.');
        return;
    }

    // Egreso de la cuenta origen
    app.state.transactions.push({
        id: crypto.randomUUID(), date,
        description: `Transferencia a ${toAccountName}`,
        type: 'Egreso', part: 'A', account: fromAccountName,
        category: 'Transferencia', amount: amount, currency: fromAccount.currency,
        isInitialBalance: false
    });

    // Ingreso en la cuenta destino
    let receivedAmount = amount;
    if (fromAccount.currency !== toAccount.currency) {
        if (extraField <= 0) {
            app.showAlertModal('Error', 'Debes especificar el monto a recibir para transferencias entre monedas diferentes.');
            return;
        }
        receivedAmount = extraField;
    }
    app.state.transactions.push({
        id: crypto.randomUUID(), date,
        description: `Transferencia desde ${fromAccountName}`,
        type: 'Ingreso', part: 'A', account: toAccountName,
        category: 'Transferencia', amount: receivedAmount, currency: toAccount.currency,
        isInitialBalance: false
    });

    // Comisiones
    if (feeSource > 0) {
        app.state.transactions.push({
            id: crypto.randomUUID(), date,
            description: `Comisión por transferencia a ${toAccountName}`,
            type: 'Egreso', part: 'A', account: fromAccountName,
            category: 'Comisiones', amount: feeSource, currency: fromAccount.currency,
            isInitialBalance: false
        });
    }
    if (fromAccount.currency === toAccount.currency && extraField > 0) {
        app.state.transactions.push({
            id: crypto.randomUUID(), date,
            description: `Comisión por transferencia desde ${fromAccountName}`,
            type: 'Egreso', part: 'A', account: toAccountName,
            category: 'Comisiones', amount: extraField, currency: toAccount.currency,
            isInitialBalance: false
        });
    }

    app.recalculateAllBalances();
    updateAll(app);
    e.target.reset();
}

export function handleProformaSubmit(e, app) {
    e.preventDefault();
    const date = document.getElementById('proforma-date').value;
    const number = document.getElementById('proforma-number').value;
    const client = document.getElementById('proforma-client').value;
    const amount = parseFloat(document.getElementById('proforma-amount').value);
    const currency = document.getElementById('proforma-currency').value;

    app.state.documents.push({
        id: crypto.randomUUID(),
        type: 'Proforma',
        date, number, client, amount, currency,
        status: 'Adeudada'
    });

    updateAll(app);
    e.target.reset();
    document.getElementById('proforma-date').value = new Date().toISOString().slice(0, 10);
}

export function handleProformasTableClick(e, app) {
    const target = e.target;
    const statusBtn = target.closest('.status-btn');
    const deleteBtn = target.closest('.delete-doc-btn');

    if (statusBtn) {
        const docId = statusBtn.dataset.id;
        app.toggleDocumentStatus(docId);
    } else if (deleteBtn) {
        const docId = deleteBtn.dataset.id;
        app.deleteDocument(docId);
    }
}

export function handleAddAccount(e, app) {
    e.preventDefault();
    const name = document.getElementById('new-account-name').value;
    const currency = document.getElementById('new-account-currency').value;
    const balance = parseFloat(document.getElementById('new-account-balance').value);
    const logo = document.getElementById('new-account-logo').value;

    if (app.state.accounts.some(acc => acc.name.toLowerCase() === name.toLowerCase())) {
        app.showAlertModal('Error', 'Ya existe una cuenta con ese nombre.');
        return;
    }

    const newAccount = {
        id: crypto.randomUUID(),
        name, currency,
        symbol: currency === 'EUR' ? '€' : '$',
        balance: balance,
        logoHtml: logo.trim()
    };
    app.state.accounts.push(newAccount);

    if (balance !== 0) {
        app.state.transactions.push({
            id: crypto.randomUUID(),
            date: new Date().toISOString().slice(0, 10),
            description: 'Saldo Inicial',
            type: 'Ingreso',
            part: 'A',
            account: name,
            category: 'Ajuste de Saldo',
            amount: balance,
            currency: currency,
            isInitialBalance: true
        });
    }

    app.recalculateAllBalances();
    updateAll(app);
    e.target.reset();
}

export function handleSettingsListClick(e, app) {
    const deleteBtn = e.target.closest('.delete-account-btn');
    if (deleteBtn) {
        const accountName = deleteBtn.dataset.name;
        app.showConfirmationModal('Eliminar Cuenta', `¿Seguro que quieres eliminar la cuenta "${escapeHTML(accountName)}"? Se eliminarán todas sus transacciones.`, () => {
            app.state.accounts = app.state.accounts.filter(acc => acc.name !== accountName);
            app.state.transactions = app.state.transactions.filter(t => t.account !== accountName);
            app.recalculateAllBalances();
            updateAll(app);
        });
    }
}

export function handleUpdateBalance(e, app) {
    e.preventDefault();
    const accountName = document.getElementById('update-account-select').value;
    const newBalance = parseFloat(document.getElementById('new-balance-amount').value);
    const account = app.state.accounts.find(acc => acc.name === accountName);

    if (!account) return;

    const currentBalance = account.balance;
    const difference = newBalance - currentBalance;

    if (difference !== 0) {
        app.state.transactions.push({
            id: crypto.randomUUID(),
            date: new Date().toISOString().slice(0, 10),
            description: 'Ajuste de saldo manual',
            type: difference > 0 ? 'Ingreso' : 'Egreso',
            part: 'A',
            account: accountName,
            category: 'Ajuste de Saldo',
            amount: Math.abs(difference),
            currency: account.currency,
            isInitialBalance: false
        });
        app.recalculateAllBalances();
        updateAll(app);
    }
    e.target.reset();
    app.showAlertModal('Éxito', `Se ha creado un ajuste de ${app.formatCurrency(Math.abs(difference), account.currency)} para la cuenta ${escapeHTML(accountName)}.`);
}

export function handleAddCategory(e, type, app) {
    e.preventDefault();
    const inputId = type === 'income' ? 'new-income-category' : (type === 'expense' ? 'new-expense-category' : 'new-operation-type');
    const input = document.getElementById(inputId);
    const categoryName = input.value.trim();

    if (categoryName) {
        const list = type === 'income' ? app.state.incomeCategories : (type === 'expense' ? app.state.expenseCategories : app.state.invoiceOperationTypes);
        if (!list.includes(categoryName)) {
            list.push(categoryName);
            updateAll(app);
        }
        input.value = '';
    }
}

export function handleDeleteCategory(e, type, app) {
    const deleteBtn = e.target.closest('.delete-category-btn');
    if (deleteBtn) {
        const categoryName = deleteBtn.dataset.name;
        const list = type === 'income' ? app.state.incomeCategories : (type === 'expense' ? app.state.expenseCategories : app.state.invoiceOperationTypes);
        const essentialCategories = type === 'income' ? ['Transferencia', 'Comisiones', 'Ajuste de Saldo', 'Inversión'] : ['Transferencia', 'Comisiones', 'Ajuste de Saldo', 'Inversión'];
        
        if (essentialCategories.includes(categoryName)) {
            app.showAlertModal('Error', 'No se puede eliminar una categoría esencial.');
            return;
        }

        app.showConfirmationModal('Eliminar Categoría', `¿Seguro que quieres eliminar la categoría "${escapeHTML(categoryName)}"?`, () => {
            if (type === 'income') {
                app.state.incomeCategories = app.state.incomeCategories.filter(cat => cat !== categoryName);
            } else if (type === 'expense') {
                app.state.expenseCategories = app.state.expenseCategories.filter(cat => cat !== categoryName);
            } else {
                app.state.invoiceOperationTypes = app.state.invoiceOperationTypes.filter(cat => cat !== categoryName);
            }
            updateAll(app);
        });
    }
}

export function handleReportGeneration(e, app) {
    e.preventDefault();
    const reportType = document.getElementById('report-type').value;
    let data, title, columns;

    switch (reportType) {
        case 'movimientos':
            const result = app.generateMovimientosReport();
            data = result.data;
            title = result.title;
            columns = result.columns;
            break;
        case 'documentos':
            // Implementar lógica para reporte de documentos
            break;
        case 'inversiones':
            // Implementar lógica para reporte de inversiones
            break;
        case 'sociedades':
            const socResult = app.generateSociedadesReport();
            data = socResult.data;
            title = socResult.title;
            columns = socResult.columns;
            break;
    }

    if (data && title && columns) {
        app.state.activeReport = { type: reportType, data, title, columns };
        app.renderReport(title, columns, data);
    } else {
        elements.reportDisplayArea.innerHTML = `<div class="text-center text-gray-500 flex flex-col items-center justify-center h-full"><i data-lucide="file-x-2" class="w-16 h-16 mb-4"></i><h3 class="font-semibold text-lg">No hay datos para este reporte</h3><p class="text-sm">Prueba con otros filtros.</p></div>`;
        lucide.createIcons();
    }
}

export function handleCloseYear(app) {
    const startDate = document.getElementById('cierre-start-date').value;
    const endDate = document.getElementById('cierre-end-date').value;

    if (!startDate || !endDate) {
        app.showAlertModal('Error', 'Debes seleccionar una fecha de inicio y de cierre.');
        return;
    }

    const year = new Date(endDate).getFullYear();

    app.showConfirmationModal(
        'Confirmar Cierre Anual',
        `Estás a punto de archivar todos los datos del ${startDate} al ${endDate} bajo el año ${year}. Esta acción no se puede deshacer. ¿Continuar?`,
        () => {
            const start = new Date(startDate);
            const end = new Date(endDate);

            const transactionsToArchive = app.state.transactions.filter(t => {
                const tDate = new Date(t.date);
                return tDate >= start && tDate <= end;
            });
            const documentsToArchive = app.state.documents.filter(d => {
                const dDate = new Date(d.date);
                return dDate >= start && dDate <= end;
            });

            if (!app.state.archivedData[year]) {
                app.state.archivedData[year] = { transactions: [], documents: [] };
            }
            app.state.archivedData[year].transactions.push(...transactionsToArchive);
            app.state.archivedData[year].documents.push(...documentsToArchive);

            app.state.transactions = app.state.transactions.filter(t => {
                const tDate = new Date(t.date);
                return tDate < start || tDate > end;
            });
            app.state.documents = app.state.documents.filter(d => {
                const dDate = new Date(d.date);
                return dDate < start || dDate > end;
            });

            updateAll(app);
            app.showAlertModal('Éxito', `Se ha completado el cierre para el año ${year}.`);
        }
    );
}

export function handleGenerateInvoice(e, app) {
    e.preventDefault();
    const form = e.target;
    const operationType = form.querySelector('#factura-operation-type').value;
    const client = form.querySelector('#factura-cliente').value;
    const nif = form.querySelector('#factura-nif').value;
    const number = form.querySelector('#factura-numero').value;
    const date = form.querySelector('#factura-fecha').value;
    const currency = form.querySelector('#factura-currency').value;

    const items = [];
    form.querySelectorAll('.factura-item-row').forEach(itemEl => {
        items.push({
            description: itemEl.querySelector('.factura-item-concept').value,
            quantity: parseFloat(itemEl.querySelector('.factura-item-quantity').value),
            price: parseFloat(itemEl.querySelector('.factura-item-price').value)
        });
    });

    const isExport = operationType.toLowerCase().includes('exportación');
    const ivaRate = isExport ? 0 : 0.21;

    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const iva = subtotal * ivaRate;
    const total = subtotal + iva;

    const newInvoice = {
        id: crypto.randomUUID(),
        type: 'Factura',
        date, number, client, nif,
        amount: total,
        currency,
        status: 'Adeudada',
        operationType,
        items,
        subtotal,
        iva,
        total
    };

    app.state.documents.push(newInvoice);
    updateAll(app);

    elements.facturaApiResponse.innerHTML = `
        <div class="bg-green-900/50 border border-green-700 text-green-300 p-4 rounded-lg">
            <h4 class="font-bold">Factura Generada</h4>
            <p class="text-sm">La factura Nº ${escapeHTML(number)} ha sido creada y guardada localmente.</p>
            <p class="text-sm mt-2">Total: ${app.formatCurrency(total, currency)}</p>
        </div>`;

    form.reset();
    elements.facturaItemsContainer.innerHTML = '';
    app.addFacturaItem();
    app.updateFacturaSummary();
}

/**
 * Maneja el cambio en el tipo de operación de la factura.
 * Si es 'Exportación', fija la moneda a USD y la deshabilita.
 * En caso contrario, la habilita y actualiza el resumen.
 * @param {object} app - La instancia principal de la aplicación.
 */
export function handleOperationTypeChange(app) {
    const operationTypeSelect = app.elements.facturaOperationType;
    const currencySelect = app.elements.facturaCurrency;
    const ivaLabel = app.elements.facturaIvaLabel;

    if (!operationTypeSelect || !currencySelect) {
        console.error("Elementos del formulario de factura no encontrados.");
        return;
    }

    if (operationTypeSelect.value === 'Exportación (Fuera de la UE)') {
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
    const target = e.target;
    const statusBtn = target.closest('.status-btn');
    const deleteBtn = target.closest('.delete-doc-btn');
    const viewBtn = target.closest('.view-invoice-btn');

    if (statusBtn) {
        const docId = statusBtn.dataset.id;
        app.toggleDocumentStatus(docId);
    } else if (deleteBtn) {
        const docId = deleteBtn.dataset.id;
        app.deleteDocument(docId);
    } else if (viewBtn) {
        const docId = viewBtn.dataset.id;
        showInvoiceViewer(docId, app.state);
    }
}

export function handleAeatConfigSave(e, app) {
    e.preventDefault();
    app.state.settings.aeatConfig.certPath = document.getElementById('aeat-cert-path').value;
    app.state.settings.aeatConfig.certPass = document.getElementById('aeat-cert-pass').value;
    app.state.settings.aeatConfig.endpoint = document.getElementById('aeat-endpoint').value;
    app.state.settings.aeatConfig.apiKey = document.getElementById('aeat-api-key').value;
    app.saveData();
    app.showAlertModal('Éxito', 'La configuración de AEAT ha sido guardada.');
}

export function handleFiscalParamsSave(e, app) {
    e.preventDefault();
    const newRate = parseFloat(document.getElementById('corporate-tax-rate').value);
    if (!isNaN(newRate) && newRate >= 0 && newRate <= 100) {
        app.state.settings.fiscalParameters.corporateTaxRate = newRate;
        app.saveData();
        app.showAlertModal('Éxito', 'Los parámetros fiscales han sido actualizados.');
    } else {
        app.showAlertModal('Error', 'Por favor, introduce un valor válido para el tipo impositivo (0-100).');
    }
}