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



function tagPage(item, col) {
  var h1 = pageRoot.querySelector('h1'); if (!h1 || !item || h1.querySelector('.secret-tag, .vis-toggle')) return;
  var secret = isSecret(item);
  if (secret) h1.insertAdjacentHTML('beforeend', secretTag(item));
  if (!canSetVis(item) || !canWrite()) return;
  var who = seenBy(item);
  h1.insertAdjacentHTML('beforeend', '<button class="btn vis-toggle" type="button" id="visToggle">' + (secret ? 'Revelar a todos' : who === 'o Mestre' ? 'Ocultar dos jogadores' : 'Ocultar dos outros') + '</button>');
  $('visToggle').onclick = function () {
    var b = /** @type {AnyEl} */ (this); b.disabled = true;
    W.store.patch(col, item.id, { visible: secret, updatedAt: now() }).then(function () { toast(secret ? 'Agora todos podem ver.' : 'Agora só ' + who + ' ' + seenVerb(item) + '.'); }, function (er) { b.disabled = false; toast(errorText(er), true); });
  };
}
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
  if (r.page === 'mesa') return;
  if (!W.store) { pageRoot.innerHTML = '<p class="lede">Carregando…</p>'; return; }
  if (r.page === 'home') renderHomePage();
  else if (r.page === 'maps') renderMapsPage();
  else if (r.page === 'map') { watchMarkersFor(r.mapId); renderMapPage(); var m = mapById(r.mapId); if (r.explore && m) Explorer.open(m); }
  else if (r.page === 'locais') renderLocaisPage();
  else if (r.page === 'local') renderLocalPage();
  else if (r.page === 'chars') renderCharsPage();
  else if (r.page === 'char') renderCharPage();
  else if (r.page === 'orgs') renderOrgsPage();
  else if (r.page === 'org') renderOrgPage();
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
  S.route = r;
  var wasMesa = app.classList.contains('on-mesa'), isMesa = r.page === 'mesa';
  app.classList.toggle('on-mesa', isMesa);
  if (isMesa) setCollapsed(true, true);
  else if (wasMesa) setCollapsed(lstore('hounds_rail_collapsed') === '1', true);
  document.querySelectorAll('.view').forEach(function (v) { v.hidden = v.id !== (r.page === 'mesa' ? 'view-mesa' : 'view-page'); });
  if (byId[r.node]) { revealPath(r.node); if (r.page === 'maps' || r.page === 'locais' || r.page === 'chars' || r.page === 'orgs' || r.page === 'notes' || r.page === 'nb') expand(r.node); }
  paintMenu();
  topTitle.textContent = r.page === 'home' ? 'Início' : byId[r.node] ? byId[r.node].label : 'Hounds';
  if (r.page !== 'home') lstore('hounds_route', r.page === 'map' ? mapHref(r.mapId) : r.page === 'local' ? locHref(r.locId) : r.page === 'char' ? charHref(r.charId) : hrefFor(r.node));
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
  if (S.route.page === 'locais' && kind !== 'maps' && document.activeElement && document.activeElement.id === 'locSearch') { renderLocList(); return; }
  if (S.route.page === 'chars' && document.activeElement && document.activeElement.id === 'charSearch') { renderCharList(); return; }
  if (S.route.page === 'orgs' && kind !== 'maps' && document.activeElement && document.activeElement.id === 'orgSearch') { renderOrgList(); return; }
  renderPage();
}

/* =====================================================================
   Start
   ===================================================================== */
setCollapsed(lstore('hounds_rail_collapsed') === '1');
renderMenu();
if (location.hash) { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} }
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
connect().then(function (s) {
  if (!s) { W.loaded = { maps: true, locations: true, characters: true, organizations: true, users: true, notebooks: true, notes: true }; renderMenu(); pageRoot.innerHTML = '<p class="notice">Não foi possível acessar o armazenamento nesta visualização.</p>'; return; }
  W.store = s;
  return s.init().then(function () {
    var fail = function () { toast('Não foi possível carregar os dados.', true); };
    s.watch('maps', function (l) { W.raw.maps = l; W.maps = pub(l); W.loaded.maps = true; onData('maps'); }, fail);
    s.watch('locations', function (l) { W.raw.locations = l; W.locations = pub(l); W.loaded.locations = true; onData('locations'); }, fail);
    s.watch('characters', function (l) { W.raw.characters = l; W.characters = pub(l); W.loaded.characters = true; onData('characters'); }, fail);
    s.watch('organizations', function (l) { W.raw.organizations = l; W.organizations = pub(l); W.loaded.organizations = true; onData('organizations'); }, fail);
    s.watch('users', onUsers, fail);
    MesaSync.start();
    s.watch('notebooks', function (l) { W.raw.notebooks = l; filterNotes(); W.loaded.notebooks = true; onData('notes'); }, fail);
    s.watch('notes', function (l) { W.raw.notes = l; filterNotes(); W.loaded.notes = true; onData('notes'); }, fail);
  });
}).catch(function () { toast('Não foi possível carregar os dados.', true); });
