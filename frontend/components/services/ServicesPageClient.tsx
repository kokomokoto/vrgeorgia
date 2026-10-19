'use client';

import React from 'react';
import Link from 'next/link';
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
  emptyServiceSection,
  featuredServiceSections,
  normalizeServiceSection,
  pickServicesLang,
  servicePath,
  servicesText,
  toServicesApiPayload,
  visibleServiceSections,
  type ServiceSection,
  type ServicesLang,
  type ServicesPageContent,
} from '@/lib/servicesContent';
import { ServiceSectionIcon } from '@/components/services/ServiceSectionVisuals';

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

function ServiceVisual({
  section,
  size = 'md',
}: {
  section: Pick<ServiceSection, 'styleKey' | 'imageUrl'>;
  size?: 'sm' | 'md' | 'lg';
}) {
  const st = SERVICE_SECTION_STYLE[resolveServiceStyleKey(section.styleKey)];
  const box =
    size === 'sm'
      ? 'h-12 w-12'
      : size === 'lg'
        ? 'h-28 w-28'
        : 'h-28 w-28';
  const img = (section.imageUrl || '').trim();
  if (img) {
    return (
      <div
        className={`relative ${box} shrink-0 overflow-hidden rounded-2xl shadow-md ring-2 ${st.ring}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div
      className={`relative flex ${box} shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br shadow-md ring-2 ${st.ring} ${st.gradient}`}
    >
      <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_55%)]" />
      <ServiceSectionIcon id={section.styleKey} />
    </div>
  );
}

export function ServicesPageClient() {
  const { t, i18n } = useTranslation();
  const { user, profileLoaded } = useAuth();
  const isAdmin = profileLoaded && isAdminRole(user?.role);

  const [mounted, setMounted] = React.useState(false);
  const [content, setContent] = React.useState<ServicesPageContent>(DEFAULT_SERVICES_CONTENT);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState<ServicesPageContent | null>(null);
  const [editLang, setEditLang] = React.useState<ServicesLang>('ka');
  const [saving, setSaving] = React.useState(false);
  const [uploadingIndex, setUploadingIndex] = React.useState<number | null>(null);
  const [status, setStatus] = React.useState('');
  const [error, setError] = React.useState('');
  const fileInputRefs = React.useRef<Record<string, HTMLInputElement | null>>({});

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
        if (!res.ok || !alive) return;
        const data = await res.json();
        if (alive) applyPayload(data);
      } catch {
        /* keep static fallback */
      }
    })();
    return () => {
      alive = false;
    };
  }, [profileLoaded, isAdmin, applyPayload]);

  const lang = mounted ? pickServicesLang(i18n.language) : 'ka';
  const tx = (key: string, fallback: string) => (mounted ? t(key) : fallback);
  const view = editing && draft ? draft : content;
  const publicSections = visibleServiceSections(view.sections);
  const featured = featuredServiceSections(view.sections);
  const displaySections = editing && draft ? draft.sections : publicSections;

  const startEdit = () => {
    setDraft(cloneServicesContent(content));
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

  const updatePageField = (
    field: 'title' | 'lead' | 'footerNote',
    value: string
  ) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        page: {
          ...prev.page,
          [field]: { ...prev.page[field], [editLang]: value },
        },
      };
    });
  };

  const updateSection = (
    index: number,
    patch: Partial<ServiceSection> | ((section: ServiceSection) => ServiceSection)
  ) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map((it, i) => {
          if (i !== index) return it;
          return typeof patch === 'function' ? patch(it) : { ...it, ...patch };
        }),
      };
    });
  };

  const moveSection = (index: number, dir: -1 | 1) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = index + dir;
      if (next < 0 || next >= prev.sections.length) return prev;
      const copy = [...prev.sections];
      const tmp = copy[index];
      copy[index] = copy[next];
      copy[next] = tmp;
      return { ...prev, sections: copy };
    });
  };

  const addSection = () => {
    setDraft((prev) => {
      if (!prev) return prev;
      return { ...prev, sections: [...prev.sections, emptyServiceSection()] };
    });
    setStatus('');
    setError('');
  };

  const uploadPhoto = async (index: number, file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('მხოლოდ სურათის ატვირთვაა დაშვებული');
      return;
    }
    setUploadingIndex(index);
    setError('');
    try {
      const result = await uploadServicesMediaFile(file);
      if (!result?.url) {
        setError('ფოტოს ატვირთვა ვერ მოხერხდა');
        return;
      }
      updateSection(index, { imageUrl: result.url });
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message?: string }).message)
          : 'ფოტოს ატვირთვა ვერ მოხერხდა';
      setError(msg);
    } finally {
      setUploadingIndex(null);
    }
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
      setStatus(tx('save', 'შენახვა') + ' ✓');
    } catch {
      setError('სერვერთან კავშირი ვერ მოხერხდა');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-gradient-to-b from-slate-50 via-white to-amber-50/40 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.12]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2394a3b8' fill-opacity='0.2'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-32 top-20 h-72 w-72 rounded-full bg-amber-300/25 blur-3xl dark:bg-amber-500/10"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 top-40 h-64 w-64 rounded-full bg-sky-300/20 blur-3xl dark:bg-sky-500/10"
        aria-hidden
      />

      <div className="relative mx-auto max-w-4xl px-4 py-10 md:py-14">
        <header className="relative mb-8 overflow-hidden rounded-3xl border border-slate-200/80 bg-white/80 p-8 shadow-xl shadow-slate-200/40 backdrop-blur-md dark:border-zinc-700/80 dark:bg-zinc-900/70 dark:shadow-black/40 md:p-10">
          <div className="pointer-events-none absolute -right-16 top-0 h-40 w-40 rounded-full bg-gradient-to-br from-amber-200/60 to-orange-300/40 blur-2xl dark:from-amber-600/20 dark:to-orange-600/10" />
          <div className="relative">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/50 dark:text-amber-200">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                {tx('services_nav', 'მომსახურება')}
              </p>
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

            {editing && draft ? (
              <div className="space-y-3">
                <label className="block text-xs font-medium text-slate-500">
                  გვერდის სათაური ({editLang.toUpperCase()})
                </label>
                <input
                  value={draft.page.title[editLang]}
                  onChange={(e) => updatePageField('title', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-lg font-bold dark:border-zinc-600 dark:bg-zinc-950"
                />
                <label className="block text-xs font-medium text-slate-500">
                  აღწერა ({editLang.toUpperCase()})
                </label>
                <textarea
                  value={draft.page.lead[editLang]}
                  onChange={(e) => updatePageField('lead', e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                />
              </div>
            ) : (
              <>
                <h1 className="max-w-2xl text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-50 md:text-4xl md:leading-tight">
                  {servicesText(lang, view.page.title)}
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-zinc-300 md:text-lg">
                  {servicesText(lang, view.page.lead)}
                </p>
              </>
            )}

            {!editing && featured.length > 0 && (
              <div className="mt-8 grid grid-cols-3 gap-3 border-t border-slate-200/80 pt-8 dark:border-zinc-700/80">
                {featured.map((section) => (
                  <Link
                    key={section.id}
                    href={servicePath(section.id)}
                    className="flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 px-2 py-4 text-center transition hover:border-amber-300 hover:bg-amber-50/60 dark:border-zinc-700/50 dark:bg-zinc-800/40 dark:hover:border-amber-500/40"
                  >
                    <ServiceVisual section={section} size="sm" />
                    <span className="line-clamp-2 text-[11px] font-medium leading-tight text-slate-600 dark:text-zinc-400 sm:text-xs">
                      {servicesText(lang, section.title)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </header>

        {isAdmin && editing && draft && (
          <div className="sticky top-16 z-20 mb-6 space-y-3 rounded-xl border border-blue-200 bg-blue-50/95 p-3 shadow-lg backdrop-blur dark:border-blue-900 dark:bg-blue-950/90">
            <div className="flex flex-wrap items-center gap-2">
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
                onClick={addSection}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                + ახალი მომსახურება
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
                  disabled={saving || uploadingIndex !== null}
                  className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? '...' : tx('save', 'შენახვა')}
                </button>
              </div>
            </div>
            <p className="text-xs text-blue-800/80 dark:text-blue-200/80">
              ახალი სერვისი იწყება დამალულად. ფოტო შეცვლის შაბლონის აიქონს. „დამალული“ = საიტზე არ ჩანს.
            </p>
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

        <div className="space-y-6 md:space-y-8">
          {editing && draft
            ? draft.sections.map((section, index) => {
                const st = SERVICE_SECTION_STYLE[resolveServiceStyleKey(section.styleKey)];
                return (
                  <div
                    key={section.editKey || `svc-edit-${index}`}
                    className={`relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm dark:bg-zinc-900 ${
                      section.hidden
                        ? 'border-amber-300/80 opacity-90 dark:border-amber-700/60'
                        : 'border-slate-200 dark:border-zinc-700'
                    }`}
                  >
                    <div className={`absolute left-0 top-0 h-full w-1 bg-gradient-to-b ${st.stripe}`} />
                    {section.hidden && (
                      <div className="mb-2 ml-2 inline-flex rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                        დამალული — საიტზე არ ჩანს
                      </div>
                    )}
                    <div className="mb-3 flex flex-wrap items-center gap-2 pl-2">
                      <span className="text-xs font-semibold text-slate-400">{index + 1}</span>
                      <input
                        value={section.id}
                        onChange={(e) => updateSection(index, { id: e.target.value })}
                        className="min-w-0 flex-1 rounded border border-slate-200 px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-950"
                        placeholder="slug / id"
                      />
                      <select
                        value={section.styleKey}
                        onChange={(e) =>
                          updateSection(index, {
                            styleKey: resolveServiceStyleKey(e.target.value),
                          })
                        }
                        className="rounded border border-slate-200 px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-950"
                        title="ფერის შაბლონი (თუ ფოტო არაა)"
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
                          checked={section.featured}
                          onChange={(e) =>
                            updateSection(index, { featured: e.target.checked })
                          }
                        />
                        რჩეული
                      </label>
                      <label className="flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100">
                        <input
                          type="checkbox"
                          checked={section.hidden}
                          onChange={(e) =>
                            updateSection(index, { hidden: e.target.checked })
                          }
                        />
                        დამალული
                      </label>
                      <button
                        type="button"
                        onClick={() => moveSection(index, -1)}
                        disabled={index === 0}
                        className="rounded border px-2 py-0.5 text-xs disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSection(index, 1)}
                        disabled={index === draft.sections.length - 1}
                        className="rounded border px-2 py-0.5 text-xs disabled:opacity-30"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  sections: prev.sections.filter((_, i) => i !== index),
                                }
                              : prev
                          )
                        }
                        className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-600"
                      >
                        წაშლა
                      </button>
                    </div>

                    <div className="mb-4 flex flex-wrap items-start gap-4 pl-2">
                      <ServiceVisual section={section} size="md" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <p className="text-xs font-medium text-slate-500">
                          ფოტო (შაბლონის ნაცვლად)
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <input
                            ref={(el) => {
                              const k = section.editKey || `svc-edit-${index}`;
                              fileInputRefs.current[k] = el;
                            }}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              void uploadPhoto(index, file);
                              e.target.value = '';
                            }}
                          />
                          <button
                            type="button"
                            disabled={uploadingIndex === index}
                            onClick={() => {
                              const k = section.editKey || `svc-edit-${index}`;
                              fileInputRefs.current[k]?.click();
                            }}
                            className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
                          >
                            {uploadingIndex === index ? 'იტვირთება...' : 'ფოტოს ატვირთვა'}
                          </button>
                          {section.imageUrl ? (
                            <button
                              type="button"
                              onClick={() => updateSection(index, { imageUrl: '' })}
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-zinc-600 dark:text-zinc-200"
                            >
                              ფოტოს მოხსნა
                            </button>
                          ) : null}
                        </div>
                        <p className="text-[11px] text-slate-400">
                          თუ ფოტო არაა, გამოჩნდება ფერადი შაბლონი ({STYLE_LABELS[section.styleKey] || section.styleKey}).
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 pl-2">
                      <label className="block text-xs font-medium text-slate-500">
                        სათაური ({editLang.toUpperCase()})
                      </label>
                      <input
                        value={section.title[editLang]}
                        onChange={(e) =>
                          updateSection(index, (s) => ({
                            ...s,
                            title: { ...s.title, [editLang]: e.target.value },
                          }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold dark:border-zinc-600 dark:bg-zinc-950"
                      />
                      <label className="block text-xs font-medium text-slate-500">
                        ტექსტი ({editLang.toUpperCase()})
                      </label>
                      <textarea
                        value={section.body[editLang]}
                        onChange={(e) =>
                          updateSection(index, (s) => ({
                            ...s,
                            body: { ...s.body, [editLang]: e.target.value },
                          }))
                        }
                        rows={4}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                      />
                    </div>
                  </div>
                );
              })
            : displaySections.map((section, index) => {
                const st = SERVICE_SECTION_STYLE[resolveServiceStyleKey(section.styleKey)];
                return (
                  <Link
                    key={section.id}
                    href={servicePath(section.id)}
                    className="group relative block scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200/90 bg-white/90 shadow-lg shadow-slate-200/30 backdrop-blur-sm transition hover:border-slate-300/90 hover:shadow-xl dark:border-zinc-700/90 dark:bg-zinc-900/60 dark:shadow-black/30 dark:hover:border-zinc-600"
                  >
                    <div
                      className={`absolute left-0 top-0 h-full w-1 bg-gradient-to-b ${st.stripe} opacity-90`}
                      aria-hidden
                    />
                    <div className="flex flex-col gap-6 p-6 pl-7 md:flex-row md:items-start md:gap-8 md:p-8 md:pl-9">
                      <div className="flex shrink-0 flex-col items-center gap-3 md:w-36">
                        <div className="transition group-hover:scale-[1.02]">
                          <ServiceVisual section={section} size="lg" />
                        </div>
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold tabular-nums text-slate-500 dark:bg-zinc-800 dark:text-zinc-400">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-50 md:text-2xl">
                            {servicesText(lang, section.title)}
                          </h2>
                          <span className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition group-hover:border-blue-300 group-hover:bg-blue-50 group-hover:text-blue-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:group-hover:border-amber-500/50 dark:group-hover:text-amber-300">
                            {tx('services_open_page', 'გვერდის გახსნა')} →
                          </span>
                        </div>
                        <div className={`mt-2 h-1 w-16 rounded-full bg-gradient-to-r ${st.stripe}`} aria-hidden />
                        <p className="mt-4 line-clamp-3 text-[15px] leading-relaxed text-slate-600 dark:text-zinc-300 md:text-base md:leading-7">
                          {servicesText(lang, section.body)}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
        </div>

        {editing && draft && (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={addSection}
              className="rounded-xl border-2 border-dashed border-emerald-400 bg-emerald-50 px-6 py-4 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
            >
              + ახალი მომსახურების დამატება
            </button>
          </div>
        )}

        <footer className="mt-12 rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-slate-100/80 p-6 text-sm leading-relaxed text-slate-600 shadow-inner dark:border-zinc-700 dark:from-zinc-900 dark:to-zinc-950 dark:text-zinc-400 md:p-8">
          {editing && draft ? (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                ქვედა შენიშვნა ({editLang.toUpperCase()})
              </label>
              <textarea
                value={draft.page.footerNote[editLang]}
                onChange={(e) => updatePageField('footerNote', e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
              />
            </div>
          ) : (
            <div className="flex gap-4">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-200/80 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300"
                aria-hidden
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                  />
                </svg>
              </div>
              <p className="min-w-0 pt-1">{servicesText(lang, view.page.footerNote)}</p>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}
