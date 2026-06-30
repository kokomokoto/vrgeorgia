'use client';

import Link from 'next/link';
import { resolveImageUrl } from '@/lib/api';
import { ANALYTICS_PERIOD_OPTIONS, type AnalyticsPeriodValue } from '@/lib/analyticsPeriod';

export type AgentPortfolioRow = {
  agentId: string;
  name: string;
  email: string;
  photo: string;
  verified: boolean;
  active: boolean;
  avgRating: number;
  totalReviews: number;
  propertyCount: number;
  activeCount: number;
  hiddenCount: number;
  soldCount: number;
  deletedCount: number;
  totalViews: number;
  periodViews: number;
  typeBreakdown: { type: string; count: number }[];
};

export type AgentPortfolioStats = {
  agents: AgentPortfolioRow[];
  typeTotals: { _id: string; count: number }[];
};

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
  unknown: 'უცნობი',
};

function typeLabel(type: string) {
  return TYPE_LABELS[type] || type;
}

export function AdminAgentPortfolioStats({
  data,
  periodDays,
  period,
  onPeriodChange,
  periodLoading = false,
}: {
  data: AgentPortfolioStats;
  periodDays: number;
  period?: AnalyticsPeriodValue;
  onPeriodChange?: (period: AnalyticsPeriodValue) => void;
  periodLoading?: boolean;
}) {
  const withListings = data.agents.filter((a) => a.propertyCount > 0);
  const totalListings = withListings.reduce((s, a) => s + a.propertyCount, 0);
  const totalActive = withListings.reduce((s, a) => s + (a.activeCount ?? 0), 0);
  const totalHidden = withListings.reduce((s, a) => s + (a.hiddenCount ?? 0), 0);
  const totalViews = withListings.reduce((s, a) => s + a.totalViews, 0);
  const maxTypes = Math.max(...data.typeTotals.map((t) => t.count), 1);

  return (
    <div className="mb-8">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">👤 აგენტების სტატისტიკა</h2>
          <p className="text-sm text-gray-500">
            ატვირთული, აქტიური, დამალული, გაყიდული/წაშლილი და ნახვები აგენტების მიხედვით
          </p>
        </div>
        {onPeriodChange && (
          <div className="flex flex-wrap gap-2">
            {ANALYTICS_PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={periodLoading}
                onClick={() => onPeriodChange(opt.value)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  period === opt.value
                    ? 'bg-teal-600 text-white'
                    : 'bg-white text-gray-700 shadow-sm hover:bg-gray-50'
                } ${periodLoading ? 'opacity-60' : ''}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">აქტიური აგენტი (განცხადებით)</p>
          <p className="text-3xl font-bold text-gray-800">{withListings.length}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">სულ ატვირთული</p>
          <p className="text-3xl font-bold text-gray-800">{totalListings.toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">აქტიური განცხადება</p>
          <p className="text-3xl font-bold text-blue-600">{totalActive.toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">დამალული</p>
          <p className="text-3xl font-bold text-amber-600">{totalHidden.toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">სულ ნახვა</p>
          <p className="text-3xl font-bold text-gray-800">{totalViews.toLocaleString()}</p>
        </div>
      </div>

      {data.typeTotals.length > 0 && (
        <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-gray-800">კატეგორიების განაწილება (ყველა აგენტი)</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.typeTotals.map((item) => (
              <div key={item._id} className="rounded-lg bg-gray-50 px-4 py-3">
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-800">{typeLabel(item._id)}</span>
                  <span className="text-gray-500">{item.count}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-teal-500"
                    style={{ width: `${Math.max(4, (item.count / maxTypes) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-500">
                <th className="px-4 py-3 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold">აგენტი</th>
                <th className="px-4 py-3 font-semibold text-right" title="ბაზაში არსებული ყველა განცხადება">
                  სულ ატვირთული
                </th>
                <th className="px-4 py-3 font-semibold text-right" title="საჯარო ხილვადობა, აქტიური/მოდერაციაში">
                  აქტიური
                </th>
                <th className="px-4 py-3 font-semibold text-right" title="პირადი ან მხოლოდ ლინკით">
                  დამალული
                </th>
                <th className="px-4 py-3 font-semibold text-right">გაყიდული</th>
                <th className="px-4 py-3 font-semibold text-right">წაშლილი</th>
                <th className="px-4 py-3 font-semibold text-right">ნახვები (სულ)</th>
                <th className="px-4 py-3 font-semibold text-right">ნახვები ({periodDays} დღე)</th>
                <th className="px-4 py-3 font-semibold">კატეგორიები</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.agents.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                    აგენტები ვერ მოიძებნა
                  </td>
                </tr>
              ) : (
                data.agents.map((agent, i) => (
                  <tr key={agent.agentId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100">
                          {agent.photo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={resolveImageUrl(agent.photo)}
                              alt={agent.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-lg text-gray-400">👤</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Link
                              href={`/agents/${agent.agentId}`}
                              className="truncate font-medium text-blue-600 hover:underline"
                            >
                              {agent.name}
                            </Link>
                            {agent.verified && <span title="ვერიფიცირებული">✓</span>}
                            {!agent.active && (
                              <span className="rounded bg-gray-200 px-1.5 py-0.5 text-xs text-gray-600">
                                არააქტ.
                              </span>
                            )}
                          </div>
                          <p className="truncate text-xs text-gray-500">{agent.email}</p>
                          {agent.totalReviews > 0 && (
                            <p className="text-xs text-gray-400">
                              ★ {agent.avgRating.toFixed(1)} ({agent.totalReviews})
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">
                      {agent.propertyCount}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-blue-600">
                      {agent.activeCount ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-amber-600">
                      {agent.hiddenCount ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                      {agent.soldCount ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600">
                      {agent.deletedCount ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-blue-600">
                      {agent.totalViews.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-teal-600">
                      {agent.periodViews.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {agent.typeBreakdown.length === 0 ? (
                        <span className="text-gray-400">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {agent.typeBreakdown.map((t) => (
                            <span
                              key={`${agent.agentId}-${t.type}`}
                              className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-xs text-teal-800"
                            >
                              {typeLabel(t.type)}
                              <span className="font-semibold">{t.count}</span>
                            </span>
                          ))}
                        </div>
                      )}
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
