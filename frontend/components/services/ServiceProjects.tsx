'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { uploadServicesMediaFile } from '@/lib/api';
import { LightboxZoomImage } from '@/components/LightboxZoomImage';
import {
  servicesText,
  type ServiceProject,
  type ServiceProjectMedia,
  type ServicesLang,
} from '@/lib/servicesContent';

const MAX_PROJECTS = 40;
const MAX_MEDIA = 30;
const IMAGE_LIMIT = 10 * 1024 * 1024;
const VIDEO_LIMIT = 300 * 1024 * 1024;

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function emptyProject(): ServiceProject {
  return {
    id: newId('project'),
    title: { ka: '', en: '', ru: '' },
    body: { ka: '', en: '', ru: '' },
    media: [],
  };
}

function visibleProjects(projects: ServiceProject[], lang: ServicesLang) {
  return projects.filter((project) => {
    const title = servicesText(lang, project.title);
    const body = servicesText(lang, project.body);
    return Boolean(title || body || project.media.length);
  });
}

export function hasVisibleProjects(projects: ServiceProject[], lang: ServicesLang) {
  return visibleProjects(projects, lang).length > 0;
}

function photoGridClass(count: number) {
  if (count <= 1) return 'grid-cols-1';
  if (count === 2) return 'grid-cols-1 sm:grid-cols-2';
  return 'grid-cols-2 lg:grid-cols-3';
}

