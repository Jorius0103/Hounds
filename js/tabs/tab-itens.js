/* =====================================================================
   Hounds — Aba Itens (Regras › Itens)
   A lista, a página e o formulário são React (src/hub/paginas/
   Itens.tsx, Item.tsx e ItemForm.tsx); aqui ficam os dados (os campos),
   a gravação (Ops) e o que as fichas e o modal de item usam.
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   Itens de GURPS
   Os equipamentos dos livros (Basic Set, Low-Tech, Dungeon Fantasy...),
   sem as armas e as armaduras, que têm as suas abas: mochilas,
   ferramentas, poções, kits, instrumentos, tesouros. Vêm de
   dados/itens.json (veja "Catálogos de GURPS" em mundo.js); o banco
   guarda só o que o Mestre mudou.
   Permissão:
     - Jogador: apenas busca e visualização.
     - Mestre: criar, editar, excluir e alternar visibilidade.
   ===================================================================== */
ICON.item = '<path d="M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M8 10h8"/><path d="M8 18h8"/><path d="M8 22v-6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>';
function indexItems() { var idx = /** @type {Record<string, GearItem>} */ ({}); (W.items || []).forEach(function (x) { idx[x.id] = x; }); W.itemIdx = idx; }
function itemById(id) { return (id && (W.itemIdx[id] || movedCatalogItem('items', id))) || null; }
function itemHref(id) { return hrefFor('item:' + id); }

// Values found in the list, for the filters and the form suggestions.
function itemValues(field) {
  var set = {};
  (W.items || []).forEach(function (x) { if (x[field]) set[x[field]] = true; });
  return Object.keys(set).sort(function (a, b) { return a.localeCompare(b, 'pt'); });
}
// Every field of an item besides name, description and visibility, with its label in the form and on the page.
var ITEM_FIELDS = [
  ['cost', 'Custo', 'Ex.: $100'], ['weight', 'Peso', 'Ex.: 10 lbs.'], ['tl', 'TL', 'Ex.: 1'],
  ['category', 'Categoria', 'Ex.: Camping and Survival Gear'], ['book', 'Livro', 'Ex.: GURPS Basic Set'], ['page', 'Página', 'Ex.: B288']
];

Ops.saveItem = function (item, fields) {
  if (!isMestre()) return Promise.reject({ message: 'Apenas o Mestre pode criar ou editar itens.' });
  var t = now(), body = /** @type {Record<string, any>} */ ({ v: 1, name: (fields.name || '').trim(), description: (fields.description || '').trim() });
  ITEM_FIELDS.forEach(function (f) { body[f[0]] = String(fields[f[0]] || '').trim(); });
  return W.store.put('items', item ? item.id : null, Object.assign(body, {
    visible: fields.visible !== false,
    sharedWith: fields.sharedWith || (item && item.sharedWith) || [],
    createdBy: owner(item),
    createdAt: (item && item.createdAt) || t,
    updatedAt: t
  }));
};
// A book item is not removed from the file: its document says deleted: true.
Ops.deleteItem = function (item) {
  if (!isMestre()) return Promise.reject({ message: 'Apenas o Mestre pode excluir itens.' });
  if (item.catalog) return patchCatalogItem('items', item, { deleted: true, updatedAt: now() });
  return W.store.remove('items', item.id);
};
