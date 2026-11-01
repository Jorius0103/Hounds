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
import {AdvForm} from './VantagemForm';

const NONE = <span className="none">—</span>;

// Página de uma vantagem (#vantagem~id) ou de um perk (#perk~id): a descrição, os efeitos na ficha e os parâmetros, com as
// mesmas classes da versão antiga (css/paginas.css). Um perk aberto em Vantagens, ou o contrário, vai para a rota dele.
export function AdvantagePage({route}: HubPageProps) {
  const {W} = useHub();
  const a = advById(route.advId);
  const inPerks = route.page === 'perk';
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const elsewhere = !!a && isPerkEntry(a) !== inPerks;

  useEffect(() => {
    loadCatalog('advantages');
  }, []);
  useLayoutEffect(() => {
    if (a && elsewhere) go(advHref(a.id), true);
  });

  if (!a) {
    return (
      <>
        <Crumbs node={inPerks ? 'perks' : 'advs'} />
        {W.loaded.advantages ? (
          <>
            <h1>{inPerks ? 'Perk não encontrado' : 'Vantagem não encontrada'}</h1>
            <p className="lede">{(inPerks ? 'Esse perk pode ter sido excluído' : 'Essa vantagem pode ter sido excluída') + ' ou o link está incorreto.'}</p>
            <div>
              <a className="btn" href={inPerks ? '#perks' : '#vantagens'}>
                {inPerks ? 'Voltar para Perks' : 'Voltar para Vantagens'}
              </a>
            </div>
          </>
        ) : (
          <p className="lede">Carregando…</p>
        )}
      </>
    );
  }
  if (elsewhere) return null;

  const can = isMestre(), label = advTypeLabel(a.type);

  function remove(target: Advantage) {
    setDeleting(true);
    Ops.deleteAdvantage(target).then(
      () => {
        toast(inPerks ? 'Perk excluído.' : 'Vantagem excluída.');
        go(inPerks ? '#perks' : '#vantagens', true);
      },
      er => {
        setDeleting(false);
        toast(errorText(er), true);
      },
    );
  }

  return (
    <>
      <Crumbs node={(inPerks ? 'perk:' : 'adv:') + a.id} />
      <div className="head-row">
        <div>
          <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4}}>
            <span className="badge">
              <Icon paths={inPerks ? ICON.perk : ICON.advantage} size={12} stroke={2.4} />
              {inPerks ? ' Perk' : ' Vantagem'}
            </span>
            <span className={'spell-badge ' + advTypeClass(a.type)}>{label}</span>
          </div>
          <h1>
            {a.name}
            <VisibilityControls item={a} col="advantages" />
          </h1>
          <PtName item={a} as="p" />
          <p className="lede">{a.cost ? a.cost : 'Custo não informado'}</p>
        </div>
        {can ? (
          <div className="btn-row">
            {a.catalog && rawHas('advantages', a.id) ? <RestoreButton col="advantages" item={a} id="restoreAdvBtn" done="Vantagem restaurada como no livro." /> : null}
            <button className="btn" type="button" id="editAdvBtn" onClick={() => openDialog(<AdvForm a={a} />)}>
              <Icon paths={ICON.edit} size={15} />
              Editar vantagem
            </button>
            <button className="btn danger" type="button" id="delAdvBtn" onClick={() => setConfirmDelete(true)}>
              <Icon paths={ICON.trash} size={15} />
              Excluir
            </button>
          </div>
        ) : null}
      </div>
      {confirmDelete ? (
        <div className="confirm" role="alert">
          <span>
            Excluir a vantagem <b>{a.name}</b>? Não dá para desfazer.
          </span>
          <div className="btn-row">
            <button className="btn danger solid" type="button" id="delAdvYes" disabled={deleting} onClick={() => remove(a)}>
              Excluir vantagem
            </button>
            <button className="btn ghost" type="button" id="delAdvNo" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
      <div className="loc-layout">
        <div className="side" style={{gap: 22}}>
          <section>
            <h2 className="sec-title">Descrição</h2>
            {a.description ? <p className="long">{a.description}</p> : <p className="long none">Sem descrição cadastrada.</p>}
          </section>
          <AdvEffects a={a} can={can} />
        </div>
        <div className="side">
          <FoldBox foldKey="params" title="Parâmetros" startOpen>
            <dl className="facts">
              <dt>Custo</dt>
              <dd>{a.cost ? a.cost : NONE}</dd>
              <dt>Tipo</dt>
              <dd>
                {a.type ? (
                  <>
                    {label}
                    {label !== a.type ? (
                      <>
                        {' '}
                        <span className="none">{'(' + a.type + ')'}</span>
                      </>
                    ) : null}
                  </>
                ) : (
                  NONE
                )}
              </dd>
              <dt>Livro</dt>
              <dd>{a.book ? a.book : NONE}</dd>
              <dt>Página</dt>
              <dd>{a.page ? a.page : NONE}</dd>
            </dl>
          </FoldBox>
        </div>
      </div>
    </>
  );
}

// Os efeitos na ficha, como o advEffectsHtml de js/tabs/tab-vantagens.js (que continua servindo ao modal das fichas): os
// que o Mestre cadastrou; sem eles, os que o livro dá (ADV_BOOK, em js/tabs/ficha-efeitos.js); sem nenhum, o Mestre vê
// como cadastrar.
function AdvEffects({a, can}: {a: Advantage; can: boolean}) {
  const fx = advEffects(a);
  const book = fx.length ? [] : advBookFx(a, {name: a.name, pts: 0});
  if (book.length) {
    return (
      <section>
        <h2 className="sec-title">Efeitos na ficha (do livro)</h2>
        <ul className="fx-list">
          {book.map((e, i) => (
            <li key={i}>
              <b>{advEffectText(e)}</b>
            </li>
          ))}
        </ul>
        <p className="hint-text">
          {'Lidos do texto da vantagem e aplicados na ficha de quem a tem (os de uma versão maior, como Very Fit, seguem os pontos da ficha). ' +
            'Os que dependem do momento aparecem ao lado do campo, sem somar.'}
          {can ? (
            <>
              {' Cadastrar efeitos em '}
              <b>Editar vantagem</b>
              {' troca estes.'}
            </>
          ) : null}
        </p>
      </section>
    );
  }
  if (!fx.length) {
    return can ? (
      <section>
        <h2 className="sec-title">Efeitos na ficha</h2>
        <p className="long none">
          Nenhum efeito cadastrado. Use <b>Editar vantagem</b> para dizer o que ela soma na ficha.
        </p>
      </section>
    ) : null;
  }
  return (
    <section>
      <h2 className="sec-title">Efeitos na ficha</h2>
      <ul className="fx-list">
        {fx.map((e, i) => (
          <li key={i}>
            <b>{advEffectText(e)}</b>
            {e.note ? <small>{e.note}</small> : null}
          </li>
        ))}
      </ul>
      {ADV_FX_BUILTIN_RE.test(a.name) ? <p className="hint-text">A ficha já aplica esta vantagem sozinha; estes efeitos não são somados.</p> : null}
    </section>
  );
}
