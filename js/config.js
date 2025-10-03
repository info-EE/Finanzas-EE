/**
 * @file Contiene la configuración central y las constantes de la aplicación.
 * El objetivo es tener una única "fuente de la verdad" para valores que se usan en múltiples lugares.
 */

// Clave para el almacenamiento local en el navegador.
export const STORAGE_KEY = 'financeDashboardData';

// Categorías esenciales que no pueden ser eliminadas por el usuario.
export const ESSENTIAL_INCOME_CATEGORIES = ['Ventas', 'Servicios', 'Otros Ingresos', 'Transferencia', 'Ajuste de Saldo'];
export const ESSENTIAL_EXPENSE_CATEGORIES = ['Operaciones', 'Marketing', 'Salarios', 'Software', 'Impuestos', 'Otros Gastos', 'Inversión', 'Transferencia', 'Comisiones', 'Ajuste de Saldo'];
export const ESSENTIAL_OPERATION_TYPES = ['Nacional / Intracomunitaria (UE)', 'Exportación (Fuera de la UE)'];

// Paleta de colores para los gráficos de Chart.js
export const CHART_COLOR_PALETTE = [
    ['#FFC3A0', '#FF7A85'], 
    ['#D4A5A5', '#A5D4D4'], 
    ['#CDB4DB', '#FFC8DD'], 
    ['#A2D2FF', '#BDE0FE'], 
    ['#FBC2EB', '#A6C1EE'], 
    ['#FDDB6D', '#F1C40F']
];
