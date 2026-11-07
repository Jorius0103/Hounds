import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  TacticalState,
  TacticalToken,
  FacingDirection,
  TACTICAL_MAP_PRESETS,
  TacticalLayer,
  TacticalViewMode,
  TacticalMarker,
  TacticalLightSource,
  TacticalProp,
  TacticalFogRect,
  TacticalFogMode,
  TacticalWall,
  TacticalDoor,
} from '../../types/tactical';
import { NPC, UserAccount } from '../../types/rpg';
import { TacticalToolbar, TacticalToolMode } from './TacticalToolbar';
import { TacticalQuickActionPopover } from './TacticalQuickActionPopover';
import { TacticalIllustrativePresets } from './TacticalIllustrativePresets';
import { TacticalPropsRenderer } from './TacticalPropsRenderer';
import { TacticalPropsModal } from './TacticalPropsModal';
import {
  getHexCenter,
  getHexCornerPoints,
  getHexPointsString,
  getCircleSectorPath,
  pixelToHex,
  getHexDistance,
  getHexesInRange,
  getHexLine,
  getGurpsRangePenalty,
  getTargetArcRelationship,
  getFacingAngleDegrees,
  FACING_NAMES,
  HexCoord,
  Point,
  LineSegment,
  extractBlockingSegments,
  computeVisibilityPolygon,
  pointsToSvgPath,
  hasLineOfSight,
} from '../../utils/tacticalMath';
import { getCombatManeuver, COMBAT_MANEUVERS } from '../../utils/gurps';
import { NpcAvatar, PRESET_AVATARS, PRESET_BG_COLORS, resolveNpcPreset } from '../NpcAvatar';
import {
  Ruler,
  Crosshair,
  Shield,
  Eye,
  EyeOff,
  Skull,
  Zap,
  Footprints,
  Heart,
  X,
  Swords,
  Users,
  Search,
  Check,
  CheckCheck,
  Plus,
  Flame,
  Spline,
  DoorClosed,
  DoorOpen,
  RotateCw,
  RotateCcw,
  Lightbulb,
  LightbulbOff,
  Trash2,
} from 'lucide-react';

interface TacticalMapWorkspaceProps {
  tacticalState: TacticalState;
  onUpdateTacticalState: (updated: Partial<TacticalState>) => void;
  characters: NPC[];
  selectedNpcId: string;
  onSelectNpc: (npcId: string) => void;
  onUpdateNpc: (updated: NPC) => void;
  currentUserRole: string;
  onOpenFullNpcSheet: (npcId: string) => void;
  onOpenDamageCalculator?: (npc: NPC) => void;
  hasEditPermission?: boolean;
  onOpenPlayerPermissions?: () => void;
  editorCount?: number;
  users?: UserAccount[];
  editorUserIds?: string[];
  onTogglePlayerPermission?: (userId: string) => void;
  onSetAllPlayerPermissions?: (allow: boolean) => void;
  isLogCollapsed?: boolean;
  onToggleLogCollapse?: () => void;
}

