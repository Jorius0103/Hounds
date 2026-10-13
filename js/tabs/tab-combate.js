/* =====================================================================
   Hounds — Aba Combate (Mundo › Combate): perícias de combate, técnicas e estilos
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   Combate de GURPS
   Três listas na mesma página:
     - Perícias de combate: as entradas de Mundo › Perícias (dados/pericias.json)
       que são de armas, combate desarmado e luta (COMBAT_SKILLS), mais as de
       imbuement (tipo "Melee; DX/Very Hard"). Abrem em modal (openSkillModal).
     - Técnicas: vêm de dados/tecnicas.json (veja "Catálogos de GURPS" em
       mundo.js); o banco guarda só o que o Mestre mudou.
     - Estilos de luta: vêm de dados/estilos.json, do mesmo jeito; na página de
       um estilo, as perícias, técnicas e vantagens das listas levam às regras.
   Permissão:
     - Jogador: apenas busca e visualização.
     - Mestre: criar, editar, excluir e alternar visibilidade das técnicas e estilos.
   ===================================================================== */
// One sword (the Mesa de Combate has the crossed ones).
ICON.combat = '<polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" x2="19" y1="19" y2="13"/><line x1="16" x2="20" y1="16" y2="20"/><line x1="19" x2="21" y1="21" y2="19"/>';
function indexTechniques() { var idx = /** @type {Record<string, Technique>} */ ({}); (W.techniques || []).forEach(function (t) { idx[t.id] = t; }); W.techIdx = idx; }
function techById(id) { return (id && W.techIdx[id]) || null; }
function techHref(id) { return hrefFor('tech:' + id); }

// The skills of Mundo › Perícias that count as combat skills, by name without "/TL" and
// without a specialty ("Guns/TL (Pistol)" is Guns).
var COMBAT_SKILLS = ['melee weapon', 'axe/mace', 'two-handed axe/mace', 'broadsword', 'flail', 'two-handed flail', 'force sword', 'force whip',
  'jitte/sai', 'knife', 'kusari', 'main-gauche', 'monowire whip', 'polearm', 'rapier', 'saber', 'shortsword', 'smallsword', 'spear', 'staff',
  'tonfa', 'two-handed sword', 'whip', 'lance', 'cloak', 'shield', 'net', 'lasso', 'bolas', 'garrote',
  'bow', 'crossbow', 'sling', 'spear thrower', 'throwing', 'thrown weapon', 'blowpipe', 'dropping', 'guns', 'beam weapons', 'gunner',
  'liquid projector', 'artillery', 'brawling', 'boxing', 'judo', 'karate', 'wrestling', 'sumo wrestling', 'fast-draw',
  'parry missile weapons', 'throwing art', 'blind fighting', 'breaking blow', 'power blow', 'pressure points', 'pressure secrets', 'kiai',
  'zen archery', 'flying leap', 'immovable stance', 'precognitive parry', 'combat art or sport'];
function combatKey(name) { return norm(name).replace(/\/tl\b/g, '').replace(/\s*\(.*\)\s*$/, '').trim(); }
// Only entries with attribute and difficulty: the cross-references ("see Melee Weapon") stay in Perícias.
function isCombatSkill(s) {
  if (!s.attribute) return false;
  return COMBAT_SKILLS.indexOf(combatKey(s.name)) >= 0 || /^(Melee|Ranged|General);/.test(s.type || '');
}

