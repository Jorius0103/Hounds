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
import {CinematicForm} from './CinematicaForm';
import {CinematicBadge, showCombatTab} from './Combate';

// Página de uma regra cinemática (#cinematica~id), em Combate: o texto, o tema e de onde ela vem, com as mesmas classes
// da página de uma técnica (css/paginas.css). O Mestre edita, exclui, oculta e restaura (as regras dos livros ficam em
// dados/cinematicas.json; as mudanças dele e as regras que ele cria, na tabela cinematicas). O link de volta abre
// Combate na aba Cinematic.
export function CinematicPage({route}: HubPageProps) {
  const {W} = useHub();
  const x = cinematicById(route.cineId);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadCatalog('cinematics');
  }, []);

  const back = (
    <a className="btn" href="#combate" id="cineBackBtn" onClick={() => showCombatTab('cine')}>
      <Icon paths={ICON.cinematic} size={15} />
      Ver as regras cinemáticas
    </a>
  );

  if (!x) {
    return (
      <>
        <Crumbs node="combat" />
        {W.loaded.cinematics ? (
          <>
            <h1>Regra cinemática não encontrada</h1>
            <p className="lede">Essa regra pode ter sido excluída ou o link está incorreto.</p>
            <div>{back}</div>
          </>
        ) : (
          <p className="lede">Carregando regra…</p>
        )}
      </>
    );
  }

  const can = isMestre();
  const source = [x.book, x.page ? 'p. ' + x.page : ''].filter(Boolean).join(' · ');

  function remove(target: Cinematic) {
    setDeleting(true);
    Ops.deleteCinematic(target).then(
      () => {
        toast('Regra cinemática excluída.');
        showCombatTab('cine');
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
      <Crumbs node={'cine:' + x.id} />
      <div className="head-row">
        <div>
          <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4}}>
            <span className="badge">
              <Icon paths={ICON.cinematic} size={12} stroke={2.4} />
              {' Cinematic'}
            </span>
            <CinematicBadge x={x} />
          </div>
          <h1>
            {x.name}
            <VisibilityControls item={x} col="cinematics" />
          </h1>
          <PtName item={x} as="p" />
          <p className="lede">{[x.section, source].filter(Boolean).join(' · ')}</p>
        </div>
        <div className="btn-row">
          {back}
          {can && x.catalog && rawHas('cinematics', x.id) ? (
            <RestoreButton col="cinematics" item={x} id="restoreCineBtn" done="Regra restaurada como no livro." />
          ) : null}
          {can ? (
            <>
              <button className="btn" type="button" id="editCineBtn" onClick={() => openDialog(<CinematicForm x={x} />)}>
                <Icon paths={ICON.edit} size={15} />
                Editar regra
              </button>
              <button className="btn danger" type="button" id="delCineBtn" onClick={() => setConfirmDelete(true)}>
                <Icon paths={ICON.trash} size={15} />
                Excluir
              </button>
            </>
          ) : null}
        </div>
      </div>
      {confirmDelete ? (
        <div className="confirm" role="alert">
          <span>
            Excluir a regra <b>{x.name}</b>? Não dá para desfazer.
          </span>
          <div className="btn-row">
            <button className="btn danger solid" type="button" id="delCineYes" disabled={deleting} onClick={() => remove(x)}>
              Excluir regra
            </button>
            <button className="btn ghost" type="button" id="delCineNo" onClick={() => setConfirmDelete(false)}>
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
              <Fact label="Tema" value={x.category} />
              <Fact label="Seção do livro" value={x.section} />
              <Fact label="Livro" value={x.book} />
              <Fact label="Página" value={x.page} />
            </dl>
          </FoldBox>
        </div>
      </div>
    </>
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
