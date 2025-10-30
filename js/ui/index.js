// Reexportador inicial para facilitar la migración incremental.
// - Exporta `elements` desde el nuevo `elements.js`.
// - Reexporta todo lo que sigue existiendo en `../ui.js` para compatibilidad.

// Exportar elementos centralizados
export { elements } from './elements.js';

// Reexportar el API estable que aún permanece en js/ui.js
export * from '../ui.js';
// ---- NUEVO: Exportar explícitamente renderAll ----
export { renderAll } from '../ui.js';
// ---- FIN NUEVO ----


// Reexportar módulos migrados para que la importación desde './ui' provea
// todas las funciones públicas durante la migración.
export * from './modals.js';
export * from './viewers.js';
export * from './charts.js';
// ---- (FASE 1) ----
export * from './controls.js';
// ---- FIN (FASE 1) ----

// NOTA: A medida que muevas más funciones de 'ui.js' a módulos específicos
// (como renderers, controls), deberás exportarlas explícitamente aquí
// o desde sus propios módulos si se importan directamente.

