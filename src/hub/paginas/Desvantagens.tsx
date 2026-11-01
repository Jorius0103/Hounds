import {useMemo, useRef} from 'react';
import {useHub} from '../data';
import {Crumbs} from '../ui/Crumbs';
import {openDialog} from '../ui/Dialog';
import {Icon} from '../ui/Icon';
import {useListView} from '../ui/listView';
import {MestreOnly} from '../ui/MestreOnly';
import {PageCount, Pager} from '../ui/Pager';
import {DisadvForm} from './DesvantagemForm';

// Os campos em que a busca procura o texto (o nome, também em português, conta mais; js/busca-catalogos.js).
const SEARCH_FIELDS = ['name', 'cost', 'type', 'classes', 'description'];
// Busca, filtros e página da lista, guardados enquanto o site está aberto (useListView).
const view = {q: '', mine: false, type: '', cls: '', book: '', self: false, page: 1};
type DisadvView = typeof view;

// As desvantagens com os filtros e a busca: na ordem do nome e, com uma busca, as mais parecidas primeiro.
function filterDisadvs(v: DisadvView) {
  return searchCatalog(
    (W.disadvantages || []).filter(d => {
      if (v.type && d.type !== v.type) return false;
      if (v.cls && disadvClassList(d).indexOf(v.cls) < 0) return false;
      if (v.book && d.book !== v.book) return false;
      if (v.mine && d.catalog) return false;
      if (v.self && !d.selfControl) return false;
      return true;
    }),
    v.q,
    d => searchText(d, SEARCH_FIELDS),
  );
}

// Página Desvantagens (#desvantagens): as dos livros com as do Mestre, em cartões, com busca, filtros e páginas. As mesmas
// classes da versão antiga (css/paginas.css); os dados e as funções de desvantagem continuam em js/tabs/tab-desvantagens.js.
export function DisadvantagesPage() {
  const {W, version} = useHub();
  const results = useRef<HTMLDivElement>(null);
  const {v, typed, loaded, all, pg, filter, search, toPage} = useListView('disadvantages', view, filterDisadvs, results);
  const can = isMestre(), warning = noticeText();
  const options = useMemo(() => ({types: disadvValues('type'), books: disadvValues('book')}), [version]);

  function list() {
    if (!loaded) return <p className="lede">Carregando desvantagens…</p>;
    if (!all.length) {
      if (!(W.disadvantages || []).length) {
        return (
          <div className="empty-state">
            <Icon paths={ICON.disadvantage} size={34} stroke={1.6} />
            <strong>Nenhuma desvantagem cadastrada</strong>
            <span>
              {CATALOG.disadvantages.failed ? (
                'Não foi possível carregar a lista dos livros.'
              ) : can ? (
                <>
                  Crie uma com <b>Nova desvantagem</b>.
                </>
              ) : (
                'As desvantagens vão aparecer aqui.'
              )}
            </span>
          </div>
        );
      }
      return (
        <p className="lede" style={{padding: '24px 0'}}>
          Nenhuma desvantagem corresponde aos filtros aplicados.
        </p>
      );
    }
    return (
      <>
        <div className="list-bar">
          <span className="meta">
            <PageCount pg={pg} total={all.length} one="desvantagem" many="desvantagens" />
          </span>
          <Pager pg={pg} onPage={toPage} />
        </div>
        <div className="adv-grid">
          {pg.items.map(d => (
            <DisadvCard d={d} key={d.id} />
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
      <Crumbs node="disadvs" />
      <div className="head-row">
        <div>
          <h1>
            <Icon paths={ICON.disadvantage} size={24} stroke={2} />
            {' Desvantagens'}
          </h1>
          <p className="lede">Desvantagens para GURPS 4ª Edição.</p>
        </div>
        {can ? (
          <div className="btn-row">
            <button className="btn primary" type="button" id="newDisadvBtn" onClick={() => openDialog(<DisadvForm d={null} />)}>
              <Icon paths={ICON.plus} size={16} stroke={2.4} />
              Nova desvantagem
            </button>
          </div>
        ) : null}
      </div>
      <div className="toolbar" style={{marginBottom: 16}}>
        <input
          className="search list-search"
          type="search"
          id="disadvSearch"
          placeholder="Buscar por nome, custo ou descrição…"
          value={typed}
          autoComplete="off"
          aria-label="Buscar desvantagens"
          onChange={e => search(e.target.value)}
        />
        <div className="field" style={{margin: 0}}>
          <select id="disadvTypeFilter" aria-label="Filtrar por tipo" value={v.type} onChange={e => filter({type: e.target.value})}>
            <option value="">Todos os tipos</option>
            {options.types.map(t => (
              <option value={t} key={t}>
                {disadvTypeLabel(t)}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{margin: 0}}>
          <select id="disadvClassFilter" aria-label="Filtrar por classe" value={v.cls} onChange={e => filter({cls: e.target.value})}>
            <option value="">Todas as classes</option>
            {DISADV_CLASSES.map(c => (
              <option value={c} key={c}>
                {DISADV_CLASS_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{margin: 0}}>
          <select id="disadvBookFilter" aria-label="Filtrar por livro" value={v.book} onChange={e => filter({book: e.target.value})}>
            <option value="">Todos os livros</option>
            {options.books.map(b => (
              <option value={b} key={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <label className="vis-flag" htmlFor="disadvSelfFilter" style={{padding: '8px 12px'}}>
          <input type="checkbox" id="disadvSelfFilter" checked={v.self} onChange={e => filter({self: e.target.checked})} />
          <span>
            <b>Com autocontrole</b>
          </span>
        </label>
        <MestreOnly on={v.mine} onChange={mine => filter({mine})} />
      </div>
      {warning ? <p className="notice">{warning}</p> : null}
      <div id="disadvResults" ref={results}>
        {list()}
      </div>
    </>
  );
}

function DisadvCard({d}: {d: Disadvantage}) {
  const tags = [d.cost, disadvClassText(d), d.selfControl ? 'autocontrole' : ''].filter(Boolean).join(' · ');
  return (
    <a className="spell-card adv-card" href={disadvHref(d.id)}>
      <div className="adv-card-top">
        <strong>{d.name}</strong>
        <span className={'spell-badge ' + disadvTypeClass(d.type)}>{disadvTypeLabel(d.type)}</span>
      </div>
      {tags ? <div className="adv-cost">{tags}</div> : null}
      {d.description ? <div className="adv-desc">{d.description}</div> : null}
      <div className="adv-src">{[d.book, d.page ? 'p. ' + d.page : ''].filter(Boolean).join(' · ')}</div>
    </a>
  );
}
