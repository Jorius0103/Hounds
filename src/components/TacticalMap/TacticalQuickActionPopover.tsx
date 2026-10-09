import React from 'react';
import { TacticalToken, FacingDirection } from '../../types/tactical';
import { NPC } from '../../types/rpg';
import { FACING_NAMES } from '../../utils/tacticalMath';
import { NpcAvatar } from '../NpcAvatar';
import {
  RotateCw,
  RotateCcw,
  Compass,
  Heart,
  Zap,
  Shield,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  FileText,
  X,
  Footprints,
  Crosshair,
} from 'lucide-react';

interface TacticalQuickActionPopoverProps {
  token: TacticalToken;
  npc: NPC;
  onClose: () => void;
  onUpdateToken: (updated: Partial<TacticalToken>) => void;
  onUpdateNpc: (updated: Partial<NPC>) => void;
  onRemoveToken: () => void;
  onOpenFullSheet: () => void;
  currentUserRole: string;
}

const GURPS_MANEUVERS = [
  'Ataque',
  'Passo e Ataque',
  'Ataque Total (Dano)',
  'Ataque Total (Acerto)',
  'Ataque Total (Duplo)',
  'Defesa Total (+2)',
  'Concentração',
  'Espera',
  'Deslocamento Total (Sprint)',
  'Avaliar (+1 Acerto)',
  'Mudar Postura',
];

