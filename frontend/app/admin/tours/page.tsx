'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { resolveImageUrl, type PropertyQuery } from '@/lib/api';
import { getApiBase } from '@/lib/config';
import { AdminSidebar } from '@/components/AdminSidebar';
import { getTourEditUrl, resolveTourPublicUrl } from '@/lib/tourBuilder';
import { Filters, type FiltersState } from '@/components/Filters';
import { DEFAULT_MAP_FILTERS, filtersToPropertyQuery } from '@/lib/mapQuery';
import { trackSearchFilters } from '@/lib/searchAnalytics';
import type { Property } from '@/lib/types';

interface TourProperty {
  _id: string;
  title: string;
  city?: string;
  tbilisiDistrict?: string;
  type: string;
  dealType?: string;
  price?: number;
  priceCurrency?: string;
  sqm?: number;
  houseSqm?: number;
  status: string;
  photos: string[];
  tourLink: string;
  userId?: { name?: string; email?: string };
  createdAt: string;
}

function buildToursQueryString(filters: FiltersState, sortBy: string): string {
  const query: PropertyQuery = {
    ...filtersToPropertyQuery(filters, sortBy),
    limit: 200,
    page: 1,
  };

  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) continue;
    if (
      (k === 'tbilisiSubdistricts' ||
        k === 'type' ||
        k === 'dealType' ||
        k === 'amenities' ||
        k === 'buildingProject' ||
        k === 'renovationStatus' ||
        k === 'balconies' ||
        k === 'rooms' ||
        k === 'bedrooms') &&
      Array.isArray(v)
    ) {
      params.set(k, JSON.stringify(v));
    } else {
      params.set(k, String(v));
    }
  }
  return params.toString();
}

