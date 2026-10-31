import {useRef, useState, type ReactNode} from 'react';
import {useHub} from '../data';
import {closeDialog, Dialog} from '../Dialog';

const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// Um campo de formulário como os de js/ (css/componentes.css): rótulo, controle, ajuda e a mensagem de erro,
// que marca o campo (.invalid) até ele ser editado.
function Field({id, label, error, help, children}: {id: string; label: string; error?: string; help?: string; children: ReactNode}) {
  return (
    <div className={'field' + (error ? ' invalid' : '')} id={'f_' + id}>
      <label htmlFor={id}>{label}</label>
      {children}
      {help ? (
        <span className="lab" style={{fontWeight: 500}}>
          {help}
        </span>
      ) : null}
      <div className="err" id={'err_' + id}>
        {error}
      </div>
    </div>
  );
}

type Errors = Partial<Record<'name' | 'email' | 'password' | 'form', string>>;

/** Criar (user null) ou editar um usuário. Com o Supabase, o email da conta; com as contas, a senha da conta nova. */
export function UserForm({user}: {user: HubUser | null}) {
  const {W} = useHub();
  const editing = !!user, login = usersLogin(), withPassword = login && !editing && usersAccounts();
  const [name, setName] = useState(user ? user.name : '');
  const [email, setEmail] = useState(user ? user.email || '' : '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(user ? roleId(user.role) : 'jogador');
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const refs = {name: useRef<HTMLInputElement>(null), email: useRef<HTMLInputElement>(null), password: useRef<HTMLInputElement>(null)};

  function bad(field: 'name' | 'email' | 'password', msg: string) {
    setErrors(e => ({...e, [field]: msg}));
    refs[field].current?.focus();
  }
  const edited = (field: keyof Errors) => setErrors(e => (e[field] ? {...e, [field]: ''} : e));
  const others = (x: HubUser) => !user || x.id !== user.id;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim().replace(/\s+/g, ' ');
    if (!n) return bad('name', 'Digite um nome.');
    if (W.users.some(x => others(x) && norm(x.name) === norm(n))) return bad('name', 'Já existe um usuário com esse nome.');
    const em = login ? email.trim().toLowerCase() : null;
    if (em && !validEmail(em)) return bad('email', 'Esse email não parece válido.');
    if (em && W.users.some(x => others(x) && (x.email || '') === em)) return bad('email', 'Esse email já é de outro usuário.');
    const pw = withPassword ? password : '';
    if (pw && !em) return bad('email', 'Informe o email da conta de login.');
    if (pw && pw.length < 6) return bad('password', 'A senha precisa ter pelo menos 6 caracteres.');
    if (user && user.role === 'mestre' && role !== 'mestre' && W.users.filter(x => x.role === 'mestre').length <= 1) {
      setErrors(x => ({...x, form: 'É preciso manter pelo menos um Mestre.'}));
      return;
    }
    const t = Date.now();
    setSaving(true);
    const body: Record<string, unknown> = {name: n, role};
    if (login) body.email = em;
    // Com senha, a Edge Function "contas" cria a conta de login e o usuário juntos.
    const done = user
      ? W.store!.patch('users', user.id, {...body, updatedAt: t})
      : pw
        ? W.store!.account!('criar', {id: 'user-' + uid(), nome: n, email: em, senha: pw, papel: role})
        : W.store!.put('users', 'user-' + uid(), {...body, createdAt: t, updatedAt: t});
    done.then(
      () => {
        setSaving(false);
        closeDialog();
        toast(user ? 'Usuário salvo.' : pw ? 'Usuário e conta de login criados. Passe o email e a senha para ' + n + '.' : 'Usuário criado.');
        if (window.hubMesaStale) window.hubMesaStale();
        if (user && window.hubUser && window.hubUser.id === user.id && window.hubApplyUser) window.hubApplyUser({id: user.id, name: n, role});
      },
      er => {
        setSaving(false);
        setErrors(x => ({...x, form: errorText(er)}));
      },
    );
  }

  return (
    <Dialog labelledBy="ufTitle" busy={saving}>
      <form id="userForm" noValidate onSubmit={submit}>
        <h2 id="ufTitle">{editing ? 'Editar usuário' : 'Novo usuário'}</h2>
        <Field id="uname" label="Nome" error={errors.name}>
          <input type="text" id="uname" maxLength={60} autoComplete="off" placeholder="Ex.: Marina" ref={refs.name} value={name} onChange={e => (setName(e.target.value), edited('name'))} />
        </Field>
        {login ? (
          <Field
            id="umail"
            label="Email da conta"
            error={errors.email}
            help={editing ? 'O email da conta de login desta pessoa. Mudar aqui não muda o email da conta.' : 'O email com que a pessoa vai entrar.'}
          >
            <input type="email" id="umail" maxLength={200} autoComplete="off" placeholder="nome@exemplo.com" ref={refs.email} value={email} onChange={e => (setEmail(e.target.value), edited('email'))} />
          </Field>
        ) : null}
        {withPassword ? (
          <Field id="upass" label="Senha" error={errors.password} help="Cria a conta de login com este email e senha. Deixe em branco se a conta já existe no painel do Supabase.">
            <input
              type="password"
              id="upass"
              maxLength={72}
              autoComplete="new-password"
              placeholder="Pelo menos 6 caracteres"
              ref={refs.password}
              value={password}
              onChange={e => (setPassword(e.target.value), edited('password'))}
            />
          </Field>
        ) : null}
        <div className="field">
          <label htmlFor="urole">Perfil</label>
          <select id="urole" value={role} onChange={e => setRole(e.target.value)}>
            {ROLES.filter(r => isMestre() || r.id !== 'mestre').map(r => (
              <option value={r.id} key={r.id}>
                {r.label + ' — ' + r.help}
              </option>
            ))}
          </select>
          {isMestre() ? null : (
            <span className="lab" style={{fontWeight: 500}}>
              Só o Mestre dá o perfil de Mestre.
            </span>
          )}
        </div>
        <div className="form-err" id="ufErr" role="alert">
          {errors.form}
        </div>
        <div className="btn-row" style={{justifyContent: 'flex-end'}}>
          <button className="btn ghost" type="button" id="ufCancel" onClick={() => !saving && closeDialog()}>
            Cancelar
          </button>
          <button className="btn primary" type="submit" id="ufSave" disabled={saving}>
            {editing ? 'Salvar usuário' : 'Criar usuário'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

/**
 * A senha nova da conta de login de um usuário (Edge Function "contas"): a saída do Mestre para uma senha
 * esquecida, porque o email do próprio Supabase só chega à equipe do projeto.
 */
export function PasswordForm({user}: {user: HubUser}) {
  const {W} = useHub();
  const [first, setFirst] = useState('');
  const [again, setAgain] = useState('');
  const [errors, setErrors] = useState<Partial<Record<'pnew' | 'prep' | 'form', string>>>({});
  const [saving, setSaving] = useState(false);
  const refs = {pnew: useRef<HTMLInputElement>(null), prep: useRef<HTMLInputElement>(null)};

  function bad(field: 'pnew' | 'prep', msg: string) {
    setErrors(e => ({...e, [field]: msg}));
    refs[field].current?.focus();
  }
  const edited = (field: 'pnew' | 'prep') => setErrors(e => (e[field] ? {...e, [field]: ''} : e));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (first.length < 6) return bad('pnew', 'A senha precisa ter pelo menos 6 caracteres.');
    if (again !== first) return bad('prep', 'As senhas não são iguais.');
    setSaving(true);
    W.store!.account!('senha', {id: user.id, senha: first}).then(
      () => {
        setSaving(false);
        closeDialog();
        toast('Senha definida. Passe a senha nova para ' + user.name + '.');
      },
      er => {
        setSaving(false);
        setErrors(x => ({...x, form: errorText(er)}));
      },
    );
  }

  return (
    <Dialog labelledBy="pfTitle" busy={saving}>
      <form id="passForm" noValidate onSubmit={submit}>
        <h2 id="pfTitle">Definir senha</h2>
        <p className="lede" style={{marginTop: 0}}>
          Senha nova da conta de {user.name} ({user.email || ''}). Depois, passe a senha para a pessoa.
        </p>
        <Field id="pnew" label="Senha nova" error={errors.pnew}>
          <input type="password" id="pnew" maxLength={72} autoComplete="new-password" placeholder="Pelo menos 6 caracteres" ref={refs.pnew} value={first} onChange={e => (setFirst(e.target.value), edited('pnew'))} />
        </Field>
        <Field id="prep" label="Repita a senha" error={errors.prep}>
          <input type="password" id="prep" maxLength={72} autoComplete="new-password" ref={refs.prep} value={again} onChange={e => (setAgain(e.target.value), edited('prep'))} />
        </Field>
        <div className="form-err" id="pfErr" role="alert">
          {errors.form}
        </div>
        <div className="btn-row" style={{justifyContent: 'flex-end'}}>
          <button className="btn ghost" type="button" id="pfCancel" onClick={() => !saving && closeDialog()}>
            Cancelar
          </button>
          <button className="btn primary" type="submit" id="pfSave" disabled={saving}>
            Definir senha
          </button>
        </div>
      </form>
    </Dialog>
  );
}
