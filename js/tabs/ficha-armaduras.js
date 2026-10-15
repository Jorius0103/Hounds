/* =====================================================================
   Hounds — Ficha › Equip. › Criar Armadura (armaduras modulares)
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html (depois de ficha-equipamentos.js).
   ===================================================================== */
'use strict';

/* Armor by locations (GURPS Low-Tech, pp. 100-101). A set starts from a base model, a torso armor of
   Mundo › Armaduras (100% of the cost, weight and time to don); each piece uses its location's
   percentage of the torso. Creating a set adds each piece to the sheet's list (Meus Itens) as an
   armor line; wearing it is up to Corpo, and the load counts it as any other line.
   sheet.armorSets = [{ id, name, description, baseId, base: { name, dr, cost, weight, don, tl },
       version, originId, mods: [{ name, spellId?, dr, cost, weightPct }],
       pieces: [{ id, loc, cover, pct, dr, cost, weight, don, equipId }] }]
     base: the model as it was when the set was made; mods: the adjustments, free text or a spell of
     Mundo › Magias, each adding to (or, negative, taking from) the DR of every piece, the set's total
     cost ($) and the weight of every piece (%); pieces: the results (armorSetPieces) and equipId, the line of
     the list that is the piece (null: it left the list). originId: the set this one is a copy or a
     new version of.
   Each time, Criar Armadura makes one piece, for one location (sets saved before this rule may hold
   several, and keep them). The set is named by its location ("Cabeça"); the piece in the list by the
   location and the base model ("Cabeça — Plate, Medium").
   The locations and their percentages (W.raw.armorLocs) are reference data; without the database's
   rows, ARMOR_LOC_DEFAULTS, the same as migration 16, is used. */

// [id, name, % of the torso, % already the front's only, front only offered, the location it is
// part of, others that cover part of the same area, parts of the body (GEAR_PARTS), one side only]
var ARMOR_LOC_DEFAULTS = /** @type {any[][]} */ ([
  ['head', 'Cabeça', 30, false, true, null, [], ['head'], false], ['skull', 'Crânio', 20, false, true, 'head', [], ['head'], false],
  ['face', 'Rosto', 10, false, true, 'head', [], ['head'], false], ['neck', 'Pescoço', 5, false, true, null, [], ['neck'], false],
  ['torso', 'Tronco completo', 100, false, true, null, [], ['torso'], false], ['chest', 'Peito', 75, false, true, 'torso', [], ['torso'], false],
  ['abdomen', 'Abdômen', 25, false, true, 'torso', [], ['torso'], false], ['groin', 'Virilha', 5, false, true, null, [], ['groin'], false],
  ['arms', 'Braços, ambos', 50, false, true, null, [], ['arms'], false], ['shoulders', 'Ombros', 10, false, true, 'arms', [], ['arms'], false],
  ['upper_arms', 'Braços superiores', 10, false, true, 'arms', [], ['arms'], false], ['elbows', 'Cotovelos', 5, false, true, 'arms', [], ['arms'], false],
  ['forearms', 'Antebraços', 25, false, true, 'arms', [], ['arms'], false], ['hands', 'Mãos, ambas', 10, false, true, null, [], ['hands'], false],
  ['hand', 'Uma mão', 5, false, true, 'hands', [], ['hands'], true], ['legs', 'Pernas, ambas', 100, false, true, null, [], ['legs'], false],
  ['thighs', 'Coxas', 45, false, true, 'legs', [], ['legs'], false], ['knees', 'Joelhos', 5, false, true, 'legs', [], ['legs'], false],
  ['shins', 'Canelas completas', 50, false, true, 'legs', [], ['legs'], false], ['shins_front', 'Canelas frontais', 25, true, false, 'shins', [], ['legs'], false],
  ['leg', 'Uma perna', 50, false, true, 'legs', ['thighs', 'knees', 'shins', 'shins_front'], ['legs'], true],
  ['feet', 'Pés, ambos', 10, false, true, null, [], ['feet'], false], ['foot', 'Um pé', 5, false, true, 'feet', [], ['feet'], true]]);
/* ---------- reference data ---------- */
function abNum(v, lo, hi) { var n = Number(v); return v === null || v === '' || v === undefined || !isFinite(n) ? null : Math.min(hi, Math.max(lo, n)); }
function cleanArmorLoc(d, dflt) {
  d = d || {}; dflt = dflt || {};
  var pct = abNum(d.pct, 0, 200), parts = (Array.isArray(d.parts) ? d.parts : []).filter(function (p) { return GEAR_PART_KEYS.indexOf(p) >= 0; });
  return { id: d.id || dflt.id, name: String(d.name || dflt.name || d.id).trim(), pct: pct > 0 ? pct : dflt.pct || 100, front: d.front === true,
    canFront: d.canFront !== false && d.front !== true, parent: typeof d.parent === 'string' && d.parent ? d.parent : null,
    conflicts: Array.isArray(d.conflicts) ? d.conflicts.filter(function (x) { return typeof x === 'string'; }) : [],
    parts: parts.length ? parts : dflt.parts || ['torso'], oneSide: d.oneSide === true, order: abNum(d.order, -999, 999) || dflt.order || 0 };
}
// The table as it is: the defaults with the database's rows on top, in their order. Remade only when
// the rows change.
var abRules = { locSrc: null, locs: null, locBy: null }, ARMOR_NONE = [];
function armorLocs() {
  var src = W.raw.armorLocs || ARMOR_NONE;
  if (abRules.locSrc !== src || !abRules.locs) {
    var by = Object.create(null);
    ARMOR_LOC_DEFAULTS.forEach(function (r, i) { by[r[0]] = { id: r[0], name: r[1], pct: r[2], front: r[3], canFront: r[4], parent: r[5], conflicts: r[6], parts: r[7], oneSide: r[8], order: i + 1 }; });
    src.forEach(function (d) { by[d.id] = cleanArmorLoc(d, by[d.id]); });
    abRules.locs = Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return a.order - b.order; });
    abRules.locBy = by; abRules.locSrc = src;
  }
  return abRules.locs;
}
function armorLocById(id) { armorLocs(); return (id && abRules.locBy[id]) || null; }
function armorLocName(id) { var l = armorLocById(id); return l ? l.name : id; }
// Whether location a is inside b (its parent, the parent's parent...).
function armorLocInside(a, b) { var l = armorLocById(a), n = 0; while (l && l.parent && n++ < 20) { if (l.parent === b) return true; l = armorLocById(l.parent); } return false; }
// Two locations that cannot be in the same set: one inside the other, or covering part of the same
// area (Uma perna and Coxas). Their percentages would count the same armor twice.
function armorLocsClash(a, b) {
  if (a === b) return false;
  var la = armorLocById(a), lb = armorLocById(b);
  return armorLocInside(a, b) || armorLocInside(b, a) || !!(la && la.conflicts.indexOf(b) >= 0) || !!(lb && lb.conflicts.indexOf(a) >= 0);
}

