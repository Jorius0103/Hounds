// O que a casca React usa dos scripts clássicos de js/ (funções globais, carregadas antes pelo index.html).
// Os tipos dos dados (World, PageState, Route…) e do window vêm de types/dados.d.ts e types/globais.d.ts,
// os mesmos da checagem de js/ (tsconfig.json os inclui).

export {};

declare global {
  /** js/mundo.js: os dados do mundo, alimentados pelo banco em js/app.js. */
  var W: World;
  /** js/pagina.js: o estado da página (rota atual, estado de interface). */
  var S: PageState;

  /** js/rotas.js: lê o endereço atual (#ficha~id…); null quando não é uma rota conhecida. */
  function parseRoute(): Route | null;
  /** js/app.js: aplica o endereço atual ao menu, ao título e às telas, e desenha a página antiga. */
  function onRoute(): void;
  /** js/rotas.js: vai para um endereço; replace troca o atual sem criar histórico. */
  function go(hash: string, replace?: boolean): void;
  /** js/rotas.js: o endereço (#…) de um item do menu. */
  function hrefFor(node: string): string;
  /** js/menu.js: os itens do menu por id, e os ancestrais de um item (a trilha do topo das páginas). */
  var byId: Record<string, {id: string; label: string; route?: boolean}>;
  function ancestors(id: string): string[];

  /** js/utils.js: os desenhos dos ícones (o miolo de um <svg>; veja src/hub/ui/Icon.tsx). */
  var ICON: Record<string, string>;
  /** js/utils.js: as iniciais de um nome, para o avatar. */
  function initials(name: string): string;
  /** js/utils.js: o texto sem maiúsculas nem acentos, para comparar e buscar. */
  function norm(s: string): string;
  /** js/utils.js: um id novo (data e acaso, em base 36). */
  function uid(): string;
  /** js/utils.js: ordem alfabética pelo nome, em português. */
  function byName(a: {name?: string}, b: {name?: string}): number;
  /** js/utils.js: o aviso no rodapé da tela; bad o mostra como erro. */
  function toast(msg: string, bad?: boolean): void;
  /** js/utils.js: "1 evento", "3 eventos". */
  function plural(n: number, one: string, many: string): string;
  /** js/utils.js: o tamanho de um arquivo, em KB ou MB. */
  function fmtBytes(bytes: number): string;
  /** js/modal.js: os tipos de imagem aceitos no upload. */
  var ACCEPT: string[];
  /** js/zoom-imagem.js: a imagem em tela cheia, com zoom. */
  function zoomImage(url: string, alt?: string): void;
  /** js/store/supabase.js: a mensagem de um erro do banco, em português. */
  function errorText(e: unknown): string;

  /** js/app.js: redesenha a página antiga aberta (as React redesenham sozinhas). */
  function renderPage(): void;

  /** js/modal.js: o modal aberto, antigo ou React (src/hub/ui/Dialog.tsx); null quando não há. */
  interface LegacyModal {
    last: HTMLElement | null;
    onClose?: () => void;
    busy: boolean;
    base: string | null;
    touched: boolean;
    /** Só no modal React: o X, o clique fora e o Esc (requestCloseModal de js/modal.js) passam por aqui. */
    requestClose?(fromEsc?: boolean): void;
  }
  var modalOpen: LegacyModal | null;

  /** js/mundo.js: visibilidade. Um item com visible false só é visto pelo Mestre, por quem criou e por sharedWith. */
  function now(): number;
  function isSecret(x: Doc | null | undefined): boolean;
  function canSetVis(item: Doc | null): boolean;
  /** Quem vê um item oculto ("o Mestre", "você e o Mestre"…) e o verbo que combina ("vê", "veem"). */
  function seenBy(item: {createdBy?: string | null; sharedWith?: string[]} | null): string;
  function seenVerb(item: {createdBy?: string | null; sharedWith?: string[]} | null): string;
  /** Se a coleção tem o documento, mesmo um que este usuário não vê (W.raw). */
  function rawHas(col: string, id: string | null | undefined): boolean;
  /** Muda um item dos catálogos dos livros: o primeiro ajuste cria o documento no banco. */
  function patchCatalogItem(col: string, item: Doc, p: object): Promise<unknown>;
  /** Os olhos dos botões de visibilidade (js/mundo.js e js/app.js). */
  var EYE_OFF: string;
  var EYE_ON: string;

  /** js/mundo.js: locais (em árvore) e mapas. */
  function locById(id: string | null | undefined): HLocation | null;
  function childLocs(id: string | null): HLocation[];
  /** Os ids de tudo o que está dentro de um local, em todos os níveis. */
  function locDescendants(id: string): string[];
  /** O próprio local e os de dentro: os que não podem ser o local de cima dele. */
  function badLocParents(id: string): Record<string, boolean>;
  function locPathText(id: string): string;
  function locMapId(l: HLocation): string | null;
  /** Os personagens visíveis ligados ao local. */
  function locChars(l: HLocation): Character[];
  function mapPathText(id: string): string;
  function mapById(id: string): HMap | null;
  function childMaps(id: string | null): HMap[];
  /** Os ids de todos os mapas dentro de um, em todos os níveis. */
  function mapDescendants(id: string): string[];
  /** O próprio mapa e os de dentro: os que não podem ser o mapa pai dele. */
  function validParents(id: string): Record<string, boolean>;
  /** Os locais cujo mapa é este. */
  function mapLocations(id: string): HLocation[];
  /** Do mapa de nível superior até o próprio mapa. */
  function mapChain(id: string): HMap[];
  /** js/utils.js: a categoria de um marcador (rótulo, cor e ícone); a primeira quando não há. */
  function cat(id: string | undefined): {id: string; label: string; color: string; icon: string};
  /** js/pagina.js: o que um marcador indica, para listas (o local, o mapa a que leva ou a categoria). */
  function markerSub(mk: Marker): string;
  /** js/mapa-previa.js: desenha a prévia do mapa na caixa (imagem, marcadores, zoom); a vista fica em keep.view. */
  function mapPreview(box: HTMLElement, m: HMap, markers: Marker[], keep: object): void;
  /** Os personagens da Mesa de Combate guardados neste navegador, como sugestões. */
  function mesaCharacters(): {name: string; source: string; mesaId: string | null; kind: string}[];
  /** js/explorer.js: o que o explorer de mapas faz ao abrir (mostrar o marcador de um local, ou marcar um local novo). */
  var Explorer: {pending: {locationId?: string; linkLocationId?: string; markerId?: string} | null};
  /** js/rotas.js */
  function locHref(id: string): string;
  function mapHref(id: string): string;
  /** js/pagina.js: as opções dos seletores de locais e de mapas (IdPicker), na ordem da árvore e com o caminho de cada um. */
  function locPickOptions(q: string): {id: string; label: string; sub?: string; depth?: number}[];
  function mapPickOptions(q: string): {id: string; label: string; sub?: string; depth?: number}[];

  /** js/tabs/tab-personagens.js */
  function charById(id: string | null | undefined): Character | null;
  function charHref(id: string): string;
  /** A raça e as organizações do personagem, numa linha. */
  function charSubtitle(c: Character): string;
  /** Os personagens ligados a um mapa (personagem.mapIds). */
  function mapCharacters(mapId: string): Character[];
  /** Os locais e os mapas ligados ao personagem, em ordem alfabética. */
  function charLocations(id: string): HLocation[];
  function charMaps(c: Character): HMap[];
  /** As relações que o personagem declarou e, depois, as que outros declararam com ele (back), cada outro uma vez. */
  function charRelations(c: Character): {c: Character; type: string; back?: boolean}[];
  /** As sugestões do formulário: os valores já usados num campo (as raças), as raças padrão e os tipos de relação. */
  function distinct(field: 'race'): string[];
  var RACE_DEFAULTS: string[];
  function relationTypes(): string[];
  /** A apresentação de um personagem na tela de todos (o botão dos cartões da lista). */
  var CharPresentation: {broadcast(id: string): void};

  /** js/tabs/tab-eventos.js */
  function eventById(id: string | null | undefined): HEvent | null;
  function eventHref(id: string): string;
  function eventChars(ev: HEvent): Character[];
  function eventLoc(ev: HEvent): HLocation | null;
  /** Os eventos de que um personagem participa, e os que aconteceram num local. */
  function charEvents(charId: string): HEvent[];
  function locEvents(locId: string): HEvent[];

  /** js/tabs/tab-organizacoes.js */
  function orgById(id: string | null | undefined): Organization | null;
  function orgHref(id: string): string;
  /** Os membros visíveis, do cargo mais alto (Líder) aos sem cargo, e então pelo nome. */
  function orgMembers(o: Organization): {c: Character; rank: string}[];
  /** Os locais e os mapas ligados à organização, em ordem alfabética. */
  function orgLocs(o: Organization): HLocation[];
  function orgMaps(o: Organization): HMap[];
  /** As sugestões de cargo e de reputação: as padrão primeiro, e então as outras já usadas. */
  function rankTypes(): string[];
  function reputations(): string[];
  /** As organizações ligadas a um local e a um mapa. */
  function locOrgs(locId: string): Organization[];
  function mapOrgs(mapId: string): Organization[];
  /** As organizações de um personagem, cada uma com o cargo dele, e os nomes delas numa linha (ou o campo antigo). */
  function charOrgs(id: string): {o: Organization; rank: string}[];
  function charOrgText(c: Character): string;

  /** js/tabs/tab-fichas.js */
  function sheetById(id: string | null | undefined): Sheet | null;
  function sheetHref(id: string): string;
  /** Os personagens da ficha, e o retrato dela: o do primeiro deles com imagem. */
  function sheetChars(id: string): Character[];
  function sheetPortrait(s: Sheet): {ref: string; name: string} | null;
  /** O formulário de escolher a ficha de um personagem, no modal antigo. */
  function openSheetLinkForm(c: Character): void;

  /** js/mundo.js: os catálogos de GURPS (magias, vantagens…). Busca o arquivo dos livros na primeira vez; a lista, com os documentos do Mestre por cima, chega pelo aviso hub:data. */
  function loadCatalog(col: string): Promise<void>;
  /** failed: o arquivo dos livros não carregou; deleted: as entradas dos livros que o Mestre excluiu (só para ele). */
  var CATALOG: Record<string, {failed: boolean; deleted: Doc[]}>;
  /** O texto de busca de uma entrada: os campos, normalizados (guardado na primeira vez). */
  function searchText(x: object, fields: string[]): string;
  /** js/busca-catalogos.js: as entradas que combinam com a busca, as mais parecidas primeiro (também pelo nome em português); sem busca, a lista toda. */
  function searchCatalog<T extends {name: string}>(list: T[], q: string, textOf?: (x: T) => string): T[];
  /** O nome em português de uma entrada; '' quando não há, ou quando é o mesmo do livro. */
  function ptName(x: {name: string}): string;
  /** js/pagina.js: a fatia da lista na página (de 1 em diante, dentro das que existem), PAGE_SIZE por página. */
  function pageOf<T>(list: T[], page: number): {page: number; pages: number; from: number; items: T[]};

  /** js/mundo.js e js/rotas.js: uma magia pelo id (ou, num link antigo, pelo nome que o id traz) e o endereço dela. */
  function spellById(id: string | null | undefined): Spell | null;
  function spellHref(id: string): string;
  /** js/tabs/tab-magias.js: as escolas e as classes de GURPS e as já usadas, em ordem alfabética. */
  function spellColleges(): string[];
  function spellClasses(): string[];
  /** Os grupos de resistência de uma magia ('HT', 'Will'…, ou 'none'), e os que têm magias: [chave, rótulo, quantas]. */
  function spellResistance(s: Spell): string[];
  function spellResistances(): [string, string, number][];
  /** Os livros da lista, com quantas magias cada um tem: [livro, quantas]. */
  function spellBooks(): [string, number][];
  /** O que o Mestre mudou na magia: 'created', 'edited', 'hidden' (só para ele) ou '' (como no livro). */
  function spellChange(s: Spell): string;

  /** js/tabs/tab-vantagens.js: uma vantagem pelo id (ou o de uma entrada que mudou de página no livro) e o endereço dela, em Vantagens ou, num perk, em Perks. */
  function advById(id: string | null | undefined): Advantage | null;
  function advHref(id: string): string;
  /** Se a entrada é um perk (o tipo Perk), que tem a lista e as páginas dele (#perks, #perk~id). */
  function isPerkEntry(a: Advantage | null): boolean;
  /** Os valores já usados num campo (os tipos, os livros), em ordem alfabética. */
  function advValues(field: 'type' | 'book'): string[];
  /** A chave do tipo ('adv', 'perk', 'talent', 'exp', 'ref'), o rótulo em português (Vantagem, Perk…) e a classe do selo. */
  function advTypeKey(t: string | undefined): string;
  function advTypeLabel(t: string | undefined): string;
  function advTypeClass(t: string | undefined): string;
  /** js/tabs/tab-desvantagens.js: uma desvantagem pelo id (ou o de uma entrada que mudou de página no livro) e o endereço dela. */
  function disadvById(id: string | null | undefined): Disadvantage | null;
  function disadvHref(id: string): string;
  /** Os valores já usados num campo (os tipos, os livros), em ordem alfabética. */
  function disadvValues(field: 'type' | 'book'): string[];
  /** O tipo em português (Desvantagem, Expansão, Remissão) e a classe do selo, com as cores das vantagens. */
  function disadvTypeLabel(t: string | undefined): string;
  function disadvTypeClass(t: string | undefined): string;
  /** As classes dos livros, na ordem deles (a entrada as guarda em inglês, "Physical, Exotic"), e os nomes em português. */
  var DISADV_CLASSES: string[];
  var DISADV_CLASS_LABELS: Record<string, string>;
  /** As classes de uma entrada, e os nomes delas em português numa linha. */
  function disadvClassList(d: Disadvantage | null): string[];
  function disadvClassText(d: Disadvantage): string;
  /** js/tabs/tab-pericias.js: uma perícia pelo id (ou o de uma entrada que mudou de página no livro) e o endereço dela em Perícias. */
  function skillById(id: string | null | undefined): Skill | null;
  function skillHref(id: string): string;
  /** Os valores já usados num campo (os atributos, os livros), em ordem alfabética. */
  function skillValues(field: 'attribute' | 'book'): string[];
  /** Os atributos e as dificuldades do formulário, os nomes delas (Fácil, Média…) e as cores do selo. */
  var SKILL_CAT_ATTRS: string[];
  var SKILL_CAT_DIFFS: string[];
  var SKILL_CAT_LABELS: Record<string, string>;
  var SKILL_CAT_CLASSES: Record<string, string>;
  /** "Exige especialização · Cinemática", e a linha embaixo do título ("DX / Difícil", ou o tipo de uma remissão). */
  function skillTags(s: Skill): string;
  function skillLede(s: Skill): string;
  /** Os grupos das perícias de combate, [valor, rótulo] ('' é uma perícia comum), e o de uma perícia, pelo começo do tipo dela. */
  var SKILL_COMBAT_GROUPS: [string, string][];
  function skillCombatGroup(s: Skill | null): string;
  /** js/tabs/tab-armas.js: uma arma pelo id (ou o de uma entrada que mudou de página no livro) e o endereço dela. */
  function weaponById(id: string | null | undefined): Weapon | null;
  function weaponHref(id: string): string;
  /** Os tipos das tabelas (Melee, Ranged) em português, e o de uma arma ("Arma" quando não tem). */
  var WEAPON_TYPE_LABELS: Record<string, string>;
  function weaponTypeLabel(t: string | undefined): string;
  /** As perícias dos ataques, cada uma uma vez; o primeiro ataque com dano numa linha ("sw+1 cut · alcance 1"); o modo de um ataque ("ou"). */
  function weaponSkills(w: Weapon): string[];
  function weaponSummary(w: Weapon): string;
  function weaponModeText(m: string | undefined): string;
  /** Os valores já usados num campo (os livros) e as perícias dos ataques, em ordem alfabética; o texto de busca de uma arma, com o dos ataques. */
  function weaponValues(field: 'book'): string[];
  function weaponSkillValues(): string[];
  function weaponSearchText(w: Weapon): string;
  /** As colunas dos ataques, na ordem dos livros: [campo, título da tabela, rótulo do formulário, exemplo]; e as que o formulário mostra em cada tipo. */
  var WEAPON_ATTACK_COLS: [keyof WeaponAttack, string, string, string][];
  var WEAPON_FORM_COLS: Record<'Melee' | 'Ranged', (keyof WeaponAttack)[]>;
  /** js/tabs/tab-armaduras.js: uma armadura ou escudo pelo id (ou o de uma entrada que mudou de página no livro) e o endereço dela. */
  function armorById(id: string | null | undefined): Armor | null;
  function armorHref(id: string): string;
  /** Os tipos das tabelas (Armor, Shield) em português, e o de uma entrada ("Armadura" quando não tem). */
  var ARMOR_TYPE_LABELS: Record<string, string>;
  function armorTypeLabel(t: string | undefined): string;
  /** O que protege, numa linha ("RD 4/2* · torso, groin"), e os valores já usados num campo (categorias, tabelas, livros). */
  function armorSummary(a: Armor): string;
  function armorValues(field: 'category' | 'table' | 'book'): string[];
  /** Os campos de uma armadura ou escudo: [campo, rótulo, exemplo], na ordem do formulário e da página. */
  var ARMOR_FIELDS: [ArmorField, string, string][];
  type ArmorField = 'tl' | 'location' | 'dr' | 'db' | 'hp' | 'coverDr' | 'cost' | 'weight' | 'don' | 'lc' | 'category' | 'skill' | 'defaults' | 'table' | 'book' | 'page';
  /** js/tabs/tab-itens.js: um item pelo id (ou o de uma entrada que mudou de página no livro), o endereço dele e os valores já usados num campo. */
  function itemById(id: string | null | undefined): GearItem | null;
  function itemHref(id: string): string;
  function itemValues(field: 'category' | 'book'): string[];
  /** Os campos de um item além do nome e da descrição: [campo, rótulo, exemplo], na ordem do formulário e da página. */
  var ITEM_FIELDS: [ItemField, string, string][];
  type ItemField = 'cost' | 'weight' | 'tl' | 'category' | 'book' | 'page';
  /** js/tabs/tab-melhoramentos.js: um melhoramento pelo id (ou o de uma entrada que mudou de página no livro), o endereço dele e
   *  os valores já usados num campo (os tipos de equipamento vêm primeiro, na ordem de IMPROVEMENT_KINDS). */
  function improvementById(id: string | null | undefined): Improvement | null;
  function improvementHref(id: string): string;
  function improvementValues(field: 'appliesTo' | 'category' | 'book'): string[];
  /** Os campos de um melhoramento além do nome e da descrição: [campo, rótulo, exemplo], na ordem do formulário e da página. */
  var IMPROVEMENT_FIELDS: [ImprovementField, string, string][];
  type ImprovementField = 'cost' | 'weight' | 'tl' | 'appliesTo' | 'restriction' | 'category' | 'book' | 'page';
  /** js/tabs/tab-combate.js: o endereço de uma perícia aberta em Combate (#pericia-combate~id). */
  function combatSkillHref(id: string): string;
  /** Uma técnica e um estilo pelo id, e os endereços deles. */
  function techById(id: string | null | undefined): Technique | null;
  function techHref(id: string): string;
  function styleById(id: string | null | undefined): FightingStyle | null;
  function styleHref(id: string): string;
  /** As perícias que contam como de combate (pelo nome ou pelo tipo "Melee; …"), e as técnicas de combate. */
  function isCombatSkill(s: Skill): boolean;
  function isCombatTech(t: Technique): boolean;
  /** As dificuldades das técnicas (Média, Difícil), os nomes delas e as cores do selo. */
  var TECH_DIFFS: string[];
  var TECH_DIFF_LABELS: Record<string, string>;
  var TECH_DIFF_CLASSES: Record<string, string>;
  /** As listas de um estilo, [campo, título]: as que ele ensina e os traços opcionais. */
  var STYLE_LISTS: [StyleList, string][];
  var STYLE_OPT_LISTS: [StyleList, string][];
  type StyleList = 'skills' | 'techniques' | 'cinematicSkills' | 'cinematicTechniques' | 'perks' | 'spells' | 'optAdvantages' | 'optDisadvantages' | 'optSkills' | 'optTechniques' | 'optPerks';
  /** Os itens de uma lista de um estilo (separados por "; "), e o custo dele em pontos ("3 pontos"). */
  function styleItems(text: string | undefined): string[];
  function styleCost(x: FightingStyle): string;
  /** A entrada dos catálogos que um item de um estilo nomeia ('skill', 'tech', 'adv' ou 'spell'); null quando não há. */
  function styleFind(kind: string, item: string): {id: string; name: string} | null;
  /** De que catálogo são os itens de cada lista: para os links da página (STYLE_KINDS) e para a busca do formulário (STYLE_LIST_KIND). */
  var STYLE_KINDS: Record<string, string>;
  var STYLE_LIST_KIND: Record<string, string>;
  /** O nome da página de cada catálogo, as entradas que o formulário oferece e a linha de informação de cada uma. */
  var STYLE_KIND_PAGE: Record<string, string>;
  function styleKindList(kind: string): {id: string; name: string; specialty?: boolean}[];
  function styleKindInfo(kind: string, e: object): string;
  /** js/tabs/tab-combate.js: uma regra cinemática pelo id (ou a de uma entrada que mudou de página no livro) e o endereço dela. */
  function cinematicById(id: string | null | undefined): Cinematic | null;
  function cinematicHref(id: string): string;
  /** Os temas do filtro da aba Cinematic, na ordem, e o que ela lista: [valor, rótulo] (regras, perícias, técnicas ou tudo). */
  var CINEMATIC_CATEGORIES: string[];
  var CINEMATIC_KINDS: [string, string][];
  /** As perícias que os livros marcam como cinemáticas (*), sem as remissões. */
  function isCinematicSkill(s: Skill): boolean;
  /** js/tabs/ficha-efeitos.js: os efeitos que o livro dá a uma desvantagem para uma linha da ficha (o nome, os pontos e os níveis). */
  function disadvBookFx(d: Disadvantage, row: {name: string; cost: number; levels: number}): AdvEffect[];
  /** js/tabs/ficha-efeitos.js: os efeitos cadastrados de uma vantagem, limpos; e, sem eles, os do livro para uma linha da ficha (o nome e os pontos). */
  function advEffects(a: Advantage): AdvEffect[];
  function advBookFx(a: Advantage, row: {name: string; pts: number}): AdvEffect[];
  /** "+1 por nível (máx. +3) em ST · não acumula · só quando: …" */
  function advEffectText(e: AdvEffect): string;
  /** As vantagens que a ficha já aplica sozinha (Combat Reflexes, Magery, talentos…): efeitos cadastrados nelas não somam. */
  var ADV_FX_BUILTIN_RE: RegExp;
  /** Os alvos de um efeito, [valor, rótulo], e os campos de um alvo (atributos, defesas…); [] nos que levam nomes ou valem para todos. */
  var ADV_FX_TARGETS: [string, string][];
  function advFxKeys(target: string): [string, string][];
  /** Um efeito do formulário, com os campos como estão (os números e os nomes em texto), limpo; um efeito por nomes precisa de ao menos um. */
  function cleanAdvEffect(e: Partial<Record<keyof AdvEffect, unknown>>): AdvEffect;
  function advEffectOk(e: AdvEffect): boolean;

  /** js/mundo.js e as abas de js/tabs/: as operações que gravam no banco. */
  var Ops: {
    createMap(name: string, parentId: string | null, file: File, dims: {w: number; h: number}, visible: boolean, shared: string[]): Promise<string>;
    updateMap(id: string, name: string, parentId: string | null, visible: boolean, shared: string[]): Promise<unknown>;
    /** A imagem nova exclui todos os marcadores do mapa; com marcadores, só com confirmed. Resolve com quantos saíram. */
    replaceMapImage(id: string, file: File, dims: {w: number; h: number}, confirmed: boolean): Promise<number>;
    /** Os submapas, locais, personagens e organizações passam para o mapa pai; os marcadores são excluídos. */
    deleteMap(m: HMap): Promise<unknown>;
    saveEvent(
      ev: HEvent | null,
      fields: {name: string; date: string; description: string; locationId: string | null; characterIds: string[]; visible: boolean; sharedWith: string[]},
      newFile?: File | null,
      newDims?: {w: number; h: number} | null,
      removeImage?: boolean,
    ): Promise<string>;
    deleteEvent(ev: HEvent): Promise<unknown>;
    saveOrganization(
      o: Organization | null,
      fields: {name: string; description: string; reputation: string; members: Member[]; locationIds: string[]; mapIds: string[]; visible: boolean; sharedWith: string[]},
      newFile?: File | null,
      newDims?: {w: number; h: number} | null,
      removeImage?: boolean,
    ): Promise<string>;
    deleteOrganization(o: Organization): Promise<unknown>;
    /** second: a segunda imagem do local, com os mesmos campos da primeira. */
    saveLocation(
      loc: HLocation | null,
      fields: {name: string; description: string; characterIds: string[]; mapId: string | null; parentId: string | null; visible: boolean; sharedWith: string[]},
      newFile?: File | null,
      newDims?: {w: number; h: number} | null,
      removeImage?: boolean,
      second?: {file: File | null; dims: {w: number; h: number} | null; removed: boolean} | null,
    ): Promise<string>;
    /** Os sublocais sobem para o local de cima; marcadores, organizações e eventos perdem o vínculo. */
    deleteLocation(l: HLocation): Promise<unknown>;
    /** Os ids dos personagens escolhidos, criando os que ainda não existem (da Mesa ou nomes novos). */
    ensureCharacters(sel: {id?: string; name: string; source?: string; mesaId?: string | null}[], visible: boolean, shared: string[]): Promise<string[]>;
    /** locIds: os locais do personagem (o vínculo fica no local, em characterIds). */
    saveCharacter(
      c: Character | null,
      fields: {name: string; description: string; race: string; mapIds: string[]; relations: Relation[]; visible: boolean; sharedWith: string[]},
      newFile: File | null,
      newDims: {w: number; h: number} | null,
      removeImage: boolean,
      locIds: string[],
    ): Promise<string>;
    /** As organizações do personagem com os cargos; um nome novo (id null) vira uma organização. */
    setCharOrgs(charId: string, picks: {id: string | null; name?: string; text: string}[], visible: boolean, shared: string[]): Promise<unknown>;
    /** O personagem sai dos locais, das relações dos outros, das organizações e dos eventos. */
    deleteCharacter(c: Character): Promise<unknown>;
    /** A ficha do personagem (null: nenhuma); quem mais tinha essa ficha fica sem. */
    setCharSheet(charId: string, sheetId: string | null, justCreated?: boolean): Promise<unknown>;
    /** Só o Mestre. Numa magia dos livros, o documento com o id dela guarda as alterações; a fonte vazia fica "Manual". */
    saveSpell(
      s: Spell | null,
      fields: {
        name: string;
        college: string;
        class: string;
        difficulty: string;
        timeToCast: string;
        duration: string;
        initialCost: string;
        maintenanceCost: string;
        prerequisites: string;
        item: string;
        description: string;
        page: string;
        source: string;
        visible: boolean;
        sharedWith: string[];
      },
    ): Promise<string>;
    /** Uma magia dos livros fica marcada como excluída (o Mestre pode restaurá-la); a do Mestre sai do banco. */
    deleteSpell(s: Spell): Promise<unknown>;
    /** Desfaz as alterações do Mestre numa entrada dos livros: ela volta como no livro. */
    restoreCatalogItem(col: string, item: Doc): Promise<unknown>;
    /** Só o Mestre. O tipo vazio fica "Vantagem"; os efeitos são limpos, e os que precisam de nomes e não têm saem. */
    saveAdvantage(
      a: Advantage | null,
      fields: {name: string; cost: string; type: string; book: string; page: string; description: string; effects: AdvEffect[]; visible: boolean; sharedWith: string[]},
    ): Promise<string>;
    /** Uma vantagem dos livros fica marcada como excluída; a do Mestre sai do banco. */
    deleteAdvantage(a: Advantage): Promise<unknown>;
    /** Só o Mestre. O tipo vazio fica "Disadvantage"; classes: as marcadas, separadas por vírgula. */
    saveDisadvantage(
      d: Disadvantage | null,
      fields: {name: string; cost: string; type: string; classes: string; selfControl: boolean; book: string; page: string; description: string; visible: boolean; sharedWith: string[]},
    ): Promise<string>;
    /** Uma desvantagem dos livros fica marcada como excluída; a do Mestre sai do banco. */
    deleteDisadvantage(d: Disadvantage): Promise<unknown>;
    /** Só o Mestre. O tipo segue o atributo, a dificuldade e o grupo de combate ("Melee; DX/Average"); sem eles, a entrada fica com o dela. */
    saveSkill(
      s: Skill | null,
      fields: {
        name: string;
        attribute: string;
        difficulty: string;
        combatGroup: string;
        defaults: string;
        prerequisites: string;
        specialty: boolean;
        cinematic: boolean;
        book: string;
        page: string;
        description: string;
        modifiers: string;
        visible: boolean;
        sharedWith: string[];
      },
    ): Promise<string>;
    /** Uma perícia dos livros fica marcada como excluída; a do Mestre sai do banco. */
    deleteSkill(s: Skill): Promise<unknown>;
    /** Só o Mestre. */
    saveTechnique(
      t: Technique | null,
      fields: {name: string; difficulty: string; cinematic: boolean; defaults: string; prerequisites: string; book: string; page: string; description: string; modifiers: string; visible: boolean; sharedWith: string[]},
    ): Promise<string>;
    /** Uma técnica dos livros fica marcada como excluída; a do Mestre sai do banco. */
    deleteTechnique(t: Technique): Promise<unknown>;
    /** Só o Mestre. As listas vão como no livro, com os itens separados por "; ". */
    saveStyle(
      x: FightingStyle | null,
      fields: {name: string; cost: string; book: string; page: string; description: string; visible: boolean; sharedWith: string[]} & Record<StyleList, string>,
    ): Promise<string>;
    /** Um estilo dos livros fica marcado como excluído; o do Mestre sai do banco. */
    deleteStyle(x: FightingStyle): Promise<unknown>;
    /** Só o Mestre: uma regra cinemática (a aba Cinematic de Combate). */
    saveCinematic(
      x: Cinematic | null,
      fields: {name: string; category: string; section: string; description: string; book: string; page: string; visible: boolean; sharedWith: string[]},
    ): Promise<string>;
    /** Uma regra cinemática dos livros fica marcada como excluída; a do Mestre sai do banco. */
    deleteCinematic(x: Cinematic): Promise<unknown>;
    /** Só o Mestre. attacks: as linhas da tabela, cada uma com os campos preenchidos. */
    saveWeapon(
      w: Weapon | null,
      fields: {name: string; type: string; tl: string; cost: string; weight: string; lc: string; table: string; book: string; page: string; description: string; footnotes: string; attacks: WeaponAttack[]; visible: boolean; sharedWith: string[]},
    ): Promise<string>;
    /** Uma arma dos livros fica marcada como excluída; a do Mestre sai do banco. */
    deleteWeapon(w: Weapon): Promise<unknown>;
    /** Só o Mestre. O tipo é Armor ou Shield; os campos vão como texto. */
    saveArmor(a: Armor | null, fields: {name: string; type: string; notes: string; footnotes: string; visible: boolean; sharedWith: string[]} & Record<ArmorField, string>): Promise<string>;
    /** Uma armadura dos livros fica marcada como excluída; a do Mestre sai do banco. */
    deleteArmor(a: Armor): Promise<unknown>;
    /** Só o Mestre. */
    saveItem(x: GearItem | null, fields: {name: string; description: string; visible: boolean; sharedWith: string[]} & Record<ItemField, string>): Promise<string>;
    /** Um item dos livros fica marcado como excluído; o do Mestre sai do banco. */
    deleteItem(x: GearItem): Promise<unknown>;
    /** Só o Mestre. */
    saveImprovement(x: Improvement | null, fields: {name: string; description: string; visible: boolean; sharedWith: string[]} & Record<ImprovementField, string>): Promise<string>;
    /** Um melhoramento dos livros fica marcado como excluído; o do Mestre sai do banco. */
    deleteImprovement(x: Improvement): Promise<unknown>;
  };

  /** js/pagina.js: se o usuário pode gravar (banco conectado e permissão). */
  function canWrite(): boolean;
  /** js/pagina.js: o aviso do topo das páginas (só neste navegador, ou só leitura); '' quando não há. */
  function noticeText(): string;

  /** js/tabs/tab-usuarios.js: os perfis, na ordem em que a lista de usuários os mostra. */
  var ROLES: {id: string; label: string; help: string}[];
  function isMestre(): boolean;
  function roleId(role: string): string;
  function roleLabel(role: string): string;
  /** O Mestre e o Admin gerenciam usuários; o Admin não edita nem exclui um Mestre. */
  function canManageUsers(): boolean;
  function canManageUser(u: HubUser): boolean;
  /** Com o Supabase, cada pessoa entra com email e senha; com as contas, o Mestre as cria pelo hub. */
  function usersLogin(): boolean;
  function usersAccounts(): boolean;
}
