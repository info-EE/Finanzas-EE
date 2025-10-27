// Reexportador inicial para facilitar la migración incremental.
// - Exporta `elements` desde el nuevo `elements.js`.
// - Reexporta todo lo que sigue existiendo en `../ui.js` para compatibilidad.

export { elements } from './elements.js';
export * from '../ui.js';
