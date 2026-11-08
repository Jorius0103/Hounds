import {Fragment, useEffect} from 'react';
import type {HubPageProps} from '../pages';
import {useHub} from '../data';
import {Crumbs} from '../ui/Crumbs';
import {FoldBox} from '../ui/FoldBox';
import {Icon} from '../ui/Icon';
import {PtName} from '../ui/PtName';
import {CinematicBadge, showCombatTab} from './Combate';

// Página de uma regra cinemática (#cinematica~id), em Combate: o texto do livro, o tema e de onde ela vem, com as mesmas
// classes da página de uma técnica (css/paginas.css). As regras são só dos livros (dados/cinematicas.json): não há
// editar nem excluir. O link de volta abre Combate na aba Cinematic.
export function CinematicPage({route}: HubPageProps) {
  const {W} = useHub();
  const x = cinematicById(route.cineId);

  useEffect(() => {
    loadCatalog('cinematics');
  }, []);

  const back = (
    <a className="btn" href="#combate" id="cineBackBtn" onClick={() => showCombatTab('cine')}>
      <Icon paths={ICON.cinematic} size={15} />
      Ver as regras cinemáticas
    </a>
  );

  if (!x) {
    return (
      <>
        <Crumbs node="combat" />
        {W.loaded.cinematics ? (
          <>
            <h1>Regra cinemática não encontrada</h1>
            <p className="lede">O link pode estar incorreto.</p>
            <div>{back}</div>
          </>
        ) : (
          <p className="lede">Carregando regra…</p>
        )}
      </>
    );
  }

  const source = [x.book, x.page ? 'p. ' + x.page : ''].filter(Boolean).join(' · ');
  return (
    <>
      <Crumbs node={'cine:' + x.id} />
      <div className="head-row">
        <div>
          <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4}}>
            <span className="badge">
              <Icon paths={ICON.cinematic} size={12} stroke={2.4} />
              {' Cinematic'}
            </span>
            <CinematicBadge x={x} />
          </div>
          <h1>{x.name}</h1>
          <PtName item={x} as="p" />
          <p className="lede">{[x.section, source].filter(Boolean).join(' · ')}</p>
        </div>
        <div className="btn-row">{back}</div>
      </div>
      <div className="loc-layout">
        <div className="side" style={{gap: 22}}>
          <section>
            <h2 className="sec-title">Descrição</h2>
            {x.description ? <p className="long">{x.description}</p> : <p className="long none">Sem descrição cadastrada.</p>}
          </section>
        </div>
        <div className="side">
          <FoldBox foldKey="params" title="Parâmetros" startOpen>
            <dl className="facts">
              <Fact label="Tema" value={x.category} />
              <Fact label="Seção do livro" value={x.section} />
              <Fact label="Livro" value={x.book} />
              <Fact label="Página" value={x.page} />
            </dl>
          </FoldBox>
        </div>
      </div>
    </>
  );
}

function Fact({label, value}: {label: string; value?: string}) {
  return (
    <Fragment>
      <dt>{label}</dt>
      <dd>{value ? value : <span className="none">—</span>}</dd>
    </Fragment>
  );
}
