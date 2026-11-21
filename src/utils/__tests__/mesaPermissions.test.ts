import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  canSeeMasterSecrets,
  filterVisibleLogEntries,
  findVisibleRulerTargetToken,
} from '../mesaPermissions';
import { getHexCenter } from '../tacticalMath';
import type { Combat, NPC, UserAccount } from '../../types/rpg';
import type { TacticalFogMask, TacticalToken } from '../../types/tactical';

function makeNpc(overrides: Partial<NPC>): NPC {
  return {
    id: 'npc-1',
    name: 'Goblin Oculto',
    title: '',
    characterType: 'npc',
    weight: '',
    height: '',
    avatar: '',
    isVisibleToPlayer: false,
    isDead: false,
    hpCurrent: 10,
    hpMax: 10,
    fpCurrent: 10,
    fpMax: 10,
    statusConditions: [],
    turnActions: {
      parryCount: 0,
      dodgeCount: 0,
      blockCount: 0,
      usedRetreat: false,
      usedBlockThisTurn: false,
      shock: 0,
      usedFatigueThisTurn: false,
      fatigueAmountUsed: 0,
      notes: '',
    },
    st: 10,
    dx: 10,
    iq: 10,
    ht: 10,
    per: 10,
    will: 10,
    basicSpeed: 5,
    basicMove: 5,
    naturalDr: 0,
    parries: [],
    dodge: 8,
    block: 0,
    weapons: [],
    spells: [],
    armorLocations: [],
    advantages: '',
    disadvantages: '',
    skills: '',
    combatSkills: '',
    combatPerks: '',
    equipment: '',
    masterNotes: 'Segredo do Mestre',
    assistantNotes: '',
    history: [],
    ...overrides,
  };
}

describe('mesaPermissions — Visibilidade de segredos e logs por papel (mestre / jogador / visualizador)', () => {
  const hiddenNpc = makeNpc({
    id: 'npc-hidden',
    name: 'Assassino Invisível',
    isVisibleToPlayer: false,
    history: [
      {
        id: 'log-hidden-npc-roll',
        timestamp: '2026-11-21T02:00:00Z',
        author: 'mestre',
        type: 'roll',
        description: 'Rolagem de Furtividade do Assassino',
      },
    ],
  });

  const visibleNpc = makeNpc({
    id: 'npc-visible',
    name: 'Orc Guerreiro',
    isVisibleToPlayer: true,
    history: [
      {
        id: 'log-visible-npc-roll',
        timestamp: '2026-11-21T02:01:00Z',
        author: 'mestre',
        type: 'roll',
        description: 'Ataque público do Orc',
      },
      {
        id: 'log-visible-npc-secret',
        timestamp: '2026-11-21T02:02:00Z',
        author: 'mestre',
        type: 'roll',
        isSecret: true,
        description: 'Rolagem secreta de percepção do Orc',
      },
      {
        id: 'log-visible-npc-gm-status',
        timestamp: '2026-11-21T02:03:00Z',
        author: 'mestre',
        type: 'damage',
        description: 'Mestre ajustou PV interno do Orc',
      },
    ],
  });

  const playerChar = makeNpc({
    id: 'pc-1',
    name: 'Azur',
    characterType: 'player',
    isVisibleToPlayer: true,
    history: [
      {
        id: 'log-pc-public',
        timestamp: '2026-11-21T02:04:00Z',
        author: 'jogador',
        type: 'roll',
        description: 'Ataque de Azur',
      },
      {
        id: 'log-pc-secret',
        timestamp: '2026-11-21T02:05:00Z',
        author: 'mestre',
        type: 'roll',
        isSecret: true,
        description: 'Teste secreto contra veneno em Azur',
      },
    ],
  });

  const activeCombat: Combat = {
    id: 'combat-1',
    name: 'Emboscada na Estrada',
    round: 2,
    createdAt: '2026-11-21T01:00:00Z',
    npcs: [hiddenNpc, visibleNpc],
    events: [
      {
        id: 'ev-public',
        timestamp: '2026-11-21T02:06:00Z',
        author: 'mestre',
        type: 'note',
        description: 'Início da Rodada 2',
      },
      {
        id: 'ev-secret',
        timestamp: '2026-11-21T02:07:00Z',
        author: 'mestre',
        type: 'roll',
        isSecret: true,
        description: 'Rolagem secreta de reforços inimigos',
      },
    ],
  };

  it('canSeeMasterSecrets concede acesso apenas a "mestre" e bloqueia "jogador" e "visualizador"', () => {
    expect(canSeeMasterSecrets('mestre')).toBe(true);
    expect(canSeeMasterSecrets('jogador')).toBe(false);
    expect(canSeeMasterSecrets('visualizador')).toBe(false);
  });

  it('mestre vê todas as entradas, incluindo segredos e NPCs ocultos', () => {
    const ids = filterVisibleLogEntries({
      activeCombat,
      additionalCharacters: [playerChar],
      currentUserRole: 'mestre',
    }).map((e) => e.id);

    expect(ids).toContain('ev-public');
    expect(ids).toContain('ev-secret');
    expect(ids).toContain('log-hidden-npc-roll');
    expect(ids).toContain('log-visible-npc-roll');
    expect(ids).toContain('log-visible-npc-secret');
    expect(ids).toContain('log-visible-npc-gm-status');
    expect(ids).toContain('log-pc-public');
    expect(ids).toContain('log-pc-secret');
  });

  it('jogador e visualizador NÃO veem rolagens secretas, NPCs ocultos ou edições internas do mestre', () => {
    for (const role of ['jogador', 'visualizador'] as const) {
      const ids = filterVisibleLogEntries({
        activeCombat,
        additionalCharacters: [playerChar],
        currentUserRole: role,
      }).map((e) => e.id);

      // Público permanece visível
      expect(ids).toContain('ev-public');
      expect(ids).toContain('log-visible-npc-roll');
      expect(ids).toContain('log-pc-public');

      // Segredos e NPC oculto jamais vazam (regressão do bypass de visualizador)
      expect(ids).not.toContain('ev-secret');
      expect(ids).not.toContain('log-hidden-npc-roll');
      expect(ids).not.toContain('log-visible-npc-secret');
      expect(ids).not.toContain('log-visible-npc-gm-status');
      expect(ids).not.toContain('log-pc-secret');
    }
  });
});

