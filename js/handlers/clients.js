import * as actions from '../actions.js';
import {
    elements,
    showAlertModal,
    showConfirmationModal,
    renderAll
} from '../ui/index.js';
import { getState } from '../store.js';
import { escapeHTML } from '../utils.js';
import { withSpinner } from './helpers.js';

// --- Funciones Manejadoras (Handlers) ---

function handleClientFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const id = form.querySelector('#client-id').value;
    const name = form.querySelector('#client-name').value.trim();
    const email = form.querySelector('#client-email').value.trim();

    if (!name) {
        showAlertModal('Campo Requerido', 'El nombre del cliente no puede estar vacío.');
        return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showAlertModal('Formato Inválido', 'Por favor, introduce una dirección de email válida.');
        return;
    }

    const clientData = {
        name: name,
        taxIdType: form.querySelector('#client-tax-id-type').value,
        taxId: form.querySelector('#client-tax-id').value,
        address: form.querySelector('#client-address').value,
        phoneLandlinePrefix: form.querySelector('#client-phone-landline-prefix').value,
        phoneLandline: form.querySelector('#client-phone-landline').value,
        phoneMobilePrefix: form.querySelector('#client-phone-mobile-prefix').value,
        phoneMobile: form.querySelector('#client-phone-mobile').value,
        email: email,
        industry: form.querySelector('#client-industry').value,
    };

    withSpinner(() => {
        actions.saveClient(clientData, id);
        form.reset();
        form.querySelector('#client-id').value = '';
        document.getElementById('client-form-title').textContent = 'Agregar Nuevo Cliente';
        document.getElementById('client-form-submit-text').textContent = 'Guardar Cliente';
        document.getElementById('client-form-cancel-btn').classList.add('hidden');
    })();
}

function handleClientsTableClick(e) {
    const editBtn = e.target.closest('.edit-client-btn');
    const deleteBtn = e.target.closest('.delete-client-btn');

    if (editBtn) {
        const id = editBtn.dataset.id;
        const { clients } = getState();
        const client = clients.find(c => c.id === id);
        if (client) {
            const form = elements.addClientForm;
            form.querySelector('#client-id').value = client.id;
            form.querySelector('#client-name').value = client.name;
            form.querySelector('#client-tax-id-type').value = client.taxIdType;
            form.querySelector('#client-tax-id').value = client.taxId;
            form.querySelector('#client-address').value = client.address;
            form.querySelector('#client-phone-landline-prefix').value = client.phoneLandlinePrefix;
            form.querySelector('#client-phone-landline').value = client.phoneLandline;
            form.querySelector('#client-phone-mobile-prefix').value = client.phoneMobilePrefix;
            form.querySelector('#client-phone-mobile').value = client.phoneMobile;
            form.querySelector('#client-email').value = client.email;
            form.querySelector('#client-industry').value = client.industry;

            document.getElementById('client-form-title').textContent = 'Editar Cliente';
            document.getElementById('client-form-submit-text').textContent = 'Actualizar Cliente';
            document.getElementById('client-form-cancel-btn').classList.remove('hidden');
            form.scrollIntoView({ behavior: 'smooth' });
        }
    }

    if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        showConfirmationModal('Eliminar Cliente', '¿Estás seguro de que quieres eliminar este cliente?', withSpinner(() => {
            actions.deleteClient(id);
        }));
    }
}

// --- Función "Binder" ---

/**
 * Asigna los eventos de la sección Clientes.
 */
export function bindClientEvents() {
    console.log("Binding Client Events...");

    // Gráfico de Clientes
    const clientsChartCurrencySelector = document.getElementById('clients-chart-currency');
    if (clientsChartCurrencySelector) {
        clientsChartCurrencySelector.addEventListener('change', renderAll);
    }

    // Formulario de Clientes
    if (elements.addClientForm) {
        elements.addClientForm.addEventListener('submit', handleClientFormSubmit);
        const cancelBtn = elements.addClientForm.querySelector('#client-form-cancel-btn');
        if (cancelBtn) cancelBtn.addEventListener('click', () => {
            elements.addClientForm.reset();
             // Ensure hidden ID is cleared
            const clientIdInput = elements.addClientForm.querySelector('#client-id');
            if (clientIdInput) clientIdInput.value = '';
            document.getElementById('client-form-title').textContent = 'Agregar Nuevo Cliente';
            document.getElementById('client-form-submit-text').textContent = 'Guardar Cliente';
            cancelBtn.classList.add('hidden');
        });
    }

    // Tabla de Clientes
    if (elements.clientsTableBody) {
        // Limpiar listeners antiguos clonando
        const newTbody = elements.clientsTableBody.cloneNode(false);
        elements.clientsTableBody.parentNode.replaceChild(newTbody, elements.clientsTableBody);
        elements.clientsTableBody = newTbody;
        elements.clientsTableBody.addEventListener('click', handleClientsTableClick);
    }
}
