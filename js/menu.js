/* =====================================================================
   Hounds — Menu lateral, tema claro/escuro e gaveta no celular
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   Menu tree (same rules at every depth)
     group only: click toggles · page only: click opens, ancestors stay open
     page + group: click opens and expands; again while open collapses it;
     the arrow only toggles. Collapsing a node collapses all descendants.
     hideKids: the children stay in the tree (crumbs, titles) but are not
     drawn; on a child's page the parent row is the current one.
   ===================================================================== */
function mapNodes(pid) {
  return childMaps(pid).map(function (m) {
    var k = childMaps(m.id);
    return { id: 'map:' + m.id, label: m.name, icon: ICON.map, route: true, secret: isSecret(m), children: k.length ? mapNodes(m.id) : null };
  });
}
function locNodes(pid) {
  return childLocs(pid).map(function (l) {
    var k = childLocs(l.id);
    return { id: 'loc:' + l.id, label: l.name, icon: ICON.pin, route: true, secret: isSecret(l), children: k.length ? locNodes(l.id) : null };
  });
}
// Spells, advantages, disadvantages, skills, techniques, styles, weapons, armors, items and improvements are too many for the menu (their pages list them):
// it keeps only the one open, so the breadcrumbs and the title still find it.
function openLeaf(prefix, icon, find, label) {
  var node = S.route && S.route.node;
  if (!node || node.indexOf(prefix) !== 0) return [];
  var x = find(node.slice(prefix.length));
  return [{ id: node, label: x ? x.name : label, icon: icon, route: true, secret: isSecret(x) }];
}
function buildMenu() {
  return [
    { id: 'mesa', label: 'Mesa de Combate', icon: ICON.mesa, route: true },
    { id: 'mundo', label: 'Mundo', icon: ICON.mundo, children: [
      { id: 'maps', label: 'Maps', icon: ICON.maps, route: true, hideKids: true, children: mapNodes(null) },
      { id: 'locais', label: 'Locais', icon: ICON.pin, route: true, hideKids: true, children: locNodes(null) },
      { id: 'chars', label: 'Personagens', icon: ICON.user, route: true, hideKids: true,
        children: W.characters.slice().sort(byName).map(function (c) { return { id: 'char:' + c.id, label: c.name, icon: ICON.user, route: true, secret: isSecret(c) }; }) },
      { id: 'sheets', label: 'Fichas', icon: ICON.sheet, route: true, hideKids: true,
        children: W.sheets.slice().sort(byName).map(function (s) { return { id: 'sheet:' + s.id, label: s.name, icon: ICON.sheet, route: true, secret: isSecret(s) }; }) },
      { id: 'orgs', label: 'Organizações', icon: ICON.org, route: true, hideKids: true,
        children: W.organizations.slice().sort(byName).map(function (o) { return { id: 'org:' + o.id, label: o.name, icon: ICON.org, route: true, secret: isSecret(o) }; }) },
      { id: 'events', label: 'Eventos', icon: ICON.event, route: true, hideKids: true,
        children: W.events.slice().sort(byName).map(function (ev) { return { id: 'event:' + ev.id, label: ev.name, icon: ICON.event, route: true, secret: isSecret(ev) }; }) },
      { id: 'spells', label: 'Magias', icon: ICON.spell, route: true, hideKids: true,
        children: openLeaf('spell:', ICON.spell, spellById, 'Magia') },
      { id: 'advs', label: 'Vantagens', icon: ICON.advantage, route: true, hideKids: true,
        children: openLeaf('adv:', ICON.advantage, advById, 'Vantagem') },
      { id: 'disadvs', label: 'Desvantagens', icon: ICON.disadvantage, route: true, hideKids: true,
        children: openLeaf('disadv:', ICON.disadvantage, disadvById, 'Desvantagem') },
      { id: 'skills', label: 'Perícias', icon: ICON.skill, route: true, hideKids: true,
        children: openLeaf('skill:', ICON.skill, skillById, 'Perícia') },
      { id: 'combat', label: 'Combate', icon: ICON.combat, route: true, hideKids: true,
        children: openLeaf('cskill:', ICON.skill, skillById, 'Perícia').concat(openLeaf('tech:', ICON.combat, techById, 'Técnica')).concat(openLeaf('style:', ICON.combat, styleById, 'Estilo')) },
      { id: 'weapons', label: 'Armas', icon: ICON.weapon, route: true, hideKids: true,
        children: openLeaf('weapon:', ICON.weapon, weaponById, 'Arma') },
      { id: 'armors', label: 'Armaduras', icon: ICON.armor, route: true, hideKids: true,
        children: openLeaf('armor:', ICON.armor, armorById, 'Armadura') },
      { id: 'items', label: 'Itens', icon: ICON.item, route: true, hideKids: true,
        children: openLeaf('item:', ICON.item, itemById, 'Item') },
      { id: 'improvements', label: 'Melhoramentos', icon: ICON.improvement, route: true, hideKids: true,
        children: openLeaf('impr:', ICON.improvement, improvementById, 'Melhoramento') }
    ] },
    { id: 'notes', label: 'Anotações', icon: ICON.notes, route: true, hideKids: true,
      children: W.notebooks.slice().sort(byName).map(function (nb) {
        return { id: 'nb:' + nb.id, label: nb.name, icon: ICON.notes, route: true, secret: isSecret(nb),
          children: nbNotes(nb.id).map(function (n) { return { id: 'note:' + n.id, label: n.title, icon: ICON.note, route: true, secret: isSecret(n) }; }) };
      }) }
  ].concat(canManageUsers() ? [{ id: 'users', label: 'Usuários', icon: ICON.users, route: true }] : []);
}
var menuEl = $('menu'), app = $('app');
var byId = {}, parentOf = {}, expanded = {};
function index(list, parent) { list.forEach(function (n) { byId[n.id] = n; parentOf[n.id] = parent; if (n.children) index(n.children, n.id); }); }
function ancestors(id) { var out = [], p = parentOf[id]; while (p) { out.unshift(p); p = parentOf[p]; } return out; }
function descendants(id) { var out = []; ((byId[id] && byId[id].children) || []).forEach(function (c) { out.push(c.id); out = out.concat(descendants(c.id)); }); return out; }
var CHEV = '<svg class="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';
function renderNodes(list, depth) {
  return list.map(function (n) {
    var size = depth ? 16 : 20, isGroup = !!n.children && !n.hideKids, isPage = !!n.route;
    var label = '<span class="label">' + esc(n.label) + '</span>' + (n.secret ? '<span class="secret-ico" title="Não está visível para todos">' + svg(EYE_OFF, 13, 2.2) + '</span>' : ''), row;
    if (isPage && isGroup) {
      row = '<div class="row"><a class="node-row" href="' + hrefFor(n.id) + '" data-id="' + esc(n.id) + '" data-act="page-group" title="' + esc(n.label) + '">' + svg(n.icon, size) + label + '</a>' +
        '<button type="button" class="chev-btn" data-id="' + esc(n.id) + '" data-act="toggle" aria-expanded="false" aria-label="Mostrar ou ocultar itens de ' + esc(n.label) + '">' + CHEV + '</button></div>';
    } else if (isGroup) {
      row = '<div class="row"><button type="button" class="node-row" data-id="' + esc(n.id) + '" data-act="toggle" aria-expanded="false" title="' + esc(n.label) + '">' + svg(n.icon, size) + label + CHEV + '</button></div>';
    } else {
      row = '<div class="row"><a class="node-row" href="' + hrefFor(n.id) + '" data-id="' + esc(n.id) + '" data-act="page" title="' + esc(n.label) + '">' + svg(n.icon, size) + label + '</a></div>';
    }
    var kids = isGroup ? '<div class="kids"><ul>' + (n.children.length ? renderNodes(n.children, depth + 1) : '<li class="empty-kid">' + esc(n.emptyText || 'Vazio') + '</li>') + '</ul></div>' : '';
    return '<li class="node depth-' + depth + '" data-node="' + esc(n.id) + '">' + row + kids + '</li>';
  }).join('');
}
function renderMenu() {
  var menu = buildMenu();
  byId = {}; parentOf = {}; index(menu, null);
  Object.keys(expanded).forEach(function (k) { if (!byId[k]) delete expanded[k]; });
  menuEl.innerHTML = renderNodes(menu, 0);
  if (S.route && byId[S.route.node]) revealPath(S.route.node);
  paintMenu();
}
// The drawn nodes by id, looked up once per paint.
function nodeEls() { var m = {}; menuEl.querySelectorAll('.node').forEach(function (el) { m[el.getAttribute('data-node')] = el; }); return m; }
function isShown(id) { var p = parentOf[id]; while (p) { if (!expanded[p]) return false; p = parentOf[p]; } return true; }
function paintMenu() {
  var cur = S.route ? S.route.node : null;
  var els = nodeEls();
  while (cur && !els[cur]) cur = parentOf[cur];
  var path = cur ? ancestors(cur) : [];
  Object.keys(byId).forEach(function (id) {
    var el = els[id]; if (!el) return;
    var shown = isShown(id);
    el.querySelectorAll(':scope > .row > .node-row, :scope > .row > .chev-btn').forEach(function (r) { r.tabIndex = shown ? 0 : -1; });
    var link = el.querySelector(':scope > .row > a.node-row');
    if (link) { if (id === cur) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); }
    el.querySelector(':scope > .row').classList.toggle('current', id === cur);
    el.classList.toggle('on-path', path.indexOf(id) >= 0);
    if (byId[id].children) {
      var open = !!expanded[id];
      el.classList.toggle('open', open);
      el.querySelectorAll(':scope > .row [aria-expanded]').forEach(function (b) { b.setAttribute('aria-expanded', String(open)); });
    }
  });
}
function expand(id) { expanded[id] = true; }
function collapse(id) { [id].concat(descendants(id)).forEach(function (d) { expanded[d] = false; }); }
function revealPath(id) { ancestors(id).forEach(expand); }
menuEl.addEventListener('click', function (e) {
  var el = e.target.closest('[data-act]'); if (!el) return;
  var id = el.getAttribute('data-id'), act = el.getAttribute('data-act');
  if (act === 'toggle') {
    e.preventDefault();
    if (app.classList.contains('collapsed') && window.innerWidth > 760) { setCollapsed(false); revealPath(id); expand(id); paintMenu(); return; }
    if (expanded[id]) collapse(id); else expand(id);
    paintMenu(); return;
  }
  e.preventDefault();
  if (act === 'page-group') {
    if (S.route && S.route.node === id && expanded[id]) { collapse(id); paintMenu(); return; }
    revealPath(id); expand(id);
  } else revealPath(id);
  if (app.classList.contains('collapsed') && window.innerWidth > 760 && ancestors(id).length) setCollapsed(false);
  setDrawer(false);
  go(hrefFor(id));
});

