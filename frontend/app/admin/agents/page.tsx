'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getApiBase } from '@/lib/config';
import { resolveImageUrl } from '@/lib/api';
import { AdminSidebar } from '@/components/AdminSidebar';
import {
  AdminAgentPortfolioStats,
  type AgentPortfolioStats,
} from '@/components/AdminAgentPortfolioStats';

interface Agent {
  _id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  photo?: string;
  verified: boolean;
  avgRating: number;
  totalReviews: number;
  propertyCount?: number;
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
  const [view, setView] = useState<'list' | 'analytics'>('list');
  const [agentStats, setAgentStats] = useState<(AgentPortfolioStats & { period?: number }) | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    fetchAgents();
  }, [page, verifiedFilter]);

  useEffect(() => {
    if (view !== 'analytics') return;

    const token = localStorage.getItem('token');
    if (!token) return;

    let alive = true;
    (async () => {
      try {
        setStatsLoading(true);
        const res = await fetch(`${getApiBase()}/api/admin/agents/stats?period=30d`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (alive) setAgentStats(data);
      } catch {
        /* ignore */
      } finally {
        if (alive) setStatsLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [view]);

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

      const res = await fetch(`${getApiBase()}/api/admin/agents?${params}`, {
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
      const res = await fetch(`${getApiBase()}/api/admin/agents/${agentId}/verify`, {
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
    // OK = მისი განცხადებებიც წაიშლება; Cancel = განცხადებები რჩება
    const deleteProperties = confirm('ასევე წავშალო ამ აგენტის ყველა განცხადება?\n\nOK — განცხადებებიც წაიშლება\nგაუქმება — განცხადებები დარჩება');

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${getApiBase()}/api/admin/agents/${agentId}?deleteProperties=${deleteProperties}`, {
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
      <AdminSidebar />

      {/* Main Content */}
      <div className="ml-64 p-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-800">
                {view === 'list' ? 'აგენტები' : 'აგენტების ანალიტიკა'}
              </h1>
              {view === 'list' ? (
                <button
                  type="button"
                  onClick={() => setView('analytics')}
                  className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700"
                >
                  📊 ანალიტიკა
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setView('list')}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  ← აგენტები
                </button>
              )}
            </div>
            {view === 'list' && <p className="text-gray-600 mt-1">სულ: {total} აგენტი</p>}
          </div>
        </div>

        {view === 'analytics' ? (
          statsLoading || !agentStats ? (
            <div className="rounded-xl bg-white py-16 text-center text-gray-500 shadow-sm">
              იტვირთება...
            </div>
          ) : (
            <AdminAgentPortfolioStats
              data={agentStats}
              periodDays={agentStats.period ?? 30}
            />
          )
        ) : (
          <>
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
                  <Link
                    href={`/agents/${agent._id}`}
                    target="_blank"
                    className="flex items-center gap-3 min-w-0 rounded-lg transition-colors hover:bg-gray-50"
                  >
                    {agent.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={resolveImageUrl(agent.photo)}
                        alt=""
                        className="h-12 w-12 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-xl shrink-0">
                        👤
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-800 truncate">{agent.name}</h3>
                      <p className="text-sm text-gray-500">{agent.company || 'დამოუკიდებელი'}</p>
                    </div>
                  </Link>
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
                    <span>⭐</span> რეიტინგი: {agent.avgRating?.toFixed(1) || '0.0'}
                  </div>
                  <div className="flex items-center gap-2">
                    <span>📝</span> შეფასებები: {agent.totalReviews || 0}
                  </div>
                  <div className="flex items-center gap-2">
                    <span>🏘️</span> განცხადებები: {agent.propertyCount ?? 0}
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
                  <Link
                    href={`/admin/agents/${agent._id}`}
                    className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm"
                    title="განცხადებები"
                  >
                    🏘️
                  </Link>
                  <Link
                    href={`/agents/${agent._id}`}
                    target="_blank"
                    className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm"
                    title="საჯარო პროფილი"
                  >
                    👁️
                  </Link>
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
          </>
        )}
      </div>
    </div>
  );
}
