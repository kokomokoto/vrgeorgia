import { getApiBase } from '@/lib/config';
import {
  normalizeHomeDesignInput,
  type HomeDesignLayout,
} from '@/lib/homeDesignLayout';

/**
 * Server-side fetch of the public homepage design layout.
 * Used so first HTML paint matches the saved design (reduces refresh flash).
 */
export async function fetchHomeDesignLayoutServer(): Promise<HomeDesignLayout | null> {
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/api/content/home-design`, {
      next: { revalidate: 30 },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { layout?: unknown | null };
    if (!data?.layout || typeof data.layout !== 'object') return null;
    return normalizeHomeDesignInput(data.layout as Partial<HomeDesignLayout>);
  } catch {
    return null;
  }
}
