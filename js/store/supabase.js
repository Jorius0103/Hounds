/* =====================================================================
   Hounds — Armazenamento: Supabase
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   Supabase backend
     hounds_docs (col, id, data jsonb): one row per document.
     One realtime channel, "hounds", for the whole table:
       postgres_changes  every change arrives with its row and is applied
                         to an in-memory copy of each watched collection,
                         in the order the database committed them.
       broadcast         messages straight to the other browsers, ahead
                         of the database (the Mesa uses it; see MesaSync).
     Writes show on this screen at once; the database's echo of them is
     recognized and a failed write reloads the collection. Watched
     collections are reloaded after every (re)connection, when the tab
     comes back and every 60 s, to catch anything missed.
   ===================================================================== */
function SupabaseStore(client, bucket) {
  var bName = bucket || 'hounds-images', T = 'hounds_docs';
  var cols = {}, channel = null, live = false, bcast = {};

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
  function fetchRows(col) {
    return client.from(T).select('id, data').eq('col', col).then(function (res) { if (res.error) throw res.error; return res.data || []; });
  }

  // Full reload of one collection; changes that arrive meanwhile are replayed on top.
  function load(c) {
    var gen = ++c.gen;
    c.buffer = [];
    return fetchRows(c.col).then(function (data) {
      if (cols[c.col] !== c || gen !== c.gen) return;
      var before = c.ready ? stable(list(c)) : null, rows = {};
      data.forEach(function (r) { rows[r.id] = doc(r); });
      var buf = c.buffer; c.buffer = null; c.rows = rows; c.ready = true;
      buf.forEach(function (p) { apply(c, p, true); });
      if (before === null || stable(list(c)) !== before) emit(c);
    }, function (e) {
      if (cols[c.col] !== c || gen !== c.gen) return;
      c.buffer = null;
      c.errs.slice().forEach(function (f) { f(e); });
    });
  }
  function resync() { Object.keys(cols).forEach(function (k) { load(cols[k]); }); }

  // This browser's writes not yet echoed back by the database, per document.
  function expect(c, id, e) { e.at = Date.now(); (c.echo[id] = c.echo[id] || []).push(e); }
  function isEcho(e, del, row) {
    if (e.del || del) return !!e.del && del;
    var d = row.data;
    if (d === undefined) return false;
    if (e.keys) return e.keys.every(function (k) { return stable(d[k]) === e.vals[k]; });
    return stable(d) === e.val;
  }
  function failed(col, id) { var c = cols[col]; if (c) { delete c.echo[id]; load(c); } }

  function apply(c, p, replay) {
    var del = p.eventType === 'DELETE', row = del ? p.old : p.new;
    if (!row || row.id == null) return;
    var id = row.id, q = c.echo[id];
    if (q) {
      var now = Date.now(), hit = -1;
      q = q.filter(function (e) { return now - e.at < 15000; });
      for (var i = 0; i < q.length; i++) if (isEcho(q[i], del, row)) { hit = i; break; }
      if (hit >= 0) q.splice(0, hit + 1);
      if (q.length) { c.echo[id] = q; return; } // more of this browser's writes to it are on the way
      delete c.echo[id];
    }
    c.ver[id] = (c.ver[id] || 0) + 1;
    if (del) {
      if (!(id in c.rows)) return;
      delete c.rows[id];
    } else if (row.data === undefined) {
      refetch(c, id); return; // row over the 1 MB realtime limit arrives without its data
    } else {
      var d = doc(row);
      if (c.rows[id] && stable(c.rows[id]) === stable(d)) return;
      c.rows[id] = d;
    }
    if (!replay) emit(c);
  }
  function refetch(c, id) {
    var v = c.ver[id];
    client.from(T).select('id, data').eq('col', c.col).eq('id', id).then(function (res) {
      if (res.error || cols[c.col] !== c || c.ver[id] !== v) return;
      var r = res.data && res.data[0];
      if (r) c.rows[id] = doc(r); else delete c.rows[id];
      emit(c);
    });
  }

  function onChange(p) {
    var row = p && (p.eventType === 'DELETE' ? p.old : p.new), c = row && cols[row.col];
    if (!c) return;
    if (c.buffer) c.buffer.push(p);
    if (c.ready) apply(c, p, false);
  }
  function ensureChannel() {
    if (channel) return;
    channel = client.channel('hounds', { config: { broadcast: { self: false } } })
      .on('postgres_changes', { event: '*', schema: 'public', table: T }, onChange)
      .on('broadcast', { event: 'hub' }, function (m) { var p = m && m.payload, f = p && bcast[p.kind]; if (f) f(p.data); });
    channel.subscribe(function (status) {
      live = status === 'SUBSCRIBED';
      if (live) resync(); // first connection and every reconnection
    });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) resync(); });
    window.addEventListener('online', resync);
    setInterval(function () { if (!document.hidden) resync(); }, 60000);
  }

  function watch(col, cb, err) {
    ensureChannel();
    var c = cols[col] || (cols[col] = { col: col, rows: {}, ready: false, buffer: null, subs: [], errs: [], echo: {}, ver: {}, gen: 0 });
    c.subs.push(cb);
    if (err) c.errs.push(err);
    if (c.ready) emit(c);
    else if (!c.buffer) load(c);
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
    return client.from(T).select('id, data').eq('col', col).eq('data->>' + field, value)
      .then(function (res) { if (res.error) throw res.error; return (res.data || []).map(doc).sort(byCreated); });
  }

  function put(col, id, body) {
    var docId = id || uid(), c = cols[col];
    if (c && c.ready) { expect(c, docId, { val: stable(body) }); c.rows[docId] = Object.assign({ id: docId }, body); emit(c); }
    return client.from(T).upsert({ col: col, id: docId, data: body, updated_at: new Date().toISOString() }, { onConflict: 'col,id' })
      .then(function (res) { if (res.error) throw res.error; return docId; })
      .catch(function (e) { failed(col, docId); throw e; });
  }
  function patch(col, id, p) {
    var c = cols[col];
    if (c && c.ready && c.rows[id]) {
      var keys = Object.keys(p).filter(function (k) { return p[k] !== undefined; }), vals = {};
      keys.forEach(function (k) { vals[k] = stable(p[k]); });
      expect(c, id, { keys: keys, vals: vals });
      c.rows[id] = Object.assign({}, c.rows[id], p); emit(c);
    }
    return client.rpc('patch_hounds_doc', { p_col: col, p_id: id, p_patch: p }).then(function (res) {
      if (!res.error) return;
      // Without the SQL function: read, merge and write back.
      return client.from(T).select('data').eq('col', col).eq('id', id).single().then(function (sel) {
        if (sel.error) throw sel.error;
        var merged = Object.assign({}, sel.data && sel.data.data, p);
        return client.from(T).upsert({ col: col, id: id, data: merged, updated_at: new Date().toISOString() }, { onConflict: 'col,id' })
          .then(function (uRes) { if (uRes.error) throw uRes.error; });
      });
    }).catch(function (e) { failed(col, id); throw e; });
  }
  function remove(col, id) {
    var c = cols[col];
    if (c && c.ready && c.rows[id]) { expect(c, id, { del: true }); delete c.rows[id]; emit(c); }
    return client.from(T).delete().eq('col', col).eq('id', id)
      .then(function (res) { if (res.error) throw res.error; })
      .catch(function (e) { failed(col, id); throw e; });
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
    canUpload: true,
    canWrite: function () { return true; },
    init: function () { return Promise.resolve(); },
    watch: watch, all: all, query: query, put: put, patch: patch, remove: remove,
    upload: upload, imageUrl: imageUrl, dropImage: dropImage,
    // For MesaSync: save soon and in one row, and reach the others directly.
    saveDelay: 300,
    inlineMax: 5000000,
    realtime: {
      send: function (kind, data) {
        if (!channel || !live) return Promise.resolve('closed');
        return Promise.resolve(channel.send({ type: 'broadcast', event: 'hub', payload: { kind: kind, data: data } })).catch(function () { return 'error'; });
      },
      on: function (kind, fn) { ensureChannel(); bcast[kind] = fn; }
    }
  };
}

function connectSupabase(cfg) {
  return loadScript(SB_SDK).then(function () {
    var client = window.supabase.createClient(cfg.url, cfg.anonKey, { realtime: { params: { eventsPerSecond: 40 } } });
    return SupabaseStore(client, cfg.bucket || 'hounds-images');
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
    // Firebase
    'permission-denied': 'Você não tem permissão para alterar este hub. Recarregue a página e entre de novo.',
    'unauthenticated': 'Sua sessão expirou. Recarregue a página e tente de novo.',
    'resource-exhausted': 'O limite do banco de dados foi atingido. Espere um pouco; se continuar, o limite gratuito do dia acabou.',
    'unavailable': 'Sem conexão com o banco de dados. Verifique a internet e tente de novo.'
  };
  if (e && e.name === 'QuotaExceededError') return 'O navegador ficou sem espaço para guardar a imagem.';
  return M[c] || 'Não foi possível salvar. Verifique a conexão e tente de novo.';
}
