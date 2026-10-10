/* =====================================================================
   Hounds — Explorer de mapas: arrastar, zoom e marcadores
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   Explorer: pan / zoom / markers (markers can be linked to locations)
   The stage is the image at natural size; one transform moves it.
   Markers sit at x·100% / y·100% of the stage, counter-scaled.
   ===================================================================== */
var Explorer = (function () {
  var ex = $('explorer'), vp = $('viewport'), stage = $('stage'), img = $('stageImg'), pinsEl = $('pins');
  var panel = $('panel'), pBody = $('panelBody'), pTitle = $('panelTitle'), hint = $('hint');
  var st = { map: null, s: 1, tx: 0, ty: 0, fit: 1, w: 1, h: 1, ready: false };
  var markers = [], selected = null, mode = null, draft = null, panelView = null, filter = {}, query = '';
  CATEGORIES.forEach(function (c) { filter[c.id] = true; });
  var api = { pending: null };

  function vpSize() { return { w: vp.clientWidth, h: vp.clientHeight }; }
  function clampScale(s) { var max = Math.max(st.fit * 12, 4), min = st.fit * 0.5; return Math.min(max, Math.max(min, s)); }
  function clampPan() {
    var v = vpSize(), sw = st.w * st.s, sh = st.h * st.s, mx = Math.min(140, v.w * 0.3), my = Math.min(140, v.h * 0.3);
    st.tx = Math.min(v.w - mx, Math.max(mx - sw, st.tx));
    st.ty = Math.min(v.h - my, Math.max(my - sh, st.ty));
  }
  function apply() {
    stage.style.transform = 'translate(' + st.tx + 'px,' + st.ty + 'px) scale(' + st.s + ')';
    stage.style.setProperty('--inv', String(1 / st.s));
    $('zVal').textContent = Math.round(st.s * 100) + '%';
  }
  function fitView() {
    var v = vpSize(); if (!v.w || !v.h) return;
    st.fit = Math.min(v.w / st.w, v.h / st.h) * 0.94; st.s = st.fit;
    st.tx = (v.w - st.w * st.s) / 2; st.ty = (v.h - st.h * st.s) / 2; apply();
  }
  function zoomAt(f, cx, cy) {
    var ns = clampScale(st.s * f); if (ns === st.s) return;
    st.tx = cx - (cx - st.tx) * (ns / st.s); st.ty = cy - (cy - st.ty) * (ns / st.s);
    st.s = ns; clampPan(); apply();
  }
  function zoomCenter(f) { var v = vpSize(); zoomAt(f, v.w / 2, v.h / 2); }
  function centerOn(x, y, minScale) {
    var v = vpSize();
    if (minScale && st.s < minScale) st.s = clampScale(minScale);
    st.tx = v.w / 2 - x * st.w * st.s; st.ty = v.h / 2 - y * st.h * st.s; clampPan(); apply();
  }
  function toImage(cx, cy) {
    var r = vp.getBoundingClientRect(), x = (cx - r.left - st.tx) / st.s / st.w, y = (cy - r.top - st.ty) / st.s / st.h;
    return { x: x, y: y, inside: x >= 0 && x <= 1 && y >= 0 && y <= 1 };
  }

  // ----- input: drag to pan, pinch / wheel to zoom, tap to place -----
  var pts = {}, gesture = null;
  function ptList() { return Object.keys(pts).map(function (k) { return pts[k]; }); }
  vp.addEventListener('pointerdown', function (e) {
    if (e.target.closest('.pin')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    vp.setPointerCapture(e.pointerId);
    pts[e.pointerId] = { x: e.clientX, y: e.clientY };
    var l = ptList();
    gesture = { moved: 0, multi: l.length > 1 || (gesture && gesture.multi) };
    if (l.length === 2) { gesture.dist = Math.hypot(l[0].x - l[1].x, l[0].y - l[1].y); gesture.mid = { x: (l[0].x + l[1].x) / 2, y: (l[0].y + l[1].y) / 2 }; }
  });
  vp.addEventListener('pointermove', function (e) {
    if (!pts[e.pointerId]) return;
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
    var left = ptList().length;
    if (left === 1) { var l = ptList(); gesture.dist = null; gesture.mid = { x: l[0].x, y: l[0].y }; return; }
    if (left > 0) return;
    vp.classList.remove('dragging');
    var tap = gesture && gesture.moved <= 6 && !gesture.multi && e.type === 'pointerup';
    gesture = null;
    if (tap) onTap(e.clientX, e.clientY);
  }
  vp.addEventListener('pointerup', endPointer);
  vp.addEventListener('pointercancel', endPointer);
  vp.addEventListener('wheel', function (e) {
    e.preventDefault();
    var r = vp.getBoundingClientRect(), dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    zoomAt(Math.exp(-dy * 0.0016), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  vp.addEventListener('dblclick', function (e) { if (e.target.closest('.pin') || mode) return; var r = vp.getBoundingClientRect(); zoomAt(1.8, e.clientX - r.left, e.clientY - r.top); });
  vp.addEventListener('keydown', function (e) {
    var k = e.key, step = 60;
    if (k === '+' || k === '=') zoomCenter(1.3);
    else if (k === '-' || k === '_') zoomCenter(1 / 1.3);
    else if (k === '0') fitView();
    else if (k === 'ArrowLeft') { st.tx += step; clampPan(); apply(); }
    else if (k === 'ArrowRight') { st.tx -= step; clampPan(); apply(); }
    else if (k === 'ArrowUp') { st.ty += step; clampPan(); apply(); }
    else if (k === 'ArrowDown') { st.ty -= step; clampPan(); apply(); }
    else return;
    e.preventDefault();
  });

  var linkPreset = null;
  function onTap(cx, cy) {
    if (!mode) return;
    var p = toImage(cx, cy);
    if (!p.inside) { toast('Clique dentro da imagem do mapa.', true); return; }
    p.x = Math.round(p.x * 1e6) / 1e6; p.y = Math.round(p.y * 1e6) / 1e6;
    if (mode === 'add') {
      setMode(null);
      var lk = linkPreset && locById(linkPreset); linkPreset = null;
      draft = { x: p.x, y: p.y, title: lk ? lk.name : '', description: '', category: CATEGORIES[0].id, locationId: lk ? lk.id : null };
      selected = null; renderPins(); showForm(draft);
    } else if (mode.move) {
      var m = findMarker(mode.move); setMode(null);
      if (!m) return;
      var moved = Object.assign({}, m, { x: p.x, y: p.y });
      saveMarker(moved).then(function () { toast('Marcador movido.'); }, function (er) { toast(errorText(er), true); });
      markers = markers.map(function (x) { return x.id === m.id ? moved : x; });
      selected = m.id; renderPins(); showInfo(m.id);
    }
  }
  function setMode(m) {
    mode = m; vp.classList.toggle('placing', !!m);
    var add = $('exAdd'); add.classList.toggle('on', m === 'add'); add.setAttribute('aria-pressed', String(m === 'add'));
    hint.hidden = !m;
    if (m === 'add') hint.textContent = linkPreset && locById(linkPreset) ? 'Clique no ponto do mapa onde fica ' + locById(linkPreset).name + '.' : 'Clique ou toque no ponto do mapa para colocar o marcador.';
    else if (m && m.move) hint.textContent = 'Clique ou toque na nova posição do marcador.';
  }

  function saveMarker(m) {
    var col = 'maps/' + st.map.id + '/markers', t = now();
    var lid = m.locationId && (locById(m.locationId) || rawHas('locations', m.locationId)) ? m.locationId : null;
    return W.store.put(col, m.id || null, { x: m.x, y: m.y, title: m.title, description: m.description || '', category: m.category, locationId: lid, visible: m.visible !== false, createdBy: owner(m.id ? m : null), createdAt: m.createdAt || t, updatedAt: t });
  }
  function findMarker(id) { for (var i = 0; i < markers.length; i++) if (markers[i].id === id) return markers[i]; return null; }
  function pinHtml(m, extra) {
    var c = cat(m.category);
    return '<button type="button" class="pin' + (extra || '') + (isSecret(m) ? ' secret' : '') + (selected === m.id ? ' sel' : '') + '" data-pin="' + esc(m.id || '') + '" style="left:' + (m.x * 100) + '%;top:' + (m.y * 100) + '%" aria-label="' + esc((m.title || 'Novo marcador') + ', ' + c.label) + '">' +
      '<span class="pin-in"><span class="pin-label">' + esc(m.title || 'Novo marcador') + '</span><span class="pin-head" style="background:' + c.color + '">' + svg(c.icon, 15, 2.2) + '</span><span class="pin-tip"></span></span></button>';
  }
  function renderPins() {
    var visible = markers.filter(function (m) { return filter[cat(m.category).id] !== false; });
    pinsEl.innerHTML = visible.map(function (m) { return pinHtml(m); }).join('') + (draft ? pinHtml(draft, ' draft') : '');
    $('exCount').textContent = markers.length ? '(' + markers.length + ')' : '';
  }
  pinsEl.addEventListener('click', function (e) {
    var b = e.target.closest('.pin'); if (!b) return;
    e.stopPropagation();
    var id = b.getAttribute('data-pin'); if (!id) return;
    draft = null; selected = id; renderPins(); showInfo(id);
  });
  pinsEl.addEventListener('pointerdown', function (e) { if (e.target.closest('.pin')) e.stopPropagation(); });

  function openPanel(title, html, view) {
    panelView = view; pTitle.textContent = title; pBody.innerHTML = html; panel.hidden = false;
    $('exList').setAttribute('aria-pressed', String(view === 'list')); $('exList').classList.toggle('on', view === 'list');
  }
  function closePanel() {
    panel.hidden = true; panelView = null; draft = null; selected = null; renderPins();
    $('exList').setAttribute('aria-pressed', 'false'); $('exList').classList.remove('on');
  }
  $('panelClose').addEventListener('click', function () { closePanel(); vp.focus(); });

  function showInfo(id) {
    var m = findMarker(id); if (!m) return closePanel();
    var c = cat(m.category), can = canWrite(), l = m.locationId && locById(m.locationId);
    var html = '<span class="cat-chip"><i style="background:' + c.color + '">' + svg(c.icon, 11, 2.4) + '</i>' + esc(c.label) + '</span>';
    if (l) {
      var chars = locChars(l);
      html += '<div class="loc-mini"><span class="badge">' + svg(ICON.pin, 12, 2.4) + 'Local</span>' + (l.image ? '<div id="locMiniImg"></div>' : '') +
        '<b style="font-size:15px">' + esc(l.name) + '</b>' + (l.description ? '<p>' + esc(clip(l.description, 220)) + '</p>' : '') +
        (chars.length ? '<div class="people">' + chars.map(personChip).join('') + '</div>' : '') +
        '<div><a class="btn primary" href="' + locHref(l.id) + '">' + svg(ICON.arrow, 15) + 'Ver localização</a></div></div>';
    }
    html += (m.description ? '<p class="desc">' + esc(m.description) + '</p>' : (l ? '' : '<p class="desc none">Sem descrição.</p>')) +
      '<div class="coords">Posição na imagem: ' + Math.round(m.x * st.w) + ', ' + Math.round(m.y * st.h) + ' px</div>' +
      '<div class="btn-row"><button class="btn" type="button" data-a="center">' + svg(ICON.target, 15) + 'Centralizar</button>' +
      (can ? '<button class="btn" type="button" data-a="edit">' + svg(ICON.edit, 15) + 'Editar</button><button class="btn" type="button" data-a="move">' + svg(ICON.move, 15) + 'Mover</button><button class="btn danger" type="button" data-a="delete">' + svg(ICON.trash, 15) + 'Excluir</button>' : '') +
      '</div><div id="delConfirm"></div>';
    openPanel(m.title, html, 'info');
    fillImages(pBody);
    if (l && l.image) W.store.imageUrl(l.image.ref).then(function (u) { var b = $('locMiniImg'); if (b && u) b.innerHTML = '<img src="' + esc(u) + '" alt="">'; });
    pBody.querySelector('[data-a=center]').onclick = function () { centerOn(m.x, m.y, st.fit * 2); };
    var ed = pBody.querySelector('[data-a=edit]'); if (ed) ed.onclick = function () { showForm(Object.assign({}, m)); };
    var mv = pBody.querySelector('[data-a=move]'); if (mv) mv.onclick = function () { setMode({ move: m.id }); if (window.innerWidth <= 760) panel.hidden = true; };
    var dl = pBody.querySelector('[data-a=delete]'); if (dl) dl.onclick = function () {
      $('delConfirm').innerHTML = '<div class="confirm" role="alert"><span>Excluir o marcador <b>' + esc(m.title) + '</b>?' + (l ? ' O local continua cadastrado.' : '') + '</span><div class="btn-row"><button class="btn danger solid" type="button" id="delYes">Excluir</button><button class="btn ghost" type="button" id="delNo">Cancelar</button></div></div>';
      $('delNo').onclick = function () { $('delConfirm').innerHTML = ''; };
      $('delYes').onclick = function () {
        $('delYes').disabled = true;
        W.store.remove('maps/' + st.map.id + '/markers', m.id).then(function () { toast('Marcador excluído.'); }, function (er) { toast(errorText(er), true); });
        markers = markers.filter(function (x) { return x.id !== m.id; }); closePanel();
      };
    };
  }

  function locOptions(selectedId) {
    var here = mapLocations(st.map.id), others = W.locations.filter(function (x) { return x.mapId !== st.map.id; }).sort(byName);
    function opt(x) { return '<option value="' + esc(x.id) + '"' + (x.id === selectedId ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }
    return '<option value="">Nenhum</option>' + (here.length ? '<optgroup label="Neste mapa">' + here.map(opt).join('') + '</optgroup>' : '') + (others.length ? '<optgroup label="Outros locais">' + others.map(opt).join('') + '</optgroup>' : '');
  }
  function showForm(m) {
    var isNew = !m.id, autoTitle = m.locationId && locById(m.locationId) ? locById(m.locationId).name : null;
    var cats = CATEGORIES.map(function (c) { return '<label class="cat-opt"><input type="radio" name="mkCat" value="' + c.id + '"' + (cat(m.category).id === c.id ? ' checked' : '') + '><i style="background:' + c.color + '">' + svg(c.icon, 11, 2.4) + '</i><span>' + esc(c.label) + '</span></label>'; }).join('');
    var html = '<form id="mkForm" class="panel-body" style="padding:0" novalidate>' +
      (W.locations.length ? '<div class="field"><label for="mkLoc">Local vinculado</label><select id="mkLoc">' + locOptions(m.locationId) + '</select><span class="hint-text">Ao clicar no marcador, aparecem as informações do local.</span></div>' : '') +
      '<div class="field" id="fMkTitle"><label for="mkTitle">Nome</label><input type="text" id="mkTitle" maxlength="80" autocomplete="off" value="' + esc(m.title) + '" placeholder="Ex.: Portão norte"><div class="err" id="mkTitleErr"></div></div>' +
      '<div class="field"><label for="mkDesc">Descrição</label><textarea id="mkDesc" maxlength="4000" placeholder="Anotação sobre este ponto">' + esc(m.description) + '</textarea></div>' +
      '<fieldset class="field" style="border:0;padding:0;margin:0"><legend class="lab" style="margin-bottom:6px">Categoria</legend><div class="cat-grid">' + cats + '</div></fieldset>' +
      flagHtml('mkVis', isNew ? null : m) +
      '<div class="btn-row"><button class="btn primary" type="submit">' + (isNew ? 'Salvar marcador' : 'Salvar alterações') + '</button><button class="btn ghost" type="button" id="mkCancel">Cancelar</button></div></form>';
    openPanel(isNew ? 'Novo marcador' : 'Editar marcador', html, 'form');
    var f = $('mkForm'), t = $('mkTitle'), ls = $('mkLoc');
    setTimeout(function () { t.focus(); }, 30);
    if (ls) ls.addEventListener('change', function () {
      var lk = locById(ls.value);
      if (lk && (!t.value.trim() || t.value === autoTitle)) { t.value = lk.name; autoTitle = lk.name; }
      if (draft) { draft.locationId = ls.value || null; draft.title = t.value; renderPins(); }
    });
    f.querySelectorAll('input[name=mkCat]').forEach(function (r) { r.addEventListener('change', function () { if (draft) { draft.category = r.value; renderPins(); } }); });
    t.addEventListener('input', function () { if (t.value.trim()) { $('fMkTitle').classList.remove('invalid'); $('mkTitleErr').textContent = ''; } if (draft) draft.title = t.value; });
    $('mkCancel').onclick = function () { if (isNew) closePanel(); else showInfo(m.id); };
    f.onsubmit = function (e) {
      e.preventDefault();
      var title = t.value.trim();
      if (!title) { $('fMkTitle').classList.add('invalid'); $('mkTitleErr').textContent = 'Dê um nome ao marcador.'; t.focus(); return; }
      var chosen = f.querySelector('input[name=mkCat]:checked');
      var body = Object.assign({}, m, { title: title, description: $('mkDesc').value.trim(), category: chosen ? chosen.value : CATEGORIES[0].id, locationId: ls ? (ls.value || (m.locationId && !locById(m.locationId) && rawHas('locations', m.locationId) ? m.locationId : null)) : (m.locationId || null), visible: flagVal('mkVis', isNew ? null : m) });
      var btn = f.querySelector('[type=submit]'); btn.disabled = true;
      saveMarker(body).then(function (id) {
        body.id = id;
        markers = findMarker(id) ? markers.map(function (x) { return x.id === id ? body : x; }) : markers.concat([body]);
        draft = null; selected = id; renderPins(); showInfo(id);
        toast(isNew ? 'Marcador criado.' : 'Marcador salvo.');
      }, function (er) { btn.disabled = false; toast(errorText(er), true); });
    };
  }

  function showList() {
    var counts = {}; markers.forEach(function (m) { var k = cat(m.category).id; counts[k] = (counts[k] || 0) + 1; });
    var chips = CATEGORIES.filter(function (c) { return counts[c.id]; }).map(function (c) { return '<button type="button" class="filter" data-cat="' + c.id + '" aria-pressed="' + (filter[c.id] !== false) + '"><i style="background:' + c.color + '"></i>' + esc(c.label) + ' <span class="meta">' + counts[c.id] + '</span></button>'; }).join('');
    var q = norm(query);
    var list = markers.filter(function (m) { var l = m.locationId && locById(m.locationId); return filter[cat(m.category).id] !== false && (!q || norm(m.title + ' ' + (m.description || '') + ' ' + (l ? l.name : '')).indexOf(q) >= 0); });
    var html = (markers.length ? '<label class="sec-title" for="mkSearch" style="margin:0">Buscar</label><input class="search" id="mkSearch" type="search" placeholder="Nome, descrição ou local" value="' + esc(query) + '" autocomplete="off">' +
      (chips ? '<div><div class="sec-title" style="margin-bottom:8px">Categorias</div><div class="filters">' + chips + '</div></div>' : '') : '') +
      (list.length ? '<ul class="mk-list" style="max-height:none">' + list.map(function (m) {
        var c = cat(m.category), l = m.locationId && locById(m.locationId);
        return '<li><button type="button" class="mk-item' + (selected === m.id ? ' sel' : '') + '" data-go="' + esc(m.id) + '"><span class="dot" style="background:' + c.color + '">' + svg(c.icon, 14) + '</span><span class="t"><b>' + esc(m.title) + '</b><span>' + esc(l ? 'Local: ' + l.name : c.label) + '</span></span></button></li>';
      }).join('') + '</ul>' : '<p class="lede" style="font-size:13px">' + (markers.length ? 'Nenhum marcador com esses filtros.' : 'Este mapa ainda não tem marcadores.' + (canWrite() ? ' Use <b>Adicionar marcador</b> e clique no ponto do mapa.' : '')) + '</p>');
    openPanel('Marcadores (' + markers.length + ')', html, 'list');
    var s = $('mkSearch'); if (s) s.addEventListener('input', function () { query = s.value; var pos = s.selectionStart; showList(); var n = $('mkSearch'); n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} });
    pBody.querySelectorAll('[data-cat]').forEach(function (b) { b.onclick = function () { var k = b.getAttribute('data-cat'); filter[k] = filter[k] === false; renderPins(); showList(); }; });
    pBody.querySelectorAll('[data-go]').forEach(function (b) { b.onclick = function () { var m = findMarker(b.getAttribute('data-go')); if (!m) return; selected = m.id; renderPins(); centerOn(m.x, m.y, st.fit * 2); showInfo(m.id); }; });
  }

  $('exList').addEventListener('click', function () { if (panelView === 'list') closePanel(); else { draft = null; showList(); } });
  $('exAdd').addEventListener('click', function () {
    if (mode === 'add') { setMode(null); linkPreset = null; return; }
    if (draft) { draft = null; renderPins(); }
    if (panelView === 'form' || panelView === 'info') closePanel();
    setMode('add'); vp.focus();
  });
  $('zIn').addEventListener('click', function () { zoomCenter(1.4); });
  $('zOut').addEventListener('click', function () { zoomCenter(1 / 1.4); });
  $('zFit').addEventListener('click', fitView);
  $('exClose').addEventListener('click', leave);
  function leave() { go(st.map ? mapHref(st.map.id) : '#maps'); }
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (modalOpen) { closeModal(); return; }
    if (ex.hidden) { setDrawer(false); return; }
    if (mode) { setMode(null); linkPreset = null; return; }
    if (!panel.hidden) { closePanel(); vp.focus(); return; }
    leave();
  });
  window.addEventListener('resize', function () {
    if (ex.hidden || !st.ready) return;
    var v = vpSize(), oldFit = st.fit;
    st.fit = Math.min(v.w / st.w, v.h / st.h) * 0.94;
    if (Math.abs(st.s - oldFit) < 1e-6) fitView(); else { st.s = clampScale(st.s); clampPan(); apply(); }
  });

  function runPending() {
    var p = api.pending; if (!p || !st.ready) return;
    if (p.linkLocationId) {
      api.pending = null;
      if (!canWrite()) return;
      linkPreset = p.linkLocationId; setMode('add'); return;
    }
    var m = p.markerId ? findMarker(p.markerId) : markers.filter(function (x) { return x.locationId === p.locationId; })[0];
    if (!m) return; // markers may still be loading
    api.pending = null; selected = m.id; renderPins(); centerOn(m.x, m.y, st.fit * 2); showInfo(m.id);
  }
  api.open = function (map) {
    var same = st.map && st.map.id === map.id && !ex.hidden;
    st.map = map; $('exTitle').textContent = map.name; $('exAdd').hidden = !canWrite();
    if (same) return;
    ex.hidden = false;
    setMode(null); draft = null; selected = null; panel.hidden = true; panelView = null; query = ''; linkPreset = null;
    markers = S.markersFor === map.id ? S.markers.slice() : [];
    st.w = (map.image && map.image.w) || 1000; st.h = (map.image && map.image.h) || 1000;
    stage.style.width = st.w + 'px'; stage.style.height = st.h + 'px';
    st.ready = false; img.removeAttribute('src');
    fitView(); renderPins();
    W.store.imageUrl(map.image && map.image.ref).then(function (u) {
      img.onload = function () {
        if (img.naturalWidth && (img.naturalWidth !== st.w || img.naturalHeight !== st.h)) { st.w = img.naturalWidth; st.h = img.naturalHeight; stage.style.width = st.w + 'px'; stage.style.height = st.h + 'px'; }
        st.ready = true; fitView(); runPending();
      };
      img.src = u;
    });
    if (ex.requestFullscreen && window.innerWidth > 760) { try { var pr = ex.requestFullscreen(); if (pr && pr.catch) pr.catch(function () {}); } catch (e) {} }
  };
  api.close = function () {
    if (ex.hidden) return;
    ex.hidden = true; setMode(null); panel.hidden = true; panelView = null; draft = null; selected = null; linkPreset = null;
    if (document.fullscreenElement && document.exitFullscreen) { try { var p = document.exitFullscreen(); if (p && p.catch) p.catch(function () {}); } catch (e) {} }
  };
  api.setMarkers = function (list) {
    markers = list.slice();
    if (selected && !findMarker(selected)) { selected = null; if (panelView === 'info') closePanel(); }
    renderPins();
    if (panelView === 'list') showList();
    else if (panelView === 'info' && selected) showInfo(selected);
    runPending();
  };
  api.refresh = function () { if (ex.hidden) return; renderPins(); if (panelView === 'info' && selected) showInfo(selected); };
  api.isOpen = function () { return !ex.hidden; };
  return api;
})();
