'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { switchPath } from '@/lib/i18n';
import { useI18n } from './I18nProvider';

/** Öbür dile geçer ve seçimi çereze yazar (middleware'in tarayıcı diline göre yönlendirmesini kapatır) */
export default function LangSwitch() {
  const { lang, t } = useI18n();
  const to = lang === 'tr' ? 'en' : 'tr';
  // usePathname statik sayfalarda iç yolu (/tr/liste) verebilir; görünen adres tarayıcıdan okunur
  const pathname = usePathname();
  const [href, setHref] = useState(switchPath('/', to));
  useEffect(() => setHref(switchPath(window.location.pathname, to)), [pathname, to]);

  return (
    <a
      href={href}
      hrefLang={to}
      title={t.otherLangTitle}
      onClick={(e) => {
        e.preventDefault();
        document.cookie = `lang=${to}; path=/; max-age=31536000; samesite=lax`;
        // İki dilin kök düzeni ayrı; tam sayfa geçişi gerekir
        window.location.assign(switchPath(window.location.pathname, to) + window.location.search);
      }}
      className="ml-1 rounded-md border border-slate-700 px-2 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white"
    >
      {t.otherLang}
    </a>
  );
}
