import 'server-only';
import { getDb } from '@/lib/archive';
import { dropRule, putRule, setRules, type AccessKind, type AccessRule } from '@/lib/accessControl';

/*
 * Ban / beyaz liste kurallarının kalıcı tarafı. Veritabanı yoksa kurallar yalnız bellekte
 * yaşar (yeniden başlatınca silinir); admin paneli bunu ayrıca belirtir.
 */

interface Row {
  ip: string;
  kind: AccessKind;
  note: string;
  created_at: Date;
}
const toRule = (r: Row): AccessRule => ({ ip: r.ip, kind: r.kind, note: r.note, createdAt: r.created_at.toISOString() });

/** Açılışta bir kez: kuralları belleğe yükle */
export async function loadAccessRules(): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    const rows = await db<Row[]>`SELECT ip, kind, note, created_at FROM api_access_rules`;
    setRules(rows.map(toRule));
  } catch (err) {
    console.warn(`[erişim kuralları] yüklenemedi: ${err instanceof Error ? err.message : err}`);
  }
}

export async function saveAccessRule(ip: string, kind: AccessKind, note: string): Promise<{ persisted: boolean }> {
  const rule: AccessRule = { ip, kind, note, createdAt: new Date().toISOString() };
  const db = await getDb();
  if (db) {
    await db`
      INSERT INTO api_access_rules (ip, kind, note) VALUES (${ip}, ${kind}, ${note})
      ON CONFLICT (ip) DO UPDATE SET kind = EXCLUDED.kind, note = EXCLUDED.note, created_at = now()`;
  }
  putRule(rule);
  return { persisted: Boolean(db) };
}

export async function deleteAccessRule(ip: string): Promise<void> {
  const db = await getDb();
  if (db) await db`DELETE FROM api_access_rules WHERE ip = ${ip}`;
  dropRule(ip);
}
