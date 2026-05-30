'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { resolveImageUrl } from '@/lib/api';
import { getApiBase } from '@/lib/config';
import { AdminSidebar } from '@/components/AdminSidebar';

interface AgentDetail {
  _id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
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

export default function AdminAgentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const agentId = params.id;

  const [loading, setLoading] = useState(true);
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [propertyCount, setPropertyCount] = useState(0);
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [propsLoading, setPropsLoading] = useState(false);
  const [error, setError] = useState('');

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
    setPropertyCount(data.propertyCount ?? 0);
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
      const qs = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        userId,
        ...(statusFilter && { status: statusFilter }),
      });
      const res = await fetch(`${getApiBase()}/api/admin/properties?${qs}`, { headers });
      if (!res.ok) return;
      const data = await res.json();
      setProperties(data.properties || []);
      setPages(data.pages || 1);
      if (typeof data.total === 'number') setPropertyCount(data.total);
    } finally {
      setPropsLoading(false);
    }
  }, [userId, page, statusFilter, authHeaders]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchAgent();
      setLoading(false);
    })();
  }, [fetchAgent]);

  useEffect(() => {
    if (!loading && userId) fetchProperties();
  }, [loading, userId, fetchProperties]);

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
    if (!confirm('ნამდვილად გსურთ განცხადების წაშლა?')) return;
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
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-2xl">
                👤
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">{agent.name}</h1>
                <p className="text-gray-500">{agent.company || 'დამოუკიდებელი'}</p>
                <p className="text-sm text-gray-500 mt-1">
                  📧 {agent.email} · 📞 {agent.phone || '—'}
                </p>
              </div>
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
                🏘️ {propertyCount} განცხადება
              </span>
              <Link
                href={`/agent/${agent._id}`}
                target="_blank"
                className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200"
              >
                საჯარო პროფილი ↗
              </Link>
            </div>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-gray-800">განცხადებები</h2>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">ყველა სტატუსი</option>
            <option value="pending">მოლოდინში</option>
            <option value="active">აქტიური</option>
            <option value="rejected">უარყოფილი</option>
            <option value="sold">გაყიდული</option>
          </select>
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
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">მოქმედებები</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {propsLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      იტვირთება...
                    </td>
                  </tr>
                ) : properties.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      განცხადებები ვერ მოიძებნა
                    </td>
                  </tr>
                ) : (
                  properties.map((property) => (
                    <tr key={property._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-12 bg-gray-200 rounded-lg overflow-hidden relative flex-shrink-0">
                            {property.photos?.[0] ? (
                              <Image
                                src={resolveImageUrl(property.photos[0])}
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

            {pages > 1 && (
              <div className="px-6 py-4 bg-gray-50 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-white border rounded-lg disabled:opacity-50"
                >
                  ← წინა
                </button>
                <span className="text-gray-600">
                  გვერდი {page} / {pages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  disabled={page === pages}
                  className="px-4 py-2 bg-white border rounded-lg disabled:opacity-50"
                >
                  შემდეგი →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
