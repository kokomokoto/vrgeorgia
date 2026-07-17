'use client';

import { useCallback, useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { resolveImageUrl, type PropertyQuery } from '@/lib/api';
import { getApiBase } from '@/lib/config';
import { AdminSidebar } from '@/components/AdminSidebar';
import { AdminTransferPropertyModal } from '@/components/AdminTransferPropertyModal';
import { Filters, type FiltersState } from '@/components/Filters';
import { DEFAULT_MAP_FILTERS, filtersToPropertyQuery } from '@/lib/mapQuery';
import { trackSearchFilters } from '@/lib/searchAnalytics';
import type { Property } from '@/lib/types';

interface AdminProperty {
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
  pinned?: boolean;
  photos: string[];
  userId?: {
    name: string;
    email: string;
  };
  houseSqm?: number;
  createdAt: string;
}

function formatPropertySqm(property: AdminProperty): string {
  const sqm = property.sqm || property.houseSqm || 0;
  return sqm > 0 ? `${sqm} მ²` : '—';
}

function buildPropertiesQueryString(
  filters: FiltersState,
  sortBy: string,
  page: number,
  statusFilter: string
): string {
  const query: PropertyQuery = {
    ...filtersToPropertyQuery(filters, sortBy),
    limit: 20,
    page,
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
  return params.toString();
}

export default function AdminPropertiesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      }
    >
      <AdminProperties />
    </Suspense>
  );
}

