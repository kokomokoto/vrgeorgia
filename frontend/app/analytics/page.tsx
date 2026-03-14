'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

type DashboardData = {
  totalViews: number;
  uniqueSessions: number;
  deviceStats: { _id: string; count: number }[];
  browserStats: { _id: string; count: number }[];
  osStats: { _id: string; count: number }[];
  countryStats: { _id: string; code: string; count: number }[];
  cityStats: { _id: string; country: string; count: number }[];
  pageStats: { _id: string; count: number; avgDuration: number }[];
  hourlyStats: { _id: number; count: number }[];
  dailyStats: { _id: string; count: number; uniqueSessions: number }[];
  screenStats: { _id: { w: number; h: number }; count: number }[];
  connectionStats: { _id: string; count: number }[];
  languageStats: { _id: string; count: number }[];
  referrerStats: { _id: string; count: number }[];
};

type Visit = {
  _id: string;
  path: string;
  device: string;
  browser: string;
  browserVersion: string;
  os: string;
  ip: string;
  country: string;
  countryCode: string;
  city: string;
  region: string;
  screenWidth: number;
  screenHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  batteryLevel: number | null;
  batteryCharging: boolean | null;
  connectionType: string;
  language: string;
  timezone: string;
  platform: string;
  deviceMemory: number | null;
  hardwareConcurrency: number | null;
  referrer: string;
  duration: number;
  createdAt: string;
  sessionId: string;
};

type Realtime = {
  activeUsers: number;
  recentVisits: Visit[];
};

