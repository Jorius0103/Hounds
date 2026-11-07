import {useEffect, useRef, useState, type ChangeEvent} from 'react';
import {useHub} from '../data';
import {closeDialog, Dialog, touchDialog} from '../ui/Dialog';
import {Icon} from '../ui/Icon';
import {PtName} from '../ui/PtName';
import {VisibilityFlag, visDraft, visFields, type VisDraft} from '../ui/Visibility';

// Uma opção da lista de sugestões: uma entrada do catálogo da lista, ou o nome como foi digitado (custom).
type StyleOption = {name: string; entry?: {name: string; specialty?: boolean}; info?: string; custom?: boolean};
type StyleHow = {name?: string; then?(id: string, fields: Record<string, unknown>): void};

/**
 * Criar (x null) ou editar um estilo de luta, só o Mestre: nome, custo, livro, página, descrição, as listas e a
 * visibilidade. Cada lista é escolhida do catálogo a que pertence (STYLE_LIST_KIND): o que se digita é buscado ali (pelo
 * nome em inglês ou em português), os escolhidos viram itens, e um nome fora do catálogo (uma especialização, uma regra
 * da casa) também entra. Grava com o Ops.saveStyle de js/tabs/tab-combate.js, com os nomes separados por "; ".
 * how (só num estilo novo, criado pela ficha pelo window.hubOpenStyleForm): o nome com que começa e then(id, fields),
 * chamado depois de salvo no lugar de abrir a página dele.
 */
