/* =====================================================================
   Hounds — Ficha › Equip. › Criar Arma
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html (depois de ficha-armaduras.js).
   ===================================================================== */
'use strict';

/* A weapon of Regras › Armas with adjustments (free text or a spell, as in Criar Armadura), added to
   the sheet's list (Meus Itens) as a weapon line.
   sheet.customWeapons = [{ id, baseId, base: { name, tl, type, cost, weight }, description,
       mods: [{ name, spellId?, dmg, nh, cost, weightPct, weightLbs }], attacks: [attack], cost, weight, equipId }]
     base: the weapon as it was when made; mods: the adjustments, each adding to (or, negative,
     taking from) the damage of every attack, the NH with the weapon (on top of the sheet's skill,
     which does not change: weaponNh), the cost ($) and the weight (%); attacks: the book's
     lines with baseDamage (the book's) and damage (adjusted); cost and weight: the results
     (weaponCalc); equipId: the line of the list that is the weapon (null: it left the list). */
var WEAPON_ATTACK_KEYS = ['skill', 'defaults', 'mode', 'reach', 'parry', 'acc', 'range', 'rof', 'shots', 'st', 'bulk', 'rcl', 'notes'];

/* ---------- the calculation ---------- */
// The damage plus n: "sw+1 cut" + 1 is "sw+2 cut", "thr cr" + 1 "thr+1 cr", "2d-1 pi" + 1 "2d pi",
// "thr+1(0.5) imp" + 1 "thr+2(0.5) imp". null when the text is not one that takes a plus ("spec.",
// "–", a multiplier as "6d×2 pi++").
function dmgPlus(dmg, n) {
  var m = /^(sw|thr|\d+d)([+-]\d+)?(.*)$/i.exec(String(dmg || '').trim());
  if (!m || /^\s*[×x]/i.test(m[3])) return n ? null : String(dmg || '');
  var k = (m[2] ? +m[2] : 0) + n;
  return m[1] + (k > 0 ? '+' + k : k < 0 ? String(k) : '') + m[3];
}
function cleanWeaponAdj(m) {
  m = m || {};
  var o = { name: String(m.name || '').trim().slice(0, 120), dmg: cleanInt(m.dmg, -20, 20, 0), nh: cleanInt(m.nh, -20, 20, 0), cost: abNum(m.cost, -9999999, 9999999) || 0, weightPct: abNum(m.weightPct, -100, 1000) || 0,
    weightLbs: abNum(m.weightLbs, -99999, 99999) || 0 };
  o.cost = Math.round(o.cost * 100) / 100; o.weightPct = Math.round(o.weightPct * 100) / 100; o.weightLbs = Math.round(o.weightLbs * 100) / 100;
  var sp = gearId(m.spellId, 200); if (sp) o.spellId = sp;
  // cutImp: the damage only on the cutting and impaling attacks (Fine, Very Fine).
  if (m.cutImp === true && o.dmg) o.cutImp = true;
  return cleanAdjImprovement(o, m);
}
// dmgCutImp: the damage of the adjustments that is only for cutting and impaling attacks.
function weaponAdjTotal(mods) {
  var t = { dmg: 0, dmgCutImp: 0, nh: 0, cost: 0, weightPct: 0, weightLbs: 0 };
  mods.forEach(function (m) { if (m.cutImp) t.dmgCutImp += m.dmg || 0; else t.dmg += m.dmg || 0; t.nh += m.nh || 0; t.cost += m.cost || 0; t.weightPct += m.weightPct || 0; t.weightLbs += m.weightLbs || 0; });
  t.cost = eqRound(t.cost); t.weightPct = eqRound(t.weightPct); t.weightLbs = eqRound(t.weightLbs);
  return t;
}
// A cutting or impaling attack ("sw+1 cut", "thr imp").
function weaponCutImp(dmg) { return /\b(cut|imp)\b/i.test(String(dmg || '')); }
// "Puissance (dano +1, NH +1, +$300, peso −10%)".
function weaponAdjText(m) {
  function sg(n) { return n < 0 ? '−' : '+'; }
  var dmg = (m.dmg || 0) + (m.dmgCutImp || 0), ci = m.cutImp || (m.dmgCutImp && !m.dmg);
  var parts = [dmg ? 'dano ' + sg(dmg) + Math.abs(dmg) + (ci ? ' (corte/perf.)' : '') : '', m.nh ? 'NH ' + sg(m.nh) + Math.abs(m.nh) : '', m.cost ? sg(m.cost) + eqMoney(Math.abs(m.cost)) : '', m.weightPct ? 'peso ' + sg(m.weightPct) + eqNum(Math.abs(m.weightPct)) + '%' : '', m.weightLbs ? 'peso ' + sg(m.weightLbs) + eqLbs(Math.abs(m.weightLbs)) : ''].filter(Boolean);
  return m.name + (parts.length ? ' (' + parts.join(', ') + ')' : '');
}
// The weapon with its adjustments, in this order: the book's cost and weight; the cost plus the
// adjustments' $; the weight times (1 + their % / 100) (the % add up); every
// attack's damage plus their damage (the cutting and impaling ones also plus dmgCutImp). Never below
// 0. odd: the attacks whose damage takes no plus (left as in the book).
function weaponCalc(base, attacks, mods) {
  var t = weaponAdjTotal(mods), odd = [];
  var out = attacks.map(function (a) {
    var dmg = dmgPlus(a.baseDamage, t.dmg + (weaponCutImp(a.baseDamage) ? t.dmgCutImp : 0));
    if (dmg == null) { odd.push(a.baseDamage); dmg = a.baseDamage; }
    return Object.assign({}, a, { damage: dmg });
  });
  return { attacks: out, cost: Math.max(0, eqRound(base.cost + t.cost)), weight: Math.max(0, eqRound(base.weight * (1 + t.weightPct / 100) + t.weightLbs)), odd: odd };
}
var WEAPON_ADJ = { p: 'wb', kind: 'Arma', nums: [['dmg', 'Dano', '1'], ['nh', 'NH', '1'], ['cost', 'Custo ($)', 'any'], ['weight', 'Peso', 'any']], blank: { name: '', dmg: 0, nh: 0, cost: 0, weightPct: 0, weightLbs: 0 },
  clean: function (m) { return cleanWeaponAdj(m); }, total: function (l) { return weaponAdjTotal(l); }, text: function (m) { return weaponAdjText(m); },
  hint: 'Escreva o ajuste ou busque um melhoramento ou uma magia. Ex.: Fine, Balanced, Puissance',
  help: 'Cada ajuste soma (ou, negativo, tira): o dano de todos os ataques (+1 faz sw+1 cut virar sw+2 cut), o NH com esta arma (somado ao NH da perícia do ataque na ficha; a perícia não muda), o custo em $ e o peso, em % do peso da arma ou em lbs. ' +
    'Um melhoramento de Regras › Melhoramentos já vem com o que a regra dele diz (custo em $, peso e, quando a descrição dá, dano e NH; o dano de Fine e Very Fine só nos ataques de corte e perfuração). Quando o custo depende do tipo de arma, escolha a opção certa na lista. Com vários ajustes, os valores se somam. Os ajustes ficam guardados com a arma.' };

