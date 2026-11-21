# Auditoria Técnica Completa — Mesa de RPG (Hounds)

> **Escopo analisado:** Exclusivamente a Mesa de RPG — `src/` (exceto `src/hub/`), `js/mesa-sync.js`, `js/mesa-frame.js`, `js/audio-stream-sync.js`, `js/dice-roller-3d.js`, `css/mesa.css`, `vite.mesa.config.ts` e o bundle `mesa.html` / `dist/mesa.html` (~1,46 MB).
> **Data da auditoria:** 2026-11-21
> **Nota:** Nenhum arquivo de código-fonte foi modificado nesta etapa.

---

## Resumo Executivo

A Mesa de RPG possui um conjunto rico de funcionalidades (mapa tático hexagonal com névoa de guerra em máscara única, tokens instantâneos, auras, medições com visibilidade/autoria, lembretes do Mestre, cálculo de dano localizado GURPS 4e, rolagem 3D em Three.js, áudio WebRTC e sincronização via Supabase). Porém, a auditoria revelou **pontos críticos de segurança, vazamento de dados do Mestre, degradação de performance em sessões longas e riscos de perda/sobrescrita de dados** concentrados em cinco frentes:

1. **Segurança e Vazamento de Visão do Mestre (Severidade: Alta):**
   - **XSS crítico no dado 3D (`js/dice-roller-3d.js:947–967`):** `resultBadge.innerHTML` interpola `characterName`/`playerName` sem sanitização dentro de um iframe `srcdoc` de **mesma origem**, permitindo execução de JS arbitrário no navegador do Mestre.
   - **Confused Deputy (`js/mesa-sync.js:512–519, 682–688`):** qualquer jogador pode emitir `mesa-delete` e fazer o navegador do Mestre executar `deleteRoll()` usando a sessão autenticada do Mestre.
   - **Vazamentos na UI para Jogadores/Visualizadores:** a régua tática revela posição e orientação (`Frente / Flanco / Retaguarda`) de **tokens ocultos e sob névoa** (`TacticalMapWorkspace.tsx:3850–3866`); `GeneralCombatLog.tsx:79,108,114,119` checa `=== 'jogador'` em vez de `!== 'mestre'`, expondo rolagens secretas e NPCs ocultos para quem está em modo `visualizador`; `TacticalPropsRenderer.tsx:78` permite que **qualquer jogador** arraste e gire props do mapa.
   - **Vazamento em rede/memória:** `SYNC_FULL` e `mesa-sync.js` trafegam **senhas de usuários em texto puro** (`users[].password`), `tacticalState` completo (notas do Mestre, tokens ocultos, medições privadas), NPCs ocultos (`masterNotes`) e rolagens secretas para todos os clientes.
2. **Desempenho em Runtime e Memory Leaks (Severidade: Alta):**
   - `App.tsx` (6.022 linhas) possui um `setInterval(..., 3000)` (`presenceClock`, `App.tsx:601–606`) que **re-renderiza toda a aplicação a cada 3 segundos** (e ainda cancela o timer de auto-fechamento de 8s do `DiceRollOverlay.tsx:57`).
   - No `TacticalMapWorkspace.tsx` (4.931 linhas), `getHexRangePerimeterPath` (até ~11.700 iterações por aura/área) roda **em todo `mousemove` de pan/zoom/hover sem `useMemo`**, e quase nenhum subcomponente usa `React.memo`.
   - `js/dice-roller-3d.js` cria um **novo `THREE.WebGLRenderer` + geometrias/texturas + `new AudioContext()` a cada rolagem** sem dar `.dispose()` nem `ctx.close()`, e `App.tsx` ainda dispara `roller.roll()` **em duplicidade** (`L4670` + `DiceRollOverlay.tsx:41`).
   - `js/audio-stream-sync.js:90–109` vaza um `new BroadcastChannel` a cada sinal e envia toda a sinalização WebRTC **3 vezes**, derrubando handshakes no meio.
3. **Sincronização, Rede e Concorrência (Severidade: Alta):**
   - Sobrescritas sem versionamento/CAS (`mergeCombats` em `App.tsx:283–294` e `write()` em `mesa-sync.js:419`), closures obsoletas em `useEffect(..., [])` (`App.tsx:1241, 2036`), risco de sobrescrever o banco remoto com `localStorage` antigo se o Supabase demorar >5s (`mesa-sync.js:609–618`), ressurreição de NPCs deletados via `combatsArchive` (`mesa-sync.js:230, 277`), e `combats_archive` salvando imagens base64 brutas sem chunking (`mesa-sync.js:775–796`).
4. **Bugs Funcionais e de Rotação/Cálculo (Severidade: Alta/Média):**
   - Rotação 90° (`rotateTacticalState90` em `tacticalMath.ts:781–946`) duplica rotação/distorce props retangulares, ignora `lastTokenPositions`, ignora `gridType === 'square'` e não rotaciona presets ilustrativos (`TacticalMapWorkspace.tsx:2946–3001`).
   - `gurps.ts:197` (`normalizeLocationKey`) classifica `"Perna Esquerda"`/`"Perna Direita"` como **pé** (`left_foot`/`right_foot`) porque testa `includes('pe')` antes de perna; `armorCatalog.ts:1047` (`doesArmorFitLocation`) retorna `false` para todas as armaduras `'Tronco / Qualquer'`.
5. **Tamanho do Bundle `mesa.html` (1,46 MB / ~328 KB gzip) (Severidade: Média):**
   - Não há imagens base64 nem source maps no bundle. Os maiores pesos são: código da Mesa minificado (~772 KB, sendo `NpcDetailView` 139 KB, `App` 98 KB, `TacticalMapWorkspace` 88 KB), **`src/utils/presets.ts` (~309 KB, com 203 KB só de descrições de magias e ~70 KB de duplicações)**, React 19 (~220 KB) e Tailwind CSS (~124 KB, escaneando inclusive 344 KB de arquivos `.bak` em `backup-iluminacao/`). Como `mesa-frame.js:101` usa `cache: 'no-store'` + `?v=Date.now()`, o navegador baixa e faz parse dos 1,46 MB do zero em toda visita.

---

## 1. Plano de Testes Manuais e Edge Cases (Mestre vs. Jogador)

