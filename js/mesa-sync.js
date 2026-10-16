/* =====================================================================
   Hounds — Dados da Mesa de Combate no site (sincronização)
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   Mesa de Combate data on the site.
   The Mesa's own sync channel (built for MQTT) is wired to the hub: every
   SYNC_FULL it publishes is saved in the shared database, and saved state
   is loaded into the Mesa before it opens and pushed to it live.
     mesa/state          { rev, n, by, createdAt, updatedAt }, plus the
                         state itself when n is 0 (inline), or
     mesa_chunks/{rev_i} { rev, i, part }   (state JSON split in pieces)
   With a store that can broadcast (Supabase), each state and each
   single-character update (SYNC_NPC) also goes straight to the other
   browsers, compressed (gzip, see zip()), and the state is saved 1 s
   after the last change. With Supabase the state is saved in pieces and
   the head row stays small, so the database's notice of each save is a
   few hundred bytes; a browser downloads the pieces only for a revision
   it didn't get by broadcast.
   The Mesa sends each change twice (straight and through its own sync
   client, 150 ms later); the copy is skipped here.
   The Mesa merges what it receives character by character (newest
   updatedAt wins). When someone else's state arrives while this browser
   has edits not saved yet, the Mesa is asked for its merged state
   (REQUEST_SYNC), so the save carries both.
   A Mesa already loaded but hidden (the person is on another page) gets
   the state kept here at most once a second, and at once when it shows
   again, instead of being loaded again.
   deletedCombatIds lists deleted combats, so a Mesa still holding one
   drops it on merge instead of saving it back.
   Images the Mesa embeds as text (avatars) are sent once to the image
   storage and the state carries their address (see hostImgs).
   ===================================================================== */
