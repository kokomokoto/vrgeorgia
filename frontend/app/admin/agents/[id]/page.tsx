'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { resolveImageUrl, type PropertyQuery } from '@/lib/api';
import { getApiBase } from '@/lib/config';
import { AdminSidebar } from '@/components/AdminSidebar';
import { AdminTransferPropertyModal } from '@/components/AdminTransferPropertyModal';
import { Filters, type FiltersState } from '@/components/Filters';
import {
  DEFAULT_MAP_FILTERS,
  filtersAreActive,
  filtersToPropertyQuery,
} from '@/lib/mapQuery';
import { trackSearchFilters } from '@/lib/searchAnalytics';
import type { Property } from '@/lib/types';

interface AgentDetail {
  _id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  photo?: string;
  verified: boolean;
  avgRating: number;
  totalReviews: number;
  createdAt: string;
  user?: { _id: string; name: string; email: string; role: string };
}

interface PropertyRow {
  _id: string;
  title: string;
  type: string;
  dealType: string;
  price: number;
  priceCurrency: string;
  city: string;
  tbilisiDistrict: string;
  sqm: number;
  status: string;
  listingVisibility?: 'public' | 'unlisted' | 'private';
  pinned?: boolean;
  photos: string[];
  createdAt: string;
}

const propertyTypeNames: Record<string, string> = {
  apartment: 'ბინა',
  house: 'სახლი',
  commercial: 'კომერციული',
  land: 'მიწა',
  cottage: 'აგარაკი',
  hotel: 'სასტუმრო',
  building: 'შენობა',
  warehouse: 'საწყობი',
  parking: 'ავტოფარეხი',
  business: 'ბიზნესი',
};

const dealTypeNames: Record<string, string> = {
  sale: 'იყიდება',
  rent: 'ქირავდება',
  mortgage: 'გირავდება',
};

const statusNames: Record<string, string> = {
  pending: 'მოლოდინში',
  active: 'აქტიური',
  rejected: 'უარყოფილი',
  sold: 'გაყიდული',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  active: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  sold: 'bg-gray-100 text-gray-700',
};

const visibilityColors: Record<string, string> = {
  public: 'bg-emerald-100 text-emerald-700',
  unlisted: 'bg-blue-100 text-blue-700',
  private: 'bg-slate-200 text-slate-700',
};

