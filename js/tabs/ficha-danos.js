/* =====================================================================
   Hounds — Ficha › Danos
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html (depois de ficha-armas.js).
   ===================================================================== */
'use strict';

/* The Danos section is built from the sheet, in three groups:
     the weapons of the Corpo configuration in use (Equip. › Corpo, carried): every attack with its
       damage in dice for the ST, with the weapon's adjustments (Criar Arma) and the advantages, and
       its NH (weaponNh: the skill or the best default) with the adjustments' and the advantages';
     the unarmed attacks: each unarmed combat skill of the sheet (Brawling, Boxing, Karate, Judo,
       Wrestling, Sumo Wrestling) with its attacks, its bonus, its techniques that do damage and the
       encumbrance penalty (Peso) of Judo and Karate; DX for what none covers; and the Strikers;
     the other attacks, typed by the player (sheet.combat.weapons, the editor), with the ST.
   The advantages that count are the sheet's (Vantagens, and the perks and advantages of Combate with
   points) that change damage or NH, from Regras › Vantagens (dmEffects). Talents already count in the
   skills' NH (applyTalents). */

/* ---------- the sheet's advantages ---------- */
// Each once by name: Vantagens (with its levels), then the perks and advantages of Combate.
function dmTraits(s) {
  var seen = {}, out = [];
  function add(name, levels, pts) { var n = norm(name); if (!name || seen[n]) return; seen[n] = true; out.push({ name: name, levels: levels, pts: pts }); }
  sheetAdvs(s).forEach(function (x) { add(x.name, x.levels, advPts(x)); });
  scAllItems(sheetCombat(s)).forEach(function (x) { if (x.kind === 'trait' && x.pts > 0) add(x.name, 0, x.pts); });
  return out;
}
// What is in parentheses: "Weapon Master (Swords)" → "Swords".
function dmSpec(name) { var m = /\(([^)]*)\)/.exec(name); return m ? m[1].trim() : ''; }
// The number at the end: "Striking ST 2", "Striking ST +2", "Striking ST +1".
function dmEndNum(t) { var m = /([+-]?\d+)\s*$/.exec(String(t || '').trim()); return m ? Math.abs(+m[1]) : 0; }
// The parts of a specialty: "Broadsword and Shield", "Katana, Wakizashi", "Espadas ou Facas".
function dmSpecItems(sp) { return sp.split(/\s*(?:[,;&]|\band\b|\bor\b|\be\b|\bou\b)\s*/i).map(function (x) { return x.trim(); }).filter(Boolean); }
// Weapon Master's classes of weapons (Basic Set, p. B99; Martial Arts, p. 48), in English and in
// Portuguese: the skills each covers (null: all). Any other part of the specialty is a skill
// ("Broadsword") or a weapon's name ("Katana").
var DM_WM_CLASSES = /** @type {[RegExp, string[]][]} */ ([
  [/^(all|todas)\b/, null],
  [/^(swords?|espadas?)$/, ['broadsword', 'rapier', 'saber', 'shortsword', 'smallsword', 'two-handed sword', 'force sword']],
  [/^(fencing( weapons?)?|esgrima|armas de esgrima)$/, ['main-gauche', 'rapier', 'saber', 'smallsword']],
  [/^(knives|facas?)$/, ['knife', 'main-gauche']],
  [/^(axes|maces|axes and maces|machados?|macas?)$/, ['axe/mace', 'two-handed axe/mace']],
  [/^(flails|manguais|mangual)$/, ['flail', 'two-handed flail']],
  [/^(polearms|armas de haste)$/, ['polearm']],
  [/^(spears|lancas?)$/, ['spear']],
  [/^(staffs|staves|bastoes|bastao)$/, ['staff']],
  [/^(bows|arcos?)$/, ['bow']],
  [/^(crossbows|bestas?)$/, ['crossbow']],
  [/^(whips|chicotes?)$/, ['whip', 'kusari']],
  [/^(thrown( weapons?)?|arremesso|armas de arremesso)$/, ['thrown weapon', 'throwing']],
  [/^(shields?|escudos?)$/, ['shield']]]);
// A class named in the singular ("Sword and Shield", "Sword") is one weapon of it, not all of them
// (the one-weapon and two-weapon Weapon Masters, p. B99): the skill of the class with the best NH on
// the sheet. [word, what it is in the list below the table, the class's skills].
var DM_WM_ONE = /** @type {[RegExp, string, string[]][]} */ ([
  [/^(sword|espada)$/, 'a espada', ['broadsword', 'rapier', 'saber', 'shortsword', 'smallsword', 'two-handed sword', 'force sword']],
  [/^(knife|faca)$/, 'a faca', ['knife', 'main-gauche']],
  [/^(axe|mace|machado|maca)$/, 'o machado ou maça', ['axe/mace', 'two-handed axe/mace']],
  [/^(flail|mangual)$/, 'o mangual', ['flail', 'two-handed flail']],
  [/^(whip|chicote)$/, 'o chicote', ['whip', 'kusari']]]);
// The parts of a Weapon Master's specialty, with the singular classes as the skill they are:
// { items, notes } (notes: "Sword = Broadsword..."); lvl(name): the sheet's NH in a skill, or null.
function dmMasterItems(sp, lvl) {
  var notes = [], items = [];
  dmSpecItems(sp).forEach(function (it) {
    var one = DM_WM_ONE.filter(function (c) { return c[0].test(norm(it).trim()); })[0];
    if (!one) { items.push(it); return; }
    var best = /** @type {{ name: string, v: number } | null} */ (null);
    one[2].forEach(function (k) { var x = lvl(k); if (x && (!best || x.v > best.v)) best = x; });
    if (best) { items.push(best.name); notes.push(it + ' = ' + best.name + ' (' + one[1] + ' com maior NH na ficha, ' + best.v + ')'); }
    else notes.push(it + ': nenhuma perícia de ' + one[1].replace(/^(a|o) /, '') + ' na ficha');
  });
  return { items: items, notes: notes };
}
// Claws (p. B42): +1 a die and the damage of punch and kick.
var DM_CLAWS = { blunt: ['Garras rombudas', 1, 'cr', true], hooves: ['Cascos', 1, 'cr', false], sharp: ['Garras afiadas', 0, 'cut', true],
  talons: ['Talons', 0, 'cut ou imp', true], long: ['Long Talons', 1, 'cut ou imp', true] };
