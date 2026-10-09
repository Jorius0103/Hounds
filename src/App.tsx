import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Combat, NPC, ConditionDefinition, ActionLogEntry, UserAccount, UserRole, Weapon, ExtraItem } from './types/rpg';
import { INITIAL_COMBATS, EMPTY_COMBAT_PRESET, HOUNDS_PLAYERS, AZUR_CHARACTER } from './utils/presets';
import { createNewNpc, DEFAULT_CONDITIONS, getNextIncrementalName } from './utils/gurps';
import { onlineSyncService, SyncStatus, RemoteSyncPayload } from './utils/onlineSync';
import { TopNav } from './components/TopNav';
import { NpcListBar } from './components/NpcListBar';
import { NpcDetailView } from './components/NpcDetailView';
import { DamageCalculatorModal } from './components/DamageCalculatorModal';
import { AvatarPickerModal } from './components/AvatarPickerModal';
import { CombatManagerModal } from './components/CombatManagerModal';
import { ConditionsCrudModal } from './components/ConditionsCrudModal';
import { UserAccountsCrudModal } from './components/UserAccountsCrudModal';
import { LoginModal } from './components/LoginModal';
import { WeaponModal } from './components/WeaponModal';
import { OnlineRoomModal } from './components/OnlineRoomModal';
import { GeneralCombatLog } from './components/GeneralCombatLog';
import { SystemLogModal } from './components/SystemLogModal';
import { systemLogger } from './utils/systemLogger';
import { Swords, Plus, EyeOff } from 'lucide-react';

const STORAGE_KEY = 'gurps_combat_master_data_v2';
const CONDITIONS_KEY = 'gurps_combat_master_conditions_v2';
const USERS_STORAGE_KEY = 'gurps_combat_master_users_v2';
const PLAYERS_STORAGE_KEY = 'gurps_fixed_personagens_v1';
const SYNC_CHANNEL_NAME = 'gurps_combat_realtime_sync_v2';

// Função de fusão granular por personagem (CRDT LWW) livre de conflitos e sobrescritas
function mergeNpcLists(currentList: NPC[], incomingList: NPC[]): { merged: NPC[]; changed: boolean } {
  let changed = false;
  const map = new Map<string, NPC>();
  currentList.forEach((n) => map.set(n.id, n));

  for (const incoming of incomingList) {
    const existing = map.get(incoming.id);
    if (!existing) {
      map.set(incoming.id, incoming);
      changed = true;
    } else {
      const incomingTime = incoming.updatedAt || 0;
      const existingTime = existing.updatedAt || 0;

      if (incomingTime > existingTime) {
        map.set(incoming.id, incoming);
        changed = true;
      } else if (incomingTime === existingTime) {
        // Se ambos possuem mesmo timestamp, preserva a versão que tiver contagem de ações de turno mais detalhada
        const incActions = incoming.turnActions || { parryCount: 0, dodgeCount: 0, blockCount: 0 };
        const extActions = existing.turnActions || { parryCount: 0, dodgeCount: 0, blockCount: 0 };
        const incSum = (incActions.parryCount || 0) + (incActions.dodgeCount || 0) + (incActions.blockCount || 0);
        const extSum = (extActions.parryCount || 0) + (extActions.dodgeCount || 0) + (extActions.blockCount || 0);
        if (incSum > extSum) {
          map.set(incoming.id, incoming);
          changed = true;
        }
      }
    }
  }

  const merged = Array.from(map.values());
  return { merged, changed };
}

