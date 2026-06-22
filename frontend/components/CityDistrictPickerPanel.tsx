'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { CITY_DISTRICTS_MAP } from '@/components/TbilisiDistrictSelector';

const FLAT_DISTRICT_CITY_KEYS: Record<string, string> = {
  ბათუმი: 'batumi_districts',
  ქუთაისი: 'kutaisi_districts',
};

const TBILISI_COLUMN_KEYS = [
  ['vake_saburtalo'],
  ['isani_samgori', 'krtsanisi'],
  ['gldani_nadzaladevi'],
  ['didube_chughureti', 'old_tbilisi'],
] as const;

function CheckboxControl({
  checked,
  indeterminate,
  onChange,
  label,
  bold,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  label: string;
  bold?: boolean;
}) {
  return (
    <div
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      tabIndex={0}
      onClick={onChange}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onChange();
        }
      }}
      className="flex cursor-pointer select-none items-start gap-3 rounded-md py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
    >
      <span
        aria-hidden
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
          checked || indeterminate
            ? 'border-blue-600 bg-blue-600 text-white dark:border-amber-400 dark:bg-amber-400'
            : 'border-slate-300 bg-white dark:border-zinc-600 dark:bg-zinc-900'
        }`}
      >
        {checked ? (
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        ) : indeterminate ? (
          <span className="h-0.5 w-2 rounded bg-white dark:bg-zinc-900" />
        ) : null}
      </span>
      <span className={`text-base leading-snug text-slate-800 dark:text-zinc-100 ${bold ? 'text-[1.05rem] font-semibold' : ''}`}>{label}</span>
    </div>
  );
}

function DistrictBlock({
  districtKey,
  city,
  search,
  selectedDistrict,
  selectedSubdistricts,
  onSelectionChange,
}: {
  districtKey: string;
  city: string;
  search: string;
  selectedDistrict: string;
  selectedSubdistricts: string[];
  onSelectionChange: (district: string, subdistricts: string[]) => void;
}) {
  const { t } = useTranslation();
  const districts = CITY_DISTRICTS_MAP[city];
  const district = districts?.[districtKey];
  if (!district) return null;

  const translationPrefix =
    city === 'თბილისი' ? 'tbilisi' : city === 'ბათუმი' ? 'batumi' : city === 'ქუთაისი' ? 'kutaisi' : 'rustavi';

  const districtLabel = (() => {
    const tr = t(`${translationPrefix}.${district.labelKey}`);
    return tr === `${translationPrefix}.${district.labelKey}`
      ? district.labelKey.replace(/^district_/, '').replace(/_/g, ' ')
      : tr;
  })();

  const subLabel = (ka: string, key: string) => {
    const tr = t(`${translationPrefix}.${key}`);
    return tr === `${translationPrefix}.${key}` ? ka : tr;
  };

  const q = search.trim().toLowerCase();
  const visibleSubs = district.subdistricts.filter((sub) => {
    if (!q) return true;
    const label = subLabel(sub.ka, sub.key).toLowerCase();
    return label.includes(q) || sub.ka.toLowerCase().includes(q) || districtLabel.toLowerCase().includes(q);
  });

  if (q && !districtLabel.toLowerCase().includes(q) && visibleSubs.length === 0) return null;

  const allKaNames = district.subdistricts.map((s) => s.ka);
  const districtOnlySelected = selectedDistrict === districtKey && selectedSubdistricts.length === 0;
  const allSelected = districtOnlySelected || allKaNames.every((s) => selectedSubdistricts.includes(s));
  const someSelected = districtOnlySelected || allKaNames.some((s) => selectedSubdistricts.includes(s));

  const toggleAll = () => {
    if (allSelected) {
      onSelectionChange(
        selectedDistrict === districtKey ? '' : selectedDistrict,
        selectedSubdistricts.filter((s) => !allKaNames.includes(s)),
      );
      return;
    }
    const next = [...selectedSubdistricts];
    allKaNames.forEach((s) => {
      if (!next.includes(s)) next.push(s);
    });
    onSelectionChange(districtKey, next);
  };

  const toggleSub = (ka: string) => {
    if (selectedSubdistricts.includes(ka)) {
      const nextSubs = selectedSubdistricts.filter((s) => s !== ka);
      const nextDistrict =
        selectedDistrict === districtKey && nextSubs.filter((s) => allKaNames.includes(s)).length === 0
          ? ''
          : selectedDistrict;
      onSelectionChange(nextDistrict, nextSubs);
      return;
    }
    onSelectionChange(selectedDistrict || districtKey, [...selectedSubdistricts, ka]);
  };

  return (
    <div className="min-w-0">
      <CheckboxControl checked={allSelected} indeterminate={someSelected && !allSelected} onChange={toggleAll} label={districtLabel} bold />
      <div className="mt-1.5 space-y-1 pl-7">
        {visibleSubs.map((sub) => (
          <CheckboxControl
            key={sub.key}
            checked={selectedSubdistricts.includes(sub.ka)}
            onChange={() => toggleSub(sub.ka)}
            label={subLabel(sub.ka, sub.key)}
          />
        ))}
      </div>
    </div>
  );
}

function FlatDistrictPanel({
  city,
  districtKey,
  search,
  selectedDistrict,
  selectedSubdistricts,
  onSelectionChange,
}: {
  city: string;
  districtKey: string;
  search: string;
  selectedDistrict: string;
  selectedSubdistricts: string[];
  onSelectionChange: (district: string, subdistricts: string[]) => void;
}) {
  const { t } = useTranslation();
  const districts = CITY_DISTRICTS_MAP[city];
  const district = districts?.[districtKey];
  if (!district) return null;

  const translationPrefix =
    city === 'ბათუმი' ? 'batumi' : city === 'ქუთაისი' ? 'kutaisi' : 'rustavi';

  const sectionTitle = (() => {
    const tr = t(`${translationPrefix}.title`);
    return tr === `${translationPrefix}.title` ? district.labelKey.replace(/^district_/, '').replace(/_/g, ' ') : tr;
  })();

  const subLabel = (ka: string, key: string) => {
    const tr = t(`${translationPrefix}.${key}`);
    return tr === `${translationPrefix}.${key}` ? ka : tr;
  };

  const q = search.trim().toLowerCase();
  const visibleSubs = district.subdistricts.filter((sub) => {
    if (!q) return true;
    const label = subLabel(sub.ka, sub.key).toLowerCase();
    return label.includes(q) || sub.ka.toLowerCase().includes(q) || sectionTitle.toLowerCase().includes(q);
  });

  if (q && visibleSubs.length === 0) return null;

  const allKaNames = district.subdistricts.map((s) => s.ka);
  const districtOnlySelected = selectedDistrict === districtKey && selectedSubdistricts.length === 0;
  const allSelected = districtOnlySelected || allKaNames.every((s) => selectedSubdistricts.includes(s));
  const someSelected = districtOnlySelected || allKaNames.some((s) => selectedSubdistricts.includes(s));

  const toggleAll = () => {
    if (allSelected) {
      onSelectionChange(
        selectedDistrict === districtKey ? '' : selectedDistrict,
        selectedSubdistricts.filter((s) => !allKaNames.includes(s)),
      );
      return;
    }
    const next = [...selectedSubdistricts];
    allKaNames.forEach((s) => {
      if (!next.includes(s)) next.push(s);
    });
    onSelectionChange(districtKey, next);
  };

  const toggleSub = (ka: string) => {
    if (selectedSubdistricts.includes(ka)) {
      const nextSubs = selectedSubdistricts.filter((s) => s !== ka);
      onSelectionChange(nextSubs.length === 0 ? '' : districtKey, nextSubs);
      return;
    }
    onSelectionChange(districtKey, [...selectedSubdistricts, ka]);
  };

  return (
    <section>
      <CheckboxControl checked={allSelected} indeterminate={someSelected && !allSelected} onChange={toggleAll} label={sectionTitle} bold />
      <div className="mt-3 grid grid-cols-1 gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
        {visibleSubs.map((sub) => (
          <CheckboxControl
            key={sub.key}
            checked={selectedSubdistricts.includes(sub.ka)}
            onChange={() => toggleSub(sub.ka)}
            label={subLabel(sub.ka, sub.key)}
          />
        ))}
      </div>
    </section>
  );
}

export function CityDistrictPickerPanel({
  city,
  search,
  selectedDistrict,
  selectedSubdistricts,
  onSelectionChange,
}: {
  city: string;
  search: string;
  selectedDistrict: string;
  selectedSubdistricts: string[];
  onSelectionChange: (district: string, subdistricts: string[]) => void;
}) {
  const districts = CITY_DISTRICTS_MAP[city];
  if (!districts) return null;

  const districtKeys = Object.keys(districts);

  if (city === 'თბილისი') {
    return (
      <div className="grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2 xl:grid-cols-4">
        {TBILISI_COLUMN_KEYS.map((column, idx) => (
          <div key={idx} className="min-w-0 space-y-6">
            {column.map((key) => (
              <DistrictBlock
                key={key}
                districtKey={key}
                city={city}
                search={search}
                selectedDistrict={selectedDistrict}
                selectedSubdistricts={selectedSubdistricts}
                onSelectionChange={onSelectionChange}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (FLAT_DISTRICT_CITY_KEYS[city]) {
    return (
      <FlatDistrictPanel
        city={city}
        districtKey={FLAT_DISTRICT_CITY_KEYS[city]}
        search={search}
        selectedDistrict={selectedDistrict}
        selectedSubdistricts={selectedSubdistricts}
        onSelectionChange={onSelectionChange}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
      {districtKeys.map((key) => (
        <DistrictBlock
          key={key}
          districtKey={key}
          city={city}
          search={search}
          selectedDistrict={selectedDistrict}
          selectedSubdistricts={selectedSubdistricts}
          onSelectionChange={onSelectionChange}
        />
      ))}
    </div>
  );
}
