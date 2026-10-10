/* =====================================================================
   Hounds — Aba Organizações
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   Organizações (Mundo › Organizações)
   A character ↔ organization link is stored once, in organization.members
   ([{ charId, rank }]), so the organization form and the character form
   edit the same list. "rank" is free text: Líder, General, Recruta…
   ===================================================================== */
ICON.org = '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4M10 10h4M10 14h4M10 18h4"/>';
var RANK_DEFAULTS = ['Líder', 'General', 'Capitão', 'Conselheiro', 'Oficial', 'Membro', 'Recruta', 'Aliado', 'Informante'];
var REPUTATION_DEFAULTS = ['Excelente', 'Boa', 'Neutra', 'Ruim', 'Péssima', 'Temida', 'Desconhecida'];
function indexOrgs() { var idx = /** @type {Record<string, Organization>} */ ({}); W.organizations.forEach(function (o) { idx[o.id] = o; }); W.orgIdx = idx; }
function orgById(id) { return W.orgIdx[id] || null; }
function orgHref(id) { return hrefFor('org:' + id); }
// Defaults first in their own order, then anything else already in use.
function withDefaults(defaults, used) {
  var seen = {}, out = [];
  defaults.concat(used.sort(function (a, b) { return a.localeCompare(b, 'pt'); })).forEach(function (v) { v = (v || '').trim(); if (v && !seen[norm(v)]) { seen[norm(v)] = true; out.push(v); } });
  return out;
}
function rankTypes() { var used = []; W.organizations.forEach(function (o) { (o.members || []).forEach(function (m) { used.push(m.rank); }); }); return withDefaults(RANK_DEFAULTS, used); }
function reputations() { return withDefaults(REPUTATION_DEFAULTS, W.organizations.map(function (o) { return o.reputation; })); }
function datalistHtml(id, list) { return '<datalist id="' + id + '">' + list.map(function (v) { return '<option value="' + esc(v) + '">'; }).join('') + '</datalist>'; }
function rankOrder(rank) { var r = norm(rank); if (!r) return RANK_DEFAULTS.length + 1; for (var i = 0; i < RANK_DEFAULTS.length; i++) if (norm(RANK_DEFAULTS[i]) === r) return i; return RANK_DEFAULTS.length; }
// Visible members as [{ c, rank }]: by rank (Líder first, unranked last), then by name.
function orgMembers(o) {
  return ((o && o.members) || []).map(function (m) { return { c: W.charIdx[m.charId], rank: (m.rank || '').trim() }; }).filter(function (m) { return m.c; })
    .sort(function (a, b) { return (rankOrder(a.rank) - rankOrder(b.rank)) || a.rank.localeCompare(b.rank, 'pt') || byName(a.c, b.c); });
}
// Organizations a character belongs to, as [{ o, rank }].
function charOrgs(id) {
  var out = [];
  W.organizations.forEach(function (o) { (o.members || []).forEach(function (m) { if (m.charId === id) out.push({ o: o, rank: (m.rank || '').trim() }); }); });
  return out.sort(function (a, b) { return byName(a.o, b.o); });
}
// Names for subtitles and search; the old free-text field until it is migrated.
function charOrgText(c) { var l = charOrgs(c.id); return l.length ? l.map(function (x) { return x.o.name; }).join(', ') : (c.organization || '').trim(); }
function orgLocations(o) {
  var seen = {}, out = [];
  orgMembers(o).forEach(function (m) { charLocations(m.c.id).forEach(function (l) { if (!seen[l.id]) { seen[l.id] = true; out.push(l); } }); });
  return out.sort(byName);
}

