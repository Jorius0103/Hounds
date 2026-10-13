import { ArmorKit, BodyArmorLocation, ConditionDefinition, NPC, ParryEntry, TurnActionsTracker } from '../types/rpg';

export interface HitLocationTemplate {
  rollTarget: string;
  location: string;
  penalty?: string;
  additionalRule: string;
  hpFormulaLabel: string;
  hpDivisor?: number;
}

/**
 * Tabela de Armadura por Localização conforme modelo do Excel:
 * Roll | Parte do corpo | Vida total | Regra adicional
 */
export const GURPS_EXCEL_HIT_LOCATIONS: HitLocationTemplate[] = [
  {
    rollTarget: '-',
    location: 'Eye',
    penalty: '-9',
    additionalRule: 'Só consegue acertar o olho danos de impaling, piercing ou magia, se for outro alertar antes de registrar mas permitir registro com confirmação',
    hpFormulaLabel: '=Pontos de Vida / 10',
    hpDivisor: 10,
  },
  {
    rollTarget: '3-4',
    location: 'Head',
    penalty: '-7',
    additionalRule: 'Tem +2 de RD / Qualquer dano vira 4X',
    hpFormulaLabel: '---',
  },
  {
    rollTarget: '5',
    location: 'Face',
    penalty: '-5',
    additionalRule: '',
    hpFormulaLabel: '---',
  },
  {
    rollTarget: '13-14',
    location: 'Left Leg',
    penalty: '-2',
    additionalRule: 'Perfurante, perfurante grande e empalamento vira x1',
    hpFormulaLabel: '=Pontos de Vida / 2',
    hpDivisor: 2,
  },
  {
    rollTarget: '6-7',
    location: 'Right Leg',
    penalty: '-2',
    additionalRule: 'Perfurante, perfurante grande e empalamento vira x1',
    hpFormulaLabel: '=Pontos de Vida / 2',
    hpDivisor: 2,
  },
  {
    rollTarget: '13-14',
    location: 'Left Shins',
    penalty: '-2',
    additionalRule: 'Perfurante, perfurante grande e empalamento vira x1',
    hpFormulaLabel: '=Pontos de Vida / 2',
    hpDivisor: 2,
  },
  {
    rollTarget: '6-7',
    location: 'Right Shins',
    penalty: '-2',
    additionalRule: 'Perfurante, perfurante grande e empalamento vira x1',
    hpFormulaLabel: '=Pontos de Vida / 2',
    hpDivisor: 2,
  },
  {
    rollTarget: '12',
    location: 'Left Arm',
    penalty: '-2',
    additionalRule: 'Perfurante, perfurante grande e empalamento vira x1',
    hpFormulaLabel: '=Pontos de Vida / 2',
    hpDivisor: 2,
  },
  {
    rollTarget: '8',
    location: 'Right Arm',
    penalty: '-2',
    additionalRule: 'Perfurante, perfurante grande e empalamento vira x1',
    hpFormulaLabel: '=Pontos de Vida / 2',
    hpDivisor: 2,
  },
  {
    rollTarget: '12',
    location: 'Left Forearm',
    penalty: '-2',
    additionalRule: 'Perfurante, perfurante grande e empalamento vira x1',
    hpFormulaLabel: '=Pontos de Vida / 2',
    hpDivisor: 2,
  },
  {
    rollTarget: '8',
    location: 'Right Forearm',
    penalty: '-2',
    additionalRule: 'Perfurante, perfurante grande e empalamento vira x1',
    hpFormulaLabel: '=Pontos de Vida / 2',
    hpDivisor: 2,
  },
  {
    rollTarget: '9-10',
    location: 'Torso',
    penalty: '0',
    additionalRule: '',
    hpFormulaLabel: '---',
  },
  {
    rollTarget: '11',
    location: 'Groin',
    penalty: '-3',
    additionalRule: '',
    hpFormulaLabel: '=Pontos de Vida / 3',
    hpDivisor: 3,
  },
  {
    rollTarget: '15',
    location: 'Hand',
    penalty: '-4',
    additionalRule: 'Perfurante, perfurante grande e empalamento vira x1',
    hpFormulaLabel: '=Pontos de Vida / 3',
    hpDivisor: 3,
  },
  {
    rollTarget: '16',
    location: 'Feet',
    penalty: '-4',
    additionalRule: 'Perfurante, perfurante grande e empalamento vira x1',
    hpFormulaLabel: '=Pontos de Vida / 3',
    hpDivisor: 3,
  },
  {
    rollTarget: '17-18',
    location: 'Neck',
    penalty: '-5',
    additionalRule: 'Contusão vira 1,5, corte vai de 1,5 para 2.0',
    hpFormulaLabel: '---',
  },
  {
    rollTarget: '-',
    location: 'Vitals',
    penalty: '-3',
    additionalRule: 'Empalamento e perfuração vira x3',
    hpFormulaLabel: '---',
  },
];

