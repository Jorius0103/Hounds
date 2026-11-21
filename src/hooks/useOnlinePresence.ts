import { useEffect, useState } from 'react';

const PRESENCE_TTL_MS = 35000;
const PRESENCE_POLL_MS = 3000;

let cachedActiveUserRaw: string | null | undefined = undefined;
let cachedActiveUserName: string | null = null;

function getCachedActiveUserName(): string | null {
  try {
    const raw = localStorage.getItem('hounds_active_user');
    if (raw === cachedActiveUserRaw) return cachedActiveUserName;
    cachedActiveUserRaw = raw;
    if (!raw) {
      cachedActiveUserName = null;
      return null;
    }
    const parsed = JSON.parse(raw);
    cachedActiveUserName =
      typeof parsed?.name === 'string' && parsed.name.trim()
        ? parsed.name.trim().toLowerCase()
        : null;
    return cachedActiveUserName;
  } catch {
    return null;
  }
}

export function collectOnlinePlayerNames(
  extraNames?: Set<string> | null,
  currentUserName?: string | null
): Set<string> {
  const set = new Set<string>();
  const now = Date.now();

  if (extraNames) {
    extraNames.forEach((n) => {
      if (n) set.add(n.trim().toLowerCase());
    });
  }

  if (currentUserName && currentUserName.trim()) {
    set.add(currentUserName.trim().toLowerCase());
  }

  const activeName = getCachedActiveUserName();
  if (activeName) {
    set.add(activeName);
  }

  try {
    if (typeof window !== 'undefined') {
      const localMap = (window as any)._houndsOnlineUsers as Record<string, number> | undefined;
      if (localMap && typeof localMap === 'object') {
        for (const [k, t] of Object.entries(localMap)) {
          if (typeof t === 'number' && now - t < PRESENCE_TTL_MS) {
            set.add(k.trim().toLowerCase());
          }
        }
      }

      const p = (window as any).parent;
      if (p?.hubUser?.name) {
        set.add(String(p.hubUser.name).trim().toLowerCase());
      }
      if (p?.hubOnlineUsers && typeof p.hubOnlineUsers === 'object') {
        for (const [k, t] of Object.entries(p.hubOnlineUsers as Record<string, number>)) {
          if (typeof t === 'number' && now - t < PRESENCE_TTL_MS) {
            set.add(k.trim().toLowerCase());
          }
        }
      }
      if (p?.BoardView && typeof p.BoardView.presence === 'function') {
        const pres = p.BoardView.presence();
        if (pres && typeof pres === 'object') {
          for (const k of Object.keys(pres)) {
            const entry = pres[k];
            if (entry?.nm && (!entry.t || now - entry.t < PRESENCE_TTL_MS)) {
              set.add(String(entry.nm).trim().toLowerCase());
            }
          }
        }
      }
    }
  } catch {
    // ignore cross-origin or missing parent errors
  }

  return set;
}

function areSetsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) {
    if (!b.has(v)) return false;
  }
  return true;
}

/**
 * Hook isolado para monitorar quais jogadores estão online sem forçar re-render em App.tsx.
 * Só atualiza o estado local quando o conjunto de nomes online efetivamente muda.
 */
export function useOnlinePlayerNames(
  extraNames?: Set<string>,
  enabled = true
): Set<string> {
  const [onlineSet, setOnlineSet] = useState<Set<string>>(() =>
    enabled ? collectOnlinePlayerNames(extraNames) : new Set<string>()
  );

  useEffect(() => {
    if (!enabled) return;

    const refresh = () => {
      const next = collectOnlinePlayerNames(extraNames);
      setOnlineSet((prev) => (areSetsEqual(prev, next) ? prev : next));
    };

    refresh();
    const interval = setInterval(refresh, PRESENCE_POLL_MS);
    window.addEventListener('hounds_presence_updated', refresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener('hounds_presence_updated', refresh);
    };
  }, [extraNames, enabled]);

  return onlineSet;
}

/**
 * Hook isolado para verificar se um único jogador está online.
 * Como retorna boolean, o React evita re-render do componente pai enquanto o status não mudar.
 */
export function useIsPlayerOnline(
  playerName?: string | null,
  extraNames?: Set<string>
): boolean {
  const normalized = playerName && playerName.trim() ? playerName.trim().toLowerCase() : '';

  const [isOnline, setIsOnline] = useState<boolean>(() =>
    normalized ? collectOnlinePlayerNames(extraNames).has(normalized) : false
  );

  useEffect(() => {
    if (!normalized) {
      setIsOnline(false);
      return;
    }

    const refresh = () => {
      const next = collectOnlinePlayerNames(extraNames).has(normalized);
      setIsOnline((prev) => (prev === next ? prev : next));
    };

    refresh();
    const interval = setInterval(refresh, PRESENCE_POLL_MS);
    window.addEventListener('hounds_presence_updated', refresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener('hounds_presence_updated', refresh);
    };
  }, [normalized, extraNames]);

  return isOnline;
}
