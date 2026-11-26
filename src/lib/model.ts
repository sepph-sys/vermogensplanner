/**
 * Planner-state en het samengestelde model (beleggen + sparen).
 * Alle componenten lezen hun resultaten via `runModel`, zodat scenario's en
 * inzichten exact dezelfde rekenregels gebruiken als het dashboard.
 */

import { addMonths, todayISO } from './dates';
import { simulatePlan, type Deposit, type SimulationResult } from './finance';
import { createDefaultBox3, type Box3Config, type Box3YearResult } from './box3';

export interface PeriodState {
  startDate: string;
  endDate: string;
}

export interface BudgetState {
  /** Vrij besteedbaar bedrag per maand. */
  amount: number;
  /** Deel dat naar beleggen gaat, 0–100. De rest gaat naar sparen. */
  investShare: number;
  /** Als true bepaalt het budget de maandinleg van beide modules. */
  autoSplit: boolean;
  /** Maandinleg jaarlijks indexeren (geldt voor beide modules). */
  indexEnabled: boolean;
  /** Indexatie gelijk aan de inflatie (incl. afwijkingen per jaar). */
  indexFollowsInflation: boolean;
  /** Eigen indexatiepercentage per jaar (alleen als niet gelijk aan inflatie). */
  indexRate: number;
}

export interface InvestState {
  /** Startinleg op de startdatum. */
  initial: number;
  /** Handmatige maandinleg (alleen als het budget niet automatisch verdeelt). */
  monthly: number;
  /** Extra eenmalige beleggingen. */
  deposits: Deposit[];
}

export interface SavingsState {
  /** Startsaldo op de startdatum. */
  initial: number;
  /** Handmatige maandinleg (alleen als het budget niet automatisch verdeelt). */
  monthly: number;
  /** Extra eenmalige stortingen op de spaarrekening. */
  deposits: Deposit[];
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
  budget: BudgetState;
  invest: InvestState;
  savings: SavingsState;
  assumptions: AssumptionsState;
  scenarios: ScenarioDef[];
  box3: Box3Config;
}

export interface ModelOverrides {
  returnDelta?: number;
  savingsDelta?: number;
  inflationDelta?: number;
  /** Vermenigvuldigingsfactor voor beide maandinleggen (bv. 1,25 = +25%). */
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
  monthlyInvest: number;
  monthlySavings: number;
  /** Toegepaste jaarlijkse indexatie (%) per module; 0 = vaste inleg. */
  indexInvest: number;
  indexSavings: number;
  invest: SimulationResult;
  savings: SimulationResult;
  /** Box 3-afrekening per kalenderjaar. */
  taxYears: Box3YearResult[];
  totals: ModelTotals;
}

