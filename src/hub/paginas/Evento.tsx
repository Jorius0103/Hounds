import {useState} from 'react';
import type {HubPageProps} from '../pages';
import {useHub} from '../data';
import {Crumbs} from '../ui/Crumbs';
import {openDialog} from '../ui/Dialog';
import {FoldBox} from '../ui/FoldBox';
import {Icon} from '../ui/Icon';
import {ImageSlot, useImageUrl} from '../ui/ImageSlot';
import {VisibilityControls} from '../ui/Visibility';
import {EventForm} from './EventoForm';

// Página de um evento (#evento~id): data, local, imagem, descrição, personagens e as caixas do lado, com as
// mesmas classes da versão antiga (css/paginas.css).
export function EventPage({route}: HubPageProps) {
  const {W} = useHub();
  const ev = eventById(route.eventId);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const heroUrl = useImageUrl(ev && ev.image && ev.image.ref);

  if (!ev) {
    return (
      <>
        <Crumbs node="events" />
        {W.loaded.events ? (
          <>
            <h1>Evento não encontrado</h1>
            <p className="lede">Esse evento foi excluído ou o link está incompleto.</p>
            <div>
              <a className="btn" href="#eventos">
                Voltar para Eventos
              </a>
            </div>
          </>
        ) : (
          <p className="lede">Carregando evento…</p>
        )}
      </>
    );
  }

  const can = canWrite(), chars = eventChars(ev), l = eventLoc(ev);

  function remove(target: HEvent) {
    setDeleting(true);
    Ops.deleteEvent(target).then(
      () => {
        toast('Evento excluído.');
        go('#eventos', true);
      },
      er => {
        setDeleting(false);
        toast(errorText(er), true);
      },
    );
  }

  return (
    <>
      <Crumbs node={'event:' + ev.id} />
      <div className="head-row">
        <div>
          <span className="badge">
            <Icon paths={ICON.event} size={12} stroke={2.4} />
            Evento
          </span>
          <h1>
            {ev.name}
            <VisibilityControls item={ev} col="events" />
          </h1>
          {ev.date ? <p className="lede">{ev.date}</p> : null}
          {l ? (
            <p className="lede">
              Em{' '}
              <a className="inline" href={locHref(l.id)}>
                {locPathText(l.id)}
              </a>
            </p>
          ) : null}
        </div>
        {can ? (
          <div className="btn-row">
            <button className="btn" type="button" id="editEventBtn" onClick={() => openDialog(<EventForm ev={ev} />)}>
              <Icon paths={ICON.edit} size={15} />
              Editar evento
            </button>
            <button className="btn danger" type="button" id="delEventBtn" onClick={() => setConfirmDelete(true)}>
              <Icon paths={ICON.trash} size={15} />
              Excluir
            </button>
          </div>
        ) : null}
      </div>
      {confirmDelete ? (
        <div className="confirm" role="alert">
          <span>
            Excluir o evento <b>{ev.name}</b>? Os personagens e o local continuam cadastrados. Não dá para desfazer.
          </span>
          <div className="btn-row">
            <button className="btn danger solid" type="button" id="delEventYes" disabled={deleting} onClick={() => remove(ev)}>
              Excluir evento
            </button>
            <button className="btn ghost" type="button" id="delEventNo" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
      <div className="loc-layout">
        <div className="side" style={{gap: 22}}>
          {ev.image ? (
            <div className="loc-hero" id="eventHero">
              {heroUrl ? (
                <button className="hero-zoom" type="button" aria-label={'Ampliar a imagem de ' + ev.name} title="Clique para ampliar" onClick={() => zoomImage(heroUrl, ev.name)}>
                  <img src={heroUrl} alt={ev.name} />
                </button>
              ) : (
                <Icon paths={ICON.event} size={32} stroke={1.6} />
              )}
            </div>
          ) : null}
          <section>
            <h2 className="sec-title">Descrição</h2>
            {ev.description ? <p className="long">{ev.description}</p> : <p className="long none">Sem descrição.</p>}
          </section>
          <section>
            <div className="head-row" style={{alignItems: 'center'}}>
              <h2 className="sec-title" style={{margin: 0}}>
                Personagens
              </h2>
              {can ? (
                <button className="btn" type="button" id="addEventCharBtn" onClick={() => openDialog(<EventForm ev={ev} focusChars />)}>
                  <Icon paths={ICON.plus} size={15} stroke={2.4} />
                  Adicionar personagens
                </button>
              ) : null}
            </div>
            {chars.length ? (
              <div className="loc-grid" style={{marginTop: 12}}>
                {chars.map(c => (
                  <a className="loc-card" href={charHref(c.id)} key={c.id}>
                    <ImageSlot as="div" className="thumb char-thumb" imgRef={c.image && c.image.ref}>
                      <span className="initials">{initials(c.name)}</span>
                    </ImageSlot>
                    <div className="map-card-body">
                      <strong>{c.name}</strong>
                      {charSubtitle(c) ? <span className="where">{charSubtitle(c)}</span> : null}
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <p className="lede" style={{fontSize: 13}}>
                Nenhum personagem ligado a este evento.
                {can ? (
                  <>
                    {' '}
                    Use <b>Adicionar personagens</b>.
                  </>
                ) : null}
              </p>
            )}
          </section>
        </div>
        <div className="side">
          <FoldBox foldKey="info" title="Informações">
            <dl className="facts">
              <dt>Data</dt>
              <dd>{ev.date ? ev.date : <span className="none">Não informada</span>}</dd>
              <dt>Personagens</dt>
              <dd>{chars.length || <span className="none">Nenhum</span>}</dd>
            </dl>
          </FoldBox>
          <FoldBox foldKey="loc" title="Local">
            {l ? (
              <ul className="links">
                <li>
                  <a className="row-link" href={locHref(l.id)}>
                    <ImageSlot className="mthumb" imgRef={l.image && l.image.ref}>
                      <Icon paths={ICON.pin} size={16} stroke={1.8} />
                    </ImageSlot>
                    <span className="mtext">
                      <b>{l.name}</b>
                      <span className="where">{locMapId(l) ? mapPathText(locMapId(l)!) : 'Sem mapa'}</span>
                    </span>
                  </a>
                </li>
              </ul>
            ) : (
              <p className="lede" style={{fontSize: 13}}>
                Nenhum local informado.
                {can ? (
                  <>
                    {' '}
                    Escolha um em <b>Editar evento</b>.
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
