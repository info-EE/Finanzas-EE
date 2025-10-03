import { store } from './store.js';
import { initApp } from './actions.js';
import { renderAll, charts } from './ui.js';
import { bindEventListeners } from './handlers.js';

/**
 * Clase principal de la aplicación.
 * Encapsula la inicialización y el flujo de datos principal.
 */
class App {
    constructor() {
        this.store = store;
        this.charts = charts;
    }

    /**
     * Inicializa la aplicación.
     */
    init() {
        // Crea los iconos de Lucide en la carga inicial.
        lucide.createIcons();

        // Suscribe la función de renderizado principal a los cambios del estado.
        // Cada vez que el estado se actualice, `renderAll` será llamado con el nuevo estado.
        this.store.subscribe(() => {
            renderAll(this.store.getState(), this.charts);
        });

        // Vincula todos los manejadores de eventos a los elementos del DOM una sola vez.
        bindEventListeners();

        // Despacha la acción inicial para cargar los datos y configurar la aplicación.
        this.store.dispatch(initApp());
    }
}

// Inicializa y arranca la aplicación.
const app = new App();
app.init();