// The NH of an attack on this sheet: the sheet's level in the attack's skill (Combate or Perícias,
// with the talents), or the best of the book's defaults ("DX-5, Force Sword-4": an attribute, or a
// skill the sheet has with points), whichever is higher; plus the adjustments' NH. null when the
// sheet can use it neither way. title: how it was reached.
function weaponNh(s, a, plus) {
  if (!s || (!a.skill && !a.defaults)) return null;
  var av = attrValues(sheetAttrsNow(s)), pool = combatSkillPool(sheetCombat(s), s), best = null;
  function lvl(k) { var x = cleanCombatItem(Object.assign({}, k, { kind: 'skill' })); x.tbonus = k.tbonus; var nh = combatNh(x, pool, av); return nh && nh.abs != null ? nh.abs : null; }
  var k = a.skill ? scFindSkill(pool, a.skill) : null, v = k ? lvl(k) : null;
  if (v != null) best = { v: v, from: k.name + ' ' + v };
  String(a.defaults || '').split(/\s*,\s*(?:or\s+)?|\s+or\s+/).forEach(function (p) {
    var m = /^(.*?)\s*([+-]\d+)?$/.exec(p.trim()); if (!m || !m[1]) return;
    var n = m[2] ? +m[2] : 0, base = null;
    if (av[m[1]] != null) base = av[m[1]];
    else { var o = scFindSkill(pool, m[1]); if (o && o.pts > 0) base = lvl(o); }
    if (base != null && (!best || base + n > best.v)) best = { v: base + n, from: 'padrão ' + p.trim() + ' = ' + (base + n) };
  });
  if (!best) return null;
  plus = plus || 0;
  return { v: best.v + plus, title: best.from + (plus ? (plus > 0 ? ' + ' : ' − ') + Math.abs(plus) + ' dos ajustes' : '') };
}
// The damage in dice for the sheet's ST (Basic Set, p. B16, as Combate does): "sw+1 cut" with ST 12
// (sw 1d+2) is "1d+3 cut". A damage already in dice ("2d+1 pi") or with no sw/thr stays as it is.
function weaponDice(dmg, st) {
  var m = /^(sw|thr)([+-]\d+)?(.*)$/i.exec(String(dmg || '').trim());
  if (!m) return String(dmg || '');
  return dmgAdd(gurpsDamage(Math.max(1, st))[m[1].toLowerCase()], m[2] ? +m[2] : 0) + m[3];
}
function weaponSt(s) { return s ? sheetAttrsNow(s).st : 10; }
// The Dano cell: the dice for the sheet's ST, the formula below; the hover says where it came from.
function weaponDmgCell(s, a) {
  var st = weaponSt(s), dice = weaponDice(a.damage, st), changed = a.damage !== a.baseDamage;
  var title = [dice !== a.damage ? a.damage + ' com ST ' + st : '', changed ? 'livro: ' + a.baseDamage : ''].filter(Boolean).join(' · ');
  return '<td class="gval' + (changed ? ' bonus' : '') + '"' + (title ? ' title="' + esc(title) + '"' : '') + '>' + esc(dice || '—') + (dice !== a.damage ? '<small>' + esc(a.damage) + '</small>' : '') + '</td>';
}
function weaponNhCell(s, a, plus) {
  var nh = weaponNh(s, a, plus);
  return nh ? '<td class="gval' + (plus ? ' bonus' : '') + '" title="' + esc(nh.title) + '">' + nh.v + '</td>' : '<td title="A ficha não tem a perícia nem um padrão dela"><span class="eq-none">—</span></td>';
}

