import {Fragment, useLayoutEffect, useRef, useState, type ReactNode} from 'react';
import type {HubPageProps} from '../pages';
import {useHub} from '../data';
import {Crumbs} from '../ui/Crumbs';
import {openDialog} from '../ui/Dialog';
import {FoldBox} from '../ui/FoldBox';
import {Icon} from '../ui/Icon';
import {PathTree} from '../ui/MapTree';
import {PersonChip} from '../ui/PersonChip';
import {RowLink} from '../ui/RowLink';
import {VisibilityControls} from '../ui/Visibility';
import {LocationForm} from './LocalForm';
import {MapForm} from './MapaForm';
import {MapTreeDialog} from './Mapas';

const NO_MARKERS: Marker[] = [];

// Página de um mapa (#map~id): a prévia com os marcadores e, do lado, as opções, a hierarquia, os locais,
// personagens e organizações no mapa e a lista de marcadores, com as mesmas classes da versão antiga
// (css/paginas.css). Os marcadores chegam pelo watchMarkersFor de js/app.js (S.markers), e o explorer
// (#map~id~explorar), que abre por cima desta página, continua em js/explorer.js.
export function MapPage({route}: HubPageProps) {
  const {W, S, version} = useHub();
  const m = mapById(route.mapId || '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!m) {
    return (
      <>
        <Crumbs node="maps" />
        {W.loaded.maps ? (
          <>
            <h1>Mapa não encontrado</h1>
            <p className="lede">Esse mapa foi excluído ou o link está incompleto.</p>
            <div>
              <a className="btn" href="#maps">
                Voltar para Maps
              </a>
            </div>
          </>
        ) : (
          <p className="lede">Carregando mapa…</p>
        )}
      </>
    );
  }

  const can = canWrite(), mk = S.markersFor === m.id ? S.markers : NO_MARKERS;
  const locs = mapLocations(m.id), kids = childMaps(m.id), parent = mapById(W.parent[m.id] || ''), chars = mapCharacters(m.id), orgs = mapOrgs(m.id);
  const meta = [m.image ? m.image.w + ' × ' + m.image.h + ' px' : '', plural(mk.length, 'marcador', 'marcadores'), plural(locs.length, 'local', 'locais'), plural(kids.length, 'submapa', 'submapas')]
    .filter(Boolean)
    .join(' · ');
  const explore = '#map~' + encodeURIComponent(m.id) + '~explorar';
  // O que acontece com o que está ligado ao mapa (Ops.deleteMap de js/mundo.js): vai para o mapa pai, se há.
  const to = (none: string) => (parent ? <b>{parent.name}</b> : none);
  const conseq: ReactNode[] = [];
  if (kids.length) conseq.push(<>{plural(kids.length, 'submapa passa', 'submapas passam') + ' para '}{to('o nível superior')}</>);
  if (locs.length) conseq.push(<>{plural(locs.length, 'local passa', 'locais passam') + ' para '}{to('sem mapa')}</>);
  if (chars.length) conseq.push(<>{plural(chars.length, 'personagem passa', 'personagens passam') + ' para '}{to('sem este mapa')}</>);
  if (orgs.length) conseq.push(<>{plural(orgs.length, 'organização passa', 'organizações passam') + ' para '}{to('sem este mapa')}</>);
  if (mk.length) conseq.push(plural(mk.length, 'marcador é excluído', 'marcadores são excluídos'));

  function remove(target: HMap) {
    setDeleting(true);
    const back = W.parent[target.id] ? mapHref(W.parent[target.id]!) : '#maps';
    Ops.deleteMap(target).then(
      () => {
        toast('Mapa excluído.');
        go(back, true);
      },
      er => {
        setDeleting(false);
        toast(errorText(er), true);
      },
    );
  }

  return (
    <>
      <Crumbs node={'map:' + m.id} />
      <div className="head-row">
        <div>
          <h1>
            {m.name}
            <VisibilityControls item={m} col="maps" />
          </h1>
          <div className="meta">{meta}</div>
          <p className="lede" style={{marginTop: 6}}>
            {parent ? (
              <>
                Faz parte de{' '}
                <a className="inline" href={mapHref(parent.id)}>
                  {parent.name}
                </a>
                .
              </>
            ) : (
              'Mapa de nível superior.'
            )}
          </p>
        </div>
        <div className="btn-row">
          {kids.length ? (
            <button className="btn" type="button" id="mapTreeBtn" onClick={() => openDialog(<MapTreeDialog m={m} />)}>
              <Icon paths={ICON.tree} size={15} />
              Árvore
            </button>
          ) : null}
          <a className="btn primary" href={explore}>
            <Icon paths={ICON.explore} size={16} />
            Explorar mapa
          </a>
        </div>
      </div>
      <div className="map-layout">
        <MapPreview m={m} markers={mk} version={version} />
        <div className="side">
          {can ? (
            <FoldBox foldKey="opts" title="Opções do mapa" startOpen={confirmDelete}>
              <div className="btn-row">
                <button className="btn" type="button" id="editMapBtn" onClick={() => openDialog(<MapForm m={m} />)}>
                  <Icon paths={ICON.edit} size={15} />
                  Editar mapa
                </button>
                <button className="btn danger" type="button" id="deleteMapBtn" onClick={() => setConfirmDelete(true)}>
                  <Icon paths={ICON.trash} size={15} />
                  Excluir mapa
                </button>
              </div>
              {confirmDelete ? (
                <div className="confirm" role="alert">
                  <span>
                    Excluir <b>{m.name}</b>?
                    {conseq.length ? (
                      <>
                        {' '}
                        {conseq.map((c, i) => (
                          <Fragment key={i}>
                            {i ? '; ' : ''}
                            {c}
                          </Fragment>
                        ))}
                        .
                      </>
                    ) : null}{' '}
                    Não dá para desfazer.
                  </span>
                  <div className="btn-row">
                    <button className="btn danger solid" type="button" id="deleteMapYes" disabled={deleting} onClick={() => remove(m)}>
                      Excluir mapa
                    </button>
                    <button className="btn ghost" type="button" id="deleteMapNo" onClick={() => setConfirmDelete(false)}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : null}
            </FoldBox>
          ) : null}
          <FoldBox foldKey="hier" title="Hierarquia">
            <PathTree chain={mapChain(m.id)} markLast kids />
          </FoldBox>
          <FoldBox foldKey="locs" title="Locais neste mapa" count={locs.length}>
            {locs.length ? (
              <ul className="links">
                {locs.map(l => (
                  <RowLink href={locHref(l.id)} imgRef={l.image && l.image.ref} icon={ICON.pin} key={l.id}>
                    <b>{l.name}</b>
                  </RowLink>
                ))}
              </ul>
            ) : (
              <p className="lede" style={{fontSize: 13}}>
                Nenhum local ligado a este mapa.
              </p>
            )}
            {can ? (
              <div>
                <button className="btn" type="button" id="newLocHere" onClick={() => openDialog(<LocationForm l={null} presetMap={m.id} />)}>
                  <Icon paths={ICON.plus} size={15} stroke={2.4} />
                  Novo local neste mapa
                </button>
              </div>
            ) : null}
          </FoldBox>
          <FoldBox foldKey="chars" title="Personagens neste mapa" count={chars.length}>
            {chars.length ? (
              <div className="people">
                {chars.map(c => (
                  <PersonChip c={c} key={c.id} />
                ))}
              </div>
            ) : (
              <p className="lede" style={{fontSize: 13}}>
                Nenhum personagem ligado a este mapa.
                {can ? (
                  <>
                    {' '}
                    Ligue pelo campo <b>Mapas relacionados</b> do personagem.
                  </>
                ) : null}
              </p>
            )}
          </FoldBox>
          <FoldBox foldKey="orgs" title="Organizações neste mapa" count={orgs.length}>
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
                Nenhuma organização ligada a este mapa.
                {can ? (
                  <>
                    {' '}
                    Ligue pelo campo <b>Mapas</b> da organização.
                  </>
                ) : null}
              </p>
            )}
          </FoldBox>
          <FoldBox foldKey="markers" title="Marcadores" count={mk.length}>
            {mk.length ? (
              <ul className="mk-list">
                {mk.map(x => {
                  const c = cat(x.category);
                  return (
                    <li key={x.id}>
                      <a
                        className="mk-item"
                        href={explore}
                        data-focus={x.id}
                        onClick={() => {
                          Explorer.pending = {markerId: x.id};
                        }}
                      >
                        <span className="dot" style={{background: c.color}}>
                          <Icon paths={c.icon} size={14} />
                        </span>
                        <span className="t">
                          <b>{x.title}</b>
                          <span>{markerSub(x)}</span>
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="lede" style={{fontSize: 13}}>
                Nenhum marcador ainda.
                {can ? (
                  <>
                    {' '}
                    Em <b>Explorar mapa</b>, use <b>Adicionar marcador</b> e clique no ponto do mapa.
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

// A prévia do mapa: o mapPreview de js/mapa-previa.js (imagem, marcadores, zoom e arrastar), que desenha dentro da
// caixa por conta própria. Ele redesenha quando o mapa, os marcadores ou os dados mudam, como a versão antiga a cada
// redesenho da página; a vista (zoom, centro, marcador aberto) fica em keep enquanto a página está aberta.
function MapPreview({m, markers, version}: {m: HMap; markers: Marker[]; version: number}) {
  const box = useRef<HTMLDivElement>(null);
  const keep = useRef({});
  useLayoutEffect(() => {
    if (box.current) mapPreview(box.current, m, markers, keep.current);
  }, [m, markers, version]);
  return <div className="preview mprev" id="mapPreview" ref={box} />;
}

