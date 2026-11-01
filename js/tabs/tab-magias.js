/* =====================================================================
   Hounds — Aba Magias (Regras › Magias)
   A lista, a página da magia e o formulário são React (src/hub/
   paginas/Magias.tsx, Magia.tsx e MagiaForm.tsx); aqui ficam os dados
   (escolas, classes, resistências, livros e o que o Mestre mudou) e as
   regras de uma magia num modal, para os links das fichas.
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   Magias de GURPS
   Base de dados com magias do Basic Set e Magic Volumes 1-5.
   Permissão:
     - Jogador: apenas busca e visualização das fichas.
     - Mestre: criar, editar, excluir e alternar visibilidade.
   ===================================================================== */

var GURPS_COLLEGES = [
  'Air', 'Animal', 'Body Control', 'Communication and Empathy', 'Earth',
  'Enchantment', 'Fire', 'Food', 'Gate', 'Healing', 'Illusion and Creation',
  'Knowledge', 'Light and Darkness', 'Making and Breaking', 'Meta-Spells',
  'Mind Control', 'Movement', 'Necromantic', 'Plant', 'Protection and Warning',
  'Sound', 'Technological', 'Water', 'Weather'
];

var GURPS_CLASSES = [
  'Regular', 'Area', 'Missile', 'Blocking', 'Information', 'Enchantment',
  'Special', 'Melee'
];

function spellColleges() {
  var set = {};
  GURPS_COLLEGES.forEach(function (c) { set[c] = true; });
  (W.spells || []).forEach(function (s) {
    if (!s.college) return;
    s.college.split(',').forEach(function (part) {
      var trimmed = part.trim();
      if (trimmed) set[trimmed] = true;
    });
  });
  return Object.keys(set).sort(function (a, b) { return a.localeCompare(b, 'pt'); });
}