/* ---------- data of the sheet ---------- */
function cleanWeaponAttack(a) {
  a = a || {};
  var o = { baseDamage: String(a.baseDamage != null ? a.baseDamage : a.damage || '').slice(0, 60), damage: String(a.damage || '').slice(0, 60) };
  WEAPON_ATTACK_KEYS.forEach(function (k) { var v = String(a[k] == null ? '' : a[k]).trim().slice(0, k === 'defaults' || k === 'notes' ? 300 : 60); if (v) o[k] = v; });
  return o;
}
function cleanCustomWeapon(w, i, by) {
  w = w || {};
  var b = w.base || {};
  return { id: gearId(w.id) || 'w' + (i + 1), baseId: gearId(w.baseId, 200) || null,
    base: { name: String(b.name || '').trim().slice(0, 120) || '—', tl: String(b.tl || '').slice(0, 20), type: String(b.type || '').slice(0, 20), cost: cleanDec(b.cost, 9999999, 0), weight: cleanDec(b.weight, 99999, 0) },
    description: String(w.description || '').trim().slice(0, 2000), mods: (Array.isArray(w.mods) ? w.mods : []).map(cleanWeaponAdj).filter(function (m) { return m.name; }),
    attacks: (Array.isArray(w.attacks) ? w.attacks : []).map(cleanWeaponAttack).slice(0, 30), cost: cleanDec(w.cost, 9999999, 0), weight: cleanDec(w.weight, 99999, 0),
    equipId: w.equipId && by[w.equipId] ? w.equipId : null };
}
// Weapons of Regras › Armas that can be made: with attacks.
function weaponBases() { return (W.weapons || []).filter(function (w) { return (w.attacks || []).length; }); }
// The one skill a weapon of more than one is made with: the skill named in the weapon's name
// ("Main-Gauche", "Long Knife" → Knife, "Quarterstaff" → Staff); else the first of the book, the
// group the weapon is listed in (Katana → Broadsword), leaving out the ones that are not a skill
// ("Brawling or DX"). others: the skills left out.
function weaponMainSkill(w) {
  var skills = [];
  (w.attacks || []).forEach(function (a) { if (a.skill && skills.indexOf(a.skill) < 0) skills.push(a.skill); });
  if (skills.length < 2) return { skill: skills[0] || null, others: [] };
  var name = ' ' + norm(w.name).replace(/[^a-z0-9]+/g, ' ') + ' ', real = skills.filter(function (k) { return !/\bor\b|\bDX\b/.test(k); });
  var named = real.filter(function (k) { return name.indexOf(' ' + norm(k).replace(/[^a-z0-9]+/g, ' ').trim() + ' ') >= 0 || norm(w.name).replace(/[^a-z]/g, '').indexOf(norm(k).replace(/[^a-z]/g, '')) >= 0; })
    .sort(function (a, b) { return b.length - a.length; })[0];
  var skill = named || real[0] || skills[0];
  return { skill: skill, others: skills.filter(function (k) { return k !== skill; }) };
}
// The weapon of the book as the start of a made one: only the attacks of its main skill
// (weaponMainSkill); the first of them is not "or" any more.
function weaponBaseOf(w) {
  var main = weaponMainSkill(w), atk = (w.attacks || []).filter(function (a) { return !main.skill || a.skill === main.skill || !a.skill; });
  return { base: { name: w.name, tl: String(w.tl || ''), type: String(w.type || ''), cost: catNum(w.cost) || 0, weight: catNum(w.weight) || 0 }, others: main.others,
    attacks: atk.map(function (a, i) { return cleanWeaponAttack(Object.assign({}, a, { baseDamage: a.damage || '' }, i === 0 && a.mode === 'or' ? { mode: '' } : {})); }) };
}
function weaponDraftResult(d) { return weaponCalc(d.base, d.attacks, d.adj.map(cleanWeaponAdj).filter(function (m) { return m.name; })); }
function weaponDraftErrors(d) {
  var out = [];
  if (!d.base) out.push('Escolha a arma.');
  if (d.adj.some(function (m) { var c = cleanWeaponAdj(m); return !c.name && (c.dmg || c.nh || c.cost || c.weightPct || c.weightLbs); })) out.push('Dê um nome a cada ajuste com valores.');
  return out;
}
// The Notas of a new weapon: the description and the book's notes ("[3] An arrow ... is $2.").
function weaponPieceNotes(d) {
  var c = d.baseId ? weaponById(d.baseId) : null;
  return [String(d.description || '').trim(), c && c.footnotes ? String(c.footnotes).replace(/\s*\n\s*/g, ' ').trim() : ''].filter(Boolean).join(' ').slice(0, 400);
}

