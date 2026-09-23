'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getApiBase } from '@/lib/config';
import { AdminSidebar } from '@/components/AdminSidebar';
import { AUDIT_ACTION_LABELS, auditActionLabel, auditTargetLabel } from '@/lib/auditLabels';

interface AuditSubject {
  label?: string;
  href?: string | null;
  detail?: string;
}

interface AuditLog {
  _id: string;
  action: string;
  targetType: string;
  targetId: string;
  meta?: Record<string, unknown>;
  subject?: AuditSubject;
  createdAt: string;
  adminId?: { name?: string; email?: string };
}

const ACTION_OPTIONS = Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => ({ value, label }));

function actionLabel(action: string) {
  return auditActionLabel(action);
}

function targetLabel(type: string) {
  return auditTargetLabel(type);
}

function isObjectId(value: string) {
  return /^[a-f0-9]{24}$/i.test(value);
}

function targetLink(log: AuditLog): string | null {
  if (log.subject?.href) return log.subject.href;
  if (log.targetId === 'pins') return '/admin/properties?pinned=1';
  if (log.targetType === 'property' && isObjectId(log.targetId)) return `/property/${log.targetId}`;
  if (log.targetType === 'tour') {
    const propertyId = log.meta?.propertyId;
    if (typeof propertyId === 'string' && isObjectId(propertyId)) return `/property/${propertyId}`;
    return null;
  }
  if (log.targetType === 'agent' && isObjectId(log.targetId)) return `/agents/${log.targetId}`;
  if (log.targetType === 'user') return `/admin/users`;
  if (log.targetType === 'site_content' && log.targetId === 'faq') return '/faq';
  if (log.targetType === 'site_content' && log.targetId === 'about') return '/about';
  return null;
}

function objectLabel(log: AuditLog): string {
  if (log.subject?.label) return log.subject.label;
  if (log.targetId === 'pins') return 'აპინული სია';
  if (log.targetId.length <= 24) return log.targetId;
  return `…${log.targetId.slice(-8)}`;
}

function actorName(log: AuditLog): string {
  if (log.adminId?.name) return log.adminId.name;
  if (typeof log.meta?.actorName === 'string' && log.meta.actorName) return log.meta.actorName;
  if (log.adminId?.email) return log.adminId.email;
  if (typeof log.meta?.actorEmail === 'string' && log.meta.actorEmail) return log.meta.actorEmail;
  return 'უცნობი';
}

function actorEmail(log: AuditLog): string {
  if (log.adminId?.email && log.adminId?.name) return log.adminId.email;
  if (
    typeof log.meta?.actorEmail === 'string' &&
    log.meta.actorEmail &&
    log.meta.actorEmail !== actorName(log)
  ) {
    return log.meta.actorEmail;
  }
  return '';
}

function metaSummary(meta?: Record<string, unknown>): string {
  if (!meta || Object.keys(meta).length === 0) return '';
  const parts: string[] = [];
  if (typeof meta.status === 'string') parts.push(`სტატუსი: ${meta.status}`);
  if (typeof meta.reason === 'string' && meta.reason) parts.push(`მიზეზი: ${meta.reason}`);
  if (typeof meta.role === 'string') parts.push(`როლი: ${meta.role}`);
  if (typeof meta.deletedProperties === 'number') parts.push(`წაშლ. განც.: ${meta.deletedProperties}`);
  if (typeof meta.fromAgentName === 'string' && typeof meta.toAgentName === 'string') {
    parts.push(`${meta.fromAgentName} → ${meta.toAgentName}`);
  } else if (typeof meta.toAgentName === 'string') {
    parts.push(`→ ${meta.toAgentName}`);
  }
  if (typeof meta.sceneName === 'string' && meta.sceneName) parts.push(`სცენა: ${meta.sceneName}`);
  if (typeof meta.previousName === 'string' && meta.previousName) parts.push(`იყო: ${meta.previousName}`);
  if (typeof meta.targetSceneName === 'string' && meta.targetSceneName) {
    parts.push(`→ ${meta.targetSceneName}`);
  }
  if (typeof meta.propertyNumericId === 'number' && meta.propertyNumericId) {
    parts.push(`#${meta.propertyNumericId}`);
  } else if (typeof meta.propertyNumericId === 'string' && meta.propertyNumericId) {
    parts.push(`#${meta.propertyNumericId}`);
  }
  if (typeof meta.propertyTitle === 'string' && meta.propertyTitle) parts.push(meta.propertyTitle);
  if (typeof meta.tourTitle === 'string' && meta.tourTitle) parts.push(meta.tourTitle);
  if (typeof meta.previousTitle === 'string' && meta.previousTitle) parts.push(`იყო: ${meta.previousTitle}`);
  if (typeof meta.sceneCount === 'number') parts.push(`${meta.sceneCount} სცენა`);
  if (meta.imageRemoved === true) parts.push('ფოტოც წაიშალა');
  if (meta.imageRemoved === false) parts.push('გამოქვეყნებული ფოტო დარჩა');
  if (meta.anonymous === true && typeof meta.ip === 'string' && meta.ip) parts.push(`IP: ${meta.ip}`);
  if (typeof meta.page === 'string' && meta.page) parts.push(meta.page);
  return parts.join(' · ');
}

