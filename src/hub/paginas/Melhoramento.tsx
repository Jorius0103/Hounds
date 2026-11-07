import {Fragment, useEffect, useState} from 'react';
import type {HubPageProps} from '../pages';
import {useHub} from '../data';
import {Crumbs} from '../ui/Crumbs';
import {openDialog} from '../ui/Dialog';
import {FoldBox} from '../ui/FoldBox';
import {Icon} from '../ui/Icon';
import {PtName} from '../ui/PtName';
import {RestoreButton} from '../ui/RestoreButton';
import {VisibilityControls} from '../ui/Visibility';
import {ImprovementForm} from './MelhoramentoForm';

// Página de um melhoramento (#melhoramento~id): a descrição e os parâmetros, com as mesmas classes da versão antiga
// (css/paginas.css). O modal das fichas (js/tabs/modais-catalogo.js) mostra o mesmo.
export function ImprovementPage({route}: HubPageProps) {
  const {W} = useHub();
  const x = improvementById(route.improvementId);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadCatalog('improvements');
  }, []);

  if (!x) {
    return (
      <>
        <Crumbs node="improvements" />
        {W.loaded.improvements ? (
          <>
            <h1>Melhoramento não encontrado</h1>
            <p className="lede">Esse melhoramento pode ter sido excluído ou o link está incorreto.</p>
            <div>
              <a className="btn" href="#melhoramentos">
                Voltar para Melhoramentos
              </a>
            </div>
          </>
        ) : (
          <p className="lede">Carregando melhoramento…</p>
        )}
      </>
    );
  }

  const can = isMestre();

  function remove(target: Improvement) {
    setDeleting(true);
    Ops.deleteImprovement(target).then(
      () => {
        toast('Melhoramento excluído.');
        go('#melhoramentos', true);
      },
      er => {
        setDeleting(false);
        toast(errorText(er), true);
      },
    );
  }

  return (
    <>
      <Crumbs node={'impr:' + x.id} />
      <div className="head-row">
        <div>
          <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4}}>
            <span className="badge">
              <Icon paths={ICON.improvement} size={12} stroke={2.4} />
              {' Melhoramento'}
            </span>
            {x.appliesTo ? <span className="spell-badge adv-exp">{x.appliesTo}</span> : null}
          </div>
          <h1>
            {x.name}
            <VisibilityControls item={x} col="improvements" />
          </h1>
          <PtName item={x} as="p" />
          <p className="lede">{[x.cost || 'Custo não informado', x.weight ? 'Peso ' + x.weight : ''].filter(Boolean).join(' · ')}</p>
        </div>
        {can ? (
          <div className="btn-row">
            {x.catalog && rawHas('improvements', x.id) ? (
              <RestoreButton col="improvements" item={x} id="restoreImprovementBtn" done="Melhoramento restaurado como no livro." />
            ) : null}
            <button className="btn" type="button" id="editImprovementBtn" onClick={() => openDialog(<ImprovementForm x={x} />)}>
              <Icon paths={ICON.edit} size={15} />
              Editar melhoramento
            </button>
            <button className="btn danger" type="button" id="delImprovementBtn" onClick={() => setConfirmDelete(true)}>
              <Icon paths={ICON.trash} size={15} />
              Excluir
            </button>
          </div>
        ) : null}
      </div>
      {confirmDelete ? (
        <div className="confirm" role="alert">
          <span>
            Excluir o melhoramento <b>{x.name}</b>? Não dá para desfazer.
          </span>
          <div className="btn-row">
            <button className="btn danger solid" type="button" id="delImprovementYes" disabled={deleting} onClick={() => remove(x)}>
              Excluir melhoramento
            </button>
            <button className="btn ghost" type="button" id="delImprovementNo" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
      <div className="loc-layout">
        <div className="side" style={{gap: 22}}>
          <section>
            <h2 className="sec-title">Descrição</h2>
            {x.description ? <p className="long">{x.description}</p> : <p className="long none">Sem descrição cadastrada.</p>}
          </section>
        </div>
        <div className="side">
          <FoldBox foldKey="params" title="Parâmetros" startOpen>
            <dl className="facts">
              {IMPROVEMENT_FIELDS.map(f => (
                <Fragment key={f[0]}>
                  <dt>{f[1]}</dt>
                  <dd>{x[f[0]] ? x[f[0]] : <span className="none">—</span>}</dd>
                </Fragment>
              ))}
            </dl>
          </FoldBox>
        </div>
      </div>
    </>
  );
}
