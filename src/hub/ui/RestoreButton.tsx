import {useState} from 'react';

/**
 * "Restaurar original" de uma entrada dos livros que o Mestre mudou (Ops.restoreCatalogItem de js/mundo.js): o documento
 * dele sai e ela volta como no livro. O botão fica desativado depois do clique, até sumir com a mudança nos dados;
 * quando aparece de novo, começa ativo. done: o aviso de que deu certo.
 */
export function RestoreButton({col, item, id, done}: {col: string; item: Doc; id: string; done: string}) {
  const [busy, setBusy] = useState(false);
  function restore() {
    setBusy(true);
    Ops.restoreCatalogItem(col, item).then(
      () => toast(done),
      er => {
        setBusy(false);
        toast(errorText(er), true);
      },
    );
  }
  return (
    <button className="btn" type="button" id={id} title="Desfaz as alterações do Mestre nesta entrada" disabled={busy} onClick={restore}>
      Restaurar original
    </button>
  );
}
