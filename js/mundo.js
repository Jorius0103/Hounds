/* =====================================================================
   Hounds — Modelo do mundo: mapas, locais, personagens, relações, visibilidade e gravações
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   World model: maps, locations, characters and their relations.
   Everything derived (hierarchy, paths, counts) is recomputed from the
   stored documents, so a change anywhere shows up everywhere.
   ===================================================================== */
/** @type {World} */
var W = { store: null, maps: [], locations: [], characters: [], organizations: [], spells: [], advantages: [], skills: [], techniques: [], styles: [], sheets: [], events: [],
          raw: { maps: [], locations: [], characters: [], organizations: [], spells: [], advantages: [], skills: [], techniques: [], styles: [], sheets: [], events: [], notebooks: [], notes: [] }, notebooks: [], notes: [], users: [],
          loaded: { maps: false, locations: false, characters: false, organizations: false, spells: false, advantages: false, skills: false, techniques: false, styles: false, sheets: false, events: false, users: false, notebooks: false, notes: false },
          mapIdx: {}, locIdx: {}, charIdx: {}, orgIdx: {}, spellIdx: {}, advIdx: {}, skillIdx: {}, techIdx: {}, styleIdx: {}, sheetIdx: {}, eventIdx: {}, parent: {}, kids: {}, locParent: {}, locKids: {} };
// The same ids once each, in order: links are lists of ids and must never repeat one.
function uniqIds(ids) { var seen = {}; return (ids || []).filter(function (id) { if (!id || seen[id]) return false; seen[id] = true; return true; }); }
// Ids picked in a form plus the ones this user can't see (and so couldn't pick), which are kept.
function keepHidden(picked, prev, col, idx) {
  var out = uniqIds(picked);
  (prev || []).forEach(function (id) { if (!idx[id] && rawHas(col, id) && out.indexOf(id) < 0) out.push(id); });
  return out;
}

// Effective parent of each item of a tree (maps, locations): ignore missing parents,
// self references and anything that would loop. Also the children of each id, by name.
/** @template {{ id: string, name: string, parentId?: string | null }} T @param {T[]} list @param {Record<string, T>} idx */
function treeOf(list, idx) {
  var parent = /** @type {Record<string, string | null>} */ ({});
  list.forEach(function (m) {
    var p = m.parentId;
    if (!p || !idx[p] || p === m.id) { parent[m.id] = null; return; }
    var seen = {}; seen[m.id] = true; var cur = p, loop = false;
    while (cur) { if (seen[cur]) { loop = true; break; } seen[cur] = true; cur = idx[cur] && idx[cur].parentId; if (cur && !idx[cur]) cur = null; }
    parent[m.id] = loop ? null : p;
  });
  var kids = /** @type {Record<string, T[]>} */ ({}); list.forEach(function (m) { var p = parent[m.id] || ''; (kids[p] = kids[p] || []).push(m); });
  Object.keys(kids).forEach(function (k) { kids[k].sort(byName); });
  return { parent: parent, kids: kids };
}
function indexMaps() {
  var idx = /** @type {Record<string, HMap>} */ ({}); W.maps.forEach(function (m) { idx[m.id] = m; }); W.mapIdx = idx;
  var t = treeOf(W.maps, idx); W.parent = t.parent; W.kids = t.kids;
}
function indexLocations() {
  var idx = /** @type {Record<string, HLocation>} */ ({}); W.locations.forEach(function (l) { idx[l.id] = l; }); W.locIdx = idx;
  var t = treeOf(W.locations, idx); W.locParent = t.parent; W.locKids = t.kids;
}
function indexCharacters() { var idx = /** @type {Record<string, Character>} */ ({}); W.characters.forEach(function (c) { idx[c.id] = c; }); W.charIdx = idx; }
function indexSpells() { var idx = /** @type {Record<string, Spell>} */ ({}); (W.spells || []).forEach(function (s) { idx[s.id] = s; }); W.spellIdx = idx; }
function spellById(id) {
  if (!id) return null;
  if (W.spellIdx && W.spellIdx[id]) return W.spellIdx[id];
  var spells = W.spells || [];
  // 1. Tentar por slug do nome (ex: "spell_create-air_120" -> "create-air" -> "create air")
  var slug = String(id).toLowerCase().replace(/^spell_/, '').replace(/_\d+$/, '').replace(/[-_]/g, ' ').trim();
  if (slug) {
    var matchName = spells.filter(function (s) { return norm(s.name) === norm(slug); })[0];
    if (matchName) return matchName;
  }
  // 2. Tentar por prefixo de ID (ex: "spell_create-air" em "spell_create-air_2")
  var idPrefix = String(id).toLowerCase().replace(/_\d+$/, '');
  if (idPrefix) {
    var matchPrefix = spells.filter(function (s) { return s.id && s.id.toLowerCase().indexOf(idPrefix) === 0; })[0];
    if (matchPrefix) return matchPrefix;
  }
  // 3. Fallback: procurar por substring no nome
  var cleanId = String(id).toLowerCase().replace(/[_-]/g, ' ');
  for (var i = 0; i < spells.length; i++) {
    if (cleanId.indexOf(norm(spells[i].name)) >= 0) return spells[i];
  }
  return null;
}
/* =====================================================================
   Catálogos de GURPS (magias, vantagens, perícias, técnicas e estilos dos livros)
   The book entries live in dados/magias.json, dados/vantagens.json, dados/pericias.json,
   dados/tecnicas.json and dados/estilos.json, fetched only when
   someone opens their tab and then cached by the browser. The database keeps just the
   Mestre's own work: entries he created (random ids), and for a book entry, a document
   with the same id (spell_*, adv_*, skill_*, tech_*, style_*) holding his edits, his visibility
   choice, or deleted: true. W.spells / W.advantages / W.skills / W.techniques / W.styles are the
   book list with those documents on top.
   ===================================================================== */
