import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Combat, NPC, ConditionDefinition, ActionLogEntry, UserAccount, UserRole, Weapon, ExtraItem } from './types/rpg';
import { INITIAL_COMBATS, EMPTY_COMBAT_PRESET, HOUNDS_PLAYERS, AZUR_CHARACTER } from './utils/presets';
import { createNewNpc, DEFAULT_CONDITIONS, getNextIncrementalName, isSameLocation, COMBAT_MANEUVERS } from './utils/gurps';
import { onlineSyncService, SyncStatus, RemoteSyncPayload } from './utils/onlineSync';
import { TopNav, ViewMode } from './components/TopNav';
import { NpcListBar } from './components/NpcListBar';
import { NpcDetailView } from './components/NpcDetailView';
import { TacticalMapWorkspace } from './components/TacticalMap/TacticalMapWorkspace';
import { TacticalState, DEFAULT_TACTICAL_STATE } from './types/tactical';
import { DamageCalculatorModal } from './components/DamageCalculatorModal';
import { AvatarPickerModal } from './components/AvatarPickerModal';
import { CombatManagerModal } from './components/CombatManagerModal';
import { ConditionsCrudModal } from './components/ConditionsCrudModal';
import { UserAccountsCrudModal } from './components/UserAccountsCrudModal';
import { LoginModal } from './components/LoginModal';
import { WeaponModal } from './components/WeaponModal';
import { OnlineRoomModal } from './components/OnlineRoomModal';
import { PlayerPermissionsModal } from './components/PlayerPermissionsModal';
import { CombatPlayersModal } from './components/CombatPlayersModal';
import { GeneralCombatLog } from './components/GeneralCombatLog';
import { SystemLogModal } from './components/SystemLogModal';
import { systemLogger } from './utils/systemLogger';
import { Swords, Plus, EyeOff } from 'lucide-react';

const STORAGE_KEY = 'gurps_combat_master_data_v2';
const CONDITIONS_KEY = 'gurps_combat_master_conditions_v2';
const USERS_STORAGE_KEY = 'gurps_combat_master_users_v2';
const PLAYERS_STORAGE_KEY = 'gurps_fixed_personagens_v1';
const ACTIVE_COMBAT_KEY = 'gurps_combat_master_active_combat_id_v1';
const SYNC_CHANNEL_NAME = 'gurps_combat_realtime_sync_v2';

// Função de fusão granular por personagem (CRDT LWW) com suporte a adições e edições sem perda de registros
function mergeNpcLists(currentList: NPC[], incomingList: NPC[]): { merged: NPC[]; changed: boolean } {
  let changed = false;
  const currentMap = new Map<string, NPC>();
  currentList.forEach((n) => currentMap.set(n.id, n));

  for (const incoming of incomingList) {
    const existing = currentMap.get(incoming.id);
    if (!existing) {
      currentMap.set(incoming.id, incoming);
      changed = true;
    } else {
      const incomingTime = incoming.updatedAt || 0;
      const existingTime = existing.updatedAt || 0;

      const hasContentDiff =
        incoming.hpCurrent !== existing.hpCurrent ||
        incoming.fpCurrent !== existing.fpCurrent ||
        (incoming.history?.length !== existing.history?.length) ||
        JSON.stringify(incoming.history || []) !== JSON.stringify(existing.history || []) ||
        JSON.stringify(incoming.statusConditions || []) !== JSON.stringify(existing.statusConditions || []) ||
        JSON.stringify(incoming.extraItems || []) !== JSON.stringify(existing.extraItems || []) ||
        JSON.stringify(incoming.activeSpells || []) !== JSON.stringify(existing.activeSpells || []) ||
        JSON.stringify(incoming.affectedSpells || []) !== JSON.stringify(existing.affectedSpells || []) ||
        JSON.stringify(incoming.turnActions || {}) !== JSON.stringify(existing.turnActions || {});

      if (incomingTime > existingTime || (incomingTime === existingTime && hasContentDiff)) {
        currentMap.set(incoming.id, incoming);
        changed = true;
      } else if (incomingTime === existingTime) {
        const incActions = incoming.turnActions || { parryCount: 0, dodgeCount: 0, blockCount: 0 };
        const extActions = existing.turnActions || { parryCount: 0, dodgeCount: 0, blockCount: 0 };
        const incSum = (incActions.parryCount || 0) + (incActions.dodgeCount || 0) + (incActions.blockCount || 0);
        const extSum = (extActions.parryCount || 0) + (extActions.dodgeCount || 0) + (extActions.blockCount || 0);
        if (incSum > extSum) {
          currentMap.set(incoming.id, incoming);
          changed = true;
        }
      }
    }
  }

  return { merged: Array.from(currentMap.values()), changed };
}

function mergeCombats(currentCombats: Combat[], incomingCombats: Combat[]): { merged: Combat[]; changed: boolean } {
  let changed = false;
  const currentMap = new Map<string, Combat>();
  currentCombats.forEach((c) => currentMap.set(c.id, c));

  const incomingMap = new Map<string, Combat>();
  incomingCombats.forEach((c) => incomingMap.set(c.id, c));

  const merged: Combat[] = [];

  for (const incoming of incomingCombats) {
    const existing = currentMap.get(incoming.id);
    if (!existing) {
      merged.push(incoming);
      changed = true;
    } else {
      const { merged: mergedNpcs, changed: npcsChanged } = mergeNpcLists(existing.npcs || [], incoming.npcs || []);
      const playerIdsChanged = JSON.stringify(existing.playerIds || []) !== JSON.stringify(incoming.playerIds || []);
      const editorIdsChanged = JSON.stringify(existing.editorUserIds || []) !== JSON.stringify(incoming.editorUserIds || []);
      const nameChanged = existing.name !== incoming.name;
      const isActiveChanged = existing.isActive !== incoming.isActive;
      const existingRound = existing.currentRound ?? (existing as any).round ?? 0;
      const incomingRound = incoming.currentRound ?? (incoming as any).round ?? 0;
      const roundChanged = existingRound !== incomingRound;
      const tacticalChanged = JSON.stringify(existing.tacticalState) !== JSON.stringify(incoming.tacticalState);

      if (npcsChanged || playerIdsChanged || editorIdsChanged || nameChanged || isActiveChanged || roundChanged || tacticalChanged) {
        changed = true;
      }
      merged.push({
        ...existing,
        ...incoming,
        npcs: mergedNpcs,
        currentRound: incoming.currentRound !== undefined ? incoming.currentRound : incomingRound,
        round: incoming.round !== undefined ? incoming.round : incomingRound,
        playerIds: incoming.playerIds !== undefined ? incoming.playerIds : existing.playerIds,
        editorUserIds: incoming.editorUserIds !== undefined ? incoming.editorUserIds : existing.editorUserIds,
        isActive: incoming.isActive !== undefined ? incoming.isActive : existing.isActive,
      });
    }
  }

  // Se havia combates locais que foram excluídos remotamente
  if (currentCombats.some((c) => !incomingMap.has(c.id))) {
    changed = true;
  }

  return { merged, changed };
}

const DEFAULT_USERS: UserAccount[] = [
  {
    id: 'user-leandro',
    name: 'Leandro',
    role: 'mestre',
    password: '230589',
    needsPasswordReset: false,
    createdAt: new Date().toLocaleDateString('pt-BR'),
  },
  {
    id: 'user-jogador',
    name: 'Jogador',
    role: 'jogador',
    password: '123',
    needsPasswordReset: false,
    createdAt: new Date().toLocaleDateString('pt-BR'),
  },
];

