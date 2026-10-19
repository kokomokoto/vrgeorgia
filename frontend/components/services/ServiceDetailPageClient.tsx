'use client';

import React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { getApiBase } from '@/lib/config';
import { uploadServicesMediaFile } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { isAdminRole } from '@/lib/userRoles';
import {
  SERVICE_SECTION_STYLE,
  resolveServiceStyleKey,
} from '@/lib/servicesCatalog';
import {
  DEFAULT_SERVICES_CONTENT,
  SERVICE_STYLE_KEYS,
  cloneServicesContent,
  normalizeServiceSection,
  pickServicesLang,
  servicePath,
  servicesText,
  toServicesApiPayload,
  type ServiceSection,
  type ServicesLang,
  type ServicesPageContent,
} from '@/lib/servicesContent';
import {
  ServiceSectionIcon,
  ServiceSectionVisualAccent,
} from '@/components/services/ServiceSectionVisuals';

const EDIT_LANGS: { id: ServicesLang; label: string }[] = [
  { id: 'ka', label: 'KA' },
  { id: 'en', label: 'EN' },
  { id: 'ru', label: 'RU' },
];

const STYLE_LABELS: Record<string, string> = {
  arch: 'Amber',
  docs: 'Blue',
  planning: 'Teal',
  interior: 'Rose',
  landscape: 'Green',
  vis: 'Violet',
  heritage: 'Stone',
  consult: 'Cyan',
};

