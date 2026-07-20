'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { ABOUT_BY_LANG, pickAboutLang, type AboutContent, type AboutLang } from '@/lib/aboutContent';
import { getApiBase } from '@/lib/config';
import { useAuth } from '@/components/AuthProvider';
import { isAdminRole } from '@/lib/userRoles';

const EDIT_LANGS: { id: AboutLang; label: string }[] = [
  { id: 'ka', label: 'KA' },
  { id: 'en', label: 'EN' },
  { id: 'ru', label: 'RU' },
];

function cloneAbout(src: Record<AboutLang, AboutContent>): Record<AboutLang, AboutContent> {
  return {
    ka: {
      ...src.ka,
      items: src.ka.items.map((it) => ({ ...it })),
    },
    en: {
      ...src.en,
      items: src.en.items.map((it) => ({ ...it })),
    },
    ru: {
      ...src.ru,
      items: src.ru.items.map((it) => ({ ...it })),
    },
  };
}

export function AboutPageClient() {
  const { t, i18n } = useTranslation();
  const { user, profileLoaded } = useAuth();
  const isAdmin = profileLoaded && isAdminRole(user?.role);

  const [mounted, setMounted] = React.useState(false);
  const [byLang, setByLang] = React.useState<Record<AboutLang, AboutContent>>(ABOUT_BY_LANG);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState<Record<AboutLang, AboutContent> | null>(null);
  const [editLang, setEditLang] = React.useState<AboutLang>('ka');
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
        const res = await fetch(`${getApiBase()}/api/content/about`, { cache: 'no-store' });
        if (!res.ok || !alive) return;
        const data = await res.json();
        if (alive && data.byLang?.ka) {
          setByLang({
            ka: data.byLang.ka || ABOUT_BY_LANG.ka,
            en: data.byLang.en || ABOUT_BY_LANG.en,
            ru: data.byLang.ru || ABOUT_BY_LANG.ru,
          });
        }
      } catch {
        /* keep static fallback */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const lang = mounted ? pickAboutLang(i18n.language) : 'ka';
  const c = byLang[lang] || byLang.ka;
  const tx = (key: string, fallback: string) => (mounted ? t(key) : fallback);
  const d = draft?.[editLang];

  const startEdit = () => {
    setDraft(cloneAbout(byLang));
    setEditLang(lang);
    setEditing(true);
    setStatus('');
    setError('');
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft(null);
    setStatus('');
    setError('');
  };

  const patchLang = (patch: Partial<AboutContent>) => {
    if (!draft) return;
    setDraft({
      ...draft,
      [editLang]: { ...draft[editLang], ...patch },
    });
  };

  const updateItem = (index: number, field: 'href' | 'label' | 'desc', value: string) => {
    if (!draft) return;
    const items = draft[editLang].items.map((it, i) =>
      i === index ? { ...it, [field]: value } : it,
    );
    setDraft({ ...draft, [editLang]: { ...draft[editLang], items } });
  };

  const save = async () => {
    if (!draft) return;
    const token = localStorage.getItem('token');
    if (!token) {
      setError('საჭიროა ადმინის ანგარიში');
      return;
    }
    setSaving(true);
    setError('');
    setStatus('');
    try {
      const res = await fetch(`${getApiBase()}/api/admin/content/about`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ byLang: draft }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || 'შენახვა ვერ მოხერხდა');
        return;
      }
      if (data.byLang) {
        setByLang({
          ka: data.byLang.ka || draft.ka,
          en: data.byLang.en || draft.en,
          ru: data.byLang.ru || draft.ru,
        });
      } else {
        setByLang(draft);
      }
      setEditing(false);
      setDraft(null);
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
            {tx('about_nav', 'შესახებ')}
          </li>
        </ol>
      </nav>

      {isAdmin && !editing && (
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={startEdit}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {tx('edit', 'რედაქტირება')}
          </button>
        </div>
      )}

      {isAdmin && editing && d && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/80 p-3 dark:border-blue-900 dark:bg-blue-950/40">
          <div className="flex rounded-lg border border-blue-200 bg-white p-0.5 dark:border-zinc-700 dark:bg-zinc-900">
            {EDIT_LANGS.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setEditLang(l.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                  editLang === l.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:bg-slate-50 dark:text-zinc-300'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={cancelEdit}
              disabled={saving}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900"
            >
              {tx('cancel', 'გაუქმება')}
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {saving ? '...' : tx('save', 'შენახვა')}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {status && !editing && (
        <div className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {status}
        </div>
      )}

      {editing && d ? (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">სათაური</label>
            <input
              value={d.title}
              onChange={(e) => patchLang({ title: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">შესავალი</label>
            <textarea
              value={d.intro}
              onChange={(e) => patchLang({ intro: e.target.value })}
              rows={4}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">სექცია: რას ნახავთ</label>
            <input
              value={d.sectionWhat}
              onChange={(e) => patchLang({ sectionWhat: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">ბმულები</span>
              <button
                type="button"
                onClick={() =>
                  patchLang({
                    items: [...d.items, { href: '/', label: '', desc: '' }],
                  })
                }
                className="rounded border px-2 py-0.5 text-xs"
              >
                + ბმული
              </button>
            </div>
            {d.items.map((item, index) => (
              <div
                key={index}
                className="grid gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2 sm:grid-cols-[1fr_1fr_1.4fr_auto] dark:border-zinc-800 dark:bg-zinc-950"
              >
                <input
                  value={item.href}
                  onChange={(e) => updateItem(index, 'href', e.target.value)}
                  placeholder="/path"
                  className="rounded border px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                />
                <input
                  value={item.label}
                  onChange={(e) => updateItem(index, 'label', e.target.value)}
                  placeholder="ლეიბლი"
                  className="rounded border px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                />
                <input
                  value={item.desc}
                  onChange={(e) => updateItem(index, 'desc', e.target.value)}
                  placeholder="აღწერა"
                  className="rounded border px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                />
                <button
                  type="button"
                  onClick={() =>
                    patchLang({ items: d.items.filter((_, i) => i !== index) })
                  }
                  className="rounded border border-red-200 px-2 text-xs text-red-600"
                >
                  წაშლა
                </button>
              </div>
            ))}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">სექცია: ვისთვისაა</label>
            <input
              value={d.sectionWho}
              onChange={(e) => patchLang({ sectionWho: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">ტექსტი</label>
            <textarea
              value={d.whoBody}
              onChange={(e) => patchLang({ whoBody: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            />
          </div>
        </div>
      ) : (
        <article className="prose prose-slate max-w-none dark:prose-invert">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-amber-400">
            {c.title}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-700 dark:text-zinc-300">{c.intro}</p>

          <h2 className="mt-8 text-xl font-semibold text-slate-900 dark:text-zinc-100">
            {c.sectionWhat}
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-700 dark:text-zinc-300">
            {c.items.map((item) => (
              <li key={`${item.href}-${item.label}`}>
                <Link href={item.href} className="text-blue-600 hover:underline dark:text-amber-400">
                  {item.label}
                </Link>{' '}
                — {item.desc}
              </li>
            ))}
          </ul>

          <h2 className="mt-8 text-xl font-semibold text-slate-900 dark:text-zinc-100">
            {c.sectionWho}
          </h2>
          <p className="mt-3 text-base leading-relaxed text-slate-700 dark:text-zinc-300">{c.whoBody}</p>
        </article>
      )}
    </main>
  );
}
