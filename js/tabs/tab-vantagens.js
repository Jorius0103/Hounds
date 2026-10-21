/* =====================================================================
   Hounds — Aba Vantagens (Regras › Vantagens)
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   Vantagens de GURPS
   Vantagens, talentos e perks do Basic Set, Martial Arts, Fantasy,
   Gladiators e Low-Tech: vêm de dados/vantagens.json (veja "Catálogos
   de GURPS" em mundo.js); o banco guarda só o que o Mestre mudou.
   Permissão:
     - Jogador: apenas busca e visualização.
     - Mestre: criar, editar, excluir e alternar visibilidade.
   ===================================================================== */
ICON.advantage = '<path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"/><circle cx="12" cy="8" r="6"/>';
function indexAdvantages() { var idx = /** @type {Record<string, Advantage>} */ ({}); (W.advantages || []).forEach(function (a) { idx[a.id] = a; }); W.advIdx = idx; }
function advById(id) { return (id && (W.advIdx[id] || movedCatalogItem('advantages', id))) || null; }
function advHref(id) { return hrefFor('adv:' + id); }

// Values found in the list, for the filters and the form suggestions.
function advValues(field) {
  var set = {};
  (W.advantages || []).forEach(function (a) { if (a[field]) set[a[field]] = true; });
  return Object.keys(set).sort(function (a, b) { return a.localeCompare(b, 'pt'); });
}
// The list comes in English ("Cross-reference"); badges and filters show the type in Portuguese.
// "Expansion (Basic Set advantage)" is long for a badge.
function advTypeKey(t) {
  t = t || '';
  return /^Expans/i.test(t) ? 'exp' : /^Perk/i.test(t) ? 'perk' : /^Talent/i.test(t) ? 'talent' : /^(Cross|Remiss)/i.test(t) ? 'ref' : /^(Advantage|Vantagem)$/i.test(t) || !t ? 'adv' : '';
}
var ADV_TYPE_LABELS = { exp: 'Expansão', perk: 'Perk', talent: 'Talento', ref: 'Remissão', adv: 'Vantagem' };
function advTypeLabel(t) { return ADV_TYPE_LABELS[advTypeKey(t)] || t; }
function advTypeClass(t) { return 'adv-' + (advTypeKey(t) || 'adv'); }

Ops.saveAdvantage = function (adv, fields) {
  if (!isMestre()) return Promise.reject({ message: 'Apenas o Mestre pode criar ou editar vantagens.' });
  var t = now();
  return W.store.put('advantages', adv ? adv.id : null, {
    v: 1,
    name: (fields.name || '').trim(),
    cost: (fields.cost || '').trim(),
    type: (fields.type || '').trim() || 'Vantagem',
    book: (fields.book || '').trim(),
    page: (fields.page || '').trim(),
    description: (fields.description || '').trim(),
    // What it does on the sheets (see ficha-efeitos.js).
    effects: (fields.effects || (adv && adv.effects) || []).map(cleanAdvEffect).filter(advEffectOk),
    visible: fields.visible !== false,
    sharedWith: fields.sharedWith || (adv && adv.sharedWith) || [],
    createdBy: owner(adv),
    createdAt: (adv && adv.createdAt) || t,
    updatedAt: t
  });
};
// A book advantage is not removed from the file: its document says deleted: true.
Ops.deleteAdvantage = function (adv) {
  if (!isMestre()) return Promise.reject({ message: 'Apenas o Mestre pode excluir vantagens.' });
  if (adv.catalog) return patchCatalogItem('advantages', adv, { deleted: true, updatedAt: now() });
  return W.store.remove('advantages', adv.id);
};
// Typing in the search waits a moment before redrawing the list.
var advSearchTimer = 0;
var ADV_SEARCH_FIELDS = ['name', 'cost', 'type', 'description'];
// Search, filters and page of the list: kept while the site is open (see spellView).
var advView = { q: '', advType: '', advBook: '', page: 1 };

/* =====================================================================
   Page: Vantagens (list)
   ===================================================================== */
