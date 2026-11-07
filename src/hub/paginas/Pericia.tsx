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
import {SkillBadge} from './Pericias';
import {SkillForm} from './PericiaForm';

// Página de uma perícia, em Perícias (#pericia~id) ou em Combate (#pericia-combate~id, pelas perícias de combate): a
// trilha, a volta e para onde vai a excluída seguem a lista de onde ela veio. As mesmas classes da versão antiga
// (css/paginas.css); o modal das fichas (openSkillModal, em js/tabs/tab-pericias.js) mostra o mesmo texto.
export function SkillPage({route}: HubPageProps) {
  const {W} = useHub();
  const s = skillById(route.skillId);
  const list = route.node!.indexOf('cskill:') === 0 ? 'combat' : 'skills';
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadCatalog('skills');
  }, []);

  if (!s) {
    return (
      <>
        <Crumbs node={list} />
        {W.loaded.skills ? (
          <>
            <h1>Perícia não encontrada</h1>
            <p className="lede">Essa perícia pode ter sido excluída ou o link está incorreto.</p>
            <div>
              <a className="btn" href={hrefFor(list)}>
                {'Voltar para ' + (list === 'combat' ? 'Combate' : 'Perícias')}
              </a>
            </div>
          </>
        ) : (
          <p className="lede">Carregando perícia…</p>
        )}
      </>
    );
  }

  const can = isMestre(), tags = skillTags(s);

  function remove(target: Skill) {
    setDeleting(true);
    Ops.deleteSkill(target).then(
      () => {
        toast('Perícia excluída.');
        go(hrefFor(list), true);
      },
      er => {
        setDeleting(false);
        toast(errorText(er), true);
      },
    );
  }

  return (
    <>
      <Crumbs node={route.node!} />
      <div className="head-row">
        <div>
          <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4}}>
            <span className="badge">
              <Icon paths={ICON.skill} size={12} stroke={2.4} />
              {' Perícia'}
            </span>
            <SkillBadge s={s} />
          </div>
          <h1>
            {s.name}
            <VisibilityControls item={s} col="skills" />
          </h1>
          <PtName item={s} as="p" />
          <p className="lede">{skillLede(s) + (tags ? ' · ' + tags : '')}</p>
        </div>
        {can ? (
          <div className="btn-row">
            {s.catalog && rawHas('skills', s.id) ? <RestoreButton col="skills" item={s} id="restoreSkillBtn" done="Perícia restaurada como no livro." /> : null}
            <button className="btn" type="button" id="editSkillBtn" onClick={() => openDialog(<SkillForm s={s} />)}>
              <Icon paths={ICON.edit} size={15} />
              Editar perícia
            </button>
            <button className="btn danger" type="button" id="delSkillBtn" onClick={() => setConfirmDelete(true)}>
              <Icon paths={ICON.trash} size={15} />
              Excluir
            </button>
          </div>
        ) : null}
      </div>
      {confirmDelete ? (
        <div className="confirm" role="alert">
          <span>
            Excluir a perícia <b>{s.name}</b>? Não dá para desfazer.
          </span>
          <div className="btn-row">
            <button className="btn danger solid" type="button" id="delSkillYes" disabled={deleting} onClick={() => remove(s)}>
              Excluir perícia
            </button>
            <button className="btn ghost" type="button" id="delSkillNo" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
      <div className="loc-layout">
        <div className="side" style={{gap: 22}}>
          <TextSection title="Descrição" text={s.description} empty="Sem descrição cadastrada." />
          {s.prerequisites ? <TextSection title="Pré-requisitos" text={s.prerequisites} /> : null}
          {s.modifiers ? <TextSection title="Modificadores" text={s.modifiers} /> : null}
        </div>
        <div className="side">
          <FoldBox foldKey="params" title="Parâmetros" startOpen>
            <dl className="facts">
              <Fact label="Atributo" value={s.attribute} />
              <Fact label="Dificuldade" value={s.difficulty ? SKILL_CAT_LABELS[s.difficulty] || s.difficulty : ''} />
              <Fact label="Padrão" value={s.defaults} />
              {s.attribute ? null : <Fact label="Tipo" value={s.type} />}
              <Fact label="Especialização" value={s.specialty ? 'Obrigatória' : 'Não'} />
              <Fact label="Cinemática" value={s.cinematic ? 'Sim' : 'Não'} />
              <Fact label="Livro" value={s.book} />
              <Fact label="Página" value={s.page} />
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
