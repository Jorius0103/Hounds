import {useState} from 'react';
import {useHub} from '../data';
import {Crumbs} from '../ui/Crumbs';
import {openDialog} from '../ui/Dialog';
import {Icon} from '../ui/Icon';
import {ImageSlot} from '../ui/ImageSlot';
import {EventForm} from './EventoForm';

// Página Eventos (#eventos): a lista, com busca por nome, data, descrição, local e personagens. As mesmas classes
// da versão antiga (css/paginas.css); os dados e as funções de evento continuam em js/tabs/tab-eventos.js.
export function EventsPage() {
  const {W} = useHub();
  const [q, setQ] = useState('');
  const can = canWrite(), warning = noticeText();

  function list() {
    if (!W.loaded.events) return <p className="lede">Carregando eventos…</p>;
    if (!W.events.length) {
      return (
        <div className="empty-state">
          <Icon paths={ICON.event} size={34} stroke={1.6} />
          <strong>Nenhum evento cadastrado</strong>
          <span>
            {can ? (
              <>
                Crie o primeiro com <b>Novo evento</b>.
              </>
            ) : (
              'Os eventos criados vão aparecer aqui.'
            )}
          </span>
        </div>
      );
    }
    const found = shown();
    return found.length ? <div className="loc-grid">{found.map(card)}</div> : <p className="lede">Nenhum evento encontrado para essa busca.</p>;
  }

  function shown() {
    const nq = norm(q);
    return W.events
      .slice()
      .sort(byName)
      .filter(ev => {
        const l = eventLoc(ev);
        return !nq || norm(ev.name + ' ' + (ev.date || '') + ' ' + (ev.description || '') + ' ' + (l ? locPathText(l.id) : '') + ' ' + eventChars(ev).map(c => c.name).join(' ')).indexOf(nq) >= 0;
      });
  }

  function card(ev: HEvent) {
    const l = eventLoc(ev), n = eventChars(ev).length;
    return (
      <a className="loc-card" href={eventHref(ev.id)} key={ev.id}>
        <ImageSlot as="div" className="thumb" imgRef={ev.image && ev.image.ref}>
          <Icon paths={ICON.event} size={28} stroke={1.6} />
        </ImageSlot>
        <div className="map-card-body">
          <strong>{ev.name}</strong>
          <span className="where">{ev.date ? ev.date : 'Sem data'}</span>
          <span className="where">
            {l ? (
              <>
                <Icon paths={ICON.pin} size={12} />
                {' ' + locPathText(l.id)}
              </>
            ) : (
              'Sem local'
            )}
          </span>
          {n ? <span className="meta">{plural(n, 'personagem', 'personagens')}</span> : null}
        </div>
      </a>
    );
  }

  const count = !W.loaded.events || !W.events.length ? '' : q && norm(q) ? shown().length + ' de ' + W.events.length : plural(W.events.length, 'evento', 'eventos');
  return (
    <>
      <div className="head-row">
        <div>
          <Crumbs node="events" />
          <h1>Eventos</h1>
          <p className="lede">O que aconteceu na campanha: batalhas, festas, acordos, tragédias. Cada evento pode ter data, local e os personagens que participaram.</p>
        </div>
        {can ? (
          <button className="btn primary" type="button" id="newEventBtn" onClick={() => openDialog(<EventForm ev={null} />)}>
            <Icon paths={ICON.plus} size={16} stroke={2.4} />
            Novo evento
          </button>
        ) : null}
      </div>
      {warning ? <p className="notice">{warning}</p> : null}
      {W.events.length ? (
        <div className="toolbar">
          <label htmlFor="eventSearch" style={{position: 'absolute', left: '-9999px'}}>
            Buscar eventos
          </label>
          <input className="search" id="eventSearch" type="search" placeholder="Buscar por nome, data, local ou personagem" autoComplete="off" value={q} onChange={e => setQ(e.target.value)} />
          <span className="meta" id="eventCount">
            {count}
          </span>
        </div>
      ) : null}
      <div id="eventList">{list()}</div>
    </>
  );
}
