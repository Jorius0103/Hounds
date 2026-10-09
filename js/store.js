/* =====================================================================
   Hounds — Banco de Dados, Armazenamento & Sincronização
   ===================================================================== */

var FB_SDK = 'https://www.gstatic.com/firebasejs/12.19.0/';
var SB_SDK = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

function fbConfig() {
  var c = window.HOUNDS_FIREBASE;
  return c && c.apiKey && c.projectId ? c : null;
}

function sbConfig() {
  var c = window.HOUNDS_SUPABASE;
  return c && c.url && c.anonKey ? c : null;
}

function loadScript(src) {
  return new Promise(function (res, rej) {
    var s = document.createElement('script');
    s.src = src;
    s.onload = res;
    s.onerror = function () { rej(new Error('script ' + src)); };
    document.head.appendChild(s);
  });
}

function SharedStore(db, assets, user) {
  var canWrite = true;
  function rows(s) {
    return s.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
  }
  return {
    kind: 'shared',
    canUpload: !!assets,
    canWrite: function () { return canWrite; },
    init: function () {
      if (!user) return Promise.resolve();
      return Promise.resolve(user.can('data.write')).then(function (v) {
        if (v === false) canWrite = false;
      }).catch(function () {});
    },
    watch: function (col, cb, err) {
      return db.collection(col).orderBy('createdAt').onSnapshot(function (s) { cb(rows(s)); }, err);
    },
    all: function (col) { return db.collection(col).get().then(rows); },
    query: function (col, field, value) { return db.collection(col).where(field, '==', value).get().then(rows); },
    put: function (col, id, body) {
      var ref = id ? db.collection(col).doc(id) : db.collection(col).doc();
      return ref.set(body).then(function () { return ref.id; });
    },
    patch: function (col, id, p) { return db.collection(col).doc(id).update(p); },
    remove: function (col, id) { return db.collection(col).doc(id).delete(); },
    upload: function (file) {
      return assets.upload(file, { type: file.type }).then(function (u) {
        return { ref: u.id, type: u.contentType, size: u.sizeBytes };
      });
    },
    imageUrl: function (ref) { return Promise.resolve(ref ? '/_blob/' + ref : ''); },
    dropImage: function (ref) { return assets && ref ? assets.delete(ref).catch(function () {}) : Promise.resolve(); }
  };
}