function renderAdvantagesPage() {
  loadCatalog('advantages');
  var ui = advView, can = isMestre();
  var types = advValues('type'), books = advValues('book');
  var head = crumbsHtml('advs') +
    '<div class="head-row"><div><h1>' + svg(ICON.advantage, 24, 2) + ' Vantagens</h1>' +
    '<p class="lede">Vantagens, talentos e perks para GURPS 4ª Edição.</p></div>' +
    (can ? '<div class="btn-row">' +
      '<button class="btn primary" type="button" id="newAdvBtn">' + svg(ICON.plus, 16, 2.4) + 'Nova vantagem</button></div>' : '') +
    '</div>';
  var toolbar = '<div class="toolbar" style="margin-bottom:16px">' +
    '<input class="search list-search" type="search" id="advSearch" placeholder="Buscar por nome, custo ou descrição…" value="' + esc(ui.q) + '" autocomplete="off" aria-label="Buscar vantagens">' +
    '<div class="field" style="margin:0"><select id="advTypeFilter" aria-label="Filtrar por tipo"><option value="">Todos os tipos</option>' +
    types.map(function (t) { return '<option value="' + esc(t) + '"' + (ui.advType === t ? ' selected' : '') + '>' + esc(advTypeLabel(t)) + '</option>'; }).join('') + '</select></div>' +
    '<div class="field" style="margin:0"><select id="advBookFilter" aria-label="Filtrar por livro"><option value="">Todos os livros</option>' +
    books.map(function (b) { return '<option value="' + esc(b) + '"' + (ui.advBook === b ? ' selected' : '') + '>' + esc(b) + '</option>'; }).join('') + '</select></div>' +
    '</div>';
  pageRoot.innerHTML = head + toolbar + notice() + '<div id="advResults"></div>';

  var q = $('advSearch'); if (q) q.oninput = function () { ui.q = q.value; ui.page = 1; clearTimeout(advSearchTimer); advSearchTimer = setTimeout(renderAdvList, 150); };
  var tf = $('advTypeFilter'); if (tf) tf.onchange = function () { ui.advType = tf.value; ui.page = 1; renderAdvList(); };
  var bf = $('advBookFilter'); if (bf) bf.onchange = function () { ui.advBook = bf.value; ui.page = 1; renderAdvList(); };
  var nb = $('newAdvBtn'); if (nb) nb.onclick = function () { openAdvantageForm(null); };
  renderAdvList();
}
function filterAdvList() {
  var ui = advView;
  return searchCatalog((W.advantages || []).filter(function (a) {
    if (ui.advType && a.type !== ui.advType) return false;
    if (ui.advBook && a.book !== ui.advBook) return false;
    return true;
  }), ui.q, function (a) { return searchText(a, ADV_SEARCH_FIELDS); }); // in name order (mergeCatalog); with a search, the most alike first
}
function renderAdvList() {
  var el = $('advResults'); if (!el) return;
  if (!W.loaded.advantages) { el.innerHTML = '<p class="lede">Carregando vantagens…</p>'; return; }
  var ui = advView, all = filterAdvList(), pg = pageOf(all, ui.page);
  ui.page = pg.page;
  if (!all.length) {
    if (!(W.advantages || []).length) {
      el.innerHTML = '<div class="empty-state">' + svg(ICON.advantage, 34, 1.6) + '<strong>Nenhuma vantagem cadastrada</strong>' +
        '<span>' + (CATALOG.advantages.failed ? 'Não foi possível carregar a lista dos livros.' : isMestre() ? 'Crie uma com <b>Nova vantagem</b>.' : 'As vantagens vão aparecer aqui.') + '</span></div>';
      return;
    }
    el.innerHTML = '<p class="lede" style="padding:24px 0">Nenhuma vantagem corresponde aos filtros aplicados.</p>';
    return;
  }
  el.innerHTML = '<div class="list-bar"><span class="meta">' + pageCountText(pg, all.length, 'vantagem', 'vantagens') + '</span>' + pagerHtml(pg) + '</div>' +
    '<div class="adv-grid">' + pg.items.map(function (a) {
      return '<a class="spell-card adv-card" href="' + advHref(a.id) + '">' +
        '<div class="adv-card-top"><strong>' + esc(a.name) + '</strong><span class="spell-badge ' + advTypeClass(a.type) + '">' + esc(advTypeLabel(a.type)) + '</span></div>' +
        (a.cost ? '<div class="adv-cost">' + esc(a.cost) + '</div>' : '') +
        (a.description ? '<div class="adv-desc">' + esc(a.description) + '</div>' : '') +
        '<div class="adv-src">' + esc([a.book, a.page ? 'p. ' + a.page : ''].filter(Boolean).join(' · ')) + '</div></a>';
    }).join('') + '</div>' +
    (pg.pages > 1 ? '<div class="list-bar end">' + pagerHtml(pg) + '</div>' : '');
  wirePager(el, function (p) { ui.page = p; renderAdvList(); });
}

