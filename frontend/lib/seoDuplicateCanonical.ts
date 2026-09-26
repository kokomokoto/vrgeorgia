/**
 * იგივე წესი, რაც backend/src/services/seoDuplicateCanonical.js-ში.
 * Sitemap-იდან დუბლიკატ URL-ებს იღებს; გვერდის canonical/redirect API-ის canonicalId-ს იყენებს.
 */

export type SeoListing = {
  _id: string;
  userId?: string | { _id?: string; id?: string };
  title?: string;
  street?: string;
  desc?: string;
  price?: number;
  type?: string;
  dealType?: string;
  status?: string;
  createdAt?: string;
  photos?: string[];
  location?: { lat?: number; lng?: number };
  listingVisibility?: string;
  deletedAt?: string | null;
  canonicalId?: string;
  urlKey?: string;
};

function normalizeSeoText(value?: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function ownerIdOf(property: SeoListing): string {
  const user = property.userId;
  if (!user) return '';
  if (typeof user === 'string') return user;
  if (user._id || user.id) return String(user._id || user.id);
  return String(user);
}

function isPublicIndexableListing(property: SeoListing): boolean {
  if (property.deletedAt) return false;
  const visibility = property.listingVisibility || 'public';
  if (visibility !== 'public') return false;
  const status = property.status;
  return status === 'active' || status === 'pending' || status == null || status === '';
}

export function seoDuplicateSignature(property: SeoListing): string | null {
  if (!isPublicIndexableListing(property)) return null;
  const owner = ownerIdOf(property);
  const title = normalizeSeoText(property.title);
  const street = normalizeSeoText(property.street);
  if (!owner || !title || !street) return null;
  const lat = Number(property.location?.lat);
  const lng = Number(property.location?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const desc = normalizeSeoText(property.desc).slice(0, 180);
  return [
    owner,
    title,
    street,
    String(property.price ?? ''),
    String(property.type || ''),
    String(property.dealType || 'sale'),
    String(Math.round(lat * 1e5)),
    String(Math.round(lng * 1e5)),
    desc,
  ].join('|');
}

function pickSeoKeeper<T extends SeoListing>(items: T[]): T {
  return [...items].sort((a, b) => {
    const photoDiff = (b.photos?.length || 0) - (a.photos?.length || 0);
    if (photoDiff !== 0) return photoDiff;
    const aActive = a.status === 'active' ? 1 : 0;
    const bActive = b.status === 'active' ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive;
    const aTime = new Date(a.createdAt || 0).getTime();
    const bTime = new Date(b.createdAt || 0).getTime();
    return (Number.isNaN(aTime) ? 0 : aTime) - (Number.isNaN(bTime) ? 0 : bTime);
  })[0];
}

/** ინდექსიდან ამოსაღები id-ები (keeper არ შედის) */
export function seoDuplicateIdsToDrop(properties: SeoListing[]): Set<string> {
  const groups = new Map<string, SeoListing[]>();
  for (const property of properties || []) {
    const key = seoDuplicateSignature(property);
    if (!key) continue;
    const group = groups.get(key);
    if (group) group.push(property);
    else groups.set(key, [property]);
  }
  const drop = new Set<string>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const keeperId = String(pickSeoKeeper(group)._id);
    for (const item of group) {
      const id = String(item._id);
      if (id !== keeperId) drop.add(id);
    }
  }
  return drop;
}

/** საჯარო URL: დუბლიკატი keeper-ზე, დანარჩენი urlKey-ზე (სათაური-numericId). */
export function canonicalPropertyPathId(
  requestedId: string,
  property: { _id?: string; canonicalId?: string; urlKey?: string }
): string {
  if (property.canonicalId && property.canonicalId !== property._id) return String(property.canonicalId);
  if (property.urlKey) return property.urlKey;
  if (property._id) return String(property._id);
  return requestedId;
}
