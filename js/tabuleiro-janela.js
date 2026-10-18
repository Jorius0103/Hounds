/* =====================================================================
   Hounds — Tabuleiro: janelas flutuantes (rolador de dados, ordem de turno,
   personagens e anotações do Diário)
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   Floating windows over the board, as in the editor of Roll20: a title
   bar that drags the window, a button that folds it to the bar and one
   that closes it. Each window has an id; opening it again brings it to
   the front with what it shows. Where each window was left is remembered
   in this browser. The board view gives the element they live in (host);
   they stay inside it, also when it changes size.
   ===================================================================== */
var BoardWin = (function () {
  var KEY = 'hounds_board_wins_v1', wins = {}, host = null, top = 20, pos = {};
  try { pos = JSON.parse(lstore(KEY) || '{}') || {}; } catch (e) {}
  var MIN = '<path d="M5 12h14"/>', MAX = '<rect width="14" height="14" x="5" y="5" rx="2"/>';

  function setHost(el) {
    host = el;
    if (typeof ResizeObserver === 'function') new ResizeObserver(function () { Object.keys(wins).forEach(function (id) { clamp(wins[id]); }); }).observe(el);
  }
  function savePos(w) { pos[w.id] = { x: Math.round(w.x), y: Math.round(w.y), min: w.min }; lstore(KEY, JSON.stringify(pos)); }
  // Inside the host, with at least the title bar in sight.
  function clamp(w) {
    if (!host) return;
    var hw = host.clientWidth, hh = host.clientHeight, ew = w.el.offsetWidth || 280;
    w.x = Math.max(4 - ew + 80, Math.min(hw - 80, w.x));
    w.y = Math.max(4, Math.min(hh - 40, w.y));
    w.el.style.left = w.x + 'px'; w.el.style.top = w.y + 'px';
  }
  function front(w) { top += 1; w.el.style.zIndex = String(top); }
  function paintMin(w) {
    w.el.classList.toggle('min', w.min);
    var b = w.el.querySelector('[data-win="min"]');
    b.innerHTML = svg(w.min ? MAX : MIN, 14, 2.4);
    b.setAttribute('aria-label', w.min ? 'Mostrar a janela' : 'Recolher a janela'); b.title = b.getAttribute('aria-label');
  }
  // o: { title, cls, width, x, y (where it opens the first time), onClose, onMin }.
  function open(id, o) {
    var w = wins[id];
    if (!w) {
      var el = document.createElement('section');
      el.className = 'bd-win' + (o.cls ? ' ' + o.cls : '');
      el.setAttribute('role', 'dialog');
      el.innerHTML = '<header class="bd-win-h"><b class="bd-win-t"></b><span class="bd-win-btns">' +
        '<button type="button" class="icon-btn" data-win="min"></button>' +
        '<button type="button" class="icon-btn" data-win="x" aria-label="Fechar" title="Fechar">' + svg(ICON.x, 14, 2.4) + '</button></span></header><div class="bd-win-b"></div>';
      host.appendChild(el);
      var p = pos[id];
      // wired: the caller's handlers are on the body (it wires them once).
      w = wins[id] = { id: id, el: el, body: el.querySelector('.bd-win-b'), x: p ? p.x : (o.x != null ? o.x : 80), y: p ? p.y : (o.y != null ? o.y : 60), min: !!(p && p.min), onClose: null, onMin: null, wired: false };
      if (o.width) el.style.width = o.width + 'px';
      wire(w);
      paintMin(w);
      clamp(w);
    }
    w.onClose = o.onClose || null; w.onMin = o.onMin || null;
    w.el.querySelector('.bd-win-t').textContent = o.title || '';
    w.el.setAttribute('aria-label', o.title || '');
    front(w);
    return w;
  }
  function wire(w) {
    var head = w.el.querySelector('.bd-win-h'), drag = null;
    w.el.addEventListener('pointerdown', function () { front(w); }, true);
    w.el.querySelector('[data-win="x"]').onclick = function () { close(w.id); };
    w.el.querySelector('[data-win="min"]').onclick = function () { w.min = !w.min; paintMin(w); savePos(w); if (w.onMin) w.onMin(w.min); };
    head.addEventListener('dblclick', function (e) { if (e.target.closest('button')) return; w.min = !w.min; paintMin(w); savePos(w); });
    head.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button') || (e.pointerType === 'mouse' && e.button !== 0)) return;
      drag = { id: e.pointerId, dx: e.clientX - w.x, dy: e.clientY - w.y };
      try { head.setPointerCapture(e.pointerId); } catch (er) {}
      e.preventDefault();
    });
    head.addEventListener('pointermove', function (e) {
      if (!drag || drag.id !== e.pointerId) return;
      w.x = e.clientX - drag.dx; w.y = e.clientY - drag.dy; clamp(w);
    });
    function end(e) { if (!drag || drag.id !== e.pointerId) return; drag = null; savePos(w); }
    head.addEventListener('pointerup', end);
    head.addEventListener('pointercancel', end);
  }
  function close(id) {
    var w = wins[id]; if (!w) return;
    delete wins[id];
    if (w.el.parentNode) w.el.parentNode.removeChild(w.el);
    if (w.onClose) w.onClose();
  }
  function closeAll() { Object.keys(wins).forEach(close); }
  function get(id) { return wins[id] || null; }
  return { setHost: setHost, open: open, close: close, closeAll: closeAll, get: get };
})();
