import { FacingDirection, TacticalWall, TacticalDoor } from '../types/tactical';

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
  return {
    x: col * cellSize + cellSize / 2,
    y: row * cellSize + cellSize / 2,
  };
}

/**
 * Converte coordenada de pixel para a célula quadrada mais próxima
 */
export function pixelToCell(pixelX: number, pixelY: number, cellSize: number): HexCoord {
  return {
    col: Math.floor(pixelX / cellSize),
    row: Math.floor(pixelY / cellSize),
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
  const width = Math.sqrt(3) * hexSize;
  const x = (col + (row % 2 !== 0 ? 0.5 : 0)) * width + width / 2;
  const y = row * (1.5 * hexSize) + hexSize;
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
 * Converte coordenada de pixel para a célula hexagonal mais próxima
 */
export function pixelToHex(pixelX: number, pixelY: number, hexSize: number): HexCoord {
  const width = Math.sqrt(3) * hexSize;
  // Estimativa aproximada de linha e coluna
  const approxRow = Math.round((pixelY - hexSize) / (1.5 * hexSize));
  const isOdd = approxRow % 2 !== 0;
  const approxCol = Math.round((pixelX - width / 2 - (isOdd ? 0.5 * width : 0)) / width);

  // Refinamento checando distância ao centro dos vizinhos imediatos
  let bestDist = Infinity;
  let bestCoord: HexCoord = { col: approxCol, row: approxRow };

  for (let r = approxRow - 1; r <= approxRow + 1; r++) {
    for (let c = approxCol - 1; c <= approxCol + 1; c++) {
      const center = getHexCenter(c, r, hexSize);
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
 * Retorna o ângulo em graus para a direção de Facing do hexágono (0 a 5)
 * 0: Norte (0°), 1: Nordeste (60°), 2: Sudeste (120°), 3: Sul (180°), 4: Sudoeste (240°), 5: Noroeste (300°)
 */
export function getFacingAngleDegrees(facing: FacingDirection): number {
  return facing * 60;
}

export const FACING_NAMES: Record<FacingDirection, string> = {
  0: 'Norte (Frente Superior)',
  1: 'Nordeste (Frente Direita)',
  2: 'Sudeste (Flanco Traseiro D.)',
  3: 'Sul (Retaguarda)',
  4: 'Sudoeste (Flanco Traseiro E.)',
  5: 'Noroeste (Frente Esquerda)',
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
  const results: HexCoord[] = [];
  const cubeCenter = offsetToCube(center.col, center.row);

  for (let q = -radius; q <= radius; q++) {
    const r1 = Math.max(-radius, -q - radius);
    const r2 = Math.min(radius, -q + radius);
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
  if (radius <= 0) return [];
  if (!segments || segments.length === 0) return [];

  const r2 = radius * radius;
  const relevantSegments: LineSegment[] = [];

  // Filtra apenas os segmentos que estão dentro ou cruzam o raio de alcance da luz
  for (const seg of segments) {
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

  const normalizeDirectional = (a: number) => {
    while (a < rotRad - Math.PI) a += 2 * Math.PI;
    while (a > rotRad + Math.PI) a -= 2 * Math.PI;
    return a;
  };

  const inCone = (a: number) => {
    if (!isDirectional) return true;
    const norm = normalizeDirectional(a);
    return norm >= minAngle - 0.002 && norm <= maxAngle + 0.002;
  };

  const rawAngles: number[] = [];
  const addAngle = (a: number) => {
    if (inCone(a)) rawAngles.push(a);
  };

  const addAngleTriplet = (a: number) => {
    const delta = 0.00015;
    addAngle(a - delta);
    addAngle(a);
    addAngle(a + delta);
  };

  // 1. Amostras circulares regulares para perímetro suave (72 raios a cada 5 graus)
  const numCircleRays = isDirectional ? Math.max(16, Math.round((angleDegrees / 360) * 72)) : 72;
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

  // 3. Dispara cada raio e calcula a menor distância de colisão
  const norm360 = (a: number) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

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
 * Converte uma lista de vértices ordenados no path SVG `<path d="..." />` fechado com Z.
 */
export function pointsToSvgPath(points: Point[]): string {
  if (!points || points.length < 3) return '';
  return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} ` +
    points.slice(1).map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') +
    ' Z';
}
