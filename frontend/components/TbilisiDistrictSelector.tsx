'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

// თბილისის რაიონები და უბნები - key-ებით თარგმანისთვის
export const TBILISI_DISTRICTS = {
  'vake_saburtalo': {
    labelKey: 'district_vake_saburtalo',
    subdistricts: [
      { key: 'sub_nutsubidze', ka: 'ნუცუბიძის ფერდობი' },
      { key: 'sub_saburtalo', ka: 'საბურთალო' },
      { key: 'sub_dighomi_village', ka: 'სოფ. დიღომი' },
      { key: 'sub_vazha_pshavela', ka: 'ვაჟა ფშაველას კვარტლები' },
      { key: 'sub_lisi_lake', ka: 'ლისის ტბა' },
      { key: 'sub_turtle_lake', ka: 'კუს ტბა' },
      { key: 'sub_bagebi', ka: 'ბაგები' },
      { key: 'sub_didi_dighomi', ka: 'დიდი დიღომი' },
      { key: 'sub_dighomi_1_9', ka: 'დიღომი 1-9' },
      { key: 'sub_vake', ka: 'ვაკე' },
      { key: 'sub_vashlijvari', ka: 'ვაშლიჯვარი' },
      { key: 'sub_vedzisi', ka: 'ვეძისი' },
      { key: 'sub_tkhinvali', ka: 'თხინვალი' }
    ]
  },
  'isani_samgori': {
    labelKey: 'district_isani_samgori',
    subdistricts: [
      { key: 'sub_airport_settl', ka: 'აეროპორტის დას.' },
      { key: 'sub_dampalos', ka: 'დამპალოს დას.' },
      { key: 'sub_vazisubani', ka: 'ვაზისუბანი' },
      { key: 'sub_varketili', ka: 'ვარკეთილი' },
      { key: 'sub_isani', ka: 'ისანი' },
      { key: 'sub_lilo', ka: 'ლილო' },
      { key: 'sub_third_district', ka: 'მესამე მასივი' },
      { key: 'sub_ortachala', ka: 'ორთაჭალა' },
      { key: 'sub_orkhevi', ka: 'ორხევი' },
      { key: 'sub_samgori', ka: 'სამგორი' },
      { key: 'sub_ponichala', ka: 'ფონიჭალა' },
      { key: 'sub_airport_highway', ka: 'აეროპორტის გზატ.' },
      { key: 'sub_africa_settl', ka: 'აფრიკის დას.' },
      { key: 'sub_navtlughi', ka: 'ნავთლუღი' }
    ]
  },
  'gldani_nadzaladevi': {
    labelKey: 'district_gldani_nadzaladevi',
    subdistricts: [
      { key: 'sub_avchala', ka: 'ავჭალა' },
      { key: 'sub_gldani', ka: 'გლდანი' },
      { key: 'sub_gldanula', ka: 'გლდანულა' },
      { key: 'sub_zahesi', ka: 'ზაჰესი' },
      { key: 'sub_tbilisi_sea', ka: 'თბილისის ზღვა' },
      { key: 'sub_temqa', ka: 'თემქა' },
      { key: 'sub_koniaki', ka: 'კონიაკის დას.' },
      { key: 'sub_lotkini', ka: 'ლოტკინი' },
      { key: 'sub_mukhiani', ka: 'მუხიანი' },
      { key: 'sub_nadzaladevi', ka: 'ნაძალადევი' },
      { key: 'sub_sanzona', ka: 'სანზონა' },
      { key: 'sub_gldani_village', ka: 'სოფ. გლდანი' },
      { key: 'sub_ivertubani', ka: 'ივერთუბანი' }
    ]
  },
  'didube_chughureti': {
    labelKey: 'district_didube_chughureti',
    subdistricts: [
      { key: 'sub_didube', ka: 'დიდუბე' },
      { key: 'sub_dighmis_massive', ka: 'დიღმის მასივი' },
      { key: 'sub_kukia', ka: 'კუკია' },
      { key: 'sub_svaneti_district', ka: 'სვანეთის უბანი' },
      { key: 'sub_chughureti', ka: 'ჩუღურეთი' }
    ]
  },
  'old_tbilisi': {
    labelKey: 'district_old_tbilisi',
    subdistricts: [
      { key: 'sub_abanotubani', ka: 'აბანოთუბანი' },
      { key: 'sub_avlabari', ka: 'ავლაბარი' },
      { key: 'sub_elia', ka: 'ელია' },
      { key: 'sub_vera', ka: 'ვერა' },
      { key: 'sub_mtatsminda', ka: 'მთაწმინდა' },
      { key: 'sub_sololaki', ka: 'სოლოლაკი' }
    ]
  }
};

