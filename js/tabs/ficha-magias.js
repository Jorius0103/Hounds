/* =====================================================================
   Hounds — Ficha › Magia
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   GURPS 4ª ed.: magias da ficha, divididas por escola.
   sheet.spells is a list of { name, college, diff, pts, bonus, bonusNote?, spellId? }, like the
   skills (see tab-fichas.js): a spell is an IQ skill, Hard or Very Hard, bought with the same
   table (Basic Set, p. 170), with no default (B235): with 0 points it has no level. college is
   the school the spell is shown under (the first of the book's when picked from Regras › Magias);
   empty, it goes to "Sem escola". Magery adds its level to every spell (B66): it comes from the
   sheet's Vantagens or Combate's traits, like the talents' bonus (k.tbonus, never saved).
   fav: true marks a favorite (the star on each spell): the favorites are shown together in the
   Favoritos table, at the top of the tab, and still in their school's table.
   ===================================================================== */
ICON.star = '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>';
// The schools in Portuguese, for the tables; the book's name shows on hover. One not here keeps its name.
var SPELL_COLLEGE_PT = {
  'Air': 'Ar', 'Animal': 'Animais', 'Body Control': 'Controle do Corpo', 'Communication and Empathy': 'Comunicação e Empatia',
  'Earth': 'Terra', 'Enchantment': 'Encantamento', 'Fire': 'Fogo', 'Food': 'Alimentos', 'Gate': 'Portais', 'Healing': 'Cura',
  'Illusion and Creation': 'Ilusão e Criação', 'Knowledge': 'Conhecimento', 'Light and Darkness': 'Luz e Trevas',
  'Making and Breaking': 'Construção e Destruição', 'Meta-Spells': 'Metamagia', 'Mind Control': 'Controle da Mente',
  'Movement': 'Movimento', 'Necromantic': 'Necromancia', 'Plant': 'Plantas', 'Protection and Warning': 'Proteção e Alerta',
  'Sound': 'Som', 'Technological': 'Tecnologia', 'Water': 'Água', 'Weather': 'Clima', 'Secret': 'Segredo', 'Imbuing': 'Imbuição'
};
var SHEET_SPELL_DIFFS = ['H', 'VH'];
function collegeLabel(c) { return c ? SPELL_COLLEGE_PT[c] || c : 'Sem escola'; }
function cleanSheetSpell(k) {
  var out = { name: String((k && k.name) || '').trim().slice(0, 100), college: String((k && k.college) || '').trim().slice(0, 100),
    diff: k && k.diff === 'VH' ? 'VH' : 'H', pts: cleanInt(k && k.pts, 0, 999, 1), bonus: cleanInt(k && k.bonus, -20, 20, 0) };
  var note = out.bonus ? cleanBonusNote(k && k.bonusNote) : ''; if (note) out.bonusNote = note;
  if (k && typeof k.spellId === 'string' && k.spellId) out.spellId = k.spellId.slice(0, 200);
  if (k && k.fav === true) out.fav = true;
  return out;
}
function sheetSpells(s) { return (Array.isArray(s && s.spells) ? s.spells : []).map(cleanSheetSpell).filter(function (k) { return k.name; }); }

