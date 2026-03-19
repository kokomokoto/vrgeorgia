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

// გარიგების ტიპები
const DEAL_TYPES = [
  { value: '', label: 'ყველა', icon: '📋' },
  { value: 'sale', label: 'იყიდება', icon: '💰' },
  { value: 'rent', label: 'ქირავდება', icon: '🔑' },
  { value: 'mortgage', label: 'გირავდება', icon: '🏦' },
  { value: 'daily', label: 'დღიურად', icon: '📅' },
  { value: 'under_construction', label: 'მშენებარე', icon: '🔨' },
];

export type FiltersState = {
  q: string;
  minPrice: string;
  maxPrice: string;
  city: string;
  region: string;
  tbilisiDistrict: string;
  tbilisiSubdistricts: string[];
  type: string[];
  dealType: string;
  has3d: string;
  hasPhotos: string;
  minSqm: string;
  maxSqm: string;
  minRooms: string;
  maxRooms: string;
  amenities: string[];
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
            ? 'border-blue-400 bg-blue-50 text-blue-700'
            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
        }`}
      >
        <div className="text-left min-w-0">
          <div className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">{label}</div>
          <div className={`truncate font-medium ${isActive ? 'text-blue-700' : 'text-slate-800'}`}>{summary}</div>
        </div>
        <svg className={`w-4 h-4 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 z-30 mt-1 rounded-lg border border-slate-200 bg-white p-3 shadow-lg min-w-[280px]">
          {children}
        </div>
      )}
    </div>
  );
}

