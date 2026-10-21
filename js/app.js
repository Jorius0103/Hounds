/* =====================================================================
   Hounds — Inicialização: marcadores ao vivo, visibilidade das páginas, roteamento, dados e conexão com o banco. Carregado depois de todas as abas.
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   Router + live updates
   ===================================================================== */
function watchMarkersFor(mapId) {
  if (S.markersFor === mapId) return;
  if (S.unMarkers) S.unMarkers();
  S.markersFor = mapId; S.markers = [];
  S.unMarkers = W.store.watch('maps/' + mapId + '/markers', function (list) {
    S.rawMarkers = list; S.markers = list = pub(list);
    if (S.route && S.route.mapId === mapId) { if (S.route.explore) Explorer.setMarkers(list); else renderMapPage(); }
  }, function () { toast('Não foi possível carregar os marcadores.', true); });
}
var topTitle = $('topTitle');



var EYE_ON = '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>';
// The button goes after the title, or first in the page's buttons when it marks them with data-vis-host (Ficha).
function tagPage(item, col) {
  var h1 = pageRoot.querySelector('h1'); if (!h1 || !item || h1.querySelector('.secret-tag') || pageRoot.querySelector('.vis-toggle')) return;
  var secret = isSecret(item), host = pageRoot.querySelector('[data-vis-host]');
  if (secret) h1.insertAdjacentHTML('beforeend', secretTag(item));
  if (!canSetVis(item) || !canWrite()) return;
  function put(html) { if (host) host.insertAdjacentHTML('afterbegin', html); else h1.insertAdjacentHTML('beforeend', html); }
  if (secret && isMestre()) { revealMenu(put, !!host, item, col); return; }
  var who = seenBy(item);
  put('<button class="btn vis-toggle" type="button" id="visToggle">' + (host ? svg(secret ? EYE_ON : EYE_OFF, 15) : '') + (secret ? 'Revelar a todos' : who === 'o Mestre' ? 'Ocultar dos jogadores' : 'Ocultar dos outros') + '</button>');
  $('visToggle').onclick = function () {
    var b = /** @type {AnyEl} */ (this); b.disabled = true;
    (item.catalog ? patchCatalogItem(col, item, { visible: secret, updatedAt: now() }) : W.store.patch(col, item.id, { visible: secret, updatedAt: now() })).then(function () { toast(secret ? 'Agora todos podem ver.' : 'Agora só ' + who + ' ' + seenVerb(item) + '.'); }, function (er) { b.disabled = false; toast(errorText(er), true); });
  };
}
// "Revelar" of a hidden item (Mestre): a menu to show it to everyone or only to chosen accounts (sharedWith).
// revealDraft keeps the open menu and what was ticked while the page redraws with live updates.
var revealDraft = null;
function closeReveal() {
  revealDraft = null;
  var pop = $('visPop'), b = $('visToggle');
  if (pop) pop.hidden = true;
  if (b) b.setAttribute('aria-expanded', 'false');
}
function revealMenu(put, icon, item, col) {
  if (revealDraft && revealDraft.id !== item.id) revealDraft = null;
  // The account linked to a sheet (tab-fichas.js) always sees it: it is not in the list (its link is changed
  // in the sheet), and it stays in sharedWith when the menu saves.
  var linked = col === 'sheets' ? W.users.filter(function (u) { return u.sheetId === item.id; })[0] : null;
  var users = W.users.filter(function (u) { return u.role !== 'mestre' && u !== linked; }).sort(byName);
  var had = (item.sharedWith || []).filter(function (id) { return id !== item.createdBy && users.some(function (u) { return u.id === id; }); });
  put('<span class="vis-menu"><button class="btn vis-toggle" type="button" id="visToggle" aria-haspopup="dialog" aria-expanded="false">' + (icon ? svg(EYE_ON, 15) : '') + 'Revelar' + svg('<path d="m6 9 6 6 6-6"/>', 13, 2.4) + '</button>' +
    '<span class="vis-pop" id="visPop" role="dialog" aria-label="Revelar para" hidden></span></span>');
  var btn = $('visToggle'), pop = $('visPop');
  function sameIds(a, b) { return a.length === b.length && a.every(function (id) { return b.indexOf(id) >= 0; }); }
  function sync() {
    var all = pop.querySelector('[data-all]'), list = pop.querySelector('.vis-users');
    revealDraft.all = all.checked;
    revealDraft.ids = [].map.call(pop.querySelectorAll('input[data-share]:checked:not([data-creator])'), function (el) { return el.getAttribute('data-share'); });
    if (list) { list.classList.toggle('off', all.checked); list.querySelectorAll('input:not([data-creator])').forEach(function (el) { el.disabled = all.checked; }); }
    pop.querySelector('[data-save]').disabled = !revealDraft.all && sameIds(revealDraft.ids, had);
  }
  function open() {
    if (!revealDraft) revealDraft = { id: item.id, all: false, ids: had.slice() };
    var d = revealDraft;
    pop.innerHTML = '<span class="lab">Mostrar para</span>' +
      '<label class="vis-user vis-all"><input type="checkbox" data-all' + (d.all ? ' checked' : '') + '><span>Todos</span><small>Qualquer conta vê</small></label>' +
      (users.length ? '<span class="vis-users">' + users.map(function (u) {
        var creator = item.createdBy === u.id;
        return '<label class="vis-user"><input type="checkbox" data-share="' + esc(u.id) + '"' + (creator ? ' data-creator' : '') +
          (creator || d.ids.indexOf(u.id) >= 0 ? ' checked' : '') + (creator ? ' disabled' : '') + '>' +
          '<span>' + esc(u.name) + '</span><small>' + (creator ? 'Criou' : esc(roleLabel(u.role))) + '</small></label>';
      }).join('') + '</span>' : '') +
      '<span class="btn-row"><button class="btn ghost" type="button" data-cancel>Cancelar</button><button class="btn primary" type="button" data-save>Salvar</button></span>';
    pop.hidden = false; btn.setAttribute('aria-expanded', 'true');
    sync();
    // Keep the menu inside the screen when the button sits near the right edge.
    pop.style.left = '0px';
    var r = pop.getBoundingClientRect(), shift = Math.min(0, window.innerWidth - 16 - r.right);
    pop.style.left = Math.max(shift, 16 - r.left) + 'px';
  }
  btn.onclick = function () { if (pop.hidden) { open(); var f = pop.querySelector('input'); if (f) f.focus(); } else closeReveal(); };
  pop.onchange = sync;
  pop.onclick = function (e) {
    if (e.target.closest('[data-cancel]')) { closeReveal(); btn.focus(); return; }
    var save = e.target.closest('[data-save]'); if (!save) return;
    var d = revealDraft, ids = linked ? d.ids.concat([linked.id]) : d.ids;
    var p = d.all ? { visible: true, updatedAt: now() } : { sharedWith: ids, updatedAt: now() };
    save.disabled = true;
    (item.catalog ? patchCatalogItem(col, item, p) : W.store.patch(col, item.id, p)).then(function () {
      closeReveal();
      var after = { createdBy: item.createdBy, sharedWith: ids };
      toast(d.all ? 'Agora todos podem ver.' : 'Agora só ' + seenBy(after) + ' ' + seenVerb(after) + '.');
    }, function (er) { save.disabled = false; toast(errorText(er), true); });
  };
  if (revealDraft) open();
}
document.addEventListener('mousedown', function (e) { if (revealDraft && !(e.target.closest && e.target.closest('.vis-menu'))) closeReveal(); });
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && revealDraft) { closeReveal(); var b = $('visToggle'); if (b) b.focus(); } });
window.addEventListener('hashchange', function () { revealDraft = null; });
var _rMap = renderMapPage, _rLoc = renderLocalPage, _rChar = renderCharPage;
// @ts-expect-error -- substitui a função de tab-mapas.js por uma que também desenha o botão de visibilidade
renderMapPage = function () { _rMap(); tagPage(mapById(S.route.mapId), 'maps'); };
// @ts-expect-error -- idem, tab-locais.js
renderLocalPage = function () { _rLoc(); tagPage(locById(S.route.locId), 'locations'); };
// @ts-expect-error -- idem, tab-personagens.js
renderCharPage = function () { _rChar(); tagPage(charById(S.route.charId), 'characters'); };
var _rOrg = renderOrgPage;
// @ts-expect-error -- idem, tab-organizacoes.js
renderOrgPage = function () { _rOrg(); tagPage(orgById(S.route.orgId), 'organizations'); };
var _rSheet = renderSheetPage, _rEvent = renderEventPage;
// @ts-expect-error -- idem, tab-fichas.js
renderSheetPage = function () { _rSheet(); tagPage(sheetById(S.route.sheetId), 'sheets'); };
// @ts-expect-error -- idem, tab-eventos.js
renderEventPage = function () { _rEvent(); tagPage(eventById(S.route.eventId), 'events'); };
var _rSpell = renderSpellPage;
// @ts-expect-error -- idem, tab-magias.js
renderSpellPage = function () { _rSpell(); tagPage(spellById(S.route.spellId), 'spells'); };
var _rAdv = renderAdvantagePage;
// @ts-expect-error -- idem, tab-vantagens.js
renderAdvantagePage = function () { _rAdv(); tagPage(advById(S.route.advId), 'advantages'); };
var _rDisadv = renderDisadvantagePage;
// @ts-expect-error -- idem, tab-desvantagens.js
renderDisadvantagePage = function () { _rDisadv(); tagPage(disadvById(S.route.disadvId), 'disadvantages'); };
var _rSkill = renderSkillPage;
// @ts-expect-error -- idem, tab-pericias.js
renderSkillPage = function () { _rSkill(); tagPage(skillById(S.route.skillId), 'skills'); };
var _rTech = renderTechniquePage;
// @ts-expect-error -- idem, tab-combate.js
renderTechniquePage = function () { _rTech(); tagPage(techById(S.route.techId), 'techniques'); };
var _rStyle = renderStylePage;
// @ts-expect-error -- idem, tab-combate.js
renderStylePage = function () { _rStyle(); tagPage(styleById(S.route.styleId), 'styles'); };
var _rWeapon = renderWeaponPage, _rArmor = renderArmorPage;
// @ts-expect-error -- idem, tab-armas.js
renderWeaponPage = function () { _rWeapon(); tagPage(weaponById(S.route.weaponId), 'weapons'); };
// @ts-expect-error -- idem, tab-armaduras.js
renderArmorPage = function () { _rArmor(); tagPage(armorById(S.route.armorId), 'armors'); };
var _rItem = renderItemPage;
// @ts-expect-error -- idem, tab-itens.js
renderItemPage = function () { _rItem(); tagPage(itemById(S.route.itemId), 'items'); };
var _rImprovement = renderImprovementPage;
// @ts-expect-error -- idem, tab-melhoramentos.js
renderImprovementPage = function () { _rImprovement(); tagPage(improvementById(S.route.improvementId), 'improvements'); };

