# Diferenças entre o mesa.html no ar e o src/

Lista de trabalho da Etapa 3 do [roteiro](https://claude.ai/artifact/VkxXwB1TKUeAMVV1ugEnD3): o que o `mesa.html` que está no ar tem e o `dist/mesa.html` gerado pelo `src/` não tem, e o contrário. A etapa acaba quando os dois se comportam igual e `node tools/comparar-mesa.mjs` não acusa mais diferença de texto, classe ou integração.

Levantada em 31/10/2026, comparando o `mesa.html` do commit `9be607b` com o build do mesmo commit.

## O que a comparação mostrou

O `src/` nunca foi a fonte do `mesa.html`: os dois são versões irmãs desde o começo. Boa parte do que só existe no ar veio do primeiro upload (`e62c5c7`, 05/10), e o `src/` entrou quatro dias depois (`9bb2f5e`, 09/10, trazido do AI Studio). Desde então, o `mesa.html` foi remendado à mão, muitas vezes pelos scripts `tools/*.py` de 21 e 22/10, e o `src/` recebeu outras mudanças em paralelo.

| Medida | Só no ar | Só no gerado |
| --- | --- | --- |
| Textos de tela | 163 (mais 31 que existem no `src/` mas não entram no build) | 378 |
| Classes no CSS | 97 | 319 |
| Uso de `window.audioStreamSync` do hub | 21 | 0 |

As funções internas do `mesa.html` (`hubConfirm`, `hubDelGet` e outras) não entram na conta do comparador, porque o build as renomeia. A comparação enxerga textos, classes e chamadas. Diferença só de lógica, sem texto novo, não aparece: cada item abaixo precisa ser conferido no código dos dois lados ao ser levado.

## Decisões antes de levar os itens

Decididas em 31/10/2026:

- [x] **Mapa tático e Visão Dividida** (só no `src/`, item S1): ficam no código, escondidos. Os botões não aparecem, e a Mesa no ar continua como hoje.
- [x] **Áudio** (itens 18 e S2): a Mesa usa o `window.audioStreamSync` do hub, como no ar; a cópia `src/utils/audioStreamSync.ts` sai.
- [x] **Retratos e backups** (itens 7 e S3): fica a versão do ar, mais o backup automático antes de restaurar, que só o `src/` tem.
- [x] **Textos que divergem** (catálogos de armas, armaduras e magias, mensagens): vale o texto do ar.

Regra para funcionalidade, definida no lote 3: vários commits escreveram a versão completa de um recurso no `src/` e uma versão simplificada no remendo do `mesa.html` (por exemplo, `cb5c22a`, `76942e5` e `87858b4`). Nesses casos fica o recurso do `src/`, que é o que o autor quis e não tira nada do que está no ar; texto e visual seguem os do ar.

Código morto no ar não é levado: recursos que o `mesa.html` declara mas nunca exibe ou chama (o CSS do dado 3D, a lista embutida de 16 magias, o modal de regra por local de armadura, o rótulo "Todos os rounds" do log, o `hubMesaFlush`).

## Só no ar: levar para o src/

Tamanho: pequeno é um componente e menos de uma hora; médio, vários arquivos ou lógica nova; grande, uma tela ou fluxo inteiro.

| # | O que é | Commit de origem | Onde entra no `src/` | Tamanho | Feito |
| --- | --- | --- | --- | --- | --- |
| 1 | Diálogos próprios `hubDialog`, `hubConfirm` e `hubAlert` no lugar de `confirm`/`alert` do navegador. No `src/`, as confirmações maiores já usam o `ConfirmModal`; sobravam 8 chamadas nativas, agora em `src/utils/hubDialog.ts` (as de `audioStreamSync.ts` saem com o item 18) | `e62c5c7` | `src/utils/hubDialog.ts`, `App.tsx`, `AvatarPickerModal.tsx`, `CombatManagerModal.tsx`, `PlayerPermissionsModal.tsx` | médio | [x] |
| 2 | Lista de combates excluídos (chave `gurps_combat_master_deleted_v1`), enviada em toda sincronização. A mesclagem passou a juntar as listas, como no ar: antes, no `src/`, um combate que não viesse na lista recebida sumia, e um cliente desatualizado podia apagar combates dos outros | `9863f6a` | `App.tsx` (`mergeCombats`, `broadcastSync`, `handleDeleteCombat`), `onlineSync.ts` | médio | [x] |
| 3 | Janela "Jogos salvos" (`HubPick`): é código morto no ar desde o `250ed6b` ("remoção da tela inicial HubPick"). O componente continua definido, mas nunca é renderizado, e o estado que o abriria nunca vira verdadeiro. Não foi levado | `e62c5c7`, `250ed6b` | — | — | [x] |
| 4 | Janela "Personagens na Mesa" (`HubAddP`): o `src/` tinha o equivalente (`CombatPlayersModal`), mas nada o abria. Agora o botão "Cadastrar Personagem" do estado vazio da Mesa abre essa lista, como no ar (antes, criava um personagem novo direto). O modal ganhou a exclusão permanente com confirmação na linha ("Excluir X de vez?"), a mensagem "Nenhum personagem cadastrado ainda." e os textos do ar; "+ Criar novo personagem" cria e fecha | `e62c5c7`, `7b8f550`, `0785de3` (30/10) | `CombatPlayersModal.tsx`, `App.tsx` | médio | [x] |
| 5 | Modo Sem Combate. No ar, "Sem combate" é uma entrada fixa da lista de combates; no `src/`, é a ausência de combate ativo (o `src/` descarta essa entrada ao carregar, e o `TopNav` também a ignora). O `f49eadb` (28/10) refez isso no `src/` (zero combates, modo sessão livre) e pôs um remendo de 8 linhas no ar: ficou o modelo do `src/`. O título "Não é possível adicionar NPCs no modo Sem Combate" do ar é código morto (o botão só aparece fora desse modo) | `e62c5c7`, `c7786f5`, `f49eadb` | — | médio | [x] |
| 6 | Ligações com o hub: a Mesa acompanha a troca de usuário (evento `hub:user`, mensagem `HUB_USER_UPDATE` e `hounds_active_user`) e a mudança de editores em outra aba; "Contas de usuário" abre a aba Usuários do hub. O `hubMesaFlush` do ar fica no `onSwitchUser`, que o `TopNav` não usa: código morto, não levado | `e62c5c7` | `App.tsx` | pequeno | [x] |
| 7 | Retratos e backups: o modal passou a usar a chave do ar (`hounds_mesa_snapshots_v1`; o `src/` usava outra e não veria os retratos já salvos), junta sempre os retratos locais com os de `dados/retratos-mesa.json`, acompanha outras abas, transmite a lista para todos ao salvar, captura combates, personagens, condições, excluídos e editores, exporta com o cabeçalho do ar e importa os três formatos do ar e os dois do `src/`. Ficou o backup automático do `src/` (um retrato na lista, antes de restaurar). O retrato agora sai com os NPCs dos combates inativos (o `App` passa os combates completos do `combatsPoolRef`; no ar, eles podiam ficar de fora) | `7fd2b42`, `5ba69bf`, `f977988` | `CombatManagerModal.tsx`, `App.tsx` | grande | [x] |
| 8 | Entrada e cadastro de usuário: "Mesa de Combate" e "Escolha seu usuário para entrar" no login, "Jogador (Vê só NPCs liberados)" no cadastro. O tipo de conta "Visualizador" do ar não foi levado: no `src/`, quem só assiste é o jogador sem permissão de edição (`MesaRole`), e dentro do hub as contas ficam na aba Usuários dele (item 6) | `e62c5c7` | `LoginModal.tsx`, `UserAccountsCrudModal.tsx` | pequeno | [x] |
| 9 | Cards da tela inicial: grade `combat-home-grid`, nome menor com o jogador na linha de baixo, PV/FP no formato do ar, linha de atributos (ST, DX, IQ, HT, Per, Will, Spd, Move), um bloco por arma favorita, observações gerais e do Mestre separadas e colunas equilibradas pela altura estimada de cada bloco. Conferido lado a lado no navegador. Ficaram do `src/`: o nome e a presença do jogador pelo `userId` e a barra de FP certa (a do ar usa `fpMax/fpMax` e fica sempre cheia). No gerado, a linha de atributos quebra quando não cabe (no ar, "Move 6 (-1 Peso)" passa da borda), e Per, Will e a nota do Mestre aparecem com as cores pretendidas, que no ar faltavam no CSS | `961ae57`, `cb5c22a`, `7d0d442`, `655ae87`, `0b91e5b`, `87f3cb8` | `CombatHomeScreen.tsx`, `NpcListBar.tsx` | grande | [x] |
| 10 | Rodadas: o `src/` já tinha tudo (separadores e filtro de rodada no log, expiração de magias e condições). Mudaram para os do ar o controle de rodada ("−", "RODADA N", "+", títulos "Diminuir Rodada"/"Avançar Rodada"), o título de "Passar o dia" e o "Duração: NR" das condições. O selo de magia ativa do `src/` ("⏳ 3R (2 restantes)") ficou: é mais completo e saiu do mesmo commit que o do ar | `fd13ae6`, `76942e5` | `NpcListBar.tsx`, `NpcDetailView.tsx` | médio | [x] |
| 11 | Ordem do Mestre: já existia no `src/`, com a sincronização ao vivo (`SYNC_MASTER_ORDER`). Só os textos mudaram para os do ar: "⚡ Speed", "👑 Mestre", "✓ Ordem Salva!", "Salvar esta ordem para todos os usuários" | `4769371`, `2fde4c4` | `NpcListBar.tsx` | pequeno | [x] |
| 12 | Paginação do log: já existia no `src/`; os botões passaram a "« Ant." e "Próx. »", como no ar | `7b8f550` | `GeneralCombatLog.tsx` | pequeno | [x] |
| 13 | Magias: o Grimório ganhou o visual do ar (cabeçalho com subtítulo, faixa de busca, rodapé fixo; primeiro uso de `src/components/modalStyles.ts`, do item 22) e os textos do ar; o cadastro de magia avulsa e a janela de informações também. A lista embutida de 16 magias do ar é código morto e não foi levada | `e62c5c7`, `840f53f`, `c7693c4` | `SpellsModal.tsx`, `SingleSpellModal.tsx`, `NpcDetailView.tsx`, `modalStyles.ts` | médio | [x] |
| 14 | Magia em área e lançamento manual: o `src/` já tinha, e mais completo (escolha do grimório, alvo, custo). O ar tem uma versão simplificada do mesmo commit (`cb5c22a`); ficou a do `src/` | `2fe323b`, `cb5c22a` | — | médio | [x] |
| 15 | Catálogo de armaduras com a RD na descrição ("Armadura leve de placas de aço (RD 3).") e os nomes do ar (5 diferiam, como "Heavy Segmented Plate") | `f48a947` (28/10) | `src/utils/armorCatalog.ts` | pequeno | [x] |
| 16 | Partes do corpo e dano limitado ao PV do membro: a regra de cálculo é a mesma nos dois lados (o `src/` ainda aceita multiplicador personalizado). Mudaram para os do ar a descrição gravada no log ("Dano na Parte … Final no Personagem …"), os rótulos do resumo da calculadora, a regra aplicada e os tooltips da tabela e dos cards. O cálculo por parte usa os campos da entrada, não a descrição, então o histórico já salvo continua valendo. O modal "Cadastrar Regra Específica" por local de armadura é código morto no ar (nada o abre) | `f196c81`, `87858b4` | `DamageCalculatorModal.tsx`, `NpcDetailView.tsx`, `CombatHomeScreen.tsx`, `src/utils/gurps.ts` | médio | [x] |
| 17 | Catálogo de armas de reserva (usado quando `dados/armas.json` não carrega): nomes e notas do ar nas 12 armas, como "Machadinha de Arremesso (Small Axe)". As notas do `src/` traziam página do livro e ST, que o ar não mostra | `e62c5c7` | `WeaponModal.tsx` | pequeno | [x] |
| 18 | Áudio pelo hub: `src/utils/hubAudio.ts` repassa as chamadas ao `window.audioStreamSync` (o script do hub carregado no `<head>`) e não faz nada se ele faltar. A cópia `src/utils/audioStreamSync.ts` saiu. O bloco de áudio do `TopNav` segue o do ar: "▶ Ouvir Trilha" só quando o navegador bloqueou a reprodução, e um selo com quem transmite | `89d576a`, `cb36cd2` | `src/utils/hubAudio.ts`, `TopNav.tsx`, `App.tsx` | médio | [x] |
| 19 | Escolha de avatar: "Selecione um token pré-definido ou insira URL personalizada". Faz parte do cabeçalho novo dos modais: passou para o item 22 | `0c0ba70` | `AvatarPickerModal.tsx` | — | → 22 |
| 20 | Condições: contador "condição cadastrada"/"condições cadastradas" no rodapé fixo. O modal inteiro foi remodelado no ar: passou para o item 22 | `903d626` | `ConditionsCrudModal.tsx` | — | → 22 |
| 21 | Excluir registro do log com três opções: restaurar os valores, "Confirmar sem Registrar" ou cancelar. Já existia no `src/` (`ConfirmModal` do `CombatLogCard.tsx`); nada a levar. No ar, o `hubConfirm3` está declarado duas vezes e vale a segunda versão, sem cabeçalho | `f0b3a54` | `CombatLogCard.tsx` | pequeno | [x] |
| 22 | Barra superior e modais remendados entre 22 e 25/10. Barra: marca removida, espaçamento, filtros. Modais: o mesmo fundo e a mesma caixa (largura própria de cada um) em 12 modais — Grimório de Magias, as duas regras de parte do corpo, Lançar Dano / Fadiga, Foto / Token, Configurações da Mesa, Condições, Controle de Acesso, Login, Armas, Sincronização Online e Log do Sistema —, cabeçalho novo em vários deles e os modais de "Passar o dia", permissões e condições refeitos. Inclui os itens 19 e 20 | `b77d0a9`, `709ff83`, `9f7327e`, `136cab4`, `17176cf`, `23481f6`, `c16d08c`, `903d626`, `0c0ba70` | `TopNav.tsx`, `NpcListBar.tsx` e os modais | grande | [x] |

Como ficou o item 22: os modais usam `src/components/modalStyles.ts` (fundo, caixa, rodapé) e `src/components/ModalHeader.tsx` (cabeçalho em três tamanhos, os do ar). Ganharam o visual do ar: Grimório, Foto / Token, Contas de usuário, Sala Online, Log do Sistema, Login, regra da parte do corpo, Lançar Dano / Fadiga (fecha com Esc e com clique fora) e Condições (com o rodapé "N condições cadastradas (X ativas no NPC)"). Combates, Jogadores, Passar o Dia, Permissões, Magia avulsa e Armas já estavam iguais no `src/`. Onde o patch do ar deixou o `p-6` junto com o cabeçalho novo (o que recuava a faixa para dentro da caixa), o cabeçalho ficou de ponta a ponta, como no Grimório. Na barra superior, o "Gerenciar Combates" do ar existe mas nunca aparece (falta o CSS de `sm:flex`); no gerado ele aparece só em telas de 1536 px ou mais, e a roldana ao lado do seletor abre a mesma tela.
| 23 | CSS escrito à mão: `color-scheme: dark`, grade da tela inicial (`combat-home-grid`, `combat-home-subgrid-2/3`) e os tons fixos de borda e `text-[15px]`. O CSS do dado 3D (`dice-face`, `face-1` a `face-6`, `diceRollAnim`) não foi levado: nada no ar o usa | `f6ec6c5`, `9b9f57f` | `src/index.css` | médio | [x] |
| 25 | Sincronização pelo hub, achada no item 7: no ar, o cliente MQTT é trocado por um adaptador (`jx`) que usa o `window.parent.hubMesaBus` do hub (que vai pelo Supabase); os brokers públicos da lista nunca são contatados. O `src/` conectava de verdade ao `broker.emqx.io`. Agora `src/utils/hubBus.ts` faz o papel do adaptador, o `onlineSync.ts` não importa mais o `mqtt` (o build caiu de 1,38 MB para 1,05 MB) e o watchdog não derruba a conexão por silêncio, porque quem a mantém é o hub. A dependência `mqtt` ficou no `package.json`, sem uso | `e62c5c7` | `src/utils/hubBus.ts`, `src/utils/onlineSync.ts` | médio | [x] |
| 24 | Conferência final: alinhados os títulos e mensagens que ainda divergiam (kits de armadura, "✓ Equipar em", anotação do log, permissões e exclusão de personagem, barra superior, favoritos vazios na calculadora, "Nenhum combatente encontrado", remoção de NPC e o registro de sincronização). O que o comparador ainda acusa está explicado abaixo | — | vários | pequeno | [x] |

### O que o comparador ainda acusa, e por quê

No fim da Etapa 3, `node tools/comparar-mesa.mjs` acusa 66 textos só no ar e 18 que existem no `src/` mas não entram no build. Nenhum é funcionalidade faltando:

| Grupo | Exemplos | Por que fica |
| --- | --- | --- |
| Código morto no ar | janela "Jogos salvos" (`HubPick`, com "· último usado"), lista de 16 magias, modal "Cadastrar Regra Específica", primeira versão do `hubConfirm3` ("Confirmar Ação na Mesa"), `HubEvent` ("NPC adicionado ao jogo", "Personagem removido do jogo"), "Todos os rounds", "Não é possível adicionar NPCs no modo Sem Combate", recarregar a página depois de restaurar | o ar declara, mas nunca mostra nem chama |
| Recurso mais completo no `src/` | "Confirmar Magia Ativa", "Nome da Magia (ex: Escudo)", "⚠️ Expirou na R", selo "Turno" no log, busca em "Nenhum jogador encontrado", confirmação de remoção que trata personagem e NPC | regra do lote 3 |
| Mesmo conteúdo, montado de outro jeito | "LOG DE COMBATE" (o `src/` usa CSS em maiúsculas), confirmações do ar que viraram `ConfirmModal`, estilos inline (`1px solid rgba(...)`) | só a forma mudou |
| Decisão registrada | "Visualizador (Somente visualização…)" (item 8), descrição do "Sem combate" (item 5), "MQTT connection error with broker" (item 25) | itens citados |
| Biblioteca | "abort auxClick…", "@@toPrimitive…" | versões diferentes do React |

As 95 classes CSS só no ar são, em sua maioria, as do dado 3D (código morto) e as que os modais trocaram por estilos inline (item 22). A dependência `mqtt` continua no `package.json`, sem uso desde o item 25.

Os scripts `tools/*.py` mostram o que foi remendado no `mesa.html` e em que ordem, e ajudam a achar o trecho certo em cada item.

## Só no src/: decidir antes de gerar o mesa.html

Gerar o `mesa.html` pelo `src/` coloca isto no ar:

| # | O que é | Onde está | Decisão |
| --- | --- | --- | --- |
| S1 | Mapa tático (grid hexagonal, tokens, névoa de guerra, régua, mapas de Ludgrim e Tagmar) e os modos Mesa Tática e Visão Dividida | `src/components/TacticalMap/`, `src/types/tactical.ts`, `TopNav.tsx`, `App.tsx` | escondido: `TACTICAL_MAP_ENABLED = false` no `App.tsx` |
| S2 | Cópia própria do áudio, com transmissão pela aba e nome da música | `src/utils/audioStreamSync.ts`, `TopNav.tsx` | removida no item 18 |
| S3 | Retratos da versão do `src/`: backup automático antes de restaurar, renomear e excluir | `CombatManagerModal.tsx` | juntado à versão do ar no item 7 |
| S4 | Botão "Passar o dia" na barra de NPCs | `NpcListBar.tsx` | engano do levantamento: existe no ar também (item 10) |
| S5 | Log do sistema ("Limpar Logs do Sistema") | `SystemLogModal.tsx`, `src/utils/systemLogger.ts` | engano do levantamento: o ar tem o mesmo modal ("Log do Sistema & Debug de Sincronização", item 22); só o botão de limpar é do `src/`, e fica |
| S6 | Correção da Etapa 1: o alerta de membro inutilizado mostra o nome da parte. No ar aparece "undefined: Inutilizado" | `CombatHomeScreen.tsx` | manter |

## Como conferir

```powershell
npm run build:mesa
node tools/comparar-mesa.mjs --json comparacao.json
```

O resumo mostra quantos textos, classes e chamadas ainda diferem; o JSON lista cada um. Os números de partida estão na tabela do início.

| Medida | Início (31/10) | Fim da Etapa 3 |
| --- | --- | --- |
| Textos só no ar que faltam no `src/` | 163 | 66 (todos explicados acima) |
| Textos no `src/` fora do build | 31 | 18 |
| Tamanho do `dist/mesa.html` | 1,39 MB | 1,05 MB (o `mesa.html` no ar tem 1,1 MB) |
