/* =====================================================================
   Hounds — Aba Usuários
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   Users (shared collection `users`: { name, role, email, createdAt, updatedAt }).
   With the Supabase, each person logs in with the email and password of an
   account the Mestre creates in the Supabase dashboard, and `email` (seen
   only by the Mestre) links that account to the user. Without it, the
   hub's user picker reads this list. It is also mirrored into the Mesa de
   Combate's localStorage key so the Mesa sees the same people.
   ===================================================================== */
var MESA_USERS_KEY = 'gurps_combat_master_users_v2';
var ROLES = [
  { id: 'mestre', label: 'Mestre', help: 'Administrador de tudo' },
  { id: 'admin', label: 'Admin', help: 'Jogador que também gerencia os usuários' },
  { id: 'jogador', label: 'Jogador', help: 'Visualiza e joga' }
];
function roleLabel(r) { for (var i = 0; i < ROLES.length; i++) if (ROLES[i].id === r) return ROLES[i].label; return 'Jogador'; }
function roleId(r) { return r === 'mestre' || r === 'admin' ? r : 'jogador'; }
function isMestre() { return !!(window.hubUser && window.hubUser.role === 'mestre'); }
// The Mestre and the Admin manage users. The Admin can set a Mestre's password, but not edit or
// delete a Mestre, nor make anyone Mestre (the database and the "contas" function check it too).
function canManageUsers() { return isMestre() || !!(window.hubUser && window.hubUser.role === 'admin'); }
function canManageUser(u) { return isMestre() || (canManageUsers() && roleId(u.role) !== 'mestre'); }
// People log in with email and password (Supabase Auth): users have an email.
function usersLogin() { return !!(W.store && W.store.kind === 'supabase'); }
function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
// The Mestre manages login accounts from here (Edge Function "contas"; see SUPABASE.md).
function usersAccounts() { return usersLogin() && !!W.store.account; }
ICON.key = '<path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/>';
function mesaUsers() { try { var l = JSON.parse(localStorage.getItem(MESA_USERS_KEY) || 'null'); return Array.isArray(l) ? l : []; } catch (e) { return []; } }
function mirrorUsers() {
  var old = {}; mesaUsers().forEach(function (u) { old[u.id] = u; });
  var out = W.users.map(function (u) {
    var o = old[u.id] || {};
    // The Mesa knows Mestre and Jogador: an Admin is a Jogador there.
    return { id: u.id, name: u.name, role: u.role === 'admin' ? 'jogador' : u.role, password: o.password || '', needsPasswordReset: false, createdAt: o.createdAt || new Date(u.createdAt || Date.now()).toLocaleDateString('pt-BR') };
  });
  try { localStorage.setItem(MESA_USERS_KEY, JSON.stringify(out)); } catch (e) {}
}
var seeded = false;
function seedUsers() {
  if (seeded || W.users.length || !canWrite()) return;
  seeded = true;
  var src = mesaUsers().filter(function (u) { return u && u.id && u.name; });
  if (!src.length) src = [{ id: 'user-leandro', name: 'Leandro', role: 'mestre' }, { id: 'user-jogador', name: 'Jogador', role: 'jogador' }];
  var t = Date.now();
  src.forEach(function (u, i) { W.store.put('users', u.id, { name: String(u.name).slice(0, 60), role: roleId(u.role || 'jogador'), createdAt: t + i, updatedAt: t + i }).catch(function () {}); });
}
window.hubUsers = function () { return W.loaded.users && W.users.length ? W.users.map(function (u) { return { id: u.id, name: u.name, role: u.role }; }) : null; };
function onUsers(list) {
  W.users = list; W.loaded.users = true;
  if (!list.length) { seedUsers(); return; }
  mirrorUsers();
  try { window.dispatchEvent(new CustomEvent('hub:users')); } catch (e) {}
  if (S.route && S.route.page === 'users' && !modalOpen) renderUsersPage();
}


