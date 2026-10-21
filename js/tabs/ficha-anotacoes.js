/* =====================================================================
   Hounds — Ficha › Anotações: títulos e anotações da ficha
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   The Anotações tab of a main sheet (the allies don't have it): the same titles and notes as the
   Anotações menu (tab-anotacoes.js), in notebooks with sheetId = the sheet (W.sheetNotebooks and
   W.sheetNotes, filterNotes). Only the account linked to the sheet (users.sheetId) has the tab and its
   notes, not even the Mestre; a sheet visible to everyone doesn't show them to the others. So they have
   no visibility of their own (no "Visível para todos"). They go with the sheet when it is deleted.
   Everything opens inside
   the tab: ui.sheetNb (a title), ui.sheetNote (a note of it), ui.noteDraft (the note being edited,
   { title, body }; sheetDraftOpen counts it, so the page waits for Salvar or Cancelar).
   ===================================================================== */
function sheetNotesOpen(sheetId) {
  var u = me() && W.users.filter(function (x) { return x.id === me(); })[0];
  return !!(u && u.sheetId && u.sheetId === sheetId);
}
function sheetNbs(sheetId) { return W.sheetNotebooks.filter(function (nb) { return nb.sheetId === sheetId; }).sort(byName); }
function sheetNbById(id) { for (var i = 0; i < W.sheetNotebooks.length; i++) if (W.sheetNotebooks[i].id === id) return W.sheetNotebooks[i]; return null; }
function sheetNoteById(id) { for (var i = 0; i < W.sheetNotes.length; i++) if (W.sheetNotes[i].id === id) return W.sheetNotes[i]; return null; }

