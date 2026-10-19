'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/components/AuthProvider';
import {
  addSearcherRequestComment,
  deleteSearcherRequestComment,
  listSearcherAgentRequests,
  updateSearcherRequestComment,
  type AgentRequestItem,
  type AgentRequestPrefs,
  type SearcherAgentRow,
} from '@/lib/api';
import { telegramWebUrl, viberUrl, whatsAppUrl } from '@/lib/phoneLinks';
import { isSearcherRole } from '@/lib/userRoles';

const CONTACT_KEYS = ['whatsapp', 'facebook', 'viber', 'telegram', 'other'] as const;

function formatTimeDisplay(value?: string) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const [h, m] = raw.split(':');
  if (h == null || m == null) return raw;
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
}

function contactHref(
  key: (typeof CONTACT_KEYS)[number] | 'email' | 'phone',
  value: string
): string | null {
  const v = String(value || '').trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (key === 'email') return `mailto:${v}`;
  if (key === 'phone') {
    const digits = v.replace(/[^\d+]/g, '');
    return digits ? `tel:${digits}` : null;
  }
  if (key === 'whatsapp') return whatsAppUrl(v);
  if (key === 'viber') return viberUrl(v);
  if (key === 'telegram') {
    const handle = v.replace(/^@/, '');
    if (/^[A-Za-z0-9_]{3,}$/.test(handle) && !/^\d+$/.test(handle)) {
      return `https://t.me/${handle}`;
    }
    return telegramWebUrl(v);
  }
  if (key === 'facebook') {
    const handle = v.replace(/^@/, '');
    if (/facebook\.com|fb\.com/i.test(v)) {
      return v.startsWith('http') ? v : `https://${v.replace(/^\/+/, '')}`;
    }
    return `https://www.facebook.com/${encodeURIComponent(handle)}`;
  }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return `mailto:${v}`;
  return null;
}

function ContactValue({
  href,
  children,
}: {
  href: string | null;
  children: React.ReactNode;
}) {
  if (!href) {
    return <span className="break-all font-medium text-slate-800">{children}</span>;
  }
  return (
    <a
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
      className="break-all font-medium text-teal-800 hover:underline"
    >
      {children}
    </a>
  );
}