function dmClawKind(t, pts) {
  var n = norm(t);
  if (/long talons|garras longas/.test(n)) return 'long';
  if (/talons/.test(n)) return 'talons';
  if (/sharp|afiad/.test(n)) return 'sharp';
  if (/hooves|cascos/.test(n)) return 'hooves';
  if (/blunt|rombud/.test(n)) return 'blunt';
  return pts >= 11 ? 'long' : pts >= 8 ? 'talons' : pts >= 5 ? 'sharp' : 'blunt';
}
// Teeth (p. B91): the bite's damage type; blunt teeth (0 points) are not an advantage.
function dmTeethType(t, pts) {
  var n = norm(t);
  if (/fang|presa/.test(n)) return 'imp';
  if (/beak|bico/.test(n)) return 'pi+';
  if (/sharp|afiad/.test(n)) return 'cut';
  return pts >= 2 ? 'imp' : pts >= 1 ? 'cut' : 'cr';
}
// Striker (p. B88): the type from the specialty, else from the cost (5 cr, 6 pi+, 7 cut, 8 imp).
function dmStrikerType(t, pts) {
  var n = norm(t);
  if (/imp/.test(n)) return 'imp';
  if (/cut|cort/.test(n)) return 'cut';
  if (/large pierc|pi\+/.test(n)) return 'pi+';
  if (/pierc|perfur|\bpi\b/.test(n)) return 'pi';
  if (/crush|contus|\bcr\b/.test(n)) return 'cr';
  return pts >= 8 ? 'imp' : pts >= 7 ? 'cut' : pts >= 6 ? 'pi+' : 'cr';
}
// What the sheet's advantages do to damage and NH. hits: where each was used, for the list below
// the table; warn: what could not be applied.
function dmEffects(s, lvl) {
  var fx = { striking: 0, strikingFrom: [], masters: [], bonds: [], claws: null, teeth: null, strikers: [], biting: null, warn: [] };
  dmTraits(s).forEach(function (t) {
    var n = norm(t.name), sp = dmSpec(t.name);
    if (/^striking st\b/.test(n)) {
      var lv = t.levels || dmEndNum(t.name.replace(/\(.*\)/, '')) || dmEndNum(sp) || Math.max(1, Math.floor(t.pts / 5));
      fx.striking += lv; fx.strikingFrom.push(t.name + (t.levels ? ' ' + t.levels : ''));
    } else if (/^special exercises\b/.test(n) && /striking st/i.test(sp)) {
      var k = dmEndNum(sp) || 1; fx.striking += k; fx.strikingFrom.push(t.name);
    } else if (/^weapon master\b/.test(n)) {
      if (sp) { var mi = dmMasterItems(sp, lvl); fx.masters.push({ name: t.name, items: mi.items, notes: mi.notes, hits: [] }); }
      else fx.warn.push(t.name + ' sem especialidade: escreva entre parênteses a arma, a perícia ou a classe. Ex.: Weapon Master (Broadsword), (Swords), (Katana)');
    } else if (/^(weapon|equipment) bond\b/.test(n)) {
      if (sp) fx.bonds.push({ name: t.name, target: sp, hits: [] });
      else fx.warn.push(t.name + ' sem a arma: escreva o nome dela entre parênteses, como em Meus Itens. Ex.: Weapon Bond (Katana)');
    } else if (/^claws\b/.test(n)) fx.claws = { name: t.name, kind: dmClawKind(sp || t.name, t.pts) };
    else if (/^teeth\b/.test(n)) fx.teeth = { name: t.name, type: dmTeethType(sp || t.name, t.pts) };
    else if (/^striker\b/.test(n)) fx.strikers.push({ name: t.name, type: dmStrikerType(sp || t.name, t.pts) });
    else if (/^biting mastery\b/.test(n)) fx.biting = t.name;
  });
  return fx;
}
function dmMasterCovers(m, skill, weapon) {
  var k = combatKey(skill || ''), w = norm(weapon || '').trim();
  return m.items.some(function (it) {
    var i = norm(it).trim(), cls = DM_WM_CLASSES.filter(function (c) { return c[0].test(i); })[0];
    if (cls) return !cls[1] || cls[1].indexOf(k) >= 0;
    var ik = combatKey(it);
    return (!!k && (ik === k || ik.replace(/s$/, '') === k)) || (!!w && (w === i || w.indexOf(i) >= 0));
  });
}
function dmBondOf(b, weapon) { var w = norm(weapon || '').trim(), t = norm(b.target).trim(); return !!w && !!t && (w === t || w.indexOf(t) >= 0 || t.indexOf(w) >= 0); }

