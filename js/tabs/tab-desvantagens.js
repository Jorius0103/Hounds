/* =====================================================================
   Hounds — Aba Desvantagens (Regras › Desvantagens)
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   Desvantagens de GURPS
   Desvantagens do Basic Set e as expansões dos outros livros (Martial
   Arts, Fantasy, Low-Tech...): vêm de dados/desvantagens.json (veja
   "Catálogos de GURPS" em mundo.js); o banco guarda só o que o Mestre
   mudou.
   Permissão:
     - Jogador: apenas busca e visualização.
     - Mestre: criar, editar, excluir e alternar visibilidade.
   ===================================================================== */
ICON.disadvantage = '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="m12 13-1-1 2-2-3-3 2-2"/>';
function indexDisadvantages() { var idx = /** @type {Record<string, Disadvantage>} */ ({}); (W.disadvantages || []).forEach(function (d) { idx[d.id] = d; }); W.disadvIdx = idx; }
function disadvById(id) { return (id && (W.disadvIdx[id] || movedCatalogItem('disadvantages', id))) || null; }
function disadvHref(id) { return hrefFor('disadv:' + id); }

// Values found in the list, for the filters and the form suggestions.
function disadvValues(field) {
  var set = {};
  (W.disadvantages || []).forEach(function (d) { if (d[field]) set[d[field]] = true; });
  return Object.keys(set).sort(function (a, b) { return a.localeCompare(b, 'pt'); });
}
// The list comes in English ("Cross-reference"); badges and filters show the type in Portuguese,
// with the advantages' colors (see advTypeClass).
function disadvTypeKey(t) {
  t = t || '';
  return /^Expans/i.test(t) ? 'exp' : /^(Cross|Remiss)/i.test(t) ? 'ref' : /^(Disadvantage|Desvantagem)$/i.test(t) || !t ? 'adv' : '';
}
var DISADV_TYPE_LABELS = { exp: 'Expansão', ref: 'Remissão', adv: 'Desvantagem' };
function disadvTypeLabel(t) { return DISADV_TYPE_LABELS[disadvTypeKey(t)] || t; }
function disadvTypeClass(t) { return 'adv-' + (disadvTypeKey(t) || 'adv'); }
// The classes of the books' icons, in their order; the entry keeps them in English ("Physical, Exotic").
var DISADV_CLASSES = ['Mental', 'Physical', 'Social', 'Exotic', 'Supernatural'];
var DISADV_CLASS_LABELS = { Mental: 'Mental', Physical: 'Física', Social: 'Social', Exotic: 'Exótica', Supernatural: 'Sobrenatural' };
function disadvClassList(d) { return String((d && d.classes) || '').split(',').map(function (c) { return c.trim(); }).filter(Boolean); }
function disadvClassText(d) { return disadvClassList(d).map(function (c) { return DISADV_CLASS_LABELS[c] || c; }).join(', '); }

Ops.saveDisadvantage = function (dis, fields) {
  if (!isMestre()) return Promise.reject({ message: 'Apenas o Mestre pode criar ou editar desvantagens.' });
  var t = now();
  return W.store.put('disadvantages', dis ? dis.id : null, {
    v: 1,
    name: (fields.name || '').trim(),
    cost: (fields.cost || '').trim(),
    type: (fields.type || '').trim() || 'Disadvantage',
    classes: (fields.classes || '').trim(),
    selfControl: !!fields.selfControl,
    book: (fields.book || '').trim(),
    page: (fields.page || '').trim(),
    description: (fields.description || '').trim(),
    visible: fields.visible !== false,
    sharedWith: fields.sharedWith || (dis && dis.sharedWith) || [],
    createdBy: owner(dis),
    createdAt: (dis && dis.createdAt) || t,
    updatedAt: t
  });
};
// A book disadvantage is not removed from the file: its document says deleted: true.
Ops.deleteDisadvantage = function (dis) {
  if (!isMestre()) return Promise.reject({ message: 'Apenas o Mestre pode excluir desvantagens.' });
  if (dis.catalog) return patchCatalogItem('disadvantages', dis, { deleted: true, updatedAt: now() });
  return W.store.remove('disadvantages', dis.id);
};
// Typing in the search waits a moment before redrawing the list.
var disadvSearchTimer = 0;
var DISADV_SEARCH_FIELDS = ['name', 'cost', 'type', 'classes', 'description'];
// Search, filters and page of the list: kept while the site is open (see spellView).
var disadvView = { q: '', type: '', cls: '', book: '', self: false, page: 1 };

