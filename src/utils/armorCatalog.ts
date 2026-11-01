export interface ArmorCatalogItem {
  id: string;
  name: string;
  tl?: string;
  type?: string;
  table?: string;
  category?: string;
  materialCategory?: 'tecido' | 'couro' | 'malha' | 'plate' | 'escamas' | 'outros';
  materialCategories?: ('tecido' | 'couro' | 'malha' | 'plate' | 'escamas' | 'outros')[];
  location?: string;
  dr: string;
  drModifiers?: { drModifier: number; modifierDamageType: string }[];
  cost?: string;
  weight?: string;
  lc?: string;
  notes?: string;
  footnotes?: string;
  book?: string;
  page?: string;
  don?: string;
  isPriority?: boolean;
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

/**
 * Armaduras de Tronco Oficiais do GURPS Low-Tech (Tabela de Defesas - NT 0 a 4)
 * Exibidas com prioridade no topo da lista.
 */
export const LOW_TECH_TRUNK_ARMORS: ArmorCatalogItem[] = [
  {
    id: 'lt-cana',
    name: 'Cana',
    tl: '0',
    dr: '1',
    cost: '$35',
    weight: '6 kg',
    don: '30s',
    category: 'Tecido / Vegetal',
    materialCategory: 'tecido',
    materialCategories: ['tecido', 'outros'],
    location: 'Tronco / Qualquer',
    table: 'Defesas - Armadura de Tronco',
    book: 'GURPS Low-Tech',
    page: 'p. 100',
    notes: '[1] Trançado de cana / bambu, suscetível ao fogo.',
    isPriority: true,
  },
  {
    id: 'lt-tecido-acolchoado',
    name: 'Tecido Acolchoado',
    tl: '0',
    dr: '1*',
    cost: '$50',
    weight: '3 kg',
    don: '15s',
    category: 'Tecido',
    materialCategory: 'tecido',
    materialCategories: ['tecido'],
    location: 'Tronco / Qualquer',
    table: 'Defesas - Armadura de Tronco',
    book: 'GURPS Low-Tech',
    page: 'p. 100',
    notes: 'Flexível (*). Roupa acolchoada ou gambeson leve.',
    isPriority: true,
  },
  {
    id: 'lt-chifre',
    name: 'Chifre',
    tl: '0',
    dr: '3',
    cost: '$250',
    weight: '12,5 kg',
    don: '30s',
    category: 'Outros',
    materialCategory: 'outros',
    materialCategories: ['outros'],
    location: 'Tronco / Qualquer',
    table: 'Defesas - Armadura de Tronco',
    book: 'GURPS Low-Tech',
    page: 'p. 100',
    notes: 'Placas rígidas de chifre animal polido.',
    isPriority: true,
  },
  {
    id: 'lt-tecido-camadas-leve',
    name: 'Tecido em Camadas Leve',
    tl: '0',
    dr: '2*',
    cost: '$150',
    weight: '6 kg',
    don: '20s',
    category: 'Tecido',
    materialCategory: 'tecido',
    materialCategories: ['tecido'],
    location: 'Tronco / Qualquer',
    table: 'Defesas - Armadura de Tronco',
    book: 'GURPS Low-Tech',
    page: 'p. 100',
    notes: 'Flexível (*). Tecido em múltiplas camadas leves.',
    isPriority: true,
  },
  {
    id: 'lt-tecido-camadas-medio',
    name: 'Tecido em Camadas Médio',
    tl: '0',
    dr: '3',
    cost: '$350',
    weight: '10 kg',
    don: '30s',
    category: 'Tecido',
    materialCategory: 'tecido',
    materialCategories: ['tecido'],
    location: 'Tronco / Qualquer',
    table: 'Defesas - Armadura de Tronco',
    book: 'GURPS Low-Tech',
    page: 'p. 100',
    notes: 'Camadas densas costuradas de linho/algodão (estilo Linothorax).',
    isPriority: true,
  },
  {
    id: 'lt-tecido-camadas-pesado',
    name: 'Tecido em Camadas Pesado',
    tl: '0',
    dr: '4',
    cost: '$600',
    weight: '14 kg',
    don: '30s',
    category: 'Tecido',
    materialCategory: 'tecido',
    materialCategories: ['tecido'],
    location: 'Tronco / Qualquer',
    table: 'Defesas - Armadura de Tronco',
    book: 'GURPS Low-Tech',
    page: 'p. 100',
    notes: 'Linothorax pesado reforçado de alta espessura.',
    isPriority: true,
  },
  {
    id: 'lt-couro-medio',
    name: 'Couro Médio',
    tl: '0',
    dr: '2*',
    cost: '$100',
    weight: '6 kg',
    don: '30s',
    category: 'Couro',
    materialCategory: 'couro',
    materialCategories: ['couro'],
    location: 'Tronco / Qualquer',
    table: 'Defesas - Armadura de Tronco',
    book: 'GURPS Low-Tech',
    page: 'p. 100',
    notes: '[2] Flexível (*). Couro curtido tradicional resistente.',
    isPriority: true,
  },
  {
    id: 'lt-couro-pesado',
    name: 'Couro Pesado',
    tl: '0',
    dr: '3',
    cost: '$200',
    weight: '10 kg',
    don: '30s',
    category: 'Couro',
    materialCategory: 'couro',
    materialCategories: ['couro'],
    location: 'Tronco / Qualquer',
    table: 'Defesas - Armadura de Tronco',
    book: 'GURPS Low-Tech',
    page: 'p. 100',
    notes: '[2] Couro bovino grosso e denso.',
    isPriority: true,
  },
  {
    id: 'lt-palha',
    name: 'Palha',
    tl: '0',
    dr: '2',
    cost: '$50',
    weight: '10 kg',
    don: '30s',
    category: 'Outros',
    materialCategory: 'outros',
    materialCategories: ['tecido', 'outros'],
    location: 'Tronco / Qualquer',
    table: 'Defesas - Armadura de Tronco',
    book: 'GURPS Low-Tech',
    page: 'p. 100',
    notes: '[1] Palha densamente trançada, suscetível ao fogo.',
    isPriority: true,
  },
  {
    id: 'lt-madeira',
    name: 'Madeira',
    tl: '0',
    dr: '3',
    cost: '$100',
    weight: '15 kg',
    don: '30s',
    category: 'Outros',
    materialCategory: 'outros',
    materialCategories: ['outros'],
    location: 'Tronco / Qualquer',
    table: 'Defesas - Armadura de Tronco',
    book: 'GURPS Low-Tech',
    page: 'p. 100',
    notes: '[3] Tábuas ou ripas de madeira sólida esculpidas.',
    isPriority: true,
  },
  {
    id: 'lt-couro-camadas-leve',
    name: 'Couro em Camadas Leve',
    tl: '1',
    dr: '2*',
    cost: '$120',
    weight: '7,5 kg',
    don: '20s',
    category: 'Couro',
    materialCategory: 'couro',
    materialCategories: ['couro'],
    location: 'Tronco / Qualquer',
    table: 'Defesas - Armadura de Tronco',
    book: 'GURPS Low-Tech',
    page: 'p. 100',
    notes: 'Flexível (*). Camadas finas de couro costuradas.',
    isPriority: true,
  },
  {
    id: 'lt-couro-camadas-medio',
    name: 'Couro em Camadas Médio',
    tl: '1',
    dr: '3',
    cost: '$220',
    weight: '13 kg',
    don: '30s',
    category: 'Couro',
    materialCategory: 'couro',
    materialCategories: ['couro'],
    location: 'Tronco / Qualquer',
    table: 'Defesas - Armadura de Tronco',
    book: 'GURPS Low-Tech',
    page: 'p. 100',
    notes: 'Camadas de couro curtido laminadas.',
    isPriority: true,
  },
  {
    id: 'lt-couro-camadas-pesado',
    name: 'Couro em Camadas Pesado',
    tl: '1',
    dr: '4',
    cost: '$525',
    weight: '17,5 kg',
    don: '30s',
    category: 'Couro',
    materialCategory: 'couro',
    materialCategories: ['couro'],
    location: 'Tronco / Qualquer',
    table: 'Defesas - Armadura de Tronco',
    book: 'GURPS Low-Tech',
    page: 'p. 100',
    notes: 'Múltiplas camadas densas de couro reforçado.',
    isPriority: true,
  },
  {
    id: 'lt-escamas-leve',
    name: 'Escamas Leve',
    tl: '1',
    dr: '3',
    drModifiers: [{ drModifier: -1, modifierDamageType: 'contusao' }],
    cost: '$320',
    weight: '8 kg',
    don: '30s',
    category: 'Escamas',
    materialCategory: 'escamas',
    materialCategories: ['escamas'],
    location: 'Tronco / Qualquer',
    table: 'Defesas - Armadura de Tronco',
    book: 'GURPS Low-Tech',
    page: 'p. 100',
    notes: '[4] Escamas metálicas leves. -1 RD vs contusão (-1 DR vs. crushing).',
    isPriority: true,
  },
  {
    id: 'lt-escamas-media',
    name: 'Escamas Média',
    tl: '1',
    dr: '4',
    drModifiers: [{ drModifier: -1, modifierDamageType: 'contusao' }],
    cost: '$550',
    weight: '14 kg',
    don: '30s',
    category: 'Escamas',
    materialCategory: 'escamas',
    materialCategories: ['escamas'],
    location: 'Tronco / Qualquer',
    table: 'Defesas - Armadura de Tronco',
    book: 'GURPS Low-Tech',
    page: 'p. 100',
    notes: '[4] Escamas metálicas médias. -1 RD vs contusão (-1 DR vs. crushing).',
    isPriority: true,
  },
  {
    id: 'lt-escamas-pesada',
    name: 'Escamas Pesada',
    tl: '1',
    dr: '5',
    cost: '$1.100',
    weight: '20 kg',
    don: '30s',
    category: 'Escamas',
    materialCategory: 'escamas',
    materialCategories: ['escamas'],
    location: 'Tronco / Qualquer',
    table: 'Defesas - Armadura de Tronco',
    book: 'GURPS Low-Tech',
    page: 'p. 100',
    notes: 'Escamas de bronze ou ferro pesadas sobrepostas.',
    isPriority: true,
  },
  {
    id: 'lt-couro-endurecido-medio',
    name: 'Couro Endurecido Médio',
    tl: '2',
    dr: '2',
    cost: '$125',
    weight: '7,5 kg',
    don: '30s',
    category: 'Couro',
    materialCategory: 'couro',
    materialCategories: ['couro'],
    location: 'Tronco / Qualquer',
    table: 'Defesas - Armadura de Tronco',
    book: 'GURPS Low-Tech',
    page: 'p. 100',
    notes: 'Couro fervido rígido (cuir bouilli).',
    isPriority: true,
  },
  {
    id: 'lt-couro-endurecido-pesado',
    name: 'Couro Endurecido Pesado',
    tl: '2',
    dr: '3',
    cost: '$250',
    weight: '12,5 kg',
    don: '30s',
    category: 'Couro',
    materialCategory: 'couro',
    materialCategories: ['couro'],
    location: 'Tronco / Qualquer',
    table: 'Defesas - Armadura de Tronco',
    book: 'GURPS Low-Tech',
    page: 'p. 100',
    notes: 'Couro endurecido espesso de alta rigidez.',
    isPriority: true,
  },
  {
    id: 'lt-jaquetao-placas',
    name: 'Jaquetão de Placas',
    tl: '2',
    dr: '3',
    drModifiers: [{ drModifier: -1, modifierDamageType: 'contusao' }],
    cost: '$300',
    weight: '9 kg',
    don: '30s',
    category: 'Placas / Plate',
    materialCategory: 'plate',
    materialCategories: ['plate'],
    location: 'Tronco / Qualquer',
    table: 'Defesas - Armadura de Tronco',
    book: 'GURPS Low-Tech',
    page: 'p. 100',
    notes: '[4] Placas metálicas presas sob jaquetão acolchoado. -1 RD vs contusão (-1 DR vs. crushing).',
    isPriority: true,
  },
  {
    id: 'lt-cota-malha-leve',
    name: 'Cota de Malha Leve',
    tl: '2',
    dr: '3*',
    drModifiers: [{ drModifier: -2, modifierDamageType: 'contusao' }],
    cost: '$500',
    weight: '6 kg',
    don: '15s',
    category: 'Malha',
    materialCategory: 'malha',
    materialCategories: ['malha'],
    location: 'Tronco / Qualquer',
    table: 'Defesas - Armadura de Tronco',
    book: 'GURPS Low-Tech',
    page: 'p. 100',
    notes: '[5] Flexível (*). -2 RD vs contusão (-2 DR vs. crushing).',
    isPriority: true,
  },
  {
    id: 'lt-cota-malha-fina',
    name: 'Cota de Malha Fina',
    tl: '2',
    dr: '4*',
    drModifiers: [{ drModifier: -2, modifierDamageType: 'contusao' }],
    cost: '$900',
    weight: '7,5 kg',
    don: '15s',
    category: 'Malha',
    materialCategory: 'malha',
    materialCategories: ['malha'],
    location: 'Tronco / Qualquer',
    table: 'Defesas - Armadura de Tronco',
    book: 'GURPS Low-Tech',
    page: 'p. 100',
    notes: '[5] Flexível (*), elos finos e densos. -2 RD vs contusão (-2 DR vs. crushing).',
    isPriority: true,
  },
  {
    id: 'lt-cota-malha-pesada',
    name: 'Cota de Malha Pesada',
    tl: '2',
    dr: '5*',
    drModifiers: [{ drModifier: -2, modifierDamageType: 'contusao' }],
    cost: '$1.200',
    weight: '9 kg',
    don: '15s',
    category: 'Malha',
    materialCategory: 'malha',
    materialCategories: ['malha'],
    location: 'Tronco / Qualquer',
    table: 'Defesas - Armadura de Tronco',
    book: 'GURPS Low-Tech',
    page: 'p. 100',
    notes: '[5] Flexível (*), elos pesados rebitados. -2 RD vs contusão (-2 DR vs. crushing).',
    isPriority: true,
  },
  {
    id: 'lt-placas-segmentadas-leve',
    name: 'Placas Segmentadas Leve',
    tl: '2',
    dr: '3',
    cost: '$600',
    weight: '8 kg',
    don: '45s',
    category: 'Placas / Plate',
    materialCategory: 'plate',
    materialCategories: ['plate'],
    location: 'Tronco / Qualquer',
    table: 'Defesas - Armadura de Tronco',
    book: 'GURPS Low-Tech',
    page: 'p. 100',
    notes: 'Placas articuladas leves (estilo Lorica Segmentata).',
    isPriority: true,
  },
  {
    id: 'lt-placas-segmentadas-media',
    name: 'Placas Segmentadas Média',
    tl: '2',
    dr: '4',
    cost: '$900',
    weight: '12 kg',
    don: '45s',
    category: 'Placas / Plate',
    materialCategory: 'plate',
    materialCategories: ['plate'],
    location: 'Tronco / Qualquer',
    table: 'Defesas - Armadura de Tronco',
    book: 'GURPS Low-Tech',
    page: 'p. 100',
    notes: 'Placas articuladas médias de aço.',
    isPriority: true,
  },
  {
    id: 'lt-placas-segmentadas-pesada',
    name: 'Placas Segmentadas Pesada',
    tl: '2',
    dr: '5',
    cost: '$1.200',
    weight: '16 kg',
    don: '45s',
    category: 'Placas / Plate',
    materialCategory: 'plate',
    materialCategories: ['plate'],
    location: 'Tronco / Qualquer',
    table: 'Defesas - Armadura de Tronco',
    book: 'GURPS Low-Tech',
    page: 'p. 100',
    notes: 'Placas articuladas pesadas de alta proteção.',
    isPriority: true,
  },
  {
    id: 'lt-cota-malha-placas',
    name: 'Cota de Malha e Placas',
    tl: '3',
    dr: '5',
    drModifiers: [{ drModifier: -1, modifierDamageType: 'contusao' }],
    cost: '$1.000',
    weight: '10 kg',
    don: '20s',
    category: 'Malha / Placas',
    materialCategory: 'malha',
    materialCategories: ['malha', 'plate'],
    location: 'Tronco / Qualquer',
    table: 'Defesas - Armadura de Tronco',
    book: 'GURPS Low-Tech',
    page: 'p. 100',
    notes: '[4] Cota de malha reforçada com placas de aço. -1 RD vs contusão (-1 DR vs. crushing).',
    isPriority: true,
  },
  {
    id: 'lt-cota-malha-justa',
    name: 'Cota de Malha de Justa',
    tl: '3',
    dr: '6',
    cost: '$1.500',
    weight: '15 kg',
    don: '30s',
    category: 'Malha',
    materialCategory: 'malha',
    materialCategories: ['malha'],
    location: 'Tronco / Qualquer',
    table: 'Defesas - Armadura de Tronco',
    book: 'GURPS Low-Tech',
    page: 'p. 100',
    notes: '[6] Cota de malha densíssima e pesada forjada para torneios/justas.',
    isPriority: true,
  },
  {
    id: 'lt-brigantina-leve',
    name: 'Brigantina Leve',
    tl: '4',
    dr: '3',
    cost: '$900',
    weight: '5 kg',
    don: '30s',
    category: 'Placas / Plate',
    materialCategory: 'plate',
    materialCategories: ['plate'],
    location: 'Tronco / Qualquer',
    table: 'Defesas - Armadura de Tronco',
    book: 'GURPS Low-Tech',
    page: 'p. 100',
    notes: 'Placas de aço rebitadas internamente sob tecido resistente.',
    isPriority: true,
  },
  {
    id: 'lt-brigantina-media',
    name: 'Brigantina Média',
    tl: '4',
    dr: '5',
    cost: '$1.800',
    weight: '10 kg',
    don: '30s',
    category: 'Placas / Plate',
    materialCategory: 'plate',
    materialCategories: ['plate'],
    location: 'Tronco / Qualquer',
    table: 'Defesas - Armadura de Tronco',
    book: 'GURPS Low-Tech',
    page: 'p. 100',
    notes: 'Brigantina de aço reforçada multicamadas.',
    isPriority: true,
  },
  {
    id: 'lt-papel-protecao',
    name: 'Papel de Proteção',
    tl: '4',
    dr: '6',
    cost: '$2.000',
    weight: '22,5 kg',
    don: '20s',
    category: 'Tecido / Outros',
    materialCategory: 'outros',
    materialCategories: ['tecido', 'outros'],
    location: 'Tronco / Qualquer',
    table: 'Defesas - Armadura de Tronco',
    book: 'GURPS Low-Tech',
    page: 'p. 100',
    notes: '[1] Papel oriental prensado e laqueado, suscetível ao fogo.',
    isPriority: true,
  },
  {
    id: 'lt-placas-leve',
    name: 'Placas Leve',
    tl: '4',
    dr: '3',
    cost: '$1.000',
    weight: '4 kg',
    don: '45s',
    category: 'Placas / Plate',
    materialCategory: 'plate',
    materialCategories: ['plate'],
    location: 'Tronco / Qualquer',
    table: 'Defesas - Armadura de Tronco',
    book: 'GURPS Low-Tech',
    page: 'p. 100',
    notes: 'Armadura peitoral de placas de aço leve.',
    isPriority: true,
  },
  {
    id: 'lt-placas-media',
    name: 'Placas Média',
    tl: '4',
    dr: '6',
    cost: '$2.500',
    weight: '10 kg',
    don: '45s',
    category: 'Placas / Plate',
    materialCategory: 'plate',
    materialCategories: ['plate'],
    location: 'Tronco / Qualquer',
    table: 'Defesas - Armadura de Tronco',
    book: 'GURPS Low-Tech',
    page: 'p. 100',
    notes: 'Armadura peitoral de placas de aço média clássica.',
    isPriority: true,
  },
  {
    id: 'lt-placas-pesada',
    name: 'Placas Pesada',
    tl: '4',
    dr: '9',
    cost: '$4.000',
    weight: '16 kg',
    don: '45s',
    category: 'Placas / Plate',
    materialCategory: 'plate',
    materialCategories: ['plate'],
    location: 'Tronco / Qualquer',
    table: 'Defesas - Armadura de Tronco',
    book: 'GURPS Low-Tech',
    page: 'p. 100',
    notes: 'Armadura pesada de placas de aço (peitoral e espaldar de cavaleiro).',
    isPriority: true,
  },
];

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

  // 1. Armaduras de Tronco Low-Tech oficiais da tabela (Image 3) sempre têm prioridade máxima no topo
  const priorityItems: ArmorCatalogItem[] = [...LOW_TECH_TRUNK_ARMORS];

  // 2. Presets clássicos GURPS
  const coreItems: ArmorCatalogItem[] = GURPS_CORE_ARMOR_TYPES.map((t, idx) => ({
    id: `core-armor-${idx}`,
    name: t.name,
    category: t.category,
    location: 'all',
    dr: t.dr,
    drModifiers: t.drModifiers,
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
            const jsonWithoutShields = data.filter((x) => x.type !== 'Shield');
            cachedCatalog = [...priorityItems, ...coreItems, ...jsonWithoutShields];
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
              cachedCatalog = [...priorityItems, ...coreItems, ...jsonWithoutShields];
              return cachedCatalog;
            }
          }
        } catch (e2) {}
      }

      cachedCatalog = [...priorityItems, ...coreItems];
      return cachedCatalog;
    })();
  }

  return catalogLoadingPromise;
}