function AdminProperties() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, i18n } = useTranslation();

  const [initLoading, setInitLoading] = useState(true);
  const [listLoading, setListLoading] = useState(true);
  const [properties, setProperties] = useState<AdminProperty[]>([]);
  const [rangeProperties, setRangeProperties] = useState<Property[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [filters, setFilters] = useState<FiltersState>(DEFAULT_MAP_FILTERS);
  const [sortBy, setSortBy] = useState('date_desc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [transferTarget, setTransferTarget] = useState<{
    id: string;
    title: string;
    userId?: string;
  } | null>(null);

  const clearAllFilters = useCallback(() => {
    setFilters({ ...DEFAULT_MAP_FILTERS });
  }, []);

  const fetchProperties = useCallback(async (token: string, qs: string) => {
    const res = await fetch(`${getApiBase()}/api/admin/properties?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 403) {
      setError('წვდომა აკრძალულია');
      return null;
    }
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      setError(`მონაცემების ჩატვირთვა ვერ მოხერხდა (${res.status}: ${errData.message || 'Unknown'})`);
      return null;
    }
    return res.json() as Promise<{
      properties: AdminProperty[];
      total: number;
      page: number;
      pages: number;
    }>;
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    let alive = true;
    (async () => {
      try {
        const data = await fetchProperties(token, 'limit=200&page=1');
        if (!alive || !data) return;
        setRangeProperties(data.properties as unknown as Property[]);
      } catch {
        if (alive) setError('სერვერთან კავშირი ვერ მოხერხდა');
      } finally {
        if (alive) setInitLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [router, fetchProperties]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, filters, sortBy]);

  useEffect(() => {
    if (initLoading) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    let alive = true;
    const timer = window.setTimeout(async () => {
      setListLoading(true);
      setError('');

      try {
        const qs = buildPropertiesQueryString(filters, sortBy, page, statusFilter);
        const data = await fetchProperties(token, qs);
        if (!alive || !data) return;
        setProperties(data.properties || []);
        setTotal(data.total || 0);
        setPages(data.pages || 1);
        setSelectedIds([]);
        trackSearchFilters('admin_properties', filters, {
          sort: sortBy,
          resultCount: data.properties?.length ?? 0,
        });
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
  }, [filters, sortBy, page, statusFilter, i18n.language, initLoading, fetchProperties]);

  const refreshList = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const qs = buildPropertiesQueryString(filters, sortBy, page, statusFilter);
    const data = await fetchProperties(token, qs);
    if (data) {
      setProperties(data.properties || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
      setSelectedIds([]);
    }
  }, [filters, sortBy, page, statusFilter, fetchProperties]);

  const handleStatusChange = async (propertyId: string, status: string) => {
    const reason = status === 'rejected' ? (prompt('მიუთითეთ უარყოფის მიზეზი') || '').trim() : '';
    if (status === 'rejected' && !reason) {
      alert('უარყოფის მიზეზი აუცილებელია');
      return;
    }
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${getApiBase()}/api/admin/properties/${propertyId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, reason }),
      });
      if (res.ok) refreshList();
    } catch {
      alert('განახლება ვერ მოხერხდა');
    }
  };

  const handleBulkStatusChange = async (status: string) => {
    if (selectedIds.length === 0) return;
    const reason = status === 'rejected' ? (prompt('მიუთითეთ უარყოფის მიზეზი') || '').trim() : '';
    if (status === 'rejected' && !reason) {
      alert('უარყოფის მიზეზი აუცილებელია');
      return;
    }
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${getApiBase()}/api/admin/properties/bulk-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids: selectedIds, status, reason }),
      });
      if (res.ok) refreshList();
      else alert('მასიური განახლება ვერ მოხერხდა');
    } catch {
      alert('მასიური განახლება ვერ მოხერხდა');
    }
  };

  const handleTogglePin = async (propertyId: string, pinned: boolean) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${getApiBase()}/api/admin/properties/${propertyId}/pin`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pinned }),
      });
      if (res.ok) {
        setProperties((prev) => prev.map((p) => (p._id === propertyId ? { ...p, pinned } : p)));
      } else {
        alert('ოპერაცია ვერ შესრულდა');
      }
    } catch {
      alert('ოპერაცია ვერ შესრულდა');
    }
  };

  const handleDelete = async (propertyId: string) => {
    if (!confirm('განცხადება გადავა ნაგვის ყუთში. გავაგრძელოთ?')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${getApiBase()}/api/admin/properties/${propertyId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) refreshList();
    } catch {
      alert('წაშლა ვერ მოხერხდა');
    }
  };

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

  if (error && initLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="rounded-lg bg-white p-8 text-center shadow-lg">
          <p className="mb-4 text-gray-600">{error}</p>
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

      <div className="ml-64 min-w-0 p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">განცხადებები</h1>
            <p className="text-gray-600">
              {listLoading ? t('loading', 'იტვირთება...') : `ნაპოვნია ${total} განცხადება`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
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

        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm text-gray-500">
            {t('adminPropertiesSearchHint', 'ძიება და ფილტრები ყველა განცხადებაში')}
          </p>
          <Filters
            value={filters}
            onChange={setFilters}
            onClearAll={clearAllFilters}
            rangeProperties={rangeProperties}
            showCategories
          />
        </div>

        {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">{error}</div>}

        {selectedIds.length > 0 && (
          <div className="mb-6 flex items-center justify-between rounded-xl bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-700">არჩეულია {selectedIds.length} განცხადება</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBulkStatusChange('active')}
                className="rounded-lg bg-green-100 px-3 py-2 text-sm text-green-700"
              >
                მასიურად დამტკიცება
              </button>
              <button
                onClick={() => handleBulkStatusChange('rejected')}
                className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700"
              >
                მასიურად უარყოფა
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700"
              >
                გასუფთავება
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full min-w-[1080px] table-fixed">
            <colgroup>
              <col className="w-12" />
              <col className="w-72" />
              <col className="w-28" />
              <col className="w-32" />
              <col className="w-56" />
              <col className="w-28" />
              <col className="w-44" />
            </colgroup>
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-4">
                  <input
                    type="checkbox"
                    checked={properties.length > 0 && selectedIds.length === properties.length}
                    onChange={(e) =>
                      setSelectedIds(e.target.checked ? properties.map((p) => p._id) : [])
                    }
                  />
                </th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-600">განცხადება</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-600">ტიპი</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-600">ფასი</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-600">მფლობელი</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-600">სტატუსი</th>
                <th className="sticky right-0 z-10 bg-gray-50 px-4 py-4 text-right text-sm font-semibold text-gray-600 shadow-[-8px_0_12px_-8px_rgba(0,0,0,0.12)]">
                  მოქმედებები
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {initLoading || listLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    იტვირთება...
                  </td>
                </tr>
              ) : properties.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    განცხადებები ვერ მოიძებნა
                  </td>
                </tr>
              ) : (
                properties.map((property) => (
                  <tr key={property._id} className="group hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(property._id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedIds((prev) => [...prev, property._id]);
                          else setSelectedIds((prev) => prev.filter((id) => id !== property._id));
                        }}
                      />
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="relative h-12 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-200">
                          {property.photos?.[0] ? (
                            <Image
                              src={resolveImageUrl(property.photos[0], 'thumb')}
                              alt={property.title}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-gray-400">
                              🏠
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-start gap-1 font-medium text-gray-800 line-clamp-2">
                            {property.pinned && (
                              <span title="აპინულია" className="shrink-0 text-amber-500">
                                📌
                              </span>
                            )}
                            <span className="min-w-0 break-words">{property.title}</span>
                          </div>
                          <div className="mt-1 truncate text-sm text-gray-500">
                            {property.city}
                            {property.tbilisiDistrict ? `, ${property.tbilisiDistrict}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="text-gray-800">{propertyTypeNames[property.type] || property.type}</div>
                      <div className="text-sm text-gray-500">
                        {dealTypeNames[property.dealType] || property.dealType}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 align-top">
                      <div className="font-medium text-gray-800">
                        {property.price?.toLocaleString()} {property.priceCurrency}
                      </div>
                      <div className="text-sm text-gray-500">{formatPropertySqm(property)}</div>
                    </td>
                    <td className="min-w-0 px-4 py-4 align-top">
                      <div className="truncate text-gray-800">{property.userId?.name || '—'}</div>
                      <div className="truncate text-sm text-gray-500">{property.userId?.email || '—'}</div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium ${statusColors[property.status] || 'bg-gray-100 text-gray-700'}`}
                      >
                        {statusNames[property.status] || property.status}
                      </span>
                    </td>
                    <td className="sticky right-0 z-10 bg-white px-4 py-4 text-right align-top shadow-[-8px_0_12px_-8px_rgba(0,0,0,0.12)] group-hover:bg-gray-50">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <Link
                          href={`/property/${property._id}`}
                          className="text-sm text-blue-600 hover:text-blue-800"
                          target="_blank"
                        >
                          👁️
                        </Link>
                        <Link
                          href={`/property/${property._id}/edit`}
                          className="text-sm text-amber-600 hover:text-amber-800"
                          title="რედაქტირება"
                        >
                          ✏️
                        </Link>
                        <button
                          onClick={() => handleTogglePin(property._id, !property.pinned)}
                          className={`text-sm ${property.pinned ? 'text-amber-600 hover:text-amber-800' : 'text-gray-400 hover:text-amber-600'}`}
                          title={property.pinned ? 'აპინვის მოხსნა' : 'მთავარზე აპინვა'}
                        >
                          {property.pinned ? '📌' : '📍'}
                        </button>
                        {property.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(property._id, 'active')}
                              className="text-sm text-green-600 hover:text-green-800"
                              title="დამტკიცება"
                            >
                              ✅
                            </button>
                            <button
                              onClick={() => handleStatusChange(property._id, 'rejected')}
                              className="text-sm text-red-600 hover:text-red-800"
                              title="უარყოფა"
                            >
                              ❌
                            </button>
                          </>
                        )}
                        {property.status === 'active' && (
                          <button
                            onClick={() => handleStatusChange(property._id, 'sold')}
                            className="text-sm text-gray-600 hover:text-gray-800"
                            title="გაყიდულად მონიშვნა"
                          >
                            🏷️
                          </button>
                        )}
                        <button
                          onClick={() =>
                            setTransferTarget({
                              id: property._id,
                              title: property.title,
                              userId:
                                (property.userId as { _id?: string } | undefined)?._id ||
                                (typeof property.userId === 'string' ? property.userId : undefined),
                            })
                          }
                          className="text-sm text-indigo-600 hover:text-indigo-800"
                          title="აგენტზე გადაცემა"
                        >
                          🔀
                        </button>
                        <button
                          onClick={() => handleDelete(property._id)}
                          className="text-sm text-red-600 hover:text-red-800"
                          title="წაშლა"
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

          {pages > 1 && (
            <div className="flex items-center justify-between bg-gray-50 px-6 py-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border bg-white px-4 py-2 disabled:opacity-50"
              >
                ← წინა
              </button>
              <span className="text-gray-600">
                გვერდი {page} / {pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="rounded-lg border bg-white px-4 py-2 disabled:opacity-50"
              >
                შემდეგი →
              </button>
            </div>
          )}
        </div>
      </div>

      <AdminTransferPropertyModal
        open={!!transferTarget}
        propertyId={transferTarget?.id || ''}
        propertyTitle={transferTarget?.title || ''}
        excludeUserId={transferTarget?.userId}
        onClose={() => setTransferTarget(null)}
        onTransferred={refreshList}
      />
    </div>
  );
}
