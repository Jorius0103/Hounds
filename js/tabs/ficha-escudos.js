/* =====================================================================
   Hounds — Ficha › Equip. › Criar Escudo
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html (depois de ficha-armas.js).
   ===================================================================== */
'use strict';

/* A shield or cloak of Mundo › Armaduras (type Shield), or one of the player's, with adjustments (as in
   Criar Arma), added to Meus Itens as an armor line that is carried (Corpo › Armas e itens).
   sheet.customShields = [{ id, baseId, base: { name, tl, db, dr, hp, cost, weight, skill, defaults },
       description, mods: [{ name, spellId?, db, dr, nh, cost, weightPct }], db, dr, hp, cost, weight, equipId }]
     base: the shield as it was when made (or typed: baseId null); mods: the adjustments, each adding
     to (or, negative, taking from) the BD and the RD, the NH with it (on top of the sheet's skill,
     which does not change: weaponNh), the cost ($) and the weight (%); db, dr, hp, cost, weight: the
     results (shieldCalc); equipId: the line of Meus Itens that is the shield. */

/* ---------- the calculation ---------- */
function cleanShieldAdj(m) {
  m = m || {};
  var o = { name: String(m.name || '').trim().slice(0, 120), db: cleanInt(m.db, -10, 10, 0), dr: cleanInt(m.dr, -50, 50, 0), nh: cleanInt(m.nh, -20, 20, 0),
    cost: abNum(m.cost, -9999999, 9999999) || 0, weightPct: abNum(m.weightPct, -100, 1000) || 0 };
  o.cost = Math.round(o.cost * 100) / 100; o.weightPct = Math.round(o.weightPct * 100) / 100;
  var sp = gearId(m.spellId, 200); if (sp) o.spellId = sp;
  return cleanAdjCf(o, m);
}
function shieldAdjTotal(mods) {
  var t = { db: 0, dr: 0, nh: 0, cost: 0, cf: 0, weightPct: 0 };
  mods.forEach(function (m) { t.db += m.db || 0; t.dr += m.dr || 0; t.nh += m.nh || 0; t.cost += m.cost || 0; t.cf += m.cf || 0; t.weightPct += m.weightPct || 0; });
  t.cost = eqRound(t.cost); t.cf = eqRound(t.cf); t.weightPct = eqRound(t.weightPct);
  return t;
}
// "Fortify (BD +1, RD +2, NH +1, +$300, peso −10%)".
function shieldAdjText(m) {
  function sg(n) { return n < 0 ? '−' : '+'; }
  var parts = [m.db ? 'BD ' + sg(m.db) + Math.abs(m.db) : '', m.dr ? 'RD ' + sg(m.dr) + Math.abs(m.dr) : '', m.nh ? 'NH ' + sg(m.nh) + Math.abs(m.nh) : '',
    m.cost ? sg(m.cost) + eqMoney(Math.abs(m.cost)) : '', adjCfText(m), m.weightPct ? 'peso ' + sg(m.weightPct) + eqNum(Math.abs(m.weightPct)) + '%' : ''].filter(Boolean);
  return m.name + (parts.length ? ' (' + parts.join(', ') + ')' : '');
}
// The shield with its adjustments: BD (a number; one that is not stays) and RD plus theirs; PV as is;
// the cost times (1 + the CFs added up), plus their $; the weight times (1 + their % / 100). Never below 0.
function shieldCalc(base, mods) {
  var t = shieldAdjTotal(mods), db = /^\s*\d+\s*$/.test(String(base.db)) ? String(Math.max(0, +base.db + t.db)) : String(base.db || '');
  return { db: db, dr: drAdd(base.dr, t.dr), hp: String(base.hp || ''), cost: Math.max(0, eqRound(cfCost(base.cost, t.cf) + t.cost)), weight: Math.max(0, eqRound(base.weight * (1 + t.weightPct / 100))), nh: t.nh };
}
var SHIELD_ADJ = { p: 'sb', kind: 'Escudo', nums: [['db', 'BD', '1'], ['dr', 'RD', '1'], ['nh', 'NH', '1'], ['cost', 'Custo ($)', 'any'], ['cf', 'CF', 'any'], ['weightPct', 'Peso (%)', 'any']], blank: { name: '', db: 0, dr: 0, nh: 0, cost: 0, cf: 0, weightPct: 0 },
  clean: function (m) { return cleanShieldAdj(m); }, total: function (l) { return shieldAdjTotal(l); }, text: function (m) { return shieldAdjText(m); },
  hint: 'Escreva o ajuste ou busque um melhoramento ou uma magia. Ex.: Fine, Dwarven, Fortify',
  help: 'Cada ajuste soma (ou, negativo, tira): o BD e a RD do escudo, o NH com ele (somado ao NH da perícia na ficha; a perícia não muda), o custo em $, o CF (fator de custo: o custo do escudo vezes 1 + a soma dos CF, B274) e o peso em % do peso do escudo. ' +
    'Um melhoramento de Mundo › Melhoramentos já vem com o que a regra dele diz (CF, peso e, quando a descrição dá, NH). Com vários ajustes, os valores se somam.' };