/** Maandinleg per module: uit het budget (auto) of handmatig ingevoerd. */
export function effectiveMonthly(state: PlannerState): { invest: number; savings: number } {
  if (state.budget.autoSplit) {
    const share = Math.min(Math.max(state.budget.investShare, 0), 100) / 100;
    const invest = state.budget.amount * share;
    return { invest, savings: state.budget.amount - invest };
  }
  return { invest: state.invest.monthly, savings: state.savings.monthly };
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

/**
 * Jaarlijkse indexatie van de maandinleg. Bij 'gelijk aan inflatie' volgt de
 * indexatie de inflatie per jaar (inclusief scenario-afwijking), zodat de
 * inleg in reële termen constant blijft. `generic` is het percentage voor
 * labels (generieke waarde).
 */
export function indexation(state: PlannerState, rates: YearRates, o: ModelOverrides = {}) {
  const b = state.budget;
  if (!b.indexEnabled) return { fn: 0 as number | ((y: number) => number), generic: 0 };
  if (!b.indexFollowsInflation) return { fn: b.indexRate as number | ((y: number) => number), generic: b.indexRate };
  return { fn: rates.inflation, generic: state.assumptions.inflation + (o.inflationDelta ?? 0) };
}

export function runModel(state: PlannerState, o: ModelOverrides = {}): ModelResult {
  const f = o.monthlyFactor ?? 1;
  const m = effectiveMonthly(state);
  const rates = yearRates(state.assumptions, o);
  const idx = indexation(state, rates, o);
  const { startDate, endDate } = state.period;

  const { invest, savings, taxYears } = simulatePlan(
    startDate,
    endDate,
    {
      kind: 'invest',
      initial: state.invest.initial,
      monthly: m.invest * f,
      annualRate: rates.annualReturn,
      inflation: rates.inflation,
      indexation: idx.fn,
      deposits: state.invest.deposits,
    },
    {
      kind: 'savings',
      initial: state.savings.initial,
      monthly: m.savings * f,
      annualRate: rates.savingsRate,
      inflation: rates.inflation,
      indexation: idx.fn,
      deposits: state.savings.deposits,
    },
    o.noTax ? undefined : state.box3,
  );

  const final = invest.finalBalance + savings.finalBalance;
  const real = invest.realFinal + savings.realFinal;
  const contributed = invest.totalContributed + savings.totalContributed;

  return {
    monthlyInvest: m.invest * f,
    monthlySavings: m.savings * f,
    indexInvest: idx.generic,
    indexSavings: idx.generic,
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
export function createSampleState(): PlannerState {
  const today = todayISO();
  const start = addMonths(`${today.slice(0, 7)}-01`, 1);
  const y = Number(start.slice(0, 4));
  return {
    period: { startDate: start, endDate: addMonths(start, 30 * 12) },
    budget: {
      amount: 1000,
      investShare: 70,
      autoSplit: true,
      indexEnabled: false,
      indexFollowsInflation: true,
      indexRate: 2,
    },
    invest: {
      initial: 10000,
      monthly: 700,
      deposits: [
        { id: 'd1', date: `${y + 3}-06-01`, amount: 5000, label: 'Bonus' },
        { id: 'd2', date: `${y + 10}-01-01`, amount: 20000, label: 'Erfenis' },
      ],
    },
    savings: { initial: 15000, monthly: 300, deposits: [] },
    assumptions: { annualReturn: 7, savingsRate: 2, inflation: 2.5, years: [] },
    scenarios: DEFAULT_SCENARIOS.map((s) => ({ ...s })),
    box3: createDefaultBox3(),
  };
}

const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

/**
 * Valideert/merget een opgeslagen state met de standaardwaarden, zodat een
 * oude of beschadigde localStorage-entry de app nooit laat crashen.
 * Oudere versies bewaarden rendement, rente en inflatie per module; die
 * worden omgezet naar het gezamenlijke `assumptions`-blok.
 */
export function hydrateState(raw: unknown): PlannerState {
  const base = createSampleState();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<PlannerState> & {
    invest?: Partial<InvestState> & { annualReturn?: number; inflation?: number };
    savings?: Partial<SavingsState> & { annualRate?: number; inflation?: number };
  };
  const scenarios = Array.isArray(r.scenarios) && r.scenarios.length === 3 ? r.scenarios : base.scenarios;
  const legacy: AssumptionsState = {
    annualReturn: num(r.invest?.annualReturn, base.assumptions.annualReturn),
    savingsRate: num(r.savings?.annualRate, base.assumptions.savingsRate),
    inflation: num(r.invest?.inflation, base.assumptions.inflation),
    years: [],
  };
  const a = r.assumptions;
  return {
    period: { ...base.period, ...r.period },
    budget: { ...base.budget, ...r.budget },
    invest: {
      initial: num(r.invest?.initial, base.invest.initial),
      monthly: num(r.invest?.monthly, base.invest.monthly),
      deposits: Array.isArray(r.invest?.deposits) ? r.invest!.deposits : base.invest.deposits,
    },
    savings: {
      initial: num(r.savings?.initial, base.savings.initial),
      monthly: num(r.savings?.monthly, base.savings.monthly),
      deposits: Array.isArray(r.savings?.deposits) ? r.savings!.deposits : r.savings ? [] : base.savings.deposits,
    },
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
