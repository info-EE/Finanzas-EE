/**
 * Viewers for invoices/receipts and printing/PDF download
 */
import { elements } from './elements.js';
import { formatCurrency, escapeHTML } from '../utils.js';
import { getState } from '../store.js';

export function showInvoiceViewer(invoiceId, state) {
    const { documents } = state || getState && getState();
    const invoice = documents ? documents.find(doc => doc.id === invoiceId) : null;
    if (!invoice || !elements.invoiceContentArea) return;

    const itemsHtml = invoice.items.map(item => `
        <tr class="border-b border-gray-200">
            <td class="py-3 px-4">${escapeHTML(item.description)}</td>
            <td class="py-3 px-4 text-right">${item.quantity.toFixed(3)}</td>
            <td class="py-3 px-4 text-right">${formatCurrency(item.price, invoice.currency)}</td>
            <td class="py-3 px-4 text-right font-medium">${formatCurrency(item.quantity * item.price, invoice.currency)}</td>
        </tr>`).join('');

    elements.invoiceContentArea.innerHTML = `
    <div id="invoice-printable-area" style="padding: 40px;" class="bg-white text-gray-800 font-sans">
    <header class="flex justify-between items-start mb-12 pb-8 border-b">
        <div class="w-1/2">
            <div class="flex items-center gap-3 mb-4">
                <svg class="h-10 w-10 text-blue-600" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>
                </svg>
                <span class="text-2xl font-bold text-gray-800">Europa Envíos</span>
            </div>
            <p class="font-semibold">LAMAQUINALOGISTICA, SOCIEDAD LIMITADA</p>
            <p class="text-gray-600 text-sm">
                CALLE ESTEBAN SALAZAR CHAPELA, NUM 20, PUERTA 87, NAVE 87<br>
                29004 MÁLAGA (ESPAÑA)<br>
                NIF: B56340656
            </p>
        </div>
        <div class="w-1/2 text-right">
            <h1 class="text-5xl font-bold text-gray-800 uppercase tracking-widest">Factura</h1>
            <div class="mt-4">
                <span class="text-gray-500">Nº de factura:</span>
                <strong class="text-gray-700">${escapeHTML(invoice.number)}</strong>
            </div>
            <div>
                <span class="text-gray-500">Fecha:</span>
                <strong class="text-gray-700">${invoice.date}</strong>
            </div>
        </div>
    </header>

    <div class="mb-12">
        <h3 class="font-semibold text-gray-500 text-sm mb-2 uppercase tracking-wide">Facturar a:</h3>
        <p class="font-bold text-lg text-gray-800">${escapeHTML(invoice.client)}</p>
        <p class="text-gray-600 whitespace-pre-line">${escapeHTML(invoice.address || '')}</p>
        <p class="text-gray-600">NIF/RUC: ${escapeHTML(invoice.nif) || ''}</p>
        ${invoice.phone ? `<p class="text-gray-600">Tel: ${escapeHTML(invoice.phone)}</p>` : ''}
    </div>

    <table class="w-full text-left mb-12">
        <thead>
            <tr class="bg-gray-700 text-white">
                <th class="py-3 px-4 font-semibold uppercase text-sm rounded-l-lg">Descripción</th>
                <th class="py-3 px-4 font-semibold uppercase text-sm text-right">Cantidad</th>
                <th class="py-3 px-4 font-semibold uppercase text-sm text-right">Precio Unit.</th>
                <th class="py-3 px-4 font-semibold uppercase text-sm text-right rounded-r-lg">Total</th>
            </tr>
        </thead>
        <tbody>
            ${itemsHtml}
        </tbody>
    </table>

    <div class="flex justify-between items-start">
         <div class="w-1/2 text-sm text-gray-600">
            ${invoice.operationType.toLowerCase().includes('exportación') ? `
            <h4 class="font-semibold text-gray-800 mb-2">Notas</h4>
            <p class="mb-4">Operación no sujeta a IVA por regla de localización: Ley 37/1992.</p>` : ''}
        </div>
        <div class="w-1/2 max-w-sm ml-auto space-y-3">
            <div class="flex justify-between">
                <span class="text-gray-600">Subtotal:</span>
                <span class="font-semibold text-gray-800">${formatCurrency(invoice.subtotal, invoice.currency)}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-gray-600">IVA (${(invoice.ivaRate * 100).toFixed(0)}%):</span>
                <span class="font-semibold text-gray-800">${formatCurrency(invoice.iva, invoice.currency)}</span>
            </div>
            <div class="flex justify-between font-bold text-2xl border-t-2 border-gray-700 pt-3 mt-3">
                <span class="text-gray-800">TOTAL:</span>
                <span class="text-blue-600">${formatCurrency(invoice.total, invoice.currency)}</span>
            </div>
        </div>
    </div>

    <footer class="text-center text-sm text-gray-500 mt-20 pt-4 border-t">
        <p>Gracias por su confianza.</p>
    </footer>
</div>`;
    elements.invoiceViewerModal.classList.remove('hidden');
    elements.invoiceViewerModal.classList.add('flex');
}

export function hideInvoiceViewer() {
    if (elements.invoiceViewerModal) elements.invoiceViewerModal.classList.add('hidden');
}

export function showReceiptViewer(invoice) {
    if (!invoice || !invoice.paymentDetails || !elements.invoiceContentArea) return;
    // For brevity keep the printable content generation in ui.js for now.
    elements.invoiceViewerModal.classList.remove('hidden');
    elements.invoiceViewerModal.classList.add('flex');
}

export function printInvoice() {
    const printContent = document.getElementById('invoice-printable-area')?.innerHTML;
    if (!printContent) return;
    const printWindow = window.open('', '', 'height=800,width=800');
    printWindow.document.write(`\n        <html>\n            <head>\n                <title>Factura</title>\n                <script src="https://cdn.tailwindcss.com"><\\/script>\n                <style>\n                    @media print { @page { size: A4 portrait; margin: 1.6cm; } body { -webkit-print-color-adjust: exact; } }\n                </style>\n            </head>\n            <body>\n                ${printContent}\n            </body>\n        </html>\n    `);
    printWindow.document.close();
    printWindow.onload = function() { printWindow.focus(); printWindow.print(); printWindow.close(); };
}

export function downloadInvoiceAsPDF() {
    const { jsPDF } = window.jspdf;
    const invoiceElement = document.getElementById('invoice-printable-area');
    if (!invoiceElement) return;
    const titleElement = elements.invoiceViewerModal.querySelector('h1');
    const isReceipt = titleElement && titleElement.textContent.toLowerCase() === 'recibo';
    const docNumberElement = invoiceElement.querySelector('strong');
    const docNumberText = docNumberElement ? docNumberElement.textContent : 'documento';
    const docType = isReceipt ? 'Recibo' : 'Factura';
    const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
    doc.html(invoiceElement, {
        callback: (doc) => { doc.save(`${docType}-${docNumberText.replace(/[^a-z0-9]/gi, '_')}.pdf`); },
        margin: [40,0,40,0], autoPaging: 'text', x:0, y:0, width:595, windowWidth:700
    });
}
