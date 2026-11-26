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
 *  - Optionele jaarlijkse indexatie g: de maandinleg in looptijdjaar k
 *    (k = 0, 1, …, gerekend vanaf de startdatum) is PMT·(1 + g)^k. De
 *    verhoging gaat dus in op elke 'verjaardag' van de startdatum.
 *  - Extra eenmalige stortingen worden aan het begin van de maand gestort
 *    waarin hun datum valt (gerekend vanaf de startdatum). Stortingen vóór de
 *    start of op/na de einddatum vallen buiten de looptijd en tellen niet mee.
 *  - Box 3 wordt per kalenderjaar afgerekend; zie box3.ts.
 *  - Reële waarde = nominale waarde / (1 + i)^(t/12), met t in maanden.
 */

import { addMonths, monthDiff, yearOf } from './dates';
import { box3Tax, type Box3Config, type Box3YearResult } from './box3';

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
  /** Jaarlijkse indexatie van de maandinleg in procenten (0 = vast bedrag). */
  indexation?: number;
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
   * de (geïndexeerde) maandelijkse inleg – een bekend FIRE-kantelpunt. `null` als dit niet
   * binnen de looptijd gebeurt.
   */
  crossoverMonth: number | null;
  /** Maandinleg in de laatste maand van de looptijd (na indexatie). */
  finalMonthly: number;
  /** Betaalde box 3-belasting uit deze pot. */
  taxPaid: number;
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

/** Eén vermogenspot (beleggen of sparen) binnen een gezamenlijke simulatie. */
export interface PotParams {
  /** Box 3-categorie: banktegoeden of overige bezittingen. */
  kind: 'savings' | 'invest';
  initial: number;
  monthly: number;
  annualRate: number;
  inflation: number;
  indexation?: number;
  deposits?: Deposit[];
}

export interface PlanResult {
  invest: SimulationResult;
  savings: SimulationResult;
  /** Box 3-afrekening per kalenderjaar (leeg als box 3 uit staat). */
  taxYears: Box3YearResult[];
}

/** Interne rekenstaat per pot. */
interface PotState {
  p: PotParams;
  r: number;
  monthlyAt: (m: number) => number;
  extra: number[];
  ignored: Deposit[];
  balance: number;
  contributed: number;
  taxPaid: number;
  crossover: number | null;
  /** Saldo op de peildatum van het lopende belastingjaar. */
  peil: number;
  /** Werkelijk rendement in het lopende belastingjaar. */
  yearGrowth: number;
  points: MonthPoint[];
}

function initPot(p: PotParams, startDate: string, n: number): PotState {
  const g = Math.max(safe(p.indexation ?? 0), -99.99) / 100;
  const monthly = safe(p.monthly);
  const extra = new Array<number>(n).fill(0);
  const ignored: Deposit[] = [];
  for (const dep of p.deposits ?? []) {
    const amount = safe(dep.amount);
    if (!amount) continue;
    const idx = monthDiff(startDate, dep.date);
    if (idx >= 0 && idx < n) extra[idx] += amount;
    else ignored.push(dep);
  }
  const initial = safe(p.initial);
  return {
    p,
    r: monthlyRate(safe(p.annualRate)),
    monthlyAt: (m) => monthly * Math.pow(1 + g, Math.floor(m / 12)),
    extra,
    ignored,
    balance: initial,
    contributed: initial,
    taxPaid: 0,
    crossover: null,
    peil: initial,
    yearGrowth: 0,
    points: [{ month: 0, date: startDate, balance: initial, contributed: initial, real: initial }],
  };
}

