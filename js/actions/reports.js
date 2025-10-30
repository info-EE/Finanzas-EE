import { getState, setState } from '../store.js';

/**
 * Genera un reporte basado en los filtros proporcionados.
 * @param {object} filters - Los filtros para el reporte (tipo, período, fechas, etc.).
 */
export function generateReport(filters) {
    const { transactions, documents, settings, accounts } = getState(); 
    let data = [], title = '', columns = [];

    // Validar settings necesarios
    if (!settings || !settings.fiscalParameters) {
        console.error("generateReport: Faltan parámetros fiscales en la configuración.");
        setState({ activeReport: { type: filters.type, data: [], title: "Error: Faltan parámetros fiscales", columns: [] } });
        return;
    }
     // Validar accounts
    if (!accounts) {
        console.error("generateReport: Los datos de cuentas no están cargados.");
        setState({ activeReport: { type: filters.type, data: [], title: "Error: Cargando datos de cuentas", columns: [] } });
        return;
    }

    let startDate, endDate;
    // --- Lógica de cálculo de fechas (Revisada para robustez) ---
    try {
        if (filters.type !== 'sociedades') {
            switch (filters.period) {
                case 'daily':
                    if (!filters.date) throw new Error("Fecha diaria no especificada.");
                    startDate = new Date(filters.date + 'T00:00:00Z');
                    endDate = new Date(filters.date + 'T23:59:59.999Z'); // Usar .999 para incluir todo el día
                    title = `Reporte de Movimientos (${filters.date})`;
                    break;
                case 'weekly':
                     if (!filters.week) throw new Error("Semana no especificada.");
                    const [yearW, weekW] = filters.week.split('-W');
                    // Lógica ISO week (sin cambios, parece correcta)
                    const simple = new Date(Date.UTC(yearW, 0, 1 + (weekW - 1) * 7));
                    const dow = simple.getUTCDay();
                    const ISOweekStart = simple;
                    if (dow <= 4) ISOweekStart.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1);
                    else ISOweekStart.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay());
                    startDate = new Date(ISOweekStart);
                    startDate.setUTCHours(0, 0, 0, 0); // Asegurar inicio del día
                    endDate = new Date(startDate);
                    endDate.setUTCDate(startDate.getUTCDate() + 6);
                    endDate.setUTCHours(23, 59, 59, 999);
                    title = `Reporte de Movimientos (Semana ${weekW}, ${yearW})`;
                    break;
                case 'monthly':
                    if (!filters.month) throw new Error("Mes no especificado.");
                    const [yearM, monthM] = filters.month.split('-');
                    startDate = new Date(Date.UTC(yearM, monthM - 1, 1));
                    endDate = new Date(Date.UTC(yearM, monthM, 0, 23, 59, 59, 999)); // Día 0 del mes siguiente es el último del actual
                     title = `Reporte de Movimientos (${filters.month})`;
                    break;
                case 'annual':
                     if (!filters.year) throw new Error("Año no especificado.");
                    startDate = new Date(Date.UTC(filters.year, 0, 1));
                    endDate = new Date(Date.UTC(filters.year, 11, 31, 23, 59, 59, 999));
                     title = `Reporte de Movimientos (${filters.year})`;
                    break;
                default: 
                    throw new Error(`Periodo de reporte no válido: ${filters.period}`);
            }
             // Validar que las fechas sean válidas
             if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                throw new Error("Fechas de inicio o fin inválidas.");
            }

        } else { // Para 'sociedades'
            if (!filters.year || !filters.period) throw new Error("Año o período de sociedades no especificado.");
            const year = parseInt(filters.year, 10);
            switch (filters.period) {
                case '1P': startDate = new Date(Date.UTC(year, 0, 1)); endDate = new Date(Date.UTC(year, 2, 31, 23, 59, 59, 999)); break;
                case '2P': startDate = new Date(Date.UTC(year, 0, 1)); endDate = new Date(Date.UTC(year, 8, 30, 23, 59, 59, 999)); break; // Septiembre es mes 8
                case '3P': startDate = new Date(Date.UTC(year, 0, 1)); endDate = new Date(Date.UTC(year, 10, 30, 23, 59, 59, 999)); break; // Noviembre es mes 10
                default:
                    throw new Error(`Periodo de sociedades no válido: ${filters.period}`);
            }
             if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                throw new Error("Fechas de inicio o fin inválidas para sociedades.");
            }
             title = `Estimación Imp. Sociedades - ${filters.period} ${year}`;
        }
    } catch (error) {
        console.error("Error al calcular fechas del reporte:", error);
        setState({ activeReport: { type: filters.type, data: [], title: `Error: ${error.message}`, columns: [] } });
        return;
    }


    // --- Lógica específica por tipo de reporte (con validaciones y manejo de números) ---
    try {
        if (filters.type === 'movimientos') {
            columns = ["Fecha", "Descripción", "Cuenta", "Categoría", "Tipo", "Monto", "Moneda", "Parte"];
            data = transactions
                .filter(t => {
                    const tDate = new Date(t.date + 'T00:00:00Z'); 
                    // Añadir validación por si tDate es inválida
                    if (isNaN(tDate.getTime())) return false; 
                    const inDateRange = tDate >= startDate && tDate <= endDate;
                    // Usar accountId para filtrar si está disponible, si no, usar nombre
                    const accountMatch = filters.account === 'all' || 
                                         (t.accountId && accounts.find(a => a.id === t.accountId)?.name === filters.account) ||
                                         t.account === filters.account;
                    const partMatch = filters.part === 'all' || t.part === filters.part;
                    return inDateRange && accountMatch && partMatch;
                })
                .sort((a, b) => new Date(b.date + 'T00:00:00Z') - new Date(a.date + 'T00:00:00Z'))
                .map(item => {
                     // Buscar nombre de cuenta actualizado usando accountId
                     const accountName = accounts.find(a => a.id === item.accountId)?.name || item.account || 'Desconocida'; 
                     return [
                         item.date, 
                         item.description, 
                         accountName, // Usar nombre encontrado
                         item.category, 
                         item.type, 
                         Number(item.amount) || 0, // Asegurar número
                         item.currency, 
                         item.part
                     ];
                });

        } else if (filters.type === 'documentos') {
             if (filters.period) title = `Reporte de Documentos (${filters.period})`; // Actualizar título si es necesario
             else title = `Reporte de Documentos`; // Título genérico si no hay periodo
            columns = ["Fecha", "Número", "Cliente", "Monto", "Moneda", "Estado", "Tipo"];
            data = documents
                .filter(d => {
                    const dDate = new Date(d.date + 'T00:00:00Z');
                    if (isNaN(dDate.getTime())) return false; 
                    return dDate >= startDate && dDate <= endDate;
                })
                .sort((a, b) => new Date(b.date + 'T00:00:00Z') - new Date(a.date + 'T00:00:00Z'))
                .map(item => [item.date, item.number, item.client, Number(item.amount) || 0, item.currency, item.status, item.type]);
        
        } else if (filters.type === 'inversiones') {
             if (filters.period) title = `Reporte de Inversiones (${filters.period})`;
             else title = `Reporte de Inversiones`;
            columns = ["Fecha", "Descripción", "Cuenta Origen", "Monto", "Moneda"];
            data = transactions
                .filter(t => {
                    const tDate = new Date(t.date + 'T00:00:00Z');
                    if (isNaN(tDate.getTime())) return false; 
                    return tDate >= startDate && tDate <= endDate && t.category === 'Inversión';
                })
                .sort((a, b) => new Date(b.date + 'T00:00:00Z') - new Date(a.date + 'T00:00:00Z'))
                .map(item => {
                    const accountName = accounts.find(a => a.id === item.accountId)?.name || item.account || 'Desconocida'; 
                    return [item.date, item.description, accountName, Number(item.amount) || 0, item.currency];
                });

        } else if (filters.type === 'sociedades') {
            const fiscalAccountNames = ['CAIXA Bank', 'Banco WISE']; 
            // Obtener IDs de las cuentas fiscales
            const fiscalAccountIds = accounts
                .filter(a => fiscalAccountNames.includes(a.name))
                .map(a => a.id);

            const taxRate = settings.fiscalParameters.corporateTaxRate;
            
            const filteredTransactions = transactions.filter(t => {
                const tDate = new Date(t.date + 'T00:00:00Z');
                if (isNaN(tDate.getTime())) return false; 
                return tDate >= startDate && tDate <= endDate && 
                       t.part === 'A' && 
                       t.accountId && fiscalAccountIds.includes(t.accountId) && // Filtrar por ID de cuenta
                       t.currency === 'EUR'; 
            });

            let totalIngresos = 0, totalEgresos = 0;
            filteredTransactions.forEach(t => {
                const amount = Number(t.amount) || 0;
                const iva = Number(t.iva) || 0;
                // Excluir categorías específicas
                if (!['Transferencia', 'Inversión', 'Ajuste de Saldo'].includes(t.category)) {
                    if (t.type === 'Ingreso') totalIngresos += amount;
                    else totalEgresos += (amount + iva); 
                }
            });

            const resultadoContable = totalIngresos - totalEgresos;
            const pagoACuenta = resultadoContable > 0 ? resultadoContable * (taxRate / 100) : 0;
            
            columns = ["Concepto", "Importe (€)"]; 
            data = [
                ["Total Ingresos Computables (A)", totalIngresos.toFixed(2)],
                ["Total Gastos Deducibles (A)", totalEgresos.toFixed(2)],
                ["Resultado Contable Acumulado (A)", resultadoContable.toFixed(2)],
                [`Pago a cuenta estimado (${taxRate}%)`, pagoACuenta.toFixed(2)]
            ];
        } else {
            throw new Error(`Tipo de reporte no reconocido: ${filters.type}`);
        }
    } catch (error) {
        console.error("Error al generar datos del reporte:", error);
        setState({ activeReport: { type: filters.type, data: [], title: `Error: ${error.message}`, columns: [] } });
        return;
    }
    
    // Actualizar estado local para la UI
    setState({ activeReport: { type: filters.type, data, title, columns } });
}

