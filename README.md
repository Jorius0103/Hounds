# Hounds — Hub da campanha GURPS

O código do hub da campanha e uma cópia dos dados. Para trabalhar no código, leia também [CONTRIBUTING.md](CONTRIBUTING.md).

## Pastas

| Caminho | O que é |
|---|---|
| `index.html` | Só o esqueleto da página (menu, áreas de conteúdo, modais) e a lista de CSS e JS carregados, em ordem. |
| `css/` | Estilos, divididos por área. A ordem dos `<link>` no `index.html` importa. |
| `js/` | O código do hub. Base (utilitários, banco, modelo do mundo, rotas, menu, modal), `explorer.js`, `editor-texto.js`, a sincronização da Mesa e `app.js`, que inicializa tudo. |
| `js/store/` | Acesso ao banco: API genérica e IndexedDB local (`store.js`), `firebase.js` e `supabase.js`. |
| `js/tabs/` | Uma aba por arquivo: `tab-inicio`, `tab-mapas`, `tab-locais`, `tab-personagens`, `tab-organizacoes`, `tab-anotacoes`, `tab-usuarios`. |
| `mesa.html` | A Mesa de Combate (Dash RPG) compilada. O hub a carrega no iframe por `js/mesa-frame.js`. |
| `dados/` | Cópia dos dados salvos no site, em JSON. |
| `imagens/` | As imagens enviadas (mapas, locais, personagens). O nome do arquivo é o `ref` usado nos dados. |
| `supabase-config.js` | Configuração do banco de dados (Supabase). Veja [SUPABASE.md](SUPABASE.md). |
| `firebase-config.js` | Configuração do banco de dados (Firebase). Veja [FIREBASE.md](FIREBASE.md). |
| `firestore.rules` | Regras de acesso do banco: só a conta da campanha lê e grava. |
| `tools/` | Scripts que importam os JSON e as imagens para o Supabase ou Firebase. |
| `src/`, `vite.config.ts`, `package.json` | Código-fonte React da Mesa (trazido do AI Studio). Ainda não gera o `mesa.html`. |

### Arquivos de dados (`dados/`)

- `maps.json`: mapas, com hierarquia (`parentId`), imagem (`image.ref`) e visibilidade (`visible`).
- `locations.json`: locais.
- `characters.json`: personagens de Informações.
- `notebooks.json` e `notes.json`: títulos e anotações.
- `users.json`: usuários e perfis (mestre, jogador, visualizador = Espectador).
- `mesa-de-combate.json`: estado completo da Mesa (combates, NPCs, personagens salvos, condições, rounds e log).

Cada arquivo é um objeto `{ id: documento }`.

## Rodar no computador

A página precisa ser aberta por um servidor HTTP: abrindo o `index.html` direto (`file://`), o navegador bloqueia o carregamento da Mesa de Combate. Qualquer servidor estático serve, por exemplo:

- VS Code: extensão **Live Server**, botão "Go Live".
- Node: `npx serve .`
- Python: `python -m http.server 8000`

Com o `supabase-config.js` preenchido, o site local usa o **mesmo banco de produção**. Para testar sem mexer nos dados reais, esvazie a `url` localmente (sem fazer commit) e a página passa a salvar só no navegador.

## Onde roda

O site fica no GitHub Pages: https://jorius0103.github.io/Hounds/. A página escolhe onde guardar os dados, nesta ordem:

1. **Artifact do claude.ai:** usa o banco de dados e o armazenamento de imagens da plataforma.
2. **Supabase:** quando `supabase-config.js` está preenchido. Dados em tempo real (PostgreSQL + Realtime + Storage): cada mudança aparece na hora para quem altera e em uma fração de segundo nos outros navegadores. Configuração e detalhes da sincronização em [SUPABASE.md](SUPABASE.md).
3. **Firebase:** quando `firebase-config.js` está preenchido. Todos veem os mesmos dados, em tempo real, e o grupo entra com a senha da campanha. Configuração em [FIREBASE.md](FIREBASE.md).
4. **Só o navegador:** sem nenhum dos dois, a página funciona, mas os dados ficam só no navegador de quem usa e começam vazios.

Os arquivos JSON não são carregados automaticamente. Para levá-los ao Supabase, use `tools/importar-supabase.mjs`.

## Funcionalidades

- **Página inicial:** é a primeira página ao abrir o site. Tem atalhos para cada seção, com as contagens, e a lista do que foi atualizado por último. Para voltar a ela, clique na patinha no topo do menu.
- **Usuários:** escolha de usuário ao abrir, com perfis Mestre (administrador de tudo), Jogador e Espectador. Só o Mestre gerencia os usuários.
- **Visibilidade:** fora da Mesa de Combate, quem cria um item (mapa, local, personagem, marcador, título ou anotação) marca se ele fica "Visível para todos". Desmarcado, só o Mestre e quem criou veem, e só os dois podem mudar isso depois. Em mapas, locais e personagens, o Mestre também escolhe quais contas podem ver o item enquanto ele está oculto. Os itens criados antes dessa regra continuam sob controle do Mestre.
- **Informações:** mapas em hierarquia com marcadores, localizações e personagens.
- **Anotações:** títulos com vários arquivos de anotação.
- **Tema claro e escuro:** botão no rodapé do menu. A escolha fica salva em cada navegador. Sem escolha, o site segue o tema do sistema. A Mesa de Combate acompanha.
- **Mesa de Combate:**
  - Escolha ou criação de jogo ao entrar.
  - Personagens salvos e reutilizáveis entre jogos.
  - Botões de copiar e remover que agem no combate atual.
  - Botões "Finalizar Ação" e "Finalizar Round".
  - Log de Combate com PV, FP e condições, navegação por rounds e exclusão de round. A manobra entra no log ao clicar em "Finalizar Ação", e não a cada troca.
  - Botão de sair, que salva e volta para a página inicial. Ao voltar para a Mesa, ela abre na escolha de jogo.

## Segurança

Com o Firebase, só quem sabe a senha da campanha lê ou altera os dados. Dentro do site, porém, quem entrou escolhe qualquer usuário, inclusive o Mestre. Itens que não estão visíveis para todos somem da tela, mas ainda são enviados ao navegador de todo mundo. Não guarde nada sigiloso.

Os arquivos de `dados/` e `imagens/` deste repositório ficam públicos no GitHub Pages, sem senha.
