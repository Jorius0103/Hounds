/* =====================================================================
   Hounds — Escolha de usuário (tela de entrada) e abertura da Mesa de
   Combate no iframe. O HTML da Mesa vem de js/mesa-frame.js.
   ===================================================================== */
(function () {
  var USERS_KEY = 'gurps_combat_master_users_v2';
  var DEFAULTS = [
    { id: 'user-leandro', name: 'Leandro', role: 'mestre' },
    { id: 'user-espectador', name: 'Espectador', role: 'visualizador' }
  ];
  var ROLE = { mestre: 'Mestre', jogador: 'Jogador', visualizador: 'Espectador' };
  function el(id) { return /** @type {AnyEl} */ (document.getElementById(id)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ini(n) { var p = String(n || '?').trim().split(/\s+/); return ((p[0] || '?')[0] + (p[1] ? p[1][0] : (p[0][1] || ''))).toUpperCase(); }
  function users() {
    try { var l = JSON.parse(localStorage.getItem(USERS_KEY) || 'null'); if (Array.isArray(l) && l.length) return l; } catch (e) {}
    return DEFAULTS;
  }
  var mesaFor = null;
  function syncMesa() {
    if (!window.hubUser || location.hash !== '#mesa') return;
    if (mesaFor === window.hubUser.id) { try { var fw = el('mesaFrame').contentWindow; fw && fw.__mesaOpenPicker && fw.__mesaOpenPicker(); } catch (e) {} return; }
    var who = mesaFor = window.hubUser.id;
    var src = window.hubMesaSource();
    var go = function () {
      src.then(function (html) { if (mesaFor === who) el('mesaFrame').srcdoc = html; }, function () {
        if (mesaFor === who) mesaFor = null;
        toast('Não foi possível carregar a Mesa de Combate.', true);
      });
    };
    if (window.hubMesaPrepare) window.hubMesaPrepare().then(go, go); else go();
  }
  window.addEventListener('hashchange', syncMesa);
  function apply(u) {
    window.hubUser = u;
    document.body.setAttribute('data-role', u.role || 'jogador');
    document.body.setAttribute('data-user', u.id || '');
    el('whoAv').textContent = ini(u.name);
    el('whoName').textContent = u.name;
    el('whoRole').textContent = ROLE[u.role] || u.role || '';
    el('whoBtn').hidden = false;
    try { window.dispatchEvent(new CustomEvent('hub:user', { detail: u })); } catch (e) {}
  }
  function choose(u) {
    var changed = !window.hubUser || window.hubUser.id !== u.id;
    apply(u);
    el('gate').hidden = true;
    if (changed) mesaFor = null;
    syncMesa();
  }
  function openGate() {
    var list = (window.hubUsers && window.hubUsers()) || users();
    el('gateList').innerHTML = list.map(function (u, i) {
      var r = ROLE[u.role] ? u.role : 'jogador';
      return '<button type="button" class="gate-user" data-i="' + i + '"><span class="av">' + esc(ini(u.name)) + '</span><span class="nm">' + esc(u.name) + '</span><span class="role-tag ' + r + '">' + esc(ROLE[u.role] || u.role || 'Jogador') + '</span></button>';
    }).join('');
    el('gateList').onclick = function (ev) {
      var b = ev.target.closest('.gate-user'); if (!b) return;
      var u = list[+b.dataset.i]; if (u) choose({ id: u.id, name: u.name, role: u.role });
    };
    el('gateClose').hidden = !window.hubUser;
    el('gate').hidden = false;
    var f = el('gateList').querySelector('.gate-user'); if (f) f.focus();
  }
  el('gateClose').onclick = function () { el('gate').hidden = true; };
  el('whoBtn').onclick = openGate;
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !el('gate').hidden && window.hubUser) el('gate').hidden = true; });
  window.hubSwitchUser = openGate;
  window.hubApplyUser = apply;
  window.hubMesaStale = function () { mesaFor = null; syncMesa(); };
  window.addEventListener('hub:users', function () {
    var list = window.hubUsers && window.hubUsers(); if (!list) return;
    var cur = window.hubUser;
    if (cur) {
      var u = list.filter(function (x) { return x.id === cur.id; })[0];
      if (!u) { window.hubUser = null; el('whoBtn').hidden = true; openGate(); return; }
      if (u.name !== cur.name || u.role !== cur.role) { apply(u); mesaFor = null; syncMesa(); }
    }
    if (!el('gate').hidden) openGate();
  });
  openGate();
})();
