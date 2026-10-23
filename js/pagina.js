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
// A box that starts closed (or open, with startOpen) and opens or closes on a click on its title.
// Whether it is open is kept in S.ui.open[key], so a redraw (data arriving, a confirmation) leaves it
// as the person left it; a new page starts again as it starts. count: shown beside the title while
// closed, when not null.
function foldBox(key, title, count, body, startOpen) {
  var open = S.ui.open && key in S.ui.open ? !!S.ui.open[key] : !!startOpen;
  return '<details class="box fold" data-fold="' + esc(key) + '"' + (open ? ' open' : '') + '><summary><h2 class="sec-title">' + esc(title) + '</h2>' +
    (count != null ? '<span class="fold-count">' + esc(count) + '</span>' : '') + '<span class="fold-chev">' + svg('<path d="m9 18 6-6-6-6"/>', 14, 2.4) + '</span></summary>' +
    '<div class="fold-body">' + body + '</div></details>';
}
function wireFolds(root) {
  root.querySelectorAll('details.fold').forEach(function (d) {
    d.addEventListener('toggle', function () { S.ui.open = S.ui.open || {}; S.ui.open[d.getAttribute('data-fold')] = d.open; });
  });
}
/* =====================================================================
   Arranging by dragging (the tables of Combate, the sections of Equip.)
     The items of box (opts.item, each with its data-key) are dragged by their handle (opts.grip) with
     the mouse, a finger or a pen, or moved with the arrow keys on it. While one is dragged it floats
     (class dragging) and a placeholder (class opts.ph) shows where it goes; data that arrives does not
     redraw the page (S.ui.dragging, see onData). opts.start(item) and opts.end(item) run when a drag
     begins and ends; opts.done(keys, item, byKey) gets the new order, only when it changed.
   ===================================================================== */
function wireDragSort(box, opts) {
  function keys() { return [].map.call(box.querySelectorAll(opts.item), function (el) { return el.getAttribute('data-key'); }); }
  box.addEventListener('keydown', function (e) {
    var grip = e.target.closest && e.target.closest(opts.grip); if (!grip) return;
    var card = grip.closest(opts.item), back = e.key === 'ArrowUp' || e.key === 'ArrowLeft', fwd = e.key === 'ArrowDown' || e.key === 'ArrowRight';
    if (!back && !fwd) return;
    e.preventDefault();
    var other = back ? card.previousElementSibling : card.nextElementSibling; if (!other) return;
    if (back) box.insertBefore(card, other); else box.insertBefore(other, card);
    grip.focus();
    opts.done(keys(), card, true);
  });
  box.addEventListener('pointerdown', function (e) {
    var grip = e.target.closest && e.target.closest(opts.grip); if (!grip || e.button > 0) return;
    e.preventDefault();
    var card = grip.closest(opts.item), start = keys().join(), sx = e.clientX, sy = e.clientY, moving = false, ph = null, dx = 0, dy = 0;
    grip.setPointerCapture(e.pointerId);
    function begin() {
      // Where the handle was grabbed, before opts.start changes the layout (the handle stays at the top).
      var r = card.getBoundingClientRect();
      dx = sx - r.left; dy = sy - r.top;
      if (opts.start) { opts.start(card); r = card.getBoundingClientRect(); }
      ph = document.createElement('div'); ph.className = opts.ph; ph.style.height = r.height + 'px';
      box.insertBefore(ph, card);
      card.classList.add('dragging'); card.style.width = r.width + 'px';
      // The layout changed: the place left by the item stays in view.
      if (opts.start) ph.scrollIntoView({ block: 'nearest' });
      S.ui.dragging = true; moving = true;
    }
    function move(ev) {
      if (!moving) { if (Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) < 5) return; begin(); }
      card.style.left = (ev.clientX - dx) + 'px'; card.style.top = (ev.clientY - dy) + 'px';
      // The item under the finger: the placeholder goes before it (upper half) or after it.
      /** @type {{ el: Element, r: DOMRect }} */
      var over = null;
      [].forEach.call(box.querySelectorAll(opts.item), function (el) {
        if (el === card) return;
        var r = el.getBoundingClientRect();
        if (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) over = { el: el, r: r };
      });
      if (over) box.insertBefore(ph, ev.clientY < over.r.top + over.r.height / 2 ? over.el : over.el.nextSibling);
      else {
        var b = box.getBoundingClientRect();
        if (ev.clientY > b.bottom) box.appendChild(ph);
        else if (ev.clientY < b.top) box.insertBefore(ph, box.firstChild);
      }
    }
    function end() {
      grip.removeEventListener('pointermove', move); grip.removeEventListener('pointerup', end); grip.removeEventListener('pointercancel', end);
      if (!moving) return;
      box.insertBefore(card, ph); ph.remove();
      card.classList.remove('dragging'); card.style.width = card.style.left = card.style.top = '';
      S.ui.dragging = false;
      if (opts.end) opts.end(card);
      if (keys().join() !== start) opts.done(keys(), card, false);
    }
    grip.addEventListener('pointermove', move); grip.addEventListener('pointerup', end); grip.addEventListener('pointercancel', end);
  });
}
// Sections dragged into any order by the handle in their header (the tabs Ficha and Equip. of a
// sheet). The order is a way of seeing the page, like the folded sections: remembered in this
// browser under key, the same for every sheet. html: { key: function drawing the section }, in the
// order they start in; the saved order loses what it does not know, and a section it does not have
// yet goes last.
function sortSecsHtml(id, key, html) {
  var all = Object.keys(html), v;
  try { v = JSON.parse(lstore(key) || '[]'); } catch (e) { v = []; }
  var order = (Array.isArray(v) ? v : []).filter(function (k, i, list) { return all.indexOf(k) >= 0 && list.indexOf(k) === i; });
  order = order.concat(all.filter(function (k) { return order.indexOf(k) < 0; }));
  return '<div class="sort-secs" id="' + id + '">' + order.map(function (k) { return '<div class="sort-sec" data-key="' + k + '">' + html[k]() + '</div>'; }).join('') + '</div>';
}
// The handle in a section's header.
function secGripHtml(name) {
  return '<button class="sc-grip sec-grip" type="button" aria-label="Mover ' + esc(name) + ' (arraste, ou use as setas)" title="Arraste para mudar a ordem">' + svg(SC_GRIP, 14, 2.4) + '</button>';
}
// While one is dragged, the sections show only their headers: all of them fit on the screen.
function wireSecSort(id, key) {
  var box = $(id); if (!box || !box.querySelector('.sec-grip')) return;
  wireDragSort(box, { item: '.sort-sec', grip: '.sec-grip', ph: 'sort-ph',
    start: function () { box.classList.add('sorting'); },
    end: function () { box.classList.remove('sorting'); },
    done: function (keys) { lstore(key, JSON.stringify(keys)); } });
}
/* =====================================================================
   The filter "Criado pelo Mestre" of every list of Regras: only the entries the Mestre made (the
   documents of the database, not the books' files; see catalogChange). ui.mine keeps it, with the
   page's other filters.
   ===================================================================== */
