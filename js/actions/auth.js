import { getState, setState } from '../store.js';
import { 
    saveSettings,
    getAllUsers, 
    updateUserStatus, 
    updateUserPermissions // <-- Lo mantenemos por si el admin cambia su propio status
} from '../api.js';

// *** CÓDIGO ELIMINADO: getPermissionsForLevel ya no es necesario ***
// const getPermissionsForLevel = (level) => { ... };

// *** CÓDIGO ELIMINADO: updateUserAccessAction ya no es necesario ***
// export async function updateUserAccessAction(userId, level) { ... }

/**
 * Carga todos los usuarios desde Firestore, filtra los bloqueados, y los guarda en el estado global.
 */
export async function loadAndSetAllUsers() { 
    const rawUsers = await getAllUsers();
    const { settings } = getState();
    const blockedUserIds = (settings && settings.blockedUserIds) || [];
    // *** CÓDIGO MODIFICADO: No filtrar por email, solo por ID bloqueado ***
    const filteredUsers = rawUsers.filter(user => !blockedUserIds.includes(user.id));
    setState({ allUsers: filteredUsers });
}

/**
 * Cambia el estado de un usuario entre 'activo' y 'pendiente'.
 * @param {string} userId - ID del usuario.
 *@param {string} currentStatus - Estado actual ('activo' o 'pendiente').
 */
export async function toggleUserStatusAction(userId, currentStatus) { 
    const newStatus = currentStatus === 'activo' ? 'pendiente' : 'activo';
    
    // *** CÓDIGO AÑADIDO: Si se activa, también se asignan permisos por defecto ***
    // (Aunque la lógica de 'store.js' ya le da permisos al iniciar sesión,
    //  esto es una buena práctica para tenerlo en la BD por si acaso)
    const updates = { status: newStatus };

    // Buscamos los permisos de 'usuario' (todos menos manage_users)
    // Esto es para asegurar que si un usuario fue "desactivado" y perdió permisos,
    // los recupere al "activar".
    if (newStatus === 'activo') {
        // Obtenemos los permisos de 'Admin'
        const adminPerms = getState().permissions; // Asumimos que esta acción solo la llama un admin
        // Creamos permisos de 'Usuario' (todos menos 'manage_users')
        const userPerms = { ...adminPerms, manage_users: false };
        updates.permisos = userPerms;
    } else {
        // Al desactivar, borramos sus permisos por seguridad
        updates.permisos = {}; 
    }
    
    // Usamos updateUserPermissions que puede actualizar múltiples campos
    const success = await updateUserPermissions(userId, updates);
    // *** FIN DE CÓDIGO AÑADIDO ***
    
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
    // *** CÓDIGO MODIFICADO: Usar adminEmails para la comprobación ***
    const allUsers = await getAllUsers(); // Necesitamos recargar para encontrar el email
    const userToBlock = allUsers.find(u => u.id === userId);
    
    if (userToBlock && settings.adminEmails.includes(userToBlock.email)) {
        return { success: false, message: 'No se puede eliminar a un administrador.' };
    }
    // *** FIN DE CÓDIGO MODIFICADO ***

    const blockedUserIds = (settings && settings.blockedUserIds) || [];
    if (!blockedUserIds.includes(userId)) {
        const newSettings = { ...settings, blockedUserIds: [...blockedUserIds, userId] };
        await saveSettings(newSettings); 
        await loadAndSetAllUsers(); 
        return { success: true };
    }
    return { success: true, message: 'El usuario ya estaba bloqueado.' };
}
