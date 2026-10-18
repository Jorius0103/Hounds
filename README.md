# Hounds — Hub da campanha GURPS

O código do hub da campanha e uma cópia dos dados. Para trabalhar no código, leia também [CONTRIBUTING.md](CONTRIBUTING.md).

## Pastas

| Caminho | O que é |
|---|---|
| `index.html` | Só o esqueleto da página (menu, áreas de conteúdo, modais) e a lista de CSS e JS carregados, em ordem. |
| `css/` | Estilos, divididos por área. A ordem dos `<link>` no `index.html` importa. |
| `js/` | O código do hub. Base (utilitários, banco, modelo do mundo, rotas, menu, modal), `busca-catalogos.js` (a busca em português nos catálogos de GURPS, com os nomes de `dados/traducoes.json`), `explorer.js`, `editor-texto.js`, `tabuleiro-geo.js` (a geometria dos tabuleiros: grade, linha de visão, paredes e área explorada), `tabuleiro-dados.js` (a rolagem de dados dos tabuleiros e o teste de GURPS), `tabuleiro-janela.js` (as janelas flutuantes do tabuleiro), `tabuleiro-chat.js` (o chat da mesa), `tabuleiro-turnos.js` (a ordem de turno), `tabuleiro-diario.js` (o Diário), `tabuleiro-arte.js` (a biblioteca de arte), `tabuleiro-paginas.js` (a barra de páginas e a fita dos jogadores), a sincronização da Mesa e `app.js`, que inicializa tudo. |
| `js/store/` | Acesso ao banco: API genérica e IndexedDB local (`store.js`), `firebase.js` e `supabase.js`. |
| `js/tabs/` | Uma aba por arquivo: `tab-inicio`, `tab-tabuleiros`, `tab-mapas`, `tab-locais`, `tab-personagens`, `tab-fichas`, `tab-organizacoes`, `tab-eventos`, `tab-magias`, `tab-vantagens`, `tab-desvantagens`, `tab-pericias`, `tab-combate`, `tab-armas`, `tab-armaduras`, `tab-itens`, `tab-melhoramentos`, `tab-anotacoes`, `tab-usuarios`. |
| `mesa.html` | A Mesa de Combate (Dash RPG) compilada. O hub a carrega no iframe por `js/mesa-frame.js`. |
| `dados/` | Cópia dos dados salvos no site, em JSON. |
| `imagens/` | As imagens enviadas (mapas, locais, personagens). O nome do arquivo é o `ref` usado nos dados. |
| `supabase-config.js` | Configuração do banco de dados (Supabase). Veja [SUPABASE.md](SUPABASE.md). |
| `supabase/functions/contas/` | Edge Function com que o Mestre cria contas de login e define senhas pela aba Usuários. Veja [SUPABASE.md](SUPABASE.md). |
| `supabase/migrations/` | Estrutura do banco no Supabase (tabelas, views, funções de gravação, RLS e migração dos dados), em migrations SQL executadas em ordem. Veja [SUPABASE.md](SUPABASE.md). |
| `firebase-config.js` | Configuração do banco de dados (Firebase). Veja [FIREBASE.md](FIREBASE.md). |
| `firestore.rules` | Regras de acesso do banco: só a conta da campanha lê e grava. |
| `types/`, `jsconfig.json` | Tipos dos dados para a checagem do VS Code (não vão para o navegador). Veja [CONTRIBUTING.md](CONTRIBUTING.md). |
| `tools/` | Scripts que importam os JSON e as imagens para o Supabase ou Firebase, `validar-migracao.mjs` (compara os dados antigos com as tabelas do Supabase) e `checar-globais.mjs`, usado na checagem dos PRs. `gurps-traducoes.mjs` lista os nomes dos catálogos de GURPS que ainda não têm tradução em `dados/traducoes.json`. |
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
2. **Supabase:** quando `supabase-config.js` está preenchido. Dados em tabelas relacionais do PostgreSQL e imagens no Storage. Cada mudança aparece na hora para quem altera; nos outros navegadores, as da Mesa de Combate e dos Tabuleiros chegam em uma fração de segundo, pelo Realtime, e as do resto do site ao recarregar a página. Configuração e detalhes da sincronização em [SUPABASE.md](SUPABASE.md).
3. **Firebase:** quando `firebase-config.js` está preenchido. Todos veem os mesmos dados, em tempo real, e o grupo entra com a senha da campanha. Configuração em [FIREBASE.md](FIREBASE.md).
4. **Só o navegador:** sem nenhum dos dois, a página funciona, mas os dados ficam só no navegador de quem usa e começam vazios.

