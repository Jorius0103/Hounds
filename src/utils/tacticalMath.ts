import { FacingDirection, TacticalWall, TacticalDoor, TacticalState, TacticalFogMask, TacticalFogOp, TacticalTokenSavedPosition } from '../types/tactical';

export const MIN_HEX_SIZE = 10;
export const MAX_HEX_SIZE = 140;
export const DEFAULT_HEX_SIZE = 38;
export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 4;
export const DEFAULT_ZOOM = 1;

/**
 * Normaliza e aplica clamping seguro em hexSize (evita <= 0, NaN ou loop massivo/OOM).
 */
export function clampHexSize(value: unknown, fallback = DEFAULT_HEX_SIZE): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return Math.min(MAX_HEX_SIZE, Math.max(MIN_HEX_SIZE, num));
}

/**
 * Normaliza e aplica clamping seguro em zoom (evita <= 0, NaN ou Infinity).
 */
export function clampZoom(value: unknown, fallback = DEFAULT_ZOOM): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, num));
}

function safeGridSize(size: number): number {
  return Number.isFinite(size) && size > 0 ? size : DEFAULT_HEX_SIZE;
}

export interface Point {
  x: number;
  y: number;
}

export interface HexCoord {
  col: number;
  row: number;
}

export interface CubeCoord {
  x: number;
  y: number;
  z: number;
}

/**
 * Retorna as coordenadas de pixel do centro de uma célula quadrada
 */
export function getCellCenter(col: number, row: number, cellSize: number): Point {
  const size = safeGridSize(cellSize);
  return {
    x: col * size + size / 2,
    y: row * size + size / 2,
  };
}

/**
 * Converte coordenada de pixel para a célula quadrada mais próxima
 */
export function pixelToCell(pixelX: number, pixelY: number, cellSize: number): HexCoord {
  const size = safeGridSize(cellSize);
  return {
    col: Math.floor(pixelX / size),
    row: Math.floor(pixelY / size),
  };
}

/**
 * Distância em células quadradas (Chebyshev: 1 passo em qualquer direção = 1 jarda)
 */
export function getCellDistance(a: HexCoord, b: HexCoord): number {
  return Math.max(Math.abs(b.col - a.col), Math.abs(b.row - a.row));
}

/**
 * Retorna todas as células quadradas dentro de um raio de alcance (circular)
 */
export function getCellsInRange(center: HexCoord, radius: number): HexCoord[] {
  if (!Number.isFinite(radius) || radius < 0) return [];
  const results: HexCoord[] = [];
  const rCeil = Math.ceil(radius);
  for (let r = center.row - rCeil; r <= center.row + rCeil; r++) {
    for (let c = center.col - rCeil; c <= center.col + rCeil; c++) {
      if (Math.hypot(c - center.col, r - center.row) <= radius + 0.15) {
        results.push({ col: c, row: r });
      }
    }
  }
  return results;
}

/**
 * Traça uma linha de células quadradas entre dois pontos (Supercover / Bresenham)
 */
export function getCellLine(a: HexCoord, b: HexCoord): HexCoord[] {
  const n = getCellDistance(a, b);
  if (n === 0) return [a];
  const results: HexCoord[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const c = Math.round(a.col + (b.col - a.col) * t);
    const r = Math.round(a.row + (b.row - a.row) * t);
    results.push({ col: c, row: r });
  }
  return results;
}

/**
 * Retorna as coordenadas de pixel do centro de um hexágono pointy-topped
 */
export function getHexCenter(col: number, row: number, hexSize: number): Point {
  const size = safeGridSize(hexSize);
  const width = Math.sqrt(3) * size;
  const x = (col + (row % 2 !== 0 ? 0.5 : 0)) * width + width / 2;
  const y = row * (1.5 * size) + size;
  return { x, y };
}

/**
 * Retorna os 6 vértices de um hexágono pointy-topped a partir do seu centro
 */
export function getHexCornerPoints(center: Point, hexSize: number): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < 6; i++) {
    // Para pointy-topped, ângulos começam em 30 graus (PI / 6)
    const angleRad = (Math.PI / 180) * (60 * i - 30);
    points.push({
      x: center.x + hexSize * Math.cos(angleRad),
      y: center.y + hexSize * Math.sin(angleRad),
    });
  }
  return points;
}

/**
 * Converte vértices em string de pontos para o elemento SVG <polygon />
 */
export function getHexPointsString(center: Point, hexSize: number): string {
  return getHexCornerPoints(center, hexSize)
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');
}

/**
 * Retorna string de pontos SVG de um hexágono flat-topped centrado em (0, 0).
 * Rotacionado em 30° + 60°*k (as 6 faces válidas), fica exatamente alinhado à grade pointy-topped,
 * mantendo uma aresta reta voltada para a frente (+Y local) e outra para trás (-Y local).
 */
const flatHexPointsCache = new Map<string, string>();
const MAX_FLAT_HEX_CACHE = 64;

