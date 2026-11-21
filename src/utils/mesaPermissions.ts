import { ActionLogEntry, Combat, MesaRole, NPC, UserAccount } from '../types/rpg';
import { TacticalFogMask, TacticalToken } from '../types/tactical';
import { HexCoord, Point, isPointInPolygon } from './tacticalMath';

/**
 * Apenas o papel 'mestre' pode ver informações secretas (rolagens ocultas, NPCs ocultos,
 * notas do mestre e tokens sob névoa/camada GM). Tanto 'jogador' quanto 'visualizador'
 * não têm acesso a segredos.
 */
export function canSeeMasterSecrets(role: MesaRole): boolean {
  return role === 'mestre';
}

/**
 * Coleta e filtra as entradas de log visíveis para o papel atual ('mestre', 'jogador' ou 'visualizador').
 * Usada diretamente pelo GeneralCombatLog para garantir consistência de visibilidade.
 */
export function filterVisibleLogEntries(params: {
  activeCombat: Combat | undefined;
  additionalCharacters?: NPC[];
  sessionEvents?: ActionLogEntry[];
  currentUserRole: MesaRole;
}): any[] {
  const { activeCombat, additionalCharacters, sessionEvents = [], currentUserRole } = params;
  const isMaster = canSeeMasterSecrets(currentUserRole);

  const isNoCombat =
    !activeCombat ||
    activeCombat.id === 'combat-vazio' ||
    activeCombat.name?.toLowerCase().includes('vazio') ||
    activeCombat.name?.toLowerCase().trim() === 'sem combate';

  const combinedCharacters = [
    ...(additionalCharacters || []),
    ...(isNoCombat
      ? []
      : activeCombat?.npcs?.filter((n) => !additionalCharacters?.some((p) => p.id === n.id)) || []),
  ];

  const list: any[] = [];
  const seenIds = new Set<string>();

  // 1. Eventos e rolagens gerais da Mesa de RPG
  const baseEvents = [...(sessionEvents || []), ...(activeCombat?.events || [])];
  for (const ev of baseEvents) {
    if (!isMaster && (ev.isSecret || (ev as any).hiddenFromPlayers)) {
      continue;
    }
    if (!seenIds.has(ev.id)) {
      seenIds.add(ev.id);
      let comment = ev.comment;
      if (!comment && ev.npcId) {
        const char = combinedCharacters.find((c) => c.id === ev.npcId);
        const histEntry = char?.history?.find((h: any) => h.id === ev.id);
        if (histEntry?.comment) {
          comment = histEntry.comment;
        }
      }
      list.push({
        ...ev,
        comment,
        npcName: ev.npcName || ev.authorName || 'Mestre',
        npcCharacterType: ev.npcCharacterType || 'npc',
      });
    }
  }

  // 2. Histórico individual dos combatentes
  for (const npc of combinedCharacters) {
    const isPlayerChar = npc.characterType === 'player';

    // Personagens são sempre visíveis; NPCs respeitam isVisibleToPlayer
    if (!isMaster && !isPlayerChar && npc.isVisibleToPlayer === false) {
      continue;
    }

    for (const entry of npc.history || []) {
      if (!isMaster && (entry.isSecret || (entry as any).hiddenFromPlayers)) {
        continue;
      }

      // Alterações de status feitas pelo mestre nos NPCs não refletem para jogadores/visualizadores
      if (!isMaster && !isPlayerChar && entry.author === 'mestre' && entry.type !== 'roll') {
        continue;
      }

      if (!seenIds.has(entry.id)) {
        seenIds.add(entry.id);
        list.push({
          ...entry,
          npcId: npc.id,
          npcName: npc.name || 'Personagem',
          npcAvatar: npc.avatar,
          npcPreset: npc.avatarPreset,
          npcCharacterType: npc.characterType || 'npc',
          playerName: npc.playerName || '',
        });
      } else {
        const existing = list.find((x) => x.id === entry.id);
        if (existing && !existing.comment && entry.comment) {
          existing.comment = entry.comment;
        }
      }
    }
  }

  return list;
}

/**
 * Verifica se um ponto (no espaço relativo do mapa) está coberto por névoa de guerra
 * para o observador atual. No modo visão do Mestre (não-playerView), nada fica oculto.
 */
