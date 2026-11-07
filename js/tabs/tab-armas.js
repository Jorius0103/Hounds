/* =====================================================================
   Hounds — Aba Armas (Regras › Armas)
   A lista, a página e o formulário são React (src/hub/paginas/
   Armas.tsx, Arma.tsx e ArmaForm.tsx); aqui ficam os dados (os tipos,
   os ataques e as colunas da tabela, a busca), a gravação (Ops) e o que
   as fichas e o modal de arma usam (a tabela de ataques, os parâmetros).
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   Armas de GURPS
   Armas das tabelas do Basic Set, Low-Tech, Martial Arts, Fantasy e
   Dungeon Fantasy: vêm de dados/armas.json (veja "Catálogos de GURPS"
   em mundo.js); o banco guarda só o que o Mestre mudou.
   Cada arma tem os ataques da tabela do livro (attacks): um por linha,
   com a perícia, o dano e os outros valores como o livro escreve.
   Permissão:
     - Jogador: apenas busca e visualização.
     - Mestre: criar, editar, excluir e alternar visibilidade.
   ===================================================================== */
ICON.weapon = '<path d="m14 12-8.5 8.5a2.12 2.12 0 1 1-3-3L11 9"/><path d="M15 13 9 7l4-4 6 6h3a8 8 0 0 1-7 7z"/>';
function indexWeapons() { var idx = /** @type {Record<string, Weapon>} */ ({}); (W.weapons || []).forEach(function (w) { idx[w.id] = w; }); W.weaponIdx = idx; }
function weaponById(id) { return (id && (W.weaponIdx[id] || movedCatalogItem('weapons', id))) || null; }
function weaponHref(id) { return hrefFor('weapon:' + id); }

// The tables say Melee (Reach, Parry) or Ranged (Acc, Range); the site shows it in Portuguese.
var WEAPON_TYPE_LABELS = { Melee: 'Corpo a corpo', Ranged: 'À distância' };
function weaponTypeLabel(t) { return WEAPON_TYPE_LABELS[t] || t || 'Arma'; }
function weaponBadge(w) { return '<span class="spell-badge ' + (w.type === 'Ranged' ? 'diff-h' : 'adv-adv') + '">' + esc(weaponTypeLabel(w.type)) + '</span>'; }
// The skills of the attacks, each once ("Broadsword, Two-Handed Sword").
function weaponSkills(w) {
  var out = [];
  (w.attacks || []).forEach(function (a) { if (a.skill && out.indexOf(a.skill) < 0) out.push(a.skill); });
  return out;
}
// A value of the table, or '' for the dash of an empty cell.
function weaponCell(v) { return v && !/^[–-]$/.test(v) ? v : ''; }
// The first attack that does damage, in one line for the cards: "sw+1 cut · alcance 1, 2". The
// atlatl's first line is the thrower itself, with dashes; its darts come after.
function weaponSummary(w) {
  var list = w.attacks || [], a = list.filter(function (x) { return weaponCell(x.damage); })[0] || list[0];
  if (!a) return '';
  var reach = weaponCell(a.reach), range = weaponCell(a.range);
  return [weaponCell(a.damage), reach ? 'alcance ' + reach : '', range ? 'distância ' + range : ''].filter(Boolean).join(' · ');
}
// Values found in the list, for the filters and the form suggestions.
function weaponValues(field) {
  var set = {};
  (W.weapons || []).forEach(function (w) { if (w[field]) set[w[field]] = true; });
  return Object.keys(set).sort(function (a, b) { return a.localeCompare(b, 'pt'); });
}
function weaponSkillValues() {
  var set = {};
  (W.weapons || []).forEach(function (w) { weaponSkills(w).forEach(function (s) { set[s] = true; }); });
  return Object.keys(set).sort(function (a, b) { return a.localeCompare(b, 'pt'); });
}

