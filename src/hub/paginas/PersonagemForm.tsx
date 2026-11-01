import {useEffect, useRef, useState} from 'react';
import {useHub} from '../data';
import {Datalist} from '../ui/Datalist';
import {closeDialog, Dialog} from '../ui/Dialog';
import {Icon} from '../ui/Icon';
import {ImageField, noImagePick, type ImagePick} from '../ui/ImageField';
import {ImageSlot} from '../ui/ImageSlot';
import {TextPicker, type TextPickerOption} from '../ui/TextPicker';
import {VisibilityFlag, visDraft, visFields, type VisDraft} from '../ui/Visibility';

/** Uma organização escolhida: uma que existe (id) ou um nome novo (id null), criada ao salvar; text é o cargo. */
type OrgPick = {id: string | null; name?: string; text: string};
/** Um relacionamento: o outro personagem (id) e, em text, como este personagem o vê. */
type RelPick = {id: string; text: string};

/**
 * Criar (c null) ou editar um personagem: nome, imagem, descrição, raça, organizações com o cargo, mapas, locais,
 * relacionamentos e visibilidade. Grava com o Ops.saveCharacter de js/tabs/tab-personagens.js e depois as
 * organizações com o Ops.setCharOrgs de js/tabs/tab-organizacoes.js, que cria as novas.
 */