/* =====================================================================
   Page: single advantage
   ===================================================================== */
function renderAdvantagePage() {
  loadCatalog('advantages');
  var a = advById(S.route.advId), ui = S.ui;
  if (!a) {
    pageRoot.innerHTML = crumbsHtml('advs') + (W.loaded.advantages
      ? '<h1>Vantagem não encontrada</h1><p class="lede">Essa vantagem pode ter sido excluída ou o link está incorreto.</p><div><a class="btn" href="#vantagens">Voltar para Vantagens</a></div>'
      : '<p class="lede">Carregando vantagem…</p>');
    return;
  }
  var can = isMestre();
  var head = crumbsHtml('adv:' + a.id) +
    '<div class="head-row"><div><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span class="badge">' + svg(ICON.advantage, 12, 2.4) + ' Vantagem</span>' +
    '<span class="spell-badge ' + advTypeClass(a.type) + '">' + esc(advTypeLabel(a.type)) + '</span></div>' +
    '<h1>' + esc(a.name) + '</h1>' + ptNameHtml(a, 'p') + '<p class="lede">' + (a.cost ? esc(a.cost) : 'Custo não informado') + '</p></div>' +
    (can ? '<div class="btn-row">' + (a.catalog && rawHas('advantages', a.id) ? '<button class="btn" type="button" id="restoreAdvBtn" title="Desfaz as alterações do Mestre nesta entrada">Restaurar original</button>' : '') + '<button class="btn" type="button" id="editAdvBtn">' + svg(ICON.edit, 15) + 'Editar vantagem</button><button class="btn danger" type="button" id="delAdvBtn">' + svg(ICON.trash, 15) + 'Excluir</button></div>' : '') +
    '</div>' +
    (ui.confirmDelete ? '<div class="confirm" role="alert"><span>Excluir a vantagem <b>' + esc(a.name) + '</b>? Não dá para desfazer.</span><div class="btn-row"><button class="btn danger solid" type="button" id="delAdvYes">Excluir vantagem</button><button class="btn ghost" type="button" id="delAdvNo">Cancelar</button></div></div>' : '');
  var main = '<section><h2 class="sec-title">Descrição</h2>' + (a.description ? '<p class="long">' + esc(a.description) + '</p>' : '<p class="long none">Sem descrição cadastrada.</p>') + '</section>' +
    advEffectsHtml(a, can, 'h2');
  // Open when the page opens; a click on its title closes it (see foldBox).
  var side = foldBox('params', 'Parâmetros', null, '<dl class="facts">' +
    '<dt>Custo</dt><dd>' + (a.cost ? esc(a.cost) : '<span class="none">—</span>') + '</dd>' +
    '<dt>Tipo</dt><dd>' + (a.type ? esc(advTypeLabel(a.type)) + (advTypeLabel(a.type) !== a.type ? ' <span class="none">(' + esc(a.type) + ')</span>' : '') : '<span class="none">—</span>') + '</dd>' +
    '<dt>Livro</dt><dd>' + (a.book ? esc(a.book) : '<span class="none">—</span>') + '</dd>' +
    '<dt>Página</dt><dd>' + (a.page ? esc(a.page) : '<span class="none">—</span>') + '</dd>' +
    '</dl>', true);
  pageRoot.innerHTML = head + '<div class="loc-layout"><div class="side" style="gap:22px">' + main + '</div><div class="side">' + side + '</div></div>';
  wireFolds(pageRoot);
  if (!can) return;
  $('editAdvBtn').onclick = function () { openAdvantageForm(a); };
  $('delAdvBtn').onclick = function () { ui.confirmDelete = true; renderAdvantagePage(); };
  var dn = $('delAdvNo'); if (dn) dn.onclick = function () { ui.confirmDelete = false; renderAdvantagePage(); };
  var dy = $('delAdvYes'); if (dy) dy.onclick = function () {
    dy.disabled = true;
    Ops.deleteAdvantage(a).then(function () { toast('Vantagem excluída.'); go('#vantagens', true); }, function (er) { dy.disabled = false; toast(errorText(er), true); });
  };
  var rb = $('restoreAdvBtn'); if (rb) rb.onclick = function () {
    rb.disabled = true;
    Ops.restoreCatalogItem('advantages', a).then(function () { toast('Vantagem restaurada como no livro.'); }, function (er) { rb.disabled = false; toast(errorText(er), true); });
  };
}

