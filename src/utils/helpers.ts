/**
 * Verilen string için benzersiz ID oluşturur
 */
export function generateId(text: string): string {
  // UUID benzeri bir format oluştur
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  
  // Text'ten hash oluştur
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const textHash = Math.abs(hash).toString(36);
  
  // Timestamp + random + text hash kombinasyonu
  return `${timestamp}-${randomStr}-${textHash}`;
}

/**
 * Tarih ve saati formatlı olarak döndürür
 */
export function formatDateTime(date: Date | null | undefined): string {
  if (!date) return '-';
  
  try {
    return date.toLocaleString('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  } catch {
    return '-';
  }
}

/**
 * Mesafeyi kilometre formatında gösterir
 */
export function formatDepth(depth: number | null | undefined): string {
  if (depth === null || depth === undefined) return '-';
  try {
    return `${depth.toFixed(1)} km`;
  } catch {
    return '-';
  }
}

/**
 * Büyüklüğü formatlı bir şekilde gösterir
 */
export function formatMagnitude(magnitude: number | null | undefined): string {
  if (magnitude === null || magnitude === undefined) return '-';
  try {
    return magnitude.toFixed(1);
  } catch {
    return '-';
  }
}

/**
 * Magnitude değerine göre renk döndürür
 */
export function getMagnitudeColor(magnitude: number | null | undefined): string {
  if (magnitude === null || magnitude === undefined) return 'bg-gray-500';
  
  try {
    if (magnitude < 2) return 'bg-green-500';
    if (magnitude < 3) return 'bg-lime-500';
    if (magnitude < 4) return 'bg-yellow-500';
    if (magnitude < 5) return 'bg-orange-500';
    if (magnitude < 6) return 'bg-red-500';
    return 'bg-purple-500';
  } catch {
    return 'bg-gray-500';
  }
} 