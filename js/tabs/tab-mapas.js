/* =====================================================================
   Hounds — Aba Mapas: lista, página do mapa e formulário
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   Page: Maps. Without filters, the whole hierarchy; with "Dentro de",
   that map's subtree; with a search or a level, the matching maps.
   ===================================================================== */
function renderMapsPage() {
  var can = canWrite() && W.store && W.store.canUpload, ui = S.ui;
  if (ui.within && !mapById(ui.within)) ui.within = '';
  pageRoot.innerHTML =
    '<div class="head-row"><div>' + crumbsHtml('maps') + '<h1>Maps</h1><p class="lede">Os mapas da campanha, organizados do mais amplo para o mais detalhado. Cada mapa pode ter um mapa pai e vários submapas, em quantos níveis precisar.</p></div>' +
    (W.maps.length || can ? '<div class="btn-row">' + (W.maps.length ? '<button class="btn" type="button" id="mapTreeBtn">' + svg(ICON.tree, 15) + 'Árvore</button>' : '') +
      (can ? '<button class="btn primary" type="button" id="newMapBtn">' + svg(ICON.plus, 16, 2.4) + 'Novo mapa</button>' : '') + '</div>' : '') + '</div>' + notice() +
    (W.maps.length ? '<div class="toolbar"><label for="mapSearch" style="position:absolute;left:-9999px">Buscar mapas</label><input class="search" id="mapSearch" type="search" placeholder="Buscar por nome, mapa pai, local, personagem ou organização" autocomplete="off" value="' + esc(ui.q || '') + '">' +
      '<select id="mapWithin" aria-label="Filtrar por mapa pai">' + mapOptions(ui.within || '', null, 'Dentro de qualquer mapa') + '</select>' +
      '<select id="mapLevel" aria-label="Filtrar por nível"><option value="">Todos os níveis</option><option value="top"' + (ui.level === 'top' ? ' selected' : '') + '>Só mapas de nível superior</option><option value="sub"' + (ui.level === 'sub' ? ' selected' : '') + '>Só submapas</option></select>' +
      '<button class="btn ghost" type="button" id="mapClear"' + (mapFiltered() ? '' : ' hidden') + '>' + svg(ICON.x, 14, 2.4) + 'Limpar filtros</button><span class="meta" id="mapCount"></span></div>' : '') +
    '<div id="mapList"></div>';
  var b = $('newMapBtn'); if (b) b.onclick = function () { openMapForm(null); };
  var t = $('mapTreeBtn'); if (t) t.onclick = function () { openMapTree(null); };
  var s = $('mapSearch'); if (s) s.addEventListener('input', function () { ui.q = s.value; renderMapList(); });
  var w = $('mapWithin'); if (w) w.onchange = function () { ui.within = w.value; renderMapList(); };
  var lv = $('mapLevel'); if (lv) lv.onchange = function () { ui.level = lv.value; renderMapList(); };
  var c = $('mapClear'); if (c) c.onclick = function () { ui.q = ''; ui.within = ''; ui.level = ''; renderMapsPage(); var f = $('mapSearch'); if (f) f.focus(); };
  renderMapList();
}
function mapFiltered() { return !!(norm(S.ui.q) || S.ui.within || S.ui.level); }
function renderMapList() {
  var el = $('mapList'); if (!el) return;
  var ui = S.ui, can = canWrite() && W.store && W.store.canUpload;
  var c = $('mapClear'); if (c) c.hidden = !mapFiltered();
  if (!W.loaded.maps) { el.innerHTML = '<p class="lede">Carregando mapas…</p>'; return; }
  if (!W.maps.length) {
    el.innerHTML = '<div class="empty-state">' + svg(ICON.maps, 34, 1.6) + '<strong>Nenhum mapa cadastrado</strong><span>' + (can ? 'Crie o primeiro com <b>Novo mapa</b>. Depois, ligue mapas menores a ele escolhendo o <b>mapa pai</b>.' : 'Os mapas criados vão aparecer aqui.') + '</span></div>';
    return;
  }
  var q = norm(ui.q), within = ui.within && mapById(ui.within) ? ui.within : '', cnt = $('mapCount');
  if (!q && !ui.level) {
    if (cnt) cnt.textContent = within ? plural(mapDescendants(within).length, 'mapa dentro', 'mapas dentro') : plural(W.maps.length, 'mapa', 'mapas');
    el.innerHTML = within ? '<h2 class="sec-title">Dentro de ' + esc(mapById(within).name) + '</h2><div class="mtree">' + mapRow(mapById(within), true) + fullTree(within) + '</div>'
      : '<h2 class="sec-title">Hierarquia · ' + plural(W.maps.length, 'mapa', 'mapas') + '</h2><div class="mtree">' + fullTree(null).replace(/^<ul>/, '').replace(/<\/ul>$/, '') + '</div>';
    fillImages(el);
    return;
  }
  var pool = within ? mapDescendants(within).map(mapById).filter(Boolean) : W.maps.slice();
  var list = pool.sort(byName).filter(function (m) {
    if (ui.level === 'top' && W.parent[m.id]) return false;
    if (ui.level === 'sub' && !W.parent[m.id]) return false;
    return !q || norm(m.name + ' ' + mapPathText(m.id) + ' ' + mapLocations(m.id).map(function (l) { return l.name; }).join(' ') + ' ' +
      mapCharacters(m.id).map(function (x) { return x.name; }).join(' ') + ' ' + mapOrgs(m.id).map(function (o) { return o.name; }).join(' ')).indexOf(q) >= 0;
  });
  if (cnt) cnt.textContent = list.length + ' de ' + (within ? pool.length : W.maps.length);
  el.innerHTML = list.length ? '<div class="loc-grid">' + list.map(mapCard).join('') + '</div>' : '<p class="lede">Nenhum mapa encontrado para esses filtros.</p>';
  fillImages(el);
}
function mapCard(m) {
  var up = W.parent[m.id], k = childMaps(m.id).length, L = mapLocations(m.id).length;
  var meta = [k ? plural(k, 'submapa', 'submapas') : '', L ? plural(L, 'local', 'locais') : ''].filter(Boolean).join(' · ');
  return '<a class="loc-card" href="' + mapHref(m.id) + '"><div class="thumb"' + (m.image ? ' data-img="' + esc(m.image.ref) + '"' : '') + '>' + svg(ICON.map, 28, 1.6) + '</div><div class="map-card-body"><strong>' + esc(m.name) + '</strong>' +
    '<span class="where">' + (up ? svg(ICON.map, 12) + ' Em ' + esc(mapPathText(up)) : 'Nível superior') + '</span>' + (meta ? '<span class="meta">' + meta + '</span>' : '') + '</div></a>';
}