### 1.1 Névoa de Guerra (Máscara Única, Rotação 90°, Revelar/Ocultar Tudo)
| # | Cenário | Passos (Mestre vs. Jogador) | Resultado Esperado / Regressão a Vigiar | Referência |
|---|---|---|---|---|
| T1 | Máscara única — operações sequenciais | **Mestre:** Ocultar tudo → revelar 1 retângulo, 1 círculo e 1 polígono (testar `Enter`, `Backspace`, `Esc` e botão direito) → ocultar um retângulo sobre a área revelada. Alternar entre aba `3. Mestre` (névoa 55%) e `2. Jogadores` (névoa 100%). | Operações devem compor em ordem (`ops[]`). **Jogador** deve ver 100% preto nas áreas ocultas e nada dos tokens sob névoa. | `TacticalMapWorkspace.tsx:2876–2933` |
| T2 | Stress de `fogMask.ops` | **Mestre:** Criar ~60 operações intercaladas de revelar/ocultar (incluindo polígonos de 8+ vértices) e fazer pan/zoom rápido em ambos os clientes. | Medir FPS e tempo de frame; observar se o re-render do `<mask>` causa engasgos ou atraso no sync. | `TacticalMapWorkspace.tsx:2876–2933` |
| T3 | **Regressão:** Leak de régua sob névoa | **Mestre:** Colocar inimigo visível sob área coberta por névoa (ou token oculto `hiddenFromPlayers`). **Jogador:** Ativar `Medir → Distância (Seta)` e passar o mouse por cima do hex do inimigo. | **Bug atual:** a badge da régua exibe `• Frente / Flanco (-2) / Retaguarda`, denunciando a posição e o facing do inimigo oculto. Deve mostrar apenas distância. | `TacticalMapWorkspace.tsx:3850–3866` |
| T4 | Rotação 90° completa (4×) | **Mestre:** Em mapa customizado com tokens, auras, fog (retângulo, círculo, polígono), marcadores fixos, notas GM e prop retangular (`Mesa de Banquete` 220×65), girar 90° quatro vezes (90→180→270→0). | Verificar: (a) distorção/dupla rotação do prop (`tacticalMath.ts:855`), (b) drift de hex/facing dos tokens, (c) `lastTokenPositions` após remover token antes da rotação e recolocá-lo depois, (d) desalinhamento ao usar preset ilustrativo (`Taberna`). | `tacticalMath.ts:781–946`, `TacticalMapWorkspace.tsx:2946–3001` |

### 1.2 Tokens (Normais, Instantâneos, Memória de Posição, Auras em Jardas, Visibilidade)
| # | Cenário | Passos (Mestre vs. Jogador) | Resultado Esperado / Regressão a Vigiar | Referência |
|---|---|---|---|---|
| T5 | Token Instantâneo e visibilidade | **Mestre:** Criar Token Instantâneo (com imagem enviada do computador), validar que nasce oculto (olho roxo) e invisível para o **Jogador**. Mover para camada `2. Jogadores` via botão direito. | Token deve aparecer para o Jogador somente após ir para camada pública. Testar também editar o campo URL do avatar após upload (bug atual sobrescreve Data URL com `'(Imagem carregada do computador)...'`). | `TacticalMapWorkspace.tsx:2706–2712` |
| T6 | Memória de posição (`lastTokenPositions`) | **Mestre:** Posicionar token normal em `(10, 8)` com facing SE, removê-lo do mapa e adicioná-lo novamente. Repetir o ciclo com Token Instantâneo e inspecionar `tacticalState.lastTokenPositions`. | Token normal deve restaurar `(10, 8)` e facing. Verificar se excluir Token Instantâneo deixa lixo permanente em `lastTokenPositions`. | `TacticalMapWorkspace.tsx:607–626` |
| T7 | Auras em jardas (visibilidade e escala) | **Mestre:** Definir aura de `3 yd` ("Jogadores") em token visível e arrastar o token; depois mudar para "Só Mestre"; depois ocultar o token mantendo aura pública. Testar valores extremos (`0.4`, `25`, `26` yd) e botão `+`. | Aura pública acompanha o token em tempo real; "Só Mestre" exibe ícone `👁` só no GM e some no Jogador; token oculto não pode exibir aura ao Jogador. Verificar se `scalePerCell !== 1` é respeitado. | `TacticalMapWorkspace.tsx:3101–3117, 4506` |
| T8 | **Regressão:** Edição indevida de Props por Jogador | **Mestre:** Colocar uma mesa/barril destravado no mapa na camada padrão `2. Jogadores`. **Jogador:** Clicar, arrastar e girar (45°) o prop. | **Bug atual:** `canEdit` é `true` para jogadores em `'tokens'`/`'map'`, permitindo alterar props no estado global. Deve ser bloqueado para jogadores. | `TacticalPropsRenderer.tsx:78`, `TacticalMapWorkspace.tsx:850–855` |

### 1.3 Medições (Privada/Pública, Instantânea/Fixa, Timeout/Blur, Permissões de Exclusão)
| # | Cenário | Passos (Mestre vs. Jogador) | Resultado Esperado / Regressão a Vigiar | Referência |
|---|---|---|---|---|
| T9 | Medição Fixa — Privada vs. Pública | **Jogador A:** Criar medição Fixa `"Só para mim"` e outra Fixa `"Para todos"`. Conferir no **Jogador B** e no **Mestre**. | Privada aparece só para Jogador A (nem Mestre nem Jogador B veem na UI). Pública aparece para todos; **Jogador B** não vê botão `✕` e não consegue apagar com botão direito; **Jogador A** e **Mestre** conseguem apagar. | `TacticalMapWorkspace.tsx:3449–3455` |
| T10 | Medição Instantânea — `blur`, `mouseleave` e timeout | **Jogador A:** Iniciar medição Instantânea `"Para todos"` (seta e área). Testar: (a) soltar normalmente, (b) dar `Alt+Tab` (`blur`) no meio, (c) arrastar o mouse para fora do container (`mouseleave`) segurando o clique. | Prévia remota deve sumir imediatamente em `blur` e `mouseleave` (bug atual: `mouseleave` não limpa `isInstantBlastPressed` nem chama `clearRulerPreview`, ficando preso 4s). | `TacticalMapWorkspace.tsx:436–447, 2078–2095` |
| T11 | Troca de modo no meio de régua de 2 cliques | Dar 1 clique com `Distância (Seta)` e, sem dar o 2º clique, clicar em `Área de Efeito` na toolbar. | A linha parcial da seta deve ser cancelada (bug atual: fica uma régua fantasma presa na tela). | `TacticalMapWorkspace.tsx:3832`, `TacticalToolbar.tsx:768` |

### 1.4 Lembretes do Mestre (Pins)
| # | Cenário | Passos (Mestre vs. Jogador) | Resultado Esperado / Regressão a Vigiar | Referência |
|---|---|---|---|---|
| T12 | CRUD e isolamento de Lembretes | **Mestre:** Na aba `3. Mestre`, criar lembrete, arrastar pino, abrir card, editar título/conteúdo e salvar; alternar para aba `2. Jogadores`. **Jogador:** Verificar tela. | Pino e card somem imediatamente na aba `2. Jogadores` e nunca aparecem para o Jogador. | `TacticalMapWorkspace.tsx:4072, 4700` |
| T13 | **Regressão:** Drag de pino fora do container | **Mestre:** Arrastar um pino de lembrete para fora do container do mapa, soltar o botão fora e voltar o cursor ao mapa. | **Bug atual:** `onMouseLeave` não limpa `draggedNoteId`/`dragNotePos`, deixando o pino colado ao cursor. | `TacticalMapWorkspace.tsx:2078–2095` |

