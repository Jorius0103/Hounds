import {useState} from 'react';
import {useHub} from '../data';
import {Crumbs} from '../ui/Crumbs';
import {openDialog} from '../ui/Dialog';
import {Icon} from '../ui/Icon';
import {ImageSlot} from '../ui/ImageSlot';
import {LocationForm} from './LocalForm';

// Página Locais (#locais): sem busca, só os locais de nível superior (os de dentro ficam na página de cada um);
// com busca, todos os que combinam pelo nome, descrição, caminho, mapa ou personagens. As mesmas classes da versão
// antiga (css/paginas.css); os dados e a gravação dos locais ficam em js/mundo.js.
export function LocaisPage() {
  const {W} = useHub();
  const [q, setQ] = useState('');
  const can = canWrite(), warning = noticeText();

  function list() {
    if (!W.loaded.locations) return <p className="lede">Carregando locais…</p>;
    if (!W.locations.length) {
      return (
        <div className="empty-state">
          <Icon paths={ICON.pin} size={34} stroke={1.6} />
          <strong>Nenhum local cadastrado</strong>
          <span>
            {can ? (
              <>
                Crie o primeiro com <b>Novo local</b>.
              </>
            ) : (
              'Os locais criados vão aparecer aqui.'
            )}
          </span>
        </div>
      );
    }
    const found = shown();
    return found.length ? (
      <div className="loc-grid">
        {found.map(l => (
          <LocCard l={l} key={l.id} />
        ))}
      </div>
    ) : (
      <p className="lede">Nenhum local encontrado para essa busca.</p>
    );
  }

  function shown() {
    const nq = norm(q);
    if (!nq) return childLocs(null);
    const text = (l: HLocation) => [l.name, l.description || '', locPathText(l.id), mapPathText(locMapId(l) || ''), locChars(l).map(c => c.name).join(' ')].join(' ');
    return W.locations
      .slice()
      .sort(byName)
      .filter(l => norm(text(l)).indexOf(nq) >= 0);
  }

  const count = !W.loaded.locations || !W.locations.length ? '' : norm(q) ? shown().length + ' de ' + W.locations.length : plural(W.locations.length, 'local', 'locais');
  return (
    <>
      <div className="head-row">
        <div>
          <Crumbs node="locais" />
          <h1>Locais</h1>
          <p className="lede">
            Os locais do mundo: cidades, castelos, florestas, vilas. Um local pode ficar dentro de outro, como uma taverna dentro de uma cidade, e também num mapa e com personagens ligados a ele.
          </p>
        </div>
        {can ? (
          <button className="btn primary" type="button" id="newLocBtn" onClick={() => openDialog(<LocationForm l={null} />)}>
            <Icon paths={ICON.plus} size={16} stroke={2.4} />
            Novo local
          </button>
        ) : null}
      </div>
      {warning ? <p className="notice">{warning}</p> : null}
      {W.locations.length ? (
        <div className="toolbar">
          <label className="sr" htmlFor="locSearch" style={{position: 'absolute', left: '-9999px'}}>
            Buscar locais
          </label>
          <input className="search" id="locSearch" type="search" placeholder="Buscar por nome, mapa ou personagem" autoComplete="off" value={q} onChange={e => setQ(e.target.value)} />
          <span className="meta" id="locCount">
            {count}
          </span>
        </div>
      ) : null}
      <div id="locList">{list()}</div>
    </>
  );
}

// O cartão de um local na lista, como o locCard antigo: onde fica (o local de cima), o mapa e o que tem dentro.
function LocCard({l}: {l: HLocation}) {
  const mid = locMapId(l), chars = locChars(l).length, kids = childLocs(l.id).length, up = W.locParent[l.id];
  const meta = [kids ? plural(kids, 'sublocal', 'sublocais') : '', chars ? plural(chars, 'personagem', 'personagens') : ''].filter(Boolean).join(' · ');
  return (
    <a className="loc-card" href={locHref(l.id)}>
      <ImageSlot as="div" className="thumb" imgRef={l.image && l.image.ref}>
        <Icon paths={ICON.pin} size={28} stroke={1.6} />
      </ImageSlot>
      <div className="map-card-body">
        <strong>{l.name}</strong>
        {up ? (
          <span className="where">
            <Icon paths={ICON.pin} size={12} />
            {' Em ' + locPathText(up)}
          </span>
        ) : null}
        <span className="where">
          {mid ? (
            <>
              <Icon paths={ICON.map} size={12} />
              {' ' + mapPathText(mid)}
            </>
          ) : (
            'Sem mapa'
          )}
        </span>
        {meta ? <span className="meta">{meta}</span> : null}
      </div>
    </a>
  );
}
