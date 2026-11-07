import {useMemo, useRef} from 'react';
import {useHub} from '../data';
import {Crumbs} from '../ui/Crumbs';
import {openDialog} from '../ui/Dialog';
import {Icon} from '../ui/Icon';
import {useListView} from '../ui/listView';
import {MestreOnly} from '../ui/MestreOnly';
import {PageCount, Pager} from '../ui/Pager';
import {SkillForm} from './PericiaForm';

// Os campos em que a busca procura o texto (o nome, também em português, conta mais; js/busca-catalogos.js).
const SEARCH_FIELDS = ['name', 'type', 'defaults', 'description'];
// Busca, filtros e página da lista, guardados enquanto o site está aberto (useListView).
const view = {q: '', mine: false, attr: '', diff: '', book: '', page: 1};
type SkillView = typeof view;

// As perícias com os filtros e a busca: na ordem do nome e, com uma busca, as mais parecidas primeiro.
function filterSkills(v: SkillView) {
  return searchCatalog(
    (W.skills || []).filter(s => {
      if (v.attr && s.attribute !== v.attr) return false;
      if (v.diff && s.difficulty !== v.diff) return false;
      if (v.book && s.book !== v.book) return false;
      if (v.mine && s.catalog) return false;
      return true;
    }),
    v.q,
    s => searchText(s, SEARCH_FIELDS),
  );
}

/**
 * O selo de uma perícia, como o skillBadge de js/tabs/tab-pericias.js (que continua servindo a Combate e ao modal das
 * fichas): "DX/H" com a cor da dificuldade; "DX/var." numa família em que a dificuldade varia; Remissão numa entrada que
 * só aponta para outra página.
 */
export function SkillBadge({s}: {s: Skill}) {
  if (s.attribute && s.difficulty) {
    return (
      <span className={'spell-badge ' + (SKILL_CAT_CLASSES[s.difficulty] || 'adv-ref')} title={s.attribute + ' / ' + (SKILL_CAT_LABELS[s.difficulty] || s.difficulty)}>
        {s.attribute + '/' + s.difficulty}
      </span>
    );
  }
  if (s.attribute) {
    return (
      <span className="spell-badge adv-ref" title="A dificuldade varia conforme a perícia">
        {s.attribute + '/var.'}
      </span>
    );
  }
  return <span className="spell-badge adv-ref">Remissão</span>;
}

// Página Perícias (#pericias): as dos livros com as do Mestre, em cartões, com busca, filtros e páginas. As mesmas classes
// da versão antiga (css/paginas.css); os dados e as funções de perícia continuam em js/tabs/tab-pericias.js.
export function SkillsPage() {
  const {W, version} = useHub();
  const results = useRef<HTMLDivElement>(null);
  const {v, typed, loaded, all, pg, filter, search, toPage} = useListView('skills', view, filterSkills, results);
  const can = isMestre(), warning = noticeText();
  const options = useMemo(
    () => ({attrs: skillValues('attribute'), diffs: SKILL_CAT_DIFFS.filter(d => (W.skills || []).some(s => s.difficulty === d)), books: skillValues('book')}),
    [version],
  );

  function list() {
    if (!loaded) return <p className="lede">Carregando perícias…</p>;
    if (!all.length) {
      if (!(W.skills || []).length) {
        return (
          <div className="empty-state">
            <Icon paths={ICON.skill} size={34} stroke={1.6} />
            <strong>Nenhuma perícia cadastrada</strong>
            <span>
              {CATALOG.skills.failed ? (
                'Não foi possível carregar a lista dos livros.'
              ) : can ? (
                <>
                  Crie uma com <b>Nova perícia</b>.
                </>
              ) : (
                'As perícias vão aparecer aqui.'
              )}
            </span>
          </div>
        );
      }
      return (
        <p className="lede" style={{padding: '24px 0'}}>
          Nenhuma perícia corresponde aos filtros aplicados.
        </p>
      );
    }
    return (
      <>
        <div className="list-bar">
          <span className="meta">
            <PageCount pg={pg} total={all.length} one="perícia" many="perícias" />
          </span>
          <Pager pg={pg} onPage={toPage} />
        </div>
        <div className="adv-grid">
          {pg.items.map(s => (
            <SkillCard s={s} key={s.id} />
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
      <Crumbs node="skills" />
      <div className="head-row">
        <div>
          <h1>
            <Icon paths={ICON.skill} size={24} stroke={2} />
            {' Perícias'}
          </h1>
          <p className="lede">Perícias para GURPS 4ª Edição.</p>
        </div>
        {can ? (
          <div className="btn-row">
            <button className="btn primary" type="button" id="newSkillBtn" onClick={() => openDialog(<SkillForm s={null} />)}>
              <Icon paths={ICON.plus} size={16} stroke={2.4} />
              Nova perícia
            </button>
          </div>
        ) : null}
      </div>
      <div className="toolbar" style={{marginBottom: 16}}>
        <input
          className="search list-search"
          type="search"
          id="skillSearch"
          placeholder="Buscar por nome, padrão ou descrição…"
          value={typed}
          autoComplete="off"
          aria-label="Buscar perícias"
          onChange={e => search(e.target.value)}
        />
        <div className="field" style={{margin: 0}}>
          <select id="skillAttrFilter" aria-label="Filtrar por atributo" value={v.attr} onChange={e => filter({attr: e.target.value})}>
            <option value="">Todos os atributos</option>
            {options.attrs.map(a => (
              <option value={a} key={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{margin: 0}}>
          <select id="skillDiffFilter" aria-label="Filtrar por dificuldade" value={v.diff} onChange={e => filter({diff: e.target.value})}>
            <option value="">Todas as dificuldades</option>
            {options.diffs.map(d => (
              <option value={d} key={d}>
                {SKILL_CAT_LABELS[d]}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{margin: 0}}>
          <select id="skillBookFilter" aria-label="Filtrar por livro" value={v.book} onChange={e => filter({book: e.target.value})}>
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
      <div id="skillResults" ref={results}>
        {list()}
      </div>
    </>
  );
}

function SkillCard({s}: {s: Skill}) {
  const tags = skillTags(s);
  return (
    <a className="spell-card adv-card" href={skillHref(s.id)}>
      <div className="adv-card-top">
        <strong>{s.name}</strong>
        <SkillBadge s={s} />
      </div>
      {s.attribute ? s.defaults ? <div className="adv-cost">{'Padrão: ' + s.defaults}</div> : null : s.type ? <div className="adv-cost">{s.type}</div> : null}
      {tags ? <div className="adv-src">{tags}</div> : null}
      {s.description ? <div className="adv-desc">{s.description}</div> : null}
      <div className="adv-src">{[s.book, s.page ? 'p. ' + s.page : ''].filter(Boolean).join(' · ')}</div>
    </a>
  );
}