/**
 * Genera el reporte mensual de IVA (Soportado vs. Repercutido).
 * @param {string} month - El mes a reportar (formato 'YYYY-MM').
 */
export function generateIvaReport(month) { 
    const { transactions, documents } = getState();
    
    // Validar formato del mes
    if (!/^\d{4}-\d{2}$/.test(month)) {
        console.error("generateIvaReport: Formato de mes inválido:", month);
        setState({ activeIvaReport: { month: month, resultado: 0, soportado: { total: 0, items: [] }, repercutido: { total: 0, items: [] } } }); // Resetear reporte
        return;
    }

    const [year, monthNum] = month.split('-').map(Number);

    try {
        const ivaSoportado = transactions.filter(t => {
            if (!t.date) return false; // Ignorar si no hay fecha
            const tDate = new Date(t.date + 'T00:00:00Z'); 
            if (isNaN(tDate.getTime())) return false; // Ignorar si fecha inválida
            return t.type === 'Egreso' && (Number(t.iva) || 0) > 0 &&
                   tDate.getUTCFullYear() === year &&
                   tDate.getUTCMonth() + 1 === monthNum;
        });

        const ivaRepercutido = documents.filter(doc => {
             if (!doc.date) return false;
            const dDate = new Date(doc.date + 'T00:00:00Z'); 
            if (isNaN(dDate.getTime())) return false; 
            return doc.type === 'Factura' && (Number(doc.iva) || 0) > 0 &&
                   dDate.getUTCFullYear() === year &&
                   dDate.getUTCMonth() + 1 === monthNum;
        });

        const totalSoportado = ivaSoportado.reduce((sum, t) => sum + (Number(t.iva) || 0), 0);
        const totalRepercutido = ivaRepercutido.reduce((sum, d) => sum + (Number(d.iva) || 0), 0);

        const ivaReport = {
            month: month,
            soportado: {
                total: totalSoportado,
                items: ivaSoportado.map(t => ({
                    date: t.date,
                    description: t.description || '', // Asegurar string
                    base: Number(t.amount) || 0,
                    iva: Number(t.iva) || 0,
                    currency: t.currency || 'EUR' // Moneda por defecto
                }))
            },
            repercutido: {
                total: totalRepercutido,
                items: ivaRepercutido.map(d => ({
                    date: d.date,
                    number: d.number || '',
                    client: d.client || '',
                    base: Number(d.subtotal) || 0,
                    iva: Number(d.iva) || 0,
                    currency: d.currency || 'EUR'
                }))
            },
            resultado: totalRepercutido - totalSoportado
        };
        setState({ activeIvaReport: ivaReport });

    } catch (error) {
        console.error("Error al generar reporte de IVA:", error);
         setState({ activeIvaReport: { month: month, resultado: 0, soportado: { total: 0, items: [] }, repercutido: { total: 0, items: [] } } }); // Resetear en caso de error
    }
}

/**
 * Archiva los datos de un año fiscal (acción desactivada).
 * @param {string} startDate - Fecha de inicio.
 * @param {string} endDate - Fecha de fin.
 */
export async function closeYear(startDate, endDate) { 
    console.warn("La función 'closeYear' (Cierre Anual) está desactivada. Requiere una reimplementación más robusta.");
    alert("La función de Cierre Anual está desactivada temporalmente.");
}
