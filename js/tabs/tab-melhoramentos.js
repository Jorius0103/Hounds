/* =====================================================================
   Hounds — Aba Melhoramentos (Regras › Melhoramentos)
   A lista, a página e o formulário são React (src/hub/paginas/
   Melhoramentos.tsx, Melhoramento.tsx e MelhoramentoForm.tsx); aqui
   ficam os dados (os tipos e os campos), a gravação (Ops) e o que as
   fichas e o modal de melhoramento usam.
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   Melhoramentos de GURPS
   Os modificadores dos livros que se aplicam a uma arma, escudo,
   armadura, roupa ou outro equipamento e mudam o custo dele (Balanced,
   Fine, Dwarven, Orichalcum, Ornate, tingimento, bordado, as maldições
   dos itens mágicos...). O custo é o fator de custo (CF): o preço final
   é o de lista × (1 + a soma dos CF). Vêm de dados/melhoramentos.json
   (veja "Catálogos de GURPS" em mundo.js); o banco guarda só o que o
   Mestre mudou.
   Permissão:
     - Jogador: apenas busca e visualização.
     - Mestre: criar, editar, excluir e alternar visibilidade.
   ===================================================================== */
ICON.improvement = '<path d="m15 12-8.373 8.373a1 1 0 1 1-3-3L12 9"/><path d="m18 15 4-4"/><path d="m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172V7l-2.26-2.26a6 6 0 0 0-4.202-1.756L9 2.96l.92.82A6.18 6.18 0 0 1 12 8.4V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5"/>';
function indexImprovements() { var idx = /** @type {Record<string, Improvement>} */ ({}); (W.improvements || []).forEach(function (x) { idx[x.id] = x; }); W.improvementIdx = idx; }
function improvementById(id) { return (id && (W.improvementIdx[id] || movedCatalogItem('improvements', id))) || null; }
function improvementHref(id) { return hrefFor('impr:' + id); }

// The kinds of gear, in this order in the filter and the form.
var IMPROVEMENT_KINDS = ['Arma', 'Escudo', 'Armadura', 'Roupa', 'Item', 'Item mágico'];
// Values found in the list, for the filters and the form suggestions.
function improvementValues(field) {
  var set = {};
  (W.improvements || []).forEach(function (x) { if (x[field]) set[x[field]] = true; });
  var l = Object.keys(set).sort(function (a, b) { return a.localeCompare(b, 'pt'); });
  if (field !== 'appliesTo') return l;
  return IMPROVEMENT_KINDS.concat(l.filter(function (k) { return IMPROVEMENT_KINDS.indexOf(k) < 0; }));
}
// Every field of an improvement besides name, description and visibility, with its label in the form and on the page.
var IMPROVEMENT_FIELDS = [
  ['cost', 'Custo', 'Ex.: +4 CF'], ['weight', 'Peso', 'Ex.: ×3/4'], ['tl', 'TL', 'Ex.: 1'],
  ['appliesTo', 'Aplica-se a', 'Ex.: Arma'], ['restriction', 'Restrição', 'Ex.: Any metal weapon'],
  ['category', 'Categoria', 'Ex.: Weapons of Quality'], ['book', 'Livro', 'Ex.: GURPS: Dungeon Fantasy 1: Adventurers'], ['page', 'Página', 'Ex.: DF126']
];

Ops.saveImprovement = function (item, fields) {
  if (!isMestre()) return Promise.reject({ message: 'Apenas o Mestre pode criar ou editar melhoramentos.' });
  var t = now(), body = /** @type {Record<string, any>} */ ({ v: 1, name: (fields.name || '').trim(), description: (fields.description || '').trim() });
  IMPROVEMENT_FIELDS.forEach(function (f) { body[f[0]] = String(fields[f[0]] || '').trim(); });
  return W.store.put('improvements', item ? item.id : null, Object.assign(body, {
    visible: fields.visible !== false,
    sharedWith: fields.sharedWith || (item && item.sharedWith) || [],
    createdBy: owner(item),
    createdAt: (item && item.createdAt) || t,
    updatedAt: t
  }));
};
// A book improvement is not removed from the file: its document says deleted: true.
Ops.deleteImprovement = function (item) {
  if (!isMestre()) return Promise.reject({ message: 'Apenas o Mestre pode excluir melhoramentos.' });
  if (item.catalog) return patchCatalogItem('improvements', item, { deleted: true, updatedAt: now() });
  return W.store.remove('improvements', item.id);
};
