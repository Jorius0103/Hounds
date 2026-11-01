import type {ReactNode} from 'react';
import {Icon} from './Icon';
import {ImageSlot} from './ImageSlot';

// As árvores de mapas, que antes eram o mapRow, o fullTree e o pathTree de js/pagina.js.

/** Uma linha da árvore: a miniatura, o nome e quantos submapas e locais o mapa tem. here marca o aberto. */
export function MapRow({m, here = false}: {m: HMap; here?: boolean}) {
  const k = childMaps(m.id).length, L = mapLocations(m.id).length;
  const meta = [k ? plural(k, 'submapa', 'submapas') : '', L ? plural(L, 'local', 'locais') : ''].filter(Boolean).join(' · ');
  return (
    <a className={'mrow' + (here ? ' here' : '')} href={mapHref(m.id)} aria-current={here ? 'page' : undefined}>
      <ImageSlot className="mthumb" imgRef={m.image && m.image.ref}>
        <Icon paths={ICON.map} size={16} stroke={1.8} />
      </ImageSlot>
      <span className="mtext">
        <b>{m.name}</b>
        {meta ? <span className="meta">{meta}</span> : null}
      </span>
    </a>
  );
}

/**
 * Os mapas dentro de parent (null: todos), em todos os níveis: cada um num <li>, com os de dentro num <ul>.
 * bare: sem o <ul> de fora, os <li> direto na caixa (a árvore de todos os mapas).
 */
export function FullTree({parent, bare = false}: {parent: string | null; bare?: boolean}) {
  const list = childMaps(parent);
  if (!list.length) return null;
  const items = list.map(m => (
    <li key={m.id}>
      <MapRow m={m} />
      <FullTree parent={m.id} />
    </li>
  ));
  return bare ? <>{items}</> : <ul>{items}</ul>;
}

/**
 * Uma cadeia de mapas do nível superior para baixo: cada mapa num <li>, com o seguinte num <ul> dentro dele; o
 * primeiro vai direto na caixa, sem <ul>, como na versão antiga.
 *   leaf: termina num local (a página do local) · markLast: marca o último mapa como o aberto · kids: mostra os
 *   submapas do último (a página do mapa)
 */
export function PathTree({chain, leaf = null, markLast = false, kids = false}: {chain: HMap[]; leaf?: HLocation | null; markLast?: boolean; kids?: boolean}) {
  function item(i: number): ReactNode {
    if (i >= chain.length) {
      return leaf ? (
        <li>
          <span className="mrow here">
            <ImageSlot className="mthumb" imgRef={leaf.image && leaf.image.ref}>
              <Icon paths={ICON.pin} size={16} stroke={1.8} />
            </ImageSlot>
            <span className="mtext">
              <span className="lvl">Local</span>
              <b>{leaf.name}</b>
            </span>
          </span>
        </li>
      ) : null;
    }
    const m = chain[i], last = i === chain.length - 1, next = item(i + 1), sub = last && kids ? childMaps(m.id) : [];
    return (
      <li>
        <MapRow m={m} here={last && markLast} />
        {next ? <ul>{next}</ul> : null}
        {sub.length ? (
          <ul>
            {sub.map(c => (
              <li key={c.id}>
                <MapRow m={c} />
              </li>
            ))}
          </ul>
        ) : null}
      </li>
    );
  }
  return <div className="mtree path-tree">{item(0)}</div>;
}
