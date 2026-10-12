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
  var body = { v: 1, name: name, description: (fields.description || '').trim(), visible: fields.visible !== false, sharedWith: fields.sharedWith || (s && s.sharedWith) || [],
    createdBy: owner(s), createdAt: (s && s.createdAt) || t, updatedAt: t };
  // put replaces the whole document: attributes and skills are edited apart and must survive a rename.
  ['attrs', 'skills', 'cultures'].forEach(function (k) { if (s && s[k]) body[k] = s[k]; });
  return W.store.put('sheets', s ? s.id : null, body);
};
Ops.saveSheetAttrs = function (s, a) {
  if (!rawHas('sheets', s.id)) return Promise.reject({ message: 'Essa ficha não existe mais.' });
  var clean = {};
  Object.keys(SHEET_ATTRS0).forEach(function (k) { clean[k] = cleanAttr(k, a[k]); });
  return W.store.patch('sheets', s.id, { attrs: clean, updatedAt: now() });
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
   GURPS 4ª ed.: atributos básicos e características secundárias.
   sheet.attrs keeps ST, DX, IQ and HT as values and the secondary ones
   as an adjustment over their base (hp: 1 is HP = ST + 1), so buying ST
   also raises HP, as in the book. enc (Peso, the encumbrance level),
   metal and spellPenalty belong to the table and cost no points.
   ===================================================================== */
var SHEET_ATTRS0 = { st: 10, dx: 10, iq: 10, ht: 10, per: 0, will: 0, hp: 0, fp: 0, speed: 0, move: 0, enc: 0, metal: 0, spellPenalty: 0 };
var ATTR_LIMITS = { st: [1, 200], dx: [1, 50], iq: [1, 50], ht: [1, 50], per: [-50, 50], will: [-50, 50], hp: [-200, 200], fp: [-50, 50],
  speed: [-20, 20], move: [-20, 20], enc: [0, 4], metal: [0, 9999], spellPenalty: [-99, 99] };
// Speed is bought in steps of 0.25; the weight in metal takes decimals; the rest are whole numbers.
function cleanAttr(k, v) {
  var n = Number(v), lim = ATTR_LIMITS[k];
  if (v === '' || v == null || !isFinite(n)) n = SHEET_ATTRS0[k];
  n = k === 'speed' ? Math.round(n * 4) / 4 : k === 'metal' ? Math.round(n * 100) / 100 : Math.round(n);
  return Math.min(lim[1], Math.max(lim[0], n));
}
function sheetAttrs(s) {
  var a = (s && s.attrs) || {}, out = /** @type {SheetAttrs} */ ({});
  Object.keys(SHEET_ATTRS0).forEach(function (k) { out[k] = k in a ? cleanAttr(k, a[k]) : SHEET_ATTRS0[k]; });
  return out;
}
// What a secondary value starts from before its own adjustment.
function attrBase(k, a) {
  if (k === 'per' || k === 'will') return a.iq;
  if (k === 'hp') return a.st;
  if (k === 'fp') return a.ht;
  if (k === 'speed') return (a.ht + a.dx) / 4;
  if (k === 'move') return Math.floor((a.ht + a.dx) / 4 + a.speed);
  return null;
}
// Thrust and swing by ST (Basic Set, p. 16): one entry per ST up to 40, then every 5 up to 100.
var DMG_THR = '1d-6 1d-6 1d-5 1d-5 1d-4 1d-4 1d-3 1d-3 1d-2 1d-2 1d-1 1d-1 1d 1d 1d+1 1d+1 1d+2 1d+2 2d-1 2d-1 2d 2d 2d+1 2d+1 2d+2 2d+2 3d-1 3d-1 3d 3d 3d+1 3d+1 3d+2 3d+2 4d-1 4d-1 4d 4d 4d+1 4d+1'.split(' ');
var DMG_SW = '1d-5 1d-5 1d-4 1d-4 1d-3 1d-3 1d-2 1d-2 1d-1 1d 1d+1 1d+2 2d-1 2d 2d+1 2d+2 3d-1 3d 3d+1 3d+2 4d-1 4d 4d+1 4d+2 5d-1 5d 5d+1 5d+1 5d+2 5d+2 6d-1 6d-1 6d 6d 6d+1 6d+1 6d+2 6d+2 7d-1 7d-1'.split(' ');
var DMG_HIGH = [[45, '5d', '7d+1'], [50, '5d+2', '8d-1'], [55, '6d', '8d+1'], [60, '7d-1', '9d'], [65, '7d+1', '9d+2'], [70, '8d', '10d'],
  [75, '8d+2', '10d+2'], [80, '9d', '11d'], [85, '9d+2', '11d+2'], [90, '10d', '12d'], [95, '10d+2', '12d+2'], [100, '11d', '13d']];
function gurpsDamage(st) {
  if (st <= 40) return { thr: DMG_THR[st - 1], sw: DMG_SW[st - 1] };
  // Above 100: +1d to both for every 10 ST.
  if (st > 100) { var d = 11 + Math.floor((st - 100) / 10); return { thr: d + 'd', sw: (d + 2) + 'd' }; }
  var row = DMG_HIGH.filter(function (r) { return r[0] <= st; }).pop() || [40, DMG_THR[39], DMG_SW[39]];
  return { thr: row[1], sw: row[2] };
}
function gurpsStats(a) {
  var speed = (a.ht + a.dx) / 4 + a.speed, move = Math.max(0, Math.floor(speed) + a.move), bl = a.st * a.st / 5;
  var cost = { st: (a.st - 10) * 10, dx: (a.dx - 10) * 20, iq: (a.iq - 10) * 20, ht: (a.ht - 10) * 10, per: a.per * 5, will: a.will * 5,
    hp: a.hp * 2, fp: a.fp * 3, speed: a.speed * 20, move: a.move * 5 };
  var attrPts = cost.st + cost.dx + cost.iq + cost.ht + cost.per + cost.will, secPts = cost.hp + cost.fp + cost.speed + cost.move;
  return {
    per: a.iq + a.per, will: a.iq + a.will, hp: a.st + a.hp, fp: a.ht + a.fp, speed: speed, move: move,
    // The table's rule: each level of Peso takes 1 from Move and from Dodge.
    moveNow: Math.max(0, move - a.enc), dodge: Math.floor(speed) + 3 - a.enc,
    lift: bl >= 10 ? Math.round(bl) : Math.round(bl * 10) / 10, dmg: gurpsDamage(a.st),
    cost: cost, attrPts: attrPts, secPts: secPts, total: attrPts + secPts
  };
}
function fmtDec(n, places) { return n.toFixed(places).replace('.', ','); }
// [key, name, what it is]. Points of the first group add up as "atributos", of the second as "secundárias".
var ATTR_ROWS = [['st', 'ST', 'Força'], ['dx', 'DX', 'Destreza'], ['iq', 'IQ', 'Inteligência'], ['ht', 'HT', 'Vitalidade'], ['per', 'Percepção', 'base IQ'], ['will', 'Vontade', 'base IQ']];
var SEC_ROWS = [['fp', 'Fadiga', 'base HT'], ['hp', 'HP', 'base ST'], ['speed', 'VB', '(HT + DX) ÷ 4'], ['move', 'Deslocamento', 'base VB'],
  ['metal', 'Peso em Metal', ''], ['spellPenalty', 'Penalidade em Magias', ''], ['enc', 'Peso', 'nível de carga, 0 a 4']];
// The value a row shows (and its input holds while editing).
function attrValue(k, a, r) {
  if (k in r && k !== 'cost') return r[k];
  return a[k];
}
function attrValueText(k, a, r) {
  if (k === 'speed') return fmtDec(r.speed, 2);
  if (k === 'metal') return String(a.metal).replace('.', ',');
  if (k === 'move' && a.enc) return r.moveNow + '<span class="gnote">' + r.move + ' − ' + a.enc + ' de Peso</span>';
  return String(attrValue(k, a, r));
}
function attrInput(k, label, a, r) {
  var free = attrBase(k, a) == null, lim = ATTR_LIMITS[k];
  return '<input class="attr-in" type="number" inputmode="decimal" data-k="' + k + '" aria-label="' + esc(label) + '" value="' + attrValue(k, a, r) + '"' +
    ' step="' + (k === 'speed' ? '0.25' : k === 'metal' ? '0.1' : '1') + '"' + (free ? ' min="' + lim[0] + '" max="' + lim[1] + '"' : '') + '>';
}
function attrRowsHtml(rows, a, r, editing) {
  return rows.map(function (row) {
    var k = row[0], pts = r.cost[k];
    return '<tr><td><b>' + esc(row[1]) + '</b>' + (row[2] ? '<small>' + esc(row[2]) + '</small>' : '') + '</td>' +
      '<td class="gval">' + (editing ? attrInput(k, row[1], a, r) : attrValueText(k, a, r)) + '</td>' +
      '<td class="gpts' + (pts == null ? ' none' : '') + '" data-pts="' + k + '">' + (pts == null ? '—' : pts) + '</td></tr>';
  }).join('');
}
function gurpsDerivedHtml(a, r) {
  function stat(label, val, note) { return '<div class="gstat"><span>' + label + '</span><strong>' + val + '</strong>' + (note ? '<small>' + note + '</small>' : '') + '</div>'; }
  return stat('Esquiva', r.dodge, 'VB + 3' + (a.enc ? ' − ' + a.enc + ' de Peso' : '')) +
    stat('Deslocamento', r.moveNow, a.enc ? r.move + ' − ' + a.enc + ' de Peso' : 'sem Peso') +
    stat('Carga Básica', String(r.lift).replace('.', ',') + ' lbs', '(ST × ST) ÷ 5') +
    stat('Dano', r.dmg.thr + ' / ' + r.dmg.sw, 'Estocada / Balanço');
}
function sheetAttrsHtml(s, a, editing) {
  var r = gurpsStats(a), can = canWrite();
  return '<section class="gurps" id="gurps"><div class="gurps-head"><h2 class="sec-title">Atributos</h2><span class="gurps-total" id="gTotal">' + r.total + ' pts</span>' +
    (editing ? '<div class="btn-row"><button class="btn ghost" type="button" id="attrCancel">Cancelar</button><button class="btn primary" type="button" id="attrSave">Salvar atributos</button></div>'
      : can ? '<div class="btn-row"><button class="btn" type="button" id="attrEdit">' + svg(ICON.edit, 15) + 'Editar atributos</button></div>' : '') + '</div>' +
    '<div class="gurps-grid">' +
    '<table class="gtab"><thead><tr><th>Atributo</th><th>Valor</th><th>Pontos</th></tr></thead><tbody>' + attrRowsHtml(ATTR_ROWS, a, r, editing) + '</tbody>' +
    '<tfoot><tr><td colspan="2">Total pontos atributos</td><td class="gpts" data-tot="attr">' + r.attrPts + '</td></tr></tfoot></table>' +
    '<table class="gtab"><thead><tr><th>Dados</th><th>Valor</th><th>Pontos</th></tr></thead><tbody>' + attrRowsHtml(SEC_ROWS, a, r, editing) + '</tbody>' +
    '<tfoot><tr><td colspan="2">Total pontos dados</td><td class="gpts" data-tot="sec">' + r.secPts + '</td></tr></tfoot></table></div>' +
    '<div class="gurps-derived" id="gDerived">' + gurpsDerivedHtml(a, r) + '</div>' +
    (editing ? '<div class="form-err" id="attrErr" role="alert"></div>' : '') + '</section>';
}
// While editing, S.ui.attrDraft holds the attributes being changed; each keystroke recomputes
// the points and the values that depend on it, without redrawing the input being typed in.
function wireSheetAttrs(s) {
  var ui = S.ui, box = $('gurps'); if (!box) return;
  var ed = $('attrEdit'); if (ed) ed.onclick = function () { ui.attrDraft = sheetAttrs(s); renderSheetPage(); var f = document.querySelector('#gurps .attr-in'); if (f instanceof HTMLElement) f.focus(); };
  if (!ui.attrDraft) return;
  var d = ui.attrDraft;
  function refresh(active) {
    var r = gurpsStats(d);
    box.querySelectorAll('.attr-in').forEach(function (inp) { if (inp !== active) inp.value = String(attrValue(inp.dataset.k, d, r)); });
    box.querySelectorAll('[data-pts]').forEach(function (td) { var p = r.cost[td.getAttribute('data-pts')]; if (p != null) td.textContent = String(p); });
    box.querySelector('[data-tot="attr"]').textContent = String(r.attrPts);
    box.querySelector('[data-tot="sec"]').textContent = String(r.secPts);
    $('gTotal').textContent = r.total + ' pts';
    $('gDerived').innerHTML = gurpsDerivedHtml(d, r);
  }
  box.querySelectorAll('.attr-in').forEach(function (inp) {
    inp.addEventListener('input', function () {
      var k = inp.dataset.k, v = inp.value;
      if (v === '' || !isFinite(Number(v))) return;
      var base = attrBase(k, d);
      d[k] = cleanAttr(k, base == null ? Number(v) : Number(v) - base);
      refresh(inp);
    });
    inp.addEventListener('blur', function () { refresh(null); });
  });
  $('attrCancel').onclick = function () { ui.attrDraft = null; renderSheetPage(); };
  $('attrSave').onclick = function () {
    var btn = $('attrSave'); btn.disabled = true; btn.textContent = 'Salvando…'; $('attrCancel').disabled = true;
    Ops.saveSheetAttrs(s, d).then(function () { ui.attrDraft = null; toast('Atributos salvos.'); renderSheetPage(); }, function (er) {
      btn.disabled = false; btn.textContent = 'Salvar atributos'; $('attrCancel').disabled = false;
      $('attrErr').textContent = errorText(er);
    });
  };
}

/* =====================================================================
   GURPS 4ª ed.: perícias.
   sheet.skills is a list of { name, attr, diff, pts, bonus }: the level
   comes from the points spent (Basic Set, p. 170), bonus is what an
   advantage or talent adds on top. sheet.cultures is the Cultural
   Familiarity list { name, pts }, kept out of the skills total.
   ===================================================================== */
var SKILL_ATTRS = ['ST', 'DX', 'IQ', 'HT', 'Per', 'Will'];
// [name, level with 1 point relative to the attribute, default relative to the attribute (null: none)]
var SKILL_DIFFS = { E: ['Fácil', 0, -4], A: ['Média', -1, -5], H: ['Difícil', -2, -6], VH: ['Muito Difícil', -3, null] };
var SKILL_DIFF_KEYS = ['E', 'A', 'H', 'VH'];
function cleanInt(v, lo, hi, dflt) { var n = Math.round(Number(v)); return isFinite(n) && v !== '' && v != null ? Math.min(hi, Math.max(lo, n)) : dflt; }
function cleanSkill(k) {
  return { name: String((k && k.name) || '').trim().slice(0, 100), attr: SKILL_ATTRS.indexOf(k && k.attr) >= 0 ? k.attr : 'IQ',
    diff: SKILL_DIFFS[k && k.diff] ? k.diff : 'A', pts: cleanInt(k && k.pts, 0, 999, 1), bonus: cleanInt(k && k.bonus, -20, 20, 0) };
}
function cleanCulture(c) { return { name: String((c && c.name) || '').trim().slice(0, 200), pts: cleanInt(c && c.pts, 0, 99, 1) }; }
function sheetSkills(s) { return (Array.isArray(s && s.skills) ? s.skills : []).map(cleanSkill).filter(function (k) { return k.name; }); }
function sheetCultures(s) { return (Array.isArray(s && s.cultures) ? s.cultures : []).map(cleanCulture).filter(function (c) { return c.name; }); }
// 1, 2, 4 points buy the first three levels; every 4 points after that buy one more.
function skillStep(pts) { return pts < 2 ? 0 : pts < 4 ? 1 : 2 + Math.floor((pts - 4) / 4); }
function skillStepCost(i) { return i === 0 ? 1 : i === 1 ? 2 : 4 * (i - 1); }
// Level relative to the attribute, bonus included; null when there is no default to fall back on.
function skillRel(k) {
  var d = SKILL_DIFFS[k.diff], rel = k.pts > 0 ? d[1] + skillStep(k.pts) : d[2];
  return rel == null ? null : rel + k.bonus;
}
function attrValues(a) { var r = gurpsStats(a); return { ST: a.st, DX: a.dx, IQ: a.iq, HT: a.ht, Per: r.per, Will: r.will }; }
function skillNh(k, av) {
  var rel = skillRel(k);
  if (rel == null) return { rel: '—', lvl: 'sem padrão' };
  return { rel: k.attr + (rel > 0 ? '+' + rel : rel < 0 ? String(rel) : ''), lvl: String(av[k.attr] + rel) };
}
// Points that buy nothing: 3 points in a skill get the level of 2.
function skillWaste(k) { return k.pts > 0 ? k.pts - skillStepCost(skillStep(k.pts)) : 0; }
function sumPts(list) { return list.reduce(function (n, x) { return n + x.pts; }, 0); }

Ops.saveSheetSkills = function (s, skills, cultures) {
  if (!rawHas('sheets', s.id)) return Promise.reject({ message: 'Essa ficha não existe mais.' });
  var sk = skills.map(cleanSkill).filter(function (k) { return k.name; }).sort(byName);
  return W.store.patch('sheets', s.id, { skills: sk, cultures: cultures.map(cleanCulture).filter(function (c) { return c.name; }), updatedAt: now() });
};

function skillNhCell(k, av) {
  var nh = skillNh(k, av);
  return '<td class="gnh' + (k.bonus ? ' bonus' : '') + '"' + (k.bonus ? ' title="Inclui ' + (k.bonus > 0 ? '+' : '') + k.bonus + ' de bônus"' : '') + '>' + esc(nh.rel) + '<small>' + esc(nh.lvl) + '</small></td>';
}
function skillGroupHtml(diff, list, av) {
  var name = SKILL_DIFFS[diff][0];
  return '<table class="gtab"><thead><tr><th>' + name + '</th><th>Pontos</th><th>NH</th></tr></thead><tbody>' +
    (list.length ? list.map(function (k) {
      return '<tr><td><b>' + esc(k.name) + '</b><small>' + k.attr + '/' + diff + '</small></td><td class="gpts">' + k.pts + '</td>' + skillNhCell(k, av) + '</tr>';
    }).join('') : '<tr><td colspan="3" class="gnone">Nenhuma perícia ' + name.toLowerCase() + '.</td></tr>') + '</tbody>' +
    '<tfoot><tr><td colspan="2">Total perícias ' + name + '</td><td class="gpts">' + sumPts(list) + '</td></tr></tfoot></table>';
}
function skillEditRow(k, i, av) {
  var nh = skillNh(k, av), w = skillWaste(k);
  return '<div class="sk-row" data-i="' + i + '">' +
    '<input class="sk-name" type="text" data-f="name" maxlength="100" placeholder="Ex.: Savoir-Faire (Military)" aria-label="Perícia" value="' + esc(k.name) + '">' +
    '<select data-f="attr" aria-label="Atributo">' + SKILL_ATTRS.map(function (x) { return '<option' + (x === k.attr ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select>' +
    '<select data-f="diff" aria-label="Dificuldade">' + SKILL_DIFF_KEYS.map(function (x) { return '<option value="' + x + '"' + (x === k.diff ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select>' +
    '<input type="number" data-f="pts" min="0" max="999" step="1" inputmode="numeric" aria-label="Pontos" value="' + k.pts + '">' +
    '<input type="number" data-f="bonus" min="-20" max="20" step="1" inputmode="numeric" aria-label="Bônus" value="' + k.bonus + '">' +
    '<span class="sk-nh' + (k.bonus ? ' bonus' : '') + '" data-nh="' + i + '">' + esc(nh.rel) + ' <small>' + esc(nh.lvl) + (w ? ' · ' + w + ' pt sem efeito' : '') + '</small></span>' +
    '<button class="icon-btn" type="button" data-del="' + i + '" aria-label="Remover perícia" title="Remover">' + svg(ICON.x, 15, 2.4) + '</button></div>';
}
function cultureEditRow(c, i) {
  return '<div class="sk-row cult" data-c="' + i + '">' +
    '<input class="sk-name" type="text" data-f="name" maxlength="200" placeholder="Ex.: Plana, Levânia, Acordo (Oeste)" aria-label="Cultura" value="' + esc(c.name) + '">' +
    '<input type="number" data-f="pts" min="0" max="99" step="1" inputmode="numeric" aria-label="Pontos" value="' + c.pts + '">' +
    '<button class="icon-btn" type="button" data-cdel="' + i + '" aria-label="Remover cultura" title="Remover">' + svg(ICON.x, 15, 2.4) + '</button></div>';
}
function sheetSkillsHtml(s, editing) {
  var d = S.ui.skillDraft, skills = editing ? d.skills : sheetSkills(s), cultures = editing ? d.cultures : sheetCultures(s);
  var av = attrValues(S.ui.attrDraft || sheetAttrs(s)), can = canWrite();
  var head = '<div class="gurps-head"><h2 class="sec-title">Perícias</h2><span class="gurps-total" id="skTotal">' + sumPts(skills) + ' pts</span>' +
    (editing ? '<div class="btn-row"><button class="btn ghost" type="button" id="skCancel">Cancelar</button><button class="btn primary" type="button" id="skSave">Salvar perícias</button></div>'
      : can ? '<div class="btn-row"><button class="btn" type="button" id="skEdit">' + svg(ICON.edit, 15) + 'Editar perícias</button></div>' : '') + '</div>';
  if (editing) {
    return '<section class="gurps" id="skills">' + head +
      '<div class="box sk-edit"><div class="sk-row sk-labels" aria-hidden="true"><span>Perícia</span><span>Atributo</span><span>Dif.</span><span>Pontos</span><span>Bônus</span><span>NH</span><span></span></div>' +
      '<div id="skRows">' + skills.map(function (k, i) { return skillEditRow(k, i, av); }).join('') + '</div>' +
      '<div><button class="btn" type="button" id="skAdd">' + svg(ICON.plus, 15, 2.4) + 'Adicionar perícia</button></div>' +
      '<p class="hint-text">Dificuldade: E fácil, A média, H difícil, VH muito difícil. Bônus é o que vantagens ou talentos somam ao NH. Com 0 pontos vale o nível padrão.</p></div>' +
      '<div class="box sk-edit"><h3 class="sec-title" style="margin:0">Familiaridade Cultural</h3>' +
      '<div id="cuRows">' + cultures.map(cultureEditRow).join('') + '</div>' +
      '<div><button class="btn" type="button" id="cuAdd">' + svg(ICON.plus, 15, 2.4) + 'Adicionar cultura</button></div></div>' +
      '<div class="form-err" id="skErr" role="alert"></div></section>';
  }
  var groups = SKILL_DIFF_KEYS.filter(function (x) { return x !== 'VH' || skills.some(function (k) { return k.diff === 'VH'; }); });
  return '<section class="gurps" id="skills">' + head +
    (skills.length || cultures.length ? '<div class="gurps-grid">' + groups.map(function (x) {
      return skillGroupHtml(x, skills.filter(function (k) { return k.diff === x; }), av);
    }).join('') +
    '<table class="gtab"><thead><tr><th>Familiaridade Cultural</th><th>Pontos</th></tr></thead><tbody>' +
    (cultures.length ? cultures.map(function (c) { return '<tr><td>' + esc(c.name) + '</td><td class="gpts">' + c.pts + '</td></tr>'; }).join('') : '<tr><td colspan="2" class="gnone">Nenhuma.</td></tr>') +
    '</tbody></table></div>'
      : '<p class="long none">Nenhuma perícia cadastrada.' + (can ? ' Use <b>Editar perícias</b> para adicionar.' : '') + '</p>') + '</section>';
}
// While editing, S.ui.skillDraft holds { skills, cultures }; typing updates it and the NH and
// totals beside it, adding or removing a row redraws the page from it.
function wireSheetSkills(s) {
  var ui = S.ui;
  function focusLast(sel) { var l = document.querySelectorAll(sel); var f = l[l.length - 1]; if (f instanceof HTMLElement) f.focus(); }
  var ed = $('skEdit'); if (ed) ed.onclick = function () {
    ui.skillDraft = { skills: sheetSkills(s), cultures: sheetCultures(s) };
    if (!ui.skillDraft.skills.length) ui.skillDraft.skills.push(cleanSkill({ name: '', attr: 'IQ', diff: 'A', pts: 1 }));
    renderSheetPage(); focusLast('#skRows .sk-name');
  };
  var d = ui.skillDraft, box = $('skills'); if (!d || !box || !$('skSave')) return;
  var av = attrValues(ui.attrDraft || sheetAttrs(s));
  box.addEventListener('input', onEdit); box.addEventListener('change', onEdit);
  function onEdit(e) {
    var el = e.target, f = el.dataset && el.dataset.f, row = el.closest && el.closest('[data-i], [data-c]'); if (!f || !row) return;
    var isSkill = row.hasAttribute('data-i'), i = +row.getAttribute(isSkill ? 'data-i' : 'data-c'), item = (isSkill ? d.skills : d.cultures)[i];
    if (f === 'name' || f === 'attr' || f === 'diff') item[f] = el.value;
    else if (el.value !== '') item[f] = f === 'bonus' ? cleanInt(el.value, -20, 20, 0) : cleanInt(el.value, 0, 999, 0);
    if (isSkill) {
      var k = cleanSkill(item), nh = skillNh(k, av), w = skillWaste(k), cell = box.querySelector('[data-nh="' + i + '"]');
      cell.className = 'sk-nh' + (k.bonus ? ' bonus' : '');
      cell.innerHTML = esc(nh.rel) + ' <small>' + esc(nh.lvl) + (w ? ' · ' + w + ' pt sem efeito' : '') + '</small>';
    }
    $('skTotal').textContent = sumPts(d.skills.map(cleanSkill)) + ' pts';
  }
  box.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-del], [data-cdel]'); if (!b) return;
    if (b.hasAttribute('data-del')) d.skills.splice(+b.getAttribute('data-del'), 1); else d.cultures.splice(+b.getAttribute('data-cdel'), 1);
    renderSheetPage();
  });
  $('skAdd').onclick = function () { d.skills.push(cleanSkill({ name: '', attr: 'IQ', diff: 'A', pts: 1 })); renderSheetPage(); focusLast('#skRows .sk-name'); };
  $('cuAdd').onclick = function () { d.cultures.push({ name: '', pts: 1 }); renderSheetPage(); focusLast('#cuRows .sk-name'); };
  $('skCancel').onclick = function () { ui.skillDraft = null; renderSheetPage(); };
  $('skSave').onclick = function () {
    var btn = $('skSave'); btn.disabled = true; btn.textContent = 'Salvando…'; $('skCancel').disabled = true;
    Ops.saveSheetSkills(s, d.skills, d.cultures).then(function () { ui.skillDraft = null; toast('Perícias salvas.'); renderSheetPage(); }, function (er) {
      btn.disabled = false; btn.textContent = 'Salvar perícias'; $('skCancel').disabled = false;
      $('skErr').textContent = errorText(er);
    });
  };
}

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
      '<span class="where">' + (chars.length ? esc(chars.map(function (c) { return c.name; }).join(', ')) : 'Sem personagem vinculado') + '</span>' +
      (s.attrs ? '<span class="meta">' + gurpsStats(sheetAttrs(s)).total + ' pts</span>' : '') + '</div></a>';
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
  // Closed until its title is clicked (see foldBox).
  var side = foldBox('chars', 'Personagens', chars.length,
    chars.length ? '<div class="people">' + chars.map(personChip).join('') + '</div>' : '<p class="lede" style="font-size:13px">Nenhum personagem vinculado.' + (can ? ' Use <b>Vincular ficha</b> na página do personagem.' : '') + '</p>');
  pageRoot.innerHTML = head + sheetAttrsHtml(s, ui.attrDraft || sheetAttrs(s), !!ui.attrDraft && can) + sheetSkillsHtml(s, !!ui.skillDraft && can) +
    '<div class="loc-layout"><div class="side" style="gap:22px">' + main + '</div><div class="side">' + side + '</div></div>';
  fillImages(pageRoot);
  wireFolds(pageRoot);
  wireSheetAttrs(s);
  wireSheetSkills(s);
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
