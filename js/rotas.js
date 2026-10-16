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
     #fichas · #ficha~<id> · #ficha~<id>~<ally id> (an ally, in its main sheet's page) · #eventos · #evento~<id>
     #pericia~<id> is a skill under Perícias; #pericia-combate~<id> the same page under Combate
     #desvantagens · #desvantagem~<id> · #armas · #arma~<id> · #armaduras · #armadura~<id> · #itens · #item~<id>
     #melhoramentos · #melhoramento~<id>
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
  if (p[0] === 'ficha' && p[1]) return { page: 'sheet', sheetId: p[1], allyId: p[2] || null, node: 'sheet:' + p[1] };
  if (p[0] === 'eventos') return { page: 'events', node: 'events' };
  if (p[0] === 'evento' && p[1]) return { page: 'event', eventId: p[1], node: 'event:' + p[1] };
  if (p[0] === 'organizacoes') return { page: 'orgs', node: 'orgs' };
  if (p[0] === 'organizacao' && p[1]) return { page: 'org', orgId: p[1], node: 'org:' + p[1] };
  if (p[0] === 'magias') return { page: 'spells', node: 'spells' };
  if (p[0] === 'magia' && p[1]) return { page: 'spell', spellId: p[1], node: 'spell:' + p[1] };
  if (p[0] === 'vantagens') return { page: 'advs', node: 'advs' };
  if (p[0] === 'vantagem' && p[1]) return { page: 'adv', advId: p[1], node: 'adv:' + p[1] };
  if (p[0] === 'desvantagens') return { page: 'disadvs', node: 'disadvs' };
  if (p[0] === 'desvantagem' && p[1]) return { page: 'disadv', disadvId: p[1], node: 'disadv:' + p[1] };
  if (p[0] === 'pericias') return { page: 'skills', node: 'skills' };
  if (p[0] === 'pericia' && p[1]) return { page: 'skill', skillId: p[1], node: 'skill:' + p[1] };
  if (p[0] === 'combate') return { page: 'combat', node: 'combat' };
  if (p[0] === 'pericia-combate' && p[1]) return { page: 'skill', skillId: p[1], node: 'cskill:' + p[1] };
  if (p[0] === 'tecnica' && p[1]) return { page: 'tech', techId: p[1], node: 'tech:' + p[1] };
  if (p[0] === 'estilo' && p[1]) return { page: 'style', styleId: p[1], node: 'style:' + p[1] };
  if (p[0] === 'armas') return { page: 'weapons', node: 'weapons' };
  if (p[0] === 'arma' && p[1]) return { page: 'weapon', weaponId: p[1], node: 'weapon:' + p[1] };
  if (p[0] === 'armaduras') return { page: 'armors', node: 'armors' };
  if (p[0] === 'armadura' && p[1]) return { page: 'armor', armorId: p[1], node: 'armor:' + p[1] };
  if (p[0] === 'itens') return { page: 'items', node: 'items' };
  if (p[0] === 'item' && p[1]) return { page: 'item', itemId: p[1], node: 'item:' + p[1] };
  if (p[0] === 'melhoramentos') return { page: 'improvements', node: 'improvements' };
  if (p[0] === 'melhoramento' && p[1]) return { page: 'improvement', improvementId: p[1], node: 'impr:' + p[1] };
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
  if (node === 'disadvs') return '#desvantagens';
  if (node.indexOf('disadv:') === 0) return '#desvantagem~' + encodeURIComponent(node.slice(7));
  if (node === 'skills') return '#pericias';
  if (node.indexOf('skill:') === 0) return '#pericia~' + encodeURIComponent(node.slice(6));
  if (node === 'combat') return '#combate';
  if (node.indexOf('cskill:') === 0) return '#pericia-combate~' + encodeURIComponent(node.slice(7));
  if (node.indexOf('tech:') === 0) return '#tecnica~' + encodeURIComponent(node.slice(5));
  if (node.indexOf('style:') === 0) return '#estilo~' + encodeURIComponent(node.slice(6));
  if (node === 'weapons') return '#armas';
  if (node.indexOf('weapon:') === 0) return '#arma~' + encodeURIComponent(node.slice(7));
  if (node === 'armors') return '#armaduras';
  if (node.indexOf('armor:') === 0) return '#armadura~' + encodeURIComponent(node.slice(6));
  if (node === 'items') return '#itens';
  if (node.indexOf('item:') === 0) return '#item~' + encodeURIComponent(node.slice(5));
  if (node === 'improvements') return '#melhoramentos';
  if (node.indexOf('impr:') === 0) return '#melhoramento~' + encodeURIComponent(node.slice(5));
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
