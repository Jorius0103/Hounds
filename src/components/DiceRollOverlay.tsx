import React, { useEffect, useState } from 'react';
import { NpcAvatar } from './NpcAvatar';
import { Sparkles, Skull, X } from 'lucide-react';

export interface DiceRollResult {
  rolls: number[];
  total: number;
  diceCount: number; // 3 or 1
  characterName: string;
  playerName?: string;
  avatar?: string;
  avatarPreset?: string;
}

interface DiceRollOverlayProps {
  rollData: DiceRollResult | null;
  onClose: () => void;
}

// Sound effect using Web Audio API (tabletop wooden dice clatter)
function playDiceClatterSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    [0, 0.12, 0.28, 0.46, 0.65, 0.88, 1.05].forEach((t, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160 + Math.random() * 90, now + t);
      osc.frequency.exponentialRampToValueAtTime(45, now + t + 0.05);
      gain.gain.setValueAtTime(0.12 / (i * 0.35 + 1), now + t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + t);
      osc.stop(now + t + 0.06);
    });
  } catch (e) {
    // Ignore audio error if browser blocks autoplay
  }
}

// Target rotations for each face (1-6)
function getFinalRotation(face: number): { x: number; y: number } {
  switch (face) {
    case 1: return { x: 720, y: 1080 }; // Front (0, 0)
    case 2: return { x: 720, y: 990 };  // Right (-90)
    case 3: return { x: 630, y: 1080 }; // Top (-90 X)
    case 4: return { x: 810, y: 1080 }; // Bottom (90 X)
    case 5: return { x: 720, y: 1170 }; // Left (90 Y)
    case 6: return { x: 720, y: 1260 }; // Back (180 Y)
    default: return { x: 720, y: 1080 };
  }
}

