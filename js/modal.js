/* =====================================================================
   Hounds — Modal e campo de imagem (usados pelos formulários de mapa e local)
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   Modal + image picker (shared by the map and location forms)
   ===================================================================== */
var modalBack = $('modalBack'), modal = $('modal'), modalOpen = null;
function showModal(html, onClose) {
  var m = modalOpen = { last: document.activeElement, onClose: onClose, busy: false, base: null, touched: false };
  modal.innerHTML = '<button class="icon-btn modal-x" type="button" aria-label="Fechar" title="Fechar (Esc)">' + svg(ICON.x, 18) + '</button>' + html;
  modalBack.hidden = false;
  var f = modal.querySelector('input[type=text],textarea,select'); if (f) setTimeout(function () { f.focus(); }, 20);
  // The form as it opened, once the caller has filled it in (right after this call).
  setTimeout(function () { if (modalOpen === m) m.base = modalFormState(); }, 0);
}

// Unsaved changes: the fields and the picks of the pickers, compared with how the form opened.
// Pickers' search boxes (role=combobox) are left out; images count once picked, dropped or removed.
function modalFormState() {
  var parts = [];
  modal.querySelectorAll('input, select, textarea').forEach(function (el) {
    if (el.type === 'file' || el.getAttribute('role') === 'combobox' || el.closest('.modal-discard')) return;
    parts.push(el.type === 'checkbox' || el.type === 'radio' ? el.checked : el.value);
  });
  modal.querySelectorAll('.picker > .people, .picker > .rels').forEach(function (b) { parts.push(b.textContent); });
  return JSON.stringify(parts);
}
function modalDirty() {
  var m = modalOpen;
  return !!m && (m.touched || (m.base != null && modalFormState() !== m.base));
}
modal.addEventListener('change', function (e) { if (modalOpen && /** @type {AnyEl} */ (e.target).type === 'file') modalOpen.touched = true; });
modal.addEventListener('drop', function () { if (modalOpen) modalOpen.touched = true; }, true);
modal.addEventListener('click', function (e) { if (modalOpen && e.target.closest('[id^="pvrm_"]')) modalOpen.touched = true; }, true);

// X, click outside and Esc. With unsaved changes, asks before discarding; Esc while asking keeps editing.
// The Cancel buttons call closeModal() directly: they already say "discard".
function requestCloseModal(fromEsc) {
  if (!modalOpen || modalOpen.busy) return;
  var bar = modal.querySelector('.modal-discard');
  if (bar) { if (fromEsc) keepEditing(); else bar.querySelector('#mdKeep').focus(); return; }
  if (!modalDirty()) { closeModal(); return; }
  modalOpen.focusBack = document.activeElement;
  modal.insertAdjacentHTML('beforeend', '<div class="modal-discard"><div class="confirm" role="alert"><span>Há alterações não salvas. Descartar?</span>' +
    '<div class="btn-row"><button class="btn danger solid" type="button" id="mdDiscard">Descartar</button><button class="btn ghost" type="button" id="mdKeep">Continuar editando</button></div></div></div>');
  $('mdDiscard').onclick = function () { closeModal(); };
  $('mdKeep').onclick = keepEditing;
  $('mdKeep').focus();
}
function keepEditing() {
  var b = modal.querySelector('.modal-discard'); if (b) b.remove();
  var f = modalOpen && modalOpen.focusBack;
  if (f && f.focus && f.isConnected && modal.contains(f)) f.focus();
}
window.addEventListener('beforeunload', function (e) { if (modalDirty()) { e.preventDefault(); e.returnValue = ''; } });
function closeModal(force) {
  if (!modalOpen || (modalOpen.busy && !force)) return;
  var m = modalOpen; modalOpen = null;
  modalBack.hidden = true; modal.innerHTML = '';
  if (m.onClose) m.onClose();
  renderPage(); // data that arrived while the form was open
  if (m.last && m.last.focus && m.last.isConnected) m.last.focus();
}
// Closes on a click outside the modal: press and release both on the backdrop, so dragging out
// of a field while selecting text does not close it. A click (not mousedown) also fires on phones.
// Esc is handled in explorer.js.
var pressOnBack = false;
modalBack.addEventListener('pointerdown', function (e) { pressOnBack = e.target === modalBack; });
modalBack.addEventListener('click', function (e) { if (pressOnBack && e.target === modalBack) requestCloseModal(); pressOnBack = false; });
modal.addEventListener('click', function (e) { if (e.target.closest('.modal-x')) requestCloseModal(); });

