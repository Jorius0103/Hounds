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
}
