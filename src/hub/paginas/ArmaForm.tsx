import {useEffect, useRef, useState, type ChangeEvent} from 'react';
import {useHub} from '../data';
import {Datalist} from '../ui/Datalist';
import {closeDialog, Dialog} from '../ui/Dialog';
import {Icon} from '../ui/Icon';
import {VisibilityFlag, visDraft, visFields, type VisDraft} from '../ui/Visibility';

// Uma linha do editor de ataques: os campos como estão (também os que o tipo não mostra, como o custo próprio de um
// ataque); id: a chave da linha.
type AttackRow = WeaponAttack & {id: number};
type WeaponType = 'Melee' | 'Ranged';
let rowIds = 0;
const toRow = (a: WeaponAttack): AttackRow => ({...a, id: ++rowIds});

/**
 * Criar (w null) ou editar uma arma, só o Mestre: nome, tipo, TL, custo, peso, os ataques (uma linha por linha da tabela
 * do livro, com os campos do tipo: alcance e aparar, ou precisão, distância, cadência…), CL, tabela, livro, página,
 * descrição, notas da tabela e visibilidade. Grava com o Ops.saveWeapon de js/tabs/tab-armas.js.
 */
export function WeaponForm({w}: {w: Weapon | null}) {
  useHub();
  const editing = !!w;
  const [f, setF] = useState(() => ({
    name: w ? w.name : '',
    tl: (w && w.tl) || '',
    cost: (w && w.cost) || '',
    weight: (w && w.weight) || '',
    lc: (w && w.lc) || '',
    table: (w && w.table) || '',
    book: (w && w.book) || '',
    page: (w && w.page) || '',
    description: (w && w.description) || '',
    footnotes: (w && w.footnotes) || '',
  }));
  const [type, setType] = useState<WeaponType>(() => (w && w.type === 'Ranged' ? 'Ranged' : 'Melee'));
  const [rows, setRows] = useState<AttackRow[]>(() => (w && (w.attacks || []).length ? w.attacks!.map(toRow) : [toRow({skill: '', damage: ''})]));
  const [vis, setVis] = useState<VisDraft>(() => visDraft(w));
  const [nameErr, setNameErr] = useState('');
  const [attacksErr, setAttacksErr] = useState('');
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);
  // O ataque novo: o foco vai para o dano dele depois de desenhar.
  const focusNew = useRef(false);

  useEffect(() => {
    if (!focusNew.current) return;
    focusNew.current = false;
    const inputs = box.current ? box.current.querySelectorAll<HTMLElement>('[data-f="damage"]') : [];
    if (inputs.length) inputs[inputs.length - 1].focus();
  });

  const bind = (k: keyof typeof f) => ({
    value: f[k],
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      setF(cur => ({...cur, [k]: value}));
    },
  });

  function addAttack() {
    const last = rows[rows.length - 1] || {};
    // O ataque novo costuma ser da mesma perícia que o de cima.
    focusNew.current = true;
    setRows(cur => cur.concat([toRow({skill: last.skill || '', defaults: last.defaults || '', mode: 'or', damage: ''})]));
  }
  function removeAttack(id: number) {
    setRows(cur => {
      const next = cur.filter(r => r.id !== id);
      return next.length ? next : [toRow({skill: '', damage: ''})];
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    const n = f.name.trim();
    if (!n) {
      setNameErr('Informe o nome da arma.');
      nameInput.current?.focus();
      return;
    }
    // Os campos do tipo escolhido (e o custo e o peso próprios de um ataque); um ataque vazio fica de fora.
    const keep: (keyof WeaponAttack)[] = ['skill', 'defaults', 'mode', 'notes', 'cost', 'weight', ...WEAPON_FORM_COLS[type], ...(type === 'Ranged' ? (['fuse'] as const) : [])];
    const attacks = rows
      .map(a => {
        const out: WeaponAttack = {};
        keep.forEach(k => {
          const v = String(a[k] || '').trim();
          if (v) out[k] = v;
        });
        return out;
      })
      .filter(a => WEAPON_FORM_COLS[type].some(k => a[k]));
    if (!attacks.length) {
      setAttacksErr('Informe pelo menos um ataque (o dano, por exemplo).');
      return;
    }
    setAttacksErr('');
    setSaving(true);
    setFormErr('');
    Ops.saveWeapon(w, {...f, name: n, type, attacks, ...visFields(w, true, vis)}).then(
      id => {
        closeDialog();
        toast(editing ? 'Arma salva.' : 'Arma criada.');
        if (!editing) go(weaponHref(id));
      },
      er => {
        setSaving(false);
        setFormErr(errorText(er));
      },
    );
  }

  return (
    <Dialog labelledBy="wfTitle" busy={saving} wide>
      <form id="weaponForm" noValidate onSubmit={submit}>
        <h2 id="wfTitle">{editing ? 'Editar arma' : 'Nova arma'}</h2>
        <div className={'field' + (nameErr ? ' invalid' : '')} id="f_wname">
          <label htmlFor="wname">Nome da arma</label>
          <input
            type="text"
            id="wname"
            maxLength={100}
            autoComplete="off"
            placeholder="Ex.: Broadsword"
            ref={nameInput}
            value={f.name}
            onChange={e => {
              const value = e.target.value;
              setF(cur => ({...cur, name: value}));
              if (value.trim()) setNameErr('');
            }}
          />
          <div className="err" id="err_wname">
            {nameErr}
          </div>
        </div>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12}}>
          <div className="field">
            <label htmlFor="wtype">Tipo</label>
            <select id="wtype" value={type} onChange={e => setType(e.target.value === 'Ranged' ? 'Ranged' : 'Melee')}>
              {Object.keys(WEAPON_TYPE_LABELS).map(t => (
                <option value={t} key={t}>
                  {WEAPON_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="wtl">TL</label>
            <input type="text" id="wtl" maxLength={10} placeholder="Ex.: 2" {...bind('tl')} />
          </div>
          <div className="field">
            <label htmlFor="wcost">Custo</label>
            <input type="text" id="wcost" maxLength={40} placeholder="Ex.: $500" {...bind('cost')} />
          </div>
          <div className="field">
            <label htmlFor="wweight">Peso</label>
            <input type="text" id="wweight" maxLength={40} placeholder="Ex.: 3" {...bind('weight')} />
          </div>
        </div>
        <div className="field">
          <span className="lab">Ataques</span>
          <div className="sc-rows" id="wAttacks" ref={box}>
            {rows.map((a, i) => (
              <AttackFields key={a.id} a={a} i={i} type={type} onField={(k, v) => setRows(cur => cur.map(r => (r.id === a.id ? {...r, [k]: v} : r)))} onRemove={() => removeAttack(a.id)} />
            ))}
          </div>
          <div>
            <button className="btn ghost" type="button" id="wAddAttack" onClick={addAttack}>
              <Icon paths={ICON.plus} size={15} stroke={2.4} />
              Adicionar ataque
            </button>
          </div>
          <div className="err" id="err_wattacks">
            {attacksErr}
          </div>
          <Datalist id="weaponSkillList" options={weaponSkillValues()} />
        </div>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12}}>
          <div className="field">
            <label htmlFor="wlc">CL</label>
            <input type="text" id="wlc" maxLength={10} placeholder="Ex.: 4" {...bind('lc')} />
          </div>
          <div className="field" style={{gridColumn: 'span 3'}}>
            <label htmlFor="wtable">Tabela</label>
            <input type="text" id="wtable" maxLength={120} placeholder="Ex.: Melee Weapon Table" {...bind('table')} />
          </div>
        </div>
        <div style={{display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 12}}>
          <div className="field">
            <label htmlFor="wbook">Livro</label>
            <input type="text" id="wbook" list="weaponBookList" maxLength={100} placeholder="Ex.: GURPS Basic Set" {...bind('book')} />
            <Datalist id="weaponBookList" options={weaponValues('book')} />
          </div>
          <div className="field">
            <label htmlFor="wpage">Página</label>
            <input type="text" id="wpage" maxLength={30} placeholder="Ex.: B271" {...bind('page')} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="wdesc">Descrição</label>
          <textarea id="wdesc" rows={5} maxLength={20000} placeholder="O que é a arma, de onde vem, regras especiais…" {...bind('description')} />
        </div>
        <div className="field">
          <label htmlFor="wnotes">Notas da tabela</label>
          <textarea id="wnotes" rows={3} maxLength={10000} placeholder="[1] Can be thrown…" {...bind('footnotes')} />
        </div>
        <VisibilityFlag id="wvis" item={w} share draft={vis} onChange={setVis} />
        <div className="form-err" id="wfErr" role="alert">
          {formErr}
        </div>
        <div className="btn-row" style={{justifyContent: 'flex-end'}}>
          <button className="btn ghost" type="button" id="wfCancel" disabled={saving} onClick={() => closeDialog()}>
            Cancelar
          </button>
          <button className="btn primary" type="submit" id="wfSave" disabled={saving}>
            {saving ? 'Salvando…' : editing ? 'Salvar arma' : 'Criar arma'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

// Os campos de um ataque: a perícia, o modo, os do tipo, as notas e os padrões.
function AttackFields({a, i, type, onField, onRemove}: {a: AttackRow; i: number; type: WeaponType; onField: (k: keyof WeaponAttack, v: string) => void; onRemove: () => void}) {
  const input = (k: keyof WeaponAttack, label: string, ph: string, cls: string) => (
    <label className={'sc-f ' + cls} key={k}>
      <span>{label}</span>
      <input type="text" data-f={k} data-i={i} maxLength={80} value={a[k] || ''} placeholder={ph} list={k === 'skill' ? 'weaponSkillList' : undefined} onChange={e => onField(k, e.target.value)} />
    </label>
  );
  return (
    <div className="sc-row">
      {input('skill', 'Perícia', 'Broadsword', 'sc-name')}
      {input('mode', 'Modo', i ? 'or' : '', 'wf-short')}
      {WEAPON_FORM_COLS[type].map(k => {
        const c = WEAPON_ATTACK_COLS.filter(x => x[0] === k)[0];
        return input(k, c[2], c[3], k === 'damage' ? 'wf-dmg' : 'wf-short');
      })}
      {input('notes', 'Notas', '[1]', 'wf-notes')}
      {input('defaults', 'Padrões', 'DX-5, Shortsword-2', 'sc-name')}
      <button className="icon-btn" type="button" data-del={i} aria-label="Remover ataque" title="Remover" onClick={onRemove}>
        <Icon paths={ICON.x} size={15} stroke={2.4} />
      </button>
    </div>
  );
}
