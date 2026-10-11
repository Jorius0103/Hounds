/* =====================================================================
   Hounds — Aba Fichas (Mundo › Fichas)
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   Fichas: estrutura inicial. Por enquanto uma ficha tem só nome e
   observações; os campos da ficha entram aqui quando forem definidos.
   A character ↔ sheet link is stored once, in character.sheetId: a
   character has at most one sheet, by construction. A sheet can be the
   sheet of more than one character (a template for a group of guards).
   ===================================================================== */
ICON.sheet = '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>';
function indexSheets() { var idx = /** @type {Record<string, Sheet>} */ ({}); W.sheets.forEach(function (s) { idx[s.id] = s; }); W.sheetIdx = idx; }
function sheetById(id) { return (id && W.sheetIdx[id]) || null; }
function sheetHref(id) { return hrefFor('sheet:' + id); }
// Characters whose sheet this is.
function sheetChars(id) { return W.characters.filter(function (c) { return c.sheetId === id; }).sort(byName); }
function sheetLink(s) {
  var n = sheetChars(s.id).length;
  return '<li><a class="row-link" href="' + sheetHref(s.id) + '">' + thumbSlot(null, ICON.sheet) + '<span class="mtext"><b>' + esc(s.name) + '</b>' +
    '<span class="where">' + (n ? plural(n, 'personagem', 'personagens') : 'Nenhum personagem') + '</span></span></a></li>';
}

Ops.saveSheet = function (s, fields) {
  var name = (fields.name || '').trim();
  if (!name) return Promise.reject({ message: 'Informe o nome da ficha.' });
  var t = now();
  return W.store.put('sheets', s ? s.id : null, { v: 1, name: name, description: (fields.description || '').trim(), visible: fields.visible !== false, sharedWith: fields.sharedWith || (s && s.sharedWith) || [],
    createdBy: owner(s), createdAt: (s && s.createdAt) || t, updatedAt: t });
};
// Characters linked to it lose the link; they stay as they are otherwise.
Ops.deleteSheet = function (s) {
  return W.raw.characters.filter(function (c) { return c.sheetId === s.id; }).reduce(function (q, c) {
    return q.then(function () { return W.store.patch('characters', c.id, { sheetId: null, updatedAt: now() }); });
  }, Promise.resolve()).then(function () { return W.store.remove('sheets', s.id); });
};
// The one sheet of a character (null removes the link). A single field holds it, so linking
// another sheet replaces the current one; a list or a sheet that no longer exists is refused.
// justCreated: the sheet was saved a moment ago and may not have reached W.raw yet.
Ops.setCharSheet = function (charId, sheetId, justCreated) {
  if (!rawHas('characters', charId)) return Promise.reject({ message: 'Esse personagem não existe mais.' });
  if (sheetId != null && typeof sheetId !== 'string') return Promise.reject({ message: 'Um personagem só pode ter uma ficha.' });
  if (sheetId && !justCreated && !rawHas('sheets', sheetId)) return Promise.reject({ message: 'Essa ficha não existe mais. Escolha outra.' });
  return W.store.patch('characters', charId, { sheetId: sheetId || null, updatedAt: now() });
};

/* =====================================================================
   Page: Fichas (list)
   ===================================================================== */
