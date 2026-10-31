// Sunucu açılır açılmaz kaynakları çekmeye başla; ilk ziyaretçi soğuk önbelleği beklemesin.
// Kalıcı ban / beyaz liste kuralları da burada belleğe yüklenir.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { warmUp } = await import('@/lib/sources');
    warmUp();
    const { loadAccessRules } = await import('@/lib/accessRulesDb');
    void loadAccessRules();
  }
}
