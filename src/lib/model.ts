/**
 * Planner-state en het samengestelde model (beleggen + sparen).
 * Alle componenten lezen hun resultaten via `runModel`, zodat scenario's en
 * inzichten exact dezelfde rekenregels gebruiken als het dashboard.
 */

import { addMonths, todayISO } from './dates';
import { horizonMonths, simulatePlan, type Deposit, type SimulationResult } from './finance';
import { averageMonthly, buildSchedule, type Contribution, type Target } from './contributions';
import { createDefaultBox3, type Box3Config, type Box3YearResult } from './box3';

export interface PeriodState {
  startDate: string;
  endDate: string;
}

/**
 * Instellingen van het vroegere maandbudget. Alleen nog gebruikt om oude
 * opgeslagen invoer om te zetten naar inlegregels.
 */
interface LegacyBudget {
  amount?: number;
  investShare?: number;
  autoSplit?: boolean;
  indexEnabled?: boolean;
  indexFollowsInflation?: boolean;
  indexRate?: number;
}

export interface InvestState {
  /** Startinleg op de startdatum (vaste regel bovenaan de inlegtabel). */
  initial: number;
}

export interface SavingsState {
  /** Startsaldo op de startdatum (vaste regel bovenaan de inlegtabel). */
  initial: number;
}

/**
 * Afwijkende waarden voor één kalenderjaar. `null` = geen afwijking, dan
 * geldt de generieke waarde.
 */
export interface YearAssumption {
  id: string;
  year: number;
  annualReturn: number | null;
  savingsRate: number | null;
  inflation: number | null;
}

/**
 * Rendement, spaarrente en inflatie: één bron voor de hele app. Elk
 * invoerveld leest en schrijft deze waarden, zodat ze overal gelijk zijn.
 */
export interface AssumptionsState {
  /** Generiek effectief jaarrendement beleggen (%). */
  annualReturn: number;
  /** Generieke spaarrente (%). */
  savingsRate: number;
  /** Generieke inflatie (%). */
  inflation: number;
  /** Afwijkingen per kalenderjaar. */
  years: YearAssumption[];
}

export interface ScenarioDef {
  id: 'conservatief' | 'realistisch' | 'optimistisch';
  name: string;
  /** Afwijking t.o.v. de ingevoerde waarden, in procentpunten. */
  returnDelta: number;
  savingsDelta: number;
  inflationDelta: number;
}

export interface PlannerState {
  period: PeriodState;
  invest: InvestState;
  savings: SavingsState;
  /** Alle inlegregels: eenmalig en periodiek, naar beleggen of sparen. */
  contributions: Contribution[];
  assumptions: AssumptionsState;
  scenarios: ScenarioDef[];
  box3: Box3Config;
}

export interface ModelOverrides {
  returnDelta?: number;
  savingsDelta?: number;
  inflationDelta?: number;
  /** Vermenigvuldigingsfactor voor alle periodieke inleg (bv. 1,25 = +25%). */
  monthlyFactor?: number;
  /** Box 3 negeren (voor de vergelijking 'zonder belasting'). */
  noTax?: boolean;
}

export interface ModelTotals {
  final: number;
  real: number;
  contributed: number;
  growth: number;
  inflationLoss: number;
  /** Totaal betaalde box 3-belasting (nominaal). */
  tax: number;
}

export interface ModelResult {
  /** Gemiddelde periodieke inleg per maand in het eerste jaar. */
  monthlyInvest: number;
  monthlySavings: number;
  /** Gemiddelde periodieke inleg per maand in het laatste jaar (na indexatie). */
  lastMonthlyInvest: number;
  lastMonthlySavings: number;
  /** Inlegregels zonder storting binnen de looptijd. */
  ignored: Contribution[];
  invest: SimulationResult;
  savings: SimulationResult;
  /** Box 3-afrekening per kalenderjaar. */
  taxYears: Box3YearResult[];
  totals: ModelTotals;
}

/** Rendement, spaarrente en inflatie als functie van het kalenderjaar. */
export interface YearRates {
  annualReturn: (year: number) => number;
  savingsRate: (year: number) => number;
  inflation: (year: number) => number;
}

/**
 * Waarden per kalenderjaar: de afwijking uit de jaartabel als die is
 * ingevuld, anders de generieke waarde; plus de scenario-afwijking.
 */
