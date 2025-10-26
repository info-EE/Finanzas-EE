import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  // Configuración del servidor de desarrollo
  server: {
    open: true, // Abrir automáticamente el navegador al ejecutar `npx vite`
    port: 3000, // Puedes cambiar el puerto si lo necesitas
  },
  // Configuración de la compilación (build) para producción
  build: {
    outDir: 'dist', // Carpeta donde se generará la versión final
    sourcemap: false, // Desactivar sourcemaps para producción (opcional)
    rollupOptions: {
      // Asegurarse de que index.html sea el punto de entrada
      input: {
        main: 'index.html',
      },
      output: {
        // Opcional: Para organizar los archivos generados en carpetas
        assetFileNames: (assetInfo) => {
          let extType = assetInfo.name.split('.').at(1);
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            extType = 'img';
          } else if (/css/i.test(extType)) {
             extType = 'css';
          }
          // Pone assets (css, img) en una carpeta 'assets'
          return `assets/${extType}/[name]-[hash][extname]`;
        },
        chunkFileNames: 'assets/js/[name]-[hash].js', // Pone chunks de JS en assets/js
        entryFileNames: 'assets/js/[name]-[hash].js', // Pone el entry point (main.js) en assets/js
      },
    },
  },
  // Opcional: Configuración de previsualización (para probar la build localmente)
  preview: {
    port: 8080, // Puerto para previsualizar la build
    open: true,
  },
});
