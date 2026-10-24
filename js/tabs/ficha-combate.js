/* =====================================================================
   Hounds — Ficha › Combate
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html (depois de tab-fichas.js e tab-combate.js).
   ===================================================================== */
'use strict';

/* =====================================================================
   sheet.combat = {
     styles:  [{ name, styleId?, items: [item] }]   fighting styles, each a group as in the
                                                    player's spreadsheet (styleId: Regras › Combate)
     general: [item]                                combat skills outside any style
   generalPos: n                                  where its table went among the styles'; no longer
                                                  used: it is the main table, always first (the
                                                  styles are dragged into any order, kept in the array)
     weapons: [{ name, mode, mod, type }]           damage table: mode 'sw' | 'thr' | 'fixed';
                                                    mod '+1' added to the ST damage, or the damage
                                                    itself ('3d') when fixed; type 'cut', 'imp'...
     def:     { parry, parryBonus, parryNote, block, blockBonus, blockNote, dodgeBonus, dodgeNote, db }
                                                    active defenses; the notes say why each bonus
   }
   item: { kind: 'skill', name, attr, diff, pts, bonus, bonusNote?, skillId? }   level from the points, as in Perícias
       | { kind: 'tech', name, base, diff (A/H), def, max, pts, bonus, bonusNote?, techId? }
                                                    bonusNote: why the bonus (see cleanBonusNote)
                                                    technique: default def and limit max relative
                                                    to the base skill (null: no limit)
       | { kind: 'trait', name, pts }                perks and advantages: only points
       | { kind: 'spell', name, pts, bonus, diff, spellId? }  a spell of the style, as in the Magia tab
                                                    (IQ, H or VH, no default; Magery and the
                                                    advantages' effects count: applyMagery)
   ===================================================================== */
// The kind of a row (its select); the buttons that add one (SC_ADD) split perks from advantages, both
// 'trait': a perk starts at 1 point, an advantage at its cost in Regras › Vantagens.
var SC_KINDS = [['skill', 'Perícia'], ['tech', 'Técnica'], ['trait', 'Perk ou vantagem'], ['spell', 'Magia']];
var SC_ADD = [['skill', 'Perícia'], ['tech', 'Técnica'], ['perk', 'Perk'], ['adv', 'Vantagem'], ['spell', 'Magia']];
var SC_MODES = [['sw', 'swing'], ['thr', 'thrust'], ['fixed', 'fixo']];
var SC_DMG_TYPES = [['cut', 'Cutting'], ['imp', 'Impaling'], ['cr', 'Crushing'], ['pi-', 'Small Piercing'], ['pi', 'Piercing'], ['pi+', 'Large Piercing'],
  ['pi++', 'Huge Piercing'], ['burn', 'Burning'], ['cor', 'Corrosion'], ['tox', 'Toxic'], ['fat', 'Fatigue'], ['spec', 'Special']];
// The melee weapon skills point to "Melee Weapon" in the skills list, which has no difficulty
// of its own (Basic Set, pp. 208-209); all are DX.
var SC_MELEE_DIFF = { 'axe/mace': 'A', 'two-handed axe/mace': 'A', 'broadsword': 'A', 'flail': 'H', 'two-handed flail': 'H', 'force sword': 'A',
  'force whip': 'A', 'jitte/sai': 'A', 'knife': 'E', 'kusari': 'H', 'main-gauche': 'A', 'monowire whip': 'H', 'polearm': 'A', 'rapier': 'A',
  'saber': 'A', 'shortsword': 'A', 'smallsword': 'A', 'spear': 'A', 'staff': 'A', 'tonfa': 'A', 'two-handed sword': 'A', 'whip': 'A', 'lance': 'A' };

function scStr(v, n) { return String(v == null ? '' : v).trim().slice(0, n); }
function cleanCombatItem(x) {
  x = x || {};
  var kind = x.kind === 'tech' || x.kind === 'trait' || x.kind === 'spell' ? x.kind : 'skill';
  var o = { kind: kind, name: scStr(x.name, 120), pts: cleanInt(x.pts, 0, 999, kind === 'tech' ? 0 : 1) };
  if (kind === 'trait') return o;
  o.bonus = cleanInt(x.bonus, -20, 20, 0);
  var note = o.bonus ? cleanBonusNote(x.bonusNote) : ''; if (note) o.bonusNote = note;
  if (kind === 'spell') {
    o.diff = x.diff === 'VH' ? 'VH' : 'H';
    if (typeof x.spellId === 'string' && x.spellId) o.spellId = x.spellId.slice(0, 200);
  } else if (kind === 'skill') {
    o.attr = SKILL_ATTRS.indexOf(x.attr) >= 0 ? x.attr : 'DX';
    o.diff = SKILL_DIFFS[x.diff] ? x.diff : 'A';
    if (typeof x.skillId === 'string' && x.skillId) o.skillId = x.skillId.slice(0, 200);
  } else {
    o.base = scStr(x.base, 100);
    o.diff = x.diff === 'A' ? 'A' : 'H';
    o.def = cleanInt(x.def, -20, 10, 0);
    o.max = x.max === '' || x.max == null ? null : cleanInt(x.max, -20, 20, 0);
    if (typeof x.techId === 'string' && x.techId) o.techId = x.techId.slice(0, 200);
  }
  return o;
}
function cleanCombat(c) {
  c = c || {};
  var items = function (l) { return (Array.isArray(l) ? l : []).map(cleanCombatItem); };
  var def = c.def || {}, styles = Array.isArray(c.styles) ? c.styles : [];
  return {
    generalPos: Math.min(cleanInt(c.generalPos, 0, 999, styles.length), styles.length),
    styles: (Array.isArray(c.styles) ? c.styles : []).map(function (st) {
      var o = { name: scStr(st && st.name, 120), items: scSfFirst(items(st && st.items)) };
      if (st && typeof st.styleId === 'string' && st.styleId) o.styleId = st.styleId.slice(0, 200);
      return o;
    }),
    general: items(c.general),
    weapons: (Array.isArray(c.weapons) ? c.weapons : []).map(function (w) {
      w = w || {};
      return { name: scStr(w.name, 120), mode: ['sw', 'thr', 'fixed'].indexOf(w.mode) >= 0 ? w.mode : 'sw', mod: scStr(w.mod, 40),
        type: SC_DMG_TYPES.some(function (t) { return t[0] === w.type; }) ? w.type : 'cr' };
    }),
    def: { parry: scStr(def.parry, 120), parryBonus: cleanInt(def.parryBonus, -20, 20, 0), parryNote: def.parryBonus ? cleanBonusNote(def.parryNote) : '', block: scStr(def.block, 120),
      blockBonus: cleanInt(def.blockBonus, -20, 20, 0), blockNote: def.blockBonus ? cleanBonusNote(def.blockNote) : '', dodgeBonus: cleanInt(def.dodgeBonus, -20, 20, 0),
      dodgeNote: def.dodgeBonus ? cleanBonusNote(def.dodgeNote) : '', db: cleanInt(def.db, 0, 10, 0) }
  };
}
function sheetCombat(s) { return cleanCombat(s && s.combat); }
// The draft (or saved data) as it will be stored: rows without a name and empty styles go.
function combatForSave(c) {
  var out = cleanCombat(c), named = function (x) { return x.name; };
  out.styles = out.styles.map(function (st) { st.items = st.items.filter(named); return st; }).filter(function (st) { return st.name || st.items.length; });
  out.general = out.general.filter(named);
  out.generalPos = Math.min(out.generalPos, out.styles.length);
  out.weapons = out.weapons.filter(function (w) { return w.name || w.mod; });
  return out;
}
function combatTotal(c) { return c.styles.reduce(function (n, st) { return n + sumPts(st.items); }, sumPts(c.general)); }
function scStylesTotal(c) { return combatTotal(c) - sumPts(c.general); }

