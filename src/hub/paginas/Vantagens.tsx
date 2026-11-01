import {useMemo, useRef} from 'react';
import type {HubPageProps} from '../pages';
import {useHub} from '../data';
import {Crumbs} from '../ui/Crumbs';
import {openDialog} from '../ui/Dialog';
import {Icon} from '../ui/Icon';
import {useListView} from '../ui/listView';
import {MestreOnly} from '../ui/MestreOnly';
import {PageCount, Pager} from '../ui/Pager';
import {AdvForm} from './VantagemForm';

// Os campos em que a busca procura o texto (o nome, também em português, conta mais; js/busca-catalogos.js).
const SEARCH_FIELDS = ['name', 'cost', 'type', 'description'];
// Busca, filtros e página de cada lista, guardados enquanto o site está aberto (useListView).
const advView = {q: '', mine: false, advType: '', advBook: '', page: 1};
const perkView = {q: '', mine: false, advType: '', advBook: '', page: 1};
type AdvView = typeof advView;

// As entradas de uma lista (os perks, ou as outras) com os filtros e a busca: na ordem do nome e, com uma busca, as
// mais parecidas primeiro.
function filterAdvs(v: AdvView, perks: boolean) {
  return searchCatalog(
    (W.advantages || []).filter(a => {
      if (isPerkEntry(a) !== perks) return false;
      if (v.advType && a.type !== v.advType) return false;
      if (v.advBook && a.book !== v.advBook) return false;
      if (v.mine && a.catalog) return false;
      return true;
    }),
    v.q,
    a => searchText(a, SEARCH_FIELDS),
  );
}

// Páginas Vantagens (#vantagens) e Perks (#perks): a mesma lista, com os perks numa e as outras entradas na outra, cada
// uma com a busca e os filtros dela. As mesmas classes da versão antiga (css/paginas.css); os dados e as funções de
// vantagem continuam em js/tabs/tab-vantagens.js.
export function AdvantagesPage({route}: HubPageProps) {
  const {W, version} = useHub();
  const perks = route.page === 'perks';
  const results = useRef<HTMLDivElement>(null);
  const {v, typed, loaded, all, pg, filter, search, toPage} = useListView('advantages', perks ? perkView : advView, x => filterAdvs(x, perks), results);
  const can = isMestre(), warning = noticeText();
  // Os filtros mostram o que esta lista tem.
  const options = useMemo(() => {
    const here = (W.advantages || []).filter(a => isPerkEntry(a) === perks);
    return {types: advValues('type').filter(t => here.some(a => a.type === t)), books: advValues('book').filter(b => here.some(a => a.book === b))};
  }, [version]);

  function list() {
    if (!loaded) return <p className="lede">{'Carregando ' + (perks ? 'perks' : 'vantagens') + '…'}</p>;
    if (!all.length) {
      if (!(W.advantages || []).some(a => isPerkEntry(a) === perks)) {
        return (
          <div className="empty-state">
            <Icon paths={perks ? ICON.perk : ICON.advantage} size={34} stroke={1.6} />
            <strong>{perks ? 'Nenhum perk cadastrado' : 'Nenhuma vantagem cadastrada'}</strong>
            <span>
              {CATALOG.advantages.failed ? (
                'Não foi possível carregar a lista dos livros.'
              ) : can ? (
                perks ? (
                  <>
                    Crie um com <b>Novo perk</b>.
                  </>
                ) : (
                  <>
                    Crie uma com <b>Nova vantagem</b>.
                  </>
                )
              ) : (
                (perks ? 'Os perks vão' : 'As vantagens vão') + ' aparecer aqui.'
              )}
            </span>
          </div>
        );
      }
      return (
        <p className="lede" style={{padding: '24px 0'}}>
          {(perks ? 'Nenhum perk' : 'Nenhuma vantagem') + ' corresponde aos filtros aplicados.'}
        </p>
      );
    }
    return (
      <>
        <div className="list-bar">
          <span className="meta">
            <PageCount pg={pg} total={all.length} one={perks ? 'perk' : 'vantagem'} many={perks ? 'perks' : 'vantagens'} />
          </span>
          <Pager pg={pg} onPage={toPage} />
        </div>
        <div className="adv-grid">
          {pg.items.map(a => (
            <AdvCard a={a} key={a.id} />
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
      <Crumbs node={perks ? 'perks' : 'advs'} />
      <div className="head-row">
        <div>
          <h1>
            <Icon paths={perks ? ICON.perk : ICON.advantage} size={24} stroke={2} />
            {perks ? ' Perks' : ' Vantagens'}
          </h1>
          <p className="lede">
            {perks ? (
              'Perks para GURPS 4ª Edição: vantagens de 1 ponto (Basic Set, p. B100; Martial Arts, pp. 49-52).'
            ) : (
              <>
                Vantagens e talentos para GURPS 4ª Edição. Os perks ficam em <a href="#perks">Perks</a>.
              </>
            )}
          </p>
        </div>
        {can ? (
          <div className="btn-row">
            <button className="btn primary" type="button" id="newAdvBtn" onClick={() => openDialog(<AdvForm a={null} perk={perks} />)}>
              <Icon paths={ICON.plus} size={16} stroke={2.4} />
              {perks ? 'Novo perk' : 'Nova vantagem'}
            </button>
          </div>
        ) : null}
      </div>
      <div className="toolbar" style={{marginBottom: 16}}>
        <input
          className="search list-search"
          type="search"
          id="advSearch"
          placeholder="Buscar por nome, custo ou descrição…"
          value={typed}
          autoComplete="off"
          aria-label={perks ? 'Buscar perks' : 'Buscar vantagens'}
          onChange={e => search(e.target.value)}
        />
        {options.types.length > 1 ? (
          <div className="field" style={{margin: 0}}>
            <select id="advTypeFilter" aria-label="Filtrar por tipo" value={v.advType} onChange={e => filter({advType: e.target.value})}>
              <option value="">Todos os tipos</option>
              {options.types.map(t => (
                <option value={t} key={t}>
                  {advTypeLabel(t)}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="field" style={{margin: 0}}>
          <select id="advBookFilter" aria-label="Filtrar por livro" value={v.advBook} onChange={e => filter({advBook: e.target.value})}>
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
      <div id="advResults" ref={results}>
        {list()}
      </div>
    </>
  );
}

function AdvCard({a}: {a: Advantage}) {
  return (
    <a className="spell-card adv-card" href={advHref(a.id)}>
      <div className="adv-card-top">
        <strong>{a.name}</strong>
        <span className={'spell-badge ' + advTypeClass(a.type)}>{advTypeLabel(a.type)}</span>
      </div>
      {a.cost ? <div className="adv-cost">{a.cost}</div> : null}
      {a.description ? <div className="adv-desc">{a.description}</div> : null}
      <div className="adv-src">{[a.book, a.page ? 'p. ' + a.page : ''].filter(Boolean).join(' · ')}</div>
    </a>
  );
}
