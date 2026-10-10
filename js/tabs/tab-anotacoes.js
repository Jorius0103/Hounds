/* =====================================================================
   Hounds — Aba Anotações: títulos e anotações
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   Anotações: titles (collection `notebooks` { name, visible, createdAt, updatedAt })
   each holding note files (collection `notes` { notebookId, title, body, visible, createdAt, updatedAt }).
   ===================================================================== */
ICON.notes = '<path d="M2 6h4"/><path d="M2 10h4"/><path d="M2 14h4"/><path d="M2 18h4"/><rect width="16" height="20" x="4" y="2" rx="2"/><path d="M16 2v20"/>';
ICON.note = '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>';
function filterNotes() {
  W.notebooks = pub(W.raw.notebooks);
  var ok = {}; W.notebooks.forEach(function (nb) { ok[nb.id] = true; });
  W.notes = pub(W.raw.notes).filter(function (n) { return ok[n.notebookId]; });
}
function nbById(id) { for (var i = 0; i < W.notebooks.length; i++) if (W.notebooks[i].id === id) return W.notebooks[i]; return null; }
function noteById(id) { for (var i = 0; i < W.notes.length; i++) if (W.notes[i].id === id) return W.notes[i]; return null; }
function nbNotes(id) { return W.notes.filter(function (n) { return n.notebookId === id; }).sort(function (a, b) { return String(a.title || '').localeCompare(String(b.title || ''), 'pt', { sensitivity: 'base', numeric: true }); }); }
function fmtDate(t) { if (!t) return ''; try { return new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }

function renderNotesPage() {
  var can = canWrite();
  var head = '<div class="head-row"><div>' + crumbsHtml('notes') + '<h1>Anotações</h1><p class="lede">Organize as anotações por título. Cada título guarda vários arquivos de anotação.</p></div>' +
    (can ? '<button class="btn primary" type="button" id="newNbBtn">' + svg(ICON.plus, 16, 2.4) + 'Novo título</button>' : '') + '</div>' + notice();
  var body;
  if (!W.loaded.notebooks) body = '<p class="lede">Carregando anotações…</p>';
  else if (!W.notebooks.length) body = '<div class="empty-state">' + svg(ICON.notes, 34, 1.6) + '<strong>Nenhum título criado</strong><span>' + (can ? 'Crie o primeiro com <b>Novo título</b>.' : 'Os títulos criados vão aparecer aqui.') + '</span></div>';
  else body = '<div class="nb-grid">' + W.notebooks.slice().sort(byName).map(function (nb) {
    var k = nbNotes(nb.id).length;
    return '<a class="nb-card" href="' + hrefFor('nb:' + nb.id) + '"><span class="ico">' + svg(ICON.notes, 20) + '</span><span class="txt"><strong>' + esc(nb.name) + (isSecret(nb) ? ' ' + secretTag(nb) : '') + '</strong><span class="meta">' + (k ? plural(k, 'anotação', 'anotações') : 'Nenhuma anotação') + '</span></span></a>';
  }).join('') + '</div>';
  pageRoot.innerHTML = head + body;
  var b = $('newNbBtn'); if (b) b.onclick = function () { openNotebookForm(null); };
}

function renderNotebookPage() {
  var nb = nbById(S.route.nbId), ui = S.ui, can = canWrite();
  if (!nb) {
    pageRoot.innerHTML = crumbsHtml('notes') + (W.loaded.notebooks ? '<h1>Título não encontrado</h1><p class="lede">Esse título foi excluído ou o link está incompleto.</p><div><a class="btn" href="#anotacoes">Voltar para Anotações</a></div>' : '<p class="lede">Carregando…</p>');
    return;
  }
  var list = nbNotes(nb.id);
  var head = crumbsHtml('nb:' + nb.id) + '<div class="head-row"><div><span class="badge">' + svg(ICON.notes, 12, 2.4) + 'Título</span><h1>' + esc(nb.name) + '</h1><p class="lede">' + (list.length ? plural(list.length, 'anotação', 'anotações') : 'Nenhuma anotação ainda') + '</p></div>' +
    (can ? '<div class="btn-row"><button class="btn primary" type="button" id="newNoteBtn">' + svg(ICON.plus, 16, 2.4) + 'Nova anotação</button><button class="btn" type="button" id="editNbBtn">' + svg(ICON.edit, 15) + 'Renomear</button><button class="btn danger" type="button" id="delNbBtn">' + svg(ICON.trash, 15) + 'Excluir</button></div>' : '') + '</div>' +
    (ui.confirmDelete ? '<div class="confirm" role="alert"><span>Excluir o título <b>' + esc(nb.name) + '</b>' + (list.length ? ' e ' + plural(list.length, 'anotação', 'anotações') + ' dentro dele' : '') + '? Não dá para desfazer.</span><div class="btn-row"><button class="btn danger solid" type="button" id="delNbYes">Excluir título</button><button class="btn ghost" type="button" id="delNbNo">Cancelar</button></div></div>' : '');
  var body = list.length ? '<div class="note-list">' + list.map(function (n) {
    var ex = noteText(n);
    return '<a class="note-row" href="' + hrefFor('note:' + n.id) + '"><span class="ico">' + svg(ICON.note, 18) + '</span><span class="txt"><strong>' + esc(n.title) + (isSecret(n) ? ' ' + secretTag(n) : '') + '</strong>' +
      (ex ? '<span class="ex">' + esc(clip(ex, 160)) + '</span>' : '') + '<span class="meta">Atualizada em ' + esc(fmtDate(n.updatedAt)) + '</span></span></a>';
  }).join('') + '</div>' : '<div class="empty-state">' + svg(ICON.note, 34, 1.6) + '<strong>Nenhuma anotação neste título</strong><span>' + (can ? 'Crie a primeira com <b>Nova anotação</b>.' : 'As anotações criadas vão aparecer aqui.') + '</span></div>';
  pageRoot.innerHTML = head + body;
  tagPage(nb, 'notebooks');
  var a = $('newNoteBtn'); if (a) a.onclick = function () { openNoteForm(nb, null); };
  var e = $('editNbBtn'); if (e) e.onclick = function () { openNotebookForm(nb); };
  var d = $('delNbBtn'); if (d) d.onclick = function () { ui.confirmDelete = true; renderNotebookPage(); };
  var dn = $('delNbNo'); if (dn) dn.onclick = function () { ui.confirmDelete = false; renderNotebookPage(); };
  var dy = $('delNbYes'); if (dy) dy.onclick = function () {
    dy.disabled = true;
    var all = W.raw.notes.filter(function (n) { return n.notebookId === nb.id; });
    all.reduce(function (p, n) { return p.then(function () { return W.store.remove('notes', n.id); }); }, Promise.resolve())
      .then(function () { return W.store.remove('notebooks', nb.id); })
      .then(function () { toast('Título excluído.'); go('#anotacoes', true); }, function (er) { dy.disabled = false; toast(errorText(er), true); });
  };
}



function renderNotePage() {
  var n = noteById(S.route.noteId), ui = S.ui, can = canWrite();
  if (n && S.pendingEdit === n.id) { S.pendingEdit = null; ui.editing = true; }
  if (!n) {
    pageRoot.innerHTML = crumbsHtml('notes') + (W.loaded.notes && S.pendingEdit !== S.route.noteId ? '<h1>Anotação não encontrada</h1><p class="lede">Essa anotação foi excluída ou o link está incompleto.</p><div><a class="btn" href="#anotacoes">Voltar para Anotações</a></div>' : '<p class="lede">Carregando…</p>');
    return;
  }
  var nb = nbById(n.notebookId);
  if (ui.editing) {
    pageRoot.innerHTML = crumbsHtml('note:' + n.id) +
      '<form class="note-edit" id="noteEdit" novalidate><div class="field" id="f_ntitle"><label for="ntitle">Título da anotação</label><input type="text" id="ntitle" maxlength="120" autocomplete="off" value="' + esc(ui.draftTitle != null ? ui.draftTitle : n.title) + '"><div class="err" id="err_ntitle"></div></div>' +
      '<div class="field"><span class="lab" id="lab_nbody">Texto</span><div id="nbody"></div><span class="hint-text">Ctrl+B negrito · Ctrl+I itálico · Ctrl+U sublinhado · Ctrl+K link · Ctrl+S salva.</span></div>' +
      flagHtml('nvis', n) +
      '<div class="form-err" id="nErr" role="alert"></div>' +
      '<div class="btn-row" style="justify-content:flex-end"><button class="btn ghost" type="button" id="nCancel">Cancelar</button><button class="btn primary" type="submit" id="nSave">Salvar anotação</button></div></form>';
    var t = $('ntitle'), f = $('noteEdit');
    function submit() { f.requestSubmit ? f.requestSubmit() : f.onsubmit(); }
    var bd = richEditor($('nbody'), { html: ui.draftBody != null ? ui.draftBody : noteEditHtml(n), label: 'Texto da anotação', onInput: function (h) { ui.draftBody = h; }, onSave: submit });
    t.oninput = function () { ui.draftTitle = t.value; $('err_ntitle').textContent = ''; $('f_ntitle').classList.remove('invalid'); };
    t.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); submit(); } });
    setTimeout(function () { bd.focus(); }, 20);
    $('nCancel').onclick = function () { ui.editing = false; ui.draftTitle = ui.draftBody = null; renderNotePage(); };
    f.onsubmit = function (e) {
      if (e && e.preventDefault) e.preventDefault();
      var title = t.value.trim().replace(/\s+/g, ' ');
      if (!title) { $('err_ntitle').textContent = 'Dê um título à anotação.'; $('f_ntitle').classList.add('invalid'); t.focus(); return; }
      var html = bd.html();
      if (html.length > 500000) { $('nErr').textContent = 'O texto ficou grande demais para uma anotação só. Divida em mais de uma anotação.'; return; }
      var btn = $('nSave'); btn.disabled = true; btn.textContent = 'Salvando…';
      W.store.patch('notes', n.id, { title: title, body: html, format: 'html', visible: flagVal('nvis', n), updatedAt: now() }).then(function () {
        ui.editing = false; ui.draftTitle = ui.draftBody = null; toast('Anotação salva.'); renderPage();
      }, function (er) { btn.disabled = false; btn.textContent = 'Salvar anotação'; $('nErr').textContent = errorText(er); });
    };
    return;
  }
  var head = crumbsHtml('note:' + n.id) + '<div class="head-row"><div><span class="badge">' + svg(ICON.note, 12, 2.4) + 'Anotação</span><h1>' + esc(n.title) + '</h1>' +
    '<p class="lede">' + (nb ? 'Em <a class="inline" href="' + hrefFor('nb:' + nb.id) + '">' + esc(nb.name) + '</a> · ' : '') + 'Atualizada em ' + esc(fmtDate(n.updatedAt)) + '</p></div>' +
    (can ? '<div class="btn-row"><button class="btn primary" type="button" id="editNoteBtn">' + svg(ICON.edit, 15) + 'Editar</button><button class="btn danger" type="button" id="delNoteBtn">' + svg(ICON.trash, 15) + 'Excluir</button></div>' : '') + '</div>' +
    (ui.confirmDelete ? '<div class="confirm" role="alert"><span>Excluir a anotação <b>' + esc(n.title) + '</b>? Não dá para desfazer.</span><div class="btn-row"><button class="btn danger solid" type="button" id="delNoteYes">Excluir anotação</button><button class="btn ghost" type="button" id="delNoteNo">Cancelar</button></div></div>' : '');
  var shown = n.format === 'html' ? cleanRich(n.body) : '';
  pageRoot.innerHTML = head + (shown ? '<div class="note-body rich">' + shown + '</div>' : n.body && n.format !== 'html' ? '<p class="note-body">' + esc(n.body) + '</p>' : '<p class="note-body none">Anotação vazia.' + (can ? ' Clique em Editar para escrever.' : '') + '</p>');
  tagPage(n, 'notes');
  var ed = $('editNoteBtn'); if (ed) ed.onclick = function () { ui.editing = true; renderNotePage(); };
  var d = $('delNoteBtn'); if (d) d.onclick = function () { ui.confirmDelete = true; renderNotePage(); };
  var dn = $('delNoteNo'); if (dn) dn.onclick = function () { ui.confirmDelete = false; renderNotePage(); };
  var dy = $('delNoteYes'); if (dy) dy.onclick = function () {
    dy.disabled = true;
    W.store.remove('notes', n.id).then(function () { toast('Anotação excluída.'); go(nb ? hrefFor('nb:' + nb.id) : '#anotacoes', true); }, function (er) { dy.disabled = false; toast(errorText(er), true); });
  };
}

