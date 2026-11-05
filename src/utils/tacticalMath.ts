import { FacingDirection } from '../types/tactical';

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
