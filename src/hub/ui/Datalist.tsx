// As sugestões de um campo de texto (<input list="…">), como o datalistHtml que saiu de js/tabs/tab-organizacoes.js.
export function Datalist({id, options}: {id: string; options: string[]}) {
  return (
    <datalist id={id}>
      {options.map(v => (
        <option value={v} key={v} />
      ))}
    </datalist>
  );
}
