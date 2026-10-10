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
   ===================================================================== */
var MESA_LS = { combats: 'gurps_combat_master_data_v2', conditions: 'gurps_combat_master_conditions_v2', players: 'gurps_fixed_personagens_v1', deletedCombatIds: 'gurps_combat_master_deleted_v1' };
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
  function toLocal(st) {
    try {
      if (!localStorage.getItem('hounds_mesa_backup_v1')) { var b = localState(); if (b) localStorage.setItem('hounds_mesa_backup_v1', JSON.stringify({ at: Date.now(), data: b })); }
    } catch (e) {}
    Object.keys(MESA_LS).forEach(function (k) { if (st[k] != null) { try { localStorage.setItem(MESA_LS[k], JSON.stringify(st[k])); } catch (e) {} } });
  }
  function fetchRev(h) {
    // A head written with the state inline (no pieces) is read as is.
    if (Array.isArray(h.combats)) return Promise.resolve({ combats: h.combats, conditions: h.conditions, players: h.players, activeCombatId: h.activeCombatId || null, deletedCombatIds: h.deletedCombatIds });
    if (!(h.n > 0)) return Promise.resolve(null);
    return W.store.query('mesa_chunks', 'rev', h.rev).then(function (rows) {
      if (rows.length < h.n) return null;
      rows.sort(function (a, b) { return a.i - b.i; });
      try { return JSON.parse(rows.slice(0, h.n).map(function (r) { return r.part; }).join('')); } catch (e) { return null; }
    });
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
    if (u.role === 'visualizador') return false;
    return !!head || u.role === 'mestre';
  }
  function save(p) {
    if (!canSave()) return Promise.resolve();
    var st = p.st, rev = p.rev, prev = head && head.n > 0 ? head.rev : null, t = now();
    var meta = { rev: rev, by: (window.hubUser && window.hubUser.id) || null, createdAt: (head && head.createdAt) || t, updatedAt: t };
    var write;
    if (p.json.length <= (W.store.inlineMax || 0)) {
      write = W.store.put('mesa', 'state', Object.assign({ n: 0 }, meta, st));
    } else {
      var parts = [];
      for (var i = 0; i < p.json.length; i += CH) parts.push(p.json.slice(i, i + CH));
      write = Promise.resolve();
      parts.forEach(function (part, i) { write = write.then(function () { return W.store.put('mesa_chunks', rev + '_' + i, { rev: rev, i: i, part: part, createdAt: t }); }); });
      write = write.then(function () { return W.store.put('mesa', 'state', Object.assign({ n: parts.length }, meta)); });
    }
    return write.then(function () {
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
      if (rt()) { rt().on('mesa', onBroadcast); rt().on('mesa-npc', onNpc); }
    },
    // Runs before the Mesa iframe loads: put the saved state where the Mesa reads it.
    prepare: function () {
      var to = new Promise(function (r) { setTimeout(r, 5000); });
      return Promise.race([ready, to]).then(function () {
        if (state) { toLocal(state); return; }
        if (head) return;
        var loc = localState();
        if (loc && window.hubUser && window.hubUser.role === 'mestre') return save({ st: loc, rev: newRev(), json: JSON.stringify(loc) }).catch(function () {});
      });
    },
    publish: function (str) {
      var m; try { m = JSON.parse(str); } catch (e) { return; }
      if (!m) return;
      // One character changed: straight to the other browsers (the full state follows).
      if (m.type === 'SYNC_NPC') { if (m.npc && rt() && canSave()) rt().send('mesa-npc', { npc: m.npc, ts: m.timestamp }); return; }
      if (m.type !== 'SYNC_FULL') return;
      // The Mesa's answer to REQUEST_SYNC has no deletedCombatIds: keep the ones known.
      var del = (m.deletedCombatIds || []).concat((state && state.deletedCombatIds) || []).filter(function (x, i, a) { return a.indexOf(x) === i; });
      var st = { combats: m.combats, conditions: m.conditions, players: m.players, activeCombatId: m.activeCombatId || null, deletedCombatIds: del };
      var json = JSON.stringify(st);
      if (json === lastJson) return;
      lastJson = json;
      var rev = newRev();
      if (rt() && canSave() && json.length < 240000) rt().send('mesa', { rev: rev, state: st });
      pending = { st: st, rev: rev, json: json };
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
