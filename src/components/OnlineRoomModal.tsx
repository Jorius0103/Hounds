import React, { useState } from 'react';
import { SyncStatus, onlineSyncService } from '../utils/onlineSync';
import { Wifi, Copy, Check, RefreshCw, X, Radio, ExternalLink } from 'lucide-react';

interface OnlineRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncStatus: SyncStatus;
  currentRoom: string;
  onConnectRoom: (roomCode: string) => void;
  onForceSync: () => void;
}

export const OnlineRoomModal: React.FC<OnlineRoomModalProps> = ({
  isOpen,
  onClose,
  syncStatus,
  currentRoom,
  onConnectRoom,
  onForceSync,
}) => {
  const [roomInput, setRoomInput] = useState(currentRoom);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    const link = onlineSyncService.getShareableLink();
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSaveRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomInput.trim()) return;
    onConnectRoom(roomInput.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-750 rounded-2xl p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Radio size={20} className={syncStatus === 'connected' ? 'text-emerald-400' : 'text-amber-400'} />
            <h3 className="text-base font-bold text-white">
              Sincronização Online entre Navegadores
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Status Badge */}
        <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <div
              className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                syncStatus === 'connected'
                  ? 'bg-emerald-500'
                  : syncStatus === 'connecting'
                  ? 'bg-yellow-500'
                  : 'bg-rose-500'
              }`}
            />
            <span className="font-semibold text-white">
              {syncStatus === 'connected'
                ? 'Conectado em Tempo Real'
                : syncStatus === 'connecting'
                ? 'Conectando ao Servidor Online...'
                : 'Desconectado'}
            </span>
          </div>

          <span className="text-[11px] font-mono text-amber-300 font-bold bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
            Sala: {currentRoom}
          </span>
        </div>

        {/* How it works info */}
        <p className="text-xs text-slate-300 leading-relaxed">
          Esta conexão sincroniza o Mestre e o Jogador em <strong>qualquer navegador, celular ou computador diferente</strong> sem necessidade de cadastro em nuvem.
        </p>

        {/* Share Link for Player */}
        <div className="space-y-1.5 bg-amber-950/20 border border-amber-500/30 rounded-xl p-3">
          <label className="text-xs font-bold text-amber-300 block">
            Link de Acesso para o Jogador:
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={onlineSyncService.getShareableLink()}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 font-mono select-all focus:outline-none"
            />
            <button
              onClick={handleCopyLink}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              }`}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Copiado!' : 'Copiar Link'}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Abra esse link no outro navegador (ou mande para o jogador). Ele entrará na mesma sala automaticamente.
          </p>
        </div>

        {/* Change Room Form */}
        <form onSubmit={handleSaveRoom} className="space-y-2 pt-1">
          <label className="text-xs font-semibold text-slate-300 block">
            Nome / Código da Sala (deve ser o mesmo em ambos os navegadores):
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
              placeholder="Ex: MESA-LEANDRO"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono font-bold text-amber-300 uppercase focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <button
              type="submit"
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg border border-slate-700 transition-colors"
            >
              Trocar Sala
            </button>
          </div>
        </form>

        {/* Force Sync button */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onForceSync}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-lg text-xs border border-slate-700 transition-colors"
          >
            <RefreshCw size={13} />
            <span>Transmitir Dados Agora</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-colors"
          >
            Concluído
          </button>
        </div>
      </div>
    </div>
  );
};
