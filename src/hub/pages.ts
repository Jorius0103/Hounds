import type {ComponentType} from 'react';
import {DisadvantagePage} from './paginas/Desvantagem';
import {DisadvantagesPage} from './paginas/Desvantagens';
import {EventPage} from './paginas/Evento';
import {EventsPage} from './paginas/Eventos';
import {LocaisPage} from './paginas/Locais';
import {LocalPage} from './paginas/Local';
import {SpellPage} from './paginas/Magia';
import {SpellsPage} from './paginas/Magias';
import {MapPage} from './paginas/Mapa';
import {MapsPage} from './paginas/Mapas';
import {OrgPage} from './paginas/Organizacao';
import {OrgsPage} from './paginas/Organizacoes';
import {CharPage} from './paginas/Personagem';
import {CharsPage} from './paginas/Personagens';
import {SkillPage} from './paginas/Pericia';
import {SkillsPage} from './paginas/Pericias';
import {UsersPage} from './paginas/Usuarios';
import {AdvantagePage} from './paginas/Vantagem';
import {AdvantagesPage} from './paginas/Vantagens';
import {TabuleiroPage} from './paginas/Tabuleiro';

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
  chars: CharsPage,
  char: CharPage,
  spells: SpellsPage,
  spell: SpellPage,
  advs: AdvantagesPage,
  adv: AdvantagePage,
  perks: AdvantagesPage,
  perk: AdvantagePage,
  disadvs: DisadvantagesPage,
  disadv: DisadvantagePage,
  skills: SkillsPage,
  skill: SkillPage,
  tabuleiro: TabuleiroPage,
};

// As listas longas de cartões usam a largura da tela (a classe wide do .page-inner), como as antigas que o renderPage de
// js/app.js marca.
export const WIDE_PAGES = new Set(['spells', 'advs', 'perks', 'disadvs', 'skills']);
