import { useCallback, useEffect, useState } from 'react';

/**
 * Actief tabblad gekoppeld aan de URL-hash (#dashboard, #inleg, #belasting),
 * zodat terugknop en directe links werken.
 */
export function useHashTab<T extends string>(ids: readonly T[], fallback: T) {
  const read = useCallback((): T => {
    const h = decodeURIComponent(window.location.hash.slice(1)) as T;
    return ids.includes(h) ? h : fallback;
  }, [ids, fallback]);

  const [tab, setTab] = useState<T>(read);

  useEffect(() => {
    const onHash = () => setTab(read());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [read]);

  const select = useCallback((id: T) => {
    setTab(id);
    if (window.location.hash.slice(1) !== id) window.location.hash = id;
    window.scrollTo({ top: 0 });
  }, []);

  return [tab, select] as const;
}
