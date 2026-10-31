import type {ComponentType} from 'react';

// Os dados vêm de useHub() (src/hub/data.ts); a rota, daqui.
export type HubPageProps = {route: Route};

// As páginas do hub já migradas para React, pela chave `page` da rota (js/rotas.js: 'notes', 'note', 'users'…).
// Uma página que não está aqui continua sendo desenhada pelo renderPage de js/app.js, no #pageRoot.
export const PAGES: Partial<Record<string, ComponentType<HubPageProps>>> = {};