/* ---------- effects (see ficha-efeitos.js) ---------- */
// The effects of an entry, for its page and modal: a list, or nothing (the Mestre sees how to add them).
function advEffectsHtml(a, can, h) {
  var fx = advEffects(a);
  // Without the Mestre's, the sheet uses the book's (ADV_BOOK, in ficha-efeitos.js), for the version on the sheet.
  var book = fx.length ? [] : advBookFx(a, { name: a.name, pts: 0 });
  if (book.length) return '<section><' + h + ' class="sec-title">Efeitos na ficha (do livro)</' + h + '><ul class="fx-list">' + book.map(function (e) {
    return '<li><b>' + esc(advEffectText(e)) + '</b></li>';
  }).join('') + '</ul><p class="hint-text">Lidos do texto da vantagem e aplicados na ficha de quem a tem (os de uma versão maior, como Very Fit, seguem os pontos da ficha). ' +
    'Os que dependem do momento aparecem ao lado do campo, sem somar.' + (can ? ' Cadastrar efeitos em <b>Editar vantagem</b> troca estes.' : '') + '</p></section>';
  if (!fx.length) return can ? '<section><' + h + ' class="sec-title">Efeitos na ficha</' + h + '><p class="long none">Nenhum efeito cadastrado. Use <b>Editar vantagem</b> para dizer o que ela soma na ficha.</p></section>' : '';
  return '<section><' + h + ' class="sec-title">Efeitos na ficha</' + h + '><ul class="fx-list">' + fx.map(function (e) {
    return '<li><b>' + esc(advEffectText(e)) + '</b>' + (e.note ? '<small>' + esc(e.note) + '</small>' : '') + '</li>';
  }).join('') + '</ul>' + (ADV_FX_BUILTIN_RE.test(a.name) ? '<p class="hint-text">A ficha já aplica esta vantagem sozinha; estes efeitos não são somados.</p>' : '') + '</section>';
}
function advFxEditRow(e, i) {
  var keys = advFxKeys(e.target);
  function opt(list, v) { return list.map(function (x) { return '<option value="' + esc(x[0]) + '"' + (x[0] === v ? ' selected' : '') + '>' + esc(x[1]) + '</option>'; }).join(''); }
  var ph = { skill: 'Perícias. Ex.: Judo, Karate, Sumo Wrestling', spell: 'Magias. Ex.: Fireball, Ignite Fire', college: 'Escolas. Ex.: Fire, Water' }[e.target];
  return '<div class="fx-row" data-n="' + i + '"><div class="fx-line">' +
    '<select data-x="target" aria-label="Alvo do efeito ' + (i + 1) + '">' + opt(ADV_FX_TARGETS, e.target) + '</select>' +
    (keys.length ? '<select data-x="key" aria-label="Campo">' + opt(keys, e.key) + '</select>'
      : ph ? '<input type="text" data-x="names" maxlength="1000" placeholder="' + esc(ph) + '" aria-label="Nomes" value="' + esc(e.names.join(', ')) + '">' : '<span class="fx-all"></span>') +
    '<select data-x="op" aria-label="Operação"><option value="add"' + (e.op === 'add' ? ' selected' : '') + '>+ soma</option><option value="sub"' + (e.op === 'sub' ? ' selected' : '') + '>− tira</option></select>' +
    '<input type="number" data-x="value" min="0" max="99" step="1" inputmode="numeric" aria-label="Valor" title="Valor" value="' + e.value + '">' +
    '<input type="number" data-x="max" min="0" max="99" step="1" inputmode="numeric" placeholder="máx." aria-label="Máximo (vazio: sem limite)" title="Máximo (vazio: sem limite)" value="' + (e.max == null ? '' : e.max) + '">' +
    '<label class="fx-chk" title="O valor vale para cada nível da vantagem"><input type="checkbox" data-x="perLevel"' + (e.perLevel ? ' checked' : '') + '>por nível</label>' +
    '<label class="fx-chk" title="Soma com os outros efeitos no mesmo campo; sem marcar, só o maior vale"><input type="checkbox" data-x="stacks"' + (e.stacks ? ' checked' : '') + '>acumula</label>' +
    '<button class="icon-btn" type="button" data-xdel="' + i + '" aria-label="Remover efeito ' + (i + 1) + '" title="Remover">' + svg(ICON.x, 15, 2.4) + '</button></div>' +
    '<div class="fx-line2"><input type="text" data-x="cond" maxlength="200" placeholder="Condição (opcional). Ex.: ao resistir a venenos" aria-label="Condição" value="' + esc(e.cond) + '">' +
    '<input type="text" data-x="note" maxlength="300" placeholder="Descrição do efeito (opcional)" aria-label="Descrição do efeito" value="' + esc(e.note) + '"></div></div>';
}
// A row of the editor as it is now (not cleaned: cleanAdvEffect does that on save).
function advFxReadRow(row) {
  function v(k) { var el = row.querySelector('[data-x="' + k + '"]'); return el ? el.value : ''; }
  function on(k) { var el = row.querySelector('[data-x="' + k + '"]'); return !!(el && el.checked); }
  return { target: v('target'), key: v('key'), names: v('names'), op: v('op'), value: v('value'), max: v('max'), perLevel: on('perLevel'), stacks: on('stacks'),
    cond: v('cond'), note: v('note') };
}