Os arquivos JSON não são carregados automaticamente. Para levá-los ao Supabase, use `tools/importar-supabase.mjs`.

## Funcionalidades

- **Página inicial:** é a primeira página ao abrir o site. Tem atalhos para cada seção, com as contagens, e a lista do que foi atualizado por último. Para voltar a ela, clique na patinha no topo do menu.
- **Usuários:** com o Supabase, login com email e senha (o Mestre cria as contas e define senhas na aba Usuários); sem ele, escolha de usuário ao abrir. Perfis Mestre (administrador de tudo), Admin (Jogador que também gerencia os usuários; não promove nem edita Mestres, mas define a senha deles) e Jogador. Só o Mestre e o Admin gerenciam os usuários.
- **Visibilidade:** fora da Mesa de Combate, quem cria um item (mapa, local, personagem, marcador, título ou anotação) marca se ele fica "Visível para todos". Desmarcado, só o Mestre e quem criou veem, e só os dois podem mudar isso depois. Em mapas, locais e personagens, o Mestre também escolhe quais contas podem ver o item enquanto ele está oculto. Os itens criados antes dessa regra continuam sob controle do Mestre.
- **Informações:** mapas em hierarquia (sem limite de níveis) com marcadores, árvore e filtros de busca; localizações e personagens.
  - Trocar a imagem de um mapa exclui todos os marcadores dele; com marcadores, o formulário pede confirmação antes.
  - **Personagens:** várias organizações e, no máximo, uma ficha (vinculada na página do personagem).
  - **Fichas:** estrutura inicial (nome e observações), para ligar aos personagens. Os campos da ficha entram depois.
  - **Organizações:** membros com cargo e vínculos com locais e mapas.
  - **Eventos:** nome, data em texto livre, local, imagem, descrição e os personagens que participaram.
- **Anotações:** títulos com vários arquivos de anotação.
- **Tema claro e escuro:** botão no rodapé do menu. A escolha fica salva em cada navegador. Sem escolha, o site segue o tema do sistema. A Mesa de Combate acompanha.
- **Mesa de Combate:**
  - Escolha ou criação de jogo ao entrar.
  - Personagens salvos e reutilizáveis entre jogos.
  - Botões de copiar e remover que agem no combate atual.
  - Botões "Finalizar Ação" e "Finalizar Round".
  - Log de Combate com PV, FP e condições, navegação por rounds e exclusão de round. A manobra entra no log ao clicar em "Finalizar Ação", e não a cada troca.
  - Botão de sair, que salva e volta para a página inicial. Ao voltar para a Mesa, ela abre na escolha de jogo.
