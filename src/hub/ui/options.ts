// As opções em árvore de um <select> de locais ou de mapas (no lugar do locParentOptions e do mapOptions, que
// ficavam em js/mundo.js): os de dentro recuados com "└". exclude: ids que ficam de fora, com tudo o que está
// dentro deles.
export type SelectOption = {value: string; label: string};
type Exclude = Record<string, boolean> | null | undefined;

// space: o espaço do recuo, três por nível. O de mapas usa o que não quebra (\u00a0), que o <select> mantém; o de
// locais, o comum, como as funções antigas.
function treeOptions(kids: (id: string | null) => {id: string; name: string}[], noneLabel: string, exclude: Exclude, space: string) {
  const out: SelectOption[] = [{value: '', label: noneLabel}];
  (function walk(parent: string | null, depth: number) {
    kids(parent).forEach(x => {
      if (exclude && exclude[x.id]) return;
      out.push({value: x.id, label: (depth ? space.repeat(3 * (depth - 1)) + '└' + space : '') + x.name});
      walk(x.id, depth + 1);
    });
  })(null, 0);
  return out;
}

export const locSelectOptions = (noneLabel: string, exclude?: Exclude) => treeOptions(childLocs, noneLabel, exclude, ' ');
export const mapSelectOptions = (noneLabel: string, exclude?: Exclude) => treeOptions(childMaps, noneLabel, exclude, '\u00a0');