/* ---------- data of the sheet ---------- */
function cleanShieldBase(b) {
  b = b || {};
  return { name: String(b.name || '').trim().slice(0, 120) || '—', tl: String(b.tl || '').slice(0, 20), db: String(b.db == null ? '' : b.db).slice(0, 20), dr: String(b.dr == null ? '' : b.dr).slice(0, 40),
    hp: String(b.hp == null ? '' : b.hp).slice(0, 20), cost: cleanDec(b.cost, 9999999, 0), weight: cleanDec(b.weight, 99999, 0),
    skill: String(b.skill || 'Shield').slice(0, 60), defaults: String(b.defaults || '').slice(0, 300) };
}
function cleanCustomShield(w, i, by) {
  w = w || {};
  return { id: gearId(w.id) || 'h' + (i + 1), baseId: gearId(w.baseId, 200) || null, base: cleanShieldBase(w.base), description: String(w.description || '').trim().slice(0, 2000),
    mods: (Array.isArray(w.mods) ? w.mods : []).map(cleanShieldAdj).filter(function (m) { return m.name; }),
    db: String(w.db == null ? '' : w.db).slice(0, 20), dr: String(w.dr == null ? '' : w.dr).slice(0, 40), hp: String(w.hp == null ? '' : w.hp).slice(0, 20),
    cost: cleanDec(w.cost, 9999999, 0), weight: cleanDec(w.weight, 99999, 0), equipId: w.equipId && by[w.equipId] ? w.equipId : null };
}
function shieldBases() { return (W.armors || []).filter(function (a) { return a.type === 'Shield'; }); }
// The book's shield; a Cloak is used with Cloak, the others with Shield (their defaults when the table gives none).
function shieldBaseOf(a) {
  var skill = a.skill || (/cloak/i.test(a.name) ? 'Cloak' : 'Shield');
  return cleanShieldBase({ name: a.name, tl: a.tl, db: a.db, dr: a.dr, hp: a.hp, cost: catNum(a.cost) || 0, weight: catNum(a.weight) || 0, skill: skill,
    defaults: a.defaults || (skill === 'Cloak' ? 'DX-5, Net-4, or Shield-4' : 'DX-4') });
}
function shieldDraftMods(d) { return d.adj.map(cleanShieldAdj).filter(function (m) { return m.name; }); }
function shieldDraftErrors(d) {
  var out = [];
  if (!d.base) out.push('Escolha o escudo (ou digite um nome e use-o como escudo personalizado).');
  else if (!String(d.base.name || '').trim()) out.push('Dê um nome ao escudo.');
  if (d.adj.some(function (m) { var c = cleanShieldAdj(m); return !c.name && (c.db || c.dr || c.nh || c.cost || c.cf || c.weightPct); })) out.push('Dê um nome a cada ajuste com valores.');
  return out;
}
function shieldNotes(d) {
  var c = d.baseId ? armorById(d.baseId) : null;
  return [String(d.description || '').trim(), c && c.footnotes ? String(c.footnotes).replace(/\s*\n\s*/g, ' ').trim() : ''].filter(Boolean).join(' ').slice(0, 400);
}
// Saves the shield and its line in Meus Itens in one write; an edited one keeps its line.
Ops.saveCustomShield = function (s, d) {
  if (!rawHas('sheets', s.id)) return Promise.reject({ message: 'Essa ficha não existe mais.' });
  var errs = shieldDraftErrors(d); if (errs.length) return Promise.reject({ message: errs.join(' ') });
  var g = sheetGear(sheetById(s.id) || s), prev = d.id ? g.customShields.filter(function (w) { return w.id === d.id; })[0] || null : null;
  var mods = shieldDraftMods(d), r = shieldCalc(d.base, mods), equip = g.equip.slice(), lines = gearIndex(equip);
  var cw = { id: prev ? prev.id : gearNewId('h', gearIndex(g.customShields)), baseId: d.baseId, base: cleanShieldBase(d.base), description: String(d.description || '').trim(),
    mods: mods, db: r.db, dr: r.dr, hp: r.hp, cost: r.cost, weight: r.weight, equipId: null };
  var fields = { kind: 'armor', name: gearOwnName(d.name) || cw.base.name, qty: 1, weight: r.weight, cost: r.cost }, line = prev && prev.equipId ? lines[prev.equipId] : null;
  if (line) { line = Object.assign({}, line, fields); delete line.refId; equip[equip.indexOf(lines[line.id])] = line; }
  else { line = Object.assign({ id: gearNewId('e', lines), notes: shieldNotes(d) }, fields); equip.push(line); }
  cw.equipId = line.id;
  var list = prev ? g.customShields.map(function (w) { return w.id === cw.id ? cw : w; }) : g.customShields.concat([cw]);
  return saveGearLists(s, { equip: equip, customShields: list }).then(function () { return cw; });
};
Ops.deleteCustomShield = function (s, id) {
  var g = sheetGear(sheetById(s.id) || s), cw = g.customShields.filter(function (w) { return w.id === id; })[0];
  if (!cw) return Promise.resolve();
  var ch = { customShields: g.customShields.filter(function (w) { return w.id !== id; }) };
  if (cw.equipId) ch.equip = g.equip.filter(function (e) { return e.id !== cw.equipId; });
  return saveGearLists(s, ch);
};