/* =====================================================================
   Page: Desvantagens (list)
   ===================================================================== */
function renderDisadvantagesPage() {
  loadCatalog('disadvantages');
  var ui = disadvView, can = isMestre();
  var types = disadvValues('type'), books = disadvValues('book');
  var head = crumbsHtml('disadvs') +
    '<div class="head-row"><div><h1>' + svg(ICON.disadvantage, 24, 2) + ' Desvantagens</h1>' +
    '<p class="lede">Desvantagens para GURPS 4ª Edição.</p></div>' +
    (can ? '<div class="btn-row">' +
      '<button class="btn primary" type="button" id="newDisadvBtn">' + svg(ICON.plus, 16, 2.4) + 'Nova desvantagem</button></div>' : '') +
    '</div>';
  var toolbar = '<div class="toolbar" style="margin-bottom:16px">' +
    '<input class="search list-search" type="search" id="disadvSearch" placeholder="Buscar por nome, custo ou descrição…" value="' + esc(ui.q) + '" autocomplete="off" aria-label="Buscar desvantagens">' +
    '<div class="field" style="margin:0"><select id="disadvTypeFilter" aria-label="Filtrar por tipo"><option value="">Todos os tipos</option>' +
    types.map(function (t) { return '<option value="' + esc(t) + '"' + (ui.type === t ? ' selected' : '') + '>' + esc(disadvTypeLabel(t)) + '</option>'; }).join('') + '</select></div>' +
    '<div class="field" style="margin:0"><select id="disadvClassFilter" aria-label="Filtrar por classe"><option value="">Todas as classes</option>' +
    DISADV_CLASSES.map(function (c) { return '<option value="' + c + '"' + (ui.cls === c ? ' selected' : '') + '>' + DISADV_CLASS_LABELS[c] + '</option>'; }).join('') + '</select></div>' +
    '<div class="field" style="margin:0"><select id="disadvBookFilter" aria-label="Filtrar por livro"><option value="">Todos os livros</option>' +
    books.map(function (b) { return '<option value="' + esc(b) + '"' + (ui.book === b ? ' selected' : '') + '>' + esc(b) + '</option>'; }).join('') + '</select></div>' +
    '<label class="vis-flag" for="disadvSelfFilter" style="padding:8px 12px"><input type="checkbox" id="disadvSelfFilter"' + (ui.self ? ' checked' : '') + '><span><b>Com autocontrole</b></span></label>' +
    '</div>';
  pageRoot.innerHTML = head + toolbar + notice() + '<div id="disadvResults"></div>';

  var q = $('disadvSearch'); if (q) q.oninput = function () { ui.q = q.value; ui.page = 1; clearTimeout(disadvSearchTimer); disadvSearchTimer = setTimeout(renderDisadvList, 150); };
  var tf = $('disadvTypeFilter'); if (tf) tf.onchange = function () { ui.type = tf.value; ui.page = 1; renderDisadvList(); };
  var cf = $('disadvClassFilter'); if (cf) cf.onchange = function () { ui.cls = cf.value; ui.page = 1; renderDisadvList(); };
  var bf = $('disadvBookFilter'); if (bf) bf.onchange = function () { ui.book = bf.value; ui.page = 1; renderDisadvList(); };
  var sf = $('disadvSelfFilter'); if (sf) sf.onchange = function () { ui.self = sf.checked; ui.page = 1; renderDisadvList(); };
  var nb = $('newDisadvBtn'); if (nb) nb.onclick = function () { openDisadvantageForm(null); };
  renderDisadvList();
}
function filterDisadvList() {
  var ui = disadvView;
  return searchCatalog((W.disadvantages || []).filter(function (d) {
    if (ui.type && d.type !== ui.type) return false;
    if (ui.cls && disadvClassList(d).indexOf(ui.cls) < 0) return false;
    if (ui.book && d.book !== ui.book) return false;
    if (ui.self && !d.selfControl) return false;
    return true;
  }), ui.q, function (d) { return searchText(d, DISADV_SEARCH_FIELDS); }); // in name order (mergeCatalog); with a search, the most alike first
}
function renderDisadvList() {
  var el = $('disadvResults'); if (!el) return;
  if (!W.loaded.disadvantages) { el.innerHTML = '<p class="lede">Carregando desvantagens…</p>'; return; }
  var ui = disadvView, all = filterDisadvList(), pg = pageOf(all, ui.page);
  ui.page = pg.page;
  if (!all.length) {
    if (!(W.disadvantages || []).length) {
      el.innerHTML = '<div class="empty-state">' + svg(ICON.disadvantage, 34, 1.6) + '<strong>Nenhuma desvantagem cadastrada</strong>' +
        '<span>' + (CATALOG.disadvantages.failed ? 'Não foi possível carregar a lista dos livros.' : isMestre() ? 'Crie uma com <b>Nova desvantagem</b>.' : 'As desvantagens vão aparecer aqui.') + '</span></div>';
      return;
    }
    el.innerHTML = '<p class="lede" style="padding:24px 0">Nenhuma desvantagem corresponde aos filtros aplicados.</p>';
    return;
  }
  el.innerHTML = '<div class="list-bar"><span class="meta">' + pageCountText(pg, all.length, 'desvantagem', 'desvantagens') + '</span>' + pagerHtml(pg) + '</div>' +
    '<div class="adv-grid">' + pg.items.map(function (d) {
      var tags = [d.cost, disadvClassText(d), d.selfControl ? 'autocontrole' : ''].filter(Boolean).join(' · ');
      return '<a class="spell-card adv-card" href="' + disadvHref(d.id) + '">' +
        '<div class="adv-card-top"><strong>' + esc(d.name) + '</strong><span class="spell-badge ' + disadvTypeClass(d.type) + '">' + esc(disadvTypeLabel(d.type)) + '</span></div>' +
        (tags ? '<div class="adv-cost">' + esc(tags) + '</div>' : '') +
        (d.description ? '<div class="adv-desc">' + esc(d.description) + '</div>' : '') +
        '<div class="adv-src">' + esc([d.book, d.page ? 'p. ' + d.page : ''].filter(Boolean).join(' · ')) + '</div></a>';
    }).join('') + '</div>' +
    (pg.pages > 1 ? '<div class="list-bar end">' + pagerHtml(pg) + '</div>' : '');
  wirePager(el, function (p) { ui.page = p; renderDisadvList(); });
}

