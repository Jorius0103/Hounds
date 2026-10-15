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
     the unarmed attacks: punch and kick, and bite and Striker with those advantages, with the skill
       that hits best (Brawling, Boxing, Karate or DX) and its damage bonus;
     the other attacks, typed by the player (sheet.combat.weapons, the editor), with the ST.
   The advantages that count are the sheet's (Vantagens, and the perks and advantages of Combate with
   points) that change damage or NH, from Mundo › Vantagens (dmEffects). Talents already count in the
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
    var best = null;
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
// { text: '2d+3 cut', base: '1d+2', kind: 'sw', dice: 1, conv }. Every +4 of the add is +1d
// (dmgAdd); conv says so when it happened ("2d+7 = 3d+3"). A damage with no sw/thr ("2d+1 pi",
// "spec.") stays as it is (sw: false).
function dmDice(dmg, st, perDie) {
  var t = String(dmg || '').trim(), m = /^(sw|thr)([+-]\d+)?(.*)$/i.exec(t);
  if (!m) return { text: t || '—', sw: false, dice: 0, conv: '' };
  var kind = m[1].toLowerCase(), base = gurpsDamage(Math.max(1, st))[kind], dice = +((/^(\d+)d/.exec(base) || [0, 0])[1]);
  var add = (m[2] ? +m[2] : 0) + perDie * dice, raw = dmgAddRaw(base, add), out = dmgAdd(base, add);
  return { text: out + m[3], sw: true, base: base, kind: kind, dice: dice, conv: raw !== out ? raw + ' = ' + out + ' (cada +4 vira +1d)' : '' };
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
// Unarmed (pp. B271, B182, B203): who hits best, and the damage bonus a die of the skill used.
//   Brawling: +1 a die at DX+2 (punch, kick, bite); Boxing: +1 at DX+1, +2 at DX+2 (punch only);
//   Karate: +1 at DX, +2 at DX+1 (punch and kick; bite with Biting Mastery). Kick at -2.
function dmUnarmed(ctx) {
  var fx = ctx.fx, dx = ctx.av.DX;
  var br = dmLevel(ctx, 'Brawling'), bx = dmLevel(ctx, 'Boxing'), ka = dmLevel(ctx, 'Karate');
  function per(k, rule) { var r = k.v - dx; return rule === 'br' ? (r >= 2 ? 1 : 0) : rule === 'bx' ? (r >= 2 ? 2 : r >= 1 ? 1 : 0) : (r >= 1 ? 2 : r >= 0 ? 1 : 0); }
  // The skill to use: the best NH; on a tie, the bigger bonus.
  function best(rules, pen, noBonus) {
    var opts = [{ name: 'DX', v: dx + pen, per: 0 }];
    rules.forEach(function (r) { var k = { br: br, bx: bx, ka: ka }[r]; if (k) opts.push({ name: k.name, v: k.v + pen, per: noBonus ? 0 : per(k, r) }); });
    return opts.sort(function (a, b) { return b.v - a.v || b.per - a.per; })[0];
  }
  function row(label, dmg, type, rules, pen, extraPer, extraFrom, reach, parry, noBonus) {
    var b = best(rules, pen, noBonus), d = dmDice(dmg, ctx.dmgSt, b.per + extraPer), calc = [dmg + ' ' + type + ' com ' + dmStText(ctx, ctx.dmgSt) + ' (thr ' + d.base + ')'];
    if (b.per && d.dice) calc.push('+' + b.per * d.dice + ' de ' + b.name + ' (+' + b.per + ' por dado)');
    if (extraPer && d.dice) calc.push('+' + extraPer * d.dice + ' de ' + extraFrom + ' (+' + extraPer + ' por dado)');
    if (d.conv) calc.push(d.conv);
    return { name: label, sub: b.name === 'DX' ? '' : 'com ' + b.name, attacks: [{ mode: 'thrust', dmg: { text: d.text + ' ' + type, calc: calc.join(' · '), bonus: !!(b.per || extraPer) || ctx.dmgSt !== ctx.st },
      nh: { v: b.v, bonus: false, title: b.name + (pen ? ' ' + pen : '') + ' = ' + b.v + ' (o melhor entre DX e as perícias de combate desarmado da ficha)' }, reach: reach, parry: parry }] };
  }
  var cl = fx.claws ? DM_CLAWS[fx.claws.kind] : null, out = [];
  out.push(row('Soco', 'thr-1', cl && cl[3] ? cl[2] : 'cr', ['br', 'bx', 'ka'], 0, cl && cl[3] ? cl[1] : 0, fx.claws && fx.claws.name, 'C', '0'));
  out.push(row('Chute', 'thr', cl ? cl[2] : 'cr', ['br', 'ka'], -2, cl ? cl[1] : 0, fx.claws && fx.claws.name, 'C, 1', 'Não'));
  if (fx.teeth) out.push(row('Mordida', 'thr-1', fx.teeth.type, fx.biting ? ['br', 'ka'] : ['br'], 0, 0, '', 'C', 'Não'));
  // Striker (p. B88): thrust +1 a die, with DX, Brawling or Karate; no skill bonus to its damage.
  fx.strikers.forEach(function (k) { out.push(row(k.name, 'thr', k.type, ['br', 'ka'], 0, 1, k.name, 'C', 'Não', true)); });
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
  var a = S.ui.attrDraft || sheetAttrs(s), ctx = { s: s, av: attrValues(a), pool: combatSkillPool(sheetCombat(s), s), st: a.st, dmgSt: a.st, fx: null };
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
function dmCell(x) {
  return '<td class="gval' + (x.bonus ? ' bonus' : '') + '"' + (x.calc ? ' title="' + esc(x.calc) + '"' : '') + '>' + esc(x.text) + '</td>';
}
function dmNhCell(nh) {
  return nh ? '<td class="gval' + (nh.bonus ? ' bonus' : '') + '" title="' + esc(nh.title) + '">' + nh.v + '</td>' : '<td title="Sem perícia nem padrão na ficha"><span class="eq-none">—</span></td>';
}
function dmGroupHtml(title, items, empty) {
  var head = '<tr class="dm-group"><th colspan="6" scope="colgroup">' + esc(title) + '</th></tr>';
  if (!items.length) return empty ? head + '<tr><td colspan="6" class="gnone dm-name">' + esc(empty) + '</td></tr>' : '';
  return head + items.map(function (it) {
    var n = it.attacks.length;
    return it.attacks.map(function (r, i) {
      return '<tr>' + (i ? '' : '<td class="dm-name"' + (n > 1 ? ' rowspan="' + n + '"' : '') + '><b>' + esc(it.name) + '</b>' + (it.sub ? '<small>' + esc(it.sub) + '</small>' : '') + '</td>') +
        '<td class="wmode">' + esc(r.mode || '—') + '</td>' + dmCell(r.dmg) + dmNhCell(r.nh) +
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
  if (fx.claws) { var c = DM_CLAWS[fx.claws.kind]; li.push(fx.claws.name + ' (' + c[0] + '): ' + (c[1] ? '+' + c[1] + ' por dado, ' : '') + c[2] + ' no ' + (c[3] ? 'soco e no chute.' : 'chute.')); }
  if (fx.teeth) li.push(fx.teeth.name + ': mordida thr-1 ' + fx.teeth.type + (fx.biting ? ', com Karate (' + fx.biting + ').' : '.'));
  fx.strikers.forEach(function (k) { li.push(k.name + ': thr +1 por dado ' + k.type + '.'); });
  if (!li.length && !fx.warn.length) return '';
  return '<ul class="dm-fx">' + li.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') +
    fx.warn.map(function (t) { return '<li class="av-warn">' + esc(t) + '</li>'; }).join('') + '</ul>';
}
function sheetDamageHtml(s, editing) {
  var ui = S.ui, ctx = dmContext(s), head = scSectionHead('Danos', editing, 'dm', 'outros ataques');
  if (editing) return '<section class="gurps" id="damage">' + head + dmEditHtml(ui.dmgDraft, ctx) + '</section>';
  var carried = dmCarried(ctx), typed = dmTyped(ctx, sheetCombat(s).weapons);
  var body = dmGroupHtml(carried ? 'Armas em uso · ' + carried.body.name : 'Armas em uso', carried ? carried.weapons : [],
      carried ? 'Nenhuma arma no Corpo em uso (Equip. › Corpo).' : 'Nenhuma configuração do Corpo em uso: as armas aparecem aqui quando uma estiver em uso (Equip. › Corpo).') +
    dmGroupHtml('Sem arma', dmUnarmed(ctx)) + dmGroupHtml('Outros ataques', typed);
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
    '<p class="hint-text" style="margin:0">As armas do Corpo em uso e o soco e o chute entram sozinhos na tabela, com o NH e as vantagens da ficha. Aqui ficam os outros ataques. ' +
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
