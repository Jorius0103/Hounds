/* =====================================================================
   Hounds — Armazenamento: API genérica de documentos (artifact do claude.ai e IndexedDB local)
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   Storage: one generic document API, two backends
     Shared: the artifact's database + asset store (all viewers)
     Local:  IndexedDB in this browser (fallback)
   Collections
     maps                 { v, name, parentId, image{ref,w,h,type,size}, createdAt, updatedAt }
     maps/{id}/markers    { x, y (0..1 of the image), title, description, category, locationId, createdAt, updatedAt }
     locations            { v, name, description, image{...}|null, characterIds[], mapId, position|null, createdAt, updatedAt }
     characters           { name, source, mesaId, createdAt, updatedAt }
     organizations        { v, name, description, reputation, members[{ charId, rank }], createdAt, updatedAt }
   `position` on a location is reserved for coordinates inside its map.
   ===================================================================== */
function SharedStore(db, assets, user) {
  var canWrite = true;
  function rows(s) { return s.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }); }
  return {
    kind: 'shared',
    canUpload: !!assets,
    canWrite: function () { return canWrite; },
    init: function () {
      if (!user) return Promise.resolve();
      return Promise.resolve(user.can('data.write')).then(function (v) { if (v === false) canWrite = false; }).catch(function () {});
    },
    watch: function (col, cb, err) { return db.collection(col).orderBy('createdAt').onSnapshot(function (s) { cb(rows(s)); }, err); },
    all: function (col) { return db.collection(col).get().then(rows); },
    query: function (col, field, value) { return db.collection(col).where(field, '==', value).get().then(rows); },
    put: function (col, id, body) { var ref = id ? db.collection(col).doc(id) : db.collection(col).doc(); return ref.set(body).then(function () { return ref.id; }); },
    patch: function (col, id, p) { return db.collection(col).doc(id).update(p); },
    remove: function (col, id) { return db.collection(col).doc(id).delete(); },
    upload: function (file) { return assets.upload(file, { type: file.type }).then(function (u) { return { ref: u.id, type: u.contentType, size: u.sizeBytes }; }); },
    imageUrl: function (ref) { return Promise.resolve(ref ? '/_blob/' + ref : ''); },
    dropImage: function (ref) { return assets && ref ? assets.delete(ref).catch(function () {}) : Promise.resolve(); }
  };
}

