import mqtt, { MqttClient } from 'mqtt';
import { Combat, ConditionDefinition, UserAccount, NPC } from '../types/rpg';

export interface RemoteSyncPayload {
  clientId: string;
  type: 'SYNC_FULL' | 'SYNC_NPC' | 'REQUEST_SYNC';
  timestamp: number;
  npc?: NPC;
  combats?: Combat[];
  users?: UserAccount[];
  conditions?: ConditionDefinition[];
  activeCombatId?: string;
  players?: NPC[];
}

export type SyncStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

const CLIENT_ID = `gurps-${Math.random().toString(36).slice(2, 9)}-${Date.now()}`;

// List of public SSL WebSocket brokers for high availability and cross-browser reliability
const BROKER_URLS = [
  'wss://broker.emqx.io:8084/mqtt',      // EMQX public broker (very reliable on port 8084)
  'wss://broker.hivemq.com:8884/mqtt',   // HiveMQ public broker (fallback on port 8884)
];

class OnlineSyncService {
  private client: MqttClient | null = null;
  private currentRoom: string = 'THE-HOUNDS';
  private status: SyncStatus = 'disconnected';
  private brokerIndex: number = 0;
  private statusListeners: ((status: SyncStatus) => void)[] = [];
  private messageListeners: ((payload: RemoteSyncPayload) => void)[] = [];
  private lastSentHash: string = '';
  private pendingPayload: RemoteSyncPayload | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Read room from URL query param if present (?room=... or ?sala=...)
    try {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room') || params.get('sala');
      if (roomParam && roomParam.trim()) {
        this.currentRoom = roomParam.trim().toUpperCase();
        localStorage.setItem('gurps_online_room_code', this.currentRoom);
      } else {
        const savedRoom = localStorage.getItem('gurps_online_room_code');
        if (savedRoom && savedRoom.trim() && savedRoom.trim().toUpperCase() !== 'MESA-LEANDRO') {
          this.currentRoom = savedRoom.trim().toUpperCase();
        } else {
          this.currentRoom = 'THE-HOUNDS';
          localStorage.setItem('gurps_online_room_code', 'THE-HOUNDS');
        }
      }
    } catch (e) {
      console.warn('Failed reading URL params for room', e);
    }