/* =====================================================================
   Tree: a map and every map inside it, at every depth (null: all maps)
   ===================================================================== */
function openMapTree(m) {
  var n = m ? mapDescendants(m.id).length : W.maps.length;
  showModal('<h2 id="mtTitle">' + (m ? 'Árvore de ' + esc(m.name) : 'Árvore de mapas') + '</h2><p class="lede" style="margin:0">' +
    (m ? plural(n, 'mapa fica', 'mapas ficam') + ' dentro de <b>' + esc(m.name) + '</b>.' : plural(n, 'mapa', 'mapas') + ', ' + plural(childMaps(null).length, 'de nível superior', 'de nível superior') + '.') + '</p>' +
    '<div class="mtree">' + (m ? mapRow(m, true) + fullTree(m.id) : fullTree(null).replace(/^<ul>/, '').replace(/<\/ul>$/, '')) + '</div>');
  modal.setAttribute('aria-labelledby', 'mtTitle');
  fillImages(modal);
  modal.querySelectorAll('.mtree a').forEach(function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); var h = a.getAttribute('href'); closeModal(); go(h); });
  });
}

/* =====================================================================
   Page: single map
   ===================================================================== */
function renderMapPage() {
  var r = S.route, m = mapById(r.mapId), ui = S.ui;
  if (!m) {
    pageRoot.innerHTML = crumbsHtml('maps') + (W.loaded.maps ? '<h1>Mapa não encontrado</h1><p class="lede">Esse mapa foi excluído ou o link está incompleto.</p><div><a class="btn" href="#maps">Voltar para Maps</a></div>' : '<p class="lede">Carregando mapa…</p>');
    return;
  }
  var can = canWrite();
  var mk = S.markersFor === m.id ? S.markers : [];
  var locs = mapLocations(m.id), kids = childMaps(m.id), parent = mapById(W.parent[m.id]);
  var meta = [m.image ? m.image.w + ' × ' + m.image.h + ' px' : '', plural(mk.length, 'marcador', 'marcadores'), plural(locs.length, 'local', 'locais'), plural(kids.length, 'submapa', 'submapas')].filter(Boolean).join(' · ');
  var head = crumbsHtml('map:' + m.id) +
    '<div class="head-row"><div><h1>' + esc(m.name) + '</h1><div class="meta">' + meta + '</div>' +
    '<p class="lede" style="margin-top:6px">' + (parent ? 'Faz parte de <a class="inline" href="' + mapHref(parent.id) + '">' + esc(parent.name) + '</a>.' : 'Mapa de nível superior.') + '</p></div>' +
    '<div class="btn-row">' + (kids.length ? '<button class="btn" type="button" id="mapTreeBtn">' + svg(ICON.tree, 15) + 'Árvore</button>' : '') +
    '<a class="btn primary" href="#map~' + encodeURIComponent(m.id) + '~explorar">' + svg(ICON.explore, 16) + 'Explorar mapa</a></div></div>';
  var hier = '<div class="box"><h2 class="sec-title" style="margin:0">Hierarquia</h2>' + pathTree(mapChain(m.id), { markLast: true, kids: true }) + '</div>';
  var locBox = '<div class="box"><h2 class="sec-title" style="margin:0">Locais neste mapa</h2>' +
    (locs.length ? '<ul class="links">' + locs.map(function (l) { return '<li><a class="row-link" href="' + locHref(l.id) + '">' + thumbSlot(l.image && l.image.ref, ICON.pin) + '<b>' + esc(l.name) + '</b></a></li>'; }).join('') + '</ul>' : '<p class="lede" style="font-size:13px">Nenhum local ligado a este mapa.</p>') +
    (can ? '<div><button class="btn" type="button" id="newLocHere">' + svg(ICON.plus, 15, 2.4) + 'Novo local neste mapa</button></div>' : '') + '</div>';
  var mchars = mapCharacters(m.id);
  var charBox = '<div class="box"><h2 class="sec-title" style="margin:0">Personagens neste mapa</h2>' +
    (mchars.length ? '<div class="people">' + mchars.map(personChip).join('') + '</div>' : '<p class="lede" style="font-size:13px">Nenhum personagem ligado a este mapa.' + (can ? ' Ligue pelo campo <b>Mapas relacionados</b> do personagem.' : '') + '</p>') + '</div>';
  var morgs = mapOrgs(m.id);
  var orgBox = '<div class="box"><h2 class="sec-title" style="margin:0">Organizações neste mapa</h2>' +
    (morgs.length ? '<ul class="links">' + morgs.map(function (o) { return '<li><a class="row-link" href="' + orgHref(o.id) + '">' + thumbSlot(o.image && o.image.ref, ICON.org) + '<b>' + esc(o.name) + '</b></a></li>'; }).join('') + '</ul>' : '<p class="lede" style="font-size:13px">Nenhuma organização ligada a este mapa.' + (can ? ' Ligue pelo campo <b>Mapas</b> da organização.' : '') + '</p>') + '</div>';
  var mkBox = '<div class="box"><h2 class="sec-title" style="margin:0">Marcadores</h2>' +
    (mk.length ? '<ul class="mk-list">' + mk.map(function (x) {
      var c = cat(x.category), l = x.locationId && locById(x.locationId);
      return '<li><a class="mk-item" href="#map~' + encodeURIComponent(m.id) + '~explorar" data-focus="' + esc(x.id) + '"><span class="dot" style="background:' + c.color + '">' + svg(c.icon, 14) + '</span><span class="t"><b>' + esc(x.title) + '</b><span>' + esc(l ? 'Local: ' + l.name : c.label) + '</span></span></a></li>';
    }).join('') + '</ul>' : '<p class="lede" style="font-size:13px">Nenhum marcador ainda.' + (can ? ' Em <b>Explorar mapa</b>, use <b>Adicionar marcador</b> e clique no ponto do mapa.' : '') + '</p>') + '</div>';
  var opts = '';
  if (can) {
    var conseq = [];
    if (kids.length) conseq.push(plural(kids.length, 'submapa passa', 'submapas passam') + ' para ' + (parent ? '<b>' + esc(parent.name) + '</b>' : 'o nível superior'));
    if (locs.length) conseq.push(plural(locs.length, 'local passa', 'locais passam') + ' para ' + (parent ? '<b>' + esc(parent.name) + '</b>' : 'sem mapa'));
    if (mapCharacters(m.id).length) conseq.push(plural(mapCharacters(m.id).length, 'personagem passa', 'personagens passam') + ' para ' + (parent ? '<b>' + esc(parent.name) + '</b>' : 'sem este mapa'));
    if (morgs.length) conseq.push(plural(morgs.length, 'organização passa', 'organizações passam') + ' para ' + (parent ? '<b>' + esc(parent.name) + '</b>' : 'sem este mapa'));
    if (mk.length) conseq.push(plural(mk.length, 'marcador é excluído', 'marcadores são excluídos'));
    opts = '<div class="box"><h2 class="sec-title" style="margin:0">Opções do mapa</h2><div class="btn-row">' +
      '<button class="btn" type="button" id="editMapBtn">' + svg(ICON.edit, 15) + 'Editar mapa</button>' +
      '<button class="btn danger" type="button" id="deleteMapBtn">' + svg(ICON.trash, 15) + 'Excluir mapa</button></div>' +
      (ui.confirmDelete ? '<div class="confirm" role="alert"><span>Excluir <b>' + esc(m.name) + '</b>?' + (conseq.length ? ' ' + conseq.join('; ') + '.' : '') + ' Não dá para desfazer.</span><div class="btn-row"><button class="btn danger solid" type="button" id="deleteMapYes">Excluir mapa</button><button class="btn ghost" type="button" id="deleteMapNo">Cancelar</button></div></div>' : '') + '</div>';
  }
  pageRoot.innerHTML = head + '<div class="map-layout"><div class="preview" id="mapPreview">' + svg(ICON.map, 32, 1.6) + '</div><div class="side">' + hier + locBox + charBox + orgBox + mkBox + opts + '</div></div>';
  W.store.imageUrl(m.image && m.image.ref).then(function (u) { var p = $('mapPreview'); if (p && u) p.innerHTML = '<img src="' + esc(u) + '" alt="Mapa ' + esc(m.name) + '">'; });
  fillImages(pageRoot);
  var tb = $('mapTreeBtn'); if (tb) tb.onclick = function () { openMapTree(m); };
  var e1 = $('editMapBtn'); if (e1) e1.onclick = function () { openMapForm(m); };
  var nl = $('newLocHere'); if (nl) nl.onclick = function () { openLocationForm(null, m.id); };
  var db = $('deleteMapBtn'); if (db) db.onclick = function () { ui.confirmDelete = true; renderMapPage(); };
  var dn = $('deleteMapNo'); if (dn) dn.onclick = function () { ui.confirmDelete = false; renderMapPage(); };
  var dy = $('deleteMapYes'); if (dy) dy.onclick = function () {
    dy.disabled = true;
    var target = W.parent[m.id] ? mapHref(W.parent[m.id]) : '#maps';
    Ops.deleteMap(m).then(function () { toast('Mapa excluído.'); go(target, true); }, function (er) { dy.disabled = false; toast(errorText(er), true); });
  };
  pageRoot.querySelectorAll('[data-focus]').forEach(function (a) { a.addEventListener('click', function () { Explorer.pending = { markerId: a.getAttribute('data-focus') }; }); });
}



