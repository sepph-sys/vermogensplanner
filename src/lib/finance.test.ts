import { describe, expect, it } from 'vitest';
import { futureValueClosedForm, inflationFactor, monthlyRate, simulate } from './finance';
import { addMonths, monthDiff } from './dates';
import { parseUserNumber } from './format';

describe('monthlyRate', () => {
  it('12 maanden groei is exact het jaarrendement', () => {
    expect(Math.pow(1 + monthlyRate(7), 12)).toBeCloseTo(1.07, 12);
  });
});

describe('simulate', () => {
  const base = { startDate: '2027-01-01', endDate: '2057-01-01', inflation: 2 };

  it('komt overeen met de gesloten annuïteitenformule', () => {
    const r = simulate({ ...base, initial: 10000, monthly: 500, annualRate: 7 });
    expect(r.months).toBe(360);
    expect(r.finalBalance).toBeCloseTo(futureValueClosedForm(10000, 500, 7, 360), 6);
    expect(r.totalContributed).toBe(10000 + 500 * 360);
  });

  it('zonder rente is eindwaarde gelijk aan inleg', () => {
    const r = simulate({ ...base, initial: 1000, monthly: 100, annualRate: 0 });
    expect(r.finalBalance).toBeCloseTo(1000 + 100 * 360, 8);
    expect(r.totalGrowth).toBeCloseTo(0, 8);
  });

  it('eenmalige startinleg groeit met (1+R)^jaren', () => {
    const r = simulate({ ...base, endDate: '2037-01-01', initial: 1000, monthly: 0, annualRate: 5 });
    expect(r.finalBalance).toBeCloseTo(1000 * Math.pow(1.05, 10), 8);
  });

  it('extra storting groeit vanaf de maand waarin hij valt', () => {
    const r = simulate({
      ...base,
      endDate: '2029-01-01',
      initial: 0,
      monthly: 0,
      annualRate: 6,
      deposits: [{ id: 'x', date: '2028-01-01', amount: 1000 }],
    });
    expect(r.finalBalance).toBeCloseTo(1060, 8);
  });

  it('negeert stortingen buiten de looptijd', () => {
    const r = simulate({
      ...base,
      initial: 0,
      monthly: 0,
      annualRate: 5,
      deposits: [
        { id: 'a', date: '2026-12-31', amount: 100 },
        { id: 'b', date: '2057-01-01', amount: 100 },
      ],
    });
    expect(r.totalContributed).toBe(0);
    expect(r.ignoredDeposits).toHaveLength(2);
  });

  it('indexeert de maandinleg jaarlijks op de verjaardag van de start', () => {
    const r = simulate({ ...base, endDate: '2030-01-01', initial: 0, monthly: 100, annualRate: 0, indexation: 10 });
    expect(r.totalContributed).toBeCloseTo(12 * 100 + 12 * 110 + 12 * 121, 8);
    expect(r.finalMonthly).toBeCloseTo(121, 8);
  });

  it('indexatie 0% is gelijk aan een vaste inleg', () => {
    const a = simulate({ ...base, initial: 500, monthly: 250, annualRate: 6 });
    const b = simulate({ ...base, initial: 500, monthly: 250, annualRate: 6, indexation: 0 });
    expect(b.finalBalance).toBe(a.finalBalance);
  });

  it('reële waarde is nominaal gedeeld door de inflatiefactor', () => {
    const r = simulate({ ...base, initial: 1000, monthly: 0, annualRate: 0 });
    expect(r.realFinal).toBeCloseTo(1000 / Math.pow(1.02, 30), 8);
    expect(inflationFactor(2, 12)).toBeCloseTo(1.02, 12);
  });
});

describe('dates', () => {
  it('monthDiff telt volledige maanden', () => {
    expect(monthDiff('2027-01-15', '2027-03-14')).toBe(1);
    expect(monthDiff('2027-01-15', '2027-03-15')).toBe(2);
  });
  it('addMonths kapt af op einde maand', () => {
    expect(addMonths('2027-01-31', 1)).toBe('2027-02-28');
  });
});

describe('parseUserNumber', () => {
  it('ondersteunt NL- en internationale notatie', () => {
    expect(parseUserNumber('10.000')).toBe(10000);
    expect(parseUserNumber('1.234,5')).toBe(1234.5);
    expect(parseUserNumber('7,5')).toBe(7.5);
    expect(parseUserNumber('7.5')).toBe(7.5);
    expect(parseUserNumber('€ 250')).toBe(250);
    expect(parseUserNumber('abc')).toBeNull();
  });
});

import { formatDMY, parseUserDate } from './dates';

describe('parseUserDate', () => {
  it('herkent dd/mm/jjjj, mm/dd/jjjj en jjjj/mm/dd', () => {
    expect(parseUserDate('25/11/2026')).toBe('2026-11-25');
    expect(parseUserDate('12/31/2030')).toBe('2030-12-31'); // alleen mm/dd mogelijk
    expect(parseUserDate('2030/12/31')).toBe('2030-12-31');
    expect(parseUserDate('5-3-2031')).toBe('2031-03-05'); // ambigu → dd/mm
    expect(parseUserDate('1.12.2026')).toBe('2026-12-01');
  });
  it('probeert zonder scheidingstekens dd/mm/jjjj', () => {
    expect(parseUserDate('25112026')).toBe('2026-11-25');
    expect(parseUserDate('011227')).toBe('2027-12-01');
    expect(parseUserDate('20301231')).toBe('2030-12-31'); // laatste poging jjjjmmdd
  });
  it('weigert ongeldige datums', () => {
    expect(parseUserDate('31/02/2027')).toBeNull();
    expect(parseUserDate('13/13/2027')).toBeNull();
    expect(parseUserDate('abc')).toBeNull();
    expect(parseUserDate('2027')).toBeNull();
    expect(parseUserDate('')).toBeNull();
  });
  it('toont altijd dd/mm/jjjj', () => {
    expect(formatDMY('2026-12-01')).toBe('01/12/2026');
  });
});
