import { describe, it, expect } from 'vitest';
import {
  normalizeLocationKey,
  migrateArmorLocations,
  calculateLocationDamage,
  getHpStatus,
  getFpStatus,
} from '../gurps';
import type { BodyArmorLocation } from '../../types/rpg';

describe('gurps.ts — normalizeLocationKey & migrateArmorLocations', () => {
  it('normaliza corretamente aliases em português e inglês', () => {
    expect(normalizeLocationKey('Head')).toBe('head');
    expect(normalizeLocationKey('Crânio')).toBe('head');
    expect(normalizeLocationKey('Cabeça')).toBe('head');
    expect(normalizeLocationKey('Eye')).toBe('eye');
    expect(normalizeLocationKey('Olhos')).toBe('eye');
    expect(normalizeLocationKey('Neck')).toBe('neck');
    expect(normalizeLocationKey('Pescoço')).toBe('neck');
    expect(normalizeLocationKey('Torso')).toBe('torso');
    expect(normalizeLocationKey('Tronco')).toBe('torso');
    expect(normalizeLocationKey('Vitais')).toBe('vitals');
    expect(normalizeLocationKey('Órgãos Vitais')).toBe('vitals');
    expect(normalizeLocationKey('Virilha')).toBe('groin');
    expect(normalizeLocationKey('Braço Esquerdo')).toBe('left_arm');
    expect(normalizeLocationKey('Antebraço Direito')).toBe('right_forearm');
    expect(normalizeLocationKey('Mão Esquerda')).toBe('left_hand');
    expect(normalizeLocationKey('Canela Direita')).toBe('right_shins');
  });

  it('regressão: "Perna Esquerda" e "Perna Direita" não caem como pé', () => {
    expect(normalizeLocationKey('Perna Esquerda')).toBe('left_leg');
    expect(normalizeLocationKey('Perna Direita')).toBe('right_leg');
    expect(normalizeLocationKey('Perna')).toBe('leg');
    expect(normalizeLocationKey('Pé Esquerdo')).toBe('left_foot');
    expect(normalizeLocationKey('Pé Direito')).toBe('right_foot');
    expect(normalizeLocationKey('Pe Esquerdo')).toBe('left_foot');
    expect(normalizeLocationKey('Pes')).toBe('feet');
  });

  it('migra localizações legadas (leg, arm, hand, feet) para esquerda/direita e preserva "Perna Esquerda"', () => {
    const legacyLocations: BodyArmorLocation[] = [
      {
        id: 'leg-1',
        location: 'Leg',
        armorName: 'Grevas de Couro',
        dr: 3,
        drModifier: -1,
        modifierDamageType: 'contusao',
      },
      {
        id: 'hand-1',
        location: 'Hand',
        armorName: 'Manoplas',
        dr: 4,
      },
      {
        id: 'feet-1',
        location: 'Feet',
        armorName: 'Botas Pesadas',
        dr: 2,
      },
    ];

    const migrated = migrateArmorLocations(legacyLocations, 'npc-1');
    const leftLeg = migrated.find((l) => l.location === 'Left Leg');
    const rightLeg = migrated.find((l) => l.location === 'Right Leg');
    const leftHand = migrated.find((l) => l.location === 'Left Hand');
    const rightFoot = migrated.find((l) => l.location === 'Right Foot');

    expect(leftLeg?.armorName).toBe('Grevas de Couro');
    expect(leftLeg?.dr).toBe(3);
    expect(rightLeg?.armorName).toBe('Grevas de Couro');
    expect(rightLeg?.dr).toBe(3);
    expect(leftHand?.armorName).toBe('Manoplas');
    expect(leftHand?.dr).toBe(4);
    expect(rightFoot?.armorName).toBe('Botas Pesadas');
    expect(rightFoot?.dr).toBe(2);

    // Regressão direta com rótulo em PT-BR "Perna Esquerda"
    const ptBrLocations: BodyArmorLocation[] = [
      {
        id: 'pt-leg-l',
        location: 'Perna Esquerda',
        armorName: 'Calça Reforçada',
        dr: 5,
      },
    ];
    const migratedPt = migrateArmorLocations(ptBrLocations, 'npc-2');
    const migratedLeftLeg = migratedPt.find((l) => normalizeLocationKey(l.location) === 'left_leg');
    const migratedLeftFoot = migratedPt.find((l) => normalizeLocationKey(l.location) === 'left_foot');

    expect(migratedLeftLeg?.armorName).toBe('Calça Reforçada');
    expect(migratedLeftLeg?.dr).toBe(5);
    expect(migratedLeftFoot?.dr).toBe(0);
  });
});