function LocalStore() {
  function req(r) {
    return new Promise(function (res, rej) {
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  }
  var dbp = new Promise(function (res, rej) {
    var rq = indexedDB.open('hounds-world', 1);
    rq.onupgradeneeded = function () {
      var d = rq.result;
      var docs = d.createObjectStore('docs', { keyPath: 'k' });
      docs.createIndex('col', 'col');
      d.createObjectStore('images');
    };
    rq.onsuccess = function () { res(rq.result); };
    rq.onerror = function () { rej(rq.error); };
  });

  function tx(stores, mode, fn) {
    return dbp.then(function (d) {
      return new Promise(function (res, rej) {
        var t = d.transaction(stores, mode), out;
        t.oncomplete = function () { res(out); };
        t.onerror = function () { rej(t.error); };
        t.onabort = function () { rej(t.error); };
        try { out = fn(t); } catch (e) { rej(e); }
      });
    });
  }

  var urls = {}, watchers = {};
  var syncBc = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      syncBc = new BroadcastChannel('hounds_world_realtime_sync');
      syncBc.onmessage = function (ev) {
        if (ev && ev.data && ev.data.col) {
          emit(ev.data.col, false);
          if (window.AppLogger) window.AppLogger.sync('REALTIME_SYNC', 'Dados atualizados em tempo real de outra aba/sessão', { col: ev.data.col });
        }
      };
    }
  } catch (e) {}

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', function (e) {
      if (e.key === 'hounds_sync_ping_v1' && e.newValue) {
        var col = e.newValue.split(':')[0];
        if (col) emit(col, false);
      }
    });
  }

  function emit(col, broadcast) {
    list(col).then(function (l) {
      (watchers[col] || []).forEach(function (cb) { cb(l); });
    });
    if (broadcast !== false) {
      if (syncBc) {
        try { syncBc.postMessage({ col: col, timestamp: Date.now() }); } catch (e) {}
      }
      try {
        localStorage.setItem('hounds_sync_ping_v1', col + ':' + Date.now());
      } catch (e) {}
    }
  }

  function list(col) {
    return tx(['docs'], 'readonly', function (t) {
      return req(t.objectStore('docs').index('col').getAll(col));
    }).then(function (rows) {
      return (rows || []).map(function (r) {
        return Object.assign({ id: r.id }, r.data);
      }).sort(function (a, b) {
        return (a.createdAt || 0) - (b.createdAt || 0);
      });
    });
  }

  function write(col, id, body) {
    return tx(['docs'], 'readwrite', function (t) {
      t.objectStore('docs').put({ k: col + '|' + id, col: col, id: id, data: body });
    }).then(function () {
      emit(col, true);
      if (window.AppLogger) window.AppLogger.info('DB_WRITE', 'Documento salvo em ' + col, { id: id });
      return id;
    });
  }

  return {
    kind: 'local',
    canUpload: true,
    canWrite: function () { return true; },
    init: function () { return dbp; },
    watch: function (col, cb, err) {
      (watchers[col] = watchers[col] || []).push(cb);
      list(col).then(cb, err);
      return function () {
        watchers[col] = (watchers[col] || []).filter(function (x) { return x !== cb; });
      };
    },
    all: list,
    query: function (col, field, value) {
      return list(col).then(function (l) {
        return l.filter(function (d) { return d[field] === value; });
      });
    },
    put: function (col, id, body) { return write(col, id || uid(), body); },
    patch: function (col, id, p) {
      return tx(['docs'], 'readonly', function (t) {
        return req(t.objectStore('docs').get(col + '|' + id));
      }).then(function (r) {
        if (!r) throw { code: 'invalid_argument' };
        return write(col, id, Object.assign({}, r.data, p));
      });
    },
    remove: function (col, id) {
      return tx(['docs'], 'readwrite', function (t) {
        t.objectStore('docs').delete(col + '|' + id);
      }).then(function () { emit(col); });
    },
    upload: function (file) {
      var ref = 'img_' + uid();
      return tx(['images'], 'readwrite', function (t) {
        t.objectStore('images').put(file, ref);
      }).then(function () {
        return { ref: ref, type: file.type, size: file.size };
      });
    },
    imageUrl: function (ref) {
      if (!ref) return Promise.resolve('');
      if (ref.indexOf('http://') === 0 || ref.indexOf('https://') === 0 || ref.indexOf('/') === 0 || ref.indexOf('data:') === 0) {
        return Promise.resolve(ref);
      }
      if (urls[ref]) return Promise.resolve(urls[ref]);
      return tx(['images'], 'readonly', function (t) {
        return req(t.objectStore('images').get(ref));
      }).then(function (b) {
        return b ? (urls[ref] = URL.createObjectURL(b)) : '';
      });
    },
    dropImage: function (ref) {
      if (!ref) return Promise.resolve();
      if (urls[ref]) { URL.revokeObjectURL(urls[ref]); delete urls[ref]; }
      return tx(['images'], 'readwrite', function (t) {
        t.objectStore('images').delete(ref);
      });
    }
  };
}

