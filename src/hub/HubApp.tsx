import {useLayoutEffect, useState, useSyncExternalStore} from 'react';
import {createPortal} from 'react-dom';
import {DialogHost} from './ui/Dialog';
import {PAGES, WIDE_PAGES} from './pages';

// O endereço é a fonte da rota, nos formatos de sempre (#ficha~id, #map~id~explorar…), porque há links
// gravados em anotações e personagens. O go() de js/rotas.js redesenha o mesmo endereço ou o troca com
// replaceState, sem hashchange, e avisa com o evento hub:route; o contador faz esse aviso valer como mudança.
let version = 0;

function subscribe(onChange: () => void) {
  const bump = () => {
    version++;
    onChange();
  };
  window.addEventListener('hashchange', bump);
  window.addEventListener('hub:route', bump);
  return () => {
    window.removeEventListener('hashchange', bump);
    window.removeEventListener('hub:route', bump);
  };
}

const snapshot = () => `${version}${location.hash}`;

export function HubApp() {
  const current = useSyncExternalStore(subscribe, snapshot);
  const [, setMenuReady] = useState('');
  const route: Route = parseRoute() ?? {page: 'home', node: null};
  const Page = PAGES[route.page];

  // Antes da pintura: mostra o contêiner certo e deixa o js/app.js aplicar a rota (menu, título, telas e,
  // nas páginas antigas, o desenho).
  useLayoutEffect(() => {
    const react = document.getElementById('reactPage')!;
    document.getElementById('pageRoot')!.hidden = !!Page;
    react.hidden = !Page;
    react.classList.toggle('wide', WIDE_PAGES.has(route.page));
    const missing = !!route.node && !byId[route.node];
    onRoute();
    // Um item que o menu só lista quando está aberto (uma magia) entra nele no onRoute, depois de a página desenhar: ela
    // desenha de novo, ainda antes da pintura, para ter a trilha (Crumbs).
    if (missing && byId[route.node!]) setMenuReady(current);
  }, [current]);

  // A chave remonta a página a cada item (de um evento para outro, por exemplo): o estado de interface dela
  // (busca, confirmações, caixas abertas) recomeça, como o S.ui das páginas antigas (onRoute em js/app.js).
  return (
    <>
      {Page ? createPortal(<Page key={route.node || route.page} route={route} />, document.getElementById('reactPage')!) : null}
      <DialogHost />
    </>
  );
}
