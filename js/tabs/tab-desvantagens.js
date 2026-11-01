/* =====================================================================
   Hounds — Aba Desvantagens (Regras › Desvantagens)
   A lista, a página e o formulário são React (src/hub/paginas/
   Desvantagens.tsx, Desvantagem.tsx e DesvantagemForm.tsx); aqui ficam
   os dados (tipos, classes, livros), a gravação (Ops) e as regras de
   uma desvantagem num modal, para os links das fichas.
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   Desvantagens de GURPS
   Desvantagens do Basic Set e as expansões dos outros livros (Martial
   Arts, Fantasy, Low-Tech...): vêm de dados/desvantagens.json (veja
   "Catálogos de GURPS" em mundo.js); o banco guarda só o que o Mestre
   mudou.
   Permissão:
     - Jogador: apenas busca e visualização.
     - Mestre: criar, editar, excluir e alternar visibilidade.
   ===================================================================== */
ICON.disadvantage = '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="m12 13-1-1 2-2-3-3 2-2"/>';
function indexDisadvantages() { var idx = /** @type {Record<string, Disadvantage>} */ ({}); (W.disadvantages || []).forEach(function (d) { idx[d.id] = d; }); W.disadvIdx = idx; }
function disadvById(id) { return (id && (W.disadvIdx[id] || movedCatalogItem('disadvantages', id))) || null; }
function disadvHref(id) { return hrefFor('disadv:' + id); }

// Values found in the list, for the filters and the form suggestions.
function disadvValues(field) {
  var set = {};
  (W.disadvantages || []).forEach(function (d) { if (d[field]) set[d[field]] = true; });
  return Object.keys(set).sort(function (a, b) { return a.localeCompare(b, 'pt'); });
}
// The list comes in English ("Cross-reference"); badges and filters show the type in Portuguese,
// with the advantages' colors (see advTypeClass).
function disadvTypeKey(t) {
  t = t || '';
  return /^Expans/i.test(t) ? 'exp' : /^(Cross|Remiss)/i.test(t) ? 'ref' : /^(Disadvantage|Desvantagem)$/i.test(t) || !t ? 'adv' : '';
}
var DISADV_TYPE_LABELS = { exp: 'Expansão', ref: 'Remissão', adv: 'Desvantagem' };
function disadvTypeLabel(t) { return DISADV_TYPE_LABELS[disadvTypeKey(t)] || t; }
function disadvTypeClass(t) { return 'adv-' + (disadvTypeKey(t) || 'adv'); }
// The classes of the books' icons, in their order; the entry keeps them in English ("Physical, Exotic").
var DISADV_CLASSES = ['Mental', 'Physical', 'Social', 'Exotic', 'Supernatural'];
var DISADV_CLASS_LABELS = { Mental: 'Mental', Physical: 'Física', Social: 'Social', Exotic: 'Exótica', Supernatural: 'Sobrenatural' };
function disadvClassList(d) { return String((d && d.classes) || '').split(',').map(function (c) { return c.trim(); }).filter(Boolean); }
function disadvClassText(d) { return disadvClassList(d).map(function (c) { return DISADV_CLASS_LABELS[c] || c; }).join(', '); }

Ops.saveDisadvantage = function (dis, fields) {
  if (!isMestre()) return Promise.reject({ message: 'Apenas o Mestre pode criar ou editar desvantagens.' });
  var t = now();
  return W.store.put('disadvantages', dis ? dis.id : null, {
    v: 1,
    name: (fields.name || '').trim(),
    cost: (fields.cost || '').trim(),
    type: (fields.type || '').trim() || 'Disadvantage',
    classes: (fields.classes || '').trim(),
    selfControl: !!fields.selfControl,
    book: (fields.book || '').trim(),
    page: (fields.page || '').trim(),
    description: (fields.description || '').trim(),
    visible: fields.visible !== false,
    sharedWith: fields.sharedWith || (dis && dis.sharedWith) || [],
    createdBy: owner(dis),
    createdAt: (dis && dis.createdAt) || t,
    updatedAt: t
  });
};
// A book disadvantage is not removed from the file: its document says deleted: true.
Ops.deleteDisadvantage = function (dis) {
  if (!isMestre()) return Promise.reject({ message: 'Apenas o Mestre pode excluir desvantagens.' });
  if (dis.catalog) return patchCatalogItem('disadvantages', dis, { deleted: true, updatedAt: now() });
  return W.store.remove('disadvantages', dis.id);
};

