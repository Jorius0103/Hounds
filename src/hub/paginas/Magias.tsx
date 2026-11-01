import {useMemo, useRef, useState} from 'react';
import {useHub} from '../data';
import {Crumbs} from '../ui/Crumbs';
import {openDialog} from '../ui/Dialog';
import {Icon} from '../ui/Icon';
import {useListView} from '../ui/listView';
import {MestreOnly} from '../ui/MestreOnly';
import {PageCount, Pager} from '../ui/Pager';
import {SpellForm} from './MagiaForm';

// Os campos em que a busca procura o texto (o nome, também em português, conta mais; js/busca-catalogos.js).
const SEARCH_FIELDS = ['name', 'college', 'class', 'description', 'prerequisites'];
// O filtro "Alterações do Mestre"; 'any' é qualquer alteração. Ocultas e excluídas, só para o Mestre.
const CHANGE_FILTERS = [
  ['any', 'Alteradas pelo Mestre'],
  ['created', 'Criadas pelo Mestre'],
  ['edited', 'Editadas dos livros'],
  ['hidden', 'Ocultas dos jogadores'],
  ['deleted', 'Excluídas'],
];
// A etiqueta do cartão para o que o Mestre mudou (spellChange).
const CHANGE_TAGS: Record<string, string> = {created: 'Criada pelo Mestre', edited: 'Editada pelo Mestre', hidden: 'Oculta'};
const CARD_TOP = {display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8};
const CARD_TAGS = {display: 'flex', flexWrap: 'wrap', gap: 4} as const;

// Busca, filtros e página da lista, guardados enquanto o site está aberto (useListView).
const view = {q: '', mine: false, college: '', spellClass: '', resistance: '', difficulty: '', book: '', change: '', page: 1};
type SpellView = typeof view;

// As magias com os filtros e a busca: na ordem do nome e, com uma busca, as mais parecidas primeiro.
function filterSpells(v: SpellView) {
  const college = v.college.toLowerCase(), sClass = v.spellClass.toLowerCase(), diff = v.difficulty.toUpperCase();
  // As excluídas não estão em W.spells: só esse filtro as lista.
  const source = v.change === 'deleted' ? (CATALOG.spells.deleted as Spell[]) : W.spells || [];
  return searchCatalog(
    source.filter(s => {
      if (v.change && v.change !== 'deleted') {
        const k = spellChange(s);
        if (v.change === 'any' ? !k : k !== v.change) return false;
      }
      if (v.book && (s.source || 'Sem livro') !== v.book) return false;
      if (v.mine && s.catalog) return false;
      if (diff && (s.difficulty || '').toUpperCase() !== diff) return false;
      if (college && (s.college || '').toLowerCase().indexOf(college) < 0) return false;
      if (sClass && (s.class || '').toLowerCase().indexOf(sClass) < 0) return false;
      if (v.resistance && spellResistance(s).indexOf(v.resistance) < 0) return false;
      return true;
    }),
    v.q,
    s => searchText(s, SEARCH_FIELDS),
  );
}

