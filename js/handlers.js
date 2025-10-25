import * as actions from './actions.js';
import * as api from './api.js';
import {
    elements,
    switchPage,
    populateCategories,
    updateCurrencySymbol,
    updateTransferFormUI,
    showInvoiceViewer,
    hideInvoiceViewer,
    printInvoice,
    downloadInvoiceAsPDF,
    populateClientSelectForInvoice,
    showConfirmationModal,
    showAlertModal,
    resetTransactionForm,
    exportReportAsXLSX,
    exportReportAsPDF,
    showPaymentDetailsModal,
    hidePaymentDetailsModal,
    showReceiptViewer,
    showSpinner,
    hideSpinner,
    renderAll,
    showLoginView,
    showRegisterView,
    clearAuthError,
    openSidebar,
    closeSidebar,
    showPermissionsModal,
    hidePermissionsModal,
    populateNextInvoiceNumber
} from './ui.js';
import { getState, resetState } from './store.js';
import { ESSENTIAL_INCOME_CATEGORIES, ESSENTIAL_EXPENSE_CATEGORIES, ESSENTIAL_OPERATION_TYPES, ESSENTIAL_TAX_ID_TYPES } from './config.js';
import { escapeHTML } from './utils.js';

// Centraliza las descripciones de los permisos para la UI.
const PERMISSION_DESCRIPTIONS = {
    view_dashboard: { label: "Ver Panel de Inicio", description: "Permite el acceso a la página principal con los KPIs y gráficos." },
    view_accounts: { label: "Ver Cuentas y Saldos", description: "Permite ver la lista de cuentas y sus saldos." },
    view_cashflow: { label: "Ver Flujo de Caja", description: "Permite ver el historial de transacciones." },
    manage_cashflow: { label: "Gestionar Flujo de Caja", description: "Permite añadir, editar y eliminar ingresos y egresos." },
    execute_transfers: { label: "Realizar Transferencias", description: "Permite mover fondos entre cuentas." },
    view_documents: { label: "Ver Facturas y Proformas", description: "Permite visualizar los listados de facturas y proformas." },
    manage_invoices: { label: "Gestionar Facturas", description: "Permite crear y eliminar facturas." },
    manage_proformas: { label: "Gestionar Proformas", description: "Permite crear y eliminar proformas." },
    change_document_status: { label: "Cambiar Estado de Documentos", description: "Permite marcar facturas/proformas como 'Cobradas' o 'Adeudadas'." },
    view_clients: { label: "Ver Clientes", description: "Permite acceder al listado de clientes." },
    manage_clients: { label: "Gestionar Clientes", description: "Permite añadir, editar y eliminar clientes." },
    view_reports: { label: "Generar Reportes", description: "Permite acceder al centro de reportes y generar informes." },
    view_iva_control: { label: "Ver Control de IVA", description: "Permite acceder y generar el reporte mensual de IVA." },
    view_archives: { label: "Ver Archivos Anuales", description: "Permite consultar los datos de años cerrados." },
    view_investments: { label: "Ver Inversiones", description: "Permite ver el panel y el historial de inversiones." },
    manage_investments: { label: "Gestionar Inversiones", description: "Permite añadir y eliminar movimientos de inversión." },
    manage_accounts: { label: "Gestionar Cuentas (Ajustes)", description: "Permite crear y eliminar cuentas bancarias." },
    manage_categories: { label: "Gestionar Categorías (Ajustes)", description: "Permite añadir y eliminar categorías de ingresos/egresos." },
    execute_balance_adjustment: { label: "Realizar Ajustes de Saldo", description: "Permite modificar manualmente el saldo de una cuenta." },
    execute_year_close: { label: "Realizar Cierre Anual", description: "Permite archivar los datos de un año fiscal." },
    manage_fiscal_settings: { label: "Gestionar Ajustes Fiscales", description: "Permite cambiar parámetros como el tipo impositivo." },
    manage_users: { label: "Gestionar Usuarios y Permisos", description: "Permite activar usuarios y modificar sus permisos (SOLO ADMIN)." },
};

// --- Helper for showing spinner during actions ---
function withSpinner(action, delay = 300) {
    return async (...args) => {
        showSpinner();
        try {
            // Agregamos una pequeña demora para que el spinner sea visible y dé feedback.
            await new Promise(resolve => setTimeout(resolve, delay));
            return await action(...args); // Devolvemos el resultado de la acción
        } catch (e) {
            console.error("Error during action:", e);
            showAlertModal('Error', 'Ocurrió un error inesperado durante la operación.');
        } finally {
            hideSpinner();
        }
    };
}


// --- Auth Handlers ---
function handleLoginSubmit(e) {
    e.preventDefault();
    clearAuthError();
    const email = elements.loginForm.querySelector('#login-email').value;
    const password = elements.loginForm.querySelector('#login-password').value;
    withSpinner(async () => {
        await api.loginUser(email, password);
    })();
}

function handleRegisterSubmit(e) {
    e.preventDefault();
    clearAuthError();
    const email = elements.registerForm.querySelector('#register-email').value;
    const password = elements.registerForm.querySelector('#register-password').value;
     withSpinner(async () => {
        await api.registerUser(email, password);
    })();
}

function handleLogout() {
    withSpinner(async () => {
        await api.logoutUser();
        resetState(); // Limpiamos el estado local al cerrar sesión
    })();
}

/**
 * Carga la información y los permisos de un usuario en el modal.
 * @param {object} user - El objeto del usuario a mostrar.
 */
function populatePermissionsModal(user) {
    elements.permissionsModalEmail.textContent = user.email;
    elements.permissionsList.innerHTML = ''; // Limpiar contenido anterior

    elements.permissionsModalSaveBtn.dataset.userId = user.id;

    const userPermissions = user.permisos || {};

    for (const key in PERMISSION_DESCRIPTIONS) {
        const isChecked = userPermissions[key] === true;
        const { label, description } = PERMISSION_DESCRIPTIONS[key];

        const permissionHTML = `
            <div class="flex items-start justify-between bg-gray-800/50 p-3 rounded-lg">
                <div>
                    <label for="perm-${key}" class="font-semibold text-gray-200 cursor-pointer">${label}</label>
                    <p class="text-xs text-gray-400">${description}</p>
                </div>
                <div class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="perm-${key}" class="sr-only peer" data-permission-key="${key}" ${isChecked ? 'checked' : ''}>
                    <div class="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-500/50 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </div>
            </div>
        `;
        elements.permissionsList.insertAdjacentHTML('beforeend', permissionHTML);
    }
}


/**
 * Maneja el clic en el botón "Guardar Cambios" del modal de permisos.
 */
