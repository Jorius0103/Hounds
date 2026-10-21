/* =====================================================================
   Hounds — Modais de estilos, armas, armaduras, itens, melhoramentos e personagens
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   The links of a sheet open what they point at in a modal, as the skills, techniques, advantages,
   disadvantages and spells already do (openSkillModal and the others): data-style-modal,
   data-weapon-modal, data-armor-modal, data-item-modal, data-impr-modal and data-char-modal hold
   the id. The modal shows what the entry's page shows (without the Mestre's buttons) and a button
   to open the page. A click with Ctrl, Shift or the middle button still follows the link.
   ===================================================================== */
// A sheet being edited would lose its draft on leaving the page: the page opens in another tab then.
function modalAway() {
  var ui = S.ui, editing = !!ui && S.route && S.route.page === 'sheet' && !!(ui.attrDraft || sheetDraftOpen() || gearEditing());
  return editing ? ' target="_blank" rel="noopener"' : '';
}
function modalFacts(fields, x) {
  return '<dl class="facts">' + fields.map(function (f) { return '<dt>' + esc(f[1]) + '</dt><dd>' + (x[f[0]] ? esc(x[f[0]]) : '<span class="none">—</span>') + '</dd>'; }).join('') + '</dl>';
}
function modalSec(title, html) { return '<h3 class="sec-title">' + title + '</h3>' + html; }
function modalText(text, none) { return text ? '<p class="long">' + esc(text) + '</p>' : '<p class="long none">' + none + '</p>'; }
// cfg: catalogs (loaded before painting), find(id), missing (title when not found), badges(x), lede(x),
// body(x), href(id), open (the button's text), after(x, box) (what needs the modal in place: images).
function openEntryModal(cfg, id) {
  showModal('<div class="skill-modal" id="entryModal"><p class="lede">Carregando…</p></div>');
  function paint() {
    var box = $('entryModal'); if (!box) return;
    var x = cfg.find(id);
    if (!x) { box.innerHTML = '<h2>' + cfg.missing + '</h2><p class="lede">Pode ter sido excluído, ocultado ou o link está incorreto.</p>'; return; }
    var away = modalAway(), src = [x.book, x.page ? 'p. ' + x.page : ''].filter(Boolean).join(' · ');
    box.innerHTML = '<div class="skill-modal-head"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' + cfg.badges(x) + '</div>' +
      '<h2 id="entryModalTitle">' + esc(x.name) + '</h2>' + (cfg.catalogs.length ? ptNameHtml(x, 'p') : '') +
      (cfg.lede(x) ? '<p class="lede">' + esc(cfg.lede(x)) + '</p>' : '') + '</div>' + cfg.body(x) +
      (src ? '<p class="hint-text">' + esc(src) + '</p>' : '') +
      '<div class="btn-row" style="justify-content:flex-end"><a class="btn" href="' + cfg.href(x.id) + '"' + away + ' id="entryModalPage">' + cfg.open + '</a></div>';
    modal.setAttribute('aria-labelledby', 'entryModalTitle');
    var pg = $('entryModalPage'); if (pg && !away) pg.onclick = function () { closeModal(); };
    if (cfg.after) cfg.after(x, box);
  }
  if (!cfg.catalogs.length) { paint(); return; }
  Promise.all(cfg.catalogs.map(function (c) { return loadCatalog(c); })).then(paint, paint);
}