export function Filters({ value, onChange }: { value: FiltersState; onChange: (v: FiltersState) => void }) {
  const { t } = useTranslation();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const labels = {
    filters: mounted ? t('filters') : 'ფილტრები',
    search: mounted ? t('search') : 'ძიება',
    city: mounted ? t('city') : 'ქალაქი',
    region: mounted ? t('region') : 'რეგიონი',
    any: mounted ? t('any') : 'ყველა',
  };

  const set = (k: keyof FiltersState, v: string) => onChange({ ...value, [k]: v });

  const priceSummary = () => {
    if (value.minPrice && value.maxPrice) return `${Number(value.minPrice).toLocaleString()} – ${Number(value.maxPrice).toLocaleString()}`;
    if (value.minPrice) return `${Number(value.minPrice).toLocaleString()}+`;
    if (value.maxPrice) return `${Number(value.maxPrice).toLocaleString()}-მდე`;
    return labels.any;
  };

  const roomsSummary = () => {
    if (value.minRooms && value.maxRooms) {
      if (value.minRooms === value.maxRooms) return `${value.minRooms} ოთახი`;
      return `${value.minRooms}–${value.maxRooms} ოთახი`;
    }
    if (value.minRooms) return `${value.minRooms}+ ოთახი`;
    if (value.maxRooms) return `${value.maxRooms}-მდე`;
    return labels.any;
  };

  const areaSummary = () => {
    if (value.minSqm && value.maxSqm) return `${value.minSqm}–${value.maxSqm} მ²`;
    if (value.minSqm) return `${value.minSqm}+ მ²`;
    if (value.maxSqm) return `${value.maxSqm} მ²-მდე`;
    return labels.any;
  };

  const priceActive = !!(value.minPrice || value.maxPrice);
  const roomsActive = !!(value.minRooms || value.maxRooms);
  const areaActive = !!(value.minSqm || value.maxSqm);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4" suppressHydrationWarning>
      {/* გარიგების ტიპი - თვალსაჩინოდ */}
      <div className="flex flex-wrap gap-2 mb-4">
        {DEAL_TYPES.map((dt) => (
          <button
            key={dt.value}
            type="button"
            onClick={() => set('dealType', dt.value)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              value.dealType === dt.value
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>{dt.icon}</span>
            <span>{dt.label}</span>
          </button>
        ))}
      </div>

      {/* ძიება და ID */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 mb-3">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            className="w-full rounded-lg border border-slate-200 pl-10 pr-3 py-2.5 text-sm"
            placeholder={`${labels.search}...`}
            value={value.q}
            onChange={(e) => set('q', e.target.value)}
          />
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">ID</span>
          <input
            className="w-full rounded-lg border border-slate-200 pl-10 pr-3 py-2.5 text-sm font-mono"
            placeholder="ობიექტის ID..."
            value={value.propertyId || ''}
            onChange={(e) => onChange({ ...value, propertyId: e.target.value })}
          />
        </div>
      </div>

      {/* ფილტრები კომპაქტურად */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 mb-3">
        {/* ფასი dropdown */}
        <FilterDropdown label="ფასი" summary={priceSummary()} isActive={priceActive}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 mb-1 block">მინიმუმ</label>
                <input
                  type="number"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  placeholder="0"
                  value={value.minPrice}
                  onChange={(e) => set('minPrice', e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 mb-1 block">მაქსიმუმ</label>
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
                  {(p / 1000)}K-მდე
                </button>
              ))}
            </div>
          </div>
        </FilterDropdown>

        {/* ოთახები dropdown */}
        <FilterDropdown label="ოთახები" summary={roomsSummary()} isActive={roomsActive}>
          <div className="space-y-3">
            <div className="text-xs text-slate-500 mb-2">აირჩიეთ ოთახების რაოდენობა:</div>
            <div className="flex gap-1.5">
              {['1', '2', '3', '4', '5', '6'].map((r) => {
                const isMin = value.minRooms === r && value.maxRooms === r;
                const isSelected = isMin || (r === '6' && value.minRooms === '6' && !value.maxRooms);
                const displayLabel = r === '6' ? '6+' : r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        onChange({ ...value, minRooms: '', maxRooms: '' });
                      } else if (r === '6') {
                        onChange({ ...value, minRooms: '6', maxRooms: '' });
                      } else {
                        onChange({ ...value, minRooms: r, maxRooms: r });
                      }
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
            <div className="border-t border-slate-100 pt-2">
              <div className="text-[10px] text-slate-400 mb-1.5">ან მიუთითეთ დიაპაზონი:</div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm"
                  placeholder="მინ."
                  value={value.minRooms}
                  onChange={(e) => set('minRooms', e.target.value)}
                />
                <input
                  type="number"
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm"
                  placeholder="მაქს."
                  value={value.maxRooms}
                  onChange={(e) => set('maxRooms', e.target.value)}
                />
              </div>
            </div>
          </div>
        </FilterDropdown>

        {/* ფართობი dropdown */}
        <FilterDropdown label="ფართობი" summary={areaSummary()} isActive={areaActive}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 mb-1 block">მინიმუმ მ²</label>
                <input
                  type="number"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  placeholder="0"
                  value={value.minSqm}
                  onChange={(e) => set('minSqm', e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 mb-1 block">მაქსიმუმ მ²</label>
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
                  {s} მ²-მდე
                </button>
              ))}
            </div>
          </div>
        </FilterDropdown>

        {/* ქალაქი */}
        <CityCombobox
          value={value.city}
          onChange={(v) => {
            const newValue = { ...value, city: v };
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

        {/* რეგიონი */}
        {value.city.toLowerCase() !== 'თბილისი' ? (
          <select
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
            value={value.region}
            onChange={(e) => set('region', e.target.value)}
          >
            <option value="">{labels.region}: {labels.any}</option>
            {GEORGIAN_REGIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        ) : (
          <div className="text-sm text-blue-600 flex items-center px-3 bg-blue-50 rounded-lg border border-blue-200">
            ✓ თბილისი
          </div>
        )}
      </div>

      {/* თბილისის უბნები */}
      {value.city.toLowerCase() === 'თბილისი' && (
        <div className="mb-3">
          <TbilisiDistrictSelector
            selectedDistrict={value.tbilisiDistrict}
            selectedSubdistricts={value.tbilisiSubdistricts}
            onDistrictChange={(d) => onChange({ ...value, tbilisiDistrict: d })}
            onSubdistrictsChange={(s) => onChange({ ...value, tbilisiSubdistricts: s })}
          />
        </div>
      )}

      {/* კომფორტი + 3D/ფოტო ფილტრები */}
      <div>
        <div className="text-xs text-slate-500 mb-2">კომფორტი და ფილტრები:</div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => set('has3d', value.has3d === 'true' ? '' : 'true')}
            className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
              value.has3d === 'true'
                ? 'bg-blue-100 border-blue-500 text-blue-700'
                : 'bg-white border-slate-200 text-slate-600 hover:border-blue-400'
            }`}
          >
            🎯 3D აქვს
          </button>
          <button
            type="button"
            onClick={() => set('hasPhotos', value.hasPhotos === 'true' ? '' : 'true')}
            className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
              value.hasPhotos === 'true'
                ? 'bg-blue-100 border-blue-500 text-blue-700'
                : 'bg-white border-slate-200 text-slate-600 hover:border-blue-400'
            }`}
          >
            📷 ფოტოებით
          </button>
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
                className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
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
