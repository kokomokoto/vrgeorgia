'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { tourFetch } from '@/lib/tourApi';

function EmbedInner() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const userId = searchParams.get('userId') || searchParams.get('uid');
  const sessionId = searchParams.get('session');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await tourFetch('/api/tours', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'VR Georgia listing tour',
            created_by_user_id: userId || undefined,
          }),
        });
        if (!res.ok) throw new Error('Failed to create tour');
        const tour = await res.json();
        if (!alive) return;
        const params = new URLSearchParams({ embed: '1' });
        if (sessionId) params.set('session', sessionId);
        window.location.replace(`/tours/${tour.id}/edit?${params.toString()}`);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : 'Error');
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId, sessionId]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-zinc-950 text-zinc-300">
      <p className="text-lg font-medium">360° ტურის ასაწყობი იტვირთება…</p>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}

/** VR Georgia ატვირთვიდან იხსნება — ახალი ტური იქმნება და რედაქტორში გადადის */
export default function EmbedPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-zinc-950 text-zinc-300">
          <p className="text-lg font-medium">360° ტურის ასაწყობი იტვირთება…</p>
        </div>
      }
    >
      <EmbedInner />
    </Suspense>
  );
}
