/**
 * Copy Cloudinary images → Cloudflare R2 and rewrite MongoDB URLs.
 * Covers: properties, users, agents, tb_scenes (+ legacy scene cols), sitecontents (home-design).
 * Dry-run by default.
 *
 *   node --import ./src/env-bootstrap.js scripts/migrate-cloudinary-to-r2.js
 *   MIGRATE_APPLY=1 node --import ./src/env-bootstrap.js scripts/migrate-cloudinary-to-r2.js
 *   MIGRATE_LIMIT=20 MIGRATE_APPLY=1 ...   # first N properties only
 *   MIGRATE_ONLY=sitecontents|scenes|properties  # optional scope
 */
import mongoose from 'mongoose';
import { uploadBufferToR2, isR2Configured } from '../src/services/r2Media.js';

const APPLY = process.env.MIGRATE_APPLY === '1';
const LIMIT = Number(process.env.MIGRATE_LIMIT || 0);
const ONLY = (process.env.MIGRATE_ONLY || '').trim().toLowerCase();

const EXT_IMAGE_PREFIX = 'ext:v1:image:';

/** @type {Map<string, string>} */
const urlCache = new Map();

function isCloudinaryUrl(url) {
  return typeof url === 'string' && url.includes('res.cloudinary.com');
}

function shouldRun(section) {
  return !ONLY || ONLY === section || ONLY.split(',').includes(section);
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

/**
 * @param {string} url
 * @param {string} folder
 * @returns {Promise<{ url: string, changed: boolean, failed?: boolean }>}
 */
async function migrateUrl(url, folder) {
  if (!isCloudinaryUrl(url)) return { url, changed: false };
  if (urlCache.has(url)) {
    return { url: urlCache.get(url), changed: true };
  }
  if (!APPLY) {
    console.log(`  [dry-run] would copy ${url.slice(0, 80)}… → ${folder}/`);
    urlCache.set(url, url);
    return { url, changed: true };
  }
  try {
    const { buf, ctype } = await fetchBuffer(url);
    const next = await uploadBufferToR2(buf, {
      folder,
      contentType: ctype,
      ext: extFromContentType(ctype),
    });
    urlCache.set(url, next);
    console.log(`  OK …${url.slice(-48)} → ${next}`);
    return { url: next, changed: true };
  } catch (err) {
    console.error(`  SKIP ${url.slice(0, 90)}… — ${err.message}`);
    return { url, changed: false, failed: true };
  }
}

/**
 * Plain Cloudinary URL or home-design `ext:v1:image:` token → R2.
 * @returns {Promise<{ value: string, changed: boolean }>}
 */
async function migrateStringToken(raw, folder) {
  if (typeof raw !== 'string' || !raw.includes('cloudinary')) {
    return { value: raw, changed: false };
  }
  if (raw.startsWith(EXT_IMAGE_PREFIX)) {
    let decoded = raw.slice(EXT_IMAGE_PREFIX.length);
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      /* keep */
    }
    if (!isCloudinaryUrl(decoded)) return { value: raw, changed: false };
    const r = await migrateUrl(decoded, folder);
    if (!r.changed || r.failed) return { value: raw, changed: false };
    return {
      value: `${EXT_IMAGE_PREFIX}${encodeURIComponent(r.url)}`,
      changed: true,
    };
  }
  if (!isCloudinaryUrl(raw)) return { value: raw, changed: false };
  const r = await migrateUrl(raw, folder);
  return { value: r.url, changed: r.changed && !r.failed };
}

async function rewriteArray(arr, folder) {
  if (!Array.isArray(arr) || !arr.length) return { arr, changed: 0 };
  let changed = 0;
  const out = [];
  for (const u of arr) {
    if (typeof u !== 'string' || !isCloudinaryUrl(u)) {
      out.push(u);
      continue;
    }
    const r = await migrateUrl(u, folder);
    out.push(r.url);
    if (r.changed && !r.failed) changed += 1;
  }
  return { arr: out, changed };
}