// Alias para compatibilidade reversa
export const GURPS_IMAGE_HIT_LOCATIONS = GURPS_EXCEL_HIT_LOCATIONS.map((loc) => ({
  location: loc.location,
  rollTarget: loc.rollTarget,
  penalty: loc.penalty || '0',
  armorName: '',
  dr: 0,
  notes: '',
  additionalRule: loc.additionalRule,
}));

export function normalizeLocationKey(name: string): string {
  if (!name) return '';
  const lower = name.trim().toLowerCase();
  if (lower === 'eye' || lower === 'olho' || lower === 'olhos') return 'eye';
  if (lower === 'head' || lower === 'cabeça' || lower === 'cabeca' || lower === 'skull' || lower === 'crânio' || lower === 'cranio') return 'head';
  if (lower === 'face' || lower === 'rosto') return 'face';

  // Forearms (antes de Arm pois contém 'arm')
  const isForearm = lower.includes('forearm') || lower.includes('antebraço') || lower.includes('antebraco');
  if (isForearm) {
    if (lower.includes('left') || lower.includes('esquerd')) return 'left_forearm';
    if (lower.includes('right') || lower.includes('direit')) return 'right_forearm';
    return 'forearms';
  }

  // Shins (antes de Leg)
  const isShin = lower.includes('shin') || lower.includes('canela');
  if (isShin) {
    if (lower.includes('left') || lower.includes('esquerd')) return 'left_shins';
    if (lower.includes('right') || lower.includes('direit')) return 'right_shins';
    return 'shins';
  }

  // Arms
  const isArm = lower.includes('arm') || lower.includes('braço') || lower.includes('braco');
  if (isArm) {
    if (lower.includes('left') || lower.includes('esquerd')) return 'left_arm';
    if (lower.includes('right') || lower.includes('direit')) return 'right_arm';
    return 'arm';
  }

  // Legs
  const isLeg = lower.includes('leg') || lower.includes('perna');
  if (isLeg) {
    if (lower.includes('left') || lower.includes('esquerd')) return 'left_leg';
    if (lower.includes('right') || lower.includes('direit')) return 'right_leg';
    return 'leg';
  }

  if (lower === 'torso' || lower === 'tronco') return 'torso';
  if (lower === 'groin' || lower === 'virilha') return 'groin';
  if (lower === 'hand' || lower === 'mão' || lower === 'mãos' || lower === 'mao' || lower === 'maos') return 'hand';
  if (lower === 'foot' || lower === 'feet' || lower === 'pé' || lower === 'pés' || lower === 'pe' || lower === 'pes') return 'feet';
  if (lower === 'neck' || lower === 'pescoço' || lower === 'pescoco') return 'neck';
  if (lower === 'vitals' || lower === 'vitais' || lower.includes('vital') || lower.includes('órgãos vitais') || lower.includes('orgaos vitais')) return 'vitals';
  return lower;
}

export function isSameLocation(loc1: string, loc2: string): boolean {
  if (!loc1 || !loc2) return false;
  return normalizeLocationKey(loc1) === normalizeLocationKey(loc2);
}

export function createDefaultArmorLocations(ownerId: string = ''): BodyArmorLocation[] {
  const prefix = ownerId ? `armor-${ownerId}` : `armor-${Date.now()}`;
  return GURPS_EXCEL_HIT_LOCATIONS.map((loc, i) => ({
    id: `${prefix}-${i}-${Math.random().toString(36).slice(2, 6)}`,
    location: loc.location,
    rollTarget: loc.rollTarget,
    penalty: loc.penalty,
    armorName: '',
    dr: 0,
    drModifier: 0,
    modifierDamageType: '',
    damageTaken: 0,
    additionalRule: loc.additionalRule,
    notes: '',
  }));
}

