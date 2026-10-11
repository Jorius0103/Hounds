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
   browsers, and the state is saved inline 0.3 s after the last change.
   The Mesa merges what it receives character by character (newest
   updatedAt wins). When someone else's state arrives while this browser
   has edits not saved yet, the Mesa is asked for its merged state
   (REQUEST_SYNC), so the save carries both.
   deletedCombatIds lists deleted combats, so a Mesa still holding one
   drops it on merge instead of saving it back.
   Images the Mesa embeds as text (avatars) are sent once to the image
   storage and the state carries their address (see hostImgs).
   ===================================================================== */
var MESA_LS = { combats: 'gurps_combat_master_data_v2', conditions: 'gurps_combat_master_conditions_v2', players: 'gurps_fixed_personagens_v1', activeCombatId: 'gurps_combat_master_active_combat_id_v1', deletedCombatIds: 'gurps_combat_master_deleted_v1', editors: 'gurps_combat_master_editors_v1' };
var MesaSync = (function () {
  var CH = 60000, head = null, loadedRev = null, state = null, listeners = [], timer = null, pending = null, writing = false;
  var readyRes, ready = new Promise(function (r) { readyRes = r; }), gotHead = false, lastJson = null, askTimer = null;
  var cid = 'hub-' + uid(), seq = 0, known = {}, knownList = [];
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
  function mesaOpen() { return location.hash === '#mesa' && listeners.length > 0; }
  function push(obj) { var msg = JSON.stringify(obj); listeners.slice().forEach(function (fn) { try { fn(msg); } catch (e) {} }); }
  // Someone else's state: into the open Mesa, or loaded fresh when it opens.
  function applyRemote(rev, st) {
    remember(rev); loadedRev = rev; state = st;
    if (mesaOpen()) {
      push(Object.assign({ type: 'SYNC_FULL', clientId: 'hub', timestamp: Date.now() }, st));
      if (pending || writing) { clearTimeout(askTimer); askTimer = setTimeout(function () { push({ type: 'REQUEST_SYNC', clientId: 'hub', timestamp: Date.now() }); }, 150); }
    } else if (window.hubMesaStale) window.hubMesaStale();
  }
  function onHead(rows) {
    var h0 = rows.filter(function (r) { return r.id === 'state'; })[0] || null;
    var first = !gotHead; gotHead = true;
    head = h0;
    if (!h0) { if (first) readyRes(); return; }
    if (h0.rev === loadedRev || known[h0.rev]) { loadedRev = h0.rev; if (first) readyRes(); return; }
    var rev = h0.rev;
    fetchRev(h0).then(function (st) {
      if (!st || known[rev]) { if (first) readyRes(); return; }
      if (first) { remember(rev); loadedRev = rev; state = st; readyRes(); return; }
      applyRemote(rev, st);
    }, function () { if (first) readyRes(); });
  }
  function onBroadcast(m) { if (m && m.rev && m.state && !known[m.rev]) applyRemote(m.rev, m.state); }
  function onNpc(m) { if (m && m.npc && mesaOpen()) push({ type: 'SYNC_NPC', clientId: 'hub', timestamp: m.ts || Date.now(), npc: m.npc }); }
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
      var editors = JSON.parse(localStorage.getItem('gurps_combat_master_editors_v1') || '[]');
      if (Array.isArray(editors) && editors.some(matchUser)) return true;
      var combats = JSON.parse(localStorage.getItem(MESA_LS.combats) || '[]');
      var actId = JSON.parse(localStorage.getItem(MESA_LS.activeCombatId) || 'null');
      var activeCb = combats.filter(function (c) { return c.id === actId; })[0] || combats[0];
      if (activeCb && Array.isArray(activeCb.editorUserIds) && activeCb.editorUserIds.some(matchUser)) return true;
    } catch (e) {}
    return false;
  }
  function save(p) {
    if (!canSave()) return Promise.resolve();
    // The embedded images go to the image storage first; the state saved carries their addresses.
    return hostImgs(p.st).then(function () { return write(swapImgs(p.st), p.rev); });
  }
  function write(st, rev) {
    var json = JSON.stringify(st), prev = head && head.n > 0 ? head.rev : null, t = now();
    var meta = { rev: rev, by: (window.hubUser && window.hubUser.id) || null, createdAt: (head && head.createdAt) || t, updatedAt: t };
    var w;
    if (json.length <= (W.store.inlineMax || 0)) {
      w = W.store.put('mesa', 'state', Object.assign({ n: 0 }, meta, st));
    } else {
      var parts = [];
      for (var i = 0; i < json.length; i += CH) parts.push(json.slice(i, i + CH));
      w = Promise.resolve();
      parts.forEach(function (part, i) { w = w.then(function () { return W.store.put('mesa_chunks', rev + '_' + i, { rev: rev, i: i, part: part, createdAt: t }); }); });
      w = w.then(function () { return W.store.put('mesa', 'state', Object.assign({ n: parts.length }, meta)); });
    }
    return w.then(function () {
      loadedRev = rev; state = st;
      if (prev && prev !== rev) W.store.query('mesa_chunks', 'rev', prev).then(function (old) { old.forEach(function (o) { W.store.remove('mesa_chunks', o.id).catch(function () {}); }); }).catch(function () {});
    });
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
            if (mesaOpen()) push({ type: 'SYNC_EDITORS', editorUserIds: m.editorUserIds, timestamp: m.ts || Date.now() });
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
      var m; try { m = JSON.parse(str); } catch (e) { return; }
      if (!m) return;
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
        if (m.npc && canSave()) {
          var npcObj = swapImgs(m.npc);
          if (rt()) {
            hostImgs(m.npc);
            rt().send('mesa-npc', { npc: npcObj, ts: m.timestamp });
          }
          var curSt = state || localState();
          if (curSt) {
            var nId = npcObj.id;
            var updatedP = (curSt.players || []).map(function (p) { return p.id === nId ? Object.assign({}, p, npcObj) : p; });
            var updatedC = (curSt.combats || []).map(function (cb) {
              return Object.assign({}, cb, {
                npcs: (cb.npcs || []).map(function (n) { return n.id === nId ? Object.assign({}, n, npcObj) : n; })
              });
            });
            curSt.players = updatedP;
            curSt.combats = updatedC;
            state = curSt;
            var r0 = newRev();
            pending = { st: curSt, rev: r0 };
            if (!timer) timer = setTimeout(flush, delay());
          }
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
      var st = swapImgs({ combats: ensureSemCombateFirst(m.combats), conditions: m.conditions, players: m.players, activeCombatId: m.activeCombatId || null, deletedCombatIds: del, editors: eds || [] });
      var json = JSON.stringify(st);
      if (json === lastJson) return;
      lastJson = json;
      var rev = newRev();
      if (rt() && canSave() && json.length < 240000) rt().send('mesa', { rev: rev, state: st });
      hostImgs(st); // new images start going now; the save waits for them
      pending = { st: st, rev: rev };
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
