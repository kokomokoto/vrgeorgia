'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { resolveImageUrl } from '@/lib/api';
import { getApiBase } from '@/lib/config';
import { AdminSidebar } from '@/components/AdminSidebar';

interface TrashProperty {
  _id: string;
  title: string;
  type: string;
  dealType: string;
  price: number;
  priceCurrency: string;
  city: string;
  status: string;
  numericId?: number;
  photos: string[];
  deletedAt: string;
  createdAt: string;
  userId?: { name?: string; email?: string };
  deletedBy?: { name?: string; email?: string };
}

const TYPE_LABELS: Record<string, string> = {
  apartment: 'ბინა',
  house: 'სახლი',
  commercial: 'კომერციული',
  land: 'მიწა',
  cottage: 'კოტეჯი',
  hotel: 'სასტუმრო',
  building: 'შენობა',
  warehouse: 'საწყობი',
  parking: 'პარკინგი',
  business: 'ბიზნესი',
};

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString('ka-GE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

export default function AdminTrashPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<TrashProperty[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchTrash = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (query) params.set('q', query);

      const res = await fetch(`${getApiBase()}/api/admin/trash?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 403) {
        router.push('/');
        return;
      }
      if (!res.ok) throw new Error('fetch failed');

      const data = await res.json();
      setItems(data.properties || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch {
      setError('მონაცემების ჩატვირთვა ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  }, [page, query, router]);

  useEffect(() => {
    fetchTrash();
  }, [fetchTrash]);

  const handleRestore = async (id: string) => {
    if (!confirm('განცხადების აღდგენა?')) return;
    const token = localStorage.getItem('token');
    setBusyId(id);
    try {
      const res = await fetch(`${getApiBase()}/api/admin/trash/${id}/restore`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchTrash();
      else alert('აღდგენა ვერ მოხერხდა');
    } catch {
      alert('აღდგენა ვერ მოხერხდა');
    } finally {
      setBusyId(null);
    }
  };

  const handlePermanentDelete = async (id: string) => {
    if (!confirm('ნამდვილად გსურთ სამუდამო წაშლა? ეს ქმედება შეუქცევადია.')) return;
    const token = localStorage.getItem('token');
    setBusyId(id);
    try {
      const res = await fetch(`${getApiBase()}/api/admin/trash/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchTrash();
      else alert('წაშლა ვერ მოხერხდა');
    } catch {
      alert('წაშლა ვერ მოხერხდა');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <main className="ml-64 flex-1 p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">🗑️ ნაგვის ყუთი</h1>
          <p className="text-sm text-gray-500">
            წაშლილი განცხადებები — შეგიძლიათ აღადგინოთ ან სამუდამოდ წაშალოთ
          </p>
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <form
            className="flex flex-1 gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              setQuery(search.trim());
            }}
          >
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ძებნა სათაურით, ქალაქით, ID-ით..."
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              ძებნა
            </button>
          </form>
          <p className="text-sm text-gray-500">სულ: {total}</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-gray-400">ნაგვის ყუთი ცარიელია</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-gray-50 text-left text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">განცხადება</th>
                    <th className="px-4 py-3 font-semibold">მფლობელი</th>
                    <th className="px-4 py-3 font-semibold">წაშლის თარიღი</th>
                    <th className="px-4 py-3 font-semibold">ვინ წაშალა</th>
                    <th className="px-4 py-3 font-semibold text-right">მოქმედება</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item) => {
                    const thumb = item.photos?.[0];
                    const busy = busyId === item._id;
                    return (
                      <tr key={item._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-16 shrink-0 overflow-hidden rounded bg-gray-100">
                              {thumb ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={resolveImageUrl(thumb)}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-gray-300">
                                  🏠
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">{item.title}</p>
                              <p className="text-xs text-gray-500">
                                {TYPE_LABELS[item.type] || item.type}
                                {item.numericId ? ` · #${item.numericId}` : ''}
                                {item.city ? ` · ${item.city}` : ''}
                              </p>
                              <p className="text-xs text-gray-400">
                                {item.price?.toLocaleString()} {item.priceCurrency || 'USD'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-gray-800">{item.userId?.name || '—'}</p>
                          <p className="text-xs text-gray-500">{item.userId?.email || ''}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{formatDate(item.deletedAt)}</td>
                        <td className="px-4 py-3">
                          <p className="text-gray-800">{item.deletedBy?.name || '—'}</p>
                          <p className="text-xs text-gray-500">{item.deletedBy?.email || ''}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleRestore(item._id)}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              აღდგენა
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handlePermanentDelete(item._id)}
                              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                            >
                              სამუდამოდ
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {pages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50"
            >
              ←
            </button>
            <span className="text-sm text-gray-600">
              {page} / {pages}
            </span>
            <button
              type="button"
              disabled={page >= pages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50"
            >
              →
            </button>
          </div>
        )}

        <p className="mt-6 text-xs text-gray-400">
          განცხადების წაშლა ადმინ პანელიდან ან პროფილიდან ავტომატურად გადააქვს ნაგვის ყუთში.
          {' '}
          <Link href="/admin/properties" className="text-blue-600 hover:underline">
            განცხადებების სია
          </Link>
        </p>
      </main>
    </div>
  );
}
