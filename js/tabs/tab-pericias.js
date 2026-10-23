/* =====================================================================
   Hounds — Aba Perícias (Regras › Perícias)
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   Perícias de GURPS
   Perícias do Basic Set, Martial Arts, Low-Tech, Power-Ups e outros:
   vêm de dados/pericias.json (veja "Catálogos de GURPS" em mundo.js);
   o banco guarda só o que o Mestre mudou.
   Permissão:
     - Jogador: apenas busca e visualização.
     - Mestre: criar, editar, excluir e alternar visibilidade.
   ===================================================================== */
ICON.skill = '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>';
function indexSkills() { var idx = /** @type {Record<string, Skill>} */ ({}); (W.skills || []).forEach(function (s) { idx[s.id] = s; }); W.skillIdx = idx; }
function skillById(id) { return (id && (W.skillIdx[id] || movedCatalogItem('skills', id))) || null; }
function skillHref(id) { return hrefFor('skill:' + id); }

// Values found in the list, for the filters and the form suggestions.
function skillValues(field) {
  var set = {};
  (W.skills || []).forEach(function (s) { if (s[field]) set[s[field]] = true; });
  return Object.keys(set).sort(function (a, b) { return a.localeCompare(b, 'pt'); });
}
var SKILL_CAT_ATTRS = ['ST', 'DX', 'IQ', 'HT', 'Will', 'Per'];
var SKILL_CAT_DIFFS = ['E', 'A', 'H', 'VH'];
var SKILL_CAT_LABELS = { E: 'Fácil', A: 'Média', H: 'Difícil', VH: 'Muito Difícil' };
var SKILL_CAT_NAMES = { E: 'Easy', A: 'Average', H: 'Hard', VH: 'Very Hard' };
// Badge colors reuse the ones of the spells and advantages (see paginas.css).
var SKILL_CAT_CLASSES = { E: 'adv-perk', A: 'adv-adv', H: 'diff-h', VH: 'diff-vh' };
// "IQ/H" for a skill with attribute and difficulty; book entries that only point to another
// page ("see Crewman, p. 185") are shown as Remissão.
function skillBadge(s) {
  if (s.attribute && s.difficulty) return '<span class="spell-badge ' + (SKILL_CAT_CLASSES[s.difficulty] || 'adv-ref') + '" title="' + esc(s.attribute + ' / ' + (SKILL_CAT_LABELS[s.difficulty] || s.difficulty)) + '">' + esc(s.attribute + '/' + s.difficulty) + '</span>';
  // A family whose skills differ in difficulty (Melee Weapon, DX/Varies).
  if (s.attribute) return '<span class="spell-badge adv-ref" title="A dificuldade varia conforme a perícia">' + esc(s.attribute) + '/var.</span>';
  return '<span class="spell-badge adv-ref">Remissão</span>';
}
function skillTags(s) { return [s.specialty ? 'Exige especialização' : '', s.cinematic ? 'Cinemática' : ''].filter(Boolean).join(' · '); }

Ops.saveSkill = function (skill, fields) {
  if (!isMestre()) return Promise.reject({ message: 'Apenas o Mestre pode criar ou editar perícias.' });
  var t = now(), attr = (fields.attribute || '').trim(), diff = (fields.difficulty || '').trim();
  // The type line follows the attribute and difficulty; without them, the entry keeps its own
  // (a book cross-reference like "see Crewman, p. 185"). A combat skill's starts with its group
  // ("Melee; DX/Average": the Combate list takes it, see isCombatSkill).
  var group = SKILL_COMBAT_GROUPS.some(function (g) { return g[0] === fields.combatGroup; }) ? fields.combatGroup : '';
  var type = attr && diff ? (group ? group + '; ' : '') + attr + '/' + (SKILL_CAT_NAMES[diff] || diff) : (skill && !skill.attribute ? skill.type || '' : '');
  return W.store.put('skills', skill ? skill.id : null, {
    v: 1,
    name: (fields.name || '').trim(),
    type: type,
    attribute: attr,
    difficulty: diff,
    specialty: !!fields.specialty,
    cinematic: !!fields.cinematic,
    defaults: (fields.defaults || '').trim(),
    prerequisites: (fields.prerequisites || '').trim(),
    description: (fields.description || '').trim(),
    modifiers: (fields.modifiers || '').trim(),
    book: (fields.book || '').trim(),
    page: (fields.page || '').trim(),
    visible: fields.visible !== false,
    sharedWith: fields.sharedWith || (skill && skill.sharedWith) || [],
    createdBy: owner(skill),
    createdAt: (skill && skill.createdAt) || t,
    updatedAt: t
  });
};
// A book skill is not removed from the file: its document says deleted: true.
Ops.deleteSkill = function (skill) {
  if (!isMestre()) return Promise.reject({ message: 'Apenas o Mestre pode excluir perícias.' });
  if (skill.catalog) return patchCatalogItem('skills', skill, { deleted: true, updatedAt: now() });
  return W.store.remove('skills', skill.id);
};
// Typing in the search waits a moment before redrawing the list.
var skillSearchTimer = 0;
var SKILL_SEARCH_FIELDS = ['name', 'type', 'defaults', 'description'];
// Search, filters and page of the list: kept while the site is open (see spellView).
var skillView = { q: '', mine: false, attr: '', diff: '', book: '', page: 1 };