Ops.saveOrganization = function (o, fields) {
  var t = now();
  // Keep members this user can't see, the same way as a character's relations.
  var members = (fields.members || []).slice();
  if (o) (o.members || []).forEach(function (m) { if (!W.charIdx[m.charId] && rawHas('characters', m.charId) && !members.some(function (x) { return x.charId === m.charId; })) members.push(m); });
  var body = { v: 1, name: fields.name, description: fields.description, reputation: fields.reputation, members: members, visible: fields.visible !== false, sharedWith: fields.sharedWith || (o && o.sharedWith) || [],
               createdBy: owner(o), createdAt: (o && o.createdAt) || t, updatedAt: t };
  return W.store.put('organizations', o ? o.id : null, body);
};
Ops.deleteOrganization = function (o) { return W.store.remove('organizations', o.id); };
// A character's memberships as picked in its form ([{ id: orgId|null, name, text: rank }]). Visible
// organizations left out lose the character; picks without an id are new organizations.
Ops.setCharOrgs = function (charId, picks, visible, shared) {
  var t = now(), q = /** @type {Promise<any>} */ (Promise.resolve());
  W.organizations.forEach(function (o) {
    var cur = o.members || [], had = cur.filter(function (m) { return m.charId === charId; })[0], want = picks.filter(function (p) { return p.id === o.id; })[0];
    if (!had && !want) return;
    var rank = want ? want.text.trim() : '';
    if (had && want && (had.rank || '') === rank) return;
    var next = !want ? cur.filter(function (m) { return m.charId !== charId; })
      : had ? cur.map(function (m) { return m.charId === charId ? { charId: charId, rank: rank } : m; }) : cur.concat([{ charId: charId, rank: rank }]);
    q = q.then(function () { return W.store.patch('organizations', o.id, { members: next, updatedAt: t }); });
  });
  picks.filter(function (p) { return !p.id && p.name.trim(); }).forEach(function (p) {
    q = q.then(function () {
      return W.store.put('organizations', null, { v: 1, name: p.name.trim(), description: '', reputation: '', members: [{ charId: charId, rank: p.text.trim() }],
        visible: visible !== false, sharedWith: shared || [], createdBy: me(), createdAt: t, updatedAt: t });
    });
  });
  return q;
};

// One-time: the old free-text "organization" of characters becomes organization records.
var migratedOrgs = false;
function migrateOrganizations() {
  if (migratedOrgs || !isMestre() || !canWrite() || !W.loaded.characters || !W.loaded.organizations) return;
  migratedOrgs = true;
  var found = {}, groups = {}, keys = [], t = now(), seq = /** @type {Promise<any>} */ (Promise.resolve());
  W.raw.organizations.forEach(function (o) { found[norm((o.name || '').trim())] = o; });
  W.raw.characters.forEach(function (c) {
    var v = (c.organization || '').trim(), k = norm(v); if (!k) return;
    if (!groups[k]) { groups[k] = { name: v, chars: [] }; keys.push(k); }
    groups[k].chars.push(c);
  });
  keys.forEach(function (k) {
    var g = groups[k], ex = found[k];
    seq = seq.then(function () {
      if (ex) {
        var members = (ex.members || []).slice();
        g.chars.forEach(function (c) { if (!members.some(function (m) { return m.charId === c.id; })) members.push({ charId: c.id, rank: '' }); });
        return W.store.patch('organizations', ex.id, { members: members, updatedAt: t });
      }
      return W.store.put('organizations', null, { v: 1, name: g.name, description: '', reputation: '', members: g.chars.map(function (c) { return { charId: c.id, rank: '' }; }),
        visible: g.chars.some(function (c) { return !isSecret(c); }), sharedWith: [], createdBy: me(), createdAt: t, updatedAt: t });
    }).then(function () {
      return g.chars.reduce(function (q, c) { return q.then(function () { return W.store.patch('characters', c.id, { organization: '', updatedAt: t }); }); }, Promise.resolve());
    }).catch(function () {});
  });
}

