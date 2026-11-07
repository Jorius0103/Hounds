import {useLayoutEffect, useRef, type ReactNode, type RefObject} from 'react';

/** Uma página de uma lista longa, como o pageOf de js/pagina.js a devolve. */
export type PageSlice = {page: number; pages: number; from: number; items: unknown[]};

/** "31–60 de 1.161 magias", como o pageCountText de js/pagina.js; nada com a lista vazia. */
export function PageCount({pg, total, one, many}: {pg: PageSlice; total: number; one: string; many: string}) {
  if (!total) return null;
  return (
    <>
      <b>{pg.from + 1 + '–' + (pg.from + pg.items.length)}</b> de <b>{total.toLocaleString('pt-BR')}</b> {total === 1 ? one : many}
    </>
  );
}

/** Anterior, próxima, a primeira e a última página e duas de cada lado da atual, como o pagerHtml de js/pagina.js. */
export function Pager({pg, onPage}: {pg: PageSlice; onPage: (n: number) => void}) {
  if (pg.pages <= 1) return null;
  const btn = (n: number, label: string, aria: string, off: boolean, key: string | number) => (
    <button type="button" className="pager-btn" data-page={n} aria-label={aria} disabled={off} key={key} onClick={() => onPage(n)}>
      {label}
    </button>
  );
  const out: ReactNode[] = [btn(pg.page - 1, '‹', 'Página anterior', pg.page === 1, 'prev')];
  let last = 0;
  for (let i = 1; i <= pg.pages; i++) {
    if (i !== 1 && i !== pg.pages && Math.abs(i - pg.page) > 2) continue;
    if (last && i - last > 1) {
      out.push(
        <span className="pager-gap" aria-hidden="true" key={'gap' + i}>
          …
        </span>,
      );
    }
    out.push(
      i === pg.page ? (
        <span className="pager-cur" aria-current="page" key={i}>
          {i}
        </span>
      ) : (
        btn(i, String(i), 'Página ' + i, false, i)
      ),
    );
    last = i;
  }
  out.push(btn(pg.page + 1, '›', 'Próxima página', pg.page === pg.pages, 'next'));
  return (
    <nav className="pager" aria-label="Páginas">
      {out}
    </nav>
  );
}

/**
 * Trocar de página pelos botões, como o wirePager de js/pagina.js: depois de desenhar a página nova, o topo da lista
 * (box) vem para a tela e o foco vai para o número da página atual. Devolve a função para o onPage do Pager.
 */
export function usePageJump(box: RefObject<HTMLElement | null>, setPage: (n: number) => void) {
  const pending = useRef(false);
  useLayoutEffect(() => {
    const root = box.current;
    if (!pending.current) {
      // Desenhada por outro motivo (um filtro, uma aba, os dados): como a versão antiga, que redesenhava a lista, o
      // número da página deixa de receber o foco.
      root?.querySelectorAll('.pager-cur[tabindex]').forEach(el => el.removeAttribute('tabindex'));
      return;
    }
    pending.current = false;
    if (!root) return;
    root.scrollIntoView({block: 'start'});
    const cur = root.querySelector('.pager-cur');
    if (cur instanceof HTMLElement) {
      cur.tabIndex = -1;
      cur.focus({preventScroll: true});
    }
  });
  return (n: number) => {
    pending.current = true;
    setPage(n);
  };
}
