/**
 * Copy property / tour / avatar / agent / site-content images from Cloudinary →
 * Cloudflare R2 and rewrite MongoDB URLs. Dry-run by default.
 *
 *   node --import ./src/env-bootstrap.js scripts/migrate-cloudinary-to-r2.js
 *   MIGRATE_APPLY=1 node --import ./src/env-bootstrap.js scripts/migrate-cloudinary-to-r2.js
 *   MIGRATE_LIMIT=20 MIGRATE_APPLY=1 ...   # first N properties only
 *
 * Requires R2 env (CF_ACCOUNT_ID, R2_*, R2_PUBLIC_BASE_URL) + MONGODB_URI.
 */
import mongoose from 'mongoose';
import { uploadBufferToR2, isR2Configured } from '../src/services/r2Media.js';

const APPLY = process.env.MIGRATE_APPLY === '1';
const LIMIT = Number(process.env.MIGRATE_LIMIT || 0);

function isCloudinaryUrl(url) {
  return typeof url === 'string' && url.includes('res.cloudinary.com');
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function fetchBuffer(url, attempt = 1) {
  const maxAttempts = 5;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(120_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    const ctype = res.headers.get('content-type') || 'image/jpeg';
    const buf = Buffer.from(await res.arrayBuffer());
    return { buf, ctype };
  } catch (err) {
    if (attempt >= maxAttempts) throw err;
    const wait = Math.min(30_000, 1500 * 2 ** (attempt - 1));
    console.warn(`  retry ${attempt}/${maxAttempts} after ${wait}ms: ${err.message}`);
    await sleep(wait);
    return fetchBuffer(url, attempt + 1);
  }
}

function extFromContentType(ctype) {
  if (ctype.includes('png')) return 'png';
  if (ctype.includes('webp')) return 'webp';
  if (ctype.includes('gif')) return 'gif';
  if (ctype.includes('mp4')) return 'mp4';
  if (ctype.includes('webm')) return 'webm';
  if (ctype.includes('svg')) return 'svg';
  return 'jpg';
}

async function migrateUrl(url, folder) {
  if (!isCloudinaryUrl(url)) return { url, changed: false };
  if (!APPLY) {
    console.log(`  [dry-run] would copy ${url.slice(0, 80)}… → ${folder}/`);
    return { url, changed: true };
  }
  try {
    const { buf, ctype } = await fetchBuffer(url);
    const next = await uploadBufferToR2(buf, {
      folder,
      contentType: ctype,
      ext: extFromContentType(ctype),
    });
    console.log(`  OK ${url.slice(-40)} → ${next}`);
    return { url: next, changed: true };
  } catch (err) {
    console.error(`  SKIP ${url.slice(0, 90)}… — ${err.message}`);
    return { url, changed: false, failed: true };
  }
}

async function rewriteArray(arr, folder) {
  if (!Array.isArray(arr) || !arr.length) return { arr, changed: 0 };
  let changed = 0;
  const out = [];
  for (const u of arr) {
    if (!isCloudinaryUrl(u)) {
      out.push(u);
      continue;
    }
    const r = await migrateUrl(u, folder);
    out.push(r.url);
    if (r.changed) changed += 1;
  }
  return { arr: out, changed };
}

async function rewriteStringField(doc, field, folder, collection, id) {
  const cur = doc[field];
  if (!isCloudinaryUrl(cur)) return 0;
  const r = await migrateUrl(cur, folder);
  if (!r.changed) return 0;
  if (APPLY) {
    await collection.updateOne({ _id: id }, { $set: { [field]: r.url } });
  }
  return 1;
}

async function main() {
  if (!isR2Configured()) {
    console.error('R2 env incomplete — set CF_ACCOUNT_ID, R2_*, R2_PUBLIC_BASE_URL');
    process.exit(1);
  }
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI missing');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  console.log(`Connected. APPLY=${APPLY ? 'yes' : 'dry-run'} LIMIT=${LIMIT || 'none'}`);

  let processed = 0;
  let photoTotal = 0;
  // Load IDs up-front so long runs do not hit CursorNotFound on Atlas.
  const propFilter = {
    $or: [{ photos: /cloudinary/i }, { panoramaPhotos: /cloudinary/i }],
  };
  let propIds = await db.collection('properties').find(propFilter, { projection: { _id: 1 } }).map((d) => d._id).toArray();
  if (LIMIT) propIds = propIds.slice(0, LIMIT);
  console.log(`properties still on Cloudinary: ${propIds.length}`);

  for (const id of propIds) {
    const doc = await db.collection('properties').findOne(
      { _id: id },
      { projection: { photos: 1, panoramaPhotos: 1 } }
    );
    if (!doc) continue;
    processed += 1;
    const photos = await rewriteArray(doc.photos || [], 'vrgeorgia/properties');
    const pans = await rewriteArray(doc.panoramaPhotos || [], 'vrgeorgia/properties');
    photoTotal += photos.changed + pans.changed;
    if (photos.changed || pans.changed) {
      console.log(`property ${doc._id}: photos+${photos.changed} pans+${pans.changed} (${processed}/${propIds.length})`);
      if (APPLY) {
        await db.collection('properties').updateOne(
          { _id: doc._id },
          { $set: { photos: photos.arr, panoramaPhotos: pans.arr } }
        );
      }
    }
    await sleep(30);
  }

  let usersChanged = 0;
  const userIds = await db.collection('users').find({ avatar: /cloudinary/i }, { projection: { _id: 1 } }).map((d) => d._id).toArray();
  for (const id of userIds) {
    const doc = await db.collection('users').findOne({ _id: id }, { projection: { avatar: 1 } });
    if (!doc) continue;
    usersChanged += await rewriteStringField(doc, 'avatar', 'vrgeorgia/avatars', db.collection('users'), doc._id);
  }

  let agentsChanged = 0;
  const agentIds = await db.collection('agents').find({ photo: /cloudinary/i }, { projection: { _id: 1 } }).map((d) => d._id).toArray();
  for (const id of agentIds) {
    const doc = await db.collection('agents').findOne({ _id: id }, { projection: { photo: 1 } });
    if (!doc) continue;
    agentsChanged += await rewriteStringField(doc, 'photo', 'vrgeorgia/agents', db.collection('agents'), doc._id);
  }

  let scenesChanged = 0;
  const sceneCols = ['scenes', 'tourscenes', 'tour_scenes'];
  for (const name of sceneCols) {
    const cols = await db.listCollections({ name }).toArray();
    if (!cols.length) continue;
    const sceneIds = await db.collection(name).find({ image_path: /cloudinary/i }, { projection: { _id: 1 } }).map((d) => d._id).toArray();
    for (const id of sceneIds) {
      const doc = await db.collection(name).findOne({ _id: id }, { projection: { image_path: 1, tour_id: 1 } });
      if (!doc) continue;
      scenesChanged += await rewriteStringField(
        doc,
        'image_path',
        `vrgeorgia/tours/${doc.tour_id || 'misc'}`,
        db.collection(name),
        doc._id
      );
    }
  }

  const remaining = await db.collection('properties').countDocuments({
    $or: [{ photos: /cloudinary/i }, { panoramaPhotos: /cloudinary/i }],
  });
  console.log(
    `Done. propertiesTouched=${processed} photoUrls=${photoTotal} users=${usersChanged} agents=${agentsChanged} scenes=${scenesChanged} remainingCloudinaryProps=${remaining}`
  );
  await mongoose.disconnect();
  if (remaining > 0) process.exitCode = 2;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