/* ---------- the calculation ---------- */
function dmSign(n) { return (n < 0 ? ' − ' : ' + ') + Math.abs(n); }
// "sw+1 cut" at ST st plus perDie for each die of the basic damage (Weapon Master, Karate...):
// { text: '2d+3 cut', base: '1d+2', kind: 'sw', dice: 1, conv }. A +7 of the add is +2d and a +4
// is +1d (dmgAdd); conv says so when it happened ("2d+5 = 3d+1"). A damage with no sw/thr ("2d+1 pi",
// "spec.") stays as it is (sw: false).
function dmDice(dmg, st, perDie) {
  var t = String(dmg || '').trim(), m = /^(sw|thr)([+-]\d+)?(.*)$/i.exec(t);
  if (!m) return { text: t || '—', sw: false, dice: 0, conv: '' };
  var kind = m[1].toLowerCase(), base = gurpsDamage(Math.max(1, st))[kind], dice = +((/^(\d+)d/.exec(base) || [0, 0])[1]);
  var add = (m[2] ? +m[2] : 0) + perDie * dice, raw = dmgAddRaw(base, add), out = dmgAdd(base, add);
  return { text: out + m[3], sw: true, base: base, kind: kind, dice: dice, conv: raw !== out ? raw + ' = ' + out + ' (+4 vira 1d, +7 vira 2d)' : '' };
}
// The ST for the damage: the sheet's plus Striking ST, except for bows and the like, whose damage is
// the weapon's pull (Basic Set, p. B270).
function dmKindText(d) { return d.sw ? (d.kind === 'sw' ? 'swing' : 'thrust') : ''; }
function dmStFor(ctx, skill) { return /^(bow|crossbow|sling|blowpipe|spear thrower)\b/.test(combatKey(skill || '')) ? ctx.st : ctx.dmgSt; }
function dmStText(ctx, st) { return 'ST ' + st + (st !== ctx.st ? ' (' + ctx.st + ' + ' + ctx.fx.striking + ' de Striking ST)' : ''); }
// One attack of a carried weapon: damage and NH with the adjustments and the advantages.
// adj: the adjustments' { dmg, nh } (Criar Arma); weapon: the line's name.
function dmWeaponAttack(ctx, a, weapon, adj) {
  var fx = ctx.fx, st = dmStFor(ctx, a.skill), base = weaponNh(ctx.s, a, 0), rel = base ? base.v - ctx.av.DX : null;
  // Weapon Master: +1 a die with the skill at DX+1, +2 at DX+2 or more (p. B99).
  var wm = rel != null && rel >= 1 ? fx.masters.filter(function (m) { return dmMasterCovers(m, a.skill, weapon); })[0] : null;
  var d = dmDice(a.damage, st, wm ? Math.min(2, rel) : 0), calc = [];
  if (d.sw) calc.push(a.damage + ' com ' + dmStText(ctx, st) + ' (' + d.kind + ' ' + d.base + ')');
  if (adj.dmg && a.baseDamage && a.baseDamage !== a.damage) calc.push('livro ' + a.baseDamage + dmSign(adj.dmg) + ' dos ajustes');
  if (wm && d.sw && d.dice) { calc.push('+' + Math.min(2, rel) * d.dice + ' de ' + wm.name + ' (+' + Math.min(2, rel) + ' por dado, ' + (a.skill || 'perícia') + ' em DX+' + rel + ')'); if (wm.hits.indexOf(weapon) < 0) wm.hits.push(weapon); }
  if (d.conv) calc.push(d.conv);
  var bond = fx.bonds.filter(function (b) { return dmBondOf(b, weapon); })[0];
  if (bond && bond.hits.indexOf(weapon) < 0) bond.hits.push(weapon);
  var plus = (adj.nh || 0) + (bond ? 1 : 0);
  var nh = base ? { v: base.v + plus, bonus: !!plus, title: base.title + (adj.nh ? dmSign(adj.nh) + ' dos ajustes' : '') + (bond ? ' + 1 de ' + bond.name : '') } : null;
  // Modo: swing or thrust (from the damage), and the book's mode ("two hands"); "or" is the row itself.
  var mode = [dmKindText(d), a.mode && a.mode !== 'or' ? weaponModeText(a.mode) : ''].filter(Boolean).join(' · ');
  return { mode: mode, dmg: { text: d.text, calc: calc.join(' · '), bonus: !!(wm && d.sw) || !!adj.dmg || (d.sw && st !== ctx.st) }, nh: nh,
    reach: a.reach || a.range || '', parry: a.parry || '' };
}
// A shield's bash (Basic Set, p. B273; Low-Tech, p. 68): thr cr at reach 1, with the Shield skill;
// a spike makes it thr+1 cr, a long spike thr+1 imp, and a sharp edge adds a swing (sw-2 cut). The
// spike or edge is read from the line's name, notes and the shield's adjustments.
function dmShieldBash(text, skill, defaults) {
  var t = norm(text), a = { skill: skill, defaults: defaults, reach: '1', parry: 'No' }, out = [];
  var dmg = /long spike|espigao longo|cravo longo/.test(t) ? 'thr+1 imp' : /spike|espigao|cravo/.test(t) ? 'thr+1 cr' : 'thr cr';
  out.push(Object.assign({ damage: dmg, baseDamage: dmg }, a));
  if (/sharp edge|borda afiada/.test(t)) out.push(Object.assign({ damage: 'sw-2 cut', baseDamage: 'sw-2 cut' }, a));
  return out;
}
// A carried shield as a weapon: its bash; null for a cloak or a line that is not a shield.
function dmShield(g, e) {
  var sh = g.shieldLines[e.id];
  if (!sh && e.kind === 'armor' && e.refId && !W.loaded.armors) loadCatalog('armors');
  var cat = !sh && gearIsShield(e) ? armorById(e.refId) : null; if (!sh && !cat) return null;
  var skill = (sh ? sh.base.skill : cat.skill) || 'Shield'; if (/^cloak\b/i.test(skill)) return null;
  var mods = sh ? sh.mods : [];
  return { attacks: dmShieldBash([e.name, e.notes].concat(mods.map(function (m) { return m.name; })).join(' '), skill, (sh ? sh.base.defaults : cat.defaults) || 'DX-4'),
    adj: { dmg: 0, nh: sh ? shieldAdjTotal(mods).nh : 0 }, mods: mods };
}
// The weapons and shields of the configuration in use, carried: [{ name, sub, attacks }]; null with
// none in use.
function dmCarried(ctx) {
  var g = sheetGear(ctx.s), active = g.bodies.filter(function (b) { return b.active; })[0];
  if (!active) return null;
  var by = gearIndex(g.equip), units = bodyUnits(active, by), out = [];
  Object.keys(units).forEach(function (id) {
    var e = by[id]; if (!e) return;
    if (e.kind === 'armor') {
      var sd = dmShield(g, e); if (!sd) return;
      var ssub = ['golpe de escudo', units[id] > 1 ? units[id] + ' no corpo' : '', sd.mods.map(function (m) { return m.name; }).join(', ')].filter(Boolean).join(' · ');
      out.push({ name: e.name, sub: ssub, attacks: sd.attacks.map(function (a) { return dmWeaponAttack(ctx, a, e.name, sd.adj); }) });
      return;
    }
    if (e.kind !== 'weapon') return;
    var cw = g.weaponLines[id], cat = !cw && e.refId && W.weaponIdx ? weaponById(e.refId) : null;
    if (!cw && e.refId && !W.loaded.weapons) loadCatalog('weapons');
    var attacks = cw ? cw.attacks : cat ? (cat.attacks || []).map(function (a) { return Object.assign({ baseDamage: a.damage }, a); }) : [];
    var adj = cw ? weaponAdjTotal(cw.mods) : { dmg: 0, nh: 0 };
    var sub = [units[id] > 1 ? units[id] + ' no corpo' : '', cw && cw.mods.length ? cw.mods.map(function (m) { return m.name; }).join(', ') : ''].filter(Boolean).join(' · ');
    out.push({ name: e.name, sub: sub, attacks: attacks.length ? attacks.map(function (a) { return dmWeaponAttack(ctx, a, e.name, adj); })
      : [{ mode: '', dmg: { text: '—', calc: 'Sem dados de ataque: crie a arma em Equip. › Criar Arma para ter o dano e o NH.' }, nh: null, reach: '', parry: '' }] });
  });
  return { body: active, weapons: out };
}
// The weapons and shields of the Corpo configuration in use, for the defenses (combatDefenses): as in
// dmCarried, only what is carried counts. weapons: each melee attack that parries, once a weapon and
// skill (swing and thrust parry the same), with the parry ("0F": modifier 0, fencing) and the NH
// (weaponNh, with the weapon's adjustments); shields: the shields and cloaks, with the NH and DB.
// null with no configuration in use.
function defCarried(s) {
  var g = sheetGear(s), active = g.bodies.filter(function (b) { return b.active; })[0];
  if (!active) return null;
  var by = gearIndex(g.equip), units = bodyUnits(active, by), out = { body: active.name, weapons: [], shields: [] }, seen = {};
  function nhOf(a, plus) { var nh = weaponNh(s, a, plus); return nh ? { v: nh.v, adj: plus } : null; }
  Object.keys(units).forEach(function (id) {
    var e = by[id]; if (!e) return;
    if (e.kind === 'armor') {
      if (e.refId && !W.loaded.armors) loadCatalog('armors');
      var sh = g.shieldLines[id], cat = !sh && gearIsShield(e) ? armorById(e.refId) : null; if (!sh && !cat) return;
      var skill = (sh ? sh.base.skill : cat.skill) || 'Shield';
      var nh = nhOf({ skill: skill, defaults: (sh ? sh.base.defaults : cat.defaults) || '' }, sh ? shieldAdjTotal(sh.mods).nh : 0); if (!nh) return;
      var db = parseInt(String(sh ? sh.db : cat.db), 10);
      out.shields.push({ name: e.name, skill: skill, nh: nh, db: isFinite(db) ? db : null });
      return;
    }
    if (e.kind !== 'weapon') return;
    var cw = g.weaponLines[id], wc = !cw && e.refId && W.weaponIdx ? weaponById(e.refId) : null;
    if (!cw && e.refId && !W.loaded.weapons) loadCatalog('weapons');
    var plus = cw ? weaponAdjTotal(cw.mods).nh : 0;
    (cw ? cw.attacks : wc ? wc.attacks || [] : []).forEach(function (a) {
      var m = /^([+-]?\d+)\s*([A-Za-z]*)/.exec(String(a.parry || '').trim()), key = id + '|' + norm(a.skill || '');
      if (!m || !a.skill || seen[key]) return;
      var nh = nhOf(a, plus); if (!nh) return;
      seen[key] = true;
      out.weapons.push({ name: e.name, skill: a.skill, nh: nh, mod: +m[1], flags: m[2].toUpperCase() });
    });
  });
  return out;
}
/* ---------- unarmed ---------- */
// The unarmed combat skills (pp. B182, B203, B223, B228; Martial Arts, pp. 55-61), in this order.
// bonus: what the level relative to DX gives: per die of damage for the strikes; to ST for
// Wrestling and Sumo Wrestling, which add it per die to the damage of their damaging attacks
// (Martial Arts, p. 61). Bonuses never stack: each attack uses the one of its skill.
// enc: Judo and Karate rolls (attacks, parries, techniques) take a penalty equal to the
// encumbrance level, Atributos › Peso (p. B203). dx: rolls against the higher of DX or the skill.
function dmUaPlus12(r) { return r >= 2 ? 2 : r >= 1 ? 1 : 0; }
var DM_UA = [
  { key: 'brawling', bonus: function (r) { return r >= 2 ? 1 : 0; } },
  { key: 'boxing', bonus: dmUaPlus12 },
  { key: 'karate', bonus: function (r) { return r >= 1 ? 2 : r >= 0 ? 1 : 0; }, enc: true },
  { key: 'judo', bonus: function () { return 0; }, enc: true },
  { key: 'wrestling', bonus: dmUaPlus12, dx: true },
  { key: 'sumo wrestling', bonus: dmUaPlus12, dx: true }];