### 1.5 Combate, Turnos, Permissões e Log
| # | Cenário | Passos (Mestre vs. Jogador) | Resultado Esperado / Regressão a Vigiar | Referência |
|---|---|---|---|---|
| T14 | **Regressão:** Vazamento no Log para `visualizador` | **Mestre:** Configurar um jogador **sem permissão de edição** (`visualizador`), ocultar 1 NPC (`isVisibleToPlayer: false`) e fazer 1 rolagem secreta (`hideGmRolls`). Verificar o Log Geral no cliente do `visualizador`. | **Bug atual:** `GeneralCombatLog` checa `=== 'jogador'`, então o `visualizador` vê rolagens secretas e histórico de NPCs ocultos! | `GeneralCombatLog.tsx:79, 108, 114, 119` |
| T15 | Dano localizado GURPS e Armaduras | Aplicar dano em `"Perna Esquerda"`, `"Crânio"`, `"Vitais"`, `"Olho"` e testar busca/equipar armadura `"Tronco / Qualquer"`. Testar NPC recém-criado com `hpMax: 0`. | Vigiar: `"Perna Esquerda"` sendo classificada como pé (`gurps.ts:197`), NPC novo marcado como `"Morto (-5x Máx)"` (`gurps.ts:1227`), e armadura `"Tronco / Qualquer"` recusada (`armorCatalog.ts:1047`). | `gurps.ts:197, 1227`, `armorCatalog.ts:1047` |
| T16 | Troca de Kit de Armadura / Magia manual | Equipar um Kit de Armadura diferente no `NpcDetailView` observando a aba Network (WS). | Verificar rajada de 3× `broadcastSync` consecutivos por clique. | `NpcDetailView.tsx:602–613` |

### 1.6 Rolagem 3D e Áudio WebRTC
| # | Cenário | Passos | Resultado Esperado / Regressão a Vigiar | Referência |
|---|---|---|---|---|
| T17 | **Regressão:** Duplo `roller.roll()` e exaustão WebGL/Audio | Disparar 20–30 rolagens seguidas (3d6, 3d20, 2d100) com DevTools aberto (Console + Memory). | Vigiar: dupla animação por rolagem (`App.tsx:4670` + `DiceRollOverlay.tsx:41`), `Too many active WebGL contexts`, som parando de tocar (`AudioContext` leak) e overlay travando aberto (>8s) por causa do `presenceClock` de 3s. | `App.tsx:4670`, `DiceRollOverlay.tsx:41–57`, `dice-roller-3d.js:16, 602, 1088` |
| T18 | Rolagem com iframe oculto + orientação poliédrica | Ir para `#inicio` (Mesa oculta) e receber `SYNC_DICE_ROLL` de outro cliente. Rolar D4/D8/D10/D12/D20/D100 e conferir face voltada para a câmera. | Não deve gerar `NaN` no Three.js (`innerWidth === 0`); face do dado 3D deve coincidir com o badge numérico. | `dice-roller-3d.js:490, 610, 840–868` |
| T19 | Áudio WebRTC — Handshake, Autoplay e queda do Mestre | Mestre inicia transmissão de aba com 2 Jogadores; verificar frames WS para duplicação de sinalização; fechar aba do Mestre abruptamente sem clicar em Parar. | Vigiar: envio triplo de `RTC_OFFER`/`ICE` (`audio-stream-sync.js:90–109`), `needsInteraction` no Jogador sem clique prévio, e player travado como "ativo" após fechamento abrupto do Mestre. | `audio-stream-sync.js:90–109, 295–306` |

### 1.7 Reconexão, Offline e Concorrência
| # | Cenário | Passos | Resultado Esperado / Regressão a Vigiar | Referência |
|---|---|---|---|---|
| T20 | Edição concorrente (Mestre + Editor) | Mestre move tokens/muda rodada enquanto Jogador-Editor altera HP de NPC dentro da janela de 5s (`saveDelay`). Recarregar ambas as abas. | Nenhuma alteração deveria ser perdida (hoje `mergeCombats` e `write()` sobrescrevem sem CAS/timestamp). | `App.tsx:283–294`, `mesa-sync.js:208–242, 419` |
| T21 | **Regressão:** Remoção total de NPCs de um combate | Em combate ativo com 3 NPCs, deletar todos os 3, aguardar 6s e recarregar a página. | **Bug atual:** `combatsArchive` ressuscita os 3 NPCs deletados. | `mesa-sync.js:230, 277, 319, 550` |
| T22 | Fechamento rápido (<5s) e carga inicial lenta (>5s) | (a) Mestre edita NPC e fecha aba em <2s; (b) Abrir `#mesa` como Mestre em rede "Slow 3G" (>5s) com `localStorage` antigo. | (a) Verificar se o `fetch` em `pagehide` é abortado; (b) **Bug atual:** timeout de 5s em `prepare()` pode sobrescrever o banco remoto com o `localStorage` obsoleto do Mestre. | `mesa-sync.js:472–477, 609–618` |

---

## 2. Desempenho e Otimização (Runtime + Bundle)

### 2.1 Gargalos de Re-render no React
| Sev. | Arquivo / Função / Linha | Problema | Impacto |
|---|---|---|---|
| **Alta** | `src/App.tsx:601–606` (`presenceClock`), `CombatHomeScreen.tsx:69–78`, `NpcListBar.tsx:71–80` | `setInterval(..., 3000)` atualiza estado na raiz de `App.tsx` (6.022 linhas), re-renderizando **toda a árvore da Mesa a cada 3s** (`TacticalMapWorkspace`, `NpcDetailView`, `GeneralCombatLog`, modais). `CombatHomeScreen` e `NpcListBar` ainda criam seus próprios intervalos de 3s e fazem `JSON.parse(localStorage.getItem(...))` dentro do render. | Picos de CPU contínuos mesmo parado; quebra o timer de 8s do `DiceRollOverlay`. |
| **Alta** | `src/App.tsx:5512, 5627–5649, 5756–5778` | Props passadas ao `TacticalMapWorkspace` e `NpcDetailView` não são memoizadas (`effectiveEditorIds = [...new Set(...)]`, callbacks `handleUpdateTacticalState`, `handleUpdateNpc`, arrow functions inline). `NpcDetailView` (5.144 linhas) não usa `React.memo`. | Qualquer mudança mínima em `App` força reconciliação completa dos 2 maiores componentes do projeto. |
| **Alta** | `src/components/TacticalMap/TacticalMapWorkspace.tsx:3110–3117, 3464–3471, 3717, 3785, 3955` | `getHexRangePerimeterPath()` (`tacticalMath.ts:378–443`) é recalculado **em todo render sem `useMemo`** para todas as auras e marcadores `blast` (para `r=10` são ~2.000 iterações + `Map` por aura; para `r=25`, ~11.700). | Queda drástica de FPS durante pan, zoom, hover ou drag quando há múltiplas auras/áreas no mapa. |
| **Alta** | `TacticalToolbar.tsx:102`, `TacticalIllustrativePresets.tsx:12`, `TacticalPropsRenderer.tsx:52`, `TacticalMapWorkspace.tsx:3162–3419` | Falta `React.memo` em `TacticalToolbar` (~45 props inline), `TacticalIllustrativePresets` (gera centenas de `<rect>`/`<line>` no preset `dungeon`/`tavern` via `Array.from` a cada render) e nos tokens inline (que recalculam `getFlatHexPointsString` 3× cada). O único `React.memo` (`TacticalPropsRenderer`) é invalidado quando `tacticalState.props` é `undefined` (`|| []` cria novo array em `L3042`). | Custo proporcional ao número de elementos no mapa a cada frame de interação. |
| **Alta** | `src/App.tsx:986–1011` (`handleUpdateTacticalState`) vs `L2619–2625` (`useEffect([combats])`) | `handleUpdateTacticalState` faz debounce de 150ms no `localStorage.setItem`, mas chama `setCombats` imediatamente, disparando `useEffect([combats])` que faz `localStorage.setItem(JSON.stringify(combats))` **síncrono na main thread** — e 150ms depois serializa tudo uma **segunda vez**. O mesmo ocorre em `handleUpdateNpc` (`L3543, L3550`) e outros 6 handlers. `users` tem 2 `useEffect` idênticos (`L514` e `L2637`). | Travamentos (jank) ao editar mapa/fichas; I/O duplicado na main thread. |
| **Média** | `src/App.tsx:125` (`mergeNpcLists`), `L242–266` (`mergeCombats`) | `JSON.stringify` completo de cada NPC, `tacticalState` e evento dentro dos loops de merge a cada pacote de sync. | Pausas de GC e CPU durante sessões com mapas e históricos extensos. |
| **Média** | `src/components/NpcDetailView.tsx:602–613` (`handleEquipArmorKit`), `L407–412` | Chama `updateField` 3 vezes seguidas em um único clique (`armorKits`, `activeArmorKitId`, `armorLocations`), disparando 3 ciclos de `setCombats` + `localStorage` + `broadcastSync` triplo. | Rajada desnecessária de re-renders e tráfego de rede. |

