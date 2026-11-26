/**
 * Box 3 (inkomstenbelasting over sparen en beleggen).
 *
 * Twee stelsels, per jaar instelbaar via een tabel met perioden:
 *
 *  1. FORFAITAIR (2026, 2027 – Wet overbruggingsregeling box 3)
 *     - Peildatum 1 januari.
 *     - Fictief rendement = banktegoeden × forfait_bank + beleggingen × forfait_overig
 *     - Grondslag = max(0, vermogen − heffingsvrij vermogen)
 *     - Belastbaar voordeel = fictief rendement × grondslag / vermogen
 *     - Belasting = voordeel × tarief
 *     - Optioneel tegenbewijs: is het werkelijke rendement lager dan het
 *       fictieve, dan wordt het werkelijke rendement gebruikt.
 *
 *  2. WERKELIJK RENDEMENT (beoogd vanaf 2028 – Wet werkelijk rendement box 3)
 *     - Resultaat = rente + waardeverandering (vermogensaanwasbelasting).
 *     - Heffingsvrij resultaat per persoon (wetsvoorstel: € 1.800).
 *     - Negatief resultaat is vooruit te wenden voor zover het de
 *       verliesdrempel (wetsvoorstel: € 500) te boven gaat.
 *     - Belasting = belastbaar resultaat × tarief
 *
 * Jaren na de laatste periode gebruiken de parameters van die periode. Het
 * heffingsvrij vermogen en het heffingsvrij resultaat worden daarbij
 * (optioneel) jaarlijks geïndexeerd met de inflatie:
 *   bedrag_Y = bedrag_laatste · (1 + i)^(Y − jaar_laatste)
 *
 * Bedragen voor fiscale partners worden verdubbeld (heffingsvrij vermogen,
 * heffingsvrij resultaat, verliesdrempel). In het model zijn spaargeld en
 * beleggingen de enige box 3-bezittingen; er zijn geen schulden.
 */

export type Box3System = 'forfaitair' | 'werkelijk';

export interface Box3Period {
  id: string;
  /** Deze parameters gelden vanaf dit kalenderjaar tot de volgende periode. */
  fromYear: number;
  system: Box3System;
  /** Tarief in procenten. */
  taxRate: number;
  // --- forfaitair ---
  /** Heffingsvrij vermogen per persoon. */
  exemptAssets: number;
  /** Forfaitair rendement banktegoeden (%). */
  rateSavings: number;
  /** Forfaitair rendement overige bezittingen, o.a. beleggingen (%). */
  rateOther: number;
  // --- werkelijk rendement ---
  /** Heffingsvrij resultaat per persoon. */
  exemptReturn: number;
  /** Verliesdrempel per persoon: alleen verlies daarboven is verrekenbaar. */
  lossThreshold: number;
}

export interface Box3Config {
  enabled: boolean;
  /** 1 = alleenstaand, 2 = fiscale partners (vrijstellingen verdubbeld). */
  persons: 1 | 2;
  /** Tegenbewijsregeling toepassen in forfaitaire jaren. */
  counterEvidence: boolean;
  /** Heffingsvrije bedragen na de laatste periode indexeren met de inflatie. */
  indexExemptions: boolean;
  periods: Box3Period[];
}

/**
 * Beoogde opbouw (stand november 2026). 2027 en het spaarforfait zijn
 * voorlopig; pas aan zodra de definitieve cijfers bekend zijn.
 */
export const DEFAULT_BOX3_PERIODS: Box3Period[] = [
  { id: 'p2026', fromYear: 2026, system: 'forfaitair', taxRate: 36, exemptAssets: 59357, rateSavings: 1.28, rateOther: 6.0, exemptReturn: 1800, lossThreshold: 500 },
  { id: 'p2027', fromYear: 2027, system: 'forfaitair', taxRate: 36, exemptAssets: 60098, rateSavings: 1.28, rateOther: 6.37, exemptReturn: 1800, lossThreshold: 500 },
  { id: 'p2028', fromYear: 2028, system: 'werkelijk', taxRate: 36, exemptAssets: 60098, rateSavings: 1.28, rateOther: 6.37, exemptReturn: 1800, lossThreshold: 500 },
];

export function createDefaultBox3(): Box3Config {
  return {
    enabled: true,
    persons: 1,
    counterEvidence: true,
    indexExemptions: true,
    periods: DEFAULT_BOX3_PERIODS.map((p) => ({ ...p })),
  };
}

/** Periode die geldt voor `year`: de laatste met fromYear ≤ year (of de eerste). */
export function periodForYear(periods: Box3Period[], year: number): Box3Period | null {
  if (!periods.length) return null;
  const sorted = [...periods].sort((a, b) => a.fromYear - b.fromYear);
  let found = sorted[0];
  for (const p of sorted) if (p.fromYear <= year) found = p;
  return found;
}

/**
 * Parameters die in `year` gelden. Ligt het jaar na de laatst opgegeven
 * periode en staat indexatie aan, dan worden de heffingsvrije bedragen
 * geïndexeerd met `inflationPct` per jaar.
 */