function renderSheetsPage() {
  var can = canWrite();
  pageRoot.innerHTML =
    '<div class="head-row"><div>' + crumbsHtml('sheets') + '<h1>Fichas</h1><p class="lede">As fichas dos personagens. Cada personagem pode ser vinculado a uma ficha, na página dele.</p></div>' +
    (can ? '<button class="btn primary" type="button" id="newSheetBtn">' + svg(ICON.plus, 16, 2.4) + 'Nova ficha</button>' : '') + '</div>' + notice() +
    (W.sheets.length ? '<div class="toolbar"><label for="sheetSearch" style="position:absolute;left:-9999px">Buscar fichas</label><input class="search" id="sheetSearch" type="search" placeholder="Buscar por nome ou personagem" autocomplete="off" value="' + esc(S.ui.q || '') + '"><span class="meta" id="sheetCount"></span></div>' : '') +
    '<div id="sheetList"></div>';
  var b = $('newSheetBtn'); if (b) b.onclick = function () { openSheetForm(null); };
  var s = $('sheetSearch'); if (s) s.addEventListener('input', function () { S.ui.q = s.value; renderSheetList(); });
  renderSheetList();
}
function renderSheetList() {
  var el = $('sheetList'); if (!el) return;
  if (!W.loaded.sheets) { el.innerHTML = '<p class="lede">Carregando fichas…</p>'; return; }
  if (!W.sheets.length) {
    el.innerHTML = '<div class="empty-state">' + svg(ICON.sheet, 34, 1.6) + '<strong>Nenhuma ficha cadastrada</strong><span>' + (canWrite() ? 'Crie a primeira com <b>Nova ficha</b>.' : 'As fichas criadas vão aparecer aqui.') + '</span></div>';
    return;
  }
  var q = norm(S.ui.q);
  var list = W.sheets.slice().sort(byName).filter(function (s) {
    return !q || norm(s.name + ' ' + (s.description || '') + ' ' + sheetChars(s.id).map(function (c) { return c.name; }).join(' ')).indexOf(q) >= 0;
  });
  var cnt = $('sheetCount'); if (cnt) cnt.textContent = q ? list.length + ' de ' + W.sheets.length : plural(W.sheets.length, 'ficha', 'fichas');
  el.innerHTML = list.length ? '<div class="loc-grid">' + list.map(function (s) {
    var chars = sheetChars(s.id);
    return '<a class="loc-card" href="' + sheetHref(s.id) + '"><div class="thumb">' + svg(ICON.sheet, 28, 1.6) + '</div><div class="map-card-body"><strong>' + esc(s.name) + '</strong>' +
      '<span class="where">' + (chars.length ? esc(chars.map(function (c) { return c.name; }).join(', ')) : 'Sem personagem vinculado') + '</span></div></a>';
  }).join('') + '</div>' : '<p class="lede">Nenhuma ficha encontrada para essa busca.</p>';
}

/* =====================================================================
   Page: single sheet
   ===================================================================== */
function renderSheetPage() {
  var s = sheetById(S.route.sheetId), ui = S.ui;
  if (!s) {
    pageRoot.innerHTML = crumbsHtml('sheets') + (W.loaded.sheets ? '<h1>Ficha não encontrada</h1><p class="lede">Essa ficha foi excluída ou o link está incompleto.</p><div><a class="btn" href="#fichas">Voltar para Fichas</a></div>' : '<p class="lede">Carregando ficha…</p>');
    return;
  }
  var can = canWrite(), chars = sheetChars(s.id);
  var head = crumbsHtml('sheet:' + s.id) + '<div class="head-row"><div><span class="badge">' + svg(ICON.sheet, 12, 2.4) + 'Ficha</span><h1>' + esc(s.name) + '</h1>' +
    '<p class="lede">' + (chars.length ? 'Ficha de ' + esc(chars.map(function (c) { return c.name; }).join(', ')) : 'Nenhum personagem vinculado') + '</p></div>' +
    (can ? '<div class="btn-row"><button class="btn" type="button" id="editSheetBtn">' + svg(ICON.edit, 15) + 'Editar ficha</button><button class="btn danger" type="button" id="delSheetBtn">' + svg(ICON.trash, 15) + 'Excluir</button></div>' : '') + '</div>' +
    (ui.confirmDelete ? '<div class="confirm" role="alert"><span>Excluir a ficha <b>' + esc(s.name) + '</b>?' + (chars.length ? ' ' + plural(chars.length, 'personagem fica', 'personagens ficam') + ' sem ficha; os personagens continuam cadastrados.' : '') + ' Não dá para desfazer.</span><div class="btn-row"><button class="btn danger solid" type="button" id="delSheetYes">Excluir ficha</button><button class="btn ghost" type="button" id="delSheetNo">Cancelar</button></div></div>' : '');
  var main = '<section><h2 class="sec-title">Observações</h2>' + (s.description ? '<p class="long">' + esc(s.description) + '</p>' : '<p class="long none">Sem observações.</p>') + '</section>';
  var side = '<div class="box"><h2 class="sec-title" style="margin:0">Personagens</h2>' +
    (chars.length ? '<div class="people">' + chars.map(personChip).join('') + '</div>' : '<p class="lede" style="font-size:13px">Nenhum personagem vinculado.' + (can ? ' Use <b>Vincular ficha</b> na página do personagem.' : '') + '</p>') + '</div>';
  pageRoot.innerHTML = head + '<div class="loc-layout"><div class="side" style="gap:22px">' + main + '</div><div class="side">' + side + '</div></div>';
  fillImages(pageRoot);
  var e = $('editSheetBtn'); if (e) e.onclick = function () { openSheetForm(s); };
  var d = $('delSheetBtn'); if (d) d.onclick = function () { ui.confirmDelete = true; renderSheetPage(); };
  var dn = $('delSheetNo'); if (dn) dn.onclick = function () { ui.confirmDelete = false; renderSheetPage(); };
  var dy = $('delSheetYes'); if (dy) dy.onclick = function () {
    dy.disabled = true;
    Ops.deleteSheet(s).then(function () { toast('Ficha excluída.'); go('#fichas', true); }, function (er) { dy.disabled = false; toast(errorText(er), true); });
  };
}

