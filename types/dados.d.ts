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
interface Sheet extends Doc {
  name: string; description?: string; attrs?: SheetAttrs; combat?: SheetCombat; advs?: SheetAdv[];
  equip?: SheetEquip[]; bodies?: SheetBody[]; packs?: SheetPack[]; armorSets?: ArmorSet[]; customWeapons?: CustomWeapon[]; customShields?: CustomShield[];
}
/** Escudo de Criar Escudo (veja js/tabs/ficha-escudos.js): o escudo do livro (ou digitado) como era ao criar, os ajustes e o resultado. */
interface CustomShield {
  id: string; baseId: string | null;
  base: { name: string; tl: string; db: string; dr: string; hp: string; cost: number; weight: number; skill: string; defaults: string };
  description: string;
  /** Ajustes: somam ou tiram do BD, da RD, do NH com o escudo, do custo ($) e do peso (%). */
  mods: { name: string; spellId?: string; db: number; dr: number; nh: number; cost: number; weightPct: number }[];
  db: string; dr: string; hp: string; cost: number; weight: number;
  /** A linha de Meus Itens que é o escudo (null: saiu da lista). */
  equipId: string | null;
}
/** Arma de Criar Arma (veja js/tabs/ficha-armas.js): a arma do livro como era ao criar, os ajustes e o resultado. */
interface CustomWeapon {
  id: string; baseId: string | null; base: { name: string; tl: string; type: string; cost: number; weight: number }; description: string;
  /** Ajustes: texto livre ou uma magia (spellId); somam ou tiram do dano de todos os ataques, do NH com a arma, do custo ($) e do peso (%). */
  mods: { name: string; spellId?: string; dmg: number; nh: number; cost: number; weightPct: number }[];
  /** Os ataques do livro, com o dano do livro (baseDamage) e o ajustado (damage). */
  attacks: (Omit<WeaponAttack, 'damage'> & { baseDamage: string; damage: string })[];
  cost: number; weight: number;
  /** A linha de Meus Itens que é a arma (null: saiu da lista). */
  equipId: string | null;
}
/** Conjunto de armadura modular (Criar Armadura; veja js/tabs/ficha-armaduras.js): o modelo base como era ao criar, os modificadores com os valores aplicados e as peças calculadas. */
interface ArmorSet {
  id: string; name: string; description: string; baseId: string | null;
  base: { name: string; dr: string; cost: number; weight: number; don: number | null; tl: string };
  version: number; originId: string | null;
  /** Ajustes: texto livre ou uma magia (spellId); somam ou tiram da RD de cada peça (pontos), do custo do conjunto ($) e do peso de cada peça (%). */
  mods: { name: string; spellId?: string; dr: number; cost: number; weightPct: number }[];
  /** equipId: a linha da lista que é a peça (null: saiu da lista). pct: o percentual final sobre o tronco, com a cobertura. */
  pieces: { id: string; loc: string; cover: 'full' | 'front'; pct: number; dr: string; cost: number; weight: number; don: number | null; equipId: string | null }[];
}
/** Localização de armadura (coleção `armorLocs`, tabela armadura_localizacoes). */
interface ArmorLoc extends Doc { name: string; pct: number; front: boolean; canFront: boolean; parent: string | null; conflicts: string[]; parts: string[]; oneSide: boolean; order: number }
/**
 * Linha da lista de equipamentos da ficha (veja js/tabs/ficha-equipamentos.js): tudo o que o personagem
 * tem. Peso (lbs) e custo ($) de uma unidade. A lista sozinha não entra na carga: só o que está na
 * configuração de corpo em uso e nas mochilas em uso.
 */
