/* =====================================================================
   Hounds — Peças compartilhadas pelas páginas (trilha, miniaturas, avisos, árvores)
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   Shared page pieces
   ===================================================================== */
/** @type {PageState} */
var S = { route: null, markers: [], markersFor: null, unMarkers: null, ui: {} };
var pageRoot = $('pageRoot');
function canWrite() { return !!(W.store && W.store.canWrite()); }
function crumbsHtml(node) {
  return '<div class="crumbs">' + ancestors(node).map(function (p) {
    var n = byId[p]; var lab = esc(n.label);
    return (n.route ? '<a href="' + hrefFor(p) + '">' + lab + '</a>' : '<span>' + lab + '</span>') + '<span aria-hidden="true">/</span>';
  }).join('') + '<b>' + esc(byId[node] ? byId[node].label : '') + '</b></div>';
}
function thumbSlot(ref, iconPaths, cls) { return '<span class="' + (cls || 'mthumb') + '"' + (ref ? ' data-img="' + esc(ref) + '"' : '') + '>' + svg(iconPaths, 16, 1.8) + '</span>'; }
function fillImages(root) {
  root.querySelectorAll('[data-img]').forEach(function (el) {
    var ref = el.getAttribute('data-img');
    W.store.imageUrl(ref).then(function (u) { if (u && el.isConnected) el.innerHTML = '<img src="' + esc(u) + '" alt="" loading="lazy">'; });
  });
}
function notice() {
  if (!W.store) return '';
  if (W.store.kind === 'local') return '<p class="notice">Os dados estão sendo salvos só neste navegador, porque o armazenamento compartilhado não está disponível nesta visualização.</p>';
  if (!canWrite()) return '<p class="notice">Você pode ver mapas, locais e marcadores, mas não criar ou editar.</p>';
  return '';
}
function mapRow(m, here, extra) {
  var k = childMaps(m.id).length, L = mapLocations(m.id).length;
  var meta = [k ? plural(k, 'submapa', 'submapas') : '', L ? plural(L, 'local', 'locais') : ''].filter(Boolean).join(' · ');
  return '<a class="mrow' + (here ? ' here' : '') + '" href="' + mapHref(m.id) + '"' + (here ? ' aria-current="page"' : '') + '>' + thumbSlot(m.image && m.image.ref, ICON.map) +
    '<span class="mtext">' + (extra || '') + '<b>' + esc(m.name) + '</b>' + (meta ? '<span class="meta">' + meta + '</span>' : '') + '</span></a>';
}
function fullTree(pid) {
  var list = childMaps(pid);
  if (!list.length) return '';
  return '<ul>' + list.map(function (m) { return '<li>' + mapRow(m) + fullTree(m.id) + '</li>'; }).join('') + '</ul>';
}
// A chain of maps from the top level down, optionally ending in a location leaf and/or listing the last map's children.
function pathTree(chain, opts) {
  opts = opts || {};
  function level(i) {
    if (i >= chain.length) {
      if (opts.leaf) return '<ul><li><span class="mrow here">' + thumbSlot(opts.leaf.image && opts.leaf.image.ref, ICON.pin) + '<span class="mtext"><span class="lvl">Local</span><b>' + esc(opts.leaf.name) + '</b></span></span></li></ul>';
      return '';
    }
    var m = chain[i], last = i === chain.length - 1;
    var inner = level(i + 1);
    if (last && opts.kids) inner += (function () { var k = childMaps(m.id); return k.length ? '<ul>' + k.map(function (c) { return '<li>' + mapRow(c) + '</li>'; }).join('') + '</ul>' : ''; })();
    return '<ul><li>' + mapRow(m, last && opts.markLast) + inner + '</li></ul>';
  }
  var html = level(0);
  return '<div class="mtree path-tree">' + html.replace(/^<ul>/, '').replace(/<\/ul>$/, '') + '</div>';
}
// Options for idPicker: maps and locations in hierarchy order, with the path above each one as the subtitle.
function mapPickOptions(q) {
  var out = [];
  (function walk(pid, d) {
    childMaps(pid).forEach(function (m) {
      if (!q || norm(m.name).indexOf(q) >= 0) out.push({ id: m.id, label: m.name, sub: mapChain(m.id).slice(0, -1).map(function (x) { return x.name; }).join(' › ') || 'Nível superior', depth: d });
      walk(m.id, d + 1);
    });
  })(null, 0);
  return out;
}
function locPickOptions(q) {
  var out = [];
  (function walk(pid, d) {
    childLocs(pid).forEach(function (l) {
      var mid = locMapId(l), up = locChain(l.id).slice(0, -1).map(function (x) { return x.name; }).join(' › ');
      if (!q || norm(l.name + ' ' + up).indexOf(q) >= 0) out.push({ id: l.id, label: l.name, sub: up || (mid ? mapById(mid).name : 'Sem mapa'), depth: d });
      walk(l.id, d + 1);
    });
  })(null, 0);
  return out;
}
// A box that starts closed and opens on a click on its title. Whether it is open is kept in
// S.ui.open[key], so a redraw (data arriving, a confirmation) leaves it as the person left it;
// a new page starts with all closed. count: shown beside the title while closed, when not null.
function foldBox(key, title, count, body, forceOpen) {
  var open = forceOpen || !!(S.ui.open && S.ui.open[key]);
  return '<details class="box fold" data-fold="' + esc(key) + '"' + (open ? ' open' : '') + '><summary><h2 class="sec-title">' + esc(title) + '</h2>' +
    (count != null ? '<span class="fold-count">' + esc(count) + '</span>' : '') + '<span class="fold-chev">' + svg('<path d="m9 18 6-6-6-6"/>', 14, 2.4) + '</span></summary>' +
    '<div class="fold-body">' + body + '</div></details>';
}
function wireFolds(root) {
  root.querySelectorAll('details.fold').forEach(function (d) {
    d.addEventListener('toggle', function () { S.ui.open = S.ui.open || {}; S.ui.open[d.getAttribute('data-fold')] = d.open; });
  });
}
// What a marker points to, for lists: its location, else the map it leads to, else its category.
function markerSub(mk) {
  var l = mk.locationId && locById(mk.locationId), lm = mk.linkedMapId && mapById(mk.linkedMapId);
  return l ? 'Local: ' + l.name : lm ? 'Mapa: ' + lm.name : cat(mk.category).label;
}
