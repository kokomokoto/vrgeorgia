'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { CityCombobox } from './CityCombobox';
import TbilisiDistrictSelector, { CITIES_WITH_DISTRICTS } from './TbilisiDistrictSelector';

// საქართველოს რეგიონები
const GEORGIAN_REGIONS = [
  { value: 'tbilisi', key: 'region_tbilisi' },
  { value: 'adjara', key: 'region_adjara' },
  { value: 'imereti', key: 'region_imereti' },
  { value: 'kakheti', key: 'region_kakheti' },
  { value: 'shida_kartli', key: 'region_shida_kartli' },
  { value: 'kvemo_kartli', key: 'region_kvemo_kartli' },
  { value: 'samegrelo', key: 'region_samegrelo' },
  { value: 'guria', key: 'region_guria' },
  { value: 'racha', key: 'region_racha' },
  { value: 'mtskheta', key: 'region_mtskheta' },
  { value: 'samtskhe', key: 'region_samtskhe' },
  { value: 'abkhazia', key: 'region_abkhazia' }
];

// ქალაქი → რეგიონი mapping
const CITY_REGION_MAP: Record<string, string> = {
  'თბილისი': 'tbilisi',
  'ბათუმი': 'adjara',
  'ქობულეთი': 'adjara',
  'ქუთაისი': 'imereti',
  'ზესტაფონი': 'imereti',
  'სამტრედია': 'imereti',
  'წყალტუბო': 'imereti',
  'საჩხერე': 'imereti',
  'ჭიათურა': 'imereti',
  'ტყიბული': 'imereti',
  'რუსთავი': 'kvemo_kartli',
  'მარნეული': 'kvemo_kartli',
  'ბოლნისი': 'kvemo_kartli',
  'გარდაბანი': 'kvemo_kartli',
  'თეთრიწყარო': 'kvemo_kartli',
  'დმანისი': 'kvemo_kartli',
  'წალკა': 'kvemo_kartli',
  'გორი': 'shida_kartli',
  'კასპი': 'shida_kartli',
  'ხაშური': 'shida_kartli',
  'ზუგდიდი': 'samegrelo',
  'ფოთი': 'samegrelo',
  'სენაკი': 'samegrelo',
  'თელავი': 'kakheti',
  'გურჯაანი': 'kakheti',
  'საგარეჯო': 'kakheti',
  'სიღნაღი': 'kakheti',
  'დედოფლისწყარო': 'kakheti',
  'ლაგოდეხი': 'kakheti',
  'ახალციხე': 'samtskhe',
  'ბორჯომი': 'samtskhe',
  'მცხეთა': 'mtskheta',
  'ოზურგეთი': 'guria',
};

// გარიგების ტიპები
const DEAL_TYPES = [
  { value: 'sale', key: 'deal_sale', icon: '💰' },
  { value: 'rent', key: 'deal_rent', icon: '🔑' },
  { value: 'mortgage', key: 'deal_mortgage', icon: '🏦' },
];

export type FiltersState = {
  q: string;
  minPrice: string;
  maxPrice: string;
  priceCurrency: string;
  priceType: string;
  city: string;
  region: string;
  tbilisiDistrict: string;
  tbilisiSubdistricts: string[];
  type: string[];
  dealType: string[];
  has3d: string;
  hasPhotos: string;
  minSqm: string;
  maxSqm: string;
  minConstructionYear: string;
  maxConstructionYear: string;
  minRenovationYear: string;
  maxRenovationYear: string;
  rooms: string[];
  bedrooms: string[];
  /** აივნების რაოდენობა — backend: balcony $in */
  balconies: string[];
  amenities: string[];
  buildingProject: string[];
  renovationStatus: string[];
  propertyId: string;
};

