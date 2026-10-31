export interface ArmorCatalogItem {
  id: string;
  name: string;
  tl?: string;
  type?: string;
  table?: string;
  category?: string;
  location?: string;
  dr: string;
  cost?: string;
  weight?: string;
  lc?: string;
  notes?: string;
  footnotes?: string;
  book?: string;
  page?: string;
  don?: string;
}

export interface ArmorPresetType {
  name: string;
  category: string;
  dr: string;
  baseDr: number;
  drModifiers: { drModifier: number; modifierDamageType: string }[];
  description: string;
  notes?: string;
  location?: string;
}

export const GURPS_CORE_ARMOR_TYPES: ArmorPresetType[] = [
  {
    name: 'Heavy Plate (Placas Pesadas)',
    category: 'Plate',
    dr: '9',
    baseDr: 9,
    drModifiers: [],
    description: 'Armadura pesada de placas de aço (RD 9). Proteção para qualquer parte do corpo.',
    location: 'all',
  },
  {
    name: 'Medium Plate (Placas Médias)',
    category: 'Plate',
    dr: '6',
    baseDr: 6,
    drModifiers: [],
    description: 'Armadura média de placas de aço (RD 6).',
    location: 'all',
  },
  {
    name: 'Light Plate (Placas Leves)',
    category: 'Plate',
    dr: '3',
    baseDr: 3,
    drModifiers: [],
    description: 'Armadura leve de placas de aço (RD 3).',
    location: 'all',
  },
  {
    name: 'Heavy Segmented Plate',
    category: 'Segmented Plate',
    dr: '5',
    baseDr: 5,
    drModifiers: [],
    description: 'Placas articuladas pesadas (RD 5).',
    location: 'all',
  },
  {
    name: 'Medium Segmented Plate',
    category: 'Segmented Plate',
    dr: '4',
    baseDr: 4,
    drModifiers: [],
    description: 'Placas articuladas médias (RD 4).',
    location: 'all',
  },
  {
    name: 'Light Segmented Plate',
    category: 'Segmented Plate',
    dr: '3',
    baseDr: 3,
    drModifiers: [],
    description: 'Placas articuladas leves (RD 3).',
    location: 'all',
  },
  {
    name: 'Heavy Mail (Cota de Malha Pesada)',
    category: 'Mail',
    dr: '5/3*',
    baseDr: 5,
    drModifiers: [{ drModifier: -2, modifierDamageType: 'contusao' }],
    description: 'Cota de malha pesada (RD 5/3*). -2 de RD contra contusão.',
    location: 'all',
  },
  {
    name: 'Fine Mail (Cota de Malha Fina)',
    category: 'Mail',
    dr: '4/2*',
    baseDr: 4,
    drModifiers: [{ drModifier: -2, modifierDamageType: 'contusao' }],
    description: 'Cota de malha fina reforçada (RD 4/2*). -2 de RD contra contusão.',
    location: 'all',
  },
  {
    name: 'Light Mail (Cota de Malha Leve)',
    category: 'Mail',
    dr: '3/1*',
    baseDr: 3,
    drModifiers: [{ drModifier: -2, modifierDamageType: 'contusao' }],
    description: 'Cota de malha simples e leve (RD 3/1*). -2 de RD contra contusão.',
    location: 'all',
  },
  {
    name: 'Double Mail (Malha Dupla)',
    category: 'Mail',
    dr: '5/3*',
    baseDr: 5,
    drModifiers: [{ drModifier: -2, modifierDamageType: 'contusao' }],
    description: 'Malha dupla reforçada (RD 5/3*). -2 de RD contra contusão.',
    location: 'all',
  },
  {
    name: 'Heavy Leather / Hardened (Couro Pesado)',
    category: 'Leather',
    dr: '3',
    baseDr: 3,
    drModifiers: [],
    description: 'Couro fervido, rígido ou multicamadas pesado (RD 3).',
    location: 'all',
  },
  {
    name: 'Medium Leather (Couro Médio)',
    category: 'Leather',
    dr: '2*',
    baseDr: 2,
    drModifiers: [],
    description: 'Couro tradicional curtido flexível (RD 2*).',
    location: 'all',
  },
  {
    name: 'Cloth, Padded / Light Leather',
    category: 'Cloth/Leather',
    dr: '1*',
    baseDr: 1,
    drModifiers: [],
    description: 'Tecido acolchoado ou couro leve (RD 1*).',
    location: 'all',
  },
  {
    name: 'Heavy Scale (Escamas Pesadas)',
    category: 'Scale',
    dr: '5',
    baseDr: 5,
    drModifiers: [{ drModifier: -1, modifierDamageType: 'contusao' }],
    description: 'Escamas metálicas pesadas (RD 5). -1 vs contusão.',
    location: 'all',
  },
  {
    name: 'Medium Scale (Escamas Médias)',
    category: 'Scale',
    dr: '4',
    baseDr: 4,
    drModifiers: [{ drModifier: -1, modifierDamageType: 'contusao' }],
    description: 'Escamas metálicas médias (RD 4). -1 vs contusão.',
    location: 'all',
  },
  {
    name: 'Light Scale (Escamas Leves)',
    category: 'Scale',
    dr: '3',
    baseDr: 3,
    drModifiers: [{ drModifier: -1, modifierDamageType: 'contusao' }],
    description: 'Escamas metálicas leves (RD 3). -1 vs contusão.',
    location: 'all',
  },
  {
    name: 'Brigandine, Medium (Brigantina Média)',
    category: 'Brigandine',
    dr: '5',
    baseDr: 5,
    drModifiers: [],
    description: 'Placas de aço rebitadas sob tecido ou couro (RD 5).',
    location: 'all',
  },
  {
    name: 'Brigandine, Light (Brigantina Leve)',
    category: 'Brigandine',
    dr: '3',
    baseDr: 3,
    drModifiers: [],
    description: 'Brigantina leve (RD 3).',
    location: 'all',
  },
];

