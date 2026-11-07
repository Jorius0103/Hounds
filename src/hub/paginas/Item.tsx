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
import {ItemForm} from './ItemForm';

// Página de um item (#item~id): a descrição e os parâmetros, com as mesmas classes da versão antiga (css/paginas.css). O
// modal das fichas (js/tabs/modais-catalogo.js) mostra o mesmo.
export function ItemPage({route}: HubPageProps) {
  const {W} = useHub();
  const x = itemById(route.itemId);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadCatalog('items');
  }, []);

  if (!x) {
    return (
      <>
        <Crumbs node="items" />
        {W.loaded.items ? (
          <>
            <h1>Item não encontrado</h1>
            <p className="lede">Esse item pode ter sido excluído ou o link está incorreto.</p>
            <div>
              <a className="btn" href="#itens">
                Voltar para Itens
              </a>
            </div>
          </>
        ) : (
          <p className="lede">Carregando item…</p>
        )}
      </>
    );
  }

  const can = isMestre();

  function remove(target: GearItem) {
    setDeleting(true);
    Ops.deleteItem(target).then(
      () => {
        toast('Item excluído.');
        go('#itens', true);
      },
      er => {
        setDeleting(false);
        toast(errorText(er), true);
      },
    );
  }

  return (
    <>
      <Crumbs node={'item:' + x.id} />
      <div className="head-row">
        <div>
          <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4}}>
            <span className="badge">
              <Icon paths={ICON.item} size={12} stroke={2.4} />
              {' Item'}
            </span>
            {x.category ? <span className="spell-badge adv-exp">{x.category}</span> : null}
          </div>
          <h1>
            {x.name}
            <VisibilityControls item={x} col="items" />
          </h1>
          <PtName item={x} as="p" />
          <p className="lede">{[x.cost || 'Custo não informado', x.weight].filter(Boolean).join(' · ')}</p>
        </div>
        {can ? (
          <div className="btn-row">
            {x.catalog && rawHas('items', x.id) ? <RestoreButton col="items" item={x} id="restoreItemBtn" done="Item restaurado como no livro." /> : null}
            <button className="btn" type="button" id="editItemBtn" onClick={() => openDialog(<ItemForm x={x} />)}>
              <Icon paths={ICON.edit} size={15} />
              Editar item
            </button>
            <button className="btn danger" type="button" id="delItemBtn" onClick={() => setConfirmDelete(true)}>
              <Icon paths={ICON.trash} size={15} />
              Excluir
            </button>
          </div>
        ) : null}
      </div>
      {confirmDelete ? (
        <div className="confirm" role="alert">
          <span>
            Excluir o item <b>{x.name}</b>? Não dá para desfazer.
          </span>
          <div className="btn-row">
            <button className="btn danger solid" type="button" id="delItemYes" disabled={deleting} onClick={() => remove(x)}>
              Excluir item
            </button>
            <button className="btn ghost" type="button" id="delItemNo" onClick={() => setConfirmDelete(false)}>
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
              {ITEM_FIELDS.map(f => (
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