function renderUsersPage() {
  if (!canManageUsers()) { pageRoot.innerHTML = '<h1>Usuários</h1><p class="notice">Só o Mestre e o Admin podem gerenciar usuários.</p>'; return; }
  var can = canWrite(), me = window.hubUser && window.hubUser.id, ui = S.ui;
  var login = usersLogin();
  var head = '<div class="head-row"><div><h1>Usuários</h1><p class="lede">' + (login
      ? 'As pessoas que entram no hub, cada uma com o próprio email e senha. Ao criar um usuário com senha, a conta de login é criada junto; passe o email e a senha para a pessoa. O perfil define o que cada uma vê e pode fazer.'
      : 'As pessoas que aparecem na escolha de usuário ao abrir o hub. O perfil define o que cada uma vê e pode fazer.') + '</p></div>' +
    (can ? '<button class="btn primary" type="button" id="newUserBtn">' + svg(ICON.plus, 16, 2.4) + 'Novo usuário</button>' : '') + '</div>' + notice();
  var body;
  if (!W.loaded.users) body = '<p class="lede">Carregando usuários…</p>';
  else if (!W.users.length) body = '<p class="lede">Preparando a lista de usuários…</p>';
  else body = '<div class="user-list">' + W.users.slice().sort(function (a, b) {
      var ra = ROLES.map(function (r) { return r.id; }).indexOf(a.role), rb = ROLES.map(function (r) { return r.id; }).indexOf(b.role);
      return (ra - rb) || byName(a, b);
    }).map(function (u) {
      var r = roleId(u.role);
      if (ui.delUser === u.id) return '<div class="user-row confirm"><span class="nm"><strong>Excluir ' + esc(u.name) + '?</strong><span class="you">' + (login ? 'Não vai mais conseguir entrar.' : 'Ele não aparecerá mais na escolha de usuário.') + '</span>' +
        (usersAccounts() && u.email ? '<label class="you del-acct"><input type="checkbox" id="delAcct" checked> Excluir também a conta de login (' + esc(u.email) + ')</label>' : '') +
        '</span><span class="acts"><button class="btn ghost" type="button" data-act="del-no">Cancelar</button><button class="btn danger" type="button" data-act="del-yes" data-id="' + esc(u.id) + '">Excluir</button></span></div>';
      var mail = login ? '<span class="you">' + (u.email ? esc(u.email) : 'sem email: não consegue entrar') + '</span>' : '';
      return '<div class="user-row"><span class="av">' + esc(initials(u.name)) + '</span><span class="nm"><strong>' + esc(u.name) + '</strong><span class="role-tag ' + r + '">' + esc(roleLabel(r)) + '</span>' + (u.id === me ? '<span class="you">(você)</span>' : '') + mail + '</span>' +
        (can ? '<span class="acts">' + (usersAccounts() && u.email ? '<button class="icon-btn" type="button" data-act="pass" data-id="' + esc(u.id) + '" title="Definir senha" aria-label="Definir a senha de ' + esc(u.name) + '">' + svg(ICON.key, 16) + '</button>' : '') +
          (canManageUser(u) ? '<button class="icon-btn" type="button" data-act="edit" data-id="' + esc(u.id) + '" title="Editar" aria-label="Editar ' + esc(u.name) + '">' + svg(ICON.edit, 16) + '</button>' : '') +
          (u.id === me || !canManageUser(u) ? '' : '<button class="icon-btn" type="button" data-act="del" data-id="' + esc(u.id) + '" title="Excluir" aria-label="Excluir ' + esc(u.name) + '">' + svg(ICON.trash, 16) + '</button>') + '</span>' : '') + '</div>';
    }).join('') + '</div>';
  pageRoot.innerHTML = head + body;
  var nb = $('newUserBtn'); if (nb) nb.onclick = function () { openUserForm(null); };
  pageRoot.querySelectorAll('.user-list [data-act]').forEach(function (b) {
    b.onclick = function () {
      var act = b.getAttribute('data-act'), id = b.getAttribute('data-id'), u = W.users.filter(function (x) { return x.id === id; })[0];
      if (u && act !== 'pass' && !canManageUser(u)) return;
      if (act === 'edit' && u) openUserForm(u);
      else if (act === 'pass' && u) openPasswordForm(u);
      else if (act === 'del') { ui.delUser = id; renderUsersPage(); }
      else if (act === 'del-no') { ui.delUser = null; renderUsersPage(); }
      else if (act === 'del-yes' && u) {
        var mestres = W.users.filter(function (x) { return x.role === 'mestre'; });
        if (u.role === 'mestre' && mestres.length <= 1) { toast('É preciso manter pelo menos um Mestre.', true); return; }
        b.disabled = true;
        var acct = $('delAcct'), viaAccount = usersAccounts() && !!u.email;
        (viaAccount ? W.store.account('excluir', { id: u.id, excluirConta: !!(acct && acct.checked) }) : W.store.remove('users', u.id)).then(function (r) {
          ui.delUser = null;
          toast(r && r.aviso ? r.aviso : r && r.contaExcluida ? 'Usuário e conta de login excluídos.' : 'Usuário excluído.', !!(r && r.aviso));
          if (window.hubMesaStale) window.hubMesaStale();
        }, function (er) { b.disabled = false; toast(errorText(er), true); });
      }
    };
  });
}