function mestreOnlyHtml(on) {
  return '<label class="vis-flag" for="mestreOnly" style="padding:8px 12px"><input type="checkbox" id="mestreOnly"' + (on ? ' checked' : '') + '><span><b>Criado pelo Mestre</b></span></label>';
}
function wireMestreOnly(ui, redraw) { var el = $('mestreOnly'); if (el) el.onchange = function () { ui.mine = el.checked; ui.page = 1; redraw(); }; }
/* =====================================================================
   Pages of a long list (spells, advantages)
   ===================================================================== */
var PAGE_SIZE = 30;
// The slice of the list for page `page` (1-based, kept within the pages that exist).
function pageOf(list, page) {
  var pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE)), p = Math.min(Math.max(1, page || 1), pages);
  return { page: p, pages: pages, from: (p - 1) * PAGE_SIZE, items: list.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE) };
}
// "31–60 de 1.161 magias"
function pageCountText(pg, total, one, many) {
  return total ? '<b>' + (pg.from + 1) + '–' + (pg.from + pg.items.length) + '</b> de <b>' + total.toLocaleString('pt-BR') + '</b> ' + (total === 1 ? one : many) : '';
}
// Previous, next, the first and last pages and two on each side of the current one.
function pagerHtml(pg) {
  if (pg.pages <= 1) return '';
  function btn(n, label, aria, off) { return '<button type="button" class="pager-btn" data-page="' + n + '" aria-label="' + aria + '"' + (off ? ' disabled' : '') + '>' + label + '</button>'; }
  var out = [btn(pg.page - 1, '‹', 'Página anterior', pg.page === 1)], last = 0;
  for (var i = 1; i <= pg.pages; i++) {
    if (i !== 1 && i !== pg.pages && Math.abs(i - pg.page) > 2) continue;
    if (last && i - last > 1) out.push('<span class="pager-gap" aria-hidden="true">…</span>');
    out.push(i === pg.page ? '<span class="pager-cur" aria-current="page">' + i + '</span>' : btn(i, String(i), 'Página ' + i, false));
    last = i;
  }
  out.push(btn(pg.page + 1, '›', 'Próxima página', pg.page === pg.pages));
  return '<nav class="pager" aria-label="Páginas">' + out.join('') + '</nav>';
}
// A page button was clicked: go(page), then bring the top of the list into view.
function wirePager(root, go) {
  root.querySelectorAll('.pager [data-page]').forEach(function (b) {
    b.addEventListener('click', function () {
      go(+b.getAttribute('data-page'));
      root.scrollIntoView({ block: 'start' });
      var cur = root.querySelector('.pager-cur'); if (cur instanceof HTMLElement) { cur.tabIndex = -1; cur.focus({ preventScroll: true }); }
    });
  });
}
// What a marker points to, for lists: its location, else the map it leads to, else its category.
function markerSub(mk) {
  var l = mk.locationId && locById(mk.locationId), lm = mk.linkedMapId && mapById(mk.linkedMapId);
  return l ? 'Local: ' + l.name : lm ? 'Mapa: ' + lm.name : cat(mk.category).label;
}
