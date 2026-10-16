/* =====================================================================
   Hounds — Ficha › Desvantagens
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* Data: sheet.disadvs = [{ name, disadvId?, cost, levels, mod, notes }], in the order the player gave.
   The same as the advantages' (ficha-vantagens.js), without talents:
     cost      the disadvantage's points (0 or less), or each level's when it has levels (Bad Grip, Easy to Kill)
     levels    0: no levels; 1-99 otherwise. The view shows them after the name ("Bad Grip 2")
     mod       enhancements and limitations summed, in %
     notes     the Observações column
     disadvId  the entry of Regras › Desvantagens it was picked from
   Points as the advantages' (advPts; Basic Set, pp. B101-102): cost × levels, with the modifiers
   applied to that and the result rounded up; limitations never take off more than 80% of the cost. */
// A cost typed without the minus sign is still a disadvantage's: 10 is -10.
function disadvCost(v) { return -Math.abs(cleanInt(v, -9999, 9999, 0)) || 0; }
function cleanDisadv(x) {
  var out = { name: String((x && x.name) || '').replace(/\s*\(\s*\)\s*$/, '').trim().slice(0, 120),
    cost: disadvCost(x && x.cost), levels: cleanInt(x && x.levels, 0, 99, 0), mod: cleanInt(x && x.mod, -500, 1000, 0),
    notes: String((x && x.notes) || '').trim().slice(0, 400) };
  if (x && typeof x.disadvId === 'string' && x.disadvId) out.disadvId = x.disadvId.slice(0, 200);
  return out;
}
function sheetDisadvs(s) { return (Array.isArray(s && s.disadvs) ? s.disadvs : []).map(cleanDisadv).filter(function (x) { return x.name; }); }

Ops.saveSheetDisadvs = function (s, list) {
  if (!rawHas('sheets', s.id)) return Promise.reject({ message: 'Essa ficha não existe mais.' });
  return W.store.patch('sheets', s.id, { disadvs: list.map(cleanDisadv).filter(function (x) { return x.name; }), updatedAt: now() });
};

/* ---------- the catalog (Regras › Desvantagens) ---------- */
// The entry a name is about: the name itself; without the specialty in parentheses and the level
// ("Phobia (Spiders)" is Phobias); singular or plural ("Enemy" is Enemies). The disadvantage itself
// before the books' expansions of it.
function disadvFind(name) {
  var list = W.disadvantages || [], n = norm(name).trim(); if (!n || !list.length) return null;
  var bare = n.replace(/\s*\([^)]*\)/g, ' ').replace(/\s+\d+$/, '').replace(/\s+/g, ' ').trim();
  var tries = [n, bare, bare.replace(/s$/, ''), bare + 's', bare.replace(/y$/, 'ies')];
  for (var i = 0; i < tries.length; i++) {
    var hits = list.filter(function (y) { return norm(y.name) === tries[i]; });
    var hit = hits.filter(function (y) { return disadvTypeKey(y.type) !== 'exp'; })[0] || hits[0];
    if (hit) return hit;
  }
  return null;
}
function disadvEntryOf(x) {
  var c = x.disadvId ? disadvById(x.disadvId) : null;
  return c && norm(x.name).indexOf(norm(c.name)) === 0 ? c : disadvFind(x.name);
}
// Cost and levels to start with, from the entry's "Cost": "-10 points", "-5 points/level" (levels),
// "-5 points/TL below" (one per TL: levels too). "-5 or -10 points", "-5 to -15 points" and
// "Variable" are set by hand: the first number, or 0.
function disadvCostOf(c) {
  var t = String(c.cost || '').trim(), m = /^-\s*(\d+)\s*points?\b(.*)$/i.exec(t);
  if (!m) { var first = /-\s*(\d+)/.exec(t); return { cost: first ? -Number(first[1]) : 0, levels: 0, fixed: false }; }
  var per = /^\s*(\/|per\b)/i.test(m[2]);
  return { cost: -Number(m[1]), levels: per ? 1 : 0, fixed: !per && !m[2].trim() };
}
// Entries offered while a name is typed: disadvantages and cross-references (not the expansions,
// which repeat the names) whose name, in English or in Portuguese, is like it (see searchCatalog);
// the most alike first.
function disadvSuggestions(q) {
  if (!norm(q || '').trim()) return [];
  return searchCatalog((W.disadvantages || []).filter(function (c) { return disadvTypeKey(c.type) !== 'exp'; }), q, null).slice(0, 8);
}
// The rules that a row breaks, in short.
function disadvWarnings(x, c) {
  var out = [];
  if (x.mod < -80) out.push('limitações param em -80%');
  if (c && x.levels === 0) {
    var b = disadvCostOf(c);
    if (b.fixed && b.cost !== x.cost) out.push('o livro diz ' + c.cost);
  }
  return out;
}
// Under the name of a row being edited: the page of the entry, its type and cost.
function disadvRulesHtml(x) {
  var c = disadvEntryOf(x), w = disadvWarnings(x, c);
  return (c ? '<a href="' + disadvHref(c.id) + '" data-disadv-modal="' + esc(c.id) + '" title="Ver a desvantagem">' + svg(ICON.disadvantage, 12, 2.2) + esc(c.page || 'Regras') + '</a> ' +
    '<span>' + esc(disadvTypeLabel(c.type) + ' · ' + (c.cost || 'custo no texto') + (c.selfControl ? ' · autocontrole' : '')) + '</span>' : '') +
    (w.length ? '<span class="av-warn">' + esc((c ? ' · ' : '') + w.join(' · ')) + '</span>' : '');
}

