import React, { useState } from 'react';
import { TacticalToken, FacingDirection } from '../../types/tactical';
import { NPC } from '../../types/rpg';
import { NpcAvatar } from '../NpcAvatar';
import {
  Users,
  Shield,
  Heart,
  Crosshair,
  Compass,
  ChevronRight,
  ChevronLeft,
  Eye,
  EyeOff,
  Plus,
  LocateFixed,
  Swords,
  Footprints,
} from 'lucide-react';
import { FACING_NAMES } from '../../utils/tacticalMath';

interface TacticalTokenSidebarProps {
  characters: NPC[];
  tokens: TacticalToken[];
  selectedTokenId: string | null;
  onSelectToken: (tokenId: string) => void;
  onPlaceToken: (npcId: string) => void;
  onFocusToken: (token: TacticalToken) => void;
  onUpdateNpc: (updated: Partial<NPC>) => void;
  currentUserRole: string;
}

export const TacticalTokenSidebar: React.FC<TacticalTokenSidebarProps> = ({
  characters,
  tokens,
  selectedTokenId,
  onSelectToken,
  onPlaceToken,
  onFocusToken,
  onUpdateNpc,
  currentUserRole,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const isMaster = currentUserRole === 'mestre';

  const tokenMap = new Map<string, TacticalToken>();
  tokens.forEach((t) => tokenMap.set(t.npcId, t));

  const players = characters.filter((c) => c.characterType === 'player');
  const npcs = characters.filter((c) => c.characterType !== 'player');

  const renderCharacterCard = (npc: NPC) => {
    const token = tokenMap.get(npc.id);
    const isPlaced = !!token;
    const isSelected = token && token.id === selectedTokenId;
    const isPlayer = npc.characterType === 'player';

    if (!isMaster && !isPlayer && !npc.isVisibleToPlayer) {
      return null;
    }

    const hpPercent =
      npc.hpMax > 0 ? Math.max(0, Math.min(100, (npc.hpCurrent / npc.hpMax) * 100)) : 100;

    const basicMoveNum =
      typeof npc.basicMove === 'number'
        ? npc.basicMove
        : parseInt(String(npc.basicMove)) || 5;

    const primaryParry = npc.parries?.[0]?.value ?? 0;

    return (
      <div
        key={npc.id}
        onClick={() => {
          if (token) {
            onSelectToken(token.id);
            onFocusToken(token);
          }
        }}
        className={`p-2.5 rounded-xl border transition-all cursor-pointer relative group ${
          isSelected
            ? 'bg-amber-500/10 border-amber-500/70 shadow-md ring-1 ring-amber-500/30'
            : isPlaced
            ? 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
            : 'bg-slate-950/50 border-dashed border-slate-800/80 opacity-75 hover:opacity-100'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          {/* Avatar e Identificação */}
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`w-8 h-8 rounded-lg overflow-hidden shrink-0 border ${
                isPlayer
                  ? 'border-emerald-500/70'
                  : 'border-amber-500/70'
              }`}
            >
              <NpcAvatar
                avatar={npc.avatar}
                preset={npc.avatarPreset}
                name={npc.name}
                className="w-full h-full"
              />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs text-white truncate flex items-center gap-1.5">
                <span>{npc.name}</span>
                {npc.isDead && (
                  <span className="text-[9px] bg-red-950 text-red-400 px-1 rounded font-bold">
                    M
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                {isPlaced ? (
                  <span className="font-mono text-amber-300">
                    Hex [{token?.gridX},{token?.gridY}]
                  </span>
                ) : (
                  <span className="text-slate-500 italic">Fora da mesa</span>
                )}
                <span>·</span>
                <span className="font-mono text-slate-400">Move {basicMoveNum}</span>
              </div>
            </div>
          </div>

          {/* Botão de Posicionar / Localizar */}
          {isPlaced ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFocusToken(token);
                onSelectToken(token.id);
              }}
              className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
              title="Centralizar câmera no token"
            >
              <LocateFixed size={13} />
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPlaceToken(npc.id);
              }}
              className="px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-bold rounded-md flex items-center gap-1 shadow-sm"
              title="Posicionar token na mesa tática"
            >
              <Plus size={11} />
              <span>Colocar</span>
            </button>
          )}
        </div>

        {/* Barra de PV & Defesas GURPS */}
        <div className="mt-2 space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <Heart size={10} className="text-red-400" />
              <span>PV {npc.hpCurrent}/{npc.hpMax}</span>
            </span>
            <div className="flex items-center gap-2 font-mono text-[10px] text-slate-300">
              <span title="Esquiva">E:{npc.dodge}</span>
              <span title="Aparar">A:{primaryParry}</span>
              <span title="Bloqueio">B:{npc.block}</span>
            </div>
          </div>

          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                hpPercent > 50
                  ? 'bg-emerald-500'
                  : hpPercent > 20
                  ? 'bg-amber-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        </div>

        {/* Manobra e Orientação */}
        {isPlaced && (
          <div className="mt-1.5 flex items-center justify-between text-[9px] text-slate-400 pt-1 border-t border-slate-800/60">
            <span className="font-semibold text-amber-300 truncate max-w-[120px]">
              {npc.combatManeuver || 'Ataque'}
            </span>
            <span className="text-slate-500">
              {FACING_NAMES[token.facing].split(' ')[0]}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`relative z-20 flex flex-col bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl transition-all duration-200 ${
        collapsed ? 'w-10' : 'w-72 sm:w-80'
      }`}
    >
      {/* Botão de Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -left-3 top-3 w-6 h-6 rounded-full bg-slate-850 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105"
        title={collapsed ? 'Expandir painel de combatentes' : 'Recolher painel'}
      >
        {collapsed ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
      </button>

      {collapsed ? (
        <div className="py-4 flex flex-col items-center gap-3">
          <Users size={16} className="text-amber-400" />
          <span className="text-[10px] text-slate-500 font-mono rotate-90 whitespace-nowrap mt-4">
            COMBATENTES
          </span>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 p-3 space-y-3">
          {/* Header do painel */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-amber-400" />
              <h3 className="font-bold text-xs text-white">Combatentes em Jogo</h3>
            </div>
            <span className="text-[10px] font-mono text-amber-300 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
              {tokens.length} na mesa
            </span>
          </div>

          {/* Listagem rolável */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[300px] max-h-[calc(100vh-220px)]">
            {/* Personagens Jogadores */}
            {players.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-emerald-400 px-1">
                  <span>Jogadores ({players.length})</span>
                </div>
                <div className="space-y-1.5">
                  {players.map(renderCharacterCard)}
                </div>
              </div>
            )}

            {/* NPCs / Inimigos */}
            {npcs.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-amber-400 px-1">
                  <span>NPCs & Inimigos ({npcs.length})</span>
                </div>
                <div className="space-y-1.5">
                  {npcs.map(renderCharacterCard)}
                </div>
              </div>
            )}

            {characters.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-500">
                Nenhum personagem cadastrado no combate.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
