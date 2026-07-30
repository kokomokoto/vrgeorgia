/**
 * ატვირთვის ნაკადის end-to-end ვერიფიკაცია იზოლირებულ test ბაზაზე.
 *
 * ამოწმებს ზუსტად იმ სცენარებს, რაზეც აგენტი დაწერა:
 *   1. იმავე გასაღებით განმეორებითი „გამოქვეყნება“ დუბლიკატს არ ქმნის
 *   2. გასაღების გარეშე იდენტური უფოტოო ჩანაწერის გამეორება არსებულს აგრძელებს
 *   3. პარალელური ორმაგი დაჭერა ერთ ობიექტს ტოვებს
 *   4. ერთი გაუმართავი ფოტო მთელ პაკეტს არ აგდებს
 *   5. სესიის განახლება (/api/auth/refresh) ახალ ტოკენს გასცემს
 *   6. ადმინის დუბლიკატების ძებნა/გაერთიანება მუშაობს
 *
 * გამოყენება: node scripts/verify-upload-flow.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const raw = fs.readFileSync(path.resolve(__dirname, '..', '.env'), 'utf8');
for (const line of raw.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}

const BASE = process.env.TEST_BASE || 'http://localhost:5055';
const parsed = (process.env.MONGODB_URI || '').match(
  /^(mongodb(?:\+srv)?:\/\/[^/]+)\/([^?]*)(\?.*)?$/
);
const TEST_URI = `${parsed[1]}/${process.env.TEST_DB_NAME || 'vrgeorgia_uploadtest'}${parsed[3] || ''}`;

let passed = 0;
let failed = 0;

function check(name, ok, detail = '') {
  if (ok) {
    passed += 1;
    console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function api(pathname, { method = 'GET', token, body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${BASE}${pathname}`, {
    method,
    headers,
    body: form || (body ? JSON.stringify(body) : undefined),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* non-json */
  }
  return { status: res.status, json, text };
}

/** 2x1 პიქსელიანი ვალიდური PNG (მინიმალური, Sharp-ისთვის საკმარისი) */
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAFElEQVR4nGP8z8DAwMTAwMDAwAAAFAAB/6rHkwAAAABJRU5ErkJggg==',
  'base64'
);

function propertyForm(overrides = {}) {
  const form = new FormData();
  const fields = {
    title: 'ვერიფიკაციის ტესტი — ბინა',
    desc: 'ავტომატური ტესტის აღწერა, საკმარისი სიგრძის.',
    price: '123456',
    priceCurrency: 'USD',
    priceType: 'total',
    city: 'თბილისი',
    street: 'ტესტის ქუჩა 1',
    region: 'tbilisi',
    sqm: '80',
    rooms: '3',
    bedrooms: '2',
    type: 'apartment',
    dealType: 'sale',
    lat: '41.7151',
    lng: '44.8271',
    floor: '4',
    totalFloors: '9',
    ...overrides,
  };
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null) form.set(key, String(value));
  }
  return form;
}

