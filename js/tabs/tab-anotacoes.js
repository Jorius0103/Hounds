/* =====================================================================
   Hounds — Aba: Anotações (Cadernos, Títulos & Notas)
   ===================================================================== */

(function () {
  function renderNotesPage() {
    var pageRoot = $('pageRoot');
    if (!pageRoot) return;

    var can = isMestre();
    var qVal = (window.S && window.S.ui && window.S.ui.noteQ) || '';

    var roots = (W.notebooks || []).filter(function (nb) {
      return isMestre() || !isSecret(nb);
    }).sort(byName);

    var body = '';
    if (!W.loaded.notebooks) {
      body = '<p class="lede">Carregando anotações…</p>';
    } else if (!roots.length) {
      body = '<div class="empty-state">' + svg(ICON.notes, 34, 1.6) +
        '<strong>Nenhum caderno de anotações ainda</strong><span>' + (can ? 'Crie o primeiro com <b>Novo título</b>.' : 'As anotações criadas vão aparecer aqui.') + '</span></div>';
    } else {
      body = '<div class="nb-grid">' + roots.map(function (nb) {
        var list = nbNotes(nb.id);
        return '<a class="nb-card" href="#nb~' + encodeURIComponent(nb.id) + '">' +
          '<span class="ico">' + svg(ICON.notes, 20) + '</span>' +
          '<span class="txt"><strong>' + esc(nb.name) + (isSecret(nb) ? ' ' + secretTag() : '') + '</strong>' +
          '<span class="meta">' + plural(list.length, 'anotação', 'anotações') + '</span></span></a>';
      }).join('') + '</div>';
    }

    pageRoot.innerHTML =
      '<div class="head-row"><div>' + crumbsHtml('notes') + '<h1>Anotações</h1>' +
      '<p class="lede">Diários de bordo, anotações de sessões, pistas investigativas e documentos da campanha.</p></div>' +
      (can ? '<button class="btn primary" type="button" id="newNbBtn">' + svg(ICON.plus, 16, 2.4) + 'Novo título</button>' : '') +
      '</div>' + notice() + body;

    var b = $('newNbBtn');
    if (b) b.onclick = function () { openNotebookForm(null); };
  }

  function renderNotebookPage() {
    var pageRoot = $('pageRoot');
    if (!pageRoot) return;

    var r = window.S ? window.S.route : null;
    var nb = r ? nbById(r.nbId) : null;
    var ui = (window.S && window.S.ui) || {};

    if (!nb) {
      pageRoot.innerHTML = crumbsHtml('notes') + (W.loaded.notebooks ? '<h1>Título não encontrado</h1><p class="lede">Esse título foi excluído ou o link está incompleto.</p><div><a class="btn" href="#anotacoes">Voltar para Anotações</a></div>' : '<p class="lede">Carregando…</p>');
      return;
    }

    var can = isMestre();
    var list = nbNotes(nb.id);

    var head = crumbsHtml('nb:' + nb.id) +
      '<div class="head-row"><div><h1>' + esc(nb.name) + (isSecret(nb) ? ' ' + secretTag() : '') + '</h1>' +
      '<p class="lede">' + plural(list.length, 'anotação', 'anotações') + ' neste título.</p></div>' +
      (can ? '<div class="btn-row"><button class="btn primary" type="button" id="newNoteBtn">' + svg(ICON.plus, 16, 2.4) + 'Nova anotação</button>' +
      '<button class="btn" type="button" id="editNbBtn">' + svg(ICON.edit, 15) + 'Renomear</button>' +
      '<button class="btn danger" type="button" id="delNbBtn">' + svg(ICON.trash, 15) + 'Excluir</button></div>' : '') +
      '</div>' +
      (ui.confirmDelete ? '<div class="confirm" role="alert"><span>Excluir o título <b>' + esc(nb.name) + '</b> e todas as anotações contidas nele? Não dá para desfazer.</span><div class="btn-row"><button class="btn danger solid" type="button" id="delNbYes">Excluir título</button><button class="btn ghost" type="button" id="delNbNo">Cancelar</button></div></div>' : '');

    var body = list.length ? '<div class="note-list">' + list.map(function (n) {
      var ex = String(n.body || '').replace(/\s+/g, ' ').trim();
      return '<a class="note-row" href="#note~' + encodeURIComponent(n.id) + '">' +
        '<span class="ico">' + svg(ICON.note, 18) + '</span>' +
        '<span class="txt"><strong>' + esc(n.title) + (isSecret(n) ? ' ' + secretTag() : '') + '</strong>' +
        (ex ? '<span class="ex">' + esc(clip(ex, 160)) + '</span>' : '') +
        '<span class="meta">Atualizada em ' + esc(fmtDate(n.updatedAt)) + '</span></span></a>';
    }).join('') + '</div>' : '<div class="empty-state">' + svg(ICON.note, 34, 1.6) +
      '<strong>Nenhuma anotação neste título</strong><span>' + (can ? 'Crie a primeira com <b>Nova anotação</b>.' : 'As anotações vão aparecer aqui.') + '</span></div>';

    pageRoot.innerHTML = head + body;

    var a = $('newNoteBtn');
    if (a) a.onclick = function () { openNoteForm(nb, null); };

    var e1 = $('editNbBtn');
    if (e1) e1.onclick = function () { openNotebookForm(nb); };

    var d1 = $('delNbBtn');
    if (d1) d1.onclick = function () { ui.confirmDelete = true; renderNotebookPage(); };

    var dn = $('delNbNo');
    if (dn) dn.onclick = function () { ui.confirmDelete = false; renderNotebookPage(); };

    var dy = $('delNbYes');
    if (dy) dy.onclick = function () {
      dy.disabled = true;
      var all = (W.notes || []).filter(function (n) { return n.notebookId === nb.id; });
      all.reduce(function (p, n) {
        return p.then(function () { return W.store.remove('notes', n.id); });
      }, Promise.resolve())
        .then(function () { return W.store.remove('notebooks', nb.id); })
        .then(function () {
          toast('Título excluído.');
          if (window.go) window.go('#anotacoes', true);
        }, function (er) {
          dy.disabled = false;
          toast(errorText(er), true);
        });
    };
  }

  function renderNotePage() {
    var pageRoot = $('pageRoot');
    if (!pageRoot) return;

    var r = window.S ? window.S.route : null;
    var n = r ? noteById(r.noteId) : null;
    var ui = (window.S && window.S.ui) || {};
    var can = isMestre();

    if (!n) {
      pageRoot.innerHTML = crumbsHtml('notes') + (W.loaded.notes ? '<h1>Anotação não encontrada</h1><p class="lede">Essa anotação foi excluída ou o link está incompleto.</p><div><a class="btn" href="#anotacoes">Voltar para Anotações</a></div>' : '<p class="lede">Carregando…</p>');
      return;
    }

    var nb = nbById(n.notebookId);

    if (ui.editing) {
      pageRoot.innerHTML = crumbsHtml('note:' + n.id) +
        '<form class="note-edit" id="noteEdit" novalidate>' +
        '<div class="field" id="f_ntitle"><label for="ntitle">Título da anotação</label><input type="text" id="ntitle" maxlength="120" autocomplete="off" value="' + esc(ui.draftTitle != null ? ui.draftTitle : n.title) + '"><div class="err" id="err_ntitle"></div></div>' +
        '<div class="field"><label for="nbody">Texto</label><textarea id="nbody" maxlength="200000" placeholder="Escreva aqui…">' + esc(ui.draftBody != null ? ui.draftBody : (n.body || '')) + '</textarea><span class="hint-text">Ctrl+S salva diretamente.</span></div>' +
        flagHtml('nvis', n) +
        '<div class="form-err" id="nErr" role="alert"></div>' +
        '<div class="btn-row" style="justify-content:flex-end"><button class="btn ghost" type="button" id="nCancel">Cancelar</button><button class="btn primary" type="submit" id="nSave">Salvar anotação</button></div></form>';

      var t = $('ntitle'), bd = $('nbody'), f = $('noteEdit');
      t.oninput = function () { ui.draftTitle = t.value; $('err_ntitle').textContent = ''; };
      bd.oninput = function () { ui.draftBody = bd.value; };
      bd.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
          e.preventDefault();
          f.onsubmit(e);
        }
      });
      setTimeout(function () { bd.focus(); }, 20);

      $('nCancel').onclick = function () {
        ui.editing = false;
        ui.draftTitle = ui.draftBody = null;
        renderNotePage();
      };

      f.onsubmit = function (e) {
        if (e && e.preventDefault) e.preventDefault();
        var title = t.value.trim();
        if (!title) {
          $('err_ntitle').textContent = 'Dê um título à anotação.';
          t.focus();
          return;
        }
        var btn = $('nSave');
        btn.disabled = true;
        btn.textContent = 'Salvando…';

        Ops.updateNote(n.id, title, bd.value, flagVal('nvis', n)).then(function () {
          ui.editing = false;
          ui.draftTitle = ui.draftBody = null;
          toast('Anotação salva.');
          renderNotePage();
        }, function (er) {
          btn.disabled = false;
          btn.textContent = 'Salvar anotação';
          $('nErr').textContent = errorText(er);
        });
      };
      return;
    }

    var head = crumbsHtml('note:' + n.id) +
      '<div class="head-row"><div><span class="badge">' + svg(ICON.note, 12, 2.4) + 'Anotação</span><h1>' + esc(n.title) + (isSecret(n) ? ' ' + secretTag() : '') + '</h1>' +
      '<p class="lede">' + (nb ? 'Em <a class="inline" href="#nb~' + encodeURIComponent(nb.id) + '">' + esc(nb.name) + '</a> · ' : '') + 'Atualizada em ' + esc(fmtDate(n.updatedAt)) + '</p></div>' +
      (can ? '<div class="btn-row"><button class="btn primary" type="button" id="editNoteBtn">' + svg(ICON.edit, 15) + 'Editar</button><button class="btn danger" type="button" id="delNoteBtn">' + svg(ICON.trash, 15) + 'Excluir</button></div>' : '') +
      '</div>' +
      (ui.confirmDelete ? '<div class="confirm" role="alert"><span>Excluir a anotação <b>' + esc(n.title) + '</b>? Não dá para desfazer.</span><div class="btn-row"><button class="btn danger solid" type="button" id="delNoteYes">Excluir anotação</button><button class="btn ghost" type="button" id="delNoteNo">Cancelar</button></div></div>' : '');

    pageRoot.innerHTML = head + (n.body ? '<p class="note-body">' + esc(n.body) + '</p>' : '<p class="note-body none">Anotação vazia.' + (can ? ' Clique em Editar para escrever.' : '') + '</p>');

    var ed = $('editNoteBtn');
    if (ed) ed.onclick = function () { ui.editing = true; renderNotePage(); };

    var d1 = $('delNoteBtn');
    if (d1) d1.onclick = function () { ui.confirmDelete = true; renderNotePage(); };

    var dn = $('delNoteNo');
    if (dn) dn.onclick = function () { ui.confirmDelete = false; renderNotePage(); };

    var dy = $('delNoteYes');
    if (dy) dy.onclick = function () {
      dy.disabled = true;
      Ops.deleteNote(n.id).then(function () {
        toast('Anotação excluída.');
        if (window.go) window.go(nb ? '#nb~' + encodeURIComponent(nb.id) : '#anotacoes', true);
      }, function (er) {
        dy.disabled = false;
        toast(errorText(er), true);
      });
    };
  }

  function openNotebookForm(nb) {
    var editing = !!nb;
    var html = '<form id="nbForm" novalidate><h2 id="nbfTitle">' + (editing ? 'Renomear título' : 'Novo título') + '</h2>' +
      '<div class="field" id="f_nbname"><label for="nbname">Nome do caderno / título</label><input type="text" id="nbname" maxlength="100" autocomplete="off" placeholder="Ex.: Sessão 12, Pistas, Regras" value="' + esc(editing ? nb.name : '') + '"><div class="err" id="err_nbname"></div></div>' +
      flagHtml('nbvis', nb) +
      '<div class="form-err" id="nbfErr" role="alert"></div>' +
      '<div class="btn-row" style="justify-content:flex-end"><button class="btn ghost" type="button" id="nbfCancel">Cancelar</button><button class="btn primary" type="submit" id="nbfSave">' + (editing ? 'Salvar' : 'Criar título') + '</button></div></form>';

    showModal(html);

    var f = $('nbForm'), n = $('nbname'), cancel = $('nbfCancel');
    if (cancel) cancel.onclick = closeModal;

    f.onsubmit = function (e) {
      e.preventDefault();
      var name = n.value.trim();
      if (!name) {
        $('err_nbname').textContent = 'Dê um nome ao caderno.';
        n.focus();
        return;
      }
      var btn = $('nbfSave');
      btn.disabled = true;
      btn.textContent = 'Salvando…';

      var p = editing
        ? Ops.updateNotebook(nb, name, flagVal('nbvis', nb))
        : Ops.createNotebook(name, flagVal('nbvis', nb));

      p.then(function (id) {
        closeModal();
        toast(editing ? 'Título renomeado.' : 'Título criado.');
        if (window.go) window.go('#nb~' + encodeURIComponent(editing ? nb.id : id));
      }, function (err) {
        btn.disabled = false;
        btn.textContent = editing ? 'Salvar' : 'Criar título';
        $('nbfErr').textContent = errorText(err);
      });
    };
  }

  function openNoteForm(nb, n) {
    var editing = !!n;
    var html = '<form id="nfForm" novalidate><h2 id="nfTitle">' + (editing ? 'Editar anotação' : 'Nova anotação') + '</h2>' +
      '<div class="field" id="f_ntitle"><label for="ntitle">Título</label><input type="text" id="ntitle" maxlength="120" autocomplete="off" placeholder="Ex.: A emboscada na floresta" value="' + esc(editing ? n.title : '') + '"><div class="err" id="err_ntitle"></div></div>' +
      '<div class="field"><label for="nbody">Conteúdo</label><textarea id="nbody" rows="6" maxlength="200000" placeholder="Escreva a anotação aqui…">' + esc(editing ? n.body || '' : '') + '</textarea></div>' +
      flagHtml('nvis', n) +
      '<div class="form-err" id="nfErr" role="alert"></div>' +
      '<div class="btn-row" style="justify-content:flex-end"><button class="btn ghost" type="button" id="nfCancel">Cancelar</button><button class="btn primary" type="submit" id="nfSave">' + (editing ? 'Salvar' : 'Criar anotação') + '</button></div></form>';

    showModal(html);

    var f = $('nfForm'), t = $('ntitle'), cancel = $('nfCancel');
    if (cancel) cancel.onclick = closeModal;

    f.onsubmit = function (e) {
      e.preventDefault();
      var title = t.value.trim();
      if (!title) {
        $('err_ntitle').textContent = 'Dê um título à anotação.';
        t.focus();
        return;
      }
      var body = $('nbody').value;
      var btn = $('nfSave');
      btn.disabled = true;
      btn.textContent = 'Salvando…';

      var p = editing
        ? Ops.updateNote(n.id, title, body, flagVal('nvis', n))
        : Ops.createNote(nb.id, title, body, flagVal('nvis', n));

      p.then(function (id) {
        closeModal();
        toast(editing ? 'Anotação salva.' : 'Anotação criada.');
        if (window.go) window.go('#note~' + encodeURIComponent(editing ? n.id : id));
      }, function (err) {
        btn.disabled = false;
        btn.textContent = editing ? 'Salvar' : 'Criar anotação';
        $('nfErr').textContent = errorText(err);
      });
    };
  }

  window.renderNotesPage = renderNotesPage;
  window.renderNotebookPage = renderNotebookPage;
  window.renderNotePage = renderNotePage;
  window.openNotebookForm = openNotebookForm;
  window.openNoteForm = openNoteForm;
})();
