'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Agent {
  _id: string;
  name: string;
  email: string;
  phone: string;
  agency: string;
  verified: boolean;
  rating: number;
  totalSales: number;
  createdAt: string;
}

export default function AdminAgents() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAgents();
  }, [page, verifiedFilter]);

  const fetchAgents = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
        ...(verifiedFilter && { verified: verifiedFilter })
      });

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/agents?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 403) {
        setError('წვდომა აკრძალულია');
        return;
      }

      const data = await res.json();
      setAgents(data.agents);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      setError('მონაცემების ჩატვირთვა ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAgents();
  };

  const handleVerify = async (agentId: string, verified: boolean) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/agents/${agentId}/verify`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ verified })
      });

      if (res.ok) {
        fetchAgents();
      }
    } catch (err) {
      alert('განახლება ვერ მოხერხდა');
    }
  };

  const handleDelete = async (agentId: string) => {
    if (!confirm('ნამდვილად გსურთ აგენტის წაშლა?')) return;

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/agents/${agentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        fetchAgents();
      }
    } catch (err) {
      alert('წაშლა ვერ მოხერხდა');
    }
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
          <div className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 bg-blue-600">
            <span>🏢</span> აგენტები
          </div>
          <Link href="/admin/properties" className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 hover:bg-gray-800 block">
            <span>🏘️</span> განცხადებები
          </Link>
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
            <h1 className="text-3xl font-bold text-gray-800">აგენტები</h1>
            <p className="text-gray-600">სულ: {total} აგენტი</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <input
              type="text"
              placeholder="ძიება სახელით, ემეილით ან სააგენტოთი..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <select
              value={verifiedFilter}
              onChange={(e) => { setVerifiedFilter(e.target.value); setPage(1); }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">ყველა სტატუსი</option>
              <option value="true">ვერიფიცირებული</option>
              <option value="false">არავერიფიცირებული</option>
            </select>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              ძიება
            </button>
          </form>
        </div>

        {/* Agents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-3 text-center py-12 text-gray-500">იტვირთება...</div>
          ) : agents.length === 0 ? (
            <div className="col-span-3 text-center py-12 text-gray-500">აგენტები ვერ მოიძებნა</div>
          ) : (
            agents.map((agent) => (
              <div key={agent._id} className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-xl">
                      👤
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{agent.name}</h3>
                      <p className="text-sm text-gray-500">{agent.agency || 'დამოუკიდებელი'}</p>
                    </div>
                  </div>
                  {agent.verified ? (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      ✓ ვერიფიცირებული
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                      მოლოდინში
                    </span>
                  )}
                </div>

                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-2">
                    <span>📧</span> {agent.email}
                  </div>
                  <div className="flex items-center gap-2">
                    <span>📞</span> {agent.phone || '-'}
                  </div>
                  <div className="flex items-center gap-2">
                    <span>⭐</span> რეიტინგი: {agent.rating?.toFixed(1) || '0.0'}
                  </div>
                  <div className="flex items-center gap-2">
                    <span>🏠</span> გაყიდვები: {agent.totalSales || 0}
                  </div>
                  <div className="flex items-center gap-2">
                    <span>📅</span> რეგისტრაცია: {new Date(agent.createdAt).toLocaleDateString('ka-GE')}
                  </div>
                </div>

                <div className="flex gap-2">
                  {agent.verified ? (
                    <button
                      onClick={() => handleVerify(agent._id, false)}
                      className="flex-1 px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 text-sm"
                    >
                      ვერიფიკაციის გაუქმება
                    </button>
                  ) : (
                    <button
                      onClick={() => handleVerify(agent._id, true)}
                      className="flex-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm"
                    >
                      ✓ ვერიფიკაცია
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(agent._id)}
                    className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="mt-6 flex justify-center gap-4">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-white border rounded-lg disabled:opacity-50"
            >
              ← წინა
            </button>
            <span className="px-4 py-2 text-gray-600">
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
  );
}