interface TbilisiDistrictSelectorProps {
  selectedDistrict: string;
  selectedSubdistricts: string[];
  onDistrictChange: (district: string) => void;
  onSubdistrictsChange: (subdistricts: string[]) => void;
}

export default function TbilisiDistrictSelector({
  selectedDistrict,
  selectedSubdistricts,
  onDistrictChange,
  onSubdistrictsChange
}: TbilisiDistrictSelectorProps) {
  const { t } = useTranslation();
  const [expandedDistrict, setExpandedDistrict] = useState<string | null>(selectedDistrict || null);

  // უბნის key-დან ვიპოვოთ
  const getSubdistrictKey = (kaName: string): string => {
    for (const district of Object.values(TBILISI_DISTRICTS)) {
      const sub = district.subdistricts.find(s => s.ka === kaName);
      if (sub) return sub.key;
    }
    return kaName;
  };

  // უბნის თარგმნა
  const translateSubdistrict = (kaName: string): string => {
    const key = getSubdistrictKey(kaName);
    const translated = t(`tbilisi.${key}`);
    // თუ თარგმანი არ არსებობს, დავაბრუნოთ ქართული
    return translated === `tbilisi.${key}` ? kaName : translated;
  };

  // რაიონის არჩევა (მთლიანი)
  const handleDistrictSelect = (districtKey: string) => {
    if (selectedDistrict === districtKey) {
      // თუ უკვე არჩეულია, გავხსნათ/დავხუროთ
      setExpandedDistrict(expandedDistrict === districtKey ? null : districtKey);
    } else {
      // ახალი რაიონის არჩევა
      onDistrictChange(districtKey);
      onSubdistrictsChange([]); // გავასუფთავოთ უბნები
      setExpandedDistrict(districtKey);
    }
  };

  // უბნის არჩევა/მოხსნა - ვინახავთ ქართულ key-ს
  const handleSubdistrictToggle = (subdistrictKa: string) => {
    if (selectedSubdistricts.includes(subdistrictKa)) {
      onSubdistrictsChange(selectedSubdistricts.filter(s => s !== subdistrictKa));
    } else {
      onSubdistrictsChange([...selectedSubdistricts, subdistrictKa]);
    }
  };

  // მთლიანი რაიონის მონიშვნა
  const handleSelectAllSubdistricts = (districtKey: string) => {
    const district = TBILISI_DISTRICTS[districtKey as keyof typeof TBILISI_DISTRICTS];
    if (!district) return;
    
    const allKaNames = district.subdistricts.map(s => s.ka);
    const allSelected = allKaNames.every(s => selectedSubdistricts.includes(s));
    if (allSelected) {
      // წავშალოთ ყველა
      onSubdistrictsChange(selectedSubdistricts.filter(s => !allKaNames.includes(s)));
    } else {
      // დავამატოთ ყველა
      const newSubs = [...selectedSubdistricts];
      allKaNames.forEach(s => {
        if (!newSubs.includes(s)) newSubs.push(s);
      });
      onSubdistrictsChange(newSubs);
    }
  };

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div className="text-sm font-medium text-slate-700 px-3 py-2 bg-slate-50 border-b border-slate-200">
        {t('tbilisi.title')}
      </div>
      
      <div className="max-h-[300px] overflow-y-auto">
        {Object.entries(TBILISI_DISTRICTS).map(([key, district]) => {
          const isExpanded = expandedDistrict === key;
          const isSelected = selectedDistrict === key;
          const allKaNames = district.subdistricts.map(s => s.ka);
          const allSubsSelected = allKaNames.every(s => selectedSubdistricts.includes(s));
          const someSubsSelected = allKaNames.some(s => selectedSubdistricts.includes(s));
          
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
                  {t(`tbilisi.${district.labelKey}`)}
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
                    const isSubSelected = selectedSubdistricts.includes(sub.ka);
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
                          {t(`tbilisi.${sub.key}`)}
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
            {t('tbilisi.selected_subdistricts')} ({selectedSubdistricts.length}):
          </div>
          <div className="flex flex-wrap gap-1">
            {selectedSubdistricts.slice(0, 5).map(sub => (
              <span key={sub} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                {translateSubdistrict(sub)}
              </span>
            ))}
            {selectedSubdistricts.length > 5 && (
              <span className="text-xs text-blue-600">+{selectedSubdistricts.length - 5} {t('tbilisi.other')}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