function buildAgentPropertiesQueryString(
  filters: FiltersState,
  sortBy: string,
  page: number,
  statusFilter: string,
  visibilityFilter: string,
  userId: string
): string {
  const query: PropertyQuery = {
    ...filtersToPropertyQuery(filters, sortBy),
    limit: 20,
    page,
    userId,
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
        k === 'buildingStatus' ||
        k === 'landStatus' ||
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
  if (statusFilter) params.set('status', statusFilter);
  if (visibilityFilter) params.set('listingVisibility', visibilityFilter);
  return params.toString();
}

export default function AdminAgentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const agentId = params.id;

  const [loading, setLoading] = useState(true);
  const [initPropsLoading, setInitPropsLoading] = useState(true);
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [allPropertiesCount, setAllPropertiesCount] = useState(0);
  const [propertiesTotal, setPropertiesTotal] = useState(0);
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [rangeProperties, setRangeProperties] = useState<Property[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState('');
  const [filters, setFilters] = useState<FiltersState>(DEFAULT_MAP_FILTERS);
  const [sortBy, setSortBy] = useState('date_desc');
  const [propsLoading, setPropsLoading] = useState(false);
  const [error, setError] = useState('');
  const [transferTarget, setTransferTarget] = useState<{ id: string; title: string } | null>(null);

  const clearAllFilters = useCallback(() => {
    setFilters({ ...DEFAULT_MAP_FILTERS });
    setStatusFilter('');
    setVisibilityFilter('');
  }, []);

  const authHeaders = useCallback(() => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : null;
  }, []);

  const fetchAgent = useCallback(async () => {
    const headers = authHeaders();
    if (!headers) {
      router.push('/login');
      return;
    }
    const res = await fetch(`${getApiBase()}/api/admin/agents/${agentId}`, { headers });
    if (res.status === 403) {
      setError('წვდომა აკრძალულია');
      return;
    }
    if (!res.ok) {
      setError('აგენტი ვერ მოიძებნა');
      return;
    }
    const data = await res.json();
    setAgent(data.agent);
    setUserId(data.userId || null);
    setAllPropertiesCount(data.propertyCount ?? 0);
  }, [agentId, authHeaders, router]);

  const fetchProperties = useCallback(async () => {
    if (!userId) {
      setProperties([]);
      return;
    }
    const headers = authHeaders();
    if (!headers) return;

    setPropsLoading(true);
    try {
      const qs = buildAgentPropertiesQueryString(
        filters,
        sortBy,
        page,
        statusFilter,
        visibilityFilter,
        userId
      );
      const res = await fetch(`${getApiBase()}/api/admin/properties?${qs}`, { headers });
      if (!res.ok) return;
      const data = await res.json();
      setProperties(data.properties || []);
      setPages(data.pages || 1);
      setPropertiesTotal(data.total ?? 0);
      if (!filtersAreActive(filters) && !statusFilter && !visibilityFilter) {
        setAllPropertiesCount(data.total ?? 0);
      }
      trackSearchFilters('admin_agent_detail', filters, {
        agentId,
        sort: sortBy,
        resultCount: data.properties?.length ?? 0,
      });
    } finally {
      setPropsLoading(false);
    }
  }, [userId, page, statusFilter, visibilityFilter, filters, sortBy, authHeaders, agentId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchAgent();
      setLoading(false);
    })();
  }, [fetchAgent]);

  useEffect(() => {
    if (!userId) {
      setInitPropsLoading(false);
      return;
    }
    const headers = authHeaders();
    if (!headers) return;

    let alive = true;
    (async () => {
      try {
        const qs = new URLSearchParams({ userId, limit: '200', page: '1', sort: 'date_desc' });
        const res = await fetch(`${getApiBase()}/api/admin/properties?${qs}`, { headers });
        if (!res.ok || !alive) return;
        const data = await res.json();
        setRangeProperties((data.properties || []) as Property[]);
        setAllPropertiesCount(data.total ?? data.properties?.length ?? 0);
      } finally {
        if (alive) setInitPropsLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [userId, authHeaders]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, visibilityFilter, filters, sortBy]);

  useEffect(() => {
    if (loading || initPropsLoading || !userId) return;

    let alive = true;
    const timer = window.setTimeout(() => {
      if (alive) void fetchProperties();
    }, 400);

    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [loading, initPropsLoading, userId, fetchProperties, page]);

  const handleStatusChange = async (propertyId: string, status: string) => {
    const reason = status === 'rejected' ? (prompt('მიუთითეთ უარყოფის მიზეზი') || '').trim() : '';
    if (status === 'rejected' && !reason) {
      alert('უარყოფის მიზეზი აუცილებელია');
      return;
    }
    const headers = authHeaders();
    if (!headers) return;
    const res = await fetch(`${getApiBase()}/api/admin/properties/${propertyId}/status`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reason }),
    });
    if (res.ok) fetchProperties();
    else alert('განახლება ვერ მოხერხდა');
  };

  const handleDelete = async (propertyId: string) => {
    if (!confirm('განცხადება გადავა ნაგვის ყუთში. გავაგრძელოთ?')) return;
    const headers = authHeaders();
    if (!headers) return;
    const res = await fetch(`${getApiBase()}/api/admin/properties/${propertyId}`, {
      method: 'DELETE',
      headers,
    });
    if (res.ok) {
      await fetchAgent();
      fetchProperties();
    } else alert('წაშლა ვერ მოხერხდა');
  };

  const handleTogglePin = async (propertyId: string, pinned: boolean) => {
    const headers = authHeaders();
    if (!headers) return;
    const res = await fetch(`${getApiBase()}/api/admin/properties/${propertyId}/pin`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned }),
    });
    if (res.ok) {
      setProperties((prev) => prev.map((p) => (p._id === propertyId ? { ...p, pinned } : p)));
    } else alert('ოპერაცია ვერ შესრულდა');
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <p className="text-gray-600 mb-4">{error}</p>
          <Link href="/admin/agents" className="text-blue-600 hover:underline">
            ← აგენტების სია
          </Link>
        </div>
      </div>
    );
  }

  if (loading || !agent) {
    return (
      <div className="min-h-screen bg-gray-100">
        <AdminSidebar />
        <div className="ml-64 p-8 text-gray-500">იტვირთება...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminSidebar />

      <div className="ml-64 p-8">
        <div className="mb-6">
          <Link href="/admin/agents" className="text-blue-600 hover:underline text-sm">
            ← აგენტების სია
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link
                href={`/agents/${agent._id}`}
                target="_blank"
                className="flex items-center gap-4 rounded-lg transition-colors hover:bg-gray-50"
              >
                {agent.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolveImageUrl(agent.photo)}
                    alt=""
                    className="h-14 w-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-2xl">
                    👤
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">{agent.name}</h1>
                  <p className="text-gray-500">{agent.company || 'დამოუკიდებელი'}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    📧 {agent.email} · 📞 {agent.phone || '—'}
                  </p>
                </div>
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {agent.verified ? (
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  ✓ ვერიფიცირებული
                </span>
              ) : (
                <span
                  className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium"
                  title="აგენტი ჯერ არ არის ვერიფიცირებული ადმინის მიერ"
                >
                  ვერიფიცირება მოლოდინში
                </span>
              )}
              <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm">
                🏘️ {allPropertiesCount} განცხადება
              </span>
              <Link
                href={`/agents/${agent._id}`}
                target="_blank"
                className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200"
              >
                საჯარო პროფილი ↗
              </Link>
            </div>
          </div>
        </div>

        <div className="mb-4 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-gray-800">განცხადებები</h2>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={visibilityFilter}
                onChange={(e) => setVisibilityFilter(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
                aria-label={t('listingVisibilityLabel')}
              >
                <option value="">{t('all_visibilities')}</option>
                <option value="public">{t('listingMode_public')}</option>
                <option value="unlisted">{t('listingMode_unlisted')}</option>
                <option value="private">{t('listingMode_private')}</option>
                <option value="sold">{t('listingMode_sold')}</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">ყველა სტატუსი</option>
                <option value="pending">მოლოდინში</option>
                <option value="active">აქტიური</option>
                <option value="rejected">უარყოფილი</option>
                <option value="sold">გაყიდული</option>
              </select>
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
                <option value="views_desc">{t('sort_views_desc', 'ნახვები ↓')}</option>
              </select>
            </div>
          </div>

          {userId && allPropertiesCount > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="mb-3 text-sm text-gray-500">
                {t('adminAgentPropertySearchHint', 'ძიება მხოლოდ ამ აგენტის განცხადებებში')}
              </p>
              <Filters
                value={filters}
                onChange={setFilters}
                onClearAll={clearAllFilters}
                rangeProperties={rangeProperties}
                showCategories
              />
            </div>
          )}

          {userId && allPropertiesCount > 0 && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-sm font-medium text-gray-800">
                {propsLoading
                  ? t('loading', 'იტვირთება...')
                  : filtersAreActive(filters) || statusFilter || visibilityFilter
                    ? t('found_results', {
                        count: propertiesTotal,
                        total: allPropertiesCount,
                      })
                    : t('agentListingsFound', { count: propertiesTotal })}
              </p>
            </div>
          )}
        </div>

        {!userId ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
            ამ აგენტს არ აქვს დაკავშირებული მომხმარებლის ანგარიში — განცხადებები ვერ ჩაიტვირთება.
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">განცხადება</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">ტიპი</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">ფასი</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">სტატუსი</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    {t('listingVisibilityLabel')}
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">მოქმედებები</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {propsLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      იტვირთება...
                    </td>
                  </tr>
                ) : properties.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      განცხადებები ვერ მოიძებნა
                    </td>
                  </tr>
                ) : (
                  properties.map((property) => {
                    const vis = property.listingVisibility || 'public';
                    const visibilityNames: Record<string, string> = {
                      public: t('listingMode_public'),
                      unlisted: t('listingMode_unlisted'),
                      private: t('listingMode_private'),
                    };
                    return (
                    <tr key={property._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-12 bg-gray-200 rounded-lg overflow-hidden relative flex-shrink-0">
                            {property.photos?.[0] ? (
                              <Image
                                src={resolveImageUrl(property.photos[0], 'thumb')}
                                alt={property.title}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                🏠
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-800 max-w-[220px] truncate flex items-center gap-1">
                              {property.pinned && (
                                <span title="აპინულია" className="text-amber-500">
                                  📌
                                </span>
                              )}
                              {property.title}
                            </div>
                            <div className="text-sm text-gray-500">
                              {property.city}
                              {property.tbilisiDistrict ? `, ${property.tbilisiDistrict}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-800">{propertyTypeNames[property.type] || property.type}</div>
                        <div className="text-sm text-gray-500">
                          {dealTypeNames[property.dealType] || property.dealType}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-800">
                          {property.price?.toLocaleString()} {property.priceCurrency}
                        </div>
                        <div className="text-sm text-gray-500">{property.sqm} მ²</div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            statusColors[property.status] || 'bg-gray-100 text-gray-700'
                          }`}
                          title={
                            property.status === 'pending'
                              ? 'განცხადება ადმინის დამტკიცებას ელოდება — საიტზე სრულად არ ჩანს სანამ ✅ არ დააჭერთ'
                              : undefined
                          }
                        >
                          {statusNames[property.status] || property.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${
                            visibilityColors[vis] || 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {visibilityNames[vis] || vis}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          <Link
                            href={`/property/${property._id}`}
                            target="_blank"
                            className="text-blue-600 hover:text-blue-800 text-sm"
                            title="ნახვა"
                          >
                            👁️
                          </Link>
                          <Link
                            href={`/property/${property._id}/edit`}
                            className="text-amber-600 hover:text-amber-800 text-sm"
                            title="რედაქტირება"
                          >
                            ✏️
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleTogglePin(property._id, !property.pinned)}
                            className={`text-sm ${
                              property.pinned
                                ? 'text-amber-600 hover:text-amber-800'
                                : 'text-gray-400 hover:text-amber-600'
                            }`}
                            title={property.pinned ? 'აპინვის მოხსნა' : 'აპინვა'}
                          >
                            {property.pinned ? '📌' : '📍'}
                          </button>
                          {property.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(property._id, 'active')}
                                className="text-green-600 hover:text-green-800 text-sm"
                                title="დამტკიცება"
                              >
                                ✅
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(property._id, 'rejected')}
                                className="text-red-600 hover:text-red-800 text-sm"
                                title="უარყოფა"
                              >
                                ❌
                              </button>
                            </>
                          )}
                          {property.status === 'active' && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(property._id, 'sold')}
                              className="text-gray-600 hover:text-gray-800 text-sm"
                              title="გაყიდული"
                            >
                              🏷️
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setTransferTarget({ id: property._id, title: property.title })
                            }
                            className="text-indigo-600 hover:text-indigo-800 text-sm"
                            title="აგენტზე გადაცემა"
                          >
                            🔀
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(property._id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                            title="წაშლა"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {pages > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-2 bg-gray-50 px-4 py-4 sm:px-6">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || propsLoading}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ←
                </button>

                {Array.from({ length: pages }, (_, i) => i + 1).map((pageNum) => {
                  const showPage =
                    pageNum === 1 ||
                    pageNum === pages ||
                    Math.abs(pageNum - page) <= 2;

                  const showEllipsis =
                    (pageNum === 2 && page > 4) ||
                    (pageNum === pages - 1 && page < pages - 3);

                  if (showEllipsis) {
                    return (
                      <span key={`ellipsis-${pageNum}`} className="px-1 text-gray-400">
                        …
                      </span>
                    );
                  }

                  if (!showPage) return null;

                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setPage(pageNum)}
                      disabled={propsLoading}
                      className={`min-w-[2.5rem] rounded-lg border px-3 py-2 text-sm transition-colors disabled:opacity-50 ${
                        pageNum === page
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  disabled={page === pages || propsLoading}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  →
                </button>

                <span className="ml-2 w-full text-center text-sm text-gray-500 sm:ml-3 sm:w-auto">
                  გვერდი {page} / {pages}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <AdminTransferPropertyModal
        open={!!transferTarget}
        propertyId={transferTarget?.id || ''}
        propertyTitle={transferTarget?.title || ''}
        excludeAgentId={agentId}
        excludeUserId={userId || undefined}
        onClose={() => setTransferTarget(null)}
        onTransferred={() => {
          fetchProperties();
          fetchAgent();
        }}
      />
    </div>
  );
}
