import { getState } from './store.js';
import { elements } from './ui/elements.js';

// --- Importaciones de Módulos Refactorizados ---
// (Estas funciones ya no viven en este archivo, solo las importamos)

// Fase 1: Controles (selects, formularios, etc.)
import {
    populateSelects,
    populateCategories,
    updateCurrencySymbol,
    updateTransferFormUI,
    resetTransactionForm,
    populateClientSelectForInvoice,
    populateNextInvoiceNumber
} from './ui/controls.js';

// Fase 2: Vistas/Modales (visibilidad, popups, etc.)
// (Ya importados y re-exportados por js/ui/index.js)

// Fase 3: Helpers (exportar, sidebar, conexión, etc.)
import {
    closeSidebar
    // --- INICIO DE CORRECCIÓN ---
    // Estas funciones se definen localmente, no se importan.
    // updateNavLinksVisibility, 
    // updateActionElementsVisibility
    // --- FIN DE CORRECCIÓN ---
} from './ui/helpers.js';

// Fase 4/5: Renderizadores (los que dibujan cada sección)
import { charts } from './ui/charts.js'; // <-- CORRECCIÓN: Esta línea fue añadida
import { renderTransactions } from './ui/renderers/transactions.js';
import { renderAccountsTab, renderBalanceLegendAndChart } from './ui/renderers/accounts.js';
import { renderDocuments } from './ui/renderers/documents.js';
import { renderClients, renderClientsChart } from './ui/renderers/clients.js';
import { renderInvestments } from './ui/renderers/investments.js';
import { renderInicioDashboard } from './ui/renderers/dashboard.js';
import { renderReport, renderIvaReport } from './ui/renderers/reports.js';
import { renderSettings } from './ui/renderers/settings.js';

// --- INICIO DE CORRECCIÓN: Funciones movidas aquí ---
// (Estas funciones se definen ahora localmente en ui.js)

const viewPermissionMap = {
    'inicio': 'view_dashboard',
    'cashflow': 'view_cashflow',
    'iva': 'view_iva_control',
    'cuentas': 'view_accounts',
    'proformas': 'view_documents',
    'reportes': 'view_reports',
    'archivos': 'view_archives',
    'facturacion': 'view_documents',
    'inversiones': 'view_investments',
    'clientes': 'view_clients',
    'ajustes': ['manage_accounts', 'manage_categories', 'execute_balance_adjustment', 'execute_year_close', 'manage_fiscal_settings', 'manage_users'],
};

/**
 * Muestra u oculta los enlaces de navegación según los permisos del usuario.
 * @param {object} permissions - El objeto de permisos del estado.
 */
function updateNavLinksVisibility(permissions) {
    if (!permissions || !elements.navLinks) return;

    elements.navLinks.forEach(link => {
        const pageId = link.id.replace('nav-', '');
        const requiredPermission = viewPermissionMap[pageId];
        let hasPermission = false;

        if (!requiredPermission) {
            hasPermission = true; // ej. logout btn (aunque este no está en navLinks)
        } else if (Array.isArray(requiredPermission)) {
            hasPermission = requiredPermission.some(p => permissions[p]);
        } else {
            hasPermission = permissions[requiredPermission];
        }
        
        // Ocultar si NO tiene permiso Y NO es el botón de logout
        link.classList.toggle('hidden', !hasPermission && link.id !== 'logout-btn');
    });
}

/**
 * Muestra u oculta elementos de acción (ej. botones "Añadir") según los permisos.
 * @param {object} permissions - El objeto de permisos del estado.
 */
function updateActionElementsVisibility(permissions) {
    if (!permissions) return;

    // Mapa de permisos para botones de acción (simplificado)
    const actionPermissionMap = {
        'quick-add-income': 'manage_cashflow',
        'quick-add-expense': 'manage_cashflow',
        // Ocultar los contenedores de formularios si no hay permisos
        'transaction-form': 'manage_cashflow',
        'transfer-form': 'execute_transfers',
        'proforma-form': 'manage_proformas',
    };

    for (const id in actionPermissionMap) {
        const el = document.getElementById(id);
        const perm = actionPermissionMap[id];
        if (el) {
            // Los formularios están dentro de un div 'card', ocultamos el 'card'
            const parentCard = el.closest('.card');
            if (parentCard) {
                parentCard.classList.toggle('hidden', !permissions[perm]);
            } else {
                el.classList.toggle('hidden', !permissions[perm]);
            }
        }
    }
}
// --- FIN DE CORRECCIÓN ---


