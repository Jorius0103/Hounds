/* =====================================================================
   Hounds — Controle de Sessão e Usuário Ativo (Gate)
   ===================================================================== */

(function () {
  var USERS_KEY = 'gurps_combat_master_users_v2';
  var DEFAULTS = [
    { id: 'user-leandro', name: 'Leandro', role: 'mestre' },
    { id: 'user-renato', name: 'Renato', role: 'mestre' },
    { id: 'user-jorio', name: 'Jorio', role: 'mestre' },
    { id: 'user-espectador', name: 'Espectador', role: 'visualizador' }
  ];

  var ROLE = { mestre: 'Mestre', jogador: 'Jogador', visualizador: 'Espectador' };

  function el(id) { return document.getElementById(id); }

  function users() {
    try {
      var l = JSON.parse(localStorage.getItem(USERS_KEY) || 'null');
      if (Array.isArray(l) && l.length) return l;
    } catch (e) {}
    return (window.W && window.W.users && window.W.users.length) ? window.W.users : DEFAULTS;
  }

  function apply(u) {
    window.hubUser = u;
    document.body.setAttribute('data-role', u.role || 'jogador');
    document.body.setAttribute('data-user', u.id || '');

    var wav = el('whoAv'), wnm = el('whoName'), wrl = el('whoRole'), wb = el('whoBtn');
    if (wav) wav.textContent = initials(u.name);
    if (wnm) wnm.textContent = u.name;
    if (wrl) wrl.textContent = ROLE[u.role] || u.role || '';
    if (wb) wb.hidden = false;

    try {
      window.dispatchEvent(new CustomEvent('hub:user', { detail: u }));
    } catch (e) {}

    // Atualiza menu se role mudou
    if (window.renderMenu) window.renderMenu();
  }

  function choose(u) {
    apply(u);
    var gate = el('gate');
    if (gate) gate.hidden = true;
    if (window.syncMesa) window.syncMesa();
  }

  function openGate() {
    var list = (window.W && window.W.users && window.W.users.length) ? window.W.users : users();
    var gateList = el('gateList'), gateClose = el('gateClose'), gate = el('gate');
    if (!gateList || !gate) return;

    gateList.innerHTML = list.map(function (u, i) {
      var r = ROLE[u.role] ? u.role : 'jogador';
      return '<button type="button" class="gate-user" data-i="' + i + '">' +
        '<span class="av">' + esc(initials(u.name)) + '</span>' +
        '<span class="nm">' + esc(u.name) + '</span>' +
        '<span class="role-tag ' + r + '">' + esc(ROLE[u.role] || u.role || 'Jogador') + '</span>' +
        '</button>';
    }).join('');

    gateList.onclick = function (ev) {
      var b = ev.target.closest('.gate-user');
      if (!b) return;
      var u = list[+b.dataset.i];
      if (u) choose({ id: u.id, name: u.name, role: u.role });
    };

    if (gateClose) gateClose.hidden = !window.hubUser;
    gate.hidden = false;
  }

  window.hubUsers = users;
  window.hubSwitchUser = openGate;
  window.hubApplyUser = apply;

  var whoBtn = el('whoBtn'), gateClose = el('gateClose');
  if (whoBtn) whoBtn.onclick = openGate;
  if (gateClose) gateClose.onclick = function () { el('gate').hidden = true; };

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && el('gate') && !el('gate').hidden && window.hubUser) {
      el('gate').hidden = true;
    }
  });

  // Abre gate inicial se nenhum usuário foi selecionado ainda
  setTimeout(function () {
    if (!window.hubUser) openGate();
  }, 100);
})();
