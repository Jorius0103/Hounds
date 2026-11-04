import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  TacticalState,
  TacticalToken,
  FacingDirection,
  TACTICAL_MAP_PRESETS,
  TacticalLayer,
  TacticalViewMode,
} from '../../types/tactical';
import { NPC, UserAccount } from '../../types/rpg';
import { TacticalToolbar, TacticalToolMode } from './TacticalToolbar';
import { TacticalQuickActionPopover } from './TacticalQuickActionPopover';
import {
  getHexCenter,
  getHexPointsString,
  pixelToHex,
  getHexDistance,
  getGurpsRangePenalty,
  getTargetArcRelationship,
  getHexesInRange,
  getFacingAngleDegrees,
  FACING_NAMES,
  HexCoord,
  Point,
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

  // Fog of War / Ocultação do Mapa state (Estilo Roll20)
  const [fogBrushMode, setFogBrushMode] = useState<'reveal' | 'hide'>('reveal');
  const [fogBrushRadius, setFogBrushRadius] = useState<number>(1);
  const [fogShape, setFogShape] = useState<'brush' | 'box'>('brush');
  const [fogBoxStart, setFogBoxStart] = useState<Point | null>(null);
  const [fogBoxCurrent, setFogBoxCurrent] = useState<Point | null>(null);
  const [isDrawingFog, setIsDrawingFog] = useState(false);

  // Focos de Luz state (Iluminação Dinâmica)
  const [customLightRadius, setCustomLightRadius] = useState<number>(5);
  const [customLightColor, setCustomLightColor] = useState<string>('#f59e0b');
  const [selectedLightPreset, setSelectedLightPreset] = useState<{
    label: string;
    radius: number;
    color: string;
  }>({
    label: 'Tocha',
    radius: 4,
    color: '#f59e0b',
  });

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
  // A camada 'tokens' já é a visão dos jogadores (tokens públicos)!
  const isPlayerView = !isMaster || activeLayer === 'tokens';

  // Estado para arrasto e reposicionamento da imagem base do mapa (Camada do Mapa)
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const [mapDragStart, setMapDragStart] = useState<Point>({ x: 0, y: 0 });
  const [localMapPos, setLocalMapPos] = useState<{ x: number; y: number } | null>(null);

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
      panX: typeof tacticalState?.panX === 'number' ? tacticalState.panX : 40,
      panY: typeof tacticalState?.panY === 'number' ? tacticalState.panY : 40,
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

  // Imagem base e dimensões em pixels do mapa
  const mapX = localMapPos ? localMapPos.x : (tacticalState.mapImageX || 0);
  const mapY = localMapPos ? localMapPos.y : (tacticalState.mapImageY || 0);
  const scale = tacticalState.mapImageScale || 1;
  const baseW = tacticalState.mapImageWidth || 2400;
  const baseH = tacticalState.mapImageHeight || 1600;
  const mapW = Math.round(baseW * scale);
  const mapH = Math.round(baseH * scale);

  // Dimensões do grid hexagonal calibradas exatamente para o tamanho da imagem (nem falta nem sobra)
  const hexSize = tacticalState?.hexSize || 38;
  const hexWidth = Math.sqrt(3) * hexSize;
  const rowSpacing = 1.5 * hexSize;
  const dynamicCols = Math.ceil(mapW / hexWidth) + 2;
  const dynamicRows = Math.ceil(mapH / rowSpacing) + 2;

  // Conjunto de células iluminadas por focos de luz ou por tokens com luz própria
  const litCellsSet = useMemo(() => {
    const set = new Set<string>();

    // 1. Focos de luz fixos
    (tacticalState.lights || []).forEach((light) => {
      if (light.active !== false && light.radius > 0) {
        const inRange = getHexesInRange({ col: light.gridX, row: light.gridY }, light.radius);
        inRange.forEach((h) => set.add(`${h.col},${h.row}`));
      }
    });

    // 2. Tokens carregando luz (tocha, lanterna, etc.)
    tokens.forEach((token) => {
      if (token.emitsLight && (token.lightRadius || 4) > 0) {
        const radius = token.lightRadius || 4;
        const inRange = getHexesInRange({ col: token.gridX, row: token.gridY }, radius);
        inRange.forEach((h) => set.add(`${h.col},${h.row}`));
      }
    });

    return set;
  }, [tacticalState.lights, tokens]);

  const revealedSet = useMemo(() => {
    return new Set(tacticalState.fogRevealedCells || []);
  }, [tacticalState.fogRevealedCells]);

  // Aplicar pincel de névoa de guerra (revelar ou ocultar)
  const applyFogBrush = useCallback(
    (centerHex: HexCoord) => {
      const affectedHexes = getHexesInRange(centerHex, fogBrushRadius);
      const currentRevealed = new Set(tacticalState.fogRevealedCells || []);
      let changed = false;

      affectedHexes.forEach((h) => {
        const key = `${h.col},${h.row}`;
        if (fogBrushMode === 'reveal') {
          if (!currentRevealed.has(key)) {
            currentRevealed.add(key);
            changed = true;
          }
        } else {
          if (currentRevealed.has(key)) {
            currentRevealed.delete(key);
            changed = true;
          }
        }
      });

      if (changed) {
        onUpdateTacticalState({
          fogEnabled: true,
          fogRevealedCells: Array.from(currentRevealed),
        });
      }
    },
    [fogBrushRadius, fogBrushMode, tacticalState.fogRevealedCells, onUpdateTacticalState]
  );

  const handleRevealAllFog = useCallback(() => {
    const allCells: string[] = [];
    for (let r = -1; r <= dynamicRows + 2; r++) {
      for (let c = -1; c <= dynamicCols + 2; c++) {
        allCells.push(`${c},${r}`);
      }
    }
    onUpdateTacticalState({
      fogEnabled: true,
      fogRevealedCells: allCells,
    });
  }, [dynamicCols, dynamicRows, onUpdateTacticalState]);

  const handleHideAllFog = useCallback(() => {
    onUpdateTacticalState({
      fogEnabled: true,
      fogRevealedCells: [],
    });
  }, [onUpdateTacticalState]);

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

  // Zoom direcionado pelo ponteiro do mouse (scroll do mouse vai em direção ao cursor)
  const handleWheel = (e: React.WheelEvent) => {
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
        target.closest('.pointer-events-auto') ||
        target.closest('#tactical-top-toolbar-container'))
    ) {
      return;
    }

    if (contextMenu) {
      setContextMenu(null);
    }

    // Camada do Mapa ativa (Roll20 Map Layer): Arraste da imagem de base pelo mestre
    if (activeLayer === 'map' && isMaster && !tacticalState.mapImageLocked && e.button === 0) {
      const targetId = (e.target as HTMLElement).id;
      if (targetId === 'map-background' || (e.target as HTMLElement).tagName === 'svg') {
        const p = clientToMapCoords(e.clientX, e.clientY);
        setIsDraggingMap(true);
        setMapDragStart({
          x: p.x - (tacticalState.mapImageX || 0),
          y: p.y - (tacticalState.mapImageY || 0),
        });
        setPopoverToken(null);
        return;
      }
    }

    // 1. Ferramenta de Ocultação do Mapa (Névoa de Guerra estilo Roll20)
    if (activeTool === 'fog' && e.button === 0 && isMaster) {
      const p = clientToMapCoords(e.clientX, e.clientY);
      if (fogShape === 'box') {
        setFogBoxStart({ x: p.x - mapX, y: p.y - mapY });
        setFogBoxCurrent({ x: p.x - mapX, y: p.y - mapY });
      } else {
        const hex = pixelToHex(p.x - mapX, p.y - mapY, hexSize);
        setIsDrawingFog(true);
        applyFogBrush(hex);
      }
      setPopoverToken(null);
      return;
    }

    // 2. Ferramenta de Focos de Luz (Tochas, Fogueiras, Lanternas)
    if (activeTool === 'light' && e.button === 0 && isMaster) {
      const p = clientToMapCoords(e.clientX, e.clientY);
      const hex = pixelToHex(p.x - mapX, p.y - mapY, hexSize);
      const existing = (tacticalState.lights || []).find(
        (l) => l.gridX === hex.col && l.gridY === hex.row
      );
      if (existing) {
        // Remove foco de luz ao clicar nele com a ferramenta
        const updated = (tacticalState.lights || []).filter((l) => l.id !== existing.id);
        onUpdateTacticalState({ lights: updated });
      } else {
        // Cria novo foco de luz com o raio e cor customizados
        const newLight: TacticalLightSource = {
          id: `light-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          gridX: hex.col,
          gridY: hex.row,
          radius: customLightRadius,
          color: customLightColor,
          intensity: 0.85,
          label: `Luz (${customLightRadius}yd)`,
          active: true,
        };
        onUpdateTacticalState({
          lights: [...(tacticalState.lights || []), newLight],
        });
      }
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
        return;
      }

      if (rulerType === 'fixed') {
        if (!rulerStart) {
          setRulerStart(hex);
          setRulerCurrent(hex);
        } else {
          setRulerStart(null);
          setRulerCurrent(null);
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
    if (isDraggingMap) {
      const p = clientToMapCoords(e.clientX, e.clientY);
      const nextX = Math.round(p.x - mapDragStart.x);
      const nextY = Math.round(p.y - mapDragStart.y);
      setLocalMapPos({ x: nextX, y: nextY });
      return;
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
    setHoveredHex(hex);

    if (activeTool === 'fog' && isMaster) {
      if (fogShape === 'box' && fogBoxStart) {
        setFogBoxCurrent({ x: p.x - mapX, y: p.y - mapY });
      } else if (fogShape === 'brush' && isDrawingFog) {
        applyFogBrush(hex);
      }
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
        // Frente está embaixo no SVG (+Y = 90°). deg - 90 aponta a frente para o mouse:
        let rot = deg - 90;
        rot = ((rot % 360) + 360) % 360;
        // Snap (agarrar) a cada 30° para permitir agarrar tanto na linha dos hexágonos quanto no meio deles (12 posições):
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
    if (isDraggingMap) {
      setIsDraggingMap(false);
      if (localMapPos) {
        onUpdateTacticalState({
          mapImageX: localMapPos.x,
          mapImageY: localMapPos.y,
        });
        setLocalMapPos(null);
      }
    }

    if (isDrawingFog) {
      setIsDrawingFog(false);
    }

    if (fogBoxStart && fogBoxCurrent && isMaster) {
      const minX = Math.min(fogBoxStart.x, fogBoxCurrent.x);
      const maxX = Math.max(fogBoxStart.x, fogBoxCurrent.x);
      const minY = Math.min(fogBoxStart.y, fogBoxCurrent.y);
      const maxY = Math.max(fogBoxStart.y, fogBoxCurrent.y);

      if (maxX - minX > 5 || maxY - minY > 5) {
        const nextSet = new Set(revealedSet);
        for (let r = 0; r < gridRows; r++) {
          for (let c = 0; c < gridCols; c++) {
            const pt = getHexCenter(c, r, hexSize);
            if (pt.x >= minX && pt.x <= maxX && pt.y >= minY && pt.y <= maxY) {
              const key = `${c},${r}`;
              if (fogBrushMode === 'reveal') {
                nextSet.add(key);
              } else {
                nextSet.delete(key);
              }
            }
          }
        }
        onUpdateTacticalState({ fogRevealedCells: Array.from(nextSet) });
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
    updateViewport({ zoom: 1, panX: 40, panY: 40 });
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
    e.stopPropagation();
    setSelectedTokenId(token.id);
    onSelectNpc(token.npcId);
    setPopoverToken(null);
    if (contextMenu) setContextMenu(null);
  };

  // Handle token drag start
  const handleTokenMouseDown = (e: React.MouseEvent, token: TacticalToken) => {
    if (activeLayer === 'map') return; // Na camada do mapa, os tokens ficam congelados para calibrar o fundo
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
      onMouseLeave={() => {
        if (isDraggingMap) {
          setIsDraggingMap(false);
          if (localMapPos) {
            onUpdateTacticalState({
              mapImageX: localMapPos.x,
              mapImageY: localMapPos.y,
            });
            setLocalMapPos(null);
          }
        }
        if (isPanning) setIsPanning(false);
        if (draggedTokenId) {
          setDraggedTokenId(null);
          setDragTokenOrigin(null);
          setDragHoverHex(null);
        }
        if (isDrawingFog) setIsDrawingFog(false);
        if (rotatingTokenId) {
          setRotatingTokenId(null);
          setPreviewRotation(null);
        }
      }}
      onWheel={handleWheel}
      className={`relative w-full h-[calc(100vh-130px)] min-h-[550px] bg-slate-950 overflow-hidden select-none rounded-2xl border border-slate-800 shadow-2xl flex flex-col ${
        isPanning
          ? 'cursor-grabbing'
          : activeTool === 'select'
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
          currentUserRole={currentUserRole}
          onOpenPlayerPermissions={onOpenPlayerPermissions}
          editorCount={editorCount}
          users={users}
          editorUserIds={editorUserIds}
          onTogglePlayerPermission={onTogglePlayerPermission}
          onSetAllPlayerPermissions={onSetAllPlayerPermissions}
          fogBrushMode={fogBrushMode}
          onSetFogBrushMode={setFogBrushMode}
          fogBrushRadius={fogBrushRadius}
          onSetFogBrushRadius={setFogBrushRadius}
          fogShape={fogShape}
          onSetFogShape={setFogShape}
          onRevealAllFog={handleRevealAllFog}
          onHideAllFog={handleHideAllFog}
          selectedLightPreset={selectedLightPreset}
          onSelectLightPreset={setSelectedLightPreset}
          customLightRadius={customLightRadius}
          onSetCustomLightRadius={setCustomLightRadius}
          customLightColor={customLightColor}
          onSetCustomLightColor={setCustomLightColor}
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

          {/* Gradientes radiais para focos de luz fixos */}
          {(tacticalState.lights || []).map((light) => (
            <radialGradient
              key={`grad-light-${light.id}`}
              id={`light-glow-${light.id}`}
              cx="50%"
              cy="50%"
              r="50%"
            >
              <stop offset="0%" stopColor={light.color || '#f59e0b'} stopOpacity={0.65} />
              <stop offset="45%" stopColor={light.color || '#f59e0b'} stopOpacity={0.3} />
              <stop offset="85%" stopColor={light.color || '#f59e0b'} stopOpacity={0.08} />
              <stop offset="100%" stopColor={light.color || '#f59e0b'} stopOpacity={0} />
            </radialGradient>
          ))}

          {/* Gradientes radiais para tokens com luz própria */}
          {tokens.map((token) => {
            if (!token.emitsLight) return null;
            return (
              <radialGradient
                key={`grad-token-light-${token.id}`}
                id={`token-light-glow-${token.id}`}
                cx="50%"
                cy="50%"
                r="50%"
              >
                <stop offset="0%" stopColor={token.lightColor || '#f59e0b'} stopOpacity={0.6} />
                <stop offset="50%" stopColor={token.lightColor || '#f59e0b'} stopOpacity={0.25} />
                <stop offset="85%" stopColor={token.lightColor || '#f59e0b'} stopOpacity={0.06} />
                <stop offset="100%" stopColor={token.lightColor || '#f59e0b'} stopOpacity={0} />
              </radialGradient>
            );
          })}
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
                {mapBackgroundSrc ? (
                  <image
                    id="map-background"
                    href={mapBackgroundSrc}
                    x={mapX}
                    y={mapY}
                    width={mapW}
                    height={mapH}
                    preserveAspectRatio="none"
                    opacity={isMapActive ? "1" : "0.9"}
                    className={isMapActive && !tacticalState.mapImageLocked ? "cursor-move" : ""}
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      if (!tacticalState.mapImageWidth && img.naturalWidth && img.naturalHeight) {
                        onUpdateTacticalState({
                          mapImageWidth: img.naturalWidth,
                          mapImageHeight: img.naturalHeight,
                        });
                      }
                    }}
                  />
                ) : tacticalState.backgroundKey === 'dungeon' ? (
                  <rect
                    id="map-background"
                    x={mapX}
                    y={mapY}
                    width={mapW}
                    height={mapH}
                    fill="url(#grid-dungeon)"
                  />
                ) : tacticalState.backgroundKey === 'forest' ? (
                  <rect
                    id="map-background"
                    x={mapX}
                    y={mapY}
                    width={mapW}
                    height={mapH}
                    fill="url(#grid-forest)"
                  />
                ) : tacticalState.backgroundKey === 'tavern' ? (
                  <rect
                    id="map-background"
                    x={mapX}
                    y={mapY}
                    width={mapW}
                    height={mapH}
                    fill="url(#grid-tavern)"
                  />
                ) : tacticalState.backgroundKey === 'arena' ? (
                  <rect
                    id="map-background"
                    x={mapX}
                    y={mapY}
                    width={mapW}
                    height={mapH}
                    fill="url(#grid-arena)"
                  />
                ) : (
                  <rect
                    id="map-background"
                    x={mapX}
                    y={mapY}
                    width={mapW}
                    height={mapH}
                    fill="#0b1120"
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
                        🗺️ Camada 1: Mapa Base (Arraste para alinhar | Grid Hexagonal sobreposto)
                      </text>
                    </g>
                  </g>
                )}
              </g>
            );
          })()}

          {/* CAMADA 2: GRADE TÁTICA (HEX OU QUADRADA) - COBRE TODA A IMAGEM, SEM SOBRAR E SEM FALTAR */}
          {tacticalState.gridType === 'hex' ? (
            <g id="tactical-hex-grid" clipPath="url(#map-image-bounds)" pointerEvents="none">
              {Array.from({ length: dynamicRows + 2 }).map((_, rIdx) => {
                const r = rIdx - 1;
                return Array.from({ length: dynamicCols + 2 }).map((_, cIdx) => {
                  const c = cIdx - 1;
                  const relCenter = getHexCenter(c, r, hexSize);
                  const center = { x: mapX + relCenter.x, y: mapY + relCenter.y };
                  const pointsStr = getHexPointsString(center, hexSize);
                  const isHovered = hoveredHex?.col === c && hoveredHex?.row === r;

                  return (
                    <polygon
                      key={`hex-${c}-${r}`}
                      points={pointsStr}
                      fill={isHovered ? 'rgba(245, 158, 11, 0.15)' : 'transparent'}
                      stroke={tacticalState.gridColor || '#cbd5e1'}
                      strokeWidth={isHovered ? 1.5 : 1}
                      strokeOpacity={isHovered ? 0.7 : (tacticalState.gridOpacity ?? 0.28)}
                      className="transition-colors duration-75"
                    />
                  );
                });
              })}
            </g>
          ) : (
            <g id="tactical-square-grid" clipPath="url(#map-image-bounds)" pointerEvents="none">
              {(() => {
                const cellSize = hexSize * 1.5;
                const sqCols = Math.ceil(mapW / cellSize) + 2;
                const sqRows = Math.ceil(mapH / cellSize) + 2;
                return Array.from({ length: sqRows }).map((_, rIdx) => {
                  const r = rIdx;
                  return Array.from({ length: sqCols }).map((_, cIdx) => {
                    const c = cIdx;
                    const x = mapX + c * cellSize;
                    const y = mapY + r * cellSize;
                    return (
                      <rect
                        key={`sq-${c}-${r}`}
                        x={x}
                        y={y}
                        width={cellSize}
                        height={cellSize}
                        fill="transparent"
                        stroke={tacticalState.gridColor || '#cbd5e1'}
                        strokeWidth="1"
                        strokeOpacity={tacticalState.gridOpacity ?? 0.28}
                      />
                    );
                  });
                });
              })()}
            </g>
          )}

          {/* CAMADA 3: FOCOS DE LUZ (RADIAÇÃO & BRILHO AMBIENTE NO TABULEIRO) */}
          <g id="tactical-lights-glow" pointerEvents="none">
            {/* Brilho dos focos de luz fixos */}
            {(tacticalState.lights || []).map((light) => {
              if (light.active === false || light.radius <= 0) return null;
              const relCenter = getHexCenter(light.gridX, light.gridY, hexSize);
              const center = { x: mapX + relCenter.x, y: mapY + relCenter.y };
              const radiusPixels = light.radius * hexWidth * 0.95;

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
              if (!token.emitsLight || (token.lightRadius || 4) <= 0) return null;
              const displayGridX = draggedTokenId === token.id && dragHoverHex ? dragHoverHex.col : token.gridX;
              const displayGridY = draggedTokenId === token.id && dragHoverHex ? dragHoverHex.row : token.gridY;
              const relCenter = getHexCenter(displayGridX, displayGridY, hexSize);
              const center = { x: mapX + relCenter.x, y: mapY + relCenter.y };
              const radiusPixels = (token.lightRadius || 4) * hexWidth * 0.95;

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

          {/* ÍCONES DOS FOCOS DE LUZ FIXOS NO TABULEIRO */}
          <g id="tactical-light-sources">
            {(tacticalState.lights || []).map((light) => {
              const relCenter = getHexCenter(light.gridX, light.gridY, hexSize);
              const center = { x: mapX + relCenter.x, y: mapY + relCenter.y };

              return (
                <g
                  key={light.id}
                  transform={`translate(${center.x}, ${center.y})`}
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    const updated = (tacticalState.lights || []).map((l) =>
                      l.id === light.id ? { ...l, active: !l.active } : l
                    );
                    onUpdateTacticalState({ lights: updated });
                  }}
                  title={`${light.label || 'Foco de Luz'} (${light.radius} jardas) - Clique para ${light.active ? 'apagar' : 'acender'}`}
                >
                  <circle
                    cx="0"
                    cy="0"
                    r={hexSize * 0.45}
                    fill="#020617"
                    stroke={light.active ? (light.color || '#f59e0b') : '#64748b'}
                    strokeWidth="2"
                    opacity="0.9"
                  />
                  <text
                    x="0"
                    y="4.5"
                    fontSize="13"
                    textAnchor="middle"
                    className="select-none pointer-events-none"
                  >
                    {light.label === 'Fogueira' ? '🏕️' : light.label === 'Lanterna' ? '🏮' : light.label === 'Magia' ? '✨' : '🔥'}
                  </text>
                </g>
              );
            })}
          </g>

          {/* CAMADA 4: ARCOS DE COMBATE GURPS (FRENTE, FLANCOS E RETAGUARDA) */}
          {activeLayer !== 'map' && selectedToken && (
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
                      {/* Indicador de Camada M (Roxo - Mestre) / J (Verde - Jogadores) para o GM */}
                      {isMaster && (
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
                          title={
                            marker.layer === 'gm'
                              ? "Camada GM (Mestre). Clique para mover para Camada Jogadores (J)"
                              : "Camada Jogadores (Visível a todos). Clique para mover para Camada GM (M)"
                          }
                        >
                          <circle
                            cx="-58"
                            cy="-3"
                            r="8"
                            fill={marker.layer === 'gm' ? '#581c87' : '#064e3b'}
                            stroke={marker.layer === 'gm' ? '#c084fc' : '#34d399'}
                            strokeWidth="1.5"
                          />
                          <text
                            x="-58"
                            y="0.5"
                            fill={marker.layer === 'gm' ? '#f3e8ff' : '#ecfdf5'}
                            fontSize="9"
                            fontWeight="bold"
                            textAnchor="middle"
                            pointerEvents="none"
                          >
                            {marker.layer === 'gm' ? 'M' : 'J'}
                          </text>
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
                        title="Apagar esta área do mapa"
                      >
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
                      {/* Indicador de Camada M (Roxo - Mestre) / J (Verde - Jogadores) para o GM */}
                      {isMaster && (
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
                          title={
                            marker.layer === 'gm'
                              ? "Camada GM (Mestre). Clique para mover para Camada Jogadores (J)"
                              : "Camada Jogadores (Visível a todos). Clique para mover para Camada GM (M)"
                          }
                        >
                          <circle
                            cx="-58"
                            cy="-3"
                            r="8"
                            fill={marker.layer === 'gm' ? '#581c87' : '#064e3b'}
                            stroke={marker.layer === 'gm' ? '#c084fc' : '#34d399'}
                            strokeWidth="1.5"
                          />
                          <text
                            x="-58"
                            y="0.5"
                            fill={marker.layer === 'gm' ? '#f3e8ff' : '#ecfdf5'}
                            fontSize="9"
                            fontWeight="bold"
                            textAnchor="middle"
                            pointerEvents="none"
                          >
                            {marker.layer === 'gm' ? 'M' : 'J'}
                          </text>
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
                        title="Apagar esta medição do mapa"
                      >
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

          {/* CAMADA 7: TOKENS DE COMBATE (ocultos na Camada do Mapa; na Camada Tokens mostra apenas visão pública de jogadores) */}
          {activeLayer !== 'map' && (
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
              const tokenRadius = hexSize * 0.75;

              const hpPercent =
                npc.hpMax > 0
                  ? Math.max(0, Math.min(100, (npc.hpCurrent / npc.hpMax) * 100))
                  : 100;

              const badgeWidth = Math.min(110, Math.max(40, npc.name.length * 7));

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
                  opacity={isTokenHidden ? 0.58 : 1}
                  pointerEvents={activeLayer === 'map' ? 'none' : 'auto'}
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
                    {/* 1. Círculo de Base com Borda Cinza Neutra, Cor da Manobra ou Roxo GM */}
                    <circle
                      cx="0"
                      cy="0"
                      r={tokenRadius + 3}
                      fill="#0f172a"
                      stroke={maneuverBorderColor}
                      strokeWidth={isSelected ? 3.5 : isTokenHidden ? 3 : 2.5}
                      strokeDasharray={isTokenHidden ? "4,2" : undefined}
                    />

                    {/* Anel Externo Dourado Indicador de Seleção */}
                    {isSelected && (
                      <circle
                        cx="0"
                        cy="0"
                        r={tokenRadius + 6.5}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="2"
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

                    {/* NÍVEL 3: FLAG DO MESTRE NA CAMADA GM (com clique rápido para mover entre camadas) */}
                    {isMaster && activeLayer === 'gm' && (
                      <g
                        transform={`translate(0, ${-tokenRadius - 32})`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleTokenVisibility(token.id);
                        }}
                        className="cursor-pointer hover:scale-105 transition-transform"
                        title={isTokenHidden ? "Clique para mover para a Camada de Tokens (Visível aos Jogadores)" : "Clique para mover para a Camada do Mestre (Oculto)"}
                      >
                        <rect
                          x="-38"
                          y="-7.5"
                          width="76"
                          height="15"
                          rx="7.5"
                          fill={isTokenHidden ? "#4c1d95" : "#064e3b"}
                          fillOpacity="0.95"
                          stroke={isTokenHidden ? "#c084fc" : "#34d399"}
                          strokeWidth="1"
                        />
                        <text
                          x="0"
                          y="3"
                          fill={isTokenHidden ? "#f5d0fe" : "#a7f3d0"}
                          fontSize="8.5"
                          fontWeight="bold"
                          textAnchor="middle"
                          letterSpacing="0.3"
                        >
                          {isTokenHidden ? "👁️‍🗨️ SÓ MESTRE" : "👁️ JOGADORES"}
                        </text>
                      </g>
                    )}

                    {/* 3. NOME DO PERSONAGEM EM CIMA DA FOTO (gira junto com o token) */}
                    <rect
                      x={-badgeWidth / 2}
                      y={-tokenRadius - 18}
                      width={badgeWidth}
                      height="15"
                      rx="4"
                      fill="#020617"
                      fillOpacity="0.9"
                      stroke="#334155"
                      strokeWidth="0.8"
                    />
                    <text
                      x="0"
                      y={-tokenRadius - 7}
                      fill="#f1f5f9"
                      fontSize="9.5"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {npc.name}
                    </text>

                    {/* 4. MARCAÇÃO DE FRENTE EMBAIXO DA FOTO (onde ficava o nome) */}
                    <polygon
                      points={`0,${tokenRadius + 13} -8,${tokenRadius + 3} 8,${tokenRadius + 3}`}
                      fill="#f59e0b"
                      stroke="#020617"
                      strokeWidth="1.2"
                    />
                    <circle cx="0" cy={tokenRadius + 5} r="1.5" fill="#ffffff" />

                    {/* 5. "PAUZINHO" DE ROTAÇÃO (Roll20 Rotation Handle) QUANDO SELECIONADO */}
                    {isSelected && (
                      <g className="cursor-grab">
                        {/* Haste estendida conectando a marcação de frente até a alça */}
                        <line
                          x1="0"
                          y1={tokenRadius + 13}
                          x2="0"
                          y2={tokenRadius + 30}
                          stroke="#38bdf8"
                          strokeWidth="2.5"
                          strokeDasharray="3,2"
                        />
                        {/* Alça circular na ponta do pauzinho */}
                        <circle
                          cx="0"
                          cy={tokenRadius + 30}
                          r="6.5"
                          fill="#0284c7"
                          stroke="#ffffff"
                          strokeWidth="2"
                          className="hover:scale-125 transition-transform"
                        />
                        <circle cx="0" cy={tokenRadius + 30} r="2" fill="#ffffff" />
                        {/* Hitbox invisível ampla para facilitar o clique e arrasto no mouse/touch */}
                        <circle
                          cx="0"
                          cy={tokenRadius + 30}
                          r="15"
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
          )}

          {/* CAMADA 8: OCULTAÇÃO DE ÁREAS / NÉVOA DE GUERRA (ESTILO ROLL20) */}
          {tacticalState.fogEnabled && (
            <g id="tactical-fog-layer" clipPath="url(#map-image-bounds)" pointerEvents="none">
              {Array.from({ length: dynamicRows + 2 }).map((_, rIdx) => {
                const r = rIdx - 1;
                return Array.from({ length: dynamicCols + 2 }).map((_, cIdx) => {
                  const c = cIdx - 1;
                  const key = `${c},${r}`;
                  const isRevealed = revealedSet.has(key);
                  const isLit = litCellsSet.has(key);

                  // Se o hex está revelado pelo mestre OU iluminado por luz, NÃO está oculto!
                  if (isRevealed || isLit) return null;

                  const relCenter = getHexCenter(c, r, hexSize);
                  const center = { x: mapX + relCenter.x, y: mapY + relCenter.y };
                  const pointsStr = getHexPointsString(center, hexSize);

                  return (
                    <polygon
                      key={`fog-${c}-${r}`}
                      points={pointsStr}
                      fill={isPlayerView ? '#000000' : 'rgba(2, 6, 23, 0.78)'}
                      stroke={isPlayerView ? '#000000' : 'rgba(15, 23, 42, 0.45)'}
                      strokeWidth={0.5}
                    />
                  );
                });
              })}
            </g>
          )}

          {/* PREVIEW DO RETÂNGULO DE SELEÇÃO DA NÉVOA DE GUERRA */}
          {activeTool === 'fog' && fogShape === 'box' && fogBoxStart && fogBoxCurrent && (
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
                rx={4}
              />
            </g>
          )}

          {/* PREVIEW DO PINCEL DE NÉVOA DE GUERRA */}
          {activeTool === 'fog' && fogShape === 'brush' && hoveredHex && (
            <g id="fog-brush-preview" pointerEvents="none">
              {getHexesInRange(hoveredHex, fogBrushRadius).map((h) => {
                const relCenter = getHexCenter(h.col, h.row, hexSize);
                const center = { x: mapX + relCenter.x, y: mapY + relCenter.y };
                const pointsStr = getHexPointsString(center, hexSize);
                return (
                  <polygon
                    key={`brush-${h.col}-${h.row}`}
                    points={pointsStr}
                    fill={fogBrushMode === 'reveal' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}
                    stroke={fogBrushMode === 'reveal' ? '#10b981' : '#ef4444'}
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                  />
                );
              })}
            </g>
          )}

          {/* PREVIEW DO FOCO DE LUZ AO PASSAR O MOUSE */}
          {activeTool === 'light' && hoveredHex && (
            <g id="light-brush-preview" pointerEvents="none">
              {(() => {
                const relCenter = getHexCenter(hoveredHex.col, hoveredHex.row, hexSize);
                const center = { x: mapX + relCenter.x, y: mapY + relCenter.y };
                const radiusPixels = (customLightRadius || 5) * hexWidth * 0.95;

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
            className="fixed inset-0 z-50 pointer-events-auto"
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
                    <span>Emissão de Luz:</span>
                  </span>
                  {token.emitsLight && (
                    <span className="text-[9.5px] font-mono text-amber-300 font-bold">
                      {token.lightRadius || 4} yd
                    </span>
                  )}
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
                      setContextMenu(null);
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
                      setContextMenu(null);
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
                      setContextMenu(null);
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
    </div>
  );
};