function SupabaseStore(client, bucket) {
  var bName = bucket || "hounds-images", T = "hounds_docs";
  var cols = {}, channel = null, live = false, bcast = {};

  function stable(v) {
    if (Array.isArray(v)) return "[" + v.map(function (x) { return x === undefined ? "null" : stable(x); }).join(",") + "]";
    if (v && typeof v === "object") return "{" + Object.keys(v).sort().filter(function (k) { return v[k] !== undefined; }).map(function (k) { return JSON.stringify(k) + ":" + stable(v[k]); }).join(",") + "}";
    return JSON.stringify(v);
  }

  function doc(row) { return Object.assign({ id: row.id }, row.data); }
  function byCreated(a, b) { return (a.createdAt || 0) - (b.createdAt || 0); }
  function list(c) { return Object.keys(c.rows).map(function (k) { return c.rows[k]; }).sort(byCreated); }

  function emit(c) {
    if (c.queued) return;
    c.queued = true;
    Promise.resolve().then(function () {
      c.queued = false;
      if (cols[c.col] !== c || !c.ready) return;
      var l = list(c);
      c.subs.slice().forEach(function (cb) { cb(l.slice()); });
    });
  }

  function fetchRows(col) {
    return client.from(T).select("id, data").eq("col", col).then(function (res) {
      if (res.error) throw res.error;
      return res.data || [];
    });
  }

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
    var del = p.eventType === "DELETE", row = del ? p.old : p.new;
    if (!row || row.id == null) return;
    var id = row.id, q = c.echo[id];
    if (q) {
      var now = Date.now(), hit = -1;
      q = q.filter(function (e) { return now - e.at < 15000; });
      for (var i = 0; i < q.length; i++) if (isEcho(q[i], del, row)) { hit = i; break; }
      if (hit >= 0) q.splice(0, hit + 1);
      if (q.length) { c.echo[id] = q; return; }
      delete c.echo[id];
    }
    c.ver[id] = (c.ver[id] || 0) + 1;
    if (del) {
      if (!(id in c.rows)) return;
      delete c.rows[id];
    } else if (row.data === undefined) {
      refetch(c, id); return;
    } else {
      var d = doc(row);
      if (c.rows[id] && stable(c.rows[id]) === stable(d)) return;
      c.rows[id] = d;
    }
    if (!replay) emit(c);
  }

  function refetch(c, id) {
    var v = c.ver[id];
    client.from(T).select("id, data").eq("col", c.col).eq("id", id).then(function (res) {
      if (res.error || cols[c.col] !== c || c.ver[id] !== v) return;
      var r = res.data && res.data[0];
      if (r) c.rows[id] = doc(r); else delete c.rows[id];
      emit(c);
    });
  }

  function onChange(p) {
    var row = p && (p.eventType === "DELETE" ? p.old : p.new), c = row && cols[row.col];
    if (!c) return;
    if (c.buffer) c.buffer.push(p);
    if (c.ready) apply(c, p, false);
  }

  function ensureChannel() {
    if (channel) return;
    channel = client.channel("hounds", { config: { broadcast: { self: false } } })
      .on("postgres_changes", { event: "*", schema: "public", table: T }, onChange)
      .on("broadcast", { event: "hub" }, function (m) { var p = m && m.payload, f = p && bcast[p.kind]; if (f) f(p.data); });
    channel.subscribe(function (status) {
      live = status === "SUBSCRIBED";
      if (live) resync();
    });
    document.addEventListener("visibilitychange", function () { if (!document.hidden) resync(); });
    window.addEventListener("online", resync);
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
    if (typeof value !== "string") return all(col).then(function (l) { return l.filter(function (d) { return d[field] === value; }); });
    return client.from(T).select("id, data").eq("col", col).eq("data->>" + field, value)
      .then(function (res) { if (res.error) throw res.error; return (res.data || []).map(doc).sort(byCreated); });
  }

  function put(col, id, body) {
    var docId = id || uid(), c = cols[col];
    if (c && c.ready) { expect(c, docId, { val: stable(body) }); c.rows[docId] = Object.assign({ id: docId }, body); emit(c); }
    return client.from(T).upsert({ col: col, id: docId, data: body, updated_at: new Date().toISOString() }, { onConflict: "col,id" })
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
    return client.rpc("patch_hounds_doc", { p_col: col, p_id: id, p_patch: p }).then(function (res) {
      if (!res.error) return;
      return client.from(T).select("data").eq("col", col).eq("id", id).single().then(function (sel) {
        if (sel.error) throw sel.error;
        var merged = Object.assign({}, sel.data && sel.data.data, p);
        return client.from(T).upsert({ col: col, id: id, data: merged, updated_at: new Date().toISOString() }, { onConflict: "col,id" })
          .then(function (uRes) { if (uRes.error) throw uRes.error; });
      });
    }).catch(function (e) { failed(col, id); throw e; });
  }

  function remove(col, id) {
    var c = cols[col];
    if (c && c.ready && c.rows[id]) { expect(c, id, { del: true }); delete c.rows[id]; emit(c); }
    return client.from(T).delete().eq("col", col).eq("id", id)
      .then(function (res) { if (res.error) throw res.error; })
      .catch(function (e) { failed(col, id); throw e; });
  }

  function upload(file) {
    var ext = file.name ? file.name.slice(file.name.lastIndexOf(".")) : "";
    if (!ext && file.type) {
      var map = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" };
      ext = map[file.type] || "";
    }
    var ref = uid() + (ext || "");
    return client.storage.from(bName).upload(ref, file, { contentType: file.type, upsert: true }).then(function (res) {
      if (res.error) throw res.error;
      return { ref: ref, type: file.type, size: file.size };
    });
  }

  function imageUrl(ref) {
    if (!ref) return Promise.resolve("");
    if (ref.indexOf("http://") === 0 || ref.indexOf("https://") === 0 || ref.indexOf("data:") === 0) return Promise.resolve(ref);
    var res = client.storage.from(bName).getPublicUrl(ref);
    return Promise.resolve(res && res.data ? res.data.publicUrl : "");
  }

  function dropImage(ref) {
    if (!ref) return Promise.resolve();
    return client.storage.from(bName).remove([ref]).then(function () {});
  }

  return {
    kind: "supabase",
    canUpload: true,
    canWrite: function () { return true; },
    init: function () { return Promise.resolve(); },
    watch: watch, all: all, query: query, put: put, patch: patch, remove: remove,
    upload: upload, imageUrl: imageUrl, dropImage: dropImage,
    saveDelay: 300,
    inlineMax: 5000000,
    realtime: {
      send: function (kind, data) {
        if (!channel || !live) return Promise.resolve("closed");
        return Promise.resolve(channel.send({ type: "broadcast", event: "hub", payload: { kind: kind, data: data } })).catch(function () { return "error"; });
      },
      on: function (kind, fn) { ensureChannel(); bcast[kind] = fn; }
    }
  };
}

