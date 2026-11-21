import { useEffect, useState } from 'react';
import { ArmorKit, BodyArmorLocation, Combat, NPC, Spell } from '../types/rpg';

export const EMPTY_COMBAT_PRESET: Combat = {
  id: 'combat-vazio',
  name: 'Sem combate',
  npcs: [],
  round: 0,
  events: [],
  createdAt: '29/09/2026',
  playerIds: [
    'npc-1791647017149-8h46w',
    'npc-1791656410781-k0cy8',
    'npc-1791656413293-ia1k7',
    'npc-1791727000932-ki8we',
    'npc-1791811892267-pb4qs',
    'npc-1791812994314-3r2mi',
    'npc-1791942567682-duoaf',
    'npc-1791943052637-2lvgl',
    'npc-1791943809458-8np7c',
    'npc-1791944567767-m9e2k',
  ],
  description: 'Nenhum NPC neste combate. Deixa a tela dos jogadores limpa e oculta.',
  currentRound: 0,
  editorUserIds: [],
};

export const INITIAL_COMBATS: Combat[] = [
  {
    id: 'combat-vazio',
    name: 'Sem combate',
    npcs: [],
    round: 0,
    events: [],
    createdAt: '29/09/2026',
    playerIds: [
      'npc-1791647017149-8h46w',
      'npc-1791656410781-k0cy8',
      'npc-1791656413293-ia1k7',
      'npc-1791727000932-ki8we',
      'npc-1791811892267-pb4qs',
      'npc-1791812994314-3r2mi',
      'npc-1791942567682-duoaf',
      'npc-1791943052637-2lvgl',
      'npc-1791943809458-8np7c',
      'npc-1791944567767-m9e2k',
    ],
    description: 'Nenhum NPC neste combate. Deixa a tela dos jogadores limpa e oculta.',
    currentRound: 0,
    editorUserIds: [],
  },
  {
    id: 'combat-1791646854042-rotw',
    name: 'Combate do Porto',
    npcs: [],
    round: 0,
    events: [],
    roundLog: [
      { round: 1, endedAt: 1791726924897 },
      { round: 2, endedAt: 1791726926626 },
      { round: 3, endedAt: 1791726927655 },
      { round: 4, endedAt: 1791830226569 },
    ],
    createdAt: '10/10/2026',
    playerIds: [
      'npc-1791656410781-k0cy8',
      'npc-1791656413293-ia1k7',
      'npc-1791647017149-8h46w',
      'npc-1791727000932-ki8we',
    ],
    description: '',
    currentRound: 0,
    editorUserIds: [
      'user-mv37om22fetmwu1q',
      'Renato',
      'user-mv37opqxi87qtpk0',
      'Jorio',
    ],
  },
];

export type HoundsPresetsStatus = 'idle' | 'loading' | 'ready' | 'error';

export type HoundsPresetsErrorCode =
  | 'NOT_FOUND'
  | 'SERVER_ERROR'
  | 'INVALID_JSON'
  | 'NETWORK_ERROR'
  | 'INVALID_PAYLOAD';

export interface HoundsPresetsState {
  status: HoundsPresetsStatus;
  players: NPC[];
  errorCode: HoundsPresetsErrorCode | null;
  errorMessage: string | null;
}

interface CompactSpell extends Omit<Spell, 'description'> {
  description?: string;
  descriptionRef?: number;
}

interface CompactArmorKit extends Omit<ArmorKit, 'locations'> {
  locations?: BodyArmorLocation[];
  locationsRef?: number;
}

interface CompactPresetPlayer extends Omit<NPC, 'spells' | 'armorLocations' | 'armorKits'> {
  spells?: CompactSpell[];
  armorLocations?: BodyArmorLocation[];
  armorLocationsRef?: number;
  armorKits?: CompactArmorKit[];
}

export interface HoundsPresetsPayload {
  version: number;
  spellDescriptions: string[];
  armorLocationTemplates: BodyArmorLocation[][];
  players: CompactPresetPlayer[];
}

const PRESETS_RELATIVE_PATH = 'dados/hounds-presets.json';

function deepClone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidTableIndex(index: unknown, length: number): index is number {
  return typeof index === 'number' && Number.isInteger(index) && index >= 0 && index < length;
}

