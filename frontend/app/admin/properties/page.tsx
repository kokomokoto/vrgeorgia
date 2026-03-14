'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { resolveImageUrl } from '@/lib/api';

interface Property {
  _id: string;
  title: string;
  propertyType: string;
  dealType: string;
  price: number;
  currency: string;
  city: string;
  district: string;
  area: number;
  status: string;
  images: string[];
  owner?: {
    name: string;
    email: string;
  };
  createdAt: string;
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
        ...(typeFilter && { propertyType: typeFilter })
      });

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/properties?${params}`, {
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
    } catch (err) {
      console.error('Admin properties fetch error:', err);
      setError('სერვერთან კავშირი ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (propertyId: string, status: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/properties/${propertyId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (res.ok) {
        fetchProperties();
      }
    } catch (err) {
      alert('განახლება ვერ მოხერხდა');
    }
  };

  const handleDelete = async (propertyId: string) => {
    if (!confirm('ნამდვილად გსურთ განცხადების წაშლა?')) return;

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/properties/${propertyId}`, {
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
    land: 'მიწა'
  };

  const dealTypeNames: Record<string, string> = {
    sale: 'იყიდება',
    rent: 'ქირავდება',
    daily: 'დღიურად'
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
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-gray-900 text-white p-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">🏠 VR Georgia</h1>
          <p className="text-gray-400 text-sm">ადმინისტრატორის პანელი</p>
        </div>

        <nav className="space-y-2">
          <Link href="/admin" className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 hover:bg-gray-800 block">
            <span>📊</span> მიმოხილვა
          </Link>
          <Link href="/admin/users" className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 hover:bg-gray-800 block">
            <span>👥</span> მომხმარებლები
          </Link>
          <Link href="/admin/agents" className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 hover:bg-gray-800 block">
            <span>🏢</span> აგენტები
          </Link>
          <div className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 bg-blue-600">
            <span>🏘️</span> განცხადებები
          </div>
          <Link href="/admin/messages" className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 hover:bg-gray-800 block">
            <span>💬</span> შეტყობინებები
          </Link>
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <Link href="/" className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 hover:bg-gray-800 block text-gray-400">
            <span>🏠</span> საიტზე დაბრუნება
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
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
            </select>
          </div>
        </div>

        {/* Properties Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">განცხადება</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">ტიპი</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">ფასი</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">მფლობელი</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">სტატუსი</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">მოქმედებები</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
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
                properties.map((property) => (
                  <tr key={property._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-12 bg-gray-200 rounded-lg overflow-hidden relative flex-shrink-0">
                          {property.images?.[0] ? (
                            <Image
                              src={resolveImageUrl(property.images[0])}
                              alt={property.title}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">🏠</div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-800 max-w-[200px] truncate">{property.title}</div>
                          <div className="text-sm text-gray-500">{property.city}, {property.district}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-800">{propertyTypeNames[property.propertyType]}</div>
                      <div className="text-sm text-gray-500">{dealTypeNames[property.dealType]}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-800">
                        {property.price?.toLocaleString()} {property.currency}
                      </div>
                      <div className="text-sm text-gray-500">{property.area} მ²</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-800">{property.owner?.name || '-'}</div>
                      <div className="text-sm text-gray-500">{property.owner?.email || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[property.status] || 'bg-gray-100 text-gray-700'}`}>
                        {statusNames[property.status] || property.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/property/${property._id}`}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                          target="_blank"
                        >
                          👁️
                        </Link>
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
