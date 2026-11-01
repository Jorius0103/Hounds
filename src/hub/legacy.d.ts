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