function connectSupabase(cfg) {
  return loadScript(SB_SDK).then(function () {
    var client = window.supabase.createClient(cfg.url, cfg.anonKey, { realtime: { params: { eventsPerSecond: 40 } } });
    return SupabaseStore(client, cfg.bucket || "hounds-images");
  });
}

function errorText(e) {
  if (e && e.message) return e.message;
  var c = e && e.code;
  var M = {
    too_large: 'A imagem passa de 20 MB. Reduza o arquivo e tente de novo.',
    unsupported_type: 'Esse formato não é aceito. Use PNG, JPG, WebP ou GIF.',
    quota_exceeded: 'O limite de dados deste hub foi atingido. Exclua itens que não usa mais.',
    rate_limited: 'Muitas ações seguidas. Espere alguns segundos e tente de novo.',
    invalid_argument: 'Você não tem permissão para alterar este hub.',
    cycle: 'Esse mapa pai criaria um ciclo na hierarquia. Escolha outro.'
  };
  return M[c] || 'Não foi possível salvar. Verifique a conexão e tente de novo.';
}

/* =====================================================================
   Estado Global W (Modelos & Escritas)
   ===================================================================== */
var W = {
  store: null,
  maps: [],
  locations: [],
  characters: [],
  raw: { maps: [], locations: [], characters: [], notebooks: [], notes: [] },
  notebooks: [],
  notes: [],
  users: [],
  loaded: { maps: false, locations: false, characters: false, users: false, notebooks: false, notes: false },
  mapIdx: {},
  locIdx: {},
  charIdx: {},
  parent: {},
  kids: {}
};

function indexMaps() {
  var idx = {};
  W.maps.forEach(function (m) { idx[m.id] = m; });
  W.mapIdx = idx;

  var parent = {};
  W.maps.forEach(function (m) {
    if (m.parentId && idx[m.parentId] && m.parentId !== m.id) {
      parent[m.id] = m.parentId;
    }
  });

  // Quebra loops
  Object.keys(parent).forEach(function (id) {
    var seen = {}, cur = id;
    while (cur) {
      if (seen[cur]) { delete parent[id]; break; }
      seen[cur] = true;
      cur = parent[cur];
    }
  });
  W.parent = parent;

  var kids = {};
  W.maps.forEach(function (m) {
    var p = parent[m.id] || null;
    kids[p] = kids[p] || [];
    kids[p].push(m);
  });
  Object.keys(kids).forEach(function (k) {
    kids[k].sort(byName);
  });
  W.kids = kids;
}

function now() { return Date.now(); }

