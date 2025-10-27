# ui/ (UI module scaffolding)

Estructura propuesta para dividir `js/ui.js` en módulos pequeños y testeables.

Contenido generado (stubs):

- elements.js  — exporta `elements` (selectores DOM centralizados)
- index.js     — reexportador (compatibilidad durante migración)
- charts.js    — helpers para Chart.js
- modals.js    — confirm/alert/spinner modals
- viewers.js   — invoice/receipt viewers + print/pdf helpers
- controls.js  — populateSelects, populateCategories, updateCurrencySymbol, updateTransferFormUI
- renderers/   — carpeta con stubs: transactions, accounts, documents, dashboard, investments, clients, reports

Objetivo:
- Permitir migración incremental: mover cada bloque funcional (renderers, controls, viewers) desde `js/ui.js` a estos archivos paso a paso.
- Mantener `js/ui.js` funcional durante la migración exportando (temporalmente) lo que `main.js` y `handlers.js` necesitan.

Siguientes pasos recomendados:
1. Mover `elements` (ya hecho) — verificar.
2. Mover `charts` y `resizeCharts`.
3. Mover modals/viewers.
4. Mover controls (populateSelects, populateCategories).
5. Mover renderers por área (uno a la vez) y verificar en cada paso.

Notas:
- Mantener las firmas de las funciones públicas idénticas al comienzo para no romper `main.js`/`handlers.js`.
- Documentar en cada módulo las dependencias (p. ej. `utils.js`, globals como Chart, lucide, jsPDF, XLSX).