function handlePermissionsSave() {
    const userId = elements.permissionsModalSaveBtn.dataset.userId;
    if (!userId) {
        showAlertModal('Error', 'No se ha podido identificar al usuario.');
        return;
    }

    const newPermissions = {};
    elements.permissionsList.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        const key = checkbox.dataset.permissionKey;
        if (key) {
            newPermissions[key] = checkbox.checked;
        }
    });

    withSpinner(async () => {
        const success = await api.updateUserPermissions(userId, { permisos: newPermissions });
        if (success) {
            await actions.loadAndSetAllUsers();
            showAlertModal('Éxito', 'Los permisos del usuario se han actualizado correctamente.');
            hidePermissionsModal();
        } else {
            showAlertModal('Error', 'No se pudieron guardar los cambios. Inténtalo de nuevo.');
        }
    })();
}

/**
 * Manejador principal para los clics en la lista de gestión de usuarios.
 */
function handleUserManagementClick(e) {
    const activateBasicBtn = e.target.closest('.activate-basic-btn');
    const activateFullBtn = e.target.closest('.activate-full-btn');
    const deactivateBtn = e.target.closest('.deactivate-btn');
    const manageBtn = e.target.closest('.manage-permissions-btn');
    const deleteBtn = e.target.closest('.delete-user-btn');

    if (activateBasicBtn) {
        const userId = activateBasicBtn.dataset.id;
        showConfirmationModal('Activar Acceso Básico', '¿Dar acceso de solo lectura al usuario?', withSpinner(() => actions.updateUserAccessAction(userId, 'basico')));
    }

    if (activateFullBtn) {
        const userId = activateFullBtn.dataset.id;
        showConfirmationModal('Activar Acceso Completo', '¿Dar acceso total de gestión al usuario?', withSpinner(() => actions.updateUserAccessAction(userId, 'completo')));
    }

    if (deactivateBtn) {
        const userId = deactivateBtn.dataset.id;
        showConfirmationModal('Desactivar Usuario', '¿Quitar el acceso a este usuario?', withSpinner(() => actions.updateUserAccessAction(userId, 'pendiente')));
    }

    if (manageBtn) {
        const userId = manageBtn.dataset.id;
        const { allUsers } = getState();
        const user = allUsers.find(u => u.id === userId);

        if (user) {
            populatePermissionsModal(user);
            showPermissionsModal();
        } else {
            showAlertModal('Error', 'No se encontró al usuario seleccionado.');
        }
    }

    if (deleteBtn) {
        const userId = deleteBtn.dataset.id;
        const userEmailElement = deleteBtn.closest('.flex.items-center.justify-between').querySelector('p.font-semibold');
        if (!userEmailElement) return;
        const userEmail = userEmailElement.textContent;
        showConfirmationModal(
            'Eliminar Usuario',
            `¿Estás seguro de que quieres ocultar el perfil de "${escapeHTML(userEmail)}"? El usuario desaparecerá de esta lista.`,
            async () => {
                const result = await withSpinner(async () => await actions.blockUserAction(userId))();
                if (result && !result.success) {
                    showAlertModal('Error', result.message || 'No se pudo ocultar el usuario.');
                }
            }
        );
    }
}


// --- Funciones Manejadoras (Handlers) ---

function handleTogglePassword(e) {
    const button = e.currentTarget;
    const input = button.previousElementSibling;
    const icon = button.querySelector('i[data-lucide]'); // Select the icon element directly

    if (!input || !icon) return; // Exit if elements are not found

    if (input.type === 'password') {
        input.type = 'text';
        // Change the icon's data-lucide attribute and recreate it
        icon.setAttribute('data-lucide', 'eye-off');
    } else {
        input.type = 'password';
        // Change the icon's data-lucide attribute and recreate it
        icon.setAttribute('data-lucide', 'eye');
    }
    // Recreate icons specifically for the updated element
    lucide.createIcons({
        nodes: [icon]
    });
}

function handleTransactionFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const id = form.querySelector('#transaction-id').value;
    const accountName = form.querySelector('#transaction-account').value;
    const { accounts } = getState();
    const account = accounts.find(acc => acc.name === accountName);

    if (!account) {
        showAlertModal('Error', 'Debe seleccionar una cuenta válida.');
        return;
    }

    const amount = parseFloat(form.querySelector('#transaction-amount').value);
    const description = form.querySelector('#transaction-description').value.trim();

    if (!description) {
        showAlertModal('Campo Requerido', 'La descripción no puede estar vacía.');
        return;
    }
    if (isNaN(amount) || amount <= 0) {
        showAlertModal('Valor Inválido', 'El monto debe ser un número positivo.');
        return;
    }

    const transactionData = {
        date: form.querySelector('#transaction-date').value,
        description: description,
        type: form.querySelector('#transaction-type').value,
        part: form.querySelector('#transaction-part').value,
        account: accountName,
        category: form.querySelector('#transaction-category').value,
        amount: amount,
        iva: parseFloat(form.querySelector('#transaction-iva').value) || 0,
        currency: account.currency
    };

    withSpinner(() => {
        actions.saveTransaction(transactionData, id);
        resetTransactionForm();
    })();
}

function handleTransactionsTableClick(e) {
    const editBtn = e.target.closest('.edit-btn');
    const deleteBtn = e.target.closest('.delete-btn');

    if (editBtn) {
        const id = editBtn.dataset.id;
        const { transactions } = getState();
        const transaction = transactions.find(t => t.id === id);
        if (transaction) {
            const form = elements.transactionForm;
            form.querySelector('#transaction-id').value = transaction.id;
            form.querySelector('#transaction-date').value = transaction.date;
            form.querySelector('#transaction-description').value = transaction.description;
            form.querySelector('#transaction-type').value = transaction.type;
            populateCategories(); // Update categories based on type first
            form.querySelector('#transaction-category').value = transaction.category;
            form.querySelector('#transaction-part').value = transaction.part;
            form.querySelector('#transaction-account').value = transaction.account;
            form.querySelector('#transaction-amount').value = transaction.amount;
            form.querySelector('#transaction-iva').value = transaction.iva || '';
            updateCurrencySymbol(); // Update symbol based on selected account

            form.querySelector('#form-submit-button-text').textContent = 'Actualizar';
            form.querySelector('#form-cancel-button').classList.remove('hidden');
            form.querySelector('#form-title').textContent = 'Editar Movimiento';
            form.scrollIntoView({ behavior: 'smooth' });
        }
    }

    if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        showConfirmationModal('Eliminar Movimiento', '¿Estás seguro de que quieres eliminar este movimiento?', withSpinner(() => {
            actions.deleteTransaction(id);
        }));
    }
}