var Ops = {
  createMap: function (name, parentId, file, dims, visible) {
    return W.store.upload(file).then(function (up) {
      var t = now();
      return W.store.put('maps', null, {
        v: 2,
        name: name,
        parentId: parentId || null,
        visible: visible !== false,
        image: { ref: up.ref, w: dims.w, h: dims.h, type: up.type, size: up.size },
        createdAt: t,
        updatedAt: t
      });
    });
  },
  updateMap: function (id, name, parentId, visible) {
    return W.store.patch('maps', id, {
      name: name,
      parentId: parentId || null,
      visible: visible !== false,
      updatedAt: now()
    });
  },
  deleteMap: function (m) {
    var up = W.parent[m.id] || null, col = 'maps/' + m.id + '/markers';
    var seq = Promise.resolve();
    function then(f) { seq = seq.then(f); }
    then(function () {
      return W.store.all(col).then(function (l) {
        return l.reduce(function (p, d) {
          return p.then(function () { return W.store.remove(col, d.id); });
        }, Promise.resolve());
      });
    });
    W.raw.maps.filter(function (c) { return c.parentId === m.id; }).forEach(function (c) {
      then(function () { return W.store.patch('maps', c.id, { parentId: up, updatedAt: now() }); });
    });
    W.raw.locations.filter(function (l) { return l.mapId === m.id; }).forEach(function (l) {
      then(function () { return W.store.patch('locations', l.id, { mapId: up, updatedAt: now() }); });
    });
    then(function () { return W.store.remove('maps', m.id); });
    return seq;
  },
  createLocation: function (name, desc, mapId, charIds, file, visible) {
    var imgP = file ? W.store.upload(file) : Promise.resolve(null);
    return imgP.then(function (up) {
      var t = now();
      return W.store.put('locations', null, {
        v: 2,
        name: name,
        description: desc || '',
        mapId: mapId || null,
        characterIds: charIds || [],
        visible: visible !== false,
        image: up ? { ref: up.ref, type: up.type, size: up.size } : null,
        createdAt: t,
        updatedAt: t
      });
    });
  },
  updateLocation: function (l, name, desc, mapId, charIds, file, rmImg, visible) {
    var imgP = file ? W.store.upload(file) : Promise.resolve(null);
    return imgP.then(function (up) {
      var p = {
        name: name,
        description: desc || '',
        mapId: mapId || null,
        characterIds: charIds || [],
        visible: visible !== false,
        updatedAt: now()
      };
      if (up) p.image = { ref: up.ref, type: up.type, size: up.size };
      else if (rmImg) p.image = null;
      return W.store.patch('locations', l.id, p);
    });
  },
  deleteLocation: function (l) {
    return W.store.remove('locations', l.id);
  },
  createCharacter: function (name, desc, race, org, mapIds, locIds, file, visible) {
    var imgP = file ? W.store.upload(file) : Promise.resolve(null);
    return imgP.then(function (up) {
      var t = now();
      return W.store.put('characters', null, {
        v: 2,
        name: name,
        description: desc || '',
        race: race || '',
        organization: org || '',
        mapIds: mapIds || [],
        visible: visible !== false,
        image: up ? { ref: up.ref, type: up.type, size: up.size } : null,
        createdAt: t,
        updatedAt: t
      }).then(function (cid) {
        if (locIds && locIds.length) {
          locIds.forEach(function (lid) {
            var loc = locById(lid);
            if (loc && (loc.characterIds || []).indexOf(cid) < 0) {
              W.store.patch('locations', lid, { characterIds: (loc.characterIds || []).concat([cid]), updatedAt: now() });
            }
          });
        }
        return cid;
      });
    });
  },
  updateCharacter: function (c, name, desc, race, org, mapIds, locIds, file, rmImg, visible) {
    var imgP = file ? W.store.upload(file) : Promise.resolve(null);
    return imgP.then(function (up) {
      var p = {
        name: name,
        description: desc || '',
        race: race || '',
        organization: org || '',
        mapIds: mapIds || [],
        visible: visible !== false,
        updatedAt: now()
      };
      if (up) p.image = { ref: up.ref, type: up.type, size: up.size };
      else if (rmImg) p.image = null;
      return W.store.patch('characters', c.id, p);
    });
  },
  deleteCharacter: function (c) {
    return W.store.remove('characters', c.id);
  },
  createNotebook: function (name, visible) {
    var t = now();
    return W.store.put('notebooks', null, { name: name, visible: visible !== false, createdAt: t, updatedAt: t });
  },
  updateNotebook: function (nb, name, visible) {
    return W.store.patch('notebooks', nb.id, { name: name, visible: visible !== false, updatedAt: now() });
  },
  deleteNotebook: function (nb) {
    return W.store.remove('notebooks', nb.id);
  },
  createNote: function (notebookId, title, body, visible) {
    var t = now();
    return W.store.put('notes', null, { notebookId: notebookId, title: title, body: body || '', visible: visible !== false, createdAt: t, updatedAt: t });
  },
  updateNote: function (noteId, title, body, visible) {
    return W.store.patch('notes', noteId, { title: title, body: body || '', visible: visible !== false, updatedAt: now() });
  },
  deleteNote: function (noteId) {
    return W.store.remove('notes', noteId);
  },
  saveUser: function (id, name, role) {
    var t = now();
    return W.store.put('users', id, { name: name, role: role, createdAt: t, updatedAt: t });
  },
  deleteUser: function (id) {
    return W.store.remove('users', id);
  }
};

