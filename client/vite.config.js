import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Esto le dice a Vite que cualquier solicitud que comience con /api...
      '/api': {
        target: 'http://localhost:5000', // ...debe ser redirigida a tu backend en el puerto 5000
        changeOrigin: true, // Necesario para hosts virtuales
        // secure: false, // Descomenta esto si tu backend NO usa HTTPS (generalmente no en desarrollo local)
        // rewrite: (path) => path.replace(/^\/api/, '') // NO USAR rewrite si tu backend ya espera /api en la ruta
      }
    }
  }
})
