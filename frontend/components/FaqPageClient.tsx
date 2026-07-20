'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { FAQ_ITEMS, pickFaqLang, type FaqItem, type FaqLang } from '@/lib/faqContent';
import { getApiBase } from '@/lib/config';
import { useAuth } from '@/components/AuthProvider';
import { isAdminRole } from '@/lib/userRoles';

const EDIT_LANGS: { id: FaqLang; label: string }[] = [
  { id: 'ka', label: 'KA' },
  { id: 'en', label: 'EN' },
  { id: 'ru', label: 'RU' },
];

function faqText(lang: FaqLang, map: { ka: string; en: string; ru: string }): string {
  return map[lang] || map.ka;
}

function emptyItem(): FaqItem {
  return {
    id: `faq-${Date.now().toString(36)}`,
    question: { ka: '', en: '', ru: '' },
    answer: { ka: '', en: '', ru: '' },
  };
}

function cloneItems(items: FaqItem[]): FaqItem[] {
  return items.map((it) => ({
    id: it.id,
    question: { ...it.question },
    answer: { ...it.answer },
  }));
}

export function FaqPageClient() {
  const { t, i18n } = useTranslation();
  const { user, profileLoaded } = useAuth();
  const isAdmin = profileLoaded && isAdminRole(user?.role);

  const [mounted, setMounted] = React.useState(false);
  const [items, setItems] = React.useState<FaqItem[]>(FAQ_ITEMS);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState<FaqItem[]>([]);
  const [editLang, setEditLang] = React.useState<FaqLang>('ka');
  const [saving, setSaving] = React.useState(false);
  const [status, setStatus] = React.useState('');
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${getApiBase()}/api/content/faq`, { cache: 'no-store' });
        if (!res.ok || !alive) return;
        const data = await res.json();
        if (alive && Array.isArray(data.items) && data.items.length > 0) {
          setItems(data.items);
        }
      } catch {
        /* keep static fallback */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const lang = mounted ? pickFaqLang(i18n.language) : 'ka';
  const tx = (key: string, fallback: string) => (mounted ? t(key) : fallback);

  const startEdit = () => {
    setDraft(cloneItems(items));
    setEditLang(lang);
    setEditing(true);
    setStatus('');
    setError('');
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft([]);
    setStatus('');
    setError('');
  };

  const updateLocalized = (
    index: number,
    field: 'question' | 'answer',
    value: string,
  ) => {
    setDraft((prev) =>
      prev.map((it, i) =>
        i === index ? { ...it, [field]: { ...it[field], [editLang]: value } } : it,
      ),
    );
  };

  const moveItem = (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= draft.length) return;
    setDraft((prev) => {
      const copy = [...prev];
      const tmp = copy[index];
      copy[index] = copy[next];
      copy[next] = tmp;
      return copy;
    });
  };

  const save = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('საჭიროა ადმინის ანგარიში');
      return;
    }
    setSaving(true);
    setError('');
    setStatus('');
    try {
      const res = await fetch(`${getApiBase()}/api/admin/content/faq`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items: draft }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || 'შენახვა ვერ მოხერხდა');
        return;
      }
      const next = Array.isArray(data.items) ? data.items : draft;
      setItems(next);
      setEditing(false);
      setDraft([]);
      setStatus(tx('save', 'შენახვა') + ' ✓');
    } catch {
      setError('სერვერთან კავშირი ვერ მოხერხდა');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 text-slate-900 dark:text-zinc-100">
      <nav aria-label="breadcrumb" className="mb-6 text-sm text-slate-500 dark:text-zinc-400">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-blue-600 dark:hover:text-amber-400">
              {tx('breadcrumb_home', 'მთავარი')}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="font-medium text-slate-800 dark:text-zinc-200">
            {tx('faq_nav', 'FAQ')}
          </li>
        </ol>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-amber-400">
            {tx('faq_page_title', 'ხშირად დასმული კითხვები')}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-slate-600 dark:text-zinc-300">
            {tx(
              'faq_page_intro',
              'მოკლე პასუხები VR Georgia-ს გამოყენებაზე — ძიება, აგენტები, ვირტუალური ტურები და განცხადებები.',
            )}
          </p>
        </div>
        {isAdmin && !editing && (
          <button
            type="button"
            onClick={startEdit}
            className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {tx('edit', 'რედაქტირება')}
          </button>
        )}
      </div>

      {isAdmin && editing && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/80 p-3 dark:border-blue-900 dark:bg-blue-950/40">
          <div className="flex rounded-lg border border-blue-200 bg-white p-0.5 dark:border-zinc-700 dark:bg-zinc-900">
            {EDIT_LANGS.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setEditLang(l.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                  editLang === l.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:bg-slate-50 dark:text-zinc-300 dark:hover:bg-zinc-800'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setDraft((prev) => [...prev, emptyItem()])}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
          >
            + პუნქტი
          </button>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={cancelEdit}
              disabled={saving}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
            >
              {tx('cancel', 'გაუქმება')}
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? '...' : tx('save', 'შენახვა')}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}
      {status && !editing && (
        <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300">
          {status}
        </div>
      )}

      <div className="mt-8 space-y-4">
        {editing
          ? draft.map((item, index) => (
              <div
                key={`${item.id}-${index}`}
                className="rounded-xl border border-slate-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400">{index + 1}</span>
                  <input
                    value={item.id}
                    onChange={(e) =>
                      setDraft((prev) =>
                        prev.map((it, i) => (i === index ? { ...it, id: e.target.value } : it)),
                      )
                    }
                    className="min-w-0 flex-1 rounded border border-slate-200 px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-950"
                    placeholder="id"
                  />
                  <button
                    type="button"
                    onClick={() => moveItem(index, -1)}
                    disabled={index === 0}
                    className="rounded border px-2 py-0.5 text-xs disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveItem(index, 1)}
                    disabled={index === draft.length - 1}
                    className="rounded border px-2 py-0.5 text-xs disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraft((prev) => prev.filter((_, i) => i !== index))}
                    className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-600"
                  >
                    წაშლა
                  </button>
                </div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  კითხვა ({editLang.toUpperCase()})
                </label>
                <input
                  value={item.question[editLang]}
                  onChange={(e) => updateLocalized(index, 'question', e.target.value)}
                  className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                />
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  პასუხი ({editLang.toUpperCase()})
                </label>
                <textarea
                  value={item.answer[editLang]}
                  onChange={(e) => updateLocalized(index, 'answer', e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                />
              </div>
            ))
          : items.map((item) => (
              <details
                key={item.id}
                id={item.id}
                className="group rounded-xl border border-slate-200 bg-white open:shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                <summary className="cursor-pointer list-none px-4 py-3.5 text-left text-base font-semibold text-slate-900 marker:content-none dark:text-zinc-100 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-start justify-between gap-3">
                    <span>{faqText(lang, item.question)}</span>
                    <span className="shrink-0 text-slate-400 transition group-open:rotate-180">▼</span>
                  </span>
                </summary>
                <div className="border-t border-slate-100 px-4 py-3 text-sm leading-relaxed text-slate-700 dark:border-zinc-800 dark:text-zinc-300">
                  <p>{faqText(lang, item.answer)}</p>
                </div>
              </details>
            ))}
      </div>

      {!editing && (
        <p className="mt-10 text-sm text-slate-500 dark:text-zinc-400">
          {tx('faq_page_more', 'მეტი ინფორმაცია:')}{' '}
          <Link href="/about" className="text-blue-600 hover:underline dark:text-amber-400">
            {tx('about_page_about_link', 'საიტის შესახებ')}
          </Link>
          {' · '}
          <Link href="/map" className="text-blue-600 hover:underline dark:text-amber-400">
            {tx('faq_link_map', 'რუკაზე ძებნა')}
          </Link>
          {' · '}
          <Link href="/agents" className="text-blue-600 hover:underline dark:text-amber-400">
            {tx('agents', 'აგენტები')}
          </Link>
        </p>
      )}
    </main>
  );
}
