/**
 * Copy property / tour / avatar images from Cloudinary → Cloudflare R2 and
 * rewrite MongoDB URLs. Dry-run by default.
 *
 *   node --import ./src/env-bootstrap.js scripts/migrate-cloudinary-to-r2.js
 *   MIGRATE_APPLY=1 node --import ./src/env-bootstrap.js scripts/migrate-cloudinary-to-r2.js
 *
 * Requires MEDIA R2 env (CF_ACCOUNT_ID, R2_*, R2_PUBLIC_BASE_URL) + MONGODB_URI.
 */
import mongoose from 'mongoose';
import { uploadBufferToR2, isR2Configured } from '../src/services/r2Media.js';

const APPLY = process.env.MIGRATE_APPLY === '1';
const LIMIT = Number(process.env.MIGRATE_LIMIT || 0);

function isCloudinaryUrl(url) {
  return typeof url === 'string' && url.includes('res.cloudinary.com');
}

async function fetchBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const ctype = res.headers.get('content-type') || 'image/jpeg';
  const buf = Buffer.from(await res.arrayBuffer());
  return { buf, ctype };
}

function extFromContentType(ctype) {
  if (ctype.includes('png')) return 'png';
  if (ctype.includes('webp')) return 'webp';
  if (ctype.includes('gif')) return 'gif';
  return 'jpg';
}

async function migrateUrl(url, folder) {
  if (!isCloudinaryUrl(url)) return url;
  const { buf, ctype } = await fetchBuffer(url);
  if (!APPLY) {
    console.log(`  [dry-run] would copy ${url.slice(0, 80)}… → ${folder}/`);
    return url;
  }
  const next = await uploadBufferToR2(buf, {
    folder,
    contentType: ctype,
    ext: extFromContentType(ctype),
  });
  console.log(`  OK ${url.slice(-40)} → ${next}`);
  return next;
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
    out.push(await migrateUrl(u, folder));
    changed += 1;
  }
  return { arr: out, changed };
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
  console.log(`Connected. APPLY=${APPLY ? 'yes' : 'dry-run'}`);

  let processed = 0;
  const props = db.collection('properties').find({});
  while (await props.hasNext()) {
    if (LIMIT && processed >= LIMIT) break;
    const doc = await props.next();
    processed += 1;
    let dirty = false;
    const photos = await rewriteArray(doc.photos || [], 'vrgeorgia/properties');
    const pans = await rewriteArray(doc.panoramaPhotos || [], 'vrgeorgia/properties');
    if (photos.changed || pans.changed) {
      dirty = true;
      console.log(`property ${doc._id}: photos+${photos.changed} pans+${pans.changed}`);
      if (APPLY) {
        await db.collection('properties').updateOne(
          { _id: doc._id },
          { $set: { photos: photos.arr, panoramaPhotos: pans.arr } }
        );
      }
    }
    if (!dirty && processed % 50 === 0) console.log(`…scanned ${processed}`);
  }

  console.log(`Done. scanned properties=${processed}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
