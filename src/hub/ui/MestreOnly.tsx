/**
 * O filtro "Criado pelo Mestre" das listas de Regras, como o mestreOnlyHtml de js/pagina.js: só as entradas que o
 * Mestre criou (os documentos do banco, não as dos livros).
 */
export function MestreOnly({on, onChange}: {on: boolean; onChange: (on: boolean) => void}) {
  return (
    <label className="vis-flag" htmlFor="mestreOnly" style={{padding: '8px 12px'}}>
      <input type="checkbox" id="mestreOnly" checked={on} onChange={e => onChange(e.target.checked)} />
      <span>
        <b>Criado pelo Mestre</b>
      </span>
    </label>
  );
}
