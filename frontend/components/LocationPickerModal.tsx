'use client';



import React from 'react';

import { createPortal } from 'react-dom';

import { useTranslation } from 'react-i18next';

import { CityDistrictPickerPanel } from '@/components/CityDistrictPickerPanel';

import { CITIES_WITH_DISTRICTS } from '@/components/TbilisiDistrictSelector';

import type { FiltersState } from '@/components/Filters';

import {

  CITY_REGION_MAP,

  GEORGIAN_REGIONS,

  POPULAR_CITIES,

  POPULAR_CITIES_GRID,

  TBILISI_SURROUNDINGS_LABEL,

} from '@/lib/georgiaLocations';



type ModalStep = 'browse' | 'districts';



function SelectionTile({

  label,

  selected,

  onClick,

}: {

  label: string;

  selected: boolean;

  onClick: () => void;

}) {

  return (

    <button

      type="button"

      onClick={onClick}

      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-base transition-colors ${

        selected

          ? 'border-blue-500 bg-blue-50 text-blue-800 dark:border-amber-500 dark:bg-amber-950/40 dark:text-amber-200'

          : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600'

      }`}

    >

      <span

        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${

          selected ? 'border-blue-600 bg-blue-600 dark:border-amber-400 dark:bg-amber-400' : 'border-slate-300 dark:border-zinc-600'

        }`}

        aria-hidden

      >

        {selected ? <span className="h-2 w-2 rounded-full bg-white dark:bg-zinc-900" /> : null}

      </span>

      <span className="min-w-0 truncate">{label}</span>

    </button>

  );

}



