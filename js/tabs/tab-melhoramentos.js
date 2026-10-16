/* =====================================================================
   Hounds — Aba Melhoramentos (Mundo › Melhoramentos)
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
// Typing in the search waits a moment before redrawing the list.
var improvementSearchTimer = 0;
var IMPROVEMENT_SEARCH_FIELDS = ['name', 'category', 'restriction', 'cost', 'description'];
// Search, filters and page of the list: kept while the site is open (see spellView).
var improvementView = { q: '', kind: '', category: '', book: '', page: 1 };

/* =====================================================================
   Page: Melhoramentos (list)
   ===================================================================== */
function renderImprovementsPage() {
  loadCatalog('improvements');
  var ui = improvementView, can = isMestre();
  var kinds = improvementValues('appliesTo'), cats = improvementValues('category'), books = improvementValues('book');
  function select(id, label, all, values, cur) {
    return '<div class="field" style="margin:0"><select id="' + id + '" aria-label="' + esc(label) + '"><option value="">' + esc(all) + '</option>' +
      values.map(function (v) { return '<option value="' + esc(v) + '"' + (cur === v ? ' selected' : '') + '>' + esc(v) + '</option>'; }).join('') + '</select></div>';
  }
  var head = crumbsHtml('improvements') +
    '<div class="head-row"><div><h1>' + svg(ICON.improvement, 24, 2) + ' Melhoramentos</h1>' +
    '<p class="lede">Modificadores de armas, escudos, armaduras, roupas e equipamentos para GURPS 4ª Edição. O custo é o fator de custo (CF): o preço final é o de lista × (1 + a soma dos CF).</p></div>' +
    (can ? '<div class="btn-row">' +
      '<button class="btn primary" type="button" id="newImprovementBtn">' + svg(ICON.plus, 16, 2.4) + 'Novo melhoramento</button></div>' : '') +
    '</div>';
  var toolbar = '<div class="toolbar" style="margin-bottom:16px">' +
    '<input class="search list-search" type="search" id="improvementSearch" placeholder="Buscar por nome, categoria, restrição ou descrição…" value="' + esc(ui.q) + '" autocomplete="off" aria-label="Buscar melhoramentos">' +
    select('improvementKindFilter', 'Filtrar por tipo de equipamento', 'Todos os equipamentos', kinds, ui.kind) +
    select('improvementCatFilter', 'Filtrar por categoria', 'Todas as categorias', cats, ui.category) +
    select('improvementBookFilter', 'Filtrar por livro', 'Todos os livros', books, ui.book) +
    '</div>';
  pageRoot.innerHTML = head + toolbar + notice() + '<div id="improvementResults"></div>';

  var q = $('improvementSearch'); if (q) q.oninput = function () { ui.q = q.value; ui.page = 1; clearTimeout(improvementSearchTimer); improvementSearchTimer = setTimeout(renderImprovementList, 150); };
  var kf = $('improvementKindFilter'); if (kf) kf.onchange = function () { ui.kind = kf.value; ui.page = 1; renderImprovementList(); };
  var cf = $('improvementCatFilter'); if (cf) cf.onchange = function () { ui.category = cf.value; ui.page = 1; renderImprovementList(); };
  var bf = $('improvementBookFilter'); if (bf) bf.onchange = function () { ui.book = bf.value; ui.page = 1; renderImprovementList(); };
  var nb = $('newImprovementBtn'); if (nb) nb.onclick = function () { openImprovementForm(null); };
  renderImprovementList();
}
function filterImprovementList() {
  var ui = improvementView;
  return searchCatalog((W.improvements || []).filter(function (x) {
    if (ui.kind && x.appliesTo !== ui.kind) return false;
    if (ui.category && x.category !== ui.category) return false;
    if (ui.book && x.book !== ui.book) return false;
    return true;
  }), ui.q, function (x) { return searchText(x, IMPROVEMENT_SEARCH_FIELDS); }); // in name order (mergeCatalog); with a search, the most alike first
}
function renderImprovementList() {
  var el = $('improvementResults'); if (!el) return;
  if (!W.loaded.improvements) { el.innerHTML = '<p class="lede">Carregando melhoramentos…</p>'; return; }
  var ui = improvementView, all = filterImprovementList(), pg = pageOf(all, ui.page);
  ui.page = pg.page;
  if (!all.length) {
    if (!(W.improvements || []).length) {
      el.innerHTML = '<div class="empty-state">' + svg(ICON.improvement, 34, 1.6) + '<strong>Nenhum melhoramento cadastrado</strong>' +
        '<span>' + (CATALOG.improvements.failed ? 'Não foi possível carregar a lista dos livros.' : isMestre() ? 'Crie um com <b>Novo melhoramento</b>.' : 'Os melhoramentos vão aparecer aqui.') + '</span></div>';
      return;
    }
    el.innerHTML = '<p class="lede" style="padding:24px 0">Nenhum melhoramento corresponde aos filtros aplicados.</p>';
    return;
  }
  el.innerHTML = '<div class="list-bar"><span class="meta">' + pageCountText(pg, all.length, 'melhoramento', 'melhoramentos') + '</span>' + pagerHtml(pg) + '</div>' +
    '<div class="adv-grid">' + pg.items.map(function (x) {
      var tags = [x.appliesTo, x.weight ? 'Peso ' + x.weight : '', x.tl ? 'TL ' + x.tl : ''].filter(Boolean).join(' · ');
      return '<a class="spell-card adv-card" href="' + improvementHref(x.id) + '">' +
        '<div class="adv-card-top"><strong>' + esc(x.name) + '</strong>' + (x.cost ? '<span class="spell-badge adv-adv">' + esc(x.cost) + '</span>' : '') + '</div>' +
        (tags ? '<div class="adv-cost">' + esc(tags) + '</div>' : '') +
        (x.restriction ? '<div class="adv-cost">' + esc(x.restriction) + '</div>' : '') +
        (x.description ? '<div class="adv-desc">' + esc(x.description) + '</div>' : '') +
        '<div class="adv-src">' + esc([x.category, x.book, x.page ? 'p. ' + x.page : ''].filter(Boolean).join(' · ')) + '</div></a>';
    }).join('') + '</div>' +
    (pg.pages > 1 ? '<div class="list-bar end">' + pagerHtml(pg) + '</div>' : '');
  wirePager(el, function (p) { ui.page = p; renderImprovementList(); });
}

