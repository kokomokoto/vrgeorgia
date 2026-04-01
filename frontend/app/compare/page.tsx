'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useCompare } from '@/components/CompareProvider';
import { resolveImageUrl } from '@/lib/api';
import type { Property } from '@/lib/types';

export default function ComparePage() {
  const { t } = useTranslation();
  const { compareProperties, removeFromCompare, clearCompare } = useCompare();
  const [mounted, setMounted] = React.useState(false);
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('asc');
  React.useEffect(() => { setMounted(true); }, []);

  const sortOptions: { key: string; label: string; getValue: (p: Property) => number }[] = [
    { key: 'price', label: t('price'), getValue: (p) => p.price || 0 },
    { key: 'sqm', label: t('sqm'), getValue: (p) => p.sqm || 0 },
    { key: 'rooms', label: t('rooms'), getValue: (p) => p.rooms || 0 },
    { key: 'pricePerSqm', label: t('pricePerSqm'), getValue: (p) => p.sqm ? Math.round(p.price / p.sqm) : 0 },
    { key: 'floor', label: 'სართული', getValue: (p) => p.floor || 0 },
  ];

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortKey(null); setSortDir('asc'); }
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = React.useMemo(() => {
    if (!sortKey) return compareProperties;
    const opt = sortOptions.find(o => o.key === sortKey);
    if (!opt) return compareProperties;
    return [...compareProperties].sort((a, b) => {
      const va = opt.getValue(a);
      const vb = opt.getValue(b);
      return sortDir === 'asc' ? va - vb : vb - va;
    });
  }, [compareProperties, sortKey, sortDir]);

  if (!mounted) return null;

  const specs = [
    { key: 'price', label: t('price'), format: (p: Property) => `$${p.price.toLocaleString()}` },
    { key: 'sqm', label: t('sqm'), format: (p: Property) => p.sqm ? `${p.sqm} კვ.მ` : '-' },
    { key: 'rooms', label: t('rooms'), format: (p: Property) => p.rooms ? p.rooms.toString() : '-' },
    { key: 'pricePerSqm', label: t('pricePerSqm'), format: (p: Property) => p.sqm ? `$${Math.round(p.price / p.sqm).toLocaleString()}` : '-' },
    { key: 'type', label: t('type'), format: (p: Property) => t(p.type) },
    { key: 'dealType', label: t('dealType'), format: (p: Property) => t(p.dealType === 'rent' ? 'rentType' : p.dealType) },
    { key: 'city', label: t('city'), format: (p: Property) => p.city || '-' },
    { key: 'region', label: t('region'), format: (p: Property) => p.region ? t(`region_${p.region}`) : '-' },
    { key: 'floor', label: 'სართული', format: (p: Property) => p.floor ? `${p.floor}${p.totalFloors ? ` / ${p.totalFloors}` : ''}` : '-' },
    { key: 'balcony', label: 'აივანი', format: (p: Property) => p.balcony ? p.balcony.toString() : '-' },
    { key: 'bathroom', label: 'სველი წერტილი', format: (p: Property) => p.bathroom ? p.bathroom.toString() : '-' },
    { key: 'elevator', label: '🛗 ლიფტი', format: (p: Property) => p.amenities?.elevator ? '✓' : '✗' },
    { key: 'furniture', label: '🛋️ ავეჯი', format: (p: Property) => p.amenities?.furniture ? '✓' : '✗' },
    { key: 'internet', label: '📶 ინტერნეტი', format: (p: Property) => p.amenities?.internet ? '✓' : '✗' },
    { key: 'airConditioner', label: '❄️ კონდიციონერი', format: (p: Property) => p.amenities?.airConditioner ? '✓' : '✗' },
    { key: 'centralHeating', label: '🔥 გათბობა', format: (p: Property) => p.amenities?.centralHeating ? '✓' : '✗' },
    { key: 'naturalGas', label: '🔵 აირი', format: (p: Property) => p.amenities?.naturalGas ? '✓' : '✗' },
    { key: 'garage', label: '🚗 ავტოფარეხი', format: (p: Property) => p.amenities?.garage ? '✓' : '✗' },
    { key: 'security', label: '🔒 დაცვა', format: (p: Property) => p.amenities?.security ? '✓' : '✗' },
    { key: 'pool', label: '🏊 აუზი', format: (p: Property) => p.amenities?.pool ? '✓' : '✗' },
    { key: 'garden', label: '🌳 ბაღი', format: (p: Property) => p.amenities?.garden ? '✓' : '✗' },
    { key: 'has3d', label: t('has3d'), format: (p: Property) => (p.exteriorLink || p.interiorLink || p.threeDLink) ? '✓' : '✗' },
  ];

  if (compareProperties.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <div className="text-6xl mb-4">📊</div>
          <div className="text-lg font-medium text-slate-700 mb-2">{t('compareProperties')}</div>
          <div className="text-slate-500 mb-4">შედარებაში არაფერია დამატებული</div>
          <Link 
            href="/" 
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {t('browseProperties')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="rounded-lg border border-slate-200 bg-white p-4 mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
          <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v18m-7-4l3-8 3 8m-5.5-2h5M16 7l3 8m-5.5 0h5L16 7z" />
          </svg>
          {t('compareProperties')} ({compareProperties.length})
        </h1>
        <button
          onClick={clearCompare}
          className="px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
        >
          {t('clearCompare')}
        </button>
      </div>

      {/* დალაგების ღილაკები */}
      <div className="rounded-lg border border-slate-200 bg-white p-3 mb-4 flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-500 font-medium mr-1">დალაგება:</span>
        {sortOptions.map((opt) => {
          const isActive = sortKey === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => handleSort(opt.key)}
              className={`px-3 py-1.5 text-xs rounded-md border transition-colors flex items-center gap-1 ${
                isActive
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              {opt.label}
              {isActive && (
                <span className="text-[10px]">{sortDir === 'asc' ? '▲' : '▼'}</span>
              )}
            </button>
          );
        })}
        {sortKey && (
          <button
            onClick={() => { setSortKey(null); setSortDir('asc'); }}
            className="px-2 py-1.5 text-xs text-slate-400 hover:text-slate-600"
          >
            ✕ გასუფთავება
          </button>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-auto max-h-[80vh]">
          <table className="w-max min-w-full">
            <thead className="sticky top-0 z-30">
              <tr className="border-b border-slate-200 bg-white">
                <th className="text-left p-4 bg-slate-50 font-medium text-slate-600 w-44 min-w-[176px] sticky left-0 z-40 bg-slate-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"></th>
                {sorted.map((property) => {
                  const photo = property.photos?.[property.mainPhoto || 0] || property.photos?.[0];
                  return (
                    <th key={property._id} className="p-4 text-center w-[200px] min-w-[200px] max-w-[200px] bg-white">
                      <div className="relative">
                        <button
                          onClick={() => removeFromCompare(property._id)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 z-10"
                        >
                          ✕
                        </button>
                        <Link href={`/property/${property._id}`}>
                          <div className="w-[168px] h-[126px] mx-auto rounded-lg overflow-hidden mb-2">
                            {photo ? (
                              <img
                                src={resolveImageUrl(photo)}
                                alt={property.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                                <span className="text-3xl">🏠</span>
                              </div>
                            )}
                          </div>
                          <div className="font-semibold text-slate-900 text-sm truncate hover:text-blue-600">
                            {property.title}
                          </div>
                        </Link>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {specs.map((spec, idx) => (
                <tr key={spec.key} className={idx % 2 === 0 ? 'bg-slate-50' : ''}>
                  <td className={`p-4 font-medium text-slate-600 text-sm whitespace-nowrap sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] ${idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'}`}>{spec.label}</td>
                  {sorted.map((property) => {
                    const value = spec.format(property);
                    const isHighlight = spec.key === 'price' || spec.key === 'pricePerSqm';
                    const isYes = value === '✓';
                    const isNo = value === '✗';
                    return (
                      <td 
                        key={property._id} 
                        className={`p-4 text-center text-sm ${isHighlight ? 'font-bold text-blue-700' : isYes ? 'text-green-600 font-semibold' : isNo ? 'text-red-400' : 'text-slate-700'}`}
                      >
                        {isYes ? <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-100 text-green-600 text-lg">✓</span> : isNo ? <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-50 text-red-400 text-lg">✗</span> : value}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
