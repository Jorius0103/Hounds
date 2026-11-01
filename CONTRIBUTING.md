# Como contribuir

## Onde fica cada coisa

| Quero mexer em… | Arquivo |
|---|---|
| Uma aba (Mapas, Personagens, Fichas, Magias, Anotações, Início) | `js/tabs/tab-<aba>.js` |
| A página Locais | `src/hub/paginas/Locais.tsx` (a lista), `Local.tsx` (um local, com a árvore) e `LocalForm.tsx` (criar e editar), em React. A gravação (`Ops.saveLocation`, `Ops.deleteLocation`, `Ops.ensureCharacters`) e as funções de local (`childLocs`, `locChars`…) ficam em `js/mundo.js`. A página de mapa, ainda antiga, abre o formulário pelo `window.hubOpenLocationForm` (`src/hub/main.tsx`) |
| A página Eventos | `src/hub/paginas/Eventos.tsx` (a lista), `Evento.tsx` (um evento) e `EventoForm.tsx` (criar e editar), em React. Os dados, a gravação (`Ops.saveEvent`, `Ops.deleteEvent`) e o que as páginas de local e de personagem usam continuam em `js/tabs/tab-eventos.js` |
| A página Organizações | `src/hub/paginas/Organizacoes.tsx` (a lista), `Organizacao.tsx` (uma organização) e `OrganizacaoForm.tsx` (criar e editar), em React. Os dados, a gravação (`Ops.saveOrganization`, `Ops.deleteOrganization`, `Ops.setCharOrgs`), a migração do campo antigo e o que o formulário de personagem usa (`textPicker`, `rankTypes`) continuam em `js/tabs/tab-organizacoes.js` |
| A página Usuários | `src/hub/paginas/Usuarios.tsx` e os formulários de criar, editar e definir senha em `src/hub/paginas/UsuarioForm.tsx` (React). Os perfis, as permissões e a lista no banco continuam em `js/tabs/tab-usuarios.js` |
| Um modal em React | `src/hub/ui/Dialog.tsx`: `openDialog(<Formulario />)`, e o formulário desenha o `<Dialog>` em volta do próprio `<form>`. Veja "Hub em React (src/hub/)" abaixo |
| As peças das páginas React (trilha, miniaturas, caixas recolhíveis, visibilidade, campo de imagem, seletores) | `src/hub/ui/`. Cada uma faz o mesmo HTML da função antiga que substitui; veja a lista em "Hub em React (src/hub/)" abaixo |
| Como os dados são salvos, ou regras de visibilidade | `js/mundo.js` (operações `Ops.*` e visibilidade) e `js/store/` (bancos) |
| Tabelas, campos ou regras do banco no Supabase | Uma migration nova em `supabase/migrations/` (nunca edite uma que já rodou). Um campo novo num documento precisa de coluna, de leitura na view `<tabela>_doc` e de gravação em `hounds_interno.salvar_<entidade>`. Veja [SUPABASE.md](SUPABASE.md). |
| Uma rota nova (`#algo`) | `js/rotas.js` (`parseRoute`, `hrefFor`) e `js/app.js` (`renderPage`). Quem acompanha o endereço é a casca React (`src/hub/HubApp.tsx`): a cada mudança ela chama o `onRoute` do `app.js` |
| Migrar uma página para React | Crie o componente em `src/hub/` e registre-o em `PAGES` (`src/hub/pages.ts`) pela chave `page` da rota. A casca o desenha no `#reactPage` e o `renderPage` deixa de desenhá-la. Veja "Hub em React (src/hub/)" abaixo |
| O menu lateral ou o tema | `js/menu.js` |
| Ícones, categorias de marcador, funções pequenas (`esc`, `toast`…) | `js/utils.js` |
| O explorer de mapas | `js/explorer.js` |
| Os tabuleiros (a mesa virtual: mapa de batalha com tokens, paredes, luz dinâmica, névoa, as ferramentas e a barra lateral) | `js/tabs/tab-tabuleiros.js` (lista, formulários, o tabuleiro na tela, a barra de ferramentas e as opções de cada uma, as camadas, o HUD do token, os menus, os Ajustes, quem está na mesa e o arrastar para o mapa), `js/tabuleiro-geo.js` (grade, linha de visão, paredes, área explorada e células), `js/tabuleiro-dados.js` (rolagem de dados e o teste de GURPS), `js/tabuleiro-janela.js` (as janelas flutuantes), `js/tabuleiro-chat.js` (o chat e os comandos), `js/tabuleiro-turnos.js` (a ordem de turno), `js/tabuleiro-diario.js` (o Diário), `js/tabuleiro-arte.js` (a biblioteca de arte) e `js/tabuleiro-paginas.js` (a barra de páginas e a fita dos jogadores) |
| A imagem do mapa na página do mapa (marcadores, zoom, arrastar) | `js/mapa-previa.js` |
| O editor de texto das anotações | `js/editor-texto.js` |
| A escolha de usuário | `js/gate.js` |
| Os dados da Mesa no banco | `js/mesa-sync.js` |
| A Mesa de Combate (cards, fichas, log, dano, magias, retratos, barra superior e modais) | `src/` (React). Depois de mudar, rode `npm run build:mesa` e faça o commit do `mesa.html` junto. Nunca edite o `mesa.html` à mão: a checagem do PR falha. Veja "Mesa de Combate (src/)" abaixo |
| Estilos | `css/` (veja os nomes dos arquivos) |

