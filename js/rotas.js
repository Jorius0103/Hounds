/* =====================================================================
   Hounds — Rotas (#mesa, #maps, #map~id, #locais, ...)
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   Routing
     #mesa · #maps · #map~<id> · #map~<id>~explorar · #locais · #local~<id>
     #fichas · #ficha~<id> · #eventos · #evento~<id>
   ===================================================================== */
function parseRoute() {
  var h = decodeURIComponent((location.hash || '').replace(/^#/, ''));
  var p = h.split('~');
  if (p[0] === 'maps') return { page: 'maps', node: 'maps' };
  if (p[0] === 'map' && p[1]) return { page: 'map', mapId: p[1], explore: p[2] === 'explorar', node: 'map:' + p[1] };
  if (p[0] === 'locais') return { page: 'locais', node: 'locais' };
  if (p[0] === 'local' && p[1]) return { page: 'local', locId: p[1], node: 'loc:' + p[1] };
  if (p[0] === 'personagens') return { page: 'chars', node: 'chars' };
  if (p[0] === 'personagem' && p[1]) return { page: 'char', charId: p[1], node: 'char:' + p[1] };
  if (p[0] === 'fichas') return { page: 'sheets', node: 'sheets' };
  if (p[0] === 'ficha' && p[1]) return { page: 'sheet', sheetId: p[1], node: 'sheet:' + p[1] };
  if (p[0] === 'eventos') return { page: 'events', node: 'events' };
  if (p[0] === 'evento' && p[1]) return { page: 'event', eventId: p[1], node: 'event:' + p[1] };
  if (p[0] === 'organizacoes') return { page: 'orgs', node: 'orgs' };
  if (p[0] === 'organizacao' && p[1]) return { page: 'org', orgId: p[1], node: 'org:' + p[1] };
  if (p[0] === 'magias') return { page: 'spells', node: 'spells' };
  if (p[0] === 'magia' && p[1]) return { page: 'spell', spellId: p[1], node: 'spell:' + p[1] };
  if (p[0] === 'vantagens') return { page: 'advs', node: 'advs' };
  if (p[0] === 'vantagem' && p[1]) return { page: 'adv', advId: p[1], node: 'adv:' + p[1] };
  if (p[0] === 'mesa') return { page: 'mesa', node: 'mesa' };
  if (p[0] === 'usuarios') return { page: 'users', node: 'users' };
  if (p[0] === 'anotacoes') return { page: 'notes', node: 'notes' };
  if (p[0] === 'caderno' && p[1]) return { page: 'nb', nbId: p[1], node: 'nb:' + p[1] };
  if (p[0] === 'nota' && p[1]) return { page: 'note', noteId: p[1], node: 'note:' + p[1] };
  if (p[0] === 'inicio') return { page: 'home', node: null };
  return null;
}
function hrefFor(node) {
  if (node === 'mesa' || node === 'maps' || node === 'locais') return '#' + node;
  if (node.indexOf('map:') === 0) return '#map~' + encodeURIComponent(node.slice(4));
  if (node.indexOf('loc:') === 0) return '#local~' + encodeURIComponent(node.slice(4));
  if (node === 'chars') return '#personagens';
  if (node === 'users') return '#usuarios';
  if (node === 'notes') return '#anotacoes';
  if (node.indexOf('nb:') === 0) return '#caderno~' + encodeURIComponent(node.slice(3));
  if (node.indexOf('note:') === 0) return '#nota~' + encodeURIComponent(node.slice(5));
  if (node.indexOf('char:') === 0) return '#personagem~' + encodeURIComponent(node.slice(5));
  if (node === 'orgs') return '#organizacoes';
  if (node.indexOf('org:') === 0) return '#organizacao~' + encodeURIComponent(node.slice(4));
  if (node === 'sheets') return '#fichas';
  if (node.indexOf('sheet:') === 0) return '#ficha~' + encodeURIComponent(node.slice(6));
  if (node === 'events') return '#eventos';
  if (node.indexOf('event:') === 0) return '#evento~' + encodeURIComponent(node.slice(6));
  if (node === 'spells') return '#magias';
  if (node.indexOf('spell:') === 0) return '#magia~' + encodeURIComponent(node.slice(6));
  if (node === 'advs') return '#vantagens';
  if (node.indexOf('adv:') === 0) return '#vantagem~' + encodeURIComponent(node.slice(4));
  return '#';
}
function mapHref(id) { return hrefFor('map:' + id); }
function locHref(id) { return hrefFor('loc:' + id); }
function spellHref(id) { return hrefFor('spell:' + id); }
function go(hash, replace) {
  if (location.hash === hash) { onRoute(); return; }
  if (replace) { try { history.replaceState(null, '', hash); } catch (e) {} onRoute(); }
  else location.hash = hash;
}