// Dropdown wrapper component
function FilterDropdown({ label, summary, children, isActive }: {
  label: string;
  summary: string;
  children: React.ReactNode;
  isActive: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm transition-all ${
          isActive
            ? 'border-blue-400 bg-blue-50 text-blue-700 dark:border-amber-500/60 dark:bg-amber-950/35 dark:text-amber-300'
            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600'
        }`}
      >
        <div className="text-left min-w-0">
          <div className="text-[10px] uppercase tracking-wide text-slate-400 font-medium dark:text-zinc-500">{label}</div>
          <div className={`truncate font-medium ${isActive ? 'text-blue-700 dark:text-amber-300' : 'text-slate-800 dark:text-zinc-100'}`}>{summary}</div>
        </div>
        <svg className={`w-4 h-4 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 z-30 mt-1 rounded-lg border border-slate-200 bg-white p-3 shadow-lg min-w-[280px] dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-black/40">
          {children}
        </div>
      )}
    </div>
  );
}

export function Filters({ value, onChange }: { value: FiltersState; onChange: (v: FiltersState) => void }) {
  const { t } = useTranslation();
  const [mounted, setMounted] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatches from i18n keys during SSR.
  // Render a stable shell first, then render translated interactive UI after mount.
  if (!mounted) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3 md:p-4 dark:border-zinc-700 dark:bg-zinc-900" suppressHydrationWarning>
        <button
          type="button"
          className="md:hidden w-full flex items-center justify-between gap-2 text-sm font-semibold text-slate-700 dark:text-zinc-200"
        >
          <div className="flex items-center gap-2">
            <span>🔍</span>
            <span>ფილტრები</span>
          </div>
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div className="hidden md:block text-sm text-slate-500 dark:text-zinc-400">ფილტრები იტვირთება...</div>
      </div>
    );
  }

  // აქტიური ფილტრების რაოდენობა (badge-სთვის)
  const activeFilterCount = [
    value.q,
    value.propertyId,
    value.minPrice,
    value.maxPrice,
    value.priceCurrency,
    value.priceType,
    value.city,
    value.region,
    value.tbilisiDistrict,
    value.has3d === 'true' ? '1' : '',
    value.hasPhotos === 'true' ? '1' : '',
    value.minSqm,
    value.maxSqm,
    value.minConstructionYear,
    value.maxConstructionYear,
    value.minRenovationYear,
    value.maxRenovationYear,
  ].filter(Boolean).length
    + value.dealType.length
    + value.type.length
    + value.rooms.length
    + value.bedrooms.length
    + (value.tbilisiSubdistricts?.length || 0)
    + (value.amenities?.length || 0)
    + value.renovationStatus.length
    + value.balconies.length;

  const labels = {
    filters: mounted ? t('filters') : 'ფილტრები',
    search: mounted ? t('search') : 'ძიება',
    city: mounted ? t('city') : 'ქალაქი',
    region: mounted ? t('region') : 'რეგიონი',
    any: mounted ? t('any') : 'ყველა',
  };

  const set = (k: keyof FiltersState, v: string) => onChange({ ...value, [k]: v });

  const priceSummary = () => {
    const sym = value.priceCurrency === 'GEL' ? '₾' : '$';
    const suffix = value.priceType === 'per_sqm' ? `/${t('filter_per_sqm')}` : '';
    if (value.minPrice && value.maxPrice) return `${sym}${Number(value.minPrice).toLocaleString()} – ${sym}${Number(value.maxPrice).toLocaleString()}${suffix}`;
    if (value.minPrice) return `${sym}${Number(value.minPrice).toLocaleString()}+${suffix}`;
    if (value.maxPrice) return `${sym}${Number(value.maxPrice).toLocaleString()} ${t('filter_up_to')}${suffix}`;
    return labels.any;
  };

  const roomsSummary = () => {
    const parts: string[] = [];
    if (value.rooms.length) parts.push(`${value.rooms.join(', ')} ${t('filter_room')}`);
    if (value.bedrooms.length) parts.push(`${value.bedrooms.join(', ')} ${t('filter_bedroom_short')}`);
    if (value.balconies.length) parts.push(`${t('balcony')}: ${value.balconies.join(', ')}`);
    return parts.length > 0 ? parts.join(', ') : labels.any;
  };

  const bedroomsSummary = () => {
    if (value.bedrooms.length) {
      return `${value.bedrooms.join(', ')} ${t('filter_bedroom')}`;
    }
    return labels.any;
  };

  const areaSummary = () => {
    if (value.minSqm && value.maxSqm) return `${value.minSqm}–${value.maxSqm} ${t('sqm_unit_short')}`;
    if (value.minSqm) return `${value.minSqm}+ ${t('sqm_unit_short')}`;
    if (value.maxSqm) return `${value.maxSqm} ${t('filter_sqm_up_to')}`;
    return labels.any;
  };

  const yearSummary = () => {
    const built =
      value.minConstructionYear || value.maxConstructionYear
        ? `${value.minConstructionYear || '—'}-${value.maxConstructionYear || '—'}`
        : '';
    const renovated =
      value.minRenovationYear || value.maxRenovationYear
        ? `${value.minRenovationYear || '—'}-${value.maxRenovationYear || '—'}`
        : '';
    if (built && renovated) return `აშენება: ${built}, რემონტი: ${renovated}`;
    if (built) return `აშენება: ${built}`;
    if (renovated) return `რემონტი: ${renovated}`;
    return labels.any;
  };

  const priceActive = !!(value.minPrice || value.maxPrice || value.priceCurrency || value.priceType);
  const roomsActive = value.rooms.length > 0;
  const bedroomsActive = value.bedrooms.length > 0;
  const balconiesActive = value.balconies.length > 0;
  const selectedRoomNums = value.rooms.map((r) => Number(r)).filter((n) => !Number.isNaN(n));
  const maxAllowedBedrooms = selectedRoomNums.length > 0 ? Math.max(...selectedRoomNums) : null;
  const hasOpenEndedRooms = value.rooms.includes('6');
  const areaActive = !!(value.minSqm || value.maxSqm);
  const yearActive = !!(
    value.minConstructionYear ||
    value.maxConstructionYear ||
    value.minRenovationYear ||
    value.maxRenovationYear
  );

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 md:p-4 dark:border-zinc-700 dark:bg-zinc-900" suppressHydrationWarning>
      {/* მობაილზე - ჩამოსაშლელი ღილაკი */}
      <button
        type="button"
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden w-full flex items-center justify-between gap-2 text-sm font-semibold text-slate-700 dark:text-zinc-200"
      >
        <div className="flex items-center gap-2">
          <span>🔍</span>
          <span>{labels.filters}</span>
          {activeFilterCount > 0 && (
            <span className="bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center dark:bg-amber-500 dark:text-black">
              {activeFilterCount}
            </span>
          )}
        </div>
        <svg className={`w-5 h-5 text-slate-400 transition-transform ${mobileOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* ფილტრების კონტენტი - მობაილზე ჩამოსაშლელი, დესკტოპზე ყოველთვის ჩანს */}
      <div className={`${mobileOpen ? 'block mt-3 pt-3 border-t border-slate-100 dark:border-zinc-700' : 'hidden'} md:block md:mt-0 md:pt-0 md:border-0`}>
      {/* გარიგების ტიპი - მრავალჯერადი არჩევა */}
      <div className="flex flex-wrap gap-2 mb-4">
        {DEAL_TYPES.map((dt) => {
          const isSelected = value.dealType.includes(dt.value);
          return (
            <button
              key={dt.value}
              type="button"
              onClick={() => {
                const newDealType = isSelected
                  ? value.dealType.filter(d => d !== dt.value)
                  : [...value.dealType, dt.value];
                onChange({ ...value, dealType: newDealType });
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-md dark:bg-amber-500 dark:text-black dark:shadow-amber-900/40'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              <span>{dt.icon}</span>
              <span>{t(dt.key)}</span>
            </button>
          );
        })}
      </div>

      {/* ძიება (ტექსტი ან ID) */}
      <div className="relative mb-3">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
          placeholder={`${labels.search} / ID...`}
          value={value.q || value.propertyId || ''}
          onChange={(e) => {
            const v = e.target.value;
            const isNumericId = /^\d+$/.test(v.trim()) && Number(v.trim()) > 0;
            if (isNumericId) {
              onChange({ ...value, q: '', propertyId: v.trim() });
            } else {
              onChange({ ...value, q: v, propertyId: '' });
            }
          }}
        />
      </div>

      {/* ფილტრები კომპაქტურად */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 mb-3">
        {/* ფასი dropdown */}
        <FilterDropdown label={t('filter_price')} summary={priceSummary()} isActive={priceActive}>
          <div className="space-y-3">
            {/* ვალუტა */}
            <div>
              <div className="text-[10px] text-slate-500 mb-1.5">{t('filter_currency')}</div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => onChange({ ...value, priceCurrency: value.priceCurrency === 'USD' ? '' : 'USD' })}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                    value.priceCurrency === 'USD'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  $ USD
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ ...value, priceCurrency: value.priceCurrency === 'GEL' ? '' : 'GEL' })}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                    value.priceCurrency === 'GEL'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  ₾ GEL
                </button>
              </div>
            </div>
            {/* ფასის ტიპი */}
            <div>
              <div className="text-[10px] text-slate-500 mb-1.5">{t('filter_price_type')}</div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => onChange({ ...value, priceType: value.priceType === 'total' ? '' : 'total' })}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                    value.priceType === 'total'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {t('filter_total')}
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ ...value, priceType: value.priceType === 'per_sqm' ? '' : 'per_sqm' })}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                    value.priceType === 'per_sqm'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {t('filter_per_sqm')}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 mb-1 block">{t('filter_minimum')}</label>
                <input
                  type="number"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  placeholder="0"
                  value={value.minPrice}
                  onChange={(e) => set('minPrice', e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 mb-1 block">{t('filter_maximum')}</label>
                <input
                  type="number"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  placeholder="∞"
                  value={value.maxPrice}
                  onChange={(e) => set('maxPrice', e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {[50000, 100000, 200000, 500000].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onChange({ ...value, maxPrice: String(p) })}
                  className="px-2 py-1 text-xs rounded-md bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-600"
                >
                  {(p / 1000)}K {t('filter_up_to')}
                </button>
              ))}
            </div>
          </div>
        </FilterDropdown>

        {/* ფართობი dropdown */}
        <FilterDropdown label={t('filter_area')} summary={areaSummary()} isActive={areaActive}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 mb-1 block">{t('filter_min_sqm')}</label>
                <input
                  type="number"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  placeholder="0"
                  value={value.minSqm}
                  onChange={(e) => set('minSqm', e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 mb-1 block">{t('filter_max_sqm')}</label>
                <input
                  type="number"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  placeholder="∞"
                  value={value.maxSqm}
                  onChange={(e) => set('maxSqm', e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {[50, 100, 150, 200, 300].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onChange({ ...value, maxSqm: String(s) })}
                  className="px-2 py-1 text-xs rounded-md bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-600"
                >
                  {s} {t('filter_sqm_up_to')}
                </button>
              ))}
            </div>
          </div>
        </FilterDropdown>

        {/* აშენების/რემონტის წლები */}
        <FilterDropdown label="🏗️ აშენება/რემონტი" summary={yearSummary()} isActive={yearActive}>
          <div className="space-y-4">
            <div>
              <div className="text-[10px] text-slate-500 mb-1.5">აშენების წელი (დიაპაზონი)</div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  placeholder="დან"
                  value={value.minConstructionYear}
                  onChange={(e) => set('minConstructionYear', e.target.value)}
                />
                <input
                  type="number"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  placeholder="მდე"
                  value={value.maxConstructionYear}
                  onChange={(e) => set('maxConstructionYear', e.target.value)}
                />
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 mb-1.5">რემონტის წელი (დიაპაზონი)</div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  placeholder="დან"
                  value={value.minRenovationYear}
                  onChange={(e) => set('minRenovationYear', e.target.value)}
                />
                <input
                  type="number"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  placeholder="მდე"
                  value={value.maxRenovationYear}
                  onChange={(e) => set('maxRenovationYear', e.target.value)}
                />
              </div>
            </div>
          </div>
        </FilterDropdown>

        {/* ოთახები dropdown */}
        <FilterDropdown label={t('filter_rooms')} summary={roomsSummary()} isActive={roomsActive || bedroomsActive || balconiesActive}>
          <div className="space-y-3">
            <div className="text-xs text-slate-500 mb-2">{t('filter_choose_rooms')}</div>
            <div className="flex gap-1.5">
              {['1', '2', '3', '4', '5', '6'].map((r) => {
                const isSelected = value.rooms.includes(r);
                const displayLabel = r === '6' ? '6+' : r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      const nextRooms = isSelected
                        ? value.rooms.filter((room) => room !== r)
                        : [...value.rooms, r].sort((a, b) => Number(a) - Number(b));
                      const nextRoomNums = nextRooms.map((room) => Number(room)).filter((n) => !Number.isNaN(n));
                      const maxRoom = nextRoomNums.length > 0 ? Math.max(...nextRoomNums) : null;
                      const openEnded = nextRooms.includes('6');
                      const nextBedrooms = value.bedrooms.filter((b) => {
                        if (openEnded) return true;
                        if (maxRoom === null) return false;
                        return Number(b) <= maxRoom;
                      });
                      onChange({ ...value, rooms: nextRooms, bedrooms: nextBedrooms });
                    }}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow'
                        : 'bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-600'
                    }`}
                  >
                    {displayLabel}
                  </button>
                );
              })}
            </div>

            <div className="border-t border-slate-100 pt-3">
              <div className="text-xs text-slate-500 mb-2">{t('filter_choose_bedrooms')}</div>
              <div className="flex gap-1.5">
                {['1', '2', '3', '4', '5', '6'].map((r) => {
                  const isSelected = value.bedrooms.includes(r);
                  const roomNumber = Number(r);
                  const isDisabled = !hasOpenEndedRooms && maxAllowedBedrooms !== null && roomNumber > maxAllowedBedrooms;
                  const displayLabel = r === '6' ? '6+' : r;
                  return (
                    <button
                      key={r}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => {
                        const nextBedrooms = isSelected
                          ? value.bedrooms.filter((bedroom) => bedroom !== r)
                          : [...value.bedrooms, r].sort((a, b) => Number(a) - Number(b));
                        onChange({ ...value, bedrooms: nextBedrooms });
                      }}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        isDisabled
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'
                          : isSelected
                          ? 'bg-blue-600 text-white shadow'
                          : 'bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-600'
                      }`}
                    >
                      {displayLabel}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <div className="text-xs text-slate-500 mb-2">{t('filter_balcony_count')}</div>
              <div className="flex gap-1.5">
                {['1', '2', '3'].map((b) => {
                  const isSelected = value.balconies.includes(b);
                  return (
                    <button
                      key={b}
                      type="button"
                      onClick={() => {
                        const next = isSelected
                          ? value.balconies.filter((x) => x !== b)
                          : [...value.balconies, b].sort((a, c) => Number(a) - Number(c));
                        onChange({ ...value, balconies: next });
                      }}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        isSelected
                          ? 'bg-orange-600 text-white shadow'
                          : 'bg-slate-100 text-slate-700 hover:bg-orange-50 hover:text-orange-700'
                      }`}
                    >
                      {b}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </FilterDropdown>

        {/* რეგიონი — ყოველთვის ჩანს, ქალაქამდე */}
        <select
          className={`w-full rounded-lg border px-3 py-2.5 text-sm transition-all ${
            value.region
              ? 'border-blue-400 bg-blue-50 text-blue-700'
              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
          }`}
          value={value.region}
          onChange={(e) => {
            const newRegion = e.target.value;
            const newValue = { ...value, region: newRegion };
            // თუ ქალაქი არ ეკუთვნის ახალ რეგიონს, გავასუფთავოთ
            if (newValue.city && newRegion) {
              const cityRegion = CITY_REGION_MAP[newValue.city];
              if (cityRegion && cityRegion !== newRegion) {
                newValue.city = '';
                newValue.tbilisiDistrict = '';
                newValue.tbilisiSubdistricts = [];
              }
            }
            // თბილისის რეგიონის არჩევისას ავტომატურად აირჩეს თბილისი ქალაქიც
            if (newRegion === 'tbilisi' && !newValue.city) {
              newValue.city = 'თბილისი';
            }
            if (!newRegion) {
              // რეგიონის გასუფთავებისას ქალაქს არ ვეხებით
            }
            onChange(newValue);
          }}
        >
          <option value="">{labels.region}: {labels.any}</option>
          {GEORGIAN_REGIONS.map((r) => (
            <option key={r.value} value={r.value}>{t(r.key)}</option>
          ))}
        </select>

        {/* ქალაქი — რეგიონით გაფილტრული */}
        <CityCombobox
          value={value.city}
          label={labels.city}
          anyLabel={labels.any}
          allowedCities={value.region ? Object.entries(CITY_REGION_MAP).filter(([, r]) => r === value.region).map(([c]) => c) : undefined}
          onChange={(v) => {
            const newValue = { ...value, city: v };
            if (!v) {
              // გასუფთავება — ქალაქის წაშლა
              newValue.tbilisiDistrict = '';
              newValue.tbilisiSubdistricts = [];
            } else {
              // ავტომატურად მოინიშნოს რეგიონი ქალაქის მიხედვით
              const autoRegion = CITY_REGION_MAP[v] || '';
              if (autoRegion) newValue.region = autoRegion;
              // თუ ქალაქი არ არის უბნებიანი, გავასუფთავოთ უბნები
              if (!CITIES_WITH_DISTRICTS.includes(v)) {
                newValue.tbilisiDistrict = '';
                newValue.tbilisiSubdistricts = [];
              }
            }
            onChange(newValue);
          }}
        />
      </div>

      {/* უბნები — თბილისი, ბათუმი, ქუთაისი, რუსთავი */}
      {CITIES_WITH_DISTRICTS.includes(value.city) && (
        <FilterDropdown
          label={t('filter_districts')}
          summary={value.tbilisiDistrict ? `${value.tbilisiDistrict}${value.tbilisiSubdistricts.length ? ` (${value.tbilisiSubdistricts.length})` : ''}` : t('filter_choose')}
          isActive={!!value.tbilisiDistrict || value.tbilisiSubdistricts.length > 0}
        >
          <TbilisiDistrictSelector
            city={value.city}
            selectedDistrict={value.tbilisiDistrict}
            selectedSubdistricts={value.tbilisiSubdistricts}
            onDistrictChange={(d) => onChange({ ...value, tbilisiDistrict: d })}
            onSubdistrictsChange={(s) => onChange({ ...value, tbilisiSubdistricts: s })}
          />
        </FilterDropdown>
      )}

      {/* კომფორტი + 3D/ფოტო ფილტრები */}
      <FilterDropdown
        label={t('filter_comfort')}
        summary={(() => {
          const count = (value.amenities?.length || 0)
            + (value.has3d === 'true' ? 1 : 0)
            + (value.hasPhotos === 'true' ? 1 : 0);
          return count > 0 ? `${count} ${t('filter_selected')}` : t('filter_choose');
        })()}
        isActive={(value.amenities?.length || 0) > 0 || value.has3d === 'true' || value.hasPhotos === 'true'}
      >
        <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
          <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              checked={value.has3d === 'true'}
              onChange={() => set('has3d', value.has3d === 'true' ? '' : 'true')}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm">{t('has3d_filter')}</span>
          </label>
          <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              checked={value.hasPhotos === 'true'}
              onChange={() => set('hasPhotos', value.hasPhotos === 'true' ? '' : 'true')}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm">{t('hasPhotos_filter')}</span>
          </label>
          <hr className="border-slate-100 my-1" />
          {[
            { key: 'elevator', labelKey: 'amenity_filter_elevator' },
            { key: 'furniture', labelKey: 'amenity_filter_furniture' },
            { key: 'internet', labelKey: 'amenity_filter_internet' },
            { key: 'airConditioner', labelKey: 'amenity_filter_airConditioner' },
            { key: 'centralHeating', labelKey: 'amenity_filter_centralHeating' },
            { key: 'naturalGas', labelKey: 'amenity_filter_naturalGas' },
            { key: 'garage', labelKey: 'amenity_filter_garage' },
            { key: 'security', labelKey: 'amenity_filter_security' },
            { key: 'pool', labelKey: 'amenity_filter_pool' },
            { key: 'garden', labelKey: 'amenity_filter_garden' },
            { key: 'terrace', labelKey: 'terrace' },
            { key: 'isolatedKitchen', labelKey: 'amenity_filter_isolatedKitchen' },
            { key: 'heatingCooling', labelKey: 'amenity_filter_heatingCooling' },
            { key: 'basement', labelKey: 'amenity_filter_basement' },
            { key: 'storage', labelKey: 'amenity_filter_storage' },
            { key: 'electricity', labelKey: 'amenity_filter_electricity' },
            { key: 'water', labelKey: 'amenity_filter_water' },
            { key: 'fireplace', labelKey: 'amenity_filter_fireplace' },
          ].map(({ key, labelKey }) => {
            const amenities = value.amenities || [];
            const isSelected = amenities.includes(key);
            return (
              <label key={key} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {
                    const newAmenities = isSelected
                      ? amenities.filter(a => a !== key)
                      : [...amenities, key];
                    onChange({ ...value, amenities: newAmenities });
                  }}
                  className="rounded border-slate-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm">{t(labelKey)}</span>
              </label>
            );
          })}
        </div>
      </FilterDropdown>

      {/* პროექტის ტიპი (მხოლოდ ბინისთვის) */}
      {value.type.includes('apartment') && (
        <FilterDropdown
          label={`🏠 ${t('filter_project')}`}
          summary={value.buildingProject.length > 0 ? value.buildingProject.map(p => t(`project_${p}`)).join(', ') : ''}
          isActive={value.buildingProject.length > 0}
        >
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'new_build', key: 'project_new_build' },
              { value: 'czech', key: 'project_czech' },
              { value: 'khrushchev', key: 'project_khrushchev' },
              { value: 'urban', key: 'project_urban' },
              { value: 'lvov', key: 'project_lvov' },
              { value: 'budapest', key: 'project_budapest' },
              { value: 'kiev', key: 'project_kiev' },
              { value: 'moscow', key: 'project_moscow' },
              { value: 'tbilisi', key: 'project_tbilisi' },
              { value: 'other', key: 'project_other' },
            ].map((proj) => (
              <button
                key={proj.value}
                type="button"
                onClick={() => onChange({ ...value, buildingProject: value.buildingProject.includes(proj.value) ? value.buildingProject.filter(p => p !== proj.value) : [...value.buildingProject, proj.value] })}
                className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all text-left ${
                  value.buildingProject.includes(proj.value)
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
                }`}
              >
                {t(proj.key)}
              </button>
            ))}
          </div>
        </FilterDropdown>
      )}

      {/* რემონტის სტატუსი */}
      <FilterDropdown
        label={`🧱 ${t('filter_renovation')}`}
        summary={value.renovationStatus.length > 0 ? value.renovationStatus.map((s) => t(`renovation_${s}`)).join(', ') : labels.any}
        isActive={value.renovationStatus.length > 0}
      >
        <div className="grid grid-cols-1 gap-2">
          {[
            { value: 'green_frame', key: 'renovation_green_frame' },
            { value: 'white_frame', key: 'renovation_white_frame' },
            { value: 'black_frame', key: 'renovation_black_frame' },
            { value: 'renovated', key: 'renovation_renovated' },
            { value: 'to_renovate', key: 'renovation_to_renovate' },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() =>
                onChange({
                  ...value,
                  renovationStatus: value.renovationStatus.includes(item.value)
                    ? value.renovationStatus.filter((s) => s !== item.value)
                    : [...value.renovationStatus, item.value],
                })
              }
              className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all text-left ${
                value.renovationStatus.includes(item.value)
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300'
              }`}
            >
              {t(item.key)}
            </button>
          ))}
        </div>
      </FilterDropdown>
      </div>
    </div>
  );
}
