/* =====================================================================
   Hounds — Aba Usuários
   A página e os formulários são React (src/hub/paginas/Usuarios.tsx e
   UsuarioForm.tsx); aqui ficam os perfis, as permissões e a lista no banco.
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
// The Mestre manages login accounts from here (Edge Function "contas"; see SUPABASE.md).
function usersAccounts() { return usersLogin() && !!W.store.account; }
ICON.key = '<path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/>';
function mesaUsers() { try { var l = JSON.parse(localStorage.getItem(MESA_USERS_KEY) || 'null'); return Array.isArray(l) ? l : []; } catch (e) { return []; } }
function mirrorUsers() {
  var old = {}; mesaUsers().forEach(function (u) { old[u.id] = u; });
  var out = W.users.map(function (u) {
    var o = old[u.id] || {};
    // The Mesa knows Mestre and Jogador: an Admin is a Jogador there. Its own login (and the passwords
    // it kept here in plain text) is not used inside the hub: the empty password overwrites old ones.
    return { id: u.id, name: u.name, role: u.role === 'admin' ? 'jogador' : u.role, password: '', needsPasswordReset: false, createdAt: o.createdAt || new Date(u.createdAt || Date.now()).toLocaleDateString('pt-BR') };
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
  try { window.dispatchEvent(new CustomEvent('hub:users')); } catch (e) {} // redraws the page (React)
}
