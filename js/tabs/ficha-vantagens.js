/* =====================================================================
   Hounds — Ficha › Vantagens
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* Data: sheet.advs = [{ name, advId?, cost, levels, mod, notes }], in the order the player gave.
     cost    the advantage's points, or each level's when it has levels (Talent, Acute Senses)
     levels  0: no levels; 1-99 otherwise. The view shows them after the name ("Talent (Soldier) 2")
     mod     enhancements and limitations summed, in %
     notes   the Observações column
     advId   the entry of Regras › Vantagens it was picked from
     size    talents only: 'S', 'M' or 'L' (TALENT_SIZES), which sets the cost of a level
     skills  talents only: the names of the sheet's skills that get its bonus
   Points (Basic Set, pp. B101-102): cost × levels, with the modifiers applied to that and the
   result rounded up; limitations never take off more than 80% of the cost. */
// A talent's size: points a level and how many related skills it covers (Basic Set, p. B89).
var TALENT_SIZES = {
  S: { label: 'Pequeno', cost: 5, min: 1, max: 6, range: 'até 6 perícias' },
  M: { label: 'Médio', cost: 10, min: 7, max: 12, range: '7 a 12 perícias' },
  L: { label: 'Grande', cost: 15, min: 13, max: 999, range: '13 ou mais perícias' } };
