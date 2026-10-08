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

Se você já tem arquivos JSON (`maps.json`, `characters.json`, etc.) e imagens locais que quer enviar para o Supabase:

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