// One-time: items created before the visibility flag existed become Mestre-only.
var migratedVis = false;
function migrateVisibility() {
  if (migratedVis || !isMestre() || !canWrite() || !W.loaded.maps || !W.loaded.locations || !W.loaded.characters) return;
  migratedVis = true;
  var seq = /** @type {Promise<any>} */ (Promise.resolve()), t = now();
  function fix(col, list) { list.forEach(function (x) { if (!('visible' in x)) seq = seq.then(function () { return W.store.patch(col, x.id, { visible: false, updatedAt: t }).catch(function () {}); }); }); }
  fix('maps', W.raw.maps); fix('locations', W.raw.locations); fix('characters', W.raw.characters);
  W.raw.maps.forEach(function (m) {
    var col = 'maps/' + m.id + '/markers';
    seq = seq.then(function () { return W.store.all(col).then(function (l) { var q = /** @type {Promise<any>} */ (Promise.resolve()); l.forEach(function (mk) { if (!('visible' in mk)) q = q.then(function () { return W.store.patch(col, mk.id, { visible: false, updatedAt: t }).catch(function () {}); }); }); return q; }).catch(function () {}); });
  });
}
window.addEventListener('hub:user', migrateVisibility);
window.addEventListener('hub:user', migrateOrganizations);
window.addEventListener('hub:user', function () {
  refilter();
  renderMenu();
  if (S.route && S.route.page !== 'mesa' && S.route.page !== 'users' && !modalOpen) renderPage();
  if (S.route && S.route.page === 'users') { topTitle.textContent = byId.users ? byId.users.label : 'Usuários'; renderPage(); }
});



