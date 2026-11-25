/**
 * Datumhulpjes op basis van ISO-strings (YYYY-MM-DD).
 *
 * We rekenen bewust niet met `Date`-objecten in lokale tijd: tijdzones en
 * zomertijd kunnen dan een dag verschuiven. Alle rekenwerk gebeurt op
 * jaar/maand/dag-niveau.
 */

export interface YMD {
  y: number;
  m: number; // 1–12
  d: number; // 1–31
}

const pad = (n: number) => String(n).padStart(2, '0');

export function parseISO(s: string): YMD | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

/**
 * Aantal volledige maanden van `from` tot `to` (kan negatief zijn).
 * Voorbeeld: 2027-01-15 → 2027-03-14 = 1, 2027-01-15 → 2027-03-15 = 2.
 */
export function monthDiff(from: string, to: string): number {
  const a = parseISO(from);
  const b = parseISO(to);
  if (!a || !b) return 0;
  let n = (b.y - a.y) * 12 + (b.m - a.m);
  if (b.d < a.d) n -= 1;
  return n;
}

/** Tel `k` maanden op bij een datum; de dag wordt afgekapt op het einde van de maand. */
export function addMonths(iso: string, k: number): string {
  const a = parseISO(iso);
  if (!a) return iso;
  const total = a.y * 12 + (a.m - 1) + k;
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${y}-${pad(m)}-${pad(Math.min(a.d, daysInMonth))}`;
}

export function yearOf(iso: string): number {
  return parseISO(iso)?.y ?? 0;
}

export function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const dateFmt = new Intl.DateTimeFormat('nl-NL', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const monthFmt = new Intl.DateTimeFormat('nl-NL', { month: 'long', year: 'numeric', timeZone: 'UTC' });

function toUTCDate(iso: string): Date | null {
  const a = parseISO(iso);
  return a ? new Date(Date.UTC(a.y, a.m - 1, a.d)) : null;
}

/** "1 jan. 2027" */
export function formatDate(iso: string): string {
  const d = toUTCDate(iso);
  return d ? dateFmt.format(d) : '–';
}

/** "januari 2027" */
export function formatMonth(iso: string): string {
  const d = toUTCDate(iso);
  return d ? monthFmt.format(d) : '–';
}