describe('mesaPermissions — Régua tática não vaza tokens ocultos ou sob névoa', () => {
  const hexSize = 40;
  const visibleNpc = makeNpc({ id: 'npc-vis', name: 'Orc Visível', isVisibleToPlayer: true });
  const hiddenNpc = makeNpc({ id: 'npc-hid', name: 'Ladrão Oculto', isVisibleToPlayer: false });

  const visibleToken: TacticalToken = {
    id: 'tok-vis',
    npcId: 'npc-vis',
    gridX: 5,
    gridY: 4,
    facing: 2,
    elevation: 0,
    reach: 1,
    size: 1,
    hiddenFromPlayers: false,
    layer: 'tokens',
  };

  const hiddenToken: TacticalToken = {
    id: 'tok-hid',
    npcId: 'npc-hid',
    gridX: 8,
    gridY: 4,
    facing: 3,
    elevation: 0,
    reach: 1,
    size: 1,
    hiddenFromPlayers: false,
    layer: 'tokens',
  };

  const gmLayerInstantToken: TacticalToken = {
    id: 'tok-inst-gm',
    npcId: '',
    isInstant: true,
    customName: 'Armadilha Oculta',
    gridX: 2,
    gridY: 2,
    facing: 0,
    elevation: 0,
    reach: 1,
    size: 1,
    hiddenFromPlayers: true,
    layer: 'gm',
  };

  const tokens = [visibleToken, hiddenToken, gmLayerInstantToken];
  const characters = [visibleNpc, hiddenNpc];

  it('oculta token de NPC com isVisibleToPlayer=false e token instantâneo oculto/GM para jogador e visão de jogador', () => {
    const revealedFog: TacticalFogMask = { base: 'revealed', ops: [] };
    const hidPt = getHexCenter(hiddenToken.gridX, hiddenToken.gridY, hexSize);
    const gmPt = getHexCenter(gmLayerInstantToken.gridX, gmLayerInstantToken.gridY, hexSize);

    // Jogador / Visualizador (isMaster = false)
    expect(
      findVisibleRulerTargetToken({
        targetCoord: { col: hiddenToken.gridX, row: hiddenToken.gridY },
        targetPoint: hidPt,
        tokens,
        characters,
        fogMask: revealedFog,
        isMaster: false,
        isPlayerView: false,
      })
    ).toBeUndefined();

    expect(
      findVisibleRulerTargetToken({
        targetCoord: { col: gmLayerInstantToken.gridX, row: gmLayerInstantToken.gridY },
        targetPoint: gmPt,
        tokens,
        characters,
        fogMask: revealedFog,
        isMaster: false,
        isPlayerView: false,
      })
    ).toBeUndefined();

    // Mestre simulando visão de jogador (isPlayerView = true) também não vê
    expect(
      findVisibleRulerTargetToken({
        targetCoord: { col: hiddenToken.gridX, row: hiddenToken.gridY },
        targetPoint: hidPt,
        tokens,
        characters,
        fogMask: revealedFog,
        isMaster: true,
        isPlayerView: true,
      })
    ).toBeUndefined();

    // Mestre em visão normal vê ambos
    expect(
      findVisibleRulerTargetToken({
        targetCoord: { col: hiddenToken.gridX, row: hiddenToken.gridY },
        targetPoint: hidPt,
        tokens,
        characters,
        fogMask: revealedFog,
        isMaster: true,
        isPlayerView: false,
      })?.id
    ).toBe('tok-hid');
  });

  it('não expõe token visível quando o hex alvo está coberto por névoa (base hidden ou op hide), e expõe após reveal', () => {
    const visPt = getHexCenter(visibleToken.gridX, visibleToken.gridY, hexSize);

    // 1. Tudo sob névoa (base: 'hidden')
    const allHiddenFog: TacticalFogMask = { base: 'hidden', ops: [] };
    expect(
      findVisibleRulerTargetToken({
        targetCoord: { col: visibleToken.gridX, row: visibleToken.gridY },
        targetPoint: visPt,
        tokens,
        characters,
        fogMask: allHiddenFog,
        isMaster: false,
        isPlayerView: false,
      })
    ).toBeUndefined();

    // 2. Mapa revelado, mas com círculo de névoa cobrindo o token
    const circleHideFog: TacticalFogMask = {
      base: 'revealed',
      ops: [{ op: 'hide', shape: 'circle', x: visPt.x, y: visPt.y, radius: 50 }],
    };
    expect(
      findVisibleRulerTargetToken({
        targetCoord: { col: visibleToken.gridX, row: visibleToken.gridY },
        targetPoint: visPt,
        tokens,
        characters,
        fogMask: circleHideFog,
        isMaster: false,
        isPlayerView: false,
      })
    ).toBeUndefined();

    // 3. Operação posterior de reveal descobre o ponto do token
    const revealedAfterFog: TacticalFogMask = {
      base: 'hidden',
      ops: [
        {
          op: 'reveal',
          shape: 'rect',
          x: visPt.x - 30,
          y: visPt.y - 30,
          width: 60,
          height: 60,
        },
      ],
    };
    expect(
      findVisibleRulerTargetToken({
        targetCoord: { col: visibleToken.gridX, row: visibleToken.gridY },
        targetPoint: visPt,
        tokens,
        characters,
        fogMask: revealedAfterFog,
        isMaster: false,
        isPlayerView: false,
      })?.id
    ).toBe('tok-vis');
  });
});

