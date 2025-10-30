/**
 * Renderers for Settings
 */
import { elements } from '../elements.js';
import { getState } from '../../store.js';
import { escapeHTML } from '../../utils.js';
import { ESSENTIAL_TAX_ID_TYPES } from '../../config.js';
// Importar la función que renderiza la lista de activos, ya que se usa en Ajustes
import { renderInvestmentAssetsList } from './investments.js';

// --- Funciones Creadoras de Elementos (Específicas de Ajustes) ---

/**
 * Renderiza la lista de usuarios en el panel de Ajustes.
 */
function renderUserManagement() {
    const { allUsers, permissions, currentUser } = getState();
    // Esta tarjeta solo es visible si manage_users es true, pero volvemos a chequear por si acaso
    if (!permissions.manage_users) {
        elements.userManagementCard.classList.add('hidden');
        return;
    }

    elements.userManagementCard.classList.remove('hidden');
    
    const header = elements.userManagementCard.querySelector('h3');
    if (header && !header.querySelector('#refresh-users-btn')) {
        header.classList.add('flex', 'justify-between', 'items-center');
        header.innerHTML = `
            <span>Gestión de Usuarios</span>
            <button id="refresh-users-btn" class="p-2 text-blue-400 hover:bg-gray-700 rounded-full" title="Actualizar Lista">
                <i data-lucide="refresh-cw" class="w-4 h-4"></i>
            </button>
        `;
    }
    
    const listEl = elements.usersList;
    if (!listEl) return;

    // Asegurarse de que allUsers es un array y currentUser existe
    const otherUsers = (allUsers || []).filter(user => user.id !== (currentUser ? currentUser.uid : null));

    if (otherUsers.length === 0) {
        listEl.innerHTML = `<p class="text-sm text-gray-500 text-center">No hay otros usuarios registrados.</p>`;
        return;
    }

    listEl.innerHTML = otherUsers.map(user => {
        const status = user.status || 'pendiente';
        let statusColor, statusText, actionsHtml;
        let baseActions = `
            <button class="delete-user-btn p-2 rounded-lg bg-red-600/20 hover:bg-red-600/40 text-red-300" data-id="${user.id}" title="Eliminar Usuario">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
        `;

        if (status === 'activo') {
            statusColor = 'text-green-400';
            statusText = 'Activo';
            actionsHtml = `
                <button class="manage-permissions-btn p-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-300" data-id="${user.id}" title="Gestionar Permisos">
                    <i data-lucide="shield-check" class="w-4 h-4"></i>
                </button>
                <button class="deactivate-btn p-2 rounded-lg bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-300" data-id="${user.id}" title="Desactivar">
                    <i data-lucide="user-x" class="w-4 h-4"></i>
                </button>
                ${baseActions}
            `;
        } else { // pendiente
            statusColor = 'text-yellow-400';
            statusText = 'Pendiente';
            actionsHtml = `
                <button class="activate-basic-btn p-2 rounded-lg bg-green-600/20 hover:bg-green-600/40 text-green-300 text-xs flex items-center gap-1" data-id="${user.id}" title="Activar Acceso Básico">
                    <i data-lucide="user-check" class="w-3 h-3"></i> Básico
                </button>
                <button class="activate-full-btn p-2 rounded-lg bg-green-600/20 hover:bg-green-600/40 text-green-300 text-xs flex items-center gap-1" data-id="${user.id}" title="Activar Acceso Completo">
                    <i data-lucide="user-check" class="w-3 h-3"></i> Completo
                </button>
                ${baseActions}
            `;
        }

        return `
            <div class="flex items-center justify-between bg-gray-800/50 p-3 rounded text-sm">
                <div>
                    <p class="font-semibold">${escapeHTML(user.email)}</p>
                    <p class="text-xs ${statusColor} capitalize">${escapeHTML(statusText)}</p>
                </div>
                <div class="flex items-center gap-2">
                    ${actionsHtml}
                </div>
            </div>
        `;
    }).join('');
}


/**
 * Renderiza la pestaña de Ajustes (Settings), incluyendo visibilidad de tarjetas y listas.
 */
