'use client';

import { useEffect, useRef, useState } from 'react';
import type { Earthquake } from '@/types';
import { emscFeatureToEarthquake } from '@/lib/sources/parsers';

const EMSC_WS_URL = 'wss://www.seismicportal.eu/standing_order/websocket';

export type LiveStatus = 'connecting' | 'live' | 'offline';

/**
 * EMSC'nin resmi WebSocket akışı: dünya genelindeki her yeni/güncellenen
 * deprem saniyeler içinde gelir. Bağlantı koparsa artan aralıklarla yeniden bağlanır.
 */
export function useEmscLive(onEvent: (eq: Earthquake) => void): LiveStatus {
  const [status, setStatus] = useState<LiveStatus>('connecting');
  const handler = useRef(onEvent);
  handler.current = onEvent;

  useEffect(() => {
    let ws: WebSocket | null = null;
    let retry = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let closed = false;

    const connect = () => {
      setStatus('connecting');
      try {
        ws = new WebSocket(EMSC_WS_URL);
      } catch {
        scheduleReconnect();
        return;
      }
      ws.onopen = () => {
        retry = 0;
        setStatus('live');
      };
      ws.onmessage = (msg) => {
        try {
          const parsed = JSON.parse(typeof msg.data === 'string' ? msg.data : '');
          const eq = emscFeatureToEarthquake(parsed?.data);
          if (eq) handler.current(eq);
        } catch {
          // bozuk mesajı yok say
        }
      };
      ws.onclose = () => {
        if (!closed) scheduleReconnect();
      };
      ws.onerror = () => ws?.close();
    };

    const scheduleReconnect = () => {
      setStatus('offline');
      const delay = Math.min(60_000, 2_000 * 2 ** retry++);
      timer = setTimeout(connect, delay);
    };

    connect();
    return () => {
      closed = true;
      clearTimeout(timer);
      ws?.close();
    };
  }, []);

  return status;
}
