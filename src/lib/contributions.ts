/**
 * Inlegregels: eenmalige en periodieke stortingen naar beleggen of sparen.
 *
 * Elke regel wordt omgezet naar bedragen per simulatiemaand (kasstroom).
 * Conventies (zie docs/FORMULES.md):
 *  - Een storting valt in de simulatiemaand waarin haar datum ligt en wordt
 *    aan het begin van die maand gestort (zelfde regel als voorheen).
 *  - Maandelijks / per kwartaal / per jaar: op de startdatum van de regel en
 *    daarna elke 1 / 3 / 12 maanden, tot en met de einddatum (of het einde
 *    van de looptijd).
 *  - Dagelijks: bedrag × aantal kalenderdagen dat de regel actief is binnen
 *    de simulatiemaand, gestort aan het begin van die maand.
 *  - Indexatie per regel: op elke 'verjaardag' van de startdatum van de regel
 *    stijgt het bedrag met de inflatie van het kalenderjaar dat dan afloopt,
 *    of met een eigen vast percentage.
 */

import { addMonths, monthDiff, parseISO, yearOf } from './dates';

export type Target = 'invest' | 'savings';
export type Frequency = 'once' | 'daily' | 'monthly' | 'quarterly' | 'yearly';
export type IndexMode = 'none' | 'inflation' | 'custom';

export interface Contribution {
  id: string;
  target: Target;
  frequency: Frequency;
  /** Datum (eenmalig) of startdatum (periodiek), ISO. */
  date: string;
  /** Laatste datum (t/m) voor periodieke inleg; null = tot einde looptijd. */
  endDate: string | null;
  amount: number;
  /** Indexatie van periodieke inleg. */
  index: IndexMode;
  /** Eigen indexatiepercentage per jaar (bij index = 'custom'). */
  indexRate: number;
  label?: string;
}

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  once: 'Eenmalig',
  daily: 'Dagelijks',
  monthly: 'Maandelijks',
  quarterly: 'Per kwartaal',
  yearly: 'Per jaar',
};

export const FREQUENCY_UNIT: Record<Frequency, string> = {
  once: '',
  daily: 'per dag',
  monthly: 'per maand',
  quarterly: 'per kwartaal',
  yearly: 'per jaar',
};

const STEP: Partial<Record<Frequency, number>> = { monthly: 1, quarterly: 3, yearly: 12 };

export const isRecurring = (c: Contribution) => c.frequency !== 'once';

/** Gemiddeld bedrag per maand van een periodieke regel (zonder indexatie). */
export function monthlyEquivalent(c: Contribution): number {
  switch (c.frequency) {
    case 'daily':
      return (c.amount * 365.25) / 12;
    case 'monthly':
      return c.amount;
    case 'quarterly':
      return c.amount / 3;
    case 'yearly':
      return c.amount / 12;
    default:
      return 0;
  }
}

const DAY = 86400000;
const utc = (iso: string) => {
  const a = parseISO(iso);
  return a ? Date.UTC(a.y, a.m - 1, a.d) : NaN;
};

export interface Schedule {
  /** Periodieke inleg per simulatiemaand. */
  recurring: number[];
  /** Eenmalige inleg per simulatiemaand. */
  once: number[];
  /** Regels zonder enige storting binnen de looptijd. */
  ignored: Contribution[];
}

/**
 * Zet de regels van één bestemming om naar bedragen per maand.
 * @param inflation inflatie (%) per kalenderjaar, voor indexatie 'inflatie'
 * @param factor vermenigvuldiging van periodieke bedragen (bv. 1,1 = +10%)
 */
export function buildSchedule(
  rows: Contribution[],
  target: Target,
  planStart: string,
  months: number,
  inflation: (year: number) => number,
  factor = 1,
): Schedule {
  const recurring = new Array<number>(months).fill(0);
  const once = new Array<number>(months).fill(0);
  const ignored: Contribution[] = [];
  const planEnd = addMonths(planStart, months);

  for (const c of rows) {
    if (c.target !== target) continue;
    const amount = Number.isFinite(c.amount) ? c.amount : 0;
    if (!amount) continue;

    if (c.frequency === 'once') {
      const m = monthDiff(planStart, c.date);
      if (m >= 0 && m < months) once[m] += amount;
      else ignored.push(c);
      continue;
    }

    // Indexatiefactor na k volle jaren sinds de start van de regel (gecachet).
    const factors = [1];
    const indexAt = (k: number) => {
      if (c.index === 'none' || k <= 0) return 1;
      while (factors.length <= k) {
        const j = factors.length;
        const g = c.index === 'custom' ? c.indexRate : inflation(yearOf(addMonths(c.date, 12 * j - 1)));
        factors.push(factors[j - 1] * (1 + Math.max(g || 0, -99.99) / 100));
      }
      return factors[k];
    };

    const last = c.endDate && c.endDate < planEnd ? c.endDate : null; // t/m
    let hit = false;

    if (c.frequency === 'daily') {
      const from = utc(c.date);
      const to = last ? utc(last) + DAY : utc(planEnd); // exclusief
      for (let m = 0; m < months; m++) {
        const ms = utc(addMonths(planStart, m));
        const me = utc(addMonths(planStart, m + 1));
        const days = Math.round((Math.min(me, to) - Math.max(ms, from)) / DAY);
        if (days <= 0) continue;
        const ref = ms > from ? addMonths(planStart, m) : c.date;
        const k = Math.floor(monthDiff(c.date, ref) / 12);
        recurring[m] += amount * days * indexAt(k) * factor;
        hit = true;
      }
    } else {
      const step = STEP[c.frequency]!;
      for (let k = 0; ; k++) {
        const occ = addMonths(c.date, k * step);
        if (occ >= planEnd || (last && occ > last)) break;
        const m = monthDiff(planStart, occ);
        if (m < 0) continue;
        if (m >= months) break;
        recurring[m] += amount * indexAt(Math.floor((k * step) / 12)) * factor;
        hit = true;
        if (k > 100000) break; // veiligheidsgrens
      }
    }
    if (!hit) ignored.push(c);
  }
  return { recurring, once, ignored };
}

/** Gemiddelde periodieke inleg per maand over de eerste / laatste 12 maanden. */
export function averageMonthly(recurring: number[], which: 'first' | 'last'): number {
  const n = recurring.length;
  if (!n) return 0;
  const len = Math.min(12, n);
  const slice = which === 'first' ? recurring.slice(0, len) : recurring.slice(n - len);
  return slice.reduce((s, v) => s + v, 0) / len;
}
