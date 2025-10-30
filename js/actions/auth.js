import { getState, setState } from '../store.js';
import { 
    saveSettings,
    getAllUsers, 
    updateUserStatus, 
    updateUserPermissions
} from '../api.js';

/**
 * Devuelve un objeto de permisos basado en el nivel de acceso.
 * @param {string} level - Nivel de acceso ('pendiente', 'basico', 'completo').
 * @returns {object} Objeto de permisos.
 */
const getPermissionsForLevel = (level) => { 
    const allFalse = {
        view_dashboard: false, view_accounts: false, view_cashflow: false, manage_cashflow: false,
        execute_transfers: false, view_documents: false, manage_invoices: false, manage_proformas: false,
        change_document_status: false, view_clients: false, manage_clients: false, view_reports: false,
        view_iva_control: false, view_archives: false, view_investments: false, manage_investments: false,
        manage_accounts: false, manage_categories: false, execute_balance_adjustment: false,
        execute_year_close: false, manage_fiscal_settings: false, manage_users: false,
    };
    
    if (level === 'basico') {
        // Permisos de solo lectura
        return {
            ...allFalse,
            view_dashboard: true, view_accounts: true, view_cashflow: true,
            view_documents: true, view_clients: true, view_reports: true,
            view_iva_control: true, view_archives: true, view_investments: true,
        };
    }
    
    if (level === 'completo') {
         // Permisos de gestión (pero no de admin de usuarios)
         return {
            ...allFalse,
            view_dashboard: true, view_accounts: true, view_cashflow: true, manage_cashflow: true,
            execute_transfers: true, view_documents: true, manage_invoices: true, manage_proformas: true,
            change_document_status: true, view_clients: true, manage_clients: true, view_reports: true,
            view_iva_control: true, view_archives: true, view_investments: true, manage_investments: true,
            manage_accounts: true, manage_categories: true, execute_balance_adjustment: true,
            execute_year_close: true, manage_fiscal_settings: true,
            manage_users: false, // <-- Solo un admin puede gestionar usuarios
         };
    }

    return allFalse; // Nivel 'pendiente' o desconocido
};

/**
 * Actualiza el estado y permisos de un usuario a un nivel predefinido.
 * @param {string} userId - ID del usuario a modificar.
 * @param {string} level - 'basico', 'completo', o 'pendiente'.
 */
export async function updateUserAccessAction(userId, level) { 
    const newStatus = (level === 'basico' || level === 'completo') ? 'activo' : 'pendiente';
    const updates = { status: newStatus };
    
    if (level === 'basico') {
        updates.permisos = getPermissionsForLevel('basico');
    } else if (level === 'completo') {
        updates.permisos = getPermissionsForLevel('completo');
    } else {
        updates.permisos = getPermissionsForLevel('pendiente');
    }

    const success = await updateUserPermissions(userId, updates);
    if (success) {
        await loadAndSetAllUsers();
    }
    return success;
}

/**
 * Carga todos los usuarios desde Firestore, filtra los bloqueados, y los guarda en el estado global.
 */
export async function loadAndSetAllUsers() { 
    const rawUsers = await getAllUsers();
    const { settings } = getState();
    const blockedUserIds = (settings && settings.blockedUserIds) || [];
    const filteredUsers = rawUsers.filter(user => user.email && !blockedUserIds.includes(user.id));
    setState({ allUsers: filteredUsers });
}

/**
 * Cambia el estado de un usuario entre 'activo' y 'pendiente'.
 * @param {string} userId - ID del usuario.
 * @param {string} currentStatus - Estado actual ('activo' o 'pendiente').
 */
export async function toggleUserStatusAction(userId, currentStatus) { 
    const newStatus = currentStatus === 'activo' ? 'pendiente' : 'activo';
    const success = await updateUserStatus(userId, newStatus);
    if (success) {
        await loadAndSetAllUsers();
    }
    return success;
}

/**
 * "Bloquea" a un usuario añadiéndolo a la lista 'blockedUserIds' en settings.
 * No elimina al usuario, solo lo oculta de la UI de gestión.
 * @param {string} userId - ID del usuario a bloquear.
 */
export async function blockUserAction(userId) { 
    const { settings } = getState();
    const adminUids = (settings && settings.adminUids) || [];
    if (adminUids.includes(userId)) {
        return { success: false, message: 'No se puede eliminar a un administrador.' };
    }
    const blockedUserIds = (settings && settings.blockedUserIds) || [];
    if (!blockedUserIds.includes(userId)) {
        const newSettings = { ...settings, blockedUserIds: [...blockedUserIds, userId] };
        await saveSettings(newSettings); 
        await loadAndSetAllUsers(); 
        return { success: true };
    }
    return { success: true, message: 'El usuario ya estaba bloqueado.' };
}
