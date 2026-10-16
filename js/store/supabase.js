/* =====================================================================
   Hounds — Armazenamento: Supabase
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   Supabase backend (PostgreSQL tables; supabase/migrations/)
     Each collection of the site is a table (maps → mapas, characters →
     personagens, maps/{id}/markers → marcadores...), and its lists of ids
     are link tables (organization members → personagem_organizacao...).
     Reads: the view <table>_doc gives each item put together with its
       links, in the shape the rest of the site uses ({ id, data,
       updated_at }; updated_at is when the row last changed).
     Writes: only through the database functions hounds_put, hounds_patch,
       hounds_remove, hounds_remove_many and hounds_trocar_imagem_mapa,
       which save an item and all its links in one transaction and answer
       with the item as saved. A removal follows the rules of the entity
       there (a deleted map's submaps move up...), so the Ops in mundo.js
       skip their own cascade when the store is `relational`.
     Everything needs a logged-in account linked to a hub user (sbSignIn,
       below); the database checks each role's permissions itself.
     Two realtime channels:
       "hounds"          postgres_changes of every table: a row changed,
                         the item is downloaded again from its view, a few
                         at once (a changed link also marks the item it
                         belongs to). The Mesa's state comes whole in the
                         notice and is not downloaded.
       "hounds-mesa"     private; broadcast messages straight to the other
                         browsers, ahead of the database (the Mesa uses
                         it; see MesaSync).
     Writes show on this screen at once and the answer of the database
     replaces that copy; notices about an item with a write of this
     browser still on the way wait for it. A failed write downloads the
     item again. Watched collections are checked again after every
     (re)connection, when the tab comes back and every 60 s (15 s while
     the realtime is down): only each row's id and updated_at, then the
     rows that changed (see check()). Channels that drop are made again
     (see revive()).
   ===================================================================== */
