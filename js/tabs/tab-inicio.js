/* =====================================================================
   Hounds — Página inicial
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   Home: the first page when the site opens, and where the Mesa's exit
   button and the paw mark in the menu lead.
   ===================================================================== */
function renderHomePage() {
  var u = window.hubUser;
  var count = function (kind, n, one, many) { return W.loaded[kind] ? (n ? plural(n, one, many) : 'Nenhum ainda') : 'Carregando…'; };
  var card = function (href, icon, title, meta, cls) {
    return '<a class="nb-card' + (cls ? ' ' + cls : '') + '" href="' + href + '"><span class="ico">' + svg(icon, 20) + '</span><span class="txt"><strong>' + esc(title) + '</strong><span class="meta">' + esc(meta) + '</span></span></a>';
  };
  var notesMeta = !W.loaded.notebooks ? 'Carregando…' : W.notebooks.length ? plural(W.notebooks.length, 'título', 'títulos') + ' · ' + plural(W.notes.length, 'anotação', 'anotações') : 'Nenhum título ainda';
  var cards = [
    card('#mesa', ICON.mesa, 'Mesa de Combate', 'Combates, NPCs e o log de cada round', 'feature'),
    card('#maps', ICON.maps, 'Maps', count('maps', W.maps.length, 'mapa', 'mapas')),
    card('#locais', ICON.pin, 'Locais', count('locations', W.locations.length, 'local', 'locais')),
    card('#personagens', ICON.user, 'Personagens', count('characters', W.characters.length, 'personagem', 'personagens')),
    card('#organizacoes', ICON.org, 'Organizações', count('organizations', W.organizations.length, 'organização', 'organizações')),
    card('#anotacoes', ICON.notes, 'Anotações', notesMeta)
  ];
  if (isMestre()) cards.push(card('#usuarios', ICON.users, 'Usuários', W.users.length ? plural(W.users.length, 'usuário', 'usuários') : 'Gerenciar quem entra no hub'));

  // What changed lately, across the kinds of things people open most.
  var recent = [].concat(
    W.maps.map(function (m) { return { t: m.updatedAt || m.createdAt, href: mapHref(m.id), icon: ICON.map, name: m.name, kind: 'Mapa', item: m }; }),
    W.locations.map(function (l) { return { t: l.updatedAt || l.createdAt, href: locHref(l.id), icon: ICON.pin, name: l.name, kind: 'Local', item: l }; }),
    W.characters.map(function (c) { return { t: c.updatedAt || c.createdAt, href: charHref(c.id), icon: ICON.user, name: c.name, kind: 'Personagem', item: c }; }),
    W.organizations.map(function (o) { return { t: o.updatedAt || o.createdAt, href: orgHref(o.id), icon: ICON.org, name: o.name, kind: 'Organização', item: o }; }),
    W.notes.map(function (n) { return { t: n.updatedAt || n.createdAt, href: hrefFor('note:' + n.id), icon: ICON.note, name: n.title, kind: 'Anotação', item: n }; })
  ).sort(function (a, b) { return (b.t || 0) - (a.t || 0); }).slice(0, 6);
  var allLoaded = W.loaded.maps && W.loaded.locations && W.loaded.characters && W.loaded.notes;
  var recentHtml = recent.length ? '<div class="note-list">' + recent.map(function (x) {
    return '<a class="note-row" href="' + x.href + '"><span class="ico">' + svg(x.icon, 18) + '</span><span class="txt"><strong>' + esc(x.name || 'Sem nome') + (isSecret(x.item) ? ' ' + secretTag(x.item) : '') + '</strong>' +
      '<span class="meta">' + esc(x.kind) + (x.t ? ' · atualizado em ' + esc(fmtDate(x.t)) : '') + '</span></span></a>';
  }).join('') + '</div>' : allLoaded ? '<div class="empty-state">' + svg(ICON.notes, 34, 1.6) + '<strong>Nada por aqui ainda</strong><span>Mapas, locais, personagens e anotações criados vão aparecer aqui.</span></div>' : '<p class="lede">Carregando…</p>';

  pageRoot.innerHTML =
    '<div class="home-hero"><div class="brand-mark" aria-hidden="true">' + BRAND_MARK + '</div><div><span class="badge">Campanha GURPS</span>' +
      '<h1>' + (u ? 'Olá, ' + esc(u.name) : 'Hounds') + '</h1><p class="lede">Mapas, locais, personagens, anotações e a Mesa de Combate do grupo. Escolha por onde começar.</p></div></div>' +
    notice() +
    '<div class="nb-grid home-grid">' + cards.join('') + '</div>' +
    '<section><h2 class="sec-title">Atualizados recentemente</h2>' + recentHtml + '</section>';
}
