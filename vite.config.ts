import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';

const root = import.meta.dirname;

// O index.html carrega os scripts clássicos de js/, os CSS de css/ e as imagens pelos nomes de sempre, e a
// ordem deles importa (CONTRIBUTING.md). O vite-ignore faz o Vite deixá-los como estão em vez de empacotá-los;
// só o <script type="module"> da casca React (src/hub/) entra no bundle.
const legacyTags = (): Plugin => ({
  name: 'hounds-arquivos-do-hub',
  transformIndexHtml: {
    order: 'pre',
    handler: html => html.replace(/<(script|link|img)\b(?![^>]*\btype="module")(?=[^>]*\b(?:src|href)=")/g, '<$1 vite-ignore'),
  },
});

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.csv': 'text/csv; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.woff2': 'font/woff2',
};

// Em npm run dev, os arquivos do site (js/, css/, dados/, imagens/, mesa.html…) vão crus, como no GitHub Pages.
// Sem isso, o Vite trataria os scripts clássicos como módulos e reescreveria o mesa.html que o hub põe no iframe.
const staticFiles = (): Plugin => ({
  name: 'hounds-arquivos-crus',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const url = decodeURIComponent((req.url || '/').split('?')[0]);
      if (url === '/' || url === '/index.html' || /^\/(src|node_modules|@)/.test(url)) return next();
      const file = path.join(root, url);
      if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return next();
      res.setHeader('Content-Type', TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream');
      res.setHeader('Cache-Control', 'no-cache');
      fs.createReadStream(file).pipe(res);
    });
  },
});

// Build do hub: index.html → dist/hub/index.html, com a casca React em dist/hub/assets/. O workflow Publicar
// (.github/workflows/publicar.yml) põe os dois por cima da raiz do repositório. A Mesa tem o próprio build
// (vite.mesa.config.ts).
export default defineConfig({
  root,
  base: './',
  publicDir: false,
  plugins: [react(), legacyTags(), staticFiles()],
  optimizeDeps: {entries: ['index.html']},
  build: {
    outDir: path.resolve(root, 'dist/hub'),
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(root, 'index.html'),
    },
  },
});