// Saves the weapon and its line in Meus Itens in one write. An edited weapon keeps its line (the body
// and the packs keep pointing to it).
Ops.saveCustomWeapon = function (s, d) {
  if (!rawHas('sheets', s.id)) return Promise.reject({ message: 'Essa ficha não existe mais.' });
  var errs = weaponDraftErrors(d); if (errs.length) return Promise.reject({ message: errs.join(' ') });
  var g = sheetGear(sheetById(s.id) || s), prev = d.id ? g.customWeapons.filter(function (w) { return w.id === d.id; })[0] || null : null;
  var r = weaponDraftResult(d), equip = g.equip.slice(), lines = gearIndex(equip);
  var cw = { id: prev ? prev.id : gearNewId('w', gearIndex(g.customWeapons)), baseId: d.baseId, base: d.base, description: String(d.description || '').trim(),
    mods: d.adj.map(cleanWeaponAdj).filter(function (m) { return m.name; }), attacks: r.attacks, cost: r.cost, weight: r.weight, equipId: null };
  var fields = { kind: 'weapon', name: gearOwnName(d.name) || d.base.name, qty: 1, weight: r.weight, cost: r.cost }, line = prev && prev.equipId ? lines[prev.equipId] : null;
  if (line) { line = Object.assign({}, line, fields); delete line.refId; equip[equip.indexOf(lines[line.id])] = line; }
  else { line = Object.assign({ id: gearNewId('e', lines), notes: weaponPieceNotes(d) }, fields); equip.push(line); }
  cw.equipId = line.id;
  var list = prev ? g.customWeapons.map(function (w) { return w.id === cw.id ? cw : w; }) : g.customWeapons.concat([cw]);
  return saveGearLists(s, { equip: equip, customWeapons: list }).then(function () { return cw; });
};
// The line leaves Meus Itens too (and so the body and the packs).
Ops.deleteCustomWeapon = function (s, id) {
  var g = sheetGear(sheetById(s.id) || s), cw = g.customWeapons.filter(function (w) { return w.id === id; })[0];
  if (!cw) return Promise.resolve();
  var ch = { customWeapons: g.customWeapons.filter(function (w) { return w.id !== id; }) };
  if (cw.equipId) ch.equip = g.equip.filter(function (e) { return e.id !== cw.equipId; });
  return saveGearLists(s, ch);
};

