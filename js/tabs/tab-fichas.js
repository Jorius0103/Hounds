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
// An ally (sheet.allyOf: the main sheet that created it) is a sheet of its own, shown only in a tab of
// its main sheet's page. Whoever sees the main sheet sees its allies (the database gives them its
// visibility), so they are indexed with it, from W.raw, even before their own copy catches up.
function indexSheets() {
  var idx = /** @type {Record<string, Sheet>} */ ({});
  W.sheets.forEach(function (s) { idx[s.id] = s; });
  W.raw.sheets.forEach(function (s) { var m = s.allyOf && idx[s.allyOf]; if (m && !m.allyOf) idx[s.id] = s; });
  W.sheetIdx = idx;
}
function sheetById(id) { return (id && W.sheetIdx[id]) || null; }
function sheetHref(id) { return hrefFor('sheet:' + id); }
function allyHref(mainId, allyId) { return sheetHref(mainId) + '~' + encodeURIComponent(allyId); }
// The sheets that are not allies: the ones listed in Fichas, the menu and the forms.
function mainSheets() { return W.sheets.filter(function (s) { return !s.allyOf; }); }
// The allies of a main sheet, in the order they were created.
function sheetAllies(id) {
  return W.raw.sheets.filter(function (s) { return s.allyOf === id && W.sheetIdx[s.id]; })
    .sort(function (a, b) { return (a.createdAt || 0) - (b.createdAt || 0) || (a.id < b.id ? -1 : 1); });
}
function allyLabel(s) { return s.allyName || s.name; }
// While an ally is open, the content pane takes the ally colors (#view-page.ally-view, in paginas.css).
// ally: the open ally (its color, data-ally-color), or nothing.
function paintAllyView(ally) {
  var v = $('view-page'); if (!v) return;
  v.classList.toggle('ally-view', !!ally);
  if (ally) v.setAttribute('data-ally-color', allyColor(ally)); else v.removeAttribute('data-ally-color');
}
// The colors an ally's panel can take (css/paginas.css, #view-page.ally-view[data-ally-color]): [key, name,
// swatch]. Not amber, the main sheet's. Without one (allies from before), violet.
var ALLY_COLORS = [['violet', 'Violeta', 'hsl(262 38% 60%)'], ['blue', 'Azul', 'hsl(212 38% 58%)'], ['green', 'Verde', 'hsl(148 32% 50%)'],
  ['red', 'Vermelho', 'hsl(4 42% 60%)'], ['olive', 'Oliva', 'hsl(78 30% 46%)'], ['slate', 'Cinza', 'hsl(215 12% 55%)']];
function allyColor(s) { var k = s && s.allyColor; return ALLY_COLORS.some(function (c) { return c[0] === k; }) ? k : 'violet'; }
function allyColorHex(s) { var k = allyColor(s); return ALLY_COLORS.filter(function (c) { return c[0] === k; })[0][2]; }
function allyDotHtml(s) { return '<span class="ally-dot" style="background:' + allyColorHex(s) + '" aria-hidden="true"></span>'; }
function allyColorPickHtml(cur) {
  return '<div class="field"><span class="lab">Cor</span><div class="vis-users ally-colors" role="radiogroup" aria-label="Cor do aliado">' + ALLY_COLORS.map(function (c) {
    return '<label class="vis-user"><input type="radio" name="acolor" value="' + c[0] + '"' + (c[0] === cur ? ' checked' : '') + '>' +
      '<span class="ally-dot" style="background:' + c[2] + '" aria-hidden="true"></span><span>' + c[1] + '</span></label>';
  }).join('') + '</div><span class="hint-text">A cor que a ficha do aliado toma quando ele está aberto.</span></div>';
}
function allyColorVal() { var el = modal.querySelector('input[name="acolor"]:checked'); return el ? el.getAttribute('value') : 'violet'; }
// The sheet whose tabs (Ficha, Equip., Magia) the page shows: the main one or the open ally.
function pageSheet() {
  var main = sheetById(S.route && S.route.sheetId), ally = main && S.route.allyId ? sheetById(S.route.allyId) : null;
  return ally && ally.allyOf === main.id ? ally : main;
}
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