// The unarmed techniques that do damage (Martial Arts, pp. 65-87; Basic Set, p. B230), when the
// sheet has them on one of the skills above. o: the damage, thr (sw with sw) plus [add, bonus a die]
// — several are "or ... if better", the best is used; aoa: the same as an All-Out Attack (in the
// explanation). label: the skill's row it replaces (its NH becomes the technique's). kick: the
// bonus is the higher of Brawling and Karate (Kicking). none: no skill bonus. flat: Wrestling
// adds its ST bonus once instead of a die. lift: the victim must weigh up to 4 × Basic Lift.
var DM_UA_TECH = {
  'kicking': { label: 'Chute', o: [[0, 0]], kick: true, reach: 'C, 1' },
  'bite': { label: 'Mordida', o: [[-1, 0]], reach: 'C' },
  'judo throw': { label: 'Arremesso', o: [[-1, 0]], none: true, reach: 'C, 1' },
  'elbow strike': { o: [[-1, 0]], reach: 'C' },
  'knee strike': { o: [[0, 0]], reach: 'C', note: 'contra um alvo agarrado, ele defende a -2' },
  'head butt': { o: [[-1, 0]], reach: 'C', note: '+1 de dano com elmo rígido' },
  'uppercut': { o: [[0, 0]], reach: 'C', note: 'só na parte de cima de um alvo em pé' },
  'hammer fist': { o: [[-2, 0]], reach: 'C' },
  'ear clap': { o: [[-3, 0]], reach: 'C' },
  'exotic hand strike': { o: [[0, 0]], reach: 'C', note: 'fere a mão contra qualquer RD' },
  'two-handed punch': { o: [[1, 0], [0, 1]], reach: 'C' },
  'eye-gouging': { o: [[-4, 0]], none: true, reach: 'C', note: 'em cada olho, nos turnos depois de agarrar' },
  'stamp kick': { o: [[1, 0]], kick: true, reach: 'C, 1', note: 'só contra um alvo deitado ou no pé ou na perna de um em pé' },
  'axe kick': { o: [[1, 0], [0, 0.5]], kick: true, reach: 'C, 1', note: 'Committed Attack' },
  'jump kick': { o: [[1, 0], [0, 0.5]], kick: true, reach: '1, 2' },
  'lethal kick': { o: [[-1, 0]], type: 'pi', reach: 'C, 1', note: 'fere o pé contra qualquer RD' },
  'lethal strike': { o: [[-2, 0]], type: 'pi', reach: 'C', note: 'fere a mão contra qualquer RD' },
  'elbow drop': { o: [[2, 0], [0, 1]], aoa: [[3, 0], [-1, 2]], flat: true, reach: 'C', note: 'Committed Attack, contra um alvo ajoelhado, sentado ou deitado' },
  'knee drop': { o: [[2, 0], [0, 1]], aoa: [[3, 0], [1, 1]], flat: true, reach: 'C', note: 'Committed Attack, contra um alvo deitado' },
  'piledriver': { o: [[4, 0], [2, 2]], flat: true, reach: 'C', lift: true, note: 'All-Out Attack, depois de agarrar com as duas mãos' },
  'wrench spine': { sw: true, o: [[0, 0]], reach: 'C', lift: true, note: 'disputa contra a maior entre ST+4 e HT+4 do alvo, depois de agarrar e levantar' } };
