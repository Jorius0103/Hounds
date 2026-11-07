import {useMemo, useRef} from 'react';
import {useHub} from '../data';
import {Crumbs} from '../ui/Crumbs';
import {openDialog} from '../ui/Dialog';
import {Icon} from '../ui/Icon';
import {useListView} from '../ui/listView';
import {MestreOnly} from '../ui/MestreOnly';
import {PageCount, Pager} from '../ui/Pager';
import {WeaponForm} from './ArmaForm';

// Busca, filtros e página da lista, guardados enquanto o site está aberto (useListView).
const view = {q: '', mine: false, type: '', skill: '', book: '', page: 1};
type WeaponView = typeof view;

// As armas com os filtros e a busca (também no texto dos ataques): na ordem do nome e, com uma busca, as mais parecidas
// primeiro.
function filterWeapons(v: WeaponView) {
  return searchCatalog(
    (W.weapons || []).filter(w => {
      if (v.type && w.type !== v.type) return false;
      if (v.skill && weaponSkills(w).indexOf(v.skill) < 0) return false;
      if (v.book && w.book !== v.book) return false;
      if (v.mine && w.catalog) return false;
      return true;
    }),
    v.q,
    weaponSearchText,
  );
}

/** O selo do tipo da arma (corpo a corpo ou à distância), como o weaponBadge de js/tabs/tab-armas.js. */
export function WeaponBadge({w}: {w: Weapon}) {
  return <span className={'spell-badge ' + (w.type === 'Ranged' ? 'diff-h' : 'adv-adv')}>{weaponTypeLabel(w.type)}</span>;
}

// Página Armas (#armas): as das tabelas dos livros (até TL4) com as do Mestre, em cartões, com busca, filtros e páginas.
// As mesmas classes da versão antiga (css/paginas.css); os dados e as funções de arma continuam em js/tabs/tab-armas.js.
export function WeaponsPage() {
  const {W, version} = useHub();
  const results = useRef<HTMLDivElement>(null);
  const {v, typed, loaded, all, pg, filter, search, toPage} = useListView('weapons', view, filterWeapons, results);
  const can = isMestre(), warning = noticeText();
  const options = useMemo(() => ({skills: weaponSkillValues(), books: weaponValues('book')}), [version]);

  function list() {
    if (!loaded) return <p className="lede">Carregando armas…</p>;
    if (!all.length) {
      if (!(W.weapons || []).length) {
        return (
          <div className="empty-state">
            <Icon paths={ICON.weapon} size={34} stroke={1.6} />
            <strong>Nenhuma arma cadastrada</strong>
            <span>
              {CATALOG.weapons.failed ? (
                'Não foi possível carregar a lista dos livros.'
              ) : can ? (
                <>
                  Crie uma com <b>Nova arma</b>.
                </>
              ) : (
                'As armas vão aparecer aqui.'
              )}
            </span>
          </div>
        );
      }
      return (
        <p className="lede" style={{padding: '24px 0'}}>
          Nenhuma arma corresponde aos filtros aplicados.
        </p>
      );
    }
    return (
      <>
        <div className="list-bar">
          <span className="meta">
            <PageCount pg={pg} total={all.length} one="arma" many="armas" />
          </span>
          <Pager pg={pg} onPage={toPage} />
        </div>
        <div className="adv-grid">
          {pg.items.map(w => (
            <WeaponCard w={w} key={w.id} />
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
      <Crumbs node="weapons" />
      <div className="head-row">
        <div>
          <h1>
            <Icon paths={ICON.weapon} size={24} stroke={2} />
            {' Armas'}
          </h1>
          <p className="lede">Armas corpo a corpo e à distância para GURPS 4ª Edição.</p>
        </div>
        {can ? (
          <div className="btn-row">
            <button className="btn primary" type="button" id="newWeaponBtn" onClick={() => openDialog(<WeaponForm w={null} />)}>
              <Icon paths={ICON.plus} size={16} stroke={2.4} />
              Nova arma
            </button>
          </div>
        ) : null}
      </div>
      <div className="toolbar" style={{marginBottom: 16}}>
        <input
          className="search list-search"
          type="search"
          id="weaponSearch"
          placeholder="Buscar por nome, perícia, dano ou descrição…"
          value={typed}
          autoComplete="off"
          aria-label="Buscar armas"
          onChange={e => search(e.target.value)}
        />
        <div className="field" style={{margin: 0}}>
          <select id="weaponTypeFilter" aria-label="Filtrar por tipo" value={v.type} onChange={e => filter({type: e.target.value})}>
            <option value="">Todos os tipos</option>
            {Object.keys(WEAPON_TYPE_LABELS).map(t => (
              <option value={t} key={t}>
                {WEAPON_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{margin: 0}}>
          <select id="weaponSkillFilter" aria-label="Filtrar por perícia" value={v.skill} onChange={e => filter({skill: e.target.value})}>
            <option value="">Todas as perícias</option>
            {options.skills.map(s => (
              <option value={s} key={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{margin: 0}}>
          <select id="weaponBookFilter" aria-label="Filtrar por livro" value={v.book} onChange={e => filter({book: e.target.value})}>
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
      <div id="weaponResults" ref={results}>
        {list()}
      </div>
    </>
  );
}

function WeaponCard({w}: {w: Weapon}) {
  const sum = weaponSummary(w), skills = weaponSkills(w).join(', ');
  return (
    <a className="spell-card adv-card" href={weaponHref(w.id)}>
      <div className="adv-card-top">
        <strong>{w.name}</strong>
        <WeaponBadge w={w} />
      </div>
      {sum ? <div className="adv-cost">{sum}</div> : null}
      {skills ? <div className="adv-src">{skills}</div> : null}
      {w.description ? <div className="adv-desc">{w.description}</div> : null}
      <div className="adv-src">{[w.tl ? 'TL ' + w.tl : '', w.cost, w.book, w.page ? 'p. ' + w.page : ''].filter(Boolean).join(' · ')}</div>
    </a>
  );
}
