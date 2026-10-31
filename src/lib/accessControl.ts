import { RATE_LIMITS, type RateRule } from '@/lib/apiPolicy';

/*
 * IP başına hız sınırı + elle ban / beyaz liste. Durum süreç belleğinde (globalThis) tutulur:
 * middleware ve admin uçları aynı Node sürecinde çalıştığı için aynı sayaçları görür.
 * Tek sunucu içindir; birden çok örnekte Redis gibi ortak bir depoya taşınmalı.
 * Kalıcı kurallar (ban/izin) veritabanındadır ve açılışta buraya yüklenir (accessRulesDb).
 */

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
/** Bellekte tutulacak en fazla istemci kaydı; aşılınca süresi dolanlar atılır */
const MAX_BUCKETS = 20_000;

export type RuleName = keyof typeof RATE_LIMITS;
export type AccessKind = 'ban' | 'allow';

export interface AccessRule {
  ip: string;
  kind: AccessKind;
  note: string;
  createdAt: string;
}

interface Bucket {
  ip: string;
  scope: RuleName;
  minuteCount: number;
  minuteReset: number;
  dayCount: number;
  dayReset: number;
  /** Sınıra takılıp reddedilen istek sayısı (bu 24 saatlik pencerede) */
  rejected: number;
  lastSeen: number;
  lastPath: string;
}

interface Store {
  buckets: Map<string, Bucket>;
  rules: Map<string, AccessRule>;
  startedAt: number;
}

const g = globalThis as typeof globalThis & { __depremAccess?: Store };
const store: Store = (g.__depremAccess ??= { buckets: new Map(), rules: new Map(), startedAt: Date.now() });

/** Barındırma platformunun eklediği başlıklar; ilk değer istemci IP'sidir */
export function clientIp(headers: Headers): string {
  return headers.get('x-real-ip') ?? headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}

export type Decision =
  | { action: 'allow'; headers: Record<string, string> }
  | { action: 'ban' }
  | { action: 'limit'; daily: boolean; headers: Record<string, string>; retryAfter: number; firstRejection: boolean };

export function checkAccess(ip: string, scope: RuleName, path: string, now = Date.now()): Decision {
  const rule = store.rules.get(ip);
  if (rule?.kind === 'ban') return { action: 'ban' };
  // IP başlıktan okunduğu için "yerel IP" istisnası yok (sahte X-Real-IP ile atlatılabilirdi);
  // healthcheck /api/health üzerinden middleware'de zaten muaf.
  if (rule?.kind === 'allow') return { action: 'allow', headers: {} };

  const limits: RateRule = RATE_LIMITS[scope];
  const key = `${scope}:${ip}`;
  if (store.buckets.size > MAX_BUCKETS) {
    for (const [k, v] of store.buckets) if (v.dayReset < now && v.minuteReset < now) store.buckets.delete(k);
  }
  let b = store.buckets.get(key);
  if (!b) {
    b = { ip, scope, minuteCount: 0, minuteReset: now + MINUTE, dayCount: 0, dayReset: now + DAY, rejected: 0, lastSeen: now, lastPath: path };
    store.buckets.set(key, b);
  }
  if (b.minuteReset < now) {
    b.minuteCount = 0;
    b.minuteReset = now + MINUTE;
  }
  if (b.dayReset < now) {
    b.dayCount = 0;
    b.rejected = 0;
    b.dayReset = now + DAY;
  }
  b.minuteCount++;
  b.dayCount++;
  b.lastSeen = now;
  b.lastPath = path;

  const overDay = limits.perDay !== undefined && b.dayCount > limits.perDay;
  const overMinute = b.minuteCount > limits.perMinute;
  const reset = overDay ? b.dayReset : b.minuteReset;
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(overDay ? limits.perDay : limits.perMinute),
    'X-RateLimit-Remaining': String(overDay ? 0 : Math.max(0, limits.perMinute - b.minuteCount)),
    'X-RateLimit-Reset': new Date(reset).toISOString(),
  };
  if (limits.perDay !== undefined) {
    headers['X-RateLimit-Daily-Limit'] = String(limits.perDay);
    headers['X-RateLimit-Daily-Remaining'] = String(Math.max(0, limits.perDay - b.dayCount));
  }
  if (!overDay && !overMinute) return { action: 'allow', headers };

  b.rejected++;
  return {
    action: 'limit',
    daily: overDay,
    headers,
    retryAfter: Math.ceil((reset - now) / 1000),
    firstRejection: b.minuteCount === limits.perMinute + 1 || b.dayCount === (limits.perDay ?? -1) + 1,
  };
}

/* ---------- Admin ---------- */

export interface ClientStat {
  ip: string;
  scope: RuleName;
  minuteCount: number;
  dayCount: number;
  rejected: number;
  /** Şu an engelliyse engelin kalkacağı an (ISO) */
  blockedUntil: string | null;
  blockedDaily: boolean;
  dayReset: string;
  lastSeen: string;
  lastPath: string;
}

export function snapshot(now = Date.now()): { startedAt: string; clients: ClientStat[]; rules: AccessRule[] } {
  const clients: ClientStat[] = [];
  for (const b of store.buckets.values()) {
    if (b.dayReset < now) continue;
    const limits: RateRule = RATE_LIMITS[b.scope];
    const blockedDaily = limits.perDay !== undefined && b.dayCount > limits.perDay;
    const blockedMinute = b.minuteReset > now && b.minuteCount > limits.perMinute;
    const until = blockedDaily ? b.dayReset : blockedMinute ? b.minuteReset : null;
    clients.push({
      ip: b.ip,
      scope: b.scope,
      minuteCount: b.minuteReset > now ? b.minuteCount : 0,
      dayCount: b.dayCount,
      rejected: b.rejected,
      blockedUntil: until ? new Date(until).toISOString() : null,
      blockedDaily,
      dayReset: new Date(b.dayReset).toISOString(),
      lastSeen: new Date(b.lastSeen).toISOString(),
      lastPath: b.lastPath,
    });
  }
  clients.sort((a, b) => b.dayCount - a.dayCount);
  return {
    startedAt: new Date(store.startedAt).toISOString(),
    clients,
    rules: [...store.rules.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}

/** Bir IP'nin tüm sayaçlarını sıfırlar (engel hemen kalkar) */
export function resetIp(ip: string): number {
  let n = 0;
  for (const [k, b] of store.buckets) {
    if (b.ip === ip) {
      store.buckets.delete(k);
      n++;
    }
  }
  return n;
}

export function setRules(list: AccessRule[]): void {
  store.rules = new Map(list.map((r) => [r.ip, r]));
}
export function putRule(rule: AccessRule): void {
  store.rules.set(rule.ip, rule);
}
export function dropRule(ip: string): void {
  store.rules.delete(ip);
}

/** Admin girişinde kabul edilen IP biçimi (IPv4, IPv6) */
export const isIpLike = (s: string) => s.length <= 64 && /^[0-9a-fA-F:.]+$/.test(s) && /[.:]/.test(s);