function openUserForm(u) {
  var editing = !!u, cur = editing ? roleId(u.role) : 'jogador', login = usersLogin();
  var html = '<form id="userForm" novalidate><h2 id="ufTitle">' + (editing ? 'Editar usuário' : 'Novo usuário') + '</h2>' +
    '<div class="field" id="f_uname"><label for="uname">Nome</label><input type="text" id="uname" maxlength="60" autocomplete="off" placeholder="Ex.: Marina" value="' + esc(editing ? u.name : '') + '"><div class="err" id="err_uname"></div></div>' +
    (login ? '<div class="field" id="f_umail"><label for="umail">Email da conta</label><input type="email" id="umail" maxlength="200" autocomplete="off" placeholder="nome@exemplo.com" value="' + esc(editing ? u.email || '' : '') + '">' +
      '<span class="lab" style="font-weight:500">' + (editing ? 'O email da conta de login desta pessoa. Mudar aqui não muda o email da conta.' : 'O email com que a pessoa vai entrar.') + '</span><div class="err" id="err_umail"></div></div>' : '') +
    (login && !editing && usersAccounts() ? '<div class="field" id="f_upass"><label for="upass">Senha</label><input type="password" id="upass" maxlength="72" autocomplete="new-password" placeholder="Pelo menos 6 caracteres">' +
      '<span class="lab" style="font-weight:500">Cria a conta de login com este email e senha. Deixe em branco se a conta já existe no painel do Supabase.</span><div class="err" id="err_upass"></div></div>' : '') +
    '<div class="field"><label for="urole">Perfil</label><select id="urole">' + ROLES.filter(function (r) { return isMestre() || r.id !== 'mestre'; }).map(function (r) { return '<option value="' + r.id + '"' + (r.id === cur ? ' selected' : '') + '>' + esc(r.label + ' — ' + r.help) + '</option>'; }).join('') + '</select>' +
      (isMestre() ? '' : '<span class="lab" style="font-weight:500">Só o Mestre dá o perfil de Mestre.</span>') + '</div>' +
    '<div class="form-err" id="ufErr" role="alert"></div>' +
    '<div class="btn-row" style="justify-content:flex-end"><button class="btn ghost" type="button" id="ufCancel">Cancelar</button><button class="btn primary" type="submit" id="ufSave">' + (editing ? 'Salvar usuário' : 'Criar usuário') + '</button></div></form>';
  showModal(html);
  modal.setAttribute('aria-labelledby', 'ufTitle');
  var name = $('uname'), role = $('urole');
  function help() {}
  role.onchange = help; help();
  name.addEventListener('input', function () { $('err_uname').textContent = ''; $('f_uname').classList.remove('invalid'); });
  var mail = $('umail'), pass = $('upass');
  if (mail) mail.addEventListener('input', function () { $('err_umail').textContent = ''; $('f_umail').classList.remove('invalid'); });
  if (pass) pass.addEventListener('input', function () { $('err_upass').textContent = ''; $('f_upass').classList.remove('invalid'); });
  $('ufCancel').onclick = function () { closeModal(); };
  $('userForm').onsubmit = function (e) {
    e.preventDefault();
    var n = name.value.trim().replace(/\s+/g, ' '), r = role.value;
    function bad(msg) { $('err_uname').textContent = msg; $('f_uname').classList.add('invalid'); name.focus(); }
    if (!n) return bad('Digite um nome.');
    if (W.users.some(function (x) { return (!editing || x.id !== u.id) && norm(x.name) === norm(n); })) return bad('Já existe um usuário com esse nome.');
    var em = mail ? mail.value.trim().toLowerCase() : null;
    function badMail(msg) { $('err_umail').textContent = msg; $('f_umail').classList.add('invalid'); mail.focus(); }
    if (em && !validEmail(em)) return badMail('Esse email não parece válido.');
    if (em && W.users.some(function (x) { return (!editing || x.id !== u.id) && (x.email || '') === em; })) return badMail('Esse email já é de outro usuário.');
    var pw = pass ? pass.value : '';
    function badPass(msg) { $('err_upass').textContent = msg; $('f_upass').classList.add('invalid'); pass.focus(); }
    if (pw && !em) return badMail('Informe o email da conta de login.');
    if (pw && pw.length < 6) return badPass('A senha precisa ter pelo menos 6 caracteres.');
    if (editing && u.role === 'mestre' && r !== 'mestre' && W.users.filter(function (x) { return x.role === 'mestre'; }).length <= 1) { $('ufErr').textContent = 'É preciso manter pelo menos um Mestre.'; return; }
    var t = Date.now(), save = $('ufSave');
    save.disabled = true; modalOpen.busy = true;
    var body = { name: n, role: r };
    if (mail) body.email = em;
    // With a password, the Edge Function creates the login account and the user together.
    var p = editing ? W.store.patch('users', u.id, Object.assign(body, { updatedAt: t }))
      : pw ? W.store.account('criar', { id: 'user-' + uid(), nome: n, email: em, senha: pw, papel: r })
      : W.store.put('users', 'user-' + uid(), Object.assign(body, { createdAt: t, updatedAt: t }));
    p.then(function () {
      modalOpen.busy = false; closeModal(true);
      toast(editing ? 'Usuário salvo.' : pw ? 'Usuário e conta de login criados. Passe o email e a senha para ' + n + '.' : 'Usuário criado.');
      if (window.hubMesaStale) window.hubMesaStale();
      if (editing && window.hubUser && window.hubUser.id === u.id && window.hubApplyUser) window.hubApplyUser({ id: u.id, name: n, role: r });
    }, function (er) { modalOpen.busy = false; save.disabled = false; $('ufErr').textContent = errorText(er); });
  };
}

