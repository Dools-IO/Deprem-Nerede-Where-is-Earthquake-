'use client';

import { useI18n } from '@/i18n/I18nProvider';

/** Tüm sayfaların altındaki ince imza şeridi (yüksekliği 2.25rem; globals.css ve harita bunu hesaba katar) */
export default function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="flex h-9 items-center justify-center border-t border-white/[0.06] bg-ink-950 px-3 text-[11px] text-slate-500">
      <p className="truncate">
        {t.common.productOfBefore}
        <a
          href="https://dools.co"
          target="_blank"
          rel="noopener"
          className="font-semibold text-slate-300 underline-offset-2 transition-colors hover:text-quake-400 hover:underline"
        >
          dools.co
        </a>
        {t.common.productOfAfter}
      </p>
    </footer>
  );
}
