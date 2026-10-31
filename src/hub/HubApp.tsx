import {useLayoutEffect, useSyncExternalStore} from 'react';
import {createPortal} from 'react-dom';
import {PAGES} from './pages';

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
  const route = parseRoute() ?? {page: 'home', node: null};
  const Page = PAGES[route.page];

  // Antes da pintura: mostra o contêiner certo e deixa o js/app.js aplicar a rota (menu, título, telas e,
  // nas páginas antigas, o desenho).
  useLayoutEffect(() => {
    document.getElementById('pageRoot')!.hidden = !!Page;
    document.getElementById('reactPage')!.hidden = !Page;
    onRoute();
  }, [current]);

  return Page ? createPortal(<Page route={route} />, document.getElementById('reactPage')!) : null;
}