// "thr+1", "thr com +1 por dado", "thr com +1 a cada 2 dados".
function dmUaOptText(kind, o) {
  return kind + (o[0] ? (o[0] > 0 ? '+' : '') + o[0] : '') + (o[1] ? ' com +' + (o[1] < 1 ? '1 a cada 2 dados' : o[1] + ' por dado') : '');
}
// kind (thr/sw) at ST st with the best of the options, plus per a die and flat once.
function dmUaRoll(st, kind, opts, per, flat) {
  var base = gurpsDamage(Math.max(1, st))[kind], n = +((/^(\d+)d/.exec(base) || [0, 0])[1]), add = null;
  opts.forEach(function (o) { var x = o[0] + Math.floor(o[1] * n); if (add === null || x > add) add = x; });
  add += per * n + flat;
  return { base: base, dice: n, out: dmgAdd(base, add), raw: dmgAddRaw(base, add) };
}
// One unarmed attack with the skill k ({ name, v, per, pen }; DX is { name: 'DX', v, per: 0, pen: 0 }).
// o: { mode, kind (thr), opts, type, hit (to the NH: kick -2), nh (a technique's { name, v }, instead
// of k's and hit), per (a die, else k's), perFrom, flat, extra ({ per, from }: Claws), aoa, note,
// contest (no attack roll: why, for the NH column), reach, parry }. The NH takes k's encumbrance penalty.
function dmUaRow(ctx, k, o) {
  var st = ctx.dmgSt, kind = o.kind || 'thr', per = o.per != null ? o.per : k.per, flat = o.flat || 0, ex = o.extra || { per: 0, from: '' };
  var r = dmUaRoll(st, kind, o.opts, per + ex.per, flat);
  var calc = [(o.opts.length > 1 ? 'o melhor entre ' + joinE(o.opts.map(function (x) { return dmUaOptText(kind, x); })) : dmUaOptText(kind, o.opts[0])) + ' ' + o.type +
    ' com ' + dmStText(ctx, st) + ' (' + kind + ' ' + r.base + ')'];
  if (per) calc.push('+' + per * r.dice + ' de ' + (o.perFrom || k.name) + ' (+' + per + ' por dado)');
  if (flat) calc.push('+' + flat + ' de ' + k.name + ' (o bônus de ST, uma vez)');
  if (ex.per) calc.push('+' + ex.per * r.dice + ' de ' + ex.from + ' (+' + ex.per + ' por dado)');
  if (r.raw !== r.out) calc.push(r.raw + ' = ' + r.out + ' (+4 vira 1d, +7 vira 2d)');
  if (o.aoa) calc.push('como All-Out Attack: ' + dmUaRoll(st, kind, o.aoa, per + ex.per, flat).out + ' ' + o.type);
  if (o.note) calc.push(o.note);
  var src = o.nh || { name: k.name, v: k.v }, hit = o.nh ? 0 : o.hit || 0, v = src.v + hit - k.pen;
  return { mode: o.mode, dmg: { text: r.out + ' ' + o.type, calc: calc.join(' · '), bonus: !!(per || flat || ex.per) || st !== ctx.st },
    nh: o.contest ? { v: '—', bonus: false, title: o.contest } : { v: String(v), bonus: false, title: src.name + ' ' + src.v + (hit ? dmSign(hit) + ' (' + o.mode.toLowerCase() + ')' : '') + (k.pen ? dmSign(-k.pen) + ' de Peso' : '') + ' = ' + v },
    reach: o.reach, parry: o.parry || 'Não' };
}
// A row with no roll for damage (grapple, choke): text in the Dano column and why.
function dmUaInfo(mode, text, calc, nh, bonus, reach, parry) {
  return { mode: mode, dmg: { text: text, calc: calc, bonus: !!bonus }, nh: nh, reach: reach, parry: parry || 'Não' };
}
// Slam (p. B371): (HP × velocity) ÷ 100 dice; under 1d, 1d-3 up to 0.25, 1d-2 up to 0.5, else 1d-1.
function dmSlamDice(hp, vel) {
  var x = hp * vel / 100;
  return x <= 0 ? '' : x <= 0.25 ? '1d-3' : x <= 0.5 ? '1d-2' : x < 1 ? '1d-1' : Math.round(x) + 'd';
}
// Unarmed (pp. B271, B182, B203, B223, B228): one entry for each unarmed combat skill of the sheet,
// with its attacks, its damage bonus and its techniques that do damage; then DX for what no skill
// covers (punch, kick, bite, grapple), then the Strikers.
function dmUnarmed(ctx) {
  var fx = ctx.fx, dx = ctx.av.DX, out = [], has = {}, techs = {}, seen = {};
  var cl = fx.claws ? DM_CLAWS[fx.claws.kind] : null, bite = fx.teeth ? fx.teeth.type : 'cr';
  DM_UA.forEach(function (u) {
    var lv = dmLevel(ctx, u.key); if (!lv) return;
    var rel = lv.v - dx;
    has[u.key] = { key: u.key, name: lv.name, v: u.dx ? Math.max(lv.v, dx) : lv.v, lvl: lv.v, rel: rel, per: u.bonus(rel), pen: u.enc ? ctx.enc : 0 };
  });
  ctx.uaPen = [has.karate, has.judo].filter(function (k) { return k && k.pen; }).map(function (k) { return k.name; });
  // The sheet's techniques on those skills that do damage, with their NH.
  scAllItems(sheetCombat(ctx.s)).forEach(function (x) {
    if (x.kind !== 'tech' || seen[norm(x.name)]) return; seen[norm(x.name)] = true;
    var p = scSplitTech(x.name), spec = DM_UA_TECH[combatKey(p.tech)], b = combatKey(x.base || p.base);
    if (!spec || !has[b]) return;
    var nh = combatNh(x, ctx.pool, ctx.av); if (!nh || nh.abs == null) return;
    (techs[b] = techs[b] || []).push({ spec: spec, name: x.name, short: p.tech, nh: { name: x.name, v: nh.abs } });
  });
  function tech(key, label) { return (techs[key] || []).filter(function (t) { return t.spec.label === label; })[0]; }
  // Kicking: the higher of the Brawling and Karate bonuses.
  var kickBy = [has.brawling, has.karate].filter(Boolean).sort(function (a, b) { return b.per - a.per; })[0];
  var liftNote = 'só com um alvo de até 4 × Carga Básica (' + String(Math.round(ctx.r.lift * 4 * 10) / 10).replace('.', ',') + ' lbs)';
  function techRows(k) {
    return (techs[k.key] || []).filter(function (t) { return !t.spec.label; }).map(function (t) {
      var sp = t.spec, per = sp.none ? 0 : sp.kick && kickBy ? kickBy.per : sp.flat && k.key === 'wrestling' ? 0 : k.per;
      return dmUaRow(ctx, k, { mode: t.short, kind: sp.sw ? 'sw' : 'thr', opts: sp.o, aoa: sp.aoa, type: sp.type || 'cr', nh: t.nh, per: per,
        perFrom: sp.kick && kickBy ? kickBy.name : '', flat: sp.flat && k.key === 'wrestling' ? k.per : 0, reach: sp.reach,
        note: [sp.note, sp.lift ? liftNote : ''].filter(Boolean).join('; ') });
    });
  }
  // Claws (p. B42) with punch and kick; with Karate, at the GM's option (Martial Arts, p. 57).
  function claws(k, punch) {
    if (!cl || (punch && !cl[3]) || k.key === 'boxing') return { type: 'cr', extra: null, note: '' };
    return { type: cl[2], extra: cl[1] ? { per: cl[1], from: fx.claws.name } : null, note: k.key === 'karate' ? 'garras com Karate: a critério do mestre (Martial Arts, p. 57)' : '' };
  }
  function punch(k) { var c = claws(k, true); return dmUaRow(ctx, k, { mode: 'Soco', opts: [[-1, 0]], type: c.type, extra: c.extra, note: c.note, reach: 'C', parry: '0' }); }
  function kick(k) {
    var c = claws(k, false), t = tech(k.key, 'Chute');
    return dmUaRow(ctx, k, { mode: 'Chute', opts: [[0, 0]], type: c.type, extra: c.extra, hit: -2, nh: t && t.nh, per: t && kickBy ? kickBy.per : k.per,
      perFrom: t && kickBy ? kickBy.name : '', note: c.note, reach: 'C, 1' });
  }
  function biteRow(k) { var t = tech(k.key, 'Mordida'); return dmUaRow(ctx, k, { mode: 'Mordida', opts: [[-1, 0]], type: bite, nh: t && t.nh, reach: 'C' }); }
  function grab(k, st, what) {
    return dmUaInfo('Agarrar', 'ST ' + st, 'Agarrar não causa dano. ST ' + ctx.st + (st !== ctx.st ? ' + ' + (st - ctx.st) + ' de ' + k.name + ' (' + k.name + ' em DX' + (k.rel >= 0 ? '+' : '') + k.rel + ')' : '') + ' para ' + what + '.',
      { v: k.v - k.pen, bonus: false, title: (k.name === 'DX' ? 'DX ' + dx : k.lvl < dx ? 'DX ' + dx + ', maior que ' + k.name + ' ' + k.lvl : k.name + ' ' + k.lvl) + (k.pen ? dmSign(-k.pen) + ' de Peso' : '') + ' = ' + (k.v - k.pen) }, st !== ctx.st, 'C', '0');
  }
  function contest(title) { return { v: '—', bonus: false, title: title }; }
  function item(k, rows, sub) { if (rows.length) out.push({ name: k.name, sub: sub, attacks: rows }); }
  function subOf(k, bonus) { return ['NH ' + (k.v - k.pen), bonus, k.pen ? '−' + k.pen + ' de Peso' : ''].filter(Boolean).join(' · '); }

  if (has.brawling) {
    var k = has.brawling, rows = [punch(k), kick(k)];
    if (fx.teeth || tech('brawling', 'Mordida')) rows.push(biteRow(k));
    item(k, rows.concat(techRows(k)), subOf(k, k.per ? '+' + k.per + ' por dado' : 'bônus de dano em DX+2'));
  }
  if (has.boxing) { k = has.boxing; item(k, [punch(k)].concat(techRows(k)), subOf(k, (k.per ? '+' + k.per + ' por dado' : 'bônus de dano em DX+1') + ', só soco')); }
  if (has.karate) {
    k = has.karate; rows = [punch(k), kick(k)];
    if (fx.biting && (fx.teeth || tech('karate', 'Mordida'))) rows.push(biteRow(k));
    item(k, rows.concat(techRows(k)), subOf(k, k.per ? '+' + k.per + ' por dado' : 'bônus de dano em DX'));
  }
  if (has.judo) {
    k = has.judo; var jt = tech('judo', 'Arremesso');
    rows = [grab(k, ctx.st, 'agarrar e se soltar; Judo não dá bônus de ST'),
      dmUaRow(ctx, k, { mode: 'Arremesso', opts: [[-1, 0]], type: 'cr', per: 0, nh: jt && jt.nh, reach: 'C, 1',
        note: 'no turno depois de aparar com Judo ou de agarrar; derruba, e o alvo faz HT ou fica atordoado (B203). Para ferir, -1 no NH mais o da localização, sem bônus de perícia (Judo Throw, Martial Arts, p. 75)' })];
    item(k, rows.concat(techRows(k)), subOf(k, ''));
  }
  if (has.wrestling) {
    k = has.wrestling; var wst = ctx.st + k.per;
    rows = [grab(k, wst, 'agarrar, imobilizar, derrubar, chaves, estrangular, quebrar o pescoço e se soltar (B228)'),
      dmUaInfo('Estrangular', 'margin cr', 'Disputa rápida de ST ' + wst + ' contra a maior entre ST e HT do alvo: o dano cr é a margem de vitória (margin of victory). Precisa ter agarrado o pescoço (B370).',
        contest('Disputa de ST, sem jogada de ataque'), !!k.per, 'C'),
      dmUaRow(ctx, k, { mode: 'Quebrar pescoço', kind: 'sw', opts: [[0, 0]], type: 'cr', contest: 'Disputa rápida de ST ' + wst + ' contra HT, sem jogada de ataque', reach: 'C',
        note: 'disputa rápida de ST ' + wst + ' contra a HT do alvo, depois de agarrar a cabeça ou o pescoço com as duas mãos (B370)' })];
    item(k, rows.concat(techRows(k)), subOf(k, k.per ? '+' + k.per + ' de ST' : 'bônus de ST em DX+1'));
  }
  if (has['sumo wrestling']) {
    k = has['sumo wrestling']; var sst = ctx.st + k.per, sd = dmSlamDice(ctx.r.hp, ctx.r.moveNow);
    rows = [grab(k, sst, 'agarrar, derrubar (takedown) e se soltar (B223)')];
    if (sd) {
      var sn = +sd.split('d')[0], sraw = dmgAddRaw(sd, k.per * sn), sout = dmgAdd(sd, k.per * sn);
      rows.push(dmUaInfo('Encontrão', sout + ' cr', ['Slam a Deslocamento ' + ctx.r.moveNow + ': PV ' + ctx.r.hp + ' × ' + ctx.r.moveNow + ' ÷ 100 = ' + sd + ' (B371)',
        k.per ? '+' + k.per * sn + ' de ' + k.name + ' (+' + k.per + ' por dado)' : '', sraw !== sout ? sraw + ' = ' + sout + ' (+4 vira 1d, +7 vira 2d)' : '',
        'a velocidade é a relativa entre os dois; o alvo também causa dano em você'].filter(Boolean).join(' · '),
        { v: k.v, bonus: false, title: (k.lvl < dx ? 'DX ' + dx + ', maior que ' + k.name + ' ' + k.lvl : k.name + ' ' + k.lvl) + ' = ' + k.v }, !!k.per, 'C'));
    }
    item(k, rows.concat(techRows(k)), subOf(k, k.per ? '+' + k.per + ' de ST e por dado no encontrão' : 'bônus de ST em DX+1'));
  }
  // DX: what no skill of the sheet covers.
  var dxk = { key: 'dx', name: 'DX', v: dx, lvl: dx, rel: 0, per: 0, pen: 0 }, dxRows = [];
  if (!has.brawling && !has.boxing && !has.karate) dxRows.push(punch(dxk));
  if (!has.brawling && !has.karate) dxRows.push(kick(dxk));
  if (fx.teeth && !has.brawling && !(has.karate && fx.biting)) dxRows.push(biteRow(dxk));
  if (!has.judo && !has.wrestling && !has['sumo wrestling']) dxRows.push(grab(dxk, ctx.st, 'agarrar e se soltar'));
  if (dxRows.length) out.push({ name: 'Sem perícia', sub: 'DX ' + dx, attacks: dxRows });
  // Striker (p. B88): thrust +1 a die, with DX, Brawling or Karate (the best NH); no skill bonus.
  fx.strikers.forEach(function (s) {
    var b = [dxk, has.brawling, has.karate].filter(Boolean).sort(function (x, y) { return (y.v - y.pen) - (x.v - x.pen); })[0];
    out.push({ name: s.name, sub: b.name === 'DX' ? '' : 'com ' + b.name, attacks: [dmUaRow(ctx, b, { mode: 'Golpe', opts: [[0, 0]], type: s.type, per: 0, extra: { per: 1, from: s.name }, reach: 'C' })] });
  });
  return out;
}
// The attacks typed in the editor: the damage for the ST (with Striking ST); no NH (no skill).
function dmTyped(ctx, list) {
  var rows = [];
  list.forEach(function (w) {
    var last = rows[rows.length - 1], txt = weaponDamage(w, ctx.dmgSt);
    var r = { mode: w.mode === 'fixed' ? '' : w.mode === 'thr' ? 'thrust' : 'swing', reach: '', parry: '', nh: null,
      dmg: { text: txt + (txt !== '—' ? ' ' + w.type : ''), calc: w.mode === 'fixed' ? 'Dano fixo' : (w.mode === 'thr' ? 'thr' : 'sw') + (w.mod || '') + ' com ' + dmStText(ctx, ctx.dmgSt), bonus: w.mode !== 'fixed' && ctx.dmgSt !== ctx.st } };
    // Rows of the same weapon in a row share its name cell, as in the spreadsheet.
    if (last && last.name === (w.name || '—')) last.attacks.push(r); else rows.push({ name: w.name || '—', sub: '', attacks: [r] });
  });
  return rows;
}
function dmContext(s) {
  // enc: Atributos › Peso (Judo and Karate); r: HP, Move and Basic Lift (slam, Piledriver).
  var a = sheetAttrsNow(s), ctx = { s: s, av: attrValues(a), pool: combatSkillPool(sheetCombat(s), s), st: a.st, dmgSt: a.st, fx: null,
    enc: a.enc || 0, r: gurpsStats(a), uaPen: [] };
  ctx.fx = dmEffects(s, function (name) { return dmLevel(ctx, name); });
  ctx.dmgSt = a.st + ctx.fx.striking;
  return ctx;
}
// The sheet's NH in a skill it has with points (Combate or Perícias, with the talents): { name, v }, or null.
function dmLevel(ctx, name) {
  var k = scFindSkill(ctx.pool, name); if (!k || !(k.pts > 0)) return null;
  var x = cleanCombatItem(Object.assign({}, k, { kind: 'skill' })); x.tbonus = k.tbonus;
  var nh = combatNh(x, ctx.pool, ctx.av); return nh && nh.abs != null ? { name: k.name, v: nh.abs } : null;
}