/* =====================================================================
   Page: single disadvantage
   ===================================================================== */
function renderDisadvantagePage() {
  loadCatalog('disadvantages');
  var d = disadvById(S.route.disadvId), ui = S.ui;
  if (!d) {
    pageRoot.innerHTML = crumbsHtml('disadvs') + (W.loaded.disadvantages
      ? '<h1>Desvantagem não encontrada</h1><p class="lede">Essa desvantagem pode ter sido excluída ou o link está incorreto.</p><div><a class="btn" href="#desvantagens">Voltar para Desvantagens</a></div>'
      : '<p class="lede">Carregando desvantagem…</p>');
    return;
  }
  var can = isMestre(), none = '<span class="none">—</span>';
  var head = crumbsHtml('disadv:' + d.id) +
    '<div class="head-row"><div><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span class="badge">' + svg(ICON.disadvantage, 12, 2.4) + ' Desvantagem</span>' +
    '<span class="spell-badge ' + disadvTypeClass(d.type) + '">' + esc(disadvTypeLabel(d.type)) + '</span></div>' +
    '<h1>' + esc(d.name) + '</h1>' + ptNameHtml(d, 'p') + '<p class="lede">' + (d.cost ? esc(d.cost) : 'Custo não informado') + (d.selfControl ? ' · teste de autocontrole' : '') + '</p></div>' +
    (can ? '<div class="btn-row">' + (d.catalog && rawHas('disadvantages', d.id) ? '<button class="btn" type="button" id="restoreDisadvBtn" title="Desfaz as alterações do Mestre nesta entrada">Restaurar original</button>' : '') + '<button class="btn" type="button" id="editDisadvBtn">' + svg(ICON.edit, 15) + 'Editar desvantagem</button><button class="btn danger" type="button" id="delDisadvBtn">' + svg(ICON.trash, 15) + 'Excluir</button></div>' : '') +
    '</div>' +
    (ui.confirmDelete ? '<div class="confirm" role="alert"><span>Excluir a desvantagem <b>' + esc(d.name) + '</b>? Não dá para desfazer.</span><div class="btn-row"><button class="btn danger solid" type="button" id="delDisadvYes">Excluir desvantagem</button><button class="btn ghost" type="button" id="delDisadvNo">Cancelar</button></div></div>' : '');
  var main = '<section><h2 class="sec-title">Descrição</h2>' + (d.description ? '<p class="long">' + esc(d.description) + '</p>' : '<p class="long none">Sem descrição cadastrada.</p>') + '</section>' + disadvEffectsHtml(d, 'h2');
  // Open when the page opens; a click on its title closes it (see foldBox).
  var side = foldBox('params', 'Parâmetros', null, '<dl class="facts">' +
    '<dt>Custo</dt><dd>' + (d.cost ? esc(d.cost) : none) + '</dd>' +
    '<dt>Tipo</dt><dd>' + (d.type ? esc(disadvTypeLabel(d.type)) + (disadvTypeLabel(d.type) !== d.type ? ' <span class="none">(' + esc(d.type) + ')</span>' : '') : none) + '</dd>' +
    '<dt>Classes</dt><dd>' + (d.classes ? esc(disadvClassText(d)) : none) + '</dd>' +
    '<dt>Autocontrole</dt><dd>' + (d.selfControl ? 'Sim' : 'Não') + '</dd>' +
    '<dt>Livro</dt><dd>' + (d.book ? esc(d.book) : none) + '</dd>' +
    '<dt>Página</dt><dd>' + (d.page ? esc(d.page) : none) + '</dd>' +
    '</dl>', true);
  pageRoot.innerHTML = head + '<div class="loc-layout"><div class="side" style="gap:22px">' + main + '</div><div class="side">' + side + '</div></div>';
  wireFolds(pageRoot);
  if (!can) return;
  $('editDisadvBtn').onclick = function () { openDisadvantageForm(d); };
  $('delDisadvBtn').onclick = function () { ui.confirmDelete = true; renderDisadvantagePage(); };
  var dn = $('delDisadvNo'); if (dn) dn.onclick = function () { ui.confirmDelete = false; renderDisadvantagePage(); };
  var dy = $('delDisadvYes'); if (dy) dy.onclick = function () {
    dy.disabled = true;
    Ops.deleteDisadvantage(d).then(function () { toast('Desvantagem excluída.'); go('#desvantagens', true); }, function (er) { dy.disabled = false; toast(errorText(er), true); });
  };
  var rb = $('restoreDisadvBtn'); if (rb) rb.onclick = function () {
    rb.disabled = true;
    Ops.restoreCatalogItem('disadvantages', d).then(function () { toast('Desvantagem restaurada como no livro.'); }, function (er) { rb.disabled = false; toast(errorText(er), true); });
  };
}

