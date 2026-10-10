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

## Checagem de tipos

O VS Code checa os arquivos de `js/` como TypeScript, sem build: o `jsconfig.json` liga a checagem e a pasta `types/` descreve os dados (mapa, local, personagem, organização, anotação, usuário), o estado global `W` e `S` e o que fica em `window`. Erros como `W.mpas`, `personagem.nmae`, uma função escrita errado ou um campo que não existe aparecem sublinhados e na aba **Problemas** (Ctrl+Shift+M).

- Ao criar um campo novo num documento, declare-o em `types/dados.d.ts`.
- Ao pendurar algo novo em `window`, declare em `types/globais.d.ts`.
- Use `/** @type {...} */` quando o editor não conseguir deduzir um tipo, como nos exemplos do código. Evite `@ts-ignore`; quando for intencional, use `// @ts-expect-error -- motivo`.

Em cada Pull Request, o GitHub roda a mesma checagem e o `tools/checar-globais.mjs`, que acusa nomes globais declarados em mais de um arquivo (a checagem de tipos não pega isso). O PR mostra ✗ se algum falhar.

## Fluxo de trabalho

1. Atualize a `main` e crie uma branch por tarefa: `git checkout -b feat/nome-curto` (ou `fix/...`).
2. Faça commits pequenos, com mensagens que digam o que muda.
3. Abra um Pull Request para a `main`. Outra pessoa da equipe revisa antes do merge.
4. Antes de pedir revisão, confira a aba **Problemas** do VS Code sem erros e rode o site localmente (veja "Rodar no computador" no README). Passe pelas páginas que você mexeu, com um usuário Mestre e um Jogador, e confira o console do navegador (F12) sem erros.

Evite que duas pessoas mexam no mesmo arquivo ao mesmo tempo. Se precisar, combine antes.

## Testar sem mexer nos dados reais

O `supabase-config.js` aponta para o banco de produção. Para testar localmente sem alterar os dados da campanha, deixe `url: ''` nele, **sem fazer commit dessa mudança**. A página passa a salvar só no navegador (IndexedDB).