### 2.2 Gargalos de Pan, Zoom e Arrasto Contínuo no SVG
| Sev. | Arquivo / Linha | Problema |
|---|---|---|
| **Alta** | `TacticalMapWorkspace.tsx:1153–1280` (`handleMouseMove`), `L899–936` (`handleWheel`), `L672–684` (`updateViewport`) | Pan (`setViewport`), drag de prop (`setDragPropPos`), drag de nota (`setDragNotePos`), desenho de névoa (`setMouseMapPos`/`setFogBoxCurrent`) e hover (`setHoveredHex`) disparam `setState` no monólito de 4.931 linhas a 60–120Hz (em vez de usar `requestAnimationFrame` + transform direto no DOM/ref durante o arraste). |
| **Alta** | `TacticalToolbar.tsx:561, 609, 692` | Sliders `<input type="range">` de resize do mapa, `hexSize` e `gridOpacity` chamam `onUpdateTacticalState` em todo `onChange` (60Hz), disparando `App.tsx` + `localStorage` + sync online continuamente enquanto o usuário arrasta o slider. |
| **Média** | `TacticalMapWorkspace.tsx:3234–3242` | Cada token aplica `filter: 'drop-shadow(...)'` CSS inline dentro do SVG; múltiplos filtros rasterizados no SVG degradam fortemente a composição GPU durante pan/zoom. |
| **Média** | `TacticalMapWorkspace.tsx:2876–2933` (`<mask id="tactical-fog-mask">`) | `fogMask.ops` cresce sem compactação; `item.points.map(...).join(' ')` (`L2913`) é recalculado em todo render, forçando re-rasterização do alpha mask em `mapW × mapH` a cada frame. |
| **Média** | `TacticalMapWorkspace.tsx:672–684` (`updateViewport`) | Executa `localStorage.setItem` síncrono a cada evento `wheel` e `pointermove` das scrollbars (`L935, L1554, L1590`). |

### 2.3 Memory Leaks e Gestão de Recursos
| Sev. | Arquivo / Função / Linha | Problema |
|---|---|---|
| **Alta** | `js/dice-roller-3d.js:602–665, 834–883, 1074–1100` | Cria **novo `THREE.WebGLRenderer`**, geometrias (`cubeGeo`, `shadowGeo`), 6 `MeshStandardMaterial` + 6 `CanvasTexture` 256×256 de D6 (mesmo ao rolar D20/D100!), texturas de sombra e materiais poliédricos em **toda rolagem**. `cleanup()` (`L1088`) só chama `renderer.dispose()` sem dar `.dispose()` em geometrias/materiais/texturas nem `forceContextLoss()`. Esgota o limite de contextos WebGL (8–16) e vaza dezenas de MB de VRAM. |
| **Alta** | `js/dice-roller-3d.js:12–32` (`playDiceClatterSound`) | Instancia `new AudioContext()` em toda rolagem e **nunca chama `ctx.close()`** nem reutiliza singleton; após várias rolagens o navegador bloqueia novos contextos e o som morre. |
| **Alta** | `js/audio-stream-sync.js:90–109` (`sendSignal`) | Cria `new BroadcastChannel('gurps_combat_sync_channel_v1').postMessage(full)` (`L106`) a cada sinal (heartbeat a cada 5s + todos os ICE candidates) **sem jamais chamar `.close()`**. |
| **Média** | `js/audio-stream-sync.js:214–246, 475–478` | `getDisplayMedia({ video: true, audio: ... })` captura vídeo apenas para ler `videoTrack.label`, não envia vídeo no WebRTC, mas **nunca dá `videoTrack.stop()`**, mantendo captura de tela ativa o tempo todo. |
| **Média** | `js/audio-stream-sync.js:295–306, 510–564` | Sem listener `pagehide`/`beforeunload` para chamar `stopBroadcasting()`; `receiverPc` sem `onconnectionstatechange`; `pendingCandidates` (`L35`) nunca é limpo ao encerrar broadcast. |
| **Média** | `js/mesa-sync.js:479–607, 842–853` e `dice-roller-3d.js:1129–1138` | `MesaSync.start()` não é idempotente nem limpa `setInterval(sendHubPresence, 8000)`; recarregar `frame.srcdoc` sem `unsubscribe()` deixa callbacks presos ao realm destruído em `listeners[]`; `dice-roller-3d.js` sobrescreve `window.parent.DiceRoller3D` e `window.top.DiceRoller3D` com referências ao `document` do iframe. |
| **Média** | `TacticalMapWorkspace.tsx:1541–1603` | Listeners de `pointermove`/`pointerup` nas scrollbars só são removidos após `releasePointerCapture`; se este lançar `NotFoundError` (ou no unmount), ficam vazados. |
| **Média** | `src/App.tsx:159, 185, 1064, 4094, 4142, 4270` | `deletedCombatIdsMemory`, `deletedLogEntryIdsMemory` e `combatsPoolRef` (`window._houndsCombatsPool`) crescem indefinidamente; `handleApplyDamage`/`Fatigue`/`ItemChange` para players inserem em `history` sem `.slice(0, MAX_NPC_HISTORY)`. |
| **Média** | `App.tsx:986`, `CombatManagerModal.tsx:127, 167`, `NpcDetailView.tsx:135, 251` | Timers (`saveStorageTimerRef`, `showToast`, `handleTabClick`) e `fetch`/loads assíncronos sem `AbortController` ou cleanup no unmount. |

### 2.4 Anatomia do Bundle `mesa.html` (1,46 MB / 1.457.727 B) e Otimização
`mesa.html` e `dist/mesa.html` são idênticos (**1.457.727 B** brutos / **327.958 B** gzip). **Não há imagens base64 nem source maps no bundle.**