function sheetNotesHtml(s) {
  var ui = S.ui, can = canWrite();
  var nb = ui.sheetNb ? sheetNbById(ui.sheetNb) : null, n = ui.sheetNote ? sheetNoteById(ui.sheetNote) : null;
  // A title or note just created opens before it arrives; one that is not there anymore was deleted meanwhile.
  if (ui.sheetNb && !nb) { if (ui.pendingNb === ui.sheetNb) return '<section class="sheet-notes"><p class="lede">Abrindo o título…</p></section>'; ui.sheetNb = ui.sheetNote = null; }
  if (ui.sheetNote && (!n || !nb || n.notebookId !== nb.id)) { if (nb && ui.pendingNote === ui.sheetNote) return '<section class="sheet-notes"><p class="lede">Abrindo a anotação…</p></section>'; ui.sheetNote = null; n = null; }
  if (nb && ui.pendingNb === nb.id) ui.pendingNb = null;
  if (n && ui.pendingNote === n.id) { ui.pendingNote = null; if (can) ui.noteDraft = { title: n.title, body: noteEditHtml(n) }; }
  var back = function (label) { return '<button class="btn ghost sn-back" type="button" data-sn-back>' + svg('<path d="m15 18-6-6 6-6"/>', 15, 2.4) + esc(label) + '</button>'; };

  // A note: read, or edited with the same editor as the Anotações menu.
  if (n) {
    if (ui.noteDraft && can) return '<section class="sheet-notes">' + back(nb.name) +
      '<form class="note-edit" id="snEdit" novalidate><div class="field" id="f_sntitle"><label for="sntitle">Título da anotação</label><input type="text" id="sntitle" maxlength="120" autocomplete="off" value="' + esc(ui.noteDraft.title) + '"><div class="err" id="err_sntitle"></div></div>' +
      '<div class="field"><span class="lab">Texto</span><div id="snbody"></div><span class="hint-text">Ctrl+B negrito · Ctrl+I itálico · Ctrl+U sublinhado · Ctrl+K link · Ctrl+S salva.</span></div>' +
      '<div class="form-err" id="snErr" role="alert"></div>' +
      '<div class="btn-row" style="justify-content:flex-end"><button class="btn ghost" type="button" id="snCancel">Cancelar</button><button class="btn primary" type="submit" id="snSave">Salvar anotação</button></div></form></section>';
    var shown = n.format === 'html' ? cleanRich(n.body) : '';
    return '<section class="sheet-notes">' + back(nb.name) +
      '<div class="head-row"><div><span class="badge">' + svg(ICON.note, 12, 2.4) + 'Anotação</span><h2 class="sn-title">' + esc(n.title) + (isSecret(n) ? ' ' + secretTag(n) : '') + '</h2>' +
      '<p class="lede">Atualizada em ' + esc(fmtDate(n.updatedAt)) + '</p></div>' +
      (can ? '<div class="btn-row"><button class="btn primary" type="button" id="snEditBtn">' + svg(ICON.edit, 15) + 'Editar</button><button class="btn danger" type="button" id="snDelNote">' + svg(ICON.trash, 15) + 'Excluir</button></div>' : '') + '</div>' +
      (ui.snConfirmNote ? '<div class="confirm" role="alert"><span>Excluir a anotação <b>' + esc(n.title) + '</b>? Não dá para desfazer.</span><div class="btn-row"><button class="btn danger solid" type="button" id="snDelNoteYes">Excluir anotação</button><button class="btn ghost" type="button" id="snDelNoteNo">Cancelar</button></div></div>' : '') +
      (shown ? '<div class="note-body rich">' + shown + '</div>' : n.body && n.format !== 'html' ? '<p class="note-body">' + esc(n.body) + '</p>' : '<p class="note-body none">Anotação vazia.' + (can ? ' Clique em Editar para escrever.' : '') + '</p>') + '</section>';
  }

  // A title: its notes.
  if (nb) {
    var list = nbNotes(nb.id, W.sheetNotes);
    return '<section class="sheet-notes">' + back('Títulos') +
      '<div class="head-row"><div><span class="badge">' + svg(ICON.notes, 12, 2.4) + 'Título</span><h2 class="sn-title">' + esc(nb.name) + (isSecret(nb) ? ' ' + secretTag(nb) : '') + '</h2>' +
      '<p class="lede">' + (list.length ? plural(list.length, 'anotação', 'anotações') : 'Nenhuma anotação ainda') + '</p></div>' +
      (can ? '<div class="btn-row"><button class="btn primary" type="button" id="snNewNote">' + svg(ICON.plus, 16, 2.4) + 'Nova anotação</button><button class="btn" type="button" id="snEditNb">' + svg(ICON.edit, 15) + 'Renomear</button><button class="btn danger" type="button" id="snDelNb">' + svg(ICON.trash, 15) + 'Excluir</button></div>' : '') + '</div>' +
      (ui.snConfirmNb ? '<div class="confirm" role="alert"><span>Excluir o título <b>' + esc(nb.name) + '</b>' + (list.length ? ' e ' + plural(list.length, 'anotação', 'anotações') + ' dentro dele' : '') + '? Não dá para desfazer.</span><div class="btn-row"><button class="btn danger solid" type="button" id="snDelNbYes">Excluir título</button><button class="btn ghost" type="button" id="snDelNbNo">Cancelar</button></div></div>' : '') +
      (list.length ? '<div class="note-list">' + list.map(function (x) {
        var ex = noteText(x);
        return '<button class="note-row" type="button" data-snote="' + esc(x.id) + '"><span class="ico">' + svg(ICON.note, 18) + '</span><span class="txt"><strong>' + esc(x.title) + (isSecret(x) ? ' ' + secretTag(x) : '') + '</strong>' +
          (ex ? '<span class="ex">' + esc(clip(ex, 160)) + '</span>' : '') + '<span class="meta">Atualizada em ' + esc(fmtDate(x.updatedAt)) + '</span></span></button>';
      }).join('') + '</div>' : '<div class="empty-state">' + svg(ICON.note, 34, 1.6) + '<strong>Nenhuma anotação neste título</strong><span>' + (can ? 'Crie a primeira com <b>Nova anotação</b>.' : 'As anotações criadas vão aparecer aqui.') + '</span></div>') + '</section>';
  }

  // The titles of the sheet.
  var nbs = sheetNbs(s.id);
  return '<section class="sheet-notes"><div class="head-row"><div><h2 class="sec-title" style="margin:0">Anotações</h2><p class="lede">Organize as anotações da ficha por título. Cada título guarda vários arquivos de anotação.</p></div>' +
    (can ? '<button class="btn primary" type="button" id="snNewNb">' + svg(ICON.plus, 16, 2.4) + 'Novo título</button>' : '') + '</div>' +
    (!W.loaded.notebooks ? '<p class="lede">Carregando anotações…</p>'
      : nbs.length ? '<div class="nb-grid">' + nbs.map(function (x) {
        var k = nbNotes(x.id, W.sheetNotes).length;
        return '<button class="nb-card" type="button" data-snb="' + esc(x.id) + '"><span class="ico">' + svg(ICON.notes, 20) + '</span><span class="txt"><strong>' + esc(x.name) + (isSecret(x) ? ' ' + secretTag(x) : '') + '</strong><span class="meta">' + (k ? plural(k, 'anotação', 'anotações') : 'Nenhuma anotação') + '</span></span></button>';
      }).join('') + '</div>'
      : '<div class="empty-state">' + svg(ICON.notes, 34, 1.6) + '<strong>Nenhum título nesta ficha</strong><span>' + (can ? 'Crie o primeiro com <b>Novo título</b>.' : 'Os títulos criados vão aparecer aqui.') + '</span></div>') + '</section>';
}

