import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  TacticalState,
  TacticalToken,
  FacingDirection,
  TACTICAL_MAP_PRESETS,
  TacticalMarker,
  TacticalProp,
  TacticalFogMask,
  TacticalFogOp,
} from '../../types/tactical';
import { NPC, UserAccount } from '../../types/rpg';
import { TacticalToolbar, TacticalToolMode } from './TacticalToolbar';
import { TacticalIllustrativePresets } from './TacticalIllustrativePresets';
import { TacticalPropsRenderer } from './TacticalPropsRenderer';
import { TacticalPropsModal } from './TacticalPropsModal';
import {
  getHexCenter,
  getHexCornerPoints,
  getHexPointsString,
  getFlatHexPointsString,
  getHexRangePerimeterPath,
  getHexRangeTopY,
  snapRotationToHexFace,
  facingToRotation,
  rotationToFacing,
  pixelToHex,
  getHexDistance,
  getGurpsRangePenalty,
  getTargetArcRelationship,
  HexCoord,
  Point,
} from '../../utils/tacticalMath';
import { getCombatManeuver, COMBAT_MANEUVERS } from '../../utils/gurps';
import { NpcAvatar, PRESET_AVATARS, PRESET_BG_COLORS, resolveNpcPreset } from '../NpcAvatar';
import {
  Shield,
  Eye,
  EyeOff,
  X,
  Swords,
  Users,
  Search,
  Check,
  CheckCheck,
  Plus,
  Minus,
  Trash2,
  Sparkles,
  Upload,
  CircleDot,
  Pencil,
} from 'lucide-react';