export interface ParsedArmorModifier {
  drModifier: number;
  modifierDamageType: string;
}

export interface ParsedArmorDR {
  baseDr: number;
  rawDr: string;
  drModifiers: ParsedArmorModifier[];
  summary: string;
}

let cachedCatalog: ArmorCatalogItem[] | null = null;
let catalogLoadingPromise: Promise<ArmorCatalogItem[]> | null = null;

export async function loadArmorCatalog(): Promise<ArmorCatalogItem[]> {
  if (cachedCatalog && cachedCatalog.length > 0) {
    return cachedCatalog;
  }

  const coreItems: ArmorCatalogItem[] = GURPS_CORE_ARMOR_TYPES.map((t, idx) => ({
    id: `core-armor-${idx}`,
    name: t.name,
    category: t.category,
    location: 'all',
    dr: t.dr,
    type: 'Armor',
    notes: t.description,
    book: 'GURPS Low-Tech',
    page: 'p. 100',
  }));

  if (!catalogLoadingPromise) {
    catalogLoadingPromise = (async () => {
      try {
        const res = await fetch('dados/armaduras.json');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            // Remove duplicados exatos e junta com tipos essenciais no topo
            const jsonWithoutShields = data.filter((x) => x.type !== 'Shield');
            cachedCatalog = [...coreItems, ...jsonWithoutShields];
            return cachedCatalog;
          }
        }
      } catch (e) {
        try {
          const res2 = await fetch('/dados/armaduras.json');
          if (res2.ok) {
            const data2 = await res2.json();
            if (Array.isArray(data2) && data2.length > 0) {
              const jsonWithoutShields = data2.filter((x) => x.type !== 'Shield');
              cachedCatalog = [...coreItems, ...jsonWithoutShields];
              return cachedCatalog;
            }
          }
        } catch (e2) {}
      }

      cachedCatalog = coreItems;
      return cachedCatalog;
    })();
  }

  return catalogLoadingPromise;
}

/**
 * Converte notas de dano para o padrão do sistema:
 * 'contusao', 'corte', 'empalamento', 'perfurante', 'queima'
 */
function normalizeDamageType(dt: string): string {
  const lower = dt.toLowerCase().trim();
  if (lower.includes('crush') || lower.includes('contus')) return 'contusao';
  if (lower.includes('cut') || lower.includes('corte')) return 'corte';
  if (lower.includes('impal') || lower.includes('empal')) return 'empalamento';
  if (lower.includes('pierc') || lower.includes('perfur')) return 'perfurante';
  if (lower.includes('burn') || lower.includes('queim') || lower.includes('fire') || lower.includes('fogo')) return 'queima';
  return '';
}

