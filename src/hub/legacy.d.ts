// O que a casca React usa dos scripts clássicos de js/ (funções globais, carregadas antes pelo index.html).
// Os tipos completos desses scripts ficam em types/ (jsconfig.json), fora da checagem do src/.

export {};

declare global {
  /** Uma rota do hub, como o parseRoute de js/rotas.js a devolve: a página e os ids do endereço. */
  interface HubRoute {
    page: string;
    node: string | null;
    [key: string]: unknown;
  }

  /** js/rotas.js: lê o endereço atual (#ficha~id…); null quando não é uma rota conhecida. */
  function parseRoute(): HubRoute | null;
  /** js/app.js: aplica o endereço atual ao menu, ao título e às telas, e desenha a página antiga. */
  function onRoute(): void;

  interface Window {
    hubIsReactPage?(page: string): boolean;
  }
}