// What the book says it takes from the sheet of who has it (DISADV_BOOK, in ficha-efeitos.js), for the
// version on the sheet; '' when nothing. For the modal of the sheets (the page is React: DisadvEffects in
// src/hub/paginas/Desvantagem.tsx).
function disadvEffectsHtml(d, h) {
  var fx = disadvBookFx(d, { name: d.name, cost: 0, levels: 0 });
  if (!fx.length) return '';
  return '<section><' + h + ' class="sec-title">Efeitos na ficha (do livro)</' + h + '><ul class="fx-list">' + fx.map(function (e) {
    return '<li><b>' + esc(advEffectText(e)) + '</b></li>';
  }).join('') + '</ul><p class="hint-text">Lidos do texto da desvantagem e aplicados na ficha de quem a tem (os de uma versão mais forte, como Very Fat ou Shyness grave, seguem os pontos da ficha). ' +
    'Os que dependem do momento aparecem ao lado do campo, sem somar.</p></section>';
}
/* ---------- A disadvantage in a modal (from a sheet, like the advantages' openAdvModal) ---------- */
function openDisadvModal(id) {
  showModal('<div class="skill-modal" id="disadvModal"><p class="lede">Carregando desvantagem…</p></div>');
  function paint() {
    var box = $('disadvModal'); if (!box) return;
    var d = disadvById(id);
    if (!d) { box.innerHTML = '<h2>Desvantagem não encontrada</h2><p class="lede">Essa desvantagem pode ter sido excluída ou ocultada.</p>'; return; }
    var away = S.ui && sheetDraftOpen() ? ' target="_blank" rel="noopener"' : '';
    box.innerHTML = '<div class="skill-modal-head"><div style="display:flex;align-items:center;gap:8px"><span class="badge">' + svg(ICON.disadvantage, 12, 2.4) + ' Desvantagem</span>' +
      '<span class="spell-badge ' + disadvTypeClass(d.type) + '">' + esc(disadvTypeLabel(d.type)) + '</span></div>' +
      '<h2 id="disadvModalTitle">' + esc(d.name) + '</h2><p class="lede">' + (d.cost ? esc(d.cost) : 'Custo não informado') + (d.selfControl ? ' · teste de autocontrole' : '') + '</p></div>' +
      '<h3 class="sec-title">Descrição</h3>' + (d.description ? '<p class="long">' + esc(d.description) + '</p>' : '<p class="long none">Sem descrição cadastrada.</p>') +
      disadvEffectsHtml(d, 'h3') +
      '<p class="hint-text">' + esc([d.book, d.page ? 'p. ' + d.page : ''].filter(Boolean).join(' · ')) + '</p>' +
      '<div class="btn-row" style="justify-content:flex-end"><a class="btn" href="' + disadvHref(d.id) + '"' + away + ' id="disadvModalPage">Abrir página da desvantagem</a></div>';
    modal.setAttribute('aria-labelledby', 'disadvModalTitle');
    var pg = $('disadvModalPage'); if (pg && !away) pg.onclick = function () { closeModal(); };
  }
  loadCatalog('disadvantages').then(paint, paint);
}
document.addEventListener('click', function (e) {
  if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
  var t = /** @type {AnyEl} */ (e.target), a = t && t.closest && t.closest('[data-disadv-modal]'); if (!a) return;
  e.preventDefault(); openDisadvModal(a.getAttribute('data-disadv-modal'));
});
