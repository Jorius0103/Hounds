/* =====================================================================
   Hounds — Aba Combate (Regras › Combate): perícias de combate, técnicas e estilos
   A página com as três listas, a de técnica, a de estilo e os formulários
   são React (src/hub/paginas/Combate.tsx, Tecnica.tsx, TecnicaForm.tsx,
   Estilo.tsx e EstiloForm.tsx); aqui ficam os dados (o que é de combate,
   as listas dos estilos e o que cada item nomeia nos catálogos), a gravação
   (Ops) e as regras de uma técnica num modal, para os links das fichas.
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   Combate de GURPS
   Três listas na mesma página:
     - Perícias de combate: as entradas de Regras › Perícias (dados/pericias.json)
       que são de armas, combate desarmado e luta (COMBAT_SKILLS), mais as de
       imbuement (tipo "Melee; DX/Very Hard"). Abrem a página da perícia dentro de
       Combate (#pericia-combate~id), como as técnicas e os estilos.
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
function combatSkillHref(id) { return hrefFor('cskill:' + id); }

// The skills of Regras › Perícias that count as combat skills, by name without "/TL" and
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

/* =====================================================================
   Estilos de luta (Martial Arts): dados/estilos.json, ids style_*.
   Each list (skills, techniques, ...) is kept as in the book, items separated by "; ".
   ===================================================================== */
function indexStyles() { var idx = /** @type {Record<string, FightingStyle>} */ ({}); (W.styles || []).forEach(function (x) { idx[x.id] = x; }); W.styleIdx = idx; }
function styleById(id) { return (id && W.styleIdx[id]) || null; }
function styleHref(id) { return hrefFor('style:' + id); }
// [field, title] of the lists of a style; the optional ones come under "Traços opcionais".
var STYLE_LISTS = [['skills', 'Perícias'], ['techniques', 'Técnicas'], ['cinematicSkills', 'Perícias cinemáticas'], ['cinematicTechniques', 'Técnicas cinemáticas'], ['perks', 'Perks'], ['spells', 'Magias']];
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

// An item of a style's list as a chip; the ones found in the catalogs link to them (skills to their
// page under Combate). "Disarming (Judo)" is the technique Disarming; "Savoir-Faire (Dojo)" the skill.
function styleFind(kind, item) {
  var base = combatKey(item);
  // "TA (Boxing Punch/Face)" is a Targeted Attack (Martial Arts, p. 68).
  if (kind === 'tech' && base === 'ta') base = 'targeted attack';
  if (kind === 'skill') return (W.skills || []).filter(function (s) { return s.attribute && combatKey(s.name) === base; })[0] || null;
  if (kind === 'tech') return (W.techniques || []).filter(function (t) { return combatKey(t.name) === base || norm(t.name) === norm(item); })[0] || null;
  if (kind === 'adv') return (W.advantages || []).filter(function (a) { return combatKey(a.name) === base || norm(a.name) === norm(item); })[0] || null;
  if (kind === 'spell') return (W.spells || []).filter(function (x) { return norm(x.name) === norm(item); })[0] || null;
  return null;
}
function styleChipsHtml(text, kind) {
  return '<div class="style-chips">' + styleItems(text).map(function (item) {
    var hit = styleFind(kind, item);
    if (hit && kind === 'skill') return '<a class="style-chip linked" href="' + combatSkillHref(hit.id) + '">' + esc(item) + '</a>';
    if (hit && kind === 'tech') return '<a class="style-chip linked" href="' + techHref(hit.id) + '">' + esc(item) + '</a>';
    if (hit && kind === 'adv') return '<a class="style-chip linked" href="' + hrefFor('adv:' + hit.id) + '">' + esc(item) + '</a>';
    if (hit && kind === 'spell') return '<a class="style-chip linked" href="' + spellHref(hit.id) + '" data-spell-modal="' + esc(hit.id) + '">' + esc(item) + '</a>';
    return '<span class="style-chip">' + esc(item) + '</span>';
  }).join('') + '</div>';
}
// What each list holds, to know which catalog its items link to.
var STYLE_KINDS = { skills: 'skill', cinematicSkills: 'skill', optSkills: 'skill', techniques: 'tech', cinematicTechniques: 'tech', optTechniques: 'tech',
  perks: 'adv', optPerks: 'adv', optAdvantages: 'adv', optDisadvantages: '', spells: 'spell' };

/* ---------- The lists of the style form (src/hub/paginas/EstiloForm.tsx) ---------- */
// Each list of a style is picked from the page it belongs to (STYLE_LIST_KIND): typed, the entries
// of that catalog are offered below (by name in English or Portuguese, as in the other pickers), and
// the ones chosen show as chips. A name not in the catalog can be added too (a specialty, a house rule).
// Saved as before: the names separated by "; ".
var STYLE_LIST_KIND = { skills: 'skill', cinematicSkills: 'skill', optSkills: 'skill', techniques: 'tech', cinematicTechniques: 'tech', optTechniques: 'tech',
  perks: 'perk', optPerks: 'perk', optAdvantages: 'adv', optDisadvantages: 'disadv', spells: 'spell' };
var STYLE_KIND_PAGE = { skill: 'Regras › Perícias', tech: 'Regras › Combate (técnicas)', perk: 'Regras › Perks', adv: 'Regras › Vantagens', disadv: 'Regras › Desvantagens', spell: 'Regras › Magias' };
function styleKindList(kind) {
  if (kind === 'skill') return (W.skills || []).filter(function (s) { return s.attribute && SKILL_DIFFS[s.difficulty]; });
  if (kind === 'tech') return W.techniques || [];
  if (kind === 'spell') return W.spells || [];
  if (kind === 'disadv') return (W.disadvantages || []).filter(function (d) { return !/^(cross|remiss)/i.test(d.type || ''); });
  return (W.advantages || []).filter(function (a) { var k = advTypeKey(a.type); return k !== 'exp' && k !== 'ref' && (kind === 'perk' ? k === 'perk' : k !== 'perk'); });
}
function styleKindInfo(kind, e) {
  if (kind === 'skill') return [e.attribute + '/' + e.difficulty, e.specialty ? 'exige especialização' : '', e.page].filter(Boolean).join(' · ');
  if (kind === 'tech') return ['Técnica ' + (e.difficulty === 'A' ? 'Média' : 'Difícil'), e.defaults ? 'padrão ' + e.defaults : '', e.page].filter(Boolean).join(' · ');
  if (kind === 'spell') { var col = String(e.college || '').split(',')[0].trim(); return [col ? collegeLabel(col) : '', 'IQ/' + (e.difficulty || 'H'), e.page].filter(Boolean).join(' · '); }
  return [kind === 'disadv' ? '' : advTypeLabel(e.type), e.cost, e.page].filter(Boolean).join(' · ');
}

/* ---------- A technique in a modal (from a sheet, like the skills' openSkillModal) ---------- */
function openTechModal(id) {
  showModal('<div class="skill-modal" id="techModal"><p class="lede">Carregando técnica…</p></div>');
  function paint() {
    var box = $('techModal'); if (!box) return;
    var t = techById(id);
    if (!t) { box.innerHTML = '<h2>Técnica não encontrada</h2><p class="lede">Essa técnica pode ter sido excluída ou ocultada.</p>'; return; }
    // A sheet being edited would lose its draft on leaving the page: the page opens in another tab then.
    var away = S.ui && sheetDraftOpen() ? ' target="_blank" rel="noopener"' : '';
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