var MESA_LS = { combats: 'gurps_combat_master_data_v2', conditions: 'gurps_combat_master_conditions_v2', players: 'gurps_fixed_personagens_v1', activeCombatId: 'gurps_combat_master_active_combat_id_v1', deletedCombatIds: 'gurps_combat_master_deleted_v1', editors: 'gurps_combat_master_editors_v1' };
var MesaSync = (function () {
  var CH = 60000, head = null, loadedRev = null, state = null, listeners = [], timer = null, pending = null, writing = false;
  var readyRes, ready = new Promise(function (r) { readyRes = r; }), gotHead = false, lastJson = null, lastRaw = null, askTimer = null, hiddenTimer = 0;
  var cid = 'hub-' + uid(), seq = 0, known = {}, knownList = [], npcSeen = {}, npcSeenList = [];
  // Revisions this browser wrote or already applied: their echoes are skipped.
  function remember(rev) { if (!rev || known[rev]) return; known[rev] = 1; knownList.push(rev); if (knownList.length > 400) delete known[knownList.shift()]; }
  function newRev() { var r = cid + '-' + Date.now() + '-' + (++seq); remember(r); return r; }
  function rt() { return W.store && W.store.realtime; }
  function localState() {
    var out = {}, any = false;
    Object.keys(MESA_LS).forEach(function (k) { try { var v = JSON.parse(localStorage.getItem(MESA_LS[k]) || 'null'); if (v != null) { out[k] = v; any = true; } } catch (e) {} });
    return any ? out : null;
  }
  function ensureSemCombateFirst(combats) {
    if (!Array.isArray(combats) || combats.length === 0) return combats;
    var empty = null, others = [];
    for (var i = 0; i < combats.length; i++) {
      var c = combats[i];
      if (!c) continue;
      if (!empty && (c.id === 'combat-vazio' || (c.name && c.name.toLowerCase().indexOf('vazio') !== -1) || (c.name && c.name.toLowerCase().trim() === 'sem combate'))) {
        empty = Object.assign({}, c, { name: 'Sem combate' });
      } else {
        others.push(c);
      }
    }
    if (!empty) empty = { id: 'combat-vazio', name: 'Sem combate', description: 'Nenhum NPC neste combate. Exibe apenas os personagens.', createdAt: '29/09/2026', npcs: [], isActive: true };
    return [empty].concat(others);
  }
  function toLocal(st) {
    try {
      if (!localStorage.getItem('hounds_mesa_backup_v1')) { var b = localState(); if (b) localStorage.setItem('hounds_mesa_backup_v1', JSON.stringify({ at: Date.now(), data: b })); }
    } catch (e) {}
    if (st.combats) st.combats = ensureSemCombateFirst(st.combats);
    Object.keys(MESA_LS).forEach(function (k) { if (st[k] != null) { try { localStorage.setItem(MESA_LS[k], JSON.stringify(st[k])); } catch (e) {} } });
  }
  function fetchRev(h) {
    // A head written with the state inline (no pieces) is read as is.
    if (Array.isArray(h.combats)) return Promise.resolve({ combats: h.combats, conditions: h.conditions, players: h.players, activeCombatId: h.activeCombatId || null, deletedCombatIds: h.deletedCombatIds, editors: h.editors || null });
    if (!(h.n > 0)) return Promise.resolve(null);
    return W.store.query('mesa_chunks', 'rev', h.rev).then(function (rows) {
      if (rows.length < h.n) return null;
      rows.sort(function (a, b) { return a.i - b.i; });
      try { return JSON.parse(rows.slice(0, h.n).map(function (r) { return r.part; }).join('')); } catch (e) { return null; }
    });
  }
  /* Images embedded in the state as text (data:image/...;base64): the avatars and the copies the
     Mesa keeps of them (npcAvatar in the log, snapshots of edits). A few avatars made the state
     hundreds of KB, carried by every save and every message. Before the state leaves this
     browser, each one goes once to the store's image storage and the state keeps its address
     (the Mesa shows an address in the same <img>). Only with permanent http(s) addresses
     (Supabase); elsewhere the images stay as they are. Nothing is changed in the Mesa itself. */
  // An image can also sit inside a longer text (the Mesa keeps "image|preset" in edit snapshots):
  // only the image part is swapped.
  var DATA_IMG = /data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+\/]+=*/gi, IMG_KEY = 'hounds_mesa_imgs_v1';
  var imgUrls = {}, imgJobs = {}, imgFailed = {};
  try { imgUrls = JSON.parse(localStorage.getItem(IMG_KEY) || '{}') || {}; } catch (e) {}
  function hasImg(v) { return typeof v === 'string' && v.length > 200 && v.indexOf('data:image/') >= 0; }
  // Short fingerprint of an image's text (53-bit hash plus the length).
  function imgKey(s) {
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (var i = 0, c; i < s.length; i++) { c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return s.length.toString(36) + '-' + (h2 >>> 0).toString(36) + (h1 >>> 0).toString(36);
  }
  function findImgs(v, out) {
    if (hasImg(v)) v.replace(DATA_IMG, function (m) { if (m.length > 200) out[imgKey(m)] = m; return m; });
    else if (Array.isArray(v)) v.forEach(function (x) { findImgs(x, out); });
    else if (v && typeof v === 'object') Object.keys(v).forEach(function (k) { findImgs(v[k], out); });
    return out;
  }
  // A copy of v with each embedded image that already has an address replaced by it.
  function swapImgs(v) {
    if (hasImg(v)) return v.replace(DATA_IMG, function (m) { return (m.length > 200 && imgUrls[imgKey(m)]) || m; });
    if (Array.isArray(v)) return v.map(swapImgs);
    if (v && typeof v === 'object') { var o = {}; Object.keys(v).forEach(function (k) { o[k] = swapImgs(v[k]); }); return o; }
    return v;
  }
  function hostImg(dataUrl) {
    return fetch(dataUrl).then(function (r) { return r.blob(); }).then(function (b) { return W.store.upload(b); }).then(function (up) {
      return W.store.imageUrl(up.ref).then(function (u) { if (/^https?:\/\//.test(u || '')) return u; W.store.dropImage(up.ref); return null; });
    });
  }
  // Sends the images of st that have no address yet; resolves when they are done. A failed upload
  // leaves that image as text; it is tried again on a save at least 60 s later.
  function hostImgs(st) {
    if (!W.store || !W.store.canUpload || !canSave()) return Promise.resolve();
    var found = findImgs(st, {});
    return Promise.all(Object.keys(found).filter(function (k) { return !(k in imgUrls) && !(Date.now() - (imgFailed[k] || 0) < 60000); }).map(function (k) {
      return imgJobs[k] || (imgJobs[k] = hostImg(found[k]).then(function (u) {
        imgUrls[k] = u;
        if (u) { try { var keep = {}; Object.keys(imgUrls).filter(function (x) { return imgUrls[x]; }).slice(-200).forEach(function (x) { keep[x] = imgUrls[x]; }); localStorage.setItem(IMG_KEY, JSON.stringify(keep)); } catch (e) {} }
      }, function (e) { imgFailed[k] = Date.now(); console.warn('Hounds: não foi possível enviar uma imagem da Mesa.', e); }).then(function () { delete imgJobs[k]; }));
    }));
  }
  /* Messages to the other browsers: the state is very repetitive JSON (the armor of every character,
     the log) and gzip makes it about 12 times smaller, for ~1 ms. Sent and received in order, each
     through one queue (compressing is asynchronous). A browser without CompressionStream sends the
     JSON as it is; small messages too. Older versions of the site read only the JSON fields
     (state, npc) and skip the compressed ones; they still get every change from the database. */
  var ZIP = typeof CompressionStream === 'function' && typeof DecompressionStream === 'function', ZIP_MIN = 2000, BCAST_MAX = 240000;
  var sendQ = /** @type {Promise<unknown>} */ (Promise.resolve()), recvQ = /** @type {Promise<unknown>} */ (Promise.resolve());
  function b64(buf) { var b = new Uint8Array(buf), s = ''; for (var i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); }
  function unb64(s) { var bin = atob(s), b = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i); return b; }
  function zip(text) { return new Response(new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer().then(b64); }
  function unzip(z) { return new Response(new Blob([unb64(z)]).stream().pipeThrough(new DecompressionStream('gzip'))).text(); }
  // Sends value (its JSON is json) in the field key of a message of this kind, with the fields of extra.
  // bcastFail: when a message last didn't go (channel closed, or too large: the others get it from the
  // database); until 10 s after it, an answer to REQUEST_SYNC is sent too (see publish).
  var bcastFail = 0;
  function send(kind, key, value, json, extra) {
    if (!canSave()) return;
    if (!rt()) { bcastFail = Date.now(); return; }
    var job = function () {
      var body = Object.assign({}, extra);
      var packed = ZIP && json.length > ZIP_MIN ? zip(json).then(function (z) { body.z = z; }, function () { body[key] = value; }) : Promise.resolve(body[key] = value);
      return packed.then(function () {
        if ((body.z || json).length >= BCAST_MAX) { bcastFail = Date.now(); return; }
        return rt().send(kind, body).then(function (r) { if (r === 'closed' || r === 'error') bcastFail = Date.now(); });
      });
    };
    sendQ = sendQ.then(job, job);
  }
  // Promise of the field key of a message received, compressed or not.
  function unpack(m, key) { return typeof m.z === 'string' ? unzip(m.z).then(JSON.parse) : Promise.resolve(m[key]); }
  function inOrder(fn) { recvQ = recvQ.then(fn).catch(function (e) { console.warn('Hounds: mensagem da Mesa ignorada.', e); }); }

  function loaded() { return listeners.length > 0; }
  function shown() { return loaded() && location.hash === '#mesa'; }
  function push(obj) { var msg = JSON.stringify(obj); listeners.slice().forEach(function (fn) { try { fn(msg); } catch (e) {} }); }
  function pushState() { push(Object.assign({ type: 'SYNC_FULL', clientId: 'hub', timestamp: Date.now() }, state)); }
  // With edits of this browser not saved yet, the Mesa answers with its merged state (see publish).
  // asked: when it was asked; mergedRevs: the revisions received meanwhile, which the answer covers.
  var asked = 0, mergedRevs = [], lastSentRev = null;
  function askIfPending() {
    if (!pending && !writing) return;
    clearTimeout(askTimer); askTimer = setTimeout(function () { asked = Date.now(); push({ type: 'REQUEST_SYNC', clientId: 'hub', timestamp: Date.now() }); }, 150);
  }
  // The hidden Mesa: one push of the state kept here, at most once a second (at once when it shows).
  function pushHidden() { if (!hiddenTimer) hiddenTimer = setTimeout(flushHidden, 1000); }
  function flushHidden() {
    clearTimeout(hiddenTimer); hiddenTimer = 0;
    if (!state || !loaded()) return;
    pushState(); askIfPending();
  }
  window.addEventListener('hashchange', function () { if (hiddenTimer && location.hash === '#mesa') flushHidden(); });
  // Someone else's state: into the Mesa (open or hidden), or loaded fresh when it opens. The state
  // kept here merges it, as the Mesa does: a state that arrives late doesn't undo newer changes.
  function applyRemote(rev, st) {
    remember(rev); loadedRev = rev;
    if (pending || writing) mergedRevs = mergedRevs.concat([rev]).slice(-50);
    var open = shown();
    if (open) push(Object.assign({ type: 'SYNC_FULL', clientId: 'hub', timestamp: Date.now() }, st));
    state = mergeState(state, st);
    if (open) askIfPending();
    else if (loaded()) pushHidden();
    else if (window.hubMesaStale) window.hubMesaStale();
  }
  /* The Mesa's merge (Xr and l4 in mesa.html), for the state kept here: a character (saved player or
     NPC) replaces the copy here unless that one is newer; a combat takes the fields received and
     merges its NPCs the same way; deleted combats go. */
  function mergeList(a, b) {
    var out = (a || []).slice(), at = {};
    out.forEach(function (x, i) { at[x.id] = i; });
    (b || []).forEach(function (x) {
      var i = at[x.id];
      if (i == null) { at[x.id] = out.length; out.push(x); }
      else if ((x.updatedAt || 0) >= (out[i].updatedAt || 0)) out[i] = x;
    });
    return out;
  }
  function mergeState(base, inc) {
    if (!base) return inc;
    var del = (base.deletedCombatIds || []).concat(inc.deletedCombatIds || []).filter(function (x, i, a) { return a.indexOf(x) === i; });
    var combats = (base.combats || []).slice(), at = {};
    combats.forEach(function (c, i) { at[c.id] = i; });
    (inc.combats || []).forEach(function (c) {
      var i = at[c.id];
      if (i == null) { at[c.id] = combats.length; combats.push(c); }
      else combats[i] = Object.assign({}, combats[i], c, { npcs: mergeList(combats[i].npcs, c.npcs) });
    });
    return {
      combats: combats.filter(function (c) { return del.indexOf(c.id) < 0; }),
      conditions: inc.conditions && inc.conditions.length ? inc.conditions : base.conditions,
      players: mergeList(base.players, inc.players),
      activeCombatId: inc.activeCombatId || base.activeCombatId,
      deletedCombatIds: del,
      editors: inc.editors || base.editors
    };
  }
  // One character in a copy of the state (a saved player and/or an NPC of a combat). Someone else's
  // only replaces a copy not newer than it, as the Mesa does; this browser's own always does.
  function withNpc(st, npc, own) {
    var put = function (x) { return x.id === npc.id && (own || (npc.updatedAt || 0) >= (x.updatedAt || 0)) ? Object.assign({}, x, npc) : x; };
    return Object.assign({}, st, {
      players: (st.players || []).map(put),
      combats: (st.combats || []).map(function (cb) { return Object.assign({}, cb, { npcs: (cb.npcs || []).map(put) }); })
    });
  }
  function onHead(rows) {
    var h0 = rows.filter(function (r) { return r.id === 'state'; })[0] || null;
    var first = !gotHead; gotHead = true;
    head = h0;
    if (!h0) { if (first) readyRes(); return; }
    // A head that covers only revisions received here (an answer to REQUEST_SYNC) needs no download either.
    var covered = !first && Array.isArray(h0.covers) && h0.covers.length > 0 && h0.covers.every(function (r) { return known[r]; });
    if (h0.rev === loadedRev || known[h0.rev] || covered) { remember(h0.rev); loadedRev = h0.rev; if (first) readyRes(); return; }
    var rev = h0.rev;
    fetchRev(h0).then(function (st) {
      if (!st || known[rev]) { if (first) readyRes(); return; }
      if (first) { remember(rev); loadedRev = rev; state = st; readyRes(); return; }
      applyRemote(rev, st);
    }, function () { if (first) readyRes(); });
  }
  function onBroadcast(m) {
    if (!m || !m.rev || !(m.state || m.z) || known[m.rev]) return;
    var rev = m.rev;
    remember(rev); // its head, from the database, needs no download
    inOrder(function () {
      return unpack(m, 'state').then(function (st) { if (st) applyRemote(rev, st); }, function (e) { delete known[rev]; throw e; });
    });
  }
  function onNpc(m) {
    if (!m || !(m.npc || m.z)) return;
    inOrder(function () {
      return unpack(m, 'npc').then(function (npc) {
        if (!npc || !npc.id) return;
        if (state) state = withNpc(state, npc, false);
        if (shown()) push({ type: 'SYNC_NPC', clientId: 'hub', timestamp: m.ts || Date.now(), npc: npc });
        else if (loaded()) pushHidden();
      });
    });
  }
  function canSave() {
    var u = window.hubUser; if (!u || !W.store || !canWrite()) return false;
    if (u.role === 'mestre') return true;
    // Jogador por padrão tem permissão de espectador (somente leitura)
    // Só pode salvar no banco se tiver recebido permissão de edição do Mestre
    try {
      var uid = String(u.id || '').toLowerCase().trim();
      var unm = String(u.name || '').toLowerCase().trim();
      var uidC = uid.replace(/^user-/, '');
      var unmC = unm.replace(/^user-/, '');
      var matchUser = function (x) {
        if (!x) return false;
        var s = String(x).toLowerCase().trim();
        var sC = s.replace(/^user-/, '');
        return s === uid || s === unm || sC === uidC || sC === unmC || s === 'user-' + unmC || uid === 'user-' + sC;
      };
      // Only the Mestre's list (the one the Permissões dialog shows). The editorUserIds each
      // combat still carries are old copies, left behind by "Bloquear Todos" in another combat.
      var editors = JSON.parse(localStorage.getItem(MESA_LS.editors) || '[]');
      if (Array.isArray(editors) && editors.some(matchUser)) return true;
    } catch (e) {}
    return false;
  }
  function save(p) {
    if (!canSave()) return Promise.resolve();
    // The embedded images go to the image storage first; the state saved carries their addresses.
    // p.imgs false: publish() saw no embedded image, and p.json is the state's JSON already.
    if (p.imgs === false) return write(p.st, p.rev, p.json, p.covers);
    return hostImgs(p.st).then(function () { return write(swapImgs(p.st), p.rev, null, p.covers); });
  }
  function write(st, rev, json, covers) {
    json = json || JSON.stringify(st);
    var prev = head && head.n > 0 ? head.rev : null, t = now(), size = W.store.chunkSize || CH;
    var meta = { rev: rev, by: (window.hubUser && window.hubUser.id) || null, createdAt: (head && head.createdAt) || t, updatedAt: t };
    if (covers && covers.length) meta.covers = covers;
    var w;
    if (json.length <= (W.store.inlineMax || 0)) {
      w = W.store.put('mesa', 'state', Object.assign({ n: 0 }, meta, st));
    } else {
      var parts = [];
      for (var i = 0; i < json.length; i += size) parts.push(json.slice(i, i + size));
      w = Promise.resolve();
      // The id ends in the time of the save (see cleanChunks); the pieces are read by their rev field.
      parts.forEach(function (part, i) { w = w.then(function () { return W.store.put('mesa_chunks', rev + '_' + i + (W.store.ids ? '_' + Date.now() : ''), { rev: rev, i: i, part: part, createdAt: t }); }); });
      w = w.then(function () { return W.store.put('mesa', 'state', Object.assign({ n: parts.length }, meta)); });
    }
    return w.then(function () {
      loadedRev = rev; if (!state) state = st;
      if (W.store.ids) cleanChunks(rev);
      else if (prev && prev !== rev) W.store.query('mesa_chunks', 'rev', prev).then(function (old) { old.forEach(function (o) { W.store.remove('mesa_chunks', o.id).catch(function () {}); }); }).catch(function () {});
    });
  }
  /* Pieces of old revisions, with a store that lists ids alone (Supabase). Several browsers save, so
     the pieces of the previous head are not the only old ones. Kept: the revision just saved and any
     piece saved less than 20 s ago (another browser's save whose head may still be on the way). The
     time is at the end of the id (rev_i_time; older pieces, rev_i, have the time of the revision,
     from newRev). At most once every 10 s. */
  var lastClean = 0;
  function cleanChunks(rev) {
    if (Date.now() - lastClean < 10000) return;
    lastClean = Date.now();
    W.store.ids('mesa_chunks').then(function (ids) {
      var limit = Date.now() - 20000, old = ids.filter(function (id) {
        if (id.indexOf(rev + '_') === 0) return false;
        var m = /_\d+_(\d{12,})$/.exec(id) || /-(\d{12,})-\d+_\d+$/.exec(id);
        return !m || Number(m[1]) < limit;
      });
      if (old.length) return W.store.removeMany('mesa_chunks', old);
    }).catch(function () {});
  }
  function delay() { return (W.store && W.store.saveDelay) || 1200; }
  function flush() {
    timer = null;
    if (writing || !pending) { if (pending && !timer) timer = setTimeout(flush, delay()); return; }
    var p = pending; pending = null; writing = true;
    save(p).catch(function (er) { toast('Não foi possível salvar a Mesa: ' + errorText(er), true); }).then(function () { writing = false; if (pending && !timer) timer = setTimeout(flush, delay()); });
  }
  return {
    start: function () {
      W.store.watch('mesa', onHead, function () { if (!gotHead) { gotHead = true; readyRes(); } });
      if (rt()) {
        rt().on('mesa', onBroadcast);
        rt().on('mesa-npc', onNpc);
        rt().on('mesa-editors', function (m) {
          if (m && Array.isArray(m.editorUserIds)) {
            try { localStorage.setItem('gurps_combat_master_editors_v1', JSON.stringify(m.editorUserIds)); } catch (e) {}
            if (state) state = Object.assign({}, state, { editors: m.editorUserIds }); // a later push of the state carries them
            if (loaded()) push({ type: 'SYNC_EDITORS', editorUserIds: m.editorUserIds, timestamp: m.ts || Date.now() });
          }
        });
      }
    },
    // Runs before the Mesa iframe loads: put the saved state where the Mesa reads it.
    prepare: function () {
      var to = new Promise(function (r) { setTimeout(r, 5000); });
      return Promise.race([ready, to]).then(function () {
        if (state) { toLocal(state); return; }
        if (head) return;
        var loc = localState();
        if (loc && window.hubUser && window.hubUser.role === 'mestre') return save({ st: loc, rev: newRev() }).catch(function () {});
      });
    },
    publish: function (str) {
      // The copy of a state the Mesa sent through its sync client: the same text plus clientId at the end.
      var viaClient = false;
      if (str.lastIndexOf('{"type":"SYNC_FULL"', 0) === 0) {
        var raw = str.replace(/,"clientId":"[^"]*"\}$/, '}');
        if (raw === lastRaw) return;
        lastRaw = raw; viaClient = raw !== str;
      }
      var m; try { m = JSON.parse(str); } catch (e) { return; }
      if (!m) return;
      // Without embedded images there is nothing to send to the image storage nor to swap.
      var imgs = str.indexOf('data:image/') >= 0;
      if (m.type === 'SYNC_EDITORS' && Array.isArray(m.editorUserIds)) {
        try { localStorage.setItem('gurps_combat_master_editors_v1', JSON.stringify(m.editorUserIds)); } catch (e) {}
        if (rt() && canSave()) rt().send('mesa-editors', { editorUserIds: m.editorUserIds, ts: Date.now() });
        var curSt = state || localState() || {};
        curSt.editors = m.editorUserIds;
        var r0 = newRev();
        pending = { st: curSt, rev: r0 };
        if (!timer) timer = setTimeout(flush, delay());
        return;
      }
      // One character changed: straight to the other browsers (the full state follows).
      if (m.type === 'SYNC_NPC') {
        if (!m.npc || !m.npc.id || !canSave()) return;
        // The Mesa sends each one twice, with the same timestamp: the copy is skipped.
        if (m.timestamp != null) {
          var nk = m.npc.id + '|' + m.timestamp;
          if (npcSeen[nk]) return;
          npcSeen[nk] = 1; npcSeenList.push(nk);
          if (npcSeenList.length > 100) delete npcSeen[npcSeenList.shift()];
        }
        var npcObj = imgs ? swapImgs(m.npc) : m.npc;
        if (imgs) hostImgs(m.npc);
        send('mesa-npc', 'npc', npcObj, JSON.stringify(npcObj), { ts: m.timestamp });
        var curSt = state || localState();
        if (curSt) {
          state = withNpc(curSt, npcObj, true);
          pending = { st: state, rev: newRev() };
          if (!timer) timer = setTimeout(flush, delay());
        }
        return;
      }
      if (m.type !== 'SYNC_FULL') return;
      // The Mesa's answer to REQUEST_SYNC has no deletedCombatIds: keep the ones known.
      var del = (m.deletedCombatIds || []).concat((state && state.deletedCombatIds) || []).filter(function (x, i, a) { return a.indexOf(x) === i; });
      var eds = Array.isArray(m.editors) ? m.editors : (Array.isArray(m.editorUserIds) ? m.editorUserIds : (state && state.editors));
      if (!eds) {
        try { eds = JSON.parse(localStorage.getItem('gurps_combat_master_editors_v1') || '[]'); } catch (e) {}
      }
      var st = { combats: ensureSemCombateFirst(m.combats), conditions: m.conditions, players: m.players, activeCombatId: m.activeCombatId || null, deletedCombatIds: del, editors: eds || [] };
      if (imgs) st = swapImgs(st);
      var json = JSON.stringify(st);
      if (json === lastJson) return;
      lastJson = json;
      var rev = newRev();
      state = st; // the newest state here: a push to the hidden Mesa and the next merges start from it
      /* The Mesa's answer to REQUEST_SYNC (it comes only through its sync client): the states received
         merged with this browser's edits, all of which went by broadcast already. Sending it again
         would make every browser with a save on the way ask its Mesa in turn; it is only saved, and
         its head lists the revisions it covers (see onHead). Not after a message that didn't go. */
      var answer = viaClient && asked && Date.now() - asked < 3000 && Date.now() - bcastFail > 10000;
      var covers = null;
      if (answer) { asked = 0; covers = mergedRevs.concat(lastSentRev ? [lastSentRev] : []); mergedRevs = []; }
      else { send('mesa', 'state', st, json, { rev: rev }); lastSentRev = rev; }
      if (imgs) hostImgs(st); // new images start going now; the save waits for them
      pending = { st: st, rev: rev, imgs: imgs, json: imgs ? null : json, covers: covers };
      if (!timer) timer = setTimeout(flush, delay());
    },
    // Save now (used by the Mesa's "Sair" button) and confirm to the person.
    flushNow: function () {
      if (timer) { clearTimeout(timer); timer = null; }
      var wait = function () { return writing ? new Promise(function (r) { setTimeout(r, 100); }).then(wait) : Promise.resolve(); };
      return wait().then(function () {
        if (!pending) return 'none';
        if (!canSave()) { pending = null; return 'skip'; }
        var p = pending; pending = null; writing = true;
        return save(p).then(function () { writing = false; return 'saved'; }, function (er) { writing = false; throw er; });
      }).then(function (r) { if (r !== 'skip') toast('Combate salvo.'); }, function (er) { toast('Não foi possível salvar a Mesa: ' + errorText(er), true); });
    },
    subscribe: function (fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (x) { return x !== fn; }); }; }
  };
})();
window.hubMesaBus = { publish: MesaSync.publish, subscribe: MesaSync.subscribe };
window.hubMesaPrepare = function () { return MesaSync.prepare(); };
// The Mesa's exit button: save, then go to the home page.
window.hubMesaFlush = function () { var saved = MesaSync.flushNow(); go('#inicio'); return saved; };
window.addEventListener('beforeunload', function () { });