export function getFlatHexPointsString(radius: number): string {
  const key = radius.toFixed(2);
  const cached = flatHexPointsCache.get(key);
  if (cached !== undefined) return cached;

  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angleRad = (Math.PI / 180) * (60 * i);
    pts.push(`${(radius * Math.cos(angleRad)).toFixed(1)},${(radius * Math.sin(angleRad)).toFixed(1)}`);
  }
  const result = pts.join(' ');
  if (flatHexPointsCache.size >= MAX_FLAT_HEX_CACHE) {
    const oldestKey = flatHexPointsCache.keys().next().value;
    if (oldestKey !== undefined) flatHexPointsCache.delete(oldestKey);
  }
  flatHexPointsCache.set(key, result);
  return result;
}

/**
 * Ajusta qualquer rotação do token (em graus) para uma das 6 faces válidas que apontam
 * exatamente para o meio de um hexágono adjacente (30°, 90°, 150°, 210°, 270°, 330°),
 * impedindo que o token aponte entre hexágonos (vértices).
 */
export function snapRotationToHexFace(deg: number): number {
  const norm = ((deg % 360) + 360) % 360;
  return (((Math.round((norm - 30) / 60) * 60 + 30) % 360) + 360) % 360;
}

/**
 * Converte FacingDirection (0=NE, 1=E, 2=SE, 3=SW, 4=W, 5=NW) para a rotação SVG do token.
 */
export function facingToRotation(facing: FacingDirection): number {
  return (((facing * 60 + 210) % 360) + 360) % 360;
}

/**
 * Converte a rotação SVG do token (após snap para face) em FacingDirection (0..5).
 */
export function rotationToFacing(deg: number): FacingDirection {
  const snapped = snapRotationToHexFace(deg);
  return ((((snapped - 210) / 60) % 6) + 6) % 6 as FacingDirection;
}

/**
 * Converte coordenada de pixel para a célula hexagonal mais próxima
 */
export function pixelToHex(pixelX: number, pixelY: number, hexSize: number): HexCoord {
  const size = safeGridSize(hexSize);
  const width = Math.sqrt(3) * size;
  // Estimativa aproximada de linha e coluna
  const approxRow = Math.round((pixelY - size) / (1.5 * size));
  const isOdd = approxRow % 2 !== 0;
  const approxCol = Math.round((pixelX - width / 2 - (isOdd ? 0.5 * width : 0)) / width);

  // Refinamento checando distância ao centro dos vizinhos imediatos
  let bestDist = Infinity;
  let bestCoord: HexCoord = { col: approxCol, row: approxRow };

  for (let r = approxRow - 1; r <= approxRow + 1; r++) {
    for (let c = approxCol - 1; c <= approxCol + 1; c++) {
      const center = getHexCenter(c, r, size);
      const dist = Math.hypot(pixelX - center.x, pixelY - center.y);
      if (dist < bestDist) {
        bestDist = dist;
        bestCoord = { col: c, row: r };
      }
    }
  }

  return bestCoord;
}

/**
 * Converte coordenada (col, row) offset pointy-top para coordenada cúbica
 */
export function offsetToCube(col: number, row: number): CubeCoord {
  const q = col - Math.floor((row - (row & 1)) / 2);
  const r = row;
  const x = q;
  const z = r;
  const y = -x - z;
  return { x, y, z };
}

/**
 * Converte coordenada cúbica de volta para offset (col, row)
 */
export function cubeToOffset(cube: CubeCoord): HexCoord {
  const col = cube.x + Math.floor((cube.z - (cube.z & 1)) / 2);
  const row = cube.z;
  return { col, row };
}

/**
 * Distância exata em hexágonos (jardas/metros em GURPS)
 */
export function getHexDistance(a: HexCoord, b: HexCoord): number {
  const cubeA = offsetToCube(a.col, a.row);
  const cubeB = offsetToCube(b.col, b.row);
  return Math.max(
    Math.abs(cubeA.x - cubeB.x),
    Math.abs(cubeA.y - cubeB.y),
    Math.abs(cubeA.z - cubeB.z)
  );
}

/**
 * Tabela Oficial de Distância e Velocidade de GURPS 4ª Edição
 * Retorna o modificador de penalidade de alcance em jardas
 */
export function getGurpsRangePenalty(yards: number): number {
  if (yards <= 2) return 0;
  if (yards <= 3) return -1;
  if (yards <= 5) return -2;
  if (yards <= 7) return -3;
  if (yards <= 10) return -4;
  if (yards <= 15) return -5;
  if (yards <= 20) return -6;
  if (yards <= 30) return -7;
  if (yards <= 50) return -8;
  if (yards <= 70) return -9;
  if (yards <= 100) return -10;
  if (yards <= 150) return -11;
  if (yards <= 200) return -12;
  if (yards <= 300) return -13;
  if (yards <= 500) return -14;
  return -15;
}