var ENTRY_MODALS = {
  'data-style-modal': {
    catalogs: ['styles', 'skills', 'techniques', 'advantages'], find: styleById, missing: 'Estilo não encontrado', href: styleHref, open: 'Abrir página do estilo',
    badges: function (x) { return '<span class="badge">' + svg(ICON.combat, 12, 2.4) + ' Estilo</span>' + (x.cost ? '<span class="spell-badge adv-adv">' + esc(x.cost) + ' pts</span>' : ''); },
    lede: function (x) { return x.cost ? styleCost(x) + ' de Style Familiarity e perks obrigatórios' : 'Custo não informado'; },
    body: function (x) {
      function lists(defs) {
        return defs.filter(function (d) { return x[d[0]]; }).map(function (d) { return '<div class="style-list"><h3>' + d[1] + '</h3>' + styleChipsHtml(x[d[0]], STYLE_KINDS[d[0]]) + '</div>'; }).join('');
      }
      return modalSec('Descrição', modalText(x.description, 'Sem descrição cadastrada.')) +
        modalSec('O estilo ensina', lists(STYLE_LISTS) || '<p class="long none">Nada listado.</p>') +
        (STYLE_OPT_LISTS.some(function (d) { return x[d[0]]; }) ? modalSec('Traços opcionais', lists(STYLE_OPT_LISTS)) : '');
    } },
  'data-weapon-modal': {
    catalogs: ['weapons'], find: weaponById, missing: 'Arma não encontrada', href: weaponHref, open: 'Abrir página da arma',
    badges: function (w) { return '<span class="badge">' + svg(ICON.weapon, 12, 2.4) + ' Arma</span>' + weaponBadge(w); },
    lede: function (w) { var k = weaponSkills(w); return k.length ? k.join(', ') : 'Perícia não informada'; },
    body: function (w) {
      return modalSec('Ataques', weaponAttacksHtml(w)) + modalSec('Descrição', modalText(w.description, 'Sem descrição cadastrada.')) +
        (w.footnotes ? modalSec('Notas da tabela', modalText(w.footnotes, '')) : '') + modalSec('Parâmetros', weaponFactsHtml(w));
    } },
  'data-armor-modal': {
    catalogs: ['armors'], find: armorById, missing: 'Armadura não encontrada', href: armorHref, open: 'Abrir página',
    badges: function (a) { return '<span class="badge">' + svg(ICON.armor, 12, 2.4) + ' ' + esc(armorTypeLabel(a.type)) + '</span>' + armorBadge(a); },
    lede: function (a) { return armorSummary(a) || 'Proteção não informada'; },
    body: function (a) {
      // The table's Notes column is mostly the numbers of the notes below it ("[1, 3]"), as on the page.
      var notes = [/^[\s\d\[\],]*$/.test(a.notes || '') ? '' : a.notes, a.footnotes].filter(Boolean).join('\n');
      return modalSec('Notas', modalText(notes, 'Sem notas.')) + modalSec('Parâmetros', armorFactsHtml(a));
    } },
  'data-item-modal': {
    catalogs: ['items'], find: itemById, missing: 'Item não encontrado', href: itemHref, open: 'Abrir página do item',
    badges: function (x) { return '<span class="badge">' + svg(ICON.item, 12, 2.4) + ' Item</span>' + (x.category ? '<span class="spell-badge adv-exp">' + esc(x.category) + '</span>' : ''); },
    lede: function (x) { return [x.cost || 'Custo não informado', x.weight].filter(Boolean).join(' · '); },
    body: function (x) { return modalSec('Descrição', modalText(x.description, 'Sem descrição cadastrada.')) + modalSec('Parâmetros', modalFacts(ITEM_FIELDS, x)); } },
  'data-impr-modal': {
    catalogs: ['improvements'], find: improvementById, missing: 'Melhoramento não encontrado', href: improvementHref, open: 'Abrir página do melhoramento',
    badges: function (x) { return '<span class="badge">' + svg(ICON.improvement, 12, 2.4) + ' Melhoramento</span>' + (x.appliesTo ? '<span class="spell-badge adv-exp">' + esc(x.appliesTo) + '</span>' : ''); },
    lede: function (x) { return [x.cost || 'Custo não informado', x.weight ? 'Peso ' + x.weight : ''].filter(Boolean).join(' · '); },
    body: function (x) { return modalSec('Descrição', modalText(x.description, 'Sem descrição cadastrada.')) + modalSec('Parâmetros', modalFacts(IMPROVEMENT_FIELDS, x)); } },
  'data-char-modal': {
    catalogs: [], find: charById, missing: 'Personagem não encontrado', href: charHref, open: 'Abrir página do personagem',
    badges: function () { return '<span class="badge">' + svg(ICON.user, 12, 2.4) + ' Personagem</span>'; },
    lede: function (c) { return charSubtitle(c); },
    body: function (c) {
      var orgs = charOrgs(c.id);
      return (c.image ? '<div class="loc-hero" id="entryHero">' + svg(ICON.user, 32, 1.6) + '</div>' : '') +
        modalSec('Descrição', modalText(c.description, 'Sem descrição.')) +
        modalSec('Informações', '<dl class="facts"><dt>Raça</dt><dd>' + (c.race ? esc(c.race) : '<span class="none">Não informada</span>') + '</dd>' +
          '<dt>Organizações</dt><dd>' + (orgs.length ? orgs.map(function (x) { return esc(x.o.name) + (x.rank ? ' · ' + esc(x.rank) : ''); }).join('<br>')
            : c.organization ? esc(c.organization) : '<span class="none">Nenhuma</span>') + '</dd></dl>');
    },
    after: function (c) {
      if (c.image) W.store.imageUrl(c.image.ref).then(function (u) { var h = $('entryHero'); if (h && u) h.innerHTML = '<img src="' + esc(u) + '" alt="' + esc(c.name) + '">'; });
    } }
};
document.addEventListener('click', function (e) {
  if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
  var t = /** @type {AnyEl} */ (e.target); if (!t || !t.closest) return;
  for (var attr in ENTRY_MODALS) {
    var a = t.closest('[' + attr + ']');
    if (a) { e.preventDefault(); openEntryModal(ENTRY_MODALS[attr], a.getAttribute(attr)); return; }
  }
});