export function yearRates(a: AssumptionsState, o: ModelOverrides = {}): YearRates {
  const byYear = new Map(a.years.map((y) => [y.year, y]));
  const pick = (key: 'annualReturn' | 'savingsRate' | 'inflation', generic: number, delta = 0) => (year: number) => {
    const v = byYear.get(year)?.[key];
    return (v ?? generic) + delta;
  };
  return {
    annualReturn: pick('annualReturn', a.annualReturn, o.returnDelta),
    savingsRate: pick('savingsRate', a.savingsRate, o.savingsDelta),
    inflation: pick('inflation', a.inflation, o.inflationDelta),
  };
}

export function runModel(state: PlannerState, o: ModelOverrides = {}): ModelResult {
  const f = o.monthlyFactor ?? 1;
  const rates = yearRates(state.assumptions, o);
  const { startDate, endDate } = state.period;
  const n = horizonMonths(startDate, endDate);

  // Inlegregels → kasstroom per maand, per bestemming.
  const inv = buildSchedule(state.contributions, 'invest', startDate, n, rates.inflation, f);
  const sav = buildSchedule(state.contributions, 'savings', startDate, n, rates.inflation, f);

  const { invest, savings, taxYears } = simulatePlan(
    startDate,
    endDate,
    {
      kind: 'invest',
      initial: state.invest.initial,
      monthly: 0,
      annualRate: rates.annualReturn,
      inflation: rates.inflation,
      schedule: inv,
    },
    {
      kind: 'savings',
      initial: state.savings.initial,
      monthly: 0,
      annualRate: rates.savingsRate,
      inflation: rates.inflation,
      schedule: sav,
    },
    o.noTax ? undefined : state.box3,
  );

  const final = invest.finalBalance + savings.finalBalance;
  const real = invest.realFinal + savings.realFinal;
  const contributed = invest.totalContributed + savings.totalContributed;

  return {
    monthlyInvest: averageMonthly(inv.recurring, 'first'),
    monthlySavings: averageMonthly(sav.recurring, 'first'),
    lastMonthlyInvest: averageMonthly(inv.recurring, 'last'),
    lastMonthlySavings: averageMonthly(sav.recurring, 'last'),
    ignored: [...inv.ignored, ...sav.ignored],
    invest,
    savings,
    taxYears,
    totals: {
      final,
      real,
      contributed,
      growth: final - contributed,
      inflationLoss: final - real,
      tax: invest.taxPaid + savings.taxPaid,
    },
  };
}

export const DEFAULT_SCENARIOS: ScenarioDef[] = [
  { id: 'conservatief', name: 'Conservatief', returnDelta: -3, savingsDelta: -1, inflationDelta: 1 },
  { id: 'realistisch', name: 'Realistisch', returnDelta: 0, savingsDelta: 0, inflationDelta: 0 },
  { id: 'optimistisch', name: 'Optimistisch', returnDelta: 2, savingsDelta: 0.5, inflationDelta: -0.5 },
];

/** Voorbeelddata bij eerste start: 30 jaar opbouwen vanaf de eerstvolgende maand. */
const row = (c: Partial<Contribution> & Pick<Contribution, 'id' | 'target' | 'frequency' | 'date' | 'amount'>): Contribution => ({
  endDate: null,
  index: 'none',
  indexRate: 2,
  label: '',
  ...c,
});

export function createSampleState(): PlannerState {
  const today = todayISO();
  const start = addMonths(`${today.slice(0, 7)}-01`, 1);
  const y = Number(start.slice(0, 4));
  return {
    period: { startDate: start, endDate: addMonths(start, 30 * 12) },
    invest: { initial: 10000 },
    savings: { initial: 15000 },
    contributions: [
      row({ id: 'r1', target: 'invest', frequency: 'monthly', date: start, amount: 700, label: 'Maandelijkse inleg' }),
      row({ id: 'r2', target: 'savings', frequency: 'monthly', date: start, amount: 300, label: 'Maandelijks sparen' }),
      row({ id: 'd1', target: 'invest', frequency: 'once', date: `${y + 3}-06-01`, amount: 5000, label: 'Bonus' }),
      row({ id: 'd2', target: 'invest', frequency: 'once', date: `${y + 10}-01-01`, amount: 20000, label: 'Erfenis' }),
    ],
    assumptions: { annualReturn: 7, savingsRate: 2, inflation: 2.5, years: [] },
    scenarios: DEFAULT_SCENARIOS.map((s) => ({ ...s })),
    box3: createDefaultBox3(),
  };
}

