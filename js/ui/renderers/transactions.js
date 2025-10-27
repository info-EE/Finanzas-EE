/**
 * Renderers for Cash Flow / Transactions
 * Each function should accept the `state` object (from store/getState) and update the DOM via `elements`.
 */
import { elements } from '../elements.js';
import { escapeHTML, formatCurrency } from '../../utils.js';

/** Render the transactions table */
export function renderTransactions(state) {
    // TODO: move implementation from ui.js
    // Example signature: const { transactions } = state;
}

/** Helper that returns a row HTML for a transaction (pure function) */
export function createTransactionRow(t, accounts = []) {
    // TODO: move implementation from ui.js
    return `<!-- transaction row for ${escapeHTML(t.id || 'unknown')} -->`;
}
