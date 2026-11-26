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
 *  - Rendement, rente, inflatie en indexatie mogen per KALENDERJAAR
 *    verschillen (een vast getal of een functie jaar → %). Het kalenderjaar
 *    van maand m is het jaar van de begindatum van die maand.
 *  - Box 3 wordt per kalenderjaar afgerekend; zie box3.ts.
 *  - Reële waarde = nominale waarde / prijsindex, met prijsindex
 *    D_m = Π_{k<m} (1 + i_jaar(k))^(1/12). Bij constante inflatie is dat
 *    (1 + i)^(m/12).
 */

import { addMonths, monthDiff, yearOf } from './dates';
import { box3Tax, type Box3Config, type Box3YearResult } from './box3';

const safe = (n: number) => (Number.isFinite(n) ? n : 0);

/** Maximale looptijd (100 jaar) als bescherming tegen extreme invoer. */
export const MAX_MONTHS = 1200;

export interface Deposit {
  id: string;
  date: string; // ISO
  amount: number;
  label?: string;
}

/** Percentage dat vast is of per kalenderjaar verschilt. */
export type YearRate = number | ((year: number) => number);

/** Zet een YearRate om naar een functie jaar → % (niet-eindige waarden → 0). */
export const rateFn = (r: YearRate | undefined): ((year: number) => number) =>
  typeof r === 'function' ? (y) => safe(r(y)) : () => safe(r ?? 0);

export interface SimulationParams {
  startDate: string;
  endDate: string;
  initial: number;
  monthly: number;
  /** Effectief jaarrendement in procenten, bv. 7 voor 7%. */
  annualRate: YearRate;
  /** Gemiddelde jaarlijkse inflatie in procenten. */
  inflation: YearRate;
  /**
   * Jaarlijkse indexatie van de maandinleg in procenten (0 = vast bedrag).
   * Als functie: het percentage van het kalenderjaar dat op de 'verjaardag'
   * van de startdatum afloopt.
   */
  indexation?: YearRate;
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
  /** Prijsindex aan het einde van de looptijd (nominaal / reëel). */
  priceIndex: number;
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


/** Eén vermogenspot (beleggen of sparen) binnen een gezamenlijke simulatie. */
export interface PotParams {
  /** Box 3-categorie: banktegoeden of overige bezittingen. */
  kind: 'savings' | 'invest';
  initial: number;
  monthly: number;
  annualRate: YearRate;
  inflation: YearRate;
  indexation?: YearRate;
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
  /** Maandrendement per kalenderjaar (gecachet). */
  rateAt: (year: number) => number;
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
  const monthly = safe(p.monthly);
  // Indexatiefactor per looptijdjaar k: Π_{j=1..k} (1 + g_j), waarbij g_j het
  // percentage is van het kalenderjaar waarin maand 12j − 1 valt.
  const idx = rateFn(p.indexation);
  const factors = [1];
  for (let k = 1; k * 12 < Math.max(n, 1); k++) {
    const g = Math.max(idx(yearOf(addMonths(startDate, 12 * k - 1))), -99.99) / 100;
    factors.push(factors[k - 1] * (1 + g));
  }
  const ret = rateFn(p.annualRate);
  const cache = new Map<number, number>();
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
    rateAt: (year) => {
      let r = cache.get(year);
      if (r === undefined) cache.set(year, (r = monthlyRate(ret(year))));
      return r;
    },
    monthlyAt: (m) => monthly * (factors[Math.floor(m / 12)] ?? factors[factors.length - 1]),
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

function toResult(s: PotState, n: number, priceIndex: number): SimulationResult {
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
    priceIndex,
    taxPaid: s.taxPaid,
    ignoredDeposits: s.ignored,
  };
}

/**
 * Simuleer beleggen en sparen samen, maand voor maand, met optionele box 3.
 *
 * Per maand m (0 … n−1), voor elke pot:
 *   1. B ← B + PMT_m + extra stortingen in maand m   (PMT_m geïndexeerd)
 *   2. B ← B × (1 + r_m),  r_m = (1 + R_jaar)^(1/12) − 1
 *   3. D ← D × (1 + i_jaar)^(1/12)                      (prijsindex)
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
  const inflInv = rateFn(investParams.inflation);
  const inflSav = rateFn(savingsParams.inflation);
  const infl = [inflInv, inflSav];
  /** Prijsindex per pot (1 op de startdatum). */
  const index = [1, 1];

  for (let m = 0; m < n; m++) {
    const monthStart = addMonths(startDate, m);
    const monthEnd = addMonths(startDate, m + 1);

    const year = yearOf(monthStart);
    for (const s of pots) {
      const monthlyNow = s.monthlyAt(m);
      const deposit = monthlyNow + s.extra[m];
      s.balance += deposit;
      s.contributed += deposit;
      const growth = s.balance * s.rateAt(year);
      s.balance += growth;
      s.yearGrowth += growth;
      if (s.crossover === null && monthlyNow > 0 && growth >= monthlyNow) s.crossover = m + 1;
    }
    segmentMonths++;

    for (let k = 0; k < 2; k++) index[k] *= inflationFactor(infl[k](year), 1);

    // Einde kalenderjaar(-deel)? → box 3 afrekenen.
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
          inflInv, // indexatie heffingsvrije bedragen (inflatie per jaar)
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

    pots.forEach((s, k) =>
      s.points.push({
        month: m + 1,
        date: monthEnd,
        balance: s.balance,
        contributed: s.contributed,
        real: s.balance / index[k],
      }),
    );
  }

  return { invest: toResult(inv, n, index[0]), savings: toResult(sav, n, index[1]), taxYears };
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