// A picker whose picks each carry a short free-text field (a member's rank).
//   sel: [{ id, text, … }] (edited in place) · find(q, raw): [{ label, sub, pick }] · chip(s), name(s): how a pick shows.
function textPicker(o) {
  var input = $(o.input), list = $(o.list), box = $(o.box), sel = o.sel, active = 0, options = [];
  function paintSel() {
    box.innerHTML = sel.map(function (s, i) {
      return '<div class="rel-row">' + o.chip(s) +
        '<input type="text" data-ti="' + i + '" list="' + o.datalist + '" maxlength="60" autocomplete="off" placeholder="' + esc(o.textLabel) + '" aria-label="' + esc(o.textLabel + ' de ' + o.name(s)) + '" value="' + esc(s.text) + '">' +
        '<button class="icon-btn" type="button" data-rm="' + i + '" aria-label="Remover ' + esc(o.name(s)) + '">' + svg(ICON.x, 14, 2.6) + '</button></div>';
    }).join('');
    fillImages(box);
  }
  function paintList() {
    options = o.find(norm(input.value.trim()), input.value.trim()).slice(0, 40);
    if (!options.length) { list.hidden = true; input.setAttribute('aria-expanded', 'false'); return; }
    active = Math.min(active, options.length - 1);
    list.innerHTML = options.map(function (x, i) { return '<button type="button" role="option" id="' + o.input + 'opt' + i + '" data-i="' + i + '" class="' + (i === active ? 'act' : '') + '" aria-selected="' + (i === active) + '">' + esc(x.label) + (x.sub ? '<small>' + esc(x.sub) + '</small>' : '') + '</button>'; }).join('');
    list.hidden = false; input.setAttribute('aria-expanded', 'true'); input.setAttribute('aria-activedescendant', o.input + 'opt' + active);
  }
  function pick(i) {
    var x = options[i]; if (!x) return;
    sel.push(x.pick); input.value = ''; active = 0; paintSel(); list.hidden = true; input.setAttribute('aria-expanded', 'false');
    var t = box.querySelector('[data-ti="' + (sel.length - 1) + '"]'); if (t) t.focus();
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
  box.addEventListener('input', function (e) { var t = e.target.closest('[data-ti]'); if (t) sel[+t.getAttribute('data-ti')].text = t.value; });
  box.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.closest('[data-ti]')) { e.preventDefault(); input.focus(); } });
  box.addEventListener('click', function (e) { var b = e.target.closest('[data-rm]'); if (!b) return; sel.splice(+b.getAttribute('data-rm'), 1); paintSel(); input.focus(); });
  paintSel();
}

function renderOrgsPage() {
  var can = canWrite();
  pageRoot.innerHTML =
    '<div class="head-row"><div>' + crumbsHtml('orgs') + '<h1>Organizações</h1><p class="lede">Guildas, ordens, casas e bandos do mundo. Cada organização tem reputação e membros, e cada membro pode ter um cargo, como Líder ou General.</p></div>' +
    (can ? '<button class="btn primary" type="button" id="newOrgBtn">' + svg(ICON.plus, 16, 2.4) + 'Nova organização</button>' : '') + '</div>' + notice() +
    (W.organizations.length ? '<div class="toolbar"><label for="orgSearch" style="position:absolute;left:-9999px">Buscar organizações</label><input class="search" id="orgSearch" type="search" placeholder="Buscar por nome, reputação ou membro" autocomplete="off" value="' + esc(S.ui.q || '') + '"><span class="meta" id="orgCount"></span></div>' : '') +
    '<div id="orgList"></div>';
  var b = $('newOrgBtn'); if (b) b.onclick = function () { openOrgForm(null); };
  var s = $('orgSearch'); if (s) s.addEventListener('input', function () { S.ui.q = s.value; renderOrgList(); });
  renderOrgList();
}
function renderOrgList() {
  var el = $('orgList'); if (!el) return;
  if (!W.loaded.organizations) { el.innerHTML = '<p class="lede">Carregando organizações…</p>'; return; }
  if (!W.organizations.length) {
    el.innerHTML = '<div class="empty-state">' + svg(ICON.org, 34, 1.6) + '<strong>Nenhuma organização cadastrada</strong><span>' + (canWrite() ? 'Crie a primeira com <b>Nova organização</b>.' : 'As organizações criadas vão aparecer aqui.') + '</span></div>';
    return;
  }
  var q = norm(S.ui.q);
  var list = W.organizations.slice().sort(byName).filter(function (o) {
    return !q || norm(o.name + ' ' + (o.reputation || '') + ' ' + (o.description || '') + ' ' + orgMembers(o).map(function (m) { return m.c.name + ' ' + m.rank; }).join(' ')).indexOf(q) >= 0;
  });
  var cnt = $('orgCount'); if (cnt) cnt.textContent = q ? list.length + ' de ' + W.organizations.length : plural(W.organizations.length, 'organização', 'organizações');
  el.innerHTML = list.length ? '<div class="loc-grid">' + list.map(function (o) {
    var n = orgMembers(o).length;
    return '<a class="loc-card" href="' + orgHref(o.id) + '"><div class="thumb">' + svg(ICON.org, 28, 1.6) + '</div><div class="map-card-body"><strong>' + esc(o.name) + '</strong>' +
      '<span class="where">' + (o.reputation ? 'Reputação: ' + esc(o.reputation) : 'Reputação não informada') + '</span><span class="meta">' + (n ? plural(n, 'membro', 'membros') : 'Sem membros') + '</span></div></a>';
  }).join('') + '</div>' : '<p class="lede">Nenhuma organização encontrada para essa busca.</p>';
}