/* ---------- levels ---------- */
// Every skill the sheet knows (Combate and Perícias), for the techniques' base skills.
function combatSkillPool(c, s) {
  var pool = [];
  c.styles.forEach(function (st) { st.items.forEach(function (x) { if (x.kind === 'skill') pool.push(x); }); });
  c.general.forEach(function (x) { if (x.kind === 'skill') pool.push(x); });
  // The talents' bonus (Ficha › Vantagens) on the skills of Perícias, and so on the techniques built on
  // them; not on the combat skills, which the talents don't cover.
  return applyTalents(pool, s, true).concat(applyTalents(sheetSkills(s), s));
}
function scFindSkill(pool, name) {
  var n = norm(name), key = combatKey(name);
  return pool.filter(function (k) { return norm(k.name) === n; })[0] || pool.filter(function (k) { return combatKey(k.name) === key; })[0] || null;
}
// Levels a technique's points buy: Average 1 point a level; Hard 2 for the first, then 1 each.
function techLevels(t) { return t.diff === 'A' ? t.pts : t.pts >= 2 ? t.pts - 1 : 0; }
// { rel: 'DX+5', lvl: '17', waste, base } of any item; null for perks and advantages.
function combatNh(x, pool, av) {
  if (x.kind === 'trait') return null;
  if (x.kind === 'spell') {
    // Magery and the effects of the sheet open (applyMagery), as in the Magia tab.
    var sp = pageSheet(); if (sp) applyMagery([x], sp);
    var sn = sheetSpellNh(x, av.IQ), sabs = /^-?\d+$/.test(sn.lvl) ? +sn.lvl : null;
    return { rel: sn.rel, lvl: sn.lvl, waste: skillWaste(x), abs: sabs, attr: 'IQ' };
  }
  if (x.kind === 'skill') { var nh = skillNh(x, av); return { rel: nh.rel, lvl: nh.lvl, waste: skillWaste(x), abs: nh.lvl === 'sem padrão' ? null : +nh.lvl, attr: x.attr }; }
  var b = scFindSkill(pool, x.base);
  if (!b) return { rel: '—', lvl: x.base ? 'sem ' + x.base : 'sem perícia-base', waste: 0, abs: null };
  var brel = skillRel(b);
  if (brel == null) return { rel: '—', lvl: b.name + ' sem padrão', waste: 0, abs: null };
  var babs = av[b.attr] + brel, levels = techLevels(x), waste = 0;
  if (x.max != null && x.def + levels > x.max) {
    var over = x.def + levels - x.max;
    waste = Math.min(x.pts, over); levels -= over;
  }
  if (x.diff === 'H' && x.pts === 1) waste = 1;
  var abs = babs + x.def + levels + x.bonus, rel = abs - av[b.attr];
  return { rel: b.attr + (rel > 0 ? '+' + rel : rel < 0 ? String(rel) : ''), lvl: String(abs), waste: waste, abs: abs, attr: b.attr };
}
// Enhanced Block/Parry/Dodge bought in the combat section count in the defenses.
function scEnhanced(c, kind) {
  var per = kind === 'Dodge' ? 15 : 5, n = 0, re = new RegExp('^Enhanced ' + kind, 'i');
  c.styles.concat([{ items: c.general }]).forEach(function (st) {
    st.items.forEach(function (x) { if (x.kind === 'trait' && re.test(x.name)) n += Math.floor(x.pts / (kind === 'Parry' && /\(all/i.test(x.name) ? 10 : per)); });
  });
  return n;
}
function scAllItems(c) { var l = []; c.styles.forEach(function (st) { l = l.concat(st.items); }); return l.concat(c.general); }
// "2d-1" plus 2 is "2d+1". An add of +4 or more becomes dice (Modifying Dice + Adds, B269): +7 is
// +2d and +4 is +1d ("2d+4" is "3d", "2d+5" is "3d+1", "2d+7" is "4d", "2d+8" is "4d+1").
// dmgAddRaw keeps the add as it is ("2d+7").
function dmgAddRaw(dice, add) {
  var m = /^(\d+)d([+-]\d+)?$/.exec(dice); if (!m) return dice;
  var k = (+m[2] || 0) + add;
  return m[1] + 'd' + (k > 0 ? '+' + k : k < 0 ? String(k) : '');
}
function dmgAdd(dice, add) {
  var m = /^(\d+)d([+-]\d+)?$/.exec(dice); if (!m) return dice;
  var n = +m[1], k = (+m[2] || 0) + add;
  while (k >= 4) { if (k >= 7) { n += 2; k -= 7; } else { n += 1; k -= 4; } }
  return n + 'd' + (k > 0 ? '+' + k : k < 0 ? String(k) : '');
}
function weaponDamage(w, st) {
  if (w.mode === 'fixed') return w.mod || '—';
  var base = gurpsDamage(st)[w.mode === 'thr' ? 'thr' : 'sw'], add = /^[+-]?\d+$/.test(w.mod) ? +w.mod : 0;
  return dmgAdd(base, add);
}

/* ---------- catalog helpers (Regras › Combate) ---------- */
// "Counterattack (Broadsword)" -> technique Counterattack on Broadsword.
function scSplitTech(name) { var m = /^(.*?)\s*\(([^()]*)\)\s*$/.exec(name); return m ? { tech: m[1], base: m[2] } : { tech: name, base: '' }; }
// The default of a technique on a given base skill: "Judo-2 or Wrestling-3", "prerequisite skill-5".
function techDefaultFor(t, base) {
  var txt = String(t.defaults || ''), key = combatKey(base), single = null, hit = null;
  txt.split(/\s+or\s+|;\s*|,\s*/).forEach(function (p) {
    var m = /^(.*?)\s*([+-]\d+)?\s*$/.exec(p.trim()); if (!m || hit !== null) return;
    var n = m[2] ? +m[2] : 0;
    if (/prerequisite skill|^skill$/i.test(m[1]) || (key && combatKey(m[1]) === key)) hit = n;
    if (single === null) single = n;
  });
  return hit !== null ? hit : single !== null ? single : 0;
}
function techMaxOf(t) {
  var m = /cannot exceed\s+([^;*]*?)(?:\s*([+-]\d+))?\s*(?:[;*]|$)/i.exec(t.prerequisites || '');
  return m ? (m[2] ? +m[2] : 0) : null;
}
/* Targeted Attacks (Martial Arts, p. 68): a Hard technique written "Targeted Attack (Skill Attack/Target)"
   or "TA (Skill Attack/Target)" — TA (Boxing Punch/Face), TA (Karate Knee Strike/Groin), TA (Rapier
   Thrust/Vitals Chinks). The default is the skill at the penalty to hit the target, plus a special
   attack's own penalty; the technique buys off up to half of it, rounded up. taParse(name) gives
   { skill, attack, target, def, max, why } (why: where the default comes from), or null. */
var TA_STRIKE = /** @type {[RegExp, number][]} */ ([[/^eyes?$/, -9], [/^skull$/, -7], [/^(face|neck)$/, -5], [/^(hands?|feet|foot)$/, -4], [/^(groin|vitals)$/, -3], [/^(arms?|legs?)$/, -2]]);
// Grapples: half the location penalty (Skull, Groin and Vitals rounded up).
var TA_GRAPPLE = /** @type {[RegExp, number][]} */ ([[/^skull$/, -4], [/^(face|neck)$/, -3], [/^(hands?|feet|foot)$/, -2], [/^(groin|vitals)$/, -2], [/^(arms?|legs?)$/, -1]]);
// The attacks, longest first; a special one adds its penalty when defaulting from the skill.
var TA_ATTACKS = /** @type {[string, number][]} */ ([['lethal kick', -4], ['lethal strike', -2], ['elbow strike', -2], ['knee strike', -1], ['return strike', 0], ['kicking', -2], ['kick', -2],
  ['disarming', 0], ['disarm', 0], ['swing', 0], ['thrust', 0], ['punch', 0], ['grab', 0], ['grapple', 0], ['throw', 0]]);
var TA_FENCING = ['main-gauche', 'rapier', 'saber', 'smallsword'];
function taParse(name) {
  var m = /^(?:targeted attacks?|ta)\s*\(\s*(.+?)\s*\/\s*(.+?)\s*\)\s*$/i.exec(String(name || '').trim()); if (!m) return null;
  var left = m[1], low = norm(left), att = TA_ATTACKS.filter(function (a) { return low === a[0] || low.slice(-a[0].length - 1) === ' ' + a[0]; })[0];
  var skill = att ? left.slice(0, left.length - att[0].length).trim() : left.replace(/\s+\S+$/, '');
  var attack = att ? att[0] : norm(left.replace(/^.*\s/, '')), target = norm(m[2]).trim(), why = [], pen = 0;
  if (!skill) return null;
  var grapple = attack === 'grab' || attack === 'grapple', loc = target.replace(/\s*chinks?$/, '');
  if (/chinks?$/.test(target)) { pen = loc === 'torso' ? -8 : -10; why.push(m[2] + ' ' + pen); }
  else if (/^weapons?$/.test(target)) { pen = -4; why.push('arma −4'); }
  else {
    var row = (grapple ? TA_GRAPPLE : TA_STRIKE).filter(function (r) { return r[0].test(target); })[0];
    if (!row) return null;
    pen = row[1]; why.push(m[2] + ' ' + (pen < 0 ? '−' + -pen : pen) + (grapple ? ' (metade, agarrando)' : ''));
  }
  if (/^disarm/.test(attack) && TA_FENCING.indexOf(combatKey(skill)) < 0) { pen -= 2; why.push('desarmar −2'); }
  if (att && att[1]) { pen += att[1]; why.push(left.slice(skill.length).trim() + ' −' + -att[1]); }
  return { skill: skill, attack: attack, target: m[2], def: pen, max: pen + Math.ceil(-pen / 2), why: why.join(', ') };
}
// Fills attr/diff (skills) or base/diff/default/limit (techniques) from the catalogs, when the name is known.
function scAutofill(x) {
  if (x.kind === 'skill') {
    var sk = /** @type {any} */ (styleFind('skill', x.name));
    if (sk && sk.attribute && SKILL_DIFFS[sk.difficulty]) { x.attr = sk.attribute; x.diff = sk.difficulty; x.skillId = sk.id; }
    else if (SC_MELEE_DIFF[combatKey(x.name)]) { x.attr = 'DX'; x.diff = SC_MELEE_DIFF[combatKey(x.name)]; }
  } else if (x.kind === 'tech') {
    // A Targeted Attack has its skill, default and limit in its name (taParse).
    var ta = taParse(x.name), p = ta ? { tech: 'Targeted Attack', base: ta.skill } : scSplitTech(x.name);
    var t = /** @type {any} */ (styleFind('tech', p.tech) || styleFind('tech', x.name));
    if (p.base) x.base = p.base;
    if (t) { x.diff = t.difficulty === 'A' ? 'A' : 'H'; x.def = techDefaultFor(t, x.base); x.max = techMaxOf(t); x.techId = t.id; }
    if (ta) { x.diff = 'H'; x.def = ta.def; x.max = ta.max; }
  } else if (x.kind === 'spell') {
    var sc = (W.spells || []).filter(function (y) { return norm(y.name) === norm(x.name); })[0];
    if (sc) { x.diff = sc.difficulty === 'VH' ? 'VH' : 'H'; x.spellId = sc.id; }
  } else if (/^Enhanced (Block|Parry)/i.test(x.name) && x.pts < 5) x.pts = /\(all/i.test(x.name) ? 10 : 5;
  else if (/^Enhanced Dodge/i.test(x.name) && x.pts < 15) x.pts = 15;
  // An advantage added with its default points takes the cost of its entry, when the book fixes one.
  else if (x.kind === 'trait' && x.sub === 'adv' && x.pts <= 1 && x.name) {
    var ac = advFind(x.name), co = ac ? advCostOf(ac) : null;
    if (co && co.cost) x.pts = co.cost;
  }
  return x;
}
// What a name is: a technique, a perk/advantage or a skill. First the lists of the row's style;
// then the catalogs (Técnicas, Perícias, Vantagens), since many perks are general and in no style
// list, or in another style's (Teamwork, Grip Mastery); null if unknown.
function scKindOf(st, name) {
  var cat = st && st.styleId ? styleById(st.styleId) : null, n = norm(name);
  if (cat) {
    var has = function (field) { return styleItems(cat[field]).some(function (i) { return norm(i) === n; }); };
    if (['techniques', 'cinematicTechniques', 'optTechniques'].some(has)) return 'tech';
    if (['perks', 'optPerks', 'optAdvantages'].some(has)) return 'trait';
    if (['skills', 'cinematicSkills', 'optSkills'].some(has)) return 'skill';
    if (has('spells')) return 'spell';
  }
  return scCatalogKind(name);
}
function scCatalogKind(name) {
  var n = norm(name), key = combatKey(name), p = scSplitTech(name);
  if (!n) return null;
  if (/^enhanced (block|parry|dodge)\b|^combat reflexes\b|^style familiarity\b/.test(n)) return 'trait';
  if ((W.techniques || []).some(function (t) { return norm(t.name) === norm(p.tech); })) return 'tech';
  if ((W.skills || []).some(function (s) { return s.attribute && (norm(s.name) === n || combatKey(s.name) === key); }) || SC_MELEE_DIFF[key]) return 'skill';
  if ((W.advantages || []).some(function (a) { return norm(a.name) === n || combatKey(a.name) === key; })) return 'trait';
  return null;
}
// Rows saved with a kind the catalogs contradict (a perk as a skill): set right, keeping the points.
function scFixKinds(c) {
  var fixed = 0;
  c.styles.map(function (st) { return { st: st, items: st.items }; }).concat([{ st: null, items: c.general }]).forEach(function (g) {
    g.items.forEach(function (x, i) {
      if (!x.name || x.kind !== 'skill') return;
      var k = scKindOf(g.st, x.name);
      if (k && k !== 'skill') { g.items[i] = scAutofill(cleanCombatItem({ kind: k, name: x.name, pts: x.pts, bonus: x.bonus, bonusNote: x.bonusNote })); fixed++; }
    });
  });
  return fixed;
}
// A style picked from the catalog: Style Familiarity, and at 0 points (bought later; out of the
// editor a row shows only with points, see scShown) its techniques, cinematic skills, cinematic
// techniques and perks. Its skills are a prerequisite, met by the sheet's own (see scStyleReqs),
// whose points are already spent.
var SC_STYLE_BRINGS = [['techniques', 'tech'], ['cinematicSkills', 'skill'], ['cinematicTechniques', 'tech'], ['perks', 'trait'], ['spells', 'spell']];
// Every style, from the catalog or free, starts with its Style Familiarity, and it stays the first
// row of the style (cleanCombat puts it there: in the editor, on save and on the sheet).
function scSfName(style) { return 'Style Familiarity' + (style ? ' (' + style + ')' : ''); }
function scIsSf(x) { return x.kind === 'trait' && /^style familiarity\b/i.test(x.name || ''); }
function scSfFirst(items) { return items.filter(scIsSf).concat(items.filter(function (x) { return !scIsSf(x); })); }
function scSfItem(style) { return cleanCombatItem({ kind: 'trait', name: scSfName(style), pts: 1 }); }
function styleFromCatalog(cat, pool) {
  var items = [scSfItem(cat.name)], seen = {};
  var learned = pool.filter(function (k) { return k.pts > 0; });
  SC_STYLE_BRINGS.forEach(function (f) {
    styleItems(cat[f[0]]).forEach(function (n) {
      var name = scCatalogName(n, learned); if (!name || seen[norm(name)]) return;
      seen[norm(name)] = 1;
      // A perk list may hold a technique (Off-Hand Weapon Training): the catalogs say which.
      var kind = f[1] === 'trait' && scCatalogKind(name) === 'tech' ? 'tech' : f[1];
      items.push(cleanCombatItem(scAutofill({ kind: kind, name: kind === 'tech' ? scTechOnLearned(name, learned) : name, pts: 0 })));
    });
  });
  return { name: cat.name, styleId: cat.id, items: items };
}
// An item of a style's list as a sheet row's name; null for book text that is not one ("All",
// "Disarming (Any skill in style)", "As Boxing (pp. 152-153), but…"). "Feint (Shield or
// Shortsword)" and "Sweep (Polearm, Spear, Staff, or Two-Handed Sword)" are on the first skill the
// sheet has (with points), else the first listed; with more after the skills ("…Sword
// Swing/Arm") it stays as is.
function scCatalogName(n, learned) {
  if (n.length > 80 || /^(all|as\b)|\bpp?\.\s*\d|\bany\b/i.test(n)) return null;
  var m = /^(.*?)\s*\(([^()]*\bor\b[^()]*)\)$/.exec(n); if (!m || m[2].indexOf('/') >= 0) return n;
  var alts = m[2].split(/\s*,\s*(?:or\s+)?|\s+or\s+/).filter(Boolean);
  var base = alts.filter(function (a) { return scFindSkill(learned, a); })[0] || alts[0];
  return m[1] + ' (' + base + ')';
}
// A technique with no skill in its name ("Arm Lock") goes on the one of its defaults in the
// catalog ("Judo or Wrestling") that the sheet has; unchanged when none.
function scTechOnLearned(name, learned) {
  if (/\(.*\)\s*$/.test(name)) return name;
  var t = /** @type {any} */ (styleFind('tech', name)); if (!t) return name;
  var hit = /** @type {{ name: string } | null} */ (null);
  String(t.defaults || '').split(/\s*,\s*(?:or\s+)?|\s+or\s+/).some(function (d) {
    d = d.replace(/\s*[+-]\d+\s*$/, '').trim();
    hit = d && !/prerequisite|skill$/i.test(d) ? scFindSkill(learned, d) : null; return !!hit;
  });
  return hit ? name + ' (' + hit.name + ')' : name;
}
// The skills a catalog style requires, each a list of alternatives: "Broadsword" is one; "and at
// least one of Knife, Spear, and Staff" or "and Polearm or Two-Handed Sword" are any of them.
// Book text that spilled into the list (long sentences) is left out.
function scReqAlts(item) {
  var t = item.replace(/^and\s+/i, '').replace(/^(at least\s+)?one of\s+/i, '');
  return t.split(/\s*,\s*(?:and\s+|or\s+)?|\s+or\s+|\s+and\s+/i).map(function (x) { return x.trim(); }).filter(Boolean);
}
// [{ label, skill }] of a style's prerequisites: skill is the sheet's (Combate or Perícias, with
// points) that meets it, or null. Empty for a free style or while the catalog has not arrived.
function scStyleReqs(st, pool) {
  var cat = st && st.styleId ? styleById(st.styleId) : null; if (!cat) return [];
  var learned = pool.filter(function (k) { return k.pts > 0; });
  return styleItems(cat.skills).filter(function (i) { return i.length <= 200; }).map(function (item) {
    var alts = scReqAlts(item), hit = null;
    alts.some(function (n) { hit = scFindSkill(learned, n); return !!hit; });
    return { label: alts.join(' ou '), skill: hit };
  });
}
function scReqsMissing(reqs) { return reqs.filter(function (r) { return !r.skill; }).map(function (r) { return r.label; }); }
// The suggestions under a row's name, as in the other pickers (Criar Armadura, Criar Arma, Magias):
// the entries of the catalog of its kind, with the Portuguese name and what they are, each name once;
// a catalog style's own lists of that kind first. A perk row offers the perks; an advantage row, the
// advantages. [{ name, entry, info }], at most 12.
var SC_STYLE_FIELDS = { skill: ['skills', 'cinematicSkills', 'optSkills'], tech: ['techniques', 'cinematicTechniques', 'optTechniques'],
  trait: ['perks', 'optPerks', 'optAdvantages'], spell: ['spells'] };
function scNameInfo(kind, e) {
  if (!e) return '';
  if (kind === 'skill') return [e.attribute && e.difficulty ? e.attribute + '/' + e.difficulty : '', e.page].filter(Boolean).join(' · ');
  if (kind === 'tech') return ['Técnica ' + (e.difficulty === 'A' ? 'Média' : 'Difícil'), e.defaults ? 'padrão ' + e.defaults : '', e.page].filter(Boolean).join(' · ');
  if (kind === 'spell') { var col = String(e.college || '').split(',')[0].trim(); return [col ? collegeLabel(col) : '', 'IQ/' + (e.difficulty || 'H'), e.page].filter(Boolean).join(' · '); }
  return [advTypeLabel(e.type), e.cost, e.page].filter(Boolean).join(' · ');
}
function scNameCatalog(x) {
  if (x.kind === 'skill') {
    var melee = Object.keys(SC_MELEE_DIFF).map(function (k) { return { name: k.replace(/(^|[\s/-])\w/g, function (m) { return m.toUpperCase(); }), attribute: 'DX', difficulty: SC_MELEE_DIFF[k], page: 'B208' }; });
    return /** @type {any[]} */ ((W.skills || []).filter(isCombatSkill)).concat(melee);
  }
  if (x.kind === 'tech') return (W.techniques || []).filter(isCombatTech);
  if (x.kind === 'spell') return W.spells || [];
  return (W.advantages || []).filter(function (a) {
    var k = advTypeKey(a.type); if (k === 'exp' || k === 'ref') return false;
    return x.sub === 'perk' ? k === 'perk' : x.sub === 'adv' ? k !== 'perk' : true;
  });
}
function scNameOptions(x, st, q) {
  var typed = norm(q || '').trim(), out = [], seen = {};
  function add(name, e) { var k = norm(name); if (!name || seen[k]) return; seen[k] = true; out.push({ name: name, entry: e, info: scNameInfo(x.kind, e) }); }
  var cat = st && st.styleId ? styleById(st.styleId) : null, find = { skill: 'skill', tech: 'tech', trait: 'adv' }[x.kind];
  if (cat) (SC_STYLE_FIELDS[x.kind] || []).forEach(function (fld) {
    styleItems(cat[fld]).forEach(function (n) { if (n.length <= 120 && (!typed || norm(n).indexOf(typed) >= 0)) add(n, find ? styleFind(find, n) : null); });
  });
  var list = scNameCatalog(x);
  (typed ? searchCatalog(list, q, null) : list.slice().sort(byName)).slice(0, 60).forEach(function (e) { add(e.name, e); });
  return out.slice(0, 12);
}

Ops.saveSheetCombat = function (s, combat, moved) {
  if (!rawHas('sheets', s.id)) return Promise.reject({ message: 'Essa ficha não existe mais.' });
  var p = { combat: combatForSave(combat), updatedAt: now() };
  // Skills brought from Perícias leave it (they are in Combate now).
  if (moved && moved.length) {
    var cur = sheetById(s.id) || s;
    p.skills = sheetSkills(cur).filter(function (k) { return !moved.some(function (m) { return m.name === k.name && m.attr === k.attr && m.diff === k.diff; }); });
  }
  return W.store.patch('sheets', s.id, p);
};

/* ---------- view ---------- */
function scNhCell(x, pool, av) {
  var nh = combatNh(x, pool, av);
  if (!nh) return '<td class="gnh none" title="Perks e vantagens não têm NH">—</td>';
  var b = x.kind === 'tech' ? scFindSkill(pool, x.base) : null;
  var bonus = x.bonus || x.tbonus || (b && (b.bonus || b.tbonus));
  var title = x.kind === 'tech' ? 'Técnica de ' + (x.base || '?') + ' · padrão ' + x.def + (x.max != null ? ' · máximo ' + (x.max > 0 ? '+' + x.max : x.max) : '') +
    (x.bonus ? ' · ' + bonusText(x.bonus, x.bonusNote) : '') : skillBonusTitle(x);
  return '<td class="gnh' + (bonus ? ' bonus' : '') + '">' + calcBtn(nhHtml(nh), combatCalc(x, pool, av), title) + '</td>';
}
// The catalog entry of a row, shown in a modal on click: the skills of Regras › Combate (the
// melee weapon skills point to "Melee Weapon", which describes them all), the techniques, and
// the perks and advantages of Regras › Vantagens (Enhanced Block/Parry/Dodge are "Enhanced
// Defenses"; the advantage itself before the books' expansions of it). Null when not there.
function scLink(x) {
  if (x.kind === 'skill') {
    var sk = x.skillId ? skillById(x.skillId) : null;
    if (!sk) {
      var key = combatKey(x.name); if (SC_MELEE_DIFF[key]) key = 'melee weapon';
      sk = (W.skills || []).filter(function (s) { return s.attribute && combatKey(s.name) === key; })[0] || null;
      if (sk && !isCombatSkill(sk)) sk = null;
    }
    return sk ? { attr: 'data-skill-modal', id: sk.id, href: skillHref(sk.id), title: 'Ver a perícia' } : null;
  }
  if (x.kind === 'tech') {
    var t = (x.techId && techById(x.techId)) || styleFind('tech', scSplitTech(x.name).tech);
    return t ? { attr: 'data-tech-modal', id: t.id, href: techHref(t.id), title: 'Ver a técnica' } : null;
  }
  if (x.kind === 'spell') {
    var sl = (x.spellId && spellById(x.spellId)) || (W.spells || []).filter(function (y) { return norm(y.name) === norm(x.name); })[0];
    return sl ? { attr: 'data-spell-modal', id: sl.id, href: spellHref(sl.id), title: 'Ver a magia' } : null;
  }
  var n = /^enhanced (block|parry|dodge)\b/i.test(x.name) ? 'Enhanced Defenses' : x.name, k = combatKey(n), list = W.advantages || [];
  var a = list.filter(function (y) { return norm(y.name) === norm(n); })[0] ||
    list.filter(function (y) { return combatKey(y.name) === k && !/^expans/i.test(y.type || ''); })[0] ||
    list.filter(function (y) { return combatKey(y.name) === k; })[0];
  return a ? { attr: 'data-adv-modal', id: a.id, href: advHref(a.id), title: 'Ver ' + (/^perk$/i.test(a.type || '') ? 'o perk' : 'a vantagem') } : null;
}
// extra: more to say under the name, after the kind ("de Knightly Mounted Combat").
function scItemName(x, extra) {
  var tag = x.kind === 'skill' ? x.attr + '/' + x.diff : x.kind === 'tech' ? 'Técnica ' + (x.diff === 'A' ? 'Média' : 'Difícil') : x.kind === 'spell' ? 'Magia IQ/' + x.diff : '';
  if (extra) tag += (tag ? ' · ' : '') + esc(extra);
  var l = scLink(x);
  var name = l ? '<a href="' + l.href + '" ' + l.attr + '="' + esc(l.id) + '" title="' + l.title + '">' + esc(x.name) + '</a>' : esc(x.name);
  return '<td><b>' + name + '</b>' + (tag ? '<small>' + tag + '</small>' : '') + '</td>';
}
// Six dots: the handle that drags a table.
var SC_GRIP = '<circle cx="9" cy="5" r="1.4"/><circle cx="15" cy="5" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="19" r="1.4"/><circle cx="15" cy="19" r="1.4"/>';
// A style's prerequisite as a row: the sheet's skill with its level and no points (they count
// where the skill is), or what is missing.
function scReqRow(r, pool, av) {
  if (!r.skill) return '<tr class="sc-req miss"><td><b>' + esc(r.label) + '</b><small>Pré-requisito · a ficha não tem</small></td><td class="gpts">—</td><td class="gnh none">falta</td></tr>';
  var x = Object.assign({}, r.skill, { kind: 'skill' }), l = scLink(x);
  var name = l ? '<a href="' + l.href + '" ' + l.attr + '="' + esc(l.id) + '" title="' + l.title + '">' + esc(x.name) + '</a>' : esc(x.name);
  return '<tr class="sc-req"><td><b>' + name + '</b><small>Pré-requisito · ' + x.attr + '/' + x.diff + '</small></td>' +
    '<td class="gpts" title="Os pontos já contam onde a perícia está na ficha">—</td>' + scNhCell(x, pool, av) + '</tr>';
}
// Out of the editor, a row shows only once it has points (a style brings its lists at 0).
function scShown(items) { return items.filter(function (x) { return x.pts >= 1; }); }
function scGroupHtml(title, items, pool, av, styleId, key, drag, reqs) {
  var label = styleId ? '<a href="' + styleHref(styleId) + '" data-style-modal="' + esc(styleId) + '" title="Ver o estilo">' + esc(title) + '</a>' : esc(title);
  // A prerequisite bought inside the style itself (older sheets) shows once, as its own row.
  reqs = (reqs || []).filter(function (r) { return !r.skill || items.indexOf(r.skill) < 0; });
  var miss = scReqsMissing(reqs), shown = scShown(items);
  function row(x) { return '<tr>' + scItemName(x) + '<td class="gpts">' + x.pts + '</td>' + scNhCell(x, pool, av) + '</tr>'; }
  // Style Familiarity first, then the prerequisites, then the rest.
  var sf = shown.filter(scIsSf), rest = shown.filter(function (x) { return !scIsSf(x); });
  return '<div class="sc-card' + (miss.length ? ' sc-unmet' : '') + '" data-key="' + key + '"><table class="gtab sc-tab"><thead><tr><th>' +
    (drag ? '<button class="sc-grip" type="button" aria-label="Mover a tabela ' + esc(title) + ' (arraste, ou use as setas)" title="Arraste para mudar a ordem">' + svg(SC_GRIP, 14, 2.4) + '</button>' : '') +
    label + (miss.length ? '<span class="sc-unmet-tag" title="Falta: ' + esc(miss.join('; ')) + '">Pré-requisito não atendido</span>' : '') + '</th><th>Pts</th><th>NH</th></tr></thead><tbody>' +
    (shown.length || reqs.length ? sf.map(row).join('') + reqs.map(function (r) { return scReqRow(r, pool, av); }).join('') + rest.map(row).join('')
      : '<tr><td colspan="3" class="gnone">Nada ainda.</td></tr>') +
    '</tbody></table></div>';
}
// A list split in three, down each column.
function scThirds(list) {
  var per = Math.ceil(list.length / 3), cols = [];
  for (var i = 0; i < list.length; i += per) cols.push(list.slice(i, i + per));
  return cols;
}
// The main table (the skills outside styles), in name order, split in three side by side; the total
// once below them.
function scMainHtml(all, pool, av) {
  var items = scShown(all).sort(byName);
  return '<div class="sc-main"><div class="gurps-grid">' + scThirds(items).map(function (col, j) {
    return '<table class="gtab sc-tab"><thead><tr><th>' + (j ? '&nbsp;' : 'Nome') + '</th><th>Pts</th><th>NH</th></tr></thead><tbody>' +
      col.map(function (x) { return '<tr>' + scItemName(x) + '<td class="gpts">' + x.pts + '</td>' + scNhCell(x, pool, av) + '</tr>'; }).join('') + '</tbody></table>';
  }).join('') + '</div><table class="gtab sc-tab"><tfoot><tr><td colspan="2">Total perícias de combate</td><td class="gpts">' + sumPts(items) + '</td></tr></tfoot></table></div>';
}
// The skills and techniques with points in a style that the main table does not show, by kind and
// name: once each, with the styles they are in and the row with the most points (its NH).
// [{ x, from: [style name] }], in name order.
function scStyleCopies(c) {
  var have = {}, by = {}, out = [];
  function key(x) { return x.kind === 'trait' || !norm(x.name) ? '' : x.kind + ':' + norm(x.name); }
  scShown(c.general).forEach(function (x) { if (key(x)) have[key(x)] = true; });
  c.styles.forEach(function (st) {
    scShown(st.items).forEach(function (x) {
      var k = key(x); if (!k || have[k]) return;
      var o = by[k], from = st.name || 'Estilo sem nome';
      if (!o) { o = by[k] = { x: x, from: [] }; out.push(o); } else if (x.pts > o.x.pts) o.x = x;
      if (o.from.indexOf(from) < 0) o.from.push(from);
    });
  });
  return out.sort(function (a, b) { return byName(a.x, b.x); });
}
// Their copy below the main table, apart: the points count in the style, not here (as a style's
// prerequisites, see scReqRow).
function scCopiesHtml(list, pool, av) {
  return '<div class="sc-main sc-copies"><div class="gurps-grid">' + scThirds(list).map(function (col, j) {
    return '<table class="gtab sc-tab"><thead><tr><th>' + (j ? '&nbsp;' : 'Dos estilos') + '</th><th>Pts</th><th>NH</th></tr></thead><tbody>' +
      col.map(function (o) {
        var from = 'de ' + joinE(o.from);
        return '<tr>' + scItemName(o.x, from) + '<td class="gpts" title="Os pontos contam no estilo (' + esc(joinE(o.from)) + '), não aqui">—</td>' + scNhCell(o.x, pool, av) + '</tr>';
      }).join('') + '</tbody></table>';
  }).join('') + '</div><p class="hint-text" style="margin:0">Cópia das perícias e técnicas com pontos nos estilos que não estão nas Perícias de Combate. Os pontos contam no estilo, não no total daqui.</p></div>';
}
// The style tables in the order the player left them ('s<i>'). The other skills' table is not
// among them: it is the main one, always first, above the points per style.
function combatOrder(c) { return c.styles.map(function (st, i) { return 's' + i; }); }
function scDmgLabel(t) { var x = SC_DMG_TYPES.filter(function (y) { return y[0] === t; })[0]; return x ? x[1] : t; }
// Parry by skill (Basic Set): [modifier of the Parry column of the Melee Weapon Table (pp. B271-273)
// for the skill's usual weapon, kind]. Kind: 'U' unbalanced (cannot parry after attacking with
// it), 'F' fencing (parry at -encumbrance, p. B208), 'K' Boxing/Judo/Karate
// (Judo and Karate at -encumbrance, p. B203), 'H' one-handed unarmed, 'W' Sumo Wrestling/Wrestling (both hands).
// Unarmed parries use the skill or DX, if higher (p. B376). Lance cannot parry.
var SC_PARRY = { 'axe/mace': [0, 'U'], 'two-handed axe/mace': [0, 'U'], 'broadsword': [0, ''], 'flail': [0, 'U'], 'two-handed flail': [0, 'U'],
  'knife': [-1, ''], 'kusari': [-2, 'U'], 'main-gauche': [0, 'F'], 'rapier': [0, 'F'], 'saber': [0, 'F'], 'smallsword': [0, 'F'], 'shortsword': [0, ''],
  'spear': [0, ''], 'staff': [2, ''], 'two-handed sword': [0, ''], 'polearm': [0, 'U'], 'force sword': [0, ''], 'jitte/sai': [0, ''], 'tonfa': [0, ''],
  'whip': [0, ''], 'force whip': [0, ''], 'monowire whip': [0, ''],
  'boxing': [0, 'K'], 'judo': [0, 'K'], 'karate': [0, 'K'], 'brawling': [0, 'H'], 'sumo wrestling': [0, 'W'], 'wrestling': [0, 'W'] };
// The sum of a defense written out: "3 + 7 (Broadsword 14 ÷ 2) + 1 (Combat Reflexes) = 11".
// parts: [[value, what]], the first one without a sign; zeros are left out.
function scCalc(parts, total) {
  return parts.filter(function (p, i) { return i === 0 || p[0]; }).map(function (p, i) {
    var v = i === 0 ? String(p[0]) : (p[0] < 0 ? '− ' + -p[0] : '+ ' + p[0]);
    return v + (p[1] ? ' (' + p[1] + ')' : '');
  }).join(' ') + ' = ' + total;
}
function scBonusLabel(note) { return note ? 'bônus: ' + note : 'bônus'; }
function scHasTrait(c, re) { return scAllItems(c).some(function (x) { return x.kind === 'trait' && re.test(x.name); }); }
// The active defenses as the Basic Set has them (pp. B374-377):
//   Dodge = Basic Speed + 3 - encumbrance; Parry = 3 + skill/2 (+ weapon modifier); Block = 3 + Shield or Cloak/2;
//   Combat Reflexes (or Enhanced Time Sense, which includes it) +1 to all; Enhanced Dodge/Parry/Block;
//   a ready shield's or cloak's DB adds to Parry and Block against attacks from the front or the
//   shield side (pp. B374-375, B287): the DB of the one that blocks, in the values. By the table's
//   rule it never adds to Dodge (the Basic Set adds it there too). By the table's rule only Dodge
//   has a value retreating (+3, p. B377); Parry and Block have none.
//   With a shield or cloak in a hand, Wrestling and Sumo Wrestling cannot parry (both hands).
// Like Danos, only what is in use counts (defCarried): Parry with the weapons carried in the Corpo
// configuration in use (each with its parry modifier and its NH, adjustments included) and the unarmed
// skills, which need no weapon; Block with the shields and cloaks carried, whose DB is the one shown.
// Without a choice in the editor, Parry and Block use the best one.
// a with the advantages' effects (withAdvFx) adds their bonuses to each defense (fx.def).
function combatDefenses(c, pool, av, r, a, s) {
  var d = c.def, enc = (a && a.enc) || 0, fd = (a && a.fx && a.fx.def) || {};
  var fp = fxCalcPart(fd.parry), fb = fxCalcPart(fd.block), fdo = fxCalcPart(fd.dodge);
  var cr = scHasTrait(c, /^(Combat Reflexes|Enhanced Time Sense)\b/i) ? 1 : 0;
  var ep = scEnhanced(c, 'Parry'), eb = scEnhanced(c, 'Block'), ed = scEnhanced(c, 'Dodge');
  // Every skill once (Combate first, then Perícias), with its level.
  var seen = {}, skills = [];
  pool.forEach(function (k) {
    if (seen[norm(k.name)]) return; seen[norm(k.name)] = true;
    var ci = cleanCombatItem(Object.assign({}, k, { kind: 'skill' })); ci.tbonus = k.tbonus; // the talents' bonus is not a saved field
    var nh = combatNh(ci, pool, av);
    if (nh && nh.abs != null) skills.push({ name: k.name, abs: nh.abs, key: combatKey(k.name) });
  });
  var parries = [], blocks = [], gear = s ? defCarried(s) : null;
  // The one chosen in the editor (by skill; with two weapons of it, the better), or the best; one
  // that cannot be used (off) only when chosen.
  var best = function (l, chosen) {
    var hits = chosen ? l.filter(function (x) { return x.name === chosen; }) : [];
    return (hits.length ? hits : l.filter(function (x) { return !x.off; })).slice().sort(function (x, y) { return y.value - x.value; })[0] || null;
  };
  // Shields and cloaks first: the DB of the one that blocks goes in every defense. A DB not known
  // (written out, or none) is the editor's.
  (gear ? gear.shields : []).forEach(function (h) {
    var nh = h.nh.v, hdb = h.db != null ? h.db : d.db, b = 3 + Math.floor(nh / 2) + hdb + eb + cr + fb[0] + d.blockBonus;
    blocks.push({ name: h.skill, weapon: h.name, db: hdb, dbKnown: h.db != null, value: b, notes: fxCondNotes(fd.block), nh: nh,
      nhText: h.skill + ' ' + nh + (h.nh.adj ? ', com os ajustes do escudo' : ''),
      calc: scCalc([[3, ''], [Math.floor(nh / 2), h.skill + ' ' + nh + (h.nh.adj ? ', com os ajustes do escudo' : '') + ' ÷ 2'], [hdb, 'DB de ' + h.name + (h.db != null ? '' : ', do editor')],
        [cr, 'Combat Reflexes'], [eb, 'Enhanced Block'], fb, [d.blockBonus, scBonusLabel(d.blockNote)]], b) });
  });
  var block = best(blocks, d.block), sdb = block ? block.db : 0, dbPart = [sdb, block ? 'DB de ' + block.weapon : ''];
  skills.forEach(function (k) {
    var p = SC_PARRY[k.key];
    // Unarmed: always; a weapon skill only with a weapon in use (below).
    if (p && /[KHW]/.test(p[1])) {
      var base = p[1] === 'K' || p[1] === 'H' ? Math.max(k.abs, av.DX) : k.abs;
      var notes = [], pEnc = (p[1] === 'F' || k.key === 'karate' || k.key === 'judo') ? enc : 0;
      var v = 3 + Math.floor(base / 2) + p[0] + sdb + ep + cr + fp[0] + d.parryBonus - pEnc;
      var calc = scCalc([[3, ''], [Math.floor(base / 2), (base > k.abs ? 'DX ' + base + ', maior que ' + k.name + ' ' + k.abs : k.name + ' ' + base) + ' ÷ 2'],
        [p[0], 'arma'], dbPart, [cr, 'Combat Reflexes'], [ep, 'Enhanced Parry'], fp, [d.parryBonus, scBonusLabel(d.parryNote)], [-pEnc, 'Peso']], v);
      var off = p[1] === 'W' && block ? 'com ' + block.weapon + ' numa mão não apara: ' + k.name + ' usa as duas mãos' : '';
      if (p[0]) notes.push('arma ' + (p[0] > 0 ? '+' : '') + p[0]);
      if (p[1] === 'U') notes.push('desbalanceada: não apara se atacou com ela no turno');
      if (p[1] === 'H') notes.push('-3 contra armas, exceto golpes de ponta');
      if (p[1] === 'W') notes.push(off || 'usa as duas mãos');
      if ((p[1] === 'F' || k.key === 'karate' || k.key === 'judo') && enc) notes.push('-' + enc + ' de Peso');
      notes = notes.concat(fxCondNotes(fd.parry));
      parries.push({ name: k.name, value: v, notes: notes, calc: calc, nh: base, off: off,
        nhText: base > k.abs ? 'DX ' + base + ', maior que ' + k.name + ' ' + k.abs : k.name + ' ' + base });
    }
  });
  (gear ? gear.weapons : []).forEach(function (w) {
    var nh = w.nh.v, fen = w.flags.indexOf('F') >= 0, pEnc = fen ? enc : 0, notes = [];
    var v = 3 + Math.floor(nh / 2) + w.mod + sdb + ep + cr + fp[0] + d.parryBonus - pEnc;
    var calc = scCalc([[3, ''], [Math.floor(nh / 2), w.skill + ' ' + nh + (w.nh.adj ? ', com os ajustes da arma' : '') + ' ÷ 2'], [w.mod, 'arma'], dbPart, [cr, 'Combat Reflexes'],
      [ep, 'Enhanced Parry'], fp, [d.parryBonus, scBonusLabel(d.parryNote)], [-pEnc, 'Peso']], v);
    if (w.mod) notes.push('arma ' + (w.mod > 0 ? '+' : '') + w.mod);
    if (w.flags.indexOf('U') >= 0) notes.push('desbalanceada: não apara se atacou com ela no turno');
    if (pEnc) notes.push('-' + enc + ' de Peso');
    notes = notes.concat(fxCondNotes(fd.parry));
    parries.push({ name: w.skill, weapon: w.name, value: v, notes: notes, calc: calc, nh: nh,
      nhText: w.skill + ' ' + nh + (w.nh.adj ? ', com os ajustes da arma' : '') });
  });
  var dodge = r.dodge + ed + cr + fdo[0] + d.dodgeBonus, dnotes = fxCondNotes(fd.dodge);
  var dparts = [[3, ''], [Math.floor(r.speed), 'Velocidade Básica ' + fmtDec(r.speed, 2) + ', sem a fração'], [-enc, 'Peso'], [cr, 'Combat Reflexes'], [ed, 'Enhanced Dodge'], fdo, [d.dodgeBonus, scBonusLabel(d.dodgeNote)]];
  var dcalc = scCalc(dparts, dodge) + dnotes.map(function (t) { return ' · ' + t; }).join('');
  // Its parts in short, under its name: "Velocidade Básica 5 + 3 · −1 de Peso · +3 de DB de Kite Shield".
  var dsum = ['Velocidade Básica ' + Math.floor(r.speed) + ' + 3'].concat(dparts.slice(2).filter(function (p) { return p[0]; }).map(function (p) {
    return (p[0] > 0 ? '+' : '−') + Math.abs(p[0]) + ' de ' + p[1];
  })).join(' · ');
  var dodges = [{ name: 'Esquiva', value: dodge, retreat: dodge + 3, retreatBonus: 3, calc: dcalc, notes: dnotes, parts: dsum }];
  // Acrobatic Dodge (p. B375): an Acrobatics roll before dodging, +2 on a success, -2 on a failure.
  var acro = skills.filter(function (k) { return k.key === 'acrobatics'; })[0];
  if (acro) dodges.push({ name: 'Acrobatic Dodge', value: dodge + 2, retreat: dodge + 5, retreatBonus: 3, nh: acro.abs, nhText: acro.name + ' ' + acro.abs + ', o teste antes de esquivar',
    calc: scCalc(dparts.concat([[2, 'Acrobatic Dodge, passando no teste de ' + acro.name]]), dodge + 2) + dnotes.map(function (t) { return ' · ' + t; }).join(''),
    notes: ['teste de ' + acro.name + ' ' + acro.abs + ' antes de esquivar: passa, ' + (dodge + 2) + '; falha, ' + (dodge - 2)].concat(dnotes), parts: dsum });
  // db: the DB of the shield or cloak that blocks (already in the values), dbFrom its name.
  // inUse: whether there is a Corpo configuration in use (for the messages).
  return { parry: best(parries, d.parry), parries: parries, block: block, blocks: blocks, parryAuto: !d.parry, blockAuto: !d.block,
    dodge: dodges[0], dodges: dodges, cr: cr, ep: ep, eb: eb, ed: ed, enc: enc,
    db: sdb, dbFrom: block ? block.weapon : '', inUse: !!gear, body: gear ? gear.body : '' };
}
// The defenses in three groups, each folding as Danos's: Esquiva (Dodge with its parts, and
// Acrobatic Dodge with Acrobatics), Aparar (each weapon of the Corpo configuration in use, then each
// unarmed skill) and Bloqueio (each shield and cloak in use). The parry and the block that count (the
// editor's choice, or the best) are marked. The value opens how it was reached, the NH used included (scDefWhyModal).
var DF_VIEW = /** @type {any[]} */ ([]);
function scDefHtml(c, dv) {
  var db = dv.db;
  DF_VIEW = [];
  function why(i, html, title, part) {
    return '<button class="dm-why" type="button" data-dfwhy="' + i + (part ? ':' + part : '') + '" title="' + esc(title + ' · clique para ver a conta') + '">' + html + '</button>';
  }
  function row(x, kind, name, sub, used, fold) {
    var i = DF_VIEW.push({ x: x, kind: kind, name: name, sub: sub, used: used, db: kind === 'Bloqueio' ? x.db : kind === 'Esquivar' ? 0 : db, dbFrom: kind === 'Bloqueio' ? x.weapon : dv.dbFrom }) - 1;
    var tag = used ? '<span class="df-used">' + (used === 'chosen' ? 'escolhida' : 'a melhor') + '</span>' : x.off ? '<span class="df-used df-off">não apara</span>' : '';
    return '<tr data-dmin="' + fold + '"' + (dmFoldOpen(fold) ? '' : ' hidden') + '><td class="dm-name"><b>' + esc(name) + '</b>' + tag + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</td>' +
      '<td class="gval' + (used ? ' df-best' : x.off ? ' df-offv' : '') + '">' + why(i, String(x.value), x.calc) + '</td><td>' +
        (x.retreat != null ? why(i, x.retreat + ' <span class="gnote">(+' + x.retreatBonus + ')</span>', x.value + ' + ' + x.retreatBonus + ' recuando = ' + x.retreat, 'ret') : '') + '</td></tr>';
  }
  // retreat: the group has a value retreating (only Esquiva).
  function group(title, fold, rows, empty, retreat) {
    var open = dmFoldOpen(fold);
    // Each group names its columns (Valor; Recuando only on Esquiva): with a group open further down, the table's top is out of sight.
    return '<tr class="dm-group"><th scope="colgroup"><button class="dm-fold" type="button" data-dmfold="' + fold + '" aria-expanded="' + open + '" aria-label="Mostrar ou recolher ' + esc(title) + '">' +
      CHEV + esc(title) + '<span class="dm-fold-sum">· ' + (rows.length ? plural(rows.length, 'opção', 'opções') : 'nenhuma') + '</span></button></th>' +
      '<th class="df-col" scope="col">Valor</th>' + (retreat ? '<th class="df-col" scope="col" title="Esquivando e recuando um passo (B377)">Recuando</th>' : '<th></th>') + '</tr>' +
      (rows.length ? rows.join('') : '<tr data-dmin="' + fold + '"' + (open ? '' : ' hidden') + '><td colspan="3" class="gnone dm-name">' + esc(empty) + '</td></tr>');
  }
  function usedOf(x, chosen, auto) { return x === chosen ? (auto ? 'best' : 'chosen') : ''; }
  var corpo = dv.inUse ? '' : ' Nenhuma configuração do Corpo em uso (Equip. › Corpo).';
  var dodge = dv.dodges.map(function (x) { return row(x, 'Esquivar', x.name, [x.parts].concat(x.name === 'Esquiva' ? x.notes : x.notes.slice(0, 1)).join(' · '), '', 'dfdodge'); });
  var parry = dv.parries.filter(function (x) { return x.weapon; }).map(function (x) {
    return row(x, 'Aparar', x.weapon, [x.name].concat(x.notes).join(' · '), usedOf(x, dv.parry, dv.parryAuto), 'dfparry');
  }).concat(dv.parries.filter(function (x) { return !x.weapon; }).map(function (x) {
    return row(x, 'Aparar', x.name, ['desarmado'].concat(x.notes).join(' · '), usedOf(x, dv.parry, dv.parryAuto), 'dfparry');
  }));
  var block = dv.blocks.map(function (x) {
    return row(x, 'Bloqueio', x.weapon, [x.name, 'DB ' + x.db + (x.dbKnown ? '' : ' (do editor)')].concat(x.notes).join(' · '), usedOf(x, dv.block, dv.blockAuto), 'dfblock');
  });
  var body = group('Esquiva', 'dfdodge', dodge, '', true) +
    group('Aparar', 'dfparry', parry, 'Nenhuma arma em uso que apare, nem perícia desarmada.' + corpo) +
    group('Bloqueio', 'dfblock', block, 'Nenhum escudo ou capa em uso.' + corpo);
  return '<div class="dm-wrap"><table class="gtab sc-def df-tab dm-tab"><tbody>' + body +
    '<tr><td colspan="3" class="gnone dm-name">' + (db ? 'O DB ' + db + ' de ' + esc(dv.dbFrom) + ' já está somado em Aparar e Bloqueio (na Esquiva, não): vale contra ataques pela frente ou do lado do escudo; por trás ou do outro lado, tire ' + db + '. ' : '') + 'Basic Set, pp. B374-377</td></tr></tbody></table></div>';
}
// "3 + 6 (Wrestling 13 ÷ 2) + 1 (Combat Reflexes) = 10" → [['Base de toda defesa ativa', '3'],
// ['Wrestling 13 ÷ 2', '+ 6'], ['Combat Reflexes', '+ 1']].
function scDefTerms(calc) {
  var t = String(calc).split(' · ')[0].replace(/\s=\s*-?\d+\s*$/, '');
  return t.split(/\s(?=[+−] \d)/).map(function (p, i) {
    if (!i) return ['Base de toda defesa ativa', p.trim()];
    var m = /^([+−] \d+)\s*(?:\((.*)\))?$/.exec(p.trim());
    return m ? [m[2] || '', m[1]] : [p, ''];
  });
}
// Why Dodge is worth what it is retreating (p. B377): a step back from the attacker, +3.
function scDefRetreatModal(e) {
  // Only Esquiva has a value retreating (Aparar and Bloqueio have none).
  var x = e.x, why = 'Esquivar recuando dá +3 (B377).', what = e.name;
  showModal('<div class="skill-modal dm-why-modal"><div class="skill-modal-head"><h2 id="dfRetTitle">' + esc(what) + ', recuando</h2>' + (e.sub ? '<p class="lede">' + esc(e.sub) + '</p>' : '') + '</div>' +
    '<section class="dm-why-sec"><h3 class="sec-title">Recuando</h3><div class="dm-why-big">' + x.retreat + '</div><p class="hint-text">' + esc(why) + '</p>' +
    dmStepsHtml([[e.name, String(x.value)], ['Recuar', '+ ' + x.retreatBonus], ['Total', String(x.retreat)]]) +
    '<p class="hint-text">Para defender recuando, role 3 dados e tire ' + x.retreat + ' ou menos.' + (x.off ? ' Mas agora não vale: ' + x.off + '.' : '') + '</p></section>' +
    '<section class="dm-why-sec"><h3 class="sec-title">Como funciona</h3><ul class="dm-fx">' + [
      'Recuar é dar um passo para trás, afastando-se do atacante (1 metro, um hexágono), ao mesmo tempo em que se defende.',
      'Só pode recuar uma vez por turno.',
      'Não dá para recuar depois de um Committed Attack; depois de um All-Out Attack não há defesa nenhuma.',
      'É preciso ter espaço para trás: encurralado contra uma parede ou outra pessoa, não dá para recuar.',
    ].filter(Boolean).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></section></div>');
  modal.setAttribute('aria-labelledby', 'dfRetTitle');
}
function scDefWhyModal(e) {
  var x = e.x, conds = String(x.calc).split(' · ').slice(1).concat(x.notes || []);
  var what = e.kind === 'Esquivar' ? e.name : e.kind + ' com ' + e.name;
  var dbr = e.db ? ' + DB do escudo' : '';
  var rule = e.kind === 'Esquivar' ? 'Esquiva = Velocidade Básica (sem a fração) + 3 − Peso; o DB do escudo não entra.' : e.kind === 'Bloqueio' ? 'Bloqueio = 3 + NH ÷ 2 (arredondado para baixo) + DB do escudo.' :
    'Aparar = 3 + NH ÷ 2 (arredondado para baixo), mais o modificador da arma' + dbr + '.';
  var tag = e.used === 'chosen' ? ' É a escolhida no editor de Defesas.' : e.used === 'best' ? ' É a melhor em uso: é a que conta.' : x.off ? ' Não vale agora: ' + x.off + '.' : '';
  showModal('<div class="skill-modal dm-why-modal"><div class="skill-modal-head"><h2 id="dfWhyTitle">' + esc(what) + '</h2>' + (e.sub ? '<p class="lede">' + esc(e.sub) + '</p>' : '') + '</div>' +
    '<section class="dm-why-sec"><h3 class="sec-title">Valor</h3><div class="dm-why-big">' + x.value + '</div><p class="hint-text">' + esc(rule + tag) + '</p>' +
    dmStepsHtml(scDefTerms(x.calc).concat([['Total', String(x.value)]])) +
    '<p class="hint-text">Para defender, role 3 dados e tire ' + x.value + ' ou menos.' + (x.retreat != null ? ' Recuando (um passo para trás), +' + x.retreatBonus + ': ' + x.retreat + '.' : '') +
    (e.db ? ' Já inclui o DB ' + e.db + ' de ' + e.dbFrom + ', que vale contra ataques pela frente ou do lado do escudo; por trás ou do outro lado, a defesa é ' + (x.value - e.db) + '.' : '') + '</p>' +
    (conds.length ? '<ul class="dm-fx">' + conds.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '') + '</section>' +
    (x.nh != null ? '<section class="dm-why-sec"><h3 class="sec-title">NH usado</h3><div class="dm-why-big">' + x.nh + '</div><p class="hint-text">' + esc(x.nhText) +
      (e.kind === 'Aparar' && !x.weapon && /maior que/.test(x.nhText || '') ? '. Desarmado, apara com a perícia ou com DX, o que for maior (B376).' : '.') + '</p></section>' : '') + '</div>');
  modal.setAttribute('aria-labelledby', 'dfWhyTitle');
}
// What a style is worth: the points in the skills that meet its prerequisites (where they are on
// the sheet) plus its own rows, without perks and advantages (Style Familiarity among them).
// A skill counts once, even when it meets two prerequisites or is also a row of the style.
function scStylePts(st, pool) {
  var own = st.items.filter(function (x) { return x.kind !== 'trait'; }), seen = own.slice();
  scStyleReqs(st, pool).forEach(function (r) { if (r.skill && seen.indexOf(r.skill) < 0) seen.push(r.skill); });
  return sumPts(seen);
}
// Points per style, three side by side per row (fewer rows, more columns), in the tables' order.
function scTotalsHtml(c, pool) {
  var rows = combatOrder(c).map(function (k) { var st = c.styles[+k.slice(1)]; return [st.name || 'Estilo sem nome', scStylePts(st, pool)]; });
  if (rows.length < 2) return '';
  return '<div class="gtab sc-tot" role="table" aria-label="Pontos por estilo"><div class="sc-tot-grid sc-tot-headrow" role="row">' +
    // A "Pts" over each column of points; the title only over the first.
    [0, 1, 2].map(function (i) { return '<div class="sc-tot-item"><span role="columnheader">' + (i ? '' : 'Pontos por estilo') + '</span><b role="columnheader">Pts</b></div>'; }).join('') + '</div>' +
    '<div class="sc-tot-grid">' + rows.map(function (r) { return '<div class="sc-tot-item" role="row"><span role="cell">' + esc(r[0]) + '</span><b class="gpts" role="cell">' + r[1] + '</b></div>'; }).join('') + '</div></div>';
}
// Whether a section of the sheet that edits in place is being edited: only one at a time.
function sheetDraftOpen() { var ui = S.ui; return !!(ui.skillDraft || ui.combatDraft || ui.advDraft || ui.disadvDraft || ui.quirkDraft || ui.dmgDraft || ui.defDraft || ui.spellDraft || ui.noteDraft); }
function sheetCombatHtml(s, editing) {
  var ui = S.ui, c = editing ? ui.combatDraft.c : sheetCombat(s), a = sheetAttrsNow(s), av = attrValues(a);
  var pool = combatSkillPool(c, s), can = canWrite();
  var head = '<div class="gurps-head">' + sheetGripHtml('Combate') + gearFoldTitle('combat', 'Combate', editing) + '<span class="gurps-total" id="scTotal">' + combatTotal(c) + ' pts</span>' +
    (editing ? secSaveBtnsHtml('scCancel', 'scSave', 'combate')
      : can && !sheetDraftOpen() ? secEditBtnHtml('scEdit', 'combate') : '') + '</div>';
  if (editing) return '<section class="gurps' + gearFoldClass('combat', editing) + '" id="combat">' + head + scEditHtml(s, c, pool, av) + '</section>';
  var empty = !c.styles.length && !c.general.length;
  if (empty) return '<section class="gurps' + gearFoldClass('combat', editing) + '" id="combat">' + head + '<p class="long none">Nenhum estilo ou perícia de combate.' + (can ? ' Use <b>Editar</b> para adicionar.' : '') + '</p></section>';
  var drag = can && !ui.skillDraft && !ui.attrDraft && !ui.advDraft && !ui.disadvDraft && !ui.quirkDraft;
  // Links to the catalogs (see scLink): they arrive once and the page redraws with them.
  // The styles too, for their prerequisites (see scStyleReqs).
  ['skills', 'techniques', 'advantages', 'styles'].forEach(function (k) { loadCatalog(k); });
  var groups = combatOrder(c).map(function (k) {
    var st = c.styles[+k.slice(1)];
    return scGroupHtml(st.name || 'Estilo sem nome', st.items, pool, av, st.styleId || '', k, drag, scStyleReqs(st, pool));
  });
  var copies = scStyleCopies(c);
  return '<section class="gurps' + gearFoldClass('combat', editing) + '" id="combat">' + head +
    // Two parts: the skills outside styles (the main table, not dragged; below it, apart and without
    // their points, a copy of the styles' skills and techniques it does not have), then the styles, with the points
    // per style above the tables they sum up.
    scPartHtml('combatSkills', 'Perícias de Combate', sumPts(c.general),
      (scShown(c.general).length ? scMainHtml(c.general, pool, av) : '<p class="long none">Nenhuma perícia de combate fora dos estilos.</p>') +
      (copies.length ? scCopiesHtml(copies, pool, av) : '')) +
    scPartHtml('combatStyles', 'Estilos', scStylesTotal(c),
      c.styles.length ? scTotalsHtml(c, pool) + '<div class="sc-masonry" id="scGroups">' + groups.join('') + '</div>' : '<p class="long none">Nenhum estilo.</p>') + '</section>';
}
// A part of Combate: its title with its points, folding as the sections do.
function scPartHtml(key, title, pts, body) {
  return '<section class="gurps sc-part' + gearFoldClass(key, false) + '" id="' + key + '"><div class="gurps-head">' + gearFoldTitle(key, title, false, 'h3') +
    '<span class="gurps-total">' + pts + ' pts</span></div>' + body + '</section>';
}

/* ---------- editor ---------- */
function scOpts(list, cur) { return list.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === cur ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join(''); }
function scField(label, html, cls) { return '<label class="sc-f' + (cls ? ' ' + cls : '') + '"><span>' + label + '</span>' + html + '</label>'; }
// The reason of a bonus beside it, shown while the bonus is not 0 (see cleanBonusNote).
function scNoteField(input, bonus, attrs) { return '<label class="sc-f sc-bnote"' + attrs + (bonus ? '' : ' hidden') + '><span>Motivo do bônus</span>' + input + '</label>'; }
function scDefNote(key, note, bonus) { return scNoteField(bonusNoteInput('', note).replace('data-f="bonusNote"', 'data-f="' + key + 'Note"'), bonus, ' data-dnote="' + key + '"'); }
// g: the group ('s<i>' for a style, 'g' for the skills outside styles); n: the row in it.
function scEditRow(x, g, n, pool, av, listId) {
  var nh = combatNh(x, pool, av), at = ' data-g="' + g + '" data-n="' + n + '"';
  var f = scField('Tipo', '<select data-f="kind"' + at + '>' + scOpts(SC_KINDS, x.kind) + '</select>') +
    scField('Nome', '<div class="sk-pick"><input type="text" data-f="name"' + at + ' maxlength="120" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="scSug' + g + '_' + n + '" value="' + esc(x.name) + '" placeholder="' +
      (x.kind === 'tech' ? 'Ex.: Counterattack (Broadsword)' : x.kind === 'spell' ? 'Ex.: Fireball, Deflect Missile' : x.kind === 'trait' ? (x.sub === 'adv' ? 'Ex.: Combat Reflexes' : 'Ex.: Shield-Wall Training') : 'Ex.: Broadsword') + '">' +
      '<div class="suggest" id="scSug' + g + '_' + n + '" role="listbox" hidden></div></div>', 'sc-name');
  if (x.kind === 'skill') {
    f += scField('Atributo', '<select data-f="attr"' + at + '>' + scOpts(SKILL_ATTRS.map(function (v) { return [v, v]; }), x.attr) + '</select>') +
      scField('Dif.', '<select data-f="diff"' + at + '>' + scOpts(SKILL_DIFF_KEYS.map(function (v) { return [v, v]; }), x.diff) + '</select>');
  } else if (x.kind === 'spell') {
    f += scField('Dif.', '<select data-f="diff"' + at + '>' + scOpts([['H', 'H'], ['VH', 'VH']], x.diff) + '</select>');
  } else if (x.kind === 'tech') {
    f += scField('Perícia-base', '<input type="text" data-f="base"' + at + ' maxlength="100" list="scBases" autocomplete="off" value="' + esc(x.base) + '">', 'sc-base') +
      scField('Dif.', '<select data-f="diff"' + at + '>' + scOpts([['A', 'A'], ['H', 'H']], x.diff) + '</select>') +
      scField('Padrão', '<input type="number" data-f="def"' + at + ' min="-20" max="10" step="1" value="' + x.def + '" title="Em relação à perícia-base, ex.: -5">') +
      scField('Máximo', '<input type="number" data-f="max"' + at + ' min="-20" max="20" step="1" value="' + (x.max == null ? '' : x.max) + '" placeholder="—" title="Limite em relação à perícia-base; vazio se não há">');
  }
  f += scField('Pts', '<input type="number" data-f="pts"' + at + ' min="0" max="999" step="1" inputmode="numeric" value="' + x.pts + '">');
  if (x.kind !== 'trait') f += scField('Bônus', '<input type="number" data-f="bonus"' + at + ' min="-20" max="20" step="1" inputmode="numeric" value="' + x.bonus + '">') +
    scNoteField(bonusNoteInput(at, x.bonusNote), x.bonus, ' data-bnote="' + g + ':' + n + '"');
  f += '<span class="sc-nh' + (x.bonus ? ' bonus' : '') + '" data-nh="' + g + ':' + n + '">' + scEditNhHtml(nh) + '</span>' +
    '<button class="icon-btn" type="button" data-del="' + g + ':' + n + '" aria-label="Remover" title="Remover">' + svg(ICON.x, 15, 2.4) + '</button>';
  return '<div class="sc-row">' + f + '</div>';
}
function scEditNhHtml(nh) { return nh ? nhHtml(nh) + (nh.waste ? '<small class="sk-waste">' + nh.waste + ' pt sem efeito</small>' : '') : '<small>sem NH</small>'; }
// A style's block, and the Perícias de Combate one, can be folded to its header (name, what it
// holds). In the editor both start folded and a new style open; st.open is the draft's only
// (cleanCombat drops it), and the draft's gOpen is the Perícias de Combate block's.
// Folded is a class, not hidden, so a missing bonus reason inside still counts (checkBonusNotes).
function scGroupEditHtml(title, items, g, pool, av, listId, st) {
  var cat = st && st.styleId ? styleById(st.styleId) : null, reqs = scStyleReqs(st, pool), miss = scReqsMissing(reqs), open = st ? !!st.open : !!S.ui.combatDraft.gOpen;
  var reqHtml = reqs.length ? '<p class="hint-text sc-req-line' + (miss.length ? ' miss' : '') + '" style="margin:0">' +
    (miss.length ? '<b>Pré-requisito não atendido.</b> Falta: ' + esc(miss.join('; ')) + '. ' : '') + 'Pré-requisitos (perícias da ficha, só o NH): ' +
    reqs.map(function (r) { if (!r.skill) return esc(r.label) + ' (falta)'; var nh = combatNh(Object.assign({}, r.skill, { kind: 'skill' }), pool, av); return esc(r.skill.name) + ' ' + esc(nh ? nh.lvl : ''); }).join(' · ') + '</p>' : '';
  var named = items.filter(function (x) { return x.name; });
  var chev = '<button class="chev-btn" type="button" data-fold="' + g + '" aria-expanded="' + open + '" aria-label="Mostrar ou recolher ' + esc(st ? 'o estilo ' + st.name : title) + '">' + CHEV + '</button>';
  var sum = '<span class="sc-fold-sum">' + plural(named.length, 'linha', 'linhas') + ' · ' + sumPts(named.map(cleanCombatItem)) + ' pts' + (miss.length ? ' · <b>pré-requisito não atendido</b>' : '') + '</span>';
  return '<div class="box sc-edit' + (miss.length ? ' sc-unmet' : '') + (open ? '' : ' closed') + '" data-group="' + g + '">' +
    (st ? '<div class="sc-ghead">' + chev +
      scField('Estilo', '<input type="text" data-f="stname" data-g="' + g + '" maxlength="120" value="' + esc(st.name) + '" placeholder="Nome do estilo">', 'sc-name') +
      sum + (cat ? '<a class="sc-catlink" href="' + styleHref(cat.id) + '" data-style-modal="' + esc(cat.id) + '" target="_blank" rel="noopener">' + esc(cat.page || 'Ver estilo') + '</a>' : '') +
      '<button class="btn ghost" type="button" data-delstyle="' + g + '">' + svg(ICON.trash, 14) + 'Remover estilo</button></div>'
      : '<div class="sc-ghead sc-ghead-g">' + chev + '<h3 class="sec-title" style="margin:0">' + esc(title) + '</h3>' + sum + '</div>') +
    '<div class="sc-gbody"><div class="sc-rows">' + items.map(function (x, n) { return scEditRow(x, g, n, pool, av, listId); }).join('') + '</div>' +
    '<div class="btn-row">' + SC_ADD.map(function (k) { return '<button class="btn" type="button" data-add="' + g + ':' + k[0] + '">' + svg(ICON.plus, 14, 2.4) + k[1] + '</button>'; }).join('') + '</div>' +
    (cat ? '<p class="hint-text" style="margin:0">Os nomes sugeridos mostram primeiro os das listas do estilo (técnicas, perks e opcionais), depois o resto do catálogo: escolher um preenche o resto.</p>' : '') + reqHtml + '</div></div>';
}
function scEditHtml(s, c, pool, av) {
  var d = S.ui.combatDraft;
  // The names have their own suggestions (scNameOptions); the base skill of a technique, the sheet's.
  var lists = '<datalist id="scBases">' + pool.map(function (k) { return '<option value="' + esc(k.name) + '">'; }).join('') + '</datalist>';
  var fromSkills = sheetSkills(s).filter(function (k) { return !d.moved.some(function (m) { return m.name === k.name && m.attr === k.attr && m.diff === k.diff; }); });
  var targets = [['g', 'Perícias de Combate']].concat(c.styles.map(function (x, i) { return ['s' + i, x.name || 'Estilo ' + (i + 1)]; }));
  return lists +
    scGroupEditHtml('Perícias de Combate', c.general, 'g', pool, av, 'scListG', null) +
    '<h3 class="sec-title sc-part-title">Estilos</h3>' +
    c.styles.map(function (x, i) { return scGroupEditHtml('', x.items, 's' + i, pool, av, 'scList' + i, x); }).join('') +
    '<div class="box sc-edit"><h3 class="sec-title" style="margin:0">Adicionar estilo</h3><div class="sc-row">' +
      scField('Estilo do catálogo', '<div class="sk-pick"><input type="text" id="scStylePick" maxlength="120" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="scStyleSug" placeholder="' +
        (W.loaded.styles ? 'Digite para buscar; um nome fora da lista vira um estilo personalizado' : 'Carregando estilos…') + '"><div class="suggest" id="scStyleSug" role="listbox" hidden></div></div>', 'sc-name') +
      '<button class="btn" type="button" id="scAddStyle">' + svg(ICON.plus, 14, 2.4) + 'Adicionar estilo</button></div>' +
      '<p class="hint-text" style="margin:0">Do catálogo, o estilo vem com Style Familiarity e, com 0 pontos, as técnicas, perícias cinemáticas, técnicas cinemáticas e perks dele (na ficha, só aparecem com pelo menos 1 ponto). As perícias que ele pede são pré-requisito: vêm da ficha só com o NH (os pontos já foram gastos), e o estilo fica marcado se faltar alguma.</p>' +
    (fromSkills.length ? '<h3 class="sec-title" style="margin:8px 0 0">Trazer da seção Perícias</h3><div class="sc-row">' +
      scField('Perícia', '<select id="scFromSkill">' + fromSkills.map(function (k, i) { return '<option value="' + i + '">' + esc(k.name + ' · ' + k.attr + '/' + k.diff + ' · ' + k.pts + ' pts') + '</option>'; }).join('') + '</select>', 'sc-name') +
      scField('Para', '<select id="scFromTarget">' + scOpts(targets, targets[0][0]) + '</select>') +
      '<button class="btn" type="button" id="scBring">Trazer</button></div>' +
      '<p class="hint-text" style="margin:0">A perícia sai da seção Perícias e passa a contar aqui, com os mesmos pontos.</p>' : '') + '</div>' +
    '<div class="form-err" id="scErr" role="alert"></div>';
}
// The style tables are always SC_COL wide: as many columns as fit in the section, and the grid
// exactly as wide as them, so they never stretch (below SC_COL, the whole width). Recomputed when
// the section changes width. Done here and not with a container query: that would make the
// section the reference of the position:fixed table being dragged.
var SC_COL = 460, SC_GAP = 14, scResize = null;
function fitScMasonry() {
  var box = $('scGroups'), w = box && box.parentElement ? box.parentElement.clientWidth : 0; if (!w) return;
  var n = Math.max(1, Math.floor((w + SC_GAP) / (SC_COL + SC_GAP)));
  box.style.columnCount = String(n);
  box.style.maxWidth = w < SC_COL ? '' : (n * SC_COL + (n - 1) * SC_GAP) + 'px';
}
function wireSheetCombat(s) {
  var ui = S.ui, ed = $('scEdit');
  if (scResize) { scResize.disconnect(); scResize = null; }
  if ($('scGroups')) {
    fitScMasonry();
    if (typeof ResizeObserver !== 'undefined') { scResize = new ResizeObserver(fitScMasonry); scResize.observe($('combat')); }
  }
  wireCombatDrag(s);
  if (ed) ed.onclick = function () {
    ui.combatDraft = { c: sheetCombat(s), moved: [] };
    renderSheetPage();
    // Suggestions and autofill come from Regras › Combate; the editor redraws once they arrive.
    var d = ui.combatDraft;
    Promise.all(['styles', 'techniques', 'skills', 'advantages'].map(loadCatalog)).then(function () {
      if (ui.combatDraft !== d) return;
      var n = scFixKinds(d.c);
      if (n) toast(plural(n, 'linha estava', 'linhas estavam') + ' com o tipo errado e ' + (n === 1 ? 'foi corrigida' : 'foram corrigidas') + ' (ex.: perk marcado como perícia). Salve para guardar.');
      renderSheetPage();
    });
  };
  var d = ui.combatDraft, box = $('combat'); if (!d || !box || !$('scSave')) return;
  var c = d.c, a = sheetAttrsNow(s), av = attrValues(a);
  function group(g) { return g === 'g' ? c.general : c.styles[+g.slice(1)].items; }
  function styleOf(g) { return g === 'g' ? null : c.styles[+g.slice(1)]; }
  // Open or fold a style's block in place (no redraw: the focus stays where it is).
  function scFold(g, open) {
    var st = styleOf(g), el = box.querySelector('[data-group="' + g + '"]'); if (!el) return;
    if (st) st.open = open; else d.gOpen = open; el.classList.toggle('closed', !open);
    var b = el.querySelector('[data-fold]'); if (b) b.setAttribute('aria-expanded', String(open));
  }
  function paint() {
    var pool = combatSkillPool(c, s);
    box.querySelectorAll('[data-nh]').forEach(function (el) {
      var p = el.getAttribute('data-nh').split(':'), x = group(p[0])[+p[1]]; if (!x) return;
      var nh = combatNh(cleanCombatItem(x), pool, av);
      el.className = 'sc-nh' + (x.bonus ? ' bonus' : ''); el.innerHTML = scEditNhHtml(nh);
    });
    box.querySelectorAll('[data-bnote]').forEach(function (el) { var p = el.getAttribute('data-bnote').split(':'), x = group(p[0])[+p[1]]; if (x) el.hidden = !x.bonus; });
    $('scTotal').textContent = combatTotal(cleanCombat(c)) + ' pts';
  }
  function onEdit(e) {
    var el = /** @type {AnyEl} */ (e.target), f = el && el.dataset && el.dataset.f; if (!f) return;
    var v = el.value, change = e.type === 'change';
    if (/Note$/.test(f) && v.trim()) el.classList.remove('invalid');
    var g = el.getAttribute('data-g'); if (!g) return;
    if (f === 'stname') {
      // Its Style Familiarity follows the name, while it still has the one it got.
      var stl = styleOf(g), old = scSfName(stl.name.trim());
      stl.name = v;
      stl.items.forEach(function (y, n) {
        if (!scIsSf(y) || y.name !== old) return;
        y.name = scSfName(v.trim());
        var inp = box.querySelector('[data-f="name"][data-g="' + g + '"][data-n="' + n + '"]'); if (inp instanceof HTMLInputElement) inp.value = y.name;
      });
      return;
    }
    var x = group(g)[+el.getAttribute('data-n')]; if (!x) return;
    if (f === 'kind') { if (change) { group(g)[+el.getAttribute('data-n')] = scAutofill(cleanCombatItem({ kind: v, name: x.name, pts: x.pts, bonus: x.bonus, bonusNote: x.bonusNote })); renderSheetPage(); } return; }
    if (f === 'name') {
      x.name = v;
      if (change) {
        // A name from the style's lists sets the kind; a known one fills the other fields.
        var k = x.kind === 'spell' ? null : scKindOf(styleOf(g), v), y = cleanCombatItem(Object.assign({}, x, k ? { kind: k } : {}));
        if (x.sub && y.kind === 'trait') y.sub = x.sub;
        group(g)[+el.getAttribute('data-n')] = scAutofill(y);
        renderSheetPage(); return;
      }
    } else if (f === 'attr' || f === 'diff' || f === 'base' || f === 'bonusNote') x[f] = v;
    else if (f === 'max') x.max = v === '' ? null : +v;
    else if (v !== '') x[f] = +v;
    paint();
  }
  box.addEventListener('input', onEdit); box.addEventListener('change', onEdit);
  // A row's name: the suggestions below it as it is typed (scNameOptions), picked with a click or the
  // arrows and Enter; picking one is as leaving the field (the row is filled from the catalog).
  var ns = { input: null, list: null, opts: [], act: 0 };
  function nameField(e) { var t = /** @type {AnyEl} */ (e.target); return t && t.getAttribute && t.getAttribute('data-f') === 'name' && t.closest('.sc-row') ? t : null; }
  function hideNames() { if (ns.list) { ns.list.hidden = true; ns.list.innerHTML = ''; ns.input.setAttribute('aria-expanded', 'false'); } ns.input = null; ns.list = null; ns.opts = []; }
  function paintNames(input) {
    var g = input.getAttribute('data-g'), x = group(g)[+input.getAttribute('data-n')], list = input.parentNode.querySelector('.suggest'); if (!x || !list) return;
    if (ns.list && ns.list !== list) hideNames();
    ns.input = input; ns.list = list; ns.opts = scNameOptions(x, styleOf(g), input.value); ns.act = Math.min(ns.act, Math.max(0, ns.opts.length - 1));
    if (!ns.opts.length || (ns.opts.length === 1 && norm(ns.opts[0].name) === norm(input.value))) { list.hidden = true; list.innerHTML = ''; input.setAttribute('aria-expanded', 'false'); return; }
    list.innerHTML = ns.opts.map(function (o, i) {
      return '<button type="button" role="option" data-o="' + i + '" class="' + (i === ns.act ? 'act' : '') + '" aria-selected="' + (i === ns.act) + '"><span>' + esc(o.name) + (o.entry ? ptNameHtml(o.entry) : '') + '</span>' +
        (o.info ? '<small>' + esc(o.info) + '</small>' : '') + '</button>';
    }).join('');
    list.hidden = false; input.setAttribute('aria-expanded', 'true');
    var on = list.querySelector('.act'); if (on) on.scrollIntoView({ block: 'nearest' });
  }
  function pickName(i) {
    var o = ns.opts[i], input = ns.input; if (!o || !input) return;
    var g = input.getAttribute('data-g'), n = input.getAttribute('data-n');
    input.value = o.name; hideNames();
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    // The change redraws the page: the points field is the new one.
    var pts = document.querySelector('#combat [data-f="pts"][data-g="' + g + '"][data-n="' + n + '"]'); if (pts instanceof HTMLInputElement) { pts.focus(); pts.select(); }
  }
  // The catalog of a row's kind loads when its name gets the focus (the list follows when it arrives).
  var SC_KIND_CAT = { skill: 'skills', tech: 'techniques', trait: 'advantages', spell: 'spells' };
  box.addEventListener('focusin', function (e) {
    var t = nameField(e); if (!t) return;
    var x = group(t.getAttribute('data-g'))[+t.getAttribute('data-n')]; ns.act = 0;
    loadCatalog(SC_KIND_CAT[x && x.kind] || 'skills').then(function () { if (document.activeElement === t) paintNames(t); });
    paintNames(t);
  });
  box.addEventListener('input', function (e) { var t = nameField(e); if (t && e.isTrusted !== false && document.activeElement === t) { ns.act = 0; paintNames(t); } });
  box.addEventListener('focusout', function (e) { var t = nameField(e); if (t) setTimeout(function () { if (ns.input === t && document.activeElement !== t) hideNames(); }, 150); });
  box.addEventListener('keydown', function (e) {
    var t = nameField(e); if (!t || ns.input !== t || !ns.opts.length || ns.list.hidden) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); ns.act = Math.min(ns.opts.length - 1, ns.act + 1); paintNames(t); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); ns.act = Math.max(0, ns.act - 1); paintNames(t); }
    else if (e.key === 'Enter') { e.preventDefault(); pickName(ns.act); }
    else if (e.key === 'Escape') { e.stopPropagation(); hideNames(); }
  });
  box.addEventListener('mousedown', function (e) { if (/** @type {AnyEl} */ (e.target).closest && /** @type {AnyEl} */ (e.target).closest('.sc-row .suggest')) e.preventDefault(); });
  // Only the list of a row's name (the one open, ns.list): the style picker's list, in a row too, has its own.
  box.addEventListener('click', function (e) {
    var o = /** @type {AnyEl} */ (e.target).closest && /** @type {AnyEl} */ (e.target).closest('.sc-row .suggest [data-o]');
    if (o && ns.list && ns.list.contains(o)) { pickName(+o.getAttribute('data-o')); e.stopPropagation(); }
  }, true);
  box.addEventListener('click', function (e) {
    var fold = /** @type {AnyEl} */ (e.target).closest && /** @type {AnyEl} */ (e.target).closest('[data-fold]');
    if (fold) { scFold(fold.getAttribute('data-fold'), fold.getAttribute('aria-expanded') !== 'true'); return; }
    var b = /** @type {AnyEl} */ (e.target).closest && /** @type {AnyEl} */ (e.target).closest('[data-del], [data-delstyle], [data-add]'); if (!b) return;
    if (b.hasAttribute('data-del')) { var p = b.getAttribute('data-del').split(':'); group(p[0]).splice(+p[1], 1); }
    else if (b.hasAttribute('data-delstyle')) {
      var st = styleOf(b.getAttribute('data-delstyle'));
      if (st.items.length && !confirm('Remover o estilo ' + (st.name || '') + ' e tudo o que está nele?')) return;
      c.styles.splice(+b.getAttribute('data-delstyle').slice(1), 1);
    } else {
      var q = b.getAttribute('data-add').split(':'), sub = q[1] === 'perk' || q[1] === 'adv' ? q[1] : '';
      var item = cleanCombatItem({ kind: sub ? 'trait' : q[1], name: '', pts: q[1] === 'tech' ? 0 : 1 });
      if (sub) item.sub = sub; // which button (for the placeholder and the advantage's cost; not saved)
      if (q[1] === 'spell') loadCatalog('spells');
      group(q[0]).push(item);
      renderSheetPage();
      var rows = document.querySelectorAll('[data-group="' + q[0] + '"] [data-f="name"]'), last = rows[rows.length - 1];
      if (last instanceof HTMLElement) last.focus();
      return;
    }
    renderSheetPage();
  });
  // The style to add: typed, the catalog filtered below as it goes (name or book page), picked
  // with a click or the arrows and Enter. A name not picked from the list is a free style.
  var pick = $('scStylePick'), sug = $('scStyleSug'), opts = [], act = 0;
  function styleMatches(q) {
    q = norm(q).trim();
    var starts = [], has = [];
    (W.styles || []).forEach(function (x) {
      if (!q) { starts.push(x); return; }
      var at = norm(x.name).indexOf(q);
      if (at === 0) starts.push(x); else if (at > 0 || norm(x.page || '').indexOf(q) >= 0) has.push(x);
    });
    return starts.concat(has);
  }
  function hideStyles() { sug.hidden = true; sug.innerHTML = ''; pick.setAttribute('aria-expanded', 'false'); pick.removeAttribute('aria-activedescendant'); }
  // A name the catalog does not have (exactly) is offered as a custom style, at the end (as in Criar Armadura).
  function paintStyles() {
    var typed = pick.value.trim();
    opts = styleMatches(pick.value);
    if (typed && !(W.styles || []).some(function (x) { return norm(x.name) === norm(typed); })) opts = opts.concat([{ custom: true, name: typed }]);
    act = Math.min(act, Math.max(0, opts.length - 1));
    if (!opts.length) { hideStyles(); return; }
    sug.innerHTML = opts.map(function (x, n) {
      if (x.custom) return '<button type="button" role="option" id="scStyleSug' + n + '" data-o="' + n + '" class="ab-custom-opt' + (n === act ? ' act' : '') + '" aria-selected="' + (n === act) + '">' +
        '<span>' + svg(ICON.plus, 13, 2.4) + 'Usar “' + esc(x.name) + '” como estilo personalizado</span><small>' +
        (isMestre() ? 'abre Novo estilo de Regras › Combate; ao salvar, ele entra na ficha' : 'um estilo livre: ponha nele as perícias, técnicas e perks') + '</small></button>';
      return '<button type="button" role="option" id="scStyleSug' + n + '" data-o="' + n + '" class="' + (n === act ? 'act' : '') + '" aria-selected="' + (n === act) + '">' +
        '<span>' + esc(x.name) + '</span><small>' + esc([x.page, styleCost(x)].filter(Boolean).join(' · ')) + '</small></button>';
    }).join('');
    sug.hidden = false; pick.setAttribute('aria-expanded', 'true'); pick.setAttribute('aria-activedescendant', 'scStyleSug' + act);
    var on = sug.querySelector('.act'); if (on) on.scrollIntoView({ block: 'nearest' });
  }
  // A catalog style is picked (then Adicionar estilo). A custom one: for the Mestre, the form of a new
  // style of Regras › Combate, with the name typed; saved, the style is in the catalog and goes on the
  // sheet (the editor stays open). For a player, a free style of the sheet, added right away.
  function pickStyle(n) {
    var x = opts[n]; if (!x) return;
    pick.value = x.name; hideStyles();
    if (x.custom && isMestre()) {
      openStyleForm(null, { name: x.name, then: function (id, fields) {
        if (ui.combatDraft !== d) return; // the editor was closed meanwhile
        addStyle(styleById(id) || Object.assign({ id: id }, fields));
      } });
      return;
    }
    if (x.custom) { delete pick.dataset.id; pick.dataset.custom = '1'; $('scAddStyle').click(); return; }
    pick.dataset.id = x.id; $('scAddStyle').focus();
  }
  pick.addEventListener('input', function () { delete pick.dataset.id; delete pick.dataset.custom; act = 0; paintStyles(); });
  pick.addEventListener('focus', function () { act = 0; paintStyles(); });
  pick.addEventListener('blur', function () { setTimeout(function () { if (document.activeElement !== pick) hideStyles(); }, 150); });
  pick.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); if (!sug.hidden && opts.length) pickStyle(act); else $('scAddStyle').click(); return; }
    if (sug.hidden || !opts.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); act = Math.min(opts.length - 1, act + 1); paintStyles(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); act = Math.max(0, act - 1); paintStyles(); }
    else if (e.key === 'Escape') { e.stopPropagation(); hideStyles(); }
  });
  sug.addEventListener('mousedown', function (e) { e.preventDefault(); });
  sug.addEventListener('click', function (e) { var b = e.target.closest('[data-o]'); if (b) pickStyle(+b.getAttribute('data-o')); });
  $('scAddStyle').onclick = function () {
    var name = pick.value.trim(), cat = pick.dataset.id ? styleById(pick.dataset.id) : null;
    // Typed in full without picking: the catalog style of that exact name (not when the custom one was chosen).
    if (!cat && name && !pick.dataset.custom) cat = (W.styles || []).filter(function (x) { return norm(x.name) === norm(name); })[0] || null;
    addStyle(cat, name);
  };
  // A style on the sheet: from the catalog (cat), or free with its name; it opens, at the end.
  function addStyle(cat, name) {
    var st = cat ? styleFromCatalog(cat, combatSkillPool(c, s)) : { name: name, items: [scSfItem(name)] };
    st.open = true;
    c.styles.push(st);
    renderSheetPage();
    // Only when the sheet lacks a skill the style requires; the block is marked as well.
    var miss = scReqsMissing(scStyleReqs(st, combatSkillPool(c, s)));
    if (miss.length) toast('Pré-requisito de ' + st.name + ' não atendido. Falta: ' + miss.join('; ') + '.', true);
  }
  var bring = $('scBring'); if (bring) bring.onclick = function () {
    var left = sheetSkills(s).filter(function (k) { return !d.moved.some(function (m) { return m.name === k.name && m.attr === k.attr && m.diff === k.diff; }); });
    var k = left[+$('scFromSkill').value], t = $('scFromTarget').value; if (!k) return;
    d.moved.push(k);
    if (t === 'g') d.gOpen = true; else styleOf(t).open = true; // opens where it went
    group(t).push(cleanCombatItem({ kind: 'skill', name: k.name, attr: k.attr, diff: k.diff, pts: k.pts, bonus: k.bonus, bonusNote: k.bonusNote, skillId: k.skillId }));
    renderSheetPage();
  };
  $('scCancel').onclick = function () { ui.combatDraft = null; renderSheetPage(); };
  $('scSave').onclick = function () {
    if (!checkBonusNotes(box)) {
      // A reason missing in a folded style: the style opens to show it.
      box.querySelectorAll('.sc-edit.closed .invalid').forEach(function (el) { scFold(el.closest('[data-group]').getAttribute('data-group'), true); });
      $('scErr').textContent = 'Escreva o motivo de cada bônus.'; return;
    }
    $('scErr').textContent = '';
    var btn = $('scSave'); btn.disabled = true; btn.textContent = 'Salvando…'; $('scCancel').disabled = true;
    // Danos and Defesas are edited in their own sections: theirs as they are now.
    var cur = sheetCombat(sheetById(s.id) || s);
    Ops.saveSheetCombat(s, Object.assign({}, c, { weapons: cur.weapons, def: cur.def }), d.moved).then(function () { ui.combatDraft = null; toast('Combate salvo.'); renderSheetPage(); }, function (er) {
      btn.disabled = false; btn.textContent = 'Salvar'; $('scCancel').disabled = false; $('scErr').textContent = errorText(er);
    });
  };
}

