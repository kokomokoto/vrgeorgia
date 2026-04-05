'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';

import { listProperties } from '@/lib/api';
import type { Property } from '@/lib/types';
import { Filters, type FiltersState } from '@/components/Filters';
import { MapView } from '@/components/MapView';
import { PropertyCard } from '@/components/PropertyCard';

// კატეგორიები იკონებით
const PROPERTY_CATEGORIES = [
  { value: 'apartment', label: 'ბინა', icon: '🏢' },
  { value: 'house', label: 'კერძო სახლი', icon: '🏠' },
  { value: 'commercial', label: 'კომერციული', icon: '🏪' },
  { value: 'land', label: 'მიწა', icon: '🌍' },
  { value: 'cottage', label: 'აგარაკი', icon: '🏡' },
  { value: 'hotel', label: 'სასტუმრო', icon: '🏨' },
  { value: 'building', label: 'შენობა', icon: '🏗️' },
  { value: 'warehouse', label: 'საწყობი', icon: '📦' },
  { value: 'parking', label: 'ავტოფარეხი', icon: '🚗' },
];

const initial: FiltersState = {
  q: '',
  minPrice: '',
  maxPrice: '',
  priceCurrency: '',
  priceType: '',
  city: '',
  region: '',
  tbilisiDistrict: '',
  tbilisiSubdistricts: [],
  type: [],
  dealType: [],
  has3d: '',
  hasPhotos: '',
  minSqm: '',
  maxSqm: '',
  minRooms: '',
  maxRooms: '',
  amenities: [],
  propertyId: ''
};

