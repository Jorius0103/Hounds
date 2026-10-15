/* =====================================================================
   Hounds — Aba Magias (Mundo › Magias)
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

// Typing in the search waits a moment before redrawing the list.
var spellSearchTimer = 0;
var SPELL_SEARCH_FIELDS = ['name', 'college', 'class', 'description', 'prerequisites'];
// Search, filters and page of the list: kept while the site is open, so opening a spell
// and coming back returns to the same page.
var spellView = { q: '', college: '', spellClass: '', resistance: '', difficulty: '', book: '', change: '', page: 1 };
// The "Alterações do Mestre" filter. 'any' is every kind of change.
var SPELL_CHANGE_FILTERS = [['any', 'Alteradas pelo Mestre'], ['created', 'Criadas pelo Mestre'], ['edited', 'Editadas dos livros'], ['hidden', 'Ocultas dos jogadores'], ['deleted', 'Excluídas']];
// Books of the list, with how many spells each one has.
function spellBooks() {
  var n = {};
  (W.spells || []).forEach(function (s) { var b = s.source || 'Sem livro'; n[b] = (n[b] || 0) + 1; });
  return Object.keys(n).sort(function (a, b) { return n[b] - n[a] || a.localeCompare(b, 'pt'); }).map(function (b) { return [b, n[b]]; });
}
// A spell the Mestre only showed or hid looks like the book's to the players.
function spellChange(s) { var k = catalogChange('spells', s); return k === 'hidden' && !isMestre() ? '' : k; }
// Tag on a card for what the Mestre changed.
function spellChangeTag(s) {
  var k = spellChange(s);
  var label = { created: 'Criada pelo Mestre', edited: 'Editada pelo Mestre', hidden: 'Oculta' }[k];
  return label ? '<span class="spell-tag mestre">' + label + '</span>' : '';
}

function renderSpellsPage() {
  var ui = spellView;
  loadCatalog('spells');

  var can = isMestre();
  var colleges = spellColleges();
  var classes = spellClasses();

  var head = crumbsHtml('spells') +
    '<div class="head-row"><div>' +
    '<h1>' + svg(ICON.spell, 24, 2) + ' Magias</h1>' +
    '<p class="lede">Grimório de magias e encantamentos para GURPS 4ª Edição.</p>' +
    '</div>' +
    (can ? '<div class="btn-row">' +
      '<button class="btn primary" type="button" id="newSpellBtn">' + svg(ICON.plus, 16, 2.4) + 'Nova magia</button>' +
    '</div>' : '') +
    '</div>';

  var toolbar = '<div class="toolbar" style="margin-bottom:16px">' +
    '<input class="search list-search" type="search" id="spellSearch" placeholder="Buscar por nome, efeito ou pré-requisito…" value="' + esc(ui.q) + '" autocomplete="off" aria-label="Buscar magias">' +
    '<div class="field" style="margin:0"><select id="spellBookFilter" aria-label="Filtrar por livro">' +
    '<option value="">Todos os livros</option>' +
    spellBooks().map(function (b) { return '<option value="' + esc(b[0]) + '"' + (ui.book === b[0] ? ' selected' : '') + '>' + esc(b[0]) + ' (' + b[1] + ')</option>'; }).join('') +
    '</select></div>' +
    '<div class="field" style="margin:0"><select id="spellCollegeFilter" aria-label="Filtrar por escola">' +
    '<option value="">Todas as escolas (' + colleges.length + ')</option>' +
    colleges.map(function (c) { return '<option value="' + esc(c) + '"' + (ui.college === c ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') +
    '</select></div>' +
    '<div class="field" style="margin:0"><select id="spellClassFilter" aria-label="Filtrar por classe">' +
    '<option value="">Todas as classes</option>' +
    classes.map(function (cl) { return '<option value="' + esc(cl) + '"' + (ui.spellClass === cl ? ' selected' : '') + '>' + esc(cl) + '</option>'; }).join('') +
    '</select></div>' +
    '<div class="field" style="margin:0"><select id="spellResistFilter" aria-label="Filtrar por resistência">' +
    '<option value="">Todas as resistências</option>' +
    spellResistances().map(function (r) { return '<option value="' + r[0] + '"' + (ui.resistance === r[0] ? ' selected' : '') + '>' + esc(r[1]) + ' (' + r[2] + ')</option>'; }).join('') +
    '</select></div>' +
    '<div class="field" style="margin:0"><select id="spellDiffFilter" aria-label="Filtrar por dificuldade">' +
    '<option value="">Dificuldade (Todas)</option>' +
    '<option value="H"' + (ui.difficulty === 'H' ? ' selected' : '') + '>Hard (H)</option>' +
    '<option value="VH"' + (ui.difficulty === 'VH' ? ' selected' : '') + '>Very Hard (VH)</option>' +
    '</select></div>' +
    '<div class="field" style="margin:0"><select id="spellChangeFilter" aria-label="Filtrar por alterações do Mestre">' +
    '<option value="">Livros e Mestre</option>' +
    SPELL_CHANGE_FILTERS.filter(function (f) { return isMestre() || (f[0] !== 'hidden' && f[0] !== 'deleted'); })
      .map(function (f) { return '<option value="' + f[0] + '"' + (ui.change === f[0] ? ' selected' : '') + '>' + f[1] + '</option>'; }).join('') +
    '</select></div>' +
    '</div>';

  var body = notice() + '<div id="spellResults"></div>';

  pageRoot.innerHTML = head + toolbar + body;

  var qInput = $('spellSearch');
  if (qInput) {
    qInput.oninput = function () {
      ui.q = qInput.value;
      ui.page = 1;
      clearTimeout(spellSearchTimer);
      spellSearchTimer = setTimeout(renderSpellList, 150);
    };
  }

  var cFilter = $('spellCollegeFilter');
  if (cFilter) {
    cFilter.onchange = function () {
      ui.college = cFilter.value;
      ui.page = 1;
      renderSpellList();
    };
  }

  var clFilter = $('spellClassFilter');
  if (clFilter) {
    clFilter.onchange = function () {
      ui.spellClass = clFilter.value;
      ui.page = 1;
      renderSpellList();
    };
  }

  var rFilter = $('spellResistFilter');
  if (rFilter) rFilter.onchange = function () { ui.resistance = rFilter.value; ui.page = 1; renderSpellList(); };

  var dFilter = $('spellDiffFilter');
  if (dFilter) {
    dFilter.onchange = function () {
      ui.difficulty = dFilter.value;
      ui.page = 1;
      renderSpellList();
    };
  }

  var bFilter = $('spellBookFilter');
  if (bFilter) bFilter.onchange = function () { ui.book = bFilter.value; ui.page = 1; renderSpellList(); };
  var chFilter = $('spellChangeFilter');
  if (chFilter) chFilter.onchange = function () { ui.change = chFilter.value; ui.page = 1; renderSpellList(); };

  var nb = $('newSpellBtn');
  if (nb) {
    nb.onclick = function () { openSpellForm(null); };
  }

  renderSpellList();
}

function filterSpellsList() {
  var ui = spellView;
  var college = (ui.college || '').toLowerCase();
  var sClass = (ui.spellClass || '').toLowerCase();
  var diff = (ui.difficulty || '').toUpperCase();
  // Deleted entries are not in W.spells: only that filter lists them.
  var source = ui.change === 'deleted' ? CATALOG.spells.deleted : (W.spells || []);

  return searchCatalog(source.filter(function (s) {
    if (ui.change && ui.change !== 'deleted') {
      var k = spellChange(s);
      if (ui.change === 'any' ? !k : k !== ui.change) return false;
    }
    if (ui.book && (s.source || 'Sem livro') !== ui.book) return false;
    if (diff && (s.difficulty || '').toUpperCase() !== diff) return false;
    if (college && (s.college || '').toLowerCase().indexOf(college) < 0) return false;
    if (sClass && (s.class || '').toLowerCase().indexOf(sClass) < 0) return false;
    if (ui.resistance && spellResistance(s).indexOf(ui.resistance) < 0) return false;
    return true;
  }), ui.q, function (s) { return searchText(s, SPELL_SEARCH_FIELDS); }); // in name order (mergeCatalog); with a search, the most alike first
}

function renderSpellList() {
  var container = $('spellResults');
  if (!container) return;
  if (!W.loaded.spells) { container.innerHTML = '<p class="lede">Carregando magias…</p>'; return; }

  var all = filterSpellsList();
  var ui = spellView;
  var pg = pageOf(all, ui.page);
  ui.page = pg.page;
  var visible = pg.items;

  if (!all.length) {
    if (!(W.spells || []).length && !ui.change) {
      container.innerHTML = '<div class="empty-state">' + svg(ICON.spell, 34, 1.6) + '<strong>Nenhuma magia cadastrada</strong>' +
        '<span>' + (CATALOG.spells.failed ? 'Não foi possível carregar o grimório dos livros.' : isMestre() ? 'Crie uma com <b>Nova magia</b>.' : 'As magias vão aparecer aqui.') + '</span></div>';
      return;
    }

    container.innerHTML = '<p class="lede" style="padding:24px 0">' + (ui.change && !ui.q && !ui.book && !ui.college && !ui.spellClass && !ui.resistance && !ui.difficulty ? 'O Mestre ainda não fez alterações desse tipo.' : 'Nenhuma magia corresponde aos filtros aplicados.') + '</p>';
    return;
  }

  var countMeta = '<div class="list-bar"><span class="meta">' + pageCountText(pg, all.length, 'magia', 'magias') + '</span>' + pagerHtml(pg) + '</div>';

  var cards = '<div class="spell-grid">' +
    visible.map(function (s) {
      var isVH = (s.difficulty || '').toUpperCase() === 'VH';
      var diffBadge = '<span class="spell-badge ' + (isVH ? 'diff-vh' : 'diff-h') + '">' + esc(s.difficulty || 'H') + '</span>';
      var collegeTag = s.college ? '<span class="spell-tag college">' + esc(s.college) + '</span>' : '';
      var classTag = s.class ? '<span class="spell-tag sclass">' + esc(s.class) + '</span>' : '';

      var quickStats = [];
      if (s.timeToCast) quickStats.push('Tempo: ' + esc(s.timeToCast));
      // Some costs are a whole paragraph; the card shows the start.
      if (s.initialCost) quickStats.push('Custo: ' + esc(s.initialCost.length > 60 ? s.initialCost.slice(0, 57).trim() + '…' : s.initialCost));

      if (ui.change === 'deleted') {
        return '<div class="spell-card is-deleted"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px"><strong style="font-size:15px;line-height:1.3">' + esc(s.name) + '</strong>' + diffBadge + '</div>' +
          '<div style="display:flex;flex-wrap:wrap;gap:4px">' + collegeTag + '<span class="spell-tag mestre">Excluída pelo Mestre</span></div>' +
          '<div style="margin-top:auto"><button class="btn" type="button" data-restore="' + esc(s.id) + '">Restaurar</button></div></div>';
      }
      return '<a class="spell-card" href="' + spellHref(s.id) + '" style="background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:14px;text-decoration:none;color:inherit;display:flex;flex-direction:column;gap:8px;transition:border-color .15s,transform .15s">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">' +
        '<strong style="font-size:15px;line-height:1.3;color:var(--text)">' + esc(s.name) + '</strong>' +
        diffBadge +
        '</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:4px">' + collegeTag + classTag + spellChangeTag(s) + '</div>' +
        (quickStats.length ? '<div style="font-size:12px;color:var(--muted)">' + quickStats.join(' · ') + '</div>' : '') +
        (s.description ? '<div style="font-size:13px;line-height:1.4;color:var(--muted);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">' + esc(s.description) + '</div>' : '') +
        (s.page ? '<div style="font-size:11px;color:var(--faint);margin-top:auto">Pág. ' + esc(s.page) + '</div>' : '') +
        '</a>';
    }).join('') +
    '</div>';

  container.innerHTML = countMeta + cards + (pg.pages > 1 ? '<div class="list-bar end">' + pagerHtml(pg) + '</div>' : '');
  wirePager(container, function (p) { ui.page = p; renderSpellList(); });
  container.querySelectorAll('[data-restore]').forEach(function (b) {
    b.addEventListener('click', function () {
      var x = CATALOG.spells.idx && CATALOG.spells.idx[b.getAttribute('data-restore')]; if (!x) return;
      b.disabled = true;
      Ops.restoreCatalogItem('spells', x).then(function () { toast('Magia restaurada: ' + x.name + '.'); }, function (er) { b.disabled = false; toast(errorText(er), true); });
    });
  });
}

function renderSpellPage() {
  loadCatalog('spells');
  var s = spellById(S.route.spellId), ui = S.ui;
  if (s && s.id && s.id !== S.route.spellId) {
    go(spellHref(s.id), true);
    return;
  }
  if (!s) {
    pageRoot.innerHTML = crumbsHtml('spells') +
      (W.loaded.spells
        ? '<h1>Magia não encontrada</h1><p class="lede">Essa magia pode ter sido excluída ou o link está incorreto.</p><div><a class="btn" href="#magias">Voltar para Magias</a></div>'
        : '<p class="lede">Carregando magia…</p>');
    return;
  }

  var can = isMestre();
  var isVH = (s.difficulty || '').toUpperCase() === 'VH';

  var head = crumbsHtml('spell:' + s.id) +
    '<div class="head-row"><div>' +
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">' +
    '<span class="badge">' + svg(ICON.spell, 12, 2.4) + ' Magia</span>' +
    '<span class="spell-badge ' + (isVH ? 'diff-vh' : 'diff-h') + '">' + (isVH ? 'Very Hard (VH)' : 'Hard (H)') + '</span>' +
    '</div>' +
    '<h1>' + esc(s.name) + '</h1>' + ptNameHtml(s, 'p') +
    '<p class="lede">' + (s.college ? esc(s.college) : 'Sem escola') + (s.class ? ' · ' + esc(s.class) : '') + '</p>' +
    '</div>' +
    (can ? '<div class="btn-row">' + (s.catalog && rawHas('spells', s.id) ? '<button class="btn" type="button" id="restoreSpellBtn" title="Desfaz as alterações do Mestre nesta entrada">Restaurar original</button>' : '') + '<button class="btn" type="button" id="editSpellBtn">' + svg(ICON.edit, 15) + 'Editar magia</button><button class="btn danger" type="button" id="delSpellBtn">' + svg(ICON.trash, 15) + 'Excluir</button></div>' : '') +
    '</div>' +
    (ui.confirmDelete ? '<div class="confirm" role="alert"><span>Excluir a magia <b>' + esc(s.name) + '</b>? Não dá para desfazer.</span><div class="btn-row"><button class="btn danger solid" type="button" id="delSpellYes">Excluir magia</button><button class="btn ghost" type="button" id="delSpellNo">Cancelar</button></div></div>' : '');

  var main = '<section><h2 class="sec-title">Efeito e Descrição</h2>' +
    (s.description ? '<p class="long">' + esc(s.description) + '</p>' : '<p class="long none">Sem descrição cadastrada.</p>') +
    '</section>' +
    (s.item ? '<section><h2 class="sec-title">Item Mágico</h2><div class="box" style="margin:0"><p style="margin:0;font-size:14px;line-height:1.6">' + esc(s.item) + '</p></div></section>' : '') +
    (s.prerequisites ? '<section><h2 class="sec-title">Pré-requisitos</h2><div class="box" style="margin:0"><p style="margin:0;font-size:14px;line-height:1.6">' + esc(s.prerequisites) + '</p></div></section>' : '');

  // Open when the page opens; a click on its title closes it (see foldBox).
  var side = foldBox('params', 'Parâmetros', null, '<dl class="facts">' +
    '<dt>Escola / Colégio</dt><dd>' + (s.college ? esc(s.college) : '<span class="none">Não informado</span>') + '</dd>' +
    '<dt>Classe</dt><dd>' + (s.class ? esc(s.class) : '<span class="none">Não informado</span>') + '</dd>' +
    '<dt>Dificuldade</dt><dd>IQ/' + esc(s.difficulty || 'H') + '</dd>' +
    '<dt>Tempo de Conjuração</dt><dd>' + (s.timeToCast ? esc(s.timeToCast) : '<span class="none">—</span>') + '</dd>' +
    '<dt>Duração</dt><dd>' + (s.duration ? esc(s.duration) : '<span class="none">—</span>') + '</dd>' +
    // The books give casting and maintenance in one text; a separate maintenance cost appears only when filled in.
    '<dt>' + (s.maintenanceCost ? 'Custo Inicial' : 'Custo') + '</dt><dd>' + (s.initialCost ? esc(s.initialCost) : '<span class="none">—</span>') + '</dd>' +
    (s.maintenanceCost ? '<dt>Custo Manutenção</dt><dd>' + esc(s.maintenanceCost) + '</dd>' : '') +
    '<dt>Página</dt><dd>' + (s.page ? esc(s.page) : '<span class="none">—</span>') + '</dd>' +
    '<dt>Fonte</dt><dd>' + (s.source ? esc(s.source) : '<span class="none">—</span>') + '</dd>' +
    '</dl>', true);

  pageRoot.innerHTML = head + '<div class="loc-layout"><div class="side" style="gap:22px">' + main + '</div><div class="side">' + side + '</div></div>';
  wireFolds(pageRoot);

  if (can) {
    var eb = $('editSpellBtn'); if (eb) eb.onclick = function () { openSpellForm(s); };
    var db = $('delSpellBtn'); if (db) db.onclick = function () { ui.confirmDelete = true; renderSpellPage(); };
    var dn = $('delSpellNo'); if (dn) dn.onclick = function () { ui.confirmDelete = false; renderSpellPage(); };
    var dy = $('delSpellYes'); if (dy) dy.onclick = function () {
      dy.disabled = true;
      Ops.deleteSpell(s).then(function () {
        toast('Magia excluída.');
        go('#magias', true);
      }, function (er) {
        dy.disabled = false;
        toast(errorText(er), true);
      });
    };
    var rb = $('restoreSpellBtn'); if (rb) rb.onclick = function () {
      rb.disabled = true;
      Ops.restoreCatalogItem('spells', s).then(function () { toast('Magia restaurada como no livro.'); }, function (er) { rb.disabled = false; toast(errorText(er), true); });
    };
  }
}

function openSpellForm(s) {
  if (!isMestre()) {
    toast('Apenas o Mestre pode criar ou editar magias.', true);
    return;
  }

  var editing = !!s;
  var colleges = spellColleges();
  var classes = spellClasses();

  var html = '<form id="spellForm" novalidate><h2 id="sfTitle">' + (editing ? 'Editar magia' : 'Nova magia') + '</h2>' +
    '<div class="field" id="f_sname"><label for="sname">Nome da magia</label>' +
    '<input type="text" id="sname" maxlength="100" autocomplete="off" placeholder="Ex.: Fireball" value="' + esc(editing ? s.name : '') + '">' +
    '<div class="err" id="err_sname"></div></div>' +

    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
    '<div class="field"><label for="scollege">Escola / Colégio</label>' +
    '<input type="text" id="scollege" list="collegeList" maxlength="100" placeholder="Ex.: Fire, Air" value="' + esc(editing ? s.college || '' : '') + '">' +
    '<datalist id="collegeList">' + colleges.map(function (c) { return '<option value="' + esc(c) + '">'; }).join('') + '</datalist></div>' +

    '<div class="field"><label for="sclass">Classe</label>' +
    '<input type="text" id="sclass" list="classList" maxlength="80" placeholder="Ex.: Missile, Regular" value="' + esc(editing ? s.class || '' : '') + '">' +
    '<datalist id="classList">' + classes.map(function (cl) { return '<option value="' + esc(cl) + '">'; }).join('') + '</datalist></div>' +
    '</div>' +

    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
    '<div class="field"><label for="sdiff">Dificuldade</label>' +
    '<select id="sdiff">' +
    '<option value="H"' + (editing && s.difficulty === 'H' ? ' selected' : '') + '>Hard (H)</option>' +
    '<option value="VH"' + (editing && s.difficulty === 'VH' ? ' selected' : '') + '>Very Hard (VH)</option>' +
    '</select></div>' +

    '<div class="field"><label for="scast">Tempo de conjuração</label>' +
    '<input type="text" id="scast" maxlength="50" placeholder="Ex.: 1 sec., 1 hour" value="' + esc(editing ? s.timeToCast || '' : '') + '"></div>' +
    '</div>' +

    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
    '<div class="field"><label for="sdur">Duração</label>' +
    '<input type="text" id="sdur" maxlength="50" placeholder="Ex.: 1 min., Instantaneous" value="' + esc(editing ? s.duration || '' : '') + '"></div>' +

    '<div class="field"><label for="scost">Custo inicial</label>' +
    '<input type="text" id="scost" maxlength="2000" placeholder="Ex.: 2 to cast; 1 to maintain" value="' + esc(editing ? s.initialCost || '' : '') + '"></div>' +
    '</div>' +

    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
    '<div class="field"><label for="smaint">Custo de manutenção</label>' +
    '<input type="text" id="smaint" maxlength="500" placeholder="Ex.: 1, Half, Same, –" value="' + esc(editing ? s.maintenanceCost || '' : '') + '"></div>' +

    '<div class="field"><label for="spage">Página / Livro</label>' +
    '<input type="text" id="spage" maxlength="50" placeholder="Ex.: B246, M45" value="' + esc(editing ? s.page || '' : '') + '"></div>' +
    '</div>' +

    '<div class="field"><label for="sprereq">Pré-requisitos</label>' +
    '<input type="text" id="sprereq" maxlength="5000" placeholder="Ex.: Magery 1, Ignite Fire" value="' + esc(editing ? s.prerequisites || '' : '') + '"></div>' +

    '<div class="field"><label for="sitem">Item mágico</label>' +
    '<textarea id="sitem" rows="3" maxlength="5000" placeholder="Em que objetos a magia pode ser encantada e o custo de energia.">' + esc(editing ? s.item || '' : '') + '</textarea></div>' +

    '<div class="field"><label for="sdesc">Descrição / Efeito</label>' +
    '<textarea id="sdesc" rows="6" maxlength="20000" placeholder="Descreva o efeito mágico, dados de dano, testes resistidos…">' + esc(editing ? s.description || '' : '') + '</textarea></div>' +

    '<div class="field"><label for="ssource">Fonte / Livro de origem</label>' +
    '<input type="text" id="ssource" maxlength="100" placeholder="Ex.: Basic Set, GURPS Magic" value="' + esc(editing ? s.source || '' : '') + '"></div>' +

    flagHtml('svis', s, true) +

    '<div class="form-err" id="sfErr" role="alert"></div>' +
    '<div class="btn-row" style="justify-content:flex-end">' +
    '<button class="btn ghost" type="button" id="sfCancel">Cancelar</button>' +
    '<button class="btn primary" type="submit" id="sfSave">' + (editing ? 'Salvar magia' : 'Criar magia') + '</button>' +
    '</div></form>';

  showModal(html);
  modal.setAttribute('aria-labelledby', 'sfTitle');

  var name = $('sname');
  name.addEventListener('input', function () {
    if (name.value.trim()) {
      $('err_sname').textContent = '';
      $('f_sname').classList.remove('invalid');
    }
  });

  $('sfCancel').onclick = function () { closeModal(); };

  $('spellForm').onsubmit = function (e) {
    e.preventDefault();
    if (modalOpen.busy) return;

    var n = name.value.trim();
    if (!n) {
      $('err_sname').textContent = 'Informe o nome da magia.';
      $('f_sname').classList.add('invalid');
      name.focus();
      return;
    }

    modalOpen.busy = true;
    var btn = $('sfSave');
    btn.disabled = true;
    btn.textContent = 'Salvando…';
    $('sfCancel').disabled = true;
    $('sfErr').textContent = '';

    var fields = {
      name: n,
      college: $('scollege').value.trim(),
      class: $('sclass').value.trim(),
      difficulty: $('sdiff').value.trim(),
      timeToCast: $('scast').value.trim(),
      duration: $('sdur').value.trim(),
      initialCost: $('scost').value.trim(),
      maintenanceCost: $('smaint').value.trim(),
      prerequisites: $('sprereq').value.trim(),
      item: $('sitem').value.trim(),
      description: $('sdesc').value.trim(),
      page: $('spage').value.trim(),
      source: $('ssource').value.trim(),
      visible: flagVal('svis', s),
      sharedWith: shareVal('svis', s)
    };

    Ops.saveSpell(s, fields).then(function (id) {
      closeModal(true);
      toast(editing ? 'Magia salva.' : 'Magia criada.');
      if (!editing) go(spellHref(id));
    }, function (er) {
      if (!modalOpen) return;
      modalOpen.busy = false;
      btn.disabled = false;
      btn.textContent = editing ? 'Salvar magia' : 'Criar magia';
      $('sfCancel').disabled = false;
      $('sfErr').textContent = errorText(er);
    });
  };
}