export function ServiceDetailPageClient() {
  const { t, i18n } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const slug = typeof params?.slug === 'string' ? params.slug : '';
  const { user, profileLoaded } = useAuth();
  const isAdmin = profileLoaded && isAdminRole(user?.role);

  const [mounted, setMounted] = React.useState(false);
  const [content, setContent] = React.useState<ServicesPageContent>(DEFAULT_SERVICES_CONTENT);
  const [loaded, setLoaded] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState<ServicesPageContent | null>(null);
  const [editLang, setEditLang] = React.useState<ServicesLang>('ka');
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [status, setStatus] = React.useState('');
  const [error, setError] = React.useState('');
  const [editIndex, setEditIndex] = React.useState(-1);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const applyPayload = React.useCallback((data: ServicesPageContent) => {
    if (!data?.page || !Array.isArray(data.sections) || data.sections.length === 0) return;
    setContent({
      page: data.page,
      sections: data.sections.map((s) =>
        normalizeServiceSection({
          ...s,
          styleKey: resolveServiceStyleKey(String(s.styleKey || 'arch')),
        })
      ),
      updatedAt: data.updatedAt ?? null,
    });
  }, []);

  React.useEffect(() => {
    if (!profileLoaded) return;
    let alive = true;
    (async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const useAdmin = Boolean(isAdmin && token);
        const res = await fetch(
          `${getApiBase()}/api/${useAdmin ? 'admin/' : ''}content/services`,
          {
            cache: 'no-store',
            headers: useAdmin && token ? { Authorization: `Bearer ${token}` } : undefined,
          }
        );
        if (res.ok && alive) {
          const data = await res.json();
          applyPayload(data);
        }
      } catch {
        /* keep defaults */
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [profileLoaded, isAdmin, applyPayload]);

  const lang = mounted ? pickServicesLang(i18n.language) : 'ka';
  const tx = (key: string, fallback: string) => (mounted ? t(key) : fallback);

  const view = editing && draft ? draft : content;
  const indexBySlug = view.sections.findIndex((s) => s.id === slug);
  const index =
    editing && editIndex >= 0 && editIndex < view.sections.length ? editIndex : indexBySlug;
  const section = index >= 0 ? view.sections[index] : null;
  const visibleForNav = content.sections.filter((s) => !s.hidden || isAdmin);
  const navIndex = !editing && section ? visibleForNav.findIndex((s) => s.id === section.id) : -1;
  const prev = navIndex > 0 ? visibleForNav[navIndex - 1] : null;
  const next =
    navIndex >= 0 && navIndex < visibleForNav.length - 1 ? visibleForNav[navIndex + 1] : null;

  const startEdit = () => {
    const i = content.sections.findIndex((s) => s.id === slug);
    if (i < 0) return;
    setDraft(cloneServicesContent(content));
    setEditIndex(i);
    setEditLang(lang);
    setEditing(true);
    setStatus('');
    setError('');
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft(null);
    setEditIndex(-1);
    setStatus('');
    setError('');
  };

  const updateCurrent = (
    patch: Partial<ServiceSection> | ((section: ServiceSection) => ServiceSection)
  ) => {
    setDraft((prev) => {
      if (!prev || editIndex < 0 || editIndex >= prev.sections.length) return prev;
      return {
        ...prev,
        sections: prev.sections.map((it, idx) => {
          if (idx !== editIndex) return it;
          return typeof patch === 'function' ? patch(it) : { ...it, ...patch };
        }),
      };
    });
  };

  const uploadPhoto = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('მხოლოდ სურათის ატვირთვაა დაშვებული');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const result = await uploadServicesMediaFile(file);
      if (!result?.url) {
        setError('ფოტოს ატვირთვა ვერ მოხერხდა');
        return;
      }
      updateCurrent({ imageUrl: result.url });
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message?: string }).message)
          : 'ფოტოს ატვირთვა ვერ მოხერხდა';
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!draft || editIndex < 0) return;
    const token = localStorage.getItem('token');
    if (!token) {
      setError('საჭიროა ადმინის ანგარიში');
      return;
    }
    const currentDraftSection = draft.sections[editIndex];
    if (!currentDraftSection) {
      setError('სერვისი ვერ მოიძებნა');
      return;
    }
    if (!currentDraftSection.hidden) {
      if (!currentDraftSection.title.ka.trim() || !currentDraftSection.body.ka.trim()) {
        setError('გამოქვეყნებულ მომსახურებას სჭირდება ქართული სათაური და ტექსტი');
        return;
      }
    }

    setSaving(true);
    setError('');
    setStatus('');
    try {
      const res = await fetch(`${getApiBase()}/api/admin/content/services`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(toServicesApiPayload(draft)),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || 'შენახვა ვერ მოხერხდა');
        return;
      }
      const next: ServicesPageContent = {
        page: data.page || draft.page,
        sections: Array.isArray(data.sections)
          ? data.sections.map((s: ServiceSection) => normalizeServiceSection(s))
          : draft.sections.map((s) => {
              const { editKey: _k, ...rest } = s;
              return rest;
            }),
        updatedAt: data.updatedAt ?? null,
      };
      setContent(next);
      setEditing(false);
      setDraft(null);
      setEditIndex(-1);
      setStatus(tx('save', 'შენახვა') + ' ✓');

      const newId = currentDraftSection.id.trim();
      if (newId && newId !== slug) {
        router.replace(servicePath(newId));
      }
    } catch {
      setError('სერვერთან კავშირი ვერ მოხერხდა');
    } finally {
      setSaving(false);
    }
  };

  if (loaded && !section) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-50">
          სერვისი ვერ მოიძებნა
        </h1>
        <p className="mt-3 text-slate-600 dark:text-zinc-400">
          ეს მომსახურების გვერდი აღარ არსებობს, დამალულია ან გადატანილია.
        </p>
        <Link
          href="/services"
          className="mt-6 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          ← {tx('services_back', 'ყველა მომსახურება')}
        </Link>
      </div>
    );
  }

  if (!section) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-500">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  const editingSection =
    editing && draft && editIndex >= 0 ? draft.sections[editIndex] || section : section;
  const st = SERVICE_SECTION_STYLE[resolveServiceStyleKey(editingSection.styleKey)];
  const imageUrl = (editingSection.imageUrl || '').trim();

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-gradient-to-b from-slate-50 via-white to-amber-50/40 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.12]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2394a3b8' fill-opacity='0.2'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-3xl px-4 py-10 md:py-14">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/services"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            ← {tx('services_back', 'ყველა მომსახურება')}
          </Link>
          {isAdmin && !editing && (
            <button
              type="button"
              onClick={startEdit}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {tx('edit', 'რედაქტირება')}
            </button>
          )}
        </div>

        {isAdmin && editing && (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/95 p-3 shadow-sm dark:border-blue-900 dark:bg-blue-950/90">
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
                disabled={saving || uploading}
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? '...' : tx('save', 'შენახვა')}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}
        {status && !editing && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300">
            {status}
          </div>
        )}

        <article
          className={`overflow-hidden rounded-3xl border bg-white/90 shadow-xl shadow-slate-200/30 backdrop-blur-sm dark:bg-zinc-900/70 dark:shadow-black/30 ${
            editingSection.hidden
              ? 'border-amber-300/80 dark:border-amber-700/60'
              : 'border-slate-200/90 dark:border-zinc-700/90'
          }`}
        >
          <div className={`h-2 w-full bg-gradient-to-r ${st.stripe}`} aria-hidden />
          {!editing && imageUrl ? (
            <div className="relative h-48 w-full overflow-hidden bg-slate-100 sm:h-64 dark:bg-zinc-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="" className="h-full w-full object-cover" />
            </div>
          ) : null}

          <div className="p-6 md:p-10">
            {editing && editingSection.hidden && (
              <div className="mb-4 inline-flex rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                დამალული — საიტზე არ ჩანს
              </div>
            )}

            {editing ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={editingSection.id}
                    onChange={(e) => updateCurrent({ id: e.target.value })}
                    className="min-w-0 flex-1 rounded border border-slate-200 px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-950"
                    placeholder="slug / id"
                  />
                  <select
                    value={editingSection.styleKey}
                    onChange={(e) =>
                      updateCurrent({
                        styleKey: resolveServiceStyleKey(e.target.value),
                      })
                    }
                    className="rounded border border-slate-200 px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-950"
                  >
                    {SERVICE_STYLE_KEYS.map((key) => (
                      <option key={key} value={key}>
                        {STYLE_LABELS[key] || key}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1 text-xs text-slate-600 dark:text-zinc-300">
                    <input
                      type="checkbox"
                      checked={editingSection.featured}
                      onChange={(e) => updateCurrent({ featured: e.target.checked })}
                    />
                    რჩეული
                  </label>
                  <label className="flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100">
                    <input
                      type="checkbox"
                      checked={editingSection.hidden}
                      onChange={(e) => updateCurrent({ hidden: e.target.checked })}
                    />
                    დამალული
                  </label>
                </div>

                <div className="flex flex-wrap items-start gap-4">
                  {(editingSection.imageUrl || '').trim() ? (
                    <div
                      className={`relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl shadow-lg ring-4 ${st.ring}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={editingSection.imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      className={`relative flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg ring-4 ${st.ring} ${st.gradient}`}
                    >
                      <ServiceSectionIcon id={editingSection.styleKey} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-xs font-medium text-slate-500">ფოტო (შაბლონის ნაცვლად)</p>
                    <div className="flex flex-wrap gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          void uploadPhoto(e.target.files?.[0] || null);
                          e.target.value = '';
                        }}
                      />
                      <button
                        type="button"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
                      >
                        {uploading ? 'იტვირთება...' : 'ფოტოს ატვირთვა'}
                      </button>
                      {editingSection.imageUrl ? (
                        <button
                          type="button"
                          onClick={() => updateCurrent({ imageUrl: '' })}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-zinc-600 dark:text-zinc-200"
                        >
                          ფოტოს მოხსნა
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">
                    სათაური ({editLang.toUpperCase()})
                  </label>
                  <input
                    value={editingSection.title[editLang]}
                    onChange={(e) =>
                      updateCurrent((s) => ({
                        ...s,
                        title: { ...s.title, [editLang]: e.target.value },
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-lg font-bold dark:border-zinc-600 dark:bg-zinc-950"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">
                    ტექსტი ({editLang.toUpperCase()})
                  </label>
                  <textarea
                    value={editingSection.body[editLang]}
                    onChange={(e) =>
                      updateCurrent((s) => ({
                        ...s,
                        body: { ...s.body, [editLang]: e.target.value },
                      }))
                    }
                    rows={6}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
                  {imageUrl ? (
                    <div
                      className={`relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl shadow-lg ring-4 ${st.ring}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div
                      className={`relative flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg ring-4 ${st.ring} ${st.gradient}`}
                    >
                      <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_55%)]" />
                      <ServiceSectionIcon id={section.styleKey} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                      {tx('services_nav', 'მომსახურება')} · {String(index + 1).padStart(2, '0')} /{' '}
                      {String(view.sections.filter((s) => !s.hidden || isAdmin).length).padStart(
                        2,
                        '0'
                      )}
                      {section.hidden && isAdmin ? ' · დამალული' : ''}
                    </p>
                    <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-50 md:text-4xl">
                      {servicesText(lang, section.title)}
                    </h1>
                    <div
                      className={`mt-3 h-1 w-20 rounded-full bg-gradient-to-r ${st.stripe}`}
                      aria-hidden
                    />
                  </div>
                </div>

                <p className="mt-8 text-base leading-relaxed text-slate-600 dark:text-zinc-300 md:text-lg md:leading-8">
                  {servicesText(lang, section.body)}
                </p>

                {!imageUrl ? (
                  <ServiceSectionVisualAccent id={section.styleKey} stripe={st.stripe} />
                ) : null}

                <p className="mt-8 rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm leading-relaxed text-slate-600 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-zinc-400">
                  {servicesText(lang, content.page.footerNote)}
                </p>
              </>
            )}
          </div>
        </article>

        {!editing && (
          <nav className="mt-8 flex flex-wrap items-center justify-between gap-3">
            {prev ? (
              <Link
                href={servicePath(prev.id)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                ← {servicesText(lang, prev.title)}
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                href={servicePath(next.id)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                {servicesText(lang, next.title)} →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
