/* =====================================================================
   Hounds — Entrada (tela de login ou escolha de usuário) e abertura da
   Mesa de Combate no iframe. O HTML da Mesa vem de js/mesa-frame.js.
   Com o Supabase, cada pessoa entra com email e senha (Supabase Auth) e
   o usuário vem do banco: js/store/supabase.js chama hubAskLogin() e
   hubApplyUser(). Sem o Supabase, quem abre escolhe um usuário da lista.
   ===================================================================== */
(function () {
  var USERS_KEY = 'gurps_combat_master_users_v2';
  var DEFAULTS = [
    { id: 'user-leandro', name: 'Leandro', role: 'mestre' },
    { id: 'user-jogador', name: 'Jogador', role: 'jogador' }
  ];
  var ROLE = { mestre: 'Mestre', admin: 'Admin', jogador: 'Jogador' };
  function cleanRoleOf(r) { return r === 'mestre' || r === 'admin' ? r : 'jogador'; }
  // Login com email e senha: o banco é o Supabase (o artifact do claude.ai vem antes dele, em connect()).
  var AUTH = typeof sbConfig === 'function' && !!sbConfig() && !(window.claude && typeof window.claude.use === 'function');
  function el(id) { return /** @type {AnyEl} */ (document.getElementById(id)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ini(n) { var p = String(n || '?').trim().split(/\s+/); return ((p[0] || '?')[0] + (p[1] ? p[1][0] : (p[0][1] || ''))).toUpperCase(); }
  function users() {
    try {
      var l = JSON.parse(localStorage.getItem(USERS_KEY) || 'null');
      if (Array.isArray(l) && l.length) {
        return l.map(function(u) {
          return { id: u.id, name: u.name, role: cleanRoleOf(u.role) };
        });
      }
    } catch (e) {}
    return DEFAULTS;
  }
  var mesaFor = null;
  function syncMesa() {
    if (!window.hubUser || location.hash !== '#mesa') return;
    var frame = el('mesaFrame');
    if (mesaFor === window.hubUser.id && frame && frame.srcdoc) {
      return;
    }
    var who = mesaFor = window.hubUser.id;
    var src = window.hubMesaSource();
    var go = function () {
      src.then(function (html) { if (mesaFor === who && frame) frame.srcdoc = html; }, function () {
        if (mesaFor === who) mesaFor = null;
        toast('Não foi possível carregar a Mesa de Combate.', true);
      });
    };
    if (window.hubMesaPrepare) window.hubMesaPrepare().then(go, go); else go();
  }
  window.addEventListener('hashchange', syncMesa);
  function apply(u) {
    var cleanRole = cleanRoleOf(u.role);
    var cleanUser = { id: u.id, name: u.name, role: cleanRole };
    window.hubUser = cleanUser;
    // The Mesa (iframe) reads the user from window.hubUser, the hub:user event and here. There, only
    // the Mestre is told apart by profile; anyone else edits if the account is on the editors list.
    try { localStorage.setItem('hounds_active_user', JSON.stringify({ id: cleanUser.id, name: cleanUser.name, role: cleanRole === 'admin' ? 'jogador' : cleanRole })); } catch (e) {}
    document.body.setAttribute('data-role', cleanRole);
    document.body.setAttribute('data-user', cleanUser.id || '');
    el('whoAv').textContent = ini(cleanUser.name);
    el('whoName').textContent = cleanUser.name;
    el('whoRole').textContent = ROLE[cleanRole] || 'Jogador';
    el('whoBtn').hidden = false;
    try { window.dispatchEvent(new CustomEvent('hub:user', { detail: cleanUser })); } catch (e) {}
  }
  // Logging in (the email and password, or a user picked from the list) opens the home page; the
  // user that comes back on a reload or a new visit keeps the page (see the start of app.js).
  function goHome() { go('#inicio'); }
  function choose(u) {
    var changed = !window.hubUser || window.hubUser.id !== u.id;
    apply(u);
    el('gate').hidden = true;
    if (changed) {
      mesaFor = null;
      try { sessionStorage.removeItem('hounds_mesa_view_state_v1'); } catch (e) {}
    }
    syncMesa();
  }
  function openGate() {
    if (AUTH) { openAccount(); return; }
    var list = (window.hubUsers && window.hubUsers()) || users();
    el('gateLede').textContent = 'Escolha seu usuário para entrar';
    el('gateList').innerHTML = list.map(function (u, i) {
      var r = ROLE[u.role] ? u.role : 'jogador';
      return '<button type="button" class="gate-user" data-i="' + i + '"><span class="av">' + esc(ini(u.name)) + '</span><span class="nm">' + esc(u.name) + '</span><span class="role-tag ' + r + '">' + esc(ROLE[u.role] || u.role || 'Jogador') + '</span></button>';
    }).join('');
    el('gateList').onclick = function (ev) {
      var b = ev.target.closest('.gate-user'); if (!b) return;
      var u = list[+b.dataset.i]; if (u) { choose({ id: u.id, name: u.name, role: u.role }); goHome(); }
    };
    el('gateClose').hidden = !window.hubUser;
    el('gate').hidden = false;
    var f = el('gateList').querySelector('.gate-user'); if (f) f.focus();
  }

  /* ---------- login com email e senha (Supabase Auth) ---------- */
  function loginError(e) {
    var code = e && (e.code || e.error_code), msg = String((e && e.message) || '');
    if (code === 'not_linked') return msg;
    if (code === 'invalid_credentials' || /invalid login credentials/i.test(msg)) return 'Email ou senha incorretos.';
    if (code === 'email_not_confirmed' || /email not confirmed/i.test(msg)) return 'Esta conta ainda não foi confirmada. Peça ao Mestre para confirmá-la no painel do Supabase.';
    if (code === 'over_request_rate_limit' || (e && e.status === 429)) return 'Muitas tentativas seguidas. Espere um pouco e tente de novo.';
    if ((e && e.name === 'TypeError') || /fetch|network/i.test(msg)) return 'Sem conexão com o servidor. Verifique a internet e tente de novo.';
    return msg || 'Não foi possível entrar. Tente de novo.';
  }
  /**
   * Mostra o formulário de login. opts.submit(email, senha) resolve com o usuário do Hounds ou
   * rejeita com o motivo; opts.notice é um aviso para mostrar antes (uma conta sem usuário).
   * Resolve com o usuário quando o login dá certo.
   */
  window.hubAskLogin = function (opts) {
    return new Promise(function (resolve) {
      el('gateLede').textContent = 'Entre com seu email e senha';
      el('gateList').onclick = null;
      el('gateList').innerHTML = '<form class="gate-login" id="loginForm" novalidate>' +
        (opts.notice ? '<p class="notice">' + esc(opts.notice) + '</p>' : '') +
        '<div class="field"><label for="loginEmail">Email</label><input type="email" id="loginEmail" autocomplete="username" inputmode="email" required></div>' +
        '<div class="field"><label for="loginPass">Senha</label><input type="password" id="loginPass" autocomplete="current-password" required></div>' +
        '<div class="form-err" id="loginErr" role="alert"></div>' +
        '<button class="btn primary" type="submit" id="loginBtn">Entrar</button>' +
        '<p class="gate-note">Esqueceu a senha ou ainda não tem conta? Fale com o Mestre.</p></form>';
      el('gateClose').hidden = true;
      el('gate').hidden = false;
      var email = el('loginEmail'), pass = el('loginPass'), btn = el('loginBtn');
      email.focus();
      el('loginForm').onsubmit = function (ev) {
        ev.preventDefault();
        var em = email.value.trim(), pw = pass.value;
        if (!em || !pw) { el('loginErr').textContent = 'Informe o email e a senha.'; (em ? pass : email).focus(); return; }
        btn.disabled = true; btn.textContent = 'Entrando…'; el('loginErr').textContent = '';
        opts.submit(em, pw).then(function (u) {
          pass.value = '';
          el('gate').hidden = true;
          goHome();
          resolve(u);
        }, function (e) {
          btn.disabled = false; btn.textContent = 'Entrar';
          el('loginErr').textContent = loginError(e);
          pass.select();
        });
      };
    });
  };
  // A conta que entrou: quem é e o botão de sair.
  function openAccount() {
    var u = window.hubUser;
    el('gateLede').textContent = 'Sua conta';
    el('gateList').onclick = null;
    el('gateList').innerHTML = (u ? '<div class="gate-user gate-me"><span class="av">' + esc(ini(u.name)) + '</span><span class="nm">' + esc(u.name) + '</span><span class="role-tag ' + esc(u.role) + '">' + esc(ROLE[u.role] || 'Jogador') + '</span></div>' : '') +
      '<button class="btn danger" type="button" id="logoutBtn">Sair</button>';
    el('logoutBtn').onclick = function () { el('logoutBtn').disabled = true; if (window.hubSignOut) window.hubSignOut(); };
    el('gateClose').hidden = false;
    el('gate').hidden = false;
    el('gateClose').focus();
  }

  el('gateClose').onclick = function () { el('gate').hidden = true; };
  el('whoBtn').onclick = openGate;
  if (AUTH) el('whoBtn').title = 'Sua conta';
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !el('gate').hidden && window.hubUser) el('gate').hidden = true; });
  window.hubSwitchUser = openGate;
  window.hubApplyUser = function (u) {
    var changed = !window.hubUser || window.hubUser.id !== u.id;
    apply(u);
    if (changed) { mesaFor = null; syncMesa(); }
  };
  window.hubMesaStale = function () { mesaFor = null; syncMesa(); };
  window.addEventListener('hub:users', function () {
    var list = window.hubUsers && window.hubUsers(); if (!list) return;
    var cur = window.hubUser;
    if (cur) {
      var u = list.filter(function (x) { return x.id === cur.id; })[0];
      if (!u) {
        // This user was deleted: with login, the account no longer gets in.
        if (AUTH) { if (window.hubSignOut) window.hubSignOut(); return; }
        window.hubUser = null; el('whoBtn').hidden = true; openGate(); return;
      }
      if (u.name !== cur.name || u.role !== cur.role) { apply(u); mesaFor = null; syncMesa(); }
    }
    if (!AUTH && !el('gate').hidden) openGate();
  });

  // With login, js/store/supabase.js says who the user is (or asks for the login) once it has
  // checked the session. Without it, the user saved in this browser comes back, or the picker opens.
  if (AUTH) return;
  var savedUser = null;
  try { savedUser = JSON.parse(localStorage.getItem('hounds_active_user') || 'null'); } catch (e) {}
  if (savedUser && savedUser.id) {
    var allUsers = (window.hubUsers && window.hubUsers()) || users();
    var matchUser = allUsers.filter(function (x) { return x.id === savedUser.id; })[0];
    choose(matchUser ? { id: matchUser.id, name: matchUser.name, role: matchUser.role } : savedUser);
  } else {
    openGate();
  }
})();
