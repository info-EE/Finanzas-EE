import * as actions from '../actions.js';
import * as api from '../api.js';
import {
    elements,
    showConfirmationModal,
    showAlertModal,
    hidePermissionsModal,
    showPermissionsModal,
    showAuthError,
    clearAuthError,
    showRegisterView,
    showLoginView,
    hideApp, // <- Importado para handlePermissionsSave
    updateConnectionStatus // <- Importado para handlePermissionsSave
} from '../ui/index.js';
import { getState, resetState, setState } from '../store.js'; // <- Importado setState y resetState
import { escapeHTML } from '../utils.js';
import { withSpinner } from './helpers.js';

// Centraliza las descripciones de los permisos para la UI.
export const PERMISSION_DESCRIPTIONS = {
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

// --- Función para traducir errores de Auth ---
function translateAuthError(errorCode) {
    switch (errorCode) {
        case 'auth/email-already-in-use':
            return 'Este correo electrónico ya está registrado.';
        case 'auth/invalid-email':
            return 'El formato del correo electrónico no es válido.';
        case 'auth/weak-password':
            return 'La contraseña debe tener al menos 6 caracteres.';
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
            return 'El correo o la contraseña son incorrectos.';
        case 'auth/registration-pending': // Error customizado
            return 'Registro exitoso. Tu cuenta está pendiente de aprobación por un administrador.';
        default:
            console.error("Error de autenticación no traducido:", errorCode); // Añadimos un log
            return 'Ha ocurrido un error. Inténtalo de nuevo más tarde.';
    }
}

// --- Auth Handlers ---
function handleLoginSubmit(e) {
    e.preventDefault();
    clearAuthError();
    const email = elements.loginForm.querySelector('#login-email').value;
    const password = elements.loginForm.querySelector('#login-password').value;

    console.log('Intentando iniciar sesión con:', email);
    console.log('Contraseña (longitud):', password.length);

    withSpinner(async () => {
        try {
            console.log('Llamando a api.loginUser...');
            await api.loginUser(email, password);
            console.log('api.loginUser completado (¿éxito?)');
        } catch (error) {
            console.error('Error atrapado en handleLoginSubmit:', error);
            console.log('Código de error:', error.code);
            console.log('Mensaje traducido:', translateAuthError(error.code));
            showAuthError(translateAuthError(error.code));
        }
    })();
}

function handleRegisterSubmit(e) {
    e.preventDefault();
    clearAuthError();
    const email = elements.registerForm.querySelector('#register-email').value;
    const password = elements.registerForm.querySelector('#register-password').value;

     withSpinner(async () => {
        try {
            await api.registerUser(email, password);
        } catch (error) {
            showAuthError(translateAuthError(error.code));
        }
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
            api.setCurrentUser(null);
            setState({ currentUser: null }); // Usa setState
            hideApp();
            updateConnectionStatus('success', 'Desconectado');
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


function handleTogglePassword(e) {
    const button = e.currentTarget;
    const input = button.previousElementSibling;
    const icon = button.querySelector('i[data-lucide]'); // Select the icon element directly

    if (!input || !icon) return; // Exit if elements are not found

    if (input.type === 'password') {
        input.type = 'text';
        icon.setAttribute('data-lucide', 'eye-off');
    } else {
        input.type = 'password';
        icon.setAttribute('data-lucide', 'eye');
    }
    // Recreate icons specifically for the updated element
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons({
            nodes: [icon]
        });
    }
}

// --- Funciones "Binder" ---

/**
 * Asigna los eventos de autenticación (login, registro).
 * Esta función se llamará desde `bindAuthEventListeners` en `handlers.js`.
 */
export function bindAuthEvents() {
    console.log("Binding Auth Events...");
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

    const toggleLoginPassword = document.getElementById('toggle-login-password');
    if (toggleLoginPassword) toggleLoginPassword.addEventListener('click', handleTogglePassword);

    const toggleRegisterPassword = document.getElementById('toggle-register-password');
    if (toggleRegisterPassword) toggleRegisterPassword.addEventListener('click', handleTogglePassword);
    
    // Asignar el evento de Logout también
    if (elements.logoutBtn) elements.logoutBtn.addEventListener('click', handleLogout);
}

/**
 * Asigna los eventos de gestión de usuarios (lista, modal de permisos).
 * Esta función se llamará desde `bindEventListeners` en `handlers.js`.
 */
export function bindUserManagementEvents() {
    console.log("Binding User Management Events...");
    const refreshUsersBtn = document.getElementById('refresh-users-btn');
     if (refreshUsersBtn) {
         const newRefreshBtn = refreshUsersBtn.cloneNode(true);
         refreshUsersBtn.parentNode.replaceChild(newRefreshBtn, refreshUsersBtn);
         newRefreshBtn.addEventListener('click', () => {
             withSpinner(actions.loadAndSetAllUsers, 500)();
         });
     }
    if (elements.usersList) {
        // Clonar y reemplazar para limpiar listeners antiguos
        const newUserList = elements.usersList.cloneNode(false);
        elements.usersList.parentNode.replaceChild(newUserList, elements.usersList);
        elements.usersList = newUserList; // Actualizar la referencia en el objeto elements
        elements.usersList.addEventListener('click', handleUserManagementClick);
    }
    if (elements.permissionsModalCancelBtn) elements.permissionsModalCancelBtn.addEventListener('click', hidePermissionsModal);
    if (elements.permissionsModalSaveBtn) elements.permissionsModalSaveBtn.addEventListener('click', handlePermissionsSave);
}
