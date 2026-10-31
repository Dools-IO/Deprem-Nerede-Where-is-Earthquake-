'use client';

import { useEffect, useState } from 'react';

/** Sunucu ile istemci saati farklı olacağı için ilk render'da null döner */
export function useNow(intervalMs = 15_000): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
