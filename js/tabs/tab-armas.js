/* =====================================================================
   Hounds — Aba Armas (Mundo › Armas)
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
function weaponAttacksHtml(w) {
  var list = w.attacks || [];
  if (!list.length) return '<p class="long none">Sem ataques cadastrados.</p>';
  // Only the columns some attack fills.
  var cols = WEAPON_ATTACK_COLS.filter(function (c) { return list.some(function (a) { return a[c[0]]; }); });
  var hasMode = list.some(function (a) { return a.mode; }), hasNotes = list.some(function (a) { return a.notes; }), prev = null;
  return '<div class="wtab-wrap"><table class="gtab wtab"><thead><tr><th>Perícia</th>' + (hasMode ? '<th>Modo</th>' : '') +
    cols.map(function (c) { return '<th>' + c[1] + '</th>'; }).join('') + (hasNotes ? '<th>Notas</th>' : '') + '</tr></thead><tbody>' +
    list.map(function (a) {
      // The skill once for its run of attacks, with its defaults below.
      var same = prev && prev.skill === a.skill && prev.defaults === a.defaults;
      prev = a;
      return '<tr><td>' + (same ? '' : (a.skill ? '<b>' + esc(a.skill) + '</b>' : '<span class="none">—</span>') + (a.defaults ? '<small>' + esc(a.defaults) + '</small>' : '')) + '</td>' +
        (hasMode ? '<td class="wmode">' + esc(weaponModeText(a.mode)) + '</td>' : '') +
        cols.map(function (c) { return '<td>' + (a[c[0]] ? esc(a[c[0]]) : '<span class="none">—</span>') + '</td>'; }).join('') +
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
// Typing in the search waits a moment before redrawing the list.
var weaponSearchTimer = 0;
// Search text of a weapon: its own texts and those of its attacks, normalized once.
var weaponSearchCache = typeof WeakMap === 'function' ? new WeakMap() : null;
function weaponSearchText(w) {
  var hit = weaponSearchCache && weaponSearchCache.get(w);
  if (hit != null) return hit;
  var t = norm([w.name, w.description, w.footnotes].concat((w.attacks || []).map(function (a) { return [a.skill, a.damage, a.notes].join(' '); })).join(' '));
  if (weaponSearchCache) weaponSearchCache.set(w, t);
  return t;
}
// Search, filters and page of the list: kept while the site is open (see spellView).
var weaponView = { q: '', type: '', skill: '', book: '', page: 1 };

/* =====================================================================
   Page: Armas (list)
   ===================================================================== */
