import React, { useEffect, useRef } from 'react';

export interface DiceRollResult {
  id?: string;
  rolls: number[];
  total: number;
  diceCount: number;
  diceSides?: number;
  characterName: string;
  playerName?: string;
  avatar?: string;
  avatarPreset?: string;
  timestamp?: number;
}

interface DiceRollOverlayProps {
  rollData: DiceRollResult | null;
  onClose: () => void;
}

/**
 * DiceRollOverlay
 * Triggers the Roll20-style 3D dice animation over the application.
 * There is NO modal and NO dark backdrop.
 * Any click anywhere on the application dismisses the dice immediately
 * so the user can continue executing other tasks without hindrance.
 */
export const DiceRollOverlay: React.FC<DiceRollOverlayProps> = ({ rollData, onClose }) => {
  const lastRollIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!rollData) return;

    const currentId = rollData.id || `${rollData.timestamp || Date.now()}-${rollData.total}`;
    if (lastRollIdRef.current === currentId) return;
    lastRollIdRef.current = currentId;

    // Use the 3D dice roller engine
    const roller = (window as any).DiceRoller3D || (window as any).parent?.DiceRoller3D;
    if (roller && typeof roller.roll === 'function') {
      roller.roll(rollData, () => {
        onClose();
      });
    }

    // Auto-close React state after 8 seconds so it is ready for next roll
    const autoTimer = setTimeout(() => {
      onClose();
    }, 8000);

    return () => {
      clearTimeout(autoTimer);
      // NOTE: Do NOT call roller.dismiss() on React component effect cleanup!
      // React 18 / component re-renders would cancel the 3D animation mid-flight.
      // DiceRoller3D manages its own user click/timeout lifecycle safely.
    };
  }, [rollData, onClose]);

  // Renders nothing to DOM tree; 3D canvas is overlaid cleanly by DiceRoller3D on body with pointer-events: none
  return null;
};