function openNotebookForm(nb) {
  var editing = !!nb;
  showModal('<form id="nbForm" novalidate><h2 id="nbfTitle">' + (editing ? 'Renomear título' : 'Novo título') + '</h2>' +
    '<div class="field" id="f_nbname"><label for="nbname">Título</label><input type="text" id="nbname" maxlength="100" autocomplete="off" placeholder="Ex.: Sessão 12, Pistas do culto, Regras da casa" value="' + esc(editing ? nb.name : '') + '"><div class="err" id="err_nbname"></div></div>' +
    flagHtml('nbvis', nb) +
    '<div class="form-err" id="nbfErr" role="alert"></div>' +
    '<div class="btn-row" style="justify-content:flex-end"><button class="btn ghost" type="button" id="nbfCancel">Cancelar</button><button class="btn primary" type="submit" id="nbfSave">' + (editing ? 'Salvar' : 'Criar título') + '</button></div></form>');
  modal.setAttribute('aria-labelledby', 'nbfTitle');
  var name = $('nbname');
  name.oninput = function () { $('err_nbname').textContent = ''; $('f_nbname').classList.remove('invalid'); };
  $('nbfCancel').onclick = function () { closeModal(); };
  $('nbForm').onsubmit = function (e) {
    e.preventDefault(); if (modalOpen.busy) return;
    var n = name.value.trim().replace(/\s+/g, ' ');
    if (!n) { $('err_nbname').textContent = 'Informe o título.'; $('f_nbname').classList.add('invalid'); name.focus(); return; }
    var t = now(), vis = flagVal('nbvis', nb), btn = $('nbfSave'); btn.disabled = true; modalOpen.busy = true;
    var p = editing ? W.store.patch('notebooks', nb.id, { name: n, visible: vis, updatedAt: t }).then(function () { return nb.id; }) : W.store.put('notebooks', null, { name: n, visible: vis, createdBy: me(), createdAt: t, updatedAt: t });
    p.then(function (id) { closeModal(true); toast(editing ? 'Título salvo.' : 'Título criado.'); if (!editing) go(hrefFor('nb:' + id)); },
      function (er) { if (!modalOpen) return; modalOpen.busy = false; btn.disabled = false; $('nbfErr').textContent = errorText(er); });
  };
}

