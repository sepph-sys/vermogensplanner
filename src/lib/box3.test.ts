import { describe, expect, it } from 'vitest';
import { box3Tax, createDefaultBox3, periodForYear, type Box3Config } from './box3';
import { simulatePlan } from './finance';

const cfg = (patch: Partial<Box3Config> = {}): Box3Config => ({ ...createDefaultBox3(), counterEvidence: false, ...patch });
const year = (y: number, savings: number, invest: number, actual = { savings: 0, invest: 0 }, months = 12) => ({
  year: y,
  months,
  peil: { savings, invest },
  actual,
});

describe('periodForYear', () => {
  it('kiest de laatste periode met fromYear ≤ jaar', () => {
    const p = createDefaultBox3().periods;
    expect(periodForYear(p, 2025)?.fromYear).toBe(2026); // vóór de eerste → eerste
    expect(periodForYear(p, 2027)?.fromYear).toBe(2027);
    expect(periodForYear(p, 2045)?.system).toBe('werkelijk');
  });
});

describe('forfaitair stelsel (2026)', () => {
  it('rekent fictief rendement × grondslag/vermogen × tarief', () => {
    // 100.000 spaargeld: fictief 1.280; grondslag 40.643; voordeel 520,23; belasting 187,28
    const r = box3Tax(cfg(), year(2026, 100000, 0), 0)!;
    expect(r.taxable).toBeCloseTo(1280 * (40643 / 100000), 6);
    expect(r.tax).toBeCloseTo(1280 * 0.40643 * 0.36, 6);
    expect(r.split.savings).toBeCloseTo(r.tax, 9);
  });

  it('verdubbelt het heffingsvrij vermogen voor fiscale partners', () => {
    expect(box3Tax(cfg({ persons: 2 }), year(2026, 100000, 0), 0)!.tax).toBe(0);
  });

  it('belast een deeljaar naar rato', () => {
    const full = box3Tax(cfg(), year(2026, 50000, 100000), 0)!.tax;
    const part = box3Tax(cfg(), year(2026, 50000, 100000, undefined, 3), 0)!.tax;
    expect(part).toBeCloseTo(full / 4, 9);
  });

  it('tegenbewijs: lager werkelijk rendement vervangt het forfait', () => {
    const c = cfg({ counterEvidence: true });
    const r = box3Tax(c, year(2026, 0, 200000, { savings: 0, invest: 2000 }), 0)!;
    expect(r.counterEvidenceUsed).toBe(true);
    expect(r.tax).toBeCloseTo(2000 * ((200000 - 59357) / 200000) * 0.36, 6);
  });
});

describe('werkelijk rendement (2028)', () => {
  it('belast resultaat boven het heffingsvrij resultaat', () => {
    const r = box3Tax(cfg(), year(2028, 0, 0, { savings: 1000, invest: 9000 }), 0)!;
    expect(r.tax).toBeCloseTo((10000 - 1800) * 0.36, 9);
    expect(r.split.invest).toBeCloseTo(r.tax * 0.9, 9);
  });

  it('verlies boven de drempel wordt vooruit gewenteld en verrekend', () => {
    const loss = box3Tax(cfg(), year(2028, 0, 0, { savings: 0, invest: -3000 }), 0)!;
    expect(loss.tax).toBe(0);
    expect(loss.lossCarry).toBe(2500);
    const next = box3Tax(cfg(), year(2029, 0, 0, { savings: 0, invest: 5000 }), loss.lossCarry)!;
    expect(next.taxable).toBeCloseTo(5000 - 1800 - 2500, 9);
    expect(next.lossCarry).toBe(0);
  });
});

describe('simulatePlan met box 3', () => {
  const savings = { kind: 'savings' as const, initial: 100000, monthly: 0, annualRate: 0, inflation: 0 };
  const none = { kind: 'invest' as const, initial: 0, monthly: 0, annualRate: 0, inflation: 0 };

  it('trekt de jaarlijkse aanslag af van het saldo', () => {
    const r = simulatePlan('2027-01-01', '2028-01-01', none, savings, cfg());
    const expected = 1280 * ((100000 - 60098) / 100000) * 0.36;
    expect(r.taxYears).toHaveLength(1);
    expect(r.savings.taxPaid).toBeCloseTo(expected, 6);
    expect(r.savings.finalBalance).toBeCloseTo(100000 - expected, 6);
  });

  it('met tegenbewijs en 0% rente is er geen belasting', () => {
    const r = simulatePlan('2027-01-01', '2028-01-01', none, savings, cfg({ counterEvidence: true }));
    expect(r.savings.taxPaid).toBe(0);
  });

  it('zonder box 3 blijft het resultaat ongewijzigd', () => {
    const r = simulatePlan('2027-01-01', '2037-01-01', { ...none, initial: 50000, annualRate: 7 }, savings);
    expect(r.taxYears).toHaveLength(0);
    expect(r.invest.finalBalance).toBeCloseTo(50000 * Math.pow(1.07, 10), 6);
  });
});
