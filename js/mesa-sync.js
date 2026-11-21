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
var MESA_LS = { combats: 'gurps_combat_master_data_v2', conditions: 'gurps_combat_master_conditions_v2', players: 'gurps_fixed_personagens_v1', activeCombatId: 'gurps_combat_master_active_combat_id_v1', deletedCombatIds: 'gurps_combat_master_deleted_v1', editors: 'gurps_combat_master_editors_v1', sessionPlayerIds: 'gurps_mesa_visible_players_v1' };
var MesaSync = (function () {
  var CH = 60000, head = null, loadedRev = null, state = null, listeners = [], timer = null, pending = null, writing = false;
  var readyRes, ready = new Promise(function (r) { readyRes = r; }), gotHead = false, hydrated = false, preHydrationEdits = null;
  var lastJson = null, lastRaw = null, askTimer = null, hiddenTimer = 0, hiddenDirty = false, hiddenQueue = [];
  var cid = 'hub-' + uid(), seq = 0, known = {}, knownList = [], npcSeen = {}, npcSeenList = [];
  var combatsArchive = {}, archivePending = false, lastArchiveJson = '';
  function needsArchiveRestore(c) { return !c || !Array.isArray(c.npcs) || c.npcsArchived === true; }
  function recordCombatArchive(c, activeId) {
    if (!c || !c.id || c.id === 'combat-vazio') return;
    if (Array.isArray(c.npcs) && c.npcs.length > 0) {
      combatsArchive[c.id] = { npcs: c.npcs, events: c.events || [] };
    } else if (c.id === activeId && Array.isArray(c.npcs) && c.npcs.length === 0 && !c.npcsArchived) {
      combatsArchive[c.id] = { npcs: [], events: c.events || [] };
    }
  }
  // Revisions this browser wrote or already applied: their echoes are skipped.
  function remember(rev) { if (!rev || known[rev]) return; known[rev] = 1; knownList.push(rev); if (knownList.length > 400) delete known[knownList.shift()]; }
  function newRev() { var r = cid + '-' + Date.now() + '-' + (++seq); remember(r); return r; }
  function rt() { return W.store && W.store.realtime; }
  function localState() {
    var out = {}, any = false;
    Object.keys(MESA_LS).forEach(function (k) { try { var v = JSON.parse(localStorage.getItem(MESA_LS[k]) || 'null'); if (v != null) { out[k] = v; any = true; } } catch (e) {} });
    return any ? out : null;
  }
  function isSemCombate(c) {
    if (!c) return false;
    var nm = String(c.name || '').toLowerCase().trim();
    return c.id === 'combat-vazio' || nm.indexOf('vazio') !== -1 || nm === 'sem combate';
  }
  function ensureSemCombateFirst(combats) {
    if (!Array.isArray(combats)) return [];
    if (combats.length === 0) return combats;
    var empty = null, others = [];
    for (var i = 0; i < combats.length; i++) {
      var c = combats[i];
      if (!c) continue;
      if (isSemCombate(c)) {
        if (!empty) empty = Object.assign({}, c, { id: 'combat-vazio', name: 'Sem combate', npcs: [] });
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
    if (Array.isArray(st.players)) st.players = st.players.filter(function (p) { return p && p.characterType !== 'npc'; });
    Object.keys(MESA_LS).forEach(function (k) { if (st[k] != null) { try { localStorage.setItem(MESA_LS[k], JSON.stringify(st[k])); } catch (e) {} } });
  }
  function fetchRev(h) {
    // A head written with the state inline (no pieces) is read as is.
    if (Array.isArray(h.combats)) return Promise.resolve({ combats: h.combats, conditions: h.conditions, players: h.players, activeCombatId: h.activeCombatId || null, deletedCombatIds: h.deletedCombatIds, editors: h.editors || null, sessionPlayerIds: h.sessionPlayerIds || null });
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
  function isHttpUrl(u) { return typeof u === 'string' && /^https?:\/\//.test(u); }
  function dataImgExt(dataUrl) {
    var m = /^data:image\/([a-z0-9.+-]+);base64,/i.exec(dataUrl || '');
    if (!m) return '';
    var t = m[1].toLowerCase();
    if (t === 'jpeg' || t === 'jpg') return '.jpg';
    if (t === 'png') return '.png';
    if (t === 'webp') return '.webp';
    if (t === 'gif') return '.gif';
    return '';
  }
  function isImageReferenced(refOrUrl) {
    if (!refOrUrl) return false;
    var needle = String(refOrUrl);
    var check = function (v) {
      if (typeof v === 'string') return v.indexOf(needle) >= 0;
      if (Array.isArray(v)) {
        for (var i = 0; i < v.length; i++) if (check(v[i])) return true;
        return false;
      }
      if (v && typeof v === 'object') {
        var ks = Object.keys(v);
        for (var j = 0; j < ks.length; j++) if (check(v[ks[j]])) return true;
      }
      return false;
    };
    return (state && check(state)) || check(combatsArchive);
  }
  // A copy of v with each embedded image that already has a confirmed Storage URL replaced by it (idempotent).
  function swapImgs(v) {
    if (hasImg(v)) {
      return v.replace(DATA_IMG, function (m) {
        if (m.length <= 200) return m;
        var u = imgUrls[imgKey(m)];
        return isHttpUrl(u) ? u : m;
      });
    }
    if (Array.isArray(v)) return v.map(swapImgs);
    if (v && typeof v === 'object') { var o = {}; Object.keys(v).forEach(function (k) { o[k] = swapImgs(v[k]); }); return o; }
    return v;
  }
  function hostImg(dataUrl, key) {
    var k = key || imgKey(dataUrl);
    var stableRef = 'mesa_' + k + dataImgExt(dataUrl);
    var checkExisting = (W.store && typeof W.store.imageUrl === 'function')
      ? W.store.imageUrl(stableRef).then(function (candidate) {
          if (!isHttpUrl(candidate)) return null;
          var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
          var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 5000);
          var headReq = fetch(candidate, ctrl ? { method: 'HEAD', signal: ctrl.signal } : { method: 'HEAD' });
          var headWithTimeout = ctrl
            ? headReq
            : Promise.race([headReq, new Promise(function (resolve) { setTimeout(function () { resolve(null); }, 5000); })]);
          return headWithTimeout.then(function (res) {
            clearTimeout(timer);
            return (res && res.ok === true) ? candidate : null;
          }, function () {
            clearTimeout(timer);
            return null;
          });
        }, function () { return null; })
      : Promise.resolve(null);
    return checkExisting.then(function (existingUrl) {
      if (isHttpUrl(existingUrl)) return existingUrl;
      return fetch(dataUrl).then(function (r) { return r.blob(); }).then(function (b) {
        return W.store.upload(b, { ref: stableRef });
      }).then(function (up) {
        if (!up || !up.ref) return null;
        return W.store.imageUrl(up.ref).then(function (u) {
          if (isHttpUrl(u)) return u;
          if (W.store && typeof W.store.dropImage === 'function' && !isImageReferenced(up.ref)) {
            W.store.dropImage(up.ref);
          }
          return null;
        });
      });
    });
  }
  // Sends the images of st that have no confirmed address yet; resolves when they are done. A failed upload
  // leaves that image as text; it is tried again on a save at least 60 s later.
  function hostImgs(st) {
    if (!W.store || !W.store.canUpload || !canSave()) return Promise.resolve();
    var found = findImgs(st, {});
    return Promise.all(Object.keys(found).filter(function (k) { return !isHttpUrl(imgUrls[k]) && !(Date.now() - (imgFailed[k] || 0) < 60000); }).map(function (k) {
      return imgJobs[k] || (imgJobs[k] = hostImg(found[k], k).then(function (u) {
        if (isHttpUrl(u)) {
          imgUrls[k] = u;
          delete imgFailed[k];
          try { var keep = {}; Object.keys(imgUrls).filter(function (x) { return isHttpUrl(imgUrls[x]); }).slice(-200).forEach(function (x) { keep[x] = imgUrls[x]; }); localStorage.setItem(IMG_KEY, JSON.stringify(keep)); } catch (e) {}
        } else {
          imgFailed[k] = Date.now();
        }
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

  function isMesaRoute() {
    var h = (typeof location !== 'undefined' && location.hash) || '';
    return h === '#mesa' || h.indexOf('#mesa/') === 0 || h.indexOf('#mesa?') === 0;
  }
  function isTabVisible() {
    return typeof document === 'undefined' || document.visibilityState === 'visible';
  }
  function loaded() { return listeners.length > 0; }
  function shown() { return loaded() && isMesaRoute() && isTabVisible(); }
  function push(obj) { var msg = JSON.stringify(obj); listeners.slice().forEach(function (fn) { try { fn(msg); } catch (e) {} }); }
  function pushState() { push(Object.assign({ type: 'SYNC_FULL', clientId: 'hub', timestamp: Date.now() }, state)); }
  function hiddenEventKey(obj) {
    if (!obj || !obj.type) return '';
    return obj.type + '|' + (obj.entryId || obj.combatId || obj.activeCombatId || (obj.rollData && obj.rollData.id) || '') + '|' + (obj.timestamp || '');
  }
  function pushOrQueue(obj) {
    if (!loaded()) return;
    if (shown()) { push(obj); return; }
    var k = hiddenEventKey(obj);
    if (!k || !hiddenQueue.some(function (x) { return hiddenEventKey(x) === k; })) {
      hiddenQueue.push(obj);
      if (hiddenQueue.length > 100) hiddenQueue.shift();
    }
    pushHidden();
  }
  // With edits of this browser not saved yet, the Mesa answers with its merged state (see publish).
  // asked: when it was asked; mergedRevs: the revisions received meanwhile, which the answer covers.
  var asked = 0, mergedRevs = [], lastSentRev = null;
  function askIfPending() {
    if (!pending && !writing) return;
    clearTimeout(askTimer); askTimer = setTimeout(function () { asked = Date.now(); push({ type: 'REQUEST_SYNC', clientId: 'hub', timestamp: Date.now() }); }, 150);
  }
  // The hidden Mesa: accumulates updates while hidden/off-#mesa and flushes once when visible on #mesa.
  function pushHidden() {
    hiddenDirty = true;
    if (shown() && !hiddenTimer) hiddenTimer = setTimeout(flushHidden, 1000);
  }
  function flushHidden() {
    if (hiddenTimer) { clearTimeout(hiddenTimer); hiddenTimer = 0; }
    if (!loaded() || !shown()) return;
    var hadDirty = hiddenDirty;
    hiddenDirty = false;
    var queued = hiddenQueue.length ? hiddenQueue.splice(0, hiddenQueue.length) : [];
    if (hadDirty && state) {
      pushState();
      askIfPending();
    }
    queued.forEach(function (evt) { push(evt); });
  }
  var onResumePresence = null;
  function handleVisibilityOrRouteResume() {
    if (shown() && (hiddenDirty || hiddenQueue.length > 0)) flushHidden();
    if (isMesaRoute() && isTabVisible() && typeof onResumePresence === 'function') onResumePresence();
  }
  window.addEventListener('hashchange', handleVisibilityOrRouteResume);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') handleVisibilityOrRouteResume();
  });
  // Someone else's state: into the Mesa (open or hidden), or loaded fresh when it opens. The state
  // kept here merges it, as the Mesa does: a state that arrives late doesn't undo newer changes.
  function applyRemote(rev, st) {
    remember(rev); loadedRev = rev;
    if (pending || writing) mergedRevs = mergedRevs.concat([rev]).slice(-50);
    try { toLocal(st); } catch (e) {}
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
      if (i == null) {
        at[c.id] = combats.length;
        combats.push(isSemCombate(c) ? Object.assign({}, c, { npcs: [] }) : c);
      } else {
        var isEmpty = isSemCombate(combats[i]) || isSemCombate(c);
        var baseNpcs = Array.isArray(combats[i].npcs) ? combats[i].npcs : [];
        var mergedNpcs;
        if (isEmpty) {
          mergedNpcs = [];
        } else if (needsArchiveRestore(c)) {
          mergedNpcs = baseNpcs;
        } else if (c.npcs.length === 0) {
          mergedNpcs = [];
        } else {
          mergedNpcs = mergeList(baseNpcs, c.npcs);
        }
        combats[i] = Object.assign({}, combats[i], c, {
          npcs: mergedNpcs,
          npcsArchived: isEmpty ? false : (c.npcsArchived === true && mergedNpcs.length === 0)
        });
      }
    });
    return {
      combats: combats.filter(function (c) { return del.indexOf(c.id) < 0; }),
      conditions: inc.conditions && inc.conditions.length ? inc.conditions : base.conditions,
      players: mergeList(base.players, inc.players).filter(function (p) { return p && p.characterType !== 'npc'; }),
      activeCombatId: inc.activeCombatId !== undefined ? inc.activeCombatId : base.activeCombatId,
      deletedCombatIds: del,
      editors: inc.editors || base.editors,
      sessionPlayerIds: inc.sessionPlayerIds !== undefined ? inc.sessionPlayerIds : (base ? base.sessionPlayerIds : undefined)
    };
  }
  // One character in a copy of the state (a saved player and/or an NPC of a combat). Someone else's
  // only replaces a copy not newer than it, as the Mesa does; this browser's own always does.
  function withNpc(st, npc, own) {
    var put = function (x) { return x.id === npc.id && (own || (npc.updatedAt || 0) >= (x.updatedAt || 0)) ? Object.assign({}, x, npc) : x; };
    return Object.assign({}, st, {
      players: (st.players || []).map(put).filter(function (p) { return p && p.characterType !== 'npc'; }),
      combats: (st.combats || []).map(function (cb) { return Object.assign({}, cb, { npcs: isSemCombate(cb) ? [] : (cb.npcs || []).map(put) }); })
    });
  }
  function onHead(rows) {
    var h0 = rows.filter(function (r) { return r.id === 'state'; })[0] || null;
    var archRow = rows.filter(function (r) { return r.id === 'combats_archive'; })[0] || null;
    if (archRow && archRow.archive && typeof archRow.archive === 'object') {
      combatsArchive = Object.assign({}, archRow.archive, combatsArchive);
      try { lastArchiveJson = JSON.stringify(combatsArchive); } catch (e) {}
    }
    var first = !hydrated;
    head = h0;
    if (!h0) {
      hydrated = true;
      gotHead = true;
      if (preHydrationEdits) {
        state = mergeState(state, preHydrationEdits);
        preHydrationEdits = null;
        try { toLocal(state); } catch (e) {}
        if (canSave()) queueSave();
      }
      if (first) readyRes();
      return;
    }
    // A head that covers only revisions received here (an answer to REQUEST_SYNC) needs no download either.
    var covered = !first && Array.isArray(h0.covers) && h0.covers.length > 0 && h0.covers.every(function (r) { return known[r]; });
    if (h0.rev === loadedRev || known[h0.rev] || covered) {
      remember(h0.rev);
      loadedRev = h0.rev;
      hydrated = true;
      gotHead = true;
      if (first) readyRes();
      return;
    }
    var rev = h0.rev;
    fetchRev(h0).then(function (st) {
      if (!st || known[rev]) {
        if (!gotHead) { gotHead = true; readyRes(); }
        return;
      }
      var activeId = st.activeCombatId || (st.combats && st.combats[0] && st.combats[0].id) || 'combat-vazio';
      if (Array.isArray(st.combats)) {
        st.combats.forEach(function (c) { recordCombatArchive(c, activeId); });
      }
      if (activeId && activeId !== 'combat-vazio' && combatsArchive[activeId]) {
        st.combats = (st.combats || []).map(function (c) {
          if (c.id === activeId && needsArchiveRestore(c)) {
            return Object.assign({}, c, {
              npcs: combatsArchive[activeId].npcs || [],
              events: combatsArchive[activeId].events || c.events || [],
              npcsArchived: false
            });
          }
          return c;
        });
      }
      if (first) {
        var hadEmptyNpcs = Array.isArray(st.combats) && st.combats.some(function (c) { return isSemCombate(c) && Array.isArray(c.npcs) && c.npcs.length > 0; });
        var cleanedCombats = Array.isArray(st.combats) ? st.combats.map(function (c) { return isSemCombate(c) ? Object.assign({}, c, { npcs: [] }) : c; }) : st.combats;
        var cleanedPlayers = Array.isArray(st.players) ? st.players.filter(function (p) { return p && p.characterType !== 'npc'; }) : st.players;
        remember(rev);
        loadedRev = rev;
        hydrated = true;
        gotHead = true;
        var remoteState = Object.assign({}, st, { combats: cleanedCombats, players: cleanedPlayers });
        var hadPreHydration = !!preHydrationEdits;
        if (hadPreHydration) {
          state = mergeState(remoteState, preHydrationEdits);
          preHydrationEdits = null;
        } else {
          state = remoteState;
        }
        try { toLocal(state); } catch (e) {}
        readyRes();
        if (shown()) pushState();
        else if (loaded()) pushHidden();
        if ((hadEmptyNpcs || hadPreHydration) && canSave()) queueSave();
        return;
      }
      applyRemote(rev, st);
    }, function () { if (!gotHead) { gotHead = true; readyRes(); } });
  }
  function onBroadcast(m) {
    if (!m || !m.rev || !(m.state || m.z) || known[m.rev]) return;
    var rev = m.rev;
    remember(rev); // its head, from the database, needs no download
    inOrder(function () {
      return unpack(m, 'state').then(function (st) {
        if (!st) return;
        var activeId = st.activeCombatId || (st.combats && st.combats[0] && st.combats[0].id) || 'combat-vazio';
        if (Array.isArray(st.combats)) {
          st.combats.forEach(function (c) { recordCombatArchive(c, activeId); });
        }
        if (activeId && activeId !== 'combat-vazio' && combatsArchive[activeId]) {
          st.combats = (st.combats || []).map(function (c) {
            if (c.id === activeId && needsArchiveRestore(c)) {
              return Object.assign({}, c, {
                npcs: combatsArchive[activeId].npcs || [],
                events: combatsArchive[activeId].events || c.events || [],
                npcsArchived: false
              });
            }
            return c;
          });
        }
        applyRemote(rev, st);
      }, function (e) { delete known[rev]; throw e; });
    });
  }
  function onNpc(m) {
    if (!m || !(m.npc || m.z)) return;
    inOrder(function () {
      return unpack(m, 'npc').then(function (npc) {
        if (!npc || !npc.id) return;
        var curSt = state || localState();
        if (curSt) {
          state = withNpc(curSt, npc, false);
          try { toLocal(state); } catch (e) {}
        }
        Object.keys(combatsArchive).forEach(function (cbId) {
          if (combatsArchive[cbId] && Array.isArray(combatsArchive[cbId].npcs)) {
            var nIdx = combatsArchive[cbId].npcs.findIndex(function (n) { return n.id === npc.id; });
            if (nIdx >= 0) combatsArchive[cbId].npcs[nIdx] = Object.assign({}, combatsArchive[cbId].npcs[nIdx], npc);
          }
        });
        if (shown()) push({ type: 'SYNC_NPC', clientId: 'hub', timestamp: m.ts || Date.now(), npc: npc });
        else if (loaded()) pushHidden();
      });
    });
  }
  function getHubUser() {
    if (window.hubUser) return window.hubUser;
    try {
      if (window.parent && window.parent.hubUser) return window.parent.hubUser;
    } catch (e) {}
    try {
      var saved = localStorage.getItem('hounds_active_user');
      if (saved) {
        var parsed = JSON.parse(saved);
        if (parsed && (parsed.id || parsed.name)) {
          window.hubUser = parsed;
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  }
  function canSave() {
    var u = getHubUser();
    if (!u) return false;
    if (W.store && typeof W.store.canWrite === 'function' && !W.store.canWrite()) return false;
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
    if (!canSave() || !hydrated) return Promise.resolve();
    var needsArch = archivePending && W.store && W.store.put;
    var needImgUpload = p.imgs !== false || needsArch;
    var uploadStep = needImgUpload
      ? Promise.all([
          p.imgs === false ? Promise.resolve() : hostImgs(p.st),
          needsArch ? hostImgs(combatsArchive) : Promise.resolve()
        ])
      : Promise.resolve();
    return uploadStep.then(function () {
      var archStep = Promise.resolve();
      if (archivePending && W.store && W.store.put) {
        archivePending = false;
        combatsArchive = swapImgs(combatsArchive);
        try { lastArchiveJson = JSON.stringify(combatsArchive); } catch (e) {}
        archStep = W.store.put('mesa', 'combats_archive', { id: 'combats_archive', archive: combatsArchive, updatedAt: Date.now() }).catch(function () {});
      }
      return archStep.then(function () {
        if (p.imgs === false) return write(p.st, p.rev, p.json, p.covers);
        return write(swapImgs(p.st), p.rev, null, p.covers);
      });
    });
  }
  function write(st, rev, json, covers) {
    json = json || JSON.stringify(st);
    var prev = head && head.n > 0 ? head.rev : null, t = now(), size = W.store.chunkSize || CH;
    var u = getHubUser();
    var meta = { rev: rev, by: (u && u.id) || null, createdAt: (head && head.createdAt) || t, updatedAt: t };
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
  // Saves the state as it is here (after cleaning it on loading), in the next round of flush.
  function queueSave() {
    if (!state) return;
    pending = { st: state, rev: newRev() };
    if (!timer) timer = setTimeout(flush, delay());
  }
  function flush() {
    timer = null;
    if (!hydrated) return;
    if (writing || !pending) { if (pending && !timer) timer = setTimeout(flush, delay()); return; }
    var p = pending; pending = null; writing = true;
    save(p).catch(function (er) { toast('Não foi possível salvar a Mesa: ' + errorText(er), true); }).then(function () {
      writing = false;
      if (pending && !timer) timer = setTimeout(flush, hurry ? 0 : delay());
      hurry = false;
    });
  }
  // A save waiting for its time goes now when the tab is hidden or closed: the timer dies with the
  // page (the others already have the change by broadcast, but the database would miss it).
  var hurry = false;
  function flushPending() {
    if (!pending || !hydrated) return;
    if (timer) { clearTimeout(timer); timer = null; }
    if (writing) { hurry = true; return; } // goes as soon as the write on the way ends
    flush();
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
            pushOrQueue({ type: 'SYNC_EDITORS', editorUserIds: m.editorUserIds, timestamp: m.ts || Date.now() });
          }
        });
        rt().on('mesa-dice', function (m) {
          if (m && m.rollData) {
            pushOrQueue({ type: 'SYNC_DICE_ROLL', rollData: m.rollData, logEntry: m.logEntry, timestamp: m.ts || Date.now() });
          }
        });
        rt().on('mesa-round', function (m) {
          if (m && m.combatId) {
            if (state && Array.isArray(state.combats)) {
              var rVal = m.currentRound != null ? m.currentRound : m.round;
              state.combats = state.combats.map(function (c) {
                return c.id === m.combatId ? Object.assign({}, c, { round: rVal, currentRound: rVal }) : c;
              });
            }
            pushOrQueue({ type: 'SYNC_ROUND', combatId: m.combatId, round: m.round, currentRound: m.currentRound, timestamp: m.ts || Date.now() });
          }
        });
        rt().on('mesa-comment', function (m) {
          if (m && m.entryId) {
            pushOrQueue({ type: 'SYNC_ENTRY_COMMENT', entryId: m.entryId, npcId: m.npcId, comment: m.comment, timestamp: m.ts || Date.now() });
          }
        });
        rt().on('mesa-delete', function (m) {
          if (m && m.entryId) {
            pushOrQueue({ type: 'SYNC_ENTRY_DELETE', entryId: m.entryId, timestamp: m.ts || Date.now() });
          }
        });
        rt().on('mesa-restored', function (m) {
          if (m) pushOrQueue({ type: 'SYNC_SNAPSHOT_RESTORED', snapshotName: m.snapshotName, timestamp: m.ts || Date.now() });
        });
        rt().on('mesa-audio', function (m) {
          if (m && loaded()) push(m);
        });
        rt().on('mesa-active-combat', function (m) {
          if (m && m.activeCombatId !== undefined) {
            var newId = m.activeCombatId || '';
            var combatsToSend = m.combats;
            if (!combatsToSend || !Array.isArray(combatsToSend) || combatsToSend.length === 0) {
              combatsToSend = (state && state.combats) || (localState() && localState().combats) || [];
            }
            if (m.combats && Array.isArray(m.combats)) {
              m.combats.forEach(function (c) { recordCombatArchive(c, newId); });
            }
            if (m.activeCombat && m.activeCombat.id) {
              recordCombatArchive(m.activeCombat, newId);
              var exIdx = combatsToSend.findIndex(function (c) { return c.id === m.activeCombat.id; });
              if (exIdx >= 0) combatsToSend[exIdx] = Object.assign({}, combatsToSend[exIdx], m.activeCombat);
              else combatsToSend.push(m.activeCombat);
            }
            if (newId && combatsArchive[newId]) {
              combatsToSend = combatsToSend.map(function (c) {
                if (c.id === newId && needsArchiveRestore(c)) {
                  return Object.assign({}, c, {
                    npcs: combatsArchive[newId].npcs || [],
                    events: combatsArchive[newId].events || c.events || [],
                    npcsArchived: false
                  });
                }
                return c;
              });
            }
            try { localStorage.setItem(MESA_LS.activeCombatId, JSON.stringify(newId)); } catch (e) {}
            if (combatsToSend && combatsToSend.length > 0) {
              try { localStorage.setItem(MESA_LS.combats, JSON.stringify(combatsToSend)); } catch (e) {}
            }
            if (state) {
              state = Object.assign({}, state, { activeCombatId: newId });
              if (combatsToSend && combatsToSend.length > 0) {
                state.combats = combatsToSend;
              }
            }
            if (loaded()) {
              var actCombatObj = m.activeCombat || (combatsToSend || []).find(function (c) { return c.id === newId; }) || (newId && combatsArchive[newId] ? Object.assign({ id: newId }, combatsArchive[newId]) : null);
              if (shown()) {
                push({ type: 'SYNC_ACTIVE_COMBAT', activeCombatId: newId, activeCombat: actCombatObj, combats: combatsToSend, timestamp: m.ts || Date.now() });
                var fullSt = state || localState();
                if (fullSt) {
                  push(Object.assign({ type: 'SYNC_FULL', clientId: 'hub', timestamp: Date.now() }, fullSt));
                }
              } else {
                pushOrQueue({ type: 'SYNC_ACTIVE_COMBAT', activeCombatId: newId, activeCombat: actCombatObj, combats: combatsToSend, timestamp: m.ts || Date.now() });
              }
            }
          }
        });
        rt().on('mesa-snapshots', function (m) {
          if (m && Array.isArray(m.snapshots)) {
            try { localStorage.setItem('hounds_mesa_snapshots_v1', JSON.stringify(m.snapshots)); } catch (e) {}
            pushOrQueue({ type: 'SYNC_SNAPSHOTS_LIST', snapshots: m.snapshots, timestamp: m.ts || Date.now() });
          }
        });
        rt().on('mesa-presence', function (m) {
          if (m && m.userName) {
            window.hubOnlineUsers = window.hubOnlineUsers || {};
            window.hubOnlineUsers[String(m.userName).trim().toLowerCase()] = Date.now();
            if (shown()) push({ type: 'PRESENCE_PING', userName: m.userName, role: m.role, timestamp: m.ts || Date.now() });
          }
        });
        rt().on('mesa-ruler-preview', function (m) {
          if (m && m.preview && shown()) {
            push({ type: 'RULER_PREVIEW', preview: m.preview, clientId: m.clientId || m.preview.clientId, timestamp: m.ts || Date.now() });
          }
        });
        var lastPresenceSent = 0;
        var sendHubPresence = function () {
          if (!isTabVisible() || !isMesaRoute()) return;
          var nowTs = Date.now();
          if (nowTs - lastPresenceSent < 3000) return;
          lastPresenceSent = nowTs;
          var u = getHubUser();
          if (rt()) {
            var unm = (u && u.name) || 'Visitante-' + cid.slice(-4);
            rt().send('mesa-presence', { userName: unm, role: (u && u.role) || 'jogador', ts: nowTs });
          }
        };
        onResumePresence = sendHubPresence;
        setInterval(sendHubPresence, 8000);
        setTimeout(sendHubPresence, 1000);
      }
    },
    // Runs before the Mesa iframe loads: put the saved state where the Mesa reads it.
    // Never overwrites remote DB if initial Supabase hydration has not completed within 5 s.
    prepare: function () {
      var to = new Promise(function (r) { setTimeout(r, 5000); });
      return Promise.race([ready, to]).then(function () {
        if (state) { toLocal(state); return; }
        if (!hydrated || head) return;
        var loc = localState();
        var u = getHubUser();
        if (loc && u && u.role === 'mestre') return save({ st: loc, rev: newRev() }).catch(function () {});
      });
    },
    publish: function (str) {
      // The copy of a state the Mesa sent through its sync client: the same text plus clientId at the end.
      var viaClient = false;
      var rawSyncFull = null;
      if (str.lastIndexOf('{"type":"SYNC_FULL"', 0) === 0) {
        if (!canSave()) return;
        rawSyncFull = str.replace(/,"clientId":"[^"]*"\}$/, '}');
        if (rawSyncFull === lastRaw) return;
        viaClient = rawSyncFull !== str;
      }
      var m; try { m = JSON.parse(str); } catch (e) { return; }
      if (!m) return;
      // Without embedded images there is nothing to send to the image storage nor to swap.
      var imgs = str.indexOf('data:image/') >= 0;
      if (m.type === 'REQUEST_SYNC') {
        var curStReq = state || localState();
        if (curStReq) {
          var actIdReq = curStReq.activeCombatId;
          if (actIdReq && combatsArchive[actIdReq] && Array.isArray(curStReq.combats)) {
            curStReq.combats = curStReq.combats.map(function (c) {
              if (c.id === actIdReq && needsArchiveRestore(c)) {
                return Object.assign({}, c, { npcs: combatsArchive[actIdReq].npcs || [], events: combatsArchive[actIdReq].events || c.events || [], npcsArchived: false });
              }
              return c;
            });
          }
          push(Object.assign({ type: 'SYNC_FULL', clientId: 'hub', timestamp: Date.now() }, curStReq));
        }
        return;
      }
      if (m.type === 'SYNC_DICE_ROLL' && m.rollData) {
        if (rt()) rt().send('mesa-dice', { rollData: m.rollData, logEntry: m.logEntry, ts: m.timestamp || Date.now() });
        if (W.store && typeof W.store.saveRoll === 'function') {
          try { W.store.saveRoll(m.rollData, m.logEntry); } catch (e) {}
        }
        return;
      }
      if (m.type === 'PRESENCE_PING' && m.userName) {
        window.hubOnlineUsers = window.hubOnlineUsers || {};
        window.hubOnlineUsers[String(m.userName).trim().toLowerCase()] = Date.now();
        if (rt() && isTabVisible() && isMesaRoute()) rt().send('mesa-presence', { userName: m.userName, role: m.role || 'jogador', ts: m.timestamp || Date.now() });
        return;
      }
      if (m.type === 'RULER_PREVIEW' && m.preview) {
        if (rt()) rt().send('mesa-ruler-preview', { preview: m.preview, clientId: m.clientId || m.preview.clientId, ts: m.timestamp || Date.now() });
        return;
      }
      if (m.type === 'SYNC_ROUND' && m.combatId) {
        if (!canSave()) return;
        var curStR = state || localState();
        if (curStR && Array.isArray(curStR.combats)) {
          var rVal = m.currentRound != null ? m.currentRound : m.round;
          curStR = Object.assign({}, curStR, {
            combats: curStR.combats.map(function (c) {
              return c.id === m.combatId ? Object.assign({}, c, { round: rVal, currentRound: rVal }) : c;
            })
          });
          if (!hydrated) {
            preHydrationEdits = mergeState(preHydrationEdits, curStR);
            return;
          }
          if (rt()) rt().send('mesa-round', { combatId: m.combatId, round: m.round, currentRound: m.currentRound, ts: m.timestamp || Date.now() });
          state = curStR;
          pending = { st: state, rev: newRev() };
          if (!timer) timer = setTimeout(flush, delay());
        } else if (hydrated && rt()) {
          rt().send('mesa-round', { combatId: m.combatId, round: m.round, currentRound: m.currentRound, ts: m.timestamp || Date.now() });
        }
        return;
      }
      if (m.type === 'SYNC_ENTRY_COMMENT' && m.entryId) {
        if (rt()) rt().send('mesa-comment', { entryId: m.entryId, npcId: m.npcId, comment: m.comment, ts: m.timestamp || Date.now() });
        return;
      }
      if (m.type === 'SYNC_ENTRY_DELETE' && m.entryId) {
        if (!canSave()) return;
        if (rt()) rt().send('mesa-delete', { entryId: m.entryId, ts: m.timestamp || Date.now() });
        if (W.store && typeof W.store.deleteRoll === 'function') {
          try { W.store.deleteRoll(m.entryId); } catch (e) {}
        }
        return;
      }
      if (m.type === 'SYNC_SNAPSHOT_RESTORED') {
        if (rt() && canSave()) rt().send('mesa-restored', { snapshotName: m.snapshotName, ts: Date.now() });
        return;
      }
      if (m.type && (m.type.indexOf('AUDIO_STREAM_') === 0 || m.type.indexOf('RTC_') === 0)) {
        if (rt()) rt().send('mesa-audio', m);
        return;
      }
      if (m.type === 'SYNC_EDITORS' && Array.isArray(m.editorUserIds)) {
        if (!canSave()) return;
        try { localStorage.setItem('gurps_combat_master_editors_v1', JSON.stringify(m.editorUserIds)); } catch (e) {}
        var curStEd = Object.assign({}, state || localState() || {}, { editors: m.editorUserIds });
        if (!hydrated) {
          preHydrationEdits = mergeState(preHydrationEdits, curStEd);
          return;
        }
        if (rt()) rt().send('mesa-editors', { editorUserIds: m.editorUserIds, ts: Date.now() });
        state = curStEd;
        var r0 = newRev();
        pending = { st: curStEd, rev: r0 };
        if (!timer) timer = setTimeout(flush, delay());
        return;
      }
      if (m.type === 'SYNC_ACTIVE_COMBAT' && m.activeCombatId !== undefined) {
        if (!canSave()) return;
        var newId = m.activeCombatId || '';
        var cleanAcCombats = (m.combats && Array.isArray(m.combats)) ? (imgs ? swapImgs(m.combats) : m.combats) : null;
        try { localStorage.setItem(MESA_LS.activeCombatId, JSON.stringify(newId)); } catch (e) {}
        if (cleanAcCombats) {
          cleanAcCombats.forEach(function (c) { recordCombatArchive(c, newId); });
          try { localStorage.setItem(MESA_LS.combats, JSON.stringify(cleanAcCombats)); } catch (e) {}
        }
        var curStAc = Object.assign({}, state || localState() || {}, { activeCombatId: newId });
        if (cleanAcCombats) curStAc.combats = cleanAcCombats;
        if (!hydrated) {
          preHydrationEdits = mergeState(preHydrationEdits, curStAc);
          return;
        }
        state = curStAc;
        var rAc = newRev();
        if (rt()) {
          var actCb = (cleanAcCombats || []).find(function (c) { return c.id === newId; }) || (newId && combatsArchive[newId] ? Object.assign({ id: newId }, combatsArchive[newId]) : null);
          var actCbClean = actCb ? (imgs ? swapImgs(actCb) : actCb) : null;
          rt().send('mesa-active-combat', { activeCombatId: newId, activeCombat: actCbClean, ts: m.timestamp || Date.now() });
          send('mesa', 'state', state, JSON.stringify(state), { rev: rAc });
        }
        pending = { st: state, rev: rAc };
        if (!timer) timer = setTimeout(flush, delay());
        return;
      }
      if (m.type === 'SYNC_SNAPSHOTS_LIST' && Array.isArray(m.snapshots)) {
        if (!canSave()) return;
        try { localStorage.setItem('hounds_mesa_snapshots_v1', JSON.stringify(m.snapshots)); } catch (e) {}
        if (rt()) rt().send('mesa-snapshots', { snapshots: m.snapshots, ts: Date.now() });
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
        if (!hydrated) {
          var preBase = preHydrationEdits || state || localState();
          if (preBase) preHydrationEdits = withNpc(preBase, npcObj, true);
          return;
        }
        if (imgs) hostImgs(m.npc);
        send('mesa-npc', 'npc', npcObj, JSON.stringify(npcObj), { ts: m.timestamp });
        var curSt = state || localState();
        if (curSt) {
          state = withNpc(curSt, npcObj, true);
          pending = { st: state, rev: newRev() };
          if (!timer) timer = setTimeout(flush, delay());
        }
        Object.keys(combatsArchive).forEach(function (cbId) {
          if (combatsArchive[cbId] && Array.isArray(combatsArchive[cbId].npcs)) {
            var nIdx = combatsArchive[cbId].npcs.findIndex(function (n) { return n.id === npcObj.id; });
            if (nIdx >= 0) combatsArchive[cbId].npcs[nIdx] = Object.assign({}, combatsArchive[cbId].npcs[nIdx], npcObj);
          }
        });
        return;
      }
      if (m.type !== 'SYNC_FULL') return;
      if (!canSave()) return;
      if (rawSyncFull !== null) lastRaw = rawSyncFull;
      // The Mesa's answer to REQUEST_SYNC has no deletedCombatIds: keep the ones known.
      var del = (m.deletedCombatIds || []).concat((state && state.deletedCombatIds) || []).filter(function (x, i, a) { return a.indexOf(x) === i; });
      var eds = Array.isArray(m.editors) ? m.editors : (Array.isArray(m.editorUserIds) ? m.editorUserIds : (state && state.editors));
      if (!eds) {
        try { eds = JSON.parse(localStorage.getItem('gurps_combat_master_editors_v1') || '[]'); } catch (e) {}
      }

      var activeId = m.activeCombatId || null;
      // Executa swapImgs ANTES de copiar c.npcs e c.events para combatsArchive
      var cleanCombats = Array.isArray(m.combats) ? (imgs ? swapImgs(m.combats) : m.combats) : m.combats;

      // Arquivamento online de combates: preserva NPCs e eventos de todos os combates salvos (e limpa combate ativo esvaziado)
      if (Array.isArray(cleanCombats)) {
        cleanCombats.forEach(function (c) { recordCombatArchive(c, activeId); });
      }
      if (del.length > 0) {
        del.forEach(function (delId) {
          if (combatsArchive[delId]) {
            delete combatsArchive[delId];
          }
        });
      }
      // Serializa combatsArchive apenas UMA vez por SYNC_FULL
      var newArchJson = '';
      try { newArchJson = JSON.stringify(combatsArchive); } catch (e) {}
      if (newArchJson && newArchJson !== lastArchiveJson) {
        lastArchiveJson = newArchJson;
        archivePending = true;
      }

      var processedCombats = ensureSemCombateFirst(cleanCombats).map(function (c) {
        if (c.id === activeId) {
          var pooled = combatsArchive[c.id];
          var shouldRestore = needsArchiveRestore(c) && pooled;
          var npcs = shouldRestore ? (pooled.npcs || []) : (Array.isArray(c.npcs) ? c.npcs : []);
          var events = (Array.isArray(c.events) && c.events.length > 0) ? c.events : (shouldRestore ? (pooled.events || []) : (c.events || []));
          return Object.assign({}, c, { npcs: npcs, events: events, totalNpcs: npcs.length, npcsArchived: false });
        }
        var total = (Array.isArray(c.npcs) && c.npcs.length > 0) ? c.npcs.length : (combatsArchive[c.id] ? combatsArchive[c.id].npcs.length : (c.totalNpcs || 0));
        return Object.assign({}, c, { npcs: [], events: [], totalNpcs: total, npcsArchived: total > 0 });
      });

      var cleanPlayers = imgs ? swapImgs(m.players) : m.players;
      var cleanConditions = imgs ? swapImgs(m.conditions) : m.conditions;
      var st = { combats: processedCombats, conditions: cleanConditions, players: cleanPlayers, activeCombatId: activeId, deletedCombatIds: del, editors: eds || [], sessionPlayerIds: m.sessionPlayerIds || (state && state.sessionPlayerIds) || [] };
      var stHasImgs = imgs && Object.keys(findImgs(st, {})).length > 0;
      var json = JSON.stringify(st);
      if (json === lastJson) return;
      if (!hydrated) {
        preHydrationEdits = mergeState(preHydrationEdits, st);
        return;
      }
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
      if (stHasImgs) hostImgs(st); // new images start going now; the save waits for them
      pending = { st: st, rev: rev, imgs: stHasImgs, json: stHasImgs ? null : json, covers: covers };
      if (!timer) timer = setTimeout(flush, delay());
    },
    // Save now (used by the Mesa's "Sair" button) and confirm to the person.
    flushPending: flushPending,
    flushNow: function () {
      if (timer) { clearTimeout(timer); timer = null; }
      var wait = function () { return writing ? new Promise(function (r) { setTimeout(r, 100); }).then(wait) : Promise.resolve(); };
      return wait().then(function () {
        if (!pending) return 'none';
        if (!canSave()) { pending = null; return 'skip'; }
        if (!hydrated) return 'skip';
        var p = pending; pending = null; writing = true;
        return save(p).then(function () { writing = false; return 'saved'; }, function (er) { writing = false; throw er; });
      }).then(function (r) { if (r !== 'skip') toast('Combate salvo.'); }, function (er) { toast('Não foi possível salvar a Mesa: ' + errorText(er), true); });
    },
    push: push,
    subscribe: function (fn) {
      listeners.push(fn);
      var cur = state || localState();
      if (cur) {
        setTimeout(function () {
          try {
            fn(JSON.stringify(Object.assign({ type: 'SYNC_FULL', clientId: 'hub', timestamp: Date.now() }, cur)));
          } catch (e) {}
        }, 0);
      }
      return function () { listeners = listeners.filter(function (x) { return x !== fn; }); };
    }
  };
})();
window.hubMesaBus = {
  publish: MesaSync.publish,
  subscribe: MesaSync.subscribe,
  wake: function () {
    if (W.store && typeof W.store.wake === 'function') {
      return W.store.wake();
    }
    return Promise.resolve();
  },
  _onIncomingRollRow: function (row) {
    if (!row || !row.dados_completos) return;
    var rd = row.dados_completos.rollData;
    var le = row.dados_completos.logEntry;
    if (!rd && !le) return;
    if (MesaSync && typeof MesaSync.push === 'function') {
      MesaSync.push({
        type: 'SYNC_DICE_ROLL',
        rollData: rd,
        logEntry: le,
        timestamp: row.criado_em ? Date.parse(row.criado_em) : Date.now(),
        source: 'database'
      });
    }
  },
  getRecentRolls: function (combatId, limit) {
    if (W.store && typeof W.store.getRecentRolls === 'function') {
      return W.store.getRecentRolls(combatId, limit);
    }
    return Promise.resolve([]);
  },
  saveRoll: function (rollData, logEntry) {
    if (W.store && typeof W.store.saveRoll === 'function') {
      return W.store.saveRoll(rollData, logEntry);
    }
    return Promise.resolve();
  },
  deleteRoll: function (rollId) {
    if (W.store && typeof W.store.deleteRoll === 'function') {
      return W.store.deleteRoll(rollId);
    }
    return Promise.resolve();
  },
  clearAllRolls: function () {
    if (W.store && typeof W.store.clearRolls === 'function') {
      return W.store.clearRolls();
    }
    return Promise.resolve();
  }
};
window.hubMesaPrepare = function () { return MesaSync.prepare(); };
// The Mesa's exit button: save, then go to the home page.
window.hubMesaFlush = function () {
  try { sessionStorage.removeItem('hounds_mesa_view_state_v1'); } catch (e) {}
  var saved = MesaSync.flushNow();
  go('#inicio');
  return saved;
};
// A save on the way goes when the tab is hidden or closed (it waits 5 s for more changes: see saveDelay in js/store/supabase.js).
document.addEventListener('visibilitychange', function () { if (document.hidden) MesaSync.flushPending(); });
window.addEventListener('pagehide', function () { MesaSync.flushPending(); });
