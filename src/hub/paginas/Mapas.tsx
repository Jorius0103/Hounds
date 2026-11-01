import {useRef, useState} from 'react';
import {useHub} from '../data';
import {Crumbs} from '../ui/Crumbs';
import {closeDialog, Dialog, openDialog} from '../ui/Dialog';
import {Icon} from '../ui/Icon';
import {ImageSlot} from '../ui/ImageSlot';
import {FullTree, MapRow} from '../ui/MapTree';
import {mapSelectOptions} from '../ui/options';
import {MapForm} from './MapaForm';

const CHEVRON = '<path d="m9 18 6-6-6-6"/>';

// Página Maps (#maps). Sem filtros, os mapas de nível superior, e cada um com submapas abre a hierarquia dele; com
// "Dentro de", a árvore daquele mapa; com uma busca ou um nível, os mapas que combinam, em cartões. As mesmas
// classes da versão antiga (css/paginas.css); os dados e a gravação dos mapas ficam em js/mundo.js.
export function MapsPage() {
  const {W} = useHub();
  const [q, setQ] = useState('');
  const [chosenWithin, setWithin] = useState('');
  const [level, setLevel] = useState('');
  // Os mapas de nível superior com a hierarquia aberta.
  const [openMaps, setOpenMaps] = useState<Record<string, boolean>>({});
  const search = useRef<HTMLInputElement>(null);
  const can = canWrite() && !!W.store && W.store.canUpload, warning = noticeText();
  const within = chosenWithin && mapById(chosenWithin) ? chosenWithin : '';
  const filtered = !!(norm(q) || within || level);

  function list() {
    if (!W.loaded.maps) return <p className="lede">Carregando mapas…</p>;
    if (!W.maps.length) {
      return (
        <div className="empty-state">
          <Icon paths={ICON.maps} size={34} stroke={1.6} />
          <strong>Nenhum mapa cadastrado</strong>
          <span>
            {can ? (
              <>
                Crie o primeiro com <b>Novo mapa</b>. Depois, ligue mapas menores a ele escolhendo o <b>mapa pai</b>.
              </>
            ) : (
              'Os mapas criados vão aparecer aqui.'
            )}
          </span>
        </div>
      );
    }
    if (!norm(q) && !level) {
      if (within) {
        return (
          <>
            <h2 className="sec-title">Dentro de {mapById(within)!.name}</h2>
            <div className="mtree">
              <MapRow m={mapById(within)!} here />
              <FullTree parent={within} />
            </div>
          </>
        );
      }
      return <Roots open={openMaps} onToggle={id => setOpenMaps(o => ({...o, [id]: !o[id]}))} />;
    }
    const found = shown().list;
    return found.length ? (
      <div className="loc-grid">
        {found.map(m => (
          <MapCard m={m} key={m.id} />
        ))}
      </div>
    ) : (
      <p className="lede">Nenhum mapa encontrado para esses filtros.</p>
    );
  }

  // Com busca ou nível: os mapas de dentro do escolhido em "Dentro de" (ou todos) que combinam.
  function shown() {
    const nq = norm(q);
    const pool = within ? mapDescendants(within).map(mapById).filter((m): m is HMap => !!m) : W.maps.slice();
    const text = (m: HMap) =>
      [m.name, mapPathText(m.id), mapLocations(m.id).map(l => l.name).join(' '), mapCharacters(m.id).map(x => x.name).join(' '), mapOrgs(m.id).map(o => o.name).join(' ')].join(' ');
    const list = pool.sort(byName).filter(m => {
      if (level === 'top' && W.parent[m.id]) return false;
      if (level === 'sub' && !W.parent[m.id]) return false;
      return !nq || norm(text(m)).indexOf(nq) >= 0;
    });
    return {list, pool};
  }

  function count() {
    if (!W.loaded.maps || !W.maps.length) return '';
    if (!norm(q) && !level) return within ? plural(mapDescendants(within).length, 'mapa dentro', 'mapas dentro') : plural(W.maps.length, 'mapa', 'mapas');
    const {list, pool} = shown();
    return list.length + ' de ' + (within ? pool.length : W.maps.length);
  }

  return (
    <>
      <div className="head-row">
        <div>
          <Crumbs node="maps" />
          <h1>Maps</h1>
          <p className="lede">Os mapas da campanha, organizados do mais amplo para o mais detalhado. Cada mapa pode ter um mapa pai e vários submapas, em quantos níveis precisar.</p>
        </div>
        {W.maps.length || can ? (
          <div className="btn-row">
            {W.maps.length ? (
              <button className="btn" type="button" id="mapTreeBtn" onClick={() => openDialog(<MapTreeDialog m={null} />)}>
                <Icon paths={ICON.tree} size={15} />
                Árvore
              </button>
            ) : null}
            {can ? (
              <button className="btn primary" type="button" id="newMapBtn" onClick={() => openDialog(<MapForm m={null} />)}>
                <Icon paths={ICON.plus} size={16} stroke={2.4} />
                Novo mapa
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      {warning ? <p className="notice">{warning}</p> : null}
      {W.maps.length ? (
        <div className="toolbar">
          <label htmlFor="mapSearch" style={{position: 'absolute', left: '-9999px'}}>
            Buscar mapas
          </label>
          <input
            className="search"
            id="mapSearch"
            type="search"
            placeholder="Buscar por nome, mapa pai, local, personagem ou organização"
            autoComplete="off"
            ref={search}
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          <select id="mapWithin" aria-label="Filtrar por mapa pai" value={within} onChange={e => setWithin(e.target.value)}>
            {mapSelectOptions('Dentro de qualquer mapa').map(o => (
              <option value={o.value} key={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select id="mapLevel" aria-label="Filtrar por nível" value={level} onChange={e => setLevel(e.target.value)}>
            <option value="">Todos os níveis</option>
            <option value="top">Só mapas de nível superior</option>
            <option value="sub">Só submapas</option>
          </select>
          <button
            className="btn ghost"
            type="button"
            id="mapClear"
            hidden={!filtered}
            onClick={() => {
              setQ('');
              setWithin('');
              setLevel('');
              search.current?.focus();
            }}
          >
            <Icon paths={ICON.x} size={14} stroke={2.4} />
            Limpar filtros
          </button>
          <span className="meta" id="mapCount">
            {count()}
          </span>
        </div>
      ) : null}
      <div id="mapList">{list()}</div>
    </>
  );
}

// Sem filtros, só os mapas de nível superior. Um com submapas abre ou fecha a hierarquia dele embaixo, e "Abrir" vai
// para a página dele; um sem submapas é um link simples. Como o mapRootsHtml antigo.
function Roots({open, onToggle}: {open: Record<string, boolean>; onToggle: (id: string) => void}) {
  const roots = childMaps(null);
  return (
    <>
      <h2 className="sec-title">
        Mapas principais · {roots.length} de {plural(W.maps.length, 'mapa', 'mapas')}
      </h2>
      <div className="mtree mroots">
        {roots.map(m => {
          const k = childMaps(m.id).length, L = mapLocations(m.id).length, isOpen = !!open[m.id] && k > 0;
          if (!k) {
            return (
              <div className="mroot" key={m.id}>
                <MapRow m={m} />
              </div>
            );
          }
          const meta = [plural(mapDescendants(m.id).length, 'submapa', 'submapas'), L ? plural(L, 'local', 'locais') : ''].filter(Boolean).join(' · ');
          return (
            <div className={'mroot' + (isOpen ? ' open' : '')} key={m.id}>
              <div className="mroot-row">
                <button
                  type="button"
                  className="mrow mroot-toggle"
                  data-root={m.id}
                  aria-expanded={isOpen}
                  title={(isOpen ? 'Fechar' : 'Abrir') + ' a hierarquia de ' + m.name}
                  onClick={e => {
                    onToggle(m.id);
                    // O foco fica no botão, como na versão antiga (num clique, o Safari não dá foco a botões).
                    e.currentTarget.focus();
                  }}
                >
                  <ImageSlot className="mthumb" imgRef={m.image && m.image.ref}>
                    <Icon paths={ICON.map} size={16} stroke={1.8} />
                  </ImageSlot>
                  <span className="mtext">
                    <b>{m.name}</b>
                    <span className="meta">{meta}</span>
                  </span>
                  <span className="fold-chev">
                    <Icon paths={CHEVRON} size={14} stroke={2.4} />
                  </span>
                </button>
                <a className="btn ghost mroot-open" href={mapHref(m.id)} title={'Abrir a página de ' + m.name}>
                  <Icon paths={ICON.arrow} size={14} />
                  Abrir
                </a>
              </div>
              {isOpen ? <FullTree parent={m.id} /> : null}
            </div>
          );
        })}
      </div>
    </>
  );
}

// O cartão de um mapa nos resultados da busca, como o mapCard antigo: onde fica e o que tem dentro.
function MapCard({m}: {m: HMap}) {
  const up = W.parent[m.id], k = childMaps(m.id).length, L = mapLocations(m.id).length;
  const meta = [k ? plural(k, 'submapa', 'submapas') : '', L ? plural(L, 'local', 'locais') : ''].filter(Boolean).join(' · ');
  return (
    <a className="loc-card" href={mapHref(m.id)}>
      <ImageSlot as="div" className="thumb" imgRef={m.image && m.image.ref}>
        <Icon paths={ICON.map} size={28} stroke={1.6} />
      </ImageSlot>
      <div className="map-card-body">
        <strong>{m.name}</strong>
        <span className="where">
          {up ? (
            <>
              <Icon paths={ICON.map} size={12} />
              {' Em ' + mapPathText(up)}
            </>
          ) : (
            'Nível superior'
          )}
        </span>
        {meta ? <span className="meta">{meta}</span> : null}
      </div>
    </a>
  );
}

/** A árvore de um mapa e de tudo o que está dentro dele (m null: todos os mapas). Um clique num mapa fecha e vai até ele. */
export function MapTreeDialog({m}: {m: HMap | null}) {
  useHub();
  const n = m ? mapDescendants(m.id).length : W.maps.length;
  function follow(e: React.MouseEvent) {
    const a = (e.target as Element).closest('a');
    if (!a) return;
    e.preventDefault();
    closeDialog();
    go(a.getAttribute('href')!);
  }
  return (
    <Dialog labelledBy="mtTitle">
      <h2 id="mtTitle">{m ? 'Árvore de ' + m.name : 'Árvore de mapas'}</h2>
      <p className="lede" style={{margin: 0}}>
        {m ? (
          <>
            {plural(n, 'mapa fica', 'mapas ficam')} dentro de <b>{m.name}</b>.
          </>
        ) : (
          plural(n, 'mapa', 'mapas') + ', ' + plural(childMaps(null).length, 'de nível superior', 'de nível superior') + '.'
        )}
      </p>
      <div className="mtree" onClick={follow}>
        {m ? (
          <>
            <MapRow m={m} here />
            <FullTree parent={m.id} />
          </>
        ) : (
          <FullTree parent={null} bare />
        )}
      </div>
    </Dialog>
  );
}
