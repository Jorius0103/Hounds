import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  TacticalState,
  TacticalToken,
  FacingDirection,
  TACTICAL_MAP_PRESETS,
} from '../../types/tactical';
import { NPC, UserAccount } from '../../types/rpg';
import { TacticalToolbar, TacticalToolMode } from './TacticalToolbar';
import { TacticalTokenSidebar } from './TacticalTokenSidebar';
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
import { NpcAvatar } from '../NpcAvatar';
import {
  Ruler,
  Crosshair,
  Shield,
  EyeOff,
  Skull,
  Zap,
  Footprints,
  Heart,
  X,
  Swords,
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

  const [activeTool, setActiveTool] = useState<TacticalToolMode>('select');
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [hoveredHex, setHoveredHex] = useState<HexCoord | null>(null);

  // Ruler state
  const [rulerStart, setRulerStart] = useState<HexCoord | null>(null);
  const [rulerCurrent, setRulerCurrent] = useState<HexCoord | null>(null);

  // Area template state
  const [areaRadius, setAreaRadius] = useState<number>(2); // em jardas
  const [areaCenter, setAreaCenter] = useState<HexCoord | null>(null);

  // Dragging state for Tokens and Canvas Pan
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });
  const [draggedTokenId, setDraggedTokenId] = useState<string | null>(null);
  const [dragTokenOrigin, setDragTokenOrigin] = useState<HexCoord | null>(null);
  const [rotatingTokenId, setRotatingTokenId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    tokenId: string;
    npcId: string;
    x: number;
    y: number;
  } | null>(null);

  // Popover state
  const [popoverToken, setPopoverToken] = useState<TacticalToken | null>(null);
  const [popoverPos, setPopoverPos] = useState<Point>({ x: 0, y: 0 });

  const isMaster = currentUserRole === 'mestre';

  // Map of characters by id
  const characterMap = useMemo(() => {
    const map = new Map<string, NPC>();
    characters.forEach((c) => map.set(c.id, c));
    return map;
  }, [characters]);

  // Selected token object
  const selectedToken = useMemo(() => {
    return tacticalState.tokens.find((t) => t.id === selectedTokenId) || null;
  }, [tacticalState.tokens, selectedTokenId]);

  // Selected NPC
  const selectedTokenNpc = useMemo(() => {
    if (!selectedToken) return null;
    return characterMap.get(selectedToken.npcId) || null;
  }, [selectedToken, characterMap]);

  // Compute hex grid dimensions
  const hexSize = tacticalState.hexSize;
  const gridCols = tacticalState.gridCols;
  const gridRows = tacticalState.gridRows;
  const hexWidth = Math.sqrt(3) * hexSize;
  const hexHeight = 2 * hexSize;
  const mapPixelWidth = (gridCols + 1) * hexWidth;
  const mapPixelHeight = (gridRows + 1) * (1.5 * hexSize);

  // Reachable movement hexes for selected token
  const movementHexes = useMemo(() => {
    if (!selectedToken || !selectedTokenNpc) return [];
    let moveAllowance = 5;
    if (typeof selectedTokenNpc.basicMove === 'number') {
      moveAllowance = selectedTokenNpc.basicMove;
    } else {
      moveAllowance = parseInt(String(selectedTokenNpc.basicMove)) || 5;
    }

    // Se a manobra for Passo e Ataque, movimento é 1 jarda
    const maneuver = selectedTokenNpc.combatManeuver || '';
    if (maneuver.includes('Passo')) {
      moveAllowance = 1;
    } else if (maneuver.includes('Deslocamento Total') || maneuver.includes('Sprint')) {
      moveAllowance = moveAllowance * 2;
    } else if (maneuver.includes('Ataque Total')) {
      moveAllowance = Math.max(1, Math.floor(moveAllowance / 2));
    }

    return getHexesInRange({ col: selectedToken.gridX, row: selectedToken.gridY }, moveAllowance);
  }, [selectedToken, selectedTokenNpc]);

  // Convert client mouse event to map coordinate (respecting pan and zoom)
  const clientToMapCoords = useCallback(
    (clientX: number, clientY: number): Point => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      const x = (clientX - rect.left - tacticalState.panX) / tacticalState.zoom;
      const y = (clientY - rect.top - tacticalState.panY) / tacticalState.zoom;
      return { x, y };
    },
    [tacticalState.panX, tacticalState.panY, tacticalState.zoom]
  );

  // Pan controls
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.max(0.4, Math.min(2.5, tacticalState.zoom * zoomFactor));
    onUpdateTacticalState({ zoom: newZoom });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (contextMenu) {
      setContextMenu(null);
    }

    // Middle click or space key or clicking empty area starts pan
    if (e.button === 1 || e.button === 0) {
      if ((e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).id === 'map-background') {
        setIsPanning(true);
        setPanStart({ x: e.clientX - tacticalState.panX, y: e.clientY - tacticalState.panY });
        setPopoverToken(null);
      }
    }

    // Ruler tool start
    if (activeTool === 'ruler' && e.button === 0) {
      const p = clientToMapCoords(e.clientX, e.clientY);
      const hex = pixelToHex(p.x, p.y, hexSize);
      setRulerStart(hex);
      setRulerCurrent(hex);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      onUpdateTacticalState({
        panX: e.clientX - panStart.x,
        panY: e.clientY - panStart.y,
      });
      return;
    }

    const p = clientToMapCoords(e.clientX, e.clientY);
    const hex = pixelToHex(p.x, p.y, hexSize);
    setHoveredHex(hex);

    if (activeTool === 'ruler' && rulerStart) {
      setRulerCurrent(hex);
    }

    if (activeTool === 'area') {
      setAreaCenter(hex);
    }

    // Rotação ativa do token pelo "pauzinho" (Roll20 rotation handle)
    if (rotatingTokenId) {
      const token = tacticalState.tokens.find((t) => t.id === rotatingTokenId);
      if (token) {
        const center = getHexCenter(token.gridX, token.gridY, hexSize);
        const dx = p.x - center.x;
        const dy = p.y - center.y;
        const deg = (Math.atan2(dy, dx) * 180) / Math.PI;
        // Frente está embaixo no SVG (+Y = 90°). deg - 90 aponta a frente para o mouse:
        let rot = deg - 90;
        rot = ((rot % 360) + 360) % 360;
        // Snap (agarrar) a cada 30° para permitir agarrar tanto na linha dos hexágonos quanto no meio deles (12 posições):
        const snappedRot = (Math.round(rot / 30) * 30) % 360;
        const facingIndex = (Math.round(((snappedRot + 180) % 360) / 60) % 6) as FacingDirection;

        const updatedTokens = tacticalState.tokens.map((t) =>
          t.id === rotatingTokenId
            ? { ...t, rotation: snappedRot, facing: facingIndex }
            : t
        );
        onUpdateTacticalState({ tokens: updatedTokens });
      }
      return;
    }

    // Live dragging of a token
    if (draggedTokenId) {
      const updatedTokens = tacticalState.tokens.map((t) => {
        if (t.id === draggedTokenId) {
          return {
            ...t,
            gridX: hex.col,
            gridY: hex.row,
          };
        }
        return t;
      });
      onUpdateTacticalState({ tokens: updatedTokens });
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
    }

    if (rotatingTokenId) {
      setRotatingTokenId(null);
    }

    if (draggedTokenId && dragTokenOrigin) {
      const token = tacticalState.tokens.find((t) => t.id === draggedTokenId);
      if (token) {
        const movedYards = getHexDistance(dragTokenOrigin, { col: token.gridX, row: token.gridY });
        const updatedTokens = tacticalState.tokens.map((t) =>
          t.id === draggedTokenId ? { ...t, movedThisTurn: (t.movedThisTurn || 0) + movedYards } : t
        );
        onUpdateTacticalState({ tokens: updatedTokens });
      }
      setDraggedTokenId(null);
      setDragTokenOrigin(null);
    }
  };

  // Zoom helpers
  const handleZoomIn = () => {
    onUpdateTacticalState({ zoom: Math.min(2.5, tacticalState.zoom * 1.2) });
  };

  const handleZoomOut = () => {
    onUpdateTacticalState({ zoom: Math.max(0.4, tacticalState.zoom / 1.2) });
  };

  const handleResetView = () => {
    onUpdateTacticalState({ zoom: 1, panX: 40, panY: 40 });
  };

  // Auto-place all characters onto map
  const handleAutoPlaceTokens = () => {
    const existingNpcIds = new Set(tacticalState.tokens.map((t) => t.npcId));
    const newTokens: TacticalToken[] = [...tacticalState.tokens];

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
    const existing = tacticalState.tokens.find((t) => t.npcId === npcId);
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
      gridY: 6 + (tacticalState.tokens.length % 6) * 2,
      facing: (isPlayer ? 1 : 4) as FacingDirection,
      elevation: 0,
      reach: 1,
      size: 1,
      hiddenFromPlayers: !isPlayer && !targetNpc?.isVisibleToPlayer,
    };

    onUpdateTacticalState({ tokens: [...tacticalState.tokens, newToken] });
    setSelectedTokenId(newToken.id);
  };

  // Focus view on a token
  const handleFocusToken = (token: TacticalToken) => {
    if (!containerRef.current) return;
    const center = getHexCenter(token.gridX, token.gridY, hexSize);
    const rect = containerRef.current.getBoundingClientRect();
    const newPanX = rect.width / 2 - center.x * tacticalState.zoom;
    const newPanY = rect.height / 2 - center.y * tacticalState.zoom;
    onUpdateTacticalState({ panX: newPanX, panY: newPanY });
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
    if (e.button !== 0 || token.isPinned || rotatingTokenId) return;
    const tokenNpc = characterMap.get(token.npcId);
    const canEditToken = isMaster || hasEditPermission;
    if (!canEditToken) return;
    e.stopPropagation();
    if (contextMenu) setContextMenu(null);
    setDraggedTokenId(token.id);
    setDragTokenOrigin({ col: token.gridX, row: token.gridY });
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

  // Clear ruler & markers
  const handleClearMarkers = () => {
    setRulerStart(null);
    setRulerCurrent(null);
    setAreaCenter(null);
    onUpdateTacticalState({ markers: [] });
  };

  // Background asset URL
  const currentPreset =
    TACTICAL_MAP_PRESETS.find((p) => p.key === tacticalState.backgroundKey) ||
    TACTICAL_MAP_PRESETS[0];

  const mapBackgroundSrc =
    tacticalState.backgroundKey === 'custom'
      ? tacticalState.customImageUrl
      : currentPreset.url;

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      className="relative w-full h-[calc(100vh-130px)] min-h-[550px] bg-slate-950 overflow-hidden select-none cursor-crosshair rounded-2xl border border-slate-800 shadow-2xl flex flex-col"
    >
      {/* 1. TOP TOOLBAR */}
      <div className="absolute top-3 left-3 right-3 z-30 pointer-events-auto">
        <TacticalToolbar
          tacticalState={tacticalState}
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
          currentUserRole={currentUserRole}
          onOpenPlayerPermissions={onOpenPlayerPermissions}
          editorCount={editorCount}
          users={users}
          editorUserIds={editorUserIds}
          onTogglePlayerPermission={onTogglePlayerPermission}
          onSetAllPlayerPermissions={onSetAllPlayerPermissions}
        />
      </div>

      {/* 2. SIDEBAR DE COMBATENTES (À DIREITA) */}
      <div className="absolute top-18 right-3 bottom-3 z-20 pointer-events-auto flex">
        <TacticalTokenSidebar
          characters={characters}
          tokens={tacticalState.tokens}
          selectedTokenId={selectedTokenId}
          onSelectToken={(id) => {
            setSelectedTokenId(id);
            const token = tacticalState.tokens.find((t) => t.id === id);
            if (token) onSelectNpc(token.npcId);
          }}
          onPlaceToken={handlePlaceToken}
          onFocusToken={handleFocusToken}
          onUpdateNpc={(partial) => {
            if (selectedTokenNpc) onUpdateNpc({ ...selectedTokenNpc, ...partial });
          }}
          currentUserRole={currentUserRole}
        />
      </div>

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
        </defs>

        {/* Grupo com Pan & Zoom transform */}
        <g
          transform={`translate(${tacticalState.panX}, ${tacticalState.panY}) scale(${tacticalState.zoom})`}
        >
          {/* CAMADA 1: FUNDO DO MAPA */}
          {mapBackgroundSrc ? (
            <image
              id="map-background"
              href={mapBackgroundSrc}
              x="0"
              y="0"
              width={mapPixelWidth}
              height={mapPixelHeight}
              preserveAspectRatio="xMidYMid slice"
              opacity="0.85"
            />
          ) : tacticalState.backgroundKey === 'dungeon' ? (
            <rect
              id="map-background"
              x="0"
              y="0"
              width={mapPixelWidth}
              height={mapPixelHeight}
              fill="url(#grid-dungeon)"
            />
          ) : tacticalState.backgroundKey === 'forest' ? (
            <rect
              id="map-background"
              x="0"
              y="0"
              width={mapPixelWidth}
              height={mapPixelHeight}
              fill="url(#grid-forest)"
            />
          ) : tacticalState.backgroundKey === 'tavern' ? (
            <rect
              id="map-background"
              x="0"
              y="0"
              width={mapPixelWidth}
              height={mapPixelHeight}
              fill="url(#grid-tavern)"
            />
          ) : tacticalState.backgroundKey === 'arena' ? (
            <rect
              id="map-background"
              x="0"
              y="0"
              width={mapPixelWidth}
              height={mapPixelHeight}
              fill="url(#grid-arena)"
            />
          ) : (
            <rect
              id="map-background"
              x="0"
              y="0"
              width={mapPixelWidth}
              height={mapPixelHeight}
              fill="#0b1120"
            />
          )}

          {/* CAMADA 2: GRADE TÁTICA (HEX OU QUADRADA) */}
          {tacticalState.gridType === 'hex' ? (
            <g id="tactical-hex-grid">
              {Array.from({ length: gridRows }).map((_, r) =>
                Array.from({ length: gridCols }).map((_, c) => {
                  const center = getHexCenter(c, r, hexSize);
                  const pointsStr = getHexPointsString(center, hexSize);
                  const isHovered = hoveredHex?.col === c && hoveredHex?.row === r;

                  return (
                    <polygon
                      key={`hex-${c}-${r}`}
                      points={pointsStr}
                      fill={isHovered ? 'rgba(245, 158, 11, 0.15)' : 'transparent'}
                      stroke={tacticalState.gridColor}
                      strokeWidth={isHovered ? 1.5 : 1}
                      strokeOpacity={isHovered ? 0.7 : tacticalState.gridOpacity}
                      className="transition-colors duration-75"
                    />
                  );
                })
              )}
            </g>
          ) : (
            <g id="tactical-square-grid">
              {Array.from({ length: gridRows }).map((_, r) =>
                Array.from({ length: gridCols }).map((_, c) => {
                  const cellSize = hexSize * 1.5;
                  const x = c * cellSize;
                  const y = r * cellSize;
                  return (
                    <rect
                      key={`sq-${c}-${r}`}
                      x={x}
                      y={y}
                      width={cellSize}
                      height={cellSize}
                      fill="transparent"
                      stroke={tacticalState.gridColor}
                      strokeWidth="1"
                      strokeOpacity={tacticalState.gridOpacity}
                    />
                  );
                })
              )}
            </g>
          )}

          {/* CAMADA 3: ALCANCE DE MOVIMENTO DO TOKEN SELECIONADO */}
          {selectedToken && movementHexes.length > 0 && (
            <g id="movement-range">
              {movementHexes.map((hex, idx) => {
                const center = getHexCenter(hex.col, hex.row, hexSize);
                const pointsStr = getHexPointsString(center, hexSize);
                return (
                  <polygon
                    key={`move-hex-${idx}`}
                    points={pointsStr}
                    fill="rgba(16, 185, 129, 0.12)"
                    stroke="rgba(16, 185, 129, 0.45)"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                );
              })}
            </g>
          )}

          {/* CAMADA 4: ARCOS DE COMBATE GURPS (FRENTE, FLANCOS E RETAGUARDA) */}
          {selectedToken && (
            <g id="gurps-combat-arcs">
              {(() => {
                const center = getHexCenter(selectedToken.gridX, selectedToken.gridY, hexSize);
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

          {/* CAMADA 5: MODELO DE ÁREA / EXPLOSÃO */}
          {activeTool === 'area' && areaCenter && (
            <g id="area-template">
              {(() => {
                const center = getHexCenter(areaCenter.col, areaCenter.row, hexSize);
                const radiusPixels = areaRadius * hexSize * 1.7;
                return (
                  <g>
                    <circle
                      cx={center.x}
                      cy={center.y}
                      r={radiusPixels}
                      fill="rgba(239, 68, 68, 0.2)"
                      stroke="#ef4444"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={center.x}
                      y={center.y - radiusPixels - 8}
                      fill="#ef4444"
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

          {/* CAMADA 6: RÉGUA TÁTICA (DISTÂNCIA E PENALIDADE GURPS) */}
          {rulerStart && rulerCurrent && (
            <g id="tactical-ruler">
              {(() => {
                const pA = getHexCenter(rulerStart.col, rulerStart.row, hexSize);
                const pB = getHexCenter(rulerCurrent.col, rulerCurrent.row, hexSize);
                const distanceYards = getHexDistance(rulerStart, rulerCurrent);
                const rangePenalty = getGurpsRangePenalty(distanceYards);

                // Detecta arco de defesa se o alvo for um token
                const targetToken = tacticalState.tokens.find(
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

          {/* CAMADA 7: TOKENS DE COMBATE */}
          <g id="tactical-tokens">
            {tacticalState.tokens.map((token) => {
              const npc = characterMap.get(token.npcId);
              if (!npc) return null;

              // Visibilidade de espectador / jogador
              if (!isMaster && token.hiddenFromPlayers) return null;

              const isPlayer = npc.characterType === 'player';
              const isSelected = token.id === selectedTokenId;
              const center = getHexCenter(token.gridX, token.gridY, hexSize);
              const tokenRotation =
                typeof token.rotation === 'number'
                  ? token.rotation
                  : ((token.facing * 60 + 180) % 360);
              const tokenRadius = hexSize * 0.75;

              const hpPercent =
                npc.hpMax > 0
                  ? Math.max(0, Math.min(100, (npc.hpCurrent / npc.hpMax) * 100))
                  : 100;

              const badgeWidth = Math.min(110, Math.max(40, npc.name.length * 7));

              // Manobra ativa do personagem / NPC para colorir a borda do token
              const maneuver = npc.combatManeuver ? getCombatManeuver(npc.combatManeuver) : undefined;
              const maneuverBorderColor = maneuver?.borderHex || maneuver?.bgHex || (isPlayer ? '#10b981' : '#ef4444');

              return (
                <g
                  key={token.id}
                  transform={`translate(${center.x}, ${center.y})`}
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
                      : 'drop-shadow(0px 3px 6px rgba(0, 0, 0, 0.6))',
                  }}
                >
                  {/* GRUPO ROTATIVO INTEGRAL: Foto, Nome (em cima), Frente (embaixo) e Pauzinho giram juntos */}
                  <g transform={`rotate(${tokenRotation})`}>
                    {/* 1. Círculo de Base com Borda na Cor da Manobra */}
                    <circle
                      cx="0"
                      cy="0"
                      r={tokenRadius + 3}
                      fill={isPlayer ? '#065f46' : '#7f1d1d'}
                      stroke={maneuverBorderColor}
                      strokeWidth={isSelected ? 4 : 2.5}
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

                    {/* 2. Retrato / Avatar recortado */}
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
                      <circle
                        cx="0"
                        cy="0"
                        r={tokenRadius}
                        fill={isPlayer ? '#047857' : '#991b1b'}
                      />
                    )}

                    {/* Iniciais sobre o token se sem avatar */}
                    {!npc.avatar && (
                      <text
                        x="0"
                        y="4"
                        fill="#ffffff"
                        fontSize="11"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {npc.name.slice(0, 2).toUpperCase()}
                      </text>
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
        </g>
      </svg>

      {/* MENU DE CONTEXTO DO TOKEN (BOTÃO DIREITO: DADOS, MANOBRA E LANÇAR DANO) */}
      {contextMenu && (() => {
        const token = tacticalState.tokens.find((t) => t.id === contextMenu.tokenId);
        const npc = token ? characterMap.get(token.npcId) : null;
        if (!token || !npc) return null;

        const isPlayer = npc.characterType === 'player';
        const hp = typeof npc.hpCurrent === 'number' ? npc.hpCurrent : (npc.hpMax || 0);
        const hpMax = npc.hpMax || 0;
        const fp = typeof npc.fpCurrent === 'number' ? npc.fpCurrent : (npc.fpMax || 0);
        const fpMax = npc.fpMax || 0;
        const currentManeuver = getCombatManeuver(npc.combatManeuver);

        // Clamping para manter o menu sempre visível na tela
        const menuWidth = 270;
        const menuHeight = 360;
        const posX = Math.min(Math.max(12, contextMenu.x), window.innerWidth - menuWidth - 12);
        const posY = Math.min(Math.max(12, contextMenu.y), window.innerHeight - menuHeight - 12);

        return (
          <div
            className="fixed inset-0 z-50 pointer-events-auto"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu(null);
            }}
          >
            <div
              className="absolute bg-slate-950/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3.5 shadow-2xl w-[270px] space-y-3 text-slate-100 select-none animate-in fade-in zoom-in-95 duration-100"
              style={{
                left: `${posX}px`,
                top: `${posY}px`,
              }}
              onClick={(e) => e.stopPropagation()}
              onContextMenu={(e) => e.stopPropagation()}
            >
              {/* Cabeçalho */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-slate-700 bg-slate-800 flex items-center justify-center">
                    {npc.avatar ? (
                      <img src={npc.avatar} alt={npc.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[11px] font-bold text-amber-400">
                        {npc.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-white text-xs truncate leading-tight">
                      {npc.name}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {isPlayer ? 'Jogador' : 'NPC'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setContextMenu(null)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Atributos PV e FP */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2 flex flex-col gap-0.5">
                  <div className="flex items-center justify-between text-slate-400 text-[10px] font-semibold">
                    <span className="flex items-center gap-1">
                      <Heart size={11} className="text-rose-400" /> PV
                    </span>
                    <span className="text-slate-500 font-mono">Max: {hpMax}</span>
                  </div>
                  <div className={`text-sm font-bold font-mono ${hp <= 0 ? 'text-rose-400' : hp < hpMax / 3 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {hp} <span className="text-[10px] text-slate-500 font-normal">/ {hpMax}</span>
                  </div>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2 flex flex-col gap-0.5">
                  <div className="flex items-center justify-between text-slate-400 text-[10px] font-semibold">
                    <span className="flex items-center gap-1">
                      <Zap size={11} className="text-cyan-400" /> FP (Fadiga)
                    </span>
                    <span className="text-slate-500 font-mono">Max: {fpMax}</span>
                  </div>
                  <div className={`text-sm font-bold font-mono ${fp <= 0 ? 'text-rose-400' : fp < fpMax / 3 ? 'text-amber-400' : 'text-cyan-400'}`}>
                    {fp} <span className="text-[10px] text-slate-500 font-normal">/ {fpMax}</span>
                  </div>
                </div>
              </div>

              {/* Seletor de Manobra de Combate */}
              <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                    <Shield size={12} className="text-amber-400" /> Manobra de Combate
                  </span>
                  {currentManeuver && (
                    <button
                      type="button"
                      onClick={() => onUpdateNpc({ ...npc, combatManeuver: undefined })}
                      className="text-[9.5px] text-slate-500 hover:text-rose-400 transition-colors"
                      title="Limpar manobra"
                    >
                      Limpar
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-1.5 max-h-[140px] overflow-y-auto pr-0.5 scrollbar-thin">
                  {COMBAT_MANEUVERS.map((m) => {
                    const isSelected = npc.combatManeuver === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          const newManeuver = isSelected ? undefined : m.id;
                          onUpdateNpc({ ...npc, combatManeuver: newManeuver });
                        }}
                        className={`px-2 py-1.5 rounded-lg text-[10.5px] font-semibold flex items-center justify-between transition-all border ${
                          isSelected
                            ? 'ring-2 ring-white/60 shadow-md font-bold'
                            : 'opacity-85 hover:opacity-100 hover:scale-[1.02]'
                        }`}
                        style={{
                          backgroundColor: m.bgHex,
                          color: m.textHex,
                          borderColor: m.borderHex,
                        }}
                      >
                        <span className="truncate">{m.name}</span>
                        {isSelected && <span className="text-xs">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Botão de Ação: Lançar Dano / Fadiga / Itens */}
              <div className="pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setContextMenu(null);
                    onOpenDamageCalculator?.(npc);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 transition-all active:scale-[0.98]"
                >
                  <Swords size={14} />
                  <span>Lançar Dano / Fadiga / Itens</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 5. FOOTER DE DADOS TÁTICOS (INFORMAÇÕES DE CÉLULA E COORDENADAS) */}
      <div className="absolute bottom-3 left-3 z-20 pointer-events-none flex items-center gap-2">
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
    </div>
  );
};
