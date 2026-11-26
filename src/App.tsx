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
import { DepositsTable } from './components/inputs/DepositsTable';
import { SavingsPanel } from './components/inputs/SavingsPanel';
import { Box3Panel } from './components/inputs/Box3Panel';
import { KpiRow } from './components/dashboard/KpiRow';
import { GrowthChart } from './components/dashboard/GrowthChart';
import { ModuleResults } from './components/dashboard/ModuleResults';
import { ScenarioComparison } from './components/analysis/ScenarioComparison';
import { Insights } from './components/analysis/Insights';
import { Box3Overview } from './components/analysis/Box3Overview';
import { Segmented } from './components/ui/Segmented';
import { Tabs, type TabDef } from './components/ui/Tabs';
import { IconLayers, IconReset, IconScale, IconWallet } from './components/ui/icons';
import { useHashTab } from './hooks/useHashTab';

const STORAGE_KEY = 'vermogensplanner.state.v1';

type TabId = 'dashboard' | 'inleg' | 'belasting';
const TAB_IDS = ['dashboard', 'inleg', 'belasting'] as const;
const TABS: TabDef<TabId>[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <IconLayers /> },
  { id: 'inleg', label: 'Inleg', icon: <IconWallet /> },
  { id: 'belasting', label: 'Belasting', icon: <IconScale /> },
];

export function App() {
  const { mode, setMode, resolved } = useTheme();
  const [state, setState] = usePersistentState<PlannerState>(STORAGE_KEY, createSampleState, hydrateState);
  const colors = chartColors[resolved];
  const [tab, setTab] = useHashTab<TabId>(TAB_IDS, 'dashboard');

  // Eén centrale berekening; alle onderdelen herberekenen direct bij elke wijziging.
  const model = useMemo(() => runModel(state), [state]);

  const patch = <K extends keyof PlannerState>(key: K) => (value: PlannerState[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  const reset = () => {
    if (confirm('Alle invoer vervangen door de voorbeelddata?')) setState(createSampleState());
  };

  return (
    <div className="app">
      <div className="app-header">
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

      <nav className="tabbar">
        <Tabs tabs={TABS} value={tab} onChange={setTab} />
      </nav>
      </div>

      <main className="page" id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === 'dashboard' && (
          <>
            <PeriodPanel period={state.period} onChange={patch('period')} />
            <KpiRow model={model} colors={colors} />
            <GrowthChart model={model} startDate={state.period.startDate} colors={colors} />
            <ModuleResults model={model} colors={colors} />
            <Box3Overview state={state} model={model} colors={colors} />
            <ScenarioComparison state={state} colors={colors} onScenariosChange={patch('scenarios')} />
            <Insights state={state} model={model} colors={colors} />
          </>
        )}

        {tab === 'inleg' && (
          <>
            <TabIntro title="Inleg" text="Maandbudget, verdeling tussen sparen en beleggen, indexatie en incidentele stortingen. Wijzigingen zie je direct terug in het dashboard." />
            <div className="input-grid">
              <BudgetPanel
                budget={state.budget}
                inflation={{ invest: state.invest.inflation, savings: state.savings.inflation }}
                firstMonthly={model.monthlyInvest + model.monthlySavings}
                lastMonthly={model.invest.finalMonthly + model.savings.finalMonthly}
                months={model.invest.months}
                colors={colors}
                onChange={patch('budget')}
              />
              <InvestPanel invest={state.invest} monthly={model.monthlyInvest} autoMonthly={state.budget.autoSplit} onChange={patch('invest')} />
              <SavingsPanel savings={state.savings} monthly={model.monthlySavings} autoMonthly={state.budget.autoSplit} onChange={patch('savings')} />
            </div>
            <DepositsTable
              invest={state.invest.deposits}
              savings={state.savings.deposits}
              ignored={{ invest: model.invest.ignoredDeposits, savings: model.savings.ignoredDeposits }}
              startDate={state.period.startDate}
              colors={colors}
              onChange={(d) => setState((s) => ({ ...s, invest: { ...s.invest, deposits: d.invest }, savings: { ...s.savings, deposits: d.savings } }))}
            />
          </>
        )}

        {tab === 'belasting' && (
          <>
            <TabIntro title="Belasting" text="Instellingen voor box 3. Het effect op je vermogen staat in het dashboard." />
            <Box3Panel box3={state.box3} inflation={state.invest.inflation} onChange={patch('box3')} />
          </>
        )}

        <footer className="footer">
          Alle berekeningen vinden plaats in je browser; er worden geen gegevens verstuurd. Invoer wordt lokaal bewaard.
          Dit is een rekenmodel met constante gemiddelde rendementen – werkelijke rendementen schommelen en resultaten uit het verleden bieden geen garantie voor de toekomst. Box 3 wordt vereenvoudigd berekend met spaargeld en beleggingen als enige bezittingen; fondskosten zijn niet apart gemodelleerd. Geen fiscaal advies.
        </footer>
      </main>
    </div>
  );
}

function TabIntro({ title, text }: { title: string; text: string }) {
  return (
    <div className="tab-intro">
      <h2>{title}</h2>
      <p className="muted">{text}</p>
    </div>
  );
}
