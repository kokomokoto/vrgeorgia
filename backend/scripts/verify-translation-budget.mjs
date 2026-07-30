/**
 * ამოწმებს, რომ უთარგმნელი ენის სიის მოთხოვნა დროის ბიუჯეტს იცავს.
 *
 * პრობლემა: `fillMissingTranslationsForResponse` ელოდებოდა გარე მთარგმნელს
 * ერთ სერიულ რიგში ტაიმაუტის გარეშე — პროდაქშენზე გაზომილი 107–157 წამი.
 *
 * გამოყენება: node scripts/verify-translation-budget.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const raw = fs.readFileSync(path.resolve(__dirname, '..', '.env'), 'utf8');
for (const line of raw.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}

const BASE = process.env.TEST_BASE || 'http://localhost:5055';
const parsed = process.env.MONGODB_URI.match(/^(mongodb(?:\+srv)?:\/\/[^/]+)\/([^?]*)(\?.*)?$/);
const TEST_URI = `${parsed[1]}/${process.env.TEST_DB_NAME || 'vrgeorgia_uploadtest'}${parsed[3] || ''}`;

const LONG_DESC =
  'ეს არის ხელოვნურად გრძელი აღწერა, რომელიც მთარგმნელის სერვისში რამდენიმე ნაწილად იყოფა. '.repeat(
    12
  );

const PROPERTY_COUNT = 30;
const BUDGET_LIMIT_SECONDS = 12;

async function main() {
  await mongoose.connect(TEST_URI);
  const db = mongoose.connection.db;
  await db.collection('properties').deleteMany({});

  const now = Date.now();
  const docs = Array.from({ length: PROPERTY_COUNT }, (_, i) => ({
    numericId: 150000 + i,
    title: `უთარგმნელი ობიექტი ნომერი ${i} — თბილისის ცენტრში`,
    desc: `${LONG_DESC} ვარიანტი ${i}.`,
    price: 100000 + i,
    priceCurrency: 'USD',
    priceType: 'total',
    city: 'თბილისი',
    street: `ტესტის ქუჩა ${i}`,
    region: 'tbilisi',
    sqm: 80,
    rooms: 3,
    bedrooms: 2,
    type: 'apartment',
    dealType: 'sale',
    location: { lat: 41.7 + i / 10000, lng: 44.8 + i / 10000 },
    photos: [],
    panoramaPhotos: [],
    mainPhoto: 0,
    amenities: {},
    mediaLinks: [],
    status: 'active',
    listingVisibility: 'public',
    views: 0,
    userId: new mongoose.Types.ObjectId(),
    deletedAt: null,
    createdAt: new Date(now - i * 1000),
    updatedAt: new Date(now - i * 1000),
  }));
  await db.collection('properties').insertMany(docs);

  console.log(`\n${PROPERTY_COUNT} უთარგმნელი ობიექტი ჩაიწერა test ბაზაში.\n`);

  let failed = 0;
  for (const lang of ['az', 'tr', 'ru']) {
    const started = Date.now();
    const res = await fetch(`${BASE}/api/properties?limit=24&lang=${lang}`);
    const seconds = (Date.now() - started) / 1000;
    const ok = res.status === 200 && seconds < BUDGET_LIMIT_SECONDS;
    if (!ok) failed += 1;
    console.log(
      `  ${ok ? 'PASS' : 'FAIL'}  lang=${lang} status=${res.status} ${seconds.toFixed(2)}s (ლიმიტი ${BUDGET_LIMIT_SECONDS}s)`
    );
  }

  await db.collection('properties').deleteMany({});
  await mongoose.disconnect();

  console.log(`\n${failed === 0 ? 'ყველა ენა ბიუჯეტში' : `${failed} ენა ბიუჯეტს გასცდა`}\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error('crashed:', err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
