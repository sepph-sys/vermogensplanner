/** Getal- en valutanotatie volgens de Nederlandse locale (nl-NL). */

const eur0 = new Intl.NumberFormat('nl-NL', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const eurCompact = new Intl.NumberFormat('nl-NL', {
  style: 'currency',
  currency: 'EUR',
  notation: 'compact',
  maximumFractionDigits: 1,
});

const pct1 = new Intl.NumberFormat('nl-NL', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** € 12.345 */
export const formatEUR = (v: number) => eur0.format(Math.round(v) || 0);

/** +€ 1.234 / −€ 1.234 */
export const formatEURSigned = (v: number) => {
  const r = Math.round(v) || 0;
  return (r > 0 ? '+' : r < 0 ? '−' : '') + eur0.format(Math.abs(r));
};

/** € 1,2 mln. – voor as-labels */
export const formatEURCompact = (v: number) => eurCompact.format(v);

/** Fractie → "12,3%" */
export const formatPct = (fraction: number) => pct1.format(Number.isFinite(fraction) ? fraction : 0);

/** Fractie → "+12,3%" */
export const formatPctSigned = (fraction: number) =>
  (fraction > 0 ? '+' : '') + formatPct(fraction);

/** Getal → "7,5" */
export const formatNumber = (v: number, decimals = 2) =>
  new Intl.NumberFormat('nl-NL', { maximumFractionDigits: decimals }).format(v);

/** Looptijd in maanden → "30 jaar" / "12 jaar en 6 maanden" */
export function formatDuration(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  const parts: string[] = [];
  if (y) parts.push(`${y} jaar`);
  if (m) parts.push(`${m} ${m === 1 ? 'maand' : 'maanden'}`);
  return parts.join(' en ') || '0 maanden';
}

/**
 * Parseert een door de gebruiker getypt getal. Accepteert zowel "1.234,56"
 * (NL) als "1234.56". Een punt wordt als decimaalteken gezien, tenzij het
 * duidelijk een duizendtalscheiding is (bv. "10.000").
 */
export function parseUserNumber(raw: string): number | null {
  let s = raw.replace(/[€%\s]/g, '').replace(/−/g, '-');
  if (!s) return null;
  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