describe('gurps.ts — calculateLocationDamage', () => {
  it('empilha RD de armadura, modificador aplicável, RD natural e bônus de local (Head +2 RD / x4)', () => {
    const res = calculateLocationDamage({
      locationName: 'Head',
      damageType: 'contusao',
      rawDamage: 12,
      baseArmorDr: 4,
      armorDrModifier: -1,
      naturalDr: 1,
      appliesArmorModifier: true,
      bypassDr: false,
    });

    // armadura efetiva = 4 - 1 = 3; natural = 1; crânio = +2 => totalDr = 6
    expect(res.armorDr).toBe(3);
    expect(res.naturalDr).toBe(1);
    expect(res.locationBonusDr).toBe(2);
    expect(res.totalDr).toBe(6);
    expect(res.penetratingDamage).toBe(6);
    expect(res.woundMultiplier).toBe(4.0);
    expect(res.finalDamage).toBe(24);
  });

  it('ignora toda RD quando bypassDr é true', () => {
    const res = calculateLocationDamage({
      locationName: 'Head',
      damageType: 'corte',
      rawDamage: 10,
      baseArmorDr: 6,
      armorDrModifier: 0,
      naturalDr: 2,
      appliesArmorModifier: false,
      bypassDr: true,
    });

    expect(res.totalDr).toBe(0);
    expect(res.penetratingDamage).toBe(10);
    expect(res.woundMultiplier).toBe(4.0);
    expect(res.finalDamage).toBe(40);
  });

  it('aplica multiplicadores específicos de Pescoço, Vitais, Olho e Membros (com cap de PV)', () => {
    // Pescoço: contusão -> 1.5, corte -> 2.0
    const neckCrush = calculateLocationDamage({
      locationName: 'Neck',
      damageType: 'contusao',
      rawDamage: 10,
      baseArmorDr: 0,
      armorDrModifier: 0,
      naturalDr: 0,
      appliesArmorModifier: false,
      bypassDr: false,
    });
    expect(neckCrush.woundMultiplier).toBe(1.5);
    expect(neckCrush.finalDamage).toBe(15);

    const neckCut = calculateLocationDamage({
      locationName: 'Pescoço',
      damageType: 'corte',
      rawDamage: 10,
      baseArmorDr: 0,
      armorDrModifier: 0,
      naturalDr: 0,
      appliesArmorModifier: false,
      bypassDr: false,
    });
    expect(neckCut.woundMultiplier).toBe(2.0);
    expect(neckCut.finalDamage).toBe(20);

    // Vitais: empalamento/perfurante -> x3
    const vitalsImp = calculateLocationDamage({
      locationName: 'Vitais',
      damageType: 'empalamento',
      rawDamage: 8,
      baseArmorDr: 2,
      armorDrModifier: 0,
      naturalDr: 0,
      appliesArmorModifier: false,
      bypassDr: false,
    });
    expect(vitalsImp.penetratingDamage).toBe(6);
    expect(vitalsImp.woundMultiplier).toBe(3.0);
    expect(vitalsImp.finalDamage).toBe(18);

    // Olho: x4 e alerta de confirmação para tipos não permitidos (ex: contusao)
    const eyeCrush = calculateLocationDamage({
      locationName: 'Eye',
      damageType: 'contusao',
      rawDamage: 5,
      baseArmorDr: 0,
      armorDrModifier: 0,
      naturalDr: 0,
      appliesArmorModifier: false,
      bypassDr: false,
    });
    expect(eyeCrush.woundMultiplier).toBe(4.0);
    expect(eyeCrush.requiresEyeConfirmation).toBe(true);
    expect(eyeCrush.finalDamage).toBe(20);

    // Membro: empalamento vira x1 e dano aos PV do personagem é limitado ao PV do membro
    // hpMax = 12 => Left Arm partHp = floor(12 / 2) + 1 = 7
    const armImp = calculateLocationDamage({
      locationName: 'Left Arm',
      damageType: 'empalamento',
      rawDamage: 15,
      baseArmorDr: 0,
      armorDrModifier: 0,
      naturalDr: 0,
      appliesArmorModifier: false,
      bypassDr: false,
      hpMax: 12,
    });
    expect(armImp.woundMultiplier).toBe(1.0);
    expect(armImp.partHp).toBe(7);
    expect(armImp.bodyPartDamage).toBe(15);
    expect(armImp.finalDamage).toBe(7);
    expect(armImp.isDamageCapped).toBe(true);
  });

  it('trata damageType com variações de maiúsculas, minúsculas e espaços', () => {
    const cutSpaces = calculateLocationDamage({
      locationName: 'Torso',
      damageType: '  CoRtE  ',
      rawDamage: 10,
      baseArmorDr: 0,
      armorDrModifier: 0,
      naturalDr: 0,
      appliesArmorModifier: false,
      bypassDr: false,
    });
    expect(cutSpaces.woundMultiplier).toBe(1.5);
    expect(cutSpaces.finalDamage).toBe(15);

    const impUpper = calculateLocationDamage({
      locationName: 'Vitals',
      damageType: '  IMPALING ',
      rawDamage: 6,
      baseArmorDr: 0,
      armorDrModifier: 0,
      naturalDr: 0,
      appliesArmorModifier: false,
      bypassDr: false,
    });
    expect(impUpper.woundMultiplier).toBe(3.0);
    expect(impUpper.finalDamage).toBe(18);
  });

  it('retorna dano 0 quando rawDamage <= 0', () => {
    for (const rawDamage of [0, -5]) {
      const res = calculateLocationDamage({
        locationName: 'Torso',
        damageType: 'corte',
        rawDamage,
        baseArmorDr: 0,
        armorDrModifier: 0,
        naturalDr: 0,
        appliesArmorModifier: false,
        bypassDr: false,
      });
      expect(res.penetratingDamage).toBe(0);
      expect(res.finalDamage).toBe(0);
      expect(res.bodyPartDamage).toBe(0);
    }
  });
});

