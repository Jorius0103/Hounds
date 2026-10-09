import { BodyArmorLocation, ConditionDefinition, NPC, ParryEntry, TurnActionsTracker } from '../types/rpg';

/**
 * Human and Humanoid Hit Location Table (GURPS 4th Edition - Basic Set Campaigns p. 552)
 * As shown in the user's provided reference image:
 * Roll | Location (Penalty) | Notes
 */
export const GURPS_IMAGE_HIT_LOCATIONS: Omit<BodyArmorLocation, 'id'>[] = [
  { location: 'Eye', rollTarget: '—', penalty: '-9', armorName: '', dr: 0, notes: '', gurpsNotesRef: '[1, 2]' },
  { location: 'Skull', rollTarget: '3-4', penalty: '-7', armorName: '', dr: 0, notes: '', gurpsNotesRef: '[1, 3]' },
  { location: 'Face', rollTarget: '5', penalty: '-5', armorName: '', dr: 0, notes: '', gurpsNotesRef: '[1, 4]' },
  { location: 'Right Leg', rollTarget: '6-7', penalty: '-2', armorName: '', dr: 0, notes: '', gurpsNotesRef: '[5]' },
  { location: 'Right Arm', rollTarget: '8', penalty: '-2', armorName: '', dr: 0, notes: '', gurpsNotesRef: '[5, 6]' },
  { location: 'Torso', rollTarget: '9-10', penalty: '0', armorName: '', dr: 0, notes: '', gurpsNotesRef: '' },
  { location: 'Groin', rollTarget: '11', penalty: '-3', armorName: '', dr: 0, notes: '', gurpsNotesRef: '[1, 7]' },
  { location: 'Left Arm', rollTarget: '12', penalty: '-2', armorName: '', dr: 0, notes: '', gurpsNotesRef: '[5, 6]' },
  { location: 'Left Leg', rollTarget: '13-14', penalty: '-2', armorName: '', dr: 0, notes: '', gurpsNotesRef: '[5]' },
  { location: 'Hand', rollTarget: '15', penalty: '-4', armorName: '', dr: 0, notes: '', gurpsNotesRef: '[6, 8, 9]' },
  { location: 'Foot', rollTarget: '16', penalty: '-4', armorName: '', dr: 0, notes: '', gurpsNotesRef: '[8, 9]' },
  { location: 'Neck', rollTarget: '17-18', penalty: '-5', armorName: '', dr: 0, notes: '', gurpsNotesRef: '[1, 10]' },
  { location: 'Vitals', rollTarget: '—', penalty: '-3', armorName: '', dr: 0, notes: '', gurpsNotesRef: '[1, 11]' },
];

export const DEFAULT_CONDITIONS: ConditionDefinition[] = [
  { id: 'cond-stunned', label: 'Atordoado', description: 'Não pode agir, defesas ativas com -4, requer teste de HT por turno para recuperar.' },
  { id: 'cond-prone', label: 'Caído', description: '-4 para atacar corpo a corpo, -2 para defesas ativas.' },
  { id: 'cond-shock2', label: 'Chocado (-2)', description: '-2 em DX e IQ neste turno por dano recente sofrido.' },
  { id: 'cond-shock4', label: 'Chocado (-4)', description: '-4 em DX e IQ por dano recente severo.' },
  { id: 'cond-bleeding', label: 'Sangrando', description: 'Perde 1 PV por minuto sem tratamento ou primeiros socorros.' },
  { id: 'cond-crippled', label: 'Membro Aleijado', description: 'Membro (braço, perna, mão ou pé) inutilizado no combate.' },
  { id: 'cond-unconscious', label: 'Inconsciente', description: 'Incapacitado, falhou no teste de HT contra desmaio.' },
  { id: 'cond-fleeing', label: 'Em Fuga / Pânico', description: 'Falhou em teste de Vontade / Fright Check.' },
  { id: 'cond-exhausted', label: 'Exausto (FP < 1/3)', description: 'Movimento, Esquiva e ST reduzidos pela metade.' },
  { id: 'cond-blinded', label: 'Cegado', description: '-10 para atacar, defesas ativas apenas com Percepção/Audição.' },
  { id: 'cond-grappled', label: 'Agarrado', description: '-4 para DX, não pode mudar de postura nem se deslocar livremente.' },
  { id: 'cond-disarmed', label: 'Desarmado', description: 'Arma foi derrubada ou arrancada das mãos.' },
];

