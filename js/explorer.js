/* =====================================================================
   Hounds — Explorador de Mapas em Tela Cheia (Pins, Zoom, Pan)
   ===================================================================== */

var Explorer = (function () {
  var ex = $('explorer'), vp = $('viewport'), stage = $('stage'), img = $('stageImg'), pinsEl = $('pins');
  var panel = $('panel'), pBody = $('panelBody'), pTitle = $('panelTitle'), hint = $('hint');
  var st = { map: null, s: 1, tx: 0, ty: 0, fit: 1, w: 1, h: 1, ready: false };
  var markers = [], selected = null, mode = null, draft = null, panelView = null, filter = {}, query = '';
  var modalOpen = false;

  CATEGORIES.forEach(function (c) { filter[c.id] = true; });
  var api = { pending: null };

  function initElements() {
    ex = ex || $('explorer');
    vp = vp || $('viewport');
    stage = stage || $('stage');
    img = img || $('stageImg');
    pinsEl = pinsEl || $('pins');
    panel = panel || $('panel');
    pBody = pBody || $('panelBody');
    pTitle = pTitle || $('panelTitle');
    hint = hint || $('hint');
  }

  function vpSize() {
    initElements();
    return { w: vp.clientWidth || window.innerWidth, h: vp.clientHeight || window.innerHeight };
  }

  function clampScale(s) {
    var max = Math.max(st.fit * 12, 4), min = st.fit * 0.5;
    return Math.min(max, Math.max(min, s));
  }

  function clampPan() {
    var v = vpSize(), sw = st.w * st.s, sh = st.h * st.s;
    var mx = Math.min(140, v.w * 0.3), my = Math.min(140, v.h * 0.3);
    st.tx = Math.min(v.w - mx, Math.max(mx - sw, st.tx));
    st.ty = Math.min(v.h - my, Math.max(my - sh, st.ty));
  }

  function apply() {
    initElements();
    stage.style.transform = 'translate(' + st.tx + 'px,' + st.ty + 'px) scale(' + st.s + ')';
    stage.style.setProperty('--inv', String(1 / st.s));
    var zv = $('zVal');
    if (zv) zv.textContent = Math.round(st.s * 100) + '%';
  }

  function fitView() {
    var v = vpSize();
    if (!v.w || !v.h) return;
    st.fit = Math.min(v.w / st.w, v.h / st.h) * 0.94;
    st.s = st.fit;
    st.tx = (v.w - st.w * st.s) / 2;
    st.ty = (v.h - st.h * st.s) / 2;
    apply();
  }

  function zoomAt(f, cx, cy) {
    var ns = clampScale(st.s * f);
    if (ns === st.s) return;
    st.tx = cx - (cx - st.tx) * (ns / st.s);
    st.ty = cy - (cy - st.ty) * (ns / st.s);
    st.s = ns;
    clampPan();
    apply();
  }

  function zoomCenter(f) {
    var v = vpSize();
    zoomAt(f, v.w / 2, v.h / 2);
  }

  function centerOn(x, y, minScale) {
    var v = vpSize();
    if (minScale && st.s < minScale) st.s = clampScale(minScale);
    st.tx = v.w / 2 - x * st.w * st.s;
    st.ty = v.h / 2 - y * st.h * st.s;
    clampPan();
    apply();
  }

  function toImage(cx, cy) {
    initElements();
    var r = vp.getBoundingClientRect();
    var x = (cx - r.left - st.tx) / st.s / st.w;
    var y = (cy - r.top - st.ty) / st.s / st.h;
    return { x: x, y: y, inside: x >= 0 && x <= 1 && y >= 0 && y <= 1 };
  }

  // Pointer events
  var pts = {}, gesture = null;
  function ptList() {
    return Object.keys(pts).map(function (k) { return pts[k]; });
  }

  function bindEvents() {
    initElements();
    if (!vp) return;

    vp.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.pin')) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      vp.setPointerCapture(e.pointerId);
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      var l = ptList();
      gesture = { moved: 0, multi: l.length > 1 || (gesture && gesture.multi) };
      if (l.length === 2) {
        gesture.dist = Math.hypot(l[0].x - l[1].x, l[0].y - l[1].y);
        gesture.mid = { x: (l[0].x + l[1].x) / 2, y: (l[0].y + l[1].y) / 2 };
      }
    });

    vp.addEventListener('pointermove', function (e) {
      if (!pts[e.pointerId]) return;
      var prev = pts[e.pointerId];
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      var l = ptList();
      if (l.length === 1) {
        var dx = e.clientX - prev.x, dy = e.clientY - prev.y;
        gesture.moved += Math.abs(dx) + Math.abs(dy);
        if (gesture.moved > 4) vp.classList.add('dragging');
        st.tx += dx;
        st.ty += dy;
        clampPan();
        apply();
      } else if (l.length >= 2) {
        var r = vp.getBoundingClientRect(), d = Math.hypot(l[0].x - l[1].x, l[0].y - l[1].y);
        var mid = { x: (l[0].x + l[1].x) / 2, y: (l[0].y + l[1].y) / 2 };
        if (gesture.dist) {
          st.tx += mid.x - gesture.mid.x;
          st.ty += mid.y - gesture.mid.y;
          zoomAt(d / gesture.dist, mid.x - r.left, mid.y - r.top);
          clampPan();
          apply();
        }
        gesture.dist = d;
        gesture.mid = mid;
        gesture.moved += 10;
        gesture.multi = true;
      }
    });

    function endPointer(e) {
      if (!pts[e.pointerId]) return;
      delete pts[e.pointerId];
      var left = ptList().length;
      if (left === 1) {
        var l = ptList();
        gesture.dist = null;
        gesture.mid = { x: l[0].x, y: l[0].y };
        return;
      }
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

    vp.addEventListener('dblclick', function (e) {
      if (e.target.closest('.pin') || mode) return;
      var r = vp.getBoundingClientRect();
      zoomAt(1.8, e.clientX - r.left, e.clientY - r.top);
    });

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

    pinsEl.addEventListener('click', function (e) {
      var b = e.target.closest('.pin');
      if (!b || mode) return;
      var id = b.getAttribute('data-id');
      selected = id;
      renderPins();
      showInfo(id);
    });

    pinsEl.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.pin')) e.stopPropagation();
    });

    var pClose = $('panelClose');
    if (pClose) pClose.addEventListener('click', function () { closePanel(); vp.focus(); });

    var exList = $('exList');
    if (exList) {
      exList.addEventListener('click', function () {
        if (panelView === 'list') closePanel();
        else { draft = null; showList(); }
      });
    }

    var exAdd = $('exAdd');
    if (exAdd) {
      exAdd.addEventListener('click', function () {
        if (mode === 'add') { setMode(null); linkPreset = null; return; }
        if (draft) { draft = null; renderPins(); }
        if (panelView === 'form' || panelView === 'info') closePanel();
        setMode('add');
        vp.focus();
      });
    }

    var zIn = $('zIn'), zOut = $('zOut'), zFit = $('zFit'), exClose = $('exClose');
    if (zIn) zIn.addEventListener('click', function () { zoomCenter(1.4); });
    if (zOut) zOut.addEventListener('click', function () { zoomCenter(1 / 1.4); });
    if (zFit) zFit.addEventListener('click', fitView);
    if (exClose) exClose.addEventListener('click', leave);
  }

  var linkPreset = null;
  function onTap(cx, cy) {
    if (!mode) return;
    var p = toImage(cx, cy);
    if (!p.inside) { toast('Clique dentro da imagem do mapa.', true); return; }
    p.x = Math.round(p.x * 1e6) / 1e6;
    p.y = Math.round(p.y * 1e6) / 1e6;
    if (mode === 'add') {
      var loc = linkPreset && locById(linkPreset);
      draft = {
        title: loc ? loc.name : '',
        description: '',
        category: CATEGORIES[0].id,
        locationId: linkPreset || null,
        visible: true,
        x: p.x,
        y: p.y
      };
      setMode(null);
      linkPreset = null;
      renderPins();
      showForm(draft);
    } else if (mode.move) {
      var m = findMarker(mode.move);
      setMode(null);
      if (!m) return;
      m.x = p.x;
      m.y = p.y;
      W.store.patch('maps/' + st.map.id + '/markers', m.id, { x: p.x, y: p.y, updatedAt: Date.now() }).then(function () {
        toast('Posição atualizada.');
      }, function (er) { toast(errorText(er), true); });
      renderPins();
      showInfo(m.id);
    }
  }

  function setMode(m) {
    initElements();
    mode = m;
    var isAdd = mode === 'add', isMove = mode && mode.move;
    var ea = $('exAdd');
    if (ea) {
      ea.setAttribute('aria-pressed', String(isAdd));
      ea.classList.toggle('on', isAdd);
    }
    vp.classList.toggle('picking', !!mode);
    hint.hidden = !mode;
    if (isAdd) hint.textContent = 'Clique no mapa onde quer colocar o marcador.';
    else if (isMove) hint.textContent = 'Clique na nova posição do marcador.';
  }

  function findMarker(id) {
    return markers.find(function (x) { return x.id === id; });
  }

  function canWrite() {
    return isMestre();
  }

  function visibleMarkers() {
    var mest = isMestre();
    return markers.filter(function (m) {
      if (!mest && isSecret(m)) return false;
      return true;
    });
  }

  function renderPins() {
    initElements();
    if (!pinsEl) return;
    var list = visibleMarkers();
    var all = draft ? list.concat([Object.assign({ id: '__draft' }, draft)]) : list;
    pinsEl.innerHTML = all.map(function (m) {
      var c = cat(m.category), isDraft = m.id === '__draft', isSel = m.id === selected;
      var sec = isSecret(m);
      return '<button type="button" class="pin' + (isSel ? ' current' : '') + (isDraft ? ' draft' : '') + (sec ? ' secret' : '') + '"' +
        ' data-id="' + esc(m.id) + '" style="left:' + (m.x * 100) + '%;top:' + (m.y * 100) + '%;--c:' + c.color + '"' +
        ' title="' + esc(m.title) + (sec ? ' (Só o Mestre)' : '') + '"' + (isDraft ? ' tabindex="-1"' : '') + '>' +
        '<span class="pin-head">' + svg(c.icon, 13, 2.4) + '</span>' +
        '<span class="pin-label">' + esc(m.title) + '</span>' +
        '</button>';
    }).join('');
    var ec = $('exCount');
    if (ec) ec.textContent = String(list.length);
  }

  function openPanel(title, html, view) {
    initElements();
    panelView = view;
    pTitle.textContent = title;
    pBody.innerHTML = html;
    panel.hidden = false;
    var el = $('exList');
    if (el) {
      el.setAttribute('aria-pressed', String(view === 'list'));
      el.classList.toggle('on', view === 'list');
    }
  }

  function closePanel() {
    initElements();
    panel.hidden = true;
    panelView = null;
    draft = null;
    selected = null;
    renderPins();
    var el = $('exList');
    if (el) {
      el.setAttribute('aria-pressed', 'false');
      el.classList.remove('on');
    }
  }

  function showInfo(id) {
    var m = findMarker(id);
    if (!m) return closePanel();
    var c = cat(m.category), can = canWrite(), l = m.locationId && locById(m.locationId);
    var html = '<span class="cat-chip"><i style="background:' + c.color + '">' + svg(c.icon, 11, 2.4) + '</i>' + esc(c.label) + '</span>';
    if (l) {
      var chars = charLocations(l.id);
      html += '<div class="loc-mini"><span class="badge">' + svg(ICON.pin, 12, 2.4) + 'Local</span>' +
        (l.image ? '<div id="locMiniImg"></div>' : '') +
        '<b style="font-size:15px">' + esc(l.name) + '</b>' +
        (l.description ? '<p>' + esc(clip(l.description, 220)) + '</p>' : '') +
        (chars.length ? '<div class="people">' + chars.map(personChip).join('') + '</div>' : '') +
        '<div><a class="btn primary" href="#loc~' + encodeURIComponent(l.id) + '">' + svg(ICON.arrow, 15) + 'Ver localização</a></div></div>';
    }
    html += (m.description ? '<p class="desc">' + esc(m.description) + '</p>' : (l ? '' : '<p class="desc none">Sem descrição.</p>')) +
      '<div class="coords">Posição na imagem: ' + Math.round(m.x * st.w) + ', ' + Math.round(m.y * st.h) + ' px</div>' +
      '<div class="btn-row"><button class="btn" type="button" data-a="center">' + svg(ICON.target, 15) + 'Centralizar</button>' +
      (can ? '<button class="btn" type="button" data-a="edit">' + svg(ICON.edit, 15) + 'Editar</button><button class="btn" type="button" data-a="move">' + svg(ICON.move, 15) + 'Mover</button><button class="btn danger" type="button" data-a="delete">' + svg(ICON.trash, 15) + 'Excluir</button>' : '') +
      '</div><div id="delConfirm"></div>';

    openPanel(m.title, html, 'info');
    fillImages(pBody);
    if (l && l.image && W.store) {
      W.store.imageUrl(l.image.ref).then(function (u) {
        var b = $('locMiniImg');
        if (b && u) b.innerHTML = '<img src="' + esc(u) + '" alt="">';
      });
    }

    var btnCenter = pBody.querySelector('[data-a=center]');
    if (btnCenter) btnCenter.onclick = function () { centerOn(m.x, m.y, st.fit * 2); };

    var ed = pBody.querySelector('[data-a=edit]');
    if (ed) ed.onclick = function () { showForm(Object.assign({}, m)); };

    var mv = pBody.querySelector('[data-a=move]');
    if (mv) mv.onclick = function () {
      setMode({ move: m.id });
      if (window.innerWidth <= 760) panel.hidden = true;
    };

    var dl = pBody.querySelector('[data-a=delete]');
    if (dl) dl.onclick = function () {
      var dc = $('delConfirm');
      if (!dc) return;
      dc.innerHTML = '<div class="confirm" role="alert"><span>Excluir o marcador <b>' + esc(m.title) + '</b>?' + (l ? ' O local continua cadastrado.' : '') + '</span><div class="btn-row"><button class="btn danger solid" type="button" id="delYes">Excluir</button><button class="btn ghost" type="button" id="delNo">Cancelar</button></div></div>';
      var no = $('delNo'), yes = $('delYes');
      if (no) no.onclick = function () { dc.innerHTML = ''; };
      if (yes) yes.onclick = function () {
        yes.disabled = true;
        W.store.remove('maps/' + st.map.id + '/markers', m.id).then(function () {
          toast('Marcador excluído.');
        }, function (er) { toast(errorText(er), true); });
        markers = markers.filter(function (x) { return x.id !== m.id; });
        closePanel();
      };
    };
  }

  function locOptions(selectedId) {
    var here = mapLocations(st.map.id), others = (W.locations || []).filter(function (x) { return x.mapId !== st.map.id; }).sort(byName);
    function opt(x) { return '<option value="' + esc(x.id) + '"' + (x.id === selectedId ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }
    return '<option value="">Nenhum</option>' + (here.length ? '<optgroup label="Neste mapa">' + here.map(opt).join('') + '</optgroup>' : '') + (others.length ? '<optgroup label="Outros locais">' + others.map(opt).join('') + '</optgroup>' : '');
  }

  function showForm(m) {
    var isNew = !m.id, autoTitle = m.locationId && locById(m.locationId) ? locById(m.locationId).name : null;
    var cats = CATEGORIES.map(function (c) {
      return '<label class="cat-opt"><input type="radio" name="mkCat" value="' + c.id + '"' + (cat(m.category).id === c.id ? ' checked' : '') + '><i style="background:' + c.color + '">' + svg(c.icon, 11, 2.4) + '</i><span>' + esc(c.label) + '</span></label>';
    }).join('');

    var html = '<form id="mkForm" class="panel-body" style="padding:0" novalidate>' +
      (W.locations.length ? '<div class="field"><label for="mkLoc">Local vinculado</label><select id="mkLoc">' + locOptions(m.locationId) + '</select><span class="hint-text">Ao clicar no marcador, aparecem as informações do local.</span></div>' : '') +
      '<div class="field" id="fMkTitle"><label for="mkTitle">Nome</label><input type="text" id="mkTitle" maxlength="80" autocomplete="off" value="' + esc(m.title) + '" placeholder="Ex.: Portão norte"><div class="err" id="mkTitleErr"></div></div>' +
      '<div class="field"><label for="mkDesc">Descrição</label><textarea id="mkDesc" maxlength="4000" placeholder="Anotação sobre este ponto">' + esc(m.description || '') + '</textarea></div>' +
      '<fieldset class="field" style="border:0;padding:0;margin:0"><legend class="lab" style="margin-bottom:6px">Categoria</legend><div class="cat-grid">' + cats + '</div></fieldset>' +
      flagHtml('mkVis', isNew ? null : m) +
      '<div class="btn-row"><button class="btn primary" type="submit">' + (isNew ? 'Salvar marcador' : 'Salvar alterações') + '</button><button class="btn ghost" type="button" id="mkCancel">Cancelar</button></div></form>';

    openPanel(isNew ? 'Novo marcador' : 'Editar marcador', html, 'form');
    var f = $('mkForm'), t = $('mkTitle'), ls = $('mkLoc');
    setTimeout(function () { if (t) t.focus(); }, 30);
    if (ls) ls.addEventListener('change', function () {
      var lk = locById(ls.value);
      if (lk && (!t.value.trim() || t.value === autoTitle)) { t.value = lk.name; autoTitle = lk.name; }
      if (draft) { draft.locationId = ls.value || null; draft.title = t.value; renderPins(); }
    });
    f.querySelectorAll('input[name=mkCat]').forEach(function (r) {
      r.addEventListener('change', function () { if (draft) { draft.category = r.value; renderPins(); } });
    });
    t.addEventListener('input', function () {
      if (t.value.trim()) { $('fMkTitle').classList.remove('invalid'); $('mkTitleErr').textContent = ''; }
      if (draft) draft.title = t.value;
    });
    $('mkCancel').onclick = function () { if (isNew) closePanel(); else showInfo(m.id); };
    f.onsubmit = function (e) {
      e.preventDefault();
      var title = t.value.trim();
      if (!title) { $('fMkTitle').classList.add('invalid'); $('mkTitleErr').textContent = 'Dê um nome ao marcador.'; t.focus(); return; }
      var chosen = f.querySelector('input[name=mkCat]:checked');
      var body = Object.assign({}, m, {
        title: title,
        description: $('mkDesc').value.trim(),
        category: chosen ? chosen.value : CATEGORIES[0].id,
        locationId: ls ? (ls.value || null) : (m.locationId || null),
        visible: flagVal('mkVis', isNew ? null : m),
        updatedAt: Date.now()
      });
      if (isNew) body.createdAt = Date.now();
      var btn = f.querySelector('[type=submit]');
      btn.disabled = true;

      var col = 'maps/' + st.map.id + '/markers';
      var saveP = isNew ? W.store.put(col, null, body) : W.store.patch(col, m.id, body).then(function () { return m.id; });

      saveP.then(function (id) {
        body.id = id;
        markers = findMarker(id) ? markers.map(function (x) { return x.id === id ? body : x; }) : markers.concat([body]);
        draft = null;
        selected = id;
        renderPins();
        showInfo(id);
        toast(isNew ? 'Marcador criado.' : 'Marcador salvo.');
      }, function (er) { btn.disabled = false; toast(errorText(er), true); });
    };
  }

  function showList() {
    var can = canWrite();
    var list = visibleMarkers().filter(function (m) {
      if (query && norm(m.title).indexOf(norm(query)) < 0) return false;
      return true;
    });

    var html = '<div class="toolbar" style="padding:0 0 10px"><input class="search" id="mkSearch" type="search" placeholder="Buscar marcadores…" autocomplete="off" value="' + esc(query) + '"></div>' +
      (list.length ? '<ul class="mk-list">' + list.map(function (m) {
        var c = cat(m.category), l = m.locationId && locById(m.locationId);
        return '<li><button type="button" class="mk-item" data-go="' + esc(m.id) + '">' +
          '<span class="dot" style="background:' + c.color + '">' + svg(c.icon, 14) + '</span>' +
          '<span class="t"><b>' + esc(m.title) + (isSecret(m) ? ' ' + secretTag() : '') + '</b><span>' + esc(l ? 'Local: ' + l.name : c.label) + '</span></span>' +
          '</button></li>';
      }).join('') + '</ul>' : '<p class="desc none">Nenhum marcador encontrado.</p>');

    openPanel('Marcadores (' + list.length + ')', html, 'list');
    var s = $('mkSearch');
    if (s) s.addEventListener('input', function () { query = s.value; showList(); });
    pBody.querySelectorAll('[data-go]').forEach(function (b) {
      b.onclick = function () {
        var m = findMarker(b.getAttribute('data-go'));
        if (!m) return;
        selected = m.id;
        renderPins();
        centerOn(m.x, m.y, st.fit * 2);
        showInfo(m.id);
      };
    });
  }

  function leave() {
    if (window.go) window.go(st.map ? '#map~' + st.map.id : '#maps');
  }

  function runPending() {
    var p = api.pending;
    if (!p || !st.ready) return;
    if (p.linkLocationId) {
      api.pending = null;
      if (!canWrite()) return;
      linkPreset = p.linkLocationId;
      setMode('add');
      return;
    }
    var m = p.markerId ? findMarker(p.markerId) : markers.find(function (x) { return x.locationId === p.locationId; });
    if (!m) return;
    api.pending = null;
    selected = m.id;
    renderPins();
    centerOn(m.x, m.y, st.fit * 2);
    showInfo(m.id);
  }

  api.open = function (map) {
    bindEvents();
    var same = st.map && st.map.id === map.id && !ex.hidden;
    st.map = map;
    var et = $('exTitle'), ea = $('exAdd');
    if (et) et.textContent = map.name;
    if (ea) ea.hidden = !canWrite();
    if (same) return;

    ex.hidden = false;
    setMode(null);
    draft = null;
    selected = null;
    panel.hidden = true;
    panelView = null;
    query = '';
    linkPreset = null;
    markers = [];

    // Busca marcadores
    if (W.store) {
      W.store.all('maps/' + map.id + '/markers').then(function (mks) {
        markers = mks || [];
        renderPins();
        runPending();
      }).catch(function () {});
    }

    st.w = (map.image && map.image.w) || 1000;
    st.h = (map.image && map.image.h) || 1000;
    stage.style.width = st.w + 'px';
    stage.style.height = st.h + 'px';
    st.ready = false;
    img.removeAttribute('src');
    fitView();
    renderPins();

    W.store.imageUrl(map.image && map.image.ref).then(function (u) {
      img.onload = function () {
        if (img.naturalWidth && (img.naturalWidth !== st.w || img.naturalHeight !== st.h)) {
          st.w = img.naturalWidth;
          st.h = img.naturalHeight;
          stage.style.width = st.w + 'px';
          stage.style.height = st.h + 'px';
        }
        st.ready = true;
        fitView();
        runPending();
      };
      img.src = u;
    });

    if (ex.requestFullscreen && window.innerWidth > 760) {
      try { var pr = ex.requestFullscreen(); if (pr && pr.catch) pr.catch(function () {}); } catch (e) {}
    }
  };

  api.close = function () {
    if (ex.hidden) return;
    ex.hidden = true;
    setMode(null);
    panel.hidden = true;
    panelView = null;
    draft = null;
    selected = null;
    linkPreset = null;
    if (document.fullscreenElement && document.exitFullscreen) {
      try { var p = document.exitFullscreen(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
    }
  };

  api.setMarkers = function (list) {
    markers = (list || []).slice();
    if (selected && !findMarker(selected)) {
      selected = null;
      if (panelView === 'info') closePanel();
    }
    renderPins();
    if (panelView === 'list') showList();
    else if (panelView === 'info' && selected) showInfo(selected);
    runPending();
  };

  api.refresh = function () {
    if (ex.hidden) return;
    renderPins();
    if (panelView === 'info' && selected) showInfo(selected);
  };

  api.isOpen = function () { return !ex.hidden; };

  return api;
})();

window.Explorer = Explorer;