/* ---------- the calculation (one function for the screen and what is saved) ---------- */
// DR text plus n on every number: "4/2*" + 1 is "5/3*" (split DR, flexible); never below 0.
function drAdd(dr, n) { dr = String(dr == null ? '' : dr); return n ? dr.replace(/\d+/g, function (d) { return String(Math.max(0, +d + n)); }) : dr; }
// The adjustments of a set added up: DR on every piece; cost ($) on the set's total; weight (%) on
// every piece. The percentages add up (+50% and −15% are +35%).
function armorAdjTotal(mods) {
  var t = { dr: 0, cost: 0, weightPct: 0 };
  mods.forEach(function (m) { t.dr += m.dr || 0; t.cost += m.cost || 0; t.weightPct += m.weightPct || 0; });
  t.cost = eqRound(t.cost); t.weightPct = eqRound(t.weightPct);
  return t;
}
// One piece from the base model, in this order:
//   1. the base model's torso: cost, weight, DR and time to don (100%);
//   2. the location's percentage of the torso, on cost, weight and time to don;
//   3. front only: half of that, once, and only where the location offers it (not on one whose
//      percentage is already the front's, as Canelas frontais);
//   4. dr: the adjustments' DR, added to every number of the DR.
// Cost to the cent, weight to 0,01 lb, time to 0,1 s; without the base's time, the piece has none.
function armorPieceCalc(base, loc, cover, dr) {
  var front = cover === 'front' && loc.canFront && !loc.front, pct = loc.pct * (front ? 0.5 : 1);
  return { cover: front ? 'front' : 'full', pct: Math.round(pct * 1000) / 1000, dr: drAdd(base.dr, dr || 0),
    cost: eqRound(base.cost * pct / 100), weight: eqRound(base.weight * pct / 100),
    don: base.don == null ? null : Math.round(base.don * pct / 100 * 10) / 10 };
}
// The pieces of a set (sel: { location id: cover }): each one by armorPieceCalc, then the adjustments:
// the weight % on each piece's weight; the cost, which changes the set's total, shared among the
// pieces by their percentage (the last one takes what rounding left, so the total moves by exactly
// what was typed; one piece takes it all). A piece never goes below 0.
function armorSetPieces(base, mods, sel) {
  var adj = armorAdjTotal(mods), pieces = armorLocs().filter(function (l) { return sel[l.id]; }).map(function (l) {
    return Object.assign({ id: '', loc: l.id }, armorPieceCalc(base, l, sel[l.id], adj.dr), { equipId: null });
  });
  var sum = pieces.reduce(function (n, p) { return n + p.pct; }, 0), left = adj.cost;
  if (adj.weightPct) pieces.forEach(function (p) { p.weight = Math.max(0, eqRound(p.weight * (1 + adj.weightPct / 100))); });
  if (left && sum) pieces.forEach(function (p, i) {
    var part = i === pieces.length - 1 ? left : eqRound(adj.cost * p.pct / sum);
    left = eqRound(left - part); p.cost = Math.max(0, eqRound(p.cost + part));
  });
  return pieces;
}
// A piece in the list: the location, then the base model ("Cabeça (frontal) — Plate, Medium").
function armorPieceName(set, loc, cover) { return (loc.name + (cover === 'front' ? ' (frontal)' : '') + ' — ' + (set.base ? set.base.name : 'Armadura')).slice(0, 120); }
// A set: the locations chosen, in the table's order ("Cabeça + Pescoço + Mãos, ambas").
function armorSetName(locIds) { return armorLocs().filter(function (l) { return locIds.indexOf(l.id) >= 0; }).map(function (l) { return l.name; }).join(' + ').slice(0, 80); }

/* ---------- data of the sheet ---------- */
function cleanArmorSet(a, i, by) {
  a = a || {};
  var b = a.base || {}, pieces = [], locs = Object.create(null);
  var mods = (Array.isArray(a.mods) ? a.mods : []).map(cleanArmorAdj).filter(function (m) { return m.name; });
  (Array.isArray(a.pieces) ? a.pieces : []).forEach(function (p, j) {
    if (!p || typeof p.loc !== 'string' || !p.loc || locs[p.loc]) return;
    locs[p.loc] = true;
    pieces.push({ id: gearId(p.id) || 'q' + (j + 1), loc: p.loc, cover: p.cover === 'front' ? 'front' : 'full', pct: abNum(p.pct, 0.001, 1000) || 0.001, dr: String(p.dr == null ? '' : p.dr),
      cost: cleanDec(p.cost, 9999999, 0), weight: cleanDec(p.weight, 99999, 0), don: abNum(p.don, 0, 99999), equipId: p.equipId && by[p.equipId] ? p.equipId : null });
  });
  return { id: gearId(a.id) || 'a' + (i + 1), name: String(a.name || '').trim().slice(0, 80) || 'Armadura ' + (i + 1), description: String(a.description || '').trim().slice(0, 2000),
    baseId: gearId(a.baseId, 200) || null,
    base: { name: String(b.name || '').trim().slice(0, 120) || '—', dr: String(b.dr == null ? '' : b.dr).slice(0, 40), cost: cleanDec(b.cost, 9999999, 0), weight: cleanDec(b.weight, 99999, 0),
      don: abNum(b.don, 0, 99999), tl: String(b.tl || '').slice(0, 20) },
    version: cleanInt(a.version, 1, 999, 1), originId: gearId(a.originId) || null, mods: mods, pieces: pieces };
}
// An adjustment: a name (free text, or the spell's), and what it adds to or takes from the DR (whole
// points), the cost ($) and the weight (% of the piece's; −100% is the least). Empty numbers are 0.
function cleanArmorAdj(m) {
  m = m || {};
  var o = { name: String(m.name || '').trim().slice(0, 120), dr: cleanInt(m.dr, -50, 50, 0), cost: abNum(m.cost, -9999999, 9999999) || 0, weightPct: abNum(m.weightPct, -100, 1000) || 0 };
  o.cost = Math.round(o.cost * 100) / 100; o.weightPct = Math.round(o.weightPct * 100) / 100;
  var sp = gearId(m.spellId, 200); if (sp) o.spellId = sp;
  return o;
}
// The set a draft gives, with its adjustments (rows left blank are dropped), named by its locations.
function armorDraftSet(d) {
  var mods = d.adj.map(cleanArmorAdj).filter(function (m) { return m.name; });
  var set = { id: d.setId, name: armorSetName(Object.keys(d.locs)), description: String(d.description || '').trim(), baseId: d.baseId, base: d.base, version: d.version || 1, originId: d.originId || null, mods: mods, pieces: [] };
  if (d.base) set.pieces = armorSetPieces(d.base, mods, d.locs);
  return set;
}
// What stops a draft from being saved.
function armorDraftErrors(d) {
  var out = [], sel = Object.keys(d.locs);
  if (!d.base) out.push('Escolha o modelo base (uma armadura de tronco).');
  else if (d.custom && !String(d.base.name || '').trim()) out.push('Dê um nome ao modelo personalizado.');
  if (!sel.length) out.push('Escolha a parte do corpo.');
  if (d.adj.some(function (m) { var c = cleanArmorAdj(m); return !c.name && (c.dr || c.cost || c.weightPct); })) out.push('Dê um nome a cada ajuste com valores.');
  sel.forEach(function (a) { sel.forEach(function (b) { if (a < b && armorLocsClash(a, b)) out.push(armorLocName(a) + ' e ' + armorLocName(b) + ' cobrem a mesma área: escolha uma das duas.'); }); });
  return out;
}

