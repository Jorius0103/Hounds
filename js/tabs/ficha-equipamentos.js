/* =====================================================================
   Hounds — Ficha › Equipamentos, Corpo e Mochilas
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* Data (see types/dados.d.ts):
   sheet.equip  = [{ id, kind, refId?, name, qty, weight, cost, notes }]
     Everything the character owns, in the player's order; Corpo and Mochilas point to a line by its
     id. kind 'item' | 'armor' | 'weapon'; refId: the entry of Regras › Itens, Armaduras or Armas it
     was picked from. qty 0 keeps the line (what ran out and is to be bought again); weight (lbs) and
     cost ($) are of one. The list alone is not carried weight.
   sheet.bodies = [{ id, name, active, slots: [{ part, equipId, qty }] }]
     Body configurations ("Armadura de combate", "Viagem"): the armors worn on each part of the body
     (GEAR_PARTS; several on a part are layers), and the weapons and items carried, outside the parts
     (part GEAR_CARRY). At most one is active: the one the character is using.
   sheet.packs  = [{ id, name, inUse, equipId, items: [{ equipId, qty }] }] (at most one in use)
     Packs: what each holds, and equipId, the line that is the pack itself (its own weight; null:
     none). Any number of them can be in use.
   sheet.homes  = [{ id, name, items: [{ equipId, qty }] }]
     Casa: where the character keeps what is not carried. As the packs, without the pack itself and
     without in use: never in the load. A unit is in a pack or in a house: all of them together hold
     at most what the list has.
   The load (gearLoad) is the active configuration plus the packs in use, each line counted at most
   as many times as the character has it. Its level against Basic Lift (Basic Set, p. B17) shows
   here, and it is Atributos › Peso (sheetEncLevel): what is carried changes Move and Dodge. */
// [up to how many times Basic Lift, name] of the levels 0 to 4; more than 10 × BL: no moving.
var EQ_LEVELS = /** @type {[number, string][]} */ ([[1, 'Nenhuma'], [2, 'Leve'], [3, 'Média'], [6, 'Pesada'], [10, 'Muito Pesada']]);
var EQ_KIND_LABEL = { item: 'Item', armor: 'Armadura', weapon: 'Arma' };
// The catalog the Equipamento field searches for each kind.
var EQ_KIND_COL = { item: 'items', armor: 'armors', weapon: 'weapons' };
// The parts of the body where armor is worn, head to feet (the locations of Criar Armadura: Low-Tech,
// pp. 100-101): [key, name, the book's]. The torso's armor protects the vitals too.
// [key, name shown (in English, as the books), the same in English].
var GEAR_PARTS = [['head', 'Head', 'Head'], ['neck', 'Neck', 'Neck'], ['torso', 'Torso', 'Torso'], ['groin', 'Groin', 'Groin'],
  ['arms', 'Arms', 'Arms'], ['hands', 'Hands', 'Hands'], ['legs', 'Legs', 'Legs'], ['feet', 'Feet', 'Feet']];
var GEAR_PART_KEYS = GEAR_PARTS.map(function (p) { return p[0]; });
// Weapons, shields and items are carried, outside the parts.
var GEAR_CARRY = 'carry';
// The parts of before (hit locations one by one) and the ones they are now; the database migrates the
// same (migration 21).
var GEAR_OLD_PARTS = { eyes: 'head', skull: 'head', face: 'head', right_arm: 'arms', left_arm: 'arms', right_leg: 'legs', left_leg: 'legs' };
function gearPartKey(k) { k = GEAR_OLD_PARTS[k] || k; return GEAR_PART_KEYS.indexOf(k) >= 0 || k === GEAR_CARRY ? k : null; }
// The words of an armor's Local in Regras › Armaduras and the parts they are; "limbs" are the arms and
// legs (p. B398). A word not here ("body", "full suit") is not defined by the catalog: such an armor
// goes on any part, and the player chooses.
var GEAR_LOC_WORDS = { eyes: ['head'], eye: ['head'], skull: ['head'], face: ['head'], head: ['head'], neck: ['neck'], torso: ['torso'], groin: ['groin'],
  arms: ['arms'], arm: ['arms'], hands: ['hands'], hand: ['hands'], legs: ['legs'], leg: ['legs'], feet: ['feet'], foot: ['feet'], limbs: ['arms', 'legs'] };
// A shield or cloak (Shield in the catalog) is carried, as a weapon.
function gearIsShield(e) { var c = e && e.kind === 'armor' && e.refId ? armorById(e.refId) : null; return !!c && c.type === 'Shield'; }

/* ---------- data ---------- */
// Weight and cost take cents; never negative.
function cleanDec(v, hi, dflt) { var n = Number(v); return isFinite(n) && v !== '' && v != null ? Math.min(hi, Math.max(0, Math.round(n * 100) / 100)) : dflt; }
function gearId(v, n) { return typeof v === 'string' ? v.trim().slice(0, n || 60) : ''; }
// A line of the list. i: its position, which names a line saved before the ids existed ('e1',
// 'e2'…, as the database migration does).
function cleanEquip(x, i) {
  x = x || {};
  var o = { id: gearId(x.id) || (typeof i === 'number' ? 'e' + (i + 1) : ''), kind: x.kind === 'armor' || x.kind === 'weapon' ? x.kind : 'item',
    name: String(x.name || '').trim().slice(0, 120), qty: cleanInt(x.qty, 0, 9999, 1), weight: eqRound(cleanDec(x.weight, 99999, 0)),
    cost: cleanDec(x.cost, 9999999, 0), notes: String(x.notes || '').trim().slice(0, 400) };
  var ref = gearId(x.refId, 200); if (ref) o.refId = ref;
  return o;
}
function gearIndex(list) { var by = Object.create(null); list.forEach(function (e) { by[e.id] = e; }); return by; }
// A new id that is not in taken (an index by id).
function gearNewId(prefix, taken) { var id; do { id = prefix + Math.random().toString(36).slice(2, 8); } while (taken[id]); return id; }
// Ids repeated (by hand, or an old copy) get new ones; the links stay with the first.
function gearUniq(list, prefix) { var seen = Object.create(null); list.forEach(function (x) { if (!x.id || seen[x.id]) x.id = gearNewId(prefix, seen); seen[x.id] = true; }); return list; }
// A body configuration with only parts of GEAR_PARTS (or GEAR_CARRY) and lines of the list (by: the
// list by id). Parts of before become the ones of now (gearPartKey); weapons and items are always
// carried. The same line twice on a part is one row: an armor keeps one piece (the largest quantity),
// the rest add up.
function cleanBody(b, i, by) {
  b = b || {};
  var slots = [], at = Object.create(null);
  (Array.isArray(b.slots) ? b.slots : []).forEach(function (sl) {
    var e = sl && by[sl.equipId], part = e ? (e.kind === 'armor' ? gearPartKey(sl.part) : GEAR_CARRY) : null; if (!part) return;
    var k = part + '|' + sl.equipId, q = cleanInt(sl.qty, 1, 9999, 1);
    if (at[k]) at[k].qty = e.kind === 'armor' ? Math.max(at[k].qty, q) : Math.min(9999, at[k].qty + q);
    else slots.push(at[k] = { part: part, equipId: sl.equipId, qty: q });
  });
  return { id: gearId(b.id) || 'b' + (i + 1), name: String(b.name || '').trim().slice(0, 80) || 'Configuração ' + (i + 1), active: b.active === true, slots: slots };
}
// A pack with only lines of the list; the same line twice is one row, with the quantities added.
function cleanPack(p, i, by) {
  p = p || {};
  var items = [], at = Object.create(null);
  (Array.isArray(p.items) ? p.items : []).forEach(function (it) {
    if (!it || !by[it.equipId]) return;
    var q = cleanInt(it.qty, 1, 9999, 1);
    if (at[it.equipId]) at[it.equipId].qty = Math.min(9999, at[it.equipId].qty + q); else items.push(at[it.equipId] = { equipId: it.equipId, qty: q });
  });
  return { id: gearId(p.id) || 'm' + (i + 1), name: String(p.name || '').trim().slice(0, 80) || 'Mochila ' + (i + 1), inUse: p.inUse === true,
    equipId: p.equipId && by[p.equipId] ? p.equipId : null, items: items };
}
// A house: a pack without the pack itself and without in use.
function cleanHome(h, i, by) {
  var p = cleanPack(h, i, by);
  return { id: gearId(h && h.id) || 'c' + (i + 1), name: String((h && h.name) || '').trim().slice(0, 80) || (i ? 'Casa ' + (i + 1) : 'Casa'), items: p.items };
}
// The lists, clean and consistent: links only to lines of the list (a line that left the list takes
// its links along; a piece of an armor set stays in the set, without its line), at most one active
// configuration and one pack in use. pieces: the piece of a set that each line is, by the line's id; weaponLines: the
// weapon of Criar Arma that each line is; shieldLines: the shield of Criar Escudo.
function gearOf(equip, bodies, packs, sets, weapons, shields, homes) {
  var list = gearUniq((Array.isArray(equip) ? equip : []).map(cleanEquip).filter(function (x) { return x.name; }), 'e'), by = gearIndex(list), on = false;
  var bs = gearUniq((Array.isArray(bodies) ? bodies : []).map(function (b, i) { return cleanBody(b, i, by); }), 'b');
  bs.forEach(function (b) { if (b.active && on) b.active = false; if (b.active) on = true; });
  var ps = gearUniq((Array.isArray(packs) ? packs : []).map(function (p, i) { return cleanPack(p, i, by); }), 'm'), pon = false;
  ps.forEach(function (p) { if (p.inUse && pon) p.inUse = false; if (p.inUse) pon = true; });
  var hm = gearUniq((Array.isArray(homes) ? homes : []).map(function (h, i) { return cleanHome(h, i, by); }), 'c');
  var as = gearUniq((Array.isArray(sets) ? sets : []).map(function (a, i) { return cleanArmorSet(a, i, by); }), 'a'), pieces = Object.create(null);
  as.forEach(function (a) { a.pieces.forEach(function (pc) { if (!pc.equipId) return; if (pieces[pc.equipId]) pc.equipId = null; else pieces[pc.equipId] = { set: a, piece: pc }; }); });
  var ws = gearUniq((Array.isArray(weapons) ? weapons : []).map(function (w, i) { return cleanCustomWeapon(w, i, by); }), 'w'), weaponLines = Object.create(null);
  ws.forEach(function (w) { if (!w.equipId) return; if (weaponLines[w.equipId] || pieces[w.equipId]) w.equipId = null; else weaponLines[w.equipId] = w; });
  var hs = gearUniq((Array.isArray(shields) ? shields : []).map(function (w, i) { return cleanCustomShield(w, i, by); }), 'h'), shieldLines = Object.create(null);
  hs.forEach(function (w) { if (!w.equipId) return; if (shieldLines[w.equipId] || weaponLines[w.equipId] || pieces[w.equipId]) w.equipId = null; else shieldLines[w.equipId] = w; });
  return { equip: list, bodies: bs, packs: ps, homes: hm, armorSets: as, pieces: pieces, customWeapons: ws, weaponLines: weaponLines, customShields: hs, shieldLines: shieldLines };
}
// A sheet saved before Corpo and Mochilas: lines without an id, no packs. What was marked Carregado
// goes to a pack in use, "Itens carregados", with the whole quantity (as the database migration does),
// so the load stays what it was.
function gearLegacy(s) { return !!s && Array.isArray(s.equip) && s.equip.length > 0 && (!Array.isArray(s.packs) || s.equip.some(function (x) { return x && !x.id; })); }
function sheetGear(s) {
  var packs = s && s.packs;
  if (!Array.isArray(packs)) {
    var held = [];
    (Array.isArray(s && s.equip) ? s.equip : []).forEach(function (x, i) {
      var e = cleanEquip(x, i);
      if (x && x.carried === true && e.name && e.qty > 0) held.push({ equipId: e.id, qty: e.qty });
    });
    packs = held.length ? [{ id: 'm1', name: 'Itens carregados', inUse: true, equipId: null, items: held }] : [];
  }
  return gearOf(s && s.equip, s && s.bodies, packs, s && s.armorSets, s && s.customWeapons, s && s.customShields, s && s.homes);
}
// The tab's lists as they are on screen: the saved ones, with the one being edited in its place.
function gearNow(s) {
  var ui = S.ui, g = sheetGear(s);
  if (!gearEditing()) return g;
  return gearOf(g.equip, ui.bodyDraft ? ui.bodyDraft.bodies : g.bodies, ui.packDraft ? ui.packDraft.packs : g.packs, g.armorSets, g.customWeapons, g.customShields,
    ui.homeDraft ? ui.homeDraft.homes : g.homes);
}
function gearEditing() { var ui = S.ui; return !!(ui.bodyDraft || ui.packDraft || ui.homeDraft || ui.armorDraft || ui.weaponDraft || ui.shieldDraft || ui.itemDraft); }

