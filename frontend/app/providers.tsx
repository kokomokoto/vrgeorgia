'use client';

import '@/lib/i18n';

import { AuthProvider } from '@/components/AuthProvider';
import { CompareProvider } from '@/components/CompareProvider';
import { DisplayCurrencyProvider } from '@/components/DisplayCurrencyProvider';
import { ThemeProvider } from '@/components/ThemeProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <DisplayCurrencyProvider>
        <AuthProvider>
          <CompareProvider>{children}</CompareProvider>
        </AuthProvider>
      </DisplayCurrencyProvider>
    </ThemeProvider>
  );
}
