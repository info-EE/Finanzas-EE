Módulo de Acciones (Lógica de Negocio)

Esta carpeta contiene toda la lógica de negocio de la aplicación (a veces llamada "Modelo" o "Lógica de Dominio").

Cada archivo en este directorio es responsable de un área específica de la aplicación (ej. clients.js, cashflow.js, documents.js).

Responsabilidades

Manipulación de Datos: Contiene las funciones que saben cómo crear, modificar o eliminar datos (ej. saveTransaction, addClient).

Interacción con API: Llama a las funciones de js/api.js para persistir los cambios en Firestore.

Actualización del Estado: Llama a setState desde js/store.js para actualizar el estado local de la aplicación (aunque onSnapshot maneja la mayoría de las actualizaciones).

Cálculos Complejos: Realiza cálculos de negocio, como la generación de reportes (generateReport).

Flujo de Trabajo

Un usuario interactúa con la Vista (js/ui/).

Un Controlador (js/handlers/) captura el evento (ej. handleClientFormSubmit).

El Controlador llama a una Acción en esta carpeta (ej. actions.saveClient(clientData)).

La Acción valida los datos, llama a js/api.js (ej. addDocToCollection(...)) y actualiza el estado si es necesario.