// The old piece each piece of an edited set comes from: the one of the same location; a set of one
// piece whose part changed (Cabeça to Crânio) keeps its piece too.
function armorPieceFrom(prev, pc, set) {
  if (!prev) return null;
  return prev.pieces.filter(function (x) { return x.loc === pc.loc; })[0] ||
    (prev.pieces.length === 1 && set.pieces.length === 1 ? prev.pieces[0] : null);
}
// An edited piece's line on the body, on the parts its new location does not cover: these leave the body.
function armorDroppedSlots(g, lineId, loc) {
  var l = armorLocById(loc), out = [];
  g.bodies.forEach(function (b) { b.slots.forEach(function (sl) { if (sl.equipId === lineId && l && l.parts.indexOf(sl.part) < 0) out.push({ body: b, slot: sl }); }); });
  return out;
}
// Saves a set and its pieces in one write (the list and the sets together). An edited set keeps the
// line of each piece it still has (armorPieceFrom: the body and the packs keep pointing to it; a part
// the new location does not cover leaves the body); the lines of the pieces it lost leave the list.
// asNew: the draft becomes a new set (a new version), the old one stays as it is.
Ops.saveArmorSet = function (s, d, asNew) {
  if (!rawHas('sheets', s.id)) return Promise.reject({ message: 'Essa ficha não existe mais.' });
  var errs = armorDraftErrors(d); if (errs.length) return Promise.reject({ message: errs.join(' ') });
  var g = sheetGear(sheetById(s.id) || s), prev = d.setId ? g.armorSets.filter(function (a) { return a.id === d.setId; })[0] || null : null;
  var set = armorDraftSet(d), equip = g.equip.slice(), lines = gearIndex(equip), pieceIds = Object.create(null);
  if (prev && asNew) { set.originId = prev.id; set.version = prev.version + 1; prev = null; }
  set.id = prev ? prev.id : gearNewId('a', gearIndex(g.armorSets));
  g.armorSets.forEach(function (a) { a.pieces.forEach(function (p) { pieceIds[p.id] = true; }); });
  var kept = [], drop = [];
  set.pieces.forEach(function (pc) {
    var old = armorPieceFrom(prev, pc, set), line = old && old.equipId ? lines[old.equipId] : null;
    if (old) kept.push(old);
    if (line && old.loc !== pc.loc) drop = drop.concat(armorDroppedSlots(g, line.id, pc.loc));
    pc.id = old ? old.id : gearNewId('q', pieceIds); pieceIds[pc.id] = true;
    var fields = { kind: 'armor', name: armorPieceName(set, armorLocById(pc.loc), pc.cover), qty: 1, weight: pc.weight, cost: pc.cost };
    if (line) { line = Object.assign({}, line, fields); delete line.refId; equip[equip.indexOf(lines[line.id])] = line; }
    else { line = Object.assign({ id: gearNewId('e', lines), notes: armorPieceNotes(d) }, fields); equip.push(line); }
    lines[line.id] = line; pc.equipId = line.id;
  });
  if (prev) prev.pieces.forEach(function (old) {
    if (old.equipId && kept.indexOf(old) < 0) equip = equip.filter(function (e) { return e.id !== old.equipId; });
  });
  var sets = prev ? g.armorSets.map(function (a) { return a.id === set.id ? set : a; }) : g.armorSets.concat([set]), ch = { equip: equip, armorSets: sets };
  if (drop.length) ch.bodies = g.bodies.map(function (b) { return Object.assign({}, b, { slots: b.slots.filter(function (sl) { return !drop.some(function (x) { return x.slot === sl; }); }) }); });
  return saveGearLists(s, ch).then(function () { return set; });
};
// The Notas of a new piece: the description typed and the notes of the base model in the catalog
// ("[5] -2 DR vs. crushing."). They stay in the piece's line, editable in Meus Itens.
function armorBaseNotes(d) { var c = d.baseId ? armorById(d.baseId) : null; return c && c.footnotes ? String(c.footnotes).replace(/\s*\n\s*/g, ' ').trim() : ''; }
function armorPieceNotes(d) { return [String(d.description || '').trim(), armorBaseNotes(d)].filter(Boolean).join(' ').slice(0, 400); }
// withPieces: the pieces leave the list too (and so the body and the packs); without it they stay in
// the list as armors of their own.
Ops.deleteArmorSet = function (s, setId, withPieces) {
  var g = sheetGear(sheetById(s.id) || s), set = g.armorSets.filter(function (a) { return a.id === setId; })[0];
  if (!set) return Promise.resolve();
  var gone = set.pieces.map(function (p) { return p.equipId; }).filter(Boolean);
  var ch = { armorSets: g.armorSets.filter(function (a) { return a.id !== setId; }) };
  if (withPieces) ch.equip = g.equip.filter(function (e) { return gone.indexOf(e.id) < 0; });
  return saveGearLists(s, ch);
};
// Lines in use (body or packs) that an edit would change or take out of the list.
function armorEditImpact(g, prev, set) {
  var out = [], by = gearIndex(g.equip);
  prev.pieces.forEach(function (old) {
    var e = old.equipId && by[old.equipId], where = e ? gearWhere(g, e.id) : [];
    if (!where.length) return;
    var now = set.pieces.filter(function (p) { return armorPieceFrom(prev, p, set) === old; })[0];
    if (!now) { out.push('“' + e.name + '” sai da lista (está em ' + where.join(' · ') + ')'); return; }
    var name = armorPieceName(set, armorLocById(now.loc), now.cover), ch = [];
    if (name !== e.name) ch.push('nome');
    if (now.dr !== old.dr) ch.push('RD ' + old.dr + ' → ' + now.dr);
    if (now.cost !== old.cost) ch.push('custo ' + eqMoney(old.cost) + ' → ' + eqMoney(now.cost));
    if (now.weight !== old.weight) ch.push('peso ' + eqLbs(old.weight) + ' → ' + eqLbs(now.weight));
    if (now.loc !== old.loc) {
      ch.push('passa de ' + armorLocName(old.loc) + ' para ' + armorLocName(now.loc));
      var dropped = armorDroppedSlots(g, e.id, now.loc);
      if (dropped.length) ch.push('sai do Corpo em ' + dropped.map(function (x) { return gearPartName(x.slot.part) + ' (“' + x.body.name + '”)'; }).join(', '));
    }
    if (now.cover !== old.cover) ch.push(now.cover === 'front' ? 'passa a só frontal' : 'passa a completa');
    if (ch.length) out.push('“' + e.name + '” muda (' + ch.join(', ') + '); está em ' + where.join(' · '));
  });
  return out;
}

