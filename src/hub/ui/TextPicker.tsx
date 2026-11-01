import {useEffect, useRef, useState, type ReactNode} from 'react';
import {Datalist} from './Datalist';
import {Icon} from './Icon';

export type TextPickerOption<T> = {label: string; sub?: string; pick: T};

/**
 * Seletor em que cada escolhido tem ao lado um campo curto de texto livre (o cargo de um membro), como o
 * textPicker que saiu de js/tabs/tab-organizacoes.js: a busca abre a lista de sugestões, navegável pelo teclado, e
 * cada escolha vira uma linha com o campo de texto, que ganha o foco; Enter nele volta para a busca.
 *   sel/onChange: os escolhidos, cada um com o seu text · find(q, raw): as opções para a busca já normalizada (q)
 *   e como foi digitada (raw), na ordem de exibição · chip(s): como mostrar um escolhido, ou null quando não dá
 *   · name(s): o nome dele, para os rótulos · rowKey(s): a chave da linha · datalist: as sugestões do campo de
 *   texto · empty: sem opções, a busca fica desativada com esse texto · optionId: o começo do id de cada opção
 *   (sem ele, o id do campo + 'opt') · textAria(s): o rótulo do campo de texto de um escolhido (sem ele, textLabel
 *   + ' de ' + o nome) · subAlways: o <small> de cada opção mesmo sem texto
 */
export function TextPicker<T extends {text: string}>({
  id,
  listId,
  boxId,
  optionId,
  label,
  placeholder,
  empty = '',
  hint,
  textLabel,
  textAria,
  subAlways = false,
  datalist,
  sel,
  onChange,
  find,
  chip,
  name,
  rowKey,
}: {
  id: string;
  listId: string;
  boxId: string;
  optionId?: string;
  label: string;
  placeholder: string;
  empty?: string;
  hint?: ReactNode;
  textLabel: string;
  textAria?: (s: T) => string;
  subAlways?: boolean;
  datalist: {id: string; options: string[]};
  sel: T[];
  onChange: (sel: T[]) => void;
  find: (q: string, raw: string) => TextPickerOption<T>[];
  chip: (s: T) => ReactNode | null;
  name: (s: T) => string;
  rowKey: (s: T) => string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<TextPickerOption<T>[]>([]);
  const [active, setActive] = useState(0);
  // Como na versão antiga, a opção ativa anunciada fica no campo depois que a lista fecha.
  const [activeId, setActiveId] = useState<string | null>(null);
  // O foco depois que a seleção nova é desenhada: o campo de texto da linha escolhida (o índice), ou a busca depois
  // de tirar um escolhido ('input'), para a lista que o foco abre já oferecer de novo o que saiu.
  const focusAfter = useRef<number | 'input' | null>(null);
  const optId = optionId || id + 'opt';

  useEffect(() => {
    const f = focusAfter.current;
    if (f == null) return;
    focusAfter.current = null;
    if (f === 'input') input.current?.focus();
    else box.current?.querySelector<HTMLInputElement>('[data-ti="' + f + '"]')?.focus();
  });

  function paint(q: string, want: number) {
    const found = find(norm(q.trim()), q.trim()).slice(0, 40);
    setOptions(found);
    if (!found.length) return setOpen(false);
    const a = Math.min(want, found.length - 1);
    setActive(a);
    setOpen(true);
    setActiveId(optId + a);
  }

  function pick(i: number) {
    const x = options[i];
    if (!x) return;
    focusAfter.current = sel.length;
    onChange(sel.concat([x.pick]));
    setQuery('');
    setActive(0);
    setOpen(false);
  }

  function keyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      paint(query, open ? Math.min(options.length - 1, active + 1) : 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      paint(query, Math.max(0, active - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && options.length) pick(active);
    } else if (e.key === 'Escape' && open) {
      // Fecha só a lista: o Esc não chega ao modal (js/explorer.js).
      e.stopPropagation();
      setOpen(false);
    }
  }

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="picker">
        <div className="rels" id={boxId} ref={box}>
          {sel.map((s, i) => {
            const c = chip(s);
            return c ? (
              <div className="rel-row" key={rowKey(s)}>
                {c}
                <input
                  type="text"
                  data-ti={i}
                  list={datalist.id}
                  maxLength={60}
                  autoComplete="off"
                  placeholder={textLabel}
                  aria-label={textAria ? textAria(s) : textLabel + ' de ' + name(s)}
                  value={s.text}
                  onChange={e => onChange(sel.map((x, j) => (j === i ? {...x, text: e.target.value} : x)))}
                  onKeyDown={e => {
                    if (e.key !== 'Enter') return;
                    e.preventDefault();
                    input.current?.focus();
                  }}
                />
                <button
                  className="icon-btn"
                  type="button"
                  data-rm={i}
                  aria-label={'Remover ' + name(s)}
                  onClick={() => {
                    focusAfter.current = 'input';
                    onChange(sel.filter((_, j) => j !== i));
                  }}
                >
                  <Icon paths={ICON.x} size={14} stroke={2.6} />
                </button>
              </div>
            ) : null;
          })}
        </div>
        <input
          type="text"
          id={id}
          ref={input}
          autoComplete="off"
          placeholder={empty || placeholder}
          disabled={!!empty}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeId || undefined}
          value={query}
          onFocus={() => paint(query, active)}
          onChange={e => {
            setQuery(e.target.value);
            paint(e.target.value, 0);
          }}
          onKeyDown={keyDown}
          onBlur={() =>
            setTimeout(() => {
              if (document.activeElement !== input.current) setOpen(false);
            }, 150)
          }
        />
        <div className="suggest" id={listId} role="listbox" hidden={!open} onMouseDown={e => e.preventDefault()}>
          {options.map((x, i) => (
            <button type="button" role="option" id={optId + i} data-i={i} key={i} className={i === active ? 'act' : ''} aria-selected={i === active} onClick={() => pick(i)}>
              {x.label}
              {x.sub || subAlways ? <small>{x.sub}</small> : null}
            </button>
          ))}
        </div>
      </div>
      <Datalist id={datalist.id} options={datalist.options} />
      {hint ? <span className="hint-text">{hint}</span> : null}
    </div>
  );
}
