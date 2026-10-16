/* =====================================================================
   Hounds — Ficha › Equip. › Criar Item
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html (depois de ficha-armas.js).
   ===================================================================== */
'use strict';

/* An item of Regras › Itens (or a name of the player's, not in the catalog), added to Meus Itens as an
   item line. The line is an ordinary one: after created, it changes with Editar on its row in Meus Itens.
   S.ui.itemDraft = { editId, kind, refId, custom, name, qty, weight, cost, notes } while the form is
   open; weight and cost are of one unit, as in the list. editId: the line being edited (Editar in Meus
   Itens), which keeps its id, so the body and the packs keep it. */
function itemDraftFrom(c) {
  if (!c) return { refId: null, custom: false, chosen: false, name: '', qty: 1, weight: 0, cost: 0, notes: '' };
  return { refId: c.id, custom: false, chosen: true, name: c.name, qty: 1, weight: cleanDec(catNum(c.weight), 99999, 0), cost: cleanDec(catNum(c.cost), 9999999, 0), notes: '' };
}
function itemDraftFromLine(x) {
  return { editId: x.id, kind: x.kind, refId: x.refId || null, custom: !x.refId, chosen: true, name: x.name, qty: x.qty, weight: x.weight, cost: x.cost, notes: x.notes };
}
function itemDraftErrors(d) {
  var out = [];
  if (!d.chosen) out.push('Escolha o item (ou digite um nome e use-o como item personalizado).');
  else if (!String(d.name || '').trim()) out.push('Dê um nome ao item.');
  return out;
}
Ops.createSheetItem = function (s, d) {
  if (!rawHas('sheets', s.id)) return Promise.reject({ message: 'Essa ficha não existe mais.' });
  var errs = itemDraftErrors(d); if (errs.length) return Promise.reject({ message: errs.join(' ') });
  var g = sheetGear(sheetById(s.id) || s), old = d.editId ? g.equip.filter(function (x) { return x.id === d.editId; })[0] : null;
  if (d.editId && !old) return Promise.reject({ message: 'Esse item não está mais em Meus Itens.' });
  var line = cleanEquip({ id: old ? old.id : gearNewId('e', gearIndex(g.equip)), kind: d.kind || 'item', refId: d.refId || undefined, name: d.name, qty: d.qty, weight: d.weight, cost: d.cost, notes: d.notes });
  var list = old ? g.equip.map(function (x) { return x.id === old.id ? line : x; }) : g.equip.concat([line]);
  return saveGearLists(s, { equip: list }).then(function () { return line; });
};

/* ---------- view ---------- */
function itemFieldsHtml(d) {
  if (!d.chosen) return '<p class="hint-text" style="margin:0">Escolha o item em Regras › Itens. Um nome que não está no catálogo vira um item personalizado.</p>';
  var c = d.refId ? itemById(d.refId) : null;
  function num(f, label, step, hi) { return '<label class="sc-f"><span>' + label + '</span><input type="number" data-ib="' + f + '" min="0" max="' + hi + '" step="' + step + '" inputmode="decimal" value="' + d[f] + '"></label>'; }
  return (c ? '<p class="hint-text" style="margin:0">' + esc([c.category, c.tl ? 'TL ' + c.tl : '', c.cost, c.weight, c.book, c.page ? 'p. ' + c.page : ''].filter(Boolean).join(' · ')) + '</p>' +
      (c.description ? '<p class="hint-text ib-desc" style="margin:0">' + esc(clip(c.description, 400)) + '</p>' : '')
    : '<p class="hint-text" style="margin:0"><b>Item personalizado</b>: não está em Regras › Itens. Preencha os valores.</p>') +
    '<div class="ib-grid">' +
    '<label class="sc-f ib-name"><span>Nome</span><input type="text" data-ib="name" maxlength="120" value="' + esc(d.name) + '"></label>' +
    num('qty', 'Qtd.', '1', 9999) + num('weight', 'Peso de um (lbs)', 'any', 99999) + num('cost', 'Custo de um ($)', 'any', 9999999) +
    '<label class="sc-f ib-notes"><span>Observações</span><input type="text" data-ib="notes" maxlength="400" placeholder="Opcional" value="' + esc(d.notes) + '"></label></div>' +
    '<p class="hint-text" style="margin:0" id="ibTotal">' + itemTotalText(d) + '</p>';
}
function itemTotalText(d) { var q = cleanInt(d.qty, 0, 9999, 1); return 'Total: ' + esc(eqLbs(eqRound(q * (d.weight || 0)))) + ' · ' + esc(eqMoney(eqRound(q * (d.cost || 0)))) + ' (' + plural(q, 'unidade', 'unidades') + ')'; }
function sheetItemHtml(s) {
  var ui = S.ui, can = canWrite(), d = can ? ui.itemDraft : null;
  var head = '<div class="gurps-head"><h2 class="sec-title">Criar Item</h2>' +
    (!d ? '<div class="btn-row">' + (can && !gearEditing() ? '<button class="btn primary" type="button" id="ibNew">' + svg(ICON.plus, 15, 2.4) + 'Criar item</button>' : '') + '</div>' : '') + '</div>';
  if (!d) return gearCreateTile('itemSec', 'ibNew', ICON.item, 'Item', '', 'De Regras › Itens ou personalizado');
  return '<section class="gurps" id="itemSec">' + head + '<div class="box sk-edit">' +
    (d.editId ? '<p class="hint-text" style="margin:0">Editando um item de Meus Itens: ele continua onde está no Corpo e nas Mochilas.</p>' : '') +
    '<label class="sc-f"><span>Item</span><div class="sk-pick"><input type="text" id="ibBase" maxlength="120" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="ibBaseSug"' +
    ' placeholder="' + (W.loaded.items ? 'Digite para buscar. Ex.: corda, mochila, Backpack' : 'Carregando itens…') + '" value="' + esc(d.chosen ? d.name : '') + '"><div class="suggest" id="ibBaseSug" role="listbox" hidden></div></div></label>' +
    '<div id="ibFields">' + itemFieldsHtml(d) + '</div></div>' +
    '<div class="form-err" id="ibErr" role="alert"></div>' +
    '<div class="btn-row" style="justify-content:flex-end"><button class="btn ghost" type="button" id="ibCancel">Cancelar</button><button class="btn primary" type="button" id="ibSave">' + (d.editId ? 'Salvar alterações' : 'Criar item e adicionar aos itens') + '</button></div></section>';
}