/* ---------- the load: one rule for everything that weighs ---------- */
function eqRound(n) { return Math.round(n * 100) / 100; }
// A weight in lbs: one decimal at most, always rounded up (2.25 is 2.3). toFixed takes away the float's
// noise first (2.2 × 10 is 22.000000000000004, which is still 22).
function eqWeight(n) { return Math.ceil(Number(((+n || 0) * 10).toFixed(6))) / 10; }
function addUnits(to, from) { Object.keys(from).forEach(function (id) { to[id] = (to[id] || 0) + from[id]; }); return to; }
// How many of each line a body configuration uses: an armor on several parts is one piece (the
// largest quantity on a part); weapons and items on several parts add up (a knife in the hand and
// another at the belt are two).
function bodyUnits(b, by) {
  var u = Object.create(null);
  b.slots.forEach(function (sl) {
    var e = by[sl.equipId]; if (!e) return;
    u[e.id] = e.kind === 'armor' ? Math.max(u[e.id] || 0, sl.qty) : (u[e.id] || 0) + sl.qty;
  });
  return u;
}
// How many of each line a pack takes: the pack itself and what it holds.
function packUnits(p) {
  var u = Object.create(null);
  if (p.equipId) u[p.equipId] = 1;
  p.items.forEach(function (it) { u[it.equipId] = (u[it.equipId] || 0) + it.qty; });
  return u;
}
function unitsLbs(u, by) { var w = 0; Object.keys(u).forEach(function (id) { if (by[id]) w += u[id] * by[id].weight; }); return eqRound(w); }
// The load: the active configuration and the packs in use (each with its own weight). A line counts
// at most as many times as the character has it, so what is on the body and in a pack in use (or in
// two of them) weighs once. counted: how many of each line count.
function gearLoad(g) {
  var by = gearIndex(g.equip), active = g.bodies.filter(function (b) { return b.active; })[0] || null;
  var bu = active ? bodyUnits(active, by) : Object.create(null), all = addUnits(Object.create(null), bu), inUse = 0;
  var packs = g.packs.map(function (p) {
    var own = p.equipId ? by[p.equipId].weight : 0, content = 0;
    p.items.forEach(function (it) { content += it.qty * by[it.equipId].weight; });
    var x = { pack: p, own: eqRound(own), content: eqRound(content), total: eqRound(own + content) };
    if (p.inUse) { addUnits(all, packUnits(p)); inUse += x.total; }
    return x;
  });
  var total = 0, raw = 0, over = [], counted = Object.create(null), cost = 0, owned = 0;
  Object.keys(all).forEach(function (id) {
    var e = by[id], n = Math.min(e.qty, all[id]);
    counted[id] = n; total += n * e.weight; raw += all[id] * e.weight;
    if (all[id] > e.qty) over.push({ e: e, n: all[id] });
  });
  g.equip.forEach(function (e) { cost += e.qty * e.cost; owned += e.qty * e.weight; });
  return { active: active, body: unitsLbs(bu, by), packs: packs, inUse: eqRound(inUse), total: eqRound(total), once: eqRound(raw - total),
    over: over, counted: counted, cost: eqRound(cost), owned: eqRound(owned) };
}
// What a save would leave wrong (part: only the configurations, only the packs and houses, or all):
// more of a line placed than the character has, in a configuration or in all the packs and houses
// together (packs in use or not: they are where things are), or an armor on a part it does not cover.
// The database checks the same quantities (salvar_ficha).
function gearIssues(g, part) {
  var by = gearIndex(g.equip), out = [];
  if (part !== 'packs') g.bodies.forEach(function (b) {
    var u = bodyUnits(b, by);
    Object.keys(u).forEach(function (id) { if (u[id] > by[id].qty) out.push(by[id].name + ': ' + u[id] + ' na configuração de corpo “' + b.name + '”, mas a lista de equipamentos tem ' + by[id].qty + '.'); });
    b.slots.forEach(function (sl) {
      var e = by[sl.equipId], parts = gearParts(e, g);
      if (parts && parts.indexOf(sl.part) < 0) out.push(e.name + ' não vai em ' + gearPartName(sl.part) + ' (“' + b.name + '”; ' + gearPartsText(e, g) + ').');
    });
  });
  // Each pack and each house on its own: none holds more than the list has, but the same line can be in
  // several of them (they are not added up).
  if (part !== 'bodies') g.packs.map(function (p) { return [p, 'na mochila']; }).concat(g.homes.map(function (h) { return [h, 'na casa']; })).forEach(function (x) {
    var u = packUnits(x[0]);
    Object.keys(u).forEach(function (id) { if (by[id] && u[id] > by[id].qty) out.push(by[id].name + ': ' + u[id] + ' ' + x[1] + ' “' + x[0].name + '”, mas a lista de equipamentos tem ' + by[id].qty + '.'); });
  });
  return out;
}
// 0 to 4; 5 is more than Extra-Heavy.
function equipLevel(weight, lift) {
  for (var i = 0; i < EQ_LEVELS.length; i++) if (weight <= EQ_LEVELS[i][0] * lift) return i;
  return EQ_LEVELS.length;
}
// "1.250,5"
function eqNum(n) { return n.toLocaleString('pt-BR', { maximumFractionDigits: 2 }); }
function eqLbs(n) { return eqNum(eqWeight(n)) + ' lbs'; }
function eqMoney(n) { return '$' + eqNum(n); }

/* ---------- parts and catalogs ---------- */
function gearPartName(k) { if (k === GEAR_CARRY) return 'Armas, escudos e itens'; var p = GEAR_PARTS.filter(function (x) { return x[0] === k; })[0]; return p ? p[1] : k; }
// The parts a line goes on: weapons, items and shields are carried (GEAR_CARRY); a piece of Criar
// Armadura, the part of its location; from the catalog entry, an armor's Local ("torso, groin").
// null: any part (an armor without an entry, with the catalog not loaded yet, or whose Local has a
// word the catalog does not define). g: the lists, for the pieces.
function gearParts(e, g) {
  if (e && (e.kind !== 'armor' || (g && g.shieldLines[e.id]))) return [GEAR_CARRY];
  var pc = g && e && g.pieces[e.id], l = pc ? armorLocById(pc.piece.loc) : null;
  if (pc) return l ? l.parts.slice() : null;
  var a = e && e.kind === 'armor' && e.refId ? armorById(e.refId) : null;
  if (!a) return null;
  if (a.type === 'Shield') return [GEAR_CARRY];
  var words = String(a.location || '').toLowerCase().split(/,|;|\band\b/).map(function (w) { return w.replace(/[^a-z ]/g, '').trim(); }).filter(Boolean), out = [];
  for (var i = 0; i < words.length; i++) {
    var p = Object.prototype.hasOwnProperty.call(GEAR_LOC_WORDS, words[i]) ? GEAR_LOC_WORDS[words[i]] : null;
    if (!p) return null;
    p.forEach(function (k) { if (out.indexOf(k) < 0) out.push(k); });
  }
  return out.length ? out : null;
}
function gearPartsText(e, g) {
  var pc = g && g.pieces[e.id];
  if (pc) return 'peça de ' + armorLocName(pc.piece.loc) + ', de Criar Armadura';
  if (e.kind !== 'armor') return 'armas e itens vão fora das partes'; var a = armorById(e.refId); return a && a.type === 'Shield' ? 'escudo: vai com as armas, fora das partes' : 'no catálogo: ' + (a ? a.location : '—');
}
// The protection of an armor line, for the body: "RD 6" (a piece; "frontal" when only the front), the
// catalog's "RD 4/2* · BD 2". '' when none is known.
function gearArmorDr(e, g) {
  if (!e || e.kind !== 'armor') return '';
  var sh = g && g.shieldLines[e.id];
  if (sh) return ['BD ' + (sh.db || '—'), 'RD ' + (sh.dr || '—')].join(' · ');
  var pc = g && g.pieces[e.id];
  if (pc) return 'RD ' + pc.piece.dr + (pc.piece.cover === 'front' ? ' frontal' : '');
  var c = gearLink(e);
  return c ? armorSummary(c).split(' · ').filter(function (t) { return /^(RD|BD) /.test(t); }).join(' · ') : '';
}
function gearCat(e) {
  if (!e || !e.refId) return null;
  return e.kind === 'armor' ? armorById(e.refId) : e.kind === 'weapon' ? weaponById(e.refId) : itemById(e.refId);
}
function gearCatHref(kind, id) { return kind === 'armor' ? armorHref(id) : kind === 'weapon' ? weaponHref(id) : itemHref(id); }
function gearKindIcon(kind) { return kind === 'armor' ? ICON.armor : kind === 'weapon' ? ICON.weapon : ICON.item; }
// An entry in one line: "RD 4/2* · torso, groin", "sw+1 cut · alcance 1", "Camping and Survival Gear".
function gearCatLine(kind, c) { return !c ? '' : kind === 'armor' ? armorSummary(c) : kind === 'weapon' ? weaponSummary(c) : c.category || ''; }
// The book's weight or cost of one as a number: "10 lbs.", "3/0.1" (weapon/ammo: the weapon's),
// "$1,500", "$2K", "$5 per pint"; "neg." is 0. null without a number ("var.", "–").
function catNum(v) {
  var t = String(v || '').replace(/,/g, ''), m = /(\d+(?:\.\d+)?)\s*(K|M|million)?/i.exec(t);
  if (!m) return /neg/i.test(t) ? 0 : null;
  var k = (m[2] || '').toLowerCase();
  return +m[1] * (k === 'k' ? 1e3 : k ? 1e6 : 1);
}
// The entry a line was picked from, while its name is still the entry's, in English or in Portuguese
// (a note may follow: "Rope (10 yards)").
function gearLink(x) {
  var c = gearCat(x); if (!c) return null;
  var n = norm(x.name), pt = ptName(c);
  return n.indexOf(norm(c.name)) === 0 || (pt && n.indexOf(norm(pt)) === 0) ? c : null;
}
// Where a line is, for the list: "Corpo › Combate (em uso): Tronco, Virilha", "Mochilas › Viagem: 2".
function gearWhere(g, id) {
  var out = [];
  g.bodies.forEach(function (b) {
    var parts = b.slots.filter(function (sl) { return sl.equipId === id; }).map(function (sl) { return gearPartName(sl.part) + (sl.qty > 1 ? ' ×' + sl.qty : ''); });
    if (parts.length) out.push('Corpo › ' + b.name + (b.active ? ' (em uso)' : '') + ': ' + parts.join(', '));
  });
  g.packs.forEach(function (p) {
    var at = 'Mochilas › ' + p.name + (p.inUse ? ' (em uso)' : '');
    if (p.equipId === id) out.push(at + ': a própria mochila');
    p.items.forEach(function (it) { if (it.equipId === id) out.push(at + ': ' + it.qty); });
  });
  g.homes.forEach(function (h) {
    h.items.forEach(function (it) { if (it.equipId === id) out.push('Casa › ' + h.name + ': ' + it.qty); });
  });
  return out;
}
/* ---------- a line in two places at the same time (a warning) ----------
   Places that shouldn't share a line (by its id in Meus Itens, never by name): the body configuration
   in use, the pack in use and every house; two houses shouldn't share one either. The configurations
   and packs not in use are free: the same line can be in several. Nothing is blocked: the sections
   and the lists warn (gearConflictsHtml, gearWarn), and a save that makes a new one says so. */