var CATALOG_VERSION = '2026-10-13-v2';
// fields: what an entry holds besides visibility; over: the documents of book entries by id;
// deleted: the book entries the Mestre deleted (for him to see and restore).
var CATALOG = {
  spells: { file: 'dados/magias.json', prefix: 'spell_', list: null, idx: null, over: {}, deleted: [], loading: null, failed: false, dbReady: false,
    fields: ['name', 'difficulty', 'class', 'college', 'timeToCast', 'duration', 'initialCost', 'maintenanceCost', 'prerequisites', 'description', 'item', 'page', 'source'] },
  advantages: { file: 'dados/vantagens.json', prefix: 'adv_', list: null, idx: null, over: {}, deleted: [], loading: null, failed: false, dbReady: false,
    fields: ['name', 'cost', 'type', 'book', 'page', 'description'] },
  skills: { file: 'dados/pericias.json', prefix: 'skill_', list: null, idx: null, over: {}, deleted: [], loading: null, failed: false, dbReady: false,
    fields: ['name', 'type', 'attribute', 'difficulty', 'specialty', 'cinematic', 'defaults', 'prerequisites', 'description', 'modifiers', 'book', 'page'] },
  techniques: { file: 'dados/tecnicas.json', prefix: 'tech_', list: null, idx: null, over: {}, deleted: [], loading: null, failed: false, dbReady: false,
    fields: ['name', 'difficulty', 'cinematic', 'defaults', 'prerequisites', 'description', 'modifiers', 'book', 'page'] },
  styles: { file: 'dados/estilos.json', prefix: 'style_', list: null, idx: null, over: {}, deleted: [], loading: null, failed: false, dbReady: false,
    fields: ['name', 'cost', 'description', 'skills', 'techniques', 'cinematicSkills', 'cinematicTechniques', 'perks',
      'optAdvantages', 'optDisadvantages', 'optSkills', 'optTechniques', 'optPerks', 'book', 'page'] }
};
function isCatalogId(col, id) { return String(id || '').indexOf(CATALOG[col].prefix) === 0; }
function loadCatalog(col) {
  var c = CATALOG[col];
  if (c.list || c.failed) return Promise.resolve();
  if (c.loading) return c.loading;
  c.loading = fetch(c.file + '?v=' + CATALOG_VERSION).then(function (res) {
    if (!res.ok) throw new Error('Não foi possível carregar ' + c.file);
    return res.json();
  }).then(function (list) {
    var idx = {};
    list.forEach(function (x) { x.catalog = true; idx[x.id] = x; });
    c.list = list; c.idx = idx; c.loading = null;
    mergeCatalog(col); onData(col);
  }, function (er) {
    c.loading = null; c.failed = true;
    mergeCatalog(col); onData(col);
    toast(errorText(er), true);
  });
  return c.loading;
}
// The database documents of a catalog collection arrived (or the user changed): rebuild the list.
function mergeCatalog(col) {
  var c = CATALOG[col], raw = W.raw[col] || [], over = {}, out = [], deleted = [];
  raw.forEach(function (d) { if (isCatalogId(col, d.id)) over[d.id] = d; });
  (c.list || []).forEach(function (x) {
    var o = over[x.id];
    if (!o) out.push(x); else if (!o.deleted) out.push(Object.assign({}, x, o, { catalog: true })); else deleted.push(x);
  });
  c.over = over;
  c.deleted = isMestre() ? deleted.sort(byName) : [];
  // Without the book list (not opened yet), the documents of book entries mean nothing on their own.
  raw.forEach(function (d) { if (!isCatalogId(col, d.id) && !d.deleted) out.push(d); });
  // Sorted here, once per change, so the lists and searches can keep this order.
  W[col] = pub(out).sort(byName);
  W.loaded[col] = c.dbReady && (!!c.list || c.failed);
}
// What the Mestre did to an entry: 'created' (his own), 'edited' (a book entry with other
// text), 'hidden' (a book entry he hid, text unchanged), 'deleted', or '' (as in the book).
function catalogChange(col, x) {
  if (!x) return '';
  if (!x.catalog) return 'created';
  var c = CATALOG[col], d = c.over[x.id], orig = c.idx && c.idx[x.id];
  if (!d) return '';
  if (d.deleted) return 'deleted';
  if (orig && c.fields.some(function (k) { return k in d && (d[k] || '') !== (orig[k] || ''); })) return 'edited';
  // Same text as the book: a change only while hidden (shown again, it is back to the book's state).
  return d.visible === false || (d.sharedWith || []).length ? 'hidden' : '';
}
// A change to a book entry: the first one creates its document, later ones update it.
function patchCatalogItem(col, item, p) {
  if (rawHas(col, item.id)) return W.store.patch(col, item.id, p);
  var t = now();
  return W.store.put(col, item.id, Object.assign({ v: 1, createdBy: null, createdAt: t, updatedAt: t }, p));
}
// Search text of an entry, normalized once (the descriptions are long).
var searchCache = typeof WeakMap === 'function' ? new WeakMap() : null;
function searchText(x, fields) {
  var hit = searchCache && searchCache.get(x);
  if (hit != null) return hit;
  var t = norm(fields.map(function (k) { return x[k] || ''; }).join(' '));
  if (searchCache) searchCache.set(x, t);
  return t;
}
function mapById(id) { return W.mapIdx[id] || null; }
function locById(id) { return W.locIdx[id] || null; }
function childMaps(id) { return W.kids[id || ''] || []; }
function mapChain(id) { var out = [], cur = id, guard = 0; while (cur && W.mapIdx[cur] && guard++ < 500) { out.unshift(W.mapIdx[cur]); cur = W.parent[cur]; } return out; }
function mapDescendants(id) { var out = []; childMaps(id).forEach(function (c) { out.push(c.id); out = out.concat(mapDescendants(c.id)); }); return out; }
function mapLocations(id) { return W.locations.filter(function (l) { return l.mapId === id; }).sort(byName); }
function locMapId(l) { return l && l.mapId && W.mapIdx[l.mapId] ? l.mapId : null; }
function locChars(l) { return ((l && l.characterIds) || []).map(function (id) { return W.charIdx[id]; }).filter(Boolean); }
function mapPathText(id) { return mapChain(id).map(function (m) { return m.name; }).join(' › '); }
function validParents(id) { var bad = {}; if (id) { bad[id] = true; mapDescendants(id).forEach(function (d) { bad[d] = true; }); } return bad; }
function depthOf(id) { return mapChain(id).length; }
// Locations form a tree too: a location can sit inside another (a tavern inside a city).
function childLocs(id) { return W.locKids[id || ''] || []; }
function locChain(id) { var out = [], cur = id, guard = 0; while (cur && W.locIdx[cur] && guard++ < 500) { out.unshift(W.locIdx[cur]); cur = W.locParent[cur]; } return out; }
function locDescendants(id) { var out = []; childLocs(id).forEach(function (c) { out.push(c.id); out = out.concat(locDescendants(c.id)); }); return out; }
function locPathText(id) { return locChain(id).map(function (l) { return l.name; }).join(' › '); }
function badLocParents(id) { var bad = {}; if (id) { bad[id] = true; locDescendants(id).forEach(function (d) { bad[d] = true; }); } return bad; }
function locParentOptions(selected, exclude, noneLabel) {
  var out = '<option value="">' + esc(noneLabel) + '</option>';
  (function walk(pid, depth) {
    childLocs(pid).forEach(function (l) {
      if (exclude && exclude[l.id]) return;
      var pre = depth ? '   '.repeat(depth - 1) + '└ ' : '';
      out += '<option value="' + esc(l.id) + '"' + (l.id === selected ? ' selected' : '') + '>' + pre + esc(l.name) + '</option>';
      walk(l.id, depth + 1);
    });
  })(null, 0);
  return out;
}