var TALENT_SIZE_KEYS = ['S', 'M', 'L'];
var TALENT_MAX_LEVELS = 4;
function cleanAdv(x) {
  var out = { name: String((x && x.name) || '').replace(/\s*\(\s*\)\s*$/, '').trim().slice(0, 120),
    cost: cleanInt(x && x.cost, 0, 9999, 0), levels: cleanInt(x && x.levels, 0, 99, 0), mod: cleanInt(x && x.mod, -500, 1000, 0),
    notes: String((x && x.notes) || '').trim().slice(0, 400) };
  if (x && typeof x.advId === 'string' && x.advId) out.advId = x.advId.slice(0, 200);
  if (x && TALENT_SIZES[x.size]) {
    out.size = x.size; out.cost = TALENT_SIZES[x.size].cost; out.levels = Math.max(1, out.levels);
    var seen = {};
    out.skills = (Array.isArray(x.skills) ? x.skills : []).map(function (k) { return String(k || '').trim().slice(0, 100); })
      .filter(function (k) { var n = norm(k); if (!k || seen[n]) return false; seen[n] = true; return true; }).slice(0, 60);
  }
  return out;
}
// What is wrong with a talent's skills for its size ('' when nothing).
function talentProblem(x) {
  var z = TALENT_SIZES[x.size]; if (!z) return '';
  var n = (x.skills || []).length;
  if (!n) return 'escolha as perícias do talento';
  if (n < z.min) return 'talento ' + z.label.toLowerCase() + ' precisa de ' + z.range + ' (tem ' + n + ')';
  if (n > z.max) return 'talento ' + z.label.toLowerCase() + ' vai até ' + z.max + ' perícias (tem ' + n + '); escolha um tamanho maior';
  return '';
}
// The bonus of the sheet's talents to its skills: +1 a level (up to 4) to each skill chosen.
// A skill in two talents gets the larger bonus. { normalized name: { n, from } }.
function talentBonuses(s) {
  var out = {};
  sheetAdvs(s).forEach(function (x) {
    if (!x.size) return;
    var lv = Math.min(x.levels || 1, TALENT_MAX_LEVELS);
    x.skills.forEach(function (k) { var o = out[norm(k)]; if (!o || o.n < lv) out[norm(k)] = { n: lv, from: x.name + ' ' + lv }; });
  });
  return out;
}
// Combat Reflexes (or Enhanced Time Sense, which includes it) in Vantagens or in Combate: +1 to
// the active defenses (see combatDefenses) and to every Fast-Draw skill (Basic Set, p. B43).
var CR_RE = /^(Combat Reflexes|Enhanced Time Sense)\b/i;
function hasCombatReflexes(s) {
  return sheetAdvs(s).some(function (x) { return CR_RE.test(x.name); }) ||
    scAllItems(sheetCombat(s)).some(function (x) { return x.kind === 'trait' && CR_RE.test(x.name); });
}
function isFastDraw(name) { return /^fast-?draw\b/i.test(name || ''); }
// Marks each skill of the list with the bonus the sheet's advantages give it: its talents', on
// Fast-Draw Combat Reflexes', and the effects of the advantages (see ficha-efeitos.js) (k.tbonus;
// k.tfrom says where it comes from: "+2 de Talent (Soldier) 2 e +1 de Combat Reflexes"). Returns the
// list. The marks are for showing the level only: cleanSkill and cleanCombatItem drop them.
// combat: the skills of Combate, which the talents don't cover (Combat Reflexes and the effects do).
function applyTalents(list, s, combat) {
  var t = combat ? {} : talentBonuses(s), cr = list.some(function (k) { return isFastDraw(k.name); }) && hasCombatReflexes(s);
  list.forEach(function (k) {
    var o = t[norm(k.name)], from = [], fx = k.kind === 'tech' ? null : fxForSkill(s, k);
    k.tbonus = 0;
    if (o) { k.tbonus += o.n; from.push('+' + o.n + ' de ' + o.from); }
    if (cr && isFastDraw(k.name)) { k.tbonus += 1; from.push('+1 de Combat Reflexes'); }
    if (fx) { k.tbonus += fx.n; from = from.concat(fxParts(fx)); }
    k.tfrom = joinE(from);
  });
  return list;
}
// The sheet's skills, of Perícias and of Combate, once each, by name.
function advSkillChoices(s) {
  var seen = {}, out = [];
  sheetSkills(s).concat(scAllItems(sheetCombat(s)).filter(function (x) { return x.kind === 'skill'; })).forEach(function (k) {
    if (k.name && !seen[norm(k.name)]) { seen[norm(k.name)] = true; out.push(k.name); }
  });
  return out.sort(function (a, b) { return byName({ name: a }, { name: b }); });
}
// The skills a talent can cover: only the ones of Perícias; the combat skills (Combate) don't go in.
function talentSkillChoices(s) {
  var seen = {}, out = [];
  sheetSkills(s).forEach(function (k) { if (k.name && !seen[norm(k.name)]) { seen[norm(k.name)] = true; out.push(k.name); } });
  return out.sort(function (a, b) { return byName({ name: a }, { name: b }); });
}
function talentSizeOf(c) { var n = advCostOf(c).cost; return n >= 15 ? 'L' : n >= 10 ? 'M' : 'S'; }
function isTalentName(name, c) { return /^talent\b/i.test(name || '') || (!!c && advTypeKey(c.type) === 'talent'); }
function sheetAdvs(s) { return (Array.isArray(s && s.advs) ? s.advs : []).map(cleanAdv).filter(function (x) { return x.name; }); }
function advBaseCost(x) { return x.cost * (x.levels || 1); }
function advPts(x) {
  var m = Math.max(-80, x.mod), base = advBaseCost(x);
  return m ? Math.ceil(base * (100 + m) / 100 - 1e-9) : base;
}
function advsTotal(list) { return list.reduce(function (n, x) { return n + advPts(x); }, 0); }

Ops.saveSheetAdvs = function (s, list) {
  if (!rawHas('sheets', s.id)) return Promise.reject({ message: 'Essa ficha não existe mais.' });
  var clean = list.map(cleanAdv).filter(function (x) { return x.name; });
  // A talent needs the number of skills its size covers.
  var bad = clean.filter(talentProblem)[0];
  if (bad) return Promise.reject({ message: bad.name + ': ' + talentProblem(bad) + '.' });
  return W.store.patch('sheets', s.id, { advs: clean, updatedAt: now() });
};