export default function AdminAuditLogsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [targetFilter, setTargetFilter] = useState('');
  const [error, setError] = useState('');

  const fetchLogs = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(actionFilter && { action: actionFilter }),
        ...(targetFilter && { targetType: targetFilter }),
      });
      const res = await fetch(`${getApiBase()}/api/admin/audit-logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 403) {
        setError('წვდომა აკრძალულია');
        return;
      }
      if (!res.ok) {
        setError('მონაცემების ჩატვირთვა ვერ მოხერხდა');
        return;
      }
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 1);
    } catch {
      setError('სერვერთან კავშირი ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, targetFilter, router]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="rounded-lg bg-white p-8 text-center shadow-lg">
          <p className="mb-4 text-gray-600">{error}</p>
          <Link href="/admin" className="text-blue-600 hover:underline">
            ადმინ პანელი
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminSidebar />

      <div className="ml-64 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">ადმინისტრატორის ჟურნალი</h1>
          <p className="text-gray-600">
            სულ: {total} ჩანაწერი. 3D ტურის სცენა, პანორამა, გადასასვლელი და გამოქვეყნება აქაც იწერება — ვინ შეცვალა.
          </p>
        </div>

        <div className="mb-6 rounded-xl bg-white p-4 shadow-sm">
          <div className="flex flex-wrap gap-4">
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">ყველა ქმედება</option>
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={targetFilter}
              onChange={(e) => {
                setTargetFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">ყველა ტიპი</option>
              <option value="user">მომხმარებელი</option>
              <option value="agent">აგენტი</option>
              <option value="property">განცხადება</option>
              <option value="tour">3D ტური</option>
              <option value="site_content">საიტი</option>
            </select>
            {(actionFilter || targetFilter) && (
              <button
                type="button"
                onClick={() => {
                  setActionFilter('');
                  setTargetFilter('');
                  setPage(1);
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                გასუფთავება
              </button>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-500">
                  <th className="px-4 py-3 font-semibold">თარიღი</th>
                  <th className="px-4 py-3 font-semibold">ვინ</th>
                  <th className="px-4 py-3 font-semibold">ქმედება</th>
                  <th className="px-4 py-3 font-semibold">ობიექტი</th>
                  <th className="px-4 py-3 font-semibold">დეტალები</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                      იტვირთება...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                      ჩანაწერები ვერ მოიძებნა
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const href = targetLink(log);
                    const meta = log.subject?.detail || metaSummary(log.meta);
                    return (
                      <tr key={log._id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                          {new Date(log.createdAt).toLocaleString('ka-GE')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800">{actorName(log)}</div>
                          {actorEmail(log) && (
                            <div className="text-xs text-gray-500">{actorEmail(log)}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-800">{actionLabel(log.action)}</td>
                        <td className="px-4 py-3">
                          <div className="text-gray-600">{targetLabel(log.targetType)}</div>
                          {href ? (
                            <Link href={href} className="text-xs text-blue-600 hover:underline" target="_blank">
                              {objectLabel(log)}
                            </Link>
                          ) : (
                            <span className="text-xs text-gray-400">{objectLabel(log)}</span>
                          )}
                        </td>
                        <td className="max-w-xs px-4 py-3 text-gray-500">{meta || '—'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-4 py-3">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border bg-white px-4 py-2 disabled:opacity-50"
              >
                ← წინა
              </button>
              <span className="text-gray-600">
                გვერდი {page} / {pages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="rounded-lg border bg-white px-4 py-2 disabled:opacity-50"
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
