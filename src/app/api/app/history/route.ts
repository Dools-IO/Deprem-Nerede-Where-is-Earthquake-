import { handleHistory } from '@/lib/historyRoute';

export const dynamic = 'force-dynamic';

/** Sitenin geçmiş sayfası: 31 gün, tüm kaynaklar. Dışarıdan çağrılamaz, bkz. middleware. */
export const GET = (request: Request) => handleHistory(request, 'app');