export const DEFAULT_TURN_ACTIONS: TurnActionsTracker = {
  parryCount: 0,
  dodgeCount: 0,
  blockCount: 0,
  usedRetreat: false,
  usedBlockThisTurn: false,
  shock: 0,
  usedFatigueThisTurn: false,
  fatigueAmountUsed: 0,
  notes: '',
};

export function createNewNpc(name: string = 'NOVO NPC'): NPC {
  const id = `npc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  
  // All 13 hit locations from the image, completely empty waiting for input
  const defaultLocations: BodyArmorLocation[] = GURPS_IMAGE_HIT_LOCATIONS.map((loc, i) => ({
    ...loc,
    id: `armor-${id}-${i}`,
    armorName: '',
    dr: 0,
    notes: '',
  }));

  // Default 1 Parry entry
  const defaultParries: ParryEntry[] = [
    {
      id: `parry-${id}-1`,
      weaponName: '',
      parryType: '',
      value: 0,
      notes: '',
    },
  ];

  return {
    id,
    name: name.trim() || 'NOVO NPC',
    title: '',
    weight: '', // Empty waiting for input
    height: '', // Empty waiting for input
    avatar: '',
    avatarPreset: 'knight',

    isVisibleToPlayer: false, // Default: não aparece para os jogadores
    isDead: false,

    hpCurrent: 0,
    hpMax: 0,
    fpCurrent: 0,
    fpMax: 0,
    statusConditions: [],

    turnActions: { ...DEFAULT_TURN_ACTIONS },

    st: 0,
    dx: 0,
    iq: 0,
    ht: 0,

    per: 0,
    will: 0,
    basicSpeed: 0,
    basicMove: 0,
    naturalDr: 0,

    parries: defaultParries,
    dodge: 0,
    block: 0,

    weapons: [],
    spells: [],

    armorLocations: defaultLocations,

    advantages: '',
    disadvantages: '',
    skills: '',
    combatSkills: '',
    combatPerks: '',
    equipment: '',

    masterNotes: '',
    assistantNotes: '',

    history: [],
  };
}

/**
 * Calculates next incremental name when duplicating an NPC:
 * e.g. "Goblin" -> "Goblin 1", "Goblin 1" -> "Goblin 2", "Goblin 2" -> "Goblin 3"
 */
export function getNextIncrementalName(baseName: string, existingNames: string[]): string {
  if (!baseName.trim()) return 'NOVO NPC 2';

  // Extract base title and existing trailing number if present
  // Matches "Goblin 2" -> prefix: "Goblin", num: 2
  const match = baseName.trim().match(/^(.*?)(?:\s+(\d+))?$/);
  const prefix = match && match[1] ? match[1].trim() : baseName.trim();

  // Find all existing numbers with this prefix
  const numbers: number[] = [];
  const regex = new RegExp(`^${escapeRegex(prefix)}(?:\\s+(\\d+))?$`, 'i');

  for (const name of existingNames) {
    const m = name.trim().match(regex);
    if (m) {
      if (m[1]) {
        numbers.push(parseInt(m[1], 10));
      } else {
        numbers.push(1); // Exact match without number counts as #1 (e.g. "NOVO NPC")
      }
    }
  }

  if (numbers.length === 0) {
    return `${prefix} 2`;
  }

  const maxNum = Math.max(...numbers);
  const nextNum = maxNum >= 1 ? maxNum + 1 : 2;
  return `${prefix} ${nextNum}`;
}

function escapeRegex(string: string) {
  return string.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
}

export function getHpStatus(current: number, max: number): { label: string; color: string; badgeBg: string; warningText?: string } {
  if (current <= -5 * max) {
    return { label: 'Morto (-5x Máx)', color: 'text-red-500', badgeBg: 'bg-red-950/80 border-red-800 text-red-300', warningText: 'Morte instantânea' };
  }
  if (current <= -1 * max) {
    return { label: 'Risco de Morte (-1x Máx)', color: 'text-rose-500', badgeBg: 'bg-rose-950/80 border-rose-800 text-rose-300', warningText: 'Requer teste de HT para não morrer a cada múltiplo' };
  }
  if (current <= 0) {
    return { label: 'Colapso (<= 0)', color: 'text-amber-500', badgeBg: 'bg-amber-950/80 border-amber-800 text-amber-300', warningText: 'Teste de HT a cada turno para não desmaiar' };
  }
  if (current < Math.ceil(max / 3)) {
    return { label: 'Gravemente Ferido (< 1/3)', color: 'text-yellow-400', badgeBg: 'bg-yellow-950/80 border-yellow-800 text-yellow-300', warningText: 'Movimento e Esquiva reduzidos pela metade!' };
  }
  if (current < max) {
    return { label: 'Ferido', color: 'text-emerald-400', badgeBg: 'bg-emerald-950/60 border-emerald-800 text-emerald-300' };
  }
  return { label: 'Saudável (100%)', color: 'text-emerald-400', badgeBg: 'bg-emerald-950/40 border-emerald-900/50 text-emerald-300' };
}

export function getFpStatus(current: number, max: number): { label: string; color: string; warningText?: string } {
  if (current <= -1 * max) {
    return { label: 'Inconsciente (Exaustão)', color: 'text-red-400', warningText: 'Incapacitado por estafa extrema' };
  }
  if (current <= 0) {
    return { label: 'Colapsando (0)', color: 'text-amber-400', warningText: 'Perde 1 PV para cada FP adicional gasto' };
  }
  if (current < Math.ceil(max / 3)) {
    return { label: 'Muito Exausto (< 1/3)', color: 'text-yellow-400', warningText: 'Esquiva, Move e ST caem pela metade!' };
  }
  if (current < max) {
    return { label: 'Cansado', color: 'text-cyan-400' };
  }
  return { label: 'Descansado', color: 'text-cyan-400' };
}

/**
 * Guia de Manobras de Combate GURPS (conforme imagem de referência do usuário):
 * - Verde - Attack
 * - Azul - Concentration
 * - Vermelho - All-out Attack
 * - Roxo - Move and Attack
 * - Rosa - All-out Defence
 * - Amarelo - Wait
 * - Marrom - Outra
 */
export interface CombatManeuverDef {
  id: string;
  name: string;
  colorName: string;
  bgHex: string;
  textHex: string;
  borderHex: string;
  badgeClass: string;
}

export const COMBAT_MANEUVERS: CombatManeuverDef[] = [
  {
    id: 'attack',
    name: 'Attack',
    colorName: 'Verde',
    bgHex: '#2e7d32',
    textHex: '#ffffff',
    borderHex: '#43a047',
    badgeClass: 'bg-[#2e7d32] text-white border-[#43a047]',
  },
  {
    id: 'concentration',
    name: 'Concentration',
    colorName: 'Azul',
    bgHex: '#0d47a1',
    textHex: '#ffffff',
    borderHex: '#1976d2',
    badgeClass: 'bg-[#0d47a1] text-white border-[#1976d2]',
  },
  {
    id: 'all_out_attack',
    name: 'All-out Attack',
    colorName: 'Vermelho',
    bgHex: '#8e0000',
    textHex: '#ffffff',
    borderHex: '#b71c1c',
    badgeClass: 'bg-[#8e0000] text-white border-[#b71c1c]',
  },
  {
    id: 'move_and_attack',
    name: 'Move and Attack',
    colorName: 'Roxo',
    bgHex: '#7b1fa2',
    textHex: '#ffffff',
    borderHex: '#9c27b0',
    badgeClass: 'bg-[#7b1fa2] text-white border-[#9c27b0]',
  },
  {
    id: 'all_out_defence',
    name: 'All-out Defence',
    colorName: 'Rosa',
    bgHex: '#d85252',
    textHex: '#ffffff',
    borderHex: '#ef5350',
    badgeClass: 'bg-[#d85252] text-white border-[#ef5350]',
  },
  {
    id: 'wait',
    name: 'Wait',
    colorName: 'Amarelo',
    bgHex: '#e5ad06',
    textHex: '#000000',
    borderHex: '#fbc02d',
    badgeClass: 'bg-[#e5ad06] text-black font-bold border-[#fbc02d]',
  },
  {
    id: 'other',
    name: 'Outra',
    colorName: 'Marrom',
    bgHex: '#6d3800',
    textHex: '#ffffff',
    borderHex: '#8d4600',
    badgeClass: 'bg-[#6d3800] text-white border-[#8d4600]',
  },
];

export function getCombatManeuver(id?: string): CombatManeuverDef | undefined {
  if (!id) return undefined;
  return COMBAT_MANEUVERS.find((m) => m.id === id);
}