// Magery of the sheet: the highest among Vantagens (the number in the name, "Magery 3", or the
// levels) and Combate's traits (the number in the name); null without it.
var MAGERY_RE = /^Magery\b/i;
function sheetMagery(s) {
  var best = null;
  sheetAdvs(s).concat(scAllItems(sheetCombat(s)).filter(function (x) { return x.kind === 'trait'; })).forEach(function (x) {
    if (!MAGERY_RE.test(x.name)) return;
    var m = /^Magery\s+(\d+)/i.exec(x.name), lv = m ? +m[1] : x.levels || 0;
    if (!best || lv > best.n) best = { n: lv };
  });
  return best;
}
// Marks each spell with Magery's bonus and the advantages' effects (k.tbonus, k.tfrom; see
// skillBonusTitle and ficha-efeitos.js). Returns the list.
function applyMagery(list, s) {
  var m = sheetMagery(s);
  list.forEach(function (k) {
    var c = sheetSpellLink(k), colleges = [k.college].concat(c && c.college ? c.college.split(',') : [])
      .map(function (x) { return String(x).trim(); }).filter(Boolean);
    var fx = fxForSpell(s, k, colleges), from = m && m.n ? ['+' + m.n + ' de Magery ' + m.n] : [];
    k.tbonus = (m ? m.n : 0) + fx.n; k.tfrom = joinE(from.concat(fxParts(fx)));
    k.tsrc = (m && m.n ? [{ n: m.n, from: 'Magery ' + m.n }] : []).concat(fx.used.map(function (x) { return { n: x.v, from: x.from }; }));
    k.tcond = fxCondNotes(fx);
  });
  return list;
}
// Level relative to IQ, bonuses included; null with 0 points (spells have no default).
function sheetSpellRel(k) { return k.pts > 0 ? SKILL_DIFFS[k.diff][1] + skillStep(k.pts) + (k.bonus || 0) + (k.tbonus || 0) : null; }
function sheetSpellNh(k, iq) {
  var rel = sheetSpellRel(k);
  if (rel == null) return { rel: '—', lvl: 'sem pontos' };
  return { rel: 'IQ' + (rel > 0 ? '+' + rel : rel < 0 ? String(rel) : ''), lvl: String(iq + rel) };
}
function sheetSpellEditNhHtml(k, iq) {
  var nh = sheetSpellNh(k, iq), w = skillWaste(k);
  return nhHtml(nh) + (w ? '<small class="sk-waste">' + w + ' pt sem efeito</small>' : '');
}
// The spells by school: in the order of the Portuguese names, "Sem escola" last.
function sheetSpellGroups(list) {
  var by = {};
  list.forEach(function (k) { (by[k.college] = by[k.college] || []).push(k); });
  return Object.keys(by).sort(function (a, b) { return (a ? 0 : 1) - (b ? 0 : 1) || collegeLabel(a).localeCompare(collegeLabel(b), 'pt'); })
    .map(function (c, n) { return { college: c, list: by[c], n: n }; });
}

Ops.saveSheetSpells = function (s, list) {
  if (!rawHas('sheets', s.id)) return Promise.reject({ message: 'Essa ficha não existe mais.' });
  return W.store.patch('sheets', s.id, { spells: list.map(cleanSheetSpell).filter(function (k) { return k.name; }).sort(byName), updatedAt: now() });
};

// The entry of Regras › Magias a sheet spell was picked from, while its name still starts with the entry's.
function sheetSpellLink(k) {
  var c = k && k.spellId ? spellById(k.spellId) : null;
  return c && norm(k.name).indexOf(norm(c.name)) === 0 ? c : null;
}
// Under the name of a linked row: the page of the entry, its class and prerequisites.
function sheetSpellRulesHtml(k) {
  var c = sheetSpellLink(k); if (!c) return '';
  var rules = [c.class || '', c.prerequisites ? 'Pré-requisitos: ' + c.prerequisites : ''].filter(Boolean).join(' · ');
  return '<a href="' + spellHref(c.id) + '" data-spell-modal="' + esc(c.id) + '" title="Ver as regras desta magia">' + svg(ICON.spell, 12, 2.2) + esc(c.page || 'Regras') + '</a>' +
    (rules ? ' <span title="' + esc(rules) + '">' + esc(rules) + '</span>' : '');
}
function sheetSpellSuggestions(q) {
  if (!norm(q || '').trim()) return [];
  return searchCatalog(W.spells || [], q, null).slice(0, 8);
}

