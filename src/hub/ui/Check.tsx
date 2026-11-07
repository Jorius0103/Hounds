/** Uma caixa de marcar com o rótulo em negrito, como o check() dos formulários antigos de Regras (classes, autocontrole…). */
export function Check({id, on, label, onChange}: {id: string; on: boolean; label: string; onChange: (on: boolean) => void}) {
  return (
    <label className="vis-flag" htmlFor={id}>
      <input type="checkbox" id={id} checked={on} onChange={e => onChange(e.target.checked)} />
      <span>
        <b>{label}</b>
      </span>
    </label>
  );
}
