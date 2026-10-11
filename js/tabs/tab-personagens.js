/* =====================================================================
   Hounds — Aba Personagens
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
    var body = { v: 1, name: fields.name, description: fields.description, race: fields.race, organization: '', mapIds: mids, relations: rels, image: image, visible: fields.visible !== false, sharedWith: fields.sharedWith || (c && c.sharedWith) || [],
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
  }).then(function () { return W.store.remove('characters', c.id); })
    .then(function () { return W.store.dropImage(c.image && c.image.ref); });
};

function renderCharsPage() {
  var can = canWrite();
  pageRoot.innerHTML =
    '<div class="head-row"><div>' + crumbsHtml('chars') + '<h1>Personagens</h1><p class="lede">Jogadores, aliados e NPCs do mundo. Cada personagem pode ter raça, organização e locais onde vive ou costuma estar.</p></div>' +
    (can ? '<button class="btn primary" type="button" id="newCharBtn">' + svg(ICON.plus, 16, 2.4) + 'Novo personagem</button>' : '') + '</div>' + notice() +
    (W.characters.length ? '<div class="toolbar"><label for="charSearch" style="position:absolute;left:-9999px">Buscar personagens</label><input class="search" id="charSearch" type="search" placeholder="Buscar por nome, raça, organização, mapa ou local" autocomplete="off" value="' + esc(S.ui.q || '') + '"><span class="meta" id="charCount"></span></div>' : '') +
    '<div id="charList"></div>';
  var b = $('newCharBtn'); if (b) b.onclick = function () { openCharForm(null); };
  var s = $('charSearch'); if (s) s.addEventListener('input', function () { S.ui.q = s.value; renderCharList(); });
  renderCharList();
}
function renderCharList() {
  var el = $('charList'); if (!el) return;
  if (!W.loaded.characters) { el.innerHTML = '<p class="lede">Carregando personagens…</p>'; return; }
  if (!W.characters.length) {
    el.innerHTML = '<div class="empty-state">' + svg(ICON.users, 34, 1.6) + '<strong>Nenhum personagem cadastrado</strong><span>' + (canWrite() ? 'Crie o primeiro com <b>Novo personagem</b>.' : 'Os personagens criados vão aparecer aqui.') + '</span></div>';
    return;
  }
  var q = norm(S.ui.q);
  var list = W.characters.slice().sort(byName).filter(function (c) {
    if (!q) return true;
    return norm(c.name + ' ' + (c.race || '') + ' ' + charOrgText(c) + ' ' + (c.description || '') + ' ' + charLocations(c.id).map(function (l) { return l.name; }).join(' ') + ' ' + charMaps(c).map(function (m) { return m.name; }).join(' ') + ' ' + charRelations(c).map(function (r) { return r.c.name; }).join(' ')).indexOf(q) >= 0;
  });
  var cnt = $('charCount'); if (cnt) cnt.textContent = q ? list.length + ' de ' + W.characters.length : plural(W.characters.length, 'personagem', 'personagens');
  el.innerHTML = list.length ? '<div class="loc-grid">' + list.map(function (c) {
    var L = charLocations(c.id).length, M = charMaps(c).length, R = charRelations(c).length, sub = charSubtitle(c);
    return '<a class="loc-card" href="' + charHref(c.id) + '"><div class="thumb char-thumb"' + (c.image ? ' data-img="' + esc(c.image.ref) + '"' : '') + '><span class="initials">' + esc(initials(c.name)) + '</span></div><div class="map-card-body"><strong>' + esc(c.name) + '</strong>' +
      '<span class="where">' + (sub ? esc(sub) : 'Sem raça ou organização') + '</span>' + (L || M || R ? '<span class="meta">' + [M ? plural(M, 'mapa', 'mapas') : '', L ? plural(L, 'local', 'locais') : '', R ? plural(R, 'relação', 'relações') : ''].filter(Boolean).join(' · ') + '</span>' : '') + '</div></a>';
  }).join('') + '</div>' : '<p class="lede">Nenhum personagem encontrado para essa busca.</p>';
  fillImages(el);
}

function renderCharPage() {
  var c = charById(S.route.charId), ui = S.ui;
  if (!c) {
    pageRoot.innerHTML = crumbsHtml('chars') + (W.loaded.characters ? '<h1>Personagem não encontrado</h1><p class="lede">Esse personagem foi excluído ou o link está incompleto.</p><div><a class="btn" href="#personagens">Voltar para Personagens</a></div>' : '<p class="lede">Carregando personagem…</p>');
    return;
  }
  var can = canWrite(), locs = charLocations(c.id), rels = charRelations(c);
  var head = crumbsHtml('char:' + c.id) + '<div class="head-row"><div><span class="badge">' + svg(ICON.user, 12, 2.4) + 'Personagem</span><h1>' + esc(c.name) + '</h1>' +
    (charSubtitle(c) ? '<p class="lede">' + esc(charSubtitle(c)) + '</p>' : '') + '</div>' +
    (can ? '<div class="btn-row"><button class="btn" type="button" id="editCharBtn">' + svg(ICON.edit, 15) + 'Editar personagem</button><button class="btn danger" type="button" id="delCharBtn">' + svg(ICON.trash, 15) + 'Excluir</button></div>' : '') + '</div>' +
    (ui.confirmDelete ? '<div class="confirm" role="alert"><span>Excluir <b>' + esc(c.name) + '</b>?' + (locs.length ? ' Ele sai de ' + plural(locs.length, 'local', 'locais') + '; os locais e mapas continuam cadastrados.' : '') + ' Não dá para desfazer.</span><div class="btn-row"><button class="btn danger solid" type="button" id="delCharYes">Excluir personagem</button><button class="btn ghost" type="button" id="delCharNo">Cancelar</button></div></div>' : '');
  var main = (c.image ? '<div class="loc-hero" id="charHero">' + svg(ICON.user, 32, 1.6) + '</div>' : '') +
    '<section><h2 class="sec-title">Descrição</h2>' + (c.description ? '<p class="long">' + esc(c.description) + '</p>' : '<p class="long none">Sem descrição.</p>') + '</section>';
  var side = '<div class="box"><h2 class="sec-title" style="margin:0">Ficha</h2><dl class="facts"><dt>Raça</dt><dd>' + (c.race ? esc(c.race) : '<span class="none">Não informada</span>') + '</dd>' +
    '<dt>Organizações</dt><dd>' + (charOrgs(c.id).length ? charOrgs(c.id).map(function (x) { return '<a href="' + orgHref(x.o.id) + '">' + esc(x.o.name) + '</a>' + (x.rank ? ' · ' + esc(x.rank) : ''); }).join('<br>')
      : c.organization ? esc(c.organization) : '<span class="none">Nenhuma</span>') + '</dd></dl></div>' +
    '<div class="box"><h2 class="sec-title" style="margin:0">Relacionamentos</h2>' +
    (rels.length ? '<ul class="links">' + rels.map(function (r) {
      var how = r.back ? (r.type ? 'Vê ' + c.name + ' como ' + r.type : 'Cita ' + c.name) : (r.type || 'Relação sem tipo');
      return '<li><a class="row-link" href="' + charHref(r.c.id) + '">' + thumbSlot(r.c.image && r.c.image.ref, ICON.user) + '<span class="mtext"><b>' + esc(r.c.name) + '</b><span class="where">' + esc(how) + '</span></span></a></li>';
    }).join('') + '</ul>' : '<p class="lede" style="font-size:13px">Nenhum relacionamento.' + (can ? ' Use <b>Editar personagem</b> para ligar outros personagens.' : '') + '</p>') + '</div>' +
    '<div class="box"><h2 class="sec-title" style="margin:0">Mapas relacionados</h2>' +
    (charMaps(c).length ? '<ul class="links">' + charMaps(c).map(function (m) { var pth = mapChain(m.id).slice(0, -1).map(function (x) { return x.name; }).join(' › '); return '<li><a class="row-link" href="' + mapHref(m.id) + '">' + thumbSlot(m.image && m.image.ref, ICON.map) + '<span class="mtext"><b>' + esc(m.name) + '</b><span class="where">' + (pth ? esc(pth) : 'Nível superior') + '</span></span></a></li>'; }).join('') + '</ul>' : '<p class="lede" style="font-size:13px">Nenhum mapa relacionado.' + (can ? ' Use <b>Editar personagem</b> para ligar mapas.' : '') + '</p>') + '</div>' +
    '<div class="box"><h2 class="sec-title" style="margin:0">Locais relacionados</h2>' +
    (locs.length ? '<ul class="links">' + locs.map(function (l) { var mid = locMapId(l); return '<li><a class="row-link" href="' + locHref(l.id) + '">' + thumbSlot(l.image && l.image.ref, ICON.pin) + '<span class="mtext"><b>' + esc(l.name) + '</b><span class="where">' + (mid ? esc(mapPathText(mid)) : 'Sem mapa') + '</span></span></a></li>'; }).join('') + '</ul>' : '<p class="lede" style="font-size:13px">Nenhum local relacionado.' + (can ? ' Use <b>Editar personagem</b> para ligar locais.' : '') + '</p>') + '</div>';
  pageRoot.innerHTML = head + '<div class="loc-layout"><div class="side" style="gap:22px">' + main + '</div><div class="side">' + side + '</div></div>';
  if (c.image) W.store.imageUrl(c.image.ref).then(function (u) {
    var h = $('charHero'); if (!h || !u) return;
    h.innerHTML = '<button class="hero-zoom" type="button" aria-label="Ampliar a imagem de ' + esc(c.name) + '" title="Clique para ampliar"><img src="' + esc(u) + '" alt="' + esc(c.name) + '"></button>';
    h.querySelector('.hero-zoom').onclick = function () { zoomImage(u, c.name); };
  });
  fillImages(pageRoot);
  var e = $('editCharBtn'); if (e) e.onclick = function () { openCharForm(c); };
  var d = $('delCharBtn'); if (d) d.onclick = function () { ui.confirmDelete = true; renderCharPage(); };
  var dn = $('delCharNo'); if (dn) dn.onclick = function () { ui.confirmDelete = false; renderCharPage(); };
  var dy = $('delCharYes'); if (dy) dy.onclick = function () {
    dy.disabled = true;
    Ops.deleteCharacter(c).then(function () { toast('Personagem excluído.'); go('#personagens', true); }, function (er) { dy.disabled = false; toast(errorText(er), true); });
  };
}

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
