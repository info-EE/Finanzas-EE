import * as actions from '../actions.js';
import {
    elements,
    showAlertModal,
    exportReportAsXLSX,
    exportReportAsPDF
} from '../ui/index.js';
import { withSpinner } from './helpers.js';

// --- Funciones Manejadoras (Handlers) ---

function handleReportGeneration(e) {
    e.preventDefault();
    const form = e.target;
    const type = form.querySelector('#report-type').value;
    let filters = { type };

    if (type === 'sociedades') {
        filters.year = form.querySelector('#report-year-sociedades').value;
        filters.period = form.querySelector('#report-periodo-sociedades').value;
    } else {
        filters.period = form.querySelector('#report-period').value;
        filters.account = form.querySelector('#report-account').value;
        filters.part = form.querySelector('#report-part').value;
        switch (filters.period) {
            case 'daily': filters.date = form.querySelector('#report-date').value; break;
            case 'weekly': filters.week = form.querySelector('#report-week').value; break;
            case 'monthly': filters.month = form.querySelector('#report-month').value; break;
            case 'annual': filters.year = form.querySelector('#report-year').value; break;
        }
         // Validate date inputs for non-sociedades reports
         if (!filters.date && !filters.week && !filters.month && !filters.year) {
            showAlertModal('Filtro Requerido', 'Por favor, selecciona un período válido (fecha, semana, mes o año).');
            return;
        }
    }
    withSpinner(() => actions.generateReport(filters), 500)();
}


function handleIvaReportGeneration() {
    const month = elements.ivaMonthInput.value;
    if (month) {
        withSpinner(() => actions.generateIvaReport(month), 500)();
    } else {
        showAlertModal('Falta Información', 'Por favor, seleccione un mes para generar el reporte de IVA.');
    }
}

function handleReportFilterChange() {
    const reportType = document.getElementById('report-type').value;
    const period = document.getElementById('report-period').value;

    const isSociedades = reportType === 'sociedades';
    elements.defaultFiltersContainer.classList.toggle('hidden', isSociedades);
    elements.sociedadesFiltersContainer.classList.toggle('hidden', !isSociedades);

    // Only show relevant date input based on period for default filters
    if (!isSociedades) {
        ['daily', 'weekly', 'monthly', 'annual'].forEach(p => {
            const el = document.getElementById(`date-input-${p}`);
            if (el) el.classList.toggle('hidden', p !== period);
        });
        // Ensure default year is set for annual report
        if (period === 'annual') {
             const yearInput = document.getElementById('report-year');
             if (yearInput && !yearInput.value) {
                 yearInput.value = new Date().getFullYear();
             }
        }
    }
}

function handleReportDownloadClick(e) {
    const downloadBtn = e.target.closest('#report-download-btn');
    if (downloadBtn) {
        document.getElementById('report-download-options').classList.toggle('show');
        return;
    }

    const formatBtn = e.target.closest('.download-option');
    if (formatBtn) {
        const format = formatBtn.dataset.format;
        if (format === 'xlsx') {
            exportReportAsXLSX();
        } else if (format === 'pdf') {
            exportReportAsPDF();
        }
        document.getElementById('report-download-options').classList.remove('show');
    }
}

// --- Función "Binder" ---

export function bindReportEvents() {
    console.log("Binding Report Events...");

    // Reports Section
    if (elements.reportForm) {
        elements.reportForm.addEventListener('submit', handleReportGeneration);
        const reportTypeSelect = document.getElementById('report-type');
        if (reportTypeSelect) reportTypeSelect.addEventListener('change', handleReportFilterChange);
        const reportPeriodSelect = document.getElementById('report-period');
        if (reportPeriodSelect) reportPeriodSelect.addEventListener('change', handleReportFilterChange);
    }
    if (elements.reportDisplayArea) {
        // Limpiar listeners antiguos clonando
        const newDisplayArea = elements.reportDisplayArea.cloneNode(true); // Clonar con hijos
        elements.reportDisplayArea.parentNode.replaceChild(newDisplayArea, elements.reportDisplayArea);
        elements.reportDisplayArea = newDisplayArea;
        elements.reportDisplayArea.addEventListener('click', handleReportDownloadClick);
    }

    // Close dropdown if clicked outside
    document.addEventListener('click', function(event) {
        if (!event.target.closest('.dropdown')) {
            const dropdowns = document.getElementsByClassName("dropdown-content");
            for (let i = 0; i < dropdowns.length; i++) {
                const openDropdown = dropdowns[i];
                if (openDropdown.classList.contains('show')) {
                    openDropdown.classList.remove('show');
                }
            }
        }
    });

    // IVA Section
    if (elements.ivaGenerateReportBtn) elements.ivaGenerateReportBtn.addEventListener('click', handleIvaReportGeneration);
}