/**
 * Retorna o ângulo em graus (bússola, 0° = Norte) para a direção de Facing do hexágono pointy-topped (0 a 5)
 * 0: Nordeste (30°), 1: Leste (90°), 2: Sudeste (150°), 3: Sudoeste (210°), 4: Oeste (270°), 5: Noroeste (330°)
 */
export function getFacingAngleDegrees(facing: FacingDirection): number {
  return facing * 60 + 30;
}

export const FACING_NAMES: Record<FacingDirection, string> = {
  0: 'Nordeste (NE)',
  1: 'Leste (E)',
  2: 'Sudeste (SE)',
  3: 'Sudoeste (SW)',
  4: 'Oeste (W)',
  5: 'Noroeste (NW)',
};

/**
 * Retorna os arcos de combate de GURPS para uma orientação:
 * - Frente (3 direções): Ataques, Aparar e Bloqueios normais permitidos
 * - Flancos (2 direções): -2 em defesas ativas
 * - Retaguarda (1 direção): Sem defesa ativa permitida (exceto Esquiva c/ penalidade se ciente)
 */
export function getGurpsArcs(facing: FacingDirection) {
  const front = [((facing - 1 + 6) % 6) as FacingDirection, facing, ((facing + 1) % 6) as FacingDirection];
  const rightFlank = ((facing + 2) % 6) as FacingDirection;
  const leftFlank = ((facing + 4) % 6) as FacingDirection;
  const rear = ((facing + 3) % 6) as FacingDirection;
  return { front, rightFlank, leftFlank, rear };
}

/**
 * Retorna se um hex alvo está no arco frontal, flancos ou retaguarda do token
 */
export function getTargetArcRelationship(
  tokenPos: HexCoord,
  tokenFacing: FacingDirection,
  targetPos: HexCoord
): 'front' | 'rightFlank' | 'leftFlank' | 'rear' | 'self' {
  if (tokenPos.col === targetPos.col && tokenPos.row === targetPos.row) {
    return 'self';
  }

  // Calcula o deslocamento relativo do token para o alvo na grade
  const dx = targetPos.col - tokenPos.col;
  const dy = targetPos.row - tokenPos.row;

  // Ângulo matemático: 0° é Leste, girando horário
  // Ajustamos para que 0° seja Norte (subindo y)
  let angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
  if (angleDeg < 0) angleDeg += 360;

  // Subtrai o facing do token
  const facingDeg = getFacingAngleDegrees(tokenFacing);
  let relativeDeg = (angleDeg - facingDeg + 360) % 360;

  // Arcos de 60 graus:
  // Frente: de 300° a 60° (120° de arco frontal em GURPS cobrindo os 3 hexes da frente)
  if (relativeDeg >= 300 || relativeDeg <= 60) {
    return 'front';
  }
  // Flanco Direito: de 60° a 150°
  if (relativeDeg > 60 && relativeDeg <= 150) {
    return 'rightFlank';
  }
  // Flanco Esquerdo: de 210° a 300°
  if (relativeDeg >= 210 && relativeDeg < 300) {
    return 'leftFlank';
  }
  // Retaguarda: de 150° a 210°
  return 'rear';
}

/**
 * Traça uma linha de hexes entre dois pontos (Bresenham / Supercover em coordenadas cúbicas)
 */
export function getHexLine(a: HexCoord, b: HexCoord): HexCoord[] {
  const n = getHexDistance(a, b);
  if (n === 0) return [a];

  const cubeA = offsetToCube(a.col, a.row);
  const cubeB = offsetToCube(b.col, b.row);

  const results: HexCoord[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = cubeA.x + (cubeB.x - cubeA.x) * t;
    const y = cubeA.y + (cubeB.y - cubeA.y) * t;
    const z = cubeA.z + (cubeB.z - cubeA.z) * t;

    // Arredonda para o cubo inteiro mais próximo
    let rx = Math.round(x);
    let ry = Math.round(y);
    let rz = Math.round(z);

    const xDiff = Math.abs(rx - x);
    const yDiff = Math.abs(ry - y);
    const zDiff = Math.abs(rz - z);

    if (xDiff > yDiff && xDiff > zDiff) {
      rx = -ry - rz;
    } else if (yDiff > zDiff) {
      ry = -rx - rz;
    } else {
      rz = -rx - ry;
    }

    results.push(cubeToOffset({ x: rx, y: ry, z: rz }));
  }

  return results;
}

/**
 * Retorna todos os hexes dentro de um raio de alcance (jardas)
 */
export function getHexesInRange(center: HexCoord, radius: number): HexCoord[] {
  if (!Number.isFinite(radius) || radius < 0) return [];
  const rInt = Math.max(0, Math.floor(radius));
  const results: HexCoord[] = [];
  const cubeCenter = offsetToCube(center.col, center.row);

  for (let q = -rInt; q <= rInt; q++) {
    const r1 = Math.max(-rInt, -q - rInt);
    const r2 = Math.min(rInt, -q + rInt);
    for (let r = r1; r <= r2; r++) {
      const s = -q - r;
      const cube: CubeCoord = {
        x: cubeCenter.x + q,
        y: cubeCenter.y + s,
        z: cubeCenter.z + r,
      };
      results.push(cubeToOffset(cube));
    }
  }

  return results;
}

