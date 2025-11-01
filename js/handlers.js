import * as actions from './actions.js';
import * as api from './api.js';
import {
    elements,
    switchPage,
    renderAll,
    openSidebar,
    closeSidebar,
    resizeCharts
} from './ui/index.js';
import { getState } from './store.js';
import { withSpinner } from './handlers/helpers.js';

// --- Importaciones de Módulos (Fase 1-5) ---
// --- MODIFICADO: Importamos 'handleLogout' ---
import { bindAuthEvents, bindUserManagementEvents, handleLogout } from './handlers/auth.js';
import { bindCashflowEvents } from './handlers/cashflow.js';
import { bindDocumentEvents } from './handlers/documents.js';
import { bindClientEvents } from './handlers/clients.js';
import { bindInvestmentEvents } from './handlers/investments.js';
import { bindReportEvents } from './handlers/reports.js';
import { bindSettingsEvents } from './handlers/settings.js';


// --- Funciones Manejadoras (Handlers) ---
// (Todas las funciones 'handle...' de reportes y ajustes se han movido)


// --- Vinculación de Eventos de Autenticación (se llama al cargar la página) ---
export function bindAuthEventListeners() {
    // Llama al "binder" de autenticación
    bindAuthEvents();
}


// --- Vinculación de Eventos de la Aplicación (se llama DESPUÉS de iniciar sesión) ---
export function bindEventListeners() {

    // Llama a los "binders" modulares
    bindUserManagementEvents(); // (Fase 1)
    bindCashflowEvents();       // (Fase 2)
    bindDocumentEvents();       // (Fase 3)
    bindClientEvents();         // (Fase 4)
    bindInvestmentEvents();     // (Fase 4)
    bindReportEvents();         // (Fase 5)
    bindSettingsEvents();       // (Fase 5)

    // --- Eventos Globales y Restantes ---

    // Mobile navigation
    if (elements.sidebarOpenBtn) elements.sidebarOpenBtn.addEventListener('click', openSidebar);
    if (elements.sidebarCloseBtn) elements.sidebarCloseBtn.addEventListener('click', closeSidebar);
    if (elements.sidebarOverlay) elements.sidebarOverlay.addEventListener('click', closeSidebar);

    // Desktop navigation toggle
    if (elements.sidebarToggleDesktopBtn) {
        elements.sidebarToggleDesktopBtn.addEventListener('click', () => {
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
                resizeCharts();
            }, 350);
        });
    }

    // Main navigation links
    elements.navLinks.forEach(link => {
        link.replaceWith(link.cloneNode(true));
    });
    
    // --- INICIO DE MODIFICACIÓN ---
    // El bucle ahora asigna TODOS los links, incluido el de logout
    document.querySelectorAll('.nav-link').forEach(link => {
         if (link.id === 'logout-btn') {
            // Asignamos el handler de logout aquí, después de la clonación
             link.addEventListener('click', (e) => {
                 e.preventDefault();
                 handleLogout(); // Usamos la función importada
             });
         } else {
            // Asignamos el handler de cambio de página
             link.addEventListener('click', (e) => {
                 e.preventDefault();
                 const pageId = link.id.replace('nav-', '');
                 switchPage(pageId);
             });
         }
    });
    // --- FIN DE MODIFICACIÓN ---
    
    // --- ELIMINADO: Este comentario ya no es correcto ---
    // El logout-btn es asignado en bindAuthEvents()
}
