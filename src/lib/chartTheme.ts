import type { ResolvedTheme } from '../hooks/useTheme';

/**
 * Grafiekkleuren per thema. SVG-attributen in Recharts accepteren geen
 * CSS-variabelen betrouwbaar, daarom worden ze hier als hex opgelost.
 * Categorische volgorde (blauw, oranje, aqua) is gevalideerd op
 * kleurenblindheid-onderscheid in licht én donker.
 */
export const chartColors = {
  light: {
    invest: '#257de0',
    savings: '#f47230',
    total: '#00b894',
    contributed: '#666666',
    grid: '#e7e7e7',
    axis: '#c2c2c2',
    tick: '#666666',
    surface: '#ffffff',
  },
  dark: {
    invest: '#338ced',
    savings: '#e76624',
    total: '#00a888',
    contributed: '#9c9c9c',
    grid: '#303030',
    axis: '#474747',
    tick: '#9c9c9c',
    surface: '#191919',
  },
} as const;

export type ChartColors = (typeof chartColors)[ResolvedTheme];
