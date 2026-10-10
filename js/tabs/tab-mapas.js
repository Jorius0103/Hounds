/* =====================================================================
   Hounds — Aba Mapas: lista, página do mapa e formulário
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   Page: Maps
   ===================================================================== */
function renderMapsPage() {
  var can = canWrite() && W.store && W.store.canUpload;
  var body;
  if (!W.loaded.maps) body = '<p class="lede">Carregando mapas…</p>';
  else if (!W.maps.length) body = '<div class="empty-state">' + svg(ICON.maps, 34, 1.6) + '<strong>Nenhum mapa cadastrado</strong><span>' + (can ? 'Crie o primeiro com <b>Novo mapa</b>. Depois, ligue mapas menores a ele escolhendo o <b>mapa pai</b>.' : 'Os mapas criados vão aparecer aqui.') + '</span></div>';
  else body = '<h2 class="sec-title">Hierarquia · ' + plural(W.maps.length, 'mapa', 'mapas') + '</h2><div class="mtree">' + fullTree(null).replace(/^<ul>/, '').replace(/<\/ul>$/, '') + '</div>';
  pageRoot.innerHTML =
    '<div class="head-row"><div>' + crumbsHtml('maps') + '<h1>Maps</h1><p class="lede">Os mapas da campanha, organizados do mais amplo para o mais detalhado. Cada mapa pode ter um mapa pai e vários submapas.</p></div>' +
    (can ? '<button class="btn primary" type="button" id="newMapBtn">' + svg(ICON.plus, 16, 2.4) + 'Novo mapa</button>' : '') + '</div>' + notice() + body;
  fillImages(pageRoot);
  var b = $('newMapBtn'); if (b) b.onclick = function () { openMapForm(null); };
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
    '<a class="btn primary" href="#map~' + encodeURIComponent(m.id) + '~explorar">' + svg(ICON.explore, 16) + 'Explorar mapa</a></div>';
  var hier = '<div class="box"><h2 class="sec-title" style="margin:0">Hierarquia</h2>' + pathTree(mapChain(m.id), { markLast: true, kids: true }) + '</div>';
  var locBox = '<div class="box"><h2 class="sec-title" style="margin:0">Locais neste mapa</h2>' +
    (locs.length ? '<ul class="links">' + locs.map(function (l) { return '<li><a class="row-link" href="' + locHref(l.id) + '">' + thumbSlot(l.image && l.image.ref, ICON.pin) + '<b>' + esc(l.name) + '</b></a></li>'; }).join('') + '</ul>' : '<p class="lede" style="font-size:13px">Nenhum local ligado a este mapa.</p>') +
    (can ? '<div><button class="btn" type="button" id="newLocHere">' + svg(ICON.plus, 15, 2.4) + 'Novo local neste mapa</button></div>' : '') + '</div>';
  var mchars = mapCharacters(m.id);
  var charBox = '<div class="box"><h2 class="sec-title" style="margin:0">Personagens neste mapa</h2>' +
    (mchars.length ? '<div class="people">' + mchars.map(personChip).join('') + '</div>' : '<p class="lede" style="font-size:13px">Nenhum personagem ligado a este mapa.' + (can ? ' Ligue pelo campo <b>Mapas relacionados</b> do personagem.' : '') + '</p>') + '</div>';
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
    if (mk.length) conseq.push(plural(mk.length, 'marcador é excluído', 'marcadores são excluídos'));
    opts = '<div class="box"><h2 class="sec-title" style="margin:0">Opções do mapa</h2><div class="btn-row">' +
      '<button class="btn" type="button" id="editMapBtn">' + svg(ICON.edit, 15) + 'Editar mapa</button>' +
      '<button class="btn danger" type="button" id="deleteMapBtn">' + svg(ICON.trash, 15) + 'Excluir mapa</button></div>' +
      (ui.confirmDelete ? '<div class="confirm" role="alert"><span>Excluir <b>' + esc(m.name) + '</b>?' + (conseq.length ? ' ' + conseq.join('; ') + '.' : '') + ' Não dá para desfazer.</span><div class="btn-row"><button class="btn danger solid" type="button" id="deleteMapYes">Excluir mapa</button><button class="btn ghost" type="button" id="deleteMapNo">Cancelar</button></div></div>' : '') + '</div>';
  }
  pageRoot.innerHTML = head + '<div class="map-layout"><div class="preview" id="mapPreview">' + svg(ICON.map, 32, 1.6) + '</div><div class="side">' + hier + locBox + charBox + mkBox + opts + '</div></div>';
  W.store.imageUrl(m.image && m.image.ref).then(function (u) { var p = $('mapPreview'); if (p && u) p.innerHTML = '<img src="' + esc(u) + '" alt="Mapa ' + esc(m.name) + '">'; });
  fillImages(pageRoot);
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
    (editing ? '' : imageFieldHtml('mimg', 'Imagem do mapa', 'PNG, JPG, WebP ou GIF, até 20 MB. A imagem é guardada no tamanho original.')) +
    flagHtml('mvis', m, true) +
    '<div class="form-err" id="mfErr" role="alert"></div>' +
    '<div class="btn-row" style="justify-content:flex-end"><button class="btn ghost" type="button" id="mfCancel">Cancelar</button><button class="btn primary" type="submit" id="mfSave">' + (editing ? 'Salvar mapa' : 'Criar mapa') + '</button></div></form>';
  var img;
  showModal(html, function () { if (img) img.dispose(); });
  modal.setAttribute('aria-labelledby', 'mfTitle');
  var name = $('mname');
  if (!editing) img = imageField('mimg', { onPick: function (f) { if (!name.value.trim()) name.value = f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim().slice(0, 80); } });
  name.addEventListener('input', function () { if (name.value.trim()) { $('err_mname').textContent = ''; $('f_mname').classList.remove('invalid'); } });
  $('mfCancel').onclick = function () { closeModal(); };
  $('mapForm').onsubmit = function (e) {
    e.preventDefault();
    if (modalOpen.busy) return;
    var n = name.value.trim(), parent = $('mparent').value || null, ok = true;
    if (!n) { $('err_mname').textContent = 'Informe o nome do mapa.'; $('f_mname').classList.add('invalid'); ok = false; }
    if (!editing && !img.file) { if (!$('err_mimg').textContent) img.err('Selecione a imagem do mapa.'); else img.err($('err_mimg').textContent); ok = false; }
    if (editing && parent && validParents(m.id)[parent]) { $('mfErr').textContent = errorText({ code: 'cycle' }); ok = false; }
    if (!ok) { (n ? (img ? img.drop : $('mparent')) : name).focus(); return; }
    modalOpen.busy = true;
    var btn = $('mfSave'); btn.disabled = true; btn.textContent = editing ? 'Salvando…' : 'Enviando imagem…'; $('mfCancel').disabled = true; $('mfErr').textContent = '';
    var vis = flagVal('mvis', m), share = shareVal('mvis', m);
    var p = editing ? Ops.updateMap(m.id, n, parent, vis, share).then(function () { return m.id; }) : Ops.createMap(n, parent, img.file, img.dims, vis, share);
    p.then(function (id) {
      closeModal(true);
      toast(editing ? 'Mapa salvo.' : 'Mapa criado.');
      if (!editing) go(mapHref(id));
    }, function (er) {
      if (!modalOpen) return;
      modalOpen.busy = false; btn.disabled = false; btn.textContent = editing ? 'Salvar mapa' : 'Criar mapa'; $('mfCancel').disabled = false;
      $('mfErr').textContent = errorText(er);
    });
  };
}
