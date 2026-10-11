/* =====================================================================
   Hounds — Aba Eventos (Mundo › Eventos)
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   Eventos: batalhas, festas, acordos, tragédias da campanha.
   An event ↔ character link is stored once, in event.characterIds, and
   the event's place in event.locationId. "date" is free text, because
   the campaign has its own calendar.
   ===================================================================== */
ICON.event = '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/>';
function indexEvents() { var idx = /** @type {Record<string, HEvent>} */ ({}); W.events.forEach(function (e) { idx[e.id] = e; }); W.eventIdx = idx; }
function eventById(id) { return (id && W.eventIdx[id]) || null; }
function eventHref(id) { return hrefFor('event:' + id); }
function eventChars(ev) { return uniqIds(ev && ev.characterIds).map(function (id) { return W.charIdx[id]; }).filter(Boolean).sort(byName); }
function eventLoc(ev) { return (ev && ev.locationId && W.locIdx[ev.locationId]) || null; }
// The events a character takes part in, and the ones that happened at a location.
function charEvents(charId) { return W.events.filter(function (ev) { return (ev.characterIds || []).indexOf(charId) >= 0; }).sort(byName); }
function locEvents(locId) { return W.events.filter(function (ev) { return ev.locationId === locId; }).sort(byName); }
function eventLink(ev) {
  return '<li><a class="row-link" href="' + eventHref(ev.id) + '">' + thumbSlot(ev.image && ev.image.ref, ICON.event) + '<span class="mtext"><b>' + esc(ev.name) + '</b>' +
    '<span class="where">' + (ev.date ? esc(ev.date) : 'Sem data') + '</span></span></a></li>';
}

Ops.saveEvent = function (ev, fields, newFile, newDims, removeImage) {
  var name = (fields.name || '').trim();
  if (!name) return Promise.reject({ message: 'Informe o nome do evento.' });
  var oldRef = ev && ev.image && ev.image.ref;
  var p = Promise.resolve(ev && ev.image ? ev.image : null);
  if (newFile) p = W.store.upload(newFile).then(function (u) { return { ref: u.ref, w: newDims.w, h: newDims.h, type: u.type, size: u.size }; });
  else if (removeImage) p = Promise.resolve(null);
  return p.then(function (image) {
    var t = now();
    // Each character once; characters this user can't see stay in the event.
    var cids = keepHidden((fields.characterIds || []).filter(function (id) { return rawHas('characters', id); }), ev && ev.characterIds, 'characters', W.charIdx);
    // A location this user can't see is kept, the same way as a location's map.
    var lid = fields.locationId && rawHas('locations', fields.locationId) ? fields.locationId : null;
    if (!lid && ev && ev.locationId && !W.locIdx[ev.locationId] && rawHas('locations', ev.locationId)) lid = ev.locationId;
    var body = { v: 1, name: name, date: (fields.date || '').trim(), description: (fields.description || '').trim(), locationId: lid, characterIds: cids, image: image,
                 visible: fields.visible !== false, sharedWith: fields.sharedWith || (ev && ev.sharedWith) || [], createdBy: owner(ev), createdAt: (ev && ev.createdAt) || t, updatedAt: t };
    return W.store.put('events', ev ? ev.id : null, body);
  }).then(function (id) {
    if (oldRef && (newFile || removeImage)) W.store.dropImage(oldRef);
    return id;
  });
};
Ops.deleteEvent = function (ev) {
  return W.store.remove('events', ev.id).then(function () { return W.store.dropImage(ev.image && ev.image.ref); });
};

/* =====================================================================
   Page: Eventos (list)
   ===================================================================== */
