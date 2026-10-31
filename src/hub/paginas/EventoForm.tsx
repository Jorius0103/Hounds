import {useEffect, useRef, useState} from 'react';
import {useHub} from '../data';
import {closeDialog, Dialog} from '../ui/Dialog';
import {IdPicker} from '../ui/IdPicker';
import {ImageField, noImagePick, type ImagePick} from '../ui/ImageField';
import {VisibilityFlag, visDraft, visFields, type VisDraft} from '../ui/Visibility';

// Os locais em árvore para um <select>, como o locParentOptions de js/mundo.js: os de dentro recuados com "└".
function locationOptions(noneLabel: string) {
  const out = [{value: '', label: noneLabel}];
  (function walk(parent: string | null, depth: number) {
    childLocs(parent).forEach(l => {
      out.push({value: l.id, label: (depth ? '   '.repeat(depth - 1) + '└ ' : '') + l.name});
      walk(l.id, depth + 1);
    });
  })(null, 0);
  return out;
}

/**
 * Criar (ev null) ou editar um evento: nome, data, local, imagem, descrição, personagens e visibilidade. Grava com
 * o Ops.saveEvent de js/tabs/tab-eventos.js. focusChars: aberto por "Adicionar personagens", com o foco na busca.
 */
export function EventForm({ev, focusChars = false}: {ev: HEvent | null; focusChars?: boolean}) {
  const {W} = useHub();
  const editing = !!ev, canImg = !!W.store && W.store.canUpload;
  const [name, setName] = useState(ev ? ev.name : '');
  const [date, setDate] = useState(ev ? ev.date || '' : '');
  const [loc, setLoc] = useState(ev && eventLoc(ev) ? ev.locationId || '' : '');
  const [desc, setDesc] = useState(ev ? ev.description || '' : '');
  const [chars, setChars] = useState<string[]>(ev ? eventChars(ev).map(c => c.id) : []);
  const [vis, setVis] = useState<VisDraft>(() => visDraft(ev));
  const [img, setImg] = useState<ImagePick>(noImagePick);
  const [nameErr, setNameErr] = useState('');
  const [formErr, setFormErr] = useState('');
  // Nome repetido: avisa uma vez, e o segundo clique em salvar continua mesmo assim.
  const [warned, setWarned] = useState(false);
  const [saving, setSaving] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const drop = useRef<HTMLLabelElement>(null);

  useEffect(() => {
    if (!focusChars || !W.characters.length) return;
    const t = setTimeout(() => document.getElementById('echar')?.focus(), 30);
    return () => clearTimeout(t);
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    const n = name.trim();
    if (!n) {
      setNameErr('Informe o nome do evento.');
      nameInput.current?.focus();
      return;
    }
    if (W.events.some(x => (!ev || x.id !== ev.id) && norm(x.name) === norm(n)) && !warned) {
      setFormErr('Já existe um evento com esse nome. Clique em ' + (editing ? 'Salvar' : 'Criar') + ' evento de novo para continuar mesmo assim.');
      setWarned(true);
      return;
    }
    if (canImg && img.error && !img.file) {
      drop.current?.focus();
      return;
    }
    setSaving(true);
    setFormErr('');
    const locationId = loc && locById(loc) ? loc : null;
    const fields = {name: n, date, description: desc, locationId, characterIds: chars.filter(id => charById(id)), ...visFields(ev, true, vis)};
    Ops.saveEvent(ev, fields, canImg ? img.file : null, canImg ? img.dims : null, canImg && img.removed).then(
      id => {
        closeDialog();
        toast(editing ? 'Evento salvo.' : 'Evento criado.');
        if (!editing) go(eventHref(id));
      },
      er => {
        setSaving(false);
        setFormErr(errorText(er));
      },
    );
  }

  const saveLabel = saving ? (canImg && img.file ? 'Enviando imagem…' : 'Salvando…') : editing ? 'Salvar evento' : 'Criar evento';
  const existing = ev && ev.image ? {ref: ev.image.ref, name: 'Imagem atual', dims: ev.image.w ? ev.image.w + ' × ' + ev.image.h + ' px' : ''} : null;
  return (
    <Dialog labelledBy="efTitle" busy={saving}>
      <form id="eventForm" noValidate onSubmit={submit}>
        <h2 id="efTitle">{editing ? 'Editar evento' : 'Novo evento'}</h2>
        <div className={'field' + (nameErr ? ' invalid' : '')} id="f_ename">
          <label htmlFor="ename">Nome do evento</label>
          <input
            type="text"
            id="ename"
            maxLength={120}
            autoComplete="off"
            placeholder="Ex.: Batalha da Ponte Velha"
            ref={nameInput}
            value={name}
            onChange={e => {
              setName(e.target.value);
              if (e.target.value.trim()) setNameErr('');
            }}
          />
          <div className="err" id="err_ename">
            {nameErr}
          </div>
        </div>
        <div className="field">
          <label htmlFor="edate">Data</label>
          <input type="text" id="edate" maxLength={80} autoComplete="off" placeholder="Ex.: 3º dia do outono, ano 1023" value={date} onChange={e => setDate(e.target.value)} />
          <span className="hint-text">Opcional. Texto livre, no calendário da campanha.</span>
        </div>
        <div className="field">
          <label htmlFor="eloc">Local</label>
          <select id="eloc" value={loc} onChange={e => setLoc(e.target.value)}>
            {locationOptions('Nenhum local').map(o => (
              <option value={o.value} key={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <span className="hint-text">Opcional. Onde o evento aconteceu.</span>
        </div>
        {canImg ? <ImageField id="eimg" label="Imagem" help="Ilustração ou cena do evento. Opcional, até 20 MB." removable existing={existing} value={img} onChange={setImg} dropRef={drop} /> : null}
        <div className="field">
          <label htmlFor="edesc">Descrição</label>
          <textarea id="edesc" rows={6} maxLength={20000} placeholder="O que aconteceu, quem estava lá, as consequências…" value={desc} onChange={e => setDesc(e.target.value)} />
        </div>
        <IdPicker
          id="echar"
          label="Personagens"
          placeholder="Buscar personagem"
          empty={W.characters.length ? '' : 'Nenhum personagem cadastrado ainda'}
          hint="Opcional. Os personagens que participaram do evento. Cada um entra uma vez só."
          sel={chars}
          onChange={setChars}
          chip={id => {
            const c = charById(id);
            return c && {name: c.name, icon: ICON.user, img: c.image && c.image.ref};
          }}
          find={q =>
            W.characters
              .slice()
              .sort(byName)
              .filter(c => !q || norm(c.name + ' ' + charSubtitle(c)).indexOf(q) >= 0)
              .map(c => ({id: c.id, label: c.name, sub: charSubtitle(c)}))
          }
        />
        <VisibilityFlag id="evis" item={ev} share draft={vis} onChange={setVis} />
        <div className="form-err" id="efErr" role="alert">
          {formErr}
        </div>
        <div className="btn-row" style={{justifyContent: 'flex-end'}}>
          <button className="btn ghost" type="button" id="efCancel" disabled={saving} onClick={() => closeDialog()}>
            Cancelar
          </button>
          <button className="btn primary" type="submit" id="efSave" disabled={saving}>
            {saveLabel}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
