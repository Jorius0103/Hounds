export type GridType = 'hex' | 'square';

export type FacingDirection = 0 | 1 | 2 | 3 | 4 | 5; // 6 hex directions (0 = Top/N, 1 = NE, 2 = SE, 3 = S, 4 = SW, 5 = NW)

export type TacticalLayer = 'map' | 'tokens' | 'gm'; // 3 Níveis: Mapa (base), Tokens (jogo), GM (mestre)
export type TacticalViewMode = 'gm' | 'player'; // Visão do Mestre ou Visão dos Jogadores
export type TacticalFogMode = 'open' | 'hidden' | 'dynamic'; // 3 Níveis de Revelação: 'open' (Tudo Aberto) | 'hidden' (Tudo Oculto) | 'dynamic' (Modo Iluminação)

export interface TacticalToken {
  id: string;
  npcId: string;
  gridX: number; // Coluna ou coordenada axial Q
  gridY: number; // Linha ou coordenada axial R
  facing: FacingDirection; // Direção de frente (0 a 5 no hexágono)
  rotation?: number; // Rotação livre em graus (0 a 360) como no Roll20
  elevation: number; // Altura em jardas/metros (0 = solo)
  reach: number; // Alcance da arma atual em jardas (padrão 1)
  size: number; // Tamanho em hexes (1 = 1 hex, 2 = criatura grande)
  color?: string; // Cor do anel
  isPinned?: boolean; // Travar movimento
  hiddenFromPlayers?: boolean; // Visível apenas para o mestre
  layer?: TacticalLayer; // 'tokens' ou 'gm'
  notes?: string;
  movedThisTurn?: number; // Hexes percorridos nesta rodada
  emitsLight?: boolean; // Se o token emite luz própria (tocha, lanterna)
  lightRadius?: number; // Raio de iluminação em hexes/jardas (padrão 4 para tocha)
  lightColor?: string; // Cor do brilho (ex: '#f59e0b' âmbar, '#38bdf8' mágico)
}

export interface TacticalLightSource {
  id: string;
  gridX: number; // Coluna no grid
  gridY: number; // Linha no grid
  x?: number; // Posição exata em pixels X relativa ao mapa (permite encostar perfeitamente na parede)
  y?: number; // Posição exata em pixels Y relativa ao mapa
  radius: number; // Raio em hexes/jardas (ex: 4 = tocha, 7 = lanterna, 10 = fogueira)
  color?: string; // Cor hex (padrão '#f59e0b')
  intensity?: number; // 0.2 a 1.0 (brilho)
  label?: string; // Nome ex: 'Tocha', 'Fogueira', 'Poste de Luz'
  active: boolean; // Se está acesa
  angle?: number; // Ângulo de abertura do foco (360, 180, 90 graus)
  rotation?: number; // Ângulo de rotação em graus (0 = Direita/Leste, 90 = Baixo/Sul, 180 = Esquerda/Oeste, 270 = Cima/Norte)
}

export type TacticalBackgroundKey =
  | 'tavern'
  | 'dungeon'
  | 'forest'
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

export interface TacticalFogRect {
  id?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  mode?: 'reveal' | 'hide';
}

export interface TacticalTerrainCell {
  x: number;
  y: number;
  type: 'difficult' | 'wall' | 'cover-half' | 'cover-full' | 'hazard' | 'water';
  color?: string;
}

export interface TacticalMarker {
  id: string;
  type: 'point' | 'blast' | 'cone' | 'line' | 'text' | 'ruler';
  startX: number;
  startY: number;
  endX?: number;
  endY?: number;
  radius?: number; // em jardas/hexes
  color: string;
  label?: string;
  layer?: TacticalLayer;
  authorName?: string;
}

export type TacticalPropType =
  | 'table-round'
  | 'table-rect'
  | 'table-long'
  | 'chair'
  | 'barrel'
  | 'crate'
  | 'chest'
  | 'pillar'
  | 'campfire'
  | 'tree'
  | 'rock'
  | 'door-wood'
  | 'door-iron'
  | 'bed'
  | 'rug'
  | 'bar-counter'
  | 'custom';

export interface TacticalProp {
  id: string;
  name: string;
  type: TacticalPropType;
  imageUrl?: string; // Para PNGs e uploads personalizados
  x: number; // Coordenada X no mapa (px)
  y: number; // Coordenada Y no mapa (px)
  width: number; // Largura em px
  height: number; // Altura em px
  rotation: number; // Rotação em graus (0-360)
  locked?: boolean; // Travar para não mover acidentalmente
  layer?: TacticalLayer; // 'map' | 'tokens' | 'gm'
  opacity?: number;
}

export interface TacticalWallPoint {
  x: number; // Pixel X relativo à imagem do mapa
  y: number; // Pixel Y relativo à imagem do mapa
}

