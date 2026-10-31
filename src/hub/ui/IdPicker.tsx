import {useRef, useState, type ReactNode} from 'react';
import {Icon} from './Icon';
import {ImageSlot} from './ImageSlot';

export type PickerOption = {id: string; label: string; sub?: string; depth?: number};
export type PickerChip = {name: string; icon: string; img?: string | null};

/**
 * Seletor de registros que já existem, por id, como o idPicker e o idPickerHtml de js/modal.js: os escolhidos
 * viram etiquetas (com a imagem, quando há) e a busca abre a lista de sugestões, navegável pelo teclado.
 *   sel/onChange: os ids escolhidos · find(q): as opções, na ordem de exibição, para a busca já normalizada
 *   (depth recua a linha enquanto nada foi digitado) · chip(id): como mostrar um escolhido, ou null quando não dá
 *   · empty: sem opções, o campo fica desativado com esse texto
 */
export function IdPicker({
  id,
  label,
  placeholder,
  empty = '',
  hint,
  sel,
  onChange,
  find,
  chip,
}: {
  id: string;
  label: string;
  placeholder: string;
  empty?: string;
  hint?: ReactNode;
  sel: string[];
  onChange: (sel: string[]) => void;
  find: (q: string) => PickerOption[];
  chip: (id: string) => PickerChip | null;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<PickerOption[]>([]);
  const [active, setActive] = useState(0);
  // Como na versão antiga, a opção ativa anunciada fica no campo depois que a lista fecha.
  const [activeId, setActiveId] = useState<string | null>(null);

  function paint(q: string, want: number) {
    const found = find(norm(q.trim()))
      .filter(x => !sel.includes(x.id))
      .slice(0, 60);
    setOptions(found);
    if (!found.length) return setOpen(false);
    const a = Math.min(want, found.length - 1);
    setActive(a);
    setOpen(true);
    setActiveId(id + 'opt' + a);
  }

  function pick(i: number) {
    const x = options[i];
    if (!x) return;
    if (!sel.includes(x.id)) onChange(sel.concat([x.id]));
    setQuery('');
    setActive(0);
    setOpen(false);
    input.current?.focus();
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
    } else if (e.key === 'Backspace' && !query && sel.length) {
      onChange(sel.slice(0, -1));
    }
  }

  const typed = !!norm(query.trim());
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="picker">
        <div className="people" id={id + 'Sel'}>
          {sel.map((pid, i) => {
            const c = chip(pid);
            return c ? (
              <span className="person" key={pid}>
                <ImageSlot as="i" imgRef={c.img}>
                  <Icon paths={c.icon} size={12} stroke={2.4} />
                </ImageSlot>
                {c.name}
                <button
                  type="button"
                  data-rm={i}
                  aria-label={'Remover ' + c.name}
                  onClick={() => {
                    onChange(sel.filter((_, j) => j !== i));
                    input.current?.focus();
                  }}
                >
                  <Icon paths={ICON.x} size={12} stroke={2.6} />
                </button>
              </span>
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
          aria-controls={id + 'List'}
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
        <div className="suggest" id={id + 'List'} role="listbox" hidden={!open} onMouseDown={e => e.preventDefault()}>
          {options.map((x, i) => {
            const d = typed ? 0 : x.depth || 0;
            return (
              <button type="button" role="option" id={id + 'opt' + i} data-i={i} key={x.id} className={i === active ? 'act' : ''} aria-selected={i === active} onClick={() => pick(i)}>
                <span style={d ? {paddingLeft: d * 14} : undefined}>
                  {d ? '└ ' : ''}
                  {x.label}
                </span>
                {x.sub ? <small>{x.sub}</small> : null}
              </button>
            );
          })}
        </div>
      </div>
      {hint ? <span className="hint-text">{hint}</span> : null}
    </div>
  );
}
