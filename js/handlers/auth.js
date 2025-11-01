import * as actions from '../actions.js';
import * as api from '../api.js';
import {
    elements,
    showConfirmationModal,
    showAlertModal,
    // *** CÓDIGO ELIMINADO: Modales de permisos ya no se usan ***
    // hidePermissionsModal,
    // showPermissionsModal,
    showAuthError,
    clearAuthError,
    showRegisterView,
    showLoginView
    // *** CÓDIGO ELIMINADO: Imports innecesarios ***
    // hideApp,
    // updateConnectionStatus
} from '../ui/index.js';
// *** CÓDIGO MODIFICADO: 'setState' ya no es necesario ***
import { getState, resetState } from '../store.js'; 
import { escapeHTML } from '../utils.js';
import { withSpinner } from './helpers.js';

// *** CÓDIGO ELIMINADO: El diccionario de permisos ya no es necesario en la UI ***
// export const PERMISSION_DESCRIPTIONS = { ... };

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

// *** CÓDIGO ELIMINADO: populatePermissionsModal ya no es necesario ***
// function populatePermissionsModal(user) { ... }

// *** CÓDIGO ELIMINADO: handlePermissionsSave ya no es necesario ***
// function handlePermissionsSave() { ... }


/**
 * Manejador principal para los clics en la lista de gestión de usuarios.
 */
function handleUserManagementClick(e) {
    // *** CÓDIGO MODIFICADO: Lógica de botones simplificada ***
    const activateBtn = e.target.closest('.activate-btn');
    const deactivateBtn = e.target.closest('.deactivate-btn');
    const deleteBtn = e.target.closest('.delete-user-btn');

    if (activateBtn) {
        const userId = activateBtn.dataset.id;
        const currentStatus = activateBtn.dataset.status; // 'pendiente'
        showConfirmationModal('Activar Usuario', '¿Dar acceso completo a este usuario?', 
            withSpinner(() => actions.toggleUserStatusAction(userId, currentStatus))
        );
    }

    if (deactivateBtn) {
        const userId = deactivateBtn.dataset.id;
        const currentStatus = deactivateBtn.dataset.status; // 'activo'
        showConfirmationModal('Desactivar Usuario', '¿Quitar el acceso a este usuario? (Pasará a estado "Pendiente")', 
            withSpinner(() => actions.toggleUserStatusAction(userId, currentStatus))
        );
    }
    
    // *** CÓDIGO ELIMINADO: Botones 'basico', 'completo' y 'manage' ***
    // if (activateBasicBtn) { ... }
    // if (activateFullBtn) { ... }
    // if (manageBtn) { ... }

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
    // *** FIN DE CÓDIGO MODIFICADO ***
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
    
    // *** CÓDIGO ELIMINADO: Listeners del modal de permisos ***
    // if (elements.permissionsModalCancelBtn) elements.permissionsModalCancelBtn.addEventListener('click', hidePermissionsModal);
    // if (elements.permissionsModalSaveBtn) elements.permissionsModalSaveBtn.addEventListener('click', handlePermissionsSave);
}