function SupabaseStore(client, bucket) {
  var bName = bucket || 'hounds-images', BATCH = 100;
  var TABLES = { users: 'usuarios', maps: 'mapas', locations: 'locais', characters: 'personagens', organizations: 'organizacoes',
    sheets: 'fichas', events: 'eventos', notebooks: 'cadernos', notes: 'anotacoes', spells: 'magias', advantages: 'vantagens', disadvantages: 'desvantagens',
    skills: 'pericias', techniques: 'tecnicas', styles: 'estilos', weapons: 'armas', armors: 'armaduras', items: 'itens', improvements: 'melhoramentos',
    armorLocs: 'armadura_localizacoes', mesa: 'mesa_estado', mesa_chunks: 'mesa_partes' };
  var COL_OF = {}; Object.keys(TABLES).forEach(function (k) { COL_OF[TABLES[k]] = k; });
  var MARKERS = /^maps\/([^/]+)\/markers$/;
  var cols = {}, channel = null, live = false, mesaChannel = null, mesaLive = false, bcast = {};
  // mesaOk: the Mesa's channel connected once (so a drop of it is worth reconnecting). chGen
  // tells the callbacks of channels already replaced to keep quiet.
  var started = false, mesaOk = false, chGen = 0, reviving = false, reviveTimer = 0, reviveWait = 0;

  // updated_at in one format, whether it came from a select or from realtime ("T" or " ",
  // with or without the time zone; the column is timestamptz, always UTC here). The format
  // also sorts in time order. A format that still differs only costs one extra download.
  function ts(v) {
    var m = /^(\d{4}-\d\d-\d\d)[T ](\d\d:\d\d:\d\d)(?:\.(\d+))?/.exec(String(v || ''));
    return m ? m[1] + ' ' + m[2] + '.' + ((m[3] || '') + '000000').slice(0, 6) : '';
  }
  function msOf(v) { var t = ts(v); return t ? Date.parse(t.slice(0, 23).replace(' ', 'T') + 'Z') : 0; }

  // Same JSON whatever the key order (Postgres jsonb reorders keys).
  function stable(v) {
    if (Array.isArray(v)) return '[' + v.map(function (x) { return x === undefined ? 'null' : stable(x); }).join(',') + ']';
    if (v && typeof v === 'object') return '{' + Object.keys(v).sort().filter(function (k) { return v[k] !== undefined; }).map(function (k) { return JSON.stringify(k) + ':' + stable(v[k]); }).join(',') + '}';
    return JSON.stringify(v);
  }
  function doc(row) { return Object.assign({ id: row.id }, row.data); }
  function byCreated(a, b) { return (a.createdAt || 0) - (b.createdAt || 0); }
  function list(c) { return Object.keys(c.rows).map(function (k) { return c.rows[k]; }).sort(byCreated); }
  function emit(c) {
    if (c.queued) return;
    c.queued = true;
    Promise.resolve().then(function () { c.queued = false; if (cols[c.col] !== c || !c.ready) return; var l = list(c); c.subs.slice().forEach(function (cb) { cb(l.slice()); }); });
  }
  function rows(res) { if (res.error) throw res.error; return res.data || []; }

  // The view of a collection; markers are one table for every map, filtered by mapa_id.
  function select(col, what) {
    var m = MARKERS.exec(col), t = m ? 'marcadores' : TABLES[col];
    if (!t) throw new Error('Coleção desconhecida: ' + col);
    var q = client.from(t + '_doc').select(what);
    return m ? q.eq('mapa_id', m[1]) : q;
  }
  function fetchRows(col) { return select(col, 'id, data, updated_at').then(rows); }
  // Only the rows asked for, BATCH ids per request so the URL stays short.
  function fetchSome(col, ids) {
    var parts = [];
    for (var i = 0; i < ids.length; i += BATCH) parts.push(ids.slice(i, i + BATCH));
    return Promise.all(parts.map(function (p) { return select(col, 'id, data, updated_at').in('id', p).then(rows); }))
      .then(function (l) { return [].concat.apply([], l); });
  }

  // The copy here of one item, from the database. A copy older than the one here is left out
  // (two downloads of the same item can arrive out of order). Returns whether anything changed.
  function setRow(c, id, d, stamp) {
    if (stamp && c.stamp[id] && stamp < c.stamp[id]) return false;
    c.ver[id] = (c.ver[id] || 0) + 1;
    if (stamp) c.stamp[id] = stamp;
    if (c.rows[id] && stable(c.rows[id]) === stable(d)) return false;
    c.rows[id] = d;
    return true;
  }
  function dropRow(c, id) {
    c.ver[id] = (c.ver[id] || 0) + 1;
    delete c.stamp[id];
    if (!(id in c.rows)) return false;
    delete c.rows[id];
    return true;
  }

  // Full load of one collection (the first time). Items with a write of this browser on the
  // way keep the copy here and are downloaded again when it ends.
  function load(c) {
    var gen = ++c.gen;
    c.loading = true;
    return fetchRows(c.col).then(function (data) {
      if (cols[c.col] !== c || gen !== c.gen) return;
      var before = c.ready ? stable(list(c)) : null, r = {}, stamp = {};
      data.forEach(function (x) { r[x.id] = doc(x); stamp[x.id] = ts(x.updated_at); });
      Object.keys(c.busy).forEach(function (id) {
        c.dirty[id] = true;
        if (!c.ready) return;
        if (id in c.rows) r[id] = c.rows[id]; else delete r[id];
      });
      c.rows = r; c.stamp = stamp; c.ready = true; c.loading = false;
      if (Object.keys(c.want).length) flush(c);
      if (before === null || stable(list(c)) !== before) emit(c);
    }, function (e) {
      if (cols[c.col] !== c || gen !== c.gen) return;
      c.loading = false;
      c.errs.slice().forEach(function (f) { f(e); });
    });
  }
  // Light check of a loaded collection: ids and updated_at only (a few dozen bytes a row), then
  // the items whose updated_at differs from the one known here, or that this browser doesn't
  // have, and the removal of items the database no longer has. Items with a write of this
  // browser on the way are left alone. A failed check changes nothing; the next one tries again.
  function check(c) {
    if (!c.ready) { if (!c.loading) load(c); return Promise.resolve(); }
    var ver = Object.assign({}, c.ver), had = Object.keys(c.rows);
    return select(c.col, 'id, updated_at').then(rows).then(function (data) {
      if (cols[c.col] !== c) return;
      var there = {}, changed = false;
      data.forEach(function (r) { there[r.id] = true; if (!c.busy[r.id] && (!(r.id in c.rows) || c.stamp[r.id] !== ts(r.updated_at))) want(c, r.id); });
      had.forEach(function (id) { if (!there[id] && !c.busy[id] && c.ver[id] === ver[id] && dropRow(c, id)) changed = true; });
      if (changed) emit(c);
    }).catch(function (e) { console.warn('Hounds: não foi possível conferir ' + c.col + ' com o banco.', e); });
  }
  function resync() { Object.keys(cols).forEach(function (k) { check(cols[k]); }); }

  // Items to download again, a few at once (one request for the ones asked for within 30 ms).
  function want(c, id) {
    c.want[id] = true;
    if (!c.timer) c.timer = setTimeout(function () { flush(c); }, 30);
  }
  function flush(c) {
    c.timer = 0;
    if (cols[c.col] !== c || !c.ready) return;
    // An item with a write of this browser on the way is downloaded when the write ends.
    var ids = Object.keys(c.want).filter(function (id) { if (c.busy[id]) { c.dirty[id] = true; return false; } return true; });
    c.want = {};
    if (!ids.length) return;
    var ver = {}; ids.forEach(function (id) { ver[id] = c.ver[id]; });
    fetchSome(c.col, ids).then(function (data) {
      if (cols[c.col] !== c) return;
      var got = {}, changed = false;
      data.forEach(function (r) {
        got[r.id] = true;
        if (c.busy[r.id]) { c.dirty[r.id] = true; return; }
        if (setRow(c, r.id, doc(r), ts(r.updated_at))) changed = true;
      });
      // Asked for but not returned: deleted (unless something newer about it arrived meanwhile).
      ids.forEach(function (id) { if (!got[id] && !c.busy[id] && c.ver[id] === ver[id] && dropRow(c, id)) changed = true; });
      if (changed) emit(c);
    }, function (e) { console.warn('Hounds: não foi possível baixar itens de ' + c.col + '.', e); });
  }

  // The Mesa's rows come whole in the realtime notice, with the same fields as their views.
  function mesaDoc(col, r) {
    if (col === 'mesa') return Object.assign({ id: r.id }, r.estado, { rev: r.rev, n: r.partes, by: r.autor, createdAt: msOf(r.criado_em), updatedAt: msOf(r.atualizado_em) });
    return { id: r.id, rev: r.rev, i: r.indice, part: r.parte, createdAt: msOf(r.criado_em) };
  }
  // The watched collection of a notice. A deleted marker comes only with its id.
  function colOf(table, row, del) {
    if (table !== 'marcadores') return COL_OF[table] || null;
    if (!del) return row.mapa_id ? 'maps/' + row.mapa_id + '/markers' : null;
    return Object.keys(cols).filter(function (k) { return MARKERS.test(k) && row.id in cols[k].rows; })[0] || null;
  }
  function onChange(p) {
    var del = p.eventType === 'DELETE', row = del ? p.old : p.new;
    if (!row || row.id == null) return;
    var col = colOf(p.table, row, del), c = col && cols[col], id = row.id;
    if (!c) return;
    if (c.busy[id]) { c.dirty[id] = true; return; } // a write of this browser is on the way: its answer, or a download after it, comes next
    if (!c.ready) { if (!del) want(c, id); return; }
    if (del) { delete c.want[id]; if (dropRow(c, id)) emit(c); return; }
    var stamp = ts(row.gravado_em);
    if (stamp && c.stamp[id] === stamp) return; // this version is here already (the echo of a write of this browser)
    if ((col === 'mesa' && row.estado && typeof row.estado === 'object') || (col === 'mesa_chunks' && typeof row.parte === 'string')) {
      if (setRow(c, id, mesaDoc(col, row), stamp)) emit(c);
      return;
    }
    want(c, id); // includes a Mesa row over the 1 MB realtime limit, which arrives without its state
  }
  function openChannels() {
    var gen = ++chGen;
    // The tables' notices follow each table's RLS (only accounts linked to a user get them).
    channel = client.channel('hounds');
    Object.keys(COL_OF).concat(['marcadores']).forEach(function (t) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table: t }, onChange);
    });
    channel.subscribe(function (status) {
      if (gen !== chGen) return;
      live = status === 'SUBSCRIBED';
      if (live) { reviveWait = 0; resync(); } // first connection and every reconnection
      else reviveSoon();
    });
    // The Mesa's direct messages, on a private channel (policies on realtime.messages). If it
    // can't connect, the Mesa still syncs through the database, a moment later.
    mesaChannel = client.channel('hounds-mesa', { config: { private: true, broadcast: { self: false } } })
      .on('broadcast', { event: 'hub' }, function (m) { var p = m && m.payload, f = p && bcast[p.kind]; if (f) f(p.data); });
    mesaChannel.subscribe(function (status, err) {
      if (gen !== chGen) return;
      mesaLive = status === 'SUBSCRIBED';
      if (mesaLive) mesaOk = true;
      else if (mesaOk) reviveSoon(); // it worked before: it dropped
      else if (status === 'CHANNEL_ERROR') console.warn('Hounds: canal da Mesa indisponível; a Mesa sincroniza pelo banco.', err);
    });
  }
  function healthy() { return live && (mesaLive || !mesaOk); }
  /* A channel the server closed doesn't come back by itself: the token expired while the tab
     slept (the server drops the channels when it does), or the connection died with the timers
     of a hidden tab held back. The channels are made again with the session's current token.
     A drop the SDK fixes by itself (a short network loss) is back before the wait ends. */
  function reviveSoon() {
    if (reviveTimer) return;
    reviveWait = Math.min(reviveWait ? reviveWait * 2 : 5000, 60000);
    reviveTimer = setTimeout(function () { reviveTimer = 0; if (!healthy()) revive(); }, reviveWait);
  }
  function revive() {
    clearTimeout(reviveTimer); reviveTimer = 0;
    if (reviving) return;
    reviving = true;
    var old = [channel, mesaChannel];
    chGen++; channel = mesaChannel = null; live = mesaLive = false;
    // getSession() refreshes an expired session. The old channels go first: the SDK hands back
    // an existing channel with the same name instead of making a new one.
    client.auth.getSession().then(function (res) {
      var s = res && res.data && res.data.session;
      if (s && client.realtime && client.realtime.setAuth) return client.realtime.setAuth(s.access_token);
    }).catch(function () {}).then(function () {
      var gone = Promise.all(old.filter(Boolean).map(function (ch) { return Promise.resolve(client.removeChannel(ch)).catch(function () {}); }));
      return Promise.race([gone, new Promise(function (r) { setTimeout(r, 3000); })]);
    }).then(function () { reviving = false; openChannels(); });
  }
  function ensureChannel() {
    if (started) return;
    started = true;
    openChannels();
    document.addEventListener('visibilitychange', function () { if (document.hidden) return; if (!healthy()) revive(); resync(); });
    window.addEventListener('online', function () { if (!healthy()) revive(); resync(); });
    // Every 60 s; every 15 s while the realtime is down, so the screen doesn't stop.
    var ticks = 0;
    setInterval(function () {
      if (document.hidden) return;
      var ok = healthy();
      if (!ok && !reviving && !reviveTimer) revive();
      if (!ok || ++ticks % 4 === 0) resync();
    }, 15000);
  }

  function watch(col, cb, err) {
    ensureChannel();
    var c = cols[col] || (cols[col] = { col: col, rows: {}, stamp: {}, ver: {}, ready: false, loading: false, gen: 0, subs: [], errs: [],
                                        busy: {}, dirty: {}, want: {}, timer: 0 });
    c.subs.push(cb);
    if (err) c.errs.push(err);
    if (c.ready) emit(c);
    else if (!c.loading) load(c);
    return function () {
      c.subs = c.subs.filter(function (x) { return x !== cb; });
      c.errs = c.errs.filter(function (x) { return x !== err; });
      if (!c.subs.length && cols[col] === c) delete cols[col];
    };
  }
  function all(col) {
    var c = cols[col];
    if (c && c.ready) return Promise.resolve(list(c));
    return fetchRows(col).then(function (d) { return d.map(doc).sort(byCreated); });
  }
  function query(col, field, value) {
    var c = cols[col];
    if (c && c.ready) return Promise.resolve(list(c).filter(function (d) { return d[field] === value; }));
    if (typeof value !== 'string') return all(col).then(function (l) { return l.filter(function (d) { return d[field] === value; }); });
    return select(col, 'id, data').eq('data->>' + field, value).then(rows).then(function (d) { return d.map(doc).sort(byCreated); });
  }

  // A write of this browser to an item: begin() before, end() with the database's answer.
  function begin(c, id) { if (c) c.busy[id] = (c.busy[id] || 0) + 1; }
  function end(c, id, ok, saved) {
    if (!c || cols[c.col] !== c || !c.busy[id]) return;
    if (--c.busy[id] > 0) return; // another write of this browser to it is still on the way
    delete c.busy[id];
    var dirty = c.dirty[id];
    delete c.dirty[id];
    if (!ok || dirty || !c.ready) { want(c, id); return; } // failed, or changed meanwhile: the database's copy
    if (saved && saved.data) { if (setRow(c, id, doc(saved), ts(saved.updated_at))) emit(c); }
    else if (saved && saved.updated_at) c.stamp[id] = ts(saved.updated_at); // the Mesa: the copy here is what was saved
  }
  function call(c, id, fn, args) {
    begin(c, id);
    return client.rpc(fn, args).then(function (res) {
      if (res.error) { end(c, id, false); throw res.error; }
      end(c, id, true, res.data);
      return res.data;
    }, function (e) { end(c, id, false); throw e; });
  }

  function put(col, id, body) {
    var docId = id || uid(), c = cols[col];
    if (c && c.ready) { c.rows[docId] = Object.assign({ id: docId }, body); emit(c); }
    return call(c, docId, 'hounds_put', { p_col: col, p_id: docId, p_doc: body }).then(function () { return docId; });
  }
  function patch(col, id, p) {
    var c = cols[col];
    if (c && c.ready && c.rows[id]) { c.rows[id] = Object.assign({}, c.rows[id], p); emit(c); }
    return call(c, id, 'hounds_patch', { p_col: col, p_id: id, p_patch: p });
  }
  function remove(col, id) {
    var c = cols[col];
    if (c && c.ready && dropRow(c, id)) emit(c);
    return call(c, id, 'hounds_remove', { p_col: col, p_id: id }).then(function () {});
  }
  // Many rows at once: one redraw here and BATCH ids per request, instead of one of each per row.
  function removeMany(col, ids) {
    var c = cols[col], parts = [];
    if (c && c.ready) { var changed = false; ids.forEach(function (id) { if (dropRow(c, id)) changed = true; }); if (changed) emit(c); }
    for (var i = 0; i < ids.length; i += BATCH) parts.push(ids.slice(i, i + BATCH));
    return parts.reduce(function (p, part) {
      return p.then(function () {
        part.forEach(function (id) { begin(c, id); });
        return client.rpc('hounds_remove_many', { p_col: col, p_ids: part }).then(function (res) {
          part.forEach(function (id) { end(c, id, !res.error); });
          if (res.error) throw res.error;
        }, function (e) { part.forEach(function (id) { end(c, id, false); }); throw e; });
      });
    }, Promise.resolve());
  }
  // A new image for a map, deleting its markers (their positions belong to the old image), in one
  // transaction. Without confirmed and with markers there, rejects with { code: 'markers_exist',
  // count }. Resolves with { removidos, imagemAnterior }.
  function replaceMapImage(mapId, image, confirmed, updatedAt) {
    return client.rpc('hounds_trocar_imagem_mapa', { p_mapa_id: mapId, p_imagem: image, p_confirmado: confirmed === true, p_atualizado_em: updatedAt || null }).then(function (res) {
      var e = res.error;
      if (e && e.hint === 'markers_exist') throw { code: 'markers_exist', count: Number(e.details) || 0, message: e.message };
      if (e) throw e;
      if (cols.maps) want(cols.maps, mapId);
      var mk = cols['maps/' + mapId + '/markers'];
      if (mk && mk.ready) { var changed = false; Object.keys(mk.rows).forEach(function (id) { if (dropRow(mk, id)) changed = true; }); if (changed) emit(mk); }
      return res.data || { removidos: 0, imagemAnterior: null };
    });
  }

  // Login accounts, by the Mestre (Edge Function "contas", supabase/functions/contas): acao
  // 'criar' { id, nome, email, senha, papel }, 'senha' { id, senha }, 'excluir' { id, excluirConta }.
  // Rejects with { message } in words for the Mestre.
  function account(acao, dados) {
    return client.functions.invoke('contas', { body: Object.assign({ acao: acao }, dados) }).then(function (res) {
      if (!res.error) { if (cols.users) check(cols.users); return res.data; }
      var e = res.error, ctx = e.context;
      var body = ctx && typeof ctx.json === 'function' ? ctx.json().catch(function () { return null; }) : Promise.resolve(null);
      return body.then(function (b) {
        if (b && b.error) throw { message: b.error, code: b.code };
        if (e.name === 'FunctionsFetchError' || e.name === 'FunctionsRelayError' || (ctx && ctx.status === 404)) {
          throw { message: 'A função "contas" não está publicada no Supabase (veja SUPABASE.md, seção Login e permissões). Por enquanto, crie a conta no painel do Supabase.' };
        }
        throw e;
      });
    });
  }

  function upload(file) {
    var ext = file.name ? file.name.slice(file.name.lastIndexOf('.')) : '';
    if (!ext && file.type) {
      var map = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };
      ext = map[file.type] || '';
    }
    var ref = uid() + (ext || '');
    return client.storage.from(bName).upload(ref, file, { contentType: file.type, upsert: true }).then(function (res) {
      if (res.error) throw res.error;
      return { ref: ref, type: file.type, size: file.size };
    });
  }
  function imageUrl(ref) {
    if (!ref) return Promise.resolve('');
    if (ref.indexOf('http://') === 0 || ref.indexOf('https://') === 0 || ref.indexOf('data:') === 0) return Promise.resolve(ref);
    var res = client.storage.from(bName).getPublicUrl(ref);
    return Promise.resolve(res && res.data ? res.data.publicUrl : '');
  }
  function dropImage(ref) {
    if (!ref) return Promise.resolve();
    return client.storage.from(bName).remove([ref]).then(function () {});
  }

  return {
    kind: 'supabase',
    relational: true,
    canUpload: true,
    canWrite: function () { return true; },
    init: function () { return Promise.resolve(); },
    watch: watch, all: all, query: query, put: put, patch: patch, remove: remove, removeMany: removeMany,
    replaceMapImage: replaceMapImage, account: account,
    upload: upload, imageUrl: imageUrl, dropImage: dropImage,
    // For MesaSync: save soon and in one row, and reach the others directly.
    saveDelay: 300,
    inlineMax: 5000000,
    realtime: {
      send: function (kind, data) {
        if (!mesaChannel || !mesaLive) return Promise.resolve('closed');
        return Promise.resolve(mesaChannel.send({ type: 'broadcast', event: 'hub', payload: { kind: kind, data: data } })).catch(function () { return 'error'; });
      },
      on: function (kind, fn) { ensureChannel(); bcast[kind] = fn; }
    }
  };
}