export function effectivePeriod(
  cfg: Box3Config,
  year: number,
  inflationPct: number,
): { period: Box3Period; indexed: boolean } | null {
  const p = periodForYear(cfg.periods, year);
  if (!p) return null;
  const lastFrom = Math.max(...cfg.periods.map((x) => x.fromYear));
  const years = year - lastFrom;
  if (!cfg.indexExemptions || years <= 0 || p.fromYear !== lastFrom || !inflationPct) {
    return { period: p, indexed: false };
  }
  const factor = Math.pow(1 + Math.max(inflationPct, -99.99) / 100, years);
  return {
    period: { ...p, exemptAssets: p.exemptAssets * factor, exemptReturn: p.exemptReturn * factor },
    indexed: true,
  };
}

/** Invoer voor één belastingjaar(-deel), per pot. */
export interface Box3YearInput {
  year: number;
  /** Aantal maanden van dit kalenderjaar binnen de looptijd (1–12). */
  months: number;
  /** Saldo per pot op de peildatum (1 januari, of de startdatum in het eerste jaar). */
  peil: { savings: number; invest: number };
  /** Werkelijk rendement per pot in dit (deel)jaar. */
  actual: { savings: number; invest: number };
}

export interface Box3YearResult {
  year: number;
  system: Box3System;
  months: number;
  /** Vermogen op de peildatum (forfaitair) of werkelijk resultaat (werkelijk). */
  base: number;
  /** Belastbaar voordeel / belastbaar resultaat. */
  taxable: number;
  tax: number;
  /** Verdeling van de belasting over de potten. */
  split: { savings: number; invest: number };
  /** Of de tegenbewijsregeling tot een lagere aanslag leidde. */
  counterEvidenceUsed: boolean;
  /** Verrekenbaar verlies na dit jaar (werkelijk stelsel). */
  lossCarry: number;
  /** Toegepaste vrijstelling (heffingsvrij vermogen of resultaat, alle personen). */
  exemption: number;
  /** Of de vrijstelling met inflatie is geïndexeerd (jaar na laatste periode). */
  indexed: boolean;
}

/** Verdeel `total` over de potten naar rato van hun positieve gewichten. */
function splitPositive(total: number, w: { savings: number; invest: number }) {
  const s = Math.max(w.savings, 0);
  const i = Math.max(w.invest, 0);
  const sum = s + i;
  if (total <= 0 || sum <= 0) return { savings: 0, invest: 0 };
  return { savings: (total * s) / sum, invest: (total * i) / sum };
}

/**
 * Bereken de box 3-belasting voor één kalenderjaar(-deel).
 * `lossCarry` is het verrekenbare verlies uit eerdere jaren (werkelijk stelsel).
 *
 * Deeljaren (eerste/laatste jaar van de looptijd) worden in het forfaitaire
 * stelsel naar rato (maanden/12) belast; in het werkelijke stelsel wordt het
 * werkelijk behaalde resultaat in dat deel van het jaar belast.
 */
export function box3Tax(
  cfg: Box3Config,
  input: Box3YearInput,
  lossCarry: number,
  /** Inflatie (%) voor indexatie van de heffingsvrije bedragen. */
  inflationPct = 0,
): Box3YearResult | null {
  const eff = effectivePeriod(cfg, input.year, inflationPct);
  if (!eff) return null;
  const p = eff.period;
  const indexed = eff.indexed;
  const persons = cfg.persons;
  const rate = Math.max(p.taxRate, 0) / 100;
  const fraction = input.months / 12;
  const actualTotal = input.actual.savings + input.actual.invest;

  if (p.system === 'forfaitair') {
    const assets = Math.max(input.peil.savings, 0) + Math.max(input.peil.invest, 0);
    const fictive = {
      savings: Math.max(input.peil.savings, 0) * (p.rateSavings / 100) * fraction,
      invest: Math.max(input.peil.invest, 0) * (p.rateOther / 100) * fraction,
    };
    const fictiveTotal = fictive.savings + fictive.invest;
    const grondslag = Math.max(assets - p.exemptAssets * persons, 0);
    const ratio = assets > 0 ? grondslag / assets : 0;

    let benefit = fictiveTotal;
    let weights = fictive;
    let counterEvidenceUsed = false;
    if (cfg.counterEvidence && actualTotal < fictiveTotal && grondslag > 0) {
      benefit = Math.max(actualTotal, 0);
      weights = input.actual;
      counterEvidenceUsed = true;
    }
    const taxable = Math.max(benefit * ratio, 0);
    const tax = taxable * rate;
    return {
      year: input.year,
      system: 'forfaitair',
      months: input.months,
      base: assets,
      taxable,
      tax,
      split: splitPositive(tax, weights),
      counterEvidenceUsed,
      lossCarry, // verliezen uit het werkelijke stelsel blijven staan
      exemption: p.exemptAssets * persons,
      indexed,
    };
  }

  // Werkelijk rendement
  let carry = lossCarry;
  let taxable = 0;
  if (actualTotal >= 0) {
    const afterExempt = Math.max(actualTotal - p.exemptReturn * persons, 0);
    const offset = Math.min(carry, afterExempt);
    carry -= offset;
    taxable = afterExempt - offset;
  } else {
    carry += Math.max(-actualTotal - p.lossThreshold * persons, 0);
  }
  const tax = taxable * rate;
  return {
    year: input.year,
    system: 'werkelijk',
    months: input.months,
    base: actualTotal,
    taxable,
    tax,
    split: splitPositive(tax, input.actual),
    counterEvidenceUsed: false,
    lossCarry: carry,
    exemption: p.exemptReturn * persons,
    indexed,
  };
}