function LocalStore() {
  function req(r) { return new Promise(function (res, rej) { r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; }); }
  var dbp = new Promise(function (res, rej) {
    var rq = indexedDB.open('hounds-world', 1);
    rq.onupgradeneeded = function () {
      var d = rq.result;
      var docs = d.createObjectStore('docs', { keyPath: 'k' }); docs.createIndex('col', 'col');
      d.createObjectStore('images');
    };
    rq.onsuccess = function () { res(rq.result); };
    rq.onerror = function () { rej(rq.error); };
  });
  function tx(stores, mode, fn) {
    return dbp.then(function (d) {
      return new Promise(function (res, rej) {
        var t = d.transaction(stores, mode), out;
        Promise.resolve(fn(t)).then(function (v) { out = v; });
        t.oncomplete = function () { res(out); };
        t.onerror = t.onabort = function () { rej(t.error); };
      });
    });
  }
  var watchers = {}, urls = {};
  function list(col) {
    return tx(['docs'], 'readonly', function (t) { return req(t.objectStore('docs').index('col').getAll(col)); })
      .then(function (l) { return l.map(function (r) { return Object.assign({ id: r.id }, r.data); }).sort(function (a, b) { return (a.createdAt || 0) - (b.createdAt || 0); }); });
  }
  function emit(col) { var w = watchers[col]; if (!w || !w.length) return; list(col).then(function (l) { w.slice().forEach(function (cb) { cb(l); }); }); }
  function write(col, id, data) { return tx(['docs'], 'readwrite', function (t) { t.objectStore('docs').put({ k: col + '|' + id, col: col, id: id, data: data }); }).then(function () { emit(col); return id; }); }
  // One-time copy of maps saved by the previous version of this page in this browser.
  function migrate() {
    if (!indexedDB.databases) return Promise.resolve();
    return tx(['docs'], 'readonly', function (t) { return req(t.objectStore('docs').get('meta|migrated')); }).then(function (done) {
      if (done) return;
      return indexedDB.databases().then(function (dbs) {
        if (!dbs.some(function (x) { return x.name === 'hounds-maps'; })) return;
        return new Promise(function (res) {
          var o = indexedDB.open('hounds-maps');
          o.onerror = function () { res(); };
          o.onsuccess = function () {
            var old = o.result;
            if (!old.objectStoreNames.contains('maps')) { old.close(); res(); return; }
            var t = old.transaction(['maps', 'markers', 'images'], 'readonly');
            Promise.all([req(t.objectStore('maps').getAll()), req(t.objectStore('markers').getAll()), req(t.objectStore('images').getAllKeys())]).then(function (r) {
              var t2 = old.transaction(['images'], 'readonly');
              return Promise.all(r[2].map(function (k) { return req(t2.objectStore('images').get(k)).then(function (b) { return [k, b]; }); })).then(function (imgs) {
                old.close();
                return tx(['docs', 'images'], 'readwrite', function (tw) {
                  imgs.forEach(function (p) { if (p[1]) tw.objectStore('images').put(p[1], p[0]); });
                  r[0].forEach(function (m) { var id = m.id; var d = Object.assign({}, m); delete d.id; d.parentId = null; tw.objectStore('docs').put({ k: 'maps|' + id, col: 'maps', id: id, data: d }); });
                  r[1].forEach(function (mk) { var col = 'maps/' + mk.mapId + '/markers'; var d = Object.assign({}, mk); delete d.id; delete d.mapId; tw.objectStore('docs').put({ k: col + '|' + mk.id, col: col, id: mk.id, data: d }); });
                  tw.objectStore('docs').put({ k: 'meta|migrated', col: 'meta', id: 'migrated', data: { at: Date.now() } });
                });
              });
            }).then(res, function () { res(); });
          };
        });
      });
    }).catch(function () {});
  }
  return {
    kind: 'local',
    canUpload: true,
    canWrite: function () { return true; },
    init: function () { return dbp.then(migrate); },
    watch: function (col, cb, err) { (watchers[col] = watchers[col] || []).push(cb); list(col).then(cb, err); return function () { watchers[col] = (watchers[col] || []).filter(function (x) { return x !== cb; }); }; },
    all: list,
    query: function (col, field, value) { return list(col).then(function (l) { return l.filter(function (d) { return d[field] === value; }); }); },
    put: function (col, id, body) { return write(col, id || uid(), body); },
    patch: function (col, id, p) {
      return tx(['docs'], 'readonly', function (t) { return req(t.objectStore('docs').get(col + '|' + id)); }).then(function (r) {
        if (!r) throw { code: 'invalid_argument' };
        return write(col, id, Object.assign({}, r.data, p));
      });
    },
    remove: function (col, id) { return tx(['docs'], 'readwrite', function (t) { t.objectStore('docs').delete(col + '|' + id); }).then(function () { emit(col); }); },
    upload: function (file) { var ref = 'img_' + uid(); return tx(['images'], 'readwrite', function (t) { t.objectStore('images').put(file, ref); }).then(function () { return { ref: ref, type: file.type, size: file.size }; }); },
    imageUrl: function (ref) {
      if (!ref) return Promise.resolve('');
      if (urls[ref]) return Promise.resolve(urls[ref]);
      return tx(['images'], 'readonly', function (t) { return req(t.objectStore('images').get(ref)); }).then(function (b) { return b ? (urls[ref] = URL.createObjectURL(b)) : ''; });
    },
    dropImage: function (ref) {
      if (!ref) return Promise.resolve();
      if (urls[ref]) { URL.revokeObjectURL(urls[ref]); delete urls[ref]; }
      return tx(['images'], 'readwrite', function (t) { t.objectStore('images').delete(ref); });
    }
  };
}
