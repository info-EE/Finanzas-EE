/**
 * Renderers for Cash Flow / Transactions
 * Each function should accept the `state` object (from store/getState) and update the DOM via `elements`.
 */
import { elements } from '../elements.js';
import { escapeHTML, formatCurrency } from '../../utils.js';
import { getState } from '../../store.js';

/** Helper that returns a row HTML for a transaction (pure function) */
export function createTransactionRow(t, state) {
    // Usar el estado_pasado o el estado_global
    const { permissions, accounts } = state.permissions ? state : getState();
    
    // Asegurarse de que accounts es un array antes de usar find
    if (!Array.isArray(accounts) || accounts.length === 0) {
        console.warn(`createTransactionRow: No se encontraron cuentas válidas para la transacción ${t.id}`);
        // Devolver una fila de error más informativa
        return `
        <tr class="border-b border-gray-800 text-red-400">
            <td class="py-3 px-3">${t.date || 'N/A'}</td>
            <td class="py-3 px-3">${escapeHTML(t.description || 'Sin descripción')}</td>
            <td class="py-3 px-3 italic">Cuenta ID ${t.accountId || 'desconocido'} no encontrada</td>
            <td class="py-3 px-3">${escapeHTML(t.category || 'N/A')}</td>
            <td class="py-3 px-3">${escapeHTML(t.part || 'N/A')}</td>
            <td class="py-3 px-3 text-right">-</td>
            <td class="py-3 px-3 text-right">-</td>
            <td class="py-3 px-3"></td>
        </tr>`;
    }

    // --- INICIO DE CORRECCIÓN (Retrocompatibilidad) ---
    // Buscar por ID y, si falla, por nombre de cuenta (datos antiguos)
    const account = accounts.find(acc => acc.id === t.accountId) || accounts.find(acc => acc.name === t.account);
    // Usar t.account (nombre antiguo) como fallback si la cuenta no se encuentra
    const accountName = account ? account.name : (t.account || `Cuenta Borrada (ID: ${t.accountId})`);
    const currency = account ? account.currency : (t.currency || 'EUR'); // Usar t.currency como fallback
    // --- FIN DE CORRECCIÓN ---


    const amountColor = t.type === 'Ingreso' ? 'text-green-400' : 'text-red-400';
    const sign = t.type === 'Ingreso' ? '+' : '-';

    // Verificar permisos antes de añadir botones
    const actionsHtml = permissions && permissions.manage_cashflow ? `
        <div class="flex items-center justify-center gap-2">
            <button class="edit-btn p-2 text-blue-400 hover:text-blue-300" data-id="${t.id}" title="Editar">
                <i data-lucide="edit" class="w-4 h-4"></i>
            </button>
            <button class="delete-btn p-2 text-red-400 hover:text-red-300" data-id="${t.id}" title="Eliminar">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
        </div>` : '';

    return `
        <tr class="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
            <td class="py-3 px-3">${t.date}</td>
            <td class="py-3 px-3">${escapeHTML(t.description)}</td>
            <td class="py-3 px-3">${escapeHTML(accountName)}</td>
            <td class="py-3 px-3">${escapeHTML(t.category)}</td>
            <td class="py-3 px-3">${escapeHTML(t.part)}</td>
            <td class="py-3 px-3 text-right text-gray-400">${t.iva > 0 ? formatCurrency(t.iva, currency) : '-'}</td>
            <td class="py-3 px-3 text-right font-medium ${amountColor}">${sign} ${formatCurrency(t.amount, currency)}</td>
            <td class="py-3 px-3">${actionsHtml}</td>
        </tr>`;
}

/** Render the transactions table */
export function renderTransactions() {
    const state = getState(); // Obtener estado
    const { transactions, accounts } = state;
    const tbody = elements.transactionsTableBody;
    
    // Asegurarse de que accounts es un array
    if (!tbody || !transactions || !Array.isArray(accounts) || accounts.length === 0) {
        console.warn("renderTransactions: Faltan datos (tbody, transactions o accounts válidos)");
        if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-gray-500">Cargando datos o no hay cuentas...</td></tr>`;
        return;
    }

    // *** CÓDIGO AÑADIDO: Obtener el filtro de mes ***
    // Usamos document.getElementById directamente para no tener que modificar elements.js
    const monthFilterInput = document.getElementById('cashflow-month-filter');
    // Si el filtro existe y tiene valor, úsalo. Si no, usa el mes actual como 'YYYY-MM'.
    const selectedMonth = monthFilterInput && monthFilterInput.value 
        ? monthFilterInput.value 
        : new Date().toISOString().slice(0, 7);
    // *** FIN DE CÓDIGO AÑADIDO ***


    // *** LÓGICA MODIFICADA: Filtrar por mes ANTES de filtrar por búsqueda ***
    let filteredTransactions = transactions.filter(t => {
        if (!t.date || t.category === 'Inversión' || t.isInitialBalance) {
            return false;
        }
        // Comparamos el inicio del string de fecha (ej: "2024-10-15")
        // con el valor del filtro de mes (ej: "2024-10")
        return t.date.startsWith(selectedMonth);
    });
    // *** FIN DE LÓGICA MODIFICADA ***

    const searchInput = document.getElementById('cashflow-search');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

    if (searchTerm) {
        // Aplicar la búsqueda SOBRE la lista ya filtrada por mes
        filteredTransactions = filteredTransactions.filter(t => {
            // --- INICIO DE CORRECCIÓN (Retrocompatibilidad en Búsqueda) ---
            const account = accounts.find(acc => acc.id === t.accountId) || accounts.find(acc => acc.name === t.account);
            const accountName = account ? account.name.toLowerCase() : (t.account ? t.account.toLowerCase() : '');
            // --- FIN DE CORRECCIÓN ---
            
            const categoryName = t.category ? t.category.toLowerCase() : '';
            // Asegurarse de que description existe antes de llamar a toLowerCase
            const descriptionLower = t.description ? t.description.toLowerCase() : '';
            return descriptionLower.includes(searchTerm) ||
                   accountName.includes(searchTerm) ||
                   categoryName.includes(searchTerm);
        });
    }

    if (filteredTransactions.length === 0) {
        // *** CÓDIGO MODIFICADO: Mensaje contextual ***
        const message = searchTerm 
            ? "No hay movimientos que coincidan con la búsqueda en este mes." 
            : "No hay movimientos registrados para este mes.";
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-gray-500">${message}</td></tr>`;
        // *** FIN DE CÓDIGO MODIFICADO ***
    } else {
        // Ordenar y mapear, pasando el estado completo a createTransactionRow
        const rowsHtmlArray = filteredTransactions
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map(t => createTransactionRow(t, state)) // Pasar 'state' aquí
            .filter(row => row !== ''); // Filtrar filas vacías o con error
        tbody.innerHTML = rowsHtmlArray.join('');
    }
}
