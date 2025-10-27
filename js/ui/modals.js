/**
 * Modal helpers: confirmation, alerts, spinner
 */
import { elements } from './elements.js';

export function showConfirmationModal(title, message, onConfirm) {
    const modal = document.getElementById('confirmation-modal');
    const titleEl = document.getElementById('modal-title');
    const messageEl = document.getElementById('modal-message');
    const confirmBtn = document.getElementById('modal-confirm-btn');
    const cancelBtn = document.getElementById('modal-cancel-btn');

    if (!modal || !titleEl || !messageEl || !confirmBtn || !cancelBtn) return;

    titleEl.textContent = title;
    messageEl.textContent = message;
    
    const confirmHandler = () => {
        onConfirm();
        modal.classList.add('hidden');
        newConfirmBtn.removeEventListener('click', confirmHandler); // remove listener
    };
    
    // Ensure previous listener is removed before adding a new one by cloning the button
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    newConfirmBtn.addEventListener('click', confirmHandler);

    cancelBtn.onclick = () => modal.classList.add('hidden');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

export function showAlertModal(title, message) {
    const modal = document.getElementById('alert-modal');
    const titleEl = document.getElementById('alert-modal-title');
    const messageEl = document.getElementById('alert-modal-message');
    const okBtn = document.getElementById('alert-modal-ok-btn');

    if (!modal || !titleEl || !messageEl || !okBtn) return;

    titleEl.textContent = title;
    messageEl.textContent = message;
    okBtn.onclick = () => modal.classList.add('hidden');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

export function showSpinner() {
    if (elements.loadingOverlay) elements.loadingOverlay.classList.remove('hidden');
}

export function hideSpinner() {
    if (elements.loadingOverlay) elements.loadingOverlay.classList.add('hidden');
}

export function showPaymentDetailsModal(invoiceId) {
    if (elements.paymentDetailsForm) {
        elements.paymentDetailsForm.reset();
        const idInput = document.getElementById('payment-details-invoice-id');
        if (idInput) idInput.value = invoiceId;
        const dateInput = document.getElementById('payment-date');
        if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
    }
    elements.paymentDetailsModal.classList.remove('hidden');
    elements.paymentDetailsModal.classList.add('flex');
}

export function hidePaymentDetailsModal() {
    elements.paymentDetailsModal.classList.add('hidden');
    elements.paymentDetailsModal.classList.remove('flex');
}
