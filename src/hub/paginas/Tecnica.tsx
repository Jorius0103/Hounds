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
import {showCombatTab, TechBadge} from './Combate';
import {TechForm} from './TecnicaForm';

// Página de uma técnica (#tecnica~id), em Combate: a descrição, os pré-requisitos, os modificadores e os parâmetros, com as
// mesmas classes da versão antiga (css/paginas.css). O modal das fichas (openTechModal, em js/tabs/tab-combate.js) mostra
// o mesmo texto.
export function TechniquePage({route}: HubPageProps) {
  const {W} = useHub();
  const t = techById(route.techId);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadCatalog('techniques');
  }, []);

  if (!t) {
    return (
      <>
        <Crumbs node="combat" />
        {W.loaded.techniques ? (
          <>
            <h1>Técnica não encontrada</h1>
            <p className="lede">Essa técnica pode ter sido excluída ou o link está incorreto.</p>
            <div>
              <a className="btn" href="#combate">
                Voltar para Combate
              </a>
            </div>
          </>
        ) : (
          <p className="lede">Carregando técnica…</p>
        )}
      </>
    );
  }

  const can = isMestre(), diff = TECH_DIFF_LABELS[t.difficulty || ''] || t.difficulty || '';

  function remove(target: Technique) {
    setDeleting(true);
    Ops.deleteTechnique(target).then(
      () => {
        toast('Técnica excluída.');
        showCombatTab('techs');
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
      <Crumbs node={'tech:' + t.id} />
      <div className="head-row">
        <div>
          <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4}}>
            <span className="badge">
              <Icon paths={ICON.combat} size={12} stroke={2.4} />
              {' Técnica'}
            </span>
            <TechBadge t={t} />
          </div>
          <h1>
            {t.name}
            <VisibilityControls item={t} col="techniques" />
          </h1>
          <PtName item={t} as="p" />
          <p className="lede">{'Técnica ' + diff + (t.cinematic ? ' · Cinemática' : '') + (t.defaults ? ' · Padrão: ' + t.defaults : '')}</p>
        </div>
        {can ? (
          <div className="btn-row">
            {t.catalog && rawHas('techniques', t.id) ? <RestoreButton col="techniques" item={t} id="restoreTechBtn" done="Técnica restaurada como no livro." /> : null}
            <button className="btn" type="button" id="editTechBtn" onClick={() => openDialog(<TechForm t={t} />)}>
              <Icon paths={ICON.edit} size={15} />
              Editar técnica
            </button>
            <button className="btn danger" type="button" id="delTechBtn" onClick={() => setConfirmDelete(true)}>
              <Icon paths={ICON.trash} size={15} />
              Excluir
            </button>
          </div>
        ) : null}
      </div>
      {confirmDelete ? (
        <div className="confirm" role="alert">
          <span>
            Excluir a técnica <b>{t.name}</b>? Não dá para desfazer.
          </span>
          <div className="btn-row">
            <button className="btn danger solid" type="button" id="delTechYes" disabled={deleting} onClick={() => remove(t)}>
              Excluir técnica
            </button>
            <button className="btn ghost" type="button" id="delTechNo" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
      <div className="loc-layout">
        <div className="side" style={{gap: 22}}>
          <TextSection title="Descrição" text={t.description} empty="Sem descrição cadastrada." />
          {t.prerequisites ? <TextSection title="Pré-requisitos" text={t.prerequisites} /> : null}
          {t.modifiers ? <TextSection title="Modificadores" text={t.modifiers} /> : null}
        </div>
        <div className="side">
          <FoldBox foldKey="params" title="Parâmetros" startOpen>
            <dl className="facts">
              <Fact label="Dificuldade" value={TECH_DIFF_LABELS[t.difficulty || ''] || t.difficulty} />
              <Fact label="Padrão" value={t.defaults} />
              <Fact label="Cinemática" value={t.cinematic ? 'Sim' : 'Não'} />
              <Fact label="Livro" value={t.book} />
              <Fact label="Página" value={t.page} />
            </dl>
          </FoldBox>
        </div>
      </div>
    </>
  );
}

function TextSection({title, text, empty = ''}: {title: string; text?: string; empty?: string}) {
  return (
    <section>
      <h2 className="sec-title">{title}</h2>
      {text ? <p className="long">{text}</p> : <p className="long none">{empty}</p>}
    </section>
  );
}

function Fact({label, value}: {label: string; value?: string}) {
  return (
    <Fragment>
      <dt>{label}</dt>
      <dd>{value ? value : <span className="none">—</span>}</dd>
    </Fragment>
  );
}
