/**
 * Remap orphaned panoramaPhotos → actual photos[] URLs.
 * Dry-run by default.
 *   node --import ./src/env-bootstrap.js scripts/repair-panorama-photo-urls.js
 *   REPAIR_APPLY=1 node --import ./src/env-bootstrap.js scripts/repair-panorama-photo-urls.js
 *   REPAIR_ID=6a734f65c8805621692c953d REPAIR_APPLY=1 ...
 */
import mongoose from 'mongoose';
import sharp from 'sharp';

const APPLY = process.env.REPAIR_APPLY === '1';
const ONLY_ID = (process.env.REPAIR_ID || '').trim();

function norm(url) {
  if (!url || typeof url !== 'string') return '';
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

function isEquirect(width, height) {
  if (!width || !height || height < 400) return false;
  const ratio = width / height;
  return ratio >= 1.92 && ratio <= 2.08;
}

const equirectCache = new Map();

async function isEquirectUrl(url) {
  const key = norm(url);
  if (equirectCache.has(key)) return equirectCache.get(key);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    if (!res.ok) {
      equirectCache.set(key, false);
      return false;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const meta = await sharp(buf).metadata();
    const ok = isEquirect(meta.width, meta.height);
    equirectCache.set(key, ok);
    return ok;
  } catch {
    equirectCache.set(key, false);
    return false;
  }
}

function remapFromDraft(photos, draft) {
  if (!draft?.photos?.length || !draft?.panoramaPhotos?.length) return null;
  if (draft.photos.length !== photos.length) return null;
  const idxs = [];
  for (const pu of draft.panoramaPhotos) {
    const i = draft.photos.findIndex((ph) => norm(ph) === norm(pu));
    if (i >= 0) idxs.push(i);
  }
  if (!idxs.length) return null;
  return [...new Set(idxs.map((i) => photos[i]).filter(Boolean))];
}

async function remapFromEquirect(photos, preferredCount) {
  const hits = [];
  for (const url of photos) {
    if (await isEquirectUrl(url)) hits.push(url);
  }
  if (!hits.length) return null;
  if (preferredCount > 0 && hits.length > preferredCount) {
    const trailing = photos.filter((u) => hits.includes(u)).slice(-preferredCount);
    if (trailing.length === preferredCount) return trailing;
    return hits.slice(0, preferredCount);
  }
  if (preferredCount > 0 && hits.length >= preferredCount) return hits.slice(0, preferredCount);
  return hits;
}

await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;

const query = { panoramaPhotos: { $exists: true, $ne: [] } };
if (ONLY_ID) query._id = new mongoose.Types.ObjectId(ONLY_ID);

const props = await db
  .collection('properties')
  .find(query)
  .project({ photos: 1, panoramaPhotos: 1, title: 1, editDraft: 1 })
  .toArray();

let fixed = 0;
let skipped = 0;
let unchanged = 0;

for (const p of props) {
  const photos = Array.isArray(p.photos) ? p.photos.filter((u) => typeof u === 'string') : [];
  const panos = Array.isArray(p.panoramaPhotos)
    ? p.panoramaPhotos.filter((u) => typeof u === 'string')
    : [];
  if (!photos.length || !panos.length) {
    skipped += 1;
    continue;
  }

  const photoSet = new Set(photos.map(norm));
  const matched = panos.filter((u) => photoSet.has(norm(u)));
  if (matched.length === panos.length) {
    unchanged += 1;
    continue;
  }

  let next =
    remapFromDraft(photos, p.editDraft) ||
    (await remapFromEquirect(photos, panos.length)) ||
    matched;

  next = [...new Set(next.map((u) => photos.find((ph) => norm(ph) === norm(u)) || u))].filter(
    (u) => photoSet.has(norm(u))
  );

  if (!next.length) {
    console.warn(`SKIP ${p._id} (${p.title}): no remappable panos`);
    skipped += 1;
    continue;
  }

  console.log(
    `${APPLY ? 'FIX' : 'DRY'} ${p._id} "${p.title}": panos ${panos.length} → ${next.length} (matched-in-photos was ${matched.length})`
  );

  if (APPLY) {
    await db.collection('properties').updateOne({ _id: p._id }, { $set: { panoramaPhotos: next } });
  }
  fixed += 1;
}

console.log(JSON.stringify({ apply: APPLY, total: props.length, fixed, unchanged, skipped }, null, 2));
await mongoose.disconnect();