| Bloco | Tamanho Bruto | % Total | Gzip | Detalhes |
|---|---:|---:|---:|---|
| `<script type="module">` (JS embutido) | **1.332.567 B** | 91,4% | 309.672 B | Todo o JS embutido por `vite-plugin-singlefile` |
| ↳ Código da Mesa (48 arquivos TS/TSX, sem `presets.ts`) | ~772 KB | 53,0% | — | Top: `NpcDetailView` (139 KB), `App` (98 KB), `TacticalMapWorkspace` (88 KB), `DamageCalculatorModal` (53 KB), `CombatManagerModal` (31 KB), `TacticalToolbar` (25 KB), `gurps.ts` (24 KB), `armorCatalog.ts` (23 KB) |
| ↳ `src/utils/presets.ts` (`HOUNDS_PLAYERS`) | **~309 KB** | **21,2%** | ~75,6 KB | Arquivo bruto tem 648 KB (10.779 linhas). **`spells` = 203,5 KB** (65,9%, sendo 116,7 KB só em `description` em inglês com 40,4 KB de descrições duplicadas entre personagens); `armorKits` + `armorLocations` = 82,3 KB (~30 KB duplicados byte-a-byte em 7 de 10 fichas). `AZUR_CHARACTER` (34 KB) é duplicata de `HOUNDS_PLAYERS[0]` (tree-shaken, mas suja o repo). |
| ↳ React 19.0.1 + ReactDOM + Scheduler | ~220 KB | 15,1% | — | Runtime React |
| ↳ `lucide-react` | ~21 KB | 1,5% | — | Tree-shaken corretamente para 92 ícones |
| `<style>` (Tailwind CSS v4.3.3) | **123.836 B** | 8,5% | 17.291 B | `@layer utilities` ~107,6 KB. **Detalhe:** `src/index.css:3` exclui `./hub`, mas **não exclui** `src/components/TacticalMap/backup-iluminacao/` (344 KB de `.bak` escaneados pelo Tailwind!). |
| HTML + bridge `<script>` | ~1.324 B | 0,1% | ~1 KB | `three.min.js`, `dice-roller-3d.js`, `audio-stream-sync.js` ficam externos |

- **Dependências mortas em `package.json`:** `@google/genai`, `motion`, `dotenv`, `express`, `autoprefixer` não são importadas em `src/` (0 bytes no bundle, mas incham `node_modules`).
- **Armadilha de cache (`js/mesa-frame.js:101`):** faz `fetch('mesa.html?v=' + Date.now(), { cache: 'no-store' })` em toda abertura, forçando download + parse síncrono de 1,46 MB toda vez.
- **Como reduzir drasticamente (estimativa: queda de ~60–70% no carregamento inicial):**
  1. **Externalizar `HOUNDS_PLAYERS` para `dados/hounds-presets.json`** (carregado sob demanda como já é feito com `dados/armaduras.json`), deduplicando descrições de magias e `armorLocations` → **-310 KB imediatos no bundle**.
  2. **Substituir `vite-plugin-singlefile` por chunks com hash + `React.lazy()`** (o iframe `srcdoc` já carrega scripts externos da mesma origem!). O `mesa.html` cai para ~2 KB (`no-store`), chunks vendor/app ganham cache HTTP imutável, e `TacticalMapWorkspace` (~155 KB), `DamageCalculatorModal` (~53 KB), `CombatManagerModal` (~31 KB) e `ArmorSearchModal` (~34 KB) carregam sob demanda.
  3. **Mover `LOW_TECH_TRUNK_ARMORS` / `GURPS_CORE_ARMOR_TYPES`** de `armorCatalog.ts` para `dados/armaduras.json` → **-23 KB**.
  4. **Remover `backup-iluminacao/`** (ou excluí-lo no `@source not` de `src/index.css`) e limpar `package.json`.

---

## 3. Sincronização, Rede e Concorrência (`mesa-sync.js` / `mesa-frame.js` / `onlineSync.ts` / `App.tsx`)

### 3.1 Frequência de Escritas e Payloads
| Sev. | Arquivo / Função / Linha | Problema |
|---|---|---|
| **Alta** | `js/mesa-sync.js:398–403, 775–796` (`publish` / `SYNC_FULL`) | `combatsArchive[c.id]` copia `c.npcs` e `c.events` **antes** de `swapImgs(st)` (`L811`). Avatares `data:image/...;base64` ficam permanentemente embutidos em `combats_archive` e são salvos numa única linha JSONB **sem chunking**. Além disso, `JSON.stringify(combatsArchive)` roda **2 vezes a cada `SYNC_FULL`** (`L777, L793`). |
| **Alta** | `src/App.tsx:1169–1237, 3203–3232, 4728–4735` | `broadcastSync` dispara simultaneamente em **3 transportes** (`BroadcastChannel`, `onlineSyncService` e `window.parent.hubMesaBus`), e quase todos os eventos granulares (`SYNC_ROUND`, `SYNC_ACTIVE_COMBAT`, `SYNC_EDITORS`, `SYNC_MASTER_ORDER`, `SYNC_ENTRY_COMMENT`, `SYNC_LOG_CLEAR`) enviam a mensagem granular **e** um `SYNC_FULL` logo em seguida. |
| **Média** | `js/mesa-sync.js:512–519, 682–688` (`SYNC_ENTRY_DELETE`) | Amplificação N+1 de `DELETE` em `mesa_rolagens`: o remetente chama `deleteRoll()` e todos os clientes receptores de `mesa-delete` **também** chamam `deleteRoll()` simultaneamente no Supabase. |
| **Média** | `js/mesa-sync.js:569–576, 725–730` (`SYNC_ACTIVE_COMBAT`) | Envia `mesa-active-combat` + broadcast `mesa` completo (`JSON.stringify(state)`) na mesma ação; receptor injeta ambos no iframe. |
| **Média** | `js/mesa-sync.js:173–174, 185–204` (`shown()`) | `shown()` retorna `loaded()` (sempre `true` após abrir a Mesa uma vez). O throttle de aba oculta (`pushHidden`/`flushHidden`) é **código morto**: mesmo fora de `#mesa`, o iframe oculto continua processando todo `SYNC_FULL`/`SYNC_NPC`. |
| **Baixa** | `js/mesa-sync.js:597–605, 654–663` | `setInterval(sendHubPresence, 8000)` roda mesmo com aba oculta e fora de `#mesa`, duplicado por `PRESENCE_PING` (`onlineSync.ts:126–138`, a cada 15s). `RULER_PREVIEW` não tem throttle no bridge. |

