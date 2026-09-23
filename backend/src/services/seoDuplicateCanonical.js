/**
 * საჯარო SEO დუბლიკატი: იგივე მფლობელი, სათაური, ქუჩა, ფასი, ტიპი,
 * კოორდინატი და აღწერის დასაწყისი. Keeper რჩება ინდექსში, დანარჩენი
 * canonical-ით / 308-ით მასზე გადადის.
 *
 * იგივე წესი აქვს frontend/lib/seoDuplicateCanonical.ts-ს.
 */

export function normalizeSeoText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function ownerIdOf(property) {
  const user = property?.userId;
  if (!user) return '';
  if (typeof user === 'string') return user;
  if (typeof user === 'object' && (user._id || user.id)) return String(user._id || user.id);
  return String(user);
}

export function isPublicIndexableListing(property) {
  if (!property || property.deletedAt) return false;
  const visibility = property.listingVisibility || 'public';
  if (visibility !== 'public') return false;
  const status = property.status;
  return status === 'active' || status === 'pending' || status == null || status === '';
}

/** null = ამ ჩანაწერზე დუბლიკატის წესი არ ვრცელდება */
export function seoDuplicateSignature(property) {
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

/** მეტი ფოტო → active → უფრო ძველი ჩანაწერი */
export function pickSeoKeeper(items) {
  return [...items].sort((a, b) => {
    const photoDiff = (b.photos?.length || 0) - (a.photos?.length || 0);
    if (photoDiff !== 0) return photoDiff;
    const aActive = a.status === 'active' ? 1 : 0;
    const bActive = b.status === 'active' ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive;
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return (Number.isNaN(aTime) ? 0 : aTime) - (Number.isNaN(bTime) ? 0 : bTime);
  })[0];
}

/** ინდექსიდან ამოსაღები id-ები (keeper არ შედის) */
export function seoDuplicateIdsToDrop(properties) {
  const groups = new Map();
  for (const property of properties || []) {
    const key = seoDuplicateSignature(property);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(property);
  }
  const drop = new Set();
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

export function seoDuplicateKeeperId(property, candidates) {
  const key = seoDuplicateSignature(property);
  if (!key) return null;
  const group = [property];
  for (const candidate of candidates || []) {
    if (String(candidate._id) === String(property._id)) continue;
    if (seoDuplicateSignature(candidate) === key) group.push(candidate);
  }
  if (group.length < 2) return null;
  const keeperId = String(pickSeoKeeper(group)._id);
  return keeperId === String(property._id) ? null : keeperId;
}

export async function findSeoDuplicateKeeperId(property) {
  if (!seoDuplicateSignature(property)) return null;
  const { Property } = await import('../models/Property.js');
  const { PROPERTY_NOT_DELETED } = await import('../utils/propertySoftDelete.js');
  const { PUBLIC_LISTING_OR, PUBLIC_STATUS_OR } = await import('../utils/propertyQueryFilters.js');

  const siblings = await Property.find({
    _id: { $ne: property._id },
    userId: ownerIdOf(property),
    price: property.price,
    type: property.type,
    $and: [PUBLIC_STATUS_OR, PUBLIC_LISTING_OR, PROPERTY_NOT_DELETED],
  })
    .select(
      'title street desc price type dealType status createdAt photos location listingVisibility userId deletedAt'
    )
    .lean();

  return seoDuplicateKeeperId(property, siblings);
}