/**
 * Valida e hidrata o payload deduplicado de `dados/hounds-presets.json`.
 * Lança erro caso qualquer campo obrigatório ou referência esteja inválido,
 * garantindo que nenhum dado parcialmente reconstruído seja devolvido.
 * Todos os objetos reconstruídos são clonados profundamente para evitar
 * mutação acidental em referências compartilhadas.
 */
export function hydrateHoundsPresetsPayload(rawPayload: unknown): NPC[] {
  if (!isPlainObject(rawPayload)) {
    throw new Error('Payload de presets inválido: esperado objeto JSON.');
  }

  const rawPlayers = rawPayload.players;
  if (!Array.isArray(rawPlayers) || rawPlayers.length === 0) {
    throw new Error('Payload de presets inválido: lista "players" ausente ou vazia.');
  }

  const rawSpellDescriptions = rawPayload.spellDescriptions ?? [];
  if (
    !Array.isArray(rawSpellDescriptions) ||
    !rawSpellDescriptions.every((item) => typeof item === 'string')
  ) {
    throw new Error('Payload de presets inválido: tabela "spellDescriptions" corrompida.');
  }

  const rawArmorTemplates = rawPayload.armorLocationTemplates ?? [];
  if (
    !Array.isArray(rawArmorTemplates) ||
    !rawArmorTemplates.every((tpl) => Array.isArray(tpl))
  ) {
    throw new Error('Payload de presets inválido: tabela "armorLocationTemplates" corrompida.');
  }

  const hydratedPlayers: NPC[] = [];

  for (let i = 0; i < rawPlayers.length; i++) {
    const rawPlayer = rawPlayers[i];
    if (!isPlainObject(rawPlayer)) {
      throw new Error(`Personagem preset #${i} inválido.`);
    }
    if (typeof rawPlayer.id !== 'string' || !rawPlayer.id.trim()) {
      throw new Error(`Personagem preset #${i} sem "id" válido.`);
    }
    if (typeof rawPlayer.name !== 'string' || !rawPlayer.name.trim()) {
      throw new Error(`Personagem preset #${i} sem "name" válido.`);
    }

    const cloned = deepClone(rawPlayer) as Record<string, unknown>;

    if (cloned.armorLocationsRef !== undefined) {
      if (!isValidTableIndex(cloned.armorLocationsRef, rawArmorTemplates.length)) {
        throw new Error(
          `Referência armorLocationsRef inválida no personagem "${rawPlayer.name}".`
        );
      }
      cloned.armorLocations = deepClone(rawArmorTemplates[cloned.armorLocationsRef]);
      delete cloned.armorLocationsRef;
    }

    if (cloned.armorKits !== undefined) {
      if (!Array.isArray(cloned.armorKits)) {
        throw new Error(`Campo "armorKits" inválido no personagem "${rawPlayer.name}".`);
      }
      cloned.armorKits = cloned.armorKits.map((rawKit, kitIdx) => {
        if (!isPlainObject(rawKit)) {
          throw new Error(`Kit de armadura #${kitIdx} inválido em "${rawPlayer.name}".`);
        }
        const kit = { ...rawKit };
        if (kit.locationsRef !== undefined) {
          if (!isValidTableIndex(kit.locationsRef, rawArmorTemplates.length)) {
            throw new Error(
              `Referência locationsRef inválida no kit #${kitIdx} de "${rawPlayer.name}".`
            );
          }
          kit.locations = deepClone(rawArmorTemplates[kit.locationsRef]);
          delete kit.locationsRef;
        }
        return kit;
      });
    }

    if (cloned.spells !== undefined) {
      if (!Array.isArray(cloned.spells)) {
        throw new Error(`Campo "spells" inválido no personagem "${rawPlayer.name}".`);
      }
      cloned.spells = cloned.spells.map((rawSpell, spellIdx) => {
        if (!isPlainObject(rawSpell)) {
          throw new Error(`Magia #${spellIdx} inválida em "${rawPlayer.name}".`);
        }
        const spell = { ...rawSpell };
        if (spell.descriptionRef !== undefined) {
          if (!isValidTableIndex(spell.descriptionRef, rawSpellDescriptions.length)) {
            throw new Error(
              `Referência descriptionRef inválida na magia #${spellIdx} de "${rawPlayer.name}".`
            );
          }
          spell.description = rawSpellDescriptions[spell.descriptionRef];
          delete spell.descriptionRef;
        }
        return spell;
      });
    }

    hydratedPlayers.push(cloned as unknown as NPC);
  }

  return hydratedPlayers;
}

