import {useEffect, useState} from 'react';
import type {HubPageProps} from '../pages';
import {useHub} from '../data';
import {Crumbs} from '../ui/Crumbs';
import {openDialog} from '../ui/Dialog';
import {FoldBox} from '../ui/FoldBox';
import {Icon} from '../ui/Icon';
import {PtName} from '../ui/PtName';
import {RestoreButton} from '../ui/RestoreButton';
import {VisibilityControls} from '../ui/Visibility';
import {DisadvForm} from './DesvantagemForm';

const NONE = <span className="none">—</span>;

// Página de uma desvantagem (#desvantagem~id): a descrição, os efeitos que o livro dá na ficha e os parâmetros, com as
// mesmas classes da versão antiga (css/paginas.css).
export function DisadvantagePage({route}: HubPageProps) {
  const {W} = useHub();
  const d = disadvById(route.disadvId);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadCatalog('disadvantages');
  }, []);

  if (!d) {
    return (
      <>
        <Crumbs node="disadvs" />
        {W.loaded.disadvantages ? (
          <>
            <h1>Desvantagem não encontrada</h1>
            <p className="lede">Essa desvantagem pode ter sido excluída ou o link está incorreto.</p>
            <div>
              <a className="btn" href="#desvantagens">
                Voltar para Desvantagens
              </a>
            </div>
          </>
        ) : (
          <p className="lede">Carregando desvantagem…</p>
        )}
      </>
    );
  }

  const can = isMestre(), label = disadvTypeLabel(d.type);

  function remove(target: Disadvantage) {
    setDeleting(true);
    Ops.deleteDisadvantage(target).then(
      () => {
        toast('Desvantagem excluída.');
        go('#desvantagens', true);
      },
      er => {
        setDeleting(false);
        toast(errorText(er), true);
      },
    );
  }

  return (
    <>
      <Crumbs node={'disadv:' + d.id} />
      <div className="head-row">
        <div>
          <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4}}>
            <span className="badge">
              <Icon paths={ICON.disadvantage} size={12} stroke={2.4} />
              {' Desvantagem'}
            </span>
            <span className={'spell-badge ' + disadvTypeClass(d.type)}>{label}</span>
          </div>
          <h1>
            {d.name}
            <VisibilityControls item={d} col="disadvantages" />
          </h1>
          <PtName item={d} as="p" />
          <p className="lede">{(d.cost ? d.cost : 'Custo não informado') + (d.selfControl ? ' · teste de autocontrole' : '')}</p>
        </div>
        {can ? (
          <div className="btn-row">
            {d.catalog && rawHas('disadvantages', d.id) ? <RestoreButton col="disadvantages" item={d} id="restoreDisadvBtn" done="Desvantagem restaurada como no livro." /> : null}
            <button className="btn" type="button" id="editDisadvBtn" onClick={() => openDialog(<DisadvForm d={d} />)}>
              <Icon paths={ICON.edit} size={15} />
              Editar desvantagem
            </button>
            <button className="btn danger" type="button" id="delDisadvBtn" onClick={() => setConfirmDelete(true)}>
              <Icon paths={ICON.trash} size={15} />
              Excluir
            </button>
          </div>
        ) : null}
      </div>
      {confirmDelete ? (
        <div className="confirm" role="alert">
          <span>
            Excluir a desvantagem <b>{d.name}</b>? Não dá para desfazer.
          </span>
          <div className="btn-row">
            <button className="btn danger solid" type="button" id="delDisadvYes" disabled={deleting} onClick={() => remove(d)}>
              Excluir desvantagem
            </button>
            <button className="btn ghost" type="button" id="delDisadvNo" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
      <div className="loc-layout">
        <div className="side" style={{gap: 22}}>
          <section>
            <h2 className="sec-title">Descrição</h2>
            {d.description ? <p className="long">{d.description}</p> : <p className="long none">Sem descrição cadastrada.</p>}
          </section>
          <DisadvEffects d={d} />
        </div>
        <div className="side">
          <FoldBox foldKey="params" title="Parâmetros" startOpen>
            <dl className="facts">
              <dt>Custo</dt>
              <dd>{d.cost ? d.cost : NONE}</dd>
              <dt>Tipo</dt>
              <dd>
                {d.type ? (
                  <>
                    {label}
                    {label !== d.type ? (
                      <>
                        {' '}
                        <span className="none">{'(' + d.type + ')'}</span>
                      </>
                    ) : null}
                  </>
                ) : (
                  NONE
                )}
              </dd>
              <dt>Classes</dt>
              <dd>{d.classes ? disadvClassText(d) : NONE}</dd>
              <dt>Autocontrole</dt>
              <dd>{d.selfControl ? 'Sim' : 'Não'}</dd>
              <dt>Livro</dt>
              <dd>{d.book ? d.book : NONE}</dd>
              <dt>Página</dt>
              <dd>{d.page ? d.page : NONE}</dd>
            </dl>
          </FoldBox>
        </div>
      </div>
    </>
  );
}

// O que o livro diz que ela tira da ficha de quem a tem (DISADV_BOOK, em js/tabs/ficha-efeitos.js), como o
// disadvEffectsHtml de js/tabs/tab-desvantagens.js (que continua servindo ao modal das fichas); nada quando não há.
function DisadvEffects({d}: {d: Disadvantage}) {
  const fx = disadvBookFx(d, {name: d.name, cost: 0, levels: 0});
  if (!fx.length) return null;
  return (
    <section>
      <h2 className="sec-title">Efeitos na ficha (do livro)</h2>
      <ul className="fx-list">
        {fx.map((e, i) => (
          <li key={i}>
            <b>{advEffectText(e)}</b>
          </li>
        ))}
      </ul>
      <p className="hint-text">
        {'Lidos do texto da desvantagem e aplicados na ficha de quem a tem (os de uma versão mais forte, como Very Fat ou Shyness grave, seguem os pontos da ficha). ' +
          'Os que dependem do momento aparecem ao lado do campo, sem somar.'}
      </p>
    </section>
  );
}