    // Reconnect when tab regains focus or comes back online if disconnected
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => {
        if (this.status !== 'connected') {
          this.connect();
        }
      });
      window.addEventListener('online', () => {
        if (this.status !== 'connected') {
          this.connect();
        }
      });
    }
  }

  public getClientId(): string {
    return CLIENT_ID;
  }

  public getRoom(): string {
    return this.currentRoom;
  }

  public getStatus(): SyncStatus {
    return this.status;
  }

  public onStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.statusListeners.push(callback);
    callback(this.status);
    return () => {
      this.statusListeners = this.statusListeners.filter((cb) => cb !== callback);
    };
  }

  public onSyncMessage(callback: (payload: RemoteSyncPayload) => void): () => void {
    this.messageListeners.push(callback);
    return () => {
      this.messageListeners = this.messageListeners.filter((cb) => cb !== callback);
    };
  }

  private setStatus(newStatus: SyncStatus) {
    this.status = newStatus;
    this.statusListeners.forEach((cb) => cb(newStatus));
  }

  public connect(roomCode?: string) {
    if (roomCode) {
      this.currentRoom = roomCode.trim().toUpperCase();
      try {
        localStorage.setItem('gurps_online_room_code', this.currentRoom);
      } catch {}
    }

    if (this.client) {
      try {
        this.client.end(true);
      } catch {}
      this.client = null;
    }

    this.setStatus('connecting');

    const brokerUrl = BROKER_URLS[this.brokerIndex % BROKER_URLS.length];
    const topic = `gurps_rpg_sync_v2/${this.currentRoom}`;

    try {
      this.client = mqtt.connect(brokerUrl, {
        clientId: CLIENT_ID,
        clean: true,
        connectTimeout: 7000,
        reconnectPeriod: 4000,
        keepalive: 30,
      });

      this.client.on('connect', () => {
        this.setStatus('connected');

        // Subscribe with QoS 1 to get retained and new messages
        this.client?.subscribe(topic, { qos: 1 }, (err) => {
          if (!err) {
            // If we have a pending payload queued while disconnected, send it now!
            if (this.pendingPayload) {
              this.flushPendingPayload();
            } else {
              // Otherwise, request latest room state from other devices
              this.requestSync();
            }
          }
        });
      });

      this.client.on('reconnect', () => {
        this.setStatus('connecting');
      });

      this.client.on('close', () => {
        this.setStatus('disconnected');
      });

      this.client.on('error', (err) => {
        console.warn(`MQTT connection error with broker ${brokerUrl}:`, err);
        this.setStatus('error');
        // Switch to alternative broker on next retry
        this.brokerIndex = (this.brokerIndex + 1) % BROKER_URLS.length;
      });

      this.client.on('message', (receivedTopic, message) => {
        if (receivedTopic !== topic) return;
        try {
          const payload: RemoteSyncPayload = JSON.parse(message.toString());
          // Ignore own messages
          if (payload.clientId === CLIENT_ID) return;

          this.messageListeners.forEach((listener) => listener(payload));
        } catch (e) {
          console.warn('Failed to parse MQTT sync message', e);
        }
      });
    } catch (err) {
      console.error('MQTT connect failure', err);
      this.setStatus('error');
    }
  }

  public requestSync() {
    this.sendPayloadImmediate({
      type: 'REQUEST_SYNC',
    });
  }

  private flushPendingPayload() {
    if (!this.pendingPayload) return;
    const payload = this.pendingPayload;
    this.pendingPayload = null;
    this.sendPayloadImmediate(payload);
  }

  private pendingLatestPayload: (Omit<RemoteSyncPayload, 'clientId' | 'timestamp'> & { clientId?: string; timestamp?: number }) | null = null;

  public sendPayload(
    payload: Omit<RemoteSyncPayload, 'clientId' | 'timestamp'> & { clientId?: string; timestamp?: number }
  ) {
    if (payload.type === 'REQUEST_SYNC' || payload.type === 'SYNC_NPC') {
      this.sendPayloadImmediate(payload);
      return;
    }

    const payloadWithTime = {
      ...payload,
      timestamp: payload.timestamp || Date.now(),
    };
    this.pendingLatestPayload = payloadWithTime;

    // Debounce de 150ms para agrupar múltiplos cliques rápidos ou digitação
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      if (this.pendingLatestPayload) {
        const toSend = this.pendingLatestPayload;
        this.pendingLatestPayload = null;
        this.sendPayloadImmediate(toSend);
      }
    }, 150);
  }

  public sendPayloadImmediate(
    payload: Omit<RemoteSyncPayload, 'clientId' | 'timestamp'> & { clientId?: string; timestamp?: number }
  ) {
    const fullPayload: RemoteSyncPayload = {
      ...payload,
      clientId: CLIENT_ID,
      timestamp: payload.timestamp || Date.now(),
    };

    if (!this.client || this.status !== 'connected') {
      this.pendingPayload = fullPayload;
      return;
    }

    // Prevent echoing identical full payloads
    const payloadStr = JSON.stringify(fullPayload);
    if (fullPayload.type === 'SYNC_FULL') {
      const stateOnlyStr = JSON.stringify({
        combats: fullPayload.combats,
        players: fullPayload.players,
        users: fullPayload.users,
        conditions: fullPayload.conditions,
        activeCombatId: fullPayload.activeCombatId,
      });
      if (stateOnlyStr === this.lastSentHash) {
        return;
      }
      this.lastSentHash = stateOnlyStr;
    }

    const topic = `gurps_rpg_sync_v2/${this.currentRoom}`;
    // Retain apenas mensagens de SYNC_FULL periódicas, nunca mensagens rápidas de SYNC_NPC
    const isRetained = fullPayload.type === 'SYNC_FULL';
    this.client.publish(topic, payloadStr, { qos: 1, retain: isRetained });
  }

  public disconnect() {
    if (this.client) {
      try {
        this.client.end(true);
      } catch {}
      this.client = null;
    }
    this.setStatus('disconnected');
  }

  public getShareableLink(): string {
    const url = new URL(window.location.href);
    // Substitui a URL de desenvolvimento (ais-dev-) pela URL pública de compartilhamento (ais-pre-)
    if (url.hostname.includes('ais-dev-')) {
      url.hostname = url.hostname.replace('ais-dev-', 'ais-pre-');
    }
    url.searchParams.set('room', this.currentRoom);
    return url.toString();
  }
}

export const onlineSyncService = new OnlineSyncService();
