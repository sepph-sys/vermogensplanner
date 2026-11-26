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
  /** Indexatie gelijk aan de inflatie van de betreffende module. */
  indexFollowsInflation: boolean;
  /** Eigen indexatiepercentage per jaar (alleen als niet gelijk aan inflatie). */
  indexRate: number;
}

export interface InvestState {
  initial: number;
  monthly: number;
  annualReturn: number;
  inflation: number;
  deposits: Deposit[];
}

export interface SavingsState {
  initial: number;
  monthly: number;
  annualRate: number;
  inflation: number;
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

/**
 * Jaarlijkse indexatie per module. Bij 'gelijk aan inflatie' volgt elke module
 * haar eigen inflatie-aanname (inclusief scenario-afwijking), zodat de inleg
 * in reële termen constant blijft.
 */
export function indexationRates(state: PlannerState, o: ModelOverrides = {}): { invest: number; savings: number } {
  const b = state.budget;
  if (!b.indexEnabled) return { invest: 0, savings: 0 };
  if (!b.indexFollowsInflation) return { invest: b.indexRate, savings: b.indexRate };
  const d = o.inflationDelta ?? 0;
  return { invest: state.invest.inflation + d, savings: state.savings.inflation + d };
}

export function runModel(state: PlannerState, o: ModelOverrides = {}): ModelResult {
  const f = o.monthlyFactor ?? 1;
  const m = effectiveMonthly(state);
  const idx = indexationRates(state, o);
  const { startDate, endDate } = state.period;

  const { invest, savings, taxYears } = simulatePlan(
    startDate,
    endDate,
    {
      kind: 'invest',
      initial: state.invest.initial,
      monthly: m.invest * f,
      annualRate: state.invest.annualReturn + (o.returnDelta ?? 0),
      inflation: state.invest.inflation + (o.inflationDelta ?? 0),
      indexation: idx.invest,
      deposits: state.invest.deposits,
    },
    {
      kind: 'savings',
      initial: state.savings.initial,
      monthly: m.savings * f,
      annualRate: state.savings.annualRate + (o.savingsDelta ?? 0),
      inflation: state.savings.inflation + (o.inflationDelta ?? 0),
      indexation: idx.savings,
    },
    o.noTax ? undefined : state.box3,
  );

  const final = invest.finalBalance + savings.finalBalance;
  const real = invest.realFinal + savings.realFinal;
  const contributed = invest.totalContributed + savings.totalContributed;

  return {
    monthlyInvest: m.invest * f,
    monthlySavings: m.savings * f,
    indexInvest: idx.invest,
    indexSavings: idx.savings,
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
      annualReturn: 7,
      inflation: 2.5,
      deposits: [
        { id: 'd1', date: `${y + 3}-06-01`, amount: 5000, label: 'Bonus' },
        { id: 'd2', date: `${y + 10}-01-01`, amount: 20000, label: 'Erfenis' },
      ],
    },
    savings: { initial: 15000, monthly: 300, annualRate: 2, inflation: 2.5 },
    scenarios: DEFAULT_SCENARIOS.map((s) => ({ ...s })),
    box3: createDefaultBox3(),
  };
}

/**
 * Valideert/merget een opgeslagen state met de standaardwaarden, zodat een
 * oude of beschadigde localStorage-entry de app nooit laat crashen.
 */
export function hydrateState(raw: unknown): PlannerState {
  const base = createSampleState();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<PlannerState>;
  const scenarios = Array.isArray(r.scenarios) && r.scenarios.length === 3 ? r.scenarios : base.scenarios;
  return {
    period: { ...base.period, ...r.period },
    budget: { ...base.budget, ...r.budget },
    invest: {
      ...base.invest,
      ...r.invest,
      deposits: Array.isArray(r.invest?.deposits) ? r.invest!.deposits : base.invest.deposits,
    },
    savings: { ...base.savings, ...r.savings },
    scenarios,
    box3: {
      ...base.box3,
      ...r.box3,
      periods: Array.isArray(r.box3?.periods) ? r.box3!.periods : base.box3.periods,
    },
  };
}