/* =====================================================================
   Importação & Exportação Completa do Banco de Dados
   ===================================================================== */
function exportDatabase() {
  if (window.AppLogger) window.AppLogger.info('BACKUP', 'Iniciando exportação do banco de dados');
  var cols = ['maps', 'locations', 'characters', 'notebooks', 'notes', 'users', 'mesa'];
  var dump = {
    exportedAt: new Date().toISOString(),
    version: '2.0',
    app: 'Hounds — Campanha GURPS',
    collections: {},
    localData: {}
  };

  cols.forEach(function (col) {
    dump.collections[col] = W.raw[col] || W[col] || [];
  });

  var lsKeys = [
    'gurps_combat_master_data_v2',
    'gurps_combat_master_conditions_v2',
    'gurps_fixed_personagens_v1',
    'gurps_tactical_state_v1',
    'gurps_combat_master_users_v2'
  ];
  lsKeys.forEach(function (k) {
    try {
      var val = localStorage.getItem(k);
      if (val) dump.localData[k] = JSON.parse(val);
    } catch (e) {}
  });

  var json = JSON.stringify(dump, null, 2);
  var blob = new Blob([json], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  var ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  a.href = url;
  a.download = 'hounds_banco_campanha_' + ts + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);

  if (window.AppLogger) window.AppLogger.sync('BACKUP', 'Banco exportado com sucesso', { colecoes: Object.keys(dump.collections).length });
  return dump;
}

function importDatabase(jsonString) {
  return new Promise(function (resolve, reject) {
    var data;
    try {
      data = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
    } catch (e) {
      if (window.AppLogger) window.AppLogger.error('BACKUP', 'Arquivo JSON inválido para importação', e);
      return reject(new Error('Arquivo JSON inválido ou corrompido.'));
    }

    if (!data || (!data.collections && !data.combats && !data.maps)) {
      return reject(new Error('Formato de backup não reconhecido.'));
    }

    if (window.AppLogger) window.AppLogger.info('BACKUP', 'Importando dados para o banco...', { data: data });

    var cols = data.collections || {};
    var seq = Promise.resolve();

    Object.keys(cols).forEach(function (col) {
      var items = cols[col];
      if (Array.isArray(items)) {
        items.forEach(function (item) {
          if (item && item.id) {
            seq = seq.then(function () {
              var body = Object.assign({}, item);
              delete body.id;
              return W.store.put(col, item.id, body).catch(function (e) {
                console.warn('Erro ao restaurar ' + col + '/' + item.id, e);
              });
            });
          }
        });
      }
    });

    if (data.localData) {
      Object.keys(data.localData).forEach(function (k) {
        try {
          localStorage.setItem(k, JSON.stringify(data.localData[k]));
        } catch (e) {}
      });
    }

    if (data.combats && Array.isArray(data.combats)) {
      try {
        localStorage.setItem('gurps_combat_master_data_v2', JSON.stringify(data.combats));
      } catch (e) {}
    }
    if (data.conditions && Array.isArray(data.conditions)) {
      try {
        localStorage.setItem('gurps_combat_master_conditions_v2', JSON.stringify(data.conditions));
      } catch (e) {}
    }
    if (data.players && Array.isArray(data.players)) {
      try {
        localStorage.setItem('gurps_fixed_personagens_v1', JSON.stringify(data.players));
      } catch (e) {}
    }

    seq.then(function () {
      if (window.AppLogger) window.AppLogger.sync('BACKUP', 'Importação concluída com sucesso');
      if (typeof BroadcastChannel !== 'undefined') {
        try {
          var bc = new BroadcastChannel('hounds_world_realtime_sync');
          bc.postMessage({ col: 'all', timestamp: Date.now() });
        } catch (e) {}
      }
      try { localStorage.setItem('hounds_sync_ping_v1', 'all:' + Date.now()); } catch (e) {}
      resolve(data);
    }).catch(reject);
  });
}

window.W = W;
window.Ops = Ops;
window.indexMaps = indexMaps;
window.exportDatabase = exportDatabase;
window.importDatabase = importDatabase;