function gearPlaces(g, bodies, packs, homes) {
  var by = gearIndex(g.equip), out = [];
  var body = (bodies || g.bodies).filter(function (b) { return b.active; })[0], pack = (packs || g.packs).filter(function (x) { return x.inUse; })[0];
  function ids(u) { return Object.keys(u).filter(function (id) { return by[id] && u[id] > 0; }); }
  if (body) out.push({ key: 'b:' + body.id, kind: 'body', label: 'no corpo em uso “' + body.name + '”', ids: ids(bodyUnits(body, by)) });
  if (pack) out.push({ key: 'p:' + pack.id, kind: 'pack', label: 'na mochila em uso “' + pack.name + '”', ids: ids(packUnits(pack)) });
  (homes || g.homes).forEach(function (h) { out.push({ key: 'h:' + h.id, kind: 'home', label: 'na casa “' + h.name + '”', ids: ids(packUnits(h)), home: h }); });
  return out;
}
// The lines in two of those places: [{ key, kinds: [kind, kind], text }].
function gearConflicts(g) {
  var by = gearIndex(g.equip), pl = gearPlaces(g), out = [];
  pl.forEach(function (a, i) {
    pl.slice(i + 1).forEach(function (b) {
      a.ids.filter(function (id) { return b.ids.indexOf(id) >= 0; }).forEach(function (id) {
        out.push({ key: id + '|' + a.key + '|' + b.key, kinds: [a.kind, b.kind], text: by[id].name + ' está ' + a.label + ' e ' + b.label + '.' });
      });
    });
  });
  return out;
}
// Where a place would share each line: { line id: 'na casa “Londres”' }. kind: 'body' (the configuration
// in use), 'pack' (the pack in use) or 'home' (self: the house); bodies, packs, homes: the drafts being
// edited, when they are.
function gearBlocked(g, kind, self, bodies, packs, homes) {
  var out = Object.create(null);
  gearPlaces(g, bodies, packs, homes).forEach(function (pl) {
    if (pl.kind === kind && kind !== 'home') return;
    if (pl.home && pl.home === self) return;
    pl.ids.forEach(function (id) { if (!out[id]) out[id] = pl.label; });
  });
  return out;
}
// The notice of the lines in two places that touch kind's place (on the section).
function gearConflictsHtml(g, kind) {
  var c = gearConflicts(g).filter(function (x) { return x.kinds.indexOf(kind) >= 0; });
  if (!c.length) return '';
  return '<p class="eq-enc">' + svg(ICON.info, 15) + '<span><b>Item em dois lugares:</b> ' + esc(c.map(function (x) { return x.text; }).join(' ')) +
    ' O corpo em uso, a mochila em uso e as casas não deveriam dividir um item.</span></p>';
}
// After a save: a toast with the lines it left in two places that weren't before (nothing is undone).
// before: the conflicts before; after: the lists as saved.
function gearWarn(before, after) {
  var keys = before.map(function (c) { return c.key; }), now2 = gearConflicts(after).filter(function (c) { return keys.indexOf(c.key) < 0; });
  if (now2.length) toast('Atenção: ' + now2.slice(0, 2).map(function (c) { return c.text; }).join(' ') + (now2.length > 2 ? ' E mais ' + (now2.length - 2) + '.' : ''), true);
}
// How many of a line the body configuration in use carries (0: none, or no configuration in use).
function gearOnBody(g, id) {
  var b = g.bodies.filter(function (x) { return x.active; })[0];
  return b ? b.slots.reduce(function (n, sl) { return n + (sl.equipId === id ? sl.qty : 0); }, 0) : 0;
}
// The mark of a pack's line that is also on the body in use: it is counted in the load once, up to
// the list's quantity, so the same unit is not in two places.
function gearOnBodyBadge(g, e) {
  var n = gearOnBody(g, e.id); if (!n) return '';
  var b = g.bodies.filter(function (x) { return x.active; })[0];
  return '<span class="gear-badge warn" title="' + esc('Também está em Corpo › ' + b.name + ' (em uso)' + (n > 1 ? ': ' + n : '') + '. Na carga conta uma vez só, até a quantidade de Meus Itens (' + e.qty + ').') + '">no corpo em uso</span>';
}
// The Nome of Criar Armadura, Arma and Escudo: the name of the line in Meus Itens, before the
// Descrição. Blank: the automatic name (auto, shown as the placeholder), as without the field.
function gearNameFieldHtml(id, value, auto) {
  return '<label class="sc-f"><span>Nome</span><input type="text" id="' + id + '" maxlength="120" autocomplete="off" placeholder="' + esc(gearAutoHint(auto)) + '" value="' + esc(value || '') + '"></label>';
}
function gearAutoHint(auto) { return auto ? 'Opcional · sem nome: ' + auto : 'Opcional'; }
function gearOwnName(v) { return String(v || '').trim().slice(0, 120); }
// The name a builder shows when editing: the line's, when it is not the automatic one (it was given).
function gearGivenName(line, auto) { return line && line.name !== auto ? line.name : ''; }
// After a given name, on the same line, the model it is ("Reserva — Kite Shield"), so what it is still
// shows: auto is the automatic name (the line has a given one when it differs), model what is shown.
// Not when the name already says it (a piece named before the parts were in English: "Tronco completo — Plate, Medium").
function gearHasModel(x, auto, model) { return !!auto && x.name !== auto && norm(x.name).indexOf(norm(model || auto)) < 0; }
function gearModelHtml(x, auto, model) { return gearHasModel(x, auto, model) ? '<span class="gear-model"> — ' + esc(model || auto) + '</span>' : ''; }
// The same as text, for where a line's name shows outside the tables (Corpo): "Reserva — Kite Shield".
function gearShownName(x, g) {
  var pc = g.pieces[x.id], cw = g.weaponLines[x.id] || g.shieldLines[x.id], c = !pc && !cw ? gearLink(x) : null;
  var auto = pc ? armorPieceName(pc.set, armorLocById(pc.piece.loc), pc.piece.cover) : cw ? cw.base.name : c ? c.name : '';
  var model = pc ? pc.set.base.name : auto;
  return gearHasModel(x, auto, model) ? x.name + ' — ' + model : x.name;
}
function gearKindTag(kind) { return '<span class="eq-kind k-' + kind + '" title="' + EQ_KIND_LABEL[kind] + '">' + svg(gearKindIcon(kind), 12, 2.2) + '</span>'; }

/* ---------- saving ---------- */
// Saves one list (equip, bodies, packs or homes) checked against the others as they are now (someone may
// have changed them meanwhile). Lines that left the list take their links along, in the same save; a
// sheet from before Corpo and Mochilas gets all three at once (ids and the pack of what was carried).
function saveGear(s, part, value) { var ch = {}; ch[part] = value; return saveGearLists(s, ch); }
// ch: the lists that changed ({ equip, armorSets } when a set creates its pieces), saved in one write.
function saveGearLists(s, ch) {
  if (!rawHas('sheets', s.id)) return Promise.reject({ message: 'Essa ficha não existe mais.' });
  var cur = sheetById(s.id) || s, saved = sheetGear(cur);
  function pick(k) { return k in ch ? ch[k] : saved[k]; }
  var g = gearOf(pick('equip'), pick('bodies'), pick('packs'), pick('armorSets'), pick('customWeapons'), pick('customShields'), pick('homes')), keys = Object.keys(ch);
  var issues = gearIssues(g, keys.length === 1 && keys[0] === 'bodies' ? 'bodies' : keys.length === 1 && (keys[0] === 'packs' || keys[0] === 'homes') ? 'packs' : null);
  if (issues.length) return Promise.reject({ message: issues.slice(0, 3).join(' ') + (issues.length > 3 ? ' E mais ' + (issues.length - 3) + '.' : '') });
  var p = { updatedAt: now() }, legacy = gearLegacy(cur);
  keys.forEach(function (k) { p[k] = g[k]; });
  if (legacy) p.equip = g.equip;
  ['bodies', 'packs', 'homes', 'armorSets', 'customWeapons', 'customShields'].forEach(function (k) { if (legacy || JSON.stringify(g[k]) !== JSON.stringify(saved[k])) p[k] = g[k]; });
  // The list's weights are rounded on cleaning (eqWeight): the pieces, weapons and shields made go with
  // it, rounded the same way, so the database finds their line's weight equal to theirs.
  if (p.equip) ['armorSets', 'customWeapons', 'customShields'].forEach(function (k) { p[k] = g[k]; });
  return W.store.patch('sheets', s.id, p);
}
Ops.saveSheetEquip = function (s, list) { return saveGear(s, 'equip', list); };
// A line of Meus Itens out; the body and the packs lose it too.
Ops.deleteSheetItem = function (s, id) { return saveGear(s, 'equip', sheetGear(sheetById(s.id) || s).equip.filter(function (x) { return x.id !== id; })); };
Ops.saveSheetBodies = function (s, bodies) { return saveGear(s, 'bodies', bodies); };
Ops.saveSheetPacks = function (s, packs) { return saveGear(s, 'packs', packs); };
Ops.saveSheetHomes = function (s, homes) { return saveGear(s, 'homes', homes); };