export default function App() {
  // 1. Initial Combats State from LocalStorage (guarda os combates e seus NPCs)
  const [combats, setCombats] = useState<Combat[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const empty = parsed.find((c: Combat) => c.id === 'combat-vazio' || c.name.toLowerCase().includes('vazio')) || EMPTY_COMBAT_PRESET;
          const others = parsed.filter((c: Combat) => c.id !== empty.id && !c.name.toLowerCase().includes('vazio'));
          return [{ ...empty, name: 'Sem combate' }, ...others];
        }
      }
    } catch (e) {
      console.error('Failed to load saved combats', e);
    }
    return INITIAL_COMBATS;
  });

  // 2. Personagens Fixos (Globais, persistem independente do combate selecionado)
  const [players, setPlayers] = useState<NPC[]>(() => {
    try {
      const saved = localStorage.getItem(PLAYERS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      // Se não havia chave específica, recupera os personagens de combates anteriores
      const savedCombats = localStorage.getItem(STORAGE_KEY);
      if (savedCombats) {
        const parsedCombats = JSON.parse(savedCombats);
        if (Array.isArray(parsedCombats)) {
          const found: NPC[] = [];
          const seen = new Set<string>();
          for (const c of parsedCombats) {
            for (const n of (c.npcs || [])) {
              if (n.characterType === 'player' && !seen.has(n.id)) {
                seen.add(n.id);
                found.push(n);
              }
            }
          }
          if (found.length > 0) return found;
        }
      }
    } catch (e) {
      console.error('Failed to load saved players', e);
    }
    return HOUNDS_PLAYERS; // Padrão: Azur + 10 Personagens
  });

  // Salva Personagens Fixos no LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(PLAYERS_STORAGE_KEY, JSON.stringify(players));
    } catch (e) {}
  }, [players]);

  // 3. Conditions CRUD State from LocalStorage
  const [conditions, setConditions] = useState<ConditionDefinition[]>(() => {
    try {
      const saved = localStorage.getItem(CONDITIONS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load saved conditions', e);
    }
    return DEFAULT_CONDITIONS;
  });

  // 4. User Accounts State (Default: Mestre Leandro)
  const [users, setUsers] = useState<UserAccount[]>(() => {
    try {
      const saved = localStorage.getItem(USERS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const updated = parsed.map((u: UserAccount) => {
            if (u.id === 'user-leandro' || u.name.toLowerCase() === 'leandro' || u.role === 'mestre') {
              return { ...u, password: '230589', needsPasswordReset: false };
            }
            return u;
          });
          try {
            localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updated));
          } catch {}
          return updated;
        }
      }
    } catch (e) {
      console.error('Failed to load users from localStorage', e);
    }
    return DEFAULT_USERS;
  });

  // Salva Usuários no LocalStorage sempre que houver alteração
  useEffect(() => {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch (e) {}
  }, [users]);

  // Current Logged-in User
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      if (typeof window !== 'undefined' && window.parent && (window.parent as any).hubUser) {
        return (window.parent as any).hubUser;
      }
      const saved = localStorage.getItem('hounds_active_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) return parsed;
      }
    } catch (e) {}
    return null;
  });

  const [activeCombatId, setActiveCombatId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_COMBAT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed === 'string' && combats.some((c) => c.id === parsed)) {
          return parsed;
        }
      }
    } catch (e) {}
    return combats[0]?.id || 'combat-vazio';
  });

  // Salva Combate Ativo no LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_COMBAT_KEY, JSON.stringify(activeCombatId));
    } catch (e) {}
  }, [activeCombatId]);

  const activeCombat = combats.find((c) => c.id === activeCombatId) || combats[0];
  const isNoCombat = !activeCombat || activeCombat.id === 'combat-vazio' || activeCombat.name?.toLowerCase().includes('vazio') || activeCombat.name?.toLowerCase().trim() === 'sem combate';

  // IDs dos personagens de jogadores visíveis no combate ativo (por padrão, todos)
  const activeCombatPlayerIds = useMemo(() => {
    if (activeCombat && Array.isArray(activeCombat.playerIds)) {
      return activeCombat.playerIds;
    }
    return players.map((p) => p.id);
  }, [activeCombat, players]);

  // Lista unificada: Personagens Visíveis no Combate + NPCs específicos do combate ativo
  const allCharacters = useMemo(() => {
    const list: NPC[] = [];
    const seen = new Set<string>();
    const activePlayerSet = new Set(activeCombatPlayerIds);

    // Todos os personagens criados no sistema sempre entram nos combates
    for (const p of players) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        list.push(p);
      }
    }
    for (const c of combats) {
      for (const n of c.npcs || []) {
        if (n.characterType === 'player' && !seen.has(n.id)) {
          seen.add(n.id);
          list.push({ ...n, isVisibleToPlayer: true });
        }
      }
    }
    // NPCs específicos do combate ativo
    for (const n of activeCombat?.npcs || []) {
      if (n.characterType !== 'player' && !seen.has(n.id)) {
        seen.add(n.id);
        list.push(n);
      }
    }
    return list;
  }, [players, combats, activeCombat, activeCombatPlayerIds]);

  const [selectedNpcId, setSelectedNpcId] = useState<string>(() => {
    return allCharacters[0]?.id || '';
  });

  const selectedNpc = allCharacters.find((n: NPC) => n.id === selectedNpcId) || allCharacters[0];

  // Online Sync Status State
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('disconnected');
  const [currentRoom, setCurrentRoom] = useState<string>(onlineSyncService.getRoom());
  const [onlineRoomModalOpen, setOnlineRoomModalOpen] = useState(false);

  // Modals state
  const [combatManagerOpen, setCombatManagerOpen] = useState(false);
  const [conditionsCrudOpen, setConditionsCrudOpen] = useState(false);
  const [userAccountsModalOpen, setUserAccountsModalOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined' && window.parent && (window.parent as any).hubUser) {
        return false;
      }
      const saved = localStorage.getItem('hounds_active_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) return false;
      }
    } catch (e) {}
    return true;
  });
  const [damageModalNpc, setDamageModalNpc] = useState<NPC | null>(null);
  const [avatarModalNpc, setAvatarModalNpc] = useState<NPC | null>(null);
  const [weaponModalState, setWeaponModalState] = useState<{ isOpen: boolean; weapon?: Weapon | null }>({
    isOpen: false,
    weapon: null,
  });
  const [systemLogModalOpen, setSystemLogModalOpen] = useState(false);
  const [systemLogsCount, setSystemLogsCount] = useState(0);
  const [playerPermsModalOpen, setPlayerPermsModalOpen] = useState(false);
  const [combatPlayersModalOpen, setCombatPlayersModalOpen] = useState(false);
  const [editorUserIds, setEditorUserIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('gurps_combat_master_editors_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  // View Mode: 'sheets' | 'tactical' | 'split'
  const [activeViewMode, setActiveViewMode] = useState<ViewMode>('tactical');

  useEffect(() => {
    return systemLogger.subscribe((logs) => {
      setSystemLogsCount(logs.length);
    });
  }, []);

  // Tactical State do combate ativo
  const activeTacticalState: TacticalState = useMemo(() => {
    return activeCombat?.tacticalState || DEFAULT_TACTICAL_STATE;
  }, [activeCombat?.tacticalState]);

  const handleUpdateTacticalState = (updated: Partial<TacticalState>) => {
    if (!activeCombat) return;
    const current = activeCombat.tacticalState || DEFAULT_TACTICAL_STATE;
    const merged: TacticalState = {
      ...current,
      ...updated,
    };
    const updatedCombats = combats.map((c) =>
      c.id === activeCombatId ? { ...c, tacticalState: merged } : c
    );
    setCombats(updatedCombats);
    broadcastSync(updatedCombats);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  const lastLocalEditTimestampRef = useRef<number>(0);
  const lastAppliedRemoteTimestampRef = useRef<number>(0);

  const stateRef = useRef({ combats, conditions, users, activeCombatId, players });
  useEffect(() => {
    stateRef.current = { combats, conditions, users, activeCombatId, players };
  }, [combats, conditions, users, activeCombatId, players]);

  // Broadcast function: Syncs to local tabs (BroadcastChannel) AND online cross-browser (MQTT WebSocket)
  const broadcastSync = (
    updatedCombats?: Combat[],
    updatedConditions?: ConditionDefinition[],
    updatedUsers?: UserAccount[],
    updatedActiveCombatId?: string,
    updatedPlayers?: NPC[],
    updatedNpc?: NPC
  ) => {
    const editTimestamp = updatedNpc?.updatedAt || Date.now();
    lastLocalEditTimestampRef.current = editTimestamp;

    const finalCombats = updatedCombats || stateRef.current.combats;
    const finalConditions = updatedConditions || stateRef.current.conditions;
    const finalUsers = updatedUsers || stateRef.current.users;
    const finalActiveCombat = updatedActiveCombatId || stateRef.current.activeCombatId;
    const finalPlayers = updatedPlayers || stateRef.current.players;

    systemLogger.addLog('SYNC_SEND', 'Sincronização enviada (Broadcast & MQTT)', {
      combatsCount: finalCombats.length,
      playersCount: finalPlayers.length,
      editTimestamp,
      npcName: updatedNpc?.name,
    });

    // Se houver um NPC específico alterado, envia SYNC_NPC em tempo real (1.5 KB, imediato)
    if (updatedNpc) {
      try {
        broadcastChannelRef.current?.postMessage({
          type: 'SYNC_NPC',
          sourceId: onlineSyncService.getClientId(),
          timestamp: editTimestamp,
          npc: updatedNpc,
        });
      } catch (e) {}

      onlineSyncService.sendPayloadImmediate({
        type: 'SYNC_NPC',
        timestamp: editTimestamp,
        npc: updatedNpc,
      });
    }

    // E sincroniza o estado global via Broadcast e MQTT (com debounce trailing para novos entrantes)
    try {
      broadcastChannelRef.current?.postMessage({
        type: 'SYNC_STATE',
        sourceId: onlineSyncService.getClientId(),
        timestamp: editTimestamp,
        combats: finalCombats,
        conditions: finalConditions,
        users: finalUsers,
        activeCombatId: finalActiveCombat,
        players: finalPlayers,
      });
    } catch (e) {}

    onlineSyncService.sendPayload({
      type: 'SYNC_FULL',
      timestamp: editTimestamp,
      combats: finalCombats,
      conditions: finalConditions,
      users: finalUsers,
      activeCombatId: finalActiveCombat,
      players: finalPlayers,
    });
  };

  // Connect online sync on mount
  useEffect(() => {
    onlineSyncService.connect();

    const unsubStatus = onlineSyncService.onStatusChange((status) => {
      setSyncStatus(status);
    });

    const unsubMsg = onlineSyncService.onSyncMessage((payload: RemoteSyncPayload) => {
      if ((payload as any).type === 'SYNC_EDITORS' && Array.isArray((payload as any).editorUserIds)) {
        setEditorUserIds((payload as any).editorUserIds);
        return;
      }

      if (payload.type === 'SYNC_ROUND' && payload.combatId !== undefined) {
        const combatId = payload.combatId;
        const newRound = payload.round ?? 0;
        const updated = stateRef.current.combats.map((c) =>
          c.id === combatId ? { ...c, currentRound: newRound, round: newRound } : c
        );
        stateRef.current.combats = updated;
        setCombats(updated);
        systemLogger.addLog('SYNC_RECV', `Rodada do combate atualizada para ${newRound} em tempo real`);
        return;
      }

      // 1. Mensagem de NPC individual em tempo real (hiper-rápida, 0 debounce)
      if (payload.type === 'SYNC_NPC' && payload.npc) {
        const incomingNpc = payload.npc;
        const msgTime = payload.timestamp || 0;

        let playersChanged = false;
        let combatsChanged = false;

        let nextPlayers = stateRef.current.players;
        if (nextPlayers.some((p) => p.id === incomingNpc.id)) {
          const res = mergeNpcLists(nextPlayers, [incomingNpc]);
          if (res.changed) {
            nextPlayers = res.merged;
            playersChanged = true;
          }
        }

        let nextCombats = stateRef.current.combats;
        if (nextCombats.some((c) => c.npcs.some((n) => n.id === incomingNpc.id))) {
          nextCombats = nextCombats.map((c) => ({
            ...c,
            npcs: mergeNpcLists(c.npcs, [incomingNpc]).merged,
          }));
          combatsChanged = true;
        }

        if (playersChanged) {
          stateRef.current.players = nextPlayers;
          setPlayers(nextPlayers);
        }
        if (combatsChanged) {
          stateRef.current.combats = nextCombats;
          setCombats(nextCombats);
        }

        if (playersChanged || combatsChanged) {
          systemLogger.addLog(
            'SYNC_RECV',
            `Ficha de "${incomingNpc.name}" atualizada em tempo real (${payload.clientId?.slice(0, 10)}...)`,
            {
              parryCount: incomingNpc.turnActions?.parryCount ?? 0,
              dodgeCount: incomingNpc.turnActions?.dodgeCount ?? 0,
              blockCount: incomingNpc.turnActions?.blockCount ?? 0,
              msgTime,
            }
          );
        }
        return;
      }

      if (payload.type === 'SYNC_FULL') {
        const msgTime = payload.timestamp || 0;

        let playersChanged = false;
        let combatsChanged = false;
        let nextPlayers = stateRef.current.players;
        let nextCombats = stateRef.current.combats;

        if (payload.players && Array.isArray(payload.players) && payload.players.length > 0) {
          const res = mergeNpcLists(stateRef.current.players, payload.players);
          if (res.changed) {
            nextPlayers = res.merged;
            playersChanged = true;
          }
        }

        if (payload.combats && Array.isArray(payload.combats) && payload.combats.length > 0) {
          const res = mergeCombats(stateRef.current.combats, payload.combats);
          if (res.changed) {
            nextCombats = res.merged;
            combatsChanged = true;
          }
        }

        if (playersChanged) {
          stateRef.current.players = nextPlayers;
          setPlayers(nextPlayers);
        }
        if (combatsChanged) {
          stateRef.current.combats = nextCombats;
          setCombats(nextCombats);
        }

        if (playersChanged || combatsChanged) {
          systemLogger.addLog(
            'SYNC_RECV',
            `Atualização remota mesclada com sucesso (${payload.clientId?.slice(0, 10)}...)`,
            { playersChanged, combatsChanged, msgTime }
          );
        }

        if (payload.conditions && Array.isArray(payload.conditions) && payload.conditions.length > 0) {
          if (payload.conditions.length !== stateRef.current.conditions.length) {
            stateRef.current.conditions = payload.conditions;
            setConditions(payload.conditions);
          }
        }
        if (payload.users && Array.isArray(payload.users) && payload.users.length > 0) {
          setUsers((prevUsers) => {
            const map = new Map<string, UserAccount>();
            prevUsers.forEach((u) => map.set(u.id, u));
            payload.users!.forEach((u) => {
              if (
                (u.id === 'user-leandro' || u.name.toLowerCase() === 'leandro' || u.role === 'mestre') &&
                u.password === '123'
              ) {
                u = { ...u, password: '230589' };
              }
              map.set(u.id, u);
            });
            return Array.from(map.values());
          });
        }
        if (payload.activeCombatId && payload.activeCombatId !== stateRef.current.activeCombatId) {
          if (currentUser?.role !== 'mestre' || msgTime > (lastLocalEditTimestampRef.current || 0)) {
            stateRef.current.activeCombatId = payload.activeCombatId;
            setActiveCombatId(payload.activeCombatId);
          }
        }
      } else if (payload.type === 'REQUEST_SYNC') {
        if (stateRef.current.combats.length > 0 || stateRef.current.players.length > 0) {
          onlineSyncService.sendPayloadImmediate({
            type: 'SYNC_FULL',
            combats: stateRef.current.combats,
            conditions: stateRef.current.conditions,
            users: stateRef.current.users,
            activeCombatId: stateRef.current.activeCombatId,
            players: stateRef.current.players,
            timestamp: lastLocalEditTimestampRef.current || 1,
          });
        }
      }
    });

    return () => {
      unsubStatus();
      unsubMsg();
    };
  }, []);

  // Listen to same-browser tab BroadcastChannel (mantém canal persistente para não cancelar envios)
  useEffect(() => {
    try {
      const channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
      broadcastChannelRef.current = channel;

      channel.onmessage = (event) => {
        if (event.data?.sourceId === onlineSyncService.getClientId()) return;

        if (event.data?.type === 'SYNC_EDITORS' && Array.isArray(event.data.editorUserIds)) {
          setEditorUserIds(event.data.editorUserIds);
          return;
        }

        if (event.data?.type === 'SYNC_ROUND' && event.data.combatId !== undefined) {
          const combatId = event.data.combatId;
          const newRound = event.data.round ?? 0;
          const updated = stateRef.current.combats.map((c) =>
            c.id === combatId ? { ...c, currentRound: newRound, round: newRound } : c
          );
          stateRef.current.combats = updated;
          setCombats(updated);
          return;
        }

        // Atualização individual de NPC entre abas locais
        if (event.data?.type === 'SYNC_NPC' && event.data.npc) {
          const incomingNpc = event.data.npc;
          let playersChanged = false;
          let combatsChanged = false;

          let nextPlayers = stateRef.current.players;
          if (nextPlayers.some((p) => p.id === incomingNpc.id)) {
            const res = mergeNpcLists(nextPlayers, [incomingNpc]);
            if (res.changed) {
              nextPlayers = res.merged;
              playersChanged = true;
            }
          }

          let nextCombats = stateRef.current.combats;
          if (nextCombats.some((c) => c.npcs.some((n) => n.id === incomingNpc.id))) {
            nextCombats = nextCombats.map((c) => ({
              ...c,
              npcs: mergeNpcLists(c.npcs, [incomingNpc]).merged,
            }));
            combatsChanged = true;
          }

          if (playersChanged) {
            stateRef.current.players = nextPlayers;
            setPlayers(nextPlayers);
          }
          if (combatsChanged) {
            stateRef.current.combats = nextCombats;
            setCombats(nextCombats);
          }

          if (playersChanged || combatsChanged) {
            systemLogger.addLog('BROADCAST', `Ficha de "${incomingNpc.name}" atualizada via aba local`, {
              parryCount: incomingNpc.turnActions?.parryCount ?? 0,
              dodgeCount: incomingNpc.turnActions?.dodgeCount ?? 0,
              blockCount: incomingNpc.turnActions?.blockCount ?? 0,
            });
          }
          return;
        }

        if (event.data?.type === 'SYNC_STATE') {
          let playersChanged = false;
          let combatsChanged = false;
          let nextPlayers = stateRef.current.players;
          let nextCombats = stateRef.current.combats;

          if (event.data.players && Array.isArray(event.data.players)) {
            const res = mergeNpcLists(stateRef.current.players, event.data.players);
            if (res.changed) {
              nextPlayers = res.merged;
              playersChanged = true;
            }
          }

          if (event.data.combats && Array.isArray(event.data.combats)) {
            const res = mergeCombats(stateRef.current.combats, event.data.combats);
            if (res.changed) {
              nextCombats = res.merged;
              combatsChanged = true;
            }
          }

          if (playersChanged) {
            stateRef.current.players = nextPlayers;
            setPlayers(nextPlayers);
          }
          if (combatsChanged) {
            stateRef.current.combats = nextCombats;
            setCombats(nextCombats);
          }

          if (playersChanged || combatsChanged) {
            systemLogger.addLog('BROADCAST', `Sincronização entre abas mesclada`, {
              playersChanged,
              combatsChanged,
              sourceId: event.data.sourceId,
            });
          }

          if (event.data.conditions && Array.isArray(event.data.conditions)) {
            stateRef.current.conditions = event.data.conditions;
            setConditions(event.data.conditions);
          }
          if (event.data.users && Array.isArray(event.data.users)) {
            stateRef.current.users = event.data.users;
            setUsers(event.data.users);
          }
          if (event.data.activeCombatId) {
            stateRef.current.activeCombatId = event.data.activeCombatId;
            setActiveCombatId(event.data.activeCombatId);
          }
        }
      };

      return () => {
        channel.close();
        broadcastChannelRef.current = null;
      };
    } catch (e) {}
  }, []);

  // Save Combats to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(combats));
    } catch (e) {
      console.error('Failed to save combats to localStorage', e);
    }
  }, [combats]);

  // Save Conditions to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(CONDITIONS_KEY, JSON.stringify(conditions));
    } catch (e) {
      console.error('Failed to save conditions to localStorage', e);
    }
  }, [conditions]);

  // Save Users to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch (e) {
      console.error('Failed to save users to localStorage', e);
    }
  }, [users]);

  // Combat Handlers
  const handleSelectCombat = (id: string) => {
    if (currentUser && currentUser.role !== 'mestre') return;
    setActiveCombatId(id);
    const target = combats.find((c) => c.id === id);
    // Preserva o personagem selecionado se for um Personagem fixo; caso contrário ajusta
    const isCurrentPlayer = players.some((p) => p.id === selectedNpcId);
    if (!isCurrentPlayer) {
      const targetNpcs = target?.npcs?.filter((n) => n.characterType !== 'player') || [];
      if (targetNpcs.length > 0) {
        setSelectedNpcId(targetNpcs[0].id);
      } else if (players.length > 0) {
        setSelectedNpcId(players[0].id);
      }
    }
    broadcastSync(undefined, undefined, undefined, id);
  };

  const handleCreateCombat = (name: string, description?: string) => {
    const id = `combat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newCombat: Combat = {
      id,
      name,
      description: description || '',
      createdAt: new Date().toLocaleDateString('pt-BR'),
      npcs: [],
      playerIds: players.map((p) => p.id), // Todos os personagens criados sempre entram nos combates
      isActive: true,
    };
    const empty = combats.find((c) => c.id === 'combat-vazio' || c.name.toLowerCase().includes('vazio')) || EMPTY_COMBAT_PRESET;
    const others = combats.filter((c) => c.id !== empty.id && !c.name.toLowerCase().includes('vazio'));
    const updated = [{ ...empty, name: 'Sem combate' }, newCombat, ...others];
    setCombats(updated);
    // Cria o combate sem mudar de tela e sem fechar o modal
    broadcastSync(updated, undefined, undefined, activeCombatId);
  };

  const handleToggleCombatActive = (id: string) => {
    const target = combats.find((c) => c.id === id);
    if (!target) return;
    const newActiveState = target.isActive === false ? true : false;
    const updated = combats.map((c) => (c.id === id ? { ...c, isActive: newActiveState } : c));
    setCombats(updated);

    if (!newActiveState && activeCombatId === id) {
      const remainingActive = updated.filter(
        (c) => c.isActive !== false && c.id !== 'combat-vazio' && !c.name.toLowerCase().includes('vazio')
      );
      const nextId =
        remainingActive.length > 0
          ? remainingActive[0].id
          : updated.find((c) => c.id === 'combat-vazio')?.id || 'combat-vazio';
      setActiveCombatId(nextId);
      broadcastSync(updated, undefined, undefined, nextId);
    } else {
      broadcastSync(updated);
    }
  };

  const handleTogglePlayerInCombat = (playerId: string) => {
    if (!activeCombat) return;
    const current = activeCombatPlayerIds;
    const isPresent = current.includes(playerId);
    const updatedIds = isPresent ? current.filter((id) => id !== playerId) : [...current, playerId];
    const targetPlayer = players.find((p) => p.id === playerId);
    
    const updatedCombats = combats.map((c) =>
      c.id === activeCombat.id ? { ...c, playerIds: updatedIds } : c
    );
    setCombats(updatedCombats);
    broadcastSync(updatedCombats);
    if (!isPresent) {
      setSelectedNpcId(playerId);
    } else if (selectedNpcId === playerId) {
      const rem = allCharacters.filter((c) => c.id !== playerId);
      if (rem.length > 0) setSelectedNpcId(rem[0].id);
    }
  };

  const handleSetAllPlayersInCombat = (show: boolean) => {
    if (!activeCombat) return;
    const updatedIds = show ? players.map((p) => p.id) : [];
    const updatedCombats = combats.map((c) =>
      c.id === activeCombat.id ? { ...c, playerIds: updatedIds } : c
    );
    setCombats(updatedCombats);
    broadcastSync(updatedCombats);
    if (show && players.length > 0) {
      setSelectedNpcId(players[0].id);
    }
  };

  const handleUpdateCombatRound = (newRound: number) => {
    if (!activeCombat) return;
    const roundVal = Math.max(0, newRound);
    const updatedCombats = combats.map((c) =>
      c.id === activeCombat.id ? { ...c, currentRound: roundVal, round: roundVal } : c
    );
    stateRef.current.combats = updatedCombats;
    setCombats(updatedCombats);

    try {
      broadcastChannelRef.current?.postMessage({
        type: 'SYNC_ROUND',
        combatId: activeCombat.id,
        round: roundVal,
        sourceId: onlineSyncService.getClientId(),
      });
    } catch (e) {}

    onlineSyncService.sendPayloadImmediate({
      type: 'SYNC_ROUND',
      combatId: activeCombat.id,
      round: roundVal,
      timestamp: Date.now(),
    });

    broadcastSync(updatedCombats);
  };

  const handleDeleteCombat = (id: string) => {
    if (id === 'combat-vazio') return;
    const remaining = combats.filter((c) => c.id !== id);
    const empty = remaining.find((c) => c.id === 'combat-vazio' || c.name.toLowerCase().includes('vazio')) || EMPTY_COMBAT_PRESET;
    const others = remaining.filter((c) => c.id !== empty.id && !c.name.toLowerCase().includes('vazio'));
    const nextCombats = [{ ...empty, name: 'Sem combate' }, ...others];
    setCombats(nextCombats);
    const nextActiveId = activeCombatId === id ? nextCombats[0].id : activeCombatId;
    if (activeCombatId === id && remaining.length > 0) {
      setActiveCombatId(nextActiveId);
    }
    broadcastSync(nextCombats, undefined, undefined, nextActiveId);
  };

  const handleRenameCombat = (id: string, name: string, description?: string) => {
    const updated = combats.map((c) => (c.id === id ? { ...c, name, description } : c));
    setCombats(updated);
    broadcastSync(updated);
  };

  // Criação de Personagem (Fixo / Global)
  const handleAddNewPlayer = () => {
    const count = players.length + 1;
    const newPlayer: NPC = {
      ...createNewNpc(`Personagem ${count}`),
      characterType: 'player',
      playerName: `Jogador ${count}`,
      title: 'Membro de The Hounds',
      isVisibleToPlayer: true,
      extraItems: [
        { id: `it-arr-${Date.now()}`, name: 'Flechas', current: 20, max: 20 },
        { id: `it-mana-${Date.now()}`, name: 'Pedras de Mana', current: 5, max: 5 },
        { id: `it-shd-${Date.now()}`, name: 'Escudo (Durabilidade)', current: 30, max: 30 },
      ],
    };
    const updatedPlayers = [...players, newPlayer];
    setPlayers(updatedPlayers);
    setSelectedNpcId(newPlayer.id);
    broadcastSync(undefined, undefined, undefined, undefined, updatedPlayers);
  };

  // Criação de NPC (Específico do Combate Ativo)
  const handleAddNewNpc = () => {
    if (!activeCombat || isNoCombat) return;
    const newNpc = createNewNpc('NOVO NPC');
    newNpc.characterType = 'npc';
    const updated = combats.map((c) =>
      c.id === activeCombat.id ? { ...c, npcs: [...c.npcs, newNpc] } : c
    );
    setCombats(updated);
    broadcastSync(updated);
    setSelectedNpcId(newNpc.id);
  };

  // Auxiliares de log automático para todas as alterações na ficha (sem apagar ao voltar ao estado inicial)
  const hubFlat = (o?: NPC): Record<string, any> => {
    if (!o) return {};
    const F: Record<string, any> = {};
    const P: (keyof NPC)[] = [
      'name', 'title', 'playerName', 'hpCurrent', 'hpMax', 'fpCurrent', 'fpMax',
      'st', 'dx', 'iq', 'ht', 'per', 'will', 'basicSpeed', 'basicMove', 'naturalDr',
      'dodge', 'block', 'weight', 'height', 'combatManeuver', 'isDead', 'isVisibleToPlayer'
    ];
    for (const k of P) F[k as string] = o[k] === undefined || o[k] === null ? '' : o[k];
    F.avatar = (o.avatar || '') + '|' + (o.avatarPreset || '');
    for (const k of ['advantages', 'disadvantages', 'skills', 'combatSkills', 'combatPerks', 'equipment', 'assistantNotes'] as (keyof NPC)[]) {
      F['txt.' + k] = o[k] || '';
    }
    F.cond = (o.statusConditions || []).map((x) => typeof x === 'string' ? x : (x && (x as any).id) || (x as any).name).filter(Boolean).sort().join('|');
    const ta = o.turnActions || ({} as any);
    for (const k of ['parryCount', 'dodgeCount', 'blockCount', 'usedRetreat', 'shock', 'usedFatigueThisTurn', 'notes']) {
      F['ta.' + k] = ta[k] === undefined || ta[k] === null ? '' : ta[k];
    }
    for (const it of o.extraItems || []) {
      if (it && it.id) {
        F['item.' + it.id] = (it.name || 'Item') + '\x01' + (it.current ?? '') + '\x01' + (it.max ?? '');
      }
    }
    for (const k of ['weapons', 'parries', 'spells', 'armorLocations'] as (keyof NPC)[]) {
      F['arr.' + k] = JSON.stringify(o[k] || []);
    }
    for (const sp of o.activeSpells || []) {
      if (sp && sp.id) {
        F['actSpell.' + sp.id] = (sp.spellName || 'Magia') + '\x01' + (sp.targetName || '') + '\x01' + (sp.cost || 0);
      }
    }
    for (const sp of o.affectedSpells || []) {
      if (sp && sp.id) {
        F['affSpell.' + sp.id] = (sp.spellName || 'Magia') + '\x01' + (sp.casterName || '');
      }
    }
    return F;
  };

  const hubDescribe = (A: Record<string, any>, B: Record<string, any>, keys: string[], conds: ConditionDefinition[]): string => {
    const L: Record<string, string> = {
      name: 'Nome', title: 'Título', playerName: 'Jogador', hpCurrent: 'PV', hpMax: 'PV máx.',
      fpCurrent: 'FP', fpMax: 'FP máx.', st: 'ST', dx: 'DX', iq: 'IQ', ht: 'HT', per: 'Per', will: 'Will',
      basicSpeed: 'Speed', basicMove: 'Move', naturalDr: 'RD Nat.', dodge: 'Esquiva', block: 'Bloqueio',
      weight: 'Peso', height: 'Altura',
      'ta.parryCount': 'Aparar no turno', 'ta.dodgeCount': 'Esquiva no turno', 'ta.blockCount': 'Bloqueio no turno',
      'ta.usedRetreat': 'Recuo', 'ta.shock': 'Choque', 'ta.usedFatigueThisTurn': 'Fadiga no turno', 'ta.notes': 'Notas do turno'
    };
    const TX: Record<string, string> = {
      advantages: 'Vantagens', disadvantages: 'Desvantagens', skills: 'Perícias', combatSkills: 'Perícias de combate',
      combatPerks: 'Talentos', equipment: 'Equipamento', assistantNotes: 'Observações gerais'
    };
    const AR: Record<string, string> = {
      weapons: 'Armas', parries: 'Defesas de aparar', spells: 'Magias', armorLocations: 'Armaduras'
    };
    const v = (x: any) => (x === true ? 'sim' : x === false ? 'não' : x === '' ? '—' : String(x));
    const man = (id: any) => {
      const m = COMBAT_MANEUVERS.find((z) => z.id === id);
      return m ? m.name : id || 'Nenhuma';
    };
    const cn = (id: any) => {
      const m = (conds || []).find((z) => z && (z.id === id || z.label === id));
      return m ? m.label || m.id : id;
    };

    const out: string[] = [];
    for (const k of keys) {
      const a = A[k], b = B[k];
      if (k === 'isDead') out.push(b ? 'Marcado como morto' : 'Marcado como vivo');
      else if (k === 'isVisibleToPlayer') out.push(b ? 'Visível para os jogadores' : 'Oculto dos jogadores');
      else if (k === 'combatManeuver') out.push('Manobra: ' + man(a) + ' → ' + man(b));
      else if (k === 'avatar') out.push('Avatar alterado');
      else if (k.startsWith('txt.')) out.push((TX[k.slice(4)] || k.slice(4)) + ' editado');
      else if (k.startsWith('arr.')) out.push((AR[k.slice(4)] || k.slice(4)) + ' editado');
      else if (k === 'cond') {
        const x = new Set((a || '').split('|').filter(Boolean));
        const y = new Set((b || '').split('|').filter(Boolean));
        const ad = [...y].filter((z) => !x.has(z)).map(cn);
        const rm = [...x].filter((z) => !y.has(z)).map(cn);
        if (ad.length) out.push('Condição adicionada: ' + ad.join(', '));
        if (rm.length) out.push('Condição removida: ' + rm.join(', '));
      } else if (k.startsWith('item.')) {
        const pa = a === undefined ? null : String(a).split('\x01');
        const pb = b === undefined ? null : String(b).split('\x01');
        if (!pa) out.push('Item adicionado: ' + pb![0] + (pb![1] ? ' (' + pb![1] + ')' : ''));
        else if (!pb) out.push('Item removido: ' + pa[0]);
        else {
          if (pa[0] !== pb[0]) out.push('Item renomeado: ' + pa[0] + ' → ' + pb[0]);
          if (pa[1] !== pb[1]) out.push(pb[0] + ': ' + v(pa[1]) + ' → ' + v(pb[1]));
          if (pa[2] !== pb[2]) out.push(pb[0] + ' (máx.): ' + v(pa[2]) + ' → ' + v(pb[2]));
        }
      } else if (k.startsWith('actSpell.')) {
        const pa = a === undefined ? null : String(a).split('\x01');
        const pb = b === undefined ? null : String(b).split('\x01');
        if (!pa) out.push('Magia ativa adicionada: ' + pb![0] + (pb![1] ? ' no alvo ' + pb![1] : '') + (Number(pb![2]) ? ' (Custo: ' + pb![2] + ' FP)' : ''));
        else if (!pb) out.push('Magia ativa encerrada: ' + pa[0]);
        else out.push('Magia ativa alterada: ' + pb[0]);
      } else if (k.startsWith('affSpell.')) {
        const pa = a === undefined ? null : String(a).split('\x01');
        const pb = b === undefined ? null : String(b).split('\x01');
        if (!pa) out.push('Efeito de magia recebido: ' + pb![0] + (pb![1] ? ' de ' + pb![1] : ''));
        else if (!pb) out.push('Efeito de magia removido: ' + pa[0]);
      } else if (k === 'ta.usedRetreat') {
        out.push(b ? 'Recuo utilizado no turno' : 'Recuo desmarcado');
      } else if (k === 'ta.usedFatigueThisTurn') {
        out.push(b ? 'Fadiga utilizada no turno' : 'Fadiga do turno zerada');
      } else if (k === 'ta.notes') {
        out.push('Notas do turno editadas');
      } else {
        out.push((L[k] || k) + ': ' + v(a) + ' → ' + v(b));
      }
    }
    return out.join(' · ');
  };

  const hubAuto = (neu: NPC, old: NPC | undefined): NPC => {
    try {
      if (!neu || !old) return neu;
      const hn = neu.history || [], ho = old.history || [];
      // Se já houver um registro manual novo (ex: DamageCalculatorModal), não duplica
      if (hn.length !== ho.length || (hn[0] && hn[0].id) !== (ho[0] && ho[0].id)) return neu;
      const A = hubFlat(old), B = hubFlat(neu);
      const keys = [...new Set([...Object.keys(A), ...Object.keys(B)])].filter((k) =>
        A[k] !== B[k] && /^(hpCurrent|hpMax|fpCurrent|fpMax|cond|combatManeuver|isDead|ta\..*|item\..*|actSpell\..*|affSpell\..*)$/.test(k)
      ).sort();
      if (!keys.length) return neu;
      const d = hubDescribe(A, B, keys, conditions);
      if (!d) return neu;
      const now = Date.now();
      const ks = keys.join(',');
      const newEntry: ActionLogEntry = {
        id: `log-${now}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        author: currentUser?.role === 'mestre' ? 'mestre' : 'assistente',
        authorName: (currentUser && currentUser.name) || (currentUser && currentUser.role === 'mestre' ? 'Mestre' : 'Assistente'),
        type: 'edit',
        description: d + (currentUser && currentUser.name ? ' — por ' + currentUser.name : ''),
        combatId: activeCombat ? activeCombat.id : undefined,
        round: activeCombat ? (activeCombat.currentRound ?? (activeCombat as any).round ?? 0) : 0,
      };
      // Mantém todo o histórico anterior e adiciona o novo registro
      return {
        ...neu,
        history: [newEntry, ...hn],
      };
    } catch (e) {
      return neu;
    }
  };

  // Atualização unificada de Personagem ou NPC (usando stateRef para garantir sincronização síncrona sem race conditions)
  const handleUpdateNpc = (updatedNpc: NPC) => {
    const oldNpc = stateRef.current.players.find((p) => p.id === updatedNpc.id) ||
      stateRef.current.combats.flatMap((c) => c.npcs || []).find((n) => n.id === updatedNpc.id);
    const autoLoggedNpc = hubAuto(updatedNpc, oldNpc);
    const editTimestamp = autoLoggedNpc.updatedAt || Date.now();
    const npcWithTimestamp: NPC = {
      ...autoLoggedNpc,
      updatedAt: editTimestamp,
    };
    lastLocalEditTimestampRef.current = editTimestamp;

    let playersChanged = false;
    let nextPlayers = stateRef.current.players;
    if (nextPlayers.some((p: NPC) => p.id === npcWithTimestamp.id)) {
      nextPlayers = nextPlayers.map((p: NPC) => (p.id === npcWithTimestamp.id ? npcWithTimestamp : p));
      playersChanged = true;
    } else if (npcWithTimestamp.characterType === 'player') {
      nextPlayers = [...nextPlayers, npcWithTimestamp];
      playersChanged = true;
    }

    let combatsChanged = false;
    let nextCombats = stateRef.current.combats;
    if (nextCombats.some((c: Combat) => c.npcs.some((n: NPC) => n.id === npcWithTimestamp.id))) {
      nextCombats = nextCombats.map((c: Combat) => ({
        ...c,
        npcs: c.npcs.map((n: NPC) => (n.id === npcWithTimestamp.id ? npcWithTimestamp : n)),
      }));
      combatsChanged = true;
    } else if (npcWithTimestamp.characterType !== 'player') {
      const currentActiveId = stateRef.current.activeCombatId;
      nextCombats = nextCombats.map((c: Combat) =>
        c.id === currentActiveId
          ? {
              ...c,
              npcs: c.npcs.map((n: NPC) => (n.id === npcWithTimestamp.id ? npcWithTimestamp : n)),
            }
          : c
      );
      combatsChanged = true;
    }

    if (playersChanged) {
      stateRef.current.players = nextPlayers;
      setPlayers(nextPlayers);
    }
    if (combatsChanged) {
      stateRef.current.combats = nextCombats;
      setCombats(nextCombats);
    }

    systemLogger.addLog(
      'LOCAL_EDIT',
      `Ficha de "${npcWithTimestamp.name}" atualizada localmente`,
      {
        id: npcWithTimestamp.id,
        characterType: npcWithTimestamp.characterType,
        hp: `${npcWithTimestamp.hpCurrent}/${npcWithTimestamp.hpMax}`,
        fp: `${npcWithTimestamp.fpCurrent}/${npcWithTimestamp.fpMax}`,
        parryCount: npcWithTimestamp.turnActions?.parryCount ?? 0,
        dodgeCount: npcWithTimestamp.turnActions?.dodgeCount ?? 0,
        blockCount: npcWithTimestamp.turnActions?.blockCount ?? 0,
        extraItemsCount: npcWithTimestamp.extraItems?.length ?? 0,
        updatedAt: npcWithTimestamp.updatedAt,
      }
    );

    broadcastSync(
      combatsChanged ? nextCombats : undefined,
      undefined,
      undefined,
      undefined,
      playersChanged ? nextPlayers : undefined,
      npcWithTimestamp
    );
  };

  const handlePartialUpdateNpc = (id: string, updates: Partial<NPC>) => {
    const editTimestamp = Date.now();
    lastLocalEditTimestampRef.current = editTimestamp;
    const target = allCharacters.find((c: NPC) => c.id === id);
    if (!target) return;
    handleUpdateNpc({ ...target, ...updates, updatedAt: editTimestamp });
  };

  // Exclusão unificada de Personagem ou NPC
  const handleDeleteNpc = (npcId: string) => {
    const isPlayer = players.some((p) => p.id === npcId);
    if (isPlayer) {
      const remaining = players.filter((p) => p.id !== npcId);
      setPlayers(remaining);
      broadcastSync(undefined, undefined, undefined, undefined, remaining);
      if (selectedNpcId === npcId) {
        setSelectedNpcId(remaining[0]?.id || activeCombat?.npcs?.find((n: NPC) => n.characterType !== 'player')?.id || '');
      }
    } else if (activeCombat) {
      const updated = combats.map((c) => {
        if (c.id !== activeCombat.id) return c;
        const updatedList = c.npcs.filter((n: NPC) => n.id !== npcId);
        return { ...c, npcs: updatedList };
      });
      setCombats(updated);
      broadcastSync(updated);
      if (selectedNpcId === npcId) {
        const remainingNpcs = activeCombat.npcs.filter((n: NPC) => n.id !== npcId && n.characterType !== 'player');
        setSelectedNpcId(players[0]?.id || remainingNpcs[0]?.id || '');
      }
    }
  };

  // Duplicação com numeração incremental
  const handleDuplicateNpc = (npc: NPC) => {
    const dupId = `char-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const existingNames = allCharacters.map((n: NPC) => n.name);
    const newIncrementalName = getNextIncrementalName(npc.name, existingNames);

    const duplicated: NPC = {
      ...npc,
      id: dupId,
      name: newIncrementalName,
      history: [
        {
          id: `hist-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          author: currentUser?.role === 'jogador' ? 'assistente' : 'mestre',
          type: 'note',
          description: `Duplicado a partir de ${npc.name}`,
        },
      ],
    };

    if (npc.characterType === 'player' || players.some((p) => p.id === npc.id)) {
      const updatedPlayers = [...players, duplicated];
      setPlayers(updatedPlayers);
      broadcastSync(undefined, undefined, undefined, undefined, updatedPlayers);
    } else if (activeCombat) {
      const updated = combats.map((c) =>
        c.id === activeCombat.id ? { ...c, npcs: [...c.npcs, duplicated] } : c
      );
      setCombats(updated);
      broadcastSync(updated);
    }
    setSelectedNpcId(dupId);
  };

  // Weapon Modal Handlers
  const handleSaveWeapon = (savedWeapon: Weapon) => {
    if (!selectedNpc) return;
    const exists = selectedNpc.weapons.some((w: Weapon) => w.id === savedWeapon.id);
    const updatedWeapons = exists
      ? selectedNpc.weapons.map((w: Weapon) => (w.id === savedWeapon.id ? savedWeapon : w))
      : [...selectedNpc.weapons, savedWeapon];
    handleUpdateNpc({
      ...selectedNpc,
      weapons: updatedWeapons,
    });
    setWeaponModalState({ isOpen: false, weapon: null });
  };

  // Conditions CRUD Handlers
  const handleCreateCondition = (conditionData: Omit<ConditionDefinition, 'id'>) => {
    const newCond: ConditionDefinition = {
      ...conditionData,
      id: `cond-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    const updated = [...conditions, newCond];
    setConditions(updated);
    broadcastSync(undefined, updated);
  };

  const handleUpdateCondition = (id: string, updatedData: Omit<ConditionDefinition, 'id'>) => {
    const updated = conditions.map((c) => (c.id === id ? { ...updatedData, id } : c));
    setConditions(updated);
    broadcastSync(undefined, updated);
  };

  const handleDeleteCondition = (conditionId: string) => {
    const updated = conditions.filter((c) => c.id !== conditionId);
    setConditions(updated);
    // Remove também de qualquer NPC ou Personagem que a possua
    const updatedPlayers = players.map((p) => ({
      ...p,
      statusConditions: (p.statusConditions || []).filter((id) => id !== conditionId),
    }));
    setPlayers(updatedPlayers);

    const updatedCombats = combats.map((c) => ({
      ...c,
      npcs: c.npcs.map((n) => ({
        ...n,
        statusConditions: (n.statusConditions || []).filter((id) => id !== conditionId),
      })),
    }));
    setCombats(updatedCombats);
    broadcastSync(updatedCombats, updated, undefined, undefined, updatedPlayers);
  };

  const handleToggleNpcCondition = (conditionId: string, duration?: number, round?: number) => {
    if (!selectedNpc) return;
    const current = selectedNpc.statusConditions || [];
    const exists = current.includes(conditionId);
    const updated = exists ? current.filter((c: string) => c !== conditionId) : [...current, conditionId];
    
    const nextMeta = { ...(selectedNpc.conditionMetadata || {}) };
    if (exists) {
      delete nextMeta[conditionId];
    } else {
      const curRnd = round !== undefined ? round : (activeCombat?.currentRound ?? (activeCombat as any)?.round ?? 0);
      nextMeta[conditionId] = {
        startRound: curRnd,
        duration: duration,
      };
    }

    handleUpdateNpc({
      ...selectedNpc,
      statusConditions: updated,
      conditionMetadata: nextMeta,
    });
  };

  // User Accounts CRUD Handlers
  const handleCreateUser = (name: string, role: UserRole, initialPassword: string) => {
    const newUser: UserAccount = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      role,
      password: initialPassword || '123',
      needsPasswordReset: false,
      createdAt: new Date().toLocaleDateString('pt-BR'),
    };
    const updated = [...users, newUser];
    setUsers(updated);
    broadcastSync(undefined, undefined, updated);
  };

  const handleResetUserPassword = (userId: string) => {
    const updated = users.map((u) => (u.id === userId ? { ...u, needsPasswordReset: true } : u));
    setUsers(updated);
    broadcastSync(undefined, undefined, updated);
  };

  const handleDeleteUser = (userId: string) => {
    const updated = users.filter((u) => u.id !== userId);
    setUsers(updated);
    broadcastSync(undefined, undefined, updated);
  };

  const handleUpdateUserPassword = (userId: string, newPassword: string) => {
    const updated = users.map((u) => (u.id === userId ? { ...u, password: newPassword, needsPasswordReset: false } : u));
    setUsers(updated);
    broadcastSync(undefined, undefined, updated);
  };

  const handleSwitchUser = () => {
    setCurrentUser(null);
    setLoginModalOpen(true);
  };

  const handleTogglePlayerPermission = (userId: string) => {
    const targetUser = users.find((u) => u.id === userId || u.name === userId);
    const targetId = targetUser ? targetUser.id : userId;
    const targetName = targetUser ? targetUser.name : null;

    const exists = editorUserIds.some((x) => {
      const s = String(x || '').toLowerCase().trim();
      const qid = String(targetId || '').toLowerCase().trim();
      const qnm = String(targetName || '').toLowerCase().trim();
      return s === qid || (qnm && s === qnm) || s === qid.replace(/^user-/, '') || qid === `user-${s}`;
    });

    const next = exists
      ? editorUserIds.filter((x) => {
          const s = String(x || '').toLowerCase().trim();
          const qid = String(targetId || '').toLowerCase().trim();
          const qnm = String(targetName || '').toLowerCase().trim();
          return !(s === qid || (qnm && s === qnm) || s === qid.replace(/^user-/, '') || qid === `user-${s}`);
        })
      : [...editorUserIds, targetId];

    setEditorUserIds(next);
    try {
      localStorage.setItem('gurps_combat_master_editors_v1', JSON.stringify(next));
      broadcastChannelRef.current?.postMessage({
        type: 'SYNC_EDITORS',
        editorUserIds: next,
        sourceId: onlineSyncService.getClientId(),
      });
      onlineSyncService.sendPayloadImmediate({
        type: 'SYNC_EDITORS',
        editorUserIds: next,
        timestamp: Date.now(),
      });
    } catch {}
    if (activeCombat) {
      const updatedCombat = { ...activeCombat, editorUserIds: next };
      const updatedCombats = combats.map((c) => (c.id === activeCombat.id ? updatedCombat : c));
      setCombats(updatedCombats);
      broadcastSync(updatedCombats);
    }
  };

  const handleSetAllPlayerPermissions = (allow: boolean) => {
    const playerUsers = users.filter((u) => u.role === 'jogador');
    const next = allow ? playerUsers.map((u) => u.id) : [];
    setEditorUserIds(next);
    try {
      localStorage.setItem('gurps_combat_master_editors_v1', JSON.stringify(next));
      broadcastChannelRef.current?.postMessage({
        type: 'SYNC_EDITORS',
        editorUserIds: next,
        sourceId: onlineSyncService.getClientId(),
      });
      onlineSyncService.sendPayloadImmediate({
        type: 'SYNC_EDITORS',
        editorUserIds: next,
        timestamp: Date.now(),
      });
    } catch {}
    if (activeCombat) {
      const updatedCombat = { ...activeCombat, editorUserIds: next };
      const updatedCombats = combats.map((c) => (c.id === activeCombat.id ? updatedCombat : c));
      setCombats(updatedCombats);
      broadcastSync(updatedCombats);
    }
  };

  // Log and Damage Handlers
  const handleApplyDamage = (
    npcId: string,
    finalDamage: number,
    logEntry: Omit<ActionLogEntry, 'id'>
  ) => {
    const roundNumber = logEntry.round !== undefined 
      ? logEntry.round 
      : (activeCombat?.currentRound ?? (activeCombat as any)?.round ?? 0);
    const entryWithId: ActionLogEntry = {
      ...logEntry,
      round: roundNumber,
      authorName: logEntry.authorName || currentUser?.name,
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };

    const now = Date.now();
    let updatedNpc: NPC | undefined;

    const applyDamageToLocations = (locs: NPC['armorLocations'] = []) => {
      if (!entryWithId.hitLocation || entryWithId.hitLocation.toLowerCase().includes('sem parte')) {
        return locs;
      }
      return locs.map((loc) => {
        if (isSameLocation(loc.location, entryWithId.hitLocation || '')) {
          return {
            ...loc,
            damageTaken: (loc.damageTaken || 0) + finalDamage,
          };
        }
        return loc;
      });
    };

    const isPlayer = players.some((p) => p.id === npcId);
    if (isPlayer) {
      const updatedPlayers = players.map((p) => {
        if (p.id !== npcId) return p;
        const newHp = p.hpCurrent - finalDamage;
        // A morte é 100% manual e definida apenas pelo Mestre e Jogador Editor
        const updatedLocations = applyDamageToLocations(p.armorLocations);
        const updatedKits = p.armorKits?.map((kit) => {
          if (kit.id === p.activeArmorKitId || kit.isActive) {
            return { ...kit, locations: applyDamageToLocations(kit.locations) };
          }
          return kit;
        });

        updatedNpc = {
          ...p,
          hpCurrent: newHp,
          isDead: p.isDead,
          armorLocations: updatedLocations,
          armorKits: updatedKits,
          history: [entryWithId, ...p.history],
          updatedAt: now,
        };
        return updatedNpc;
      });
      setPlayers(updatedPlayers);
      broadcastSync(undefined, undefined, undefined, undefined, updatedPlayers, updatedNpc);
    } else if (activeCombat) {
      const updated = combats.map((c) => {
        if (c.id !== activeCombat.id) return c;
        return {
          ...c,
          npcs: c.npcs.map((n) => {
            if (n.id !== npcId) return n;
            const newHp = n.hpCurrent - finalDamage;
            // A morte é 100% manual e definida apenas pelo Mestre e Jogador Editor
            const updatedLocations = applyDamageToLocations(n.armorLocations);
            const updatedKits = n.armorKits?.map((kit) => {
              if (kit.id === n.activeArmorKitId || kit.isActive) {
                return { ...kit, locations: applyDamageToLocations(kit.locations) };
              }
              return kit;
            });

            updatedNpc = {
              ...n,
              hpCurrent: newHp,
              isDead: n.isDead,
              armorLocations: updatedLocations,
              armorKits: updatedKits,
              history: [entryWithId, ...n.history],
              updatedAt: now,
            };
            return updatedNpc;
          }),
        };
      });
      setCombats(updated);
      broadcastSync(updated, undefined, undefined, undefined, undefined, updatedNpc);
    }
  };

  const handleApplyFatigue = (
    npcId: string,
    fpDelta: number,
    logEntry: Omit<ActionLogEntry, 'id'>,
    spellData?: {
      spellName: string;
      isActiveSpell: boolean;
      targetId: string;
      targetName: string;
      round: number;
    },
    manaStoneUsage?: {
      itemId: string;
      amount: number;
    }
  ) => {
    const roundNumber = logEntry.round !== undefined 
      ? logEntry.round 
      : (activeCombat?.currentRound ?? (activeCombat as any)?.round ?? 0);
    const entryWithId: ActionLogEntry = {
      ...logEntry,
      round: roundNumber,
      authorName: logEntry.authorName || currentUser?.name,
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };

    const now = Date.now();
    const spellInstanceId = `spell-${now}-${Math.random().toString(36).slice(2, 6)}`;

    // Busca o conjurador
    const caster = allCharacters.find((c: NPC) => c.id === npcId);
    const casterName = caster?.name || 'Conjurador';

    let nextPlayers = [...players];
    let nextCombats = [...combats];
    let playersChanged = false;
    let combatsChanged = false;

    // 1. Atualizar Conjurador (FP + Itens Extras se Pedra de Mana + Log + activeSpells se isActiveSpell)
    const updateCasterInList = (list: NPC[]): { list: NPC[]; updated?: NPC } => {
      let updated: NPC | undefined;
      const newList = list.map((n) => {
        if (n.id !== npcId) return n;
        const newFp = Math.max(-n.fpMax, Math.min(n.fpMax, n.fpCurrent + fpDelta));

        let nextExtraItems = n.extraItems || [];
        if (manaStoneUsage && manaStoneUsage.amount > 0) {
          nextExtraItems = nextExtraItems.map((it) => {
            if (it.id === manaStoneUsage.itemId) {
              return {
                ...it,
                current: Math.max(0, (it.current ?? 0) - manaStoneUsage.amount),
              };
            }
            return it;
          });
        }

        let nextActiveSpells = n.activeSpells || [];
        if (spellData && spellData.isActiveSpell) {
          nextActiveSpells = [
            ...nextActiveSpells,
            {
              id: spellInstanceId,
              spellName: spellData.spellName,
              targetId: spellData.targetId,
              targetName: spellData.targetName,
              round: spellData.round,
              duration: spellData.duration,
              cost: Math.abs(fpDelta) + (manaStoneUsage?.amount || 0),
              casterId: n.id,
              casterName: n.name,
              createdAt: new Date().toISOString(),
            },
          ];
        }
        updated = {
          ...n,
          fpCurrent: newFp,
          extraItems: nextExtraItems,
          activeSpells: nextActiveSpells,
          history: [entryWithId, ...n.history],
          updatedAt: now,
        };
        return updated;
      });
      return { list: newList, updated };
    };

    const isCasterPlayer = nextPlayers.some((p) => p.id === npcId);
    let updatedCasterNpc: NPC | undefined;
    if (isCasterPlayer) {
      const res = updateCasterInList(nextPlayers);
      nextPlayers = res.list;
      updatedCasterNpc = res.updated;
      playersChanged = true;
    } else if (activeCombat) {
      nextCombats = nextCombats.map((c) => {
        if (c.id !== activeCombat.id) return c;
        const res = updateCasterInList(c.npcs);
        updatedCasterNpc = res.updated;
        return { ...c, npcs: res.list };
      });
      combatsChanged = true;
    }

    // 2. Se for Magia Ativa (e não for em área), atualizar o Alvo (affectedSpells)
    if (spellData && spellData.isActiveSpell && spellData.targetId && spellData.targetId !== 'area' && !(spellData as any).isAreaSpell) {
      const targetId = spellData.targetId;

      const updateTargetInList = (list: NPC[]) => {
        return list.map((n) => {
          if (n.id !== targetId) return n;
          const nextAffected = [
            ...(n.affectedSpells || []),
            {
              id: spellInstanceId,
              spellName: spellData.spellName,
              casterId: npcId,
              casterName: casterName,
              round: spellData.round,
              duration: spellData.duration,
              createdAt: new Date().toISOString(),
            },
          ];
          return {
            ...n,
            affectedSpells: nextAffected,
            updatedAt: now,
          };
        });
      };

      if (nextPlayers.some((p) => p.id === targetId)) {
        nextPlayers = updateTargetInList(nextPlayers);
        playersChanged = true;
      }
      if (activeCombat && nextCombats.some((c) => c.id === activeCombat.id && c.npcs.some((n) => n.id === targetId))) {
        nextCombats = nextCombats.map((c) => {
          if (c.id !== activeCombat.id) return c;
          return { ...c, npcs: updateTargetInList(c.npcs) };
        });
        combatsChanged = true;
      }
    }

    if (playersChanged) setPlayers(nextPlayers);
    if (combatsChanged) setCombats(nextCombats);

    // Conjurador com o estado final (contendo activeSpells e affectedSpells se ele próprio for o alvo)
    const finalCaster = nextPlayers.find((p) => p.id === npcId) || (nextCombats.find((c) => c.id === activeCombat?.id)?.npcs || []).find((n) => n.id === npcId);
    const finalTarget = (spellData && spellData.isActiveSpell && spellData.targetId !== npcId)
      ? (nextPlayers.find((p) => p.id === spellData.targetId) || (nextCombats.find((c) => c.id === activeCombat?.id)?.npcs || []).find((n) => n.id === spellData.targetId))
      : undefined;

    broadcastSync(
      combatsChanged ? nextCombats : undefined,
      undefined,
      undefined,
      undefined,
      playersChanged ? nextPlayers : undefined,
      finalCaster
    );

    if (finalTarget) {
      try {
        broadcastChannelRef.current?.postMessage({
          type: 'SYNC_NPC',
          sourceId: onlineSyncService.getClientId(),
          timestamp: now,
          npc: finalTarget,
        });
      } catch (e) {}
      onlineSyncService.sendPayloadImmediate({
        type: 'SYNC_NPC',
        timestamp: now,
        npc: finalTarget,
      });
    }
  };

  // Remove Magia Ativa (remove do conjurador e do respectivo alvo)
  const handleRemoveActiveSpell = (casterId: string, spellId: string) => {
    const now = Date.now();
    let nextPlayers = [...players];
    let nextCombats = [...combats];
    let playersChanged = false;
    let combatsChanged = false;

    // Remove do conjurador (activeSpells) e do alvo (affectedSpells)
    const cleanSpellsFromList = (list: NPC[]): NPC[] => {
      return list.map((n) => {
        let changed = false;
        let newActive = n.activeSpells;
        let newAffected = n.affectedSpells;

        if (n.activeSpells?.some((s) => s.id === spellId)) {
          newActive = n.activeSpells.filter((s) => s.id !== spellId);
          changed = true;
        }
        if (n.affectedSpells?.some((s) => s.id === spellId)) {
          newAffected = n.affectedSpells.filter((s) => s.id !== spellId);
          changed = true;
        }

        if (changed) {
          const removedName = n.activeSpells?.find((s) => s.id === spellId)?.spellName ||
            n.affectedSpells?.find((s) => s.id === spellId)?.spellName || 'Magia';
          const spellLog: ActionLogEntry = {
            id: `log-${now}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            author: currentUser?.role === 'mestre' ? 'mestre' : 'assistente',
            authorName: currentUser?.name || (currentUser?.role === 'mestre' ? 'Mestre' : 'Assistente'),
            type: 'spell',
            description: `Magia encerrada: ${removedName}${currentUser?.name ? ' — por ' + currentUser.name : ''}`,
            combatId: activeCombat?.id,
            round: activeCombat?.currentRound ?? (activeCombat as any)?.round ?? 0,
          };
          return {
            ...n,
            activeSpells: newActive,
            affectedSpells: newAffected,
            history: [spellLog, ...(n.history || [])],
            updatedAt: now,
          };
        }
        return n;
      });
    };

    if (nextPlayers.some((p) => p.activeSpells?.some((s) => s.id === spellId) || p.affectedSpells?.some((s) => s.id === spellId))) {
      nextPlayers = cleanSpellsFromList(nextPlayers);
      playersChanged = true;
    }

    if (activeCombat) {
      nextCombats = nextCombats.map((c) => {
        if (c.id !== activeCombat.id) return c;
        return { ...c, npcs: cleanSpellsFromList(c.npcs) };
      });
      combatsChanged = true;
    }

    if (playersChanged) setPlayers(nextPlayers);
    if (combatsChanged) setCombats(nextCombats);

    broadcastSync(
      combatsChanged ? nextCombats : undefined,
      undefined,
      undefined,
      undefined,
      playersChanged ? nextPlayers : undefined
    );
  };

  // Remove Magia de Sob Efeito (remove do alvo e do respectivo conjurador)
  const handleRemoveAffectedSpell = (targetId: string, spellId: string) => {
    handleRemoveActiveSpell(targetId, spellId);
  };

  const handleApplyItemChange = (
    npcId: string,
    itemId: string,
    delta: number,
    logEntry: Omit<ActionLogEntry, 'id'>
  ) => {
    const roundNumber = logEntry.round !== undefined 
      ? logEntry.round 
      : (activeCombat?.currentRound ?? (activeCombat as any)?.round ?? 0);
    const entryWithId: ActionLogEntry = {
      ...logEntry,
      round: roundNumber,
      authorName: logEntry.authorName || currentUser?.name,
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };

    const now = Date.now();
    let updatedNpc: NPC | undefined;
    const isPlayer = players.some((p) => p.id === npcId);
    if (isPlayer) {
      const updatedPlayers = players.map((p) => {
        if (p.id !== npcId) return p;
        const currentItems = p.extraItems || [];
        const updatedItems = currentItems.map((it) => {
          if (it.id === itemId) {
            const nextVal = Math.max(0, it.current + delta);
            return { ...it, current: nextVal };
          }
          return it;
        });
        updatedNpc = {
          ...p,
          extraItems: updatedItems,
          history: [entryWithId, ...p.history],
          updatedAt: now,
        };
        return updatedNpc;
      });
      setPlayers(updatedPlayers);
      broadcastSync(undefined, undefined, undefined, undefined, updatedPlayers, updatedNpc);
    } else if (activeCombat) {
      const updated = combats.map((c) => {
        if (c.id !== activeCombat.id) return c;
        return {
          ...c,
          npcs: c.npcs.map((n) => {
            if (n.id !== npcId) return n;
            const currentItems = n.extraItems || [];
            const updatedItems = currentItems.map((it) => {
              if (it.id === itemId) {
                const nextVal = Math.max(0, it.current + delta);
                return { ...it, current: nextVal };
              }
              return it;
            });
            updatedNpc = {
              ...n,
              extraItems: updatedItems,
              history: [entryWithId, ...n.history],
              updatedAt: now,
            };
            return updatedNpc;
          }),
        };
      });
      setCombats(updated);
      broadcastSync(updated, undefined, undefined, undefined, undefined, updatedNpc);
    }
  };

  const handleClearActiveCombatHistory = () => {
    const now = Date.now();
    const updatedCombats = combats.map((c) => ({
      ...c,
      events: [],
      npcs: c.npcs.map((n) => ({ ...n, history: [], updatedAt: now })),
    }));
    const updatedPlayers = players.map((p) => ({
      ...p,
      history: [],
      updatedAt: now,
    }));
    stateRef.current.combats = updatedCombats;
    stateRef.current.players = updatedPlayers;
    setCombats(updatedCombats);
    setPlayers(updatedPlayers);
    broadcastSync(updatedCombats, undefined, undefined, undefined, updatedPlayers);
  };

  const handleDeleteLogEntry = (entryId: string, npcId?: string) => {
    const now = Date.now();
    if (npcId) {
      const isPlayer = players.some((p) => p.id === npcId);
      if (isPlayer) {
        const updatedPlayers = players.map((p) =>
          p.id === npcId
            ? { ...p, history: (p.history || []).filter((h) => h.id !== entryId), updatedAt: now }
            : p
        );
        stateRef.current.players = updatedPlayers;
        setPlayers(updatedPlayers);
        broadcastSync(undefined, undefined, undefined, undefined, updatedPlayers);
      } else {
        const updatedCombats = combats.map((c) => ({
          ...c,
          npcs: c.npcs.map((n) =>
            n.id === npcId
              ? { ...n, history: (n.history || []).filter((h) => h.id !== entryId), updatedAt: now }
              : n
          ),
        }));
        stateRef.current.combats = updatedCombats;
        setCombats(updatedCombats);
        broadcastSync(updatedCombats);
      }
    } else {
      const updatedPlayers = players.map((p) => ({
        ...p,
        history: (p.history || []).filter((h) => h.id !== entryId),
        updatedAt: now,
      }));
      stateRef.current.players = updatedPlayers;
      setPlayers(updatedPlayers);

      const updatedCombats = combats.map((c) => ({
        ...c,
        npcs: c.npcs.map((n) => ({
          ...n,
          history: (n.history || []).filter((h) => h.id !== entryId),
          updatedAt: now,
        })),
      }));
      stateRef.current.combats = updatedCombats;
      setCombats(updatedCombats);
      broadcastSync(updatedCombats, undefined, undefined, undefined, updatedPlayers);
    }
  };

  // Export & Import
  const handleExport = () => {
    const fullBackup = {
      combats,
      players,
      conditions,
      users,
      exportedAt: new Date().toISOString(),
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(fullBackup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `gurps_campanha_${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.combats && Array.isArray(parsed.combats)) {
          setCombats(parsed.combats);
          if (parsed.players && Array.isArray(parsed.players)) {
            setPlayers(parsed.players);
          }
          if (parsed.conditions && Array.isArray(parsed.conditions)) {
            setConditions(parsed.conditions);
          }
          if (parsed.users && Array.isArray(parsed.users)) {
            setUsers(parsed.users);
          }
          setActiveCombatId(parsed.combats[0]?.id || '');
          setSelectedNpcId(parsed.players?.[0]?.id || parsed.combats[0]?.npcs[0]?.id || '');
          broadcastSync(parsed.combats, parsed.conditions, parsed.users, parsed.combats[0]?.id, parsed.players);
          alert('Campanha importada com sucesso!');
        } else if (Array.isArray(parsed) && parsed.length > 0) {
          setCombats(parsed);
          setActiveCombatId(parsed[0].id);
          setSelectedNpcId(parsed[0].npcs[0]?.id || '');
          broadcastSync(parsed);
          alert('Combates importados com sucesso!');
        } else {
          alert('Arquivo JSON inválido.');
        }
      } catch (err) {
        alert('Erro ao importar JSON. Verifique a formatação do arquivo.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const isPlayerUser = currentUser?.role === 'jogador';
  const isMaster = currentUser?.role === 'mestre';
  const effectiveEditorIds = activeCombat?.editorUserIds || editorUserIds;
  const isEditor = effectiveEditorIds.some((x) => {
    if (!x) return false;
    const s = String(x).toLowerCase().trim();
    const cid = String(currentUser?.id || '').toLowerCase().trim();
    const cnm = String(currentUser?.name || '').toLowerCase().trim();
    const sC = s.replace(/^user-/, '');
    const cidC = cid.replace(/^user-/, '');
    const cnmC = cnm.replace(/^user-/, '');
    return s === cid || s === cnm || sC === cidC || sC === cnmC || s === `user-${cnmC}` || cid === `user-${sC}`;
  });
  const canEditCurrent = isMaster || (currentUser?.role === 'jogador' && isEditor);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden"
      />

      {/* 1. TOP BAR */}
      <TopNav
        combats={combats}
        activeCombatId={activeCombatId}
        onSelectCombat={handleSelectCombat}
        onNewCombat={() => setCombatManagerOpen(true)}
        onExport={handleExport}
        onImport={handleImport}
        currentUser={currentUser}
        onOpenUserAccounts={() => setUserAccountsModalOpen(true)}
        onSwitchUser={handleSwitchUser}
        syncStatus={syncStatus}
        currentRoom={currentRoom}
        onOpenOnlineRoomModal={() => setOnlineRoomModalOpen(true)}
        onOpenSystemLog={() => setSystemLogModalOpen(true)}
        systemLogsCount={systemLogsCount}
        activeViewMode={activeViewMode}
        onSelectViewMode={setActiveViewMode}
        onOpenPlayerPermissions={() => setPlayerPermsModalOpen(true)}
        editorCount={effectiveEditorIds.length}
        canEditCurrent={canEditCurrent}
      />

      {/* 2. BARRA DE PERSONAGENS & NPCS (Espalha até a direita, filtros na esquerda) */}
      <NpcListBar
        npcs={allCharacters}
        selectedNpcId={selectedNpcId}
        onSelectNpc={setSelectedNpcId}
        onAddNewNpc={handleAddNewNpc}
        onAddNewPlayer={() => setCombatPlayersModalOpen(true)}
        onUpdateNpc={handlePartialUpdateNpc}
        currentUserRole={isMaster ? 'mestre' : canEditCurrent ? 'jogador' : 'visualizador'}
        currentRound={activeCombat?.currentRound ?? (activeCombat as any)?.round ?? 0}
        onUpdateRound={handleUpdateCombatRound}
        canControlRound={canEditCurrent}
        isNoCombat={isNoCombat}
      />

      {/* 3. MAIN WORKSPACE (Conforme Modo Selecionado: Mesa Tática, Fichas ou Dividida) */}
      <main className="flex-1 w-full p-2.5 sm:p-3.5 lg:px-5">
        {activeViewMode === 'tactical' ? (
          /* MODO MESA TÁTICA COMPLETA */
          <div className="w-full">
            <TacticalMapWorkspace
              tacticalState={activeTacticalState}
              onUpdateTacticalState={handleUpdateTacticalState}
              characters={allCharacters}
              selectedNpcId={selectedNpcId}
              onSelectNpc={setSelectedNpcId}
              onUpdateNpc={handleUpdateNpc}
              currentUserRole={currentUser?.role || 'mestre'}
              onOpenFullNpcSheet={(npcId) => {
                setSelectedNpcId(npcId);
                setActiveViewMode('split');
              }}
              hasEditPermission={canEditCurrent}
              onOpenPlayerPermissions={() => setPlayerPermsModalOpen(true)}
              editorCount={effectiveEditorIds.length}
              users={users}
              editorUserIds={effectiveEditorIds}
              onTogglePlayerPermission={handleTogglePlayerPermission}
              onSetAllPlayerPermissions={handleSetAllPlayerPermissions}
            />
          </div>
        ) : activeViewMode === 'split' ? (
          /* MODO VISÃO DIVIDIDA: MESA TÁTICA + FICHA DO PERSONAGEM */
          <div className="flex flex-col xl:flex-row gap-3.5 items-start w-full">
            <div className="flex-1 min-w-0 w-full xl:w-7/12">
              <TacticalMapWorkspace
                tacticalState={activeTacticalState}
                onUpdateTacticalState={handleUpdateTacticalState}
                characters={allCharacters}
                selectedNpcId={selectedNpcId}
                onSelectNpc={setSelectedNpcId}
                onUpdateNpc={handleUpdateNpc}
                currentUserRole={currentUser?.role || 'mestre'}
                onOpenFullNpcSheet={(npcId) => setSelectedNpcId(npcId)}
                hasEditPermission={canEditCurrent}
                onOpenPlayerPermissions={() => setPlayerPermsModalOpen(true)}
                editorCount={effectiveEditorIds.length}
                users={users}
                editorUserIds={effectiveEditorIds}
                onTogglePlayerPermission={handleTogglePlayerPermission}
                onSetAllPlayerPermissions={handleSetAllPlayerPermissions}
              />
            </div>
            <div className="w-full xl:w-5/12 shrink-0 xl:sticky xl:top-14">
              {selectedNpc ? (
                <NpcDetailView
                  npc={selectedNpc}
                  onUpdateNpc={handleUpdateNpc}
                  onDeleteNpc={handleDeleteNpc}
                  onDuplicateNpc={handleDuplicateNpc}
                  onOpenAvatarPicker={(npc) => setAvatarModalNpc(npc)}
                  onOpenConditionsCrud={() => setConditionsCrudOpen(true)}
                  onOpenDamageCalculator={(npc) => setDamageModalNpc(npc)}
                  onOpenWeaponModal={(weapon) =>
                    setWeaponModalState({ isOpen: true, weapon: weapon || null })
                  }
                  onRemoveActiveSpell={handleRemoveActiveSpell}
                  onRemoveAffectedSpell={handleRemoveAffectedSpell}
                  isPlayerUser={isPlayerUser}
                  currentUserRole={isMaster ? 'mestre' : canEditCurrent ? 'jogador' : 'visualizador'}
                  hasEditPermission={canEditCurrent}
                  currentRound={activeCombat?.currentRound ?? (activeCombat as any)?.round ?? 0}
                  conditions={conditions}
                />
              ) : (
                <div className="py-16 text-center text-xs text-slate-400 bg-slate-900/60 rounded-2xl border border-slate-800 p-8">
                  Selecione um token na mesa tática para exibir e gerenciar a ficha completa aqui.
                </div>
              )}
            </div>
          </div>
        ) : (
          /* MODO FICHAS & LOG GERAL */
          <div className="flex flex-col xl:flex-row gap-4 items-start w-full">
            {/* Coluna da Esquerda: Ficha do Personagem/NPC Selecionado */}
            <div className="flex-1 min-w-0 w-full">
              {allCharacters.length === 0 ? (
                isPlayerUser ? (
                  <div className="py-20 text-center space-y-3 max-w-md mx-auto bg-slate-900/60 border border-slate-800 rounded-2xl p-8 shadow-xl">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                      <EyeOff size={24} className="text-slate-500" />
                    </div>
                    <h2 className="text-base font-bold text-white">Cena Oculta ou em Preparação</h2>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Nenhum personagem ou NPC visível no momento. Aguarde as orientações do Mestre.
                    </p>
                  </div>
                ) : (
                  <div className="py-16 text-center space-y-4 max-w-md mx-auto bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-8">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center">
                      <Swords size={28} />
                    </div>
                    <h2 className="text-lg font-bold text-white">Nenhum Personagem ou NPC</h2>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Use os botões na barra superior esquerda para cadastrar novos Personagens ou NPCs.
                    </p>
                    <div className="pt-2 flex items-center justify-center gap-2">
                      <button
                        onClick={handleAddNewPlayer}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow transition-colors"
                      >
                        <Plus size={15} />
                        <span>Cadastrar Personagem</span>
                      </button>
                      <button
                        onClick={handleAddNewNpc}
                        className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow transition-colors"
                      >
                        <Plus size={15} />
                        <span>Criar NPC</span>
                      </button>
                    </div>
                  </div>
                )
              ) : selectedNpc ? (
                <NpcDetailView
                  npc={selectedNpc}
                  onUpdateNpc={handleUpdateNpc}
                  onDeleteNpc={handleDeleteNpc}
                  onDuplicateNpc={handleDuplicateNpc}
                  onOpenAvatarPicker={(npc) => setAvatarModalNpc(npc)}
                  onOpenConditionsCrud={() => setConditionsCrudOpen(true)}
                  onOpenDamageCalculator={(npc) => setDamageModalNpc(npc)}
                  onOpenWeaponModal={(weapon) =>
                    setWeaponModalState({ isOpen: true, weapon: weapon || null })
                  }
                  onRemoveActiveSpell={handleRemoveActiveSpell}
                  onRemoveAffectedSpell={handleRemoveAffectedSpell}
                  isPlayerUser={isPlayerUser}
                  currentUserRole={isMaster ? 'mestre' : canEditCurrent ? 'jogador' : 'visualizador'}
                  hasEditPermission={canEditCurrent}
                  currentRound={activeCombat?.currentRound ?? (activeCombat as any)?.round ?? 0}
                  conditions={conditions}
                />
              ) : (
                <div className="py-12 text-center text-xs text-slate-400">
                  Selecione um Personagem ou NPC nos cards acima para exibir e controlar a ficha completa.
                </div>
              )}
            </div>

            {/* Coluna da Direita: Log Geral de Combate */}
            <div className="w-full xl:w-[380px] 2xl:w-[440px] shrink-0 xl:sticky xl:top-14">
              <GeneralCombatLog
                activeCombat={activeCombat}
                additionalCharacters={allCharacters}
                onSelectNpc={(npcId) => setSelectedNpcId(npcId)}
                selectedNpcId={selectedNpcId}
                currentUserRole={currentUser?.role || 'mestre'}
                currentUserName={currentUser?.name}
                onClearHistory={handleClearActiveCombatHistory}
                onDeleteEntry={handleDeleteLogEntry}
              />
            </div>
          </div>
        )}
      </main>

      {/* 4. MODALS */}
      {/* Online Room Sync Modal */}
      <OnlineRoomModal
        isOpen={onlineRoomModalOpen}
        onClose={() => setOnlineRoomModalOpen(false)}
        syncStatus={syncStatus}
        currentRoom={currentRoom}
        onConnectRoom={(newRoom) => {
          setCurrentRoom(newRoom);
          onlineSyncService.connect(newRoom);
        }}
        onForceSync={() => broadcastSync()}
      />

      {/* Conditions CRUD Modal */}
      <ConditionsCrudModal
        isOpen={conditionsCrudOpen}
        onClose={() => setConditionsCrudOpen(false)}
        conditions={conditions}
        activeNpcConditions={selectedNpc?.statusConditions || []}
        onToggleNpcCondition={handleToggleNpcCondition}
        onCreateCondition={handleCreateCondition}
        onUpdateCondition={handleUpdateCondition}
        onDeleteCondition={handleDeleteCondition}
        currentRound={activeCombat?.currentRound ?? (activeCombat as any)?.round ?? 0}
      />

      {/* Weapon Modal */}
      <WeaponModal
        isOpen={weaponModalState.isOpen}
        initialWeapon={weaponModalState.weapon}
        onClose={() => setWeaponModalState({ isOpen: false, weapon: null })}
        onSave={handleSaveWeapon}
      />

      {/* User Accounts CRUD Modal */}
      {currentUser && (
        <UserAccountsCrudModal
          isOpen={userAccountsModalOpen}
          onClose={() => setUserAccountsModalOpen(false)}
          users={users}
          currentUser={currentUser}
          onCreateUser={handleCreateUser}
          onResetUserPassword={handleResetUserPassword}
          onDeleteUser={handleDeleteUser}
        />
      )}

      {/* Player Permissions Modal (Mestre concede permissão de edição) */}
      <PlayerPermissionsModal
        isOpen={playerPermsModalOpen}
        onClose={() => setPlayerPermsModalOpen(false)}
        users={users}
        editorUserIds={effectiveEditorIds}
        onTogglePermission={handleTogglePlayerPermission}
        onSetAllPermissions={handleSetAllPlayerPermissions}
      />

      {/* Combat Players Modal (+ Personagens: Gerenciar personagens ativos no combate) */}
      <CombatPlayersModal
        isOpen={combatPlayersModalOpen}
        onClose={() => setCombatPlayersModalOpen(false)}
        players={players}
        activePlayerIds={activeCombatPlayerIds}
        onTogglePlayer={handleTogglePlayerInCombat}
        onSetAllPlayers={handleSetAllPlayersInCombat}
        onAddNewPlayer={handleAddNewPlayer}
      />

      {/* Login & Redefinição de Senha Modal */}
      <LoginModal
        isOpen={loginModalOpen || !currentUser}
        users={users}
        canDismiss={!!currentUser}
        onClose={() => setLoginModalOpen(false)}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setLoginModalOpen(false);
        }}
        onUpdateUserPassword={handleUpdateUserPassword}
      />

      {/* Damage & Fatigue Calculator Modal */}
      {damageModalNpc && (
        <DamageCalculatorModal
          npc={damageModalNpc}
          isOpen={true}
          onClose={() => setDamageModalNpc(null)}
          onApplyDamage={handleApplyDamage}
          onApplyFatigue={handleApplyFatigue}
          onApplyItemChange={handleApplyItemChange}
          onAddQuickItem={(npcId, item) => {
            const target = allCharacters.find((n: NPC) => n.id === npcId);
            if (target) {
              const current = target.extraItems || [];
              if (!current.some((it: ExtraItem) => it.id === item.id)) {
                handleUpdateNpc({
                  ...target,
                  extraItems: [...current, item],
                });
              }
            }
          }}
          isPlayerView={isPlayerUser}
          combatants={allCharacters}
          currentRound={activeCombat?.currentRound ?? (activeCombat as any)?.round ?? 0}
          currentUserName={currentUser?.name}
        />
      )}

      {/* Avatar Picker / Upload Modal */}
      {avatarModalNpc && (
        <AvatarPickerModal
          currentAvatar={avatarModalNpc.avatar}
          currentPreset={avatarModalNpc.avatarPreset}
          npcName={avatarModalNpc.name}
          isOpen={true}
          onClose={() => setAvatarModalNpc(null)}
          onSave={(avatarDataUrl, preset) => {
            handleUpdateNpc({
              ...avatarModalNpc,
              avatar: avatarDataUrl,
              avatarPreset: preset,
            });
          }}
        />
      )}

      {/* Combat Creator & Switcher Modal */}
      <CombatManagerModal
        isOpen={combatManagerOpen}
        onClose={() => setCombatManagerOpen(false)}
        combats={combats}
        activeCombatId={activeCombatId}
        onSelectCombat={handleSelectCombat}
        onCreateCombat={handleCreateCombat}
        onDeleteCombat={handleDeleteCombat}
        onRenameCombat={handleRenameCombat}
        onToggleCombatActive={handleToggleCombatActive}
      />

      {/* System Debug / Sync Log Modal */}
      <SystemLogModal
        isOpen={systemLogModalOpen}
        onClose={() => setSystemLogModalOpen(false)}
      />
    </div>
  );
}
