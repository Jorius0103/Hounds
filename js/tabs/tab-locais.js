/* =====================================================================
   Hounds — Aba Locais: lista, página do local e formulário
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   Page: Locais (list). Without a search, only the top-level locations;
   the ones inside them are on each location's page.
   ===================================================================== */
function renderLocaisPage() {
  var can = canWrite();
  pageRoot.innerHTML =
    '<div class="head-row"><div>' + crumbsHtml('locais') + '<h1>Locais</h1><p class="lede">Os locais do mundo: cidades, castelos, florestas, vilas. Um local pode ficar dentro de outro, como uma taverna dentro de uma cidade, e também num mapa e com personagens ligados a ele.</p></div>' +
    (can ? '<button class="btn primary" type="button" id="newLocBtn">' + svg(ICON.plus, 16, 2.4) + 'Novo local</button>' : '') + '</div>' + notice() +
    (W.locations.length ? '<div class="toolbar"><label class="sr" for="locSearch" style="position:absolute;left:-9999px">Buscar locais</label><input class="search" id="locSearch" type="search" placeholder="Buscar por nome, mapa ou personagem" autocomplete="off" value="' + esc(S.ui.q || '') + '"><span class="meta" id="locCount"></span></div>' : '') +
    '<div id="locList"></div>';
  var b = $('newLocBtn'); if (b) b.onclick = function () { openLocationForm(null); };
  var s = $('locSearch'); if (s) s.addEventListener('input', function () { S.ui.q = s.value; renderLocList(); });
  renderLocList();
}
function renderLocList() {
  var el = $('locList'); if (!el) return;
  if (!W.loaded.locations) { el.innerHTML = '<p class="lede">Carregando locais…</p>'; return; }
  if (!W.locations.length) {
    el.innerHTML = '<div class="empty-state">' + svg(ICON.pin, 34, 1.6) + '<strong>Nenhum local cadastrado</strong><span>' + (canWrite() ? 'Crie o primeiro com <b>Novo local</b>.' : 'Os locais criados vão aparecer aqui.') + '</span></div>';
    return;
  }
  var q = norm(S.ui.q);
  var list = q ? W.locations.slice().sort(byName).filter(function (l) {
    return norm(l.name + ' ' + (l.description || '') + ' ' + locPathText(l.id) + ' ' + mapPathText(locMapId(l)) + ' ' + locChars(l).map(function (c) { return c.name; }).join(' ')).indexOf(q) >= 0;
  }) : childLocs(null);
  var cnt = $('locCount'); if (cnt) cnt.textContent = q ? list.length + ' de ' + W.locations.length : plural(W.locations.length, 'local', 'locais');
  el.innerHTML = list.length ? '<div class="loc-grid">' + list.map(locCard).join('') + '</div>' : '<p class="lede">Nenhum local encontrado para essa busca.</p>';
  fillImages(el);
}
function locCard(l) {
  var mid = locMapId(l), chars = locChars(l).length, kids = childLocs(l.id).length, up = W.locParent[l.id];
  var meta = [kids ? plural(kids, 'sublocal', 'sublocais') : '', chars ? plural(chars, 'personagem', 'personagens') : ''].filter(Boolean).join(' · ');
  return '<a class="loc-card" href="' + locHref(l.id) + '"><div class="thumb"' + (l.image ? ' data-img="' + esc(l.image.ref) + '"' : '') + '>' + svg(ICON.pin, 28, 1.6) + '</div><div class="map-card-body"><strong>' + esc(l.name) + '</strong>' +
    (up ? '<span class="where">' + svg(ICON.pin, 12) + ' Em ' + esc(locPathText(up)) + '</span>' : '') +
    '<span class="where">' + (mid ? svg(ICON.map, 12) + ' ' + esc(mapPathText(mid)) : 'Sem mapa') + '</span>' + (meta ? '<span class="meta">' + meta + '</span>' : '') + '</div></a>';
}

/* =====================================================================
   Page: single location
   ===================================================================== */