export function migrateArmorLocations(existingLocs?: BodyArmorLocation[], ownerId: string = ''): BodyArmorLocation[] {
  const defaults = createDefaultArmorLocations(ownerId);
  if (!existingLocs || existingLocs.length === 0) {
    return defaults;
  }

  const hasLeftLeg = existingLocs.some((l) => normalizeLocationKey(l.location) === 'left_leg');
  const hasRightLeg = existingLocs.some((l) => normalizeLocationKey(l.location) === 'right_leg');
  const hasLeftArm = existingLocs.some((l) => normalizeLocationKey(l.location) === 'left_arm');
  const hasRightArm = existingLocs.some((l) => normalizeLocationKey(l.location) === 'right_arm');

  if (hasLeftLeg && hasRightLeg && hasLeftArm && hasRightArm) {
    return defaults.map((def) => {
      const found = existingLocs.find((e) => isSameLocation(e.location, def.location));
      if (found) {
        return {
          ...def,
          ...found,
          rollTarget: def.rollTarget,
          penalty: def.penalty,
        };
      }
      return def;
    });
  }

  const legacyLeg = existingLocs.find((l) => normalizeLocationKey(l.location) === 'leg');
  const legacyShins = existingLocs.find((l) => normalizeLocationKey(l.location) === 'shins');
  const legacyArm = existingLocs.find((l) => normalizeLocationKey(l.location) === 'arm');
  const legacyForearms = existingLocs.find((l) => normalizeLocationKey(l.location) === 'forearms');

  return defaults.map((def) => {
    const norm = normalizeLocationKey(def.location);
    const directMatch = existingLocs.find((e) => isSameLocation(e.location, def.location));
    if (directMatch) {
      return {
        ...def,
        ...directMatch,
        rollTarget: def.rollTarget,
        penalty: def.penalty,
      };
    }

    if ((norm === 'left_leg' || norm === 'right_leg') && legacyLeg) {
      return {
        ...def,
        armorName: legacyLeg.armorName || '',
        dr: legacyLeg.dr || 0,
        drModifier: legacyLeg.drModifier || 0,
        modifierDamageType: legacyLeg.modifierDamageType || '',
      };
    }
    if ((norm === 'left_shins' || norm === 'right_shins') && legacyShins) {
      return {
        ...def,
        armorName: legacyShins.armorName || '',
        dr: legacyShins.dr || 0,
        drModifier: legacyShins.drModifier || 0,
        modifierDamageType: legacyShins.modifierDamageType || '',
      };
    }
    if ((norm === 'left_arm' || norm === 'right_arm') && legacyArm) {
      return {
        ...def,
        armorName: legacyArm.armorName || '',
        dr: legacyArm.dr || 0,
        drModifier: legacyArm.drModifier || 0,
        modifierDamageType: legacyArm.modifierDamageType || '',
      };
    }
    if ((norm === 'left_forearm' || norm === 'right_forearm') && legacyForearms) {
      return {
        ...def,
        armorName: legacyForearms.armorName || '',
        dr: legacyForearms.dr || 0,
        drModifier: legacyForearms.drModifier || 0,
        modifierDamageType: legacyForearms.modifierDamageType || '',
      };
    }

    return def;
  });
}

/**
 * Configuração das Partes do Corpo para a aba "Partes do Corpo".
 * Unifica:
 * - Arms e Forearms Left -> Arms Left (Left Arm)
 * - Arms e Forearms Right -> Arms Right (Right Arm)
 * - Legs e Shins Left -> Leg Left (Left Leg)
 * - Legs e Shins Right -> Leg Right (Right Leg)
 */
export interface BodyPartConfig {
  key: string;
  name: string;
  sublabel?: string;
  hpFormulaLabel: string;
  hpDivisor?: number;
  defaultRule: string;
  logKeys: string[];
}

