import {useRef, useState, type ChangeEvent} from 'react';
import {useHub} from '../data';
import {Check} from '../ui/Check';
import {Datalist} from '../ui/Datalist';
import {closeDialog, Dialog} from '../ui/Dialog';
import {VisibilityFlag, visDraft, visFields, type VisDraft} from '../ui/Visibility';

const PAIR = {display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12};

/**
 * Criar (t null) ou editar uma técnica, só o Mestre: nome, dificuldade, cinemática, padrão, pré-requisitos, livro,
 * página, descrição, modificadores e visibilidade. Grava com o Ops.saveTechnique de js/tabs/tab-combate.js.
 */
export function TechForm({t}: {t: Technique | null}) {
  const {W} = useHub();
  const editing = !!t;
  const [f, setF] = useState(() => ({
    name: t ? t.name : '',
    // Uma dificuldade fora da lista fica na primeira, como no <select> antigo.
    difficulty: t && t.difficulty && TECH_DIFFS.includes(t.difficulty) ? t.difficulty : 'A',
    defaults: (t && t.defaults) || '',
    prerequisites: (t && t.prerequisites) || '',
    book: (t && t.book) || '',
    page: (t && t.page) || '',
    description: (t && t.description) || '',
    modifiers: (t && t.modifiers) || '',
  }));
  const [cinematic, setCinematic] = useState(() => !!(t && t.cinematic));
  const [vis, setVis] = useState<VisDraft>(() => visDraft(t));
  const [nameErr, setNameErr] = useState('');
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const books: Record<string, boolean> = {};
  (W.techniques || []).forEach(x => {
    if (x.book) books[x.book] = true;
  });

  const bind = (k: keyof typeof f) => ({
    value: f[k],
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = e.target.value;
      setF(cur => ({...cur, [k]: value}));
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    const n = f.name.trim();
    if (!n) {
      setNameErr('Informe o nome da técnica.');
      nameInput.current?.focus();
      return;
    }
    setSaving(true);
    setFormErr('');
    const fields = {
      name: n,
      difficulty: f.difficulty,
      cinematic,
      defaults: f.defaults,
      prerequisites: f.prerequisites,
      book: f.book,
      page: f.page,
      description: f.description,
      modifiers: f.modifiers,
      ...visFields(t, true, vis),
    };
    Ops.saveTechnique(t, fields).then(
      id => {
        closeDialog();
        toast(editing ? 'Técnica salva.' : 'Técnica criada.');
        if (!editing) go(techHref(id));
      },
      er => {
        setSaving(false);
        setFormErr(errorText(er));
      },
    );
  }

  return (
    <Dialog labelledBy="tfTitle" busy={saving}>
      <form id="techForm" noValidate onSubmit={submit}>
        <h2 id="tfTitle">{editing ? 'Editar técnica' : 'Nova técnica'}</h2>
        <div className={'field' + (nameErr ? ' invalid' : '')} id="f_tname">
          <label htmlFor="tname">Nome da técnica</label>
          <input
            type="text"
            id="tname"
            maxLength={100}
            autoComplete="off"
            placeholder="Ex.: Arm Lock"
            ref={nameInput}
            value={f.name}
            onChange={e => {
              const value = e.target.value;
              setF(cur => ({...cur, name: value}));
              if (value.trim()) setNameErr('');
            }}
          />
          <div className="err" id="err_tname">
            {nameErr}
          </div>
        </div>
        <div style={PAIR}>
          <div className="field">
            <label htmlFor="tdiff">Dificuldade</label>
            <select id="tdiff" {...bind('difficulty')}>
              {TECH_DIFFS.map(d => (
                <option value={d} key={d}>
                  {TECH_DIFF_LABELS[d]}
                </option>
              ))}
            </select>
          </div>
          <Check id="tcine" on={cinematic} label="Cinemática" onChange={setCinematic} style={{alignSelf: 'end'}} />
        </div>
        <div className="field">
          <label htmlFor="tdef">Padrão (default)</label>
          <input type="text" id="tdef" maxLength={300} placeholder="Ex.: Judo-4 ou prerequisite skill-2" {...bind('defaults')} />
        </div>
        <div className="field">
          <label htmlFor="tpre">Pré-requisitos</label>
          <input type="text" id="tpre" maxLength={300} placeholder="Ex.: Judo; cannot exceed Judo skill" {...bind('prerequisites')} />
        </div>
        <div style={PAIR}>
          <div className="field">
            <label htmlFor="tbook">Livro</label>
            <input type="text" id="tbook" list="techBookList" maxLength={100} placeholder="Ex.: GURPS Martial Arts" {...bind('book')} />
            <Datalist id="techBookList" options={Object.keys(books).sort()} />
          </div>
          <div className="field">
            <label htmlFor="tpage">Página</label>
            <input type="text" id="tpage" maxLength={30} placeholder="Ex.: MA65" {...bind('page')} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="tdesc">Descrição</label>
          <textarea id="tdesc" rows={6} maxLength={20000} placeholder="Como a técnica funciona…" {...bind('description')} />
        </div>
        <div className="field">
          <label htmlFor="tmod">Modificadores</label>
          <textarea id="tmod" rows={3} maxLength={5000} placeholder="Bônus e penalidades" {...bind('modifiers')} />
        </div>
        <VisibilityFlag id="tvis" item={t} share draft={vis} onChange={setVis} />
        <div className="form-err" id="tfErr" role="alert">
          {formErr}
        </div>
        <div className="btn-row" style={{justifyContent: 'flex-end'}}>
          <button className="btn ghost" type="button" id="tfCancel" disabled={saving} onClick={() => closeDialog()}>
            Cancelar
          </button>
          <button className="btn primary" type="submit" id="tfSave" disabled={saving}>
            {saving ? 'Salvando…' : editing ? 'Salvar técnica' : 'Criar técnica'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