interface SheetEquip {
  /** Fixo na ficha; o Corpo e as Mochilas apontam para ele. Linhas antigas, sem id, são 'e1', 'e2'… pela posição. */
  id: string;
  kind: 'item' | 'armor' | 'weapon';
  /** A entrada de Mundo › Itens, Armaduras ou Armas de onde veio. */
  refId?: string;
  name: string; qty: number; weight: number; cost: number; notes: string;
  /** Só em fichas antigas: false ficava guardado, fora da carga (veja sheetGear). */
  carried?: boolean;
}
/** Parte do corpo do GURPS (Basic Set, p. B398) onde vai um equipamento (GEAR_PARTS). */
type GearPart = 'eyes' | 'skull' | 'face' | 'neck' | 'torso' | 'groin' | 'right_arm' | 'left_arm' | 'hands' | 'right_leg' | 'left_leg' | 'feet';
/** Configuração de corpo: o que está em cada parte. No máximo uma da ficha com `active`. */
interface SheetBody { id: string; name: string; active: boolean; slots: { part: GearPart; equipId: string; qty: number }[] }
/** Mochila: o que ela leva e, em `equipId`, a linha da lista que é a própria mochila (o peso próprio; null: sem). */
interface SheetPack { id: string; name: string; inUse: boolean; equipId: string | null; items: { equipId: string; qty: number }[] }
/** Linha da seção Vantagens da ficha (veja js/tabs/ficha-vantagens.js): custo por nível, níveis (0: sem níveis), modificador em %. */
interface SheetAdv {
  name: string; advId?: string; cost: number; levels: number; mod: number; notes: string;
  /** Só talentos: tamanho (S 5 pts/nível, M 10, L 15) e as perícias da ficha que recebem +1 por nível. */
  size?: 'S' | 'M' | 'L'; skills?: string[];
}