export const TacticalQuickActionPopover: React.FC<TacticalQuickActionPopoverProps> = ({
  token,
  npc,
  onClose,
  onUpdateToken,
  onUpdateNpc,
  onRemoveToken,
  onOpenFullSheet,
  currentUserRole,
}) => {
  const isMaster = currentUserRole === 'mestre';
  const isPlayer = npc.characterType === 'player';

  const rotateFacing = (delta: number) => {
    const next = ((token.facing + delta + 6) % 6) as FacingDirection;
    onUpdateToken({ facing: next });
  };

  const handleHpChange = (amount: number) => {
    onUpdateNpc({
      hpCurrent: (npc.hpCurrent || 0) + amount,
    });
  };

  const handleFpChange = (amount: number) => {
    onUpdateNpc({
      fpCurrent: (npc.fpCurrent || 0) + amount,
    });
  };

  const basicMoveNum = typeof npc.basicMove === 'number' ? npc.basicMove : parseInt(String(npc.basicMove)) || 5;

  return (
    <div className="absolute z-50 bg-slate-950/95 backdrop-blur-md border border-slate-750 rounded-2xl shadow-2xl p-3.5 w-80 text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-150">
      {/* Header com avatar, nome e fechar */}
      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl overflow-hidden shrink-0 border-2 ${
              isPlayer ? 'border-emerald-500 shadow-emerald-500/20' : 'border-amber-500 shadow-amber-500/20'
            } shadow-md`}
          >
            <NpcAvatar
              avatar={npc.avatar}
              avatarPreset={npc.avatarPreset}
              name={npc.name}
              className="w-full h-full"
            />
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-white text-sm truncate flex items-center gap-1.5">
              <span>{npc.name}</span>
              {npc.isDead && (
                <span className="text-[10px] bg-red-950 text-red-400 border border-red-800 px-1 py-0.2 rounded font-bold uppercase">
                  Morto
                </span>
              )}
            </h4>
            <div className="text-[11px] text-slate-400 flex items-center gap-2">
              <span className={isPlayer ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                {isPlayer ? 'Personagem Jogador' : 'NPC / Criatura'}
              </span>
              <span>·</span>
              <span className="font-mono text-slate-400">
                Move: {basicMoveNum} yd
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      {/* Orientação & Frente (Facing GURPS) */}
      <div className="pt-2.5 pb-2 border-b border-slate-800 space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400 font-medium flex items-center gap-1">
            <Compass size={13} className="text-amber-400" />
            <span>Orientação (Facing):</span>
          </span>
          <span className="font-bold text-amber-300">
            {FACING_NAMES[token.facing]}
          </span>
        </div>

        <div className="grid grid-cols-6 gap-1 pt-1">
          {[0, 1, 2, 3, 4, 5].map((direction) => {
            const labels = ['N', 'NE', 'SE', 'S', 'SW', 'NW'];
            const isSelected = token.facing === direction;
            return (
              <button
                key={direction}
                onClick={() => onUpdateToken({ facing: direction as FacingDirection })}
                className={`py-1 rounded font-bold text-[10px] transition-all border ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
                }`}
                title={`Orientar para ${FACING_NAMES[direction as FacingDirection]}`}
              >
                {labels[direction]}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-1 text-[11px]">
          <button
            onClick={() => rotateFacing(-1)}
            className="flex items-center gap-1 px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 hover:text-white transition-colors"
          >
            <RotateCcw size={11} />
            <span>Girar -60°</span>
          </button>
          <button
            onClick={() => rotateFacing(3)}
            className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 hover:text-white transition-colors"
          >
            Girar 180°
          </button>
          <button
            onClick={() => rotateFacing(1)}
            className="flex items-center gap-1 px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 hover:text-white transition-colors"
          >
            <span>Girar +60°</span>
            <RotateCw size={11} />
          </button>
        </div>
      </div>

      {/* Manobra de Combate GURPS */}
      <div className="py-2.5 border-b border-slate-800 space-y-1.5">
        <label className="text-[11px] text-slate-400 block font-medium flex items-center gap-1">
          <Crosshair size={13} className="text-amber-400" />
          <span>Manobra no Turno:</span>
        </label>
        <select
          value={npc.combatManeuver || 'Ataque'}
          onChange={(e) => onUpdateNpc({ combatManeuver: e.target.value })}
          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-amber-300 font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          {GURPS_MANEUVERS.map((maneuver) => (
            <option key={maneuver} value={maneuver} className="bg-slate-950 text-white">
              {maneuver}
            </option>
          ))}
        </select>
      </div>

      {/* PV e Fadiga Rápidos */}
      <div className="py-2.5 border-b border-slate-800 grid grid-cols-2 gap-2">
        {/* PV */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2 space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400 flex items-center gap-1">
              <Heart size={12} className="text-red-400" />
              <span>PV:</span>
            </span>
            <span className="font-bold font-mono text-white">
              {npc.hpCurrent}/{npc.hpMax}
            </span>
          </div>
          <div className="flex items-center justify-between gap-1 pt-0.5">
            <button
              onClick={() => handleHpChange(-1)}
              className="px-1.5 py-0.5 bg-red-950/70 hover:bg-red-900 text-red-300 border border-red-800 rounded text-xs font-bold font-mono"
              title="-1 PV"
            >
              -1
            </button>
            <button
              onClick={() => handleHpChange(-5)}
              className="px-1.5 py-0.5 bg-red-950/70 hover:bg-red-900 text-red-300 border border-red-800 rounded text-xs font-bold font-mono"
              title="-5 PV"
            >
              -5
            </button>
            <button
              onClick={() => handleHpChange(1)}
              className="px-1.5 py-0.5 bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded text-xs font-bold font-mono"
              title="+1 PV"
            >
              +1
            </button>
          </div>
        </div>

        {/* FP / Fadiga */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2 space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400 flex items-center gap-1">
              <Zap size={12} className="text-cyan-400" />
              <span>FP:</span>
            </span>
            <span className="font-bold font-mono text-white">
              {npc.fpCurrent}/{npc.fpMax}
            </span>
          </div>
          <div className="flex items-center justify-between gap-1 pt-0.5">
            <button
              onClick={() => handleFpChange(-1)}
              className="px-1.5 py-0.5 bg-cyan-950/70 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 rounded text-xs font-bold font-mono"
              title="-1 FP"
            >
              -1
            </button>
            <button
              onClick={() => handleFpChange(1)}
              className="px-1.5 py-0.5 bg-cyan-950/70 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 rounded text-xs font-bold font-mono"
              title="+1 FP"
            >
              +1
            </button>
          </div>
        </div>
      </div>

      {/* Ações Rápidas de Token & Ficha */}
      <div className="pt-2.5 flex items-center justify-between gap-1.5">
        <button
          onClick={onOpenFullSheet}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors text-xs shadow-sm"
        >
          <FileText size={13} />
          <span>Ficha Completa</span>
        </button>

        {isMaster && (
          <>
            <button
              onClick={() =>
                onUpdateToken({ hiddenFromPlayers: !token.hiddenFromPlayers })
              }
              className={`p-1.5 rounded-lg border transition-colors ${
                token.hiddenFromPlayers
                  ? 'bg-amber-950/60 border-amber-800 text-amber-400'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
              title={token.hiddenFromPlayers ? 'Oculto dos jogadores' : 'Visível para todos'}
            >
              {token.hiddenFromPlayers ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>

            <button
              onClick={() => onUpdateToken({ isPinned: !token.isPinned })}
              className={`p-1.5 rounded-lg border transition-colors ${
                token.isPinned
                  ? 'bg-amber-950/60 border-amber-800 text-amber-400'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
              title={token.isPinned ? 'Posição travada' : 'Posição livre'}
            >
              {token.isPinned ? <Lock size={14} /> : <Unlock size={14} />}
            </button>

            <button
              onClick={onRemoveToken}
              className="p-1.5 bg-slate-900 hover:bg-red-950/80 border border-slate-800 hover:border-red-800 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
              title="Remover token da mesa tática"
            >
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
