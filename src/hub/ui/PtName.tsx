/**
 * O nome em português de uma entrada dos catálogos (dados/traducoes.json), como o ptNameHtml de js/busca-catalogos.js;
 * nada quando não há. as: 'p' embaixo do título de uma página, 'span' ao lado de um nome. As traduções são buscadas
 * na primeira vez que alguém pede uma, e o aviso hub:data redesenha a página quando chegam.
 */
export function PtName({item, as: Tag = 'span'}: {item: {name: string}; as?: 'span' | 'p'}) {
  const t = ptName(item);
  return t ? (
    <Tag className="pt-name" lang="pt-BR">
      {t}
    </Tag>
  ) : null;
}