function renderOrgPage() {
  var o = orgById(S.route.orgId), ui = S.ui;
  if (!o) {
    pageRoot.innerHTML = crumbsHtml('orgs') + (W.loaded.organizations ? '<h1>Organização não encontrada</h1><p class="lede">Essa organização foi excluída ou o link está incompleto.</p><div><a class="btn" href="#organizacoes">Voltar para Organizações</a></div>' : '<p class="lede">Carregando organização…</p>');
    return;
  }
  var can = canWrite(), members = orgMembers(o), locs = orgLocations(o);
  var head = crumbsHtml('org:' + o.id) + '<div class="head-row"><div><span class="badge">' + svg(ICON.org, 12, 2.4) + 'Organização</span><h1>' + esc(o.name) + '</h1>' +
    '<p class="lede">' + (members.length ? plural(members.length, 'membro', 'membros') : 'Sem membros') + (o.reputation ? ' · Reputação: ' + esc(o.reputation) : '') + '</p></div>' +
    (can ? '<div class="btn-row"><button class="btn" type="button" id="editOrgBtn">' + svg(ICON.edit, 15) + 'Editar organização</button><button class="btn danger" type="button" id="delOrgBtn">' + svg(ICON.trash, 15) + 'Excluir</button></div>' : '') + '</div>' +
    (ui.confirmDelete ? '<div class="confirm" role="alert"><span>Excluir <b>' + esc(o.name) + '</b>? Os personagens continuam cadastrados, só deixam de ser membros. Não dá para desfazer.</span><div class="btn-row"><button class="btn danger solid" type="button" id="delOrgYes">Excluir organização</button><button class="btn ghost" type="button" id="delOrgNo">Cancelar</button></div></div>' : '');
  var main = '<section><h2 class="sec-title">Descrição</h2>' + (o.description ? '<p class="long">' + esc(o.description) + '</p>' : '<p class="long none">Sem descrição.</p>') + '</section>' +
    '<section><div class="head-row" style="align-items:center"><h2 class="sec-title" style="margin:0">Membros</h2>' + (can ? '<button class="btn" type="button" id="addMemberBtn">' + svg(ICON.plus, 15, 2.4) + 'Adicionar membro</button>' : '') + '</div>' +
    (members.length ? '<div class="loc-grid" style="margin-top:12px">' + members.map(function (m) {
      var c = m.c;
      return '<a class="loc-card" href="' + charHref(c.id) + '"><div class="thumb char-thumb"' + (c.image ? ' data-img="' + esc(c.image.ref) + '"' : '') + '><span class="initials">' + esc(initials(c.name)) + '</span></div><div class="map-card-body"><strong>' + esc(c.name) + '</strong>' +
        '<span class="where">' + (m.rank ? esc(m.rank) : 'Sem cargo') + '</span>' + (c.race ? '<span class="meta">' + esc(c.race) + '</span>' : '') + '</div></a>';
    }).join('') + '</div>' : '<p class="lede" style="font-size:13px">Nenhum membro ainda.' + (can ? ' Use <b>Adicionar membro</b> ou escolha a organização no cadastro do personagem.' : '') + '</p>') + '</section>';
  var side = '<div class="box"><h2 class="sec-title" style="margin:0">Ficha</h2><dl class="facts"><dt>Reputação</dt><dd>' + (o.reputation ? esc(o.reputation) : '<span class="none">Não informada</span>') + '</dd>' +
    '<dt>Membros</dt><dd>' + (members.length || '<span class="none">Nenhum</span>') + '</dd></dl></div>' +
    '<div class="box"><h2 class="sec-title" style="margin:0">Locais dos membros</h2>' +
    (locs.length ? '<ul class="links">' + locs.map(function (l) { var mid = locMapId(l); return '<li><a class="row-link" href="' + locHref(l.id) + '">' + thumbSlot(l.image && l.image.ref, ICON.pin) + '<span class="mtext"><b>' + esc(l.name) + '</b><span class="where">' + (mid ? esc(mapPathText(mid)) : 'Sem mapa') + '</span></span></a></li>'; }).join('') + '</ul>' : '<p class="lede" style="font-size:13px">Nenhum membro está ligado a um local.</p>') + '</div>';
  pageRoot.innerHTML = head + '<div class="loc-layout"><div class="side" style="gap:22px">' + main + '</div><div class="side">' + side + '</div></div>';
  fillImages(pageRoot);
  var e = $('editOrgBtn'); if (e) e.onclick = function () { openOrgForm(o); };
  var a = $('addMemberBtn'); if (a) a.onclick = function () { openOrgForm(o, true); };
  var d = $('delOrgBtn'); if (d) d.onclick = function () { ui.confirmDelete = true; renderOrgPage(); };
  var dn = $('delOrgNo'); if (dn) dn.onclick = function () { ui.confirmDelete = false; renderOrgPage(); };
  var dy = $('delOrgYes'); if (dy) dy.onclick = function () {
    dy.disabled = true;
    Ops.deleteOrganization(o).then(function () { toast('Organização excluída.'); go('#organizacoes', true); }, function (er) { dy.disabled = false; toast(errorText(er), true); });
  };
}

