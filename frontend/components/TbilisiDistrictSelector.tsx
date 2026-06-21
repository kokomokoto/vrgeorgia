'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { KUTAISI_OFFICIAL_DISTRICTS } from '@/lib/kutaisiZonesGeoJson';
import {
  TBILISI_DISTRICTS as TBILISI_DISTRICTS_MSDA,
  normalizeTbilisiSubdistrictKa,
} from '@/lib/tbilisiOfficialDistricts';

type DistrictData = Record<string, {
  labelKey: string;
  subdistricts: { key: string; ka: string }[];
}>;

/** MSDA msm_z__gis_data_00171 — იგივე სახელები რაც რუკაზე */
export const TBILISI_DISTRICTS: DistrictData = TBILISI_DISTRICTS_MSDA;

// ბათუმის უბნები
export const BATUMI_DISTRICTS: DistrictData = {
  'batumi_center': {
    labelKey: 'district_batumi_center',
    subdistricts: [
      { key: 'sub_old_batumi', ka: 'ძველი ბათუმი' },
      { key: 'sub_new_boulevard', ka: 'ახალი ბულვარი' },
      { key: 'sub_batumi_boulevard', ka: 'ბათუმის ბულვარი' },
      { key: 'sub_parnavaz', ka: 'ფარნავაზ მეფე' },
      { key: 'sub_hesi', ka: 'ჰესი' }
    ]
  },
  'batumi_inner': {
    labelKey: 'district_batumi_inner',
    subdistricts: [
      { key: 'sub_khimshiashvili', ka: 'ხიმშიაშვილი' },
      { key: 'sub_gorgiladze', ka: 'გორგილაძე' },
      { key: 'sub_javakhishvili', ka: 'ჯავახიშვილი' },
      { key: 'sub_26_may', ka: '26 მაისი' },
      { key: 'sub_bagrationi', ka: 'ბაგრატიონი' },
      { key: 'sub_rustaveli_batumi', ka: 'რუსთაველი' },
      { key: 'sub_inasaridze', ka: 'ინასარიძე' }
    ]
  },
  'batumi_suburbs': {
    labelKey: 'district_batumi_suburbs',
    subdistricts: [
      { key: 'sub_angisi', ka: 'ანგისი' },
      { key: 'sub_feria', ka: 'ფერია' },
      { key: 'sub_boni_gorodoki', ka: 'ბონი-გოროდოკი' },
      { key: 'sub_airport_batumi', ka: 'აეროპორტი' },
      { key: 'sub_kakhaberi', ka: 'კახაბერი' },
      { key: 'sub_agresi', ka: 'აგრეში' }
    ]
  }
};

// ქუთაისის უბნები — MSDA msm_z__gis_data_00175
export const KUTAISI_DISTRICTS: DistrictData = {
  kutaisi_districts: {
    labelKey: 'district_kutaisi_districts',
    subdistricts: [...KUTAISI_OFFICIAL_DISTRICTS],
  },
};

// რუსთავის უბნები
export const RUSTAVI_DISTRICTS: DistrictData = {
  'rustavi_old': {
    labelKey: 'district_rustavi_old',
    subdistricts: [
      { key: 'sub_old_rustavi', ka: 'ძველი რუსთავი' },
      { key: 'sub_rustavi_centri', ka: 'ცენტრი' },
      { key: 'sub_shroma', ka: 'შრომა' }
    ]
  },
  'rustavi_micro_1_7': {
    labelKey: 'district_rustavi_micro_1_7',
    subdistricts: [
      { key: 'sub_micro_1', ka: 'მე-1 მიკრორაიონი' },
      { key: 'sub_micro_2', ka: 'მე-2 მიკრორაიონი' },
      { key: 'sub_micro_3', ka: 'მე-3 მიკრორაიონი' },
      { key: 'sub_micro_4', ka: 'მე-4 მიკრორაიონი' },
      { key: 'sub_micro_5', ka: 'მე-5 მიკრორაიონი' },
      { key: 'sub_micro_6', ka: 'მე-6 მიკრორაიონი' },
      { key: 'sub_micro_7', ka: 'მე-7 მიკრორაიონი' }
    ]
  },
  'rustavi_micro_8_13': {
    labelKey: 'district_rustavi_micro_8_13',
    subdistricts: [
      { key: 'sub_micro_8', ka: 'მე-8 მიკრორაიონი' },
      { key: 'sub_micro_9', ka: 'მე-9 მიკრორაიონი' },
      { key: 'sub_micro_10', ka: 'მე-10 მიკრორაიონი' },
      { key: 'sub_micro_11', ka: 'მე-11 მიკრორაიონი' },
      { key: 'sub_micro_12', ka: 'მე-12 მიკრორაიონი' },
      { key: 'sub_micro_13', ka: 'მე-13 მიკრორაიონი' }
    ]
  }
};