export type ArmorCategoryFilter = 'all' | 'tecido' | 'couro' | 'malha' | 'plate' | 'escamas' | 'outros';

/**
 * Filtra a armadura pelo tipo de material selecionado
 */
export function matchArmorCategory(
  item: ArmorCatalogItem,
  filterCategory: ArmorCategoryFilter
): boolean {
  if (filterCategory === 'all') return true;

  // 1. Se tem categoria explícita pré-definida
  if (item.materialCategories && item.materialCategories.includes(filterCategory)) {
    return true;
  }
  if (item.materialCategory === filterCategory) {
    return true;
  }

  // 2. Extrai das strings de identificação
  const fullText = `${item.name || ''} ${item.category || ''} ${item.notes || ''} ${item.footnotes || ''}`.toLowerCase();

  switch (filterCategory) {
    case 'tecido':
      return /tecido|cloth|padded|quilted|silk|linen|acolchoado|feltro|algod|cana|palha|papel/.test(fullText);
    case 'couro':
      return /couro|leather|hide|rawhide|fur\b|pele|cuir/.test(fullText);
    case 'malha':
      return /malha|mail|chain\b|hauberk|byrnie/.test(fullText);
    case 'plate':
      return /placa|plate|segment|brigand|corselet|breastplate|jaquet|metal|aço|steel|iron|bronze|cuirass|lorica/.test(fullText);
    case 'escamas':
      return /escama|scale|lamellar|laminar/.test(fullText);
    case 'outros':
      return /chifre|horn|madeira|wood|cana|palha|papel|straw|bone|ossos/.test(fullText);
    default:
      return true;
  }
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
  drModifiers?: ParsedArmorModifier[];
}): ParsedArmorDR {
  const drStr = String(armor.dr || '0').trim();
  const notes = String(armor.notes || '');
  const footnotes = String(armor.footnotes || '');
  const combinedNotes = `${notes} ${footnotes}`.toLowerCase();

  let baseDr = 0;
  let drModifiers: ParsedArmorModifier[] = [];

  // Se já possui drModifiers estruturados no próprio item, utiliza diretamente
  if (armor.drModifiers && Array.isArray(armor.drModifiers) && armor.drModifiers.length > 0) {
    drModifiers = [...armor.drModifiers];
    const numMatch = drStr.match(/(\d+)/);
    if (numMatch) {
      baseDr = parseInt(numMatch[1], 10) || 0;
    }
  } else {
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

      // Procura por regras como "-1 DR vs. impaling", "-1 DR vs. crushing", "-2 RD vs contusão"
      const modRegex = /([+-]?\d+)\s*(?:dr|rd)\s*(?:vs\.?|contra)\s*([a-zà-ú]+)/gi;
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