/* ---------- view: the sets ---------- */
function armorPieceStatus(g, pc) {
  if (!pc.equipId) return 'fora da lista';
  var w = gearWhere(g, pc.equipId);
  return w.length ? w.join(' · ') : 'na lista';
}
function armorDon(v) { return v == null ? '<span class="eq-none">—</span>' : esc(eqNum(v) + ' s'); }
function armorSetTotals(set) {
  var t = { cost: 0, weight: 0, don: 0, donAll: set.pieces.length > 0 };
  set.pieces.forEach(function (p) { t.cost += p.cost; t.weight += p.weight; if (p.don == null) t.donAll = false; else t.don += p.don; });
  t.cost = eqRound(t.cost); t.weight = eqRound(t.weight); t.don = Math.round(t.don * 10) / 10;
  return t;
}
// "Fortify (RD +1, +$500, peso −15%)".
function armorAdjText(m) {
  function sg(n) { return n < 0 ? '−' : '+'; }
  var parts = [m.dr ? 'RD ' + sg(m.dr) + Math.abs(m.dr) : '', m.cost ? sg(m.cost) + eqMoney(Math.abs(m.cost)) : '', m.weightPct ? 'peso ' + sg(m.weightPct) + eqNum(Math.abs(m.weightPct)) + '%' : ''].filter(Boolean);
  return m.name + (parts.length ? ' (' + parts.join(', ') + ')' : '');
}
// The DR on each part of the body, from the pieces that cover it.
function armorDrByPart(set) {
  return GEAR_PARTS.map(function (p) {
    var drs = set.pieces.filter(function (pc) { var l = armorLocById(pc.loc); return l && l.parts.indexOf(p[0]) >= 0; })
      .map(function (pc) { return pc.dr + (pc.cover === 'front' ? ' (frente)' : ''); });
    return drs.length ? '<span class="gear-chip"><b>' + p[1] + '</b><small>RD ' + esc(drs.join(' · ')) + '</small></span>' : '';
  }).join('');
}
// The pieces of Criar Armadura in Meus Itens, one row each: Armadura | RD | Custo | Peso | Ajustes |
// Notas, and (can) the actions of its piece: edit, another piece with the same model, delete.
function armorItemsHtml(lines, g, L, can) {
  var ui = S.ui, shown = {}, weight = 0;
  var rows = lines.map(function (x) {
    var pc = g.pieces[x.id], set = pc.set, counted = L.counted[x.id] || 0, where = gearWhere(g, x.id);
    var adj = set.mods.length ? set.mods.map(armorAdjText).join('; ') : '';
    weight += x.qty * x.weight;
    var row = '<tr' + (counted ? '' : ' class="eq-stored"') + '><td><b>' + gearKindTag('armor') + esc(x.name) + '</b>' +
      '<small class="eq-where">' + esc(where.length ? where.join(' · ') + ' · ' + (counted ? 'na carga' : 'fora da carga') : 'Só na lista · fora da carga') + '</small></td>' +
      '<td class="gval">' + esc(pc.piece.dr) + (pc.piece.cover === 'front' ? '<small>frontal</small>' : '') + '</td>' +
      '<td>' + esc(eqLbs(x.weight)) + '</td>' +
      '<td class="ab-txt">' + (adj ? esc(adj) : '<span class="eq-none">—</span>') + '</td>' +
      '<td class="ab-txt">' + (x.notes ? esc(x.notes) : '<span class="eq-none">—</span>') + '</td>' +
      (can ? '<td class="ab-acts"><button class="icon-btn" type="button" data-ab-edit="' + esc(set.id) + '" aria-label="Editar ' + esc(x.name) + '" title="Editar">' + svg(ICON.edit, 15) + '</button>' +
        '<button class="icon-btn" type="button" data-ab-copy="' + esc(set.id) + '" aria-label="Outra peça com este modelo" title="Outra peça com este modelo e os mesmos ajustes">' + svg(ICON.plus, 15, 2.4) + '</button>' +
        '<button class="icon-btn" type="button" data-ab-del="' + esc(set.id) + '" aria-label="Excluir ' + esc(x.name) + '" title="Excluir">' + svg(ICON.trash, 15) + '</button></td>' : '') + '</tr>';
    // The confirmation under the (first) row of the piece being deleted.
    if (can && ui.armorDel === set.id && !shown[set.id]) {
      shown[set.id] = true;
      var used = set.pieces.filter(function (q) { return q.equipId && gearWhere(g, q.equipId).length; });
      row += '<tr><td colspan="6"><div class="confirm" role="alert"><span>Excluir <b>' + esc(set.pieces.length > 1 ? set.name + ' (' + plural(set.pieces.length, 'peça', 'peças') + ')' : x.name) + '</b>?' +
        (used.length ? ' Em uso: ' + esc(used.map(function (q) { return armorLocName(q.loc) + ' (' + armorPieceStatus(g, q) + ')'; }).join('; ')) + '. Excluir tira de lá também.' : '') + '</span>' +
        '<div class="btn-row"><button class="btn danger solid" type="button" data-ab-delall="' + esc(set.id) + '">Excluir</button>' +
        '<button class="btn" type="button" data-ab-delset="' + esc(set.id) + '" title="A linha continua na lista, como uma armadura comum, sem os dados de Criar Armadura">Manter como item comum</button>' +
        '<button class="btn ghost" type="button" data-ab-delno="1">Cancelar</button></div></div></td></tr>';
    }
    return row;
  }).join('');
  return '<div class="wtab-wrap"><table class="gtab ab-items"><thead><tr><th>Armadura</th><th>RD</th><th>Peso</th><th>Ajustes</th><th>Notas</th>' + (can ? '<th></th>' : '') + '</tr></thead><tbody>' + rows + '</tbody>' +
    '<tfoot><tr><td colspan="2">' + plural(lines.length, 'armadura', 'armaduras') + '</td><td>' + esc(eqLbs(eqRound(weight))) + '</td><td colspan="' + (can ? 3 : 2) + '"></td></tr></tfoot></table></div>';
}
// Criar Armadura's card: a vest (ICON.armor, the shield, is Criar Escudo's)
ICON.vest = '<path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/>';
function sheetArmorHtml(s, g) {
  var ui = S.ui, can = canWrite(), d = can ? ui.armorDraft : null;
  var nPieces = g.armorSets.reduce(function (n, a) { return n + a.pieces.length; }, 0);
  var head = '<div class="gurps-head"><h2 class="sec-title">Criar Armadura</h2>' + (nPieces ? '<span class="gurps-total">' + plural(nPieces, 'peça', 'peças') + '</span>' : '') +
    (!d ? '<div class="btn-row">' + (can && !gearEditing() ? '<button class="btn primary" type="button" id="abNew">' + svg(ICON.plus, 15, 2.4) + 'Criar armadura</button>' : '') + '</div>' : '') + '</div>';
  if (d) return '<section class="gurps" id="armorSec">' + head + armorBuilderHtml(s, g, d) + '</section>';
  return gearCreateTile('armorSec', 'abNew', ICON.vest, 'Armadura', nPieces ? plural(nPieces, 'peça', 'peças') : '', 'Uma peça por parte do corpo (Low-Tech p. 100)');
}