/* ---------- view: the tab ---------- */
// The catalogs this tab uses: Armaduras always (which parts an armor covers); Itens and Armas when the
// list has lines from them or the list is being edited. They arrive once and the page redraws.
function gearLoadCatalogs(g) {
  loadCatalog('armors');
  ['items', 'weapons'].forEach(function (col) {
    if (g.equip.some(function (e) { return e.refId && EQ_KIND_COL[e.kind] === col; })) loadCatalog(col);
  });
}
function sheetGearHtml(s) {
  var ui = S.ui, can = canWrite(), g = gearNow(s), saved = sheetGear(s), L = gearLoad(g), a = sheetAttrsNow(s);
  gearLoadCatalogs(saved);
  // Criar (Armadura, Arma, Escudo, Item) first and the load last, always; between them the list
  // (Meus Itens), the body, the packs and the house, in the order chosen (sortSecsHtml).
  return '<div class="gear-tab">' + sheetCreateHtml(s, saved) + sortSecsHtml('gearSecs', GEAR_ORDER_KEY, {
    equip: function () { return sheetInvHtml(g, L, can && !gearEditing()); },
    body: function () { return sheetBodyHtml(g, L, can && !!ui.bodyDraft, can && !!ui.packDraft); },
    packs: function () { return sheetPacksHtml(g, L, can && !!ui.packDraft, can && !!ui.bodyDraft); },
    homes: function () { return sheetHomesHtml(g, can && !!ui.homeDraft); } }) + sheetLoadHtml(L, a) + '</div>';
}
// Meus Itens, Corpo, Mochilas and Casa are dragged into any order among them (wireSecSort); not while
// something of the tab is being edited.
var GEAR_ORDER_KEY = 'hounds_equip_order';
function gearGripHtml(name) { return gearEditing() ? '' : secGripHtml('a seção ' + name); }
// The four Criar: closed, one row of cards (a card opens its builder); one open, only its builder, the
// whole width (the others wait while it is open, as Meus Itens does).
function sheetCreateHtml(s, g) {
  var ui = S.ui, open = canWrite() && (ui.armorDraft ? sheetArmorHtml : ui.weaponDraft ? sheetWeaponHtml : ui.shieldDraft ? sheetShieldHtml : ui.itemDraft ? sheetItemHtml : null);
  if (open) return open(s, g);
  return '<section class="gurps" id="createSec"><div class="gurps-head"><h2 class="sec-title">Criar</h2><span class="hint-text">vai para <b>Meus Itens</b>, onde é editado e excluído</span></div>' +
    '<div class="cr-grid">' + sheetArmorHtml(s, g) + sheetWeaponHtml(s, g) + sheetShieldHtml(s, g) + sheetItemHtml(s) + '</div></section>';
}
// A card of Criar: the button that opens the builder (without the right to change the sheet, or while
// something else is being edited, only what it is).
function gearCreateTile(sec, btn, icon, title, count, hint) {
  var inner = '<span class="cr-ico">' + svg(icon, 20) + '</span><span class="cr-txt"><b>' + esc(title) + (count ? '<em>' + esc(count) + '</em>' : '') + '</b><small>' + esc(hint) + '</small></span>';
  return '<div class="cr-cell" id="' + sec + '">' + (canWrite() && !gearEditing() ?
    '<button class="cr-card" type="button" id="' + btn + '" title="Criar ' + esc(title.toLowerCase()) + '">' + inner + '<span class="cr-plus">' + svg(ICON.plus, 16, 2.4) + '</span></button>' :
    '<div class="cr-card off">' + inner + '</div>') + '</div>';
}
// Meus Itens, Corpo and Mochilas fold: the header stays (title, total, buttons), the rest goes. Which
// are folded is remembered in this browser; one being edited is always open.
var GEAR_FOLD_KEY = 'hounds_equip_folded';
function gearFolded() { try { var v = JSON.parse(lstore(GEAR_FOLD_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
function gearFoldClass(key, editing) { return !editing && gearFolded().indexOf(key) >= 0 ? ' folded' : ''; }
// tag: the title's heading, h2 unless a part of a section (h3, as Combate's).
function gearFoldTitle(key, title, editing, tag) {
  var open = !!editing || gearFolded().indexOf(key) < 0, h = tag || 'h2';
  return '<' + h + ' class="sec-title"><button class="fold-btn" type="button" data-fold="' + key + '" aria-expanded="' + open + '" title="' + (open ? 'Recolher' : 'Mostrar') + '"' + (editing ? ' disabled' : '') + '>' +
    svg('<path d="m6 9 6 6 6-6"/>', 14, 2.4) + title + '</button></' + h + '>';
}
function wireGearFold() {
  // Only its own buttons: Combate's editor and the pages' <details> use data-fold too.
  document.querySelectorAll('button.fold-btn[data-fold]').forEach(function (b) {
    b.addEventListener('click', function () {
      var k = b.getAttribute('data-fold') || '', list = gearFolded(), i = list.indexOf(k), open = i >= 0, sec = b.closest('section');
      if (open) list.splice(i, 1); else list.push(k);
      lstore(GEAR_FOLD_KEY, JSON.stringify(list));
      if (sec) sec.classList.toggle('folded', !open);
      b.setAttribute('aria-expanded', String(open)); b.setAttribute('title', open ? 'Recolher' : 'Mostrar');
    });
  });
}
function gearStat(label, val, note) { return '<div class="gstat"><span>' + label + '</span><strong>' + val + '</strong>' + (note ? '<small>' + note + '</small>' : '') + '</div>'; }
function gearLoadStatsHtml(L, a) {
  var lift = gurpsStats(a).lift, lv = equipLevel(L.total, lift), over = lv >= EQ_LEVELS.length, on = L.packs.filter(function (x) { return x.pack.inUse; })[0];
  function times(n) { return n === 1 ? 'Carga Básica' : n + ' × Carga Básica'; }
  return gearStat('Corpo em uso', L.active ? esc(eqLbs(L.body)) : '—', L.active ? esc(L.active.name) : 'nenhuma configuração em uso') +
    gearStat('Mochila em uso', on ? esc(eqLbs(L.inUse)) : '—', on ? esc(on.pack.name) : L.packs.length ? 'nenhuma em uso' : 'nenhuma mochila') +
    gearStat('Peso carregado', esc(eqLbs(L.total)), L.once ? esc(eqLbs(L.once)) + ' contados uma vez só' : 'corpo + mochila em uso') +
    gearStat('Nível de carga', over ? 'Acima do limite' : esc(EQ_LEVELS[lv][1]) + ' (' + lv + ')',
      over ? 'mais de ' + esc(eqLbs(10 * lift)) + ' (' + times(10) + '): não consegue se mover' : 'até ' + esc(eqLbs(EQ_LEVELS[lv][0] * lift)) + ' (' + times(EQ_LEVELS[lv][0]) + ')');
}
// A line on the body and in packs in use beyond what the list has: it weighs only what the list has.
function gearOverHtml(L) {
  if (!L.over.length) return '';
  return '<p class="eq-enc">' + svg(ICON.info, 15) + '<span>' + L.over.map(function (o) {
    return '<b>' + esc(o.e.name) + '</b>: ' + o.n + ' entre o corpo e as mochilas em uso, mas a lista tem ' + o.e.qty;
  }).join('; ') + '. O peso conta só o que a lista tem.</span></p>';
}
function sheetLoadHtml(L, a) {
  return '<section class="gurps" id="gearLoad"><div class="gurps-head"><h2 class="sec-title">Carga</h2><span class="gurps-total" id="gearTotal" title="Peso carregado">' + esc(eqLbs(L.total)) + '</span></div>' +
    '<div class="gurps-derived" id="gearStats">' + gearLoadStatsHtml(L, a) + '</div><div class="gear-notes" id="gearNotes">' + gearOverHtml(L) + '</div>' +
    '<p class="hint-text" style="margin:0">A carga é o peso da configuração de <b>Corpo</b> em uso mais o das <b>Mochilas</b> em uso, com o peso próprio de cada mochila. <b>Meus Itens</b> é tudo o que o personagem tem e não entra sozinho na carga. ' +
    'O nível vem da carga comparada com a Carga Básica: até 1× nenhuma, 2× leve, 3× média, 6× pesada e 10× muito pesada (Basic Set, p. B17). ' +
    'Ele é o Peso em Atributos, sozinho: cada nível tira 1 do Deslocamento e da Esquiva (com a configuração e a mochila em uso salvas).</p></section>';
}
// While a list is edited, the load and the totals follow what is typed (the rest redraws on save).
function paintGear(s) {
  var g = gearNow(s), L = gearLoad(g), a = sheetAttrsNow(s);
  $('gearTotal').textContent = eqLbs(L.total);
  $('gearStats').innerHTML = gearLoadStatsHtml(L, a);
  $('gearNotes').innerHTML = gearOverHtml(L);
  $('eqTotal').textContent = eqLbs(L.owned);
  $('bodyTotal').textContent = L.active ? eqLbs(L.body) : '—';
  $('packTotal').textContent = eqLbs(L.inUse);
  return { g: g, L: L };
}

/* ---------- view: Equipamentos (the list) ---------- */
// The Descrição column of the gear tables: the text cut short, the whole of it on hover; — without one.
function gearDescCell(text, rowspan) {
  var t = String(text || '').replace(/\s+/g, ' ').trim();
  return '<td class="ab-desc"' + (rowspan > 1 ? ' rowspan="' + rowspan + '"' : '') + (t.length > 140 ? ' title="' + esc(t) + '"' : '') + '>' + (t ? esc(clip(t, 140)) : '<span class="eq-none">—</span>') + '</td>';
}
function eqEach(x, total, one, fmt) { return total ? esc(fmt(total)) + (x.qty > 1 ? '<small>' + esc(fmt(one)) + ' cada</small>' : '') : '<span class="eq-none">—</span>'; }
// can: the line's actions, Editar (Criar Item's form) and Excluir (asking first, under the row).
function invRowHtml(x, g, L, can) {
  var c = gearLink(x), where = gearWhere(g, x.id), counted = L.counted[x.id] || 0, pc = g.pieces[x.id];
  var sub = [pc ? 'Criar Armadura: ' + armorLocName(pc.piece.loc) + ' · ' + gearArmorDr(x, g) : c ? gearCatLine(x.kind, c) : '', x.qty === 0 ? 'acabou' : ''].filter(Boolean).join(' · ');
  var name = (c ? '<a href="' + gearCatHref(x.kind, c.id) + '" data-' + (x.kind === 'armor' ? 'armor' : x.kind === 'weapon' ? 'weapon' : 'item') + '-modal="' + esc(c.id) + '" title="Ver em Regras › ' + (x.kind === 'armor' ? 'Armaduras' : x.kind === 'weapon' ? 'Armas' : 'Itens') + '">' + esc(x.name) + '</a>' : esc(x.name)) +
    (c ? gearModelHtml(x, c.name) : '');
  var load = counted ? (counted < x.qty ? counted + ' de ' + x.qty + ' na carga' : 'na carga') : 'fora da carga';
  // The notes show under the name (the table is half the width: no column of its own).
  return '<tr' + (counted ? '' : ' class="eq-stored"') + '><td><b>' + gearKindTag(x.kind) + name + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') +
    '<small class="eq-where">' + esc(where.length ? where.join(' · ') + ' · ' + load : 'Só na lista · fora da carga') + '</small>' +
    (x.notes ? '<small class="eq-note">' + esc(x.notes) + '</small>' : '') + '</td>' +
    '<td class="eq-qty">' + x.qty + '</td><td>' + eqEach(x, eqRound(x.qty * x.weight), x.weight, eqLbs) + '</td>' +
    // The catalog's description (a custom item has none).
    gearDescCell(c && c.description) +
    (can ? '<td class="ab-acts"><button class="icon-btn" type="button" data-it-edit="' + esc(x.id) + '" aria-label="Editar ' + esc(x.name) + '" title="Editar">' + svg(ICON.edit, 15) + '</button>' +
      '<button class="icon-btn" type="button" data-it-del="' + esc(x.id) + '" aria-label="Excluir ' + esc(x.name) + '" title="Excluir">' + svg(ICON.trash, 15) + '</button></td>' : '') + '</tr>' +
    (can && S.ui.itemDel === x.id ? '<tr><td colspan="5"><div class="confirm" role="alert"><span>Excluir <b>' + esc(x.name) + '</b> de Meus Itens?' +
      (where.length ? ' Está em ' + esc(where.join(' · ')) + ': sai de lá também.' : '') + '</span><div class="btn-row"><button class="btn danger solid" type="button" data-it-delyes="' + esc(x.id) + '">Excluir</button>' +
      '<button class="btn ghost" type="button" data-it-delno="1">Cancelar</button></div></div></td></tr>' : '');
}
// The table of the items (not made in Criar Armadura, Arma or Escudo): Equipamento | Qtd. | Peso | Descrição.
function gearItemTableHtml(list, g, L, can) {
  return '<table class="gtab eq-tab"><thead><tr><th>Equipamento</th><th>Qtd.</th><th>Peso</th><th class="ab-desc-h">Descrição</th>' + (can ? '<th></th>' : '') + '</tr></thead><tbody>' +
    list.map(function (x) { return invRowHtml(x, g, L, can); }).join('') + '</tbody></table>';
}
// can: the actions of the lines (not while something else is being edited).
function sheetInvHtml(g, L, can) {
  var head = '<div class="gurps-head">' + gearGripHtml('Meus Itens') + gearFoldTitle('equip', 'Meus Itens', false) + '<span class="gurps-total" id="eqTotal" title="Peso de tudo o que o personagem tem (não é a carga)">' + esc(eqLbs(L.owned)) + '</span></div>';
  if (!g.equip.length) return '<section class="gurps' + gearFoldClass('equip', false) + '" id="equip">' + head + '<p class="long none">Nenhum equipamento.' + (canWrite() ? ' Use os cartões de <b>Criar</b> acima.' : '') + '</p></section>';
  // The pieces of Criar Armadura, the weapons and the shields in their own tables; the rest below, in
  // two tables side by side (half each; one under the other on a narrow screen); the total of everything last.
  // Each table in alphabetical order (the list itself keeps its order).
  var armors = g.equip.filter(function (x) { return g.pieces[x.id]; }).sort(byName), weapons = g.equip.filter(function (x) { return g.weaponLines[x.id]; }).sort(byName);
  var shields = g.equip.filter(function (x) { return g.shieldLines[x.id]; }).sort(byName);
  var rest = g.equip.filter(function (x) { return !g.pieces[x.id] && !g.weaponLines[x.id] && !g.shieldLines[x.id]; }).sort(byName);
  var half = Math.ceil(rest.length / 2);
  function tab(list) { return gearItemTableHtml(list, g, L, can); }
  return '<section class="gurps' + gearFoldClass('equip', false) + '" id="equip">' + head +
    (armors.length ? armorItemsHtml(armors, g, L, can) : '') +
    (weapons.length ? weaponItemsHtml(weapons, g, L, can) : '') +
    (shields.length ? shieldItemsHtml(shields, g, L, can) : '') +
    (rest.length ? '<div class="eq-split">' + tab(rest.slice(0, half)) + (rest.length > 1 ? tab(rest.slice(half)) : '') + '</div>' : '') +
    '<div class="eq-grand"><span>Total de tudo</span><b>' + esc(eqLbs(L.owned)) + '</b><small>na carga: ' + esc(eqLbs(L.total)) + '</small></div></section>';
}
/* ---------- view: Corpo ---------- */
// A builder just opened by Editar (or Outra igual) on a row of Meus Itens, far below it: the screen goes to
// it and the cursor to its first field.
function gearFocusBuilder(id) {
  var sec = $(id); if (!sec) return;
  sec.scrollIntoView({ block: 'start', behavior: 'smooth' });
  var f = sec.querySelector('input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea');
  if (f instanceof HTMLElement) f.focus({ preventScroll: true });
}
function gearChip(e, qty, g) {
  var sub = gearArmorDr(e, g);
  return '<span class="gear-chip k-' + e.kind + '">' + gearKindTag(e.kind) + (qty > 1 ? qty + ' × ' : '') + esc(g ? gearShownName(e, g) : e.name) + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span>';
}
function sheetBodyHtml(g, L, editing, busy) {
  var ui = S.ui, can = canWrite(), quick = can && !gearEditing(), by = gearIndex(g.equip);
  var head = '<div class="gurps-head">' + gearGripHtml('Corpo') + gearFoldTitle('body', 'Corpo', editing) + '<span class="gurps-total" id="bodyTotal" title="Peso da configuração em uso">' + (L.active ? esc(eqLbs(L.body)) : '—') + '</span>' +
    (editing ? secSaveBtnsHtml('bodyCancel', 'bodySave', 'corpo')
      : can && !busy && !gearEditing() ? secEditBtnHtml('bodyEdit', 'corpo') : '') + '</div>';
  if (editing) return '<section class="gurps' + gearFoldClass('body', editing) + '" id="gearBody">' + head + bodyEditHtml(g) + '</section>';
  if (!g.bodies.length) return '<section class="gurps' + gearFoldClass('body', editing) + '" id="gearBody">' + head + '<p class="long none">Nenhuma configuração de corpo.' + (can ? ' Use <b>Editar</b> para criar uma (ex.: Armadura de combate, Viagem), pôr as armaduras nas partes do corpo e levar armas e itens.' : '') + '</p></section>';
  var b = g.bodies.filter(function (x) { return x.id === ui.bodySel; })[0] || L.active || g.bodies[0];
  var tabs = '<div class="seg gear-confs" role="tablist" aria-label="Configurações de corpo">' + g.bodies.map(function (x) {
    var on = x === b;
    return '<button type="button" role="tab" data-bview="' + esc(x.id) + '" aria-selected="' + on + '" class="' + (on ? 'on' : '') + '">' + esc(x.name) +
      (x.active ? '<span class="gear-badge on">em uso</span>' : '') + '</button>';
  }).join('') + '</div>';
  var bar = '<div class="gear-bar' + (b.active ? ' on' : '') + '"><span>' + (b.active ? svg(ICON.info, 14) + '<b>Em uso</b>: entra na carga.' : '<b>Fora de uso</b>: não entra na carga.') + '</span>' +
    (quick ? (b.active ? '<button class="btn ghost" type="button" data-buse="">Parar de usar</button>' : '<button class="btn" type="button" data-buse="' + esc(b.id) + '">Usar esta configuração</button>') : '') + '</div>';
  // The parts in a table (bodyPartsHtml), then what is carried (bodyCarryTableHtml), then the weight of it all.
  return '<section class="gurps' + gearFoldClass('body', editing) + '" id="gearBody">' + head + tabs + bar + gearConflictsHtml(g, 'body') +
    '<div class="gear-body">' + bodyPartsHtml(b, by, g) + bodyCarryTableHtml(b, by, g, L) +
    '<div class="gb-weight"><span>Peso do corpo</span><b>' + esc(eqLbs(unitsLbs(bodyUnits(b, by), by))) + '</b></div></div></section>';
}
// What b carries outside the parts, with the tables of Meus Itens (smaller): the weapons of Criar Arma
// (Modo, Dano, NH, Alcance, Peso, Ajustes, Descrição), the shields of Criar Escudo (BD, RD, PV, NH,
// Peso, Ajustes, Descrição) and the rest, items and catalog weapons and shields (Qtd., Peso, Descrição).
// No actions: they are in Meus Itens.
function bodyCarryTableHtml(b, by, g, L) {
  var lines = b.slots.filter(function (sl) { return sl.part === GEAR_CARRY && by[sl.equipId]; }).map(function (sl) { return by[sl.equipId]; }).sort(byName);
  var weapons = lines.filter(function (e) { return g.weaponLines[e.id]; }), shields = lines.filter(function (e) { return g.shieldLines[e.id]; });
  var rest = lines.filter(function (e) { return !g.weaponLines[e.id] && !g.shieldLines[e.id]; });
  return '<div class="gb-carry-box">' +
    (lines.length ? '<div class="gb-small">' + (weapons.length ? weaponItemsHtml(weapons, g, L, false) : '') + (shields.length ? shieldItemsHtml(shields, g, L, false) : '') +
      // The items in two tables side by side, as in Meus Itens.
      (rest.length ? '<div class="eq-split">' + gearItemTableHtml(rest.slice(0, Math.ceil(rest.length / 2)), g, L, false) +
        (rest.length > 1 ? gearItemTableHtml(rest.slice(Math.ceil(rest.length / 2)), g, L, false) : '') + '</div>' : '') + '</div>' : '<p class="gb-none" style="margin:0">Nenhuma arma, escudo ou item fora das partes.</p>') + '</div>';
}
// The parts of b as a table, one row per armor worn: Parte do corpo | Acerto (3d) | RD | Armadura | Descrição. The RD
// as worn ("4*", "6 frontal"; a catalog armor's "4/2* · BD 2"); the description, the adjustments of Criar
// Armadura ("Fortified, RD +1") and the line's notes. A part without armor: one faded row. Layers: the
// part's cell spans its armors; the RDs are listed and not added, the project has no layering rule
// configured (Basic Set, p. B286).
// The rolls of 3d that hit each part (Basic Set, p. B552, Hit Location Table): Skull 3-4 and Face 5 are
// the head; 6-7 and 13-14 the legs; 8 and 12 the arms; 9-10 the torso (vitals included); 11 the groin.
var GEAR_PART_ROLLS = { head: '3, 4, 5', neck: '17, 18', torso: '9, 10', groin: '11', arms: '8, 12', hands: '15', legs: '6, 7, 13, 14', feet: '16' };
function bodyPartsHtml(b, by, g) {
  var rows = GEAR_PARTS.map(function (p) {
    var here = b.slots.filter(function (sl) { return sl.part === p[0] && by[sl.equipId]; }), n = here.length;
    var part = '<td class="gb-pname"' + (n > 1 ? ' rowspan="' + n + '"' : '') + '><b>' + p[1] + '</b>' +
      (n > 1 ? '<span class="gb-layers" title="Camadas: sem regra de sobreposição configurada, as RDs não são somadas">' + n + ' camadas</span>' : '') + '</td>' +
      '<td class="gb-roll"' + (n > 1 ? ' rowspan="' + n + '"' : '') + ' title="Rolagem de 3d da localização (Basic Set, p. B552)">' + esc(GEAR_PART_ROLLS[p[0]] || '—') + '</td>';
    if (!n) return '<tr class="gb-empty" data-part="' + p[0] + '">' + part + '<td class="gb-dr-cell"><span class="eq-none">—</span></td><td colspan="2"><span class="gb-none">Sem armadura</span></td></tr>';
    return here.map(function (sl, i) {
      var e = by[sl.equipId], pc = g.pieces[e.id], adj = pc && pc.set.mods.length ? pc.set.mods.map(armorAdjText).join('; ') : '';
      var dr = gearArmorDr(e, g).replace(/^RD /, ''), desc = [adj, e.notes].filter(Boolean).join(' · ');
      return '<tr data-part="' + p[0] + '">' + (i ? '' : part) +
        '<td class="gval gb-dr-cell">' + esc(dr || '—') + '</td>' +
        '<td class="gb-aname"><span class="gb-aname-in">' + gearKindTag(e.kind) + '<span>' + (sl.qty > 1 ? sl.qty + ' × ' : '') + esc(gearShownName(e, g)) + '</span></span></td>' +
        '<td class="ab-desc">' + (desc ? esc(desc) : '<span class="eq-none">—</span>') + '</td></tr>';
    }).join('');
  }).join('');
  return '<div class="wtab-wrap"><table class="gtab gb-tab"><thead><tr><th>Parte do corpo</th><th class="gb-roll-h" title="Rolagem de 3d da localização (Basic Set, p. B552)">Acerto (3d)</th><th class="gb-dr-h">RD</th><th class="gb-aname-h">Armadura</th><th class="ab-desc-h">Descrição</th></tr></thead>' +
    '<tbody>' + rows + '</tbody></table></div>';
}
// The armors of Meus Itens that can go on a part of b, as options: only the pieces of Criar Armadura
// made for that part. A part takes several (layers); what is on it already is not offered again.
function bodyOptionsHtml(g, b, part) {
  var here = b.slots.filter(function (sl) { return sl.part === part; }).map(function (sl) { return sl.equipId; });
  var also = b.active ? gearBlocked(g, 'body') : {};
  return g.equip.filter(function (e) {
    if (e.kind !== 'armor' || !g.pieces[e.id] || here.indexOf(e.id) >= 0) return false;
    var parts = gearParts(e, g);
    return !parts || parts.indexOf(part) >= 0;
  }).map(function (e) {
    return '<option value="' + esc(e.id) + '"' + (e.qty > 0 ? '' : ' disabled') + '>' + esc(gearShownName(e, g)) + (e.qty > 0 ? '' : ' (acabou)') + (also[e.id] ? ' · ⚠ já está ' + esc(also[e.id]) : '') + '</option>';
  }).join('');
}
function bodyAddHtml(g, b, part, partName) {
  var opts = bodyOptionsHtml(g, b, part);
  return '<select data-addpart="' + part + '" aria-label="Adicionar armadura em ' + partName + '"' + (opts ? '' : ' disabled title="Nenhuma armadura criada para esta parte (use Criar Armadura)"') + '>' +
    '<option value="">+ Armadura…</option>' + opts + '</select>';
}
// What can be carried (kind 'weapon': the weapons; 'shield': the shields, of the catalog and of Criar
// Escudo; 'item': the items), not carried yet
// in b, with the units left.
function bodyCarryOptions(g, b, kind) {
  var by = gearIndex(g.equip), used = bodyUnits(b, by), here = b.slots.filter(function (sl) { return sl.part === GEAR_CARRY; }).map(function (sl) { return sl.equipId; });
  return g.equip.filter(function (e) {
    if (here.indexOf(e.id) >= 0) return false;
    var shield = gearIsShield(e) || !!g.shieldLines[e.id];
    return kind === 'shield' ? shield : kind === 'weapon' ? e.kind === 'weapon' : e.kind === 'item';
  }).map(function (e) { return { e: e, left: e.qty - (used[e.id] || 0), also: b.active ? gearBlocked(g, 'body')[e.id] || '' : '' }; });
}
function bodySlotHtml(e, x, partName, g) {
  return '<div class="gear-slot">' + gearChip(e, 1, g) +
    (e.qty > 1 ? '<input type="number" data-f="sqty" data-j="' + x.j + '" min="1" max="9999" step="1" inputmode="numeric" aria-label="Quantidade de ' + esc(e.name) + ' em ' + partName + '" value="' + x.sl.qty + '">' : '') +
    '<button class="icon-btn" type="button" data-sdel="' + x.j + '" aria-label="Tirar ' + esc(e.name) + ' de ' + partName + '" title="Tirar">' + svg(ICON.x, 14, 2.4) + '</button></div>';
}
// The weapons and items carried, outside the parts: the buttons Adicionar arma and Adicionar item open
// the list of what Meus Itens has of each (d.addKind).
function bodyCarryHtml(g, b, d, by) {
  var slots = b.slots.map(function (sl, j) { return { sl: sl, j: j }; }).filter(function (x) { return x.sl.part === GEAR_CARRY && by[x.sl.equipId]; });
  var pick = d.addKind ? bodyCarryOptions(g, b, d.addKind) : null;
  return '<div class="box sk-edit gear-carry-edit"><h3 class="sec-title" style="margin:0">Armas, escudos e itens · fora das partes</h3>' +
    (slots.length ? '<div class="gear-slots">' + slots.map(function (x) { return bodySlotHtml(by[x.sl.equipId], x, 'Armas, escudos e itens', g); }).join('') + '</div>' : '<p class="hint-text" style="margin:0">Nenhuma arma, escudo ou item.</p>') +
    '<div class="btn-row">' + [['weapon', ICON.weapon, 'Adicionar arma'], ['shield', ICON.armor, 'Adicionar escudo'], ['item', ICON.item, 'Adicionar item']].map(function (k) {
      return '<button class="btn' + (d.addKind === k[0] ? ' on' : '') + '" type="button" data-carry-kind="' + k[0] + '" aria-expanded="' + (d.addKind === k[0]) + '">' + svg(k[1], 15) + k[2] + '</button>';
    }).join('') + '</div>' +
    (pick ? '<div class="gear-pick">' + (pick.length ? pick.map(function (o) {
      return '<button class="gear-chip k-' + o.e.kind + '" type="button" data-carry-add="' + esc(o.e.id) + '"' + (o.left > 0 ? '' : ' disabled title="' + (o.e.qty ? 'Todas já estão no corpo' : 'Acabou') + '"') + '>' +
        gearKindTag(o.e.kind) + esc(gearShownName(o.e, g)) + '<small>' + esc(eqLbs(o.e.weight)) + (o.e.qty > 1 ? ' · ' + o.left + ' de ' + o.e.qty : '') + (o.also ? ' · ⚠ já está ' + esc(o.also) : '') + '</small></button>';
    }).join('') : '<p class="hint-text" style="margin:0">' + ({ weapon: 'Nenhuma arma em Meus Itens (use Criar Arma).', shield: 'Nenhum escudo em Meus Itens (use Criar Escudo).', item: 'Nenhum item em Meus Itens (use Criar Item).' })[d.addKind] + '</p>') + '</div>' : '') +
    '</div>';
}
function bodyEditHtml(g) {
  var d = S.ui.bodyDraft, by = gearIndex(g.equip), b = d.bodies.filter(function (x) { return x.id === d.sel; })[0] || d.bodies[0];
  var noneOn = !d.bodies.some(function (x) { return x.active; });
  var confs = d.bodies.map(function (x, i) {
    var on = x === b;
    return '<div class="gear-conf-row" data-b="' + i + '">' +
      '<label class="gear-use" title="A configuração em uso entra na carga; só uma por vez"><input type="radio" name="bodyActive" data-f="active" value="' + i + '"' + (x.active ? ' checked' : '') + '><span>Em uso</span></label>' +
      '<input type="text" data-f="bname" maxlength="80" placeholder="Ex.: Armadura de combate" aria-label="Nome da configuração" value="' + esc(x.name) + '">' +
      '<span class="gear-w" data-btot="' + i + '">' + esc(eqLbs(unitsLbs(bodyUnits(x, by), by))) + '</span>' +
      '<button class="btn' + (on ? ' on' : '') + '" type="button" data-bsel="' + i + '"' + (on ? ' aria-pressed="true"' : '') + '>' + (on ? 'Partes abaixo' : 'Editar partes') + '</button>' +
      '<button class="icon-btn" type="button" data-bdel="' + i + '" aria-label="Excluir a configuração" title="Excluir">' + svg(ICON.trash, 15) + '</button></div>';
  }).join('');
  var parts = b ? GEAR_PARTS.map(function (p) {
    // j: the row in the draft. A line that left the list meanwhile is not shown (and goes on save).
    var slots = b.slots.map(function (sl, j) { return { sl: sl, j: j }; }).filter(function (x) { return x.sl.part === p[0] && by[x.sl.equipId]; });
    return '<div class="gear-part"><div class="gear-part-name"><b>' + p[1] + '</b></div><div class="gear-slots">' +
      slots.map(function (x) { return bodySlotHtml(by[x.sl.equipId], x, p[1], g); }).join('') +
      bodyAddHtml(g, b, p[0], p[1]) + '</div></div>';
  }).join('') : '';
  return '<div class="box sk-edit"><h3 class="sec-title" style="margin:0">Configurações</h3>' +
    (confs ? '<div class="gear-confs-edit">' + confs + '</div>' : '<p class="hint-text" style="margin:0">Nenhuma ainda.</p>') +
    '<div class="btn-row">' + (d.bodies.length ? '<label class="gear-use"><input type="radio" name="bodyActive" data-f="active" value="-1"' + (noneOn ? ' checked' : '') + '><span>Nenhuma em uso</span></label>' : '') +
    '<button class="btn" type="button" id="bodyAdd">' + svg(ICON.plus, 15, 2.4) + 'Nova configuração</button></div>' +
    '<p class="hint-text" style="margin:0">Só a configuração marcada <b>Em uso</b> entra na carga; as outras ficam guardadas para trocar depois e podem ter os mesmos itens. ' +
    'A configuração em uso não deveria dividir um item com a mochila em uso nem com as casas: a lista avisa (⚠), mas não impede.</p></div>' +
    (b ? '<div class="box sk-edit"><h3 class="sec-title" style="margin:0">Partes do corpo · ' + esc(b.name) + '</h3><div class="gear-parts">' + parts + '</div>' +
      '<p class="hint-text" style="margin:0">Nas partes do corpo vão só armaduras: <b>+ Armadura</b> traz as peças feitas em Criar Armadura para aquela parte, e uma parte pode ter mais de uma (camadas). O tronco protege também os órgãos vitais.</p></div>' +
      bodyCarryHtml(g, b, d, by) : '') +
    '<div class="form-err" id="bodyErr" role="alert"></div>';
}

/* ---------- view: Mochilas ---------- */
// A pack's content: its lines in two tables side by side (half each; the pack itself first, when it
// is a line of the list), then its weight.
function packCardHtml(x, by, g) {
  var p = x.pack, own = p.equipId ? by[p.equipId] : null;
  var rows = (own ? ['<tr class="gear-own"><td><b>' + gearKindTag(own.kind) + esc(gearShownName(own, g)) + '</b><small>a própria mochila</small></td><td class="eq-qty">1</td><td>' + esc(eqLbs(own.weight)) + '</td></tr>'] : []).concat(p.items.map(function (it) {
    var e = by[it.equipId];
    return '<tr><td><b>' + gearKindTag(e.kind) + esc(gearShownName(e, g)) + '</b>' + gearOnBodyBadge(g, e) + '</td><td class="eq-qty">' + it.qty + '</td><td>' + eqEach({ qty: it.qty }, eqRound(it.qty * e.weight), e.weight, eqLbs) + '</td></tr>';
  }));
  var half = Math.ceil(rows.length / 2);
  function tab(list) { return '<table class="gtab eq-tab"><thead><tr><th>Item</th><th>Qtd.</th><th>Peso</th></tr></thead><tbody>' + list.join('') + '</tbody></table>'; }
  return '<div class="gear-pack' + (p.inUse ? '' : ' off') + '" data-pack="' + esc(p.id) + '">' +
    (rows.length ? '<div class="eq-split">' + tab(rows.slice(0, half)) + (rows.length > 1 ? tab(rows.slice(half)) : '') + '</div>' : '<p class="gp-empty">Vazia.</p>') +
    '<div class="gp-foot"><span>' + plural(p.items.length, 'item', 'itens') + (own ? ' · com a própria mochila' : '') + '</span>' +
    '<span class="gp-total"><span>Peso</span><b>' + esc(eqLbs(x.total)) + '</b><small>' + (p.inUse ? 'entra na carga' : 'fora da carga') + '</small></span></div></div>';
}
// As the Corpo: a tab per pack (the one in use marked), the bar to use it (only one at a time), its content.
function sheetPacksHtml(g, L, editing, busy) {
  var ui = S.ui, can = canWrite(), quick = can && !gearEditing(), by = gearIndex(g.equip);
  var head = '<div class="gurps-head">' + gearGripHtml('Mochilas') + gearFoldTitle('packs', 'Mochilas', editing) + '<span class="gurps-total" id="packTotal" title="Peso da mochila em uso">' + esc(eqLbs(L.inUse)) + '</span>' +
    (editing ? secSaveBtnsHtml('packCancel', 'packSave', 'mochilas')
      : can && !busy && !gearEditing() ? secEditBtnHtml('packEdit', 'mochilas') : '') + '</div>';
  if (editing) return '<section class="gurps' + gearFoldClass('packs', editing) + '" id="gearPacks">' + head + packEditHtml(g) + '</section>';
  if (!g.packs.length) return '<section class="gurps' + gearFoldClass('packs', editing) + '" id="gearPacks">' + head + '<p class="long none">Nenhuma mochila.' + (can ? ' Use <b>Editar</b> para criar uma e pôr nela os itens da lista.' : '') + '</p></section>';
  var used = L.packs.filter(function (y) { return y.pack.inUse; })[0] || null;
  var x = L.packs.filter(function (y) { return y.pack.id === ui.packSel; })[0] || used || L.packs[0], p = x.pack;
  var tabs = '<div class="seg gear-confs" role="tablist" aria-label="Mochilas">' + L.packs.map(function (y) {
    var on = y === x;
    return '<button type="button" role="tab" data-pview="' + esc(y.pack.id) + '" aria-selected="' + on + '" class="' + (on ? 'on' : '') + '">' + esc(y.pack.name) +
      (y.pack.inUse ? '<span class="gear-badge on">em uso</span>' : '') + '</button>';
  }).join('') + '</div>';
  var bar = '<div class="gear-bar' + (p.inUse ? ' on' : '') + '"><span>' + (p.inUse ? svg(ICON.info, 14) + '<b>Em uso</b>: entra na carga.' :
      '<b>Guardada</b>: não entra na carga.' + (used ? ' Só uma mochila fica em uso: usar esta guarda “' + esc(used.pack.name) + '”.' : '')) + '</span>' +
    (quick ? (p.inUse ? '<button class="btn ghost" type="button" data-pkuse="" data-pksel="' + esc(p.id) + '">Parar de usar</button>' : '<button class="btn" type="button" data-pkuse="' + esc(p.id) + '" data-pksel="' + esc(p.id) + '">Usar esta mochila</button>') : '') + '</div>';
  return '<section class="gurps' + gearFoldClass('packs', editing) + '" id="gearPacks">' + head + tabs + bar + gearConflictsHtml(g, 'pack') + packCardHtml(x, by, g) + '</section>';
}
// What of the list is left for one pack or house (p): what it has minus what that one takes (the pack
// itself included). The others don't count: a line can be in several.
function packLeft(g, p) {
  var u = packUnits(p), left = Object.create(null);
  g.equip.forEach(function (e) { left[e.id] = e.qty - (u[e.id] || 0); });
  return left;
}
// When none of a line is left for this pack or house.
function packFullText(e) { return e.qty ? ' (todas já estão aqui)' : ' (acabou)'; }
function packEditHtml(g) {
  var d = S.ui.packDraft, by = gearIndex(g.equip);
  function opt(e, cur, left, also) {
    var n = left[e.id] + (cur ? 1 : 0), body = gearOnBody(g, e.id), where = !cur && also[e.id];
    return '<option value="' + esc(e.id) + '"' + (cur ? ' selected' : '') + (n > 0 ? '' : ' disabled') + '>' + esc(gearShownName(e, g)) + ' · ' + esc(eqLbs(e.weight)) +
      (n > 0 ? '' : packFullText(e)) + (where ? ' · ⚠ já está ' + esc(where) : body ? ' · ⚠ no corpo em uso' : '') + '</option>';
  }
  return d.packs.map(function (p, i) {
    // The pack in use shouldn't share a line with the body in use nor with the houses: the list warns.
    var left = packLeft(g, p), also = p.inUse ? gearBlocked(g, 'pack', null, null, d.packs) : {};
    var pk = cleanPack(p, i, by), own = pk.equipId ? by[pk.equipId].weight : 0, content = 0;
    pk.items.forEach(function (it) { content += it.qty * by[it.equipId].weight; });
    var inside = p.items.map(function (it) { return it.equipId; });
    return '<div class="box sk-edit gear-pack-edit" data-p="' + i + '"><div class="sc-row">' +
      scField('Mochila', '<input type="text" data-f="pname" maxlength="80" placeholder="Ex.: Mochila de viagem" value="' + esc(p.name) + '">', 'sc-name') +
      scField('A própria mochila (peso próprio)', '<select data-f="pown"><option value="">Sem peso próprio</option>' + g.equip.map(function (e) { return opt(e, e.id === p.equipId, left, also); }).join('') + '</select>', 'sc-name') +
      '<label class="gear-use" title="A mochila em uso entra na carga; só uma por vez"><input type="radio" name="packActive" data-f="puse" value="' + i + '"' + (p.inUse ? ' checked' : '') + '><span>Em uso</span></label>' +
      '<button class="btn ghost" type="button" data-pdel="' + i + '">' + svg(ICON.trash, 14) + 'Excluir mochila</button></div>' +
      '<div class="gear-slots">' + p.items.map(function (it, j) {
        var e = by[it.equipId]; if (!e) return ''; // left the list meanwhile; goes on save
        return '<div class="gear-slot">' + gearChip(e, 1, g).replace(/<\/span>$/, gearOnBodyBadge(g, e) + '</span>') + '<input type="number" data-f="iqty" data-j="' + j + '" min="1" max="9999" step="1" inputmode="numeric" aria-label="Quantidade de ' + esc(e.name) + '" value="' + it.qty + '">' +
          '<span class="gear-w" data-iw="' + i + ':' + j + '">' + esc(eqLbs(eqRound(it.qty * e.weight))) + '</span>' +
          '<button class="icon-btn" type="button" data-idel="' + j + '" aria-label="Tirar ' + esc(e.name) + ' da mochila" title="Tirar">' + svg(ICON.x, 14, 2.4) + '</button></div>';
      }).join('') +
      gearPickerHtml('padd', '+ Adicionar da lista… (digite o nome)', 'Adicionar à mochila', g.equip.filter(function (e) { return inside.indexOf(e.id) < 0; }).map(function (e) {
        var n = left[e.id], where = also[e.id], body = gearOnBody(g, e.id);
        return { id: e.id, name: gearShownName(e, g), off: !(n > 0), note: [eqLbs(e.weight), n > 0 ? '' : packFullText(e).replace(/^ \(|\)$/g, ''), where ? '⚠ já está ' + where : body ? '⚠ no corpo em uso' : ''].filter(Boolean).join(' · ') };
      })) + '</div>' +
      '<p class="gear-ptot" data-ptot="' + i + '">' + packTotalText(own, content) + '</p></div>';
  }).join('') +
    '<div class="btn-row"><button class="btn" type="button" id="packAdd">' + svg(ICON.plus, 15, 2.4) + 'Nova mochila</button>' +
    (d.packs.length ? '<label class="gear-use"><input type="radio" name="packActive" data-f="puse" value="-1"' + (d.packs.some(function (x) { return x.inUse; }) ? '' : ' checked') + '><span>Nenhuma em uso</span></label>' : '') + '</div>' +
    '<p class="hint-text" style="margin:0">Só entram equipamentos da lista acima, e cada mochila guarda no máximo o que a lista tem; o mesmo item pode estar em várias mochilas. A mochila <b>Em uso</b> não deveria dividir um item com o corpo em uso nem com as casas: a lista avisa (⚠), mas não impede. Ao adicionar, o item vem com a quantidade da lista. A própria mochila, se estiver na lista (ex.: Backpack, Small), dá o peso próprio dela. ' +
    'Só a mochila <b>Em uso</b> entra na carga (uma por vez); as outras continuam guardadas com o que têm.</p>' +
    '<div class="form-err" id="packErr" role="alert"></div>';
}
/* ---------- picking a line of the list by typing (Mochilas and Casa) ----------
   A field with the list under it: a click (or ArrowDown) opens it whole, typing filters it by name
   (accents and case aside); a line picked (click or Enter) calls onPick(field, line id, the field).
   opts: [{ id, name, note, off }] (off: shown, can't be picked). */
function gearPickerHtml(field, placeholder, label, opts) {
  return '<div class="sk-pick gear-picker"><input type="text" data-pick="' + field + '" placeholder="' + esc(placeholder) + '" aria-label="' + esc(label) + '"' +
    ' autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false"><div class="suggest" role="listbox" hidden>' + opts.map(function (o) {
      return '<button type="button" role="option" data-pv="' + esc(o.id) + '" data-pn="' + esc(norm(o.name)) + '"' + (o.off ? ' disabled' : '') + '><span>' + esc(o.name) + '</span>' +
        (o.note ? '<small>' + esc(o.note) + '</small>' : '') + '</button>';
    }).join('') + '<p class="gear-picker-none"' + (opts.length ? ' hidden' : '') + '>' + (opts.length ? 'Nenhum item com esse nome.' : 'Nada mais na lista.') + '</p></div></div>';
}
function wireGearPickers(box, onPick) {
  var act = 0;
  function parts(el) { var w = el.closest && el.closest('.gear-picker'); return w ? { input: w.querySelector('[data-pick]'), list: w.querySelector('.suggest') } : null; }
  function field(e) { var t = /** @type {AnyEl} */ (e.target); return t && t.hasAttribute && t.hasAttribute('data-pick') ? t : null; }
  function shown(x) { return [].filter.call(x.list.querySelectorAll('[data-pv]'), function (b) { return !b.hidden && !b.disabled; }); }
  function paint(x) {
    var q = norm(x.input.value).trim(), all = x.list.querySelectorAll('[data-pv]'), any = false;
    all.forEach(function (b) { var ok = !q || b.getAttribute('data-pn').indexOf(q) >= 0; b.hidden = !ok; b.classList.remove('act'); if (ok) any = true; });
    if (all.length) x.list.querySelector('.gear-picker-none').hidden = any;
    var v = shown(x); act = Math.max(0, Math.min(act, v.length - 1));
    if (v[act]) { v[act].classList.add('act'); v[act].scrollIntoView({ block: 'nearest' }); }
    x.list.hidden = false; x.input.setAttribute('aria-expanded', 'true');
  }
  function close(x) { x.list.hidden = true; x.input.setAttribute('aria-expanded', 'false'); }
  function pick(x, b) { close(x); onPick(x.input.getAttribute('data-pick'), b.getAttribute('data-pv'), x.input); }
  box.addEventListener('click', function (e) {
    var t = /** @type {AnyEl} */ (e.target), x = parts(t); if (!x) return;
    var b = t.closest('[data-pv]'); if (b) { if (!b.disabled) pick(x, b); return; }
    if (t === x.input && x.list.hidden) { act = 0; paint(x); }
  });
  box.addEventListener('input', function (e) { var t = field(e); if (t) { act = 0; paint(parts(t)); } });
  box.addEventListener('keydown', function (e) {
    var t = field(e); if (!t) return;
    var x = parts(t), v = shown(x);
    if (e.key === 'ArrowDown') { e.preventDefault(); if (!x.list.hidden) act++; paint(x); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); act--; paint(x); }
    else if (e.key === 'Enter') { e.preventDefault(); if (!x.list.hidden && v[act]) pick(x, v[act]); }
    else if (e.key === 'Escape' && !x.list.hidden) { e.stopPropagation(); close(x); }
  });
  box.addEventListener('mousedown', function (e) { if (e.target.closest && e.target.closest('.gear-picker .suggest')) e.preventDefault(); });
  box.addEventListener('focusout', function (e) { var t = field(e); if (t) setTimeout(function () { if (document.activeElement !== t) close(parts(t)); }, 150); });
}
function packTotalText(own, content) { return 'Peso: ' + esc(eqLbs(eqRound(own + content))) + (own ? ' (' + esc(eqLbs(eqRound(own))) + ' da mochila + ' + esc(eqLbs(eqRound(content))) + ' de conteúdo)' : ''); }

/* ---------- view: Casa ---------- */
function homeLbs(h, by) { return unitsLbs(packUnits(h), by); }
// What a house keeps, as a pack's content: its lines in two tables side by side, then its weight
// (never in the load).
function homeCardHtml(h, by, g) {
  var rows = h.items.map(function (it) {
    var e = by[it.equipId];
    return '<tr><td><b>' + gearKindTag(e.kind) + esc(gearShownName(e, g)) + '</b>' + gearOnBodyBadge(g, e) + '</td><td class="eq-qty">' + it.qty + '</td><td>' + eqEach({ qty: it.qty }, eqRound(it.qty * e.weight), e.weight, eqLbs) + '</td></tr>';
  });
  var half = Math.ceil(rows.length / 2);
  function tab(list) { return '<table class="gtab eq-tab"><thead><tr><th>Item</th><th>Qtd.</th><th>Peso</th></tr></thead><tbody>' + list.join('') + '</tbody></table>'; }
  return '<div class="gear-pack" data-home="' + esc(h.id) + '">' +
    (rows.length ? '<div class="eq-split">' + tab(rows.slice(0, half)) + (rows.length > 1 ? tab(rows.slice(half)) : '') + '</div>' : '<p class="gp-empty">Vazia.</p>') +
    '<div class="gp-foot"><span>' + plural(h.items.length, 'item', 'itens') + '</span>' +
    '<span class="gp-total"><span>Peso</span><b>' + esc(eqLbs(homeLbs(h, by))) + '</b><small>fora da carga</small></span></div></div>';
}
// As the Mochilas, without in use: a tab per house (only with more than one), its content.
function sheetHomesHtml(g, editing) {
  var ui = S.ui, can = canWrite(), by = gearIndex(g.equip), all = 0;
  g.homes.forEach(function (h) { all += homeLbs(h, by); });
  var head = '<div class="gurps-head">' + gearGripHtml('Casa') + gearFoldTitle('homes', 'Casa', editing) + '<span class="gurps-total" id="homeTotal" title="Peso do que está guardado em casa (não é a carga)">' + esc(eqLbs(eqRound(all))) + '</span>' +
    (editing ? secSaveBtnsHtml('homeCancel', 'homeSave', 'casa')
      : can && !gearEditing() ? secEditBtnHtml('homeEdit', 'casa') : '') + '</div>';
  var open = '<section class="gurps' + gearFoldClass('homes', editing) + '" id="gearHomes">' + head;
  if (editing) return open + homeEditHtml(g) + '</section>';
  if (!g.homes.length) return open + '<p class="long none">Nada guardado em casa.' + (can ? ' Use <b>Editar</b> para guardar nela os itens da lista que o personagem não leva.' : '') + '</p></section>';
  var h = g.homes.filter(function (x) { return x.id === ui.homeSel; })[0] || g.homes[0];
  var tabs = g.homes.length > 1 ? '<div class="seg gear-confs" role="tablist" aria-label="Casas">' + g.homes.map(function (x) {
    var on = x === h;
    return '<button type="button" role="tab" data-hview="' + esc(x.id) + '" aria-selected="' + on + '" class="' + (on ? 'on' : '') + '">' + esc(x.name) + '</button>';
  }).join('') + '</div>' : '';
  return open + tabs + '<div class="gear-bar"><span><b>' + esc(h.name) + '</b>: guardado, não entra na carga.</span></div>' + gearConflictsHtml(g, 'home') + homeCardHtml(h, by, g) + '</section>';
}
function homeEditHtml(g) {
  var d = S.ui.homeDraft, by = gearIndex(g.equip);
  return d.homes.map(function (h, i) {
    // A house shouldn't share a line with another house, the body in use or the pack in use: the list warns.
    var left = packLeft(g, h), also = gearBlocked(g, 'home', h, null, null, d.homes);
    var inside = h.items.map(function (it) { return it.equipId; });
    return '<div class="box sk-edit gear-pack-edit" data-h="' + i + '"><div class="sc-row">' +
      scField('Casa', '<input type="text" data-f="hname" maxlength="80" placeholder="Ex.: Casa em Londres" value="' + esc(h.name) + '">', 'sc-name') +
      '<button class="btn ghost" type="button" data-hdel="' + i + '">' + svg(ICON.trash, 14) + 'Excluir casa</button></div>' +
      '<div class="gear-slots">' + h.items.map(function (it, j) {
        var e = by[it.equipId]; if (!e) return ''; // left the list meanwhile; goes on save
        return '<div class="gear-slot">' + gearChip(e, 1, g).replace(/<\/span>$/, gearOnBodyBadge(g, e) + '</span>') + '<input type="number" data-f="hqty" data-j="' + j + '" min="1" max="9999" step="1" inputmode="numeric" aria-label="Quantidade de ' + esc(e.name) + '" value="' + it.qty + '">' +
          '<span class="gear-w" data-hw="' + i + ':' + j + '">' + esc(eqLbs(eqRound(it.qty * e.weight))) + '</span>' +
          '<button class="icon-btn" type="button" data-hidel="' + j + '" aria-label="Tirar ' + esc(e.name) + ' da casa" title="Tirar">' + svg(ICON.x, 14, 2.4) + '</button></div>';
      }).join('') +
      gearPickerHtml('hadd', '+ Guardar da lista… (digite o nome)', 'Guardar na casa', g.equip.filter(function (e) { return inside.indexOf(e.id) < 0; }).map(function (e) {
        var n = left[e.id];
        return { id: e.id, name: gearShownName(e, g), off: !(n > 0), note: [eqLbs(e.weight), n > 0 ? '' : packFullText(e).replace(/^ \(|\)$/g, ''), also[e.id] ? '⚠ já está ' + also[e.id] : ''].filter(Boolean).join(' · ') };
      })) + '</div>' +
      '<p class="gear-ptot" data-htot="' + i + '">' + packTotalText(0, homeLbs(cleanHome(h, i, by), by)) + ' · fora da carga</p></div>';
  }).join('') +
    '<div class="btn-row"><button class="btn" type="button" id="homeAdd">' + svg(ICON.plus, 15, 2.4) + 'Nova casa</button></div>' +
    '<p class="hint-text" style="margin:0">Só entram equipamentos da lista acima, e cada casa guarda no máximo o que a lista tem. Um item numa casa não deveria estar em outra casa, no corpo em uso nem na mochila em uso (nas mochilas guardadas, pode): a lista avisa (⚠), mas não impede. Ao guardar, o item vem com a quantidade da lista. ' +
    'O que está na casa nunca entra na carga.</p>' +
    '<div class="form-err" id="homeErr" role="alert"></div>';
}

/* ---------- wiring ---------- */
function wireSheetEquip(s) {
  var ui = S.ui;
  wireSecSort('gearSecs', GEAR_ORDER_KEY);
  // The common lines of Meus Itens: Editar opens Criar Item's form with the line; Excluir asks first.
  var items = $('equip'); if (items && !gearEditing()) items.addEventListener('click', function (e) {
    var t = /** @type {AnyEl} */ (e.target), b = t.closest && t.closest('[data-it-edit], [data-it-del], [data-it-delyes], [data-it-delno]'); if (!b) return;
    if (b.hasAttribute('data-it-edit')) {
      var line = sheetGear(s).equip.filter(function (x) { return x.id === b.getAttribute('data-it-edit'); })[0]; if (!line) return;
      ui.itemDraft = itemDraftFromLine(line); ui.itemDel = null; renderSheetPage(); gearFocusBuilder('itemSec');
      return;
    }
    if (b.hasAttribute('data-it-del')) { ui.itemDel = b.getAttribute('data-it-del'); renderSheetPage(); return; }
    if (b.hasAttribute('data-it-delno')) { ui.itemDel = null; renderSheetPage(); return; }
    b.disabled = true;
    Ops.deleteSheetItem(s, b.getAttribute('data-it-delyes')).then(function () { ui.itemDel = null; toast('Item excluído de Meus Itens.'); renderSheetPage(); },
      function (er) { b.disabled = false; toast(errorText(er), true); });
  });
  var be = $('bodyEdit'); if (be) be.onclick = function () {
    var g = sheetGear(s), L = gearLoad(g), shown = g.bodies.filter(function (x) { return x.id === ui.bodySel; })[0] || L.active || g.bodies[0];
    ui.bodyDraft = { bodies: JSON.parse(JSON.stringify(g.bodies)), sel: shown ? shown.id : null, addKind: null };
    if (!ui.bodyDraft.bodies.length) { var nb = gearNewBody(ui.bodyDraft.bodies); nb.active = true; ui.bodyDraft.bodies.push(nb); ui.bodyDraft.sel = nb.id; }
    renderSheetPage();
  };
  var pe = $('packEdit'); if (pe) pe.onclick = function () {
    ui.packDraft = { packs: JSON.parse(JSON.stringify(sheetGear(s).packs)) };
    if (!ui.packDraft.packs.length) ui.packDraft.packs.push(gearNewPack(ui.packDraft.packs));
    renderSheetPage();
  };
  var he = $('homeEdit'); if (he) he.onclick = function () {
    ui.homeDraft = { homes: JSON.parse(JSON.stringify(sheetGear(s).homes)) };
    if (!ui.homeDraft.homes.length) ui.homeDraft.homes.push(gearNewHome(ui.homeDraft.homes));
    renderSheetPage();
  };
  wireArmorSec(s);
  wireWeaponSec(s);
  wireShieldSec(s);
  wireItemSec(s);
  wireGearQuick(s);
  wireBodyEdit(s);
  wirePackEdit(s);
  wireHomeEdit(s);
}
function gearNewBody(list) { return { id: gearNewId('b', gearIndex(list)), name: 'Configuração ' + (list.length + 1), active: false, slots: [] }; }
function gearNewPack(list) { return { id: gearNewId('m', gearIndex(list)), name: list.length ? 'Mochila ' + (list.length + 1) : 'Mochila', inUse: !list.some(function (x) { return x.inUse; }), equipId: null, items: [] }; }
function gearNewHome(list) { return { id: gearNewId('c', gearIndex(list)), name: list.length ? 'Casa ' + (list.length + 1) : 'Casa', items: [] }; }

// Out of the editors: which configuration shows, which one is in use and which packs are in use. The
// last two are saved at once, and the load follows.
function wireGearQuick(s) {
  var ui = S.ui, box = $('gearBody');
  if (box) box.addEventListener('click', function (e) {
    var t = /** @type {AnyEl} */ (e.target), v = t.closest && t.closest('[data-bview]'), u = t.closest && t.closest('[data-buse]');
    if (v) { ui.bodySel = v.getAttribute('data-bview'); renderSheetPage(); return; }
    if (!u) return;
    var id = u.getAttribute('data-buse'), g = sheetGear(s);
    u.disabled = true;
    var before = gearConflicts(g), nb = g.bodies.map(function (b) { return Object.assign({}, b, { active: b.id === id }); });
    Ops.saveSheetBodies(s, nb).then(function () {
      var b = g.bodies.filter(function (x) { return x.id === id; })[0];
      if (b) ui.bodySel = id;
      toast(b ? '“' + b.name + '” em uso: a carga foi atualizada.' : 'Nenhuma configuração de corpo em uso.');
      gearWarn(before, Object.assign({}, g, { bodies: nb }));
    }, function (er) { u.disabled = false; toast(errorText(er), true); });
  });
  var packs = $('gearPacks');
  if (packs) packs.addEventListener('click', function (e) {
    var t = /** @type {AnyEl} */ (e.target), v = t.closest && t.closest('[data-pview]'), u = t.closest && t.closest('[data-pkuse]');
    if (v) { ui.packSel = v.getAttribute('data-pview'); renderSheetPage(); return; }
    if (!u) return;
    var id = u.getAttribute('data-pkuse'), g = sheetGear(s), p = g.packs.filter(function (x) { return x.id === id; })[0];
    ui.packSel = u.getAttribute('data-pksel'); u.disabled = true;
    var before = gearConflicts(g), np = g.packs.map(function (x) { return Object.assign({}, x, { inUse: x.id === id }); });
    Ops.saveSheetPacks(s, np).then(function () {
      toast(p ? '“' + p.name + '” em uso: a carga foi atualizada.' : 'Nenhuma mochila em uso.');
      gearWarn(before, Object.assign({}, g, { packs: np }));
    }, function (er) { u.disabled = false; toast(errorText(er), true); });
  });
  var homes = $('gearHomes');
  if (homes) homes.addEventListener('click', function (e) {
    var t = /** @type {AnyEl} */ (e.target), v = t.closest && t.closest('[data-hview]');
    if (v) { ui.homeSel = v.getAttribute('data-hview'); renderSheetPage(); }
  });
}

// The configurations being edited: S.ui.bodyDraft = { bodies, sel } (sel: the one whose parts show).
function wireBodyEdit(s) {
  var ui = S.ui, d = ui.bodyDraft, box = $('gearBody'); if (!d || !box || !$('bodySave')) return;
  var g = sheetGear(s), by = gearIndex(g.equip);
  function cur() { return d.bodies.filter(function (x) { return x.id === d.sel; })[0] || d.bodies[0]; }
  function paint() {
    var r = paintGear(s);
    box.querySelectorAll('[data-btot]').forEach(function (el) { var b = d.bodies[+el.getAttribute('data-btot')]; if (b) el.textContent = eqLbs(unitsLbs(bodyUnits(cleanBody(b, 0, by), by), by)); });
    return r;
  }
  box.addEventListener('input', function (e) {
    var el = /** @type {AnyEl} */ (e.target), f = el.dataset && el.dataset.f;
    if (f === 'bname') { var b = d.bodies[+el.closest('[data-b]').getAttribute('data-b')]; b.name = el.value; paintGear(s); }
    else if (f === 'sqty' && el.value !== '') { cur().slots[+el.getAttribute('data-j')].qty = cleanInt(el.value, 1, 9999, 1); paint(); }
  });
  box.addEventListener('change', function (e) {
    var el = /** @type {AnyEl} */ (e.target), f = el.dataset && el.dataset.f;
    if (f === 'active') { var n = +el.value; d.bodies.forEach(function (b, i) { b.active = i === n; }); paint(); return; }
    if (f === 'sqty' && el.value === '') { el.value = String(cur().slots[+el.getAttribute('data-j')].qty); return; }
    var part = el.getAttribute && el.getAttribute('data-addpart'); if (!part || !el.value) return;
    var b = cur(), e2 = by[el.value]; if (!e2) return;
    // An armor of the catalog goes on every part it covers: it is one piece.
    var pc = g.pieces[e2.id], loc = pc ? armorLocById(pc.piece.loc) : null;
    var parts = e2.kind === 'armor' && !(loc && loc.oneSide) ? (gearParts(e2, g) || [part]) : [part], also = [];
    if (parts.indexOf(part) < 0) parts = [part];
    parts.forEach(function (p) {
      if (b.slots.some(function (sl) { return sl.part === p && sl.equipId === e2.id; })) return;
      b.slots.push({ part: p, equipId: e2.id, qty: 1 });
      if (p !== part) also.push(gearPartName(p));
    });
    renderSheetPage();
    if (also.length) toast(e2.name + ' cobre também: ' + also.join(', ') + '. Tire de alguma parte, se quiser.');
  });
  box.addEventListener('click', function (e) {
    var t = /** @type {AnyEl} */ (e.target), b = t.closest && t.closest('[data-bsel], [data-bdel], [data-sdel], [data-carry-kind], [data-carry-add]'); if (!b) return;
    if (b.hasAttribute('data-carry-kind')) { var k = b.getAttribute('data-carry-kind'); d.addKind = d.addKind === k ? null : k; renderSheetPage(); return; }
    if (b.hasAttribute('data-carry-add')) { cur().slots.push({ part: GEAR_CARRY, equipId: b.getAttribute('data-carry-add'), qty: 1 }); d.addKind = null; renderSheetPage(); return; }
    if (b.hasAttribute('data-bsel')) { d.sel = d.bodies[+b.getAttribute('data-bsel')].id; renderSheetPage(); return; }
    if (b.hasAttribute('data-sdel')) { cur().slots.splice(+b.getAttribute('data-sdel'), 1); renderSheetPage(); return; }
    var i = +b.getAttribute('data-bdel'), x = d.bodies[i];
    if ((x.slots.length || x.active) && !confirm('Excluir a configuração “' + x.name + '”' + (x.active ? ', que está em uso (a carga deixa de contar o corpo)' : '') + '? Os equipamentos continuam na lista.')) return;
    d.bodies.splice(i, 1);
    if (d.sel === x.id) d.sel = d.bodies.length ? d.bodies[0].id : null;
    renderSheetPage();
  });
  $('bodyAdd').onclick = function () {
    var nb = gearNewBody(d.bodies); d.bodies.push(nb); d.sel = nb.id; renderSheetPage();
    var f = box.querySelector('[data-b="' + (d.bodies.length - 1) + '"] [data-f="bname"]'); if (f instanceof HTMLInputElement) { f.focus(); f.select(); }
  };
  $('bodyCancel').onclick = function () { ui.bodyDraft = null; renderSheetPage(); };
  $('bodySave').onclick = function () {
    var btn = $('bodySave'); btn.disabled = true; btn.textContent = 'Salvando…'; $('bodyCancel').disabled = true; $('bodyErr').textContent = '';
    var g0 = sheetGear(s), before = gearConflicts(g0), after = Object.assign({}, g0, { bodies: d.bodies });
    Ops.saveSheetBodies(s, d.bodies).then(function () { ui.bodySel = d.sel; ui.bodyDraft = null; toast('Corpo salvo.'); renderSheetPage(); gearWarn(before, after); }, function (er) {
      btn.disabled = false; btn.textContent = 'Salvar'; $('bodyCancel').disabled = false;
      $('bodyErr').textContent = errorText(er);
    });
  };
}

// The packs being edited: S.ui.packDraft = { packs }.
function wirePackEdit(s) {
  var ui = S.ui, d = ui.packDraft, box = $('gearPacks'); if (!d || !box || !$('packSave')) return;
  var by = gearIndex(sheetGear(s).equip);
  function pack(el) { var r = el.closest && el.closest('[data-p]'); return r ? d.packs[+r.getAttribute('data-p')] : null; }
  function paint(el) {
    paintGear(s);
    var r = el.closest('[data-p]'), i = +r.getAttribute('data-p'), p = d.packs[i], own = p.equipId && by[p.equipId] ? by[p.equipId].weight : 0, content = 0;
    p.items.forEach(function (it, j) {
      var w = by[it.equipId] ? it.qty * by[it.equipId].weight : 0; content += w;
      var c = box.querySelector('[data-iw="' + i + ':' + j + '"]'); if (c) c.textContent = eqLbs(eqRound(w));
    });
    var t = box.querySelector('[data-ptot="' + i + '"]'); if (t) t.innerHTML = packTotalText(own, content);
  }
  box.addEventListener('input', function (e) {
    var el = /** @type {AnyEl} */ (e.target), f = el.dataset && el.dataset.f, p = pack(el); if (!p) return;
    if (f === 'pname') { p.name = el.value; return; }
    if (f === 'iqty' && el.value !== '') { p.items[+el.getAttribute('data-j')].qty = cleanInt(el.value, 1, 9999, 1); paint(el); }
  });
  box.addEventListener('change', function (e) {
    var el = /** @type {AnyEl} */ (e.target), f = el.dataset && el.dataset.f;
    if (f === 'puse') { var n = +el.value; d.packs.forEach(function (x, i) { x.inUse = i === n; }); renderSheetPage(); return; }
    var p = pack(el); if (!p) return;
    if (f === 'iqty' && el.value === '') el.value = String(p.items[+el.getAttribute('data-j')].qty);
    else if (f === 'pown') { p.equipId = el.value || null; renderSheetPage(); }
  });
  // A line picked (typed or from the list): with the list's quantity (less the pack itself, when it is
  // the same line).
  wireGearPickers(box, function (f, id, el) {
    var p = pack(el); if (!p || f !== 'padd') return;
    var gn = gearNow(s), ln = gearIndex(gn.equip)[id];
    p.items.push({ equipId: id, qty: ln ? Math.max(1, Math.min(9999, packLeft(gn, p)[id])) : 1 }); renderSheetPage();
    if (ln && gearOnBody(gn, ln.id)) toast('“' + ln.name + '” também está no corpo em uso. Na carga conta uma vez só.');
    var nx = document.querySelector('#gearPacks [data-p="' + d.packs.indexOf(p) + '"] [data-pick]'); if (nx instanceof HTMLElement) nx.focus();
  });
  box.addEventListener('click', function (e) {
    var t = /** @type {AnyEl} */ (e.target), b = t.closest && t.closest('[data-pdel], [data-idel]'); if (!b) return;
    var p = pack(b); if (!p) return;
    if (b.hasAttribute('data-idel')) { p.items.splice(+b.getAttribute('data-idel'), 1); renderSheetPage(); return; }
    if (p.items.length && !confirm('Excluir a mochila “' + p.name + '”? O que está nela continua na lista de equipamentos.')) return;
    d.packs.splice(d.packs.indexOf(p), 1); renderSheetPage();
  });
  $('packAdd').onclick = function () {
    d.packs.push(gearNewPack(d.packs)); renderSheetPage();
    var l = box.querySelectorAll('[data-f="pname"]'), f = l[l.length - 1]; if (f instanceof HTMLInputElement) { f.focus(); f.select(); }
  };
  $('packCancel').onclick = function () { ui.packDraft = null; renderSheetPage(); };
  $('packSave').onclick = function () {
    var btn = $('packSave'); btn.disabled = true; btn.textContent = 'Salvando…'; $('packCancel').disabled = true; $('packErr').textContent = '';
    var g1 = sheetGear(s), before = gearConflicts(g1), after = Object.assign({}, g1, { packs: d.packs });
    Ops.saveSheetPacks(s, d.packs).then(function () { ui.packDraft = null; toast('Mochilas salvas.'); renderSheetPage(); gearWarn(before, after); }, function (er) {
      btn.disabled = false; btn.textContent = 'Salvar'; $('packCancel').disabled = false;
      $('packErr').textContent = errorText(er);
    });
  };
}

// The houses being edited: S.ui.homeDraft = { homes }.
function wireHomeEdit(s) {
  var ui = S.ui, d = ui.homeDraft, box = $('gearHomes'); if (!d || !box || !$('homeSave')) return;
  var by = gearIndex(sheetGear(s).equip);
  function home(el) { var r = el.closest && el.closest('[data-h]'); return r ? d.homes[+r.getAttribute('data-h')] : null; }
  function paint(el) {
    var r = el.closest('[data-h]'), i = +r.getAttribute('data-h'), h = d.homes[i], all = 0, content = 0;
    h.items.forEach(function (it, j) {
      var w = by[it.equipId] ? it.qty * by[it.equipId].weight : 0; content += w;
      var c = box.querySelector('[data-hw="' + i + ':' + j + '"]'); if (c) c.textContent = eqLbs(eqRound(w));
    });
    var t = box.querySelector('[data-htot="' + i + '"]'); if (t) t.innerHTML = packTotalText(0, content) + ' · fora da carga';
    d.homes.forEach(function (x, k) { all += homeLbs(cleanHome(x, k, by), by); });
    $('homeTotal').textContent = eqLbs(eqRound(all));
  }
  box.addEventListener('input', function (e) {
    var el = /** @type {AnyEl} */ (e.target), f = el.dataset && el.dataset.f, h = home(el); if (!h) return;
    if (f === 'hname') { h.name = el.value; return; }
    if (f === 'hqty' && el.value !== '') { h.items[+el.getAttribute('data-j')].qty = cleanInt(el.value, 1, 9999, 1); paint(el); }
  });
  box.addEventListener('change', function (e) {
    var el = /** @type {AnyEl} */ (e.target), f = el.dataset && el.dataset.f, h = home(el); if (!h) return;
    if (f === 'hqty' && el.value === '') el.value = String(h.items[+el.getAttribute('data-j')].qty);
  });
  // A line picked (typed or from the list): with the list's quantity.
  wireGearPickers(box, function (f, id, el) {
    var h = home(el); if (!h || f !== 'hadd') return;
    var lh = by[id]; h.items.push({ equipId: id, qty: lh ? Math.max(1, Math.min(9999, lh.qty)) : 1 }); renderSheetPage();
    var nx = document.querySelector('#gearHomes [data-h="' + d.homes.indexOf(h) + '"] [data-pick]'); if (nx instanceof HTMLElement) nx.focus();
  });
  box.addEventListener('click', function (e) {
    var t = /** @type {AnyEl} */ (e.target), b = t.closest && t.closest('[data-hdel], [data-hidel]'); if (!b) return;
    var h = home(b); if (!h) return;
    if (b.hasAttribute('data-hidel')) { h.items.splice(+b.getAttribute('data-hidel'), 1); renderSheetPage(); return; }
    if (h.items.length && !confirm('Excluir a casa “' + h.name + '”? O que está nela continua na lista de equipamentos.')) return;
    d.homes.splice(d.homes.indexOf(h), 1); renderSheetPage();
  });
  $('homeAdd').onclick = function () {
    d.homes.push(gearNewHome(d.homes)); renderSheetPage();
    var l = box.querySelectorAll('[data-f="hname"]'), f = l[l.length - 1]; if (f instanceof HTMLInputElement) { f.focus(); f.select(); }
  };
  $('homeCancel').onclick = function () { ui.homeDraft = null; renderSheetPage(); };
  $('homeSave').onclick = function () {
    var btn = $('homeSave'); btn.disabled = true; btn.textContent = 'Salvando…'; $('homeCancel').disabled = true; $('homeErr').textContent = '';
    var g2 = sheetGear(s), before = gearConflicts(g2), after = Object.assign({}, g2, { homes: d.homes });
    Ops.saveSheetHomes(s, d.homes).then(function () { ui.homeDraft = null; toast('Casa salva.'); renderSheetPage(); gearWarn(before, after); }, function (er) {
      btn.disabled = false; btn.textContent = 'Salvar'; $('homeCancel').disabled = false;
      $('homeErr').textContent = errorText(er);
    });
  };
}