/* =====================================================================
   Form: sheet (name and notes for now)
   ===================================================================== */
function openSheetForm(s, then) {
  var editing = !!s;
  var html = '<form id="sheetForm" novalidate><h2 id="sfTitle">' + (editing ? 'Editar ficha' : 'Nova ficha') + '</h2>' +
    '<div class="field" id="f_sname"><label for="sname">Nome da ficha</label><input type="text" id="sname" maxlength="100" autocomplete="off" placeholder="Ex.: Brynhild — nível 150" value="' + esc(editing ? s.name : '') + '"><div class="err" id="err_sname"></div></div>' +
    '<div class="field"><label for="sdesc">Observações</label><textarea id="sdesc" rows="6" maxlength="20000" placeholder="Anotações sobre a ficha.">' + esc(editing ? s.description || '' : '') + '</textarea></div>' +
    flagHtml('svis', s, true) +
    '<div class="form-err" id="sfErr" role="alert"></div>' +
    '<div class="btn-row" style="justify-content:flex-end"><button class="btn ghost" type="button" id="sfCancel">Cancelar</button><button class="btn primary" type="submit" id="sfSave">' + (editing ? 'Salvar ficha' : 'Criar ficha') + '</button></div></form>';
  showModal(html);
  modal.setAttribute('aria-labelledby', 'sfTitle');
  var name = $('sname');
  name.addEventListener('input', function () { if (name.value.trim()) { $('err_sname').textContent = ''; $('f_sname').classList.remove('invalid'); } });
  $('sfCancel').onclick = function () { closeModal(); };
  $('sheetForm').onsubmit = function (e) {
    e.preventDefault();
    if (modalOpen.busy) return;
    var n = name.value.trim();
    if (!n) { $('err_sname').textContent = 'Informe o nome da ficha.'; $('f_sname').classList.add('invalid'); name.focus(); return; }
    if (W.sheets.some(function (x) { return (!editing || x.id !== s.id) && norm(x.name) === norm(n); }) && !$('sfErr').dataset.warned) {
      $('sfErr').textContent = 'Já existe uma ficha com esse nome. Clique em ' + (editing ? 'Salvar' : 'Criar') + ' ficha de novo para continuar mesmo assim.'; $('sfErr').dataset.warned = '1'; return;
    }
    modalOpen.busy = true;
    var btn = $('sfSave'); btn.disabled = true; btn.textContent = 'Salvando…'; $('sfCancel').disabled = true; $('sfErr').textContent = '';
    Ops.saveSheet(s, { name: n, description: $('sdesc').value, visible: flagVal('svis', s), sharedWith: shareVal('svis', s) }).then(function (id) {
      closeModal(true);
      toast(editing ? 'Ficha salva.' : 'Ficha criada.');
      if (then) then(id); else if (!editing) go(sheetHref(id));
    }, function (er) {
      if (!modalOpen) return;
      modalOpen.busy = false; btn.disabled = false; btn.textContent = editing ? 'Salvar ficha' : 'Criar ficha'; $('sfCancel').disabled = false;
      $('sfErr').textContent = errorText(er);
    });
  };
}

