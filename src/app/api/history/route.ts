import { handleHistory } from '@/lib/historyRoute';

export const dynamic = 'force-dynamic';

/** Herkese açık geçmiş: en fazla 7 gün, 500 kayıt, yalnız açık lisanslı kaynaklar */
export const GET = (request: Request) => handleHistory(request, 'public');
