/* =====================================================================
   Hounds — Ficha › abas personalizadas
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* After Ficha, Equip. and Magia, tabs of one's own: each shows the sections chosen from those three
   (SHEET_BLOCKS), in the order dragged. A section is drawn by the same function as in its tab, and its
   wiring finds it there (the wire* functions look for it by id), so it works the same; a tab is drawn
   alone, so the same section can be in more than one. Like the order and the folding of the sections,
   the tabs are a way of seeing the sheet: kept in this browser, the same for every sheet
   (SHEET_CTABS_KEY: [{ id, name, blocks: [key] }]). ui.sheetTab is 'c:<id>' while one is open. */
var SHEET_CTABS_KEY = 'hounds_sheet_tabs';
// [key, tab it comes from, name]. Criar (Equip.) and Observações (Ficha) stay in their tabs only.
var SHEET_BLOCKS = [
  ['attrs', 'Ficha', 'Atributos'], ['skills', 'Ficha', 'Perícias'], ['combat', 'Ficha', 'Combate'], ['dmgdef', 'Ficha', 'Danos e Defesas'],
  ['advs', 'Ficha', 'Vantagens'], ['disadvs', 'Ficha', 'Desvantagens'], ['quirks', 'Ficha', 'Peculiaridades'],
  ['equip', 'Equip.', 'Meus Itens'], ['body', 'Equip.', 'Corpo'], ['packs', 'Equip.', 'Mochilas'], ['homes', 'Equip.', 'Casa'], ['load', 'Equip.', 'Carga'],
  ['spellFavs', 'Magia', 'Favoritos'], ['spells', 'Magia', 'Magias']];
var SHEET_BLOCK_IDX = {};
SHEET_BLOCKS.forEach(function (b) { SHEET_BLOCK_IDX[b[0]] = b; });

function customTabs() {
  var v; try { v = JSON.parse(lstore(SHEET_CTABS_KEY) || '[]'); } catch (e) { v = []; }
  return (Array.isArray(v) ? v : []).filter(function (t) { return t && t.id && t.name; }).map(function (t) {
    var seen = {};
    return { id: String(t.id), name: String(t.name).slice(0, 40), blocks: (Array.isArray(t.blocks) ? t.blocks : []).filter(function (k) { if (!SHEET_BLOCK_IDX[k] || seen[k]) return false; seen[k] = true; return true; }) };
  });
}
function saveCustomTabs(list) { lstore(SHEET_CTABS_KEY, JSON.stringify(list)); }
function customTabById(id) { return customTabs().filter(function (t) { return t.id === id; })[0] || null; }
function saveCustomTab(t) {
  var list = customTabs(), i = list.map(function (x) { return x.id; }).indexOf(t.id);
  if (i >= 0) list[i] = t; else list.push(t);
  saveCustomTabs(list);
}

// One section, drawn as in its own tab.
function sheetBlockHtml(s, key, can) {
  var ui = S.ui;
  if (key === 'attrs') return sheetAttrsHtml(s, ui.attrDraft || sheetAttrs(s), !!ui.attrDraft && can);
  if (key === 'skills') return sheetSkillsHtml(s, !!ui.skillDraft && can);
  if (key === 'combat') return sheetCombatHtml(s, !!ui.combatDraft && can);
  if (key === 'dmgdef') return sheetDmgDefHtml(s);
  if (key === 'advs') return sheetAdvsHtml(s, !!ui.advDraft && can);
  if (key === 'disadvs') return sheetDisadvsHtml(s, !!ui.disadvDraft && can);
  if (key === 'quirks') return sheetQuirksHtml(s, !!ui.quirkDraft && can);
  if (key === 'spellFavs' || key === 'spells') return spellBlockHtml(s, key, can);
  return '<div class="gear-tab">' + gearBlockHtml(s, key) + '</div>';
}