function connectSupabase(cfg) {
  return loadScript(SB_SDK).then(function () {
    var client = window.supabase.createClient(cfg.url, cfg.anonKey, { realtime: { params: { eventsPerSecond: 40 } } });
    return sbSignIn(client).then(function () { return SupabaseStore(client, cfg.bucket || 'hounds-images'); });
  });
}

/* ---------- login (Supabase Auth, email e senha) ----------
   The database only answers to an account linked to a hub user (its email is in the Usuários
   tab; see supabase/migrations/20261015120000_autenticacao.sql). The session the SDK keeps in
   this browser is used again on the next visit; without one, or with an account no user has,
   the gate asks for the email and password (hubAskLogin, in gate.js). Resolves once the user
   is known (hubApplyUser); the store connects after that, with the account's token. */
function sbWhoAmI(client) {
  return client.rpc('hounds_eu').then(function (r) { if (r.error) throw r.error; return r.data || null; });
}
function sbSignIn(client) {
  window.hubSignOut = function () {
    try { localStorage.removeItem('hounds_active_user'); } catch (e) {}
    return client.auth.signOut().catch(function () {}).then(function () { location.reload(); });
  };
  var NOT_LINKED = 'Esta conta não está ligada a nenhum usuário do Hounds. Peça ao Mestre para cadastrar o seu email na aba Usuários.';
  return client.auth.getSession().then(function (res) {
    var s = res && res.data && res.data.session;
    return s ? sbWhoAmI(client).then(function (me) { return { me: me, email: s.user && s.user.email }; }) : { me: null, email: null };
  }).catch(function () { return { me: null, email: null }; }).then(function (r) {
    if (r.me) return r.me;
    return window.hubAskLogin({
      notice: r.email ? r.email + ': ' + NOT_LINKED : '',
      submit: function (email, password) {
        return client.auth.signInWithPassword({ email: email, password: password }).then(function (res) {
          if (res.error) throw res.error;
          return sbWhoAmI(client);
        }).then(function (me) {
          if (!me) throw { code: 'not_linked', message: NOT_LINKED };
          return me;
        });
      }
    });
  }).then(function (me) {
    window.hubApplyUser(me);
    // Signed out elsewhere (another tab, or the session ended): back to the login.
    client.auth.onAuthStateChange(function (ev) { if (ev === 'SIGNED_OUT') location.reload(); });
    // Realtime with this account's token, so the tables' notices pass their RLS.
    return client.auth.getSession().then(function (res) {
      var s = res && res.data && res.data.session;
      if (s && client.realtime && client.realtime.setAuth) return Promise.resolve(client.realtime.setAuth(s.access_token)).catch(function () {});
    });
  });
}