export const TacticalMapWorkspace: React.FC<TacticalMapWorkspaceProps> = ({
  tacticalState,
  onUpdateTacticalState,
  characters,
  selectedNpcId,
  onSelectNpc,
  onUpdateNpc,
  currentUserRole,
  onOpenFullNpcSheet,
  onOpenDamageCalculator,
  hasEditPermission = false,
  onOpenPlayerPermissions,
  editorCount = 0,
  users = [],
  editorUserIds = [],
  onTogglePlayerPermission,
  onSetAllPlayerPermissions,
  isLogCollapsed,
  onToggleLogCollapse,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const hTrackRef = useRef<HTMLDivElement>(null);
  const vTrackRef = useRef<HTMLDivElement>(null);

  // Monitora as dimensões do container para calcular barras de rolagem e centralização
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
    width: 1200,
    height: 800,
  });

  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateSize();
    const ro = new ResizeObserver(() => updateSize());
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const [activeTool, setActiveTool] = useState<TacticalToolMode>('select');
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [hoveredHex, setHoveredHex] = useState<HexCoord | null>(null);

  // Paredes e Portas state (Contenção de Luminosidade)
  const [wallPoints, setWallPoints] = useState<Point[]>([]);
  const [doorStartPoint, setDoorStartPoint] = useState<Point | null>(null);
  const [selectedWallId, setSelectedWallId] = useState<string | null>(null);
  const [selectedDoorId, setSelectedDoorId] = useState<string | null>(null);

  // Fog of War / Ocultação do Mapa state (Estilo Roll20: Retângulo, Círculo e Polígono)
  const [fogBrushMode, setFogBrushMode] = useState<'reveal' | 'hide'>('reveal');
  const [fogSubTool, setFogSubTool] = useState<'box' | 'light'>('box');
  const [fogShape, setFogShape] = useState<'rect' | 'circle' | 'polygon'>('rect');
  const [fogCircleRadius, setFogCircleRadius] = useState<number>(5);
  const [fogPolyPoints, setFogPolyPoints] = useState<Point[]>([]);
  const [fogBoxStart, setFogBoxStart] = useState<Point | null>(null);
  const [fogBoxCurrent, setFogBoxCurrent] = useState<Point | null>(null);

  // Focos de Luz state (Iluminação Dinâmica)
  const [customLightRadius, setCustomLightRadius] = useState<number>(5);
  const [customLightColor, setCustomLightColor] = useState<string>('#f59e0b');
  const [customLightAngle, setCustomLightAngle] = useState<number>(360);
  const [customLightRotation, setCustomLightRotation] = useState<number>(0);
  const [lightAction, setLightAction] = useState<'add' | 'remove'>('add');

  // Ruler state
  const [rulerStart, setRulerStart] = useState<HexCoord | null>(null);
  const [rulerCurrent, setRulerCurrent] = useState<HexCoord | null>(null);
  const [rulerType, setRulerType] = useState<'line' | 'blast' | 'fixed'>('line');
  const [rulerMode, setRulerMode] = useState<'free' | 'fixed'>('free');
  const [rulerFixedYards, setRulerFixedYards] = useState<number>(5);
  const [keepMeasurementsOnMap, setKeepMeasurementsOnMap] = useState<boolean>(true);

  // Area template state
  const [areaRadius, setAreaRadius] = useState<number>(3); // em jardas
  const [areaColor, setAreaColor] = useState<string>('#ef4444');
  const [areaCenter, setAreaCenter] = useState<HexCoord | null>(null);

  // Dragging state for Tokens and Canvas Pan
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });
  const [draggedTokenId, setDraggedTokenId] = useState<string | null>(null);
  const [dragTokenOrigin, setDragTokenOrigin] = useState<HexCoord | null>(null);
  const [dragHoverHex, setDragHoverHex] = useState<HexCoord | null>(null);
  const [rotatingTokenId, setRotatingTokenId] = useState<string | null>(null);
  const [previewRotation, setPreviewRotation] = useState<{ id: string; rotation: number; facing: FacingDirection } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    tokenId: string;
    npcId: string;
    x: number;
    y: number;
  } | null>(null);

  // Popover state
  const [popoverToken, setPopoverToken] = useState<TacticalToken | null>(null);
  const [popoverPos, setPopoverPos] = useState<Point>({ x: 0, y: 0 });

  // Modal de gerenciamento de tokens no tabuleiro
  const [isTokensModalOpen, setIsTokensModalOpen] = useState(false);
  const [tokensModalFilter, setTokensModalFilter] = useState<'all' | 'players' | 'npcs'>('all');
  const [tokensModalSearch, setTokensModalSearch] = useState('');

  const isMaster = currentUserRole === 'mestre';
  const activeLayer = tacticalState?.activeLayer || 'tokens';
  const [previewAsPlayer, setPreviewAsPlayer] = useState(false);
  const isPlayerView = !isMaster || previewAsPlayer;
  const [lightContextMenu, setLightContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const currentFogMode: TacticalFogMode =
    tacticalState?.fogMode || (tacticalState?.fogEnabled ? 'dynamic' : 'open');

  // Elementos do Cenário / Mobília (Props - Estilo Roll20)
  const [isPropsModalOpen, setIsPropsModalOpen] = useState(false);
  const [selectedPropId, setSelectedPropId] = useState<string | null>(null);
  const [draggedPropId, setDraggedPropId] = useState<string | null>(null);
  const [dragPropOffset, setDragPropOffset] = useState<Point>({ x: 0, y: 0 });
  const [dragPropPos, setDragPropPos] = useState<{ id: string; x: number; y: number } | null>(null);
  const [draggedLightId, setDraggedLightId] = useState<string | null>(null);
  const [dragLightPos, setDragLightPos] = useState<{ id: string; x: number; y: number } | null>(null);
  const [mouseMapPos, setMouseMapPos] = useState<Point | null>(null);

  // Map of characters by id
  const characterMap = useMemo(() => {
    const map = new Map<string, NPC>();
    characters.forEach((c) => map.set(c.id, c));
    return map;
  }, [characters]);

  // Array seguro de tokens
  const tokens = useMemo(() => {
    return Array.isArray(tacticalState?.tokens) ? tacticalState.tokens : [];
  }, [tacticalState?.tokens]);

  // Alternar visibilidade de um token entre Mestre e Jogadores (unificado com a ficha do NPC)
  const handleToggleTokenVisibility = useCallback((tokenId: string) => {
    const token = tokens.find((t) => t.id === tokenId);
    if (!token) return;
    const targetNpc = characterMap.get(token.npcId);
    const isPlayer = targetNpc?.characterType === 'player';

    // Determina se o combatente está atualmente oculto para os jogadores
    const currentlyHidden = isPlayer
      ? (!!token.hiddenFromPlayers || token.layer === 'gm')
      : (!targetNpc?.isVisibleToPlayer || !!token.hiddenFromPlayers || token.layer === 'gm');

    const willBeVisible = currentlyHidden; // Se estava oculto, vai ficar visível aos jogadores

    // 1. Atualiza o token no tabuleiro tático
    const updatedTokens = tokens.map((t) => {
      if (t.id === tokenId) {
        return {
          ...t,
          hiddenFromPlayers: !willBeVisible,
          layer: (willBeVisible ? 'tokens' : 'gm') as any,
        };
      }
      return t;
    });
    onUpdateTacticalState({ tokens: updatedTokens });

    // 2. Unifica diretamente com a ficha do NPC (isVisibleToPlayer)
    if (targetNpc) {
      onUpdateNpc({
        ...targetNpc,
        isVisibleToPlayer: willBeVisible,
      });
    }
  }, [tokens, characterMap, onUpdateTacticalState, onUpdateNpc]);

  // Selected token object
  const selectedToken = useMemo(() => {
    return tokens.find((t) => t.id === selectedTokenId) || null;
  }, [tokens, selectedTokenId]);

  // Selected NPC
  const selectedTokenNpc = useMemo(() => {
    if (!selectedToken) return null;
    return characterMap.get(selectedToken.npcId) || null;
  }, [selectedToken, characterMap]);

  // Posição inicial dos mapas: colados no canto superior esquerdo dando um suspiro mediano (36px)
  const DEFAULT_PAN_X = 36;
  const DEFAULT_PAN_Y = 36;

  // Viewport local (pan e zoom gerenciados apenas no cliente para não sobrecarregar rede e banco)
  const [viewport, setViewport] = useState<{ panX: number; panY: number; zoom: number }>(() => {
    try {
      const saved = localStorage.getItem('hounds_tactical_viewport_v1');
      if (saved) {
        const p = JSON.parse(saved);
        if (typeof p.panX === 'number' && typeof p.panY === 'number' && typeof p.zoom === 'number') {
          return p;
        }
      }
    } catch {}
    return {
      panX: typeof tacticalState?.panX === 'number' ? tacticalState.panX : DEFAULT_PAN_X,
      panY: typeof tacticalState?.panY === 'number' ? tacticalState.panY : DEFAULT_PAN_Y,
      zoom: typeof tacticalState?.zoom === 'number' ? tacticalState.zoom : 1,
    };
  });

  const panX = viewport.panX;
  const panY = viewport.panY;
  const zoom = viewport.zoom;

  const updateViewport = useCallback((next: { panX?: number; panY?: number; zoom?: number }) => {
    setViewport((prev) => {
      const updated = {
        panX: next.panX !== undefined ? next.panX : prev.panX,
        panY: next.panY !== undefined ? next.panY : prev.panY,
        zoom: next.zoom !== undefined ? next.zoom : prev.zoom,
      };
      try {
        localStorage.setItem('hounds_tactical_viewport_v1', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  // Quando troca de mapa ou carrega imagem, inicia colado no canto superior esquerdo com suspiro mediano
  const currentMapKey = `${tacticalState.backgroundKey}_${tacticalState.customImageUrl || ''}`;
  const prevMapRef = useRef(currentMapKey);
  useEffect(() => {
    if (prevMapRef.current !== currentMapKey) {
      prevMapRef.current = currentMapKey;
      updateViewport({ zoom: 1, panX: DEFAULT_PAN_X, panY: DEFAULT_PAN_Y });
    }
  }, [currentMapKey, updateViewport]);

  // Imagem base entra com o tamanho e proporção 100% originais (sem distorção de escala)
  const mapX = 0;
  const mapY = 0;
  const baseW = tacticalState.mapImageWidth || 2000;
  const baseH = tacticalState.mapImageHeight || 1400;
  const mapW = baseW;
  const mapH = baseH;

  // Dimensões do grid hexagonal calibradas exatamente para o tamanho da imagem (nem falta nem sobra)
  const hexSize = tacticalState?.hexSize || 38;
  const hexWidth = Math.sqrt(3) * hexSize;
  const rowSpacing = 1.5 * hexSize;
  const dynamicCols = Math.ceil(mapW / hexWidth) + 2;
  const dynamicRows = Math.ceil(mapH / rowSpacing) + 2;

  // Path SVG pré-calculado e unificado para a grade hexagonal inteira (renderiza milhares de hexágonos em 1 só elemento ultrarrápido)
  const hexGridPath = useMemo(() => {
    let path = '';
    const rows = dynamicRows + 2;
    const cols = dynamicCols + 2;
    for (let rIdx = 0; rIdx < rows; rIdx++) {
      const r = rIdx - 1;
      for (let cIdx = 0; cIdx < cols; cIdx++) {
        const c = cIdx - 1;
        const center = getHexCenter(c, r, hexSize);
        const pts = getHexCornerPoints({ x: mapX + center.x, y: mapY + center.y }, hexSize);
        path += `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}L${pts[1].x.toFixed(1)},${pts[1].y.toFixed(1)}L${pts[2].x.toFixed(1)},${pts[2].y.toFixed(1)}L${pts[3].x.toFixed(1)},${pts[3].y.toFixed(1)}L${pts[4].x.toFixed(1)},${pts[4].y.toFixed(1)}L${pts[5].x.toFixed(1)},${pts[5].y.toFixed(1)}Z `;
      }
    }
    return path;
  }, [dynamicRows, dynamicCols, hexSize, mapX, mapY]);

  // Retorna as coordenadas globais exatas (em pixels) de um foco de luz (suporta posicionamento rente à parede)
  const getLightCenter = useCallback(
    (light: TacticalLightSource) => {
      if (dragLightPos && dragLightPos.id === light.id) {
        return { x: mapX + dragLightPos.x, y: mapY + dragLightPos.y };
      }
      if (typeof light.x === 'number' && typeof light.y === 'number') {
        return { x: mapX + light.x, y: mapY + light.y };
      }
      const relCenter = getHexCenter(light.gridX, light.gridY, hexSize);
      return { x: mapX + relCenter.x, y: mapY + relCenter.y };
    },
    [mapX, mapY, hexSize, dragLightPos]
  );

  // Segmentos bloqueadores de luz extraídos das paredes e portas fechadas (alinhados com as coordenadas globais do SVG)
  const blockingSegments = useMemo(() => {
    const raw = extractBlockingSegments(tacticalState.walls, tacticalState.doors);
    if (!mapX && !mapY) return raw;
    return raw.map((seg) => ({
      p1: { x: seg.p1.x + mapX, y: seg.p1.y + mapY },
      p2: { x: seg.p2.x + mapX, y: seg.p2.y + mapY },
    }));
  }, [tacticalState.walls, tacticalState.doors, mapX, mapY]);

  // Mapa de polígonos de visibilidade calculados para cada foco de luz contido por paredes e portas
  const lightVisibilityPaths = useMemo(() => {
    if (blockingSegments.length === 0) return {};
    const result: Record<string, string> = {};
    const lights = tacticalState.lights || [];

    for (const light of lights) {
      if (light.active === false || (light.radius || 0) <= 0) continue;
      const center = getLightCenter(light);
      const radiusPixels = (light.radius || 4) * hexWidth * 0.95;
      const poly = computeVisibilityPolygon(
        center,
        radiusPixels,
        blockingSegments,
        light.angle || 360,
        light.rotation || 0
      );
      if (poly.length >= 3) {
        result[light.id] = pointsToSvgPath(poly);
      }
    }
    return result;
  }, [tacticalState.lights, blockingSegments, getLightCenter, hexWidth]);

  // Helpers para identificar se um combatente emite luz e seu raio correspondente
  const isTokenEmittingLight = useCallback((token: TacticalToken) => {
    return token.emitsLight !== false && (!!token.emitsLight || (typeof token.lightRadius === 'number' && token.lightRadius > 0));
  }, []);

  const getTokenLightRadius = useCallback((token: TacticalToken) => {
    if (typeof token.lightRadius === 'number' && token.lightRadius > 0) {
      return token.lightRadius;
    }
    return token.emitsLight ? 4 : 0;
  }, []);

  // Polígonos de visibilidade calculados para tokens que emitem luz própria ou possuem visão liberada
  const tokenLightVisibilityPaths = useMemo(() => {
    const result: Record<string, string> = {};
    const mapBoundsSegments: LineSegment[] = [
      { p1: { x: mapX, y: mapY }, p2: { x: mapX + mapW, y: mapY } },
      { p1: { x: mapX + mapW, y: mapY }, p2: { x: mapX + mapW, y: mapY + mapH } },
      { p1: { x: mapX + mapW, y: mapY + mapH }, p2: { x: mapX, y: mapY + mapH } },
      { p1: { x: mapX, y: mapY + mapH }, p2: { x: mapX, y: mapY } },
    ];

    for (const token of tokens) {
      const hasLight = isTokenEmittingLight(token);
      const hasInfVision = !!token.hasInfiniteVision;
      if (!hasLight && !hasInfVision) continue;

      const radiusYards = getTokenLightRadius(token);
      if (radiusYards <= 0 && !hasInfVision) continue;

      const displayGridX = draggedTokenId === token.id && dragHoverHex ? dragHoverHex.col : token.gridX;
      const displayGridY = draggedTokenId === token.id && dragHoverHex ? dragHoverHex.row : token.gridY;
      const relCenter = getHexCenter(displayGridX, displayGridY, hexSize);
      const center = { x: mapX + relCenter.x, y: mapY + relCenter.y };

      const isRotating = rotatingTokenId === token.id;
      const tokenRotation = isRotating && previewRotation && previewRotation.id === token.id
        ? previewRotation.rotation
        : (typeof token.rotation === 'number'
            ? token.rotation
            : ((token.facing * 60 + 180) % 360));
      const facingAngleDegrees = ((tokenRotation + 90) % 360 + 360) % 360;
      const angle = token.lightAngle || 360;

      let radiusPixels = radiusYards * hexWidth * 0.95;
      let segmentsToUse = blockingSegments;

      if (hasInfVision) {
        // Visão Liberada: todo o tabuleiro aberto, bloqueado apenas por paredes e limites do mapa
        radiusPixels = Math.hypot(mapW, mapH);
        segmentsToUse = [...blockingSegments, ...mapBoundsSegments];
      }

      if (segmentsToUse.length === 0 && !hasInfVision) continue;

      const poly = computeVisibilityPolygon(center, radiusPixels, segmentsToUse, angle, facingAngleDegrees);
      if (poly.length >= 3) {
        result[token.id] = pointsToSvgPath(poly);
      }
    }
    return result;
  }, [tokens, blockingSegments, draggedTokenId, dragHoverHex, hexSize, mapX, mapY, mapW, mapH, hexWidth, rotatingTokenId, previewRotation]);

  // Verifica se um foco de luz do mapa tem linha de visão direta desobstruída para algum dos combatentes dos jogadores.
  // Salas fechadas fora da visão do jogador NUNCA mostram luminosidade (O(N) ultra-leve e 100% à prova de crashes)
  const isLightVisibleToPlayer = useCallback(
    (light: TacticalLightSource) => {
      if (blockingSegments.length === 0) return true;

      const playerTokens = tokens.filter((t) => !t.hiddenFromPlayers && t.layer !== 'gm');
      if (playerTokens.length === 0) return true;

      const lightPos = getLightCenter(light);

      return playerTokens.some((t) => {
        const displayGridX = draggedTokenId === t.id && dragHoverHex ? dragHoverHex.col : t.gridX;
        const displayGridY = draggedTokenId === t.id && dragHoverHex ? dragHoverHex.row : t.gridY;
        const relCenter = getHexCenter(displayGridX, displayGridY, hexSize);
        const tokenPos = { x: mapX + relCenter.x, y: mapY + relCenter.y };

        return hasLineOfSight(tokenPos, lightPos, blockingSegments);
      });
    },
    [blockingSegments, tokens, getLightCenter, draggedTokenId, dragHoverHex, hexSize, mapX, mapY]
  );

  // Conjunto de células iluminadas por focos de luz ou por tokens com luz própria
  const litCellsSet = useMemo(() => {
    const set = new Set<string>();

    // 1. Focos de luz fixos
    (tacticalState.lights || []).forEach((light) => {
      if (light.active !== false && light.radius > 0) {
        const inRange = getHexesInRange({ col: light.gridX, row: light.gridY }, light.radius);
        inRange.forEach((h) => {
          if (light.angle && light.angle < 360) {
            const hCenter = getHexCenter(h.col, h.row, hexSize);
            const lCenter = getHexCenter(light.gridX, light.gridY, hexSize);
            const dx = hCenter.x - lCenter.x;
            const dy = hCenter.y - lCenter.y;
            if (dx !== 0 || dy !== 0) {
              const deg = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
              const rot = ((light.rotation ?? 0) % 360 + 360) % 360;
              let diff = Math.abs(deg - rot);
              if (diff > 180) diff = 360 - diff;
              if (diff > light.angle / 2 + 15) return;
            }
          }
          set.add(`${h.col},${h.row}`);
        });
      }
    });

    // 2. Tokens carregando luz (tocha, lanterna, etc.)
    tokens.forEach((token) => {
      if (token.emitsLight && (token.lightRadius || 4) > 0) {
        const radius = token.lightRadius || 4;
        const inRange = getHexesInRange({ col: token.gridX, row: token.gridY }, radius);
        const tRot = typeof token.rotation === 'number' ? token.rotation : ((token.facing * 60 + 180) % 360);
        const facingDeg = ((tRot + 90) % 360 + 360) % 360;

        inRange.forEach((h) => {
          if (token.lightAngle && token.lightAngle < 360) {
            const hCenter = getHexCenter(h.col, h.row, hexSize);
            const tCenter = getHexCenter(token.gridX, token.gridY, hexSize);
            const dx = hCenter.x - tCenter.x;
            const dy = hCenter.y - tCenter.y;
            if (dx !== 0 || dy !== 0) {
              const deg = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
              let diff = Math.abs(deg - facingDeg);
              if (diff > 180) diff = 360 - diff;
              if (diff > token.lightAngle / 2 + 15) return;
            }
          }
          set.add(`${h.col},${h.row}`);
        });
      }
    });

    return set;
  }, [tacticalState.lights, tokens]);

  const handleRevealAllFog = useCallback(() => {
    onUpdateTacticalState({
      fogEnabled: true,
      fogMode: currentFogMode === 'open' ? 'hidden' : currentFogMode,
      fogRects: [{ id: 'reveal-all', x: 0, y: 0, width: mapW, height: mapH, mode: 'reveal' }],
      fogRevealedCells: [],
    });
  }, [mapW, mapH, currentFogMode, onUpdateTacticalState]);

  const handleHideAllFog = useCallback(() => {
    onUpdateTacticalState({
      fogEnabled: true,
      fogMode: currentFogMode === 'open' ? 'hidden' : currentFogMode,
      fogRects: currentFogMode === 'dynamic'
        ? [{ id: 'hide-all', x: 0, y: 0, width: mapW, height: mapH, mode: 'hide' }]
        : [],
      fogRevealedCells: [],
    });
  }, [mapW, mapH, currentFogMode, onUpdateTacticalState]);

  const handleAddLightAtCenter = useCallback(() => {
    const centerHex = pixelToHex(mapW / 2, mapH / 2, hexSize);
    const newLight: TacticalLightSource = {
      id: `light-${Date.now()}`,
      label: 'Luz',
      gridX: centerHex.col,
      gridY: centerHex.row,
      x: Math.round(mapW / 2),
      y: Math.round(mapH / 2),
      radius: customLightRadius || 5,
      color: customLightColor || '#f59e0b',
      active: true,
      angle: customLightAngle || 360,
      rotation: customLightRotation || 0,
    };
    onUpdateTacticalState({
      lights: [...(tacticalState.lights || []), newLight],
    });
  }, [mapW, mapH, hexSize, customLightRadius, customLightColor, customLightAngle, customLightRotation, tacticalState.lights, onUpdateTacticalState]);

  // --- GERENCIAMENTO DE PAREDES E PORTAS (CONTENÇÃO DE LUZ) ---
  const handleFinishWall = useCallback(() => {
    if (wallPoints.length < 2) return;
    const newWall: TacticalWall = {
      id: `wall-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      points: [...wallPoints],
      closed: false,
      color: '#3b82f6',
    };
    onUpdateTacticalState({ walls: [...(tacticalState.walls || []), newWall] });
    setWallPoints([]);
  }, [wallPoints, tacticalState.walls, onUpdateTacticalState]);

  const handleCloseWallPolygon = useCallback(() => {
    if (wallPoints.length < 3) return;
    const newWall: TacticalWall = {
      id: `wall-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      points: [...wallPoints],
      closed: true,
      color: '#3b82f6',
    };
    onUpdateTacticalState({ walls: [...(tacticalState.walls || []), newWall] });
    setWallPoints([]);
  }, [wallPoints, tacticalState.walls, onUpdateTacticalState]);

  const handleCancelWall = useCallback(() => {
    setWallPoints([]);
  }, []);

  const handleUndoWallPoint = useCallback(() => {
    setWallPoints((prev) => prev.slice(0, prev.length - 1));
  }, []);

  const handleDeleteWall = useCallback((wallId: string) => {
    const updated = (tacticalState.walls || []).filter((w) => w.id !== wallId);
    onUpdateTacticalState({ walls: updated });
    if (selectedWallId === wallId) setSelectedWallId(null);
  }, [tacticalState.walls, selectedWallId, onUpdateTacticalState]);

  const handleClearWalls = useCallback(() => {
    onUpdateTacticalState({ walls: [] });
    setWallPoints([]);
    setSelectedWallId(null);
  }, [onUpdateTacticalState]);

  const handleToggleDoor = useCallback((doorId: string) => {
    const updated = (tacticalState.doors || []).map((d) =>
      d.id === doorId ? { ...d, isOpen: !d.isOpen } : d
    );
    onUpdateTacticalState({ doors: updated });
  }, [tacticalState.doors, onUpdateTacticalState]);

  const handleDeleteDoor = useCallback((doorId: string) => {
    const updated = (tacticalState.doors || []).filter((d) => d.id !== doorId);
    onUpdateTacticalState({ doors: updated });
    if (selectedDoorId === doorId) setSelectedDoorId(null);
  }, [tacticalState.doors, selectedDoorId, onUpdateTacticalState]);

  const handleToggleAllDoors = useCallback((open: boolean) => {
    const updated = (tacticalState.doors || []).map((d) => ({ ...d, isOpen: open }));
    onUpdateTacticalState({ doors: updated });
  }, [tacticalState.doors, onUpdateTacticalState]);

  const handleClearDoors = useCallback(() => {
    onUpdateTacticalState({ doors: [] });
    setDoorStartPoint(null);
    setSelectedDoorId(null);
  }, [onUpdateTacticalState]);

  // Funções para controle do Polígono de Névoa de Guerra
  const handleFinishFogPolygon = useCallback((pointsToFinish?: Point[]) => {
    const pts = pointsToFinish || fogPolyPoints;
    if (pts.length < 3) return;
    const xs = pts.map((pt) => pt.x);
    const ys = pts.map((pt) => pt.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const newPolyArea: TacticalFogRect = {
      id: `fog-poly-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      mode: fogBrushMode,
      shape: 'polygon',
      points: pts,
    };
    onUpdateTacticalState({
      fogEnabled: true,
      fogRects: [...(tacticalState.fogRects || []), newPolyArea],
    });
    setFogPolyPoints([]);
  }, [fogPolyPoints, fogBrushMode, tacticalState.fogRects, onUpdateTacticalState]);

  const handleCancelFogPolygon = useCallback(() => {
    setFogPolyPoints([]);
  }, []);

  const handleUndoFogPolyPoint = useCallback(() => {
    setFogPolyPoints((prev) => prev.slice(0, -1));
  }, []);

  // Efeito de atalhos de teclado para Parede, Porta e Polígono de Névoa
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) {
        return;
      }

      if (e.key === 'Enter') {
        if (wallPoints.length >= 2) {
          e.preventDefault();
          handleFinishWall();
        } else if (fogPolyPoints.length >= 3) {
          e.preventDefault();
          handleFinishFogPolygon();
        }
      } else if (e.key === 'Escape') {
        if (wallPoints.length > 0) {
          e.preventDefault();
          handleCancelWall();
        } else if (doorStartPoint) {
          e.preventDefault();
          setDoorStartPoint(null);
        } else if (fogPolyPoints.length > 0) {
          e.preventDefault();
          handleCancelFogPolygon();
        }
      } else if (e.key === 'Backspace') {
        if (wallPoints.length > 0) {
          e.preventDefault();
          handleUndoWallPoint();
        } else if (fogPolyPoints.length > 0) {
          e.preventDefault();
          handleUndoFogPolyPoint();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    wallPoints,
    doorStartPoint,
    fogPolyPoints,
    handleFinishWall,
    handleCancelWall,
    handleUndoWallPoint,
    handleFinishFogPolygon,
    handleCancelFogPolygon,
    handleUndoFogPolyPoint,
  ]);

  // Convert client mouse event to map coordinate (respecting pan and zoom)
  const clientToMapCoords = useCallback(
    (clientX: number, clientY: number): Point => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      const x = (clientX - rect.left - panX) / zoom;
      const y = (clientY - rect.top - panY) / zoom;
      return { x, y };
    },
    [panX, panY, zoom]
  );

  // Manipulação de Elementos de Cenário (Props)
  const handleAddProp = useCallback((newProp: Omit<TacticalProp, 'id'>) => {
    const propWithId: TacticalProp = {
      ...newProp,
      id: `prop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    const currentProps = tacticalState.props || [];
    onUpdateTacticalState({ props: [...currentProps, propWithId] });
    setSelectedPropId(propWithId.id);
  }, [tacticalState.props, onUpdateTacticalState]);

  const handleStartDragProp = useCallback((id: string, e: React.MouseEvent) => {
    const p = clientToMapCoords(e.clientX, e.clientY);
    const prop = (tacticalState.props || []).find((p) => p.id === id);
    if (prop) {
      setDraggedPropId(id);
      setDragPropOffset({ x: p.x - prop.x, y: p.y - prop.y });
    }
  }, [tacticalState.props, clientToMapCoords]);

  const handleRotateProp = useCallback((id: string, degreesDelta: number) => {
    const updated = (tacticalState.props || []).map((p) =>
      p.id === id ? { ...p, rotation: ((p.rotation || 0) + degreesDelta) % 360 } : p
    );
    onUpdateTacticalState({ props: updated });
  }, [tacticalState.props, onUpdateTacticalState]);

  const handleResizeProp = useCallback((id: string, factor: number) => {
    const updated = (tacticalState.props || []).map((p) => {
      if (p.id !== id) return p;
      const newW = Math.max(15, Math.round(p.width * factor));
      const newH = Math.max(15, Math.round(p.height * factor));
      return { ...p, width: newW, height: newH };
    });
    onUpdateTacticalState({ props: updated });
  }, [tacticalState.props, onUpdateTacticalState]);

  const handleToggleLockProp = useCallback((id: string) => {
    const updated = (tacticalState.props || []).map((p) =>
      p.id === id ? { ...p, locked: !p.locked } : p
    );
    onUpdateTacticalState({ props: updated });
  }, [tacticalState.props, onUpdateTacticalState]);

  const handleDuplicateProp = useCallback((id: string) => {
    const prop = (tacticalState.props || []).find((p) => p.id === id);
    if (!prop) return;
    const cloned: TacticalProp = {
      ...prop,
      id: `prop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      x: prop.x + 30,
      y: prop.y + 30,
    };
    onUpdateTacticalState({ props: [...(tacticalState.props || []), cloned] });
    setSelectedPropId(cloned.id);
  }, [tacticalState.props, onUpdateTacticalState]);

  const handleDeleteProp = useCallback((id: string) => {
    const updated = (tacticalState.props || []).filter((p) => p.id !== id);
    onUpdateTacticalState({ props: updated });
    if (selectedPropId === id) setSelectedPropId(null);
  }, [tacticalState.props, selectedPropId, onUpdateTacticalState]);

  const handleClearAllProps = useCallback(() => {
    onUpdateTacticalState({ props: [] });
    setSelectedPropId(null);
  }, [onUpdateTacticalState]);

  // Zoom direcionado pelo ponteiro do mouse (scroll do mouse vai em direção ao cursor)
  const handleWheel = (e: React.WheelEvent) => {
    // Evita zoom/scroll no mapa se o scroll foi gerado dentro de janelas, modais, menus ou barras de ferramentas
    const target = e.target as HTMLElement | SVGElement | null;
    if (
      target &&
      (target.closest('#tactical-top-toolbar-container') ||
        target.closest('#tactical-token-sidebar') ||
        target.closest('#tactical-props-modal') ||
        target.closest('#tactical-quick-action-popover') ||
        target.closest('#tactical-context-menu') ||
        target.closest('[role="dialog"]') ||
        target.closest('.overflow-y-auto') ||
        target.closest('.overflow-auto') ||
        target.closest('.overflow-x-auto') ||
        target.closest('input') ||
        target.closest('select') ||
        target.closest('textarea'))
    ) {
      return;
    }

    e.preventDefault();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const mapCoordX = (mouseX - panX) / zoom;
    const mapCoordY = (mouseY - panY) / zoom;

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
    const newZoom = Math.max(0.3, Math.min(3.0, Number((zoom * zoomFactor).toFixed(3))));

    const newPanX = Math.round(mouseX - mapCoordX * newZoom);
    const newPanY = Math.round(mouseY - mapCoordY * newZoom);

    updateViewport({ zoom: newZoom, panX: newPanX, panY: newPanY });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Evita disparar ações no mapa quando o clique foi em botões, menus, inputs ou na barra superior
    const target = e.target as HTMLElement | SVGElement | null;
    if (
      target &&
      (target.closest('button') ||
        target.closest('input') ||
        target.closest('select') ||
        target.closest('#tactical-top-toolbar-container') ||
        target.closest('[role="dialog"]') ||
        target.closest('.modal-content'))
    ) {
      return;
    }

    if (e.button === 0) {
      e.preventDefault();
    }

    if (contextMenu) {
      setContextMenu(null);
    }

    if (lightContextMenu) {
      setLightContextMenu(null);
    }

    if (selectedPropId && !target?.closest('#tactical-props-layer')) {
      setSelectedPropId(null);
    }

    // Construção de Paredes por Ligação de Polígonos
    if (activeTool === 'wall' && isMaster) {
      if (e.button === 2) {
        // Botão direito: conclui a parede imediatamente no ponto atual sem precisar voltar ao ponto 1
        e.preventDefault();
        if (wallPoints.length >= 2) {
          handleFinishWall();
        } else {
          handleCancelWall();
        }
        return;
      }

      if (e.button === 0) {
        const p = clientToMapCoords(e.clientX, e.clientY);
        const pt = { x: Math.round(p.x - mapX), y: Math.round(p.y - mapY) };

        if (wallPoints.length >= 2) {
          // Se clicar no ponto inicial (com 3+ pontos), fecha o polígono
          const first = wallPoints[0];
          const distFirst = Math.hypot(pt.x - first.x, pt.y - first.y);
          if (distFirst < 18 && wallPoints.length >= 3) {
            handleCloseWallPolygon();
            return;
          }

          // Se clicar no último vértice adicionado, conclui a parede aqui sem precisar fechar
          const last = wallPoints[wallPoints.length - 1];
          const distLast = Math.hypot(pt.x - last.x, pt.y - last.y);
          if (distLast < 18) {
            handleFinishWall();
            return;
          }
        }

        setWallPoints((prev) => [...prev, pt]);
        return;
      }
    }

    // Inserção de Portas (Abertas ou Fechadas)
    if (activeTool === 'door' && e.button === 0 && isMaster) {
      const p = clientToMapCoords(e.clientX, e.clientY);
      const pt = { x: Math.round(p.x - mapX), y: Math.round(p.y - mapY) };

      if (!doorStartPoint) {
        setDoorStartPoint(pt);
      } else {
        const newDoor: TacticalDoor = {
          id: `door-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          x1: doorStartPoint.x,
          y1: doorStartPoint.y,
          x2: pt.x,
          y2: pt.y,
          isOpen: false,
          name: `Porta ${(tacticalState.doors || []).length + 1}`,
        };
        onUpdateTacticalState({ doors: [...(tacticalState.doors || []), newDoor] });
        setDoorStartPoint(null);
      }
      return;
    }

    // Iluminação Livre (Qualquer coordenada no mapa, sem respeitar hexágonos)
    if (activeTool === 'light' && e.button === 0 && isMaster) {
      const p = clientToMapCoords(e.clientX, e.clientY);
      const hex = pixelToHex(p.x - mapX, p.y - mapY, hexSize);
      const newLight: TacticalLightSource = {
        id: `light-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        gridX: hex.col,
        gridY: hex.row,
        x: Math.round(p.x - mapX),
        y: Math.round(p.y - mapY),
        radius: customLightRadius || 5,
        color: customLightColor || '#f59e0b',
        intensity: 0.85,
        label: `Luz (${customLightRadius || 5}yd)`,
        active: true,
        angle: customLightAngle || 360,
        rotation: customLightRotation || 0,
      };
      onUpdateTacticalState({
        lights: [...(tacticalState.lights || []), newLight],
      });
      return;
    }

    // Cancelar ou desfazer ponto de polígono de névoa com botão direito
    if (activeTool === 'fog' && e.button === 2 && isMaster) {
      e.preventDefault();
      if (fogPolyPoints.length > 0) {
        handleUndoFogPolyPoint();
      } else if (fogBoxStart) {
        setFogBoxStart(null);
        setFogBoxCurrent(null);
      }
      return;
    }

    // 1. Ferramenta de Ocultação do Mapa (Retângulo, Círculo e Polígono)
    if (activeTool === 'fog' && e.button === 0 && isMaster) {
      const p = clientToMapCoords(e.clientX, e.clientY);

      if (fogShape === 'circle') {
        const clickX = Math.round(p.x - mapX);
        const clickY = Math.round(p.y - mapY);
        const radiusPixels = Math.round((fogCircleRadius || 5) * hexWidth * 0.95);
        const newCircleArea: TacticalFogRect = {
          id: `fog-circle-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          x: clickX,
          y: clickY,
          width: radiusPixels * 2,
          height: radiusPixels * 2,
          mode: fogBrushMode,
          shape: 'circle',
          radius: radiusPixels,
          radiusYards: fogCircleRadius || 5,
        };
        onUpdateTacticalState({
          fogEnabled: true,
          fogRects: [...(tacticalState.fogRects || []), newCircleArea],
        });
      } else if (fogShape === 'polygon') {
        const clickPt = { x: Math.round(p.x - mapX), y: Math.round(p.y - mapY) };
        setFogPolyPoints((prev) => [...prev, clickPt]);
      } else {
        // Seleção Retangular da Névoa (padrão)
        setFogBoxStart({ x: p.x - mapX, y: p.y - mapY });
        setFogBoxCurrent({ x: p.x - mapX, y: p.y - mapY });
      }
      setPopoverToken(null);
      return;
    }

    // Camada do Mapa ativa: Mover o mapa segurando o botão do mouse (apenas com ferramenta de seleção/mover)
    if (activeLayer === 'map' && activeTool === 'select' && e.button === 0) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panX, y: e.clientY - panY });
      setPopoverToken(null);
      return;
    }

    // Cancelar medição em andamento ao clicar com botão direito
    if (activeTool === 'ruler' && e.button === 2 && rulerStart) {
      e.preventDefault();
      setRulerStart(null);
      setRulerCurrent(null);
      return;
    }

    // 3. Ferramenta de Medir (Distância por Dois Cliques, Área de Efeito e Alcance Fixo)
    if ((activeTool === 'ruler' || activeTool === 'area') && e.button === 0) {
      const p = clientToMapCoords(e.clientX, e.clientY);
      const hex = pixelToHex(p.x - mapX, p.y - mapY, hexSize);

      if (rulerType === 'blast' || activeTool === 'area') {
        const newMarker: TacticalMarker = {
          id: `area-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          type: 'blast',
          startX: hex.col,
          startY: hex.row,
          radius: areaRadius,
          color: areaColor,
          label: `Área (${areaRadius}yd)`,
          layer: activeLayer === 'gm' ? 'gm' : 'tokens',
          authorName: currentUserRole === 'mestre' ? 'Mestre' : 'Jogador',
        };
        onUpdateTacticalState({
          markers: [...(tacticalState.markers || []), newMarker],
        });
        setPopoverToken(null);
        setActiveTool('select');
        return;
      }

      if (rulerType === 'fixed') {
        if (!rulerStart) {
          setRulerStart(hex);
          setRulerCurrent(hex);
        } else {
          setRulerStart(null);
          setRulerCurrent(null);
          setActiveTool('select');
        }
        return;
      }

      // Modo Distância (Seta) com DOIS CLIQUES: 1º clique marca origem, 2º clique fixa
      if (!rulerStart) {
        // 1º Clique: marca origem da medição
        setRulerStart(hex);
        setRulerCurrent(hex);
        return;
      } else {
        // 2º Clique: destino da medição e fixação no mapa
        const distanceYards = getHexDistance(rulerStart, hex);
        if (distanceYards > 0) {
          const rangePenalty = getGurpsRangePenalty(distanceYards);
          const newMarker: TacticalMarker = {
            id: `ruler-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            type: 'ruler',
            startX: rulerStart.col,
            startY: rulerStart.row,
            endX: hex.col,
            endY: hex.row,
            radius: distanceYards,
            color: '#f59e0b',
            label: `${distanceYards} yd (${rangePenalty >= 0 ? `+${rangePenalty}` : rangePenalty})`,
            layer: activeLayer === 'gm' ? 'gm' : 'tokens',
            authorName: currentUserRole === 'mestre' ? 'Mestre' : 'Jogador',
          };
          onUpdateTacticalState({
            markers: [...(tacticalState.markers || []), newMarker],
          });
        }
        setRulerStart(null);
        setRulerCurrent(null);
        setActiveTool('select');
        return;
      }
    }

    // 4. Mover o mapa: Se clicar e segurar em uma parte do mapa (botão esquerdo no modo Mover/Select ou botão do meio)
    if (e.button === 1 || (e.button === 0 && activeTool === 'select')) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panX, y: e.clientY - panY });
      setPopoverToken(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggedLightId) {
      const p = clientToMapCoords(e.clientX, e.clientY);
      setDragLightPos({ id: draggedLightId, x: Math.round(p.x - mapX), y: Math.round(p.y - mapY) });
      return;
    }

    if (draggedPropId) {
      const p = clientToMapCoords(e.clientX, e.clientY);
      const nextX = Math.round(p.x - dragPropOffset.x);
      const nextY = Math.round(p.y - dragPropOffset.y);
      setDragPropPos({ id: draggedPropId, x: nextX, y: nextY });
      return;
    }

    const target = e.target as HTMLElement | SVGElement | null;
    const isOverOverlay = !!(
      target &&
      target.closest('#tactical-top-toolbar-container, [role="dialog"], #tactical-token-sidebar')
    );

    if (isOverOverlay) {
      setHoveredHex((prev) => (prev ? null : prev));
      if (!fogBoxStart && !isPanning && !draggedTokenId && !draggedPropId && !draggedLightId && !rotatingTokenId) {
        return;
      }
    }

    if (isPanning) {
      setViewport((prev) => ({
        ...prev,
        panX: e.clientX - panStart.x,
        panY: e.clientY - panStart.y,
      }));
      return;
    }

    const p = clientToMapCoords(e.clientX, e.clientY);
    const hex = pixelToHex(p.x - mapX, p.y - mapY, hexSize);

    if (
      activeTool === 'fog' ||
      activeTool === 'light' ||
      activeTool === 'wall' ||
      activeTool === 'door'
    ) {
      setMouseMapPos({ x: Math.round(p.x - mapX), y: Math.round(p.y - mapY) });
    }

    if (!isOverOverlay) {
      setHoveredHex((prev) => {
        if (prev && prev.col === hex.col && prev.row === hex.row) return prev;
        return hex;
      });
    }

    if (activeTool === 'fog' && isMaster && fogSubTool === 'box' && fogBoxStart) {
      setFogBoxCurrent({ x: p.x - mapX, y: p.y - mapY });
    }

    if (activeTool === 'ruler' && rulerStart) {
      setRulerCurrent(hex);
    }

    if (activeTool === 'area' || (activeTool === 'ruler' && rulerType === 'blast')) {
      setAreaCenter(hex);
    }

    // Rotação ativa do token pelo "pauzinho" (Roll20 rotation handle) - apenas preview local no mousemove
    if (rotatingTokenId) {
      const token = tokens.find((t) => t.id === rotatingTokenId);
      if (token) {
        const rel = getHexCenter(token.gridX, token.gridY, hexSize);
        const center = { x: mapX + rel.x, y: mapY + rel.y };
        const dx = p.x - center.x;
        const dy = p.y - center.y;
        const deg = (Math.atan2(dy, dx) * 180) / Math.PI;
        let rot = deg - 90;
        rot = ((rot % 360) + 360) % 360;
        const snappedRot = (Math.round(rot / 30) * 30) % 360;
        const facingIndex = (Math.round(((snappedRot + 180) % 360) / 60) % 6) as FacingDirection;

        setPreviewRotation({ id: rotatingTokenId, rotation: snappedRot, facing: facingIndex });
      }
      return;
    }

    // Live dragging of a token - apenas atualiza preview local de hover sem disparar sync a cada pixel
    if (draggedTokenId) {
      setDragHoverHex(hex);
    }
  };

  const handleMouseUp = () => {
    if (draggedLightId) {
      if (dragLightPos) {
        const hex = pixelToHex(dragLightPos.x, dragLightPos.y, hexSize);
        const updated = (tacticalState.lights || []).map((l) =>
          l.id === dragLightPos.id
            ? { ...l, x: dragLightPos.x, y: dragLightPos.y, gridX: hex.col, gridY: hex.row }
            : l
        );
        onUpdateTacticalState({ lights: updated });
        setDragLightPos(null);
      }
      setDraggedLightId(null);
    }

    if (draggedPropId) {
      if (dragPropPos) {
        const updatedProps = (tacticalState.props || []).map((prop) =>
          prop.id === dragPropPos.id ? { ...prop, x: dragPropPos.x, y: dragPropPos.y } : prop
        );
        onUpdateTacticalState({ props: updatedProps });
        setDragPropPos(null);
      }
      setDraggedPropId(null);
    }

    if (fogBoxStart && fogBoxCurrent && isMaster) {
      const minX = Math.min(fogBoxStart.x, fogBoxCurrent.x);
      const maxX = Math.max(fogBoxStart.x, fogBoxCurrent.x);
      const minY = Math.min(fogBoxStart.y, fogBoxCurrent.y);
      const maxY = Math.max(fogBoxStart.y, fogBoxCurrent.y);
      const width = maxX - minX;
      const height = maxY - minY;

      if (width > 6 && height > 6) {
        const newRect: TacticalFogRect = {
          id: `fog-rect-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          x: Math.round(minX),
          y: Math.round(minY),
          width: Math.round(width),
          height: Math.round(height),
          mode: fogBrushMode,
          shape: 'rect',
        };
        onUpdateTacticalState({
          fogEnabled: true,
          fogRects: [...(tacticalState.fogRects || []), newRect],
        });
      }
      setFogBoxStart(null);
      setFogBoxCurrent(null);
    }

    if (isPanning) {
      setIsPanning(false);
      try {
        localStorage.setItem('hounds_tactical_viewport_v1', JSON.stringify({ panX, panY, zoom }));
      } catch {}
    }

    if (rotatingTokenId) {
      if (previewRotation) {
        const updatedTokens = tokens.map((t) =>
          t.id === rotatingTokenId
            ? { ...t, rotation: previewRotation.rotation, facing: previewRotation.facing }
            : t
        );
        onUpdateTacticalState({ tokens: updatedTokens });
      }
      setRotatingTokenId(null);
      setPreviewRotation(null);
    }

    if (draggedTokenId && dragTokenOrigin) {
      const token = tokens.find((t) => t.id === draggedTokenId);
      const targetCol = dragHoverHex ? dragHoverHex.col : (token?.gridX ?? dragTokenOrigin.col);
      const targetRow = dragHoverHex ? dragHoverHex.row : (token?.gridY ?? dragTokenOrigin.row);
      const movedYards = getHexDistance(dragTokenOrigin, { col: targetCol, row: targetRow });
      const updatedTokens = tokens.map((t) =>
        t.id === draggedTokenId ? { ...t, gridX: targetCol, gridY: targetRow, movedThisTurn: (t.movedThisTurn || 0) + movedYards } : t
      );
      onUpdateTacticalState({ tokens: updatedTokens });
      setDraggedTokenId(null);
      setDragTokenOrigin(null);
      setDragHoverHex(null);
    }
  };

  // Zoom helpers locais
  const handleZoomIn = () => {
    const mouseX = containerSize.width / 2;
    const mouseY = containerSize.height / 2;
    const mapCoordX = (mouseX - panX) / zoom;
    const mapCoordY = (mouseY - panY) / zoom;
    const newZoom = Math.min(3.0, Number((zoom * 1.2).toFixed(3)));
    const newPanX = Math.round(mouseX - mapCoordX * newZoom);
    const newPanY = Math.round(mouseY - mapCoordY * newZoom);
    updateViewport({ zoom: newZoom, panX: newPanX, panY: newPanY });
  };

  const handleZoomOut = () => {
    const mouseX = containerSize.width / 2;
    const mouseY = containerSize.height / 2;
    const mapCoordX = (mouseX - panX) / zoom;
    const mapCoordY = (mouseY - panY) / zoom;
    const newZoom = Math.max(0.3, Number((zoom / 1.2).toFixed(3)));
    const newPanX = Math.round(mouseX - mapCoordX * newZoom);
    const newPanY = Math.round(mouseY - mapCoordY * newZoom);
    updateViewport({ zoom: newZoom, panX: newPanX, panY: newPanY });
  };

  const handleResetView = () => {
    updateViewport({ zoom: 1, panX: DEFAULT_PAN_X, panY: DEFAULT_PAN_Y });
  };

  // Cálculos para Barras de Rolagem (quando o mapa for maior que a tela)
  const contentW = mapW * zoom;
  const contentH = mapH * zoom;
  const containerW = containerSize.width;
  const containerH = containerSize.height;

  const showHScroll = contentW > containerW;
  const showVScroll = contentH > containerH;

  const panX_left = 20 - mapX * zoom;
  const panX_right = containerW - 20 - (mapX + mapW) * zoom;
  const panRangeX = panX_left - panX_right;

  const panY_top = 20 - mapY * zoom;
  const panY_bottom = containerH - 20 - (mapY + mapH) * zoom;
  const panRangeY = panY_top - panY_bottom;

  const thumbWidthPercent = Math.max(10, Math.min(100, (containerW / (contentW || 1)) * 100));
  const thumbHeightPercent = Math.max(10, Math.min(100, (containerH / (contentH || 1)) * 100));

  const progressX = panRangeX > 0 ? Math.max(0, Math.min(1, (panX_left - panX) / panRangeX)) : 0;
  const thumbLeftPercent = progressX * (100 - thumbWidthPercent);

  const progressY = panRangeY > 0 ? Math.max(0, Math.min(1, (panY_top - panY) / panRangeY)) : 0;
  const thumbTopPercent = progressY * (100 - thumbHeightPercent);

  const handleHTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hTrackRef.current || panRangeX <= 0) return;
    const rect = hTrackRef.current.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newPanX = panX_left - frac * panRangeX;
    updateViewport({ panX: Math.round(newPanX) });
  };

  const handleHThumbPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const initialPanX = panX;
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);

    const onPointerMove = (ev: PointerEvent) => {
      if (!hTrackRef.current || panRangeX <= 0) return;
      const trackW = hTrackRef.current.clientWidth;
      const deltaX = ev.clientX - startX;
      const deltaPan = -(deltaX / trackW) * panRangeX;
      updateViewport({ panX: Math.round(initialPanX + deltaPan) });
    };

    const onPointerUp = (ev: PointerEvent) => {
      target.releasePointerCapture(ev.pointerId);
      target.removeEventListener('pointermove', onPointerMove);
      target.removeEventListener('pointerup', onPointerUp);
      target.removeEventListener('pointercancel', onPointerUp);
    };

    target.addEventListener('pointermove', onPointerMove);
    target.addEventListener('pointerup', onPointerUp);
    target.addEventListener('pointercancel', onPointerUp);
  };

  const handleVTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!vTrackRef.current || panRangeY <= 0) return;
    const rect = vTrackRef.current.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const newPanY = panY_top - frac * panRangeY;
    updateViewport({ panY: Math.round(newPanY) });
  };

  const handleVThumbPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    const startY = e.clientY;
    const initialPanY = panY;
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);

    const onPointerMove = (ev: PointerEvent) => {
      if (!vTrackRef.current || panRangeY <= 0) return;
      const trackH = vTrackRef.current.clientHeight;
      const deltaY = ev.clientY - startY;
      const deltaPan = -(deltaY / trackH) * panRangeY;
      updateViewport({ panY: Math.round(initialPanY + deltaPan) });
    };

    const onPointerUp = (ev: PointerEvent) => {
      target.releasePointerCapture(ev.pointerId);
      target.removeEventListener('pointermove', onPointerMove);
      target.removeEventListener('pointerup', onPointerUp);
      target.removeEventListener('pointercancel', onPointerUp);
    };

    target.addEventListener('pointermove', onPointerMove);
    target.addEventListener('pointerup', onPointerUp);
    target.addEventListener('pointercancel', onPointerUp);
  };

  // Auto-place all characters onto map
  const handleAutoPlaceTokens = () => {
    const existingNpcIds = new Set(tokens.map((t) => t.npcId));
    const newTokens: TacticalToken[] = [...tokens];

    let playerCol = 3;
    let playerRow = 4;
    let npcCol = 14;
    let npcRow = 4;

    characters.forEach((char) => {
      if (!existingNpcIds.has(char.id)) {
        const isPlayer = char.characterType === 'player';
        const col = isPlayer ? playerCol : npcCol;
        const row = isPlayer ? playerRow : npcRow;

        newTokens.push({
          id: `token-${char.id}`,
          npcId: char.id,
          gridX: col,
          gridY: row,
          facing: (isPlayer ? 1 : 4) as FacingDirection, // Jogadores olham SE, Inimigos olham SW/NW
          elevation: 0,
          reach: 1,
          size: 1,
          hiddenFromPlayers: !isPlayer && !char.isVisibleToPlayer,
        });

        if (isPlayer) {
          playerRow += 2;
          if (playerRow > 18) {
            playerRow = 4;
            playerCol += 2;
          }
        } else {
          npcRow += 2;
          if (npcRow > 18) {
            npcRow = 4;
            npcCol += 2;
          }
        }
      }
    });

    onUpdateTacticalState({ tokens: newTokens });
  };

  // Place a specific token on map
  const handlePlaceToken = (npcId: string) => {
    const existing = tokens.find((t) => t.npcId === npcId);
    if (existing) {
      setSelectedTokenId(existing.id);
      return;
    }
    const targetNpc = characterMap.get(npcId);
    const isPlayer = targetNpc?.characterType === 'player';

    const newToken: TacticalToken = {
      id: `token-${npcId}`,
      npcId,
      gridX: isPlayer ? 4 : 12,
      gridY: 6 + (tokens.length % 6) * 2,
      facing: (isPlayer ? 1 : 4) as FacingDirection,
      elevation: 0,
      reach: 1,
      size: 1,
      hiddenFromPlayers: !isPlayer && !targetNpc?.isVisibleToPlayer,
    };

    onUpdateTacticalState({ tokens: [...tokens, newToken] });
    setSelectedTokenId(newToken.id);
  };

  // Alternar presença do token de um combatente no tabuleiro
  const handleToggleTokenPlacement = (npcId: string) => {
    const existing = tokens.find((t) => t.npcId === npcId);
    if (existing) {
      const nextTokens = tokens.filter((t) => t.npcId !== npcId);
      onUpdateTacticalState({ tokens: nextTokens });
      if (selectedTokenId === existing.id) {
        setSelectedTokenId(null);
      }
    } else {
      const targetNpc = characterMap.get(npcId);
      const isPlayer = targetNpc?.characterType === 'player';
      const newToken: TacticalToken = {
        id: `token-${npcId}`,
        npcId,
        gridX: isPlayer ? 4 : 14,
        gridY: 4 + (tokens.length % 7) * 2,
        facing: (isPlayer ? 1 : 4) as FacingDirection,
        elevation: 0,
        reach: 1,
        size: 1,
        hiddenFromPlayers: !isPlayer && !targetNpc?.isVisibleToPlayer,
      };
      onUpdateTacticalState({ tokens: [...tokens, newToken] });
      setSelectedTokenId(newToken.id);
    }
  };

  // Posicionar em lote todos os combatentes de uma lista
  const handlePlaceAllInFilter = (filterChars: NPC[]) => {
    const missing = filterChars.filter((c) => !tokens.some((t) => t.npcId === c.id));
    if (missing.length === 0) return;

    let playerRow = 4;
    let playerCol = 4;
    let npcRow = 4;
    let npcCol = 14;
    const newTokens = [...tokens];

    missing.forEach((char) => {
      const isPlayer = char.characterType === 'player';
      newTokens.push({
        id: `token-${char.id}`,
        npcId: char.id,
        gridX: isPlayer ? playerCol : npcCol,
        gridY: isPlayer ? playerRow : npcRow,
        facing: (isPlayer ? 1 : 4) as FacingDirection,
        elevation: 0,
        reach: 1,
        size: 1,
        hiddenFromPlayers: !isPlayer && !char.isVisibleToPlayer,
      });

      if (isPlayer) {
        playerRow += 2;
        if (playerRow > 18) {
          playerRow = 4;
          playerCol += 2;
        }
      } else {
        npcRow += 2;
        if (npcRow > 18) {
          npcRow = 4;
          npcCol += 2;
        }
      }
    });

    onUpdateTacticalState({ tokens: newTokens });
  };

  // Remover em lote todos os combatentes de uma lista do tabuleiro
  const handleRemoveAllInFilter = (filterChars: NPC[]) => {
    const filterIds = new Set(filterChars.map((c) => c.id));
    const nextTokens = tokens.filter((t) => !filterIds.has(t.npcId));
    onUpdateTacticalState({ tokens: nextTokens });
    if (selectedTokenId && !nextTokens.some((t) => t.id === selectedTokenId)) {
      setSelectedTokenId(null);
    }
  };

  // Focus view on a token (local viewport)
  const handleFocusToken = (token: TacticalToken) => {
    if (!containerRef.current) return;
    const rel = getHexCenter(token.gridX, token.gridY, hexSize);
    const center = { x: mapX + rel.x, y: mapY + rel.y };
    const rect = containerRef.current.getBoundingClientRect();
    const newPanX = rect.width / 2 - center.x * zoom;
    const newPanY = rect.height / 2 - center.y * zoom;
    updateViewport({ panX: Math.round(newPanX), panY: Math.round(newPanY) });
    setSelectedTokenId(token.id);
  };

  // Handle token click: apenas seleciona o token e seu NPC (sem abrir popover intrusivo)
  const handleTokenClick = (e: React.MouseEvent, token: TacticalToken) => {
    if (activeTool !== 'select') return;
    e.stopPropagation();
    setSelectedTokenId(token.id);
    onSelectNpc(token.npcId);
    setPopoverToken(null);
    if (contextMenu) setContextMenu(null);
  };

  // Handle token drag start
  const handleTokenMouseDown = (e: React.MouseEvent, token: TacticalToken) => {
    if (activeTool !== 'select') return;
    if (e.button !== 0 || token.isPinned || rotatingTokenId) return;
    const tokenNpc = characterMap.get(token.npcId);
    const canEditToken = isMaster || hasEditPermission;
    if (!canEditToken) return;
    e.stopPropagation();
    if (contextMenu) setContextMenu(null);
    setDraggedTokenId(token.id);
    setDragTokenOrigin({ col: token.gridX, row: token.gridY });
    setDragHoverHex({ col: token.gridX, row: token.gridY });
    setSelectedTokenId(token.id);
    onSelectNpc(token.npcId);
    setPopoverToken(null);
  };

  // Handle token rotation start via pauzinho (Roll20 rotation handle)
  const handleRotationMouseDown = (e: React.MouseEvent, token: TacticalToken) => {
    if (e.button !== 0 || token.isPinned) return;
    const canEditToken = isMaster || hasEditPermission;
    if (!canEditToken) return;
    e.stopPropagation();
    e.preventDefault();
    if (contextMenu) setContextMenu(null);
    setRotatingTokenId(token.id);
    setSelectedTokenId(token.id);
    setDraggedTokenId(null);
    setDragTokenOrigin(null);
    setPopoverToken(null);
  };

  // Excluir marcador individual do mapa
  const handleDeleteMarker = (id: string) => {
    onUpdateTacticalState({
      markers: (tacticalState.markers || []).filter((m) => m.id !== id),
    });
  };

  // Alternar camada do marcador entre Tokens (J) e GM (M)
  const handleToggleMarkerLayer = (id: string) => {
    const updatedMarkers = (tacticalState.markers || []).map((m) => {
      if (m.id !== id) return m;
      const currentLayer = m.layer || 'tokens';
      const nextLayer: 'tokens' | 'gm' = currentLayer === 'gm' ? 'tokens' : 'gm';
      return { ...m, layer: nextLayer };
    });
    onUpdateTacticalState({ markers: updatedMarkers });
  };

  // Clear ruler & markers
  const handleClearMarkers = () => {
    setRulerStart(null);
    setRulerCurrent(null);
    setAreaCenter(null);
    onUpdateTacticalState({ markers: [] });
  };

  // Fixar medição tática na mesa (compartilhado na camada Tokens para todos os jogadores)
  const handleFixRulerMarker = () => {
    if (!rulerStart || !rulerCurrent) return;
    const distanceYards = getHexDistance(rulerStart, rulerCurrent);
    const rangePenalty = getGurpsRangePenalty(distanceYards);
    const newMarker: TacticalMarker = {
      id: `ruler-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: 'ruler',
      startX: rulerStart.col,
      startY: rulerStart.row,
      endX: rulerCurrent.col,
      endY: rulerCurrent.row,
      radius: distanceYards,
      color: '#f59e0b',
      label: `${distanceYards} yd (${rangePenalty >= 0 ? `+${rangePenalty}` : rangePenalty})`,
      layer: activeLayer === 'gm' ? 'gm' : 'tokens',
      authorName: currentUserRole === 'mestre' ? 'Mestre' : 'Jogador',
    };
    onUpdateTacticalState({
      markers: [...(tacticalState.markers || []), newMarker],
    });
    setRulerStart(null);
    setRulerCurrent(null);
    setActiveTool('select');
  };

  const handleClearRulerMarkers = () => {
    setRulerStart(null);
    setRulerCurrent(null);
    const remaining = (tacticalState.markers || []).filter((m) => m.type !== 'ruler');
    onUpdateTacticalState({ markers: remaining });
  };

  const handleClearAreaMarkers = () => {
    setAreaCenter(null);
    const remaining = (tacticalState.markers || []).filter((m) => m.type !== 'blast');
    onUpdateTacticalState({ markers: remaining });
  };

  // Background asset URL
  const currentPreset =
    TACTICAL_MAP_PRESETS.find((p) => p.key === tacticalState.backgroundKey) ||
    TACTICAL_MAP_PRESETS[0];

  const mapBackgroundSrc =
    tacticalState.backgroundKey === 'custom'
      ? tacticalState.customImageUrl
      : currentPreset.url;

  // Listas e contagens para o modal de tokens
  const playersList = useMemo(() => characters.filter((c) => c.characterType === 'player'), [characters]);
  const npcsList = useMemo(() => characters.filter((c) => c.characterType !== 'player'), [characters]);
  const placedNpcIdSet = useMemo(() => new Set(tokens.map((t) => t.npcId)), [tokens]);

  const activeCategoryList = useMemo(() => {
    if (tokensModalFilter === 'players') return playersList;
    if (tokensModalFilter === 'npcs') return npcsList;
    return characters;
  }, [tokensModalFilter, playersList, npcsList, characters]);

  const filteredModalCharacters = useMemo(() => {
    let list: NPC[] = characters;
    if (tokensModalFilter === 'players') {
      list = playersList;
    } else if (tokensModalFilter === 'npcs') {
      list = npcsList;
    }

    if (tokensModalSearch.trim()) {
      const q = tokensModalSearch.toLowerCase().trim();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    return list;
  }, [characters, playersList, npcsList, tokensModalFilter, tokensModalSearch]);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={(e) => {
        if (activeTool === 'wall' || activeTool === 'door') {
          e.preventDefault();
        }
      }}
      onDoubleClick={(e) => {
        if (activeTool === 'wall' && isMaster && wallPoints.length >= 2) {
          e.preventDefault();
          handleFinishWall();
        }
      }}
      onMouseLeave={() => {
        if (isPanning) setIsPanning(false);
        if (draggedLightId) {
          setDraggedLightId(null);
          setDragLightPos(null);
        }
        if (draggedPropId) setDraggedPropId(null);
        setMouseMapPos(null);
        if (draggedTokenId) {
          setDraggedTokenId(null);
          setDragTokenOrigin(null);
          setDragHoverHex(null);
        }
        if (fogBoxStart) {
          setFogBoxStart(null);
          setFogBoxCurrent(null);
        }
        if (rotatingTokenId) {
          setRotatingTokenId(null);
          setPreviewRotation(null);
        }
      }}
      onWheel={handleWheel}
      className={`relative w-full h-[calc(100vh-130px)] min-h-[550px] bg-slate-950 overflow-hidden select-none rounded-2xl border border-slate-800 shadow-2xl flex flex-col ${
        isPanning
          ? 'cursor-grabbing'
          : (activeLayer === 'map' || activeTool === 'select')
          ? 'cursor-grab'
          : 'cursor-crosshair'
      }`}
    >
      {/* 1. TOP TOOLBAR */}
      <div
        id="tactical-top-toolbar-container"
        className="absolute top-3 left-3 right-3 z-30 pointer-events-auto"
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <TacticalToolbar
          tacticalState={tacticalState}
          zoom={zoom}
          onUpdateTacticalState={onUpdateTacticalState}
          activeTool={activeTool}
          onSelectTool={(tool) => {
            setActiveTool(tool);
            if (tool !== 'ruler') {
              setRulerStart(null);
              setRulerCurrent(null);
            }
          }}
          onResetView={handleResetView}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onClearMarkers={handleClearMarkers}
          onAutoPlaceTokens={handleAutoPlaceTokens}
          onOpenTokensModal={() => setIsTokensModalOpen(true)}
          tokensCount={tokens.length}
          onOpenPropsModal={() => setIsPropsModalOpen(true)}
          propsCount={(tacticalState.props || []).length}
          currentUserRole={currentUserRole}
          onOpenPlayerPermissions={onOpenPlayerPermissions}
          editorCount={editorCount}
          users={users}
          editorUserIds={editorUserIds}
          onTogglePlayerPermission={onTogglePlayerPermission}
          onSetAllPlayerPermissions={onSetAllPlayerPermissions}
          wallPointsCount={wallPoints.length}
          onFinishWall={handleFinishWall}
          onCancelWall={handleCancelWall}
          onUndoWallPoint={handleUndoWallPoint}
          onCloseWallPolygon={handleCloseWallPolygon}
          selectedWallId={selectedWallId}
          onSelectWall={setSelectedWallId}
          onClearWalls={handleClearWalls}
          onDeleteWall={handleDeleteWall}
          selectedDoorId={selectedDoorId}
          onSelectDoor={setSelectedDoorId}
          onClearDoors={handleClearDoors}
          onDeleteDoor={handleDeleteDoor}
          onToggleDoor={handleToggleDoor}
          onToggleAllDoors={handleToggleAllDoors}
          fogBrushMode={fogBrushMode}
          onSetFogBrushMode={setFogBrushMode}
          fogSubTool={fogSubTool}
          onSetFogSubTool={setFogSubTool}
          fogShape={fogShape}
          onSetFogShape={setFogShape}
          fogCircleRadius={fogCircleRadius}
          onSetFogCircleRadius={setFogCircleRadius}
          fogPolyPointsCount={fogPolyPoints.length}
          onCloseFogPolygon={() => handleFinishFogPolygon()}
          onUndoFogPolyPoint={handleUndoFogPolyPoint}
          onCancelFogPolygon={handleCancelFogPolygon}
          lightAction={lightAction}
          onSetLightAction={setLightAction}
          onRevealAllFog={handleRevealAllFog}
          onHideAllFog={handleHideAllFog}
          onAddLightAtCenter={handleAddLightAtCenter}
          customLightRadius={customLightRadius}
          onSetCustomLightRadius={setCustomLightRadius}
          customLightColor={customLightColor}
          onSetCustomLightColor={setCustomLightColor}
          customLightAngle={customLightAngle}
          onSetCustomLightAngle={setCustomLightAngle}
          customLightRotation={customLightRotation}
          onSetCustomLightRotation={setCustomLightRotation}
          rulerType={rulerType}
          onSetRulerType={setRulerType}
          rulerMode={rulerMode}
          onSetRulerMode={setRulerMode}
          rulerFixedYards={rulerFixedYards}
          onSetRulerFixedYards={setRulerFixedYards}
          onFixRulerMarker={handleFixRulerMarker}
          onClearRulerMarkers={handleClearRulerMarkers}
          hasActiveRuler={!!(rulerStart && rulerCurrent)}
          keepMeasurementsOnMap={keepMeasurementsOnMap}
          onSetKeepMeasurementsOnMap={setKeepMeasurementsOnMap}
          activeRulerMarkersCount={(tacticalState.markers || []).filter((m) => m.type === 'ruler').length}
          areaRadius={areaRadius}
          onSetAreaRadius={setAreaRadius}
          areaColor={areaColor}
          onSetAreaColor={setAreaColor}
          onClearAreaMarkers={handleClearAreaMarkers}
          isLogCollapsed={isLogCollapsed}
          onToggleLogCollapse={onToggleLogCollapse}
          isPlayerView={isPlayerView}
          onTogglePlayerView={() => setPreviewAsPlayer((p) => !p)}
        />
      </div>

      {/* 2. MODAL DE SELEÇÃO E GERENCIAMENTO DE TOKENS NO TABULEIRO */}
      {isTokensModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setIsTokensModalOpen(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden text-slate-100 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/70">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Users size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Tokens no Tabuleiro
                    <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                      {tokens.length} no grid
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Selecione quais personagens e NPCs exibir ou ocultar no tabuleiro de combate
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTokensModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Barra de Filtros e Busca */}
            <div className="p-3.5 sm:px-5 border-b border-slate-800 space-y-3 bg-slate-900/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                {/* Abas de Filtro */}
                <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setTokensModalFilter('all')}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                      tokensModalFilter === 'all'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>Todos</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      tokensModalFilter === 'all' ? 'bg-slate-950/20 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {characters.filter((c) => placedNpcIdSet.has(c.id)).length}/{characters.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTokensModalFilter('players')}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                      tokensModalFilter === 'players'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>Personagens</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      tokensModalFilter === 'players' ? 'bg-slate-950/20 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {playersList.filter((c) => placedNpcIdSet.has(c.id)).length}/{playersList.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTokensModalFilter('npcs')}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                      tokensModalFilter === 'npcs'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>NPCs</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      tokensModalFilter === 'npcs' ? 'bg-slate-950/20 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {npcsList.filter((c) => placedNpcIdSet.has(c.id)).length}/{npcsList.length}
                    </span>
                  </button>
                </div>

                {/* Campo de Busca */}
                <div className="relative flex-1 sm:max-w-xs">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={tokensModalSearch}
                    onChange={(e) => setTokensModalSearch(e.target.value)}
                    placeholder="Buscar por nome..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                  />
                  {tokensModalSearch && (
                    <button
                      type="button"
                      onClick={() => setTokensModalSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Botões de Ação em Lote para o Filtro Ativo */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs">
                <span className="text-[11px] text-slate-400 font-medium">
                  {tokensModalFilter === 'all'
                    ? 'Ações para todos os combatentes:'
                    : tokensModalFilter === 'players'
                    ? 'Ações para os personagens dos jogadores:'
                    : 'Ações para os NPCs / Criaturas:'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePlaceAllInFilter(activeCategoryList)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/80 rounded-lg transition-all active:scale-95 shadow-xs"
                    title="Exibir todos os combatentes deste filtro no tabuleiro"
                  >
                    <CheckCheck size={14} />
                    <span>Exibir Todos deste filtro</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveAllInFilter(activeCategoryList)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded-lg transition-all active:scale-95 shadow-xs"
                    title="Remover todos os combatentes deste filtro do tabuleiro"
                  >
                    <EyeOff size={14} />
                    <span>Ocultar Todos deste filtro</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Lista com Rolagem */}
            <div className="flex-1 overflow-y-auto p-3.5 sm:px-5 space-y-2 max-h-[50vh]">
              {filteredModalCharacters.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs bg-slate-950/40 rounded-xl border border-dashed border-slate-800 p-6 space-y-1">
                  <Users size={24} className="mx-auto text-slate-600 mb-2" />
                  <p className="font-semibold text-slate-300">Nenhum combatente encontrado</p>
                  <p className="text-[11px] text-slate-500">Tente ajustar o termo da busca ou trocar de filtro.</p>
                </div>
              ) : (
                filteredModalCharacters.map((char) => {
                  const isPlaced = placedNpcIdSet.has(char.id);
                  const isPlayer = char.characterType === 'player';
                  const hp = typeof char.hpCurrent === 'number' ? char.hpCurrent : (char.hpMax || 0);
                  const hpMax = char.hpMax || 0;
                  const fp = typeof char.fpCurrent === 'number' ? char.fpCurrent : (char.fpMax || 0);
                  const fpMax = char.fpMax || 0;

                  return (
                    <div
                      key={char.id}
                      onClick={() => handleToggleTokenPlacement(char.id)}
                      className={`p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                        isPlaced
                          ? 'bg-amber-950/20 border-amber-500/40 hover:bg-amber-950/30 shadow-sm'
                          : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 hover:bg-slate-950/80'
                      }`}
                      title={isPlaced ? `Clique para remover ${char.name} do tabuleiro` : `Clique para posicionar ${char.name} no tabuleiro`}
                    >
                      {/* Avatar e Informações */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-slate-700 bg-slate-900 flex items-center justify-center">
                          <NpcAvatar
                            avatar={char.avatar}
                            preset={char.avatarPreset}
                            name={char.name}
                            size="sm"
                            className="!w-9 !h-9 !rounded-full"
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs truncate">
                              {char.name}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                              isPlayer
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}>
                              {isPlayer ? 'Jogador' : 'NPC'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 mt-0.5">
                            <span className="text-emerald-400 font-semibold">{hp}/{hpMax} PV</span>
                            <span className="text-slate-600">•</span>
                            <span className="text-cyan-400 font-semibold">{fp}/{fpMax} FP</span>
                          </div>
                        </div>
                      </div>

                      {/* Botão de Status / Toggle */}
                      <div className="shrink-0">
                        {isPlaced ? (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 text-xs font-bold shadow-xs">
                            <Check size={13} strokeWidth={2.5} />
                            <span>No Tabuleiro</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 text-slate-400 border border-slate-700 text-xs font-medium hover:text-white hover:bg-slate-750">
                            <Plus size={13} />
                            <span>Oculto (Fora)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Rodapé do Modal */}
            <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                <strong className="text-amber-400 font-mono">{tokens.length}</strong> de {characters.length} combatentes no grid
              </span>
              <button
                type="button"
                onClick={() => setIsTokensModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all shadow-md active:scale-95"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. CANVAS / SVG ENGINE PRINCIPAL */}
      <svg
        ref={svgRef}
        className="w-full h-full flex-1"
        style={{
          backgroundColor: '#090d16',
        }}
      >
        <defs>
          {/* Padrões procedurais para Masmorra, Floresta, etc. */}
          <pattern id="grid-dungeon" width="80" height="80" patternUnits="userSpaceOnUse">
            <rect width="80" height="80" fill="#1e293b" />
            <path
              d="M 80 0 L 0 0 0 80 M 40 0 L 40 80 M 0 40 L 80 40"
              fill="none"
              stroke="#0f172a"
              strokeWidth="2"
            />
          </pattern>

          <pattern id="grid-forest" width="100" height="100" patternUnits="userSpaceOnUse">
            <rect width="100" height="100" fill="#064e3b" />
            <circle cx="25" cy="25" r="14" fill="#047857" opacity="0.4" />
            <circle cx="75" cy="70" r="18" fill="#047857" opacity="0.3" />
            <circle cx="50" cy="85" r="10" fill="#022c22" opacity="0.5" />
          </pattern>

          <pattern id="grid-tavern" width="60" height="60" patternUnits="userSpaceOnUse">
            <rect width="60" height="60" fill="#451a03" />
            <line x1="0" y1="15" x2="60" y2="15" stroke="#290e02" strokeWidth="2" />
            <line x1="0" y1="30" x2="60" y2="30" stroke="#290e02" strokeWidth="2" />
            <line x1="0" y1="45" x2="60" y2="45" stroke="#290e02" strokeWidth="2" />
          </pattern>

          <pattern id="grid-arena" width="70" height="70" patternUnits="userSpaceOnUse">
            <rect width="70" height="70" fill="#78350f" />
            <circle cx="35" cy="35" r="28" fill="#92400e" opacity="0.2" />
          </pattern>

          {/* Limite exato da imagem base para a grade não sobrar para fora */}
          <clipPath id="map-image-bounds">
            <rect x={mapX} y={mapY} width={mapW} height={mapH} />
          </clipPath>

          {/* Ponta de seta tática para medições */}
          <marker
            id="ruler-arrow"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f59e0b" />
          </marker>

          {/* Gradientes radiais para focos de luz fixos (glow visual atenuando) */}
          {(tacticalState.lights || []).map((light) => {
            const center = getLightCenter(light);
            const radiusPixels = (light.radius || 4) * hexWidth * 0.95;

            return (
              <radialGradient
                key={`grad-light-${light.id}`}
                id={`light-glow-${light.id}`}
                gradientUnits="userSpaceOnUse"
                cx={center.x}
                cy={center.y}
                r={radiusPixels}
              >
                <stop offset="0%" stopColor={light.color || '#f59e0b'} stopOpacity={0.06} />
                <stop offset="50%" stopColor={light.color || '#f59e0b'} stopOpacity={0.03} />
                <stop offset="100%" stopColor={light.color || '#f59e0b'} stopOpacity={0} />
              </radialGradient>
            );
          })}

          {/* Gradientes radiais para a máscara da névoa (luz dissipa suavemente até a escuridão na borda sem linhas duras ou sobreposições escuras) */}
          {(tacticalState.lights || []).map((light) => {
            const center = getLightCenter(light);
            const radiusPixels = (light.radius || 4) * hexWidth * 0.95;

            return (
              <radialGradient
                key={`mask-grad-light-${light.id}`}
                id={`fog-light-attenuation-${light.id}`}
                gradientUnits="userSpaceOnUse"
                cx={center.x}
                cy={center.y}
                r={radiusPixels}
              >
                <stop offset="0%" stopColor="#000000" stopOpacity="1" />
                <stop offset="45%" stopColor="#000000" stopOpacity="0.85" />
                <stop offset="75%" stopColor="#000000" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </radialGradient>
            );
          })}

          {/* Gradientes radiais para tokens com luz própria */}
          {tokens.map((token) => {
            if (!isTokenEmittingLight(token)) return null;
            const radiusYards = getTokenLightRadius(token);
            if (radiusYards <= 0) return null;
            const displayGridX = draggedTokenId === token.id && dragHoverHex ? dragHoverHex.col : token.gridX;
            const displayGridY = draggedTokenId === token.id && dragHoverHex ? dragHoverHex.row : token.gridY;
            const relCenter = getHexCenter(displayGridX, displayGridY, hexSize);
            const radiusPixels = radiusYards * hexWidth * 0.95;
            const center = { x: mapX + relCenter.x, y: mapY + relCenter.y };

            return (
              <React.Fragment key={`token-grads-${token.id}`}>
                <radialGradient
                  id={`token-light-glow-${token.id}`}
                  gradientUnits="userSpaceOnUse"
                  cx={center.x}
                  cy={center.y}
                  r={radiusPixels}
                >
                  <stop offset="0%" stopColor={token.lightColor || '#f59e0b'} stopOpacity={0.06} />
                  <stop offset="50%" stopColor={token.lightColor || '#f59e0b'} stopOpacity={0.03} />
                  <stop offset="100%" stopColor={token.lightColor || '#f59e0b'} stopOpacity={0} />
                </radialGradient>

                <radialGradient
                  id={`fog-token-attenuation-${token.id}`}
                  gradientUnits="userSpaceOnUse"
                  cx={center.x}
                  cy={center.y}
                  r={radiusPixels}
                >
                  <stop offset="0%" stopColor="#000000" stopOpacity="1" />
                  <stop offset="45%" stopColor="#000000" stopOpacity="0.85" />
                  <stop offset="75%" stopColor="#000000" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                </radialGradient>
              </React.Fragment>
            );
          })}

          {/* CLIPPATHS PARA REVELAÇÕES CRONOLÓGICAS DE NÉVOA */}
          {tacticalState.fogEnabled && (tacticalState.fogRects || []).map((r, idx) => {
            if (r.mode !== 'reveal') return null;
            const clipId = `fog-reveal-clip-${r.id || `idx-${idx}`}`;
            if (r.shape === 'circle') {
              const rad = r.radius || ((r.radiusYards || 5) * hexWidth * 0.95);
              return (
                <clipPath id={clipId} key={clipId}>
                  <circle cx={mapX + r.x} cy={mapY + r.y} r={rad} />
                </clipPath>
              );
            }
            if (r.shape === 'polygon' && r.points && r.points.length >= 3) {
              return (
                <clipPath id={clipId} key={clipId}>
                  <polygon points={r.points.map((pt) => `${mapX + pt.x},${mapY + pt.y}`).join(' ')} />
                </clipPath>
              );
            }
            return (
              <clipPath id={clipId} key={clipId}>
                <rect x={mapX + r.x} y={mapY + r.y} width={r.width} height={r.height} />
              </clipPath>
            );
          })}

          {/* MÁSCARA DA NÉVOA DE GUERRA (LINHAS RETANGULARES PURAS E FOCOS DE LUZ COM DEGRADÊ SUAVE) */}
          {tacticalState.fogEnabled && (() => {
            // Helper para renderizar a forma de uma área de névoa (retângulo, círculo ou polígono)
            const renderFogShape = (r: TacticalFogRect, fill: string, key: string) => {
              if (r.shape === 'circle') {
                const rad = r.radius || ((r.radiusYards || 5) * hexWidth * 0.95);
                return (
                  <circle
                    key={key}
                    cx={mapX + r.x}
                    cy={mapY + r.y}
                    r={rad}
                    fill={fill}
                  />
                );
              }
              if (r.shape === 'polygon' && r.points && r.points.length >= 3) {
                return (
                  <polygon
                    key={key}
                    points={r.points.map((pt) => `${mapX + pt.x},${mapY + pt.y}`).join(' ')}
                    fill={fill}
                  />
                );
              }
              return (
                <rect
                  key={key}
                  x={mapX + r.x}
                  y={mapY + r.y}
                  width={r.width}
                  height={r.height}
                  fill={fill}
                />
              );
            };

            // Helper para renderizar a camada de iluminação (focos de luz, halos pessoais e tochas dos tokens)
            // Preto (#000000) na máscara remove a névoa e torna o terreno visível
            const renderLightingMaskElements = (prefix: string) => (
              <g key={`lighting-elements-${prefix}`}>
                {/* 1. Focos de luz fixos ativos no mapa (contidos por paredes e portas e filtrados por linha de visão) */}
                {(tacticalState.lights || []).map((light) => {
                  if (light.active === false || (light.radius || 0) <= 0 || !isLightVisibleToPlayer(light)) return null;
                  const center = getLightCenter(light);
                  const radiusPixels = (light.radius || 4) * hexWidth * 0.95;
                  const visPath = lightVisibilityPaths[light.id];

                  if (visPath) {
                    return (
                      <path
                        key={`${prefix}-light-mask-${light.id}`}
                        d={visPath}
                        fill="#000000"
                      />
                    );
                  }

                  if (light.angle && light.angle < 360) {
                    return (
                      <path
                        key={`${prefix}-light-mask-${light.id}`}
                        d={getCircleSectorPath(center.x, center.y, radiusPixels, light.angle, light.rotation ?? 0)}
                        fill={`url(#fog-light-attenuation-${light.id})`}
                      />
                    );
                  }

                  return (
                    <circle
                      key={`${prefix}-light-mask-${light.id}`}
                      cx={center.x}
                      cy={center.y}
                      r={radiusPixels}
                      fill={`url(#fog-light-attenuation-${light.id})`}
                    />
                  );
                })}

                {/* 2. Iluminação mínima pessoal (1 jarda) para cada combatente visível */}
                {tokens.map((token) => {
                  if (isPlayerView && (token.hiddenFromPlayers || token.layer === 'gm')) return null;
                  const displayGridX = draggedTokenId === token.id && dragHoverHex ? dragHoverHex.col : token.gridX;
                  const displayGridY = draggedTokenId === token.id && dragHoverHex ? dragHoverHex.row : token.gridY;
                  const relCenter = getHexCenter(displayGridX, displayGridY, hexSize);
                  const personalRadius = hexWidth * 0.95;

                  return (
                    <circle
                      key={`${prefix}-token-personal-halo-${token.id}`}
                      cx={mapX + relCenter.x}
                      cy={mapY + relCenter.y}
                      r={personalRadius}
                      fill="#000000"
                    />
                  );
                })}

                {/* 3. Tokens com luz própria (tochas / lanternas / raio de iluminação configurado) */}
                {tokens.map((token) => {
                  if (!isTokenEmittingLight(token)) return null;
                  const radiusYards = getTokenLightRadius(token);
                  if (radiusYards <= 0) return null;
                  if (isPlayerView && (token.hiddenFromPlayers || token.layer === 'gm')) return null;
                  const displayGridX = draggedTokenId === token.id && dragHoverHex ? dragHoverHex.col : token.gridX;
                  const displayGridY = draggedTokenId === token.id && dragHoverHex ? dragHoverHex.row : token.gridY;
                  const relCenter = getHexCenter(displayGridX, displayGridY, hexSize);
                  const radiusPixels = radiusYards * hexWidth * 0.95;
                  const visPath = tokenLightVisibilityPaths[token.id];

                  if (visPath) {
                    return (
                      <path
                        key={`${prefix}-token-light-mask-${token.id}`}
                        d={visPath}
                        fill="#000000"
                      />
                    );
                  }

                  if (token.lightAngle && token.lightAngle < 360) {
                    const isRotating = rotatingTokenId === token.id;
                    const tokenRotation = isRotating && previewRotation && previewRotation.id === token.id
                      ? previewRotation.rotation
                      : (typeof token.rotation === 'number'
                          ? token.rotation
                          : ((token.facing * 60 + 180) % 360));
                    const facingAngleDegrees = ((tokenRotation + 90) % 360 + 360) % 360;
                    return (
                      <path
                        key={`${prefix}-token-light-mask-${token.id}`}
                        d={getCircleSectorPath(mapX + relCenter.x, mapY + relCenter.y, radiusPixels, token.lightAngle, facingAngleDegrees)}
                        fill="#000000"
                      />
                    );
                  }

                  return (
                    <circle
                      key={`${prefix}-token-light-mask-${token.id}`}
                      cx={mapX + relCenter.x}
                      cy={mapY + relCenter.y}
                      r={radiusPixels}
                      fill="#000000"
                    />
                  );
                })}

                {/* 4. Tokens com Visão Liberada (hasInfiniteVision): enxergam tudo em sua linha de visão */}
                {tokens.map((token) => {
                  if (!token.hasInfiniteVision) return null;
                  if (isPlayerView && (token.hiddenFromPlayers || token.layer === 'gm')) return null;
                  const visPath = tokenLightVisibilityPaths[token.id];
                  if (!visPath) return null;
                  return (
                    <path
                      key={`${prefix}-token-inf-vision-${token.id}`}
                      d={visPath}
                      fill="#000000"
                    />
                  );
                })}
              </g>
            );

            return (
              <mask
                id="tactical-fog-mask"
                maskUnits="userSpaceOnUse"
                maskContentUnits="userSpaceOnUse"
                x={mapX}
                y={mapY}
                width={mapW}
                height={mapH}
              >
                {/* 1. Base branca cobre todo o mapa de névoa (branco = névoa 100% opaca) */}
                <rect x={mapX} y={mapY} width={mapW} height={mapH} fill="#ffffff" />

                {/* CASO 1: NÃO USAR ILUMINAÇÃO COMO FATOR DE VISÃO (useLightingVision === false) */}
                {/* Ordem cronológica estrita: a última ação na área prevalece (revelar = preto, ocultar = branco) */}
                {tacticalState.useLightingVision === false && (
                  <>
                    {(tacticalState.fogRects || []).map((r, idx) => {
                      const isReveal = r.mode === 'reveal';
                      return renderFogShape(r, isReveal ? '#000000' : '#ffffff', `fog-action-${r.id || idx}`);
                    })}

                    {/* Retrocompatibilidade com células reveladas antes */}
                    {(tacticalState.fogRevealedCells || []).map((cellKey) => {
                      const [cStr, rStr] = cellKey.split(',');
                      const c = parseInt(cStr, 10);
                      const r = parseInt(rStr, 10);
                      if (isNaN(c) || isNaN(r)) return null;
                      const relCenter = getHexCenter(c, r, hexSize);
                      return (
                        <polygon
                          key={`old-cell-${cellKey}`}
                          points={getHexPointsString({ x: mapX + relCenter.x, y: mapY + relCenter.y }, hexSize)}
                          fill="#000000"
                        />
                      );
                    })}
                  </>
                )}

                {/* CASO 2: USAR ILUMINAÇÃO COMO FATOR DE VISÃO (useLightingVision !== false) */}
                {/* "os jogadores só enxergam o que estiver na sua visão e tiver dentro do raio da iluminação" */}
                {/* A iluminação dos personagens é estritamente respeitada (Mostrar Áreas não concede visão no escuro além da luz) */}
                {tacticalState.useLightingVision !== false && (
                  <>
                    {/* Camada de luz base dos personagens e tochas */}
                    {renderLightingMaskElements('base')}

                    {/* Ações cronológicas do mestre:
                        - 'hide': desenha branco (#ffffff) por cima, forçando a área a ficar oculta da visão/luz dos jogadores.
                        - 'reveal': aplica clipPath da forma e restaura a iluminação (#000000) apenas onde houver tochas/visão nela!
                          As partes sem luz dentro da forma continuam escuras (#ffffff), impedindo que o jogador enxergue no escuro além de sua luz.
                    */}
                    {(tacticalState.fogRects || []).map((r, idx) => {
                      const key = `fog-action-${r.id || idx}`;
                      if (r.mode === 'hide') {
                        return renderFogShape(r, '#ffffff', key);
                      }
                      const clipId = `fog-reveal-clip-${r.id || `idx-${idx}`}`;
                      return (
                        <g key={key} clipPath={`url(#${clipId})`}>
                          {renderLightingMaskElements(`restored-${r.id || idx}`)}
                        </g>
                      );
                    })}
                  </>
                )}
              </mask>
            );
          })()}
        </defs>

        {/* Grupo com Pan & Zoom transform */}
        <g
          transform={`translate(${panX}, ${panY}) scale(${zoom})`}
        >
          {/* CAMADA 1: FUNDO DO MAPA (ROLL20 MAP LAYER) */}
          {(() => {
            const isMapActive = activeLayer === 'map';

            return (
              <g id="tactical-map-layer">
                {mapBackgroundSrc ? (() => {
                  const rot = (tacticalState.mapRotation || 0) % 360;
                  let imgTransform: string | undefined = undefined;
                  let imgW = mapW;
                  let imgH = mapH;

                  if (rot === 90) {
                    imgTransform = `translate(${mapW}, 0) rotate(90)`;
                    imgW = mapH;
                    imgH = mapW;
                  } else if (rot === 180) {
                    imgTransform = `translate(${mapW}, ${mapH}) rotate(180)`;
                    imgW = mapW;
                    imgH = mapH;
                  } else if (rot === 270) {
                    imgTransform = `translate(0, ${mapH}) rotate(270)`;
                    imgW = mapH;
                    imgH = mapW;
                  }

                  return (
                    <g transform={imgTransform}>
                      <image
                        id="map-background"
                        href={mapBackgroundSrc}
                        x={mapX}
                        y={mapY}
                        width={imgW}
                        height={imgH}
                        preserveAspectRatio="xMidYMid meet"
                        opacity={isMapActive ? "1" : "0.95"}
                        onDragStart={(e) => e.preventDefault()}
                        style={{ userSelect: 'none', pointerEvents: isMapActive ? 'auto' : 'none' }}
                        onLoad={(e) => {
                          const img = e.currentTarget as unknown as HTMLImageElement;
                          if (img.naturalWidth && img.naturalHeight) {
                            if (!tacticalState.mapImageWidth || !tacticalState.mapImageHeight) {
                              onUpdateTacticalState({
                                mapImageWidth: img.naturalWidth,
                                mapImageHeight: img.naturalHeight,
                              });
                            }
                          }
                        }}
                      />
                    </g>
                  );
                })() : (
                  <TacticalIllustrativePresets
                    backgroundKey={tacticalState.backgroundKey}
                    x={mapX}
                    y={mapY}
                    width={mapW}
                    height={mapH}
                  />
                )}

                {/* Contorno de Calibração da Camada do Mapa (Roll20 Map Layer Outline) */}
                {isMapActive && isMaster && (
                  <g pointerEvents="none">
                    <rect
                      x={mapX}
                      y={mapY}
                      width={mapW}
                      height={mapH}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      strokeDasharray="8 5"
                    />
                    {/* Alças nos 4 cantos */}
                    <rect x={mapX - 5} y={mapY - 5} width="10" height="10" fill="#f59e0b" stroke="#000" strokeWidth="1" />
                    <rect x={mapX + mapW - 5} y={mapY - 5} width="10" height="10" fill="#f59e0b" stroke="#000" strokeWidth="1" />
                    <rect x={mapX - 5} y={mapY + mapH - 5} width="10" height="10" fill="#f59e0b" stroke="#000" strokeWidth="1" />
                    <rect x={mapX + mapW - 5} y={mapY + mapH - 5} width="10" height="10" fill="#f59e0b" stroke="#000" strokeWidth="1" />

                    {/* Tarja indicativa da Camada do Mapa */}
                    <g transform={`translate(${mapX + 12}, ${mapY + 22})`}>
                      <rect x="0" y="-14" width="370" height="22" rx="4" fill="#020617" fillOpacity="0.88" stroke="#f59e0b" strokeWidth="1" />
                      <text x="10" y="0" fill="#fef3c7" fontSize="11" fontWeight="bold">
                        🗺️ Camada 1: Mapa Base (Arraste para navegar pelo mapa | Grade Quadrada)
                      </text>
                    </g>
                  </g>
                )}
              </g>
            );
          })()}

          {/* CAMADA DE ELEMENTOS DE CENÁRIO (PROPS / MOBÍLIA - ESTILO ROLL20) */}
          <TacticalPropsRenderer
            props={
              dragPropPos
                ? (tacticalState.props || []).map((p) =>
                    p.id === dragPropPos.id ? { ...p, x: dragPropPos.x, y: dragPropPos.y } : p
                  )
                : tacticalState.props || []
            }
            selectedPropId={selectedPropId}
            onSelectProp={setSelectedPropId}
            onStartDragProp={handleStartDragProp}
            onRotateProp={handleRotateProp}
            onResizeProp={handleResizeProp}
            onToggleLockProp={handleToggleLockProp}
            onDuplicateProp={handleDuplicateProp}
            onDeleteProp={handleDeleteProp}
            activeLayer={activeLayer}
            isMaster={isMaster}
          />

          {/* CAMADA 2: GRADE TÁTICA HEXAGONAL - COBRE TODA A IMAGEM (1 ÚNICO ELEMENTO PATH ULTRARRÁPIDO) */}
          <g id="tactical-hex-grid" clipPath="url(#map-image-bounds)" pointerEvents="none">
            <path
              d={hexGridPath}
              fill="none"
              stroke={tacticalState.gridColor || '#cbd5e1'}
              strokeWidth={1}
              strokeOpacity={tacticalState.gridOpacity ?? 0.28}
            />
            {/* Hexágono em destaque onde o mouse está posicionado (renderizado sob demanda) */}
            {hoveredHex && (
              <polygon
                points={getHexPointsString(
                  {
                    x: mapX + getHexCenter(hoveredHex.col, hoveredHex.row, hexSize).x,
                    y: mapY + getHexCenter(hoveredHex.col, hoveredHex.row, hexSize).y,
                  },
                  hexSize
                )}
                fill="rgba(245, 158, 11, 0.16)"
                stroke="#f59e0b"
                strokeWidth={1.5}
                strokeOpacity={0.75}
              />
            )}
          </g>

          {/* CAMADA 3: FOCOS DE LUZ (RADIAÇÃO & BRILHO AMBIENTE NO TABULEIRO - CONTIDO POR PAREDES E PORTAS) */}
          <g id="tactical-lights-glow" pointerEvents="none">
            {/* Brilho dos focos de luz fixos */}
            {(tacticalState.lights || []).map((light) => {
              if (light.active === false || light.radius <= 0 || !isLightVisibleToPlayer(light)) return null;
              const center = getLightCenter(light);
              const radiusPixels = light.radius * hexWidth * 0.95;
              const visPath = lightVisibilityPaths[light.id];

              if (visPath) {
                return (
                  <path
                    key={`glow-${light.id}`}
                    d={visPath}
                    fill={`url(#light-glow-${light.id})`}
                  />
                );
              }

              if (light.angle && light.angle < 360) {
                return (
                  <path
                    key={`glow-${light.id}`}
                    d={getCircleSectorPath(center.x, center.y, radiusPixels, light.angle, light.rotation ?? 0)}
                    fill={`url(#light-glow-${light.id})`}
                  />
                );
              }

              return (
                <circle
                  key={`glow-${light.id}`}
                  cx={center.x}
                  cy={center.y}
                  r={radiusPixels}
                  fill={`url(#light-glow-${light.id})`}
                />
              );
            })}

            {/* Brilho dos tokens que emitem luz própria */}
            {tokens.map((token) => {
              if (!isTokenEmittingLight(token)) return null;
              const radiusYards = getTokenLightRadius(token);
              if (radiusYards <= 0) return null;
              const displayGridX = draggedTokenId === token.id && dragHoverHex ? dragHoverHex.col : token.gridX;
              const displayGridY = draggedTokenId === token.id && dragHoverHex ? dragHoverHex.row : token.gridY;
              const relCenter = getHexCenter(displayGridX, displayGridY, hexSize);
              const center = { x: mapX + relCenter.x, y: mapY + relCenter.y };
              const radiusPixels = radiusYards * hexWidth * 0.95;
              const visPath = tokenLightVisibilityPaths[token.id];

              if (visPath) {
                return (
                  <path
                    key={`token-glow-${token.id}`}
                    d={visPath}
                    fill={`url(#token-light-glow-${token.id})`}
                  />
                );
              }

              if (token.lightAngle && token.lightAngle < 360) {
                const isRotating = rotatingTokenId === token.id;
                const tokenRotation = isRotating && previewRotation && previewRotation.id === token.id
                  ? previewRotation.rotation
                  : (typeof token.rotation === 'number'
                      ? token.rotation
                      : ((token.facing * 60 + 180) % 360));
                const facingAngleDegrees = ((tokenRotation + 90) % 360 + 360) % 360;
                return (
                  <path
                    key={`token-glow-${token.id}`}
                    d={getCircleSectorPath(center.x, center.y, radiusPixels, token.lightAngle, facingAngleDegrees)}
                    fill={`url(#token-light-glow-${token.id})`}
                  />
                );
              }

              return (
                <circle
                  key={`token-glow-${token.id}`}
                  cx={center.x}
                  cy={center.y}
                  r={radiusPixels}
                  fill={`url(#token-light-glow-${token.id})`}
                />
              );
            })}
          </g>

          {/* CAMADA DE PAREDES (CONTENÇÃO VISUAL E INTERAÇÃO NO TABULEIRO - APENAS NA CAMADA DO MAPA) */}
          {activeLayer === 'map' && (
            <g id="tactical-walls-layer">
              {/* 1. PAREDES POLIGONAIS */}
              {(tacticalState.walls || []).map((wall, wallIdx) => {
              if (!wall.points || wall.points.length < 2) return null;
              const pointsStr = wall.points
                .map((pt) => `${mapX + pt.x},${mapY + pt.y}`)
                .join(' ');
              const strokeColor = wall.color || '#3b82f6';
              const isSelected = selectedWallId === wall.id;
              const labelPt = wall.points[0];

              return (
                <g key={wall.id || `wall-${wallIdx}`} id={`wall-group-${wall.id}`}>
                  {/* Destaque pulsante quando a parede estiver selecionada na lista */}
                  {isSelected && (
                    <g pointerEvents="none">
                      {wall.closed ? (
                        <polygon
                          points={pointsStr}
                          fill="rgba(56, 189, 248, 0.2)"
                          stroke="#38bdf8"
                          strokeWidth={10}
                          strokeDasharray="10 5"
                          className="animate-pulse"
                        />
                      ) : (
                        <polyline
                          points={pointsStr}
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth={10}
                          strokeDasharray="10 5"
                          className="animate-pulse"
                        />
                      )}
                      <g transform={`translate(${mapX + labelPt.x}, ${mapY + labelPt.y - 18})`}>
                        <rect
                          x={-55}
                          y={-11}
                          width={110}
                          height={22}
                          rx={6}
                          fill="#0284c7"
                          stroke="#ffffff"
                          strokeWidth={1.5}
                          filter="drop-shadow(0 2px 6px rgba(0,0,0,0.6))"
                        />
                        <text
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize="10"
                          fontWeight="bold"
                          fill="#ffffff"
                        >
                          📍 Parede {wallIdx + 1}
                        </text>
                      </g>
                    </g>
                  )}

                  {wall.closed ? (
                    <polygon
                      points={pointsStr}
                      fill="rgba(30, 41, 59, 0.4)"
                      stroke={isSelected ? '#38bdf8' : strokeColor}
                      strokeWidth={isSelected ? 6 : 4.5}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      opacity={activeLayer === 'map' ? 0.95 : 0.75}
                      className={activeLayer === 'map' && isMaster ? 'cursor-pointer' : undefined}
                      onClick={(e) => {
                        if (activeLayer === 'map' && isMaster) {
                          e.stopPropagation();
                          setSelectedWallId(wall.id);
                        }
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    />
                  ) : (
                    <polyline
                      points={pointsStr}
                      fill="none"
                      stroke={isSelected ? '#38bdf8' : strokeColor}
                      strokeWidth={isSelected ? 6 : 4.5}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      opacity={activeLayer === 'map' ? 0.95 : 0.75}
                      className={activeLayer === 'map' && isMaster ? 'cursor-pointer' : undefined}
                      onClick={(e) => {
                        if (activeLayer === 'map' && isMaster) {
                          e.stopPropagation();
                          setSelectedWallId(wall.id);
                        }
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    />
                  )}

                  {/* Vértices destacados na Camada do Mapa para o Mestre */}
                  {activeLayer === 'map' && isMaster && (
                    <g className="wall-vertices pointer-events-none">
                      {wall.points.map((pt, pIdx) => (
                        <circle
                          key={`v-${pIdx}`}
                          cx={mapX + pt.x}
                          cy={mapY + pt.y}
                          r={3.5}
                          fill="#ffffff"
                          stroke={strokeColor}
                          strokeWidth={2}
                        />
                      ))}
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        )}

        {/* 2. CAMADA DE PORTAS (VISÍVEIS PARA JOGADORES E MESTRE, TRAVA DE ABRIR/FECHAR APENAS PARA O MESTRE) */}
        <g id="tactical-doors-layer">
          {(tacticalState.doors || []).map((door, doorIdx) => {
              const x1 = mapX + door.x1;
              const y1 = mapY + door.y1;
              const x2 = mapX + door.x2;
              const y2 = mapY + door.y2;
              const midX = (x1 + x2) / 2;
              const midY = (y1 + y2) / 2;
              const angleRad = Math.atan2(y2 - y1, x2 - x1);
              const doorLength = Math.hypot(x2 - x1, y2 - y1);
              const isSelected = selectedDoorId === door.id;

              return (
                <g key={door.id || `door-${doorIdx}`} id={`door-group-${door.id}`}>
                  {/* Destaque pulsante quando a porta estiver selecionada na lista */}
                  {isSelected && (
                    <g pointerEvents="none">
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="#38bdf8"
                        strokeWidth={10}
                        strokeDasharray="6 4"
                        strokeLinecap="round"
                        className="animate-pulse"
                      />
                      <g transform={`translate(${midX}, ${midY - 18})`}>
                        <rect
                          x={-50}
                          y={-10}
                          width={100}
                          height={20}
                          rx={6}
                          fill="#0284c7"
                          stroke="#ffffff"
                          strokeWidth={1.5}
                          filter="drop-shadow(0 2px 6px rgba(0,0,0,0.6))"
                        />
                        <text
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize="10"
                          fontWeight="bold"
                          fill="#ffffff"
                        >
                          📍 Porta {doorIdx + 1}
                        </text>
                      </g>
                    </g>
                  )}

                  {door.isOpen ? (
                    // Porta Aberta: batente sutil tracejado e folha aberta
                    <g pointerEvents="none">
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="#10b981"
                        strokeWidth={2}
                        strokeDasharray="4 3"
                        opacity={0.8}
                      />
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x1 + Math.cos(angleRad + Math.PI / 2) * Math.min(doorLength * 0.8, 30)}
                        y2={y1 + Math.sin(angleRad + Math.PI / 2) * Math.min(doorLength * 0.8, 30)}
                        stroke="#059669"
                        strokeWidth={3.5}
                        strokeLinecap="round"
                      />
                    </g>
                  ) : (
                    // Porta Fechada: barra sólida elegante com borda âmbar refinada
                    <g pointerEvents="none">
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="#451a03"
                        strokeWidth={4.5}
                        strokeLinecap="round"
                      />
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="#d97706"
                        strokeWidth={1.8}
                        strokeLinecap="round"
                      />
                    </g>
                  )}

                  {/* Ícone sutil e compacto de Porta (Abrir / Fechar) */}
                  <g
                    transform={`translate(${midX}, ${midY})`}
                    className={isMaster ? "cursor-pointer select-none group" : "select-none"}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isMaster) return;
                      if (activeLayer === 'map') {
                        setSelectedDoorId(door.id);
                      }
                      handleToggleDoor(door.id);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <title>
                      {isMaster
                        ? (door.isOpen ? 'Porta Aberta (Clique para fechar)' : 'Porta Fechada (Clique para abrir)')
                        : (door.isOpen ? 'Porta Aberta' : 'Porta Fechada')}
                    </title>
                    {/* Círculo base sutil e pequeno (raio 7px em vez de 13px) */}
                    <circle
                      r={7}
                      fill={door.isOpen ? '#064e3b' : '#1e1b4b'}
                      stroke={door.isOpen ? '#34d399' : '#f59e0b'}
                      strokeWidth={1.2}
                      className={isMaster ? "transition-transform group-hover:scale-125" : undefined}
                    />
                    {door.isOpen ? (
                      // Cadeado aberto sutil em vetor SVG
                      <g className="pointer-events-none" transform="scale(0.85)">
                        <rect x={-2.5} y={-1.5} width={5} height={4} rx={1} fill="#34d399" />
                        <path d="M -1.8 -1.5 V -3.2 A 1.8 1.8 0 0 1 1.8 -3.2 V -2" fill="none" stroke="#34d399" strokeWidth={1} strokeLinecap="round" />
                      </g>
                    ) : (
                      // Cadeado fechado sutil em vetor SVG
                      <g className="pointer-events-none" transform="scale(0.85)">
                        <rect x={-2.5} y={-1.5} width={5} height={4} rx={1} fill="#fbbf24" />
                        <path d="M -1.8 -1.5 V -3.2 A 1.8 1.8 0 0 1 1.8 -3.2 V -1.5" fill="none" stroke="#fbbf24" strokeWidth={1} strokeLinecap="round" />
                      </g>
                    )}
                  </g>
                </g>
              );
            })}
          </g>

          {/* ÍCONES DOS FOCOS DE LUZ FIXOS NO TABULEIRO */}
          <g id="tactical-light-sources">
            {(tacticalState.lights || []).map((light) => {
              if (isPlayerView && (!light.active || !isLightVisibleToPlayer(light))) return null;
              const center = getLightCenter(light);
              const isRemoveMode = activeTool === 'fog' && fogSubTool === 'light' && lightAction === 'remove';
              const isDirectional = light.angle && light.angle < 360;

              return (
                <g
                  key={light.id}
                  transform={`translate(${center.x}, ${center.y})`}
                  className={isRemoveMode ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}
                  onMouseDown={(e) => {
                    if (e.button === 0 && !isRemoveMode) {
                      e.stopPropagation();
                      setDraggedLightId(light.id);
                    }
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isRemoveMode) {
                      // Modo de remoção de luz ativo: exclui este foco imediatamente
                      const updated = (tacticalState.lights || []).filter((l) => l.id !== light.id);
                      onUpdateTacticalState({ lights: updated });
                    } else {
                      // Abre o menu contextual da luz com opções de Ligar/Apagar, Girar e Excluir
                      setLightContextMenu({ id: light.id, x: e.clientX, y: e.clientY });
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setLightContextMenu({ id: light.id, x: e.clientX, y: e.clientY });
                  }}
                >
                  <title>{`${light.label || 'Foco de Luz'} (${light.radius} yd • ${light.angle || 360}°) — Arraste para reposicionar | Clique para gerenciar (Ligar/Apagar, Girar, Excluir)`}</title>
                  <circle
                    cx="0"
                    cy="0"
                    r={hexSize * 0.45}
                    fill={isRemoveMode ? '#7f1d1d' : '#020617'}
                    stroke={isRemoveMode ? '#ef4444' : light.active ? (light.color || '#f59e0b') : '#64748b'}
                    strokeWidth="2"
                    opacity="0.9"
                  />
                  {/* Ponteiro direcional indicando a direção para onde o cone/semicírculo aponta */}
                  {isDirectional && (
                    <polygon
                      points="0,-16 -4,-9 4,-9"
                      fill={light.color || '#f59e0b'}
                      transform={`rotate(${((light.rotation ?? 0) + 90)})`}
                    />
                  )}
                  <text
                    x="0"
                    y="4.5"
                    fontSize="13"
                    textAnchor="middle"
                    className="select-none pointer-events-none"
                  >
                    {isRemoveMode ? '❌' : light.angle === 180 ? '🌓' : light.angle === 90 ? '🔦' : light.label === 'Fogueira' ? '🏕️' : light.label === 'Lanterna' ? '🏮' : light.label === 'Magia' ? '✨' : '🔥'}
                  </text>
                </g>
              );
            })}
          </g>

          {/* CAMADA 4: ARCOS DE COMBATE GURPS (FRENTE, FLANCOS E RETAGUARDA) */}
          {selectedToken && (
            <g id="gurps-combat-arcs">
              {(() => {
                const relCenter = getHexCenter(selectedToken.gridX, selectedToken.gridY, hexSize);
                const center = { x: mapX + relCenter.x, y: mapY + relCenter.y };
                const tokenRotation =
                  typeof selectedToken.rotation === 'number'
                    ? selectedToken.rotation
                    : ((selectedToken.facing * 60 + 180) % 360);
                const aimAngle = (tokenRotation + 180) % 360;

                return (
                  <g transform={`translate(${center.x}, ${center.y})`}>
                    {/* Arco Frontal (Verde): 120 graus à frente */}
                    <circle
                      cx="0"
                      cy="0"
                      r={hexSize * 1.6}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="3"
                      strokeOpacity="0.4"
                      strokeDasharray={`${(Math.PI * hexSize * 1.6) / 3} ${
                        (Math.PI * hexSize * 1.6 * 2) / 3
                      }`}
                      transform={`rotate(${aimAngle - 60})`}
                    />
                  </g>
                );
              })()}
            </g>
          )}

          {/* CAMADA 5: MARCADORES E ÁREAS PERSISTENTES NO TABULEIRO */}
          <g id="tactical-persistent-markers">
            {(tacticalState.markers || []).map((marker) => {
              // Marcadores na camada tokens são públicos e visíveis para TODOS (jogadores e mestre).
              // Marcadores na camada GM só são visíveis se isMaster for true.
              const isVisible = isMaster || marker.layer === 'tokens' || !marker.layer;
              if (!isVisible) return null;

              if (marker.type === 'blast') {
                const relCenter = getHexCenter(marker.startX, marker.startY, hexSize);
                const center = { x: mapX + relCenter.x, y: mapY + relCenter.y };
                const radiusPixels = (marker.radius || 3) * hexSize * 1.7;

                return (
                  <g
                    key={marker.id}
                    id={`marker-${marker.id}`}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDeleteMarker(marker.id);
                    }}
                  >
                    <circle
                      cx={center.x}
                      cy={center.y}
                      r={radiusPixels}
                      fill={marker.color ? `${marker.color}33` : 'rgba(239, 68, 68, 0.2)'}
                      stroke={marker.color || '#ef4444'}
                      strokeWidth="2.5"
                      strokeDasharray="6 4"
                    />
                    {/* Tag de Identificação com Botão de Excluir e Indicador de Camada M/J */}
                    <g transform={`translate(${center.x}, ${center.y - radiusPixels - 14})`} pointerEvents="auto">
                      <rect
                        x="-75"
                        y="-16"
                        width="150"
                        height="26"
                        rx="7"
                        fill="#020617"
                        stroke={marker.color || '#ef4444'}
                        strokeWidth="1.5"
                        opacity="0.95"
                      />
                      {/* Indicador de Camada Mestre (Roxo) para o GM quando oculto dos jogadores */}
                      {isMaster && marker.layer === 'gm' && (
                        <g
                          className="cursor-pointer"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleToggleMarkerLayer(marker.id);
                          }}
                        >
                          <title>Visão: Apenas Mestre (oculto dos jogadores). Clique para tornar visível aos jogadores.</title>
                          <circle
                            cx="-58"
                            cy="-3"
                            r="7"
                            fill="#020617"
                            stroke="#a855f7"
                            strokeWidth="1.8"
                          />
                          <path
                            d="M -62 -3 C -60.3 -5.4 -55.7 -5.4 -54 -3 C -55.7 -0.6 -60.3 -0.6 -62 -3 Z"
                            fill="none"
                            stroke="#c084fc"
                            strokeWidth="1"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <circle
                            cx="-58"
                            cy="-3"
                            r="1.1"
                            fill="#c084fc"
                          />
                          <line
                            x1="-61"
                            y1="-6"
                            x2="-55"
                            y2="0"
                            stroke="#c084fc"
                            strokeWidth="1"
                            strokeLinecap="round"
                          />
                        </g>
                      )}
                      <text
                        x={isMaster ? "0" : "-10"}
                        y="1"
                        fill={marker.color || '#ef4444'}
                        fontSize="10"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {marker.label || `Área (${marker.radius} yd)`}
                      </text>
                      {/* Botão Individual de Excluir Área */}
                      <g
                        className="cursor-pointer"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleDeleteMarker(marker.id);
                        }}
                      >
                        <title>Apagar esta área do mapa</title>
                        <circle cx="56" cy="-3" r="12" fill="transparent" />
                        <circle cx="56" cy="-3" r="8" fill="#ef4444" className="hover:fill-rose-400 transition-colors" />
                        <text
                          x="56"
                          y="0.5"
                          fill="#ffffff"
                          fontSize="11"
                          fontWeight="bold"
                          textAnchor="middle"
                          pointerEvents="none"
                        >
                          ✕
                        </text>
                      </g>
                    </g>
                  </g>
                );
              }

              if (marker.type === 'ruler' || marker.type === 'line') {
                const relA = getHexCenter(marker.startX, marker.startY, hexSize);
                const pA = { x: mapX + relA.x, y: mapY + relA.y };
                const relB = getHexCenter(marker.endX ?? marker.startX, marker.endY ?? marker.startY, hexSize);
                const pB = { x: mapX + relB.x, y: mapY + relB.y };
                const midX = (pA.x + pB.x) / 2;
                const midY = (pA.y + pB.y) / 2;

                return (
                  <g
                    key={marker.id}
                    id={`marker-ruler-${marker.id}`}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDeleteMarker(marker.id);
                    }}
                  >
                    <line
                      x1={pA.x}
                      y1={pA.y}
                      x2={pB.x}
                      y2={pB.y}
                      stroke={marker.color || '#f59e0b'}
                      strokeWidth="3.5"
                      strokeDasharray="6 4"
                      markerEnd="url(#ruler-arrow)"
                    />
                    <circle cx={pA.x} cy={pA.y} r="5" fill={marker.color || '#f59e0b'} />
                    <circle cx={pB.x} cy={pB.y} r="5" fill={marker.color || '#f59e0b'} />
                    {/* Badge da Medição com Botão Individual de Excluir e Indicador M/J */}
                    <g transform={`translate(${midX}, ${midY - 20})`} pointerEvents="auto">
                      <rect
                        x="-75"
                        y="-16"
                        width="150"
                        height="26"
                        rx="7"
                        fill="#020617"
                        stroke={marker.color || '#f59e0b'}
                        strokeWidth="1.5"
                        opacity="0.95"
                      />
                      {/* Indicador de Camada Mestre (Roxo) para o GM quando oculto dos jogadores */}
                      {isMaster && marker.layer === 'gm' && (
                        <g
                          className="cursor-pointer"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleToggleMarkerLayer(marker.id);
                          }}
                        >
                          <title>Visão: Apenas Mestre (oculto dos jogadores). Clique para tornar visível aos jogadores.</title>
                          <circle
                            cx="-58"
                            cy="-3"
                            r="7"
                            fill="#020617"
                            stroke="#a855f7"
                            strokeWidth="1.8"
                          />
                          <path
                            d="M -62 -3 C -60.3 -5.4 -55.7 -5.4 -54 -3 C -55.7 -0.6 -60.3 -0.6 -62 -3 Z"
                            fill="none"
                            stroke="#c084fc"
                            strokeWidth="1"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <circle
                            cx="-58"
                            cy="-3"
                            r="1.1"
                            fill="#c084fc"
                          />
                          <line
                            x1="-61"
                            y1="-6"
                            x2="-55"
                            y2="0"
                            stroke="#c084fc"
                            strokeWidth="1"
                            strokeLinecap="round"
                          />
                        </g>
                      )}
                      <text
                        x={isMaster ? "0" : "-10"}
                        y="1"
                        fill="#fbbf24"
                        fontSize="10"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {marker.label || `${marker.radius} yd`}
                      </text>
                      {/* Botão Individual de Excluir Medição */}
                      <g
                        className="cursor-pointer"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleDeleteMarker(marker.id);
                        }}
                      >
                        <title>Apagar esta medição do mapa</title>
                        <circle cx="56" cy="-3" r="12" fill="transparent" />
                        <circle cx="56" cy="-3" r="8" fill="#ef4444" className="hover:fill-rose-400 transition-colors" />
                        <text
                          x="56"
                          y="0.5"
                          fill="#ffffff"
                          fontSize="11"
                          fontWeight="bold"
                          textAnchor="middle"
                          pointerEvents="none"
                        >
                          ✕
                        </text>
                      </g>
                    </g>
                  </g>
                );
              }

              return null;
            })}
          </g>

          {/* PREVIEW DO MODELO DE ÁREA / EXPLOSÃO (AO PASSAR O MOUSE) */}
          {(activeTool === 'area' || (activeTool === 'ruler' && rulerType === 'blast')) && (areaCenter || hoveredHex) && (
            <g id="area-template" pointerEvents="none">
              {(() => {
                const targetCenter = areaCenter || hoveredHex;
                if (!targetCenter) return null;
                const relCenter = getHexCenter(targetCenter.col, targetCenter.row, hexSize);
                const center = { x: mapX + relCenter.x, y: mapY + relCenter.y };
                const radiusPixels = areaRadius * hexSize * 1.7;
                return (
                  <g>
                    <circle
                      cx={center.x}
                      cy={center.y}
                      r={radiusPixels}
                      fill={areaColor ? `${areaColor}33` : 'rgba(239, 68, 68, 0.2)'}
                      stroke={areaColor || '#ef4444'}
                      strokeWidth="2"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={center.x}
                      y={center.y - radiusPixels - 8}
                      fill={areaColor || '#ef4444'}
                      fontSize="12"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      Raio: {areaRadius} jardas ({areaRadius} hexes)
                    </text>
                  </g>
                );
              })()}
            </g>
          )}

          {/* GUIA DE ALCANCE FIXO (RÉGUA TÁTICA GURPS) */}
          {activeTool === 'ruler' && (rulerMode === 'fixed' || rulerType === 'fixed') && (rulerStart || hoveredHex) && (
            <g id="ruler-fixed-guide" pointerEvents="none">
              {(() => {
                const centerHex = rulerStart || hoveredHex;
                if (!centerHex) return null;
                const relCenter = getHexCenter(centerHex.col, centerHex.row, hexSize);
                const center = { x: mapX + relCenter.x, y: mapY + relCenter.y };
                const radiusPixels = rulerFixedYards * hexSize * 1.7;
                const rangePenalty = getGurpsRangePenalty(rulerFixedYards);
                return (
                  <g>
                    <circle
                      cx={center.x}
                      cy={center.y}
                      r={radiusPixels}
                      fill="rgba(245, 158, 11, 0.08)"
                      stroke="#f59e0b"
                      strokeWidth="2"
                      strokeDasharray="5 3"
                    />
                    <text
                      x={center.x}
                      y={center.y - radiusPixels - 8}
                      fill="#fbbf24"
                      fontSize="11"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      Alcance Fixo: {rulerFixedYards} yd ({rangePenalty >= 0 ? '0' : rangePenalty} Penalidade GURPS)
                    </text>
                  </g>
                );
              })()}
            </g>
          )}

          {/* CAMADA 6: RÉGUA TÁTICA (DISTÂNCIA E PENALIDADE GURPS) */}
          {rulerStart && rulerCurrent && (
            <g id="tactical-ruler">
              {(() => {
                const relA = getHexCenter(rulerStart.col, rulerStart.row, hexSize);
                const pA = { x: mapX + relA.x, y: mapY + relA.y };
                const relB = getHexCenter(rulerCurrent.col, rulerCurrent.row, hexSize);
                const pB = { x: mapX + relB.x, y: mapY + relB.y };
                const distanceYards = getHexDistance(rulerStart, rulerCurrent);
                const rangePenalty = getGurpsRangePenalty(distanceYards);

                // Detecta arco de defesa se o alvo for um token
                const targetToken = tokens.find(
                  (t) => t.gridX === rulerCurrent.col && t.gridY === rulerCurrent.row
                );

                let arcText = '';
                if (targetToken) {
                  const rel = getTargetArcRelationship(
                    { col: targetToken.gridX, row: targetToken.gridY },
                    targetToken.facing,
                    { col: rulerStart.col, row: rulerStart.row }
                  );
                  if (rel === 'front') arcText = 'Frente (Defesa Normal)';
                  else if (rel === 'rightFlank' || rel === 'leftFlank')
                    arcText = 'Flanco (-2 Defesas)';
                  else if (rel === 'rear') arcText = 'Retaguarda (Sem Defesa!)';
                }

                const midX = (pA.x + pB.x) / 2;
                const midY = (pA.y + pB.y) / 2;

                return (
                  <g>
                    {/* Linha guia */}
                    <line
                      x1={pA.x}
                      y1={pA.y}
                      x2={pB.x}
                      y2={pB.y}
                      stroke="#f59e0b"
                      strokeWidth="2.5"
                      strokeDasharray="6 4"
                      markerEnd="url(#ruler-arrow)"
                    />
                    {/* Círculos nos pontos A e B */}
                    <circle cx={pA.x} cy={pA.y} r="5" fill="#f59e0b" />
                    <circle cx={pB.x} cy={pB.y} r="5" fill="#f59e0b" />

                    {/* Caixa de Informações Táticas Flutuante */}
                    <g transform={`translate(${midX}, ${midY - 20})`}>
                      <rect
                        x="-90"
                        y="-35"
                        width="180"
                        height={arcText ? "55" : "40"}
                        rx="8"
                        fill="#020617"
                        stroke="#f59e0b"
                        strokeWidth="1.5"
                        opacity="0.95"
                      />
                      <text
                        x="0"
                        y="-18"
                        fill="#ffffff"
                        fontSize="11"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        Distância: {distanceYards} yd ({distanceYards} hex)
                      </text>
                      <text
                        x="0"
                        y="-4"
                        fill="#fbbf24"
                        fontSize="10"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        Penalidade GURPS: {rangePenalty >= 0 ? '0' : rangePenalty}
                      </text>
                      {arcText && (
                        <text
                          x="0"
                          y="11"
                          fill={arcText.includes('Sem Defesa') ? '#ef4444' : '#38bdf8'}
                          fontSize="9.5"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {arcText}
                        </text>
                      )}
                    </g>
                  </g>
                );
              })()}
            </g>
          )}

          {/* CAMADA 7: TOKENS DE COMBATE (visíveis em todas as camadas; na Camada Jogadores mostra apenas visão pública) */}
          <g id="tactical-tokens">
              {tokens.map((token) => {
                const npc = characterMap.get(token.npcId);
                if (!npc) return null;

                const isPlayer = npc.characterType === 'player';
                // Visibilidade unificada: NPCs respeitam isVisibleToPlayer da ficha e a flag do tabuleiro
                const isTokenHidden = isPlayer
                  ? (!!token.hiddenFromPlayers || token.layer === 'gm')
                  : (!npc.isVisibleToPlayer || !!token.hiddenFromPlayers || token.layer === 'gm');
                // A Camada Tokens já é a visão dos jogadores (tokens ocultos/GM não aparecem)
                if (activeLayer === 'tokens' && isTokenHidden) return null;
                // Jogadores comuns nunca enxergam tokens da camada do mestre
                if (!isMaster && isTokenHidden) return null;
              const isSelected = token.id === selectedTokenId;
              const isDragging = token.id === draggedTokenId;
              const isRotating = token.id === rotatingTokenId;
              const displayGridX = isDragging && dragHoverHex ? dragHoverHex.col : token.gridX;
              const displayGridY = isDragging && dragHoverHex ? dragHoverHex.row : token.gridY;
              const relCenter = getHexCenter(displayGridX, displayGridY, hexSize);
              const center = { x: mapX + relCenter.x, y: mapY + relCenter.y };
              const tokenRotation = isRotating && previewRotation && previewRotation.id === token.id
                ? previewRotation.rotation
                : (typeof token.rotation === 'number'
                    ? token.rotation
                    : ((token.facing * 60 + 180) % 360));
              const tokenRadius = hexSize * 0.58;

              const hpPercent =
                npc.hpMax > 0
                  ? Math.max(0, Math.min(100, (npc.hpCurrent / npc.hpMax) * 100))
                  : 100;

              const badgeWidth = Math.min(85, Math.max(34, npc.name.length * 5.8));

              // Manobra ativa do personagem / NPC para colorir a borda do token
              const maneuver = npc.combatManeuver ? getCombatManeuver(npc.combatManeuver) : undefined;
              const hasManeuver = !!maneuver && maneuver.id !== 'none';
              // Contorno cinza neutro se não houver manobra para não confundir com as manobras
              const maneuverBorderColor = hasManeuver
                ? (maneuver.borderHex || maneuver.bgHex)
                : isTokenHidden
                  ? '#c084fc'
                  : '#64748b';

              return (
                <g
                  key={token.id}
                  transform={`translate(${center.x}, ${center.y})`}
                  opacity={isTokenHidden ? 0.78 : 1}
                  pointerEvents="auto"
                  onClick={(e) => handleTokenClick(e, token)}
                  onMouseDown={(e) => handleTokenMouseDown(e, token)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedTokenId(token.id);
                    onSelectNpc(token.npcId);
                    setContextMenu({
                      tokenId: token.id,
                      npcId: token.npcId,
                      x: e.clientX,
                      y: e.clientY,
                    });
                  }}
                  className="cursor-pointer transition-transform"
                  style={{
                    filter: isSelected
                      ? 'drop-shadow(0px 0px 8px rgba(245, 158, 11, 0.8))'
                      : isTokenHidden
                        ? 'drop-shadow(0px 0px 7px rgba(168, 85, 247, 0.8))'
                        : 'drop-shadow(0px 3px 6px rgba(0, 0, 0, 0.6))',
                  }}
                >
                  {/* GRUPO ROTATIVO INTEGRAL: Foto, Nome (em cima), Frente (embaixo) e Pauzinho giram juntos */}
                  <g transform={`rotate(${tokenRotation})`}>
                    {/* 1. Círculo de Base com Borda Fina de Manobra ou Roxo GM */}
                    <circle
                      cx="0"
                      cy="0"
                      r={tokenRadius + 2}
                      fill="#0f172a"
                      stroke={maneuverBorderColor}
                      strokeWidth={isSelected ? 2 : isTokenHidden ? 1.8 : 1.4}
                      strokeDasharray={isTokenHidden ? "4,2" : undefined}
                    />

                    {/* Anel Externo Dourado Indicador de Seleção */}
                    {isSelected && (
                      <circle
                        cx="0"
                        cy="0"
                        r={tokenRadius + 4.5}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="1.5"
                        strokeDasharray="4,3"
                      />
                    )}

                    {/* 2. Retrato / Avatar recortado (com suporte total a fotos básicas/presets do sistema) */}
                    <clipPath id={`clip-${token.id}`}>
                      <circle cx="0" cy="0" r={tokenRadius} />
                    </clipPath>

                    {npc.avatar ? (
                      <image
                        href={npc.avatar}
                        x={-tokenRadius}
                        y={-tokenRadius}
                        width={tokenRadius * 2}
                        height={tokenRadius * 2}
                        clipPath={`url(#clip-${token.id})`}
                        preserveAspectRatio="xMidYMid slice"
                      />
                    ) : (
                      (() => {
                        const matchedPreset =
                          PRESET_AVATARS.find((p) => p.id === npc.avatarPreset) ||
                          resolveNpcPreset(npc);
                        const colors =
                          PRESET_BG_COLORS[matchedPreset.id] || PRESET_BG_COLORS['knight'];
                        const PresetIcon = matchedPreset.icon || Shield;
                        const iconSize = tokenRadius * 1.25;

                        return (
                          <g clipPath={`url(#clip-${token.id})`}>
                            <circle cx="0" cy="0" r={tokenRadius} fill={colors.bg1} />
                            <circle cx="0" cy="0" r={tokenRadius} fill={colors.bg2} fillOpacity="0.5" />
                            <g
                              transform={`translate(${-iconSize / 2}, ${-iconSize / 2})`}
                              style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.8))' }}
                            >
                              <PresetIcon size={iconSize} color="#ffffff" strokeWidth={2} />
                            </g>
                          </g>
                        );
                      })()
                    )}

                    {/* MARCAÇÃO DE VISIBILIDADE APENAS PARA O MESTRE (QUANDO OCULTO DOS JOGADORES): OLHO ROXO */}
                    {isMaster && isTokenHidden && (
                      <g
                        transform={`translate(${badgeWidth / 2 + 7}, ${-tokenRadius - 8.5})`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleTokenVisibility(token.id);
                        }}
                        className="cursor-pointer hover:scale-125 transition-transform"
                      >
                        <title>Visão: Apenas Mestre (oculto dos jogadores). Clique para revelar aos jogadores.</title>
                        <circle
                          cx="0"
                          cy="0"
                          r="6"
                          fill="#020617"
                          fillOpacity="0.95"
                          stroke="#a855f7"
                          strokeWidth="1.5"
                        />
                        <path
                          d="M -3.6 0 C -2 -2.2 2 -2.2 3.6 0 C 2 2.2 -2 2.2 -3.6 0 Z"
                          fill="none"
                          stroke="#c084fc"
                          strokeWidth="1"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle
                          cx="0"
                          cy="0"
                          r="1"
                          fill="#c084fc"
                        />
                        <line
                          x1="-3"
                          y1="-3"
                          x2="3"
                          y2="3"
                          stroke="#c084fc"
                          strokeWidth="1"
                          strokeLinecap="round"
                        />
                      </g>
                    )}

                    {/* 3. NOME DO PERSONAGEM EM CIMA DA FOTO (com transparência e fonte menor para não bloquear tokens abaixo) */}
                    <rect
                      x={-badgeWidth / 2}
                      y={-tokenRadius - 15}
                      width={badgeWidth}
                      height="13"
                      rx="3.5"
                      fill="#020617"
                      fillOpacity="0.55"
                      stroke="rgba(148, 163, 184, 0.3)"
                      strokeWidth="0.7"
                    />
                    <text
                      x="0"
                      y={-tokenRadius - 6}
                      fill="#f1f5f9"
                      fontSize="8"
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      {npc.name}
                    </text>

                    {/* 4. MARCAÇÃO DE FRENTE EMBAIXO DA FOTO (onde ficava o nome) */}
                    <polygon
                      points={`0,${tokenRadius + 9} -5.5,${tokenRadius + 2.5} 5.5,${tokenRadius + 2.5}`}
                      fill="#f59e0b"
                      stroke="#020617"
                      strokeWidth="1"
                    />
                    <circle cx="0" cy={tokenRadius + 4} r="1.2" fill="#ffffff" />

                    {/* 5. "PAUZINHO" DE ROTAÇÃO (Roll20 Rotation Handle) QUANDO SELECIONADO */}
                    {isSelected && (
                      <g className="cursor-grab">
                        {/* Haste estendida conectando a marcação de frente até a alça */}
                        <line
                          x1="0"
                          y1={tokenRadius + 9}
                          x2="0"
                          y2={tokenRadius + 22}
                          stroke="#38bdf8"
                          strokeWidth="2"
                          strokeDasharray="3,2"
                        />
                        {/* Alça circular na ponta do pauzinho */}
                        <circle
                          cx="0"
                          cy={tokenRadius + 22}
                          r="5"
                          fill="#0284c7"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                          className="hover:scale-125 transition-transform"
                        />
                        <circle cx="0" cy={tokenRadius + 22} r="1.8" fill="#ffffff" />
                        {/* Hitbox invisível ampla para facilitar o clique e arrasto no mouse/touch */}
                        <circle
                          cx="0"
                          cy={tokenRadius + 22}
                          r="13"
                          fill="transparent"
                          className="cursor-grab active:cursor-grabbing"
                          onMouseDown={(e) => handleRotationMouseDown(e, token)}
                        />
                      </g>
                    )}
                  </g>
                </g>
              );
            })}
          </g>

          {/* CAMADA 8: OCULTAÇÃO DE ÁREAS / NÉVOA DE GUERRA (ESTILO ROLL20 - LINHAS RETANGULARES PURAS) */}
          {tacticalState.fogEnabled && (
            <g id="tactical-fog-layer" clipPath="url(#map-image-bounds)" pointerEvents="none">
              {/* Camada visual de Névoa: semitransparente suave para o Mestre (fácil identificação dos elementos), 100% preta para os Jogadores */}
              <rect
                x={mapX}
                y={mapY}
                width={mapW}
                height={mapH}
                fill={isPlayerView ? '#000000' : 'rgba(2, 6, 23, 0.35)'}
                mask="url(#tactical-fog-mask)"
              />
            </g>
          )}

          {/* PREVIEWS DE OCULTAR / MOSTRAR ÁREAS (RETÂNGULO, CÍRCULO E POLÍGONO) */}
          {activeTool === 'fog' && fogShape === 'rect' && fogBoxStart && fogBoxCurrent && (
            <g id="fog-box-preview" pointerEvents="none">
              <rect
                x={mapX + Math.min(fogBoxStart.x, fogBoxCurrent.x)}
                y={mapY + Math.min(fogBoxStart.y, fogBoxCurrent.y)}
                width={Math.abs(fogBoxCurrent.x - fogBoxStart.x)}
                height={Math.abs(fogBoxCurrent.y - fogBoxStart.y)}
                fill={fogBrushMode === 'reveal' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}
                stroke={fogBrushMode === 'reveal' ? '#10b981' : '#ef4444'}
                strokeWidth={2}
                strokeDasharray="6 4"
              />
            </g>
          )}

          {activeTool === 'fog' && fogShape === 'circle' && isMaster && mouseMapPos && (
            <g id="fog-circle-preview" pointerEvents="none">
              <circle
                cx={mapX + mouseMapPos.x}
                cy={mapY + mouseMapPos.y}
                r={(fogCircleRadius || 5) * hexWidth * 0.95}
                fill={fogBrushMode === 'reveal' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}
                stroke={fogBrushMode === 'reveal' ? '#10b981' : '#ef4444'}
                strokeWidth={2}
                strokeDasharray="6 4"
              />
              <text
                x={mapX + mouseMapPos.x}
                y={mapY + mouseMapPos.y - (fogCircleRadius || 5) * hexWidth * 0.95 - 6}
                fill={fogBrushMode === 'reveal' ? '#10b981' : '#ef4444'}
                fontSize={12}
                fontWeight="bold"
                textAnchor="middle"
              >
                {fogCircleRadius || 5} yd ({fogBrushMode === 'reveal' ? 'Revelar' : 'Ocultar'})
              </text>
            </g>
          )}

          {activeTool === 'fog' && fogShape === 'polygon' && isMaster && fogPolyPoints.length > 0 && (
            <g id="fog-polygon-preview" pointerEvents="none">
              {fogPolyPoints.length >= 3 && (
                <polygon
                  points={fogPolyPoints.map((pt) => `${mapX + pt.x},${mapY + pt.y}`).join(' ')}
                  fill={fogBrushMode === 'reveal' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}
                  stroke={fogBrushMode === 'reveal' ? '#10b981' : '#ef4444'}
                  strokeWidth={2}
                />
              )}
              {fogPolyPoints.map((pt, idx) => {
                if (idx === 0) return null;
                const prev = fogPolyPoints[idx - 1];
                return (
                  <line
                    key={`fog-poly-line-${idx}`}
                    x1={mapX + prev.x}
                    y1={mapY + prev.y}
                    x2={mapX + pt.x}
                    y2={mapY + pt.y}
                    stroke={fogBrushMode === 'reveal' ? '#10b981' : '#ef4444'}
                    strokeWidth={2.5}
                  />
                );
              })}
              {mouseMapPos && (
                <line
                  x1={mapX + fogPolyPoints[fogPolyPoints.length - 1].x}
                  y1={mapY + fogPolyPoints[fogPolyPoints.length - 1].y}
                  x2={mapX + mouseMapPos.x}
                  y2={mapY + mouseMapPos.y}
                  stroke={fogBrushMode === 'reveal' ? '#10b981' : '#ef4444'}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                />
              )}
              {fogPolyPoints.map((pt, idx) => (
                <circle
                  key={`fog-poly-vertex-${idx}`}
                  cx={mapX + pt.x}
                  cy={mapY + pt.y}
                  r={idx === 0 ? 5 : 4}
                  fill={fogBrushMode === 'reveal' ? '#10b981' : '#ef4444'}
                  stroke="#ffffff"
                  strokeWidth={1.5}
                />
              ))}
            </g>
          )}

          {/* PREVIEW DA CONSTRUÇÃO DE PAREDES POLIGONAIS */}
          {activeTool === 'wall' && (wallPoints.length > 0 || mouseMapPos) && (
            <g id="wall-construction-preview" pointerEvents="none">
              {wallPoints.length >= 2 && (
                <polyline
                  points={wallPoints.map((pt) => `${mapX + pt.x},${mapY + pt.y}`).join(' ')}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth={5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )}

              {wallPoints.length > 0 && mouseMapPos && (
                <line
                  x1={mapX + wallPoints[wallPoints.length - 1].x}
                  y1={mapY + wallPoints[wallPoints.length - 1].y}
                  x2={mapX + mouseMapPos.x}
                  y2={mapY + mouseMapPos.y}
                  stroke="#60a5fa"
                  strokeWidth={3}
                  strokeDasharray="6 4"
                />
              )}

              {wallPoints.map((pt, pIdx) => {
                const isFirst = pIdx === 0;
                const isLast = pIdx === wallPoints.length - 1;
                const isNearFirst = isFirst && mouseMapPos && Math.hypot(mouseMapPos.x - pt.x, mouseMapPos.y - pt.y) < 18;
                const isNearLast = isLast && wallPoints.length >= 2 && mouseMapPos && Math.hypot(mouseMapPos.x - pt.x, mouseMapPos.y - pt.y) < 18;

                return (
                  <g key={`wall-vert-preview-${pIdx}`}>
                    <circle
                      cx={mapX + pt.x}
                      cy={mapY + pt.y}
                      r={isNearFirst || isNearLast ? 8 : 5}
                      fill={isNearFirst || isNearLast ? '#10b981' : '#ffffff'}
                      stroke={isNearFirst || isNearLast ? '#059669' : '#2563eb'}
                      strokeWidth={2}
                    />
                    <text
                      x={mapX + pt.x}
                      y={mapY + pt.y + 14}
                      fontSize="10"
                      fill="#e2e8f0"
                      textAnchor="middle"
                      className="font-mono font-bold select-none drop-shadow"
                    >
                      {pIdx + 1}
                    </text>
                    {isNearLast && (
                      <g transform={`translate(${mapX + pt.x}, ${mapY + pt.y - 18})`}>
                        <rect x={-45} y={-9} width={90} height={18} rx={5} fill="#059669" />
                        <text textAnchor="middle" dominantBaseline="central" fontSize="9" fontWeight="bold" fill="#ffffff">
                          Concluir aqui
                        </text>
                      </g>
                    )}
                    {isNearFirst && wallPoints.length >= 3 && (
                      <g transform={`translate(${mapX + pt.x}, ${mapY + pt.y - 18})`}>
                        <rect x={-48} y={-9} width={96} height={18} rx={5} fill="#2563eb" />
                        <text textAnchor="middle" dominantBaseline="central" fontSize="9" fontWeight="bold" fill="#ffffff">
                          Fechar polígono
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {wallPoints.length === 0 && mouseMapPos && (
                <circle
                  cx={mapX + mouseMapPos.x}
                  cy={mapY + mouseMapPos.y}
                  r={6}
                  fill="rgba(59, 130, 246, 0.4)"
                  stroke="#3b82f6"
                  strokeWidth={2}
                />
              )}
            </g>
          )}

          {/* PREVIEW DA INSERÇÃO DE PORTAS */}
          {activeTool === 'door' && doorStartPoint && mouseMapPos && (
            <g id="door-construction-preview" pointerEvents="none">
              <line
                x1={mapX + doorStartPoint.x}
                y1={mapY + doorStartPoint.y}
                x2={mapX + mouseMapPos.x}
                y2={mapY + mouseMapPos.y}
                stroke="#f59e0b"
                strokeWidth={5}
                strokeLinecap="round"
                strokeDasharray="6 3"
              />
              <circle
                cx={mapX + doorStartPoint.x}
                cy={mapY + doorStartPoint.y}
                r={5}
                fill="#f59e0b"
              />
              <circle
                cx={mapX + mouseMapPos.x}
                cy={mapY + mouseMapPos.y}
                r={5}
                fill="#f59e0b"
              />
              <g
                transform={`translate(${
                  mapX + (doorStartPoint.x + mouseMapPos.x) / 2
                }, ${
                  mapY + (doorStartPoint.y + mouseMapPos.y) / 2
                })`}
              >
                <circle r={10} fill="#78350f" stroke="#f59e0b" strokeWidth={1.5} />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="8"
                  fill="#fef3c7"
                >
                  🚪
                </text>
              </g>
            </g>
          )}

          {/* PREVIEW DO FOCO DE LUZ AO PASSAR O MOUSE (QUANDO SUB-FERRAMENTA LUZ ESTÁ SELECIONADA EM OCULTAR OU LUZ LIVRE) */}
          {((activeTool === 'fog' && fogSubTool === 'light') || activeTool === 'light') && (hoveredHex || mouseMapPos) && (
            <g id="light-brush-preview" pointerEvents="none">
              {(() => {
                const relCenter = hoveredHex ? getHexCenter(hoveredHex.col, hoveredHex.row, hexSize) : { x: 0, y: 0 };
                const center = mouseMapPos
                  ? { x: mapX + mouseMapPos.x, y: mapY + mouseMapPos.y }
                  : { x: mapX + relCenter.x, y: mapY + relCenter.y };

                if (lightAction === 'remove') {
                  return (
                    <g>
                      <circle
                        cx={center.x}
                        cy={center.y}
                        r={hexSize * 0.8}
                        fill="rgba(239, 68, 68, 0.25)"
                        stroke="#ef4444"
                        strokeWidth="2"
                        strokeDasharray="4 3"
                      />
                      <text
                        x={center.x}
                        y={center.y + 4.5}
                        fontSize="14"
                        textAnchor="middle"
                      >
                        ❌
                      </text>
                    </g>
                  );
                }

                const radiusPixels = (customLightRadius || 5) * hexWidth * 0.95;

                if (customLightAngle && customLightAngle < 360) {
                  const sectorPath = getCircleSectorPath(
                    center.x,
                    center.y,
                    radiusPixels,
                    customLightAngle,
                    customLightRotation || 0
                  );
                  return (
                    <g>
                      <path
                        d={sectorPath}
                        fill={customLightColor || '#f59e0b'}
                        fillOpacity="0.22"
                        stroke={customLightColor || '#f59e0b'}
                        strokeWidth="2"
                        strokeDasharray="6 3"
                      />
                      <text
                        x={center.x}
                        y={center.y + 4.5}
                        fontSize="14"
                        textAnchor="middle"
                      >
                        {customLightAngle === 180 ? '🌓' : '🔦'}
                      </text>
                    </g>
                  );
                }

                return (
                  <g>
                    <circle
                      cx={center.x}
                      cy={center.y}
                      r={radiusPixels}
                      fill={customLightColor || '#f59e0b'}
                      fillOpacity="0.18"
                      stroke={customLightColor || '#f59e0b'}
                      strokeWidth="2"
                      strokeDasharray="6 3"
                    />
                    <text
                      x={center.x}
                      y={center.y + 4}
                      fontSize="14"
                      textAnchor="middle"
                    >
                      🔥
                    </text>
                  </g>
                );
              })()}
            </g>
          )}
        </g>
      </svg>

      {/* MENU DE CONTEXTO DO TOKEN (BOTÃO DIREITO: DADOS, MANOBRA E LANÇAR DANO) */}
      {contextMenu && (() => {
        const token = tokens.find((t) => t.id === contextMenu.tokenId);
        const npc = token ? characterMap.get(token.npcId) : null;
        if (!token || !npc) return null;

        const hp = typeof npc.hpCurrent === 'number' ? npc.hpCurrent : (npc.hpMax || 0);
        const hpMax = npc.hpMax || 0;
        const fp = typeof npc.fpCurrent === 'number' ? npc.fpCurrent : (npc.fpMax || 0);
        const fpMax = npc.fpMax || 0;

        // Lista de 8 manobras (7 oficiais + Nenhuma)
        const maneuversList = [
          ...COMBAT_MANEUVERS,
          {
            id: 'none',
            name: 'Nenhuma',
            colorName: 'Cinza',
            bgHex: '#334155',
            textHex: '#cbd5e1',
            borderHex: '#475569',
            badgeClass: 'bg-slate-700 text-slate-200 border-slate-600',
          },
        ];

        // Clamping para manter o menu sempre visível e compacto na tela
        const menuWidth = 220;
        const menuHeight = 230;
        const posX = Math.min(Math.max(8, contextMenu.x), window.innerWidth - menuWidth - 8);
        const posY = Math.min(Math.max(8, contextMenu.y), window.innerHeight - menuHeight - 8);

        return (
          <div
            id="tactical-context-menu"
            className="fixed inset-0 z-50 pointer-events-auto"
            onWheel={(e) => e.stopPropagation()}
            onMouseDown={(e) => {
              e.stopPropagation();
              setContextMenu(null);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setContextMenu(null);
            }}
          >
            <div
              className="absolute bg-slate-950/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-2.5 shadow-2xl w-[220px] space-y-2 text-slate-100 select-none animate-in fade-in zoom-in-95 duration-100"
              style={{
                left: `${posX}px`,
                top: `${posY}px`,
              }}
              onWheel={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              {/* Cabeçalho Compacto: Avatar, Nome e PV/FP lado a lado */}
              <div className="flex items-center justify-between gap-1.5 border-b border-slate-800 pb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-slate-700 bg-slate-900 flex items-center justify-center">
                    <NpcAvatar
                      avatar={npc.avatar}
                      preset={npc.avatarPreset}
                      name={npc.name}
                      size="sm"
                      className="!w-7 !h-7 !rounded-full"
                    />
                  </div>
                  <div className="min-w-0 flex flex-col">
                    <span className="font-bold text-white text-xs truncate leading-tight">
                      {npc.name}
                    </span>
                    <div className="flex items-center gap-1 text-[10px] font-mono leading-none pt-0.5">
                      <span className={hp <= 0 ? 'text-rose-400 font-bold' : hp < hpMax / 3 ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                        {hp}/{hpMax}
                      </span>
                      <span className="text-slate-500 text-[9px]">PV</span>
                      <span className="text-slate-600">•</span>
                      <span className={fp <= 0 ? 'text-rose-400 font-bold' : fp < fpMax / 3 ? 'text-amber-400 font-bold' : 'text-cyan-400 font-bold'}>
                        {fp}/{fpMax}
                      </span>
                      <span className="text-slate-500 text-[9px]">FP</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setContextMenu(null);
                  }}
                  className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Seletor com 8 Manobras de Combate (Grid 2x4) */}
              <div className="space-y-1">
                <div className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                  <Shield size={11} className="text-amber-400" /> Manobra de Combate
                </div>

                <div className="grid grid-cols-2 gap-1">
                  {maneuversList.map((m) => {
                    const isSelected =
                      m.id === 'none'
                        ? !npc.combatManeuver
                        : npc.combatManeuver === m.id;

                    return (
                      <button
                        key={m.id}
                        type="button"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          const newManeuver =
                            m.id === 'none' || isSelected ? undefined : m.id;
                          onUpdateNpc({ ...npc, combatManeuver: newManeuver });
                        }}
                        className={`px-1.5 py-1 rounded-md text-[10px] font-semibold flex items-center justify-between transition-all border ${
                          isSelected
                            ? 'ring-2 ring-white/70 shadow-md font-bold'
                            : 'opacity-85 hover:opacity-100 hover:scale-[1.02]'
                        }`}
                        style={{
                          backgroundColor: m.bgHex,
                          color: m.textHex,
                          borderColor: m.borderHex,
                        }}
                      >
                        <span className="truncate">{m.name}</span>
                        {isSelected && <span className="text-[11px] leading-none ml-0.5">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* NÍVEL 3: UNIFICADO COM A FICHA DO NPC (MOVER ENTRE CAMADA DE TOKENS E GM) */}
              {isMaster && (() => {
                const isContextTokenHidden = npc.characterType === 'player'
                  ? (!!token.hiddenFromPlayers || token.layer === 'gm')
                  : (!npc.isVisibleToPlayer || !!token.hiddenFromPlayers || token.layer === 'gm');

                return (
                  <div className="pt-1 border-t border-slate-800">
                    <button
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleTokenVisibility(token.id);
                        setContextMenu(null);
                      }}
                      className={`w-full py-1.5 px-2 rounded-lg font-bold text-[10.5px] flex items-center justify-center gap-1.5 border transition-all ${
                        isContextTokenHidden
                          ? 'bg-purple-950/70 hover:bg-purple-900 text-purple-200 border-purple-500/50 shadow-sm'
                          : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-750'
                      }`}
                      title={
                        isContextTokenHidden
                          ? 'Tornar este combatente visível para os jogadores conectados'
                          : 'Ocultar este combatente dos jogadores (Camada do Mestre)'
                      }
                    >
                      {isContextTokenHidden ? (
                        <>
                          <Eye size={12} className="text-emerald-400" />
                          <span>Mover para Camada de Tokens (Jogadores)</span>
                        </>
                      ) : (
                        <>
                          <EyeOff size={12} className="text-purple-400" />
                          <span>Mover para Camada do Mestre (GM)</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })()}

              {/* FONTE DE LUZ DO TOKEN */}
              <div className="pt-1.5 border-t border-slate-800">
                <div className="text-[10px] font-semibold text-slate-400 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Flame size={11} className="text-amber-400" />
                    <span>Emissão de Luz / Visão:</span>
                  </span>
                  <span className="text-[9.5px] font-mono text-amber-300 font-bold">
                    {token.hasInfiniteVision
                      ? '👁️ Visão Liberada'
                      : token.emitsLight
                      ? `${token.lightRadius || 4} yd ${token.lightAngle === 180 ? '(180°)' : '(360°)'}`
                      : 'Off'}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  <button
                    type="button"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      const updatedTokens = tokens.map((t) =>
                        t.id === token.id ? { ...t, emitsLight: false } : t
                      );
                      onUpdateTacticalState({ tokens: updatedTokens });
                      setContextMenu(null);
                    }}
                    className={`py-1 px-1 rounded text-[9px] font-medium border text-center transition-all ${
                      !token.emitsLight
                        ? 'bg-slate-700 text-slate-200 border-slate-500 font-bold'
                        : 'bg-slate-850 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    Off
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      const updatedTokens = tokens.map((t) =>
                        t.id === token.id
                          ? { ...t, emitsLight: true, lightRadius: 4, lightColor: '#f59e0b' }
                          : t
                      );
                      onUpdateTacticalState({ tokens: updatedTokens });
                    }}
                    className={`py-1 px-1 rounded text-[9px] font-medium border text-center transition-all ${
                      token.emitsLight && token.lightRadius === 4
                        ? 'bg-amber-950/80 text-amber-200 border-amber-500/60 font-bold'
                        : 'bg-slate-850 text-slate-400 border-slate-800 hover:text-amber-300'
                    }`}
                  >
                    🔥 4y
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      const updatedTokens = tokens.map((t) =>
                        t.id === token.id
                          ? { ...t, emitsLight: true, lightRadius: 7, lightColor: '#fbbf24' }
                          : t
                      );
                      onUpdateTacticalState({ tokens: updatedTokens });
                    }}
                    className={`py-1 px-1 rounded text-[9px] font-medium border text-center transition-all ${
                      token.emitsLight && token.lightRadius === 7
                        ? 'bg-amber-950/80 text-amber-200 border-amber-500/60 font-bold'
                        : 'bg-slate-850 text-slate-400 border-slate-800 hover:text-amber-300'
                    }`}
                  >
                    🏮 7y
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      const val = window.prompt('Raio de luz emitido pelo combatente (em jardas):', String(token.lightRadius || 5));
                      const parsed = parseInt(val || '0');
                      if (parsed > 0) {
                        const updatedTokens = tokens.map((t) =>
                          t.id === token.id
                            ? { ...t, emitsLight: true, lightRadius: parsed, lightColor: '#f59e0b' }
                            : t
                        );
                        onUpdateTacticalState({ tokens: updatedTokens });
                      }
                    }}
                    className={`py-1 px-1 rounded text-[9px] font-medium border text-center transition-all ${
                      token.emitsLight && token.lightRadius !== 4 && token.lightRadius !== 7
                        ? 'bg-amber-950/80 text-amber-200 border-amber-500/60 font-bold'
                        : 'bg-slate-850 text-slate-400 border-slate-800 hover:text-amber-300'
                    }`}
                  >
                    ⚙️ Outro
                  </button>
                </div>

                {/* Seletor de Abertura: 360° Circular ou 180° Frente */}
                {token.emitsLight && (
                  <div className="grid grid-cols-2 gap-1 mt-1.5 pt-1 border-t border-slate-800/60">
                    <button
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        const updatedTokens = tokens.map((t) =>
                          t.id === token.id ? { ...t, lightAngle: 360 } : t
                        );
                        onUpdateTacticalState({ tokens: updatedTokens });
                      }}
                      className={`py-1 px-1 rounded text-[9.5px] font-semibold border text-center transition-all ${
                        (token.lightAngle || 360) === 360
                          ? 'bg-amber-950/80 text-amber-200 border-amber-500/60 font-bold'
                          : 'bg-slate-850 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                      title="Luz circular em todos os lados (tocha, lampião)"
                    >
                      🔄 360° Todo Redor
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        const updatedTokens = tokens.map((t) =>
                          t.id === token.id ? { ...t, lightAngle: 180 } : t
                        );
                        onUpdateTacticalState({ tokens: updatedTokens });
                      }}
                      className={`py-1 px-1 rounded text-[9.5px] font-semibold border text-center transition-all ${
                        token.lightAngle === 180
                          ? 'bg-amber-950/80 text-amber-200 border-amber-500/60 font-bold'
                          : 'bg-slate-850 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                      title="Luz de 180 graus sempre direcionada à frente do combatente"
                    >
                      🔦 180° À Frente
                    </button>
                  </div>
                )}

                {/* Opção de Visão Liberada */}
                <div className="mt-1.5 pt-1.5 border-t border-slate-800/60">
                  <button
                    type="button"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      const updatedTokens = tokens.map((t) =>
                        t.id === token.id ? { ...t, hasInfiniteVision: !t.hasInfiniteVision } : t
                      );
                      onUpdateTacticalState({ tokens: updatedTokens });
                    }}
                    className={`w-full py-1 px-2 rounded text-[10px] font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      token.hasInfiniteVision
                        ? 'bg-sky-950/90 text-sky-200 border-sky-400 shadow-sm shadow-sky-500/20'
                        : 'bg-slate-850 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                    }`}
                    title="Visão Liberada: o combatente enxerga todo o mapa sem limite de distância, exceto atrás de paredes e portas fechadas"
                  >
                    <span>👁️ Visão Liberada: {token.hasInfiniteVision ? 'Ativada (Enxerga Tudo)' : 'Desativada'}</span>
                  </button>
                </div>
              </div>

              {/* Botão de Ação: Lançar Dano / Fadiga / Itens */}
              <div className="pt-1 border-t border-slate-800">
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setContextMenu(null);
                    onSelectNpc(npc.id);
                    onOpenDamageCalculator?.(npc);
                  }}
                  className="w-full py-1.5 px-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/10 transition-all active:scale-[0.98]"
                >
                  <Swords size={13} />
                  <span>Lançar Dano / Fadiga / Itens</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 4.1 MENU FLUTUANTE DE CONFIGURAÇÃO DE LUZ NO TABULEIRO */}
      {lightContextMenu && (() => {
        const light = (tacticalState.lights || []).find((l) => l.id === lightContextMenu.id);
        if (!light) return null;
        const isDirectional = light.angle && light.angle < 360;

        return (
          <div
            className="fixed z-50 bg-slate-900/95 border border-amber-500/80 shadow-2xl rounded-xl p-2.5 flex flex-col gap-2 backdrop-blur-md text-xs animate-in fade-in-50 zoom-in-95 min-w-[200px]"
            style={{
              left: Math.min(window.innerWidth - 220, Math.max(10, lightContextMenu.x)),
              top: Math.min(window.innerHeight - 200, Math.max(10, lightContextMenu.y)),
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 text-amber-400 font-bold">
              <span className="flex items-center gap-1.5">
                <Flame size={14} />
                {light.label || 'Foco de Luz'}
              </span>
              <button
                type="button"
                onClick={() => setLightContextMenu(null)}
                className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
              >
                <X size={13} />
              </button>
            </div>

            <div className="text-[11px] text-slate-400">
              Raio: <span className="text-white font-medium">{light.radius} yd</span> • Abertura: <span className="text-white font-medium">{light.angle || 360}°</span>
            </div>

            <div className="flex flex-col gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => {
                  const updated = (tacticalState.lights || []).map((l) =>
                    l.id === light.id ? { ...l, active: !l.active } : l
                  );
                  onUpdateTacticalState({ lights: updated });
                }}
                className={`w-full py-1.5 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  light.active
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                }`}
              >
                {light.active ? <Lightbulb size={13} className="text-amber-400" /> : <LightbulbOff size={13} />}
                <span>{light.active ? 'Apagar Luz' : 'Acender Luz'}</span>
              </button>

              {isDirectional && (
                <button
                  type="button"
                  onClick={() => {
                    const nextRot = (((light.rotation ?? 0) + 15) % 360);
                    const updated = (tacticalState.lights || []).map((l) =>
                      l.id === light.id ? { ...l, rotation: nextRot } : l
                    );
                    onUpdateTacticalState({ lights: updated });
                  }}
                  className="w-full py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer transition-colors"
                >
                  <RotateCw size={13} />
                  <span>Girar Direção (+15°)</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  const updated = (tacticalState.lights || []).filter((l) => l.id !== light.id);
                  onUpdateTacticalState({ lights: updated });
                  setLightContextMenu(null);
                }}
                className="w-full py-1.5 px-2 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/50 text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Excluir Foco de Luz</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* 5. FOOTER DE DADOS TÁTICOS (INFORMAÇÕES DE CÉLULA E COORDENADAS) */}
      <div className="absolute bottom-5 left-3 z-20 pointer-events-none flex items-center gap-2">
        <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-slate-300 flex items-center gap-2 shadow-lg">
          <span className="font-semibold text-amber-400">Escala GURPS:</span>
          <span>1 hex = 1 jarda (0,9m)</span>
          {hoveredHex && (
            <>
              <span className="text-slate-600">|</span>
              <span className="font-mono text-slate-400">
                Hex [{hoveredHex.col}, {hoveredHex.row}]
              </span>
            </>
          )}
        </div>
      </div>

      {/* 5.1 BARRA FLUTUANTE DE CONSTRUÇÃO DE PAREDE */}
      {wallPoints.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-slate-900/95 border border-amber-500/80 shadow-2xl rounded-2xl px-4 py-2 flex items-center gap-2.5 backdrop-blur-md text-xs animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-1.5 text-amber-400 font-bold">
            <Spline size={15} />
            <span>Parede: {wallPoints.length} {wallPoints.length === 1 ? 'vértice' : 'vértices'}</span>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <button
            type="button"
            onClick={handleFinishWall}
            disabled={wallPoints.length < 2}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title="Concluir a parede (Enter)"
          >
            <Check size={14} />
            <span>Concluir (Enter)</span>
          </button>
          <button
            type="button"
            onClick={handleCloseWallPolygon}
            disabled={wallPoints.length < 3}
            className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title="Fechar o polígono conectando ao ponto inicial"
          >
            <RotateCw size={13} />
            <span>Fechar Polígono</span>
          </button>
          <button
            type="button"
            onClick={handleUndoWallPoint}
            className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
            title="Desfazer último ponto (Backspace)"
          >
            <RotateCcw size={13} />
            <span>Desfazer</span>
          </button>
          <button
            type="button"
            onClick={handleCancelWall}
            className="px-2 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
            title="Cancelar (Esc)"
          >
            <X size={13} />
            <span>Cancelar</span>
          </button>
        </div>
      )}

      {/* 5.2 BARRA FLUTUANTE DE INSERÇÃO DE PORTA */}
      {doorStartPoint && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-slate-900/95 border border-amber-500/80 shadow-2xl rounded-2xl px-4 py-2 flex items-center gap-3 backdrop-blur-md text-xs animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-1.5 text-amber-400 font-bold">
            <DoorClosed size={15} />
            <span>Porta: Clique no mapa para definir o ponto final</span>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <button
            type="button"
            onClick={() => setDoorStartPoint(null)}
            className="px-2.5 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
            title="Cancelar inserção da porta (Esc)"
          >
            <X size={13} />
            <span>Cancelar (Esc)</span>
          </button>
        </div>
      )}

      {/* 6. BARRAS DE ROLAGEM (HORIZONTAL E VERTICAL QUANDO O MAPA FOR MAIOR QUE A TELA) */}
      {showHScroll && (
        <div
          ref={hTrackRef}
          onClick={handleHTrackClick}
          className="absolute bottom-1.5 left-4 right-6 h-2 bg-slate-900/80 hover:bg-slate-900 backdrop-blur-sm rounded-full z-20 border border-slate-800/80 cursor-pointer transition-colors shadow-inner"
          title="Barra de rolagem horizontal do mapa"
        >
          <div
            onPointerDown={handleHThumbPointerDown}
            onClick={(e) => e.stopPropagation()}
            style={{
              left: `${thumbLeftPercent}%`,
              width: `${thumbWidthPercent}%`,
            }}
            className="absolute top-0.5 bottom-0.5 bg-slate-500 hover:bg-amber-500 active:bg-amber-400 rounded-full cursor-grab active:cursor-grabbing transition-colors shadow-sm"
          />
        </div>
      )}

      {showVScroll && (
        <div
          ref={vTrackRef}
          onClick={handleVTrackClick}
          className="absolute top-16 bottom-6 right-1.5 w-2 bg-slate-900/80 hover:bg-slate-900 backdrop-blur-sm rounded-full z-20 border border-slate-800/80 cursor-pointer transition-colors shadow-inner"
          title="Barra de rolagem vertical do mapa"
        >
          <div
            onPointerDown={handleVThumbPointerDown}
            onClick={(e) => e.stopPropagation()}
            style={{
              top: `${thumbTopPercent}%`,
              height: `${thumbHeightPercent}%`,
            }}
            className="absolute left-0.5 right-0.5 bg-slate-500 hover:bg-amber-500 active:bg-amber-400 rounded-full cursor-grab active:cursor-grabbing transition-colors shadow-sm"
          />
        </div>
      )}

      {/* Modal de Elementos & Cenário (Props / Mobília Roll20) */}
      <TacticalPropsModal
        isOpen={isPropsModalOpen}
        onClose={() => setIsPropsModalOpen(false)}
        props={tacticalState.props || []}
        onAddProp={handleAddProp}
        selectedPropId={selectedPropId}
        onSelectProp={setSelectedPropId}
        onRotateProp={handleRotateProp}
        onResizeProp={handleResizeProp}
        onToggleLockProp={handleToggleLockProp}
        onDuplicateProp={handleDuplicateProp}
        onDeleteProp={handleDeleteProp}
        onClearAllProps={handleClearAllProps}
        mapWidth={mapW}
        mapHeight={mapH}
        activeLayer={activeLayer}
      />
    </div>
  );
};