function renderPage() {
  var r = S.route; if (!r) return;
  if (r.page !== 'sheet') paintAllyView(false);
  if (r.page === 'mesa') return;
  if (r.page === 'board') { renderBoardPage(); return; }
  // The long card lists use the width of the screen; the other pages keep a reading width.
  pageRoot.classList.toggle('wide', r.page === 'spells' || r.page === 'advs' || r.page === 'disadvs' || r.page === 'skills' || r.page === 'combat' || r.page === 'weapons' || r.page === 'armors' || r.page === 'items' || r.page === 'improvements' || r.page === 'sheet');
  if (!W.store) { pageRoot.innerHTML = '<p class="lede">Carregando…</p>'; return; }
  if (r.page === 'home') renderHomePage();
  else if (r.page === 'boards') renderBoardsPage();
  else if (r.page === 'maps') renderMapsPage();
  else if (r.page === 'map') { watchMarkersFor(r.mapId); renderMapPage(); var m = mapById(r.mapId); if (r.explore && m) Explorer.open(m); }
  else if (r.page === 'locais') renderLocaisPage();
  else if (r.page === 'local') renderLocalPage();
  else if (r.page === 'chars') renderCharsPage();
  else if (r.page === 'char') renderCharPage();
  else if (r.page === 'sheets') renderSheetsPage();
  else if (r.page === 'sheet') renderSheetPage();
  else if (r.page === 'events') renderEventsPage();
  else if (r.page === 'event') renderEventPage();
  else if (r.page === 'orgs') renderOrgsPage();
  else if (r.page === 'org') renderOrgPage();
  else if (r.page === 'spells') renderSpellsPage();
  else if (r.page === 'spell') renderSpellPage();
  else if (r.page === 'advs') renderAdvantagesPage();
  else if (r.page === 'adv') renderAdvantagePage();
  else if (r.page === 'disadvs') renderDisadvantagesPage();
  else if (r.page === 'disadv') renderDisadvantagePage();
  else if (r.page === 'skills') renderSkillsPage();
  else if (r.page === 'skill') renderSkillPage();
  else if (r.page === 'combat') renderCombatPage();
  else if (r.page === 'tech') renderTechniquePage();
  else if (r.page === 'style') renderStylePage();
  else if (r.page === 'weapons') renderWeaponsPage();
  else if (r.page === 'weapon') renderWeaponPage();
  else if (r.page === 'armors') renderArmorsPage();
  else if (r.page === 'armor') renderArmorPage();
  else if (r.page === 'items') renderItemsPage();
  else if (r.page === 'item') renderItemPage();
  else if (r.page === 'improvements') renderImprovementsPage();
  else if (r.page === 'improvement') renderImprovementPage();
  else if (r.page === 'users') renderUsersPage();
  else if (r.page === 'notes') renderNotesPage();
  else if (r.page === 'nb') renderNotebookPage();
  else if (r.page === 'note') renderNotePage();
}
function onRoute() {
  var r = parseRoute();
  if (!r) r = { page: 'home', node: null };
  var prev = S.route;
  if (!prev || prev.node !== r.node) S.ui = { q: prev && prev.page === r.page ? S.ui.q : '' };
  // Another ally of the same sheet: its own drafts and choices, in the same tab (Ficha, Equip. or Magia).
  else if (r.page === 'sheet' && prev.allyId !== r.allyId) S.ui = { q: '', sheetTab: S.ui.sheetTab };
  S.route = r;
  if (r.node && !byId[r.node] && /^(spell|adv|disadv|c?skill|tech|style|weapon|armor|item):/.test(r.node)) renderMenu(); // the menu lists only the open one
  // The Mesa and a board use the whole screen: the menu stays collapsed and opens over them.
  var wasMesa = app.classList.contains('on-mesa'), isMesa = r.page === 'mesa' || r.page === 'board';
  app.classList.toggle('on-mesa', isMesa);
  if (isMesa) setCollapsed(true, true);
  else if (wasMesa) setCollapsed(lstore('hounds_rail_collapsed') === '1', true);
  if (r.page !== 'board') BoardView.close();
  document.querySelectorAll('.view').forEach(function (v) { v.hidden = v.id !== (r.page === 'mesa' ? 'view-mesa' : r.page === 'board' ? 'view-board' : 'view-page'); });
  if (byId[r.node]) { revealPath(r.node); if (r.page === 'boards' || r.page === 'maps' || r.page === 'locais' || r.page === 'chars' || r.page === 'sheets' || r.page === 'orgs' || r.page === 'events' || r.page === 'spells' || r.page === 'advs' || r.page === 'disadvs' || r.page === 'skills' || r.page === 'combat' || r.page === 'weapons' || r.page === 'armors' || r.page === 'items' || r.page === 'improvements' || r.page === 'notes' || r.page === 'nb') expand(r.node); }
  paintMenu();
  topTitle.textContent = r.page === 'home' ? 'Início' : byId[r.node] ? byId[r.node].label : 'Hounds';
  if (r.page !== 'home') lstore('hounds_route', r.page === 'map' ? mapHref(r.mapId) : r.page === 'local' ? locHref(r.locId) : r.page === 'char' ? charHref(r.charId) : r.page === 'spell' ? spellHref(r.spellId) : r.page === 'sheet' && r.allyId ? allyHref(r.sheetId, r.allyId) : hrefFor(r.node));
  if (!(r.page === 'map' && r.explore)) Explorer.close();
  if (prev && prev.node !== r.node) { var pg = $('view-page'); if (pg) pg.scrollTop = 0; }
  renderPage();
}
window.addEventListener('hashchange', onRoute);