function renderWeaponsPage() {
  loadCatalog('weapons');
  var ui = weaponView, can = isMestre();
  var books = weaponValues('book'), skills = weaponSkillValues();
  var head = crumbsHtml('weapons') +
    '<div class="head-row"><div><h1>' + svg(ICON.weapon, 24, 2) + ' Armas</h1>' +
    '<p class="lede">Armas corpo a corpo e à distância para GURPS 4ª Edição.</p></div>' +
    (can ? '<div class="btn-row">' +
      '<button class="btn primary" type="button" id="newWeaponBtn">' + svg(ICON.plus, 16, 2.4) + 'Nova arma</button></div>' : '') +
    '</div>';
  var toolbar = '<div class="toolbar" style="margin-bottom:16px">' +
    '<input class="search list-search" type="search" id="weaponSearch" placeholder="Buscar por nome, perícia, dano ou descrição…" value="' + esc(ui.q) + '" autocomplete="off" aria-label="Buscar armas">' +
    '<div class="field" style="margin:0"><select id="weaponTypeFilter" aria-label="Filtrar por tipo"><option value="">Todos os tipos</option>' +
    Object.keys(WEAPON_TYPE_LABELS).map(function (t) { return '<option value="' + t + '"' + (ui.type === t ? ' selected' : '') + '>' + esc(WEAPON_TYPE_LABELS[t]) + '</option>'; }).join('') + '</select></div>' +
    '<div class="field" style="margin:0"><select id="weaponSkillFilter" aria-label="Filtrar por perícia"><option value="">Todas as perícias</option>' +
    skills.map(function (s) { return '<option value="' + esc(s) + '"' + (ui.skill === s ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('') + '</select></div>' +
    '<div class="field" style="margin:0"><select id="weaponBookFilter" aria-label="Filtrar por livro"><option value="">Todos os livros</option>' +
    books.map(function (b) { return '<option value="' + esc(b) + '"' + (ui.book === b ? ' selected' : '') + '>' + esc(b) + '</option>'; }).join('') + '</select></div>' +
    '</div>';
  pageRoot.innerHTML = head + toolbar + notice() + '<div id="weaponResults"></div>';

  var q = $('weaponSearch'); if (q) q.oninput = function () { ui.q = q.value; ui.page = 1; clearTimeout(weaponSearchTimer); weaponSearchTimer = setTimeout(renderWeaponList, 150); };
  var tf = $('weaponTypeFilter'); if (tf) tf.onchange = function () { ui.type = tf.value; ui.page = 1; renderWeaponList(); };
  var sf = $('weaponSkillFilter'); if (sf) sf.onchange = function () { ui.skill = sf.value; ui.page = 1; renderWeaponList(); };
  var bf = $('weaponBookFilter'); if (bf) bf.onchange = function () { ui.book = bf.value; ui.page = 1; renderWeaponList(); };
  var nb = $('newWeaponBtn'); if (nb) nb.onclick = function () { openWeaponForm(null); };
  renderWeaponList();
}
function filterWeaponList() {
  var ui = weaponView, q = norm(ui.q || '').trim();
  return (W.weapons || []).filter(function (w) {
    if (ui.type && w.type !== ui.type) return false;
    if (ui.skill && weaponSkills(w).indexOf(ui.skill) < 0) return false;
    if (ui.book && w.book !== ui.book) return false;
    return !q || weaponSearchText(w).indexOf(q) >= 0;
  }); // W.weapons is already in name order (mergeCatalog)
}
function renderWeaponList() {
  var el = $('weaponResults'); if (!el) return;
  if (!W.loaded.weapons) { el.innerHTML = '<p class="lede">Carregando armas…</p>'; return; }
  var ui = weaponView, all = filterWeaponList(), pg = pageOf(all, ui.page);
  ui.page = pg.page;
  if (!all.length) {
    if (!(W.weapons || []).length) {
      el.innerHTML = '<div class="empty-state">' + svg(ICON.weapon, 34, 1.6) + '<strong>Nenhuma arma cadastrada</strong>' +
        '<span>' + (CATALOG.weapons.failed ? 'Não foi possível carregar a lista dos livros.' : isMestre() ? 'Crie uma com <b>Nova arma</b>.' : 'As armas vão aparecer aqui.') + '</span></div>';
      return;
    }
    el.innerHTML = '<p class="lede" style="padding:24px 0">Nenhuma arma corresponde aos filtros aplicados.</p>';
    return;
  }
  el.innerHTML = '<div class="list-bar"><span class="meta">' + pageCountText(pg, all.length, 'arma', 'armas') + '</span>' + pagerHtml(pg) + '</div>' +
    '<div class="adv-grid">' + pg.items.map(function (w) {
      var sum = weaponSummary(w), skills = weaponSkills(w).join(', ');
      return '<a class="spell-card adv-card" href="' + weaponHref(w.id) + '">' +
        '<div class="adv-card-top"><strong>' + esc(w.name) + '</strong>' + weaponBadge(w) + '</div>' +
        (sum ? '<div class="adv-cost">' + esc(sum) + '</div>' : '') +
        (skills ? '<div class="adv-src">' + esc(skills) + '</div>' : '') +
        (w.description ? '<div class="adv-desc">' + esc(w.description) + '</div>' : '') +
        '<div class="adv-src">' + esc([w.tl ? 'TL ' + w.tl : '', w.cost, w.book, w.page ? 'p. ' + w.page : ''].filter(Boolean).join(' · ')) + '</div></a>';
    }).join('') + '</div>' +
    (pg.pages > 1 ? '<div class="list-bar end">' + pagerHtml(pg) + '</div>' : '');
  wirePager(el, function (p) { ui.page = p; renderWeaponList(); });
}

/* =====================================================================
   Page: single weapon
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
function renderWeaponPage() {
  loadCatalog('weapons');
  var w = weaponById(S.route.weaponId), ui = S.ui;
  if (!w) {
    pageRoot.innerHTML = crumbsHtml('weapons') + (W.loaded.weapons
      ? '<h1>Arma não encontrada</h1><p class="lede">Essa arma pode ter sido excluída ou o link está incorreto.</p><div><a class="btn" href="#armas">Voltar para Armas</a></div>'
      : '<p class="lede">Carregando arma…</p>');
    return;
  }
  var can = isMestre(), skills = weaponSkills(w);
  var head = crumbsHtml('weapon:' + w.id) +
    '<div class="head-row"><div><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span class="badge">' + svg(ICON.weapon, 12, 2.4) + ' Arma</span>' + weaponBadge(w) + '</div>' +
    '<h1>' + esc(w.name) + '</h1><p class="lede">' + (skills.length ? esc(skills.join(', ')) : 'Perícia não informada') + '</p></div>' +
    (can ? '<div class="btn-row">' + (w.catalog && rawHas('weapons', w.id) ? '<button class="btn" type="button" id="restoreWeaponBtn" title="Desfaz as alterações do Mestre nesta entrada">Restaurar original</button>' : '') + '<button class="btn" type="button" id="editWeaponBtn">' + svg(ICON.edit, 15) + 'Editar arma</button><button class="btn danger" type="button" id="delWeaponBtn">' + svg(ICON.trash, 15) + 'Excluir</button></div>' : '') +
    '</div>' +
    (ui.confirmDelete ? '<div class="confirm" role="alert"><span>Excluir a arma <b>' + esc(w.name) + '</b>? Não dá para desfazer.</span><div class="btn-row"><button class="btn danger solid" type="button" id="delWeaponYes">Excluir arma</button><button class="btn ghost" type="button" id="delWeaponNo">Cancelar</button></div></div>' : '');
  var main = '<section><h2 class="sec-title">Ataques</h2>' + weaponAttacksHtml(w) + '</section>' +
    '<section><h2 class="sec-title">Descrição</h2>' + (w.description ? '<p class="long">' + esc(w.description) + '</p>' : '<p class="long none">Sem descrição cadastrada.</p>') + '</section>' +
    (w.footnotes ? '<section><h2 class="sec-title">Notas da tabela</h2><p class="long">' + esc(w.footnotes) + '</p></section>' : '');
  // Open when the page opens; a click on its title closes it (see foldBox).
  var side = foldBox('params', 'Parâmetros', null, weaponFactsHtml(w), true);
  pageRoot.innerHTML = head + '<div class="loc-layout"><div class="side" style="gap:22px">' + main + '</div><div class="side">' + side + '</div></div>';
  wireFolds(pageRoot);
  if (!can) return;
  $('editWeaponBtn').onclick = function () { openWeaponForm(w); };
  $('delWeaponBtn').onclick = function () { ui.confirmDelete = true; renderWeaponPage(); };
  var dn = $('delWeaponNo'); if (dn) dn.onclick = function () { ui.confirmDelete = false; renderWeaponPage(); };
  var dy = $('delWeaponYes'); if (dy) dy.onclick = function () {
    dy.disabled = true;
    Ops.deleteWeapon(w).then(function () { toast('Arma excluída.'); go('#armas', true); }, function (er) { dy.disabled = false; toast(errorText(er), true); });
  };
  var rb = $('restoreWeaponBtn'); if (rb) rb.onclick = function () {
    rb.disabled = true;
    Ops.restoreCatalogItem('weapons', w).then(function () { toast('Arma restaurada como no livro.'); }, function (er) { rb.disabled = false; toast(errorText(er), true); });
  };
}

/* =====================================================================
   Form: weapon (Mestre)
   The attacks are rows of fields, one per line of the book's table; the
   fields follow the type (Reach and Parry, or Acc, Range, RoF...).
   ===================================================================== */
function openWeaponForm(w) {
  if (!isMestre()) { toast('Apenas o Mestre pode criar ou editar armas.', true); return; }
  var editing = !!w;
  function val(k) { return esc(editing ? w[k] || '' : ''); }
  // The attacks being edited (copies; fields the form doesn't show, like an attack's own cost, stay).
  var draft = editing && (w.attacks || []).length ? w.attacks.map(function (a) { return Object.assign({}, a); }) : [{ skill: '', damage: '' }];
  var type = editing && w.type === 'Ranged' ? 'Ranged' : 'Melee';
  var html = '<form id="weaponForm" novalidate><h2 id="wfTitle">' + (editing ? 'Editar arma' : 'Nova arma') + '</h2>' +
    '<div class="field" id="f_wname"><label for="wname">Nome da arma</label><input type="text" id="wname" maxlength="100" autocomplete="off" placeholder="Ex.: Broadsword" value="' + val('name') + '"><div class="err" id="err_wname"></div></div>' +
    '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">' +
    '<div class="field"><label for="wtype">Tipo</label><select id="wtype">' + Object.keys(WEAPON_TYPE_LABELS).map(function (t) { return '<option value="' + t + '"' + (type === t ? ' selected' : '') + '>' + esc(WEAPON_TYPE_LABELS[t]) + '</option>'; }).join('') + '</select></div>' +
    '<div class="field"><label for="wtl">TL</label><input type="text" id="wtl" maxlength="10" placeholder="Ex.: 2" value="' + val('tl') + '"></div>' +
    '<div class="field"><label for="wcost">Custo</label><input type="text" id="wcost" maxlength="40" placeholder="Ex.: $500" value="' + val('cost') + '"></div>' +
    '<div class="field"><label for="wweight">Peso</label><input type="text" id="wweight" maxlength="40" placeholder="Ex.: 3" value="' + val('weight') + '"></div></div>' +
    '<div class="field"><span class="lab">Ataques</span><div class="sc-rows" id="wAttacks"></div>' +
    '<div><button class="btn ghost" type="button" id="wAddAttack">' + svg(ICON.plus, 15, 2.4) + 'Adicionar ataque</button></div><div class="err" id="err_wattacks"></div>' +
    '<datalist id="weaponSkillList">' + weaponSkillValues().map(function (s) { return '<option value="' + esc(s) + '">'; }).join('') + '</datalist></div>' +
    '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">' +
    '<div class="field"><label for="wlc">CL</label><input type="text" id="wlc" maxlength="10" placeholder="Ex.: 4" value="' + val('lc') + '"></div>' +
    '<div class="field" style="grid-column:span 3"><label for="wtable">Tabela</label><input type="text" id="wtable" maxlength="120" placeholder="Ex.: Melee Weapon Table" value="' + val('table') + '"></div></div>' +
    '<div style="display:grid;grid-template-columns:3fr 1fr;gap:12px">' +
    '<div class="field"><label for="wbook">Livro</label><input type="text" id="wbook" list="weaponBookList" maxlength="100" placeholder="Ex.: GURPS Basic Set" value="' + val('book') + '">' +
    '<datalist id="weaponBookList">' + weaponValues('book').map(function (b) { return '<option value="' + esc(b) + '">'; }).join('') + '</datalist></div>' +
    '<div class="field"><label for="wpage">Página</label><input type="text" id="wpage" maxlength="30" placeholder="Ex.: B271" value="' + val('page') + '"></div></div>' +
    '<div class="field"><label for="wdesc">Descrição</label><textarea id="wdesc" rows="5" maxlength="20000" placeholder="O que é a arma, de onde vem, regras especiais…">' + val('description') + '</textarea></div>' +
    '<div class="field"><label for="wnotes">Notas da tabela</label><textarea id="wnotes" rows="3" maxlength="10000" placeholder="[1] Can be thrown…">' + val('footnotes') + '</textarea></div>' +
    flagHtml('wvis', w, true) +
    '<div class="form-err" id="wfErr" role="alert"></div>' +
    '<div class="btn-row" style="justify-content:flex-end"><button class="btn ghost" type="button" id="wfCancel">Cancelar</button><button class="btn primary" type="submit" id="wfSave">' + (editing ? 'Salvar arma' : 'Criar arma') + '</button></div></form>';
  showModal(html, function () { modal.classList.remove('modal-wide'); });
  modal.classList.add('modal-wide');
  modal.setAttribute('aria-labelledby', 'wfTitle');
  var box = $('wAttacks');
  function attackRow(a, i) {
    var at = ' data-i="' + i + '"';
    function input(f, label, ph, cls) {
      return '<label class="sc-f' + (cls ? ' ' + cls : '') + '"><span>' + label + '</span><input type="text" data-f="' + f + '"' + at + ' maxlength="80" value="' + esc(a[f] || '') + '" placeholder="' + esc(ph) + '"' + (f === 'skill' ? ' list="weaponSkillList"' : '') + '></label>';
    }
    return '<div class="sc-row">' + input('skill', 'Perícia', 'Broadsword', 'sc-name') + input('mode', 'Modo', i ? 'or' : '', 'wf-short') +
      WEAPON_FORM_COLS[type].map(function (f) { var c = WEAPON_ATTACK_COLS.filter(function (x) { return x[0] === f; })[0]; return input(f, c[2], c[3], f === 'damage' ? 'wf-dmg' : 'wf-short'); }).join('') +
      input('notes', 'Notas', '[1]', 'wf-notes') + input('defaults', 'Padrões', 'DX-5, Shortsword-2', 'sc-name') +
      '<button class="icon-btn" type="button" data-del="' + i + '" aria-label="Remover ataque" title="Remover">' + svg(ICON.x, 15, 2.4) + '</button></div>';
  }
  function paintAttacks() { box.innerHTML = draft.map(attackRow).join(''); }
  paintAttacks();
  box.addEventListener('input', function (e) {
    var t = /** @type {AnyEl} */ (e.target), i = t.getAttribute('data-i'), f = t.getAttribute('data-f');
    if (i != null && f && draft[+i]) draft[+i][f] = t.value;
  });
  box.addEventListener('click', function (e) {
    var t = /** @type {AnyEl} */ (e.target), b = t.closest && t.closest('[data-del]'); if (!b) return;
    draft.splice(+b.getAttribute('data-del'), 1);
    if (!draft.length) draft.push({ skill: '', damage: '' });
    paintAttacks();
  });
  $('wAddAttack').onclick = function () {
    var last = draft[draft.length - 1] || {};
    // A new attack usually uses the same skill as the one above it.
    draft.push({ skill: last.skill || '', defaults: last.defaults || '', mode: 'or', damage: '' });
    paintAttacks();
    var inputs = box.querySelectorAll('[data-f="damage"]'); if (inputs.length) /** @type {AnyEl} */ (inputs[inputs.length - 1]).focus();
  };
  $('wtype').onchange = function () { type = $('wtype').value === 'Ranged' ? 'Ranged' : 'Melee'; paintAttacks(); };
  var name = $('wname');
  name.addEventListener('input', function () { if (name.value.trim()) { $('err_wname').textContent = ''; $('f_wname').classList.remove('invalid'); } });
  $('wfCancel').onclick = function () { closeModal(); };
  $('weaponForm').onsubmit = function (e) {
    e.preventDefault();
    if (modalOpen.busy) return;
    var n = name.value.trim();
    if (!n) { $('err_wname').textContent = 'Informe o nome da arma.'; $('f_wname').classList.add('invalid'); name.focus(); return; }
    // The fields of the chosen type (and an attack's own cost and weight); an empty attack is left out.
    var keep = ['skill', 'defaults', 'mode', 'notes', 'cost', 'weight'].concat(WEAPON_FORM_COLS[type], type === 'Ranged' ? ['fuse'] : []);
    var attacks = draft.map(function (a) {
      var out = {};
      keep.forEach(function (k) { var v = String(a[k] || '').trim(); if (v) out[k] = v; });
      return out;
    }).filter(function (a) { return WEAPON_FORM_COLS[type].some(function (k) { return a[k]; }); });
    if (!attacks.length) { $('err_wattacks').textContent = 'Informe pelo menos um ataque (o dano, por exemplo).'; return; }
    $('err_wattacks').textContent = '';
    modalOpen.busy = true;
    var btn = $('wfSave'); btn.disabled = true; btn.textContent = 'Salvando…'; $('wfCancel').disabled = true; $('wfErr').textContent = '';
    Ops.saveWeapon(w, { name: n, type: type, tl: $('wtl').value, cost: $('wcost').value, weight: $('wweight').value, lc: $('wlc').value,
      table: $('wtable').value, book: $('wbook').value, page: $('wpage').value, description: $('wdesc').value, footnotes: $('wnotes').value,
      attacks: attacks, visible: flagVal('wvis', w), sharedWith: shareVal('wvis', w) }).then(function (id) {
      closeModal(true);
      toast(editing ? 'Arma salva.' : 'Arma criada.');
      if (!editing) go(weaponHref(id));
    }, function (er) {
      if (!modalOpen) return;
      modalOpen.busy = false; btn.disabled = false; btn.textContent = editing ? 'Salvar arma' : 'Criar arma'; $('wfCancel').disabled = false;
      $('wfErr').textContent = errorText(er);
    });
  };
}
