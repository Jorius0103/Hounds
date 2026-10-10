/* =====================================================================
   Hounds — Aba Usuários
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   Users (shared collection `users`: { name, role, createdAt, updatedAt }).
   The hub's user picker reads this list, and it is mirrored into the
   Mesa de Combate's localStorage key so the Mesa sees the same people.
   ===================================================================== */
var MESA_USERS_KEY = 'gurps_combat_master_users_v2';
var ROLES = [
  { id: 'mestre', label: 'Mestre', help: 'Administrador de tudo' },
  { id: 'jogador', label: 'Jogador', help: 'Visualiza' },
  { id: 'visualizador', label: 'Espectador', help: 'Auxilia na Mesa de combate' }
];
function roleLabel(r) { for (var i = 0; i < ROLES.length; i++) if (ROLES[i].id === r) return ROLES[i].label; return 'Jogador'; }
function roleId(r) { return roleLabel(r) === 'Jogador' && r !== 'jogador' ? 'jogador' : r; }
function isMestre() { return !!(window.hubUser && window.hubUser.role === 'mestre'); }
function mesaUsers() { try { var l = JSON.parse(localStorage.getItem(MESA_USERS_KEY) || 'null'); return Array.isArray(l) ? l : []; } catch (e) { return []; } }
function mirrorUsers() {
  var old = {}; mesaUsers().forEach(function (u) { old[u.id] = u; });
  var out = W.users.map(function (u) {
    var o = old[u.id] || {};
    return { id: u.id, name: u.name, role: u.role, password: o.password || '', needsPasswordReset: false, createdAt: o.createdAt || new Date(u.createdAt || Date.now()).toLocaleDateString('pt-BR') };
  });
  try { localStorage.setItem(MESA_USERS_KEY, JSON.stringify(out)); } catch (e) {}
}
var seeded = false;
function seedUsers() {
  if (seeded || W.users.length || !canWrite()) return;
  seeded = true;
  var src = mesaUsers().filter(function (u) { return u && u.id && u.name; });
  if (!src.length) src = [{ id: 'user-leandro', name: 'Leandro', role: 'mestre' }, { id: 'user-espectador', name: 'Espectador', role: 'visualizador' }];
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
  if (!isMestre()) { pageRoot.innerHTML = '<h1>Usuários</h1><p class="notice">Só o Mestre pode gerenciar usuários.</p>'; return; }
  var can = canWrite(), me = window.hubUser && window.hubUser.id, ui = S.ui;
  var head = '<div class="head-row"><div><h1>Usuários</h1><p class="lede">As pessoas que aparecem na escolha de usuário ao abrir o hub. O perfil define o que cada uma vê e pode fazer.</p></div>' +
    (can ? '<button class="btn primary" type="button" id="newUserBtn">' + svg(ICON.plus, 16, 2.4) + 'Novo usuário</button>' : '') + '</div>' + notice();
  var body;
  if (!W.loaded.users) body = '<p class="lede">Carregando usuários…</p>';
  else if (!W.users.length) body = '<p class="lede">Preparando a lista de usuários…</p>';
  else body = '<div class="user-list">' + W.users.slice().sort(function (a, b) {
      var ra = ROLES.map(function (r) { return r.id; }).indexOf(a.role), rb = ROLES.map(function (r) { return r.id; }).indexOf(b.role);
      return (ra - rb) || byName(a, b);
    }).map(function (u) {
      var r = roleId(u.role);
      if (ui.delUser === u.id) return '<div class="user-row confirm"><span class="nm"><strong>Excluir ' + esc(u.name) + '?</strong><span class="you">Ele não aparecerá mais na escolha de usuário.</span></span><span class="acts"><button class="btn ghost" type="button" data-act="del-no">Cancelar</button><button class="btn danger" type="button" data-act="del-yes" data-id="' + esc(u.id) + '">Excluir</button></span></div>';
      return '<div class="user-row"><span class="av">' + esc(initials(u.name)) + '</span><span class="nm"><strong>' + esc(u.name) + '</strong><span class="role-tag ' + r + '">' + esc(roleLabel(r)) + '</span>' + (u.id === me ? '<span class="you">(você)</span>' : '') + '</span>' +
        (can ? '<span class="acts"><button class="icon-btn" type="button" data-act="edit" data-id="' + esc(u.id) + '" title="Editar" aria-label="Editar ' + esc(u.name) + '">' + svg(ICON.edit, 16) + '</button>' +
          (u.id === me ? '' : '<button class="icon-btn" type="button" data-act="del" data-id="' + esc(u.id) + '" title="Excluir" aria-label="Excluir ' + esc(u.name) + '">' + svg(ICON.trash, 16) + '</button>') + '</span>' : '') + '</div>';
    }).join('') + '</div>';
  pageRoot.innerHTML = head + body;
  var nb = $('newUserBtn'); if (nb) nb.onclick = function () { openUserForm(null); };
  pageRoot.querySelectorAll('.user-list [data-act]').forEach(function (b) {
    b.onclick = function () {
      var act = b.getAttribute('data-act'), id = b.getAttribute('data-id'), u = W.users.filter(function (x) { return x.id === id; })[0];
      if (act === 'edit' && u) openUserForm(u);
      else if (act === 'del') { ui.delUser = id; renderUsersPage(); }
      else if (act === 'del-no') { ui.delUser = null; renderUsersPage(); }
      else if (act === 'del-yes' && u) {
        var mestres = W.users.filter(function (x) { return x.role === 'mestre'; });
        if (u.role === 'mestre' && mestres.length <= 1) { toast('É preciso manter pelo menos um Mestre.', true); return; }
        b.disabled = true;
        W.store.remove('users', u.id).then(function () { ui.delUser = null; toast('Usuário excluído.'); if (window.hubMesaStale) window.hubMesaStale(); }, function (er) { b.disabled = false; toast(errorText(er), true); });
      }
    };
  });
}

