/* =====================================================================
   Hounds — Roteamento, Menu Lateral & Navegação entre Abas
   ===================================================================== */

(function () {
  var menuEl = $('menu'), app = $('app'), toggle = $('toggle'), menuBtn = $('menuBtn'), scrim = $('scrim');
  var topTitle = $('topTitle');
  var byId = {}, parentOf = {}, expanded = {};
  var S = { route: null, markers: [], markersFor: null, ui: {} };

  window.S = S;
  window.byId = byId;

  function mapNodes(parentId) {
    return childMaps(parentId).map(function (m) {
      return {
        id: 'map:' + m.id,
        label: m.name,
        icon: ICON.map,
        route: true,
        secret: isSecret(m),
        children: mapNodes(m.id)
      };
    });
  }

  function locNodes() {
    return (W.locations || []).filter(function (l) {
      return isMestre() || !isSecret(l);
    }).sort(byName).map(function (l) {
      return { id: 'loc:' + l.id, label: l.name, icon: ICON.pin, route: true, secret: isSecret(l) };
    });
  }

  function charNodes() {
    return (W.characters || []).filter(function (c) {
      return isMestre() || !isSecret(c);
    }).sort(byName).map(function (c) {
      return { id: 'char:' + c.id, label: c.name, icon: ICON.user, route: true, secret: isSecret(c) };
    });
  }

  function noteNodes() {
    return (W.notebooks || []).filter(function (nb) {
      return isMestre() || !isSecret(nb);
    }).sort(byName).map(function (nb) {
      return {
        id: 'nb:' + nb.id,
        label: nb.name,
        icon: ICON.notes,
        route: true,
        secret: isSecret(nb),
        children: nbNotes(nb.id).map(function (n) {
          return { id: 'note:' + n.id, label: n.title, icon: ICON.note, route: true, secret: isSecret(n) };
        })
      };
    });
  }

  function buildMenu() {
    return [
      { id: 'inicio', label: 'Início', icon: ICON.mundo, route: true },
      { id: 'tatica', label: 'Mesa Tática', icon: ICON.tatica, route: true },
      { id: 'mesa', label: 'Mesa de Combate', icon: ICON.mesa, route: true },
      {
        id: 'info',
        label: 'Informações',
        icon: ICON.info,
        children: [
          {
            id: 'mundo',
            label: 'Mundo',
            icon: ICON.mundo,
            children: [
              { id: 'maps', label: 'Maps', icon: ICON.maps, route: true, children: mapNodes(null) },
              { id: 'locais', label: 'Localização', icon: ICON.pin, route: true, children: locNodes() },
              { id: 'chars', label: 'Personagens', icon: ICON.user, route: true, children: charNodes() }
            ]
          }
        ]
      },
      { id: 'notes', label: 'Anotações', icon: ICON.notes, route: true, children: noteNodes() }
    ].concat(isMestre() ? [{ id: 'users', label: 'Usuários', icon: ICON.users, route: true }] : []);
  }

  function indexTree(list, parent) {
    list.forEach(function (n) {
      byId[n.id] = n;
      parentOf[n.id] = parent;
      if (n.children) indexTree(n.children, n.id);
    });
  }

  function ancestors(id) {
    var out = [], p = parentOf[id];
    while (p) {
      out.unshift(p);
      p = parentOf[p];
    }
    return out;
  }
  window.ancestors = ancestors;

  function descendants(id) {
    var out = [];
    ((byId[id] && byId[id].children) || []).forEach(function (c) {
      out.push(c.id);
      out = out.concat(descendants(c.id));
    });
    return out;
  }

  function hrefFor(id) {
    if (id === 'inicio') return '#inicio';
    if (id === 'tatica') return '#tatica';
    if (id === 'mesa') return '#mesa';
    if (id === 'maps') return '#maps';
    if (id === 'locais') return '#locais';
    if (id === 'chars') return '#personagens';
    if (id === 'notes') return '#anotacoes';
    if (id === 'users') return '#usuarios';
    if (id.indexOf('map:') === 0) return '#map~' + encodeURIComponent(id.slice(4));
    if (id.indexOf('loc:') === 0) return '#loc~' + encodeURIComponent(id.slice(4));
    if (id.indexOf('char:') === 0) return '#char~' + encodeURIComponent(id.slice(5));
    if (id.indexOf('nb:') === 0) return '#nb~' + encodeURIComponent(id.slice(3));
    if (id.indexOf('note:') === 0) return '#note~' + encodeURIComponent(id.slice(5));
    return '#' + id;
  }
  window.hrefFor = hrefFor;

  function renderNodes(list, depth) {
    return list.map(function (n) {
      var size = depth ? 16 : 20, isGroup = !!n.children, isPage = !!n.route;
      var label = '<span class="label">' + esc(n.label) + '</span>' + (n.secret ? '<span class="secret-ico" title="Só o Mestre vê">' + svg(EYE_OFF, 13, 2.2) + '</span>' : '');
      var row = '';
      if (isPage && isGroup) {
        row = '<div class="row"><a class="node-row" href="' + hrefFor(n.id) + '" data-id="' + esc(n.id) + '" data-act="page-group" title="' + esc(n.label) + '">' +
          svg(n.icon, size) + label + '</a>' +
          '<button type="button" class="chev-btn" data-id="' + esc(n.id) + '" data-act="toggle" aria-expanded="false" aria-label="Mostrar ou ocultar itens de ' + esc(n.label) + '">' + CHEV + '</button></div>';
      } else if (isGroup) {
        row = '<div class="row"><button type="button" class="node-row" data-id="' + esc(n.id) + '" data-act="toggle" aria-expanded="false" title="' + esc(n.label) + '">' +
          svg(n.icon, size) + label + CHEV + '</button></div>';
      } else {
        row = '<div class="row"><a class="node-row" href="' + hrefFor(n.id) + '" data-id="' + esc(n.id) + '" data-act="page" title="' + esc(n.label) + '">' +
          svg(n.icon, size) + label + '</a></div>';
      }
      var kids = isGroup ? '<div class="kids"><ul>' + (n.children && n.children.length ? renderNodes(n.children, depth + 1) : '<li class="empty-kid">' + esc(n.emptyText || 'Vazio') + '</li>') + '</ul></div>' : '';
      return '<li class="node depth-' + depth + '" data-node="' + esc(n.id) + '">' + row + kids + '</li>';
    }).join('');
  }

  function renderMenu() {
    menuEl = menuEl || $('menu');
    app = app || $('app');
    if (!menuEl) return;

    var menu = buildMenu();
    byId = {};
    parentOf = {};
    indexTree(menu, null);

    Object.keys(expanded).forEach(function (k) { if (!byId[k]) delete expanded[k]; });
    menuEl.innerHTML = renderNodes(menu, 0);

    if (S.route && byId[S.route.node]) revealPath(S.route.node);
    paintMenu();
  }
  window.renderMenu = renderMenu;

  function nodeEl(id) {
    var all = menuEl.querySelectorAll('.node');
    for (var i = 0; i < all.length; i++) {
      if (all[i].getAttribute('data-node') === id) return all[i];
    }
    return null;
  }

  function isShown(id) {
    var p = parentOf[id];
    while (p) {
      if (!expanded[p]) return false;
      p = parentOf[p];
    }
    return true;
  }

  function paintMenu() {
    var cur = S.route ? S.route.node : null, path = cur ? ancestors(cur) : [];
    Object.keys(byId).forEach(function (id) {
      var el = nodeEl(id);
      if (!el) return;
      var shown = isShown(id);
      el.querySelectorAll(':scope > .row > .node-row, :scope > .row > .chev-btn').forEach(function (r) {
        r.tabIndex = shown ? 0 : -1;
      });
      var link = el.querySelector(':scope > .row > a.node-row');
      if (link) {
        if (id === cur) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      }
      el.querySelector(':scope > .row').classList.toggle('current', id === cur);
      el.classList.toggle('on-path', path.indexOf(id) >= 0);
      if (byId[id].children) {
        var open = !!expanded[id];
        el.classList.toggle('open', open);
        el.querySelectorAll(':scope > .row [aria-expanded]').forEach(function (b) {
          b.setAttribute('aria-expanded', String(open));
        });
      }
    });
  }

  function expand(id) { expanded[id] = true; }
  function collapse(id) {
    [id].concat(descendants(id)).forEach(function (d) { expanded[d] = false; });
  }
  function revealPath(id) { ancestors(id).forEach(expand); }

  function bindMenuEvents() {
    menuEl = menuEl || $('menu');
    app = app || $('app');
    toggle = toggle || $('toggle');
    menuBtn = menuBtn || $('menuBtn');
    scrim = scrim || $('scrim');

    if (menuEl) {
      menuEl.addEventListener('click', function (e) {
        var el = e.target.closest('[data-act]');
        if (!el) return;
        var id = el.getAttribute('data-id'), act = el.getAttribute('data-act');
        if (act === 'toggle') {
          e.preventDefault();
          if (app.classList.contains('collapsed') && window.innerWidth > 760) {
            setCollapsed(false);
            revealPath(id);
            expand(id);
            paintMenu();
            return;
          }
          if (expanded[id]) collapse(id); else expand(id);
          paintMenu();
          return;
        }
        e.preventDefault();
        if (act === 'page-group') {
          if (S.route && S.route.node === id && expanded[id]) {
            collapse(id);
            paintMenu();
            return;
          }
          revealPath(id);
          expand(id);
        } else {
          revealPath(id);
        }
        if (app.classList.contains('collapsed') && window.innerWidth > 760 && ancestors(id).length) setCollapsed(false);
        setDrawer(false);
        go(hrefFor(id));
      });
    }

    if (toggle) {
      toggle.addEventListener('click', function () {
        setCollapsed(!app.classList.contains('collapsed'));
      });
    }
    var themeBtn = $('themeBtn');
    if (themeBtn) {
      themeBtn.addEventListener('click', function () {
        var cur = document.documentElement.getAttribute('data-theme') || 'dark';
        var next = cur === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        try { localStorage.setItem('hounds_theme', next); } catch (e) {}
      });
    }
    var brandLink = $('brandLink');
    if (brandLink) {
      brandLink.addEventListener('click', function () {
        setDrawer(false);
      });
    }
    if (menuBtn) {
      menuBtn.addEventListener('click', function () {
        setDrawer(true);
      });
    }
    if (scrim) {
      scrim.addEventListener('click', function () {
        setDrawer(false);
      });
    }
  }

  function setCollapsed(c) {
    app = app || $('app');
    toggle = toggle || $('toggle');
    if (!app) return;
    app.classList.toggle('collapsed', c);
    if (toggle) {
      toggle.setAttribute('aria-expanded', String(!c));
      var span = toggle.querySelector('span');
      if (span) span.textContent = c ? 'Expandir menu' : 'Recolher menu';
    }
    lstore('hounds_rail_collapsed', c ? '1' : '0');
  }

  function setDrawer(open) {
    app = app || $('app');
    scrim = scrim || $('scrim');
    menuBtn = menuBtn || $('menuBtn');
    if (app) app.classList.toggle('drawer', open);
    if (scrim) scrim.hidden = !open;
    if (menuBtn) menuBtn.setAttribute('aria-expanded', String(open));
  }

  function go(href, replace) {
    if (replace) {
      location.replace(href);
    } else {
      location.hash = href.replace(/^#/, '');
    }
  }
  window.go = go;

  /* =====================================================================
     Roteamento Principal
     ===================================================================== */
  function parseHash(h) {
    var raw = (h || location.hash || '').replace(/^#/, '').trim();
    if (!raw || raw === 'inicio' || raw === 'home') return { tab: 'page', page: 'home', node: 'inicio', title: 'Início' };
    if (raw === 'tatica') return { tab: 'tatica', node: 'tatica', title: 'Mesa Tática' };
    if (raw === 'mesa') return { tab: 'mesa', node: 'mesa', title: 'Mesa de Combate' };
    if (raw === 'maps') return { tab: 'page', page: 'maps', node: 'maps', title: 'Mapas' };
    if (raw === 'locais') return { tab: 'page', page: 'locais', node: 'locais', title: 'Localização' };
    if (raw === 'personagens') return { tab: 'page', page: 'chars', node: 'chars', title: 'Personagens' };
    if (raw === 'anotacoes') return { tab: 'page', page: 'notes', node: 'notes', title: 'Anotações' };
    if (raw === 'usuarios') return { tab: 'page', page: 'users', node: 'users', title: 'Usuários' };

    var parts = raw.split('~');
    var p0 = parts[0], p1 = decodeURIComponent(parts[1] || ''), p2 = parts[2];
    if (p0 === 'map') {
      return { tab: p2 === 'explorar' ? 'explorer' : 'page', page: 'map', mapId: p1, explore: p2 === 'explorar', node: 'map:' + p1, title: 'Mapa' };
    }
    if (p0 === 'loc') {
      return { tab: 'page', page: 'local', locId: p1, node: 'loc:' + p1, title: 'Localização' };
    }
    if (p0 === 'char') {
      return { tab: 'page', page: 'char', charId: p1, node: 'char:' + p1, title: 'Personagem' };
    }
    if (p0 === 'nb') {
      return { tab: 'page', page: 'notebook', nbId: p1, node: 'nb:' + p1, title: 'Caderno' };
    }
    if (p0 === 'note') {
      return { tab: 'page', page: 'note', noteId: p1, node: 'note:' + p1, title: 'Anotação' };
    }
    return { tab: 'tatica', node: 'tatica', title: 'Mesa Tática' };
  }

  function onRoute() {
    var r = parseHash();
    S.route = r;

    var vTatica = $('view-tatica'), vMesa = $('view-mesa'), vPage = $('view-page');
    topTitle = topTitle || $('topTitle');
    if (topTitle) topTitle.textContent = r.title || 'Hounds';

    // Fecha explorer se não for explorar
    if (window.Explorer && r.tab !== 'explorer') {
      Explorer.close();
    }

    if (r.tab === 'tatica') {
      if (vTatica) vTatica.hidden = false;
      if (vMesa) vMesa.hidden = true;
      if (vPage) vPage.hidden = true;
      if (window.renderMesaTatica) window.renderMesaTatica();
    } else if (r.tab === 'mesa') {
      if (vTatica) vTatica.hidden = true;
      if (vMesa) vMesa.hidden = false;
      if (vPage) vPage.hidden = true;
      if (window.renderMesaCombate) window.renderMesaCombate();
    } else if (r.tab === 'explorer') {
      if (vTatica) vTatica.hidden = true;
      if (vMesa) vMesa.hidden = true;
      if (vPage) vPage.hidden = false;
      var map = mapById(r.mapId);
      if (map && window.Explorer) {
        Explorer.open(map);
      } else {
        if (window.renderMapPage) window.renderMapPage();
      }
    } else {
      // Página dinâmica
      if (vTatica) vTatica.hidden = true;
      if (vMesa) vMesa.hidden = true;
      if (vPage) vPage.hidden = false;

      if (r.page === 'home' && window.renderHomePage) window.renderHomePage();
      else if (r.page === 'maps' && window.renderMapsPage) window.renderMapsPage();
      else if (r.page === 'map' && window.renderMapPage) window.renderMapPage();
      else if (r.page === 'locais' && window.renderLocaisPage) window.renderLocaisPage();
      else if (r.page === 'local' && window.renderLocalPage) window.renderLocalPage();
      else if (r.page === 'chars' && window.renderCharsPage) window.renderCharsPage();
      else if (r.page === 'char' && window.renderCharPage) window.renderCharPage();
      else if (r.page === 'notes' && window.renderNotesPage) window.renderNotesPage();
      else if (r.page === 'notebook' && window.renderNotebookPage) window.renderNotebookPage();
      else if (r.page === 'note' && window.renderNotePage) window.renderNotePage();
      else if (r.page === 'users' && window.renderUsersPage) window.renderUsersPage();
    }

    renderMenu();
  }

  window.addEventListener('hashchange', onRoute);
  window.onRoute = onRoute;
  window.renderPage = onRoute;

  // Inicialização
  function initApp() {
    bindMenuEvents();

    // Restaura colapso do rail
    if (lstore('hounds_rail_collapsed') === '1' && window.innerWidth > 760) {
      setCollapsed(true);
    }

    // Inicializa banco de dados
    var pStore = null;
    if (sbConfig()) {
      pStore = connectSupabase(sbConfig());
    } else if (window.HOUNDS_FIREBASE) {
      // Firebase fallback se configurado
      pStore = Promise.resolve(LocalStore());
    } else {
      pStore = Promise.resolve(LocalStore());
    }

    pStore.then(function (st) {
      W.store = st;
      return st.init ? st.init() : Promise.resolve();
    }).then(function () {
      // Conecta watchers de cada coleção
      function loadCol(col, name) {
        W.store.watch(col, function (rows) {
          W[name] = rows || [];
          W.raw[name] = rows || [];
          W.loaded[name] = true;
          if (name === 'maps') indexMaps();
          if (name === 'locations') {
            var idx = {}; (rows || []).forEach(function (l) { idx[l.id] = l; }); W.locIdx = idx;
          }
          if (name === 'characters') {
            var cidx = {}; (rows || []).forEach(function (c) { cidx[c.id] = c; }); W.charIdx = cidx;
          }
          renderMenu();
          onRoute();
        });
      }

      loadCol('maps', 'maps');
      loadCol('locations', 'locations');
      loadCol('characters', 'characters');
      loadCol('notebooks', 'notebooks');
      loadCol('notes', 'notes');
      loadCol('users', 'users');

      onRoute();
    }).catch(function (err) {
      console.warn('Erro ao inicializar banco de dados:', err);
      W.store = LocalStore();
      onRoute();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    setTimeout(initApp, 10);
  }
})();
