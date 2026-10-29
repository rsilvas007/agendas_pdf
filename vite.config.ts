import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// base relativo: o mesmo build funciona no GitHub Pages (/agendas_pdf/),
// em domínio próprio ou em qualquer subpasta.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
  },
});
