// --- Coordinador de Acciones (Archivo Final) ---
// Este archivo ahora solo importa y re-exporta los módulos de lógica de negocio.
// Todas las importaciones de 'store' y 'api' han sido movidas
// a los módulos específicos que las necesitan.

// Re-exportar el módulo de clientes
export * from './actions/clients.js';

// Re-exportar el módulo de cashflow (Cuentas, Transacciones, Transferencias)
export * from './actions/cashflow.js'; 

// Re-exportar el módulo de documentos (Facturas, Proformas)
export * from './actions/documents.js';

// Re-exportar el módulo de settings (Categorías)
export * from './actions/settings.js';

// Re-exportar el módulo de inversiones
export * from './actions/investments.js';

// Re-exportar el módulo de reportes
export * from './actions/reports.js';

// Re-exportar el módulo de autenticación (Gestión de Usuarios)
export * from './actions/auth.js';

