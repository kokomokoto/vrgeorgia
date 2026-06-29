'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getApiBase } from '@/lib/config';
import { AdminSidebar } from '@/components/AdminSidebar';
import { AdminSearchAnalytics, type SearchAnalyticsData } from '@/components/AdminSearchAnalytics';
import { AdminAgentPortfolioStats, type AgentPortfolioStats } from '@/components/AdminAgentPortfolioStats';

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
  countryStats: { _id: string; code?: string; count: number; uniqueVisitors: number }[];
  cityStats: { _id: string; country?: string; countryCode?: string; region?: string; count: number; uniqueVisitors: number }[];
  searchStats: SearchAnalyticsData;
  agentPortfolioStats: AgentPortfolioStats;
}

const DEVICE_ICONS: Record<string, string> = { desktop: '🖥️', mobile: '📱', tablet: '📋', unknown: '❓' };
const DEVICE_NAMES: Record<string, string> = { desktop: 'კომპიუტერი', mobile: 'ტელეფონი', tablet: 'ტაბლეტი', unknown: 'უცნობი' };

function countryFlag(code?: string) {
  if (!code || code.length !== 2 || code === 'LO') return '🌍';
  const offset = 127397;
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => c.charCodeAt(0) + offset));
}

export default function AdminAnalytics() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState('7d');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }

    try {
      setLoading(true);
      const res = await fetch(`${getApiBase()}/api/admin/analytics?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 403) { setError('წვდომა აკრძალულია'); return; }
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      setData({
        countryStats: [],
        cityStats: [],
        searchStats: {
          totalSearches: 0,
          uniqueSearchers: 0,
          sourceStats: [],
          dealTypeStats: [],
          typeStats: [],
          searchCityStats: [],
          regionStats: [],
          textQueryStats: [],
          roomsStats: [],
          bedroomsStats: [],
          amenitiesStats: [],
          tbilisiDistrictStats: [],
          tbilisiSubdistrictStats: [],
          buildingProjectStats: [],
          renovationStatusStats: [],
          balconiesStats: [],
          dailySearches: [],
          featureStats: {
            has3d: 0,
            hasPhotos: 0,
            priceFilter: 0,
            sqmFilter: 0,
            constructionYearFilter: 0,
            renovationYearFilter: 0,
            propertyIdSearch: 0,
          },
        },
        agentPortfolioStats: { agents: [], typeTotals: [] },
        ...json,
      });
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

  function ProgressBar({
    value,
    max,
    barClassName = 'bg-blue-500',
  }: {
    value: number;
    max: number;
    barClassName?: string;
  }) {
    const pct = max > 0 ? (value / max) * 100 : 0;
    return (
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className={`${barClassName} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminSidebar />

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

            {data.searchStats && <AdminSearchAnalytics data={data.searchStats} />}

            {data.agentPortfolioStats && (
              <AdminAgentPortfolioStats data={data.agentPortfolioStats} periodDays={data.period} />
            )}

            {/* Visitor Geography */}
            <div className="mb-8">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-gray-800">🌍 ვიზიტორების გეოგრაფია</h2>
                <p className="text-sm text-gray-500">IP მისამართის მიხედვით (საიდან შემოდიან მომხმარებლები)</p>
              </div>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-xl bg-white p-6 shadow-sm">
                  <h3 className="mb-4 text-lg font-semibold text-gray-800">ქვეყნები</h3>
                  {data.countryStats.length === 0 ? (
                    <p className="text-gray-400">მონაცემები არ არის</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-gray-500">
                            <th className="py-2 pr-3">#</th>
                            <th className="py-2 pr-3">ქვეყანა</th>
                            <th className="py-2 pr-3 text-right">ნახვები</th>
                            <th className="py-2 text-right">უნიკალური</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.countryStats.map((item, i) => {
                            const maxCount = data.countryStats[0]?.count || 1;
                            return (
                              <tr key={item._id} className="border-b border-gray-50">
                                <td className="py-2.5 pr-3 text-gray-400">{i + 1}</td>
                                <td className="py-2.5 pr-3">
                                  <div className="flex items-center gap-2">
                                    <span>{countryFlag(item.code)}</span>
                                    <span className="font-medium text-gray-800">{item._id}</span>
                                  </div>
                                  <div className="mt-1 w-full max-w-[220px]">
                                    <ProgressBar value={item.count} max={maxCount} barClassName="bg-green-500" />
                                  </div>
                                </td>
                                <td className="py-2.5 pr-3 text-right font-medium text-blue-600">{item.count}</td>
                                <td className="py-2.5 text-right text-green-600">{item.uniqueVisitors}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="rounded-xl bg-white p-6 shadow-sm">
                  <h3 className="mb-4 text-lg font-semibold text-gray-800">ქალაქები</h3>
                  {data.cityStats.length === 0 ? (
                    <p className="text-gray-400">მონაცემები არ არის</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-gray-500">
                            <th className="py-2 pr-3">#</th>
                            <th className="py-2 pr-3">ქალაქი</th>
                            <th className="py-2 pr-3 text-right">ნახვები</th>
                            <th className="py-2 text-right">უნიკალური</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.cityStats.map((item, i) => {
                            const maxCount = data.cityStats[0]?.count || 1;
                            const locationLabel = [item._id, item.region, item.country].filter(Boolean).join(', ');
                            return (
                              <tr key={`${item._id}-${item.country}-${i}`} className="border-b border-gray-50">
                                <td className="py-2.5 pr-3 text-gray-400">{i + 1}</td>
                                <td className="py-2.5 pr-3">
                                  <div className="flex items-center gap-2">
                                    <span>{countryFlag(item.countryCode)}</span>
                                    <div>
                                      <div className="font-medium text-gray-800">{item._id}</div>
                                      <div className="text-xs text-gray-500">{locationLabel}</div>
                                    </div>
                                  </div>
                                  <div className="mt-1 w-full max-w-[220px]">
                                    <ProgressBar value={item.count} max={maxCount} barClassName="bg-purple-500" />
                                  </div>
                                </td>
                                <td className="py-2.5 pr-3 text-right font-medium text-blue-600">{item.count}</td>
                                <td className="py-2.5 text-right text-green-600">{item.uniqueVisitors}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
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
                <h3 className="text-lg font-semibold text-gray-800 mb-1">წინა საიტი (referrer)</h3>
                <p className="mb-4 text-xs text-gray-500">რომელი ბმულიდან გადმოვიდნენ საიტზე</p>
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
