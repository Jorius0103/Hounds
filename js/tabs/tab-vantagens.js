/* =====================================================================
   Hounds — Aba Vantagens (Regras › Vantagens)
   A lista (Vantagens e Perks), a página e o formulário são React
   (src/hub/paginas/Vantagens.tsx, Vantagem.tsx e VantagemForm.tsx);
   aqui ficam os dados (tipos, livros, os perks à parte), a gravação
   (Ops) e as regras de uma vantagem num modal, para os links das fichas.
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   Vantagens de GURPS
   Vantagens, talentos e perks do Basic Set, Martial Arts, Fantasy,
   Gladiators e Low-Tech: vêm de dados/vantagens.json (veja "Catálogos
   de GURPS" em mundo.js); o banco guarda só o que o Mestre mudou.
   Permissão:
     - Jogador: apenas busca e visualização.
     - Mestre: criar, editar, excluir e alternar visibilidade.
   ===================================================================== */
ICON.advantage = '<path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"/><circle cx="12" cy="8" r="6"/>';
function indexAdvantages() { var idx = /** @type {Record<string, Advantage>} */ ({}); (W.advantages || []).forEach(function (a) { idx[a.id] = a; }); W.advIdx = idx; }
function advById(id) { return (id && (W.advIdx[id] || movedCatalogItem('advantages', id))) || null; }
ICON.perk = '<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/>';
// The perks (type Perk) have a list of their own, Regras › Perks (#perks), and their pages are under it
// (#perk~id); Regras › Vantagens lists the other entries.
function isPerkEntry(a) { return advTypeKey(a && a.type) === 'perk'; }
function advHref(id) { return hrefFor((isPerkEntry(advById(id)) ? 'perk:' : 'adv:') + id); }

// Values found in the list, for the filters and the form suggestions.
function advValues(field) {
  var set = {};
  (W.advantages || []).forEach(function (a) { if (a[field]) set[a[field]] = true; });
  return Object.keys(set).sort(function (a, b) { return a.localeCompare(b, 'pt'); });
}
// The list comes in English ("Cross-reference"); badges and filters show the type in Portuguese.
// "Expansion (Basic Set advantage)" is long for a badge.
function advTypeKey(t) {
  t = t || '';
  return /^Expans/i.test(t) ? 'exp' : /^Perk/i.test(t) ? 'perk' : /^Talent/i.test(t) ? 'talent' : /^(Cross|Remiss)/i.test(t) ? 'ref' : /^(Advantage|Vantagem)$/i.test(t) || !t ? 'adv' : '';
}
var ADV_TYPE_LABELS = { exp: 'Expansão', perk: 'Perk', talent: 'Talento', ref: 'Remissão', adv: 'Vantagem' };
function advTypeLabel(t) { return ADV_TYPE_LABELS[advTypeKey(t)] || t; }
function advTypeClass(t) { return 'adv-' + (advTypeKey(t) || 'adv'); }

Ops.saveAdvantage = function (adv, fields) {
  if (!isMestre()) return Promise.reject({ message: 'Apenas o Mestre pode criar ou editar vantagens.' });
  var t = now();
  return W.store.put('advantages', adv ? adv.id : null, {
    v: 1,
    name: (fields.name || '').trim(),
    cost: (fields.cost || '').trim(),
    type: (fields.type || '').trim() || 'Vantagem',
    book: (fields.book || '').trim(),
    page: (fields.page || '').trim(),
    description: (fields.description || '').trim(),
    // What it does on the sheets (see ficha-efeitos.js).
    effects: (fields.effects || (adv && adv.effects) || []).map(cleanAdvEffect).filter(advEffectOk),
    visible: fields.visible !== false,
    sharedWith: fields.sharedWith || (adv && adv.sharedWith) || [],
    createdBy: owner(adv),
    createdAt: (adv && adv.createdAt) || t,
    updatedAt: t
  });
};
// A book advantage is not removed from the file: its document says deleted: true.
Ops.deleteAdvantage = function (adv) {
  if (!isMestre()) return Promise.reject({ message: 'Apenas o Mestre pode excluir vantagens.' });
  if (adv.catalog) return patchCatalogItem('advantages', adv, { deleted: true, updatedAt: now() });
  return W.store.remove('advantages', adv.id);
};