/* =====================================================================
   Page: Perícias (list)
   ===================================================================== */
function renderSkillsPage() {
  loadCatalog('skills');
  var ui = skillView, can = isMestre();
  var attrs = skillValues('attribute'), books = skillValues('book');
  var diffs = SKILL_CAT_DIFFS.filter(function (d) { return (W.skills || []).some(function (s) { return s.difficulty === d; }); });
  var head = crumbsHtml('skills') +
    '<div class="head-row"><div><h1>' + svg(ICON.skill, 24, 2) + ' Perícias</h1>' +
    '<p class="lede">Perícias para GURPS 4ª Edição.</p></div>' +
    (can ? '<div class="btn-row">' +
      '<button class="btn primary" type="button" id="newSkillBtn">' + svg(ICON.plus, 16, 2.4) + 'Nova perícia</button></div>' : '') +
    '</div>';
  var toolbar = '<div class="toolbar" style="margin-bottom:16px">' +
    '<input class="search list-search" type="search" id="skillSearch" placeholder="Buscar por nome, padrão ou descrição…" value="' + esc(ui.q) + '" autocomplete="off" aria-label="Buscar perícias">' +
    '<div class="field" style="margin:0"><select id="skillAttrFilter" aria-label="Filtrar por atributo"><option value="">Todos os atributos</option>' +
    attrs.map(function (a) { return '<option value="' + esc(a) + '"' + (ui.attr === a ? ' selected' : '') + '>' + esc(a) + '</option>'; }).join('') + '</select></div>' +
    '<div class="field" style="margin:0"><select id="skillDiffFilter" aria-label="Filtrar por dificuldade"><option value="">Todas as dificuldades</option>' +
    diffs.map(function (d) { return '<option value="' + d + '"' + (ui.diff === d ? ' selected' : '') + '>' + esc(SKILL_CAT_LABELS[d]) + '</option>'; }).join('') + '</select></div>' +
    '<div class="field" style="margin:0"><select id="skillBookFilter" aria-label="Filtrar por livro"><option value="">Todos os livros</option>' +
    books.map(function (b) { return '<option value="' + esc(b) + '"' + (ui.book === b ? ' selected' : '') + '>' + esc(b) + '</option>'; }).join('') + '</select></div>' +
    mestreOnlyHtml(ui.mine) + '</div>';
  pageRoot.innerHTML = head + toolbar + notice() + '<div id="skillResults"></div>';

  var q = $('skillSearch'); if (q) q.oninput = function () { ui.q = q.value; ui.page = 1; clearTimeout(skillSearchTimer); skillSearchTimer = setTimeout(renderSkillList, 150); };
  var af = $('skillAttrFilter'); if (af) af.onchange = function () { ui.attr = af.value; ui.page = 1; renderSkillList(); };
  var df = $('skillDiffFilter'); if (df) df.onchange = function () { ui.diff = df.value; ui.page = 1; renderSkillList(); };
  var bf = $('skillBookFilter'); if (bf) bf.onchange = function () { ui.book = bf.value; ui.page = 1; renderSkillList(); };
  wireMestreOnly(ui, renderSkillList);
  var nb = $('newSkillBtn'); if (nb) nb.onclick = function () { openSkillForm(null); };
  renderSkillList();
}
function filterSkillList() {
  var ui = skillView;
  return searchCatalog((W.skills || []).filter(function (s) {
    if (ui.attr && s.attribute !== ui.attr) return false;
    if (ui.diff && s.difficulty !== ui.diff) return false;
    if (ui.book && s.book !== ui.book) return false;
    if (ui.mine && s.catalog) return false;
    return true;
  }), ui.q, function (s) { return searchText(s, SKILL_SEARCH_FIELDS); }); // in name order (mergeCatalog); with a search, the most alike first
}
function renderSkillList() {
  var el = $('skillResults'); if (!el) return;
  if (!W.loaded.skills) { el.innerHTML = '<p class="lede">Carregando perícias…</p>'; return; }
  var ui = skillView, all = filterSkillList(), pg = pageOf(all, ui.page);
  ui.page = pg.page;
  if (!all.length) {
    if (!(W.skills || []).length) {
      el.innerHTML = '<div class="empty-state">' + svg(ICON.skill, 34, 1.6) + '<strong>Nenhuma perícia cadastrada</strong>' +
        '<span>' + (CATALOG.skills.failed ? 'Não foi possível carregar a lista dos livros.' : isMestre() ? 'Crie uma com <b>Nova perícia</b>.' : 'As perícias vão aparecer aqui.') + '</span></div>';
      return;
    }
    el.innerHTML = '<p class="lede" style="padding:24px 0">Nenhuma perícia corresponde aos filtros aplicados.</p>';
    return;
  }
  el.innerHTML = '<div class="list-bar"><span class="meta">' + pageCountText(pg, all.length, 'perícia', 'perícias') + '</span>' + pagerHtml(pg) + '</div>' +
    '<div class="adv-grid">' + pg.items.map(function (s) {
      var tags = skillTags(s);
      return '<a class="spell-card adv-card" href="' + skillHref(s.id) + '">' +
        '<div class="adv-card-top"><strong>' + esc(s.name) + '</strong>' + skillBadge(s) + '</div>' +
        (s.attribute ? (s.defaults ? '<div class="adv-cost">Padrão: ' + esc(s.defaults) + '</div>' : '') : s.type ? '<div class="adv-cost">' + esc(s.type) + '</div>' : '') +
        (tags ? '<div class="adv-src">' + esc(tags) + '</div>' : '') +
        (s.description ? '<div class="adv-desc">' + esc(s.description) + '</div>' : '') +
        '<div class="adv-src">' + esc([s.book, s.page ? 'p. ' + s.page : ''].filter(Boolean).join(' · ')) + '</div></a>';
    }).join('') + '</div>' +
    (pg.pages > 1 ? '<div class="list-bar end">' + pagerHtml(pg) + '</div>' : '');
  wirePager(el, function (p) { ui.page = p; renderSkillList(); });
}

