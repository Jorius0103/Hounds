import React, { useState, useEffect } from 'react';
import { UserAccount } from '../types/rpg';
import {
  ShieldCheck,
  Eye,
  EyeOff,
  X,
  Check,
  CheckCheck,
  Users,
  Search,
  Sparkles,
} from 'lucide-react';

interface PlayerPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserAccount[];
  editorUserIds: string[];
  onTogglePermission: (userId: string) => void;
  onSetAllPermissions: (allow: boolean) => void;
}

export const PlayerPermissionsModal: React.FC<PlayerPermissionsModalProps> = ({
  isOpen,
  onClose,
  users,
  editorUserIds,
  onTogglePermission,
  onSetAllPermissions,
}) => {
  const [search, setSearch] = useState('');

  // Fecha com a tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filtra apenas os usuários com perfil de jogador (apenas dois perfis no sistema: mestre e jogador)
  const playerUsers = users.filter((u) => u.role === 'jogador');

  const filteredPlayers = playerUsers.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (u.name || '').toLowerCase().includes(q);
  });

  const activeEditorCount = playerUsers.filter(
    (u) => editorUserIds.includes(u.id) || editorUserIds.includes(u.name)
  ).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-750 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <Users size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white truncate">
                  Permissões dos Jogadores
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-slate-800 border border-slate-700 text-amber-300">
                  {activeEditorCount} de {playerUsers.length}{' '}
                  {activeEditorCount === 1 ? 'editor' : 'editores'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Defina em tempo real quem pode editar fichas e movimentar tokens
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors shrink-0"
            title="Fechar (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Barra explicativa e Ações Rápidas */}
        <div className="space-y-2.5 shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 text-xs">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
              <Eye size={13} className="text-slate-400 shrink-0" />
              <span>
                Por padrão, jogadores são <strong>espectadores</strong> (somente leitura).
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 justify-end">
              <button
                type="button"
                onClick={() => onSetAllPermissions(true)}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/80 rounded-lg transition-all active:scale-95 shadow-xs"
                title="Conceder permissão de edição a todos os jogadores cadastrados"
              >
                <CheckCheck size={12} />
                <span>Liberar Todos</span>
              </button>
              <button
                type="button"
                onClick={() => onSetAllPermissions(false)}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded-lg transition-all active:scale-95 shadow-xs"
                title="Colocar todos os jogadores em modo espectador"
              >
                <EyeOff size={12} />
                <span>Bloquear Todos</span>
              </button>
            </div>
          </div>

          {/* Busca quando houver mais de 3 jogadores */}
          {playerUsers.length > 3 && (
            <div className="relative">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar jogador cadastrado..."
                className="w-full bg-slate-950/90 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          )}
        </div>

        {/* Lista de jogadores cadastrados */}
        <div className="space-y-2 overflow-y-auto flex-1 pr-1 max-h-[46vh]">
          {playerUsers.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 p-6 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-slate-800/60 border border-slate-750 text-slate-500 mx-auto flex items-center justify-center">
                <Users size={20} />
              </div>
              <div className="font-semibold text-slate-300">
                Nenhum jogador cadastrado no sistema
              </div>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                Cadastre contas com o perfil <strong>Jogador</strong> na aba{' '}
                <strong>Usuários</strong> do Hub para gerenciar o acesso aqui.
              </p>
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800 p-4">
              Nenhum jogador encontrado com "{search}".
            </div>
          ) : (
            filteredPlayers.map((u) => {
              const isAllowed =
                editorUserIds.includes(u.id) || editorUserIds.includes(u.name);
              const initials = (u.name || '?').slice(0, 2).toUpperCase();

              return (
                <div
                  key={u.id}
                  onClick={() => onTogglePermission(u.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                    isAllowed
                      ? 'bg-emerald-950/20 border-emerald-500/40 hover:bg-emerald-950/30 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-950/80'
                  }`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      onTogglePermission(u.id);
                    }
                  }}
                  title={
                    isAllowed
                      ? `Clique para retirar permissão de edição de ${u.name}`
                      : `Clique para dar permissão de edição para ${u.name}`
                  }
                >
                  {/* Avatar e Nome do Jogador */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                        isAllowed
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-inner'
                          : 'bg-slate-800 text-slate-400 border border-slate-750'
                      }`}
                    >
                      {initials}
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                        <span>{u.name}</span>
                      </div>

                      <div className="flex items-center gap-1.5 mt-0.5">
                        {isAllowed ? (
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                            <ShieldCheck size={12} className="shrink-0" />
                            <span>Editor liberado</span>
                            <span className="text-[10px] text-emerald-400/70 font-normal hidden sm:inline">
                              · pode alterar fichas e tokens
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                            <Eye size={12} className="shrink-0 text-slate-400" />
                            <span>Modo espectador</span>
                            <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">
                              · somente leitura
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Controle Segmentado: Espectador vs Editor */}
                  <div
                    style={{ minHeight: '36px' }}
                    className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 shrink-0 self-end sm:self-auto"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (isAllowed) onTogglePermission(u.id);
                      }}
                      style={{
                        padding: '6px 14px',
                        minHeight: '30px',
                        cursor: 'pointer',
                      }}
                      className={`rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        !isAllowed
                          ? 'bg-slate-800 text-slate-100 border border-slate-700 shadow-sm font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Eye size={14} />
                      <span>Espectador</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!isAllowed) onTogglePermission(u.id);
                      }}
                      style={{
                        padding: '6px 14px',
                        minHeight: '30px',
                        cursor: 'pointer',
                      }}
                      className={`rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        isAllowed
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-md border border-emerald-400'
                          : 'text-slate-400 hover:text-emerald-400'
                      }`}
                    >
                      <Check size={14} strokeWidth={2.5} />
                      <span>Editor</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 shrink-0 text-xs">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Sincronizado em tempo real com todos os jogadores.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