function openUserForm(u) {
  var editing = !!u, cur = editing ? roleId(u.role) : 'jogador';
  var html = '<form id="userForm" novalidate><h2 id="ufTitle">' + (editing ? 'Editar usuário' : 'Novo usuário') + '</h2>' +
    '<div class="field" id="f_uname"><label for="uname">Nome</label><input type="text" id="uname" maxlength="60" autocomplete="off" placeholder="Ex.: Marina" value="' + esc(editing ? u.name : '') + '"><div class="err" id="err_uname"></div></div>' +
    '<div class="field"><label for="urole">Perfil</label><select id="urole">' + ROLES.map(function (r) { return '<option value="' + r.id + '"' + (r.id === cur ? ' selected' : '') + '>' + esc(r.label + ' — ' + r.help) + '</option>'; }).join('') + '</select></div>' +
    '<div class="form-err" id="ufErr" role="alert"></div>' +
    '<div class="btn-row" style="justify-content:flex-end"><button class="btn ghost" type="button" id="ufCancel">Cancelar</button><button class="btn primary" type="submit" id="ufSave">' + (editing ? 'Salvar usuário' : 'Criar usuário') + '</button></div></form>';
  showModal(html);
  modal.setAttribute('aria-labelledby', 'ufTitle');
  var name = $('uname'), role = $('urole');
  function help() {}
  role.onchange = help; help();
  name.addEventListener('input', function () { $('err_uname').textContent = ''; $('f_uname').classList.remove('invalid'); });
  $('ufCancel').onclick = function () { closeModal(); };
  $('userForm').onsubmit = function (e) {
    e.preventDefault();
    var n = name.value.trim().replace(/\s+/g, ' '), r = role.value;
    function bad(msg) { $('err_uname').textContent = msg; $('f_uname').classList.add('invalid'); name.focus(); }
    if (!n) return bad('Digite um nome.');
    if (W.users.some(function (x) { return (!editing || x.id !== u.id) && norm(x.name) === norm(n); })) return bad('Já existe um usuário com esse nome.');
    if (editing && u.role === 'mestre' && r !== 'mestre' && W.users.filter(function (x) { return x.role === 'mestre'; }).length <= 1) { $('ufErr').textContent = 'É preciso manter pelo menos um Mestre.'; return; }
    var t = Date.now(), save = $('ufSave');
    save.disabled = true; modalOpen.busy = true;
    var p = editing ? W.store.patch('users', u.id, { name: n, role: r, updatedAt: t }) : W.store.put('users', 'user-' + uid(), { name: n, role: r, createdAt: t, updatedAt: t });
    p.then(function () {
      modalOpen.busy = false; closeModal(true);
      toast(editing ? 'Usuário salvo.' : 'Usuário criado.');
      if (window.hubMesaStale) window.hubMesaStale();
      if (editing && window.hubUser && window.hubUser.id === u.id && window.hubApplyUser) window.hubApplyUser({ id: u.id, name: n, role: r });
    }, function (er) { modalOpen.busy = false; save.disabled = false; $('ufErr').textContent = errorText(er); });
  };
}
