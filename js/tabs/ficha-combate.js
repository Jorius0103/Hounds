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
                                                    player's spreadsheet (styleId: Mundo › Combate)
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
   ===================================================================== */
var SC_KINDS = [['skill', 'Perícia'], ['tech', 'Técnica'], ['trait', 'Perk ou vantagem']];
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
  var kind = x.kind === 'tech' || x.kind === 'trait' ? x.kind : 'skill';
  var o = { kind: kind, name: scStr(x.name, 120), pts: cleanInt(x.pts, 0, 999, kind === 'tech' ? 0 : 1) };
  if (kind === 'trait') return o;
  o.bonus = cleanInt(x.bonus, -20, 20, 0);
  var note = o.bonus ? cleanBonusNote(x.bonusNote) : ''; if (note) o.bonusNote = note;
  if (kind === 'skill') {
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

/* ---------- levels ---------- */
// Every skill the sheet knows (Combate and Perícias), for the techniques' base skills.
function combatSkillPool(c, s) {
  var pool = [];
  c.styles.forEach(function (st) { st.items.forEach(function (x) { if (x.kind === 'skill') pool.push(x); }); });
  c.general.forEach(function (x) { if (x.kind === 'skill') pool.push(x); });
  // The talents' bonus (Ficha › Vantagens) on every skill, and so on the techniques built on them.
  return applyTalents(pool.concat(sheetSkills(s)), s);
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
// "2d-1" plus 2 is "2d+1". An add of +4 or more becomes dice: every +4 is +1d ("2d+4" is "3d",
// "2d+7" is "3d+3"). dmgAddRaw keeps the add as it is ("2d+7").
function dmgAddRaw(dice, add) {
  var m = /^(\d+)d([+-]\d+)?$/.exec(dice); if (!m) return dice;
  var k = (+m[2] || 0) + add;
  return m[1] + 'd' + (k > 0 ? '+' + k : k < 0 ? String(k) : '');
}
function dmgAdd(dice, add) {
  var m = /^(\d+)d([+-]\d+)?$/.exec(dice); if (!m) return dice;
  var n = +m[1], k = (+m[2] || 0) + add;
  if (k >= 4) { n += Math.floor(k / 4); k %= 4; }
  return n + 'd' + (k > 0 ? '+' + k : k < 0 ? String(k) : '');
}
function weaponDamage(w, st) {
  if (w.mode === 'fixed') return w.mod || '—';
  var base = gurpsDamage(st)[w.mode === 'thr' ? 'thr' : 'sw'], add = /^[+-]?\d+$/.test(w.mod) ? +w.mod : 0;
  return dmgAdd(base, add);
}

/* ---------- catalog helpers (Mundo › Combate) ---------- */
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
// Fills attr/diff (skills) or base/diff/default/limit (techniques) from the catalogs, when the name is known.
function scAutofill(x) {
  if (x.kind === 'skill') {
    var sk = /** @type {any} */ (styleFind('skill', x.name));
    if (sk && sk.attribute && SKILL_DIFFS[sk.difficulty]) { x.attr = sk.attribute; x.diff = sk.difficulty; x.skillId = sk.id; }
    else if (SC_MELEE_DIFF[combatKey(x.name)]) { x.attr = 'DX'; x.diff = SC_MELEE_DIFF[combatKey(x.name)]; }
  } else if (x.kind === 'tech') {
    var p = scSplitTech(x.name), t = /** @type {any} */ (styleFind('tech', p.tech) || styleFind('tech', x.name));
    if (p.base) x.base = p.base;
    if (t) { x.diff = t.difficulty === 'A' ? 'A' : 'H'; x.def = techDefaultFor(t, x.base); x.max = techMaxOf(t); x.techId = t.id; }
  } else if (/^Enhanced (Block|Parry)/i.test(x.name) && x.pts < 5) x.pts = /\(all/i.test(x.name) ? 10 : 5;
  else if (/^Enhanced Dodge/i.test(x.name) && x.pts < 15) x.pts = 15;
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
// Perks and combat advantages offered in every table's suggestions.
function scTraitSuggestions() {
  var out = ['Combat Reflexes', 'Enhanced Block', 'Enhanced Parry', 'Enhanced Dodge', 'Weapon Master', 'Trained by a Master', 'Weapon Bond'];
  (W.advantages || []).forEach(function (a) { if (/^perk$/i.test(a.type || '')) out.push(a.name); });
  return out;
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
var SC_STYLE_BRINGS = [['techniques', 'tech'], ['cinematicSkills', 'skill'], ['cinematicTechniques', 'tech'], ['perks', 'trait']];
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
  var hit = null;
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
// Suggestions for the names of a style's rows: its lists in the catalog, or all combat
// skills and techniques for a free style and for the skills outside styles.
function scSuggestions(st) {
  var cat = st && st.styleId ? styleById(st.styleId) : null, out = [];
  if (cat) ['skills', 'techniques', 'perks', 'cinematicSkills', 'cinematicTechniques', 'optSkills', 'optTechniques', 'optPerks', 'optAdvantages']
    .forEach(function (f) { out = out.concat(styleItems(cat[f])); });
  else {
    (W.skills || []).forEach(function (s) { if (isCombatSkill(s)) out.push(s.name); });
    Object.keys(SC_MELEE_DIFF).forEach(function (k) { out.push(k.replace(/(^|[\s/-])\w/g, function (m) { return m.toUpperCase(); })); });
    (W.techniques || []).forEach(function (t) { if (isCombatTech(t)) out.push(t.name); });
  }
  out = out.concat(scTraitSuggestions());
  return out.filter(function (v, i) { return out.indexOf(v) === i; });
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
  return '<td class="gnh' + (bonus ? ' bonus' : '') + '"' + (title ? ' title="' + esc(title) + '"' : '') + '>' +
    esc(nh.rel) + '<small>' + esc(nh.lvl) + '</small></td>';
}
// The catalog entry of a row, shown in a modal on click: the skills of Mundo › Combate (the
// melee weapon skills point to "Melee Weapon", which describes them all), the techniques, and
// the perks and advantages of Mundo › Vantagens (Enhanced Block/Parry/Dodge are "Enhanced
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
  var n = /^enhanced (block|parry|dodge)\b/i.test(x.name) ? 'Enhanced Defenses' : x.name, k = combatKey(n), list = W.advantages || [];
  var a = list.filter(function (y) { return norm(y.name) === norm(n); })[0] ||
    list.filter(function (y) { return combatKey(y.name) === k && !/^expans/i.test(y.type || ''); })[0] ||
    list.filter(function (y) { return combatKey(y.name) === k; })[0];
  return a ? { attr: 'data-adv-modal', id: a.id, href: advHref(a.id), title: 'Ver ' + (/^perk$/i.test(a.type || '') ? 'o perk' : 'a vantagem') } : null;
}
function scItemName(x) {
  var tag = x.kind === 'skill' ? x.attr + '/' + x.diff : x.kind === 'tech' ? 'Técnica ' + (x.diff === 'A' ? 'Média' : 'Difícil') : '';
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
function scGroupHtml(title, items, pool, av, href, key, drag, reqs) {
  var label = href ? '<a href="' + href + '" title="Ver o estilo">' + esc(title) + '</a>' : esc(title);
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
// The main table (the skills outside styles), in name order, split in three side by side, down each
// column; the title over the first, the total once below them.
function scMainHtml(all, pool, av) {
  var items = scShown(all).sort(byName), per = Math.ceil(items.length / 3), cols = [];
  for (var i = 0; i < items.length; i += per) cols.push(items.slice(i, i + per));
  return '<div class="sc-main"><div class="gurps-grid">' + cols.map(function (col, j) {
    return '<table class="gtab sc-tab"><thead><tr><th>' + (j ? '&nbsp;' : 'Perícias de Combate') + '</th><th>Pts</th><th>NH</th></tr></thead><tbody>' +
      col.map(function (x) { return '<tr>' + scItemName(x) + '<td class="gpts">' + x.pts + '</td>' + scNhCell(x, pool, av) + '</tr>'; }).join('') + '</tbody></table>';
  }).join('') + '</div><table class="gtab sc-tab"><tfoot><tr><td colspan="2">Total perícias de combate</td><td class="gpts">' + sumPts(items) + '</td></tr></tfoot></table></div>';
}
// The style tables in the order the player left them ('s<i>'). The other skills' table is not
// among them: it is the main one, always first, above the points per style.
function combatOrder(c) { return c.styles.map(function (st, i) { return 's' + i; }); }
function scDmgLabel(t) { var x = SC_DMG_TYPES.filter(function (y) { return y[0] === t; })[0]; return x ? x[1] : t; }
// Parry by skill (Basic Set): [modifier of the Parry column of the Melee Weapon Table (pp. B271-273)
// for the skill's usual weapon, kind]. Kind: 'U' unbalanced (cannot parry after attacking with
// it), 'F' fencing (+3 retreating, parry at -encumbrance, p. B208), 'K' Boxing/Judo/Karate
// (+3 retreating, p. B377), 'H' one-handed unarmed, 'W' Sumo Wrestling/Wrestling (both hands).
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
//   a ready shield's DB adds to all three (shown in parentheses); retreating gives +3 to Dodge,
//   +1 to Parry and Block, +3 to Parry with Boxing, Judo, Karate and fencing weapons.
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
  skills.forEach(function (k) {
    var p = SC_PARRY[k.key];
    // Unarmed: always; a weapon skill only with a weapon in use (below).
    if (p && /[KHW]/.test(p[1])) {
      var base = p[1] === 'K' || p[1] === 'H' ? Math.max(k.abs, av.DX) : k.abs;
      var notes = [], pEnc = (p[1] === 'F' || k.key === 'karate') ? enc : 0;
      var v = 3 + Math.floor(base / 2) + p[0] + ep + cr + fp[0] + d.parryBonus - pEnc;
      var calc = scCalc([[3, ''], [Math.floor(base / 2), (base > k.abs ? 'DX ' + base + ', maior que ' + k.name + ' ' + k.abs : k.name + ' ' + base) + ' ÷ 2'],
        [p[0], 'arma'], [cr, 'Combat Reflexes'], [ep, 'Enhanced Parry'], fp, [d.parryBonus, scBonusLabel(d.parryNote)], [-pEnc, 'carga']], v);
      if (p[0]) notes.push('arma ' + (p[0] > 0 ? '+' : '') + p[0]);
      if (p[1] === 'U') notes.push('desbalanceada: não apara se atacou com ela no turno');
      if (p[1] === 'H') notes.push('-3 contra armas, exceto golpes de ponta');
      if (p[1] === 'W') notes.push('usa as duas mãos');
      if ((p[1] === 'F' || k.key === 'karate') && enc) notes.push('-' + enc + ' de carga');
      notes = notes.concat(fxCondNotes(fd.parry));
      var rp = p[1] === 'F' || p[1] === 'K' ? 3 : 1;
      parries.push({ name: k.name, value: v, retreat: v + rp, retreatBonus: rp, notes: notes, calc: calc });
    }
  });
  (gear ? gear.weapons : []).forEach(function (w) {
    var nh = w.nh.v, fen = w.flags.indexOf('F') >= 0, pEnc = fen ? enc : 0, notes = [];
    var v = 3 + Math.floor(nh / 2) + w.mod + ep + cr + fp[0] + d.parryBonus - pEnc;
    var calc = scCalc([[3, ''], [Math.floor(nh / 2), w.skill + ' ' + nh + (w.nh.adj ? ', com os ajustes da arma' : '') + ' ÷ 2'], [w.mod, 'arma'], [cr, 'Combat Reflexes'],
      [ep, 'Enhanced Parry'], fp, [d.parryBonus, scBonusLabel(d.parryNote)], [-pEnc, 'carga']], v);
    if (w.mod) notes.push('arma ' + (w.mod > 0 ? '+' : '') + w.mod);
    if (w.flags.indexOf('U') >= 0) notes.push('desbalanceada: não apara se atacou com ela no turno');
    if (pEnc) notes.push('-' + enc + ' de carga');
    notes = notes.concat(fxCondNotes(fd.parry));
    var rp = fen ? 3 : 1;
    parries.push({ name: w.skill, weapon: w.name, value: v, retreat: v + rp, retreatBonus: rp, notes: notes, calc: calc });
  });
  (gear ? gear.shields : []).forEach(function (h) {
    var nh = h.nh.v, b = 3 + Math.floor(nh / 2) + eb + cr + fb[0] + d.blockBonus;
    blocks.push({ name: h.skill, weapon: h.name, db: h.db, value: b, retreat: b + 1, retreatBonus: 1, notes: fxCondNotes(fd.block),
      calc: scCalc([[3, ''], [Math.floor(nh / 2), h.skill + ' ' + nh + (h.nh.adj ? ', com os ajustes do escudo' : '') + ' ÷ 2'], [cr, 'Combat Reflexes'], [eb, 'Enhanced Block'], fb,
        [d.blockBonus, scBonusLabel(d.blockNote)]], b) });
  });
  // The one chosen in the editor (by skill; with two weapons of it, the better), or the best.
  var best = function (l, chosen) {
    var hits = chosen ? l.filter(function (x) { return x.name === chosen; }) : [];
    return (hits.length ? hits : l).slice().sort(function (x, y) { return y.value - x.value; })[0] || null;
  };
  var block = best(blocks, d.block);
  var dodge = r.dodge + ed + cr + fdo[0] + d.dodgeBonus;
  var dcalc = scCalc([[3, ''], [Math.floor(r.speed), 'Velocidade Básica ' + fmtDec(r.speed, 2) + ', sem a fração'], [-enc, 'carga'], [cr, 'Combat Reflexes'], [ed, 'Enhanced Dodge'], fdo, [d.dodgeBonus, scBonusLabel(d.dodgeNote)]], dodge) +
    fxCondNotes(fd.dodge).map(function (t) { return ' · ' + t; }).join('');
  // DB: the one of the shield or cloak that blocks, in use; the editor's DB when its DB is not known.
  // inUse: whether there is a Corpo configuration in use (for the messages).
  return { parry: best(parries, d.parry), parries: parries, block: block, blocks: blocks, parryAuto: !d.parry, blockAuto: !d.block,
    dodge: { value: dodge, retreat: dodge + 3, retreatBonus: 3, calc: dcalc }, cr: cr, ep: ep, eb: eb, ed: ed, enc: enc,
    db: block ? (block.db != null ? block.db : d.db) : 0, inUse: !!gear };
}
// Each defense with the weapon it uses and how its value is reached; the other skills that could
// parry or block are not listed (the weapon is chosen in the editor).
function scDefHtml(c, dv) {
  var db = dv.db;
  function val(v) { return v == null ? '—' : v + (db ? ' <span class="gnote">(' + (v + db) + ' com escudo)</span>' : ''); }
  function row(label, x, weapon, empty) {
    var lines = x ? [weapon, x.calc, 'Recuando: ' + x.retreat + ' (+' + x.retreatBonus + ')' + (db ? ' · com escudo: ' + (x.value + db) + ', recuando ' + (x.retreat + db) + ' (DB ' + db + ')' : '')] : [empty];
    return '<tr><td><b>' + label + '</b>' + lines.filter(Boolean).map(function (l, i) { return '<small' + (i === 1 && x ? ' class="sc-calc"' : '') + '>' + esc(l) + '</small>'; }).join('') +
      '</td><td class="gval"' + (x ? ' title="' + esc(x.calc) + '"' : '') + '>' + val(x ? x.value : null) + '</td></tr>';
  }
  function weapon(x, auto) {
    return x ? 'Com ' + (x.weapon ? x.weapon + ' (' + x.name + ')' : x.name + ' (desarmado)') + (auto ? ', a melhor em uso' : '') + (x.notes.length ? ' · ' + x.notes.join(' · ') : '') : '';
  }
  var none = dv.inUse ? '' : ' Nenhuma configuração do Corpo em uso (Equip. › Corpo).';
  return '<table class="gtab sc-def"><thead><tr><th>Defesa</th><th>Valor</th></tr></thead><tbody>' +
    row('Aparar', dv.parry, weapon(dv.parry, dv.parryAuto), 'Nenhuma arma em uso que apare, nem perícia desarmada.' + none) +
    row('Esquiva', dv.dodge, '', '') +
    row('Bloqueio', dv.block, weapon(dv.block, dv.blockAuto), 'Nenhum escudo ou capa em uso.' + none) +
    '<tr><td colspan="2" class="gnone">Basic Set, pp. B374-377</td></tr></tbody></table>';
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
function sheetDraftOpen() { var ui = S.ui; return !!(ui.skillDraft || ui.combatDraft || ui.advDraft || ui.dmgDraft || ui.defDraft || ui.spellDraft); }
function sheetCombatHtml(s, editing) {
  var ui = S.ui, c = editing ? ui.combatDraft.c : sheetCombat(s), a = sheetAttrsNow(s), av = attrValues(a);
  var pool = combatSkillPool(c, s), can = canWrite();
  var head = '<div class="gurps-head"><h2 class="sec-title">Combate</h2><span class="gurps-total" id="scTotal">' + combatTotal(c) + ' pts</span>' +
    (editing ? '<div class="btn-row"><button class="btn ghost" type="button" id="scCancel">Cancelar</button><button class="btn primary" type="button" id="scSave">Salvar combate</button></div>'
      : can && !sheetDraftOpen() ? '<div class="btn-row"><button class="btn" type="button" id="scEdit">' + svg(ICON.edit, 15) + 'Editar combate</button></div>' : '') + '</div>';
  if (editing) return '<section class="gurps" id="combat">' + head + scEditHtml(s, c, pool, av) + '</section>';
  var empty = !c.styles.length && !c.general.length;
  if (empty) return '<section class="gurps" id="combat">' + head + '<p class="long none">Nenhum estilo ou perícia de combate.' + (can ? ' Use <b>Editar combate</b> para adicionar.' : '') + '</p></section>';
  var drag = can && !ui.skillDraft && !ui.attrDraft && !ui.advDraft;
  // Links to the catalogs (see scLink): they arrive once and the page redraws with them.
  // The styles too, for their prerequisites (see scStyleReqs).
  ['skills', 'techniques', 'advantages', 'styles'].forEach(function (k) { loadCatalog(k); });
  var groups = combatOrder(c).map(function (k) {
    var st = c.styles[+k.slice(1)];
    return scGroupHtml(st.name || 'Estilo sem nome', st.items, pool, av, st.styleId ? styleHref(st.styleId) : '', k, drag, scStyleReqs(st, pool));
  });
  return '<section class="gurps" id="combat">' + head +
    // The other skills first (the main table, not dragged), then the points per style above the
    // tables they sum up.
    (scShown(c.general).length ? scMainHtml(c.general, pool, av) : '') +
    scTotalsHtml(c, pool) +
    '<div class="sc-masonry" id="scGroups">' + groups.join('') + '</div></section>';
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
    scField('Nome', '<input type="text" data-f="name"' + at + ' maxlength="120" list="' + listId + '" autocomplete="off" value="' + esc(x.name) + '" placeholder="' +
      (x.kind === 'tech' ? 'Ex.: Counterattack (Broadsword)' : x.kind === 'trait' ? 'Ex.: Shield-Wall Training' : 'Ex.: Broadsword') + '">', 'sc-name');
  if (x.kind === 'skill') {
    f += scField('Atributo', '<select data-f="attr"' + at + '>' + scOpts(SKILL_ATTRS.map(function (v) { return [v, v]; }), x.attr) + '</select>') +
      scField('Dif.', '<select data-f="diff"' + at + '>' + scOpts(SKILL_DIFF_KEYS.map(function (v) { return [v, v]; }), x.diff) + '</select>');
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
function scEditNhHtml(nh) { return nh ? esc(nh.rel) + ' <small>' + esc(nh.lvl) + '</small>' + (nh.waste ? '<small class="sk-waste">' + nh.waste + ' pt sem efeito</small>' : '') : '<small>sem NH</small>'; }
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
      sum + (cat ? '<a class="sc-catlink" href="' + styleHref(cat.id) + '" target="_blank" rel="noopener">' + esc(cat.page || 'Ver estilo') + '</a>' : '') +
      '<button class="btn ghost" type="button" data-delstyle="' + g + '">' + svg(ICON.trash, 14) + 'Remover estilo</button></div>'
      : '<div class="sc-ghead sc-ghead-g">' + chev + '<h3 class="sec-title" style="margin:0">' + esc(title) + '</h3>' + sum + '</div>') +
    '<div class="sc-gbody"><div class="sc-rows">' + items.map(function (x, n) { return scEditRow(x, g, n, pool, av, listId); }).join('') + '</div>' +
    '<div class="btn-row">' + SC_KINDS.map(function (k) { return '<button class="btn" type="button" data-add="' + g + ':' + k[0] + '">' + svg(ICON.plus, 14, 2.4) + k[1] + '</button>'; }).join('') + '</div>' +
    (cat ? '<p class="hint-text" style="margin:0">Os nomes sugeridos vêm das listas do estilo (técnicas, perks e opcionais): escolher um preenche o resto.</p>' : '') + reqHtml + '</div></div>';
}
function scEditHtml(s, c, pool, av) {
  var d = S.ui.combatDraft;
  var lists = c.styles.map(function (x, i) { return '<datalist id="scList' + i + '">' + scSuggestions(x).map(function (v) { return '<option value="' + esc(v) + '">'; }).join('') + '</datalist>'; }).join('') +
    '<datalist id="scListG">' + scSuggestions(null).map(function (v) { return '<option value="' + esc(v) + '">'; }).join('') + '</datalist>' +
    '<datalist id="scBases">' + pool.map(function (k) { return '<option value="' + esc(k.name) + '">'; }).join('') + '</datalist>';
  var fromSkills = sheetSkills(s).filter(function (k) { return !d.moved.some(function (m) { return m.name === k.name && m.attr === k.attr && m.diff === k.diff; }); });
  var targets = [['g', 'Perícias de Combate']].concat(c.styles.map(function (x, i) { return ['s' + i, x.name || 'Estilo ' + (i + 1)]; }));
  return lists +
    scGroupEditHtml('Perícias de Combate', c.general, 'g', pool, av, 'scListG', null) +
    c.styles.map(function (x, i) { return scGroupEditHtml('', x.items, 's' + i, pool, av, 'scList' + i, x); }).join('') +
    '<div class="box sc-edit"><h3 class="sec-title" style="margin:0">Adicionar estilo</h3><div class="sc-row">' +
      scField('Estilo do catálogo', '<div class="sk-pick"><input type="text" id="scStylePick" maxlength="120" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="scStyleSug" placeholder="' +
        (W.loaded.styles ? 'Digite para buscar; vazio, ou um nome fora da lista, é um estilo livre' : 'Carregando estilos…') + '"><div class="suggest" id="scStyleSug" role="listbox" hidden></div></div>', 'sc-name') +
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
    // Suggestions and autofill come from Mundo › Combate; the editor redraws once they arrive.
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
        var k = scKindOf(styleOf(g), v), y = cleanCombatItem(Object.assign({}, x, k ? { kind: k } : {}));
        group(g)[+el.getAttribute('data-n')] = scAutofill(y);
        renderSheetPage(); return;
      }
    } else if (f === 'attr' || f === 'diff' || f === 'base' || f === 'bonusNote') x[f] = v;
    else if (f === 'max') x.max = v === '' ? null : +v;
    else if (v !== '') x[f] = +v;
    paint();
  }
  box.addEventListener('input', onEdit); box.addEventListener('change', onEdit);
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
      var q = b.getAttribute('data-add').split(':');
      group(q[0]).push(cleanCombatItem({ kind: q[1], name: '', pts: q[1] === 'tech' ? 0 : 1 }));
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
  function paintStyles() {
    opts = styleMatches(pick.value); act = Math.min(act, Math.max(0, opts.length - 1));
    if (!opts.length) { hideStyles(); return; }
    sug.innerHTML = opts.map(function (x, n) {
      return '<button type="button" role="option" id="scStyleSug' + n + '" data-o="' + n + '" class="' + (n === act ? 'act' : '') + '" aria-selected="' + (n === act) + '">' +
        '<span>' + esc(x.name) + '</span><small>' + esc([x.page, styleCost(x)].filter(Boolean).join(' · ')) + '</small></button>';
    }).join('');
    sug.hidden = false; pick.setAttribute('aria-expanded', 'true'); pick.setAttribute('aria-activedescendant', 'scStyleSug' + act);
    var on = sug.querySelector('.act'); if (on) on.scrollIntoView({ block: 'nearest' });
  }
  function pickStyle(n) { var x = opts[n]; if (!x) return; pick.value = x.name; pick.dataset.id = x.id; hideStyles(); $('scAddStyle').focus(); }
  pick.addEventListener('input', function () { delete pick.dataset.id; act = 0; paintStyles(); });
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
    // Typed in full without picking: the catalog style of that exact name.
    if (!cat && name) cat = (W.styles || []).filter(function (x) { return norm(x.name) === norm(name); })[0] || null;
    var st = cat ? styleFromCatalog(cat, combatSkillPool(c, s)) : { name: name, items: [scSfItem(name)] };
    st.open = true;
    c.styles.push(st);
    renderSheetPage();
    // Only when the sheet lacks a skill the style requires; the block is marked as well.
    var miss = scReqsMissing(scStyleReqs(st, combatSkillPool(c, s)));
    if (miss.length) toast('Pré-requisito de ' + st.name + ' não atendido. Falta: ' + miss.join('; ') + '.', true);
  };
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
      btn.disabled = false; btn.textContent = 'Salvar combate'; $('scCancel').disabled = false; $('scErr').textContent = errorText(er);
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
function scSectionHead(title, editing, id, label) {
  return '<div class="gurps-head"><h2 class="sec-title">' + title + '</h2>' +
    (editing ? '<div class="btn-row"><button class="btn ghost" type="button" id="' + id + 'Cancel">Cancelar</button><button class="btn primary" type="button" id="' + id + 'Save">Salvar ' + label + '</button></div>'
      : canWrite() && !sheetDraftOpen() ? '<div class="btn-row"><button class="btn" type="button" id="' + id + 'Edit">' + svg(ICON.edit, 15) + 'Editar ' + label + '</button></div>' : '') + '</div>';
}
function sheetDefenseHtml(s, editing) {
  var ui = S.ui, c = sheetCombat(s), a = sheetAttrsNow(s), pool = combatSkillPool(c, s), head = scSectionHead('Defesas', editing, 'df', 'defesas');
  if (!editing) return '<section class="gurps" id="defense">' + head + scDefHtml(c, combatDefenses(scWithAdvs(c, s), pool, attrValues(a), gurpsStats(a), a, s)) + '</section>';
  var dd = ui.defDraft;
  var parryNames = pool.filter(function (k) { return SC_PARRY[combatKey(k.name)]; }).map(function (k) { return [k.name, k.name]; });
  var blockNames = pool.filter(function (k) { return /^(shield|cloak)\b/.test(combatKey(k.name)); }).map(function (k) { return [k.name, k.name]; });
  return '<section class="gurps" id="defense">' + head + '<div class="box sc-edit"><div class="sc-row">' +
    scField('Aparar com', '<select data-f="parry"><option value="">Automático (a melhor)</option>' + scOpts(parryNames, dd.parry) + '</select>', 'sc-name') +
    scField('Bônus', '<input type="number" data-f="parryBonus" min="-20" max="20" value="' + dd.parryBonus + '">') + scDefNote('parry', dd.parryNote, dd.parryBonus) + '</div><div class="sc-row">' +
    scField('Bloquear com', '<select data-f="block"><option value="">Automático (a melhor)</option>' + scOpts(blockNames, dd.block) + '</select>', 'sc-name') +
    scField('Bônus', '<input type="number" data-f="blockBonus" min="-20" max="20" value="' + dd.blockBonus + '">') + scDefNote('block', dd.blockNote, dd.blockBonus) + '</div><div class="sc-row">' +
    scField('Esquiva: bônus', '<input type="number" data-f="dodgeBonus" min="-20" max="20" value="' + dd.dodgeBonus + '">') +
    scField('DB do escudo', '<input type="number" data-f="db" min="0" max="10" value="' + dd.db + '">') + scDefNote('dodge', dd.dodgeNote, dd.dodgeBonus) + '</div>' +
    '<p class="hint-text" style="margin:0">Pelas regras do Basic Set (pp. B374-377): Aparar = 3 + NH/2 com a arma (bastão +2, faca -1); Bloqueio = 3 + Shield ou Cloak/2; Esquiva = VB + 3 - carga. Como em Danos, só vale o que está em uso: Aparar com as armas e Bloqueio com os escudos e capas da configuração do Corpo em uso (Equip. › Corpo); desarmado (Boxing, Judo, Karate, Brawling, Wrestling) sempre. Combat Reflexes e Enhanced Block, Parry e Dodge comprados em Combate ou Vantagens entram sozinhos. O DB é o do escudo ou capa em uso e soma nas três defesas; o campo DB vale só para um escudo em uso sem DB conhecido. Outros bônus vão nos campos Bônus, com o motivo, que aparece ao passar o mouse.</p></div>' +
    '<div class="form-err" id="dfErr" role="alert"></div></section>';
}
// Side by side, as in the spreadsheet; one below the other while one is edited.
function sheetDmgDefHtml(s) {
  var ui = S.ui, can = canWrite(), dm = !!ui.dmgDraft && can, df = !!ui.defDraft && can;
  return '<div class="sc-pair' + (dm || df ? ' editing' : '') + '">' + sheetDamageHtml(s, dm) + sheetDefenseHtml(s, df) + '</div>';
}
function scSaving(id, label, on) {
  var btn = $(id + 'Save'); btn.disabled = on; btn.textContent = on ? 'Salvando…' : 'Salvar ' + label; $(id + 'Cancel').disabled = on;
}
function wireSheetDefense(s) {
  var ui = S.ui, ed = $('dfEdit');
  if (ed) ed.onclick = function () { ui.defDraft = sheetCombat(s).def; renderSheetPage(); };
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
   moved with the arrow keys on it; the new order is saved at once. While a table is being
   dragged, data that arrives does not redraw the page (S.ui.scDragging, see onData). */
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
  function keys() { return [].map.call(box.querySelectorAll('.sc-card'), function (el) { return el.getAttribute('data-key'); }); }
  // After the page redraws (the save arrives), the moved table keeps the focus.
  if (ui.scFocus != null) {
    var g = box.querySelectorAll('.sc-grip')[ui.scFocus]; ui.scFocus = null;
    if (g instanceof HTMLElement) g.focus();
  }
  box.addEventListener('keydown', function (e) {
    var grip = e.target.closest && e.target.closest('.sc-grip'); if (!grip) return;
    var card = grip.closest('.sc-card'), back = e.key === 'ArrowUp' || e.key === 'ArrowLeft', fwd = e.key === 'ArrowDown' || e.key === 'ArrowRight';
    if (!back && !fwd) return;
    e.preventDefault();
    var other = back ? card.previousElementSibling : card.nextElementSibling; if (!other) return;
    if (back) box.insertBefore(card, other); else box.insertBefore(other, card);
    grip.focus();
    ui.scFocus = keys().indexOf(card.getAttribute('data-key'));
    saveCombatOrder(s, keys());
  });
  box.addEventListener('pointerdown', function (e) {
    var grip = e.target.closest && e.target.closest('.sc-grip'); if (!grip || e.button > 0) return;
    e.preventDefault();
    var card = grip.closest('.sc-card'), start = keys().join(), sx = e.clientX, sy = e.clientY, moving = false, ph = null, dx = 0, dy = 0;
    grip.setPointerCapture(e.pointerId);
    function begin() {
      var r = card.getBoundingClientRect();
      dx = sx - r.left; dy = sy - r.top;
      ph = document.createElement('div'); ph.className = 'sc-ph'; ph.style.height = r.height + 'px';
      box.insertBefore(ph, card);
      card.classList.add('dragging'); card.style.width = r.width + 'px';
      ui.scDragging = true; moving = true;
    }
    function move(ev) {
      if (!moving) { if (Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) < 5) return; begin(); }
      card.style.left = (ev.clientX - dx) + 'px'; card.style.top = (ev.clientY - dy) + 'px';
      // The table under the finger: the placeholder goes before it (upper half) or after it.
      /** @type {{ el: Element, r: DOMRect }} */
      var over = null;
      [].forEach.call(box.querySelectorAll('.sc-card'), function (el) {
        if (el === card) return;
        var r = el.getBoundingClientRect();
        if (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) over = { el: el, r: r };
      });
      if (over) box.insertBefore(ph, ev.clientY < over.r.top + over.r.height / 2 ? over.el : over.el.nextSibling);
      else {
        var b = box.getBoundingClientRect();
        if (ev.clientY > b.bottom) box.appendChild(ph);
        else if (ev.clientY < b.top) box.insertBefore(ph, box.firstChild);
      }
    }
    function end() {
      grip.removeEventListener('pointermove', move); grip.removeEventListener('pointerup', end); grip.removeEventListener('pointercancel', end);
      if (!moving) return;
      box.insertBefore(card, ph); ph.remove();
      card.classList.remove('dragging'); card.style.width = card.style.left = card.style.top = '';
      ui.scDragging = false;
      if (keys().join() !== start) saveCombatOrder(s, keys());
    }
    grip.addEventListener('pointermove', move); grip.addEventListener('pointerup', end); grip.addEventListener('pointercancel', end);
  });
}