/**
 * Calcula o contorno externo exato (SVG path fechado) de todos os hexágonos dentro de `radiusYards` jardas
 * a partir de `center`, seguindo estritamente as arestas externas dos hexágonos (nunca cortando no meio de um hex).
 */
const hexRangePerimeterCache = new Map<string, string>();
const MAX_HEX_PERIMETER_CACHE = 500;

export function getHexRangePerimeterPath(
  center: HexCoord,
  radiusYards: number,
  hexSize: number,
  offsetX = 0,
  offsetY = 0
): string {
  const r = Math.max(1, Math.round(radiusYards));
  const cacheKey = `${center.col},${center.row},${r},${hexSize},${offsetX},${offsetY}`;
  const cached = hexRangePerimeterCache.get(cacheKey);
  if (cached !== undefined) {
    // Atualiza ordem LRU
    hexRangePerimeterCache.delete(cacheKey);
    hexRangePerimeterCache.set(cacheKey, cached);
    return cached;
  }

  const storeResult = (val: string): string => {
    if (hexRangePerimeterCache.size >= MAX_HEX_PERIMETER_CACHE) {
      const oldestKey = hexRangePerimeterCache.keys().next().value;
      if (oldestKey !== undefined) hexRangePerimeterCache.delete(oldestKey);
    }
    hexRangePerimeterCache.set(cacheKey, val);
    return val;
  };

  if (r > 25) {
    const c = getHexCenter(center.col, center.row, hexSize);
    const cx = offsetX + c.x;
    const cy = offsetY + c.y;
    const radPx = (r + 0.5) * Math.sqrt(3) * hexSize;
    return storeResult(
      `M ${(cx - radPx).toFixed(1)} ${cy.toFixed(1)} A ${radPx.toFixed(1)} ${radPx.toFixed(1)} 0 1 0 ${(cx + radPx).toFixed(1)} ${cy.toFixed(1)} A ${radPx.toFixed(1)} ${radPx.toFixed(1)} 0 1 0 ${(cx - radPx).toFixed(1)} ${cy.toFixed(1)} Z`
    );
  }

  const hexes = getHexesInRange(center, r);
  const boundaryEdges = new Map<string, { a: Point; b: Point }>();

  for (const h of hexes) {
    const c = getHexCenter(h.col, h.row, hexSize);
    const corners = getHexCornerPoints({ x: offsetX + c.x, y: offsetY + c.y }, hexSize);
    for (let i = 0; i < 6; i++) {
      const a = corners[i];
      const b = corners[(i + 1) % 6];
      const midKey = `${Math.round((a.x + b.x) * 5)},${Math.round((a.y + b.y) * 5)}`;
      if (boundaryEdges.has(midKey)) {
        boundaryEdges.delete(midKey);
      } else {
        boundaryEdges.set(midKey, { a, b });
      }
    }
  }

  if (boundaryEdges.size === 0) return storeResult('');

  const ptKey = (p: Point) => `${Math.round(p.x * 10)},${Math.round(p.y * 10)}`;
  const nextByStart = new Map<string, { a: Point; b: Point }>();
  for (const edge of boundaryEdges.values()) {
    nextByStart.set(ptKey(edge.a), edge);
  }

  const firstEntry = nextByStart.entries().next();
  if (firstEntry.done) return storeResult('');

  const [startKey, firstEdge] = firstEntry.value;
  const ordered: Point[] = [firstEdge.a];
  let curKey = ptKey(firstEdge.b);
  let guard = 0;
  const maxSteps = boundaryEdges.size + 2;

  while (curKey !== startKey && guard < maxSteps) {
    const nextEdge = nextByStart.get(curKey);
    if (!nextEdge) break;
    ordered.push(nextEdge.a);
    curKey = ptKey(nextEdge.b);
    guard++;
  }

  if (ordered.length < 3) return storeResult('');
  return storeResult(
    `M ${ordered[0].x.toFixed(1)} ${ordered[0].y.toFixed(1)} ` +
    ordered.slice(1).map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') +
    ' Z'
  );
}

/**
 * Retorna a coordenada Y do topo externo do agrupamento de hexágonos de raio `radiusYards`.
 */
export function getHexRangeTopY(
  center: HexCoord,
  radiusYards: number,
  hexSize: number,
  offsetY = 0
): number {
  const r = Math.max(1, Math.round(radiusYards));
  const c = getHexCenter(center.col, center.row, hexSize);
  return offsetY + c.y - (1.5 * r + 1) * hexSize;
}

