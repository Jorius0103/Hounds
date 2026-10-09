/* =====================================================================
   Hounds — Aba: Início / Visão Geral da Campanha
   ===================================================================== */
(function () {
  function renderHomePage() {
    var pageRoot = $('pageRoot');
    if (!pageRoot) return;

    var u = window.hubUser;
    var count = function (kind, n, one, many) {
      return W.loaded[kind] ? (n ? plural(n, one, many) : 'Nenhum ainda') : 'Carregando…';
    };
    var card = function (href, icon, title, meta, cls) {
      return '<a class="nb-card' + (cls ? ' ' + cls : '') + '" href="' + href + '">' +
        '<span class="ico">' + svg(icon, 20) + '</span>' +
        '<span class="txt"><strong>' + esc(title) + '</strong><span class="meta">' + esc(meta) + '</span></span></a>';
    };

    var notesMeta = !W.loaded.notebooks ? 'Carregando…' : W.notebooks.length ? plural(W.notebooks.length, 'título', 'títulos') + ' · ' + plural(W.notes.length, 'anotação', 'anotações') : 'Nenhum título ainda';

    var cards = [
      card('#tatica', ICON.tatica, 'Mesa Tática', 'Grid hexagonal GURPS, tokens e medição de distância', 'feature'),
      card('#mesa', ICON.mesa, 'Mesa de Combate', 'Combates, NPCs e o log de cada round'),
      card('#maps', ICON.maps, 'Maps', count('maps', W.maps.length, 'mapa', 'mapas')),
      card('#locais', ICON.pin, 'Localização', count('locations', W.locations.length, 'local', 'locais')),
      card('#personagens', ICON.user, 'Personagens', count('characters', W.characters.length, 'personagem', 'personagens')),
      card('#anotacoes', ICON.notes, 'Anotações', notesMeta)
    ];

    if (isMestre()) {
      cards.push(card('#usuarios', ICON.users, 'Usuários', W.users.length ? plural(W.users.length, 'usuário', 'usuários') : 'Gerenciar quem entra no hub'));
    }

    // Itens modificados recentemente
    var recent = [].concat(
      W.maps.map(function (m) { return { t: m.updatedAt || m.createdAt, href: mapHref(m.id), icon: ICON.map, name: m.name, kind: 'Mapa', item: m }; }),
      W.locations.map(function (l) { return { t: l.updatedAt || l.createdAt, href: locHref(l.id), icon: ICON.pin, name: l.name, kind: 'Local', item: l }; }),
      W.characters.map(function (c) { return { t: c.updatedAt || c.createdAt, href: charHref(c.id), icon: ICON.user, name: c.name, kind: 'Personagem', item: c }; }),
      W.notes.map(function (n) { return { t: n.updatedAt || n.createdAt, href: hrefFor('note:' + n.id), icon: ICON.note, name: n.title, kind: 'Anotação', item: n }; })
    ).sort(function (a, b) { return (b.t || 0) - (a.t || 0); }).slice(0, 6);

    var allLoaded = W.loaded.maps && W.loaded.locations && W.loaded.characters && W.loaded.notes;
    var recentHtml = recent.length ? '<div class="note-list">' + recent.map(function (x) {
      return '<a class="note-row" href="' + x.href + '"><span class="ico">' + svg(x.icon, 18) + '</span><span class="txt"><strong>' + esc(x.name || 'Sem nome') + (isSecret(x.item) ? ' ' + secretTag() : '') + '</strong>' +
        '<span class="meta">' + esc(x.kind) + (x.t ? ' · atualizado em ' + esc(fmtDate(x.t)) : '') + '</span></span></a>';
    }).join('') + '</div>' : allLoaded ? '<div class="empty-state">' + svg(ICON.notes, 34, 1.6) + '<strong>Nada por aqui ainda</strong><span>Mapas, locais, personagens e anotações criados vão aparecer aqui.</span></div>' : '<p class="lede">Carregando…</p>';

    var BRAND_SVG = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/></svg>';

    pageRoot.innerHTML =
      '<div class="home-hero"><div class="brand-mark" aria-hidden="true">' + BRAND_SVG + '</div><div><span class="badge">Campanha GURPS</span>' +
        '<h1>' + (u ? 'Olá, ' + esc(u.name) : 'Hounds') + '</h1><p class="lede">Mesa Tática, combates, mapas, locais, personagens e anotações da campanha. Escolha por onde começar.</p></div></div>' +
      notice() +
      '<div class="nb-grid home-grid">' + cards.join('') + '</div>' +
      '<section><h2 class="sec-title">Atualizados recentemente</h2>' + recentHtml + '</section>';
  }

  window.renderHomePage = renderHomePage;
})();
