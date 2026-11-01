import {useState} from 'react';
import type {HubPageProps} from '../pages';
import {useHub} from '../data';
import {Crumbs} from '../ui/Crumbs';
import {openDialog} from '../ui/Dialog';
import {FoldBox} from '../ui/FoldBox';
import {Icon} from '../ui/Icon';
import {ImageSlot, useImageUrl} from '../ui/ImageSlot';
import {VisibilityControls} from '../ui/Visibility';
import {OrgForm} from './OrganizacaoForm';

// Página de uma organização (#organizacao~id): reputação, imagem, descrição, membros com os cargos e as caixas do
// lado (informações, locais e mapas), com as mesmas classes da versão antiga (css/paginas.css).
export function OrgPage({route}: HubPageProps) {
  const {W} = useHub();
  const o = orgById(route.orgId);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const heroUrl = useImageUrl(o && o.image && o.image.ref);

  if (!o) {
    return (
      <>
        <Crumbs node="orgs" />
        {W.loaded.organizations ? (
          <>
            <h1>Organização não encontrada</h1>
            <p className="lede">Essa organização foi excluída ou o link está incompleto.</p>
            <div>
              <a className="btn" href="#organizacoes">
                Voltar para Organizações
              </a>
            </div>
          </>
        ) : (
          <p className="lede">Carregando organização…</p>
        )}
      </>
    );
  }

  const can = canWrite(), members = orgMembers(o), locs = orgLocs(o), maps = orgMaps(o);

  function remove(target: Organization) {
    setDeleting(true);
    Ops.deleteOrganization(target).then(
      () => {
        toast('Organização excluída.');
        go('#organizacoes', true);
      },
      er => {
        setDeleting(false);
        toast(errorText(er), true);
      },
    );
  }

  return (
    <>
      <Crumbs node={'org:' + o.id} />
      <div className="head-row">
        <div>
          <span className="badge">
            <Icon paths={ICON.org} size={12} stroke={2.4} />
            Organização
          </span>
          <h1>
            {o.name}
            <VisibilityControls item={o} col="organizations" />
          </h1>
          <p className="lede">
            {members.length ? plural(members.length, 'membro', 'membros') : 'Sem membros'}
            {o.reputation ? ' · Reputação: ' + o.reputation : ''}
          </p>
        </div>
        {can ? (
          <div className="btn-row">
            <button className="btn" type="button" id="editOrgBtn" onClick={() => openDialog(<OrgForm o={o} />)}>
              <Icon paths={ICON.edit} size={15} />
              Editar organização
            </button>
            <button className="btn danger" type="button" id="delOrgBtn" onClick={() => setConfirmDelete(true)}>
              <Icon paths={ICON.trash} size={15} />
              Excluir
            </button>
          </div>
        ) : null}
      </div>
      {confirmDelete ? (
        <div className="confirm" role="alert">
          <span>
            Excluir <b>{o.name}</b>? Os personagens, locais e mapas continuam cadastrados, só deixam de estar ligados a ela. Não dá para desfazer.
          </span>
          <div className="btn-row">
            <button className="btn danger solid" type="button" id="delOrgYes" disabled={deleting} onClick={() => remove(o)}>
              Excluir organização
            </button>
            <button className="btn ghost" type="button" id="delOrgNo" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
      <div className="loc-layout">
        <div className="side" style={{gap: 22}}>
          {o.image ? (
            <div className="loc-hero" id="orgHero">
              {heroUrl ? (
                <button className="hero-zoom" type="button" aria-label={'Ampliar a imagem de ' + o.name} title="Clique para ampliar" onClick={() => zoomImage(heroUrl, o.name)}>
                  <img src={heroUrl} alt={o.name} />
                </button>
              ) : (
                <Icon paths={ICON.org} size={32} stroke={1.6} />
              )}
            </div>
          ) : null}
          <section>
            <h2 className="sec-title">Descrição</h2>
            {o.description ? <p className="long">{o.description}</p> : <p className="long none">Sem descrição.</p>}
          </section>
          <section>
            <div className="head-row" style={{alignItems: 'center'}}>
              <h2 className="sec-title" style={{margin: 0}}>
                Membros
              </h2>
              {can ? (
                <button className="btn" type="button" id="addMemberBtn" onClick={() => openDialog(<OrgForm o={o} focusMembers />)}>
                  <Icon paths={ICON.plus} size={15} stroke={2.4} />
                  Adicionar membro
                </button>
              ) : null}
            </div>
            {members.length ? (
              <div className="loc-grid" style={{marginTop: 12}}>
                {members.map(({c, rank}) => (
                  <a className="loc-card" href={charHref(c.id)} key={c.id}>
                    <ImageSlot as="div" className="thumb char-thumb" imgRef={c.image && c.image.ref}>
                      <span className="initials">{initials(c.name)}</span>
                    </ImageSlot>
                    <div className="map-card-body">
                      <strong>{c.name}</strong>
                      <span className="where">{rank ? rank : 'Sem cargo'}</span>
                      {c.race ? <span className="meta">{c.race}</span> : null}
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <p className="lede" style={{fontSize: 13}}>
                Nenhum membro ainda.
                {can ? (
                  <>
                    {' '}
                    Use <b>Adicionar membro</b> ou escolha a organização no cadastro do personagem.
                  </>
                ) : null}
              </p>
            )}
          </section>
        </div>
        <div className="side">
          <FoldBox foldKey="info" title="Informações">
            <dl className="facts">
              <dt>Reputação</dt>
              <dd>{o.reputation ? o.reputation : <span className="none">Não informada</span>}</dd>
              <dt>Membros</dt>
              <dd>{members.length || <span className="none">Nenhum</span>}</dd>
            </dl>
          </FoldBox>
          <FoldBox foldKey="locs" title="Locais" count={locs.length}>
            {locs.length ? (
              <ul className="links">
                {locs.map(l => {
                  const mid = locMapId(l);
                  return (
                    <li key={l.id}>
                      <a className="row-link" href={locHref(l.id)}>
                        <ImageSlot className="mthumb" imgRef={l.image && l.image.ref}>
                          <Icon paths={ICON.pin} size={16} stroke={1.8} />
                        </ImageSlot>
                        <span className="mtext">
                          <b>{l.name}</b>
                          <span className="where">{mid ? mapPathText(mid) : 'Sem mapa'}</span>
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="lede" style={{fontSize: 13}}>
                Nenhum local ligado.
                {can ? (
                  <>
                    {' '}
                    Use <b>Editar organização</b> para ligar locais.
                  </>
                ) : null}
              </p>
            )}
          </FoldBox>
          <FoldBox foldKey="maps" title="Mapas" count={maps.length}>
            {maps.length ? (
              <ul className="links">
                {maps.map(m => {
                  const path = mapChain(m.id)
                    .slice(0, -1)
                    .map(x => x.name)
                    .join(' › ');
                  return (
                    <li key={m.id}>
                      <a className="row-link" href={mapHref(m.id)}>
                        <ImageSlot className="mthumb" imgRef={m.image && m.image.ref}>
                          <Icon paths={ICON.map} size={16} stroke={1.8} />
                        </ImageSlot>
                        <span className="mtext">
                          <b>{m.name}</b>
                          <span className="where">{path ? path : 'Nível superior'}</span>
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="lede" style={{fontSize: 13}}>
                Nenhum mapa ligado.
                {can ? (
                  <>
                    {' '}
                    Use <b>Editar organização</b> para ligar mapas.
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
