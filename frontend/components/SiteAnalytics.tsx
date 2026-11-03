'use client';

import React from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { GoogleAnalytics, sendGAEvent } from '@next/third-parties/google';
import { classifyReferrer } from '@/lib/referrerSource';

/**
 * Site-wide analytics (audit: "no analytics installed").
 *
 * - GA4 is loaded only when NEXT_PUBLIC_GA_ID is set (env-gated, no vendor code otherwise).
 * - Tracks SPA route changes as page_view (App Router does not reload the document).
 * - Classifies the referrer once per session and reports AI assistants
 *   (ChatGPT, Perplexity, Claude, Gemini, Copilot…) as a dedicated dimension so
 *   AI-driven traffic is visible separately from organic search.
 */
const GA_ID = process.env.NEXT_PUBLIC_GA_ID?.trim() || '';
const SESSION_KEY = 'vh_ref_src_sent';

function AnalyticsEvents() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const first = React.useRef(true);

  React.useEffect(() => {
    if (!GA_ID) return;
    const query = searchParams?.toString();
    const pagePath = query ? `${pathname}?${query}` : pathname;
    // GA4's own config fires the first page_view; only SPA navigations need manual events.
    if (first.current) {
      first.current = false;
    } else {
      sendGAEvent('event', 'page_view', {
        page_path: pagePath,
        page_location: window.location.href,
        page_title: document.title,
      });
    }
  }, [pathname, searchParams]);

  React.useEffect(() => {
    if (!GA_ID) return;
    try {
      if (window.sessionStorage.getItem(SESSION_KEY)) return;
      const source = classifyReferrer(document.referrer, window.location.search);
      window.sessionStorage.setItem(SESSION_KEY, '1');
      sendGAEvent('event', 'session_source', {
        traffic_source: source.kind,
        traffic_source_name: source.name,
        referrer_host: source.host,
      });
      if (source.kind === 'ai') {
        sendGAEvent('event', 'ai_referral', {
          ai_assistant: source.name,
          referrer_host: source.host,
          landing_page: pathname,
        });
      }
    } catch {
      /* storage blocked — ignore */
    }
    // once per session
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export function SiteAnalytics({ nonce }: { nonce?: string }) {
  if (!GA_ID) return null;
  return (
    <>
      <GoogleAnalytics gaId={GA_ID} nonce={nonce} />
      <React.Suspense fallback={null}>
        <AnalyticsEvents />
      </React.Suspense>
    </>
  );
}
