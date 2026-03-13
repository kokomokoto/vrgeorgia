'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { CityCombobox } from './CityCombobox';
import TbilisiDistrictSelector from './TbilisiDistrictSelector';

// საქართველოს რეგიონები
const GEORGIAN_REGIONS = [
  { value: 'tbilisi', label: 'თბილისი' },
  { value: 'adjara', label: 'აჭარა' },
  { value: 'imereti', label: 'იმერეთი' },
  { value: 'kakheti', label: 'კახეთი' },
  { value: 'shida_kartli', label: 'შიდა ქართლი' },
  { value: 'kvemo_kartli', label: 'ქვემო ქართლი' },
  { value: 'samegrelo', label: 'სამეგრელო-ზემო სვანეთი' },
  { value: 'guria', label: 'გურია' },
  { value: 'racha', label: 'რაჭა-ლეჩხუმი და ქვემო სვანეთი' },
  { value: 'mtskheta', label: 'მცხეთა-მთიანეთი' },
  { value: 'samtskhe', label: 'სამცხე-ჯავახეთი' },
  { value: 'abkhazia', label: 'აფხაზეთი' }
];

export type FiltersState = {
  q: string;
  minPrice: string;
  maxPrice: string;
  city: string;
  region: string;
  tbilisiDistrict: string;
  tbilisiSubdistricts: string[];
  type: string[]; // მრავალი კატეგორიის არჩევა
  dealType: string;
  has3d: string;
  hasPhotos: string;
  minSqm: string;
  maxSqm: string;
  minRooms: string;
  maxRooms: string;
  amenities: string[]; // კომფორტი და კომუნიკაციები
};

