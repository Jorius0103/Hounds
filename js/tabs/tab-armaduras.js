/* =====================================================================
   Hounds — Aba Armaduras (Regras › Armaduras)
   A lista, a página e o formulário são React (src/hub/paginas/
   Armaduras.tsx, Armadura.tsx e ArmaduraForm.tsx); aqui ficam os dados
   (os tipos, os campos, o resumo da proteção), a gravação (Ops) e os
   parâmetros que o modal de armadura das fichas mostra.
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   Armaduras e escudos de GURPS
   Das tabelas do Basic Set, Low-Tech e Dungeon Fantasy: vêm de
   dados/armaduras.json (veja "Catálogos de GURPS" em mundo.js); o banco
   guarda só o que o Mestre mudou. Uma peça que se acrescenta a outra
   ("+ Visor" embaixo de Frag Helmet) é uma entrada própria, "Visor (Frag
   Helmet)", com o custo e o peso que ela soma ("+$25").
   Permissão:
     - Jogador: apenas busca e visualização.
     - Mestre: criar, editar, excluir e alternar visibilidade.
   ===================================================================== */
ICON.armor = '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>';
function indexArmors() { var idx = /** @type {Record<string, Armor>} */ ({}); (W.armors || []).forEach(function (a) { idx[a.id] = a; }); W.armorIdx = idx; }
function armorById(id) { return (id && (W.armorIdx[id] || movedCatalogItem('armors', id))) || null; }
function armorHref(id) { return hrefFor('armor:' + id); }

// The tables say Armor (DR) or Shield (DB); the site shows it in Portuguese.
var ARMOR_TYPE_LABELS = { Armor: 'Armadura', Shield: 'Escudo' };
function armorTypeLabel(t) { return ARMOR_TYPE_LABELS[t] || t || 'Armadura'; }
function armorBadge(a) { return '<span class="spell-badge ' + (a.type === 'Shield' ? 'adv-perk' : 'adv-exp') + '">' + esc(armorTypeLabel(a.type)) + '</span>'; }
// What protects, in one line for the cards: "RD 4/2* · torso, groin" or "BD 2 · RD 7 · PV 40".
function armorSummary(a) {
  function v(x) { return x && !/^[–-]$/.test(x) ? x : ''; }
  return [v(a.db) ? 'BD ' + a.db : '', v(a.dr) ? 'RD ' + a.dr : '', v(a.hp) ? 'PV ' + a.hp : '', v(a.location)].filter(Boolean).join(' · ');
}
// Values found in the list, for the filters and the form suggestions.
function armorValues(field) {
  var set = {};
  (W.armors || []).forEach(function (a) { if (a[field]) set[a[field]] = true; });
  return Object.keys(set).sort(function (a, b) { return a.localeCompare(b, 'pt'); });
}

// Every field of an armor or shield besides visibility, with its label in the form and on the page.
var ARMOR_FIELDS = [
  ['tl', 'TL', 'Ex.: 2'], ['location', 'Local', 'Ex.: torso, groin'], ['dr', 'RD', 'Ex.: 4/2*'], ['db', 'BD', 'Ex.: 2'],
  ['hp', 'PV', 'Ex.: 40'], ['coverDr', 'RD de cobertura', 'Ex.: 9'], ['cost', 'Custo', 'Ex.: $230'], ['weight', 'Peso (lb)', 'Ex.: 25'],
  ['don', 'Vestir (s)', 'Ex.: 30'], ['lc', 'Legalidade (CL)', 'Ex.: 3'], ['category', 'Categoria', 'Ex.: Body Armor'],
  ['skill', 'Perícia', 'Ex.: Shield'], ['defaults', 'Padrões', 'Ex.: DX-4'], ['table', 'Tabela', 'Ex.: Low-Tech Armor Table'],
  ['book', 'Livro', 'Ex.: GURPS Basic Set'], ['page', 'Página', 'Ex.: B283']
];

Ops.saveArmor = function (armor, fields) {
  if (!isMestre()) return Promise.reject({ message: 'Apenas o Mestre pode criar ou editar armaduras.' });
  var t = now(), body = /** @type {Record<string, any>} */ ({ v: 1, name: (fields.name || '').trim(), type: fields.type === 'Shield' ? 'Shield' : 'Armor' });
  ARMOR_FIELDS.concat([['notes'], ['footnotes']]).forEach(function (f) { body[f[0]] = String(fields[f[0]] || '').trim(); });
  return W.store.put('armors', armor ? armor.id : null, Object.assign(body, {
    visible: fields.visible !== false,
    sharedWith: fields.sharedWith || (armor && armor.sharedWith) || [],
    createdBy: owner(armor),
    createdAt: (armor && armor.createdAt) || t,
    updatedAt: t
  }));
};
// A book armor is not removed from the file: its document says deleted: true.
Ops.deleteArmor = function (armor) {
  if (!isMestre()) return Promise.reject({ message: 'Apenas o Mestre pode excluir armaduras.' });
  if (armor.catalog) return patchCatalogItem('armors', armor, { deleted: true, updatedAt: now() });
  return W.store.remove('armors', armor.id);
};

/* =====================================================================
   The facts of an armor or shield, for the modal of the sheets (the page
   is React: src/hub/paginas/Armadura.tsx)
   ===================================================================== */
// The facts of the entry; the ones of the other kind (BD of an armor, Local of a shield) only when filled.
function armorFactsHtml(a) {
  var always = { tl: 1, cost: 1, weight: 1, book: 1, page: 1 };
  if (a.type === 'Shield') { always.db = 1; always.dr = 1; always.hp = 1; } else { always.location = 1; always.dr = 1; }
  return '<dl class="facts"><dt>Tipo</dt><dd>' + esc(armorTypeLabel(a.type)) + '</dd>' + ARMOR_FIELDS.map(function (f) {
    var v = a[f[0]];
    if (!v && !always[f[0]]) return '';
    return '<dt>' + esc(f[1]) + '</dt><dd>' + (v ? esc(v) : '<span class="none">—</span>') + '</dd>';
  }).join('') + '</dl>';
}