export interface TacticalWall {
  id: string;
  points: TacticalWallPoint[]; // Seqüência de vértices do polígono / polilinha
  closed?: boolean; // Se o polígono é fechado conectando o último ponto ao primeiro
  color?: string; // Cor do traço visual
  thickness?: number; // Espessura do traço
}

export interface TacticalDoor {
  id: string;
  x1: number; // Ponto inicial X
  y1: number; // Ponto inicial Y
  x2: number; // Ponto final X
  y2: number; // Ponto final Y
  isOpen: boolean; // Se a porta está aberta (luz passa) ou fechada (bloqueia luz)
  name?: string; // Nome ou rótulo da porta
  color?: string;
}

export interface TacticalState {
  backgroundKey: TacticalBackgroundKey;
  customImageUrl?: string;
  // Escalonamento e posicionamento da imagem base do mapa (Camada do Mapa)
  mapImageX?: number; // Deslocamento X da imagem de fundo
  mapImageY?: number; // Deslocamento Y da imagem de fundo
  mapImageWidth?: number; // Largura customizada da imagem de fundo (px)
  mapImageHeight?: number; // Altura customizada da imagem de fundo (px)
  mapImageScale?: number; // Escala proporcional (mantido para compatibilidade)
  mapImageLocked?: boolean; // Travar imagem de fundo para não ser movida por acidente
  // Níveis e Visão (Roll20 Style)
  activeLayer?: TacticalLayer; // 'map' | 'tokens' | 'gm'
  viewMode?: TacticalViewMode; // 'gm' (Visão do Mestre) | 'player' (Visão dos Jogadores)
  gridType: GridType;
  hexSize: number; // raio do hex em pixels (padrão 38)
  gridCols: number;
  gridRows: number;
  gridColor: string;
  gridOpacity: number;
  scalePerCell: number; // 1 hex = 1 jarda
  scaleUnit: 'yd' | 'm';
  fogEnabled: boolean;
  fogMode?: TacticalFogMode; // 'open' (Tudo Aberto) | 'hidden' (Tudo Oculto) | 'dynamic' (Modo Iluminação)
  fogRevealedCells: string[]; // "col,row" (retrocompatibilidade)
  fogRects?: TacticalFogRect[]; // Áreas retangulares reveladas ou ocultas em linhas retas
  lights?: TacticalLightSource[]; // Focos de luz fixos no mapa
  walls?: TacticalWall[]; // Paredes poligonais para contenção de luminosidade
  doors?: TacticalDoor[]; // Portas (abertas/fechadas) para contenção de luminosidade
  tokens: TacticalToken[];
  props?: TacticalProp[]; // Elementos do cenário / mobília (mesas de taverna, baús, etc.)
  terrainCells: TacticalTerrainCell[];
  markers: TacticalMarker[];
  zoom?: number;
  panX?: number;
  panY?: number;
}

export const DEFAULT_TACTICAL_STATE: TacticalState = {
  backgroundKey: 'tavern',
  customImageUrl: '',
  mapImageX: 0,
  mapImageY: 0,
  mapImageWidth: 2000,
  mapImageHeight: 1400,
  mapImageScale: 1,
  mapImageLocked: false,
  activeLayer: 'tokens',
  gridType: 'hex',
  hexSize: 38,
  gridCols: 32,
  gridRows: 24,
  gridColor: '#cbd5e1',
  gridOpacity: 0.28,
  scalePerCell: 1,
  scaleUnit: 'yd',
  fogEnabled: false,
  fogMode: 'open',
  fogRevealedCells: [],
  fogRects: [],
  lights: [],
  walls: [],
  doors: [],
  tokens: [],
  props: [],
  terrainCells: [],
  markers: [],
  zoom: 1,
  panX: 36,
  panY: 36,
};

export const TACTICAL_MAP_PRESETS: TacticalMapPreset[] = [
  {
    key: 'tavern',
    name: 'Taberna / Salão de Madeira',
    description: 'Taberna rústica ilustrada com assoalho nobre, lareira de pedra e balcão',
    themeColor: '#713f12',
  },
  {
    key: 'dungeon',
    name: 'Masmorra de Pedra',
    description: 'Masmorra ilustrada com lajes esculpidas, colunas, tocheiros e grades',
    themeColor: '#334155',
  },
  {
    key: 'forest',
    name: 'Floresta / Clareira Sombria',
    description: 'Clareira ilustrada com grama, trilha de terra batida, rochedos e árvores',
    themeColor: '#14532d',
  },
  {
    key: 'arena',
    name: 'Arena de Areia / Coliseu',
    description: 'Arena ilustrada com círculo de combate, areia batida e muros de pedra',
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
    description: 'Faça upload de imagem do computador ou cole URL de mapa',
    themeColor: '#6366f1',
  },
];
