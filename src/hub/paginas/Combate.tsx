import {useMemo, useRef} from 'react';
import {useHub} from '../data';
import {Crumbs} from '../ui/Crumbs';
import {openDialog} from '../ui/Dialog';
import {Icon} from '../ui/Icon';
import {useListView} from '../ui/listView';
import {MestreOnly} from '../ui/MestreOnly';
import {PageCount, Pager} from '../ui/Pager';
import {StyleForm} from './EstiloForm';
import {SkillBadge} from './Pericias';
import {SkillForm} from './PericiaForm';
import {TechForm} from './TecnicaForm';

// As três listas da página: como cada uma se chama, nas abas, nas contagens e nos vazios, e a coleção dela.
const TABS = [
  {key: 'skills', label: 'Perícias de combate', one: 'perícia', many: 'perícias', col: 'skills', search: 'Buscar perícia, padrão ou descrição…'},
  {key: 'techs', label: 'Técnicas', one: 'técnica', many: 'técnicas', col: 'techniques', search: 'Buscar técnica, padrão ou descrição…'},
  {key: 'styles', label: 'Estilos', one: 'estilo', many: 'estilos', col: 'styles', search: 'Buscar estilo, perícia ou técnica…'},
] as const;
// Os campos em que a busca procura o texto (o nome, também em português, conta mais; js/busca-catalogos.js).
const SEARCH_FIELDS = ['name', 'type', 'defaults', 'prerequisites', 'description'];
const STYLE_SEARCH_FIELDS = ['name', 'description', 'skills', 'techniques', 'cinematicSkills', 'cinematicTechniques', 'perks', 'spells'];
// O filtro das técnicas: as de combate, as outras (Lifesaving, Sociometry) ou todas.
const KINDS = [
  ['combat', 'De combate'],
  ['other', 'Fora de combate'],
  ['', 'Todas as técnicas'],
];

// A aba, a busca, os filtros e a página, guardados enquanto o site está aberto (useListView). kind: só das técnicas.
const view = {tab: 'skills', q: '', mine: false, diff: '', book: '', kind: 'combat', page: 1};
type CombatView = typeof view;
// O que as três listas têm em comum, para filtrar.
type Entry = {id: string; name: string; difficulty?: string; book?: string; catalog?: boolean};

/** A aba em que Combate abre da próxima vez: a da técnica ou do estilo que acabou de ser excluído. */
export function showCombatTab(tab: 'techs' | 'styles') {
  view.tab = tab;
}

const tabOf = (v: CombatView) => TABS.find(t => t.key === v.tab) || TABS[0];
function entries(v: CombatView): Entry[] {
  return v.tab === 'techs' ? W.techniques || [] : v.tab === 'styles' ? W.styles || [] : (W.skills || []).filter(isCombatSkill);
}
// As entradas da aba com os filtros e a busca: na ordem do nome e, com uma busca, as mais parecidas primeiro.
function filterCombat(v: CombatView) {
  const techs = v.tab === 'techs', fields = v.tab === 'styles' ? STYLE_SEARCH_FIELDS : SEARCH_FIELDS;
  return searchCatalog(
    entries(v).filter(x => {
      if (v.diff && x.difficulty !== v.diff) return false;
      if (v.book && x.book !== v.book) return false;
      if (v.mine && x.catalog) return false;
      if (techs && v.kind && isCombatTech(x as Technique) !== (v.kind === 'combat')) return false;
      return true;
    }),
    v.q,
    x => searchText(x, fields),
  );
}

/** O selo de uma técnica (Média ou Difícil), como o techBadge de js/tabs/tab-combate.js; nada sem dificuldade. */
export function TechBadge({t}: {t: Technique}) {
  if (!t.difficulty) return null;
  const label = TECH_DIFF_LABELS[t.difficulty] || t.difficulty;
  return (
    <span className={'spell-badge ' + (TECH_DIFF_CLASSES[t.difficulty] || 'adv-ref')} title={'Técnica ' + label}>
      {label}
    </span>
  );
}