function openNoteForm(nb) {
  showModal('<form id="noteForm" novalidate><h2 id="nfTitle">Nova anotação</h2><p class="lede" style="margin-top:-6px">Em ' + esc(nb.name) + '</p>' +
    '<div class="field" id="f_nfname"><label for="nfname">Título da anotação</label><input type="text" id="nfname" maxlength="120" autocomplete="off" placeholder="Ex.: Resumo da sessão" value=""><div class="err" id="err_nfname"></div></div>' +
    flagHtml('nfvis', null) +
    '<div class="form-err" id="nfErr" role="alert"></div>' +
    '<div class="btn-row" style="justify-content:flex-end"><button class="btn ghost" type="button" id="nfCancel">Cancelar</button><button class="btn primary" type="submit" id="nfSave">Criar e escrever</button></div></form>');
  modal.setAttribute('aria-labelledby', 'nfTitle');
  var name = $('nfname');
  name.oninput = function () { $('err_nfname').textContent = ''; $('f_nfname').classList.remove('invalid'); };
  $('nfCancel').onclick = function () { closeModal(); };
  $('noteForm').onsubmit = function (e) {
    e.preventDefault(); if (modalOpen.busy) return;
    var n = name.value.trim().replace(/\s+/g, ' ');
    if (!n) { $('err_nfname').textContent = 'Dê um título à anotação.'; $('f_nfname').classList.add('invalid'); name.focus(); return; }
    var t = now(), btn = $('nfSave'); btn.disabled = true; modalOpen.busy = true;
    W.store.put('notes', null, { notebookId: nb.id, title: n, body: '', visible: flagVal('nfvis', null), createdBy: me(), createdAt: t, updatedAt: t }).then(function (id) {
      closeModal(true); toast('Anotação criada.');
      S.pendingEdit = id; go(hrefFor('note:' + id));
    }, function (er) { if (!modalOpen) return; modalOpen.busy = false; btn.disabled = false; $('nfErr').textContent = errorText(er); });
  };
}