function spellClasses() {
  var set = {};
  GURPS_CLASSES.forEach(function (c) { set[c] = true; });
  (W.spells || []).forEach(function (s) {
    // "Regular; Resisted by HT": the class is each part that is not the resistance.
    (s.class || '').split(/[;,]/).forEach(function (part) { var p = part.trim(); if (p && !/resist|\//i.test(p)) set[p] = true; });
  });
  return Object.keys(set).sort(function (a, b) { return a.localeCompare(b, 'pt'); });
}

// The resistance is the rest of the class field ("Area; Special Resistance", "Regular; Resisted by
// HT or Will"). It is written in many ways, so the filter groups it by what resists: [key, label].
var SPELL_RESISTANCES = [['none', 'Sem resistência'], ['HT', 'Resistida por HT'], ['Will', 'Resistida por Vontade'],
  ['IQ', 'Resistida por IQ'], ['ST', 'Resistida por ST'], ['DX', 'Resistida por DX'], ['Per', 'Resistida por Percepção'],
  ['special', 'Resistência especial'], ['spell', 'Resistida por outra magia'], ['resists', 'Resiste a magias ou ataques'],
  ['other', 'Outra resistência']];
// The keys of SPELL_RESISTANCES a spell belongs to ("Resisted by HT or Will" is in both).
function spellResistance(s) {
  var keys = [];
  (s.class || '').split(/[;,]/).forEach(function (part) {
    var p = part.trim();
    if (!/resist/i.test(p)) return;
    if (/^(special|automatic) resistance/i.test(p)) { keys.push('special'); return; }
    if (/^resists\b/i.test(p)) { keys.push('resists'); return; }
    var by = p.replace(/^resisted by\s*/i, ''), n = keys.length;
    ['HT', 'Will', 'IQ', 'ST', 'DX', 'Per'].forEach(function (a) { if (new RegExp('\\b' + a + '\\b').test(by)) keys.push(a); });
    if (/spell|magelock|gate|hide path/i.test(by)) keys.push('spell');
    if (keys.length === n) keys.push('other');
  });
  return keys.length ? keys : ['none'];
}
// The groups that have spells, with how many each one has.
function spellResistances() {
  var n = {};
  (W.spells || []).forEach(function (s) { spellResistance(s).forEach(function (k) { n[k] = (n[k] || 0) + 1; }); });
  return SPELL_RESISTANCES.filter(function (r) { return n[r[0]]; }).map(function (r) { return [r[0], r[1], n[r[0]]]; });
}

// Books of the list, with how many spells each one has.
function spellBooks() {
  var n = {};
  (W.spells || []).forEach(function (s) { var b = s.source || 'Sem livro'; n[b] = (n[b] || 0) + 1; });
  return Object.keys(n).sort(function (a, b) { return n[b] - n[a] || a.localeCompare(b, 'pt'); }).map(function (b) { return [b, n[b]]; });
}
// A spell the Mestre only showed or hid looks like the book's to the players.
function spellChange(s) { var k = catalogChange('spells', s); return k === 'hidden' && !isMestre() ? '' : k; }

// The rules of a spell in a modal, for links elsewhere (Ficha › Magia): <a href="#magia~id"
// data-spell-modal="id">. A plain click opens the modal; Ctrl/middle click still opens the page.
function openSpellModal(id) {
  showModal('<div class="skill-modal" id="spellModal"><p class="lede">Carregando magia…</p></div>');
  function fact(label, v) { return v ? '<dt>' + label + '</dt><dd>' + esc(v) + '</dd>' : ''; }
  function paint() {
    var box = $('spellModal'); if (!box) return;
    var s = spellById(id);
    if (!s) { box.innerHTML = '<h2>Magia não encontrada</h2><p class="lede">Essa magia pode ter sido excluída ou ocultada.</p>'; return; }
    var isVH = (s.difficulty || '').toUpperCase() === 'VH';
    // A sheet being edited would lose its draft on leaving the page: the page opens in another tab then.
    var away = S.ui && S.ui.spellDraft ? ' target="_blank" rel="noopener"' : '';
    box.innerHTML = '<div class="skill-modal-head"><div style="display:flex;align-items:center;gap:8px"><span class="badge">' + svg(ICON.spell, 12, 2.4) + ' Magia</span>' +
      '<span class="spell-badge ' + (isVH ? 'diff-vh' : 'diff-h') + '">' + (isVH ? 'Very Hard (VH)' : 'Hard (H)') + '</span></div>' +
      '<h2 id="spellModalTitle">' + esc(s.name) + '</h2>' + ptNameHtml(s, 'p') +
      '<p class="lede">' + (s.college ? esc(s.college) : 'Sem escola') + (s.class ? ' · ' + esc(s.class) : '') + '</p></div>' +
      (s.description ? '<section><h3 class="sec-title">Efeito e Descrição</h3><p class="long">' + esc(s.description) + '</p></section>' : '') +
      (s.prerequisites ? '<section><h3 class="sec-title">Pré-requisitos</h3><p class="long">' + esc(s.prerequisites) + '</p></section>' : '') +
      '<dl class="facts">' + fact('Tempo de Conjuração', s.timeToCast) + fact('Duração', s.duration) +
      fact(s.maintenanceCost ? 'Custo Inicial' : 'Custo', s.initialCost) + fact('Custo Manutenção', s.maintenanceCost) +
      fact('Página', s.page) + fact('Fonte', s.source) + '</dl>' +
      '<div class="btn-row" style="justify-content:flex-end"><a class="btn" href="' + spellHref(s.id) + '"' + away + ' id="spellModalPage">Abrir página da magia</a></div>';
    modal.setAttribute('aria-labelledby', 'spellModalTitle');
    var pg = $('spellModalPage'); if (pg && !away) pg.onclick = function () { closeModal(); };
  }
  loadCatalog('spells').then(paint, paint);
}
document.addEventListener('click', function (e) {
  if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
  var t = /** @type {AnyEl} */ (e.target), a = t && t.closest && t.closest('[data-spell-modal]'); if (!a) return;
  e.preventDefault(); openSpellModal(a.getAttribute('data-spell-modal'));
});