function renderEventsPage() {
  var can = canWrite();
  pageRoot.innerHTML =
    '<div class="head-row"><div>' + crumbsHtml('events') + '<h1>Eventos</h1><p class="lede">O que aconteceu na campanha: batalhas, festas, acordos, tragédias. Cada evento pode ter data, local e os personagens que participaram.</p></div>' +
    (can ? '<button class="btn primary" type="button" id="newEventBtn">' + svg(ICON.plus, 16, 2.4) + 'Novo evento</button>' : '') + '</div>' + notice() +
    (W.events.length ? '<div class="toolbar"><label for="eventSearch" style="position:absolute;left:-9999px">Buscar eventos</label><input class="search" id="eventSearch" type="search" placeholder="Buscar por nome, data, local ou personagem" autocomplete="off" value="' + esc(S.ui.q || '') + '"><span class="meta" id="eventCount"></span></div>' : '') +
    '<div id="eventList"></div>';
  var b = $('newEventBtn'); if (b) b.onclick = function () { openEventForm(null); };
  var s = $('eventSearch'); if (s) s.addEventListener('input', function () { S.ui.q = s.value; renderEventList(); });
  renderEventList();
}
function renderEventList() {
  var el = $('eventList'); if (!el) return;
  if (!W.loaded.events) { el.innerHTML = '<p class="lede">Carregando eventos…</p>'; return; }
  if (!W.events.length) {
    el.innerHTML = '<div class="empty-state">' + svg(ICON.event, 34, 1.6) + '<strong>Nenhum evento cadastrado</strong><span>' + (canWrite() ? 'Crie o primeiro com <b>Novo evento</b>.' : 'Os eventos criados vão aparecer aqui.') + '</span></div>';
    return;
  }
  var q = norm(S.ui.q);
  var list = W.events.slice().sort(byName).filter(function (ev) {
    var l = eventLoc(ev);
    return !q || norm(ev.name + ' ' + (ev.date || '') + ' ' + (ev.description || '') + ' ' + (l ? locPathText(l.id) : '') + ' ' + eventChars(ev).map(function (c) { return c.name; }).join(' ')).indexOf(q) >= 0;
  });
  var cnt = $('eventCount'); if (cnt) cnt.textContent = q ? list.length + ' de ' + W.events.length : plural(W.events.length, 'evento', 'eventos');
  el.innerHTML = list.length ? '<div class="loc-grid">' + list.map(eventCard).join('') + '</div>' : '<p class="lede">Nenhum evento encontrado para essa busca.</p>';
  fillImages(el);
}
function eventCard(ev) {
  var l = eventLoc(ev), n = eventChars(ev).length;
  return '<a class="loc-card" href="' + eventHref(ev.id) + '"><div class="thumb"' + (ev.image ? ' data-img="' + esc(ev.image.ref) + '"' : '') + '>' + svg(ICON.event, 28, 1.6) + '</div><div class="map-card-body"><strong>' + esc(ev.name) + '</strong>' +
    '<span class="where">' + (ev.date ? esc(ev.date) : 'Sem data') + '</span>' +
    '<span class="where">' + (l ? svg(ICON.pin, 12) + ' ' + esc(locPathText(l.id)) : 'Sem local') + '</span>' + (n ? '<span class="meta">' + plural(n, 'personagem', 'personagens') + '</span>' : '') + '</div></a>';
}

/* =====================================================================
   Page: single event
   ===================================================================== */
