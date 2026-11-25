import { useEffect, useState } from 'react';
import { usePersistentState } from './usePersistentState';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const query = '(prefers-color-scheme: dark)';

/** Licht/donker/systeem. Zet `data-theme` op <html>; CSS-tokens volgen daaruit. */
export function useTheme() {
  const [mode, setMode] = usePersistentState<ThemeMode>('vermogensplanner.theme', () => 'system');
  const [systemDark, setSystemDark] = useState(() =>
    typeof matchMedia === 'function' ? matchMedia(query).matches : false,
  );

  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const mq = matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const resolved: ResolvedTheme = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;

  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
  }, [resolved]);

  return { mode, setMode, resolved };
}
