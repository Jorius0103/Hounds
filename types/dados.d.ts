// Tipos dos dados do Hounds, usados só pela checagem do editor (jsconfig.json).
// Não são carregados pelo navegador. Ao criar um campo novo num documento, declare-o aqui.

/** Imagem guardada no armazenamento; `ref` é o nome do arquivo. */
interface ImageInfo { ref: string; w?: number; h?: number; type?: string; size?: number }

/** Campos comuns a todo documento salvo. */
interface Doc {
  id: string;
  v?: number;
  createdAt?: number;
  updatedAt?: number;
  /** Id do usuário que criou. */
  createdBy?: string | null;
  /** false: só o Mestre, quem criou e `sharedWith` veem. */
  visible?: boolean;
  /** Ids de usuários que veem o item oculto. */
  sharedWith?: string[];
  /** Magia ou vantagem que vem dos livros (dados/*.json), não do banco. Não é gravado. */
  catalog?: boolean;
  /** Entrada dos livros que o Mestre excluiu (documento com o id dela no banco). */
  deleted?: boolean;
}

/** Coleção `maps`. */
interface HMap extends Doc { name: string; parentId?: string | null; image?: ImageInfo | null }

/** Coleção `maps/{id}/markers`. x e y vão de 0 a 1 sobre a imagem. */
interface Marker extends Doc {
  x: number; y: number; title: string; description?: string; category?: string; locationId?: string | null;
  /** Outro mapa ao qual o marcador leva (a cidade num marcador do reino). */
  linkedMapId?: string | null;
}

/** Coleção `locations`. */
interface HLocation extends Doc {
  name: string;
  description?: string;
  image?: ImageInfo | null;
  image2?: ImageInfo | null;
  characterIds?: string[];
  mapId?: string | null;
  /** Local onde este fica (uma taverna dentro de uma cidade). */
  parentId?: string | null;
  /** Reservado para coordenadas dentro do mapa. */
  position?: unknown;
}

interface Relation { charId: string; type: string }

/** Coleção `characters`. */
interface Character extends Doc {
  name: string;
  description?: string;
  race?: string;
  /** Texto livre antigo, migrado para `organizations`. */
  organization?: string;
  mapIds?: string[];
  relations?: Relation[];
  /** A ficha do personagem (coleção `sheets`): no máximo uma. */
  sheetId?: string | null;
  image?: ImageInfo | null;
  source?: string;
  mesaId?: string | null;
}

interface Member { charId: string; rank: string }

/** Coleção `organizations`. */
interface Organization extends Doc {
  name: string;
  description?: string;
  reputation?: string;
  members?: Member[];
  /** Locais onde a organização fica ou atua. */
  locationIds?: string[];
  /** Mapas onde a organização atua. */
  mapIds?: string[];
  image?: ImageInfo | null;
}

/**
 * Atributos GURPS de uma ficha. `st`, `dx`, `iq` e `ht` são valores; `per`, `will`, `hp`, `fp`,
 * `speed` e `move` são ajustes sobre a base (HP = ST + `hp`; Percepção = `perBase` + `per`,
 * Vontade = `willBase` + `will`, com bases 10 se não mudadas). `enc` (Peso, nível de carga 0–4),
 * `metal` e `spellPenalty` não custam pontos.
 */
interface SheetAttrs {
  st: number; dx: number; iq: number; ht: number;
  per: number; will: number; perBase: number; willBase: number; hp: number; fp: number; speed: number; move: number;
  enc: number; metal: number; spellPenalty: number;
}

/** Coleção `sheets` (fichas) de GURPS. Ligada a personagens por `Character.sheetId`. */
interface Sheet extends Doc { name: string; description?: string; attrs?: SheetAttrs; combat?: SheetCombat; advs?: SheetAdv[] }
/** Linha da seção Vantagens da ficha (veja js/tabs/ficha-vantagens.js): custo por nível, níveis (0: sem níveis), modificador em %. */
interface SheetAdv {
  name: string; advId?: string; cost: number; levels: number; mod: number; notes: string;
  /** Só talentos: tamanho (S 5 pts/nível, M 10, L 15) e as perícias da ficha que recebem +1 por nível. */
  size?: 'S' | 'M' | 'L'; skills?: string[];
}