/* ---------- the catalog (Regras › Vantagens) ---------- */
// The entry a name is about: the name itself; without the specialty in parentheses and the level
// ("Talent (Soldier) 2" is Talent); singular or plural ("Contact" is Contacts); Enhanced
// Block/Parry/Dodge are Enhanced Defenses, Acute Hearing and the others Acute Senses. The
// advantage itself before the books' expansions of it.
function advFind(name) {
  var list = W.advantages || [], n = norm(name).trim(); if (!n || !list.length) return null;
  var bare = n.replace(/\s*\([^)]*\)/g, ' ').replace(/\s+\d+$/, '').replace(/\s+/g, ' ').trim();
  if (/^enhanced (block|parry|dodge)\b/.test(bare)) bare = 'enhanced defenses';
  else if (/^acute (hearing|vision|taste|touch)\b/.test(bare)) bare = 'acute senses';
  var tries = [n, bare, bare.replace(/s$/, ''), bare + 's'];
  for (var i = 0; i < tries.length; i++) {
    var hits = list.filter(function (y) { return norm(y.name) === tries[i]; });
    var hit = hits.filter(function (y) { return advTypeKey(y.type) !== 'exp'; })[0] || hits[0];
    if (hit) return hit;
  }
  return null;
}
function advEntryOf(x) {
  var c = x.advId ? advById(x.advId) : null;
  return c && norm(x.name).indexOf(norm(c.name)) === 0 ? c : advFind(x.name);
}
// Cost and levels to start with, from the entry's "Cost": "15 points", "2 points/level" (levels),
// "25 points/attack" (one per attack: levels too). A perk is 1 point. "5 or 15 points" and
// "Variable" are set by hand: the first number, or 0.
function advCostOf(c) {
  if (advTypeKey(c.type) === 'perk') return { cost: 1, levels: 0, fixed: true };
  var t = String(c.cost || '').trim(), m = /^(\d+)\s*points?\b(.*)$/i.exec(t);
  if (!m) { var first = /\d+/.exec(t); return { cost: first ? +first[0] : 0, levels: 0, fixed: false }; }
  var per = /^\s*(\/|per\b)/i.test(m[2]);
  return { cost: +m[1], levels: per ? 1 : 0, fixed: !per && !m[2].trim() };
}
// Entries offered while a name is typed: advantages, perks, talents and cross-references (not
// the expansions, which repeat the names) whose name, in English or in Portuguese, is like it
// (see searchCatalog); the most alike first.
function advSuggestions(q) {
  if (!norm(q || '').trim()) return [];
  return searchCatalog((W.advantages || []).filter(function (c) { return advTypeKey(c.type) !== 'exp'; }), q, null).slice(0, 8);
}
// The rules that a row breaks, in short.
function advWarnings(x, c) {
  var out = [], k = c ? advTypeKey(c.type) : '';
  if (x.mod < -80) out.push('limitações param em -80%');
  if (x.size || k === 'talent' || /^talent\b/i.test(x.name)) {
    if (x.levels > TALENT_MAX_LEVELS) out.push('talento vai até ' + TALENT_MAX_LEVELS + ' níveis');
    var tp = talentProblem(x); if (tp) out.push(tp);
  }
  if (k === 'perk' && advPts(x) !== 1 && !x.levels) out.push('perk custa 1 ponto');
  if (c && x.levels === 0 && k !== 'perk') {
    var b = advCostOf(c);
    if (b.fixed && b.cost !== x.cost) out.push('o livro diz ' + c.cost);
  }
  return out;
}
// Under the name of a row being edited: the page of the entry, its type and cost.
function advRulesHtml(x) {
  var c = advEntryOf(x), w = advWarnings(x, c);
  return (c ? '<a href="' + advHref(c.id) + '" data-adv-modal="' + esc(c.id) + '" title="Ver a vantagem">' + svg(ICON.advantage, 12, 2.2) + esc(c.page || 'Regras') + '</a> ' +
    '<span>' + esc(advTypeLabel(c.type) + ' · ' + (c.cost || 'custo no texto')) + '</span>' : '') +
    (w.length ? '<span class="av-warn">' + esc((c ? ' · ' : '') + w.join(' · ')) + '</span>' : '');
}

