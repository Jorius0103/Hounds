import {useSyncExternalStore} from 'react';

// Os dados continuam nos globais W e S (js/mundo.js, js/pagina.js), que o js/app.js alimenta com o banco e
// troca no lugar. Cada aviso abaixo aumenta a versão, e os componentes que usam useHub() redesenham:
//   hub:data  — uma coleção chegou ou mudou (onData de js/app.js; detail: 'maps', 'notes', 'spells'…)
//   hub:users — a lista de usuários (onUsers de js/tabs/tab-usuarios.js)
//   hub:user  — quem está usando o hub (js/gate.js); as listas visíveis de W já vêm refiltradas
let version = 0;
const listeners = new Set<() => void>();

for (const name of ['hub:data', 'hub:users', 'hub:user']) {
  window.addEventListener(name, () => {
    version++;
    listeners.forEach(notify => notify());
  });
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
}

const getVersion = () => version;

/**
 * Os dados do hub para um componente React, que redesenha quando eles mudam. W e S são sempre os mesmos
 * objetos (mudam por dentro); `version` muda a cada aviso, para usar em dependências de useMemo/useEffect.
 */
export function useHub() {
  const current = useSyncExternalStore(subscribe, getVersion);
  return {W, S, user: window.hubUser, version: current};
}
