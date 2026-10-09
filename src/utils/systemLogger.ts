export interface SystemLogEntry {
  id: string;
  timestamp: string; // HH:mm:ss.SSS
  rawTime: number;
  category: 'LOCAL_EDIT' | 'DELETE_ITEM' | 'SYNC_SEND' | 'SYNC_RECV' | 'SYNC_REJECT' | 'BROADCAST' | 'ERROR';
  title: string;
  details?: any;
}

class SystemLogger {
  private logs: SystemLogEntry[] = [];
  private listeners: ((logs: SystemLogEntry[]) => void)[] = [];
  private maxLogs: number = 250;

  constructor() {
    this.addLog('LOCAL_EDIT', 'Sistema de Log inicializado');
  }

  public getLogs(): SystemLogEntry[] {
    return [...this.logs];
  }

  public subscribe(listener: (logs: SystemLogEntry[]) => void): () => void {
    this.listeners.push(listener);
    listener([...this.logs]);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== listener);
    };
  }

  private notify() {
    const copy = [...this.logs];
    this.listeners.forEach((cb) => cb(copy));
  }

  public addLog(
    category: SystemLogEntry['category'],
    title: string,
    details?: any
  ) {
    const now = new Date();
    const timeStr = `${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}.${String(now.getMilliseconds()).padStart(3, '0')}`;

    const entry: SystemLogEntry = {
      id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: timeStr,
      rawTime: Date.now(),
      category,
      title,
      details,
    };

    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }
    this.notify();
  }

  public clear() {
    this.logs = [];
    this.notify();
  }
}

export const systemLogger = new SystemLogger();