var ACCEPT = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
function imageFieldHtml(id, label, help) {
  return '<div class="field" id="f_' + id + '"><span class="lab" id="lab_' + id + '">' + esc(label) + '</span>' +
    '<label class="drop" id="drop_' + id + '"><input type="file" id="file_' + id + '" accept="' + ACCEPT.join(',') + '" aria-labelledby="lab_' + id + '">' + svg(ICON.image, 26, 1.8) +
    '<span><b>Escolher imagem</b> ou arrastar para cá</span><small>' + esc(help) + '</small></label>' +
    '<div class="pv" id="pv_' + id + '" hidden><img id="pvimg_' + id + '" alt="Pré-visualização"><div class="pv-meta"><span id="pvname_' + id + '"></span><span id="pvdims_' + id + '"></span></div></div>' +
    '<div class="btn-row" id="pvact_' + id + '" hidden><button class="btn ghost" type="button" id="pvrm_' + id + '">' + svg(ICON.trash, 14) + 'Remover imagem</button></div>' +
    '<div class="err" id="err_' + id + '"></div></div>';
}
// Wires an image field; `existing` is {url, name, dims} for an image already saved.
function imageField(id, opts) {
  var st = { file: null, dims: null, url: null, removed: false };
  var drop = $('drop_' + id), input = $('file_' + id);
  function err(t) { $('err_' + id).textContent = t || ''; $('f_' + id).classList.toggle('invalid', !!t); }
  function show(url, name, dims) {
    $('pvimg_' + id).src = url; $('pvname_' + id).textContent = name || ''; $('pvdims_' + id).textContent = dims || '';
    $('pv_' + id).hidden = false; if (opts.removable) $('pvact_' + id).hidden = false;
  }
  function clear() { $('pv_' + id).hidden = true; $('pvact_' + id).hidden = true; $('pvimg_' + id).removeAttribute('src'); }
  function setFile(f) {
    if (st.url) { URL.revokeObjectURL(st.url); st.url = null; }
    st.file = null; st.dims = null;
    if (!f) return;
    if (ACCEPT.indexOf(f.type) < 0) { err('Esse formato não é aceito. Use PNG, JPG, WebP ou GIF.'); return; }
    if (f.size > 20 * 1024 * 1024) { err('A imagem passa de 20 MB. Reduza o arquivo e tente de novo.'); return; }
    var url = URL.createObjectURL(f), img = new Image();
    img.onload = function () {
      st.file = f; st.url = url; st.dims = { w: img.naturalWidth, h: img.naturalHeight }; st.removed = false;
      show(url, f.name, st.dims.w + ' × ' + st.dims.h + ' px · ' + fmtBytes(f.size)); err('');
      if (opts.onPick) opts.onPick(f);
    };
    img.onerror = function () { URL.revokeObjectURL(url); err('Não foi possível abrir essa imagem. Tente outro arquivo.'); };
    img.src = url;
  }
  input.addEventListener('change', function () { setFile(input.files && input.files[0]); });
  ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
  drop.addEventListener('drop', function (e) { var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) setFile(f); });
  var rm = $('pvrm_' + id); if (rm) rm.onclick = function () { setFile(null); st.removed = true; clear(); input.value = ''; };
  if (opts.existing) opts.existing.then(function (e) { if (e && e.url && !st.file && !st.removed) show(e.url, e.name, e.dims); });
  st.err = err; st.drop = drop;
  st.dispose = function () { if (st.url) URL.revokeObjectURL(st.url); };
  return st;
}
