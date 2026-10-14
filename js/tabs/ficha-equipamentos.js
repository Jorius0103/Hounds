/* =====================================================================
   Hounds — Ficha › Equipamentos
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* Data: sheet.equip = [{ name, qty, weight, cost, carried, notes }], in the order the player gave.
     qty      how many; 0 keeps the line (what ran out and is to be bought again)
     weight   lbs of one; cost: $ of one. The table shows the line's total
     carried  false: kept somewhere else (the horse, the inn); its weight does not count
     notes    the Observações column
   The carried weight against Basic Lift gives the encumbrance level (Basic Set, p. B17). The
   sheet keeps the level in Atributos › Peso (attrs.enc), set by hand: this section shows the
   level of the equipment and offers to use it there. */
// [up to how many times Basic Lift, name] of the levels 0 to 4; more than 10 × BL: no moving.
var EQ_LEVELS = /** @type {[number, string][]} */ ([[1, 'Nenhuma'], [2, 'Leve'], [3, 'Média'], [6, 'Pesada'], [10, 'Muito Pesada']]);
// Weight and cost take cents; never negative.
function cleanDec(v, hi, dflt) { var n = Number(v); return isFinite(n) && v !== '' && v != null ? Math.min(hi, Math.max(0, Math.round(n * 100) / 100)) : dflt; }
function cleanEquip(x) {
  x = x || {};
  return { name: String(x.name || '').trim().slice(0, 120), qty: cleanInt(x.qty, 0, 9999, 1), weight: cleanDec(x.weight, 99999, 0),
    cost: cleanDec(x.cost, 9999999, 0), carried: x.carried !== false, notes: String(x.notes || '').trim().slice(0, 400) };
}
function sheetEquip(s) { return (Array.isArray(s && s.equip) ? s.equip : []).map(cleanEquip).filter(function (x) { return x.name; }); }
function eqRound(n) { return Math.round(n * 100) / 100; }
// Weights of what is carried and of what is kept elsewhere, and the cost of everything.
function equipTotals(list) {
  var t = { carried: 0, stored: 0, cost: 0 };
  list.forEach(function (x) { var w = x.qty * x.weight; if (x.carried) t.carried += w; else t.stored += w; t.cost += x.qty * x.cost; });
  return { carried: eqRound(t.carried), stored: eqRound(t.stored), cost: eqRound(t.cost) };
}
// 0 to 4; 5 is more than Extra-Heavy.
function equipLevel(weight, lift) {
  for (var i = 0; i < EQ_LEVELS.length; i++) if (weight <= EQ_LEVELS[i][0] * lift) return i;
  return EQ_LEVELS.length;
}
// "1.250,5"
function eqNum(n) { return n.toLocaleString('pt-BR', { maximumFractionDigits: 2 }); }
function eqLbs(n) { return eqNum(n) + ' lbs'; }
function eqMoney(n) { return '$' + eqNum(n); }

Ops.saveSheetEquip = function (s, list) {
  if (!rawHas('sheets', s.id)) return Promise.reject({ message: 'Essa ficha não existe mais.' });
  return W.store.patch('sheets', s.id, { equip: list.map(cleanEquip).filter(function (x) { return x.name; }), updatedAt: now() });
};

