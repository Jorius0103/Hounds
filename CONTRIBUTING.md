# Como contribuir

## Onde fica cada coisa

| Quero mexer em… | Arquivo |
|---|---|
| Uma aba (Mapas, Locais, Personagens, Organizações, Anotações, Usuários, Início) | `js/tabs/tab-<aba>.js` |
| Como os dados são salvos, ou regras de visibilidade | `js/mundo.js` (operações `Ops.*` e visibilidade) e `js/store/` (bancos) |
| Uma rota nova (`#algo`) | `js/rotas.js` (`parseRoute`, `hrefFor`) e `js/app.js` (`renderPage`) |
| O menu lateral ou o tema | `js/menu.js` |
| Ícones, categorias de marcador, funções pequenas (`esc`, `toast`…) | `js/utils.js` |
| O explorer de mapas | `js/explorer.js` |
| O editor de texto das anotações | `js/editor-texto.js` |
| A escolha de usuário | `js/gate.js` |
| Os dados da Mesa no banco | `js/mesa-sync.js` |
| Estilos | `css/` (veja os nomes dos arquivos) |

## Regras do código

O site não tem build. Os arquivos de `js/` são scripts comuns, carregados em ordem pelo fim do `index.html`. Por isso:

1. **Tudo que é declarado no nível superior de um arquivo é global.** Uma função `renderX` em `tab-mapas.js` é visível em todos os outros arquivos. Antes de criar um nome, procure no projeto se ele já existe. Um nome repetido substitui o anterior sem nenhum aviso.
2. **A ordem dos `<script>` importa.** Um arquivo só pode *usar no momento em que carrega* o que veio antes dele. Dentro de funções, chamadas para outros arquivos funcionam em qualquer ordem, porque só rodam depois que tudo carregou. Uma aba nova entra na lista de "Abas", antes do `app.js`.
3. **A ordem dos `<link>` de CSS também importa**: em empate de especificidade, vence o arquivo carregado depois.
4. Siga o estilo do arquivo que está editando: `var`, `function`, aspas simples, sem dependências novas.

## Fluxo de trabalho

1. Atualize a `main` e crie uma branch por tarefa: `git checkout -b feat/nome-curto` (ou `fix/...`).
2. Faça commits pequenos, com mensagens que digam o que muda.
3. Abra um Pull Request para a `main`. Outra pessoa da equipe revisa antes do merge.
4. Antes de pedir revisão, rode o site localmente (veja "Rodar no computador" no README). Passe pelas páginas que você mexeu, com um usuário Mestre e um Jogador, e confira o console do navegador (F12) sem erros.

Evite que duas pessoas mexam no mesmo arquivo ao mesmo tempo. Se precisar, combine antes.

## Testar sem mexer nos dados reais

O `supabase-config.js` aponta para o banco de produção. Para testar localmente sem alterar os dados da campanha, deixe `url: ''` nele, **sem fazer commit dessa mudança**. A página passa a salvar só no navegador (IndexedDB).