function onData(kind) {
  migrateVisibility();
  if (kind === 'maps') indexMaps();
  if (kind === 'locations') indexLocations();
  if (kind === 'characters') indexCharacters();
  if (kind === 'organizations') indexOrgs();
  if (kind === 'spells') indexSpells();
  if (kind === 'advantages') indexAdvantages();
  if (kind === 'disadvantages') indexDisadvantages();
  if (kind === 'skills') indexSkills();
  if (kind === 'techniques') indexTechniques();
  if (kind === 'styles') indexStyles();
  if (kind === 'weapons') indexWeapons();
  if (kind === 'armors') indexArmors();
  if (kind === 'items') indexItems();
  if (kind === 'improvements') indexImprovements();
  if (kind === 'sheets') indexSheets();
  if (kind === 'events') indexEvents();
  // The open board follows its document even with a form open (the forms below wait).
  if (kind === 'boards') { indexBoards(); BoardView.sync(); }
  migrateOrganizations();
  renderMenu();
  if (!S.route) return;
  topTitle.textContent = byId[S.route.node] ? byId[S.route.node].label : topTitle.textContent;
  if (Explorer.isOpen() && S.route.explore) {
    var m = mapById(S.route.mapId); if (m) Explorer.open(m);
    Explorer.refresh();
    return;
  }
  if (modalOpen) return; // keep forms stable while open; pages refresh when they close
  if (S.route.page === 'note' && S.ui.editing) return;
  if (S.route.page === 'sheet' && (S.ui.attrDraft || sheetDraftOpen() || gearEditing() || S.ui.dragging)) return; // a section being edited; the page redraws on save or cancel
  if (S.route.page === 'sheet' && document.activeElement && document.activeElement.classList.contains('gpts-in')) { S.ui.ptsStale = true; return; } // points being typed in the table; redraws when the field is left
  if (S.route.page === 'maps' && document.activeElement && document.activeElement.id === 'mapSearch') { renderMapList(); return; }
  if (S.route.page === 'locais' && kind !== 'maps' && document.activeElement && document.activeElement.id === 'locSearch') { renderLocList(); return; }
  if (S.route.page === 'chars' && document.activeElement && document.activeElement.id === 'charSearch') { renderCharList(); return; }
  if (S.route.page === 'orgs' && kind !== 'maps' && document.activeElement && document.activeElement.id === 'orgSearch') { renderOrgList(); return; }
  if (S.route.page === 'sheets' && document.activeElement && document.activeElement.id === 'sheetSearch') { renderSheetList(); return; }
  if (S.route.page === 'events' && document.activeElement && document.activeElement.id === 'eventSearch') { renderEventList(); return; }
  if (S.route.page === 'spells' && kind !== 'maps' && document.activeElement && document.activeElement.id === 'spellSearch') { renderSpellList(); return; }
  if (S.route.page === 'advs' && kind !== 'maps' && document.activeElement && document.activeElement.id === 'advSearch') { renderAdvList(); return; }
  if (S.route.page === 'disadvs' && kind !== 'maps' && document.activeElement && document.activeElement.id === 'disadvSearch') { renderDisadvList(); return; }
  if (S.route.page === 'skills' && kind !== 'maps' && document.activeElement && document.activeElement.id === 'skillSearch') { renderSkillList(); return; }
  if (S.route.page === 'combat' && kind !== 'maps' && document.activeElement && document.activeElement.id === 'combatSearch') { renderCombatList(); return; }
  if (S.route.page === 'weapons' && kind !== 'maps' && document.activeElement && document.activeElement.id === 'weaponSearch') { renderWeaponList(); return; }
  if (S.route.page === 'armors' && kind !== 'maps' && document.activeElement && document.activeElement.id === 'armorSearch') { renderArmorList(); return; }
  if (S.route.page === 'items' && kind !== 'maps' && document.activeElement && document.activeElement.id === 'itemSearch') { renderItemList(); return; }
  if (S.route.page === 'improvements' && kind !== 'maps' && document.activeElement && document.activeElement.id === 'improvementSearch') { renderImprovementList(); return; }
  renderPage();
}

