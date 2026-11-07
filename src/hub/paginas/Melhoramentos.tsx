import {useMemo, useRef} from 'react';
import {useHub} from '../data';
import {Crumbs} from '../ui/Crumbs';
import {openDialog} from '../ui/Dialog';
import {Icon} from '../ui/Icon';
import {useListView} from '../ui/listView';
import {MestreOnly} from '../ui/MestreOnly';
import {PageCount, Pager} from '../ui/Pager';
import {ImprovementForm} from './MelhoramentoForm';

// Os campos em que a busca procura o texto (o nome, também em português, conta mais; js/busca-catalogos.js).
const SEARCH_FIELDS = ['name', 'category', 'restriction', 'cost', 'description'];
// Busca, filtros e página da lista, guardados enquanto o site está aberto (useListView).
const view = {q: '', mine: false, kind: '', category: '', book: '', page: 1};
type ImprovementView = typeof view;

// Os melhoramentos com os filtros e a busca: na ordem do nome e, com uma busca, os mais parecidos primeiro.
function filterImprovements(v: ImprovementView) {
  return searchCatalog(
    (W.improvements || []).filter(x => {
      if (v.kind && x.appliesTo !== v.kind) return false;
      if (v.category && x.category !== v.category) return false;
      if (v.book && x.book !== v.book) return false;
      if (v.mine && x.catalog) return false;
      return true;
    }),
    v.q,
    x => searchText(x, SEARCH_FIELDS),
  );
}

// Um dos filtros da barra: o valor vazio é "todos".
function FilterSelect({id, label, all, values, value, onChange}: {id: string; label: string; all: string; values: string[]; value: string; onChange: (value: string) => void}) {
  return (
    <div className="field" style={{margin: 0}}>
      <select id={id} aria-label={label} value={value} onChange={e => onChange(e.target.value)}>
        <option value="">{all}</option>
        {values.map(x => (
          <option value={x} key={x}>
            {x}
          </option>
        ))}
      </select>
    </div>
  );
}

// Página Melhoramentos (#melhoramentos): os modificadores dos livros para armas, escudos, armaduras, roupas e outros
// equipamentos, com os do Mestre, em cartões, com busca, filtros e páginas. As mesmas classes da versão antiga
// (css/paginas.css); os dados e as funções de melhoramento continuam em js/tabs/tab-melhoramentos.js.
export function ImprovementsPage() {
  const {W, version} = useHub();
  const results = useRef<HTMLDivElement>(null);
  const {v, typed, loaded, all, pg, filter, search, toPage} = useListView('improvements', view, filterImprovements, results);
  const can = isMestre(), warning = noticeText();
  const options = useMemo(
    () => ({kinds: improvementValues('appliesTo'), categories: improvementValues('category'), books: improvementValues('book')}),
    [version],
  );

  function list() {
    if (!loaded) return <p className="lede">Carregando melhoramentos…</p>;
    if (!all.length) {
      if (!(W.improvements || []).length) {
        return (
          <div className="empty-state">
            <Icon paths={ICON.improvement} size={34} stroke={1.6} />
            <strong>Nenhum melhoramento cadastrado</strong>
            <span>
              {CATALOG.improvements.failed ? (
                'Não foi possível carregar a lista dos livros.'
              ) : can ? (
                <>
                  Crie um com <b>Novo melhoramento</b>.
                </>
              ) : (
                'Os melhoramentos vão aparecer aqui.'
              )}
            </span>
          </div>
        );
      }
      return (
        <p className="lede" style={{padding: '24px 0'}}>
          Nenhum melhoramento corresponde aos filtros aplicados.
        </p>
      );
    }
    return (
      <>
        <div className="list-bar">
          <span className="meta">
            <PageCount pg={pg} total={all.length} one="melhoramento" many="melhoramentos" />
          </span>
          <Pager pg={pg} onPage={toPage} />
        </div>
        <div className="adv-grid">
          {pg.items.map(x => (
            <ImprovementCard x={x} key={x.id} />
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
      <Crumbs node="improvements" />
      <div className="head-row">
        <div>
          <h1>
            <Icon paths={ICON.improvement} size={24} stroke={2} />
            {' Melhoramentos'}
          </h1>
          <p className="lede">
            Modificadores de armas, escudos, armaduras, roupas e equipamentos para GURPS 4ª Edição. O custo é o fator de custo (CF): o preço final é o de
            lista × (1 + a soma dos CF).
          </p>
        </div>
        {can ? (
          <div className="btn-row">
            <button className="btn primary" type="button" id="newImprovementBtn" onClick={() => openDialog(<ImprovementForm x={null} />)}>
              <Icon paths={ICON.plus} size={16} stroke={2.4} />
              Novo melhoramento
            </button>
          </div>
        ) : null}
      </div>
      <div className="toolbar" style={{marginBottom: 16}}>
        <input
          className="search list-search"
          type="search"
          id="improvementSearch"
          placeholder="Buscar por nome, categoria, restrição ou descrição…"
          value={typed}
          autoComplete="off"
          aria-label="Buscar melhoramentos"
          onChange={e => search(e.target.value)}
        />
        <FilterSelect id="improvementKindFilter" label="Filtrar por tipo de equipamento" all="Todos os equipamentos" values={options.kinds} value={v.kind} onChange={kind => filter({kind})} />
        <FilterSelect id="improvementCatFilter" label="Filtrar por categoria" all="Todas as categorias" values={options.categories} value={v.category} onChange={category => filter({category})} />
        <FilterSelect id="improvementBookFilter" label="Filtrar por livro" all="Todos os livros" values={options.books} value={v.book} onChange={book => filter({book})} />
        <MestreOnly on={v.mine} onChange={mine => filter({mine})} />
      </div>
      {warning ? <p className="notice">{warning}</p> : null}
      <div id="improvementResults" ref={results}>
        {list()}
      </div>
    </>
  );
}

function ImprovementCard({x}: {x: Improvement}) {
  const tags = [x.appliesTo, x.weight ? 'Peso ' + x.weight : '', x.tl ? 'TL ' + x.tl : ''].filter(Boolean).join(' · ');
  return (
    <a className="spell-card adv-card" href={improvementHref(x.id)}>
      <div className="adv-card-top">
        <strong>{x.name}</strong>
        {x.cost ? <span className="spell-badge adv-adv">{x.cost}</span> : null}
      </div>
      {tags ? <div className="adv-cost">{tags}</div> : null}
      {x.restriction ? <div className="adv-cost">{x.restriction}</div> : null}
      {x.description ? <div className="adv-desc">{x.description}</div> : null}
      <div className="adv-src">{[x.category, x.book, x.page ? 'p. ' + x.page : ''].filter(Boolean).join(' · ')}</div>
    </a>
  );
}