// Página Combate (#combate): três listas em abas, as perícias de combate (as de Regras › Perícias que são de armas e de
// luta, que abrem a página da perícia dentro de Combate), as técnicas e os estilos. As mesmas classes da versão antiga
// (css/paginas.css); os dados e as funções continuam em js/tabs/tab-combate.js.
export function CombatPage() {
  const {W, version} = useHub();
  const results = useRef<HTMLDivElement>(null);
  const {v, typed, loaded, all, pg, filter, search, toPage} = useListView(x => tabOf(x).col, view, filterCombat, results, ['skills', 'techniques', 'styles']);
  const t = tabOf(v), techs = t.key === 'techs', styles = t.key === 'styles', can = isMestre(), warning = noticeText();
  const labels = techs ? TECH_DIFF_LABELS : SKILL_CAT_LABELS;
  const options = useMemo(() => {
    const list = entries(v), books: Record<string, boolean> = {};
    list.forEach(x => {
      if (x.book) books[x.book] = true;
    });
    return {
      diffs: styles ? [] : (techs ? TECH_DIFFS : SKILL_CAT_DIFFS).filter(d => list.some(x => x.difficulty === d)),
      books: Object.keys(books).sort((a, b) => a.localeCompare(b, 'pt')),
    };
  }, [version, v.tab]);

  function newEntry() {
    if (techs) openDialog(<TechForm t={null} />);
    else if (styles) openDialog(<StyleForm x={null} />);
    // Uma perícia criada aqui é de combate (o tipo começa com Melee, Ranged ou General; veja isCombatSkill).
    else openDialog(<SkillForm s={null} combat />);
  }

  function list() {
    if (!loaded) return <p className="lede">Carregando…</p>;
    if (!all.length) {
      if (!entries(v).length) {
        return (
          <div className="empty-state">
            <Icon paths={ICON.combat} size={34} stroke={1.6} />
            <strong>{techs ? 'Nenhuma técnica cadastrada' : styles ? 'Nenhum estilo cadastrado' : 'Nenhuma perícia de combate'}</strong>
            <span>
              {CATALOG[t.col].failed ? (
                'Não foi possível carregar a lista dos livros.'
              ) : !can ? (
                'Vão aparecer aqui.'
              ) : techs ? (
                <>
                  Crie uma com <b>Nova técnica</b>.
                </>
              ) : styles ? (
                <>
                  Crie um com <b>Novo estilo</b>.
                </>
              ) : (
                <>
                  Crie uma com <b>Nova perícia</b>.
                </>
              )}
            </span>
          </div>
        );
      }
      return (
        <p className="lede" style={{padding: '24px 0'}}>
          Nada corresponde aos filtros aplicados.
        </p>
      );
    }
    return (
      <>
        <div className="list-bar">
          <span className="meta">
            <PageCount pg={pg} total={all.length} one={t.one} many={t.many} />
          </span>
          <Pager pg={pg} onPage={toPage} />
        </div>
        <div className="adv-grid">
          {pg.items.map(x => (techs ? <TechCard t={x as Technique} key={x.id} /> : styles ? <StyleCard x={x as FightingStyle} key={x.id} /> : <CombatSkillCard s={x as Skill} key={x.id} />))}
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
      <Crumbs node="combat" />
      <div className="head-row">
        <div>
          <h1>
            <Icon paths={ICON.combat} size={24} stroke={2} />
            {' Combate'}
          </h1>
          <p className="lede">Perícias de combate, técnicas e estilos de luta para GURPS 4ª Edição.</p>
        </div>
        {can ? (
          <div className="btn-row">
            <button className="btn primary" type="button" id={techs ? 'newTechBtn' : styles ? 'newStyleBtn' : 'newCombatSkillBtn'} onClick={newEntry}>
              <Icon paths={ICON.plus} size={16} stroke={2.4} />
              {techs ? 'Nova técnica' : styles ? 'Novo estilo' : 'Nova perícia'}
            </button>
          </div>
        ) : null}
      </div>
      <div className="seg" role="tablist" aria-label="Lista">
        {TABS.map(x => (
          <button
            type="button"
            role="tab"
            data-ctab={x.key}
            aria-selected={x.key === t.key}
            className={x.key === t.key ? 'on' : ''}
            key={x.key}
            onClick={() => {
              if (x.key !== v.tab) filter({tab: x.key, diff: '', book: '', kind: 'combat'});
            }}
          >
            {x.label}
          </button>
        ))}
      </div>
      <div className="toolbar" style={{marginBottom: 16}}>
        <input className="search list-search" type="search" id="combatSearch" placeholder={t.search} value={typed} autoComplete="off" aria-label="Buscar" onChange={e => search(e.target.value)} />
        {styles ? null : (
          <div className="field" style={{margin: 0}}>
            <select id="combatDiffFilter" aria-label="Filtrar por dificuldade" value={v.diff} onChange={e => filter({diff: e.target.value})}>
              <option value="">Todas as dificuldades</option>
              {options.diffs.map(d => (
                <option value={d} key={d}>
                  {labels[d]}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="field" style={{margin: 0}}>
          <select id="combatBookFilter" aria-label="Filtrar por livro" value={v.book} onChange={e => filter({book: e.target.value})}>
            <option value="">Todos os livros</option>
            {options.books.map(b => (
              <option value={b} key={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        {techs ? (
          <div className="field" style={{margin: 0}}>
            <select id="combatKindFilter" aria-label="Filtrar por tipo de técnica" value={v.kind} onChange={e => filter({kind: e.target.value})}>
              {KINDS.map(o => (
                <option value={o[0]} key={o[0]}>
                  {o[1]}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <MestreOnly on={v.mine} onChange={mine => filter({mine})} />
      </div>
      {warning ? <p className="notice">{warning}</p> : null}
      <div id="combatResults" ref={results}>
        {list()}
      </div>
    </>
  );
}

const source = (x: {book?: string; page?: string}) => [x.book, x.page ? 'p. ' + x.page : ''].filter(Boolean).join(' · ');

function CombatSkillCard({s}: {s: Skill}) {
  const tags = skillTags(s);
  return (
    <a className="spell-card adv-card" href={combatSkillHref(s.id)}>
      <div className="adv-card-top">
        <strong>{s.name}</strong>
        <SkillBadge s={s} />
      </div>
      {s.defaults ? <div className="adv-cost">{'Padrão: ' + s.defaults}</div> : null}
      {tags ? <div className="adv-src">{tags}</div> : null}
      {s.description ? <div className="adv-desc">{s.description}</div> : null}
      <div className="adv-src">{source(s)}</div>
    </a>
  );
}

function TechCard({t}: {t: Technique}) {
  return (
    <a className="spell-card adv-card" href={techHref(t.id)}>
      <div className="adv-card-top">
        <strong>{t.name}</strong>
        <TechBadge t={t} />
      </div>
      {t.defaults ? <div className="adv-cost">{'Padrão: ' + t.defaults}</div> : null}
      {t.cinematic ? <div className="adv-src">Cinemática</div> : null}
      {t.description ? <div className="adv-desc">{t.description}</div> : null}
      <div className="adv-src">{source(t)}</div>
    </a>
  );
}

function StyleCard({x}: {x: FightingStyle}) {
  const skills = styleItems(x.skills);
  return (
    <a className="spell-card adv-card" href={styleHref(x.id)}>
      <div className="adv-card-top">
        <strong>{x.name}</strong>
        {x.cost ? (
          <span className="spell-badge adv-adv" title="Style Familiarity e perks obrigatórios">
            {x.cost + ' pts'}
          </span>
        ) : null}
      </div>
      {skills.length ? <div className="adv-cost">{skills.join(' · ')}</div> : null}
      {x.description ? <div className="adv-desc">{x.description}</div> : null}
      <div className="adv-src">{source(x)}</div>
    </a>
  );
}
