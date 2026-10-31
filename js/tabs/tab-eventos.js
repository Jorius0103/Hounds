/* =====================================================================
   Hounds — Aba Eventos (Mundo › Eventos)
   A lista, a página do evento e o formulário são React (src/hub/paginas/
   Eventos.tsx, Evento.tsx e EventoForm.tsx); aqui ficam os dados, a gravação
   (Ops) e o que as páginas de local e de personagem usam.
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
