/* =====================================================================
   Hounds — Tabuleiro: a ordem de turno
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   The turn order of a board (boardTurns, one per board, migration 34),
   in a window of its own, as Roll20's Turn Order. The items are in the
   order they act; the one whose turn it is (turn) is marked here and its
   token glows on the board. Passing the turn goes to the next item and,
   after the last one, to the first, in a new round.
   In GURPS the order is by Basic Speed: a token of a character with a
   sheet comes in with it.
   The Mestre opens the window (open: the players see it too), passes the
   turns, sorts, adds loose items (an effect, the end of the round) and
   clears. A player puts in, changes the value of and takes out the tokens
   they control (the database keeps the rest as it is), and can hide the
   window on their own screen until the Mestre opens it again.
   ===================================================================== */
var BoardTurns = (function () {
  var un = null, all = [], doc = null, boardId = null, hiddenHere = false, menuOpen = false, adding = false, lastTurn = null, quiet = false;

  function gm() { return isMestre(); }
  function start() { if (un || !W.store) return; un = W.store.watch('boardTurns', onData, function () { toast('Não foi possível carregar a ordem de turno.', true); }); }
  function stop() { if (un) { un(); un = null; } all = []; doc = null; boardId = null; closeWin(); }
  function setBoard(id) { if (id === boardId) return; boardId = id; hiddenHere = false; menuOpen = adding = false; lastTurn = null; pick(); }
  function pick() { doc = all.filter(function (d) { return d.id === boardId; })[0] || null; paint(); }
  function onData(l) {
    var wasOpen = !!(doc && doc.open);
    all = l; pick();
    if (doc && doc.open && !wasOpen) hiddenHere = false; // the Mestre opened it again: it shows to everyone
    var cur = current();
    if (cur && cur.id !== lastTurn) {
      var t = cur.tokenId && BoardView.tokenById(cur.tokenId);
      if (lastTurn !== null && t && !gm() && (t.ownerIds || []).indexOf(me()) >= 0 && doc.open) toast('É a vez de ' + (t.name || 'seu token') + '.');
      lastTurn = cur.id;
    }
    BoardView.redraw();
  }

  // ----- reading -----
  function items() { return (doc && doc.items) || []; }
  function current() {
    var l = items(); if (!l.length) return null;
    for (var i = 0; i < l.length; i++) if (l[i].id === doc.turn) return l[i];
    return l[0];
  }
  function tokOf(it) { return it.tokenId ? BoardView.tokenById(it.tokenId) : null; }
  // A player doesn't see the items of the Mestre's layer (nor of tokens they can't see).
  function shownItem(it) {
    var t = tokOf(it);
    if (it.tokenId && !t) return gm();
    return gm() || !t || BoardView.tokenVisible(t);
  }
  function ownsItem(it) { var t = tokOf(it); return !!t && (t.ownerIds || []).indexOf(me()) >= 0; }
  // The token whose turn it is, for the glow on the board (only if this person sees it).
  function activeTokenId() {
    if (!doc || !doc.open) return null;
    var c = current();
    return c && c.tokenId && shownItem(c) ? c.tokenId : null;
  }
  function has(tokId) { return items().some(function (it) { return it.tokenId === tokId; }); }
  // GURPS: the Basic Speed of the character's sheet, with the advantages' effects.
  function speedOf(t) { var v = t && boardSheetVitals(t.characterId); return v ? v.speed : ''; }
  function valNum(v) { var n = typeof v === 'number' ? v : parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : null; }

  // ----- writing -----
  function save(p) {
    if (!boardId || !W.store) return Promise.resolve();
    var t = now();
    var pr = doc ? W.store.patch('boardTurns', boardId, Object.assign({ updatedAt: t }, p))
      : W.store.put('boardTurns', boardId, Object.assign({ boardId: boardId, items: [], turn: null, round: 1, open: true, createdBy: me(), createdAt: t, updatedAt: t }, p));
    return pr.catch(function (er) { toast(errorText(er), true); });
  }
  function addToken(t) {
    if (!t || !canWrite()) return;
    if (has(t.id)) { toast((t.name || 'O token') + ' já está na ordem de turno.'); openWin(); return; }
    if (!gm() && !doc) { toast('Peça ao Mestre para abrir a ordem de turno.', true); return; }
    var it = { id: uid(), tokenId: t.id, name: '', value: speedOf(t) };
    save(gm() && !(doc && doc.open) ? { items: items().concat([it]), open: true } : { items: items().concat([it]) });
    hiddenHere = false; paint();
  }
  function removeItem(id) { save({ items: items().filter(function (x) { return x.id !== id; }) }); }
  function setValue(id, v) {
    var n = valNum(v), val = n != null && String(v).trim() !== '' ? n : String(v || '').trim().slice(0, 12);
    save({ items: items().map(function (x) { return x.id === id ? Object.assign({}, x, { value: val }) : x; }) });
  }
  function step(dir) {
    var l = items(); if (!l.length) return;
    var i = l.indexOf(current()) + dir, round = (doc && doc.round) || 1;
    if (i >= l.length) { i = 0; round++; }
    if (i < 0) { i = l.length - 1; round = Math.max(1, round - 1); }
    save({ turn: l[i].id, round: round });
  }
  // The highest first (GURPS: Basic Speed); values that aren't numbers go last, in their order.
  function sort() {
    var l = items().map(function (x, i) { return { x: x, i: i, n: valNum(x.value) }; });
    l.sort(function (a, b) { if (a.n == null && b.n == null) return a.i - b.i; if (a.n == null) return 1; if (b.n == null) return -1; return b.n - a.n || a.i - b.i; });
    save({ items: l.map(function (o) { return o.x; }) });
  }

  // ----- the window -----
  function shouldShow() { return !!boardId && (gm() ? !!(doc && doc.open) : !!(doc && doc.open) && !hiddenHere); }
  function openWin() {
    if (gm()) { if (!(doc && doc.open)) save({ open: true }); }
    else if (!(doc && doc.open)) { toast('A ordem de turno está fechada. O Mestre abre quando começar o combate.'); return; }
    hiddenHere = false; paint();
  }
  function toggle() { if (shouldShow()) closeByUser(); else openWin(); }
  function closeByUser() {
    if (gm()) save({ open: false });
    else hiddenHere = true;
    closeWin();
  }
  function closeWin() { quiet = true; BoardWin.close('turns'); quiet = false; BoardView.paintTool('turns', false); }
  function paint() {
    if (!shouldShow()) { if (BoardWin.get('turns')) closeWin(); return; }
    var w = BoardWin.open('turns', { title: 'Ordem de turno', cls: 'bd-turns', width: 270, x: 12, y: Math.max(60, window.innerHeight - 520), onClose: function () { if (!quiet) closeByUser(); } });
    BoardView.paintTool('turns', true);
    var a = document.activeElement;
    if (a && w.body.contains(a) && a.tagName === 'INPUT') return; // a value being typed: redraws when it is left
    w.body.innerHTML = bodyHtml();
    fillImages(w.body);
    if (!w.wired) { wire(w); w.wired = true; }
    var cur = w.body.querySelector('.cur'); if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' });
  }
  function thumb(it) {
    var t = tokOf(it), ref = boardTokenImageRef(t), name = it.name || (t && t.name) || 'Sem nome';
    return '<span class="bd-dot" style="border-color:' + esc((t && t.color) || 'var(--line-2)') + '"' + (ref ? ' data-img="' + esc(ref) + '"' : '') + '>' + (t ? esc(initials(name)) : svg(ICON.target, 13, 2)) + '</span>';
  }
  function bodyHtml() {
    var l = items().filter(shownItem), cur = current(), isGm = gm() && canWrite();
    var html = '<div class="bd-turn-top"><span>Rodada <b>' + esc((doc && doc.round) || 1) + '</b></span>' +
      (isGm ? '<button class="icon-btn" type="button" data-tt="sort" title="Ordenar: maior primeiro" aria-label="Ordenar: maior primeiro">' + svg('<path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="M11 4h10"/><path d="M11 8h7"/><path d="M11 12h4"/>', 16, 2.2) + '</button>' : '') + '</div>';
    if (!l.length) {
      html += '<p class="bd-note bd-turn-empty">Nenhum token deste tabuleiro na ordem de turno.<br>Clique com o botão direito num token e escolha <b>Adicionar ao turno</b> (ou selecione e aperte <kbd>Ctrl</kbd>+<kbd>U</kbd>).</p>';
    } else {
      html += '<ol class="bd-turn-list">' + l.map(function (it) {
        var t = tokOf(it), mine = ownsItem(it), can = canWrite() && (isGm || mine), v = it.value == null ? '' : String(it.value).replace('.', ',');
        return '<li class="' + (cur && it.id === cur.id ? 'cur' : '') + (t && t.layer === 'gm' ? ' gmtok' : '') + '" data-it="' + esc(it.id) + '">' + thumb(it) +
          '<button type="button" class="nm" data-tt="go"' + (t ? '' : ' disabled') + ' title="' + (t ? 'Centralizar no token' : 'Item avulso') + '">' + esc(it.name || (t && t.name) || 'Sem nome') + '</button>' +
          (can ? '<input type="text" inputmode="decimal" maxlength="12" value="' + esc(v) + '" data-tt="val" aria-label="Iniciativa de ' + esc(it.name || (t && t.name) || 'item') + '">' : '<span class="val">' + esc(v) + '</span>') +
          (can ? '<button class="icon-btn" type="button" data-tt="del" aria-label="Tirar da ordem" title="Tirar da ordem">' + svg(ICON.x, 13, 2.4) + '</button>' : '') + '</li>';
      }).join('') + '</ol>';
    }
    if (isGm) {
      html += (adding ? '<form class="bd-turn-add" data-tt="addform"><input type="text" maxlength="80" placeholder="Item avulso (ex.: Fim da rodada)" aria-label="Nome do item" id="bdTurnName"><input type="text" maxlength="12" placeholder="Valor" aria-label="Valor" id="bdTurnVal"><button class="btn" type="submit">Pôr</button></form>' : '') +
        (menuOpen ? '<div class="bd-turn-menu" role="menu">' +
          '<button type="button" role="menuitem" data-tt="sort">Ordenar: maior primeiro</button>' +
          '<button type="button" role="menuitem" data-tt="add">Pôr um item avulso</button>' +
          '<button type="button" role="menuitem" data-tt="round1">Voltar para a rodada 1</button>' +
          '<button type="button" role="menuitem" class="danger" data-tt="clear">Limpar a ordem</button></div>' : '') +
        '<div class="bd-turn-foot"><button class="btn" type="button" data-tt="prev" aria-label="Turno anterior" title="Turno anterior">' + svg('<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>', 16, 2.4) + '</button>' +
        '<button class="icon-btn" type="button" data-tt="menu" aria-expanded="' + menuOpen + '" aria-label="Mais opções" title="Mais opções">' + svg(BOARD_ICON.gear, 16) + '</button>' +
        '<button class="btn primary" type="button" data-tt="next" aria-label="Próximo turno" title="Próximo turno">' + svg(ICON.arrow, 16, 2.4) + '</button></div>';
    } else if (cur && shownItem(cur)) {
      var ct = tokOf(cur);
      html += '<div class="bd-turn-foot pl"><span>Vez de <b>' + esc(cur.name || (ct && ct.name) || '—') + '</b></span></div>';
    }
    return html;
  }
  function wire(w) {
    w.body.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var act = b.getAttribute('data-tt'), li = b.closest('[data-it]'), id = li && li.getAttribute('data-it');
      if (act === 'next') step(1);
      else if (act === 'prev') step(-1);
      else if (act === 'sort') { menuOpen = false; sort(); }
      else if (act === 'menu') { menuOpen = !menuOpen; paint(); }
      else if (act === 'add') { menuOpen = false; adding = true; paint(); var n = $('bdTurnName'); if (n) n.focus(); }
      else if (act === 'round1') { menuOpen = false; save({ round: 1, turn: items().length ? items()[0].id : null }); }
      else if (act === 'clear') { menuOpen = false; save({ items: [], turn: null, round: 1 }); }
      else if (act === 'del' && id) removeItem(id);
      else if (act === 'go' && id) { var it = items().filter(function (x) { return x.id === id; })[0]; if (it && it.tokenId) BoardView.focusToken(it.tokenId); }
    });
    w.body.addEventListener('change', function (e) {
      var el = /** @type {AnyEl} */ (e.target);
      if (el.getAttribute('data-tt') !== 'val') return;
      var li = el.closest('[data-it]'); if (li) setValue(li.getAttribute('data-it'), el.value);
    });
    w.body.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.getAttribute && e.target.getAttribute('data-tt') === 'val') e.target.blur(); });
    w.body.addEventListener('focusout', function () { setTimeout(function () { if (!w.body.contains(document.activeElement)) paint(); }, 0); });
    w.body.addEventListener('submit', function (e) {
      e.preventDefault();
      var n = $('bdTurnName'), v = $('bdTurnVal'), name = n ? n.value.trim() : '';
      if (!name) { if (n) n.focus(); return; }
      var val = v ? v.value.trim() : '', num = valNum(val);
      adding = false;
      save({ items: items().concat([{ id: uid(), tokenId: null, name: name.slice(0, 80), value: num != null && val !== '' ? num : val.slice(0, 12) }]) });
    });
  }

  return { start: start, stop: stop, setBoard: setBoard, toggle: toggle, shown: shouldShow, addToken: addToken, has: has, activeTokenId: activeTokenId, refresh: paint };
})();