/* ---------- view ---------- */
// The table's rows as last drawn, for the modal that explains a cell ({ name, sub, r }).
var DM_VIEW = /** @type {any[]} */ ([]);
// Damage and NH are buttons that open how they were reached (dmWhyModal); i: the row in DM_VIEW.
function dmWhyBtn(i, which, text, title) {
  return '<button class="dm-why" type="button" data-dmwhy="' + i + ':' + which + '" title="' + esc(title ? title + ' · clique para ver a conta' : 'Clique para ver a conta') + '">' + esc(text) + '</button>';
}
function dmCell(x, i) {
  return '<td class="gval' + (x.bonus ? ' bonus' : '') + '">' + (x.calc ? dmWhyBtn(i, 'dmg', x.text, x.calc) : esc(x.text)) + '</td>';
}
function dmNhCell(nh, i) {
  return nh ? '<td class="gval' + (nh.bonus ? ' bonus' : '') + '">' + dmWhyBtn(i, 'nh', String(nh.v), nh.title) + '</td>' : '<td title="Sem perícia nem padrão na ficha"><span class="eq-none">—</span></td>';
}

/* ---------- the explanation of a cell (modal) ---------- */
var DM_TYPE_PT = { cr: 'contusão (crushing)', cut: 'corte (cutting)', imp: 'perfuração (impaling)', 'pi-': 'perfurante pequeno (small piercing)', pi: 'perfurante (piercing)',
  'pi+': 'perfurante grande (large piercing)', 'pi++': 'perfurante enorme (huge piercing)', burn: 'queimadura (burning)', cor: 'corrosão (corrosion)', tox: 'toxina (toxic)', fat: 'fadiga (fatigue)' };