/* =====================================================================
   Form: the sheet of a character (one at most; picking another replaces it)
   ===================================================================== */
function openSheetLinkForm(c) {
  var cur = c.sheetId || '', list = W.sheets.slice().sort(byName);
  var opts = '<option value="">Nenhuma ficha</option>' + list.map(function (s) {
    var others = sheetChars(s.id).filter(function (x) { return x.id !== c.id; });
    return '<option value="' + esc(s.id) + '"' + (s.id === cur ? ' selected' : '') + '>' + esc(s.name) + (others.length ? ' (também de ' + esc(others.map(function (x) { return x.name; }).join(', ')) + ')' : '') + '</option>';
  }).join('');
  var html = '<form id="sheetLinkForm" novalidate><h2 id="slTitle">Ficha de ' + esc(c.name) + '</h2>' +
    '<p class="lede" style="margin:0">Cada personagem fica vinculado a uma ficha só. Escolher outra substitui a atual.</p>' +
    (list.length ? '<div class="field"><label for="slSheet">Ficha</label><select id="slSheet">' + opts + '</select></div>'
      : '<p class="notice">Nenhuma ficha cadastrada ainda.</p>') +
    (canWrite() ? '<div><button class="btn" type="button" id="slNew">' + svg(ICON.plus, 15, 2.4) + 'Criar uma ficha nova</button></div>' : '') +
    '<div class="form-err" id="slErr" role="alert"></div>' +
    '<div class="btn-row" style="justify-content:flex-end"><button class="btn ghost" type="button" id="slCancel">Cancelar</button>' + (list.length ? '<button class="btn primary" type="submit" id="slSave">Salvar</button>' : '') + '</div></form>';
  showModal(html);
  modal.setAttribute('aria-labelledby', 'slTitle');
  $('slCancel').onclick = function () { closeModal(); };
  // A new sheet, then back here with it chosen.
  var nb = $('slNew'); if (nb) nb.onclick = function () {
    closeModal();
    openSheetForm(null, function (id) {
      Ops.setCharSheet(c.id, id, true).then(function () { toast('Ficha criada e vinculada a ' + c.name + '.'); }, function (er) { toast(errorText(er), true); });
    });
  };
  $('sheetLinkForm').onsubmit = function (e) {
    e.preventDefault();
    if (modalOpen.busy || !$('slSheet')) return;
    var id = $('slSheet').value || null;
    if (id === (c.sheetId || null)) { closeModal(); return; }
    if (id && !sheetById(id)) { $('slErr').textContent = 'Essa ficha não existe mais. Escolha outra.'; return; }
    modalOpen.busy = true;
    var btn = $('slSave'); btn.disabled = true; btn.textContent = 'Salvando…'; $('slCancel').disabled = true; $('slErr').textContent = '';
    Ops.setCharSheet(c.id, id).then(function () {
      closeModal(true);
      toast(id ? 'Ficha vinculada a ' + c.name + '.' : 'Vínculo com a ficha removido.');
    }, function (er) {
      if (!modalOpen) return;
      modalOpen.busy = false; btn.disabled = false; btn.textContent = 'Salvar'; $('slCancel').disabled = false;
      $('slErr').textContent = errorText(er);
    });
  };
}
