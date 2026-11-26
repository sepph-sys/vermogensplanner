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

/** ISO → "01/12/2026" (dd/mm/jjjj), de vaste weergave van alle datumvelden. */
export function formatDMY(iso: string): string {
  const a = parseISO(iso);
  return a ? `${pad(a.d)}/${pad(a.m)}/${a.y}` : '';
}

/** Bestaat deze datum echt (bv. geen 31/02)? */
function validYMD(y: number, m: number, d: number): boolean {
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false;
  if (y < 1000 || y > 9999 || m < 1 || m > 12 || d < 1) return false;
  return d <= new Date(Date.UTC(y, m, 0)).getUTCDate();
}

const toISO = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
/** Tweecijferig jaar → 20xx. */
const fullYear = (s: string) => (s.length <= 2 ? 2000 + Number(s) : Number(s));

/**
 * Herkent een getypte datum en geeft ISO (YYYY-MM-DD) terug, of null.
 *
 * Met scheidingstekens (/ - . of spatie):
 *   - jjjj/mm/dd            als het eerste deel 4 cijfers heeft
 *   - dd/mm/jjjj            standaard (Nederlandse volgorde)
 *   - mm/dd/jjjj            als dd/mm onmogelijk is (bv. 12/31/2030)
 * Zonder scheidingstekens:
 *   - ddmmjjjj (8 cijfers), ddmmjj (6 cijfers); als laatste poging jjjjmmdd.
 */
export function parseUserDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  const parts = s.split(/[/\-.\s]+/).filter(Boolean);
  if (parts.length === 3 && parts.every((p) => /^\d+$/.test(p))) {
    const [a, b, c] = parts;
    if (a.length === 4) {
      const [y, m, d] = [Number(a), Number(b), Number(c)];
      return validYMD(y, m, d) ? toISO(y, m, d) : null;
    }
    if (c.length === 4 || c.length <= 2) {
      const y = fullYear(c);
      if (validYMD(y, Number(b), Number(a))) return toISO(y, Number(b), Number(a)); // dd/mm/jjjj
      if (validYMD(y, Number(a), Number(b))) return toISO(y, Number(a), Number(b)); // mm/dd/jjjj
    }
    return null;
  }

  if (parts.length === 1 && /^\d+$/.test(s)) {
    if (s.length === 8 || s.length === 6) {
      const d = Number(s.slice(0, 2));
      const m = Number(s.slice(2, 4));
      const y = fullYear(s.slice(4));
      if (validYMD(y, m, d)) return toISO(y, m, d);
    }
    if (s.length === 8) {
      const y = Number(s.slice(0, 4));
      const m = Number(s.slice(4, 6));
      const d = Number(s.slice(6, 8));
      if (validYMD(y, m, d)) return toISO(y, m, d);
    }
  }
  return null;
}