// Página Magias (#magias): o grimório dos livros com as magias do Mestre, em cartões, com busca, filtros e páginas. As
// mesmas classes da versão antiga (css/paginas.css); os dados e as funções de magia continuam em js/tabs/tab-magias.js.
export function SpellsPage() {
  const {W, version} = useHub();
  const results = useRef<HTMLDivElement>(null);
  const {v, typed, loaded, all, pg, filter, search, toPage} = useListView('spells', view, filterSpells, results);
  const can = isMestre(), warning = noticeText();
  // As opções dos filtros saem das mais de mil magias: só são refeitas quando os dados mudam.
  const options = useMemo(() => ({books: spellBooks(), colleges: spellColleges(), classes: spellClasses(), resistances: spellResistances()}), [version]);

  function list() {
    if (!loaded) return <p className="lede">Carregando magias…</p>;
    if (!all.length) {
      if (!(W.spells || []).length && !v.change) {
        return (
          <div className="empty-state">
            <Icon paths={ICON.spell} size={34} stroke={1.6} />
            <strong>Nenhuma magia cadastrada</strong>
            <span>
              {CATALOG.spells.failed ? (
                'Não foi possível carregar o grimório dos livros.'
              ) : can ? (
                <>
                  Crie uma com <b>Nova magia</b>.
                </>
              ) : (
                'As magias vão aparecer aqui.'
              )}
            </span>
          </div>
        );
      }
      return (
        <p className="lede" style={{padding: '24px 0'}}>
          {v.change && !v.q && !v.book && !v.college && !v.spellClass && !v.resistance && !v.difficulty ? 'O Mestre ainda não fez alterações desse tipo.' : 'Nenhuma magia corresponde aos filtros aplicados.'}
        </p>
      );
    }
    return (
      <>
        <div className="list-bar">
          <span className="meta">
            <PageCount pg={pg} total={all.length} one="magia" many="magias" />
          </span>
          <Pager pg={pg} onPage={toPage} />
        </div>
        <div className="spell-grid">{pg.items.map(s => (v.change === 'deleted' ? <DeletedCard s={s} key={s.id} /> : <SpellCard s={s} key={s.id} />))}</div>
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
      <Crumbs node="spells" />
      <div className="head-row">
        <div>
          <h1>
            <Icon paths={ICON.spell} size={24} stroke={2} />
            {' Magias'}
          </h1>
          <p className="lede">Grimório de magias e encantamentos para GURPS 4ª Edição.</p>
        </div>
        {can ? (
          <div className="btn-row">
            <button className="btn primary" type="button" id="newSpellBtn" onClick={() => openDialog(<SpellForm s={null} />)}>
              <Icon paths={ICON.plus} size={16} stroke={2.4} />
              Nova magia
            </button>
          </div>
        ) : null}
      </div>
      <div className="toolbar" style={{marginBottom: 16}}>
        <input
          className="search list-search"
          type="search"
          id="spellSearch"
          placeholder="Buscar por nome, efeito ou pré-requisito…"
          value={typed}
          autoComplete="off"
          aria-label="Buscar magias"
          onChange={e => search(e.target.value)}
        />
        <div className="field" style={{margin: 0}}>
          <select id="spellBookFilter" aria-label="Filtrar por livro" value={v.book} onChange={e => filter({book: e.target.value})}>
            <option value="">Todos os livros</option>
            {options.books.map(b => (
              <option value={b[0]} key={b[0]}>
                {b[0] + ' (' + b[1] + ')'}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{margin: 0}}>
          <select id="spellCollegeFilter" aria-label="Filtrar por escola" value={v.college} onChange={e => filter({college: e.target.value})}>
            <option value="">{'Todas as escolas (' + options.colleges.length + ')'}</option>
            {options.colleges.map(c => (
              <option value={c} key={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{margin: 0}}>
          <select id="spellClassFilter" aria-label="Filtrar por classe" value={v.spellClass} onChange={e => filter({spellClass: e.target.value})}>
            <option value="">Todas as classes</option>
            {options.classes.map(cl => (
              <option value={cl} key={cl}>
                {cl}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{margin: 0}}>
          <select id="spellResistFilter" aria-label="Filtrar por resistência" value={v.resistance} onChange={e => filter({resistance: e.target.value})}>
            <option value="">Todas as resistências</option>
            {options.resistances.map(r => (
              <option value={r[0]} key={r[0]}>
                {r[1] + ' (' + r[2] + ')'}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{margin: 0}}>
          <select id="spellDiffFilter" aria-label="Filtrar por dificuldade" value={v.difficulty} onChange={e => filter({difficulty: e.target.value})}>
            <option value="">Dificuldade (Todas)</option>
            <option value="H">Hard (H)</option>
            <option value="VH">Very Hard (VH)</option>
          </select>
        </div>
        <div className="field" style={{margin: 0}}>
          <select id="spellChangeFilter" aria-label="Filtrar por alterações do Mestre" value={v.change} onChange={e => filter({change: e.target.value})}>
            <option value="">Livros e Mestre</option>
            {CHANGE_FILTERS.filter(f => can || (f[0] !== 'hidden' && f[0] !== 'deleted')).map(f => (
              <option value={f[0]} key={f[0]}>
                {f[1]}
              </option>
            ))}
          </select>
        </div>
        <MestreOnly on={v.mine} onChange={mine => filter({mine})} />
      </div>
      {warning ? <p className="notice">{warning}</p> : null}
      <div id="spellResults" ref={results}>
        {list()}
      </div>
    </>
  );
}

function DiffBadge({s}: {s: Spell}) {
  return <span className={'spell-badge ' + ((s.difficulty || '').toUpperCase() === 'VH' ? 'diff-vh' : 'diff-h')}>{s.difficulty || 'H'}</span>;
}

function SpellCard({s}: {s: Spell}) {
  const stats = [];
  if (s.timeToCast) stats.push('Tempo: ' + s.timeToCast);
  // Alguns custos são um parágrafo inteiro: o cartão mostra o começo.
  if (s.initialCost) stats.push('Custo: ' + (s.initialCost.length > 60 ? s.initialCost.slice(0, 57).trim() + '…' : s.initialCost));
  const change = CHANGE_TAGS[spellChange(s)];
  return (
    <a
      className="spell-card"
      href={spellHref(s.id)}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 12,
        padding: 14,
        textDecoration: 'none',
        color: 'inherit',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        transition: 'border-color .15s,transform .15s',
      }}
    >
      <div style={CARD_TOP}>
        <strong style={{fontSize: 15, lineHeight: 1.3, color: 'var(--text)'}}>{s.name}</strong>
        <DiffBadge s={s} />
      </div>
      <div style={CARD_TAGS}>
        {s.college ? <span className="spell-tag college">{s.college}</span> : null}
        {s.class ? <span className="spell-tag sclass">{s.class}</span> : null}
        {change ? <span className="spell-tag mestre">{change}</span> : null}
      </div>
      {stats.length ? <div style={{fontSize: 12, color: 'var(--muted)'}}>{stats.join(' · ')}</div> : null}
      {s.description ? (
        <div style={{fontSize: 13, lineHeight: 1.4, color: 'var(--muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'}}>{s.description}</div>
      ) : null}
      {s.page ? <div style={{fontSize: 11, color: 'var(--faint)', marginTop: 'auto'}}>{'Pág. ' + s.page}</div> : null}
    </a>
  );
}

// Uma magia dos livros que o Mestre excluiu (o filtro Excluídas): o botão a traz de volta como no livro. Ele fica
// desativado depois do clique; o cartão sai da lista quando o documento sai do banco.
function DeletedCard({s}: {s: Spell}) {
  const [busy, setBusy] = useState(false);
  function restore() {
    setBusy(true);
    Ops.restoreCatalogItem('spells', s).then(
      () => toast('Magia restaurada: ' + s.name + '.'),
      er => {
        setBusy(false);
        toast(errorText(er), true);
      },
    );
  }
  return (
    <div className="spell-card is-deleted">
      <div style={CARD_TOP}>
        <strong style={{fontSize: 15, lineHeight: 1.3}}>{s.name}</strong>
        <DiffBadge s={s} />
      </div>
      <div style={CARD_TAGS}>
        {s.college ? <span className="spell-tag college">{s.college}</span> : null}
        <span className="spell-tag mestre">Excluída pelo Mestre</span>
      </div>
      <div style={{marginTop: 'auto'}}>
        <button className="btn" type="button" data-restore={s.id} disabled={busy} onClick={restore}>
          Restaurar
        </button>
      </div>
    </div>
  );
}
