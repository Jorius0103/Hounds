import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';
import {viteSingleFile} from 'vite-plugin-singlefile';

const distFile = path.resolve(import.meta.dirname, 'dist/mesa.html');
const publishedFile = path.resolve(import.meta.dirname, 'mesa.html');

// Ao fim do build, o dist/mesa.html vira o mesa.html da raiz, que é o arquivo que o site publica.
// Copiar em vez de gerar direto na raiz evita apontar o outDir para o repositório inteiro.
const publishMesa = (): Plugin => ({
  name: 'hounds-publicar-mesa',
  apply: 'build',
  closeBundle() {
    fs.copyFileSync(distFile, publishedFile);
  },
});

// Build da Mesa de Combate: src/mesa.html → dist/mesa.html → mesa.html, um arquivo só com o CSS e o
// JS embutidos (o hub busca o mesa.html e o coloca no srcdoc do iframe, então não pode haver arquivos
// à parte). Não usa o index.html da raiz, que é o hub.
export default defineConfig({
  root: path.resolve(import.meta.dirname, 'src'),
  base: './',
  publicDir: false,
  plugins: [react(), tailwindcss(), viteSingleFile(), publishMesa()],
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist'),
    emptyOutDir: false,
    rollupOptions: {
      input: path.resolve(import.meta.dirname, 'src/mesa.html'),
    },
  },
});
