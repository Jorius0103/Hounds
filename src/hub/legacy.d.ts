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

  /** js/utils.js: os desenhos dos ícones (o miolo de um <svg>; veja src/hub/Icon.tsx). */
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

  /** js/modal.js: o modal aberto, antigo ou React (src/hub/Dialog.tsx); null quando não há. */
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
  /** Muda um item dos catálogos dos livros: o primeiro ajuste cria o documento no banco. */
  function patchCatalogItem(col: string, item: Doc, p: object): Promise<unknown>;
  /** Os olhos dos botões de visibilidade (js/mundo.js e js/app.js). */
  var EYE_OFF: string;
  var EYE_ON: string;

  /** js/mundo.js: locais (em árvore) e mapas. */
  function locById(id: string): HLocation | null;
  function childLocs(id: string | null): HLocation[];
  function locPathText(id: string): string;
  function locMapId(l: HLocation): string | null;
  function mapPathText(id: string): string;
  /** js/rotas.js */
  function locHref(id: string): string;

  /** js/tabs/tab-personagens.js */
  function charById(id: string): Character | null;
  function charHref(id: string): string;
  /** A raça e as organizações do personagem, numa linha. */
  function charSubtitle(c: Character): string;

  /** js/tabs/tab-eventos.js */
  function eventById(id: string | null | undefined): HEvent | null;
  function eventHref(id: string): string;
  function eventChars(ev: HEvent): Character[];
  function eventLoc(ev: HEvent): HLocation | null;

  /** js/mundo.js e as abas de js/tabs/: as operações que gravam no banco. */
  var Ops: {
    saveEvent(
      ev: HEvent | null,
      fields: {name: string; date: string; description: string; locationId: string | null; characterIds: string[]; visible: boolean; sharedWith: string[]},
      newFile?: File | null,
      newDims?: {w: number; h: number} | null,
      removeImage?: boolean,
    ): Promise<string>;
    deleteEvent(ev: HEvent): Promise<unknown>;
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
