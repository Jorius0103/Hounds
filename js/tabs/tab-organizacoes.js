/* =====================================================================
   Hounds — Aba Organizações (Mundo › Organizações)
   A lista, a página da organização e o formulário são React (src/hub/
   paginas/Organizacoes.tsx, Organizacao.tsx e OrganizacaoForm.tsx); aqui
   ficam os dados (como os cargos, rankTypes, que o formulário de
   personagem também usa), a gravação (Ops) e a migração do campo antigo.
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
// The locations and maps an organization is linked to (organization.locationIds / mapIds), and the reverse.
function orgLocs(o) { return uniqIds(o && o.locationIds).map(function (id) { return W.locIdx[id]; }).filter(Boolean).sort(byName); }
function orgMaps(o) { return uniqIds(o && o.mapIds).map(function (id) { return W.mapIdx[id]; }).filter(Boolean).sort(byName); }
function locOrgs(locId) { return W.organizations.filter(function (o) { return (o.locationIds || []).indexOf(locId) >= 0; }).sort(byName); }
function mapOrgs(mapId) { return W.organizations.filter(function (o) { return (o.mapIds || []).indexOf(mapId) >= 0; }).sort(byName); }

Ops.saveOrganization = function (o, fields, newFile, newDims, removeImage) {
  var oldRef = o && o.image && o.image.ref;
  var p = Promise.resolve(o && o.image ? o.image : null);
  if (newFile) p = W.store.upload(newFile).then(function (u) { return { ref: u.ref, w: newDims.w, h: newDims.h, type: u.type, size: u.size }; });
  else if (removeImage) p = Promise.resolve(null);
  return p.then(function (image) {
    var t = now();
    // One entry per character; keep members this user can't see, the same way as a character's relations.
    var seen = {}, members = (fields.members || []).filter(function (m) { if (!m.charId || seen[m.charId]) return false; seen[m.charId] = true; return true; });
    if (o) (o.members || []).forEach(function (m) { if (!W.charIdx[m.charId] && rawHas('characters', m.charId) && !seen[m.charId]) { seen[m.charId] = true; members.push(m); } });
    var locIds = keepHidden((fields.locationIds || []).filter(function (id) { return rawHas('locations', id); }), o && o.locationIds, 'locations', W.locIdx);
    var mapIds = keepHidden((fields.mapIds || []).filter(function (id) { return rawHas('maps', id); }), o && o.mapIds, 'maps', W.mapIdx);
    var body = { v: 1, name: fields.name, description: fields.description, reputation: fields.reputation, members: members, locationIds: locIds, mapIds: mapIds, image: image, visible: fields.visible !== false, sharedWith: fields.sharedWith || (o && o.sharedWith) || [],
                 createdBy: owner(o), createdAt: (o && o.createdAt) || t, updatedAt: t };
    return W.store.put('organizations', o ? o.id : null, body);
  }).then(function (id) {
    if (oldRef && (newFile || removeImage)) W.store.dropImage(oldRef);
    return id;
  });
};
Ops.deleteOrganization = function (o) {
  return W.store.remove('organizations', o.id).then(function () { return W.store.dropImage(o.image && o.image.ref); });
};
// A character's memberships as picked in its form ([{ id: orgId|null, name, text: rank }]). Visible
// organizations left out lose the character; picks without an id are new organizations.
Ops.setCharOrgs = function (charId, picks, visible, shared) {
  var t = now(), q = /** @type {Promise<any>} */ (Promise.resolve());
  // The same organization once: picked twice, or typed twice as a new name, counts as one link.
  var seenPick = {};
  picks = picks.filter(function (p) { var k = p.id ? 'id:' + p.id : 'new:' + norm((p.name || '').trim()); if (seenPick[k]) return false; seenPick[k] = true; return true; });
  W.organizations.forEach(function (o) {
    var cur = o.members || [], mine = cur.filter(function (m) { return m.charId === charId; }), had = mine[0], want = picks.filter(function (p) { return p.id === o.id; })[0];
    if (!had && !want) return;
    var rank = want ? want.text.trim() : '';
    if (had && want && mine.length === 1 && (had.rank || '') === rank) return;
    // A character is in each organization once; extra entries from before are dropped.
    var once = false;
    var next = !want ? cur.filter(function (m) { return m.charId !== charId; })
      : had ? cur.filter(function (m) { if (m.charId !== charId) return true; if (once) return false; once = true; return true; }).map(function (m) { return m.charId === charId ? { charId: charId, rank: rank } : m; })
      : cur.concat([{ charId: charId, rank: rank }]);
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