/* =====================================================================
   Start
   ===================================================================== */
setCollapsed(lstore('hounds_rail_collapsed') === '1');
// F5 keeps the page: the address's, or, where the reload loses it, the last one of this browser.
// Any other visit opens its link, or the home page; logging in always goes to the home page (gate.js).
function pageReloaded() {
  try {
    var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    return nav ? /** @type {PerformanceNavigationTiming} */ (nav).type === 'reload' : !!(performance.navigation && performance.navigation.type === 1);
  } catch (e) { return false; }
}
if (!location.hash && pageReloaded()) {
  var savedRoute = lstore('hounds_route');
  if (savedRoute) {
    try { location.hash = savedRoute; } catch (e) {}
  }
}
onRoute();

function connect() {
  var use = window.claude && typeof window.claude.use === 'function' ? function (n) { return window.claude.use(n).catch(function () { return null; }); } : function () { return Promise.resolve(null); };
  return Promise.all([use('db'), use('assets'), use('user')]).then(function (r) {
    if (r[0]) return SharedStore(r[0], r[1], r[2]);
    var sb = sbConfig();
    if (sb) return connectSupabase(sb).catch(function (e) { console.error('Supabase connect error:', e); return null; });
    var fb = fbConfig();
    if (fb) return connectFirebase(fb).catch(function () { return null; });
    try { return window.indexedDB ? LocalStore() : null; } catch (e) { return null; }
  });
}
// The spells, advantages, disadvantages, skills, techniques, styles, weapons, armors, items and improvements of the books are files, not database documents (see
// "Catálogos de GURPS" in mundo.js). Their documents change in bursts (a cleanup removes
// hundreds at once), so their redraws wait a moment and happen once per burst.
var catalogTimers = {};
function onCatalogDocs(col, list) {
  W.raw[col] = list; CATALOG[col].dbReady = true;
  if (catalogTimers[col]) return;
  catalogTimers[col] = setTimeout(function () {
    catalogTimers[col] = 0;
    mergeCatalog(col); onData(col); cleanCatalogCopies(col);
  }, 80);
}
// Older versions of the site copied the books into the database. Once per browser, the
// Mestre's copy removes those copies, keeping his own changes; it needs the book list.
var catalogCleanTried = {};
function cleanCatalogCopies(col) {
  if (catalogCleanTried[col] || !CATALOG[col].dbReady || !isMestre() || !canWrite() || lstore('hounds_catalog_clean_' + col) === CATALOG_VERSION) return;
  if (!(W.raw[col] || []).some(function (d) { return isCatalogId(col, d.id); })) { lstore('hounds_catalog_clean_' + col, CATALOG_VERSION); return; }
  catalogCleanTried[col] = true;
  loadCatalog(col).then(function () {
    if (!CATALOG[col].list) return;
    return Ops.cleanCatalogCopies(col, CATALOG[col].fields).then(function (n) {
      lstore('hounds_catalog_clean_' + col, CATALOG_VERSION);
      if (n) console.info('Hounds: ' + n + ' cópias de ' + col + ' removidas do banco.');
    });
  }).catch(function (err) { console.warn('Falha ao limpar ' + col + ':', err); });
}
// The account (and whether it is the Mestre's) may arrive after the documents.
window.addEventListener('hub:user', function () { Object.keys(CATALOG).forEach(cleanCatalogCopies); });