/* ---------- view ---------- */
function disadvRowHtml(x) {
  var c = disadvEntryOf(x), name = esc(x.name + (x.levels ? ' ' + x.levels : ''));
  var label = c ? '<a href="' + disadvHref(c.id) + '" data-disadv-modal="' + esc(c.id) + '" title="Ver a desvantagem">' + name + '</a>' : name;
  var sub = [x.levels > 1 ? x.levels + ' níveis × ' + x.cost : '',
    x.mod ? (x.mod > 0 ? '+' : '') + x.mod + '%' + (x.mod < -80 ? ' (vale -80%)' : '') : '',
    c && c.selfControl ? 'teste de autocontrole' : ''].filter(Boolean).join(' · ');
  return '<tr><td><b>' + label + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</td><td class="gpts">' + advPts(x) + '</td>' +
    '<td class="av-notes">' + esc(x.notes) + '</td></tr>';
}
function sheetDisadvsHtml(s, editing) {
  var ui = S.ui, can = canWrite(), list = editing ? ui.disadvDraft : sheetDisadvs(s);
  var head = '<div class="gurps-head">' + gearFoldTitle('disadvs', 'Desvantagens', editing) + '<span class="gurps-total" id="dvTotal">' + advsTotal(list) + ' pts</span>' +
    (editing ? secSaveBtnsHtml('dvCancel', 'dvSave', 'desvantagens')
      : can && !sheetDraftOpen() ? secEditBtnHtml('dvEdit', 'desvantagens') : '') + '</div>';
  if (editing) {
    return '<section class="gurps' + gearFoldClass('disadvs', editing) + '" id="disadvs">' + head +
      // New disadvantages go on top, under the button.
      '<div class="box sk-edit"><div><button class="btn" type="button" id="dvAdd">' + svg(ICON.plus, 15, 2.4) + 'Adicionar desvantagem</button></div>' +
      '<div class="sk-row av-row sk-labels" aria-hidden="true"><span>Desvantagem</span><span>Custo</span><span>Níveis</span><span>Mod. %</span><span>Pts</span><span>Observações</span><span></span></div>' +
      '<div id="dvRows">' + list.map(function (x, i) { return disadvEditRow(x, i); }).join('') + '</div>' +
      '<p class="hint-text">Custo é o da desvantagem, ou o de cada nível quando ela tem níveis (0 níveis: sem níveis), e é negativo: digitado sem o sinal, conta como negativo. ' +
      'Mod. % soma ampliações (+) e limitações (−): os pontos são custo × níveis com o modificador aplicado, arredondando para cima, e as limitações não tiram mais de 80% (Basic Set, pp. B101-102). ' +
      'Ao escolher da lista, custo e níveis vêm do livro.</p></div>' +
      '<div class="form-err" id="dvErr" role="alert"></div></section>';
  }
  if (!list.length) return '<section class="gurps' + gearFoldClass('disadvs', editing) + '" id="disadvs">' + head + '<p class="long none">Nenhuma desvantagem cadastrada.' + (can ? ' Use <b>Editar</b> para adicionar.' : '') + '</p></section>';
  // Links to the catalog: it arrives once and the page redraws with it.
  loadCatalog('disadvantages');
  return '<section class="gurps' + gearFoldClass('disadvs', editing) + '" id="disadvs">' + head +
    '<table class="gtab av-tab"><thead><tr><th>Desvantagem</th><th>Pts</th><th>Observações</th></tr></thead><tbody>' +
    list.map(function (x) { return disadvRowHtml(x); }).join('') + '</tbody>' +
    '<tfoot><tr><td>Total pontos desvantagens</td><td class="gpts">' + advsTotal(list) + '</td><td></td></tr></tfoot></table></section>';
}