function renderLocalPage() {
  var l = locById(S.route.locId), ui = S.ui;
  if (!l) {
    pageRoot.innerHTML = crumbsHtml('locais') + (W.loaded.locations ? '<h1>Local não encontrado</h1><p class="lede">Esse local foi excluído ou o link está incompleto.</p><div><a class="btn" href="#locais">Voltar para Locais</a></div>' : '<p class="lede">Carregando local…</p>');
    return;
  }
  var can = canWrite(), mid = locMapId(l), m = mapById(mid), chars = locChars(l), up = locById(W.locParent[l.id]), kids = childLocs(l.id);
  var gone = (kids.length ? plural(kids.length, 'sublocal passa', 'sublocais passam') + ' para ' + (up ? '<b>' + esc(up.name) + '</b>' : 'o nível superior') + '. ' : '') + 'Marcadores ligados a ele continuam no mapa, sem o vínculo.';
  var head = crumbsHtml('loc:' + l.id) + '<div class="head-row"><div><span class="badge">' + svg(ICON.pin, 12, 2.4) + 'Local</span><h1>' + esc(l.name) + '</h1>' +
    (up ? '<p class="lede">Dentro de <a class="inline" href="' + locHref(up.id) + '">' + esc(locPathText(up.id)) + '</a></p>' : '') +
    (m ? '<p class="lede">No mapa <a class="inline" href="' + mapHref(m.id) + '">' + esc(mapPathText(m.id)) + '</a></p>' : '') + '</div>' +
    (kids.length || can ? '<div class="btn-row">' + (kids.length ? '<button class="btn" type="button" id="locTreeBtn">' + svg(ICON.tree, 15) + 'Árvore</button>' : '') +
      (can ? '<button class="btn" type="button" id="editLocBtn">' + svg(ICON.edit, 15) + 'Editar local</button><button class="btn danger" type="button" id="delLocBtn">' + svg(ICON.trash, 15) + 'Excluir</button>' : '') + '</div>' : '') + '</div>' +
    (ui.confirmDelete ? '<div class="confirm" role="alert"><span>Excluir o local <b>' + esc(l.name) + '</b>? ' + gone + ' Não dá para desfazer.</span><div class="btn-row"><button class="btn danger solid" type="button" id="delLocYes">Excluir local</button><button class="btn ghost" type="button" id="delLocNo">Cancelar</button></div></div>' : '');
  var pics = [l.image, l.image2].filter(function (im) { return im && im.ref; });
  var main = (pics.length ? '<div class="loc-pics' + (pics.length > 1 ? ' two-pics' : '') + '">' + pics.map(function (im, i) { return '<div class="loc-hero" id="locHero' + i + '">' + svg(ICON.image, 32, 1.6) + '</div>'; }).join('') + '</div>' : '') +
    '<section><h2 class="sec-title">Descrição</h2>' + (l.description ? '<p class="long">' + esc(l.description) + '</p>' : '<p class="long none">Sem descrição.</p>') + '</section>';
  var side = '<div class="box"><h2 class="sec-title" style="margin:0">Sublocais</h2>' +
    (kids.length ? '<ul class="links">' + kids.map(function (k) { var n = childLocs(k.id).length; return '<li><a class="row-link" href="' + locHref(k.id) + '">' + thumbSlot(k.image && k.image.ref, ICON.pin) + '<b>' + esc(k.name) + '</b>' + (n ? '<span class="meta">' + plural(n, 'sublocal', 'sublocais') + '</span>' : '') + '</a></li>'; }).join('') + '</ul>' : '<p class="lede" style="font-size:13px">Nenhum local dentro deste.</p>') +
    (can ? '<div><button class="btn" type="button" id="newSubLoc">' + svg(ICON.plus, 15, 2.4) + 'Novo local dentro deste</button></div>' : '') + '</div>' +
    '<div class="box"><h2 class="sec-title" style="margin:0">Personagens</h2>' +
    (chars.length ? '<div class="people">' + chars.map(personChip).join('') + '</div>' : '<p class="lede" style="font-size:13px">Nenhum personagem ligado.</p>') + '</div>' +
    '<div class="box"><h2 class="sec-title" style="margin:0">Mapa relacionado</h2>' +
    (m ? '<ul class="links"><li><a class="row-link" href="' + mapHref(m.id) + '">' + thumbSlot(m.image && m.image.ref, ICON.map) + '<b>' + esc(m.name) + '</b></a></li></ul><div class="btn-row" id="locMapActions"></div>' : '<p class="lede" style="font-size:13px">Este local não está em nenhum mapa.</p>') + '</div>' +
    '<div class="box"><h2 class="sec-title" style="margin:0">Localização no mapa</h2>' + (m ? pathTree(mapChain(m.id), { leaf: l }) : '<p class="lede" style="font-size:13px">Escolha um mapa em <b>Editar local</b> para posicionar este local na hierarquia.</p>') + '</div>';
  pageRoot.innerHTML = head + '<div class="loc-layout"><div class="side" style="gap:22px">' + main + '</div><div class="side">' + side + '</div></div>';
  pics.forEach(function (im, i) { W.store.imageUrl(im.ref).then(function (u) { var h = $('locHero' + i); if (h && u) h.innerHTML = '<img src="' + esc(u) + '" alt="' + esc(l.name) + (i ? ' (2ª imagem)' : '') + '">'; }); });
  fillImages(pageRoot);
  // Is there a marker for this location on its map?
  if (m) W.store.query('maps/' + m.id + '/markers', 'locationId', l.id).then(function (list) {
    var box = $('locMapActions'); if (!box || S.route.locId !== l.id) return;
    var ex = '#map~' + encodeURIComponent(m.id) + '~explorar';
    if (list.length) box.innerHTML = '<a class="btn" href="' + ex + '" id="seeOnMap">' + svg(ICON.target, 15) + 'Ver no mapa</a>';
    else if (canWrite()) box.innerHTML = '<a class="btn" href="' + ex + '" id="markOnMap">' + svg(ICON.pin, 15) + 'Marcar no mapa</a>';
    var a = $('seeOnMap'); if (a) a.onclick = function () { Explorer.pending = { locationId: l.id }; };
    var b = $('markOnMap'); if (b) b.onclick = function () { Explorer.pending = { linkLocationId: l.id }; };
  }).catch(function () {});
  var tb = $('locTreeBtn'); if (tb) tb.onclick = function () { openLocTree(l); };
  var e = $('editLocBtn'); if (e) e.onclick = function () { openLocationForm(l); };
  var ns = $('newSubLoc'); if (ns) ns.onclick = function () { openLocationForm(null, mid || '', l.id); };
  var d = $('delLocBtn'); if (d) d.onclick = function () { ui.confirmDelete = true; renderLocalPage(); };
  var dn = $('delLocNo'); if (dn) dn.onclick = function () { ui.confirmDelete = false; renderLocalPage(); };
  var dy = $('delLocYes'); if (dy) dy.onclick = function () {
    dy.disabled = true;
    Ops.deleteLocation(l).then(function () { toast('Local excluído.'); go(up ? locHref(up.id) : '#locais', true); }, function (er) { dy.disabled = false; toast(errorText(er), true); });
  };
}