var toggle = $('toggle'), menuBtn = $('menuBtn'), scrim = $('scrim');
function setCollapsed(c, keep) {
  app.classList.toggle('collapsed', c);
  toggle.setAttribute('aria-expanded', String(!c));
  toggle.querySelector('span').textContent = c ? 'Expandir menu' : 'Recolher menu';
  toggle.title = c ? 'Expandir menu' : 'Recolher menu';
  if (!keep && !app.classList.contains('on-mesa')) lstore('hounds_rail_collapsed', c ? '1' : '0');
}
function setDrawer(open) { app.classList.toggle('drawer', open); scrim.hidden = !open; menuBtn.setAttribute('aria-expanded', String(open)); }
toggle.addEventListener('click', function () { setCollapsed(!app.classList.contains('collapsed')); });
menuBtn.addEventListener('click', function () { setDrawer(true); });

// Theme: light or dark, remembered in this browser. The open Mesa follows it.
var themeBtn = $('themeBtn');
function currentTheme() { return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'; }
function paintThemeBtn() { var next = currentTheme() === 'light' ? 'Tema escuro' : 'Tema claro'; themeBtn.querySelector('span').textContent = next; themeBtn.title = next; }
function setTheme(t, save) {
  document.documentElement.setAttribute('data-theme', t);
  if (save) lstore('hounds_theme', t);
  try { var d = $('mesaFrame').contentDocument; if (d && d.documentElement) d.documentElement.setAttribute('data-theme', t); } catch (e) {}
  paintThemeBtn();
}
themeBtn.addEventListener('click', function () { setTheme(currentTheme() === 'light' ? 'dark' : 'light', true); });
// With no saved choice, follow the system when it changes.
if (window.matchMedia) {
  var themeMq = matchMedia('(prefers-color-scheme: light)');
  if (themeMq.addEventListener) themeMq.addEventListener('change', function () { if (!lstore('hounds_theme')) setTheme(themeMq.matches ? 'light' : 'dark'); });
}
paintThemeBtn();
function closeOverlay() { if (app.classList.contains('on-mesa') && !app.classList.contains('collapsed') && window.innerWidth > 760) setCollapsed(true, true); }
document.querySelector('.main').addEventListener('pointerdown', closeOverlay);
window.addEventListener('blur', function () { setTimeout(function () { if (document.activeElement && document.activeElement.id === 'mesaFrame') closeOverlay(); }, 0); });
scrim.addEventListener('click', function () { setDrawer(false); });
$('brandLink').addEventListener('click', function () { setDrawer(false); });