function wireSheetNotes(s) {
  var ui = S.ui, root = pageRoot.querySelector('.sheet-notes'); if (!root) return;
  function open(nbId, noteId) { ui.sheetNb = nbId; ui.sheetNote = noteId; ui.snConfirmNb = ui.snConfirmNote = false; renderSheetPage(); }
  var bk = root.querySelector('[data-sn-back]'); if (bk) bk.onclick = function () { ui.noteDraft = null; open(ui.sheetNote ? ui.sheetNb : null, null); };
  root.querySelectorAll('[data-snb]').forEach(function (b) { b.onclick = function () { open(b.getAttribute('data-snb'), null); }; });
  root.querySelectorAll('[data-snote]').forEach(function (b) { b.onclick = function () { open(ui.sheetNb, b.getAttribute('data-snote')); }; });

  var nn = $('snNewNb'); if (nn) nn.onclick = function () {
    openNotebookForm(null, { sheetId: s.id, then: function (id) { ui.pendingNb = id; open(id, null); } });
  };
  var nb = ui.sheetNb ? sheetNbById(ui.sheetNb) : null;
  if (nb) {
    var a = $('snNewNote'); if (a) a.onclick = function () { openNoteForm(nb, function (id) { ui.pendingNote = id; open(nb.id, id); }); };
    var e = $('snEditNb'); if (e) e.onclick = function () { openNotebookForm(nb); };
    var d = $('snDelNb'); if (d) d.onclick = function () { ui.snConfirmNb = true; renderSheetPage(); };
    var dn = $('snDelNbNo'); if (dn) dn.onclick = function () { ui.snConfirmNb = false; renderSheetPage(); };
    var dy = $('snDelNbYes'); if (dy) dy.onclick = function () {
      dy.disabled = true;
      // In a relational database the notes go with their notebook, in one transaction.
      var all = W.store.relational ? [] : W.raw.notes.filter(function (x) { return x.notebookId === nb.id; });
      all.reduce(function (p, x) { return p.then(function () { return W.store.remove('notes', x.id); }); }, Promise.resolve())
        .then(function () { return W.store.remove('notebooks', nb.id); })
        .then(function () { toast('Título excluído.'); open(null, null); }, function (er) { dy.disabled = false; toast(errorText(er), true); });
    };
  }
  var n = ui.sheetNote ? sheetNoteById(ui.sheetNote) : null;
  if (!n) return;
  var ed = $('snEditBtn'); if (ed) ed.onclick = function () { ui.noteDraft = { title: n.title, body: noteEditHtml(n) }; renderSheetPage(); };
  var dl = $('snDelNote'); if (dl) dl.onclick = function () { ui.snConfirmNote = true; renderSheetPage(); };
  var dln = $('snDelNoteNo'); if (dln) dln.onclick = function () { ui.snConfirmNote = false; renderSheetPage(); };
  var dly = $('snDelNoteYes'); if (dly) dly.onclick = function () {
    dly.disabled = true;
    W.store.remove('notes', n.id).then(function () { toast('Anotação excluída.'); open(n.notebookId, null); }, function (er) { dly.disabled = false; toast(errorText(er), true); });
  };

  var f = $('snEdit'); if (!f) return;
  var t = $('sntitle');
  function submit() { f.requestSubmit ? f.requestSubmit() : /** @type {any} */ (f).onsubmit(); }
  var bd = richEditor($('snbody'), { html: ui.noteDraft.body, label: 'Texto da anotação', onInput: function (h) { ui.noteDraft.body = h; }, onSave: submit });
  t.oninput = function () { ui.noteDraft.title = t.value; $('err_sntitle').textContent = ''; $('f_sntitle').classList.remove('invalid'); };
  t.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); submit(); } });
  setTimeout(function () { bd.focus(); }, 20);
  $('snCancel').onclick = function () { ui.noteDraft = null; renderSheetPage(); };
  f.onsubmit = function (e) {
    if (e && e.preventDefault) e.preventDefault();
    var title = t.value.trim().replace(/\s+/g, ' ');
    if (!title) { $('err_sntitle').textContent = 'Dê um título à anotação.'; $('f_sntitle').classList.add('invalid'); t.focus(); return; }
    var html = bd.html();
    if (html.length > 500000) { $('snErr').textContent = 'O texto ficou grande demais para uma anotação só. Divida em mais de uma anotação.'; return; }
    var btn = $('snSave'); btn.disabled = true; btn.textContent = 'Salvando…';
    W.store.patch('notes', n.id, { title: title, body: html, format: 'html', updatedAt: now() }).then(function () {
      ui.noteDraft = null; toast('Anotação salva.'); renderSheetPage();
    }, function (er) { btn.disabled = false; btn.textContent = 'Salvar anotação'; $('snErr').textContent = errorText(er); });
  };
}