/* =====================================================================
   Tree: a location and everything inside it, at every depth
   ===================================================================== */
function locRow(l, here) {
  var k = childLocs(l.id).length;
  return '<a class="mrow' + (here ? ' here' : '') + '" href="' + locHref(l.id) + '"' + (here ? ' aria-current="page"' : '') + '>' + thumbSlot(l.image && l.image.ref, ICON.pin) +
    '<span class="mtext"><b>' + esc(l.name) + '</b>' + (k ? '<span class="meta">' + plural(k, 'sublocal', 'sublocais') + '</span>' : '') + '</span></a>';
}
function locTree(pid) {
  var list = childLocs(pid);
  return list.length ? '<ul>' + list.map(function (c) { return '<li>' + locRow(c) + locTree(c.id) + '</li>'; }).join('') + '</ul>' : '';
}
function openLocTree(l) {
  var n = locDescendants(l.id).length;
  showModal('<h2 id="ltTitle">Árvore de ' + esc(l.name) + '</h2><p class="lede" style="margin:0">' + plural(n, 'local fica', 'locais ficam') + ' dentro de <b>' + esc(l.name) + '</b>.</p>' +
    '<div class="mtree">' + locRow(l, true) + locTree(l.id) + '</div>');
  modal.setAttribute('aria-labelledby', 'ltTitle');
  fillImages(modal);
  modal.querySelectorAll('.mtree a').forEach(function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); var h = a.getAttribute('href'); closeModal(); go(h); });
  });
}



/* =====================================================================
   Form: location (name, parent location, image, description, characters, map)
   ===================================================================== */