// Hierarchical <option>s, reused by every map selector.
function mapOptions(selected, exclude, noneLabel) {
  var out = '<option value="">' + esc(noneLabel) + '</option>';
  (function walk(pid, depth) {
    childMaps(pid).forEach(function (m) {
      if (!exclude || !exclude[m.id]) {
        var pre = depth ? '   '.repeat(depth - 1) + '└ ' : '';
        out += '<option value="' + esc(m.id) + '"' + (m.id === selected ? ' selected' : '') + '>' + pre + esc(m.name) + '</option>';
        walk(m.id, depth + 1);
      }
    });
  })(null, 0);
  return out;
}


/* ---------- visibility ----------
   What people create here (maps, places, characters, markers, notebooks
   and notes; not the Mesa) records who created it in createdBy. An item
   with visible === false is seen only by the Mestre and by whoever
   created it, and only they can change that. Items from before createdBy
   existed belong to the Mestre. */
var EYE_OFF ='<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/>';
function me() { return (window.hubUser && window.hubUser.id) || null; }
function isSecret(x) { return !!x && x.visible === false; }
function isMine(x) { return !!x && !!x.createdBy && x.createdBy === me(); }
// The Mestre can also share a hidden item with chosen accounts (sharedWith: [userId]).
function sharedWithMe(x) { return !!x && !!me() && (x.sharedWith || []).indexOf(me()) >= 0; }
function pub(list) { return isMestre() ? list : list.filter(function (x) { return !isSecret(x) || isMine(x) || sharedWithMe(x); }); }
// createdBy for a body being saved: kept on edits, this user on new items.
function owner(prev) { return prev ? (prev.createdBy || null) : me(); }
function canSetVis(item) { return isMestre() || !item || isMine(item); }
// Who sees an item that is not visible to everyone: "o Mestre", "você e o Mestre", "o Mestre e Ana"
// or, with accounts it was shared with, "o Mestre, Ana e Bruno".
function seenBy(item) {
  var by = item ? item.createdBy : me(), names = [], mine = false;
  function add(id, isCreator) {
    if (!id) return;
    var u = W.users.filter(function (x) { return x.id === id; })[0];
    if (u && u.role === 'mestre') return;
    if (id === me()) { mine = true; return; }
    var n = u ? u.name : isCreator ? 'quem criou' : null;
    if (n && names.indexOf(n) < 0) names.push(n);
  }
  add(by, true);
  ((item && item.sharedWith) || []).forEach(function (id) { add(id, false); });
  var all = (mine ? ['você', 'o Mestre'] : ['o Mestre']).concat(names);
  return all.length === 1 ? all[0] : all.slice(0, -1).join(', ') + ' e ' + all[all.length - 1];
}
function seenVerb(item) { return seenBy(item) === 'o Mestre' ? 'vê' : 'veem'; }
function rawHas(col, id) { return !!id && (W.raw[col] || []).some(function (x) { return x.id === id; }); }
function rawGet(col, id) { var l = W.raw[col] || []; for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; }
// share: the Mestre also gets a list of accounts that can see the item while it is hidden.
function flagHtml(id, item, share) {
  if (!window.hubUser || !canSetVis(item)) return '';
  var on = item ? !isSecret(item) : false;
  var users = share && isMestre() ? W.users.filter(function (u) { return u.role !== 'mestre'; }).sort(byName) : [];
  var flag = '<label class="vis-flag" for="' + id + '"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + '><span><b>Visível para todos</b><small>' +
    (users.length ? 'Desmarcado, só o Mestre e as contas marcadas abaixo veem.' : 'Desmarcado, só ' + esc(seenBy(item)) + ' ' + seenVerb(item) + '.') + '</small></span></label>';
  if (!users.length) return flag;
  var shared = (item && item.sharedWith) || [];
  return '<div class="vis-wrap">' + flag + '<div class="vis-share" id="' + id + '_share"' + (on ? ' hidden' : '') + '><span class="lab">Contas que podem ver</span><div class="vis-users">' +
    users.map(function (u) {
      var creator = !!item && item.createdBy === u.id;
      return '<label class="vis-user"><input type="checkbox" data-share="' + esc(u.id) + '"' + (creator || shared.indexOf(u.id) >= 0 ? ' checked' : '') + (creator ? ' disabled' : '') + '>' +
        '<span>' + esc(u.name) + '</span><small>' + (creator ? 'Criou' : esc(roleLabel(u.role))) + '</small></label>';
    }).join('') + '</div></div></div>';
}
function flagVal(id, item) { var el = document.getElementById(id); if (el) return !!el.checked; return item ? !isSecret(item) : true; }
// The accounts picked in flagHtml's list; without the list (not the Mestre), the item keeps what it had.
function shareVal(id, item) {
  var box = document.getElementById(id + '_share');
  if (!box) return ((item && item.sharedWith) || []).slice();
  return [].map.call(box.querySelectorAll('input[data-share]:checked:not(:disabled)'), function (el) { return el.getAttribute('data-share'); });
}
document.addEventListener('change', function (e) {
  var box = e.target.closest && e.target.closest('.vis-flag') && document.getElementById(e.target.id + '_share');
  if (box) box.hidden = e.target.checked;
});
function secretTag(item) { return '<span class="secret-tag" title="Não está visível para todos">' + svg(EYE_OFF, 12, 2.4) + esc('Só ' + seenBy(item)) + '</span>'; }
function refilter() {
  W.maps = pub(W.raw.maps); W.locations = pub(W.raw.locations); W.characters = pub(W.raw.characters); W.organizations = pub(W.raw.organizations);
  mergeCatalog('spells'); mergeCatalog('advantages'); mergeCatalog('skills'); mergeCatalog('techniques'); mergeCatalog('styles'); W.sheets = pub(W.raw.sheets); W.events = pub(W.raw.events);
  indexMaps(); indexLocations(); indexCharacters(); indexOrgs(); indexSpells(); indexAdvantages(); indexSkills(); indexTechniques(); indexStyles(); indexSheets(); indexEvents(); filterNotes();
  S.markers = pub(S.rawMarkers || []);
  if (Explorer.isOpen() && S.route && S.route.explore) Explorer.setMarkers(S.markers);
}

