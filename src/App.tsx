import { useMemo } from 'react';
import { usePersistentState } from './hooks/usePersistentState';
import { useTheme, type ThemeMode } from './hooks/useTheme';
import { createSampleState, hydrateState, runModel, type PlannerState } from './lib/model';
import { chartColors } from './lib/chartTheme';
import { formatDate } from './lib/dates';
import { formatDuration } from './lib/format';
import { PeriodPanel } from './components/inputs/PeriodPanel';
import { BudgetPanel } from './components/inputs/BudgetPanel';
import { InvestPanel } from './components/inputs/InvestPanel';
import { SavingsPanel } from './components/inputs/SavingsPanel';
import { KpiRow } from './components/dashboard/KpiRow';
import { GrowthChart } from './components/dashboard/GrowthChart';
import { ModuleResults } from './components/dashboard/ModuleResults';
import { ScenarioComparison } from './components/analysis/ScenarioComparison';
import { Insights } from './components/analysis/Insights';
import { Segmented } from './components/ui/Segmented';
import { IconReset } from './components/ui/icons';

const STORAGE_KEY = 'vermogensplanner.state.v1';

export function App() {
  const { mode, setMode, resolved } = useTheme();
  const [state, setState] = usePersistentState<PlannerState>(STORAGE_KEY, createSampleState, hydrateState);
  const colors = chartColors[resolved];

  // Eén centrale berekening; alle onderdelen herberekenen direct bij elke wijziging.
  const model = useMemo(() => runModel(state), [state]);

  const patch = <K extends keyof PlannerState>(key: K) => (value: PlannerState[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  const reset = () => {
    if (confirm('Alle invoer vervangen door de voorbeelddata?')) setState(createSampleState());
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-logo" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="28" height="28"><rect width="32" height="32" rx="8" fill="currentColor" /><path d="M7 22l6-6 4 4 8-9" fill="none" stroke="var(--surface)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <div>
            <h1>Vermogensplanner</h1>
            <p className="brand-sub">
              {formatDate(state.period.startDate)} – {formatDate(state.period.endDate)} · {formatDuration(model.invest.months)}
            </p>
          </div>
        </div>
        <div className="topbar-actions">
          <Segmented<ThemeMode>
            ariaLabel="Thema"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'light', label: 'Licht' },
              { value: 'system', label: 'Auto' },
              { value: 'dark', label: 'Donker' },
            ]}
          />
          <button type="button" className="btn btn-ghost" onClick={reset} title="Herstel voorbeelddata">
            <IconReset /> <span className="hide-sm">Voorbeelddata</span>
          </button>
        </div>
      </header>

      <div className="layout">
        <aside className="sidebar" aria-label="Invoer">
          <PeriodPanel period={state.period} onChange={patch('period')} />
          <BudgetPanel budget={state.budget} colors={colors} onChange={patch('budget')} />
          <InvestPanel
            invest={state.invest}
            monthly={model.monthlyInvest}
            autoMonthly={state.budget.autoSplit}
            startDate={state.period.startDate}
            ignored={model.invest.ignoredDeposits}
            onChange={patch('invest')}
          />
          <SavingsPanel savings={state.savings} monthly={model.monthlySavings} autoMonthly={state.budget.autoSplit} onChange={patch('savings')} />
        </aside>

        <main className="main">
          <KpiRow model={model} colors={colors} />
          <GrowthChart model={model} startDate={state.period.startDate} colors={colors} />
          <ModuleResults model={model} colors={colors} />
          <ScenarioComparison state={state} colors={colors} onScenariosChange={patch('scenarios')} />
          <Insights state={state} model={model} colors={colors} />
          <footer className="footer">
            Alle berekeningen vinden plaats in je browser; er worden geen gegevens verstuurd. Invoer wordt lokaal bewaard.
            Dit is een rekenmodel met constante gemiddelde rendementen – werkelijke rendementen schommelen en resultaten uit het verleden bieden geen garantie voor de toekomst. Belastingen (box 3) en kosten zijn niet apart gemodelleerd.
          </footer>
        </main>
      </div>
    </div>
  );
}