/* ---------- view: the builder ---------- */
// Torso armors of Mundo › Armaduras with a cost and a weight in numbers: the base models. Only a Local
// of exactly the torso: one that also covers the groin or is partial (†) is not 100% of a torso.
function armorBases() { return (W.armors || []).filter(function (a) { return a.type !== 'Shield' && /^\s*torso\s*$/i.test(a.location || '') && catNum(a.cost) != null && catNum(a.weight) != null; }); }
function armorBaseOf(a) { return { name: a.name, dr: String(a.dr || '0'), cost: catNum(a.cost), weight: catNum(a.weight), don: catNum(a.don), tl: String(a.tl || '') }; }
function armorBaseBoxHtml(d) {
  if (!d.base) return '<p class="hint-text" style="margin:0">Escolha o modelo base: uma armadura de tronco de Mundo › Armaduras (o Local dela é só o tronco). Ela vale 100% do custo, do peso e do tempo para vestir; cada peça usa o percentual da localização. Um nome que não está no catálogo vira um modelo personalizado.</p>';
  if (d.custom) return armorCustomBaseHtml(d);
  var cat = d.baseId ? armorById(d.baseId) : null, catDon = cat ? catNum(cat.don) : null;
  return '<div class="gurps-derived">' + gearStat('Modelo base', esc(d.base.name), cat ? ptNameHtml(cat) || esc(cat.page || '') : 'como gravado na peça') +
    gearStat('RD', esc(d.base.dr), 'do material') + gearStat('Custo do tronco', esc(eqMoney(d.base.cost)), '100%') + gearStat('Peso do tronco', esc(eqLbs(d.base.weight)), '100%') +
    gearStat('TL', esc(d.base.tl || '—'), '') +
    '<div class="gstat"><span>Vestir o tronco</span>' + (catDon != null ? '<strong>' + esc(eqNum(catDon)) + ' s</strong><small>do catálogo</small>'
      : '<input type="number" id="abDon" min="0" max="9999" step="1" inputmode="numeric" placeholder="—" aria-label="Segundos para vestir o tronco" value="' + (d.base.don == null ? '' : d.base.don) + '"><small>o catálogo não tem; em segundos, opcional</small>') + '</div></div>' +
    armorFlexHtml(d.base.dr) + (armorBaseNotes(d) ? '<p class="hint-text ab-flex" style="margin-bottom:0"><b>Notas do modelo:</b> ' + esc(armorBaseNotes(d)) + ' <span>(vão para as Notas da peça)</span></p>' : '');
}
// A custom model (not in the catalog): every field of the torso is typed (data-ab-base).
function armorCustomBaseHtml(d) {
  var b = d.base;
  function field(k, label, input, note) { return '<div class="gstat"><span>' + label + '</span>' + input + (note ? '<small>' + note + '</small>' : '') + '</div>'; }
  function num(k, step, label) { return '<input type="number" data-ab-base="' + k + '" min="0" step="' + step + '" inputmode="decimal" placeholder="—" aria-label="' + label + '" value="' + (b[k] == null || (k !== 'don' && !b[k]) ? '' : b[k]) + '">'; }
  return '<p class="hint-text" style="margin:0"><b>Modelo personalizado</b>: não está em Mundo › Armaduras. Preencha os valores do tronco (100%); cada peça usa o percentual da localização.</p>' +
    '<div class="gurps-derived ab-custom">' +
    field('name', 'Nome do modelo', '<input type="text" data-ab-base="name" maxlength="120" aria-label="Nome do modelo" value="' + esc(b.name) + '">', '') +
    field('dr', 'RD', '<input type="text" data-ab-base="dr" maxlength="40" placeholder="Ex.: 4, 4/2*, 3F" aria-label="RD" value="' + esc(b.dr) + '">', '* flexível, / dividida, F só frente') +
    field('cost', 'Custo do tronco ($)', num('cost', 'any', 'Custo do tronco'), '100%') + field('weight', 'Peso do tronco (lbs)', num('weight', 'any', 'Peso do tronco'), '100%') +
    field('tl', 'TL', '<input type="text" data-ab-base="tl" maxlength="20" placeholder="Ex.: 3" aria-label="TL" value="' + esc(b.tl) + '">', '') +
    field('don', 'Vestir o tronco (s)', num('don', '1', 'Segundos para vestir o tronco'), 'opcional') + '</div>' +
    '<div id="abFlex">' + armorFlexHtml(b.dr) + '</div>';
}
function armorCustomBase(name) { return { name: String(name || '').trim().slice(0, 120), dr: '', cost: 0, weight: 0, don: null, tl: '' }; }
// A DR with * (Basic Set, p. B283): flexible armor, and what that means in play.
function armorFlexHtml(dr) {
  if (String(dr || '').indexOf('*') < 0) return '';
  return '<p class="eq-enc ab-flex">' + svg(ICON.info, 15) + '<span><b>RD ' + esc(dr) + ': o * indica armadura flexível</b> (Basic Set, p. B283), como couro, tecido, peles e cota de malha. ' +
    'Ela deixa passar <b>trauma contundente</b> (p. B379): quando um golpe de contusão (cr) não atravessa a RD, o personagem ainda sofre 1 ponto de dano para cada 5 pontos que a armadura segurou. ' +
    'Armaduras rígidas (sem *), como placa, não têm esse efeito. A ficha não calcula isso sozinha: aplique na hora do dano.</span></p>';
}
/* ---------- adjustments (Criar Armadura and Criar Arma) ----------
   Free rows, each a name (typed, or a spell picked from Mundo › Magias, in English or Portuguese)
   and numbers that add to or take from the result. cfg: { p: the prefix of the ids ('ab', 'wb'),
   nums: [[field, label, step]], blank: a new row, clean(m), total(list): the sum as one row,
   text(m): "Nome (RD +1, +$5)", hint: the name's placeholder, help: the line below }. */