/* =====================================================================
   Page: single skill (and the same text in a modal, see openSkillModal)
   ===================================================================== */
function skillLede(s) { return s.attribute && s.difficulty ? s.attribute + ' / ' + (SKILL_CAT_LABELS[s.difficulty] || s.difficulty) : s.type || 'Tipo não informado'; }
// h: the heading tag of the sections (h3 inside the modal, whose h2 is the title).
function skillTextHtml(s, h) {
  h = h || 'h2';
  function sec(title, text, empty) {
    return '<section><' + h + ' class="sec-title">' + title + '</' + h + '>' + (text ? '<p class="long">' + esc(text) + '</p>' : '<p class="long none">' + empty + '</p>') + '</section>';
  }
  return sec('Descrição', s.description, 'Sem descrição cadastrada.') +
    (s.prerequisites ? sec('Pré-requisitos', s.prerequisites) : '') +
    (s.modifiers ? sec('Modificadores', s.modifiers) : '');
}
function skillFactsHtml(s) {
  function fact(label, v) { return '<dt>' + label + '</dt><dd>' + (v ? esc(v) : '<span class="none">—</span>') + '</dd>'; }
  return '<dl class="facts">' +
    fact('Atributo', s.attribute) +
    fact('Dificuldade', s.difficulty ? SKILL_CAT_LABELS[s.difficulty] || s.difficulty : '') +
    fact('Padrão', s.defaults) +
    (s.attribute ? '' : fact('Tipo', s.type)) +
    fact('Especialização', s.specialty ? 'Obrigatória' : 'Não') +
    fact('Cinemática', s.cinematic ? 'Sim' : 'Não') +
    fact('Livro', s.book) +
    fact('Página', s.page) +
    '</dl>';
}