// The buttons of a sheet section, the same in all of them (same text, same size: .sec-btn): Editar
// while closed; Cancelar and Salvar while it is edited. what: the section ("perícias"), for the
// screen readers and the hover.
function secEditBtnHtml(id, what) {
  return '<div class="btn-row"><button class="btn sec-btn" type="button" id="' + id + '" aria-label="Editar ' + what + '" title="Editar ' + what + '">' + svg(ICON.edit, 15) + 'Editar</button></div>';
}
function secSaveBtnsHtml(cancelId, saveId, what) {
  return '<div class="btn-row"><button class="btn ghost sec-btn" type="button" id="' + cancelId + '" aria-label="Cancelar a edição de ' + what + '">Cancelar</button>' +
    '<button class="btn primary sec-btn" type="button" id="' + saveId + '" aria-label="Salvar ' + what + '" title="Salvar ' + what + '">Salvar</button></div>';
}
Ops.saveSheet = function (s, fields) {
  var name = (fields.name || '').trim();
  if (!name) return Promise.reject({ message: 'Informe o nome da ficha.' });
  var t = now();
  var body = { v: 1, name: name, description: (fields.description || '').trim(), visible: fields.visible !== false, sharedWith: fields.sharedWith || (s && s.sharedWith) || [],
    createdBy: owner(s), createdAt: (s && s.createdAt) || t, updatedAt: t };
  // put replaces the whole document: attributes and skills are edited apart and must survive a rename.
  ['attrs', 'reactions', 'points', 'skills', 'cultures', 'spells', 'combat', 'advs', 'disadvs', 'quirks', 'equip', 'bodies', 'packs', 'homes', 'armorSets', 'customWeapons', 'customShields', 'allyOf', 'allyName', 'allyColor'].forEach(function (k) { if (s && s[k]) body[k] = s[k]; });
  // An ally sees and is seen as its main sheet: it keeps the main one's visibility.
  if (s && s.allyOf) { body.visible = s.visible !== false; body.sharedWith = s.sharedWith || []; }
  return W.store.put('sheets', s ? s.id : null, body);
};
// A new ally of the main sheet m: a sheet of its own (attributes at 10, nothing else), named like its
// tab, "Aliado 1", "Aliado 2"... (the first number no ally of m uses). Resolves to its id.
// The next free name for an ally of m: "Aliado 2", "Aliado 3"...
function nextAllyName(m) {
  var used = {}, n = sheetAllies(m.id).length + 1;
  sheetAllies(m.id).forEach(function (a) { used[norm(allyLabel(a))] = true; });
  while (used[norm('Aliado ' + n)]) n++;
  return 'Aliado ' + n;
}
// name and color: what Criar Aliado's form asks (an empty name takes the next free one).
Ops.createAlly = function (m, name, color) {
  if (!rawHas('sheets', m.id) || m.allyOf) return Promise.reject({ message: 'Essa ficha não existe mais.' });
  var t = now();
  name = String(name || '').trim().slice(0, 100) || nextAllyName(m);
  return W.store.put('sheets', null, { v: 1, name: name, description: '', allyOf: m.id, allyName: name, allyColor: allyColor({ allyColor: color }),
    visible: m.visible !== false, sharedWith: m.sharedWith || [], createdBy: owner(null), createdAt: t, updatedAt: t });
};
// The name of an ally's tab and its color; the name of its sheet does not change.
Ops.renameAlly = function (a, name, color) {
  name = String(name || '').trim();
  if (!name) return Promise.reject({ message: 'Informe o nome do aliado.' });
  if (!rawHas('sheets', a.id)) return Promise.reject({ message: 'Esse aliado não existe mais.' });
  return W.store.patch('sheets', a.id, { allyName: name.slice(0, 100), allyColor: allyColor({ allyColor: color || a.allyColor }), updatedAt: now() });
};
// reactions: the Reações table, saved with the attributes (it is edited with them).
Ops.saveSheetAttrs = function (s, a, reactions) {
  if (!rawHas('sheets', s.id)) return Promise.reject({ message: 'Essa ficha não existe mais.' });
  var clean = {}, p = /** @type {Record<string, any>} */ ({ updatedAt: now() });
  Object.keys(SHEET_ATTRS0).forEach(function (k) { clean[k] = cleanAttr(k, a[k]); });
  p.attrs = clean;
  if (reactions) p.reactions = reactions.map(cleanReaction).filter(function (x) { return x.name; });
  return W.store.patch('sheets', s.id, p);
};
// The account of a main sheet (users.sheetId, set by the Mestre): an account has one sheet at most and a
// sheet one account. The account also sees the sheet while it is hidden: it goes in the sheet's sharedWith,
// and leaves the sharedWith of the sheet it had.
function sheetAccount(id) { return (id && W.users.filter(function (u) { return u.sheetId === id; })[0]) || null; }
function accountSheet(u) { var s = u && u.sheetId ? rawGet('sheets', u.sheetId) : null; return s && !s.allyOf ? s : null; }
// A new link shows on the open sheet (unless a section is being edited; it shows on Salvar or Cancelar).
window.addEventListener('hub:users', function () {
  filterNotes(); // the notes of a sheet follow its account (sheetNotesOpen)
  if (S.route && S.route.page === 'sheet' && !modalOpen && !(S.ui.attrDraft || sheetDraftOpen() || gearEditing() || S.ui.dragging)) renderSheetPage();
});
Ops.linkSheetAccount = function (sheetId, userId) {
  var prev = sheetAccount(sheetId), u = userId ? W.users.filter(function (x) { return x.id === userId; })[0] : null;
  if ((prev ? prev.id : null) === (u ? u.id : null)) return Promise.resolve();
  var t = now(), q = /** @type {Promise<any>} */ (Promise.resolve());
  function share(id, drop, add) {
    var s = rawGet('sheets', id); if (!s) return;
    var list = (s.sharedWith || []).filter(function (x) { return x !== drop; });
    if (add && list.indexOf(add) < 0) list.push(add);
    if (list.join() !== (s.sharedWith || []).join()) q = q.then(function () { return W.store.patch('sheets', id, { sharedWith: list, updatedAt: t }); });
  }
  // One account per sheet: the one it had goes first.
  if (prev) q = q.then(function () { return W.store.patch('users', prev.id, { sheetId: null, updatedAt: t }); });
  if (u) {
    var old = accountSheet(u);
    q = q.then(function () { return W.store.patch('users', u.id, { sheetId: sheetId, updatedAt: t }); });
    if (old && old.id !== sheetId) share(old.id, u.id, null);
  }
  share(sheetId, prev && prev.id, u && u.id);
  return q;
};
// Characters linked to it lose the link; they stay as they are otherwise. Its allies go with it.
Ops.deleteSheet = function (s) {
  // A relational database unlinks the characters and removes the allies itself, in one transaction (hounds_remove).
  if (W.store.relational) return W.store.remove('sheets', s.id);
  // Its Anotações tab (the titles with its sheetId and their notes) goes too.
  var nbs = W.raw.notebooks.filter(function (nb) { return nb.sheetId === s.id; }), nbIds = nbs.map(function (nb) { return nb.id; });
  var gone = W.raw.notes.filter(function (n) { return nbIds.indexOf(n.notebookId) >= 0; }).map(function (n) { return ['notes', n.id]; })
    .concat(nbIds.map(function (id) { return ['notebooks', id]; }));
  var acc = sheetAccount(s.id);
  return gone.reduce(function (q, x) { return q.then(function () { return W.store.remove(x[0], x[1]); }); }, Promise.resolve()).then(function () {
    // Its account is left without a sheet.
    return acc ? W.store.patch('users', acc.id, { sheetId: null, updatedAt: now() }) : null;
  }).then(function () {
    return W.raw.characters.filter(function (c) { return c.sheetId === s.id; }).reduce(function (q, c) {
      return q.then(function () { return W.store.patch('characters', c.id, { sheetId: null, updatedAt: now() }); });
    }, Promise.resolve());
  }).then(function () {
    return W.raw.sheets.filter(function (a) { return a.allyOf === s.id; }).reduce(function (q, a) {
      return q.then(function () { return W.store.remove('sheets', a.id); });
    }, Promise.resolve());
  }).then(function () { return W.store.remove('sheets', s.id); });
};
// The one sheet of a character (null removes the link). A single field holds it, so linking
// another sheet replaces the current one; a list or a sheet that no longer exists is refused.
// A sheet belongs to one character too: any other character on it (hidden ones included) loses
// the link first. justCreated: the sheet was saved a moment ago and may not have reached W.raw yet.
Ops.setCharSheet = function (charId, sheetId, justCreated) {
  if (!rawHas('characters', charId)) return Promise.reject({ message: 'Esse personagem não existe mais.' });
  if (sheetId != null && typeof sheetId !== 'string') return Promise.reject({ message: 'Um personagem só pode ter uma ficha.' });
  if (sheetId && !justCreated && !rawHas('sheets', sheetId)) return Promise.reject({ message: 'Essa ficha não existe mais. Escolha outra.' });
  if (sheetId && (rawGet('sheets', sheetId) || {}).allyOf) return Promise.reject({ message: 'A ficha de um aliado não pode ser vinculada a um personagem. Vincule a ficha principal.' });
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
   level above it costs 5 points. metal and spellPenalty belong to the
   table and cost no points. enc (Peso, the encumbrance level) is not typed:
   it is the level of the load carried (sheetEncLevel), and each level takes
   1 from Move and from Dodge (the table's rule).
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
  out.enc = sheetEncLevel(s, out.st);
  return out;
}
// Basic Lift (p. B15): ST × ST ÷ 5, whole from 10 lbs up.
function basicLift(st) { var bl = st * st / 5; return bl >= 10 ? Math.round(bl) : Math.round(bl * 10) / 10; }
// Peso: the level of the load (Equip. › Carga: the Corpo configuration in use and the pack in use,
// saved) against Basic Lift at ST st (p. B17), 0 to 4; over 10 × Basic Lift counts as 4. Changing
// what is carried (or ST) changes it, and with it Move, Dodge and the Judo and Karate penalty.
function sheetEncLevel(s, st) {
  if (!s || typeof sheetGear !== 'function') return 0;
  return Math.min(EQ_LEVELS.length - 1, equipLevel(gearLoad(sheetGear(s)).total, basicLift(st)));
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
// a may carry the advantages' effects (withAdvFx): the values come from it, the points from its base.
function gurpsStats(a) {
  var speed = (a.ht + a.dx) / 4 + a.speed, move = Math.max(0, Math.floor(speed) + a.move), p = a.fx ? a.fx.base : a;
  var cost = { st: (p.st - 10) * 10, dx: (p.dx - 10) * 20, iq: (p.iq - 10) * 20, ht: (p.ht - 10) * 10, per: p.per * 5, will: p.will * 5,
    hp: p.hp * 2, fp: p.fp * 3, speed: p.speed * 20, move: p.move * 5 };
  var attrPts = cost.st + cost.dx + cost.iq + cost.ht + cost.per + cost.will, secPts = cost.hp + cost.fp + cost.speed + cost.move;
  return {
    per: a.perBase + a.per, will: a.willBase + a.will, hp: a.st + a.hp, fp: a.ht + a.fp, speed: speed, move: move,
    // The table's rule: each level of Peso takes 1 from Move and from Dodge.
    moveNow: Math.max(0, move - a.enc), dodge: Math.floor(speed) + 3 - a.enc,
    lift: basicLift(a.st), dmg: gurpsDamage(a.st),
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
  ['metal', 'Peso em Metal', ''], ['spellPenalty', 'Penalidade em Magias', ''], ['enc', 'Peso', 'nível de carga, pelo que carrega (Equip. › Carga)']];
// The value a row shows (and its input holds while editing).
function attrValue(k, a, r) {
  if (k in r && k !== 'cost') return r[k];
  return a[k];
}
function attrValueText(k, a, r) {
  if (k === 'speed') return fmtDec(r.speed, 2);
  if (k === 'metal') return String(a.metal).replace('.', ',');
  if (k === 'move' && a.enc) return r.moveNow + '<span class="gnote">' + r.move + ' − ' + a.enc + ' de Peso</span>';
  if (k === 'enc') return '<span data-encv>' + a.enc + '<span class="gnote">' + esc(EQ_LEVELS[a.enc][1].toLowerCase()) + ', automático</span></span>';
  return String(attrValue(k, a, r));
}
function attrInput(k, label, a, r) {
  var free = attrBase(k, a) == null, lim = ATTR_LIMITS[k];
  return '<input class="attr-in" type="number" inputmode="decimal" data-k="' + k + '" aria-label="' + esc(label) + '" value="' + attrValue(k, a, r) + '"' +
    ' step="' + (k === 'speed' ? '0.25' : k === 'metal' ? '0.1' : '1') + '"' + (free ? ' min="' + lim[0] + '" max="' + lim[1] + '"' : '') + '>';
}
// e and re: the attributes with the advantages' effects (withAdvFx) and their stats. Out of the
// editor the value is the final one, with the base and the bonus under it; in the editor the field
// is the base and the bonus is beside it.
function attrRowsHtml(rows, a, r, editing, e, re) {
  return rows.map(function (row) {
    var k = row[0], pts = r.cost[k], fx = attrFxInfo(k, a, r, e, re);
    var sub = ATTR_BASES[k] ? attrBaseHtml(k, a, editing) : row[2] ? esc(row[2]) : '';
    return '<tr><td><b>' + esc(row[1]) + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</td>' +
      '<td class="gval' + (fx ? ' fx' : '') + '"' + (fx ? ' title="' + esc(fx.title) + '"' : '') + '>' +
      (editing && k !== 'enc' ? attrInput(k, row[1], a, r) + (fx ? '<span class="gnote fxnote">' + esc(fx.short) + '</span>' : '')
        : attrValueText(k, e, re) + (fx ? '<span class="gnote fxnote">' + esc(fx.note) + '</span>' : '')) + '</td>' +
      '<td class="gpts' + (pts == null ? ' none' : '') + '" data-pts="' + k + '">' + (pts == null ? '—' : pts) + '</td></tr>';
  }).join('');
}
// What the advantages do to a row: null when nothing. note: "base 10 · +1 de vantagens"; title: each source.
function attrFxInfo(k, a, r, e, re) {
  var own = e.fx && e.fx.b[k], bv = attrValue(k, a, r), fv = attrValue(k, e, re);
  if (k === 'move') { bv = Math.max(0, r.move - e.enc); fv = Math.max(0, re.move - e.enc); }
  if (bv === fv && fxEmpty(own)) return null;
  function fmt(v) { return k === 'speed' ? fmtDec(v, 2) : String(v); }
  var d = Math.round((fv - bv) * 100) / 100, parts = own ? fxParts(own) : [];
  if (d !== (own ? own.n : 0)) parts.push((d - (own ? own.n : 0) > 0 ? '+' : '') + fmt(Math.round((d - (own ? own.n : 0)) * 100) / 100) + ' de outro atributo mudado por vantagem');
  return { note: 'base ' + fmt(bv) + (d ? ' · ' + (d > 0 ? '+' : '') + fmt(d) + ' de vantagens' : '') + (own && own.conds.length ? ' · condicional' : ''),
    short: (d ? (d > 0 ? '+' : '') + fmt(d) + ' de vantagens' : 'condicional'),
    title: 'Base ' + fmt(bv) + ' · ' + parts.join(' · ') + ' = ' + fmt(fv) };
}
function gurpsDerivedHtml(a, r) {
  function stat(label, val, note) { return '<div class="gstat"><span>' + label + '</span><strong>' + val + '</strong>' + (note ? '<small>' + note + '</small>' : '') + '</div>'; }
  return stat('Esquiva', r.dodge, 'VB + 3' + (a.enc ? ' − ' + a.enc + ' de Peso' : '')) +
    stat('Deslocamento', r.moveNow, a.enc ? r.move + ' − ' + a.enc + ' de Peso' : 'sem Peso') +
    stat('Carga Básica', String(r.lift).replace('.', ',') + ' lbs', '(ST × ST) ÷ 5') +
    stat('Dano', r.dmg.thr + ' / ' + r.dmg.sw, 'Estocada / Balanço');
}
function sheetAttrsHtml(s, a, editing) {
  var r = gurpsStats(a), e = withAdvFx(s, a), re = gurpsStats(e), can = canWrite();
  return '<section class="gurps' + gearFoldClass('attrs', editing) + '" id="gurps"><div class="gurps-head">' + sheetGripHtml('Atributos') + gearFoldTitle('attrs', 'Atributos', editing) + '<span class="gurps-total" id="gTotal">' + r.total + ' pts</span>' +
    (editing ? secSaveBtnsHtml('attrCancel', 'attrSave', 'atributos')
      : can ? secEditBtnHtml('attrEdit', 'atributos') : '') + '</div>' +
    '<div class="gurps-grid">' +
    '<table class="gtab"><thead><tr><th>Atributo</th><th>Valor</th><th>Pontos</th></tr></thead><tbody>' + attrRowsHtml(ATTR_ROWS, a, r, editing, e, re) + '</tbody>' +
    '<tfoot><tr><td colspan="2">Total pontos atributos</td><td class="gpts" data-tot="attr">' + r.attrPts + '</td></tr></tfoot></table>' +
    '<table class="gtab"><thead><tr><th>Dados</th><th>Valor</th><th>Pontos</th></tr></thead><tbody>' + attrRowsHtml(SEC_ROWS, a, r, editing, e, re) + '</tbody>' +
    '<tfoot><tr><td colspan="2">Total pontos dados</td><td class="gpts" data-tot="sec">' + r.secPts + '</td></tr></tfoot></table></div>' +
    // Reações above the stats, as wide as them (.gurps-under).
    '<div class="gurps-under">' + reactionsHtml(editing ? S.ui.reactDraft || sheetReactions(s) : sheetReactions(s), editing) +
    '<div class="gurps-derived" id="gDerived">' + gurpsDerivedHtml(e, re) + '</div></div>' +
    (editing ? '<div class="form-err" id="attrErr" role="alert"></div>' : '') + '</section>';
}

/* ---------- Reações (in Atributos) ----------
   sheet.reactions = [{ name, mod, notes }]: who reacts, the reaction modifier and where it comes from
   ("Militares", +2, "Talent (Soldier)"), typed by hand. Edited with the attributes: S.ui.reactDraft
   holds the list while the section is being edited. */
function cleanReaction(x) {
  return { name: String((x && x.name) || '').trim().slice(0, 120), mod: cleanInt(x && x.mod, -99, 99, 0), notes: String((x && x.notes) || '').trim().slice(0, 400) };
}
function sheetReactions(s) { return (Array.isArray(s && s.reactions) ? s.reactions : []).map(cleanReaction).filter(function (x) { return x.name; }); }
function fmtMod(n) { return n > 0 ? '+' + n : n < 0 ? '−' + -n : '0'; }
function reactionsHtml(list, editing) {
  var title = '<span class="rx-title">Reações</span>';
  if (editing) return '<div class="rx-box"><div class="rx-head">' + title + '<button class="btn" type="button" id="rxAdd">' + svg(ICON.plus, 15, 2.4) + 'Adicionar reação</button></div>' +
    (list.length ? '<div class="sk-row rx-row sk-labels" aria-hidden="true"><span>Reação</span><span>Modificador</span><span>Observações</span><span></span></div>' : '') +
    '<div id="rxRows">' + list.map(function (x, i) {
      return '<div class="sk-row rx-row" data-ri="' + i + '">' +
        '<input class="sk-name" type="text" data-rf="name" maxlength="120" placeholder="Ex.: Militares" aria-label="Reação" value="' + esc(x.name) + '">' +
        '<input type="number" data-rf="mod" min="-99" max="99" step="1" inputmode="numeric" aria-label="Modificador" value="' + esc(String(x.mod)) + '">' +
        '<input type="text" data-rf="notes" maxlength="400" placeholder="Ex.: Talent (Soldier)" aria-label="Observações" value="' + esc(x.notes) + '">' +
        '<button class="icon-btn" type="button" data-rdel="' + i + '" aria-label="Remover reação" title="Remover">' + svg(ICON.x, 15, 2.4) + '</button></div>';
    }).join('') + '</div>' +
    (list.length ? '' : '<p class="hint-text" style="margin:0">Nenhuma reação. Use <b>Adicionar reação</b> para incluir uma (sem nome, a linha não é salva).</p>') + '</div>';
  return '<div class="rx-box">' + title + '<table class="gtab av-tab rx-tab"><thead><tr><th>Reação</th><th>Modificador</th><th>Observações</th></tr></thead><tbody>' +
    (list.length ? list.map(function (x) {
      return '<tr><td><b>' + esc(x.name) + '</b></td><td class="gval">' + fmtMod(x.mod) + '</td><td class="av-notes">' + esc(x.notes) + '</td></tr>';
    }).join('') : '<tr><td colspan="3" class="rx-none">Nenhuma reação cadastrada.</td></tr>') + '</tbody></table></div>';
}
// While editing, S.ui.attrDraft holds the attributes being changed; each keystroke recomputes
// the points and the values that depend on it, without redrawing the input being typed in.
function wireSheetAttrs(s) {
  var ui = S.ui, box = $('gurps'); if (!box) return;
  var ed = $('attrEdit'); if (ed) ed.onclick = function () { ui.attrDraft = sheetAttrs(s); ui.reactDraft = sheetReactions(s); renderSheetPage(); var f = document.querySelector('#gurps .attr-in'); if (f instanceof HTMLElement) f.focus(); };
  if (!ui.attrDraft) return;
  var d = ui.attrDraft;
  function refresh(active) {
    var r = gurpsStats(d);
    box.querySelectorAll('.attr-in').forEach(function (inp) { if (inp !== active) inp.value = String(attrValue(inp.dataset.k, d, r)); });
    box.querySelectorAll('[data-pts]').forEach(function (td) { var p = r.cost[td.getAttribute('data-pts')]; if (p != null) td.textContent = String(p); });
    box.querySelector('[data-tot="attr"]').textContent = String(r.attrPts);
    box.querySelector('[data-tot="sec"]').textContent = String(r.secPts);
    $('gTotal').textContent = r.total + ' pts';
    var e = withAdvFx(s, d), re = gurpsStats(e); $('gDerived').innerHTML = gurpsDerivedHtml(e, re);
    // A new ST changes Basic Lift, and so Peso.
    var enc = box.querySelector('[data-encv]'); if (enc) enc.outerHTML = attrValueText('enc', e, re);
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
  // Reações: typing updates the draft; adding or removing a row redraws the page from it.
  if (!ui.reactDraft) ui.reactDraft = sheetReactions(s);
  var rx = ui.reactDraft, rows = $('rxRows');
  if (rows) {
    rows.addEventListener('input', function (e) {
      var el = /** @type {AnyEl} */ (e.target), f = el.dataset && el.dataset.rf, row = el.closest && el.closest('[data-ri]'); if (!row || !f) return;
      rx[+row.getAttribute('data-ri')][f] = el.value;
    });
    rows.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-rdel]'); if (!b) return;
      rx.splice(+b.getAttribute('data-rdel'), 1); renderSheetPage();
    });
  }
  $('rxAdd').onclick = function () { rx.push({ name: '', mod: 0, notes: '' }); renderSheetPage(); var l = document.querySelectorAll('#rxRows .sk-name'), f = l[l.length - 1]; if (f instanceof HTMLElement) f.focus(); };
  $('attrCancel').onclick = function () { ui.attrDraft = ui.reactDraft = null; renderSheetPage(); };
  $('attrSave').onclick = function () {
    var btn = $('attrSave'); btn.disabled = true; btn.textContent = 'Salvando…'; $('attrCancel').disabled = true;
    Ops.saveSheetAttrs(s, d, rx).then(function () { ui.attrDraft = ui.reactDraft = null; toast('Atributos salvos.'); renderSheetPage(); }, function (er) {
      btn.disabled = false; btn.textContent = 'Salvar'; $('attrCancel').disabled = false;
      $('attrErr').textContent = errorText(er);
    });
  };
}

/* =====================================================================
   GURPS 4ª ed.: perícias.
   sheet.skills is a list of { name, attr, diff, pts, bonus, bonusNote?, skillId? }: the level
   comes from the points spent (Basic Set, p. 170), bonus is what an
   advantage or talent adds on top and bonusNote why (asked for when the bonus is
   not 0, shown when hovering the NH), skillId the entry of Regras › Perícias
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
  if (k.tbonus || k.tfrom) p.push(k.tfrom || '+' + k.tbonus + ' das vantagens');
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
// position of the skill in sheet.skills.
function skillGroupHtml(diff, list, av, can) {
  var name = SKILL_DIFFS[diff][0];
  return '<table class="gtab"><thead><tr><th>' + name + '</th><th>Pontos</th><th>NH</th></tr></thead><tbody>' +
    (list.length ? list.map(function (k) {
      var name = k.skillId ? '<a href="' + skillHref(k.skillId) + '" data-skill-modal="' + esc(k.skillId) + '" title="Ver as regras da perícia">' + esc(k.name) + '</a>' : esc(k.name);
      return '<tr><td><b>' + name + '</b><small>' + k.attr + '/' + diff + '</small></td><td class="gpts">' +
        (can ? '<input class="gpts-in" type="number" min="0" max="999" step="1" inputmode="numeric" data-k="' + k.i + '" value="' + k.pts + '" aria-label="Pontos em ' + esc(k.name) + '">' : k.pts) + '</td>' + skillNhCell(k, av) + '</tr>';
    }).join('') : '<tr><td colspan="3" class="gnone">Nenhuma perícia ' + name.toLowerCase() + '.</td></tr>') + '</tbody>' +
    '<tfoot><tr><td colspan="2">Total perícias ' + name + '</td><td class="gpts" data-gtot="' + diff + '">' + skillsTotal(list) + '</td></tr></tfoot></table>';
}
// The Cultural Familiarity rows, in a table of their own after the skills' (they have no NH).
function cultureGroupHtml(cultures, can) {
  return '<table class="gtab gcult-tab"><thead><tr><th>Familiaridade Cultural</th><th>Pontos</th></tr></thead><tbody>' + cultures.map(function (c, j) {
    return '<tr class="gcult"><td><b>' + esc(c.name) + '</b></td><td class="gpts">' +
      (can ? '<input class="gpts-in" type="number" min="0" max="99" step="1" inputmode="numeric" data-c="' + j + '" value="' + c.pts + '" aria-label="Pontos em ' + esc(c.name) + '">' : c.pts) + '</td></tr>';
  }).join('') + '</tbody>' +
    '<tfoot><tr><td>Total familiaridade cultural</td><td class="gpts" data-gtot="C">' + sumPts(cultures) + '</td></tr></tfoot></table>';
}
// NH of a row being edited; the points that buy nothing go on a line of their own.
function skillEditNhHtml(k, av) {
  var nh = skillNh(k, av), w = skillWaste(k);
  return esc(nh.rel) + ' <small>' + esc(nh.lvl) + '</small>' + (w ? '<small class="sk-waste">' + w + ' pt sem efeito</small>' : '');
}
// The entry of Regras › Perícias a sheet skill was picked from, while its name still starts with
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
  var av = attrValues(sheetAttrsNow(s)), can = canWrite();
  var head = '<div class="gurps-head">' + sheetGripHtml('Perícias') + gearFoldTitle('skills', 'Perícias', editing) + '<span class="gurps-total" id="skTotal">' + skillsTotal(skills, cultures) + ' pts</span>' +
    (editing ? secSaveBtnsHtml('skCancel', 'skSave', 'perícias')
      : can && !sheetDraftOpen() ? secEditBtnHtml('skEdit', 'perícias') : '') + '</div>';
  if (editing) {
    return '<section class="gurps' + gearFoldClass('skills', editing) + '" id="skills">' + head +
      // A new skill goes on top, under the button, where it is seen without scrolling down a long list.
      '<div class="box sk-edit"><div><button class="btn" type="button" id="skAdd">' + svg(ICON.plus, 15, 2.4) + 'Adicionar perícia</button></div>' +
      '<div class="sk-row sk-labels" aria-hidden="true"><span>Perícia</span><span>Atributo</span><span>Dif.</span><span>Pontos</span><span>Bônus</span><span>NH</span><span></span></div>' +
      '<div id="skRows">' + applyTalents(skills, s).map(function (k, i) { return skillEditRow(k, i, av); }).join('') + '</div>' +
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
  return '<section class="gurps' + gearFoldClass('skills', editing) + '" id="skills">' + head +
    (skills.length || cultures.length ? '<div class="gurps-grid">' + groups.map(function (x) {
      return skillGroupHtml(x, skills.filter(function (k) { return k.diff === x; }), av, can);
    }).join('') + (cultures.length ? cultureGroupHtml(cultures, can) : '') + '</div>'
      : '<p class="long none">Nenhuma perícia cadastrada.' + (can ? ' Use <b>Editar</b> para adicionar.' : '') + '</p>') + '</section>';
}
// Out of the editor, the points of each skill change right in the table: the NH and totals follow
// as you type, and the sheet is saved a moment after the last change or when the field is left.
// While a points field has focus, data that arrives does not redraw the page (see onData in app.js);
// leaving it redraws the page if something arrived meanwhile.
function wireQuickPts(s, box) {
  var ui = S.ui, av = attrValues(sheetAttrsNow(s)), list = applyTalents(sheetSkills(s), s), cultures = sheetCultures(s), edits = {}, timer = 0;
  if (!box.querySelector('.gpts-in')) return;
  function paintTotals() {
    $('skTotal').textContent = skillsTotal(list, cultures) + ' pts';
    SKILL_DIFF_KEYS.forEach(function (x) {
      var t = box.querySelector('[data-gtot="' + x + '"]');
      if (t) t.textContent = String(skillsTotal(list.filter(function (k) { return k.diff === x; })));
    });
    var tc = box.querySelector('[data-gtot="C"]'); if (tc) tc.textContent = String(sumPts(cultures));
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
    // No field gets the focus (it would open the suggestions over a filled name), only the empty row
    // of a sheet without skills.
    var none = !ui.skillDraft.skills.length;
    if (none) ui.skillDraft.skills.push(cleanSkill({ name: '', attr: 'IQ', diff: 'A', pts: 1 }));
    renderSheetPage(); if (none) focusLast('#skRows .sk-name');
  };
  if (!ui.skillDraft && $('skills')) wireQuickPts(s, $('skills'));
  var d = ui.skillDraft, box = $('skills'); if (!d || !box || !$('skSave')) return;
  var av = attrValues(sheetAttrsNow(s));
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
  // Suggestions from Regras › Perícias under the name being typed; picking one fills the name,
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
  $('skAdd').onclick = function () {
    d.skills.unshift(cleanSkill({ name: '', attr: 'IQ', diff: 'A', pts: 1 })); renderSheetPage();
    var f = document.querySelector('#skRows .sk-name'); if (f instanceof HTMLElement) f.focus();
  };
  $('cuAdd').onclick = function () { d.cultures.push({ name: '', pts: 1 }); renderSheetPage(); focusLast('#cuRows .sk-name'); };
  $('skCancel').onclick = function () { ui.skillDraft = null; renderSheetPage(); };
  $('skSave').onclick = function () {
    if (!checkBonusNotes(box)) { $('skErr').textContent = 'Escreva o motivo de cada bônus.'; return; }
    $('skErr').textContent = '';
    var btn = $('skSave'); btn.disabled = true; btn.textContent = 'Salvando…'; $('skCancel').disabled = true;
    Ops.saveSheetSkills(s, d.skills, d.cultures).then(function () { ui.skillDraft = null; toast('Perícias salvas.'); renderSheetPage(); }, function (er) {
      btn.disabled = false; btn.textContent = 'Salvar'; $('skCancel').disabled = false;
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
    (mainSheets().length ? '<div class="toolbar"><label for="sheetSearch" style="position:absolute;left:-9999px">Buscar fichas</label><input class="search" id="sheetSearch" type="search" placeholder="Buscar por nome ou personagem" autocomplete="off" value="' + esc(S.ui.q || '') + '"><span class="meta" id="sheetCount"></span></div>' : '') +
    '<div id="sheetList"></div>';
  var b = $('newSheetBtn'); if (b) b.onclick = function () { openSheetForm(null); };
  var s = $('sheetSearch'); if (s) s.addEventListener('input', function () { S.ui.q = s.value; renderSheetList(); });
  renderSheetList();
}
function renderSheetList() {
  var el = $('sheetList'); if (!el) return;
  if (!W.loaded.sheets) { el.innerHTML = '<p class="lede">Carregando fichas…</p>'; return; }
  var all = mainSheets();
  if (!all.length) {
    el.innerHTML = '<div class="empty-state">' + svg(ICON.sheet, 34, 1.6) + '<strong>Nenhuma ficha cadastrada</strong><span>' + (canWrite() ? 'Crie a primeira com <b>Nova ficha</b>.' : 'As fichas criadas vão aparecer aqui.') + '</span></div>';
    return;
  }
  var q = norm(S.ui.q);
  var list = all.slice().sort(byName).filter(function (s) {
    return !q || norm(s.name + ' ' + (s.description || '') + ' ' + sheetChars(s.id).map(function (c) { return c.name; }).join(' ')).indexOf(q) >= 0;
  });
  var cnt = $('sheetCount'); if (cnt) cnt.textContent = q ? list.length + ' de ' + all.length : plural(all.length, 'ficha', 'fichas');
  el.innerHTML = list.length ? '<div class="loc-grid">' + list.map(function (s) {
    var chars = sheetChars(s.id), p = sheetPortrait(s), allies = sheetAllies(s.id).length;
    return '<a class="loc-card" href="' + sheetHref(s.id) + '"><div class="thumb sheet-thumb"' + (p ? ' data-img="' + esc(p.ref) + '"' : '') + '>' + svg(ICON.sheet, 28, 1.6) + '</div><div class="map-card-body"><strong>' + esc(s.name) + '</strong>' +
      '<span class="where">' + (chars.length ? esc(chars.map(function (c) { return c.name; }).join(', ')) : 'Sem personagem vinculado') + '</span>' +
      (s.attrs || allies ? '<span class="meta">' + [s.attrs ? gurpsStats(sheetAttrs(s)).total + ' pts' : '', allies ? plural(allies, 'aliado', 'aliados') : ''].filter(Boolean).join(' · ') + '</span>' : '') + '</div></a>';
  }).join('') + '</div>' : '<p class="lede">Nenhuma ficha encontrada para essa busca.</p>';
  fillImages(el);
}

/* =====================================================================
   Page: single sheet
   ===================================================================== */
// The Personagem box of a main sheet s. Closed until its title is clicked (see foldBox). At the top, above the attributes. As the Ficha box
// of the character's page: the character, Trocar (or Vincular) and Remover vínculo, which asks first
// (the box stays open while it asks). hidden: a character this account cannot see is on the sheet.
/* ---------- Pontos (beside Personagem; an ally has its own) ----------
   sheet.points = { adj, race, racePts, xp }, typed: a free adjustment of points, the race and its points,
   and the experience. Gastos is the sum of the sheet's sections (Atributos, Perícias, Magias, Combate,
   Vantagens, Desvantagens, Peculiaridades), the race's points and the adjustment; Total is Gastos + XP. */
function cleanSheetPoints(x) {
  return { adj: cleanInt(x && x.adj, -9999, 9999, 0), race: String((x && x.race) || '').trim().slice(0, 100),
    racePts: cleanInt(x && x.racePts, -9999, 9999, 0), xp: cleanInt(x && x.xp, -9999, 9999, 0) };
}
function sheetPoints(s) { return cleanSheetPoints(s && s.points); }
// The points of each part, in the order of the sheet: [label, points].
function sheetSpentParts(s) {
  var p = sheetPoints(s);
  return [['Atributos', gurpsStats(sheetAttrs(s)).total], ['Perícias', skillsTotal(sheetSkills(s), sheetCultures(s))], ['Magias', sumPts(sheetSpells(s))],
    ['Combate', combatTotal(sheetCombat(s))], ['Vantagens', advsTotal(sheetAdvs(s))], ['Desvantagens', advsTotal(sheetDisadvs(s))],
    ['Peculiaridades', quirksTotal(sheetQuirks(s))], ['Raça', p.racePts], ['Ajuste', p.adj]];
}
Ops.saveSheetPoints = function (s, x) {
  if (!rawHas('sheets', s.id)) return Promise.reject({ message: 'Essa ficha não existe mais.' });
  return W.store.patch('sheets', s.id, { points: cleanSheetPoints(x), updatedAt: now() });
};
function sheetPointsHtml(s, can) {
  var p = sheetPoints(s), parts = sheetSpentParts(s), spent = parts.reduce(function (n, x) { return n + x[1]; }, 0);
  function inp(k, label, text) {
    return can ? '<input class="gpts-in' + (text ? ' pt-race' : '') + '" ' + (text ? 'type="text" maxlength="100" placeholder="Ex.: Humano"' : 'type="number" min="-9999" max="9999" step="1" inputmode="numeric"') +
      ' data-pt="' + k + '" value="' + esc(String(p[k])) + '" aria-label="' + label + '">' : '<b>' + esc(String(p[k]) || '—') + '</b>';
  }
  // One line, beside Personagem, in the spreadsheet's order.
  return '<div class="box pts-box" id="sheetPts"><table class="pts-tab"><thead><tr><th title="Ajuste livre de pontos">Ajuste</th><th class="pt-race-col">Raça</th>' +
    '<th title="Pontos da raça">Pts raça</th><th title="Total de pontos gastos">Gastos</th><th title="Experiência">XP</th><th title="Total de pontos: gastos + XP">Total</th></tr></thead><tbody><tr>' +
    '<td>' + inp('adj', 'Ajuste de pontos') + '</td><td>' + inp('race', 'Raça', true) + '</td><td>' + inp('racePts', 'Pontos da raça') + '</td>' +
    '<td class="pt-calc" title="' + esc(parts.filter(function (x) { return x[1]; }).map(function (x) { return x[0] + ' ' + x[1]; }).join(' · ') || 'Nada gasto ainda') + '">' + spent + '</td>' +
    '<td>' + inp('xp', 'XP') + '</td><td class="pt-calc pt-total">' + (spent + p.xp) + '</td></tr></tbody></table></div>';
}
// The typed fields save when left (or on Enter); the page redraws once the focus leaves them, as the
// points of Perícias (ui.ptsStale, see onData).
function wireSheetPoints(s) {
  var ui = S.ui, box = $('sheetPts'); if (!box || !box.querySelector('[data-pt]')) return;
  box.addEventListener('change', function () {
    var x = {}; box.querySelectorAll('[data-pt]').forEach(function (el) { x[el.getAttribute('data-pt')] = el.value; });
    Ops.saveSheetPoints(s, x).catch(function (er) { toast(errorText(er), true); ui.ptsStale = false; renderSheetPage(); });
  });
  box.addEventListener('focusout', function () {
    setTimeout(function () { var a = document.activeElement; if (ui.ptsStale && !(a && a.classList && a.classList.contains('gpts-in'))) { ui.ptsStale = false; renderSheetPage(); } }, 0);
  });
}
function sheetCharsBoxHtml(s, chars, can, confirmUnlink) {
  var hidden = !chars.length && W.raw.characters.some(function (c) { return c.sheetId === s.id; }), unlink = can && !!confirmUnlink && chars.length > 0;
  return foldBox('chars', 'Personagem', null,
    (chars.length ? '<ul class="links">' + chars.map(function (c) {
      return '<li><a class="row-link" href="' + charHref(c.id) + '" data-char-modal="' + esc(c.id) + '">' + thumbSlot(c.image && c.image.ref, ICON.user) + '<span class="mtext"><b>' + esc(c.name) + '</b>' +
        '<span class="where">' + esc(charSubtitle(c) || 'Personagem') + '</span></span></a></li>';
    }).join('') + '</ul>'
      : '<p class="lede" style="font-size:13px;margin:0">' + (hidden ? 'Vinculada a um personagem que você não pode ver.' : 'Nenhum personagem vinculado.' + (can ? ' Cada ficha pode ter um personagem.' : '')) + '</p>') +
    (can ? '<div class="btn-row" style="margin-top:10px"><button class="btn" type="button" id="sheetCharsBtn">' + svg(ICON.user, 15) + (chars.length || hidden ? 'Trocar personagem' : 'Vincular personagem') + '</button>' +
      (chars.length ? '<button class="btn ghost" type="button" id="sheetCharsRm">' + svg(ICON.x, 14, 2.4) + 'Remover vínculo</button>' : '') + '</div>' : '') +
    (unlink ? '<div class="confirm" role="alert"><span>Remover o vínculo da ficha <b>' + esc(s.name) + '</b> com <b>' + esc(chars.map(function (c) { return c.name; }).join(', ')) + '</b>? ' +
      (chars.length > 1 ? 'Os personagens continuam' : 'O personagem continua') + ' cadastrado' + (chars.length > 1 ? 's' : '') + '.</span><div class="btn-row"><button class="btn danger solid" type="button" id="sheetCharsRmYes">Remover vínculo</button>' +
      '<button class="btn ghost" type="button" id="sheetCharsRmNo">Cancelar</button></div></div>' : ''),
    unlink);
}
// In an ally's tab, in the place of the Personagem box: the name of its tab and of its sheet, and
// Renomear, Editar ficha and Excluir aliado, which asks first.
function allyBoxHtml(a, can, confirmDel) {
  return '<div class="box ally-box"><div class="ally-name"><b>' + esc(allyLabel(a)) + '</b><small>ficha “' + esc(a.name) + '”</small></div>' +
    (can ? '<div class="btn-row"><button class="btn" type="button" id="allyRename" title="Renomear a aba do aliado">' + svg(ICON.edit, 14) + 'Renomear</button>' +
      '<button class="btn" type="button" id="allyEdit" title="Editar o nome e as observações da ficha do aliado">' + svg(ICON.sheet, 14) + 'Editar ficha</button>' +
      '<button class="btn danger" type="button" id="allyDel" aria-label="Excluir aliado" title="Excluir aliado">' + svg(ICON.trash, 14) + 'Excluir</button></div>' : '') +
    (can && confirmDel ? '<div class="confirm" role="alert"><span>Excluir o aliado <b>' + esc(allyLabel(a)) + '</b>? A ficha dele, com equipamentos, corpo, mochilas e magias, é excluída. ' +
      'A ficha principal e os outros aliados não mudam. Não dá para desfazer.</span><div class="btn-row"><button class="btn danger solid" type="button" id="allyDelYes">Excluir aliado</button>' +
      '<button class="btn ghost" type="button" id="allyDelNo">Cancelar</button></div></div>' : '') + '</div>';
}
// Anotações (ficha-anotacoes.js) only in the main sheet, not in the allies.
var SHEET_TABS = [{ key: 'sheet', label: 'Ficha' }, { key: 'equip', label: 'Equip.' }, { key: 'magic', label: 'Magia' }, { key: 'notes', label: 'Anotações', mainOnly: true }];
// The sections of the Ficha tab, dragged into any order (wireSecSort; Danos and Defesas, side by side,
// go together); Observações stays last. Not while one of them is being edited.
var SHEET_ORDER_KEY = 'hounds_sheet_order';
function sheetSecsHtml(s, can) {
  var ui = S.ui;
  return sortSecsHtml('sheetSecs', SHEET_ORDER_KEY, {
    attrs: function () { return sheetAttrsHtml(s, ui.attrDraft || sheetAttrs(s), !!ui.attrDraft && can); },
    skills: function () { return sheetSkillsHtml(s, !!ui.skillDraft && can); },
    combat: function () { return sheetCombatHtml(s, !!ui.combatDraft && can); },
    dmgdef: function () { return sheetDmgDefHtml(s); },
    advs: function () { return sheetAdvsHtml(s, !!ui.advDraft && can); },
    disadvs: function () { return sheetDisadvsHtml(s, !!ui.disadvDraft && can); },
    quirks: function () { return sheetQuirksHtml(s, !!ui.quirkDraft && can); } });
}
function sheetGripHtml(name) { return S.ui.attrDraft || sheetDraftOpen() ? '' : secGripHtml('a seção ' + name); }
// The page of a main sheet (m): its head, a tab for it and one for each ally (#ficha~<id>~<ally id>), and
// below them the tabs Ficha, Equip. and Magia of the one open (s), the same sections for both.
function renderSheetPage() {
  var m = sheetById(S.route.sheetId), ui = S.ui;
  paintAllyView(false);
  // An ally's own link opens it in its main sheet's page.
  if (m && m.allyOf) { if (sheetById(m.allyOf)) { go(allyHref(m.allyOf, m.id), true); return; } m = null; }
  if (!m) {
    pageRoot.innerHTML = crumbsHtml('sheets') + (W.loaded.sheets ? '<h1>Ficha não encontrada</h1><p class="lede">Essa ficha foi excluída ou o link está incompleto.</p><div><a class="btn" href="#fichas">Voltar para Fichas</a></div>' : '<p class="lede">Carregando ficha…</p>');
    return;
  }
  // An ally just created may not have arrived yet (S.pendingAlly); any other ally that is not there was
  // excluded meanwhile: back to the main sheet.
  var s = pageSheet();
  if (S.route.allyId && s === m) {
    if (S.pendingAlly === S.route.allyId) { pageRoot.innerHTML = crumbsHtml('sheet:' + m.id) + '<p class="lede">Abrindo o aliado…</p>'; return; }
    go(sheetHref(m.id), true); return;
  }
  if (S.pendingAlly && S.pendingAlly === S.route.allyId) S.pendingAlly = null;
  var ally = s !== m ? s : null, allies = sheetAllies(m.id);
  paintAllyView(ally);
  var can = canWrite(), chars = sheetChars(m.id), portrait = sheetPortrait(m), acc = sheetAccount(m.id);
  var head = crumbsHtml('sheet:' + m.id) + '<div class="head-row"><div class="sheet-title">' +
    (portrait ? '<div class="sheet-portrait" id="sheetPortrait">' + svg(ICON.user, 28, 1.6) + '</div>' : '') +
    '<div><span class="badge">' + svg(ICON.sheet, 12, 2.4) + 'Ficha</span><h1>' + esc(m.name) + '</h1>' +
    '<p class="lede">' + (chars.length ? 'Ficha de ' + esc(chars.map(function (c) { return c.name; }).join(', ')) : 'Nenhum personagem vinculado') +
    (acc ? ' · Conta de <b>' + esc(acc.name) + '</b>' : '') + '</p></div></div>' +
    (can ? '<div class="btn-row" data-vis-host>' + (isMestre() ? '<button class="btn" type="button" id="sheetAccBtn" title="A conta vinculada vê a ficha mesmo oculta. Cada conta tem uma ficha só.">' + svg(ICON.user, 15) + (acc ? 'Trocar conta' : 'Vincular conta') + '</button>' : '') +
      '<button class="btn" type="button" id="editSheetBtn">' + svg(ICON.edit, 15) + 'Editar ficha</button><button class="btn danger" type="button" id="delSheetBtn">' + svg(ICON.trash, 15) + 'Excluir</button></div>' : '') + '</div>' +
    (ui.confirmDelete ? '<div class="confirm" role="alert"><span>Excluir a ficha <b>' + esc(m.name) + '</b>?' + (chars.length ? ' ' + plural(chars.length, 'personagem fica', 'personagens ficam') + ' sem ficha; os personagens continuam cadastrados.' : '') +
      (allies.length ? ' ' + (allies.length > 1 ? 'Os ' + allies.length + ' aliados dela também são excluídos.' : 'O aliado dela também é excluído.') : '') +
      ' Não dá para desfazer.</span><div class="btn-row"><button class="btn danger solid" type="button" id="delSheetYes">Excluir ficha</button><button class="btn ghost" type="button" id="delSheetNo">Cancelar</button></div></div>' : '');
  // The main sheet and its allies. While a section is being edited they stay put: Salvar or Cancelar first.
  var editing = !!ui.attrDraft || sheetDraftOpen() || gearEditing();
  // On this line, on the right: the main sheet's Personagem, and the points of the sheet open (an ally has its own).
  var mainSide = '<div class="sheet-side">' + (ally ? '' : sheetCharsBoxHtml(m, chars, can, ui.confirmUnlink)) + sheetPointsHtml(s, can) + '</div>';
  var people = '<div class="sheet-allies">' + (allies.length || can ? '<div class="sheet-people"><div class="seg" role="tablist" aria-label="Personagem e aliados">' + [m].concat(allies).map(function (x) {
    var on = x === s;
    return '<button type="button" role="tab" data-ally="' + (x === m ? '' : esc(x.id)) + '" aria-selected="' + on + '" class="' + (on ? 'on' : '') + '"' +
      (editing && !on ? ' disabled title="Salve ou cancele a edição antes de trocar"' : '') + '>' + (x === m ? svg(ICON.user, 14, 2.2) + esc(m.name) : allyDotHtml(x) + esc(allyLabel(x))) + '</button>';
  }).join('') + '</div>' +
    (can ? '<button class="btn" type="button" id="allyNew"' + (editing ? ' disabled title="Salve ou cancele a edição antes"' : '') + '>' + svg(ICON.plus, 15, 2.4) + 'Criar Aliado</button>' : '') + '</div>' : '') + mainSide + '</div>';
  var main = '<section><h2 class="sec-title">Observações</h2>' + (s.description ? '<p class="long">' + esc(s.description) + '</p>' : '<p class="long none">Sem observações.</p>') + '</section>';
  var side = ally ? allyBoxHtml(ally, can && !editing, ui.confirmAllyDelete) : '';
  // The tabs: everything but the equipment and the spells, the equipment, the spells and (main sheet only)
  // the notes. Only the open one is drawn (the wire* functions skip a section that isn't there); a draft in
  // another survives the switch.
  // Anotações: only for the account linked to the sheet (not even the Mestre).
  var notesTab = !ally && sheetNotesOpen(m.id);
  var tab = ui.sheetTab === 'equip' || ui.sheetTab === 'magic' || (ui.sheetTab === 'notes' && notesTab) ? ui.sheetTab : 'sheet';
  var tabs = '<div class="seg" role="tablist" aria-label="Seção da ficha">' + SHEET_TABS.filter(function (t) { return !t.mainOnly || notesTab; }).map(function (t) {
    var on = t.key === tab;
    return '<button type="button" role="tab" data-stab="' + t.key + '" aria-selected="' + on + '" class="' + (on ? 'on' : '') + '">' + t.label + '</button>';
  }).join('') + '</div>';
  pageRoot.innerHTML = head + people + '<div class="sheet-chars">' + tabs + side + '</div>' + (tab === 'equip' ? sheetGearHtml(s) : tab === 'magic' ? sheetSpellsHtml(s, !!ui.spellDraft && can)
    : tab === 'notes' ? sheetNotesHtml(m) : sheetSecsHtml(s, can) + main);
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
  // Atributos, Perícias, Combate, Vantagens, Desvantagens, Peculiaridades and the lists of Equip. fold (gearFoldTitle).
  wireGearFold();
  wireSecSort('sheetSecs', SHEET_ORDER_KEY);
  wireSheetAttrs(s);
  wireSheetSkills(s);
  wireSheetCombat(s);
  wireSheetDamage(s);
  wireSheetDefense(s);
  wireSheetAdvs(s);
  wireSheetDisadvs(s);
  wireSheetQuirks(s);
  wireSheetEquip(s);
  wireSheetSpells(s);
  wireSheetNotes(m);
  wireSheetPoints(s);
  pageRoot.querySelectorAll('[data-ally]').forEach(function (b) {
    b.onclick = function () { var id = b.getAttribute('data-ally'); if (id !== (ally ? ally.id : '')) go(id ? allyHref(m.id, id) : sheetHref(m.id)); };
  });
  var an = $('allyNew'); if (an) an.onclick = function () {
    openAllyCreateForm(m);
  };
  if (ally) {
    var ar = $('allyRename'); if (ar) ar.onclick = function () { openAllyNameForm(ally); };
    var ae = $('allyEdit'); if (ae) ae.onclick = function () { openSheetForm(ally); };
    var ad = $('allyDel'); if (ad) ad.onclick = function () { ui.confirmAllyDelete = true; renderSheetPage(); };
    var adn = $('allyDelNo'); if (adn) adn.onclick = function () { ui.confirmAllyDelete = false; renderSheetPage(); };
    var ady = $('allyDelYes'); if (ady) ady.onclick = function () {
      ady.disabled = true;
      Ops.deleteSheet(ally).then(function () { toast('Aliado excluído.'); go(sheetHref(m.id), true); }, function (er) { ady.disabled = false; toast('Não foi possível excluir o aliado: ' + errorText(er), true); });
    };
  }
  var cb = $('sheetCharsBtn'); if (cb) cb.onclick = function () { openSheetCharsForm(m); };
  var cr = $('sheetCharsRm'); if (cr) cr.onclick = function () { ui.confirmUnlink = true; renderSheetPage(); };
  var crn = $('sheetCharsRmNo'); if (crn) crn.onclick = function () { ui.confirmUnlink = false; renderSheetPage(); };
  var cry = $('sheetCharsRmYes'); if (cry) cry.onclick = function () {
    cry.disabled = true;
    chars.reduce(function (p, c) { return p.then(function () { return Ops.setCharSheet(c.id, null); }); }, Promise.resolve())
      .then(function () { ui.confirmUnlink = false; toast('Vínculo com o personagem removido.'); renderSheetPage(); }, function (er) { cry.disabled = false; toast(errorText(er), true); });
  };
  var ab = $('sheetAccBtn'); if (ab) ab.onclick = function () { openSheetAccountForm(m); };
  var e = $('editSheetBtn'); if (e) e.onclick = function () { openSheetForm(m); };
  var d = $('delSheetBtn'); if (d) d.onclick = function () { ui.confirmDelete = true; renderSheetPage(); };
  var dn = $('delSheetNo'); if (dn) dn.onclick = function () { ui.confirmDelete = false; renderSheetPage(); };
  var dy = $('delSheetYes'); if (dy) dy.onclick = function () {
    dy.disabled = true;
    Ops.deleteSheet(m).then(function () { toast('Ficha excluída.'); go('#fichas', true); }, function (er) { dy.disabled = false; toast(errorText(er), true); });
  };
}

/* =====================================================================
   Form: sheet (name and notes for now)
   ===================================================================== */
// The account linked to a main sheet (the Mestre picks one or none). An account that has another sheet
// says which: picking it here takes it from there.
function sheetAccountPickHtml(sheetId) {
  var cur = sheetAccount(sheetId), users = W.users.filter(function (u) { return u.role !== 'mestre'; }).sort(byName);
  return '<div class="field"><span class="lab">Conta vinculada</span><div class="vis-users">' +
    '<label class="vis-user"><input type="radio" name="sacc" value=""' + (cur ? '' : ' checked') + '><span>Nenhuma</span></label>' +
    users.map(function (u) {
      var other = accountSheet(u); if (other && other.id === sheetId) other = null;
      return '<label class="vis-user"><input type="radio" name="sacc" value="' + esc(u.id) + '"' + (cur && cur.id === u.id ? ' checked' : '') + '><span>' + esc(u.name) + '</span>' +
        '<small>' + (other ? 'Ficha ' + esc(other.name) : esc(roleLabel(u.role))) + '</small></label>';
    }).join('') + '</div><span class="hint-text">A conta vinculada vê a ficha mesmo oculta e é a única que vê a aba Anotações dela. Cada conta tem uma ficha só: escolher uma conta que já tem ficha tira a conta da outra.</span></div>';
}
function sheetAccountVal() { var el = modal.querySelector('input[name="sacc"]:checked'); return el ? el.getAttribute('value') || null : null; }
function sheetAccountToast(acc) { var u = acc && W.users.filter(function (x) { return x.id === acc; })[0]; return acc ? 'Ficha vinculada à conta de ' + (u ? u.name : 'quem foi escolhido') + '.' : 'A ficha está sem conta vinculada.'; }
function openSheetAccountForm(m) {
  showModal('<form id="sAccForm" novalidate><h2 id="sAccTitle">Vincular conta</h2><p class="lede" style="margin-top:-6px">Ficha ' + esc(m.name) + '</p>' + sheetAccountPickHtml(m.id) +
    '<div class="form-err" id="sAccErr" role="alert"></div>' +
    '<div class="btn-row" style="justify-content:flex-end"><button class="btn ghost" type="button" id="sAccCancel">Cancelar</button><button class="btn primary" type="submit" id="sAccSave">Salvar</button></div></form>');
  modal.setAttribute('aria-labelledby', 'sAccTitle');
  $('sAccCancel').onclick = function () { closeModal(); };
  $('sAccForm').onsubmit = function (e) {
    e.preventDefault(); if (modalOpen.busy) return;
    var acc = sheetAccountVal(), btn = $('sAccSave');
    modalOpen.busy = true; btn.disabled = true; $('sAccCancel').disabled = true; $('sAccErr').textContent = '';
    Ops.linkSheetAccount(m.id, acc).then(function () { closeModal(true); toast(sheetAccountToast(acc)); }, function (er) {
      if (!modalOpen) return;
      modalOpen.busy = false; btn.disabled = false; $('sAccCancel').disabled = false; $('sAccErr').textContent = errorText(er);
    });
  };
}

function openSheetForm(s, then) {
  // An ally's sheet: its name and notes; it is seen by whoever sees its main sheet (no visibility here).
  // The Mestre picks the linked account in place of the accounts that see it (the account sees it).
  var editing = !!s, ally = !!(s && s.allyOf), pick = !ally && isMestre();
  var html = '<form id="sheetForm" novalidate><h2 id="sfTitle">' + (ally ? 'Editar ficha de ' + esc(allyLabel(s)) : editing ? 'Editar ficha' : 'Nova ficha') + '</h2>' +
    (ally ? '<p class="lede" style="margin:0">O nome da ficha do aliado é independente do nome da aba (<b>Renomear</b>).</p>' : '') +
    '<div class="field" id="f_sname"><label for="sname">Nome da ficha</label><input type="text" id="sname" maxlength="100" autocomplete="off" placeholder="Ex.: Brynhild — nível 150" value="' + esc(editing ? s.name : '') + '"><div class="err" id="err_sname"></div></div>' +
    '<div class="field"><label for="sdesc">Observações</label><textarea id="sdesc" rows="6" maxlength="20000" placeholder="Anotações sobre a ficha.">' + esc(editing ? s.description || '' : '') + '</textarea></div>' +
    (ally ? '' : pick ? '<label class="vis-flag" for="svis"><input type="checkbox" id="svis"' + (s && !isSecret(s) ? ' checked' : '') + '><span><b>Visível para todos</b>' +
      '<small>Desmarcado, só o Mestre e a conta vinculada veem.</small></span></label>' + sheetAccountPickHtml(s && s.id) : flagHtml('svis', s, true)) +
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
    // Allies are told apart by their tab, not by the name of their sheet.
    if (!ally && mainSheets().some(function (x) { return (!editing || x.id !== s.id) && norm(x.name) === norm(n); }) && !$('sfErr').dataset.warned) {
      $('sfErr').textContent = 'Já existe uma ficha com esse nome. Clique em ' + (editing ? 'Salvar' : 'Criar') + ' ficha de novo para continuar mesmo assim.'; $('sfErr').dataset.warned = '1'; return;
    }
    modalOpen.busy = true;
    var btn = $('sfSave'); btn.disabled = true; btn.textContent = 'Salvando…'; $('sfCancel').disabled = true; $('sfErr').textContent = '';
    // A new sheet already shares with its account; an existing one gets it from linkSheetAccount.
    var acc = pick ? sheetAccountVal() : null, shared = pick && !editing ? (acc ? [acc] : []) : shareVal('svis', s);
    Ops.saveSheet(s, { name: n, description: $('sdesc').value, visible: flagVal('svis', s), sharedWith: shared }).then(function (id) {
      closeModal(true);
      function done() { if (then) then(id); else if (!editing) go(sheetHref(id)); }
      toast(editing ? 'Ficha salva.' : 'Ficha criada.');
      if (!pick || (acc || null) === ((sheetAccount(id) || {}).id || null)) { done(); return; }
      Ops.linkSheetAccount(id, acc).then(function () { toast((editing ? 'Ficha salva. ' : 'Ficha criada. ') + sheetAccountToast(acc)); done(); },
        function (er) { toast('A ficha foi salva, mas a conta não foi vinculada: ' + errorText(er), true); done(); });
    }, function (er) {
      if (!modalOpen) return;
      modalOpen.busy = false; btn.disabled = false; btn.textContent = editing ? 'Salvar ficha' : 'Criar ficha'; $('sfCancel').disabled = false;
      $('sfErr').textContent = errorText(er);
    });
  };
}

