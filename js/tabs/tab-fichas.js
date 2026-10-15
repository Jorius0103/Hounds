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
// The sheet's picture is its character's: the first linked character (by name) that has
// an image. Not copied into the sheet, so a new portrait of the character shows here too.
function sheetPortrait(s) {
  var c = sheetChars(s.id).filter(function (x) { return x.image && x.image.ref; })[0];
  return c ? { ref: c.image.ref, name: c.name } : null;
}
function sheetLink(s) {
  var n = sheetChars(s.id).length, p = sheetPortrait(s);
  return '<li><a class="row-link" href="' + sheetHref(s.id) + '">' + thumbSlot(p && p.ref, ICON.sheet) + '<span class="mtext"><b>' + esc(s.name) + '</b>' +
    '<span class="where">' + (n ? plural(n, 'personagem', 'personagens') : 'Nenhum personagem') + '</span></span></a></li>';
}

Ops.saveSheet = function (s, fields) {
  var name = (fields.name || '').trim();
  if (!name) return Promise.reject({ message: 'Informe o nome da ficha.' });
  var t = now();
  var body = { v: 1, name: name, description: (fields.description || '').trim(), visible: fields.visible !== false, sharedWith: fields.sharedWith || (s && s.sharedWith) || [],
    createdBy: owner(s), createdAt: (s && s.createdAt) || t, updatedAt: t };
  // put replaces the whole document: attributes and skills are edited apart and must survive a rename.
  ['attrs', 'skills', 'cultures', 'combat', 'advs', 'equip'].forEach(function (k) { if (s && s[k]) body[k] = s[k]; });
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
  // A relational database unlinks the characters itself, in one transaction (hounds_remove).
  if (W.store.relational) return W.store.remove('sheets', s.id);
  return W.raw.characters.filter(function (c) { return c.sheetId === s.id; }).reduce(function (q, c) {
    return q.then(function () { return W.store.patch('characters', c.id, { sheetId: null, updatedAt: now() }); });
  }, Promise.resolve()).then(function () { return W.store.remove('sheets', s.id); });
};
// The one sheet of a character (null removes the link). A single field holds it, so linking
// another sheet replaces the current one; a list or a sheet that no longer exists is refused.
// A sheet belongs to one character too: any other character on it (hidden ones included) loses
// the link first. justCreated: the sheet was saved a moment ago and may not have reached W.raw yet.
Ops.setCharSheet = function (charId, sheetId, justCreated) {
  if (!rawHas('characters', charId)) return Promise.reject({ message: 'Esse personagem não existe mais.' });
  if (sheetId != null && typeof sheetId !== 'string') return Promise.reject({ message: 'Um personagem só pode ter uma ficha.' });
  if (sheetId && !justCreated && !rawHas('sheets', sheetId)) return Promise.reject({ message: 'Essa ficha não existe mais. Escolha outra.' });
  var others = sheetId ? W.raw.characters.filter(function (c) { return c.sheetId === sheetId && c.id !== charId; }) : [];
  return others.reduce(function (p, c) {
    return p.then(function () { return W.store.patch('characters', c.id, { sheetId: null, updatedAt: now() }); });
  }, Promise.resolve()).then(function () { return W.store.patch('characters', charId, { sheetId: sheetId || null, updatedAt: now() }); });
};

/* =====================================================================
   GURPS 4ª ed.: atributos básicos e características secundárias.
   sheet.attrs keeps ST, DX, IQ and HT as values and the secondary ones
   as an adjustment over their base (hp: 1 is HP = ST + 1), so buying ST
   also raises HP, as in the book. Percepção and Vontade start from a base
   of their own (perBase, willBase; 10 unless changed), not from IQ: each
   level above it costs 5 points. enc (Peso, the encumbrance level),
   metal and spellPenalty belong to the table and cost no points.
   ===================================================================== */