export function CharForm({c}: {c: Character | null}) {
  const {W} = useHub();
  const editing = !!c, canImg = !!W.store && W.store.canUpload;
  const [name, setName] = useState(c ? c.name : '');
  const [desc, setDesc] = useState(c ? c.description || '' : '');
  const [race, setRace] = useState(c ? c.race || '' : '');
  const [orgs, setOrgs] = useState<OrgPick[]>(() => startOrgs(c));
  const [maps, setMaps] = useState<string[]>(() => (c ? charMaps(c).map(m => m.id) : []));
  const [locs, setLocs] = useState<string[]>(() => (c ? charLocations(c.id).map(l => l.id) : []));
  const [rels, setRels] = useState<RelPick[]>(() => startRels(c));
  const [vis, setVis] = useState<VisDraft>(() => visDraft(c));
  const [img, setImg] = useState<ImagePick>(noImagePick);
  const [nameErr, setNameErr] = useState('');
  const [formErr, setFormErr] = useState('');
  // Nome repetido ao criar: avisa uma vez, e o segundo clique em Criar personagem continua mesmo assim.
  const [warned, setWarned] = useState(false);
  const [saving, setSaving] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const drop = useRef<HTMLLabelElement>(null);

  // As raças já usadas e depois as padrão que faltam; para os relacionamentos, os outros personagens.
  const races = distinct('race');
  RACE_DEFAULTS.forEach(r => {
    if (!races.some(x => norm(x) === norm(r))) races.push(r);
  });
  const others = W.characters.filter(o => !c || o.id !== c.id).sort(byName);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    const n = name.trim();
    if (!n) {
      setNameErr('Informe o nome do personagem.');
      nameInput.current?.focus();
      return;
    }
    if (!editing && W.characters.some(x => norm(x.name) === norm(n)) && !warned) {
      setFormErr('Já existe um personagem com esse nome. Clique em Criar personagem de novo para criar mesmo assim.');
      setWarned(true);
      return;
    }
    if (canImg && img.error && !img.file) {
      drop.current?.focus();
      return;
    }
    setSaving(true);
    setFormErr('');
    const v = visFields(c, true, vis);
    const fields = {
      name: n,
      description: desc.trim(),
      race: race.trim(),
      mapIds: maps.filter(id => mapById(id)),
      relations: rels.filter(r => charById(r.id)).map(r => ({charId: r.id, type: r.text.trim()})),
      ...v,
    };
    Ops.saveCharacter(c, fields, canImg ? img.file : null, canImg ? img.dims : null, canImg && img.removed, locs.filter(id => locById(id)))
      .then(id => Ops.setCharOrgs(id, orgs.filter(s => !s.id || orgById(s.id)), v.visible, v.sharedWith).then(() => id))
      .then(
        id => {
          closeDialog();
          toast(editing ? 'Personagem salvo.' : 'Personagem criado.');
          if (!editing) go(charHref(id));
        },
        er => {
          setSaving(false);
          setFormErr(errorText(er));
        },
      );
  }

  const saveLabel = saving ? (canImg && img.file ? 'Enviando imagem…' : 'Salvando…') : editing ? 'Salvar personagem' : 'Criar personagem';
  const existing = c && c.image ? {ref: c.image.ref, name: 'Imagem atual', dims: c.image.w ? c.image.w + ' × ' + c.image.h + ' px' : ''} : null;
  return (
    <Dialog labelledBy="cfTitle" busy={saving}>
      <form id="charForm" noValidate onSubmit={submit}>
        <h2 id="cfTitle">{editing ? 'Editar personagem' : 'Novo personagem'}</h2>
        <div className={'field' + (nameErr ? ' invalid' : '')} id="f_cname">
          <label htmlFor="cname">Nome</label>
          <input
            type="text"
            id="cname"
            maxLength={100}
            autoComplete="off"
            placeholder="Ex.: Brynhild"
            ref={nameInput}
            value={name}
            onChange={e => {
              setName(e.target.value);
              if (e.target.value.trim()) setNameErr('');
            }}
          />
          <div className="err" id="err_cname">
            {nameErr}
          </div>
        </div>
        {canImg ? <ImageField id="cimg" label="Imagem" help="Retrato ou ilustração. Opcional, até 20 MB." removable existing={existing} value={img} onChange={setImg} dropRef={drop} /> : null}
        <div className="field">
          <label htmlFor="cdesc">Descrição</label>
          <textarea id="cdesc" rows={6} maxLength={20000} placeholder="Quem é, aparência, história, ligação com o grupo…" value={desc} onChange={e => setDesc(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="crace">Raça</label>
          <input type="text" id="crace" list="raceList" maxLength={60} autoComplete="off" placeholder="Ex.: Anão" value={race} onChange={e => setRace(e.target.value)} />
          <Datalist id="raceList" options={races} />
        </div>
        <TextPicker
          id="corg"
          listId="cOrgList"
          boxId="cOrgSel"
          label="Organizações"
          placeholder="Buscar ou criar organização"
          hint="Opcional. Ao lado de cada uma, o cargo do personagem nela. Ex.: Líder, General. Digite um nome novo para criar a organização."
          textLabel="Cargo"
          datalist={{id: 'cRankList', options: rankTypes()}}
          sel={orgs}
          onChange={setOrgs}
          rowKey={s => (s.id ? 'id:' + s.id : 'nova:' + norm(s.name || ''))}
          name={orgPickName}
          chip={s => {
            const o = s.id ? orgById(s.id) : null;
            if (s.id && !o) return null;
            return (
              <span className="person">
                <ImageSlot as="i" imgRef={o && o.image && o.image.ref}>
                  <Icon paths={ICON.org} size={12} stroke={2.4} />
                </ImageSlot>
                {orgPickName(s)}
                {s.id ? '' : ' (nova)'}
              </span>
            );
          }}
          find={(q, raw) => {
            const out: TextPickerOption<OrgPick>[] = W.organizations
              .slice()
              .sort(byName)
              .filter(o => !orgs.some(s => s.id === o.id) && (!q || norm(o.name).indexOf(q) >= 0))
              .map(o => {
                const n = orgMembers(o).length;
                return {label: o.name, sub: n ? plural(n, 'membro', 'membros') : 'Sem membros', pick: {id: o.id, text: ''}};
              });
            // Um nome que ainda não existe nem foi escolhido pode virar uma organização nova.
            const taken = W.organizations.some(o => norm(o.name) === q) || orgs.some(s => norm(orgPickName(s)) === q);
            if (q && !taken) out.push({label: 'Criar organização “' + raw + '”', sub: 'Nova', pick: {id: null, name: raw, text: ''}});
            return out;
          }}
        />
        <MapPicker sel={maps} onChange={setMaps} />
        <LocPicker sel={locs} onChange={setLocs} />
        <TextPicker
          id="crel"
          listId="cRelList"
          boxId="cRelSel"
          optionId="ropt"
          label="Relacionamentos"
          placeholder="Buscar personagem"
          empty={others.length ? '' : 'Nenhum outro personagem cadastrado ainda'}
          hint="Opcional. Ao lado de cada um, diga como este personagem o vê. Ex.: Irmão, Rival, Mentor. A relação aparece na ficha dos dois."
          textLabel="Tipo de relação"
          textAria={s => 'Tipo de relação com ' + (charById(s.id) || {name: ''}).name}
          subAlways
          datalist={{id: 'relTypeList', options: relationTypes()}}
          sel={rels}
          onChange={setRels}
          rowKey={s => s.id}
          name={s => (charById(s.id) || {name: ''}).name}
          chip={s => {
            const o = charById(s.id);
            return (
              o && (
                <span className="person">
                  <ImageSlot as="i" imgRef={o.image && o.image.ref}>
                    {initials(o.name)}
                  </ImageSlot>
                  {o.name}
                </span>
              )
            );
          }}
          find={q =>
            others
              .filter(o => !rels.some(r => r.id === o.id) && (!q || norm(o.name + ' ' + charSubtitle(o)).indexOf(q) >= 0))
              .map(o => ({label: o.name, sub: charSubtitle(o), pick: {id: o.id, text: ''}}))
          }
        />
        <VisibilityFlag id="cvis" item={c} share draft={vis} onChange={setVis} />
        <div className="form-err" id="cfErr" role="alert">
          {formErr}
        </div>
        <div className="btn-row" style={{justifyContent: 'flex-end'}}>
          <button className="btn ghost" type="button" id="cfCancel" disabled={saving} onClick={() => closeDialog()}>
            Cancelar
          </button>
          <button className="btn primary" type="submit" id="cfSave" disabled={saving}>
            {saveLabel}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

// As organizações do personagem com os cargos e, se ainda houver, a do campo antigo de texto livre: a organização
// com esse nome, ou um nome novo, que vira organização ao salvar.
function startOrgs(c: Character | null): OrgPick[] {
  if (!c) return [];
  const out: OrgPick[] = charOrgs(c.id).map(x => ({id: x.o.id, text: x.rank}));
  const old = (c.organization || '').trim();
  if (old) {
    const o = W.organizations.filter(x => norm(x.name) === norm(old))[0];
    if (!o) out.push({id: null, name: old, text: ''});
    else if (!out.some(s => s.id === o.id)) out.push({id: o.id, text: ''});
  }
  return out;
}

// Os relacionamentos que o personagem declarou, cada outro personagem uma vez.
function startRels(c: Character | null): RelPick[] {
  const out: RelPick[] = [];
  if (c) {
    (c.relations || []).forEach(r => {
      if (r.charId !== c.id && charById(r.charId) && !out.some(x => x.id === r.charId)) out.push({id: r.charId, text: r.type || ''});
    });
  }
  return out;
}

function orgPickName(s: OrgPick) {
  return s.id ? (orgById(s.id) || {name: ''}).name : s.name || '';
}

/**
 * Os mapas do personagem: sem busca, todos na ordem da árvore, cada nível mais recuado; com busca, os que combinam
 * pelo nome, sem recuo. Como o seletor de mapas do formulário antigo (cMapSel, cMapList e as opções mopt…).
 */
function MapPicker({sel, onChange}: {sel: string[]; onChange: (sel: string[]) => void}) {
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<{m: HMap; d: number}[]>([]);
  const [active, setActive] = useState(0);
  // Como na versão antiga, a opção ativa anunciada fica no campo depois que a lista fecha.
  const [activeId, setActiveId] = useState<string | null>(null);
  // Ao tirar um escolhido, o foco volta para a busca depois que a seleção nova é desenhada (veja o IdPicker).
  const focusInput = useRef(false);

  useEffect(() => {
    if (!focusInput.current) return;
    focusInput.current = false;
    input.current?.focus();
  });

  function paint(q: string, want: number) {
    const nq = norm(q.trim()), ordered: {m: HMap; d: number}[] = [];
    (function walk(pid: string | null, d: number) {
      childMaps(pid).forEach(m => {
        ordered.push({m, d});
        walk(m.id, d + 1);
      });
    })(null, 0);
    const found = ordered.filter(o => sel.indexOf(o.m.id) < 0 && (!nq || norm(o.m.name).indexOf(nq) >= 0)).slice(0, 60);
    setOptions(found);
    if (!found.length) return setOpen(false);
    const a = Math.min(want, found.length - 1);
    setActive(a);
    setOpen(true);
    setActiveId('mopt' + a);
  }

  function pick(i: number) {
    const o = options[i];
    if (!o) return;
    onChange(sel.concat([o.m.id]));
    setQuery('');
    setActive(0);
    setOpen(false);
    input.current?.focus();
  }

  function keyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      paint(query, open ? Math.min(options.length - 1, active + 1) : 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      paint(query, Math.max(0, active - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && options.length) pick(active);
    } else if (e.key === 'Escape' && open) {
      // Fecha só a lista: o Esc não chega ao modal (js/explorer.js).
      e.stopPropagation();
      setOpen(false);
    } else if (e.key === 'Backspace' && !query && sel.length) {
      onChange(sel.slice(0, -1));
    }
  }

  const typed = !!norm(query.trim());
  return (
    <div className="field">
      <label htmlFor="cmap">Mapas relacionados</label>
      <div className="picker">
        <div className="people" id="cMapSel">
          {sel.map((id, i) => {
            const m = mapById(id);
            return m ? (
              <span className="person" key={id}>
                <i>
                  <Icon paths={ICON.map} size={12} stroke={2.4} />
                </i>
                {m.name}
                <button
                  type="button"
                  data-rm={i}
                  aria-label={'Remover ' + m.name}
                  onClick={() => {
                    focusInput.current = true;
                    onChange(sel.filter((_, j) => j !== i));
                  }}
                >
                  <Icon paths={ICON.x} size={12} stroke={2.6} />
                </button>
              </span>
            ) : null;
          })}
        </div>
        <input
          type="text"
          id="cmap"
          ref={input}
          autoComplete="off"
          placeholder={W.maps.length ? 'Buscar mapa' : 'Nenhum mapa cadastrado ainda'}
          disabled={!W.maps.length}
          role="combobox"
          aria-expanded={open}
          aria-controls="cMapList"
          aria-autocomplete="list"
          aria-activedescendant={activeId || undefined}
          value={query}
          onFocus={() => paint(query, active)}
          onChange={e => {
            setQuery(e.target.value);
            paint(e.target.value, 0);
          }}
          onKeyDown={keyDown}
          onBlur={() =>
            setTimeout(() => {
              if (document.activeElement !== input.current) setOpen(false);
            }, 150)
          }
        />
        <div className="suggest" id="cMapList" role="listbox" hidden={!open} onMouseDown={e => e.preventDefault()}>
          {options.map((o, i) => {
            const up = mapChain(o.m.id)
              .slice(0, -1)
              .map(x => x.name)
              .join(' › ');
            return (
              <button type="button" role="option" id={'mopt' + i} data-i={i} key={o.m.id} className={i === active ? 'act' : ''} aria-selected={i === active} onClick={() => pick(i)}>
                <span style={{paddingLeft: typed ? 0 : o.d * 14}}>
                  {o.d && !typed ? '└ ' : ''}
                  {o.m.name}
                </span>
                <small>{up || 'Nível superior'}</small>
              </button>
            );
          })}
        </div>
      </div>
      <span className="hint-text">Opcional. Ex.: o reino de onde vem ou as regiões por onde anda.</span>
    </div>
  );
}

/**
 * Os locais do personagem, em ordem alfabética, buscados pelo caminho (o local de cima) e pelo mapa; Backspace tira o
 * último e reabre a lista. Como o seletor de locais do formulário antigo (cLocSel, cLocList e as opções copt…).
 */
function LocPicker({sel, onChange}: {sel: string[]; onChange: (sel: string[]) => void}) {
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<HLocation[]>([]);
  const [active, setActive] = useState(0);
  // Como na versão antiga, a opção ativa anunciada fica no campo depois que a lista fecha.
  const [activeId, setActiveId] = useState<string | null>(null);
  // Ao tirar um escolhido, o foco volta para a busca depois que a seleção nova é desenhada (veja o IdPicker).
  const focusInput = useRef(false);

  useEffect(() => {
    if (!focusInput.current) return;
    focusInput.current = false;
    input.current?.focus();
  });

  function paint(q: string, want: number, picked = sel) {
    const nq = norm(q.trim());
    const found = W.locations
      .slice()
      .sort(byName)
      .filter(l => picked.indexOf(l.id) < 0 && (!nq || norm(locPathText(l.id) + ' ' + mapPathText(locMapId(l) || '')).indexOf(nq) >= 0))
      .slice(0, 40);
    setOptions(found);
    if (!found.length) return setOpen(false);
    const a = Math.min(want, found.length - 1);
    setActive(a);
    setOpen(true);
    setActiveId('copt' + a);
  }

  function pick(i: number) {
    const l = options[i];
    if (!l) return;
    onChange(sel.concat([l.id]));
    setQuery('');
    setActive(0);
    setOpen(false);
    input.current?.focus();
  }

  function keyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      paint(query, open ? Math.min(options.length - 1, active + 1) : 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      paint(query, Math.max(0, active - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && options.length) pick(active);
    } else if (e.key === 'Escape' && open) {
      // Fecha só a lista: o Esc não chega ao modal (js/explorer.js).
      e.stopPropagation();
      setOpen(false);
    } else if (e.key === 'Backspace' && !query && sel.length) {
      const next = sel.slice(0, -1);
      onChange(next);
      paint(query, active, next);
    }
  }

  return (
    <div className="field">
      <label htmlFor="cloc">Locais relacionados</label>
      <div className="picker">
        <div className="people" id="cLocSel">
          {sel.map((id, i) => {
            const l = locById(id);
            return l ? (
              <span className="person" key={id}>
                <i>
                  <Icon paths={ICON.pin} size={12} stroke={2.4} />
                </i>
                {l.name}
                <button
                  type="button"
                  data-rm={i}
                  aria-label={'Remover ' + l.name}
                  onClick={() => {
                    focusInput.current = true;
                    onChange(sel.filter((_, j) => j !== i));
                  }}
                >
                  <Icon paths={ICON.x} size={12} stroke={2.6} />
                </button>
              </span>
            ) : null;
          })}
        </div>
        <input
          type="text"
          id="cloc"
          ref={input}
          autoComplete="off"
          placeholder={W.locations.length ? 'Buscar local' : 'Nenhum local cadastrado ainda'}
          disabled={!W.locations.length}
          role="combobox"
          aria-expanded={open}
          aria-controls="cLocList"
          aria-autocomplete="list"
          aria-activedescendant={activeId || undefined}
          value={query}
          onFocus={() => paint(query, active)}
          onChange={e => {
            setQuery(e.target.value);
            paint(e.target.value, 0);
          }}
          onKeyDown={keyDown}
          onBlur={() =>
            setTimeout(() => {
              if (document.activeElement !== input.current) setOpen(false);
            }, 150)
          }
        />
        <div className="suggest" id="cLocList" role="listbox" hidden={!open} onMouseDown={e => e.preventDefault()}>
          {options.map((l, i) => {
            const m = mapById(locMapId(l) || '');
            return (
              <button type="button" role="option" id={'copt' + i} data-i={i} key={l.id} className={i === active ? 'act' : ''} aria-selected={i === active} onClick={() => pick(i)}>
                {locPathText(l.id)}
                <small>{m ? m.name : 'Sem mapa'}</small>
              </button>
            );
          })}
        </div>
      </div>
      <span className="hint-text">Opcional. Os locais criados em Locais aparecem aqui.</span>
    </div>
  );
}
