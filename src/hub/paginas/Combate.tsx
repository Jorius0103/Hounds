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

// As quatro listas da página: como cada uma se chama, nas abas, nas contagens e nos vazios, e a coleção dela.
const TABS = [
  {key: 'skills', label: 'Perícias de combate', one: 'perícia', many: 'perícias', col: 'skills', search: 'Buscar perícia, padrão ou descrição…'},
  {key: 'techs', label: 'Técnicas', one: 'técnica', many: 'técnicas', col: 'techniques', search: 'Buscar técnica, padrão ou descrição…'},
  {key: 'styles', label: 'Estilos', one: 'estilo', many: 'estilos', col: 'styles', search: 'Buscar estilo, perícia ou técnica…'},
  {key: 'cine', label: 'Cinematic', one: 'regra', many: 'regras', col: 'cinematics', search: 'Buscar regra, perícia, técnica ou texto…'},
] as const;
// Os campos em que a busca procura o texto (o nome, também em português, conta mais; js/busca-catalogos.js).
const SEARCH_FIELDS = ['name', 'type', 'defaults', 'prerequisites', 'description'];
const STYLE_SEARCH_FIELDS = ['name', 'description', 'skills', 'techniques', 'cinematicSkills', 'cinematicTechniques', 'perks', 'spells'];
const CINE_SEARCH_FIELDS = ['name', 'category', 'section', 'type', 'defaults', 'prerequisites', 'description'];
// O filtro das técnicas: as de combate, as outras (Lifesaving, Sociometry) ou todas.
const KINDS = [
  ['combat', 'De combate'],
  ['other', 'Fora de combate'],
  ['', 'Todas as técnicas'],
];
// O que a aba Cinematic conta, conforme o que ela lista (CINEMATIC_KINDS em js/tabs/tab-combate.js).
const CINE_COUNT: Record<string, [string, string]> = {rules: ['regra', 'regras'], skills: ['perícia', 'perícias'], techs: ['técnica', 'técnicas'], all: ['item', 'itens']};

// A aba, a busca, os filtros e a página, guardados enquanto o site está aberto (useListView). kind: só das técnicas;
// cine (regras, perícias, técnicas ou tudo) e cat (o tema das regras): só da aba Cinematic.
const view = {tab: 'skills', q: '', mine: false, diff: '', book: '', kind: 'combat', cine: 'rules', cat: '', page: 1};
type CombatView = typeof view;
// O que as quatro listas têm em comum, para filtrar.
type Entry = {id: string; name: string; difficulty?: string; book?: string; catalog?: boolean; category?: string};

/** A aba em que Combate abre da próxima vez: a da técnica ou do estilo que acabou de ser excluído, ou a Cinematic. */
export function showCombatTab(tab: 'techs' | 'styles' | 'cine') {
  view.tab = tab;
}

