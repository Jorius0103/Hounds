/* =====================================================================
   Hounds — Utilitários Globais e Ícones Compartilhados
   ===================================================================== */

var ICON = {
  tatica: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/><circle cx="12" cy="12" r="3"/>',
  mesa: '<path d="m14.5 17.5 3 3 4-4-3-3M6.5 5.5l-3-3-4 4 3 3M13 19l6-6M5 11l6-6M9.5 8.5l5 5M8.5 9.5l5 5"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  mundo: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20"/>',
  maps: '<path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764v15M9 3.236v15"/>',
  map: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="m3 15 5-5 4 4 3-3 6 6"/>',
  pin: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  notes: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10M6 10h10M6 14h6"/>',
  note: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4M9 13h6M9 17h4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  move: '<path d="M12 2v20M2 12h20"/><path d="m15 19-3 3-3-3M19 9l3 3-3 3M5 9l-3 3 3 3M9 5l3-3 3 3"/>',
  explore: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  image: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
  arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  eyeOff: '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/>',
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
  terminal: '<polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>'
};

var CHEV = '<svg class="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';
var EYE_OFF = ICON.eyeOff;

var CATEGORIES = [
  { id: 'ponto', label: 'Ponto de interesse', color: '#f59e0b', icon: '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>' },
  { id: 'cidade', label: 'Cidade', color: '#38bdf8', icon: '<path d="M22 20v-9H2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2Z"/><path d="M18 11V4H6v7"/><path d="M15 22v-4a3 3 0 0 0-6 0v4"/><path d="M6 4V2M18 4V2M10 4V2M14 4V2"/>' },
  { id: 'taverna', label: 'Taverna', color: '#a3e635', icon: '<path d="M17 11h1a3 3 0 0 1 0 6h-1"/><path d="M9 12v6M13 12v6"/><path d="M5 8v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8"/><path d="M5 8h12"/>' },
  { id: 'perigo', label: 'Perigo', color: '#f87171', icon: '<path d="M15 22a1 1 0 0 0 1-1v-1a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20v1a1 1 0 0 0 1 1z"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="12" r="1"/>' },
  { id: 'missao', label: 'Missão', color: '#c084fc', icon: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>' },
  { id: 'personagem', label: 'Personagem', color: '#f472b6', icon: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>' },
  { id: 'natureza', label: 'Natureza', color: '#34d399', icon: '<path d="m8 3 4 8 5-5 5 15H2L8 3z"/>' }
];

var CAT = {};
CATEGORIES.forEach(function (c) { CAT[c.id] = c; });
function cat(id) { return CAT[id] || CATEGORIES[0]; }

function svg(paths, size, sw) {
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (sw || 2) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + '</svg>';
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function $(id) { return document.getElementById(id); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }

function byName(a, b) {
  return String(a.name || '').localeCompare(String(b.name || ''), 'pt', { sensitivity: 'base', numeric: true });
}

function norm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function initials(n) {
  var p = String(n || '?').trim().split(/\s+/);
  return ((p[0] || '?')[0] + (p[1] ? p[1][0] : (p[0][1] || ''))).toUpperCase();
}

function clip(s, n) {
  s = String(s || '');
  return s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + '…' : s;
}

function plural(n, one, many) {
  return n + ' ' + (n === 1 ? one : many);
}

function fmtBytes(b) {
  if (!b && b !== 0) return '';
  return b > 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
}

function fmtDate(t) {
  if (!t) return '';
  try {
    var d = new Date(t);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) {
    return '';
  }
}

var toastT;
function toast(msg, bad) {
  var t = $('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.toggle('bad', !!bad);
  t.hidden = false;
  clearTimeout(toastT);
  toastT = setTimeout(function () { t.hidden = true; }, 3400);
}

function lstore(k, v) {
  try {
    if (v === undefined) return localStorage.getItem(k);
    localStorage.setItem(k, v);
  } catch (e) {
    return null;
  }
}

/* =====================================================================
   Modal & Feedback Helpers
   ===================================================================== */
var modalBack = $('modalBack'), modal = $('modal'), modalOnClose = null;

function showModal(html, onClose) {
  modalBack = modalBack || $('modalBack');
  modal = modal || $('modal');
  modal.innerHTML = html;
  modalBack.hidden = false;
  modalOnClose = onClose || null;
  var first = modal.querySelector('input:not([type=hidden]), textarea, select, button[type=submit]');
  if (first) setTimeout(function () { first.focus(); }, 10);
}

function closeModal() {
  modalBack = modalBack || $('modalBack');
  modal = modal || $('modal');
  if (modalBack) modalBack.hidden = true;
  if (modal) modal.innerHTML = '';
  if (modalOnClose) {
    try { modalOnClose(); } catch (e) {}
    modalOnClose = null;
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (modalBack && !modalBack.hidden) { closeModal(); return; }
    }
  });
  if (modalBack) {
    modalBack.addEventListener('click', function (e) {
      if (e.target === modalBack) closeModal();
    });
  }
}

function isMestre() {
  return window.hubUser && window.hubUser.role === 'mestre';
}

function isSecret(doc) {
  return !doc || doc.visible === false;
}

function secretTag() {
  return '<span class="secret-tag">' + svg(ICON.eyeOff, 11, 2.4) + 'Só o Mestre</span>';
}

function flagHtml(id, doc) {
  if (!isMestre()) return '';
  var on = !doc || doc.visible !== false;
  return '<label class="vis-flag" for="' + id + '"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + '>' +
    '<span><b>Visível para todos</b><small>Desmarque para esconder de Jogador e Espectador.</small></span></label>';
}

function flagVal(id, doc) {
  if (!isMestre()) return doc ? doc.visible !== false : true;
  var el = $(id);
  return el ? !!el.checked : true;
}

function imageFieldHtml(id, label, hint) {
  return '<div class="field" id="f_' + id + '"><span class="lab">' + esc(label) + '</span>' +
    '<div class="img-slot" id="' + id + '_slot">' +
      '<button class="img-pick" type="button" id="' + id + '_btn">' + svg(ICON.image, 20) + '<span>Escolher imagem…</span></button>' +
      '<input type="file" id="' + id + '_file" accept="image/*" style="display:none">' +
    '</div><span class="hint-text">' + esc(hint) + '</span><div class="err" id="err_' + id + '"></div></div>';
}

/* =====================================================================
   Model & Path Queries
   ===================================================================== */
function mapById(id) { return (window.W && window.W.mapIdx) ? window.W.mapIdx[id] : null; }
function locById(id) { return (window.W && window.W.locIdx) ? window.W.locIdx[id] : null; }
function charById(id) { return (window.W && window.W.charIdx) ? window.W.charIdx[id] : null; }
function nbById(id) { return (window.W && window.W.notebooks) ? window.W.notebooks.find(function (n) { return n.id === id; }) : null; }
function noteById(id) { return (window.W && window.W.notes) ? window.W.notes.find(function (n) { return n.id === id; }) : null; }

function childMaps(pid) {
  return ((window.W && window.W.kids && window.W.kids[pid]) || []).filter(function (m) {
    return isMestre() || !isSecret(m);
  });
}

function mapLocations(mid) {
  return (window.W && window.W.locations || []).filter(function (l) {
    return l.mapId === mid && (isMestre() || !isSecret(l));
  });
}

function mapCharacters(mid) {
  return (window.W && window.W.characters || []).filter(function (c) {
    return (c.mapIds || []).indexOf(mid) >= 0 && (isMestre() || !isSecret(c));
  });
}

function charLocations(cid) {
  return (window.W && window.W.locations || []).filter(function (l) {
    return (l.characterIds || []).indexOf(cid) >= 0 && (isMestre() || !isSecret(l));
  });
}

function charMaps(c) {
  return (c.mapIds || []).map(mapById).filter(Boolean).filter(function (m) {
    return isMestre() || !isSecret(m);
  });
}

function locMapId(l) { return l ? l.mapId : null; }

function mapPathText(mid) {
  var chain = mapChain(mid);
  return chain.map(function (m) { return m.name; }).join(' › ');
}

function mapChain(id) {
  var out = [], seen = {}, cur = mapById(id);
  while (cur && !seen[cur.id]) {
    seen[cur.id] = true;
    out.unshift(cur);
    cur = mapById(window.W && window.W.parent && window.W.parent[cur.id]);
  }
  return out;
}

function nbNotes(nbId) {
  return (window.W && window.W.notes || []).filter(function (n) {
    return n.notebookId === nbId && (isMestre() || !isSecret(n));
  }).sort(function (a, b) {
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });
}

function distinct(field) {
  var set = {}, list = (window.W && window.W.characters) || [];
  list.forEach(function (c) {
    var v = (c[field] || '').trim();
    if (v) set[v] = true;
  });
  return Object.keys(set).sort(function (a, b) {
    return a.localeCompare(b, 'pt', { sensitivity: 'base' });
  });
}

var RACE_DEFAULTS = ['Humano', 'Elfo', 'Anão', 'Orc', 'Goblin', 'Halfling', 'Morto-vivo'];

function charSubtitle(c) {
  var p = [c.race, c.organization].filter(Boolean);
  return p.join(' · ');
}

function personChip(c) {
  return '<a class="person" href="#char~' + encodeURIComponent(c.id) + '">' +
    thumbSlot(c.image && c.image.ref, ICON.user, 'thumb round') +
    '<span><b>' + esc(c.name) + '</b>' + (charSubtitle(c) ? '<small>' + esc(charSubtitle(c)) + '</small>' : '') + '</span></a>';
}

function thumbSlot(ref, iconPaths, cls) {
  return '<span class="' + (cls || 'mthumb') + '"' + (ref ? ' data-img="' + esc(ref) + '"' : '') + '>' + svg(iconPaths, 16, 1.8) + '</span>';
}

function fillImages(root) {
  if (!root || !window.W || !window.W.store) return;
  root.querySelectorAll('[data-img]').forEach(function (el) {
    var ref = el.getAttribute('data-img');
    window.W.store.imageUrl(ref).then(function (u) {
      if (u && el.isConnected) {
        el.innerHTML = '<img src="' + esc(u) + '" alt="" loading="lazy">';
      }
    });
  });
}

function crumbsHtml(nodeId) {
  var byId = window.byId || {};
  var node = byId[nodeId];
  if (!node) return '';
  var anc = window.ancestors ? window.ancestors(nodeId) : [];
  return '<div class="crumbs">' + anc.map(function (p) {
    var n = byId[p];
    if (!n) return '';
    var lab = esc(n.label);
    return (n.route ? '<a href="' + (window.hrefFor ? window.hrefFor(p) : '#' + p) + '">' + lab + '</a>' : '<span>' + lab + '</span>') + '<span aria-hidden="true">/</span>';
  }).join('') + '<b>' + esc(node.label) + '</b></div>';
}

function notice() {
  if (!window.W || !window.W.store) return '';
  if (window.W.store.kind === 'local') {
    return '<p class="notice">Os dados estão sendo salvos só neste navegador, porque o armazenamento compartilhado não está configurado.</p>';
  }
  if (!isMestre()) {
    return '<p class="notice">Visualização de Jogador/Espectador. Itens do Mestre permanecem protegidos.</p>';
  }
  return '';
}

function mapRow(m, here, extra) {
  var k = childMaps(m.id).length, L = mapLocations(m.id).length;
  var meta = [k ? plural(k, 'submapa', 'submapas') : '', L ? plural(L, 'local', 'locais') : ''].filter(Boolean).join(' · ');
  return '<a class="mrow' + (here ? ' here' : '') + '" href="' + (window.mapHref ? window.mapHref(m.id) : '#map~' + m.id) + '"' + (here ? ' aria-current="page"' : '') + '>' +
    thumbSlot(m.image && m.image.ref, ICON.map) +
    '<span class="mtext">' + (extra || '') + '<b>' + esc(m.name) + '</b>' + (meta ? '<span class="meta">' + meta + '</span>' : '') + '</span></a>';
}

function fullTree(pid) {
  var list = childMaps(pid);
  if (!list.length) return '';
  return '<ul>' + list.map(function (m) {
    return '<li>' + mapRow(m) + fullTree(m.id) + '</li>';
  }).join('') + '</ul>';
}

function pathTree(chain, opts) {
  opts = opts || {};
  function level(i) {
    if (i >= chain.length) {
      if (opts.leaf) {
        return '<ul><li><span class="mrow here">' + thumbSlot(opts.leaf.image && opts.leaf.image.ref, ICON.pin) +
          '<span class="mtext"><span class="lvl">Local</span><b>' + esc(opts.leaf.name) + '</b></span></span></li></ul>';
      }
      return '';
    }
    var m = chain[i], last = i === chain.length - 1;
    var inner = level(i + 1);
    if (last && opts.kids) {
      inner += (function () {
        var k = childMaps(m.id);
        return k.length ? '<ul>' + k.map(function (c) { return '<li>' + mapRow(c) + '</li>'; }).join('') + '</ul>' : '';
      })();
    }
    return '<ul><li>' + mapRow(m, last && opts.markLast) + inner + '</li></ul>';
  }
  var html = level(0);
  return '<div class="mtree path-tree">' + html.replace(/^<ul>/, '').replace(/<\/ul>$/, '') + '</div>';
}

function tagPage(doc, col) {
  // Utility hook for page header tags
}

/* =====================================================================
   AppLogger — Sistema de Registro de Eventos e Depuração
   ===================================================================== */
var AppLogger = (function () {
  var LOGS_KEY = 'hounds_system_logs_v1';
  var MAX_LOGS = 300;
  var listeners = [];

  function load() {
    try {
      var raw = localStorage.getItem(LOGS_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  }

  function save(arr) {
    try {
      if (arr.length > MAX_LOGS) arr = arr.slice(arr.length - MAX_LOGS);
      localStorage.setItem(LOGS_KEY, JSON.stringify(arr));
    } catch (e) {}
  }

  function add(level, category, message, details) {
    var logs = load();
    var entry = {
      id: 'log_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
      timestamp: Date.now(),
      level: level || 'INFO', // INFO, WARN, ERROR, SYNC
      category: category || 'SISTEMA',
      message: String(message || ''),
      details: details ? (typeof details === 'object' ? JSON.stringify(details) : String(details)) : null,
      user: window.hubUser ? window.hubUser.name : 'Visitante'
    };
    logs.push(entry);
    save(logs);
    listeners.forEach(function (fn) {
      try { fn(entry, logs); } catch (e) {}
    });
    if (level === 'ERROR') console.error('[Hounds Logger]', entry.category, entry.message, details);
    else console.log('[Hounds Logger]', entry.category, entry.message);
    return entry;
  }

  return {
    info: function (cat, msg, det) { return add('INFO', cat, msg, det); },
    warn: function (cat, msg, det) { return add('WARN', cat, msg, det); },
    error: function (cat, msg, det) { return add('ERROR', cat, msg, det); },
    sync: function (cat, msg, det) { return add('SYNC', cat, msg, det); },
    getLogs: function () { return load().reverse(); },
    clearLogs: function () {
      save([]);
      listeners.forEach(function (fn) { try { fn(null, []); } catch (e) {} });
    },
    subscribe: function (fn) {
      listeners.push(fn);
      return function () { listeners = listeners.filter(function (x) { return x !== fn; }); };
    }
  };
})();

window.AppLogger = AppLogger;
