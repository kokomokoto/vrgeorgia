'use client';

import React from 'react';
import { preloadSavedLanguage } from '@/lib/i18n';

import { AuthProvider } from '@/components/AuthProvider';
import { BrandingProvider } from '@/components/BrandingProvider';
import { CompareProvider } from '@/components/CompareProvider';
import { DisplayCurrencyProvider } from '@/components/DisplayCurrencyProvider';
import { ThemeProvider } from '@/components/ThemeProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  // EN/RU ბანდლი hydration-ის შემდეგ იტვირთება — სერვერის (ka) HTML და პირველი
  // კლიენტური რენდერი ემთხვევა, შემდეგ ტექსტები შენახულ ენაზე გადაირთვება.
  React.useEffect(() => {
    void preloadSavedLanguage();
  }, []);

  return (
    <ThemeProvider>
      <DisplayCurrencyProvider>
        <AuthProvider>
          <BrandingProvider>
            <CompareProvider>{children}</CompareProvider>
          </BrandingProvider>
        </AuthProvider>
      </DisplayCurrencyProvider>
    </ThemeProvider>
  );
}
