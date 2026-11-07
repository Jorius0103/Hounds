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
import {WeaponForm} from './ArmaForm';
import {WeaponBadge} from './Armas';

// Página de uma arma (#arma~id): a tabela de ataques, a descrição, as notas da tabela e os parâmetros, com as mesmas
// classes da versão antiga (css/paginas.css). O modal das fichas (js/tabs/modais-catalogo.js) mostra o mesmo.
export function WeaponPage({route}: HubPageProps) {
  const {W} = useHub();
  const w = weaponById(route.weaponId);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadCatalog('weapons');
  }, []);

  if (!w) {
    return (
      <>
        <Crumbs node="weapons" />
        {W.loaded.weapons ? (
          <>
            <h1>Arma não encontrada</h1>
            <p className="lede">Essa arma pode ter sido excluída ou o link está incorreto.</p>
            <div>
              <a className="btn" href="#armas">
                Voltar para Armas
              </a>
            </div>
          </>
        ) : (
          <p className="lede">Carregando arma…</p>
        )}
      </>
    );
  }

  const can = isMestre(), skills = weaponSkills(w);

  function remove(target: Weapon) {
    setDeleting(true);
    Ops.deleteWeapon(target).then(
      () => {
        toast('Arma excluída.');
        go('#armas', true);
      },
      er => {
        setDeleting(false);
        toast(errorText(er), true);
      },
    );
  }

  return (
    <>
      <Crumbs node={'weapon:' + w.id} />
      <div className="head-row">
        <div>
          <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4}}>
            <span className="badge">
              <Icon paths={ICON.weapon} size={12} stroke={2.4} />
              {' Arma'}
            </span>
            <WeaponBadge w={w} />
          </div>
          <h1>
            {w.name}
            <VisibilityControls item={w} col="weapons" />
          </h1>
          <PtName item={w} as="p" />
          <p className="lede">{skills.length ? skills.join(', ') : 'Perícia não informada'}</p>
        </div>
        {can ? (
          <div className="btn-row">
            {w.catalog && rawHas('weapons', w.id) ? <RestoreButton col="weapons" item={w} id="restoreWeaponBtn" done="Arma restaurada como no livro." /> : null}
            <button className="btn" type="button" id="editWeaponBtn" onClick={() => openDialog(<WeaponForm w={w} />)}>
              <Icon paths={ICON.edit} size={15} />
              Editar arma
            </button>
            <button className="btn danger" type="button" id="delWeaponBtn" onClick={() => setConfirmDelete(true)}>
              <Icon paths={ICON.trash} size={15} />
              Excluir
            </button>
          </div>
        ) : null}
      </div>
      {confirmDelete ? (
        <div className="confirm" role="alert">
          <span>
            Excluir a arma <b>{w.name}</b>? Não dá para desfazer.
          </span>
          <div className="btn-row">
            <button className="btn danger solid" type="button" id="delWeaponYes" disabled={deleting} onClick={() => remove(w)}>
              Excluir arma
            </button>
            <button className="btn ghost" type="button" id="delWeaponNo" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
      <div className="loc-layout">
        <div className="side" style={{gap: 22}}>
          <section>
            <h2 className="sec-title">Ataques</h2>
            <WeaponAttacks w={w} />
          </section>
          <section>
            <h2 className="sec-title">Descrição</h2>
            {w.description ? <p className="long">{w.description}</p> : <p className="long none">Sem descrição cadastrada.</p>}
          </section>
          {w.footnotes ? (
            <section>
              <h2 className="sec-title">Notas da tabela</h2>
              <p className="long">{w.footnotes}</p>
            </section>
          ) : null}
        </div>
        <div className="side">
          <FoldBox foldKey="params" title="Parâmetros" startOpen>
            <dl className="facts">
              <Fact label="TL" value={w.tl} />
              <Fact label="Tipo" value={w.type ? weaponTypeLabel(w.type) : ''} />
              <Fact label="Custo" value={w.cost} />
              <Fact label="Peso (lb)" value={w.weight} />
              <Fact label="Legalidade (CL)" value={w.lc} />
              <Fact label="Tabela" value={w.table} />
              <Fact label="Livro" value={w.book} />
              <Fact label="Página" value={w.page} />
            </dl>
          </FoldBox>
        </div>
      </div>
    </>
  );
}

// A tabela de ataques, como o weaponAttacksHtml de js/tabs/tab-armas.js (que continua servindo às fichas e ao modal):
// só as colunas que algum ataque preenche, e a perícia uma vez para a sequência de ataques dela, com os padrões embaixo.
function WeaponAttacks({w}: {w: Weapon}) {
  const list = w.attacks || [];
  if (!list.length) return <p className="long none">Sem ataques cadastrados.</p>;
  const cols = WEAPON_ATTACK_COLS.filter(c => list.some(a => a[c[0]]));
  const hasMode = list.some(a => a.mode), hasNotes = list.some(a => a.notes);
  return (
    <div className="wtab-wrap">
      <table className="gtab wtab">
        <thead>
          <tr>
            <th>Perícia</th>
            {hasMode ? <th>Modo</th> : null}
            {cols.map(c => (
              <th key={c[0]}>{c[1]}</th>
            ))}
            {hasNotes ? <th>Notas</th> : null}
          </tr>
        </thead>
        <tbody>
          {list.map((a, i) => {
            const prev = list[i - 1], same = !!prev && prev.skill === a.skill && prev.defaults === a.defaults;
            return (
              <tr key={i}>
                <td>
                  {same ? null : (
                    <>
                      {a.skill ? <b>{a.skill}</b> : <span className="none">—</span>}
                      {a.defaults ? <small>{a.defaults}</small> : null}
                    </>
                  )}
                </td>
                {hasMode ? <td className="wmode">{weaponModeText(a.mode)}</td> : null}
                {cols.map(c => (
                  <td key={c[0]}>{a[c[0]] ? a[c[0]] : <span className="none">—</span>}</td>
                ))}
                {hasNotes ? <td className="wnotes">{a.notes || ''}</td> : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
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
