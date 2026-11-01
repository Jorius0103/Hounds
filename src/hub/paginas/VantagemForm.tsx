import {useEffect, useRef, useState, type ChangeEvent} from 'react';
import {useHub} from '../data';
import {Datalist} from '../ui/Datalist';
import {closeDialog, Dialog} from '../ui/Dialog';
import {Icon} from '../ui/Icon';
import {VisibilityFlag, visDraft, visFields, type VisDraft} from '../ui/Visibility';

// Um efeito como o editor o tem, com os campos como estão na tela (os números e os nomes em texto); id: a chave da linha.
type FxRow = {id: number; target: string; key: string; names: string; op: string; value: string; max: string; perLevel: boolean; stacks: boolean; cond: string; note: string};
type FxText = 'names' | 'value' | 'max' | 'cond' | 'note';
const PAIR = {display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12};
const NAMES_PLACEHOLDER: Record<string, string> = {skill: 'Perícias. Ex.: Judo, Karate, Sumo Wrestling', spell: 'Magias. Ex.: Fireball, Ignite Fire', college: 'Escolas. Ex.: Fire, Water'};
const NAMES_MISSING: Record<string, string> = {skill: 'as perícias', spell: 'as magias', college: 'as escolas'};
const FX_HELP =
  'O que a vantagem soma ou tira na ficha de quem a tiver, em Vantagens ou nos traços de Combate. Os valores-base da ficha não mudam: o bônus aparece separado e sai junto com a vantagem. ' +
  'Por nível: o valor vale para cada nível da vantagem na ficha. Máx.: o máximo que o efeito dá. Sem “acumula”, entre os efeitos que não acumulam no mesmo campo só o maior vale. ' +
  'Com condição, o efeito aparece ao lado do campo mas não é somado. Nomes separados por vírgula; com * no fim, todos os que começam assim (Guns* pega Guns (Pistol)).';
let rowIds = 0;

const toRow = (e: AdvEffect): FxRow => ({
  id: ++rowIds,
  target: e.target,
  key: e.key,
  names: e.names.join(', '),
  op: e.op,
  value: String(e.value),
  max: e.max == null ? '' : String(e.max),
  perLevel: e.perLevel,
  stacks: e.stacks,
  cond: e.cond,
  note: e.note,
});
// Um efeito novo, removido ou com outro alvo redesenha o editor com todas as linhas limpas (cleanAdvEffect), como na
// versão antiga.
const cleanRows = (rows: FxRow[]) => rows.map(r => ({...toRow(cleanAdvEffect(r)), id: r.id}));

/**
 * Criar (a null) ou editar uma vantagem ou um perk, só o Mestre: nome, custo, tipo, livro, página, descrição, os efeitos
 * na ficha e a visibilidade. Grava com o Ops.saveAdvantage de js/tabs/tab-vantagens.js. perk: aberto pela lista de
 * Perks, com o tipo Perk.
 */