/* ---------- editor ---------- */
function disadvEditRow(x, i) {
  function num(f, lo, hi, label) {
    return '<input type="number" data-f="' + f + '" min="' + lo + '" max="' + hi + '" step="1" inputmode="numeric" aria-label="' + label + '" value="' + x[f] + '">';
  }
  return '<div class="sk-row av-row" data-i="' + i + '">' +
    '<div class="sk-namecell"><div class="sk-pick">' +
    '<input class="sk-name" type="text" data-f="name" maxlength="120" placeholder="Digite para buscar. Ex.: Bad Temper" aria-label="Desvantagem" value="' + esc(x.name) + '"' +
    ' autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="dvSug' + i + '">' +
    '<div class="suggest" id="dvSug' + i + '" role="listbox" hidden></div></div>' +
    '<div class="sk-rules" data-rules="' + i + '">' + disadvRulesHtml(x) + '</div></div>' +
    num('cost', -9999, 0, 'Custo') + num('levels', 0, 99, 'Níveis') + num('mod', -500, 1000, 'Modificador em %') +
    '<span class="sk-nh av-pts" data-pts="' + i + '">' + advPts(x) + ' pts</span>' +
    '<input type="text" data-f="notes" maxlength="400" placeholder="Ex.: autocontrole 12" aria-label="Observações" value="' + esc(x.notes) + '">' +
    '<button class="icon-btn" type="button" data-del="' + i + '" aria-label="Remover desvantagem" title="Remover">' + svg(ICON.x, 15, 2.4) + '</button></div>';
}
// While editing, S.ui.disadvDraft holds the list being changed; typing updates it and the points and
// total beside it, adding or removing a row redraws the page from it.
function wireSheetDisadvs(s) {
  var ui = S.ui;
  function focusFirst() { var f = document.querySelector('#dvRows .sk-name'); if (f instanceof HTMLElement) f.focus(); }
  var ed = $('dvEdit'); if (ed) ed.onclick = function () {
    ui.disadvDraft = sheetDisadvs(s);
    if (!ui.disadvDraft.length) ui.disadvDraft.push(cleanDisadv({ name: '', cost: 0 }));
    renderSheetPage(); focusFirst();
  };
  var d = ui.disadvDraft, box = $('disadvs'); if (!d || !box || !$('dvSave')) return;
  function paintRow(i) {
    var x = d[i], pts = box.querySelector('[data-pts="' + i + '"]'), rules = box.querySelector('[data-rules="' + i + '"]');
    if (pts) pts.textContent = advPts(x) + ' pts';
    if (rules) rules.innerHTML = disadvRulesHtml(x);
    $('dvTotal').textContent = advsTotal(d) + ' pts';
  }
  function onEdit(e) {
    var el = e.target, f = el.dataset && el.dataset.f, row = el.closest && el.closest('[data-i]'); if (!row || !f) return;
    var i = +row.getAttribute('data-i'), x = d[i];
    if (f === 'name' || f === 'notes') x[f] = el.value;
    else if (el.value !== '') x[f] = f === 'cost' ? disadvCost(el.value) : f === 'mod' ? cleanInt(el.value, -500, 1000, 0) : cleanInt(el.value, 0, 99, 0);
    // Another name than the entry picked from the list: the link goes.
    if (f === 'name' && x.disadvId && disadvById(x.disadvId) && norm(x.name).indexOf(norm(disadvById(x.disadvId).name)) !== 0) delete x.disadvId;
    paintRow(i);
  }
  box.addEventListener('input', onEdit); box.addEventListener('change', onEdit);
  loadCatalog('disadvantages').then(function () { if (ui.disadvDraft === d) d.forEach(function (x, i) { paintRow(i); }); });
  // Suggestions from Regras › Desvantagens under the name being typed; picking one fills the name,
  // cost and levels and links the row to the entry.
  var sug = { i: -1, list: null, input: null, options: [], active: 0 };
  function hideSug() {
    if (sug.list) { sug.list.hidden = true; sug.input.setAttribute('aria-expanded', 'false'); sug.input.removeAttribute('aria-activedescendant'); }
    sug.i = -1; sug.list = null; sug.input = null; sug.options = [];
  }
  function paintSug(input) {
    var row = input.closest('[data-i]'), i = row ? +row.getAttribute('data-i') : -1, list = row && row.querySelector('.suggest');
    if (!list) return;
    if (sug.list && sug.list !== list) hideSug();
    var options = disadvSuggestions(input.value);
    if (!options.length || (options.length === 1 && options[0].id === d[i].disadvId)) { sug.list = list; sug.input = input; hideSug(); return; }
    sug.i = i; sug.list = list; sug.input = input; sug.options = options; sug.active = Math.min(sug.active, options.length - 1);
    list.innerHTML = options.map(function (c, n) {
      return '<button type="button" role="option" id="dvSug' + i + 'o' + n + '" data-o="' + n + '" class="' + (n === sug.active ? 'act' : '') + '" aria-selected="' + (n === sug.active) + '">' +
        '<span>' + esc(c.name) + ptNameHtml(c) + '</span><small>' + esc(disadvTypeLabel(c.type) + ' · ' + (c.cost || '') + (c.page ? ' · ' + c.page : '')) + '</small></button>';
    }).join('');
    list.hidden = false; input.setAttribute('aria-expanded', 'true'); input.setAttribute('aria-activedescendant', 'dvSug' + i + 'o' + sug.active);
  }
  function pickSug(n) {
    var c = sug.options[n], i = sug.i, input = sug.input; if (!c || i < 0) return;
    var x = d[i], row = input.closest('[data-i]'), cost = disadvCostOf(c);
    // Phobias, Code of Honor and the like are named by what they cover: "()" with the cursor inside.
    var spec = /^(addiction|code of honor|compulsive behavior|delusions|dependency|dependents|disciplines of faith|divine curse|dread|duty|enemies|fanaticism|intolerance|obsession|odious personal habits|phobias|restricted diet|revulsion|secret|sense of duty|social stigma|susceptible|trademark|vow|vulnerability|weakness)$/i.test(c.name);
    x.name = c.name + (spec ? ' ()' : ''); x.disadvId = c.id; x.cost = cost.cost; x.levels = cost.levels;
    input.value = x.name;
    row.querySelector('[data-f="cost"]').value = String(x.cost);
    row.querySelector('[data-f="levels"]').value = String(x.levels);
    hideSug(); paintRow(i);
    if (spec) { input.focus(); input.setSelectionRange(x.name.length - 1, x.name.length - 1); }
    else { var next = row.querySelector(cost.fixed ? '[data-f="notes"]' : '[data-f="cost"]'); next.focus(); if (next.select) next.select(); }
  }
  var rows = $('dvRows');
  function nameInput(e) { var t = /** @type {AnyEl} */ (e.target); return t && t.classList && t.classList.contains('sk-name') ? t : null; }
  rows.addEventListener('input', function (e) { var t = nameInput(e); if (t) { sug.active = 0; paintSug(t); } });
  rows.addEventListener('focusin', function (e) { var t = nameInput(e); if (t) { sug.active = 0; paintSug(t); } });
  rows.addEventListener('focusout', function (e) {
    var input = nameInput(e); if (!input) return;
    setTimeout(function () { if (sug.input === input && document.activeElement !== input) hideSug(); }, 150);
  });
  rows.addEventListener('keydown', function (e) {
    var t = nameInput(e);
    if (!t || sug.input !== t || !sug.options.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); sug.active = Math.min(sug.options.length - 1, sug.active + 1); paintSug(t); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sug.active = Math.max(0, sug.active - 1); paintSug(t); }
    else if (e.key === 'Enter') { e.preventDefault(); pickSug(sug.active); }
    else if (e.key === 'Escape') { e.stopPropagation(); hideSug(); }
  });
  rows.addEventListener('mousedown', function (e) { if (e.target.closest('.suggest')) e.preventDefault(); });
  rows.addEventListener('click', function (e) { var b = e.target.closest('.suggest [data-o]'); if (b) pickSug(+b.getAttribute('data-o')); });
  box.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-del]'); if (!b) return;
    d.splice(+b.getAttribute('data-del'), 1); renderSheetPage();
  });
  $('dvAdd').onclick = function () { d.unshift(cleanDisadv({ name: '', cost: 0 })); renderSheetPage(); focusFirst(); };
  $('dvCancel').onclick = function () { ui.disadvDraft = null; renderSheetPage(); };
  $('dvSave').onclick = function () {
    var btn = $('dvSave'); btn.disabled = true; btn.textContent = 'Salvando…'; $('dvCancel').disabled = true;
    Ops.saveSheetDisadvs(s, d).then(function () { ui.disadvDraft = null; toast('Desvantagens salvas.'); renderSheetPage(); }, function (er) {
      btn.disabled = false; btn.textContent = 'Salvar'; $('dvCancel').disabled = false;
      $('dvErr').textContent = errorText(er);
    });
  };
}