/* ---------- effects (see ficha-efeitos.js) ---------- */
// The effects of an entry, for the modal of the sheets (the page is React: AdvEffects in src/hub/paginas/Vantagem.tsx).
// can: the Mestre sees how to add them.
function advEffectsHtml(a, can, h) {
  var fx = advEffects(a);
  // Without the Mestre's, the sheet uses the book's (ADV_BOOK, in ficha-efeitos.js), for the version on the sheet.
  var book = fx.length ? [] : advBookFx(a, { name: a.name, pts: 0 });
  if (book.length) return '<section><' + h + ' class="sec-title">Efeitos na ficha (do livro)</' + h + '><ul class="fx-list">' + book.map(function (e) {
    return '<li><b>' + esc(advEffectText(e)) + '</b></li>';
  }).join('') + '</ul><p class="hint-text">Lidos do texto da vantagem e aplicados na ficha de quem a tem (os de uma versão maior, como Very Fit, seguem os pontos da ficha). ' +
    'Os que dependem do momento aparecem ao lado do campo, sem somar.' + (can ? ' Cadastrar efeitos em <b>Editar vantagem</b> troca estes.' : '') + '</p></section>';
  if (!fx.length) return can ? '<section><' + h + ' class="sec-title">Efeitos na ficha</' + h + '><p class="long none">Nenhum efeito cadastrado. Use <b>Editar vantagem</b> para dizer o que ela soma na ficha.</p></section>' : '';
  return '<section><' + h + ' class="sec-title">Efeitos na ficha</' + h + '><ul class="fx-list">' + fx.map(function (e) {
    return '<li><b>' + esc(advEffectText(e)) + '</b>' + (e.note ? '<small>' + esc(e.note) + '</small>' : '') + '</li>';
  }).join('') + '</ul>' + (ADV_FX_BUILTIN_RE.test(a.name) ? '<p class="hint-text">A ficha já aplica esta vantagem sozinha; estes efeitos não são somados.</p>' : '') + '</section>';
}

/* ---------- An advantage or perk in a modal (from a sheet, like the skills' openSkillModal) ---------- */
function openAdvModal(id) {
  showModal('<div class="skill-modal" id="advModal"><p class="lede">Carregando vantagem…</p></div>');
  function paint() {
    var box = $('advModal'); if (!box) return;
    var a = advById(id);
    if (!a) { box.innerHTML = '<h2>Vantagem não encontrada</h2><p class="lede">Essa vantagem pode ter sido excluída ou ocultada.</p>'; return; }
    var away = S.ui && sheetDraftOpen() ? ' target="_blank" rel="noopener"' : '';
    box.innerHTML = '<div class="skill-modal-head"><div style="display:flex;align-items:center;gap:8px"><span class="badge">' + svg(ICON.advantage, 12, 2.4) + ' ' + esc(advTypeLabel(a.type)) + '</span>' +
      '<span class="spell-badge ' + advTypeClass(a.type) + '">' + esc(advTypeLabel(a.type)) + '</span></div>' +
      '<h2 id="advModalTitle">' + esc(a.name) + '</h2><p class="lede">' + (a.cost ? esc(a.cost) : 'Custo não informado') + '</p></div>' +
      '<h3 class="sec-title">Descrição</h3>' + (a.description ? '<p class="long">' + esc(a.description) + '</p>' : '<p class="long none">Sem descrição cadastrada.</p>') +
      advEffectsHtml(a, false, 'h3') +
      '<p class="hint-text">' + esc([a.book, a.page ? 'p. ' + a.page : ''].filter(Boolean).join(' · ')) + '</p>' +
      '<div class="btn-row" style="justify-content:flex-end"><a class="btn" href="' + advHref(a.id) + '"' + away + ' id="advModalPage">Abrir página da vantagem</a></div>';
    modal.setAttribute('aria-labelledby', 'advModalTitle');
    var pg = $('advModalPage'); if (pg && !away) pg.onclick = function () { closeModal(); };
  }
  loadCatalog('advantages').then(paint, paint);
}
document.addEventListener('click', function (e) {
  if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
  var t = /** @type {AnyEl} */ (e.target), a = t && t.closest && t.closest('[data-adv-modal]'); if (!a) return;
  e.preventDefault(); openAdvModal(a.getAttribute('data-adv-modal'));
});