/**
 * Interpreta campos dr, notes e footnotes da armadura e extrai RD Base e modificadores
 */
export function parseArmorDr(armor: {
  dr?: string;
  notes?: string;
  footnotes?: string;
  name?: string;
}): ParsedArmorDR {
  const drStr = String(armor.dr || '0').trim();
  const notes = String(armor.notes || '');
  const footnotes = String(armor.footnotes || '');
  const combinedNotes = `${notes} ${footnotes}`.toLowerCase();

  let baseDr = 0;
  const drModifiers: ParsedArmorModifier[] = [];

  // 1. Split DR com barra (ex: "4/2*", "5/3*", "12/5*", "5/2", "70/50")
  const slashMatch = drStr.match(/^(\+?\d+)\s*\/\s*(\d+)/);
  if (slashMatch) {
    const high = parseInt(slashMatch[1].replace('+', ''), 10) || 0;
    const low = parseInt(slashMatch[2], 10) || 0;

    if (
      combinedNotes.includes('against piercing and cutting') ||
      (combinedNotes.includes('piercing') && combinedNotes.includes('cutting') && combinedNotes.includes('split dr'))
    ) {
      // Frag vest / ballistic: RD maior contra corte e perfuração, menor contra o resto
      baseDr = low;
      const bonus = high - low;
      drModifiers.push({ drModifier: bonus, modifierDamageType: 'corte' });
      drModifiers.push({ drModifier: bonus, modifierDamageType: 'perfurante' });
    } else if (
      combinedNotes.includes('underside of the foot') ||
      combinedNotes.includes('strikes the torso') ||
      combinedNotes.includes('skull (if headgear)')
    ) {
      // botas reforçadas / parciais (ex: 5 na sola / 2 no resto)
      baseDr = low;
      drModifiers.push({ drModifier: high - low, modifierDamageType: 'contusao' });
    } else {
      // Padrão GURPS: cota de malha e escamas (RD menor contra contusão)
      baseDr = high;
      const penalty = low - high; // ex: 2 - 4 = -2
      drModifiers.push({ drModifier: penalty, modifierDamageType: 'contusao' });
    }
  } else {
    // 2. RD Padrão simples (ex: "2*", "4F", "+20", "3", "0")
    const numMatch = drStr.match(/(\d+)/);
    if (numMatch) {
      baseDr = parseInt(numMatch[1], 10) || 0;
    }

    // Procura por regras como "-1 DR vs. impaling", "-1 DR vs. crushing", "-2 DR vs. crushing"
    const modRegex = /([+-]?\d+)\s*dr\s*vs\.?\s*([a-z]+)/gi;
    let match: RegExpExecArray | null;
    while ((match = modRegex.exec(combinedNotes)) !== null) {
      const val = parseInt(match[1], 10);
      const dType = normalizeDamageType(match[2]);
      if (dType && !isNaN(val)) {
        drModifiers.push({ drModifier: val, modifierDamageType: dType });
      }
    }

    // Regra "applies only against burning or corrosion" (ex: NBC Suit)
    if (combinedNotes.includes('burning or corrosion') && drModifiers.length === 0 && baseDr > 0) {
      drModifiers.push({ drModifier: baseDr, modifierDamageType: 'queima' });
      baseDr = 0;
    }
  }

  // Gera resumo legível
  let summary = `RD Base: ${baseDr}`;
  if (drModifiers.length > 0) {
    const modDescs = drModifiers.map((m) => {
      const sign = m.drModifier > 0 ? `+${m.drModifier}` : `${m.drModifier}`;
      const label =
        m.modifierDamageType === 'contusao'
          ? 'Contusão'
          : m.modifierDamageType === 'corte'
          ? 'Corte'
          : m.modifierDamageType === 'empalamento'
          ? 'Empalamento'
          : m.modifierDamageType === 'perfurante'
          ? 'Perfurante'
          : m.modifierDamageType === 'queima'
          ? 'Queimadura'
          : m.modifierDamageType;
      return `${sign} vs ${label}`;
    });
    summary += ` (${modDescs.join(', ')})`;
  }

  return {
    baseDr,
    rawDr: drStr,
    drModifiers,
    summary,
  };
}

/**
 * Determina se uma armadura cobre ou serve para uma determinada parte do corpo
 */
