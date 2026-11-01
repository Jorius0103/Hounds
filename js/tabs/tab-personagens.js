/* =====================================================================
   Hounds — Aba Personagens
   A lista e a página do personagem são React (src/hub/paginas/
   Personagens.tsx e Personagem.tsx); aqui ficam os dados, a gravação
   (Ops), o formulário de personagem (openCharForm, que elas abrem) e a
   apresentação para todos (CharPresentation).
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   Characters (Mundo › Personagens)
   A character ↔ location link is stored once, in location.characterIds,
   so editing it from either side always gives the same answer.
   ===================================================================== */
ICON.user = '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>';
ICON.users = '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>';
var RACE_DEFAULTS = ['Humano', 'Anão', 'Elfo', 'Meio-elfo', 'Hobbit', 'Orc'];
function charHref(id) { return hrefFor('char:' + id); }
function charById(id) { return W.charIdx[id] || null; }
function charLocations(id) { return W.locations.filter(function (l) { return (l.characterIds || []).indexOf(id) >= 0; }).sort(byName); }
function avatarI(c) { return '<i' + (c.image && c.image.ref ? ' data-img="' + esc(c.image.ref) + '"' : '') + '>' + esc(initials(c.name)) + '</i>'; }
function personChip(c) { return '<a class="person" href="' + charHref(c.id) + '">' + avatarI(c) + esc(c.name) + '</a>'; }
function distinct(field) {
  var seen = {}, out = [];
  W.characters.forEach(function (c) { var v = (c[field] || '').trim(); if (v && !seen[norm(v)]) { seen[norm(v)] = true; out.push(v); } });
  return out.sort(function (a, b) { return a.localeCompare(b, 'pt'); });
}
function charMaps(c) { return ((c && c.mapIds) || []).map(function (id) { return W.mapIdx[id]; }).filter(Boolean).sort(byName); }
function mapCharacters(mapId) { return W.characters.filter(function (c) { return (c.mapIds || []).indexOf(mapId) >= 0; }).sort(byName); }
function charSubtitle(c) { return [c.race, charOrgText(c)].filter(function (v) { return v && v.trim(); }).join(' · '); }
// A character ↔ character link lives in character.relations ([{ charId, type }]) of the one who
// declared it; "type" is how that character sees the other. The other side shows it as "back".
var RELATION_DEFAULTS = ['Aliado', 'Amigo', 'Rival', 'Inimigo', 'Família', 'Irmão', 'Pai', 'Mãe', 'Filho', 'Cônjuge', 'Mentor', 'Aprendiz', 'Líder', 'Subordinado'];
function relationTypes() {
  var seen = {}, out = [];
  W.characters.forEach(function (c) { (c.relations || []).forEach(function (r) { var v = (r.type || '').trim(); if (v && !seen[norm(v)]) { seen[norm(v)] = true; out.push(v); } }); });
  RELATION_DEFAULTS.forEach(function (v) { if (!seen[norm(v)]) { seen[norm(v)] = true; out.push(v); } });
  return out.sort(function (a, b) { return a.localeCompare(b, 'pt'); });
}
function charRelations(c) {
  var seen = {}, own = [], back = [];
  (c.relations || []).forEach(function (r) { var o = charById(r.charId); if (o && o.id !== c.id && !seen[o.id]) { seen[o.id] = true; own.push({ c: o, type: r.type || '' }); } });
  W.characters.forEach(function (o) {
    if (o.id === c.id || seen[o.id]) return;
    var r = (o.relations || []).filter(function (x) { return x.charId === c.id; })[0];
    if (r) back.push({ c: o, type: r.type || '', back: true });
  });
  function byChar(a, b) { return byName(a.c, b.c); }
  return own.sort(byChar).concat(back.sort(byChar));
}

