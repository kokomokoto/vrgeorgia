import { Suspense } from 'react';
import MapSearchClient from './MapSearchClient';

export default function MapPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500 dark:bg-zinc-950 dark:text-zinc-400">
          …
        </div>
      }
    >
      <MapSearchClient />
    </Suspense>
  );
}