export function doesArmorFitLocation(armorLocStr?: string, bodyPartLoc?: string): boolean {
  if (!bodyPartLoc) return true;
  if (!armorLocStr) return true;

  const aLoc = armorLocStr.toLowerCase().trim();
  const bLoc = bodyPartLoc.toLowerCase().trim();

  // 'all', 'any', Full Suit e Body, Limbs cobrem tudo
  if (aLoc === 'all' || aLoc === 'any' || aLoc === 'todos' || aLoc === 'todas') return true;
  if (aLoc.includes('full suit') || aLoc.includes('full barding')) return true;
  if (aLoc.includes('body, limbs')) {
    return !bLoc.includes('eye') && !bLoc.includes('head') && !bLoc.includes('face');
  }

  // Cabeça e Face
  if (bLoc.includes('head') || bLoc.includes('cabeça') || bLoc.includes('cabeca')) {
    return aLoc.includes('skull') || aLoc.includes('head') || aLoc.includes('helmet');
  }
  if (bLoc.includes('eye') || bLoc.includes('olho')) {
    return aLoc.includes('eyes') || aLoc.includes('visor') || aLoc.includes('face') || aLoc.includes('mask');
  }
  if (bLoc.includes('face') || bLoc.includes('rosto')) {
    return aLoc.includes('face') || aLoc.includes('mask') || aLoc.includes('helmet') || aLoc.includes('head');
  }
  if (bLoc.includes('neck') || bLoc.includes('pescoço') || bLoc.includes('pescoco')) {
    return aLoc.includes('neck') || aLoc.includes('coif') || aLoc.includes('greathelm');
  }

  // Tronco, Virilha, Vitais
  if (bLoc.includes('torso') || bLoc.includes('tronco')) {
    return aLoc.includes('torso') || aLoc.includes('vest') || aLoc.includes('breastplate') || aLoc.includes('corselet');
  }
  if (bLoc.includes('vitals') || bLoc.includes('vitais')) {
    return aLoc.includes('torso') || aLoc.includes('vest') || aLoc.includes('breastplate') || aLoc.includes('corselet');
  }
  if (bLoc.includes('groin') || bLoc.includes('virilha')) {
    return aLoc.includes('groin') || aLoc.includes('loincloth') || aLoc.includes('skirt') || aLoc.includes('pants');
  }

  // Braços e Antebraços
  if (bLoc.includes('forearm') || bLoc.includes('antebraço') || bLoc.includes('antebraco')) {
    return aLoc.includes('arms') || aLoc.includes('sleeves') || aLoc.includes('armbands') || aLoc.includes('bracers');
  }
  if (bLoc.includes('arm') || bLoc.includes('braço') || bLoc.includes('braco')) {
    return aLoc.includes('arms') || aLoc.includes('sleeves') || aLoc.includes('jacket');
  }

  // Mãos
  if (bLoc.includes('hand') || bLoc.includes('mão') || bLoc.includes('mao')) {
    return aLoc.includes('hands') || aLoc.includes('gloves') || aLoc.includes('gauntlets');
  }

  // Pernas e Canelas
  if (bLoc.includes('shin') || bLoc.includes('canela')) {
    return aLoc.includes('legs') || aLoc.includes('greaves') || aLoc.includes('leggings') || aLoc.includes('pants');
  }
  if (bLoc.includes('leg') || bLoc.includes('perna')) {
    return aLoc.includes('legs') || aLoc.includes('greaves') || aLoc.includes('leggings') || aLoc.includes('pants');
  }

  // Pés
  if (bLoc.includes('foot') || bLoc.includes('feet') || bLoc.includes('pé') || bLoc.includes('pe')) {
    return aLoc.includes('feet') || aLoc.includes('boots') || aLoc.includes('shoes') || aLoc.includes('sollerets') || aLoc.includes('sandals');
  }

  return false;
}

/**
 * Retorna as partes do corpo que esta armadura cobre, baseado na lista completa de partes
 */
export function getCoveredLocationsForArmor(
  armorLocStr?: string,
  allLocations: Array<{ location: string }> = []
): string[] {
  if (!armorLocStr || allLocations.length === 0) return [];
  return allLocations
    .filter((loc) => doesArmorFitLocation(armorLocStr, loc.location))
    .map((loc) => loc.location);
}

