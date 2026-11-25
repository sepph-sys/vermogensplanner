/**
 * Financiële rekenkern – maandelijkse simulatie met samengestelde rente.
 *
 * Conventies (zie ook docs/FORMULES.md):
 *  - Het jaarrendement / de jaarrente is een EFFECTIEF jaarpercentage.
 *    Het equivalente maandpercentage is r_m = (1 + R)^(1/12) − 1, zodat
 *    12 maanden groei exact (1 + R) oplevert.
 *  - De startinleg staat er op t = 0.
 *  - Maandelijkse inleg wordt aan het BEGIN van elke maand gestort
 *    (annuïteit 'due'), dus ook direct op de startdatum.
 *  - Extra eenmalige stortingen worden aan het begin van de maand gestort
 *    waarin hun datum valt (gerekend vanaf de startdatum). Stortingen vóór de
 *    start of op/na de einddatum vallen buiten de looptijd en tellen niet mee.
 *  - Reële waarde = nominale waarde / (1 + i)^(t/12), met t in maanden.
 */

import { addMonths, monthDiff } from './dates';

/** Maximale looptijd (100 jaar) als bescherming tegen extreme invoer. */
export const MAX_MONTHS = 1200;

export interface Deposit {
  id: string;
  date: string; // ISO
  amount: number;
  label?: string;
}

export interface SimulationParams {
  startDate: string;
  endDate: string;
  initial: number;
  monthly: number;
  /** Effectief jaarrendement in procenten, bv. 7 voor 7%. */
  annualRate: number;
  /** Gemiddelde jaarlijkse inflatie in procenten. */
  inflation: number;
  deposits?: Deposit[];
}

export interface MonthPoint {
  /** Maanden sinds start (0 = startmoment). */
  month: number;
  date: string;
  /** Nominale waarde aan het eind van de maand. */
  balance: number;
  /** Cumulatieve eigen inleg. */
  contributed: number;
  /** Koopkrachtgecorrigeerde waarde (in euro's van de startdatum). */
  real: number;
}

export interface SimulationResult {
  months: number;
  points: MonthPoint[];
  totalContributed: number;
  finalBalance: number;
  /** Rendement / ontvangen rente in euro's = eindwaarde − inleg. */
  totalGrowth: number;
  /** Rendement als percentage van de totale inleg. */
  growthPct: number;
  /** Reële eindwaarde. */
  realFinal: number;
  /** Koopkrachtverlies door inflatie = nominaal − reëel. */
  inflationLoss: number;
  /**
   * Eerste maand waarin de maandelijkse groei (rente/rendement) groter is dan
   * de maandelijkse inleg – een bekend FIRE-kantelpunt. `null` als dit niet
   * binnen de looptijd gebeurt.
   */
  crossoverMonth: number | null;
  /** Extra stortingen die buiten de looptijd vallen (genegeerd). */
  ignoredDeposits: Deposit[];
}

/** Effectief jaarpercentage → equivalent maandpercentage (als fractie). */
export function monthlyRate(annualPct: number): number {
  const R = Math.max(annualPct, -99.99) / 100;
  return Math.pow(1 + R, 1 / 12) - 1;
}

/** Deflator: (1 + i)^(maanden/12). Deel een nominale waarde hierdoor voor de reële waarde. */
export function inflationFactor(inflationPct: number, months: number): number {
  const i = Math.max(inflationPct, -99.99) / 100;
  return Math.pow(1 + i, months / 12);
}

/** Looptijd in hele maanden, begrensd op [0, MAX_MONTHS]. */
export function horizonMonths(startDate: string, endDate: string): number {
  return Math.min(Math.max(monthDiff(startDate, endDate), 0), MAX_MONTHS);
}

const safe = (n: number) => (Number.isFinite(n) ? n : 0);

/**
 * Simuleer de waardeontwikkeling maand voor maand.
 *
 * Per maand m (0 … n−1):
 *   1. B ← B + maandinleg + extra stortingen in maand m
 *   2. B ← B × (1 + r_m)
 */
export function simulate(p: SimulationParams): SimulationResult {
  const n = horizonMonths(p.startDate, p.endDate);
  const r = monthlyRate(safe(p.annualRate));
  const initial = safe(p.initial);
  const monthly = safe(p.monthly);

  // Extra stortingen groeperen per maandindex.
  const extra = new Array<number>(n).fill(0);
  const ignoredDeposits: Deposit[] = [];
  for (const dep of p.deposits ?? []) {
    const amount = safe(dep.amount);
    if (!amount) continue;
    const idx = monthDiff(p.startDate, dep.date);
    if (idx >= 0 && idx < n) extra[idx] += amount;
    else ignoredDeposits.push(dep);
  }

  let balance = initial;
  let contributed = initial;
  let crossoverMonth: number | null = null;
  const points: MonthPoint[] = [
    { month: 0, date: p.startDate, balance, contributed, real: balance },
  ];

  for (let m = 0; m < n; m++) {
    const deposit = monthly + extra[m];
    balance += deposit;
    contributed += deposit;

    const growth = balance * r;
    balance += growth;

    if (crossoverMonth === null && monthly > 0 && growth >= monthly) {
      crossoverMonth = m + 1;
    }

    points.push({
      month: m + 1,
      date: addMonths(p.startDate, m + 1),
      balance,
      contributed,
      real: balance / inflationFactor(safe(p.inflation), m + 1),
    });
  }

  const finalBalance = balance;
  const totalGrowth = finalBalance - contributed;
  const realFinal = points[points.length - 1].real;

  return {
    months: n,
    points,
    totalContributed: contributed,
    finalBalance,
    totalGrowth,
    growthPct: contributed > 0 ? totalGrowth / contributed : 0,
    realFinal,
    inflationLoss: finalBalance - realFinal,
    crossoverMonth,
    ignoredDeposits,
  };
}

/**
 * Gesloten formule (ter controle) voor toekomstige waarde zonder extra
 * stortingen, met inleg aan het begin van elke maand:
 *
 *   FV = P·(1+r)^n + PMT·[((1+r)^n − 1) / r]·(1+r)
 */
export function futureValueClosedForm(
  initial: number,
  monthly: number,
  annualPct: number,
  months: number,
): number {
  const r = monthlyRate(annualPct);
  const g = Math.pow(1 + r, months);
  const annuity = r === 0 ? monthly * months : monthly * ((g - 1) / r) * (1 + r);
  return initial * g + annuity;
}
