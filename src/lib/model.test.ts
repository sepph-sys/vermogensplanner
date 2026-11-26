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
