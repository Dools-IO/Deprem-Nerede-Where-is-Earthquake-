import type { Earthquake, SourceId } from '@/types';
import { SOURCES } from '@/lib/sourceInfo';

export const TERMS = {
  url: '/api-docs#terms',
  summary:
    'Non-commercial use only. Keep each source licence and attribution. Data is provided as is and is not an official warning. / Yalnız ticari olmayan kullanım; her kaynağın lisansını ve atfını koruyun; veri olduğu gibi verilir, resmi uyarı değildir.',
};

/** Yanıttaki kayıtlara katkı veren kaynakların lisans ve atıf bilgileri */
export function licensesFor(list: Earthquake[]) {
  const ids = new Set<SourceId>();
  for (const eq of list) {
    ids.add(eq.source);
    for (const s of eq.alsoReportedBy ?? []) ids.add(s);
  }
  return [...ids].map((id) => {
    const s = SOURCES[id];
    return { id, name: s.fullName, license: s.license, licenseUrl: s.licenseUrl, attribution: s.attribution };
  });
}
