import type {ComponentType} from 'react';

export type HubPageProps = {route: HubRoute};

// As páginas do hub já migradas para React, pela chave `page` da rota (js/rotas.js: 'notes', 'note', 'users'…).
// Uma página que não está aqui continua sendo desenhada pelo renderPage de js/app.js, no #pageRoot.
export const PAGES: Partial<Record<string, ComponentType<HubPageProps>>> = {};
