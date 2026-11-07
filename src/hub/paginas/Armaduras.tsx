import {useMemo, useRef} from 'react';
import {useHub} from '../data';
import {Crumbs} from '../ui/Crumbs';
import {openDialog} from '../ui/Dialog';
import {Icon} from '../ui/Icon';
import {useListView} from '../ui/listView';
import {MestreOnly} from '../ui/MestreOnly';
import {PageCount, Pager} from '../ui/Pager';
import {ArmorForm} from './ArmaduraForm';

// Os campos em que a busca procura o texto (o nome, também em português, conta mais; js/busca-catalogos.js).
const SEARCH_FIELDS = ['name', 'location', 'category', 'table', 'skill', 'notes', 'footnotes'];
// Busca, filtros e página da lista, guardados enquanto o site está aberto (useListView).
const view = {q: '', mine: false, type: '', category: '', book: '', page: 1};
type ArmorView = typeof view;

// As armaduras e os escudos com os filtros e a busca: na ordem do nome e, com uma busca, os mais parecidos primeiro.
function filterArmors(v: ArmorView) {
  return searchCatalog(
    (W.armors || []).filter(a => {
      if (v.type && a.type !== v.type) return false;
      if (v.category && a.category !== v.category) return false;
      if (v.book && a.book !== v.book) return false;
      if (v.mine && a.catalog) return false;
      return true;
    }),
    v.q,
    a => searchText(a, SEARCH_FIELDS),
  );
}

/** O selo do tipo (armadura ou escudo), como o armorBadge de js/tabs/tab-armaduras.js. */
export function ArmorBadge({a}: {a: Armor}) {
  return <span className={'spell-badge ' + (a.type === 'Shield' ? 'adv-perk' : 'adv-exp')}>{armorTypeLabel(a.type)}</span>;
}

// Página Armaduras (#armaduras): as armaduras e os escudos das tabelas dos livros (até TL4) com os do Mestre, em cartões,
// com busca, filtros e páginas. As mesmas classes da versão antiga (css/paginas.css); os dados e as funções continuam em
// js/tabs/tab-armaduras.js.
export function ArmorsPage() {
  const {W, version} = useHub();
  const results = useRef<HTMLDivElement>(null);
  const {v, typed, loaded, all, pg, filter, search, toPage} = useListView('armors', view, filterArmors, results);
  const can = isMestre(), warning = noticeText();
  const options = useMemo(() => ({categories: armorValues('category'), books: armorValues('book')}), [version]);

  function list() {
    if (!loaded) return <p className="lede">Carregando armaduras…</p>;
    if (!all.length) {
      if (!(W.armors || []).length) {
        return (
          <div className="empty-state">
            <Icon paths={ICON.armor} size={34} stroke={1.6} />
            <strong>Nenhuma armadura cadastrada</strong>
            <span>
              {CATALOG.armors.failed ? (
                'Não foi possível carregar a lista dos livros.'
              ) : can ? (
                <>
                  Crie uma com <b>Nova armadura</b>.
                </>
              ) : (
                'As armaduras e os escudos vão aparecer aqui.'
              )}
            </span>
          </div>
        );
      }
      return (
        <p className="lede" style={{padding: '24px 0'}}>
          Nenhuma armadura corresponde aos filtros aplicados.
        </p>
      );
    }
    return (
      <>
        <div className="list-bar">
          <span className="meta">
            <PageCount pg={pg} total={all.length} one="armadura ou escudo" many="armaduras e escudos" />
          </span>
          <Pager pg={pg} onPage={toPage} />
        </div>
        <div className="adv-grid">
          {pg.items.map(a => (
            <ArmorCard a={a} key={a.id} />
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
      <Crumbs node="armors" />
      <div className="head-row">
        <div>
          <h1>
            <Icon paths={ICON.armor} size={24} stroke={2} />
            {' Armaduras'}
          </h1>
          <p className="lede">Armaduras, elmos, escudos e bardas para GURPS 4ª Edição.</p>
        </div>
        {can ? (
          <div className="btn-row">
            <button className="btn primary" type="button" id="newArmorBtn" onClick={() => openDialog(<ArmorForm a={null} />)}>
              <Icon paths={ICON.plus} size={16} stroke={2.4} />
              Nova armadura
            </button>
          </div>
        ) : null}
      </div>
      <div className="toolbar" style={{marginBottom: 16}}>
        <input
          className="search list-search"
          type="search"
          id="armorSearch"
          placeholder="Buscar por nome, local ou notas…"
          value={typed}
          autoComplete="off"
          aria-label="Buscar armaduras"
          onChange={e => search(e.target.value)}
        />
        <div className="field" style={{margin: 0}}>
          <select id="armorTypeFilter" aria-label="Filtrar por tipo" value={v.type} onChange={e => filter({type: e.target.value})}>
            <option value="">Armaduras e escudos</option>
            {Object.keys(ARMOR_TYPE_LABELS).map(t => (
              <option value={t} key={t}>
                {ARMOR_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{margin: 0}}>
          <select id="armorCatFilter" aria-label="Filtrar por categoria" value={v.category} onChange={e => filter({category: e.target.value})}>
            <option value="">Todas as categorias</option>
            {options.categories.map(c => (
              <option value={c} key={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{margin: 0}}>
          <select id="armorBookFilter" aria-label="Filtrar por livro" value={v.book} onChange={e => filter({book: e.target.value})}>
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
      <div id="armorResults" ref={results}>
        {list()}
      </div>
    </>
  );
}

function ArmorCard({a}: {a: Armor}) {
  const sum = armorSummary(a), group = [a.table, a.category].filter(Boolean).join(' · ');
  return (
    <a className="spell-card adv-card" href={armorHref(a.id)}>
      <div className="adv-card-top">
        <strong>{a.name}</strong>
        <ArmorBadge a={a} />
      </div>
      {sum ? <div className="adv-cost">{sum}</div> : null}
      {group ? <div className="adv-src">{group}</div> : null}
      <div className="adv-src">{[a.tl ? 'TL ' + a.tl : '', a.cost, a.weight ? a.weight + ' lb' : '', a.book, a.page ? 'p. ' + a.page : ''].filter(Boolean).join(' · ')}</div>
    </a>
  );
}
