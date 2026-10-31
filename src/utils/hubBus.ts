// Cliente de sincronização com a interface do MQTT (on, subscribe, publish, end) que usa o canal do
// hub: window.parent.hubMesaBus, de js/mesa-sync.js, que leva as mensagens pelo Supabase. Assim a
// Mesa não fala com brokers MQTT públicos, como no mesa.html que estava no ar.
// Fora do hub (sem o canal), avisa "Sincronização indisponível" e fecha.

type Handler = (...args: any[]) => void;

export interface HubBusClient {
  connected: boolean;
  on(event: 'connect' | 'message' | 'error' | 'close' | 'reconnect', handler: Handler): HubBusClient;
  subscribe(topic: string, options?: unknown, callback?: (err: Error | null) => void): void;
  publish(topic: string, message: string, options?: unknown): void;
  end(force?: boolean): void;
}

interface HubMesaBus {
  publish(message: string): void;
  subscribe(listener: (message: string) => void): () => void;
}

export function connectHubBus(): HubBusClient {
  const handlers: Record<string, Handler[]> = {};
  const emit = (event: string, ...args: unknown[]) => (handlers[event] || []).forEach((h) => h(...args));
  let ended = false;
  let subscribedTopic = '';
  let unsubscribe: (() => void) | null = null;

  let bus: HubMesaBus | null = null;
  try {
    bus = window.parent && window.parent !== window ? ((window.parent as any).hubMesaBus as HubMesaBus) || null : null;
  } catch {}

  const client: HubBusClient = {
    connected: false,
    on(event, handler) {
      (handlers[event] ||= []).push(handler);
      return client;
    },
    subscribe(topic, _options, callback) {
      subscribedTopic = topic;
      callback?.(null);
    },
    publish(_topic, message) {
      if (ended || !bus) return;
      try {
        bus.publish(String(message));
      } catch {}
    },
    end() {
      ended = true;
      client.connected = false;
      unsubscribe?.();
    },
  };

  if (!bus) {
    setTimeout(() => {
      if (ended) return;
      emit('error', new Error('Sincronização indisponível'));
      emit('close');
    }, 300);
    return client;
  }

  unsubscribe = bus.subscribe((message) => {
    if (!ended) emit('message', subscribedTopic, message);
  });
  setTimeout(() => {
    if (ended) return;
    client.connected = true;
    emit('connect');
  }, 60);
  return client;
}
