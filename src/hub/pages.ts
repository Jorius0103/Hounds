import type {ComponentType} from 'react';
import {EventPage} from './paginas/Evento';
import {EventsPage} from './paginas/Eventos';
import {LocaisPage} from './paginas/Locais';
import {LocalPage} from './paginas/Local';
import {MapPage} from './paginas/Mapa';
import {MapsPage} from './paginas/Mapas';
import {OrgPage} from './paginas/Organizacao';
import {OrgsPage} from './paginas/Organizacoes';
import {UsersPage} from './paginas/Usuarios';

// Os dados vêm de useHub() (src/hub/data.ts); a rota, daqui. O estado de interface de uma página (busca,
// confirmações, caixas abertas) fica no próprio componente: a casca o remonta a cada item (HubApp.tsx).
export type HubPageProps = {route: Route};

// As páginas do hub já migradas para React, pela chave `page` da rota (js/rotas.js: 'notes', 'note', 'users'…).
// Uma página que não está aqui continua sendo desenhada pelo renderPage de js/app.js, no #pageRoot.
export const PAGES: Partial<Record<string, ComponentType<HubPageProps>>> = {
  users: UsersPage,
  events: EventsPage,
  event: EventPage,
  orgs: OrgsPage,
  org: OrgPage,
  locais: LocaisPage,
  local: LocalPage,
  maps: MapsPage,
  map: MapPage,
};
