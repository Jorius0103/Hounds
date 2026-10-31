import mqtt, { MqttClient } from 'mqtt';
import { Combat, ConditionDefinition, UserAccount, NPC, ActionLogEntry } from '../types/rpg';

export interface RemoteSyncPayload {
  clientId: string;
  type:
    | 'SYNC_FULL'
    | 'SYNC_NPC'
    | 'REQUEST_SYNC'
    | 'SYNC_ROUND'
    | 'SYNC_EDITORS'
    | 'SYNC_MASTER_ORDER'
    | 'SYNC_DICE_ROLL'
    | 'SYNC_ENTRY_COMMENT'
    | 'SYNC_SNAPSHOT_RESTORED'
    | 'SYNC_SNAPSHOTS_LIST';
  timestamp: number;
  npc?: NPC;
  combats?: Combat[];
  users?: UserAccount[];
  conditions?: ConditionDefinition[];
  activeCombatId?: string;
  players?: NPC[];
  combatId?: string;
  round?: number;
  editorUserIds?: string[];
  customOrder?: string[]; // SYNC_MASTER_ORDER
  rollData?: any; // SYNC_DICE_ROLL
  logEntry?: ActionLogEntry; // SYNC_DICE_ROLL
  entryId?: string; // SYNC_ENTRY_COMMENT
  npcId?: string; // SYNC_ENTRY_COMMENT
  comment?: string; // SYNC_ENTRY_COMMENT
  snapshots?: any[]; // SYNC_SNAPSHOTS_LIST
  deletedCombatIds?: string[]; // SYNC_FULL: combates excluídos, para não voltarem na mesclagem
}

export type SyncStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

const CLIENT_ID = `gurps-${Math.random().toString(36).slice(2, 9)}-${Date.now()}`;

// List of public SSL WebSocket brokers for high availability and cross-browser reliability
const BROKER_URLS = [
  'wss://broker.emqx.io:8084/mqtt',      // EMQX public broker (very reliable on port 8084)
  'wss://broker.hivemq.com:8884/mqtt',   // HiveMQ public broker (fallback on port 8884)
  'wss://test.mosquitto.org:8081/mqtt',  // Mosquitto public broker (port 8081 SSL)
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
  private lastMessageTime: number = Date.now();
  private watchdogTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private wakeLockSentinel: any = null;

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

    // Monitoramento permanente: garante que o usuário continue escutando por 4+ horas
    if (typeof window !== 'undefined') {
      const onWake = () => this.checkAndResync();
      window.addEventListener('focus', onWake);
      window.addEventListener('online', onWake);
      window.addEventListener('pageshow', onWake);
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') onWake();
        });
      }

      // Inicia Watchdog Timer contínuo (roda a cada 10 segundos)
      this.startWatchdog();

      // Solicita Screen WakeLock para evitar suspensão profunda do navegador durante sessões
      this.requestWakeLock();
    }
  }

  private requestWakeLock() {
    try {
      if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
        (navigator as any).wakeLock?.request('screen').then((sentinel: any) => {
          this.wakeLockSentinel = sentinel;
          sentinel.addEventListener?.('release', () => {
            this.wakeLockSentinel = null;
          });
        }).catch(() => {});
      }
    } catch {}
  }

  private startWatchdog() {
    if (this.watchdogTimer) clearInterval(this.watchdogTimer);
    this.watchdogTimer = setInterval(() => {
      const now = Date.now();
      // Se não estiver conectado ou client nulo, reconecta
      if (this.status !== 'connected' || !this.client || !(this.client as any).connected) {
        this.connect();
        return;
      }
      // Se passou mais de 45 segundos sem nenhuma mensagem recebida do broker (possível conexão zumbi)
      if (now - this.lastMessageTime > 45000) {
        console.warn('[OnlineSync] Watchdog: Conexão inativa há mais de 45s. Forçando reconexão e re-sync.');
        this.brokerIndex = (this.brokerIndex + 1) % BROKER_URLS.length;
        this.connect();
      }
    }, 10000);

    // Heartbeat ativo a cada 15 segundos para manter o canal WebSocket aberto por 4+ horas
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      if (this.status === 'connected' && this.client) {
        try {
          const pingPayload = {
            type: 'PRESENCE_PING' as any,
            clientId: CLIENT_ID,
            timestamp: Date.now(),
          };
          const topic = `gurps_rpg_sync_v2/${this.currentRoom}`;
          this.client.publish(topic, JSON.stringify(pingPayload), { qos: 0 });
        } catch {}
      }
    }, 15000);
  }

  public checkAndResync() {
    this.requestWakeLock();
    const now = Date.now();
    if (this.status !== 'connected' || !this.client || !(this.client as any).connected || now - this.lastMessageTime > 30000) {
      this.connect();
    } else {
      this.requestSync();
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
        this.lastMessageTime = Date.now();
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
    if (payload.type === 'REQUEST_SYNC' || payload.type === 'SYNC_NPC' || payload.type === 'SYNC_ROUND') {
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