### 3.2 Race Conditions, Closures Obsoletas e Reconexão
| Sev. | Arquivo / Função / Linha | Problema |
|---|---|---|
| **Alta** | `js/mesa-sync.js:208–242, 255–257, 411–433` | **Last-Write-Wins sem Optimistic Locking / CAS:** `write()` grava `mesa/state` sem checar `head.rev` no servidor; `mergeList()` usa `Date.now()` local (clock skew faz um cliente vencer sempre); `mergeState()` sobrescreve cegamente `round`, `events`, `tacticalState`, `conditions`, `activeCombatId` e `editors`; `onHead()` (`L256`) sobrescreve `combatsArchive` remoto com o local antigo. |
| **Alta** | `src/App.tsx:127–134, 283–294, 1792–1797` | `mergeCombats` faz `{ ...existing, ...incoming }` sem comparar timestamp — qualquer resposta atrasada de `REQUEST_SYNC` (que usa `timestamp: lastLocalEditTimestampRef.current || 1` em `L1894`) pode reverter `tacticalState` recente. `mergeNpcLists` permite pacote mais antigo sobrescrever se `isVisibleToPlayer` diferir. `conditions` só sincroniza se `.length` mudar (`L1792`). |
| **Alta** | `js/mesa-sync.js:208–217, 230, 275–285, 317–327, 548–558` | **Ressurreição de NPCs deletados:** `mergeList()` não usa tombstones; e esvaziar todos os NPCs de um combate ativo dispara o fallback do `combatsArchive`, restaurando os NPCs antigos. |
| **Alta** | `src/App.tsx:1241–2012, 2036–2616, 1131` | **Closures obsoletas** nos `useEffect(..., [])` de sync: `sessionPlayerIds`, `currentUser` e `selectedNpcId` ficam congelados nos valores do mount. `REQUEST_SYNC` (`L1892`) devolve o `sessionPlayerIds` inicial e reverte edições posteriores; login pós-mount quebra auto-seleção. |
| **Alta** | `js/mesa-sync.js:609–618` (`prepare`) | Se o carregamento inicial do Supabase ultrapassar 5s (`Promise.race`), `state` ainda é `null` e, se o usuário for `mestre`, **`L616` grava o `localStorage` local antigo por cima do banco remoto**. |
| **Alta** | `src/App.tsx:1985–1992` | `hubMesaBus.subscribe` chama `handleIncomingSync(p)` **sem filtrar `p.clientId === onlineSyncService.getClientId()`** (risco de eco próprio). `BroadcastChannel` para `SYNC_MASTER_ORDER`/`SYNC_LOG_CLEAR`/`SYNC_ENTRY_DELETE` (`L3211, L4728, L5313`) também omite `sourceId`. |
| **Média** | `src/App.tsx:988–1000, 4590–4608` | `handleUpdateTacticalState` e `handleRollDice` leem `activeTacticalState`/`combats` do closure em vez de `stateRef.current`, causando perda de atualização em mutações no mesmo tick. |
| **Média** | `js/mesa-sync.js:407–409, 425–432, 440–451, 472–477, 664–734, 907–912` | (a) Mutação in-place de `state` durante `await hostImgs()`; (b) `cleanChunks()` (20s) pode apagar chunks em trânsito de cliente lento; (c) `pagehide` usa `fetch` sem `keepalive` (perde edições dentro dos 5s de `saveDelay`); (d) `hubMesaFlush()` navega para `#inicio` sem `await`; (e) `publish()` muta `state`/`lastJson` mesmo quando `!canSave()`. |

---

## 4. Bugs Ocultos, Segurança e Vazamento de Visão do Mestre

### 4.1 Segurança e Vazamentos do Mestre
| Sev. | Arquivo / Função / Linha | Problema |
|---|---|---|
| **Alta** | `js/dice-roller-3d.js:947–967` (`resultBadge.innerHTML`) + `mesa-frame.js:108` (`srcdoc`) | **XSS armazenado/refletido via broadcast:** interpola `characterName`, `playerName`, `rolls`, `diceSides` e `total` em `innerHTML` sem escape. Como `mesa.html` roda em `iframe.srcdoc` de **mesma origem**, qualquer jogador pode executar JS arbitrário no navegador do Mestre e acessar `window.parent`, `localStorage` e sessão Supabase. |
| **Alta** | `js/mesa-sync.js:512–519, 682–688` | **Confused Deputy:** qualquer jogador envia `SYNC_ENTRY_DELETE` sem checagem de `canSave()`; o cliente do Mestre recebe `mesa-delete` e executa `W.store.deleteRoll(m.entryId)` com privilégio de Mestre, burlando RLS. |
| **Alta** | `src/components/TacticalMap/TacticalMapWorkspace.tsx:3850–3866` | **Vazamento na UI:** a régua tática busca `tokens.find(...)` sem filtrar `isTokenHidden`, `isPlayerView` ou `fogMask`, exibindo `• Frente / Flanco (-2) / Retaguarda (Sem Defesa!)` sobre tokens ocultos/sob névoa para Jogadores. |
| **Alta** | `src/components/GeneralCombatLog.tsx:79, 108, 114, 119, 500` e `DetailedLogModal.tsx:628` | **Bypass de `visualizador`:** filtra segredos com `currentUserRole === 'jogador'` em vez de `!== 'mestre'`. Jogadores sem permissão de edição (`effectiveRole = 'visualizador'`) veem rolagens secretas do Mestre e histórico de NPCs ocultos. |
| **Alta** | `src/components/TacticalMap/TacticalPropsRenderer.tsx:78` + `TacticalMapWorkspace.tsx:850–855, 1347–1356` | **Vazamento de permissão:** `canEdit = isMaster \|\| activeLayer === 'map' \|\| activeLayer === 'tokens'` permite a **todos os jogadores** selecionar, arrastar e girar props do mapa, salvando no estado global. |
| **Alta** | `src/App.tsx:1144–1237, 1883–1896, 4601–4608` e `js/mesa-sync.js:73–80, 411–433, 491–495, 647–653` | **Vazamento em rede/`localStorage`:** `SYNC_FULL`, `SYNC_STATE`, `SYNC_DICE_ROLL` e `mesa-sync.js` enviam integralmente para todos os clientes: **senhas em texto puro (`users[].password`)**, `notes` do Mestre, tokens ocultos, auras privadas, medições privadas, `masterNotes` de NPCs ocultos e rolagens com `isSecret: true`. |
| **Alta** | `src/App.tsx:928–930, 1908, 4528, 5513–5522` e `js/mesa-sync.js:370–394` | (a) `postMessage` (`HUB_USER_UPDATE`) não valida `e.origin`; (b) usuário deslogado (`!currentUser`) é tratado como `isMestre = true` em `fetchSupabaseRolls` e `handleRollDice`; (c) `editorUserIds` contendo `''`/`'user-'` concede `isEditor = true` a deslogados; (d) `canSave()` e mutações/sync (`SYNC_EDITORS`, `SYNC_LOG_CLEAR`, `handleDeleteCombat`, etc.) confiam no cliente sem validação de papel no remetente. |
| **Alta** | `TacticalMapWorkspace.tsx:1988–1993, 2023–2034` | `handleClearMarkers` / `handleClearRulerMarkers` / `handleClearAreaMarkers` não validam `isMaster` nem `canDeleteMarker`, podendo apagar medições privadas de terceiros. |
| **Média** | `js/audio-stream-sync.js:378–381, 405–420` | Qualquer jogador pode emitir `AUDIO_STREAM_ANNOUNCE` derrubando/sequestrando a transmissão de áudio do Mestre. |
| **Média** | `TacticalMapWorkspace.tsx:226, 309–314` | `activeLayer` compartilhado em `tacticalState` altera cursor e eventos do Jogador quando o Mestre troca de camada; `currentAuthorId` cai em `'jogador'` para usuários sem id/nome, colidindo medições privadas entre eles. |
| **Média** | `NpcDetailView.tsx:875–879` | `useEffect` de auto-preenchimento de magias do preset dispara `updateField('spells', ...)` e `broadcastSync` mesmo para `visualizador`. |