Ops.saveCharacter = function (c, fields, newFile, newDims, removeImage, locIds) {
  var oldRef = c && c.image && c.image.ref;
  var p = Promise.resolve(c && c.image ? c.image : null);
  if (newFile) p = W.store.upload(newFile).then(function (u) { return { ref: u.ref, w: newDims.w, h: newDims.h, type: u.type, size: u.size }; });
  else if (removeImage) p = Promise.resolve(null);
  return p.then(function (image) {
    var t = now();
    var mids = (fields.mapIds || []).slice();
    if (c) (c.mapIds || []).forEach(function (id) { if (!W.mapIdx[id] && rawHas('maps', id) && mids.indexOf(id) < 0) mids.push(id); });
    // Keep links to characters this user can't see, the same way as maps.
    var rels = (fields.relations || []).slice();
    if (c) (c.relations || []).forEach(function (r) { if (!W.charIdx[r.charId] && rawHas('characters', r.charId) && !rels.some(function (x) { return x.charId === r.charId; })) rels.push(r); });
    // The sheet link (sheetId) is set from the character's page, not from this form: kept as it is.
    var body = { v: 1, name: fields.name, description: fields.description, race: fields.race, organization: '', mapIds: mids, relations: rels, sheetId: (c && c.sheetId) || null, image: image, visible: fields.visible !== false, sharedWith: fields.sharedWith || (c && c.sharedWith) || [],
                 source: (c && c.source) || 'manual', mesaId: (c && c.mesaId) || null, createdBy: owner(c), createdAt: (c && c.createdAt) || t, updatedAt: t };
    return W.store.put('characters', c ? c.id : null, body);
  }).then(function (id) {
    if (oldRef && (newFile || removeImage)) W.store.dropImage(oldRef);
    return W.locations.reduce(function (q, l) {
      var ids = (l.characterIds || []).slice(), has = ids.indexOf(id) >= 0, want = locIds.indexOf(l.id) >= 0;
      if (has === want) return q;
      var next = want ? ids.concat([id]) : ids.filter(function (x) { return x !== id; });
      return q.then(function () { return W.store.patch('locations', l.id, { characterIds: next, updatedAt: now() }); });
    }, Promise.resolve()).then(function () { return id; });
  });
};
Ops.deleteCharacter = function (c) {
  // A relational database removes the character's links itself, in one transaction (hounds_remove).
  if (W.store.relational) return W.store.remove('characters', c.id).then(function () { return W.store.dropImage(c.image && c.image.ref); });
  return W.raw.locations.filter(function (l) { return (l.characterIds || []).indexOf(c.id) >= 0; }).reduce(function (q, l) {
    return q.then(function () { return W.store.patch('locations', l.id, { characterIds: (l.characterIds || []).filter(function (x) { return x !== c.id; }), updatedAt: now() }); });
  }, Promise.resolve()).then(function () {
    return W.raw.characters.filter(function (o) { return o.id !== c.id && (o.relations || []).some(function (r) { return r.charId === c.id; }); }).reduce(function (q, o) {
      return q.then(function () { return W.store.patch('characters', o.id, { relations: o.relations.filter(function (r) { return r.charId !== c.id; }), updatedAt: now() }); });
    }, Promise.resolve());
  }).then(function () {
    return W.raw.organizations.filter(function (o) { return (o.members || []).some(function (m) { return m.charId === c.id; }); }).reduce(function (q, o) {
      return q.then(function () { return W.store.patch('organizations', o.id, { members: o.members.filter(function (m) { return m.charId !== c.id; }), updatedAt: now() }); });
    }, Promise.resolve());
  }).then(function () {
    return W.raw.events.filter(function (ev) { return (ev.characterIds || []).indexOf(c.id) >= 0; }).reduce(function (q, ev) {
      return q.then(function () { return W.store.patch('events', ev.id, { characterIds: ev.characterIds.filter(function (x) { return x !== c.id; }), updatedAt: now() }); });
    }, Promise.resolve());
  }).then(function () { return W.store.remove('characters', c.id); })
    .then(function () { return W.store.dropImage(c.image && c.image.ref); });
};