export function AdvForm({a, perk = false}: {a: Advantage | null; perk?: boolean}) {
  useHub();
  const editing = !!a;
  const [f, setF] = useState(() => ({
    name: a ? a.name : '',
    cost: (a && a.cost) || '',
    type: a ? a.type || '' : perk ? 'Perk' : 'Vantagem',
    book: (a && a.book) || '',
    page: (a && a.page) || '',
    description: (a && a.description) || '',
  }));
  const [fx, setFx] = useState<FxRow[]>(() => (a ? advEffects(a).map(toRow) : []));
  const [vis, setVis] = useState<VisDraft>(() => visDraft(a));
  const [nameErr, setNameErr] = useState('');
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const fxBox = useRef<HTMLDivElement>(null);
  // O efeito novo: o foco vai para o alvo dele depois de desenhar.
  const focusNew = useRef(false);

  useEffect(() => {
    if (!focusNew.current) return;
    focusNew.current = false;
    const targets = fxBox.current ? fxBox.current.querySelectorAll('[data-x="target"]') : [];
    const last = targets[targets.length - 1];
    if (last instanceof HTMLElement) last.focus();
  });

  const bind = (k: keyof typeof f) => ({
    value: f[k],
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      setF(cur => ({...cur, [k]: value}));
    },
  });

  // Um campo de uma linha, sem redesenhar as outras.
  const setRow = (id: number, p: Partial<FxRow>) => setFx(cur => cur.map(r => (r.id === id ? {...r, ...p} : r)));
  // Outro alvo: o campo dele começa no primeiro.
  const setTarget = (id: number, target: string) => setFx(cur => cleanRows(cur.map(r => (r.id === id ? {...r, target, key: ''} : r))));
  const removeFx = (id: number) => setFx(cur => cleanRows(cur.filter(r => r.id !== id)));
  function addFx() {
    focusNew.current = true;
    setFx(cur => cleanRows(cur).concat([toRow(cleanAdvEffect({target: 'attr', key: 'st', value: 1}))]));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    const n = f.name.trim();
    if (!n) {
      setNameErr('Informe o nome da vantagem.');
      nameInput.current?.focus();
      return;
    }
    const effects = fx.map(cleanAdvEffect), bad = effects.map(advEffectOk).indexOf(false);
    if (bad >= 0) {
      setFormErr('Efeito ' + (bad + 1) + ': escreva ' + NAMES_MISSING[effects[bad].target] + ', separadas por vírgula.');
      const names = fxBox.current && fxBox.current.querySelector('[data-n="' + bad + '"] [data-x="names"]');
      if (names instanceof HTMLElement) names.focus();
      return;
    }
    setSaving(true);
    setFormErr('');
    const type = f.type;
    Ops.saveAdvantage(a, {name: n, cost: f.cost, type, book: f.book, page: f.page, description: f.description, effects, ...visFields(a, true, vis)}).then(
      id => {
        closeDialog();
        toast(editing ? 'Vantagem salva.' : 'Vantagem criada.');
        // A entrada nova ainda não está na lista: a página dela é a do tipo.
        if (!editing) go(hrefFor((advTypeKey(type) === 'perk' ? 'perk:' : 'adv:') + id));
      },
      er => {
        setSaving(false);
        setFormErr(errorText(er));
      },
    );
  }

  return (
    <Dialog labelledBy="afTitle" busy={saving}>
      <form id="advForm" noValidate onSubmit={submit}>
        <h2 id="afTitle">{editing ? 'Editar vantagem' : 'Nova vantagem'}</h2>
        <div className={'field' + (nameErr ? ' invalid' : '')} id="f_aname">
          <label htmlFor="aname">Nome da vantagem</label>
          <input
            type="text"
            id="aname"
            maxLength={100}
            autoComplete="off"
            placeholder="Ex.: Combat Reflexes"
            ref={nameInput}
            value={f.name}
            onChange={e => {
              const value = e.target.value;
              setF(cur => ({...cur, name: value}));
              if (value.trim()) setNameErr('');
            }}
          />
          <div className="err" id="err_aname">
            {nameErr}
          </div>
        </div>
        <div style={PAIR}>
          <div className="field">
            <label htmlFor="acost">Custo</label>
            <input type="text" id="acost" maxLength={120} placeholder="Ex.: 15 pontos, 5 pontos/nível" {...bind('cost')} />
          </div>
          <div className="field">
            <label htmlFor="atype">Tipo</label>
            <input type="text" id="atype" list="advTypeList" maxLength={80} placeholder="Ex.: Vantagem, Perk" {...bind('type')} />
            <Datalist id="advTypeList" options={advValues('type')} />
          </div>
        </div>
        <div style={PAIR}>
          <div className="field">
            <label htmlFor="abook">Livro</label>
            <input type="text" id="abook" list="advBookList" maxLength={100} placeholder="Ex.: GURPS Basic Set (4ª ed.)" {...bind('book')} />
            <Datalist id="advBookList" options={advValues('book')} />
          </div>
          <div className="field">
            <label htmlFor="apage">Página</label>
            <input type="text" id="apage" maxLength={30} placeholder="Ex.: B43, MA49" {...bind('page')} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="adesc">Descrição</label>
          <textarea id="adesc" rows={6} maxLength={20000} placeholder="O que a vantagem faz, níveis, limitações…" {...bind('description')} />
        </div>
        <fieldset className="fx-box">
          <legend>Efeitos na ficha</legend>
          <p className="hint-text" style={{margin: 0}}>
            {FX_HELP}
          </p>
          <p className="hint-text av-warn" id="afFxBuiltin" style={{margin: 0}} hidden={!ADV_FX_BUILTIN_RE.test(f.name.trim())}>
            A ficha já aplica Combat Reflexes, Enhanced Defenses, Magery e talentos sozinha: efeitos cadastrados nelas não são somados, para não contar duas vezes.
          </p>
          <div id="afFx" ref={fxBox}>
            {fx.length ? (
              fx.map((r, i) => (
                <FxEditRow
                  key={r.id}
                  r={r}
                  i={i}
                  onField={p => setRow(r.id, p)}
                  onTarget={t => setTarget(r.id, t)}
                  onRemove={() => removeFx(r.id)}
                />
              ))
            ) : (
              <p className="hint-text" style={{margin: 0}}>
                Nenhum efeito: a vantagem não muda nada na ficha.
              </p>
            )}
          </div>
          <div>
            <button className="btn" type="button" id="afFxAdd" onClick={addFx}>
              <Icon paths={ICON.plus} size={15} stroke={2.4} />
              Adicionar efeito
            </button>
          </div>
        </fieldset>
        <VisibilityFlag id="avis" item={a} share draft={vis} onChange={setVis} />
        <div className="form-err" id="afErr" role="alert">
          {formErr}
        </div>
        <div className="btn-row" style={{justifyContent: 'flex-end'}}>
          <button className="btn ghost" type="button" id="afCancel" disabled={saving} onClick={() => closeDialog()}>
            Cancelar
          </button>
          <button className="btn primary" type="submit" id="afSave" disabled={saving}>
            {saving ? 'Salvando…' : editing ? 'Salvar vantagem' : 'Criar vantagem'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

// Uma linha do editor de efeitos: o alvo, o campo dele (ou os nomes, ou nada quando vale para todos), a operação, o
// valor, o máximo, por nível, acumula, remover, e embaixo a condição e a descrição.
function FxEditRow({r, i, onField, onTarget, onRemove}: {r: FxRow; i: number; onField: (p: Partial<FxRow>) => void; onTarget: (t: string) => void; onRemove: () => void}) {
  const keys = advFxKeys(r.target), ph = NAMES_PLACEHOLDER[r.target];
  const text = (k: FxText) => ({value: r[k], onChange: (e: ChangeEvent<HTMLInputElement>) => onField({[k]: e.target.value})});
  return (
    <div className="fx-row" data-n={i}>
      <div className="fx-line">
        <select data-x="target" aria-label={'Alvo do efeito ' + (i + 1)} value={r.target} onChange={e => onTarget(e.target.value)}>
          {ADV_FX_TARGETS.map(t => (
            <option value={t[0]} key={t[0]}>
              {t[1]}
            </option>
          ))}
        </select>
        {keys.length ? (
          <select data-x="key" aria-label="Campo" value={r.key} onChange={e => onField({key: e.target.value})}>
            {keys.map(k => (
              <option value={k[0]} key={k[0]}>
                {k[1]}
              </option>
            ))}
          </select>
        ) : ph ? (
          <input type="text" data-x="names" maxLength={1000} placeholder={ph} aria-label="Nomes" {...text('names')} />
        ) : (
          <span className="fx-all" />
        )}
        <select data-x="op" aria-label="Operação" value={r.op} onChange={e => onField({op: e.target.value})}>
          <option value="add">+ soma</option>
          <option value="sub">− tira</option>
        </select>
        <input type="number" data-x="value" min={0} max={99} step={1} inputMode="numeric" aria-label="Valor" title="Valor" {...text('value')} />
        <input
          type="number"
          data-x="max"
          min={0}
          max={99}
          step={1}
          inputMode="numeric"
          placeholder="máx."
          aria-label="Máximo (vazio: sem limite)"
          title="Máximo (vazio: sem limite)"
          {...text('max')}
        />
        <label className="fx-chk" title="O valor vale para cada nível da vantagem">
          <input type="checkbox" data-x="perLevel" checked={r.perLevel} onChange={e => onField({perLevel: e.target.checked})} />
          por nível
        </label>
        <label className="fx-chk" title="Soma com os outros efeitos no mesmo campo; sem marcar, só o maior vale">
          <input type="checkbox" data-x="stacks" checked={r.stacks} onChange={e => onField({stacks: e.target.checked})} />
          acumula
        </label>
        <button className="icon-btn" type="button" data-xdel={i} aria-label={'Remover efeito ' + (i + 1)} title="Remover" onClick={onRemove}>
          <Icon paths={ICON.x} size={15} stroke={2.4} />
        </button>
      </div>
      <div className="fx-line2">
        <input type="text" data-x="cond" maxLength={200} placeholder="Condição (opcional). Ex.: ao resistir a venenos" aria-label="Condição" {...text('cond')} />
        <input type="text" data-x="note" maxLength={300} placeholder="Descrição do efeito (opcional)" aria-label="Descrição do efeito" {...text('note')} />
      </div>
    </div>
  );
}