/** Item da seção Combate da ficha: perícia, técnica ou perk/vantagem (veja js/tabs/ficha-combate.js). */
interface CombatItem {
  kind: 'skill' | 'tech' | 'trait'; name: string; pts: number; bonus?: number;
  attr?: string; diff?: string; skillId?: string;
  /** Técnica: perícia-base, padrão e limite em relação a ela (null: sem limite). */
  base?: string; def?: number; max?: number | null; techId?: string;
}
/** Seção Combate da ficha: estilos (grupos), perícias fora de estilo, tabela de danos e defesas. */
interface SheetCombat {
  styles: { name: string; styleId?: string; items: CombatItem[] }[];
  general: CombatItem[];
  weapons: { name: string; mode: 'sw' | 'thr' | 'fixed'; mod: string; type: string }[];
  def: { parry: string; parryBonus: number; block: string; blockBonus: number; dodgeBonus: number; db: number };
}

/** Coleção `events`. `date` é texto livre, no calendário da campanha. */
interface HEvent extends Doc {
  name: string;
  date?: string;
  description?: string;
  /** Onde o evento aconteceu. */
  locationId?: string | null;
  /** Personagens que participaram, cada um uma vez. */
  characterIds?: string[];
  image?: ImageInfo | null;
}

/** Coleção `spells` (GURPS). */
interface Spell extends Doc {
  name: string;
  difficulty?: string;
  class?: string;
  college?: string;
  timeToCast?: string;
  duration?: string;
  initialCost?: string;
  maintenanceCost?: string;
  prerequisites?: string;
  description?: string;
  /** Como a magia é encantada em itens (GURPS Magic). */
  item?: string;
  page?: string;
  source?: string;
}

/** Coleção `advantages` (vantagens, talentos e perks de GURPS). Ids `adv_*` vêm de dados/vantagens.json. */
interface Advantage extends Doc {
  name: string;
  cost?: string;
  type?: string;
  book?: string;
  page?: string;
  description?: string;
}

/** Coleção `skills` (perícias de GURPS). Ids `skill_*` vêm de dados/pericias.json. */
interface Skill extends Doc {
  name: string;
  /** A linha de tipo do livro: "IQ/Average", "Melee; DX/Very Hard" ou uma remissão ("see Crewman, p. 185"). */
  type?: string;
  /** ST, DX, IQ, HT, Will ou Per; vazio nas remissões. */
  attribute?: string;
  /** E, A, H ou VH. */
  difficulty?: string;
  /** Exige especialização (marcada com † nos livros). */
  specialty?: boolean;
  /** Perícia cinemática (marcada com * nos livros). */
  cinematic?: boolean;
  defaults?: string;
  prerequisites?: string;
  description?: string;
  modifiers?: string;
  book?: string;
  page?: string;
}

/** Coleção `techniques` (técnicas de GURPS). Ids `tech_*` vêm de dados/tecnicas.json. */
interface Technique extends Doc {
  name: string;
  /** A (Average) ou H (Hard). */
  difficulty?: string;
  /** Técnica cinemática (marcada com * nos livros). */
  cinematic?: boolean;
  defaults?: string;
  prerequisites?: string;
  description?: string;
  modifiers?: string;
  book?: string;
  page?: string;
}

/** Coleção `styles` (estilos de luta de GURPS Martial Arts). Ids `style_*` vêm de dados/estilos.json.
 * As listas ficam como no livro, com os itens separados por "; ". */
interface FightingStyle extends Doc {
  name: string;
  /** Pontos de Style Familiarity e perks obrigatórios. */
  cost?: string;
  description?: string;
  skills?: string;
  techniques?: string;
  cinematicSkills?: string;
  cinematicTechniques?: string;
  perks?: string;
  optAdvantages?: string;
  optDisadvantages?: string;
  optSkills?: string;
  optTechniques?: string;
  optPerks?: string;
  book?: string;
  page?: string;
}

/** Coleção `notebooks` (títulos). */
interface Notebook extends Doc { name: string }

/** Coleção `notes`. `format: 'html'` para texto formatado; sem ele, texto simples. */
interface Note extends Doc { notebookId: string; title: string; body?: string; format?: string }

type Role = 'mestre' | 'jogador';

/** Coleção `users`. */
interface HubUser extends Doc { name: string; role: Role | string }

