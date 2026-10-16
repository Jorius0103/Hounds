/* =====================================================================
   Hounds — Efeitos das vantagens na ficha
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   An entry of Mundo › Vantagens (from the books or the Mestre's) may have
   effects: advantage.effects = [{ target, key, names, op, value, perLevel,
   max, stacks, cond, note }], set by the Mestre in its form.
     target   what it changes (ADV_FX_TARGETS): an attribute, an active
              defense, the NH of skills (by name, by attribute, all) or of
              spells (by name, by school, all)
     key      the attribute (ADV_FX_ATTRS), the defense (ADV_FX_DEFS) or the
              skills' attribute (SKILL_ATTRS); '' for the others
     names    the skills, spells or schools, by their name in the sheet; a
              name ending in * takes every name starting with it ("Guns*"),
              and a skill without its specialty takes all of them ("Guns"
              covers "Guns (Pistol)")
     op       'add' or 'sub'; value 0-99
     perLevel the value is for each level of the advantage on the sheet
     max      the most the effect gives (null: no limit), after the levels
     stacks   false: of the effects that don't stack on the same field, only
              the largest counts (the ones that stack always add up)
     cond     when it applies ("ao resistir a venenos"): an effect with a
              condition is shown beside the field and never added to it
     note     what it is, for the Mestre and the players
   Nothing is saved on the sheet: the sheet's advantages (Vantagens, and the
   traits of Combate) are read on every drawing, each name once, and their
   effects are added on top of the base values (withAdvFx for the
   attributes, applyTalents for the skills, applyMagery for the spells,
   combatDefenses for the defenses). Removing or changing an advantage, or
   its effects, changes the sheet the next time it is drawn; the base values
   are never touched, so nothing adds up twice.
   Combat Reflexes, Enhanced Defenses, Magery and the talents are applied by
   the sheet itself (see ficha-vantagens.js, ficha-combate.js and
   ficha-magias.js): their effects here are left out, so they don't count twice.
   ===================================================================== */
var ADV_FX_TARGETS = [['attr', 'Atributo'], ['def', 'Defesa ativa'], ['skill', 'Perícias pelo nome'], ['skillAttr', 'Perícias de um atributo'],
  ['skillAll', 'Todas as perícias'], ['spell', 'Magias pelo nome'], ['college', 'Magias de uma escola'], ['spellAll', 'Todas as magias']];
var ADV_FX_ATTRS = [['st', 'ST'], ['dx', 'DX'], ['iq', 'IQ'], ['ht', 'HT'], ['per', 'Percepção'], ['will', 'Vontade'],
  ['hp', 'HP'], ['fp', 'Fadiga'], ['speed', 'Velocidade Básica'], ['move', 'Deslocamento']];
var ADV_FX_DEFS = [['dodge', 'Esquiva'], ['parry', 'Aparar'], ['block', 'Bloqueio'], ['all', 'Todas as defesas ativas']];
// The targets that take names, and the list each key comes from.
var ADV_FX_NAMED = { skill: 1, spell: 1, college: 1 };
function advFxKeys(target) { return target === 'attr' ? ADV_FX_ATTRS : target === 'def' ? ADV_FX_DEFS : target === 'skillAttr' ? SKILL_ATTRS.map(function (k) { return [k, k]; }) : []; }
function fxLabelOf(list, k) { var r = list.filter(function (x) { return x[0] === k; })[0]; return r ? r[1] : k; }

function cleanAdvEffect(e) {
  e = e || {};
  var target = ADV_FX_TARGETS.some(function (t) { return t[0] === e.target; }) ? e.target : 'attr', keys = advFxKeys(target);
  var seen = {}, names = ADV_FX_NAMED[target] ? (Array.isArray(e.names) ? e.names : String(e.names || '').split(/[,;]/))
    .map(function (n) { return String(n || '').trim().slice(0, 100); })
    .filter(function (n) { var k = norm(n); if (!n || seen[k]) return false; seen[k] = true; return true; }).slice(0, 30) : [];
  var out = { target: target, key: keys.length ? (keys.some(function (k) { return k[0] === e.key; }) ? e.key : keys[0][0]) : '', names: names,
    op: e.op === 'sub' ? 'sub' : 'add', value: cleanInt(e.value, 0, 99, 1), perLevel: !!e.perLevel,
    max: e.max === '' || e.max == null ? null : cleanInt(e.max, 0, 99, 0), stacks: e.stacks !== false,
    cond: String(e.cond || '').trim().slice(0, 200), note: String(e.note || '').trim().slice(0, 300) };
  return out;
}
// An effect by names needs at least one.
function advEffectOk(e) { return !ADV_FX_NAMED[e.target] || e.names.length > 0; }
function advEffects(c) { return (Array.isArray(c && c.effects) ? c.effects : []).map(cleanAdvEffect).filter(advEffectOk); }

