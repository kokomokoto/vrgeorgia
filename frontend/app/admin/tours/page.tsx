'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { resolveImageUrl } from '@/lib/api';
import { API_BASE } from '@/lib/config';
import { AdminSidebar } from '@/components/AdminSidebar';
import { getTourEditUrl, resolveTourPublicUrl } from '@/lib/tourBuilder';

interface TourProperty {
  _id: string;
  title: string;
  city?: string;
  tbilisiDistrict?: string;
  type: string;
  status: string;
  photos: string[];
  tourLink: string;
  userId?: { name?: string; email?: string };
  createdAt: string;
}

export default function AdminToursPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<TourProperty[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');

  const fetchTours = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/admin/tours?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 403) {
        setError('წვდომა აკრძალულია. მხოლოდ ადმინისტრატორისთვის.');
        return;
      }
      if (!res.ok) {
        setError('მონაცემების ჩატვირთვა ვერ მოხერხდა');
        return;
      }
      const data = await res.json();
      setProperties(data.properties || []);
      setTotal(data.total || 0);
    } catch {
      setError('სერვერთან კავშირი ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchTours();
  }, [fetchTours]);

  const handleRemoveTour = async (id: string) => {
    if (!confirm('ნამდვილად გსურთ ამ ობიექტიდან 3D ტურის მოხსნა? (ობიექტი არ წაიშლება)')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/admin/tours/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setProperties((prev) => prev.filter((p) => p._id !== id));
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

      <div className="ml-64 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">3D ტურები</h1>
          <p className="text-gray-600">სულ: {total} ტური</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
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
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">იტვირთება...</td></tr>
              ) : properties.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">3D ტურები ვერ მოიძებნა</td></tr>
              ) : (
                properties.map((p) => (
                  <tr key={p._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-12 bg-gray-200 rounded-lg overflow-hidden relative flex-shrink-0">
                          {p.photos?.[0] ? (
                            <Image src={resolveImageUrl(p.photos[0])} alt={p.title} fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">🌐</div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-800 max-w-[220px] truncate">{p.title}</div>
                          <div className="text-sm text-gray-500">{p.city || ''}{p.tbilisiDistrict ? `, ${p.tbilisiDistrict}` : ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-800">{p.userId?.name || '-'}</div>
                      <div className="text-sm text-gray-500">{p.userId?.email || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <a href={publicTourUrl(p.tourLink)} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm break-all max-w-[200px] inline-block truncate align-middle">
                        {publicTourUrl(p.tourLink)}
                      </a>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={publicTourUrl(p.tourLink)}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
                          title="ნახვა"
                        >
                          👁️
                        </a>
                        <a
                          href={editUrlFor(p.tourLink)}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                          title="რედაქტირება"
                        >
                          ✏️ რედაქტირება
                        </a>
                        <Link
                          href={`/property/${p._id}/edit`}
                          className="px-3 py-2 bg-amber-100 text-amber-700 rounded-lg text-sm hover:bg-amber-200"
                          title="ობიექტის რედაქტირება"
                        >
                          🏠
                        </Link>
                        <button
                          onClick={() => handleRemoveTour(p._id)}
                          className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
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