function renderEventPage() {
  var ev = eventById(S.route.eventId), ui = S.ui;
  if (!ev) {
    pageRoot.innerHTML = crumbsHtml('events') + (W.loaded.events ? '<h1>Evento não encontrado</h1><p class="lede">Esse evento foi excluído ou o link está incompleto.</p><div><a class="btn" href="#eventos">Voltar para Eventos</a></div>' : '<p class="lede">Carregando evento…</p>');
    return;
  }
  var can = canWrite(), chars = eventChars(ev), l = eventLoc(ev);
  var head = crumbsHtml('event:' + ev.id) + '<div class="head-row"><div><span class="badge">' + svg(ICON.event, 12, 2.4) + 'Evento</span><h1>' + esc(ev.name) + '</h1>' +
    (ev.date ? '<p class="lede">' + esc(ev.date) + '</p>' : '') +
    (l ? '<p class="lede">Em <a class="inline" href="' + locHref(l.id) + '">' + esc(locPathText(l.id)) + '</a></p>' : '') + '</div>' +
    (can ? '<div class="btn-row"><button class="btn" type="button" id="editEventBtn">' + svg(ICON.edit, 15) + 'Editar evento</button><button class="btn danger" type="button" id="delEventBtn">' + svg(ICON.trash, 15) + 'Excluir</button></div>' : '') + '</div>' +
    (ui.confirmDelete ? '<div class="confirm" role="alert"><span>Excluir o evento <b>' + esc(ev.name) + '</b>? Os personagens e o local continuam cadastrados. Não dá para desfazer.</span><div class="btn-row"><button class="btn danger solid" type="button" id="delEventYes">Excluir evento</button><button class="btn ghost" type="button" id="delEventNo">Cancelar</button></div></div>' : '');
  var main = (ev.image ? '<div class="loc-hero" id="eventHero">' + svg(ICON.event, 32, 1.6) + '</div>' : '') +
    '<section><h2 class="sec-title">Descrição</h2>' + (ev.description ? '<p class="long">' + esc(ev.description) + '</p>' : '<p class="long none">Sem descrição.</p>') + '</section>' +
    '<section><div class="head-row" style="align-items:center"><h2 class="sec-title" style="margin:0">Personagens</h2>' + (can ? '<button class="btn" type="button" id="addEventCharBtn">' + svg(ICON.plus, 15, 2.4) + 'Adicionar personagens</button>' : '') + '</div>' +
    (chars.length ? '<div class="loc-grid" style="margin-top:12px">' + chars.map(function (c) {
      return '<a class="loc-card" href="' + charHref(c.id) + '"><div class="thumb char-thumb"' + (c.image ? ' data-img="' + esc(c.image.ref) + '"' : '') + '><span class="initials">' + esc(initials(c.name)) + '</span></div><div class="map-card-body"><strong>' + esc(c.name) + '</strong>' +
        (charSubtitle(c) ? '<span class="where">' + esc(charSubtitle(c)) + '</span>' : '') + '</div></a>';
    }).join('') + '</div>' : '<p class="lede" style="font-size:13px">Nenhum personagem ligado a este evento.' + (can ? ' Use <b>Adicionar personagens</b>.' : '') + '</p>') + '</section>';
  var side = '<div class="box"><h2 class="sec-title" style="margin:0">Informações</h2><dl class="facts"><dt>Data</dt><dd>' + (ev.date ? esc(ev.date) : '<span class="none">Não informada</span>') + '</dd>' +
    '<dt>Personagens</dt><dd>' + (chars.length || '<span class="none">Nenhum</span>') + '</dd></dl></div>' +
    '<div class="box"><h2 class="sec-title" style="margin:0">Local</h2>' +
    (l ? '<ul class="links"><li><a class="row-link" href="' + locHref(l.id) + '">' + thumbSlot(l.image && l.image.ref, ICON.pin) + '<span class="mtext"><b>' + esc(l.name) + '</b><span class="where">' + (locMapId(l) ? esc(mapPathText(locMapId(l))) : 'Sem mapa') + '</span></span></a></li></ul>'
      : '<p class="lede" style="font-size:13px">Nenhum local informado.' + (can ? ' Escolha um em <b>Editar evento</b>.' : '') + '</p>') + '</div>';
  pageRoot.innerHTML = head + '<div class="loc-layout"><div class="side" style="gap:22px">' + main + '</div><div class="side">' + side + '</div></div>';
  if (ev.image) W.store.imageUrl(ev.image.ref).then(function (u) {
    var h = $('eventHero'); if (!h || !u) return;
    h.innerHTML = '<button class="hero-zoom" type="button" aria-label="Ampliar a imagem de ' + esc(ev.name) + '" title="Clique para ampliar"><img src="' + esc(u) + '" alt="' + esc(ev.name) + '"></button>';
    h.querySelector('.hero-zoom').onclick = function () { zoomImage(u, ev.name); };
  });
  fillImages(pageRoot);
  var e = $('editEventBtn'); if (e) e.onclick = function () { openEventForm(ev); };
  var a = $('addEventCharBtn'); if (a) a.onclick = function () { openEventForm(ev, true); };
  var d = $('delEventBtn'); if (d) d.onclick = function () { ui.confirmDelete = true; renderEventPage(); };
  var dn = $('delEventNo'); if (dn) dn.onclick = function () { ui.confirmDelete = false; renderEventPage(); };
  var dy = $('delEventYes'); if (dy) dy.onclick = function () {
    dy.disabled = true;
    Ops.deleteEvent(ev).then(function () { toast('Evento excluído.'); go('#eventos', true); }, function (er) { dy.disabled = false; toast(errorText(er), true); });
  };
}

/* =====================================================================
   Form: event (name, date, location, image, description, characters)
   ===================================================================== */