## Regras do código

Os arquivos de `js/` são scripts comuns, sem build: o Vite os publica como estão, carregados em ordem pelo fim do `index.html`. Só a casca React (`src/hub/`) e a Mesa de Combate (`src/`) passam pelo build; veja as seções delas abaixo. Por isso:

1. **Tudo que é declarado no nível superior de um arquivo é global.** Uma função `renderX` em `tab-mapas.js` é visível em todos os outros arquivos. Antes de criar um nome, procure no projeto se ele já existe. Um nome repetido substitui o anterior sem nenhum aviso.
2. **A ordem dos `<script>` importa.** Um arquivo só pode *usar no momento em que carrega* o que veio antes dele. Dentro de funções, chamadas para outros arquivos funcionam em qualquer ordem, porque só rodam depois que tudo carregou. Uma aba nova entra na lista de "Abas", antes do `app.js`.
3. **A ordem dos `<link>` de CSS também importa**: em empate de especificidade, vence o arquivo carregado depois.
4. Siga o estilo do arquivo que está editando: `var`, `function`, aspas simples, sem dependências novas.

## Checagem de tipos

O VS Code checa os arquivos de `js/` como TypeScript, sem build: o `jsconfig.json` liga a checagem e a pasta `types/` descreve os dados (mapa, local, personagem, organização, anotação, usuário), o estado global `W` e `S` e o que fica em `window`. Erros como `W.mpas`, `personagem.nmae`, uma função escrita errado ou um campo que não existe aparecem sublinhados e na aba **Problemas** (Ctrl+Shift+M).

- Ao criar um campo novo num documento, declare-o em `types/dados.d.ts`.
- Ao pendurar algo novo em `window`, declare em `types/globais.d.ts`.
- Use `/** @type {...} */` quando o editor não conseguir deduzir um tipo, como nos exemplos do código. Evite `@ts-ignore`; quando for intencional, use `// @ts-expect-error -- motivo`.

Em cada Pull Request, o GitHub roda a mesma checagem e o `tools/checar-globais.mjs`, que acusa nomes globais declarados em mais de um arquivo (a checagem de tipos não pega isso). Para o `src/`, roda também o `tsc`, o `npm run build:mesa` com um `git diff` que acusa um `mesa.html` diferente do build, e o `npm run build` do hub. O PR mostra ✗ se algum falhar.

A publicação é outro workflow, o **Publicar** (`.github/workflows/publicar.yml`): a cada push na `main`, ele roda o `npm run build:mesa` e o `npm run build` e envia o site ao GitHub Pages. A Checagem não bloqueia a publicação; um build que falha, sim, e o site fica na versão anterior.

## Hub em React (src/hub/)

O hub está sendo migrado para React aos poucos. A casca (`src/hub/main.tsx` e `HubApp.tsx`) carrega depois dos scripts de `js/` e cuida das rotas:

- O endereço continua nos formatos de sempre (`#ficha~id`, `#map~id~explorar`…), porque há links gravados nos dados. A casca o lê com o `parseRoute` de `js/rotas.js` e, a cada mudança, chama o `onRoute` de `js/app.js`, que atualiza o menu, o título e as telas.
- O `go()` de `js/rotas.js` avisa a casca com o evento `hub:route` quando redesenha o mesmo endereço ou o troca sem criar histórico (`replaceState`), porque nesses casos o navegador não dispara `hashchange`.
- Uma página registrada em `PAGES` (`src/hub/pages.ts`) é desenhada pela casca no `#reactPage`, e o `#pageRoot` fica escondido. As outras continuam com o `renderPage` de `js/app.js`.
- O estado de interface de uma página React (busca, confirmações, caixas abertas) fica no próprio componente, não no `S.ui`. A casca remonta a página a cada item (de um evento para outro, por exemplo), e esse estado recomeça como o `S.ui` das páginas antigas. A rota chega pela propriedade `route`; uma página React não lê o `S.route` nem o `S.ui`, que o `onRoute` só atualiza depois de ela desenhar.
- Os dados: uma página React lê `W`, `S` e o usuário com o hook `useHub()` (`src/hub/data.ts`) e redesenha sozinha quando eles mudam. Os avisos são os eventos `hub:data` (uma coleção chegou do banco, disparado pelo `onData` de `js/app.js`), `hub:users` (a lista de usuários) e `hub:user` (troca de usuário). `W` e `S` continuam sendo os mesmos objetos, alimentados pelo `js/app.js`.
- Os tipos: o `src/` usa os mesmos de `types/dados.d.ts` e `types/globais.d.ts` (`World`, `PageState`, `Route`, `window.hubUser`…). O `src/hub/legacy.d.ts` declara as funções de `js/` que a casca chama; ao usar mais uma numa página React, declare-a ali.

Páginas já migradas: **Usuários** (`src/hub/paginas/Usuarios.tsx`, com os formulários em `UsuarioForm.tsx`), **Eventos** (`Eventos.tsx`, `Evento.tsx` e `EventoForm.tsx`), **Organizações** (`Organizacoes.tsx`, `Organizacao.tsx` e `OrganizacaoForm.tsx`) e **Locais** (`Locais.tsx`, `Local.tsx` e `LocalForm.tsx`).

As peças compartilhadas ficam em `src/hub/ui/`, cada uma com o mesmo HTML e o mesmo comportamento da função antiga:

| Peça | Substitui |
|---|---|
| `Icon` | `svg()` de `js/utils.js` |
| `Crumbs` | `crumbsHtml()` de `js/pagina.js` |
| `ImageSlot` e `useImageUrl` | `thumbSlot()` e `fillImages()` de `js/pagina.js` |
| `FoldBox` | `foldBox()` e `wireFolds()` de `js/pagina.js` |
| `VisibilityControls` | `tagPage()` e `revealMenu()` de `js/app.js` (a etiqueta "Só …", ocultar e revelar) |
| `VisibilityFlag`, `visDraft` e `visFields` | `flagHtml()`, `flagVal()` e `shareVal()` de `js/mundo.js` |
| `ImageField` | `imageFieldHtml()` e `imageField()` de `js/modal.js` |
| `IdPicker` | `idPickerHtml()` e `idPicker()` de `js/modal.js` |
| `TextPicker` | `textPicker()` de `js/tabs/tab-organizacoes.js` (cada escolhido com um campo de texto ao lado, como o cargo de um membro) |
| `Datalist` | `datalistHtml()` de `js/tabs/tab-organizacoes.js` (as sugestões de um campo de texto) |
| `locSelectOptions` e `mapSelectOptions` (`options.ts`) | `locParentOptions()` e `mapOptions()` de `js/mundo.js` (as opções em árvore de um `<select>`) |
| `MapRow` e `PathTree` (`MapTree.tsx`) | `mapRow()` e `pathTree()` de `js/pagina.js` (por enquanto, o `pathTree` só com `leaf`, o caso da página de local) |
| `Dialog` | `showModal()`, `requestCloseModal()` e `closeModal()` de `js/modal.js` |

O modal em React (`src/hub/ui/Dialog.tsx`) tem o visual e o comportamento do antigo (`js/modal.js`): um por vez, por cima de qualquer página, fechado pelo X, pelo clique fora ou pelo Esc, que perguntam antes de descartar alterações; o Cancelar e o salvar chamam `closeDialog()` e fecham direto. O formulário passa `busy` ao `<Dialog>` enquanto salva, e aí nada fecha o modal. Enquanto ele está aberto, o `modalOpen` de `js/` aponta para ele, então as páginas antigas não redesenham com o formulário aberto, o Esc tratado em `js/explorer.js` chega a ele e o aviso de alterações não salvas ao sair da página vale também.