function adjRowHtml(cfg, m, i) {
  var sp = m.spellId ? spellById(m.spellId) : null;
  function num(f) {
    return '<label class="ab-lv">' + f[1] + ' <input type="number" data-adj-f="' + i + ':' + f[0] + '" step="' + f[2] + '" placeholder="0" value="' + (m[f[0]] == null || m[f[0]] === 0 ? '' : m[f[0]]) + '" aria-label="' + f[1] + ' do ajuste"></label>';
  }
  return '<div class="ab-adj" data-adj="' + i + '"><div class="sk-pick ab-adj-name"><input type="text" data-adj-f="' + i + ':name" maxlength="120" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="' + cfg.p + 'AdjSug' + i + '"' +
    ' placeholder="' + esc(cfg.hint) + '" value="' + esc(m.name || '') + '" aria-label="Ajuste">' +
    '<div class="suggest" id="' + cfg.p + 'AdjSug' + i + '" role="listbox" hidden></div>' +
    (sp ? '<small><a href="' + spellHref(sp.id) + '" target="_blank" rel="noopener">' + svg(ICON.spell, 12, 2.2) + 'Magia: ' + esc(sp.name) + (sp.page ? ' · ' + esc(sp.page) : '') + '</a></small>' : '') + '</div>' +
    cfg.nums.map(num).join('') +
    '<button class="icon-btn" type="button" data-adj-del="' + i + '" aria-label="Remover ajuste" title="Remover">' + svg(ICON.x, 15, 2.4) + '</button></div>';
}
function adjSumHtml(cfg, list) {
  var named = list.map(cfg.clean).filter(function (m) { return m.name; });
  if (!named.length) return '';
  return 'Total dos ajustes: ' + esc(cfg.text(Object.assign(cfg.total(named), { name: plural(named.length, 'ajuste', 'ajustes') })));
}
function adjListHtml(cfg, list) {
  return '<div class="ab-adjs">' + list.map(function (m, i) { return adjRowHtml(cfg, m, i); }).join('') + '</div>' +
    '<div class="btn-row"><button class="btn" type="button" id="' + cfg.p + 'AdjAdd" data-adj-add="1">' + svg(ICON.plus, 15, 2.4) + 'Adicionar ajuste</button><span class="hint-text" id="' + cfg.p + 'AdjSum">' + adjSumHtml(cfg, list) + '</span></div>' +
    '<p class="hint-text" style="margin:0">' + cfg.help + '</p>';
}
// box: the element that holds the list (it stays; its content is redrawn when a row comes or goes).
// changed(): after every change, to redraw what depends on the adjustments.
function wireAdjList(cfg, box, list, changed) {
  var sug = { i: -1, list: null, input: null, options: [], active: 0 };
  function redraw(focusLast) {
    hide(); box.innerHTML = adjListHtml(cfg, list); changed();
    if (focusLast) { var l = box.querySelectorAll('[data-adj-f$=":name"]'), f = l[l.length - 1]; if (f instanceof HTMLElement) f.focus(); }
  }
  function hide() {
    if (sug.list) { sug.list.hidden = true; sug.list.innerHTML = ''; sug.input.setAttribute('aria-expanded', 'false'); }
    sug.i = -1; sug.list = null; sug.input = null; sug.options = [];
  }
  function show(input) {
    var i = +input.getAttribute('data-adj-f').split(':')[0], el = $(cfg.p + 'AdjSug' + i);
    if (sug.list && sug.list !== el) hide();
    var q = input.value, options = norm(q).trim() ? searchCatalog(W.spells || [], q, null).slice(0, 8) : [];
    if (!el || !options.length || (options.length === 1 && options[0].id === list[i].spellId)) { sug.list = el; sug.input = input; hide(); return; }
    sug.i = i; sug.list = el; sug.input = input; sug.options = options; sug.active = Math.min(sug.active, options.length - 1);
    el.innerHTML = options.map(function (c, n) {
      return '<button type="button" role="option" data-o="' + n + '" class="' + (n === sug.active ? 'act' : '') + '" aria-selected="' + (n === sug.active) + '"><span>' + esc(c.name) + ptNameHtml(c) + '</span>' +
        '<small>' + esc(['Magia', c.college, c.page].filter(Boolean).join(' · ')) + '</small></button>';
    }).join('');
    el.hidden = false; input.setAttribute('aria-expanded', 'true');
  }
  function pick(n) {
    var c = sug.options[n], i = sug.i; if (!c || i < 0) return;
    list[i].name = c.name; list[i].spellId = c.id;
    redraw(false);
    var f = box.querySelector('[data-adj-f="' + i + ':' + cfg.nums[0][0] + '"]'); if (f instanceof HTMLElement) f.focus();
  }
  function nameField(e) { var t = /** @type {AnyEl} */ (e.target); return t && t.getAttribute && /:name$/.test(t.getAttribute('data-adj-f') || '') ? t : null; }
  box.addEventListener('input', function (e) {
    var t = /** @type {AnyEl} */ (e.target), f = t.getAttribute && t.getAttribute('data-adj-f'); if (!f) return;
    // Typing: the row stays as it is (the focus too); the total and what depends on it follow.
    var k = f.split(':'), m = list[+k[0]]; if (!m) return;
    if (k[1] === 'name') {
      m.name = t.value;
      // Another name than the spell picked: the link goes.
      var sp = m.spellId ? spellById(m.spellId) : null;
      if (sp && norm(t.value).trim() !== norm(sp.name)) { delete m.spellId; var a = t.closest('.ab-adj-name').querySelector('small'); if (a) a.remove(); }
      sug.active = 0; show(t);
    } else if (t.value === '' || isFinite(Number(t.value))) m[k[1]] = t.value === '' ? 0 : Number(t.value);
    $(cfg.p + 'AdjSum').innerHTML = adjSumHtml(cfg, list);
    changed();
  });
  box.addEventListener('focusin', function (e) { var t = nameField(e); if (t) { loadCatalog('spells'); sug.active = 0; show(t); } });
  box.addEventListener('focusout', function (e) { var t = nameField(e); if (t) setTimeout(function () { if (sug.input === t && document.activeElement !== t) hide(); }, 150); });
  box.addEventListener('keydown', function (e) {
    var t = nameField(e); if (!t || sug.input !== t || !sug.options.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); sug.active = Math.min(sug.options.length - 1, sug.active + 1); show(t); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sug.active = Math.max(0, sug.active - 1); show(t); }
    else if (e.key === 'Enter') { e.preventDefault(); pick(sug.active); }
    else if (e.key === 'Escape') { e.stopPropagation(); hide(); }
  });
  box.addEventListener('mousedown', function (e) { if (e.target.closest && e.target.closest('.suggest')) e.preventDefault(); });
  box.addEventListener('click', function (e) {
    var t = /** @type {AnyEl} */ (e.target), o = t.closest && t.closest('.suggest [data-o]'), del = t.closest && t.closest('[data-adj-del]'), add = t.closest && t.closest('[data-adj-add]');
    if (o) pick(+o.getAttribute('data-o'));
    else if (del) { list.splice(+del.getAttribute('data-adj-del'), 1); redraw(false); }
    else if (add) { list.push(Object.assign({}, cfg.blank)); redraw(true); }
  });
}
// Criar Armadura's adjustments: DR (points), cost ($), weight (% of the piece's).
var ARMOR_ADJ = { p: 'ab', nums: [['dr', 'RD', '1'], ['cost', 'Custo ($)', 'any'], ['weightPct', 'Peso (%)', 'any']], blank: { name: '', dr: 0, cost: 0, weightPct: 0 },
  clean: function (m) { return cleanArmorAdj(m); }, total: function (l) { return armorAdjTotal(l); }, text: function (m) { return armorAdjText(m); },
  hint: 'Escreva o ajuste ou busque uma magia. Ex.: Fortify, sob medida',
  help: 'Cada ajuste soma (ou, negativo, tira): a RD em pontos, o custo em $ e o peso em % do peso da peça (ex.: −15 para sob medida Expert). Com vários ajustes, as porcentagens se somam. Os ajustes ficam guardados com a peça.' };
