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
   generalPos: n                                  where its table goes among the styles' (they are
                                                  dragged into any order; styles keep theirs in the array)
     weapons: [{ name, mode, mod, type }]           damage table: mode 'sw' | 'thr' | 'fixed';
                                                    mod '+1' added to the ST damage, or the damage
                                                    itself ('3d') when fixed; type 'cut', 'imp'...
     def:     { parry, parryBonus, block, blockBonus, dodgeBonus, db }   active defenses
   }
   item: { kind: 'skill', name, attr, diff, pts, bonus, skillId? }   level from the points, as in Perícias
       | { kind: 'tech', name, base, diff (A/H), def, max, pts, bonus, techId? }
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
      var o = { name: scStr(st && st.name, 120), items: items(st && st.items) };
      if (st && typeof st.styleId === 'string' && st.styleId) o.styleId = st.styleId.slice(0, 200);
      return o;
    }),
    general: items(c.general),
    weapons: (Array.isArray(c.weapons) ? c.weapons : []).map(function (w) {
      w = w || {};
      return { name: scStr(w.name, 120), mode: ['sw', 'thr', 'fixed'].indexOf(w.mode) >= 0 ? w.mode : 'sw', mod: scStr(w.mod, 40),
        type: SC_DMG_TYPES.some(function (t) { return t[0] === w.type; }) ? w.type : 'cr' };
    }),
    def: { parry: scStr(def.parry, 120), parryBonus: cleanInt(def.parryBonus, -20, 20, 0), block: scStr(def.block, 120),
      blockBonus: cleanInt(def.blockBonus, -20, 20, 0), dodgeBonus: cleanInt(def.dodgeBonus, -20, 20, 0), db: cleanInt(def.db, 0, 10, 0) }
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
// "2d-1" plus 2 is "2d+1".
function dmgAdd(dice, add) {
  var m = /^(\d+)d([+-]\d+)?$/.exec(dice); if (!m) return dice;
  var k = (+m[2] || 0) + add;
  return m[1] + 'd' + (k > 0 ? '+' + k : k < 0 ? String(k) : '');
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
      if (k && k !== 'skill') { g.items[i] = scAutofill(cleanCombatItem({ kind: k, name: x.name, pts: x.pts, bonus: x.bonus })); fixed++; }
    });
  });
  return fixed;
}
// A style picked from the catalog: Style Familiarity and its required skills, 1 point each.
function styleFromCatalog(cat) {
  var items = [cleanCombatItem({ kind: 'trait', name: 'Style Familiarity (' + cat.name + ')', pts: 1 })];
  styleItems(cat.skills).forEach(function (n) { items.push(cleanCombatItem(scAutofill({ kind: 'skill', name: n, attr: 'DX', diff: 'A', pts: 1 }))); });
  return { name: cat.name, styleId: cat.id, items: items };
}
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
  var title = x.kind === 'tech' ? 'Técnica de ' + (x.base || '?') + ' · padrão ' + x.def + (x.max != null ? ' · máximo ' + (x.max > 0 ? '+' + x.max : x.max) : '') : skillBonusTitle(x);
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
function scGroupHtml(title, items, pool, av, href, key, drag) {
  var label = href ? '<a href="' + href + '" title="Ver o estilo">' + esc(title) + '</a>' : esc(title);
  return '<div class="sc-card" data-key="' + key + '"><table class="gtab sc-tab"><thead><tr><th>' +
    (drag ? '<button class="sc-grip" type="button" aria-label="Mover a tabela ' + esc(title) + ' (arraste, ou use as setas)" title="Arraste para mudar a ordem">' + svg(SC_GRIP, 14, 2.4) + '</button>' : '') +
    label + '</th><th>Pts</th><th>NH</th></tr></thead><tbody>' +
    (items.length ? items.map(function (x) { return '<tr>' + scItemName(x) + '<td class="gpts">' + x.pts + '</td>' + scNhCell(x, pool, av) + '</tr>'; }).join('')
      : '<tr><td colspan="3" class="gnone">Nada ainda.</td></tr>') +
    '</tbody><tfoot><tr><td colspan="2">Total</td><td class="gpts">' + sumPts(items) + '</td></tr></tfoot></table></div>';
}
// The tables in the order the player left them: 's<i>' for the styles, 'g' for the other skills.
function combatOrder(c) {
  var keys = c.styles.map(function (st, i) { return 's' + i; });
  if (c.general.length) keys.splice(Math.min(c.generalPos, keys.length), 0, 'g');
  return keys;
}
function scDmgLabel(t) { var x = SC_DMG_TYPES.filter(function (y) { return y[0] === t; })[0]; return x ? x[1] : t; }
function scWeaponsHtml(c, st) {
  if (!c.weapons.length) return '';
  // Rows of the same weapon in a row share its name cell, as in the spreadsheet.
  var rows = '', i = 0;
  while (i < c.weapons.length) {
    var j = i; while (j + 1 < c.weapons.length && c.weapons[j + 1].name === c.weapons[i].name) j++;
    for (var k = i; k <= j; k++) {
      var w = c.weapons[k];
      rows += '<tr>' + (k === i ? '<td rowspan="' + (j - i + 1) + '"><b>' + esc(w.name || '—') + '</b></td>' : '') +
        '<td>' + (w.mode === 'fixed' ? '—' : w.mode === 'thr' ? 'thrust' : 'swing') + '</td>' +
        '<td class="gval" title="' + esc(w.mode === 'fixed' ? 'Dano fixo' : (w.mode === 'thr' ? 'thr' : 'sw') + (w.mod ? w.mod : '') + ' com ST ' + st) + '">' + esc(weaponDamage(w, st)) + '</td>' +
        '<td>' + esc(scDmgLabel(w.type)) + '</td></tr>';
    }
    i = j + 1;
  }
  return '<table class="gtab sc-dmg"><thead><tr><th>Arma</th><th>Tipo</th><th>Dano</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table>';
}
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
function scHasTrait(c, re) { return scAllItems(c).some(function (x) { return x.kind === 'trait' && re.test(x.name); }); }
// The active defenses as the Basic Set has them (pp. B374-377):
//   Dodge = Basic Speed + 3 - encumbrance; Parry = 3 + skill/2 (+ weapon modifier); Block = 3 + Shield or Cloak/2;
//   Combat Reflexes (or Enhanced Time Sense, which includes it) +1 to all; Enhanced Dodge/Parry/Block;
//   a ready shield's DB adds to all three (shown in parentheses); retreating gives +3 to Dodge,
//   +1 to Parry and Block, +3 to Parry with Boxing, Judo, Karate and fencing weapons.
// Without a choice in the editor, Parry and Block use the best skill the sheet has.
function combatDefenses(c, pool, av, r, a) {
  var d = c.def, enc = (a && a.enc) || 0;
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
  var parries = [], blocks = [];
  skills.forEach(function (k) {
    var p = SC_PARRY[k.key];
    if (p) {
      var base = p[1] === 'K' || p[1] === 'H' ? Math.max(k.abs, av.DX) : k.abs;
      var notes = [], pEnc = (p[1] === 'F' || k.key === 'karate') ? enc : 0;
      var v = 3 + Math.floor(base / 2) + p[0] + ep + cr + d.parryBonus - pEnc;
      var calc = scCalc([[3, ''], [Math.floor(base / 2), (base > k.abs ? 'DX ' + base + ', maior que ' + k.name + ' ' + k.abs : k.name + ' ' + base) + ' ÷ 2'],
        [p[0], 'arma'], [cr, 'Combat Reflexes'], [ep, 'Enhanced Parry'], [d.parryBonus, 'bônus'], [-pEnc, 'carga']], v);
      if (p[0]) notes.push('arma ' + (p[0] > 0 ? '+' : '') + p[0]);
      if (p[1] === 'U') notes.push('desbalanceada: não apara se atacou com ela no turno');
      if (p[1] === 'H') notes.push('-3 contra armas, exceto golpes de ponta');
      if (p[1] === 'W') notes.push('usa as duas mãos');
      if ((p[1] === 'F' || k.key === 'karate') && enc) notes.push('-' + enc + ' de carga');
      var rp = p[1] === 'F' || p[1] === 'K' ? 3 : 1;
      parries.push({ name: k.name, value: v, retreat: v + rp, retreatBonus: rp, notes: notes, calc: calc });
    }
    if (/^(shield|cloak)\b/.test(k.key)) {
      var b = 3 + Math.floor(k.abs / 2) + eb + cr + d.blockBonus;
      blocks.push({ name: k.name, value: b, retreat: b + 1, retreatBonus: 1, notes: [],
        calc: scCalc([[3, ''], [Math.floor(k.abs / 2), k.name + ' ' + k.abs + ' ÷ 2'], [cr, 'Combat Reflexes'], [eb, 'Enhanced Block'], [d.blockBonus, 'bônus']], b) });
    }
  });
  var best = function (l, chosen) {
    var hit = chosen && l.filter(function (x) { return x.name === chosen; })[0];
    return hit || l.slice().sort(function (x, y) { return y.value - x.value; })[0] || null;
  };
  var dodge = r.dodge + ed + cr + d.dodgeBonus;
  var dcalc = scCalc([[3, ''], [Math.floor(r.speed), 'Velocidade Básica ' + fmtDec(r.speed, 2) + ', sem a fração'], [-enc, 'carga'], [cr, 'Combat Reflexes'], [ed, 'Enhanced Dodge'], [d.dodgeBonus, 'bônus']], dodge);
  // The weapon (skill) chosen in the editor, or the best one; when Equipamentos exists, the ready weapon.
  return { parry: best(parries, d.parry), parries: parries, block: best(blocks, d.block), blocks: blocks, parryAuto: !d.parry, blockAuto: !d.block,
    dodge: { value: dodge, retreat: dodge + 3, retreatBonus: 3, calc: dcalc }, cr: cr, ep: ep, eb: eb, ed: ed, enc: enc };
}
// Each defense with the weapon it uses and how its value is reached; the other skills that could
// parry or block are not listed (the weapon is chosen in the editor).
function scDefHtml(c, dv) {
  var db = c.def.db;
  function val(v) { return v == null ? '—' : v + (db ? ' <span class="gnote">(' + (v + db) + ' com escudo)</span>' : ''); }
  function row(label, x, weapon, empty) {
    var lines = x ? [weapon, x.calc, 'Recuando: ' + x.retreat + ' (+' + x.retreatBonus + ')' + (db ? ' · com escudo: ' + (x.value + db) + ', recuando ' + (x.retreat + db) + ' (DB ' + db + ')' : '')] : [empty];
    return '<tr><td><b>' + label + '</b>' + lines.filter(Boolean).map(function (l, i) { return '<small' + (i === 1 && x ? ' class="sc-calc"' : '') + '>' + esc(l) + '</small>'; }).join('') +
      '</td><td class="gval">' + val(x ? x.value : null) + '</td></tr>';
  }
  function weapon(x, auto) { return x ? 'Com ' + x.name + (auto ? ' (a melhor da ficha)' : '') + (x.notes.length ? ' · ' + x.notes.join(' · ') : '') : ''; }
  return '<table class="gtab sc-def"><thead><tr><th>Defesas</th><th></th></tr></thead><tbody>' +
    row('Aparar', dv.parry, weapon(dv.parry, dv.parryAuto), 'Nenhuma perícia que apare.') +
    row('Esquiva', dv.dodge, '', '') +
    row('Bloqueio', dv.block, weapon(dv.block, dv.blockAuto), 'Sem Shield ou Cloak.') +
    '<tr><td colspan="2" class="gnone">Basic Set, pp. B374-377</td></tr></tbody></table>';
}
// Points per style, three side by side per row (fewer rows, more columns), in the tables' order.
function scTotalsHtml(c) {
  var rows = combatOrder(c).map(function (k) { return k === 'g' ? ['Outras perícias', sumPts(c.general)] : [c.styles[+k.slice(1)].name || 'Estilo sem nome', sumPts(c.styles[+k.slice(1)].items)]; });
  if (rows.length < 2) return '';
  return '<div class="gtab sc-tot" role="table" aria-label="Pontos por estilo"><div class="sc-tot-grid sc-tot-headrow" role="row">' +
    // A "Pts" over each column of points; the title only over the first.
    [0, 1, 2].map(function (i) { return '<div class="sc-tot-item"><span role="columnheader">' + (i ? '' : 'Pontos por estilo') + '</span><b role="columnheader">Pts</b></div>'; }).join('') + '</div>' +
    '<div class="sc-tot-grid">' + rows.map(function (r) { return '<div class="sc-tot-item" role="row"><span role="cell">' + esc(r[0]) + '</span><b class="gpts" role="cell">' + r[1] + '</b></div>'; }).join('') + '</div></div>';
}
function sheetCombatHtml(s, editing) {
  var ui = S.ui, c = editing ? ui.combatDraft.c : sheetCombat(s), a = ui.attrDraft || sheetAttrs(s), av = attrValues(a), r = gurpsStats(a);
  var pool = combatSkillPool(c, s), can = canWrite();
  var head = '<div class="gurps-head"><h2 class="sec-title">Combate</h2><span class="gurps-total" id="scTotal">' + combatTotal(c) + ' pts</span>' +
    (editing ? '<div class="btn-row"><button class="btn ghost" type="button" id="scCancel">Cancelar</button><button class="btn primary" type="button" id="scSave">Salvar combate</button></div>'
      : can && !ui.skillDraft && !ui.advDraft ? '<div class="btn-row"><button class="btn" type="button" id="scEdit">' + svg(ICON.edit, 15) + 'Editar combate</button></div>' : '') + '</div>';
  if (editing) return '<section class="gurps" id="combat">' + head + scEditHtml(s, c, pool, av) + '</section>';
  var empty = !c.styles.length && !c.general.length && !c.weapons.length;
  if (empty) return '<section class="gurps" id="combat">' + head + '<p class="long none">Nenhum estilo ou perícia de combate.' + (can ? ' Use <b>Editar combate</b> para adicionar.' : '') + '</p></section>';
  var drag = can && !ui.skillDraft && !ui.attrDraft && !ui.advDraft;
  // Links to the catalogs (see scLink): they arrive once and the page redraws with them.
  ['skills', 'techniques', 'advantages'].forEach(function (k) { loadCatalog(k); });
  var groups = combatOrder(c).map(function (k) {
    if (k === 'g') return scGroupHtml('Outras perícias de combate', c.general, pool, av, '', k, drag);
    var st = c.styles[+k.slice(1)];
    return scGroupHtml(st.name || 'Estilo sem nome', st.items, pool, av, st.styleId ? styleHref(st.styleId) : '', k, drag);
  });
  return '<section class="gurps" id="combat">' + head +
    // Points per style first, above the tables they sum up.
    scTotalsHtml(c) +
    '<div class="sc-masonry" id="scGroups">' + groups.join('') + '</div>' +
    '<div class="sc-bottom">' + scWeaponsHtml(c, a.st) + '<div class="sc-side">' + scDefHtml(c, combatDefenses(scWithAdvs(c, s), pool, av, r, a)) + '</div></div></section>';
}

