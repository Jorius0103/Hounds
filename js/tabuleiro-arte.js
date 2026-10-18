/* =====================================================================
   Hounds — Tabuleiro: a biblioteca de arte do Mestre
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   The Art tab of the board's sidebar (the Mestre's), as Roll20's Art
   Library: the images he sent (boardArt, migration 34) and the ones the
   hub already has (characters, maps, places, organizations), to drag onto
   the board. A drop makes a token of one cell; with Alt, the image keeps
   its size in the board's pixels (good for scenery on the map layer).
   Images dropped from the computer onto the panel (or onto the board) go
   to the library. "Mostrar a todos" opens an image on everyone's screen.
   An image of the library is removed from the store only when no token
   uses it (see dropTokenImages).
   ===================================================================== */
var BoardArt = (function () {
  var root = null, un = null, list = [], q = '', sending = 0, DRAG = 'application/x-hounds-board';

  function start() { if (un || !W.store || !isMestre()) return; un = W.store.watch('boardArt', function (l) { list = l; renderList(); }, function () { toast('Não foi possível carregar a biblioteca de arte.', true); }); }
  function stop() { if (un) { un(); un = null; } list = []; }
  function match(s) { return !q || norm(s).indexOf(norm(q)) >= 0; }

  function mount(el) {
    root = el;
    root.innerHTML = '<div class="bd-side-top"><input type="search" id="bdArtQ" placeholder="Buscar imagens…" aria-label="Buscar imagens" autocomplete="off">' +
      '<label class="btn" title="Enviar imagens do computador para a biblioteca">' + svg(BOARD_ICON.upload, 15) + 'Enviar<input type="file" id="bdArtFile" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden></label></div>' +
      '<p class="bd-note bd-art-hint">Arraste para o mapa. Com <kbd>Alt</kbd>, a imagem fica do tamanho dela (boa para cenários na camada Mapa).</p>' +
      '<div class="bd-side-list" id="bdArtList"></div>';
    var qi = $('bdArtQ');
    qi.value = q;
    qi.oninput = function () { q = qi.value.trim(); renderList(); };
    $('bdArtFile').onchange = function () { var inp = /** @type {HTMLInputElement} */ (this), f = inp.files; if (f && f.length) addFiles([].slice.call(f)); inp.value = ''; };
    root.addEventListener('dragover', function (e) { if (hasFiles(e)) { e.preventDefault(); root.classList.add('drop'); } });
    root.addEventListener('dragleave', function (e) { if (!root.contains(/** @type {Node} */ (e.relatedTarget))) root.classList.remove('drop'); });
    root.addEventListener('drop', function (e) {
      root.classList.remove('drop');
      if (!hasFiles(e)) return;
      e.preventDefault();
      addFiles([].slice.call(e.dataTransfer.files));
    });
    var l = $('bdArtList');
    l.addEventListener('dragstart', function (e) {
      var t = e.target.closest('[data-drag]'); if (!t || !e.dataTransfer) return;
      e.dataTransfer.setData(DRAG, t.getAttribute('data-drag'));
      e.dataTransfer.setData('text/plain', t.getAttribute('title') || '');
      e.dataTransfer.effectAllowed = 'copy';
    });
    l.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var tile = b.closest('[data-drag]'), d = tile && JSON.parse(tile.getAttribute('data-drag'));
      if (!d) return;
      var act = b.getAttribute('data-art');
      if (act === 'del') removeArt(d.art);
      else if (act === 'show') showAll(d.ref, d.name);
      else if (act === 'put') BoardView.dropAt(d, null, false);
    });
    renderList();
  }
  function hasFiles(e) { return !!(e.dataTransfer && [].indexOf.call(e.dataTransfer.types || [], 'Files') >= 0); }

  // ----- the list -----
  function tile(d, mine) {
    return '<div class="bd-art-tile" draggable="true" data-drag="' + esc(JSON.stringify(d)) + '" title="' + esc(d.name || 'Imagem') + '">' +
      '<span class="im" data-img="' + esc(d.ref) + '"></span><span class="nm">' + esc(d.name || 'Imagem') + '</span>' +
      '<span class="acts"><button type="button" class="icon-btn" data-art="put" title="Pôr no centro do mapa" aria-label="Pôr no centro do mapa">' + svg(ICON.plus, 13, 2.4) + '</button>' +
      '<button type="button" class="icon-btn" data-art="show" title="Mostrar a todos" aria-label="Mostrar a todos">' + svg(BOARD_ICON.share, 13) + '</button>' +
      (mine ? '<button type="button" class="icon-btn" data-art="del" title="Tirar da biblioteca" aria-label="Tirar da biblioteca">' + svg(ICON.trash, 13) + '</button>' : '') + '</span></div>';
  }
  function imgOf(x) { var i = x.image; return { ref: i.ref, w: i.w || 0, h: i.h || 0, type: i.type || '', size: i.size || 0 }; }
  function renderList() {
    var el = root && $('bdArtList'); if (!el) return;
    var mine = list.filter(function (a) { return a.image && a.image.ref && match(a.name); }).sort(byName);
    var world = [];
    [['characters', 'Personagem'], ['maps', 'Mapa'], ['locations', 'Local'], ['organizations', 'Organização']].forEach(function (p) {
      (W[p[0]] || []).forEach(function (x) { if (x.image && x.image.ref && match(x.name)) world.push({ x: x, kind: p[1], col: p[0] }); });
    });
    var html = '<div class="bd-jr-sec"><h4 class="bd-art-h">Minha biblioteca <span class="count">' + mine.length + '</span>' + (sending ? ' <span class="bd-note">enviando ' + sending + '…</span>' : '') + '</h4>' +
      (mine.length ? '<div class="bd-art-grid">' + mine.map(function (a) { return tile(Object.assign({ kind: 'img', name: a.name, art: a.id }, imgOf(a)), true); }).join('') + '</div>'
        : '<div class="bd-art-empty">' + svg(BOARD_ICON.upload, 26, 1.6) + '<span>' + (q ? 'Nenhuma imagem com esse nome.' : 'Solte imagens aqui, ou use <b>Enviar</b>.') + '</span></div>') + '</div>' +
      '<details class="bd-jr-sec"' + (q ? ' open' : '') + '><summary>Do Mundo <span class="count">' + world.length + '</span></summary>' +
      (world.length ? '<div class="bd-art-grid">' + world.map(function (w) {
        var d = w.col === 'characters' ? Object.assign({ kind: 'char', id: w.x.id, name: w.x.name }, imgOf(w.x)) : Object.assign({ kind: 'img', name: w.x.name }, imgOf(w.x));
        return tile(d, false);
      }).join('') + '</div>' : '<p class="bd-note">Nenhuma imagem nos personagens, mapas, locais e organizações' + (q ? ' com esse nome' : '') + '.</p>') + '</details>';
    el.innerHTML = html;
    fillImages(el);
  }

  // ----- writing -----
  function dimsOf(file) {
    return new Promise(function (res, rej) {
      var u = URL.createObjectURL(file), im = new Image();
      im.onload = function () { URL.revokeObjectURL(u); res({ w: im.naturalWidth, h: im.naturalHeight }); };
      im.onerror = function () { URL.revokeObjectURL(u); rej({ message: 'Não foi possível abrir a imagem ' + file.name + '.' }); };
      im.src = u;
    });
  }
  // One image to the library: resolves with what a drop needs ({ kind: 'img', ref, w, h, ... }).
  function addFile(file) {
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) return Promise.reject({ code: 'unsupported_type' });
    if (file.size > 20 * 1024 * 1024) return Promise.reject({ code: 'too_large' });
    var name = String(file.name || 'Imagem').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim().slice(0, 80) || 'Imagem';
    sending++; renderList();
    return dimsOf(file).then(function (dims) {
      return W.store.upload(file).then(function (up) {
        var image = { ref: up.ref, w: dims.w, h: dims.h, type: up.type, size: up.size }, t = now();
        return W.store.put('boardArt', null, { name: name, image: image, folder: '', createdBy: me(), createdAt: t, updatedAt: t }).then(function (id) {
          return Object.assign({ kind: 'img', name: name, art: id }, image);
        }, function (er) { W.store.dropImage(up.ref); throw er; });
      });
    }).then(function (d) { sending--; renderList(); return d; }, function (er) { sending--; renderList(); throw er; });
  }
  function addFiles(files) {
    if (!isMestre() || !canWrite()) { toast('Só o Mestre guarda imagens na biblioteca.', true); return; }
    var imgs = files.filter(function (f) { return /^image\//.test(f.type); });
    if (!imgs.length) { toast('Solte imagens PNG, JPG, WebP ou GIF.', true); return; }
    imgs.reduce(function (p, f) { return p.then(function () { return addFile(f).catch(function (er) { toast(errorText(er), true); }); }); }, Promise.resolve())
      .then(function () { toast(imgs.length === 1 ? 'Imagem guardada na biblioteca.' : imgs.length + ' imagens guardadas na biblioteca.'); });
  }
  function removeArt(id) {
    var a = list.filter(function (x) { return x.id === id; })[0]; if (!a) return;
    W.store.remove('boardArt', id).then(function () { dropTokenImages([a.image && a.image.ref]); toast('Imagem tirada da biblioteca.'); }, function (er) { toast(errorText(er), true); });
  }

  // ----- an image on everyone's screen -----
  function showAll(ref, name) {
    var rt = W.store && W.store.realtime;
    showImage(ref, name);
    if (!rt) { toast('Mostrar a todos precisa do banco do site (Supabase).', true); return; }
    rt.send('tab-show', { kind: 'img', ref: ref, name: name || '', from: me() });
    toast('Imagem mostrada a todos.');
  }
  function showImage(ref, name) {
    var w = BoardWin.open('img:' + ref, { title: name || 'Imagem', cls: 'bd-imgwin', width: 460, x: 300, y: 50 });
    w.body.innerHTML = '<span class="bd-imgwin-im" data-img="' + esc(ref) + '"></span>';
    fillImages(w.body);
  }

  return { start: start, stop: stop, mount: mount, refresh: renderList, addFile: addFile, showImage: showImage, DRAG: DRAG };
})();