export function isPointUnderFogMask(
  point: Point,
  fogMask: TacticalFogMask,
  canBypassFog: boolean
): boolean {
  if (canBypassFog) return false;
  let hidden = fogMask.base === 'hidden';
  for (const item of fogMask.ops) {
    let inside = false;
    if (item.shape === 'circle') {
      const dx = point.x - item.x;
      const dy = point.y - item.y;
      inside = dx * dx + dy * dy <= item.radius * item.radius;
    } else if (item.shape === 'rect') {
      inside =
        point.x >= item.x &&
        point.x <= item.x + item.width &&
        point.y >= item.y &&
        point.y <= item.y + item.height;
    } else if (item.shape === 'polygon' && Array.isArray(item.points) && item.points.length >= 3) {
      inside = isPointInPolygon(point, item.points);
    }
    if (inside) {
      hidden = item.op === 'hide';
    }
  }
  return hidden;
}

/**
 * Determina se um token está oculto para jogadores/visualizadores.
 */
export function isTokenHiddenFromPlayers(token: TacticalToken, npc?: NPC): boolean {
  if (token.isInstant) {
    return !!token.hiddenFromPlayers || token.layer === 'gm';
  }
  if (npc?.characterType === 'player') {
    return !!token.hiddenFromPlayers || token.layer === 'gm';
  }
  return !npc?.isVisibleToPlayer || !!token.hiddenFromPlayers || token.layer === 'gm';
}

/**
 * Resolve o token alvo sob a ponta da régua tática respeitando névoa de guerra e visibilidade.
 * Retorna undefined se o alvo estiver sob névoa ou oculto para o papel/visão atual.
 */
export function findVisibleRulerTargetToken(params: {
  targetCoord: HexCoord;
  targetPoint: Point;
  tokens: TacticalToken[];
  characters: NPC[];
  fogMask: TacticalFogMask;
  isMaster: boolean;
  isPlayerView: boolean;
}): TacticalToken | undefined {
  const { targetCoord, targetPoint, tokens, characters, fogMask, isMaster, isPlayerView } = params;
  const canBypass = !isPlayerView && isMaster;

  if (isPointUnderFogMask(targetPoint, fogMask, canBypass)) {
    return undefined;
  }

  return tokens.find((t) => {
    if (t.gridX !== targetCoord.col || t.gridY !== targetCoord.row) return false;
    if (!canBypass) {
      const npc = characters.find((c) => c.id === t.npcId);
      if (isTokenHiddenFromPlayers(t, npc)) return false;
    }
    return true;
  });
}

/**
 * Remove o campo `password` de todas as contas de usuário antes da transmissão de sync.
 */
export function sanitizeUsersForSync(users?: UserAccount[]): UserAccount[] {
  if (!Array.isArray(users)) return [];
  return users.map(({ password: _password, ...safeUser }) => safeUser) as UserAccount[];
}

/**
 * Remove entradas secretas do histórico de um NPC/Personagem antes da transmissão de sync.
 */
export function sanitizeNpcForSync(npc: NPC): NPC {
  return {
    ...npc,
    history: Array.isArray(npc.history) ? npc.history.filter((h) => !h?.isSecret) : npc.history,
  };
}

/**
 * Sanitiza um combate removendo eventos secretos e entradas secretas do histórico dos NPCs.
 */
export function sanitizeCombatForSync(combat: Combat): Combat {
  return {
    ...combat,
    npcs: Array.isArray(combat.npcs) ? combat.npcs.map(sanitizeNpcForSync) : [],
    events: Array.isArray(combat.events) ? combat.events.filter((e) => !e?.isSecret) : [],
  };
}

/**
 * Sanitiza qualquer payload de sincronização na fronteira de envio,
 * garantindo que `users[].password` nunca seja transmitido.
 */
export function sanitizeOutgoingSyncPayload<
  T extends { users?: UserAccount[]; combats?: Combat[]; players?: NPC[]; npc?: NPC }
>(payload: T): T {
  const next: T = { ...payload };
  if (Array.isArray(payload.users)) {
    next.users = sanitizeUsersForSync(payload.users);
  }
  if (Array.isArray(payload.combats)) {
    next.combats = payload.combats.map(sanitizeCombatForSync);
  }
  if (Array.isArray(payload.players)) {
    next.players = payload.players.map(sanitizeNpcForSync);
  }
  if (payload.npc) {
    next.npc = sanitizeNpcForSync(payload.npc);
  }
  return next;
}
