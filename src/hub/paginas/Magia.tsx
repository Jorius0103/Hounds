import {useEffect, useLayoutEffect, useState} from 'react';
import type {HubPageProps} from '../pages';
import {useHub} from '../data';
import {Crumbs} from '../ui/Crumbs';
import {openDialog} from '../ui/Dialog';
import {FoldBox} from '../ui/FoldBox';
import {Icon} from '../ui/Icon';
import {PtName} from '../ui/PtName';
import {RestoreButton} from '../ui/RestoreButton';
import {VisibilityControls} from '../ui/Visibility';
import {SpellForm} from './MagiaForm';

const NONE = <span className="none">—</span>;

// Página de uma magia (#magia~id): o efeito, o item mágico, os pré-requisitos e os parâmetros, com as mesmas classes da
// versão antiga (css/paginas.css). O Mestre edita, exclui e restaura o original de uma magia dos livros que mudou.
export function SpellPage({route}: HubPageProps) {
  const {W} = useHub();
  const s = spellById(route.spellId);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const moved = !!s && s.id !== route.spellId;

  useEffect(() => {
    loadCatalog('spells');
  }, []);
  // Um id que não é o da magia (um link antigo, achado pelo nome) vai para o endereço dela, sem criar histórico.
  useLayoutEffect(() => {
    if (s && moved) go(spellHref(s.id), true);
  });

  if (moved) return null;
  if (!s) {
    return (
      <>
        <Crumbs node="spells" />
        {W.loaded.spells ? (
          <>
            <h1>Magia não encontrada</h1>
            <p className="lede">Essa magia pode ter sido excluída ou o link está incorreto.</p>
            <div>
              <a className="btn" href="#magias">
                Voltar para Magias
              </a>
            </div>
          </>
        ) : (
          <p className="lede">Carregando magia…</p>
        )}
      </>
    );
  }

  const can = isMestre(), vh = (s.difficulty || '').toUpperCase() === 'VH';

  function remove(target: Spell) {
    setDeleting(true);
    Ops.deleteSpell(target).then(
      () => {
        toast('Magia excluída.');
        go('#magias', true);
      },
      er => {
        setDeleting(false);
        toast(errorText(er), true);
      },
    );
  }

  return (
    <>
      <Crumbs node={'spell:' + s.id} />
      <div className="head-row">
        <div>
          <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4}}>
            <span className="badge">
              <Icon paths={ICON.spell} size={12} stroke={2.4} />
              {' Magia'}
            </span>
            <span className={'spell-badge ' + (vh ? 'diff-vh' : 'diff-h')}>{vh ? 'Very Hard (VH)' : 'Hard (H)'}</span>
          </div>
          <h1>
            {s.name}
            <VisibilityControls item={s} col="spells" />
          </h1>
          <PtName item={s} as="p" />
          <p className="lede">{(s.college ? s.college : 'Sem escola') + (s.class ? ' · ' + s.class : '')}</p>
        </div>
        {can ? (
          <div className="btn-row">
            {s.catalog && rawHas('spells', s.id) ? <RestoreButton col="spells" item={s} id="restoreSpellBtn" done="Magia restaurada como no livro." /> : null}
            <button className="btn" type="button" id="editSpellBtn" onClick={() => openDialog(<SpellForm s={s} />)}>
              <Icon paths={ICON.edit} size={15} />
              Editar magia
            </button>
            <button className="btn danger" type="button" id="delSpellBtn" onClick={() => setConfirmDelete(true)}>
              <Icon paths={ICON.trash} size={15} />
              Excluir
            </button>
          </div>
        ) : null}
      </div>
      {confirmDelete ? (
        <div className="confirm" role="alert">
          <span>
            Excluir a magia <b>{s.name}</b>? Não dá para desfazer.
          </span>
          <div className="btn-row">
            <button className="btn danger solid" type="button" id="delSpellYes" disabled={deleting} onClick={() => remove(s)}>
              Excluir magia
            </button>
            <button className="btn ghost" type="button" id="delSpellNo" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
      <div className="loc-layout">
        <div className="side" style={{gap: 22}}>
          <section>
            <h2 className="sec-title">Efeito e Descrição</h2>
            {s.description ? <p className="long">{s.description}</p> : <p className="long none">Sem descrição cadastrada.</p>}
          </section>
          {s.item ? <BoxSection title="Item Mágico" text={s.item} /> : null}
          {s.prerequisites ? <BoxSection title="Pré-requisitos" text={s.prerequisites} /> : null}
        </div>
        <div className="side">
          <FoldBox foldKey="params" title="Parâmetros" startOpen>
            <dl className="facts">
              <dt>Escola / Colégio</dt>
              <dd>{s.college ? s.college : <span className="none">Não informado</span>}</dd>
              <dt>Classe</dt>
              <dd>{s.class ? s.class : <span className="none">Não informado</span>}</dd>
              <dt>Dificuldade</dt>
              <dd>{'IQ/' + (s.difficulty || 'H')}</dd>
              <dt>Tempo de Conjuração</dt>
              <dd>{s.timeToCast ? s.timeToCast : NONE}</dd>
              <dt>Duração</dt>
              <dd>{s.duration ? s.duration : NONE}</dd>
              {/* Os livros dão o custo de lançar e o de manter num texto só; o de manutenção à parte só aparece preenchido. */}
              <dt>{s.maintenanceCost ? 'Custo Inicial' : 'Custo'}</dt>
              <dd>{s.initialCost ? s.initialCost : NONE}</dd>
              {s.maintenanceCost ? (
                <>
                  <dt>Custo Manutenção</dt>
                  <dd>{s.maintenanceCost}</dd>
                </>
              ) : null}
              <dt>Página</dt>
              <dd>{s.page ? s.page : NONE}</dd>
              <dt>Fonte</dt>
              <dd>{s.source ? s.source : NONE}</dd>
            </dl>
          </FoldBox>
        </div>
      </div>
    </>
  );
}

function BoxSection({title, text}: {title: string; text: string}) {
  return (
    <section>
      <h2 className="sec-title">{title}</h2>
      <div className="box" style={{margin: 0}}>
        <p style={{margin: 0, fontSize: 14, lineHeight: 1.6}}>{text}</p>
      </div>
    </section>
  );
}