// A new password for a user's login account (Edge Function "contas"): the Mestre's way out of a
// forgotten password, since the Supabase's own email only reaches the project's team.
function openPasswordForm(u) {
  var html = '<form id="passForm" novalidate><h2 id="pfTitle">Definir senha</h2>' +
    '<p class="lede" style="margin-top:0">Senha nova da conta de ' + esc(u.name) + ' (' + esc(u.email || '') + '). Depois, passe a senha para a pessoa.</p>' +
    '<div class="field" id="f_pnew"><label for="pnew">Senha nova</label><input type="password" id="pnew" maxlength="72" autocomplete="new-password" placeholder="Pelo menos 6 caracteres"><div class="err" id="err_pnew"></div></div>' +
    '<div class="field" id="f_prep"><label for="prep">Repita a senha</label><input type="password" id="prep" maxlength="72" autocomplete="new-password"><div class="err" id="err_prep"></div></div>' +
    '<div class="form-err" id="pfErr" role="alert"></div>' +
    '<div class="btn-row" style="justify-content:flex-end"><button class="btn ghost" type="button" id="pfCancel">Cancelar</button><button class="btn primary" type="submit" id="pfSave">Definir senha</button></div></form>';
  showModal(html);
  modal.setAttribute('aria-labelledby', 'pfTitle');
  var a = $('pnew'), b = $('prep');
  ['pnew', 'prep'].forEach(function (id) { $(id).addEventListener('input', function () { $('err_' + id).textContent = ''; $('f_' + id).classList.remove('invalid'); }); });
  $('pfCancel').onclick = function () { closeModal(); };
  $('passForm').onsubmit = function (e) {
    e.preventDefault();
    function bad(id, msg) { $('err_' + id).textContent = msg; $('f_' + id).classList.add('invalid'); $(id).focus(); }
    if (a.value.length < 6) return bad('pnew', 'A senha precisa ter pelo menos 6 caracteres.');
    if (b.value !== a.value) return bad('prep', 'As senhas não são iguais.');
    var save = $('pfSave'); save.disabled = true; modalOpen.busy = true;
    W.store.account('senha', { id: u.id, senha: a.value }).then(function () {
      modalOpen.busy = false; closeModal(true);
      toast('Senha definida. Passe a senha nova para ' + u.name + '.');
    }, function (er) { modalOpen.busy = false; save.disabled = false; $('pfErr').textContent = errorText(er); });
  };
}