/* =====================================================================
   Form: map (create / edit, with parent map)
   ===================================================================== */
function openMapForm(m) {
  var editing = !!m;
  var exclude = editing ? validParents(m.id) : null;
  var parentNow = editing ? (W.parent[m.id] || '') : (S.route && S.route.page === 'map' ? S.route.mapId : '');
  var html = '<form id="mapForm" novalidate><h2 id="mfTitle">' + (editing ? 'Editar mapa' : 'Novo mapa') + '</h2>' +
    '<div class="field" id="f_mname"><label for="mname">Nome do mapa</label><input type="text" id="mname" maxlength="80" autocomplete="off" placeholder="Ex.: Reino de Ludgrim" value="' + esc(editing ? m.name : '') + '"><div class="err" id="err_mname"></div></div>' +
    '<div class="field"><label for="mparent">Mapa pai</label><select id="mparent">' + mapOptions(parentNow, exclude, 'Nenhum (mapa de nível superior)') + '</select>' +
    '<span class="hint-text">O mapa mais amplo onde este fica. Ex.: uma cidade dentro de uma região.' + (editing && exclude && Object.keys(exclude).length > 1 ? ' Submapas deste mapa não aparecem na lista, para não criar ciclos.' : '') + '</span></div>' +
    (!editing || W.store.canUpload ? imageFieldHtml('mimg', 'Imagem do mapa', editing ? 'Opcional: escolha outra imagem só para trocar a atual. Trocar a imagem exclui os marcadores do mapa. PNG, JPG, WebP ou GIF, até 20 MB.' : 'PNG, JPG, WebP ou GIF, até 20 MB. A imagem é guardada no tamanho original.') : '') +
    flagHtml('mvis', m, true) +
    '<div id="mfSwap"></div>' +
    '<div class="form-err" id="mfErr" role="alert"></div>' +
    '<div class="btn-row" style="justify-content:flex-end"><button class="btn ghost" type="button" id="mfCancel">Cancelar</button><button class="btn primary" type="submit" id="mfSave">' + (editing ? 'Salvar mapa' : 'Criar mapa') + '</button></div></form>';
  var img;
  // Swapping the image of a map with markers deletes them: true once the person confirmed it.
  var confirmed = false;
  showModal(html, function () { if (img) img.dispose(); });
  modal.setAttribute('aria-labelledby', 'mfTitle');
  var name = $('mname');
  if (!editing) img = imageField('mimg', { onPick: function (f) { if (!name.value.trim()) name.value = f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim().slice(0, 80); } });
  else if (W.store.canUpload) img = imageField('mimg', {
    existing: m.image && m.image.ref ? W.store.imageUrl(m.image.ref).then(function (u) { return { url: u, name: 'Imagem atual', dims: m.image.w ? m.image.w + ' × ' + m.image.h + ' px' : '' }; }) : null,
    onPick: function () { confirmed = false; $('mfSwap').innerHTML = ''; }
  });
  name.addEventListener('input', function () { if (name.value.trim()) { $('err_mname').textContent = ''; $('f_mname').classList.remove('invalid'); } });
  $('mfCancel').onclick = function () { closeModal(); };
  var btn = $('mfSave');
  function idle() { if (!modalOpen) return; modalOpen.busy = false; btn.disabled = false; btn.textContent = editing ? 'Salvar mapa' : 'Criar mapa'; $('mfCancel').disabled = false; }
  // Asks before deleting the markers. Cancel keeps the current image and every marker; the form stays open.
  function askSwap(count) {
    $('mfSwap').innerHTML = '<div class="confirm" role="alert"><span>Este mapa tem <b>' + plural(count, 'marcador', 'marcadores') + '</b>. Se a imagem for trocada, <b>todos os marcadores existentes no mapa serão excluídos</b>, porque as posições deles valem só para a imagem atual. Não dá para desfazer.</span>' +
      '<div class="btn-row"><button class="btn danger solid" type="button" id="mfSwapYes">Trocar imagem e excluir marcadores</button><button class="btn ghost" type="button" id="mfSwapNo">Cancelar troca</button></div></div>';
    $('mfSwapYes').onclick = function () { confirmed = true; $('mfSwap').innerHTML = ''; submit(); };
    $('mfSwapNo').onclick = function () { confirmed = false; $('mfSwap').innerHTML = ''; img.reset(); toast('Troca cancelada. A imagem e os marcadores continuam como estavam.'); btn.focus(); };
    $('mfSwapYes').focus();
  }
  function submit() {
    if (modalOpen.busy) return;
    var n = name.value.trim(), parent = $('mparent').value || null, ok = true, swap = editing && !!(img && img.file);
    if (!n) { $('err_mname').textContent = 'Informe o nome do mapa.'; $('f_mname').classList.add('invalid'); ok = false; }
    if (!editing && !img.file) { if (!$('err_mimg').textContent) img.err('Selecione a imagem do mapa.'); else img.err($('err_mimg').textContent); ok = false; }
    if (editing && img && !img.file && $('err_mimg').textContent) ok = false;
    if (editing && parent && validParents(m.id)[parent]) { $('mfErr').textContent = errorText({ code: 'cycle' }); ok = false; }
    if (!ok) { (n ? (img ? img.drop : $('mparent')) : name).focus(); return; }
    modalOpen.busy = true;
    btn.disabled = true; $('mfCancel').disabled = true; $('mfErr').textContent = '';
    // Before saving anything, find out whether the new image would delete markers.
    if (swap && !confirmed) {
      btn.textContent = 'Verificando marcadores…';
      W.store.all('maps/' + m.id + '/markers').then(function (l) {
        if (!modalOpen) return;
        idle();
        if (l.length) askSwap(l.length); else { confirmed = true; submit(); }
      }, function (er) { idle(); if (modalOpen) $('mfErr').textContent = errorText(er); });
      return;
    }
    btn.textContent = swap || !editing ? 'Enviando imagem…' : 'Salvando…';
    var vis = flagVal('mvis', m), share = shareVal('mvis', m), dropped = 0;
    var p = editing ? Ops.updateMap(m.id, n, parent, vis, share)
      .then(function () { return swap ? Ops.replaceMapImage(m.id, img.file, img.dims, confirmed) : 0; })
      .then(function (k) { dropped = k || 0; return m.id; }) : Ops.createMap(n, parent, img.file, img.dims, vis, share);
    p.then(function (id) {
      closeModal(true);
      toast(!editing ? 'Mapa criado.' : !swap ? 'Mapa salvo.' : dropped ? 'Mapa salvo com a nova imagem. ' + plural(dropped, 'marcador excluído', 'marcadores excluídos') + '.' : 'Mapa salvo com a nova imagem.');
      if (!editing) go(mapHref(id));
    }, function (er) {
      if (!modalOpen) return;
      idle();
      // Someone added markers after the check: ask again with the real count.
      if (er && er.code === 'markers_exist') { confirmed = false; askSwap(er.count); return; }
      $('mfErr').textContent = errorText(er);
    });
  }
  $('mapForm').onsubmit = function (e) { e.preventDefault(); submit(); };
}