function handleAddAccount(e) {
    e.preventDefault();
    const form = e.target;
    const name = form.querySelector('#new-account-name').value.trim();
    const balance = parseFloat(form.querySelector('#new-account-balance').value);
    const { logoCatalog } = getState();
    const logoKey = elements.newAccountLogoSelect.value;
    const logoHtml = logoCatalog[logoKey];

    if (!name) {
        showAlertModal('Campo Requerido', 'El nombre de la cuenta no puede estar vacío.');
        return;
    }
    if (isNaN(balance)) {
        showAlertModal('Valor Inválido', 'El saldo inicial debe ser un número.');
        return;
    }

    const { accounts } = getState();
    if (accounts.some(acc => acc.name.toLowerCase() === name.toLowerCase())) {
        showAlertModal('Error', 'Ya existe una cuenta con ese nombre.');
        return;
    }

    const accountData = {
        name: name,
        currency: form.querySelector('#new-account-currency').value,
        balance: balance || 0,
        logoHtml: logoHtml,
    };

    withSpinner(() => {
        actions.addAccount(accountData);
        form.reset();
    })();
}

function handleSettingsAccountsListClick(e) {
    const deleteBtn = e.target.closest('.delete-account-btn');
    if (deleteBtn) {
        const accountId = deleteBtn.dataset.id; // <-- CAMBIO
        const accountName = deleteBtn.dataset.name; // Mantenemos el nombre para el modal
        showConfirmationModal('Eliminar Cuenta', `¿Seguro que quieres eliminar la cuenta "${escapeHTML(accountName)}"? Se eliminarán todas sus transacciones.`, withSpinner(() => {
            actions.deleteAccount(accountId); // <-- CAMBIO
        }));
    }
}

function handleUpdateBalance(e) {
    e.preventDefault();
    const form = e.target;
    const accountName = form.querySelector('#update-account-select').value;
    const newBalance = parseFloat(form.querySelector('#new-balance-amount').value);

    if (isNaN(newBalance)) {
        showAlertModal('Valor Inválido', 'El nuevo saldo debe ser un número.');
        return;
    }

    withSpinner(() => {
        actions.updateBalance(accountName, newBalance);
        showAlertModal('Éxito', `Se ha creado un ajuste de saldo para la cuenta ${escapeHTML(accountName)}.`);
        form.reset();
    })();
}

function handleTransferFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const fromAccountName = form.querySelector('#transfer-from').value;
    const toAccountName = form.querySelector('#transfer-to').value;

    if (fromAccountName === toAccountName) {
        showAlertModal('Error', 'La cuenta de origen y destino no pueden ser la misma.');
        return;
    }

    const amount = parseFloat(form.querySelector('#transfer-amount').value);
    if (isNaN(amount) || amount <= 0) {
        showAlertModal('Valor Inválido', 'El monto a enviar debe ser un número positivo.');
        return;
    }

    const { accounts } = getState();
    const fromAccount = accounts.find(a => a.name === fromAccountName);
    const toAccount = accounts.find(a => a.name === toAccountName); // Find the 'to' account
    let receivedAmount = amount; // Default: same amount

    // Check if currencies are different
    if (fromAccount && toAccount && fromAccount.currency !== toAccount.currency) {
        const receivedAmountInput = form.querySelector('#transfer-extra-field').value;
        if (!receivedAmountInput) {
            showAlertModal('Error', 'Debes especificar el monto a recibir para transferencias entre monedas diferentes.');
            return;
        }
        receivedAmount = parseFloat(receivedAmountInput);
        if (isNaN(receivedAmount) || receivedAmount <= 0) {
            showAlertModal('Error', 'El monto a recibir debe ser un número positivo válido.');
            return;
        }
    }


    const transferData = {
        date: form.querySelector('#transfer-date').value,
        fromAccountName,
        toAccountName,
        amount: amount,
        feeSource: parseFloat(form.querySelector('#transfer-fee-source').value) || 0,
        // Use receivedAmount calculated above
        receivedAmount: receivedAmount,
    };

    withSpinner(() => {
        actions.addTransfer(transferData);
        form.reset();
        // Set default date again after reset
        const dateInput = form.querySelector('#transfer-date');
        if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
        updateTransferFormUI();
    })();
}


function handleAddCategory(e, type) {
    e.preventDefault();
    const form = e.target;
    const inputId = type === 'income' ? 'new-income-category' : (type === 'expense' ? 'new-expense-category' : (type === 'operationType' ? 'new-operation-type' : 'new-tax-id-type'));
    const input = form.querySelector(`#${inputId}`);
    const categoryName = input.value.trim();

    if (categoryName) {
        const { incomeCategories, expenseCategories, invoiceOperationTypes, taxIdTypes } = getState();
        const list = type === 'income' ? incomeCategories : (type === 'expense' ? expenseCategories : (type === 'operationType' ? invoiceOperationTypes : taxIdTypes));
        if (list.some(cat => cat.toLowerCase() === categoryName.toLowerCase())) {
            showAlertModal('Categoría Duplicada', `La categoría "${escapeHTML(categoryName)}" ya existe.`);
            return;
        }

        withSpinner(() => {
            actions.addCategory(categoryName, type);
            input.value = '';
        }, 150)();
    } else {
        showAlertModal('Campo Requerido', 'El nombre de la categoría no puede estar vacío.');
    }
}

function handleDeleteCategory(e, type, essentialCategories) {
    const deleteBtn = e.target.closest('.delete-category-btn');
    if (deleteBtn) {
        const categoryName = deleteBtn.dataset.name;

        if (essentialCategories.includes(categoryName)) {
            showAlertModal('Error', 'No se puede eliminar una categoría esencial del sistema.');
            return;
        }

        showConfirmationModal('Eliminar Categoría', `¿Seguro que quieres eliminar la categoría "${escapeHTML(categoryName)}"?`, withSpinner(() => {
            actions.deleteCategory(categoryName, type);
        }, 150));
    }
}

function handleClientFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const id = form.querySelector('#client-id').value;
    const name = form.querySelector('#client-name').value.trim();
    const email = form.querySelector('#client-email').value.trim();

    if (!name) {
        showAlertModal('Campo Requerido', 'El nombre del cliente no puede estar vacío.');
        return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showAlertModal('Formato Inválido', 'Por favor, introduce una dirección de email válida.');
        return;
    }

    const clientData = {
        name: name,
        taxIdType: form.querySelector('#client-tax-id-type').value,
        taxId: form.querySelector('#client-tax-id').value,
        address: form.querySelector('#client-address').value,
        phoneLandlinePrefix: form.querySelector('#client-phone-landline-prefix').value,
        phoneLandline: form.querySelector('#client-phone-landline').value,
        phoneMobilePrefix: form.querySelector('#client-phone-mobile-prefix').value,
        phoneMobile: form.querySelector('#client-phone-mobile').value,
        email: email,
        industry: form.querySelector('#client-industry').value,
    };

    withSpinner(() => {
        actions.saveClient(clientData, id);
        form.reset();
        form.querySelector('#client-id').value = '';
        document.getElementById('client-form-title').textContent = 'Agregar Nuevo Cliente';
        document.getElementById('client-form-submit-text').textContent = 'Guardar Cliente';
        document.getElementById('client-form-cancel-btn').classList.add('hidden');
    })();
}

