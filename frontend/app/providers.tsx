'use client';

import React from 'react';
import { I18nextProvider } from 'react-i18next';
import { usePathname } from 'next/navigation';
import {
  DEFAULT_LANG,
  applyInitialLanguage,
  changeAppLanguage,
  createRequestI18n,
  readSavedLang,
  type SupportedLang,
} from '@/lib/i18n';
import { langFromPathname, writeLangCookie } from '@/lib/siteLang';

import { AuthProvider } from '@/components/AuthProvider';
import { BrandingProvider } from '@/components/BrandingProvider';
import { CompareProvider } from '@/components/CompareProvider';
import { DisplayCurrencyProvider } from '@/components/DisplayCurrencyProvider';
import { ThemeProvider } from '@/components/ThemeProvider';

type Props = {
  children: React.ReactNode;
  /** Language resolved by the middleware for this request (URL prefix → cookie → ka). */
  initialLang: SupportedLang;
  /** EN/RU bundle loaded on the server so the first HTML is already translated. */
  initialResources?: Record<string, string> | null;
};

export function Providers({ children, initialLang, initialResources }: Props) {
  const pathname = usePathname();

  // Server: per-request clone. Client: shared singleton switched to the server
  // language *before* the first render → server HTML === first client render.
  const [i18nInstance] = React.useState(() =>
    typeof window === 'undefined'
      ? createRequestI18n(initialLang, initialResources)
      : applyInitialLanguage(initialLang, initialResources)
  );

  // One-time migration for visitors whose preference lived only in localStorage
  // (before the cookie existed). URL prefix always wins.
  React.useEffect(() => {
    if (langFromPathname(pathname || '/')) {
      writeLangCookie(initialLang);
      return;
    }
    const saved = readSavedLang();
    if (saved !== initialLang && saved !== DEFAULT_LANG) {
      void changeAppLanguage(saved);
    } else {
      writeLangCookie(initialLang);
    }
    // Only on mount — later changes go through LanguageSwitcher.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <I18nextProvider i18n={i18nInstance}>
      <ThemeProvider>
        <DisplayCurrencyProvider>
          <AuthProvider>
            <BrandingProvider>
              <CompareProvider>{children}</CompareProvider>
            </BrandingProvider>
          </AuthProvider>
        </DisplayCurrencyProvider>
      </ThemeProvider>
    </I18nextProvider>
  );
}
