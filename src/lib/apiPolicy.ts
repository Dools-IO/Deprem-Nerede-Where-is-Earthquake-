/*
 * Herkese açık API kuralları: tek yerde tanımlanır; middleware, uç noktalar ve
 * /api-docs sayfası buradan okur. Değeri değiştirmek için yalnız bu dosya düzenlenir.
 */

export interface RateRule {
  perMinute: number;
  /** Günlük üst sınır (UTC gününe göre değil, ilk istekten itibaren 24 saat) */
  perDay?: number;
}

export const RATE_LIMITS = {
  /** Dış istemciler: /api/earthquakes, /api/v1/* */
  public: { perMinute: 10, perDay: 300 },
  /** Dış istemciler: /api/history (veritabanına gider, daha sıkı) */
  publicHistory: { perMinute: 3, perDay: 50 },
  /** Sitenin kendi sayfaları (/api/app/*): aynı ağdaki birçok ziyaretçiyi kaldıracak kadar geniş */
  app: { perMinute: 60 },
  appHistory: { perMinute: 20 },
  /** /api/admin/*: şifre denemesini yavaşlatmak için */
  admin: { perMinute: 20 },
} satisfies Record<string, RateRule>;

/** Dış istemcinin tek yanıtta alabileceği en fazla kayıt */
export const PUBLIC_MAX_RECORDS = 500;
/** Dış istemcinin geçmiş sorgusunda en geniş aralık (gün) */
export const PUBLIC_HISTORY_MAX_DAYS = 7;
/** Kullanım şartlarında istenen en kısa yoklama aralığı (sn) */
export const MIN_POLL_SECONDS = 60;

export const CACHE = {
  /** Herkese açık canlı uçlar: CDN 60 sn, sonra 2 dk eski yanıtla arkada yenile */
  publicLive: 'public, max-age=30, s-maxage=60, stale-while-revalidate=120',
  /** Geçmişte kalmış aralık değişmez */
  historySettled: 'public, max-age=600, s-maxage=600',
  historyRecent: 'public, max-age=60, s-maxage=60, stale-while-revalidate=120',
  /** Sitenin kendi akışı: harita 30 sn'de bir yeniler */
  appLive: 'public, max-age=15, s-maxage=30, stale-while-revalidate=60',
  none: 'no-store',
} as const;
