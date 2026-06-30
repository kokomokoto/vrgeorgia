'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getApiBase } from '@/lib/config';
import { AdminSidebar } from '@/components/AdminSidebar';
import { AdminSearchAnalytics, type SearchAnalyticsData } from '@/components/AdminSearchAnalytics';

const EMPTY_SEARCH_STATS: SearchAnalyticsData = {
  totalSearches: 0,
  uniqueSearchers: 0,
  sourceStats: [],
  dealTypeStats: [],
  typeStats: [],
  searchCityStats: [],
  regionStats: [],
  textQueryStats: [],
  roomsStats: [],
  bedroomsStats: [],
  amenitiesStats: [],
  tbilisiDistrictStats: [],
  tbilisiSubdistrictStats: [],
  buildingProjectStats: [],
  renovationStatusStats: [],
  balconiesStats: [],
  dailySearches: [],
  priceScaleStats: [],
  pricePerSqmScaleStats: [],
  sqmScaleStats: [],
  featureStats: {
    has3d: 0,
    hasPhotos: 0,
    priceFilter: 0,
    sqmFilter: 0,
    constructionYearFilter: 0,
    renovationYearFilter: 0,
    propertyIdSearch: 0,
  },
};

export default function AdminSearchAnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7d');
  const [searchStats, setSearchStats] = useState<SearchAnalyticsData>(EMPTY_SEARCH_STATS);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const res = await fetch(`${getApiBase()}/api/admin/analytics/search?period=${period}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 403) {
          setError('წვდომა აკრძალულია');
          return;
        }
        if (!res.ok) throw new Error('Failed');
        const json = await res.json();
        if (!alive) return;
        setSearchStats(json.searchStats ?? EMPTY_SEARCH_STATS);
      } catch {
        if (alive) setError('მონაცემების ჩატვირთვა ვერ მოხერხდა');
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [period, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <div className="text-6xl mb-4">🔒</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link href="/admin/analytics" className="text-blue-600 hover:underline">
            ანალიტიკა
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminSidebar />

      <div className="ml-64 p-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">🔍 სერჩის ანალიტიკა</h1>
            <p className="text-gray-600">ფილტრებისა და ძიების გამოყენების სტატისტიკა</p>
          </div>
          <div className="flex gap-2">
            {['7d', '30d', '90d'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  period === p ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {p === '7d' ? '7 დღე' : p === '30d' ? '30 დღე' : '90 დღე'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : (
          <AdminSearchAnalytics data={searchStats} />
        )}
      </div>
    </div>
  );
}