function errorText(e) {
  if (e && e.message) return e.message;
  var c = e && e.code;
  var M = {
    too_large: 'A imagem passa de 20 MB. Reduza o arquivo e tente de novo.',
    unsupported_type: 'Esse formato não é aceito. Use PNG, JPG, WebP ou GIF.',
    quota_or_state: 'O espaço para imagens deste hub acabou. Exclua imagens que não usa mais.',
    quota_exceeded: 'O limite de dados deste hub foi atingido. Exclua itens que não usa mais.',
    rate_limited: 'Muitas ações seguidas. Espere alguns segundos e tente de novo.',
    resource_exhausted: 'Muitas ações seguidas. Espere alguns segundos e tente de novo.',
    invalid_argument: 'Você não tem permissão para alterar este hub.',
    not_granted: 'Você não tem permissão para alterar este hub.',
    upstream_auth: 'Sua sessão expirou. Recarregue a página e tente de novo.',
    cycle: 'Esse mapa pai criaria um ciclo na hierarquia. Escolha outro.',
    loc_cycle: 'Um local não pode ficar dentro dele mesmo nem de um local que está dentro dele. Escolha outro.',
    // Firebase
    'permission-denied': 'Você não tem permissão para alterar este hub. Recarregue a página e entre de novo.',
    'unauthenticated': 'Sua sessão expirou. Recarregue a página e tente de novo.',
    'resource-exhausted': 'O limite do banco de dados foi atingido. Espere um pouco; se continuar, o limite gratuito do dia acabou.',
    'unavailable': 'Sem conexão com o banco de dados. Verifique a internet e tente de novo.'
  };
  if (e && e.name === 'QuotaExceededError') return 'O navegador ficou sem espaço para guardar a imagem.';
  return M[c] || 'Não foi possível salvar. Verifique a conexão e tente de novo.';
}
