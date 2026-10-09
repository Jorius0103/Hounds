export type GridType = 'hex' | 'square';

export type FacingDirection = 0 | 1 | 2 | 3 | 4 | 5; // 6 hex directions (0 = Top/N, 1 = NE, 2 = SE, 3 = S, 4 = SW, 5 = NW)

export interface TacticalToken {
  id: string;
  npcId: string;
  gridX: number; // Coluna ou coordenada axial Q
  gridY: number; // Linha ou coordenada axial R
  facing: FacingDirection; // Direção de frente (0 a 5 no hexágono)
  elevation: number; // Altura em jardas/metros (0 = solo)
  reach: number; // Alcance da arma atual em jardas (padrão 1)
  size: number; // Tamanho em hexes (1 = 1 hex, 2 = criatura grande)
  color?: string; // Cor do anel
  isPinned?: boolean; // Travar movimento
  hiddenFromPlayers?: boolean; // Visível apenas para o mestre
  notes?: string;
  movedThisTurn?: number; // Hexes percorridos nesta rodada
}

export type TacticalBackgroundKey =
  | 'ludgrim'
  | 'tagmar'
  | 'dungeon'
  | 'forest'
  | 'tavern'
  | 'arena'
  | 'dark'
  | 'custom';

export interface TacticalMapPreset {
  key: TacticalBackgroundKey;
  name: string;
  description: string;
  url?: string;
  themeColor: string;
}

export interface TacticalTerrainCell {
  x: number;
  y: number;
  type: 'difficult' | 'wall' | 'cover-half' | 'cover-full' | 'hazard' | 'water';
  color?: string;
}

export interface TacticalMarker {
  id: string;
  type: 'point' | 'blast' | 'cone' | 'line' | 'text';
  startX: number;
  startY: number;
  endX?: number;
  endY?: number;
  radius?: number; // em jardas/hexes
  color: string;
  label?: string;
}

export interface TacticalState {
  backgroundKey: TacticalBackgroundKey;
  customImageUrl?: string;
  gridType: GridType;
  hexSize: number; // raio do hex em pixels (padrão 38)
  gridCols: number;
  gridRows: number;
  gridColor: string;
  gridOpacity: number;
  scalePerCell: number; // 1 hex = 1 jarda
  scaleUnit: 'yd' | 'm';
  fogEnabled: boolean;
  fogRevealedCells: string[]; // "q,r"
  tokens: TacticalToken[];
  terrainCells: TacticalTerrainCell[];
  markers: TacticalMarker[];
  zoom: number;
  panX: number;
  panY: number;
}

export const DEFAULT_TACTICAL_STATE: TacticalState = {
  backgroundKey: 'ludgrim',
  customImageUrl: '',
  gridType: 'hex',
  hexSize: 38,
  gridCols: 32,
  gridRows: 24,
  gridColor: '#cbd5e1',
  gridOpacity: 0.28,
  scalePerCell: 1,
  scaleUnit: 'yd',
  fogEnabled: false,
  fogRevealedCells: [],
  tokens: [],
  terrainCells: [],
  markers: [],
  zoom: 1,
  panX: 40,
  panY: 40,
};

export const TACTICAL_MAP_PRESETS: TacticalMapPreset[] = [
  {
    key: 'ludgrim',
    name: 'Ludgrim (Mapa da Campanha)',
    description: 'Mapa oficial de Ludgrim exportado da campanha The Hounds',
    url: '/campaign_assets/ludgrim.jpg',
    themeColor: '#78350f',
  },
  {
    key: 'tagmar',
    name: 'Tagmar (Região Hounds)',
    description: 'Mapa regional detalhado de Tagmar da campanha',
    url: '/campaign_assets/tagmar.jpg',
    themeColor: '#1e3a8a',
  },
  {
    key: 'dungeon',
    name: 'Masmorra de Pedra',
    description: 'Pisos de pedra cinzenta esculpida para masmorras e ruínas',
    themeColor: '#334155',
  },
  {
    key: 'forest',
    name: 'Floresta / Clareira Sombria',
    description: 'Vegetação densa, musgo e terra batida para emboscadas florestais',
    themeColor: '#14532d',
  },
  {
    key: 'tavern',
    name: 'Taberna / Salão de Madeira',
    description: 'Assoalho de tábuas de madeira nobre para brigas de taverna',
    themeColor: '#713f12',
  },
  {
    key: 'arena',
    name: 'Arena de Areia / Coliseu',
    description: 'Chão de areia e sangue seco com demarcações de combate tático',
    themeColor: '#854d0e',
  },
  {
    key: 'dark',
    name: 'Grade Tática Minimalista',
    description: 'Fundo preto fosco de alta visibilidade e foco tático puro',
    themeColor: '#090d16',
  },
  {
    key: 'custom',
    name: 'Imagem Personalizada (Upload/URL)',
    description: 'Insira qualquer imagem ou URL de mapa de batalha',
    themeColor: '#6366f1',
  },
];
