/* =====================================================================
   Hounds — Aba Itens (Regras › Itens)
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
// Typing in the search waits a moment before redrawing the list.
var itemSearchTimer = 0;
var ITEM_SEARCH_FIELDS = ['name', 'category', 'cost', 'description'];
// Search, filters and page of the list: kept while the site is open (see spellView).
var itemView = { q: '', mine: false, category: '', book: '', page: 1 };

/* =====================================================================
   Page: Itens (list)
   ===================================================================== */
function renderItemsPage() {
  loadCatalog('items');
  var ui = itemView, can = isMestre();
  var cats = itemValues('category'), books = itemValues('book');
  var head = crumbsHtml('items') +
    '<div class="head-row"><div><h1>' + svg(ICON.item, 24, 2) + ' Itens</h1>' +
    '<p class="lede">Equipamentos, ferramentas, poções e tesouros para GURPS 4ª Edição.</p></div>' +
    (can ? '<div class="btn-row">' +
      '<button class="btn primary" type="button" id="newItemBtn">' + svg(ICON.plus, 16, 2.4) + 'Novo item</button></div>' : '') +
    '</div>';
  var toolbar = '<div class="toolbar" style="margin-bottom:16px">' +
    '<input class="search list-search" type="search" id="itemSearch" placeholder="Buscar por nome, categoria ou descrição…" value="' + esc(ui.q) + '" autocomplete="off" aria-label="Buscar itens">' +
    '<div class="field" style="margin:0"><select id="itemCatFilter" aria-label="Filtrar por categoria"><option value="">Todas as categorias</option>' +
    cats.map(function (c) { return '<option value="' + esc(c) + '"' + (ui.category === c ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select></div>' +
    '<div class="field" style="margin:0"><select id="itemBookFilter" aria-label="Filtrar por livro"><option value="">Todos os livros</option>' +
    books.map(function (b) { return '<option value="' + esc(b) + '"' + (ui.book === b ? ' selected' : '') + '>' + esc(b) + '</option>'; }).join('') + '</select></div>' +
    mestreOnlyHtml(ui.mine) + '</div>';
  pageRoot.innerHTML = head + toolbar + notice() + '<div id="itemResults"></div>';

  var q = $('itemSearch'); if (q) q.oninput = function () { ui.q = q.value; ui.page = 1; clearTimeout(itemSearchTimer); itemSearchTimer = setTimeout(renderItemList, 150); };
  var cf = $('itemCatFilter'); if (cf) cf.onchange = function () { ui.category = cf.value; ui.page = 1; renderItemList(); };
  var bf = $('itemBookFilter'); if (bf) bf.onchange = function () { ui.book = bf.value; ui.page = 1; renderItemList(); };
  wireMestreOnly(ui, renderItemList);
  var nb = $('newItemBtn'); if (nb) nb.onclick = function () { openItemForm(null); };
  renderItemList();
}
function filterItemList() {
  var ui = itemView;
  return searchCatalog((W.items || []).filter(function (x) {
    if (ui.category && x.category !== ui.category) return false;
    if (ui.book && x.book !== ui.book) return false;
    if (ui.mine && x.catalog) return false;
    return true;
  }), ui.q, function (x) { return searchText(x, ITEM_SEARCH_FIELDS); }); // in name order (mergeCatalog); with a search, the most alike first
}
function renderItemList() {
  var el = $('itemResults'); if (!el) return;
  if (!W.loaded.items) { el.innerHTML = '<p class="lede">Carregando itens…</p>'; return; }
  var ui = itemView, all = filterItemList(), pg = pageOf(all, ui.page);
  ui.page = pg.page;
  if (!all.length) {
    if (!(W.items || []).length) {
      el.innerHTML = '<div class="empty-state">' + svg(ICON.item, 34, 1.6) + '<strong>Nenhum item cadastrado</strong>' +
        '<span>' + (CATALOG.items.failed ? 'Não foi possível carregar a lista dos livros.' : isMestre() ? 'Crie um com <b>Novo item</b>.' : 'Os itens vão aparecer aqui.') + '</span></div>';
      return;
    }
    el.innerHTML = '<p class="lede" style="padding:24px 0">Nenhum item corresponde aos filtros aplicados.</p>';
    return;
  }
  el.innerHTML = '<div class="list-bar"><span class="meta">' + pageCountText(pg, all.length, 'item', 'itens') + '</span>' + pagerHtml(pg) + '</div>' +
    '<div class="adv-grid">' + pg.items.map(function (x) {
      var tags = [x.weight, x.tl ? 'TL ' + x.tl : ''].filter(Boolean).join(' · ');
      return '<a class="spell-card adv-card" href="' + itemHref(x.id) + '">' +
        '<div class="adv-card-top"><strong>' + esc(x.name) + '</strong>' + (x.cost ? '<span class="spell-badge adv-adv">' + esc(x.cost) + '</span>' : '') + '</div>' +
        (tags ? '<div class="adv-cost">' + esc(tags) + '</div>' : '') +
        (x.description ? '<div class="adv-desc">' + esc(x.description) + '</div>' : '') +
        '<div class="adv-src">' + esc([x.category, x.book, x.page ? 'p. ' + x.page : ''].filter(Boolean).join(' · ')) + '</div></a>';
    }).join('') + '</div>' +
    (pg.pages > 1 ? '<div class="list-bar end">' + pagerHtml(pg) + '</div>' : '');
  wirePager(el, function (p) { ui.page = p; renderItemList(); });
}

/* =====================================================================
   Page: single item
   ===================================================================== */
function renderItemPage() {
  loadCatalog('items');
  var x = itemById(S.route.itemId), ui = S.ui;
  if (!x) {
    pageRoot.innerHTML = crumbsHtml('items') + (W.loaded.items
      ? '<h1>Item não encontrado</h1><p class="lede">Esse item pode ter sido excluído ou o link está incorreto.</p><div><a class="btn" href="#itens">Voltar para Itens</a></div>'
      : '<p class="lede">Carregando item…</p>');
    return;
  }
  var can = isMestre();
  var head = crumbsHtml('item:' + x.id) +
    '<div class="head-row"><div><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span class="badge">' + svg(ICON.item, 12, 2.4) + ' Item</span>' +
    (x.category ? '<span class="spell-badge adv-exp">' + esc(x.category) + '</span>' : '') + '</div>' +
    '<h1>' + esc(x.name) + '</h1>' + ptNameHtml(x, 'p') + '<p class="lede">' + esc([x.cost || 'Custo não informado', x.weight].filter(Boolean).join(' · ')) + '</p></div>' +
    (can ? '<div class="btn-row">' + (x.catalog && rawHas('items', x.id) ? '<button class="btn" type="button" id="restoreItemBtn" title="Desfaz as alterações do Mestre nesta entrada">Restaurar original</button>' : '') + '<button class="btn" type="button" id="editItemBtn">' + svg(ICON.edit, 15) + 'Editar item</button><button class="btn danger" type="button" id="delItemBtn">' + svg(ICON.trash, 15) + 'Excluir</button></div>' : '') +
    '</div>' +
    (ui.confirmDelete ? '<div class="confirm" role="alert"><span>Excluir o item <b>' + esc(x.name) + '</b>? Não dá para desfazer.</span><div class="btn-row"><button class="btn danger solid" type="button" id="delItemYes">Excluir item</button><button class="btn ghost" type="button" id="delItemNo">Cancelar</button></div></div>' : '');
  var main = '<section><h2 class="sec-title">Descrição</h2>' + (x.description ? '<p class="long">' + esc(x.description) + '</p>' : '<p class="long none">Sem descrição cadastrada.</p>') + '</section>';
  // Open when the page opens; a click on its title closes it (see foldBox).
  var side = foldBox('params', 'Parâmetros', null, '<dl class="facts">' + ITEM_FIELDS.map(function (f) {
    return '<dt>' + esc(f[1]) + '</dt><dd>' + (x[f[0]] ? esc(x[f[0]]) : '<span class="none">—</span>') + '</dd>';
  }).join('') + '</dl>', true);
  pageRoot.innerHTML = head + '<div class="loc-layout"><div class="side" style="gap:22px">' + main + '</div><div class="side">' + side + '</div></div>';
  wireFolds(pageRoot);
  if (!can) return;
  $('editItemBtn').onclick = function () { openItemForm(x); };
  $('delItemBtn').onclick = function () { ui.confirmDelete = true; renderItemPage(); };
  var dn = $('delItemNo'); if (dn) dn.onclick = function () { ui.confirmDelete = false; renderItemPage(); };
  var dy = $('delItemYes'); if (dy) dy.onclick = function () {
    dy.disabled = true;
    Ops.deleteItem(x).then(function () { toast('Item excluído.'); go('#itens', true); }, function (er) { dy.disabled = false; toast(errorText(er), true); });
  };
  var rb = $('restoreItemBtn'); if (rb) rb.onclick = function () {
    rb.disabled = true;
    Ops.restoreCatalogItem('items', x).then(function () { toast('Item restaurado como no livro.'); }, function (er) { rb.disabled = false; toast(errorText(er), true); });
  };
}

/* =====================================================================
   Form: item (Mestre)
   ===================================================================== */
function openItemForm(x) {
  if (!isMestre()) { toast('Apenas o Mestre pode criar ou editar itens.', true); return; }
  var editing = !!x;
  function val(k) { return esc(editing ? x[k] || '' : ''); }
  function input(f) {
    var list = f[0] === 'book' || f[0] === 'category' ? ' list="itemList_' + f[0] + '"' : '';
    return '<div class="field"><label for="it_' + f[0] + '">' + esc(f[1]) + '</label><input type="text" id="it_' + f[0] + '" maxlength="120"' + list + ' placeholder="' + esc(f[2]) + '" value="' + val(f[0]) + '"></div>';
  }
  function datalist(k) { return '<datalist id="itemList_' + k + '">' + itemValues(k).map(function (v) { return '<option value="' + esc(v) + '">'; }).join('') + '</datalist>'; }
  var html = '<form id="itemForm" novalidate><h2 id="itTitle">' + (editing ? 'Editar item' : 'Novo item') + '</h2>' +
    '<div class="field" id="f_itname"><label for="itname">Nome do item</label><input type="text" id="itname" maxlength="100" autocomplete="off" placeholder="Ex.: Backpack, Frame" value="' + val('name') + '"><div class="err" id="err_itname"></div></div>' +
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">' + ITEM_FIELDS.slice(0, 3).map(input).join('') + '</div>' +
    input(ITEM_FIELDS[3]) +
    '<div style="display:grid;grid-template-columns:2fr 1fr;gap:12px">' + ITEM_FIELDS.slice(4).map(input).join('') + '</div>' +
    datalist('book') + datalist('category') +
    '<div class="field"><label for="itdesc">Descrição</label><textarea id="itdesc" rows="6" maxlength="20000" placeholder="O que o item faz, capacidade, bônus…">' + val('description') + '</textarea></div>' +
    flagHtml('itvis', x, true) +
    '<div class="form-err" id="itErr" role="alert"></div>' +
    '<div class="btn-row" style="justify-content:flex-end"><button class="btn ghost" type="button" id="itCancel">Cancelar</button><button class="btn primary" type="submit" id="itSave">' + (editing ? 'Salvar item' : 'Criar item') + '</button></div></form>';
  showModal(html);
  modal.setAttribute('aria-labelledby', 'itTitle');
  var name = $('itname');
  name.addEventListener('input', function () { if (name.value.trim()) { $('err_itname').textContent = ''; $('f_itname').classList.remove('invalid'); } });
  $('itCancel').onclick = function () { closeModal(); };
  $('itemForm').onsubmit = function (e) {
    e.preventDefault();
    if (modalOpen.busy) return;
    var n = name.value.trim();
    if (!n) { $('err_itname').textContent = 'Informe o nome do item.'; $('f_itname').classList.add('invalid'); name.focus(); return; }
    var fields = /** @type {Record<string, any>} */ ({ name: n, description: $('itdesc').value, visible: flagVal('itvis', x), sharedWith: shareVal('itvis', x) });
    ITEM_FIELDS.forEach(function (f) { fields[f[0]] = $('it_' + f[0]).value; });
    modalOpen.busy = true;
    var btn = $('itSave'); btn.disabled = true; btn.textContent = 'Salvando…'; $('itCancel').disabled = true; $('itErr').textContent = '';
    Ops.saveItem(x, fields).then(function (id) {
      closeModal(true);
      toast(editing ? 'Item salvo.' : 'Item criado.');
      if (!editing) go(itemHref(id));
    }, function (er) {
      if (!modalOpen) return;
      modalOpen.busy = false; btn.disabled = false; btn.textContent = editing ? 'Salvar item' : 'Criar item'; $('itCancel').disabled = false;
      $('itErr').textContent = errorText(er);
    });
  };
}