/** API de armazenamento comum aos bancos (js/store/). */
interface Store {
  kind: 'shared' | 'local' | 'firebase' | 'supabase';
  canUpload: boolean;
  canWrite(): boolean;
  init(): Promise<unknown>;
  watch(col: string, cb: (list: any[]) => void, err?: (e: any) => void): any;
  all(col: string): Promise<any[]>;
  query(col: string, field: string, value: unknown): Promise<any[]>;
  /** Grava o documento inteiro; com `id` null cria um id novo. Resolve com o id. */
  put(col: string, id: string | null, body: object): Promise<string>;
  patch(col: string, id: string, p: object): Promise<unknown>;
  remove(col: string, id: string): Promise<unknown>;
  upload(file: Blob): Promise<{ ref: string; type: string; size: number }>;
  imageUrl(ref: string): Promise<string>;
  dropImage(ref: string): Promise<unknown>;
  /** Só o IndexedDB local: grava e apaga vários documentos de uma coleção numa transação só. */
  putBatch?(col: string, items: { id: string; data: object }[], toRemove?: string[]): Promise<unknown>;
  /** Remove vários documentos de uma vez (Supabase). */
  removeMany?(col: string, ids: string[]): Promise<unknown>;
  /**
   * Supabase: banco relacional. Uma exclusão já segue as regras da entidade no banco (os submapas
   * de um mapa excluído sobem, o personagem sai das organizações...), numa transação só, e as
   * operações de mundo.js não repetem esses passos.
   */
  relational?: boolean;
  /**
   * Supabase: troca a imagem do mapa e exclui os marcadores dele numa transação. Sem `confirmed`
   * e com marcadores, rejeita com `{ code: 'markers_exist', count }`.
   */
  replaceMapImage?(mapId: string, image: ImageInfo, confirmed: boolean, updatedAt?: number): Promise<{ removidos: number; imagemAnterior: string | null }>;
  /** Supabase: atraso para salvar a Mesa (ms). */
  saveDelay?: number;
  /** Supabase: tamanho máximo do estado da Mesa salvo numa linha só. */
  inlineMax?: number;
  /** Supabase: canal de broadcast entre navegadores. */
  realtime?: { send(kind: string, data: unknown): Promise<unknown>; on(kind: string, fn: (data: any) => void): void };
}

/** Estado global `W` (js/mundo.js): listas visíveis ao usuário atual, dados brutos e índices. */
interface World {
  store: Store | null;
  maps: HMap[];
  locations: HLocation[];
  characters: Character[];
  organizations: Organization[];
  spells: Spell[];
  advantages: Advantage[];
  skills: Skill[];
  techniques: Technique[];
  styles: FightingStyle[];
  sheets: Sheet[];
  events: HEvent[];
  notebooks: Notebook[];
  notes: Note[];
  users: HubUser[];
  /** Tudo que veio do banco, inclusive o que o usuário atual não vê. */
  raw: { maps: HMap[]; locations: HLocation[]; characters: Character[]; organizations: Organization[]; spells: Spell[]; advantages: Advantage[]; skills: Skill[]; techniques: Technique[]; styles: FightingStyle[]; sheets: Sheet[]; events: HEvent[]; notebooks: Notebook[]; notes: Note[] };
  loaded: { maps: boolean; locations: boolean; characters: boolean; organizations: boolean; spells: boolean; advantages: boolean; skills: boolean; techniques: boolean; styles: boolean; sheets: boolean; events: boolean; users: boolean; notebooks: boolean; notes: boolean };
  mapIdx: Record<string, HMap>;
  locIdx: Record<string, HLocation>;
  charIdx: Record<string, Character>;
  orgIdx: Record<string, Organization>;
  spellIdx: Record<string, Spell>;
  advIdx: Record<string, Advantage>;
  skillIdx: Record<string, Skill>;
  techIdx: Record<string, Technique>;
  styleIdx: Record<string, FightingStyle>;
  sheetIdx: Record<string, Sheet>;
  eventIdx: Record<string, HEvent>;
  /** Pai efetivo de cada mapa. */
  parent: Record<string, string | null>;
  /** Filhos de cada mapa. */
  kids: Record<string, HMap[]>;
  /** Pai efetivo de cada local. */
  locParent: Record<string, string | null>;
  /** Filhos de cada local. */
  locKids: Record<string, HLocation[]>;
}

/** Rota atual, de parseRoute() (js/rotas.js). */
interface Route {
  page: string;
  node: string | null;
  mapId?: string;
  explore?: boolean;
  locId?: string;
  charId?: string;
  orgId?: string;
  spellId?: string;
  advId?: string;
  skillId?: string;
  techId?: string;
  styleId?: string;
  sheetId?: string;
  eventId?: string;
  nbId?: string;
  noteId?: string;
}

/** Estado global `S` da página (js/pagina.js). */
interface PageState {
  route: Route | null;
  markers: Marker[];
  rawMarkers?: Marker[];
  markersFor: string | null;
  unMarkers: (() => void) | null;
  /** Estado de interface da página aberta (busca, confirmações, edição...). */
  ui: Record<string, any>;
  /** Anotação recém-criada que deve abrir já em edição. */
  pendingEdit?: string | null;
}