// "2d+1 cut": how to roll it and what it does.
function dmReadDice(text) {
  var m = /^(\d+)d([+-]\d+)?\s*(.*)$/.exec(String(text).trim()); if (!m) return '';
  // The least a hit does: 0 for crushing, 1 for the other types (p. B378).
  var n = +m[1], k = +m[2] || 0, avg = 3.5 * n + k, codes = m[3].split(/\s+ou\s+/).map(function (t) { return t.trim(); });
  var types = codes.map(function (t) { return DM_TYPE_PT[t]; }).filter(Boolean), least = codes.length && codes.every(function (t) { return t && t !== 'cr'; }) ? 1 : 0;
  return 'Role ' + plural(n, 'dado', 'dados') + ' de seis faces' + (k ? (k > 0 ? ' e some ' : ' e tire ') + Math.abs(k) : '') + ': de ' + Math.max(least, n + k) + ' a ' + (6 * n + k) +
    ', média ' + fmtDec(avg, avg % 1 ? 1 : 0) + '.' + (types.length ? ' Tipo: ' + types.join(' ou ') + '.' : '');
}
// "Karate 13 − 2 (chute) − 2 de Peso = 9" → [['Karate', '13'], ['(chute)', '− 2'], ['de Peso', '− 2']]: the
// first term is a value with its name, the others a sign and a number with what they are.
// A first term "X = n" is n with X as its name ("DX 12, maior que Wrestling 11 = 12", "padrão DX-5 = 7").
function dmNhTerms(title) {
  var parts = String(title).split(/\s(?=[+−-] \d)/);
  if (parts.length > 1) parts[parts.length - 1] = parts[parts.length - 1].replace(/\s=\s*-?\d+\s*$/, '');
  return parts.map(function (p, i) {
    if (i) {
      var s = /^([+−-] \d+)\s*(.*)$/.exec(p); if (!s) return [p, ''];
      var what = s[2].replace(/^\((.*)\)$/, '$1').replace(/^(de|dos|das|do|da)\s+/, '');
      return [what.charAt(0).toUpperCase() + what.slice(1), s[1]];
    }
    var eq = /^(.*?)\s*=\s*(-?\d+)$/.exec(p);
    if (eq) { var same = new RegExp('\\s' + eq[2] + '$'); return [same.test(eq[1]) ? eq[1].replace(same, '') : eq[1], eq[2]]; }
    var m = /^(.*?)\s(-?\d+)$/.exec(p);
    return m ? [m[1], m[2]] : [p, ''];
  });
}
function dmStepsHtml(rows) {
  return '<ol class="dm-steps">' + rows.map(function (r) { return '<li><span>' + esc(r[0]) + '</span>' + (r[1] ? '<b>' + esc(r[1]) + '</b>' : '') + '</li>'; }).join('') + '</ol>';
}
function dmWhyModal(e, which) {
  var r = e.r, sec = [];
  if (r.dmg && r.dmg.calc) {
    var read = dmReadDice(r.dmg.text);
    sec.push(['dmg', '<section class="dm-why-sec"><h3 class="sec-title">Dano</h3><div class="dm-why-big' + (r.dmg.bonus ? ' bonus' : '') + '">' + esc(r.dmg.text) + '</div>' +
      dmStepsHtml(r.dmg.calc.split(' · ').map(function (s) { return [s, '']; })) +
      (read ? '<p class="hint-text">' + esc(read) + '</p>' : '') + '</section>']);
  }
  if (r.nh) {
    var num = /^-?\d+$/.test(String(r.nh.v)), terms = num ? dmNhTerms(r.nh.title) : [];
    sec.push(['nh', '<section class="dm-why-sec"><h3 class="sec-title">NH</h3><div class="dm-why-big">' + esc(String(r.nh.v)) + '</div>' +
      (num ? dmStepsHtml(terms.concat([['Total', String(r.nh.v)]])) + '<p class="hint-text">Para acertar, role 3 dados e tire ' + r.nh.v + ' ou menos (3 ou 4 sempre acertam; 17 ou 18 sempre erram).</p>'
        : '<p class="hint-text">' + esc(r.nh.title) + '</p>') + '</section>']);
  }
  // The cell clicked comes first.
  sec.sort(function (a, b) { return (b[0] === which ? 1 : 0) - (a[0] === which ? 1 : 0); });
  var info = [r.reach ? 'Alcance ' + r.reach : '', r.parry ? 'Aparar ' + (/^no$/i.test(r.parry) ? 'Não' : r.parry) : ''].filter(Boolean).join(' · ');
  showModal('<div class="skill-modal dm-why-modal"><div class="skill-modal-head"><h2 id="dmWhyTitle">' + esc(e.name) + (r.mode ? ' · ' + esc(r.mode) : '') + '</h2>' +
    (e.sub || info ? '<p class="lede">' + esc([e.sub, info].filter(Boolean).join(' · ')) + '</p>' : '') + '</div>' + sec.map(function (x) { return x[1]; }).join('') + '</div>');
  modal.setAttribute('aria-labelledby', 'dmWhyTitle');
}
// A group that folds to its header (fold: its key) stays as the player left it, in this browser.
function dmFoldOpen(key) { return lstore('hounds_dm_fold_' + key) !== '0'; }
function dmGroupHtml(title, items, empty, fold) {
  var open = !fold || dmFoldOpen(fold), n0 = items.reduce(function (n, it) { return n + it.attacks.length; }, 0);
  var head = '<tr class="dm-group"><th colspan="6" scope="colgroup">' + (fold && items.length ? '<button class="dm-fold" type="button" data-dmfold="' + fold + '" aria-expanded="' + open + '" aria-label="Mostrar ou recolher ' + esc(title) + '">' +
    CHEV + esc(title) + '<span class="dm-fold-sum">· ' + plural(n0, 'ataque', 'ataques') + '</span></button>' : esc(title)) + '</th></tr>';
  if (!items.length) return empty ? head + '<tr><td colspan="6" class="gnone dm-name">' + esc(empty) + '</td></tr>' : '';
  var tr = '<tr' + (fold ? ' data-dmin="' + fold + '"' + (open ? '' : ' hidden') : '') + '>';
  return head + items.map(function (it) {
    var n = it.attacks.length;
    return it.attacks.map(function (r, i) {
      var k = DM_VIEW.push({ name: it.name, sub: it.sub, r: r }) - 1;
      return tr + (i ? '' : '<td class="dm-name"' + (n > 1 ? ' rowspan="' + n + '"' : '') + '><b>' + esc(it.name) + '</b>' + (it.sub ? '<small>' + esc(it.sub) + '</small>' : '') + '</td>') +
        '<td class="wmode">' + esc(r.mode || '—') + '</td>' + dmCell(r.dmg, k) + dmNhCell(r.nh, k) +
        '<td>' + esc(r.reach || '—') + '</td><td>' + esc(/^no$/i.test(r.parry) ? 'Não' : r.parry || '—') + '</td></tr>';
    }).join('');
  }).join('');
}
// What the sheet's advantages did, below the table.
function dmFxHtml(ctx) {
  var fx = ctx.fx, li = [];
  if (fx.striking) li.push(joinE(fx.strikingFrom) + ': ST ' + ctx.st + ' → ' + ctx.dmgSt + ' no dano de sw e thr (não nos arcos).');
  fx.masters.forEach(function (m) { li.push(m.name + ': ' + m.notes.map(function (t) { return t + '; '; }).join('') + (m.hits.length ? '+dano por dado com ' + joinE(m.hits) + '.' : 'nenhuma arma em uso coberta com a perícia em DX+1 ou mais.')); });
  fx.bonds.forEach(function (b) { li.push(b.name + ': ' + (b.hits.length ? '+1 no NH com ' + joinE(b.hits) + '.' : 'a arma não está no Corpo em uso.')); });
  if (fx.claws) { var c = DM_CLAWS[fx.claws.kind]; li.push(fx.claws.name + ' (' + c[0] + '): ' + (c[1] ? '+' + c[1] + ' por dado, ' : '') + c[2] + ' no ' + (c[3] ? 'soco e no chute' : 'chute') + ' (não com Boxing).'); }
  if (fx.teeth) li.push(fx.teeth.name + ': mordida thr-1 ' + fx.teeth.type + ' com Brawling ou DX' + (fx.biting ? ', e com Karate (' + fx.biting + ').' : '.'));
  if (ctx.uaPen.length) li.push('Peso ' + ctx.enc + ': −' + ctx.enc + ' no NH de ' + joinE(ctx.uaPen) + ', nas técnicas ' + (ctx.uaPen.length > 1 ? 'deles' : 'dele') + ' e no aparar (B203).');
  fx.strikers.forEach(function (k) { li.push(k.name + ': thr +1 por dado ' + k.type + '.'); });
  if (!li.length && !fx.warn.length) return '';
  return '<ul class="dm-fx">' + li.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') +
    fx.warn.map(function (t) { return '<li class="av-warn">' + esc(t) + '</li>'; }).join('') + '</ul>';
}
function sheetDamageHtml(s, editing) {
  var ui = S.ui, ctx = dmContext(s), head = scSectionHead('Danos', editing, 'dm', 'outros ataques');
  if (editing) return '<section class="gurps" id="damage">' + head + dmEditHtml(ui.dmgDraft, ctx) + '</section>';
  var carried = dmCarried(ctx), typed = dmTyped(ctx, sheetCombat(s).weapons);
  DM_VIEW = [];
  var body = dmGroupHtml(carried ? 'Armas em uso · ' + carried.body.name : 'Armas em uso', carried ? carried.weapons : [],
      carried ? 'Nenhuma arma no Corpo em uso (Equip. › Corpo).' : 'Nenhuma configuração do Corpo em uso: as armas aparecem aqui quando uma estiver em uso (Equip. › Corpo).', 'armed') +
    dmGroupHtml('Sem arma', dmUnarmed(ctx), '', 'ua') + dmGroupHtml('Outros ataques', typed);
  // The table and the list of the advantages below it; scrolls sideways when the half is too narrow.
  return '<section class="gurps" id="damage">' + head + '<div class="dm-wrap"><table class="gtab sc-dmg dm-tab"><thead><tr><th>Arma</th><th>Modo</th><th>Dano</th><th>NH</th><th>Alcance</th><th>Aparar</th></tr></thead><tbody>' + body + '</tbody></table>' +
    dmFxHtml(ctx) + '</div></section>';
}

