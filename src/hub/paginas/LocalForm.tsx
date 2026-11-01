import {useEffect, useRef, useState} from 'react';
import {useHub} from '../data';
import {closeDialog, Dialog} from '../ui/Dialog';
import {Icon} from '../ui/Icon';
import {ImageField, noImagePick, type ImagePick} from '../ui/ImageField';
import {locSelectOptions, mapSelectOptions} from '../ui/options';
import {VisibilityFlag, visDraft, visFields, type VisDraft} from '../ui/Visibility';

/** Um personagem escolhido: um cadastrado (id), um da Mesa de Combate (mesaId) ou um nome novo. */
type CharPick = {id?: string; name: string; source?: string; mesaId?: string | null};
type CharOption = CharPick & {tag: string; create?: boolean};

/**
 * Criar (l null) ou editar um local: nome, o local onde fica, duas imagens, descrição, personagens, mapa e
 * visibilidade. Grava com o Ops.saveLocation de js/mundo.js, depois de criar os personagens que ainda não existem
 * (Ops.ensureCharacters). presetMap e presetParent: aberto por "Novo local dentro deste" (página do local) ou
 * "Novo local neste mapa" (página do mapa, pelo window.hubOpenLocationForm de src/hub/main.tsx).
 */
export function LocationForm({l, presetMap = '', presetParent = ''}: {l: HLocation | null; presetMap?: string; presetParent?: string}) {
  const {W} = useHub();
  const editing = !!l, canImg = !!W.store && W.store.canUpload;
  const [name, setName] = useState(l ? l.name : '');
  const [parent, setParent] = useState(() => (l ? W.locParent[l.id] || '' : presetParent));
  const [desc, setDesc] = useState(l ? l.description || '' : '');
  const [chars, setChars] = useState<CharPick[]>(() => (l ? locChars(l).map(c => ({id: c.id, name: c.name})) : []));
  const [mapId, setMapId] = useState(() => (l ? locMapId(l) || '' : presetMap));
  const [vis, setVis] = useState<VisDraft>(() => visDraft(l));
  const [img, setImg] = useState<ImagePick>(noImagePick);
  const [img2, setImg2] = useState<ImagePick>(noImagePick);
  const [nameErr, setNameErr] = useState('');
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const drop = useRef<HTMLLabelElement>(null);
  const drop2 = useRef<HTMLLabelElement>(null);
  // Editando, o próprio local e os que estão dentro dele não podem ser o local de cima.
  const exclude = l ? badLocParents(l.id) : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    const n = name.trim();
    if (!n) {
      setNameErr('Informe o nome do local.');
      nameInput.current?.focus();
      return;
    }
    if (canImg && img.error && !img.file) {
      drop.current?.focus();
      return;
    }
    if (canImg && img2.error && !img2.file) {
      drop2.current?.focus();
      return;
    }
    setSaving(true);
    setFormErr('');
    const v = visFields(l, true, vis);
    const fields = {name: n, description: desc.trim(), mapId: mapId && mapById(mapId) ? mapId : null, parentId: parent && locById(parent) ? parent : null, ...v};
    Ops.ensureCharacters(chars, v.visible, v.sharedWith)
      .then(ids =>
        Ops.saveLocation(l, {...fields, characterIds: ids}, canImg ? img.file : null, canImg ? img.dims : null, canImg && img.removed, canImg ? {file: img2.file, dims: img2.dims, removed: img2.removed} : null),
      )
      .then(
        id => {
          closeDialog();
          toast(editing ? 'Local salvo.' : 'Local criado.');
          if (!editing) go(locHref(id));
        },
        er => {
          setSaving(false);
          setFormErr(errorText(er));
        },
      );
  }

  const sending = (canImg && img.file ? 1 : 0) + (canImg && img2.file ? 1 : 0);
  const saveLabel = saving ? (sending ? (sending > 1 ? 'Enviando imagens…' : 'Enviando imagem…') : 'Salvando…') : editing ? 'Salvar local' : 'Criar local';
  const current = (im: ImageInfo | null | undefined) => (l && im && im.ref ? {ref: im.ref, name: 'Imagem atual', dims: im.w ? im.w + ' × ' + im.h + ' px' : ''} : null);
  return (
    <Dialog labelledBy="lfTitle" busy={saving}>
      <form id="locForm" noValidate onSubmit={submit}>
        <h2 id="lfTitle">{editing ? 'Editar local' : 'Novo local'}</h2>
        <div className={'field' + (nameErr ? ' invalid' : '')} id="f_lname">
          <label htmlFor="lname">Nome do local</label>
          <input
            type="text"
            id="lname"
            maxLength={100}
            autoComplete="off"
            placeholder="Ex.: Taverna Anão Caolho"
            ref={nameInput}
            value={name}
            onChange={e => {
              setName(e.target.value);
              if (e.target.value.trim()) setNameErr('');
            }}
          />
          <div className="err" id="err_lname">
            {nameErr}
          </div>
        </div>
        <div className="field">
          <label htmlFor="lparent">Fica dentro de</label>
          <select id="lparent" value={parent} onChange={e => setParent(e.target.value)}>
            {locSelectOptions('Nenhum (local de nível superior)', exclude).map(o => (
              <option value={o.value} key={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <span className="hint-text">
            O local maior onde este fica. Ex.: uma taverna dentro de uma cidade.
            {exclude && Object.keys(exclude).length > 1 ? ' Os locais que estão dentro deste não aparecem na lista.' : ''}
          </span>
        </div>
        {canImg ? (
          <>
            <ImageField
              id="limg"
              label="Imagem de referência"
              help="Foto, ilustração, arte conceitual ou planta. Opcional, até 20 MB. É a que aparece nas miniaturas."
              removable
              existing={current(l && l.image)}
              value={img}
              onChange={setImg}
              dropRef={drop}
            />
            <ImageField
              id="limg2"
              label="Segunda imagem"
              help="Opcional, até 20 MB. Ex.: outro ângulo, a planta ou um detalhe do local."
              removable
              existing={current(l && l.image2)}
              value={img2}
              onChange={setImg2}
              dropRef={drop2}
            />
          </>
        ) : null}
        <div className="field">
          <label htmlFor="ldesc">Descrição</label>
          <textarea id="ldesc" rows={7} maxLength={20000} placeholder="História, aparência, quem vive ali, o que o grupo descobriu…" value={desc} onChange={e => setDesc(e.target.value)} />
        </div>
        <CharNamePicker sel={chars} onChange={setChars} />
        <div className="field">
          <label htmlFor="lmap">Mapa relacionado</label>
          <select id="lmap" value={mapId} onChange={e => setMapId(e.target.value)}>
            {mapSelectOptions('Nenhum mapa').map(o => (
              <option value={o.value} key={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <span className="hint-text">O mapa onde este local fica, dentro da hierarquia de mapas.</span>
        </div>
        <VisibilityFlag id="lvis" item={l} share draft={vis} onChange={setVis} />
        <div className="form-err" id="lfErr" role="alert">
          {formErr}
        </div>
        <div className="btn-row" style={{justifyContent: 'flex-end'}}>
          <button className="btn ghost" type="button" id="lfCancel" disabled={saving} onClick={() => closeDialog()}>
            Cancelar
          </button>
          <button className="btn primary" type="submit" id="lfSave" disabled={saving}>
            {saveLabel}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

/**
 * Os personagens do local: a busca sugere os cadastrados e os da Mesa de Combate (mesaCharacters, de js/mundo.js) e,
 * para um nome que não está em nenhum dos dois, "Adicionar “nome”". Como o seletor do formulário antigo.
 */
function CharNamePicker({sel, onChange}: {sel: CharPick[]; onChange: (sel: CharPick[]) => void}) {
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<CharOption[]>([]);
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

  function compute(raw: string, picked: CharPick[]) {
    const typed = raw.trim(), q = norm(typed);
    const has = (n: string) => picked.some(s => norm(s.name) === norm(n));
    let out: CharOption[] = [];
    W.characters
      .slice()
      .sort(byName)
      .forEach(c => {
        if (!has(c.name) && (!q || norm(c.name).indexOf(q) >= 0)) out.push({id: c.id, name: c.name, tag: 'Cadastrado'});
      });
    mesaCharacters().forEach(c => {
      if (has(c.name) || out.some(o => norm(o.name) === norm(c.name))) return;
      if (!q || norm(c.name).indexOf(q) >= 0) out.push({name: c.name, source: 'mesa', mesaId: c.mesaId, tag: 'Mesa · ' + c.kind});
    });
    out = out.slice(0, 30);
    if (typed && !has(typed) && !out.some(o => norm(o.name) === norm(typed))) out.push({name: typed, source: 'manual', tag: 'Novo', create: true});
    return out;
  }

  function paint(q: string, want: number, picked = sel) {
    const found = compute(q, picked);
    setOptions(found);
    if (!found.length) return setOpen(false);
    const a = Math.min(want, found.length - 1);
    setActive(a);
    setOpen(true);
    setActiveId('opt' + a);
  }

  function pick(i: number) {
    const o = options[i];
    if (!o) return;
    onChange(sel.concat([{id: o.id, name: o.name, source: o.source, mesaId: o.mesaId}]));
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
      // Tira o último e reabre a lista, já com ele de volta.
      const next = sel.slice(0, -1);
      onChange(next);
      paint(query, active, next);
    }
  }

  return (
    <div className="field">
      <label htmlFor="lchar">Personagens relacionados</label>
      <div className="picker" id="picker">
        <div className="people" id="pickSel">
          {sel.map((s, i) => (
            <span className="person" key={i}>
              <i>{initials(s.name)}</i>
              {s.name}
              <button
                type="button"
                data-rm={i}
                aria-label={'Remover ' + s.name}
                onClick={() => {
                  focusInput.current = true;
                  onChange(sel.filter((_, j) => j !== i));
                }}
              >
                <Icon paths={ICON.x} size={12} stroke={2.6} />
              </button>
            </span>
          ))}
        </div>
        <input
          type="text"
          id="lchar"
          ref={input}
          autoComplete="off"
          placeholder="Buscar ou digitar um nome"
          role="combobox"
          aria-expanded={open}
          aria-controls="pickList"
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
        <div className="suggest" id="pickList" role="listbox" hidden={!open} onMouseDown={e => e.preventDefault()}>
          {options.map((o, i) => (
            <button type="button" role="option" id={'opt' + i} data-i={i} key={i} className={i === active ? 'act' : ''} aria-selected={i === active} onClick={() => pick(i)}>
              {o.create ? (
                <>
                  <Icon paths={ICON.plus} size={14} stroke={2.4} />
                  Adicionar <b>“{o.name}”</b>
                </>
              ) : (
                o.name
              )}
              <small>{o.tag}</small>
            </button>
          ))}
        </div>
      </div>
      <span className="hint-text">Sugere personagens já cadastrados e os da Mesa de Combate. Enter adiciona um nome novo.</span>
    </div>
  );
}
