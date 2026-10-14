# Banco de dados no Supabase

Com o Supabase configurado, o Hounds guarda mapas, marcadores, locais, personagens, fichas, organizações, eventos, anotações, usuários, os catálogos de GURPS e a Mesa de Combate em **tabelas relacionais do PostgreSQL**. As imagens ficam no **Supabase Storage** e as mudanças chegam aos outros navegadores pelo **Realtime**.

A estrutura do banco está nas migrations versionadas de [supabase/migrations/](supabase/migrations/), que são executadas em ordem.

---

## 1. Estrutura

### Tabelas principais

| Tabela | O que guarda | Vínculos |
|---|---|---|
| `usuarios` | Contas do hub (`papel`: mestre, jogador ou visualizador). | — |
| `mapas` | Mapas e a referência da imagem no Storage (`imagem_ref`). | `mapa_pai_id` → `mapas`: hierarquia sem limite de níveis, com bloqueio de ciclo. |
| `marcadores` | Marcadores sobre a imagem de um mapa (`x`, `y` de 0 a 1). | `mapa_id` → `mapas` (exclusão em cascata), `local_id` → `locais`, `mapa_vinculado_id` → `mapas`. |
| `locais` | Locais, com até duas imagens. | `mapa_id` → `mapas`, `local_pai_id` → `locais` (hierarquia, sem ciclo). |
| `personagens` | Personagens. | `ficha_id` → `fichas`, **UNIQUE**: no máximo uma ficha por personagem e cada ficha em um personagem só. |
| `fichas` | Fichas de GURPS: atributos e defesas em colunas. | Perícias, culturas, vantagens, estilos, itens de combate e armas em `ficha_*`. |
| `organizacoes` | Organizações. | — |
| `eventos` | Eventos. A data é `data_texto` (texto livre, no calendário da campanha). | `local_id` → `locais`. |
| `cadernos`, `anotacoes` | Títulos e anotações. | `anotacoes.caderno_id` → `cadernos` (exclusão em cascata). |
| `magias`, `vantagens`, `pericias`, `tecnicas`, `estilos` | O que o Mestre criou ou mudou nos catálogos (os livros continuam em `dados/*.json`). | — |
| `mesa_estado`, `mesa_partes` | Estado da Mesa de Combate, num registro só (veja a seção 6). | — |

### Tabelas de vínculo

Todas têm chave primária composta, que impede vínculo repetido, e chaves estrangeiras com `ON DELETE CASCADE`.

| Tabela | Relação |
|---|---|
| `personagem_organizacao` | Personagem ↔ organização, com o `cargo`. Um personagem em várias organizações. |
| `organizacao_local` | Organização ↔ locais. |
| `organizacao_mapa` | Organização ↔ mapas. |
| `evento_personagem` | Evento ↔ personagens que participaram. |
| `local_personagem` | Local ↔ personagens que vivem ou costumam estar nele. |
| `personagem_mapa` | Personagem ↔ mapas onde aparece. |
| `personagem_relacao` | Personagem ↔ personagem, com o `tipo` (não pode ser consigo mesmo). |
| `<entidade>_compartilhamento` | Contas que veem um item oculto (`visivel = false`). |
| `ficha_pericia`, `ficha_cultura`, `ficha_vantagem`, `ficha_vantagem_pericia`, `ficha_estilo`, `ficha_item_combate`, `ficha_arma` | Seções da ficha, na ordem em que aparecem. |

### Leitura e gravação

- **Leitura:** cada tabela principal tem uma view `<tabela>_doc` que junta a tabela e os vínculos dela e devolve o item já montado, no formato que as páginas usam. Assim os componentes do site continuam iguais.
- **Gravação:** só pelas funções `hounds_put`, `hounds_patch`, `hounds_remove`, `hounds_remove_many` e `hounds_trocar_imagem_mapa`. Cada chamada roda numa transação: a tabela principal e todos os vínculos mudam juntos, ou nada muda. As funções:
  - validam os campos com as mesmas regras do site;
  - ignoram ids de itens que não existem mais;
  - nas exclusões, seguem as regras de cada entidade. Os submapas e locais de um mapa excluído sobem para o mapa pai. Os sublocais de um local excluído sobem. Um personagem excluído sai das organizações, locais e eventos. A troca da imagem de um mapa exclui os marcadores dele e, se houver marcadores, só acontece com confirmação.
- **Imagens:** ficam no bucket `hounds-images` do Storage. A tabela guarda só o caminho (`imagem_ref`) e os dados da imagem.

---

## 2. Aplicar as migrations