var SHEET_ATTRS0 = { st: 10, dx: 10, iq: 10, ht: 10, per: 0, will: 0, perBase: 10, willBase: 10, hp: 0, fp: 0, speed: 0, move: 0, enc: 0, metal: 0, spellPenalty: 0 };
var ATTR_LIMITS = { st: [1, 200], dx: [1, 50], iq: [1, 50], ht: [1, 50], per: [-50, 50], will: [-50, 50], perBase: [1, 50], willBase: [1, 50], hp: [-200, 200], fp: [-50, 50],
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
  // Sheets saved before the bases existed counted Percepção and Vontade from IQ: they keep the
  // value they showed, now over a base of 10.
  ['per', 'will'].forEach(function (k) {
    if (k + 'Base' in a || !(k in a)) return;
    out[k] = cleanAttr(k, out.iq + out[k] - out[k + 'Base']);
  });
  return out;
}
// What a secondary value starts from before its own adjustment.
function attrBase(k, a) {
  if (k === 'per') return a.perBase;
  if (k === 'will') return a.willBase;
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
    per: a.perBase + a.per, will: a.willBase + a.will, hp: a.st + a.hp, fp: a.ht + a.fp, speed: speed, move: move,
    // The table's rule: each level of Peso takes 1 from Move and from Dodge.
    moveNow: Math.max(0, move - a.enc), dodge: Math.floor(speed) + 3 - a.enc,
    lift: bl >= 10 ? Math.round(bl) : Math.round(bl * 10) / 10, dmg: gurpsDamage(a.st),
    cost: cost, attrPts: attrPts, secPts: secPts, total: attrPts + secPts
  };
}
function fmtDec(n, places) { return n.toFixed(places).replace('.', ','); }
// [key, name, what it is]. Points of the first group add up as "atributos", of the second as "secundárias".
var ATTR_ROWS = [['st', 'ST', 'Força'], ['dx', 'DX', 'Destreza'], ['iq', 'IQ', 'Inteligência'], ['ht', 'HT', 'Vitalidade'], ['per', 'Percepção', ''], ['will', 'Vontade', '']];
// Percepção and Vontade show their base under the name; while editing, it is a field (see wireSheetAttrs).
var ATTR_BASES = { per: 'perBase', will: 'willBase' };
function attrBaseHtml(k, a, editing) {
  var b = ATTR_BASES[k];
  if (!editing) return 'base ' + a[b] + ' · 5 pts/nível';
  return '<label class="attr-base">base <input type="number" inputmode="numeric" min="1" max="50" step="1" data-b="' + b + '" data-for="' + k + '" value="' + a[b] + '"' +
    ' aria-label="Valor base de ' + (k === 'per' ? 'Percepção' : 'Vontade') + '"></label>';
}
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
    var sub = ATTR_BASES[k] ? attrBaseHtml(k, a, editing) : row[2] ? esc(row[2]) : '';
    return '<tr><td><b>' + esc(row[1]) + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</td>' +
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
  // A new base keeps the value of Percepção or Vontade and changes what it costs.
  box.querySelectorAll('[data-b]').forEach(function (inp) {
    inp.addEventListener('input', function () {
      var b = inp.getAttribute('data-b'), k = inp.getAttribute('data-for'), v = inp.value;
      if (v === '' || !isFinite(Number(v))) return;
      var value = d[b] + d[k];
      d[b] = cleanAttr(b, Number(v));
      d[k] = cleanAttr(k, value - d[b]);
      refresh(inp);
    });
    inp.addEventListener('blur', function () { if (inp.value === '') inp.value = String(d[inp.getAttribute('data-b')]); });
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
   sheet.skills is a list of { name, attr, diff, pts, bonus, bonusNote?, skillId? }: the level
   comes from the points spent (Basic Set, p. 170), bonus is what an
   advantage or talent adds on top and bonusNote why (asked for when the bonus is
   not 0, shown when hovering the NH), skillId the entry of Mundo › Perícias
   it was picked from (the name may add a specialty). sheet.cultures is the Cultural
   Familiarity list { name, pts }, shown with the Easy skills (set apart) and counted in their total.
   ===================================================================== */
var SKILL_ATTRS = ['ST', 'DX', 'IQ', 'HT', 'Per', 'Will'];
// [name, level with 1 point relative to the attribute, default relative to the attribute (null: none)]
var SKILL_DIFFS = { E: ['Fácil', 0, -4], A: ['Média', -1, -5], H: ['Difícil', -2, -6], VH: ['Muito Difícil', -3, null] };
var SKILL_DIFF_KEYS = ['E', 'A', 'H', 'VH'];
function cleanInt(v, lo, hi, dflt) { var n = Math.round(Number(v)); return isFinite(n) && v !== '' && v != null ? Math.min(hi, Math.max(lo, n)) : dflt; }
function cleanSkill(k) {
  // A specialty left blank after picking from the list ("Animal Handling ()") is dropped.
  var out = { name: String((k && k.name) || '').replace(/\s*\(\s*\)\s*$/, '').trim().slice(0, 100), attr: SKILL_ATTRS.indexOf(k && k.attr) >= 0 ? k.attr : 'IQ',
    diff: SKILL_DIFFS[k && k.diff] ? k.diff : 'A', pts: cleanInt(k && k.pts, 0, 999, 1), bonus: cleanInt(k && k.bonus, -20, 20, 0) };
  var note = out.bonus ? cleanBonusNote(k && k.bonusNote) : ''; if (note) out.bonusNote = note;
  if (k && typeof k.skillId === 'string' && k.skillId) out.skillId = k.skillId.slice(0, 200);
  return out;
}
/* The reason of a bonus (skills here, combat items and defenses in ficha-combate.js): a field
   beside the bonus, shown while it is not 0 and required to save; the text goes where the bonus
   is explained on hover ("Inclui +2 de bônus (espada mágica)"). */
function cleanBonusNote(v) { return String(v == null ? '' : v).trim().slice(0, 120); }
function bonusText(n, note) { return (n > 0 ? '+' : '') + n + ' de bônus' + (note ? ' (' + note + ')' : ''); }
function bonusNoteInput(attrs, note) {
  return '<input type="text" class="bonus-note" data-f="bonusNote"' + attrs + ' maxlength="120" autocomplete="off" placeholder="Motivo do bônus. Ex.: espada mágica, Weapon Master"' +
    ' aria-label="Motivo do bônus" title="Aparece ao passar o mouse sobre o valor (NH ou defesa)" value="' + esc(note || '') + '">';
}
// On save: the shown reason fields left empty are marked and the first gets the focus; false if any.
function checkBonusNotes(box) {
  var miss = [].filter.call(box.querySelectorAll('.bonus-note'), function (el) { return !el.closest('[hidden]') && !el.value.trim(); });
  miss.forEach(function (el) { el.classList.add('invalid'); });
  if (miss[0]) miss[0].focus();
  return !miss.length;
}
function cleanCulture(c) { return { name: String((c && c.name) || '').trim().slice(0, 200), pts: cleanInt(c && c.pts, 0, 99, 1) }; }
function sheetSkills(s) { return (Array.isArray(s && s.skills) ? s.skills : []).map(cleanSkill).filter(function (k) { return k.name; }); }
function sheetCultures(s) { return (Array.isArray(s && s.cultures) ? s.cultures : []).map(cleanCulture).filter(function (c) { return c.name; }); }
// 1, 2, 4 points buy the first three levels; every 4 points after that buy one more.
function skillStep(pts) { return pts < 2 ? 0 : pts < 4 ? 1 : 2 + Math.floor((pts - 4) / 4); }
function skillStepCost(i) { return i === 0 ? 1 : i === 1 ? 2 : 4 * (i - 1); }
// Level relative to the attribute, bonus included (the typed one and the talents', k.tbonus, set by
// applyTalents and never saved); null when there is no default to fall back on.
function skillRel(k) {
  var d = SKILL_DIFFS[k.diff], rel = k.pts > 0 ? d[1] + skillStep(k.pts) : d[2];
  return rel == null ? null : rel + (k.bonus || 0) + (k.tbonus || 0);
}
// Hover text of a level with bonuses: "Inclui +1 de bônus (espada mágica) e +2 de Talent (Soldier) 2".
function skillBonusTitle(k) {
  var p = [];
  if (k.bonus) p.push(bonusText(k.bonus, k.bonusNote));
  if (k.tbonus) p.push(k.tfrom || '+' + k.tbonus + ' das vantagens');
  return p.length ? 'Inclui ' + p.join(' e ') : '';
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
// Cultural Familiarity goes with the Easy skills: its points count in their total and in the
// skills total.
function skillsTotal(skills, cultures) { return sumPts(skills) + sumPts(cultures || []); }

Ops.saveSheetSkills = function (s, skills, cultures) {
  if (!rawHas('sheets', s.id)) return Promise.reject({ message: 'Essa ficha não existe mais.' });
  var sk = skills.map(cleanSkill).filter(function (k) { return k.name; }).sort(byName);
  return W.store.patch('sheets', s.id, { skills: sk, cultures: cultures.map(cleanCulture).filter(function (c) { return c.name; }), updatedAt: now() });
};

function skillNhCell(k, av) {
  var nh = skillNh(k, av);
  var t = skillBonusTitle(k);
  return '<td class="gnh' + (t ? ' bonus' : '') + '"' + (k.i != null ? ' data-gnh="' + k.i + '"' : '') + (t ? ' title="' + esc(t) + '"' : '') + '>' + esc(nh.rel) + '<small>' + esc(nh.lvl) + '</small></td>';
}
// can: the points are a field, changed right in the table (see wireQuickPts); k.i is the
// position of the skill in sheet.skills. cultures: the Cultural Familiarity rows, after the
// skills of the Easy table and set apart from them.
function skillGroupHtml(diff, list, av, can, cultures) {
  var name = SKILL_DIFFS[diff][0];
  cultures = cultures || [];
  var cultRows = cultures.map(function (c, j) {
    return '<tr class="gcult"><td><b>' + esc(c.name) + '</b><small>Familiaridade cultural</small></td><td class="gpts">' +
      (can ? '<input class="gpts-in" type="number" min="0" max="99" step="1" inputmode="numeric" data-c="' + j + '" value="' + c.pts + '" aria-label="Pontos em ' + esc(c.name) + '">' : c.pts) + '</td><td class="gnh none" title="Familiaridade cultural não tem NH">—</td></tr>';
  }).join('');
  return '<table class="gtab"><thead><tr><th>' + name + '</th><th>Pontos</th><th>NH</th></tr></thead><tbody>' +
    (list.length || cultures.length ? list.map(function (k) {
      var name = k.skillId ? '<a href="' + skillHref(k.skillId) + '" data-skill-modal="' + esc(k.skillId) + '" title="Ver as regras da perícia">' + esc(k.name) + '</a>' : esc(k.name);
      return '<tr><td><b>' + name + '</b><small>' + k.attr + '/' + diff + '</small></td><td class="gpts">' +
        (can ? '<input class="gpts-in" type="number" min="0" max="999" step="1" inputmode="numeric" data-k="' + k.i + '" value="' + k.pts + '" aria-label="Pontos em ' + esc(k.name) + '">' : k.pts) + '</td>' + skillNhCell(k, av) + '</tr>';
    }).join('') + cultRows : '<tr><td colspan="3" class="gnone">Nenhuma perícia ' + name.toLowerCase() + '.</td></tr>') + '</tbody>' +
    '<tfoot><tr><td colspan="2">Total perícias ' + name + '</td><td class="gpts" data-gtot="' + diff + '">' + skillsTotal(list, cultures) + '</td></tr></tfoot></table>';
}
// NH of a row being edited; the points that buy nothing go on a line of their own.
function skillEditNhHtml(k, av) {
  var nh = skillNh(k, av), w = skillWaste(k);
  return esc(nh.rel) + ' <small>' + esc(nh.lvl) + '</small>' + (w ? '<small class="sk-waste">' + w + ' pt sem efeito</small>' : '');
}
// The entry of Mundo › Perícias a sheet skill was picked from, while its name still starts with
// that entry's (a specialty may follow: "Animal Handling (Dogs)").
function skillLink(k) {
  var c = k && k.skillId ? skillById(k.skillId) : null;
  return c && norm(k.name).indexOf(norm(c.name)) === 0 ? c : null;
}
// Under the name of a linked row: the page of the entry and its rules in short.
function skillRulesHtml(k) {
  var c = skillLink(k); if (!c) return '';
  var rules = [c.defaults ? 'Padrão: ' + c.defaults : '', c.specialty ? 'exige especialização, entre parênteses' : '',
    c.prerequisites ? 'Pré-requisitos: ' + c.prerequisites : ''].filter(Boolean).join(' · ');
  return '<a href="' + skillHref(c.id) + '" data-skill-modal="' + esc(c.id) + '" title="Ver as regras desta perícia">' + svg(ICON.skill, 12, 2.2) + esc(c.page || 'Regras') + '</a>' +
    (rules ? ' <span title="' + esc(rules) + '">' + esc(rules) + '</span>' : '');
}
// Book entries with attribute and difficulty (not the cross-references) whose name, in English
// or in Portuguese, is like q (see searchCatalog); the most alike first.
function skillSuggestions(q) {
  if (!norm(q || '').trim()) return [];
  return searchCatalog((W.skills || []).filter(function (c) { return c.attribute && SKILL_DIFFS[c.difficulty]; }), q, null).slice(0, 8);
}
function skillEditRow(k, i, av) {
  return '<div class="sk-row" data-i="' + i + '">' +
    '<div class="sk-namecell"><div class="sk-pick">' +
    '<input class="sk-name" type="text" data-f="name" maxlength="100" placeholder="Digite para buscar. Ex.: Savoir-Faire (Military)" aria-label="Perícia" value="' + esc(k.name) + '"' +
    ' autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="skSug' + i + '">' +
    '<div class="suggest" id="skSug' + i + '" role="listbox" hidden></div></div>' +
    '<div class="sk-rules" data-rules="' + i + '">' + skillRulesHtml(k) + '</div></div>' +
    '<select data-f="attr" aria-label="Atributo">' + SKILL_ATTRS.map(function (x) { return '<option' + (x === k.attr ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select>' +
    '<select data-f="diff" aria-label="Dificuldade">' + SKILL_DIFF_KEYS.map(function (x) { return '<option value="' + x + '"' + (x === k.diff ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select>' +
    '<input type="number" data-f="pts" min="0" max="999" step="1" inputmode="numeric" aria-label="Pontos" value="' + k.pts + '">' +
    '<input type="number" data-f="bonus" min="-20" max="20" step="1" inputmode="numeric" aria-label="Bônus" value="' + k.bonus + '">' +
    '<span class="sk-nh' + (k.bonus || k.tbonus ? ' bonus' : '') + '" data-nh="' + i + '"' + (skillBonusTitle(k) ? ' title="' + esc(skillBonusTitle(k)) + '"' : '') + '>' + skillEditNhHtml(k, av) + '</span>' +
    '<button class="icon-btn" type="button" data-del="' + i + '" aria-label="Remover perícia" title="Remover">' + svg(ICON.x, 15, 2.4) + '</button>' +
    '<div class="sk-bnote" data-bnote="' + i + '"' + (k.bonus ? '' : ' hidden') + '>' + bonusNoteInput('', k.bonusNote) + '</div></div>';
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
  var head = '<div class="gurps-head"><h2 class="sec-title">Perícias</h2><span class="gurps-total" id="skTotal">' + skillsTotal(skills, cultures) + ' pts</span>' +
    (editing ? '<div class="btn-row"><button class="btn ghost" type="button" id="skCancel">Cancelar</button><button class="btn primary" type="button" id="skSave">Salvar perícias</button></div>'
      : can && !S.ui.combatDraft && !S.ui.advDraft ? '<div class="btn-row"><button class="btn" type="button" id="skEdit">' + svg(ICON.edit, 15) + 'Editar perícias</button></div>' : '') + '</div>';
  if (editing) {
    return '<section class="gurps" id="skills">' + head +
      '<div class="box sk-edit"><div class="sk-row sk-labels" aria-hidden="true"><span>Perícia</span><span>Atributo</span><span>Dif.</span><span>Pontos</span><span>Bônus</span><span>NH</span><span></span></div>' +
      '<div id="skRows">' + applyTalents(skills, s).map(function (k, i) { return skillEditRow(k, i, av); }).join('') + '</div>' +
      '<div><button class="btn" type="button" id="skAdd">' + svg(ICON.plus, 15, 2.4) + 'Adicionar perícia</button></div>' +
      '<p class="hint-text">Dificuldade: E fácil, A média, H difícil, VH muito difícil. Bônus é o que vantagens, talentos ou equipamentos somam ao NH; com bônus, escreva o motivo, que aparece ao passar o mouse no NH. Com 0 pontos vale o nível padrão.</p></div>' +
      '<div class="box sk-edit"><h3 class="sec-title" style="margin:0">Familiaridade Cultural</h3>' +
      '<p class="hint-text" style="margin:0">Aparece junto com as perícias fáceis, destacada, e os pontos entram no total delas.</p>' +
      '<div id="cuRows">' + cultures.map(cultureEditRow).join('') + '</div>' +
      '<div><button class="btn" type="button" id="cuAdd">' + svg(ICON.plus, 15, 2.4) + 'Adicionar cultura</button></div></div>' +
      '<div class="form-err" id="skErr" role="alert"></div></section>';
  }
  var groups = SKILL_DIFF_KEYS.filter(function (x) { return x !== 'VH' || skills.some(function (k) { return k.diff === 'VH'; }); });
  skills.forEach(function (k, i) { k.i = i; });
  applyTalents(skills, s);
  return '<section class="gurps" id="skills">' + head +
    (skills.length || cultures.length ? '<div class="gurps-grid">' + groups.map(function (x) {
      return skillGroupHtml(x, skills.filter(function (k) { return k.diff === x; }), av, can, x === 'E' ? cultures : null);
    }).join('') + '</div>'
      : '<p class="long none">Nenhuma perícia cadastrada.' + (can ? ' Use <b>Editar perícias</b> para adicionar.' : '') + '</p>') + '</section>';
}
// Out of the editor, the points of each skill change right in the table: the NH and totals follow
// as you type, and the sheet is saved a moment after the last change or when the field is left.
// While a points field has focus, data that arrives does not redraw the page (see onData in app.js);
// leaving it redraws the page if something arrived meanwhile.
function wireQuickPts(s, box) {
  var ui = S.ui, av = attrValues(ui.attrDraft || sheetAttrs(s)), list = applyTalents(sheetSkills(s), s), cultures = sheetCultures(s), edits = {}, timer = 0;
  if (!box.querySelector('.gpts-in')) return;
  function paintTotals() {
    $('skTotal').textContent = skillsTotal(list, cultures) + ' pts';
    SKILL_DIFF_KEYS.forEach(function (x) {
      var t = box.querySelector('[data-gtot="' + x + '"]');
      if (t) t.textContent = String(skillsTotal(list.filter(function (k) { return k.diff === x; }), x === 'E' ? cultures : null));
    });
  }
  // edits: 'k<i>' for a skill, 'c<j>' for a Cultural Familiarity row, with the new points.
  function save() {
    clearTimeout(timer); timer = 0;
    var keys = Object.keys(edits); if (!keys.length) return;
    var changed = edits; edits = {};
    // The sheet as it is now in the database, with these points on top (matched by name, and
    // attribute and difficulty for skills, in case someone else changed the lists meanwhile).
    var cur = sheetById(s.id) || s, fresh = sheetSkills(cur), freshC = sheetCultures(cur);
    keys.forEach(function (key) {
      var n = +key.slice(1), hit;
      if (key[0] === 'k') { var k = list[n]; hit = fresh.filter(function (x) { return x.name === k.name && x.attr === k.attr && x.diff === k.diff; })[0]; }
      else { var c = cultures[n]; hit = freshC.filter(function (x) { return x.name === c.name; })[0]; }
      if (hit) hit.pts = changed[key];
    });
    Ops.saveSheetSkills(cur, fresh, freshC).catch(function (er) { toast(errorText(er), true); ui.ptsStale = false; renderSheetPage(); });
  }
  function field(e) { var t = /** @type {AnyEl} */ (e.target); return t && t.classList && t.classList.contains('gpts-in') ? t : null; }
  // The skill or culture of a points field.
  function itemOf(t) { return t.hasAttribute('data-c') ? cultures[+t.getAttribute('data-c')] : list[+t.getAttribute('data-k')]; }
  box.addEventListener('input', function (e) {
    var t = field(e); if (!t || t.value === '') return;
    var item = itemOf(t); if (!item) return;
    if (t.hasAttribute('data-c')) { item.pts = cleanInt(t.value, 0, 99, item.pts); edits['c' + t.getAttribute('data-c')] = item.pts; }
    else {
      var i = +t.getAttribute('data-k');
      item.pts = cleanInt(t.value, 0, 999, item.pts); edits['k' + i] = item.pts;
      var nh = skillNh(item, av), cell = box.querySelector('[data-gnh="' + i + '"]');
      if (cell) cell.innerHTML = esc(nh.rel) + '<small>' + esc(nh.lvl) + '</small>';
    }
    paintTotals();
    clearTimeout(timer); timer = setTimeout(save, 700);
  });
  box.addEventListener('keydown', function (e) { var t = field(e); if (t && e.key === 'Enter') t.blur(); });
  box.addEventListener('focusout', function (e) {
    var t = field(e); if (!t) return;
    if (t.value === '') t.value = String(itemOf(t).pts);
    save();
    setTimeout(function () {
      var a = document.activeElement;
      if (ui.ptsStale && !(a && a.classList && a.classList.contains('gpts-in'))) { ui.ptsStale = false; renderSheetPage(); }
    }, 250);
  });
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
  if (!ui.skillDraft && $('skills')) wireQuickPts(s, $('skills'));
  var d = ui.skillDraft, box = $('skills'); if (!d || !box || !$('skSave')) return;
  var av = attrValues(ui.attrDraft || sheetAttrs(s));
  box.addEventListener('input', onEdit); box.addEventListener('change', onEdit);
  function paintRow(i) {
    var k = applyTalents([cleanSkill(d.skills[i])], s)[0], cell = box.querySelector('[data-nh="' + i + '"]'), rules = box.querySelector('[data-rules="' + i + '"]');
    if (cell) { cell.className = 'sk-nh' + (k.bonus || k.tbonus ? ' bonus' : ''); cell.title = skillBonusTitle(k); cell.innerHTML = skillEditNhHtml(k, av); }
    if (rules) rules.innerHTML = skillRulesHtml(k);
    var note = box.querySelector('[data-bnote="' + i + '"]'); if (note) note.hidden = !k.bonus;
  }
  function onEdit(e) {
    var el = e.target, f = el.dataset && el.dataset.f, row = el.closest && el.closest('[data-i], [data-c]'); if (!f || !row) return;
    var isSkill = row.hasAttribute('data-i'), i = +row.getAttribute(isSkill ? 'data-i' : 'data-c'), item = (isSkill ? d.skills : d.cultures)[i];
    if (f === 'name' || f === 'attr' || f === 'diff' || f === 'bonusNote') item[f] = el.value;
    else if (el.value !== '') item[f] = f === 'bonus' ? cleanInt(el.value, -20, 20, 0) : cleanInt(el.value, 0, 999, 0);
    if (f === 'bonusNote' && el.value.trim()) el.classList.remove('invalid');
    if (isSkill) {
      // Another name than the entry picked from the list: the link goes.
      if (f === 'name' && item.skillId && skillById(item.skillId) && !skillLink(item)) delete item.skillId;
      paintRow(i);
    }
    $('skTotal').textContent = skillsTotal(d.skills.map(cleanSkill), d.cultures.map(cleanCulture)) + ' pts';
  }
  // Suggestions from Mundo › Perícias under the name being typed; picking one fills the name,
  // attribute and difficulty and links the row to the entry.
  loadCatalog('skills').then(function () { if (ui.skillDraft === d) d.skills.forEach(function (k, i) { paintRow(i); }); });
  var sug = { i: -1, list: null, input: null, options: [], active: 0 };
  function hideSug() {
    if (sug.list) { sug.list.hidden = true; sug.input.setAttribute('aria-expanded', 'false'); sug.input.removeAttribute('aria-activedescendant'); }
    sug.i = -1; sug.list = null; sug.input = null; sug.options = [];
  }
  function paintSug(input) {
    var row = input.closest('[data-i]'), i = row ? +row.getAttribute('data-i') : -1, list = row && row.querySelector('.suggest');
    if (!list) return;
    if (sug.list && sug.list !== list) hideSug();
    var options = skillSuggestions(input.value);
    // Nothing to offer, or exactly the entry already linked.
    if (!options.length || (options.length === 1 && options[0].id === d.skills[i].skillId && skillLink(d.skills[i]))) { sug.list = list; sug.input = input; hideSug(); return; }
    sug.i = i; sug.list = list; sug.input = input; sug.options = options; sug.active = Math.min(sug.active, options.length - 1);
    list.innerHTML = options.map(function (c, n) {
      return '<button type="button" role="option" id="skSug' + i + 'o' + n + '" data-o="' + n + '" class="' + (n === sug.active ? 'act' : '') + '" aria-selected="' + (n === sug.active) + '">' +
        '<span>' + esc(c.name) + ptNameHtml(c) + '</span><small>' + esc(c.attribute + '/' + c.difficulty + (c.page ? ' · ' + c.page : '')) + '</small></button>';
    }).join('');
    list.hidden = false; input.setAttribute('aria-expanded', 'true'); input.setAttribute('aria-activedescendant', 'skSug' + i + 'o' + sug.active);
  }
  function pickSug(n) {
    var c = sug.options[n], i = sug.i, input = sug.input; if (!c || i < 0) return;
    var item = d.skills[i], row = input.closest('[data-i]');
    // A skill that needs a specialty gets "()" with the cursor inside, to type it.
    item.name = c.name + (c.specialty ? ' ()' : ''); item.attr = c.attribute; item.diff = c.difficulty; item.skillId = c.id;
    input.value = item.name;
    row.querySelector('[data-f="attr"]').value = item.attr;
    row.querySelector('[data-f="diff"]').value = item.diff;
    hideSug(); paintRow(i);
    if (c.specialty) { input.focus(); input.setSelectionRange(item.name.length - 1, item.name.length - 1); }
    else { var pts = row.querySelector('[data-f="pts"]'); pts.focus(); pts.select(); }
  }
  var rows = $('skRows');
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
    var b = e.target.closest && e.target.closest('[data-del], [data-cdel]'); if (!b) return;
    if (b.hasAttribute('data-del')) d.skills.splice(+b.getAttribute('data-del'), 1); else d.cultures.splice(+b.getAttribute('data-cdel'), 1);
    renderSheetPage();
  });
  $('skAdd').onclick = function () { d.skills.push(cleanSkill({ name: '', attr: 'IQ', diff: 'A', pts: 1 })); renderSheetPage(); focusLast('#skRows .sk-name'); };
  $('cuAdd').onclick = function () { d.cultures.push({ name: '', pts: 1 }); renderSheetPage(); focusLast('#cuRows .sk-name'); };
  $('skCancel').onclick = function () { ui.skillDraft = null; renderSheetPage(); };
  $('skSave').onclick = function () {
    if (!checkBonusNotes(box)) { $('skErr').textContent = 'Escreva o motivo de cada bônus.'; return; }
    $('skErr').textContent = '';
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
    var chars = sheetChars(s.id), p = sheetPortrait(s);
    return '<a class="loc-card" href="' + sheetHref(s.id) + '"><div class="thumb sheet-thumb"' + (p ? ' data-img="' + esc(p.ref) + '"' : '') + '>' + svg(ICON.sheet, 28, 1.6) + '</div><div class="map-card-body"><strong>' + esc(s.name) + '</strong>' +
      '<span class="where">' + (chars.length ? esc(chars.map(function (c) { return c.name; }).join(', ')) : 'Sem personagem vinculado') + '</span>' +
      (s.attrs ? '<span class="meta">' + gurpsStats(sheetAttrs(s)).total + ' pts</span>' : '') + '</div></a>';
  }).join('') + '</div>' : '<p class="lede">Nenhuma ficha encontrada para essa busca.</p>';
  fillImages(el);
}

/* =====================================================================
   Page: single sheet
   ===================================================================== */
var SHEET_TABS = [{ key: 'sheet', label: 'Ficha' }, { key: 'equip', label: 'Equip.' }];
function renderSheetPage() {
  var s = sheetById(S.route.sheetId), ui = S.ui;
  if (!s) {
    pageRoot.innerHTML = crumbsHtml('sheets') + (W.loaded.sheets ? '<h1>Ficha não encontrada</h1><p class="lede">Essa ficha foi excluída ou o link está incompleto.</p><div><a class="btn" href="#fichas">Voltar para Fichas</a></div>' : '<p class="lede">Carregando ficha…</p>');
    return;
  }
  var can = canWrite(), chars = sheetChars(s.id), portrait = sheetPortrait(s);
  var head = crumbsHtml('sheet:' + s.id) + '<div class="head-row"><div class="sheet-title">' +
    (portrait ? '<div class="sheet-portrait" id="sheetPortrait">' + svg(ICON.user, 28, 1.6) + '</div>' : '') +
    '<div><span class="badge">' + svg(ICON.sheet, 12, 2.4) + 'Ficha</span><h1>' + esc(s.name) + '</h1>' +
    '<p class="lede">' + (chars.length ? 'Ficha de ' + esc(chars.map(function (c) { return c.name; }).join(', ')) : 'Nenhum personagem vinculado') + '</p></div></div>' +
    (can ? '<div class="btn-row"><button class="btn" type="button" id="editSheetBtn">' + svg(ICON.edit, 15) + 'Editar ficha</button><button class="btn danger" type="button" id="delSheetBtn">' + svg(ICON.trash, 15) + 'Excluir</button></div>' : '') + '</div>' +
    (ui.confirmDelete ? '<div class="confirm" role="alert"><span>Excluir a ficha <b>' + esc(s.name) + '</b>?' + (chars.length ? ' ' + plural(chars.length, 'personagem fica', 'personagens ficam') + ' sem ficha; os personagens continuam cadastrados.' : '') + ' Não dá para desfazer.</span><div class="btn-row"><button class="btn danger solid" type="button" id="delSheetYes">Excluir ficha</button><button class="btn ghost" type="button" id="delSheetNo">Cancelar</button></div></div>' : '');
  var main = '<section><h2 class="sec-title">Observações</h2>' + (s.description ? '<p class="long">' + esc(s.description) + '</p>' : '<p class="long none">Sem observações.</p>') + '</section>';
  // Closed until its title is clicked (see foldBox). At the top, above the attributes.
  var side = foldBox('chars', 'Personagens', chars.length,
    (chars.length ? '<div class="people">' + chars.map(personChip).join('') + '</div>' : '<p class="lede" style="font-size:13px;margin:0">Nenhum personagem vinculado.</p>') +
    (can ? '<div style="margin-top:10px"><button class="btn" type="button" id="sheetCharsBtn">' + svg(ICON.user, 15) + (chars.length ? 'Trocar personagem' : 'Vincular personagem') + '</button></div>' : ''));
  // Two tabs: everything but the equipment, and the equipment. Only the open one is drawn (the
  // wire* functions skip a section that isn't there); a draft in the other survives the switch.
  var tab = ui.sheetTab === 'equip' ? 'equip' : 'sheet';
  var tabs = '<div class="seg" role="tablist" aria-label="Seção da ficha">' + SHEET_TABS.map(function (t) {
    var on = t.key === tab;
    return '<button type="button" role="tab" data-stab="' + t.key + '" aria-selected="' + on + '" class="' + (on ? 'on' : '') + '">' + t.label + '</button>';
  }).join('') + '</div>';
  pageRoot.innerHTML = head + '<div class="sheet-chars">' + tabs + side + '</div>' + (tab === 'equip' ? sheetEquipHtml(s, !!ui.equipDraft && can)
    : sheetAttrsHtml(s, ui.attrDraft || sheetAttrs(s), !!ui.attrDraft && can) + sheetSkillsHtml(s, !!ui.skillDraft && can) +
      sheetCombatHtml(s, !!ui.combatDraft && can) + sheetAdvsHtml(s, !!ui.advDraft && can) + main);
  pageRoot.querySelectorAll('[data-stab]').forEach(function (b) {
    b.onclick = function () { var t = b.getAttribute('data-stab'); if (t !== tab) { ui.sheetTab = t; renderSheetPage(); } };
  });
  fillImages(pageRoot);
  if (portrait) W.store.imageUrl(portrait.ref).then(function (u) {
    var h = $('sheetPortrait'); if (!h || !u) return;
    h.innerHTML = '<button class="hero-zoom" type="button" aria-label="Ampliar a imagem de ' + esc(portrait.name) + '" title="' + esc(portrait.name) + ' · clique para ampliar"><img src="' + esc(u) + '" alt="' + esc(portrait.name) + '"></button>';
    h.querySelector('.hero-zoom').onclick = function () { zoomImage(u, portrait.name); };
  });
  wireFolds(pageRoot);
  wireSheetAttrs(s);
  wireSheetSkills(s);
  wireSheetCombat(s);
  wireSheetAdvs(s);
  wireSheetEquip(s);
  var cb = $('sheetCharsBtn'); if (cb) cb.onclick = function () { openSheetCharsForm(s); };
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
   Form: the character of a sheet, from the sheet's page. A sheet has one
   character and a character one sheet: picking one that has another sheet
   moves it here, and the one that was here is left without a sheet.
   ===================================================================== */
function openSheetCharsForm(s) {
  var cur = sheetChars(s.id), curId = cur.length ? cur[0].id : '', list = W.characters.slice().sort(byName);
  var opts = '<option value="">Nenhum personagem</option>' + list.map(function (c) {
    var other = c.sheetId && c.sheetId !== s.id ? sheetById(c.sheetId) : null;
    return '<option value="' + esc(c.id) + '"' + (c.id === curId ? ' selected' : '') + '>' + esc(c.name) + (other ? ' (já vinculado a “' + esc(other.name) + '”)' : '') + '</option>';
  }).join('');
  var html = '<form id="sheetCharsForm" novalidate><h2 id="scTitle">Personagem de ' + esc(s.name) + '</h2>' +
    '<p class="lede" style="margin:0">Cada ficha fica vinculada a um personagem só, e cada personagem a uma ficha. Escolher outro substitui o atual.</p>' +
    (list.length ? '<div class="field"><label for="scChar">Personagem</label><select id="scChar">' + opts + '</select></div>'
      : '<p class="notice">Nenhum personagem cadastrado ainda.</p>') +
    '<div class="form-err" id="scErr" role="alert"></div>' +
    '<div class="btn-row" style="justify-content:flex-end"><button class="btn ghost" type="button" id="scCancel">Cancelar</button>' + (list.length ? '<button class="btn primary" type="submit" id="scSave">Salvar</button>' : '') + '</div></form>';
  showModal(html);
  modal.setAttribute('aria-labelledby', 'scTitle');
  $('scCancel').onclick = function () { closeModal(); };
  $('sheetCharsForm').onsubmit = function (e) {
    e.preventDefault();
    if (modalOpen.busy || !$('scChar')) return;
    var id = $('scChar').value || null;
    // Sheets from before this rule may have more than one: saving leaves only the one chosen.
    if (id === (curId || null) && cur.length <= 1) { closeModal(); return; }
    if (!sheetById(s.id)) { $('scErr').textContent = 'Essa ficha não existe mais.'; return; }
    if (id && !charById(id)) { $('scErr').textContent = 'Esse personagem não existe mais. Escolha outro.'; return; }
    modalOpen.busy = true;
    var btn = $('scSave'); btn.disabled = true; btn.textContent = 'Salvando…'; $('scCancel').disabled = true; $('scErr').textContent = '';
    // With a character, setCharSheet also unlinks whoever else had the sheet; with none, each one goes.
    var done = id ? Ops.setCharSheet(id, s.id) : cur.reduce(function (p, c) { return p.then(function () { return Ops.setCharSheet(c.id, null); }); }, Promise.resolve());
    done.then(function () {
      closeModal(true);
      toast(id ? 'Ficha vinculada a ' + charById(id).name + '.' : 'Vínculo com o personagem removido.');
    }, function (er) {
      if (!modalOpen) return;
      modalOpen.busy = false; btn.disabled = false; btn.textContent = 'Salvar'; $('scCancel').disabled = false;
      $('scErr').textContent = errorText(er);
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
    return '<option value="' + esc(s.id) + '"' + (s.id === cur ? ' selected' : '') + '>' + esc(s.name) + (others.length ? ' (hoje de ' + esc(others.map(function (x) { return x.name; }).join(', ')) + ', que fica sem ficha)' : '') + '</option>';
  }).join('');
  var html = '<form id="sheetLinkForm" novalidate><h2 id="slTitle">Ficha de ' + esc(c.name) + '</h2>' +
    '<p class="lede" style="margin:0">Cada personagem fica vinculado a uma ficha só, e cada ficha a um personagem. Escolher outra substitui a atual.</p>' +
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