function openOrgForm(o, focusMembers) {
  var editing = !!o;
  var html = '<form id="orgForm" novalidate><h2 id="ofTitle">' + (editing ? 'Editar organização' : 'Nova organização') + '</h2>' +
    '<div class="field" id="f_oname"><label for="oname">Nome</label><input type="text" id="oname" maxlength="100" autocomplete="off" placeholder="Ex.: The Hounds" value="' + esc(editing ? o.name : '') + '"><div class="err" id="err_oname"></div></div>' +
    '<div class="field"><label for="odesc">Descrição</label><textarea id="odesc" rows="6" maxlength="20000" placeholder="O que é, objetivos, história, onde atua…">' + esc(editing ? o.description || '' : '') + '</textarea></div>' +
    '<div class="field"><label for="orep">Reputação</label><input type="text" id="orep" list="repList" maxlength="120" autocomplete="off" placeholder="Ex.: Temida no porto, +2 entre os nobres" value="' + esc(editing ? o.reputation || '' : '') + '">' + datalistHtml('repList', reputations()) + '</div>' +
    '<div class="field"><label for="omem">Membros</label><div class="picker"><div class="rels" id="oMemSel"></div>' +
    '<input type="text" id="omem" autocomplete="off" placeholder="' + (W.characters.length ? 'Buscar personagem' : 'Nenhum personagem cadastrado ainda') + '"' + (W.characters.length ? '' : ' disabled') + ' role="combobox" aria-expanded="false" aria-controls="oMemList" aria-autocomplete="list">' +
    '<div class="suggest" id="oMemList" role="listbox" hidden></div></div>' + datalistHtml('rankList', rankTypes()) +
    '<span class="hint-text">Opcional. Ao lado de cada membro, o cargo dele. Ex.: Líder, General, Recruta. Dá para mudar o cargo quando quiser.</span></div>' +
    flagHtml('ovis', o, true) +
    '<div class="form-err" id="ofErr" role="alert"></div>' +
    '<div class="btn-row" style="justify-content:flex-end"><button class="btn ghost" type="button" id="ofCancel">Cancelar</button><button class="btn primary" type="submit" id="ofSave">' + (editing ? 'Salvar organização' : 'Criar organização') + '</button></div></form>';
  showModal(html);
  modal.setAttribute('aria-labelledby', 'ofTitle');
  var name = $('oname');
  name.addEventListener('input', function () { if (name.value.trim()) { $('err_oname').textContent = ''; $('f_oname').classList.remove('invalid'); } });

  var sel = editing ? orgMembers(o).map(function (m) { return { id: m.c.id, text: m.rank }; }) : [];
  textPicker({ input: 'omem', list: 'oMemList', box: 'oMemSel', sel: sel, datalist: 'rankList', textLabel: 'Cargo',
    name: function (s) { return charById(s.id).name; },
    chip: function (s) { var c = charById(s.id); return '<span class="person">' + avatarI(c) + esc(c.name) + '</span>'; },
    find: function (q) {
      return W.characters.slice().sort(byName).filter(function (c) { return !sel.some(function (s) { return s.id === c.id; }) && (!q || norm(c.name + ' ' + charSubtitle(c)).indexOf(q) >= 0); })
        .map(function (c) { return { label: c.name, sub: charSubtitle(c), pick: { id: c.id, text: '' } }; });
    } });
  if (focusMembers && W.characters.length) setTimeout(function () { $('omem').focus(); }, 30);

  $('ofCancel').onclick = function () { closeModal(); };
  $('orgForm').onsubmit = function (e) {
    e.preventDefault();
    if (modalOpen.busy) return;
    var n = name.value.trim();
    if (!n) { $('err_oname').textContent = 'Informe o nome da organização.'; $('f_oname').classList.add('invalid'); name.focus(); return; }
    if (W.organizations.some(function (x) { return (!editing || x.id !== o.id) && norm(x.name) === norm(n); }) && !$('ofErr').dataset.warned) {
      $('ofErr').textContent = 'Já existe uma organização com esse nome. Clique em ' + (editing ? 'Salvar' : 'Criar') + ' organização de novo para continuar mesmo assim.'; $('ofErr').dataset.warned = '1'; return;
    }
    modalOpen.busy = true;
    var btn = $('ofSave'); btn.disabled = true; btn.textContent = 'Salvando…'; $('ofCancel').disabled = true; $('ofErr').textContent = '';
    Ops.saveOrganization(o, { name: n, description: $('odesc').value.trim(), reputation: $('orep').value.trim(),
      members: sel.filter(function (s) { return charById(s.id); }).map(function (s) { return { charId: s.id, rank: s.text.trim() }; }), visible: flagVal('ovis', o), sharedWith: shareVal('ovis', o) })
      .then(function (id) {
        closeModal(true);
        toast(editing ? 'Organização salva.' : 'Organização criada.');
        if (!editing) go(orgHref(id));
      }, function (er) {
        if (!modalOpen) return;
        modalOpen.busy = false; btn.disabled = false; btn.textContent = editing ? 'Salvar organização' : 'Criar organização'; $('ofCancel').disabled = false;
        $('ofErr').textContent = errorText(er);
      });
  };
}
