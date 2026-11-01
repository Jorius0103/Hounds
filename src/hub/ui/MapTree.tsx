import type {ReactNode} from 'react';
import {Icon} from './Icon';
import {ImageSlot} from './ImageSlot';

/** Uma linha da árvore de mapas, como o mapRow de js/pagina.js: a miniatura, o nome e quantos submapas e locais tem. here marca o aberto. */
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
 * Uma cadeia de mapas do nível superior para baixo, terminando num local (leaf), como o pathTree de js/pagina.js
 * com { leaf }. Cada mapa fica num <li>, com o seguinte num <ul> dentro dele; o primeiro vai direto na caixa, sem
 * <ul>, como na versão antiga. As outras opções do pathTree (markLast e kids) são da página de mapa, ainda antiga.
 */
export function PathTree({chain, leaf}: {chain: HMap[]; leaf: HLocation}) {
  function item(i: number): ReactNode {
    if (i >= chain.length) {
      return (
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
      );
    }
    return (
      <li>
        <MapRow m={chain[i]} />
        <ul>{item(i + 1)}</ul>
      </li>
    );
  }
  return <div className="mtree path-tree">{item(0)}</div>;
}