/* =====================================================================
   Page: single improvement
   ===================================================================== */
function renderImprovementPage() {
  loadCatalog('improvements');
  var x = improvementById(S.route.improvementId), ui = S.ui;
  if (!x) {
    pageRoot.innerHTML = crumbsHtml('improvements') + (W.loaded.improvements
      ? '<h1>Melhoramento não encontrado</h1><p class="lede">Esse melhoramento pode ter sido excluído ou o link está incorreto.</p><div><a class="btn" href="#melhoramentos">Voltar para Melhoramentos</a></div>'
      : '<p class="lede">Carregando melhoramento…</p>');
    return;
  }
  var can = isMestre();
  var head = crumbsHtml('impr:' + x.id) +
    '<div class="head-row"><div><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span class="badge">' + svg(ICON.improvement, 12, 2.4) + ' Melhoramento</span>' +
    (x.appliesTo ? '<span class="spell-badge adv-exp">' + esc(x.appliesTo) + '</span>' : '') + '</div>' +
    '<h1>' + esc(x.name) + '</h1>' + ptNameHtml(x, 'p') + '<p class="lede">' + esc([x.cost || 'Custo não informado', x.weight ? 'Peso ' + x.weight : ''].filter(Boolean).join(' · ')) + '</p></div>' +
    (can ? '<div class="btn-row">' + (x.catalog && rawHas('improvements', x.id) ? '<button class="btn" type="button" id="restoreImprovementBtn" title="Desfaz as alterações do Mestre nesta entrada">Restaurar original</button>' : '') + '<button class="btn" type="button" id="editImprovementBtn">' + svg(ICON.edit, 15) + 'Editar melhoramento</button><button class="btn danger" type="button" id="delImprovementBtn">' + svg(ICON.trash, 15) + 'Excluir</button></div>' : '') +
    '</div>' +
    (ui.confirmDelete ? '<div class="confirm" role="alert"><span>Excluir o melhoramento <b>' + esc(x.name) + '</b>? Não dá para desfazer.</span><div class="btn-row"><button class="btn danger solid" type="button" id="delImprovementYes">Excluir melhoramento</button><button class="btn ghost" type="button" id="delImprovementNo">Cancelar</button></div></div>' : '');
  var main = '<section><h2 class="sec-title">Descrição</h2>' + (x.description ? '<p class="long">' + esc(x.description) + '</p>' : '<p class="long none">Sem descrição cadastrada.</p>') + '</section>';
  // Open when the page opens; a click on its title closes it (see foldBox).
  var side = foldBox('params', 'Parâmetros', null, '<dl class="facts">' + IMPROVEMENT_FIELDS.map(function (f) {
    return '<dt>' + esc(f[1]) + '</dt><dd>' + (x[f[0]] ? esc(x[f[0]]) : '<span class="none">—</span>') + '</dd>';
  }).join('') + '</dl>', true);
  pageRoot.innerHTML = head + '<div class="loc-layout"><div class="side" style="gap:22px">' + main + '</div><div class="side">' + side + '</div></div>';
  wireFolds(pageRoot);
  if (!can) return;
  $('editImprovementBtn').onclick = function () { openImprovementForm(x); };
  $('delImprovementBtn').onclick = function () { ui.confirmDelete = true; renderImprovementPage(); };
  var dn = $('delImprovementNo'); if (dn) dn.onclick = function () { ui.confirmDelete = false; renderImprovementPage(); };
  var dy = $('delImprovementYes'); if (dy) dy.onclick = function () {
    dy.disabled = true;
    Ops.deleteImprovement(x).then(function () { toast('Melhoramento excluído.'); go('#melhoramentos', true); }, function (er) { dy.disabled = false; toast(errorText(er), true); });
  };
  var rb = $('restoreImprovementBtn'); if (rb) rb.onclick = function () {
    rb.disabled = true;
    Ops.restoreCatalogItem('improvements', x).then(function () { toast('Melhoramento restaurado como no livro.'); }, function (er) { rb.disabled = false; toast(errorText(er), true); });
  };
}