Para migrar uma página:

1. Crie o componente em `src/hub/paginas/` com o mesmo HTML da versão antiga: as mesmas tags, classes e textos, porque o CSS de `css/` continua o mesmo. Use as peças de `src/hub/ui/` no lugar das funções antigas (a tabela acima); o aviso do topo vem do `noticeText()` de `js/pagina.js`. A gravação continua no `Ops` de `js/`.
2. Registre-o em `PAGES` (`src/hub/pages.ts`) e declare no `src/hub/legacy.d.ts` as funções de `js/` que ele chama.
3. Apague a função `render…Page` antiga, a linha dela no `renderPage` de `js/app.js`, o invólucro dela que chama o `tagPage` (o botão de visibilidade, que a página React desenha com o `VisibilityControls`) e as chamadas que redesenhavam a página quando os dados mudavam: o React redesenha sozinho com os avisos de dados. O que outras telas antigas ainda usam fica no arquivo (o `textPicker` de Organizações, por exemplo, serve ao formulário de personagem); se não sobrar nada, apague o arquivo e a linha dele no `index.html`, como foi com o `tab-locais.js`.
4. Os formulários vão para componentes React com o `<Dialog>`, com a mesma marcação e as mesmas validações (veja `UsuarioForm.tsx`). Se precisar migrar a página antes, eles podem continuar no modal antigo (`showModal`), chamados do componente. Se uma página antiga ainda abre o formulário migrado, exponha-o em `src/hub/main.tsx` como `window.hubOpen…`, declarado em `types/globais.d.ts` (veja o `hubOpenLocationForm`, que a página de mapa usa).
5. Teste com Mestre e Jogador, criando, editando e excluindo, e compare com o site publicado.

Para testar: `npm run dev` (veja "Rodar no computador" no README). Antes do commit, `npx tsc --noEmit` e `npm run build` devem passar.

## Mesa de Combate (src/)

A Mesa é um app React (Vite e Tailwind) em `src/`. O `npm run build:mesa` gera o `mesa.html` da raiz num arquivo único, com o CSS e o JS embutidos, porque o hub o busca e o coloca no `srcdoc` do iframe (`js/mesa-frame.js`).

1. Uma vez: `npm install` (precisa do Node LTS).
2. Edite o `src/`. O `npx tsc --noEmit` checa os tipos; no VS Code, os erros aparecem na aba **Problemas**.
3. Rode `npm run build:mesa` e teste a Mesa dentro do hub, com o `npm run dev` (veja "Rodar no computador" no README).
4. Faça o commit do `src/` e do `mesa.html` juntos. Se esquecer de gerar, ou se o `mesa.html` for editado à mão, a checagem falha.

O que a Mesa usa do hub: o usuário (`window.hubUser` e o evento `hub:user`), a sincronização (`window.parent.hubMesaBus`, em `src/utils/hubBus.ts`), a trilha sonora (`window.audioStreamSync`, em `src/utils/hubAudio.ts`) e os scripts `js/three.min.js`, `js/dice-roller-3d.js` e `js/audio-stream-sync.js`, carregados no `<head>` de `src/mesa.html`.

## Fluxo de trabalho

1. Atualize a `main` e crie uma branch por tarefa: `git checkout -b feat/nome-curto` (ou `fix/...`).
2. Faça commits pequenos, com mensagens que digam o que muda.
3. Abra um Pull Request para a `main`. Outra pessoa da equipe revisa antes do merge.
4. Antes de pedir revisão, confira a aba **Problemas** do VS Code sem erros e rode o site localmente (veja "Rodar no computador" no README). Passe pelas páginas que você mexeu, com um usuário Mestre e um Jogador, e confira o console do navegador (F12) sem erros.

Evite que duas pessoas mexam no mesmo arquivo ao mesmo tempo. Se precisar, combine antes.

## Testar sem mexer nos dados reais

O `supabase-config.js` aponta para o banco de produção. Para testar localmente sem alterar os dados da campanha, deixe `url: ''` nele, **sem fazer commit dessa mudança**. A página passa a salvar só no navegador (IndexedDB).
