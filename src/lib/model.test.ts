import { describe, expect, it } from 'vitest';
import { createSampleState, hydrateState, runModel } from './model';
import type { Contribution } from './contributions';

const once = (p: Partial<Contribution>): Contribution => ({
  id: 'o',
  target: 'savings',
  frequency: 'once',
  date: '2030-01-01',
  endDate: null,
  amount: 0,
  index: 'none',
  indexRate: 0,
  ...p,
});

describe('inlegregels in het model', () => {
  it('een spaarstorting telt alleen mee bij sparen', () => {
    const base = createSampleState();
    const date = `${Number(base.period.startDate.slice(0, 4)) + 2}-01-01`;
    const withDep = { ...base, contributions: [...base.contributions, once({ id: 's1', date, amount: 2500 })] };
    const a = runModel(base);
    const b = runModel(withDep);
    expect(b.savings.totalContributed - a.savings.totalContributed).toBeCloseTo(2500, 9);
    expect(b.invest.totalContributed).toBeCloseTo(a.invest.totalContributed, 9);
  });

  it('voorbeeld: 700 + 300 per maand en twee eenmalige beleggingen', () => {
    const m = runModel(createSampleState());
    expect(m.monthlyInvest).toBeCloseTo(700, 9);
    expect(m.monthlySavings).toBeCloseTo(300, 9);
    expect(m.invest.totalContributed).toBeCloseTo(10000 + 700 * 360 + 25000, 6);
  });

  it('+10% inleg verhoogt alleen periodieke inleg', () => {
    const s = createSampleState();
    const m = runModel(s, { monthlyFactor: 1.1 });
    expect(m.invest.totalContributed).toBeCloseTo(10000 + 770 * 360 + 25000, 6);
  });
});

describe('één bron voor rendement, rente en inflatie', () => {
  it('jaarwaarden overschrijven de generieke waarde alleen in dat jaar', () => {
    const base = createSampleState();
    const y = Number(base.period.startDate.slice(0, 4)) + 3;
    const s = { ...base, assumptions: { ...base.assumptions, years: [{ id: 'x', year: y, annualReturn: -20, savingsRate: null, inflation: null }] } };
    const a = runModel({ ...base, box3: { ...base.box3, enabled: false } });
    const b = runModel({ ...s, box3: { ...s.box3, enabled: false } });
    expect(b.invest.finalBalance).toBeLessThan(a.invest.finalBalance);
    expect(b.savings.finalBalance).toBeCloseTo(a.savings.finalBalance, 6);
  });

  it('inflatie per jaar bepaalt de prijsindex', () => {
    const base = createSampleState();
    const s = {
      ...base,
      period: { startDate: '2030-01-01', endDate: '2032-01-01' },
      assumptions: { ...base.assumptions, inflation: 2, years: [{ id: 'x', year: 2031, annualReturn: null, savingsRate: null, inflation: 10 }] },
    };
    expect(runModel(s).invest.priceIndex).toBeCloseTo(1.02 * 1.1, 9);
  });

  it('indexatie "inflatie" van een regel volgt de inflatie per jaar', () => {
    const base = createSampleState();
    const s = {
      ...base,
      period: { startDate: '2030-01-01', endDate: '2033-01-01' },
      contributions: [{ ...base.contributions[0], date: '2030-01-01', index: 'inflation' as const }],
      assumptions: { ...base.assumptions, inflation: 2, years: [{ id: 'x', year: 2031, annualReturn: null, savingsRate: null, inflation: 10 }] },
    };
    expect(runModel(s).lastMonthlyInvest).toBeCloseTo(700 * 1.02 * 1.1, 9);
  });
});

describe('omzetten van oude opslag', () => {
  it('waarden per module → één set aannames; budget → maandelijkse regels', () => {
    const old = {
      period: { startDate: '2027-01-01', endDate: '2037-01-01' },
      budget: { amount: 1000, investShare: 60, autoSplit: true, indexEnabled: true, indexFollowsInflation: true, indexRate: 2 },
      invest: { initial: 1, monthly: 2, annualReturn: 6, inflation: 3, deposits: [{ id: 'b', date: '2029-01-01', amount: 5000, label: 'Bonus' }] },
      savings: { initial: 3, monthly: 4, annualRate: 1.5, inflation: 3 },
    };
    const h = hydrateState(old);
    expect(h.assumptions).toEqual({ annualReturn: 6, savingsRate: 1.5, inflation: 3, years: [] });
    expect(h.invest).toEqual({ initial: 1 });
    const monthly = h.contributions.filter((c) => c.frequency === 'monthly');
    expect(monthly.map((c) => [c.target, c.amount, c.index, c.date])).toEqual([
      ['invest', 600, 'inflation', '2027-01-01'],
      ['savings', 400, 'inflation', '2027-01-01'],
    ]);
    expect(h.contributions.find((c) => c.frequency === 'once')).toMatchObject({ target: 'invest', amount: 5000, label: 'Bonus' });
  });

  it('handmatige maandinleg (zonder automatisch verdelen) wordt overgenomen', () => {
    const h = hydrateState({ budget: { autoSplit: false }, invest: { initial: 0, monthly: 250 }, savings: { initial: 0, monthly: 50 } });
    expect(h.contributions.map((c) => c.amount)).toEqual([250, 50]);
  });
});
