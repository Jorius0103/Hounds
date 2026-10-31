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

## Só no ar: levar para o src/

Tamanho: pequeno é um componente e menos de uma hora; médio, vários arquivos ou lógica nova; grande, uma tela ou fluxo inteiro.

| # | O que é | Commit de origem | Onde entra no `src/` | Tamanho | Feito |
| --- | --- | --- | --- | --- | --- |
| 1 | Diálogos próprios `hubDialog`, `hubConfirm` e `hubAlert` no lugar de `confirm`/`alert` do navegador. No `src/`, as confirmações maiores já usam o `ConfirmModal`; sobravam 8 chamadas nativas, agora em `src/utils/hubDialog.ts` (as de `audioStreamSync.ts` saem com o item 18) | `e62c5c7` | `src/utils/hubDialog.ts`, `App.tsx`, `AvatarPickerModal.tsx`, `CombatManagerModal.tsx`, `PlayerPermissionsModal.tsx` | médio | [x] |
| 2 | Lista de combates excluídos (chave `gurps_combat_master_deleted_v1`), enviada em toda sincronização. A mesclagem passou a juntar as listas, como no ar: antes, no `src/`, um combate que não viesse na lista recebida sumia, e um cliente desatualizado podia apagar combates dos outros | `9863f6a` | `App.tsx` (`mergeCombats`, `broadcastSync`, `handleDeleteCombat`), `onlineSync.ts` | médio | [x] |
| 3 | Janela "Jogos salvos" (`HubPick`): começar um combate novo ou continuar um salvo, "Criar e abrir combate", "Os participantes são adicionados depois, na Mesa", excluir combate "de vez" | `e62c5c7` | nova tela ou `CombatManagerModal.tsx` | grande | [ ] |
| 4 | Janela "Personagens na Mesa" (`HubAddP`): adicionar e remover personagens do jogo, busca, "+ Criar novo personagem", "Excluir personagem permanentemente" | `e62c5c7`, `7b8f550`, `0785de3` (30/10) | `CombatPlayersModal.tsx` | grande | [ ] |
| 5 | Modo Sem Combate (`combat-vazio`): "Não é possível adicionar NPCs no modo Sem Combate", "Nenhum NPC neste combate. Exibe apenas os personagens." | `e62c5c7`, `c7786f5` | `App.tsx`, `NpcListBar.tsx` | médio | [ ] |
| 6 | Ligações com o hub: a Mesa acompanha a troca de usuário (evento `hub:user`, mensagem `HUB_USER_UPDATE` e `hounds_active_user`) e a mudança de editores em outra aba; "Contas de usuário" abre a aba Usuários do hub. O `hubMesaFlush` do ar fica no `onSwitchUser`, que o `TopNav` não usa: código morto, não levado | `e62c5c7` | `App.tsx` | pequeno | [x] |
| 7 | Retratos e backups da versão no ar: importar arquivo JSON, "Arquivo corrompido", "Formato não reconhecido", retratos de `dados/retratos-mesa.json`, restaurar e transmitir para todos (depende da decisão) | `7fd2b42`, `5ba69bf`, `f977988` | `CombatManagerModal.tsx`, `App.tsx` | grande | [ ] |
| 8 | Papéis na entrada: "Escolha seu usuário para entrar", "👑 Mestre", "Jogador (Vê só NPCs liberados)", "Visualizador (Somente visualização, não altera nada)" | `e62c5c7` | `LoginModal.tsx`, `UserAccountsCrudModal.tsx` | pequeno | [ ] |
| 9 | Cards da tela inicial: linha de atributos (ST, DX, IQ, HT, Per, Will, Spd, Move), observações e armas favoritas, nome do jogador sob o do personagem, layout em duas colunas equilibradas | `961ae57`, `cb5c22a`, `7d0d442`, `655ae87`, `0b91e5b`, `87f3cb8` | `CombatHomeScreen.tsx` | grande | [ ] |
| 10 | Rodadas: "Rodada 0 (Preparação)", "Avançar Rodada"/"Diminuir Rodada", aviso "⚠️ Expirou na R…" de magias e condições | `fd13ae6`, `76942e5` | `NpcListBar.tsx`, `NpcDetailView.tsx` | médio | [ ] |
| 11 | Ordem do Mestre: "Salvar esta ordem para todos os usuários", "✓ Ordem Salva!", sincronização ao vivo da ordem | `4769371`, `2fde4c4` | `NpcListBar.tsx`, `App.tsx` | pequeno | [ ] |
| 12 | Paginação do log ("« Ant." e "Próx. »") | `7b8f550` | `GeneralCombatLog.tsx` | pequeno | [ ] |
| 13 | Catálogo de magias embutido (cerca de 15, nome em português e inglês, como "Bola de Fogo (Fireball)") e textos do cadastro de magia ("Clique para adicionar com NH em branco", "Nome da Magia (ex: Bênção)") | `e62c5c7` | `SingleSpellModal.tsx`, `SpellsModal.tsx` | médio | [ ] |
| 14 | Magia em área e no alvo: "🌐 Alvo: Área / Ambiente", "Confirmar Efeito no Alvo", "Confirmar Magia Ativa", "+ Lançar", "Duração (rod.)" | `2fe323b` | `DamageCalculatorModal.tsx`, `NpcDetailView.tsx` | médio | [ ] |
| 15 | Catálogo de armaduras com a RD na descrição ("Armadura leve de placas de aço (RD 3).") e os nomes do ar (5 diferiam, como "Heavy Segmented Plate") | `f48a947` (28/10) | `src/utils/armorCatalog.ts` | pequeno | [x] |
| 16 | Regra específica por parte do corpo e dano limitado ao PV do membro: "Cadastrar Regra Específica", "Dano limitado ao PV do membro (…)", "Dano vindo do histórico de combate", textos de tooltip ("Cabeça: Dano x4", "Pescoço: Corte x2.0") | `f196c81`, `87858b4` | `NpcDetailView.tsx`, `DamageCalculatorModal.tsx`, `src/utils/gurps.ts` | médio | [ ] |
| 17 | Catálogo de armas embutido com nomes em português e inglês ("Machadinha de Arremesso (Small Axe)") e alcance na descrição | `e62c5c7` | `WeaponModal.tsx` | pequeno | [ ] |
| 18 | Áudio pelo hub (`window.audioStreamSync`, 21 usos) e "Clique para habilitar a reprodução do áudio no seu navegador" (depende da decisão) | `89d576a`, `cb36cd2` | `TopNav.tsx`, `App.tsx` | médio | [ ] |
| 19 | Escolha de avatar: "Selecione um token pré-definido ou insira URL personalizada" | `0c0ba70` | `AvatarPickerModal.tsx` | pequeno | [ ] |
| 20 | Condições: contador "condição cadastrada"/"condições cadastradas" e "Excluir permanentemente a condição" | `903d626` | `ConditionsCrudModal.tsx` | pequeno | [ ] |
| 21 | Excluir registro do log com três opções: restaurar os valores, "Confirmar sem Registrar" ou cancelar. Já existia no `src/` (`ConfirmModal` do `CombatLogCard.tsx`); nada a levar. No ar, o `hubConfirm3` está declarado duas vezes e vale a segunda versão, sem cabeçalho | `f0b3a54` | `CombatLogCard.tsx` | pequeno | [x] |
| 22 | Barra superior e modais remendados em 22/10: marca removida, espaçamento, filtros, modal de "Passar o dia" e de permissões | `b77d0a9`, `709ff83`, `9f7327e`, `136cab4`, `17176cf`, `23481f6`, `c16d08c` | `TopNav.tsx`, `NpcListBar.tsx`, `PlayerPermissionsModal.tsx` | médio | [ ] |
| 23 | CSS escrito à mão: grade da tela inicial (`combat-home-grid`, `combat-home-subgrid-2/3`) e dado 3D (`dice-3d-cube`, `dice-face`, `face-1` a `face-6`, `dice-pip`) | `f6ec6c5`, `9b9f57f` | `src/index.css` | médio | [ ] |
| 24 | Sobras: as 97 classes do CSS que só existem no ar e os 31 textos que existem no `src/` mas não entram no build. A maioria some com os itens acima; conferir no fim com `tools/comparar-mesa.mjs` | — | vários | pequeno | [ ] |