// ყველა ქალაქის უბნების mapping
export const CITY_DISTRICTS_MAP: Record<string, DistrictData> = {
  'თბილისი': TBILISI_DISTRICTS,
  'ბათუმი': BATUMI_DISTRICTS,
  'ქუთაისი': KUTAISI_DISTRICTS,
  'რუსთავი': RUSTAVI_DISTRICTS,
};

// ქალაქები რომლებსაც უბნების არჩევა აქვთ
export const CITIES_WITH_DISTRICTS = ['თბილისი', 'ბათუმი', 'ქუთაისი', 'რუსთავი'];

interface TbilisiDistrictSelectorProps {
  selectedDistrict: string;
  selectedSubdistricts: string[];
  onDistrictChange: (district: string) => void;
  onSubdistrictsChange: (subdistricts: string[]) => void;
  city?: string;
}

export default function TbilisiDistrictSelector({
  selectedDistrict,
  selectedSubdistricts,
  onDistrictChange,
  onSubdistrictsChange,
  city = 'თბილისი'
}: TbilisiDistrictSelectorProps) {
  const { t } = useTranslation();
  const [expandedDistrict, setExpandedDistrict] = useState<string | null>(selectedDistrict || null);

  // ქალაქის მიხედვით უბნები
  const DISTRICTS = CITY_DISTRICTS_MAP[city] || TBILISI_DISTRICTS;
  const translationPrefix = city === 'თბილისი' ? 'tbilisi' : city === 'ბათუმი' ? 'batumi' : city === 'ქუთაისი' ? 'kutaisi' : 'rustavi';

  useEffect(() => {
    if (selectedDistrict) setExpandedDistrict(selectedDistrict);
  }, [selectedDistrict]);

  const getSubdistrictKey = (kaName: string): string => {
    const normalizedKa = city === 'თბილისი' ? normalizeTbilisiSubdistrictKa(kaName) : kaName;
    for (const district of Object.values(DISTRICTS)) {
      const sub = district.subdistricts.find(
        (item) => item.ka === normalizedKa || item.ka === kaName
      );
      if (sub) return sub.key;
    }
    return kaName;
  };

  const translateSubdistrict = (kaName: string): string => {
    const normalizedKa = city === 'თბილისი' ? normalizeTbilisiSubdistrictKa(kaName) : kaName;
    const key = getSubdistrictKey(normalizedKa);
    const translated = t(`${translationPrefix}.${key}`);
    return translated === `${translationPrefix}.${key}` ? normalizedKa : translated;
  };

  // რაიონის არჩევა (მთლიანი)
  const handleDistrictSelect = (districtKey: string) => {
    // ყოველთვის გავხსნათ/დავხუროთ
    setExpandedDistrict(expandedDistrict === districtKey ? null : districtKey);
    // თუ ახალი რაიონია, ავირჩიოთ
    if (selectedDistrict !== districtKey) {
      onDistrictChange(districtKey);
      onSubdistrictsChange([]); // გავასუფთავოთ უბნები
    }
  };

  // უბნის არჩევა/მოხსნა - ვინახავთ ქართულ key-ს
  const isTbilisiSubdistrictSelected = (subKa: string) =>
    selectedSubdistricts.some((s) =>
      city === 'თბილისი' ? normalizeTbilisiSubdistrictKa(s) === subKa : s === subKa
    );

  const handleSubdistrictToggle = (subdistrictKa: string) => {
    if (isTbilisiSubdistrictSelected(subdistrictKa)) {
      onSubdistrictsChange(
        selectedSubdistricts.filter((s) =>
          city === 'თბილისი'
            ? normalizeTbilisiSubdistrictKa(s) !== subdistrictKa
            : s !== subdistrictKa
        )
      );
    } else {
      onSubdistrictsChange([...selectedSubdistricts, subdistrictKa]);
    }
  };

  // მთლიანი რაიონის მონიშვნა
  const handleSelectAllSubdistricts = (districtKey: string) => {
    const district = DISTRICTS[districtKey];
    if (!district) return;
    
    const allKaNames = district.subdistricts.map(s => s.ka);
    const allSelected = allKaNames.every((s) => isTbilisiSubdistrictSelected(s));
    if (allSelected) {
      onSubdistrictsChange(
        selectedSubdistricts.filter((s) =>
          city === 'თბილისი'
            ? !allKaNames.some((ka) => normalizeTbilisiSubdistrictKa(s) === ka)
            : !allKaNames.includes(s)
        )
      );
    } else {
      const newSubs = [...selectedSubdistricts];
      allKaNames.forEach((s) => {
        if (!isTbilisiSubdistrictSelected(s)) newSubs.push(s);
      });
      onSubdistrictsChange(newSubs);
    }
  };

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div className="text-sm font-medium text-slate-700 px-3 py-2 bg-slate-50 border-b border-slate-200">
        {city === 'თბილისი' ? t('tbilisi.title') : `${city} — უბნები`}
      </div>
      
      <div className="max-h-[300px] overflow-y-auto">
        {Object.entries(DISTRICTS).map(([key, district]) => {
          const isExpanded = expandedDistrict === key;
          const isSelected = selectedDistrict === key;
          const allKaNames = district.subdistricts.map(s => s.ka);
          const allSubsSelected = allKaNames.every((s) => isTbilisiSubdistrictSelected(s));
          const someSubsSelected = allKaNames.some((s) => isTbilisiSubdistrictSelected(s));
          
          return (
            <div key={key} className="border-b border-slate-100 last:border-b-0">
              {/* რაიონის header */}
              <div 
                className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}
                onClick={() => handleDistrictSelect(key)}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDistrictChange(key);
                    handleSelectAllSubdistricts(key);
                  }}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    allSubsSelected 
                      ? 'bg-blue-600 border-blue-600 text-white' 
                      : someSubsSelected 
                        ? 'bg-blue-100 border-blue-400' 
                        : 'border-slate-300'
                  }`}
                >
                  {allSubsSelected && (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  {someSubsSelected && !allSubsSelected && (
                    <div className="w-2 h-2 bg-blue-600 rounded-sm" />
                  )}
                </button>
                
                <span className={`flex-1 text-sm ${isSelected ? 'font-medium text-blue-700' : 'text-slate-700'}`}>
                  {(() => { const tr = t(`${translationPrefix}.${district.labelKey}`); return tr === `${translationPrefix}.${district.labelKey}` ? district.labelKey.replace(/^district_/, '').replace(/_/g, ' ') : tr; })()}
                </span>
                
                <svg 
                  className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              
              {/* უბნები */}
              {isExpanded && (
                <div className="bg-slate-50 px-3 py-2 grid grid-cols-2 gap-1">
                  {district.subdistricts.map((sub) => {
                    const isSubSelected = isTbilisiSubdistrictSelected(sub.ka);
                    return (
                      <label 
                        key={sub.key} 
                        className="flex items-center gap-2 cursor-pointer hover:bg-white px-2 py-1 rounded transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isSubSelected}
                          onChange={() => {
                            if (selectedDistrict !== key) {
                              onDistrictChange(key);
                            }
                            handleSubdistrictToggle(sub.ka);
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className={`text-xs ${isSubSelected ? 'text-blue-700 font-medium' : 'text-slate-600'}`}>
                          {(() => { const tr = t(`${translationPrefix}.${sub.key}`); return tr === `${translationPrefix}.${sub.key}` ? sub.ka : tr; })()}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* არჩეული უბნების ჩვენება */}
      {selectedSubdistricts.length > 0 && (
        <div className="px-3 py-2 bg-blue-50 border-t border-slate-200">
          <div className="text-xs text-blue-700 font-medium mb-1">
            არჩეული უბნები ({selectedSubdistricts.length}):
          </div>
          <div className="flex flex-wrap gap-1">
            {selectedSubdistricts.slice(0, 5).map(sub => (
              <span key={sub} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                {translateSubdistrict(sub)}
              </span>
            ))}
            {selectedSubdistricts.length > 5 && (
              <span className="text-xs text-blue-600">+{selectedSubdistricts.length - 5} სხვა</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