function sheetSpellNhCell(k, iq) {
  var nh = sheetSpellNh(k, iq), t = skillBonusTitle(k);
  return '<td class="gnh' + (t ? ' bonus' : '') + '" data-gnh="' + k.i + '">' + calcBtn(nhHtml(nh), spellCalc(k, iq), t) + '</td>';
}
// The schools in three tables, in order: a table takes the next school while it stays within a
// third of the rows (a school counts its spells and its title row).
function sheetSpellColumns(groups) {
  var total = groups.reduce(function (n, g) { return n + g.list.length + 1; }, 0), cols = [[]], rows = 0;
  groups.forEach(function (g) {
    var size = g.list.length + 1;
    if (cols[cols.length - 1].length && cols.length < 3 && rows + size / 2 > total * cols.length / 3) cols.push([]);
    cols[cols.length - 1].push(g); rows += size;
  });
  return cols;
}
function sheetSpellTableHtml(col, iq, can) {
  return '<table class="gtab"><thead><tr><th>Magia</th><th>Pontos</th><th>NH</th></tr></thead>' +
    col.map(function (g) { return sheetSpellGroupHtml(g, iq, can); }).join('') + '</table>';
}
// The star of a spell: a button that marks or unmarks it (attr: data-fav in the tables, data-efav in
// the editor, with the position); without can, only the mark of a favorite.
function sheetSpellFavHtml(k, can, attr, i) {
  var on = !!k.fav;
  if (!can) return on ? '<span class="sp-fav on" title="Favorita">' + svg(ICON.star, 14, 2) + '</span>' : '';
  return '<button type="button" class="sp-fav' + (on ? ' on' : '') + '" ' + attr + '="' + i + '" aria-pressed="' + on + '"' +
    ' aria-label="' + (on ? 'Tirar ' + esc(k.name) + ' dos favoritos' : 'Marcar ' + esc(k.name) + ' como favorita') + '" title="' + (on ? 'Tirar dos favoritos' : 'Marcar como favorita') + '">' + svg(ICON.star, 14, 2) + '</button>';
}
// A spell's row: k.i is its position in sheet.spells; sub, what goes under the name after the difficulty.
function sheetSpellRowHtml(k, iq, can, sub) {
  var name = k.spellId ? '<a href="' + spellHref(k.spellId) + '" data-spell-modal="' + esc(k.spellId) + '" title="Ver as regras da magia">' + esc(k.name) + '</a>' : esc(k.name);
  return '<tr><td><div class="sp-name">' + sheetSpellFavHtml(k, can, 'data-fav', k.i) + '<div><b>' + name + '</b><small>IQ/' + k.diff + (sub ? ' · ' + esc(sub) : '') + '</small></div></div></td><td class="gpts">' +
    (can ? '<input class="gpts-in" type="number" min="0" max="999" step="1" inputmode="numeric" data-k="' + k.i + '" value="' + k.pts + '" aria-label="Pontos em ' + esc(k.name) + '">' : k.pts) + '</td>' +
    sheetSpellNhCell(k, iq) + '</tr>';
}
// One school, a tbody with its title and total; g.n is the position of the school.
function sheetSpellGroupHtml(g, iq, can) {
  var label = collegeLabel(g.college);
  return '<tbody><tr class="gschool"><td colspan="2"' + (g.college && label !== g.college ? ' title="' + esc(g.college) + '"' : '') + '>' + esc(label) + '</td>' +
    '<td class="gpts" data-gtot="' + g.n + '" title="Pontos em ' + esc(label) + '">' + sumPts(g.list) + '</td></tr>' +
    g.list.map(function (k) { var c = sheetSpellLink(k); return sheetSpellRowHtml(k, iq, can, c && c.class); }).join('') + '</tbody>';
}
// Favoritos: a section of its own, above Magias, with the favorite spells together, in name order,
// with their school. list: the saved spells (k.i set, Magery applied).
function sheetSpellFavsHtml(list, iq, can) {
  var favs = list.filter(function (k) { return k.fav; });
  return '<section class="gurps' + gearFoldClass('spellFavs', false) + '" id="sheetSpellFavs"><div class="gurps-head">' + sheetGripHtml('Favoritos') +
    gearFoldTitle('spellFavs', '<span class="sp-favs-title">' + svg(ICON.star, 15, 2.2) + 'Favoritos</span>', false) +
    '<span class="gurps-total">' + plural(favs.length, 'magia', 'magias') + '</span></div>' +
    '<table class="gtab sp-favs"><thead><tr><th>Magia</th><th>Pontos</th><th>NH</th></tr></thead><tbody>' +
    (favs.length ? favs.map(function (k) { return sheetSpellRowHtml(k, iq, can, collegeLabel(k.college)); }).join('')
      : '<tr><td colspan="3" class="gnone">Nenhuma magia favorita.' + (can ? ' Marque a estrela de uma magia em Magias para ela aparecer aqui.' : '') + '</td></tr>') + '</tbody></table></section>';
}
function sheetSpellEditRow(k, i, iq) {
  var t = skillBonusTitle(k);
  return '<div class="sk-row sp-row" data-i="' + i + '">' +
    '<div class="sk-namecell"><div class="sk-pick">' +
    '<input class="sk-name" type="text" data-f="name" maxlength="100" placeholder="Digite para buscar. Ex.: Fireball, Bola de Fogo" aria-label="Magia" value="' + esc(k.name) + '"' +
    ' autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="spSug' + i + '">' +
    '<div class="suggest" id="spSug' + i + '" role="listbox" hidden></div></div>' +
    '<div class="sk-rules" data-rules="' + i + '">' + sheetSpellRulesHtml(k) + '</div></div>' +
    '<input type="text" data-f="college" list="spColleges" maxlength="100" placeholder="Escola" aria-label="Escola" value="' + esc(k.college) + '">' +
    '<select data-f="diff" aria-label="Dificuldade">' + SHEET_SPELL_DIFFS.map(function (x) { return '<option value="' + x + '"' + (x === k.diff ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select>' +
    '<input type="number" data-f="pts" min="0" max="999" step="1" inputmode="numeric" aria-label="Pontos" value="' + k.pts + '">' +
    '<input type="number" data-f="bonus" min="-20" max="20" step="1" inputmode="numeric" aria-label="Bônus" value="' + k.bonus + '">' +
    '<span class="sk-nh' + (k.bonus || k.tbonus ? ' bonus' : '') + '" data-nh="' + i + '"' + (t ? ' title="' + esc(t) + '"' : '') + '>' + sheetSpellEditNhHtml(k, iq) + '</span>' +
    sheetSpellFavHtml(k, true, 'data-efav', i) +
    '<button class="icon-btn" type="button" data-del="' + i + '" aria-label="Remover magia" title="Remover">' + svg(ICON.x, 15, 2.4) + '</button>' +
    '<div class="sk-bnote" data-bnote="' + i + '"' + (k.bonus ? '' : ' hidden') + '>' + bonusNoteInput('', k.bonusNote) + '</div></div>';
}
// The tab: Favoritos (with any spell on the sheet) and Magias, in #spellSecs. Like the sections of the
// tabs Ficha and Equip., each folds by its title (gearFoldTitle) and they are dragged into either order
// by the handle (sortSecsHtml, remembered in this browser); not while Magias is edited. Then Favoritos
// shows the saved favorites, without changing them.
var SPELL_ORDER_KEY = 'hounds_spell_order';
function sheetSpellsHtml(s, editing) {
  var d = S.ui.spellDraft, list = editing ? d : sheetSpells(s), can = canWrite(), m = sheetMagery(s);
  var iq = sheetAttrsNow(s).iq, saved = applyMagery(sheetSpells(s), s), secs = {};
  saved.forEach(function (k, i) { k.i = i; });
  if (saved.length) secs.favs = function () { return sheetSpellFavsHtml(saved, iq, can && !editing); };
  secs.spells = function () { return sheetSpellsSecHtml(s, editing, list, can, m, iq); };
  return sortSecsHtml('spellSecs', SPELL_ORDER_KEY, secs);
}
// One section of the Magia tab on its own (a custom tab of the sheet, ficha-abas.js).
function spellBlockHtml(s, key, can) {
  var d = S.ui.spellDraft, editing = !!d && can, iq = sheetAttrsNow(s).iq, saved = applyMagery(sheetSpells(s), s);
  saved.forEach(function (k, i) { k.i = i; });
  if (key === 'spellFavs') return sheetSpellFavsHtml(saved, iq, can && !editing);
  return sheetSpellsSecHtml(s, editing, editing ? d : sheetSpells(s), can, sheetMagery(s), iq);
}
// Where the Magia sections are: #spellSecs in the Magia tab; in a custom tab, Favoritos and Magias may be
// apart, or only one of them: the events and queries go to both (an object with what the wiring uses).
function spellRoot() {
  var one = $('spellSecs'); if (one) return one;
  var roots = [$('sheetSpellFavs'), $('sheetSpells')].filter(Boolean);
  if (roots.length < 2) return roots[0] || null;
  return { querySelector: function (q) { for (var i = 0; i < roots.length; i++) { var r = roots[i].querySelector(q); if (r) return r; } return null; },
    querySelectorAll: function (q) { var out = []; roots.forEach(function (r) { out = out.concat([].slice.call(r.querySelectorAll(q))); }); return out; },
    addEventListener: function (t, fn, o) { roots.forEach(function (r) { r.addEventListener(t, fn, o); }); } };
}
function sheetSpellsSecHtml(s, editing, list, can, m, iq) {
  var head = '<div class="gurps-head">' + sheetGripHtml('Magias') + gearFoldTitle('spells', 'Magias', editing) + '<span class="gurps-total" id="spTotal">' + sumPts(list) + ' pts</span>' +
    (editing ? secSaveBtnsHtml('spCancel', 'spSave', 'magias')
      : can && !sheetDraftOpen() ? secEditBtnHtml('spEdit', 'magias') : '') + '</div>' +
    (m && m.n ? '<p class="hint-text" style="margin:0">Magery ' + m.n + ': +' + m.n + ' no NH de todas as magias.</p>' : '');
  if (editing) {
    return '<section class="gurps' + gearFoldClass('spells', editing) + '" id="sheetSpells">' + head +
      // New spells go on top, under the button.
      '<div class="box sk-edit"><div><button class="btn" type="button" id="spAdd">' + svg(ICON.plus, 15, 2.4) + 'Adicionar magia</button></div>' +
      '<div class="sk-row sp-row sk-labels" aria-hidden="true"><span>Magia</span><span>Escola</span><span>Dif.</span><span>Pontos</span><span>Bônus</span><span>NH</span><span></span><span></span></div>' +
      '<div id="spRows">' + applyMagery(list, s).map(function (k, i) { return sheetSpellEditRow(k, i, iq); }).join('') + '</div>' +
      '<p class="hint-text">A escola é a tabela em que a magia aparece; ao escolher da lista, vem a primeira escola do livro. Dificuldade: H difícil, VH muito difícil. ' +
      'Magery da ficha (em Vantagens ou Combate) soma no NH sozinho. Bônus é o que mais soma; com bônus, escreva o motivo. Magia não tem nível padrão: com 0 pontos fica sem NH. ' +
      'A estrela marca a magia como favorita: ela aparece também em Favoritos.</p></div>' +
      '<datalist id="spColleges">' + spellColleges().map(function (c) { return '<option value="' + esc(c) + '">' + esc(collegeLabel(c)) + '</option>'; }).join('') + '</datalist>' +
      '<div class="form-err" id="spErr" role="alert"></div></section>';
  }
  list.forEach(function (k, i) { k.i = i; });
  applyMagery(list, s);
  return '<section class="gurps' + gearFoldClass('spells', editing) + '" id="sheetSpells">' + head +
    (list.length ? '<div class="gurps-grid sp-grid">' + sheetSpellColumns(sheetSpellGroups(list)).map(function (col) { return sheetSpellTableHtml(col, iq, can); }).join('') + '</div>'
      : '<p class="long none">Nenhuma magia cadastrada.' + (can ? ' Use <b>Editar</b> para adicionar.' : '') + '</p>') + '</section>';
}

// Out of the editor, the points change right in the table, as in the skills (see wireQuickPts).
function wireSpellQuickPts(s, box) {
  var ui = S.ui, iq = sheetAttrsNow(s).iq, list = applyMagery(sheetSpells(s), s), groups = sheetSpellGroups(list), edits = {}, timer = 0;
  if (!box.querySelector('.gpts-in')) return;
  function paintTotals() {
    $('spTotal').textContent = sumPts(list) + ' pts';
    groups.forEach(function (g, n) { var t = box.querySelector('[data-gtot="' + n + '"]'); if (t) t.textContent = String(sumPts(g.list)); });
  }
  function save() {
    clearTimeout(timer); timer = 0;
    var keys = Object.keys(edits); if (!keys.length) return;
    var changed = edits; edits = {};
    // The sheet as it is now in the database, with these points on top (matched by name, school and difficulty).
    var cur = sheetById(s.id) || s, fresh = sheetSpells(cur);
    keys.forEach(function (i) {
      var k = list[+i], hit = fresh.filter(function (x) { return x.name === k.name && x.college === k.college && x.diff === k.diff; })[0];
      if (hit) hit.pts = changed[i];
    });
    Ops.saveSheetSpells(cur, fresh).catch(function (er) { toast(errorText(er), true); ui.ptsStale = false; renderSheetPage(); });
  }
  function field(e) { var t = /** @type {AnyEl} */ (e.target); return t && t.classList && t.classList.contains('gpts-in') ? t : null; }
  box.addEventListener('input', function (e) {
    var t = field(e); if (!t || t.value === '') return;
    var i = t.getAttribute('data-k'), k = list[+i]; if (!k) return;
    k.pts = cleanInt(t.value, 0, 999, k.pts); edits[i] = k.pts;
    // A favorite is in two tables: both rows follow.
    var nh = sheetSpellNh(k, iq);
    box.querySelectorAll('[data-gnh="' + i + '"]').forEach(function (cell) { cell.innerHTML = calcBtn(nhHtml(nh), spellCalc(k, iq), skillBonusTitle(k)); });
    box.querySelectorAll('.gpts-in[data-k="' + i + '"]').forEach(function (other) { if (other !== t) other.value = String(k.pts); });
    paintTotals();
    clearTimeout(timer); timer = setTimeout(save, 700);
  });
  box.addEventListener('keydown', function (e) { var t = field(e); if (t && e.key === 'Enter') t.blur(); });
  box.addEventListener('focusout', function (e) {
    var t = field(e); if (!t) return;
    if (t.value === '') t.value = String(list[+t.getAttribute('data-k')].pts);
    save();
    setTimeout(function () {
      var a = document.activeElement;
      if (ui.ptsStale && !(a && a.classList && a.classList.contains('gpts-in'))) { ui.ptsStale = false; renderSheetPage(); }
    }, 250);
  });
}
// A star after a click, before the page redraws.
function sheetSpellFavPaint(b, k) {
  b.classList.toggle('on', !!k.fav); b.setAttribute('aria-pressed', String(!!k.fav));
  b.title = k.fav ? 'Tirar dos favoritos' : 'Marcar como favorita';
  b.setAttribute('aria-label', k.fav ? 'Tirar ' + k.name + ' dos favoritos' : 'Marcar ' + k.name + ' como favorita');
}
// Out of the editor, a star is saved right away (matched by name, school and difficulty, in the sheet
// as it is now in the database); the page redraws when the sheet comes back, with Favoritos.
function wireSpellFavs(s, box) {
  var list = sheetSpells(s);
  box.addEventListener('click', function (e) {
    var b = /** @type {AnyEl} */ (e.target).closest('[data-fav]'); if (!b) return;
    var k = list[+b.getAttribute('data-fav')]; if (!k) return;
    var cur = sheetById(s.id) || s, fresh = sheetSpells(cur);
    var hit = fresh.filter(function (x) { return x.name === k.name && x.college === k.college && x.diff === k.diff; })[0]; if (!hit) return;
    hit.fav = !hit.fav;
    box.querySelectorAll('[data-fav="' + b.getAttribute('data-fav') + '"]').forEach(function (x) { sheetSpellFavPaint(x, hit); });
    Ops.saveSheetSpells(cur, fresh).then(function () { toast(hit.fav ? hit.name + ' nos favoritos.' : hit.name + ' saiu dos favoritos.'); },
      function (er) { toast(errorText(er), true); renderSheetPage(); });
  });
}
// While editing, S.ui.spellDraft holds the list being changed; typing updates it and the NH and
// total beside it, adding or removing a row redraws the page from it.
function wireSheetSpells(s) {
  var ui = S.ui, root = spellRoot(); if (!root) return;
  wireSecSort('spellSecs', SPELL_ORDER_KEY);
  // Favoritos without Magias (a custom tab): its points and stars.
  if (!$('sheetSpells')) { if (!ui.spellDraft) { loadCatalog('spells'); wireSpellQuickPts(s, root); wireSpellFavs(s, root); } return; }
  function focusFirst() { var f = document.querySelector('#spRows .sk-name'); if (f instanceof HTMLElement) f.focus(); }
  var ed = $('spEdit'); if (ed) ed.onclick = function () {
    ui.spellDraft = sheetSpells(s);
    // The cursor goes to the first field only for a new, empty row: a filled name would open its suggestions.
    var empty = !ui.spellDraft.length;
    if (empty) ui.spellDraft.push(cleanSheetSpell({ name: '' }));
    renderSheetPage(); if (empty) focusFirst();
  };
  // The school and class of the linked spells come from the catalog: it redraws the page when it arrives.
  var d = ui.spellDraft, box = $('sheetSpells');
  if (!d) { loadCatalog('spells'); wireSpellQuickPts(s, root); wireSpellFavs(s, root); return; }
  if (!$('spSave')) return;
  var iq = sheetAttrsNow(s).iq;
  box.addEventListener('input', onEdit); box.addEventListener('change', onEdit);
  function paintRow(i) {
    var k = applyMagery([cleanSheetSpell(d[i])], s)[0], cell = box.querySelector('[data-nh="' + i + '"]'), rules = box.querySelector('[data-rules="' + i + '"]');
    if (cell) { cell.className = 'sk-nh' + (k.bonus || k.tbonus ? ' bonus' : ''); cell.title = skillBonusTitle(k); cell.innerHTML = sheetSpellEditNhHtml(k, iq); }
    if (rules) rules.innerHTML = sheetSpellRulesHtml(k);
    var note = box.querySelector('[data-bnote="' + i + '"]'); if (note) note.hidden = !k.bonus;
  }
  function onEdit(e) {
    var el = e.target, f = el.dataset && el.dataset.f, row = el.closest && el.closest('[data-i]'); if (!f || !row) return;
    var i = +row.getAttribute('data-i'), item = d[i];
    if (f === 'name' || f === 'college' || f === 'diff' || f === 'bonusNote') item[f] = el.value;
    else if (el.value !== '') item[f] = f === 'bonus' ? cleanInt(el.value, -20, 20, 0) : cleanInt(el.value, 0, 999, 0);
    if (f === 'bonusNote' && el.value.trim()) el.classList.remove('invalid');
    // Another name than the entry picked from the list: the link goes.
    if (f === 'name' && item.spellId && spellById(item.spellId) && !sheetSpellLink(item)) delete item.spellId;
    paintRow(i);
    $('spTotal').textContent = sumPts(d.map(cleanSheetSpell)) + ' pts';
  }
  // Suggestions from Regras › Magias under the name being typed; picking one fills the name, school
  // and difficulty and links the row to the entry.
  loadCatalog('spells').then(function () { if (ui.spellDraft === d) d.forEach(function (k, i) { paintRow(i); }); });
  var sug = { i: -1, list: null, input: null, options: [], active: 0 };
  function hideSug() {
    if (sug.list) { sug.list.hidden = true; sug.input.setAttribute('aria-expanded', 'false'); sug.input.removeAttribute('aria-activedescendant'); }
    sug.i = -1; sug.list = null; sug.input = null; sug.options = [];
  }
  function paintSug(input) {
    var row = input.closest('[data-i]'), i = row ? +row.getAttribute('data-i') : -1, list = row && row.querySelector('.suggest');
    if (!list) return;
    if (sug.list && sug.list !== list) hideSug();
    var options = sheetSpellSuggestions(input.value);
    // Nothing to offer, or exactly the entry already linked.
    if (!options.length || (options.length === 1 && options[0].id === d[i].spellId && sheetSpellLink(d[i]))) { sug.list = list; sug.input = input; hideSug(); return; }
    sug.i = i; sug.list = list; sug.input = input; sug.options = options; sug.active = Math.min(sug.active, options.length - 1);
    list.innerHTML = options.map(function (c, n) {
      var college = (c.college || '').split(',')[0].trim();
      return '<button type="button" role="option" id="spSug' + i + 'o' + n + '" data-o="' + n + '" class="' + (n === sug.active ? 'act' : '') + '" aria-selected="' + (n === sug.active) + '">' +
        '<span>' + esc(c.name) + ptNameHtml(c) + '</span><small>' + esc((college ? collegeLabel(college) + ' · ' : '') + 'IQ/' + (c.difficulty || 'H') + (c.page ? ' · ' + c.page : '')) + '</small></button>';
    }).join('');
    list.hidden = false; input.setAttribute('aria-expanded', 'true'); input.setAttribute('aria-activedescendant', 'spSug' + i + 'o' + sug.active);
  }
  function pickSug(n) {
    var c = sug.options[n], i = sug.i, input = sug.input; if (!c || i < 0) return;
    var item = d[i], row = input.closest('[data-i]');
    item.name = c.name; item.college = (c.college || '').split(',')[0].trim(); item.diff = c.difficulty === 'VH' ? 'VH' : 'H'; item.spellId = c.id;
    input.value = item.name;
    row.querySelector('[data-f="college"]').value = item.college;
    row.querySelector('[data-f="diff"]').value = item.diff;
    hideSug(); paintRow(i);
    var pts = row.querySelector('[data-f="pts"]'); pts.focus(); pts.select();
  }
  var rows = $('spRows');
  function nameInput(e) { var t = /** @type {AnyEl} */ (e.target); return t && t.classList && t.classList.contains('sk-name') ? t : null; }
  rows.addEventListener('input', function (e) { var t = nameInput(e); if (t) { sug.active = 0; paintSug(t); } });
  // Focus alone opens the suggestions only on a row not linked to an entry yet: one just picked (or
  // saved) keeps its fields in view, and typing opens them again.
  rows.addEventListener('focusin', function (e) {
    var t = nameInput(e), row = t && t.closest('[data-i]'), x = row && d[+row.getAttribute('data-i')];
    if (t && !(x && x.spellId)) { sug.active = 0; paintSug(t); }
  });
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
    var fb = e.target.closest && e.target.closest('[data-efav]');
    if (fb) { var x = d[+fb.getAttribute('data-efav')]; x.fav = !x.fav; sheetSpellFavPaint(fb, x); return; }
    var b = e.target.closest && e.target.closest('[data-del]'); if (!b) return;
    d.splice(+b.getAttribute('data-del'), 1);
    renderSheetPage();
  });
  $('spAdd').onclick = function () { d.unshift(cleanSheetSpell({ name: '' })); renderSheetPage(); focusFirst(); };
  $('spCancel').onclick = function () { ui.spellDraft = null; renderSheetPage(); };
  $('spSave').onclick = function () {
    if (!checkBonusNotes(box)) { $('spErr').textContent = 'Escreva o motivo de cada bônus.'; return; }
    $('spErr').textContent = '';
    var btn = $('spSave'); btn.disabled = true; btn.textContent = 'Salvando…'; $('spCancel').disabled = true;
    Ops.saveSheetSpells(s, d).then(function () { ui.spellDraft = null; toast('Magias salvas.'); renderSheetPage(); }, function (er) {
      btn.disabled = false; btn.textContent = 'Salvar'; $('spCancel').disabled = false;
      $('spErr').textContent = errorText(er);
    });
  };
}