### 4.2 Bugs Ocultos e Riscos de Crash
| Sev. | Arquivo / Função / Linha | Problema |
|---|---|---|
| **Alta** | `src/App.tsx:1294, 2066, 4670, 6016–6019` + `DiceRollOverlay.tsx:31–57` | `roller.roll()` é chamado **2 vezes por rolagem** (`App.tsx` + `DiceRollOverlay`). Além disso, `onClose` inline recriado a cada 3s (`presenceClock`) cancela o `autoTimer` de 8s sem reagendar, prendendo o overlay se o callback do Three.js falhar. |
| **Alta** | `src/utils/tacticalMath.ts:781–946` (`rotateTacticalState90`) + `TacticalMapWorkspace.tsx:2946–3001` | (a) Props têm `width`/`height` trocados **e** `rotation + 90` (dupla rotação/distorção); (b) `TacticalIllustrativePresets` não rotaciona; (c) `lastTokenPositions` e `terrainCells` não são rotacionados; (d) usa `getHexCenter`/`pixelToHex` mesmo quando `gridType === 'square'`; (e) ignora `mapImageX`/`mapImageY`. |
| **Alta** | `TacticalMapWorkspace.tsx:651–666, 705–726` + `tacticalMath.ts:32, 155` | `hexSize <= 0` ou `0.1` causa loop massivo/OOM em `hexGridPath` e divisão por zero/`NaN` em `pixelToHex`/`pixelToCell`; `zoom <= 0` ou `NaN` no `localStorage` quebra toda matemática de coordenadas (`Infinity`/`NaN`). |
| **Alta** | `src/utils/gurps.ts:177–237` (`normalizeLocationKey`) | Checa `lower.includes('pe')` (`L197`) antes de checar perna (`L229`): **`"Perna Esquerda"` e `"Perna Direita"` são classificadas como `"left_foot"` / `"right_foot"`**! |
| **Média** | `src/utils/gurps.ts:1227–1262` (`getHpStatus`/`getFpStatus`) | `getHpStatus(0, 0)` retorna **`"Morto (-5x Máx)"`** e `getFpStatus(0, 0)` retorna `"Inconsciente (Exaustão)"` em NPCs novos (`hpMax: 0`). |
| **Média** | `src/utils/armorCatalog.ts:1047–1113` (`doesArmorFitLocation`) | Retorna `false` para todas as entradas `'Tronco / Qualquer'` de `LOW_TECH_TRUNK_ARMORS` (não testa `'qualquer'` nem `'tronco'`). |
| **Média** | `js/dice-roller-3d.js:554–584, 602, 490, 610, 840–868` | (a) `rememberRoll` antes do load dinâmico de `THREE` descarta a 1ª rolagem; (b) `new THREE.WebGLRenderer` sem `try/catch` deixa overlay órfão; (c) `innerWidth === 0` (iframe oculto) gera `NaN`; (d) `polyData.faceNormals[item.targetFaceIndex]` usa índice não normalizado. |
| **Média** | `App.tsx:1456, 2215, 3661, 4094, 5491`, `TacticalMapWorkspace.tsx:2067, 2909, 4080`, `mesa-sync.js:58–59, 799`, `CombatManagerModal.tsx:422` | Acessos diretos sem null-guard (`c.npcs.map`, `...n.history`, `selectedNpc.weapons.some`, `note.title.length`, `c.name.toLowerCase()`, `item.points.length`, `ensureSemCombateFirst(m.combats).map`) causam `TypeError` com estados antigos/parciais. |
| **Média** | `TacticalMapWorkspace.tsx:2078–2095, 3832, 3109` + `TacticalToolbar.tsx:768` | `onMouseLeave` deixa nota/prop/blast presos; trocar `rulerType` deixa linha fantasma; `scalePerCell` é ignorado (hardcoded `1:1`); `TacticalQuickActionPopover.tsx` (362 linhas) e `TacticalTokenSidebar.tsx` (281 linhas) são arquivos órfãos não importados em `src/`. |
| **Baixa** | `App.tsx:5944`, `gurps.ts:750, 811`, `tacticalMath.ts:271, 353, 740` | `Spell` usado sem import em `App.tsx:5944`; `damageType` case-sensitive em `calculateLocationDamage`; `getHexesInRange` corrompe com raio fracionário; `getTargetArcRelationship` usa offset em vez de pixel; `segmentsIntersect` ignora colinearidade em vértices. |

---

## 5. Testes Automatizados Recomendados (Ordem de Prioridade)

Configurar **Vitest** (`vitest` no `devDependencies`, sem tocar no build de produção) e blindar primeiro as funções puras e regras de permissão críticas:

1. **Prioridade 1 — `src/utils/gurps.ts` (Regras de Combate GURPS 4e):**
   - `normalizeLocationKey` & `migrateArmorLocations`: aliases PT/EN, migração de legado (`leg`/`arm`/`hand`/`feet`) e **teste de regressão para `"Perna Esquerda"` / `"Perna Direita"`**.
   - `calculateLocationDamage`: empilhamento de RD, `bypassDr`, multiplicadores por local (`head` +2 RD/×4, `neck` ×1.5/×2, `vitals` ×3, `eye` ×4, membros com cap de HP), `damageType` com maiúsculas/espaços, `rawDamage <= 0`.
   - `calculateLocationHp`, `getBodyPartStatus` e `calculateAllLocationsDamage`: spillover entre membros (`LIMB_RELATED_KEYS`), cura com piso 0, thresholds `V / 2V / 3V`.
   - `getHpStatus` / `getFpStatus` / `getHpWarnings` / `getFpWarnings`: limites `max`, `ceil(max/3)`, `0`, `-max`, `-5*max` e **regressão para `max <= 0`**.
2. **Prioridade 2 — `src/utils/tacticalMath.ts` (Geometria, Rotação e Visibilidade):**
   - `offsetToCube` ↔ `cubeToOffset` e `getHexCenter` ↔ `pixelToHex` (round-trip em linhas pares, ímpares e negativas + guarda contra `hexSize <= 0`).
   - `getHexDistance`, `getHexLine`, `getHexesInRange` (inclusive raio fracionário), `getGurpsRangePenalty` (todas as faixas GURPS 4e) e `snapRotationToHexFace` ↔ `facingToRotation` ↔ `rotationToFacing`.
   - `rotateTacticalState90`: invariante de 4 rotações consecutivas para `fogMask` (`rect`, `circle`, `polygon`), `props` (sem dupla rotação), `notes`, `tokens`, `lastTokenPositions` e grade `square` vs `hex`.
   - `getHexRangePerimeterPath`, `segmentsIntersect`, `hasLineOfSight`, `isPointInPolygon`.
3. **Prioridade 3 — Regras de Permissão, Visibilidade e Sanitização (extrair para módulo puro `src/utils/mesaPermissions.ts`):**
   - Visibilidade de tokens, auras, lembretes, medições (`private`/`public`) e entradas de log para os 3 papéis: `'mestre'`, `'jogador'` (editor) e `'visualizador'` (incluindo regressão do bypass de `visualizador` e da régua sobre token oculto).
   - Função pura de **sanitização de payload para Jogadores** (garantir que `users[].password`, `notes`, tokens ocultos, `masterNotes` e rolagens `isSecret` nunca passem).