/* ---------- Danos and Defesas ----------
   Sections of their own, side by side below Combate, each with its editor; still saved in
   sheet.combat (weapons and def), only their part, over the combat as it is now.
   S.ui.dmgDraft: the attacks being changed (Danos is in ficha-danos.js); S.ui.defDraft: the defenses. */
Ops.saveSheetCombatPart = function (s, part) {
  var cur = sheetById(s.id) || s;
  return Ops.saveSheetCombat(cur, Object.assign(sheetCombat(cur), part));
};
// Danos (id 'dm') and Defesas ('df') fold like the other sections (gearFoldTitle; keys 'dmg' and 'def').
function scSectionHead(title, editing, id, label) {
  return '<div class="gurps-head">' + sheetGripHtml('Danos e Defesas') + gearFoldTitle(id === 'dm' ? 'dmg' : 'def', title, editing) +
    (editing ? secSaveBtnsHtml(id + 'Cancel', id + 'Save', label) : canWrite() && !sheetDraftOpen() ? secEditBtnHtml(id + 'Edit', label) : '') + '</div>';
}
function sheetDefenseHtml(s, editing) {
  var ui = S.ui, c = sheetCombat(s), a = sheetAttrsNow(s), pool = combatSkillPool(c, s), head = scSectionHead('Defesas', editing, 'df', 'defesas');
  if (!editing) return '<section class="gurps' + gearFoldClass('def', editing) + '" id="defense">' + head + scDefHtml(c, combatDefenses(scWithAdvs(c, s), pool, attrValues(a), gurpsStats(a), a, s)) + '</section>';
  var dd = ui.defDraft;
  var parryNames = pool.filter(function (k) { return SC_PARRY[combatKey(k.name)]; }).map(function (k) { return [k.name, k.name]; });
  var blockNames = pool.filter(function (k) { return /^(shield|cloak)\b/.test(combatKey(k.name)); }).map(function (k) { return [k.name, k.name]; });
  return '<section class="gurps' + gearFoldClass('def', editing) + '" id="defense">' + head + '<div class="box sc-edit"><div class="sc-row">' +
    scField('Aparar com', '<select data-f="parry"><option value="">Automático (a melhor)</option>' + scOpts(parryNames, dd.parry) + '</select>', 'sc-name') +
    scField('Bônus', '<input type="number" data-f="parryBonus" min="-20" max="20" value="' + dd.parryBonus + '">') + scDefNote('parry', dd.parryNote, dd.parryBonus) + '</div><div class="sc-row">' +
    scField('Bloquear com', '<select data-f="block"><option value="">Automático (a melhor)</option>' + scOpts(blockNames, dd.block) + '</select>', 'sc-name') +
    scField('Bônus', '<input type="number" data-f="blockBonus" min="-20" max="20" value="' + dd.blockBonus + '">') + scDefNote('block', dd.blockNote, dd.blockBonus) + '</div><div class="sc-row">' +
    scField('Esquiva: bônus', '<input type="number" data-f="dodgeBonus" min="-20" max="20" value="' + dd.dodgeBonus + '">') +
    scField('DB do escudo', '<input type="number" data-f="db" min="0" max="10" value="' + dd.db + '">') + scDefNote('dodge', dd.dodgeNote, dd.dodgeBonus) + '</div>' +
    '<p class="hint-text" style="margin:0">Pelas regras do Basic Set (pp. B374-377): Aparar = 3 + NH/2 com a arma (bastão +2, faca -1); Bloqueio = 3 + Shield ou Cloak/2 + DB; Esquiva = VB + 3 - carga, sem o DB do escudo. Como em Danos, só vale o que está em uso: Aparar com as armas e Bloqueio com os escudos e capas da configuração do Corpo em uso (Equip. › Corpo); desarmado (Boxing, Judo, Karate, Brawling, Wrestling) sempre. Combat Reflexes e Enhanced Block, Parry e Dodge comprados em Combate ou Vantagens entram sozinhos. O DB é o do escudo ou capa em uso e soma em Aparar e Bloqueio (não na Esquiva), contra ataques pela frente ou do lado do escudo; com escudo ou capa numa mão, Wrestling e Sumo Wrestling não aparam (usam as duas mãos); o campo DB vale só para um escudo em uso sem DB conhecido. Outros bônus vão nos campos Bônus, com o motivo, que aparece ao passar o mouse.</p></div>' +
    '<div class="form-err" id="dfErr" role="alert"></div></section>';
}
// Side by side, as in the spreadsheet; one below the other while one is edited.
function sheetDmgDefHtml(s) {
  var ui = S.ui, can = canWrite(), dm = !!ui.dmgDraft && can, df = !!ui.defDraft && can;
  return '<div class="sc-pair' + (dm || df ? ' editing' : '') + '">' + sheetDamageHtml(s, dm) + sheetDefenseHtml(s, df) + '</div>';
}
function scSaving(id, label, on) {
  var btn = $(id + 'Save'); btn.disabled = on; btn.textContent = on ? 'Salvando…' : 'Salvar'; $(id + 'Cancel').disabled = on;
}
function wireSheetDefense(s) {
  var ui = S.ui, ed = $('dfEdit');
  if (ed) ed.onclick = function () { ui.defDraft = sheetCombat(s).def; renderSheetPage(); };
  // Fold "Sem arma" in place, and open how a value was reached.
  var sec = $('defense');
  if (sec) {
    sec.querySelectorAll('[data-dmfold]').forEach(function (b) {
      b.addEventListener('click', function () {
        var key = b.getAttribute('data-dmfold'), open = b.getAttribute('aria-expanded') !== 'true';
        b.setAttribute('aria-expanded', String(open)); lstore('hounds_dm_fold_' + key, open ? '1' : '0');
        sec.querySelectorAll('[data-dmin="' + key + '"]').forEach(function (r) { /** @type {HTMLElement} */ (r).hidden = !open; });
      });
    });
    sec.querySelectorAll('[data-dfwhy]').forEach(function (b) {
      b.addEventListener('click', function () {
        var p = b.getAttribute('data-dfwhy').split(':'), e = DF_VIEW[+p[0]]; if (!e) return;
        if (p[1] === 'ret') scDefRetreatModal(e); else scDefWhyModal(e);
      });
    });
  }
  var d = ui.defDraft, box = $('defense'); if (!d || !box || !$('dfSave')) return;
  function onEdit(e) {
    var el = /** @type {AnyEl} */ (e.target), f = el && el.dataset && el.dataset.f; if (!f || !(f in d)) return;
    var v = el.value;
    if (/Note$/.test(f) && v.trim()) el.classList.remove('invalid');
    d[f] = /Bonus$|^db$/.test(f) ? (v === '' ? 0 : +v) : v;
    if (/Bonus$/.test(f)) box.querySelectorAll('[data-dnote]').forEach(function (n) { n.hidden = !d[n.getAttribute('data-dnote') + 'Bonus']; });
  }
  box.addEventListener('input', onEdit); box.addEventListener('change', onEdit);
  $('dfCancel').onclick = function () { ui.defDraft = null; renderSheetPage(); };
  $('dfSave').onclick = function () {
    if (!checkBonusNotes(box)) { $('dfErr').textContent = 'Escreva o motivo de cada bônus.'; return; }
    scSaving('df', 'defesas', true); $('dfErr').textContent = '';
    Ops.saveSheetCombatPart(s, { def: d }).then(function () { ui.defDraft = null; toast('Defesas salvas.'); renderSheetPage(); }, function (er) {
      scSaving('df', 'defesas', false); $('dfErr').textContent = errorText(er);
    });
  };
}

