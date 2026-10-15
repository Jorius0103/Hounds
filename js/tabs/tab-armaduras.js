/* =====================================================================
   Hounds — Aba Armaduras (Mundo › Armaduras)
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
// Typing in the search waits a moment before redrawing the list.
var armorSearchTimer = 0;
var ARMOR_SEARCH_FIELDS = ['name', 'location', 'category', 'table', 'skill', 'notes', 'footnotes'];
// Search, filters and page of the list: kept while the site is open (see spellView).
var armorView = { q: '', type: '', category: '', book: '', page: 1 };

/* =====================================================================
   Page: Armaduras (list)
   ===================================================================== */
function renderArmorsPage() {
  loadCatalog('armors');
  var ui = armorView, can = isMestre();
  var cats = armorValues('category'), books = armorValues('book');
  var head = crumbsHtml('armors') +
    '<div class="head-row"><div><h1>' + svg(ICON.armor, 24, 2) + ' Armaduras</h1>' +
    '<p class="lede">Armaduras, elmos, escudos e bardas para GURPS 4ª Edição.</p></div>' +
    (can ? '<div class="btn-row">' +
      '<button class="btn primary" type="button" id="newArmorBtn">' + svg(ICON.plus, 16, 2.4) + 'Nova armadura</button></div>' : '') +
    '</div>';
  var toolbar = '<div class="toolbar" style="margin-bottom:16px">' +
    '<input class="search list-search" type="search" id="armorSearch" placeholder="Buscar por nome, local ou notas…" value="' + esc(ui.q) + '" autocomplete="off" aria-label="Buscar armaduras">' +
    '<div class="field" style="margin:0"><select id="armorTypeFilter" aria-label="Filtrar por tipo"><option value="">Armaduras e escudos</option>' +
    Object.keys(ARMOR_TYPE_LABELS).map(function (t) { return '<option value="' + t + '"' + (ui.type === t ? ' selected' : '') + '>' + esc(ARMOR_TYPE_LABELS[t]) + '</option>'; }).join('') + '</select></div>' +
    '<div class="field" style="margin:0"><select id="armorCatFilter" aria-label="Filtrar por categoria"><option value="">Todas as categorias</option>' +
    cats.map(function (c) { return '<option value="' + esc(c) + '"' + (ui.category === c ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select></div>' +
    '<div class="field" style="margin:0"><select id="armorBookFilter" aria-label="Filtrar por livro"><option value="">Todos os livros</option>' +
    books.map(function (b) { return '<option value="' + esc(b) + '"' + (ui.book === b ? ' selected' : '') + '>' + esc(b) + '</option>'; }).join('') + '</select></div>' +
    '</div>';
  pageRoot.innerHTML = head + toolbar + notice() + '<div id="armorResults"></div>';

  var q = $('armorSearch'); if (q) q.oninput = function () { ui.q = q.value; ui.page = 1; clearTimeout(armorSearchTimer); armorSearchTimer = setTimeout(renderArmorList, 150); };
  var tf = $('armorTypeFilter'); if (tf) tf.onchange = function () { ui.type = tf.value; ui.page = 1; renderArmorList(); };
  var cf = $('armorCatFilter'); if (cf) cf.onchange = function () { ui.category = cf.value; ui.page = 1; renderArmorList(); };
  var bf = $('armorBookFilter'); if (bf) bf.onchange = function () { ui.book = bf.value; ui.page = 1; renderArmorList(); };
  var nb = $('newArmorBtn'); if (nb) nb.onclick = function () { openArmorForm(null); };
  renderArmorList();
}
function filterArmorList() {
  var ui = armorView;
  return searchCatalog((W.armors || []).filter(function (a) {
    if (ui.type && a.type !== ui.type) return false;
    if (ui.category && a.category !== ui.category) return false;
    if (ui.book && a.book !== ui.book) return false;
    return true;
  }), ui.q, function (a) { return searchText(a, ARMOR_SEARCH_FIELDS); }); // in name order (mergeCatalog); with a search, the most alike first
}
function renderArmorList() {
  var el = $('armorResults'); if (!el) return;
  if (!W.loaded.armors) { el.innerHTML = '<p class="lede">Carregando armaduras…</p>'; return; }
  var ui = armorView, all = filterArmorList(), pg = pageOf(all, ui.page);
  ui.page = pg.page;
  if (!all.length) {
    if (!(W.armors || []).length) {
      el.innerHTML = '<div class="empty-state">' + svg(ICON.armor, 34, 1.6) + '<strong>Nenhuma armadura cadastrada</strong>' +
        '<span>' + (CATALOG.armors.failed ? 'Não foi possível carregar a lista dos livros.' : isMestre() ? 'Crie uma com <b>Nova armadura</b>.' : 'As armaduras e os escudos vão aparecer aqui.') + '</span></div>';
      return;
    }
    el.innerHTML = '<p class="lede" style="padding:24px 0">Nenhuma armadura corresponde aos filtros aplicados.</p>';
    return;
  }
  el.innerHTML = '<div class="list-bar"><span class="meta">' + pageCountText(pg, all.length, 'armadura ou escudo', 'armaduras e escudos') + '</span>' + pagerHtml(pg) + '</div>' +
    '<div class="adv-grid">' + pg.items.map(function (a) {
      var sum = armorSummary(a), group = [a.table, a.category].filter(Boolean).join(' · ');
      return '<a class="spell-card adv-card" href="' + armorHref(a.id) + '">' +
        '<div class="adv-card-top"><strong>' + esc(a.name) + '</strong>' + armorBadge(a) + '</div>' +
        (sum ? '<div class="adv-cost">' + esc(sum) + '</div>' : '') +
        (group ? '<div class="adv-src">' + esc(group) + '</div>' : '') +
        '<div class="adv-src">' + esc([a.tl ? 'TL ' + a.tl : '', a.cost, a.weight ? a.weight + ' lb' : '', a.book, a.page ? 'p. ' + a.page : ''].filter(Boolean).join(' · ')) + '</div></a>';
    }).join('') + '</div>' +
    (pg.pages > 1 ? '<div class="list-bar end">' + pagerHtml(pg) + '</div>' : '');
  wirePager(el, function (p) { ui.page = p; renderArmorList(); });
}

/* =====================================================================
   Page: single armor or shield
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
function renderArmorPage() {
  loadCatalog('armors');
  var a = armorById(S.route.armorId), ui = S.ui;
  if (!a) {
    pageRoot.innerHTML = crumbsHtml('armors') + (W.loaded.armors
      ? '<h1>Armadura não encontrada</h1><p class="lede">Essa armadura pode ter sido excluída ou o link está incorreto.</p><div><a class="btn" href="#armaduras">Voltar para Armaduras</a></div>'
      : '<p class="lede">Carregando armadura…</p>');
    return;
  }
  var can = isMestre(), kind = a.type === 'Shield' ? 'escudo' : 'armadura', sum = armorSummary(a);
  var head = crumbsHtml('armor:' + a.id) +
    '<div class="head-row"><div><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span class="badge">' + svg(ICON.armor, 12, 2.4) + ' ' + esc(armorTypeLabel(a.type)) + '</span>' + armorBadge(a) + '</div>' +
    '<h1>' + esc(a.name) + '</h1>' + ptNameHtml(a, 'p') + '<p class="lede">' + (sum ? esc(sum) : 'Proteção não informada') + '</p></div>' +
    (can ? '<div class="btn-row">' + (a.catalog && rawHas('armors', a.id) ? '<button class="btn" type="button" id="restoreArmorBtn" title="Desfaz as alterações do Mestre nesta entrada">Restaurar original</button>' : '') + '<button class="btn" type="button" id="editArmorBtn">' + svg(ICON.edit, 15) + 'Editar ' + kind + '</button><button class="btn danger" type="button" id="delArmorBtn">' + svg(ICON.trash, 15) + 'Excluir</button></div>' : '') +
    '</div>' +
    (ui.confirmDelete ? '<div class="confirm" role="alert"><span>Excluir ' + (kind === 'escudo' ? 'o escudo' : 'a armadura') + ' <b>' + esc(a.name) + '</b>? Não dá para desfazer.</span><div class="btn-row"><button class="btn danger solid" type="button" id="delArmorYes">Excluir ' + kind + '</button><button class="btn ghost" type="button" id="delArmorNo">Cancelar</button></div></div>' : '');
  // The table's Notes column is mostly the numbers of the notes below it ("[1, 3]"): then the notes' text is what says something.
  var onlyRefs = /^[\s\d\[\],]*$/.test(a.notes || '');
  var notes = [onlyRefs ? '' : a.notes, a.footnotes].filter(Boolean).join('\n');
  var main = '<section><h2 class="sec-title">Notas</h2>' + (notes ? '<p class="long">' + esc(notes) + '</p>' : '<p class="long none">Sem notas.</p>') + '</section>';
  // Open when the page opens; a click on its title closes it (see foldBox).
  var side = foldBox('params', 'Parâmetros', null, armorFactsHtml(a), true);
  pageRoot.innerHTML = head + '<div class="loc-layout"><div class="side" style="gap:22px">' + main + '</div><div class="side">' + side + '</div></div>';
  wireFolds(pageRoot);
  if (!can) return;
  $('editArmorBtn').onclick = function () { openArmorForm(a); };
  $('delArmorBtn').onclick = function () { ui.confirmDelete = true; renderArmorPage(); };
  var dn = $('delArmorNo'); if (dn) dn.onclick = function () { ui.confirmDelete = false; renderArmorPage(); };
  var dy = $('delArmorYes'); if (dy) dy.onclick = function () {
    dy.disabled = true;
    Ops.deleteArmor(a).then(function () { toast(kind === 'escudo' ? 'Escudo excluído.' : 'Armadura excluída.'); go('#armaduras', true); }, function (er) { dy.disabled = false; toast(errorText(er), true); });
  };
  var rb = $('restoreArmorBtn'); if (rb) rb.onclick = function () {
    rb.disabled = true;
    Ops.restoreCatalogItem('armors', a).then(function () { toast('Restaurada como no livro.'); }, function (er) { rb.disabled = false; toast(errorText(er), true); });
  };
}

/* =====================================================================
   Form: armor or shield (Mestre)
   ===================================================================== */
function openArmorForm(a) {
  if (!isMestre()) { toast('Apenas o Mestre pode criar ou editar armaduras.', true); return; }
  var editing = !!a;
  function val(k) { return esc(editing ? a[k] || '' : ''); }
  function input(f) {
    var list = f[0] === 'book' || f[0] === 'category' || f[0] === 'table' ? ' list="armorList_' + f[0] + '"' : '';
    return '<div class="field"><label for="ar_' + f[0] + '">' + esc(f[1]) + '</label><input type="text" id="ar_' + f[0] + '" maxlength="120"' + list + ' placeholder="' + esc(f[2]) + '" value="' + val(f[0]) + '"></div>';
  }
  function datalist(k) { return '<datalist id="armorList_' + k + '">' + armorValues(k).map(function (v) { return '<option value="' + esc(v) + '">'; }).join('') + '</datalist>'; }
  var type = editing && a.type === 'Shield' ? 'Shield' : 'Armor';
  var html = '<form id="armorForm" novalidate><h2 id="arTitle">' + (editing ? 'Editar ' + (type === 'Shield' ? 'escudo' : 'armadura') : 'Nova armadura') + '</h2>' +
    '<div class="field" id="f_arname"><label for="arname">Nome</label><input type="text" id="arname" maxlength="100" autocomplete="off" placeholder="Ex.: Mail Hauberk" value="' + val('name') + '"><div class="err" id="err_arname"></div></div>' +
    '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">' +
    '<div class="field"><label for="artype">Tipo</label><select id="artype">' + Object.keys(ARMOR_TYPE_LABELS).map(function (t) { return '<option value="' + t + '"' + (type === t ? ' selected' : '') + '>' + esc(ARMOR_TYPE_LABELS[t]) + '</option>'; }).join('') + '</select></div>' +
    ARMOR_FIELDS.slice(0, 11).map(input).join('') + '</div>' +
    '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px">' + ARMOR_FIELDS.slice(11).map(input).join('') + '</div>' +
    datalist('book') + datalist('category') + datalist('table') +
    '<div class="field"><label for="ar_notes">Notas</label><input type="text" id="ar_notes" maxlength="300" placeholder="Ex.: [1, 3]" value="' + val('notes') + '"></div>' +
    '<div class="field"><label for="ar_footnotes">Notas da tabela</label><textarea id="ar_footnotes" rows="4" maxlength="10000" placeholder="[1] Split DR: use the first, higher DR against piercing and cutting attacks…">' + val('footnotes') + '</textarea></div>' +
    flagHtml('arvis', a, true) +
    '<div class="form-err" id="arErr" role="alert"></div>' +
    '<div class="btn-row" style="justify-content:flex-end"><button class="btn ghost" type="button" id="arCancel">Cancelar</button><button class="btn primary" type="submit" id="arSave">' + (editing ? 'Salvar' : 'Criar') + '</button></div></form>';
  showModal(html, function () { modal.classList.remove('modal-wide'); });
  modal.classList.add('modal-wide');
  modal.setAttribute('aria-labelledby', 'arTitle');
  var name = $('arname');
  name.addEventListener('input', function () { if (name.value.trim()) { $('err_arname').textContent = ''; $('f_arname').classList.remove('invalid'); } });
  $('arCancel').onclick = function () { closeModal(); };
  $('armorForm').onsubmit = function (e) {
    e.preventDefault();
    if (modalOpen.busy) return;
    var n = name.value.trim();
    if (!n) { $('err_arname').textContent = 'Informe o nome.'; $('f_arname').classList.add('invalid'); name.focus(); return; }
    var fields = /** @type {Record<string, any>} */ ({ name: n, type: $('artype').value, notes: $('ar_notes').value, footnotes: $('ar_footnotes').value,
      visible: flagVal('arvis', a), sharedWith: shareVal('arvis', a) });
    ARMOR_FIELDS.forEach(function (f) { fields[f[0]] = $('ar_' + f[0]).value; });
    modalOpen.busy = true;
    var btn = $('arSave'); btn.disabled = true; btn.textContent = 'Salvando…'; $('arCancel').disabled = true; $('arErr').textContent = '';
    var shield = fields.type === 'Shield';
    Ops.saveArmor(a, fields).then(function (id) {
      closeModal(true);
      toast(shield ? (editing ? 'Escudo salvo.' : 'Escudo criado.') : editing ? 'Armadura salva.' : 'Armadura criada.');
      if (!editing) go(armorHref(id));
    }, function (er) {
      if (!modalOpen) return;
      modalOpen.busy = false; btn.disabled = false; btn.textContent = editing ? 'Salvar' : 'Criar'; $('arCancel').disabled = false;
      $('arErr').textContent = errorText(er);
    });
  };
}