function handleClientsTableClick(e) {
    const editBtn = e.target.closest('.edit-client-btn');
    const deleteBtn = e.target.closest('.delete-client-btn');

    if (editBtn) {
        const id = editBtn.dataset.id;
        const { clients } = getState();
        const client = clients.find(c => c.id === id);
        if (client) {
            const form = elements.addClientForm;
            form.querySelector('#client-id').value = client.id;
            form.querySelector('#client-name').value = client.name;
            form.querySelector('#client-tax-id-type').value = client.taxIdType;
            form.querySelector('#client-tax-id').value = client.taxId;
            form.querySelector('#client-address').value = client.address;
            form.querySelector('#client-phone-landline-prefix').value = client.phoneLandlinePrefix;
            form.querySelector('#client-phone-landline').value = client.phoneLandline;
            form.querySelector('#client-phone-mobile-prefix').value = client.phoneMobilePrefix;
            form.querySelector('#client-phone-mobile').value = client.phoneMobile;
            form.querySelector('#client-email').value = client.email;
            form.querySelector('#client-industry').value = client.industry;

            document.getElementById('client-form-title').textContent = 'Editar Cliente';
            document.getElementById('client-form-submit-text').textContent = 'Actualizar Cliente';
            document.getElementById('client-form-cancel-btn').classList.remove('hidden');
            form.scrollIntoView({ behavior: 'smooth' });
        }
    }

    if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        showConfirmationModal('Eliminar Cliente', '¿Estás seguro de que quieres eliminar este cliente?', withSpinner(() => {
            actions.deleteClient(id);
        }));
    }
}

function handleDocumentSubmit(e, type) {
    e.preventDefault();
    const form = e.target;
    const amount = parseFloat(form.querySelector(`#${type.toLowerCase()}-amount`).value);
    const number = form.querySelector(`#${type.toLowerCase()}-number`).value.trim();

    if (!number) {
        showAlertModal('Campo Requerido', `El número de ${type.toLowerCase()} no puede estar vacío.`);
        return;
    }
    if (isNaN(amount) || amount <= 0) {
        showAlertModal('Valor Inválido', 'El monto debe ser un número positivo.');
        return;
    }

    const docData = {
        type: type,
        date: form.querySelector(`#${type.toLowerCase()}-date`).value,
        number: number,
        client: form.querySelector(`#${type.toLowerCase()}-client`).value,
        amount: amount,
        currency: form.querySelector(`#${type.toLowerCase()}-currency`).value,
        status: 'Adeudada',
    };
    withSpinner(() => {
        actions.addDocument(docData);
        form.reset();
        // Set default date again after reset
        const dateInput = form.querySelector(`#${type.toLowerCase()}-date`);
        if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
    })();
}


function handleDocumentsTableClick(e) {
    const statusBtn = e.target.closest('.status-btn');
    const deleteBtn = e.target.closest('.delete-doc-btn');
    const viewBtn = e.target.closest('.view-invoice-btn');
    const receiptBtn = e.target.closest('.generate-receipt-btn');

    if (statusBtn) {
        withSpinner(() => actions.toggleDocumentStatus(statusBtn.dataset.id), 150)();
    }
    if (deleteBtn) {
        showConfirmationModal('Eliminar Documento', '¿Seguro que quieres eliminar este documento?', withSpinner(() => {
            actions.deleteDocument(deleteBtn.dataset.id);
        }));
    }
    if (viewBtn) {
        showInvoiceViewer(viewBtn.dataset.id);
    }
    if (receiptBtn) {
        showPaymentDetailsModal(receiptBtn.dataset.id);
    }
}


function handleClientSelectionForInvoice(e) {
    const clientId = e.target.value;
    const form = elements.nuevaFacturaForm;
    const nameInput = form.querySelector('#factura-cliente');
    const nifInput = form.querySelector('#factura-nif');
    const addressInput = form.querySelector('#factura-cliente-direccion');
    const phoneInput = form.querySelector('#factura-cliente-telefono');

    if (clientId) {
        const { clients } = getState();
        const client = clients.find(c => c.id === clientId);
        if (client) {
            nameInput.value = client.name;
            nifInput.value = client.taxId;
            addressInput.value = client.address;
            phoneInput.value = `${client.phoneMobilePrefix} ${client.phoneMobile}`;
        }
    } else {
        [nameInput, nifInput, addressInput, phoneInput].forEach(input => {
            if (input) input.value = ''; // Check if input exists before setting value
        });
    }
}

function handleGenerateInvoice(e) {
    e.preventDefault();
    const form = e.target;

    const items = [];
    let parsingError = false;
    form.querySelectorAll('.factura-item').forEach(itemEl => {
        if (parsingError) return;

        const description = itemEl.querySelector('.item-description').value;
        const quantityRaw = itemEl.querySelector('.item-quantity').value;
        const priceRaw = itemEl.querySelector('.item-price').value;

        const quantity = parseFloat(quantityRaw.replace(',', '.'));
        const price = parseFloat(priceRaw.replace(',', '.'));

        if (description && !isNaN(quantity) && quantity > 0 && !isNaN(price) && price >= 0) {
            items.push({ description, quantity, price });
        } else if (description || quantityRaw || priceRaw) {
            showAlertModal('Valor Inválido', `Por favor, revise la línea con descripción "${description}". La cantidad y el precio deben ser números válidos.`);
            parsingError = true;
        }
    });

    if (parsingError) return;

    if (items.length === 0) {
        showAlertModal('Factura Vacía', 'Debes añadir al menos un concepto válido a la factura.');
        return;
    }

    if (!form.querySelector('#factura-cliente').value.trim()) {
        showAlertModal('Campo Requerido', 'El nombre del cliente es obligatorio.');
        return;
    }

    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const operationType = form.querySelector('#factura-operation-type').value;
    const ivaRate = operationType.toLowerCase().includes('exportación') ? 0 : 0.21;
    const iva = subtotal * ivaRate;
    const total = subtotal + iva;

    const newInvoice = {
        type: 'Factura',
        date: form.querySelector('#factura-fecha').value,
        number: form.querySelector('#factura-numero').value,
        client: form.querySelector('#factura-cliente').value,
        nif: form.querySelector('#factura-nif').value,
        address: form.querySelector('#factura-cliente-direccion').value,
        phone: form.querySelector('#factura-cliente-telefono').value,
        amount: total,
        currency: form.querySelector('#factura-currency').value,
        status: 'Adeudada',
        operationType,
        items,
        subtotal,
        iva,
        total,
        ivaRate
    };

    withSpinner(() => {
        actions.addDocument(newInvoice);

        form.reset();
        // Restore default date
        const dateInput = form.querySelector('#factura-fecha');
        if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
        elements.facturaItemsContainer.innerHTML = '';
        // Add one empty item line back
        const addItemButton = document.getElementById('factura-add-item-btn');
        if (addItemButton) addItemButton.click();
        // Update totals display
        updateInvoiceTotals();

        showAlertModal('Éxito', `La factura Nº ${escapeHTML(newInvoice.number)} ha sido creada.`);
        switchPage('facturacion', 'listado');
    })();
}


function handlePaymentDetailsSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const invoiceId = form.querySelector('#payment-details-invoice-id').value;

    const paymentData = {
        method: form.querySelector('#payment-method').value,
        date: form.querySelector('#payment-date').value,
        reference: form.querySelector('#payment-reference').value,
    };

    withSpinner(() => {
        const updatedInvoice = actions.savePaymentDetails(invoiceId, paymentData);
        if (updatedInvoice) {
            hidePaymentDetailsModal();
            showReceiptViewer(updatedInvoice);
        } else {
            showAlertModal('Error', 'No se pudo encontrar la factura para guardar los detalles del pago.');
        }
    })();
}

function handleAeatConfigSave(e) {
    e.preventDefault();
    const form = e.target;
    const aeatConfig = {
        certPath: form.querySelector('#aeat-cert-path').value,
        certPass: form.querySelector('#aeat-cert-pass').value,
        endpoint: form.querySelector('#aeat-endpoint').value,
        apiKey: form.querySelector('#aeat-api-key').value,
    };
    withSpinner(() => {
        actions.saveAeatConfig(aeatConfig);
        showAlertModal('Éxito', 'La configuración de AEAT ha sido guardada.');
    })();
}

function handleFiscalParamsSave(e) {
    e.preventDefault();
    const form = e.target;
    const rate = parseFloat(form.querySelector('#corporate-tax-rate').value);
    if (!isNaN(rate) && rate >= 0 && rate <= 100) {
        withSpinner(() => {
            actions.saveFiscalParams({ corporateTaxRate: rate });
            showAlertModal('Éxito', 'Los parámetros fiscales han sido actualizados.');
        })();
    } else {
        showAlertModal('Error', 'Por favor, introduce un valor válido para el tipo impositivo (0-100).');
    }
}

function handleReportGeneration(e) {
    e.preventDefault();
    const form = e.target;
    const type = form.querySelector('#report-type').value;
    let filters = { type };

    if (type === 'sociedades') {
        filters.year = form.querySelector('#report-year-sociedades').value;
        filters.period = form.querySelector('#report-periodo-sociedades').value;
    } else {
        filters.period = form.querySelector('#report-period').value;
        filters.account = form.querySelector('#report-account').value;
        filters.part = form.querySelector('#report-part').value;
        switch (filters.period) {
            case 'daily': filters.date = form.querySelector('#report-date').value; break;
            case 'weekly': filters.week = form.querySelector('#report-week').value; break;
            case 'monthly': filters.month = form.querySelector('#report-month').value; break;
            case 'annual': filters.year = form.querySelector('#report-year').value; break;
        }
         // Validate date inputs for non-sociedades reports
         if (!filters.date && !filters.week && !filters.month && !filters.year) {
            showAlertModal('Filtro Requerido', 'Por favor, selecciona un período válido (fecha, semana, mes o año).');
            return;
        }
    }
    withSpinner(() => actions.generateReport(filters), 500)();
}


function handleIvaReportGeneration() {
    const month = elements.ivaMonthInput.value;
    if (month) {
        withSpinner(() => actions.generateIvaReport(month), 500)();
    } else {
        showAlertModal('Falta Información', 'Por favor, seleccione un mes para generar el reporte de IVA.');
    }
}

function handleCloseYear() {
    const startDate = document.getElementById('cierre-start-date').value;
    const endDate = document.getElementById('cierre-end-date').value;

    if (!startDate || !endDate) {
        showAlertModal('Error', 'Debes seleccionar una fecha de inicio y de cierre.');
        return;
    }
    if (new Date(startDate) >= new Date(endDate)) {
        showAlertModal('Error', 'La fecha de inicio debe ser anterior a la fecha de cierre.');
        return;
    }
    const year = new Date(endDate).getFullYear();
    showConfirmationModal('Confirmar Cierre Anual', `Estás a punto de archivar todos los datos del ${startDate} al ${endDate} bajo el año ${year}. Esta acción no se puede deshacer. ¿Continuar?`, withSpinner(() => {
        actions.closeYear(startDate, endDate);
        showAlertModal('Éxito', `Se ha completado el cierre para el año ${year}.`);
    }, 1000));
}


function handleReportFilterChange() {
    const reportType = document.getElementById('report-type').value;
    const period = document.getElementById('report-period').value;

    const isSociedades = reportType === 'sociedades';
    elements.defaultFiltersContainer.classList.toggle('hidden', isSociedades);
    elements.sociedadesFiltersContainer.classList.toggle('hidden', !isSociedades);

    // Only show relevant date input based on period for default filters
    if (!isSociedades) {
        ['daily', 'weekly', 'monthly', 'annual'].forEach(p => {
            const el = document.getElementById(`date-input-${p}`);
            if (el) el.classList.toggle('hidden', p !== period);
        });
        // Ensure default year is set for annual report
        if (period === 'annual') {
             const yearInput = document.getElementById('report-year');
             if (yearInput && !yearInput.value) {
                 yearInput.value = new Date().getFullYear();
             }
        }
    }
}

function handleReportDownloadClick(e) {
    const downloadBtn = e.target.closest('#report-download-btn');
    if (downloadBtn) {
        document.getElementById('report-download-options').classList.toggle('show');
        return;
    }

    const formatBtn = e.target.closest('.download-option');
    if (formatBtn) {
        const format = formatBtn.dataset.format;
        if (format === 'xlsx') {
            exportReportAsXLSX();
        } else if (format === 'pdf') {
            exportReportAsPDF();
        }
        document.getElementById('report-download-options').classList.remove('show');
    }
}

