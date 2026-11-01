import {Fragment, useState} from 'react';
import type {HubPageProps} from '../pages';
import {useHub} from '../data';
import {Crumbs} from '../ui/Crumbs';
import {openDialog} from '../ui/Dialog';
import {FoldBox} from '../ui/FoldBox';
import {Icon} from '../ui/Icon';
import {useImageUrl} from '../ui/ImageSlot';
import {RowLink} from '../ui/RowLink';
import {VisibilityControls} from '../ui/Visibility';
import {CharForm} from './PersonagemForm';

// Página de um personagem (#personagem~id): a raça e as organizações, o retrato, a descrição e as caixas do lado
// (informações, a ficha, relacionamentos, eventos, mapas e locais), com as mesmas classes da versão antiga
// (css/paginas.css). O formulário de escolher a ficha continua no modal antigo (o openSheetLinkForm de
// js/tabs/tab-fichas.js).
export function CharPage({route}: HubPageProps) {
  const {W} = useHub();
  const c = charById(route.charId);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const heroUrl = useImageUrl(c && c.image && c.image.ref);

  if (!c) {
    return (
      <>
        <Crumbs node="chars" />
        {W.loaded.characters ? (
          <>
            <h1>Personagem não encontrado</h1>
            <p className="lede">Esse personagem foi excluído ou o link está incompleto.</p>
            <div>
              <a className="btn" href="#personagens">
                Voltar para Personagens
              </a>
            </div>
          </>
        ) : (
          <p className="lede">Carregando personagem…</p>
        )}
      </>
    );
  }

  const can = canWrite(), locs = charLocations(c.id), rels = charRelations(c), evs = charEvents(c.id), maps = charMaps(c), orgs = charOrgs(c.id), sub = charSubtitle(c);
  const sh = sheetById(c.sheetId), shHidden = !sh && rawHas('sheets', c.sheetId);
  // A confirmação de remover a ficha, com a caixa aberta para ela não ficar escondida.
  const unlink = can && confirmUnlink && !!c.sheetId;

  function remove(target: Character) {
    setDeleting(true);
    Ops.deleteCharacter(target).then(
      () => {
        toast('Personagem excluído.');
        go('#personagens', true);
      },
      er => {
        setDeleting(false);
        toast(errorText(er), true);
      },
    );
  }

  function unlinkSheet(target: Character) {
    setUnlinking(true);
    Ops.setCharSheet(target.id, null).then(
      () => {
        setUnlinking(false);
        setConfirmUnlink(false);
        toast('Vínculo com a ficha removido.');
      },
      er => {
        setUnlinking(false);
        toast(errorText(er), true);
      },
    );
  }

  return (
    <>
      <Crumbs node={'char:' + c.id} />
      <div className="head-row">
        <div>
          <span className="badge">
            <Icon paths={ICON.user} size={12} stroke={2.4} />
            Personagem
          </span>
          <h1>
            {c.name}
            <VisibilityControls item={c} col="characters" />
          </h1>
          {sub ? <p className="lede">{sub}</p> : null}
        </div>
        {can ? (
          <div className="btn-row">
            <button className="btn" type="button" id="editCharBtn" onClick={() => openDialog(<CharForm c={c} />)}>
              <Icon paths={ICON.edit} size={15} />
              Editar personagem
            </button>
            <button className="btn danger" type="button" id="delCharBtn" onClick={() => setConfirmDelete(true)}>
              <Icon paths={ICON.trash} size={15} />
              Excluir
            </button>
          </div>
        ) : null}
      </div>
      {confirmDelete ? (
        <div className="confirm" role="alert">
          <span>
            Excluir <b>{c.name}</b>?
            {locs.length || evs.length
              ? ' Ele sai de ' + [locs.length ? plural(locs.length, 'local', 'locais') : '', evs.length ? plural(evs.length, 'evento', 'eventos') : ''].filter(Boolean).join(' e ') + '; eles continuam cadastrados.'
              : ''}{' '}
            Não dá para desfazer.
          </span>
          <div className="btn-row">
            <button className="btn danger solid" type="button" id="delCharYes" disabled={deleting} onClick={() => remove(c)}>
              Excluir personagem
            </button>
            <button className="btn ghost" type="button" id="delCharNo" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
      <div className="loc-layout">
        <div className="side" style={{gap: 22}}>
          {c.image ? (
            <div className="loc-hero" id="charHero">
              {heroUrl ? (
                <button className="hero-zoom" type="button" aria-label={'Ampliar a imagem de ' + c.name} title="Clique para ampliar" onClick={() => zoomImage(heroUrl, c.name)}>
                  <img src={heroUrl} alt={c.name} />
                </button>
              ) : (
                <Icon paths={ICON.user} size={32} stroke={1.6} />
              )}
            </div>
          ) : null}
          <section>
            <h2 className="sec-title">Descrição</h2>
            {c.description ? <p className="long">{c.description}</p> : <p className="long none">Sem descrição.</p>}
          </section>
        </div>
        <div className="side">
          <FoldBox foldKey="info" title="Informações">
            <dl className="facts">
              <dt>Raça</dt>
              <dd>{c.race ? c.race : <span className="none">Não informada</span>}</dd>
              <dt>Organizações</dt>
              <dd>
                {orgs.length ? (
                  orgs.map((x, i) => (
                    <Fragment key={i}>
                      {i ? <br /> : null}
                      <a href={orgHref(x.o.id)}>{x.o.name}</a>
                      {x.rank ? ' · ' + x.rank : ''}
                    </Fragment>
                  ))
                ) : c.organization ? (
                  c.organization
                ) : (
                  <span className="none">Nenhuma</span>
                )}
              </dd>
            </dl>
          </FoldBox>
          <FoldBox foldKey="sheet" title="Ficha" startOpen={unlink}>
            {sh ? (
              <ul className="links">
                <SheetRow s={sh} />
              </ul>
            ) : (
              <p className="lede" style={{fontSize: 13}}>
                {shHidden ? 'Vinculado a uma ficha que você não pode ver.' : 'Nenhuma ficha vinculada.' + (can ? ' Cada personagem pode ter uma ficha.' : '')}
              </p>
            )}
            {can ? (
              <div className="btn-row">
                <button className="btn" type="button" id="charSheetBtn" onClick={() => openSheetLinkForm(c)}>
                  <Icon paths={ICON.sheet} size={15} />
                  {c.sheetId ? 'Trocar ficha' : 'Vincular ficha'}
                </button>
                {c.sheetId ? (
                  <button className="btn ghost" type="button" id="charSheetRm" onClick={() => setConfirmUnlink(true)}>
                    <Icon paths={ICON.x} size={14} stroke={2.4} />
                    Remover vínculo
                  </button>
                ) : null}
              </div>
            ) : null}
            {unlink ? (
              <div className="confirm" role="alert">
                <span>
                  Remover o vínculo de <b>{c.name}</b> com{' '}
                  {sh ? (
                    <>
                      a ficha <b>{sh.name}</b>
                    </>
                  ) : (
                    'a ficha'
                  )}
                  ? A ficha continua cadastrada.
                </span>
                <div className="btn-row">
                  <button className="btn danger solid" type="button" id="charSheetRmYes" disabled={unlinking} onClick={() => unlinkSheet(c)}>
                    Remover vínculo
                  </button>
                  <button className="btn ghost" type="button" id="charSheetRmNo" onClick={() => setConfirmUnlink(false)}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : null}
          </FoldBox>
          <FoldBox foldKey="rels" title="Relacionamentos" count={rels.length}>
            {rels.length ? (
              <ul className="links">
                {rels.map(r => (
                  <RowLink href={charHref(r.c.id)} imgRef={r.c.image && r.c.image.ref} icon={ICON.user} key={r.c.id}>
                    <span className="mtext">
                      <b>{r.c.name}</b>
                      {/* "type" é como quem declarou vê o outro; do outro lado, a relação aparece invertida. */}
                      <span className="where">{r.back ? (r.type ? 'Vê ' + c.name + ' como ' + r.type : 'Cita ' + c.name) : r.type || 'Relação sem tipo'}</span>
                    </span>
                  </RowLink>
                ))}
              </ul>
            ) : (
              <p className="lede" style={{fontSize: 13}}>
                Nenhum relacionamento.
                {can ? (
                  <>
                    {' '}
                    Use <b>Editar personagem</b> para ligar outros personagens.
                  </>
                ) : null}
              </p>
            )}
          </FoldBox>
          <FoldBox foldKey="events" title="Eventos" count={evs.length}>
            {evs.length ? (
              <ul className="links">
                {evs.map(e => (
                  <RowLink href={eventHref(e.id)} imgRef={e.image && e.image.ref} icon={ICON.event} key={e.id}>
                    <span className="mtext">
                      <b>{e.name}</b>
                      <span className="where">{e.date ? e.date : 'Sem data'}</span>
                    </span>
                  </RowLink>
                ))}
              </ul>
            ) : (
              <p className="lede" style={{fontSize: 13}}>
                Não participa de nenhum evento.
                {can ? (
                  <>
                    {' '}
                    Ligue pelo campo <b>Personagens</b> do evento.
                  </>
                ) : null}
              </p>
            )}
          </FoldBox>
          <FoldBox foldKey="maps" title="Mapas relacionados" count={maps.length}>
            {maps.length ? (
              <ul className="links">
                {maps.map(m => {
                  const up = mapChain(m.id)
                    .slice(0, -1)
                    .map(x => x.name)
                    .join(' › ');
                  return (
                    <RowLink href={mapHref(m.id)} imgRef={m.image && m.image.ref} icon={ICON.map} key={m.id}>
                      <span className="mtext">
                        <b>{m.name}</b>
                        <span className="where">{up ? up : 'Nível superior'}</span>
                      </span>
                    </RowLink>
                  );
                })}
              </ul>
            ) : (
              <p className="lede" style={{fontSize: 13}}>
                Nenhum mapa relacionado.
                {can ? (
                  <>
                    {' '}
                    Use <b>Editar personagem</b> para ligar mapas.
                  </>
                ) : null}
              </p>
            )}
          </FoldBox>
          <FoldBox foldKey="locs" title="Locais relacionados" count={locs.length}>
            {locs.length ? (
              <ul className="links">
                {locs.map(l => {
                  const mid = locMapId(l);
                  return (
                    <RowLink href={locHref(l.id)} imgRef={l.image && l.image.ref} icon={ICON.pin} key={l.id}>
                      <span className="mtext">
                        <b>{l.name}</b>
                        <span className="where">{mid ? mapPathText(mid) : 'Sem mapa'}</span>
                      </span>
                    </RowLink>
                  );
                })}
              </ul>
            ) : (
              <p className="lede" style={{fontSize: 13}}>
                Nenhum local relacionado.
                {can ? (
                  <>
                    {' '}
                    Use <b>Editar personagem</b> para ligar locais.
                  </>
                ) : null}
              </p>
            )}
          </FoldBox>
        </div>
      </div>
    </>
  );
}

// A ficha do personagem, como o sheetLink que saiu de js/tabs/tab-fichas.js: o retrato do personagem dela (o primeiro
// com imagem) e quantos personagens ela tem.
function SheetRow({s}: {s: Sheet}) {
  const n = sheetChars(s.id).length, p = sheetPortrait(s);
  return (
    <RowLink href={sheetHref(s.id)} imgRef={p && p.ref} icon={ICON.sheet}>
      <span className="mtext">
        <b>{s.name}</b>
        <span className="where">{n ? plural(n, 'personagem', 'personagens') : 'Nenhum personagem'}</span>
      </span>
    </RowLink>
  );
}