function openEventForm(ev, focusChars) {
  var editing = !!ev, canImg = W.store.canUpload;
  var html = '<form id="eventForm" novalidate><h2 id="efTitle">' + (editing ? 'Editar evento' : 'Novo evento') + '</h2>' +
    '<div class="field" id="f_ename"><label for="ename">Nome do evento</label><input type="text" id="ename" maxlength="120" autocomplete="off" placeholder="Ex.: Batalha da Ponte Velha" value="' + esc(editing ? ev.name : '') + '"><div class="err" id="err_ename"></div></div>' +
    '<div class="field"><label for="edate">Data</label><input type="text" id="edate" maxlength="80" autocomplete="off" placeholder="Ex.: 3º dia do outono, ano 1023" value="' + esc(editing ? ev.date || '' : '') + '"><span class="hint-text">Opcional. Texto livre, no calendário da campanha.</span></div>' +
    '<div class="field"><label for="eloc">Local</label><select id="eloc">' + locParentOptions(editing ? (eventLoc(ev) ? ev.locationId : '') : '', null, 'Nenhum local') + '</select><span class="hint-text">Opcional. Onde o evento aconteceu.</span></div>' +
    (canImg ? imageFieldHtml('eimg', 'Imagem', 'Ilustração ou cena do evento. Opcional, até 20 MB.') : '') +
    '<div class="field"><label for="edesc">Descrição</label><textarea id="edesc" rows="6" maxlength="20000" placeholder="O que aconteceu, quem estava lá, as consequências…">' + esc(editing ? ev.description || '' : '') + '</textarea></div>' +
    idPickerHtml('echar', 'Personagens', 'Buscar personagem', W.characters.length ? '' : 'Nenhum personagem cadastrado ainda', 'Opcional. Os personagens que participaram do evento. Cada um entra uma vez só.') +
    flagHtml('evis', ev, true) +
    '<div class="form-err" id="efErr" role="alert"></div>' +
    '<div class="btn-row" style="justify-content:flex-end"><button class="btn ghost" type="button" id="efCancel">Cancelar</button><button class="btn primary" type="submit" id="efSave">' + (editing ? 'Salvar evento' : 'Criar evento') + '</button></div></form>';
  var img;
  showModal(html, function () { if (img) img.dispose(); });
  modal.setAttribute('aria-labelledby', 'efTitle');
  if (canImg) img = imageField('eimg', { removable: true, existing: editing && ev.image ? W.store.imageUrl(ev.image.ref).then(function (u) { return { url: u, name: 'Imagem atual', dims: ev.image.w ? ev.image.w + ' × ' + ev.image.h + ' px' : '' }; }) : null });
  var name = $('ename');
  name.addEventListener('input', function () { if (name.value.trim()) { $('err_ename').textContent = ''; $('f_ename').classList.remove('invalid'); } });

  var sel = editing ? eventChars(ev).map(function (c) { return c.id; }) : [];
  idPicker({ input: 'echar', list: 'echarList', box: 'echarSel', sel: sel,
    chip: function (id) { var c = charById(id); return c && { name: c.name, icon: ICON.user, img: c.image && c.image.ref }; },
    find: function (q) {
      return W.characters.slice().sort(byName).filter(function (c) { return !q || norm(c.name + ' ' + charSubtitle(c)).indexOf(q) >= 0; })
        .map(function (c) { return { id: c.id, label: c.name, sub: charSubtitle(c) }; });
    } });
  if (focusChars && W.characters.length) setTimeout(function () { var f = $('echar'); if (f) f.focus(); }, 30);

  $('efCancel').onclick = function () { closeModal(); };
  $('eventForm').onsubmit = function (e) {
    e.preventDefault();
    if (modalOpen.busy) return;
    var n = name.value.trim();
    if (!n) { $('err_ename').textContent = 'Informe o nome do evento.'; $('f_ename').classList.add('invalid'); name.focus(); return; }
    if (W.events.some(function (x) { return (!editing || x.id !== ev.id) && norm(x.name) === norm(n); }) && !$('efErr').dataset.warned) {
      $('efErr').textContent = 'Já existe um evento com esse nome. Clique em ' + (editing ? 'Salvar' : 'Criar') + ' evento de novo para continuar mesmo assim.'; $('efErr').dataset.warned = '1'; return;
    }
    if (img && $('err_eimg').textContent && !img.file) { img.drop.focus(); return; }
    modalOpen.busy = true;
    var btn = $('efSave'); btn.disabled = true; btn.textContent = img && img.file ? 'Enviando imagem…' : 'Salvando…'; $('efCancel').disabled = true; $('efErr').textContent = '';
    var locId = $('eloc').value || null;
    if (locId && !locById(locId)) locId = null;
    Ops.saveEvent(ev, { name: n, date: $('edate').value, description: $('edesc').value, locationId: locId, characterIds: sel.filter(function (id) { return charById(id); }),
      visible: flagVal('evis', ev), sharedWith: shareVal('evis', ev) }, img && img.file, img && img.dims, img && img.removed)
      .then(function (id) {
        closeModal(true);
        toast(editing ? 'Evento salvo.' : 'Evento criado.');
        if (!editing) go(eventHref(id));
      }, function (er) {
        if (!modalOpen) return;
        modalOpen.busy = false; btn.disabled = false; btn.textContent = editing ? 'Salvar evento' : 'Criar evento'; $('efCancel').disabled = false;
        $('efErr').textContent = errorText(er);
      });
  };
}
