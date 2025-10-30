import * as actions from '../actions.js';
import {
    elements,
    showAlertModal,
    showConfirmationModal
} from '../ui/index.js';
import { getState } from '../store.js';
import { withSpinner } from './helpers.js';

// --- Funciones Manejadoras (Handlers) ---

function handleAddInvestmentAsset(e) {
    e.preventDefault();
    const form = e.target;
    const name = form.querySelector('#new-investment-asset-name').value.trim();

    if (!name) {
        showAlertModal('Campo Requerido', 'El nombre del activo no puede estar vacío.');
        return;
    }

    const assetData = {
        name: name,
        category: form.querySelector('#new-investment-asset-category').value,
    };
    withSpinner(() => {
        actions.addInvestmentAsset(assetData);
        form.reset();
    }, 150)();
}

function handleInvestmentAssetListClick(e) {
    const deleteBtn = e.target.closest('.delete-investment-asset-btn');
    if (deleteBtn) {
        const assetId = deleteBtn.dataset.id;
        showConfirmationModal('Eliminar Activo', '¿Estás seguro de que quieres eliminar este tipo de activo?', withSpinner(() => {
            actions.deleteInvestmentAsset(assetId);
        }, 150));
    }
}

function handleAddInvestment(e) {
    e.preventDefault();
    const form = e.target;
    const { investmentAssets } = getState();
    const assetId = form.querySelector('#investment-asset').value;
    const asset = investmentAssets.find(a => a.id === assetId);
    const amount = parseFloat(form.querySelector('#investment-amount').value);

    if (!asset) {
        showAlertModal('Error', 'Por favor, selecciona un activo de inversión válido. Puedes definirlos en Ajustes.');
        return;
    }
    if (isNaN(amount) || amount <= 0) {
        showAlertModal('Valor Inválido', 'El monto invertido debe ser un número positivo.');
        return;
    }

    const investmentData = {
        date: form.querySelector('#investment-date').value,
        account: form.querySelector('#investment-account').value,
        amount: amount,
        description: form.querySelector('#investment-description').value,
        assetId: asset.id,
        assetName: asset.name,
    };
    withSpinner(() => {
        actions.addInvestment(investmentData);
        form.reset();
        // Restore default date
        const dateInput = form.querySelector('#investment-date');
        if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
    })();
}


function handleInvestmentsTableClick(e) {
    const deleteBtn = e.target.closest('.delete-investment-btn');
    if (deleteBtn) {
        const transactionId = deleteBtn.dataset.id;
        showConfirmationModal('Eliminar Inversión', 'Esto eliminará el registro de la inversión y devolverá el monto a la cuenta de origen. ¿Continuar?', withSpinner(() => {
            actions.deleteTransaction(transactionId);
        }));
    }
}

// --- Función "Binder" ---

/**
 * Asigna los eventos de la sección Inversiones.
 */
export function bindInvestmentEvents() {
    console.log("Binding Investment Events...");

    // Formulario de Activos (en página de Ajustes)
    if (elements.addInvestmentAssetForm) {
        elements.addInvestmentAssetForm.addEventListener('submit', handleAddInvestmentAsset);
    }
    // Lista de Activos (en página de Ajustes)
    if (elements.investmentAssetsList) {
        // Limpiar listeners antiguos clonando
        const newList = elements.investmentAssetsList.cloneNode(false);
        elements.investmentAssetsList.parentNode.replaceChild(newList, elements.investmentAssetsList);
        elements.investmentAssetsList = newList;
        elements.investmentAssetsList.addEventListener('click', handleInvestmentAssetListClick);
    }
    
    // Formulario de Inversión (página Inversiones)
    if (elements.addInvestmentForm) {
        elements.addInvestmentForm.addEventListener('submit', handleAddInvestment);
    }

    // Tabla de Inversiones (página Inversiones)
    if (elements.investmentsTableBody) {
        // Limpiar listeners antiguos clonando
        const newTbody = elements.investmentsTableBody.cloneNode(false);
        elements.investmentsTableBody.parentNode.replaceChild(newTbody, elements.investmentsTableBody);
        elements.investmentsTableBody = newTbody;
        elements.investmentsTableBody.addEventListener('click', handleInvestmentsTableClick);
    }
}
