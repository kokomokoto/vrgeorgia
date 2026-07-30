/**
 * მხოლოდ კითხვადი შემოწმება: /api/admin/duplicates და /api/admin/counts მუშაობს თუ არა.
 * ტოკენს ლოკალურად ვწერთ არსებული ადმინისთვის; მონაცემები არ იცვლება.
 *
 * გამოყენება: node --import ./src/env-bootstrap.js scripts/check-duplicates-endpoint.mjs
 */
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { User } from '../src/models/User.js';
import { getJWTSecret } from '../src/config/jwt.js';

const BASE = process.env.CHECK_BASE || 'http://localhost:5000';

await mongoose.connect(process.env.MONGODB_URI);
const admin = await User.findOne({ role: 'admin' }).select('_id email').lean();
await mongoose.disconnect();

if (!admin) {
  console.error('ადმინი ვერ მოიძებნა');
  process.exit(1);
}

const token = jwt.sign({ sub: String(admin._id) }, getJWTSecret(), { expiresIn: '10m' });
const headers = { Authorization: `Bearer ${token}` };

const started = Date.now();
const dupRes = await fetch(`${BASE}/api/admin/duplicates?windowMinutes=60&sinceDays=365`, {
  headers,
});
const dup = await dupRes.json();
const elapsed = Date.now() - started;

console.log(`\nGET /api/admin/duplicates → ${dupRes.status} (${(elapsed / 1000).toFixed(2)}s)`);
console.log(
  `  ჯგუფი=${dup.totalGroups} ზედმეტი=${dup.totalDuplicates} უფოტოო=${dup.totalPhotoless}`
);
for (const p of (dup.photoless || []).slice(0, 10)) {
  console.log(
    `  · უფოტოო: "${String(p.title || '').slice(0, 40)}" | #${p.numericId} | ${p.owner?.name || '—'} | ${new Date(p.createdAt).toISOString()}`
  );
}

const countsRes = await fetch(`${BASE}/api/admin/counts`, { headers });
const counts = await countsRes.json();
console.log(`\nGET /api/admin/counts → ${countsRes.status}`);
console.log(`  ${JSON.stringify(counts)}\n`);

const ok =
  dupRes.status === 200 &&
  countsRes.status === 200 &&
  Array.isArray(dup.photoless) &&
  typeof counts.duplicateCount === 'number';
console.log(ok ? 'PASS' : 'FAIL');
process.exit(ok ? 0 : 1);