const tabOf = (v: CombatView) => TABS.find(t => t.key === v.tab) || TABS[0];
// A aba Cinematic: as regras cinemáticas dos livros e/ou as perícias e técnicas marcadas como cinemáticas.
function cineEntries(kind: string): Entry[] {
  const rules = kind === 'rules' || kind === 'all' ? W.cinematics || [] : [];
  const skills = kind === 'skills' || kind === 'all' ? (W.skills || []).filter(isCinematicSkill) : [];
  const techs = kind === 'techs' || kind === 'all' ? (W.techniques || []).filter(t => t.cinematic) : [];
  const list: Entry[] = [...rules, ...skills, ...techs];
  return kind === 'all' ? list.sort(byName) : list;
}
function entries(v: CombatView): Entry[] {
  if (v.tab === 'cine') return cineEntries(v.cine);
  return v.tab === 'techs' ? W.techniques || [] : v.tab === 'styles' ? W.styles || [] : (W.skills || []).filter(isCombatSkill);
}
// As entradas da aba com os filtros e a busca: na ordem do nome e, com uma busca, as mais parecidas primeiro.
function filterCombat(v: CombatView) {
  const techs = v.tab === 'techs', cine = v.tab === 'cine';
  const fields = v.tab === 'styles' ? STYLE_SEARCH_FIELDS : cine ? CINE_SEARCH_FIELDS : SEARCH_FIELDS;
  return searchCatalog(
    entries(v).filter(x => {
      if (v.diff && x.difficulty !== v.diff) return false;
      if (v.book && x.book !== v.book) return false;
      // "Criado pelo Mestre" não aparece na aba Cinematic (as regras são só dos livros).
      if (v.mine && !cine && x.catalog) return false;
      if (techs && v.kind && isCombatTech(x as Technique) !== (v.kind === 'combat')) return false;
      if (cine && v.cat && x.category !== v.cat) return false;
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

// Página Combate (#combate): quatro listas em abas, as perícias de combate (as de Regras › Perícias que são de armas e de
// luta, que abrem a página da perícia dentro de Combate), as técnicas, os estilos e a Cinematic (as regras cinemáticas
// dos livros e, num filtro, as perícias e técnicas cinemáticas). As mesmas classes da versão antiga (css/paginas.css);
// os dados e as funções continuam em js/tabs/tab-combate.js.
export function CombatPage() {
  const {W, version} = useHub();
  const results = useRef<HTMLDivElement>(null);
  const {v, typed, loaded, all, pg, filter, search, toPage} = useListView(x => tabOf(x).col, view, filterCombat, results, ['skills', 'techniques', 'styles', 'cinematics']);
  const t = tabOf(v), techs = t.key === 'techs', styles = t.key === 'styles', cine = t.key === 'cine', can = isMestre(), warning = noticeText();
  const labels = techs ? TECH_DIFF_LABELS : SKILL_CAT_LABELS;
  const [one, many] = cine ? CINE_COUNT[v.cine] || CINE_COUNT.all : [t.one, t.many];
  const options = useMemo(() => {
    const list = entries(v), books: Record<string, boolean> = {};
    list.forEach(x => {
      if (x.book) books[x.book] = true;
    });
    return {
      diffs: styles || cine ? [] : (techs ? TECH_DIFFS : SKILL_CAT_DIFFS).filter(d => list.some(x => x.difficulty === d)),
      books: Object.keys(books).sort((a, b) => a.localeCompare(b, 'pt')),
      cats: CINEMATIC_CATEGORIES.filter(c => (W.cinematics || []).some(x => x.category === c)),
    };
  }, [version, v.tab, v.cine]);

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
            <Icon paths={cine ? ICON.cinematic : ICON.combat} size={34} stroke={1.6} />
            <strong>{techs ? 'Nenhuma técnica cadastrada' : styles ? 'Nenhum estilo cadastrado' : cine ? 'Nada cinemático por aqui' : 'Nenhuma perícia de combate'}</strong>
            <span>
              {CATALOG[t.col].failed ? (
                'Não foi possível carregar a lista dos livros.'
              ) : !can || cine ? (
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
            <PageCount pg={pg} total={all.length} one={one} many={many} />
          </span>
          <Pager pg={pg} onPage={toPage} />
        </div>
        <div className="adv-grid">
          {pg.items.map(x =>
            techs ? (
              <TechCard t={x as Technique} key={x.id} />
            ) : styles ? (
              <StyleCard x={x as FightingStyle} key={x.id} />
            ) : cine ? (
              <CineEntryCard x={x} key={x.id} />
            ) : (
              <CombatSkillCard s={x as Skill} key={x.id} />
            ),
          )}
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
          <p className="lede">Perícias de combate, técnicas, estilos de luta e regras cinemáticas para GURPS 4ª Edição.</p>
        </div>
        {/* As regras cinemáticas são só dos livros (não há onde gravar uma nova). */}
        {can && !cine ? (
          <div className="btn-row">
            <button className="btn primary" type="button" id={techs ? 'newTechBtn' : styles ? 'newStyleBtn' : 'newCombatSkillBtn'} onClick={newEntry}>
              <Icon paths={ICON.plus} size={16} stroke={2.4} />
              {techs ? 'Nova técnica' : styles ? 'Novo estilo' : 'Nova perícia'}
            </button>
          </div>
        ) : null}
      </div>
      <div className="seg combat-tabs" role="tablist" aria-label="Lista">
        {TABS.map(x => (
          <button
            type="button"
            role="tab"
            data-ctab={x.key}
            aria-selected={x.key === t.key}
            className={x.key === t.key ? 'on' : ''}
            key={x.key}
            onClick={() => {
              if (x.key !== v.tab) filter({tab: x.key, diff: '', book: '', kind: 'combat', cat: ''});
            }}
          >
            {x.key === 'cine' ? <Icon paths={ICON.cinematic} size={14} stroke={2.2} /> : null}
            {x.label}
          </button>
        ))}
      </div>
      <div className="toolbar" style={{marginBottom: 16}}>
        <input className="search list-search" type="search" id="combatSearch" placeholder={t.search} value={typed} autoComplete="off" aria-label="Buscar" onChange={e => search(e.target.value)} />
        {cine ? (
          <div className="field" style={{margin: 0}}>
            <select id="combatCineKind" aria-label="O que listar" value={v.cine} onChange={e => filter({cine: e.target.value, cat: '', book: ''})}>
              {CINEMATIC_KINDS.map(o => (
                <option value={o[0]} key={o[0]}>
                  {o[1]}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {cine && v.cine === 'rules' ? (
          <div className="field" style={{margin: 0}}>
            <select id="combatCineCat" aria-label="Filtrar por tema" value={v.cat} onChange={e => filter({cat: e.target.value})}>
              <option value="">Todos os temas</option>
              {options.cats.map(c => (
                <option value={c} key={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {styles || cine ? null : (
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
        {cine ? null : <MestreOnly on={v.mine} onChange={mine => filter({mine})} />}
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

// Uma entrada da aba Cinematic: uma regra dos livros, ou uma perícia ou técnica cinemática (com o cartão da aba dela).
function CineEntryCard({x}: {x: {id: string}}) {
  if (W.cineIdx[x.id]) return <CinematicCard x={W.cineIdx[x.id]} />;
  if (W.techIdx[x.id]) return <TechCard t={W.techIdx[x.id]} />;
  return <CombatSkillCard s={x as Skill} />;
}

/** O selo do tema de uma regra cinemática ("Chambara", "Esforço extra"…); nada sem tema. */
export function CinematicBadge({x}: {x: Cinematic}) {
  return x.category ? (
    <span className="spell-badge adv-talent" title="Tema">
      {x.category}
    </span>
  ) : null;
}

function CinematicCard({x}: {x: Cinematic}) {
  return (
    <a className="spell-card adv-card" href={cinematicHref(x.id)}>
      <div className="adv-card-top">
        <strong>{x.name}</strong>
        <CinematicBadge x={x} />
      </div>
      {x.section ? <div className="adv-cost">{x.section}</div> : null}
      {x.description ? <div className="adv-desc">{x.description}</div> : null}
      <div className="adv-src">{source(x)}</div>
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
