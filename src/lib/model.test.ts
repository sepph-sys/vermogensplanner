import { describe, expect, it } from 'vitest';
import { createSampleState, hydrateState, runModel } from './model';

describe('eenmalige stortingen per bestemming', () => {
  it('een spaarstorting telt alleen mee bij sparen', () => {
    const base = createSampleState();
    const date = `${Number(base.period.startDate.slice(0, 4)) + 2}-01-01`;
    const withDep = { ...base, savings: { ...base.savings, deposits: [{ id: 's1', date, amount: 2500 }] } };
    const a = runModel(base);
    const b = runModel(withDep);
    expect(b.savings.totalContributed - a.savings.totalContributed).toBeCloseTo(2500, 9);
    expect(b.invest.totalContributed).toBeCloseTo(a.invest.totalContributed, 9);
  });

  it('oude opgeslagen state zonder spaarstortingen krijgt een lege lijst', () => {
    const { savings, ...rest } = createSampleState();
    const { deposits: _omit, ...oldSavings } = savings;
    void _omit;
    expect(hydrateState({ ...rest, savings: oldSavings }).savings.deposits).toEqual([]);
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
    expect(b.savings.finalBalance).toBeCloseTo(a.savings.finalBalance, 6); // spaarrente ongewijzigd
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

  it('indexatie "gelijk aan inflatie" volgt de inflatie per jaar', () => {
    const base = createSampleState();
    const s = {
      ...base,
      period: { startDate: '2030-01-01', endDate: '2033-01-01' },
      budget: { ...base.budget, indexEnabled: true, indexFollowsInflation: true },
      assumptions: { ...base.assumptions, inflation: 2, years: [{ id: 'x', year: 2031, annualReturn: null, savingsRate: null, inflation: 10 }] },
    };
    // maandinleg 700 → ×1,02 (2030) → ×1,10 (2031)
    expect(runModel(s).invest.finalMonthly).toBeCloseTo(700 * 1.02 * 1.1, 9);
  });

  it('zet oude opslag (waarden per module) om naar één set aannames', () => {
    const old = {
      invest: { initial: 1, monthly: 2, annualReturn: 6, inflation: 3, deposits: [] },
      savings: { initial: 3, monthly: 4, annualRate: 1.5, inflation: 3, deposits: [] },
    };
    const h = hydrateState(old);
    expect(h.assumptions).toEqual({ annualReturn: 6, savingsRate: 1.5, inflation: 3, years: [] });
    expect(h.invest).toEqual({ initial: 1, monthly: 2, deposits: [] });
  });
});
