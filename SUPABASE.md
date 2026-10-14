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
3. **Compare campo a campo:** `cd tools` e `node validar-migracao.mjs`. O script lê cada documento de `hounds_docs` e o item correspondente nas views, e lista qualquer diferença. Os avisos são diferenças esperadas: ids de itens que já não existiam, contas excluídas.
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

## 4. Segurança

O site não tem login: quem abre escolhe um usuário na entrada e usa a chave pública (`anon`). Por isso, as regras de Mestre, Jogador e visibilidade continuam no site, e o banco garante o resto:

- **RLS ligado em todas as tabelas,** com política só de leitura.
- **Nenhuma escrita direta nas tabelas.** As permissões de INSERT, UPDATE e DELETE foram retiradas da chave pública. Só as funções `hounds_*` gravam (SECURITY DEFINER), e elas validam os dados e respeitam as chaves estrangeiras.
- **As funções internas** (schema `hounds_interno`) não são expostas pela API.
- **A chave `service_role`** (que ignora o RLS) nunca vai para o site. O `supabase-config.js` só tem a `anon`.

Isso impede dados inválidos ou relacionamentos quebrados, mas não identifica quem está gravando. Quem tem o link do site ainda lê e altera os dados pelo próprio site. Não guarde nada sigiloso.

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
