// Sunucu açılır açılmaz kaynakları çekmeye başla; ilk ziyaretçi soğuk önbelleği beklemesin
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { warmUp } = await import('@/lib/sources');
    warmUp();
  }
}