/* ---------- view ---------- */
function weaponBaseBoxHtml(s, d) {
  if (!d.base) return '<p class="hint-text" style="margin:0">Escolha a arma em Regras › Armas: os dados e os ataques dela aparecem aqui.</p>';
  var cat = d.baseId ? weaponById(d.baseId) : null, r = weaponDraftResult(d), nhPlus = weaponAdjTotal(d.adj.map(cleanWeaponAdj).filter(function (m) { return m.name; })).nh;
  return '<div class="gurps-derived">' + gearStat('Arma', esc(d.base.name), cat ? ptNameHtml(cat) || esc(cat.page || '') : 'como gravada') +
    gearStat('Tipo', esc(weaponTypeLabel(d.base.type)), '') + gearStat('Custo', esc(eqMoney(r.cost)), r.cost !== d.base.cost ? 'livro: ' + esc(eqMoney(d.base.cost)) : 'do livro') +
    gearStat('Peso', esc(eqLbs(r.weight)), r.weight !== d.base.weight ? 'livro: ' + esc(eqLbs(d.base.weight)) : 'do livro') + gearStat('TL', esc(d.base.tl || '—'), '') + '</div>' +
    // The attacks as Regras › Armas shows them (Perícia, Modo, Dano, Alcance, Aparar, ST...), with the adjusted damage.
    // The damage shown with the dice for the sheet's ST ("sw+2 cut = 1d+4 cut").
    '<div id="wbAttacks">' + weaponAttacksHtml({ attacks: r.attacks.map(function (a) { var x = weaponDice(a.damage, weaponSt(s)); return Object.assign({}, a, { damage: x !== a.damage ? a.damage + ' = ' + x : a.damage }); }) },
      function (a) { return weaponNhCell(s, a, nhPlus); }) + '</div>' +
    (d.others && d.others.length ? '<p class="hint-text" style="margin:0">Esta arma também é usada com ' + esc(d.others.join(', ')) + ' no livro; fica só a perícia que é dela, ' + esc((d.attacks[0] || {}).skill || '') + '.</p>' : '') +
    (r.odd.length ? '<p class="hint-text" style="margin:0">Dano sem número para somar, ficou como no livro: ' + esc(r.odd.join(', ')) + '.</p>' : '') +
    (cat && cat.footnotes ? '<p class="hint-text" style="margin:0"><b>Notas da arma:</b> ' + esc(String(cat.footnotes).replace(/\s*\n\s*/g, ' ')) + ' <span>(vão para as Notas em Meus Itens)</span></p>' : '');
}
function weaponBuilderHtml(s, d) {
  return '<div class="box sk-edit"><div class="ab-grid">' +
    '<label class="sc-f"><span>Arma</span><div class="sk-pick"><input type="text" id="wbBase" maxlength="120" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="wbBaseSug"' +
    ' placeholder="' + (W.loaded.weapons ? 'Digite para buscar. Ex.: espada larga, Broadsword, arco' : 'Carregando armas…') + '" value="' + esc(d.base ? d.base.name : '') + '"><div class="suggest" id="wbBaseSug" role="listbox" hidden></div></div></label>' +
    gearNameFieldHtml('wbName', d.name, d.base ? d.base.name : '') +
    '<label class="sc-f ab-wide"><span>Descrição</span><textarea id="wbDesc" rows="2" maxlength="2000" placeholder="Opcional">' + esc(d.description) + '</textarea></label></div>' +
    '<p class="hint-text" style="margin:0">Ficha <b>' + esc(s.name) + '</b>: a arma entra em Meus Itens com o <b>Nome</b> dado ou, sem ele, com o nome do livro.' + (d.id ? ' Editando: a arma mantém a linha na lista (e onde está no Corpo e nas Mochilas).' : '') + '</p>' +
    '<div id="wbBaseBox">' + weaponBaseBoxHtml(s, d) + '</div></div>' +
    '<div class="box sk-edit" id="wbModsBox"' + (d.base ? '' : ' hidden') + '><h3 class="sec-title" style="margin:0">Ajustes</h3><div class="ab-mods" id="wbMods">' + adjListHtml(WEAPON_ADJ, d.adj) + '</div></div>' +
    (d.impact ? '<div class="confirm" role="alert"><span>Esta arma está em uso (' + esc(d.impact) + '), e salvar muda o custo, o peso ou o dano dela.</span><div class="btn-row">' +
      '<button class="btn danger solid" type="button" id="wbApply">Salvar mesmo assim</button><button class="btn ghost" type="button" id="wbBack">Voltar</button></div></div>' : '') +
    '<div class="form-err" id="wbErr" role="alert"></div>' +
    '<div class="btn-row" style="justify-content:flex-end"><button class="btn ghost" type="button" id="wbCancel">Cancelar</button>' +
    '<button class="btn primary" type="button" id="wbSave">' + (d.id ? 'Salvar alterações' : 'Criar arma e adicionar aos itens') + '</button></div>';
}
function sheetWeaponHtml(s, g) {
  var ui = S.ui, can = canWrite(), d = can ? ui.weaponDraft : null, n = g.customWeapons.length;
  var head = '<div class="gurps-head"><h2 class="sec-title">Criar Arma</h2>' + (n ? '<span class="gurps-total">' + plural(n, 'arma', 'armas') + '</span>' : '') +
    (!d ? '<div class="btn-row">' + (can && !gearEditing() ? '<button class="btn primary" type="button" id="wbNew">' + svg(ICON.plus, 15, 2.4) + 'Criar arma</button>' : '') + '</div>' : '') + '</div>';
  if (d) return '<section class="gurps" id="weaponSec">' + head + weaponBuilderHtml(s, d) + '</section>';
  return gearCreateTile('weaponSec', 'wbNew', ICON.weapon, 'Arma', n ? plural(n, 'arma', 'armas') : '', 'De Regras › Armas, com ajustes');
}
// The weapons of Criar Arma in Meus Itens (Arma | Modo | Dano | NH | Alcance | Custo | Peso | Ajustes;
// Aparar, ST and the notes stay in Criar Arma, Regras › Armas and Editar equipamentos): one row per attack (the weapon's name, cost, weight,
// adjustments and actions once, over its attacks).
function weaponItemsHtml(lines, g, L, can) {
  var ui = S.ui, weight = 0, s = pageSheet();
  var rows = lines.map(function (x) {
    var cw = g.weaponLines[x.id], nhPlus = weaponAdjTotal(cw.mods).nh, counted = L.counted[x.id] || 0, where = gearWhere(g, x.id), atk = cw.attacks.length ? cw.attacks : [{ damage: '' }], n = atk.length;
    var adj = cw.mods.length ? cw.mods.map(weaponAdjText).join('; ') : '';
    weight += x.qty * x.weight;
    function span(h) { return h.replace('<td', '<td rowspan="' + n + '"'); }
    var html = atk.map(function (a, i) {
      var first = i === 0;
      return '<tr' + (counted ? '' : ' class="eq-stored"') + '>' +
        (first ? span('<td class="wb-name"><b>' + gearKindTag('weapon') + esc(x.name) + '</b>' + gearAutoSub(x, cw.base.name) + '<small class="eq-where">' + esc(where.length ? where.join(' · ') + ' · ' + (counted ? 'na carga' : 'fora da carga') : 'Só na lista · fora da carga') + '</small></td>') : '') +
        '<td class="wmode">' + esc(weaponModeText(a.mode)) + '</td>' +
        weaponDmgCell(s, a) + weaponNhCell(s, a, nhPlus) +
        '<td>' + esc(a.reach || a.range || '—') + '</td>' +
        (first ? span('<td>' + esc(eqLbs(x.weight)) + '</td>') +
          span('<td class="ab-txt">' + (adj ? esc(adj) : '<span class="eq-none">—</span>') + '</td>') +
          (can ? span('<td class="ab-acts"><button class="icon-btn" type="button" data-wb-edit="' + esc(cw.id) + '" aria-label="Editar ' + esc(x.name) + '" title="Editar">' + svg(ICON.edit, 15) + '</button>' +
            '<button class="icon-btn" type="button" data-wb-copy="' + esc(cw.id) + '" aria-label="Outra com estes ajustes" title="Outra arma igual, com os mesmos ajustes">' + svg(ICON.plus, 15, 2.4) + '</button>' +
            '<button class="icon-btn" type="button" data-wb-del="' + esc(cw.id) + '" aria-label="Excluir ' + esc(x.name) + '" title="Excluir">' + svg(ICON.trash, 15) + '</button></td>') : '') : '') + '</tr>';
    }).join('');
    if (can && ui.weaponDel === cw.id) {
      html += '<tr><td colspan="8"><div class="confirm" role="alert"><span>Excluir <b>' + esc(x.name) + '</b>?' + (where.length ? ' Em uso: ' + esc(where.join(' · ')) + '. Excluir tira de lá também.' : '') + '</span>' +
        '<div class="btn-row"><button class="btn danger solid" type="button" data-wb-delall="' + esc(cw.id) + '">Excluir</button>' +
        '<button class="btn ghost" type="button" data-wb-delno="1">Cancelar</button></div></div></td></tr>';
    }
    return html;
  }).join('');
  return '<div class="wtab-wrap"><table class="gtab ab-items wb-items"><thead><tr><th>Arma</th><th>Modo</th><th>Dano</th><th>NH</th><th>Alcance</th><th>Peso</th><th>Ajustes</th>' + (can ? '<th></th>' : '') + '</tr></thead><tbody>' + rows + '</tbody>' +
    '<tfoot><tr><td class="wb-name" colspan="5">' + plural(lines.length, 'arma', 'armas') + '</td><td>' + esc(eqLbs(eqRound(weight))) + '</td><td colspan="' + (can ? 2 : 1) + '"></td></tr></tfoot></table></div>';
}