// The part of the body, picked from a list: grouped by the larger locations (Cabeça, then Crânio and
// Rosto inside it), each with its percentage of the torso. Once picked: its coverage and the piece's
// values.
function armorLocsHtml(d, set) {
  var sel = Object.keys(d.locs)[0] || '', l = sel ? armorLocById(sel) : null, p = set.pieces.filter(function (x) { return x.loc === sel; })[0];
  function opts(x, depth) {
    return '<option value="' + esc(x.id) + '"' + (x.id === sel ? ' selected' : '') + '>' + (depth ? new Array(depth + 1).join('   ') + '└ ' : '') + esc(x.name) + ' — ' + esc(eqNum(x.pct)) + '%</option>' +
      armorLocs().filter(function (y) { return y.parent === x.id; }).map(function (y) { return opts(y, depth + 1); }).join('');
  }
  var pick = '<select id="abLocSel" aria-label="Parte do corpo"><option value="">Escolha a parte do corpo…</option>' +
    armorLocs().filter(function (x) { return !x.parent; }).map(function (x) { return '<optgroup label="' + esc(x.name) + '">' + opts(x, 0) + '</optgroup>'; }).join('') + '</select>';
  var cover = !l ? '' : l.front ? '<span class="eq-none">só a frente</span>' : l.canFront ? '<select data-ab-cover="' + esc(l.id) + '" aria-label="Cobertura de ' + esc(l.name) + '"><option value="full">Completa</option><option value="front"' + (d.locs[sel] === 'front' ? ' selected' : '') + '>Só frontal (−50%)</option></select>' : 'Completa';
  return '<div class="ab-loc-pick"><label class="sc-f"><span>Parte do corpo</span>' + pick + '</label>' + (l ? '<label class="sc-f"><span>Cobertura</span>' + cover + '</label>' : '') + '</div>' +
    (p ? '<div class="gurps-derived" id="abLocVals">' + gearStat('% do tronco', esc(eqNum(p.pct)) + '%', p.pct !== l.pct ? 'de ' + esc(eqNum(l.pct)) + '%, só a frente' : '') + gearStat('RD', esc(p.dr), '') +
      gearStat('Custo', esc(eqMoney(p.cost)), '') + gearStat('Peso', esc(eqLbs(p.weight)), '') + gearStat('Vestir', p.don == null ? '—' : esc(eqNum(p.don)) + ' s', '') + '</div>' : '');
}
function armorSummaryHtml(set) {
  if (!set.pieces.length) return '<p class="hint-text" style="margin:0">Escolha a parte do corpo acima: o resumo da peça aparece aqui.</p>';
  var t = armorSetTotals(set);
  return '<h3 class="sec-title" style="margin:0">' + (set.pieces.length > 1 ? 'Resumo das peças' : 'Resumo da peça') + '</h3><div class="wtab-wrap"><table class="gtab ab-tab"><thead><tr><th>Localização</th><th>Peça</th><th>Cobertura</th><th>%</th><th>RD</th><th>Peso</th><th>Vestir</th></tr></thead><tbody>' +
    set.pieces.map(function (p) {
      var l = armorLocById(p.loc);
      return '<tr><td><b>' + esc(l.name) + '</b></td><td>' + esc(armorPieceName(set, l, p.cover)) + '</td><td>' + (p.cover === 'front' ? 'Frontal' : 'Completa') + '</td><td>' + esc(eqNum(p.pct)) + '%</td>' +
        '<td class="gval">' + esc(p.dr) + '</td><td>' + esc(eqLbs(p.weight)) + '</td><td>' + armorDon(p.don) + '</td></tr>';
    }).join('') + '</tbody><tfoot><tr><td colspan="5">' + plural(set.pieces.length, 'peça', 'peças') + '</td><td>' + esc(eqLbs(t.weight)) + '</td><td>' +
    (t.donAll ? esc(eqNum(t.don) + ' s') : '<span class="eq-none">—</span>') + '</td></tr></tfoot></table></div>' +
    '<div class="ab-dr"><span class="ab-dr-label">RD por parte do corpo</span>' + armorDrByPart(set) + '</div>' +
    '<p class="hint-text" style="margin:0">Criar não equipa: a peça vai para Meus Itens e só entra na carga quando estiver na configuração de Corpo em uso ou numa mochila em uso. Para as outras partes do corpo, crie uma peça de cada vez (no cartão da peça, <b>Outra peça com este modelo</b> repete o modelo e os ajustes).</p>';
}
function armorDynHtml(d) {
  var set = armorDraftSet(d);
  return (d.base ? '<div class="box sk-edit"><h3 class="sec-title" style="margin:0">Parte do corpo</h3>' +
    (Object.keys(d.locs).length > 1 ? '<p class="hint-text" style="margin:0">Este registro é de antes de “uma peça de cada vez” e tem ' + Object.keys(d.locs).length + ' peças; escolher uma parte deixa só ela.</p>' : '') + armorLocsHtml(d, set) +
    '<p class="hint-text" style="margin:0">Escolha uma parte: a peça usa o percentual dela sobre o tronco. Cabeça já inclui Crânio e Rosto. A cobertura só frontal custa e pesa metade; Canelas frontais já é só a frente e não reduz de novo.</p></div>' +
    '<div class="box sk-edit">' + armorSummaryHtml(set) + '</div>' : '') +
    (d.impact ? '<div class="confirm" role="alert"><span>Esta peça está em uso, e salvar muda: ' + esc(d.impact.join('; ')) + '.</span><div class="btn-row">' +
      '<button class="btn danger solid" type="button" id="abApply">Aplicar às peças</button><button class="btn" type="button" id="abAsNew2">Salvar como nova versão</button><button class="btn ghost" type="button" id="abBack">Voltar</button></div></div>' : '');
}
function armorBuilderHtml(s, g, d) {
  var chars = sheetChars(s.id), editing = !!d.setId;
  return '<div class="box sk-edit"><div class="ab-grid">' +
    '<label class="sc-f"><span>Modelo base (armadura de tronco)</span><div class="sk-pick"><input type="text" id="abBase" maxlength="120" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="abBaseSug"' +
    ' placeholder="' + (W.loaded.armors ? 'Digite para buscar. Ex.: placa, Plate, malha' : 'Carregando armaduras…') + '" value="' + esc(d.base ? d.base.name : '') + '"><div class="suggest" id="abBaseSug" role="listbox" hidden></div></div></label>' +
    '<label class="sc-f"><span>Descrição</span><textarea id="abDesc" rows="2" maxlength="2000" placeholder="Opcional">' + esc(d.description) + '</textarea></label></div>' +
    '<p class="hint-text" style="margin:0">Ficha <b>' + esc(s.name) + '</b>' + (chars.length ? ', de ' + esc(chars.map(function (c) { return c.name; }).join(', ')) : '') + ': a peça entra na lista de itens desta ficha, com o nome da parte do corpo escolhida.' +
    (editing ? ' Editando “' + esc(d.origName || '') + '”: a peça mantém a linha na lista (e onde está no Corpo e nas Mochilas).' : '') + '</p>' +
    '<div id="abBaseBox">' + armorBaseBoxHtml(d) + '</div></div>' +
    '<div class="box sk-edit" id="abModsBox"' + (d.base ? '' : ' hidden') + '><h3 class="sec-title" style="margin:0">Ajustes</h3><div class="ab-mods" id="abMods">' + adjListHtml(ARMOR_ADJ, d.adj) + '</div></div>' +
    '<div id="abDyn">' + armorDynHtml(d) + '</div>' +
    '<div class="form-err" id="abErr" role="alert"></div>' +
    '<div class="btn-row" style="justify-content:flex-end"><button class="btn ghost" type="button" id="abCancel">Cancelar</button>' +
    (editing ? '<button class="btn" type="button" id="abAsNew">Salvar como nova versão</button><button class="btn primary" type="button" id="abSave">Salvar alterações</button>'
      : '<button class="btn primary" type="button" id="abSave">Criar peça e adicionar aos itens</button>') + '</div>';
}