// The rules of a skill in a modal, for links elsewhere (the sheets): <a href="#pericia~id"
// data-skill-modal="id">. A plain click opens the modal; Ctrl/middle click still opens the page.
function openSkillModal(id) {
  showModal('<div class="skill-modal" id="skillModal"><p class="lede">Carregando perícia…</p></div>');
  function paint() {
    var box = $('skillModal'); if (!box) return;
    var s = skillById(id);
    if (!s) { box.innerHTML = '<h2>Perícia não encontrada</h2><p class="lede">Essa perícia pode ter sido excluída ou ocultada.</p>'; return; }
    var tags = skillTags(s);
    // A sheet being edited would lose its draft on leaving the page: the page opens in another tab then.
    var away = S.ui && S.ui.skillDraft ? ' target="_blank" rel="noopener"' : '';
    box.innerHTML = '<div class="skill-modal-head"><div style="display:flex;align-items:center;gap:8px"><span class="badge">' + svg(ICON.skill, 12, 2.4) + ' Perícia</span>' + skillBadge(s) + '</div>' +
      '<h2 id="skillModalTitle">' + esc(s.name) + '</h2><p class="lede">' + esc(skillLede(s)) + (tags ? ' · ' + esc(tags) : '') + '</p></div>' +
      skillTextHtml(s, 'h3') + skillFactsHtml(s) +
      '<div class="btn-row" style="justify-content:flex-end"><a class="btn" href="' + skillHref(s.id) + '"' + away + ' id="skillModalPage">Abrir página da perícia</a></div>';
    modal.setAttribute('aria-labelledby', 'skillModalTitle');
    var pg = $('skillModalPage'); if (pg && !away) pg.onclick = function () { closeModal(); };
  }
  loadCatalog('skills').then(paint, paint);
}
document.addEventListener('click', function (e) {
  if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
  var t = /** @type {AnyEl} */ (e.target), a = t && t.closest && t.closest('[data-skill-modal]'); if (!a) return;
  e.preventDefault(); openSkillModal(a.getAttribute('data-skill-modal'));
});
// The same page opens under Perícias (#pericia~id) or under Combate (#pericia-combate~id, from the
// combat skills): the crumbs, the way back and where a deleted one leaves to follow the one it came from.
function renderSkillPage() {
  loadCatalog('skills');
  var s = skillById(S.route.skillId), ui = S.ui;
  var list = S.route.node.indexOf('cskill:') === 0 ? 'combat' : 'skills';
  if (!s) {
    pageRoot.innerHTML = crumbsHtml(list) + (W.loaded.skills
      ? '<h1>Perícia não encontrada</h1><p class="lede">Essa perícia pode ter sido excluída ou o link está incorreto.</p><div><a class="btn" href="' + hrefFor(list) + '">Voltar para ' + (list === 'combat' ? 'Combate' : 'Perícias') + '</a></div>'
      : '<p class="lede">Carregando perícia…</p>');
    return;
  }
  var can = isMestre(), tags = skillTags(s), lede = skillLede(s);
  var head = crumbsHtml(S.route.node) +
    '<div class="head-row"><div><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span class="badge">' + svg(ICON.skill, 12, 2.4) + ' Perícia</span>' + skillBadge(s) + '</div>' +
    '<h1>' + esc(s.name) + '</h1>' + ptNameHtml(s, 'p') + '<p class="lede">' + esc(lede) + (tags ? ' · ' + esc(tags) : '') + '</p></div>' +
    (can ? '<div class="btn-row">' + (s.catalog && rawHas('skills', s.id) ? '<button class="btn" type="button" id="restoreSkillBtn" title="Desfaz as alterações do Mestre nesta entrada">Restaurar original</button>' : '') + '<button class="btn" type="button" id="editSkillBtn">' + svg(ICON.edit, 15) + 'Editar perícia</button><button class="btn danger" type="button" id="delSkillBtn">' + svg(ICON.trash, 15) + 'Excluir</button></div>' : '') +
    '</div>' +
    (ui.confirmDelete ? '<div class="confirm" role="alert"><span>Excluir a perícia <b>' + esc(s.name) + '</b>? Não dá para desfazer.</span><div class="btn-row"><button class="btn danger solid" type="button" id="delSkillYes">Excluir perícia</button><button class="btn ghost" type="button" id="delSkillNo">Cancelar</button></div></div>' : '');
  // Open when the page opens; a click on its title closes it (see foldBox).
  var side = foldBox('params', 'Parâmetros', null, skillFactsHtml(s), true);
  var main = skillTextHtml(s);
  pageRoot.innerHTML = head + '<div class="loc-layout"><div class="side" style="gap:22px">' + main + '</div><div class="side">' + side + '</div></div>';
  wireFolds(pageRoot);
  if (!can) return;
  $('editSkillBtn').onclick = function () { openSkillForm(s); };
  $('delSkillBtn').onclick = function () { ui.confirmDelete = true; renderSkillPage(); };
  var dn = $('delSkillNo'); if (dn) dn.onclick = function () { ui.confirmDelete = false; renderSkillPage(); };
  var dy = $('delSkillYes'); if (dy) dy.onclick = function () {
    dy.disabled = true;
    Ops.deleteSkill(s).then(function () { toast('Perícia excluída.'); go(hrefFor(list), true); }, function (er) { dy.disabled = false; toast(errorText(er), true); });
  };
  var rb = $('restoreSkillBtn'); if (rb) rb.onclick = function () {
    rb.disabled = true;
    Ops.restoreCatalogItem('skills', s).then(function () { toast('Perícia restaurada como no livro.'); }, function (er) { rb.disabled = false; toast(errorText(er), true); });
  };
}

