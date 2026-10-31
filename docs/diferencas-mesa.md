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
| 3 | Janela "Jogos salvos" (`HubPick`): começar um combate novo ou continuar um salvo, "Criar e abrir combate", "Os participantes são adicionados depois, na Mesa", excluir combate "de vez" | `e62c5c7` | nova tela ou `CombatManagerModal.tsx` | grande | [ ] |
| 4 | Janela "Personagens na Mesa" (`HubAddP`): adicionar e remover personagens do jogo, busca, "+ Criar novo personagem", "Excluir personagem permanentemente" | `e62c5c7`, `7b8f550`, `0785de3` (30/10) | `CombatPlayersModal.tsx` | grande | [ ] |
| 5 | Modo Sem Combate. No ar, "Sem combate" é uma entrada fixa da lista de combates; no `src/`, é a ausência de combate ativo (o `src/` descarta essa entrada ao carregar, e o `TopNav` também a ignora). O `f49eadb` (28/10) refez isso no `src/` (zero combates, modo sessão livre) e pôs um remendo de 8 linhas no ar: ficou o modelo do `src/`. O título "Não é possível adicionar NPCs no modo Sem Combate" do ar é código morto (o botão só aparece fora desse modo) | `e62c5c7`, `c7786f5`, `f49eadb` | — | médio | [x] |
| 6 | Ligações com o hub: a Mesa acompanha a troca de usuário (evento `hub:user`, mensagem `HUB_USER_UPDATE` e `hounds_active_user`) e a mudança de editores em outra aba; "Contas de usuário" abre a aba Usuários do hub. O `hubMesaFlush` do ar fica no `onSwitchUser`, que o `TopNav` não usa: código morto, não levado | `e62c5c7` | `App.tsx` | pequeno | [x] |
| 7 | Retratos e backups da versão no ar: importar arquivo JSON, "Arquivo corrompido", "Formato não reconhecido", retratos de `dados/retratos-mesa.json`, restaurar e transmitir para todos (depende da decisão) | `7fd2b42`, `5ba69bf`, `f977988` | `CombatManagerModal.tsx`, `App.tsx` | grande | [ ] |
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
| 22 | Barra superior e modais remendados entre 22 e 25/10. Barra: marca removida, espaçamento, filtros. Modais: o mesmo fundo e a mesma caixa (largura própria de cada um) em 12 modais — Grimório de Magias, as duas regras de parte do corpo, Lançar Dano / Fadiga, Foto / Token, Configurações da Mesa, Condições, Controle de Acesso, Login, Armas, Sincronização Online e Log do Sistema —, cabeçalho novo em vários deles e os modais de "Passar o dia", permissões e condições refeitos. Inclui os itens 19 e 20 | `b77d0a9`, `709ff83`, `9f7327e`, `136cab4`, `17176cf`, `23481f6`, `c16d08c`, `903d626`, `0c0ba70` | `TopNav.tsx`, `NpcListBar.tsx` e os modais | grande | [ ] |
| 23 | CSS escrito à mão: `color-scheme: dark`, grade da tela inicial (`combat-home-grid`, `combat-home-subgrid-2/3`) e os tons fixos de borda e `text-[15px]`. O CSS do dado 3D (`dice-face`, `face-1` a `face-6`, `diceRollAnim`) não foi levado: nada no ar o usa | `f6ec6c5`, `9b9f57f` | `src/index.css` | médio | [x] |
| 24 | Sobras: as 97 classes do CSS que só existem no ar e os 31 textos que existem no `src/` mas não entram no build. A maioria some com os itens acima; conferir no fim com `tools/comparar-mesa.mjs` | — | vários | pequeno | [ ] |

Os scripts `tools/*.py` mostram o que foi remendado no `mesa.html` e em que ordem, e ajudam a achar o trecho certo em cada item.

## Só no src/: decidir antes de gerar o mesa.html

Gerar o `mesa.html` pelo `src/` coloca isto no ar:

| # | O que é | Onde está | Decisão |
| --- | --- | --- | --- |
| S1 | Mapa tático (grid hexagonal, tokens, névoa de guerra, régua, mapas de Ludgrim e Tagmar) e os modos Mesa Tática e Visão Dividida | `src/components/TacticalMap/`, `src/types/tactical.ts`, `TopNav.tsx`, `App.tsx` | escondido: `TACTICAL_MAP_ENABLED = false` no `App.tsx` |
| S2 | Cópia própria do áudio, com transmissão pela aba e nome da música | `src/utils/audioStreamSync.ts`, `TopNav.tsx` | removida no item 18 |
| S3 | Retratos da versão do `src/`: backup automático antes de restaurar, renomear e excluir | `CombatManagerModal.tsx` | [ ] |
| S4 | Botão "Passar o dia" na barra de NPCs | `NpcListBar.tsx` | engano do levantamento: existe no ar também (item 10) |
| S5 | Log do sistema ("Limpar Logs do Sistema") | `SystemLogModal.tsx`, `src/utils/systemLogger.ts` | [ ] |
| S6 | Correção da Etapa 1: o alerta de membro inutilizado mostra o nome da parte. No ar aparece "undefined: Inutilizado" | `CombatHomeScreen.tsx` | manter |

## Como conferir

```powershell
npm run build:mesa
node tools/comparar-mesa.mjs --json comparacao.json
```

O resumo mostra quantos textos, classes e chamadas ainda diferem; o JSON lista cada um. Os números de partida estão na tabela do início.
