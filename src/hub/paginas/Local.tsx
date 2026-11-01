import {useEffect, useState} from 'react';
import type {HubPageProps} from '../pages';
import {useHub} from '../data';
import {Crumbs} from '../ui/Crumbs';
import {closeDialog, Dialog, openDialog} from '../ui/Dialog';
import {FoldBox} from '../ui/FoldBox';
import {Icon} from '../ui/Icon';
import {ImageSlot, useImageUrl} from '../ui/ImageSlot';
import {PathTree} from '../ui/MapTree';
import {PersonChip} from '../ui/PersonChip';
import {RowLink} from '../ui/RowLink';
import {VisibilityControls} from '../ui/Visibility';
import {LocationForm} from './LocalForm';

// Página de um local (#local~id): onde fica, o mapa, até duas imagens, a descrição e as caixas do lado (sublocais,
// personagens, organizações, eventos, o mapa e a posição na hierarquia de mapas), com as mesmas classes da versão
// antiga (css/paginas.css).
export function LocalPage({route}: HubPageProps) {
  const {W, version} = useHub();
  const l = locById(route.locId);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const pics = l ? [l.image, l.image2].filter((im): im is ImageInfo => !!(im && im.ref)) : [];
  const urls = [useImageUrl(pics[0] && pics[0].ref), useImageUrl(pics[1] && pics[1].ref)];
  const mid = l ? locMapId(l) : null, m = mid ? mapById(mid) : null;
  const marker = useMarkerAction(l, m, version);

  if (!l) {
    return (
      <>
        <Crumbs node="locais" />
        {W.loaded.locations ? (
          <>
            <h1>Local não encontrado</h1>
            <p className="lede">Esse local foi excluído ou o link está incompleto.</p>
            <div>
              <a className="btn" href="#locais">
                Voltar para Locais
              </a>
            </div>
          </>
        ) : (
          <p className="lede">Carregando local…</p>
        )}
      </>
    );
  }

  const can = canWrite(), chars = locChars(l), up = locById(W.locParent[l.id]), kids = childLocs(l.id), orgs = locOrgs(l.id), evs = locEvents(l.id);
  const ex = m ? '#map~' + encodeURIComponent(m.id) + '~explorar' : '';
  // O que acontece com o que está ligado ao local (Ops.deleteLocation de js/mundo.js).
  const gone = (
    <>
      {kids.length ? (
        <>
          {plural(kids.length, 'sublocal passa', 'sublocais passam') + ' para '}
          {up ? <b>{up.name}</b> : 'o nível superior'}
          {'. '}
        </>
      ) : null}
      Marcadores ligados a ele continuam no mapa, sem o vínculo.
      {orgs.length || evs.length
        ? ' ' + [orgs.length ? plural(orgs.length, 'organização', 'organizações') : '', evs.length ? plural(evs.length, 'evento', 'eventos') : ''].filter(Boolean).join(' e ') + ' perdem o vínculo com ele.'
        : ''}
    </>
  );

  function remove(target: HLocation) {
    setDeleting(true);
    Ops.deleteLocation(target).then(
      () => {
        toast('Local excluído.');
        go(up ? locHref(up.id) : '#locais', true);
      },
      er => {
        setDeleting(false);
        toast(errorText(er), true);
      },
    );
  }

  return (
    <>
      <Crumbs node={'loc:' + l.id} />
      <div className="head-row">
        <div>
          <span className="badge">
            <Icon paths={ICON.pin} size={12} stroke={2.4} />
            Local
          </span>
          <h1>
            {l.name}
            <VisibilityControls item={l} col="locations" />
          </h1>
          {up ? (
            <p className="lede">
              Dentro de{' '}
              <a className="inline" href={locHref(up.id)}>
                {locPathText(up.id)}
              </a>
            </p>
          ) : null}
          {m ? (
            <p className="lede">
              No mapa{' '}
              <a className="inline" href={mapHref(m.id)}>
                {mapPathText(m.id)}
              </a>
            </p>
          ) : null}
        </div>
        {kids.length || can ? (
          <div className="btn-row">
            {kids.length ? (
              <button className="btn" type="button" id="locTreeBtn" onClick={() => openDialog(<LocTreeDialog l={l} />)}>
                <Icon paths={ICON.tree} size={15} />
                Árvore
              </button>
            ) : null}
            {can ? (
              <>
                <button className="btn" type="button" id="editLocBtn" onClick={() => openDialog(<LocationForm l={l} />)}>
                  <Icon paths={ICON.edit} size={15} />
                  Editar local
                </button>
                <button className="btn danger" type="button" id="delLocBtn" onClick={() => setConfirmDelete(true)}>
                  <Icon paths={ICON.trash} size={15} />
                  Excluir
                </button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
      {confirmDelete ? (
        <div className="confirm" role="alert">
          <span>
            Excluir o local <b>{l.name}</b>? {gone} Não dá para desfazer.
          </span>
          <div className="btn-row">
            <button className="btn danger solid" type="button" id="delLocYes" disabled={deleting} onClick={() => remove(l)}>
              Excluir local
            </button>
            <button className="btn ghost" type="button" id="delLocNo" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
      <div className="loc-layout">
        <div className="side" style={{gap: 22}}>
          {pics.length ? (
            <div className={'loc-pics' + (pics.length > 1 ? ' two-pics' : '')}>
              {pics.map((im, i) => (
                <div className="loc-hero" id={'locHero' + i} key={i}>
                  {urls[i] ? <img src={urls[i]!} alt={l.name + (i ? ' (2ª imagem)' : '')} /> : <Icon paths={ICON.image} size={32} stroke={1.6} />}
                </div>
              ))}
            </div>
          ) : null}
          <section>
            <h2 className="sec-title">Descrição</h2>
            {l.description ? <p className="long">{l.description}</p> : <p className="long none">Sem descrição.</p>}
          </section>
        </div>
        <div className="side">
          <FoldBox foldKey="sub" title="Sublocais" count={kids.length}>
            {kids.length ? (
              <ul className="links">
                {kids.map(k => {
                  const n = childLocs(k.id).length;
                  return (
                    <RowLink href={locHref(k.id)} imgRef={k.image && k.image.ref} icon={ICON.pin} key={k.id}>
                      <b>{k.name}</b>
                      {n ? <span className="meta">{plural(n, 'sublocal', 'sublocais')}</span> : null}
                    </RowLink>
                  );
                })}
              </ul>
            ) : (
              <p className="lede" style={{fontSize: 13}}>
                Nenhum local dentro deste.
              </p>
            )}
            {can ? (
              <div>
                <button className="btn" type="button" id="newSubLoc" onClick={() => openDialog(<LocationForm l={null} presetMap={mid || ''} presetParent={l.id} />)}>
                  <Icon paths={ICON.plus} size={15} stroke={2.4} />
                  Novo local dentro deste
                </button>
              </div>
            ) : null}
          </FoldBox>
          <FoldBox foldKey="chars" title="Personagens" count={chars.length}>
            {chars.length ? (
              <div className="people">
                {chars.map(c => (
                  <PersonChip c={c} key={c.id} />
                ))}
              </div>
            ) : (
              <p className="lede" style={{fontSize: 13}}>
                Nenhum personagem ligado.
              </p>
            )}
          </FoldBox>
          <FoldBox foldKey="orgs" title="Organizações" count={orgs.length}>
            {orgs.length ? (
              <ul className="links">
                {orgs.map(o => (
                  <RowLink href={orgHref(o.id)} imgRef={o.image && o.image.ref} icon={ICON.org} key={o.id}>
                    <b>{o.name}</b>
                  </RowLink>
                ))}
              </ul>
            ) : (
              <p className="lede" style={{fontSize: 13}}>
                Nenhuma organização ligada.
                {can ? (
                  <>
                    {' '}
                    Ligue pelo campo <b>Locais</b> da organização.
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
                Nenhum evento neste local.{can ? ' Escolha o local no cadastro do evento.' : ''}
              </p>
            )}
          </FoldBox>
          <FoldBox foldKey="map" title="Mapa relacionado">
            {m ? (
              <>
                <ul className="links">
                  <RowLink href={mapHref(m.id)} imgRef={m.image && m.image.ref} icon={ICON.map}>
                    <b>{m.name}</b>
                  </RowLink>
                </ul>
                <div className="btn-row" id="locMapActions">
                  {marker === 'see' ? (
                    <a
                      className="btn"
                      href={ex}
                      id="seeOnMap"
                      onClick={() => {
                        Explorer.pending = {locationId: l.id};
                      }}
                    >
                      <Icon paths={ICON.target} size={15} />
                      Ver no mapa
                    </a>
                  ) : marker === 'mark' ? (
                    <a
                      className="btn"
                      href={ex}
                      id="markOnMap"
                      onClick={() => {
                        Explorer.pending = {linkLocationId: l.id};
                      }}
                    >
                      <Icon paths={ICON.pin} size={15} />
                      Marcar no mapa
                    </a>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="lede" style={{fontSize: 13}}>
                Este local não está em nenhum mapa.
              </p>
            )}
          </FoldBox>
          <FoldBox foldKey="where" title="Localização no mapa">
            {m ? (
              <PathTree chain={mapChain(m.id)} leaf={l} />
            ) : (
              <p className="lede" style={{fontSize: 13}}>
                Escolha um mapa em <b>Editar local</b> para posicionar este local na hierarquia.
              </p>
            )}
          </FoldBox>
        </div>
      </div>
    </>
  );
}

// Se há um marcador deste local no mapa dele: "Ver no mapa"; se não há, "Marcar no mapa", para quem pode gravar. A
// consulta se repete quando os dados mudam, como na versão antiga, que a refazia a cada redesenho.
function useMarkerAction(l: HLocation | null, m: HMap | null, version: number) {
  const key = l && m ? l.id + '|' + m.id : '';
  const [found, setFound] = useState<{key: string; action: 'see' | 'mark' | null} | null>(null);
  useEffect(() => {
    if (!l || !m || !W.store) return;
    let live = true;
    W.store
      .query('maps/' + m.id + '/markers', 'locationId', l.id)
      .then(list => {
        if (live) setFound({key, action: list.length ? 'see' : canWrite() ? 'mark' : null});
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [key, version]);
  return found && found.key === key ? found.action : null;
}

// A árvore de um local: ele e tudo o que está dentro, em todos os níveis. Um clique num local fecha e vai até ele.
function LocTreeDialog({l}: {l: HLocation}) {
  useHub();
  const n = locDescendants(l.id).length;
  function follow(e: React.MouseEvent) {
    const a = (e.target as Element).closest('a');
    if (!a) return;
    e.preventDefault();
    closeDialog();
    go(a.getAttribute('href')!);
  }
  return (
    <Dialog labelledBy="ltTitle">
      <h2 id="ltTitle">Árvore de {l.name}</h2>
      <p className="lede" style={{margin: 0}}>
        {plural(n, 'local fica', 'locais ficam')} dentro de <b>{l.name}</b>.
      </p>
      <div className="mtree" onClick={follow}>
        <LocRow l={l} here />
        <LocTree parent={l.id} />
      </div>
    </Dialog>
  );
}

function LocRow({l, here = false}: {l: HLocation; here?: boolean}) {
  const k = childLocs(l.id).length;
  return (
    <a className={'mrow' + (here ? ' here' : '')} href={locHref(l.id)} aria-current={here ? 'page' : undefined}>
      <ImageSlot className="mthumb" imgRef={l.image && l.image.ref}>
        <Icon paths={ICON.pin} size={16} stroke={1.8} />
      </ImageSlot>
      <span className="mtext">
        <b>{l.name}</b>
        {k ? <span className="meta">{plural(k, 'sublocal', 'sublocais')}</span> : null}
      </span>
    </a>
  );
}

function LocTree({parent}: {parent: string}) {
  const list = childLocs(parent);
  return list.length ? (
    <ul>
      {list.map(c => (
        <li key={c.id}>
          <LocRow l={c} />
          <LocTree parent={c.id} />
        </li>
      ))}
    </ul>
  ) : null;
}
