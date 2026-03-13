'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface AnalyticsData {
  period: number;
  totalViews: number;
  uniqueVisitors: number;
  deviceStats: { _id: string; count: number }[];
  browserStats: { _id: string; count: number }[];
  osStats: { _id: string; count: number }[];
  topPages: { _id: string; count: number }[];
  topProperties: { views: number; uniqueViews: number; property?: { title: string; city: string; price: number; photos?: string[]; mainPhoto?: number } }[];
  topAgents: { views: number; agent?: { name: string; verified: boolean; photo: string } }[];
  dailyViews: { _id: string; views: number; uniqueVisitors: number }[];
  hourlyToday: { _id: number; count: number }[];
  referrerStats: { _id: string; count: number }[];
}

const DEVICE_ICONS: Record<string, string> = { desktop: '🖥️', mobile: '📱', tablet: '📋', unknown: '❓' };
const DEVICE_NAMES: Record<string, string> = { desktop: 'კომპიუტერი', mobile: 'ტელეფონი', tablet: 'ტაბლეტი', unknown: 'უცნობი' };

export default function AdminAnalytics() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState('7d');
  const [error, setError] = useState('');

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/admin/analytics?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 403) { setError('წვდომა აკრძალულია'); return; }
      if (!res.ok) throw new Error('Failed');
      setData(await res.json());
    } catch {
      setError('მონაცემების ჩატვირთვა ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <div className="text-6xl mb-4">🔒</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link href="/admin" className="text-blue-600 hover:underline">ადმინ პანელი</Link>
        </div>
      </div>
    );
  }

  function ProgressBar({ value, max, color = 'blue' }: { value: number; max: number; color?: string }) {
    const pct = max > 0 ? (value / max) * 100 : 0;
    return (
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className={`bg-${color}-500 h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-gray-900 text-white p-4 z-10">
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
          <Link href="/admin/properties" className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 hover:bg-gray-800 block">
            <span>🏘️</span> განცხადებები
          </Link>
          <Link href="/admin/messages" className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 hover:bg-gray-800 block">
            <span>💬</span> შეტყობინებები
          </Link>
          <Link href="/admin/analytics" className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 bg-blue-600 block">
            <span>📈</span> ანალიტიკა
          </Link>
        </nav>
        <div className="absolute bottom-4 left-4 right-4">
          <Link href="/" className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 hover:bg-gray-800 block text-gray-400">
            <span>🏠</span> საიტზე დაბრუნება
          </Link>
        </div>
      </div>

      {/* Main */}
      <div className="ml-64 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">📈 ანალიტიკა</h1>
            <p className="text-gray-600">საიტის ვიზიტორების მონიტორინგი</p>
          </div>
          <div className="flex gap-2">
            {['7d', '30d', '90d'].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  period === p ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {p === '7d' ? '7 დღე' : p === '30d' ? '30 დღე' : '90 დღე'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : data ? (
          <>
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">მთლიანი ნახვები</p>
                    <p className="text-3xl font-bold text-gray-800">{data.totalViews.toLocaleString()}</p>
                  </div>
                  <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-2xl">👁️</div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">უნიკალური ვიზიტორები</p>
                    <p className="text-3xl font-bold text-gray-800">{data.uniqueVisitors.toLocaleString()}</p>
                  </div>
                  <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center text-2xl">👤</div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">საშუალო ნახვა/ვიზიტორი</p>
                    <p className="text-3xl font-bold text-gray-800">
                      {data.uniqueVisitors > 0 ? (data.totalViews / data.uniqueVisitors).toFixed(1) : '0'}
                    </p>
                  </div>
                  <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center text-2xl">📊</div>
                </div>
              </div>
            </div>

            {/* Daily Views Chart */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">ყოველდღიური ვიზიტები</h3>
              {data.dailyViews.length === 0 ? (
                <p className="text-gray-400 text-center py-8">მონაცემები არ არის</p>
              ) : (
                <div className="flex items-end gap-1 h-48">
                  {data.dailyViews.map(day => {
                    const maxViews = Math.max(...data.dailyViews.map(d => d.views), 1);
                    return (
                      <div key={day._id} className="flex-1 flex flex-col items-center gap-1" title={`${day._id}: ${day.views} ნახვა, ${day.uniqueVisitors} უნიკალური`}>
                        <span className="text-xs text-gray-500">{day.views}</span>
                        <div className="w-full flex flex-col gap-1">
                          <div className="w-full bg-blue-500 rounded-t transition-all" style={{ height: `${(day.views / maxViews) * 140}px` }} />
                          <div className="w-full bg-green-400 rounded-t transition-all" style={{ height: `${(day.uniqueVisitors / maxViews) * 140}px` }} />
                        </div>
                        <span className="text-xs text-gray-500">{day._id.slice(5)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded" /><span className="text-sm text-gray-600">ნახვები</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-400 rounded" /><span className="text-sm text-gray-600">უნიკალური</span></div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Device Stats */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">მოწყობილობები</h3>
                <div className="space-y-4">
                  {data.deviceStats.map(item => (
                    <div key={item._id} className="flex items-center gap-3">
                      <span className="text-2xl">{DEVICE_ICONS[item._id] || '❓'}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{DEVICE_NAMES[item._id] || item._id}</span>
                          <span className="text-gray-500">{item.count} ({data.totalViews > 0 ? ((item.count / data.totalViews) * 100).toFixed(1) : 0}%)</span>
                        </div>
                        <ProgressBar value={item.count} max={data.totalViews} />
                      </div>
                    </div>
                  ))}
                  {data.deviceStats.length === 0 && <p className="text-gray-400">მონაცემები არ არის</p>}
                </div>
              </div>

              {/* Browser Stats */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">ბრაუზერები</h3>
                <div className="space-y-3">
                  {data.browserStats.map(item => (
                    <div key={item._id} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item._id || 'უცნობი'}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-24">
                          <ProgressBar value={item.count} max={data.totalViews} />
                        </div>
                        <span className="text-sm text-gray-500 w-12 text-right">{item.count}</span>
                      </div>
                    </div>
                  ))}
                  {data.browserStats.length === 0 && <p className="text-gray-400">მონაცემები არ არის</p>}
                </div>
              </div>

              {/* OS Stats */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">ოპერაციული სისტემები</h3>
                <div className="space-y-3">
                  {data.osStats.map(item => (
                    <div key={item._id} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item._id || 'უცნობი'}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-24">
                          <ProgressBar value={item.count} max={data.totalViews} />
                        </div>
                        <span className="text-sm text-gray-500 w-12 text-right">{item.count}</span>
                      </div>
                    </div>
                  ))}
                  {data.osStats.length === 0 && <p className="text-gray-400">მონაცემები არ არის</p>}
                </div>
              </div>

              {/* Referrers */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">საიდან მოვიდნენ</h3>
                <div className="space-y-3">
                  {data.referrerStats.map(item => (
                    <div key={item._id} className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate max-w-[200px]">{item._id}</span>
                      <span className="text-sm text-gray-500">{item.count}</span>
                    </div>
                  ))}
                  {data.referrerStats.length === 0 && <p className="text-gray-400">მონაცემები არ არის</p>}
                </div>
              </div>
            </div>

            {/* Top Properties */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">🏠 ყველაზე ნახვადი ობიექტები</h3>
              {data.topProperties.length === 0 ? (
                <p className="text-gray-400 text-center py-4">მონაცემები არ არის</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 text-gray-500">#</th>
                        <th className="text-left py-2 text-gray-500">ობიექტი</th>
                        <th className="text-left py-2 text-gray-500">ქალაქი</th>
                        <th className="text-right py-2 text-gray-500">ფასი</th>
                        <th className="text-right py-2 text-gray-500">ნახვები</th>
                        <th className="text-right py-2 text-gray-500">უნიკალური</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topProperties.map((item, i) => (
                        <tr key={i} className="border-b hover:bg-gray-50">
                          <td className="py-2 font-medium">{i + 1}</td>
                          <td className="py-2 font-medium truncate max-w-[250px]">{item.property?.title || '(წაშლილი)'}</td>
                          <td className="py-2 text-gray-600">{item.property?.city || '-'}</td>
                          <td className="py-2 text-right font-medium">${item.property?.price?.toLocaleString() || '-'}</td>
                          <td className="py-2 text-right text-blue-600 font-medium">{item.views}</td>
                          <td className="py-2 text-right text-green-600">{item.uniqueViews}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Top Agents */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">👤 ყველაზე ნახვადი აგენტები</h3>
              {data.topAgents.length === 0 ? (
                <p className="text-gray-400 text-center py-4">მონაცემები არ არის</p>
              ) : (
                <div className="space-y-3">
                  {data.topAgents.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-gray-400 w-6">{i + 1}</span>
                        <span className="font-medium">{item.agent?.name || '(წაშლილი)'}</span>
                        {item.agent?.verified && (
                          <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <span className="font-medium text-blue-600">{item.views} ნახვა</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Pages */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">📄 პოპულარული გვერდები</h3>
              <div className="space-y-2">
                {data.topPages.slice(0, 15).map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <span className="text-sm text-gray-700 truncate max-w-[400px]">{item._id}</span>
                    <span className="text-sm font-medium text-gray-500">{item.count}</span>
                  </div>
                ))}
                {data.topPages.length === 0 && <p className="text-gray-400">მონაცემები არ არის</p>}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
