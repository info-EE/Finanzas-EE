// Reexportador inicial para facilitar la migración incremental.
// - Exporta `elements` desde el nuevo `elements.js`.
// - Reexporta todo lo que sigue existiendo en `../ui.js` para compatibilidad.
// Exportar elementos centralizados
export { elements } from './elements.js';

// Reexportar el API estable que aún permanece en js/ui.js
export * from '../ui.js';

// Reexportar módulos migrados para que la importación desde './ui' provea
// todas las funciones públicas durante la migración.
export * from './modals.js';
export * from './viewers.js';
export * from './charts.js';
