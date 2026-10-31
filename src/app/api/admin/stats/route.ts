import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { snapshot } from '@/lib/accessControl';
import { RATE_LIMITS } from '@/lib/apiPolicy';
import { archiveEnabled } from '@/lib/archive';

export const dynamic = 'force-dynamic';

/** En çok istek atan istemciler (son 24 saat), anlık engeller ve kalıcı kurallar */
export function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const snap = snapshot();
  return NextResponse.json(
    {
      ...snap,
      clients: snap.clients.slice(0, 300),
      totalClients: snap.clients.length,
      limits: RATE_LIMITS,
      persistentRules: archiveEnabled(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
