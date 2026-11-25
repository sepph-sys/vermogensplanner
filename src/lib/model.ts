/**
 * Planner-state en het samengestelde model (beleggen + sparen).
 * Alle componenten lezen hun resultaten via `runModel`, zodat scenario's en
 * inzichten exact dezelfde rekenregels gebruiken als het dashboard.
 */

import { addMonths, todayISO } from './dates';
import { simulate, type Deposit, type SimulationResult } from './finance';

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
}

export interface ModelOverrides {
  returnDelta?: number;
  savingsDelta?: number;
  inflationDelta?: number;
  /** Vermenigvuldigingsfactor voor beide maandinleggen (bv. 1,25 = +25%). */
  monthlyFactor?: number;
}

export interface ModelTotals {
  final: number;
  real: number;
  contributed: number;
  growth: number;
  inflationLoss: number;
}

export interface ModelResult {
  monthlyInvest: number;
  monthlySavings: number;
  invest: SimulationResult;
  savings: SimulationResult;
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

export function runModel(state: PlannerState, o: ModelOverrides = {}): ModelResult {
  const f = o.monthlyFactor ?? 1;
  const m = effectiveMonthly(state);
  const { startDate, endDate } = state.period;

  const invest = simulate({
    startDate,
    endDate,
    initial: state.invest.initial,
    monthly: m.invest * f,
    annualRate: state.invest.annualReturn + (o.returnDelta ?? 0),
    inflation: state.invest.inflation + (o.inflationDelta ?? 0),
    deposits: state.invest.deposits,
  });

  const savings = simulate({
    startDate,
    endDate,
    initial: state.savings.initial,
    monthly: m.savings * f,
    annualRate: state.savings.annualRate + (o.savingsDelta ?? 0),
    inflation: state.savings.inflation + (o.inflationDelta ?? 0),
  });

  const final = invest.finalBalance + savings.finalBalance;
  const real = invest.realFinal + savings.realFinal;
  const contributed = invest.totalContributed + savings.totalContributed;

  return {
    monthlyInvest: m.invest * f,
    monthlySavings: m.savings * f,
    invest,
    savings,
    totals: {
      final,
      real,
      contributed,
      growth: final - contributed,
      inflationLoss: final - real,
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
    budget: { amount: 1000, investShare: 70, autoSplit: true },
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
  };
}
