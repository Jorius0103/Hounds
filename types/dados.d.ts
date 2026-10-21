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
  /** Só nos atributos com os efeitos das vantagens (withAdvFx em js/tabs/ficha-efeitos.js): a base e o que cada efeito soma. */
  fx?: { base: SheetAttrs; b: Record<string, any>; def: Record<string, any> };
}

/** Coleção `sheets` (fichas) de GURPS. Ligada a personagens por `Character.sheetId`. */
interface Sheet extends Doc {
  name: string; description?: string; attrs?: SheetAttrs; combat?: SheetCombat; advs?: SheetAdv[]; disadvs?: SheetDisadv[]; quirks?: SheetQuirk[]; reactions?: SheetReaction[]; points?: SheetPoints | null;
  equip?: SheetEquip[]; bodies?: SheetBody[]; packs?: SheetPack[]; homes?: SheetHome[]; armorSets?: ArmorSet[]; customWeapons?: CustomWeapon[]; customShields?: CustomShield[];
  spells?: SheetSpell[];
  /** Só nos aliados: a ficha principal que criou o aliado (fixa; veja a migration 29). O aliado aparece numa aba dela, não nas listas. */
  allyOf?: string | null;
  /** Só nos aliados: o nome da aba, independente de `name` (o nome da ficha do aliado). */
  allyName?: string | null;
  /** Cor do painel do aliado (ALLY_COLORS, em tab-fichas.js); sem ela, violeta. */
  allyColor?: string | null;
}
/** Magia da aba Magia da ficha (veja js/tabs/ficha-magias.js): perícia de IQ, H ou VH, mostrada na tabela da escola `college` ('' : Sem escola). */
interface SheetSpell {
  name: string; college: string; diff: 'H' | 'VH'; pts: number; bonus: number;
  /** Por que o bônus (só com bônus diferente de 0). */
  bonusNote?: string;
  /** Entrada de Regras › Magias de onde a magia veio. */
  spellId?: string;
}
/** Escudo de Criar Escudo (veja js/tabs/ficha-escudos.js): o escudo do livro (ou digitado) como era ao criar, os ajustes e o resultado. */
interface CustomShield {
  id: string; baseId: string | null;
  base: { name: string; tl: string; db: string; dr: string; hp: string; cost: number; weight: number; skill: string; defaults: string };
  description: string;
  /** Ajustes: somam ou tiram do BD, da RD, do NH com o escudo, do custo ($) e do peso (%). */
  mods: { name: string; spellId?: string; improvementId?: string; db: number; dr: number; nh: number; cost: number; weightPct: number; weightLbs?: number }[];
  db: string; dr: string; hp: string; cost: number; weight: number;
  /** A linha de Meus Itens que é o escudo (null: saiu da lista). */
  equipId: string | null;
}
/** Arma de Criar Arma (veja js/tabs/ficha-armas.js): a arma do livro como era ao criar, os ajustes e o resultado. */
interface CustomWeapon {
  id: string; baseId: string | null; base: { name: string; tl: string; type: string; cost: number; weight: number }; description: string;
  /** Ajustes: texto livre ou uma magia (spellId); somam ou tiram do dano de todos os ataques, do NH com a arma, do custo ($) e do peso (%). */
  mods: { name: string; spellId?: string; improvementId?: string; dmg: number; cutImp?: boolean; nh: number; cost: number; weightPct: number; weightLbs?: number }[];
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
  mods: { name: string; spellId?: string; improvementId?: string; dr: number; cost: number; weightPct: number; weightLbs?: number }[];
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
  /** A entrada de Regras › Itens, Armaduras ou Armas de onde veio. */
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
/** Casa: o que o personagem guarda e não leva (nunca entra na carga). Somando as casas e as mochilas, não mais do que a lista tem. */
interface SheetHome { id: string; name: string; items: { equipId: string; qty: number }[] }
/** Linha da seção Vantagens da ficha (veja js/tabs/ficha-vantagens.js): custo por nível, níveis (0: sem níveis), modificador em %. */
interface SheetAdv {
  name: string; advId?: string; cost: number; levels: number; mod: number; notes: string;
  /** Só talentos: tamanho (S 5 pts/nível, M 10, L 15) e as perícias da ficha que recebem +1 por nível. */
  size?: 'S' | 'M' | 'L'; skills?: string[];
}
/** Desvantagem da ficha (veja js/tabs/ficha-desvantagens.js): como SheetAdv, sem talentos; o custo é 0 ou negativo. */
interface SheetDisadv {
  name: string; disadvId?: string; cost: number; levels: number; mod: number; notes: string;
}
/** Peculiaridade da ficha (veja js/tabs/ficha-peculiaridades.js): digitada, sem catálogo; vale −1 ponto, e só 5 contam. */
interface SheetQuirk { name: string; notes: string; }
/** Ficha › Atributos › Reações: quem reage, o modificador (−99 a +99) e de onde vem. */
interface SheetReaction { name: string; mod: number; notes: string; }
/** Ficha › Pontos (abaixo de Personagem): ajuste livre, raça e seus pontos e XP, digitados. */
interface SheetPoints { adj: number; race: string; racePts: number; xp: number; }

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
  /** O que a vantagem soma ou tira na ficha de quem a tem (veja js/tabs/ficha-efeitos.js). */
  effects?: AdvEffect[];
}
/** Efeito de uma vantagem na ficha. `key`: o atributo, a defesa ou o atributo das perícias; `names`: perícias, magias ou escolas. */
interface AdvEffect {
  target: 'attr' | 'def' | 'skill' | 'skillAttr' | 'skillAll' | 'spell' | 'college' | 'spellAll';
  key: string; names: string[]; op: 'add' | 'sub'; value: number; perLevel: boolean;
  /** O máximo que o efeito dá, depois dos níveis (null: sem limite). */
  max: number | null;
  /** false: entre os efeitos que não acumulam no mesmo campo, só o maior vale. */
  stacks: boolean;
  /** Com condição, o efeito é mostrado e não somado. */
  cond: string; note: string;
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

/** Coleção `improvements` (melhoramentos de GURPS: modificadores de armas, escudos, armaduras, roupas e equipamentos). Ids `impr_*` vêm de dados/melhoramentos.json. */
interface Improvement extends Doc {
  name: string;
  /** "1", "0-4"; vazio no Dungeon Fantasy. */
  tl?: string;
  /** O tipo de equipamento: Arma, Escudo, Armadura, Roupa, Item ou Item mágico. */
  appliesTo?: string;
  /** A seção do livro ("Weapons of Quality", "Soft Items Table"). */
  category?: string;
  /** A que equipamentos serve ("Any metal weapon"); com várias faixas de custo, "Metallic (+2 CF) / Nonmetallic (+6 CF)". */
  restriction?: string;
  /** O fator de custo ("+4 CF", "+2/+3/+9 CF") ou o que o livro diz ("×4", "+$20"). */
  cost?: string;
  /** O efeito no peso ("×2", "×3/4", "-10%", "+6 lbs."). */
  weight?: string;
  description?: string;
  book?: string;
  page?: string;
}

/** Coleção `notebooks` (títulos). */
interface Notebook extends Doc { name: string; /** Ficha dona do título (aba Anotações da ficha); sem ele, é do menu Anotações. */ sheetId?: string | null }

/** Coleção `notes`. `format: 'html'` para texto formatado; sem ele, texto simples. */
interface Note extends Doc { notebookId: string; title: string; body?: string; format?: string }

/** mestre: tudo; admin: Jogador que também gerencia os usuários (menos os Mestres); jogador. */
type Role = 'mestre' | 'admin' | 'jogador';

/** Coleção `users`. Com o Supabase, `email` liga a conta (Supabase Auth) ao usuário e só o Mestre o recebe. */
interface HubUser extends Doc { name: string; role: Role | string; email?: string | null; /** Ficha principal vinculada à conta (uma só). */ sheetId?: string | null }

/** Parede ou porta de um tabuleiro, em pixels da imagem. Uma porta aberta não barra a visão nem o caminho. */
interface BoardWall { x1: number; y1: number; x2: number; y2: number; door?: boolean; open?: boolean }
/** Retângulo da névoa manual: revela (show) ou esconde, na ordem da lista. */
interface BoardFogArea { x: number; y: number; w: number; h: number; show: boolean }

/** Coleção `boards` (tabuleiros; veja js/tabs/tab-tabuleiros.js). Medidas em pixels da imagem. */
interface Board extends Doc {
  name: string;
  image?: ImageInfo | null;
  /** O tamanho do tabuleiro: o da imagem, ou o do fundo liso. */
  width: number; height: number;
  /** Cor do fundo liso. */
  bg?: string;
  /** hex: hexágonos em fileiras; hexc: em colunas; square; none. */
  gridType: 'hex' | 'hexc' | 'square' | 'none' | string;
  /** Distância entre os centros de duas células vizinhas. */
  gridSize: number; gridX: number; gridY: number; gridColor: string; gridOpacity: number;
  /** Quanto vale uma célula, na unidade `unit` (1 jd). */
  scale: number; unit: string;
  dynamicLight: boolean; globalLight: boolean; explorer: boolean;
  /** Névoa manual e as áreas reveladas ou escondidas pelo Mestre. */
  fog: boolean; fogAreas: BoardFogArea[];
  walls: BoardWall[];
  /** Áreas já vistas pelos tokens dos jogadores: um bit por meia célula, em base64 (BoardGeo). */
  explored: string;
  /** Muda quando o Mestre apaga o explorado ou a grade muda. */
  exploredEpoch: number;
}

/** Coleção `boardTokens`: um token de um tabuleiro. x e y são o centro, em pixels da imagem. */
interface BoardToken extends Doc {
  boardId: string;
  name: string;
  x: number; y: number;
  /** Em células. */
  size: number;
  /** Para onde está virado, em graus no sentido horário: 0 é para cima (norte), 90 para a direita. */
  rotation?: number;
  color?: string | null;
  image?: ImageInfo | null;
  /** Personagem do Mundo que o token representa (a imagem dele vale quando o token não tem uma). */
  characterId?: string | null;
  /** fore: primeiro plano, acima dos tokens (migration 34). */
  layer: 'map' | 'tokens' | 'gm' | 'fore' | string;
  /** Contas que controlam o token. */
  ownerIds: string[];
  sight: boolean;
  /** Alcances na unidade do tabuleiro; sightRange 0 é sem limite. */
  sightRange: number; darkvision: number; lightBright: number; lightDim: number;
  hp?: number | null; hpMax?: number | null;
  /** Fadiga (PF), a segunda barra. */
  fp?: number | null; fpMax?: number | null;
  /** Marcadores de estado, ids de BOARD_MARKERS (js/tabs/tab-tabuleiros.js). */
  markers?: string[];
  showName?: boolean;
}

/** Os dados que saíram numa rolagem: o formato de rolar_dados (migration 34) e de BoardChat sem o Supabase. */
interface DiceResult {
  /** A expressão como é mostrada ("3d6+2"). */
  ex: string;
  /** Os grupos de dados: lados (ou 'F', Fudge), sinal e as faces (as de um dado que explodiu vêm em seguida). */
  g: { s: number | 'F'; sg: number; r: number[] }[];
  mod: number; tot: number;
}

/** Coleção `chatMessages`: uma mensagem do chat da mesa (js/tabuleiro-chat.js). Não muda depois de gravada. */
interface ChatMessage extends Doc {
  /** say: fala; emote: ação (/em); desc: descrição do Mestre (/desc); roll: rolagem (/r). */
  kind: 'say' | 'emote' | 'desc' | 'roll' | string;
  text: string;
  /** O nome com que aparece: a conta ou um personagem. */
  as: string;
  characterId?: string | null;
  boardId?: string | null;
  /** Sussurro: quem lê, além de quem escreveu. Vazio: todos. */
  to: string[];
  /** Só o Mestre lê (e quem escreveu). */
  gm: boolean;
  /** Rolagem secreta: só o Mestre vê o resultado. */
  secret: boolean;
  /** Rolagem: sem o resultado ao ser mandada (o banco rola) e com ele depois. */
  roll?: (Partial<DiceResult> & { expr?: string; nh?: number | null; explode?: boolean; label?: string }) | null;
  /** Ao mandar, as expressões de [[...]] no texto; gravadas, o que saiu em cada uma (null se não foi entendida). */
  inline?: (string | DiceResult | null)[];
}

/** Um item da ordem de turno: um token, ou um item avulso (sem tokenId). */
interface BoardTurnItem { id: string; tokenId?: string | null; name?: string; value?: number | string }

/** Coleção `boardTurns`: a ordem de turno de um tabuleiro (o id é o do tabuleiro). */
interface BoardTurns extends Doc {
  boardId: string;
  items: BoardTurnItem[];
  /** O id do item da vez; nulo é o primeiro. */
  turn?: string | null;
  round: number;
  /** O Mestre abriu a janela: os jogadores também a veem. */
  open: boolean;
}

/** Coleção `boardArt`: uma imagem da biblioteca de arte do Mestre. */
interface BoardArt extends Doc { name: string; image: ImageInfo; folder?: string }

/** Coleção `boardCampaign`: um item só, 'mesa'. Onde os jogadores estão e a ordem das páginas. */
interface BoardCampaign extends Doc {
  /** A fita: o tabuleiro do grupo. */
  playersBoardId?: string | null;
  /** Quem está num tabuleiro diferente do grupo: { idDoUsuario: idDoTabuleiro }. */
  perPlayer?: Record<string, string>;
  /** A ordem das páginas na barra de páginas. */
  order?: string[];
}

/** Coleção `boardDrawings`: um desenho ou texto de um tabuleiro (ferramentas Desenhar e Texto). */
interface BoardDrawing extends Doc {
  boardId: string;
  kind: 'free' | 'line' | 'rect' | 'ellipse' | 'text' | string;
  layer: 'map' | 'tokens' | 'gm' | 'fore' | string;
  /** [x0, y0, x1, y1, ...] em pixels da imagem: o traço, as pontas, os cantos opostos ou onde o texto começa. */
  points: number[];
  /** Cor do traço (ou do texto). */
  stroke: string;
  /** Preenchimento (ou o fundo do texto); null é transparente. */
  fill?: string | null;
  width: number;
  text?: string | null;
  font?: 'sans' | 'serif' | 'mono' | 'hand' | string | null;
  fontSize?: number | null;
  bold?: boolean; italic?: boolean;
}

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
  /** Supabase: tamanho máximo do estado da Mesa salvo numa linha só (0: sempre em partes). */
  inlineMax?: number;
  /** Supabase: tamanho de cada parte do estado da Mesa (caracteres). */
  chunkSize?: number;
  /** Supabase: só os ids de uma coleção, sem os dados. */
  ids?(col: string): Promise<string[]>;
  /** Supabase: canal de broadcast entre navegadores. */
  realtime?: { send(kind: string, data: unknown): Promise<unknown>; on(kind: string, fn: (data: any) => void): void };
  /** Supabase: o Mestre apaga o chat inteiro (hounds_limpar_chat), inclusive os sussurros que não lê. */
  clearChat?(): Promise<unknown>;
  /** Supabase: o banco rola os dados do chat; o site manda a rolagem sem o resultado. */
  rollsDice?: boolean;
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
  improvements: Improvement[];
  sheets: Sheet[];
  events: HEvent[];
  boards: Board[];
  notebooks: Notebook[];
  notes: Note[];
  /** Os títulos das fichas (sheetId) e as anotações deles, fora do menu Anotações. */
  sheetNotebooks: Notebook[];
  sheetNotes: Note[];
  users: HubUser[];
  /** Tudo que veio do banco, inclusive o que o usuário atual não vê. */
  raw: { maps: HMap[]; locations: HLocation[]; characters: Character[]; organizations: Organization[]; spells: Spell[]; advantages: Advantage[]; disadvantages: Disadvantage[]; skills: Skill[]; techniques: Technique[]; styles: FightingStyle[]; weapons: Weapon[]; armors: Armor[]; items: GearItem[]; improvements: Improvement[]; sheets: Sheet[]; events: HEvent[]; notebooks: Notebook[]; notes: Note[]; armorLocs: ArmorLoc[]; boards: Board[] };
  loaded: { maps: boolean; locations: boolean; characters: boolean; organizations: boolean; spells: boolean; advantages: boolean; disadvantages: boolean; skills: boolean; techniques: boolean; styles: boolean; weapons: boolean; armors: boolean; items: boolean; improvements: boolean; sheets: boolean; events: boolean; users: boolean; notebooks: boolean; notes: boolean; boards: boolean };
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
  improvementIdx: Record<string, Improvement>;
  sheetIdx: Record<string, Sheet>;
  eventIdx: Record<string, HEvent>;
  boardIdx: Record<string, Board>;
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
  improvementId?: string;
  sheetId?: string;
  /** Na página de uma ficha, o aliado aberto (null: a ficha principal). */
  allyId?: string | null;
  eventId?: string;
  boardId?: string;
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
  /** Aliado recém-criado, aberto antes de chegar à lista de fichas (veja renderSheetPage). */
  pendingAlly?: string | null;
}
