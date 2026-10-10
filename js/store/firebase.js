/* =====================================================================
   Hounds — Armazenamento: Firebase
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   Firebase backend, for the site hosted outside claude.ai (GitHub Pages)
     Documents: Cloud Firestore, same collections and API as SharedStore.
     Images:    also in Firestore, split in pieces, so the free Spark plan
                is enough (Cloud Storage requires the Blaze plan).
       images/{ref}             { n, type, size, createdAt }
       image_chunks/{ref}_{i}   { ref, i, data: Bytes }
     Access: one campaign account (e-mail + password) checked by
     firestore.rules. Set up in firebase-config.js; see FIREBASE.md.
   ===================================================================== */
var FB_SDK = 'https://www.gstatic.com/firebasejs/12.19.0/';
var SB_SDK = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
var BRAND_MARK = '<img src="imagens/brasao.jpg" alt="" width="256" height="256">';
function fbConfig() { var c = window.HOUNDS_FIREBASE; return c && c.apiKey && c.projectId ? c : null; }
function sbConfig() { var c = window.HOUNDS_SUPABASE; return c && c.url && c.anonKey ? c : null; }
function loadScript(src) {
  return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('script ' + src)); }; document.head.appendChild(s); });
}

function FirestoreImages(db) {
  var PIECE = 900000, urls = {}, busy = {};
  // Pieces never change once written, so each browser downloads an image only once.
  var cache = (function () {
    var p = null;
    function open() {
      if (!p) p = new Promise(function (res) {
        try {
          var rq = indexedDB.open('hounds-image-cache', 1);
          rq.onupgradeneeded = function () { rq.result.createObjectStore('img'); };
          rq.onsuccess = function () { res(rq.result); };
          rq.onerror = function () { res(null); };
        } catch (e) { res(null); }
      });
      return p;
    }
    function run(mode, fn) {
      return open().then(function (d) {
        if (!d) return null;
        return new Promise(function (res) { try { var r = fn(d.transaction('img', mode).objectStore('img')); r.onsuccess = function () { res(r.result); }; r.onerror = function () { res(null); }; } catch (e) { res(null); } });
      });
    }
    return {
      get: function (ref) { return run('readonly', function (s) { return s.get(ref); }); },
      set: function (ref, blob) { return run('readwrite', function (s) { return s.put(blob, ref); }); },
      drop: function (ref) { return run('readwrite', function (s) { return s.delete(ref); }); }
    };
  })();
  function newRef() { var a = new Uint8Array(16); crypto.getRandomValues(a); return Array.prototype.map.call(a, function (b) { return (b < 16 ? '0' : '') + b.toString(16); }).join(''); }
  function piece(ref, i) { return db.collection('image_chunks').doc(ref + '_' + i); }
  function download(ref) {
    return db.collection('images').doc(ref).get().then(function (h) {
      if (!h.exists) return null;
      var m = h.data(), gets = [];
      for (var i = 0; i < m.n; i++) gets.push(piece(ref, i).get());
      return Promise.all(gets).then(function (ps) {
        if (ps.some(function (p) { return !p.exists; })) return null;
        return new Blob(ps.map(function (p) { return p.data().data.toUint8Array(); }), { type: m.type || '' });
      });
    });
  }
  return {
    upload: function (file) {
      var ref = newRef();
      return file.arrayBuffer().then(function (buf) {
        var bytes = new Uint8Array(buf), n = Math.max(1, Math.ceil(bytes.length / PIECE)), seq = Promise.resolve();
        for (var i = 0; i < n; i++) (function (i) {
          seq = seq.then(function () { return piece(ref, i).set({ ref: ref, i: i, data: firebase.firestore.Blob.fromUint8Array(bytes.slice(i * PIECE, (i + 1) * PIECE)) }); });
        })(i);
        // The head goes last: an image without one is never shown.
        return seq.then(function () { return db.collection('images').doc(ref).set({ n: n, type: file.type, size: file.size, createdAt: Date.now() }); });
      }).then(function () { cache.set(ref, file); return { id: ref, contentType: file.type, sizeBytes: file.size }; });
    },
    url: function (ref) {
      if (!ref) return Promise.resolve('');
      if (urls[ref]) return Promise.resolve(urls[ref]);
      if (!busy[ref]) busy[ref] = cache.get(ref).then(function (b) {
        return b || download(ref).then(function (d) { if (d) cache.set(ref, d); return d; });
      }).then(function (b) { delete busy[ref]; return b ? (urls[ref] = URL.createObjectURL(b)) : ''; }, function () { delete busy[ref]; return ''; });
      return busy[ref];
    },
    delete: function (ref) {
      if (urls[ref]) { URL.revokeObjectURL(urls[ref]); delete urls[ref]; }
      cache.drop(ref);
      return db.collection('images').doc(ref).get().then(function (h) {
        var n = h.exists ? h.data().n : 0, dels = [];
        for (var i = 0; i < n; i++) dels.push(piece(ref, i).delete());
        return Promise.all(dels).then(function () { return db.collection('images').doc(ref).delete(); });
      });
    }
  };
}

function FirebaseStore(db) {
  var imgs = FirestoreImages(db), s = SharedStore(db, imgs, null);
  s.kind = 'firebase';
  s.imageUrl = imgs.url;
  return s;
}

// Shown once per browser; Firebase keeps the session afterwards.
function askPassword(auth, email) {
  return new Promise(function (done) {
    var g = document.createElement('div');
    g.className = 'gate'; g.style.zIndex = '95';
    g.innerHTML = '<form class="gate-card" role="dialog" aria-modal="true" aria-labelledby="authTitle" novalidate>' +
      '<div class="gate-head"><div class="brand-mark" aria-hidden="true">' + BRAND_MARK + '</div><h1 id="authTitle">Hounds</h1><p>Digite a senha da campanha</p></div>' +
      '<div class="field"><label for="authPass">Senha</label><input type="password" id="authPass" autocomplete="current-password"><p class="err" id="authErr" hidden></p></div>' +
      '<button class="btn primary gate-close" type="submit">Entrar</button></form>';
    document.body.appendChild(g);
    var form = g.querySelector('form'), inp = g.querySelector('#authPass'), err = g.querySelector('#authErr'), btn = g.querySelector('button');
    form.onsubmit = function (ev) {
      ev.preventDefault();
      if (!inp.value) { inp.focus(); return; }
      btn.disabled = true; err.hidden = true;
      auth.signInWithEmailAndPassword(email, inp.value).then(function () { g.remove(); done(); }, function (e) {
        var c = e && e.code;
        err.textContent = c === 'auth/too-many-requests' ? 'Muitas tentativas. Espere alguns minutos e tente de novo.' : c === 'auth/network-request-failed' ? 'Sem conexão. Verifique a internet e tente de novo.' : 'Senha incorreta.';
        err.hidden = false; btn.disabled = false; inp.select();
      });
    };
    inp.focus();
  });
}

function connectFirebase(cfg) {
  return ['app', 'auth', 'firestore'].reduce(function (p, n) { return p.then(function () { return loadScript(FB_SDK + 'firebase-' + n + '-compat.js'); }); }, Promise.resolve()).then(function () {
    var opts = Object.assign({}, cfg); delete opts.campaignEmail;
    var app = firebase.initializeApp(opts), auth = app.auth();
    return new Promise(function (res) { var off = auth.onAuthStateChanged(function (u) { off(); res(u); }); })
      .then(function (u) { return u || askPassword(auth, cfg.campaignEmail); })
      .then(function () { var db = app.firestore(); db.settings({ ignoreUndefinedProperties: true }); return FirebaseStore(db); });
  });
}