4. **Prioridade 4 — Normalização de Estado e Merge de Sync (extrair `mergeCombats` / `mergeNpcLists` de `App.tsx`):**
   - Estados antigos/incompletos (`npcs: undefined`, `fogMask: undefined`, `notes: undefined`, `hexSize: 0`, `zoom: NaN`) não podem lançar exceção.
   - Tombstones de exclusão de NPCs/combates e resolução determinística de conflitos (sem ressurreição via `combatsArchive`).
5. **Prioridade 5 — `src/utils/armorCatalog.ts`:**
   - `parseArmorDr` (RD simples, split `"5/3*"`, balístico, botas, modificadores em texto PT/EN, NBC), `doesArmorFitLocation` (**regressão `'Tronco / Qualquer'`**) e `describeArmorCoverage`.

---

## 6. Roadmap Priorizado — Top 10 (Impacto vs. Esforço)

As 10 ações abaixo estão ordenadas por impacto/urgência e agrupadas em **blocos independentes** para execução em prompts separados:

### Bloco A — Segurança Crítica e Vazamentos do Mestre *(Fazer primeiro)*
1. **Corrigir XSS no dado 3D e Confused Deputy no `mesa-delete`:**
   - Substituir `resultBadge.innerHTML` por DOM API (`textContent`/escape) em `js/dice-roller-3d.js:947–967`.
   - Remover `W.store.deleteRoll()` do receptor `rt().on('mesa-delete')` e exigir `canSave()` em `SYNC_ENTRY_DELETE` (`js/mesa-sync.js:512–519, 682–688`).
   - Validar `e.origin` no `postMessage` (`App.tsx:928`) e corrigir `isMestre` para usuário deslogado (`App.tsx:1908, 4528, 5513`).
2. **Fechar todos os vazamentos de UI/Permissão para Jogadores e Visualizadores:**
   - Filtrar tokens ocultos/sob névoa na régua (`TacticalMapWorkspace.tsx:3850–3866`).
   - Trocar `currentUserRole === 'jogador'` por `currentUserRole !== 'mestre'` em `GeneralCombatLog.tsx:79,108,114,119,500` e `DetailedLogModal.tsx:628`.
   - Restringir edição/arraste/rotação de props a `isMaster` (`TacticalPropsRenderer.tsx:78`, `TacticalMapWorkspace.tsx:850, 1347`) e `handleClear*Markers` a permissões válidas (`L1988, 2023`).
   - Remover `users[].password` do `SYNC_FULL`/`SYNC_STATE` e impedir `broadcastSync` de rolagens `isSecret` (`App.tsx:1206, 1220, 4607`).

### Bloco B — Estabilidade de Dados 3D e Áudio WebRTC
3. **Eliminar vazamentos WebGL/AudioContext e duplo `roller.roll()`:**
   - Remover a chamada duplicada de `roller.roll()` em `App.tsx:1294, 2066, 4670` (deixar só no `DiceRollOverlay` com `onClose` via `useCallback`/`ref`).
   - Reutilizar um único `AudioContext` (ou chamar `ctx.close()`), dar `.dispose()` em todas geometrias/materiais/texturas + `forceContextLoss()` (ou reutilizar um único `WebGLRenderer`), envolver criação em `try/catch`, corrigir `rememberRoll` antes do load do `THREE` e guardar `innerWidth === 0` (`js/dice-roller-3d.js`).
4. **Consertar sinalização tripla e leaks no `audio-stream-sync.js`:**
   - Parar de criar `new BroadcastChannel` a cada sinal (usar instância única fechada no cleanup), eliminar envio triplicado de `RTC_*` (`L90–109`), dar `videoTrack.stop()` após ler o label (`L233`) e adicionar `pagehide` + validação de emissor no `AUDIO_STREAM_ANNOUNCE`.

### Bloco C — Performance de Runtime (React + Mapa Tático)
5. **Acabar com o re-render global a cada 3s e serialização dupla de `localStorage`:**
   - Isolar `presenceClock` em um componente/hook dedicado (tirar da raiz de `App.tsx:601–606`), memoizar props/callbacks de `TacticalMapWorkspace` e `NpcDetailView`, remover o `localStorage.setItem` duplicado de `handleUpdateTacticalState`/`useEffect([combats])` (`App.tsx:986, 2619`) e do `useEffect([users])` duplicado (`L514, L2637`).
6. **Otimizar Mapa Tático (pan/zoom/auras/névoa):**
   - Memoizar `getHexRangePerimeterPath` por `(col, row, radius, hexSize)` (`TacticalMapWorkspace.tsx:3110, 3464`), aplicar `React.memo` em `TacticalToolbar`, `TacticalIllustrativePresets` e num componente `TacticalTokenItem`, fazer debounce dos sliders da toolbar (`TacticalToolbar.tsx:561, 609, 692`) e do `localStorage` de `updateViewport`, e limpar estados em `onMouseLeave` (`L2078`).

### Bloco D — Confiabilidade de Sincronização e Concorrência
7. **Blindar `mesa-sync.js` e `App.tsx` contra perda/sobrescrita de dados:**
   - Corrigir closures obsoletas nos `useEffect(..., [])` de sync (`App.tsx:1241, 2036`) usando `refs`, filtrar eco próprio no `hubMesaBus.subscribe` (`App.tsx:1985`), remover o overwrite do banco remoto no timeout de 5s de `prepare()` (`mesa-sync.js:609–618`), corrigir ressurreição de NPCs via `combatsArchive` (`L230, 277`), rodar `swapImgs` antes de copiar para `combatsArchive` (`L778`) e corrigir `shown()` para pausar updates quando a aba estiver oculta.

### Bloco E — Bugs Funcionais (Mapa, Rotação e Regras GURPS)
8. **Corrigir bugs de Rotação 90°, escala/crashes e regras GURPS/Armaduras:**
   - Corrigir `rotateTacticalState90` (`tacticalMath.ts:781–946`: não trocar `w/h` ao somar `+90` em props, rotacionar `lastTokenPositions`, suportar `square`, rotacionar presets ilustrativos), adicionar clamping em `hexSize`/`zoom` e null-guards em `c.npcs`/`note.title`/`item.points`.
   - Corrigir `normalizeLocationKey` (`gurps.ts:197` — `"Perna Esquerda"`), `getHpStatus(0, 0)` (`gurps.ts:1227`) e `doesArmorFitLocation` (`armorCatalog.ts:1047` — `'Tronco / Qualquer'`).

### Bloco F — Testes Automatizados e Redução do Bundle `mesa.html`
9. **Implantar Vitest + suíte unitária core:**
   - Cobrir `gurps.ts`, `tacticalMath.ts`, `armorCatalog.ts` e as novas funções puras de permissão/sanitização (blindando regressões de todos os blocos anteriores).
10. **Enxugar o bundle `mesa.html` (de 1,46 MB para ~350–500 KB iniciais com cache):**
    - Externalizar `HOUNDS_PLAYERS` (`presets.ts`, -310 KB) para `dados/hounds-presets.json` com deduplicação de magias/armaduras; excluir `backup-iluminacao/` (344 KB) do Tailwind e remover arquivos órfãos (`TacticalQuickActionPopover.tsx`, `TacticalTokenSidebar.tsx`); avaliar migração de `vite-plugin-singlefile` para chunks com hash + `React.lazy()` para `TacticalMapWorkspace` e modais pesados.