/* ---------- view ---------- */
// "a, b e c"
function joinE(list) { return list.length > 1 ? list.slice(0, -1).join(', ') + ' e ' + list[list.length - 1] : list.join(''); }
// onSheet: the normalized names of the skills of Perícias, to mark a talent's skill that is not there.
// fastDraws: the sheet's Fast-Draw skills, which Combat Reflexes raises.
function advRowHtml(x, inCombat, onSheet, fastDraws) {
  var c = advEntryOf(x), name = esc(x.name + (x.levels ? ' ' + x.levels : '')), k = c ? advTypeKey(c.type) : '';
  var label = c ? '<a href="' + advHref(c.id) + '" data-adv-modal="' + esc(c.id) + '" title="Ver ' + (k === 'perk' ? 'o perk' : 'a vantagem') + '">' + name + '</a>' : name;
  var z = TALENT_SIZES[x.size];
  // A talent's Observações are its skills, as in the spreadsheet, then the notes.
  var obs = z ? joinE(x.skills.map(function (n) { return n + (onSheet[norm(n)] ? '' : ' (não está em Perícias)'); })) : '';
  if (x.notes) obs += (obs ? ' · ' : '') + x.notes;
  var problem = z ? talentProblem(x) : '';
  var sub = [z ? 'Talento ' + z.label.toLowerCase() + ' · +' + Math.min(x.levels || 1, TALENT_MAX_LEVELS) + ' no NH' : k === 'perk' || k === 'talent' ? advTypeLabel(c.type) : '',
    x.levels > 1 ? x.levels + ' níveis × ' + x.cost : '',
    x.mod ? (x.mod > 0 ? '+' : '') + x.mod + '%' + (x.mod < -80 ? ' (vale -80%)' : '') : '',
    CR_RE.test(x.name) ? '+1 nas defesas ativas e em ' + (fastDraws.length ? joinE(fastDraws) : 'Fast-Draw (nenhuma na ficha)') : '',
    inCombat ? 'também na seção Combate' : ''].filter(Boolean).join(' · ');
  // The effects the Mestre gave the entry (see ficha-efeitos.js), applied on the sheet.
  var fx = c && !x.size && !ADV_FX_BUILTIN_RE.test(x.name) ? advEffects(c) : [];
  if (fx.length) sub += (sub ? ' · ' : '') + 'Efeitos: ' + fx.map(advEffectText).join('; ');
  return '<tr><td><b>' + label + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</td><td class="gpts">' + advPts(x) + '</td>' +
    '<td class="av-notes">' + esc(obs) + (problem ? '<small class="av-warn">' + esc(problem) + '</small>' : '') + '</td></tr>';
}
function sheetAdvsHtml(s, editing) {
  var ui = S.ui, can = canWrite(), list = editing ? ui.advDraft : sheetAdvs(s);
  var head = '<div class="gurps-head">' + sheetGripHtml('Vantagens') + gearFoldTitle('advs', 'Vantagens', editing) + '<span class="gurps-total" id="avTotal">' + advsTotal(list) + ' pts</span>' +
    (editing ? secSaveBtnsHtml('avCancel', 'avSave', 'vantagens')
      : can && !sheetDraftOpen() ? secEditBtnHtml('avEdit', 'vantagens') : '') + '</div>';
  if (editing) {
    var choices = talentSkillChoices(s);
    return '<section class="gurps' + gearFoldClass('advs', editing) + '" id="advs">' + head +
      // New advantages go on top, under the button.
      '<div class="box sk-edit"><div><button class="btn" type="button" id="avAdd">' + svg(ICON.plus, 15, 2.4) + 'Adicionar vantagem</button></div>' +
      '<div class="sk-row av-row sk-labels" aria-hidden="true"><span>Vantagem</span><span>Custo</span><span>Níveis</span><span>Mod. %</span><span>Pts</span><span>Observações</span><span></span></div>' +
      '<div id="avRows">' + list.map(function (x, i) { return advEditRow(x, i, choices); }).join('') + '</div>' +
      '<p class="hint-text">Custo é o da vantagem, ou o de cada nível quando ela tem níveis (0 níveis: sem níveis). Mod. % soma ampliações (+) e limitações (−): ' +
      'os pontos são custo × níveis com o modificador aplicado, arredondando para cima, e as limitações não tiram mais de 80% (Basic Set, pp. B101-102). ' +
      'Perk custa 1 ponto. Talento: escolha o tamanho (pequeno 5 pts/nível e até 6 perícias, médio 10 e 7 a 12, grande 15 e 13 ou mais) e marque as perícias da seção Perícias (as de Combate não entram); ' +
      'cada nível, até 4, soma +1 no NH delas (Basic Set, p. B89). Ao escolher da lista, custo e níveis vêm do livro.</p></div>' +
      '<div class="form-err" id="avErr" role="alert"></div></section>';
  }
  if (!list.length) return '<section class="gurps' + gearFoldClass('advs', editing) + '" id="advs">' + head + '<p class="long none">Nenhuma vantagem cadastrada.' + (can ? ' Use <b>Editar</b> para adicionar.' : '') + '</p></section>';
  // Links to the catalog: it arrives once and the page redraws with it.
  loadCatalog('advantages');
  var combat = {}, onSheet = {};
  scAllItems(sheetCombat(s)).forEach(function (x) { if (x.kind === 'trait') combat[norm(x.name)] = true; });
  var fastDraws = advSkillChoices(s).filter(isFastDraw);
  talentSkillChoices(s).forEach(function (n) { onSheet[norm(n)] = true; });
  return '<section class="gurps' + gearFoldClass('advs', editing) + '" id="advs">' + head +
    '<table class="gtab av-tab"><thead><tr><th>Vantagem</th><th>Pts</th><th>Observações</th></tr></thead><tbody>' +
    list.map(function (x) { return advRowHtml(x, !!combat[norm(x.name)], onSheet, fastDraws); }).join('') + '</tbody>' +
    '<tfoot><tr><td>Total pontos vantagens</td><td class="gpts">' + advsTotal(list) + '</td><td></td></tr></tfoot></table></section>';
}

