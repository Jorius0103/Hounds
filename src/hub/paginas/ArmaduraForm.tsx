import {useRef, useState} from 'react';
import {useHub} from '../data';
import {Datalist} from '../ui/Datalist';
import {closeDialog, Dialog} from '../ui/Dialog';
import {VisibilityFlag, visDraft, visFields, type VisDraft} from '../ui/Visibility';

// Os campos com sugestões (os valores já usados).
const LISTED: Record<string, boolean> = {book: true, category: true, table: true};

/**
 * Criar (a null) ou editar uma armadura ou escudo, só o Mestre: nome, tipo, os campos das tabelas (TL, local, RD, BD,
 * PV, custo, peso…), as notas e a visibilidade. Grava com o Ops.saveArmor de js/tabs/tab-armaduras.js.
 */
export function ArmorForm({a}: {a: Armor | null}) {
  useHub();
  const editing = !!a, startShield = !!a && a.type === 'Shield';
  const [name, setName] = useState(a ? a.name : '');
  const [type, setType] = useState(startShield ? 'Shield' : 'Armor');
  const [f, setF] = useState(() => {
    const out = {notes: (a && a.notes) || '', footnotes: (a && a.footnotes) || ''} as Record<ArmorField | 'notes' | 'footnotes', string>;
    ARMOR_FIELDS.forEach(x => {
      out[x[0]] = (a && a[x[0]]) || '';
    });
    return out;
  });
  const [vis, setVis] = useState<VisDraft>(() => visDraft(a));
  const [nameErr, setNameErr] = useState('');
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);

  const set = (k: keyof typeof f, value: string) => setF(cur => ({...cur, [k]: value}));
  const input = (x: [ArmorField, string, string]) => (
    <div className="field" key={x[0]}>
      <label htmlFor={'ar_' + x[0]}>{x[1]}</label>
      <input type="text" id={'ar_' + x[0]} maxLength={120} list={LISTED[x[0]] ? 'armorList_' + x[0] : undefined} placeholder={x[2]} value={f[x[0]]} onChange={e => set(x[0], e.target.value)} />
    </div>
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    const n = name.trim();
    if (!n) {
      setNameErr('Informe o nome.');
      nameInput.current?.focus();
      return;
    }
    setSaving(true);
    setFormErr('');
    const shield = type === 'Shield';
    Ops.saveArmor(a, {...f, name: n, type, ...visFields(a, true, vis)}).then(
      id => {
        closeDialog();
        toast(shield ? (editing ? 'Escudo salvo.' : 'Escudo criado.') : editing ? 'Armadura salva.' : 'Armadura criada.');
        if (!editing) go(armorHref(id));
      },
      er => {
        setSaving(false);
        setFormErr(errorText(er));
      },
    );
  }

  return (
    <Dialog labelledBy="arTitle" busy={saving} wide>
      <form id="armorForm" noValidate onSubmit={submit}>
        <h2 id="arTitle">{editing ? 'Editar ' + (startShield ? 'escudo' : 'armadura') : 'Nova armadura'}</h2>
        <div className={'field' + (nameErr ? ' invalid' : '')} id="f_arname">
          <label htmlFor="arname">Nome</label>
          <input
            type="text"
            id="arname"
            maxLength={100}
            autoComplete="off"
            placeholder="Ex.: Mail Hauberk"
            ref={nameInput}
            value={name}
            onChange={e => {
              setName(e.target.value);
              if (e.target.value.trim()) setNameErr('');
            }}
          />
          <div className="err" id="err_arname">
            {nameErr}
          </div>
        </div>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12}}>
          <div className="field">
            <label htmlFor="artype">Tipo</label>
            <select id="artype" value={type} onChange={e => setType(e.target.value)}>
              {Object.keys(ARMOR_TYPE_LABELS).map(t => (
                <option value={t} key={t}>
                  {ARMOR_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          {ARMOR_FIELDS.slice(0, 11).map(input)}
        </div>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12}}>{ARMOR_FIELDS.slice(11).map(input)}</div>
        <Datalist id="armorList_book" options={armorValues('book')} />
        <Datalist id="armorList_category" options={armorValues('category')} />
        <Datalist id="armorList_table" options={armorValues('table')} />
        <div className="field">
          <label htmlFor="ar_notes">Notas</label>
          <input type="text" id="ar_notes" maxLength={300} placeholder="Ex.: [1, 3]" value={f.notes} onChange={e => set('notes', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="ar_footnotes">Notas da tabela</label>
          <textarea
            id="ar_footnotes"
            rows={4}
            maxLength={10000}
            placeholder="[1] Split DR: use the first, higher DR against piercing and cutting attacks…"
            value={f.footnotes}
            onChange={e => set('footnotes', e.target.value)}
          />
        </div>
        <VisibilityFlag id="arvis" item={a} share draft={vis} onChange={setVis} />
        <div className="form-err" id="arErr" role="alert">
          {formErr}
        </div>
        <div className="btn-row" style={{justifyContent: 'flex-end'}}>
          <button className="btn ghost" type="button" id="arCancel" disabled={saving} onClick={() => closeDialog()}>
            Cancelar
          </button>
          <button className="btn primary" type="submit" id="arSave" disabled={saving}>
            {saving ? 'Salvando…' : editing ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
