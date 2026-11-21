import { describe, it, expect } from 'vitest';
import { parseArmorDr, doesArmorFitLocation, LOW_TECH_TRUNK_ARMORS } from '../armorCatalog';

describe('armorCatalog.ts — parseArmorDr', () => {
  it('interpreta RD simples (números, flexível *, frontal F)', () => {
    const simple = parseArmorDr({ dr: '6' });
    expect(simple.baseDr).toBe(6);
    expect(simple.drModifiers).toEqual([]);

    const flex = parseArmorDr({ dr: '2*' });
    expect(flex.baseDr).toBe(2);
    expect(flex.drModifiers).toEqual([]);

    const front = parseArmorDr({ dr: '4F' });
    expect(front.baseDr).toBe(4);
    expect(front.drModifiers).toEqual([]);
  });

  it('interpreta split DR padrão GURPS como "5/3*" (malha: -2 vs contusão)', () => {
    const mail = parseArmorDr({ dr: '5/3*' });
    expect(mail.baseDr).toBe(5);
    expect(mail.drModifiers).toEqual([{ drModifier: -2, modifierDamageType: 'contusao' }]);
    expect(mail.summary).toContain('RD Base: 5');
    expect(mail.summary).toContain('-2 vs Contusão');
  });

  it('interpreta split DR balístico / frag vest (maior contra corte e perfurante)', () => {
    const ballistic = parseArmorDr({
      dr: '12/5*',
      notes: 'Split DR: higher DR applies against piercing and cutting attacks.',
    });
    expect(ballistic.baseDr).toBe(5);
    expect(ballistic.drModifiers).toEqual([
      { drModifier: 7, modifierDamageType: 'corte' },
      { drModifier: 7, modifierDamageType: 'perfurante' },
    ]);
  });

  it('interpreta modificadores textuais em notas PT/EN e proteção apenas contra fogo/corrosão (NBC)', () => {
    const scale = parseArmorDr({
      dr: '4',
      notes: '-1 RD vs contusão',
    });
    expect(scale.baseDr).toBe(4);
    expect(scale.drModifiers).toEqual([{ drModifier: -1, modifierDamageType: 'contusao' }]);

    const nbc = parseArmorDr({
      dr: '3',
      notes: 'DR applies only against burning or corrosion.',
    });
    expect(nbc.baseDr).toBe(0);
    expect(nbc.drModifiers).toEqual([{ drModifier: 3, modifierDamageType: 'queima' }]);
  });
});

describe('armorCatalog.ts — doesArmorFitLocation', () => {
  it('regressão: aceita "Tronco / Qualquer" (LOW_TECH_TRUNK_ARMORS) em qualquer parte do corpo', () => {
    const locations = ['Torso', 'Vitals', 'Head', 'Left Arm', 'Right Leg', 'Left Hand', 'Right Foot'];
    for (const loc of locations) {
      expect(doesArmorFitLocation('Tronco / Qualquer', loc)).toBe(true);
    }

    // Garante que todos os itens prioritários de LOW_TECH_TRUNK_ARMORS encaixam no Torso e em membros
    expect(LOW_TECH_TRUNK_ARMORS.length).toBeGreaterThan(0);
    for (const item of LOW_TECH_TRUNK_ARMORS) {
      expect(doesArmorFitLocation(item.location, 'Torso')).toBe(true);
      expect(doesArmorFitLocation(item.location, 'Left Leg')).toBe(true);
    }
  });

  it('respeita cobertura específica e bloqueia combinações incompatíveis', () => {
    expect(doesArmorFitLocation('all', 'Eye')).toBe(true);
    expect(doesArmorFitLocation('Full Suit', 'Left Foot')).toBe(true);
    expect(doesArmorFitLocation('body, limbs', 'Torso')).toBe(true);
    expect(doesArmorFitLocation('body, limbs', 'Head')).toBe(false);

    expect(doesArmorFitLocation('skull', 'Head')).toBe(true);
    expect(doesArmorFitLocation('skull', 'Left Foot')).toBe(false);

    expect(doesArmorFitLocation('boots', 'Right Foot')).toBe(true);
    expect(doesArmorFitLocation('boots', 'Torso')).toBe(false);
  });
});