// --- Funciones Centrales (Coordinadores) ---
// (Estas son las ÚNICAS funciones que deben quedar en ui.js)

/**
 * Cambia la página visible en la UI y actualiza la navegación.
 * Llama a renderAll() al final.
 * @param {string} pageId - El ID de la página a mostrar (ej. 'inicio', 'cashflow').
 * @param {string} [subpageId=null] - El ID de la sub-pestaña (ej. 'crear' en facturación).
 */
export function switchPage(pageId, subpageId = null) {
    const { permissions } = getState();
    // Salir si los permisos aún no se han cargado
    if (!permissions) {
        console.warn("[switchPage] Permisos no cargados. Abortando cambio de página.");
        return;
    }

    // Oculta todas las páginas
    elements.pages.forEach(page => page.classList.add('hidden'));

    // Mapa de permisos (MOVIDO ARRIBA)
    // const viewPermissionMap = { ... };

    const requiredPermission = viewPermissionMap[pageId];
    let hasPermission = false;

    if (requiredPermission) {
        if (Array.isArray(requiredPermission)) {
            hasPermission = requiredPermission.some(p => permissions[p]);
        } else {
            hasPermission = permissions[requiredPermission];
        }
    } else {
        console.warn(`[switchPage] No hay permiso definido para pageId: ${pageId}. Denegando acceso.`);
        hasPermission = false;
    }

    // Si no tiene permiso, redirige a 'inicio'
    if (!hasPermission) {
        console.warn(`Acceso denegado a '${pageId}'. Redirigiendo a 'inicio'.`);
        pageId = 'inicio';
        // (La alerta de 'Acceso Denegado' se maneja en handlers.js)
    }

    // Muestra la página solicitada (o 'inicio' si no hay permiso)
    const activePage = document.getElementById(`page-${pageId}`);
    if (activePage) {
        activePage.classList.remove('hidden');
    } else {
        console.error(`[switchPage] No se encontró la página con ID: page-${pageId}. Mostrando 'inicio'.`);
        document.getElementById('page-inicio').classList.remove('hidden');
        pageId = 'inicio'; // Asegurar que el ID de página refleje la realidad
    }

    // Actualiza el link activo en la navegación
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    const activeLink = document.getElementById(`nav-${pageId}`);
    if (activeLink) {
        activeLink.classList.add('active');
    }

    // Manejo de sub-páginas (como en facturación)
    if (pageId === 'facturacion') {
        if (!subpageId) {
            const activeTab = document.querySelector('#page-facturacion .tab-button-inner.active');
            subpageId = activeTab ? activeTab.id.replace('facturacion-tab-', '') : 'crear';
            if (!['crear', 'listado', 'config'].includes(subpageId)) {
                subpageId = 'crear';
            }
        }
        
        // --- INICIO CORRECCIÓN PERMISOS SUB-PÁGINA ---
        const configTab = document.getElementById('facturacion-tab-config');
        if (configTab) {
            configTab.classList.toggle('hidden', !permissions.manage_fiscal_settings);
        }
        // Si intenta ir a 'config' sin permisos, redirigir
        if (subpageId === 'config' && !permissions.manage_fiscal_settings) {
            subpageId = 'crear';
        }
        // --- FIN CORRECCIÓN PERMISOS SUB-PÁGINA ---

        document.querySelectorAll('#page-facturacion .tab-button-inner').forEach(btn => btn.classList.remove('active'));
        const tabButton = document.getElementById(`facturacion-tab-${subpageId}`);
        if (tabButton) tabButton.classList.add('active');

        ['crear', 'listado', 'config'].forEach(id => {
            const content = document.getElementById(`facturacion-content-${id}`);
            if (content) content.classList.toggle('hidden', id !== subpageId);
        });
    }

    // Cierra el menú lateral en móvil
    if (window.innerWidth < 768) {
        closeSidebar(); // Esta función ahora se importa desde helpers.js
    }

    // Llama a la función principal de renderizado UNA SOLA VEZ
    renderAll();
}