export function StyleForm({x, how}: {x: FightingStyle | null; how?: StyleHow}) {
  useHub();
  const editing = !!x;
  const lists = STYLE_LISTS.concat(STYLE_OPT_LISTS);
  const [f, setF] = useState(() => ({
    name: x ? x.name : (how && how.name) || '',
    cost: (x && x.cost) || '',
    book: (x && x.book) || '',
    page: (x && x.page) || '',
    description: (x && x.description) || '',
  }));
  // Os escolhidos de cada lista e o que está digitado no campo dela.
  const [picked, setPicked] = useState(() => {
    const out: Record<string, string[]> = {};
    lists.forEach(d => {
      out[d[0]] = styleItems(x ? x[d[0]] : '');
    });
    return out;
  });
  const [typed, setTyped] = useState<Record<string, string>>({});
  // A lista de sugestões aberta (uma por vez) e a opção marcada nela.
  const [sg, setSg] = useState<{k: string; act: number} | null>(null);
  const sgRef = useRef(sg);
  sgRef.current = sg;
  const [vis, setVis] = useState<VisDraft>(() => visDraft(x));
  const [nameErr, setNameErr] = useState('');
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);
  // Uma perícia que exige especialização volta ao campo com "()": o cursor fica entre os parênteses.
  const caret = useRef<{k: string; at: number} | null>(null);

  useEffect(() => {
    ['skills', 'techniques', 'advantages', 'disadvantages', 'spells'].forEach(c => loadCatalog(c));
  }, []);
  useEffect(() => {
    const c = caret.current;
    if (c) {
      caret.current = null;
      const input = document.getElementById('sf_' + c.k) as HTMLInputElement | null;
      input?.focus();
      input?.setSelectionRange(c.at, c.at);
    }
  });
  // A opção marcada fica à vista na lista.
  useEffect(() => {
    form.current?.querySelector('.sf-list .suggest:not([hidden]) .act')?.scrollIntoView({block: 'nearest'});
  }, [sg]);

  const bind = (k: keyof typeof f) => ({
    value: f[k],
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      setF(cur => ({...cur, [k]: value}));
    },
  });

  // As opções de uma lista para o que está digitado: as entradas do catálogo dela que ainda não foram escolhidas (as mais
  // parecidas primeiro; sem busca, em ordem alfabética), até 12, e o nome digitado, quando não é nenhuma delas.
  function options(k: string): StyleOption[] {
    const kind = STYLE_LIST_KIND[k], q = typed[k] || '', text = q.trim();
    const have: Record<string, boolean> = {}, seen: Record<string, boolean> = {};
    picked[k].forEach(n => {
      have[norm(n)] = true;
    });
    const all = styleKindList(kind).filter(e => !have[norm(e.name)]);
    const opts: StyleOption[] = (text ? searchCatalog(all, q) : all.slice().sort(byName))
      .filter(e => {
        const n = norm(e.name);
        if (seen[n]) return false;
        seen[n] = true;
        return true;
      })
      .slice(0, 12)
      .map(e => ({name: e.name, entry: e, info: styleKindInfo(kind, e)}));
    if (text && !have[norm(text)] && !opts.some(o => norm(o.name) === norm(text))) opts.push({name: text, custom: true});
    return opts;
  }

  function setList(k: string, names: string[]) {
    setPicked(cur => ({...cur, [k]: names}));
    // Os itens não são campos: o modal passa a perguntar antes de descartar.
    touchDialog();
  }

  function pick(k: string, o: StyleOption | undefined) {
    if (!o) return;
    if (o.entry && o.entry.specialty && !/\(/.test(o.name)) {
      const v = o.name + ' ()';
      setTyped(cur => ({...cur, [k]: v}));
      caret.current = {k, at: v.length - 1};
      setSg({k, act: 0});
      return;
    }
    setList(k, picked[k].concat([o.name]));
    setTyped(cur => ({...cur, [k]: ''}));
    setSg({k, act: 0});
    document.getElementById('sf_' + k)?.focus();
  }

  function keyDown(k: string, e: React.KeyboardEvent<HTMLInputElement>, opts: StyleOption[], act: number) {
    const open = !!sg && sg.k === k;
    // Enter nunca envia o formulário destes campos: escolhe a opção marcada.
    if (e.key === 'Enter') {
      e.preventDefault();
      if (open && opts.length) pick(k, opts[act]);
      return;
    }
    if (!open || !opts.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSg({k, act: Math.min(opts.length - 1, act + 1)});
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSg({k, act: Math.max(0, act - 1)});
    } else if (e.key === 'Escape') {
      // Fecha só a lista: o Esc não chega ao modal.
      e.stopPropagation();
      setSg(null);
    } else if (e.key === 'Backspace' && !(typed[k] || '') && picked[k].length) {
      // Backspace no campo vazio devolve o último escolhido para o campo.
      e.preventDefault();
      setTyped(cur => ({...cur, [k]: picked[k][picked[k].length - 1]}));
      setList(k, picked[k].slice(0, -1));
    }
  }

  function listField(d: [StyleList, string]) {
    const k = d[0], kind = STYLE_LIST_KIND[k], open = !!sg && sg.k === k;
    const opts = open ? options(k) : [];
    const act = open ? Math.min(sg!.act, Math.max(0, opts.length - 1)) : 0, shown = open && opts.length > 0;
    return (
      <div className="field sf-list" key={k}>
        <label htmlFor={'sf_' + k}>{d[1]}</label>
        <div className="sf-chips" data-sfchips={k}>
          {picked[k].map((n, i) => (
            <span className="sf-chip" key={i}>
              {n}
              <button type="button" data-sfdel={k + ':' + i} aria-label={'Tirar ' + n} title="Tirar" onClick={() => setList(k, picked[k].filter((_, j) => j !== i))}>
                <Icon paths={ICON.x} size={12} stroke={2.6} />
              </button>
            </span>
          ))}
        </div>
        <div className="sk-pick">
          <input
            type="text"
            id={'sf_' + k}
            data-sf={k}
            maxLength={200}
            autoComplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={shown}
            aria-controls={'sfSug_' + k}
            placeholder={'Digite para buscar em ' + STYLE_KIND_PAGE[kind]}
            value={typed[k] || ''}
            onChange={e => {
              const value = e.target.value;
              setTyped(cur => ({...cur, [k]: value}));
              setSg({k, act: 0});
            }}
            onFocus={() => setSg({k, act: 0})}
            onBlur={e => {
              const input = e.currentTarget;
              setTimeout(() => {
                if (sgRef.current && sgRef.current.k === k && document.activeElement !== input) setSg(null);
              }, 150);
            }}
            onKeyDown={e => keyDown(k, e, opts, act)}
          />
          <div className="suggest" id={'sfSug_' + k} role="listbox" hidden={!shown} onMouseDown={e => e.preventDefault()}>
            {shown
              ? opts.map((o, i) =>
                  o.custom ? (
                    <button type="button" role="option" data-o={i} className={'ab-custom-opt' + (i === act ? ' act' : '')} aria-selected={i === act} key={'custom'} onClick={() => pick(k, o)}>
                      <span>
                        <Icon paths={ICON.plus} size={13} stroke={2.4} />
                        {'Adicionar “' + o.name + '”'}
                      </span>
                      <small>como está, fora do catálogo</small>
                    </button>
                  ) : (
                    <button type="button" role="option" data-o={i} className={i === act ? 'act' : ''} aria-selected={i === act} key={o.name} onClick={() => pick(k, o)}>
                      <span>
                        {o.name}
                        <PtName item={o.entry!} />
                      </span>
                      <small>{o.info}</small>
                    </button>
                  ),
                )
              : null}
          </div>
        </div>
      </div>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    const n = f.name.trim();
    if (!n) {
      setNameErr('Informe o nome do estilo.');
      nameInput.current?.focus();
      return;
    }
    const fields = {name: n, cost: f.cost, book: f.book, page: f.page, description: f.description, ...visFields(x, true, vis)} as Parameters<typeof Ops.saveStyle>[1];
    // Um nome digitado e ainda não acrescentado entra também.
    lists.forEach(d => {
      const left = (typed[d[0]] || '').trim();
      fields[d[0]] = picked[d[0]].concat(left && picked[d[0]].indexOf(left) < 0 ? [left] : []).join('; ');
    });
    setSaving(true);
    setFormErr('');
    Ops.saveStyle(x, fields).then(
      id => {
        closeDialog();
        toast(editing ? 'Estilo salvo.' : 'Estilo criado.');
        if (!editing && how && how.then) how.then(id, fields);
        else if (!editing) go(styleHref(id));
      },
      er => {
        setSaving(false);
        setFormErr(errorText(er));
      },
    );
  }

  return (
    <Dialog labelledBy="stTitle" busy={saving}>
      <form id="styleForm" noValidate onSubmit={submit} ref={form}>
        <h2 id="stTitle">{editing ? 'Editar estilo' : 'Novo estilo'}</h2>
        <div className={'field' + (nameErr ? ' invalid' : '')} id="f_stname">
          <label htmlFor="stname">Nome do estilo</label>
          <input
            type="text"
            id="stname"
            maxLength={100}
            autoComplete="off"
            placeholder="Ex.: Kenjutsu"
            ref={nameInput}
            value={f.name}
            onChange={e => {
              const value = e.target.value;
              setF(cur => ({...cur, name: value}));
              if (value.trim()) setNameErr('');
            }}
          />
          <div className="err" id="err_stname">
            {nameErr}
          </div>
        </div>
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12}}>
          <div className="field">
            <label htmlFor="stcost">Custo (pontos)</label>
            <input type="text" id="stcost" maxLength={10} inputMode="numeric" placeholder="Ex.: 3" {...bind('cost')} />
          </div>
          <div className="field">
            <label htmlFor="stbook">Livro</label>
            <input type="text" id="stbook" maxLength={100} placeholder="Ex.: GURPS Martial Arts" {...bind('book')} />
          </div>
          <div className="field">
            <label htmlFor="stpage">Página</label>
            <input type="text" id="stpage" maxLength={30} placeholder="Ex.: MA173" {...bind('page')} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="stdesc">Descrição</label>
          <textarea id="stdesc" rows={5} maxLength={20000} placeholder="História e jeito de lutar do estilo…" {...bind('description')} />
        </div>
        {STYLE_LISTS.map(listField)}
        <h3 className="sec-title" style={{margin: '6px 0 0'}}>
          Traços opcionais
        </h3>
        {STYLE_OPT_LISTS.map(listField)}
        <VisibilityFlag id="stvis" item={x} share draft={vis} onChange={setVis} />
        <div className="form-err" id="stErr" role="alert">
          {formErr}
        </div>
        <div className="btn-row" style={{justifyContent: 'flex-end'}}>
          <button className="btn ghost" type="button" id="stCancel" disabled={saving} onClick={() => closeDialog()}>
            Cancelar
          </button>
          <button className="btn primary" type="submit" id="stSave" disabled={saving}>
            {saving ? 'Salvando…' : editing ? 'Salvar estilo' : 'Criar estilo'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
