/** Shared catalog for /services and /services/[slug] */

export const SERVICE_SECTION_IDS = [
  'arch',
  'docs',
  'planning',
  'interior',
  'landscape',
  'vis',
  'heritage',
  'consult',
] as const;

export type ServiceSectionId = (typeof SERVICE_SECTION_IDS)[number];

export function isServiceSectionId(value: string): value is ServiceSectionId {
  return (SERVICE_SECTION_IDS as readonly string[]).includes(value);
}

export function servicePath(id: ServiceSectionId) {
  return `/services/${id}`;
}

export const SERVICE_SECTION_STYLE: Record<
  ServiceSectionId,
  {
    gradient: string;
    ring: string;
    stripe: string;
    blob: string;
  }
> = {
  arch: {
    gradient: 'from-amber-400 via-orange-500 to-rose-500',
    ring: 'ring-amber-500/25',
    stripe: 'from-amber-500 to-orange-500',
    blob: 'bg-amber-400/30',
  },
  docs: {
    gradient: 'from-sky-400 via-blue-500 to-indigo-600',
    ring: 'ring-blue-500/25',
    stripe: 'from-sky-500 to-indigo-600',
    blob: 'bg-sky-400/30',
  },
  planning: {
    gradient: 'from-emerald-400 via-teal-500 to-cyan-600',
    ring: 'ring-emerald-500/25',
    stripe: 'from-emerald-500 to-teal-600',
    blob: 'bg-emerald-400/30',
  },
  interior: {
    gradient: 'from-rose-400 via-fuchsia-500 to-purple-600',
    ring: 'ring-rose-500/25',
    stripe: 'from-rose-500 to-purple-600',
    blob: 'bg-rose-400/25',
  },
  landscape: {
    gradient: 'from-lime-400 via-green-500 to-emerald-700',
    ring: 'ring-green-500/25',
    stripe: 'from-lime-500 to-emerald-700',
    blob: 'bg-lime-400/30',
  },
  vis: {
    gradient: 'from-violet-400 via-purple-500 to-indigo-700',
    ring: 'ring-violet-500/25',
    stripe: 'from-violet-500 to-indigo-700',
    blob: 'bg-violet-400/30',
  },
  heritage: {
    gradient: 'from-stone-400 via-amber-700 to-stone-800',
    ring: 'ring-amber-700/20',
    stripe: 'from-stone-500 to-amber-800',
    blob: 'bg-stone-400/25',
  },
  consult: {
    gradient: 'from-cyan-400 via-sky-500 to-blue-700',
    ring: 'ring-cyan-500/25',
    stripe: 'from-cyan-500 to-blue-700',
    blob: 'bg-cyan-400/30',
  },
};