export const BODY_PARTS_CONFIG: BodyPartConfig[] = [
  {
    key: 'eye',
    name: 'Eye',
    hpFormulaLabel: '=Pontos de Vida / 10',
    hpDivisor: 10,
    defaultRule: 'Só consegue acertar o olho danos de impaling, piercing ou magia, se for outro alertar antes de registrar mas permitir registro com confirmação',
    logKeys: ['eye'],
  },
  {
    key: 'head',
    name: 'Head',
    hpFormulaLabel: '---',
    defaultRule: 'Tem +2 de RD / Qualquer dano vira 4X',
    logKeys: ['head'],
  },
  {
    key: 'face',
    name: 'Face',
    hpFormulaLabel: '---',
    defaultRule: '',
    logKeys: ['face'],
  },
  {
    key: 'left_arm',
    name: 'Left Arm',
    sublabel: 'Left Arm + Left Forearm',
    hpFormulaLabel: '=Pontos de Vida / 2',
    hpDivisor: 2,
    defaultRule: 'Perfurante, perfurante grande e empalamento vira x1',
    logKeys: ['left_arm', 'left_forearm'],
  },
  {
    key: 'right_arm',
    name: 'Right Arm',
    sublabel: 'Right Arm + Right Forearm',
    hpFormulaLabel: '=Pontos de Vida / 2',
    hpDivisor: 2,
    defaultRule: 'Perfurante, perfurante grande e empalamento vira x1',
    logKeys: ['right_arm', 'right_forearm'],
  },
  {
    key: 'torso',
    name: 'Torso',
    hpFormulaLabel: '---',
    defaultRule: '',
    logKeys: ['torso'],
  },
  {
    key: 'groin',
    name: 'Groin',
    hpFormulaLabel: '=Pontos de Vida / 3',
    hpDivisor: 3,
    defaultRule: '',
    logKeys: ['groin'],
  },
  {
    key: 'left_leg',
    name: 'Left Leg',
    sublabel: 'Left Leg + Left Shins',
    hpFormulaLabel: '=Pontos de Vida / 2',
    hpDivisor: 2,
    defaultRule: 'Perfurante, perfurante grande e empalamento vira x1',
    logKeys: ['left_leg', 'left_shins'],
  },
  {
    key: 'right_leg',
    name: 'Right Leg',
    sublabel: 'Right Leg + Right Shins',
    hpFormulaLabel: '=Pontos de Vida / 2',
    hpDivisor: 2,
    defaultRule: 'Perfurante, perfurante grande e empalamento vira x1',
    logKeys: ['right_leg', 'right_shins'],
  },
  {
    key: 'hand',
    name: 'Hand',
    hpFormulaLabel: '=Pontos de Vida / 3',
    hpDivisor: 3,
    defaultRule: 'Perfurante, perfurante grande e empalamento vira x1',
    logKeys: ['hand'],
  },
  {
    key: 'feet',
    name: 'Feet',
    hpFormulaLabel: '=Pontos de Vida / 3',
    hpDivisor: 3,
    defaultRule: 'Perfurante, perfurante grande e empalamento vira x1',
    logKeys: ['feet', 'foot'],
  },
  {
    key: 'neck',
    name: 'Neck',
    hpFormulaLabel: '---',
    defaultRule: 'Contusão vira 1,5, corte vai de 1,5 para 2.0',
    logKeys: ['neck'],
  },
  {
    key: 'vitals',
    name: 'Vitals',
    hpFormulaLabel: '---',
    defaultRule: 'Empalamento e perfuração vira x3',
    logKeys: ['vitals'],
  },
];

export function calculateLogDamageForBodyPart(history: any[] = [], logKeys: string[]): number {
  if (!history || !Array.isArray(history)) return 0;
  return history
    .filter((h) => h && h.type === 'damage' && h.hitLocation)
    .reduce((sum, h) => {
      const locKey = normalizeLocationKey(h.hitLocation || '');
      if (logKeys.includes(locKey)) {
        return sum + (h.finalDamage ?? h.amount ?? 0);
      }
      return sum;
    }, 0);
}

