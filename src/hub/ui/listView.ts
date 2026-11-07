import {useEffect, useMemo, useRef, useState, type RefObject} from 'react';
import {useHub} from '../data';
import {usePageJump} from './Pager';

/** O que uma lista dos catálogos guarda: a busca, a página e os filtros dela. */
export type ListView = {q: string; page: number};
type Col = keyof World['loaded'];

/**
 * A busca, os filtros e a página de uma lista longa dos catálogos (Magias, Vantagens…), como nas versões antigas: ficam
 * em view, um objeto do módulo da página, enquanto o site está aberto, então abrir uma entrada e voltar devolve à mesma
 * página. A lista segue o campo de busca (typed) 150 ms depois da última tecla, e um filtro novo volta à primeira
 * página. find dá as entradas com a vista, refeitas só quando ela ou os dados mudam; box é o topo da lista, que vem
 * para a tela ao trocar de página (toPage). col: a coleção da lista, ou a de cada vista (as abas de Combate); load: os
 * catálogos que a página busca ao abrir, quando não são só o dela.
 */
export function useListView<V extends ListView, T>(col: Col | ((v: V) => Col), view: V, find: (v: V) => T[], box: RefObject<HTMLElement | null>, load?: Col[]) {
  const {W, version} = useHub();
  const [v, setV] = useState<V>(() => ({...view}));
  const loaded = W.loaded[typeof col === 'function' ? col(v) : col];
  const [typed, setTyped] = useState(view.q);
  const timer = useRef(0);
  const toPage = usePageJump(box, page => setV(cur => ({...cur, page})));
  const all = useMemo(() => (loaded ? find(v) : []), [v, version, loaded]);
  const pg = pageOf(all, v.page);

  useEffect(() => {
    (load || [typeof col === 'function' ? col(v) : col]).forEach(c => loadCatalog(c));
    return () => clearTimeout(timer.current);
  }, []);
  // A página guardada é a mostrada, dentro das que existem.
  useEffect(() => {
    Object.assign(view, v, {q: typed}, loaded ? {page: pg.page} : null);
  });

  const filter = (p: Partial<V>) => setV(cur => ({...cur, ...p, page: 1}));
  function search(q: string) {
    setTyped(q);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => filter({q} as Partial<V>), 150);
  }
  return {v, typed, loaded, all, pg, filter, search, toPage};
}