export default function HomePage() {
  const { i18n } = useTranslation();
  const [filters, setFilters] = React.useState<FiltersState>(initial);
  const [properties, setProperties] = React.useState<Property[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [sortBy, setSortBy] = React.useState('date_desc');
  const [categoriesOpen, setCategoriesOpen] = React.useState(false);
  const [mapOpen, setMapOpen] = React.useState(false);
  const ITEMS_PER_PAGE = 30;

  // URL-დან amenities-ის წაკითხვა (property detail გვერდიდან გადამისამართებისას)
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const amenitiesParam = params.get('amenities');
    if (amenitiesParam) {
      try {
        const amenities = JSON.parse(amenitiesParam);
        if (Array.isArray(amenities) && amenities.length > 0) {
          setFilters(prev => ({ ...prev, amenities }));
          // URL-ის გასუფთავება
          window.history.replaceState({}, '', '/');
        }
      } catch (e) {}
    }
  }, []);

  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    listProperties({
      ...filters,
      sort: sortBy,
      lang: i18n.language
    })
      .then((r) => {
        if (!alive) return;
        setProperties(r.properties);
        setCurrentPage(1);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e.message || 'Failed');
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [filters, sortBy, i18n.language]);

  // ყველა პროპერტის ჩატვირთვა კატეგორიების რაოდენობისთვის
  const [allProperties, setAllProperties] = React.useState<Property[]>([]);
  React.useEffect(() => {
    listProperties({ lang: i18n.language })
      .then((r) => setAllProperties(r.properties))
      .catch(() => {});
  }, [i18n.language]);

  // კატეგორიების რაოდენობის გამოთვლა
  const categoryCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    PROPERTY_CATEGORIES.forEach(cat => {
      counts[cat.value] = allProperties.filter(p => p.type === cat.value).length;
    });
    return counts;
  }, [allProperties]);

  // პაგინაცია
  const totalPages = Math.ceil(properties.length / ITEMS_PER_PAGE);
  const paginatedProperties = React.useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return properties.slice(start, start + ITEMS_PER_PAGE);
  }, [properties, currentPage]);

  // გვერდის ცვლილებისას ზემოთ სქროლი
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="grid gap-4">
      {/* ფილტრები ჰორიზონტალურად */}
      <Filters value={filters} onChange={setFilters} />

      {/* კატეგორიები - მობაილზე ჩამოსაშლელი, დესკტოპზე ყოველთვის ჩანს */}
      <div className="md:hidden rounded-lg border border-slate-200 bg-white p-3">
        <button
          type="button"
          onClick={() => setCategoriesOpen(!categoriesOpen)}
          className="w-full flex items-center justify-between gap-2 text-sm font-semibold text-slate-700"
        >
          <div className="flex items-center gap-2">
            <span>🏠</span>
            <span>კატეგორიები</span>
            {filters.type.length > 0 && (
              <span className="bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {filters.type.length}
              </span>
            )}
          </div>
          <svg className={`w-5 h-5 text-slate-400 transition-transform ${categoriesOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {categoriesOpen && (
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100">
            {PROPERTY_CATEGORIES.map((cat) => {
              const isSelected = filters.type.includes(cat.value);
              return (
                <button
                  key={cat.value}
                  onClick={() => setFilters(prev => ({ 
                    ...prev, 
                    type: isSelected 
                      ? prev.type.filter(t => t !== cat.value) 
                      : [...prev.type, cat.value]
                  }))}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <span className="text-xl mb-0.5">{cat.icon}</span>
                  <span className={`text-[10px] font-medium text-center leading-tight ${
                    isSelected ? 'text-blue-700' : 'text-slate-700'
                  }`}>
                    {cat.label}
                  </span>
                  <span className={`text-[10px] ${
                    isSelected ? 'text-blue-600' : 'text-slate-400'
                  }`}>
                    {categoryCounts[cat.value] || 0}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* კატეგორიები - დესკტოპზე ყოველთვის ჩანს */}
      <div className="hidden md:grid grid-cols-5 lg:grid-cols-9 gap-3">
        {PROPERTY_CATEGORIES.map((cat) => {
          const isSelected = filters.type.includes(cat.value);
          return (
            <button
              key={cat.value}
              onClick={() => setFilters(prev => ({ 
                ...prev, 
                type: isSelected 
                  ? prev.type.filter(t => t !== cat.value) 
                  : [...prev.type, cat.value]
              }))}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all hover:shadow-md hover:scale-105 ${
                isSelected 
                  ? 'border-blue-500 bg-blue-50 shadow-md' 
                  : 'border-slate-200 bg-white hover:border-blue-300'
              }`}
            >
              <span className="text-2xl mb-1">{cat.icon}</span>
              <span className={`text-xs font-medium text-center ${
                isSelected ? 'text-blue-700' : 'text-slate-700'
              }`}>
                {cat.label}
              </span>
              <span className={`text-xs mt-0.5 ${
                isSelected ? 'text-blue-600' : 'text-slate-400'
              }`}>
                {categoryCounts[cat.value] || 0}
              </span>
            </button>
          );
        })}
      </div>
      
      {/* რუკა - მობაილზე ჩამოსაშლელი */}
      <div className="md:hidden rounded-lg border border-slate-200 bg-white p-3">
        <button
          type="button"
          onClick={() => setMapOpen(!mapOpen)}
          className="w-full flex items-center justify-between gap-2 text-sm font-semibold text-slate-700"
        >
          <div className="flex items-center gap-2">
            <span>🗺️</span>
            <span>რუკა</span>
          </div>
          <svg className={`w-5 h-5 text-slate-400 transition-transform ${mapOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {mapOpen && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <MapView properties={properties} />
          </div>
        )}
      </div>

      {/* რუკა - დესკტოპზე ყოველთვის ჩანს */}
      <div className="hidden md:block">
        <MapView properties={properties} />
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {loading && <div className="text-sm text-slate-500">Loading…</div>}

      {/* სორტირება და რაოდენობა */}
      {!loading && properties.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-600">
            ნაპოვნია: <span className="font-semibold">{properties.length}</span> ობიექტი
            {totalPages > 1 && (
              <span className="ml-2">
                (გვერდი {currentPage} / {totalPages})
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">სორტირება:</span>
            <select
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="date_desc">📅 ახალი → ძველი</option>
              <option value="date_asc">📅 ძველი → ახალი</option>
              <option value="price_asc">💰 ფასი ↑</option>
              <option value="price_desc">💰 ფასი ↓</option>
              <option value="area_asc">📐 ფართობი ↑</option>
              <option value="area_desc">📐 ფართობი ↓</option>
              <option value="views_desc">👁️ ნახვები ↓</option>
              <option value="views_asc">👁️ ნახვები ↑</option>
            </select>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {paginatedProperties.map((p) => (
          <PropertyCard key={p._id} p={p} />
        ))}
      </div>

      {/* პაგინაცია */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          {/* წინა გვერდი */}
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ←
          </button>

          {/* გვერდების ნომრები */}
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
            // ვაჩვენებთ პირველ, ბოლო, და მიმდინარე გვერდის ახლოს მყოფებს
            const showPage = 
              page === 1 || 
              page === totalPages || 
              Math.abs(page - currentPage) <= 2;
            
            const showEllipsis = 
              (page === 2 && currentPage > 4) ||
              (page === totalPages - 1 && currentPage < totalPages - 3);

            if (showEllipsis) {
              return <span key={page} className="px-2 text-slate-400">...</span>;
            }

            if (!showPage) return null;

            return (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`min-w-[40px] px-3 py-2 rounded-lg border transition-colors ${
                  page === currentPage
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-slate-300 hover:bg-slate-100'
                }`}
              >
                {page}
              </button>
            );
          })}

          {/* შემდეგი გვერდი */}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
