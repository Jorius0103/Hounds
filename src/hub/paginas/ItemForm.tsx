import {useRef, useState} from 'react';
import {useHub} from '../data';
import {Datalist} from '../ui/Datalist';
import {closeDialog, Dialog} from '../ui/Dialog';
import {VisibilityFlag, visDraft, visFields, type VisDraft} from '../ui/Visibility';

// Os campos com sugestões (os valores já usados).
const LISTED: Record<string, boolean> = {book: true, category: true};

/**
 * Criar (x null) ou editar um item, só o Mestre: nome, custo, peso, TL, categoria, livro, página, descrição e
 * visibilidade. Grava com o Ops.saveItem de js/tabs/tab-itens.js.
 */
export function ItemForm({x}: {x: GearItem | null}) {
  useHub();
  const editing = !!x;
  const [name, setName] = useState(x ? x.name : '');
  const [description, setDescription] = useState((x && x.description) || '');
  const [f, setF] = useState(() => {
    const out = {} as Record<ItemField, string>;
    ITEM_FIELDS.forEach(k => {
      out[k[0]] = (x && x[k[0]]) || '';
    });
    return out;
  });
  const [vis, setVis] = useState<VisDraft>(() => visDraft(x));
  const [nameErr, setNameErr] = useState('');
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);

  const input = (k: [ItemField, string, string]) => (
    <div className="field" key={k[0]}>
      <label htmlFor={'it_' + k[0]}>{k[1]}</label>
      <input
        type="text"
        id={'it_' + k[0]}
        maxLength={120}
        list={LISTED[k[0]] ? 'itemList_' + k[0] : undefined}
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
      setNameErr('Informe o nome do item.');
      nameInput.current?.focus();
      return;
    }
    setSaving(true);
    setFormErr('');
    Ops.saveItem(x, {...f, name: n, description, ...visFields(x, true, vis)}).then(
      id => {
        closeDialog();
        toast(editing ? 'Item salvo.' : 'Item criado.');
        if (!editing) go(itemHref(id));
      },
      er => {
        setSaving(false);
        setFormErr(errorText(er));
      },
    );
  }

  return (
    <Dialog labelledBy="itTitle" busy={saving}>
      <form id="itemForm" noValidate onSubmit={submit}>
        <h2 id="itTitle">{editing ? 'Editar item' : 'Novo item'}</h2>
        <div className={'field' + (nameErr ? ' invalid' : '')} id="f_itname">
          <label htmlFor="itname">Nome do item</label>
          <input
            type="text"
            id="itname"
            maxLength={100}
            autoComplete="off"
            placeholder="Ex.: Backpack, Frame"
            ref={nameInput}
            value={name}
            onChange={e => {
              setName(e.target.value);
              if (e.target.value.trim()) setNameErr('');
            }}
          />
          <div className="err" id="err_itname">
            {nameErr}
          </div>
        </div>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12}}>{ITEM_FIELDS.slice(0, 3).map(input)}</div>
        {input(ITEM_FIELDS[3])}
        <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12}}>{ITEM_FIELDS.slice(4).map(input)}</div>
        <Datalist id="itemList_book" options={itemValues('book')} />
        <Datalist id="itemList_category" options={itemValues('category')} />
        <div className="field">
          <label htmlFor="itdesc">Descrição</label>
          <textarea id="itdesc" rows={6} maxLength={20000} placeholder="O que o item faz, capacidade, bônus…" value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <VisibilityFlag id="itvis" item={x} share draft={vis} onChange={setVis} />
        <div className="form-err" id="itErr" role="alert">
          {formErr}
        </div>
        <div className="btn-row" style={{justifyContent: 'flex-end'}}>
          <button className="btn ghost" type="button" id="itCancel" disabled={saving} onClick={() => closeDialog()}>
            Cancelar
          </button>
          <button className="btn primary" type="submit" id="itSave" disabled={saving}>
            {saving ? 'Salvando…' : editing ? 'Salvar item' : 'Criar item'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
