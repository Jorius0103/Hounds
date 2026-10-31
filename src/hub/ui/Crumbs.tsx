import {Fragment} from 'react';

// A trilha do topo das páginas (Mundo / Eventos / Batalha…), como o crumbsHtml de js/pagina.js: os ancestrais
// do item no menu (js/menu.js), com link quando são páginas, e o próprio item em negrito.
export function Crumbs({node}: {node: string}) {
  return (
    <div className="crumbs">
      {ancestors(node).map(p => (
        <Fragment key={p}>
          {byId[p].route ? <a href={hrefFor(p)}>{byId[p].label}</a> : <span>{byId[p].label}</span>}
          <span aria-hidden="true">/</span>
        </Fragment>
      ))}
      <b>{byId[node] ? byId[node].label : ''}</b>
    </div>
  );
}
