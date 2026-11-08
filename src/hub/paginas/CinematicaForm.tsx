import {useRef, useState, type ChangeEvent} from 'react';
import {useHub} from '../data';
import {Datalist} from '../ui/Datalist';
import {closeDialog, Dialog} from '../ui/Dialog';
import {VisibilityFlag, visDraft, visFields, type VisDraft} from '../ui/Visibility';

const PAIR = {display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12};

/**
 * Criar (x null) ou editar uma regra cinemática, só o Mestre: nome, tema (o filtro da aba Cinematic), seção do livro,
 * livro, página, descrição e visibilidade. Grava com o Ops.saveCinematic de js/tabs/tab-combate.js.
 */
export function CinematicForm({x, category = ''}: {x: Cinematic | null; category?: string}) {
  const {W} = useHub();
  const editing = !!x;
  const [f, setF] = useState(() => ({
    name: x ? x.name : '',
    // Uma regra nova começa no tema que a aba está filtrando, ou no primeiro.
    category: (x && x.category) || category || CINEMATIC_CATEGORIES[0],
    section: (x && x.section) || '',
    book: (x && x.book) || '',
    page: (x && x.page) || '',
    description: (x && x.description) || '',
  }));
  const [vis, setVis] = useState<VisDraft>(() => visDraft(x));
  const [nameErr, setNameErr] = useState('');
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);
  // As sugestões dos campos: os temas da aba e os já usados, as seções e os livros das regras.
  const used = (k: 'category' | 'section' | 'book') => {
    const out: Record<string, boolean> = {};
    (W.cinematics || []).forEach(c => {
      if (c[k]) out[c[k] as string] = true;
    });
    return Object.keys(out).sort((a, b) => a.localeCompare(b, 'pt'));
  };
  const categories = CINEMATIC_CATEGORIES.concat(used('category').filter(c => !CINEMATIC_CATEGORIES.includes(c)));

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
      setNameErr('Informe o nome da regra.');
      nameInput.current?.focus();
      return;
    }
    setSaving(true);
    setFormErr('');
    const fields = {
      name: n,
      category: f.category,
      section: f.section,
      book: f.book,
      page: f.page,
      description: f.description,
      ...visFields(x, true, vis),
    };
    Ops.saveCinematic(x, fields).then(
      id => {
        closeDialog();
        toast(editing ? 'Regra cinemática salva.' : 'Regra cinemática criada.');
        if (!editing) go(cinematicHref(id));
      },
      er => {
        setSaving(false);
        setFormErr(errorText(er));
      },
    );
  }

  return (
    <Dialog labelledBy="cfTitle" busy={saving}>
      <form id="cineForm" noValidate onSubmit={submit}>
        <h2 id="cfTitle">{editing ? 'Editar regra cinemática' : 'Nova regra cinemática'}</h2>
        <div className={'field' + (nameErr ? ' invalid' : '')} id="f_cname">
          <label htmlFor="cname">Nome da regra</label>
          <input
            type="text"
            id="cname"
            maxLength={120}
            autoComplete="off"
            placeholder="Ex.: Bullet Time"
            ref={nameInput}
            value={f.name}
            onChange={e => {
              const value = e.target.value;
              setF(cur => ({...cur, name: value}));
              if (value.trim()) setNameErr('');
            }}
          />
          <div className="err" id="err_cname">
            {nameErr}
          </div>
        </div>
        <div style={PAIR}>
          <div className="field">
            <label htmlFor="ccat">Tema</label>
            <input type="text" id="ccat" list="cineCatList" maxLength={60} placeholder="Ex.: Regras de combate" {...bind('category')} />
            <Datalist id="cineCatList" options={categories} />
          </div>
          <div className="field">
            <label htmlFor="csec">Seção do livro</label>
            <input type="text" id="csec" list="cineSecList" maxLength={120} placeholder="Ex.: More Cinematic Combat Rules" {...bind('section')} />
            <Datalist id="cineSecList" options={used('section')} />
          </div>
        </div>
        <div style={PAIR}>
          <div className="field">
            <label htmlFor="cbook">Livro</label>
            <input type="text" id="cbook" list="cineBookList" maxLength={100} placeholder="Ex.: GURPS Martial Arts" {...bind('book')} />
            <Datalist id="cineBookList" options={used('book')} />
          </div>
          <div className="field">
            <label htmlFor="cpage">Página</label>
            <input type="text" id="cpage" maxLength={30} placeholder="Ex.: MA133" {...bind('page')} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="cdesc">Descrição</label>
          <textarea id="cdesc" rows={10} maxLength={30000} placeholder="Como a regra funciona…" {...bind('description')} />
        </div>
        <VisibilityFlag id="cvis" item={x} share draft={vis} onChange={setVis} />
        <div className="form-err" id="cfErr" role="alert">
          {formErr}
        </div>
        <div className="btn-row" style={{justifyContent: 'flex-end'}}>
          <button className="btn ghost" type="button" id="cfCancel" disabled={saving} onClick={() => closeDialog()}>
            Cancelar
          </button>
          <button className="btn primary" type="submit" id="cfSave" disabled={saving}>
            {saving ? 'Salvando…' : editing ? 'Salvar regra' : 'Criar regra'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
