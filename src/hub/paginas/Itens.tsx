import {useMemo, useRef} from 'react';
import {useHub} from '../data';
import {Crumbs} from '../ui/Crumbs';
import {openDialog} from '../ui/Dialog';
import {Icon} from '../ui/Icon';
import {useListView} from '../ui/listView';
import {MestreOnly} from '../ui/MestreOnly';
import {PageCount, Pager} from '../ui/Pager';
import {ItemForm} from './ItemForm';

// Os campos em que a busca procura o texto (o nome, também em português, conta mais; js/busca-catalogos.js).
const SEARCH_FIELDS = ['name', 'category', 'cost', 'description'];
// Busca, filtros e página da lista, guardados enquanto o site está aberto (useListView).
const view = {q: '', mine: false, category: '', book: '', page: 1};
type ItemView = typeof view;

// Os itens com os filtros e a busca: na ordem do nome e, com uma busca, os mais parecidos primeiro.
function filterItems(v: ItemView) {
  return searchCatalog(
    (W.items || []).filter(x => {
      if (v.category && x.category !== v.category) return false;
      if (v.book && x.book !== v.book) return false;
      if (v.mine && x.catalog) return false;
      return true;
    }),
    v.q,
    x => searchText(x, SEARCH_FIELDS),
  );
}

// Página Itens (#itens): os equipamentos dos livros (até TL4, sem as armas e as armaduras) com os do Mestre, em cartões,
// com busca, filtros e páginas. As mesmas classes da versão antiga (css/paginas.css); os dados e as funções de item
// continuam em js/tabs/tab-itens.js.
export function ItemsPage() {
  const {W, version} = useHub();
  const results = useRef<HTMLDivElement>(null);
  const {v, typed, loaded, all, pg, filter, search, toPage} = useListView('items', view, filterItems, results);
  const can = isMestre(), warning = noticeText();
  const options = useMemo(() => ({categories: itemValues('category'), books: itemValues('book')}), [version]);

  function list() {
    if (!loaded) return <p className="lede">Carregando itens…</p>;
    if (!all.length) {
      if (!(W.items || []).length) {
        return (
          <div className="empty-state">
            <Icon paths={ICON.item} size={34} stroke={1.6} />
            <strong>Nenhum item cadastrado</strong>
            <span>
              {CATALOG.items.failed ? (
                'Não foi possível carregar a lista dos livros.'
              ) : can ? (
                <>
                  Crie um com <b>Novo item</b>.
                </>
              ) : (
                'Os itens vão aparecer aqui.'
              )}
            </span>
          </div>
        );
      }
      return (
        <p className="lede" style={{padding: '24px 0'}}>
          Nenhum item corresponde aos filtros aplicados.
        </p>
      );
    }
    return (
      <>
        <div className="list-bar">
          <span className="meta">
            <PageCount pg={pg} total={all.length} one="item" many="itens" />
          </span>
          <Pager pg={pg} onPage={toPage} />
        </div>
        <div className="adv-grid">
          {pg.items.map(x => (
            <ItemCard x={x} key={x.id} />
          ))}
        </div>
        {pg.pages > 1 ? (
          <div className="list-bar end">
            <Pager pg={pg} onPage={toPage} />
          </div>
        ) : null}
      </>
    );
  }

  return (
    <>
      <Crumbs node="items" />
      <div className="head-row">
        <div>
          <h1>
            <Icon paths={ICON.item} size={24} stroke={2} />
            {' Itens'}
          </h1>
          <p className="lede">Equipamentos, ferramentas, poções e tesouros para GURPS 4ª Edição.</p>
        </div>
        {can ? (
          <div className="btn-row">
            <button className="btn primary" type="button" id="newItemBtn" onClick={() => openDialog(<ItemForm x={null} />)}>
              <Icon paths={ICON.plus} size={16} stroke={2.4} />
              Novo item
            </button>
          </div>
        ) : null}
      </div>
      <div className="toolbar" style={{marginBottom: 16}}>
        <input
          className="search list-search"
          type="search"
          id="itemSearch"
          placeholder="Buscar por nome, categoria ou descrição…"
          value={typed}
          autoComplete="off"
          aria-label="Buscar itens"
          onChange={e => search(e.target.value)}
        />
        <div className="field" style={{margin: 0}}>
          <select id="itemCatFilter" aria-label="Filtrar por categoria" value={v.category} onChange={e => filter({category: e.target.value})}>
            <option value="">Todas as categorias</option>
            {options.categories.map(c => (
              <option value={c} key={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{margin: 0}}>
          <select id="itemBookFilter" aria-label="Filtrar por livro" value={v.book} onChange={e => filter({book: e.target.value})}>
            <option value="">Todos os livros</option>
            {options.books.map(b => (
              <option value={b} key={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <MestreOnly on={v.mine} onChange={mine => filter({mine})} />
      </div>
      {warning ? <p className="notice">{warning}</p> : null}
      <div id="itemResults" ref={results}>
        {list()}
      </div>
    </>
  );
}

function ItemCard({x}: {x: GearItem}) {
  const tags = [x.weight, x.tl ? 'TL ' + x.tl : ''].filter(Boolean).join(' · ');
  return (
    <a className="spell-card adv-card" href={itemHref(x.id)}>
      <div className="adv-card-top">
        <strong>{x.name}</strong>
        {x.cost ? <span className="spell-badge adv-adv">{x.cost}</span> : null}
      </div>
      {tags ? <div className="adv-cost">{tags}</div> : null}
      {x.description ? <div className="adv-desc">{x.description}</div> : null}
      <div className="adv-src">{[x.category, x.book, x.page ? 'p. ' + x.page : ''].filter(Boolean).join(' · ')}</div>
    </a>
  );
}
