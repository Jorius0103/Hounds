import {useState} from 'react';
import {useHub} from '../data';
import {Crumbs} from '../ui/Crumbs';
import {Icon} from '../ui/Icon';
import {ImageSlot} from '../ui/ImageSlot';

// Página Personagens (#personagens): todos os personagens em cartões, com a busca por nome, raça, organização,
// descrição, locais, mapas e relacionamentos, e em cada cartão o botão de apresentar o personagem para todos. As
// mesmas classes da versão antiga (css/paginas.css); os dados, a gravação, o formulário (openCharForm) e a
// apresentação (CharPresentation) continuam em js/tabs/tab-personagens.js.
export function CharsPage() {
  const {W} = useHub();
  const [q, setQ] = useState('');
  const can = canWrite(), warning = noticeText();

  function list() {
    if (!W.loaded.characters) return <p className="lede">Carregando personagens…</p>;
    if (!W.characters.length) {
      return (
        <div className="empty-state">
          <Icon paths={ICON.users} size={34} stroke={1.6} />
          <strong>Nenhum personagem cadastrado</strong>
          <span>
            {can ? (
              <>
                Crie o primeiro com <b>Novo personagem</b>.
              </>
            ) : (
              'Os personagens criados vão aparecer aqui.'
            )}
          </span>
        </div>
      );
    }
    const found = shown();
    return found.length ? (
      <div className="loc-grid">
        {found.map(c => (
          <CharCard c={c} key={c.id} />
        ))}
      </div>
    ) : (
      <p className="lede">Nenhum personagem encontrado para essa busca.</p>
    );
  }

  function shown() {
    const nq = norm(q);
    const text = (c: Character) =>
      [
        c.name,
        c.race || '',
        charOrgText(c),
        c.description || '',
        charLocations(c.id).map(l => l.name).join(' '),
        charMaps(c).map(m => m.name).join(' '),
        charRelations(c).map(r => r.c.name).join(' '),
      ].join(' ');
    return W.characters
      .slice()
      .sort(byName)
      .filter(c => !nq || norm(text(c)).indexOf(nq) >= 0);
  }

  const count = !W.loaded.characters || !W.characters.length ? '' : norm(q) ? shown().length + ' de ' + W.characters.length : plural(W.characters.length, 'personagem', 'personagens');
  return (
    <>
      <div className="head-row">
        <div>
          <Crumbs node="chars" />
          <h1>Personagens</h1>
          <p className="lede">Jogadores, aliados e NPCs do mundo. Cada personagem pode ter raça, organização e locais onde vive ou costuma estar.</p>
        </div>
        {can ? (
          <button className="btn primary" type="button" id="newCharBtn" onClick={() => openCharForm(null)}>
            <Icon paths={ICON.plus} size={16} stroke={2.4} />
            Novo personagem
          </button>
        ) : null}
      </div>
      {warning ? <p className="notice">{warning}</p> : null}
      {W.characters.length ? (
        <div className="toolbar">
          <label htmlFor="charSearch" style={{position: 'absolute', left: '-9999px'}}>
            Buscar personagens
          </label>
          <input
            className="search"
            id="charSearch"
            type="search"
            placeholder="Buscar por nome, raça, organização, mapa ou local"
            autoComplete="off"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          <span className="meta" id="charCount">
            {count}
          </span>
        </div>
      ) : null}
      <div id="charList">{list()}</div>
    </>
  );
}

// O cartão de um personagem na lista: o retrato (ou as iniciais), a raça e as organizações, quantos mapas, locais e
// relacionamentos ele tem, e o botão que o apresenta para todos sem abrir a página dele.
function CharCard({c}: {c: Character}) {
  const L = charLocations(c.id).length, M = charMaps(c).length, R = charRelations(c).length, sub = charSubtitle(c);
  return (
    <a className="loc-card" href={charHref(c.id)}>
      <button
        className="char-card-present-btn"
        type="button"
        data-present-id={c.id}
        title="Apresentar personagem para todos"
        aria-label={'Apresentar ' + c.name}
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
          CharPresentation.broadcast(c.id);
        }}
      >
        <Icon paths={ICON.present} size={14} stroke={2} />
      </button>
      <ImageSlot as="div" className="thumb char-thumb" imgRef={c.image && c.image.ref}>
        <span className="initials">{initials(c.name)}</span>
      </ImageSlot>
      <div className="map-card-body">
        <strong>{c.name}</strong>
        <span className="where">{sub ? sub : 'Sem raça ou organização'}</span>
        {L || M || R ? (
          <span className="meta">{[M ? plural(M, 'mapa', 'mapas') : '', L ? plural(L, 'local', 'locais') : '', R ? plural(R, 'relação', 'relações') : ''].filter(Boolean).join(' · ')}</span>
        ) : null}
      </div>
    </a>
  );
}
