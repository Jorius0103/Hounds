// Trilha sonora da Mesa: usa o mesmo transmissor do hub (window.audioStreamSync, de
// js/audio-stream-sync.js, carregado no <head> do mesa.html), para o hub e a Mesa não terem
// dois transmissores disputando a mesma sala. Sem o script (Mesa aberta fora do hub), não há áudio.

export interface AudioStreamState {
  isBroadcasting: boolean; // Se este usuário está transmitindo
  hasActiveBroadcast: boolean; // Se há alguma transmissão ativa na sala
  broadcasterName: string | null;
  broadcasterClientId?: string | null;
  trackTitle?: string | null; // Nome da música/artista capturado da aba
  volume: number; // 0 a 100
  isMuted: boolean;
  needsInteraction?: boolean; // Verdadeiro se o navegador bloqueou o autoplay
}

interface HubAudio {
  init(clientId: string, sendSignal: (payload: unknown) => void): void;
  getState(): AudioStreamState;
  subscribe(listener: (state: AudioStreamState) => void): () => void;
  setVolume(volume: number): void;
  toggleMute(): void;
  unlockAudio(): void;
  startBroadcasting(broadcasterName: string): Promise<unknown> | void;
  stopBroadcasting(silent?: boolean): void;
  handleSignalMessage(payload: unknown): void;
}

const IDLE_STATE: AudioStreamState = {
  isBroadcasting: false,
  hasActiveBroadcast: false,
  broadcasterName: null,
  volume: 80,
  isMuted: false,
};

const NO_AUDIO: HubAudio = {
  init() {},
  getState: () => IDLE_STATE,
  subscribe: () => () => {},
  setVolume() {},
  toggleMute() {},
  unlockAudio() {},
  startBroadcasting() {},
  stopBroadcasting() {},
  handleSignalMessage() {},
};

export function hubAudio(): HubAudio {
  const audio = (window as any).audioStreamSync as HubAudio | undefined;
  return audio && typeof audio.init === 'function' ? audio : NO_AUDIO;
}