/* ---------- view ---------- */
function shieldBaseBoxHtml(s, d) {
  if (!d.base) return '<p class="hint-text" style="margin:0">Escolha o escudo ou a capa em Mundo › Armaduras. Um nome que não está no catálogo vira um escudo personalizado.</p>';
  var b = d.base, r = shieldCalc(b, shieldDraftMods(d)), nh = weaponNh(s, { skill: b.skill, defaults: b.defaults }, r.nh);
  if (d.custom) {
    function field(label, input, note) { return '<div class="gstat"><span>' + label + '</span>' + input + (note ? '<small>' + note + '</small>' : '') + '</div>'; }
    function inp(k, type, label, ph) { return '<input type="' + type + '" data-sh-base="' + k + '"' + (type === 'number' ? ' min="0" step="any" inputmode="decimal"' : ' maxlength="60"') + ' placeholder="' + (ph || '—') + '" aria-label="' + label + '" value="' + esc(b[k] === 0 && type === 'number' ? '' : b[k]) + '">'; }
    return '<p class="hint-text" style="margin:0"><b>Escudo personalizado</b>: não está em Mundo › Armaduras. Preencha os valores.</p>' +
      '<div class="gurps-derived ab-custom">' + field('Nome', inp('name', 'text', 'Nome do escudo')) + field('BD', inp('db', 'text', 'BD', 'Ex.: 2')) + field('RD', inp('dr', 'text', 'RD', 'Ex.: 7')) +
      field('PV', inp('hp', 'text', 'PV', 'Ex.: 40')) + field('Custo ($)', inp('cost', 'number', 'Custo')) + field('Peso (lbs)', inp('weight', 'number', 'Peso')) +
      field('TL', inp('tl', 'text', 'TL', 'Ex.: 1')) + field('Perícia', inp('skill', 'text', 'Perícia', 'Shield')) + '</div>' +
      '<div class="gurps-derived" id="sbResult">' + shieldResultHtml(b, r, nh) + '</div>';
  }
  var cat = d.baseId ? armorById(d.baseId) : null;
  return '<div class="gurps-derived">' + gearStat('Escudo', esc(b.name), cat ? ptNameHtml(cat) || esc(cat.page || '') : 'como gravado') + gearStat('TL', esc(b.tl || '—'), '') + '</div>' +
    '<div class="gurps-derived" id="sbResult">' + shieldResultHtml(b, r, nh) + '</div>' +
    (cat && cat.footnotes ? '<p class="hint-text" style="margin:0"><b>Notas:</b> ' + esc(String(cat.footnotes).replace(/\s*\n\s*/g, ' ')) + ' <span>(vão para as Notas em Meus Itens)</span></p>' : '');
}
function shieldResultHtml(b, r, nh) {
  function was(now, then) { return now !== then ? 'livro: ' + esc(then || '—') : ''; }
  return gearStat('BD', esc(r.db || '—'), was(r.db, b.db)) + gearStat('RD', esc(r.dr || '—'), was(r.dr, b.dr)) + gearStat('PV', esc(r.hp || '—'), '') +
    gearStat('Custo', esc(eqMoney(r.cost)), r.cost !== b.cost ? 'livro: ' + esc(eqMoney(b.cost)) : '') + gearStat('Peso', esc(eqLbs(r.weight)), r.weight !== b.weight ? 'livro: ' + esc(eqLbs(b.weight)) : '') +
    gearStat('NH (' + esc(b.skill || 'Shield') + ')', nh ? String(nh.v) : '—', nh ? esc(nh.title) : 'a ficha não tem a perícia');
}
function shieldBuilderHtml(s, d) {
  return '<div class="box sk-edit"><div class="ab-grid">' +
    '<label class="sc-f"><span>Escudo</span><div class="sk-pick"><input type="text" id="sbBase" maxlength="120" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="sbBaseSug"' +
    ' placeholder="' + (W.loaded.armors ? 'Digite para buscar. Ex.: escudo médio, Medium Shield, capa' : 'Carregando escudos…') + '" value="' + esc(d.base ? d.base.name : '') + '"><div class="suggest" id="sbBaseSug" role="listbox" hidden></div></div></label>' +
    gearNameFieldHtml('sbName', d.name, d.base ? d.base.name : '') +
    '<label class="sc-f ab-wide"><span>Descrição</span><textarea id="sbDesc" rows="2" maxlength="2000" placeholder="Opcional">' + esc(d.description) + '</textarea></label></div>' +
    '<p class="hint-text" style="margin:0">Ficha <b>' + esc(s.name) + '</b>: o escudo entra em Meus Itens com o <b>Nome</b> dado (ou, sem ele, com o nome do escudo) e vai no Corpo com as armas.' + (d.id ? ' Editando: ele mantém a linha na lista (e onde está no Corpo e nas Mochilas).' : '') + '</p>' +
    '<div id="sbBaseBox">' + shieldBaseBoxHtml(s, d) + '</div></div>' +
    '<div class="box sk-edit" id="sbModsBox"' + (d.base ? '' : ' hidden') + '><h3 class="sec-title" style="margin:0">Ajustes</h3><div class="ab-mods" id="sbMods">' + adjListHtml(SHIELD_ADJ, d.adj) + '</div></div>' +
    (d.impact ? '<div class="confirm" role="alert"><span>Este escudo está em uso (' + esc(d.impact) + '), e salvar muda os valores dele.</span><div class="btn-row">' +
      '<button class="btn danger solid" type="button" id="sbApply">Salvar mesmo assim</button><button class="btn ghost" type="button" id="sbBack">Voltar</button></div></div>' : '') +
    '<div class="form-err" id="sbErr" role="alert"></div>' +
    '<div class="btn-row" style="justify-content:flex-end"><button class="btn ghost" type="button" id="sbCancel">Cancelar</button>' +
    '<button class="btn primary" type="button" id="sbSave">' + (d.id ? 'Salvar alterações' : 'Criar escudo e adicionar aos itens') + '</button></div>';
}
function sheetShieldHtml(s, g) {
  var ui = S.ui, can = canWrite(), d = can ? ui.shieldDraft : null, n = g.customShields.length;
  var head = '<div class="gurps-head"><h2 class="sec-title">Criar Escudo</h2>' + (n ? '<span class="gurps-total">' + plural(n, 'escudo', 'escudos') + '</span>' : '') +
    (!d ? '<div class="btn-row">' + (can && !gearEditing() ? '<button class="btn primary" type="button" id="sbNew">' + svg(ICON.plus, 15, 2.4) + 'Criar escudo</button>' : '') + '</div>' : '') + '</div>';
  if (d) return '<section class="gurps" id="shieldSec">' + head + shieldBuilderHtml(s, d) + '</section>';
  return gearCreateTile('shieldSec', 'sbNew', ICON.armor, 'Escudo', n ? plural(n, 'escudo', 'escudos') : '', 'Escudo ou capa, com ajustes');
}
// The shields of Criar Escudo in Meus Itens: Escudo | BD | RD | PV | NH | Custo | Peso | Ajustes.
function shieldItemsHtml(lines, g, L, can) {
  var ui = S.ui, weight = 0, s = sheetById(S.route && S.route.sheetId);
  var rows = lines.map(function (x) {
    var cw = g.shieldLines[x.id], counted = L.counted[x.id] || 0, where = gearWhere(g, x.id), adj = cw.mods.length ? cw.mods.map(shieldAdjText).join('; ') : '';
    var nh = weaponNh(s, { skill: cw.base.skill, defaults: cw.base.defaults }, shieldAdjTotal(cw.mods).nh);
    weight += x.qty * x.weight;
    var html = '<tr' + (counted ? '' : ' class="eq-stored"') + '><td class="wb-name"><b>' + gearKindTag('armor') + esc(x.name) + '</b>' + gearAutoSub(x, cw.base.name) + '<small class="eq-where">' +
      esc(where.length ? where.join(' · ') + ' · ' + (counted ? 'na carga' : 'fora da carga') : 'Só na lista · fora da carga') + '</small></td>' +
      '<td class="gval">' + esc(cw.db || '—') + '</td><td class="gval">' + esc(cw.dr || '—') + '</td><td>' + esc(cw.hp || '—') + '</td>' +
      (nh ? '<td class="gval" title="' + esc(nh.title) + '">' + nh.v + '</td>' : '<td><span class="eq-none">—</span></td>') +
      '<td>' + esc(eqLbs(x.weight)) + '</td><td class="ab-txt">' + (adj ? esc(adj) : '<span class="eq-none">—</span>') + '</td>' +
      (can ? '<td class="ab-acts"><button class="icon-btn" type="button" data-sb-edit="' + esc(cw.id) + '" aria-label="Editar ' + esc(x.name) + '" title="Editar">' + svg(ICON.edit, 15) + '</button>' +
        '<button class="icon-btn" type="button" data-sb-copy="' + esc(cw.id) + '" aria-label="Outro igual" title="Outro escudo igual, com os mesmos ajustes">' + svg(ICON.plus, 15, 2.4) + '</button>' +
        '<button class="icon-btn" type="button" data-sb-del="' + esc(cw.id) + '" aria-label="Excluir ' + esc(x.name) + '" title="Excluir">' + svg(ICON.trash, 15) + '</button></td>' : '') + '</tr>';
    if (can && ui.shieldDel === cw.id) {
      html += '<tr><td colspan="8"><div class="confirm" role="alert"><span>Excluir <b>' + esc(x.name) + '</b>?' + (where.length ? ' Em uso: ' + esc(where.join(' · ')) + '. Excluir tira de lá também.' : '') + '</span>' +
        '<div class="btn-row"><button class="btn danger solid" type="button" data-sb-delall="' + esc(cw.id) + '">Excluir</button>' +
        '<button class="btn ghost" type="button" data-sb-delno="1">Cancelar</button></div></div></td></tr>';
    }
    return html;
  }).join('');
  return '<div class="wtab-wrap"><table class="gtab ab-items wb-items sb-items"><thead><tr><th>Escudo</th><th>BD</th><th>RD</th><th>PV</th><th>NH</th><th>Peso</th><th>Ajustes</th>' + (can ? '<th></th>' : '') + '</tr></thead><tbody>' + rows + '</tbody>' +
    '<tfoot><tr><td class="wb-name" colspan="5">' + plural(lines.length, 'escudo', 'escudos') + '</td><td>' + esc(eqLbs(eqRound(weight))) + '</td><td colspan="' + (can ? 2 : 1) + '"></td></tr></tfoot></table></div>';
}

