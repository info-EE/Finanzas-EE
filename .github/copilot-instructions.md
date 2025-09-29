# Directrices para Agentes de IA en Finanzas-EE

Este documento proporciona directrices para interactuar con la base de código del proyecto Finanzas-EE.

## Arquitectura General

Este es un panel de finanzas construido como una Aplicación de una Sola Página (SPA) utilizando **HTML, CSS y JavaScript vainilla**. No utiliza ningún framework de frontend principal.

-   **`index.html`**: Contiene la estructura completa de la aplicación. Las diferentes "páginas" son elementos `div` que se muestran u ocultan dinámicamente.
-   **`script.js`**: Contiene **toda la lógica de la aplicación**. La lógica está encapsulada dentro de un único objeto global `App`. Este objeto gestiona el estado, los elementos del DOM, los gráficos y todos los eventos.
-   **`style.css`**: Proporciona estilos personalizados que complementan a TailwindCSS.
-   **Almacenamiento de Datos**: La aplicación es **puramente del lado del cliente**. Todos los datos (cuentas, transacciones, etc.) se persisten en el `localStorage` del navegador bajo la clave `financeDashboardData`. No hay backend ni base de datos.

## Flujos de Trabajo del Desarrollador

-   **Ejecución de la Aplicación**: No hay un proceso de compilación. Para ejecutar la aplicación, simplemente abre el archivo `index.html` en un navegador web.
-   **Gestión del Estado**: El estado completo de la aplicación se encuentra en `App.state` en `script.js`. Para entender el modelo de datos, inspecciona el método `App.getDefaultState()`.
-   **Persistencia de Datos**: Los datos se guardan en `localStorage` a través de `App.saveData()` y se cargan con `App.loadData()`. Para reiniciar la aplicación a su estado por defecto, elimina la clave `financeDashboardData` del `localStorage` de tu navegador.

## Convenciones y Patrones de Código

-   **Objeto `App`**: Al realizar cambios, es probable que necesites interactuar con el objeto `App`. Contiene sub-objetos para el estado (`state`), elementos del DOM (`elements`), gráficos (`charts`) y métodos para la lógica de negocio.
-   **Renderizado de la Interfaz de Usuario**: La interfaz de usuario no es declarativa. Se renderiza manualmente mediante la manipulación del DOM. Busca funciones con el prefijo `render...` (p. ej., `renderTransactions`, `renderAccountsTab`) que generan cadenas de HTML y las insertan en el DOM. Al añadir nuevos datos, asegúrate de llamar a la función de renderizado apropiada y a `App.saveData()` para persistir los cambios.
-   **Navegación**: La navegación se gestiona con `App.switchPage(pageId)`, que simplemente alterna la visibilidad de los `div` de las páginas.
-   **Módulos**: La aplicación tiene un concepto de "módulos" (p. ej., Facturación, Inversiones) que se pueden activar o desactivar desde la página de Ajustes. La lógica para esto se encuentra en `updateModuleVisibility()` y `renderSettings()`.

## Dependencias

El proyecto depende de las siguientes librerías de terceros, cargadas a través de CDN en `index.html`:

-   **TailwindCSS**: Para los estilos de la utilidad.
-   **Chart.js**: Para la visualización de datos.
-   **Lucide**: Para los iconos.
-   **jsPDF & jsPDF-AutoTable**: Para la exportación de reportes a PDF.
-   **XLSX**: Para la exportación de reportes a Excel.