describe('gurps.ts — getHpStatus & getFpStatus', () => {
  it('classifica corretamente todos os patamares padrão de HP', () => {
    // max = 12 => ceil(12/3) = 4
    expect(getHpStatus(12, 12).label).toBe('Saudável (100%)');
    expect(getHpStatus(12, 12).warningTexts).toEqual([]);

    expect(getHpStatus(8, 12).label).toBe('Ferido');
    expect(getHpStatus(4, 12).label).toBe('Ferido');

    expect(getHpStatus(3, 12).label).toBe('Gravemente Ferido (< 1/3)');
    expect(getHpStatus(3, 12).warningTexts).toContain('Move e Esquiva pela metade!');

    expect(getHpStatus(0, 12).label).toBe('Colapso (<= 0)');
    expect(getHpStatus(0, 12).warningTexts).toContain('Teste HT por turno para não desmaiar');

    expect(getHpStatus(-12, 12).label).toBe('Risco de Morte (-1x Máx)');
    expect(getHpStatus(-12, 12).warningTexts).toContain('Teste de morte (HT) a cada múltiplo');

    expect(getHpStatus(-60, 12).label).toBe('Morto (-5x Máx)');
    expect(getHpStatus(-60, 12).warningTexts).toContain('Morte instantânea (-5x Máx)');
  });

  it('classifica corretamente todos os patamares padrão de FP', () => {
    // max = 12 => ceil(12/3) = 4
    expect(getFpStatus(12, 12).label).toBe('Descansado');
    expect(getFpStatus(8, 12).label).toBe('Cansado');
    expect(getFpStatus(3, 12).label).toBe('Muito Exausto (< 1/3)');
    expect(getFpStatus(0, 12).label).toBe('Colapsando (0)');
    expect(getFpStatus(-12, 12).label).toBe('Inconsciente (Exaustão)');
  });

  it('regressão: retorna estado neutro "Não configurado" quando max <= 0 ou NaN', () => {
    for (const invalidMax of [0, -10, Number.NaN]) {
      const hp = getHpStatus(0, invalidMax);
      expect(hp.label).toBe('Não configurado');
      expect(hp.warningTexts).toEqual([]);
      expect(hp.warningText).toBeUndefined();

      const fp = getFpStatus(0, invalidMax);
      expect(fp.label).toBe('Não configurado');
      expect(fp.warningTexts).toEqual([]);
      expect(fp.warningText).toBeUndefined();
    }
  });
});
