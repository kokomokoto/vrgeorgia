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

type ToursTab = 'linked' | 'standalone';

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

interface StandaloneTour {
  id: string;
  title: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  isPublished: boolean;
  sceneCount: number;
  tourLink: string;
  createdBy?: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
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

function formatTourDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ka-GE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminToursPage() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<ToursTab>('linked');
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(true);
  const [properties, setProperties] = useState<TourProperty[]>([]);
  const [standaloneTours, setStandaloneTours] = useState<StandaloneTour[]>([]);
  const [rangeProperties, setRangeProperties] = useState<Property[]>([]);
  const [linkedTotal, setLinkedTotal] = useState(0);
  const [standaloneTotal, setStandaloneTotal] = useState(0);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<FiltersState>(DEFAULT_MAP_FILTERS);
  const [sortBy, setSortBy] = useState('date_desc');
  const [standaloneSearch, setStandaloneSearch] = useState('');
  const [showDrafts, setShowDrafts] = useState(false);

  const clearAllFilters = useCallback(() => {
    setFilters({ ...DEFAULT_MAP_FILTERS });
  }, []);

  const fetchLinkedTours = useCallback(async (token: string, qs: string) => {
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
  }, []);

  const fetchStandaloneTours = useCallback(
    async (token: string, q: string, sort: string, includeDrafts: boolean) => {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      params.set('sort', sort);
      if (includeDrafts) params.set('published_only', 'false');

      const res = await fetch(
        `${getApiBase()}/api/admin/tours/standalone?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.status === 403) {
        setError('წვდომა აკრძალულია. მხოლოდ ადმინისტრატორისთვის.');
        return null;
      }
      if (!res.ok) {
        setError('დამოუკიდებელი ტურების ჩატვირთვა ვერ მოხერხდა');
        return null;
      }
      return res.json() as Promise<{ tours: StandaloneTour[]; total: number }>;
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
        const [linkedData, standaloneData] = await Promise.all([
          fetchLinkedTours(token, 'limit=200&page=1'),
          fetchStandaloneTours(token, '', 'date_desc', false),
        ]);
        if (!alive) return;
        if (linkedData) {
          setRangeProperties(linkedData.properties as unknown as Property[]);
          setLinkedTotal(linkedData.total);
        }
        if (standaloneData) {
          setStandaloneTotal(standaloneData.total);
        }
      } catch {
        if (alive) setError('სერვერთან კავშირი ვერ მოხერხდა');
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [router, fetchLinkedTours, fetchStandaloneTours]);

  useEffect(() => {
    if (loading) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    let alive = true;
    const timer = window.setTimeout(async () => {
      setListLoading(true);
      setError('');

      try {
        if (activeTab === 'linked') {
          const qs = buildToursQueryString(filters, sortBy);
          const data = await fetchLinkedTours(token, qs);
          if (!alive || !data) return;
          setProperties(data.properties);
          setLinkedTotal(data.total);
          trackSearchFilters('admin_tours', filters, {
            sort: sortBy,
            resultCount: data.properties.length,
          });
        } else {
          const data = await fetchStandaloneTours(
            token,
            standaloneSearch,
            sortBy,
            showDrafts
          );
          if (!alive || !data) return;
          setStandaloneTours(data.tours);
          setStandaloneTotal(data.total);
        }
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
  }, [
    filters,
    sortBy,
    i18n.language,
    loading,
    activeTab,
    standaloneSearch,
    showDrafts,
    fetchLinkedTours,
    fetchStandaloneTours,
  ]);

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
        setLinkedTotal((count) => Math.max(0, count - 1));
        setStandaloneTotal((count) => count + 1);
      } else {
        alert('წაშლა ვერ მოხერხდა');
      }
    } catch {
      alert('წაშლა ვერ მოხერხდა');
    }
  };

  const handleDeleteStandaloneTour = async (tourId: string) => {
    if (
      !confirm(
        'ნამდვილად გსურთ ამ 3D ტურის სრული წაშლა? (სცენები და პანორამები წაიშლება)'
      )
    ) {
      return;
    }
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${getApiBase()}/api/admin/tours/records/${tourId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStandaloneTours((prev) => prev.filter((tour) => tour.id !== tourId));
        setStandaloneTotal((count) => Math.max(0, count - 1));
      } else {
        alert(data.message || 'წაშლა ვერ მოხერხდა');
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

  const currentTotal = activeTab === 'linked' ? linkedTotal : standaloneTotal;

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
              {listLoading
                ? t('loading', 'იტვირთება...')
                : `${currentTotal} ${t('results', 'შედეგი')}`}
            </p>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
          >
            <option value="date_desc">{t('sort_date_desc', 'ახალი → ძველი')}</option>
            <option value="date_asc">{t('sort_date_asc', 'ძველი → ახალი')}</option>
            {activeTab === 'linked' && (
              <>
                <option value="price_asc">{t('sort_price_asc', 'ფასი ↑')}</option>
                <option value="price_desc">{t('sort_price_desc', 'ფასი ↓')}</option>
                <option value="area_asc">{t('sort_area_asc', 'ფართობი ↑')}</option>
                <option value="area_desc">{t('sort_area_desc', 'ფართობი ↓')}</option>
              </>
            )}
          </select>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('linked')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'linked'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50'
            }`}
          >
            განცხადებთან მიბმული
            <span
              className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                activeTab === 'linked' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {linkedTotal}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('standalone')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'standalone'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50'
            }`}
          >
            დამოუკიდებელი ტურები
            <span
              className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                activeTab === 'standalone'
                  ? 'bg-amber-500 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {standaloneTotal}
            </span>
          </button>
        </div>

        {activeTab === 'linked' ? (
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm text-gray-500">
              {t(
                'toursSearchHint',
                'ძიება მხოლოდ 3D ტურის მქონე განცხადებებში — ტური უკვე მიბმულია ატვირთულ ობიექტზე'
              )}
            </p>
            <Filters
              value={filters}
              onChange={setFilters}
              onClearAll={clearAllFilters}
              rangeProperties={rangeProperties}
            />
          </div>
        ) : (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <p className="mb-3 text-sm text-amber-900">
              აქ ჩანს 3D ტურები, რომლებიც აწყობილი/გამოქვეყნებულია, მაგრამ განცხადებაზე არ არის
              მიბმული. ახალი ტურებისთვის ჩანს აგენტი, ვინც განცხადების ატვირთვიდან ააწყო ტური.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="search"
                value={standaloneSearch}
                onChange={(e) => setStandaloneSearch(e.target.value)}
                placeholder="ტურის სახელით ძიება..."
                className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-gray-800 sm:max-w-md"
              />
              <label className="flex items-center gap-2 text-sm text-amber-900">
                <input
                  type="checkbox"
                  checked={showDrafts}
                  onChange={(e) => setShowDrafts(e.target.checked)}
                  className="rounded border-amber-300"
                />
                ჩამონათვალში ნაბეჯვებიც (გამოუქვეყნებელი)
              </label>
            </div>
          </div>
        )}

        {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">{error}</div>}

        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          {activeTab === 'linked' ? (
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
                      განცხადებთან მიბმული 3D ტური ვერ მოიძებნა
                    </td>
                  </tr>
                ) : (
                  properties.map((p) => (
                    <tr key={p._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <Link
                          href={`/property/${p._id}`}
                          className="flex items-center gap-3 transition-opacity hover:opacity-80"
                          title="განცხადების ნახვა"
                        >
                          <div className="relative h-12 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-200">
                            {p.photos?.[0] ? (
                              <Image
                                src={resolveImageUrl(p.photos[0], 'thumb')}
                                alt={p.title}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-gray-400">
                                🌐
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="mb-1">
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                განცხადებზე
                              </span>
                            </div>
                            <div className="max-w-[220px] truncate font-medium text-blue-700 hover:underline">
                              {p.title}
                            </div>
                            <div className="text-sm text-gray-500">
                              {p.city || ''}
                              {p.tbilisiDistrict ? `, ${p.tbilisiDistrict}` : ''}
                            </div>
                          </div>
                        </Link>
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
                          <Link
                            href={`/property/${p._id}`}
                            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700"
                            title="განცხადების ნახვა"
                          >
                            📄 განცხადება
                          </Link>
                          <a
                            href={publicTourUrl(p.tourLink)}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200"
                            title="3D ტურის ნახვა"
                          >
                            👁️
                          </a>
                          <a
                            href={editUrlFor(p.tourLink)}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                            title="3D ტურის რედაქტირება"
                          >
                            ✏️ ტური
                          </a>
                          <Link
                            href={`/property/${p._id}/edit`}
                            className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-700 hover:bg-amber-200"
                            title="განცხადების რედაქტირება"
                          >
                            🏠
                          </Link>
                          <button
                            onClick={() => handleRemoveTour(p._id)}
                            className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700"
                            title="ტურის მოხსნა განცხადებიდან"
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
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">ტური</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">აგენტი</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">სტატუსი</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">განახლება</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">ბმული</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">მოქმედებები</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading || listLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      იტვირთება...
                    </td>
                  </tr>
                ) : standaloneTours.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      დამოუკიდებელი 3D ტური ვერ მოიძებნა
                    </td>
                  </tr>
                ) : (
                  standaloneTours.map((tour) => (
                    <tr key={tour.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100 text-2xl">
                            🌐
                          </div>
                          <div>
                            <div className="mb-1">
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                                დამოუკიდებელი
                              </span>
                            </div>
                            <div className="max-w-[260px] truncate font-medium text-gray-800">
                              {tour.title || 'უსახელო ტური'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {tour.sceneCount} სცენა · ID: {tour.id.slice(0, 8)}…
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {tour.createdBy ? (
                          <>
                            <div className="text-gray-800">{tour.createdBy.name || '—'}</div>
                            <div className="text-sm text-gray-500">{tour.createdBy.email || '—'}</div>
                          </>
                        ) : (
                          <div className="text-sm text-gray-400">უცნობი (ძველი ტური)</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {tour.isPublished ? (
                          <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                            გამოქვეყნებული
                          </span>
                        ) : (
                          <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                            ნაბეჯვი
                          </span>
                        )}
                        <div className="mt-1 text-xs text-gray-500">
                          {tour.isPublished
                            ? formatTourDate(tour.publishedAt)
                            : 'ჯერ არ არის გამოქვეყნებული'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatTourDate(tour.updatedAt)}
                      </td>
                      <td className="px-6 py-4">
                        <a
                          href={publicTourUrl(tour.tourLink)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block max-w-[200px] truncate align-middle text-sm text-blue-600 hover:underline"
                        >
                          {publicTourUrl(tour.tourLink)}
                        </a>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={publicTourUrl(tour.tourLink)}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200"
                            title="ნახვა"
                          >
                            👁️
                          </a>
                          <a
                            href={getTourEditUrl(tour.id)}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                            title="რედაქტირება"
                          >
                            ✏️ რედაქტირება
                          </a>
                          <button
                            onClick={() => handleDeleteStandaloneTour(tour.id)}
                            className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700"
                            title="ტურის სრული წაშლა"
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
          )}
        </div>
      </div>
    </div>
  );
}