Os scripts `tools/*.py` mostram o que foi remendado no `mesa.html` e em que ordem, e ajudam a achar o trecho certo em cada item.

## Só no src/: decidir antes de gerar o mesa.html

Gerar o `mesa.html` pelo `src/` coloca isto no ar:

| # | O que é | Onde está | Decisão |
| --- | --- | --- | --- |
| S1 | Mapa tático (grid hexagonal, tokens, névoa de guerra, régua, mapas de Ludgrim e Tagmar) e os modos Mesa Tática e Visão Dividida | `src/components/TacticalMap/`, `src/types/tactical.ts`, `TopNav.tsx`, `App.tsx` | escondido: `TACTICAL_MAP_ENABLED = false` no `App.tsx` |
| S2 | Cópia própria do áudio, com transmissão pela aba e nome da música | `src/utils/audioStreamSync.ts`, `TopNav.tsx` | [ ] |
| S3 | Retratos da versão do `src/`: backup automático antes de restaurar, renomear e excluir | `CombatManagerModal.tsx` | [ ] |
| S4 | Botão "Passar o dia" na barra de NPCs | `NpcListBar.tsx` | [ ] |
| S5 | Log do sistema ("Limpar Logs do Sistema") | `SystemLogModal.tsx`, `src/utils/systemLogger.ts` | [ ] |
| S6 | Correção da Etapa 1: o alerta de membro inutilizado mostra o nome da parte. No ar aparece "undefined: Inutilizado" | `CombatHomeScreen.tsx` | manter |

## Como conferir

```powershell
npm run build:mesa
node tools/comparar-mesa.mjs --json comparacao.json
```

O resumo mostra quantos textos, classes e chamadas ainda diferem; o JSON lista cada um. Os números de partida estão na tabela do início.