/* =====================================================================
   Form: advantage (Mestre)
   ===================================================================== */
function openAdvantageForm(a) {
  if (!isMestre()) { toast('Apenas o Mestre pode criar ou editar vantagens.', true); return; }
  var editing = !!a;
  function val(k) { return esc(editing ? a[k] || '' : ''); }
  var html = '<form id="advForm" novalidate><h2 id="afTitle">' + (editing ? 'Editar vantagem' : 'Nova vantagem') + '</h2>' +
    '<div class="field" id="f_aname"><label for="aname">Nome da vantagem</label><input type="text" id="aname" maxlength="100" autocomplete="off" placeholder="Ex.: Combat Reflexes" value="' + val('name') + '"><div class="err" id="err_aname"></div></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
    '<div class="field"><label for="acost">Custo</label><input type="text" id="acost" maxlength="120" placeholder="Ex.: 15 pontos, 5 pontos/nível" value="' + val('cost') + '"></div>' +
    '<div class="field"><label for="atype">Tipo</label><input type="text" id="atype" list="advTypeList" maxlength="80" placeholder="Ex.: Vantagem, Perk" value="' + (editing ? val('type') : 'Vantagem') + '">' +
    '<datalist id="advTypeList">' + advValues('type').map(function (t) { return '<option value="' + esc(t) + '">'; }).join('') + '</datalist></div></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
    '<div class="field"><label for="abook">Livro</label><input type="text" id="abook" list="advBookList" maxlength="100" placeholder="Ex.: GURPS Basic Set (4ª ed.)" value="' + val('book') + '">' +
    '<datalist id="advBookList">' + advValues('book').map(function (b) { return '<option value="' + esc(b) + '">'; }).join('') + '</datalist></div>' +
    '<div class="field"><label for="apage">Página</label><input type="text" id="apage" maxlength="30" placeholder="Ex.: B43, MA49" value="' + val('page') + '"></div></div>' +
    '<div class="field"><label for="adesc">Descrição</label><textarea id="adesc" rows="6" maxlength="20000" placeholder="O que a vantagem faz, níveis, limitações…">' + val('description') + '</textarea></div>' +
    '<fieldset class="fx-box"><legend>Efeitos na ficha</legend>' +
    '<p class="hint-text" style="margin:0">O que a vantagem soma ou tira na ficha de quem a tiver, em Vantagens ou nos traços de Combate. Os valores-base da ficha não mudam: o bônus aparece separado e sai junto com a vantagem. ' +
    'Por nível: o valor vale para cada nível da vantagem na ficha. Máx.: o máximo que o efeito dá. Sem “acumula”, entre os efeitos que não acumulam no mesmo campo só o maior vale. ' +
    'Com condição, o efeito aparece ao lado do campo mas não é somado. Nomes separados por vírgula; com * no fim, todos os que começam assim (Guns* pega Guns (Pistol)).</p>' +
    '<p class="hint-text av-warn" id="afFxBuiltin" style="margin:0"' + (editing && ADV_FX_BUILTIN_RE.test(a.name) ? '' : ' hidden') + '>A ficha já aplica Combat Reflexes, Enhanced Defenses, Magery e talentos sozinha: efeitos cadastrados nelas não são somados, para não contar duas vezes.</p>' +
    '<div id="afFx"></div><div><button class="btn" type="button" id="afFxAdd">' + svg(ICON.plus, 15, 2.4) + 'Adicionar efeito</button></div></fieldset>' +
    flagHtml('avis', a, true) +
    '<div class="form-err" id="afErr" role="alert"></div>' +
    '<div class="btn-row" style="justify-content:flex-end"><button class="btn ghost" type="button" id="afCancel">Cancelar</button><button class="btn primary" type="submit" id="afSave">' + (editing ? 'Salvar vantagem' : 'Criar vantagem') + '</button></div></form>';
  showModal(html);
  modal.setAttribute('aria-labelledby', 'afTitle');
  var name = $('aname');
  name.addEventListener('input', function () {
    if (name.value.trim()) { $('err_aname').textContent = ''; $('f_aname').classList.remove('invalid'); }
    $('afFxBuiltin').hidden = !ADV_FX_BUILTIN_RE.test(name.value.trim());
  });
  // The effects being edited: read from the rows before each redraw of the list.
  var fx = editing ? advEffects(a) : [], box = $('afFx');
  function paintFx() { box.innerHTML = fx.length ? fx.map(function (e, i) { return advFxEditRow(cleanAdvEffect(e), i); }).join('') : '<p class="hint-text" style="margin:0">Nenhum efeito: a vantagem não muda nada na ficha.</p>'; }
  function readFx() { fx = [].map.call(box.querySelectorAll('.fx-row'), advFxReadRow); }
  paintFx();
  box.addEventListener('change', function (e) {
    var t = /** @type {AnyEl} */ (e.target);
    if (t && t.getAttribute('data-x') === 'target') { readFx(); var i = +t.closest('.fx-row').getAttribute('data-n'); fx[i].key = ''; paintFx(); var f = box.querySelector('[data-n="' + i + '"] [data-x="target"]'); if (f instanceof HTMLElement) f.focus(); }
  });
  box.addEventListener('click', function (e) {
    var b = /** @type {AnyEl} */ (e.target).closest('[data-xdel]'); if (!b) return;
    readFx(); fx.splice(+b.getAttribute('data-xdel'), 1); paintFx();
  });
  $('afFxAdd').onclick = function () {
    readFx(); fx.push(cleanAdvEffect({ target: 'attr', key: 'st', value: 1 })); paintFx();
    var l = box.querySelectorAll('[data-x="target"]'), f = l[l.length - 1]; if (f instanceof HTMLElement) f.focus();
  };
  $('afCancel').onclick = function () { closeModal(); };
  $('advForm').onsubmit = function (e) {
    e.preventDefault();
    if (modalOpen.busy) return;
    var n = name.value.trim();
    if (!n) { $('err_aname').textContent = 'Informe o nome da vantagem.'; $('f_aname').classList.add('invalid'); name.focus(); return; }
    readFx();
    var effects = fx.map(cleanAdvEffect), bad = effects.map(advEffectOk).indexOf(false);
    if (bad >= 0) {
      $('afErr').textContent = 'Efeito ' + (bad + 1) + ': escreva ' + ({ skill: 'as perícias', spell: 'as magias', college: 'as escolas' })[effects[bad].target] + ', separadas por vírgula.';
      var nf = box.querySelector('[data-n="' + bad + '"] [data-x="names"]'); if (nf instanceof HTMLElement) nf.focus();
      return;
    }
    modalOpen.busy = true;
    var btn = $('afSave'); btn.disabled = true; btn.textContent = 'Salvando…'; $('afCancel').disabled = true; $('afErr').textContent = '';
    Ops.saveAdvantage(a, { name: n, cost: $('acost').value, type: $('atype').value, book: $('abook').value, page: $('apage').value, description: $('adesc').value,
      effects: effects, visible: flagVal('avis', a), sharedWith: shareVal('avis', a) }).then(function (id) {
      closeModal(true);
      toast(editing ? 'Vantagem salva.' : 'Vantagem criada.');
      if (!editing) go(advHref(id));
    }, function (er) {
      if (!modalOpen) return;
      modalOpen.busy = false; btn.disabled = false; btn.textContent = editing ? 'Salvar vantagem' : 'Criar vantagem'; $('afCancel').disabled = false;
      $('afErr').textContent = errorText(er);
    });
  };
}