connect().then(function (s) {
  if (!s) { W.loaded = { maps: true, locations: true, characters: true, organizations: true, spells: true, advantages: true, disadvantages: true, skills: true, techniques: true, styles: true, weapons: true, armors: true, items: true, improvements: true, sheets: true, events: true, users: true, notebooks: true, notes: true, boards: true }; renderMenu(); pageRoot.innerHTML = '<p class="notice">Não foi possível acessar o armazenamento nesta visualização.</p>'; return; }
  W.store = s;
  return s.init().then(function () {
    var fail = function () { toast('Não foi possível carregar os dados.', true); };
    s.watch('maps', function (l) { W.raw.maps = l; W.maps = pub(l); W.loaded.maps = true; onData('maps'); }, fail);
    s.watch('locations', function (l) { W.raw.locations = l; W.locations = pub(l); W.loaded.locations = true; onData('locations'); }, fail);
    s.watch('characters', function (l) { W.raw.characters = l; W.characters = pub(l); W.loaded.characters = true; onData('characters'); }, fail);
    s.watch('organizations', function (l) { W.raw.organizations = l; W.organizations = pub(l); W.loaded.organizations = true; onData('organizations'); }, fail);
    s.watch('sheets', function (l) { W.raw.sheets = l; W.sheets = pub(l); W.loaded.sheets = true; onData('sheets'); }, fail);
    s.watch('events', function (l) { W.raw.events = l; W.events = pub(l); W.loaded.events = true; onData('events'); }, fail);
    // Tabuleiros: the boards always (menu, list); the tokens only while a board is open (BoardView).
    s.watch('boards', function (l) { W.raw.boards = l; W.boards = pub(l); W.loaded.boards = true; onData('boards'); }, fail);
    // Where the players are (the ribbon): a player on a board follows the Mestre to another one.
    BoardPages.start();
    s.watch('users', onUsers, fail);
    MesaSync.start();
    s.watch('notebooks', function (l) { W.raw.notebooks = l; filterNotes(); W.loaded.notebooks = true; onData('notes'); }, fail);
    s.watch('notes', function (l) { W.raw.notes = l; filterNotes(); W.loaded.notes = true; onData('notes'); }, fail);
    s.watch('spells', function (l) { onCatalogDocs('spells', l); }, fail);
    s.watch('advantages', function (l) { onCatalogDocs('advantages', l); }, fail);
    s.watch('disadvantages', function (l) { onCatalogDocs('disadvantages', l); }, fail);
    s.watch('skills', function (l) { onCatalogDocs('skills', l); }, fail);
    s.watch('techniques', function (l) { onCatalogDocs('techniques', l); }, fail);
    s.watch('styles', function (l) { onCatalogDocs('styles', l); }, fail);
    s.watch('weapons', function (l) { onCatalogDocs('weapons', l); }, fail);
    s.watch('armors', function (l) { onCatalogDocs('armors', l); }, fail);
    s.watch('items', function (l) { onCatalogDocs('items', l); }, fail);
    s.watch('improvements', function (l) { onCatalogDocs('improvements', l); }, fail);
    // Criar Armadura's table (Ficha › Equip.): locations and percentages.
    s.watch('armorLocs', function (l) { W.raw.armorLocs = l; onData('armorRules'); }, fail);
  });
}).catch(function () { toast('Não foi possível carregar os dados.', true); });