- **Tabuleiros:** a mesa virtual, no jeito do editor do Roll20, aberta ao mesmo tempo pelo Mestre e pelos jogadores. Ferramentas à esquerda, o mapa no meio (com o zoom à direita e a barra de páginas por cima) e a barra lateral à direita, com **Chat**, **Arte** (do Mestre), **Diário** e **Ajustes**. Rolador de dados, ordem de turno, personagens e anotações abrem em janelas que se arrastam por cima do mapa.
  - Imagem do mapa (enviada ou copiada de um mapa do Mundo) ou fundo liso. Grade de hexágonos (em fileiras ou em colunas), de quadrados ou nenhuma, com tamanho, posição, cor e escala (1 hexágono = 1 jd). A ferramenta **Grade** alinha a grade com a desenhada na imagem: basta arrastar por cima de uma célula.
  - Tokens com imagem (a própria ou a de um personagem do Mundo), tamanho em células, cor, PV, PF e as contas que os controlam. O Mestre mexe em todos; o jogador move e gira os tokens que controla e muda os PV, os PF e os marcadores deles. Ao arrastar, aparece a distância; as setas do teclado andam uma célula.
  - O token selecionado mostra por cima as bolhas de **PV** e **PF** (um clique e um número, ou +3 / -5) e, por baixo, os botões: **marcadores de estado** (atordoado, caído, inconsciente, sangrando, envenenado, agarrado, em chamas, escondido, concentrando, defesa total, lento, amedrontado, abençoado, morto), **ordem de turno**, o personagem, as configurações e mais. Um clique com o botão direito num token, num desenho ou no mapa abre o mesmo num menu (camada, duplicar, girar, excluir, novo token aqui, apontar aqui).
  - Rotação de 360°: uma seta na borda mostra para onde o token está virado. Para girar, arraste a alça do token selecionado (com Shift, de face em face da grade: de 60° em 60° nos hexágonos, de 45° em 45° nos quadrados), use Q e E (15° por vez; com Shift, de face em face) ou o menu do botão direito. A visão continua valendo para todos os lados.
  - Camadas, no pé da barra de ferramentas: **Tokens**, **Mestre** (só o Mestre vê), **Mapa** (faz parte do mapa, abaixo da grade), **Frente** (primeiro plano: copas de árvores e telhados por cima dos tokens, cortados pela escuridão; o Mestre os vê transparentes) e **Luz** (a ferramenta das paredes). As imagens das camadas Mapa e Frente ficam com as proporções delas.
  - **Luz dinâmica:** cada jogador vê só o que os próprios tokens enxergam. Paredes e portas fechadas barram a visão e o caminho dos tokens dos jogadores; o Mestre abre e fecha as portas com um clique. A luz vem do dia (opção do tabuleiro), dos tokens (luz forte e fraca, como uma tocha; um token com luz na camada Mestre é uma fonte de luz escondida) ou da visão no escuro de cada token. Com o **modo explorador**, o que o grupo já viu continua no mapa, escurecido e sem os tokens.
  - **Névoa manual:** os jogadores veem só as áreas que o Mestre revelar.
  - **Ver como** (Ajustes, ou o menu ≡): o Mestre vê o tabuleiro como os jogadores, ou como um jogador só, com a luz e a névoa dele (o `?viewas=` do Roll20).
  - Barra de ferramentas, com o nome e o atalho de cada uma ao passar o mouse e as opções da ferramenta numa caixa ao lado:
    - **Menu** (≡): sair, páginas, configurar a página, novo token, ver como jogador, a barra lateral e os atalhos.
    - **Selecionar** (V) e **Mover a vista** (H; ou arraste com o botão direito, ou com a barra de espaço apertada).
    - **Desenhar** (D): à mão livre, linha, retângulo e elipse, com a cor do traço, o preenchimento e a espessura. Shift deixa a linha de 15° em 15°, o retângulo quadrado e a elipse redonda. Os desenhos ficam salvos no tabuleiro; para mover ou apagar um, use Selecionar (Delete apaga).
    - **Texto** (T): clique no mapa e escreva, com cor, fundo, fonte, tamanho, negrito e itálico. Clicar num texto com a ferramenta muda o que ele diz.
    - **Medir** (R): linha, raio (explosão) ou cone; encaixe no centro ou no canto da célula, ou sem encaixe; a régua some ao soltar ou fica 5 s; destaca as células alcançadas e, com o Supabase, aparece para os outros, com o nome de quem mede.
    - **Rolador de dados** (X): a janela do Roll20, com **Todos**, **Mestre** (você e o Mestre) e **Secreto** (só o Mestre vê o resultado), a tabela do d4 ao d100 e dos dados Fudge, de 1 a 6 dados por clique, e a rolagem avançada (`3d6+2`, `2d10-1`, `4dF`, `2d+1` de GURPS), com o NH (um 3d6 vira um teste de GURPS, com a margem e os críticos, B348), um rótulo e dados que explodem. As rolagens vão para o chat.
    - **Ordem de turno** (O): veja abaixo.
    - **Apontar** (P): um sinal no mapa que todos veem (com o Supabase).
    - Para o Mestre: **Névoa** (F), **Paredes, portas e luz** (W) e **Alinhar a grade** (G).
  - **Chat:** um só para todos os tabuleiros, com as 500 mensagens mais novas. Escreva e aperte Enter; o campo **Como** fala com o nome da conta ou de um personagem (o Mestre, de qualquer um; o jogador, dos personagens dos tokens que controla e dos que criou). Comandos: `/r 3d6+2` rola, `/r 3d6 vs 12 Furtividade` testa contra o NH, `/gr` rola só para você e o Mestre, `/w Ana texto` sussurra (`/w gm`, ao Mestre), `/em` é uma ação, `/desc` a descrição do Mestre, `/ooc` fala fora do personagem, `[[2d6+1]]` rola no meio do texto e `/?` mostra a lista. Com o Supabase, **o banco rola os dados** (ninguém muda o resultado no navegador) e cada um só recebe o que pode ler: um sussurro entre dois jogadores o Mestre não lê, como no Roll20. Com o chat fechado, as mensagens novas aparecem num cartão sobre o mapa e no número da aba. O Mestre apaga uma mensagem ou o chat inteiro (Ajustes).
  - **Ordem de turno:** uma por tabuleiro, numa janela, como a Turn Order do Roll20. Botão direito num token → **Adicionar ao turno** (ou Ctrl+U); um personagem com ficha entra com a Velocidade Básica dela. O Mestre passa o turno (→ e ←, com a contagem das rodadas), ordena do maior para o menor, põe itens avulsos (o fim da rodada, um efeito) e limpa; aberta por ele, os jogadores também a veem. O token da vez brilha no mapa e o dono dele é avisado. O jogador põe, muda o valor e tira só os tokens que controla.
  - **Diário:** os personagens e as anotações do hub (o que cada um pode ver). Um personagem abre numa janela com o retrato, os atributos da ficha (um clique rola 3d6 contra o valor no chat, em nome dele; o dano GdP e GeB rola os dados) e a descrição; arrastado para o mapa, vira um token com a imagem, o nome, os PV e os PF da ficha. Uma anotação abre numa janela. O Mestre pode **mostrar a todos** um personagem, uma anotação ou uma imagem: ela abre na tela de quem pode vê-la.
  - **Arte** (o Mestre): a biblioteca de imagens para tokens e cenários (envie pelo botão ou solte arquivos na aba ou no mapa) e as imagens que o Mundo já tem (personagens, mapas, locais, organizações). Arraste para o mapa: um token de uma célula; com Alt, a imagem no tamanho dela, na camada Mapa.
  - **Páginas** (o Mestre, no alto do mapa): os tabuleiros em miniatura, na ordem que ele arrastar, com quem está em cada um. A **fita** leva os jogadores para outro tabuleiro (um tabuleiro oculto é revelado a eles antes), e um jogador pode ficar num tabuleiro diferente do grupo. Quem está com um tabuleiro aberto vai junto; a lista de Tabuleiros mostra onde o grupo está.
  - Quem está na mesa aparece no canto do mapa (com o Supabase).
  - O jogador desenha e escreve na camada dos tokens e só apaga os próprios desenhos; o Mestre desenha na camada em edição e apaga qualquer um.
  - O Mestre vê tudo, sob uma escuridão mais fraca que a dos jogadores.
  - Um tabuleiro novo fica oculto até o Mestre revelar (no formulário, no aviso no alto do mapa ou ao levar os jogadores para ele).
  - O Mestre exclui um tabuleiro, com os tokens, os desenhos e a ordem de turno dele, pelo menu ≡ (**Excluir este tabuleiro**), pelos Ajustes, pela lixeira de cada página na barra de páginas ou em Configurar. O site pergunta antes; as mensagens do chat ficam.

## Segurança

Com o Firebase, só quem sabe a senha da campanha lê ou altera os dados. Com o Supabase, cada pessoa entra com email e senha, e o próprio banco garante as permissões de Mestre e de Jogador (veja "Login e permissões" no [SUPABASE.md](SUPABASE.md)). Com o Firebase ou só no navegador, porém, quem entra escolhe qualquer usuário, inclusive o Mestre. Em todos os casos, itens que não estão visíveis para todos somem da tela, mas ainda são enviados ao navegador de quem entrou. Não guarde nada sigiloso.

Os arquivos de `dados/` e `imagens/` deste repositório ficam públicos no GitHub Pages, sem senha.