describe('mesaPermissions — Sanitização real na fronteira de transmissão do sync', () => {
  const originalWindow = (globalThis as any).window;
  const originalLocalStorage = (globalThis as any).localStorage;

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
    if (originalWindow === undefined) {
      delete (globalThis as any).window;
    } else {
      (globalThis as any).window = originalWindow;
    }
    if (originalLocalStorage === undefined) {
      delete (globalThis as any).localStorage;
    } else {
      (globalThis as any).localStorage = originalLocalStorage;
    }
  });

  it('intercepta o JSON publicado em hubMesaBus.publish e confirma remoção de users[].password e segredos', async () => {
    vi.useFakeTimers();

    const publishedMessages: string[] = [];
    const mockHubMesaBus = {
      publish: vi.fn((msg: string) => {
        publishedMessages.push(msg);
      }),
      subscribe: vi.fn(() => () => {}),
    };

    const storageMap = new Map<string, string>();
    (globalThis as any).localStorage = {
      getItem: (k: string) => storageMap.get(k) ?? null,
      setItem: (k: string, v: string) => {
        storageMap.set(k, String(v));
      },
      removeItem: (k: string) => {
        storageMap.delete(k);
      },
    };

    const mockParent = { hubMesaBus: mockHubMesaBus };
    (globalThis as any).window = {
      location: { search: '', href: 'https://hounds.local/mesa.html' },
      parent: mockParent,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    // Importa o serviço real de sincronização da aplicação com o canal interceptado
    const { onlineSyncService } = await import('../onlineSync');
    onlineSyncService.connect('THE-HOUNDS');

    // Avança o timer de 60ms do connectHubBus() para concluir a conexão
    vi.advanceTimersByTime(100);

    const usersWithPasswords: UserAccount[] = [
      {
        id: 'u-mestre',
        name: 'Leandro',
        role: 'mestre',
        password: 'SENHA-SUPER-SECRETA-GM',
        needsPasswordReset: false,
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'u-player',
        name: 'Renato',
        role: 'jogador',
        password: 'minha-senha-pessoal-123',
        needsPasswordReset: false,
        createdAt: '2026-01-02T00:00:00Z',
      },
    ];
    const usersSnapshotBefore = JSON.stringify(usersWithPasswords);

    const combatWithSecrets: Combat = {
      id: 'c-sync-1',
      name: 'Batalha',
      round: 1,
      createdAt: '2026-11-21T00:00:00Z',
      npcs: [
        makeNpc({
          id: 'npc-sync-1',
          name: 'Lich',
          history: [
            { id: 'h-pub', timestamp: '2026-11-21T00:01:00Z', author: 'mestre', type: 'roll', description: 'Público' },
            { id: 'h-sec', timestamp: '2026-11-21T00:02:00Z', author: 'mestre', type: 'roll', isSecret: true, description: 'Secreto' },
          ],
        }),
      ],
      events: [
        { id: 'e-pub', timestamp: '2026-11-21T00:03:00Z', author: 'mestre', type: 'note', description: 'Evento público' },
        { id: 'e-sec', timestamp: '2026-11-21T00:04:00Z', author: 'mestre', type: 'roll', isSecret: true, description: 'Evento secreto' },
      ],
    };

    // Dispara envio real através do onlineSyncService (fronteira de transmissão)
    onlineSyncService.sendPayloadImmediate({
      type: 'SYNC_FULL',
      users: usersWithPasswords,
      combats: [combatWithSecrets],
      players: [],
      conditions: [],
      activeCombatId: 'c-sync-1',
    });

    const syncFullRaw = publishedMessages.find((raw) => {
      try {
        return JSON.parse(raw).type === 'SYNC_FULL';
      } catch {
        return false;
      }
    });

    expect(syncFullRaw).toBeDefined();
    // Garante que nenhuma senha aparece em lugar algum do payload JSON transmitido
    expect(syncFullRaw).not.toContain('SENHA-SUPER-SECRETA-GM');
    expect(syncFullRaw).not.toContain('minha-senha-pessoal-123');

    const transmitted = JSON.parse(syncFullRaw!);
    expect(transmitted.users).toHaveLength(2);
    for (const user of transmitted.users) {
      expect('password' in user).toBe(false);
      expect(user.password).toBeUndefined();
    }
    expect(transmitted.users[0].name).toBe('Leandro');
    expect(transmitted.users[1].name).toBe('Renato');

    // Segredos de combate e histórico também removidos na transmissão
    expect(transmitted.combats[0].events.map((e: any) => e.id)).toEqual(['e-pub']);
    expect(transmitted.combats[0].npcs[0].history.map((h: any) => h.id)).toEqual(['h-pub']);

    // Não mutou o array original de usuários em memória
    expect(JSON.stringify(usersWithPasswords)).toBe(usersSnapshotBefore);

    onlineSyncService.disconnect();
  });
});