function mergeCombats(currentCombats: Combat[], incomingCombats: Combat[]): { merged: Combat[]; changed: boolean } {
  let changed = false;
  const map = new Map<string, Combat>();
  currentCombats.forEach((c) => map.set(c.id, c));

  for (const incoming of incomingCombats) {
    const existing = map.get(incoming.id);
    if (!existing) {
      map.set(incoming.id, incoming);
      changed = true;
    } else {
      const { merged: mergedNpcs, changed: npcsChanged } = mergeNpcLists(existing.npcs || [], incoming.npcs || []);
      if (npcsChanged) {
        changed = true;
      }
      map.set(incoming.id, {
        ...existing,
        ...incoming,
        npcs: mergedNpcs,
      });
    }
  }

  const merged = Array.from(map.values());
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
    id: 'user-espectador',
    name: 'Espectador',
    role: 'visualizador',
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
          const hasEmpty = parsed.some((c: Combat) => c.id === 'combat-vazio' || c.name.toLowerCase().includes('vazio'));
          return hasEmpty ? parsed : [...parsed, EMPTY_COMBAT_PRESET];
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
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);

  const [activeCombatId, setActiveCombatId] = useState<string>(() => {
    return combats[0]?.id || 'combat-floresta-sombria';
  });

  const activeCombat = combats.find((c) => c.id === activeCombatId) || combats[0];

  // Lista unificada: Personagens Fixos + NPCs específicos do combate ativo
  // Garante que todos os Personagens (player) em players ou em combates estejam sempre presentes
  const allCharacters = useMemo(() => {
    const list: NPC[] = [...players];
    const seen = new Set(players.map((p) => p.id));
    for (const c of combats) {
      for (const n of c.npcs || []) {
        if (n.characterType === 'player' && !seen.has(n.id)) {
          seen.add(n.id);
          list.push({ ...n, isVisibleToPlayer: true });
        }
      }
    }
    for (const n of activeCombat?.npcs || []) {
      if (n.characterType !== 'player' && !seen.has(n.id)) {
        seen.add(n.id);
        list.push(n);
      }
    }
    return list;
  }, [players, combats, activeCombat]);

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
  const [loginModalOpen, setLoginModalOpen] = useState(true);
  const [damageModalNpc, setDamageModalNpc] = useState<NPC | null>(null);
  const [avatarModalNpc, setAvatarModalNpc] = useState<NPC | null>(null);
  const [weaponModalState, setWeaponModalState] = useState<{ isOpen: boolean; weapon?: Weapon | null }>({
    isOpen: false,
    weapon: null,
  });
  const [systemLogModalOpen, setSystemLogModalOpen] = useState(false);
  const [systemLogsCount, setSystemLogsCount] = useState(0);

  useEffect(() => {
    return systemLogger.subscribe((logs) => {
      setSystemLogsCount(logs.length);
    });
  }, []);

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
          if (msgTime > (lastLocalEditTimestampRef.current || 0)) {
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
      description,
      createdAt: new Date().toLocaleDateString('pt-BR'),
      npcs: [],
    };
    const updated = [newCombat, ...combats];
    setCombats(updated);
    setActiveCombatId(id);
    broadcastSync(updated, undefined, undefined, id);
    setCombatManagerOpen(false);
  };

  const handleDeleteCombat = (id: string) => {
    const remaining = combats.filter((c) => c.id !== id);
    setCombats(remaining);
    const nextActiveId = activeCombatId === id && remaining.length > 0 ? remaining[0].id : activeCombatId;
    if (activeCombatId === id && remaining.length > 0) {
      setActiveCombatId(nextActiveId);
    }
    broadcastSync(remaining, undefined, undefined, nextActiveId);
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
    if (!activeCombat) return;
    const newNpc = createNewNpc('NOVO NPC');
    newNpc.characterType = 'npc';
    const updated = combats.map((c) =>
      c.id === activeCombat.id ? { ...c, npcs: [...c.npcs, newNpc] } : c
    );
    setCombats(updated);
    broadcastSync(updated);
    setSelectedNpcId(newNpc.id);
  };

  // Atualização unificada de Personagem ou NPC (usando stateRef para garantir sincronização síncrona sem race conditions)
  const handleUpdateNpc = (updatedNpc: NPC) => {
    const editTimestamp = updatedNpc.updatedAt || Date.now();
    const npcWithTimestamp: NPC = {
      ...updatedNpc,
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

  const handleToggleNpcCondition = (conditionId: string) => {
    if (!selectedNpc) return;
    const current = selectedNpc.statusConditions || [];
    const exists = current.includes(conditionId);
    const updated = exists ? current.filter((c: string) => c !== conditionId) : [...current, conditionId];
    handleUpdateNpc({
      ...selectedNpc,
      statusConditions: updated,
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

  // Log and Damage Handlers
  const handleApplyDamage = (
    npcId: string,
    finalDamage: number,
    logEntry: Omit<ActionLogEntry, 'id'>
  ) => {
    const entryWithId: ActionLogEntry = {
      ...logEntry,
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };

    const isPlayer = players.some((p) => p.id === npcId);
    if (isPlayer) {
      const updatedPlayers = players.map((p) => {
        if (p.id !== npcId) return p;
        const newHp = Math.max(-p.hpMax * 5, p.hpCurrent - finalDamage);
        const isDead = newHp <= -p.hpMax;
        return {
          ...p,
          hpCurrent: newHp,
          isDead: isDead || p.isDead,
          history: [entryWithId, ...p.history],
        };
      });
      setPlayers(updatedPlayers);
      broadcastSync(undefined, undefined, undefined, undefined, updatedPlayers);
    } else if (activeCombat) {
      const updated = combats.map((c) => {
        if (c.id !== activeCombat.id) return c;
        return {
          ...c,
          npcs: c.npcs.map((n) => {
            if (n.id !== npcId) return n;
            const newHp = Math.max(-n.hpMax * 5, n.hpCurrent - finalDamage);
            const isDead = newHp <= -n.hpMax;
            return {
              ...n,
              hpCurrent: newHp,
              isDead: isDead || n.isDead,
              history: [entryWithId, ...n.history],
            };
          }),
        };
      });
      setCombats(updated);
      broadcastSync(updated);
    }
  };

  const handleApplyFatigue = (
    npcId: string,
    fpDelta: number,
    logEntry: Omit<ActionLogEntry, 'id'>
  ) => {
    const entryWithId: ActionLogEntry = {
      ...logEntry,
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };

    const isPlayer = players.some((p) => p.id === npcId);
    if (isPlayer) {
      const updatedPlayers = players.map((p) => {
        if (p.id !== npcId) return p;
        const newFp = Math.max(-p.fpMax, Math.min(p.fpMax, p.fpCurrent + fpDelta));
        return {
          ...p,
          fpCurrent: newFp,
          history: [entryWithId, ...p.history],
        };
      });
      setPlayers(updatedPlayers);
      broadcastSync(undefined, undefined, undefined, undefined, updatedPlayers);
    } else if (activeCombat) {
      const updated = combats.map((c) => {
        if (c.id !== activeCombat.id) return c;
        return {
          ...c,
          npcs: c.npcs.map((n) => {
            if (n.id !== npcId) return n;
            const newFp = Math.max(-n.fpMax, Math.min(n.fpMax, n.fpCurrent + fpDelta));
            return {
              ...n,
              fpCurrent: newFp,
              history: [entryWithId, ...n.history],
            };
          }),
        };
      });
      setCombats(updated);
      broadcastSync(updated);
    }
  };

  const handleApplyItemChange = (
    npcId: string,
    itemId: string,
    delta: number,
    logEntry: Omit<ActionLogEntry, 'id'>
  ) => {
    const entryWithId: ActionLogEntry = {
      ...logEntry,
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };

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
        return {
          ...p,
          extraItems: updatedItems,
          history: [entryWithId, ...p.history],
        };
      });
      setPlayers(updatedPlayers);
      broadcastSync(undefined, undefined, undefined, undefined, updatedPlayers);
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
            return {
              ...n,
              extraItems: updatedItems,
              history: [entryWithId, ...n.history],
            };
          }),
        };
      });
      setCombats(updated);
      broadcastSync(updated);
    }
  };

  const handleClearActiveCombatHistory = () => {
    if (!activeCombat) return;
    const updated = combats.map((c) => {
      if (c.id !== activeCombat.id) return c;
      return {
        ...c,
        npcs: c.npcs.map((n) => ({ ...n, history: [] })),
      };
    });
    setCombats(updated);
    broadcastSync(updated);
  };

  const handleDeleteLogEntry = (entryId: string, npcId?: string) => {
    if (npcId) {
      const isPlayer = players.some((p) => p.id === npcId);
      if (isPlayer) {
        const updatedPlayers = players.map((p) =>
          p.id === npcId
            ? { ...p, history: (p.history || []).filter((h) => h.id !== entryId) }
            : p
        );
        setPlayers(updatedPlayers);
        broadcastSync(undefined, undefined, undefined, undefined, updatedPlayers);
      } else {
        const updatedCombats = combats.map((c) => ({
          ...c,
          npcs: c.npcs.map((n) =>
            n.id === npcId
              ? { ...n, history: (n.history || []).filter((h) => h.id !== entryId) }
              : n
          ),
        }));
        setCombats(updatedCombats);
        broadcastSync(updatedCombats);
      }
    } else {
      const updatedPlayers = players.map((p) => ({
        ...p,
        history: (p.history || []).filter((h) => h.id !== entryId),
      }));
      setPlayers(updatedPlayers);

      const updatedCombats = combats.map((c) => ({
        ...c,
        npcs: c.npcs.map((n) => ({
          ...n,
          history: (n.history || []).filter((h) => h.id !== entryId),
        })),
      }));
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

  const isPlayerUser = currentUser?.role === 'jogador' || currentUser?.role === 'visualizador';

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
      />

      {/* 2. BARRA DE PERSONAGENS & NPCS (Espalha até a direita, filtros na esquerda) */}
      <NpcListBar
        npcs={allCharacters}
        selectedNpcId={selectedNpcId}
        onSelectNpc={setSelectedNpcId}
        onAddNewNpc={handleAddNewNpc}
        onAddNewPlayer={handleAddNewPlayer}
        onUpdateNpc={handlePartialUpdateNpc}
        currentUserRole={currentUser?.role || 'mestre'}
      />

      {/* 3. MAIN WORKSPACE (Layout Amplo estendido até a direita) */}
      <main className="flex-1 w-full p-3 sm:p-4 lg:px-5">
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
                isPlayerUser={isPlayerUser}
                currentUserRole={currentUser?.role || 'mestre'}
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
              additionalCharacters={players}
              onSelectNpc={(npcId) => setSelectedNpcId(npcId)}
              selectedNpcId={selectedNpcId}
              currentUserRole={currentUser?.role || 'mestre'}
              onClearHistory={handleClearActiveCombatHistory}
              onDeleteEntry={handleDeleteLogEntry}
            />
          </div>
        </div>
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
      />

      {/* System Debug / Sync Log Modal */}
      <SystemLogModal
        isOpen={systemLogModalOpen}
        onClose={() => setSystemLogModalOpen(false)}
      />
    </div>
  );
}