interface TacticalMapWorkspaceProps {
  tacticalState: TacticalState;
  onUpdateTacticalState: (updated: Partial<TacticalState>) => void;
  characters: NPC[];
  selectedNpcId: string;
  onSelectNpc: (npcId: string) => void;
  onUpdateNpc: (updated: NPC) => void;
  currentUserRole: string;
  currentUser?: UserAccount | null;
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

export const TacticalMapWorkspace: React.FC<TacticalMapWorkspaceProps> = React.memo(({
  tacticalState,
  onUpdateTacticalState,
  characters,
  selectedNpcId,
  onSelectNpc,
  onUpdateNpc,
  currentUserRole,
  currentUser,
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

  // Fog of War / Ocultação do Mapa state (Estilo Roll20: Retângulo, Círculo e Polígono)
  const [fogBrushMode, setFogBrushMode] = useState<'reveal' | 'hide'>('reveal');
  const [fogShape, setFogShape] = useState<'rect' | 'circle' | 'polygon'>('rect');
  const [fogCircleRadius, setFogCircleRadius] = useState<number>(5);
  const [fogPolyPoints, setFogPolyPoints] = useState<Point[]>([]);
  const [fogBoxStart, setFogBoxStart] = useState<Point | null>(null);
  const [fogBoxCurrent, setFogBoxCurrent] = useState<Point | null>(null);

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
  const [tokensModalFilter, setTokensModalFilter] = useState<'all' | 'players' | 'npcs' | 'instant'>('all');
  const [tokensModalSearch, setTokensModalSearch] = useState('');

  // Modal de criação de Token Instantâneo (Mestre)
  const [isInstantTokenModalOpen, setIsInstantTokenModalOpen] = useState(false);
  const [instantName, setInstantName] = useState('');
  const [instantColor, setInstantColor] = useState('#f59e0b');
  const [instantPreset, setInstantPreset] = useState('knight');
  const [instantAvatarUrl, setInstantAvatarUrl] = useState('');
  const [instantAuraRadius, setInstantAuraRadius] = useState<number>(0);
  const [instantAuraColor, setInstantAuraColor] = useState('#38bdf8');
  const [instantAuraVisibleToPlayers, setInstantAuraVisibleToPlayers] = useState(true);
  const instantFileInputRef = useRef<HTMLInputElement>(null);

  const isMaster = currentUserRole === 'mestre';
  const activeLayer = tacticalState?.activeLayer || 'tokens';
  // Visão controlada diretamente pela camada ativa:
  // - Jogadores comuns sempre têm visão de jogador
  // - Na aba "2. Jogadores" ('tokens'), o Mestre tem a visão dos jogadores
  // - Na aba "3. Mestre" ('gm') ou "1. Mapa" ('map'), o Mestre tem a visão do mestre
  const isPlayerView = !isMaster || activeLayer === 'tokens';

  // Sempre que o mestre entrar ou alternar entre as abas do Tabuleiro (1. Mapa, 2. Jogadores, 3. Mestre),
  // inicia automaticamente na opção "Mover" ('select') e limpa pré-visualizações temporárias.
  useEffect(() => {
    if (!isMaster) return;
    setActiveTool('select');
    setRulerStart(null);
    setRulerCurrent(null);
    setAreaCenter(null);
    setFogBoxStart(null);
    setFogBoxCurrent(null);
    setFogPolyPoints([]);
  }, [activeLayer, isMaster]);

  // Elementos do Cenário / Mobília (Props - Estilo Roll20)
  const [isPropsModalOpen, setIsPropsModalOpen] = useState(false);
  const [selectedPropId, setSelectedPropId] = useState<string | null>(null);
  const [draggedPropId, setDraggedPropId] = useState<string | null>(null);
  const [dragPropOffset, setDragPropOffset] = useState<Point>({ x: 0, y: 0 });
  const [dragPropPos, setDragPropPos] = useState<{ id: string; x: number; y: number } | null>(null);
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

  // Usuário autenticado efetivo (com fallbacks para hubUser / parent / localStorage)
  const effectiveUser = useMemo(() => {
    if (currentUser && (currentUser.name || currentUser.id)) {
      return currentUser;
    }
    try {
      if (typeof window !== 'undefined') {
        const w = window as any;
        if (w.hubUser && (w.hubUser.name || w.hubUser.id)) return w.hubUser;
        if (w.parent && w.parent.hubUser && (w.parent.hubUser.name || w.parent.hubUser.id)) {
          return w.parent.hubUser;
        }
      }
      const saved = localStorage.getItem('hounds_active_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.name || parsed.id)) return parsed;
      }
    } catch {}
    return currentUser || null;
  }, [currentUser]);

  // Helper para resolver o NPC associado a um token
  const resolveTokenNpc = useCallback(
    (token?: TacticalToken | null): NPC | null => {
      if (!token) return null;
      if (token.npcId) {
        const byId = characterMap.get(token.npcId);
        if (byId) return byId;
        const byDirect = characters.find(
          (c) =>
            c.id === token.npcId ||
            (c.name && token.npcId && c.name.trim().toLowerCase() === token.npcId.trim().toLowerCase())
        );
        if (byDirect) return byDirect;
      }
      if (token.id) {
        const cleanTokenId = token.id.replace(/^token-/, '');
        const byTokenId = characterMap.get(cleanTokenId) || characters.find((c) => c.id === cleanTokenId);
        if (byTokenId) return byTokenId;
      }
      return null;
    },
    [characterMap, characters]
  );

  // Helper para verificar se um personagem/NPC pertence ou está vinculado ao usuário logado
  const isCharOwnedByCurrentUser = useCallback(
    (npc?: NPC | null): boolean => {
      if (!npc) return false;
      const u = effectiveUser;
      if (!u) return false;

      const norm = (s?: string) => String(s || '').trim().toLowerCase();
      const normCleanId = (s?: string) => norm(s).replace(/^user-/, '');

      const uId = norm(u.id);
      const uCleanId = normCleanId(u.id);
      const uName = norm(u.name);

      const charUserId = norm(npc.userId);
      const charCleanUserId = normCleanId(npc.userId);
      const charOwnerId = norm(npc.ownerId);
      const charCleanOwnerId = normCleanId(npc.ownerId);
      const charPlayerName = norm(npc.playerName);
      const charName = norm(npc.name);

      // 1. Vínculo por ID do usuário
      if (uId && (charUserId === uId || charOwnerId === uId)) return true;
      if (uCleanId && (charCleanUserId === uCleanId || charCleanOwnerId === uCleanId)) return true;

      // 2. Vínculo por nome do jogador (playerName configurado na aba Personagens & Vínculo)
      if (uName && charPlayerName && (charPlayerName === uName || charPlayerName === uCleanId)) return true;

      // 3. Vínculo se o ID de usuário foi gravado no campo playerName ou vice-versa
      if (uId && charPlayerName && (charPlayerName === uId || charPlayerName === uCleanId)) return true;

      // 4. Fallback se o nome do personagem coincide com o usuário
      if (uName && charName && charName === uName) return true;

      return false;
    },
    [effectiveUser]
  );

  // Helper que determina se o usuário atual tem permissão para mover/mexer neste token no tabuleiro
  const canControlToken = useCallback(
    (token?: TacticalToken | null): boolean => {
      if (!token) return false;
      // 1. O Mestre tem controle total sobre qualquer token no tabuleiro
      if (isMaster || effectiveUser?.role === 'mestre' || currentUserRole === 'mestre') return true;

      // 2. Token travado não pode ser movido
      if (token.isPinned) return false;

      // 3. Usuários sem login ou não identificados não podem mexer em tokens
      if (!effectiveUser) return false;

      // 4. Jogador só pode mexer no personagem que estiver vinculado a ele
      const npc = resolveTokenNpc(token);
      return isCharOwnedByCurrentUser(npc);
    },
    [isMaster, effectiveUser, currentUserRole, resolveTokenNpc, isCharOwnedByCurrentUser]
  );

  // Helper para verificar se o usuário pode alterar a manobra de combate do combatente
  const canChangeManeuver = useCallback(
    (npc?: NPC | null): boolean => {
      if (!npc) return false;
      // 1. Mestre tem controle total
      if (isMaster || effectiveUser?.role === 'mestre' || currentUserRole === 'mestre') return true;
      // 2. Jogadores editores podem mexer na manobra de qualquer outro jogador, e de NPCs visíveis
      if (hasEditPermission) {
        if (npc.characterType === 'player') return true;
        return Boolean(npc.isVisibleToPlayer);
      }
      // 3. Jogador comum (sem ser editor) só pode mexer na manobra do seu próprio personagem
      return isCharOwnedByCurrentUser(npc);
    },
    [isMaster, effectiveUser, currentUserRole, hasEditPermission, isCharOwnedByCurrentUser]
  );

  // Alternar visibilidade de um token entre Mestre e Jogadores (unificado com a ficha do NPC)
  const handleToggleTokenVisibility = useCallback((tokenId: string) => {
    const token = tokens.find((t) => t.id === tokenId);
    if (!token) return;
    const targetNpc = token.isInstant ? undefined : characterMap.get(token.npcId);
    const isPlayer = targetNpc?.characterType === 'player';

    // Determina se o token está atualmente oculto para os jogadores
    const currentlyHidden = token.isInstant
      ? (!!token.hiddenFromPlayers || token.layer === 'gm')
      : isPlayer
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

    // 2. Unifica diretamente com a ficha do NPC (isVisibleToPlayer) quando houver vínculo
    if (targetNpc) {
      onUpdateNpc({
        ...targetNpc,
        isVisibleToPlayer: willBeVisible,
      });
    }
  }, [tokens, characterMap, onUpdateTacticalState, onUpdateNpc]);

  // Atualizar propriedades de um token específico (ex: aura, nome/cor de token instantâneo)
  const handleUpdateToken = useCallback((tokenId: string, updated: Partial<TacticalToken>) => {
    const updatedTokens = tokens.map((t) => (t.id === tokenId ? { ...t, ...updated } : t));
    onUpdateTacticalState({ tokens: updatedTokens });
  }, [tokens, onUpdateTacticalState]);

  // Remover um token específico do tabuleiro (usado para tokens instantâneos e remoção rápida)
  const handleRemoveToken = useCallback((tokenId: string) => {
    const nextTokens = tokens.filter((t) => t.id !== tokenId);
    onUpdateTacticalState({ tokens: nextTokens });
    if (selectedTokenId === tokenId) {
      setSelectedTokenId(null);
    }
    if (contextMenu?.tokenId === tokenId) {
      setContextMenu(null);
    }
  }, [tokens, selectedTokenId, contextMenu, onUpdateTacticalState]);

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

  // Máscara única de névoa de guerra (padrão: todo revelado)
  const fogMask: TacticalFogMask = useMemo(() => {
    const raw = tacticalState.fogMask;
    if (raw && (raw.base === 'revealed' || raw.base === 'hidden') && Array.isArray(raw.ops)) {
      return raw;
    }
    return { base: 'revealed', ops: [] };
  }, [tacticalState.fogMask]);

  const hasFog = fogMask.base === 'hidden' || fogMask.ops.length > 0;

  const handleRevealAllFog = useCallback(() => {
    setFogPolyPoints([]);
    setFogBoxStart(null);
    setFogBoxCurrent(null);
    onUpdateTacticalState({
      fogMask: { base: 'revealed', ops: [] },
    });
  }, [onUpdateTacticalState]);

  const handleHideAllFog = useCallback(() => {
    setFogPolyPoints([]);
    setFogBoxStart(null);
    setFogBoxCurrent(null);
    onUpdateTacticalState({
      fogMask: { base: 'hidden', ops: [] },
    });
  }, [onUpdateTacticalState]);

  // Funções para controle do Polígono de Névoa de Guerra
  const handleFinishFogPolygon = useCallback((pointsToFinish?: Point[]) => {
    const pts = pointsToFinish || fogPolyPoints;
    if (pts.length < 3) return;
    const newPolyOp: TacticalFogOp = {
      op: fogBrushMode,
      shape: 'polygon',
      points: pts,
    };
    onUpdateTacticalState({
      fogMask: {
        base: fogMask.base,
        ops: [...fogMask.ops, newPolyOp],
      },
    });
    setFogPolyPoints([]);
  }, [fogPolyPoints, fogBrushMode, fogMask, onUpdateTacticalState]);

  const handleCancelFogPolygon = useCallback(() => {
    setFogPolyPoints([]);
  }, []);

  const handleUndoFogPolyPoint = useCallback(() => {
    setFogPolyPoints((prev) => prev.slice(0, -1));
  }, []);

  // Efeito de atalhos de teclado para Polígono de Névoa
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) {
        return;
      }

      if (e.key === 'Enter') {
        if (fogPolyPoints.length >= 3) {
          e.preventDefault();
          handleFinishFogPolygon();
        }
      } else if (e.key === 'Escape') {
        if (fogPolyPoints.length > 0) {
          e.preventDefault();
          handleCancelFogPolygon();
        }
      } else if (e.key === 'Backspace') {
        if (fogPolyPoints.length > 0) {
          e.preventDefault();
          handleUndoFogPolyPoint();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    fogPolyPoints,
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

    if (selectedPropId && !target?.closest('#tactical-props-layer')) {
      setSelectedPropId(null);
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
        const newCircleOp: TacticalFogOp = {
          op: fogBrushMode,
          shape: 'circle',
          x: clickX,
          y: clickY,
          radius: radiusPixels,
        };
        onUpdateTacticalState({
          fogMask: {
            base: fogMask.base,
            ops: [...fogMask.ops, newCircleOp],
          },
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
          layer: isMaster && activeLayer === 'gm' ? 'gm' : 'tokens',
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
            layer: isMaster && activeLayer === 'gm' ? 'gm' : 'tokens',
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
    if (draggedPropId) {
      const p = clientToMapCoords(e.clientX, e.clientY);
      const nextX = Math.round(p.x - dragPropOffset.x);
      const nextY = Math.round(p.y - dragPropOffset.y);
      setDragPropPos((prev) => (prev && prev.id === draggedPropId && prev.x === nextX && prev.y === nextY ? prev : { id: draggedPropId, x: nextX, y: nextY }));
      return;
    }

    const target = e.target as HTMLElement | SVGElement | null;
    const isOverOverlay = !!(
      target &&
      target.closest('#tactical-top-toolbar-container, [role="dialog"], #tactical-token-sidebar')
    );

    if (isOverOverlay) {
      setHoveredHex((prev) => (prev ? null : prev));
      if (!fogBoxStart && !isPanning && !draggedTokenId && !draggedPropId && !rotatingTokenId) {
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

    if (activeTool === 'fog') {
      const mx = Math.round(p.x - mapX);
      const my = Math.round(p.y - mapY);
      setMouseMapPos((prev) => (prev && prev.x === mx && prev.y === my ? prev : { x: mx, y: my }));
    }

    if (!isOverOverlay) {
      setHoveredHex((prev) => {
        if (prev && prev.col === hex.col && prev.row === hex.row) return prev;
        return hex;
      });
    }

    if (activeTool === 'fog' && isMaster && fogBoxStart) {
      const fx = Math.round(p.x - mapX);
      const fy = Math.round(p.y - mapY);
      setFogBoxCurrent((prev) => (prev && prev.x === fx && prev.y === fy ? prev : { x: fx, y: fy }));
    }

    if (activeTool === 'ruler' && rulerStart) {
      setRulerCurrent((prev) => (prev && prev.col === hex.col && prev.row === hex.row ? prev : hex));
    }

    if (activeTool === 'area' || (activeTool === 'ruler' && rulerType === 'blast')) {
      setAreaCenter((prev) => (prev && prev.col === hex.col && prev.row === hex.row ? prev : hex));
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
        // Encaixa estritamente em uma das 6 faces voltadas para o centro do hexágono adjacente (sem parar entre hexágonos)
        const snappedRot = snapRotationToHexFace(rot);
        const facingIndex = rotationToFacing(snappedRot);

        setPreviewRotation((prev) => {
          if (prev && prev.id === rotatingTokenId && prev.rotation === snappedRot && prev.facing === facingIndex) return prev;
          return { id: rotatingTokenId, rotation: snappedRot, facing: facingIndex };
        });
      }
      return;
    }

    // Live dragging of a token - apenas atualiza preview local de hover sem disparar sync a cada pixel
    if (draggedTokenId) {
      setDragHoverHex((prev) => (prev && prev.col === hex.col && prev.row === hex.row ? prev : hex));
    }
  };

  const handleMouseUp = () => {
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
        const newRectOp: TacticalFogOp = {
          op: fogBrushMode,
          shape: 'rect',
          x: Math.round(minX),
          y: Math.round(minY),
          width: Math.round(width),
          height: Math.round(height),
        };
        onUpdateTacticalState({
          fogMask: {
            base: fogMask.base,
            ops: [...fogMask.ops, newRectOp],
          },
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

        const initialFacing = (isPlayer ? 1 : 4) as FacingDirection;
        newTokens.push({
          id: `token-${char.id}`,
          npcId: char.id,
          gridX: col,
          gridY: row,
          facing: initialFacing,
          rotation: facingToRotation(initialFacing),
          elevation: 0,
          reach: 1,
          size: 1,
          // Tokens sempre entram ocultos no mapa ao serem carregados para evitar exposição acidental pelo mestre
          hiddenFromPlayers: true,
          layer: 'gm',
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
    if (!isMaster && !isCharOwnedByCurrentUser(targetNpc)) return;
    const isPlayer = targetNpc?.characterType === 'player';
    const initialFacing = (isPlayer ? 1 : 4) as FacingDirection;

    const newToken: TacticalToken = {
      id: `token-${npcId}`,
      npcId,
      gridX: isPlayer ? 4 : 12,
      gridY: 6 + (tokens.length % 6) * 2,
      facing: initialFacing,
      rotation: facingToRotation(initialFacing),
      elevation: 0,
      reach: 1,
      size: 1,
      hiddenFromPlayers: true,
      layer: 'gm',
    };

    onUpdateTacticalState({ tokens: [...tokens, newToken] });
    setSelectedTokenId(newToken.id);
  };

  // Alternar presença do token de um combatente no tabuleiro
  const handleToggleTokenPlacement = (npcId: string) => {
    const targetNpc = characterMap.get(npcId);
    if (!isMaster && !isCharOwnedByCurrentUser(targetNpc)) return;
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
      const initialFacing = (isPlayer ? 1 : 4) as FacingDirection;
      const newToken: TacticalToken = {
        id: `token-${npcId}`,
        npcId,
        gridX: isPlayer ? 4 : 14,
        gridY: 4 + (tokens.length % 7) * 2,
        facing: initialFacing,
        rotation: facingToRotation(initialFacing),
        elevation: 0,
        reach: 1,
        size: 1,
        hiddenFromPlayers: true,
        layer: 'gm',
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
      const initialFacing = (isPlayer ? 1 : 4) as FacingDirection;
      newTokens.push({
        id: `token-${char.id}`,
        npcId: char.id,
        gridX: isPlayer ? playerCol : npcCol,
        gridY: isPlayer ? playerRow : npcRow,
        facing: initialFacing,
        rotation: facingToRotation(initialFacing),
        elevation: 0,
        reach: 1,
        size: 1,
        hiddenFromPlayers: true,
        layer: 'gm',
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

  // Criar Token Instantâneo (sem vínculo obrigatório com personagem/NPC)
  const handleCreateInstantToken = () => {
    if (!isMaster) return;
    const viewCenterX = (containerSize.width / 2 - panX) / zoom;
    const viewCenterY = (containerSize.height / 2 - panY) / zoom;
    const clampedX = Math.max(hexSize, Math.min(mapW - hexSize, viewCenterX - mapX));
    const clampedY = Math.max(hexSize, Math.min(mapH - hexSize, viewCenterY - mapY));
    let targetHex = pixelToHex(clampedX, clampedY, hexSize);

    // Evita empilhar exatamente sobre outro token se a célula já estiver ocupada
    const occupied = new Set(tokens.map((t) => `${t.gridX},${t.gridY}`));
    if (occupied.has(`${targetHex.col},${targetHex.row}`)) {
      for (let offset = 1; offset <= 10; offset++) {
        const candidate = { col: targetHex.col + offset, row: targetHex.row };
        if (!occupied.has(`${candidate.col},${candidate.row}`)) {
          targetHex = candidate;
          break;
        }
      }
    }

    const instantCount = tokens.filter((t) => t.isInstant).length;
    const initialFacing: FacingDirection = 1;
    const newToken: TacticalToken = {
      id: `instant-token-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      npcId: '',
      isInstant: true,
      customName: instantName.trim() || `Token ${instantCount + 1}`,
      customAvatar: instantAvatarUrl.trim() || undefined,
      customPreset: instantPreset || 'knight',
      color: instantColor || '#f59e0b',
      gridX: targetHex.col,
      gridY: targetHex.row,
      facing: initialFacing,
      rotation: facingToRotation(initialFacing),
      elevation: 0,
      reach: 1,
      size: 1,
      // Sempre entra oculto para evitar exposição acidental pelo mestre
      hiddenFromPlayers: true,
      layer: 'gm',
      ...(instantAuraRadius > 0
        ? {
            auraRadius: instantAuraRadius,
            auraColor: instantAuraColor || '#38bdf8',
            auraVisibleToPlayers: instantAuraVisibleToPlayers,
          }
        : {}),
    };

    onUpdateTacticalState({ tokens: [...tokens, newToken] });
    setSelectedTokenId(newToken.id);
    setInstantName('');
    setInstantAvatarUrl('');
    setInstantAuraRadius(0);
    setIsInstantTokenModalOpen(false);
  };

  // Handle token click: apenas seleciona o token e seu NPC (sem abrir popover intrusivo)
  const handleTokenClick = (e: React.MouseEvent, token: TacticalToken) => {
    if (activeTool !== 'select') return;
    e.stopPropagation();
    setSelectedTokenId(token.id);
    if (!token.isInstant && token.npcId) {
      onSelectNpc(token.npcId);
    }
    setPopoverToken(null);
    if (contextMenu) setContextMenu(null);
  };

  // Handle token drag start
  const handleTokenMouseDown = (e: React.MouseEvent, token: TacticalToken) => {
    if (activeTool !== 'select') return;
    if (e.button !== 0 || token.isPinned || rotatingTokenId) return;
    if (!canControlToken(token)) return;
    e.stopPropagation();
    if (contextMenu) setContextMenu(null);
    setDraggedTokenId(token.id);
    setDragTokenOrigin({ col: token.gridX, row: token.gridY });
    setDragHoverHex({ col: token.gridX, row: token.gridY });
    setSelectedTokenId(token.id);
    if (!token.isInstant && token.npcId) {
      onSelectNpc(token.npcId);
    }
    setPopoverToken(null);
  };

  // Handle token rotation start via pauzinho (Roll20 rotation handle)
  const handleRotationMouseDown = (e: React.MouseEvent, token: TacticalToken) => {
    if (e.button !== 0 || token.isPinned) return;
    if (!canControlToken(token)) return;
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
      layer: isMaster && activeLayer === 'gm' ? 'gm' : 'tokens',
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
      onMouseLeave={() => {
        if (isPanning) setIsPanning(false);
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
          fogBrushMode={fogBrushMode}
          onSetFogBrushMode={setFogBrushMode}
          fogShape={fogShape}
          onSetFogShape={setFogShape}
          fogCircleRadius={fogCircleRadius}
          onSetFogCircleRadius={setFogCircleRadius}
          fogPolyPointsCount={fogPolyPoints.length}
          onCloseFogPolygon={() => handleFinishFogPolygon()}
          onUndoFogPolyPoint={handleUndoFogPolyPoint}
          onCancelFogPolygon={handleCancelFogPolygon}
          onRevealAllFog={handleRevealAllFog}
          onHideAllFog={handleHideAllFog}
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
              <div className="flex items-center gap-2">
                {isMaster && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsTokensModalOpen(false);
                      setIsInstantTokenModalOpen(true);
                    }}
                    className="px-2.5 py-1.5 bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                    title="Criar um token instantâneo no mapa (sem precisar de personagem ou NPC)"
                  >
                    <Plus size={14} className="text-sky-400" />
                    <span>Token Instantâneo</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsTokensModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
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

                  <button
                    type="button"
                    onClick={() => setTokensModalFilter('instant')}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                      tokensModalFilter === 'instant'
                        ? 'bg-sky-500 text-slate-950 font-bold shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>Instantâneos</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      tokensModalFilter === 'instant' ? 'bg-slate-950/20 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {tokens.filter((t) => t.isInstant).length}
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
                  {tokensModalFilter === 'instant'
                    ? 'Tokens instantâneos criados direto no mapa:'
                    : tokensModalFilter === 'all'
                    ? 'Ações para todos os combatentes:'
                    : tokensModalFilter === 'players'
                    ? 'Ações para os personagens dos jogadores:'
                    : 'Ações para os NPCs / Criaturas:'}
                </span>
                <div className="flex items-center gap-2">
                  {tokensModalFilter === 'instant' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsTokensModalOpen(false);
                        setIsInstantTokenModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-lg transition-all active:scale-95 shadow-xs cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Novo Token Instantâneo</span>
                    </button>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Lista com Rolagem */}
            <div className="flex-1 overflow-y-auto p-3.5 sm:px-5 space-y-2 max-h-[50vh]">
              {tokensModalFilter === 'instant' ? (() => {
                const instantTokensList = tokens
                  .filter((t) => t.isInstant)
                  .filter((t) =>
                    !tokensModalSearch.trim() ||
                    (t.customName || 'Token').toLowerCase().includes(tokensModalSearch.toLowerCase().trim())
                  );

                if (instantTokensList.length === 0) {
                  return (
                    <div className="py-12 text-center text-slate-400 text-xs bg-slate-950/40 rounded-xl border border-dashed border-slate-800 p-6 space-y-2">
                      <Sparkles size={24} className="mx-auto text-sky-500/70 mb-1" />
                      <p className="font-semibold text-slate-300">Nenhum token instantâneo no mapa</p>
                      <p className="text-[11px] text-slate-500">Crie tokens rápidos para objetos, marcadores, criaturas avulsas ou efeitos.</p>
                    </div>
                  );
                }

                return instantTokensList.map((t) => {
                  const isHidden = !!t.hiddenFromPlayers || t.layer === 'gm';
                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        handleFocusToken(t);
                        setIsTokensModalOpen(false);
                      }}
                      className="p-2.5 sm:p-3 rounded-xl border border-sky-500/30 bg-sky-950/15 hover:bg-sky-950/30 transition-all cursor-pointer flex items-center justify-between gap-3 select-none"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-slate-700 bg-slate-900 flex items-center justify-center">
                          <NpcAvatar
                            avatar={t.customAvatar}
                            preset={t.customPreset || 'knight'}
                            name={t.customName || 'Token'}
                            size="sm"
                            className="!w-9 !h-9 !rounded-lg"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs truncate">{t.customName || 'Token'}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                              Instantâneo
                            </span>
                            {t.auraRadius && t.auraRadius > 0 && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                Aura {t.auraRadius}yd
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            Hex [{t.gridX}, {t.gridY}] • {isHidden ? 'Oculto (Mestre)' : 'Visível p/ Jogadores'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleRemoveToken(t.id)}
                          className="p-1.5 rounded-lg border border-rose-800/60 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 transition-colors cursor-pointer"
                          title="Excluir token instantâneo"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                });
              })() : filteredModalCharacters.length === 0 ? (
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

      {/* 2.5 MODAL DE CRIAÇÃO DE TOKEN INSTANTÂNEO (MESTRE) */}
      {isMaster && isInstantTokenModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setIsInstantTokenModalOpen(false)}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div
            className="bg-slate-900 border border-sky-500/40 rounded-2xl shadow-2xl max-w-lg w-full max-h-[88vh] flex flex-col overflow-hidden text-slate-100 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Novo Token Instantâneo</h3>
                  <p className="text-[11px] text-slate-400">
                    Entra oculto na visão do mestre, sem precisar criar ficha de personagem ou NPC
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsInstantTokenModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Corpo */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
              {/* Nome & Cor da Borda */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300 block">
                    Nome / Rótulo
                  </label>
                  <input
                    type="text"
                    value={instantName}
                    onChange={(e) => setInstantName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateInstantToken();
                    }}
                    placeholder={`Token ${tokens.filter((t) => t.isInstant).length + 1}`}
                    autoFocus
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300 block">
                    Cor da Borda
                  </label>
                  <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                    {['#64748b', '#ef4444', '#f59e0b', '#10b981', '#38bdf8', '#a855f7', '#ec4899', '#e2e8f0'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setInstantColor(c)}
                        className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                          instantColor === c ? 'border-white scale-110 ring-2 ring-sky-400/60' : 'border-slate-700 hover:scale-105'
                        }`}
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Ícone Rápido (Presets) */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-300 block">
                  Ícone do Token
                </span>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-slate-950/60 rounded-xl border border-slate-800">
                  {PRESET_AVATARS.map((p) => {
                    const PIcon = p.icon;
                    const colors = PRESET_BG_COLORS[p.id] || PRESET_BG_COLORS['knight'];
                    const selected = !instantAvatarUrl && instantPreset === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setInstantPreset(p.id);
                          setInstantAvatarUrl('');
                        }}
                        className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border transition-all cursor-pointer ${
                          selected
                            ? 'border-sky-400 bg-sky-500/15 ring-1 ring-sky-400'
                            : 'border-slate-800 bg-slate-900/70 hover:border-slate-600'
                        }`}
                        title={p.label}
                      >
                        <div
                          className="w-7 h-7 rounded-md flex items-center justify-center"
                          style={{ background: `linear-gradient(135deg, ${colors.bg1}, ${colors.bg2})` }}
                        >
                          <PIcon size={15} color="#ffffff" />
                        </div>
                        <span className="text-[9px] text-slate-300 truncate w-full text-center">
                          {p.label.split('/')[0].trim().split(' ')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Imagem Personalizada (Upload ou URL) */}
              <div className="space-y-1.5 p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                  <Upload size={12} className="text-sky-400" />
                  Imagem Personalizada (opcional)
                </span>
                <input
                  ref={instantFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const dataUrl = ev.target?.result as string;
                      if (dataUrl) setInstantAvatarUrl(dataUrl);
                    };
                    reader.readAsDataURL(file);
                    if (instantFileInputRef.current) instantFileInputRef.current.value = '';
                  }}
                />
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => instantFileInputRef.current?.click()}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 rounded-lg font-semibold text-[11px] shrink-0 cursor-pointer"
                  >
                    Upload
                  </button>
                  <input
                    type="text"
                    value={instantAvatarUrl.startsWith('data:') ? '(Imagem carregada do computador)' : instantAvatarUrl}
                    onChange={(e) => setInstantAvatarUrl(e.target.value)}
                    placeholder="Ou cole a URL da imagem..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                  {instantAvatarUrl && (
                    <button
                      type="button"
                      onClick={() => setInstantAvatarUrl('')}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 cursor-pointer"
                      title="Remover imagem"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Aura inicial (opcional) */}
              <div className="space-y-2 p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                    <CircleDot size={12} className="text-amber-400" />
                    Aura Inicial em Jardas (opcional)
                  </span>
                  <span className="font-mono text-[11px] font-bold text-amber-300">
                    {instantAuraRadius > 0 ? `${instantAuraRadius} yd` : 'Desligada'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {[0, 1, 2, 3, 5, 10].map((yd) => (
                    <button
                      key={yd}
                      type="button"
                      onClick={() => setInstantAuraRadius(yd)}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                        instantAuraRadius === yd
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      {yd === 0 ? 'Off' : `${yd} yd`}
                    </button>
                  ))}
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={instantAuraRadius}
                    onChange={(e) => setInstantAuraRadius(Math.max(0, Number(e.target.value) || 0))}
                    className="w-16 bg-slate-900 border border-slate-800 rounded-md px-2 py-1 text-[11px] font-mono text-white focus:outline-none focus:border-amber-500"
                    title="Raio personalizado em jardas"
                  />
                </div>

                {instantAuraRadius > 0 && (
                  <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-800/70">
                    <div className="flex items-center gap-1.5">
                      {['#38bdf8', '#f59e0b', '#ef4444', '#10b981', '#a855f7', '#e2e8f0'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setInstantAuraColor(c)}
                          className={`w-5 h-5 rounded-full border-2 cursor-pointer ${
                            instantAuraColor === c ? 'border-white scale-110' : 'border-slate-700'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setInstantAuraVisibleToPlayers((v) => !v)}
                      className={`px-2 py-1 rounded-md text-[10px] font-semibold border cursor-pointer ${
                        instantAuraVisibleToPlayers
                          ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60'
                          : 'bg-purple-950/60 text-purple-300 border-purple-700/60'
                      }`}
                    >
                      {instantAuraVisibleToPlayers ? 'Visível p/ Jogadores' : 'Só Mestre'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Rodapé */}
            <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/70 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsInstantTokenModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateInstantToken}
                className="px-4 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
              >
                <Plus size={14} />
                <span>Criar no Mapa</span>
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

          {/* MÁSCARA ÚNICA DA NÉVOA DE GUERRA (BASE + OPERAÇÕES SEQUENCIAIS) */}
          {hasFog && (
            <mask
              id="tactical-fog-mask"
              maskUnits="userSpaceOnUse"
              maskContentUnits="userSpaceOnUse"
              x={mapX}
              y={mapY}
              width={mapW}
              height={mapH}
            >
              {/* Base da máscara: preto (#000000) = revelado; branco (#ffffff) = oculto */}
              <rect
                x={mapX}
                y={mapY}
                width={mapW}
                height={mapH}
                fill={fogMask.base === 'hidden' ? '#ffffff' : '#000000'}
              />

              {/* Sequência cronológica sobre a máscara única: reveal = preto, hide = branco */}
              {fogMask.ops.map((item, idx) => {
                const fill = item.op === 'reveal' ? '#000000' : '#ffffff';
                if (item.shape === 'circle') {
                  return (
                    <circle
                      key={`fog-op-${idx}`}
                      cx={mapX + item.x}
                      cy={mapY + item.y}
                      r={item.radius}
                      fill={fill}
                    />
                  );
                }
                if (item.shape === 'polygon' && item.points.length >= 3) {
                  return (
                    <polygon
                      key={`fog-op-${idx}`}
                      points={item.points.map((pt) => `${mapX + pt.x},${mapY + pt.y}`).join(' ')}
                      fill={fill}
                    />
                  );
                }
                if (item.shape === 'rect') {
                  return (
                    <rect
                      key={`fog-op-${idx}`}
                      x={mapX + item.x}
                      y={mapY + item.y}
                      width={item.width}
                      height={item.height}
                      fill={fill}
                    />
                  );
                }
                return null;
              })}
            </mask>
          )}
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
            isPlayerView={isPlayerView}
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

          {/* CAMADA 5: MARCADORES E ÁREAS PERSISTENTES NO TABULEIRO */}
          <g id="tactical-persistent-markers">
            {(tacticalState.markers || []).map((marker) => {
              // Marcadores na camada tokens são públicos e visíveis para TODOS (jogadores e mestre).
              // Marcadores na camada GM só são visíveis na visão do mestre (aba 3. Mestre / 1. Mapa).
              const isVisible = !isPlayerView || marker.layer === 'tokens' || !marker.layer;
              if (!isVisible) return null;

              if (marker.type === 'blast') {
                const relCenter = getHexCenter(marker.startX, marker.startY, hexSize);
                const center = { x: mapX + relCenter.x, y: mapY + relCenter.y };
                const blastYards = Math.max(1, Math.round(marker.radius || 3));
                const blastPath = getHexRangePerimeterPath(
                  { col: marker.startX, row: marker.startY },
                  blastYards,
                  hexSize,
                  mapX,
                  mapY
                );
                const topY = getHexRangeTopY({ col: marker.startX, row: marker.startY }, blastYards, hexSize, mapY);

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
                    <path
                      d={blastPath}
                      fill={marker.color ? `${marker.color}33` : 'rgba(239, 68, 68, 0.2)'}
                      stroke={marker.color || '#ef4444'}
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                      strokeDasharray="6 4"
                    />
                    {/* Tag de Identificação com Botão de Excluir e Indicador de Camada M/J */}
                    <g transform={`translate(${center.x}, ${topY - 14})`} pointerEvents="auto">
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
                const areaPath = getHexRangePerimeterPath(targetCenter, areaRadius, hexSize, mapX, mapY);
                const topY = getHexRangeTopY(targetCenter, areaRadius, hexSize, mapY);
                return (
                  <g>
                    <path
                      d={areaPath}
                      fill={areaColor ? `${areaColor}33` : 'rgba(239, 68, 68, 0.2)'}
                      stroke={areaColor || '#ef4444'}
                      strokeWidth="2"
                      strokeLinejoin="round"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={center.x}
                      y={topY - 8}
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
                const fixedPath = getHexRangePerimeterPath(centerHex, rulerFixedYards, hexSize, mapX, mapY);
                const topY = getHexRangeTopY(centerHex, rulerFixedYards, hexSize, mapY);
                const rangePenalty = getGurpsRangePenalty(rulerFixedYards);
                return (
                  <g>
                    <path
                      d={fixedPath}
                      fill="rgba(245, 158, 11, 0.08)"
                      stroke="#f59e0b"
                      strokeWidth="2"
                      strokeLinejoin="round"
                      strokeDasharray="5 3"
                    />
                    <text
                      x={center.x}
                      y={topY - 8}
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

          {/* CAMADA 6.5: AURAS DOS TOKENS (MEDIDAS EM JARDAS - ANDAM JUNTO COM O TOKEN) */}
          <g id="tactical-token-auras" pointerEvents="none">
            {tokens.map((token) => {
              const auraYards = typeof token.auraRadius === 'number' ? token.auraRadius : 0;
              if (auraYards <= 0) return null;

              const npc = token.isInstant ? null : resolveTokenNpc(token);
              if (!token.isInstant && !npc) return null;

              const isPlayer = npc?.characterType === 'player';
              const isTokenHidden = token.isInstant
                ? (!!token.hiddenFromPlayers || token.layer === 'gm')
                : isPlayer
                  ? (!!token.hiddenFromPlayers || token.layer === 'gm')
                  : (!npc?.isVisibleToPlayer || !!token.hiddenFromPlayers || token.layer === 'gm');

              // Na visão de jogador, oculta a aura se o token estiver oculto ou se a aura for exclusiva do mestre
              if (isPlayerView && (isTokenHidden || token.auraVisibleToPlayers === false)) return null;

              const isDragging = token.id === draggedTokenId;
              const displayGridX = isDragging && dragHoverHex ? dragHoverHex.col : token.gridX;
              const displayGridY = isDragging && dragHoverHex ? dragHoverHex.row : token.gridY;
              const relCenter = getHexCenter(displayGridX, displayGridY, hexSize);
              const center = { x: mapX + relCenter.x, y: mapY + relCenter.y };
              const auraColor = token.auraColor || '#38bdf8';
              const auraYardsInt = Math.max(1, Math.round(auraYards));
              const auraPath = getHexRangePerimeterPath(
                { col: displayGridX, row: displayGridY },
                auraYardsInt,
                hexSize,
                mapX,
                mapY
              );
              const auraTopY = getHexRangeTopY({ col: displayGridX, row: displayGridY }, auraYardsInt, hexSize, mapY);
              const isMasterOnlyAura = token.auraVisibleToPlayers === false;

              return (
                <g key={`aura-${token.id}`} id={`token-aura-${token.id}`} opacity={isTokenHidden ? 0.65 : 1}>
                  <path
                    d={auraPath}
                    fill={auraColor}
                    fillOpacity={isMasterOnlyAura ? 0.1 : 0.14}
                    stroke={auraColor}
                    strokeWidth={2}
                    strokeOpacity={0.85}
                    strokeLinejoin="round"
                    strokeDasharray={isMasterOnlyAura ? '4 4' : '8 4'}
                  />
                  {/* Etiqueta discreta no topo da aura indicando o raio em jardas */}
                  <g transform={`translate(${center.x}, ${auraTopY - 12})`}>
                    <rect
                      x={isMasterOnlyAura ? -36 : -24}
                      y={-9}
                      width={isMasterOnlyAura ? 72 : 48}
                      height={16}
                      rx={5}
                      fill="#020617"
                      fillOpacity={0.85}
                      stroke={auraColor}
                      strokeWidth={1}
                    />
                    <text
                      x={0}
                      y={2}
                      fill={auraColor}
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {isMasterOnlyAura ? `👁 ${auraYardsInt} yd` : `${auraYardsInt} yd`}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>

          {/* CAMADA 7: TOKENS DE COMBATE (visíveis em todas as camadas; na Camada Jogadores mostra apenas visão pública) */}
          <g id="tactical-tokens">
              {tokens.map((token) => {
                const npc = token.isInstant ? null : resolveTokenNpc(token);
                if (!token.isInstant && !npc) return null;

                const isPlayer = npc?.characterType === 'player';
                const displayName = token.isInstant ? (token.customName || 'Token') : npc!.name;
                const displayAvatar = token.isInstant ? token.customAvatar : npc!.avatar;
                const displayPresetId = token.isInstant ? (token.customPreset || 'knight') : npc!.avatarPreset;

                // Visibilidade unificada: NPCs respeitam isVisibleToPlayer da ficha e a flag do tabuleiro
                const isTokenHidden = token.isInstant
                  ? (!!token.hiddenFromPlayers || token.layer === 'gm')
                  : isPlayer
                    ? (!!token.hiddenFromPlayers || token.layer === 'gm')
                    : (!npc?.isVisibleToPlayer || !!token.hiddenFromPlayers || token.layer === 'gm');
                // Na visão de jogador (jogadores reais ou Mestre na aba "2. Jogadores"), oculta tokens da camada do mestre ou ocultos
                if (isPlayerView && isTokenHidden) return null;
              const isSelected = token.id === selectedTokenId;
              const isDragging = token.id === draggedTokenId;
              const isRotating = token.id === rotatingTokenId;
              const displayGridX = isDragging && dragHoverHex ? dragHoverHex.col : token.gridX;
              const displayGridY = isDragging && dragHoverHex ? dragHoverHex.row : token.gridY;
              const relCenter = getHexCenter(displayGridX, displayGridY, hexSize);
              const center = { x: mapX + relCenter.x, y: mapY + relCenter.y };
              const rawTokenRotation = isRotating && previewRotation && previewRotation.id === token.id
                ? previewRotation.rotation
                : (typeof token.rotation === 'number'
                    ? token.rotation
                    : facingToRotation(token.facing));
              const tokenRotation = snapRotationToHexFace(rawTokenRotation);
              // Token hexagonal encaixado na grade: arestas alinhadas ao hexágono da grade
              const tokenHexRadius = hexSize * 0.72;
              const tokenApothem = tokenHexRadius * (Math.sqrt(3) / 2);
              const tokenBaseHexPoints = getFlatHexPointsString(tokenHexRadius + 2);
              const tokenInnerHexPoints = getFlatHexPointsString(tokenHexRadius);
              const tokenSelectionHexPoints = getFlatHexPointsString(tokenHexRadius + 5);

              const badgeWidth = Math.min(85, Math.max(34, displayName.length * 5.8));

              // Manobra ativa do personagem / NPC para colorir a borda do token (sem borda roxa quando oculto; mantém apenas glow roxo + olho)
              const maneuver = npc?.combatManeuver ? getCombatManeuver(npc.combatManeuver) : undefined;
              const hasManeuver = !!maneuver && maneuver.id !== 'none';
              const maneuverBorderColor = hasManeuver
                ? (maneuver.borderHex || maneuver.bgHex)
                : (token.color || '#64748b');

              const canControl = canControlToken(token);

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
                    if (!token.isInstant && token.npcId) {
                      onSelectNpc(token.npcId);
                    }
                    setContextMenu({
                      tokenId: token.id,
                      npcId: token.npcId || '',
                      x: e.clientX,
                      y: e.clientY,
                    });
                  }}
                  className={`${canControl ? (isSelected ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer') : 'cursor-pointer'} transition-transform`}
                  style={{
                    filter: isTokenHidden && isSelected
                      ? 'drop-shadow(0px 0px 8px rgba(168, 85, 247, 0.9)) drop-shadow(0px 0px 6px rgba(245, 158, 11, 0.75))'
                      : isTokenHidden
                        ? 'drop-shadow(0px 0px 8px rgba(168, 85, 247, 0.9))'
                        : isSelected
                          ? 'drop-shadow(0px 0px 8px rgba(245, 158, 11, 0.8))'
                          : 'drop-shadow(0px 3px 6px rgba(0, 0, 0, 0.6))',
                  }}
                >
                  {/* GRUPO ROTATIVO INTEGRAL: Token Hexagonal, Foto, Nome (atrás), Frente (na face frontal) e Pauzinho giram juntos */}
                  <g transform={`rotate(${tokenRotation})`}>
                    {/* 1. Hexágono de Base com Borda de Manobra ou Cor do Token (sem borda roxa quando oculto) */}
                    <polygon
                      points={tokenBaseHexPoints}
                      fill="#0f172a"
                      stroke={maneuverBorderColor}
                      strokeWidth={isSelected ? 2 : 1.5}
                      strokeLinejoin="round"
                    />

                    {/* Contorno Hexagonal Externo Dourado Indicador de Seleção */}
                    {isSelected && (
                      <polygon
                        points={tokenSelectionHexPoints}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                        strokeDasharray="4,3"
                      />
                    )}

                    {/* 2. Retrato / Avatar recortado em formato hexagonal */}
                    <clipPath id={`clip-${token.id}`}>
                      <polygon points={tokenInnerHexPoints} />
                    </clipPath>

                    {displayAvatar ? (
                      <image
                        href={displayAvatar}
                        x={-tokenHexRadius}
                        y={-tokenHexRadius}
                        width={tokenHexRadius * 2}
                        height={tokenHexRadius * 2}
                        clipPath={`url(#clip-${token.id})`}
                        preserveAspectRatio="xMidYMid slice"
                      />
                    ) : (
                      (() => {
                        const matchedPreset =
                          PRESET_AVATARS.find((p) => p.id === displayPresetId) ||
                          (npc ? resolveNpcPreset(npc) : PRESET_AVATARS[0]);
                        const colors =
                          PRESET_BG_COLORS[matchedPreset.id] || PRESET_BG_COLORS['knight'];
                        const PresetIcon = matchedPreset.icon || Shield;
                        const iconSize = tokenApothem * 1.2;

                        return (
                          <g clipPath={`url(#clip-${token.id})`}>
                            <polygon points={tokenInnerHexPoints} fill={colors.bg1} />
                            <polygon points={tokenInnerHexPoints} fill={colors.bg2} fillOpacity="0.5" />
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

                    {/* MARCAÇÃO VISUAL DE VISIBILIDADE APENAS PARA O MESTRE (QUANDO OCULTO DOS JOGADORES): OLHO ROXO (alteração apenas via botão direito) */}
                    {isMaster && isTokenHidden && (
                      <g
                        transform={`translate(${badgeWidth / 2 + 7}, ${-tokenApothem - 8.5})`}
                        pointerEvents="none"
                      >
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

                    {/* 3. NOME DO PERSONAGEM NA ARESTA TRASEIRA DO HEXÁGONO */}
                    <rect
                      x={-badgeWidth / 2}
                      y={-tokenApothem - 15}
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
                      y={-tokenApothem - 6}
                      fill="#f1f5f9"
                      fontSize="8"
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      {displayName}
                    </text>

                    {/* 4. MARCAÇÃO DE FRENTE NA ARESTA FRONTAL (APONTANDO EXATAMENTE PARA O MEIO DO HEXÁGONO À FRENTE) */}
                    <polygon
                      points={`0,${tokenApothem + 8.5} -5.5,${tokenApothem + 2} 5.5,${tokenApothem + 2}`}
                      fill="#f59e0b"
                      stroke="#020617"
                      strokeWidth="1"
                    />
                    <circle cx="0" cy={tokenApothem + 3.5} r="1.2" fill="#ffffff" />

                    {/* 5. "PAUZINHO" DE ROTAÇÃO (Roll20 Rotation Handle) QUANDO SELECIONADO */}
                    {isSelected && canControl && (
                      <g className="cursor-grab">
                        {/* Haste estendida conectando a marcação de frente até a alça */}
                        <line
                          x1="0"
                          y1={tokenApothem + 8.5}
                          x2="0"
                          y2={tokenApothem + 21}
                          stroke="#38bdf8"
                          strokeWidth="2"
                          strokeDasharray="3,2"
                        />
                        {/* Alça circular na ponta do pauzinho */}
                        <circle
                          cx="0"
                          cy={tokenApothem + 21}
                          r="5"
                          fill="#0284c7"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                          className="hover:scale-125 transition-transform"
                        />
                        <circle cx="0" cy={tokenApothem + 21} r="1.8" fill="#ffffff" />
                        {/* Hitbox invisível ampla para facilitar o clique e arrasto no mouse/touch */}
                        <circle
                          cx="0"
                          cy={tokenApothem + 21}
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

          {/* CAMADA 8: MÁSCARA ÚNICA DE NÉVOA DE GUERRA (ACIMA DOS TOKENS, POINTER-EVENTS NONE) */}
          {hasFog && (
            <g
              id="tactical-fog-layer"
              clipPath="url(#map-image-bounds)"
              pointerEvents="none"
              style={{ pointerEvents: 'none' }}
            >
              {/* 100% opaca para os Jogadores; semitransparente para o Mestre */}
              <rect
                x={mapX}
                y={mapY}
                width={mapW}
                height={mapH}
                fill={isPlayerView ? '#000000' : 'rgba(2, 6, 23, 0.55)'}
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

        </g>
      </svg>

      {/* MENU DE CONTEXTO DO TOKEN (BOTÃO DIREITO: DADOS, MANOBRA, AURA E LANÇAR DANO) */}
      {contextMenu && (() => {
        const token = tokens.find((t) => t.id === contextMenu.tokenId);
        if (!token) return null;
        const isInstantToken = !!token.isInstant;
        const npc = isInstantToken ? null : resolveTokenNpc(token);
        if (!isInstantToken && !npc) return null;

        const canEditManeuver = npc ? canChangeManeuver(npc) : false;
        const displayName = isInstantToken ? (token.customName || 'Token') : npc!.name;
        const displayAvatar = isInstantToken ? token.customAvatar : npc!.avatar;
        const displayPreset = isInstantToken ? (token.customPreset || 'knight') : npc!.avatarPreset;

        const hp = npc ? (typeof npc.hpCurrent === 'number' ? npc.hpCurrent : (npc.hpMax || 0)) : 0;
        const hpMax = npc ? (npc.hpMax || 0) : 0;
        const fp = npc ? (typeof npc.fpCurrent === 'number' ? npc.fpCurrent : (npc.fpMax || 0)) : 0;
        const fpMax = npc ? (npc.fpMax || 0) : 0;

        const currentAuraRadius = typeof token.auraRadius === 'number' ? token.auraRadius : 0;
        const currentAuraColor = token.auraColor || '#38bdf8';
        const isAuraVisibleToPlayers = token.auraVisibleToPlayers !== false;

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
        const menuWidth = 240;
        const menuHeight = isInstantToken ? 290 : 390;
        const posX = Math.min(Math.max(8, contextMenu.x), window.innerWidth - menuWidth - 8);
        const posY = Math.min(Math.max(8, contextMenu.y), Math.max(8, window.innerHeight - menuHeight - 8));

        const isContextTokenHidden = isInstantToken
          ? (!!token.hiddenFromPlayers || token.layer === 'gm')
          : npc!.characterType === 'player'
            ? (!!token.hiddenFromPlayers || token.layer === 'gm')
            : (!npc!.isVisibleToPlayer || !!token.hiddenFromPlayers || token.layer === 'gm');

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
              className="absolute bg-slate-950/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-2.5 shadow-2xl w-[240px] max-h-[85vh] overflow-y-auto space-y-2 text-slate-100 select-none animate-in fade-in zoom-in-95 duration-100"
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
              {/* Cabeçalho Compacto: Avatar, Nome e PV/FP (ou selo Instantâneo) */}
              <div className="flex items-center justify-between gap-1.5 border-b border-slate-800 pb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 border border-slate-700 bg-slate-900 flex items-center justify-center">
                    <NpcAvatar
                      avatar={displayAvatar}
                      preset={displayPreset}
                      name={displayName}
                      size="sm"
                      className="!w-7 !h-7 !rounded-lg"
                    />
                  </div>
                  <div className="min-w-0 flex flex-col">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="font-bold text-white text-xs truncate leading-tight">
                        {displayName}
                      </span>
                      {isMaster && isInstantToken && (
                        <button
                          type="button"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            const next = window.prompt('Novo nome do token instantâneo:', displayName);
                            if (next !== null && next.trim()) {
                              handleUpdateToken(token.id, { customName: next.trim() });
                            }
                          }}
                          className="p-0.5 text-slate-400 hover:text-sky-300 rounded cursor-pointer shrink-0"
                          title="Renomear token instantâneo"
                        >
                          <Pencil size={10} />
                        </button>
                      )}
                    </div>
                    {npc ? (
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
                    ) : (
                      <span className="text-[10px] text-sky-400 font-semibold leading-none pt-0.5">
                        Token Instantâneo
                      </span>
                    )}
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

              {/* Seletor com 8 Manobras de Combate (Grid 2x4) — apenas para Personagens e NPCs */}
              {npc && (
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
                          disabled={!canEditManeuver}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            if (!canEditManeuver) return;
                            e.stopPropagation();
                            const newManeuver =
                              m.id === 'none' || isSelected ? undefined : m.id;
                            onUpdateNpc({ ...npc, combatManeuver: newManeuver });
                          }}
                          className={`px-1.5 py-1 rounded-md text-[10px] font-semibold flex items-center justify-between transition-all border ${
                            isSelected
                              ? 'ring-2 ring-white/70 shadow-md font-bold'
                              : canEditManeuver
                              ? 'opacity-85 hover:opacity-100 hover:scale-[1.02]'
                              : 'opacity-40 cursor-not-allowed'
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
              )}

              {/* AURA EM VOLTA DO TOKEN (MEDIDA EM JARDAS — ACOMPANHA O TOKEN) — APENAS MESTRE */}
              {isMaster && (
                <div className="pt-1.5 border-t border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-semibold text-slate-300 flex items-center gap-1">
                      <CircleDot size={11} className="text-sky-400" />
                      <span>Aura (jardas):</span>
                    </span>
                    <span className="font-mono font-bold text-amber-300">
                      {currentAuraRadius > 0 ? `${currentAuraRadius} yd` : 'Off'}
                    </span>
                  </div>

                  {/* Presets rápidos + stepper */}
                  <div className="grid grid-cols-6 gap-1">
                    {[0, 1, 2, 3, 5, 10].map((yd) => (
                      <button
                        key={yd}
                        type="button"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateToken(token.id, {
                            auraRadius: yd,
                            ...(yd > 0 && !token.auraColor ? { auraColor: currentAuraColor } : {}),
                          });
                        }}
                        className={`py-1 rounded text-[9.5px] font-bold border text-center transition-all cursor-pointer ${
                          currentAuraRadius === yd
                            ? yd === 0
                              ? 'bg-slate-700 text-white border-slate-500'
                              : 'bg-sky-600 text-white border-sky-400'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {yd === 0 ? 'Off' : `${yd}y`}
                      </button>
                    ))}
                  </div>

                  {/* Ajuste fino +/- e valor personalizado em jardas */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateToken(token.id, {
                          auraRadius: Math.max(0, Number((currentAuraRadius - 1).toFixed(1))),
                        });
                      }}
                      className="p-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 hover:text-white cursor-pointer"
                      title="Diminuir 1 jarda"
                    >
                      <Minus size={11} />
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={currentAuraRadius}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value) || 0);
                        handleUpdateToken(token.id, {
                          auraRadius: val,
                          ...(val > 0 && !token.auraColor ? { auraColor: currentAuraColor } : {}),
                        });
                      }}
                      className="flex-1 min-w-0 bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-[11px] font-mono text-center text-white focus:outline-none focus:border-sky-500"
                      title="Raio da aura em jardas"
                    />
                    <button
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateToken(token.id, {
                          auraRadius: Number((currentAuraRadius + 1).toFixed(1)),
                          ...(!token.auraColor ? { auraColor: currentAuraColor } : {}),
                        });
                      }}
                      className="p-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 hover:text-white cursor-pointer"
                      title="Aumentar 1 jarda"
                    >
                      <Plus size={11} />
                    </button>
                  </div>

                  {/* Cor da aura e visibilidade para jogadores (quando ativa) */}
                  {currentAuraRadius > 0 && (
                    <div className="flex items-center justify-between gap-1.5 pt-0.5">
                      <div className="flex items-center gap-1">
                        {['#38bdf8', '#f59e0b', '#ef4444', '#10b981', '#a855f7', '#e2e8f0'].map((c) => (
                          <button
                            key={c}
                            type="button"
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateToken(token.id, { auraColor: c });
                            }}
                            className={`w-4 h-4 rounded-full border transition-transform cursor-pointer ${
                              currentAuraColor === c ? 'border-white scale-115 ring-1 ring-white/60' : 'border-slate-700'
                            }`}
                            style={{ backgroundColor: c }}
                            title={`Cor da aura: ${c}`}
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateToken(token.id, { auraVisibleToPlayers: !isAuraVisibleToPlayers });
                        }}
                        className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold border transition-all cursor-pointer ${
                          isAuraVisibleToPlayers
                            ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60'
                            : 'bg-purple-950/70 text-purple-300 border-purple-700/60'
                        }`}
                        title={
                          isAuraVisibleToPlayers
                            ? 'Aura visível para jogadores (clique para deixar só para o Mestre)'
                            : 'Aura visível apenas para o Mestre (clique para exibir aos jogadores)'
                        }
                      >
                        {isAuraVisibleToPlayers ? 'Jogadores' : 'Só Mestre'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* NÍVEL 3: MOVER ENTRE CAMADA DE TOKENS (JOGADORES) E GM (MESTRE) */}
              {isMaster && (
                <div className="pt-1 border-t border-slate-800">
                  <button
                    type="button"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleTokenVisibility(token.id);
                      setContextMenu(null);
                    }}
                    className={`w-full py-1.5 px-2 rounded-lg font-bold text-[10.5px] flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      isContextTokenHidden
                        ? 'bg-purple-950/70 hover:bg-purple-900 text-purple-200 border-purple-500/50 shadow-sm'
                        : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-750'
                    }`}
                    title={
                      isContextTokenHidden
                        ? 'Tornar este token visível para os jogadores conectados'
                        : 'Ocultar este token dos jogadores (Camada do Mestre)'
                    }
                  >
                    {isContextTokenHidden ? (
                      <>
                        <Eye size={12} className="text-emerald-400" />
                        <span>Mover para Camada de Tokens</span>
                      </>
                    ) : (
                      <>
                        <EyeOff size={12} className="text-purple-400" />
                        <span>Mover para Camada do Mestre</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Botão de Ação: Lançar Dano / Fadiga / Itens (apenas para Personagens e NPCs) */}
              {npc && (isMaster || hasEditPermission) && (
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
                    className="w-full py-1.5 px-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/10 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <Swords size={13} />
                    <span>Lançar Dano / Fadiga / Itens</span>
                  </button>
                </div>
              )}

              {/* Excluir Token Instantâneo (apenas Mestre) */}
              {isMaster && isInstantToken && (
                <div className="pt-1 border-t border-slate-800">
                  <button
                    type="button"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveToken(token.id);
                    }}
                    className="w-full py-1.5 px-2 rounded-lg bg-rose-950/60 hover:bg-rose-900/70 text-rose-300 border border-rose-800/60 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Trash2 size={12} />
                    <span>Excluir Token Instantâneo</span>
                  </button>
                </div>
              )}
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
});