/* ---------- An advantage or perk in a modal (from a sheet, like the skills' openSkillModal) ---------- */
function openAdvModal(id) {
  showModal('<div class="skill-modal" id="advModal"><p class="lede">Carregando vantagem…</p></div>');
  function paint() {
    var box = $('advModal'); if (!box) return;
    var a = advById(id);
    if (!a) { box.innerHTML = '<h2>Vantagem não encontrada</h2><p class="lede">Essa vantagem pode ter sido excluída ou ocultada.</p>'; return; }
    var away = S.ui && sheetDraftOpen() ? ' target="_blank" rel="noopener"' : '';
    box.innerHTML = '<div class="skill-modal-head"><div style="display:flex;align-items:center;gap:8px"><span class="badge">' + svg(ICON.advantage, 12, 2.4) + ' ' + esc(advTypeLabel(a.type)) + '</span>' +
      '<span class="spell-badge ' + advTypeClass(a.type) + '">' + esc(advTypeLabel(a.type)) + '</span></div>' +
      '<h2 id="advModalTitle">' + esc(a.name) + '</h2><p class="lede">' + (a.cost ? esc(a.cost) : 'Custo não informado') + '</p></div>' +
      '<h3 class="sec-title">Descrição</h3>' + (a.description ? '<p class="long">' + esc(a.description) + '</p>' : '<p class="long none">Sem descrição cadastrada.</p>') +
      advEffectsHtml(a, false, 'h3') +
      '<p class="hint-text">' + esc([a.book, a.page ? 'p. ' + a.page : ''].filter(Boolean).join(' · ')) + '</p>' +
      '<div class="btn-row" style="justify-content:flex-end"><a class="btn" href="' + advHref(a.id) + '"' + away + ' id="advModalPage">Abrir página da vantagem</a></div>';
    modal.setAttribute('aria-labelledby', 'advModalTitle');
    var pg = $('advModalPage'); if (pg && !away) pg.onclick = function () { closeModal(); };
  }
  loadCatalog('advantages').then(paint, paint);
}
document.addEventListener('click', function (e) {
  if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
  var t = /** @type {AnyEl} */ (e.target), a = t && t.closest && t.closest('[data-adv-modal]'); if (!a) return;
  e.preventDefault(); openAdvModal(a.getAttribute('data-adv-modal'));
});
