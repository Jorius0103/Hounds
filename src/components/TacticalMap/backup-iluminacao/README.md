# Backup — Sistema de Iluminação Dinâmica do Tabuleiro Tático

Este diretório guarda o backup completo do desenvolvimento de **Iluminação Dinâmica** e de todos os componentes ligados a ela no Tabuleiro Tático, desativados temporariamente na interface.

## O que foi arquivado neste backup

1. **Opção "Usar Iluminação"** na configuração do mapa (`Configuração do Mapa & Grid`).
2. **Paredes poligonais** (`walls`): ferramenta de desenho, preview, seleção, barra flutuante de construção e bloqueio de luz/visão.
3. **Portas interativas** (`doors`): ferramenta de inserção, alternância aberta/fechada, bloqueio de luz quando fechada e controles globais (`Abrir Todas` / `Fechar Todas`).
4. **Focos de Luz fixos** (`lights`): ferramenta `Inserir Luzes`, raio/ângulo/rotação, arrasto no mapa, menu contextual flutuante e radiação visual (`radialGradient`).
5. **Painel "Itens no Tabuleiro"** (`Paredes, Portas & Luzes`): listagem e gerenciamento rápido na barra superior.
6. **Iluminação e Visão Liberada nos Tokens**: emissão de luz própria (`emitsLight`, `lightRadius`, `lightAngle`) e `hasInfiniteVision` no menu de contexto do token e no `TacticalQuickActionPopover`.
7. **Botão "Visão: Mestre / Jogador"**: substituído pela alternância automática conforme a camada ativa (`2. Jogadores` = visão dos jogadores; `3. Mestre (GM)` = visão do mestre).

## Arquivos de backup (snapshot integral pré-remoção)

- `TacticalMapWorkspace.tsx.bak` ← snapshot de `src/components/TacticalMap/TacticalMapWorkspace.tsx`
- `TacticalToolbar.tsx.bak` ← snapshot de `src/components/TacticalMap/TacticalToolbar.tsx`
- `TacticalQuickActionPopover.tsx.bak` ← snapshot de `src/components/TacticalMap/TacticalQuickActionPopover.tsx`
- `tactical.ts.bak` ← snapshot de `src/types/tactical.ts`
- `tacticalMath.ts.bak` ← snapshot de `src/utils/tacticalMath.ts`

> Os arquivos usam extensão `.bak` para permanecerem dentro da estrutura do sistema sem interferir na checagem de tipos (`tsc --noEmit`) nem no bundle de produção (`vite`).

## Compatibilidade preservada no código ativo

- Os campos opcionais de dados (`lights`, `walls`, `doors`, `useLightingVision`, `emitsLight`, `lightRadius`, `lightColor`, `lightAngle`, `hasInfiniteVision`) continuam declarados em `src/types/tactical.ts` e tratados em `rotateTacticalState90` (`src/utils/tacticalMath.ts`) para manter compatibilidade total com combates já salvos.
- As funções geométricas (`extractBlockingSegments`, `computeVisibilityPolygon`, `hasLineOfSight`, `getCircleSectorPath`, `pointsToSvgPath`) continuam disponíveis em `src/utils/tacticalMath.ts` e arquivadas em `tacticalMath.ts.bak`.

## Como restaurar no futuro

Para reativar o sistema de iluminação, compare ou restaure os trechos desejados a partir dos arquivos `.bak` deste diretório nos arquivos correspondentes em `src/components/TacticalMap/`, `src/types/tactical.ts` e `src/utils/tacticalMath.ts`, e execute `npm run build:mesa`.
