'use client';

import { useEffect, useState } from 'react';

/** VR Georgia ატვირთვიდან იხსნება — ახალი ტური იქმნება და რედაქტორში გადადის */
export default function EmbedPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/tours', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'VR Georgia listing tour' }),
        });
        if (!res.ok) throw new Error('Failed to create tour');
        const tour = await res.json();
        if (!alive) return;
        window.location.replace(`/tours/${tour.id}/edit?embed=1`);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : 'Error');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-zinc-950 text-zinc-300">
      <p className="text-lg font-medium">360° ტურის ასაწყობი იტვირთება…</p>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
