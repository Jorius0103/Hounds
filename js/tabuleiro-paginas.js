/* =====================================================================
   Hounds — Tabuleiro: a barra de páginas do Mestre e a fita dos jogadores
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   Each board is a page, as in Roll20. The campaign (boardCampaign, one
   item, 'mesa'; migration 34) says where the players are:
     playersBoardId  the ribbon: the board of the group;
     perPlayer       { userId: boardId } for whoever split from the group;
     order           the order of the pages in the Mestre's page bar.
   The page bar (the Mestre's, over the top of the board) lists the pages:
   a click opens one for him, dragging changes the order, and the ribbon
   takes the players to another one. A player who has a board open goes
   to the new one when the Mestre moves them (a hidden board is revealed
   to everyone first). The list of boards shows where the group is.
   ===================================================================== */
var BoardPages = (function () {
  var un = null, doc = null, root = null, open = false, q = '', split = false, target, dragId = null;

  function gm() { return isMestre(); }
  function start() {
    if (un || !W.store) return;
    un = W.store.watch('boardCampaign', function (l) { doc = l.filter(function (x) { return x.id === 'mesa'; })[0] || null; changed(); }, function () {});
  }
  function boardOk(id) { return !!id && !!boardById(id); }
  function playersBoard() { return doc && boardOk(doc.playersBoardId) ? doc.playersBoardId : null; }
  function boardFor(uid) {
    var p = doc && doc.perPlayer && doc.perPlayer[uid];
    return boardOk(p) ? p : playersBoard();
  }
  // The pages in the Mestre's order, then the others by name.
  function ordered() {
    var order = (doc && doc.order) || [], pos = {};
    order.forEach(function (id, i) { pos[id] = i; });
    return W.boards.slice().sort(function (a, b) {
      var pa = a.id in pos ? pos[a.id] : 1e9, pb = b.id in pos ? pos[b.id] : 1e9;
      return pa - pb || byName(a, b);
    });
  }
  function changed() {
    var mine = boardFor(me());
    // A player on a board goes where the Mestre takes them (only on a change, not when they open
    // another board themselves).
    if (!gm() && target !== undefined && mine && mine !== target && S.route && S.route.page === 'board' && S.route.boardId !== mine) {
      var b = boardById(mine);
      toast('O Mestre levou ' + (doc && doc.perPlayer && doc.perPlayer[me()] === mine ? 'você' : 'o grupo') + ' para ' + (b ? b.name : 'outro tabuleiro') + '.');
      go(boardHref(mine));
    }
    target = mine;
    if (open) render();
    if (S.route && S.route.page === 'boards' && !modalOpen) renderBoardsPage();
    BoardView.paintRibbon();
  }

  // ----- writing -----
  function save(p) {
    var t = now();
    var pr = doc ? W.store.patch('boardCampaign', 'mesa', Object.assign({ updatedAt: t }, p))
      : W.store.put('boardCampaign', 'mesa', Object.assign({ playersBoardId: null, perPlayer: {}, order: [], createdBy: me(), createdAt: t, updatedAt: t }, p));
    return pr.catch(function (er) { toast(errorText(er), true); throw er; });
  }
  // The group to board id; a hidden board is revealed to them first.
  function movePlayers(id) {
    var b = boardById(id); if (!b) return;
    var reveal = isSecret(b) ? BoardOps.patch(b, { visible: true, updatedAt: now() }) : Promise.resolve();
    reveal.then(function () {
      var per = Object.assign({}, (doc && doc.perPlayer) || {});
      return save({ playersBoardId: id, perPlayer: per });
    }).then(function () { toast('Os jogadores estão agora em ' + b.name + (isSecret(b) ? ', que foi revelado a eles' : '') + '.'); }, function () {});
  }
  function movePlayer(uid, id) {
    var per = Object.assign({}, (doc && doc.perPlayer) || {});
    if (!id) delete per[uid]; else per[uid] = id;
    var b = id && boardById(id), reveal = b && isSecret(b) ? BoardOps.patch(b, { visible: true, updatedAt: now() }) : Promise.resolve();
    reveal.then(function () { return save({ perPlayer: per }); }).catch(function () {});
  }
  function reorder(id, beforeId) {
    var ids = ordered().map(function (b) { return b.id; }).filter(function (x) { return x !== id; });
    var i = beforeId ? ids.indexOf(beforeId) : -1;
    if (i < 0) ids.push(id); else ids.splice(i, 0, id);
    save({ order: ids }).catch(function () {});
  }

  // ----- the bar -----
  function mount(el) {
    root = el;
    el.addEventListener('click', function (e) {
      var b = e.target.closest('button, [data-open]'); if (!b) return;
      var act = b.getAttribute('data-pg'), card = b.closest('[data-board]'), id = card && card.getAttribute('data-board');
      if (act === 'x') { setOpen(false); return; }
      if (act === 'cfg') { var cur = BoardView.board(); if (cur) openBoardForm(boardById(cur.id) || cur); return; }
      if (act === 'new') { openBoardForm(null); return; }
      if (act === 'split') { split = !split; render(); return; }
      if (act === 'here' && id) { movePlayers(id); return; }
      if (act === 'del' && id) { var del = boardById(id); if (del) confirmDeleteBoard(del); return; }
      if (b.hasAttribute('data-open') && id) { if (!S.route || S.route.boardId !== id) go(boardHref(id)); }
    });
    el.addEventListener('change', function (e) {
      var s = /** @type {AnyEl} */ (e.target);
      if (s.getAttribute('data-pg') === 'ribbon' && s.value) movePlayers(s.value);
      var u = s.getAttribute('data-player'); if (u) movePlayer(u, s.value);
    });
    el.addEventListener('input', function (e) { if (e.target.id === 'bdPgQ') { q = e.target.value.trim(); renderGrid(); } });
    el.addEventListener('dragstart', function (e) { var c = e.target.closest('[data-board]'); if (!c || !e.dataTransfer) return; dragId = c.getAttribute('data-board'); e.dataTransfer.setData('text/plain', dragId); e.dataTransfer.effectAllowed = 'move'; });
    el.addEventListener('dragover', function (e) { if (dragId && e.target.closest('[data-board], .bd-pg-grid')) { e.preventDefault(); } });
    el.addEventListener('drop', function (e) {
      if (!dragId) return;
      e.preventDefault();
      var c = e.target.closest('[data-board]'), before = c ? c.getAttribute('data-board') : null;
      if (before !== dragId) reorder(dragId, before);
      dragId = null;
    });
    el.addEventListener('dragend', function () { dragId = null; });
    el.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } });
  }
  function setOpen(v) { open = !!v && gm(); if (root) { root.hidden = !open; if (open) render(); } BoardView.paintTool('pages', open); }
  function toggle() { setOpen(!open); }
  function thumbHtml(b) {
    return '<span class="thumb"' + (b.image && b.image.ref ? ' data-img="' + esc(b.image.ref) + '"' : ' style="background:' + esc(boardFull(b).bg) + '"') + '>' + (b.image ? '' : svg(ICON.board, 22, 1.6)) + '</span>';
  }
  function render() {
    if (!root || !open) return;
    var cur = BoardView.board(), pb = playersBoard(), players = W.users.filter(function (u) { return u.role !== 'mestre'; }).sort(byName);
    var a = document.activeElement, keepQ = a && a.id === 'bdPgQ';
    root.innerHTML = '<div class="bd-pg-head">' +
      (cur ? '<span class="bd-pg-cur">' + thumbHtml(cur) + '<b>' + esc(cur.name) + '</b><button class="btn ghost" type="button" data-pg="cfg">' + svg(BOARD_ICON.gear, 15) + 'Configurar página</button></span>' : '<span></span>') +
      '<span class="bd-pg-rib"><span class="rib">' + svg(BOARD_ICON.ribbon, 16, 2.2) + '</span><label><span>Jogadores em</span><select data-pg="ribbon" aria-label="Tabuleiro dos jogadores">' +
        (pb ? '' : '<option value="">Nenhum</option>') + ordered().map(function (b) { return '<option value="' + esc(b.id) + '"' + (b.id === pb ? ' selected' : '') + '>' + esc(b.name) + '</option>'; }).join('') + '</select></label>' +
        (players.length ? '<button class="icon-btn' + (split ? ' on' : '') + '" type="button" data-pg="split" aria-pressed="' + split + '" title="Um jogador num tabuleiro diferente do grupo" aria-label="Separar jogadores">' + svg(ICON.users || ICON.user, 16) + '</button>' : '') +
      '</span><button class="icon-btn" type="button" data-pg="x" aria-label="Fechar as páginas" title="Fechar (Esc)">' + svg(ICON.x, 18) + '</button></div>' +
      (split ? '<div class="bd-pg-split">' + players.map(function (u) {
        var p = doc && doc.perPlayer && doc.perPlayer[u.id];
        return '<label><span>' + esc(u.name) + '</span><select data-player="' + esc(u.id) + '"><option value="">Com o grupo</option>' +
          ordered().map(function (b) { return '<option value="' + esc(b.id) + '"' + (b.id === p ? ' selected' : '') + '>' + esc(b.name) + '</option>'; }).join('') + '</select></label>';
      }).join('') + '</div>' : '') +
      '<div class="bd-pg-bar"><input type="search" id="bdPgQ" placeholder="Buscar páginas…" aria-label="Buscar páginas" autocomplete="off" value="' + esc(q) + '">' +
        '<button class="btn primary" type="button" data-pg="new">' + svg(ICON.plus, 15, 2.4) + 'Nova página</button></div>' +
      '<div class="bd-pg-grid" id="bdPgGrid"></div>';
    renderGrid();
    if (keepQ) { var qi = $('bdPgQ'); qi.focus(); qi.setSelectionRange(qi.value.length, qi.value.length); }
  }
  function renderGrid() {
    var g = root && $('bdPgGrid'); if (!g) return;
    var cur = BoardView.board(), pb = playersBoard(), here = BoardView.presence();
    var boards = ordered().filter(function (b) { return !q || norm(b.name).indexOf(norm(q)) >= 0; });
    g.innerHTML = boards.length ? boards.map(function (b) {
      var people = Object.keys(here).filter(function (u) { return here[u].b === b.id && u !== me(); }).map(function (u) { return here[u]; });
      var apart = W.users.filter(function (u) { return doc && doc.perPlayer && doc.perPlayer[u.id] === b.id; });
      return '<div class="bd-pg-card' + (cur && cur.id === b.id ? ' cur' : '') + (b.id === pb ? ' players' : '') + '" draggable="true" data-board="' + esc(b.id) + '">' +
        '<button type="button" class="bd-pg-open" data-open title="Abrir ' + esc(b.name) + '">' + thumbHtml(b) + '<b>' + esc(b.name) + '</b>' +
          '<span class="meta">' + (isSecret(b) ? svg(EYE_OFF, 11, 2.4) + 'Oculto' : '') + (apart.length ? (isSecret(b) ? ' · ' : '') + esc(apart.map(function (u) { return u.name; }).join(', ')) : '') + '</span></button>' +
        (b.id === pb ? '<span class="bd-pg-flag" title="Os jogadores estão aqui">' + svg(BOARD_ICON.ribbon, 18, 2.2) + '</span>'
          : '<button type="button" class="icon-btn bd-pg-here" data-pg="here" title="Levar os jogadores para cá" aria-label="Levar os jogadores para ' + esc(b.name) + '">' + svg(BOARD_ICON.ribbon, 15, 2.2) + '</button>') +
        '<button type="button" class="icon-btn bd-pg-del" data-pg="del" title="Excluir este tabuleiro" aria-label="Excluir ' + esc(b.name) + '">' + svg(ICON.trash, 14) + '</button>' +
        (people.length ? '<span class="bd-pg-people">' + people.map(function (p) { return '<span style="--c:' + esc(p.c) + '" title="' + esc(p.nm) + '">' + esc(initials(p.nm)) + '</span>'; }).join('') + '</span>' : '') +
        '</div>';
    }).join('') : '<p class="bd-note">' + (q ? 'Nenhuma página com esse nome.' : 'Nenhum tabuleiro ainda.') + '</p>';
    fillImages(g);
  }

  // The line of the list of boards: where the group is (and, for a player, the way there).
  function bannerHtml() {
    var mine = boardFor(me()), b = mine && boardById(mine);
    if (!b) return '';
    return '<div class="bd-banner">' + svg(BOARD_ICON.ribbon, 18, 2.2) + '<span>' + (gm() ? 'Os jogadores estão em <b>' + esc(b.name) + '</b>.' : (doc && doc.perPlayer && doc.perPlayer[me()] ? 'Você está em' : 'O grupo está em') + ' <b>' + esc(b.name) + '</b>.') + '</span>' +
      '<a class="btn primary" href="' + esc(boardHref(b.id)) + '">' + (gm() ? 'Abrir' : 'Entrar na mesa') + '</a></div>';
  }

  return { start: start, mount: mount, toggle: toggle, setOpen: setOpen, isOpen: function () { return open; }, refresh: function () { if (open) render(); },
    playersBoard: playersBoard, boardFor: boardFor, bannerHtml: bannerHtml };
})();