export function createDefaultArmorKit(name: string = 'Kit Padrão', ownerId: string = '', isActive: boolean = true): ArmorKit {
  return {
    id: `kit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    isActive,
    locations: createDefaultArmorLocations(ownerId),
  };
}

export function calculateLocationHp(locationName: string, hpMax: number): { value: number | null; display: string; formulaLabel: string } {
  const norm = normalizeLocationKey(locationName);
  const found = GURPS_EXCEL_HIT_LOCATIONS.find((t) => normalizeLocationKey(t.location) === norm);

  if (!found || !found.hpDivisor || !hpMax || hpMax <= 0) {
    return {
      value: null,
      display: '---',
      formulaLabel: found?.hpFormulaLabel || '---',
    };
  }

  const rawVal = hpMax / found.hpDivisor;
  const display = rawVal.toFixed(1);
  return {
    value: Number(display),
    display,
    formulaLabel: found.hpFormulaLabel,
  };
}

export function getBaseDamageMultiplier(type: string): number {
  switch (type) {
    case 'corte':
    case 'cutting':
      return 1.5;
    case 'empalamento':
    case 'impaling':
      return 2.0;
    case 'perfurante_grande':
    case 'large_piercing':
      return 1.5;
    case 'perfurante_pequeno':
    case 'small_piercing':
      return 0.5;
    case 'contusao':
    case 'crushing':
    case 'perfurante':
    case 'piercing':
    case 'queima':
    case 'burning':
    default:
      return 1.0;
  }
}

export interface DamageCalculationResult {
  armorDr: number;
  naturalDr: number;
  locationBonusDr: number;
  totalDr: number;
  penetratingDamage: number;
  woundMultiplier: number;
  finalDamage: number;
  appliedRules: string[];
  requiresEyeConfirmation?: boolean;
  eyeWarningMessage?: string;
}

export function calculateLocationDamage(params: {
  locationName: string;
  damageType: string;
  rawDamage: number;
  baseArmorDr: number;
  armorDrModifier: number;
  naturalDr: number;
  appliesArmorModifier: boolean;
  bypassDr: boolean;
  isNoLocation?: boolean;
  customMultiplier?: number;
}): DamageCalculationResult {
  const {
    locationName,
    damageType,
    rawDamage,
    baseArmorDr,
    armorDrModifier,
    naturalDr,
    appliesArmorModifier,
    bypassDr,
    isNoLocation,
    customMultiplier,
  } = params;

  if (isNoLocation) {
    const defaultMult =
      customMultiplier !== undefined && (damageType === 'personalizado' || damageType === 'custom')
        ? customMultiplier
        : getBaseDamageMultiplier(damageType);
    const finalDamage = Math.floor(rawDamage * defaultMult);
    return {
      armorDr: 0,
      naturalDr: 0,
      locationBonusDr: 0,
      totalDr: 0,
      penetratingDamage: rawDamage,
      woundMultiplier: defaultMult,
      finalDamage,
      appliedRules: [],
    };
  }

  const normKey = normalizeLocationKey(locationName);
  const appliedRules: string[] = [];

  // Regra Head: "Tem +2 de RD"
  let locationBonusDr = 0;
  if (normKey === 'head') {
    locationBonusDr = 2;
    appliedRules.push('Cabeça: +2 RD de Crânio');
  }

  const effectiveArmorDr = Math.max(0, baseArmorDr + (appliesArmorModifier ? armorDrModifier : 0));
  const effectiveNaturalDr = naturalDr || 0;
  const totalDr = bypassDr ? 0 : Math.max(0, effectiveArmorDr + effectiveNaturalDr + locationBonusDr);
  const penetratingDamage = Math.max(0, rawDamage - totalDr);

  // Multiplicador padrão
  let woundMultiplier = getBaseDamageMultiplier(damageType);

  let requiresEyeConfirmation = false;
  let eyeWarningMessage: string | undefined = undefined;

  if (normKey === 'head') {
    // Regra Head: "Qualquer dano vira 4X"
    woundMultiplier = 4.0;
    appliedRules.push('Cabeça: Qualquer dano vira x4');
  } else if (normKey === 'neck') {
    // Regra Neck: "Contusão vira 1,5, corte vai de 1,5 para 2.0"
    if (damageType === 'contusao' || damageType === 'crushing') {
      woundMultiplier = 1.5;
      appliedRules.push('Pescoço: Contusão vira x1.5');
    } else if (damageType === 'corte' || damageType === 'cutting') {
      woundMultiplier = 2.0;
      appliedRules.push('Pescoço: Corte vai de 1.5 para x2.0');
    }
  } else if (normKey === 'vitals') {
    // Regra Vitals: "Empalamento e perfuração vira x3"
    if (
      damageType === 'empalamento' ||
      damageType === 'impaling' ||
      damageType.startsWith('perfurante') ||
      damageType.startsWith('piercing')
    ) {
      woundMultiplier = 3.0;
      appliedRules.push('Órgãos Vitais: Empalamento e perfuração vira x3');
    }
  } else if (
    normKey === 'arm' ||
    normKey === 'left_arm' ||
    normKey === 'right_arm' ||
    normKey === 'forearms' ||
    normKey === 'left_forearm' ||
    normKey === 'right_forearm' ||
    normKey === 'leg' ||
    normKey === 'left_leg' ||
    normKey === 'right_leg' ||
    normKey === 'shins' ||
    normKey === 'left_shins' ||
    normKey === 'right_shins' ||
    normKey === 'hand' ||
    normKey === 'feet' ||
    normKey === 'foot' ||
    normKey.includes('arm') ||
    normKey.includes('leg') ||
    normKey.includes('shin')
  ) {
    // Regra Membros/Extremidades: "Perfurante, perfurante grande e empalamento vira x1"
    if (
      damageType === 'empalamento' ||
      damageType === 'impaling' ||
      damageType === 'perfurante' ||
      damageType === 'perfurante_grande' ||
      damageType === 'piercing' ||
      damageType === 'large_piercing' ||
      damageType.startsWith('perfurante_grande') ||
      damageType.startsWith('large_piercing')
    ) {
      woundMultiplier = 1.0;
      appliedRules.push('Membro/Extremidade: Empalamento / Perfuração vira x1');
    }
  } else if (normKey === 'eye') {
    // Regra Eye: "Só consegue acertar o olho danos de impaling, piercing ou magia, se for outro alertar antes de registrar mas permitir registro com confirmação"
    const isImpalingOrPiercing =
      damageType === 'empalamento' ||
      damageType === 'impaling' ||
      damageType.startsWith('perfurante') ||
      damageType.startsWith('piercing') ||
      damageType === 'magia' ||
      damageType === 'queima' ||
      damageType === 'burning';

    if (!isImpalingOrPiercing && damageType) {
      requiresEyeConfirmation = true;
      eyeWarningMessage = 'Só consegue acertar o olho danos de impaling, piercing ou magia. Se for outro, confirme antes de registrar.';
    }
    // No cérebro através do olho o multiplicador é x4
    woundMultiplier = 4.0;
    appliedRules.push('Olho: Dano atinge o cérebro (x4)');
  }

  if (customMultiplier !== undefined && (damageType === 'personalizado' || damageType === 'custom')) {
    woundMultiplier = customMultiplier;
    appliedRules.push(`Multiplicador Personalizado: x${customMultiplier}`);
  }

  const finalDamage = Math.floor(penetratingDamage * woundMultiplier);

  return {
    armorDr: effectiveArmorDr,
    naturalDr: effectiveNaturalDr,
    locationBonusDr,
    totalDr,
    penetratingDamage,
    woundMultiplier,
    finalDamage,
    appliedRules,
    requiresEyeConfirmation,
    eyeWarningMessage,
  };
}

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

export function getConditionDescription(conditionNameOrId: string, customConditions?: ConditionDefinition[]): string {
  if (!conditionNameOrId) return '';
  const term = conditionNameOrId.trim().toLowerCase();
  const allConditions = [...(customConditions || []), ...DEFAULT_CONDITIONS];
  const found = allConditions.find(
    (c) => c.label.toLowerCase() === term || c.id.toLowerCase() === term || term.includes(c.label.toLowerCase()) || c.label.toLowerCase().includes(term)
  );
  return found?.description || 'Condição crítica de combate ativa.';
}

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
  
  const defaultLocations = createDefaultArmorLocations(id);
  const defaultKitId = `kit-${id}-1`;
  const defaultKit: ArmorKit = {
    id: defaultKitId,
    name: 'Kit Principal',
    isActive: true,
    locations: defaultLocations,
  };

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
    armorKits: [defaultKit],
    activeArmorKitId: defaultKitId,

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

export function getHpWarnings(current: number, max: number): string[] {
  if (max <= 0) return [];
  const warnings: string[] = [];

  // Patamar 1: < 1/3 PV
  if (current < Math.ceil(max / 3)) {
    warnings.push('Movimento e Esquiva reduzidos pela metade!');
  }
  // Patamar 2: <= 0 PV
  if (current <= 0) {
    warnings.push('Teste de HT a cada turno para não desmaiar');
  }
  // Patamar 3: <= -1x PV
  if (current <= -1 * max) {
    warnings.push('Requer teste de HT para não morrer a cada múltiplo');
  }
  // Morte instantânea
  if (current <= -5 * max) {
    warnings.push('Morte instantânea (-5x Máx)');
  }
  return warnings;
}

export function getFpWarnings(current: number, max: number): string[] {
  if (max <= 0) return [];
  const warnings: string[] = [];

  // Patamar 1: < 1/3 FP
  if (current < Math.ceil(max / 3)) {
    warnings.push('Esquiva, Move e ST caem pela metade!');
  }
  // Patamar 2: <= 0 FP
  if (current <= 0) {
    warnings.push('Perde 1 PV para cada FP adicional gasto');
  }
  // Patamar 3: <= -1x FP
  if (current <= -1 * max) {
    warnings.push('Incapacitado por estafa extrema');
  }
  return warnings;
}

export function getHpStatus(current: number, max: number): { label: string; color: string; badgeBg: string; warningText?: string; warningTexts: string[] } {
  const warningTexts = getHpWarnings(current, max);
  if (current <= -5 * max) {
    return { label: 'Morto (-5x Máx)', color: 'text-red-500', badgeBg: 'bg-red-950/80 border-red-800 text-red-300', warningText: 'Morte instantânea', warningTexts };
  }
  if (current <= -1 * max) {
    return { label: 'Risco de Morte (-1x Máx)', color: 'text-rose-500', badgeBg: 'bg-rose-950/80 border-rose-800 text-rose-300', warningText: 'Requer teste de HT para não morrer a cada múltiplo', warningTexts };
  }
  if (current <= 0) {
    return { label: 'Colapso (<= 0)', color: 'text-amber-500', badgeBg: 'bg-amber-950/80 border-amber-800 text-amber-300', warningText: 'Teste de HT a cada turno para não desmaiar', warningTexts };
  }
  if (current < Math.ceil(max / 3)) {
    return { label: 'Gravemente Ferido (< 1/3)', color: 'text-yellow-400', badgeBg: 'bg-yellow-950/80 border-yellow-800 text-yellow-300', warningText: 'Movimento e Esquiva reduzidos pela metade!', warningTexts };
  }
  if (current < max) {
    return { label: 'Ferido', color: 'text-emerald-400', badgeBg: 'bg-emerald-950/60 border-emerald-800 text-emerald-300', warningTexts };
  }
  return { label: 'Saudável (100%)', color: 'text-emerald-400', badgeBg: 'bg-emerald-950/40 border-emerald-900/50 text-emerald-300', warningTexts };
}

export function getFpStatus(current: number, max: number): { label: string; color: string; warningText?: string; warningTexts: string[] } {
  const warningTexts = getFpWarnings(current, max);
  if (current <= -1 * max) {
    return { label: 'Inconsciente (Exaustão)', color: 'text-red-400', warningText: 'Incapacitado por estafa extrema', warningTexts };
  }
  if (current <= 0) {
    return { label: 'Colapsando (0)', color: 'text-amber-400', warningText: 'Perde 1 PV para cada FP adicional gasto', warningTexts };
  }
  if (current < Math.ceil(max / 3)) {
    return { label: 'Muito Exausto (< 1/3)', color: 'text-yellow-400', warningText: 'Esquiva, Move e ST caem pela metade!', warningTexts };
  }
  if (current < max) {
    return { label: 'Cansado', color: 'text-cyan-400', warningTexts };
  }
  return { label: 'Descansado', color: 'text-cyan-400', warningTexts };
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