export function LocationPickerModal({

  open,

  onClose,

  value,

  onChange,

}: {

  open: boolean;

  onClose: () => void;

  value: FiltersState;

  onChange: (v: FiltersState) => void;

}) {

  const { t } = useTranslation();

  const [mounted, setMounted] = React.useState(false);

  const [search, setSearch] = React.useState('');

  const [step, setStep] = React.useState<ModalStep>('browse');



  React.useEffect(() => setMounted(true), []);



  React.useEffect(() => {

    if (!open) {

      setSearch('');

      setStep('browse');

      return;

    }

    const prev = document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {

      if (e.key === 'Escape') {

        if (step === 'districts') setStep('browse');

        else onClose();

      }

    };

    document.addEventListener('keydown', onKey);

    return () => {

      document.body.style.overflow = prev;

      document.removeEventListener('keydown', onKey);

    };

  }, [open, onClose, step]);



  const q = search.trim().toLowerCase();



  const filteredRegions = GEORGIAN_REGIONS.filter((r) => {

    if (!q) return true;

    const label = t(r.key).toLowerCase();

    return label.includes(q) || r.value.includes(q);

  });



  const allCities = React.useMemo(() => {

    const set = new Set<string>([...POPULAR_CITIES]);

    if (value.city) set.add(value.city);

    return [...set];

  }, [value.city]);



  const filteredCities = allCities.filter((city) => {

    if (!q) return true;

    return city.toLowerCase().includes(q);

  });



  const showSurroundings =

    !q || TBILISI_SURROUNDINGS_LABEL.toLowerCase().includes(q) || 'შემოგარენი'.includes(q);



  const goToDistrictStep = (city: string) => {

    if (CITIES_WITH_DISTRICTS.includes(city)) setStep('districts');

  };



  const applyRegion = (regionValue: string) => {

    const next = { ...value, region: regionValue };

    if (next.city && regionValue) {

      const cityRegion = CITY_REGION_MAP[next.city];

      if (cityRegion && cityRegion !== regionValue) {

        next.city = '';

        next.tbilisiDistrict = '';

        next.tbilisiSubdistricts = [];

      }

    }

    if (regionValue === 'tbilisi' && !next.city) next.city = 'თბილისი';

    onChange(next);

    if (regionValue === 'tbilisi' && next.city === 'თბილისი') goToDistrictStep('თბილისი');

    else if (regionValue !== 'tbilisi') setStep('browse');

  };



  const applyCity = (city: string) => {

    const next = { ...value, city };

    const autoRegion = CITY_REGION_MAP[city] || '';

    if (autoRegion) next.region = autoRegion;

    if (!CITIES_WITH_DISTRICTS.includes(city)) {

      next.tbilisiDistrict = '';

      next.tbilisiSubdistricts = [];

    }

    onChange(next);

    if (CITIES_WITH_DISTRICTS.includes(city)) goToDistrictStep(city);

    else onClose();

  };



  const applySurroundings = () => {

    onChange({

      ...value,

      region: 'tbilisi',

      city: '',

      tbilisiDistrict: '',

      tbilisiSubdistricts: [],

    });

    onClose();

  };



  const clearLocation = () => {

    if (step === 'districts') {

      onChange({

        ...value,

        tbilisiDistrict: '',

        tbilisiSubdistricts: [],

      });

      return;

    }

    onChange({

      ...value,

      city: '',

      region: '',

      tbilisiDistrict: '',

      tbilisiSubdistricts: [],

    });

  };



  const clearCityAndGoBack = () => {

    onChange({

      ...value,

      city: '',

      tbilisiDistrict: '',

      tbilisiSubdistricts: [],

    });

    setStep('browse');

    setSearch('');

  };



  const surroundingsSelected = value.region === 'tbilisi' && !value.city;

  const inDistrictStep = step === 'districts' && CITIES_WITH_DISTRICTS.includes(value.city);



  if (!mounted || !open) return null;



  const gridCities = q

    ? filteredCities

    : [...POPULAR_CITIES_GRID, ...(showSurroundings ? [TBILISI_SURROUNDINGS_LABEL] : [])];



  return createPortal(

    <div

      className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4 md:p-6"

      role="dialog"

      aria-modal="true"

      onClick={onClose}

    >

      <div

        className="relative flex max-h-[min(98vh,980px)] w-full max-w-[96rem] flex-col rounded-t-2xl border border-slate-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 sm:max-h-[min(96vh,960px)] sm:w-[min(99vw,88rem)] sm:rounded-2xl lg:w-[min(98vw,96rem)]"

        onClick={(e) => e.stopPropagation()}

        onMouseDown={(e) => e.stopPropagation()}

      >

        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-6 py-5 dark:border-zinc-800 sm:px-10 sm:py-6">

          <h2 className="text-2xl font-semibold text-slate-900 dark:text-zinc-100">{t('location')}</h2>

          <button

            type="button"

            onClick={onClose}

            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800"

            aria-label={t('close')}

          >

            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>

              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />

            </svg>

          </button>

        </div>



        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 sm:px-10 sm:py-7">

          {inDistrictStep ? (

            <>

              <div className="mb-4 flex flex-wrap items-center gap-2">

                <button

                  type="button"

                  onClick={clearCityAndGoBack}

                  className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-base font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/60"

                >

                  <span>{value.city}</span>

                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>

                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />

                  </svg>

                </button>

              </div>



              <div className="relative mb-5">

                <svg

                  className="pointer-events-none absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-slate-400"

                  fill="none"

                  viewBox="0 0 24 24"

                  stroke="currentColor"

                  aria-hidden

                >

                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />

                </svg>

                <input

                  type="search"

                  value={search}

                  onChange={(e) => setSearch(e.target.value)}

                  placeholder={t('filter_location_search_placeholder')}

                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-5 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"

                  autoFocus

                />

              </div>



              <CityDistrictPickerPanel
                city={value.city}
                search={search}
                selectedDistrict={value.tbilisiDistrict}
                selectedSubdistricts={value.tbilisiSubdistricts}
                onSelectionChange={(district, subdistricts) =>
                  onChange({ ...value, tbilisiDistrict: district, tbilisiSubdistricts: subdistricts })
                }
              />

            </>

          ) : (

            <>

              <div className="relative mb-5">

                <svg

                  className="pointer-events-none absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-slate-400"

                  fill="none"

                  viewBox="0 0 24 24"

                  stroke="currentColor"

                  aria-hidden

                >

                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />

                </svg>

                <input

                  type="search"

                  value={search}

                  onChange={(e) => setSearch(e.target.value)}

                  placeholder={t('filter_location_search_placeholder')}

                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-5 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"

                  autoFocus

                />

              </div>



              {filteredRegions.length > 0 && (

                <section className="mb-6">

                  <h3 className="mb-4 text-base font-semibold text-slate-800 dark:text-zinc-200">{t('filter_regions')}</h3>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">

                    {filteredRegions.map((r) => (

                      <SelectionTile

                        key={r.value}

                        label={t(r.key)}

                        selected={value.region === r.value}

                        onClick={() => applyRegion(value.region === r.value ? '' : r.value)}

                      />

                    ))}

                  </div>

                </section>

              )}



              {gridCities.length > 0 && (

                <section className="mb-6">

                  <h3 className="mb-4 text-base font-semibold text-slate-800 dark:text-zinc-200">{t('filter_popular_cities')}</h3>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-5">

                    {gridCities.map((item) => {

                      if (item === TBILISI_SURROUNDINGS_LABEL) {

                        return (

                          <SelectionTile

                            key={item}

                            label={item}

                            selected={surroundingsSelected}

                            onClick={applySurroundings}

                          />

                        );

                      }

                      return (

                        <SelectionTile

                          key={item}

                          label={item}

                          selected={value.city === item}

                          onClick={() => {

                            if (value.city === item && CITIES_WITH_DISTRICTS.includes(item)) goToDistrictStep(item);

                            else applyCity(item);

                          }}

                        />

                      );

                    })}

                  </div>

                </section>

              )}



              {q && filteredCities.length > 0 && (

                <section className="mb-6">

                  <h3 className="mb-4 text-base font-semibold text-slate-800 dark:text-zinc-200">{t('city')}</h3>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">

                    {filteredCities.map((city) => (

                      <SelectionTile

                        key={city}

                        label={city}

                        selected={value.city === city}

                        onClick={() => {

                          if (value.city === city && CITIES_WITH_DISTRICTS.includes(city)) goToDistrictStep(city);

                          else applyCity(city);

                        }}

                      />

                    ))}

                  </div>

                </section>

              )}

            </>

          )}

        </div>



        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 px-6 py-5 dark:border-zinc-800 sm:px-10 sm:py-6">

          <button

            type="button"

            onClick={clearLocation}

            className="text-base font-medium text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200"

          >

            {t('clear_filters')}

          </button>

          <button

            type="button"

            onClick={onClose}

            className="rounded-xl bg-blue-600 px-8 py-3 text-base font-semibold text-white hover:bg-blue-700 dark:bg-amber-500 dark:text-black dark:hover:bg-amber-400"

          >

            {inDistrictStep ? t('filter_apply') : t('close')}

          </button>

        </div>

      </div>

    </div>,

    document.body

  );

}