// ---------- writes ----------
function now() { return Date.now(); }
var Ops = {
  createMap: function (name, parentId, file, dims, visible, shared) {
    return W.store.upload(file).then(function (up) {
      var t = now();
      return W.store.put('maps', null, { v: 2, name: name, parentId: parentId || null, visible: visible !== false, sharedWith: shared || [], image: { ref: up.ref, w: dims.w, h: dims.h, type: up.type, size: up.size }, createdBy: me(), createdAt: t, updatedAt: t });
    });
  },
  updateMap: function (id, name, parentId, visible, shared) {
    parentId = parentId || null;
    var orig = rawGet('maps', id);
    if (!parentId && orig && orig.parentId && !W.mapIdx[orig.parentId] && rawHas('maps', orig.parentId)) parentId = orig.parentId;
    if (parentId && validParents(id)[parentId]) return Promise.reject({ code: 'cycle' });
    return W.store.patch('maps', id, { name: name, parentId: parentId, visible: visible !== false, sharedWith: shared || (orig && orig.sharedWith) || [], updatedAt: now() });
  },
  // A new image for a map. Marker positions belong to the old image, so every marker of the map
  // (hidden ones too) is deleted; with markers there this needs confirmed === true, the form asks first.
  // Resolves with how many markers were deleted.
  replaceMapImage: function (id, file, dims, confirmed) {
    var orig = rawGet('maps', id), col = 'maps/' + id + '/markers';
    if (!orig) return Promise.reject({ message: 'Esse mapa não existe mais.' });
    if (!file || !dims) return Promise.reject({ message: 'Selecione a nova imagem do mapa.' });
    return W.store.all(col).then(function (list) {
      if (list.length && confirmed !== true) throw { code: 'markers_exist', count: list.length, message: 'Este mapa tem ' + plural(list.length, 'marcador', 'marcadores') + '. Confirme a troca da imagem, que exclui todos eles.' };
      return W.store.upload(file).then(function (up) {
        return list.reduce(function (p, mk) { return p.then(function () { return W.store.remove(col, mk.id); }); }, Promise.resolve())
          .then(function () { return W.store.patch('maps', id, { image: { ref: up.ref, w: dims.w, h: dims.h, type: up.type, size: up.size }, updatedAt: now() }); })
          .then(function () { if (orig.image && orig.image.ref && orig.image.ref !== up.ref) W.store.dropImage(orig.image.ref); return list.length; },
            function (e) { W.store.dropImage(up.ref); throw e; });
      });
    });
  },
  deleteMap: function (m) {
    var up = W.parent[m.id] || null, col = 'maps/' + m.id + '/markers';
    var seq = Promise.resolve();
    function then(f) { seq = seq.then(f); }
    then(function () { return W.store.all(col).then(function (l) { return l.reduce(function (p, d) { return p.then(function () { return W.store.remove(col, d.id); }); }, Promise.resolve()); }); });
    W.raw.maps.filter(function (c) { return c.parentId === m.id; }).forEach(function (c) { then(function () { return W.store.patch('maps', c.id, { parentId: up, updatedAt: now() }); }); });
    W.raw.locations.filter(function (l) { return l.mapId === m.id; }).forEach(function (l) { then(function () { return W.store.patch('locations', l.id, { mapId: up, updatedAt: now() }); }); });
    W.raw.characters.filter(function (c) { return (c.mapIds || []).indexOf(m.id) >= 0; }).forEach(function (c) {
      var ids = (c.mapIds || []).filter(function (x) { return x !== m.id; });
      if (up && ids.indexOf(up) < 0) ids.push(up);
      then(function () { return W.store.patch('characters', c.id, { mapIds: ids, updatedAt: now() }); });
    });
    W.raw.organizations.filter(function (o) { return (o.mapIds || []).indexOf(m.id) >= 0; }).forEach(function (o) {
      var ids = (o.mapIds || []).filter(function (x) { return x !== m.id; });
      if (up && ids.indexOf(up) < 0) ids.push(up);
      then(function () { return W.store.patch('organizations', o.id, { mapIds: ids, updatedAt: now() }); });
    });
    // Markers on other maps that led to this one lose the link.
    W.raw.maps.filter(function (o) { return o.id !== m.id; }).forEach(function (o) {
      var oc = 'maps/' + o.id + '/markers';
      then(function () { return W.store.query(oc, 'linkedMapId', m.id).then(function (l) { return l.reduce(function (p, mk) { return p.then(function () { return W.store.patch(oc, mk.id, { linkedMapId: null, updatedAt: now() }); }); }, Promise.resolve()); }).catch(function () {}); });
    });
    then(function () { return W.store.remove('maps', m.id); });
    then(function () { return W.store.dropImage(m.image && m.image.ref); });
    return seq;
  },
  // A location has up to two images: image (the one used in thumbnails) and image2.
  // second = { file, dims, removed } for image2, like the arguments for image.
  saveLocation: function (loc, fields, newFile, newDims, removeImage, second) {
    second = second || {};
    // A parent this user cannot see is kept; one inside this location would loop.
    var pid = fields.parentId || null;
    if (!pid && loc && loc.parentId && !W.locIdx[loc.parentId] && rawHas('locations', loc.parentId)) pid = loc.parentId;
    if (loc && pid && badLocParents(loc.id)[pid]) return Promise.reject({ code: 'loc_cycle' });
    var old = [loc && loc.image, loc && loc.image2];
    function pick(cur, file, dims, removed) {
      if (file) return W.store.upload(file).then(function (u) { return { ref: u.ref, w: dims.w, h: dims.h, type: u.type, size: u.size }; });
      return Promise.resolve(removed ? null : cur || null);
    }
    return Promise.all([pick(old[0], newFile, newDims, removeImage), pick(old[1], second.file, second.dims, second.removed)]).then(function (imgs) {
      var image = imgs[0] || imgs[1], image2 = imgs[0] ? imgs[1] : null;
      var t = now();
      var cids = (fields.characterIds || []).slice(), mid = fields.mapId || null;
      if (loc) (loc.characterIds || []).forEach(function (id) { if (!W.charIdx[id] && rawHas('characters', id) && cids.indexOf(id) < 0) cids.push(id); });
      if (!mid && loc && loc.mapId && !W.mapIdx[loc.mapId] && rawHas('maps', loc.mapId)) mid = loc.mapId;
      var body = { v: 1, name: fields.name, description: fields.description, image: image, image2: image2, characterIds: cids, mapId: mid, parentId: pid, visible: fields.visible !== false, sharedWith: fields.sharedWith || (loc && loc.sharedWith) || [],
                   position: (loc && loc.position) || null, createdBy: owner(loc), createdAt: (loc && loc.createdAt) || t, updatedAt: t };
      return W.store.put('locations', loc ? loc.id : null, body).then(function (id) {
        old.forEach(function (o) { if (o && o.ref && o.ref !== (image && image.ref) && o.ref !== (image2 && image2.ref)) W.store.dropImage(o.ref); });
        return id;
      });
    });
  },
  // Sub-locations move up to the deleted location's parent (or to the top level).
  deleteLocation: function (l) {
    var up = l.parentId && rawHas('locations', l.parentId) ? l.parentId : null;
    return W.raw.locations.filter(function (c) { return c.parentId === l.id; }).reduce(function (p, c) {
      return p.then(function () { return W.store.patch('locations', c.id, { parentId: up, updatedAt: now() }); });
    }, Promise.resolve()).then(function () { return W.raw.maps.reduce(function (p, m) {
      return p.then(function () {
        var col = 'maps/' + m.id + '/markers';
        return W.store.query(col, 'locationId', l.id).then(function (list) {
          return list.reduce(function (q, mk) { return q.then(function () { return W.store.patch(col, mk.id, { locationId: null, updatedAt: now() }); }); }, Promise.resolve());
        });
      });
    }, Promise.resolve()); }).then(function () {
      // Organizations and events linked to it lose the link.
      return W.raw.organizations.filter(function (o) { return (o.locationIds || []).indexOf(l.id) >= 0; }).reduce(function (p, o) {
        return p.then(function () { return W.store.patch('organizations', o.id, { locationIds: o.locationIds.filter(function (x) { return x !== l.id; }), updatedAt: now() }); });
      }, Promise.resolve());
    }).then(function () {
      return W.raw.events.filter(function (ev) { return ev.locationId === l.id; }).reduce(function (p, ev) {
        return p.then(function () { return W.store.patch('events', ev.id, { locationId: null, updatedAt: now() }); });
      }, Promise.resolve());
    }).then(function () { return W.store.remove('locations', l.id); })
      .then(function () { return W.store.dropImage(l.image && l.image.ref); })
      .then(function () { return W.store.dropImage(l.image2 && l.image2.ref); });
  },
  // Turn picker selections into character ids, creating characters that do not exist yet.
  ensureCharacters: function (sel, visible, shared) {
    return sel.reduce(function (p, s) {
      return p.then(function (ids) {
        if (s.id && W.charIdx[s.id]) return ids.concat([s.id]);
        var existing = W.characters.filter(function (c) { return norm(c.name) === norm(s.name); })[0];
        if (existing) return ids.concat([existing.id]);
        var t = now();
        return W.store.put('characters', null, { name: s.name, source: s.source || 'manual', mesaId: s.mesaId || null, visible: visible !== false, sharedWith: shared || [], createdBy: me(), createdAt: t, updatedAt: t }).then(function (id) { return ids.concat([id]); });
      });
    }, Promise.resolve([])).then(function (ids) { return ids.filter(function (v, i) { return ids.indexOf(v) === i; }); });
  },
  saveSpell: function (spell, fields) {
    if (!isMestre()) return Promise.reject({ message: 'Apenas o Mestre pode criar ou editar magias.' });
    var t = now();
    var body = {
      v: 1,
      name: (fields.name || '').trim(),
      difficulty: (fields.difficulty || 'H').trim(),
      class: (fields.class || '').trim(),
      college: (fields.college || '').trim(),
      timeToCast: (fields.timeToCast || '').trim(),
      duration: (fields.duration || '').trim(),
      initialCost: (fields.initialCost || '').trim(),
      maintenanceCost: (fields.maintenanceCost || '').trim(),
      prerequisites: (fields.prerequisites || '').trim(),
      description: (fields.description || '').trim(),
      item: (fields.item || '').trim(),
      page: (fields.page || '').trim(),
      source: (fields.source || (spell ? spell.source : 'Manual')).trim(),
      visible: fields.visible !== false,
      sharedWith: fields.sharedWith || (spell && spell.sharedWith) || [],
      createdBy: owner(spell),
      createdAt: (spell && spell.createdAt) || t,
      updatedAt: t
    };
    return W.store.put('spells', spell ? spell.id : null, body);
  },
  // A book spell is not removed from the file: its document says deleted: true.
  deleteSpell: function (spell) {
    if (!isMestre()) return Promise.reject({ message: 'Apenas o Mestre pode excluir magias.' });
    if (spell.catalog) return patchCatalogItem('spells', spell, { deleted: true, updatedAt: now() });
    return W.store.remove('spells', spell.id);
  },
  // Drops the Mestre's changes to a book entry; it shows again as in the book.
  restoreCatalogItem: function (col, item) {
    if (!isMestre()) return Promise.reject({ message: 'Apenas o Mestre pode restaurar o original.' });
    return rawHas(col, item.id) ? W.store.remove(col, item.id) : Promise.resolve();
  },
  // The book lists used to be copied whole into the database. Once, by the Mestre, those
  // copies go away: documents of book entries equal to the book (and visible to all), and
  // those of entries no longer in the files. His edits and hidden entries stay.
  cleanCatalogCopies: function (col, fields) {
    var c = CATALOG[col];
    var gone = (W.raw[col] || []).filter(function (d) {
      if (!isCatalogId(col, d.id)) return false;
      var x = c.idx[d.id];
      if (!x) return true;
      if (d.deleted || d.visible === false || (d.sharedWith || []).length) return false;
      return fields.every(function (k) { return k === 'id' || !(k in d) || (d[k] || '') === (x[k] || ''); });
    }).map(function (d) { return d.id; });
    if (!gone.length) return Promise.resolve(0);
    if (typeof W.store.removeMany === 'function') return W.store.removeMany(col, gone).then(function () { return gone.length; });
    return gone.reduce(function (p, id) { return p.then(function () { return W.store.remove(col, id); }); }, Promise.resolve()).then(function () { return gone.length; });
  }
};

// Characters from the Mesa de Combate (same origin, this browser) as suggestions.
function mesaCharacters() {
  var out = [], seen = {};
  function add(n, kind) { if (!n || !n.name) return; var k = norm(n.name); if (seen[k]) return; seen[k] = true; out.push({ name: n.name, source: 'mesa', mesaId: n.id || null, kind: kind }); }
  try { var p = JSON.parse(localStorage.getItem('gurps_fixed_personagens_v1') || '[]'); if (Array.isArray(p)) p.forEach(function (n) { add(n, 'Jogador'); }); } catch (e) {}
  try { var c = JSON.parse(localStorage.getItem('gurps_combat_master_data_v2') || '[]'); if (Array.isArray(c)) c.forEach(function (cb) { (cb.npcs || []).forEach(function (n) { add(n, n.characterType === 'player' ? 'Jogador' : 'NPC'); }); }); } catch (e) {}
  return out;
}