/* ---------- wiring ---------- */
function wireItemSec(s) {
  var ui = S.ui, box = $('itemSec'); if (!box) return;
  var nb = $('ibNew'); if (nb) nb.onclick = function () { ui.itemDraft = itemDraftFrom(null); loadCatalog('items'); renderSheetPage(); var n = $('ibBase'); if (n) n.focus(); };
  var d = ui.itemDraft; if (!d || !$('ibSave')) return;
  function paintFields() { $('ibFields').innerHTML = itemFieldsHtml(d); $('ibErr').textContent = ''; }
  box.addEventListener('input', function (e) {
    var t = /** @type {AnyEl} */ (e.target), f = t.getAttribute && t.getAttribute('data-ib'); if (!f) return;
    if (f === 'name' || f === 'notes') d[f] = t.value;
    else if (t.value !== '') d[f] = f === 'qty' ? cleanInt(t.value, 0, 9999, 1) : cleanDec(t.value, f === 'cost' ? 9999999 : 99999, 0);
    $('ibTotal').innerHTML = itemTotalText(d);
  });
  // The item: Regras › Itens, found by name in English or Portuguese; a name the catalog does not have
  // (exactly) is offered as a custom item, at the end.
  var pick = $('ibBase'), sug = $('ibBaseSug'), opts = [], act = 0;
  function hide() { sug.hidden = true; sug.innerHTML = ''; pick.setAttribute('aria-expanded', 'false'); }
  function show() {
    var q = pick.value, typed = String(q || '').trim(), all = W.items || [];
    opts = typed && !(d.chosen && q === d.name) ? searchCatalog(all, q, null).slice(0, 12) : [];
    if (typed && !(d.chosen && q === d.name) && !all.some(function (c) { return norm(c.name) === norm(typed); })) opts = opts.concat([{ custom: true, name: typed }]);
    act = Math.min(act, Math.max(0, opts.length - 1));
    if (!opts.length) { hide(); return; }
    sug.innerHTML = opts.map(function (c, n) {
      if (c.custom) return '<button type="button" role="option" data-o="' + n + '" class="ab-custom-opt' + (n === act ? ' act' : '') + '" aria-selected="' + (n === act) + '"><span>' + svg(ICON.plus, 13, 2.4) + 'Usar “' + esc(c.name) + '” como item personalizado</span><small>preencha peso, custo e o resto</small></button>';
      return '<button type="button" role="option" data-o="' + n + '" class="' + (n === act ? 'act' : '') + '" aria-selected="' + (n === act) + '"><span>' + esc(c.name) + ptNameHtml(c) + '</span>' +
        '<small>' + esc([c.category, c.cost, c.weight, c.tl ? 'TL ' + c.tl : '', c.page].filter(Boolean).join(' · ')) + '</small></button>';
    }).join('');
    sug.hidden = false; pick.setAttribute('aria-expanded', 'true');
    var on = sug.querySelector('.act'); if (on) on.scrollIntoView({ block: 'nearest' });
  }
  function choose(n) {
    var c = opts[n]; if (!c) return;
    var keep = { qty: d.qty, notes: d.notes };
    Object.assign(d, c.custom ? { refId: null, custom: true, chosen: true, name: c.name, weight: 0, cost: 0 } : itemDraftFrom(c), keep, { kind: 'item' });
    pick.value = d.name; hide(); paintFields();
    var f = box.querySelector(c.custom ? '[data-ib="weight"]' : '[data-ib="qty"]'); if (f instanceof HTMLInputElement) { f.focus(); f.select(); }
  }
  pick.addEventListener('input', function () { act = 0; show(); });
  pick.addEventListener('focus', function () { loadCatalog('items'); });
  pick.addEventListener('blur', function () { setTimeout(function () { if (document.activeElement !== pick) { hide(); if (d.chosen) pick.value = d.name; } }, 150); });
  pick.addEventListener('keydown', function (e) {
    if (sug.hidden || !opts.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); act = Math.min(opts.length - 1, act + 1); show(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); act = Math.max(0, act - 1); show(); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(act); }
    else if (e.key === 'Escape') { e.stopPropagation(); hide(); }
  });
  sug.addEventListener('mousedown', function (e) { e.preventDefault(); });
  sug.addEventListener('click', function (e) { var b = e.target.closest('[data-o]'); if (b) choose(+b.getAttribute('data-o')); });
  $('ibCancel').onclick = function () { ui.itemDraft = null; renderSheetPage(); };
  $('ibSave').onclick = function () {
    var errs = itemDraftErrors(d); if (errs.length) { $('ibErr').textContent = errs.join(' '); return; }
    var btns = box.querySelectorAll('.btn'); btns.forEach(function (b) { b.disabled = true; });
    Ops.createSheetItem(s, d).then(function (line) { ui.itemDraft = null; toast(d.editId ? '“' + line.name + '” salvo.' : '“' + line.name + '” adicionado a Meus Itens.'); renderSheetPage(); },
      function (er) { btns.forEach(function (b) { b.disabled = false; }); $('ibErr').textContent = errorText(er); });
  };
}