/* =====================================================================
   Form: improvement (Mestre)
   ===================================================================== */
function openImprovementForm(x) {
  if (!isMestre()) { toast('Apenas o Mestre pode criar ou editar melhoramentos.', true); return; }
  var editing = !!x;
  function val(k) { return esc(editing ? x[k] || '' : ''); }
  function input(f) {
    var list = f[0] === 'book' || f[0] === 'category' || f[0] === 'appliesTo' ? ' list="improvementList_' + f[0] + '"' : '';
    return '<div class="field"><label for="im_' + f[0] + '">' + esc(f[1]) + '</label><input type="text" id="im_' + f[0] + '" maxlength="' + (f[0] === 'restriction' ? 300 : 120) + '"' + list + ' placeholder="' + esc(f[2]) + '" value="' + val(f[0]) + '"></div>';
  }
  function datalist(k) { return '<datalist id="improvementList_' + k + '">' + improvementValues(k).map(function (v) { return '<option value="' + esc(v) + '">'; }).join('') + '</datalist>'; }
  var html = '<form id="improvementForm" novalidate><h2 id="imTitle">' + (editing ? 'Editar melhoramento' : 'Novo melhoramento') + '</h2>' +
    '<div class="field" id="f_imname"><label for="imname">Nome do melhoramento</label><input type="text" id="imname" maxlength="100" autocomplete="off" placeholder="Ex.: Balanced" value="' + val('name') + '"><div class="err" id="err_imname"></div></div>' +
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">' + IMPROVEMENT_FIELDS.slice(0, 3).map(input).join('') + '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 2fr;gap:12px">' + IMPROVEMENT_FIELDS.slice(3, 5).map(input).join('') + '</div>' +
    input(IMPROVEMENT_FIELDS[5]) +
    '<div style="display:grid;grid-template-columns:2fr 1fr;gap:12px">' + IMPROVEMENT_FIELDS.slice(6).map(input).join('') + '</div>' +
    datalist('appliesTo') + datalist('book') + datalist('category') +
    '<div class="field"><label for="imdesc">Descrição</label><textarea id="imdesc" rows="6" maxlength="20000" placeholder="O que o melhoramento faz, a que serve, os custos de cada caso…">' + val('description') + '</textarea></div>' +
    flagHtml('imvis', x, true) +
    '<div class="form-err" id="imErr" role="alert"></div>' +
    '<div class="btn-row" style="justify-content:flex-end"><button class="btn ghost" type="button" id="imCancel">Cancelar</button><button class="btn primary" type="submit" id="imSave">' + (editing ? 'Salvar melhoramento' : 'Criar melhoramento') + '</button></div></form>';
  showModal(html);
  modal.setAttribute('aria-labelledby', 'imTitle');
  var name = $('imname');
  name.addEventListener('input', function () { if (name.value.trim()) { $('err_imname').textContent = ''; $('f_imname').classList.remove('invalid'); } });
  $('imCancel').onclick = function () { closeModal(); };
  $('improvementForm').onsubmit = function (e) {
    e.preventDefault();
    if (modalOpen.busy) return;
    var n = name.value.trim();
    if (!n) { $('err_imname').textContent = 'Informe o nome do melhoramento.'; $('f_imname').classList.add('invalid'); name.focus(); return; }
    var fields = /** @type {Record<string, any>} */ ({ name: n, description: $('imdesc').value, visible: flagVal('imvis', x), sharedWith: shareVal('imvis', x) });
    IMPROVEMENT_FIELDS.forEach(function (f) { fields[f[0]] = $('im_' + f[0]).value; });
    modalOpen.busy = true;
    var btn = $('imSave'); btn.disabled = true; btn.textContent = 'Salvando…'; $('imCancel').disabled = true; $('imErr').textContent = '';
    Ops.saveImprovement(x, fields).then(function (id) {
      closeModal(true);
      toast(editing ? 'Melhoramento salvo.' : 'Melhoramento criado.');
      if (!editing) go(improvementHref(id));
    }, function (er) {
      if (!modalOpen) return;
      modalOpen.busy = false; btn.disabled = false; btn.textContent = editing ? 'Salvar melhoramento' : 'Criar melhoramento'; $('imCancel').disabled = false;
      $('imErr').textContent = errorText(er);
    });
  };
}