/* ---------- the attacks ---------- */
// Columns of the attacks, in the books' order: [field, heading, form label, placeholder].
var WEAPON_ATTACK_COLS = [
  ['damage', 'Dano', 'Dano', 'sw+1 cut'], ['reach', 'Alcance', 'Alcance', '1, 2'], ['parry', 'Aparar', 'Aparar', '0'],
  ['acc', 'Prec.', 'Precisão', '2'], ['range', 'Distância', 'Distância', '×15/×20'], ['rof', 'CdT', 'Cadência de tiro', '1'],
  ['shots', 'Tiros', 'Tiros', '1(2)'], ['fuse', 'Espoleta', 'Espoleta', '3-5'], ['st', 'ST', 'ST', '10'], ['bulk', 'Volume', 'Volume', '-3'],
  ['rcl', 'Recuo', 'Recuo', '2'], ['cost', 'Custo', 'Custo', '$20'], ['weight', 'Peso', 'Peso', '1']
];
// What each kind of weapon has in the form (cost and weight of an attack stay as they came: the
// atlatl's dart and javelin have their own).
var WEAPON_FORM_COLS = { Melee: ['damage', 'reach', 'parry', 'st'], Ranged: ['damage', 'acc', 'range', 'rof', 'shots', 'st', 'bulk', 'rcl'] };
// "or" in the table is another attack of the same weapon; the other labels say which ("with Dart").
function weaponModeText(m) { return m === 'or' ? 'ou' : m || ''; }
// nhOf(attack): optional, the cell of an NH column after Dano (Criar Arma: the sheet's NH with the weapon).
function weaponAttacksHtml(w, nhOf) {
  var list = w.attacks || [];
  if (!list.length) return '<p class="long none">Sem ataques cadastrados.</p>';
  // Only the columns some attack fills.
  var cols = WEAPON_ATTACK_COLS.filter(function (c) { return list.some(function (a) { return a[c[0]]; }); });
  var hasMode = list.some(function (a) { return a.mode; }), hasNotes = list.some(function (a) { return a.notes; }), prev = null;
  return '<div class="wtab-wrap"><table class="gtab wtab"><thead><tr><th>Perícia</th>' + (hasMode ? '<th>Modo</th>' : '') +
    cols.map(function (c) { return '<th>' + c[1] + '</th>' + (nhOf && c[0] === 'damage' ? '<th>NH</th>' : ''); }).join('') + (hasNotes ? '<th>Notas</th>' : '') + '</tr></thead><tbody>' +
    list.map(function (a) {
      // The skill once for its run of attacks, with its defaults below.
      var same = prev && prev.skill === a.skill && prev.defaults === a.defaults;
      prev = a;
      return '<tr><td>' + (same ? '' : (a.skill ? '<b>' + esc(a.skill) + '</b>' : '<span class="none">—</span>') + (a.defaults ? '<small>' + esc(a.defaults) + '</small>' : '')) + '</td>' +
        (hasMode ? '<td class="wmode">' + esc(weaponModeText(a.mode)) + '</td>' : '') +
        cols.map(function (c) { return '<td>' + (a[c[0]] ? esc(a[c[0]]) : '<span class="none">—</span>') + '</td>' + (nhOf && c[0] === 'damage' ? nhOf(a) : ''); }).join('') +
        (hasNotes ? '<td class="wnotes">' + esc(a.notes || '') + '</td>' : '') + '</tr>';
    }).join('') + '</tbody></table></div>';
}

Ops.saveWeapon = function (weapon, fields) {
  if (!isMestre()) return Promise.reject({ message: 'Apenas o Mestre pode criar ou editar armas.' });
  var t = now();
  return W.store.put('weapons', weapon ? weapon.id : null, {
    v: 1,
    name: (fields.name || '').trim(),
    tl: (fields.tl || '').trim(),
    type: fields.type === 'Ranged' ? 'Ranged' : 'Melee',
    table: (fields.table || '').trim(),
    cost: (fields.cost || '').trim(),
    weight: (fields.weight || '').trim(),
    lc: (fields.lc || '').trim(),
    description: (fields.description || '').trim(),
    footnotes: (fields.footnotes || '').trim(),
    attacks: fields.attacks || [],
    book: (fields.book || '').trim(),
    page: (fields.page || '').trim(),
    visible: fields.visible !== false,
    sharedWith: fields.sharedWith || (weapon && weapon.sharedWith) || [],
    createdBy: owner(weapon),
    createdAt: (weapon && weapon.createdAt) || t,
    updatedAt: t
  });
};
// A book weapon is not removed from the file: its document says deleted: true.
Ops.deleteWeapon = function (weapon) {
  if (!isMestre()) return Promise.reject({ message: 'Apenas o Mestre pode excluir armas.' });
  if (weapon.catalog) return patchCatalogItem('weapons', weapon, { deleted: true, updatedAt: now() });
  return W.store.remove('weapons', weapon.id);
};
// Search text of a weapon: its own texts and those of its attacks, normalized once.
var weaponSearchCache = typeof WeakMap === 'function' ? new WeakMap() : null;
function weaponSearchText(w) {
  var hit = weaponSearchCache && weaponSearchCache.get(w);
  if (hit != null) return hit;
  var t = norm([w.name, w.description, w.footnotes].concat((w.attacks || []).map(function (a) { return [a.skill, a.damage, a.notes].join(' '); })).join(' '));
  if (weaponSearchCache) weaponSearchCache.set(w, t);
  return t;
}

/* =====================================================================
   The facts of a weapon, for the modal of the sheets (the page is React:
   src/hub/paginas/Arma.tsx)
   ===================================================================== */
function weaponFactsHtml(w) {
  function fact(label, v) { return '<dt>' + label + '</dt><dd>' + (v ? esc(v) : '<span class="none">—</span>') + '</dd>'; }
  return '<dl class="facts">' +
    fact('TL', w.tl) +
    fact('Tipo', w.type ? weaponTypeLabel(w.type) : '') +
    fact('Custo', w.cost) +
    fact('Peso (lb)', w.weight) +
    fact('Legalidade (CL)', w.lc) +
    fact('Tabela', w.table) +
    fact('Livro', w.book) +
    fact('Página', w.page) +
    '</dl>';
}
