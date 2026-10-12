/* =====================================================================
   Hounds — Prévia do mapa: a imagem na página do mapa, com os marcadores,
   zoom e arrastar, sem abrir o Explorar
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   The map on its page: drag to move; wheel, pinch, double click or the
   keys + - 0 to zoom (no buttons over the map); a click on a marker shows
   what it is. Read only: the
   markers are added and edited in the explorer.
   The view (zoom, center, open marker) is kept in S.ui.view, relative to
   the image, so a redraw of the page (a marker arriving) or a resize
   keeps it; another map starts fitted.
   As in the explorer, the stage is resized instead of CSS-scaled, so the
   map and the markers stay sharp.
   On a touch screen, one finger scrolls the page until the map is zoomed
   in; two fingers always zoom.
   ===================================================================== */
function mapPreview(box, m, markers) {
  var iw = (m.image && m.image.w) || 1000, ih = (m.image && m.image.h) || 750;
  var ui = S.ui, view = ui.view && ui.view.id === m.id ? ui.view : (ui.view = { id: m.id, k: 1, cx: 0.5, cy: 0.5, pin: null });
  box.style.aspectRatio = iw + ' / ' + ih;
  box.innerHTML = '<div class="mprev-vp" tabindex="0" aria-label="Mapa ' + esc(m.name) + '. Arraste para mover. Roda do mouse, dois dedos ou duplo clique dão zoom; a tecla 0 volta ao mapa inteiro.">' +
    '<div class="mprev-stage"><img alt="Mapa ' + esc(m.name) + '"><div class="mprev-pins"></div></div></div>' +
    '<div class="mprev-card" role="dialog" aria-label="Marcador" hidden></div>';
  var vp = box.querySelector('.mprev-vp'), stage = box.querySelector('.mprev-stage'), img = stage.querySelector('img'), pinsEl = box.querySelector('.mprev-pins');
  var card = box.querySelector('.mprev-card');
  var st = { s: 1, tx: 0, ty: 0, fit: 1 };
  W.store.imageUrl(m.image && m.image.ref).then(function (u) { if (u && img.isConnected) img.src = u; });

  function size() { return { w: vp.clientWidth, h: vp.clientHeight }; }
  function clampScale(s) { return Math.min(Math.max(st.fit * 12, 4), Math.max(st.fit, s)); }
  // Smaller than the area: centered. Bigger: no empty margin at the edges.
  function clampPan() {
    var v = size(), sw = iw * st.s, sh = ih * st.s;
    st.tx = sw <= v.w ? (v.w - sw) / 2 : Math.min(0, Math.max(v.w - sw, st.tx));
    st.ty = sh <= v.h ? (v.h - sh) / 2 : Math.min(0, Math.max(v.h - sh, st.ty));
  }
  function apply() {
    var v = size();
    stage.style.width = iw * st.s + 'px'; stage.style.height = ih * st.s + 'px';
    stage.style.transform = 'translate3d(' + Math.round(st.tx) + 'px,' + Math.round(st.ty) + 'px,0)';
    view.k = st.s / st.fit; view.cx = (v.w / 2 - st.tx) / (iw * st.s); view.cy = (v.h / 2 - st.ty) / (ih * st.s);
    vp.style.touchAction = st.s > st.fit * 1.001 ? 'none' : 'pan-y';
  }
  // Fits the image, then goes back to the zoom and center kept in view.
  function layout() {
    var v = size(); if (!v.w || !v.h) return;
    st.fit = Math.min(v.w / iw, v.h / ih); st.s = clampScale(st.fit * (view.k || 1));
    st.tx = v.w / 2 - view.cx * iw * st.s; st.ty = v.h / 2 - view.cy * ih * st.s;
    clampPan(); apply();
  }
  function zoomAt(f, cx, cy) {
    var ns = clampScale(st.s * f); if (ns === st.s) return;
    st.tx = cx - (cx - st.tx) * (ns / st.s); st.ty = cy - (cy - st.ty) * (ns / st.s);
    st.s = ns; clampPan(); apply();
  }
  function zoomCenter(f) { var v = size(); zoomAt(f, v.w / 2, v.h / 2); }
  function fit() { view.k = 1; view.cx = view.cy = 0.5; layout(); }

  // ----- markers -----
  function pinHtml(mk) {
    var c = cat(mk.category);
    return '<button type="button" class="pin' + (isSecret(mk) ? ' secret' : '') + (view.pin === mk.id ? ' sel' : '') + '" data-pin="' + esc(mk.id) + '" style="left:' + (mk.x * 100) + '%;top:' + (mk.y * 100) + '%" aria-label="' + esc((mk.title || 'Marcador') + ', ' + c.label) + '">' +
      '<span class="pin-in"><span class="pin-label">' + esc(mk.title || 'Marcador') + '</span><span class="pin-head" style="background:' + c.color + '">' + svg(c.icon, 15, 2.2) + '</span><span class="pin-tip"></span></span></button>';
  }
  function showCard() {
    var mk = markers.filter(function (x) { return x.id === view.pin; })[0];
    if (!mk) { view.pin = null; card.hidden = true; return; }
    var c = cat(mk.category), l = mk.locationId && locById(mk.locationId), lm = mk.linkedMapId && mk.linkedMapId !== m.id && mapById(mk.linkedMapId);
    card.innerHTML = '<div class="mprev-card-head"><span class="dot" style="background:' + c.color + '">' + svg(c.icon, 13) + '</span><b>' + esc(mk.title || 'Marcador') + '</b>' +
      '<button class="icon-btn" type="button" data-close aria-label="Fechar">' + svg(ICON.x, 15, 2.4) + '</button></div>' +
      '<span class="meta">' + esc(c.label) + (l ? ' · Local: <a class="inline" href="' + locHref(l.id) + '">' + esc(l.name) + '</a>' : '') + '</span>' +
      (mk.description ? '<p>' + esc(clip(mk.description, 240)) + '</p>' : '') +
      '<div class="btn-row">' + (lm ? '<a class="btn primary" href="' + mapHref(lm.id) + '">' + svg(ICON.map, 14) + 'Abrir ' + esc(lm.name) + '</a>' : '') +
      '<a class="btn" href="#map~' + encodeURIComponent(m.id) + '~explorar" data-focus="' + esc(mk.id) + '">' + svg(ICON.explore, 14) + 'Ver no Explorar</a></div>';
    card.hidden = false;
  }
  function renderPins() { pinsEl.innerHTML = markers.map(pinHtml).join(''); showCard(); }
  function select(id) { view.pin = id; renderPins(); }
  pinsEl.addEventListener('pointerdown', function (e) { if (e.target.closest('.pin')) e.stopPropagation(); });
  pinsEl.addEventListener('click', function (e) { var b = e.target.closest('.pin'); if (b) select(view.pin === b.getAttribute('data-pin') ? null : b.getAttribute('data-pin')); });
  card.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]')) { select(null); vp.focus(); return; }
    var a = e.target.closest('[data-focus]'); if (a) Explorer.pending = { markerId: a.getAttribute('data-focus') };
  });

  // ----- input: drag, pinch, wheel, double click, keys, buttons -----
  var pts = {}, gesture = null;
  function ptList() { return Object.keys(pts).map(function (k) { return pts[k]; }); }
  vp.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pts[e.pointerId] = { x: e.clientX, y: e.clientY };
    var l = ptList();
    // One finger on a fitted map is left to the page (scroll); it is not captured.
    if (e.pointerType !== 'touch' || l.length > 1 || st.s > st.fit * 1.001) { try { vp.setPointerCapture(e.pointerId); } catch (er) {} }
    gesture = { moved: 0, multi: l.length > 1 || !!(gesture && gesture.multi) };
    if (l.length === 2) { gesture.dist = Math.hypot(l[0].x - l[1].x, l[0].y - l[1].y); gesture.mid = { x: (l[0].x + l[1].x) / 2, y: (l[0].y + l[1].y) / 2 }; }
  });
  vp.addEventListener('pointermove', function (e) {
    if (!pts[e.pointerId] || !gesture) return;
    var prev = pts[e.pointerId]; pts[e.pointerId] = { x: e.clientX, y: e.clientY };
    var l = ptList();
    if (l.length === 1) {
      var dx = e.clientX - prev.x, dy = e.clientY - prev.y;
      gesture.moved += Math.abs(dx) + Math.abs(dy);
      if (gesture.moved > 4) vp.classList.add('dragging');
      st.tx += dx; st.ty += dy; clampPan(); apply();
    } else if (l.length >= 2) {
      var r = vp.getBoundingClientRect(), d = Math.hypot(l[0].x - l[1].x, l[0].y - l[1].y), mid = { x: (l[0].x + l[1].x) / 2, y: (l[0].y + l[1].y) / 2 };
      if (gesture.dist) { st.tx += mid.x - gesture.mid.x; st.ty += mid.y - gesture.mid.y; zoomAt(d / gesture.dist, mid.x - r.left, mid.y - r.top); clampPan(); apply(); }
      gesture.dist = d; gesture.mid = mid; gesture.moved += 10; gesture.multi = true;
    }
  });
  function endPointer(e) {
    if (!pts[e.pointerId]) return;
    delete pts[e.pointerId];
    var l = ptList();
    if (l.length === 1 && gesture) { gesture.dist = null; gesture.mid = { x: l[0].x, y: l[0].y }; return; }
    if (l.length) return;
    vp.classList.remove('dragging');
    // A click on the map (not a drag) closes the open marker.
    var tap = gesture && gesture.moved <= 6 && !gesture.multi && e.type === 'pointerup';
    gesture = null;
    if (tap && view.pin) select(null);
  }
  vp.addEventListener('pointerup', endPointer);
  vp.addEventListener('pointercancel', endPointer);
  vp.addEventListener('wheel', function (e) {
    e.preventDefault();
    var r = vp.getBoundingClientRect(), dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    zoomAt(Math.exp(-dy * 0.0016), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  vp.addEventListener('dblclick', function (e) { if (e.target.closest('.pin')) return; var r = vp.getBoundingClientRect(); zoomAt(1.8, e.clientX - r.left, e.clientY - r.top); });
  vp.addEventListener('keydown', function (e) {
    var k = e.key, step = 60;
    if (k === '+' || k === '=') zoomCenter(1.3);
    else if (k === '-' || k === '_') zoomCenter(1 / 1.3);
    else if (k === '0') fit();
    else if (k === 'ArrowLeft') { st.tx += step; clampPan(); apply(); }
    else if (k === 'ArrowRight') { st.tx -= step; clampPan(); apply(); }
    else if (k === 'ArrowUp') { st.ty += step; clampPan(); apply(); }
    else if (k === 'ArrowDown') { st.ty -= step; clampPan(); apply(); }
    else if (k === 'Escape' && view.pin) select(null);
    else return;
    e.preventDefault();
  });

  // Follows the box's size (window resized, menu collapsed); stops when the page is redrawn.
  if (window.ResizeObserver) {
    var ro = new ResizeObserver(function () { if (!vp.isConnected) { ro.disconnect(); return; } layout(); });
    ro.observe(vp);
  }
  layout();
  renderPins();
}