// "+1 por nível (máx. +3) em ST · não acumula · só quando: ..."
function advEffectText(e) {
  var sign = e.op === 'sub' ? '−' : '+', what;
  if (e.target === 'attr') what = fxLabelOf(ADV_FX_ATTRS, e.key);
  else if (e.target === 'def') what = fxLabelOf(ADV_FX_DEFS, e.key);
  else if (e.target === 'skill' || e.target === 'spell') what = 'NH de ' + joinE(e.names);
  else if (e.target === 'skillAttr') what = 'NH das perícias de ' + e.key;
  else if (e.target === 'skillAll') what = 'NH de todas as perícias';
  else if (e.target === 'college') what = 'NH das magias de ' + joinE(e.names.map(collegeLabel));
  else what = 'NH de todas as magias';
  return sign + e.value + (e.perLevel ? ' por nível' : '') + (e.max != null ? ' (máx. ' + sign + e.max + ')' : '') + ' em ' + what +
    (e.stacks ? '' : ' · não acumula') + (e.cond ? ' · só quando: ' + e.cond : '');
}
// The advantages the sheet applies by itself (see the note above).
var ADV_FX_BUILTIN_RE = /^(Combat Reflexes|Enhanced Time Sense|Enhanced (Block|Parry|Dodge|Defenses)|Magery|Talent)\b/i;

// The effects of the sheet's advantages, each with its value for the advantage's level:
// [{ e, v, from }]. Vantagens first, then Combate's traits; a name only once. Kept while the sheet
// and the list of advantages are the same objects (both are replaced when they change).
var advFxCache = { s: null, list: null, out: null };
function sheetFx(s) {
  if (!s) return [];
  if (advFxCache.s === s && advFxCache.list === W.advantages) return advFxCache.out;
  var seen = {}, out = [], traits = scAllItems(sheetCombat(s)).filter(function (x) { return x.kind === 'trait'; }), advs = sheetAdvs(s);
  if (advs.length || traits.length) loadCatalog('advantages'); // the page redraws when it arrives
  function add(x, levels) {
    var key = norm(x.name); if (seen[key]) return; seen[key] = true;
    if (x.size || ADV_FX_BUILTIN_RE.test(x.name)) return;
    var c = advEntryOf(x); if (!c) return;
    // The level: the sheet's levels, or the number after the name ("Acute Vision 2"); 1 without.
    var m = /\s(\d+)$/.exec(x.name), lv = levels || (m ? +m[1] : 0) || 1;
    advEffects(c).forEach(function (e) {
      var v = e.value * (e.perLevel ? lv : 1);
      if (e.max != null) v = Math.min(v, e.max);
      out.push({ e: e, v: e.op === 'sub' ? -v : v, from: x.name + (levels ? ' ' + levels : '') });
    });
  }
  advs.forEach(function (x) { add(x, x.levels); });
  traits.forEach(function (x) { add(x, 0); });
  advFxCache = { s: s, list: W.advantages, out: out };
  return out;
}
// What a field gets from the effects that reach it: the ones with a condition are only listed;
// the ones that stack add up; of the ones that don't, only the largest. { n, used, conds }.
function fxSum(list) {
  var n = 0, best = /** @type {any} */ (null), used = [], conds = [];
  list.forEach(function (m) {
    if (m.e.cond) conds.push(m);
    else if (m.e.stacks) { n += m.v; used.push(m); }
    else if (!best || Math.abs(m.v) > Math.abs(best.v)) best = m;
  });
  if (best) { n += best.v; used.push(best); }
  return { n: n, used: used, conds: conds };
}
function fxSigned(v) { return (v > 0 ? '+' : v < 0 ? '−' : '+') + Math.abs(v); }
// Each source written out: ["+1 de Treinamento Especial", "+2 de Ambidexterity só quando: ... (não somado)"].
function fxParts(r) {
  return r.used.map(function (m) { return fxSigned(m.v) + ' de ' + m.from; })
    .concat(r.conds.map(function (m) { return fxSigned(m.v) + ' de ' + m.from + ' só quando ' + m.e.cond + ' (não somado)'; }));
}
function fxEmpty(r) { return !r || (!r.used.length && !r.conds.length); }