function ProjectLightbox({
  items,
  index,
  title,
  onClose,
  onIndex,
}: {
  items: ServiceProjectMedia[];
  index: number;
  title: string;
  onClose: () => void;
  onIndex: (index: number) => void;
}) {
  const { t } = useTranslation();
  const [ready, setReady] = React.useState(false);
  const count = items.length;
  const safeIndex = ((index % count) + count) % count;
  const current = items[safeIndex];

  const goPrev = React.useCallback(() => {
    if (count <= 1) return;
    onIndex((safeIndex - 1 + count) % count);
  }, [count, onIndex, safeIndex]);

  const goNext = React.useCallback(() => {
    if (count <= 1) return;
    onIndex((safeIndex + 1) % count);
  }, [count, onIndex, safeIndex]);

  React.useEffect(() => {
    setReady(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        if (event.key === 'ArrowLeft') goPrev();
        else goNext();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [goNext, goPrev, onClose]);

  const videoRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    const el = videoRef.current;
    if (!ready || !el || current?.kind !== 'video') return;
    const play = el.play();
    if (play) play.catch(() => undefined);
  }, [current, ready]);

  if (!ready || !current) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title || t('services_projects', 'პროექტები')}
    >
      <button
        type="button"
        aria-label={t('close', 'დახურვა')}
        className="absolute right-4 top-4 z-[10001] flex h-11 w-11 items-center justify-center rounded-full bg-white text-zinc-900 shadow-lg transition hover:bg-zinc-100"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
      >
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
          <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>

      {count > 1 ? (
        <button
          type="button"
          aria-label={t('previous_photo', 'წინა ფოტო')}
          className="absolute left-0 top-16 z-[10000] flex h-[calc(100%-9rem)] w-12 items-center justify-center bg-gradient-to-r from-black/40 to-transparent text-5xl text-white/80 transition hover:from-black/60 hover:text-white md:w-20"
          onClick={(event) => {
            event.stopPropagation();
            goPrev();
          }}
        >
          ‹
        </button>
      ) : null}

      <div
        className="absolute inset-x-0 top-16 bottom-28 flex items-center justify-center"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="h-full w-[min(96vw,1600px)]">
          {current.kind === 'video' ? (
            <video
              ref={videoRef}
              key={current.url}
              src={current.url}
              controls
              autoPlay
              playsInline
              className="h-full w-full bg-black object-contain"
            />
          ) : (
            <LightboxZoomImage
              key={current.url}
              src={current.url}
              alt={title}
              onSwipeLeft={count > 1 ? goNext : undefined}
              onSwipeRight={count > 1 ? goPrev : undefined}
            />
          )}
        </div>
      </div>

      {count > 1 ? (
        <button
          type="button"
          aria-label={t('next_photo', 'შემდეგი ფოტო')}
          className="absolute right-0 top-16 z-[10000] flex h-[calc(100%-9rem)] w-12 items-center justify-center bg-gradient-to-l from-black/40 to-transparent text-5xl text-white/80 transition hover:from-black/60 hover:text-white md:w-20"
          onClick={(event) => {
            event.stopPropagation();
            goNext();
          }}
        >
          ›
        </button>
      ) : null}

      <div className="absolute bottom-4 left-1/2 z-[10000] -translate-x-1/2 rounded-full bg-black/70 px-4 py-1.5 text-sm text-white">
        {safeIndex + 1} / {count}
      </div>

      {count > 1 ? (
        <div
          className="absolute bottom-14 left-1/2 z-[10000] flex max-w-[80vw] -translate-x-1/2 gap-1.5 overflow-x-auto p-2"
          onClick={(event) => event.stopPropagation()}
        >
          {items.map((item, itemIndex) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onIndex(itemIndex)}
              className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-md border-2 transition ${
                itemIndex === safeIndex ? 'scale-105 border-white' : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              {item.kind === 'video' ? (
                <video src={item.url} muted preload="metadata" className="h-full w-full object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt="" className="h-full w-full object-cover" />
              )}
              {item.kind === 'video' ? (
                <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-sm text-white">▶</span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>,
    document.body
  );
}

export function ServiceProjectsView({
  projects,
  lang,
}: {
  projects: ServiceProject[];
  lang: ServicesLang;
}) {
  const { t } = useTranslation();
  const items = visibleProjects(projects, lang);
  const [open, setOpen] = React.useState<{ projectId: string; index: number } | null>(null);

  if (!items.length) return null;

  const openProject = open ? items.find((project) => project.id === open.projectId) : null;
  const openMedia = openProject?.media || [];
  const openTitle = openProject ? servicesText(lang, openProject.title) : '';

  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-50">
        {t('services_projects', 'პროექტები')}
      </h2>
      <div className="mt-5 space-y-8">
        {items.map((project) => {
          const title = servicesText(lang, project.title);
          const body = servicesText(lang, project.body);
          const media = project.media;
          return (
            <article
              key={project.id}
              className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4 dark:border-zinc-700 dark:bg-black/20 md:p-6"
            >
              {title ? (
                <h3 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50">{title}</h3>
              ) : null}
              {body ? (
                <p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-zinc-300 md:text-base">
                  {body}
                </p>
              ) : null}
              {media.length ? (
                <div className={`mt-4 grid gap-3 ${photoGridClass(media.length)}`}>
                  {media.map((item, mediaIndex) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setOpen({ projectId: project.id, index: mediaIndex })}
                      className="group relative overflow-hidden rounded-xl bg-slate-200 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-zinc-800"
                    >
                      {item.kind === 'video' ? (
                        <video
                          src={item.url}
                          muted
                          preload="metadata"
                          className="aspect-[4/3] w-full object-cover"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.url}
                          alt={title || ''}
                          className={`w-full object-cover transition duration-300 group-hover:scale-[1.02] ${
                            media.length === 1 ? 'aspect-[16/9] max-h-[36rem]' : 'aspect-[4/3]'
                          }`}
                        />
                      )}
                      {item.kind === 'video' ? (
                        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25">
                          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-2xl text-zinc-900 shadow-lg">
                            ▶
                          </span>
                        </span>
                      ) : (
                        <span className="pointer-events-none absolute inset-0 bg-black/0 transition group-hover:bg-black/15" />
                      )}
                    </button>
                  ))}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {open && openMedia.length ? (
        <ProjectLightbox
          items={openMedia}
          index={open.index}
          title={openTitle}
          onClose={() => setOpen(null)}
          onIndex={(index) => setOpen({ projectId: open.projectId, index })}
        />
      ) : null}
    </section>
  );
}

export function ServiceProjectsEditor({
  projects,
  lang,
  onChange,
}: {
  projects: ServiceProject[];
  lang: ServicesLang;
  onChange: (projects: ServiceProject[]) => void;
}) {
  const [busyId, setBusyId] = React.useState('');
  const [error, setError] = React.useState('');
  const projectsRef = React.useRef(projects);
  projectsRef.current = projects;

  const patch = (id: string, next: Partial<ServiceProject>) => {
    onChange(projectsRef.current.map((project) => (project.id === id ? { ...project, ...next } : project)));
  };

  const upload = async (projectId: string, list: FileList | null) => {
    const files = Array.from(list || []);
    if (!files.length) return;
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;
    if (project.media.length + files.length > MAX_MEDIA) {
      setError(`ერთ პროექტზე მაქსიმუმ ${MAX_MEDIA} ფაილი`);
      return;
    }
    setBusyId(projectId);
    setError('');
    const added: ServiceProjectMedia[] = [];
    try {
      for (const file of files) {
        const video = file.type.startsWith('video/');
        if (!video && !file.type.startsWith('image/')) {
          setError('დასაშვებია სურათი ან ვიდეო (MP4, WebM, MOV)');
          continue;
        }
        if (file.size > (video ? VIDEO_LIMIT : IMAGE_LIMIT)) {
          setError(video ? 'ვიდეო ძალიან დიდია (მაქს. 300 MB)' : 'სურათი ძალიან დიდია (მაქს. 10 MB)');
          continue;
        }
        const result = await uploadServicesMediaFile(file);
        if (!result?.url) {
          setError('ფაილის ატვირთვა ვერ მოხერხდა');
          continue;
        }
        added.push({
          id: newId('media'),
          kind: result.kind === 'video' || video ? 'video' : 'image',
          url: result.url,
        });
      }
      if (added.length) {
        const current = projectsRef.current.find((item) => item.id === projectId);
        patch(projectId, { media: [...(current?.media || project.media), ...added] });
      }
    } catch (e: unknown) {
      const message =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message?: string }).message)
          : 'ფაილის ატვირთვა ვერ მოხერხდა';
      setError(message);
    } finally {
      setBusyId('');
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 p-4 dark:border-zinc-700">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-zinc-100">პროექტები</h2>
          <p className="mt-1 text-xs text-slate-500">
            თითო პროექტს აქვს საკუთარი აღწერა, რამდენიმე ფოტო და ვიდეო.
          </p>
        </div>
        <button
          type="button"
          disabled={projects.length >= MAX_PROJECTS}
          onClick={() => onChange([...projects, emptyProject()])}
          className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
        >
          პროექტის დამატება
        </button>
      </div>
      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      <div className="mt-4 space-y-4">
        {projects.map((project, index) => (
          <article key={project.id} className="rounded-xl border border-slate-200 p-3 dark:border-zinc-700">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium text-slate-500">პროექტი {index + 1}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => {
                    const next = projects.slice();
                    const [row] = next.splice(index, 1);
                    next.splice(index - 1, 0, row);
                    onChange(next);
                  }}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs disabled:opacity-40 dark:border-zinc-600"
                >
                  ზემოთ
                </button>
                <button
                  type="button"
                  disabled={index === projects.length - 1}
                  onClick={() => {
                    const next = projects.slice();
                    const [row] = next.splice(index, 1);
                    next.splice(index + 1, 0, row);
                    onChange(next);
                  }}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs disabled:opacity-40 dark:border-zinc-600"
                >
                  ქვემოთ
                </button>
                <button
                  type="button"
                  onClick={() => onChange(projects.filter((item) => item.id !== project.id))}
                  className="rounded-md border border-rose-300 px-2 py-1 text-xs text-rose-700 dark:border-rose-800 dark:text-rose-300"
                >
                  წაშლა
                </button>
              </div>
            </div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              სათაური ({lang.toUpperCase()})
            </label>
            <input
              value={project.title[lang]}
              onChange={(event) =>
                patch(project.id, { title: { ...project.title, [lang]: event.target.value } })
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            />
            <label className="mb-1 mt-3 block text-xs font-medium text-slate-500">
              აღწერა ({lang.toUpperCase()})
            </label>
            <textarea
              value={project.body[lang]}
              onChange={(event) =>
                patch(project.id, { body: { ...project.body, [lang]: event.target.value } })
              }
              rows={3}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            />
            {project.media.length ? (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {project.media.map((item) => (
                  <div key={item.id} className="relative overflow-hidden rounded-lg bg-slate-100 dark:bg-zinc-800">
                    {item.kind === 'video' ? (
                      <video src={item.url} className="aspect-video w-full object-cover" muted />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.url} alt="" className="aspect-video w-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        patch(project.id, {
                          media: project.media.filter((media) => media.id !== item.id),
                        })
                      }
                      className="absolute right-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[11px] text-white"
                    >
                      მოხსნა
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <label className="cursor-pointer rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
                {busyId === project.id ? 'იტვირთება...' : 'ფოტოების ატვირთვა'}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={busyId === project.id}
                  className="hidden"
                  onChange={(event) => {
                    void upload(project.id, event.target.files);
                    event.target.value = '';
                  }}
                />
              </label>
              <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-zinc-600 dark:text-zinc-200">
                {busyId === project.id ? 'იტვირთება...' : 'ვიდეოს ატვირთვა'}
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,video/ogg"
                  multiple
                  disabled={busyId === project.id}
                  className="hidden"
                  onChange={(event) => {
                    void upload(project.id, event.target.files);
                    event.target.value = '';
                  }}
                />
              </label>
            </div>
          </article>
        ))}
        {!projects.length ? (
          <p className="text-sm text-slate-500">ჯერ პროექტი არ არის დამატებული.</p>
        ) : null}
      </div>
    </section>
  );
}
