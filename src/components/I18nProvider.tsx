'use client';

import { createContext, useContext } from 'react';
import { DICTS, type Dict, type Lang } from '@/lib/i18n';

const LangContext = createContext<Lang>('tr');

export function I18nProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

/** Geçerli dil ve sözlüğü */
export function useI18n(): { lang: Lang; t: Dict } {
  const lang = useContext(LangContext);
  return { lang, t: DICTS[lang] };
}
