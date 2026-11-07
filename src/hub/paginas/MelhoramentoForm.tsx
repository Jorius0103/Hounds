import {useRef, useState} from 'react';
import {useHub} from '../data';
import {Datalist} from '../ui/Datalist';
import {closeDialog, Dialog} from '../ui/Dialog';
import {VisibilityFlag, visDraft, visFields, type VisDraft} from '../ui/Visibility';

// Os campos com sugestões (os valores já usados).
const LISTED: Record<string, boolean> = {appliesTo: true, book: true, category: true};

/**
 * Criar (x null) ou editar um melhoramento, só o Mestre: nome, custo, peso, TL, tipo de equipamento, restrição,
 * categoria, livro, página, descrição e visibilidade. Grava com o Ops.saveImprovement de js/tabs/tab-melhoramentos.js.
 */
export function ImprovementForm({x}: {x: Improvement | null}) {
  useHub();
  const editing = !!x;
  const [name, setName] = useState(x ? x.name : '');
  const [description, setDescription] = useState((x && x.description) || '');
  const [f, setF] = useState(() => {
    const out = {} as Record<ImprovementField, string>;
    IMPROVEMENT_FIELDS.forEach(k => {
      out[k[0]] = (x && x[k[0]]) || '';
    });
    return out;
  });
  const [vis, setVis] = useState<VisDraft>(() => visDraft(x));
  const [nameErr, setNameErr] = useState('');
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);

  const input = (k: [ImprovementField, string, string]) => (
    <div className="field" key={k[0]}>
      <label htmlFor={'im_' + k[0]}>{k[1]}</label>
      <input
        type="text"
        id={'im_' + k[0]}
        maxLength={k[0] === 'restriction' ? 300 : 120}
        list={LISTED[k[0]] ? 'improvementList_' + k[0] : undefined}
        placeholder={k[2]}
        value={f[k[0]]}
        onChange={e => {
          const value = e.target.value;
          setF(cur => ({...cur, [k[0]]: value}));
        }}
      />
    </div>
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    const n = name.trim();
    if (!n) {
      setNameErr('Informe o nome do melhoramento.');
      nameInput.current?.focus();
      return;
    }
    setSaving(true);
    setFormErr('');
    Ops.saveImprovement(x, {...f, name: n, description, ...visFields(x, true, vis)}).then(
      id => {
        closeDialog();
        toast(editing ? 'Melhoramento salvo.' : 'Melhoramento criado.');
        if (!editing) go(improvementHref(id));
      },
      er => {
        setSaving(false);
        setFormErr(errorText(er));
      },
    );
  }

  return (
    <Dialog labelledBy="imTitle" busy={saving}>
      <form id="improvementForm" noValidate onSubmit={submit}>
        <h2 id="imTitle">{editing ? 'Editar melhoramento' : 'Novo melhoramento'}</h2>
        <div className={'field' + (nameErr ? ' invalid' : '')} id="f_imname">
          <label htmlFor="imname">Nome do melhoramento</label>
          <input
            type="text"
            id="imname"
            maxLength={100}
            autoComplete="off"
            placeholder="Ex.: Balanced"
            ref={nameInput}
            value={name}
            onChange={e => {
              setName(e.target.value);
              if (e.target.value.trim()) setNameErr('');
            }}
          />
          <div className="err" id="err_imname">
            {nameErr}
          </div>
        </div>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12}}>{IMPROVEMENT_FIELDS.slice(0, 3).map(input)}</div>
        <div style={{display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12}}>{IMPROVEMENT_FIELDS.slice(3, 5).map(input)}</div>
        {input(IMPROVEMENT_FIELDS[5])}
        <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12}}>{IMPROVEMENT_FIELDS.slice(6).map(input)}</div>
        <Datalist id="improvementList_appliesTo" options={improvementValues('appliesTo')} />
        <Datalist id="improvementList_book" options={improvementValues('book')} />
        <Datalist id="improvementList_category" options={improvementValues('category')} />
        <div className="field">
          <label htmlFor="imdesc">Descrição</label>
          <textarea
            id="imdesc"
            rows={6}
            maxLength={20000}
            placeholder="O que o melhoramento faz, a que serve, os custos de cada caso…"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>
        <VisibilityFlag id="imvis" item={x} share draft={vis} onChange={setVis} />
        <div className="form-err" id="imErr" role="alert">
          {formErr}
        </div>
        <div className="btn-row" style={{justifyContent: 'flex-end'}}>
          <button className="btn ghost" type="button" id="imCancel" disabled={saving} onClick={() => closeDialog()}>
            Cancelar
          </button>
          <button className="btn primary" type="submit" id="imSave" disabled={saving}>
            {saving ? 'Salvando…' : editing ? 'Salvar melhoramento' : 'Criar melhoramento'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
