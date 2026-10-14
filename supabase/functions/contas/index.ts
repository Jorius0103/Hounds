// Supabase Edge Function "contas": o Mestre gerencia as contas de login pela aba Usuários.
//
// Criar uma conta de login exige a chave service_role, que nunca pode ir para o navegador.
// Esta função roda no Supabase, que entrega a chave a ela (SUPABASE_SERVICE_ROLE_KEY), e só
// atende quem entrou com a conta de um usuário Mestre (confere pelo hounds_eu).
//
// Pedido (POST, JSON), com o login de quem pede no cabeçalho Authorization (o site manda):
//   { acao: 'criar',   id, nome, email, senha, papel }  cria a conta (já confirmada, sem email)
//                                                       e o usuário do Hounds ligado a ela
//   { acao: 'senha',   id, senha }                      define uma senha nova para a conta do usuário
//   { acao: 'excluir', id, excluirConta }               exclui o usuário e, com excluirConta, a conta
// Resposta: { ok: true, ... } ou { error: 'mensagem para o Mestre', code? } com o status do erro.
//
// Publicar: Edge Functions › Deploy a new function › Via Editor, nome "contas", colar este
// arquivo (veja SUPABASE.md). Ou, com a Supabase CLI: supabase functions deploy contas
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const PAPEIS = ['mestre', 'jogador'];

function resposta(status: number, corpo: Record<string, unknown>): Response {
  return new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}
function erro(status: number, mensagem: string, code?: string): Response {
  return resposta(status, { error: mensagem, code });
}
// Mensagens do Supabase Auth para quem usa o site.
function erroDaConta(e: { code?: string; message?: string }): Response {
  const msg = e.message || '';
  if (e.code === 'email_exists' || /already been registered/i.test(msg)) {
    return erro(409, 'Já existe uma conta de login com esse email. Para usar essa conta, crie o usuário com a senha em branco.', 'email_exists');
  }
  if (e.code === 'weak_password' || /password/i.test(msg)) return erro(400, 'A senha precisa ter pelo menos 6 caracteres.', 'weak_password');
  if (e.code === 'email_address_invalid' || /email/i.test(msg)) return erro(400, 'Esse email não parece válido.', 'email_invalid');
  return erro(400, msg || 'O Supabase recusou o pedido.');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return erro(405, 'Use POST.');

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!url || !anon || !service) return erro(500, 'A função não recebeu as chaves do projeto.');

  // Quem pediu: a conta logada no site, que precisa ser de um usuário Mestre.
  const comoQuemPediu = createClient(url, anon, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const eu = await comoQuemPediu.rpc('hounds_eu');
  if (eu.error || !eu.data) return erro(401, 'Entre com a sua conta para fazer isso.');
  if (eu.data.role !== 'mestre') return erro(403, 'Só o Mestre pode gerenciar contas.');

  let corpo: Record<string, unknown>;
  try { corpo = await req.json(); } catch { return erro(400, 'Pedido inválido.'); }
  const id = String(corpo.id ?? '').trim();
  if (!id) return erro(400, 'Falta o usuário.');

  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  // A conta de login (id no Supabase Auth) de um usuário do Hounds, pelo email cadastrado.
  async function contaDe(usuario: string): Promise<string | null> {
    const r = await admin.rpc('hounds_conta_id', { p_usuario: usuario });
    if (r.error) throw r.error;
    return (r.data as string | null) ?? null;
  }

  try {
    if (corpo.acao === 'criar') {
      const nome = String(corpo.nome ?? '').trim().replace(/\s+/g, ' ');
      const email = String(corpo.email ?? '').trim().toLowerCase();
      const senha = String(corpo.senha ?? '');
      const papel = String(corpo.papel ?? 'jogador');
      if (!nome) return erro(400, 'Digite um nome.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return erro(400, 'Esse email não parece válido.', 'email_invalid');
      if (senha.length < 6) return erro(400, 'A senha precisa ter pelo menos 6 caracteres.', 'weak_password');
      if (!PAPEIS.includes(papel)) return erro(400, 'Perfil inválido.');

      const criada = await admin.auth.admin.createUser({ email, password: senha, email_confirm: true });
      if (criada.error || !criada.data.user) return erroDaConta(criada.error ?? {});
      const t = Date.now();
      const usuario = await admin.rpc('hounds_put', { p_col: 'users', p_id: id, p_doc: { name: nome, role: papel, email, createdAt: t, updatedAt: t } });
      if (usuario.error) {
        // Sem o usuário do Hounds, a conta não serve para nada: sai também.
        await admin.auth.admin.deleteUser(criada.data.user.id);
        return erro(400, usuario.error.message);
      }
      return resposta(200, { ok: true, usuario: usuario.data });
    }

    if (corpo.acao === 'senha') {
      const senha = String(corpo.senha ?? '');
      if (senha.length < 6) return erro(400, 'A senha precisa ter pelo menos 6 caracteres.', 'weak_password');
      const conta = await contaDe(id);
      if (!conta) return erro(404, 'Esse usuário não tem conta de login: falta o email, ou não há conta com esse email no Supabase.', 'sem_conta');
      const r = await admin.auth.admin.updateUserById(conta, { password: senha });
      if (r.error) return erroDaConta(r.error);
      return resposta(200, { ok: true });
    }

    if (corpo.acao === 'excluir') {
      if (id === eu.data.id) return erro(400, 'Você não pode excluir o seu próprio usuário.');
      const conta = corpo.excluirConta ? await contaDe(id) : null;
      const r = await admin.rpc('hounds_remove', { p_col: 'users', p_id: id });
      if (r.error) return erro(400, r.error.message);
      if (conta) {
        const d = await admin.auth.admin.deleteUser(conta);
        if (d.error) return resposta(200, { ok: true, aviso: 'O usuário foi excluído, mas a conta de login não: ' + d.error.message });
      }
      return resposta(200, { ok: true, contaExcluida: !!conta });
    }

    return erro(400, 'Ação desconhecida.');
  } catch (e) {
    return erro(500, (e as Error).message || 'Erro inesperado.');
  }
});