function openLocationForm(l, presetMap, presetParent) {
  var editing = !!l, canImg = W.store.canUpload;
  var exclude = editing ? badLocParents(l.id) : null, parentNow = editing ? (W.locParent[l.id] || '') : (presetParent || '');
  var html = '<form id="locForm" novalidate><h2 id="lfTitle">' + (editing ? 'Editar local' : 'Novo local') + '</h2>' +
    '<div class="field" id="f_lname"><label for="lname">Nome do local</label><input type="text" id="lname" maxlength="100" autocomplete="off" placeholder="Ex.: Taverna Anão Caolho" value="' + esc(editing ? l.name : '') + '"><div class="err" id="err_lname"></div></div>' +
    '<div class="field"><label for="lparent">Fica dentro de</label><select id="lparent">' + locParentOptions(parentNow, exclude, 'Nenhum (local de nível superior)') + '</select>' +
    '<span class="hint-text">O local maior onde este fica. Ex.: uma taverna dentro de uma cidade.' + (exclude && Object.keys(exclude).length > 1 ? ' Os locais que estão dentro deste não aparecem na lista.' : '') + '</span></div>' +
    (canImg ? imageFieldHtml('limg', 'Imagem de referência', 'Foto, ilustração, arte conceitual ou planta. Opcional, até 20 MB. É a que aparece nas miniaturas.') +
      imageFieldHtml('limg2', 'Segunda imagem', 'Opcional, até 20 MB. Ex.: outro ângulo, a planta ou um detalhe do local.') : '') +
    '<div class="field"><label for="ldesc">Descrição</label><textarea id="ldesc" rows="7" maxlength="20000" placeholder="História, aparência, quem vive ali, o que o grupo descobriu…">' + esc(editing ? l.description : '') + '</textarea></div>' +
    '<div class="field"><label for="lchar">Personagens relacionados</label><div class="picker" id="picker"><div class="people" id="pickSel"></div>' +
    '<input type="text" id="lchar" autocomplete="off" placeholder="Buscar ou digitar um nome" role="combobox" aria-expanded="false" aria-controls="pickList" aria-autocomplete="list">' +
    '<div class="suggest" id="pickList" role="listbox" hidden></div></div><span class="hint-text">Sugere personagens já cadastrados e os da Mesa de Combate. Enter adiciona um nome novo.</span></div>' +
    '<div class="field"><label for="lmap">Mapa relacionado</label><select id="lmap">' + mapOptions(editing ? locMapId(l) : (presetMap || ''), null, 'Nenhum mapa') + '</select><span class="hint-text">O mapa onde este local fica, dentro da hierarquia de mapas.</span></div>' +
    flagHtml('lvis', l, true) +
    '<div class="form-err" id="lfErr" role="alert"></div>' +
    '<div class="btn-row" style="justify-content:flex-end"><button class="btn ghost" type="button" id="lfCancel">Cancelar</button><button class="btn primary" type="submit" id="lfSave">' + (editing ? 'Salvar local' : 'Criar local') + '</button></div></form>';
  var img, img2;
  showModal(html, function () { if (img) img.dispose(); if (img2) img2.dispose(); });
  modal.setAttribute('aria-labelledby', 'lfTitle');
  function current(im) { return editing && im && im.ref ? W.store.imageUrl(im.ref).then(function (u) { return { url: u, name: 'Imagem atual', dims: im.w ? im.w + ' × ' + im.h + ' px' : '' }; }) : null; }
  if (canImg) { img = imageField('limg', { removable: true, existing: current(l && l.image) }); img2 = imageField('limg2', { removable: true, existing: current(l && l.image2) }); }
  var name = $('lname');
  name.addEventListener('input', function () { if (name.value.trim()) { $('err_lname').textContent = ''; $('f_lname').classList.remove('invalid'); } });

  // ---- character picker ----
  var sel = editing ? locChars(l).map(function (c) { return { id: c.id, name: c.name }; }) : [];
  var input = $('lchar'), list = $('pickList'), active = 0, options = [];
  function paintSel() {
    $('pickSel').innerHTML = sel.map(function (s, i) { return '<span class="person"><i>' + esc(initials(s.name)) + '</i>' + esc(s.name) + '<button type="button" data-rm="' + i + '" aria-label="Remover ' + esc(s.name) + '">' + svg(ICON.x, 12, 2.6) + '</button></span>'; }).join('');
  }
  function has(name) { return sel.some(function (s) { return norm(s.name) === norm(name); }); }
  function computeOptions() {
    var q = norm(input.value.trim()), out = [];
    W.characters.slice().sort(byName).forEach(function (c) { if (!has(c.name) && (!q || norm(c.name).indexOf(q) >= 0)) out.push({ id: c.id, name: c.name, tag: 'Cadastrado' }); });
    mesaCharacters().forEach(function (c) {
      if (has(c.name) || out.some(function (o) { return norm(o.name) === norm(c.name); })) return;
      if (!q || norm(c.name).indexOf(q) >= 0) out.push({ name: c.name, source: 'mesa', mesaId: c.mesaId, tag: 'Mesa · ' + c.kind });
    });
    out = out.slice(0, 30);
    var typed = input.value.trim();
    if (typed && !has(typed) && !out.some(function (o) { return norm(o.name) === norm(typed); })) out.push({ name: typed, source: 'manual', tag: 'Novo', create: true });
    return out;
  }
  function paintList() {
    options = computeOptions();
    if (!options.length) { list.hidden = true; input.setAttribute('aria-expanded', 'false'); return; }
    active = Math.min(active, options.length - 1);
    list.innerHTML = options.map(function (o, i) {
      return '<button type="button" role="option" id="opt' + i + '" data-i="' + i + '" class="' + (i === active ? 'act' : '') + '" aria-selected="' + (i === active) + '">' + (o.create ? svg(ICON.plus, 14, 2.4) + 'Adicionar <b>“' + esc(o.name) + '”</b>' : esc(o.name)) + '<small>' + esc(o.tag) + '</small></button>';
    }).join('');
    list.hidden = false; input.setAttribute('aria-expanded', 'true'); input.setAttribute('aria-activedescendant', 'opt' + active);
  }
  function pick(i) { var o = options[i]; if (!o) return; sel.push({ id: o.id, name: o.name, source: o.source, mesaId: o.mesaId }); input.value = ''; active = 0; paintSel(); list.hidden = true; input.setAttribute('aria-expanded', 'false'); input.focus(); }
  input.addEventListener('focus', paintList);
  input.addEventListener('input', function () { active = 0; paintList(); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (list.hidden) { active = 0; paintList(); } else { active = Math.min(options.length - 1, active + 1); paintList(); } }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(0, active - 1); paintList(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (!list.hidden && options.length) pick(active); }
    else if (e.key === 'Escape' && !list.hidden) { e.stopPropagation(); list.hidden = true; }
    else if (e.key === 'Backspace' && !input.value && sel.length) { sel.pop(); paintSel(); paintList(); }
  });
  input.addEventListener('blur', function () { setTimeout(function () { if (document.activeElement !== input) list.hidden = true; }, 150); });
  list.addEventListener('mousedown', function (e) { e.preventDefault(); });
  list.addEventListener('click', function (e) { var b = e.target.closest('[data-i]'); if (b) pick(+b.getAttribute('data-i')); });
  $('pickSel').addEventListener('click', function (e) { var b = e.target.closest('[data-rm]'); if (!b) return; sel.splice(+b.getAttribute('data-rm'), 1); paintSel(); input.focus(); });
  paintSel();

  $('lfCancel').onclick = function () { closeModal(); };
  $('locForm').onsubmit = function (e) {
    e.preventDefault();
    if (modalOpen.busy) return;
    var n = name.value.trim();
    if (!n) { $('err_lname').textContent = 'Informe o nome do local.'; $('f_lname').classList.add('invalid'); name.focus(); return; }
    if (img && $('err_limg').textContent && !img.file) { img.drop.focus(); return; }
    if (img2 && $('err_limg2').textContent && !img2.file) { img2.drop.focus(); return; }
    modalOpen.busy = true;
    var sending = (img && img.file ? 1 : 0) + (img2 && img2.file ? 1 : 0);
    var btn = $('lfSave'); btn.disabled = true; btn.textContent = sending ? (sending > 1 ? 'Enviando imagens…' : 'Enviando imagem…') : 'Salvando…'; $('lfCancel').disabled = true; $('lfErr').textContent = '';
    var mapId = $('lmap').value || null;
    if (mapId && !mapById(mapId)) mapId = null;
    var parentId = $('lparent').value || null;
    if (parentId && !locById(parentId)) parentId = null;
    var lvis = flagVal('lvis', l), lshare = shareVal('lvis', l);
    Ops.ensureCharacters(sel, lvis, lshare).then(function (ids) {
      return Ops.saveLocation(l, { name: n, description: $('ldesc').value.trim(), characterIds: ids, mapId: mapId, parentId: parentId, visible: lvis, sharedWith: lshare }, img && img.file, img && img.dims, img && img.removed,
        img2 ? { file: img2.file, dims: img2.dims, removed: img2.removed } : null);
    }).then(function (id) {
      closeModal(true);
      toast(editing ? 'Local salvo.' : 'Local criado.');
      if (!editing) go(locHref(id));
    }, function (er) {
      if (!modalOpen) return;
      modalOpen.busy = false; btn.disabled = false; btn.textContent = editing ? 'Salvar local' : 'Criar local'; $('lfCancel').disabled = false;
      $('lfErr').textContent = errorText(er);
    });
  };
}
