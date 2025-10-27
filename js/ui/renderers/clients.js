/**
 * Client list and client charts
 */
import { elements } from '../elements.js';
import { escapeHTML } from '../../utils.js';

function createClientRow(client, state) {
    const { permissions } = state;
    const actionsHtml = permissions && permissions.manage_clients ? `
        <div class="flex items-center justify-center gap-2">
            <button class="edit-client-btn p-2 text-blue-400 hover:text-blue-300" data-id="${client.id}" title="Editar">
                <i data-lucide="edit" class="w-4 h-4"></i>
            </button>
            <button class="delete-client-btn p-2 text-red-400 hover:text-red-300" data-id="${client.id}" title="Eliminar">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
        </div>` : '';

    return `
        <tr class="border-b border-gray-800 hover:bg-gray-800/50">
            <td class="py-3 px-3">${escapeHTML(client.name)}</td>
            <td class="py-3 px-3">${escapeHTML(client.taxIdType)} ${escapeHTML(client.taxId)}</td>
            <td class="py-3 px-3">${escapeHTML(client.email)}</td>
            <td class="py-3 px-3">${escapeHTML(client.phoneMobilePrefix)}${escapeHTML(client.phoneMobile)}</td>
            <td class="py-3 px-3">${actionsHtml}</td>
        </tr>`;
}

export function renderClients(state) {
    const { clients, permissions } = state;
    const tbody = elements.clientsTableBody;
    if (!tbody || !permissions) return;

    if (elements.addClientForm && elements.addClientForm.parentElement) {
        elements.addClientForm.parentElement.parentElement.classList.toggle('hidden', !permissions.manage_clients);
    }

    tbody.innerHTML = '';
    if (!clients || clients.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-gray-500">No hay clientes registrados.</td></tr>`;
        return;
    }

    tbody.innerHTML = clients.map(c => createClientRow(c, state)).join('');
}

export function renderClientsChart(state) {
    const { documents } = state;
    const ctx = document.getElementById('clientsChart')?.getContext('2d');
    if (!ctx || !documents) return;

    // destruir gráfico previo si existe
    if (window.charts && window.charts.clientsChart) {
        try { window.charts.clientsChart.destroy(); } catch (e) { /* ignore */ }
        window.charts.clientsChart = null;
    }

    const currencySelect = document.getElementById('clients-chart-currency');
    if (!currencySelect) return;
    const selectedCurrency = currencySelect.value;

    const invoices = documents.filter(doc => doc.type === 'Factura' && doc.currency === selectedCurrency);
    const salesByClient = invoices.reduce((acc, invoice) => {
        const clientName = invoice.client;
        acc[clientName] = (acc[clientName] || 0) + invoice.amount;
        return acc;
    }, {});

    const sortedClients = Object.entries(salesByClient).sort(([, a], [, b]) => b - a).slice(0, 10);
    const labels = sortedClients.map(([name]) => name);
    const data = sortedClients.map(([, amount]) => amount);

    if (labels.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.save();
        ctx.textAlign = 'center';
        ctx.fillStyle = '#6b7280';
        ctx.font = "16px 'Inter', sans-serif";
        ctx.fillText(`No hay datos de facturación en ${selectedCurrency}.`, ctx.canvas.width / 2, ctx.canvas.height / 2);
        ctx.restore();
        return;
    }

    window.charts = window.charts || {};
    window.charts.clientsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total Facturado',
                data: data,
                backgroundColor: window.CHART_COLORS || [],
                borderColor: '#1e3a8a',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: { x: { beginAtZero: true, title: { display: true, text: `Monto en ${selectedCurrency}` } } },
            plugins: { legend: { display: false } }
        }
    });
}