export function renderSettings() {
    const { accounts, incomeCategories, expenseCategories, invoiceOperationTypes, taxIdTypes, settings, permissions } = getState();
    if (!permissions) return;

    // Mapeo de permisos a los elementos de las tarjetas de ajustes.
    const settingsCards = {
        manage_users: elements.userManagementCard,
        manage_fiscal_settings: elements.aeatSettingsCard,
        manage_fiscal_settings_2: elements.fiscalParamsForm?.parentElement?.parentElement,
        manage_accounts: elements.addAccountForm?.parentElement,
        manage_categories: elements.addIncomeCategoryForm?.parentElement?.parentElement?.parentElement,
        manage_categories_2: elements.addOperationTypeForm?.parentElement,
        manage_categories_3: elements.addTaxIdTypeForm?.parentElement,
        execute_balance_adjustment: elements.updateBalanceForm?.parentElement,
        manage_investments: elements.addInvestmentAssetForm?.parentElement,
        execute_year_close: document.getElementById('close-year-btn')?.parentElement
    };

    // Recorre y oculta/muestra cada tarjeta.
    for (const key in settingsCards) {
        // Usa una clave de permiso real del mapa de permisos.
        const permissionKey = key.replace(/_\d+$/, ''); // Elimina sufijos numéricos
        const element = settingsCards[key];
        if (element) {
            element.classList.toggle('hidden', !permissions[permissionKey]);
        }
    }
    
    // Si la tarjeta está visible, renderiza su contenido.
    if (permissions.manage_accounts && elements.settingsAccountsList) {
        elements.settingsAccountsList.innerHTML = '';
        (accounts || []).forEach(acc => {
            const div = document.createElement('div');
            div.className = "flex items-center justify-between bg-gray-800/50 p-2 rounded";
            div.innerHTML = `
                <div class="flex items-center gap-2 text-sm">${acc.logoHtml || ''}<span>${escapeHTML(acc.name)}</span></div>
                <button class="delete-account-btn p-1 text-red-400 hover:text-red-300" data-id="${acc.id}" data-name="${escapeHTML(acc.name)}"><i data-lucide="trash-2" class="w-4 h-4"></i></button>`;
            elements.settingsAccountsList.appendChild(div);
        });
    }

    const renderCategoryList = (listEl, categories, essentialCategories) => {
        if (!listEl) return;
        listEl.innerHTML = '';
        (categories || []).forEach(cat => {
            const div = document.createElement('div');
            div.className = "flex items-center justify-between bg-gray-800/50 p-2 rounded text-sm";
            const isEssential = (essentialCategories || []).includes(cat);
            const deleteButtonHtml = isEssential 
                ? `<span class="p-1 text-gray-600 cursor-not-allowed" title="Categoría esencial"><i data-lucide="lock" class="w-4 h-4"></i></span>`
                : `<button class="delete-category-btn p-1 text-red-400 hover:text-red-300" data-name="${escapeHTML(cat)}"><i data-lucide="trash-2" class="w-4 h-4"></i></button>`;
            div.innerHTML = `<span>${escapeHTML(cat)}</span> ${deleteButtonHtml}`;
            listEl.appendChild(div);
        });
    };

    if (permissions.manage_categories) {
        renderCategoryList(elements.incomeCategoriesList, incomeCategories, []);
        renderCategoryList(elements.expenseCategoriesList, expenseCategories, []);
        renderCategoryList(elements.operationTypesList, invoiceOperationTypes, []);
        renderCategoryList(elements.taxIdTypesList, taxIdTypes, ESSENTIAL_TAX_ID_TYPES);
    }

    if (permissions.manage_investments) {
        // Esta función se importa desde 'investments.js'
        renderInvestmentAssetsList(); 
    }
    
    if (permissions.manage_users) {
        renderUserManagement();
    }
    
    if (permissions.manage_fiscal_settings && elements.aeatToggleContainer && settings) {
        const isActive = settings.aeatModuleActive;
        elements.aeatToggleContainer.innerHTML = isActive
            ? `<button class="aeat-toggle-btn bg-blue-600 text-white font-bold py-2 px-3 rounded-lg"><i data-lucide="check-circle" class="w-4 h-4"></i> Activado</button>`
            : `<button class="aeat-toggle-btn border border-blue-800 text-blue-400 font-bold py-2 px-3 rounded-lg">Activar</button>`;
    }
    
    const taxRateInput = elements.fiscalParamsForm?.querySelector('#corporate-tax-rate');
    if (permissions.manage_fiscal_settings && taxRateInput && settings && settings.fiscalParameters) {
        taxRateInput.value = settings.fiscalParameters.corporateTaxRate;
    }
}
