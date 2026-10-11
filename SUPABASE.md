# Banco de dados no Supabase

Com o Supabase configurado, o Hounds armazena mapas, locais, personagens, anotações, usuários, imagens e a Mesa de Combate num banco compartilhado na nuvem em tempo real (PostgreSQL + Supabase Storage + Realtime).

---

## 1. Executar o Script SQL no Supabase

1. Acesse o painel do seu projeto no Supabase:
   👉 **[SQL Editor do Supabase](https://supabase.com/dashboard/project/cjjhlorfnjspikjhsanx/sql)**
2. Clique em **New query**.
3. Copie todo o conteúdo do arquivo [supabase-setup.sql](supabase-setup.sql) e cole no editor.
4. Clique em **Run** (botão verde no canto inferior direito).
5. Pronto! A tabela `hounds_docs`, as regras de acesso e o bucket de imagens `hounds-images` foram criados.

---

## 2. Importar os Dados Existentes (Opcional)

Se você já tem arquivos JSON (`dados/maps.json`, `dados/characters.json`, etc.) e imagens locais (`imagens/`) que quer enviar para o Supabase:

1. No terminal, abra a pasta `tools`:
   ```bash
   cd tools
   node importar-supabase.mjs
   ```
2. O script enviará todos os documentos e imagens para o Supabase automaticamente.

---

## 3. Publicar no GitHub Pages

Para publicar as alterações:
```bash
git add .
git commit -m "Adiciona suporte ao Supabase"
git push origin main
```

---

## 4. Sincronização entre navegadores

Não precisa de nenhuma configuração além do script SQL, que já liga o Realtime na tabela `hounds_docs`.

- **Mapas, locais, personagens, anotações e usuários:** quem altera vê na hora, e os outros navegadores recebem a mudança assim que o banco grava. Cada aviso do banco já traz o documento, então a página não baixa a coleção de novo.
- **Mesa de Combate:** cada mudança vai direto para os outros navegadores, pelo canal `hounds`, antes de passar pelo banco. O banco salva o estado 0,3 s depois da última mudança, e é de lá que lê quem abre o site depois.
- **Avatares da Mesa:** a Mesa guarda a imagem escolhida como texto dentro do personagem (e copia esse texto no log). Antes de salvar ou enviar, o site manda cada imagem uma vez para o bucket de imagens e troca o texto pelo endereço dela. Assim o estado da Mesa fica com poucos KB e cabe na mensagem direta. Imagens antigas que deixaram de ser usadas continuam no bucket.
- **Edições ao mesmo tempo:** a Mesa mescla personagem por personagem, e vale a mudança mais recente de cada um. Se duas pessoas mexem no mesmo personagem no mesmo instante, fica a última.
- **Quedas de conexão:** ao reconectar, ao voltar para a aba e a cada 60 s, a página confere tudo com o banco e recupera o que tiver perdido. A conferência baixa só o `id` e o `updated_at` de cada documento e depois só os documentos que mudaram, então custa pouco mesmo com as 647 magias. Só a primeira carga de cada coleção baixa tudo.

### Tráfego do Realtime (REPLICA IDENTITY)

A tabela usa `REPLICA IDENTITY DEFAULT`: cada aviso de alteração leva só a linha nova. Com `FULL`, que o script usava antes, cada aviso levava também a linha antiga inteira, o dobro do tráfego (pesa no estado da Mesa, que tem dezenas de KB). Num banco criado antes dessa mudança, rode uma vez no SQL Editor:

```sql
ALTER TABLE public.hounds_docs REPLICA IDENTITY DEFAULT;
```

Para conferir: `SELECT relreplident FROM pg_class WHERE oid = 'public.hounds_docs'::regclass;` responde `d` (DEFAULT) ou `f` (FULL).

Limites do plano gratuito que importam aqui: 100 mensagens por segundo no projeto, 200 conexões ao mesmo tempo e 256 KB por mensagem direta. Se o estado da Mesa passar de 240 KB, ele deixa de ir direto e chega só pelo banco, uns 0,5 s mais tarde.

Se a Mesa só atualizar com cerca de 1 s de atraso, confira nas configurações de Realtime do projeto se o acesso a canais públicos está permitido. As mensagens diretas da Mesa usam um canal público.

