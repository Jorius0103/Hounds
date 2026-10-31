import {useState} from 'react';
import {useHub} from '../data';
import {openDialog} from '../Dialog';
import {Icon} from '../Icon';
import {PasswordForm, UserForm} from './UsuarioForm';

// Página Usuários (#usuarios), com as mesmas classes da versão antiga (css/paginas.css). O que os formulários
// (UsuarioForm.tsx) salvam volta pela lista de usuários (hub:users) e redesenha a página.
export function UsersPage() {
  const {W, user} = useHub();
  // A linha em confirmação de exclusão, a opção de excluir também a conta de login e a exclusão em andamento.
  const [delUser, setDelUser] = useState<string | null>(null);
  const [delAccount, setDelAccount] = useState(true);
  const [deleting, setDeleting] = useState(false);

  if (!canManageUsers()) {
    return (
      <>
        <h1>Usuários</h1>
        <p className="notice">Só o Mestre e o Admin podem gerenciar usuários.</p>
      </>
    );
  }

  const can = canWrite(), me = user && user.id, login = usersLogin(), accounts = usersAccounts();
  const order = ROLES.map(r => r.id);
  const warning = noticeText();

  function askDelete(u: HubUser) {
    if (!canManageUser(u)) return;
    setDelUser(u.id);
    setDelAccount(true);
  }

  function remove(u: HubUser) {
    if (!canManageUser(u)) return;
    if (u.role === 'mestre' && W.users.filter(x => x.role === 'mestre').length <= 1) {
      toast('É preciso manter pelo menos um Mestre.', true);
      return;
    }
    setDeleting(true);
    const done = accounts && u.email ? W.store!.account!('excluir', {id: u.id, excluirConta: delAccount}) : W.store!.remove('users', u.id);
    done.then(
      (r: any) => {
        setDeleting(false);
        setDelUser(null);
        toast(r && r.aviso ? r.aviso : r && r.contaExcluida ? 'Usuário e conta de login excluídos.' : 'Usuário excluído.', !!(r && r.aviso));
        if (window.hubMesaStale) window.hubMesaStale();
      },
      er => {
        setDeleting(false);
        toast(errorText(er), true);
      },
    );
  }

  function row(u: HubUser) {
    const r = roleId(u.role);
    if (delUser === u.id) {
      return (
        <div className="user-row confirm" key={u.id}>
          <span className="nm">
            <strong>Excluir {u.name}?</strong>
            <span className="you">{login ? 'Não vai mais conseguir entrar.' : 'Ele não aparecerá mais na escolha de usuário.'}</span>
            {accounts && u.email ? (
              <label className="you del-acct">
                <input type="checkbox" id="delAcct" checked={delAccount} onChange={e => setDelAccount(e.target.checked)} /> Excluir também a conta de login ({u.email})
              </label>
            ) : null}
          </span>
          <span className="acts">
            <button className="btn ghost" type="button" data-act="del-no" onClick={() => setDelUser(null)}>
              Cancelar
            </button>
            <button className="btn danger" type="button" data-act="del-yes" data-id={u.id} disabled={deleting} onClick={() => remove(u)}>
              Excluir
            </button>
          </span>
        </div>
      );
    }
    return (
      <div className="user-row" key={u.id}>
        <span className="av">{initials(u.name)}</span>
        <span className="nm">
          <strong>{u.name}</strong>
          <span className={'role-tag ' + r}>{roleLabel(r)}</span>
          {u.id === me ? <span className="you">(você)</span> : null}
          {login ? <span className="you">{u.email || 'sem email: não consegue entrar'}</span> : null}
        </span>
        {can ? (
          <span className="acts">
            {accounts && u.email ? (
              <button className="icon-btn" type="button" data-act="pass" data-id={u.id} title="Definir senha" aria-label={'Definir a senha de ' + u.name} onClick={() => openDialog(<PasswordForm user={u} />)}>
                <Icon paths={ICON.key} size={16} />
              </button>
            ) : null}
            {canManageUser(u) ? (
              <button className="icon-btn" type="button" data-act="edit" data-id={u.id} title="Editar" aria-label={'Editar ' + u.name} onClick={() => canManageUser(u) && openDialog(<UserForm user={u} />)}>
                <Icon paths={ICON.edit} size={16} />
              </button>
            ) : null}
            {u.id === me || !canManageUser(u) ? null : (
              <button className="icon-btn" type="button" data-act="del" data-id={u.id} title="Excluir" aria-label={'Excluir ' + u.name} onClick={() => askDelete(u)}>
                <Icon paths={ICON.trash} size={16} />
              </button>
            )}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <div className="head-row">
        <div>
          <h1>Usuários</h1>
          <p className="lede">
            {login
              ? 'As pessoas que entram no hub, cada uma com o próprio email e senha. Ao criar um usuário com senha, a conta de login é criada junto; passe o email e a senha para a pessoa. O perfil define o que cada uma vê e pode fazer.'
              : 'As pessoas que aparecem na escolha de usuário ao abrir o hub. O perfil define o que cada uma vê e pode fazer.'}
          </p>
        </div>
        {can ? (
          <button className="btn primary" type="button" id="newUserBtn" onClick={() => openDialog(<UserForm user={null} />)}>
            <Icon paths={ICON.plus} size={16} stroke={2.4} />
            Novo usuário
          </button>
        ) : null}
      </div>
      {warning ? <p className="notice">{warning}</p> : null}
      {!W.loaded.users ? (
        <p className="lede">Carregando usuários…</p>
      ) : !W.users.length ? (
        <p className="lede">Preparando a lista de usuários…</p>
      ) : (
        <div className="user-list">{W.users.slice().sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role) || byName(a, b)).map(row)}</div>
      )}
    </>
  );
}