/* =====================================================================
   Form: the name of an ally's tab (its sheet keeps its own name)
   ===================================================================== */
// Criar Aliado: the name of its tab (the next free one already typed) and its color.
function openAllyCreateForm(m) {
  showModal('<form id="allyNewForm" novalidate><h2 id="anTitle">Criar aliado</h2><p class="lede" style="margin-top:-6px">Ficha ' + esc(m.name) + '</p>' +
    '<div class="field"><label for="anname">Nome da aba</label><input type="text" id="anname" maxlength="100" autocomplete="off" placeholder="Ex.: Lobo, Escudeiro" value="' + esc(nextAllyName(m)) + '"></div>' +
    allyColorPickHtml('violet') +
    '<div class="form-err" id="anErr" role="alert"></div>' +
    '<div class="btn-row" style="justify-content:flex-end"><button class="btn ghost" type="button" id="anCancel">Cancelar</button><button class="btn primary" type="submit" id="anSave">Criar aliado</button></div></form>');
  modal.setAttribute('aria-labelledby', 'anTitle');
  var name = $('anname'); name.select();
  $('anCancel').onclick = function () { closeModal(); };
  $('allyNewForm').onsubmit = function (e) {
    e.preventDefault(); if (modalOpen.busy) return;
    var btn = $('anSave'); modalOpen.busy = true; btn.disabled = true; btn.textContent = 'Criando…'; $('anCancel').disabled = true; $('anErr').textContent = '';
    Ops.createAlly(m, name.value, allyColorVal()).then(function (id) { closeModal(true); S.pendingAlly = id; toast('Aliado criado.'); go(allyHref(m.id, id)); }, function (er) {
      if (!modalOpen) return;
      modalOpen.busy = false; btn.disabled = false; btn.textContent = 'Criar aliado'; $('anCancel').disabled = false;
      $('anErr').textContent = 'Não foi possível criar o aliado: ' + errorText(er);
    });
  };
}
function openAllyNameForm(a) {
  var html = '<form id="allyForm" novalidate><h2 id="afTitle">Renomear aliado</h2>' +
    '<div class="field" id="f_aname"><label for="aname">Nome da aba</label><input type="text" id="aname" maxlength="100" autocomplete="off" placeholder="Ex.: Lobo, Escudeiro" value="' + esc(allyLabel(a)) + '"><div class="err" id="err_aname"></div></div>' +
    '<p class="hint-text" style="margin:0">Muda só o nome da aba. O nome da ficha do aliado (“' + esc(a.name) + '”) muda em <b>Editar ficha</b>.</p>' +
    allyColorPickHtml(allyColor(a)) +
    '<div class="form-err" id="afErr" role="alert"></div>' +
    '<div class="btn-row" style="justify-content:flex-end"><button class="btn ghost" type="button" id="afCancel">Cancelar</button><button class="btn primary" type="submit" id="afSave">Salvar</button></div></form>';
  showModal(html);
  modal.setAttribute('aria-labelledby', 'afTitle');
  var name = $('aname'); name.select();
  name.addEventListener('input', function () { if (name.value.trim()) { $('err_aname').textContent = ''; $('f_aname').classList.remove('invalid'); } });
  $('afCancel').onclick = function () { closeModal(); };
  $('allyForm').onsubmit = function (e) {
    e.preventDefault();
    if (modalOpen.busy) return;
    var n = name.value.trim();
    if (!n) { $('err_aname').textContent = 'Informe o nome do aliado.'; $('f_aname').classList.add('invalid'); name.focus(); return; }
    var color = allyColorVal();
    if (n === allyLabel(a) && color === allyColor(a)) { closeModal(); return; }
    modalOpen.busy = true;
    var btn = $('afSave'); btn.disabled = true; btn.textContent = 'Salvando…'; $('afCancel').disabled = true; $('afErr').textContent = '';
    Ops.renameAlly(a, n, color).then(function () { closeModal(true); toast('Aliado salvo.'); }, function (er) {
      if (!modalOpen) return;
      modalOpen.busy = false; btn.disabled = false; btn.textContent = 'Salvar'; $('afCancel').disabled = false;
      $('afErr').textContent = errorText(er);
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
  var cur = c.sheetId || '', list = mainSheets().sort(byName);
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
