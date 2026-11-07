'use client';

import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE } from '@/lib/config';

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

type AppInstallRow = {
  _id: string;
  sessionId: string;
  userId?: string | null;
  ip: string;
  country: string;
  countryCode: string;
  city: string;
  device: string;
  browser: string;
  os: string;
  createdAt: string;
};

function Meter({ value, max, color = 'bg-sky-500' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
      <div className={`${color} h-full rounded-full`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ──── Helper: Device icon ────
function deviceLabel(d: string) {
  if (d === 'mobile') return 'მობილური';
  if (d === 'tablet') return 'ტაბლეტი';
  if (d === 'desktop') return 'კომპიუტერი';
  return d || '—';
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
  const [tab, setTab] = useState<'overview' | 'visits' | 'realtime' | 'installs'>('overview');
  const [installs, setInstalls] = useState<AppInstallRow[]>([]);
  const [installsTotal, setInstallsTotal] = useState(0);
  const [installsPage, setInstallsPage] = useState(1);
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
    authFetch(`${API_BASE}/api/analytics/dashboard?period=${period}`)
      .then(d => { setData(d); setError(''); })
      .catch(e => { if (e.message !== 'Unauthorized') setError(e.message); })
      .finally(() => setLoading(false));
  }, [period, tab, authFetch]);

  // Visits list
  useEffect(() => {
    if (tab !== 'visits') return;
    setLoading(true);
    authFetch(`${API_BASE}/api/analytics/visits?page=${visitsPage}&limit=30`)
      .then(d => { setVisits(d.visits); setVisitsTotal(d.total); setError(''); })
      .catch(e => { if (e.message !== 'Unauthorized') setError(e.message); })
      .finally(() => setLoading(false));
  }, [tab, visitsPage, authFetch]);

  useEffect(() => {
    if (tab !== 'installs') return;
    setLoading(true);
    authFetch(`${API_BASE}/api/analytics/installs?page=${installsPage}&limit=30`)
      .then(d => { setInstalls(d.installs || []); setInstallsTotal(d.total || 0); setError(''); })
      .catch(e => { if (e.message !== 'Unauthorized') setError(e.message); })
      .finally(() => setLoading(false));
  }, [tab, installsPage, authFetch]);

  // Realtime
  useEffect(() => {
    if (tab !== 'realtime') return;
    const load = () => {
      authFetch(`${API_BASE}/api/analytics/realtime`)
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

  const tabs = [
    ['overview', 'მიმოხილვა'],
    ['visits', 'ვიზიტები'],
    ['installs', 'დაყენებები'],
    ['realtime', 'ახლა'],
  ] as const;

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3">
          <h1 className="min-w-0 truncate text-base font-semibold">ანალიტიკა</h1>
          {analystName ? (
            <span className="ml-auto hidden min-w-0 max-w-[40%] truncate text-sm text-slate-400 sm:block">{analystName}</span>
          ) : <span className="ml-auto" />}
          <button type="button" onClick={logout} className="shrink-0 text-sm text-rose-300 hover:text-rose-200">გასვლა</button>
        </div>
        <nav className="mx-auto flex w-full max-w-6xl gap-1 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="ანალიტიკის განყოფილებები">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
                tab === id ? 'bg-sky-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 py-5">
        {error && <div className="mb-4 p-3 bg-red-500/20 rounded-lg text-red-300 text-sm">{error}</div>}

        {tab === 'overview' && (
          <>
            <div className="mb-5 flex flex-wrap gap-2">
              {[{ k: '1d', l: 'დღეს' }, { k: '7d', l: '7 დღე' }, { k: '30d', l: '30 დღე' }, { k: '90d', l: '90 დღე' }].map(p => (
                <button
                  key={p.k}
                  type="button"
                  onClick={() => setPeriod(p.k)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-sm ${period === p.k ? 'bg-sky-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
                >
                  {p.l}
                </button>
              ))}
            </div>

            {loading ? (
              <p className="py-20 text-center text-sm text-slate-400">იტვირთება...</p>
            ) : data ? (
              <>
                <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <Kpi title="ნახვები" value={data.totalViews} />
                  <Kpi title="უნიკალური" value={data.uniqueSessions} />
                  <Kpi title="გვერდები" value={data.pageStats.length} />
                  <Kpi title="ქვეყნები" value={data.countryStats.length} />
                </div>

                <Panel title="დღეების მიხედვით">
                  {data.dailyStats.length === 0 ? <Empty /> : (
                    <div className="max-w-full overflow-x-auto">
                      <div className="flex h-44 min-w-full items-end gap-1.5" style={{ minWidth: data.dailyStats.length * 40 }}>
                        {data.dailyStats.map(d => {
                          const maxV = maxStat(data.dailyStats);
                          const h = maxV > 0 ? (d.count / maxV) * 100 : 0;
                          return (
                            <div key={d._id} className="flex h-full min-w-9 flex-1 flex-col items-center" title={`${d._id}: ${d.count} ნახვა`}>
                              <span className="text-[11px] tabular-nums text-slate-400">{d.count}</span>
                              <div className="flex w-full flex-1 items-end">
                                <div className="w-full rounded-t bg-sky-500" style={{ height: `${Math.max(h, d.count > 0 ? 6 : 0)}%` }} />
                              </div>
                              <span className="mt-1 whitespace-nowrap text-[11px] text-slate-500">{d._id.slice(5)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </Panel>

                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <MetricList title="მოწყობილობები" items={data.deviceStats.map(d => ({ label: deviceLabel(d._id), count: d.count }))} />
                  <MetricList title="ბრაუზერები" items={data.browserStats.map(d => ({ label: d._id || '—', count: d.count }))} />
                  <MetricList title="ოპერაციული სისტემა" items={data.osStats.map(d => ({ label: d._id || '—', count: d.count }))} />
                  <MetricList title="ქვეყნები" items={data.countryStats.map(d => ({ label: `${countryFlag(d.code)} ${d._id || '—'}`, count: d.count }))} />
                  <MetricList title="ქალაქები" items={data.cityStats.map(d => ({ label: d.country ? `${d._id} (${d.country})` : (d._id || '—'), count: d.count }))} />
                  <MetricList title="ეკრანის გაფართოება" items={data.screenStats.map(d => ({ label: `${d._id?.w || 0}×${d._id?.h || 0}`, count: d.count }))} />
                  <MetricList title="კავშირის ტიპი" items={data.connectionStats.map(d => ({ label: d._id || '—', count: d.count }))} />
                  <MetricList title="ენები" items={data.languageStats.map(d => ({ label: d._id || '—', count: d.count }))} />
                  <Panel title="საათების მიხედვით">
                    <div className="flex h-28 items-end gap-px">
                      {Array.from({ length: 24 }, (_, i) => {
                        const found = data.hourlyStats.find(h => h._id === i);
                        const c = found?.count || 0;
                        const max = maxStat(data.hourlyStats);
                        const h = max > 0 ? (c / max) * 100 : 0;
                        return (
                          <div key={i} className="flex h-full min-w-0 flex-1 items-end" title={`${i}:00 — ${c} ნახვა`}>
                            <div className="w-full rounded-t bg-emerald-500" style={{ height: `${Math.max(h, c > 0 ? 8 : 0)}%` }} />
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-2 flex justify-between text-[11px] text-slate-500">
                      <span>0:00</span>
                      <span>12:00</span>
                      <span>23:00</span>
                    </div>
                  </Panel>
                </div>

                <div className="mt-4">
                  <MetricList
                    title="პოპულარული გვერდები"
                    items={data.pageStats.slice(0, 20).map(p => ({
                      label: p.avgDuration > 0 ? `${p._id} · ${Math.round(p.avgDuration)} წმ` : (p._id || '—'),
                      count: p.count,
                    }))}
                    color="bg-violet-500"
                  />
                </div>

                <div className="mt-4">
                  <MetricList
                    title="რეფერერები"
                    items={data.referrerStats.map(r => ({ label: r._id || 'პირდაპირი', count: r.count }))}
                    color="bg-amber-500"
                  />
                </div>
              </>
            ) : null}
          </>
        )}

        {tab === 'visits' && (
          <>
            <p className="mb-4 text-sm text-slate-400">სულ {visitsTotal} ჩანაწერი</p>
            {loading ? (
              <p className="py-20 text-center text-sm text-slate-400">იტვირთება...</p>
            ) : visits.length === 0 ? (
              <Empty note="ჯერ არც ერთი ვიზიტი არ ჩაწერილა." />
            ) : (
              <>
                <div className="space-y-2">
                  {visits.map(v => (
                    <VisitCard
                      key={v._id}
                      visit={v}
                      open={expandedVisit === v._id}
                      onToggle={() => setExpandedVisit(expandedVisit === v._id ? null : v._id)}
                    />
                  ))}
                </div>
                <Pager
                  page={visitsPage}
                  pages={Math.ceil(visitsTotal / 30) || 1}
                  onPrev={() => setVisitsPage(p => Math.max(1, p - 1))}
                  onNext={() => setVisitsPage(p => p + 1)}
                />
              </>
            )}
          </>
        )}

        {tab === 'installs' && (
          <>
            <p className="mb-4 text-sm leading-5 text-slate-400">
              სულ {installsTotal} დაყენება. iPhone ამ სიაში არ ჩანს, რადგან Safari დაყენებას არ აგზავნის.
            </p>
            {loading ? (
              <p className="py-20 text-center text-sm text-slate-400">იტვირთება...</p>
            ) : installs.length === 0 ? (
              <Empty note="ჯერ არც ერთი დაყენება არ ჩაწერილა." />
            ) : (
              <>
                <ul className="space-y-2 md:hidden">
                  {installs.map((row) => (
                    <li key={row._id} className="min-w-0 rounded-xl border border-slate-800 bg-slate-900 p-3">
                      <p className="text-sm font-medium text-slate-100">{new Date(row.createdAt).toLocaleString('ka-GE')}</p>
                      <dl className="mt-2 grid grid-cols-[5.5rem_minmax(0,1fr)] gap-y-1 text-sm">
                        <dt className="text-slate-500">IP</dt>
                        <dd className="break-all text-slate-200">{row.ip || '—'}</dd>
                        <dt className="text-slate-500">ქალაქი</dt>
                        <dd className="min-w-0 break-words text-slate-200">{countryFlag(row.countryCode)} {row.city || row.country || '—'}</dd>
                        <dt className="text-slate-500">მოწყობილობა</dt>
                        <dd className="break-words text-slate-200">{row.os || deviceLabel(row.device)}</dd>
                        <dt className="text-slate-500">ბრაუზერი</dt>
                        <dd className="break-words text-slate-200">{row.browser || '—'}</dd>
                        <dt className="text-slate-500">ანგარიში</dt>
                        <dd className="break-all text-slate-300">{row.userId ? String(row.userId) : 'სტუმარი'}</dd>
                      </dl>
                    </li>
                  ))}
                </ul>
                <div className="hidden max-w-full overflow-x-auto rounded-xl border border-slate-800 md:block">
                  <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                    <thead className="sticky top-0 bg-slate-900 text-xs text-slate-400">
                      <tr>
                        <th className="px-3 py-2 font-medium">დრო</th>
                        <th className="px-3 py-2 font-medium">IP</th>
                        <th className="px-3 py-2 font-medium">ქალაქი</th>
                        <th className="px-3 py-2 font-medium">მოწყობილობა</th>
                        <th className="px-3 py-2 font-medium">ბრაუზერი</th>
                        <th className="px-3 py-2 font-medium">ანგარიში</th>
                      </tr>
                    </thead>
                    <tbody>
                      {installs.map((row) => (
                        <tr key={row._id} className="border-t border-slate-800">
                          <td className="whitespace-nowrap px-3 py-2 text-slate-300">{new Date(row.createdAt).toLocaleString('ka-GE')}</td>
                          <td className="px-3 py-2 text-slate-200">{row.ip || '—'}</td>
                          <td className="px-3 py-2 text-slate-300">{countryFlag(row.countryCode)} {row.city || row.country || '—'}</td>
                          <td className="px-3 py-2 text-slate-300">{row.os || deviceLabel(row.device)}</td>
                          <td className="px-3 py-2 text-slate-300">{row.browser || '—'}</td>
                          <td className="max-w-[12rem] truncate px-3 py-2 text-slate-400" title={row.userId ? String(row.userId) : 'სტუმარი'}>{row.userId ? String(row.userId) : 'სტუმარი'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pager
                  page={installsPage}
                  pages={Math.ceil(installsTotal / 30) || 1}
                  onPrev={() => setInstallsPage((p) => Math.max(1, p - 1))}
                  onNext={() => setInstallsPage((p) => p + 1)}
                />
              </>
            )}
          </>
        )}

        {tab === 'realtime' && (
          <>
            <section className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-6 text-center">
              <p className="text-4xl font-semibold tabular-nums text-emerald-300">{realtime?.activeUsers || 0}</p>
              <p className="mt-1 text-sm text-emerald-200">აქტიური მომხმარებელი ბოლო 5 წუთში</p>
              <p className="mt-2 text-xs text-slate-500">ახლდება ყოველ 10 წამში</p>
            </section>
            {(realtime?.recentVisits.length || 0) === 0 ? <Empty note="ბოლო წუთებში ვიზიტი არ ყოფილა." /> : (
              <div className="space-y-2">
                {realtime?.recentVisits.map(v => (
                  <VisitCard
                    key={v._id}
                    visit={v}
                    open={expandedVisit === v._id}
                    onToggle={() => setExpandedVisit(expandedVisit === v._id ? null : v._id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-xl border border-slate-800 bg-slate-900 p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-200">{title}</h2>
      {children}
    </section>
  );
}

function Kpi({ title, value }: { title: string; value: number }) {
  return (
    <section className="min-w-0 rounded-xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-xs text-slate-400">{title}</p>
      <p className="mt-1 truncate text-2xl font-semibold tabular-nums text-white">{value.toLocaleString('ka-GE')}</p>
    </section>
  );
}

function MetricList({ title, items, color = 'bg-sky-500' }: { title: string; items: { label: string; count: number }[]; color?: string }) {
  const max = Math.max(...items.map(item => item.count), 1);
  return (
    <Panel title={title}>
      {items.length === 0 ? <Empty /> : (
        <ul className="space-y-3">
          {items.map(item => (
            <li key={item.label} className="min-w-0">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 break-words text-sm text-slate-200" title={item.label}>{item.label}</span>
                <span className="shrink-0 text-sm tabular-nums text-slate-400">{item.count.toLocaleString('ka-GE')}</span>
              </div>
              <div className="mt-1.5">
                <Meter value={item.count} max={max} color={color} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function Empty({ note = 'მონაცემი არ არის' }: { note?: string }) {
  return <p className="text-sm text-slate-500">{note}</p>;
}

function VisitCard({ visit: v, open, onToggle }: { visit: Visit; open: boolean; onToggle: () => void }) {
  return (
    <article className="min-w-0 rounded-xl border border-slate-800 bg-slate-900">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-3 p-4 text-left"
        aria-expanded={open}
      >
        <span className="shrink-0 rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300">{deviceLabel(v.device)}</span>
        <span className="min-w-0 flex-1">
          <span className="block break-all text-sm font-medium text-slate-100">{v.path || '—'}</span>
          <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
            <span>{countryFlag(v.countryCode)} {v.city || v.country || '—'}</span>
            <span>{v.browser || '—'}{v.browserVersion ? ` ${v.browserVersion.split('.')[0]}` : ''}</span>
            <span>{v.os || '—'}</span>
            <span className="break-all">{v.ip || '—'}</span>
            <span>{new Date(v.createdAt).toLocaleString('ka-GE')}</span>
          </span>
        </span>
        <span className="shrink-0 text-xs text-slate-500">{open ? 'დახურვა' : 'მეტი'}</span>
      </button>
      {open ? (
        <div className="grid gap-3 border-t border-slate-800 px-4 py-3 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="IP" value={v.ip} />
          <Detail label="ქვეყანა" value={`${countryFlag(v.countryCode)} ${v.country || '—'}`} />
          <Detail label="ქალაქი" value={v.city} />
          <Detail label="რეგიონი" value={v.region} />
          <Detail label="მოწყობილობა" value={deviceLabel(v.device)} />
          <Detail label="ბრაუზერი" value={`${v.browser || ''} ${v.browserVersion || ''}`.trim()} />
          <Detail label="სისტემა" value={v.os} />
          <Detail label="პლატფორმა" value={v.platform} />
          <Detail label="ეკრანი" value={v.screenWidth ? `${v.screenWidth}×${v.screenHeight}` : ''} />
          <Detail label="ხედი" value={v.viewportWidth ? `${v.viewportWidth}×${v.viewportHeight}` : ''} />
          <Detail label="ბატარეა" value={v.batteryLevel !== null ? `${v.batteryLevel}%${v.batteryCharging ? ' იტენება' : ''}` : ''} />
          <Detail label="კავშირი" value={v.connectionType} />
          <Detail label="ენა" value={v.language} />
          <Detail label="დროის ზონა" value={v.timezone} />
          <Detail label="მეხსიერება" value={v.deviceMemory ? `${v.deviceMemory} GB` : ''} />
          <Detail label="ბირთვები" value={v.hardwareConcurrency ? `${v.hardwareConcurrency}` : ''} />
          <Detail label="დაყოვნება" value={v.duration > 0 ? `${v.duration} წმ` : ''} />
          <Detail label="რეფერერი" value={v.referrer || 'პირდაპირი'} />
          <Detail label="სესია" value={v.sessionId} />
          <Detail label="დრო" value={new Date(v.createdAt).toLocaleString('ka-GE')} />
        </div>
      ) : null}
    </article>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="break-words text-sm text-slate-200">{value || '—'}</p>
    </div>
  );
}

function Pager({ page, pages, onPrev, onNext }: { page: number; pages: number; onPrev: () => void; onNext: () => void }) {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
      <button type="button" onClick={onPrev} disabled={page <= 1} className="rounded-lg bg-slate-900 px-4 py-2 text-sm disabled:opacity-40">წინა</button>
      <span className="text-sm text-slate-400">გვერდი {page} / {pages}</span>
      <button type="button" onClick={onNext} disabled={page >= pages} className="rounded-lg bg-slate-900 px-4 py-2 text-sm disabled:opacity-40">შემდეგი</button>
    </div>
  );
}
