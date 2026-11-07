import {useRef, useState, type ChangeEvent} from 'react';
import {useHub} from '../data';
import {Check} from '../ui/Check';
import {Datalist} from '../ui/Datalist';
import {closeDialog, Dialog} from '../ui/Dialog';
import {VisibilityFlag, visDraft, visFields, type VisDraft} from '../ui/Visibility';

const PAIR = {display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12};

/**
 * Criar (d null) ou editar uma desvantagem, só o Mestre: nome, custo, tipo, classes, autocontrole, livro, página,
 * descrição e visibilidade. Grava com o Ops.saveDisadvantage de js/tabs/tab-desvantagens.js.
 */
export function DisadvForm({d}: {d: Disadvantage | null}) {
  useHub();
  const editing = !!d;
  const [f, setF] = useState(() => ({
    name: d ? d.name : '',
    cost: (d && d.cost) || '',
    type: d ? d.type || '' : 'Disadvantage',
    book: (d && d.book) || '',
    page: (d && d.page) || '',
    description: (d && d.description) || '',
  }));
  const [classes, setClasses] = useState(() => disadvClassList(d));
  const [self, setSelf] = useState(() => !!(d && d.selfControl));
  const [vis, setVis] = useState<VisDraft>(() => visDraft(d));
  const [nameErr, setNameErr] = useState('');
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);

  const bind = (k: keyof typeof f) => ({
    value: f[k],
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      setF(cur => ({...cur, [k]: value}));
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    const n = f.name.trim();
    if (!n) {
      setNameErr('Informe o nome da desvantagem.');
      nameInput.current?.focus();
      return;
    }
    setSaving(true);
    setFormErr('');
    const fields = {
      name: n,
      cost: f.cost,
      type: f.type,
      // Na ordem dos livros, como "Mental, Social".
      classes: DISADV_CLASSES.filter(c => classes.includes(c)).join(', '),
      selfControl: self,
      book: f.book,
      page: f.page,
      description: f.description,
      ...visFields(d, true, vis),
    };
    Ops.saveDisadvantage(d, fields).then(
      id => {
        closeDialog();
        toast(editing ? 'Desvantagem salva.' : 'Desvantagem criada.');
        if (!editing) go(disadvHref(id));
      },
      er => {
        setSaving(false);
        setFormErr(errorText(er));
      },
    );
  }

  return (
    <Dialog labelledBy="dfTitle" busy={saving}>
      <form id="disadvForm" noValidate onSubmit={submit}>
        <h2 id="dfTitle">{editing ? 'Editar desvantagem' : 'Nova desvantagem'}</h2>
        <div className={'field' + (nameErr ? ' invalid' : '')} id="f_dname">
          <label htmlFor="dname">Nome da desvantagem</label>
          <input
            type="text"
            id="dname"
            maxLength={100}
            autoComplete="off"
            placeholder="Ex.: Bad Temper"
            ref={nameInput}
            value={f.name}
            onChange={e => {
              const value = e.target.value;
              setF(cur => ({...cur, name: value}));
              if (value.trim()) setNameErr('');
            }}
          />
          <div className="err" id="err_dname">
            {nameErr}
          </div>
        </div>
        <div style={PAIR}>
          <div className="field">
            <label htmlFor="dcost">Custo</label>
            <input type="text" id="dcost" maxLength={120} placeholder="Ex.: -10 points, Variable" {...bind('cost')} />
          </div>
          <div className="field">
            <label htmlFor="dtype">Tipo</label>
            <input type="text" id="dtype" list="disadvTypeList" maxLength={80} placeholder="Ex.: Disadvantage" {...bind('type')} />
            <Datalist id="disadvTypeList" options={disadvValues('type')} />
          </div>
        </div>
        <div className="field" role="group" aria-labelledby="lab_dcls">
          <span className="lab" id="lab_dcls">
            Classes
          </span>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 8}}>
            {DISADV_CLASSES.map(c => (
              <Check
                key={c}
                id={'dcls_' + c}
                on={classes.includes(c)}
                label={DISADV_CLASS_LABELS[c]}
                onChange={on => setClasses(cur => (on ? cur.concat([c]) : cur.filter(x => x !== c)))}
              />
            ))}
          </div>
        </div>
        <Check id="dself" on={self} label="Pede teste de autocontrole" onChange={setSelf} />
        <div style={{...PAIR, marginTop: 12}}>
          <div className="field">
            <label htmlFor="dbook">Livro</label>
            <input type="text" id="dbook" list="disadvBookList" maxLength={100} placeholder="Ex.: GURPS Basic Set" {...bind('book')} />
            <Datalist id="disadvBookList" options={disadvValues('book')} />
          </div>
          <div className="field">
            <label htmlFor="dpage">Página</label>
            <input type="text" id="dpage" maxLength={30} placeholder="Ex.: B124, MA53" {...bind('page')} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="ddesc">Descrição</label>
          <textarea id="ddesc" rows={6} maxLength={20000} placeholder="O que a desvantagem faz, níveis, autocontrole…" {...bind('description')} />
        </div>
        <VisibilityFlag id="dvis" item={d} share draft={vis} onChange={setVis} />
        <div className="form-err" id="dfErr" role="alert">
          {formErr}
        </div>
        <div className="btn-row" style={{justifyContent: 'flex-end'}}>
          <button className="btn ghost" type="button" id="dfCancel" disabled={saving} onClick={() => closeDialog()}>
            Cancelar
          </button>
          <button className="btn primary" type="submit" id="dfSave" disabled={saving}>
            {saving ? 'Salvando…' : editing ? 'Salvar desvantagem' : 'Criar desvantagem'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