function toResult(s: PotState, n: number): SimulationResult {
  const realFinal = s.points[s.points.length - 1].real;
  const totalGrowth = s.balance - s.contributed;
  return {
    months: n,
    points: s.points,
    totalContributed: s.contributed,
    finalBalance: s.balance,
    totalGrowth,
    growthPct: s.contributed > 0 ? totalGrowth / s.contributed : 0,
    realFinal,
    inflationLoss: s.balance - realFinal,
    crossoverMonth: s.crossover,
    finalMonthly: n > 0 ? s.monthlyAt(n - 1) : safe(s.p.monthly),
    taxPaid: s.taxPaid,
    ignoredDeposits: s.ignored,
  };
}

/**
 * Simuleer beleggen en sparen samen, maand voor maand, met optionele box 3.
 *
 * Per maand m (0 … n−1), voor elke pot:
 *   1. B ← B + PMT·(1+g)^⌊m/12⌋ + extra stortingen in maand m
 *   2. B ← B × (1 + r_m)
 * Na de laatste maand van elk kalenderjaar (en aan het einde van de
 * looptijd) wordt de box 3-belasting over dat jaar berekend en naar rato
 * van ieders bijdrage aan het belaste rendement van de potten afgetrokken.
 * Het kalenderjaar van maand m is het jaar van de begindatum van die maand.
 */
export function simulatePlan(
  startDate: string,
  endDate: string,
  investParams: PotParams,
  savingsParams: PotParams,
  box3?: Box3Config,
): PlanResult {
  const n = horizonMonths(startDate, endDate);
  const inv = initPot(investParams, startDate, n);
  const sav = initPot(savingsParams, startDate, n);
  const pots = [inv, sav];
  const taxYears: Box3YearResult[] = [];
  const taxOn = !!box3?.enabled && box3.periods.length > 0;
  let lossCarry = 0;
  let segmentMonths = 0;

  for (let m = 0; m < n; m++) {
    const monthStart = addMonths(startDate, m);
    const monthEnd = addMonths(startDate, m + 1);

    for (const s of pots) {
      const monthlyNow = s.monthlyAt(m);
      const deposit = monthlyNow + s.extra[m];
      s.balance += deposit;
      s.contributed += deposit;
      const growth = s.balance * s.r;
      s.balance += growth;
      s.yearGrowth += growth;
      if (s.crossover === null && monthlyNow > 0 && growth >= monthlyNow) s.crossover = m + 1;
    }
    segmentMonths++;

    // Einde kalenderjaar(-deel)? → box 3 afrekenen.
    const year = yearOf(monthStart);
    const yearEnds = m === n - 1 || yearOf(monthEnd) !== year;
    if (yearEnds) {
      if (taxOn) {
        const res = box3Tax(
          box3!,
          {
            year,
            months: Math.min(segmentMonths, 12),
            peil: { savings: sav.peil, invest: inv.peil },
            actual: { savings: sav.yearGrowth, invest: inv.yearGrowth },
          },
          lossCarry,
          safe(investParams.inflation), // indexatie heffingsvrije bedragen
        );
        if (res) {
          lossCarry = res.lossCarry;
          inv.balance -= res.split.invest;
          sav.balance -= res.split.savings;
          inv.taxPaid += res.split.invest;
          sav.taxPaid += res.split.savings;
          taxYears.push(res);
        }
      }
      for (const s of pots) {
        s.peil = s.balance; // peildatum 1 januari van het volgende jaar
        s.yearGrowth = 0;
      }
      segmentMonths = 0;
    }

    for (const s of pots) {
      s.points.push({
        month: m + 1,
        date: monthEnd,
        balance: s.balance,
        contributed: s.contributed,
        real: s.balance / inflationFactor(safe(s.p.inflation), m + 1),
      });
    }
  }

  return { invest: toResult(inv, n), savings: toResult(sav, n), taxYears };
}

/** Eén pot zonder belasting (o.a. voor tests en losse berekeningen). */
export function simulate(p: SimulationParams): SimulationResult {
  const empty: PotParams = { kind: 'savings', initial: 0, monthly: 0, annualRate: 0, inflation: 0 };
  return simulatePlan(p.startDate, p.endDate, { kind: 'invest', ...p }, empty).invest;
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