/* ---------- wiring ---------- */
// g: the sheet's lists, for the name of the shield being edited (its line's, when it was given).
function shieldDraftFrom(cw, mode, g) {
  var d = { id: null, baseId: null, base: null, custom: false, name: '', description: '', adj: [], impact: null };
  if (!cw) return d;
  d.baseId = cw.baseId; d.base = Object.assign({}, cw.base); d.custom = !cw.baseId; d.description = cw.description;
  d.adj = cw.mods.map(function (m) { return Object.assign({}, m); });
  if (mode === 'edit') { d.id = cw.id; if (g && cw.equipId) d.name = gearGivenName(gearIndex(g.equip)[cw.equipId], cw.base.name); }
  return d;
}
function wireShieldSec(s) {
  var ui = S.ui, box = $('shieldSec'); if (!box) return;
  var nb = $('sbNew'); if (nb) nb.onclick = function () { ui.shieldDraft = shieldDraftFrom(null); loadCatalog('armors'); renderSheetPage(); var n = $('sbBase'); if (n) n.focus(); };
  var d = ui.shieldDraft;
  if (!d) {
    var items = $('equip'); if (!items) return;
    items.addEventListener('click', function (e) {
      var t = /** @type {AnyEl} */ (e.target), b = t.closest && t.closest('[data-sb-edit], [data-sb-copy], [data-sb-del], [data-sb-delall], [data-sb-delno]'); if (!b) return;
      var g = sheetGear(s), find = function (attr) { var id = b.getAttribute(attr); return g.customShields.filter(function (w) { return w.id === id; })[0]; };
      if (b.hasAttribute('data-sb-edit') || b.hasAttribute('data-sb-copy')) {
        var edit = b.hasAttribute('data-sb-edit');
        ui.shieldDraft = shieldDraftFrom(find(edit ? 'data-sb-edit' : 'data-sb-copy'), edit ? 'edit' : 'copy', g); loadCatalog('armors'); renderSheetPage();
        var sec = $('shieldSec'); if (sec) sec.scrollIntoView({ block: 'start' });
        return;
      }
      if (b.hasAttribute('data-sb-del')) { ui.shieldDel = b.getAttribute('data-sb-del'); renderSheetPage(); return; }
      if (b.hasAttribute('data-sb-delno')) { ui.shieldDel = null; renderSheetPage(); return; }
      var cw = find('data-sb-delall');
      b.disabled = true;
      Ops.deleteCustomShield(s, cw.id).then(function () { ui.shieldDel = null; toast('Escudo excluído.'); renderSheetPage(); },
        function (er) { b.disabled = false; toast(errorText(er), true); });
    });
    return;
  }
  // The values follow the adjustments and the custom fields; the rows being typed in stay.
  function paintResult() {
    var r = shieldCalc(d.base, shieldDraftMods(d)), el = $('sbResult');
    if (el) el.innerHTML = shieldResultHtml(d.base, r, weaponNh(s, { skill: d.base.skill, defaults: d.base.defaults }, r.nh));
    $('sbErr').textContent = '';
    var c = box.querySelector('.confirm'); if (c) c.remove(); d.impact = null;
  }
  function namePh() { $('sbName').setAttribute('placeholder', gearAutoHint(d.base ? d.base.name : '')); }
  $('sbName').addEventListener('input', function () { d.name = $('sbName').value; });
  $('sbDesc').addEventListener('input', function () { d.description = $('sbDesc').value; });
  box.addEventListener('input', function (e) {
    var t = /** @type {AnyEl} */ (e.target), k = t.getAttribute && t.getAttribute('data-sh-base'); if (!k || !d.base) return;
    if (k === 'cost' || k === 'weight') d.base[k] = t.value === '' ? 0 : cleanDec(t.value, k === 'cost' ? 9999999 : 99999, 0);
    else d.base[k] = String(t.value).slice(0, k === 'name' ? 120 : 60);
    if (k === 'name') { pick.value = d.base.name; namePh(); }
    paintResult();
  });
  wireAdjList(SHIELD_ADJ, $('sbMods'), d.adj, paintResult, function () { return { weight: d.base ? d.base.weight : 0, ranged: false }; });
  // The shield: Mundo › Armaduras (type Shield), by name in English or Portuguese; a name the catalog
  // does not have (exactly) is offered as a custom one, at the end.
  var pick = $('sbBase'), sug = $('sbBaseSug'), opts = [], act = 0;
  function hide() { sug.hidden = true; sug.innerHTML = ''; pick.setAttribute('aria-expanded', 'false'); }
  function show() {
    var q = pick.value, typed = String(q || '').trim(), all = shieldBases(), same = d.base && q === d.base.name;
    opts = same ? all : typed ? searchCatalog(all, q, null).slice(0, 12) : all;
    if (typed && !same && !all.some(function (a) { return norm(a.name) === norm(typed); })) opts = opts.concat([{ custom: true, name: typed }]);
    act = Math.min(act, Math.max(0, opts.length - 1));
    if (!opts.length) { hide(); return; }
    sug.innerHTML = opts.map(function (a, n) {
      if (a.custom) return '<button type="button" role="option" data-o="' + n + '" class="ab-custom-opt' + (n === act ? ' act' : '') + '" aria-selected="' + (n === act) + '"><span>' + svg(ICON.plus, 13, 2.4) + 'Usar “' + esc(a.name) + '” como escudo personalizado</span><small>preencha BD, RD, PV, custo, peso</small></button>';
      return '<button type="button" role="option" data-o="' + n + '" class="' + (n === act ? 'act' : '') + '" aria-selected="' + (n === act) + '"><span>' + esc(a.name) + ptNameHtml(a) + '</span>' +
        '<small>' + esc(['BD ' + (a.db || '—'), 'RD ' + (a.dr || '—'), a.hp ? 'PV ' + a.hp : '', a.cost, a.weight ? a.weight + ' lb' : '', a.tl ? 'TL ' + a.tl : '', a.page].filter(Boolean).join(' · ')) + '</small></button>';
    }).join('');
    sug.hidden = false; pick.setAttribute('aria-expanded', 'true');
    var on = sug.querySelector('.act'); if (on) on.scrollIntoView({ block: 'nearest' });
  }
  function choose(n) {
    var a = opts[n]; if (!a) return;
    if (a.custom) { d.custom = true; d.baseId = null; d.base = cleanShieldBase({ name: a.name, skill: 'Shield', defaults: 'DX-4' }); }
    else { d.custom = false; d.baseId = a.id; d.base = shieldBaseOf(a); }
    pick.value = d.base.name; hide(); namePh();
    $('sbBaseBox').innerHTML = shieldBaseBoxHtml(s, d); $('sbModsBox').hidden = false; $('sbErr').textContent = '';
    if (a.custom) { var f = box.querySelector('[data-sh-base="db"]'); if (f instanceof HTMLElement) f.focus(); }
  }
  pick.addEventListener('input', function () { act = 0; show(); });
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

  function save(confirmed) {
    var errs = shieldDraftErrors(d); if (errs.length) { $('sbErr').textContent = errs.join(' '); return; }
    var g = sheetGear(sheetById(s.id) || s), prev = d.id ? g.customShields.filter(function (w) { return w.id === d.id; })[0] : null;
    if (prev && !confirmed && prev.equipId && gearWhere(g, prev.equipId).length) {
      var r = shieldCalc(d.base, shieldDraftMods(d));
      if (r.cost !== prev.cost || r.weight !== prev.weight || r.db !== prev.db || r.dr !== prev.dr) { d.impact = gearWhere(g, prev.equipId).join(' · '); renderSheetPage(); return; }
    }
    var btns = box.querySelectorAll('.btn'); btns.forEach(function (b) { b.disabled = true; });
    Ops.saveCustomShield(s, d).then(function (cw) {
      ui.shieldDraft = null;
      toast(prev ? 'Escudo salvo; a linha em Meus Itens foi atualizada.' : '“' + (gearOwnName(d.name) || cw.base.name) + '” adicionado a Meus Itens.');
      renderSheetPage();
    }, function (er) { btns.forEach(function (b) { b.disabled = false; }); $('sbErr').textContent = errorText(er); });
  }
  $('sbSave').onclick = function () { save(false); };
  var ap = $('sbApply'); if (ap) ap.onclick = function () { save(true); };
  var bk = $('sbBack'); if (bk) bk.onclick = function () { d.impact = null; renderSheetPage(); };
  $('sbCancel').onclick = function () { ui.shieldDraft = null; renderSheetPage(); };
}
