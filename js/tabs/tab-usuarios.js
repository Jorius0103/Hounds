/* =====================================================================
   Hounds — Aba: Usuários (Controle de Acessos & Perfis)
   ===================================================================== */

(function () {
  var ROLES = [
    { id: 'mestre', label: 'Mestre', desc: 'Acesso total. Vê itens ocultos, edita mapas, locais e gerencia usuários.' },
    { id: 'jogador', label: 'Jogador', desc: 'Participa do jogo. Vê apenas itens visíveis e controla seu próprio personagem.' },
    { id: 'visualizador', label: 'Espectador', desc: 'Somente leitura. Apenas acompanha a campanha sem permissão de edição.' }
  ];

  function renderUsersPage() {
    var pageRoot = $('pageRoot');
    if (!pageRoot) return;

    if (!isMestre()) {
      pageRoot.innerHTML = crumbsHtml('users') + '<h1>Acesso restrito</h1><p class="lede">Apenas o Mestre pode gerenciar usuários.</p>';
      return;
    }

    var list = (window.hubUsers && window.hubUsers()) || W.users || [];

    var head = '<div class="head-row"><div>' + crumbsHtml('users') + '<h1>Usuários da Campanha</h1>' +
      '<p class="lede">Gerencie quem tem acesso à mesa e defina quem é Mestre, Jogador ou Espectador.</p></div>' +
      '<button class="btn primary" type="button" id="newUserBtn">' + svg(ICON.plus, 16, 2.4) + 'Novo usuário</button>' +
      '</div>';

    var info = '<p class="notice">Quem entra escolhe seu usuário ao abrir a página. As senhas da campanha ficam seguras e sincronizadas.</p>';

    var body = '<div class="map-grid">' + list.map(function (u) {
      var r = ROLES.find(function (x) { return x.id === u.role; }) || ROLES[1];
      return '<div class="map-card" style="cursor:default;">' +
        '<div class="map-card-body">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">' +
            '<strong style="font-size:16px;">' + esc(u.name) + '</strong>' +
            '<span class="role-tag ' + esc(u.role) + '" style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:6px;background:rgba(245,158,11,0.15);color:#f59e0b;border:1px solid rgba(245,158,11,0.3);">' + esc(r.label) + '</span>' +
          '</div>' +
          '<span class="meta" style="font-size:12px;color:#94a3b8;line-height:1.4;">' + esc(r.desc) + '</span>' +
          '<div class="btn-row" style="margin-top:12px;">' +
            '<button class="btn" type="button" data-edit-u="' + esc(u.id) + '">' + svg(ICON.edit, 13) + 'Editar</button>' +
            (list.length > 1 ? '<button class="btn danger" type="button" data-del-u="' + esc(u.id) + '">' + svg(ICON.trash, 13) + 'Excluir</button>' : '') +
          '</div>' +
        '</div></div>';
    }).join('') + '</div>';

    pageRoot.innerHTML = head + info + body;

    var nb = $('newUserBtn');
    if (nb) nb.onclick = function () { openUserForm(null); };

    pageRoot.querySelectorAll('[data-edit-u]').forEach(function (b) {
      b.onclick = function () {
        var uid = b.getAttribute('data-edit-u');
        var u = list.find(function (x) { return x.id === uid; });
        if (u) openUserForm(u);
      };
    });

    pageRoot.querySelectorAll('[data-del-u]').forEach(function (b) {
      b.onclick = function () {
        var uid = b.getAttribute('data-del-u');
        var u = list.find(function (x) { return x.id === uid; });
        if (!u) return;
        if (confirm('Excluir o usuário "' + u.name + '"?')) {
          Ops.deleteUser(u.id).then(function () {
            toast('Usuário excluído.');
            renderUsersPage();
          }, function (er) { toast(errorText(er), true); });
        }
      };
    });
  }

  function openUserForm(u) {
    var editing = !!u;
    var rOpts = ROLES.map(function (r) {
      return '<option value="' + r.id + '"' + (u && u.role === r.id ? ' selected' : '') + '>' + esc(r.label) + '</option>';
    }).join('');

    var html = '<form id="uForm" novalidate><h2 id="ufTitle">' + (editing ? 'Editar usuário' : 'Novo usuário') + '</h2>' +
      '<div class="field" id="f_uname"><label for="uname">Nome</label><input type="text" id="uname" maxlength="80" autocomplete="off" placeholder="Ex.: Renato, Jorio, Leandro" value="' + esc(editing ? u.name : '') + '"><div class="err" id="err_uname"></div></div>' +
      '<div class="field"><label for="urole">Perfil de acesso</label><select id="urole">' + rOpts + '</select></div>' +
      '<div class="form-err" id="ufErr" role="alert"></div>' +
      '<div class="btn-row" style="justify-content:flex-end"><button class="btn ghost" type="button" id="ufCancel">Cancelar</button><button class="btn primary" type="submit" id="ufSave">' + (editing ? 'Salvar' : 'Criar usuário') + '</button></div></form>';

    showModal(html);

    var f = $('uForm'), n = $('uname'), cancel = $('ufCancel');
    if (cancel) cancel.onclick = closeModal;

    f.onsubmit = function (e) {
      e.preventDefault();
      var name = n.value.trim();
      if (!name) {
        $('err_uname').textContent = 'Digite o nome do usuário.';
        n.focus();
        return;
      }
      var role = $('urole').value;
      var btn = $('ufSave');
      btn.disabled = true;

      var id = editing ? u.id : 'user-' + uid();
      Ops.saveUser(id, name, role).then(function () {
        closeModal();
        toast(editing ? 'Usuário atualizado.' : 'Usuário criado.');
        renderUsersPage();
      }, function (err) {
        btn.disabled = false;
        $('ufErr').textContent = errorText(err);
      });
    };
  }

  window.renderUsersPage = renderUsersPage;
  window.openUserForm = openUserForm;
})();