export default function AdminToursPage() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(true);
  const [properties, setProperties] = useState<TourProperty[]>([]);
  const [rangeProperties, setRangeProperties] = useState<Property[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<FiltersState>(DEFAULT_MAP_FILTERS);
  const [sortBy, setSortBy] = useState('date_desc');

  const clearAllFilters = useCallback(() => {
    setFilters({ ...DEFAULT_MAP_FILTERS });
  }, []);

  const fetchTours = useCallback(
    async (token: string, qs: string) => {
      const res = await fetch(`${getApiBase()}/api/admin/tours?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 403) {
        setError('წვდომა აკრძალულია. მხოლოდ ადმინისტრატორისთვის.');
        return null;
      }
      if (!res.ok) {
        setError('მონაცემების ჩატვირთვა ვერ მოხერხდა');
        return null;
      }
      return res.json() as Promise<{ properties: TourProperty[]; total: number }>;
    },
    []
  );

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    let alive = true;
    (async () => {
      try {
        const data = await fetchTours(token, 'limit=200&page=1');
        if (!alive || !data) return;
        setRangeProperties(data.properties as unknown as Property[]);
      } catch {
        if (alive) setError('სერვერთან კავშირი ვერ მოხერხდა');
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [router, fetchTours]);

  useEffect(() => {
    if (loading) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    let alive = true;
    const timer = window.setTimeout(async () => {
      setListLoading(true);
      setError('');

      try {
        const qs = buildToursQueryString(filters, sortBy);
        const data = await fetchTours(token, qs);
        if (!alive || !data) return;
        setProperties(data.properties);
        setTotal(data.total);
        trackSearchFilters('admin_tours', filters, { sort: sortBy, resultCount: data.properties.length });
      } catch {
        if (alive) setError('სერვერთან კავშირი ვერ მოხერხდა');
      } finally {
        if (alive) setListLoading(false);
      }
    }, 400);

    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [filters, sortBy, i18n.language, loading, fetchTours]);

  const handleRemoveTour = async (id: string) => {
    if (!confirm('ნამდვილად გსურთ ამ ობიექტიდან 3D ტურის მოხსნა? (ობიექტი არ წაიშლება)')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${getApiBase()}/api/admin/tours/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setProperties((prev) => prev.filter((p) => p._id !== id));
        setRangeProperties((prev) => prev.filter((p) => p._id !== id));
        setTotal((t) => Math.max(0, t - 1));
      } else {
        alert('წაშლა ვერ მოხერხდა');
      }
    } catch {
      alert('წაშლა ვერ მოხერხდა');
    }
  };

  const publicTourUrl = (tourLink: string) => resolveTourPublicUrl(tourLink);
  const editUrlFor = (tourLink: string) => {
    const resolved = resolveTourPublicUrl(tourLink);
    const id = resolved.match(/\/v\/([^/?#]+)/)?.[1];
    return id ? getTourEditUrl(id) : resolved;
  };

  if (error && loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <div className="text-6xl mb-4">🔒</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link href="/" className="text-blue-600 hover:underline">
            მთავარ გვერდზე დაბრუნება
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminSidebar />

      <div className="ml-64 p-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">3D ტურები</h1>
            <p className="text-gray-600">
              {listLoading ? t('loading', 'იტვირთება...') : `${total} ${t('results', 'შედეგი')}`}
            </p>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
          >
            <option value="date_desc">{t('sort_date_desc', 'ახალი → ძველი')}</option>
            <option value="date_asc">{t('sort_date_asc', 'ძველი → ახალი')}</option>
            <option value="price_asc">{t('sort_price_asc', 'ფასი ↑')}</option>
            <option value="price_desc">{t('sort_price_desc', 'ფასი ↓')}</option>
            <option value="area_asc">{t('sort_area_asc', 'ფართობი ↑')}</option>
            <option value="area_desc">{t('sort_area_desc', 'ფართობი ↓')}</option>
          </select>
        </div>

        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm text-gray-500">
            {t('toursSearchHint', 'ძიება მხოლოდ 3D ტურის მქონე განცხადებებში')}
          </p>
          <Filters
            value={filters}
            onChange={setFilters}
            onClearAll={clearAllFilters}
            rangeProperties={rangeProperties}
          />
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">{error}</div>
        )}

        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">ობიექტი</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">მფლობელი</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">ბმული</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">მოქმედებები</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading || listLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    იტვირთება...
                  </td>
                </tr>
              ) : properties.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    3D ტურები ვერ მოიძებნა
                  </td>
                </tr>
              ) : (
                properties.map((p) => (
                  <tr key={p._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-200">
                          {p.photos?.[0] ? (
                            <Image
                              src={resolveImageUrl(p.photos[0], 'thumb')}
                              alt={p.title}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-gray-400">🌐</div>
                          )}
                        </div>
                        <div>
                          <div className="max-w-[220px] truncate font-medium text-gray-800">{p.title}</div>
                          <div className="text-sm text-gray-500">
                            {p.city || ''}
                            {p.tbilisiDistrict ? `, ${p.tbilisiDistrict}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-800">{p.userId?.name || '-'}</div>
                      <div className="text-sm text-gray-500">{p.userId?.email || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <a
                        href={publicTourUrl(p.tourLink)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block max-w-[200px] truncate align-middle text-sm text-blue-600 hover:underline"
                      >
                        {publicTourUrl(p.tourLink)}
                      </a>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={publicTourUrl(p.tourLink)}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200"
                          title="ნახვა"
                        >
                          👁️
                        </a>
                        <a
                          href={editUrlFor(p.tourLink)}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                          title="რედაქტირება"
                        >
                          ✏️ რედაქტირება
                        </a>
                        <Link
                          href={`/property/${p._id}/edit`}
                          className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-700 hover:bg-amber-200"
                          title="ობიექტის რედაქტირება"
                        >
                          🏠
                        </Link>
                        <button
                          onClick={() => handleRemoveTour(p._id)}
                          className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700"
                          title="ტურის მოხსნა"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
