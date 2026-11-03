import { Suspense } from 'react';
import MapSearchClient from './MapSearchClient';
import { getRequestLang } from '@/lib/serverLang';

const INTRO = {
  ka: {
    h1: 'უძრავი ქონების ძიება რუკაზე — თბილისი, ბათუმი, საქართველო',
    p: 'ბინები, სახლები და კომერციული ფართები იყიდება და ქირავდება რუკაზე. გაფილტრეთ ქალაქით, უბნით, ფასით ან 3D ტურით.',
  },
  en: {
    h1: 'Real-estate map search — Tbilisi, Batumi, Georgia',
    p: 'Apartments, houses and commercial space for sale and rent on the map. Filter by city, district, price or 3D tour.',
  },
  ru: {
    h1: 'Поиск недвижимости на карте — Тбилиси, Батуми, Грузия',
    p: 'Квартиры, дома и коммерция — продажа и аренда на карте. Фильтр по городу, району, цене или 3D-туру.',
  },
} as const;

export default async function MapPage() {
  const lang = await getRequestLang();
  const c = INTRO[lang];
  return (
    <>
      <header className="border-b border-slate-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-base font-semibold text-slate-900 dark:text-zinc-50 sm:text-lg">{c.h1}</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-zinc-400">{c.p}</p>
      </header>
      <Suspense
        fallback={
          <div className="flex min-h-[70vh] items-center justify-center bg-slate-50 text-slate-500 dark:bg-zinc-950 dark:text-zinc-400">
            {c.h1}
          </div>
        }
      >
        <MapSearchClient />
      </Suspense>
    </>
  );
}
