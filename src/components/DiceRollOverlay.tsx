import React, { useEffect } from 'react';

export interface DiceRollResult {
  id?: string;
  rolls: number[];
  total: number;
  diceCount: number; // 3 or 1
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
  useEffect(() => {
    if (!rollData) return;

    // Use the 3D dice roller engine
    const roller = (window as any).DiceRoller3D || (window as any).parent?.DiceRoller3D;
    if (roller && typeof roller.roll === 'function') {
      roller.roll(rollData, () => {});
    }

    const startTime = Date.now();
    const handleDismiss = () => {
      onClose();
    };

    // Instant dismiss on any click / tap / keydown anywhere on the screen
    const onUserInteraction = () => {
      if (Date.now() - startTime < 300) return;
      window.removeEventListener('pointerdown', onUserInteraction, true);
      window.removeEventListener('keydown', onUserInteraction, true);
      if (roller && typeof roller.dismiss === 'function') {
        roller.dismiss();
      }
      handleDismiss();
    };

    window.addEventListener('pointerdown', onUserInteraction, true);
    window.addEventListener('keydown', onUserInteraction, true);

    const autoTimer = setTimeout(() => {
      window.removeEventListener('pointerdown', onUserInteraction, true);
      window.removeEventListener('keydown', onUserInteraction, true);
      handleDismiss();
    }, 7500);

    return () => {
      window.removeEventListener('pointerdown', onUserInteraction, true);
      window.removeEventListener('keydown', onUserInteraction, true);
      clearTimeout(autoTimer);
      if (roller && typeof roller.dismiss === 'function') {
        roller.dismiss();
      }
    };
  }, [rollData, onClose]);

  // Renders nothing to DOM tree; 3D canvas is overlaid cleanly by DiceRoller3D on body with pointer-events: none
  return null;
};