/**
 * Función central que decide qué renderizar basado en la página visible.
 * Se llama CADA VEZ que el estado cambia (notificado por store.js) o
 * CADA VEZ que se cambia de página (llamado por switchPage).
 */
export function renderAll() {
    const state = getState();
    // Salir si el estado o los permisos o las cuentas aún no están listos
    if (!state || !state.permissions || !state.accounts) {
        console.warn("[renderAll] Estado, permisos o cuentas no disponibles aún. Esperando...");
        return;
    }

    console.log("[renderAll] Iniciando ciclo de renderizado...");

    // 1. Actualizar visibilidad de elementos basada en permisos
    updateNavLinksVisibility(state.permissions);
    updateActionElementsVisibility(state.permissions);

    // 2. Rellenar selects (se necesita en casi todas las páginas)
    // ESTA ES LA LLAMADA QUE FALLABA
    populateSelects();

    // 3. Renderizar la página activa
    const visiblePage = Array.from(elements.pages).find(p => !p.classList.contains('hidden'));
    
    if (visiblePage) {
        const pageId = visiblePage.id.replace('page-', '');
        console.log(`[renderAll] Renderizando contenido para página activa: ${pageId}`);

        // Llamar al renderizador específico para la página activa
        switch (pageId) {
            case 'inicio':
                renderInicioDashboard(state, charts); // charts se importa desde './ui/charts.js'
                break;
            case 'cashflow':
                renderTransactions(); // Usa getState() internamente
                break;
            case 'cuentas':
                renderAccountsTab(state);
                renderBalanceLegendAndChart(state); // charts se usa internamente
                break;
            case 'proformas':
                renderDocuments('Proforma', elements.proformasTableBody, 'proformas-search');
                break;
            case 'facturacion':
                renderDocuments('Factura', elements.facturasTableBody, 'facturas-search');
                // Comprobar si la pestaña 'crear' está activa
                const createInvoiceTab = document.getElementById('facturacion-content-crear');
                if (createInvoiceTab && !createInvoiceTab.classList.contains('hidden')) {
                    populateNextInvoiceNumber(); // Rellenar número de factura
                }
                break;
            case 'clientes':
                renderClients(); // Usa getState() internamente
                renderClientsChart(); // charts se usa internamente
                break;
            case 'inversiones':
                renderInvestments(); // Usa getState() internamente
                break;
            case 'ajustes':
                renderSettings(); // Usa getState() internamente
                break;
            case 'reportes':
                renderReport(); // Usa getState() internamente
                break;
            case 'iva':
                renderIvaReport(); // Usa getState() internamente
                break;
            case 'archivos':
                // (No hay un renderizador específico para 'archivos' aún)
                console.log("[renderAll] Página 'archivos' visible, pero sin renderizador asignado.");
                break;
            default:
                console.warn("[renderAll] Página visible desconocida:", pageId);
        }
    } else {
        console.warn("[renderAll] No se encontró ninguna página visible para renderizar.");
    }

    // 4. (Re)crear iconos de Lucide
    // (Esto debe ser lo último, después de que el HTML haya sido inyectado)
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        try {
            // Re-crear iconos solo en el contenido principal, que es lo que cambia
            const iconsToCreate = elements.mainContent.querySelectorAll('i[data-lucide]');
            if (iconsToCreate.length > 0) {
                lucide.createIcons({ nodes: iconsToCreate });
            }
        } catch (error) {
            console.error("Error al (re)crear iconos Lucide en renderAll:", error);
        }
    }
    console.log("[renderAll] Ciclo de renderizado completo.");
}