/* ---------- arranging the tables ----------
   Out of the editor, a table is dragged by the handle in its header (mouse, finger or pen) or
   moved with the arrow keys on it (wireDragSort); the new order is saved at once. */
function saveCombatOrder(s, keys) {
  var cur = sheetById(s.id) || s, c = sheetCombat(cur), styles = [];
  keys.forEach(function (k) { if (c.styles[+k.slice(1)]) styles.push(c.styles[+k.slice(1)]); });
  if (styles.length !== c.styles.length) return; // someone changed the styles meanwhile: keep theirs
  c.styles = styles;
  Ops.saveSheetCombat(cur, c).catch(function (er) { toast(errorText(er), true); renderSheetPage(); });
}
function wireCombatDrag(s) {
  var box = $('scGroups'); if (!box || !box.querySelector('.sc-grip')) return;
  var ui = S.ui;
  // After the page redraws (the save arrives), the moved table keeps the focus.
  if (ui.scFocus != null) {
    var g = box.querySelectorAll('.sc-grip')[ui.scFocus]; ui.scFocus = null;
    if (g instanceof HTMLElement) g.focus();
  }
  wireDragSort(box, { item: '.sc-card', grip: '.sc-grip', ph: 'sc-ph', done: function (keys, card, byKey) {
    if (byKey) ui.scFocus = keys.indexOf(card.getAttribute('data-key'));
    saveCombatOrder(s, keys);
  } });
}

