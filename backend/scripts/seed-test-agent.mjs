/**
 * ბრაუზერით ვერიფიკაციისთვის: test ბაზაში ასუფთავებს ობიექტებს და ქმნის
 * აგენტ+ადმინ ანგარიშს, რომლითაც ატვირთვის გვერდი შემოწმდება.
 *
 * გამოყენება: node scripts/seed-test-agent.mjs
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

const parsed = process.env.MONGODB_URI.match(/^(mongodb(?:\+srv)?:\/\/[^/]+)\/([^?]*)(\?.*)?$/);
const TEST_URI = `${parsed[1]}/${process.env.TEST_DB_NAME || 'vrgeorgia_uploadtest'}${parsed[3] || ''}`;

const EMAIL = 'uitest@example.com';
const PASSWORD = 'Test12345!';

await mongoose.connect(TEST_URI);
const db = mongoose.connection.db;

await db.collection('properties').deleteMany({});
await db.collection('users').deleteMany({});
await db.collection('agents').deleteMany({});

const passwordHash = await bcrypt.hash(PASSWORD, 10);
const { insertedId } = await db.collection('users').insertOne({
  email: EMAIL,
  passwordHash,
  name: 'UI Test Agent',
  phone: '+995500111222',
  role: 'admin',
  status: 'active',
  favorites: [],
  createdAt: new Date(),
  updatedAt: new Date(),
});

await db.collection('agents').insertOne({
  user: insertedId,
  name: 'UI Test Agent',
  phone: '+995500111222',
  email: EMAIL,
  active: true,
  verified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

console.log(`seeded: ${EMAIL} / ${PASSWORD} (role=admin)`);
await mongoose.disconnect();