export function Filters({ value, onChange }: { value: FiltersState; onChange: (v: FiltersState) => void }) {
  const { t } = useTranslation();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Default values for SSR
  const labels = {
    filters: mounted ? t('filters') : 'ფილტრები',
    search: mounted ? t('search') : 'ძიება',
    priceMin: mounted ? t('priceMin') : 'მინ. ფასი',
    priceMax: mounted ? t('priceMax') : 'მაქს. ფასი',
    city: mounted ? t('city') : 'ქალაქი',
    region: mounted ? t('region') : 'რეგიონი',
    any: mounted ? t('any') : 'ყველა',
    has3d: mounted ? t('has3d') : '3D აქვს',
    hasPhotos: mounted ? t('hasPhotos') : 'ფოტო აქვს',
    yes: mounted ? t('yes') : 'კი',
    no: mounted ? t('no') : 'არა',
    minSqm: mounted ? t('minSqm') : 'მინ. ფართობი',
    maxSqm: mounted ? t('maxSqm') : 'მაქს. ფართობი',
    minRooms: mounted ? t('minRooms') : 'მინ. ოთახი',
    maxRooms: mounted ? t('maxRooms') : 'მაქს. ოთახი',
    // Property types
    apartment: mounted ? t('apartment') : 'ბინა',
    house: mounted ? t('house') : 'კერძო სახლი',
    commercial: mounted ? t('commercial') : 'კომერციული',
    land: mounted ? t('land') : 'მიწა',
    cottage: mounted ? t('cottage') : 'აგარაკი',
    hotel: mounted ? t('hotel') : 'სასტუმრო',
    building: mounted ? t('building') : 'შენობა',
    warehouse: mounted ? t('warehouse') : 'საწყობი',
    parking: mounted ? t('parking') : 'ავტოფარეხი',
    // Deal types
    sale: mounted ? t('sale') : 'იყიდება',
    rentType: mounted ? t('rentType') : 'ქირავდება',
    mortgageType: mounted ? t('mortgageType') : 'გირავდება',
    daily: mounted ? t('daily') : 'ქირავდება დღიურად',
    under_construction: mounted ? t('under_construction') : 'მშენებარე'
  };

  const set = (k: keyof FiltersState, v: string) => onChange({ ...value, [k]: v });

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4" suppressHydrationWarning>
      <div className="mb-3 text-sm font-semibold text-slate-900">{labels.filters}</div>

      {/* ჰორიზონტალური ლეიაუტი */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        <input
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          placeholder={labels.search}
          value={value.q}
          onChange={(e) => set('q', e.target.value)}
        />

        <input
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          placeholder={labels.priceMin}
          value={value.minPrice}
          onChange={(e) => set('minPrice', e.target.value)}
        />
        <input
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          placeholder={labels.priceMax}
          value={value.maxPrice}
          onChange={(e) => set('maxPrice', e.target.value)}
        />

        <CityCombobox
          value={value.city}
          onChange={(v) => {
            const newValue = { ...value, city: v };
            // თუ თბილისი არაა, გავასუფთავოთ თბილისის უბნები
            if (v.toLowerCase() !== 'თბილისი') {
              newValue.tbilisiDistrict = '';
              newValue.tbilisiSubdistricts = [];
            } else {
              newValue.region = 'tbilisi';
            }
            onChange(newValue);
          }}
          placeholder={labels.city}
        />
        {value.city.toLowerCase() !== 'თბილისი' ? (
          <select
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            value={value.region}
            onChange={(e) => set('region', e.target.value)}
          >
            <option value="">{labels.region}: {labels.any}</option>
            {GEORGIAN_REGIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        ) : (
          <div className="text-sm text-blue-600 flex items-center px-3 bg-blue-50 rounded-md">
            თბილისი არჩეულია
          </div>
        )}

        <select
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
          value={value.dealType}
          onChange={(e) => set('dealType', e.target.value)}
        >
          <option value="">{labels.any}</option>
          <option value="sale">{labels.sale}</option>
          <option value="rent">{labels.rentType}</option>
          <option value="mortgage">{labels.mortgageType}</option>
          <option value="daily">{labels.daily}</option>
          <option value="under_construction">{labels.under_construction}</option>
        </select>

        <select
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
          value={value.has3d}
          onChange={(e) => set('has3d', e.target.value)}
        >
          <option value="">{labels.has3d}: {labels.any}</option>
          <option value="true">{labels.yes}</option>
          <option value="false">{labels.no}</option>
        </select>

        <select
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
          value={value.hasPhotos}
          onChange={(e) => set('hasPhotos', e.target.value)}
        >
          <option value="">{labels.hasPhotos}: {labels.any}</option>
          <option value="true">{labels.yes}</option>
          <option value="false">{labels.no}</option>
        </select>

        <input
          type="number"
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          placeholder={labels.minSqm}
          value={value.minSqm}
          onChange={(e) => set('minSqm', e.target.value)}
        />
        <input
          type="number"
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          placeholder={labels.maxSqm}
          value={value.maxSqm}
          onChange={(e) => set('maxSqm', e.target.value)}
        />
        <input
          type="number"
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          placeholder={labels.minRooms}
          value={value.minRooms}
          onChange={(e) => set('minRooms', e.target.value)}
        />
        <input
          type="number"
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          placeholder={labels.maxRooms}
          value={value.maxRooms}
          onChange={(e) => set('maxRooms', e.target.value)}
        />
      </div>

      {/* თბილისის უბნები - თუ თბილისი არჩეულია */}
      {value.city.toLowerCase() === 'თბილისი' && (
        <div className="mt-3">
          <TbilisiDistrictSelector
            selectedDistrict={value.tbilisiDistrict}
            selectedSubdistricts={value.tbilisiSubdistricts}
            onDistrictChange={(d) => onChange({ ...value, tbilisiDistrict: d })}
            onSubdistrictsChange={(s) => onChange({ ...value, tbilisiSubdistricts: s })}
          />
        </div>
      )}

      {/* კომფორტი და კომუნიკაციები */}
      <div className="mt-3">
        <div className="text-xs text-slate-500 mb-2">კომფორტი:</div>
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'elevator', label: '🛗 ლიფტი' },
            { key: 'furniture', label: '🛋️ ავეჯი' },
            { key: 'internet', label: '📶 ინტერნეტი' },
            { key: 'airConditioner', label: '❄️ კონდიციონერი' },
            { key: 'centralHeating', label: '🔥 გათბობა' },
            { key: 'naturalGas', label: '🔵 აირი' },
            { key: 'garage', label: '🚗 ავტოფარეხი' },
            { key: 'security', label: '🔒 დაცვა' },
            { key: 'pool', label: '🏊 აუზი' },
            { key: 'garden', label: '🌳 ბაღი' },
          ].map(({ key, label }) => {
            const amenities = value.amenities || [];
            const isSelected = amenities.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  const newAmenities = isSelected
                    ? amenities.filter(a => a !== key)
                    : [...amenities, key];
                  onChange({ ...value, amenities: newAmenities });
                }}
                className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                  isSelected
                    ? 'bg-green-100 border-green-500 text-green-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-green-400'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
