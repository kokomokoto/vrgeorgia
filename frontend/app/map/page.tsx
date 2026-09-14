import { Suspense } from 'react';
import MapSearchClient from './MapSearchClient';

export default function MapPage() {
  return (
    <>
      <h1 className="absolute h-px w-px overflow-hidden whitespace-nowrap border-0 p-0 [clip:rect(0,0,0,0)]">
        უძრავი ქონების ძიება რუკაზე — Vhome
      </h1>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500 dark:bg-zinc-950 dark:text-zinc-400">
            …
          </div>
        }
      >
        <MapSearchClient />
      </Suspense>
    </>
  );
}
