import {useState} from 'react';
import {useHub} from '../data';
import {Crumbs} from '../ui/Crumbs';
import {openDialog} from '../ui/Dialog';
import {Icon} from '../ui/Icon';
import {ImageSlot} from '../ui/ImageSlot';
import {OrgForm} from './OrganizacaoForm';

// Página Organizações (#organizacoes): a lista, com busca por nome, reputação, descrição, membros (e cargos),
// locais e mapas. As mesmas classes da versão antiga (css/paginas.css); os dados e as funções de organização
// continuam em js/tabs/tab-organizacoes.js.
export function OrgsPage() {
  const {W} = useHub();
  const [q, setQ] = useState('');
  const can = canWrite(), warning = noticeText();

  function list() {
    if (!W.loaded.organizations) return <p className="lede">Carregando organizações…</p>;
    if (!W.organizations.length) {
      return (
        <div className="empty-state">
          <Icon paths={ICON.org} size={34} stroke={1.6} />
          <strong>Nenhuma organização cadastrada</strong>
          <span>
            {can ? (
              <>
                Crie a primeira com <b>Nova organização</b>.
              </>
            ) : (
              'As organizações criadas vão aparecer aqui.'
            )}
          </span>
        </div>
      );
    }
    const found = shown();
    return found.length ? <div className="loc-grid">{found.map(card)}</div> : <p className="lede">Nenhuma organização encontrada para essa busca.</p>;
  }

  function shown() {
    const nq = norm(q);
    const text = (o: Organization) =>
      [o.name, o.reputation || '', o.description || '', orgMembers(o).map(m => m.c.name + ' ' + m.rank).join(' '), orgLocs(o).map(l => l.name).join(' '), orgMaps(o).map(m => m.name).join(' ')].join(' ');
    return W.organizations
      .slice()
      .sort(byName)
      .filter(o => !nq || norm(text(o)).indexOf(nq) >= 0);
  }

  function card(o: Organization) {
    const n = orgMembers(o).length, L = orgLocs(o).length, M = orgMaps(o).length;
    return (
      <a className="loc-card" href={orgHref(o.id)} key={o.id}>
        <ImageSlot as="div" className="thumb" imgRef={o.image && o.image.ref}>
          <Icon paths={ICON.org} size={28} stroke={1.6} />
        </ImageSlot>
        <div className="map-card-body">
          <strong>{o.name}</strong>
          <span className="where">{o.reputation ? 'Reputação: ' + o.reputation : 'Reputação não informada'}</span>
          <span className="meta">{[n ? plural(n, 'membro', 'membros') : 'Sem membros', L ? plural(L, 'local', 'locais') : '', M ? plural(M, 'mapa', 'mapas') : ''].filter(Boolean).join(' · ')}</span>
        </div>
      </a>
    );
  }

  const count = !W.loaded.organizations || !W.organizations.length ? '' : norm(q) ? shown().length + ' de ' + W.organizations.length : plural(W.organizations.length, 'organização', 'organizações');
  return (
    <>
      <div className="head-row">
        <div>
          <Crumbs node="orgs" />
          <h1>Organizações</h1>
          <p className="lede">
            Guildas, ordens, casas e bandos do mundo. Cada organização tem reputação e membros, e cada membro pode ter um cargo, como Líder ou General. Também pode ser ligada aos locais e mapas onde atua.
          </p>
        </div>
        {can ? (
          <button className="btn primary" type="button" id="newOrgBtn" onClick={() => openDialog(<OrgForm o={null} />)}>
            <Icon paths={ICON.plus} size={16} stroke={2.4} />
            Nova organização
          </button>
        ) : null}
      </div>
      {warning ? <p className="notice">{warning}</p> : null}
      {W.organizations.length ? (
        <div className="toolbar">
          <label htmlFor="orgSearch" style={{position: 'absolute', left: '-9999px'}}>
            Buscar organizações
          </label>
          <input className="search" id="orgSearch" type="search" placeholder="Buscar por nome, reputação, membro, local ou mapa" autoComplete="off" value={q} onChange={e => setQ(e.target.value)} />
          <span className="meta" id="orgCount">
            {count}
          </span>
        </div>
      ) : null}
      <div id="orgList">{list()}</div>
    </>
  );
}