export const DiceRollOverlay: React.FC<DiceRollOverlayProps> = ({ rollData, onClose }) => {
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    if (!rollData) {
      setShowResult(false);
      return;
    }

    setShowResult(false);
    playDiceClatterSound();

    // Reveal result details when dice settle (~1.1s)
    const settleTimer = setTimeout(() => {
      setShowResult(true);
    }, 1100);

    // Auto-dismiss after 5 seconds if not clicked
    const autoCloseTimer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => {
      clearTimeout(settleTimer);
      clearTimeout(autoCloseTimer);
    };
  }, [rollData, onClose]);

  if (!rollData) return null;

  const is3D6 = rollData.diceCount === 3;
  const isCriticalSuccess = is3D6 && rollData.total <= 4;
  const isCriticalFailure = is3D6 && rollData.total >= 17;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[999999] flex flex-col items-center justify-center cursor-pointer select-none"
      style={{
        background: 'radial-gradient(circle at center, rgba(13, 11, 9, 0.72) 0%, rgba(8, 6, 5, 0.92) 100%)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
      }}
    >
      {/* Botão X para fechar no canto superior */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-4 right-4 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-750 transition-colors shadow-lg cursor-pointer"
        title="Fechar (ou clique na tela)"
      >
        <X size={18} />
      </button>

      {/* Dica para o usuário */}
      <div className="absolute top-5 text-[11px] font-semibold text-amber-300/80 uppercase tracking-widest bg-slate-950/80 px-3.5 py-1 rounded-full border border-amber-500/30 shadow-md">
        Clique em qualquer lugar da tela para fechar
      </div>

      {/* Container dos Dados 3D */}
      <div className="flex items-center justify-center gap-6 sm:gap-10 py-8" style={{ perspective: '1200px' }}>
        {rollData.rolls.map((value, idx) => {
          const rot = getFinalRotation(value);
          const delay = idx * 0.08;
          const tiltZ = (idx - (rollData.rolls.length - 1) / 2) * 12;

          return (
            <div key={idx} className="flex flex-col items-center">
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  perspective: '900px',
                }}
              >
                <div
                  className="dice-3d-cube"
                  style={{
                    width: '68px',
                    height: '68px',
                    position: 'relative',
                    transformStyle: 'preserve-3d',
                    animation: `diceRollAnim${idx} 1.15s cubic-bezier(0.18, 0.89, 0.32, 1.15) ${delay}s forwards`,
                    transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg) rotateZ(${tiltZ}deg)`,
                  }}
                >
                  {/* Face 1 */}
                  <div className="dice-face face-1">
                    <span className="dice-pip center" />
                  </div>
                  {/* Face 2 */}
                  <div className="dice-face face-2">
                    <span className="dice-pip top-left" />
                    <span className="dice-pip bottom-right" />
                  </div>
                  {/* Face 3 */}
                  <div className="dice-face face-3">
                    <span className="dice-pip top-left" />
                    <span className="dice-pip center" />
                    <span className="dice-pip bottom-right" />
                  </div>
                  {/* Face 4 */}
                  <div className="dice-face face-4">
                    <span className="dice-pip top-left" />
                    <span className="dice-pip top-right" />
                    <span className="dice-pip bottom-left" />
                    <span className="dice-pip bottom-right" />
                  </div>
                  {/* Face 5 */}
                  <div className="dice-face face-5">
                    <span className="dice-pip top-left" />
                    <span className="dice-pip top-right" />
                    <span className="dice-pip center" />
                    <span className="dice-pip bottom-left" />
                    <span className="dice-pip bottom-right" />
                  </div>
                  {/* Face 6 */}
                  <div className="dice-face face-6">
                    <span className="dice-pip top-left" />
                    <span className="dice-pip top-right" />
                    <span className="dice-pip mid-left" />
                    <span className="dice-pip mid-right" />
                    <span className="dice-pip bottom-left" />
                    <span className="dice-pip bottom-right" />
                  </div>
                </div>
              </div>

              {/* Sombra realista do dado */}
              <div
                style={{
                  width: '56px',
                  height: '14px',
                  borderRadius: '50%',
                  background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0) 70%)',
                  marginTop: '16px',
                  animation: `diceShadowAnim 1.15s ease-out ${delay}s forwards`,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Cartão de Resultado (surge quando os dados caem) */}
      <div
        className={`mt-4 w-full max-w-sm mx-4 bg-slate-900/95 border border-slate-750 rounded-2xl p-4 shadow-2xl transition-all duration-300 transform flex flex-col items-center text-center space-y-2.5 ${
          showResult ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-4 pointer-events-none'
        }`}
        style={{
          boxShadow: isCriticalSuccess
            ? '0 0 30px rgba(16, 185, 129, 0.4), 0 20px 40px rgba(0,0,0,0.8)'
            : isCriticalFailure
            ? '0 0 30px rgba(244, 63, 94, 0.4), 0 20px 40px rgba(0,0,0,0.8)'
            : '0 0 25px rgba(217, 119, 6, 0.3), 0 20px 40px rgba(0,0,0,0.8)',
        }}
      >
        {/* Identificação do Personagem / Jogador */}
        <div className="flex items-center gap-2.5 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 w-full justify-center">
          <NpcAvatar
            avatar={rollData.avatar}
            preset={rollData.avatarPreset}
            name={rollData.characterName}
            size="sm"
          />
          <div className="text-left min-w-0">
            <div className="text-xs font-bold text-white leading-tight truncate">
              {rollData.characterName}
            </div>
            {rollData.playerName && (
              <div className="text-[10px] text-amber-300/80 leading-tight">
                Jogador: {rollData.playerName}
              </div>
            )}
          </div>
        </div>

        {/* Total e Valores dos Dados */}
        <div className="flex items-center justify-center gap-3 w-full py-1">
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              {rollData.diceCount}D6 Rolado
            </span>
            <div className="flex items-baseline gap-2">
              <span
                className={`font-mono font-black text-4xl sm:text-5xl tracking-tight ${
                  isCriticalSuccess
                    ? 'text-emerald-400'
                    : isCriticalFailure
                    ? 'text-rose-400'
                    : 'text-amber-300'
                }`}
              >
                {rollData.total}
              </span>
            </div>
          </div>

          {/* Composição das faces (se 3D6) */}
          {rollData.rolls.length > 1 && (
            <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-300">
              {rollData.rolls.map((r, i) => (
                <React.Fragment key={i}>
                  <span className="w-6 h-6 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-300">
                    {r}
                  </span>
                  {i < rollData.rolls.length - 1 && <span className="text-slate-500">+</span>}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* Badges de Crítico (GURPS) */}
        {isCriticalSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-950/90 border border-emerald-600/70 text-emerald-300 rounded-lg text-xs font-bold shadow-sm animate-pulse">
            <Sparkles size={14} className="text-emerald-400" />
            <span>Sucesso Decisivo! (Crítico)</span>
          </div>
        )}
        {isCriticalFailure && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-950/90 border border-rose-600/70 text-rose-300 rounded-lg text-xs font-bold shadow-sm animate-pulse">
            <Skull size={14} className="text-rose-400" />
            <span>Falha Crítica!</span>
          </div>
        )}
      </div>

      {/* Estilos CSS dos cubos 3D e animações */}
      <style>{`
        .dice-3d-cube {
          transform-style: preserve-3d;
        }
        .dice-face {
          position: absolute;
          width: 68px;
          height: 68px;
          background: linear-gradient(145deg, #fffcf5 0%, #ecdcc9 65%, #d9c5ab 100%);
          border: 2px solid #9c7b57;
          border-radius: 14px;
          box-shadow: inset 0 0 10px rgba(0,0,0,0.22), inset 0 1px 2px rgba(255,255,255,0.8);
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          grid-template-rows: repeat(3, 1fr);
          padding: 8px;
          box-sizing: border-box;
          backface-visibility: hidden;
        }
        .dice-pip {
          width: 10px;
          height: 10px;
          background: radial-gradient(circle at 35% 35%, #2a2017 0%, #0d0b09 85%);
          border-radius: 50%;
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.6), 0 1px 1px rgba(255,255,255,0.4);
          align-self: center;
          justify-self: center;
        }
        .dice-pip.center { grid-column: 2; grid-row: 2; }
        .dice-pip.top-left { grid-column: 1; grid-row: 1; }
        .dice-pip.top-right { grid-column: 3; grid-row: 1; }
        .dice-pip.mid-left { grid-column: 1; grid-row: 2; }
        .dice-pip.mid-right { grid-column: 3; grid-row: 2; }
        .dice-pip.bottom-left { grid-column: 1; grid-row: 3; }
        .dice-pip.bottom-right { grid-column: 3; grid-row: 3; }

        .face-1 { transform: rotateY(0deg) translateZ(34px); }
        .face-2 { transform: rotateY(90deg) translateZ(34px); }
        .face-3 { transform: rotateX(90deg) translateZ(34px); }
        .face-4 { transform: rotateX(-90deg) translateZ(34px); }
        .face-5 { transform: rotateY(-90deg) translateZ(34px); }
        .face-6 { transform: rotateY(180deg) translateZ(34px); }

        @keyframes diceRollAnim0 {
          0% { transform: translateY(-240px) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(0.6); opacity: 0; }
          15% { opacity: 1; }
          60% { transform: translateY(18px) rotateX(1080deg) rotateY(1440deg) rotateZ(360deg) scale(1.08); }
          80% { transform: translateY(-16px) rotateX(810deg) rotateY(1170deg) rotateZ(400deg) scale(0.96); }
          100% { opacity: 1; }
        }
        @keyframes diceRollAnim1 {
          0% { transform: translateY(-260px) rotateX(45deg) rotateY(30deg) rotateZ(60deg) scale(0.6); opacity: 0; }
          15% { opacity: 1; }
          60% { transform: translateY(22px) rotateX(1170deg) rotateY(1530deg) rotateZ(420deg) scale(1.1); }
          80% { transform: translateY(-14px) rotateX(900deg) rotateY(1260deg) rotateZ(460deg) scale(0.97); }
          100% { opacity: 1; }
        }
        @keyframes diceRollAnim2 {
          0% { transform: translateY(-220px) rotateX(-45deg) rotateY(-30deg) rotateZ(-60deg) scale(0.6); opacity: 0; }
          15% { opacity: 1; }
          60% { transform: translateY(16px) rotateX(990deg) rotateY(1350deg) rotateZ(300deg) scale(1.06); }
          80% { transform: translateY(-12px) rotateX(720deg) rotateY(1080deg) rotateZ(340deg) scale(0.98); }
          100% { opacity: 1; }
        }
        @keyframes diceShadowAnim {
          0% { transform: scale(0.2); opacity: 0; }
          60% { transform: scale(1.25); opacity: 0.7; }
          80% { transform: scale(0.85); opacity: 0.45; }
          100% { transform: scale(1); opacity: 0.6; }
        }
      `}</style>
    </div>
  );
};
