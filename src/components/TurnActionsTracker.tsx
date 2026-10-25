import React, { useRef, useEffect } from 'react';
import { TurnActionsTracker as ITurnActionsTracker } from '../types/rpg';
import { Shield, RotateCcw, Footprints, Zap, AlertTriangle } from 'lucide-react';

interface TurnActionsTrackerProps {
  tracker: ITurnActionsTracker;
  onChange: (updated: ITurnActionsTracker) => void;
  npcName?: string;
  isReadOnly?: boolean;
  className?: string;
  gridClassName?: string;
  style?: React.CSSProperties;
}

export const TurnActionsTracker: React.FC<TurnActionsTrackerProps> = ({
  tracker,
  onChange,
  isReadOnly = false,
  className = '',
  gridClassName = 'grid-cols-3 sm:grid-cols-6 gap-1.5',
  style,
}) => {
  const currentTrackerRef = useRef(tracker);
  useEffect(() => {
    currentTrackerRef.current = tracker;
  }, [tracker]);

  const handleResetTurn = () => {
    if (isReadOnly) return;
    const next = {
      ...currentTrackerRef.current,
      parryCount: 0,
      dodgeCount: 0,
      blockCount: 0,
      usedRetreat: false,
      usedBlockThisTurn: false,
      usedFatigueThisTurn: false,
      fatigueAmountUsed: 0,
      notes: '',
    };
    currentTrackerRef.current = next;
    onChange(next);
  };

  const handleResetShock = () => {
    if (isReadOnly) return;
    const next = {
      ...currentTrackerRef.current,
      shock: 0,
    };
    currentTrackerRef.current = next;
    onChange(next);
  };

  const canResetTurn =
    (tracker.parryCount || 0) > 0 ||
    (tracker.dodgeCount || 0) > 0 ||
    (tracker.blockCount || 0) > 0 ||
    !!tracker.usedRetreat ||
    !!tracker.usedBlockThisTurn ||
    !!tracker.usedFatigueThisTurn ||
    (tracker.fatigueAmountUsed || 0) > 0 ||
    (!!tracker.notes && tracker.notes.trim() !== '');

  const handleToggleRetreat = () => {
    if (isReadOnly) return;
    const next = {
      ...currentTrackerRef.current,
      usedRetreat: !currentTrackerRef.current.usedRetreat,
    };
    currentTrackerRef.current = next;
    onChange(next);
  };

  const handleToggleFatigue = () => {
    if (isReadOnly) return;
    const nextVal = !currentTrackerRef.current.usedFatigueThisTurn;
    const next = {
      ...currentTrackerRef.current,
      usedFatigueThisTurn: nextVal,
      fatigueAmountUsed: nextVal ? (currentTrackerRef.current.fatigueAmountUsed || 1) : 0,
    };
    currentTrackerRef.current = next;
    onChange(next);
  };

  const adjustCount = (key: 'parryCount' | 'dodgeCount' | 'blockCount' | 'shock', delta: number) => {
    if (isReadOnly) return;
    const currentVal = currentTrackerRef.current[key] || 0;
    const next = {
      ...currentTrackerRef.current,
      [key]: Math.max(0, currentVal + delta),
    };
    currentTrackerRef.current = next;
    onChange(next);
  };

  return (
    <div style={style} className={`border border-slate-800 rounded-xl p-2.5 sm:p-3 space-y-1.5 ${!style ? 'bg-slate-900' : ''} ${className}`}>
      {/* Header Compacto com Limpar Choque e Zerar Turno */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
        <div className="flex items-center gap-1.5">
          <Shield size={14} className="text-amber-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Defesas &amp; Ações do Turno
          </h3>
        </div>

        {!isReadOnly && (
          <div className="flex items-center gap-1.5">
            {/* Botão Zerar Turno */}
            <button
              type="button"
              onClick={handleResetTurn}
              disabled={!canResetTurn}
              className="flex items-center gap-1 px-2 py-0.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-amber-400 text-[11px] font-bold rounded-lg border border-slate-700 transition-all shadow-sm active:scale-95 disabled:opacity-40 disabled:hover:bg-slate-800 disabled:hover:text-amber-400 disabled:cursor-not-allowed"
              title="Zerar defesas, recuo e fadiga da rodada"
            >
              <RotateCcw size={11} />
              <span>Zerar Turno</span>
            </button>

            {/* Botão Limpar Choque ao lado do Zerar Turno */}
            <button
              type="button"
              onClick={handleResetShock}
              disabled={(tracker.shock || 0) <= 0}
              className="flex items-center gap-1 px-2 py-0.5 bg-slate-800 hover:bg-rose-600 hover:text-white text-rose-300 text-[11px] font-bold rounded-lg border border-slate-700 transition-all shadow-sm active:scale-95 disabled:opacity-40 disabled:hover:bg-slate-800 disabled:hover:text-rose-300 disabled:cursor-not-allowed"
              title="Zerar penalidade de choque"
            >
              <AlertTriangle size={11} />
              <span>Limpar Choque</span>
            </button>
          </div>
        )}
      </div>

      {/* Grid com os 6 itens calibrado para casar a altura vertical com a div de Fadiga */}
      <div className={`grid ${gridClassName} text-xs flex-1 items-stretch`}>
        {/* 1. Aparar */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-1.5 flex flex-col justify-between h-full min-h-[46px] sm:min-h-[50px]">
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-slate-300">
            <span>Aparar</span>
            {tracker.parryCount > 1 && (
              <span className="text-[9px] font-mono font-bold text-rose-400">
                -{(tracker.parryCount - 1) * 4}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className="font-mono font-black text-xs sm:text-sm text-amber-300">
              {tracker.parryCount}
            </span>
            {!isReadOnly && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => adjustCount('parryCount', -1)}
                  disabled={tracker.parryCount <= 0}
                  className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono font-bold text-xs flex items-center justify-center disabled:opacity-20 active:scale-95"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => adjustCount('parryCount', 1)}
                  className="w-5 h-5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs flex items-center justify-center active:scale-95"
                >
                  +
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 2. Esquiva */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-1.5 flex flex-col justify-between h-full min-h-[46px] sm:min-h-[50px]">
          <div className="text-[10px] sm:text-[11px] font-bold text-slate-300">
            Esquiva
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className="font-mono font-black text-xs sm:text-sm text-cyan-300">
              {tracker.dodgeCount}
            </span>
            {!isReadOnly && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => adjustCount('dodgeCount', -1)}
                  disabled={tracker.dodgeCount <= 0}
                  className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono font-bold text-xs flex items-center justify-center disabled:opacity-20 active:scale-95"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => adjustCount('dodgeCount', 1)}
                  className="w-5 h-5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs flex items-center justify-center active:scale-95"
                >
                  +
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 3. Bloqueio */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-1.5 flex flex-col justify-between h-full min-h-[46px] sm:min-h-[50px]">
          <div className="text-[10px] sm:text-[11px] font-bold text-slate-300">
            Bloqueio
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className="font-mono font-black text-xs sm:text-sm text-emerald-300">
              {tracker.blockCount}
            </span>
            {!isReadOnly && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => adjustCount('blockCount', -1)}
                  disabled={tracker.blockCount <= 0}
                  className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono font-bold text-xs flex items-center justify-center disabled:opacity-20 active:scale-95"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => adjustCount('blockCount', 1)}
                  className="w-5 h-5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs flex items-center justify-center active:scale-95"
                >
                  +
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 4. Usou Recuo */}
        <button
          type="button"
          disabled={isReadOnly}
          onClick={handleToggleRetreat}
          className={`p-1.5 rounded-lg border transition-all flex flex-col justify-between select-none h-full min-h-[46px] sm:min-h-[50px] text-left ${
            isReadOnly ? 'cursor-default' : 'cursor-pointer'
          } ${
            tracker.usedRetreat
              ? 'bg-amber-950/60 border-amber-500/80 text-amber-200'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
          title="Alternar se usou Recuo na rodada"
        >
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold">
            <span>Recuo</span>
            <Footprints size={12} className={tracker.usedRetreat ? 'text-amber-400' : 'text-slate-600'} />
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className={`text-[11px] font-black ${tracker.usedRetreat ? 'text-amber-300' : 'text-slate-500'}`}>
              {tracker.usedRetreat ? 'SIM' : 'NÃO'}
            </span>
            <span className={`text-[11px] ${tracker.usedRetreat ? 'text-amber-400 font-black' : 'text-slate-600'}`}>
              {tracker.usedRetreat ? '✓' : '—'}
            </span>
          </div>
        </button>

        {/* 5. Usou Fadiga */}
        <button
          type="button"
          disabled={isReadOnly}
          onClick={handleToggleFatigue}
          className={`p-1.5 rounded-lg border transition-all flex flex-col justify-between select-none h-full min-h-[46px] sm:min-h-[50px] text-left ${
            isReadOnly ? 'cursor-default' : 'cursor-pointer'
          } ${
            tracker.usedFatigueThisTurn
              ? 'bg-cyan-950/60 border-cyan-500/80 text-cyan-200'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
          title="Alternar se gastou Fadiga no turno"
        >
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold">
            <span>Fadiga</span>
            <Zap size={12} className={tracker.usedFatigueThisTurn ? 'text-cyan-400' : 'text-slate-600'} />
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className={`text-[11px] font-black ${tracker.usedFatigueThisTurn ? 'text-cyan-300' : 'text-slate-500'}`}>
              {tracker.usedFatigueThisTurn ? 'SIM' : 'NÃO'}
            </span>
            <span className={`text-[11px] ${tracker.usedFatigueThisTurn ? 'text-cyan-400 font-black' : 'text-slate-600'}`}>
              {tracker.usedFatigueThisTurn ? '✓' : '—'}
            </span>
          </div>
        </button>

        {/* 6. Choque */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-1.5 flex flex-col justify-between h-full min-h-[46px] sm:min-h-[50px]">
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-slate-300">
            <span className="flex items-center gap-1">
              <AlertTriangle size={11} className={tracker.shock > 0 ? 'text-rose-400' : 'text-slate-600'} />
              <span>Choque</span>
            </span>
            {tracker.shock > 0 && (
              <span className="text-[9px] font-mono text-rose-400 font-bold">
                -{tracker.shock}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className="font-mono font-black text-xs sm:text-sm text-rose-400">
              {tracker.shock || 0}
            </span>
            {!isReadOnly && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => adjustCount('shock', -1)}
                  disabled={(tracker.shock || 0) <= 0}
                  className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono font-bold text-xs flex items-center justify-center disabled:opacity-20 active:scale-95"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => adjustCount('shock', 1)}
                  className="w-5 h-5 rounded bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs flex items-center justify-center active:scale-95"
                >
                  +
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