async function rewriteStringField(doc, field, folder, collection, id) {
  const cur = doc[field];
  if (!isCloudinaryUrl(cur)) return 0;
  const r = await migrateUrl(cur, folder);
  if (!r.changed || r.failed) return 0;
  if (APPLY) {
    await collection.updateOne({ _id: id }, { $set: { [field]: r.url } });
  }
  return 1;
}

function isPlainObject(v) {
  return Boolean(v) && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date) && !v._bsontype;
}

/**
 * Deep-walk JSON-like values; rewrite Cloudinary strings (incl. ext:v1:image:).
 * @returns {Promise<{ value: unknown, changed: number }>}
 */
async function rewriteDeep(value, folder) {
  if (typeof value === 'string') {
    const r = await migrateStringToken(value, folder);
    return { value: r.value, changed: r.changed ? 1 : 0 };
  }
  if (Array.isArray(value)) {
    let changed = 0;
    const out = [];
    for (const item of value) {
      const r = await rewriteDeep(item, folder);
      out.push(r.value);
      changed += r.changed;
    }
    return { value: out, changed };
  }
  if (isPlainObject(value)) {
    let changed = 0;
    /** @type {Record<string, unknown>} */
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === '_id' || k === '__v') {
        out[k] = v;
        continue;
      }
      const r = await rewriteDeep(v, folder);
      out[k] = r.value;
      changed += r.changed;
    }
    return { value: out, changed };
  }
  return { value, changed: 0 };
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
  console.log(`Connected. APPLY=${APPLY ? 'yes' : 'dry-run'} LIMIT=${LIMIT || 'none'} ONLY=${ONLY || 'all'}`);

  let processed = 0;
  let photoTotal = 0;

  if (shouldRun('properties')) {
    const propFilter = {
      $or: [{ photos: /cloudinary/i }, { panoramaPhotos: /cloudinary/i }],
    };
    let propIds = await db
      .collection('properties')
      .find(propFilter, { projection: { _id: 1 } })
      .map((d) => d._id)
      .toArray();
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
        console.log(
          `property ${doc._id}: photos+${photos.changed} pans+${pans.changed} (${processed}/${propIds.length})`
        );
        if (APPLY) {
          await db.collection('properties').updateOne(
            { _id: doc._id },
            { $set: { photos: photos.arr, panoramaPhotos: pans.arr } }
          );
        }
      }
      await sleep(30);
    }
  }

  let usersChanged = 0;
  if (shouldRun('users') || shouldRun('properties')) {
    const userIds = await db
      .collection('users')
      .find({ avatar: /cloudinary/i }, { projection: { _id: 1 } })
      .map((d) => d._id)
      .toArray();
    for (const id of userIds) {
      const doc = await db.collection('users').findOne({ _id: id }, { projection: { avatar: 1 } });
      if (!doc) continue;
      usersChanged += await rewriteStringField(
        doc,
        'avatar',
        'vrgeorgia/avatars',
        db.collection('users'),
        doc._id
      );
    }
  }

  let agentsChanged = 0;
  if (shouldRun('agents') || shouldRun('properties')) {
    const agentIds = await db
      .collection('agents')
      .find({ photo: /cloudinary/i }, { projection: { _id: 1 } })
      .map((d) => d._id)
      .toArray();
    for (const id of agentIds) {
      const doc = await db.collection('agents').findOne({ _id: id }, { projection: { photo: 1 } });
      if (!doc) continue;
      agentsChanged += await rewriteStringField(
        doc,
        'photo',
        'vrgeorgia/agents',
        db.collection('agents'),
        doc._id
      );
    }
  }

  let scenesChanged = 0;
  if (shouldRun('scenes')) {
    const sceneCols = ['tb_scenes', 'scenes', 'tourscenes', 'tour_scenes'];
    for (const name of sceneCols) {
      const cols = await db.listCollections({ name }).toArray();
      if (!cols.length) continue;
      const sceneIds = await db
        .collection(name)
        .find({ image_path: /cloudinary/i }, { projection: { _id: 1 } })
        .map((d) => d._id)
        .toArray();
      console.log(`${name} cloudinary scenes: ${sceneIds.length}`);
      for (const id of sceneIds) {
        const doc = await db
          .collection(name)
          .findOne({ _id: id }, { projection: { image_path: 1, tour_id: 1 } });
        if (!doc) continue;
        scenesChanged += await rewriteStringField(
          doc,
          'image_path',
          `vrgeorgia/tours/${doc.tour_id || 'misc'}`,
          db.collection(name),
          doc._id
        );
        await sleep(20);
      }
    }
  }

  let siteChanged = 0;
  if (shouldRun('sitecontents')) {
    const docs = await db.collection('sitecontents').find({}).toArray();
    console.log(`sitecontents docs: ${docs.length}`);
    for (const doc of docs) {
      const { _id, ...rest } = doc;
      const rewritten = await rewriteDeep(rest, 'vrgeorgia/home-design');
      if (!rewritten.changed) continue;
      siteChanged += rewritten.changed;
      console.log(`sitecontent ${_id} / ${doc.key || '?'}: +${rewritten.changed} urls`);
      if (APPLY) {
        const next = /** @type {Record<string, unknown>} */ (rewritten.value);
        delete next._id;
        await db.collection('sitecontents').replaceOne({ _id }, { _id, ...next });
      }
    }
  }

  // Published tour viewers read frozen JSON — rewrite after draft tb_scenes migrate.
  let snapshotsChanged = 0;
  if (shouldRun('scenes') || shouldRun('snapshots')) {
    const draftRows = await db
      .collection('tb_scenes')
      .find({}, { projection: { id: 1, image_path: 1 } })
      .toArray();
    const draftById = new Map(draftRows.map((d) => [d.id, d.image_path]));
    const tourIds = await db
      .collection('tb_tours')
      .find({ published_snapshot: /cloudinary/i }, { projection: { _id: 1 } })
      .map((d) => d._id)
      .toArray();
    console.log(`tb_tours with Cloudinary published_snapshot: ${tourIds.length}`);
    for (const id of tourIds) {
      const tour = await db.collection('tb_tours').findOne({ _id: id });
      if (!tour?.published_snapshot) continue;
      let snap;
      try {
        snap =
          typeof tour.published_snapshot === 'string'
            ? JSON.parse(tour.published_snapshot)
            : tour.published_snapshot;
      } catch {
        continue;
      }
      let changed = 0;
      for (const scene of snap.scenes || []) {
        if (!isCloudinaryUrl(scene?.image_path)) continue;
        const fromDraft = draftById.get(scene.id);
        if (fromDraft && String(fromDraft).includes('media.vhome.ge')) {
          scene.image_path = fromDraft;
          changed += 1;
          continue;
        }
        const r = await migrateUrl(
          scene.image_path,
          `vrgeorgia/tours/${scene.tour_id || tour.id || 'misc'}`
        );
        if (r.changed && !r.failed) {
          scene.image_path = r.url;
          changed += 1;
        }
      }
      if (!changed) continue;
      snapshotsChanged += changed;
      console.log(`published_snapshot ${tour.id}: +${changed}`);
      if (APPLY) {
        await db.collection('tb_tours').updateOne(
          { _id: tour._id },
          { $set: { published_snapshot: JSON.stringify(snap) } }
        );
      }
    }
  }

  const remainingProps = await db.collection('properties').countDocuments({
    $or: [{ photos: /cloudinary/i }, { panoramaPhotos: /cloudinary/i }],
  });
  const remainingScenes = await db.collection('tb_scenes').countDocuments({
    image_path: /cloudinary/i,
  });
  const remainingSnaps = await db.collection('tb_tours').countDocuments({
    published_snapshot: /cloudinary/i,
  });
  console.log(
    JSON.stringify(
      {
        propertiesTouched: processed,
        photoUrls: photoTotal,
        users: usersChanged,
        agents: agentsChanged,
        scenes: scenesChanged,
        sitecontentUrlRewrites: siteChanged,
        publishedSnapshotRewrites: snapshotsChanged,
        remainingCloudinaryProps: remainingProps,
        remainingCloudinaryTbScenes: remainingScenes,
        remainingCloudinarySnapshots: remainingSnaps,
        uniqueCopied: urlCache.size,
      },
      null,
      2
    )
  );
  await mongoose.disconnect();
  if (remainingProps > 0 && shouldRun('properties')) process.exitCode = 2;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