/* =====================================================================
   Form: skill (Mestre)
   ===================================================================== */
// The groups of the combat skills (the start of their type in the books); '' is a skill out of Combate's list.
var SKILL_COMBAT_GROUPS = [['', 'Não (perícia comum)'], ['Melee', 'Corpo a corpo'], ['Ranged', 'À distância'], ['General', 'Geral (combate)']];
function skillCombatGroup(s) { var m = /^(Melee|Ranged|General);/.exec((s && s.type) || ''); return m ? m[1] : ''; }
// how.combat: made from Regras › Combate (it starts as a combat skill, and its page opens there).
function openSkillForm(s, how) {
  if (!isMestre()) { toast('Apenas o Mestre pode criar ou editar perícias.', true); return; }
  var editing = !!s, inCombat = !!(how && how.combat), group = editing ? skillCombatGroup(s) : inCombat ? 'Melee' : '';
  function val(k) { return esc(editing ? s[k] || '' : ''); }
  function opts(list, cur, labels, none) {
    return '<option value="">' + none + '</option>' + list.map(function (x) { return '<option value="' + x + '"' + (cur === x ? ' selected' : '') + '>' + esc(labels ? labels[x] : x) + '</option>'; }).join('');
  }
  function check(id, on, label) { return '<label class="vis-flag" for="' + id + '"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + '><span><b>' + label + '</b></span></label>'; }
  var html = '<form id="skillForm" novalidate><h2 id="kfTitle">' + (editing ? 'Editar perícia' : 'Nova perícia') + '</h2>' +
    '<div class="field" id="f_kname"><label for="kname">Nome da perícia</label><input type="text" id="kname" maxlength="100" autocomplete="off" placeholder="Ex.: Acrobatics" value="' + val('name') + '"><div class="err" id="err_kname"></div></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
    '<div class="field"><label for="kattr">Atributo</label><select id="kattr">' + opts(SKILL_CAT_ATTRS, editing ? s.attribute : 'IQ', null, '—') + '</select></div>' +
    '<div class="field"><label for="kdiff">Dificuldade</label><select id="kdiff">' + opts(SKILL_CAT_DIFFS, editing ? s.difficulty : 'A', SKILL_CAT_LABELS, '—') + '</select></div></div>' +
    '<div class="field"><label for="kgroup">Perícia de combate</label><select id="kgroup">' + SKILL_COMBAT_GROUPS.map(function (g) { return '<option value="' + g[0] + '"' + (g[0] === group ? ' selected' : '') + '>' + g[1] + '</option>'; }).join('') + '</select>' +
    '<div class="hint-text" style="margin:4px 0 0">As de combate aparecem também em Regras › Combate.</div></div>' +
    '<div class="field"><label for="kdef">Padrão (default)</label><input type="text" id="kdef" maxlength="300" placeholder="Ex.: IQ-5 ou Merchant-3" value="' + val('defaults') + '"></div>' +
    '<div class="field"><label for="kpre">Pré-requisitos</label><input type="text" id="kpre" maxlength="300" placeholder="Ex.: Trained by a Master" value="' + val('prerequisites') + '"></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' + check('kspec', editing && s.specialty, 'Exige especialização') + check('kcine', editing && s.cinematic, 'Cinemática') + '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
    '<div class="field"><label for="kbook">Livro</label><input type="text" id="kbook" list="skillBookList" maxlength="100" placeholder="Ex.: GURPS Basic Set" value="' + val('book') + '">' +
    '<datalist id="skillBookList">' + skillValues('book').map(function (b) { return '<option value="' + esc(b) + '">'; }).join('') + '</datalist></div>' +
    '<div class="field"><label for="kpage">Página</label><input type="text" id="kpage" maxlength="30" placeholder="Ex.: B174, MA61" value="' + val('page') + '"></div></div>' +
    '<div class="field"><label for="kdesc">Descrição</label><textarea id="kdesc" rows="6" maxlength="20000" placeholder="O que a perícia faz, especializações…">' + val('description') + '</textarea></div>' +
    '<div class="field"><label for="kmod">Modificadores</label><textarea id="kmod" rows="3" maxlength="5000" placeholder="Bônus e penalidades comuns">' + val('modifiers') + '</textarea></div>' +
    flagHtml('kvis', s, true) +
    '<div class="form-err" id="kfErr" role="alert"></div>' +
    '<div class="btn-row" style="justify-content:flex-end"><button class="btn ghost" type="button" id="kfCancel">Cancelar</button><button class="btn primary" type="submit" id="kfSave">' + (editing ? 'Salvar perícia' : 'Criar perícia') + '</button></div></form>';
  showModal(html);
  modal.setAttribute('aria-labelledby', 'kfTitle');
  var name = $('kname');
  name.addEventListener('input', function () { if (name.value.trim()) { $('err_kname').textContent = ''; $('f_kname').classList.remove('invalid'); } });
  $('kfCancel').onclick = function () { closeModal(); };
  $('skillForm').onsubmit = function (e) {
    e.preventDefault();
    if (modalOpen.busy) return;
    var n = name.value.trim();
    if (!n) { $('err_kname').textContent = 'Informe o nome da perícia.'; $('f_kname').classList.add('invalid'); name.focus(); return; }
    modalOpen.busy = true;
    var btn = $('kfSave'); btn.disabled = true; btn.textContent = 'Salvando…'; $('kfCancel').disabled = true; $('kfErr').textContent = '';
    Ops.saveSkill(s, { name: n, attribute: $('kattr').value, difficulty: $('kdiff').value, combatGroup: $('kgroup').value, defaults: $('kdef').value, prerequisites: $('kpre').value,
      specialty: $('kspec').checked, cinematic: $('kcine').checked, book: $('kbook').value, page: $('kpage').value,
      description: $('kdesc').value, modifiers: $('kmod').value,
      visible: flagVal('kvis', s), sharedWith: shareVal('kvis', s) }).then(function (id) {
      closeModal(true);
      toast(editing ? 'Perícia salva.' : 'Perícia criada.');
      if (!editing) go(inCombat && $('kgroup').value ? combatSkillHref(id) : skillHref(id));
    }, function (er) {
      if (!modalOpen) return;
      modalOpen.busy = false; btn.disabled = false; btn.textContent = editing ? 'Salvar perícia' : 'Criar perícia'; $('kfCancel').disabled = false;
      $('kfErr').textContent = errorText(er);
    });
  };
}
