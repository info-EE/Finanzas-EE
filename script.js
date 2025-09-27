document.addEventListener('DOMContentLoaded', () => {

    const App = {
        state: {
            accounts: [],
            transactions: [],
            documents: [],
            incomeCategories: ['Ventas', 'Servicios', 'Otros Ingresos'],
            expenseCategories: ['Operaciones', 'Marketing', 'Salarios', 'Software', 'Impuestos', 'Otros Gastos'],
            archivedData: {},
            settings: {}
        },
        
        elements: {
            sidebar: document.getElementById('sidebar'),
            mainContent: document.getElementById('main-content'),
            navLinks: document.querySelectorAll('.nav-link'),
            sidebarToggle: document.getElementById('sidebar-toggle')
        },

        init() {
            lucide.createIcons();
            this.loadInitialContent();
            this.bindEventListeners();
        },

        loadInitialContent() {
            this.switchPage('inicio');
        },

        bindEventListeners() {
            this.elements.sidebarToggle.addEventListener('click', () => this.toggleSidebar());
            this.elements.navLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const pageId = link.id.split('-')[1];
                    this.switchPage(pageId);
                });
            });
        },
        
        toggleSidebar() {
            this.elements.sidebar.classList.toggle('w-64');
            this.elements.sidebar.classList.toggle('w-20');
            this.elements.mainContent.classList.toggle('ml-64');
            this.elements.mainContent.classList.toggle('ml-20');
            document.querySelectorAll('.nav-text').forEach(el => el.classList.toggle('hidden'));
        },

        switchPage(pageId) {
            this.elements.navLinks.forEach(link => {
                link.classList.toggle('active', link.id === `nav-${pageId}`);
            });
            this.renderPageContent(pageId);
        },

        renderPageContent(pageId) {
            let content = '';
            switch (pageId) {
                case 'inicio':
                    content = `
                        <div id="page-inicio" class="page-content">
                            <h2 class="text-3xl font-bold mb-6 text-white uppercase tracking-wider">
                                EUROPA ENVIOS
                            </h2>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                <div class="card p-6 rounded-xl text-center">
                                    <p class="text-gray-400">Saldo Total Disponible en Euros</p>
                                    <p id="total-eur" class="text-5xl font-bold kpi-value mt-2">€12,345.67</p>
                                </div>
                                <div class="card p-6 rounded-xl text-center">
                                    <p class="text-gray-400">Saldo Total Disponible en Dólares</p>
                                    <p id="total-usd" class="text-5xl font-bold kpi-value mt-2">$8,765.43</p>
                                </div>
                            </div>
                            <div class="card p-6 rounded-xl">
                                <h3 class="font-semibold">Ingresos vs. Egresos (Últimos 6 meses)</h3>
                                <div class="h-80"><canvas id="flowChart"></canvas></div>
                            </div>
                        </div>`;
                    break;
                case 'cashflow':
                    content = `<div id="page-cashflow" class="page-content"><h2 class="text-3xl font-bold">Cash Flow</h2><p>Contenido de Cash Flow aquí...</p></div>`;
                    break;
                case 'cuentas':
                    content = `<div id="page-cuentas" class="page-content"><h2 class="text-3xl font-bold">Cuentas & Bancos</h2><p>Contenido de Cuentas & Bancos aquí...</p></div>`;
                    break;
                // Agrega más casos para las otras páginas
                default:
                    content = `<h2 class="text-3xl font-bold">Página no encontrada</h2>`;
            }
            this.elements.mainContent.innerHTML = content;
            
            if (pageId === 'inicio') {
                this.renderInicioChart();
            }
        },

        renderInicioChart() {
            const ctx = document.getElementById('flowChart')?.getContext('2d');
            if (!ctx) return;

            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio'],
                    datasets: [{
                        label: 'Ingresos',
                        data: [12000, 19000, 3000, 5000, 2000, 3000],
                        backgroundColor: 'rgba(59, 130, 246, 0.5)',
                        borderColor: 'rgba(59, 130, 246, 1)',
                        borderWidth: 1
                    }, {
                        label: 'Egresos',
                        data: [8000, 12000, 4000, 6000, 2500, 1500],
                        backgroundColor: 'rgba(239, 68, 68, 0.5)',
                        borderColor: 'rgba(239, 68, 68, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }
    };

    App.init();
});