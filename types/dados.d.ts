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
}

/** Coleção `maps`. */
interface HMap extends Doc { name: string; parentId?: string | null; image?: ImageInfo | null }

/** Coleção `maps/{id}/markers`. x e y vão de 0 a 1 sobre a imagem. */
interface Marker extends Doc { x: number; y: number; title: string; description?: string; category?: string; locationId?: string | null }

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
  image?: ImageInfo | null;
  source?: string;
  mesaId?: string | null;
}

interface Member { charId: string; rank: string }

/** Coleção `organizations`. */
interface Organization extends Doc { name: string; description?: string; reputation?: string; members?: Member[]; locationIds?: string[]; image?: ImageInfo | null }

/** Coleção `notebooks` (títulos). */
interface Notebook extends Doc { name: string }

/** Coleção `notes`. `format: 'html'` para texto formatado; sem ele, texto simples. */
interface Note extends Doc { notebookId: string; title: string; body?: string; format?: string }

type Role = 'mestre' | 'jogador' | 'visualizador';

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
  notebooks: Notebook[];
  notes: Note[];
  users: HubUser[];
  /** Tudo que veio do banco, inclusive o que o usuário atual não vê. */
  raw: { maps: HMap[]; locations: HLocation[]; characters: Character[]; organizations: Organization[]; notebooks: Notebook[]; notes: Note[] };
  loaded: { maps: boolean; locations: boolean; characters: boolean; organizations: boolean; users: boolean; notebooks: boolean; notes: boolean };
  mapIdx: Record<string, HMap>;
  locIdx: Record<string, HLocation>;
  charIdx: Record<string, Character>;
  orgIdx: Record<string, Organization>;
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