function AgentServiceInfoCard({ agent }: { agent: SearcherAgentRow }) {
  const { t } = useTranslation();
  const contacts: AgentRequestPrefs['contacts'] = agent.contacts || {
    whatsapp: '',
    facebook: '',
    viber: '',
    telegram: '',
    other: '',
  };
  const time1 = formatTimeDisplay(agent.notifyTime1);
  const time2 = formatTimeDisplay(agent.notifyTime2);
  const socials = CONTACT_KEYS.map((key) => ({
    key,
    label:
      key === 'other'
        ? t('agent_request_contact_other')
        : key === 'whatsapp'
          ? 'WhatsApp'
          : key === 'facebook'
            ? 'Facebook'
            : key === 'viber'
              ? 'Viber'
              : 'Telegram',
    value: String(contacts[key] || '').trim(),
  })).filter((row) => row.value);
  const hasTimes = Boolean(time1 || time2);
  const hasAddresses = Boolean(agent.email || agent.phone);
  const hasInfo = hasTimes || hasAddresses || socials.length > 0;

  return (
    <section className="rounded-xl border border-teal-200 bg-teal-50/40 p-4 shadow-sm">
      <h2 className="text-sm font-bold text-slate-800">{t('searcher_agent_data_title')}</h2>
      <p className="mt-1 text-[11px] leading-snug text-slate-500">
        {t('searcher_agent_service_hint')}
      </p>

      {!hasInfo ? (
        <p className="mt-3 text-sm text-slate-500">{t('searcher_agent_prefs_empty')}</p>
      ) : (
        <>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="min-w-0">
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {t('agent_request_notify_times')}
            </h3>
            {hasTimes ? (
              <dl className="mt-2 grid grid-cols-2 gap-2">
                <div className="rounded-md border border-white bg-white px-2 py-1.5">
                  <dt className="text-[10px] uppercase tracking-wide text-slate-400">
                    {t('agent_request_time_1')}
                  </dt>
                  <dd className="mt-0.5 text-sm font-semibold text-slate-800">
                    {time1 || '—'}
                  </dd>
                </div>
                <div className="rounded-md border border-white bg-white px-2 py-1.5">
                  <dt className="text-[10px] uppercase tracking-wide text-slate-400">
                    {t('agent_request_time_2')}
                  </dt>
                  <dd className="mt-0.5 text-sm font-semibold text-slate-800">
                    {time2 || '—'}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="mt-2 text-sm text-slate-400">—</p>
            )}
          </div>

          <div className="min-w-0">
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {t('searcher_agent_addresses')}
            </h3>
            {hasAddresses ? (
              <dl className="mt-2 space-y-2">
                {agent.email ? (
                  <div className="rounded-md border border-white bg-white px-2 py-1.5">
                    <dt className="text-[10px] uppercase tracking-wide text-slate-400">
                      {t('email')}
                    </dt>
                    <dd className="mt-0.5 text-sm">
                      <ContactValue href={contactHref('email', agent.email)}>
                        {agent.email}
                      </ContactValue>
                    </dd>
                  </div>
                ) : null}
                {agent.phone ? (
                  <div className="rounded-md border border-white bg-white px-2 py-1.5">
                    <dt className="text-[10px] uppercase tracking-wide text-slate-400">
                      {t('phone')}
                    </dt>
                    <dd className="mt-0.5 text-sm">
                      <ContactValue href={contactHref('phone', agent.phone)}>
                        {agent.phone}
                      </ContactValue>
                    </dd>
                  </div>
                ) : null}
              </dl>
            ) : (
              <p className="mt-2 text-sm text-slate-400">—</p>
            )}
          </div>
        </div>

        <div className="mt-4 min-w-0">
          <h3 className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {t('searcher_agent_socials')}
          </h3>
          {socials.length ? (
            <dl className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {socials.map((row) => (
                <div
                  key={row.key}
                  className="min-w-0 rounded-md border border-white bg-white px-2 py-1.5"
                >
                  <dt className="text-[10px] uppercase tracking-wide text-slate-400">
                    {row.label}
                  </dt>
                  <dd className="mt-0.5 text-sm">
                    <ContactValue href={contactHref(row.key, row.value)}>
                      {row.value}
                    </ContactValue>
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-2 text-sm text-slate-400">—</p>
          )}
        </div>
        </>
      )}
    </section>
  );
}

function statusLabel(t: (k: string) => string, status: AgentRequestItem['status']) {
  switch (status) {
    case 'pending':
      return t('agent_request_status_pending');
    case 'processing':
      return t('agent_request_status_processing');
    case 'done':
      return t('agent_request_status_done');
    case 'failed':
      return t('agent_request_status_failed');
    case 'sold':
      return t('agent_request_status_sold');
    default:
      return status;
  }
}

function statusClass(status: AgentRequestItem['status']) {
  switch (status) {
    case 'pending':
      return 'bg-amber-100 text-amber-800';
    case 'processing':
      return 'bg-sky-100 text-sky-800';
    case 'done':
      return 'bg-emerald-100 text-emerald-800';
    case 'failed':
      return 'bg-red-100 text-red-700';
    case 'sold':
      return 'bg-violet-100 text-violet-800';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

export default function SearcherAgentRequestsPage() {
  const { t } = useTranslation();
  const params = useParams();
  const agentUserId = String(params?.agentUserId || '');
  const { user } = useAuth();
  const [hydrated, setHydrated] = useState(false);
  const [agent, setAgent] = useState<SearcherAgentRow | null>(null);
  const [requests, setRequests] = useState<AgentRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replySending, setReplySending] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<{
    requestId: string;
    commentId: string;
  } | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [commentBusy, setCommentBusy] = useState<string | null>(null);

  const canUse = Boolean(user && isSearcherRole(user.role));
  const myId = user?.id ? String(user.id) : '';

  const load = useCallback(async () => {
    if (!agentUserId) return;
    try {
      const res = await listSearcherAgentRequests(agentUserId);
      setAgent(res.agent);
      setRequests(res.requests || []);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('error_load_failed'));
    } finally {
      setLoading(false);
    }
  }, [agentUserId, t]);

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!hydrated || !canUse || !agentUserId) return;
    setLoading(true);
    void load();
  }, [hydrated, canUse, agentUserId, load]);

  const patchRequest = (requestId: string, next: AgentRequestItem) => {
    setRequests((prev) => prev.map((r) => (r.id === requestId ? next : r)));
  };

  const onReply = async (requestId: string) => {
    const body = (replyDrafts[requestId] || '').trim();
    if (!body) return;
    setReplySending(requestId);
    try {
      const res = await addSearcherRequestComment(requestId, body);
      patchRequest(requestId, res.request);
      setReplyDrafts((prev) => ({ ...prev, [requestId]: '' }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('error_save_failed'));
    } finally {
      setReplySending(null);
    }
  };

  const startEditComment = (requestId: string, commentId: string, body: string) => {
    setEditingComment({ requestId, commentId });
    setEditDraft(body);
  };

  const cancelEditComment = () => {
    setEditingComment(null);
    setEditDraft('');
  };

  const saveEditComment = async () => {
    if (!editingComment) return;
    const body = editDraft.trim();
    if (!body) return;
    const key = `${editingComment.requestId}:${editingComment.commentId}`;
    setCommentBusy(key);
    try {
      const res = await updateSearcherRequestComment(
        editingComment.requestId,
        editingComment.commentId,
        body
      );
      patchRequest(editingComment.requestId, res.request);
      cancelEditComment();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('error_save_failed'));
    } finally {
      setCommentBusy(null);
    }
  };

  const onDeleteComment = async (requestId: string, commentId: string) => {
    const key = `${requestId}:${commentId}`;
    setCommentBusy(key);
    try {
      const res = await deleteSearcherRequestComment(requestId, commentId);
      patchRequest(requestId, res.request);
      if (
        editingComment?.requestId === requestId &&
        editingComment?.commentId === commentId
      ) {
        cancelEditComment();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('error_save_failed'));
    } finally {
      setCommentBusy(null);
    }
  };

  if (!hydrated) {
    return <div className="text-sm text-slate-500">Loading…</div>;
  }

  if (!user) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-center">
        <p className="mb-4 text-slate-600">{t('loginRequired')}</p>
        <Link href="/login" className="text-blue-600 hover:underline">
          {t('login')}
        </Link>
      </div>
    );
  }

  if (!canUse) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-center">
        <p className="mb-4 text-slate-600">{t('searcher_only')}</p>
        <Link href="/profile" className="text-blue-600 hover:underline">
          {t('agent_request_back')}
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-800">
            {t('searcher_requests_title')}
            {agent?.name ? ` — ${agent.name}` : ''}
          </h1>
          {agent?.email ? (
            <p className="mt-1 text-sm text-slate-500">{agent.email}</p>
          ) : null}
        </div>
        <Link
          href="/profile"
          className="shrink-0 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          {t('searcher_back_agents')}
        </Link>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {agent ? <AgentServiceInfoCard agent={agent} /> : null}

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-slate-800">
          {t('searcher_agent_listings_title')}
          {!loading && requests.length > 0 ? ` (${requests.length})` : ''}
        </h2>

      {loading ? (
        <p className="text-sm text-slate-500">{t('loading')}</p>
      ) : requests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
          {t('agent_request_empty')}
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((item) => {
            const open = openId === item.id;
            const num = item.requestNumber ?? null;
            return (
              <div
                key={item.id}
                className={`overflow-hidden rounded-xl border bg-white shadow-sm ${
                  item.paused ? 'border-amber-300 opacity-90' : 'border-slate-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : item.id)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50"
                  aria-expanded={open}
                >
                  <span
                    className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200 text-xs text-slate-500 transition-transform ${
                      open ? 'rotate-90' : ''
                    }`}
                    aria-hidden
                  >
                    ▸
                  </span>
                  {num != null ? (
                    <span className="mt-0.5 inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 px-1.5 text-[11px] font-bold text-white">
                      #{num}
                    </span>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusClass(
                          item.status
                        )}`}
                      >
                        {statusLabel(t, item.status)}
                      </span>
                      {item.paused ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                          {t('agent_request_paused_badge')}
                        </span>
                      ) : null}
                      {(item.comments?.length || 0) > 0 ? (
                        <span className="text-[11px] text-slate-500">
                          💬 {item.comments!.length}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 line-clamp-3 text-sm font-medium text-slate-800">
                      {item.prompt}
                    </p>
                  </div>
                </button>

                {open ? (
                  <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3">
                    <p className="mb-3 whitespace-pre-wrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800">
                      {item.prompt}
                    </p>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {t('agent_request_comments')}
                      </p>
                      {(item.comments || []).length === 0 ? (
                        <p className="text-xs text-slate-400">{t('agent_request_no_comments')}</p>
                      ) : (
                        (item.comments || []).map((c) => {
                          const isMine =
                            Boolean(myId) && String(c.authorUserId || '') === myId;
                          const editKey = `${item.id}:${c.id}`;
                          const isEditing =
                            editingComment?.requestId === item.id &&
                            editingComment?.commentId === c.id;
                          return (
                            <div
                              key={c.id || `${c.createdAt}-${c.body.slice(0, 12)}`}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                            >
                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                                <span className="font-semibold text-slate-700">
                                  {c.authorName || t('unknown')}
                                </span>
                                {c.authorRole === 'searcher' ? (
                                  <span className="rounded bg-teal-100 px-1.5 py-0.5 text-[10px] font-medium text-teal-800">
                                    {t('searcher_workspace')}
                                  </span>
                                ) : null}
                                {c.createdAt ? (
                                  <span>{new Date(c.createdAt).toLocaleString('ka-GE')}</span>
                                ) : null}
                                {c.updatedAt ? (
                                  <span className="text-slate-400">
                                    ({t('searcher_comment_edited')})
                                  </span>
                                ) : null}
                              </div>

                              {isEditing ? (
                                <div className="mt-2 space-y-2">
                                  <textarea
                                    value={editDraft}
                                    onChange={(e) => setEditDraft(e.target.value)}
                                    rows={3}
                                    maxLength={2000}
                                    className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30"
                                  />
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      disabled={
                                        commentBusy === editKey || !editDraft.trim()
                                      }
                                      onClick={() => void saveEditComment()}
                                      className="rounded-md bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
                                    >
                                      {commentBusy === editKey
                                        ? '…'
                                        : t('searcher_comment_save')}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={commentBusy === editKey}
                                      onClick={cancelEditComment}
                                      className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                    >
                                      {t('cancel')}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
                                    {c.body}
                                  </p>
                                  {isMine ? (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      <button
                                        type="button"
                                        disabled={commentBusy === editKey}
                                        onClick={() =>
                                          startEditComment(item.id, c.id, c.body)
                                        }
                                        className="text-xs font-medium text-teal-700 hover:underline disabled:opacity-50"
                                      >
                                        {t('searcher_comment_edit')}
                                      </button>
                                      <button
                                        type="button"
                                        disabled={commentBusy === editKey}
                                        onClick={() =>
                                          void onDeleteComment(item.id, c.id)
                                        }
                                        className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                                      >
                                        {commentBusy === editKey
                                          ? '…'
                                          : t('searcher_comment_delete')}
                                      </button>
                                    </div>
                                  ) : null}
                                </>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {!item.paused ? (
                      <div className="mt-3 flex gap-2">
                        <textarea
                          value={replyDrafts[item.id] || ''}
                          onChange={(e) =>
                            setReplyDrafts((prev) => ({
                              ...prev,
                              [item.id]: e.target.value,
                            }))
                          }
                          rows={3}
                          maxLength={2000}
                          placeholder={t('searcher_reply_placeholder')}
                          className="min-w-0 flex-1 resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30"
                        />
                        <button
                          type="button"
                          disabled={
                            replySending === item.id || !(replyDrafts[item.id] || '').trim()
                          }
                          onClick={() => void onReply(item.id)}
                          className="self-end rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
                        >
                          {replySending === item.id ? '…' : t('searcher_reply_send')}
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
      </section>
    </div>
  );
}
