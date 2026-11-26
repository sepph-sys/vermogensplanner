import { describe, expect, it } from 'vitest';
import { averageMonthly, buildSchedule, monthlyEquivalent, type Contribution } from './contributions';

const c = (p: Partial<Contribution>): Contribution => ({
  id: 'x',
  target: 'invest',
  frequency: 'monthly',
  date: '2027-01-01',
  endDate: null,
  amount: 100,
  index: 'none',
  indexRate: 0,
  ...p,
});
const infl = () => 2;
const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);

describe('buildSchedule', () => {
  it('maandelijks: elke maand vanaf de startdatum', () => {
    const s = buildSchedule([c({})], 'invest', '2027-01-01', 24, infl);
    expect(s.recurring.every((v) => v === 100)).toBe(true);
  });

  it('per kwartaal en per jaar', () => {
    const q = buildSchedule([c({ frequency: 'quarterly' })], 'invest', '2027-01-01', 12, infl).recurring;
    expect(q.map((v, i) => (v ? i : -1)).filter((i) => i >= 0)).toEqual([0, 3, 6, 9]);
    const y = buildSchedule([c({ frequency: 'yearly', date: '2027-03-01' })], 'invest', '2027-01-01', 36, infl).recurring;
    expect(y.map((v, i) => (v ? i : -1)).filter((i) => i >= 0)).toEqual([2, 14, 26]);
  });

  it('dagelijks: bedrag × kalenderdagen per maand', () => {
    const s = buildSchedule([c({ frequency: 'daily', amount: 10 })], 'invest', '2027-01-01', 2, infl).recurring;
    expect(s).toEqual([310, 280]);
  });

  it('respecteert startdatum later in de looptijd en einddatum (t/m)', () => {
    const s = buildSchedule([c({ date: '2027-04-01', endDate: '2027-06-15' })], 'invest', '2027-01-01', 12, infl).recurring;
    expect(s.map((v, i) => (v ? i : -1)).filter((i) => i >= 0)).toEqual([3, 4, 5]);
    const d = buildSchedule([c({ frequency: 'daily', amount: 1, date: '2027-01-10', endDate: '2027-01-19' })], 'invest', '2027-01-01', 1, infl).recurring;
    expect(d[0]).toBe(10);
  });

  it('indexeert op de verjaardag van de regel: inflatie of eigen %', () => {
    const a = buildSchedule([c({ index: 'inflation' })], 'invest', '2027-01-01', 36, infl).recurring;
    expect(a[11]).toBe(100);
    expect(a[12]).toBeCloseTo(102, 9);
    expect(a[24]).toBeCloseTo(100 * 1.02 * 1.02, 9);
    const b = buildSchedule([c({ index: 'custom', indexRate: 5, frequency: 'yearly' })], 'invest', '2027-01-01', 36, infl).recurring;
    expect([b[0], b[12], b[24]].map((v) => +v.toFixed(4))).toEqual([100, 105, 110.25]);
  });

  it('eenmalig: in de maand van de datum; buiten de looptijd genegeerd', () => {
    const s = buildSchedule([c({ frequency: 'once', date: '2027-05-20', amount: 500 }), c({ id: 'y', frequency: 'once', date: '2030-01-01' })], 'invest', '2027-01-01', 12, infl);
    expect(s.once[4]).toBe(500);
    expect(sum(s.recurring)).toBe(0);
    expect(s.ignored.map((r) => r.id)).toEqual(['y']);
  });

  it('filtert op bestemming en past de factor alleen op periodieke inleg toe', () => {
    const rows = [c({}), c({ id: 's', target: 'savings' }), c({ id: 'o', frequency: 'once', amount: 1000 })];
    const s = buildSchedule(rows, 'invest', '2027-01-01', 12, infl, 1.5);
    expect(sum(s.recurring)).toBeCloseTo(1800, 9);
    expect(sum(s.once)).toBe(1000);
  });
});

describe('maandequivalent', () => {
  it('rekent frequenties om naar een bedrag per maand', () => {
    expect(monthlyEquivalent(c({ frequency: 'quarterly', amount: 300 }))).toBe(100);
    expect(monthlyEquivalent(c({ frequency: 'yearly', amount: 1200 }))).toBe(100);
    expect(monthlyEquivalent(c({ frequency: 'daily', amount: 12 }))).toBeCloseTo(365.25, 9);
    expect(averageMonthly([1, 2, 3], 'first')).toBe(2);
  });
});