/* ---------- editor ---------- */
function talentCountText(x) { var z = TALENT_SIZES[x.size]; return plural(x.skills.length, 'escolhida', 'escolhidas') + ' · ' + z.label.toLowerCase() + ': ' + z.range; }
// Under a talent's row: its size and the skills of Perícias to check. A skill chosen before that is not
// there (no longer on the sheet, or a combat skill) stays in the list, marked, to be unchecked.
function talentPanelHtml(x, i, choices) {
  var known = {}, chosen = {};
  choices.forEach(function (n) { known[norm(n)] = true; });
  x.skills.forEach(function (n) { chosen[norm(n)] = true; });
  var all = choices.concat(x.skills.filter(function (n) { return !known[norm(n)]; }));
  return '<div class="av-talent" data-talent="' + i + '">' +
    '<fieldset class="av-sizes"><legend>Tamanho do talento</legend>' + TALENT_SIZE_KEYS.map(function (k) {
      var z = TALENT_SIZES[k];
      return '<label><input type="radio" name="avSize' + i + '" data-tsize="' + k + '"' + (x.size === k ? ' checked' : '') + '><span><b>' + z.label + '</b><small>' + z.cost + ' pts/nível · ' + z.range + '</small></span></label>';
    }).join('') + '</fieldset>' +
    '<fieldset class="av-tskills"><legend>Perícias que recebem o bônus <span class="av-tcount" data-tcount="' + i + '">' + esc(talentCountText(x)) + '</span></legend>' +
    (all.length ? '<div class="av-tlist">' + all.map(function (n) {
      return '<label><input type="checkbox" data-tskill="' + esc(n) + '"' + (chosen[norm(n)] ? ' checked' : '') + '><span>' + esc(n) + (known[norm(n)] ? '' : ' <small>não está em Perícias</small>') + '</span></label>';
    }).join('') + '</div>' : '<p class="hint-text" style="margin:0">A ficha ainda não tem perícias em Perícias: cadastre lá e volte aqui. As perícias de combate não entram no talento.</p>') +
    '</fieldset></div>';
}
function advEditRow(x, i, choices) {
  function num(f, lo, hi, label) {
    // A talent's cost comes from its size.
    var lock = f === 'cost' && x.size ? ' disabled title="Definido pelo tamanho do talento"' : '';
    return '<input type="number" data-f="' + f + '" min="' + lo + '" max="' + hi + '" step="1" inputmode="numeric" aria-label="' + label + '" value="' + x[f] + '"' + lock + '>';
  }
  return '<div class="sk-row av-row" data-i="' + i + '">' +
    '<div class="sk-namecell"><div class="sk-pick">' +
    '<input class="sk-name" type="text" data-f="name" maxlength="120" placeholder="Digite para buscar. Ex.: Combat Reflexes" aria-label="Vantagem" value="' + esc(x.name) + '"' +
    ' autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="avSug' + i + '">' +
    '<div class="suggest" id="avSug' + i + '" role="listbox" hidden></div></div>' +
    '<div class="sk-rules" data-rules="' + i + '">' + advRulesHtml(x) + '</div></div>' +
    num('cost', 0, 9999, 'Custo') + num('levels', 0, 99, 'Níveis') + num('mod', -500, 1000, 'Modificador em %') +
    '<span class="sk-nh av-pts" data-pts="' + i + '">' + advPts(x) + ' pts</span>' +
    '<input type="text" data-f="notes" maxlength="400" placeholder="Ex.: Shield and Sword" aria-label="Observações" value="' + esc(x.notes) + '">' +
    '<button class="icon-btn" type="button" data-del="' + i + '" aria-label="Remover vantagem" title="Remover">' + svg(ICON.x, 15, 2.4) + '</button>' +
    (x.size ? talentPanelHtml(x, i, choices || []) : '') + '</div>';
}
// While editing, S.ui.advDraft holds the list being changed; typing updates it and the points and
// total beside it, adding or removing a row redraws the page from it.
function wireSheetAdvs(s) {
  var ui = S.ui;
  function focusFirst() { var f = document.querySelector('#avRows .sk-name'); if (f instanceof HTMLElement) f.focus(); }
  var ed = $('avEdit'); if (ed) ed.onclick = function () {
    ui.advDraft = sheetAdvs(s);
    // Talents saved before they had a size: the size of the cost a level they have.
    ui.advDraft.forEach(function (x) {
      if (x.size || !isTalentName(x.name, advEntryOf(x))) return;
      x.size = x.cost >= 15 ? 'L' : x.cost >= 10 ? 'M' : 'S'; x.cost = TALENT_SIZES[x.size].cost; x.levels = Math.max(1, x.levels); x.skills = [];
    });
    // The cursor goes to the first field only for a new, empty row: a filled name would open its suggestions.
    var empty = !ui.advDraft.length;
    if (empty) ui.advDraft.push(cleanAdv({ name: '', cost: 0 }));
    renderSheetPage(); if (empty) focusFirst();
  };
  var d = ui.advDraft, box = $('advs'); if (!d || !box || !$('avSave')) return;
  function paintRow(i) {
    var x = d[i], pts = box.querySelector('[data-pts="' + i + '"]'), rules = box.querySelector('[data-rules="' + i + '"]');
    if (pts) pts.textContent = advPts(x) + ' pts';
    if (rules) rules.innerHTML = advRulesHtml(x);
    var cnt = box.querySelector('[data-tcount="' + i + '"]'); if (cnt && x.size) cnt.textContent = talentCountText(x);
    $('avTotal').textContent = advsTotal(d) + ' pts';
  }
  // Redraws the editor and gives the focus back to the field that had it (by row and field).
  function redraw(sel) {
    var a = document.activeElement, r = a && a.closest && a.closest('#avRows [data-i]');
    var back = sel || (r && a.getAttribute('data-f') ? '[data-i="' + r.getAttribute('data-i') + '"] [data-f="' + a.getAttribute('data-f') + '"]' : '');
    renderSheetPage();
    var f = back && document.querySelector('#avRows ' + back); if (f instanceof HTMLElement) f.focus();
  }
  // A row that becomes a talent (by name or entry) gets its size and skills; one that stops being, loses them.
  function syncTalent(i) {
    var x = d[i], c = advEntryOf(x), is = isTalentName(x.name, c);
    if (is && !x.size) { x.size = c && advTypeKey(c.type) === 'talent' ? talentSizeOf(c) : 'S'; x.skills = []; x.cost = TALENT_SIZES[x.size].cost; x.levels = Math.max(1, x.levels); return true; }
    if (!is && x.size) { delete x.size; delete x.skills; return true; }
    return false;
  }
  function onEdit(e) {
    var el = e.target, f = el.dataset && el.dataset.f, row = el.closest && el.closest('[data-i]'); if (!row) return;
    var i = +row.getAttribute('data-i'), x = d[i];
    if (el.hasAttribute('data-tsize')) {
      x.size = el.getAttribute('data-tsize'); x.cost = TALENT_SIZES[x.size].cost;
      row.querySelector('[data-f="cost"]').value = String(x.cost);
      paintRow(i); return;
    }
    if (el.hasAttribute('data-tskill')) {
      var k = el.getAttribute('data-tskill');
      x.skills = x.skills.filter(function (n) { return norm(n) !== norm(k); });
      if (el.checked) x.skills.push(k);
      paintRow(i); return;
    }
    if (!f) return;
    if (f === 'name' || f === 'notes') x[f] = el.value;
    else if (el.value !== '') x[f] = f === 'mod' ? cleanInt(el.value, -500, 1000, 0) : cleanInt(el.value, 0, f === 'cost' ? 9999 : 99, 0);
    // Another name than the entry picked from the list: the link goes.
    if (f === 'name' && x.advId && advById(x.advId) && norm(x.name).indexOf(norm(advById(x.advId).name)) !== 0) delete x.advId;
    paintRow(i);
    // When the name is done (the field is left), the talent panel shows or goes.
    if (f === 'name' && e.type === 'change' && syncTalent(i)) setTimeout(function () { redraw(''); }, 0);
  }
  box.addEventListener('input', onEdit); box.addEventListener('change', onEdit);
  loadCatalog('advantages').then(function () { if (ui.advDraft === d) d.forEach(function (x, i) { paintRow(i); }); });
  // Suggestions from Regras › Vantagens under the name being typed; picking one fills the name,
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
    var options = advSuggestions(input.value);
    if (!options.length || (options.length === 1 && options[0].id === d[i].advId)) { sug.list = list; sug.input = input; hideSug(); return; }
    sug.i = i; sug.list = list; sug.input = input; sug.options = options; sug.active = Math.min(sug.active, options.length - 1);
    list.innerHTML = options.map(function (c, n) {
      return '<button type="button" role="option" id="avSug' + i + 'o' + n + '" data-o="' + n + '" class="' + (n === sug.active ? 'act' : '') + '" aria-selected="' + (n === sug.active) + '">' +
        '<span>' + esc(c.name) + ptNameHtml(c) + '</span><small>' + esc(advTypeLabel(c.type) + ' · ' + (c.cost || '') + (c.page ? ' · ' + c.page : '')) + '</small></button>';
    }).join('');
    list.hidden = false; input.setAttribute('aria-expanded', 'true'); input.setAttribute('aria-activedescendant', 'avSug' + i + 'o' + sug.active);
  }
  function pickSug(n) {
    var c = sug.options[n], i = sug.i, input = sug.input; if (!c || i < 0) return;
    var x = d[i], row = input.closest('[data-i]'), cost = advCostOf(c);
    // Talent, Enhanced Defenses and the like are named by what they cover: "()" with the cursor inside.
    var spec = /^(talent|enhanced defenses|acute senses|weapon master|ally|allies|contacts?|patron|signature gear|weapon bond)$/i.test(c.name);
    x.name = c.name + (spec ? ' ()' : ''); x.advId = c.id; x.cost = cost.cost; x.levels = cost.levels;
    if (x.size) { delete x.size; delete x.skills; }
    // A talent: its size and skills panel appears, the cursor goes back to the name.
    if (syncTalent(i)) {
      hideSug(); redraw('[data-i="' + i + '"] .sk-name');
      var nm = document.querySelector('#avRows [data-i="' + i + '"] .sk-name');
      if (nm instanceof HTMLInputElement && spec) nm.setSelectionRange(x.name.length - 1, x.name.length - 1);
      return;
    }
    input.value = x.name;
    row.querySelector('[data-f="cost"]').value = String(x.cost);
    row.querySelector('[data-f="levels"]').value = String(x.levels);
    hideSug(); paintRow(i);
    if (spec) { input.focus(); input.setSelectionRange(x.name.length - 1, x.name.length - 1); }
    else { var next = row.querySelector(cost.fixed ? '[data-f="notes"]' : '[data-f="cost"]'); next.focus(); if (next.select) next.select(); }
  }
  var rows = $('avRows');
  function nameInput(e) { var t = /** @type {AnyEl} */ (e.target); return t && t.classList && t.classList.contains('sk-name') ? t : null; }
  rows.addEventListener('input', function (e) { var t = nameInput(e); if (t) { sug.active = 0; paintSug(t); } });
  // Focus alone opens the suggestions only on a row not linked to an entry yet: one just picked (or
  // saved) keeps its fields in view, and typing opens them again.
  rows.addEventListener('focusin', function (e) {
    var t = nameInput(e), row = t && t.closest('[data-i]'), x = row && d[+row.getAttribute('data-i')];
    if (t && !(x && x.advId)) { sug.active = 0; paintSug(t); }
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
    var b = e.target.closest && e.target.closest('[data-del]'); if (!b) return;
    d.splice(+b.getAttribute('data-del'), 1); renderSheetPage();
  });
  $('avAdd').onclick = function () { d.unshift(cleanAdv({ name: '', cost: 0 })); renderSheetPage(); focusFirst(); };
  $('avCancel').onclick = function () { ui.advDraft = null; renderSheetPage(); };
  $('avSave').onclick = function () {
    var btn = $('avSave'); btn.disabled = true; btn.textContent = 'Salvando…'; $('avCancel').disabled = true;
    Ops.saveSheetAdvs(s, d).then(function () { ui.advDraft = null; toast('Vantagens salvas.'); renderSheetPage(); }, function (er) {
      btn.disabled = false; btn.textContent = 'Salvar'; $('avCancel').disabled = false;
      $('avErr').textContent = errorText(er);
    });
  };
}

// The defenses of the Combat section count the advantages of this section too (Combat Reflexes,
// Enhanced Parry...), once when both have them. Levels come from the cost before modifiers.
function scWithAdvs(c, s) {
  var have = {};
  scAllItems(c).forEach(function (x) { if (x.kind === 'trait') have[norm(x.name)] = true; });
  var extra = sheetAdvs(s).filter(function (x) { return !have[norm(x.name)]; }).map(function (x) { return { kind: 'trait', name: x.name, pts: advBaseCost(x) }; });
  return extra.length ? Object.assign({}, c, { general: c.general.concat(extra) }) : c;
}
