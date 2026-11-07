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
import {ArmorForm} from './ArmaduraForm';
import {ArmorBadge} from './Armaduras';

// Os parâmetros que aparecem sempre: os comuns, e os de cada tipo (um escudo tem BD e PV; uma armadura, o local). Os
// outros só quando preenchidos, como o armorFactsHtml de js/tabs/tab-armaduras.js (que continua servindo ao modal das
// fichas).
const ALWAYS: Record<string, boolean> = {tl: true, cost: true, weight: true, book: true, page: true, dr: true};

// Página de uma armadura ou escudo (#armadura~id): as notas e os parâmetros, com as mesmas classes da versão antiga
// (css/paginas.css).
export function ArmorPage({route}: HubPageProps) {
  const {W} = useHub();
  const a = armorById(route.armorId);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadCatalog('armors');
  }, []);

  if (!a) {
    return (
      <>
        <Crumbs node="armors" />
        {W.loaded.armors ? (
          <>
            <h1>Armadura não encontrada</h1>
            <p className="lede">Essa armadura pode ter sido excluída ou o link está incorreto.</p>
            <div>
              <a className="btn" href="#armaduras">
                Voltar para Armaduras
              </a>
            </div>
          </>
        ) : (
          <p className="lede">Carregando armadura…</p>
        )}
      </>
    );
  }

  const can = isMestre(), shield = a.type === 'Shield', kind = shield ? 'escudo' : 'armadura', sum = armorSummary(a);
  // A coluna de notas da tabela é quase sempre só os números das notas de baixo ("[1, 3]"): aí o texto das notas é o que diz algo.
  const onlyRefs = /^[\s\d[\],]*$/.test(a.notes || '');
  const notes = [onlyRefs ? '' : a.notes, a.footnotes].filter(Boolean).join('\n');
  const always = (k: ArmorField) => ALWAYS[k] || (shield ? k === 'db' || k === 'hp' : k === 'location');

  function remove(target: Armor) {
    setDeleting(true);
    Ops.deleteArmor(target).then(
      () => {
        toast(shield ? 'Escudo excluído.' : 'Armadura excluída.');
        go('#armaduras', true);
      },
      er => {
        setDeleting(false);
        toast(errorText(er), true);
      },
    );
  }

  return (
    <>
      <Crumbs node={'armor:' + a.id} />
      <div className="head-row">
        <div>
          <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4}}>
            <span className="badge">
              <Icon paths={ICON.armor} size={12} stroke={2.4} />
              {' ' + armorTypeLabel(a.type)}
            </span>
            <ArmorBadge a={a} />
          </div>
          <h1>
            {a.name}
            <VisibilityControls item={a} col="armors" />
          </h1>
          <PtName item={a} as="p" />
          <p className="lede">{sum ? sum : 'Proteção não informada'}</p>
        </div>
        {can ? (
          <div className="btn-row">
            {a.catalog && rawHas('armors', a.id) ? <RestoreButton col="armors" item={a} id="restoreArmorBtn" done="Restaurada como no livro." /> : null}
            <button className="btn" type="button" id="editArmorBtn" onClick={() => openDialog(<ArmorForm a={a} />)}>
              <Icon paths={ICON.edit} size={15} />
              {'Editar ' + kind}
            </button>
            <button className="btn danger" type="button" id="delArmorBtn" onClick={() => setConfirmDelete(true)}>
              <Icon paths={ICON.trash} size={15} />
              Excluir
            </button>
          </div>
        ) : null}
      </div>
      {confirmDelete ? (
        <div className="confirm" role="alert">
          <span>
            {'Excluir ' + (shield ? 'o escudo' : 'a armadura') + ' '}
            <b>{a.name}</b>? Não dá para desfazer.
          </span>
          <div className="btn-row">
            <button className="btn danger solid" type="button" id="delArmorYes" disabled={deleting} onClick={() => remove(a)}>
              {'Excluir ' + kind}
            </button>
            <button className="btn ghost" type="button" id="delArmorNo" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
      <div className="loc-layout">
        <div className="side" style={{gap: 22}}>
          <section>
            <h2 className="sec-title">Notas</h2>
            {notes ? <p className="long">{notes}</p> : <p className="long none">Sem notas.</p>}
          </section>
        </div>
        <div className="side">
          <FoldBox foldKey="params" title="Parâmetros" startOpen>
            <dl className="facts">
              <dt>Tipo</dt>
              <dd>{armorTypeLabel(a.type)}</dd>
              {ARMOR_FIELDS.filter(f => a[f[0]] || always(f[0])).map(f => (
                <Fragment key={f[0]}>
                  <dt>{f[1]}</dt>
                  <dd>{a[f[0]] ? a[f[0]] : <span className="none">—</span>}</dd>
                </Fragment>
              ))}
            </dl>
          </FoldBox>
        </div>
      </div>
    </>
  );
}