/* ---------- view ---------- */
function equipStatsHtml(t, a) {
  var lift = gurpsStats(a).lift, lv = equipLevel(t.carried, lift), over = lv >= EQ_LEVELS.length;
  function stat(label, val, note) { return '<div class="gstat"><span>' + label + '</span><strong>' + val + '</strong>' + (note ? '<small>' + note + '</small>' : '') + '</div>'; }
  function times(n) { return n === 1 ? 'Carga Básica' : n + ' × Carga Básica'; }
  return stat('Peso carregado', esc(eqLbs(t.carried)), t.stored ? esc(eqLbs(t.stored)) + ' guardados, fora da conta' : 'tudo com o personagem') +
    stat('Nível de carga', over ? 'Acima do limite' : esc(EQ_LEVELS[lv][1]) + ' (' + lv + ')',
      over ? 'mais de ' + esc(eqLbs(10 * lift)) + ' (' + times(10) + '): não consegue se mover' : 'até ' + esc(eqLbs(EQ_LEVELS[lv][0] * lift)) + ' (' + times(EQ_LEVELS[lv][0]) + ')') +
    stat('Custo total', esc(eqMoney(t.cost)), 'de tudo, guardado ou não');
}
// The equipment's level against Atributos › Peso: a line and a button when they differ.
function equipEncHtml(t, a) {
  var lv = Math.min(equipLevel(t.carried, gurpsStats(a).lift), EQ_LEVELS.length - 1);
  if (lv === a.enc || !canWrite() || S.ui.attrDraft) return '';
  return '<p class="eq-enc">' + svg(ICON.info, 15) + '<span>Em Atributos, Peso está em <b>' + a.enc + '</b>; pelo equipamento carregado seria <b>' + lv + '</b> (' + esc(EQ_LEVELS[lv][1].toLowerCase()) + ').</span>' +
    '<button class="btn" type="button" id="eqUseEnc" data-enc="' + lv + '">Usar ' + lv + ' em Peso</button></p>';
}
function equipRowHtml(x) {
  var sub = [x.carried ? '' : 'guardado · fora do peso carregado', x.qty === 0 ? 'acabou' : ''].filter(Boolean).join(' · ');
  function each(total, one, fmt) { return total ? esc(fmt(total)) + (x.qty > 1 ? '<small>' + esc(fmt(one)) + ' cada</small>' : '') : '<span class="eq-none">—</span>'; }
  // On a phone the Observações column goes and the notes show under the name (see paginas.css).
  return '<tr' + (x.carried ? '' : ' class="eq-stored"') + '><td><b>' + esc(x.name) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') +
    (x.notes ? '<small class="eq-note">' + esc(x.notes) + '</small>' : '') + '</td>' +
    '<td class="eq-qty">' + x.qty + '</td><td>' + each(eqRound(x.qty * x.weight), x.weight, eqLbs) + '</td><td>' + each(eqRound(x.qty * x.cost), x.cost, eqMoney) + '</td>' +
    '<td class="av-notes">' + esc(x.notes) + '</td></tr>';
}
function sheetEquipHtml(s, editing) {
  var ui = S.ui, can = canWrite(), list = editing ? ui.equipDraft : sheetEquip(s), a = ui.attrDraft || sheetAttrs(s);
  var t = equipTotals(editing ? list.map(cleanEquip) : list);
  var head = '<div class="gurps-head"><h2 class="sec-title">Equipamentos</h2><span class="gurps-total" id="eqTotal" title="Peso carregado">' + esc(eqLbs(t.carried)) + '</span>' +
    (editing ? '<div class="btn-row"><button class="btn ghost" type="button" id="eqCancel">Cancelar</button><button class="btn primary" type="button" id="eqSave">Salvar equipamentos</button></div>'
      : can ? '<div class="btn-row"><button class="btn" type="button" id="eqEdit">' + svg(ICON.edit, 15) + 'Editar equipamentos</button></div>' : '') + '</div>';
  var stats = '<div class="gurps-derived" id="eqStats">' + equipStatsHtml(t, a) + '</div>';
  if (editing) {
    return '<section class="gurps" id="equip">' + head +
      '<div class="box sk-edit"><div class="sk-row eq-row sk-labels" aria-hidden="true"><span>Item</span><span>Qtd.</span><span>Peso (lbs)</span><span>Custo ($)</span><span></span><span>Observações</span><span></span></div>' +
      '<div id="eqRows">' + list.map(equipEditRow).join('') + '</div>' +
      '<div><button class="btn" type="button" id="eqAdd">' + svg(ICON.plus, 15, 2.4) + 'Adicionar item</button></div>' +
      '<p class="hint-text">Peso e custo são de uma unidade; a tabela mostra o total de cada linha. Desmarque <b>Carregado</b> no que fica guardado (no cavalo, na estalagem): o peso dele não entra na carga. ' +
      'O nível de carga vem do peso carregado comparado com a Carga Básica: até 1× nenhuma, 2× leve, 3× média, 6× pesada e 10× muito pesada (Basic Set, p. B17).</p></div>' +
      stats + '<div class="form-err" id="eqErr" role="alert"></div></section>';
  }
  if (!list.length) return '<section class="gurps" id="equip">' + head + '<p class="long none">Nenhum equipamento cadastrado.' + (can ? ' Use <b>Editar equipamentos</b> para adicionar.' : '') + '</p></section>';
  return '<section class="gurps" id="equip">' + head +
    '<table class="gtab eq-tab"><thead><tr><th>Item</th><th>Qtd.</th><th>Peso</th><th>Custo</th><th>Observações</th></tr></thead><tbody>' +
    list.map(equipRowHtml).join('') + '</tbody>' +
    '<tfoot><tr><td colspan="2">Total</td><td>' + esc(eqLbs(t.carried)) + '<small>carregado' + (t.stored ? ' · mais ' + esc(eqLbs(t.stored)) + ' guardados' : '') + '</small></td>' +
    '<td>' + esc(eqMoney(t.cost)) + '</td><td></td></tr></tfoot></table>' + stats + equipEncHtml(t, a) + '</section>';
}