// Close dropdown if clicked outside
document.addEventListener('click', function(event) {
    if (!event.target.closest('.dropdown')) {
        const dropdowns = document.getElementsByClassName("dropdown-content");
        for (let i = 0; i < dropdowns.length; i++) {
            const openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
    }
});


function handleAddInvestmentAsset(e) {
    e.preventDefault();
    const form = e.target;
    const name = form.querySelector('#new-investment-asset-name').value.trim();

    if (!name) {
        showAlertModal('Campo Requerido', 'El nombre del activo no puede estar vacío.');
        return;
    }

    const assetData = {
        name: name,
        category: form.querySelector('#new-investment-asset-category').value,
    };
    withSpinner(() => {
        actions.addInvestmentAsset(assetData);
        form.reset();
    }, 150)();
}

function handleInvestmentAssetListClick(e) {
    const deleteBtn = e.target.closest('.delete-investment-asset-btn');
    if (deleteBtn) {
        const assetId = deleteBtn.dataset.id;
        showConfirmationModal('Eliminar Activo', '¿Estás seguro de que quieres eliminar este tipo de activo?', withSpinner(() => {
            actions.deleteInvestmentAsset(assetId);
        }, 150));
    }
}

function handleAddInvestment(e) {
    e.preventDefault();
    const form = e.target;
    const { investmentAssets } = getState();
    const assetId = form.querySelector('#investment-asset').value;
    const asset = investmentAssets.find(a => a.id === assetId);
    const amount = parseFloat(form.querySelector('#investment-amount').value);

    if (!asset) {
        showAlertModal('Error', 'Por favor, selecciona un activo de inversión válido. Puedes definirlos en Ajustes.');
        return;
    }
    if (isNaN(amount) || amount <= 0) {
        showAlertModal('Valor Inválido', 'El monto invertido debe ser un número positivo.');
        return;
    }

    const investmentData = {
        date: form.querySelector('#investment-date').value,
        account: form.querySelector('#investment-account').value,
        amount: amount,
        description: form.querySelector('#investment-description').value,
        assetId: asset.id,
        assetName: asset.name,
    };
    withSpinner(() => {
        actions.addInvestment(investmentData);
        form.reset();
        // Restore default date
        const dateInput = form.querySelector('#investment-date');
        if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
    })();
}


function handleInvestmentsTableClick(e) {
    const deleteBtn = e.target.closest('.delete-investment-btn');
    if (deleteBtn) {
        const transactionId = deleteBtn.dataset.id;
        showConfirmationModal('Eliminar Inversión', 'Esto eliminará el registro de la inversión y devolverá el monto a la cuenta de origen. ¿Continuar?', withSpinner(() => {
            actions.deleteTransaction(transactionId);
        }));
    }
}

// --- Invoice Item Calculation ---
function updateInvoiceTotals() {
    const itemsContainer = elements.facturaItemsContainer;
    if (!itemsContainer) return;

    let subtotal = 0;
    itemsContainer.querySelectorAll('.factura-item').forEach(itemEl => {
        const quantity = parseFloat(itemEl.querySelector('.item-quantity').value.replace(',', '.')) || 0;
        const price = parseFloat(itemEl.querySelector('.item-price').value.replace(',', '.')) || 0;
        subtotal += quantity * price;
    });

    const operationType = document.getElementById('factura-operation-type').value;
    const ivaRate = operationType.toLowerCase().includes('exportación') ? 0 : 0.21;
    const iva = subtotal * ivaRate;
    const total = subtotal + iva;
    const currency = document.getElementById('factura-currency').value;
    const symbol = currency === 'EUR' ? '€' : '$';

    document.getElementById('factura-subtotal').textContent = `${subtotal.toFixed(2)} ${symbol}`;
    document.getElementById('factura-iva-label').textContent = `IVA (${(ivaRate * 100).toFixed(0)}%):`;
    document.getElementById('factura-iva').textContent = `${iva.toFixed(2)} ${symbol}`;
    document.getElementById('factura-total').textContent = `${total.toFixed(2)} ${symbol}`;
}


// --- NUEVO: Vinculación de Eventos de Autenticación (se llama al cargar la página) ---
export function bindAuthEventListeners() {
    // Auth events
    if (elements.loginForm) elements.loginForm.addEventListener('submit', handleLoginSubmit);
    if (elements.registerForm) elements.registerForm.addEventListener('submit', handleRegisterSubmit);
    if (elements.showRegisterViewBtn) elements.showRegisterViewBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showRegisterView();
    });
    if (elements.showLoginViewBtn) elements.showLoginViewBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showLoginView();
    });

    // Password toggle buttons
    const toggleLoginPassword = document.getElementById('toggle-login-password');
    if (toggleLoginPassword) toggleLoginPassword.addEventListener('click', handleTogglePassword);

    const toggleRegisterPassword = document.getElementById('toggle-register-password');
    if (toggleRegisterPassword) toggleRegisterPassword.addEventListener('click', handleTogglePassword);
}