/* =====================================================================
   Form: disadvantage (Mestre)
   ===================================================================== */
function openDisadvantageForm(d) {
  if (!isMestre()) { toast('Apenas o Mestre pode criar ou editar desvantagens.', true); return; }
  var editing = !!d, cls = disadvClassList(d);
  function val(k) { return esc(editing ? d[k] || '' : ''); }
  function check(id, on, label) { return '<label class="vis-flag" for="' + id + '"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + '><span><b>' + label + '</b></span></label>'; }
  var html = '<form id="disadvForm" novalidate><h2 id="dfTitle">' + (editing ? 'Editar desvantagem' : 'Nova desvantagem') + '</h2>' +
    '<div class="field" id="f_dname"><label for="dname">Nome da desvantagem</label><input type="text" id="dname" maxlength="100" autocomplete="off" placeholder="Ex.: Bad Temper" value="' + val('name') + '"><div class="err" id="err_dname"></div></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
    '<div class="field"><label for="dcost">Custo</label><input type="text" id="dcost" maxlength="120" placeholder="Ex.: -10 points, Variable" value="' + val('cost') + '"></div>' +
    '<div class="field"><label for="dtype">Tipo</label><input type="text" id="dtype" list="disadvTypeList" maxlength="80" placeholder="Ex.: Disadvantage" value="' + (editing ? val('type') : 'Disadvantage') + '">' +
    '<datalist id="disadvTypeList">' + disadvValues('type').map(function (t) { return '<option value="' + esc(t) + '">'; }).join('') + '</datalist></div></div>' +
    '<div class="field" role="group" aria-labelledby="lab_dcls"><span class="lab" id="lab_dcls">Classes</span><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px">' +
    DISADV_CLASSES.map(function (c) { return check('dcls_' + c, cls.indexOf(c) >= 0, DISADV_CLASS_LABELS[c]); }).join('') + '</div></div>' +
    check('dself', editing && d.selfControl, 'Pede teste de autocontrole') +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">' +
    '<div class="field"><label for="dbook">Livro</label><input type="text" id="dbook" list="disadvBookList" maxlength="100" placeholder="Ex.: GURPS Basic Set" value="' + val('book') + '">' +
    '<datalist id="disadvBookList">' + disadvValues('book').map(function (b) { return '<option value="' + esc(b) + '">'; }).join('') + '</datalist></div>' +
    '<div class="field"><label for="dpage">Página</label><input type="text" id="dpage" maxlength="30" placeholder="Ex.: B124, MA53" value="' + val('page') + '"></div></div>' +
    '<div class="field"><label for="ddesc">Descrição</label><textarea id="ddesc" rows="6" maxlength="20000" placeholder="O que a desvantagem faz, níveis, autocontrole…">' + val('description') + '</textarea></div>' +
    flagHtml('dvis', d, true) +
    '<div class="form-err" id="dfErr" role="alert"></div>' +
    '<div class="btn-row" style="justify-content:flex-end"><button class="btn ghost" type="button" id="dfCancel">Cancelar</button><button class="btn primary" type="submit" id="dfSave">' + (editing ? 'Salvar desvantagem' : 'Criar desvantagem') + '</button></div></form>';
  showModal(html);
  modal.setAttribute('aria-labelledby', 'dfTitle');
  var name = $('dname');
  name.addEventListener('input', function () { if (name.value.trim()) { $('err_dname').textContent = ''; $('f_dname').classList.remove('invalid'); } });
  $('dfCancel').onclick = function () { closeModal(); };
  $('disadvForm').onsubmit = function (e) {
    e.preventDefault();
    if (modalOpen.busy) return;
    var n = name.value.trim();
    if (!n) { $('err_dname').textContent = 'Informe o nome da desvantagem.'; $('f_dname').classList.add('invalid'); name.focus(); return; }
    modalOpen.busy = true;
    var btn = $('dfSave'); btn.disabled = true; btn.textContent = 'Salvando…'; $('dfCancel').disabled = true; $('dfErr').textContent = '';
    var classes = DISADV_CLASSES.filter(function (c) { return $('dcls_' + c).checked; }).join(', ');
    Ops.saveDisadvantage(d, { name: n, cost: $('dcost').value, type: $('dtype').value, classes: classes, selfControl: $('dself').checked,
      book: $('dbook').value, page: $('dpage').value, description: $('ddesc').value,
      visible: flagVal('dvis', d), sharedWith: shareVal('dvis', d) }).then(function (id) {
      closeModal(true);
      toast(editing ? 'Desvantagem salva.' : 'Desvantagem criada.');
      if (!editing) go(disadvHref(id));
    }, function (er) {
      if (!modalOpen) return;
      modalOpen.busy = false; btn.disabled = false; btn.textContent = editing ? 'Salvar desvantagem' : 'Criar desvantagem'; $('dfCancel').disabled = false;
      $('dfErr').textContent = errorText(er);
    });
  };
}

// What the book says it takes from the sheet of who has it (DISADV_BOOK, in ficha-efeitos.js), for the
// version on the sheet; '' when nothing.
function disadvEffectsHtml(d, h) {
  var fx = disadvBookFx(d, { name: d.name, cost: 0, levels: 0 });
  if (!fx.length) return '';
  return '<section><' + h + ' class="sec-title">Efeitos na ficha (do livro)</' + h + '><ul class="fx-list">' + fx.map(function (e) {
    return '<li><b>' + esc(advEffectText(e)) + '</b></li>';
  }).join('') + '</ul><p class="hint-text">Lidos do texto da desvantagem e aplicados na ficha de quem a tem (os de uma versão mais forte, como Very Fat ou Shyness grave, seguem os pontos da ficha). ' +
    'Os que dependem do momento aparecem ao lado do campo, sem somar.</p></section>';
}
/* ---------- A disadvantage in a modal (from a sheet, like the advantages' openAdvModal) ---------- */
function openDisadvModal(id) {
  showModal('<div class="skill-modal" id="disadvModal"><p class="lede">Carregando desvantagem…</p></div>');
  function paint() {
    var box = $('disadvModal'); if (!box) return;
    var d = disadvById(id);
    if (!d) { box.innerHTML = '<h2>Desvantagem não encontrada</h2><p class="lede">Essa desvantagem pode ter sido excluída ou ocultada.</p>'; return; }
    var away = S.ui && sheetDraftOpen() ? ' target="_blank" rel="noopener"' : '';
    box.innerHTML = '<div class="skill-modal-head"><div style="display:flex;align-items:center;gap:8px"><span class="badge">' + svg(ICON.disadvantage, 12, 2.4) + ' Desvantagem</span>' +
      '<span class="spell-badge ' + disadvTypeClass(d.type) + '">' + esc(disadvTypeLabel(d.type)) + '</span></div>' +
      '<h2 id="disadvModalTitle">' + esc(d.name) + '</h2><p class="lede">' + (d.cost ? esc(d.cost) : 'Custo não informado') + (d.selfControl ? ' · teste de autocontrole' : '') + '</p></div>' +
      '<h3 class="sec-title">Descrição</h3>' + (d.description ? '<p class="long">' + esc(d.description) + '</p>' : '<p class="long none">Sem descrição cadastrada.</p>') +
      disadvEffectsHtml(d, 'h3') +
      '<p class="hint-text">' + esc([d.book, d.page ? 'p. ' + d.page : ''].filter(Boolean).join(' · ')) + '</p>' +
      '<div class="btn-row" style="justify-content:flex-end"><a class="btn" href="' + disadvHref(d.id) + '"' + away + ' id="disadvModalPage">Abrir página da desvantagem</a></div>';
    modal.setAttribute('aria-labelledby', 'disadvModalTitle');
    var pg = $('disadvModalPage'); if (pg && !away) pg.onclick = function () { closeModal(); };
  }
  loadCatalog('disadvantages').then(paint, paint);
}
document.addEventListener('click', function (e) {
  if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
  var t = /** @type {AnyEl} */ (e.target), a = t && t.closest && t.closest('[data-disadv-modal]'); if (!a) return;
  e.preventDefault(); openDisadvModal(a.getAttribute('data-disadv-modal'));
});
