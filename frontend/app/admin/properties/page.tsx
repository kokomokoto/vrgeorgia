'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { resolveImageUrl } from '@/lib/api';
import { getApiBase } from '@/lib/config';
import { AdminSidebar } from '@/components/AdminSidebar';

interface Property {
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

function formatPropertySqm(property: Property): string {
  const sqm = property.sqm || property.houseSqm || 0;
  return sqm > 0 ? `${sqm} მ²` : '—';
}

export default function AdminPropertiesPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
      <AdminProperties />
    </Suspense>
  );
}

function AdminProperties() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProperties();
  }, [page, statusFilter, typeFilter]);

  const fetchProperties = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(statusFilter && { status: statusFilter }),
        ...(typeFilter && { type: typeFilter })
      });

      const res = await fetch(`${getApiBase()}/api/admin/properties?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 403) {
        setError('წვდომა აკრძალულია');
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error('Admin properties error:', res.status, errData);
        setError(`მონაცემების ჩატვირთვა ვერ მოხერხდა (${res.status}: ${errData.message || 'Unknown'})`);
        return;
      }

      const data = await res.json();
      setProperties(data.properties || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
      setSelectedIds([]);
    } catch (err) {
      console.error('Admin properties fetch error:', err);
      setError('სერვერთან კავშირი ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  };

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
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status, reason })
      });

      if (res.ok) {
        fetchProperties();
      }
    } catch (err) {
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
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ ids: selectedIds, status, reason })
      });
      if (res.ok) {
        fetchProperties();
      } else {
        alert('მასიური განახლება ვერ მოხერხდა');
      }
    } catch (_err) {
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
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ pinned })
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
    if (!confirm('ნამდვილად გსურთ განცხადების წაშლა?')) return;

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${getApiBase()}/api/admin/properties/${propertyId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        fetchProperties();
      }
    } catch (err) {
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
    business: 'ბიზნესი'
  };

  const dealTypeNames: Record<string, string> = {
    sale: 'იყიდება',
    rent: 'ქირავდება',
    mortgage: 'გირავდება'
  };

  const statusNames: Record<string, string> = {
    pending: 'მოლოდინში',
    active: 'აქტიური',
    rejected: 'უარყოფილი',
    sold: 'გაყიდული'
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    active: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    sold: 'bg-gray-100 text-gray-700'
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <div className="text-6xl mb-4">🔒</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link href="/" className="text-blue-600 hover:underline">მთავარ გვერდზე დაბრუნება</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminSidebar />

      {/* Main Content */}
      <div className="ml-64 min-w-0 p-4 sm:p-6 lg:p-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">განცხადებები</h1>
            <p className="text-gray-600">სულ: {total} განცხადება</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex gap-4">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">ყველა სტატუსი</option>
              <option value="pending">მოლოდინში</option>
              <option value="active">აქტიური</option>
              <option value="rejected">უარყოფილი</option>
              <option value="sold">გაყიდული</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">ყველა ტიპი</option>
              <option value="apartment">ბინა</option>
              <option value="house">სახლი</option>
              <option value="commercial">კომერციული</option>
              <option value="land">მიწა</option>
              <option value="cottage">აგარაკი</option>
              <option value="hotel">სასტუმრო</option>
              <option value="building">შენობა</option>
              <option value="warehouse">საწყობი</option>
              <option value="parking">ავტოფარეხი</option>
              <option value="business">ბიზნესი</option>
            </select>
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex items-center justify-between">
            <p className="text-sm text-gray-700">არჩეულია {selectedIds.length} განცხადება</p>
            <div className="flex items-center gap-2">
              <button onClick={() => handleBulkStatusChange('active')} className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm">მასიურად დამტკიცება</button>
              <button onClick={() => handleBulkStatusChange('rejected')} className="px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm">მასიურად უარყოფა</button>
              <button onClick={() => setSelectedIds([])} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">გასუფთავება</button>
            </div>
          </div>
        )}

        {/* Properties Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
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
                    onChange={(e) => setSelectedIds(e.target.checked ? properties.map((p) => p._id) : [])}
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
              {loading ? (
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
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-16 h-12 bg-gray-200 rounded-lg overflow-hidden relative flex-shrink-0">
                          {property.photos?.[0] ? (
                            <Image
                              src={resolveImageUrl(property.photos[0])}
                              alt={property.title}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">🏠</div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-gray-800 line-clamp-2 flex items-start gap-1">
                            {property.pinned && <span title="აპინულია" className="shrink-0 text-amber-500">📌</span>}
                            <span className="min-w-0 break-words">{property.title}</span>
                          </div>
                          <div className="mt-1 text-sm text-gray-500 truncate">
                            {property.city}
                            {property.tbilisiDistrict ? `, ${property.tbilisiDistrict}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="text-gray-800">{propertyTypeNames[property.type] || property.type}</div>
                      <div className="text-sm text-gray-500">{dealTypeNames[property.dealType] || property.dealType}</div>
                    </td>
                    <td className="px-4 py-4 align-top whitespace-nowrap">
                      <div className="font-medium text-gray-800">
                        {property.price?.toLocaleString()} {property.priceCurrency}
                      </div>
                      <div className="text-sm text-gray-500">{formatPropertySqm(property)}</div>
                    </td>
                    <td className="px-4 py-4 align-top min-w-0">
                      <div className="text-gray-800 truncate">{property.userId?.name || '—'}</div>
                      <div className="text-sm text-gray-500 truncate">{property.userId?.email || '—'}</div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${statusColors[property.status] || 'bg-gray-100 text-gray-700'}`}>
                        {statusNames[property.status] || property.status}
                      </span>
                    </td>
                    <td className="sticky right-0 z-10 bg-white px-4 py-4 text-right align-top shadow-[-8px_0_12px_-8px_rgba(0,0,0,0.12)] group-hover:bg-gray-50">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <Link
                          href={`/property/${property._id}`}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                          target="_blank"
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
                              className="text-green-600 hover:text-green-800 text-sm"
                              title="დამტკიცება"
                            >
                              ✅
                            </button>
                            <button
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
                            onClick={() => handleStatusChange(property._id, 'sold')}
                            className="text-gray-600 hover:text-gray-800 text-sm"
                            title="გაყიდულად მონიშვნა"
                          >
                            🏷️
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(property._id)}
                          className="text-red-600 hover:text-red-800 text-sm"
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

          {/* Pagination */}
          {pages > 1 && (
            <div className="px-6 py-4 bg-gray-50 flex justify-between items-center">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-white border rounded-lg disabled:opacity-50"
              >
                ← წინა
              </button>
              <span className="text-gray-600">
                გვერდი {page} / {pages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="px-4 py-2 bg-white border rounded-lg disabled:opacity-50"
              >
                შემდეგი →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