/* ---------- editor ---------- */
function scOpts(list, cur) { return list.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === cur ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join(''); }
function scField(label, html, cls) { return '<label class="sc-f' + (cls ? ' ' + cls : '') + '"><span>' + label + '</span>' + html + '</label>'; }
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
  if (x.kind !== 'trait') f += scField('Bônus', '<input type="number" data-f="bonus"' + at + ' min="-20" max="20" step="1" inputmode="numeric" value="' + x.bonus + '">');
  f += '<span class="sc-nh' + (x.bonus ? ' bonus' : '') + '" data-nh="' + g + ':' + n + '">' + scEditNhHtml(nh) + '</span>' +
    '<button class="icon-btn" type="button" data-del="' + g + ':' + n + '" aria-label="Remover" title="Remover">' + svg(ICON.x, 15, 2.4) + '</button>';
  return '<div class="sc-row">' + f + '</div>';
}
function scEditNhHtml(nh) { return nh ? esc(nh.rel) + ' <small>' + esc(nh.lvl) + '</small>' + (nh.waste ? '<small class="sk-waste">' + nh.waste + ' pt sem efeito</small>' : '') : '<small>sem NH</small>'; }
function scGroupEditHtml(title, items, g, pool, av, listId, st) {
  var cat = st && st.styleId ? styleById(st.styleId) : null;
  return '<div class="box sc-edit" data-group="' + g + '">' +
    (st ? '<div class="sc-ghead">' + scField('Estilo', '<input type="text" data-f="stname" data-g="' + g + '" maxlength="120" value="' + esc(st.name) + '" placeholder="Nome do estilo">', 'sc-name') +
      (cat ? '<a class="sc-catlink" href="' + styleHref(cat.id) + '" target="_blank" rel="noopener">' + esc(cat.page || 'Ver estilo') + '</a>' : '') +
      '<button class="btn ghost" type="button" data-delstyle="' + g + '">' + svg(ICON.trash, 14) + 'Remover estilo</button></div>'
      : '<h3 class="sec-title" style="margin:0">' + esc(title) + '</h3>') +
    '<div class="sc-rows">' + items.map(function (x, n) { return scEditRow(x, g, n, pool, av, listId); }).join('') + '</div>' +
    '<div class="btn-row">' + SC_KINDS.map(function (k) { return '<button class="btn" type="button" data-add="' + g + ':' + k[0] + '">' + svg(ICON.plus, 14, 2.4) + k[1] + '</button>'; }).join('') + '</div>' +
    (cat ? '<p class="hint-text" style="margin:0">Os nomes sugeridos vêm das listas do estilo (técnicas, perks e opcionais): escolher um preenche o resto.</p>' : '') + '</div>';
}
function scEditHtml(s, c, pool, av) {
  var d = S.ui.combatDraft, a = S.ui.attrDraft || sheetAttrs(s), st = a.st;
  var lists = c.styles.map(function (x, i) { return '<datalist id="scList' + i + '">' + scSuggestions(x).map(function (v) { return '<option value="' + esc(v) + '">'; }).join('') + '</datalist>'; }).join('') +
    '<datalist id="scListG">' + scSuggestions(null).map(function (v) { return '<option value="' + esc(v) + '">'; }).join('') + '</datalist>' +
    '<datalist id="scBases">' + pool.map(function (k) { return '<option value="' + esc(k.name) + '">'; }).join('') + '</datalist>';
  var fromSkills = sheetSkills(s).filter(function (k) { return !d.moved.some(function (m) { return m.name === k.name && m.attr === k.attr && m.diff === k.diff; }); });
  var targets = c.styles.map(function (x, i) { return ['s' + i, x.name || 'Estilo ' + (i + 1)]; }).concat([['g', 'Outras perícias de combate']]);
  var styleOpts = (W.styles || []).map(function (x) { return [x.id, x.name + (x.page ? ' · ' + x.page : '')]; });
  var weaponRows = c.weapons.map(function (w, n) {
    var at = ' data-w="' + n + '"';
    return '<div class="sc-row">' + scField('Arma', '<input type="text" data-f="wname"' + at + ' maxlength="120" value="' + esc(w.name) + '" placeholder="Ex.: Broadsword">', 'sc-name') +
      scField('Tipo', '<select data-f="wmode"' + at + '>' + scOpts(SC_MODES, w.mode) + '</select>') +
      scField(w.mode === 'fixed' ? 'Dano' : 'Modificador', '<input type="text" data-f="wmod"' + at + ' maxlength="40" value="' + esc(w.mod) + '" placeholder="' + (w.mode === 'fixed' ? 'Ex.: 3d' : 'Ex.: +1') + '">') +
      scField('Status', '<select data-f="wtype"' + at + '>' + scOpts(SC_DMG_TYPES, w.type) + '</select>') +
      '<span class="sc-nh" data-wdmg="' + n + '">' + esc(weaponDamage(w, st)) + '</span>' +
      '<button class="icon-btn" type="button" data-delw="' + n + '" aria-label="Remover ataque" title="Remover">' + svg(ICON.x, 15, 2.4) + '</button></div>';
  }).join('');
  var parryNames = pool.filter(function (k) { return SC_PARRY[combatKey(k.name)]; }).map(function (k) { return [k.name, k.name]; });
  var blockNames = pool.filter(function (k) { return /^(shield|cloak)/.test(combatKey(k.name)); }).map(function (k) { return [k.name, k.name]; });
  var dd = c.def;
  return lists +
    c.styles.map(function (x, i) { return scGroupEditHtml('', x.items, 's' + i, pool, av, 'scList' + i, x); }).join('') +
    scGroupEditHtml('Outras perícias de combate', c.general, 'g', pool, av, 'scListG', null) +
    '<div class="box sc-edit"><h3 class="sec-title" style="margin:0">Adicionar estilo</h3><div class="sc-row">' +
      scField('Estilo do catálogo', '<select id="scStylePick"><option value="">' + (W.loaded.styles ? 'Estilo livre (sem catálogo)' : 'Carregando estilos…') + '</option>' + scOpts(styleOpts, '') + '</select>', 'sc-name') +
      '<button class="btn" type="button" id="scAddStyle">' + svg(ICON.plus, 14, 2.4) + 'Adicionar estilo</button></div>' +
      '<p class="hint-text" style="margin:0">Do catálogo, o estilo já vem com Style Familiarity e as perícias obrigatórias, com 1 ponto cada.</p>' +
    (fromSkills.length ? '<h3 class="sec-title" style="margin:8px 0 0">Trazer da seção Perícias</h3><div class="sc-row">' +
      scField('Perícia', '<select id="scFromSkill">' + fromSkills.map(function (k, i) { return '<option value="' + i + '">' + esc(k.name + ' · ' + k.attr + '/' + k.diff + ' · ' + k.pts + ' pts') + '</option>'; }).join('') + '</select>', 'sc-name') +
      scField('Para', '<select id="scFromTarget">' + scOpts(targets, targets[0][0]) + '</select>') +
      '<button class="btn" type="button" id="scBring">Trazer</button></div>' +
      '<p class="hint-text" style="margin:0">A perícia sai da seção Perícias e passa a contar aqui, com os mesmos pontos.</p>' : '') + '</div>' +
    '<div class="box sc-edit"><h3 class="sec-title" style="margin:0">Danos</h3><div class="sc-rows">' + weaponRows + '</div>' +
      '<div><button class="btn" type="button" id="scAddWeapon">' + svg(ICON.plus, 14, 2.4) + 'Adicionar ataque</button></div>' +
      '<p class="hint-text" style="margin:0">swing e thrust usam o dano da ST (' + st + ': sw ' + gurpsDamage(st).sw + ', thr ' + gurpsDamage(st).thr + ') mais o modificador. Repita o nome da arma para cada ataque dela.</p></div>' +
    '<div class="box sc-edit"><h3 class="sec-title" style="margin:0">Defesas</h3><div class="sc-row">' +
      scField('Aparar com', '<select data-f="parry"><option value="">Automático (a melhor)</option>' + scOpts(parryNames, dd.parry) + '</select>', 'sc-name') +
      scField('Bônus', '<input type="number" data-f="parryBonus" min="-20" max="20" value="' + dd.parryBonus + '">') + '</div><div class="sc-row">' +
      scField('Bloquear com', '<select data-f="block"><option value="">Automático (a melhor)</option>' + scOpts(blockNames, dd.block) + '</select>', 'sc-name') +
      scField('Bônus', '<input type="number" data-f="blockBonus" min="-20" max="20" value="' + dd.blockBonus + '">') + '</div><div class="sc-row">' +
      scField('Esquiva: bônus', '<input type="number" data-f="dodgeBonus" min="-20" max="20" value="' + dd.dodgeBonus + '">') +
      scField('DB do escudo', '<input type="number" data-f="db" min="0" max="10" value="' + dd.db + '">') + '</div>' +
      '<p class="hint-text" style="margin:0">Pelas regras do Basic Set (pp. B374-377): Aparar = 3 + NH/2 com a arma (bastão +2, faca -1); Bloqueio = 3 + Shield ou Cloak/2; Esquiva = VB + 3 - carga. Combat Reflexes e Enhanced Block, Parry e Dodge comprados aqui entram sozinhos. DB do escudo: 1 pequeno ou capa leve, 2 médio ou capa pesada, 3 grande; soma nas três defesas. Outros bônus vão nos campos Bônus.</p></div>' +
    '<div class="form-err" id="scErr" role="alert"></div>';
}
function wireSheetCombat(s) {
  var ui = S.ui, ed = $('scEdit');
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
  var c = d.c, a = ui.attrDraft || sheetAttrs(s), av = attrValues(a);
  function group(g) { return g === 'g' ? c.general : c.styles[+g.slice(1)].items; }
  function styleOf(g) { return g === 'g' ? null : c.styles[+g.slice(1)]; }
  function paint() {
    var pool = combatSkillPool(c, s);
    box.querySelectorAll('[data-nh]').forEach(function (el) {
      var p = el.getAttribute('data-nh').split(':'), x = group(p[0])[+p[1]]; if (!x) return;
      var nh = combatNh(cleanCombatItem(x), pool, av);
      el.className = 'sc-nh' + (x.bonus ? ' bonus' : ''); el.innerHTML = scEditNhHtml(nh);
    });
    box.querySelectorAll('[data-wdmg]').forEach(function (el) { var w = c.weapons[+el.getAttribute('data-wdmg')]; if (w) el.textContent = weaponDamage(cleanCombat({ weapons: [w] }).weapons[0], a.st); });
    $('scTotal').textContent = combatTotal(cleanCombat(c)) + ' pts';
  }
  function onEdit(e) {
    var el = /** @type {AnyEl} */ (e.target), f = el && el.dataset && el.dataset.f; if (!f) return;
    var v = el.value, change = e.type === 'change';
    if (el.hasAttribute('data-w')) {
      var w = c.weapons[+el.getAttribute('data-w')];
      w[{ wname: 'name', wmode: 'mode', wmod: 'mod', wtype: 'type' }[f]] = v;
      if (f === 'wmode' && change) { renderSheetPage(); return; }
      paint(); return;
    }
    if (f in c.def) { c.def[f] = /Bonus$|^db$/.test(f) ? (v === '' ? 0 : +v) : v; return; }
    var g = el.getAttribute('data-g'); if (!g) return;
    if (f === 'stname') { styleOf(g).name = v; return; }
    var x = group(g)[+el.getAttribute('data-n')]; if (!x) return;
    if (f === 'kind') { if (change) { group(g)[+el.getAttribute('data-n')] = scAutofill(cleanCombatItem({ kind: v, name: x.name, pts: x.pts, bonus: x.bonus })); renderSheetPage(); } return; }
    if (f === 'name') {
      x.name = v;
      if (change) {
        // A name from the style's lists sets the kind; a known one fills the other fields.
        var k = scKindOf(styleOf(g), v), y = cleanCombatItem(Object.assign({}, x, k ? { kind: k } : {}));
        group(g)[+el.getAttribute('data-n')] = scAutofill(y);
        renderSheetPage(); return;
      }
    } else if (f === 'attr' || f === 'diff' || f === 'base') x[f] = v;
    else if (f === 'max') x.max = v === '' ? null : +v;
    else if (v !== '') x[f] = +v;
    paint();
  }
  box.addEventListener('input', onEdit); box.addEventListener('change', onEdit);
  box.addEventListener('click', function (e) {
    var b = /** @type {AnyEl} */ (e.target).closest && /** @type {AnyEl} */ (e.target).closest('[data-del], [data-delw], [data-delstyle], [data-add]'); if (!b) return;
    if (b.hasAttribute('data-del')) { var p = b.getAttribute('data-del').split(':'); group(p[0]).splice(+p[1], 1); }
    else if (b.hasAttribute('data-delw')) c.weapons.splice(+b.getAttribute('data-delw'), 1);
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
  $('scAddStyle').onclick = function () {
    var id = $('scStylePick').value, cat = id ? styleById(id) : null;
    c.styles.push(cat ? styleFromCatalog(cat) : { name: '', items: [] });
    renderSheetPage();
  };
  var bring = $('scBring'); if (bring) bring.onclick = function () {
    var left = sheetSkills(s).filter(function (k) { return !d.moved.some(function (m) { return m.name === k.name && m.attr === k.attr && m.diff === k.diff; }); });
    var k = left[+$('scFromSkill').value], t = $('scFromTarget').value; if (!k) return;
    d.moved.push(k);
    group(t).push(cleanCombatItem({ kind: 'skill', name: k.name, attr: k.attr, diff: k.diff, pts: k.pts, bonus: k.bonus, skillId: k.skillId }));
    renderSheetPage();
  };
  $('scAddWeapon').onclick = function () { c.weapons.push({ name: c.weapons.length ? c.weapons[c.weapons.length - 1].name : '', mode: 'sw', mod: '', type: 'cut' }); renderSheetPage(); };
  $('scCancel').onclick = function () { ui.combatDraft = null; renderSheetPage(); };
  $('scSave').onclick = function () {
    var btn = $('scSave'); btn.disabled = true; btn.textContent = 'Salvando…'; $('scCancel').disabled = true;
    Ops.saveSheetCombat(s, c, d.moved).then(function () { ui.combatDraft = null; toast('Combate salvo.'); renderSheetPage(); }, function (er) {
      btn.disabled = false; btn.textContent = 'Salvar combate'; $('scCancel').disabled = false; $('scErr').textContent = errorText(er);
    });
  };
}

/* ---------- arranging the tables ----------
   Out of the editor, a table is dragged by the handle in its header (mouse, finger or pen) or
   moved with the arrow keys on it; the new order is saved at once. While a table is being
   dragged, data that arrives does not redraw the page (S.ui.scDragging, see onData). */
function saveCombatOrder(s, keys) {
  var cur = sheetById(s.id) || s, c = sheetCombat(cur), styles = [], gpos = c.generalPos;
  keys.forEach(function (k) {
    if (k === 'g') gpos = styles.length;
    else if (c.styles[+k.slice(1)]) styles.push(c.styles[+k.slice(1)]);
  });
  if (styles.length !== c.styles.length) return; // someone changed the styles meanwhile: keep theirs
  c.styles = styles; c.generalPos = gpos;
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