/* ---------- editor: the other attacks ---------- */
function dmNewAttack(name) { return { name: name || '', mode: 'sw', mod: '', type: 'cut' }; }
function dmEditHtml(list, ctx) {
  var st = ctx.dmgSt;
  var rows = list.map(function (w, n) {
    var at = ' data-w="' + n + '"';
    return '<div class="sc-row">' + scField('Ataque', '<input type="text" data-f="wname"' + at + ' maxlength="120" value="' + esc(w.name) + '" placeholder="Ex.: Innate Attack, Cabeçada">', 'sc-name') +
      scField('Tipo', '<select data-f="wmode"' + at + '>' + scOpts(SC_MODES, w.mode) + '</select>') +
      scField(w.mode === 'fixed' ? 'Dano' : 'Modificador', '<input type="text" data-f="wmod"' + at + ' maxlength="40" value="' + esc(w.mod) + '" placeholder="' + (w.mode === 'fixed' ? 'Ex.: 3d' : 'Ex.: +1') + '">') +
      scField('Status', '<select data-f="wtype"' + at + '>' + scOpts(SC_DMG_TYPES, w.type) + '</select>') +
      '<span class="sc-nh" data-wdmg="' + n + '">' + esc(weaponDamage(w, st)) + '</span>' +
      '<button class="icon-btn" type="button" data-delw="' + n + '" aria-label="Remover ataque" title="Remover">' + svg(ICON.x, 15, 2.4) + '</button></div>';
  }).join('');
  return '<div class="box sc-edit"><h3 class="sec-title" style="margin:0">Outros ataques</h3><div class="sc-rows">' + rows + '</div>' +
    '<div><button class="btn" type="button" id="dmAdd">' + svg(ICON.plus, 14, 2.4) + 'Adicionar ataque</button></div>' +
    '<p class="hint-text" style="margin:0">As armas do Corpo em uso e os ataques das perícias desarmadas entram sozinhos na tabela, com o NH e as vantagens da ficha. Aqui ficam os outros ataques. ' +
    'swing e thrust usam o dano da ST (' + st + (st !== ctx.st ? ', com Striking ST' : '') + ': sw ' + gurpsDamage(st).sw + ', thr ' + gurpsDamage(st).thr + ') mais o modificador. Repita o nome para cada modo do mesmo ataque.</p></div>' +
    '<div class="form-err" id="dmErr" role="alert"></div>';
}
function wireSheetDamage(s) {
  var ui = S.ui, ed = $('dmEdit');
  if (ed) ed.onclick = function () {
    ui.dmgDraft = sheetCombat(s).weapons;
    if (!ui.dmgDraft.length) ui.dmgDraft.push(dmNewAttack(''));
    renderSheetPage();
    var first = document.querySelector('#damage [data-f="wname"]'); if (first instanceof HTMLElement) first.focus();
  };
  // Fold a group in place (no redraw).
  var sec = $('damage');
  if (sec) sec.querySelectorAll('[data-dmfold]').forEach(function (b) {
    b.addEventListener('click', function () {
      var key = b.getAttribute('data-dmfold'), open = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', String(open)); lstore('hounds_dm_fold_' + key, open ? '1' : '0');
      sec.querySelectorAll('[data-dmin="' + key + '"]').forEach(function (r) { /** @type {HTMLElement} */ (r).hidden = !open; });
    });
  });
  // Damage or NH clicked: how it was reached.
  if (sec) sec.querySelectorAll('[data-dmwhy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var p = b.getAttribute('data-dmwhy').split(':'), e = DM_VIEW[+p[0]];
      if (e) dmWhyModal(e, p[1]);
    });
  });
  var d = ui.dmgDraft, box = $('damage'); if (!d || !box || !$('dmSave')) return;
  var st = dmContext(s).dmgSt;
  function onEdit(e) {
    var el = /** @type {AnyEl} */ (e.target), f = el && el.dataset && el.dataset.f, n = el && el.getAttribute && el.getAttribute('data-w');
    var w = n != null ? d[+n] : null; if (!f || !w) return;
    w[{ wname: 'name', wmode: 'mode', wmod: 'mod', wtype: 'type' }[f]] = el.value;
    if (f === 'wmode' && e.type === 'change') { renderSheetPage(); return; }
    var out = box.querySelector('[data-wdmg="' + n + '"]'); if (out) out.textContent = weaponDamage(cleanCombat({ weapons: [w] }).weapons[0], st);
  }
  box.addEventListener('input', onEdit); box.addEventListener('change', onEdit);
  box.addEventListener('click', function (e) {
    var b = /** @type {AnyEl} */ (e.target).closest && /** @type {AnyEl} */ (e.target).closest('[data-delw]'); if (!b) return;
    d.splice(+b.getAttribute('data-delw'), 1); renderSheetPage();
  });
  $('dmAdd').onclick = function () {
    d.push(dmNewAttack(d.length ? d[d.length - 1].name : ''));
    renderSheetPage();
    var rows = document.querySelectorAll('#damage [data-f="wname"]'), last = rows[rows.length - 1]; if (last instanceof HTMLElement) last.focus();
  };
  $('dmCancel').onclick = function () { ui.dmgDraft = null; renderSheetPage(); };
  $('dmSave').onclick = function () {
    scSaving('dm', 'outros ataques', true); $('dmErr').textContent = '';
    Ops.saveSheetCombatPart(s, { weapons: d }).then(function () { ui.dmgDraft = null; toast('Ataques salvos.'); renderSheetPage(); }, function (er) {
      scSaving('dm', 'outros ataques', false); $('dmErr').textContent = errorText(er);
    });
  };
}