/* ---------- the tab ---------- */
function customTabHtml(s, t, can) {
  var editing = !!S.ui.attrDraft || sheetDraftOpen() || gearEditing();
  var add = ['Ficha', 'Equip.', 'Magia'].map(function (g) {
    var opts = SHEET_BLOCKS.filter(function (b) { return b[1] === g && t.blocks.indexOf(b[0]) < 0; });
    return opts.length ? '<optgroup label="' + g + '">' + opts.map(function (b) { return '<option value="' + b[0] + '">' + esc(b[2]) + '</option>'; }).join('') + '</optgroup>' : '';
  }).join('');
  // No title: the tab's name is already on its button, above.
  var head = '<div class="ctab-head"><div class="btn-row">' +
    (add ? '<select id="ctabAdd" aria-label="Adicionar seção a esta aba"><option value="">+ Adicionar seção…</option>' + add + '</select>' : '') +
    '<button class="btn ghost" type="button" id="ctabRename">' + svg(ICON.edit, 14) + 'Renomear</button>' +
    '<button class="btn danger" type="button" id="ctabDel">' + svg(ICON.trash, 14) + 'Excluir aba</button></div></div>';
  if (!t.blocks.length) {
    return '<div class="ctab">' + head + '<div class="empty-state">' + svg(ICON.sheet, 30, 1.6) + '<strong>Aba vazia</strong><span>Escolha em <b>Adicionar seção</b> o que esta aba mostra: ' +
      'qualquer seção da Ficha, do Equip. ou da Magia. Depois, arraste pela alça para pôr na ordem que quiser.</span></div></div>';
  }
  return '<div class="ctab">' + head + '<div class="sort-secs ctab-secs" id="ctabSecs">' + t.blocks.map(function (k) {
    var b = SHEET_BLOCK_IDX[k];
    return '<div class="sort-sec ctab-sec" data-key="' + k + '"><div class="ctab-sec-bar">' + (editing ? '' : secGripHtml(b[2])) +
      '<span class="ctab-from">' + esc(b[1] + ' › ' + b[2]) + '</span>' +
      '<button class="icon-btn" type="button" data-ctabdel="' + k + '" aria-label="Tirar ' + esc(b[2]) + ' desta aba" title="Tirar desta aba (continua em ' + esc(b[1]) + ')">' + svg(ICON.x, 14, 2.4) + '</button></div>' +
      sheetBlockHtml(s, k, can) + '</div>';
  }).join('') + '</div></div>';
}
function wireCustomTab(s, t) {
  if (!t || !$('ctabRename')) return;
  var ui = S.ui;
  var add = $('ctabAdd'); if (add) add.onchange = function () { if (!add.value) return; t.blocks.push(add.value); saveCustomTab(t); renderSheetPage(); };
  $('ctabRename').onclick = function () { openCustomTabForm(t); };
  $('ctabDel').onclick = function () {
    if (!confirm('Excluir a aba ' + t.name + '? As seções continuam nas abas Ficha, Equip. e Magia.')) return;
    saveCustomTabs(customTabs().filter(function (x) { return x.id !== t.id; }));
    ui.sheetTab = 'sheet'; renderSheetPage();
  };
  var box = $('ctabSecs'); if (!box) return;
  box.addEventListener('click', function (e) {
    var b = /** @type {AnyEl} */ (e.target).closest && /** @type {AnyEl} */ (e.target).closest('[data-ctabdel]'); if (!b) return;
    t.blocks = t.blocks.filter(function (k) { return k !== b.getAttribute('data-ctabdel'); }); saveCustomTab(t); renderSheetPage();
  });
  // Dragged by the handle of its bar (the sections' own handles are for their tabs, hidden here).
  if (box.querySelector('.ctab-sec-bar .sec-grip')) wireDragSort(box, { item: '.ctab-sec', grip: '.ctab-sec-bar .sec-grip', ph: 'sort-ph',
    start: function () { box.classList.add('sorting'); },
    end: function () { box.classList.remove('sorting'); },
    done: function (keys) { t.blocks = keys; saveCustomTab(t); } });
}
// A new tab (t null) or its name.
function openCustomTabForm(t) {
  var html = '<form id="ctabForm" novalidate><h2 id="ctabTitle">' + (t ? 'Renomear aba' : 'Nova aba') + '</h2>' +
    '<div class="field" id="f_ctabname"><label for="ctabname">Nome da aba</label><input type="text" id="ctabname" maxlength="40" autocomplete="off" placeholder="Ex.: Combate rápido, Mesa" value="' + esc(t ? t.name : '') + '"><div class="err" id="err_ctabname"></div></div>' +
    (t ? '' : '<p class="hint-text" style="margin:0">Depois de criada, escolha nela as seções da Ficha, do Equip. e da Magia, na ordem que quiser. As abas ficam neste navegador e valem para todas as fichas.</p>') +
    '<div class="btn-row" style="justify-content:flex-end"><button class="btn ghost" type="button" id="ctabCancel">Cancelar</button><button class="btn primary" type="submit">' + (t ? 'Salvar' : 'Criar aba') + '</button></div></form>';
  showModal(html);
  modal.setAttribute('aria-labelledby', 'ctabTitle');
  $('ctabCancel').onclick = function () { closeModal(); };
  $('ctabForm').onsubmit = function (e) {
    e.preventDefault();
    var n = $('ctabname').value.trim();
    if (!n) { $('err_ctabname').textContent = 'Dê um nome à aba.'; $('f_ctabname').classList.add('invalid'); $('ctabname').focus(); return; }
    if (t) { t.name = n; saveCustomTab(t); }
    else { var nt = { id: 'ct' + Date.now().toString(36), name: n, blocks: [] }; saveCustomTab(nt); S.ui.sheetTab = 'c:' + nt.id; }
    closeModal(true); // draws the page again
  };
}