/* ---------- wiring ---------- */
function armorDraftFrom(set, mode) {
  var d = { setId: null, origName: '', originId: null, version: 1, description: '', baseId: null, base: null, custom: false, adj: [], locs: {}, impact: null };
  if (!set) return d;
  d.description = set.description; d.baseId = set.baseId; d.base = Object.assign({}, set.base); d.custom = !set.baseId;
  d.adj = set.mods.map(function (m) { return Object.assign({}, m); });
  if (mode === 'edit') set.pieces.forEach(function (p) { d.locs[p.loc] = p.cover; });
  if (mode === 'edit') { d.setId = set.id; d.origName = set.name; d.originId = set.originId; d.version = set.version; } else d.originId = set.id;
  return d;
}
function wireArmorSec(s) {
  var ui = S.ui, box = $('armorSec'); if (!box) return;
  var nb = $('abNew'); if (nb) nb.onclick = function () { ui.armorDraft = armorDraftFrom(null); loadCatalog('armors'); renderSheetPage(); var n = $('abBase'); if (n) n.focus(); };
  var d = ui.armorDraft;
  if (!d) {
    var items = $('equip'); if (!items) return;
    items.addEventListener('click', function (e) {
      var t = /** @type {AnyEl} */ (e.target), b = t.closest && t.closest('[data-ab-edit], [data-ab-copy], [data-ab-del], [data-ab-delall], [data-ab-delset], [data-ab-delno]'); if (!b) return;
      var g = sheetGear(s), find = function (attr) { var id = b.getAttribute(attr); return g.armorSets.filter(function (a) { return a.id === id; })[0]; };
      if (b.hasAttribute('data-ab-edit')) { ui.armorDraft = armorDraftFrom(find('data-ab-edit'), 'edit'); loadCatalog('armors'); renderSheetPage(); return; }
      if (b.hasAttribute('data-ab-copy')) { ui.armorDraft = armorDraftFrom(find('data-ab-copy'), 'copy'); loadCatalog('armors'); renderSheetPage(); return; }
      if (b.hasAttribute('data-ab-del')) { ui.armorDel = b.getAttribute('data-ab-del'); renderSheetPage(); return; }
      if (b.hasAttribute('data-ab-delno')) { ui.armorDel = null; renderSheetPage(); return; }
      var all = b.hasAttribute('data-ab-delall'), set = find(all ? 'data-ab-delall' : 'data-ab-delset');
      b.disabled = true;
      Ops.deleteArmorSet(s, set.id, all).then(function () { ui.armorDel = null; toast(all ? 'Armadura excluída.' : 'A peça continua em Meus Itens como um item comum.'); renderSheetPage(); },
        function (er) { b.disabled = false; toast(errorText(er), true); });
    });
    return;
  }
  function paint() { d.impact = null; $('abDyn').innerHTML = armorDynHtml(d); $('abErr').textContent = ''; }
  $('abDesc').addEventListener('input', function () { d.description = $('abDesc').value; });
  box.addEventListener('input', function (e) {
    var t = /** @type {AnyEl} */ (e.target);
    var bk = t.getAttribute && t.getAttribute('data-ab-base');
    if (t.id === 'abDon') { d.base.don = t.value === '' ? null : cleanDec(t.value, 99999, 0); paint(); }
    else if (bk && d.base) {
      // A custom model's field: the pieces follow as it is typed (the field keeps the focus).
      if (bk === 'cost' || bk === 'weight') d.base[bk] = t.value === '' ? 0 : cleanDec(t.value, bk === 'cost' ? 9999999 : 99999, 0);
      else if (bk === 'don') d.base.don = t.value === '' ? null : cleanDec(t.value, 99999, null);
      else d.base[bk] = String(t.value).slice(0, bk === 'name' ? 120 : bk === 'dr' ? 40 : 20);
      if (bk === 'name') pick.value = d.base.name;
      if (bk === 'dr') $('abFlex').innerHTML = armorFlexHtml(d.base.dr);
      paint();
    }
  });
  box.addEventListener('change', function (e) {
    var t = /** @type {AnyEl} */ (e.target); if (!t.getAttribute) return;
    var cov = t.getAttribute('data-ab-cover');
    if (t.id === 'abLocSel') { d.locs = {}; if (t.value) d.locs[t.value] = 'full'; }
    else if (cov) d.locs[cov] = t.value === 'front' ? 'front' : 'full';
    else return;
    paint();
  });
  // The base model: the torso armors of the catalog, found by name in English or Portuguese.
  var pick = $('abBase'), sug = $('abBaseSug'), opts = [], act = 0;
  function hide() { sug.hidden = true; sug.innerHTML = ''; pick.setAttribute('aria-expanded', 'false'); }
  function show() {
    var q = pick.value, all = armorBases(), typed = String(q || '').trim();
    opts = d.base && q === d.base.name ? all.slice(0, 60) : norm(q).trim() ? searchCatalog(all, q, null).slice(0, 12) : all.slice(0, 60);
    // A name the catalog does not have (exactly): offered as a custom model, at the end.
    if (typed && !(d.base && q === d.base.name) && !all.some(function (a) { return norm(a.name) === norm(typed); })) opts = opts.concat([{ custom: true, name: typed }]);
    act = Math.min(act, Math.max(0, opts.length - 1));
    if (!opts.length) { hide(); return; }
    sug.innerHTML = opts.map(function (a, n) {
      if (a.custom) return '<button type="button" role="option" id="abBaseSug' + n + '" data-o="' + n + '" class="ab-custom-opt' + (n === act ? ' act' : '') + '" aria-selected="' + (n === act) + '"><span>' + svg(ICON.plus, 13, 2.4) + 'Usar “' + esc(a.name) + '” como modelo personalizado</span><small>preencha RD, custo, peso e o resto</small></button>';
      return '<button type="button" role="option" id="abBaseSug' + n + '" data-o="' + n + '" class="' + (n === act ? 'act' : '') + '" aria-selected="' + (n === act) + '"><span>' + esc(a.name) + ptNameHtml(a) + '</span>' +
        '<small>' + esc(['RD ' + (a.dr || '0'), a.cost, a.weight ? a.weight + ' lb' : '', a.tl ? 'TL ' + a.tl : '', a.page].filter(Boolean).join(' · ')) + '</small></button>';
    }).join('');
    sug.hidden = false; pick.setAttribute('aria-expanded', 'true'); pick.setAttribute('aria-activedescendant', 'abBaseSug' + act);
    var on = sug.querySelector('.act'); if (on) on.scrollIntoView({ block: 'nearest' });
  }
  function choose(n) {
    var a = opts[n]; if (!a) return;
    if (a.custom) { d.custom = true; d.baseId = null; d.base = armorCustomBase(a.name); }
    else { d.custom = false; d.baseId = a.id; d.base = armorBaseOf(a); }
    pick.value = d.base.name; hide();
    $('abBaseBox').innerHTML = armorBaseBoxHtml(d); $('abModsBox').hidden = false; paint();
    if (a.custom) { var f = $('abBaseBox').querySelector('[data-ab-base="dr"]'); if (f instanceof HTMLElement) f.focus(); }
  }
  pick.addEventListener('input', function () { act = 0; show(); });
  // The list opens when the field is clicked, typed in or ArrowDown is pressed, not when it just gets
  // the focus (opening the builder focuses it).
  pick.addEventListener('focus', function () { loadCatalog('armors'); });
  pick.addEventListener('click', function () { loadCatalog('armors').then(function () { if (document.activeElement === pick) { act = 0; show(); } }); });
  pick.addEventListener('blur', function () { setTimeout(function () { if (document.activeElement !== pick) { hide(); if (d.base) pick.value = d.base.name; } }, 150); });
  pick.addEventListener('keydown', function (e) {
    if (sug.hidden && e.key === 'ArrowDown') { e.preventDefault(); act = 0; show(); return; }
    if (sug.hidden || !opts.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); act = Math.min(opts.length - 1, act + 1); show(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); act = Math.max(0, act - 1); show(); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(act); }
    else if (e.key === 'Escape') { e.stopPropagation(); hide(); }
  });
  sug.addEventListener('mousedown', function (e) { e.preventDefault(); });
  sug.addEventListener('click', function (e) { var b = e.target.closest('[data-o]'); if (b) choose(+b.getAttribute('data-o')); });

  wireAdjList(ARMOR_ADJ, $('abMods'), d.adj, paint);

  function save(asNew, confirmed) {
    var errs = armorDraftErrors(d); if (errs.length) { $('abErr').textContent = errs.join(' '); return; }
    var g = sheetGear(sheetById(s.id) || s), prev = d.setId ? g.armorSets.filter(function (a) { return a.id === d.setId; })[0] : null;
    // Pieces in use that would change: ask first (apply, or keep them and make a new version).
    if (prev && !asNew && !confirmed) {
      var impact = armorEditImpact(g, prev, armorDraftSet(d));
      if (impact.length) { d.impact = impact; $('abDyn').innerHTML = armorDynHtml(d); wireImpact(); $('abDyn').querySelector('.confirm').scrollIntoView({ block: 'nearest' }); return; }
    }
    var btns = box.querySelectorAll('.btn'); btns.forEach(function (b) { b.disabled = true; });
    Ops.saveArmorSet(s, d, asNew).then(function (set) {
      ui.armorDraft = null;
      toast(prev && !asNew ? 'Peça salva; a linha em Meus Itens foi atualizada.' : (set.pieces.length > 1 ? plural(set.pieces.length, 'peça adicionada', 'peças adicionadas') : '“' + set.name + '” adicionada') + ' a Meus Itens' + (asNew ? ' (nova versão)' : '') + '.');
      renderSheetPage();
    }, function (er) { btns.forEach(function (b) { b.disabled = false; }); $('abErr').textContent = errorText(er); });
  }
  function wireImpact() {
    var ap = $('abApply'), an = $('abAsNew2'), bk = $('abBack');
    if (ap) ap.onclick = function () { save(false, true); };
    if (an) an.onclick = function () { save(true, true); };
    if (bk) bk.onclick = function () { paint(); };
  }
  $('abSave').onclick = function () { save(false, false); };
  var asNew = $('abAsNew'); if (asNew) asNew.onclick = function () { save(true, false); };
  $('abCancel').onclick = function () { ui.armorDraft = null; renderSheetPage(); };
}