// A name of the sheet against a name of an effect: the same, the same without the specialty in
// parentheses, or starting with it when it ends in *.
function fxNameMatch(pattern, name) {
  var p = norm(pattern).trim(), n = norm(name).trim();
  if (!p) return false;
  if (p.slice(-1) === '*') return n.indexOf(p.slice(0, -1).trim()) === 0;
  return n === p || n.replace(/\s*\([^)]*\)\s*$/, '') === p;
}
// The effects on a skill (k: { name, attr }) or a spell (k: { name, college }; colleges: its schools).
function fxForSkill(s, k) {
  return fxSum(sheetFx(s).filter(function (m) {
    var e = m.e;
    return e.target === 'skillAll' || (e.target === 'skillAttr' && e.key === k.attr) ||
      (e.target === 'skill' && e.names.some(function (n) { return fxNameMatch(n, k.name); }));
  }));
}
function fxForSpell(s, k, colleges) {
  return fxSum(sheetFx(s).filter(function (m) {
    var e = m.e;
    return e.target === 'spellAll' || (e.target === 'spell' && e.names.some(function (n) { return fxNameMatch(n, k.name); })) ||
      (e.target === 'college' && e.names.some(function (n) { return colleges.some(function (c) { return fxNameMatch(n, c) || norm(collegeLabel(c)) === norm(n); }); }));
  }));
}

/* ---------- attributes ---------- */
// The attributes with the effects: a copy of a (the base: saved, or being edited) with each bonus
// added to its field, and fx = { base: a, b: { st: fxSum }, def: { dodge, parry, block } }.
// gurpsStats counts the points from fx.base, so the advantages' bonuses cost nothing here.
function withAdvFx(s, a) {
  var fx = sheetFx(s), out = /** @type {SheetAttrs} */ (Object.assign({}, a)), b = {}, def = {};
  ADV_FX_ATTRS.forEach(function (r) {
    var k = r[0], x = fxSum(fx.filter(function (m) { return m.e.target === 'attr' && m.e.key === k; }));
    if (fxEmpty(x)) return;
    b[k] = x;
    out[k] = a[k] + x.n;
    // ST, DX, IQ and HT stay at 1 or more, like the base (the damage table starts at ST 1).
    if (/^(st|dx|iq|ht)$/.test(k)) out[k] = Math.max(1, out[k]);
  });
  ['dodge', 'parry', 'block'].forEach(function (k) {
    var x = fxSum(fx.filter(function (m) { return m.e.target === 'def' && (m.e.key === k || m.e.key === 'all'); }));
    if (!fxEmpty(x)) def[k] = x;
  });
  // Peso from the ST the effects leave (Basic Lift), as sheetAttrs does from the base.
  out.enc = sheetEncLevel(s, out.st);
  out.fx = { base: a, b: b, def: def };
  return out;
}
// The attributes the sheet uses everywhere: the ones being edited, or the saved ones, with the effects.
function sheetAttrsNow(s) { return withAdvFx(s, S.ui.attrDraft || sheetAttrs(s)); }
// Beside a defense's sum (see scCalc): [value, "vantagens: ..."].
function fxCalcPart(r) { return [r ? r.n : 0, r && r.n ? 'vantagens: ' + r.used.map(function (m) { return m.from; }).join(', ') : '']; }
// The conditional ones of a defense, for its notes.
function fxCondNotes(r) { return r ? r.conds.map(function (m) { return fxSigned(m.v) + ' de ' + m.from + ' só quando ' + m.e.cond; }) : []; }
