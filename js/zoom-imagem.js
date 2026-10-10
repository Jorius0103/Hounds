/* =====================================================================
   Hounds — Visualizador de imagem em tela cheia
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   Image zoom: full-screen viewer. Click toggles zoom at that point, the
   wheel or a pinch zooms, dragging pans, Esc / ✕ / a click outside closes.
   ===================================================================== */
function zoomImage(url, alt) {
  var back = document.createElement('div'), prev = /** @type {HTMLElement} */ (document.activeElement);
  back.className = 'zoom-back'; back.setAttribute('role', 'dialog'); back.setAttribute('aria-modal', 'true'); back.setAttribute('aria-label', alt || 'Imagem');
  back.innerHTML = '<img class="zoom-img" alt="' + esc(alt || '') + '" draggable="false">' +
    '<div class="zoom-bar"><button class="icon-btn" type="button" data-z="out" aria-label="Diminuir zoom">−</button><span class="zoom-pct" aria-live="polite">100%</span>' +
    '<button class="icon-btn" type="button" data-z="in" aria-label="Aumentar zoom">+</button><button class="icon-btn" type="button" data-z="close" aria-label="Fechar">' + svg(ICON.x, 16, 2.4) + '</button></div>';
  document.body.appendChild(back);
  var img = back.querySelector('.zoom-img'), pct = back.querySelector('.zoom-pct');
  var s = 1, tx = 0, ty = 0, MAX = 6, ptrs = {}, drag = null, pinch = null;
  function clampT() {
    var r = back.getBoundingClientRect(), w = img.offsetWidth * s, h = img.offsetHeight * s;
    var mx = Math.max(0, (w - r.width) / 2), my = Math.max(0, (h - r.height) / 2);
    tx = Math.max(-mx, Math.min(mx, tx)); ty = Math.max(-my, Math.min(my, ty));
  }
  function paint(anim) {
    clampT();
    img.style.transition = anim ? 'transform .18s ease' : 'none';
    img.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + s + ')';
    img.style.cursor = s > 1 ? 'grab' : 'zoom-in';
    pct.textContent = Math.round(s * 100) + '%';
  }
  // Zoom to `ns`, keeping the screen point (x, y) still.
  function zoomAt(ns, x, y, anim) {
    ns = Math.max(1, Math.min(MAX, ns));
    var r = back.getBoundingClientRect(), px = x - (r.left + r.width / 2), py = y - (r.top + r.height / 2);
    tx = px - (px - tx) * ns / s; ty = py - (py - ty) * ns / s; s = ns;
    if (s === 1) { tx = 0; ty = 0; }
    paint(anim);
  }
  function center() { var r = back.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }
  function close() {
    document.removeEventListener('keydown', onKey, true);
    back.remove();
    if (prev && prev.focus) prev.focus();
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === '+' || e.key === '=') { var c = center(); zoomAt(s * 1.5, c[0], c[1], true); }
    else if (e.key === '-') { var c2 = center(); zoomAt(s / 1.5, c2[0], c2[1], true); }
  }
  document.addEventListener('keydown', onKey, true);
  back.querySelector('.zoom-bar').addEventListener('click', function (e) {
    var b = e.target.closest('[data-z]'); if (!b) return;
    var z = b.getAttribute('data-z'), c = center();
    if (z === 'close') close(); else zoomAt(z === 'in' ? s * 1.5 : s / 1.5, c[0], c[1], true);
  });
  back.addEventListener('wheel', function (e) { e.preventDefault(); zoomAt(s * Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY, false); }, { passive: false });
  back.addEventListener('pointerdown', function (e) {
    if (e.target.closest('.zoom-bar')) return;
    ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
    var ids = Object.keys(ptrs);
    if (ids.length === 2) {
      var a = ptrs[ids[0]], b = ptrs[ids[1]];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, s: s }; drag = null;
    } else if (ids.length === 1) {
      drag = { x: e.clientX, y: e.clientY, tx: tx, ty: ty, moved: false, onImg: e.target === img };
    }
    try { back.setPointerCapture(e.pointerId); } catch (er) {}
  });
  back.addEventListener('pointermove', function (e) {
    if (!ptrs[e.pointerId]) return;
    ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
    var ids = Object.keys(ptrs);
    if (pinch && ids.length === 2) {
      var a = ptrs[ids[0]], b = ptrs[ids[1]];
      zoomAt(pinch.s * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d, (a.x + b.x) / 2, (a.y + b.y) / 2, false);
    } else if (drag) {
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
      if (drag.moved && s > 1) { tx = drag.tx + dx; ty = drag.ty + dy; img.style.cursor = 'grabbing'; paint(false); }
    }
  });
  function up(e) {
    if (!ptrs[e.pointerId]) return;
    delete ptrs[e.pointerId];
    if (pinch) { if (!Object.keys(ptrs).length) pinch = null; drag = null; return; }
    var d = drag; drag = null;
    if (!d || d.moved || e.type === 'pointercancel') { paint(false); return; }
    if (d.onImg) { if (s > 1) zoomAt(1, e.clientX, e.clientY, true); else zoomAt(2.5, e.clientX, e.clientY, true); }
    else close();
  }
  back.addEventListener('pointerup', up);
  back.addEventListener('pointercancel', up);
  window.addEventListener('resize', function onResize() { if (!back.isConnected) { window.removeEventListener('resize', onResize); return; } paint(false); });
  img.onload = function () { paint(false); };
  img.src = url;
  back.querySelector('[data-z="close"]').focus();
}
