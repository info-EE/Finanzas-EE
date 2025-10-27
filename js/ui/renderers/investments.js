/**
 * Renderers for Investments
 */
import { elements } from '../elements.js';
import { escapeHTML, formatCurrency } from '../../utils.js';

export function renderInvestments(state) {
    // TODO
}

export function createInvestmentRow(t, allAssets = []) {
    // TODO
    return `<!-- investment row ${escapeHTML(t.id || '')} -->`;
}