/**
 * Resolve URLs candidatas para `dados/hounds-presets.json`, funcionando tanto
 * na abertura direta (GitHub Pages em subdiretório ou raiz) quanto dentro do
 * Hub via `iframe.srcdoc` (onde `window.location.href` é `about:srcdoc`).
 */
export function resolveHoundsPresetsUrls(): string[] {
  const candidates: string[] = [];
  const pushUnique = (url: string | null | undefined) => {
    if (url && !candidates.includes(url)) {
      candidates.push(url);
    }
  };

  const tryResolveFromBase = (baseUrl: string | undefined) => {
    if (!baseUrl || !/^https?:\/\//i.test(baseUrl)) return;
    try {
      pushUnique(new URL(PRESETS_RELATIVE_PATH, baseUrl).toString());
    } catch {
      // ignora base inválida
    }
  };

  if (typeof window !== 'undefined') {
    try {
      if (window.parent && window.parent !== window && window.parent.location?.href) {
        tryResolveFromBase(window.parent.location.href);
      }
    } catch {
      // origem diferente: ignora
    }

    if (typeof document !== 'undefined' && document.baseURI) {
      tryResolveFromBase(document.baseURI);
    }

    if (window.location?.href) {
      tryResolveFromBase(window.location.href);
    }
  }

  pushUnique(PRESETS_RELATIVE_PATH);
  pushUnique(`/${PRESETS_RELATIVE_PATH}`);

  return candidates;
}

let cachedPlayers: NPC[] = [];
let currentState: HoundsPresetsState = {
  status: 'idle',
  players: [],
  errorCode: null,
  errorMessage: null,
};
let activeLoadPromise: Promise<HoundsPresetsState> | null = null;
const listeners = new Set<(state: HoundsPresetsState) => void>();

function emitState(next: HoundsPresetsState): HoundsPresetsState {
  currentState = next;
  listeners.forEach((listener) => {
    try {
      listener(getHoundsPresetsState());
    } catch {
      // protege demais listeners contra erros isolados
    }
  });
  return getHoundsPresetsState();
}

export function getHoundsPresetsState(): HoundsPresetsState {
  return {
    status: currentState.status,
    players: currentState.status === 'ready' ? deepClone(cachedPlayers) : [],
    errorCode: currentState.errorCode,
    errorMessage: currentState.errorMessage,
  };
}

export function getHoundsPresets(): NPC[] {
  if (currentState.status !== 'ready') return [];
  return deepClone(cachedPlayers);
}

export function findHoundsPreset(id?: string, name?: string): NPC | undefined {
  if (currentState.status !== 'ready' || cachedPlayers.length === 0) return undefined;
  const normalizedName = name ? name.trim().toLowerCase() : '';
  const match = cachedPlayers.find(
    (hp) =>
      (id && hp.id === id) ||
      (Boolean(normalizedName) && Boolean(hp.name) && hp.name.trim().toLowerCase() === normalizedName)
  );
  return match ? deepClone(match) : undefined;
}

export function subscribeHoundsPresets(listener: (state: HoundsPresetsState) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export interface LoadHoundsPresetsOptions {
  fetchFn?: typeof fetch;
  urls?: string[];
  forceReload?: boolean;
}

/**
 * Carrega e hidrata os presets externos (`dados/hounds-presets.json`).
 * Nunca rejeita a Promise e nunca disponibiliza dados parcialmente reconstruídos.
 */
export function loadHoundsPresets(
  options: LoadHoundsPresetsOptions = {}
): Promise<HoundsPresetsState> {
  const { fetchFn, urls, forceReload = false } = options;

  if (!forceReload && currentState.status === 'ready') {
    return Promise.resolve(getHoundsPresetsState());
  }

  if (!forceReload && activeLoadPromise) {
    return activeLoadPromise;
  }

  const effectiveFetch = fetchFn ?? (typeof fetch === 'function' ? fetch : undefined);
  const candidateUrls = urls && urls.length > 0 ? urls : resolveHoundsPresetsUrls();

  cachedPlayers = [];
  emitState({
    status: 'loading',
    players: [],
    errorCode: null,
    errorMessage: null,
  });

  const runLoad = (async (): Promise<HoundsPresetsState> => {
    if (!effectiveFetch) {
      cachedPlayers = [];
      return emitState({
        status: 'error',
        players: [],
        errorCode: 'NETWORK_ERROR',
        errorMessage:
          'Personagens padrão indisponíveis: o ambiente atual não oferece suporte a carregamento via rede.',
      });
    }

    let lastFailure: { code: HoundsPresetsErrorCode; message: string } = {
      code: 'NOT_FOUND',
      message:
        'Arquivo de personagens padrão (dados/hounds-presets.json) não encontrado. A Mesa continua funcionando normalmente com dados locais.',
    };

    for (const url of candidateUrls) {
      let response: Response;
      try {
        response = await effectiveFetch(url, { cache: 'no-cache' });
      } catch {
        lastFailure = {
          code: 'NETWORK_ERROR',
          message:
            'Falha de rede ao carregar os personagens padrão. Verifique sua conexão; a Mesa continua disponível para uso local.',
        };
        continue;
      }

      if (response.status === 404) {
        lastFailure = {
          code: 'NOT_FOUND',
          message:
            'Arquivo de personagens padrão (dados/hounds-presets.json) não encontrado (HTTP 404). A Mesa continua funcionando normalmente.',
        };
        continue;
      }

      if (!response.ok) {
        cachedPlayers = [];
        return emitState({
          status: 'error',
          players: [],
          errorCode: 'SERVER_ERROR',
          errorMessage: `Não foi possível carregar os personagens padrão (erro do servidor HTTP ${response.status}). A Mesa continua operando normalmente.`,
        });
      }

      let rawText: string;
      try {
        rawText = await response.text();
      } catch {
        cachedPlayers = [];
        return emitState({
          status: 'error',
          players: [],
          errorCode: 'NETWORK_ERROR',
          errorMessage:
            'Falha ao ler os dados dos personagens padrão. A Mesa continua operando normalmente.',
        });
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        cachedPlayers = [];
        return emitState({
          status: 'error',
          players: [],
          errorCode: 'INVALID_JSON',
          errorMessage:
            'Os dados de personagens padrão estão corrompidos ou inválidos (JSON inválido). Nenhum preset parcial foi carregado.',
        });
      }

      try {
        const hydrated = hydrateHoundsPresetsPayload(parsed);
        cachedPlayers = hydrated;
        return emitState({
          status: 'ready',
          players: hydrated,
          errorCode: null,
          errorMessage: null,
        });
      } catch {
        cachedPlayers = [];
        return emitState({
          status: 'error',
          players: [],
          errorCode: 'INVALID_PAYLOAD',
          errorMessage:
            'Os dados de personagens padrão possuem estrutura inválida ou incompleta. Nenhum preset parcial foi carregado.',
        });
      }
    }

    cachedPlayers = [];
    return emitState({
      status: 'error',
      players: [],
      errorCode: lastFailure.code,
      errorMessage: lastFailure.message,
    });
  })();

  activeLoadPromise = runLoad.finally(() => {
    if (activeLoadPromise === runLoad) {
      activeLoadPromise = null;
    }
  });

  return activeLoadPromise;
}

export function useHoundsPresetsState(): HoundsPresetsState {
  const [state, setState] = useState<HoundsPresetsState>(() => getHoundsPresetsState());

  useEffect(() => {
    setState(getHoundsPresetsState());
    return subscribeHoundsPresets(setState);
  }, []);

  return state;
}

/**
 * Apenas para isolamento em testes automatizados.
 */
export function resetHoundsPresetsCacheForTests(): void {
  cachedPlayers = [];
  activeLoadPromise = null;
  currentState = {
    status: 'idle',
    players: [],
    errorCode: null,
    errorMessage: null,
  };
  listeners.clear();
}