/** Item da seção Combate da ficha: perícia, técnica ou perk/vantagem (veja js/tabs/ficha-combate.js). */
interface CombatItem {
  kind: 'skill' | 'tech' | 'trait'; name: string; pts: number; bonus?: number;
  /** Por que o bônus (só com bônus diferente de 0; veja cleanBonusNote em js/tabs/tab-fichas.js). */
  bonusNote?: string;
  attr?: string; diff?: string; skillId?: string;
  /** Técnica: perícia-base, padrão e limite em relação a ela (null: sem limite). */
  base?: string; def?: number; max?: number | null; techId?: string;
}
/** Seção Combate da ficha: estilos (grupos), perícias fora de estilo, tabela de danos e defesas. */
interface SheetCombat {
  styles: { name: string; styleId?: string; items: CombatItem[] }[];
  general: CombatItem[];
  weapons: { name: string; mode: 'sw' | 'thr' | 'fixed'; mod: string; type: string }[];
  def: { parry: string; parryBonus: number; parryNote: string; block: string; blockBonus: number; blockNote: string; dodgeBonus: number; dodgeNote: string; db: number };
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

/** Coleção `disadvantages` (desvantagens de GURPS). Ids `disadv_*` vêm de dados/desvantagens.json. */
interface Disadvantage extends Doc {
  name: string;
  /** "-10 points", "Variable", "-5 to -15 points". */
  cost?: string;
  /** Disadvantage, Expansion (Basic Set disadvantage) ou Cross-reference. */
  type?: string;
  /** Mental, Physical, Social, Exotic, Supernatural, separadas por vírgula ("Physical, Exotic"). */
  classes?: string;
  /** Pede teste de autocontrole (o * do livro). */
  selfControl?: boolean;
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

/** Uma linha da tabela de armas do livro: um ataque, com os valores como o livro escreve ("sw+1 cut", "1, 2*"). */
interface WeaponAttack {
  /** Perícia do grupo da tabela ("Broadsword") e os padrões dela ("DX-5, Force Sword-4, ..."). */
  skill?: string;
  defaults?: string;
  /** O que o livro escreve no lugar do nome nas linhas seguintes: "or", "with Dart", "linked". */
  mode?: string;
  damage?: string;
  reach?: string;
  parry?: string;
  acc?: string;
  range?: string;
  rof?: string;
  shots?: string;
  fuse?: string;
  st?: string;
  bulk?: string;
  rcl?: string;
  /** Custo e peso próprios do ataque (o dardo e o dardo-lança do atlatl). */
  cost?: string;
  weight?: string;
  notes?: string;
}

/** Coleção `weapons` (armas de GURPS). Ids `weapon_*` vêm de dados/armas.json. */
interface Weapon extends Doc {
  name: string;
  tl?: string;
  /** Melee ou Ranged. */
  type?: string;
  /** Título da tabela no livro ("Melee Weapon Table"). */
  table?: string;
  cost?: string;
  weight?: string;
  /** Classe de legalidade (LC). */
  lc?: string;
  /** Verbete da arma nas listas do Low-Tech e do Martial Arts. */
  description?: string;
  /** Texto das notas numeradas da tabela citadas nos ataques, uma por linha ("[1] Can be thrown..."). */
  footnotes?: string;
  attacks?: WeaponAttack[];
  book?: string;
  page?: string;
}

/** Coleção `armors` (armaduras e escudos de GURPS). Ids `armor_*` vêm de dados/armaduras.json. */
interface Armor extends Doc {
  name: string;
  tl?: string;
  /** Armor ou Shield. */
  type?: string;
  /** Título da tabela no livro ("Horse Armor (Barding) Table"). */
  table?: string;
  /** Subtítulo da tabela de armaduras ("Body Armor", "Headgear"). */
  category?: string;
  /** Escudos: perícia e padrões do grupo da tabela ("Shield", "DX-4, or other Shield at -2"). */
  skill?: string;
  defaults?: string;
  location?: string;
  dr?: string;
  /** Bônus de defesa (DB) dos escudos. */
  db?: string;
  hp?: string;
  coverDr?: string;
  cost?: string;
  weight?: string;
  /** Segundos para vestir (Don, Low-Tech). */
  don?: string;
  lc?: string;
  /** A coluna Notes da tabela ("[1, 3]") e o texto dessas notas, uma por linha. */
  notes?: string;
  footnotes?: string;
  book?: string;
  page?: string;
}

/** Coleção `items` (equipamentos de GURPS, sem armas nem armaduras). Ids `item_*` vêm de dados/itens.json. */
interface GearItem extends Doc {
  name: string;
  /** "1", "0-4" ou "var." (o TL da perícia que o item serve); vazio no Dungeon Fantasy. */
  tl?: string;
  /** A seção do livro ("Camping and Survival Gear", "Potions"). */
  category?: string;
  /** "$100", "$2 per pint". */
  cost?: string;
  /** "10 lbs.", "neg.". */
  weight?: string;
  description?: string;
  book?: string;
  page?: string;
}

/** Coleção `notebooks` (títulos). */
interface Notebook extends Doc { name: string }

/** Coleção `notes`. `format: 'html'` para texto formatado; sem ele, texto simples. */
interface Note extends Doc { notebookId: string; title: string; body?: string; format?: string }

/** mestre: tudo; admin: Jogador que também gerencia os usuários (menos os Mestres); jogador. */
type Role = 'mestre' | 'admin' | 'jogador';

/** Coleção `users`. Com o Supabase, `email` liga a conta (Supabase Auth) ao usuário e só o Mestre o recebe. */
interface HubUser extends Doc { name: string; role: Role | string; email?: string | null }

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
  /**
   * Supabase: contas de login, pelo Mestre (Edge Function "contas"). 'criar' { id, nome, email, senha, papel },
   * 'senha' { id, senha }, 'excluir' { id, excluirConta }. Rejeita com `{ message }`.
   */
  account?(acao: 'criar' | 'senha' | 'excluir', dados: object): Promise<any>;
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
  disadvantages: Disadvantage[];
  skills: Skill[];
  techniques: Technique[];
  styles: FightingStyle[];
  weapons: Weapon[];
  armors: Armor[];
  items: GearItem[];
  sheets: Sheet[];
  events: HEvent[];
  notebooks: Notebook[];
  notes: Note[];
  users: HubUser[];
  /** Tudo que veio do banco, inclusive o que o usuário atual não vê. */
  raw: { maps: HMap[]; locations: HLocation[]; characters: Character[]; organizations: Organization[]; spells: Spell[]; advantages: Advantage[]; disadvantages: Disadvantage[]; skills: Skill[]; techniques: Technique[]; styles: FightingStyle[]; weapons: Weapon[]; armors: Armor[]; items: GearItem[]; sheets: Sheet[]; events: HEvent[]; notebooks: Notebook[]; notes: Note[]; armorLocs: ArmorLoc[] };
  loaded: { maps: boolean; locations: boolean; characters: boolean; organizations: boolean; spells: boolean; advantages: boolean; disadvantages: boolean; skills: boolean; techniques: boolean; styles: boolean; weapons: boolean; armors: boolean; items: boolean; sheets: boolean; events: boolean; users: boolean; notebooks: boolean; notes: boolean };
  mapIdx: Record<string, HMap>;
  locIdx: Record<string, HLocation>;
  charIdx: Record<string, Character>;
  orgIdx: Record<string, Organization>;
  spellIdx: Record<string, Spell>;
  advIdx: Record<string, Advantage>;
  disadvIdx: Record<string, Disadvantage>;
  skillIdx: Record<string, Skill>;
  techIdx: Record<string, Technique>;
  styleIdx: Record<string, FightingStyle>;
  weaponIdx: Record<string, Weapon>;
  armorIdx: Record<string, Armor>;
  itemIdx: Record<string, GearItem>;
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
  disadvId?: string;
  skillId?: string;
  techId?: string;
  styleId?: string;
  weaponId?: string;
  armorId?: string;
  itemId?: string;
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