async function main() {
  console.log(`\nBase: ${BASE}`);
  console.log(`Test DB: ${TEST_URI.replace(/\/\/[^@]+@/, '//***@')}\n`);

  const health = await api('/api/health');
  if (health.status !== 200) {
    console.error('test server not reachable — run: node scripts/start-test-server.mjs');
    process.exit(1);
  }

  await mongoose.connect(TEST_URI);
  const db = mongoose.connection.db;

  // ─── სუფთა საწყისი მდგომარეობა ───
  await db.collection('properties').deleteMany({});
  await db.collection('users').deleteMany({});
  await db.collection('agents').deleteMany({});

  // ინდექსების გადაშენება/აწყობა, რომ ახალი partial unique ინდექსი ნამდვილად არსებობდეს
  const { Property } = await import('../src/models/Property.js');
  Property.db = mongoose.connection;
  try {
    await db.collection('properties').dropIndexes();
  } catch {
    /* ცარიელ კოლექციაზე ინდექსი შეიძლება არ იყოს */
  }
  await Property.syncIndexes();
  const indexes = await db.collection('properties').indexes();
  const idempotencyIndex = indexes.find(
    (i) => i.key?.userId === 1 && i.key?.clientRequestId === 1
  );
  check(
    'იდემპოტენტობის უნიკალური ინდექსი შეიქმნა',
    Boolean(idempotencyIndex?.unique && idempotencyIndex?.partialFilterExpression),
    idempotencyIndex ? JSON.stringify(idempotencyIndex.partialFilterExpression) : 'არ არსებობს'
  );

  // ─── ტესტ მომხმარებელი ───
  const email = `upload-verify-${Date.now()}@example.com`;
  const password = 'Test12345!';
  await db.collection('users').insertOne({
    email,
    passwordHash: await bcrypt.hash(password, 10),
    name: 'Verify Agent',
    phone: '+995500000000',
    role: 'agent',
    status: 'active',
    favorites: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const login = await api('/api/auth/login', { method: 'POST', body: { email, password } });
  check('ავტორიზაცია', login.status === 200 && Boolean(login.json?.token), `status=${login.status}`);
  const token = login.json?.token;
  if (!token) {
    await mongoose.disconnect();
    process.exit(1);
  }

  // ─── 5. სესიის განახლება ───
  const refresh = await api('/api/auth/refresh', { method: 'POST', token });
  check(
    'POST /api/auth/refresh ახალ ტოკენს გასცემს',
    refresh.status === 200 && Boolean(refresh.json?.token),
    `status=${refresh.status}`
  );

  const noTokenRefresh = await api('/api/auth/refresh', { method: 'POST' });
  check('refresh ტოკენის გარეშე 401', noTokenRefresh.status === 401, `status=${noTokenRefresh.status}`);

  // ─── 1. იმავე clientRequestId-ით ორჯერ ───
  const key = `verify-${Date.now()}`;
  const first = await api('/api/properties', {
    method: 'POST',
    token,
    form: propertyForm({ clientRequestId: key }),
  });
  check('პირველი შექმნა 201', first.status === 201, `status=${first.status} ${first.text.slice(0, 160)}`);

  const second = await api('/api/properties', {
    method: 'POST',
    token,
    form: propertyForm({ clientRequestId: key }),
  });
  check(
    'იმავე გასაღებით მეორე დაჭერა → 200 resumed',
    second.status === 200 && second.json?.resumed === true,
    `status=${second.status} reason=${second.json?.resumeReason}`
  );
  check(
    'დაბრუნდა იგივე ობიექტი (ახალი არ შეიქმნა)',
    second.json?.property?._id === first.json?.property?._id,
    `${first.json?.property?._id} vs ${second.json?.property?._id}`
  );

  const countAfterKeyRetry = await db
    .collection('properties')
    .countDocuments({ clientRequestId: key });
  check('ბაზაში ერთი ჩანაწერი ამ გასაღებით', countAfterKeyRetry === 1, `count=${countAfterKeyRetry}`);

  // ─── 3. პარალელური ორმაგი დაჭერა ───
  const raceKey = `verify-race-${Date.now()}`;
  const raceResults = await Promise.all([
    api('/api/properties', {
      method: 'POST',
      token,
      form: propertyForm({ title: 'რბოლის ტესტი', clientRequestId: raceKey }),
    }),
    api('/api/properties', {
      method: 'POST',
      token,
      form: propertyForm({ title: 'რბოლის ტესტი', clientRequestId: raceKey }),
    }),
  ]);
  const raceCount = await db.collection('properties').countDocuments({ clientRequestId: raceKey });
  check(
    'პარალელური ორმაგი დაჭერა → ერთი ობიექტი',
    raceCount === 1,
    `count=${raceCount} statuses=${raceResults.map((r) => r.status).join(',')}`
  );
  const raceIds = new Set(raceResults.map((r) => r.json?.property?._id).filter(Boolean));
  check('ორივე პასუხი ერთსა და იმავე ობიექტს აბრუნებს', raceIds.size === 1, `ids=${raceIds.size}`);

  // ─── 3b. აგენტის ზუსტი სცენარი: ღილაკზე სამჯერ მიყოლებით დაჭერა ───
  const tripleKey = `verify-triple-${Date.now()}`;
  const tripleResults = await Promise.all(
    [0, 1, 2].map(() =>
      api('/api/properties', {
        method: 'POST',
        token,
        form: propertyForm({ title: 'სამმაგი დაჭერის ტესტი', clientRequestId: tripleKey }),
      })
    )
  );
  const tripleCount = await db
    .collection('properties')
    .countDocuments({ clientRequestId: tripleKey });
  check(
    'სამმაგი პარალელური დაჭერა → ერთი ობიექტი',
    tripleCount === 1,
    `count=${tripleCount} statuses=${tripleResults.map((r) => r.status).join(',')}`
  );
  const tripleIds = new Set(tripleResults.map((r) => r.json?.property?._id).filter(Boolean));
  check(
    'სამივე პასუხმა ერთი და იგივე ობიექტი დააბრუნა',
    tripleIds.size === 1,
    `unique ids=${tripleIds.size}`
  );

  // ─── 3c. გაჭედვის შემდეგ ხელახლა ცდა ფოტოებით → იმავე ობიექტს ერთვის ───
  if (process.env.CLOUDINARY_CLOUD_NAME) {
    const stuckKey = `verify-stuck-${Date.now()}`;
    const stuckFirst = await api('/api/properties', {
      method: 'POST',
      token,
      form: propertyForm({ title: 'გაჭედვის ტესტი', clientRequestId: stuckKey }),
    });
    const retryForm = propertyForm({ title: 'გაჭედვის ტესტი', clientRequestId: stuckKey });
    retryForm.append('photos', new Blob([TINY_PNG], { type: 'image/png' }), 'retry-1.png');
    retryForm.append('photos', new Blob([TINY_PNG], { type: 'image/png' }), 'retry-2.png');
    retryForm.set('panoramaFlags', JSON.stringify([false, false]));
    const stuckRetry = await api('/api/properties', { method: 'POST', token, form: retryForm });
    const stuckDocs = await db
      .collection('properties')
      .find({ clientRequestId: stuckKey })
      .toArray();
    check(
      'გაჭედვის შემდეგ ფოტოებით ხელახლა ცდა → ერთი ობიექტი',
      stuckDocs.length === 1,
      `count=${stuckDocs.length} status=${stuckRetry.status}`
    );
    check(
      'ფოტოები არსებულ ობიექტს დაერთო (უფოტოო დუბლიკატი არ დარჩა)',
      (stuckDocs[0]?.photos?.length || 0) === 2 &&
        stuckDocs[0]?._id?.toString() === stuckFirst.json?.property?._id,
      `photos=${stuckDocs[0]?.photos?.length}`
    );
  } else {
    console.log('  SKIP  გაჭედვა+ფოტოები — Cloudinary კონფიგურაცია არ არის');
  }

  // ─── 2. გასაღების გარეშე იდენტური უფოტოო ჩანაწერი ───
  const legacyForm = () => propertyForm({ title: 'ძველი ფრონტენდის ტესტი', price: '777000' });
  const legacyFirst = await api('/api/properties', { method: 'POST', token, form: legacyForm() });
  const legacySecond = await api('/api/properties', { method: 'POST', token, form: legacyForm() });
  check(
    'გასაღების გარეშე გამეორება → არსებულს აგრძელებს',
    legacySecond.status === 200 && legacySecond.json?.resumeReason === 'photoless-retry',
    `status=${legacySecond.status} reason=${legacySecond.json?.resumeReason}`
  );
  const legacyCount = await db
    .collection('properties')
    .countDocuments({ title: 'ძველი ფრონტენდის ტესტი' });
  check('ერთი ჩანაწერი დარჩა', legacyCount === 1, `count=${legacyCount}`);
  check(
    'იგივე ობიექტი დაბრუნდა',
    legacyFirst.json?.property?._id === legacySecond.json?.property?._id
  );

  // ─── 4. ფოტოს ატვირთვა: ერთი გაფუჭებული ფაილი პაკეტს არ აგდებს ───
  const propertyId = first.json?.property?._id;
  const photoForm = new FormData();
  photoForm.append('photos', new Blob([TINY_PNG], { type: 'image/png' }), 'good.png');
  photoForm.append(
    'photos',
    new Blob([Buffer.from('this is definitely not an image')], { type: 'image/png' }),
    'broken.png'
  );
  photoForm.append('panoramaFlags', JSON.stringify([false, false]));

  const photoRes = await api(`/api/properties/${propertyId}/photos`, {
    method: 'POST',
    token,
    form: photoForm,
  });
  const cloudinaryConfigured = Boolean(process.env.CLOUDINARY_CLOUD_NAME);
  if (cloudinaryConfigured) {
    check(
      'ერთი გაფუჭებული ფოტო პაკეტს არ აგდებს (ნაწილობრივი წარმატება)',
      photoRes.status === 200 && (photoRes.json?.photos?.length || 0) === 1,
      `status=${photoRes.status} photos=${photoRes.json?.photos?.length} failures=${photoRes.json?.photoFailures?.length}`
    );
    check(
      'ჩავარდნილი ფაილი პასუხში ჩანს',
      (photoRes.json?.photoFailures?.length || 0) === 1,
      JSON.stringify(photoRes.json?.photoFailures || [])
    );
  } else {
    console.log('  SKIP  ფოტოს ტესტი — Cloudinary კონფიგურაცია არ არის');
  }

  // ─── 6. ადმინის დუბლიკატები ───
  await db.collection('users').updateOne({ email }, { $set: { role: 'admin' } });
  const adminLogin = await api('/api/auth/login', { method: 'POST', body: { email, password } });
  const adminToken = adminLogin.json?.token;

  // ხელოვნური დუბლიკატები (ძველი ატვირთვების იმიტაცია — გასაღების გარეშე)
  const base = await db.collection('properties').findOne({ title: 'რბოლის ტესტი' });
  const clone = { ...base };
  delete clone._id;
  delete clone.clientRequestId;
  delete clone.numericId;
  clone.photos = [];
  clone.createdAt = new Date(new Date(base.createdAt).getTime() + 60_000);
  clone.numericId = 199999;
  await db.collection('properties').insertOne(clone);

  const dupes = await api('/api/admin/duplicates?windowMinutes=60&sinceDays=30', {
    token: adminToken,
  });
  const group = (dupes.json?.groups || []).find((g) => g.items.some((i) => i.title === 'რბოლის ტესტი'));
  check(
    'GET /api/admin/duplicates ჯგუფს პოულობს',
    dupes.status === 200 && Boolean(group) && group.count === 2,
    `status=${dupes.status} groups=${dupes.json?.groups?.length} count=${group?.count}`
  );

  if (group) {
    const merge = await api('/api/admin/duplicates/merge', {
      method: 'POST',
      token: adminToken,
      body: {
        keeperId: group.keeperId,
        duplicateIds: group.items.map((i) => i._id),
      },
    });
    check(
      'POST /api/admin/duplicates/merge გააერთიანა',
      merge.status === 200 && merge.json?.removedIds?.length === 1,
      `status=${merge.status} removed=${merge.json?.removedIds?.length}`
    );
    const stillLive = await db
      .collection('properties')
      .countDocuments({ title: 'რბოლის ტესტი', deletedAt: null });
    check('გაერთიანების შემდეგ ერთი ცოცხალი ჩანაწერი', stillLive === 1, `count=${stillLive}`);
  }

  // ─── სიის endpoint დროულად პასუხობს ───
  for (const lang of ['ka', 'tr']) {
    const started = Date.now();
    const list = await api(`/api/properties?limit=24&lang=${lang}`);
    const seconds = (Date.now() - started) / 1000;
    check(
      `GET /api/properties?lang=${lang} < 15 წმ`,
      list.status === 200 && seconds < 15,
      `status=${list.status} ${seconds.toFixed(2)}s`
    );
  }

  // ─── დასუფთავება ───
  await db.collection('properties').deleteMany({});
  await db.collection('users').deleteMany({});
  await db.collection('agents').deleteMany({});
  await mongoose.disconnect();

  console.log(`\nSummary: ${passed} passed, ${failed} failed\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error('verification crashed:', err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
