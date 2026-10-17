/* =====================================================================
   Hounds — Ficha › Peculiaridades
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* Data: sheet.quirks = [{ name, notes }], in the order the player gave. There is no catalog: the
   name is typed. A quirk is worth -1 point, and only five count (Basic Set, p. B162): the sixth on
   are played, but the total stops at -5. */
var QUIRK_MAX = 5;
function cleanQuirk(x) {
  return { name: String((x && x.name) || '').trim().slice(0, 120), notes: String((x && x.notes) || '').trim().slice(0, 400) };
}
function sheetQuirks(s) { return (Array.isArray(s && s.quirks) ? s.quirks : []).map(cleanQuirk).filter(function (x) { return x.name; }); }
// A row being edited counts once it has a name.
function quirkPts(x) { return String(x.name || '').trim() ? -1 : 0; }
function quirkCount(list) { return list.filter(function (x) { return quirkPts(x); }).length; }
function quirksTotal(list) { return -Math.min(quirkCount(list), QUIRK_MAX); }
function quirksWarn(list) {
  var n = quirkCount(list);
  return n > QUIRK_MAX ? plural(n, 'peculiaridade', 'peculiaridades') + ': só ' + QUIRK_MAX + ' valem pontos (−' + QUIRK_MAX + ' no total)' : '';
}

Ops.saveSheetQuirks = function (s, list) {
  if (!rawHas('sheets', s.id)) return Promise.reject({ message: 'Essa ficha não existe mais.' });
  return W.store.patch('sheets', s.id, { quirks: list.map(cleanQuirk).filter(function (x) { return x.name; }), updatedAt: now() });
};

/* ---------- view ---------- */
function sheetQuirksHtml(s, editing) {
  var ui = S.ui, can = canWrite(), list = editing ? ui.quirkDraft : sheetQuirks(s), warn = quirksWarn(list);
  var head = '<div class="gurps-head">' + sheetGripHtml('Peculiaridades') + gearFoldTitle('quirks', 'Peculiaridades', editing) + '<span class="gurps-total" id="pqTotal">' + quirksTotal(list) + ' pts</span>' +
    (editing ? secSaveBtnsHtml('pqCancel', 'pqSave', 'peculiaridades')
      : can && !sheetDraftOpen() ? secEditBtnHtml('pqEdit', 'peculiaridades') : '') + '</div>';
  if (editing) {
    return '<section class="gurps' + gearFoldClass('quirks', editing) + '" id="quirks">' + head +
      // New quirks go on top, under the button.
      '<div class="box sk-edit"><div><button class="btn" type="button" id="pqAdd">' + svg(ICON.plus, 15, 2.4) + 'Adicionar peculiaridade</button></div>' +
      '<div class="sk-row pq-row sk-labels" aria-hidden="true"><span>Peculiaridade</span><span>Pts</span><span>Observações</span><span></span></div>' +
      '<div id="pqRows">' + list.map(function (x, i) { return quirkEditRow(x, i); }).join('') + '</div>' +
      '<p class="hint-text av-warn" id="pqWarn"' + (warn ? '' : ' hidden') + '>' + esc(warn) + '</p>' +
      '<p class="hint-text">Uma peculiaridade é um traço pequeno, de personalidade ou do corpo: um gosto, uma mania, um hábito, uma convicção. ' +
      'Cada uma vale −1 ponto, e só 5 contam: até −5 pontos (Basic Set, p. B162).</p></div>' +
      '<div class="form-err" id="pqErr" role="alert"></div></section>';
  }
  if (!list.length) return '<section class="gurps' + gearFoldClass('quirks', editing) + '" id="quirks">' + head + '<p class="long none">Nenhuma peculiaridade cadastrada.' + (can ? ' Use <b>Editar</b> para adicionar.' : '') + '</p></section>';
  return '<section class="gurps' + gearFoldClass('quirks', editing) + '" id="quirks">' + head +
    '<table class="gtab av-tab"><thead><tr><th>Peculiaridade</th><th>Pts</th><th>Observações</th></tr></thead><tbody>' +
    list.map(function (x) { return '<tr><td><b>' + esc(x.name) + '</b></td><td class="gpts">' + quirkPts(x) + '</td><td class="av-notes">' + esc(x.notes) + '</td></tr>'; }).join('') + '</tbody>' +
    '<tfoot><tr><td>Total pontos peculiaridades' + (warn ? '<small class="av-warn">' + esc(warn) + '</small>' : '') + '</td><td class="gpts">' + quirksTotal(list) + '</td><td></td></tr></tfoot></table></section>';
}

/* ---------- editor ---------- */
function quirkEditRow(x, i) {
  return '<div class="sk-row pq-row" data-i="' + i + '">' +
    '<input class="sk-name" type="text" data-f="name" maxlength="120" placeholder="Ex.: Não gosta de cavalos" aria-label="Peculiaridade" value="' + esc(x.name) + '">' +
    '<span class="sk-nh av-pts" data-pts="' + i + '">' + quirkPts(x) + ' pts</span>' +
    '<input type="text" data-f="notes" maxlength="400" placeholder="Ex.: desde a guerra" aria-label="Observações" value="' + esc(x.notes) + '">' +
    '<button class="icon-btn" type="button" data-del="' + i + '" aria-label="Remover peculiaridade" title="Remover">' + svg(ICON.x, 15, 2.4) + '</button></div>';
}
// While editing, S.ui.quirkDraft holds the list being changed; typing updates it and the points and
// total beside it, adding or removing a row redraws the page from it.
function wireSheetQuirks(s) {
  var ui = S.ui;
  function focusFirst() { var f = document.querySelector('#pqRows .sk-name'); if (f instanceof HTMLElement) f.focus(); }
  var ed = $('pqEdit'); if (ed) ed.onclick = function () {
    ui.quirkDraft = sheetQuirks(s);
    if (!ui.quirkDraft.length) ui.quirkDraft.push(cleanQuirk({ name: '' }));
    renderSheetPage(); focusFirst();
  };
  var d = ui.quirkDraft, box = $('quirks'); if (!d || !box || !$('pqSave')) return;
  box.addEventListener('input', function (e) {
    var el = /** @type {AnyEl} */ (e.target), f = el.dataset && el.dataset.f, row = el.closest && el.closest('[data-i]'); if (!row || !f) return;
    var i = +row.getAttribute('data-i'), x = d[i], pts = box.querySelector('[data-pts="' + i + '"]'), warn = quirksWarn(d), w = $('pqWarn');
    x[f] = el.value;
    if (pts) pts.textContent = quirkPts(x) + ' pts';
    $('pqTotal').textContent = quirksTotal(d) + ' pts';
    w.textContent = warn; w.hidden = !warn;
  });
  box.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-del]'); if (!b) return;
    d.splice(+b.getAttribute('data-del'), 1); renderSheetPage();
  });
  $('pqAdd').onclick = function () { d.unshift(cleanQuirk({ name: '' })); renderSheetPage(); focusFirst(); };
  $('pqCancel').onclick = function () { ui.quirkDraft = null; renderSheetPage(); };
  $('pqSave').onclick = function () {
    var btn = $('pqSave'); btn.disabled = true; btn.textContent = 'Salvando…'; $('pqCancel').disabled = true;
    Ops.saveSheetQuirks(s, d).then(function () { ui.quirkDraft = null; toast('Peculiaridades salvas.'); renderSheetPage(); }, function (er) {
      btn.disabled = false; btn.textContent = 'Salvar'; $('pqCancel').disabled = false;
      $('pqErr').textContent = errorText(er);
    });
  };
}
