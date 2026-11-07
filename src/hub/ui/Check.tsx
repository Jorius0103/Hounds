import type {CSSProperties} from 'react';

/** Uma caixa de marcar com o rótulo em negrito, como o check() dos formulários antigos de Regras (classes, autocontrole…). */
export function Check({id, on, label, onChange, style}: {id: string; on: boolean; label: string; onChange: (on: boolean) => void; style?: CSSProperties}) {
  return (
    <label className="vis-flag" htmlFor={id} style={style}>
      <input type="checkbox" id={id} checked={on} onChange={e => onChange(e.target.checked)} />
      <span>
        <b>{label}</b>
      </span>
    </label>
  );
}
