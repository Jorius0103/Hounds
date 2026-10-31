import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {viteSingleFile} from 'vite-plugin-singlefile';

// Build da Mesa de Combate: src/mesa.html → dist/mesa.html, um arquivo só com o CSS e o JS embutidos
// (o hub busca o mesa.html e o coloca no srcdoc do iframe, então não pode haver arquivos à parte).
// Não usa o index.html da raiz, que é o hub.
export default defineConfig({
  root: path.resolve(import.meta.dirname, 'src'),
  base: './',
  publicDir: false,
  plugins: [react(), tailwindcss(), viteSingleFile()],
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist'),
    emptyOutDir: false,
    rollupOptions: {
      input: path.resolve(import.meta.dirname, 'src/mesa.html'),
    },
  },
});
