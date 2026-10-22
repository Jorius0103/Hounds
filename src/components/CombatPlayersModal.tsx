import React, { useState, useEffect } from 'react';
import { NPC } from '../types/rpg';
import { Users, Eye, EyeOff, Plus, X, Search } from 'lucide-react';

interface CombatPlayersModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: NPC[];
  activePlayerIds: string[];
  onTogglePlayer: (playerId: string) => void;
  onSetAllPlayers: (show: boolean) => void;
  onAddNewPlayer: () => void;
}

export const CombatPlayersModal: React.FC<CombatPlayersModalProps> = ({
  isOpen,
  onClose,
  players,
  activePlayerIds,
  onTogglePlayer,
  onSetAllPlayers,
  onAddNewPlayer,
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

  const filteredPlayers = players
    .filter((p) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        (p.name || '').toLowerCase().includes(q) ||
        (p.playerName || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm"
      style={{
        padding: '16px',
        overflowY: 'auto',
        WebkitBackdropFilter: 'blur(4px)',
      }}
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        style={{
          position: 'relative',
          margin: 'auto',
          width: '100%',
          maxWidth: '580px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#0f172a',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
          overflow: 'hidden',
        }}
      >
        {/* Cabeçalho compacto */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 18px',
            borderBottom: '1px solid rgba(245, 158, 11, 0.2)',
            background: 'linear-gradient(to right, rgba(69, 26, 3, 0.3), #0f172a, #0f172a)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '7px',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fbbf24',
                flexShrink: 0,
              }}
            >
              <Users size={16} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '14px', fontWeight: 'bold', color: '#ffffff', margin: 0 }}>
                  Personagens na Mesa
                </h2>
                <span
                  style={{
                    fontSize: '10px',
                    padding: '1px 7px',
                    borderRadius: '9999px',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    color: '#fcd34d',
                  }}
                >
                  {activePlayerIds.length} de {players.length} habilitados
                </span>
              </div>
              <p style={{ fontSize: '10px', color: '#94a3b8', margin: '1px 0 0 0' }}>
                Habilite ou desabilite quais personagens aparecem na mesa de combate
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            style={{
              padding: '5px',
              borderRadius: '7px',
              cursor: 'pointer',
              flexShrink: 0,
              background: 'transparent',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Fechar (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        {/* Subheader / Busca à esquerda e Botões à direita na mesma linha */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            padding: '8px 18px',
            background: 'rgba(2, 6, 23, 0.8)',
            borderBottom: '1px solid rgba(51, 65, 85, 0.8)',
          }}
        >
          {/* Campo de Busca */}
          <div style={{ position: 'relative', width: '200px', maxWidth: '45%' }}>
            <Search
              size={12}
              style={{
                position: 'absolute',
                left: '9px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#64748b',
              }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar personagem..."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: 'rgba(2, 6, 23, 0.9)',
                border: '1px solid #1e293b',
                borderRadius: '6px',
                padding: '4px 8px 4px 26px',
                fontSize: '11px',
                color: '#ffffff',
                outline: 'none',
              }}
            />
          </div>

          {/* Botões de Ação Rápida */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => onSetAllPlayers(true)}
              className="hover:opacity-90 active:scale-95 transition-all"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                fontSize: '10px',
                fontWeight: 'bold',
                background: 'rgba(6, 78, 59, 0.8)',
                color: '#6ee7b7',
                border: '1px solid rgba(6, 95, 70, 0.8)',
                borderRadius: '5px',
                cursor: 'pointer',
              }}
              title="Habilitar todos os personagens na mesa"
            >
              <Eye size={11} />
              <span>Habilitar Todos</span>
            </button>
            <button
              type="button"
              onClick={() => onSetAllPlayers(false)}
              className="hover:opacity-90 active:scale-95 transition-all"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                fontSize: '10px',
                fontWeight: 500,
                background: '#1e293b',
                color: '#cbd5e1',
                border: '1px solid #334155',
                borderRadius: '5px',
                cursor: 'pointer',
              }}
              title="Desabilitar todos os personagens da mesa"
            >
              <EyeOff size={11} />
              <span>Desabilitar Todos</span>
            </button>
          </div>
        </div>

        {/* Lista de Personagens Compacta */}
        <div
          style={{
            flex: '1 1 auto',
            minHeight: 0,
            overflowY: 'auto',
            padding: '8px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {filteredPlayers.length === 0 ? (
            <div
              style={{
                padding: '20px 16px',
                textAlign: 'center',
                fontSize: '11px',
                color: '#94a3b8',
                background: 'rgba(2, 6, 23, 0.4)',
                borderRadius: '10px',
                border: '1px dashed #334155',
              }}
            >
              Nenhum personagem encontrado.
            </div>
          ) : (
            filteredPlayers.map((player) => {
              const isInCombat = activePlayerIds.includes(player.id);
              const initials = (player.name || '?').slice(0, 2).toUpperCase();

              return (
                <div
                  key={player.id}
                  onClick={() => onTogglePlayer(player.id)}
                  style={{
                    padding: '4px 10px',
                    minHeight: '34px',
                    borderRadius: '8px',
                    border: isInCombat ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid #1e293b',
                    background: isInCombat ? 'rgba(6, 78, 59, 0.2)' : 'rgba(2, 6, 23, 0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'all 0.15s ease',
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      onTogglePlayer(player.id);
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: '1 1 auto' }}>
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: '10px',
                        flexShrink: 0,
                        background: isInCombat ? 'rgba(16, 185, 129, 0.2)' : '#1e293b',
                        color: isInCombat ? '#6ee7b7' : '#94a3b8',
                        border: isInCombat ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid #334155',
                      }}
                    >
                      {initials}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flexWrap: 'nowrap' }}>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 'bold',
                          color: '#ffffff',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '160px',
                        }}
                      >
                        {player.name || 'Sem nome'}
                      </span>
                      {player.playerName && (
                        <span style={{ fontSize: '10px', color: '#64748b', whiteSpace: 'nowrap' }}>
                          ({player.playerName})
                        </span>
                      )}

                      {/* Status ao lado do nome */}
                      {isInCombat ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontSize: '10px',
                            fontWeight: 600,
                            color: '#34d399',
                            background: 'rgba(6, 78, 59, 0.5)',
                            border: '1px solid rgba(16, 185, 129, 0.35)',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}
                        >
                          Habilitado na Mesa
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontSize: '10px',
                            fontWeight: 500,
                            color: '#94a3b8',
                            background: 'rgba(30, 41, 59, 0.5)',
                            border: '1px solid #334155',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}
                        >
                          Desabilitado
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Botão de Toggle */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePlayer(player.id);
                    }}
                    style={{
                      padding: '3px 10px',
                      borderRadius: '5px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      flexShrink: 0,
                      background: isInCombat ? '#059669' : '#1e293b',
                      color: isInCombat ? '#ffffff' : '#94a3b8',
                      border: isInCombat ? '1px solid #34d399' : '1px solid #334155',
                      boxShadow: isInCombat ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
                    }}
                  >
                    {isInCombat ? <Eye size={11} /> : <EyeOff size={11} />}
                    <span>{isInCombat ? 'Visível' : 'Oculto'}</span>
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé compacto */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 18px',
            borderTop: '1px solid #1e293b',
            background: 'rgba(2, 6, 23, 0.6)',
            gap: '10px',
          }}
        >
          <button
            type="button"
            onClick={onAddNewPlayer}
            className="hover:opacity-90 active:scale-95 transition-all"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '5px 12px',
              fontSize: '11px',
              fontWeight: 'bold',
              background: '#1e293b',
              color: '#fcd34d',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              borderRadius: '7px',
              cursor: 'pointer',
            }}
          >
            <Plus size={13} />
            <span>Criar Novo Personagem</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="hover:opacity-90 active:scale-95 transition-all"
            style={{
              padding: '5px 14px',
              borderRadius: '7px',
              fontSize: '11px',
              fontWeight: 'bold',
              background: '#f59e0b',
              color: '#020617',
              border: 'none',
              cursor: 'pointer',
              flexShrink: 0,
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            }}
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