function openCharForm(c) {
  var editing = !!c, canImg = W.store.canUpload;
  var races = distinct('race'); RACE_DEFAULTS.forEach(function (r) { if (!races.some(function (x) { return norm(x) === norm(r); })) races.push(r); });
  var others = W.characters.filter(function (o) { return !editing || o.id !== c.id; }).sort(byName);
  var html = '<form id="charForm" novalidate><h2 id="cfTitle">' + (editing ? 'Editar personagem' : 'Novo personagem') + '</h2>' +
    '<div class="field" id="f_cname"><label for="cname">Nome</label><input type="text" id="cname" maxlength="100" autocomplete="off" placeholder="Ex.: Brynhild" value="' + esc(editing ? c.name : '') + '"><div class="err" id="err_cname"></div></div>' +
    (canImg ? imageFieldHtml('cimg', 'Imagem', 'Retrato ou ilustração. Opcional, até 20 MB.') : '') +
    '<div class="field"><label for="cdesc">Descrição</label><textarea id="cdesc" rows="6" maxlength="20000" placeholder="Quem é, aparência, história, ligação com o grupo…">' + esc(editing ? c.description || '' : '') + '</textarea></div>' +
    '<div class="field"><label for="crace">Raça</label><input type="text" id="crace" list="raceList" maxlength="60" autocomplete="off" placeholder="Ex.: Anão" value="' + esc(editing ? c.race || '' : '') + '"><datalist id="raceList">' + races.map(function (r) { return '<option value="' + esc(r) + '">'; }).join('') + '</datalist></div>' +
    '<div class="field"><label for="corg">Organizações</label><div class="picker"><div class="rels" id="cOrgSel"></div>' +
    '<input type="text" id="corg" autocomplete="off" placeholder="Buscar ou criar organização" role="combobox" aria-expanded="false" aria-controls="cOrgList" aria-autocomplete="list">' +
    '<div class="suggest" id="cOrgList" role="listbox" hidden></div></div>' + datalistHtml('cRankList', rankTypes()) +
    '<span class="hint-text">Opcional. Ao lado de cada uma, o cargo do personagem nela. Ex.: Líder, General. Digite um nome novo para criar a organização.</span></div>' +
    '<div class="field"><label for="cmap">Mapas relacionados</label><div class="picker"><div class="people" id="cMapSel"></div>' +
    '<input type="text" id="cmap" autocomplete="off" placeholder="' + (W.maps.length ? 'Buscar mapa' : 'Nenhum mapa cadastrado ainda') + '"' + (W.maps.length ? '' : ' disabled') + ' role="combobox" aria-expanded="false" aria-controls="cMapList" aria-autocomplete="list">' +
    '<div class="suggest" id="cMapList" role="listbox" hidden></div></div><span class="hint-text">Opcional. Ex.: o reino de onde vem ou as regiões por onde anda.</span></div>' +
    '<div class="field"><label for="cloc">Locais relacionados</label><div class="picker"><div class="people" id="cLocSel"></div>' +
    '<input type="text" id="cloc" autocomplete="off" placeholder="' + (W.locations.length ? 'Buscar local' : 'Nenhum local cadastrado ainda') + '"' + (W.locations.length ? '' : ' disabled') + ' role="combobox" aria-expanded="false" aria-controls="cLocList" aria-autocomplete="list">' +
    '<div class="suggest" id="cLocList" role="listbox" hidden></div></div><span class="hint-text">Opcional. Os locais criados em Locais aparecem aqui.</span></div>' +
    '<div class="field"><label for="crel">Relacionamentos</label><div class="picker"><div class="rels" id="cRelSel"></div>' +
    '<input type="text" id="crel" autocomplete="off" placeholder="' + (others.length ? 'Buscar personagem' : 'Nenhum outro personagem cadastrado ainda') + '"' + (others.length ? '' : ' disabled') + ' role="combobox" aria-expanded="false" aria-controls="cRelList" aria-autocomplete="list">' +
    '<div class="suggest" id="cRelList" role="listbox" hidden></div></div>' +
    '<datalist id="relTypeList">' + relationTypes().map(function (r) { return '<option value="' + esc(r) + '">'; }).join('') + '</datalist>' +
    '<span class="hint-text">Opcional. Ao lado de cada um, diga como este personagem o vê. Ex.: Irmão, Rival, Mentor. A relação aparece na ficha dos dois.</span></div>' +
    flagHtml('cvis', c, true) +
    '<div class="form-err" id="cfErr" role="alert"></div>' +
    '<div class="btn-row" style="justify-content:flex-end"><button class="btn ghost" type="button" id="cfCancel">Cancelar</button><button class="btn primary" type="submit" id="cfSave">' + (editing ? 'Salvar personagem' : 'Criar personagem') + '</button></div></form>';
  var img;
  showModal(html, function () { if (img) img.dispose(); });
  modal.setAttribute('aria-labelledby', 'cfTitle');
  if (canImg) img = imageField('cimg', { removable: true, existing: editing && c.image ? W.store.imageUrl(c.image.ref).then(function (u) { return { url: u, name: 'Imagem atual', dims: c.image.w ? c.image.w + ' × ' + c.image.h + ' px' : '' }; }) : null });
  var name = $('cname');
  name.addEventListener('input', function () { if (name.value.trim()) { $('err_cname').textContent = ''; $('f_cname').classList.remove('invalid'); } });

  // ---- organization picker (existing or new organizations, each with the character's rank) ----
  /** @type {{ id: string | null, name?: string, text: string }[]} */
  var orgSel = editing ? charOrgs(c.id).map(function (x) { return { id: x.o.id, text: x.rank }; }) : [];
  var legacyOrg = editing ? (c.organization || '').trim() : '';
  if (legacyOrg) {
    var lo = W.organizations.filter(function (o) { return norm(o.name) === norm(legacyOrg); })[0];
    if (!lo) orgSel.push({ id: null, name: legacyOrg, text: '' });
    else if (!orgSel.some(function (s) { return s.id === lo.id; })) orgSel.push({ id: lo.id, text: '' });
  }
  function orgPickName(s) { return s.id ? orgById(s.id).name : s.name; }
  textPicker({ input: 'corg', list: 'cOrgList', box: 'cOrgSel', sel: orgSel, datalist: 'cRankList', textLabel: 'Cargo',
    name: orgPickName,
    chip: function (s) { var o = s.id && orgById(s.id); return '<span class="person"><i' + (o && o.image ? ' data-img="' + esc(o.image.ref) + '"' : '') + '>' + svg(ICON.org, 12, 2.4) + '</i>' + esc(orgPickName(s)) + (s.id ? '' : ' (nova)') + '</span>'; },
    find: function (q, raw) {
      var out = W.organizations.slice().sort(byName).filter(function (o) { return !orgSel.some(function (s) { return s.id === o.id; }) && (!q || norm(o.name).indexOf(q) >= 0); })
        .map(function (o) { var n = orgMembers(o).length; return { label: o.name, sub: n ? plural(n, 'membro', 'membros') : 'Sem membros', pick: { id: o.id, text: '' } }; });
      var taken = W.organizations.some(function (o) { return norm(o.name) === q; }) || orgSel.some(function (s) { return norm(orgPickName(s)) === q; });
      if (q && !taken) out.push({ label: 'Criar organização “' + raw + '”', sub: 'Nova', pick: { id: null, name: raw, text: '' } });
      return out;
    } });

  // ---- map picker (existing maps, in hierarchy order) ----
  var mapSel = editing ? charMaps(c).map(function (m) { return m.id; }) : [];
  (function () {
    var input = $('cmap'), list = $('cMapList'), active = 0, options = [];
    var ordered = []; (function walk(pid, d) { childMaps(pid).forEach(function (m) { ordered.push({ m: m, d: d }); walk(m.id, d + 1); }); })(null, 0);
    function paintSel() {
      $('cMapSel').innerHTML = mapSel.map(function (id, i) { var m = mapById(id); if (!m) return ''; return '<span class="person"><i>' + svg(ICON.map, 12, 2.4) + '</i>' + esc(m.name) + '<button type="button" data-rm="' + i + '" aria-label="Remover ' + esc(m.name) + '">' + svg(ICON.x, 12, 2.6) + '</button></span>'; }).join('');
    }
    function paintList() {
      var q = norm(input.value.trim());
      options = ordered.filter(function (o) { return mapSel.indexOf(o.m.id) < 0 && (!q || norm(o.m.name).indexOf(q) >= 0); }).slice(0, 60);
      if (!options.length) { list.hidden = true; input.setAttribute('aria-expanded', 'false'); return; }
      active = Math.min(active, options.length - 1);
      list.innerHTML = options.map(function (o, i) { var pth = mapChain(o.m.id).slice(0, -1).map(function (x) { return x.name; }).join(' › '); return '<button type="button" role="option" id="mopt' + i + '" data-i="' + i + '" class="' + (i === active ? 'act' : '') + '" aria-selected="' + (i === active) + '"><span style="padding-left:' + (q ? 0 : o.d * 14) + 'px">' + (o.d && !q ? '└ ' : '') + esc(o.m.name) + '</span><small>' + esc(pth || 'Nível superior') + '</small></button>'; }).join('');
      list.hidden = false; input.setAttribute('aria-expanded', 'true'); input.setAttribute('aria-activedescendant', 'mopt' + active);
    }
    function pick(i) { var o = options[i]; if (!o) return; mapSel.push(o.m.id); input.value = ''; active = 0; paintSel(); list.hidden = true; input.setAttribute('aria-expanded', 'false'); input.focus(); }
    input.addEventListener('focus', paintList);
    input.addEventListener('input', function () { active = 0; paintList(); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (list.hidden) { active = 0; paintList(); } else { active = Math.min(options.length - 1, active + 1); paintList(); } }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(0, active - 1); paintList(); }
      else if (e.key === 'Enter') { e.preventDefault(); if (!list.hidden && options.length) pick(active); }
      else if (e.key === 'Escape' && !list.hidden) { e.stopPropagation(); list.hidden = true; }
      else if (e.key === 'Backspace' && !input.value && mapSel.length) { mapSel.pop(); paintSel(); }
    });
    input.addEventListener('blur', function () { setTimeout(function () { if (document.activeElement !== input) list.hidden = true; }, 150); });
    list.addEventListener('mousedown', function (e) { e.preventDefault(); });
    list.addEventListener('click', function (e) { var b = e.target.closest('[data-i]'); if (b) pick(+b.getAttribute('data-i')); });
    $('cMapSel').addEventListener('click', function (e) { var b = e.target.closest('[data-rm]'); if (!b) return; mapSel.splice(+b.getAttribute('data-rm'), 1); paintSel(); input.focus(); });
    paintSel();
  })();

  // ---- location picker (existing locations only) ----
  var sel = editing ? charLocations(c.id).map(function (l) { return l.id; }) : [];
  var input = $('cloc'), list = $('cLocList'), active = 0, options = [];
  function paintSel() {
    $('cLocSel').innerHTML = sel.map(function (id, i) { var l = locById(id); if (!l) return ''; return '<span class="person"><i>' + svg(ICON.pin, 12, 2.4) + '</i>' + esc(l.name) + '<button type="button" data-rm="' + i + '" aria-label="Remover ' + esc(l.name) + '">' + svg(ICON.x, 12, 2.6) + '</button></span>'; }).join('');
  }
  function paintList() {
    var q = norm(input.value.trim());
    options = W.locations.slice().sort(byName).filter(function (l) { return sel.indexOf(l.id) < 0 && (!q || norm(locPathText(l.id) + ' ' + mapPathText(locMapId(l))).indexOf(q) >= 0); }).slice(0, 40);
    if (!options.length) { list.hidden = true; input.setAttribute('aria-expanded', 'false'); return; }
    active = Math.min(active, options.length - 1);
    list.innerHTML = options.map(function (l, i) { var mid = locMapId(l); return '<button type="button" role="option" id="copt' + i + '" data-i="' + i + '" class="' + (i === active ? 'act' : '') + '" aria-selected="' + (i === active) + '">' + esc(locPathText(l.id)) + '<small>' + esc(mid ? mapById(mid).name : 'Sem mapa') + '</small></button>'; }).join('');
    list.hidden = false; input.setAttribute('aria-expanded', 'true'); input.setAttribute('aria-activedescendant', 'copt' + active);
  }
  function pick(i) { var l = options[i]; if (!l) return; sel.push(l.id); input.value = ''; active = 0; paintSel(); list.hidden = true; input.setAttribute('aria-expanded', 'false'); input.focus(); }
  input.addEventListener('focus', paintList);
  input.addEventListener('input', function () { active = 0; paintList(); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (list.hidden) { active = 0; paintList(); } else { active = Math.min(options.length - 1, active + 1); paintList(); } }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(0, active - 1); paintList(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (!list.hidden && options.length) pick(active); }
    else if (e.key === 'Escape' && !list.hidden) { e.stopPropagation(); list.hidden = true; }
    else if (e.key === 'Backspace' && !input.value && sel.length) { sel.pop(); paintSel(); paintList(); }
  });
  input.addEventListener('blur', function () { setTimeout(function () { if (document.activeElement !== input) list.hidden = true; }, 150); });
  list.addEventListener('mousedown', function (e) { e.preventDefault(); });
  list.addEventListener('click', function (e) { var b = e.target.closest('[data-i]'); if (b) pick(+b.getAttribute('data-i')); });
  $('cLocSel').addEventListener('click', function (e) { var b = e.target.closest('[data-rm]'); if (!b) return; sel.splice(+b.getAttribute('data-rm'), 1); paintSel(); input.focus(); });
  paintSel();

  // ---- relationship picker (other characters, each with a free-text type) ----
  var relSel = [];
  if (editing) (c.relations || []).forEach(function (r) { if (r.charId !== c.id && charById(r.charId) && !relSel.some(function (x) { return x.charId === r.charId; })) relSel.push({ charId: r.charId, type: r.type || '' }); });
  (function () {
    var input = $('crel'), list = $('cRelList'), box = $('cRelSel'), active = 0, options = [];
    function paintSel() {
      box.innerHTML = relSel.map(function (r, i) {
        var o = charById(r.charId); if (!o) return '';
        return '<div class="rel-row"><span class="person">' + avatarI(o) + esc(o.name) + '</span>' +
          '<input type="text" data-ti="' + i + '" list="relTypeList" maxlength="60" autocomplete="off" placeholder="Tipo de relação" aria-label="Tipo de relação com ' + esc(o.name) + '" value="' + esc(r.type) + '">' +
          '<button class="icon-btn" type="button" data-rm="' + i + '" aria-label="Remover ' + esc(o.name) + '">' + svg(ICON.x, 14, 2.6) + '</button></div>';
      }).join('');
      fillImages(box);
    }
    function paintList() {
      var q = norm(input.value.trim());
      options = others.filter(function (o) { return !relSel.some(function (r) { return r.charId === o.id; }) && (!q || norm(o.name + ' ' + charSubtitle(o)).indexOf(q) >= 0); }).slice(0, 40);
      if (!options.length) { list.hidden = true; input.setAttribute('aria-expanded', 'false'); return; }
      active = Math.min(active, options.length - 1);
      list.innerHTML = options.map(function (o, i) { return '<button type="button" role="option" id="ropt' + i + '" data-i="' + i + '" class="' + (i === active ? 'act' : '') + '" aria-selected="' + (i === active) + '">' + esc(o.name) + '<small>' + esc(charSubtitle(o)) + '</small></button>'; }).join('');
      list.hidden = false; input.setAttribute('aria-expanded', 'true'); input.setAttribute('aria-activedescendant', 'ropt' + active);
    }
    function pick(i) {
      var o = options[i]; if (!o) return;
      relSel.push({ charId: o.id, type: '' }); input.value = ''; active = 0; paintSel(); list.hidden = true; input.setAttribute('aria-expanded', 'false');
      var t = box.querySelector('[data-ti="' + (relSel.length - 1) + '"]'); if (t) t.focus();
    }
    input.addEventListener('focus', paintList);
    input.addEventListener('input', function () { active = 0; paintList(); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (list.hidden) { active = 0; paintList(); } else { active = Math.min(options.length - 1, active + 1); paintList(); } }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(0, active - 1); paintList(); }
      else if (e.key === 'Enter') { e.preventDefault(); if (!list.hidden && options.length) pick(active); }
      else if (e.key === 'Escape' && !list.hidden) { e.stopPropagation(); list.hidden = true; }
    });
    input.addEventListener('blur', function () { setTimeout(function () { if (document.activeElement !== input) list.hidden = true; }, 150); });
    list.addEventListener('mousedown', function (e) { e.preventDefault(); });
    list.addEventListener('click', function (e) { var b = e.target.closest('[data-i]'); if (b) pick(+b.getAttribute('data-i')); });
    box.addEventListener('input', function (e) { var t = e.target.closest('[data-ti]'); if (t) relSel[+t.getAttribute('data-ti')].type = t.value; });
    box.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.closest('[data-ti]')) { e.preventDefault(); input.focus(); } });
    box.addEventListener('click', function (e) { var b = e.target.closest('[data-rm]'); if (!b) return; relSel.splice(+b.getAttribute('data-rm'), 1); paintSel(); input.focus(); });
    paintSel();
  })();

  $('cfCancel').onclick = function () { closeModal(); };
  $('charForm').onsubmit = function (e) {
    e.preventDefault();
    if (modalOpen.busy) return;
    var n = name.value.trim();
    if (!n) { $('err_cname').textContent = 'Informe o nome do personagem.'; $('f_cname').classList.add('invalid'); name.focus(); return; }
    if (!editing && W.characters.some(function (x) { return norm(x.name) === norm(n); }) && !$('cfErr').dataset.warned) {
      $('cfErr').textContent = 'Já existe um personagem com esse nome. Clique em Criar personagem de novo para criar mesmo assim.'; $('cfErr').dataset.warned = '1'; return;
    }
    if (img && $('err_cimg').textContent && !img.file) { img.drop.focus(); return; }
    modalOpen.busy = true;
    var btn = $('cfSave'); btn.disabled = true; btn.textContent = img && img.file ? 'Enviando imagem…' : 'Salvando…'; $('cfCancel').disabled = true; $('cfErr').textContent = '';
    var locIds = sel.filter(function (id) { return locById(id); });
    var vis = flagVal('cvis', c), shared = shareVal('cvis', c);
    Ops.saveCharacter(c, { name: n, description: $('cdesc').value.trim(), race: $('crace').value.trim(), mapIds: mapSel.filter(function (id) { return mapById(id); }), relations: relSel.filter(function (r) { return charById(r.charId); }).map(function (r) { return { charId: r.charId, type: r.type.trim() }; }), visible: vis, sharedWith: shared }, img && img.file, img && img.dims, img && img.removed, locIds)
      .then(function (id) { return Ops.setCharOrgs(id, orgSel.filter(function (s) { return !s.id || orgById(s.id); }), vis, shared).then(function () { return id; }); })
      .then(function (id) {
        closeModal(true);
        toast(editing ? 'Personagem salvo.' : 'Personagem criado.');
        if (!editing) go(charHref(id));
      }, function (er) {
        if (!modalOpen) return;
        modalOpen.busy = false; btn.disabled = false; btn.textContent = editing ? 'Salvar personagem' : 'Criar personagem'; $('cfCancel').disabled = false;
        $('cfErr').textContent = errorText(er);
      });
  };
}

