import { describe, it, expect } from 'vitest';
import {
  DEFAULT_HEX_SIZE,
  offsetToCube,
  cubeToOffset,
  getHexCenter,
  pixelToHex,
  getHexDistance,
  getHexesInRange,
  getGurpsRangePenalty,
  rotateTacticalState90,
} from '../tacticalMath';
import { DEFAULT_TACTICAL_STATE, TacticalState } from '../../types/tactical';

function deepFreeze<T>(obj: T): T {
  if (obj && typeof obj === 'object') {
    Object.freeze(obj);
    for (const key of Object.keys(obj as Record<string, unknown>)) {
      deepFreeze((obj as Record<string, unknown>)[key]);
    }
  }
  return obj;
}

describe('tacticalMath.ts — Conversões de coordenadas e guardas', () => {
  it('faz round-trip exato offsetToCube <-> cubeToOffset em linhas pares, ímpares e negativas', () => {
    const coords = [
      { col: 0, row: 0 },
      { col: 5, row: 2 },   // par
      { col: 5, row: 3 },   // ímpar
      { col: -4, row: -2 }, // negativo par
      { col: -4, row: -3 }, // negativo ímpar
      { col: 12, row: -7 },
      { col: -9, row: 8 },
    ];

    for (const c of coords) {
      const cube = offsetToCube(c.col, c.row);
      expect(cube.x + cube.y + cube.z).toBe(0);
      expect(cubeToOffset(cube)).toEqual(c);
    }
  });

  it('faz round-trip exato getHexCenter <-> pixelToHex em linhas pares, ímpares e negativas', () => {
    const coords = [
      { col: 0, row: 0 },
      { col: 4, row: 2 },
      { col: 4, row: 3 },
      { col: -3, row: -2 },
      { col: -3, row: -3 },
      { col: 10, row: 11 },
    ];

    for (const hexSize of [20, 38, 64]) {
      for (const c of coords) {
        const center = getHexCenter(c.col, c.row, hexSize);
        expect(pixelToHex(center.x, center.y, hexSize)).toEqual(c);
      }
    }
  });

  it('protege getHexCenter e pixelToHex contra hexSize <= 0, NaN e Infinity usando DEFAULT_HEX_SIZE', () => {
    const expectedCenter = getHexCenter(3, 5, DEFAULT_HEX_SIZE);

    for (const badSize of [0, -10, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      const center = getHexCenter(3, 5, badSize);
      expect(Number.isFinite(center.x)).toBe(true);
      expect(Number.isFinite(center.y)).toBe(true);
      expect(center.x).toBeCloseTo(expectedCenter.x, 6);
      expect(center.y).toBeCloseTo(expectedCenter.y, 6);

      const back = pixelToHex(center.x, center.y, badSize);
      expect(back).toEqual({ col: 3, row: 5 });
    }
  });
});

describe('tacticalMath.ts — Distância, alcance e tabela GURPS', () => {
  it('calcula getHexDistance corretamente (identidade, simetria e vizinhos)', () => {
    const origin = { col: 4, row: 4 };
    expect(getHexDistance(origin, origin)).toBe(0);

    const target = { col: 7, row: 6 };
    const dist = getHexDistance(origin, target);
    expect(dist).toBe(4);
    expect(getHexDistance(target, origin)).toBe(dist);

    // Vizinhos imediatos têm distância 1
    const ring1 = getHexesInRange(origin, 1).filter(
      (h) => !(h.col === origin.col && h.row === origin.row)
    );
    expect(ring1).toHaveLength(6);
    for (const neighbor of ring1) {
      expect(getHexDistance(origin, neighbor)).toBe(1);
    }
  });

  it('calcula getHexesInRange corretamente inclusive para raio fracionário, zero e negativo', () => {
    const center = { col: 5, row: 5 };

    expect(getHexesInRange(center, -1)).toEqual([]);
    expect(getHexesInRange(center, Number.NaN)).toEqual([]);
    expect(getHexesInRange(center, 0)).toEqual([center]);

    // Fórmula hexagonal: 1 + 3*r*(r+1)
    expect(getHexesInRange(center, 1)).toHaveLength(7);
    expect(getHexesInRange(center, 2)).toHaveLength(19);

    // Raio fracionário usa floor(radius) sem corromper coordenadas
    const frac1 = getHexesInRange(center, 1.8);
    expect(frac1).toHaveLength(7);
    for (const h of frac1) {
      expect(Number.isInteger(h.col)).toBe(true);
      expect(Number.isInteger(h.row)).toBe(true);
      expect(getHexDistance(center, h)).toBeLessThanOrEqual(1);
    }

    const frac2 = getHexesInRange(center, 2.5);
    expect(frac2).toHaveLength(19);
    for (const h of frac2) {
      expect(getHexDistance(center, h)).toBeLessThanOrEqual(2);
    }
  });

  it('retorna penalidades oficiais da tabela de alcance GURPS 4e em getGurpsRangePenalty', () => {
    expect(getGurpsRangePenalty(0)).toBe(0);
    expect(getGurpsRangePenalty(2)).toBe(0);
    expect(getGurpsRangePenalty(3)).toBe(-1);
    expect(getGurpsRangePenalty(5)).toBe(-2);
    expect(getGurpsRangePenalty(7)).toBe(-3);
    expect(getGurpsRangePenalty(10)).toBe(-4);
    expect(getGurpsRangePenalty(15)).toBe(-5);
    expect(getGurpsRangePenalty(20)).toBe(-6);
    expect(getGurpsRangePenalty(30)).toBe(-7);
    expect(getGurpsRangePenalty(50)).toBe(-8);
    expect(getGurpsRangePenalty(70)).toBe(-9);
    expect(getGurpsRangePenalty(100)).toBe(-10);
    expect(getGurpsRangePenalty(150)).toBe(-11);
    expect(getGurpsRangePenalty(200)).toBe(-12);
    expect(getGurpsRangePenalty(300)).toBe(-13);
    expect(getGurpsRangePenalty(500)).toBe(-14);
    expect(getGurpsRangePenalty(501)).toBe(-15);
  });
});

describe('tacticalMath.ts — rotateTacticalState90 (invariante de 4 rotações e imutabilidade)', () => {
  function buildSampleState(gridType: 'square' | 'hex'): TacticalState {
    return {
      ...DEFAULT_TACTICAL_STATE,
      gridType,
      hexSize: 40,
      mapImageWidth: 800,
      mapImageHeight: 600,
      mapRotation: 0,
      tokens: [
        {
          id: 'tok-hero',
          npcId: 'npc-hero',
          gridX: 4,
          gridY: 3,
          facing: 1,
          rotation: 270,
          elevation: 0,
          reach: 1,
          size: 1,
          color: '#38bdf8',
          customName: 'Aldric',
          auraRadius: 3,
          auraVisibleToPlayers: true,
        },
        {
          id: 'tok-boss',
          npcId: 'npc-boss',
          gridX: 10,
          gridY: 6,
          facing: 4,
          rotation: 90,
          elevation: 1,
          reach: 2,
          size: 1,
          hiddenFromPlayers: true,
          layer: 'gm',
        },
      ],
      lastTokenPositions: {
        'npc-removed': {
          gridX: 6,
          gridY: 4,
          facing: 2,
          rotation: 330,
        },
      },
      props: [
        {
          id: 'prop-table',
          name: 'Mesa de Banquete',
          type: 'table-long',
          x: 120,
          y: 200,
          width: 220,
          height: 65,
          rotation: 15,
          locked: false,
          layer: 'map',
          opacity: 0.9,
        },
      ],
      notes: [
        {
          id: 'note-trap',
          title: 'Armadilha',
          content: 'Alçapão oculto com CD 14',
          x: 310.5,
          y: 145.25,
          color: '#f59e0b',
        },
      ],
      fogMask: {
        base: 'hidden',
        ops: [
          { op: 'reveal', shape: 'rect', x: 80, y: 120, width: 240, height: 160 },
          { op: 'reveal', shape: 'circle', x: 450.5, y: 260.25, radius: 95 },
          {
            op: 'hide',
            shape: 'polygon',
            points: [
              { x: 100, y: 100 },
              { x: 250.5, y: 110 },
              { x: 200, y: 220.5 },
            ],
          },
        ],
      },
    };
  }

  function apply4Rotations(initial: TacticalState): { after1: TacticalState; after4: TacticalState } {
    let state: TacticalState = initial;
    let after1!: TacticalState;
    for (let i = 0; i < 4; i++) {
      const patch = rotateTacticalState90(state);
      state = { ...state, ...patch };
      if (i === 0) after1 = state;
    }
    return { after1, after4: state };
  }

  it('retorna à disposição original após 4 rotações em grade square, preserva dimensões de props em 90° e não muta o estado original', () => {
    const initial = deepFreeze(buildSampleState('square'));
    const snapshotBefore = JSON.stringify(initial);

    const { after1, after4 } = apply4Rotations(initial);

    // Imutabilidade estrita do objeto original
    expect(JSON.stringify(initial)).toBe(snapshotBefore);

    // Após 1 rotação de 90°, prop retangular NÃO troca width/height (evita dupla rotação)
    expect(after1.mapImageWidth).toBe(600);
    expect(after1.mapImageHeight).toBe(800);
    expect(after1.mapRotation).toBe(90);
    expect(after1.props).toHaveLength(1);
    expect(after1.props![0].width).toBe(220);
    expect(after1.props![0].height).toBe(65);
    expect(after1.props![0].rotation).toBe(105);

    // Dimensões e rotação do mapa após 4x90°
    expect(after4.mapRotation).toBe(0);
    expect(after4.mapImageWidth).toBe(initial.mapImageWidth);
    expect(after4.mapImageHeight).toBe(initial.mapImageHeight);

    // Tokens: quantidade, igualdade estrita de coords/props não geométricas
    expect(after4.tokens).toHaveLength(initial.tokens.length);
    for (let i = 0; i < initial.tokens.length; i++) {
      expect(after4.tokens[i]).toEqual(initial.tokens[i]);
    }

    // lastTokenPositions: estrutura e valores exatos
    expect(Object.keys(after4.lastTokenPositions || {})).toEqual(Object.keys(initial.lastTokenPositions || {}));
    expect(after4.lastTokenPositions).toEqual(initial.lastTokenPositions);

    // Props: coordenadas com tolerância + propriedades não geométricas e dimensões com igualdade estrita
    expect(after4.props).toHaveLength(initial.props!.length);
    const origProp = initial.props![0];
    const finalProp = after4.props![0];
    expect(finalProp.x).toBeCloseTo(origProp.x, 5);
    expect(finalProp.y).toBeCloseTo(origProp.y, 5);
    expect(finalProp.id).toBe(origProp.id);
    expect(finalProp.name).toBe(origProp.name);
    expect(finalProp.type).toBe(origProp.type);
    expect(finalProp.width).toBe(origProp.width);
    expect(finalProp.height).toBe(origProp.height);
    expect(finalProp.rotation).toBe(origProp.rotation);
    expect(finalProp.locked).toBe(origProp.locked);
    expect(finalProp.layer).toBe(origProp.layer);
    expect(finalProp.opacity).toBe(origProp.opacity);

    // Notes: coordenadas com tolerância + dados textuais estritos
    expect(after4.notes).toHaveLength(initial.notes!.length);
    const origNote = initial.notes![0];
    const finalNote = after4.notes![0];
    expect(finalNote.x).toBeCloseTo(origNote.x, 5);
    expect(finalNote.y).toBeCloseTo(origNote.y, 5);
    expect(finalNote.id).toBe(origNote.id);
    expect(finalNote.title).toBe(origNote.title);
    expect(finalNote.content).toBe(origNote.content);
    expect(finalNote.color).toBe(origNote.color);

    // fogMask: base, quantidade, tipos e coordenadas de rect, circle e polygon
    expect(after4.fogMask?.base).toBe(initial.fogMask!.base);
    expect(after4.fogMask?.ops).toHaveLength(initial.fogMask!.ops.length);

    const [rectOrig, circleOrig, polyOrig] = initial.fogMask!.ops;
    const [rectFinal, circleFinal, polyFinal] = after4.fogMask!.ops;

    expect(rectFinal.shape).toBe('rect');
    expect(rectFinal.op).toBe(rectOrig.op);
    if (rectOrig.shape === 'rect' && rectFinal.shape === 'rect') {
      expect(rectFinal.x).toBeCloseTo(rectOrig.x, 5);
      expect(rectFinal.y).toBeCloseTo(rectOrig.y, 5);
      expect(rectFinal.width).toBe(rectOrig.width);
      expect(rectFinal.height).toBe(rectOrig.height);
    }

    expect(circleFinal.shape).toBe('circle');
    expect(circleFinal.op).toBe(circleOrig.op);
    if (circleOrig.shape === 'circle' && circleFinal.shape === 'circle') {
      expect(circleFinal.x).toBeCloseTo(circleOrig.x, 5);
      expect(circleFinal.y).toBeCloseTo(circleOrig.y, 5);
      expect(circleFinal.radius).toBe(circleOrig.radius);
    }

    expect(polyFinal.shape).toBe('polygon');
    expect(polyFinal.op).toBe(polyOrig.op);
    if (polyOrig.shape === 'polygon' && polyFinal.shape === 'polygon') {
      expect(polyFinal.points).toHaveLength(polyOrig.points.length);
      polyOrig.points.forEach((pt, idx) => {
        expect(polyFinal.points[idx].x).toBeCloseTo(pt.x, 5);
        expect(polyFinal.points[idx].y).toBeCloseTo(pt.y, 5);
      });
    }
  });

  it('retorna à disposição original após 4 rotações em grade hex sem perda de dados ou mutação do original', () => {
    const initial = deepFreeze(buildSampleState('hex'));
    const snapshotBefore = JSON.stringify(initial);

    const { after1, after4 } = apply4Rotations(initial);

    expect(JSON.stringify(initial)).toBe(snapshotBefore);
    expect(after1.props![0].width).toBe(220);
    expect(after1.props![0].height).toBe(65);
    expect(after4.mapRotation).toBe(0);
    expect(after4.mapImageWidth).toBe(initial.mapImageWidth);
    expect(after4.mapImageHeight).toBe(initial.mapImageHeight);

    // Tokens em grade hex: preserva identidade, atributos, rotação/facing e retorna próximo/exato ao hex original
    expect(after4.tokens).toHaveLength(initial.tokens.length);
    for (let i = 0; i < initial.tokens.length; i++) {
      const orig = initial.tokens[i];
      const fin = after4.tokens[i];
      expect(fin.id).toBe(orig.id);
      expect(fin.npcId).toBe(orig.npcId);
      expect(fin.rotation).toBe(orig.rotation);
      expect(fin.facing).toBe(orig.facing);
      expect(fin.elevation).toBe(orig.elevation);
      expect(fin.reach).toBe(orig.reach);
      expect(fin.size).toBe(orig.size);
      expect(fin.customName).toBe(orig.customName);
      expect(fin.hiddenFromPlayers).toBe(orig.hiddenFromPlayers);
      expect(fin.layer).toBe(orig.layer);
      // Em grade hexagonal, 4x90° converte via pixelToHex; distância residual máxima esperada é <= 1 hex
      expect(
        getHexDistance({ col: orig.gridX, row: orig.gridY }, { col: fin.gridX, row: fin.gridY })
      ).toBeLessThanOrEqual(1);
    }

    // lastTokenPositions preservado em estrutura e rotação/facing
    expect(Object.keys(after4.lastTokenPositions || {})).toEqual(Object.keys(initial.lastTokenPositions || {}));
    const origSaved = initial.lastTokenPositions!['npc-removed'];
    const finSaved = after4.lastTokenPositions!['npc-removed'];
    expect(finSaved.rotation).toBe(origSaved.rotation);
    expect(finSaved.facing).toBe(origSaved.facing);
    expect(
      getHexDistance({ col: origSaved.gridX, row: origSaved.gridY }, { col: finSaved.gridX, row: finSaved.gridY })
    ).toBeLessThanOrEqual(1);

    // Props, notes e fogMask em pixels são exatamente reversíveis após 4x90°
    expect(after4.props![0].x).toBeCloseTo(initial.props![0].x, 5);
    expect(after4.props![0].y).toBeCloseTo(initial.props![0].y, 5);
    expect(after4.props![0].width).toBe(initial.props![0].width);
    expect(after4.props![0].height).toBe(initial.props![0].height);
    expect(after4.notes![0].x).toBeCloseTo(initial.notes![0].x, 5);
    expect(after4.notes![0].y).toBeCloseTo(initial.notes![0].y, 5);
    expect(after4.fogMask?.ops).toHaveLength(initial.fogMask!.ops.length);
  });
});