/* ---------- wiring ---------- */
// g: the sheet's lists, for the name of the weapon being edited (its line's, when it was given).
function weaponDraftFrom(cw, mode, g) {
  var d = { id: null, baseId: null, base: null, attacks: [], name: '', description: '', adj: [], impact: null };
  if (!cw) return d;
  d.baseId = cw.baseId; d.base = Object.assign({}, cw.base); d.description = cw.description;
  d.attacks = cw.attacks.map(function (a) { return Object.assign({}, a); });
  d.adj = cw.mods.map(function (m) { return Object.assign({}, m); });
  if (mode === 'edit') { d.id = cw.id; if (g && cw.equipId) d.name = gearGivenName(gearIndex(g.equip)[cw.equipId], cw.base.name); }
  return d;
}
function wireWeaponSec(s) {
  var ui = S.ui, box = $('weaponSec'); if (!box) return;
  var nb = $('wbNew'); if (nb) nb.onclick = function () { ui.weaponDraft = weaponDraftFrom(null); loadCatalog('weapons'); renderSheetPage(); var n = $('wbBase'); if (n) n.focus(); };
  var d = ui.weaponDraft;
  if (!d) {
    var items = $('equip'); if (!items) return;
    items.addEventListener('click', function (e) {
      var t = /** @type {AnyEl} */ (e.target), b = t.closest && t.closest('[data-wb-edit], [data-wb-copy], [data-wb-del], [data-wb-delall], [data-wb-delno]'); if (!b) return;
      var g = sheetGear(s), find = function (attr) { var id = b.getAttribute(attr); return g.customWeapons.filter(function (w) { return w.id === id; })[0]; };
      if (b.hasAttribute('data-wb-edit')) { ui.weaponDraft = weaponDraftFrom(find('data-wb-edit'), 'edit', g); loadCatalog('weapons'); renderSheetPage(); return; }
      if (b.hasAttribute('data-wb-copy')) { ui.weaponDraft = weaponDraftFrom(find('data-wb-copy'), 'copy', g); loadCatalog('weapons'); renderSheetPage(); return; }
      if (b.hasAttribute('data-wb-del')) { ui.weaponDel = b.getAttribute('data-wb-del'); renderSheetPage(); return; }
      if (b.hasAttribute('data-wb-delno')) { ui.weaponDel = null; renderSheetPage(); return; }
      var cw = find('data-wb-delall');
      b.disabled = true;
      Ops.deleteCustomWeapon(s, cw.id).then(function () { ui.weaponDel = null; toast('Arma excluída.'); renderSheetPage(); },
        function (er) { b.disabled = false; toast(errorText(er), true); });
    });
    return;
  }
  // The data and attacks redraw with the adjustments; the adjustment rows themselves stay.
  function paint() { d.impact = null; $('wbBaseBox').innerHTML = weaponBaseBoxHtml(s, d); $('wbErr').textContent = ''; var c = box.querySelector('.confirm'); if (c) c.remove(); }
  $('wbName').addEventListener('input', function () { d.name = $('wbName').value; });
  $('wbDesc').addEventListener('input', function () { d.description = $('wbDesc').value; });
  wireAdjList(WEAPON_ADJ, $('wbMods'), d.adj, paint, function () {
    return { weight: d.base ? d.base.weight : 0, ranged: d.attacks.some(function (a) { return /bow|crossbow|blowpipe/i.test(a.skill || ''); }) };
  });
  // The weapon: Regras › Armas, found by name in English or Portuguese.
  var pick = $('wbBase'), sug = $('wbBaseSug'), opts = [], act = 0;
  function hide() { sug.hidden = true; sug.innerHTML = ''; pick.setAttribute('aria-expanded', 'false'); }
  function show() {
    var q = pick.value, all = weaponBases();
    opts = norm(q).trim() && !(d.base && q === d.base.name) ? searchCatalog(all, q, null).slice(0, 12) : [];
    act = Math.min(act, Math.max(0, opts.length - 1));
    if (!opts.length) { hide(); return; }
    sug.innerHTML = opts.map(function (w, n) {
      return '<button type="button" role="option" data-o="' + n + '" class="' + (n === act ? 'act' : '') + '" aria-selected="' + (n === act) + '"><span>' + esc(w.name) + ptNameHtml(w) + '</span>' +
        '<small>' + esc([weaponSummary(w), w.cost, w.weight ? w.weight + ' lb' : '', w.tl ? 'TL ' + w.tl : '', w.page].filter(Boolean).join(' · ')) + '</small></button>';
    }).join('');
    sug.hidden = false; pick.setAttribute('aria-expanded', 'true');
    var on = sug.querySelector('.act'); if (on) on.scrollIntoView({ block: 'nearest' });
  }
  function choose(n) {
    var w = opts[n]; if (!w) return;
    var b = weaponBaseOf(w);
    d.baseId = w.id; d.base = b.base; d.attacks = b.attacks; d.others = b.others; pick.value = w.name; hide();
    $('wbName').setAttribute('placeholder', gearAutoHint(d.base.name));
    $('wbModsBox').hidden = false; paint();
  }
  pick.addEventListener('input', function () { act = 0; show(); });
  pick.addEventListener('focus', function () { loadCatalog('weapons'); });
  pick.addEventListener('blur', function () { setTimeout(function () { if (document.activeElement !== pick) { hide(); if (d.base) pick.value = d.base.name; } }, 150); });
  pick.addEventListener('keydown', function (e) {
    if (sug.hidden || !opts.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); act = Math.min(opts.length - 1, act + 1); show(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); act = Math.max(0, act - 1); show(); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(act); }
    else if (e.key === 'Escape') { e.stopPropagation(); hide(); }
  });
  sug.addEventListener('mousedown', function (e) { e.preventDefault(); });
  sug.addEventListener('click', function (e) { var b = e.target.closest('[data-o]'); if (b) choose(+b.getAttribute('data-o')); });

  function save(confirmed) {
    var errs = weaponDraftErrors(d); if (errs.length) { $('wbErr').textContent = errs.join(' '); return; }
    var g = sheetGear(sheetById(s.id) || s), prev = d.id ? g.customWeapons.filter(function (w) { return w.id === d.id; })[0] : null;
    // A weapon in use (body or packs) whose numbers change: ask first.
    if (prev && !confirmed && prev.equipId && gearWhere(g, prev.equipId).length) {
      var r = weaponDraftResult(d);
      if (r.cost !== prev.cost || r.weight !== prev.weight || r.attacks.some(function (a, i) { return !prev.attacks[i] || a.damage !== prev.attacks[i].damage; })) {
        d.impact = gearWhere(g, prev.equipId).join(' · '); renderSheetPage(); return;
      }
    }
    var btns = box.querySelectorAll('.btn'); btns.forEach(function (b) { b.disabled = true; });
    Ops.saveCustomWeapon(s, d).then(function (cw) {
      ui.weaponDraft = null;
      toast(prev ? 'Arma salva; a linha em Meus Itens foi atualizada.' : '“' + (gearOwnName(d.name) || cw.base.name) + '” adicionada a Meus Itens.');
      renderSheetPage();
    }, function (er) { btns.forEach(function (b) { b.disabled = false; }); $('wbErr').textContent = errorText(er); });
  }
  $('wbSave').onclick = function () { save(false); };
  var ap = $('wbApply'); if (ap) ap.onclick = function () { save(true); };
  var bk = $('wbBack'); if (bk) bk.onclick = function () { d.impact = null; renderSheetPage(); };
  $('wbCancel').onclick = function () { ui.weaponDraft = null; renderSheetPage(); };
}