/* =====================================================================
   Apresentação de Personagem em Tempo Real (Broadcast / Showcase)
   Transmite a foto e dados do personagem para todos os usuários com
   permissão, independente da tela em que estejam na aplicação.
   ===================================================================== */
var CharPresentation = (function () {
  var overlayEl = null;
  var keyHandler = null;

  function close() {
    if (overlayEl) {
      overlayEl.remove();
      overlayEl = null;
    }
    if (keyHandler) {
      document.removeEventListener('keydown', keyHandler, true);
      keyHandler = null;
    }
  }

  function getRevealTooltipText(item) {
    if (!item) return 'Revelar para jogadores';
    if (!isSecret(item)) {
      return 'Visível para todos (qualquer conta vê)';
    }
    var who = (typeof seenBy === 'function') ? seenBy(item) : 'o Mestre';
    return 'Visível atualmente para: ' + who;
  }

  function show(payload) {
    if (!payload || !payload.charId) return;
    close();

    var back = document.createElement('div');
    back.id = 'charPresentationBack';
    back.className = 'char-pres-backdrop';
    overlayEl = back;

    var master = typeof isMestre === 'function' && isMestre();
    var charItem = charById(payload.charId) || rawGet('characters', payload.charId);
    if (!charItem) {
      charItem = {
        id: payload.charId,
        name: payload.name,
        visible: payload.visible !== false,
        sharedWith: payload.sharedWith || [],
        createdBy: payload.createdBy || null
      };
    }

    var sub = payload.subtitle || [payload.race, payload.organization].filter(Boolean).join(' · ');
    var revealTooltip = getRevealTooltipText(charItem);
    var eyeSvg = '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>';

    var revealHtml = master ? (
      '<span class="char-pres-vis-menu">' +
        '<button class="char-pres-reveal-btn" type="button" id="charPresVisToggle" aria-haspopup="dialog" aria-expanded="false" title="' + esc(revealTooltip) + '">' +
          svg(eyeSvg, 14) + '<span>Revelar</span>' + svg('<path d="m6 9 6 6 6-6"/>', 11, 2.2) +
        '</button>' +
        '<span class="vis-pop char-pres-vis-pop" id="charPresVisPop" role="dialog" aria-label="Revelar para" hidden></span>' +
      '</span>'
    ) : '';

    back.innerHTML =
      '<div class="char-pres-card" role="dialog" aria-modal="true" aria-labelledby="charPresTitle">' +
        '<div class="char-pres-header">' +
          '<div class="char-pres-badge">' + svg(ICON.present, 13, 2) + '<span>Personagem</span></div>' +
          '<div class="char-pres-top-actions">' +
            revealHtml +
            '<button class="char-pres-close" type="button" id="charPresClose" aria-label="Fechar" title="Fechar (Esc)">' +
              svg(ICON.x, 16, 2.2) +
            '</button>' +
          '</div>' +
        '</div>' +
        '<div class="char-pres-photo-wrap" id="charPresPhoto">' +
          '<span class="char-pres-initials">' + esc(initials(payload.name || 'P')) + '</span>' +
        '</div>' +
        '<h2 class="char-pres-name" id="charPresTitle">' + esc(payload.name || '') + '</h2>' +
        (sub ? '<p class="char-pres-sub">' + esc(sub) + '</p>' : '') +
        '<div class="char-pres-actions">' +
          '<button class="btn primary char-pres-btn-more" type="button" id="charPresMore">' +
            svg(ICON.user, 15) + '<span>Ver mais informações</span>' +
          '</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(back);

    // Carrega a foto se houver referência de imagem
    if (payload.imageRef && W.store && typeof W.store.imageUrl === 'function') {
      W.store.imageUrl(payload.imageRef).then(function (url) {
        if (!url || !overlayEl) return;
        var pw = document.getElementById('charPresPhoto');
        if (pw) {
          pw.innerHTML = '<img src="' + esc(url) + '" alt="' + esc(payload.name || '') + '">';
        }
      }).catch(function () {});
    }

    var closeBtn = document.getElementById('charPresClose');
    if (closeBtn) closeBtn.onclick = close;

    var moreBtn = document.getElementById('charPresMore');
    if (moreBtn) {
      moreBtn.onclick = function () {
        close();
        var targetHash = charHref(payload.charId);
        if (typeof go === 'function') {
          go(targetHash);
        } else {
          window.location.hash = targetHash;
        }
      };
    }

    // Interações do menu Revelar (Mestre)
    if (master) {
      var revBtn = document.getElementById('charPresVisToggle');
      var revPop = document.getElementById('charPresVisPop');
      var revDraft = null;

      var users = (W.users || []).filter(function (u) { return u.role !== 'mestre'; }).sort(byName);
      var had = (charItem.sharedWith || []).filter(function (id) {
        return id !== charItem.createdBy && users.some(function (u) { return u.id === id; });
      });

      function sameIds(a, b) {
        return a.length === b.length && a.every(function (id) { return b.indexOf(id) >= 0; });
      }

      function syncRev() {
        var all = revPop.querySelector('[data-all]');
        var list = revPop.querySelector('.vis-users');
        if (!all) return;
        revDraft.all = all.checked;
        revDraft.ids = [].map.call(revPop.querySelectorAll('input[data-share]:checked:not([data-creator])'), function (el) {
          return el.getAttribute('data-share');
        });
        if (list) {
          list.classList.toggle('off', all.checked);
          list.querySelectorAll('input:not([data-creator])').forEach(function (el) { el.disabled = all.checked; });
        }
        var saveBtn = revPop.querySelector('[data-save]');
        if (saveBtn) {
          var wasAll = charItem.visible !== false;
          saveBtn.disabled = (revDraft.all === wasAll) && (!revDraft.all ? sameIds(revDraft.ids, had) : true);
        }
      }

      function openRev() {
        var isCurrentlyAll = charItem.visible !== false;
        revDraft = { id: charItem.id, all: isCurrentlyAll, ids: had.slice() };
        var d = revDraft;
        revPop.innerHTML =
          '<span class="lab">Mostrar para</span>' +
          '<label class="vis-user vis-all"><input type="checkbox" data-all' + (d.all ? ' checked' : '') + '><span>Todos</span><small>Qualquer conta vê</small></label>' +
          (users.length ? '<span class="vis-users">' + users.map(function (u) {
            var creator = charItem.createdBy === u.id;
            return '<label class="vis-user"><input type="checkbox" data-share="' + esc(u.id) + '"' + (creator ? ' data-creator' : '') +
              (creator || d.ids.indexOf(u.id) >= 0 ? ' checked' : '') + (creator ? ' disabled' : '') + '>' +
              '<span>' + esc(u.name) + '</span><small>' + (creator ? 'Criou' : esc(typeof roleLabel === 'function' ? roleLabel(u.role) : u.role)) + '</small></label>';
          }).join('') + '</span>' : '') +
          '<span class="btn-row"><button class="btn ghost" type="button" data-cancel>Cancelar</button><button class="btn primary" type="button" data-save>Salvar</button></span>';

        revPop.hidden = false;
        revBtn.setAttribute('aria-expanded', 'true');
        syncRev();
      }

      function closeRev() {
        revDraft = null;
        if (revPop) revPop.hidden = true;
        if (revBtn) revBtn.setAttribute('aria-expanded', 'false');
      }

      revBtn.onmouseenter = function () {
        revBtn.setAttribute('title', getRevealTooltipText(charItem));
      };

      revBtn.onclick = function (e) {
        e.stopPropagation();
        if (revPop.hidden) {
          openRev();
          var f = revPop.querySelector('input');
          if (f) f.focus();
        } else {
          closeRev();
        }
      };

      revPop.onchange = syncRev;

      revPop.onclick = function (e) {
        e.stopPropagation();
        if (e.target.closest('[data-cancel]')) {
          closeRev();
          revBtn.focus();
          return;
        }
        var save = e.target.closest('[data-save]');
        if (!save) return;
        var d = revDraft;
        var p = d.all ? { visible: true, updatedAt: now() } : { visible: false, sharedWith: d.ids, updatedAt: now() };
        save.disabled = true;

        W.store.patch('characters', charItem.id, p).then(function () {
          charItem.visible = !!d.all;
          charItem.sharedWith = d.ids;
          payload.visible = !!d.all;
          payload.sharedWith = d.ids;
          had = d.ids.slice();

          var newTooltip = getRevealTooltipText(charItem);
          revBtn.setAttribute('title', newTooltip);

          closeRev();
          toast(d.all ? 'Agora todos podem ver.' : 'Agora só ' + seenBy(charItem) + ' ' + seenVerb(charItem) + '.');

          // Se revelado para novas contas, sincroniza em tempo real
          if (W.store && W.store.realtime && typeof W.store.realtime.send === 'function') {
            W.store.realtime.send('char-presentation', payload);
          }
        }, function (er) {
          save.disabled = false;
          toast(errorText(er), true);
        });
      };
    }

    back.onclick = function (e) {
      var revPop = document.getElementById('charPresVisPop');
      if (revPop && !revPop.hidden && !e.target.closest('.char-pres-vis-menu')) {
        revPop.hidden = true;
        var revBtn = document.getElementById('charPresVisToggle');
        if (revBtn) revBtn.setAttribute('aria-expanded', 'false');
        return;
      }
      if (e.target === back) close();
    };

    keyHandler = function (e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        var revPop = document.getElementById('charPresVisPop');
        if (revPop && !revPop.hidden) {
          revPop.hidden = true;
          var revBtn = document.getElementById('charPresVisToggle');
          if (revBtn) {
            revBtn.setAttribute('aria-expanded', 'false');
            revBtn.focus();
          }
          return;
        }
        close();
      }
    };
    document.addEventListener('keydown', keyHandler, true);
  }

  function broadcast(id) {
    var c = charById(id);
    if (!c) {
      c = (W.characters || []).filter(function (x) { return x.id === id; })[0];
    }
    if (!c) return;

    var payload = {
      type: 'CHAR_PRESENTATION',
      charId: c.id,
      name: c.name,
      race: c.race || '',
      subtitle: charSubtitle(c) || '',
      organization: (typeof charOrgText === 'function' ? charOrgText(c) : '') || '',
      imageRef: c.image ? c.image.ref : null,
      visible: c.visible !== false,
      createdBy: c.createdBy || null,
      sharedWith: c.sharedWith || [],
      ts: Date.now()
    };

    // Abre localmente
    show(payload);

    // Envia via Realtime (Supabase)
    if (W.store && W.store.realtime && typeof W.store.realtime.send === 'function') {
      W.store.realtime.send('char-presentation', payload);
    }

    // Sincroniza via localStorage para outras abas no mesmo browser
    try {
      localStorage.setItem('hounds_char_presentation', JSON.stringify({ payload: payload, ts: Date.now() }));
    } catch (e) {}

    toast('Apresentando ' + c.name + ' para todos.');
  }

  function onReceive(payload) {
    if (!payload || !payload.charId) return;

    // Permissão: verifica se o usuário conectado tem permissão para ver
    var canSee = (typeof isMestre === 'function' && isMestre());
    if (!canSee) {
      var c = charById(payload.charId);
      if (c) {
        canSee = !isSecret(c) || isMine(c) || sharedWithMe(c);
      } else {
        var myId = typeof me === 'function' ? me() : null;
        canSee = (payload.visible !== false) ||
                 (!!myId && payload.createdBy === myId) ||
                 (!!myId && Array.isArray(payload.sharedWith) && payload.sharedWith.indexOf(myId) >= 0);
      }
    }

    if (!canSee) return;

    show(payload);
  }

  function init() {
    if (W.store && W.store.realtime && typeof W.store.realtime.on === 'function') {
      W.store.realtime.on('char-presentation', onReceive);
    }
  }

  // Listener para sincronização entre abas do mesmo navegador
  window.addEventListener('storage', function (e) {
    if (e.key === 'hounds_char_presentation' && e.newValue) {
      try {
        var data = JSON.parse(e.newValue);
        if (data && data.payload && (Date.now() - (data.ts || 0) < 30000)) {
          onReceive(data.payload);
        }
      } catch (err) {}
    }
  });

  return {
    broadcast: broadcast,
    show: show,
    close: close,
    onReceive: onReceive,
    init: init
  };
})();
