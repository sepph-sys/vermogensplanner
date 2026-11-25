import { useEffect, useState } from 'react';

/**
 * useState dat de waarde in localStorage bewaart. Alle toegang zit in
 * try/catch: in een privévenster of met geblokkeerde opslag werkt de app
 * gewoon verder, alleen zonder te onthouden.
 */
export function usePersistentState<T>(
  key: string,
  initial: () => T,
  hydrate: (raw: unknown) => T = (raw) => raw as T,
) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) return hydrate(JSON.parse(stored));
    } catch {
      /* opslag niet beschikbaar of ongeldige JSON */
    }
    return initial();
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* negeren */
    }
  }, [key, value]);

  return [value, setValue] as const;
}
