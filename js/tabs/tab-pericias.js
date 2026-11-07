/* =====================================================================
   Hounds — Aba Perícias (Regras › Perícias)
   A lista, a página e o formulário são React (src/hub/paginas/
   Pericias.tsx, Pericia.tsx e PericiaForm.tsx); aqui ficam os dados
   (atributos, dificuldades, livros, os grupos de combate), a gravação
   (Ops), o selo que Combate também usa e as regras de uma perícia num
   modal, para os links das fichas.
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

// The groups of the combat skills (the start of their type in the books); '' is a skill out of Combate's list.
var SKILL_COMBAT_GROUPS = [['', 'Não (perícia comum)'], ['Melee', 'Corpo a corpo'], ['Ranged', 'À distância'], ['General', 'Geral (combate)']];
function skillCombatGroup(s) { var m = /^(Melee|Ranged|General);/.exec((s && s.type) || ''); return m ? m[1] : ''; }

/* =====================================================================
   The rules of a skill in a modal, for the sheets (the page is React:
   src/hub/paginas/Pericia.tsx)
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
