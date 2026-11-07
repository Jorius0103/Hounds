import {useEffect, useState} from 'react';
import type {HubPageProps} from '../pages';
import {useHub} from '../data';
import {Crumbs} from '../ui/Crumbs';
import {openDialog} from '../ui/Dialog';
import {Icon} from '../ui/Icon';
import {PtName} from '../ui/PtName';
import {RestoreButton} from '../ui/RestoreButton';
import {VisibilityControls} from '../ui/Visibility';
import {showCombatTab} from './Combate';
import {StyleForm} from './EstiloForm';

// Página de um estilo de luta (#estilo~id), em Combate: a descrição e as listas (o que ensina e os traços opcionais), com
// as perícias, técnicas, vantagens e magias que estão nos catálogos levando às regras. As mesmas classes da versão
// antiga (css/paginas.css).
export function StylePage({route}: HubPageProps) {
  const {W} = useHub();
  const x = styleById(route.styleId);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const spells = !!(x && x.spells);

  useEffect(() => {
    ['styles', 'skills', 'techniques', 'advantages'].forEach(c => loadCatalog(c));
  }, []);
  // Os links das magias do estilo.
  useEffect(() => {
    if (spells) loadCatalog('spells');
  }, [spells]);

  if (!x) {
    return (
      <>
        <Crumbs node="combat" />
        {W.loaded.styles ? (
          <>
            <h1>Estilo não encontrado</h1>
            <p className="lede">Esse estilo pode ter sido excluído ou o link está incorreto.</p>
            <div>
              <a className="btn" href="#combate">
                Voltar para Combate
              </a>
            </div>
          </>
        ) : (
          <p className="lede">Carregando estilo…</p>
        )}
      </>
    );
  }

  const can = isMestre();
  const lists = (style: FightingStyle, defs: [StyleList, string][]) =>
    defs
      .filter(d => style[d[0]])
      .map(d => (
        <div className="style-list" key={d[0]}>
          <h3>{d[1]}</h3>
          <StyleChips text={style[d[0]]} kind={STYLE_KINDS[d[0]]} />
        </div>
      ));
  const taught = lists(x, STYLE_LISTS);

  function remove(target: FightingStyle) {
    setDeleting(true);
    Ops.deleteStyle(target).then(
      () => {
        toast('Estilo excluído.');
        showCombatTab('styles');
        go('#combate', true);
      },
      er => {
        setDeleting(false);
        toast(errorText(er), true);
      },
    );
  }

  return (
    <>
      <Crumbs node={'style:' + x.id} />
      <div className="head-row">
        <div>
          <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4}}>
            <span className="badge">
              <Icon paths={ICON.combat} size={12} stroke={2.4} />
              {' Estilo'}
            </span>
            {x.cost ? <span className="spell-badge adv-adv">{x.cost + ' pts'}</span> : null}
          </div>
          <h1>
            {x.name}
            <VisibilityControls item={x} col="styles" />
          </h1>
          <PtName item={x} as="p" />
          <p className="lede">{x.cost ? styleCost(x) + ' de Style Familiarity e perks obrigatórios' : 'Custo não informado'}</p>
        </div>
        {can ? (
          <div className="btn-row">
            {x.catalog && rawHas('styles', x.id) ? <RestoreButton col="styles" item={x} id="restoreStyleBtn" done="Estilo restaurado como no livro." /> : null}
            <button className="btn" type="button" id="editStyleBtn" onClick={() => openDialog(<StyleForm x={x} />)}>
              <Icon paths={ICON.edit} size={15} />
              Editar estilo
            </button>
            <button className="btn danger" type="button" id="delStyleBtn" onClick={() => setConfirmDelete(true)}>
              <Icon paths={ICON.trash} size={15} />
              Excluir
            </button>
          </div>
        ) : null}
      </div>
      {confirmDelete ? (
        <div className="confirm" role="alert">
          <span>
            Excluir o estilo <b>{x.name}</b>? Não dá para desfazer.
          </span>
          <div className="btn-row">
            <button className="btn danger solid" type="button" id="delStyleYes" disabled={deleting} onClick={() => remove(x)}>
              Excluir estilo
            </button>
            <button className="btn ghost" type="button" id="delStyleNo" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
      <div className="loc-layout style-layout">
        <div className="side" style={{gap: 22}}>
          <section>
            <h2 className="sec-title">Descrição</h2>
            {x.description ? <p className="long">{x.description}</p> : <p className="long none">Sem descrição cadastrada.</p>}
          </section>
        </div>
        <div className="side">
          <section className="box style-box">
            <h2 className="sec-title">O estilo ensina</h2>
            {taught.length ? taught : <p className="long none">Nada listado.</p>}
          </section>
          {STYLE_OPT_LISTS.some(d => x[d[0]]) ? (
            <section className="box style-box">
              <h2 className="sec-title">Traços opcionais</h2>
              {lists(x, STYLE_OPT_LISTS)}
            </section>
          ) : null}
          <p className="hint-text">{[x.book, x.page ? 'p. ' + x.page : ''].filter(Boolean).join(' · ') + '. As perícias, técnicas e vantagens destacadas abrem as regras.'}</p>
        </div>
      </div>
    </>
  );
}

// Os itens de uma lista do estilo, como o styleChipsHtml de js/tabs/tab-combate.js (que continua servindo ao modal das
// fichas): os que estão nos catálogos levam a eles (as perícias à página dentro de Combate; as magias abrem o modal).
function StyleChips({text, kind}: {text?: string; kind: string}) {
  return (
    <div className="style-chips">
      {styleItems(text).map((item, i) => {
        const hit = styleFind(kind, item);
        const href = !hit ? '' : kind === 'skill' ? combatSkillHref(hit.id) : kind === 'tech' ? techHref(hit.id) : kind === 'adv' ? hrefFor('adv:' + hit.id) : kind === 'spell' ? spellHref(hit.id) : '';
        return href ? (
          <a className="style-chip linked" href={href} data-spell-modal={kind === 'spell' ? hit!.id : undefined} key={i}>
            {item}
          </a>
        ) : (
          <span className="style-chip" key={i}>
            {item}
          </span>
        );
      })}
    </div>
  );
}
