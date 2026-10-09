import React, { useState, useEffect } from 'react';
import { systemLogger, SystemLogEntry } from '../utils/systemLogger';
import { X, Trash2, Copy, Check, Activity, ShieldAlert, Radio, Laptop } from 'lucide-react';

interface SystemLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemLogModal: React.FC<SystemLogModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<SystemLogEntry[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'LOCAL' | 'SYNC' | 'REJECT'>('ALL');
  const [copied, setCopied] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = systemLogger.subscribe((newLogs) => {
      setLogs(newLogs);
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const filteredLogs = logs.filter((l) => {
    if (filter === 'ALL') return true;
    if (filter === 'LOCAL') return l.category === 'LOCAL_EDIT' || l.category === 'DELETE_ITEM';
    if (filter === 'SYNC') return l.category === 'SYNC_SEND' || l.category === 'SYNC_RECV' || l.category === 'BROADCAST';
    if (filter === 'REJECT') return l.category === 'SYNC_REJECT' || l.category === 'ERROR';
    return true;
  });

  const handleCopyLogs = () => {
    const text = logs
      .map(
        (l) =>
          `[${l.timestamp}] [${l.category}] ${l.title}${
            l.details ? ` | ${typeof l.details === 'object' ? JSON.stringify(l.details) : l.details}` : ''
          }`
      )
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const getCategoryBadge = (cat: SystemLogEntry['category']) => {
    switch (cat) {
      case 'LOCAL_EDIT':
        return <span className="bg-emerald-950/80 border border-emerald-600/70 text-emerald-300 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">LOCAL</span>;
      case 'DELETE_ITEM':
        return <span className="bg-rose-950/80 border border-rose-600/70 text-rose-300 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">DELETE</span>;
      case 'SYNC_SEND':
        return <span className="bg-cyan-950/80 border border-cyan-600/70 text-cyan-300 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">ENVIO</span>;
      case 'SYNC_RECV':
        return <span className="bg-blue-950/80 border border-blue-600/70 text-blue-300 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">RECEBIDO</span>;
      case 'SYNC_REJECT':
        return <span className="bg-amber-950/80 border border-amber-600/70 text-amber-300 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">REJEITADO</span>;
      case 'BROADCAST':
        return <span className="bg-purple-950/80 border border-purple-600/70 text-purple-300 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">TAB SYNC</span>;
      case 'ERROR':
        return <span className="bg-red-950/90 border border-red-500 text-red-200 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">ERRO</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:px-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Activity size={17} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Log do Sistema &amp; Debug de Sincronização
                </h3>
                <span className="font-mono text-[11px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-1.5 rounded">
                  {logs.length} eventos
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Acompanhe em tempo real todas as alterações locais, exclusões e trocas de mensagens na sala.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Toolbar & Filters */}
        <div className="p-3 border-b border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                filter === 'ALL'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Todos ({logs.length})
            </button>
            <button
              onClick={() => setFilter('LOCAL')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                filter === 'LOCAL'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span className="inline-flex items-center gap-1">
                <Laptop size={12} />
                <span>Edições Locais &amp; Exclusões</span>
              </span>
            </button>
            <button
              onClick={() => setFilter('SYNC')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                filter === 'SYNC'
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span className="inline-flex items-center gap-1">
                <Radio size={12} />
                <span>Rede &amp; Abas</span>
              </span>
            </button>
            <button
              onClick={() => setFilter('REJECT')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                filter === 'REJECT'
                  ? 'bg-amber-600 text-white font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span className="inline-flex items-center gap-1">
                <ShieldAlert size={12} />
                <span>Rejeitados</span>
              </span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopyLogs}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
              title="Copiar log em formato texto"
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span>{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>
            <button
              onClick={() => systemLogger.clear()}
              className="flex items-center gap-1 px-2.5 py-1 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-semibold rounded-lg border border-rose-800/50 transition-colors"
              title="Limpar todos os registros de log"
            >
              <Trash2 size={12} />
              <span>Limpar</span>
            </button>
          </div>
        </div>

        {/* Logs List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 font-mono text-xs">
          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-500 italic">
              Nenhum evento registrado nesta categoria.
            </div>
          ) : (
            filteredLogs.map((l) => (
              <div
                key={l.id}
                onClick={() => setExpandedId(expandedId === l.id ? null : l.id)}
                className="p-2 bg-slate-950/70 border border-slate-850 hover:border-slate-750 rounded-lg cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className="text-[11px] text-slate-500 tabular-nums shrink-0">
                      {l.timestamp}
                    </span>
                    {getCategoryBadge(l.category)}
                    <span className="text-slate-200 font-sans font-medium text-xs break-all">
                      {l.title}
                    </span>
                  </div>
                  {l.details && (
                    <span className="text-[10px] text-slate-500 underline shrink-0">
                      {expandedId === l.id ? 'Fechar' : 'Detalhes'}
                    </span>
                  )}
                </div>

                {expandedId === l.id && l.details && (
                  <pre className="mt-2 p-2 bg-slate-900 rounded border border-slate-800 text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap break-all">
                    {typeof l.details === 'object' ? JSON.stringify(l.details, null, 2) : String(l.details)}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
