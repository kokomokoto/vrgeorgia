'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/components/AuthProvider';
import {
  addAgentRequestComment,
  createAgentRequests,
  deleteAgentRequest,
  getAgentRequestPrefs,
  listAgentRequests,
  listPublicAgentRequests,
  markAgentRequestRead,
  pauseAgentRequest,
  resumeAgentRequest,
  saveAgentRequestPrefs,
  setAgentRequestVisibility,
  type AgentRequestItem,
  type AgentRequestPrefs,
} from '@/lib/api';
import { isAdminRole } from '@/lib/userRoles';

type DraftRow = { key: string; text: string };

function newDraftKey() {
  return `d-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

const EMPTY_PREFS: AgentRequestPrefs = {
  notifyTime1: '',
  notifyTime2: '',
  contacts: { whatsapp: '', facebook: '', viber: '', telegram: '', other: '' },
};

function prefsAreFilled(p: AgentRequestPrefs | null | undefined) {
  if (!p) return false;
  if (p.notifyTime1 || p.notifyTime2) return true;
  const c = p.contacts || EMPTY_PREFS.contacts;
  return Boolean(c.whatsapp || c.facebook || c.viber || c.telegram || c.other);
}

function formatTimeDisplay(value: string) {
  const raw = String(value || '').trim();
  if (!raw) return '—';
  const [h, m] = raw.split(':');
  if (h == null || m == null) return raw;
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
}

export default function AgentRequestsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [hydrated, setHydrated] = useState(false);
  const [drafts, setDrafts] = useState<DraftRow[]>([{ key: newDraftKey(), text: '' }]);
  const [requests, setRequests] = useState<AgentRequestItem[]>([]);
  const [publicRequests, setPublicRequests] = useState<AgentRequestItem[]>([]);
  const [prefs, setPrefs] = useState<AgentRequestPrefs>(EMPTY_PREFS);
  const [prefsDraft, setPrefsDraft] = useState<AgentRequestPrefs>(EMPTY_PREFS);
  const [prefsEditing, setPrefsEditing] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsFlash, setPrefsFlash] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentSending, setCommentSending] = useState<string | null>(null);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [listTab, setListTab] = useState<'own' | 'public'>('own');

  const canUse = Boolean(user?.agentRequestFeatureEnabled);
  const contactsEditable = Boolean(user && (isAdminRole(user.role) || canUse));
  const prefsFilled = prefsAreFilled(prefs);

  const applyPrefs = useCallback((next: AgentRequestPrefs) => {
    const safe = next || EMPTY_PREFS;
    setPrefs(safe);
    setPrefsDraft(safe);
    setPrefsEditing(!prefsAreFilled(safe));
  }, []);

  const load = useCallback(async () => {
    const errors: string[] = [];
    try {
      const prefRes = await getAgentRequestPrefs();
      applyPrefs(prefRes.prefs || EMPTY_PREFS);
    } catch (err: unknown) {
      errors.push(err instanceof Error ? err.message : t('error_load_failed'));
    }
    try {
      const [ownRes, publicRes] = await Promise.all([
        listAgentRequests(),
        listPublicAgentRequests(),
      ]);
      setRequests(ownRes.requests || []);
      setPublicRequests(publicRes.requests || []);
    } catch (err: unknown) {
      errors.push(err instanceof Error ? err.message : t('error_load_failed'));
    }
    setError(errors.length ? errors[0] : null);
    setLoading(false);
  }, [applyPrefs, t]);

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!hydrated || !user || !canUse) return;
    setLoading(true);
    void load();
  }, [hydrated, user, canUse, load]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const prompts = drafts.map((d) => d.text.trim()).filter((p) => p.length >= 5);
    if (!prompts.length) return;
    setSending(true);
    setError(null);
    try {
      const res = await createAgentRequests(prompts);
      setDrafts([{ key: newDraftKey(), text: '' }]);
      setRequests((prev) => [...(res.requests || []), ...prev]);
      if (res.requests?.[0]?.id) setOpenId(res.requests[0].id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('error_save_failed'));
    } finally {
      setSending(false);
    }
  };

  const startEditPrefs = () => {
    setPrefsDraft(prefs);
    setPrefsEditing(true);
  };

  const cancelEditPrefs = () => {
    setPrefsDraft(prefs);
    setPrefsEditing(!prefsAreFilled(prefs));
  };

  const onSavePrefs = async (e: React.FormEvent) => {
    e.preventDefault();
    setPrefsSaving(true);
    setError(null);
    try {
      const res = await saveAgentRequestPrefs(prefsDraft);
      applyPrefs(res.prefs);
      setPrefsFlash(true);
      window.setTimeout(() => setPrefsFlash(false), 1600);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('error_save_failed'));
    } finally {
      setPrefsSaving(false);
    }
  };

  const onClearPrefs = async () => {
    if (!window.confirm(t('agent_request_prefs_clear_confirm'))) return;
    setPrefsSaving(true);
    setError(null);
    try {
      const res = await saveAgentRequestPrefs(EMPTY_PREFS);
      applyPrefs(res.prefs);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('error_save_failed'));
    } finally {
      setPrefsSaving(false);
    }
  };

  const toggleOpen = async (item: AgentRequestItem, isOwn: boolean) => {
    const next = openId === item.id ? null : item.id;
    setOpenId(next);
    if (next && isOwn && item.unread) {
      try {
        const res = await markAgentRequestRead(item.id);
        setRequests((prev) => prev.map((r) => (r.id === item.id ? res.request : r)));
      } catch {
        /* ignore */
      }
    }
  };

  const onAddComment = async (requestId: string) => {
    const body = (commentDrafts[requestId] || '').trim();
    if (!body) return;
    setCommentSending(requestId);
    try {
      const res = await addAgentRequestComment(requestId, body);
      setRequests((prev) => prev.map((r) => (r.id === requestId ? res.request : r)));
      setPublicRequests((prev) =>
        prev.map((r) => (r.id === requestId ? res.request : r))
      );
      setCommentDrafts((prev) => ({ ...prev, [requestId]: '' }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('error_save_failed'));
    } finally {
      setCommentSending(null);
    }
  };

  const onPauseToggle = async (item: AgentRequestItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActionBusyId(item.id);
    setError(null);
    try {
      const res = item.paused
        ? await resumeAgentRequest(item.id)
        : await pauseAgentRequest(item.id);
      setRequests((prev) => prev.map((r) => (r.id === item.id ? res.request : r)));
      setPublicRequests((prev) =>
        prev.map((r) => (r.id === item.id ? res.request : r))
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('error_save_failed'));
    } finally {
      setActionBusyId(null);
    }
  };

  const onVisibilityToggle = async (item: AgentRequestItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActionBusyId(item.id);
    setError(null);
    try {
      const nextPublic = !item.isPublic;
      const res = await setAgentRequestVisibility(item.id, nextPublic);
      const updated = res.request;
      setRequests((prev) => prev.map((r) => (r.id === item.id ? updated : r)));
      setPublicRequests((prev) => {
        if (nextPublic) {
          const without = prev.filter((r) => r.id !== item.id);
          return [updated, ...without];
        }
        return prev.filter((r) => r.id !== item.id);
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('error_save_failed'));
    } finally {
      setActionBusyId(null);
    }
  };

  const onDelete = async (item: AgentRequestItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirmDeleteId !== item.id) {
      setConfirmDeleteId(item.id);
      return;
    }
    setActionBusyId(item.id);
    setError(null);
    try {
      await deleteAgentRequest(item.id);
      setRequests((prev) => prev.filter((r) => r.id !== item.id));
      setPublicRequests((prev) => prev.filter((r) => r.id !== item.id));
      if (openId === item.id) setOpenId(null);
      setConfirmDeleteId(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('error_save_failed'));
    } finally {
      setActionBusyId(null);
    }
  };

  const renderRequestCard = (
    item: AgentRequestItem,
    isOwn: boolean,
    opts?: { showAuthor?: boolean }
  ) => {
    const open = openId === item.id;
    const num = item.requestNumber ?? null;
    const showAuthor = Boolean(opts?.showAuthor);
    const authorName = String(item.agentName || item.agentEmail || '').trim();
    return (
      <div
        key={item.id}
        className={`overflow-hidden rounded-xl border bg-white shadow-sm ${
          item.paused ? 'border-amber-300 opacity-90' : 'border-slate-200'
        }`}
      >
        <div className="flex items-start gap-2 px-4 py-3">
          <button
            type="button"
            onClick={() => void toggleOpen(item, isOwn)}
            className="flex min-w-0 flex-1 items-start gap-3 text-left hover:opacity-90"
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
                {isOwn ? (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      item.isPublic
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.isPublic
                      ? t('agent_request_public_badge')
                      : t('agent_request_private_badge')}
                  </span>
                ) : item.isOwner ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                    {t('agent_request_mine_badge')}
                  </span>
                ) : null}
                {item.paused ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                    {t('agent_request_paused_badge')}
                  </span>
                ) : null}
                {item.unread ? (
                  <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                    {t('agent_request_new_badge')}
                  </span>
                ) : null}
                {(item.comments?.length || 0) > 0 ? (
                  <span className="text-[11px] text-slate-500">
                    💬 {item.comments!.length}
                  </span>
                ) : null}
              </div>
              {showAuthor ? (
                <p className="mt-1.5 text-sm font-semibold text-slate-700">
                  {t('agent_request_by_agent', {
                    name: authorName || t('unknown'),
                  })}
                </p>
              ) : null}
              <p className="mt-1 line-clamp-2 text-sm font-medium text-slate-800">
                {item.prompt}
              </p>
              {!open && (item.comments?.length || 0) > 0 ? (
                <p className="mt-1 line-clamp-1 text-xs text-emerald-700">
                  {item.comments![item.comments!.length - 1]?.body}
                </p>
              ) : null}
            </div>
          </button>
          {isOwn ? (
            <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
              <button
                type="button"
                disabled={actionBusyId === item.id}
                onClick={(e) => void onVisibilityToggle(item, e)}
                className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold disabled:opacity-50 ${
                  item.isPublic
                    ? 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    : 'border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100'
                }`}
              >
                {item.isPublic
                  ? t('agent_request_make_private')
                  : t('agent_request_make_public')}
              </button>
              <button
                type="button"
                disabled={actionBusyId === item.id}
                onClick={(e) => void onPauseToggle(item, e)}
                className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
              >
                {item.paused
                  ? t('agent_request_resume')
                  : t('agent_request_pause')}
              </button>
              <button
                type="button"
                disabled={actionBusyId === item.id}
                onClick={(e) => void onDelete(item, e)}
                className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold disabled:opacity-50 ${
                  confirmDeleteId === item.id
                    ? 'border-red-600 bg-red-600 text-white hover:bg-red-700'
                    : 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
                }`}
              >
                {confirmDeleteId === item.id
                  ? t('agent_request_delete_confirm')
                  : t('agent_request_delete')}
              </button>
            </div>
          ) : null}
        </div>

        {open ? (
          <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3">
            {item.status === 'pending' || item.status === 'processing' ? (
              <p className="mb-3 text-sm text-slate-500">
                {t('agent_request_status_pending')}…
              </p>
            ) : null}

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t('agent_request_comments')}
              </p>
              <div className="space-y-2">
                {(item.comments || []).length === 0 ? (
                  <p className="text-xs text-slate-400">
                    {t('agent_request_no_comments')}
                  </p>
                ) : (
                  (item.comments || []).map((c) => (
                    <div
                      key={c.id || `${c.createdAt}-${c.body.slice(0, 12)}`}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-700">
                          {c.authorName || t('unknown')}
                        </span>
                        {c.createdAt ? (
                          <span>
                            {new Date(c.createdAt).toLocaleString('ka-GE')}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
                        {c.body}
                      </p>
                    </div>
                  ))
                )}
              </div>
              {isOwn ? (
                <div className="mt-3 flex gap-2">
                  <textarea
                    value={commentDrafts[item.id] || ''}
                    onChange={(e) =>
                      setCommentDrafts((prev) => ({
                        ...prev,
                        [item.id]: e.target.value,
                      }))
                    }
                    rows={2}
                    maxLength={2000}
                    placeholder={t('agent_request_comment_placeholder')}
                    className="min-w-0 flex-1 resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                  />
                  <button
                    type="button"
                    disabled={
                      commentSending === item.id ||
                      !(commentDrafts[item.id] || '').trim()
                    }
                    onClick={() => void onAddComment(item.id)}
                    className="self-end rounded-md bg-slate-800 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
                  >
                    {commentSending === item.id
                      ? '…'
                      : t('agent_request_comment_send')}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    );
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
        <p className="mb-4 text-slate-600">{t('agent_request_agents_only')}</p>
        <Link href="/profile" className="text-blue-600 hover:underline">
          {t('agent_request_back')}
        </Link>
      </div>
    );
  }

  const readyToSend = drafts.some((d) => d.text.trim().length >= 5);

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-800">{t('agent_requests_title')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('agent_requests_subtitle')}</p>
        </div>
        <Link
          href="/profile"
          className="shrink-0 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          {t('agent_request_back')}
        </Link>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
        {/* მარცხენა პანელი: დროები + საკონტაქტო არხები */}
        <aside className="space-y-4">
          {!prefsEditing && prefsFilled ? (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[11px] leading-snug text-emerald-700">
                {t('agent_request_prefs_locked_hint')}
              </p>
              <div>
                <h2 className="text-sm font-bold text-slate-800">
                  {t('agent_request_notify_times')}
                </h2>
                <dl className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div className="rounded-md border border-slate-100 bg-slate-50 px-2 py-1.5">
                    <dt className="text-[10px] uppercase tracking-wide text-slate-400">
                      {t('agent_request_time_1')}
                    </dt>
                    <dd className="mt-0.5 text-sm font-semibold text-slate-800">
                      {formatTimeDisplay(prefs.notifyTime1)}
                    </dd>
                  </div>
                  <div className="rounded-md border border-slate-100 bg-slate-50 px-2 py-1.5">
                    <dt className="text-[10px] uppercase tracking-wide text-slate-400">
                      {t('agent_request_time_2')}
                    </dt>
                    <dd className="mt-0.5 text-sm font-semibold text-slate-800">
                      {formatTimeDisplay(prefs.notifyTime2)}
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="border-t border-slate-100 pt-3">
                <h2 className="text-sm font-bold text-slate-800">
                  {t('agent_request_contacts_title')}
                </h2>
                <dl className="mt-2 space-y-2 text-xs text-slate-600">
                  {(
                    [
                      ['whatsapp', 'WhatsApp'],
                      ['facebook', 'Facebook'],
                      ['viber', 'Viber'],
                      ['telegram', 'Telegram'],
                      ['other', t('agent_request_contact_other')],
                    ] as const
                  ).map(([key, label]) => (
                    <div
                      key={key}
                      className="rounded-md border border-slate-100 bg-slate-50 px-2 py-1.5"
                    >
                      <dt className="text-[10px] uppercase tracking-wide text-slate-400">
                        {label}
                      </dt>
                      <dd className="mt-0.5 break-all text-sm font-medium text-slate-800">
                        {prefs.contacts[key] || '—'}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={startEditPrefs}
                  className="w-full rounded-md bg-slate-800 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-900"
                >
                  {t('edit')}
                </button>
                <button
                  type="button"
                  disabled={prefsSaving}
                  onClick={() => void onClearPrefs()}
                  className="w-full rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  {prefsSaving ? t('saving') : t('agent_request_prefs_clear')}
                </button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={onSavePrefs}
              className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div>
                <h2 className="text-sm font-bold text-slate-800">
                  {t('agent_request_notify_times')}
                </h2>
                <p className="mt-1 text-[11px] leading-snug text-slate-500">
                  {t('agent_request_notify_times_hint')}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-xs text-slate-600">
                  {t('agent_request_time_1')}
                  <input
                    type="time"
                    value={prefsDraft.notifyTime1}
                    onChange={(e) =>
                      setPrefsDraft((p) => ({ ...p, notifyTime1: e.target.value }))
                    }
                    className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="block text-xs text-slate-600">
                  {t('agent_request_time_2')}
                  <input
                    type="time"
                    value={prefsDraft.notifyTime2}
                    onChange={(e) =>
                      setPrefsDraft((p) => ({ ...p, notifyTime2: e.target.value }))
                    }
                    className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  />
                </label>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <h2 className="text-sm font-bold text-slate-800">
                  {t('agent_request_contacts_title')}
                </h2>
                <p className="mt-1 text-[11px] leading-snug text-slate-500">
                  {t('agent_request_contacts_hint')}
                </p>
                <div className="mt-3 space-y-2">
                  {(
                    [
                      ['whatsapp', 'WhatsApp'],
                      ['facebook', 'Facebook'],
                      ['viber', 'Viber'],
                      ['telegram', 'Telegram'],
                      ['other', t('agent_request_contact_other')],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="block text-xs text-slate-600">
                      {label}
                      <input
                        type="text"
                        disabled={!contactsEditable}
                        value={prefsDraft.contacts[key]}
                        onChange={(e) =>
                          setPrefsDraft((p) => ({
                            ...p,
                            contacts: { ...p.contacts, [key]: e.target.value },
                          }))
                        }
                        placeholder={
                          key === 'whatsapp'
                            ? '+9955…'
                            : key === 'telegram'
                              ? '@username'
                              : 'https://…'
                        }
                        className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-50"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={prefsSaving}
                  className="w-full rounded-md bg-slate-800 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
                >
                  {prefsFlash
                    ? t('agent_request_prefs_saved')
                    : prefsSaving
                      ? t('saving')
                      : t('save')}
                </button>
                {prefsFilled ? (
                  <button
                    type="button"
                    disabled={prefsSaving}
                    onClick={cancelEditPrefs}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {t('cancel')}
                  </button>
                ) : null}
              </div>
            </form>
          )}
        </aside>

        {/* მთავარი სვეტი: მოთხოვნები სრული სიგანით */}
        <div className="min-w-0 space-y-6">
          <form
            onSubmit={onSubmit}
            className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-800">{t('agent_request')}</h2>
              <button
                type="button"
                onClick={() =>
                  setDrafts((prev) => [...prev, { key: newDraftKey(), text: '' }])
                }
                className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
              >
                + {t('agent_request_add_field')}
              </button>
            </div>

            <div className="space-y-4">
              {drafts.map((row, idx) => (
                <div
                  key={row.key}
                  className="rounded-lg border border-slate-200 bg-slate-50/50 p-3"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-emerald-600 px-2 text-xs font-bold text-white">
                      #{idx + 1}
                    </span>
                    {drafts.length > 1 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setDrafts((prev) => prev.filter((d) => d.key !== row.key))
                        }
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        {t('delete')}
                      </button>
                    ) : null}
                  </div>
                  <textarea
                    value={row.text}
                    onChange={(e) =>
                      setDrafts((prev) =>
                        prev.map((d) =>
                          d.key === row.key ? { ...d, text: e.target.value } : d
                        )
                      )
                    }
                    rows={3}
                    maxLength={4000}
                    placeholder={t('agent_request_placeholder')}
                    className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2"
                  />
                  <div className="mt-1 text-right text-[11px] text-slate-400">
                    {row.text.trim().length}/4000
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={sending || !readyToSend}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? t('agent_request_sending') : t('agent_request_submit')}
              </button>
            </div>
          </form>

          <section className="space-y-3">
            <div
              className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
              role="tablist"
              aria-label={t('agent_requests_title')}
            >
              <button
                type="button"
                role="tab"
                aria-selected={listTab === 'own'}
                onClick={() => setListTab('own')}
                className={`min-w-0 flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  listTab === 'own'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {t('agent_request_own_section')}
                {!loading ? (
                  <span
                    className={`ml-1.5 text-xs font-medium ${
                      listTab === 'own' ? 'text-slate-300' : 'text-slate-400'
                    }`}
                  >
                    ({requests.length})
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={listTab === 'public'}
                onClick={() => setListTab('public')}
                className={`min-w-0 flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  listTab === 'public'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {t('agent_request_public_section')}
                {!loading ? (
                  <span
                    className={`ml-1.5 text-xs font-medium ${
                      listTab === 'public' ? 'text-slate-300' : 'text-slate-400'
                    }`}
                  >
                    ({publicRequests.length})
                  </span>
                ) : null}
              </button>
            </div>

            {loading ? (
              <p className="text-sm text-slate-500">{t('loading')}</p>
            ) : listTab === 'own' ? (
              requests.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
                  {t('agent_request_empty')}
                </div>
              ) : (
                <div className="space-y-3">
                  {requests.map((item) => renderRequestCard(item, true))}
                </div>
              )
            ) : publicRequests.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
                {t('agent_request_public_empty')}
              </div>
            ) : (
              <div className="space-y-3">
                {publicRequests.map((item) =>
                  renderRequestCard(item, Boolean(item.isOwner), {
                    showAuthor: true,
                  })
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