| Ordem | Arquivo | O que faz |
|---|---|---|
| 1 | `20261014120000_base_hounds_docs.sql` | Tabela antiga `hounds_docs` e bucket de imagens (o antigo `supabase-setup.sql`). |
| 2 | `20261014120100_tabelas_relacionais.sql` | Tabelas, chaves, restrições, índices, triggers e Realtime. |
| 3 | `20261014120200_visoes_documentos.sql` | Views `<tabela>_doc`. |
| 4 | `20261014120300_funcoes_gravacao.sql` | Funções de gravação (RPC). |
| 5 | `20261014120400_seguranca_rls.sql` | RLS e permissões. |
| 6 | `20261014120500_migrar_dados.sql` | Deixa o `hounds_docs` só leitura, copia os dados e mostra a validação. |
| 7 | `20261015120000_autenticacao.sql` | Login com email e senha e permissões de Mestre e Jogador no banco (seção 4). |

**Pelo SQL Editor:** abra o [SQL Editor do Supabase](https://supabase.com/dashboard/project/cjjhlorfnjspikjhsanx/sql). Para cada arquivo, na ordem, clique em **New query**, cole o conteúdo e clique em **Run**. No banco atual, a 1 já foi executada (era o `supabase-setup.sql`), mas rodar de novo não muda nada.

**Pela Supabase CLI:** `supabase link --project-ref cjjhlorfnjspikjhsanx` e depois `supabase db push`.

---

## 3. Migrar o banco atual

O banco de produção já tem os dados em `hounds_docs`. A troca é feita assim:

1. **Escolha um momento em que ninguém esteja usando o site.** A migration 6 deixa o `hounds_docs` só para leitura. A partir daí, a versão antiga do site não consegue mais salvar, mas também não perde nada.
2. **Rode as migrations 2 a 6**, nessa ordem. A 6 termina mostrando:
   - os documentos que não puderam ser copiados (`hounds_interno.migracao_erros`), que deve vir vazio;
   - a validação, uma linha por verificação, com `ok = true` em todas: quantidade de itens por coleção, vínculos (membros, locais, mapas, personagens de eventos, compartilhamentos), referências (mapa pai, ficha do personagem...) e as seções das fichas.

   Para consultar a validação de novo: `SELECT * FROM hounds_interno.validar_migracao();`
3. **Compare campo a campo:** `cd tools` e `node validar-migracao.mjs` (depois da migration 7, com a chave `service_role`; veja o início do script). O script lê cada documento de `hounds_docs` e o item correspondente nas views, e lista qualquer diferença. Os avisos são diferenças esperadas: ids de itens que já não existiam, contas excluídas.
4. **Publique o site:** faça o merge desta versão na `main`, que o GitHub Pages publica. Peça a quem estava com o site aberto que recarregue a página.

**Nada é apagado.** O `hounds_docs` continua no banco como cópia, só para leitura.

**Para voltar ao site antigo** (antes de apagar o `hounds_docs`), rode no SQL Editor e publique a versão anterior do site:
```sql
GRANT INSERT, UPDATE, DELETE ON public.hounds_docs TO anon, authenticated;
CREATE POLICY "Acesso público hounds_docs" ON public.hounds_docs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT EXECUTE ON FUNCTION public.patch_hounds_doc(TEXT, TEXT, JSONB) TO anon, authenticated;
```

**Apagar o `hounds_docs`** só depois de usar o site novo por um tempo e confirmar que está tudo certo:
```sql
DROP TABLE public.hounds_docs;
DROP FUNCTION public.patch_hounds_doc(TEXT, TEXT, JSONB);
```

### Importar os arquivos de `dados/`

Para enviar os JSON (`dados/maps.json`, `dados/characters.json`...) e as imagens locais (`imagens/`) a um banco **vazio**, já com as migrations:
```bash
cd tools
node importar-supabase.mjs
```
O script grava pelas mesmas funções do site.

---

## 4. Login e permissões

Cada pessoa entra com **email e senha** (Supabase Auth, provedor Email). A conta é criada pelo Mestre no painel do Supabase e ligada ao usuário do Hounds pelo email, cadastrado na aba **Usuários**. A estrutura está na migration `20261015120000_autenticacao.sql` (7).

### Ligar o login (uma vez)

1. **Bloqueie o cadastro pelo site:** em [Authentication › Sign In / Providers](https://supabase.com/dashboard/project/cjjhlorfnjspikjhsanx/auth/providers), desligue **Allow new users to sign up** e deixe o provedor **Email** ligado. Assim só existem as contas que o Mestre criar.
2. **Crie as contas:** em [Authentication › Users](https://supabase.com/dashboard/project/cjjhlorfnjspikjhsanx/auth/users), clique em **Add user › Create new user** para cada pessoa (Mestre e jogadores). Informe o email e uma senha e marque **Auto Confirm User**. Passe a senha para a pessoa.
3. **Rode a migration 7** no SQL Editor. A partir daqui, o site antigo (sem login) para de funcionar, então siga direto para os passos 4 a 6.
4. **Ligue a conta do Mestre**, ainda no SQL Editor, com o email da conta dele:
   ```sql
   INSERT INTO public.usuario_email (usuario_id, email) VALUES ('user-leandro', 'email-do-mestre@exemplo.com');
   ```
   O email não fica no código: o repositório é público.
5. **Teste no computador** antes de publicar: rode o site localmente (veja "Rodar no computador" no README), entre com a conta do Mestre e, na aba **Usuários**, cadastre o email de cada jogador.
6. **Publique o site** (merge na `main`) e avise o grupo para recarregar a página e entrar com email e senha.

### No dia a dia

- **Jogador novo:** o Mestre cria a conta no painel (passo 2) e cadastra o usuário com o mesmo email na aba Usuários.
- **Esqueceu a senha:** o Mestre abre a conta em Authentication › Users e define uma senha nova. O site não envia email de recuperação, porque o servidor de email padrão do Supabase só envia para a equipe do projeto.
- **Tirar alguém:** exclua o usuário na aba Usuários (a pessoa não entra mais) e, se quiser, a conta no painel.

### O que o banco garante

- **Leitura:** só contas ligadas a um usuário leem. A chave pública sozinha não lê nada, nem o `hounds_docs`.
- **Mestre:** tudo. Gerencia usuários e emails (só ele vê os emails), os catálogos de GURPS, a visibilidade e o compartilhamento de qualquer item.
- **Jogador:**
  - cria e altera os itens que vê: mapas, locais, personagens, fichas, organizações, eventos, marcadores, anotações e a Mesa;
  - muda a visibilidade só do que ele criou;
  - não altera usuários, catálogos nem com quem um item é compartilhado;
  - não altera nem exclui um item oculto que não foi compartilhado com ele.
- **Dono:** quem criou um item é sempre a conta que gravou, e isso não muda depois.
- **Mestre sempre existe:** o banco recusa rebaixar ou excluir o último Mestre.
- **Gravação:** só pelas funções `hounds_*`, que validam os dados e respeitam as chaves estrangeiras. RLS ligado em todas as tabelas e nenhuma escrita direta.
- **Imagens:** enviar, trocar e apagar só com login. Quem tem o endereço de uma imagem a abre, mas os endereços são aleatórios.
- **Mesa:** as mensagens diretas vão por um canal privado (`hounds-mesa`), só para contas ligadas.
- **Chaves:** a `service_role` (que ignora as regras) nunca vai para o site. O `supabase-config.js` só tem a `anon`. Os scripts de `tools/` usam a `service_role` pela variável de ambiente `SUPABASE_SERVICE_ROLE_KEY`, só no seu computador.

Itens ocultos ainda chegam ao navegador dos jogadores logados, e o site os esconde, como antes. Esconder no próprio banco é um passo seguinte.

---

## 5. Sincronização entre navegadores

- **Mapas, locais, personagens e o resto:** quem altera vê na hora, e a resposta do banco substitui essa cópia. Os outros navegadores recebem o aviso do Realtime e baixam de novo só o item que mudou, pela view. Mudar um vínculo também marca como alterado o item a que ele pertence: tirar um personagem de uma organização avisa a organização.
- **Quedas de conexão:** ao reconectar, ao voltar para a aba e a cada 60 s, a página confere tudo com o banco. Ela baixa só o `id` e o `updated_at` de cada item e depois só os itens que mudaram.
- **Realtime:** as tabelas principais estão na publicação `supabase_realtime`, com `REPLICA IDENTITY DEFAULT`, então numa exclusão o aviso leva só o id. As tabelas de vínculo não precisam estar na publicação.

Limites do plano gratuito que importam aqui: 100 mensagens por segundo no projeto, 200 conexões ao mesmo tempo e 256 KB por mensagem direta. Se a Mesa só atualizar com cerca de 1 s de atraso, confira nas configurações de Realtime do projeto se o acesso a canais públicos está permitido.

---

## 6. Mesa de Combate

O estado da Mesa (combates, NPCs, personagens salvos, condições, rounds e log) é o estado do app da Mesa, que ele lê e grava inteiro. Por isso fica num registro só, `mesa_estado` (metadados em colunas e o estado em `estado`). Normalizar a Mesa em tabelas próprias é uma etapa separada, que exige mudar o app React da Mesa.

- Cada mudança vai direto para os outros navegadores pelo canal `hounds`, antes de passar pelo banco. O banco salva o estado 0,3 s depois da última mudança, e é de lá que lê quem abre o site depois. O aviso do Realtime já traz o estado inteiro, e a página não baixa de novo.
- Os avatares que a Mesa guarda como texto são enviados uma vez para o bucket de imagens, e o estado fica com o endereço deles.
- Se duas pessoas mexem no mesmo personagem no mesmo instante, fica a última mudança.