/**
 * Retorna o path SVG para um setor circular (cone de luz ou semicírculo).
 * angleDegrees: 360 = círculo completo, 180 = semicírculo, 90 = cone.
 * rotationDegrees: 0 = Direita/Leste (+X), 90 = Baixo/Sul (+Y), 180 = Esquerda/Oeste (-X), 270 = Cima/Norte (-Y).
 */
export function getCircleSectorPath(
  cx: number,
  cy: number,
  r: number,
  angleDegrees: number,
  rotationDegrees: number = 0
): string {
  if (angleDegrees >= 360) {
    return `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;
  }

  const halfAngle = angleDegrees / 2;
  const startAngle = ((rotationDegrees - halfAngle) * Math.PI) / 180;
  const endAngle = ((rotationDegrees + halfAngle) * Math.PI) / 180;

  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);

  const largeArcFlag = angleDegrees > 180 ? 1 : 0;

  return `M ${cx.toFixed(1)} ${cy.toFixed(1)} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 ${largeArcFlag} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z`;
}

export interface LineSegment {
  p1: Point;
  p2: Point;
}

/**
 * Extrai todos os segmentos de reta bloqueadores de luz a partir das paredes e portas do mapa.
 * Portas abertas NÃO bloqueiam luz; portas fechadas bloqueiam como paredes.
 */
export function extractBlockingSegments(
  walls: TacticalWall[] = [],
  doors: TacticalDoor[] = []
): LineSegment[] {
  const segments: LineSegment[] = [];

  // Paredes (poligonais ou polilinhas)
  for (const wall of walls) {
    if (!wall.points || wall.points.length < 2) continue;
    for (let i = 0; i < wall.points.length - 1; i++) {
      segments.push({
        p1: wall.points[i],
        p2: wall.points[i + 1],
      });
    }
    // Se o polígono é fechado, conecta o último vértice ao primeiro
    if (wall.closed && wall.points.length >= 3) {
      segments.push({
        p1: wall.points[wall.points.length - 1],
        p2: wall.points[0],
      });
    }
  }

  // Portas: apenas portas fechadas bloqueiam a luz
  for (const door of doors) {
    if (!door.isOpen) {
      segments.push({
        p1: { x: door.x1, y: door.y1 },
        p2: { x: door.x2, y: door.y2 },
      });
    }
  }

  return segments;
}

/**
 * Calcula o polígono 2D de visibilidade/iluminação dinâmica a partir do centro da luz,
 * contido pelas paredes e portas fechadas.
 * Utiliza ray-casting radial com amostras angulares e vértices dos obstáculos.
 */
export function computeVisibilityPolygon(
  center: Point,
  radius: number,
  segments: LineSegment[],
  angleDegrees: number = 360,
  rotationDegrees: number = 0
): Point[] {
  if (radius <= 0 || !Number.isFinite(radius) || !Number.isFinite(center.x) || !Number.isFinite(center.y)) return [];
  if (!segments || segments.length === 0) return [];

  const r2 = radius * radius;
  const relevantSegments: LineSegment[] = [];

  // Filtra apenas os segmentos válidos que estão dentro ou cruzam o raio de alcance da luz
  for (const seg of segments) {
    if (!seg || !seg.p1 || !seg.p2) continue;
    if (!Number.isFinite(seg.p1.x) || !Number.isFinite(seg.p1.y) || !Number.isFinite(seg.p2.x) || !Number.isFinite(seg.p2.y)) continue;
    if (Math.hypot(seg.p2.x - seg.p1.x, seg.p2.y - seg.p1.y) < 0.5) continue;

    const d1sq = (seg.p1.x - center.x) ** 2 + (seg.p1.y - center.y) ** 2;
    const d2sq = (seg.p2.x - center.x) ** 2 + (seg.p2.y - center.y) ** 2;

    if (d1sq <= r2 || d2sq <= r2) {
      relevantSegments.push(seg);
    } else {
      const dx = seg.p2.x - seg.p1.x;
      const dy = seg.p2.y - seg.p1.y;
      const lenSq = dx * dx + dy * dy;
      if (lenSq > 0) {
        let t = ((center.x - seg.p1.x) * dx + (center.y - seg.p1.y) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        const projX = seg.p1.x + t * dx;
        const projY = seg.p1.y + t * dy;
        const distSq = (projX - center.x) ** 2 + (projY - center.y) ** 2;
        if (distSq <= r2) {
          relevantSegments.push(seg);
        }
      }
    }
  }

  // Se nenhum segmento bloqueia este foco de luz, retorna vazio para renderizar o círculo nativo
  if (relevantSegments.length === 0) {
    return [];
  }

  const isDirectional = angleDegrees < 360;
  const halfAngleRad = (angleDegrees / 2) * (Math.PI / 180);
  const rotRad = (rotationDegrees * Math.PI) / 180;
  const minAngle = rotRad - halfAngleRad;
  const maxAngle = rotRad + halfAngleRad;

  // Normalização puramente aritmética sem loops while (100% à prova de travamentos/crashes)
  const normalizeDirectional = (a: number) => {
    if (!Number.isFinite(a)) return rotRad;
    const twoPi = 2 * Math.PI;
    let diff = (a - rotRad) % twoPi;
    if (diff < -Math.PI) diff += twoPi;
    if (diff > Math.PI) diff -= twoPi;
    return rotRad + diff;
  };

  const inCone = (a: number) => {
    if (!isDirectional) return true;
    const norm = normalizeDirectional(a);
    return norm >= minAngle - 0.002 && norm <= maxAngle + 0.002;
  };

  const rawAngles: number[] = [];
  const addAngle = (a: number) => {
    if (!Number.isFinite(a)) return;
    if (inCone(a)) rawAngles.push(a);
  };

  const addAngleTriplet = (a: number) => {
    const delta = 0.00015;
    addAngle(a - delta);
    addAngle(a);
    addAngle(a + delta);
  };

  // 1. Amostras circulares regulares para perímetro suave (36 amostras bastam para 10 graus por setor)
  const numCircleRays = isDirectional ? Math.max(12, Math.round((angleDegrees / 360) * 36)) : 36;
  const arcSpan = isDirectional ? maxAngle - minAngle : 2 * Math.PI;
  const startArc = isDirectional ? minAngle : 0;
  for (let i = 0; i <= numCircleRays; i++) {
    const a = startArc + (i / numCircleRays) * arcSpan;
    addAngle(a);
  }

  if (isDirectional) {
    addAngle(minAngle);
    addAngle(maxAngle);
  }

  // 2. Vértices de paredes e cruzamentos com a circunferência
  for (const seg of relevantSegments) {
    const a1 = Math.atan2(seg.p1.y - center.y, seg.p1.x - center.x);
    const a2 = Math.atan2(seg.p2.y - center.y, seg.p2.x - center.x);
    addAngleTriplet(a1);
    addAngleTriplet(a2);

    // Cruzamento do segmento com a borda circular da luz
    const dx = seg.p2.x - seg.p1.x;
    const dy = seg.p2.y - seg.p1.y;
    const fx = seg.p1.x - center.x;
    const fy = seg.p1.y - center.y;
    const qa = dx * dx + dy * dy;
    const qb = 2 * (fx * dx + fy * dy);
    const qc = fx * fx + fy * fy - r2;
    const disc = qb * qb - 4 * qa * qc;
    if (disc >= 0 && qa > 0) {
      const sqrtDisc = Math.sqrt(disc);
      const t1 = (-qb - sqrtDisc) / (2 * qa);
      const t2 = (-qb + sqrtDisc) / (2 * qa);
      if (t1 >= 0 && t1 <= 1) {
        addAngleTriplet(Math.atan2(seg.p1.y + t1 * dy - center.y, seg.p1.x + t1 * dx - center.x));
      }
      if (t2 >= 0 && t2 <= 1) {
        addAngleTriplet(Math.atan2(seg.p1.y + t2 * dy - center.y, seg.p1.x + t2 * dx - center.x));
      }
    }
  }

  // Limite de segurança de raios para garantir estabilidade e fluidez total
  if (rawAngles.length > 180) {
    rawAngles.length = 180;
  }

  // 3. Dispara cada raio e calcula a menor distância de colisão
  const norm360 = (a: number) => {
    if (!Number.isFinite(a)) return 0;
    return ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  };

  const castRay = (angle: number) => {
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    let bestDist = radius;
    let closestWallDist = radius;

    for (const seg of relevantSegments) {
      const vx = seg.p2.x - seg.p1.x;
      const vy = seg.p2.y - seg.p1.y;
      const wx = seg.p1.x - center.x;
      const wy = seg.p1.y - center.y;

      const det = cosA * vy - sinA * vx;
      if (Math.abs(det) < 1e-9) continue;

      const t = (wx * vy - wy * vx) / det;
      const s = (wx * sinA - wy * cosA) / det;

      if (s >= -0.0001 && s <= 1.0001 && t > 0.001 && t < closestWallDist) {
        closestWallDist = t;
        bestDist = t;
      }
    }

    const sortKey = isDirectional ? normalizeDirectional(angle) : norm360(angle);
    return {
      sortKey,
      point: {
        x: center.x + bestDist * cosA,
        y: center.y + bestDist * sinA,
      },
    };
  };

  const results = rawAngles.map(castRay);
  results.sort((a, b) => a.sortKey - b.sortKey);

  // Remove pontos idênticos consecutivos
  const points: Point[] = [];
  for (let i = 0; i < results.length; i++) {
    const pt = results[i].point;
    if (points.length === 0) {
      points.push(pt);
    } else {
      const prev = points[points.length - 1];
      if (Math.hypot(pt.x - prev.x, pt.y - prev.y) > 0.3) {
        points.push(pt);
      }
    }
  }

  if (isDirectional && points.length > 0) {
    return [center, ...points];
  }

  return points;
}

/**
 * Verifica se dois segmentos de reta se cruzam em 2D
 */
function ccw(p1: Point, p2: Point, p3: Point): number {
  return (p3.y - p1.y) * (p2.x - p1.x) - (p2.y - p1.y) * (p3.x - p1.x);
}

export function segmentsIntersect(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
  const d1 = ccw(p3, p4, p1);
  const d2 = ccw(p3, p4, p2);
  const d3 = ccw(p1, p2, p3);
  const d4 = ccw(p1, p2, p4);

  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }
  return false;
}

/**
 * Linha de Visão direta entre dois pontos no mapa.
 * Retorna true se NÃO houver nenhuma parede ou porta fechada bloqueando a visão entre eles.
 */
export function hasLineOfSight(from: Point, to: Point, blockingSegments: LineSegment[]): boolean {
  if (!blockingSegments || blockingSegments.length === 0) return true;
  for (const seg of blockingSegments) {
    if (segmentsIntersect(from, to, seg.p1, seg.p2)) {
      return false;
    }
  }
  return true;
}

/**
 * Converte uma lista de vértices ordenados no path SVG `<path d="..." />` fechado com Z.
 */
export function pointsToSvgPath(points: Point[]): string {
  if (!points || points.length < 3) return '';
  return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} ` +
    points.slice(1).map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') +
    ' Z';
}

/**
 * Gira todo o mapa e todas as suas configurações em 90° no sentido horário:
 * Dimensões da imagem, tokens (posição e facing), focos de luz, paredes, portas, mobília e marcadores.
 */
export function rotateTacticalState90(tacticalState: TacticalState): Partial<TacticalState> {
  const curW =
    typeof tacticalState.mapImageWidth === 'number' &&
    Number.isFinite(tacticalState.mapImageWidth) &&
    tacticalState.mapImageWidth > 0
      ? tacticalState.mapImageWidth
      : 2000;
  const curH =
    typeof tacticalState.mapImageHeight === 'number' &&
    Number.isFinite(tacticalState.mapImageHeight) &&
    tacticalState.mapImageHeight > 0
      ? tacticalState.mapImageHeight
      : 1400;
  const hexSize = clampHexSize(tacticalState.hexSize);
  const isSquare = tacticalState.gridType === 'square';
  const newW = curH;
  const newH = curW;

  const rotPoint = (x: number, y: number) => ({
    x: curH - y,
    y: x,
  });

  // Em grade quadrada, Math.floor(curH / hexSize - 0.5) - row é exato e 100% reversível em 4 rotações.
  const squareColOffset = Math.floor(curH / hexSize - 0.5);
  const getGridPoint = (col: number, row: number): Point =>
    isSquare ? getCellCenter(col, row, hexSize) : getHexCenter(col, row, hexSize);
  const pointToGrid = (px: number, py: number): HexCoord =>
    isSquare ? pixelToCell(px, py, hexSize) : pixelToHex(px, py, hexSize);
  const rotateGridCoord = (col: number, row: number): HexCoord => {
    if (isSquare) {
      return {
        col: squareColOffset - row,
        row: col,
      };
    }
    const center = getHexCenter(col, row, hexSize);
    const p = rotPoint(center.x, center.y);
    return pixelToHex(p.x, p.y, hexSize);
  };

  const nextRotation = ((((tacticalState.mapRotation || 0) + 90) % 360) + 360) % 360;

  // 1. Tokens
  const newTokens = (tacticalState.tokens || []).map((token) => {
    const coord = rotateGridCoord(token.gridX, token.gridY);
    const curRot =
      typeof token.rotation === 'number' && Number.isFinite(token.rotation)
        ? token.rotation
        : facingToRotation(token.facing);
    const newRot = (((curRot + 90) % 360) + 360) % 360;
    const newFacing = rotationToFacing(newRot);
    return {
      ...token,
      gridX: coord.col,
      gridY: coord.row,
      rotation: newRot,
      facing: newFacing,
    };
  });

  // 2. Focos de Luz
  const newLights = (tacticalState.lights || []).map((light) => {
    const fallbackCenter = getGridPoint(light.gridX, light.gridY);
    const lx = typeof light.x === 'number' && Number.isFinite(light.x) ? light.x : fallbackCenter.x;
    const ly = typeof light.y === 'number' && Number.isFinite(light.y) ? light.y : fallbackCenter.y;
    const p = rotPoint(lx, ly);
    const coord = pointToGrid(p.x, p.y);
    return {
      ...light,
      x: p.x,
      y: p.y,
      gridX: coord.col,
      gridY: coord.row,
      rotation: ((((light.rotation || 0) + 90) % 360) + 360) % 360,
    };
  });

  // 3. Paredes Poligonais
  const newWalls = (tacticalState.walls || []).map((wall) => ({
    ...wall,
    points: (wall.points || []).map((pt) => rotPoint(pt.x, pt.y)),
  }));

  // 4. Portas
  const newDoors = (tacticalState.doors || []).map((door) => {
    const p1 = rotPoint(door.x1, door.y1);
    const p2 = rotPoint(door.x2, door.y2);
    return {
      ...door,
      x1: p1.x,
      y1: p1.y,
      x2: p2.x,
      y2: p2.y,
    };
  });

  // 5. Elementos de Cenário (Props) — rotaciona o centro e soma +90° em rotation sem trocar width/height
  const newProps = (tacticalState.props || []).map((prop) => {
    const w = prop.width || 0;
    const h = prop.height || 0;
    const cx = prop.x + w / 2;
    const cy = prop.y + h / 2;
    const nc = rotPoint(cx, cy);
    return {
      ...prop,
      x: nc.x - w / 2,
      y: nc.y - h / 2,
      rotation: ((((prop.rotation || 0) + 90) % 360) + 360) % 360,
    };
  });

  // 6. Marcadores e Réguas
  const newMarkers = (tacticalState.markers || []).map((marker) => {
    const coordA = rotateGridCoord(marker.startX, marker.startY);
    const coordB =
      marker.endX !== undefined && marker.endY !== undefined
        ? rotateGridCoord(marker.endX, marker.endY)
        : undefined;
    return {
      ...marker,
      startX: coordA.col,
      startY: coordA.row,
      ...(coordB ? { endX: coordB.col, endY: coordB.row } : {}),
    };
  });

  // 7. Lembretes do Mestre
  const newNotes = (tacticalState.notes || []).map((note) => {
    const p = rotPoint(note.x, note.y);
    return {
      ...note,
      x: p.x,
      y: p.y,
    };
  });

  // 8. Células de Terreno
  const newTerrainCells = (tacticalState.terrainCells || []).map((cell) => {
    const coord = rotateGridCoord(cell.x, cell.y);
    return {
      ...cell,
      x: coord.col,
      y: coord.row,
    };
  });

  // 9. Últimas posições salvas dos tokens
  let newLastTokenPositions: Record<string, TacticalTokenSavedPosition> | undefined = undefined;
  if (tacticalState.lastTokenPositions && typeof tacticalState.lastTokenPositions === 'object') {
    newLastTokenPositions = {};
    for (const [key, pos] of Object.entries(tacticalState.lastTokenPositions)) {
      if (!pos) continue;
      const coord = rotateGridCoord(pos.gridX, pos.gridY);
      const curRot =
        typeof pos.rotation === 'number' && Number.isFinite(pos.rotation)
          ? pos.rotation
          : pos.facing !== undefined
          ? facingToRotation(pos.facing)
          : undefined;
      const newRot = curRot !== undefined ? (((curRot + 90) % 360) + 360) % 360 : undefined;
      const newFacing = newRot !== undefined ? rotationToFacing(newRot) : pos.facing;
      newLastTokenPositions[key] = {
        ...pos,
        gridX: coord.col,
        gridY: coord.row,
        ...(newRot !== undefined ? { rotation: newRot } : {}),
        ...(newFacing !== undefined ? { facing: newFacing } : {}),
      };
    }
  }

  // 10. Máscara única de Névoa de Guerra
  const currentFogMask: TacticalFogMask =
    tacticalState.fogMask &&
    (tacticalState.fogMask.base === 'revealed' || tacticalState.fogMask.base === 'hidden') &&
    Array.isArray(tacticalState.fogMask.ops)
      ? tacticalState.fogMask
      : { base: 'revealed', ops: [] };

  const newFogOps: TacticalFogOp[] = currentFogMask.ops.map((op): TacticalFogOp => {
    if (op.shape === 'circle') {
      return {
        ...op,
        x: curH - op.y,
        y: op.x,
      };
    }
    if (op.shape === 'polygon') {
      return {
        ...op,
        points: (Array.isArray(op.points) ? op.points : []).map((p) => ({
          x: curH - p.y,
          y: p.x,
        })),
      };
    }
    return {
      ...op,
      x: curH - (op.y + op.height),
      y: op.x,
      width: op.height,
      height: op.width,
    };
  });

  return {
    mapRotation: nextRotation,
    mapImageWidth: newW,
    mapImageHeight: newH,
    tokens: newTokens,
    lights: newLights,
    walls: newWalls,
    doors: newDoors,
    props: newProps,
    markers: newMarkers,
    notes: newNotes,
    terrainCells: newTerrainCells,
    ...(newLastTokenPositions !== undefined ? { lastTokenPositions: newLastTokenPositions } : {}),
    fogMask: {
      base: currentFogMask.base,
      ops: newFogOps,
    },
  };
}

/**
 * Teste padrão de ponto dentro de polígono 2D (Ray-casting / Jordan curve).
 */
export function isPointInPolygon(point: Point, vs: Point[]): boolean {
  if (!vs || vs.length < 3) return false;
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i].x, yi = vs[i].y;
    const xj = vs[j].x, yj = vs[j].y;
    const intersect = ((yi > point.y) !== (yj > point.y))
        && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