// The books also have techniques of other skills (Lifesaving, Sociometry). A technique is a combat
// one when its name, prerequisites or default name a combat skill, a weapon or unarmed combat.
var COMBAT_TECH_RE = new RegExp('\\b(' + COMBAT_SKILLS.map(function (k) { return k.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&'); }).join('|') +
  '|unarmed|combat|weapon|parry|dodge|block|lock|grapple|neck|attack|defense|strike|kick|punch|fight)\\b');
function isCombatTech(t) { return COMBAT_TECH_RE.test(norm(t.name + ' ' + (t.prerequisites || '') + ' ' + (t.defaults || ''))); }

var TECH_DIFFS = ['A', 'H'];
var TECH_DIFF_LABELS = { A: 'Média', H: 'Difícil' };
var TECH_DIFF_CLASSES = { A: 'adv-adv', H: 'diff-h' };
function techBadge(t) {
  return t.difficulty ? '<span class="spell-badge ' + (TECH_DIFF_CLASSES[t.difficulty] || 'adv-ref') + '" title="Técnica ' + esc(TECH_DIFF_LABELS[t.difficulty] || t.difficulty) + '">' + esc(TECH_DIFF_LABELS[t.difficulty] || t.difficulty) + '</span>' : '';
}

Ops.saveTechnique = function (tech, fields) {
  if (!isMestre()) return Promise.reject({ message: 'Apenas o Mestre pode criar ou editar técnicas.' });
  var t = now();
  return W.store.put('techniques', tech ? tech.id : null, {
    v: 1,
    name: (fields.name || '').trim(),
    difficulty: (fields.difficulty || '').trim(),
    cinematic: !!fields.cinematic,
    defaults: (fields.defaults || '').trim(),
    prerequisites: (fields.prerequisites || '').trim(),
    description: (fields.description || '').trim(),
    modifiers: (fields.modifiers || '').trim(),
    book: (fields.book || '').trim(),
    page: (fields.page || '').trim(),
    visible: fields.visible !== false,
    sharedWith: fields.sharedWith || (tech && tech.sharedWith) || [],
    createdBy: owner(tech),
    createdAt: (tech && tech.createdAt) || t,
    updatedAt: t
  });
};
// A book technique is not removed from the file: its document says deleted: true.
Ops.deleteTechnique = function (tech) {
  if (!isMestre()) return Promise.reject({ message: 'Apenas o Mestre pode excluir técnicas.' });
  if (tech.catalog) return patchCatalogItem('techniques', tech, { deleted: true, updatedAt: now() });
  return W.store.remove('techniques', tech.id);
};

// Which list, search, filters and page: kept while the site is open (see spellView).
// tab: 'skills' (combat skills), 'techs' or 'styles'; kind (techniques only): 'combat', 'other' or '' for all.
var combatView = { tab: 'skills', q: '', diff: '', book: '', kind: 'combat', page: 1 };
var combatSearchTimer = 0;
var COMBAT_SEARCH_FIELDS = ['name', 'type', 'defaults', 'prerequisites', 'description'];
var STYLE_SEARCH_FIELDS = ['name', 'description', 'skills', 'techniques', 'cinematicSkills', 'cinematicTechniques', 'perks'];
// What each list is called, for the tabs, the counts and the empty states.
var COMBAT_TABS = [
  { key: 'skills', label: 'Perícias de combate', one: 'perícia', many: 'perícias', col: 'skills', search: 'Buscar perícia, padrão ou descrição…' },
  { key: 'techs', label: 'Técnicas', one: 'técnica', many: 'técnicas', col: 'techniques', search: 'Buscar técnica, padrão ou descrição…' },
  { key: 'styles', label: 'Estilos', one: 'estilo', many: 'estilos', col: 'styles', search: 'Buscar estilo, perícia ou técnica…' }
];
function combatTab() { return COMBAT_TABS.filter(function (t) { return t.key === combatView.tab; })[0] || COMBAT_TABS[0]; }
/** The entries of the open list (skills, techniques or styles). @returns {any[]} */
function combatList() {
  var t = combatView.tab;
  return t === 'techs' ? (W.techniques || []) : t === 'styles' ? (W.styles || []) : (W.skills || []).filter(isCombatSkill);
}
function combatValues(field) {
  var set = {};
  combatList().forEach(function (x) { if (x[field]) set[x[field]] = true; });
  return Object.keys(set).sort(function (a, b) { return a.localeCompare(b, 'pt'); });
}

/* =====================================================================
   Page: Combate (three lists)
   ===================================================================== */
function renderCombatPage() {
  loadCatalog('skills'); loadCatalog('techniques'); loadCatalog('styles');
  var ui = combatView, tab = combatTab(), techs = tab.key === 'techs', styles = tab.key === 'styles', can = isMestre();
  var diffs = techs ? TECH_DIFFS : SKILL_CAT_DIFFS, labels = techs ? TECH_DIFF_LABELS : SKILL_CAT_LABELS;
  var present = styles ? [] : diffs.filter(function (d) { return combatList().some(function (x) { return x.difficulty === d; }); });
  var newBtn = can && techs ? '<button class="btn primary" type="button" id="newTechBtn">' + svg(ICON.plus, 16, 2.4) + 'Nova técnica</button>'
    : can && styles ? '<button class="btn primary" type="button" id="newStyleBtn">' + svg(ICON.plus, 16, 2.4) + 'Novo estilo</button>' : '';
  var head = crumbsHtml('combat') +
    '<div class="head-row"><div><h1>' + svg(ICON.combat, 24, 2) + ' Combate</h1>' +
    '<p class="lede">Perícias de combate, técnicas e estilos de luta para GURPS 4ª Edição.</p></div>' +
    (newBtn ? '<div class="btn-row">' + newBtn + '</div>' : '') +
    '</div>';
  var tabs = '<div class="seg" role="tablist" aria-label="Lista">' + COMBAT_TABS.map(function (t) {
    var on = t.key === tab.key;
    return '<button type="button" role="tab" data-ctab="' + t.key + '" aria-selected="' + on + '" class="' + (on ? 'on' : '') + '">' + t.label + '</button>';
  }).join('') + '</div>';
  var toolbar = '<div class="toolbar" style="margin-bottom:16px">' +
    '<input class="search list-search" type="search" id="combatSearch" placeholder="' + tab.search + '" value="' + esc(ui.q) + '" autocomplete="off" aria-label="Buscar">' +
    (styles ? '' : '<div class="field" style="margin:0"><select id="combatDiffFilter" aria-label="Filtrar por dificuldade"><option value="">Todas as dificuldades</option>' +
      present.map(function (d) { return '<option value="' + d + '"' + (ui.diff === d ? ' selected' : '') + '>' + esc(labels[d]) + '</option>'; }).join('') + '</select></div>') +
    '<div class="field" style="margin:0"><select id="combatBookFilter" aria-label="Filtrar por livro"><option value="">Todos os livros</option>' +
    combatValues('book').map(function (b) { return '<option value="' + esc(b) + '"' + (ui.book === b ? ' selected' : '') + '>' + esc(b) + '</option>'; }).join('') + '</select></div>' +
    (techs ? '<div class="field" style="margin:0"><select id="combatKindFilter" aria-label="Filtrar por tipo de técnica">' +
      [['combat', 'De combate'], ['other', 'Fora de combate'], ['', 'Todas as técnicas']].map(function (o) { return '<option value="' + o[0] + '"' + (ui.kind === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>' : '') +
    '</div>';
  pageRoot.innerHTML = head + tabs + toolbar + notice() + '<div id="combatResults"></div>';

  pageRoot.querySelectorAll('[data-ctab]').forEach(function (b) {
    b.onclick = function () {
      var t = b.getAttribute('data-ctab'); if (t === ui.tab) return;
      ui.tab = t; ui.diff = ''; ui.book = ''; ui.kind = 'combat'; ui.page = 1; renderCombatPage();
    };
  });
  var q = $('combatSearch'); if (q) q.oninput = function () { ui.q = q.value; ui.page = 1; clearTimeout(combatSearchTimer); combatSearchTimer = setTimeout(renderCombatList, 150); };
  var df = $('combatDiffFilter'); if (df) df.onchange = function () { ui.diff = df.value; ui.page = 1; renderCombatList(); };
  var bf = $('combatBookFilter'); if (bf) bf.onchange = function () { ui.book = bf.value; ui.page = 1; renderCombatList(); };
  var kf = $('combatKindFilter'); if (kf) kf.onchange = function () { ui.kind = kf.value; ui.page = 1; renderCombatList(); };
  var nb = $('newTechBtn'); if (nb) nb.onclick = function () { openTechniqueForm(null); };
  var ns = $('newStyleBtn'); if (ns) ns.onclick = function () { openStyleForm(null); };
  renderCombatList();
}
function renderCombatList() {
  var el = $('combatResults'); if (!el) return;
  var ui = combatView, tab = combatTab(), techs = tab.key === 'techs', styles = tab.key === 'styles';
  if (!W.loaded[tab.col]) { el.innerHTML = '<p class="lede">Carregando…</p>'; return; }
  var q = norm(ui.q || '').trim(), fields = styles ? STYLE_SEARCH_FIELDS : COMBAT_SEARCH_FIELDS;
  var all = combatList().filter(function (x) {
    if (ui.diff && x.difficulty !== ui.diff) return false;
    if (ui.book && x.book !== ui.book) return false;
    if (techs && ui.kind && isCombatTech(x) !== (ui.kind === 'combat')) return false;
    return !q || searchText(x, fields).indexOf(q) >= 0;
  }); // the lists are already in name order (mergeCatalog)
  var pg = pageOf(all, ui.page); ui.page = pg.page;
  if (!all.length) {
    if (!combatList().length) {
      var none = { skills: 'Nenhuma perícia de combate', techs: 'Nenhuma técnica cadastrada', styles: 'Nenhum estilo cadastrado' }[tab.key];
      var create = techs ? 'Crie uma com <b>Nova técnica</b>.' : styles ? 'Crie um com <b>Novo estilo</b>.' : '';
      el.innerHTML = '<div class="empty-state">' + svg(ICON.combat, 34, 1.6) + '<strong>' + none + '</strong>' +
        '<span>' + (CATALOG[tab.col].failed ? 'Não foi possível carregar a lista dos livros.' : create && isMestre() ? create : 'Vão aparecer aqui.') + '</span></div>';
      return;
    }
    el.innerHTML = '<p class="lede" style="padding:24px 0">Nada corresponde aos filtros aplicados.</p>';
    return;
  }
  el.innerHTML = '<div class="list-bar"><span class="meta">' + pageCountText(pg, all.length, tab.one, tab.many) + '</span>' + pagerHtml(pg) + '</div>' +
    '<div class="adv-grid">' + pg.items.map(techs ? techCardHtml : styles ? styleCardHtml : combatSkillCardHtml).join('') + '</div>' +
    (pg.pages > 1 ? '<div class="list-bar end">' + pagerHtml(pg) + '</div>' : '');
  wirePager(el, function (p) { ui.page = p; renderCombatList(); });
}
function combatSkillCardHtml(s) {
  var tags = skillTags(s);
  return '<a class="spell-card adv-card" href="' + skillHref(s.id) + '" data-skill-modal="' + esc(s.id) + '">' +
    '<div class="adv-card-top"><strong>' + esc(s.name) + '</strong>' + skillBadge(s) + '</div>' +
    (s.defaults ? '<div class="adv-cost">Padrão: ' + esc(s.defaults) + '</div>' : '') +
    (tags ? '<div class="adv-src">' + esc(tags) + '</div>' : '') +
    (s.description ? '<div class="adv-desc">' + esc(s.description) + '</div>' : '') +
    '<div class="adv-src">' + esc([s.book, s.page ? 'p. ' + s.page : ''].filter(Boolean).join(' · ')) + '</div></a>';
}
function techCardHtml(t) {
  return '<a class="spell-card adv-card" href="' + techHref(t.id) + '">' +
    '<div class="adv-card-top"><strong>' + esc(t.name) + '</strong>' + techBadge(t) + '</div>' +
    (t.defaults ? '<div class="adv-cost">Padrão: ' + esc(t.defaults) + '</div>' : '') +
    (t.cinematic ? '<div class="adv-src">Cinemática</div>' : '') +
    (t.description ? '<div class="adv-desc">' + esc(t.description) + '</div>' : '') +
    '<div class="adv-src">' + esc([t.book, t.page ? 'p. ' + t.page : ''].filter(Boolean).join(' · ')) + '</div></a>';
}

/* =====================================================================
   Page: single technique
   ===================================================================== */
function renderTechniquePage() {
  loadCatalog('techniques');
  var t = techById(S.route.techId), ui = S.ui;
  if (!t) {
    pageRoot.innerHTML = crumbsHtml('combat') + (W.loaded.techniques
      ? '<h1>Técnica não encontrada</h1><p class="lede">Essa técnica pode ter sido excluída ou o link está incorreto.</p><div><a class="btn" href="#combate">Voltar para Combate</a></div>'
      : '<p class="lede">Carregando técnica…</p>');
    return;
  }
  var can = isMestre();
  var head = crumbsHtml('tech:' + t.id) +
    '<div class="head-row"><div><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span class="badge">' + svg(ICON.combat, 12, 2.4) + ' Técnica</span>' + techBadge(t) + '</div>' +
    '<h1>' + esc(t.name) + '</h1><p class="lede">Técnica ' + esc(TECH_DIFF_LABELS[t.difficulty] || t.difficulty || '') + (t.cinematic ? ' · Cinemática' : '') + (t.defaults ? ' · Padrão: ' + esc(t.defaults) : '') + '</p></div>' +
    (can ? '<div class="btn-row">' + (t.catalog && rawHas('techniques', t.id) ? '<button class="btn" type="button" id="restoreTechBtn" title="Desfaz as alterações do Mestre nesta entrada">Restaurar original</button>' : '') + '<button class="btn" type="button" id="editTechBtn">' + svg(ICON.edit, 15) + 'Editar técnica</button><button class="btn danger" type="button" id="delTechBtn">' + svg(ICON.trash, 15) + 'Excluir</button></div>' : '') +
    '</div>' +
    (ui.confirmDelete ? '<div class="confirm" role="alert"><span>Excluir a técnica <b>' + esc(t.name) + '</b>? Não dá para desfazer.</span><div class="btn-row"><button class="btn danger solid" type="button" id="delTechYes">Excluir técnica</button><button class="btn ghost" type="button" id="delTechNo">Cancelar</button></div></div>' : '');
  function sec(title, text, empty) {
    return '<section><h2 class="sec-title">' + title + '</h2>' + (text ? '<p class="long">' + esc(text) + '</p>' : '<p class="long none">' + empty + '</p>') + '</section>';
  }
  var main = sec('Descrição', t.description, 'Sem descrição cadastrada.') +
    (t.prerequisites ? sec('Pré-requisitos', t.prerequisites) : '') +
    (t.modifiers ? sec('Modificadores', t.modifiers) : '');
  function fact(label, v) { return '<dt>' + label + '</dt><dd>' + (v ? esc(v) : '<span class="none">—</span>') + '</dd>'; }
  // Closed until its title is clicked (see foldBox).
  var side = foldBox('params', 'Parâmetros', null, '<dl class="facts">' +
    fact('Dificuldade', TECH_DIFF_LABELS[t.difficulty] || t.difficulty) +
    fact('Padrão', t.defaults) +
    fact('Cinemática', t.cinematic ? 'Sim' : 'Não') +
    fact('Livro', t.book) +
    fact('Página', t.page) +
    '</dl>');
  pageRoot.innerHTML = head + '<div class="loc-layout"><div class="side" style="gap:22px">' + main + '</div><div class="side">' + side + '</div></div>';
  wireFolds(pageRoot);
  if (!can) return;
  $('editTechBtn').onclick = function () { openTechniqueForm(t); };
  $('delTechBtn').onclick = function () { ui.confirmDelete = true; renderTechniquePage(); };
  var dn = $('delTechNo'); if (dn) dn.onclick = function () { ui.confirmDelete = false; renderTechniquePage(); };
  var dy = $('delTechYes'); if (dy) dy.onclick = function () {
    dy.disabled = true;
    Ops.deleteTechnique(t).then(function () { toast('Técnica excluída.'); combatView.tab = 'techs'; go('#combate', true); }, function (er) { dy.disabled = false; toast(errorText(er), true); });
  };
  var rb = $('restoreTechBtn'); if (rb) rb.onclick = function () {
    rb.disabled = true;
    Ops.restoreCatalogItem('techniques', t).then(function () { toast('Técnica restaurada como no livro.'); }, function (er) { rb.disabled = false; toast(errorText(er), true); });
  };
}

/* =====================================================================
   Form: technique (Mestre)
   ===================================================================== */
function openTechniqueForm(t) {
  if (!isMestre()) { toast('Apenas o Mestre pode criar ou editar técnicas.', true); return; }
  var editing = !!t;
  function val(k) { return esc(editing ? t[k] || '' : ''); }
  var cur = editing ? t.difficulty : 'A';
  var html = '<form id="techForm" novalidate><h2 id="tfTitle">' + (editing ? 'Editar técnica' : 'Nova técnica') + '</h2>' +
    '<div class="field" id="f_tname"><label for="tname">Nome da técnica</label><input type="text" id="tname" maxlength="100" autocomplete="off" placeholder="Ex.: Arm Lock" value="' + val('name') + '"><div class="err" id="err_tname"></div></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
    '<div class="field"><label for="tdiff">Dificuldade</label><select id="tdiff">' + TECH_DIFFS.map(function (d) { return '<option value="' + d + '"' + (cur === d ? ' selected' : '') + '>' + TECH_DIFF_LABELS[d] + '</option>'; }).join('') + '</select></div>' +
    '<label class="vis-flag" for="tcine" style="align-self:end"><input type="checkbox" id="tcine"' + (editing && t.cinematic ? ' checked' : '') + '><span><b>Cinemática</b></span></label></div>' +
    '<div class="field"><label for="tdef">Padrão (default)</label><input type="text" id="tdef" maxlength="300" placeholder="Ex.: Judo-4 ou prerequisite skill-2" value="' + val('defaults') + '"></div>' +
    '<div class="field"><label for="tpre">Pré-requisitos</label><input type="text" id="tpre" maxlength="300" placeholder="Ex.: Judo; cannot exceed Judo skill" value="' + val('prerequisites') + '"></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
    '<div class="field"><label for="tbook">Livro</label><input type="text" id="tbook" list="techBookList" maxlength="100" placeholder="Ex.: GURPS Martial Arts" value="' + val('book') + '">' +
    '<datalist id="techBookList">' + Object.keys((W.techniques || []).reduce(function (m, x) { if (x.book) m[x.book] = 1; return m; }, {})).sort().map(function (b) { return '<option value="' + esc(b) + '">'; }).join('') + '</datalist></div>' +
    '<div class="field"><label for="tpage">Página</label><input type="text" id="tpage" maxlength="30" placeholder="Ex.: MA65" value="' + val('page') + '"></div></div>' +
    '<div class="field"><label for="tdesc">Descrição</label><textarea id="tdesc" rows="6" maxlength="20000" placeholder="Como a técnica funciona…">' + val('description') + '</textarea></div>' +
    '<div class="field"><label for="tmod">Modificadores</label><textarea id="tmod" rows="3" maxlength="5000" placeholder="Bônus e penalidades">' + val('modifiers') + '</textarea></div>' +
    flagHtml('tvis', t, true) +
    '<div class="form-err" id="tfErr" role="alert"></div>' +
    '<div class="btn-row" style="justify-content:flex-end"><button class="btn ghost" type="button" id="tfCancel">Cancelar</button><button class="btn primary" type="submit" id="tfSave">' + (editing ? 'Salvar técnica' : 'Criar técnica') + '</button></div></form>';
  showModal(html);
  modal.setAttribute('aria-labelledby', 'tfTitle');
  var name = $('tname');
  name.addEventListener('input', function () { if (name.value.trim()) { $('err_tname').textContent = ''; $('f_tname').classList.remove('invalid'); } });
  $('tfCancel').onclick = function () { closeModal(); };
  $('techForm').onsubmit = function (e) {
    e.preventDefault();
    if (modalOpen.busy) return;
    var n = name.value.trim();
    if (!n) { $('err_tname').textContent = 'Informe o nome da técnica.'; $('f_tname').classList.add('invalid'); name.focus(); return; }
    modalOpen.busy = true;
    var btn = $('tfSave'); btn.disabled = true; btn.textContent = 'Salvando…'; $('tfCancel').disabled = true; $('tfErr').textContent = '';
    Ops.saveTechnique(t, { name: n, difficulty: $('tdiff').value, cinematic: $('tcine').checked, defaults: $('tdef').value, prerequisites: $('tpre').value,
      book: $('tbook').value, page: $('tpage').value, description: $('tdesc').value, modifiers: $('tmod').value,
      visible: flagVal('tvis', t), sharedWith: shareVal('tvis', t) }).then(function (id) {
      closeModal(true);
      toast(editing ? 'Técnica salva.' : 'Técnica criada.');
      if (!editing) go(techHref(id));
    }, function (er) {
      if (!modalOpen) return;
      modalOpen.busy = false; btn.disabled = false; btn.textContent = editing ? 'Salvar técnica' : 'Criar técnica'; $('tfCancel').disabled = false;
      $('tfErr').textContent = errorText(er);
    });
  };
}

/* =====================================================================
   Estilos de luta (Martial Arts): dados/estilos.json, ids style_*.
   Each list (skills, techniques, ...) is kept as in the book, items separated by "; ".
   ===================================================================== */
function indexStyles() { var idx = /** @type {Record<string, FightingStyle>} */ ({}); (W.styles || []).forEach(function (x) { idx[x.id] = x; }); W.styleIdx = idx; }
function styleById(id) { return (id && W.styleIdx[id]) || null; }
function styleHref(id) { return hrefFor('style:' + id); }
// [field, title] of the lists of a style; the optional ones come under "Traços opcionais".
var STYLE_LISTS = [['skills', 'Perícias'], ['techniques', 'Técnicas'], ['cinematicSkills', 'Perícias cinemáticas'], ['cinematicTechniques', 'Técnicas cinemáticas'], ['perks', 'Perks']];
var STYLE_OPT_LISTS = [['optAdvantages', 'Vantagens'], ['optDisadvantages', 'Desvantagens'], ['optSkills', 'Perícias'], ['optTechniques', 'Técnicas'], ['optPerks', 'Perks']];
var STYLE_FIELDS = ['name', 'cost', 'description'].concat(STYLE_LISTS.concat(STYLE_OPT_LISTS).map(function (x) { return x[0]; })).concat(['book', 'page']);
function styleItems(text) { return String(text || '').split(/\s*;\s*/).map(function (x) { return x.trim(); }).filter(Boolean); }
function styleCost(x) { return x.cost ? x.cost + (x.cost === '1' ? ' ponto' : ' pontos') : ''; }

Ops.saveStyle = function (st, fields) {
  if (!isMestre()) return Promise.reject({ message: 'Apenas o Mestre pode criar ou editar estilos.' });
  var t = now(), body = { v: 1 };
  STYLE_FIELDS.forEach(function (k) { body[k] = String(fields[k] || '').trim(); });
  return W.store.put('styles', st ? st.id : null, Object.assign(body, {
    visible: fields.visible !== false,
    sharedWith: fields.sharedWith || (st && st.sharedWith) || [],
    createdBy: owner(st),
    createdAt: (st && st.createdAt) || t,
    updatedAt: t
  }));
};
// A book style is not removed from the file: its document says deleted: true.
Ops.deleteStyle = function (st) {
  if (!isMestre()) return Promise.reject({ message: 'Apenas o Mestre pode excluir estilos.' });
  if (st.catalog) return patchCatalogItem('styles', st, { deleted: true, updatedAt: now() });
  return W.store.remove('styles', st.id);
};

function styleCardHtml(x) {
  var skills = styleItems(x.skills);
  return '<a class="spell-card adv-card" href="' + styleHref(x.id) + '">' +
    '<div class="adv-card-top"><strong>' + esc(x.name) + '</strong>' + (x.cost ? '<span class="spell-badge adv-adv" title="Style Familiarity e perks obrigatórios">' + esc(x.cost) + ' pts</span>' : '') + '</div>' +
    (skills.length ? '<div class="adv-cost">' + esc(skills.join(' · ')) + '</div>' : '') +
    (x.description ? '<div class="adv-desc">' + esc(x.description) + '</div>' : '') +
    '<div class="adv-src">' + esc([x.book, x.page ? 'p. ' + x.page : ''].filter(Boolean).join(' · ')) + '</div></a>';
}

// An item of a style's list as a chip; the ones found in the catalogs link to them (skills open
// in the modal). "Disarming (Judo)" is the technique Disarming; "Savoir-Faire (Dojo)" the skill.
function styleFind(kind, item) {
  var base = combatKey(item);
  if (kind === 'skill') return (W.skills || []).filter(function (s) { return s.attribute && combatKey(s.name) === base; })[0] || null;
  if (kind === 'tech') return (W.techniques || []).filter(function (t) { return combatKey(t.name) === base || norm(t.name) === norm(item); })[0] || null;
  if (kind === 'adv') return (W.advantages || []).filter(function (a) { return combatKey(a.name) === base || norm(a.name) === norm(item); })[0] || null;
  return null;
}
function styleChipsHtml(text, kind) {
  return '<div class="style-chips">' + styleItems(text).map(function (item) {
    var hit = styleFind(kind, item);
    if (hit && kind === 'skill') return '<a class="style-chip linked" href="' + skillHref(hit.id) + '" data-skill-modal="' + esc(hit.id) + '">' + esc(item) + '</a>';
    if (hit && kind === 'tech') return '<a class="style-chip linked" href="' + techHref(hit.id) + '">' + esc(item) + '</a>';
    if (hit && kind === 'adv') return '<a class="style-chip linked" href="' + hrefFor('adv:' + hit.id) + '">' + esc(item) + '</a>';
    return '<span class="style-chip">' + esc(item) + '</span>';
  }).join('') + '</div>';
}
// What each list holds, to know which catalog its items link to.
var STYLE_KINDS = { skills: 'skill', cinematicSkills: 'skill', optSkills: 'skill', techniques: 'tech', cinematicTechniques: 'tech', optTechniques: 'tech',
  perks: 'adv', optPerks: 'adv', optAdvantages: 'adv', optDisadvantages: '' };

/* ---------- Page: single style ---------- */
function renderStylePage() {
  loadCatalog('styles'); loadCatalog('skills'); loadCatalog('techniques'); loadCatalog('advantages');
  var x = styleById(S.route.styleId), ui = S.ui;
  if (!x) {
    pageRoot.innerHTML = crumbsHtml('combat') + (W.loaded.styles
      ? '<h1>Estilo não encontrado</h1><p class="lede">Esse estilo pode ter sido excluído ou o link está incorreto.</p><div><a class="btn" href="#combate">Voltar para Combate</a></div>'
      : '<p class="lede">Carregando estilo…</p>');
    return;
  }
  var can = isMestre();
  var head = crumbsHtml('style:' + x.id) +
    '<div class="head-row"><div><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span class="badge">' + svg(ICON.combat, 12, 2.4) + ' Estilo</span>' +
    (x.cost ? '<span class="spell-badge adv-adv">' + esc(x.cost) + ' pts</span>' : '') + '</div>' +
    '<h1>' + esc(x.name) + '</h1><p class="lede">' + (x.cost ? esc(styleCost(x)) + ' de Style Familiarity e perks obrigatórios' : 'Custo não informado') + '</p></div>' +
    (can ? '<div class="btn-row">' + (x.catalog && rawHas('styles', x.id) ? '<button class="btn" type="button" id="restoreStyleBtn" title="Desfaz as alterações do Mestre nesta entrada">Restaurar original</button>' : '') + '<button class="btn" type="button" id="editStyleBtn">' + svg(ICON.edit, 15) + 'Editar estilo</button><button class="btn danger" type="button" id="delStyleBtn">' + svg(ICON.trash, 15) + 'Excluir</button></div>' : '') +
    '</div>' +
    (ui.confirmDelete ? '<div class="confirm" role="alert"><span>Excluir o estilo <b>' + esc(x.name) + '</b>? Não dá para desfazer.</span><div class="btn-row"><button class="btn danger solid" type="button" id="delStyleYes">Excluir estilo</button><button class="btn ghost" type="button" id="delStyleNo">Cancelar</button></div></div>' : '');
  function lists(defs) {
    return defs.filter(function (d) { return x[d[0]]; }).map(function (d) {
      return '<div class="style-list"><h3>' + d[1] + '</h3>' + styleChipsHtml(x[d[0]], STYLE_KINDS[d[0]]) + '</div>';
    }).join('');
  }
  var main = '<section><h2 class="sec-title">Descrição</h2>' + (x.description ? '<p class="long">' + esc(x.description) + '</p>' : '<p class="long none">Sem descrição cadastrada.</p>') + '</section>';
  var side = '<section class="box style-box"><h2 class="sec-title">O estilo ensina</h2>' + (lists(STYLE_LISTS) || '<p class="long none">Nada listado.</p>') + '</section>' +
    (STYLE_OPT_LISTS.some(function (d) { return x[d[0]]; }) ? '<section class="box style-box"><h2 class="sec-title">Traços opcionais</h2>' + lists(STYLE_OPT_LISTS) + '</section>' : '') +
    '<p class="hint-text">' + esc([x.book, x.page ? 'p. ' + x.page : ''].filter(Boolean).join(' · ')) + '. As perícias, técnicas e vantagens destacadas abrem as regras.</p>';
  pageRoot.innerHTML = head + '<div class="loc-layout style-layout"><div class="side" style="gap:22px">' + main + '</div><div class="side">' + side + '</div></div>';
  if (!can) return;
  $('editStyleBtn').onclick = function () { openStyleForm(x); };
  $('delStyleBtn').onclick = function () { ui.confirmDelete = true; renderStylePage(); };
  var dn = $('delStyleNo'); if (dn) dn.onclick = function () { ui.confirmDelete = false; renderStylePage(); };
  var dy = $('delStyleYes'); if (dy) dy.onclick = function () {
    dy.disabled = true;
    Ops.deleteStyle(x).then(function () { toast('Estilo excluído.'); combatView.tab = 'styles'; go('#combate', true); }, function (er) { dy.disabled = false; toast(errorText(er), true); });
  };
  var rb = $('restoreStyleBtn'); if (rb) rb.onclick = function () {
    rb.disabled = true;
    Ops.restoreCatalogItem('styles', x).then(function () { toast('Estilo restaurado como no livro.'); }, function (er) { rb.disabled = false; toast(errorText(er), true); });
  };
}

/* ---------- Form: style (Mestre) ---------- */
function openStyleForm(x) {
  if (!isMestre()) { toast('Apenas o Mestre pode criar ou editar estilos.', true); return; }
  var editing = !!x;
  function val(k) { return esc(editing ? x[k] || '' : ''); }
  function listField(d) {
    return '<div class="field"><label for="sf_' + d[0] + '">' + d[1] + '</label><textarea id="sf_' + d[0] + '" rows="2" maxlength="3000" placeholder="Separe por ponto e vírgula">' + val(d[0]) + '</textarea></div>';
  }
  var html = '<form id="styleForm" novalidate><h2 id="stTitle">' + (editing ? 'Editar estilo' : 'Novo estilo') + '</h2>' +
    '<div class="field" id="f_stname"><label for="stname">Nome do estilo</label><input type="text" id="stname" maxlength="100" autocomplete="off" placeholder="Ex.: Kenjutsu" value="' + val('name') + '"><div class="err" id="err_stname"></div></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">' +
    '<div class="field"><label for="stcost">Custo (pontos)</label><input type="text" id="stcost" maxlength="10" inputmode="numeric" placeholder="Ex.: 3" value="' + val('cost') + '"></div>' +
    '<div class="field"><label for="stbook">Livro</label><input type="text" id="stbook" maxlength="100" placeholder="Ex.: GURPS Martial Arts" value="' + val('book') + '"></div>' +
    '<div class="field"><label for="stpage">Página</label><input type="text" id="stpage" maxlength="30" placeholder="Ex.: MA173" value="' + val('page') + '"></div></div>' +
    '<div class="field"><label for="stdesc">Descrição</label><textarea id="stdesc" rows="5" maxlength="20000" placeholder="História e jeito de lutar do estilo…">' + val('description') + '</textarea></div>' +
    STYLE_LISTS.map(listField).join('') +
    '<h3 class="sec-title" style="margin:6px 0 0">Traços opcionais</h3>' +
    STYLE_OPT_LISTS.map(listField).join('') +
    flagHtml('stvis', x, true) +
    '<div class="form-err" id="stErr" role="alert"></div>' +
    '<div class="btn-row" style="justify-content:flex-end"><button class="btn ghost" type="button" id="stCancel">Cancelar</button><button class="btn primary" type="submit" id="stSave">' + (editing ? 'Salvar estilo' : 'Criar estilo') + '</button></div></form>';
  showModal(html);
  modal.setAttribute('aria-labelledby', 'stTitle');
  var name = $('stname');
  name.addEventListener('input', function () { if (name.value.trim()) { $('err_stname').textContent = ''; $('f_stname').classList.remove('invalid'); } });
  $('stCancel').onclick = function () { closeModal(); };
  $('styleForm').onsubmit = function (e) {
    e.preventDefault();
    if (modalOpen.busy) return;
    var n = name.value.trim();
    if (!n) { $('err_stname').textContent = 'Informe o nome do estilo.'; $('f_stname').classList.add('invalid'); name.focus(); return; }
    var fields = { name: n, cost: $('stcost').value, book: $('stbook').value, page: $('stpage').value, description: $('stdesc').value,
      visible: flagVal('stvis', x), sharedWith: shareVal('stvis', x) };
    STYLE_LISTS.concat(STYLE_OPT_LISTS).forEach(function (d) { fields[d[0]] = $('sf_' + d[0]).value.replace(/\s*\n\s*/g, '; '); });
    modalOpen.busy = true;
    var btn = $('stSave'); btn.disabled = true; btn.textContent = 'Salvando…'; $('stCancel').disabled = true; $('stErr').textContent = '';
    Ops.saveStyle(x, fields).then(function (id) {
      closeModal(true);
      toast(editing ? 'Estilo salvo.' : 'Estilo criado.');
      if (!editing) go(styleHref(id));
    }, function (er) {
      if (!modalOpen) return;
      modalOpen.busy = false; btn.disabled = false; btn.textContent = editing ? 'Salvar estilo' : 'Criar estilo'; $('stCancel').disabled = false;
      $('stErr').textContent = errorText(er);
    });
  };
}

/* ---------- A technique in a modal (from a sheet, like the skills' openSkillModal) ---------- */
function openTechModal(id) {
  showModal('<div class="skill-modal" id="techModal"><p class="lede">Carregando técnica…</p></div>');
  function paint() {
    var box = $('techModal'); if (!box) return;
    var t = techById(id);
    if (!t) { box.innerHTML = '<h2>Técnica não encontrada</h2><p class="lede">Essa técnica pode ter sido excluída ou ocultada.</p>'; return; }
    // A sheet being edited would lose its draft on leaving the page: the page opens in another tab then.
    var away = S.ui && (S.ui.skillDraft || S.ui.combatDraft) ? ' target="_blank" rel="noopener"' : '';
    function sec(title, text) { return text ? '<h3 class="sec-title">' + title + '</h3><p class="long">' + esc(text) + '</p>' : ''; }
    box.innerHTML = '<div class="skill-modal-head"><div style="display:flex;align-items:center;gap:8px"><span class="badge">' + svg(ICON.combat, 12, 2.4) + ' Técnica</span>' + techBadge(t) + '</div>' +
      '<h2 id="techModalTitle">' + esc(t.name) + '</h2><p class="lede">Técnica ' + esc(TECH_DIFF_LABELS[t.difficulty] || t.difficulty || '') + (t.cinematic ? ' · Cinemática' : '') +
      (t.defaults ? ' · Padrão: ' + esc(t.defaults) : '') + '</p></div>' +
      sec('Descrição', t.description || 'Sem descrição cadastrada.') + sec('Pré-requisitos', t.prerequisites) + sec('Modificadores', t.modifiers) +
      '<p class="hint-text">' + esc([t.book, t.page ? 'p. ' + t.page : ''].filter(Boolean).join(' · ')) + '</p>' +
      '<div class="btn-row" style="justify-content:flex-end"><a class="btn" href="' + techHref(t.id) + '"' + away + ' id="techModalPage">Abrir página da técnica</a></div>';
    modal.setAttribute('aria-labelledby', 'techModalTitle');
    var pg = $('techModalPage'); if (pg && !away) pg.onclick = function () { closeModal(); };
  }
  loadCatalog('techniques').then(paint, paint);
}
document.addEventListener('click', function (e) {
  if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
  var t = /** @type {AnyEl} */ (e.target), a = t && t.closest && t.closest('[data-tech-modal]'); if (!a) return;
  e.preventDefault(); openTechModal(a.getAttribute('data-tech-modal'));
});
