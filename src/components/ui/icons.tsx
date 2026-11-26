/** Kleine inline-iconen (stroke volgt currentColor). */
const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export const IconTrend = () => (
  <svg {...base}><path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" /></svg>
);
export const IconPiggy = () => (
  <svg {...base}><path d="M19 10c0-3.3-3.1-6-7-6S5 6.7 5 10c0 1.6.7 3 1.9 4.1L7 18h3v-2h4v2h3l.3-3A5.5 5.5 0 0 0 19 12h2v-2h-2z" /><circle cx="15" cy="9" r=".5" fill="currentColor" /></svg>
);
export const IconCalendar = () => (
  <svg {...base}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>
);
export const IconWallet = () => (
  <svg {...base}><path d="M20 7H5a2 2 0 0 1 0-4h13v4" /><path d="M3 5v14a2 2 0 0 0 2 2h15V7" /><circle cx="16" cy="14" r="1" fill="currentColor" /></svg>
);
export const IconSun = () => (
  <svg {...base}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
);
export const IconMoon = () => (
  <svg {...base}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
);
export const IconMonitor = () => (
  <svg {...base}><rect x="2" y="4" width="20" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></svg>
);
export const IconPlus = () => (
  <svg {...base}><path d="M12 5v14M5 12h14" /></svg>
);
export const IconTrash = () => (
  <svg {...base} width={16} height={16}><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>
);
export const IconReset = () => (
  <svg {...base} width={16} height={16}><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>
);
export const IconLayers = () => (
  <svg {...base}><path d="M12 2l10 5-10 5L2 7z" /><path d="M2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
);
export const IconBulb = () => (
  <svg {...base}><path d="M9 18h6M10 22h4" /><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" /></svg>
);
export const IconWarn = () => (
  <svg {...base} width={14} height={14}><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>
);
export const IconScale = () => (
  <svg {...base}><path d="M12 3v18M7 21h10M5 7h14" /><path d="M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z" /></svg>
);