// ──── Helper: ბარი პროცენტულად ────
function Bar({ value, max, color = 'bg-blue-500' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="w-full bg-slate-700 rounded-full h-2.5">
      <div className={`${color} h-2.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ──── Helper: Device icon ────
function deviceIcon(d: string) {
  if (d === 'mobile') return '📱';
  if (d === 'tablet') return '📟';
  return '🖥️';
}

function countryFlag(code: string) {
  if (!code || code.length !== 2) return '🌍';
  const offset = 127397;
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => c.charCodeAt(0) + offset));
}

export default function AnalyticsDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [realtime, setRealtime] = useState<Realtime | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [visitsTotal, setVisitsTotal] = useState(0);
  const [visitsPage, setVisitsPage] = useState(1);
  const [period, setPeriod] = useState('7d');
  const [tab, setTab] = useState<'overview' | 'visits' | 'realtime'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analystName, setAnalystName] = useState('');
  const [expandedVisit, setExpandedVisit] = useState<string | null>(null);

  const getToken = () => localStorage.getItem('analyst_token') || '';

  const authFetch = useCallback(async (url: string) => {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem('analyst_token');
      localStorage.removeItem('analyst_name');
      router.push('/analytics/login');
      throw new Error('Unauthorized');
    }
    if (!res.ok) throw new Error('Request failed');
    return res.json();
  }, [router]);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push('/analytics/login'); return; }
    setAnalystName(localStorage.getItem('analyst_name') || '');
  }, [router]);

  // Dashboard data
  useEffect(() => {
    if (tab !== 'overview') return;
    setLoading(true);
    authFetch(`${API_BASE}/analytics/dashboard?period=${period}`)
      .then(d => { setData(d); setError(''); })
      .catch(e => { if (e.message !== 'Unauthorized') setError(e.message); })
      .finally(() => setLoading(false));
  }, [period, tab, authFetch]);

  // Visits list
  useEffect(() => {
    if (tab !== 'visits') return;
    setLoading(true);
    authFetch(`${API_BASE}/analytics/visits?page=${visitsPage}&limit=30`)
      .then(d => { setVisits(d.visits); setVisitsTotal(d.total); setError(''); })
      .catch(e => { if (e.message !== 'Unauthorized') setError(e.message); })
      .finally(() => setLoading(false));
  }, [tab, visitsPage, authFetch]);

  // Realtime
  useEffect(() => {
    if (tab !== 'realtime') return;
    const load = () => {
      authFetch(`${API_BASE}/analytics/realtime`)
        .then(d => { setRealtime(d); setError(''); })
        .catch(e => { if (e.message !== 'Unauthorized') setError(e.message); });
    };
    load();
    const iv = setInterval(load, 10000);
    return () => clearInterval(iv);
  }, [tab, authFetch]);

  const logout = () => {
    localStorage.removeItem('analyst_token');
    localStorage.removeItem('analyst_name');
    router.push('/analytics/login');
  };

  const maxStat = (arr: { count: number }[]) => Math.max(...arr.map(a => a.count), 1);

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <h1 className="text-lg font-bold">VR Georgia Analytics</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">👤 {analystName}</span>
            <button onClick={logout} className="text-sm text-red-400 hover:text-red-300">გასვლა</button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <div className="flex gap-1 bg-slate-800 rounded-lg p-1 w-fit">
          {(['overview', 'visits', 'realtime'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                tab === t ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {t === 'overview' ? '📈 მიმოხილვა' : t === 'visits' ? '👁️ ვიზიტები' : '⚡ რეალ-ტაიმ'}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {error && <div className="mb-4 p-3 bg-red-500/20 rounded-lg text-red-300 text-sm">{error}</div>}

        {/* ═══ OVERVIEW TAB ═══ */}
        {tab === 'overview' && (
          <>
            {/* Period selector */}
            <div className="flex gap-2 mb-6">
              {[{ k: '1d', l: 'დღეს' }, { k: '7d', l: '7 დღე' }, { k: '30d', l: '30 დღე' }, { k: '90d', l: '90 დღე' }].map(p => (
                <button
                  key={p.k}
                  onClick={() => setPeriod(p.k)}
                  className={`px-3 py-1.5 rounded-md text-sm ${period === p.k ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                >
                  {p.l}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="text-center py-20 text-slate-400">⏳ იტვირთება...</div>
            ) : data ? (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <Card title="ნახვები" value={data.totalViews} icon="👁️" />
                  <Card title="უნიკალური" value={data.uniqueSessions} icon="👤" />
                  <Card title="გვერდები" value={data.pageStats.length} icon="📄" />
                  <Card title="ქვეყნები" value={data.countryStats.length} icon="🌍" />
                </div>

                {/* Daily chart */}
                {data.dailyStats.length > 0 && (
                  <div className="bg-slate-800 rounded-xl p-5 mb-6">
                    <h3 className="text-sm font-semibold text-slate-300 mb-4">📅 დღეების მიხედვით</h3>
                    <div className="flex items-end gap-1 h-32">
                      {data.dailyStats.map(d => {
                        const maxV = maxStat(data.dailyStats);
                        const h = (d.count / maxV) * 100;
                        return (
                          <div key={d._id} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-[10px] text-slate-400">{d.count}</span>
                            <div className="w-full bg-blue-500 rounded-t" style={{ height: `${h}%`, minHeight: '2px' }} />
                            <span className="text-[9px] text-slate-500 truncate w-full text-center">{d._id.slice(5)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Devices */}
                  <StatCard title="🖥️ მოწყობილობები" items={data.deviceStats.map(d => ({
                    label: `${deviceIcon(d._id)} ${d._id}`, count: d.count
                  }))} max={maxStat(data.deviceStats)} />

                  {/* Browsers */}
                  <StatCard title="🌐 ბრაუზერები" items={data.browserStats.map(d => ({
                    label: d._id, count: d.count
                  }))} max={maxStat(data.browserStats)} />

                  {/* OS */}
                  <StatCard title="💻 ოპერაციული სისტემა" items={data.osStats.map(d => ({
                    label: d._id, count: d.count
                  }))} max={maxStat(data.osStats)} />

                  {/* Countries */}
                  <StatCard title="🌍 ქვეყნები" items={data.countryStats.map(d => ({
                    label: `${countryFlag(d.code)} ${d._id}`, count: d.count
                  }))} max={maxStat(data.countryStats)} />

                  {/* Cities */}
                  <StatCard title="🏙️ ქალაქები" items={data.cityStats.map(d => ({
                    label: `${d._id} (${d.country})`, count: d.count
                  }))} max={maxStat(data.cityStats)} />

                  {/* Screens */}
                  <StatCard title="📐 ეკრანის გაფართოება" items={data.screenStats.map(d => ({
                    label: `${d._id.w}×${d._id.h}`, count: d.count
                  }))} max={maxStat(data.screenStats)} />

                  {/* Connection */}
                  <StatCard title="📶 კავშირის ტიპი" items={data.connectionStats.map(d => ({
                    label: d._id, count: d.count
                  }))} max={maxStat(data.connectionStats)} />

                  {/* Languages */}
                  <StatCard title="🗣️ ენები" items={data.languageStats.map(d => ({
                    label: d._id, count: d.count
                  }))} max={maxStat(data.languageStats)} />

                  {/* Hourly */}
                  <div className="bg-slate-800 rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-slate-300 mb-3">🕐 საათების მიხედვით</h3>
                    <div className="flex items-end gap-[2px] h-24">
                      {Array.from({ length: 24 }, (_, i) => {
                        const found = data.hourlyStats.find(h => h._id === i);
                        const c = found?.count || 0;
                        const max = maxStat(data.hourlyStats);
                        const h = max > 0 ? (c / max) * 100 : 0;
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center justify-end" title={`${i}:00 — ${c} ნახვა`}>
                            <div className="w-full bg-emerald-500 rounded-t" style={{ height: `${h}%`, minHeight: c > 0 ? '2px' : '0' }} />
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[9px] text-slate-500">0:00</span>
                      <span className="text-[9px] text-slate-500">12:00</span>
                      <span className="text-[9px] text-slate-500">23:00</span>
                    </div>
                  </div>
                </div>

                {/* Pages */}
                <div className="bg-slate-800 rounded-xl p-5 mt-6">
                  <h3 className="text-sm font-semibold text-slate-300 mb-3">📄 პოპულარული გვერდები</h3>
                  <div className="space-y-2">
                    {data.pageStats.slice(0, 20).map(p => (
                      <div key={p._id} className="flex items-center gap-3 text-sm">
                        <span className="text-slate-400 w-12 text-right flex-shrink-0">{p.count}</span>
                        <Bar value={p.count} max={maxStat(data.pageStats)} color="bg-purple-500" />
                        <span className="text-slate-300 truncate flex-1">{p._id}</span>
                        {p.avgDuration > 0 && (
                          <span className="text-slate-500 text-xs flex-shrink-0">{Math.round(p.avgDuration)}წმ</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Referrers */}
                {data.referrerStats.length > 0 && (
                  <div className="bg-slate-800 rounded-xl p-5 mt-6">
                    <h3 className="text-sm font-semibold text-slate-300 mb-3">🔗 რეფერერები</h3>
                    <div className="space-y-2">
                      {data.referrerStats.map(r => (
                        <div key={r._id} className="flex items-center gap-3 text-sm">
                          <span className="text-slate-400 w-12 text-right flex-shrink-0">{r.count}</span>
                          <Bar value={r.count} max={maxStat(data.referrerStats)} color="bg-amber-500" />
                          <span className="text-slate-300 truncate flex-1">{r._id}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </>
        )}

        {/* ═══ VISITS TAB ═══ */}
        {tab === 'visits' && (
          <>
            <p className="text-sm text-slate-400 mb-4">სულ: {visitsTotal} ჩანაწერი</p>
            {loading ? (
              <div className="text-center py-20 text-slate-400">⏳ იტვირთება...</div>
            ) : (
              <>
                <div className="space-y-2">
                  {visits.map(v => (
                    <div key={v._id} className="bg-slate-800 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setExpandedVisit(expandedVisit === v._id ? null : v._id)}
                        className="w-full p-4 text-left hover:bg-slate-750 transition flex items-center gap-3"
                      >
                        <span className="text-xl">{deviceIcon(v.device)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-slate-200 truncate">{v.path}</span>
                            {v.countryCode && <span className="text-xs">{countryFlag(v.countryCode)}</span>}
                            <span className="text-xs text-slate-500">{v.city}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                            <span>{v.browser}{v.browserVersion ? ` ${v.browserVersion.split('.')[0]}` : ''}</span>
                            <span>{v.os}</span>
                            <span>{v.ip}</span>
                            <span>{new Date(v.createdAt).toLocaleString('ka-GE')}</span>
                          </div>
                        </div>
                        <span className="text-slate-500">{expandedVisit === v._id ? '▲' : '▼'}</span>
                      </button>
                      
                      {expandedVisit === v._id && (
                        <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs border-t border-slate-700 pt-3">
                          <Detail label="IP" value={v.ip} />
                          <Detail label="ქვეყანა" value={`${countryFlag(v.countryCode)} ${v.country}`} />
                          <Detail label="ქალაქი" value={v.city} />
                          <Detail label="რეგიონი" value={v.region} />
                          <Detail label="მოწყობილობა" value={`${deviceIcon(v.device)} ${v.device}`} />
                          <Detail label="ბრაუზერი" value={`${v.browser} ${v.browserVersion || ''}`} />
                          <Detail label="OS" value={v.os} />
                          <Detail label="პლატფორმა" value={v.platform} />
                          <Detail label="ეკრანი" value={v.screenWidth ? `${v.screenWidth}×${v.screenHeight}` : '—'} />
                          <Detail label="Viewport" value={v.viewportWidth ? `${v.viewportWidth}×${v.viewportHeight}` : '—'} />
                          <Detail label="ბატარეა" value={v.batteryLevel !== null ? `${v.batteryLevel}%${v.batteryCharging ? ' ⚡' : ''}` : '—'} />
                          <Detail label="კავშირი" value={v.connectionType || '—'} />
                          <Detail label="ენა" value={v.language || '—'} />
                          <Detail label="დროის ზონა" value={v.timezone || '—'} />
                          <Detail label="მეხსიერება" value={v.deviceMemory ? `${v.deviceMemory} GB` : '—'} />
                          <Detail label="CPU Cores" value={v.hardwareConcurrency ? `${v.hardwareConcurrency}` : '—'} />
                          <Detail label="დაყოვნება" value={v.duration > 0 ? `${v.duration} წმ` : '—'} />
                          <Detail label="რეფერერი" value={v.referrer || 'პირდაპირი'} />
                          <Detail label="Session" value={v.sessionId?.slice(0, 15) || '—'} />
                          <Detail label="დრო" value={new Date(v.createdAt).toLocaleString('ka-GE')} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-center gap-3 mt-6">
                  <button
                    onClick={() => setVisitsPage(p => Math.max(1, p - 1))}
                    disabled={visitsPage <= 1}
                    className="px-4 py-2 bg-slate-800 rounded-lg text-sm disabled:opacity-40"
                  >
                    ← წინა
                  </button>
                  <span className="text-sm text-slate-400">გვერდი {visitsPage} / {Math.ceil(visitsTotal / 30) || 1}</span>
                  <button
                    onClick={() => setVisitsPage(p => p + 1)}
                    disabled={visitsPage >= Math.ceil(visitsTotal / 30)}
                    className="px-4 py-2 bg-slate-800 rounded-lg text-sm disabled:opacity-40"
                  >
                    შემდეგი →
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* ═══ REALTIME TAB ═══ */}
        {tab === 'realtime' && (
          <>
            <div className="bg-emerald-600/20 border border-emerald-500/30 rounded-xl p-6 mb-6 text-center">
              <div className="text-4xl font-bold text-emerald-400">{realtime?.activeUsers || 0}</div>
              <div className="text-sm text-emerald-300 mt-1">აქტიური მომხმარებელი (ბოლო 5 წუთი)</div>
              <div className="text-xs text-slate-500 mt-2">ავტო-განახლება ყოველ 10 წამში</div>
            </div>

            <div className="space-y-2">
              {realtime?.recentVisits.map(v => (
                <div key={v._id} className="bg-slate-800 rounded-lg p-3 flex items-center gap-3 text-sm">
                  <span className="text-lg">{deviceIcon(v.device)}</span>
                  <span className="text-slate-300 truncate flex-1">{v.path}</span>
                  {v.countryCode && <span>{countryFlag(v.countryCode)}</span>}
                  <span className="text-slate-500 text-xs">{v.city}</span>
                  <span className="text-slate-500 text-xs">{v.browser}</span>
                  <span className="text-slate-600 text-xs">{new Date(v.createdAt).toLocaleTimeString('ka-GE')}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ──── Sub-components ────

function Card({ title, value, icon }: { title: string; value: number; icon: string }) {
  return (
    <div className="bg-slate-800 rounded-xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        <span className="text-2xl font-bold text-white">{value.toLocaleString()}</span>
      </div>
      <p className="text-xs text-slate-400 mt-2">{title}</p>
    </div>
  );
}

function StatCard({ title, items, max }: { title: string; items: { label: string; count: number }[]; max: number }) {
  if (!items.length) return null;
  return (
    <div className="bg-slate-800 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-300 mb-3">{title}</h3>
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.label} className="flex items-center gap-2 text-sm">
            <span className="text-slate-400 w-8 text-right flex-shrink-0 text-xs">{item.count}</span>
            <Bar value={item.count} max={max} />
            <span className="text-slate-300 truncate text-xs">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-slate-500">{label}:</span>
      <span className="text-slate-300 ml-1 break-all">{value}</span>
    </div>
  );
}
