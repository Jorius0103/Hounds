import fs from 'fs';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  findHoundsPreset,
  getHoundsPresets,
  getHoundsPresetsState,
  hydrateHoundsPresetsPayload,
  loadHoundsPresets,
  resetHoundsPresetsCacheForTests,
  resolveHoundsPresetsUrls,
} from '../presets';

const PRESETS_JSON_PATH = path.resolve(process.cwd(), 'dados/hounds-presets.json');

describe('presets externalizados (dados/hounds-presets.json)', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resetHoundsPresetsCacheForTests();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  describe('integridade da deduplicação e isolamento de referências', () => {
    it('hidrata dados/hounds-presets.json preservando todos os 10 personagens, magias e armorLocations sem chaves residuais', () => {
      const rawJson = fs.readFileSync(PRESETS_JSON_PATH, 'utf8');
      const payload = JSON.parse(rawJson);

      expect(payload.version).toBe(1);
      expect(Array.isArray(payload.spellDescriptions)).toBe(true);
      expect(payload.spellDescriptions.length).toBeGreaterThan(0);
      expect(Array.isArray(payload.armorLocationTemplates)).toBe(true);
      expect(payload.armorLocationTemplates.length).toBeGreaterThan(0);

      const players = hydrateHoundsPresetsPayload(payload);
      expect(players).toHaveLength(10);

      const byName = new Map(players.map((p) => [p.name.trim(), p]));
      expect(byName.get('Azur')?.st).toBe(14);
      expect(byName.get('Azur')?.hpMax).toBe(15);
      expect(byName.get('Warren')?.spells).toHaveLength(87);
      expect(byName.get('Thoren')?.spells).toHaveLength(91);
      expect(byName.get('Jaher')?.spells).toHaveLength(50);
      expect(byName.get('Tuck')?.spells).toHaveLength(80);
      expect(byName.get('Enviado')?.spells).toHaveLength(16);

      for (const player of players) {
        expect('armorLocationsRef' in (player as unknown as Record<string, unknown>)).toBe(false);
        for (const kit of player.armorKits || []) {
          expect('locationsRef' in (kit as unknown as Record<string, unknown>)).toBe(false);
          expect(Array.isArray(kit.locations)).toBe(true);
          expect(kit.locations.length).toBeGreaterThan(0);
        }
        for (const spell of player.spells || []) {
          expect('descriptionRef' in (spell as unknown as Record<string, unknown>)).toBe(false);
          expect(typeof spell.description).toBe('string');
        }
      }
    });

    it('não compartilha referências mutáveis entre player.armorLocations, armorKits[].locations e chamadas subsequentes', async () => {
      const rawJson = fs.readFileSync(PRESETS_JSON_PATH, 'utf8');
      const mockFetch = vi.fn(async () => new Response(rawJson, { status: 200 }));

      const state = await loadHoundsPresets({
        fetchFn: mockFetch as unknown as typeof fetch,
        urls: ['dados/hounds-presets.json'],
      });
      expect(state.status).toBe('ready');

      const firstLoad = getHoundsPresets();
      const azur = firstLoad.find((p) => p.name.trim() === 'Azur');
      expect(azur).toBeDefined();
      expect(azur!.armorLocations.length).toBeGreaterThan(0);
      expect(azur!.armorKits && azur!.armorKits.length > 0).toBe(true);

      const originalDr = azur!.armorLocations[0].dr;
      const originalKitDr = azur!.armorKits![0].locations[0].dr;
      expect(originalDr).toBe(originalKitDr);

      // Mutar armorLocations no personagem não pode alterar armorKits[0].locations
      azur!.armorLocations[0].dr = 999;
      expect(azur!.armorKits![0].locations[0].dr).toBe(originalKitDr);

      // Mutar objeto retornado não pode corromper o cache interno
      const azurAgain = findHoundsPreset(azur!.id, azur!.name);
      expect(azurAgain?.armorLocations[0].dr).toBe(originalDr);
      expect(azurAgain?.armorKits?.[0].locations[0].dr).toBe(originalKitDr);

      // Mutar spells de Warren também não pode corromper chamadas futuras
      const warren1 = findHoundsPreset(undefined, 'Warren');
      const originalSpellDesc = warren1!.spells![0].description;
      warren1!.spells![0].description = 'MUTADO';
      const warren2 = findHoundsPreset(undefined, 'Warren');
      expect(warren2!.spells![0].description).toBe(originalSpellDesc);

      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('resolução de caminho e ordem de inicialização', () => {
    it('resolve URL corretamente em abertura direta no GitHub Pages (subdiretório)', () => {
      vi.stubGlobal('window', {
        location: { href: 'https://usuario.github.io/Hounds/mesa.html' },
        parent: null,
      });
      vi.stubGlobal('document', {
        baseURI: 'https://usuario.github.io/Hounds/mesa.html',
      });

      const urls = resolveHoundsPresetsUrls();
      expect(urls[0]).toBe('https://usuario.github.io/Hounds/dados/hounds-presets.json');
      expect(urls).toContain('dados/hounds-presets.json');
      expect(urls).toContain('/dados/hounds-presets.json');
    });

    it('resolve URL corretamente quando carregada via iframe.srcdoc no Hub', () => {
      const parentWindow = {
        location: { href: 'https://usuario.github.io/Hounds/#mesa' },
      };
      vi.stubGlobal('window', {
        location: { href: 'about:srcdoc' },
        parent: parentWindow,
      });
      vi.stubGlobal('document', {
        baseURI: 'about:srcdoc',
      });

      const urls = resolveHoundsPresetsUrls();
      expect(urls[0]).toBe('https://usuario.github.io/Hounds/dados/hounds-presets.json');
      expect(urls).toContain('dados/hounds-presets.json');
    });

    it('não expõe presets antes da conclusão do carregamento', async () => {
      expect(getHoundsPresetsState().status).toBe('idle');
      expect(getHoundsPresets()).toEqual([]);
      expect(findHoundsPreset('npc-1791647017149-8h46w', 'Azur')).toBeUndefined();

      let resolveFetch!: (res: Response) => void;
      const pendingFetch = vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveFetch = resolve;
          })
      );

      const loadPromise = loadHoundsPresets({
        fetchFn: pendingFetch as unknown as typeof fetch,
        urls: ['dados/hounds-presets.json'],
      });

      // Durante o carregamento, nenhum preset deve ser retornado
      expect(getHoundsPresetsState().status).toBe('loading');
      expect(getHoundsPresets()).toEqual([]);
      expect(findHoundsPreset('npc-1791647017149-8h46w', 'Azur')).toBeUndefined();

      const rawJson = fs.readFileSync(PRESETS_JSON_PATH, 'utf8');
      resolveFetch(new Response(rawJson, { status: 200 }));

      const finalState = await loadPromise;
      expect(finalState.status).toBe('ready');
      expect(getHoundsPresets()).toHaveLength(10);
      expect(findHoundsPreset('npc-1791647017149-8h46w', 'Azur')?.name).toBe('Azur');
    });
  });

  describe('fallback controlado nos 4 cenários de falha (sem exceções, rejeições ou erros no console)', () => {
    it('Cenário 1 — JSON ausente (HTTP 404)', async () => {
      const mockFetch = vi.fn(async () => new Response('Not Found', { status: 404 }));

      const state = await loadHoundsPresets({
        fetchFn: mockFetch as unknown as typeof fetch,
        urls: ['dados/hounds-presets.json', '/dados/hounds-presets.json'],
      });

      expect(state.status).toBe('error');
      expect(state.errorCode).toBe('NOT_FOUND');
      expect(state.errorMessage).toContain('404');
      expect(state.players).toEqual([]);
      expect(getHoundsPresets()).toEqual([]);
      expect(findHoundsPreset('npc-1791647017149-8h46w', 'Azur')).toBeUndefined();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('Cenário 2 — Erro de servidor (HTTP 500)', async () => {
      const mockFetch = vi.fn(async () => new Response('Internal Server Error', { status: 500 }));

      const state = await loadHoundsPresets({
        fetchFn: mockFetch as unknown as typeof fetch,
        urls: ['dados/hounds-presets.json', '/dados/hounds-presets.json'],
      });

      expect(state.status).toBe('error');
      expect(state.errorCode).toBe('SERVER_ERROR');
      expect(state.errorMessage).toContain('500');
      expect(state.players).toEqual([]);
      expect(getHoundsPresets()).toEqual([]);
      expect(findHoundsPreset(undefined, 'Warren')).toBeUndefined();
      // Não mascara erro 500 tentando caminhos redundantes
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('Cenário 3 — Resposta HTTP 200 contendo JSON inválido/corrompido', async () => {
      const mockFetch = vi.fn(
        async () => new Response('{ "version": 1, "players": [ { "id": "broken"', { status: 200 })
      );

      const state = await loadHoundsPresets({
        fetchFn: mockFetch as unknown as typeof fetch,
        urls: ['dados/hounds-presets.json', '/dados/hounds-presets.json'],
      });

      expect(state.status).toBe('error');
      expect(state.errorCode).toBe('INVALID_JSON');
      expect(state.errorMessage).toMatch(/corrompidos|inválidos/i);
      expect(state.players).toEqual([]);
      expect(getHoundsPresets()).toEqual([]);
      expect(findHoundsPreset('npc-1791647017149-8h46w', 'Azur')).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('Cenário 3b — HTTP 200 com JSON parcialmente corrompido (referência inválida) não disponibiliza dados parciais', async () => {
      const corruptedPayload = JSON.stringify({
        version: 1,
        spellDescriptions: ['Only one description'],
        armorLocationTemplates: [],
        players: [
          { id: 'p1', name: 'Personagem Valido', spells: [{ id: 's1', name: 'Luz', descriptionRef: 0 }] },
          { id: 'p2', name: 'Personagem Quebrado', spells: [{ id: 's2', name: 'Fogo', descriptionRef: 99 }] },
        ],
      });
      const mockFetch = vi.fn(async () => new Response(corruptedPayload, { status: 200 }));

      const state = await loadHoundsPresets({
        fetchFn: mockFetch as unknown as typeof fetch,
        urls: ['dados/hounds-presets.json'],
      });

      expect(state.status).toBe('error');
      expect(state.errorCode).toBe('INVALID_PAYLOAD');
      expect(state.players).toEqual([]);
      expect(getHoundsPresets()).toEqual([]);
      // Mesmo o 1º personagem sendo válido, nenhum dado parcial é disponibilizado
      expect(findHoundsPreset('p1', 'Personagem Valido')).toBeUndefined();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('Cenário 4 — Erro de rede (fetch rejeitado)', async () => {
      const mockFetch = vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      });

      const state = await loadHoundsPresets({
        fetchFn: mockFetch as unknown as typeof fetch,
        urls: ['dados/hounds-presets.json', '/dados/hounds-presets.json'],
      });

      expect(state.status).toBe('error');
      expect(state.errorCode).toBe('NETWORK_ERROR');
      expect(state.errorMessage).toMatch(/rede/i);
      expect(state.players).toEqual([]);
      expect(getHoundsPresets()).toEqual([]);
      expect(findHoundsPreset('npc-1791647017149-8h46w', 'Azur')).toBeUndefined();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });
});