/* ---------- editor ---------- */
function equipEditRow(x, i) {
  function num(f, hi, step, label) {
    return '<input type="number" data-f="' + f + '" min="0" max="' + hi + '" step="' + step + '" inputmode="' + (step === '1' ? 'numeric' : 'decimal') + '" aria-label="' + label + '" value="' + x[f] + '">';
  }
  return '<div class="sk-row eq-row" data-i="' + i + '">' +
    '<input class="sk-name" type="text" data-f="name" maxlength="120" placeholder="Ex.: Mochila, Corda (10 m), Ração de viagem" aria-label="Item" value="' + esc(x.name) + '">' +
    num('qty', 9999, '1', 'Quantidade') + num('weight', 99999, 'any', 'Peso de uma unidade, em lbs') + num('cost', 9999999, 'any', 'Custo de uma unidade, em $') +
    '<label class="eq-carried" title="Desmarque se fica guardado: o peso não entra na carga"><input type="checkbox" data-f="carried"' + (x.carried ? ' checked' : '') + '><span>Carregado</span></label>' +
    '<input type="text" data-f="notes" maxlength="400" placeholder="Ex.: no cavalo, presente do conde" aria-label="Observações" value="' + esc(x.notes) + '">' +
    '<button class="icon-btn" type="button" data-del="' + i + '" aria-label="Remover item" title="Remover">' + svg(ICON.x, 15, 2.4) + '</button></div>';
}
// While editing, S.ui.equipDraft holds the list being changed; typing updates it and the weights
// and cost beside it, adding or removing a row redraws the page from it.
function wireSheetEquip(s) {
  var ui = S.ui;
  function focusLast() { var l = document.querySelectorAll('#eqRows .sk-name'); var f = l[l.length - 1]; if (f instanceof HTMLElement) f.focus(); }
  var ed = $('eqEdit'); if (ed) ed.onclick = function () {
    ui.equipDraft = sheetEquip(s);
    if (!ui.equipDraft.length) ui.equipDraft.push(cleanEquip({}));
    renderSheetPage(); focusLast();
  };
  var use = $('eqUseEnc'); if (use) use.onclick = function () {
    var n = +use.getAttribute('data-enc'); use.disabled = true;
    Ops.saveSheetAttrs(s, Object.assign(sheetAttrs(s), { enc: n })).then(function () { toast('Peso em Atributos agora é ' + n + '.'); renderSheetPage(); }, function (er) {
      use.disabled = false; toast(errorText(er), true);
    });
  };
  var d = ui.equipDraft, box = $('equip'); if (!d || !box || !$('eqSave')) return;
  var a = ui.attrDraft || sheetAttrs(s);
  function paint() {
    var t = equipTotals(d.map(cleanEquip));
    $('eqTotal').textContent = eqLbs(t.carried);
    $('eqStats').innerHTML = equipStatsHtml(t, a);
  }
  function onEdit(e) {
    var el = e.target, f = el.dataset && el.dataset.f, row = el.closest && el.closest('[data-i]'); if (!f || !row) return;
    var x = d[+row.getAttribute('data-i')];
    if (f === 'carried') x.carried = el.checked;
    else if (f === 'name' || f === 'notes') x[f] = el.value;
    else if (el.value !== '') x[f] = f === 'qty' ? cleanInt(el.value, 0, 9999, 1) : cleanDec(el.value, f === 'cost' ? 9999999 : 99999, 0);
    // A number field left empty shows again the value it keeps.
    else if (e.type === 'change') el.value = String(x[f]);
    paint();
  }
  box.addEventListener('input', onEdit); box.addEventListener('change', onEdit);
  box.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-del]'); if (!b) return;
    d.splice(+b.getAttribute('data-del'), 1); renderSheetPage();
  });
  $('eqAdd').onclick = function () { d.push(cleanEquip({})); renderSheetPage(); focusLast(); };
  $('eqCancel').onclick = function () { ui.equipDraft = null; renderSheetPage(); };
  $('eqSave').onclick = function () {
    var btn = $('eqSave'); btn.disabled = true; btn.textContent = 'Salvando…'; $('eqCancel').disabled = true;
    Ops.saveSheetEquip(s, d).then(function () { ui.equipDraft = null; toast('Equipamentos salvos.'); renderSheetPage(); }, function (er) {
      btn.disabled = false; btn.textContent = 'Salvar equipamentos'; $('eqCancel').disabled = false;
      $('eqErr').textContent = errorText(er);
    });
  };
}