// --- Vinculación de Eventos de la Aplicación (se llama DESPUÉS de iniciar sesión) ---
export function bindEventListeners() {

    // Logout (moved here as it's part of the main app UI now)
    if (elements.logoutBtn) elements.logoutBtn.addEventListener('click', handleLogout);

    // Mobile navigation
    if (elements.sidebarOpenBtn) elements.sidebarOpenBtn.addEventListener('click', openSidebar);
    if (elements.sidebarCloseBtn) elements.sidebarCloseBtn.addEventListener('click', closeSidebar);
    if (elements.sidebarOverlay) elements.sidebarOverlay.addEventListener('click', closeSidebar);

    // Desktop navigation toggle
    if (elements.sidebarToggleDesktopBtn) elements.sidebarToggleDesktopBtn.addEventListener('click', () => {
        const isCollapsed = elements.sidebar.classList.contains('w-20');

        if (isCollapsed) {
            elements.sidebar.classList.remove('w-20');
            elements.sidebar.classList.add('w-64');
            elements.mainContent.classList.remove('md:ml-20');
            elements.mainContent.classList.add('md:ml-64');
        } else {
            elements.sidebar.classList.remove('w-64');
            elements.sidebar.classList.add('w-20');
            elements.mainContent.classList.remove('md:ml-64');
            elements.mainContent.classList.add('md:ml-20');
        }

        document.querySelectorAll('.nav-text').forEach(text => {
            text.classList.toggle('hidden');
        });
         // Trigger chart resize after animation
         setTimeout(() => {
            Object.values(window.App.charts).forEach(chart => {
                if (chart && typeof chart.resize === 'function') {
                    chart.resize();
                }
            });
        }, 350); // Slightly longer than the transition duration
    });


    // Main navigation links
    elements.navLinks.forEach(link => {
        // Remove previous listeners to prevent duplicates if bindEventListeners is called multiple times
        link.replaceWith(link.cloneNode(true));
    });
    // Re-select links and add listeners
    document.querySelectorAll('.nav-link').forEach(link => {
         if (link.id !== 'logout-btn') { // Don't re-bind logout here
             link.addEventListener('click', (e) => {
                 e.preventDefault();
                 const pageId = link.id.replace('nav-', '');
                 switchPage(pageId);
             });
         }
    });
    // Ensure logout still works
     const logoutBtn = document.getElementById('logout-btn');
     if(logoutBtn) logoutBtn.addEventListener('click', handleLogout);


    // --- Event Listeners for App Sections ---

    // Inicio Dashboard
    const inicioChartCurrency = document.getElementById('inicio-chart-currency');
    if (inicioChartCurrency) inicioChartCurrency.addEventListener('change', renderAll);
    const quickAddIncome = document.getElementById('quick-add-income');
    if (quickAddIncome) quickAddIncome.addEventListener('click', () => {
        switchPage('cashflow');
        // Ensure form elements exist before setting values
        const transactionTypeSelect = document.getElementById('transaction-type');
        if (transactionTypeSelect) {
            transactionTypeSelect.value = 'Ingreso';
            populateCategories(); // Update categories based on the new type
        }
    });
    const quickAddExpense = document.getElementById('quick-add-expense');
    if (quickAddExpense) quickAddExpense.addEventListener('click', () => {
        switchPage('cashflow');
        const transactionTypeSelect = document.getElementById('transaction-type');
        if (transactionTypeSelect) {
            transactionTypeSelect.value = 'Egreso';
            populateCategories(); // Update categories based on the new type
        }
    });

    // Clients Page Chart
    const clientsChartCurrencySelector = document.getElementById('clients-chart-currency');
    if (clientsChartCurrencySelector) {
        clientsChartCurrencySelector.addEventListener('change', renderAll);
    }

    // Cash Flow Section
    if (elements.transactionForm) {
        elements.transactionForm.addEventListener('submit', handleTransactionFormSubmit);
        const transactionTypeSelect = elements.transactionForm.querySelector('#transaction-type');
        if (transactionTypeSelect) transactionTypeSelect.addEventListener('change', populateCategories);
        const transactionAccountSelect = elements.transactionForm.querySelector('#transaction-account');
        if (transactionAccountSelect) transactionAccountSelect.addEventListener('change', updateCurrencySymbol);
        const cancelBtn = elements.transactionForm.querySelector('#form-cancel-button');
        if (cancelBtn) cancelBtn.addEventListener('click', resetTransactionForm);
    }
    if (elements.transactionsTableBody) elements.transactionsTableBody.addEventListener('click', handleTransactionsTableClick);
    const cashflowSearch = document.getElementById('cashflow-search');
    if (cashflowSearch) cashflowSearch.addEventListener('input', () => renderAll()); // Use renderAll for consistency


    // Transfers
    if (elements.transferForm) {
        elements.transferForm.addEventListener('submit', handleTransferFormSubmit);
        ['transfer-from', 'transfer-to'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', updateTransferFormUI);
        });
    }

    // Proformas
    if (elements.proformaForm) elements.proformaForm.addEventListener('submit', (e) => handleDocumentSubmit(e, 'Proforma'));
    if (elements.proformasTableBody) elements.proformasTableBody.addEventListener('click', handleDocumentsTableClick);
    const proformasSearch = document.getElementById('proformas-search');
    if (proformasSearch) proformasSearch.addEventListener('input', () => renderAll());

    // Settings
    if (elements.addAccountForm) elements.addAccountForm.addEventListener('submit', handleAddAccount);
    if (elements.settingsAccountsList) elements.settingsAccountsList.addEventListener('click', handleSettingsAccountsListClick);
    if (elements.updateBalanceForm) elements.updateBalanceForm.addEventListener('submit', handleUpdateBalance);
    if (elements.addIncomeCategoryForm) elements.addIncomeCategoryForm.addEventListener('submit', (e) => handleAddCategory(e, 'income'));
    if (elements.addExpenseCategoryForm) elements.addExpenseCategoryForm.addEventListener('submit', (e) => handleAddCategory(e, 'expense'));
    if (elements.addOperationTypeForm) elements.addOperationTypeForm.addEventListener('submit', (e) => handleAddCategory(e, 'operationType'));
    if (elements.addTaxIdTypeForm) elements.addTaxIdTypeForm.addEventListener('submit', (e) => handleAddCategory(e, 'taxIdType'));
    if (elements.incomeCategoriesList) elements.incomeCategoriesList.addEventListener('click', (e) => handleDeleteCategory(e, 'income', ESSENTIAL_INCOME_CATEGORIES));
    if (elements.expenseCategoriesList) elements.expenseCategoriesList.addEventListener('click', (e) => handleDeleteCategory(e, 'expense', ESSENTIAL_EXPENSE_CATEGORIES));
    if (elements.operationTypesList) elements.operationTypesList.addEventListener('click', (e) => handleDeleteCategory(e, 'operationType', ESSENTIAL_OPERATION_TYPES));
    if (elements.taxIdTypesList) elements.taxIdTypesList.addEventListener('click', (e) => handleDeleteCategory(e, 'taxIdType', ESSENTIAL_TAX_ID_TYPES));

    // Clients Section
    if (elements.addClientForm) {
        elements.addClientForm.addEventListener('submit', handleClientFormSubmit);
        const cancelBtn = elements.addClientForm.querySelector('#client-form-cancel-btn');
        if (cancelBtn) cancelBtn.addEventListener('click', () => {
            elements.addClientForm.reset();
             // Ensure hidden ID is cleared
            const clientIdInput = elements.addClientForm.querySelector('#client-id');
            if (clientIdInput) clientIdInput.value = '';
            document.getElementById('client-form-title').textContent = 'Agregar Nuevo Cliente';
            document.getElementById('client-form-submit-text').textContent = 'Guardar Cliente';
            cancelBtn.classList.add('hidden');
        });
    }
    if (elements.clientsTableBody) elements.clientsTableBody.addEventListener('click', handleClientsTableClick);

    // Invoicing Section
    const crearTab = document.getElementById('facturacion-tab-crear');
    if (crearTab) crearTab.addEventListener('click', () => {
        switchPage('facturacion', 'crear');
        populateNextInvoiceNumber();
    });
    const listadoTab = document.getElementById('facturacion-tab-listado');
    if (listadoTab) listadoTab.addEventListener('click', () => switchPage('facturacion', 'listado'));
    const configTab = document.getElementById('facturacion-tab-config');
    if (configTab) configTab.addEventListener('click', () => switchPage('facturacion', 'config'));

    if (elements.facturaAddItemBtn) elements.facturaAddItemBtn.addEventListener('click', () => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'grid grid-cols-12 gap-2 items-center factura-item';
        // Added placeholders and ensured type="text" with inputmode for numbers
        itemDiv.innerHTML = `
            <div class="col-span-6"><input type="text" class="form-input item-description" placeholder="Descripción" required></div>
            <div class="col-span-2"><input type="text" inputmode="decimal" value="1" class="form-input item-quantity text-right" required></div>
            <div class="col-span-3"><input type="text" inputmode="decimal" placeholder="0.00" class="form-input item-price text-right" required></div>
            <div class="col-span-1 flex justify-center"><button type="button" class="remove-item-btn p-2 text-red-400 hover:text-red-300"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div>`;
        elements.facturaItemsContainer.appendChild(itemDiv);
        lucide.createIcons(); // Create icon for the new button
         // Add listeners to new quantity/price inputs
         itemDiv.querySelector('.item-quantity').addEventListener('input', updateInvoiceTotals);
         itemDiv.querySelector('.item-price').addEventListener('input', updateInvoiceTotals);
         updateInvoiceTotals(); // Recalculate totals
    });

    if (elements.facturaItemsContainer) elements.facturaItemsContainer.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.remove-item-btn');
        if (removeBtn) {
            removeBtn.closest('.factura-item').remove();
            updateInvoiceTotals(); // Recalculate after removing
        }
    });
     // Add event listeners to initial quantity/price inputs if they exist on page load
    elements.facturaItemsContainer.querySelectorAll('.item-quantity, .item-price').forEach(input => {
        input.addEventListener('input', updateInvoiceTotals);
    });
     // Also trigger calculation when currency changes
    const facturaCurrencySelect = document.getElementById('factura-currency');
    if (facturaCurrencySelect) facturaCurrencySelect.addEventListener('change', updateInvoiceTotals);
    const facturaOperationTypeSelect = document.getElementById('factura-operation-type');
    if(facturaOperationTypeSelect) facturaOperationTypeSelect.addEventListener('change', updateInvoiceTotals);


    if (elements.facturaSelectCliente) elements.facturaSelectCliente.addEventListener('change', handleClientSelectionForInvoice);
    if (elements.nuevaFacturaForm) elements.nuevaFacturaForm.addEventListener('submit', handleGenerateInvoice);
    const facturaFecha = document.getElementById('factura-fecha');
    if (facturaFecha) facturaFecha.addEventListener('change', populateNextInvoiceNumber);
    if (elements.facturasTableBody) elements.facturasTableBody.addEventListener('click', handleDocumentsTableClick);
    const facturasSearch = document.getElementById('facturas-search');
    if (facturasSearch) facturasSearch.addEventListener('input', () => renderAll());
    if (elements.aeatConfigForm) elements.aeatConfigForm.addEventListener('submit', handleAeatConfigSave);
    if (elements.aeatToggleContainer) elements.aeatToggleContainer.addEventListener('click', (e) => {
        if (e.target.closest('.aeat-toggle-btn')) {
            withSpinner(() => actions.toggleAeatModule(), 150)();
        }
    });
    if (elements.fiscalParamsForm) elements.fiscalParamsForm.addEventListener('submit', handleFiscalParamsSave);

    // Invoice Viewer Modal
    if (elements.closeInvoiceViewerBtn) elements.closeInvoiceViewerBtn.addEventListener('click', hideInvoiceViewer);
    if (elements.printInvoiceBtn) elements.printInvoiceBtn.addEventListener('click', printInvoice);
    if (elements.pdfInvoiceBtn) elements.pdfInvoiceBtn.addEventListener('click', downloadInvoiceAsPDF);

    // Reports Section
    if (elements.reportForm) {
        elements.reportForm.addEventListener('submit', handleReportGeneration);
        const reportTypeSelect = document.getElementById('report-type');
        if (reportTypeSelect) reportTypeSelect.addEventListener('change', handleReportFilterChange);
        const reportPeriodSelect = document.getElementById('report-period');
        if (reportPeriodSelect) reportPeriodSelect.addEventListener('change', handleReportFilterChange);
    }
    if (elements.reportDisplayArea) elements.reportDisplayArea.addEventListener('click', handleReportDownloadClick);

    // Year Close
    const closeYearBtn = document.getElementById('close-year-btn');
    if (closeYearBtn) closeYearBtn.addEventListener('click', handleCloseYear);

    // Payment Details Modal
    if (elements.paymentDetailsForm) elements.paymentDetailsForm.addEventListener('submit', handlePaymentDetailsSubmit);
    if (elements.paymentDetailsCancelBtn) elements.paymentDetailsCancelBtn.addEventListener('click', hidePaymentDetailsModal);

    // IVA Section
    if (elements.ivaGenerateReportBtn) elements.ivaGenerateReportBtn.addEventListener('click', handleIvaReportGeneration);

    // Investments Section
    if (elements.addInvestmentAssetForm) elements.addInvestmentAssetForm.addEventListener('submit', handleAddInvestmentAsset);
    if (elements.investmentAssetsList) elements.investmentAssetsList.addEventListener('click', handleInvestmentAssetListClick);
    if (elements.addInvestmentForm) elements.addInvestmentForm.addEventListener('submit', handleAddInvestment);
    if (elements.investmentsTableBody) elements.investmentsTableBody.addEventListener('click', handleInvestmentsTableClick);

    // User Management (inside Settings)
    const refreshUsersBtn = document.getElementById('refresh-users-btn');
     if (refreshUsersBtn) {
         // Ensure only one listener is attached
         const newRefreshBtn = refreshUsersBtn.cloneNode(true);
         refreshUsersBtn.parentNode.replaceChild(newRefreshBtn, refreshUsersBtn);
         newRefreshBtn.addEventListener('click', () => {
             withSpinner(actions.loadAndSetAllUsers, 500)();
         });
     }
    if (elements.usersList) {
        // Use event delegation on the list itself
        const newUserList = elements.usersList.cloneNode(false); // Clone without children
        elements.usersList.parentNode.replaceChild(newUserList, elements.usersList);
        elements.usersList = newUserList; // Update reference
        elements.usersList.addEventListener('click', handleUserManagementClick);
    }
    // Permissions Modal
    if (elements.permissionsModalCancelBtn) elements.permissionsModalCancelBtn.addEventListener('click', hidePermissionsModal);
    if (elements.permissionsModalSaveBtn) elements.permissionsModalSaveBtn.addEventListener('click', handlePermissionsSave);

}