const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

/** Oude stortingen (per module) → eenmalige inlegregels. */
function legacyDeposits(list: unknown, target: Target): Contribution[] {
  if (!Array.isArray(list)) return [];
  return (list as Deposit[]).map((d) =>
    row({ id: d.id, target, frequency: 'once', date: d.date, amount: num(d.amount, 0), label: d.label ?? '' }),
  );
}

/**
 * Valideert/merget een opgeslagen state met de standaardwaarden, zodat een
 * oude of beschadigde localStorage-entry de app nooit laat crashen.
 * Oudere versies worden omgezet:
 *  - rendement/rente/inflatie per module → `assumptions`;
 *  - maandbudget of handmatige maandinleg → maandelijkse inlegregels;
 *  - stortingen per module → eenmalige inlegregels.
 */
export function hydrateState(raw: unknown): PlannerState {
  const base = createSampleState();
  if (!raw || typeof raw !== 'object') return base;
  type LegacyPot = { initial?: number; monthly?: number; annualReturn?: number; annualRate?: number; inflation?: number; deposits?: unknown };
  const r = raw as Partial<Omit<PlannerState, 'invest' | 'savings'>> & { invest?: LegacyPot; savings?: LegacyPot; budget?: LegacyBudget };
  const scenarios = Array.isArray(r.scenarios) && r.scenarios.length === 3 ? r.scenarios : base.scenarios;
  const period = { ...base.period, ...r.period };
  const legacy: AssumptionsState = {
    annualReturn: num(r.invest?.annualReturn, base.assumptions.annualReturn),
    savingsRate: num(r.savings?.annualRate, base.assumptions.savingsRate),
    inflation: num(r.invest?.inflation, base.assumptions.inflation),
    years: [],
  };
  const a = r.assumptions;

  let contributions: Contribution[];
  if (Array.isArray(r.contributions)) {
    contributions = r.contributions;
  } else if (r.invest || r.savings || r.budget) {
    // Oude opslag: maandinleg uit budget of handmatige velden.
    const b = r.budget ?? {};
    const auto = b.autoSplit ?? true;
    const amount = num(b.amount, 1000);
    const share = Math.min(Math.max(num(b.investShare, 70), 0), 100) / 100;
    const mInv = auto ? amount * share : num(r.invest?.monthly, 0);
    const mSav = auto ? amount - amount * share : num(r.savings?.monthly, 0);
    const index: Contribution['index'] = !b.indexEnabled ? 'none' : b.indexFollowsInflation === false ? 'custom' : 'inflation';
    const indexRate = num(b.indexRate, 2);
    contributions = [
      ...(mInv ? [row({ id: 'm-invest', target: 'invest', frequency: 'monthly', date: period.startDate, amount: mInv, index, indexRate, label: 'Maandelijkse inleg' })] : []),
      ...(mSav ? [row({ id: 'm-savings', target: 'savings', frequency: 'monthly', date: period.startDate, amount: mSav, index, indexRate, label: 'Maandelijks sparen' })] : []),
      ...legacyDeposits(r.invest?.deposits, 'invest'),
      ...legacyDeposits(r.savings?.deposits, 'savings'),
    ];
  } else {
    contributions = base.contributions;
  }

  return {
    period,
    invest: { initial: num(r.invest?.initial, base.invest.initial) },
    savings: { initial: num(r.savings?.initial, base.savings.initial) },
    contributions,
    assumptions: a
      ? {
          annualReturn: num(a.annualReturn, legacy.annualReturn),
          savingsRate: num(a.savingsRate, legacy.savingsRate),
          inflation: num(a.inflation, legacy.inflation),
          years: Array.isArray(a.years) ? a.years : [],
        }
      : legacy,
    scenarios,
    box3: {
      ...base.box3,
      ...r.box3,
      periods: Array.isArray(r.box3?.periods) ? r.box3!.periods : base.box3.periods,
    },
  };
}
