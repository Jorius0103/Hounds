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
  function emit(col) {
    list(col).then(function (l) {
      (watchers[col] || []).forEach(function (cb) { cb(l); });
    });
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
    }).then(function () { emit(col); return id; });
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

function SupabaseStore(client, bName) {
  function rows(res) {
    if (res.error) throw res.error;
    return (res.data || []).map(function (r) {
      return Object.assign({ id: r.id }, r.data);
    });
  }

  function all(col) {
    return client.from('hounds_docs').select('id, data').eq('col', col).then(rows);
  }

  function query(col, field, value) {
    return client.from('hounds_docs').select('id, data').eq('col', col).then(function (res) {
      return rows(res).filter(function (d) { return d[field] === value; });
    });
  }

  function put(col, id, body) {
    var docId = id || uid();
    return client.from('hounds_docs').upsert({
      col: col,
      id: docId,
      data: body,
      updated_at: new Date().toISOString()
    }, { onConflict: 'col,id' }).then(function (res) {
      if (res.error) throw res.error;
      return docId;
    });
  }

  function patch(col, id, p) {
    return client.from('hounds_docs').select('data').eq('col', col).eq('id', id).single().then(function (sel) {
      if (sel.error) throw sel.error;
      var merged = Object.assign({}, sel.data && sel.data.data, p);
      return client.from('hounds_docs').upsert({
        col: col,
        id: id,
        data: merged,
        updated_at: new Date().toISOString()
      }, { onConflict: 'col,id' }).then(function (uRes) {
        if (uRes.error) throw uRes.error;
      });
    });
  }

  function remove(col, id) {
    return client.from('hounds_docs').delete().eq('col', col).eq('id', id).then(function (res) {
      if (res.error) throw res.error;
    });
  }

  function watch(col, cb, err) {
    all(col).then(cb).catch(function (e) { if (err) err(e); });
    var chName = 'watch_' + col.replace(/[^a-zA-Z0-9_-]/g, '_') + '_' + Math.random().toString(36).slice(2, 8);
    var ch = client.channel(chName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hounds_docs', filter: 'col=eq.' + col }, function () {
        all(col).then(cb).catch(function (e) { if (err) err(e); });
      })
      .subscribe();
    return function () { client.removeChannel(ch); };
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
    if (ref.indexOf('http://') === 0 || ref.indexOf('https://') === 0 || ref.indexOf('/') === 0 || ref.indexOf('data:') === 0) {
      return Promise.resolve(ref);
    }
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
    watch: watch,
    all: all,
    query: query,
    put: put,
    patch: patch,
    remove: remove,
    upload: upload,
    imageUrl: imageUrl,
    dropImage: dropImage
  };
}

function connectSupabase(cfg) {
  return loadScript(SB_SDK).then(function () {
    var client = window.supabase.createClient(cfg.url, cfg.anonKey);
    return SupabaseStore(client, cfg.bucket || 'hounds-images');
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

window.W = W;
window.Ops = Ops;
window.indexMaps = indexMaps;
